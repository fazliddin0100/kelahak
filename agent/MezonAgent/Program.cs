using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.RateLimiting;
using MezonAgent;
using Microsoft.AspNetCore.RateLimiting;

// Mezon qurilma agenti — user kompyuterida Windows xizmati.
// Brauzer (Mezon sayti) shu agentdan kompyuter belgilarini (MAC, disk seriyasi) va
// qurilma kaliti bilan imzolangan tasdiqni oladi, so'ng serverga yuboradi.

// Xizmat sifatida — batafsil jurnal Windows Event Log ga. Terminalda qo'lda ishga tushirilganda —
// faqat qisqa xabar; batafsil jurnal kerak bo'lsa: MezonAgent.exe --verbose
var isService = Microsoft.Extensions.Hosting.WindowsServices.WindowsServiceHelpers.IsWindowsService();
var verbose = args.Any(a => string.Equals(a, "--verbose", StringComparison.OrdinalIgnoreCase));
var quietConsole = !isService && !verbose;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args.Where(a => !string.Equals(a, "--verbose", StringComparison.OrdinalIgnoreCase)).ToArray(),
    ContentRootPath = AppContext.BaseDirectory,
});
builder.Host.UseWindowsService(o => o.ServiceName = "MezonAgent");
if (quietConsole)
{
    builder.Logging.ClearProviders();
}

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
            PermitLimit = 120,
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
DeviceKey deviceKey;
try
{
    deviceKey = app.Services.GetRequiredService<DeviceKey>();
}
catch (Exception e)
{
    Fail($"Qurilma kalitini tayyorlab bo'lmadi: {e.Message}");
    return 1;
}
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

    // v2: imzo qo'yilayotgan kalit (.mzk) shu paytda fleshkada turgani ham tasdiqlanadi
    var keySha = (body?.KeySha256 ?? "").ToLowerInvariant();
    UsbKey.KeyOnUsb? usb = null;
    if (keySha.Length > 0)
    {
        if (!Patterns.Sha256Re().IsMatch(keySha))
        {
            return Results.BadRequest(new { error = "bad_key_sha256" });
        }
        usb = UsbKey.FindBySha256(keySha);
        if (usb is null)
        {
            return Results.Json(new { error = "key_not_on_usb", title = "E-IMZO kaliti yozilgan fleshka kompyuterga ulanmagan." },
                statusCode: StatusCodes.Status409Conflict);
        }
    }

    // Server xuddi shu tartibda qayta yig'ib, ochiq kalit bilan tekshiradi
    var message = usb is null
        ? string.Join('|', "mezon-device", "v1", origin, challenge, macs, disk, key.PublicKeySha256Hex)
        : string.Join('|', "mezon-device", "v2", origin, challenge, macs, disk, key.PublicKeySha256Hex, usb.Drive.Serial, usb.KeySha256);
    var signature = key.SignBase64(Encoding.UTF8.GetBytes(message));

    log.LogInformation("Tasdiq berildi: {Origin}{Usb}", origin, usb is null ? "" : $", fleshka {usb.Drive.Serial}");
    return Results.Ok(new
    {
        version = AgentOptions.Version,
        format = usb is null ? "v1" : "v2",
        usbSerial = usb?.Drive.Serial,
        usbSerialReliable = usb?.Drive.SerialReliable,
        usbModel = usb?.Drive.Model,
        keySha256 = usb?.KeySha256,
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

// Fleshkalardagi E-IMZO kalitlari (parol bilan shifrlangan .mzk va yonidagi .crt)
app.MapGet("/v1/keys", () =>
{
    var keys = UsbKey.FindKeys();
    return Results.Ok(new
    {
        keys = keys.Select(k => new
        {
            fileName = k.FileName,
            drive = k.Drive.Root,
            keyFile = k.KeyFile,
            keySha256 = k.KeySha256,
            certPem = k.CertPem,
            usbSerial = k.Drive.Serial,
            usbSerialReliable = k.Drive.SerialReliable,
            usbModel = k.Drive.Model,
        }),
    });
});

// Kalit fleshkasi hali ulanganmi (brauzer ochiq kalitni fleshka olinishi bilan yopadi)
app.MapPost("/v1/key/check", async (HttpContext ctx) =>
{
    KeyCheckRequest? body;
    try
    {
        body = await ctx.Request.ReadFromJsonAsync<KeyCheckRequest>();
    }
    catch (Exception)
    {
        return Results.BadRequest(new { error = "bad_json" });
    }
    var sha = (body?.KeySha256 ?? "").ToLowerInvariant();
    if (!Patterns.Sha256Re().IsMatch(sha)) return Results.BadRequest(new { error = "bad_key_sha256" });
    return Results.Ok(new { present = UsbKey.FindBySha256(sha) is not null });
});

if (!isService)
{
    app.Lifetime.ApplicationStarted.Register(() =>
        Console.WriteLine("Mezon agenti o'rnatildi va ishlayapti. Oynani yopmang."));
}

try
{
    app.Run();
}
catch (IOException e)
{
    // Odatda port band: agent allaqachon ishlab turibdi (xizmat yoki boshqa oyna)
    Fail(e.InnerException is Microsoft.AspNetCore.Connections.AddressInUseException
        ? "Mezon agenti allaqachon ishlab turibdi."
        : $"Agentni ishga tushirib bo'lmadi: {e.Message}");
    return 1;
}
return 0;

void Fail(string message)
{
    if (isService) log.LogError("{Message}", message);
    else Console.Error.WriteLine(message);
    Environment.ExitCode = 1;
}

/// <summary>appsettings.json dagi "Agent" bo'limi</summary>
public sealed class AgentOptions
{
    public const string Version = "1.1.0";

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

public sealed record AttestRequest(string? Challenge, string? Origin, string? KeySha256);

public sealed record KeyCheckRequest(string? KeySha256);

internal static partial class Patterns
{
    [GeneratedRegex("^[A-Za-z0-9_-]{16,128}$")]
    internal static partial Regex ChallengeRe();

    [GeneratedRegex("^[0-9a-f]{64}$")]
    internal static partial Regex Sha256Re();
}
