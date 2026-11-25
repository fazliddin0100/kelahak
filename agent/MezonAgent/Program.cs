using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.RateLimiting;
using MezonAgent;
using Microsoft.AspNetCore.RateLimiting;

// Mezon qurilma agenti — user kompyuterida Windows xizmati.
// Brauzer (Mezon sayti) shu agentdan kompyuter belgilarini (MAC, disk seriyasi) va
// qurilma kaliti bilan imzolangan tasdiqni oladi, so'ng serverga yuboradi.

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,
});
builder.Host.UseWindowsService(o => o.ServiceName = "MezonAgent");

var options = builder.Configuration.GetSection("Agent").Get<AgentOptions>() ?? new AgentOptions();
var allowedOrigins = options.AllowedOrigins
    .Select(o => o.Trim().TrimEnd('/'))
    .Where(o => o.Length > 0)
    .ToHashSet(StringComparer.OrdinalIgnoreCase);

// Faqat shu kompyuter ichida: 127.0.0.1 (tarmoqdan kirib bo'lmaydi)
builder.WebHost.ConfigureKestrel(k =>
{
    k.Listen(IPAddress.Loopback, options.Port);
    k.AddServerHeader = false;
    k.Limits.MaxRequestBodySize = 4 * 1024;
});

builder.Services.AddRateLimiter(r =>
{
    r.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    r.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter("all", partitionKey => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 60,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));
});

builder.Services.AddSingleton(sp =>
    DeviceKey.OpenOrCreate(options.KeyName, options.AllowSoftwareKey, options.MachineKey, sp.GetRequiredService<ILogger<DeviceKey>>()));

var app = builder.Build();
var log = app.Logger;

if (allowedOrigins.Count == 0)
{
    log.LogWarning("Agent:AllowedOrigins bo'sh — hech qaysi sayt agentga murojaat qila olmaydi.");
}

// Qurilma kaliti xizmat ishga tushganda tayyorlanadi (birinchi so'rovni kutmasdan)
var deviceKey = app.Services.GetRequiredService<DeviceKey>();
log.LogInformation("Mezon agenti 127.0.0.1:{Port} da ishlayapti. Kalit: {Kind}, SHA-256 {Hash}",
    options.Port, deviceKey.IsHardware ? "TPM" : "dasturiy", deviceKey.PublicKeySha256Hex);
// Disk seriyasi (WMI sekin bo'lishi mumkin) fonda oldindan o'qib qo'yiladi
_ = Task.Run(() =>
{
    var d = HardwareInfo.SystemDisk();
    log.LogInformation("Tizim diski: {Model}, seriya {Serial}{Weak}", d.Model, d.Serial,
        d.Reliable ? "" : " (noyob emas - bir xil modeldagi disklarda takrorlanishi mumkin)");
});

// ── Ruxsat etilgan sayt (Origin) tekshiruvi, CORS va Private/Local Network Access ──
app.Use(async (ctx, next) =>
{
    var origin = ctx.Request.Headers.Origin.ToString().TrimEnd('/');
    if (origin.Length == 0 || !allowedOrigins.Contains(origin))
    {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        await ctx.Response.WriteAsJsonAsync(new { error = "origin_not_allowed" });
        return;
    }

    ctx.Response.Headers["Access-Control-Allow-Origin"] = origin;
    ctx.Response.Headers["Vary"] = "Origin";
    ctx.Response.Headers["Cache-Control"] = "no-store";
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";

    if (HttpMethods.IsOptions(ctx.Request.Method))
    {
        ctx.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST";
        ctx.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type";
        ctx.Response.Headers["Access-Control-Max-Age"] = "600";
        // Chrome/Edge: ochiq yoki lokal tarmoqdagi saytdan 127.0.0.1 ga so'rov uchun ruxsat
        if (ctx.Request.Headers.ContainsKey("Access-Control-Request-Private-Network"))
        {
            ctx.Response.Headers["Access-Control-Allow-Private-Network"] = "true";
        }
        ctx.Response.StatusCode = StatusCodes.Status204NoContent;
        return;
    }

    await next();
});

app.UseRateLimiter();

// Agent bormi va qaysi versiya
app.MapGet("/v1/health", () => Results.Ok(new { ok = true, version = AgentOptions.Version }));

