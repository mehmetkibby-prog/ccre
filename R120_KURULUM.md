# R120 — Depo, canavar animasyonları ve 2D adresi

Tam R118_ROYAL1 veya R119_MOTION1 üzerine uygulanır; Efsane ve Akademi birlikte.
R119 Kuzey Ormanı tarzı Şampiyonlar Diyarı animasyonlarını da içerir.
Veritabanı, eşya, ödül, kapasite ve savaş kuralları değiştirilmez.
Depodaki bölüm düğmeleri en üstte görünür ve kaydırırken erişilebilir kalır.

## Kurulumdan önce

- Yalnız `2d` A kaydını `45.84.191.223`, proxy açık olarak ekleyin.
- `coreoflife.net` ve `www` hâlâ 2D VDS'inde kalmalıdır. DNS kesimi yapılmaz.
- Caddy'ye `2d.coreoflife.net` veya `*.coreoflife.net` kapsayan geçerli sertifika
  eklenmiş olmalıdır. Mevcut apex sertifikası korunur. Sertifika hazır değilse
  kurucu hizmetleri durdurmadan reddeder. Özel anahtarı sohbet/GitHub'a koymayın.
- Canlı salt okunur kontrol çıktısı ve Cloudflare SSL/kural envanteri incelenmelidir.
- Proxy açık Origin Certificate için 2D host TLS modu Full (strict) olarak korunur.
  3D için yalnız apex/www'ye Full kuralı, kullanıcı incelemesinden sonra uygulanır.

## Kurulum

1. Yeni ZIP'in yayınlanan SHA256 değerini doğrulayın.
2. `python3 /root/r120-2d-depo.zip --check`
3. Ön kontrol başarılıysa Efsane panelinden bakımı başlatın; geri sayımı bekleyin.
4. `python3 /root/r120-2d-depo.zip --apply`
5. R120 TAMAMLANDI mesajı yerel sertifikalı HTTPS ve sekiz kanal kontrolüdür.
   Cloudflare üzerinden mobil/masaüstü uçtan uca testin yerini tutmaz.
6. Efsane bakımını kaldırın; Akademi'nin mevcut kapalı/ön kayıt ayarı korunur.
7. Canlı 2D kontrol listesi eksiksiz geçmeden apex/www DNS'ini taşımayın.

Kurucu sadece var olan apex yollarının 2d eşini ekler. Eski host yolları kalır.
Hesap/oyun hostlarına ve realtime servislerine yeni Origin eklenir. Forum ve
ana site bağlantıları yenilenir. Ayar ve değişen kod yedekleri işlem günlüğündedir.
Ana DNS, e-posta DNS, Cloudflare bölge ayarları veya 3D VDS değiştirilmez.

## Geri dönüş

Kesintide aynı ZIP ile `--status`; bekleyen R120 varsa `--recover`.
Bakımda `--rollback`, önceki oyun/ana site/forum/Caddy/Origin ayarlarına döner.
Oyuncu ve forum veritabanını geri almaz, ilerlemeyi silmez. Eski ZIP'ler korunur.
