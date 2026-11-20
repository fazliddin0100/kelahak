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

## 2. Userga kalit va sertifikat berish (tavsiya: panel + oflayn CA)

1. SuperAdmin panel → **E-IMZO sertifikatlar** → «1. Kalit va so'rov yaratish»: login, F.I.Sh,
   tashkilot va kalit paroli kiritiladi. Brauzer ikki fayl beradi:
   `login.mzk` (shifrlangan kalit, userning fleshkasiga) va `login.csr` (so'rov).
   Kalit serverga yuborilmaydi.
2. `login.csr` ni **oflayn CA kompyuteriga** olib boring va imzolang:
   ```bash
   CA_DIR=/path/to/pki-ca bash scripts/pki/sign-csr.sh login.csr login
   ```
   Skript so'rov imzosini tekshiradi, F.I.Sh/login va ochiq kalit barmoq izini ko'rsatadi
   (paneldagi bilan solishtiring) va tasdiqdan keyin `login.crt` beradi.
3. `login.crt` ni panelda «2. Sertifikatni biriktirish» orqali userga biriktiring.

### Muqobil: hammasi oflayn kompyuterda (skript bilan)


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

## 5. Server (TLS) sertifikatlari

`issue-server.sh` — Nginx uchun HTTPS sertifikati va viloyat serverlari uchun mTLS mijoz
sertifikati (`CLIENT=1`). Batafsil: `deploy/README.md`.

## 6. E-IMZO'ni hamma uchun majburiy qilish

1. SuperAdmin parol bilan kirib, **o'zi uchun** kalit va so'rov yaratadi (2-bo'lim), oflayn imzolatadi
   va `superadmin01.crt` ni biriktiradi. Chiqib, E-IMZO bilan qayta kirib ko'radi.
2. Keyin `.env` da `EIMZO_REQUIRED=true` qilib serverni qayta ishga tushiring.
   Shundan so'ng sertifikati yo'q hech kim (SuperAdmin ham) faqat parol bilan kira olmaydi.

**Favqulodda holat** (SuperAdmin kalitini yo'qotsa): server kompyuterida
```bash
node scripts/pki/bind-cert.mjs superadmin01 yangi.crt --revoke-others
```
Bu panelsiz, bazaga to'g'ridan-to'g'ri yozadi va xavfsizlik jurnaliga qayd etadi.

## Sozlamalar (.env)

- `EIMZO_CA_CERT_FILE` — CA sertifikati yo'li (standart: `secrets/pki/ca.crt`)
- `EIMZO_REQUIRED=true` — sertifikati yo'q userlar ham parolning o'zi bilan kira olmaydi

## Talab

Brauzer E-IMZO bosqichini faqat himoyalangan ulanishda bajaradi (HTTPS yoki `localhost`).
