#!/usr/bin/env bash
# Tuğra Online sunucu yönetimi (kur.sh bunu /usr/local/bin/tugra olarak kurar). Root olarak çalıştır.
set -euo pipefail
KOK=/opt/coreoflife
psqlc() { sudo -u postgres psql -d coreoflife -v ON_ERROR_STOP=1 -qtA "$@"; }
yedek() { local f=/var/backups/coreoflife-$(date +%F-%H%M%S).dump; sudo -u postgres pg_dump -Fc coreoflife > "$f"; echo "yedek: $f ($(du -h "$f" | cut -f1))"; }
acilis() { # $1 mod, $2 mesaj
  psqlc -v mod="$1" -v msg="${2:-}" <<'SQL'
UPDATE server_state SET value = jsonb_build_object('mode', :'mod', 'openAt', NULL, 'message', :'msg'),
       revision = revision + 1, updated_at = now() WHERE key = 'opening';
SQL
  systemctl restart coreoflife   # durum açılışta okunur; kapanırken herkes kaydedilir
  echo "oyun durumu: $1"
}
case "${1:-}" in
  yonetici)
    [ -n "${2:-}" ] || { echo "kullanım: tugra yonetici KULLANICI_ADI"; exit 1; }
    n=$(echo "UPDATE accounts SET role='owner' WHERE username_norm=lower(:'u') RETURNING username;" | psqlc -v u="$2" | grep -c . || true)
    [ "$n" -gt 0 ] && echo "$2 artık kurucu (owner). Oyundan çıkıp yeniden gir." || echo "'$2' adlı hesap bulunamadı; önce sitede hesap aç."
    ;;
  ac) acilis open ;;
  kapat) acilis closed ;;
  bakim) acilis maintenance "${2:-Sunucu bakımda, kısa süre sonra döneceğiz.}" ;;
  durum)
    systemctl is-active coreoflife nginx postgresql | paste -sd' ' | sed 's/^/servisler (oyun nginx db): /'
    curl -fs http://127.0.0.1:8080/api/health && echo
    psqlc -c "SELECT 'açılış: ' || (value->>'mode') FROM server_state WHERE key='opening'"
    psqlc -c "SELECT 'hesap: ' || count(*) FROM accounts"
    echo "sürüm: $(readlink -f $KOK/current | xargs basename) ($(sudo -u coreoflife git -C $KOK/current rev-parse --short HEAD))"
    free -m | awk 'NR==2 {print "bellek: " $3 " / " $2 " MB"}'; df -h / | awk 'NR==2 {print "disk: " $3 " / " $2}'
    ;;
  guncelle)
    yedek
    eski=$(readlink -f $KOK/current)
    yeni=$KOK/releases/r$(date +%Y%m%d-%H%M%S)
    git clone -q --depth 1 -b tugra-online https://github.com/mehmetkibby-prog/ccre "$yeni"
    (cd "$yeni" && npm ci --no-audit --no-fund --loglevel=error && NODE_OPTIONS=--max-old-space-size=1536 npm run build >/tmp/tugra-build.log 2>&1) \
      || { tail -30 /tmp/tugra-build.log; rm -rf "$yeni"; echo "derleme başarısız; eski sürüm çalışmaya devam ediyor"; exit 1; }
    chown -R coreoflife "$yeni"; ln -sfn "$yeni" $KOK/current; systemctl restart coreoflife
    for i in $(seq 1 30); do curl -fs http://127.0.0.1:8080/api/health >/dev/null && break; sleep 1; done
    if curl -fs http://127.0.0.1:8080/api/health >/dev/null; then
      install -m 755 "$yeni/deploy/tugra.sh" /usr/local/bin/tugra   # yönetim komutu da güncellenir
      echo "güncellendi: $(basename "$yeni") ($(sudo -u coreoflife git -C "$yeni" rev-parse --short HEAD))"
      ls -1dt $KOK/releases/r* | tail -n +4 | xargs -r rm -rf   # son 3 sürüm kalır
    else
      echo "yeni sürüm açılmadı, eskisine dönülüyor"; ln -sfn "$eski" $KOK/current; systemctl restart coreoflife; exit 1
    fi
    ;;
  geri)
    onceki=$(ls -1dt $KOK/releases/r* | grep -vx "$(readlink -f $KOK/current)" | head -1)
    [ -n "$onceki" ] || { echo "dönülecek eski sürüm yok"; exit 1; }
    ln -sfn "$onceki" $KOK/current; systemctl restart coreoflife; echo "geri dönüldü: $(basename "$onceki")"
    ;;
  kapasite)
    [[ "${2:-}" =~ ^[0-9]+$ ]] || { echo "kullanım: tugra kapasite SAYI   (şu an: $(grep -E '^REALM_CAPACITY=' /etc/coreoflife.env | cut -d= -f2))"; exit 1; }
    sed -i -E "s/^(CHANNEL_CAPACITY|REALM_CAPACITY)=.*/\1=$2/" /etc/coreoflife.env
    grep -q '^REALM_CAPACITY=' /etc/coreoflife.env || echo "REALM_CAPACITY=$2" >> /etc/coreoflife.env
    grep -q '^CHANNEL_CAPACITY=' /etc/coreoflife.env || echo "CHANNEL_CAPACITY=$2" >> /etc/coreoflife.env
    systemctl restart coreoflife; echo "oyuncu sınırı: $2 (oyun yeniden başlatıldı)"
    ;;
  yedek) yedek ;;
  kayit) journalctl -u coreoflife -n "${2:-100}" --no-pager ;;
  alan)
    # Oyunu yeni bir alan adına taşır (ör. coreoflife.net). Eski adres (tugraonline.net) yeni adrese yönlenir.
    yeni="${2:-}"
    [[ "$yeni" =~ ^[a-z0-9-]+(\.[a-z0-9-]+)+$ ]] || { echo "kullanım: tugra alan coreoflife.net"; exit 1; }
    site=/etc/nginx/sites-available/coreoflife; SSLD=/etc/ssl/cloudflare
    eski=$(grep -oP 'server_name \K[a-z0-9.-]+' "$site" | grep -v '^www\.' | grep -vx "$yeni" | head -1 || true)
    pem=$SSLD/$yeni.pem; key=$SSLD/$yeni.key
    if [ ! -s "$pem" ] || [ ! -s "$key" ]; then
      # Cloudflare'in "Full" SSL modu için sunucuya özel sertifika (tarayıcı Cloudflare'in sertifikasını görür)
      openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj "/CN=$yeni" -addext "subjectAltName=DNS:$yeni,DNS:www.$yeni" -keyout "$key" -out "$pem" 2>/dev/null
      chmod 600 "$key"; echo "sunucu sertifikası üretildi: $pem (Cloudflare'de $yeni için SSL/TLS modu 'Full' olmalı)"
    fi
    cp "$site" "$site.yedek-$(date +%F-%H%M%S)"
    {
      echo "# tugra alan $yeni ile üretildi ($(date +%F))"
      echo "server { listen 80; listen [::]:80; server_name $yeni www.$yeni; return 301 https://$yeni\$request_uri; }"
      echo "server {"
      echo "    listen 443 ssl http2; listen [::]:443 ssl http2;"
      echo "    server_name $yeni www.$yeni;"
      echo "    ssl_certificate $pem; ssl_certificate_key $key;"
      echo "    client_max_body_size 64k;"
      echo "    if (\$host = www.$yeni) { return 301 https://$yeni\$request_uri; }"
      echo "    location /ws { proxy_pass http://127.0.0.1:8080; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection \"upgrade\"; proxy_set_header X-Real-IP \$remote_addr; proxy_read_timeout 3600s; proxy_buffering off; tcp_nodelay on; }"
      echo "    location / { proxy_pass http://127.0.0.1:8080; proxy_http_version 1.1; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; gzip on; gzip_types text/css application/javascript application/json; }"
      echo "}"
      if [ -n "$eski" ] && [ -s "$SSLD/origin.pem" ]; then
        echo "# eski adres: her şey yeni adrese yönlenir (yer imleri ve ana ekrana eklenenler kaybolmaz)"
        echo "server { listen 80; listen [::]:80; server_name $eski www.$eski; return 301 https://$yeni\$request_uri; }"
        echo "server { listen 443 ssl http2; listen [::]:443 ssl http2; server_name $eski www.$eski; ssl_certificate $SSLD/origin.pem; ssl_certificate_key $SSLD/origin.key; return 301 https://$yeni\$request_uri; }"
      fi
    } > "$site.yeni"
    mv "$site.yeni" "$site"
    if nginx -t 2>/dev/null; then systemctl reload nginx; echo "tamam: oyun artık https://$yeni adresinde${eski:+, $eski → $yeni yönleniyor}"
    else nginx -t; cp "$(ls -1t $site.yedek-* | head -1)" "$site"; systemctl reload nginx; echo "nginx ayarı hatalı, eski ayara dönüldü"; exit 1; fi
    ;;
  *) echo "kullanım: tugra {durum|yonetici AD|ac|kapat|bakim [mesaj]|kapasite SAYI|guncelle|geri|yedek|kayit [satır]|alan ALAN_ADI}"; exit 1 ;;
esac
