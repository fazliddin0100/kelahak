#!/usr/bin/env bash
# Mezon E-IMZO: ildiz sertifikat markazi (CA) yaratish.
#
# Ishlatish:  bash scripts/pki/create-ca.sh [CA_PAPKA]
#   CA_PAPKA — standart: secrets/pki-ca (git'ga tushmaydi)
#
# MUHIM: ca.key — butun tizimning eng maxfiy kaliti. Uni serverda QOLDIRMANG:
# yaratilgach oflayn (internetga ulanmagan) kompyuterga yoki shifrlangan
# fleshkaga ko'chiring. Serverga faqat ca.crt kerak (secrets/pki/ca.crt).
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash "/CN=..." ni fayl yo'li deb o'zgartirmasin

CA_DIR="${1:-secrets/pki-ca}"
DAYS="${CA_DAYS:-3650}"
CN="${CA_NAME:-Mezon Root CA}"

if [ -e "$CA_DIR/ca.key" ]; then
  echo "Xato: $CA_DIR/ca.key allaqachon bor. Eski CA ustidan yozilmaydi." >&2
  exit 1
fi

mkdir -p "$CA_DIR"
chmod 700 "$CA_DIR" 2>/dev/null || true

openssl ecparam -name prime256v1 -genkey -noout -out "$CA_DIR/ca.key"
chmod 600 "$CA_DIR/ca.key" 2>/dev/null || true

# Alohida konfiguratsiya: OpenSSL'ning standart v3_ca bo'limi kengaytmalarni
# ikki marta qo'shib yubormasligi uchun (takroriy kengaytmali CA ni Node rad etadi).
CNF="$CA_DIR/.ca-$$.cnf"
trap 'rm -f "$CNF"' EXIT
cat > "$CNF" <<EOF
[req]
distinguished_name = dn
x509_extensions = v3_mezon_ca
prompt = no
utf8 = yes
string_mask = utf8only

[dn]
CN = $CN
O = Mezon

[v3_mezon_ca]
basicConstraints = critical,CA:TRUE,pathlen:0
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash
EOF

openssl req -x509 -new -config "$CNF" -key "$CA_DIR/ca.key" -sha256 -days "$DAYS" \
  -out "$CA_DIR/ca.crt"

mkdir -p secrets/pki
cp "$CA_DIR/ca.crt" secrets/pki/ca.crt

echo "CA yaratildi: $CA_DIR/ca.crt (amal qilish: $DAYS kun)"
echo "Server uchun nusxa: secrets/pki/ca.crt"
echo "ESLATMA: $CA_DIR/ca.key ni oflayn joyga ko'chiring va serverdan o'chiring."
