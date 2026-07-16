# PostgreSQL + Prisma migratsiyasi

## Holat: TUGALLANDI

Barcha API route'lar Prisma (PostgreSQL) ga o'tkazildi.

## Ishga tushirish

```bash
cp .env.example .env.local
# DATABASE_URL=postgresql://mysayt:mysayt_secret@127.0.0.1:5432/mysayt

npm run docker:up
npm run db:push
npm run db:migrate-data    # MongoDB dan ma'lumot ko'chirish
npm run db:optimize        # performance indekslar
npm run dev
```

## Arxitektura

| Xizmat | Vazifa |
|--------|--------|
| PostgreSQL 16 | Asosiy DB |
| PgBouncer | Connection pooling |
| Redis | Rate limit / kesh |
| `document_contents` | Og'ir JSON alohida jadval |

## Helper modullar

| Fayl | Vazifa |
|------|--------|
| `lib/prisma.ts` | Prisma client |
| `lib/db/user.ts` | Foydalanuvchi so'rovlari |
| `lib/db/document.ts` | Hujjat CRUD + serializatsiya |
| `lib/db/nomeklatura.ts` | Nomeklatura |
| `lib/db/file.ts` | Fayllar |

## Eski Mongoose modellari

`models/` papkasi hali mavjud (tip/reference uchun), lekin API route'lar uni ishlatmaydi.
Keyingi bosqichda o'chirish mumkin.
