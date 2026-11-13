#!/usr/bin/env bash
# Cloudflare arkasında nginx'in oyuncunun gerçek IP'sini (CF-Connecting-IP) görmesi için ayar üretir.
# Yalnız Cloudflare'in IP aralıklarından gelen başlığa güvenilir; aralıklar Cloudflare'den o an çekilir.
# Kullanım (root): bash deploy/cloudflare-realip.sh && nginx -t && systemctl reload nginx
set -euo pipefail
out=/etc/nginx/conf.d/cloudflare-realip.conf
tmp=$(mktemp)
{
  echo "# $(date -u +%F) tarihinde https://www.cloudflare.com/ips/ adresinden üretildi"
  for ip in $(curl -fsS https://www.cloudflare.com/ips-v4) $(curl -fsS https://www.cloudflare.com/ips-v6); do echo "set_real_ip_from $ip;"; done
  echo "real_ip_header CF-Connecting-IP;"
} > "$tmp"
grep -q set_real_ip_from "$tmp" || { echo "Cloudflare IP listesi alınamadı" >&2; exit 1; }
install -m 644 "$tmp" "$out" && rm -f "$tmp"
echo "yazıldı: $out ($(grep -c set_real_ip_from "$out") aralık)"
