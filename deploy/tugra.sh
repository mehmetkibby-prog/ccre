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
    echo "sürüm: $(readlink -f $KOK/current | xargs basename) ($(git -C $KOK/current rev-parse --short HEAD))"
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
      echo "güncellendi: $(basename "$yeni") ($(git -C "$yeni" rev-parse --short HEAD))"
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
  yedek) yedek ;;
  kayit) journalctl -u coreoflife -n "${2:-100}" --no-pager ;;
  *) echo "kullanım: tugra {durum|yonetici AD|ac|kapat|bakim [mesaj]|guncelle|geri|yedek|kayit [satır]}"; exit 1 ;;
esac
