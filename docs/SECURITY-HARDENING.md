# Xavfsizlik arxitekturasi

## So‘rov oqimi

```
Brauzer → Nginx (TLS) → Middleware (IP blok, CSRF, rate limit, JWT cookie, RBAC)
        → API route (requireApiAuth: cookie → sessiya → PostgreSQL → rol/ruxsat)
        → Hujjatga kirish tekshiruvi (lib/documentAccess.ts)
        → Biznes mantiq
```

## 1. Autentifikatsiya

- Token faqat **HttpOnly + Secure + SameSite=Lax** cookie'da yashaydi: `token` (foydalanuvchi),
  `ref_token` (admin panel), `sa_token` (superAdmin). JavaScript ularni o‘qiy olmaydi;
  `localStorage` va `Authorization` headeri ishlatilmaydi.
- JWT: HS256, `iss=mezon`, har cookie turi uchun alohida `aud` va (admin uchun) alohida sir.
  Sirlar productionda kamida 32 belgi bo‘lishi shart.
- Har token serverdagi `UserSession` yozuviga bog‘langan: chiqish, bloklash yoki 30 daqiqa
  faolsizlik tokenni darhol yaroqsiz qiladi.
- Mijoz yuborgan `x-user-*` headerlari middleware'da o‘chiriladi va hech qayerda ishlatilmaydi.
- CSRF: `/api` ga o‘zgartiruvchi so‘rov (POST/PUT/…) faqat o‘z saytimizdan qabul qilinadi
  (`Sec-Fetch-Site`, bo‘lmasa `Origin` tekshiriladi).

## 2. Ro‘yxatdan o‘tish va tasdiqlash

- Rol lavozim matnidan *taxmin* qilinadi, lekin **hech bir akkaunt o‘zini faollashtira olmaydi**.
- `admin` (kotibiyat) akkauntini faqat superAdmin, qolganlarini o‘z viloyati admini tasdiqlaydi.
- SuperAdmin tizimda **bitta** bo‘ladi va `/superadmin/register` orqali familiya, ism,
  otasining ismi, login, parol + `SUPERADMIN_BOOTSTRAP_KEY` (kamida 16 belgi) bilan yaratiladi.
  Hisob yaratilishi bilan endpoint yopiladi (mavjud bo‘lsa 409 qaytaradi); yaratish PostgreSQL
  advisory lock bilan poygadan himoyalangan. SuperAdmin tasdiqlashni talab qilmaydi
  (`isUserTrue=true`) va login qilganda darhol tizimga kiradi. Qo‘shimcha himoya uchun ixtiyoriy
  `SUPERADMIN_SETUP_IPS` (vergul bilan ajratilgan IP lar) berilishi mumkin.
  Keyingi bosqichda bootstrap kalit o‘rnini ERI (kalitli imzo) tekshiruvi egallaydi.
- Yangi parol: kamida 12 belgi, harf + raqam, bcrypt cost 12 (eski xeshlar kirishda yangilanadi).
- Kirish urinishlari: bitta login uchun 10, bitta IP uchun 50 xato / 15 daqiqa.

## 3. Hujjatga kirish (`lib/documentAccess.ts`)

Hujjatni ko‘ra oladiganlar:

| Kim | Shart |
|-----|-------|
| Egasi, yo‘naltirgan komandir | har doim |
| `allowedUsers` va hujjatda nomi yozilgan ishtirokchilar | har doim |
| Kotibiyat | o‘z viloyati + hujjat kotibiyatga yuborilgan yoki ro‘yxatga olingan |
| Komandir | o‘z viloyati + hujjat komandirga yuborilgan |
| Ilova sifatida | foydalanuvchi ko‘ra oladigan hujjatga biriktirilgan bo‘lsa |

Huquq bo‘lmasa javob `404` (hujjat mavjudligi oshkor qilinmaydi). Viloyat nomlari aniq
solishtiriladi («Toshkent» ≠ «Toshkent viloyati»).

Imzolar: mijozdan faqat `userId` olinadi. F.I.O./unvon bazadan yoziladi, `hasSigned` esa faqat
imzolovchining o‘zi `/signed` ni chaqirganda `true` bo‘ladi. Komandir tasdiqlagan hujjat
tahrirlanmaydi.

## 4. Shifrlash (`lib/documentContentEncryption.ts`)

- AES-256-GCM. Har yozuv uchun alohida kalit: `HKDF-SHA256(master, salt)`.
- GCM qo‘shimcha ma’lumoti (AAD) — yozuv identifikatori: shifrmatn boshqa hujjatga
  ko‘chirilsa, ochilmaydi.
- Konvertda kalit identifikatori (`kid`) bor. Kalitni almashtirish:
  1. yangi kalit faylini `APP_ENCRYPTION_KEY_FILE` ga qo‘ying;
  2. eski fayl yo‘lini `APP_ENCRYPTION_PREVIOUS_KEY_FILES` ga yozing (faqat o‘qish uchun).
- Eski formatdagi (v1 / `MXF1`) yozuvlar o‘qilaveradi; o‘zgartirilganda yangi formatga o‘tadi.

## 5. Tarmoq va proksi

- Ilova porti faqat `127.0.0.1` da ochiladi; tashqariga Nginx (TLS) orqali chiqadi.
- `TRUSTED_PROXY_HOPS` (standart 1): mijoz IP si `X-Forwarded-For` ning **o‘ng** tomonidan,
  ya’ni Nginx qo‘shgan qiymatdan olinadi. Nginx sozlamasi:

  ```nginx
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  ```

- Nginx `Host` ni uzatmasa, `APP_ORIGIN` ga saytning tashqi manzilini yozing (CSRF tekshiruvi uchun).
- Rasm optimizatori (`/_next/image`) o‘chirilgan.

## 6. Fayllar

- Faqat PDF (tarkib bo‘yicha), 25 MB gacha; diskka faqat shifrlangan holda yoziladi.
- `CLAMAV_HOST` sozlansa, har fayl clamd orqali tekshiriladi; tekshiruv bajarilmasa fayl rad etiladi.

## 7. Muhit o‘zgaruvchilari

`.env.example` ga qarang. Majburiylari: `DATABASE_URL`, `JWT_SECRET`, `JWT_SECRET_REFRESH`,
`APP_ENCRYPTION_KEY_FILE`. `SECURITY_LOG_KEY` va `WAF_SYNC_KEY` ixtiyoriy — bo‘sh bo‘lsa,
ichki kalitlar `JWT_SECRET` dan hosil qilinadi.

## 8. Kod yozishda

```typescript
const auth = await requireApiAuth(request, { roles: ['admin'] });
if (isAuthError(auth)) return auth;

const document = await loadViewableDocument(id, auth);
if (!document) return documentNotFoundResponse();
```

Hujjat ID si bilan ishlaydigan har bir yangi route `loadViewableDocument` dan boshlanishi kerak.
