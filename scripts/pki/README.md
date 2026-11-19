# Mezon E-IMZO (ichki PKI)

Tizimga kirish ikki bosqichli: **login + parol**, keyin fleshkadagi **E-IMZO kaliti**.
Algoritm: ECDSA P-256 / SHA-256, X.509 sertifikatlar. Yopiq kalit serverga hech qachon
yuborilmaydi va brauzerda saqlanmaydi — faqat kirish paytida xotirada ochiladi.

## Fayllar

| Fayl | Qayerda | Nima |
|---|---|---|
| `ca.key` | **Oflayn** kompyuter / shifrlangan fleshka | Sertifikat markazining yopiq kaliti — eng maxfiy |
| `ca.crt` | Server: `secrets/pki/ca.crt` | Ishonchli CA (faqat ochiq qismi) |
| `<login>.crt` | Server (SuperAdmin panel) + fleshka | Userning ochiq sertifikati |
| `<login>.mzk` | **Faqat userning fleshkasi** | Parol bilan shifrlangan yopiq kalit (PBKDF2 600 000 + AES-256-GCM) |

## 1. Sertifikat markazini yaratish (bir marta)

```bash
bash scripts/pki/create-ca.sh secrets/pki-ca
```

`secrets/pki/ca.crt` serverga avtomatik nusxalanadi. Keyin `secrets/pki-ca/ca.key` ni
oflayn joyga ko'chiring va serverdan o'chiring. Boshqa joyda bo'lsa: `EIMZO_CA_CERT_FILE`.

## 2. Userga kalit va sertifikat berish

```bash
MZK_PASSWORD='userning kalit paroli' CA_DIR=secrets/pki-ca \
  bash scripts/pki/issue-user.sh aliyev_a "Aliyev Anvar Akmalovich" "Toshkent shahobchasi"
```

Natija `secrets/pki-users/aliyev_a/` da: `aliyev_a.crt` va `aliyev_a.mzk`.
Ikkalasini userning fleshkasiga yozing, keyin serverdagi nusxalarni o'chiring.
Sertifikat muddati: standart 730 kun (`CERT_DAYS`).

## 3. Sertifikatni userga biriktirish

SuperAdmin panel → **E-IMZO sertifikatlar** → login + `.crt` fayl → **Biriktirish**.
Shundan keyin bu user faqat parol + E-IMZO kaliti bilan kiradi.

## 4. Bekor qilish (fleshka yo'qolsa)

Shu bo'limda **Bekor qilish** — sabab yoziladi, userning sessiyalari yopiladi.
Yozuv o'chirilmaydi (eski imzolarni tekshirish uchun). Userga yangi kalit beriladi (2-qadam).
Bekor qilingan sertifikatli user yangi sertifikat biriktirilmaguncha kira olmaydi.

## Sozlamalar (.env)

- `EIMZO_CA_CERT_FILE` — CA sertifikati yo'li (standart: `secrets/pki/ca.crt`)
- `EIMZO_REQUIRED=true` — sertifikati yo'q userlar ham parolning o'zi bilan kira olmaydi

## Talab

Brauzer E-IMZO bosqichini faqat himoyalangan ulanishda bajaradi (HTTPS yoki `localhost`).
