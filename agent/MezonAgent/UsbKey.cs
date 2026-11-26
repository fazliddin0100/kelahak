using System.Management;
using System.Runtime.InteropServices;
using System.Runtime.Versioning;
using System.Security.Cryptography;
using System.Text;

namespace MezonAgent;

/// <summary>
/// Fleshkadagi E-IMZO kaliti (.mzk): faqat USB/SD qurilmalaridagi fayllar hisobga olinadi.
/// Kalit fayli parol bilan shifrlangan — agent uni ochmaydi, faqat topib beradi va fleshka
/// ulanganligini (fayl SHA-256 va fleshka seriya raqami) tasdiqlaydi.
/// </summary>
[SupportedOSPlatform("windows")]
public static class UsbKey
{
    private const int MaxKeyFileBytes = 16 * 1024;
    private const int MaxCertFileBytes = 16 * 1024;
    private const int MaxKeys = 8;

    // MSFT_PhysicalDisk.BusType: 7 = USB, 12 = SD, 13 = MMC
    private static readonly HashSet<ushort> RemovableBusTypes = [7, 12, 13];

    public sealed record UsbDrive(string Root, string Serial, bool SerialReliable, string Model);

    public sealed record KeyOnUsb(
        string Path,
        string FileName,
        string KeyFile,
        string KeySha256,
        string? CertPem,
        UsbDrive Drive);

    /// <summary>Ulangan fleshkalardagi barcha .mzk kalitlar (ildiz papka va 2 darajagacha ichki papkalar).</summary>
    public static IReadOnlyList<KeyOnUsb> FindKeys()
    {
        var result = new List<KeyOnUsb>();
        foreach (var drive in UsbDrives())
        {
            foreach (var path in KeyFiles(drive.Root))
            {
                var key = ReadKey(path, drive);
                if (key is not null) result.Add(key);
                if (result.Count >= MaxKeys) return result;
            }
        }
        return result;
    }

    /// <summary>SHA-256 bo'yicha kalitni topadi: fleshka olib qo'yilgan bo'lsa null.</summary>
    public static KeyOnUsb? FindBySha256(string keySha256) =>
        FindKeys().FirstOrDefault(k => string.Equals(k.KeySha256, keySha256, StringComparison.OrdinalIgnoreCase));

    private static IEnumerable<string> KeyFiles(string root)
    {
        var options = new System.IO.EnumerationOptions
        {
            RecurseSubdirectories = true,
            MaxRecursionDepth = 2,
            IgnoreInaccessible = true,
            AttributesToSkip = FileAttributes.System | FileAttributes.ReparsePoint,
            MatchCasing = MatchCasing.CaseInsensitive,
        };
        try
        {
            return Directory.EnumerateFiles(root, "*.mzk", options).Take(32).ToList();
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            return [];
        }
    }

    private static KeyOnUsb? ReadKey(string path, UsbDrive drive)
    {
        try
        {
            var info = new FileInfo(path);
            if (!info.Exists || info.Length == 0 || info.Length > MaxKeyFileBytes) return null;
            var bytes = File.ReadAllBytes(path);
            var text = Encoding.UTF8.GetString(bytes);
            if (!text.Contains("\"mezon-key/v1\"", StringComparison.Ordinal)) return null;
            var sha = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
            return new KeyOnUsb(path, info.Name, text, sha, FindCertificate(info), drive);
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            return null;
        }
    }

    /// <summary>Kalit yonidagi sertifikat: avval bir xil nomli .crt, bo'lmasa papkadagi yagona .crt</summary>
    private static string? FindCertificate(FileInfo keyFile)
    {
        var dir = keyFile.Directory;
        if (dir is null) return null;
        var sameName = Path.Combine(dir.FullName, Path.GetFileNameWithoutExtension(keyFile.Name) + ".crt");
        var candidates = File.Exists(sameName)
            ? [sameName]
            : dir.EnumerateFiles("*.crt").Where(f => !f.Name.StartsWith("ca-chain", StringComparison.OrdinalIgnoreCase))
                .Select(f => f.FullName).Take(2).ToArray();
        if (candidates.Length != 1) return null;
        var fi = new FileInfo(candidates[0]);
        if (fi.Length == 0 || fi.Length > MaxCertFileBytes) return null;
        var pem = File.ReadAllText(fi.FullName);
        return pem.Contains("BEGIN CERTIFICATE", StringComparison.Ordinal) ? pem : null;
    }

