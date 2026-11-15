# R120 — Depo, canavar animasyonları ve 2D adresi

Tam R118_ROYAL1 veya R119_MOTION1 üzerine uygulanır; Efsane ve Akademi birlikte.
R119 Kuzey Ormanı tarzı Şampiyonlar Diyarı animasyonlarını da içerir.
Veritabanı, eşya, ödül, kapasite ve savaş kuralları değiştirilmez.
Depodaki bölüm düğmeleri en üstte görünür ve kaydırırken erişilebilir kalır.

## Kurulumdan önce

- Yalnız `2d` A kaydı `45.84.191.223`, proxy açık olmalı. Kullanıcı bunu ekledi.
- `coreoflife.net` ve `www` hâlâ 2D VDS'inde kalmalı; DNS kesimi yapılmaz.
- Canlı ekranında Cloudflare **Full**, otomatik mod açık. Bölge ayarı değiştirilmez.
- Caddy mevcut apex sertifikasını otomatik yönetiyor. Bu ikinci kurucu sürümü
  (`R120_2D_DEPOT2`) aynı yönetimle 2d için ayrı sertifika aldırır. Private key
  oluşturup sohbete taşıma veya elle wildcard sertifika ekleme gerekmez.
- Cloudflare yönlendirme/Worker/kural envanteri hâlâ incelenmeli.

## Kurulum — ikinci kurucu sürümü

1. `r120-2d-depo-v2.zip` dosyasının yayınlanan SHA256 değerini doğrulayın.
2. `python3 /root/r120-2d-depo-v2.zip --check-web`
   Bu adım ayar değiştirmez; kurulu sürümü, Caddy yapılandırmasını ve DNS'i inceler.
3. Efsane panelinden bakımı başlatın; geri sayımı bekleyin. Caddy ayar yenilemesi
   açık WebSocket bağlantılarını yeniden kurabileceği için web hazırlığı da
   aynı bakım aralığında yapılır. Akademi'nin kapalı/ön kayıt ayarı korunur.
4. `python3 /root/r120-2d-depo-v2.zip --prepare-web`
   Önce eski Caddy ayarını özel işlem kaydına alır; yalnız 2d eşlerini ekler.
   Sertifika/yerel HTTPS ve Cloudflare ana sayfa kontrolünü bekler (yaklaşık
   150 saniye sınırı + ağ isteği süreleri). Oyun servisleri bu adımda durdurulmaz.
   Eski apex ana sayfasının aynı kaldığını doğrular. Hata olursa eski Caddy
   ayarını geri yükler; ana güncellemeye geçilmez.
5. `python3 /root/r120-2d-depo-v2.zip --check`
6. Ön kontrol geçerse `python3 /root/r120-2d-depo-v2.zip --apply`
7. R120 TAMAMLANDI mesajı yerel sertifikalı HTTPS ve sekiz kanal kontrolüdür.
   Cloudflare üzerinden mobil/masaüstü uçtan uca testin yerini tutmaz.
8. Efsane bakımını kaldırın. Canlı 2D kontrol listesi eksiksiz geçmeden
   apex/www DNS'ini taşımayın.

Bu sürümün oyun dosyaları ilk R120 paketiyle birebir aynıdır. Değişiklik,
mevcut otomatik sertifika düzenine uygun web hazırlığı ve kurucudadır.
Eski R120 ZIP/SHA256 ve R118/R119 paketleri değiştirilmemiştir.

Kurucu sadece var olan apex yollarının 2d eşini ekler. Eski host yolları kalır.
Hesap/oyun hostlarına ve realtime servislerine yeni Origin eklenir. Forum ve
ana site bağlantıları yenilenir. Ayar ve değişen kod yedekleri işlem günlüğündedir.
Ana DNS, e-posta DNS, Cloudflare bölge ayarları veya 3D VDS değiştirilmez.

## Geri dönüş

- Ana kurulumda kesinti: aynı **v2 ZIP** ile `--status`; bekleyen v2 varsa `--recover`.
- Ana kurulumdan sonra bakımda `--rollback`, önceki oyun/ana site/forum/Origin
  ayarlarına döner. Hazırlıkta eklenmiş 2d web eşleri yerinde kalır.
- Web hazırlığında elektrik/komut kesintisi veya hazırlığın tamamını geri alma:
  bakımdayken `--rollback-web`. Ana v2 kurulmuşsa önce `--rollback` yapılmalıdır.
  Web geri dönüşü kaydedilmiş eski Caddy dosyasını ve çalışan ayarı geri getirir.
  Arada dışarıdan bir ayar değiştirilmişse üstüne yazmaz, inceleme için durur.
- `--check-web` sırasında dosya/çalışan ayar farklı denirse hazırlık yarım
  kalmış olabilir; tekrar zorlamak yerine aynı v2 ile `--rollback-web` kullanın.

Oyuncu ve forum veritabanı geri alınmaz, ilerleme silinmez. DNS değiştirilmez.
