# R117 — Azrail Kancası %10

14 Kasım 2026. Kullanıcı Azrail Sandığı'ndan kanca ihtimalini %6'dan %10'a
çıkarmayı istedi. Canlı Efsane sağlığında R116_ADMISSION_TRANSFER1 doğrulandı.
R117'nin kaynağı yalnız tam R116; R116 ZIP ve kimliği değiştirilmedi.

Aktif kaynak `project/r109_latency_completion/working`, dal
`codex/r117-hook-rate`. Oyun kuralı, doğrulayıcı, eski kayıt okuma uyumluluğu
ve panel/oyun metinleri birlikte güncellendi. Kaydedilmiş %6 JSON okunurken
yalnız kancanın chance alanı %10 olur; kayıt JSON'u, revision, özel katlar,
diğer ödüller ve miktarlar aynı kalır. Daha önce açılmış sandıkların makbuzları
tekrar çekiliş yaptırmaz. RNG, ödül sahipliği ve kalıcılık yolu değiştirilmedi.

İstemci önbelleği için beş yeni içerik kimlikli dosya ve yeni namespace
`core511-58686c517948ebc6` kullanılır; önceki istemci dosyaları değiştirilmedi.
Yeni sağlık alanları `hookRate=R117_HOOK10`, `azrailHookChance=10`.

Paket `project/r117_hook_rate`, dokuz kaynak dosyası. Her iki realm birlikte
güncellenir. Oyuncu DB/şema değişikliği yoktur. Bakım/ön kayıt korunur.
Kabul ve ham sonuçlar `evidence/` altında; source/paket hash bilgileri
`evidence/package.json`. R117 henüz canlıya kurulmadı.

Doğrulama: 9 oran/panel testi; npm test (60), test:native (29), test:captcha
(20) ve test:r110 geçti. R117 kurucu/geri dönüş 11/11, kurulu runtime 3/3
geçti. Sentetik iki realm/sekiz kanal, yeni %10 ve önceki R116 sağlık
işaretleri doğrulandı. Admin RSC → yeni admin → yeni kule modülü zinciri
kurulu çıktıda kontrol edildi; sentetik sahnede SSR dosyası olmadığından
HTML başlangıç isteği tarayıcıda doğrulanmadı. Ayrıntı evidence/verification.json.

Paket SHA256: 420135643eddb53f8b81fc490014d31fb877d7513077716c792fba92a5658996.