    /// <summary>Ulangan USB/SD disklar (tizim diski hech qachon kirmaydi).</summary>
    public static IReadOnlyList<UsbDrive> UsbDrives()
    {
        var systemRoot = Path.GetPathRoot(Environment.SystemDirectory) ?? "C:\\";
        var result = new List<UsbDrive>();
        foreach (var d in DriveInfo.GetDrives())
        {
            if (d.DriveType is not (DriveType.Removable or DriveType.Fixed)) continue;
            if (string.Equals(d.Name, systemRoot, StringComparison.OrdinalIgnoreCase)) continue;
            bool ready;
            try { ready = d.IsReady; } catch (IOException) { ready = false; }
            if (!ready) continue;

            var phys = CachedPhysicalDisk(d.Name);
            var removable = d.DriveType == DriveType.Removable || (phys is not null && RemovableBusTypes.Contains(phys.Value.BusType));
            if (!removable) continue;

            var serial = phys?.Serial ?? "";
            var reliable = serial.Length > 0 && HardwareInfo.IsReliableSerial(serial);
            if (serial.Length == 0)
            {
                // Seriyasiz arzon fleshka: tom (volume) seriyasi — formatlanganda o'zgaradi
                var vol = VolumeSerial(d.Name);
                if (vol is null) continue;
                serial = "VOL-" + vol.Value.ToString("X8");
                reliable = false;
            }
            result.Add(new UsbDrive(d.Name, serial.Replace("|", "").Replace(",", ""), reliable, phys?.Model ?? ""));
        }
        return result;
    }

    private readonly record struct PhysDisk(ushort BusType, string Serial, string Model);

    // WMI sekin (~0.6 s): jismoniy disk ma'lumoti «harf + tom seriyasi» bo'yicha keshlanadi.
    // Boshqa fleshka ulansa tom seriyasi boshqa bo'ladi — kesh mos kelmaydi va qayta o'qiladi.
    // Tom seriyasini nusxalash mumkin, shuning uchun kesh qisqa (30 s).
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (PhysDisk? Disk, DateTime At)> PhysCache = new();
    private static readonly TimeSpan PhysCacheTtl = TimeSpan.FromSeconds(30);

    private static PhysDisk? CachedPhysicalDisk(string root)
    {
        var vol = VolumeSerial(root);
        if (vol is null) return PhysicalDiskOf(root[0]);
        var key = $"{root}|{vol.Value:X8}";
        if (PhysCache.TryGetValue(key, out var cached) && DateTime.UtcNow - cached.At < PhysCacheTtl) return cached.Disk;
        var phys = PhysicalDiskOf(root[0]);
        if (PhysCache.Count > 32) PhysCache.Clear();
        PhysCache[key] = (phys, DateTime.UtcNow);
        return phys;
    }

    private static PhysDisk? PhysicalDiskOf(char letter)
    {
        if (!char.IsAsciiLetter(letter)) return null;
        var options = new System.Management.EnumerationOptions { Timeout = TimeSpan.FromSeconds(5), ReturnImmediately = false };
        try
        {
            var scope = new ManagementScope(@"root\Microsoft\Windows\Storage");
            uint? number = null;
            using (var parts = new ManagementObjectSearcher(scope,
                       new ObjectQuery($"SELECT DiskNumber FROM MSFT_Partition WHERE DriveLetter='{char.ToUpperInvariant(letter)}'"), options))
            {
                foreach (ManagementObject p in parts.Get())
                {
                    if (p["DiskNumber"] is uint n) { number = n; break; }
                }
            }
            if (number is not uint diskNumber) return null;

            ushort bus = 0;
            string serial = "", model = "";
            using (var disks = new ManagementObjectSearcher(scope,
                       new ObjectQuery($"SELECT BusType, SerialNumber, FriendlyName FROM MSFT_PhysicalDisk WHERE DeviceId='{diskNumber}'"), options))
            {
                foreach (ManagementObject disk in disks.Get())
                {
                    bus = disk["BusType"] is ushort b ? b : (ushort)0;
                    serial = Clean(disk["SerialNumber"]?.ToString());
                    model = disk["FriendlyName"]?.ToString()?.Trim() ?? "";
                    break;
                }
            }
            if (serial.Length == 0)
            {
                // Zaxira: USBSTOR\DISK&VEN_...\<SERIYA>&0
                using var legacy = new ManagementObjectSearcher(new ManagementScope(@"root\cimv2"),
                    new ObjectQuery($"SELECT PNPDeviceID FROM Win32_DiskDrive WHERE Index={diskNumber}"), options);
                foreach (ManagementObject disk in legacy.Get())
                {
                    var pnp = disk["PNPDeviceID"]?.ToString() ?? "";
                    if (pnp.StartsWith("USBSTOR\\", StringComparison.OrdinalIgnoreCase))
                    {
                        var last = pnp[(pnp.LastIndexOf('\\') + 1)..];
                        var amp = last.IndexOf('&');
                        serial = Clean(amp > 0 ? last[..amp] : last);
                    }
                    break;
                }
            }
            return new PhysDisk(bus, serial, model);
        }
        catch (ManagementException)
        {
            return null;
        }
        catch (COMException)
        {
            return null;
        }
    }

    private static string Clean(string? value) =>
        new string((value ?? "").Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool GetVolumeInformationW(
        string rootPathName, StringBuilder? volumeNameBuffer, int volumeNameSize, out uint volumeSerialNumber,
        out uint maximumComponentLength, out uint fileSystemFlags, StringBuilder? fileSystemNameBuffer, int nFileSystemNameSize);

    private static uint? VolumeSerial(string root) =>
        GetVolumeInformationW(root, null, 0, out var serial, out _, out _, null, 0) ? serial : null;
}
