# Xavfsizlik arxitekturasi

## So‘rov oqimi

```
Brauzer → Middleware (JWT + IP + rate limit + RBAC)
       → API route (requireApiAuth → PostgreSQL foydalanuvchi tekshiruvi)
       → Biznes mantiq
```

## 1. Middleware (`middleware.ts`)

Har bir himoyalangan so‘rov uchun:

1. **IP bloklash** — WAF ro‘yxati
2. **Rate limiting** — DDoS / bruteforce oldini olish
3. **JWT tekshiruvi** — `token` / `sa_token` / `ref_token`
4. **Ruxsat tekshiruvi** — `accessApproved` yoki `superAdmin`
5. **RBAC** — yo‘l bo‘yicha rol (`/user`, `/komandir`, `/api/superadmin`…)
6. **Header uzatish** — `X-User-Id`, `X-User-Role`, `X-Access-Approved`

## 2. API autentifikatsiya (`lib/apiAuth.ts`)

Har bir himoyalangan API handler boshida:

```typescript
const auth = await requireApiAuth(request, { roles: ['admin'] });
if (isAuthError(auth)) return auth;
const { userId, role, user } = auth;
```

Bu qadam:

- Token/middleware identifikatsiyasini oladi
- PostgreSQL dan foydalanuvchini yuklaydi
- Token roli DB roli bilan solishtiradi
- `isUserTrue` / superAdmin ruxsatini tekshiradi
- Ixtiyoriy rol yoki permission filtri

## 3. Maxsus guardlar

| Helper | Rol |
|--------|-----|
| `requireSuperAdmin` | superAdmin + DB tasdiq |
| `requireAdminOperator` | admin / superAdmin + DB tasdiq |

## 4. Ochiq (public) yo‘llar

- `/sign-in`, `/sign-up`
- `/api/auth/login`, `register`, `check-user`, `admin`
- `/api/superadmin/login`, `register`, `setup-status`
- `/api/security/log` (kalit bilan)
- `/api/waf/blocked-list` (ichki)

## 5. Production deploy

```bash
cp .env.production.example .env.production.local
# Barcha CHANGE_ME qiymatlarni almashtiring

npm run db:push
docker compose -f docker-compose.prod.yml up -d --build
```

## 6. Majburiy muhit o‘zgaruvchilari

| O‘zgaruvchi | Vazifa |
|-------------|--------|
| `JWT_SECRET` | Asosiy token imzosi |
| `JWT_SECRET_REFRESH` | Admin ref_token |
| `DATABASE_URL` | PostgreSQL |
| `SECURITY_LOG_KEY` | Security log API |
| `WAF_SYNC_KEY` | WAF sinxronizatsiya |

## 7. models/ papkasi

O‘chirilgan — barcha ma’lumot Prisma orqali PostgreSQL da.
