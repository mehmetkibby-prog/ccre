# VDS Kurulumu (Ubuntu 24.04)

## Hızlı kurulum (önerilen): tek komut
Önce Cloudflare'de DNS kayıtlarını aç (`A @` ve `A www` → VDS IP'si, turuncu bulut açık; SSL/TLS → **Full (strict)**).
Sonra sunucuya root olarak bağlanıp:
```bash
curl -fsSLo kur.sh https://raw.githubusercontent.com/mehmetkibby-prog/ccre/tugra-online/deploy/kur.sh && bash kur.sh
```
Betik takas alanı, paketler, veritabanı (rastgele parola), derleme, servis, nginx, gerçek IP, güvenlik duvarı ve gece yedeğini kurar.
Bir yerde Cloudflare Origin sertifikasını ve anahtarını yapıştırmanı ister (Cloudflare → SSL/TLS → Origin Server → Create Certificate).
Bitince:
```bash
tugra yonetici KULLANICI_ADIN
```
```bash
tugra ac
```
Diğer komutlar: `tugra durum`, `tugra kapat`, `tugra bakim "mesaj"`, `tugra guncelle` (yedek alır, derler, açılmazsa eskiye döner), `tugra geri`, `tugra yedek`, `tugra kayit`.

---
Aşağısı elle kurulum içindir (betiğin yaptığı adımlar). Komutları sırayla, root olarak çalıştır.

## 0. Küçük sunucu (2 çekirdek / 2 GB RAM) notları
- Derleme (`npm run build`) 2 GB RAM'de bellek yetmezliğine düşebilir: önce 2 GB takas alanı aç.
```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
```
- 4. adımda `coreoflife.env.example` yerine `coreoflife.env.small` kopyala (1 kanal, 120 oyuncu, Node 900 MB).
- PostgreSQL ayarı (2 GB RAM): `shared_buffers = 256MB`, `effective_cache_size = 768MB`, `max_connections = 30`.

## 1. Paketler
```bash
apt update && apt install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx
```
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
```

## 2. Veritabanı
```bash
sudo -u postgres psql -c "CREATE USER coreoflife WITH PASSWORD 'GUCLU_PAROLA';"
```
```bash
sudo -u postgres psql -c "CREATE DATABASE coreoflife OWNER coreoflife;"
```
PostgreSQL ayarı (8 GB RAM için): `/etc/postgresql/16/main/postgresql.conf` içinde
`shared_buffers = 1GB`, `effective_cache_size = 3GB`, `synchronous_commit = on`, `max_connections = 60`.
```bash
systemctl restart postgresql
```

## 3. Kullanıcı ve kod
```bash
useradd -r -m -d /opt/coreoflife coreoflife
```
```bash
mkdir -p /opt/coreoflife/releases && cd /opt/coreoflife/releases && git clone -b tugra-online https://github.com/mehmetkibby-prog/ccre r1
```
```bash
cd /opt/coreoflife/releases/r1 && npm ci && npm run build
```
```bash
ln -sfn /opt/coreoflife/releases/r1 /opt/coreoflife/current && chown -R coreoflife /opt/coreoflife
```

## 4. Ortam ve servis
```bash
cp /opt/coreoflife/current/deploy/coreoflife.env.small /etc/coreoflife.env && nano /etc/coreoflife.env
```
```bash
chmod 600 /etc/coreoflife.env
```
```bash
cp /opt/coreoflife/current/deploy/coreoflife.service /etc/systemd/system/ && systemctl daemon-reload && systemctl enable --now coreoflife
```
Sunucu açılışta veritabanı göçlerini kendisi uygular.

## 5. Nginx + HTTPS
```bash
cp /opt/coreoflife/current/deploy/nginx.conf /etc/nginx/sites-available/coreoflife && ln -sf /etc/nginx/sites-available/coreoflife /etc/nginx/sites-enabled/
```
```bash
certbot certonly --nginx -d ALAN_ADIN.com && nginx -t && systemctl reload nginx
```

## 5b. Cloudflare arkasında (önerilen; 5. adımın yerine)
Cloudflare panelinde: DNS → `A` kaydı (`@` ve `www`, VDS IP'si, turuncu bulut açık) · SSL/TLS → **Full (strict)** ·
SSL/TLS → Origin Server → **Create Certificate** (15 yıl). Çıkan iki metni VDS'e kaydet:
```bash
mkdir -p /etc/ssl/cloudflare && nano /etc/ssl/cloudflare/origin.pem
```
```bash
nano /etc/ssl/cloudflare/origin.key && chmod 600 /etc/ssl/cloudflare/origin.key
```
Gerçek oyuncu IP'si (yoksa herkes Cloudflare IP'sinden geliyor görünür; IP sınırları herkesi birden engeller):
```bash
bash /opt/coreoflife/current/deploy/cloudflare-realip.sh
```
```bash
cp /opt/coreoflife/current/deploy/nginx-cloudflare.conf /etc/nginx/sites-available/coreoflife
```
```bash
ln -sf /etc/nginx/sites-available/coreoflife /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl reload nginx
```
Güvenlik duvarı:
```bash
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

## 6. Sağlık kontrolü
```bash
curl -s http://127.0.0.1:8080/api/health
```
```bash
journalctl -u coreoflife -n 100 --no-pager
```

## Güncelleme (sıfır veri kaybı)
Önce yedek al, sonra yeni sürümü ayrı klasöre kur ve bağlantıyı değiştir. `systemctl restart` herkesin son durumunu kaydederek kapanır.
```bash
sudo -u postgres pg_dump -Fc coreoflife > /var/backups/coreoflife-$(date +%F-%H%M).dump
```
```bash
cd /opt/coreoflife/releases && git clone -b tugra-online https://github.com/mehmetkibby-prog/ccre r2 && cd r2 && npm ci && npm run build
```
```bash
ln -sfn /opt/coreoflife/releases/r2 /opt/coreoflife/current && systemctl restart coreoflife
```
Geri dönüş (kod): bağlantıyı eski klasöre çevirip yeniden başlat. Veritabanını eski tarihe döndürmek rutin geri dönüş değildir; ayrıca onaylanması gereken bir geri yükleme işlemidir.
```bash
ln -sfn /opt/coreoflife/releases/r1 /opt/coreoflife/current && systemctl restart coreoflife
```

## Günlük yedek (cron)
```bash
echo "15 4 * * * postgres pg_dump -Fc coreoflife > /var/backups/coreoflife-\$(date +\%F).dump && find /var/backups -name 'coreoflife-*.dump' -mtime +14 -delete" > /etc/cron.d/coreoflife-backup
```
Geri yükleme testi (ayrı veritabanına):
```bash
sudo -u postgres createdb coreoflife_restore_test && sudo -u postgres pg_restore -d coreoflife_restore_test /var/backups/DOSYA.dump
```

## Açılış / bakım
Yönetici hesabıyla `POST /api/admin/opening` (mod: closed / scheduled / open / maintenance). Yeniden başlatma bu kararı değiştirmez.
Canlı ölçümler: `GET /api/admin/metrics` (kanal tick p50/p95/p99, ELU, kayıt kuyruğu, event-loop gecikmesi).
