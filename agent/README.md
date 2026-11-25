# Mezon E-IMZO agenti (Windows, .NET 8)

User kompyuterida ishlaydigan kichik Windows xizmati. Brauzer MAC manzilni va disk seriyasini o'qiy
olmaydi, agent esa o'qiydi. U shu ma'lumotlarni **qurilma kaliti** bilan imzolab, Mezon saytiga beradi.

## Nima qiladi

| Vazifa | Qanday |
|---|---|
| MAC manzil | Jismoniy tarmoq kartasi (Hyper-V, Docker, VPN, Bluetooth kabi virtual adapterlar hisobga olinmaydi). Asosiysi — tarmoqqa ulangan (shlyuzi bor) karta. Format: `3C-52-82-1A-7F-09` |
| Disk seriyasi | Windows o'rnatilgan diskning (C:) jismoniy seriya raqami: `MSFT_Partition` → `MSFT_PhysicalDisk` (zaxira: `Win32_DiskDrive`). 10 daqiqa keshlanadi |
| Qurilma kaliti | ECDSA P-256. Avval **TPM** (Microsoft Platform Crypto Provider), TPM bo'lmasa Windows kalit ombori. Yopiq kalit **eksport qilinmaydi** — boshqa kompyuterga ko'chirib bo'lmaydi |
| Tarmoq | Faqat `127.0.0.1:64650` — tarmoqdan kirib bo'lmaydi |
| Ruxsat | Faqat `appsettings.json` dagi `AllowedOrigins` saytlari (masalan `https://192.168.100.12`) |

**Muhim:** ba'zi arzon NVMe disklar seriya o'rniga `0000_0000_…_0100_0000_0000.` kabi namuna qaytaradi —
u bir xil modeldagi barcha disklarda bir xil bo'lishi mumkin. Agent buni `diskSerialReliable: false` deb
belgilaydi (masalan, sinovdagi GV-512GB-2280 diski shunday). Bunday holatda server disk seriyasiga emas,
qurilma kalitiga tayanadi.

MAC va disk seriyasini o'zgartirish mumkin. Asosiy himoya — qurilma kaliti: server uning ochiq qismini
birinchi aloqada yozib oladi va keyingi imzolarda faqat shu kalit bilan kelgan tasdiqni qabul qiladi.

## Sinov rejimi (administrator huquqisiz)

```powershell
$env:Agent__MachineKey='false'; $env:Agent__KeyName='MezonAgentTestKey'; $env:Agent__Port='64651'
agent\dist\MezonAgent.exe
```
Kalit joriy foydalanuvchi omborida yaratiladi. Xizmat sifatida o'rnatilganda kompyuter kaliti ishlatiladi.

## Yig'ish (dasturchi kompyuterida)

.NET 8 SDK kerak: https://dotnet.microsoft.com/download/dotnet/8.0

```powershell
powershell -ExecutionPolicy Bypass -File agent\build.ps1
```

Natija `agent\dist\` papkasida: `MezonAgent.exe` (o'z ichida .NET bilan, alohida o'rnatish shart emas),
`appsettings.json`, `install.ps1`, `uninstall.ps1`.

## User kompyuteriga o'rnatish

`dist` papkasini kompyuterga ko'chiring va **Administrator** sifatida:

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1 -Origin https://192.168.100.12
```

Skript `C:\Program Files\MezonAgent` ga o'rnatadi, `MezonAgent` xizmatini (avtomatik ishga tushadigan,
LocalSystem) yaratadi va oxirida kompyuter nomi, MAC, disk seriyasi va qurilma kaliti barmoq izini chiqaradi.

O'chirish: `uninstall.ps1` (qurilma kaliti saqlanadi) yoki `uninstall.ps1 -RemoveKey` (kalit ham o'chadi —
kompyuterni serverda qayta ro'yxatdan o'tkazish kerak bo'ladi).

Jurnal: Event Viewer → Windows Logs → Application, manba `MezonAgent`.

## API (brauzer → agent)

Barcha so'rovlarda brauzerning `Origin` sarlavhasi ruxsat etilgan sayt bo'lishi shart, aks holda `403`.
Chrome/Edge ning lokal tarmoqqa kirish (Private/Local Network Access) so'rovi qo'llab-quvvatlanadi;
brauzer birinchi marta ruxsat so'rashi mumkin — «Ruxsat berish» bosiladi.

### `GET /v1/health`
```json
{ "ok": true, "version": "1.0.0" }
```

### `GET /v1/info` — imzosiz ma'lumot (ko'rish uchun)
```json
{
  "version": "1.0.0", "hostname": "PC-01",
  "mac": "3C-52-82-1A-7F-09",
  "macs": [{ "mac": "3C-52-82-1A-7F-09", "description": "Intel(R) Ethernet", "up": true }],
  "diskSerial": "S4EWNX0R123456", "diskModel": "Samsung SSD 980", "diskSerialReliable": true,
  "publicKey": "<SPKI DER, base64>", "publicKeySha256": "<hex>", "hardwareKey": true
}
```

### `POST /v1/attest` — server so'rovini imzolash
So'rov: `{ "challenge": "<server bergan base64url, 16-128 belgi>", "origin": "https://192.168.100.12" }`
(`origin` brauzer yuborgan `Origin` bilan bir xil bo'lishi shart).

Javob: `/v1/info` maydonlari + `signature`; bu yerda `macs` — barcha jismoniy kartalar MAC lari,
alifbo tartibida, vergul bilan (`30-68-93-F8-4E-6E,AC-72-89-00-D1-42`).

Imzolangan matn (UTF-8):
```
mezon-device|v1|<origin>|<challenge>|<macs>|<diskSerial>|<publicKeySha256>
```
Imzo: ECDSA P-256 / SHA-256, IEEE P1363 (`r||s`, 64 bayt), base64 — WebCrypto bilan bir xil.

## Server tomoni (keyingi qadam — hali yozilmagan)

1. **Birinchi imzo so'rovi** (user birinchi marta kirib, birinchi hujjatni imzolaganda):
   - server bir martalik `challenge` beradi; sayt agentdan `/v1/attest` oladi va E-IMZO imzosi bilan birga yuboradi;
   - server tekshiradi: E-IMZO sertifikati haqiqiy va **shu userga** tegishli; sertifikatdagi MAC
     (superadmin kiritgan) agent yuborgan `macs` ro'yxatida bor; agent imzosi `publicKey` bilan to'g'ri;
   - hammasi to'g'ri bo'lsa, userga **MAC + disk seriyasi + qurilma ochiq kaliti** yozib qo'yiladi.
2. **Keyingi imzolar:** agent tasdig'i majburiy; qurilma kaliti, MAC va disk seriyasi birinchi yozilganiga
   mos kelmasa — imzo rad etiladi va xavfsizlik jurnaliga yoziladi.
3. Kompyuter almashtirilsa — superadmin userning yozilgan qurilmasini bekor qiladi, keyingi imzoda yangisi yoziladi.
