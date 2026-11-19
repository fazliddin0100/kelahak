#!/usr/bin/env bash
# Mezon E-IMZO: foydalanuvchi uchun kalit + sertifikat (fleshka uchun).
#
# Ishlatish:
#   MZK_PASSWORD='kalit paroli' bash scripts/pki/issue-user.sh <login> "<F.I.Sh>" "<shahobcha>" [CHIQISH_PAPKA]
#
# Natija (CHIQISH_PAPKA, standart: secrets/pki-users/<login>):
#   <login>.crt — ochiq sertifikat: SuperAdmin panelida userga biriktiriladi
#   <login>.mzk — parol bilan shifrlangan yopiq kalit: FAQAT fleshkaga
# Shifrlanmagan yopiq kalit diskda qoldirilmaydi.
set -euo pipefail
export MSYS_NO_PATHCONV=1

LOGIN="${1:?login kerak}"
FIO="${2:?F.I.Sh kerak}"
ORG="${3:?shahobcha nomi kerak}"
OUT_DIR="${4:-secrets/pki-users/$LOGIN}"
CA_DIR="${CA_DIR:-secrets/pki-ca}"
DAYS="${CERT_DAYS:-730}"
HERE="$(dirname "${BASH_SOURCE[0]}")" # nisbiy yo'l: Windows node ham tushunadi

if [ -z "${MZK_PASSWORD:-}" ]; then
  echo "Xato: MZK_PASSWORD (kalit paroli) berilmagan." >&2
  exit 1
fi
if [ ! -f "$CA_DIR/ca.key" ] || [ ! -f "$CA_DIR/ca.crt" ]; then
  echo "Xato: $CA_DIR/ca.key va ca.crt topilmadi (avval create-ca.sh)." >&2
  exit 1
fi
if ! printf '%s' "$LOGIN" | grep -Eq '^[a-z0-9_-]{3,50}$'; then
  echo "Xato: login faqat kichik harf, raqam, _ va - (3–50 belgi)." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR" 2>/dev/null || true
# Vaqtinchalik papka natija papkasi ichida (Windows'dagi openssl /tmp ni ko'rmaydi)
TMP="$OUT_DIR/.tmp-$$"
mkdir -p "$TMP"
chmod 700 "$TMP" 2>/dev/null || true
trap 'rm -rf "$TMP"' EXIT

openssl ecparam -name prime256v1 -genkey -noout -out "$TMP/key.pem"
openssl pkcs8 -topk8 -nocrypt -in "$TMP/key.pem" -outform DER -out "$TMP/key.pk8"

openssl req -new -utf8 -key "$TMP/key.pem" -sha256 \
  -subj "/CN=$FIO/UID=$LOGIN/O=$ORG" -out "$TMP/req.csr"

cat > "$TMP/ext.cnf" <<EOF
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,nonRepudiation
extendedKeyUsage=clientAuth
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid
EOF

SERIAL="$(openssl rand -hex 16)"
openssl x509 -req -in "$TMP/req.csr" -CA "$CA_DIR/ca.crt" -CAkey "$CA_DIR/ca.key" \
  -set_serial "0x$SERIAL" -days "$DAYS" -sha256 -extfile "$TMP/ext.cnf" \
  -out "$OUT_DIR/$LOGIN.crt"

node "$HERE/make-key-file.mjs" "$TMP/key.pk8" "$OUT_DIR/$LOGIN.mzk"

echo "Tayyor:"
echo "  $OUT_DIR/$LOGIN.crt  — SuperAdmin panelida userga biriktiring"
echo "  $OUT_DIR/$LOGIN.mzk  — fleshkaga yozing (parolsiz ochilmaydi)"
openssl x509 -in "$OUT_DIR/$LOGIN.crt" -noout -subject -enddate -fingerprint -sha256
