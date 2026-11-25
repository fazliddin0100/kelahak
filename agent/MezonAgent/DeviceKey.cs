using System.Runtime.Versioning;
using System.Security.Cryptography;

namespace MezonAgent;

/// <summary>
/// Qurilma kaliti (ECDSA P-256). Iloji bo'lsa TPM chipida (Microsoft Platform Crypto Provider),
/// aks holda Windows kalit omborida yaratiladi. Har ikki holatda ham yopiq kalitni eksport qilib
/// bo'lmaydi: u faqat shu kompyuterda imzo qo'yadi. Server ochiq kalitni birinchi aloqada yozib oladi.
/// </summary>
[SupportedOSPlatform("windows")]
public sealed class DeviceKey : IDisposable
{
    private readonly ECDsaCng _ecdsa;

    public bool IsHardware { get; }
    public string PublicKeySpkiBase64 { get; }
    public string PublicKeySha256Hex { get; }

    private DeviceKey(CngKey key, bool isHardware)
    {
        _ecdsa = new ECDsaCng(key);
        IsHardware = isHardware;
        var spki = _ecdsa.ExportSubjectPublicKeyInfo();
        PublicKeySpkiBase64 = Convert.ToBase64String(spki);
        PublicKeySha256Hex = Convert.ToHexString(SHA256.HashData(spki)).ToLowerInvariant();
    }

    public static DeviceKey OpenOrCreate(string keyName, bool allowSoftwareFallback, bool machineKey, ILogger logger)
    {
        // Xizmat (LocalSystem) — kompyuter kaliti; sinov uchun konsolda — joriy foydalanuvchi kaliti
        var openOptions = machineKey ? CngKeyOpenOptions.MachineKey : CngKeyOpenOptions.None;
        var createOptions = machineKey ? CngKeyCreationOptions.MachineKey : CngKeyCreationOptions.None;
        // 1) Avval yaratilgan kalit (TPM, keyin dasturiy ombor)
        foreach (var (provider, hardware) in Providers(allowSoftwareFallback))
        {
            try
            {
                if (CngKey.Exists(keyName, provider, openOptions))
                {
                    var key = CngKey.Open(keyName, provider, openOptions);
                    logger.LogInformation("Qurilma kaliti ochildi ({Provider})", provider.Provider);
                    return new DeviceKey(key, hardware);
                }
            }
            catch (CryptographicException e)
            {
                logger.LogWarning("{Provider} ochilmadi: {Message}", provider.Provider, e.Message);
            }
        }

        // 2) Yangi kalit
        foreach (var (provider, hardware) in Providers(allowSoftwareFallback))
        {
            try
            {
                var parameters = new CngKeyCreationParameters
                {
                    Provider = provider,
                    KeyCreationOptions = createOptions,
                    ExportPolicy = CngExportPolicies.None,
                    KeyUsage = CngKeyUsages.Signing,
                };
                var key = CngKey.Create(CngAlgorithm.ECDsaP256, keyName, parameters);
                logger.LogInformation("Yangi qurilma kaliti yaratildi ({Provider})", provider.Provider);
                return new DeviceKey(key, hardware);
            }
            catch (CryptographicException e)
            {
                logger.LogWarning("{Provider} da kalit yaratilmadi: {Message}", provider.Provider, e.Message);
            }
        }

        throw new InvalidOperationException(
            allowSoftwareFallback
                ? "Qurilma kalitini yaratib bo'lmadi."
                : "TPM topilmadi yoki yoqilmagan, dasturiy kalitga ruxsat berilmagan (AllowSoftwareKey=false).");
    }

    private static IEnumerable<(CngProvider Provider, bool Hardware)> Providers(bool allowSoftware)
    {
        yield return (CngProvider.MicrosoftPlatformCryptoProvider, true);
        if (allowSoftware) yield return (CngProvider.MicrosoftSoftwareKeyStorageProvider, false);
    }

    /// <summary>ECDSA P-256 / SHA-256 imzo, IEEE P1363 (r||s, 64 bayt) — WebCrypto va Node bilan bir xil.</summary>
    public string SignBase64(byte[] data) =>
        Convert.ToBase64String(_ecdsa.SignData(data, HashAlgorithmName.SHA256, DSASignatureFormat.IeeeP1363FixedFieldConcatenation));

    public void Dispose() => _ecdsa.Dispose();
}
