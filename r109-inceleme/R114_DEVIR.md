# R114 devir — 13 Kasım 2026

Dal: `codex/r114-rune-forum`, taban son R113 `9da665d`.
Kullanıcı forum taslağını **“Onayladım hadi”** diyerek onayladı.
Çalışma: `project/r114_rune_forum/README.md`; VDS adımları `KURULUM.md`.

Aktif oyun ağacı: `project/r109_latency_completion/working`.
İçerik: R113 + yalnız rün geometrisi, yeni içerik adresli oyun/portal,
R114 sağlık işareti. Önceki yedi maddelik büyük mimari plan uygulanmadı.

Efsane'nin canlı sağlık yanıtında **R113_ENGINE1 / engineReadyR113=true**
görüldü. Yeni kurucu kaynak sürümü **R113_ENGINE1** ve tam dosya kimliğidir.
Akademi aynı kaynağı kullanmalı; kurucu her iki realm'i doğrular. Eski R110
kaynaklı kurucular bu yeni R114 yerine kullanılmaz. R114 burada canlıya
kurulmadı; VDS erişimi yok. Paket kullanıcıya verilir, Drive linkinden kısa
SHA256 doğrulamalı `--check` / bakım sonrası `--apply` komutları hazırlanır.
Eski ZIP'ler ve SHA değerleri değiştirilmez.

Forum: ayrı servis + DB + CAPTCHA worker; yalnız adminin yazdığı resmî
bölümler ve oyuncu bölümleri; üyelik, kurtarma anahtarı, konu/yanıt,
moderasyon, günlük doğrulanmış yedek. Gerçek yayın Caddy üzerinden
`https://coreoflife.net/forum`; ana siteye menü bağlantısı eklenir.
Demo örnekleri üretime taşınmaz. Admin kullanıcısı ZIP'in `--forum-admin`
komutuyla yerelde gizli parolayla oluşturulur. Forum hesabı oyundan ayrıdır.

Oyun DB/şeması değişmez. Kurucu önceki kodu/ayarları doğrulayarak yedekler;
başarısızlıkta eski sürüme döner. Forum üyeleri/yazıları geri dönüşte silinmez.
İki realm/sekiz kanal ve forum HTTPS açılışı doğrulanmadan başarı göstermez.
Kaynak farklıysa başlamadan durur. R113 performans, ödül, sahiplik,
kalıcılık ve bakım/ön kayıt korumaları korunur.

Son paket/kanıt: `project/r114_rune_forum/evidence/package.json`,
`verification-release.json`, `release-regressions.json`, `release-runtime.json`.
Kurucu testlerinin OS/Caddy yönetimi adaptördür; ayrı gerçek Caddy/TLS testi
ve paketin kurduğu gerçek oyun süreçleri/tarayıcı testleri vardır. Canlı VDS
sonucu değildir. Popülasyon testi yapılmadı; gerekirse yalnız 50 oyuncu.

Çalışma öncesinden gelen r110/r112 günlükleri ve eski deney kanıtları kirliydi;
R114 commit'lerine alınmadı, geri çevrilmedi veya silinmedi.

Sonraki durum (13 Kasım): kullanıcı R114 kurulduğunu bildirdi ve Efsane sağlık
yanıtı R114_RUNE_FORUM1 işaretini doğruladı. Sonraki lag incelemesi ve aday
onarım `R115_DEVIR.md` içinde; R114 ZIP ve SHA256 aynen korunur.
