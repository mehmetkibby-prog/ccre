# R114 taslak devir — 13 Kasım 2026

Dal: `codex/r114-rune-forum`, taban R113 `9da665d`.
Kullanıcı R114 için iki rün haritasındaki yürüme engellerinin kaldırılmasını
ve `coreoflife.net/forum` taslağını istedi. **Taslağı inceleyip sonra
güncelleyeceğini belirtti. Canlı yayın veya kurulum yapılmadı.**

Aktif oyun ağacı yine `project/r109_latency_completion/working`.
R114 artık bu ağaca yalnız rün geometrisi ve yeni içerik adresli istemci/portal
ekler. R113 performans çalışmalarını korur. Önceki yedi maddelik mimari plan
bu işte uygulanmadı. Canlı R113 kurulumu henüz kullanıcı tarafından teyit
edilmedi; yeni kurucu hazırlamadan kaynak sürüm doğrulanmalı.

Çalışma: `project/r114_rune_forum/README.md`.

- Kadim Rün Sahili / Karanlık Rün Sahili: kıyı ve iç engeller kaldırıldı;
  dünya sınırı ve diğer hareket/giriş korumaları korunuyor. Bağımsız commit.
- Forum: ayrı SQLite + ayrı Node servisi, yöneticiye özel duyurular,
  oyuncu bölümleri, kayıt/giriş, PNG CAPTCHA, konu/yanıt ve moderasyon.
- `delivery/r114-forum-taslak.html` tüm varlıkları içinde taşıyan, yalnız
  örnek içerikle gezilen taslak. İndirilen HTML gerçek hesap oluşturmaz.
- Yerel gerçek servis `forum/server.mjs --demo` ile çalışır; varsayılan
  admin parolası yok. Kayıt herkese yalnız member rolü verir.
- Görseller ve doğrulama sonuçları `evidence/` içinde. Test veritabanları
  `/tmp` altındadır; repoya veya teslim dosyalarına eklenmez.
- `evidence/game-regressions.json` odaklı/native/captcha/R110 kontrol çıkışları;
  R110 testleri tarihsel kurucuya aittir, R114 kurulum doğrulaması değildir.
- Yeni yük testi yapılmadı. Nüfus testi gerektiğinde kullanıcı yalnız 50 ister.

Yayın öncesi: tasarım onayı, e-posta doğrulama/parola kurtarma akışı,
üretim admin ve TLS/ters vekil/DB yedek düzeni, R114 kurucu/geri dönüş ve
iki sunucunun yeni istemci grafiğiyle gerçek giriş testleri. Ayrıntılar README.
