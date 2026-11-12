# Devir kopyasının doğrulaması — 12 Kasım 2026

Bu turda oyun davranışı değiştirilmedi. R109'un 2.054 runtime dosyası ve ZIP
SHA256'sı orijinal ile aynı. Yeni çalışmalar yalnız inceleme klasörü, taşınabilir
test araçları, bağımlılık kilidi ve belgelerdir. Canlı VDS'ye kurulum yapılmadı.

| Kopyadan çalıştırılan kontrol | Sonuç |
|---|---|
| R109 odaklı regresyonlar | 54/54 geçti |
| Captcha: kayıt, oyun, çökme/yeniden üretim ve işlem sınırları | 20/20 geçti |
| Native zindan/kule/ticaret/depo/ödül/sahiplik | 29/29 geçti |
| Kurulum, kesinti ve geri dönüş | 26/26 geçti |
| Taşınmış gerçek servis girişi, iki realm/sekiz kanal ve captcha | 2/2 geçti |
| Efsane PC tarayıcı girişi/HUD/kule/bağlantı yenileme | Geçti; eksik varlık veya native hata yok |
| Akademi mobil tarayıcı girişi/HUD/kule/bağlantı yenileme | Geçti; eksik varlık veya native hata yok |
| Ham CPU profili yeniden analizi | Çalıştı, orijinal profil SHA256 korundu |
| 10 bot, 10 saniye, karma harita yük aracı çalışırlık kontrolü | İşlev geçti; son olay/ödül kapanışı tamamlandı |

Ham yeni devir kontrolü günlükleri `../validation/` altında. Tarihsel performans
kanıtları `project/r109_latency_completion/evidence` ve `delivery` içinde kalır.
Bu test geçişleri gecikme sorunlarının çözüldüğü veya canlı kapasitenin kanıtlandığı
anlamına gelmez; mevcut R109 kodunun inceleme kopyasında çalıştığını doğrular.
Kısa yük aracı kontrolünde de bir kanalda 51.37 ms duraklama görüldü; bu sonuç
saklandı. 10 saniyelik koşu yeni bir kapasite/performans kabul testi değildir.

İlk taşınabilirlik denemesinde `livekit-server-sdk` bağımlılığı ve eski bir testin
`client-build.json` girdisi eksikti. Bunlar eklendikten sonra ilgili tam gruplar
tekrar çalıştırılıp geçti. Üretim HTTP adaptörü de Vinext 0.0.50 olarak kilitlendi
ve özgün SHA256 doğrulaması korundu. Oyun kodunda geçici hata bastırma yapılmadı.

Statik tarama 863 modülde sözdizimi hatası bulmadı. Eski V510 üç kanallı uygulamanın
aktif olmayan `channel-compute-worker` dosyası, elde bulunmayan eski
`dist-vds/server/channel-logic/index.mjs` dosyasını referanslıyor. R109 bu girişten
çalışmaz; `delivery511/runtime-entry.mjs` ve dört gerçek Core511 kanalı yukarıda
başarıyla başlatıldı. Kopyadaki özgün TSX/SSRender arşivi sınırları README'de yazılı.

Gerçek oyuncu SQLite dosyaları, ortam anahtarları, özel anahtar dosyaları ve
node_modules içerikleri eklenmedi. Bağımlılıklar kilitli npm girdilerinden kurulur;
yerel oyun/test verisi fikstürlerden üretilir. İncelemede sentetik test parolaları
görülebilir; bunlar gerçek kullanıcı hesapları değildir.
