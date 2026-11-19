#!/usr/bin/env bash
# Mezon: server (Nginx) uchun TLS sertifikati — ichki CA dan.
#
# Ishlatish:
#   CA_DIR=secrets/pki-ca bash scripts/pki/issue-server.sh <nom> <DNS yoki IP> [DNS yoki IP ...]
#   masalan: bash scripts/pki/issue-server.sh toshkent mezon.toshkent.lan 10.10.1.5
#
# Natija secrets/pki-servers/<nom>/:
#   <nom>.crt  — server sertifikati (+ CA zanjiri: <nom>.fullchain.crt)
#   <nom>.key  — server yopiq kaliti (faqat shu serverda, 600 ruxsat)
# Brauzer va boshqa serverlar CA (ca.crt) ga ishonsa, ulanish ogohlantirishsiz bo'ladi.
#
# Viloyat serveri markazga mTLS bilan ulanishi uchun mijoz sertifikati:
#   CLIENT=1 bash scripts/pki/issue-server.sh samarqand-sync samarqand.lan
set -euo pipefail
export MSYS_NO_PATHCONV=1

NAME="${1:?server nomi kerak}"
shift
[ "$#" -ge 1 ] || { echo "Kamida bitta DNS nomi yoki IP kerak." >&2; exit 1; }
CA_DIR="${CA_DIR:-secrets/pki-ca}"
OUT_DIR="${OUT_DIR:-secrets/pki-servers/$NAME}"
DAYS="${CERT_DAYS:-397}" # brauzerlar 398 kundan uzun server sertifikatlarini rad etadi

if ! printf '%s' "$NAME" | grep -Eq '^[a-z0-9][a-z0-9-]{1,40}$'; then
  echo "Xato: nom faqat kichik harf, raqam va - (2–41 belgi)." >&2
  exit 1
fi
if [ ! -f "$CA_DIR/ca.key" ] || [ ! -f "$CA_DIR/ca.crt" ]; then
  echo "Xato: $CA_DIR/ca.key va ca.crt topilmadi." >&2
  exit 1
fi

SAN=""
for host in "$@"; do
  if printf '%s' "$host" | grep -Eq '^[0-9]{1,3}(\.[0-9]{1,3}){3}$'; then
    SAN="${SAN:+$SAN,}IP:$host"
  elif printf '%s' "$host" | grep -Eq '^[A-Za-z0-9.-]+$'; then
    SAN="${SAN:+$SAN,}DNS:$host"
  else
    echo "Xato: noto'g'ri host: $host" >&2
    exit 1
  fi
done

if [ "${CLIENT:-0}" = "1" ]; then EKU="clientAuth"; else EKU="serverAuth"; fi

mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR" 2>/dev/null || true
TMP="$OUT_DIR/.tmp-$$"
mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT

openssl ecparam -name prime256v1 -genkey -noout -out "$OUT_DIR/$NAME.key"
chmod 600 "$OUT_DIR/$NAME.key" 2>/dev/null || true
openssl req -new -key "$OUT_DIR/$NAME.key" -sha256 -subj "/CN=$1/O=Mezon" -out "$TMP/req.csr"

cat > "$TMP/ext.cnf" <<EOF
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature
extendedKeyUsage=$EKU
subjectAltName=$SAN
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid
EOF

openssl x509 -req -in "$TMP/req.csr" -CA "$CA_DIR/ca.crt" -CAkey "$CA_DIR/ca.key" \
  -set_serial "0x$(openssl rand -hex 16)" -days "$DAYS" -sha256 -extfile "$TMP/ext.cnf" \
  -out "$OUT_DIR/$NAME.crt"
cat "$OUT_DIR/$NAME.crt" "$CA_DIR/ca.crt" > "$OUT_DIR/$NAME.fullchain.crt"

echo "Tayyor ($EKU, $DAYS kun): $OUT_DIR/"
openssl x509 -in "$OUT_DIR/$NAME.crt" -noout -subject -enddate
echo "SAN: $SAN"
