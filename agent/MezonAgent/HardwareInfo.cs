using System.Management;
using System.Net.NetworkInformation;
using System.Runtime.Versioning;

namespace MezonAgent;

/// <summary>Kompyuterning apparat belgilari: tarmoq kartasi MAC manzili va tizim diskining seriya raqami.</summary>
[SupportedOSPlatform("windows")]
public static class HardwareInfo
{
    // Virtual adapterlar (Hyper-V, Docker, VPN va h.k.) — kompyuterning o'z kartasi emas
    private static readonly string[] VirtualMarkers =
    [
        "virtual", "hyper-v", "vmware", "virtualbox", "vethernet", "docker", "wsl", "tap-", "tap ",
        "tun", "vpn", "npcap", "loopback", "bluetooth", "wan miniport", "teredo", "isatap", "pseudo",
    ];

    public sealed record NetworkCard(string Mac, string Name, string Description, bool IsUp, bool HasGateway);

    /// <summary>Barcha jismoniy tarmoq kartalari (o'chiq bo'lsa ham).</summary>
    public static IReadOnlyList<NetworkCard> PhysicalNetworkCards()
    {
        var result = new List<NetworkCard>();
        foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
        {
            if (nic.NetworkInterfaceType is not (NetworkInterfaceType.Ethernet
                or NetworkInterfaceType.Wireless80211
                or NetworkInterfaceType.GigabitEthernet
                or NetworkInterfaceType.FastEthernetT
                or NetworkInterfaceType.FastEthernetFx
                or NetworkInterfaceType.Ethernet3Megabit))
            {
                continue;
            }

            var text = (nic.Name + " " + nic.Description).ToLowerInvariant();
            if (VirtualMarkers.Any(text.Contains)) continue;

            var bytes = nic.GetPhysicalAddress().GetAddressBytes();
            if (bytes.Length != 6 || bytes.All(b => b == 0)) continue;
            // Lokal boshqariladigan (dasturda o'rnatilgan) va multicast manzillar tashlab ketiladi
            if ((bytes[0] & 0x01) != 0 || (bytes[0] & 0x02) != 0) continue;

            var hasGateway = false;
            try
            {
                hasGateway = nic.GetIPProperties().GatewayAddresses
                    .Any(g => g.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork
                              && !g.Address.Equals(System.Net.IPAddress.Any));
            }
            catch (NetworkInformationException)
            {
                // ba'zi adapterlar IP xususiyatlarini bermaydi
            }

            result.Add(new NetworkCard(
                FormatMac(bytes),
                nic.Name,
                nic.Description,
                nic.OperationalStatus == OperationalStatus.Up,
                hasGateway));
        }

        // Asosiy karta birinchi: tarmoqqa ulangan (shlyuzi bor) simli, keyin simsiz
        return result
            .OrderByDescending(c => c.HasGateway)
            .ThenByDescending(c => c.IsUp)
            .ThenBy(c => c.Description.Contains("wi", StringComparison.OrdinalIgnoreCase) ? 1 : 0)
            .ThenBy(c => c.Mac, StringComparer.Ordinal)
            .ToList();
    }

    /// <summary>Asosiy MAC manzil (AA-BB-CC-DD-EE-FF) yoki bo'sh satr.</summary>
    public static string PrimaryMac() => PhysicalNetworkCards().FirstOrDefault()?.Mac ?? "";

    public static string FormatMac(byte[] bytes) => string.Join("-", bytes.Select(b => b.ToString("X2")));

    public sealed record DiskInfo(string Serial, string Model, bool Reliable);

    private static readonly object DiskLock = new();
    private static DiskInfo? _disk;
    private static DateTime _diskReadAt;

    /// <summary>
    /// Windows o'rnatilgan diskning (odatda C:) jismoniy seriya raqami. Disk ish vaqtida almashmaydi,
    /// WMI esa sekin bo'lishi mumkin — natija 10 daqiqa keshlanadi.
    /// </summary>
    public static DiskInfo SystemDisk()
    {
        lock (DiskLock)
        {
            if (_disk is { Serial.Length: > 0 } && DateTime.UtcNow - _diskReadAt < TimeSpan.FromMinutes(10)) return _disk;
            _disk = ReadSystemDisk();
            _diskReadAt = DateTime.UtcNow;
            return _disk;
        }
    }

    public static string SystemDiskSerial() => SystemDisk().Serial;

    private static DiskInfo ReadSystemDisk()
    {
        var letter = (Path.GetPathRoot(Environment.SystemDirectory) ?? "C:").Substring(0, 1).ToUpperInvariant();
        var options = new System.Management.EnumerationOptions { Timeout = TimeSpan.FromSeconds(15), ReturnImmediately = false };
        try
        {
            // Tezkor yo'l (Windows 8+): Storage moduli — harf -> disk raqami -> jismoniy disk
            var scope = new ManagementScope(@"root\Microsoft\Windows\Storage"); // lokal kompyuter
            uint? number = null;
            using (var parts = new ManagementObjectSearcher(scope,
                       new ObjectQuery($"SELECT DiskNumber FROM MSFT_Partition WHERE DriveLetter='{letter}'"), options))
            {
                foreach (ManagementObject part in parts.Get())
                {
                    if (part["DiskNumber"] is uint n) { number = n; break; }
                }
            }
            if (number is uint diskNumber)
            {
                using var disks = new ManagementObjectSearcher(scope,
                    new ObjectQuery($"SELECT SerialNumber, FriendlyName FROM MSFT_PhysicalDisk WHERE DeviceId='{diskNumber}'"), options);
                foreach (ManagementObject disk in disks.Get())
                {
                    var serial = Clean(disk["SerialNumber"]?.ToString());
                    if (serial.Length > 0) return new DiskInfo(serial, disk["FriendlyName"]?.ToString() ?? "", IsReliableSerial(serial));
                }
                using var legacy = new ManagementObjectSearcher(
                    new ManagementScope(@"root\cimv2"),
                    new ObjectQuery($"SELECT SerialNumber, Model FROM Win32_DiskDrive WHERE Index={diskNumber}"), options);
                foreach (ManagementObject disk in legacy.Get())
                {
                    var serial = Clean(disk["SerialNumber"]?.ToString());
                    if (serial.Length > 0) return new DiskInfo(serial, disk["Model"]?.ToString() ?? "", IsReliableSerial(serial));
                }
            }
        }
        catch (ManagementException)
        {
            // WMI ishlamayapti yoki vaqt tugadi
        }
        catch (System.Runtime.InteropServices.COMException)
        {
        }
        return new DiskInfo("", "", false);
    }

    /// <summary>
    /// Arzon NVMe disklar seriya o'rniga «0000_0000_…_0100_0000_0000» kabi namuna qaytaradi —
    /// bunday qiymat bir xil modeldagi barcha disklarda bir xil bo'lishi mumkin.
    /// </summary>
    public static bool IsReliableSerial(string serial)
    {
        var chars = serial.Where(char.IsLetterOrDigit).ToArray();
        if (chars.Length < 6) return false;
        var zeros = chars.Count(c => c == '0');
        if (zeros * 10 >= chars.Length * 8) return false; // 80% dan ko'pi nol
        return chars.Distinct().Count() > 3;
    }

    /// <summary>Bo'shliqlar va oxiridagi nuqta olib tashlanadi, katta harfga o'tkaziladi.</summary>
    private static string Clean(string? value) =>
        new string((value ?? "").Where(c => !char.IsWhiteSpace(c) && !char.IsControl(c)).ToArray())
            .TrimEnd('.')
            .ToUpperInvariant();
}
