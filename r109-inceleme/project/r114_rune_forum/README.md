# R114 — Rün haritaları ve topluluk forumu

Kullanıcı taslağı 13 Kasım 2026'da onayladı. Yeni kurulum kaynağı **R113_ENGINE1**.
Efsane'nin salt okunur canlı `/api/vds-health` yanıtında R113 ve motor hazır
işareti görüldü. Bu, canlı kurucunun tüm dosya kimlikleri yerine geçmez:
R114 `--check` iki sunucunun kodunu/kimliklerini ayrıca doğrular. R114 henüz
canlıya kurulmadı. Güncel ZIP kimliği `evidence/package.json` içindedir.

## Rün haritaları

Kadim Rün Sahili (`rune`) ve Karanlık Rün Sahili (`rune_v2`) için özel kıyı
poligonu ve iki iç engel yerine 4320×2880 dünya sınırı kullanılır. Diğer
haritaların geometrisi değişmedi. Yürüyüş, atlı hareket, sunucu kontrolü,
realtime kodu, ödül motoru ve içerik adresli istemci aynı geometriyi kullanır.
Hız, giriş seviyesi/rütbe, HP, sıra, sahiplik, RNG ve ödül kontrolleri korunur.

`build-rune.mjs` yalnız kayıtlı R113 girdilerine uygulanır; tekrar çalıştırılmaz.
Eski istemci/portal dosyaları ve ZIP'ler değiştirilmez. Geometri incelemesi
`evidence/rune-build.json`, yeni paket dosya listesi `build/reviewed-files.json`.
R113 motoru korunur; bu pakette performans mimarisi değişikliği/yük testi yoktur.
Nüfus testi gerekirse kullanıcı sınırı yalnız 50 oyuncudur.

## Forum

Kurulumdan sonra adres: **https://coreoflife.net/forum**.
Ana sitenin bilgisayar/telefon/alt menüsünde Forum bağlantısı olur.

- Resmî duyuru, güncelleme, bakım ve etkinlik: yalnız yönetici konu/yanıt açar.
- Oyuncu meydanı, rehberler, loncalar, pazar, öneri/hata bildirimi: üyeler yazar.
- Efsane / Akademi / Tüm sunucular etiketleri, arama, konu/yanıt sayfalaması.
- Ayrı forum üyeliği, tek kullanımlık PNG CAPTCHA, giriş ve çıkış.
- Scrypt parolalar, özetlenmiş oturum/kurtarma anahtarı, Origin/CSRF kontrolü,
  HttpOnly/Secure/SameSite cookie, istek/mesaj sınırları ve düz metin gösterimi.
- Kayıtta gösterilen kişisel kurtarma anahtarıyla parola yenileme: anahtar
  tek kullanımlık, işlemde tüm eski oturumlar kapanır ve yeni anahtar verilir.
  E-posta özel iletişim alanıdır; doğrulandığı iddia edilmez. SMTP veya
  e-postayla sıfırlama yoktur. Oyunun hesap/parola kayıtlarına bağlanılmaz.
- Yönetici resmî konu açabilir, sabitleyebilir, kilitleyebilir ve gizleyebilir.
  Genel kayıt ekranı admin rolü vermez. Ortak/varsayılan yönetici parolası yoktur.
- Yönetici kurulumu: `python3 /root/r114.zip --forum-admin`. Kullanıcı adı,
  e-posta ve gizli parola terminalde sorulur; parola argümana veya loga yazılmaz.

Forum ayrı `coreoflife-forum.service` süreci ve
`/var/lib/coreoflife-forum/forum.sqlite` dosyası kullanır. Oyun DB'sini açmaz.
CAPTCHA, ayrı R106 worker'ında oluşturulur. Veri WAL + FULL kalıcılıktadır.
Forum servisi %50 tek çekirdek CPU / 512 MB ile sınırlıdır; oyun servislerine
kısıtlama eklenmez. Günlük forum yedeği tutarlı SQLite backup API, quick_check,
SHA256 ve 7 doğrulanmış yedek saklama ile ayrı servis/zamanlayıcıda çalışır.

## Kurulum ve geri dönüş

`KURULUM.md` kısa VDS adımlarını içerir. Aktif ters vekil **Caddy**'dir;
taslaktaki Nginx örneği uygulanmaz. Caddy bellek/disk ayarı eşleşmeli,
mevcut ana site yolu tanınmalı ve 8114 portu boş olmalıdır. Diğer host/oyun
rotaları değişmez; `www` forum isteği asıl alan adına yönlenir.

`build/package.py` R105 + değişmez R109/R110 + son R113 ZIP'inden tam R113
kaynağını yeniden kurar. Son R113 ZIP SHA256:
`4399dfe08550ebf04bd4c8ea7fbab8cedcdb804fd851495dd17847a0eabbcbc3`.
Kaynak çekirdek:
`41fb08d699eafa8d8e0f3a1da64b2d8c465f7fc7fce4b1b90f4d71569972ce94`.
Yalnız incelenmiş 8 oyun dosyası, forumun 17 dosyası ve ana sayfa menü ekleri
pakete girer. Oyun DB verisi veya şeması değişmez; uzun tam DB yedeği alınmaz.

Kurucu önce değişen kodu/ayarları günlükler, iki realm ve sekiz kanalı açar,
forumun yerel ve gerçek HTTPS sağlığını kontrol eder. Açılış doğrulanmadan
başarı yazmaz. Kesinti/başarısızlıkta `--recover`, bitmiş kurulumda `--rollback`
R113 koduna döner; oyun ilerlemesi, forum üyeleri/yazıları/yedekleri korunur.
Geri dönüşten sonra aynı R114 tekrar kurulabilir. Bilinen eski R114 kod
kayıtları doğrulama sonrası temizlenir; R113'ün veri/şema kurtarma kayıtları
ve bilinmeyen/eski biçimdeki veri yedekleri otomatik silinmez.

## Doğrulama

Node 22.23.4 ile:

```bash
node --test project/r114_rune_forum/tests/forum.test.mjs
node project/r114_rune_forum/tests/browser.mjs
node project/r114_rune_forum/tests/site-browser.mjs
python3 project/r114_rune_forum/tests/installer_test.py -v
python3 project/r114_rune_forum/tests/caddy_integration.py -v
python3 project/r114_rune_forum/tests/stage-runtime.py
python3 project/r114_rune_forum/tests/release-runtime.py
npm test
npm run test:native
npm run test:captcha
npm run test:r110
```

`REVIEW_NODE` sabit Node yoludur; Caddy testi için `REVIEW_CADDY` kurulmuş
Caddy ikilisine işaret eder. Kurucu testi gerçek dosyalar ve SQLite kullanır;
OS servis yöneticisi ile Caddy yönetim çağrıları adaptördür. Ayrı Caddy testi
gerçek ters vekil/TLS ve gerçek forum servisiyle çalışır. Oyun çalışma zamanı
testi paketin kurduğu ağacı, gerçek alt süreçleri ve iki realm'in sekiz kanalını
başlatır. Tarayıcılar sentetik hesaplarla giriş ve kule bağlantı geri kazanımını
dener. Üretim VDS ölçümü veya sıfır gecikme garantisi değildir.

Kanıtlar `evidence/verification-release.json`, `release-regressions.json`,
`release-runtime.json`, `installer-final.log`, `forum-browser.json`,
`site-browser.json`, `caddy-integration.json` içindedir. Canlı oyuncu DB,
kişisel bilgiler, parolalar ve servis anahtarları pakette/depoda yoktur.
