#!/usr/bin/env bash
# Mezon E-IMZO: OFLAYN bosh CA kompyuterida bir marta — serverga qo'yiladigan ORALIQ CA chiqarish.
#
# Bosh CA kaliti oflayn qoladi. Oraliq CA kaliti serverda turadi va userlar sertifikatlarini
# avtomatik imzolaydi. Server buzilsa — faqat oraliq CA bekor qilinadi (bosh CA xavfsiz).
#
# Ishlatish:
#   CA_DIR=/path/to/root-ca OUT_DIR=secrets/pki bash scripts/pki/issue-intermediate.sh
# Natija (OUT_DIR):
#   issuing-ca.key  — oraliq CA yopiq kaliti (PKCS#8, faqat serverga, ruxsatlar 600)
#   issuing-ca.crt  — oraliq CA sertifikati (bosh CA imzolagan)
set -euo pipefail
export MSYS_NO_PATHCONV=1

CA_DIR="${CA_DIR:-secrets/pki-ca}"
OUT_DIR="${OUT_DIR:-secrets/pki}"
DAYS="${INTERMEDIATE_DAYS:-1825}"
NAME="${INTERMEDIATE_CN:-Mezon Issuing CA}"

[ -f "$CA_DIR/ca.key" ] && [ -f "$CA_DIR/ca.crt" ] || { echo "Xato: $CA_DIR/ca.key va ca.crt topilmadi." >&2; exit 1; }
mkdir -p "$OUT_DIR"
[ -e "$OUT_DIR/issuing-ca.key" ] && { echo "Xato: $OUT_DIR/issuing-ca.key allaqachon bor (ustiga yozilmaydi)." >&2; exit 1; }

TMP="$OUT_DIR/.int-$$"
mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT

openssl ecparam -name prime256v1 -genkey -noout -out "$TMP/ec.key"
openssl pkcs8 -topk8 -nocrypt -in "$TMP/ec.key" -out "$TMP/issuing-ca.key"
openssl req -new -key "$TMP/issuing-ca.key" -subj "/CN=$NAME/O=Mezon" -out "$TMP/int.csr"
cat > "$TMP/ext.cnf" <<EOF
basicConstraints=critical,CA:TRUE,pathlen:0
keyUsage=critical,keyCertSign,cRLSign
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid
EOF
openssl x509 -req -in "$TMP/int.csr" -CA "$CA_DIR/ca.crt" -CAkey "$CA_DIR/ca.key" \
  -set_serial "0x$(openssl rand -hex 16)" -days "$DAYS" -sha256 -extfile "$TMP/ext.cnf" \
  -out "$TMP/issuing-ca.crt" 2>/dev/null

openssl verify -CAfile "$CA_DIR/ca.crt" "$TMP/issuing-ca.crt" >/dev/null
mv "$TMP/issuing-ca.key" "$OUT_DIR/issuing-ca.key"
mv "$TMP/issuing-ca.crt" "$OUT_DIR/issuing-ca.crt"
chmod 600 "$OUT_DIR/issuing-ca.key" 2>/dev/null || true

echo "Tayyor:"
echo "  $OUT_DIR/issuing-ca.crt"
echo "  $OUT_DIR/issuing-ca.key  (faqat serverga; bosh CA kalitini serverga QO'YMANG)"
openssl x509 -in "$OUT_DIR/issuing-ca.crt" -noout -subject -enddate
