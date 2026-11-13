#!/usr/bin/env bash
# Tuğra Online — boş bir Ubuntu 24.04 sunucuya tek seferde kurulum (Cloudflare arkasında, tugraonline.net).
# Kullanım (root olarak):
#   curl -fsSLo kur.sh https://raw.githubusercontent.com/mehmetkibby-prog/ccre/tugra-online/deploy/kur.sh && bash kur.sh
# Tekrar çalıştırmak güvenlidir: var olan veritabanına, ayara ve sertifikaya dokunmaz, yalnız eksikleri tamamlar.
set -euo pipefail

REPO=https://github.com/mehmetkibby-prog/ccre
DAL=tugra-online
ALAN=tugraonline.net
KOK=/opt/coreoflife
ENVF=/etc/coreoflife.env
SSL=/etc/ssl/cloudflare

adim() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }
tamam() { printf '\033[1;32m  ✓ %s\033[0m\n' "$*"; }
hata() { printf '\033[1;31m  ✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || hata "Root olarak çalıştır (sudo -i)."
grep -q '24.04' /etc/os-release || echo "  ! Ubuntu 24.04 bekleniyordu; yine de devam ediliyor."
export DEBIAN_FRONTEND=noninteractive
RAM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)

adim "1/9 Takas alanı (RAM: ${RAM_MB} MB)"
if [ "$RAM_MB" -lt 3500 ] && ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  tamam "2 GB takas açıldı"
else tamam "gerek yok / zaten var"; fi

adim "2/9 Paketler (nginx, PostgreSQL, Node 22)"
apt-get update -qq
apt-get install -y -qq curl git nginx postgresql postgresql-contrib ufw openssl ca-certificates >/dev/null
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
tamam "node $(node -v), nginx $(nginx -v 2>&1 | cut -d/ -f2), $(psql --version | cut -d' ' -f3- )"

adim "3/9 Veritabanı"
systemctl enable --now postgresql >/dev/null
PGV=$(ls /etc/postgresql | sort -V | tail -1)
if [ "$RAM_MB" -lt 3500 ]; then SB=256MB; EC=768MB; MC=30; else SB=1GB; EC=3GB; MC=60; fi
cat > /etc/postgresql/$PGV/main/conf.d/tugra.conf <<EOF
shared_buffers = $SB
effective_cache_size = $EC
max_connections = $MC
synchronous_commit = on
EOF
systemctl restart postgresql
if [ -f "$ENVF" ]; then
  tamam "ayar dosyası var, veritabanı parolasına dokunulmadı"
else
  DBPW=$(openssl rand -hex 24)
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='coreoflife'" | grep -q 1; then
    sudo -u postgres psql -qc "ALTER USER coreoflife WITH PASSWORD '$DBPW';"
  else
    sudo -u postgres psql -qc "CREATE USER coreoflife WITH PASSWORD '$DBPW';"
  fi
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='coreoflife'" | grep -q 1 || sudo -u postgres createdb -O coreoflife coreoflife
  tamam "veritabanı ve kullanıcı hazır (parola rastgele üretildi, yalnız $ENVF içinde)"
fi

adim "4/9 Kodu indir ve derle (birkaç dakika sürer)"
id coreoflife >/dev/null 2>&1 || useradd -r -m -d "$KOK" -s /usr/sbin/nologin coreoflife
mkdir -p "$KOK/releases"
SURUM=r$(date +%Y%m%d-%H%M%S)
git clone -q --depth 1 -b "$DAL" "$REPO" "$KOK/releases/$SURUM"
cd "$KOK/releases/$SURUM"
npm ci --no-audit --no-fund --loglevel=error
NODE_OPTIONS=--max-old-space-size=1536 npm run build >/tmp/tugra-build.log 2>&1 || { tail -30 /tmp/tugra-build.log; hata "derleme başarısız (tam kayıt: /tmp/tugra-build.log)"; }
ln -sfn "$KOK/releases/$SURUM" "$KOK/current"
chown -R coreoflife "$KOK"
tamam "sürüm $SURUM ($(git rev-parse --short HEAD))"

adim "5/9 Oyun servisi"
if [ ! -f "$ENVF" ]; then
  if [ "$RAM_MB" -lt 3500 ]; then SRC=deploy/coreoflife.env.small; else SRC=deploy/coreoflife.env.example; fi
  sed "s/GUCLU_PAROLA/$DBPW/" "$SRC" > "$ENVF"
  chmod 600 "$ENVF"