// Kompyuter belgilari (imzosiz) — superadmin kompyuterni ro'yxatga olishda ko'rishi uchun
app.MapGet("/v1/info", (DeviceKey key) =>
{
    var cards = HardwareInfo.PhysicalNetworkCards();
    var disk = HardwareInfo.SystemDisk();
    return Results.Ok(new
    {
        version = AgentOptions.Version,
        hostname = Environment.MachineName,
        mac = cards.FirstOrDefault()?.Mac ?? "",
        macs = cards.Select(c => new { c.Mac, c.Description, up = c.IsUp }),
        diskSerial = disk.Serial,
        diskModel = disk.Model,
        diskSerialReliable = disk.Reliable,
        publicKey = key.PublicKeySpkiBase64,
        publicKeySha256 = key.PublicKeySha256Hex,
        hardwareKey = key.IsHardware,
    });
});

// Server bergan bir martalik so'rovni (challenge) qurilma kaliti bilan imzolash
app.MapPost("/v1/attest", async (HttpContext ctx, DeviceKey key) =>
{
    AttestRequest? body;
    try
    {
        body = await ctx.Request.ReadFromJsonAsync<AttestRequest>();
    }
    catch (Exception)
    {
        return Results.BadRequest(new { error = "bad_json" });
    }

    var origin = ctx.Request.Headers.Origin.ToString().TrimEnd('/');
    var challenge = body?.Challenge ?? "";
    if (!Patterns.ChallengeRe().IsMatch(challenge))
    {
        return Results.BadRequest(new { error = "bad_challenge" });
    }
    // Imzolanadigan sayt manzili brauzer yuborgan Origin bilan bir xil bo'lishi shart
    if (!string.Equals((body?.Origin ?? "").TrimEnd('/'), origin, StringComparison.OrdinalIgnoreCase))
    {
        return Results.BadRequest(new { error = "origin_mismatch" });
    }

    var cards = HardwareInfo.PhysicalNetworkCards();
    var diskInfo = HardwareInfo.SystemDisk();
    var disk = diskInfo.Serial.Replace("|", "");
    if (cards.Count == 0 || disk.Length == 0)
    {
        return Results.Problem(
            title: cards.Count == 0 ? "Jismoniy tarmoq kartasi topilmadi" : "Tizim diskining seriya raqami o'qilmadi",
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    // Imzoga barcha jismoniy kartalar kiradi (alifbo tartibida): USB/Wi-Fi o'chsa yoki asosiy karta
    // almashsa ham server sertifikatdagi MAC ro'yxatda borligini tekshira oladi
    var macs = string.Join(',', cards.Select(c => c.Mac).Distinct().OrderBy(m => m, StringComparer.Ordinal));

    // Server xuddi shu tartibda qayta yig'ib, ochiq kalit bilan tekshiradi
    var message = string.Join('|',
        "mezon-device", "v1", origin, challenge, macs, disk, key.PublicKeySha256Hex);
    var signature = key.SignBase64(Encoding.UTF8.GetBytes(message));

    log.LogInformation("Tasdiq berildi: {Origin}", origin);
    return Results.Ok(new
    {
        version = AgentOptions.Version,
        hostname = Environment.MachineName,
        mac = cards[0].Mac,
        macs,
        diskSerial = disk,
        diskModel = diskInfo.Model,
        diskSerialReliable = diskInfo.Reliable,
        publicKey = key.PublicKeySpkiBase64,
        publicKeySha256 = key.PublicKeySha256Hex,
        hardwareKey = key.IsHardware,
        signature,
    });
});

app.Run();

/// <summary>appsettings.json dagi "Agent" bo'limi</summary>
public sealed class AgentOptions
{
    public const string Version = "1.0.0";

    /// <summary>127.0.0.1 dagi port</summary>
    public int Port { get; set; } = 64650;

    /// <summary>Agentga murojaat qila oladigan saytlar, masalan "https://192.168.100.12"</summary>
    public string[] AllowedOrigins { get; set; } = [];

    /// <summary>Windows kalit omboridagi qurilma kaliti nomi</summary>
    public string KeyName { get; set; } = "MezonAgentDeviceKey";

    /// <summary>TPM bo'lmasa dasturiy (eksport qilinmaydigan) kalitga ruxsat</summary>
    public bool AllowSoftwareKey { get; set; } = true;

    /// <summary>true — kompyuter kaliti (xizmat uchun, standart); false — faqat sinovda, joriy user kaliti</summary>
    public bool MachineKey { get; set; } = true;
}

public sealed record AttestRequest(string? Challenge, string? Origin);

internal static partial class Patterns
{
    [GeneratedRegex("^[A-Za-z0-9_-]{16,128}$")]
    internal static partial Regex ChallengeRe();
}
