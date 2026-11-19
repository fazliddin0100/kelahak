# Mezon: tarmoq himoyasi (TLS 1.3, mTLS)

Respublika bo'ylab yopiq tarmoqda barcha trafik shifrlanadi. Ochiq HTTP faqat HTTPS ga
yo'naltiradi. Ilova va baza tashqi tarmoqqa port ochmaydi.

```
Foydalanuvchi brauzeri ──TLS 1.3──▶ Nginx :443 ──▶ ilova 127.0.0.1:3001 ──▶ PgBouncer ─▶ Postgres
Viloyat serveri ────mTLS (ikki tomonlama sertifikat)──▶ Nginx :8443 ──▶ ilova     (ichki Docker tarmog'i,
                                                                                    portlar ochilmagan)
```

| Qatlam | Himoya |
|---|---|
| Brauzer ↔ server | TLS 1.3 (X25519/P-256, AES-256-GCM), HSTS, HTTP→HTTPS, ichki CA sertifikati |
| Viloyat ↔ markaz | mTLS: ikkala tomon ham CA bergan sertifikat ko'rsatadi, begonasi TLS darajasida uziladi |
| Ilova ↔ baza | Postgres/PgBouncer/Redis `docker-compose.prod.yml` da port ochmaydi — trafik serverdan chiqmaydi |
| Ma'lumot bazada | AES-256-GCM (har yozuvga alohida kalit), `lib/documentContentEncryption.ts` |
| Kirish va imzo | E-IMZO (ECDSA P-256), `scripts/pki/README.md` |

## 1. Sertifikatlar (oflayn CA kompyuterida)

```bash
# Markaziy server (foydalanuvchilar ochadigan manzil)
CA_DIR=secrets/pki-ca bash scripts/pki/issue-server.sh markaz mezon.markaz.lan 10.10.0.5

# Har bir viloyat serveri markazga ulanishi uchun (mijoz sertifikati)
CLIENT=1 CA_DIR=secrets/pki-ca bash scripts/pki/issue-server.sh samarqand-sync samarqand.lan
```

Server sertifikati 397 kun amal qiladi, chunki brauzerlar bundan uzun muddatli sertifikatni rad etadi.
Muddati tugashidan oldin qayta chiqaring.

## 2. Nginx (Linux server)

```bash
sudo mkdir -p /etc/mezon/tls && sudo chmod 700 /etc/mezon/tls
sudo cp markaz.fullchain.crt /etc/mezon/tls/server.fullchain.crt
sudo cp markaz.key          /etc/mezon/tls/server.key && sudo chmod 600 /etc/mezon/tls/server.key
sudo cp ca.crt              /etc/mezon/tls/ca.crt
sudo cp deploy/nginx/mezon.conf      /etc/nginx/conf.d/   # server_name ni o'zgartiring
sudo cp deploy/nginx/mezon-mtls.conf /etc/nginx/conf.d/   # faqat viloyatlar aloqasi kerak bo'lsa
sudo nginx -t && sudo systemctl reload nginx
```

`.env.production.local` da quyidagilarni sozlang:
- `APP_ORIGIN=https://mezon.markaz.lan`
- `TRUSTED_PROXY_HOPS=1`
- `APP_BIND_ADDRESS=127.0.0.1`

## 3. Foydalanuvchi kompyuterlari

`ca.crt` ni har bir kompyuterga **Ishonchli ildiz sertifikatlar markazi** sifatida o'rnating.
Buni guruh siyosati (GPO) orqali yoki qo'lda `certlm.msc` → Trusted Root Certification Authorities da qilish mumkin.
Shundan keyin `https://mezon.markaz.lan` ogohlantirishsiz ochiladi va E-IMZO ishlaydi.
Brauzer E-IMZO kalitini faqat HTTPS orqali ochadi.

## 4. Nginx'siz sinov (Windows, lokal tarmoq)

```bash
bash scripts/pki/issue-server.sh local localhost 127.0.0.1 <bu kompyuter IP>
npm run dev
node scripts/dev-https.mjs --port 3443 --mtls-port 8443
```

`https://<IP>:3443` ni oching (mTLS: `:8443`). Bu skript faqat sinov uchun. Productionda Nginx ishlatiladi.

## Tekshirish

```bash
echo | openssl s_client -connect mezon.markaz.lan:443 -CAfile ca.crt -tls1_3 | grep -E "Protocol|Verify return"
echo | openssl s_client -connect mezon.markaz.lan:443 -tls1_2      # rad etilishi kerak
curl --cacert ca.crt --cert samarqand-sync.crt --key samarqand-sync.key https://mezon.markaz.lan:8443/
```