fi
cp deploy/coreoflife.service /etc/systemd/system/coreoflife.service
systemctl daemon-reload
systemctl enable coreoflife >/dev/null
systemctl restart coreoflife
for i in $(seq 1 30); do curl -fs http://127.0.0.1:8080/api/health >/dev/null && break; sleep 1; done
curl -fs http://127.0.0.1:8080/api/health >/dev/null || { journalctl -u coreoflife -n 40 --no-pager; hata "oyun sunucusu açılmadı"; }
tamam "oyun sunucusu çalışıyor: $(curl -fs http://127.0.0.1:8080/api/health)"

adim "6/9 Cloudflare Origin sertifikası"
mkdir -p "$SSL"; chmod 700 "$SSL"
pem_oku() { # $1 dosya, $2 bitiş satırı
  local satir; : > "$1"
  while IFS= read -r satir; do
    satir=${satir%$'\r'}
    [ -z "$satir" ] && [ ! -s "$1" ] && continue
    printf '%s\n' "$satir" >> "$1"
    [[ "$satir" == $2 ]] && break
  done < /dev/tty
}
if [ -s "$SSL/origin.pem" ] && [ -s "$SSL/origin.key" ]; then
  tamam "sertifika zaten var"
else
  echo "  Cloudflare → SSL/TLS → Origin Server → Create Certificate (RSA, 15 yıl, tugraonline.net ve *.tugraonline.net)."
  echo "  'Origin Certificate' kutusundaki metnin TAMAMINI buraya yapıştır (-----END CERTIFICATE----- satırında kendisi durur):"
  pem_oku "$SSL/origin.pem" '-----END CERTIFICATE-----'
  openssl x509 -in "$SSL/origin.pem" -noout 2>/dev/null || { rm -f "$SSL/origin.pem"; hata "sertifika okunamadı; betiği yeniden çalıştırıp tekrar yapıştır"; }
  echo "  Şimdi 'Private Key' kutusundaki metnin TAMAMINI yapıştır (-----END PRIVATE KEY----- satırında durur):"
  pem_oku "$SSL/origin.key" '-----END*PRIVATE KEY-----'
  chmod 600 "$SSL/origin.key"
  a=$(openssl x509 -in "$SSL/origin.pem" -noout -pubkey 2>/dev/null | sha256sum)
  b=$(openssl pkey -in "$SSL/origin.key" -pubout 2>/dev/null | sha256sum)
  [ "$a" = "$b" ] || { rm -f "$SSL/origin.pem" "$SSL/origin.key"; hata "anahtar sertifikayla eşleşmedi; ikisini de aynı sayfadan tekrar yapıştır"; }
  clear || true
  tamam "sertifika kaydedildi ($(openssl x509 -in "$SSL/origin.pem" -noout -enddate | cut -d= -f2) tarihine kadar)"
fi

adim "7/9 nginx (gerçek oyuncu IP'si + HTTPS + WebSocket)"
bash deploy/cloudflare-realip.sh
cp deploy/nginx-cloudflare.conf /etc/nginx/sites-available/coreoflife
ln -sf /etc/nginx/sites-available/coreoflife /etc/nginx/sites-enabled/coreoflife
rm -f /etc/nginx/sites-enabled/default
nginx -t 2>&1 | tail -1
systemctl reload nginx
tamam "nginx hazır"

adim "8/9 Güvenlik duvarı ve günlük yedek"
ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw --force enable >/dev/null
mkdir -p /var/backups && chown postgres /var/backups
echo "15 4 * * * postgres pg_dump -Fc coreoflife > /var/backups/coreoflife-\$(date +\%F).dump && find /var/backups -name 'coreoflife-*.dump' -mtime +14 -delete" > /etc/cron.d/coreoflife-backup
install -m 755 deploy/tugra.sh /usr/local/bin/tugra
tamam "yalnız 22, 80, 443 açık; her gece 04:15 yedek; 'tugra' yönetim komutu kuruldu"

adim "9/9 Dış kontrol"
if curl -fsk --resolve "$ALAN:443:127.0.0.1" "https://$ALAN/api/health" >/dev/null; then tamam "https://$ALAN sunucuda yanıt veriyor"; else echo "  ! nginx üzerinden yanıt alınamadı: journalctl -u nginx"; fi

printf '\n\033[1;32mKurulum bitti.\033[0m '
cat <<EOF
Sıradaki adımlar:
  1) https://$ALAN adresinden kendine bir hesap aç.
  2) Kendini kurucu (owner) yap:      tugra yonetici KULLANICI_ADIN
  3) Oyunu herkese aç:                tugra ac
  Diğer komutlar:  tugra durum | tugra kapat | tugra bakim "mesaj" | tugra guncelle | tugra yedek | tugra kayit
EOF
