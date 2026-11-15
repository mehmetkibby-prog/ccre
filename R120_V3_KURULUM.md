# R120 — Depo, canavar animasyonları ve 2D adresi

Tam R118_ROYAL1 veya R119_MOTION1 üzerine uygulanır; Efsane ve Akademi birlikte.
R119 Kuzey Ormanı tarzı Şampiyonlar Diyarı animasyonlarını da içerir.
Veritabanı, eşya, ödül, kapasite ve savaş kuralları değiştirilmez.
Depodaki bölüm düğmeleri en üstte görünür ve kaydırırken erişilebilir kalır.

## Kurulumdan önce

- Yalnız `2d` A kaydı `45.84.191.223`, proxy açık olmalı. Kullanıcı bunu ekledi.
- Kullanıcı ana DNS'i 3D'ye taşıdığını bildirdi. Bu kurucu apex/www DNS'ini
  değiştirmez; 2D VDS'indeki eski host kurallarını korur. `2d` A kaydı ayrı
  olarak 45.84.191.223 üzerinde kalmalıdır.
- Canlı ekranında Cloudflare **Full**, otomatik mod açık. Bölge ayarı değiştirilmez.
- Caddy mevcut apex sertifikasını otomatik yönetiyor. Bu üçüncü kurucu sürümü
  (`R120_2D_DEPOT3`) aynı yönetimle 2d için ayrı sertifika aldırır. Private key
  oluşturup sohbete taşıma veya elle wildcard sertifika ekleme gerekmez.
- Cloudflare yönlendirme/Worker/kural envanteri hâlâ incelenmeli.

## Kurulum — üçüncü kurucu sürümü

1. `r120-2d-depo-v3.zip` dosyasının yayınlanan SHA256 değerini doğrulayın.
2. `python3 /root/r120-2d-depo-v3.zip --check-web`
   Bu adım ayar değiştirmez; kurulu sürümü, Caddy yapılandırmasını ve DNS'i inceler.
3. Efsane panelinden bakımı başlatın; geri sayımı bekleyin. Caddy ayar yenilemesi
   açık WebSocket bağlantılarını yeniden kurabileceği için web hazırlığı da
   aynı bakım aralığında yapılır. Akademi'nin kapalı/ön kayıt ayarı korunur.
4. `python3 /root/r120-2d-depo-v3.zip --prepare-web`
   Önce eski Caddy ayarını özel işlem kaydına alır; yalnız 2d eşlerini ekler.
   Sertifika/yerel HTTPS ve Cloudflare ana sayfa kontrolünü bekler (yaklaşık
   150 saniye sınırı + ağ isteği süreleri). Oyun servisleri bu adımda durdurulmaz.
   Eski apex ana sayfasını DNS kullanmadan, 2D VDS localhost üzerinden doğrular.
   Yerel TLS/sayfa hatasında eski Caddy ayarını geri yükler. **Yerel TLS geçmişken
   dış kontrol 403/525/yönlendirme/ağ hatası verirse çalışan 2d ayarını korur ve
   sıfır olmayan çıkış koduyla durur; oyun kurulumuna geçilmez.** Yeni `DIŞ ERİŞİM`
   satırı HTTP durumu, Server, CF-Ray, CF-Mitigated ve varsa yönlendirme hostunu
   gösterir; çerez/token/yanıt gövdesi yazdırılmaz. Dış yönlendirmeler izlenmez.
   Güvenlik/SSL kontrolleri kapatılmaz. Bu noktada çıktıyı paylaşın.
   `--check-public` yalnız okumadır; sorun giderilince `--prepare-web` tekrar
   çalıştırılır, aynı Caddy ayarı ikinci kez yüklenmez.
5. `python3 /root/r120-2d-depo-v3.zip --check`
6. Ön kontrol geçerse `python3 /root/r120-2d-depo-v3.zip --apply`
7. R120 TAMAMLANDI mesajı yerel sertifikalı HTTPS ve sekiz kanal kontrolüdür.
   Cloudflare üzerinden mobil/masaüstü uçtan uca testin yerini tutmaz.
8. Efsane bakımını kaldırın. Apex DNS kullanıcı tarafından zaten değiştirildiği
   için canlı 2D kontrol listesini ve sıfır apex/www isteği kontrolünü tamamlayın.
   Henüz tam canlı kabul yapılmış sayılmaz.

Bu sürümün oyun dosyaları ilk R120 paketiyle birebir aynıdır. Değişiklik,
dış kontrol hatasında doğrulanmış TLS ayarını koruyan web hazırlığı ve kurucudadır.
Eski R120 ZIP/SHA256 ve R118/R119 paketleri değiştirilmemiştir.

Kurucu sadece var olan apex yollarının 2d eşini ekler. Eski host yolları kalır.
Hesap/oyun hostlarına ve realtime servislerine yeni Origin eklenir. Forum ve
ana site bağlantıları yenilenir. Ayar ve değişen kod yedekleri işlem günlüğündedir.
Ana DNS, e-posta DNS, Cloudflare bölge ayarları veya 3D VDS değiştirilmez.

## Geri dönüş

- Ana kurulumda kesinti: aynı **v3 ZIP** ile `--status`; bekleyen v3 varsa `--recover`.
- Ana kurulumdan sonra bakımda `--rollback`, önceki oyun/ana site/forum/Origin
  ayarlarına döner. Hazırlıkta eklenmiş 2d web eşleri yerinde kalır.
- Web hazırlığında elektrik/komut kesintisi veya hazırlığın tamamını geri alma:
  bakımdayken `--rollback-web`. Ana v3 kurulmuşsa önce `--rollback` yapılmalıdır.
  Web geri dönüşü kaydedilmiş eski Caddy dosyasını ve çalışan ayarı geri getirir.
  Bu, yeni 2d hostunu kaldırabilir; yalnız dış kontrol hatası nedeniyle geri
  dönüş çalıştırmayın. V3 bu durumda TLS'i koruyup kurulum kapısını kapalı tutar.
  Arada dışarıdan bir ayar değiştirilmişse üstüne yazmaz, inceleme için durur.
- `--check-web` sırasında dosya/çalışan ayar farklı denirse hazırlık yarım
  kalmış olabilir; tekrar zorlamak yerine aynı v3 ile `--rollback-web` kullanın.

Oyuncu ve forum veritabanı geri alınmaz, ilerleme silinmez. DNS değiştirilmez.

V2'nin `R120_WEB2` hazırlık günlüğü aynı biçim/hash kontrolleriyle okunur; canlıdaki
`rolled-back` durumundan devam edebilir. Oyun ve forum payload'ı v1/v2 ile aynıdır.
Önceki ZIP ve SHA256 değerleri değiştirilmemiştir.
