#!/usr/bin/env bash
# Mezon E-IMZO: OFLAYN CA kompyuterida sertifikat so'rovini (.csr) imzolash.
# .csr SuperAdmin panelida (E-IMZO sertifikatlar -> Kalit yaratish) yaratiladi.
#
# Ishlatish:
#   CA_DIR=/path/to/pki-ca bash scripts/pki/sign-csr.sh <login>.csr [kutilgan_login]
#   -y bilan tasdiq so'ralmaydi: bash scripts/pki/sign-csr.sh -y aliyev_a.csr aliyev_a
#
# Natija: <login>.crt — panelga yuklab, userga biriktiriladi.
# So'rovning o'z imzosi tekshiriladi (kalit egasi haqiqatan shu so'rovni yaratgan),
# subject ko'rsatiladi va faqat tasdiqdan keyin imzolanadi.
set -euo pipefail
export MSYS_NO_PATHCONV=1

YES=0
if [ "${1:-}" = "-y" ]; then YES=1; shift; fi
CSR="${1:?.csr fayli kerak}"
EXPECTED_LOGIN="${2:-}"
CA_DIR="${CA_DIR:-secrets/pki-ca}"
DAYS="${CERT_DAYS:-730}"
OUT="${CSR%.csr}.crt"

[ -f "$CSR" ] || { echo "Xato: $CSR topilmadi." >&2; exit 1; }
[ -f "$CA_DIR/ca.key" ] && [ -f "$CA_DIR/ca.crt" ] || { echo "Xato: $CA_DIR/ca.key va ca.crt topilmadi." >&2; exit 1; }
[ -e "$OUT" ] && { echo "Xato: $OUT allaqachon bor." >&2; exit 1; }

# 1) So'rov imzosi (proof of possession) va kalit turi
openssl req -in "$CSR" -noout -verify >/dev/null 2>&1 || { echo "Xato: so'rov imzosi noto'g'ri yoki fayl buzilgan." >&2; exit 1; }
if ! openssl req -in "$CSR" -noout -text | grep -q "prime256v1\|P-256"; then
  echo "Xato: faqat EC P-256 kaliti qabul qilinadi." >&2
  exit 1
fi

SUBJECT="$(openssl req -in "$CSR" -noout -subject -nameopt utf8,sep_comma_plus_space | sed 's/^subject=//')"
UID_VALUE="$(printf '%s' "$SUBJECT" | sed -n 's/.*UID *= *\([^,]*\).*/\1/p' | tr -d ' ')"
if [ -z "$UID_VALUE" ]; then
  echo "Xato: so'rovda UID (login) yo'q." >&2
  exit 1
fi
if [ -n "$EXPECTED_LOGIN" ] && [ "$UID_VALUE" != "$EXPECTED_LOGIN" ]; then
  echo "Xato: so'rovdagi login «$UID_VALUE», kutilgani «$EXPECTED_LOGIN»." >&2
  exit 1
fi

FP="$(openssl req -in "$CSR" -noout -pubkey | openssl pkey -pubin -outform DER | openssl dgst -sha256 | sed 's/^.*= //')"
echo "So'rov: $SUBJECT"
echo "Ochiq kalit SHA-256: $FP"
echo "  (paneldagi «Ochiq kalit barmoq izi» bilan solishtiring)"
echo "Muddat: $DAYS kun"

if [ "$YES" != "1" ]; then
  read -r -p "Imzolansinmi? [ha/yo'q]: " ANSWER
  [ "$ANSWER" = "ha" ] || { echo "Bekor qilindi."; exit 1; }
fi

TMP="$(dirname "$OUT")/.sign-$$"
mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT
cat > "$TMP/ext.cnf" <<EOF
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,nonRepudiation
extendedKeyUsage=clientAuth
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid
EOF

openssl x509 -req -in "$CSR" -CA "$CA_DIR/ca.crt" -CAkey "$CA_DIR/ca.key" \
  -set_serial "0x$(openssl rand -hex 16)" -days "$DAYS" -sha256 -extfile "$TMP/ext.cnf" \
  -out "$OUT" 2>/dev/null

echo "Tayyor: $OUT — SuperAdmin panelida «$UID_VALUE» ga biriktiring."
openssl x509 -in "$OUT" -noout -enddate -fingerprint -sha256
