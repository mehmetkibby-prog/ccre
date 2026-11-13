# R114 — Rün haritaları ve forum taslağı

Durum: Yerel taslak. Canlıya yayınlanmadı, kurulum ZIP'i üretilmedi.
Taban: R113 adayı, commit `9da665d`. Kullanıcı R113 için Drive bağlantısı verdi;
başarılı canlı kurulum henüz teyit edilmedi. Önceki 7 maddelik büyük mimari plan
bu çalışmanın içinde değildir.

## Rün haritaları

`rune` (Kadim Rün Sahili) ve `rune_v2` (Karanlık Rün Sahili) için özel kıyı
poligonu ve iki iç engel yerine mevcut 4320×2880 dünya sınırı kullanılır.
Diğer haritaların geometrisi değişmedi. Yürüyüş, atlı hareket, sunucu konum
kontrolü ve yeni içerik adresli istemci aynı geometriyi kullanır. Hız, giriş
seviyesi/rütbe, HP, sıra, sahiplik, RNG ve ödül kontrolleri korunur.

`build-rune.mjs` yalnız kayıtlı R113 girdilerine uygulanır. Yeni oyun/portal
dosyaları içerik adreslidir; eski dağıtım dosyaları ve eski ZIP'ler değiştirilmez.
`evidence/rune-build.json` önce/sonra dosya kimliklerini kaydeder. Geometri
değişikliği iki sunucunun ortak kaynak ağacındadır.

## Forum taslağı

Hedef adres: `https://coreoflife.net/forum`. Bu adres henüz yayınlanmadı.
Referans `bozkurtonline.com/forum` ortamın ağ izinleri nedeniyle açılamadı;
taslak Core of Life'ın kendi renkleri ve mevcut site görseliyle hazırlandı.

- Resmî duyuru, güncelleme, bakım ve etkinlik: yalnız yöneticiler konu/yanıt açar.
- Oyuncu meydanı, rehberler, loncalar, pazar ve öneri/hata bildirimi: üyeler yazar.
- Efsane / Akademi / Tüm sunucular etiketleri, arama, konu ve yanıt sayfalaması.
- Forum üyeliği oyun hesabından ayrıdır. E-posta, kullanıcı adı, parola ve
  tek kullanımlık PNG güvenlik koduyla kayıt; giriş ve çıkış.
- Yönetici konu açabilir, sabitleyebilir, kilitleyebilir ve gizleyebilir.
- SQLite forum dosyası ve forum Node süreci oyun verisinden/işlemcisinden ayrıdır.
  Forum kodu oyun paketlerini veya oyuncu veritabanını açmaz.
- Sunucu tarafında rol kontrolü, Origin + CSRF, HttpOnly/SameSite cookie,
  HTTPS için Secure, scrypt parola özeti, tek kullanımlık/süreli CAPTCHA,
  istek/mesaj sınırları, hazırlanmış SQL ve düz metin gönderi gösterimi.
- CAPTCHA renderer, mevcut R106'nın üç dosyasının değiştirilmemiş kopyasıdır;
  forumun kendi worker'ında çalışır. Üretim oyununun worker'ını paylaşmaz.

### Yerel çalıştırma (Node 22.23.4)

```bash
FORUM_DB=/tmp/core-forum-preview.sqlite node forum/server.mjs --demo
```

`http://127.0.0.1:8114/forum` açılır. `--demo` örnek içerik ekler; örnek yönetici
ve oyuncu hesaplarının girişleri kapalıdır, ortak/varsayılan admin parolası yoktur.
Sunucu yalnız loopback dinler. Gerçek admin, yerel operatörün seçtiği bilgilerle
`forum/create-admin.mjs` üzerinden oluşturulur; halka açık admin kayıt yolu yoktur.
Bu komut `FORUM_DB`, `FORUM_ADMIN_NAME`, `FORUM_ADMIN_PASSWORD`,
`FORUM_ADMIN_EMAIL` ortam değişkenlerini ister. Parola konsola basılmaz.

`delivery/r114-forum-taslak.html` indirilebilir ve tek başına gezilebilir taslaktır.
Bu HTML kayıt veya paylaşım oluşturmaz; tüm görsel, font ve örnekler içindedir.
Çalışan yerel servis ise gerçek kayıt, giriş, paylaşım ve yetki akışlarına sahiptir.

### Yayın öncesi kalan adımlar

Kullanıcı önce taslağı incelemek istedi. Bu yüzden şu adımlar uygulanmadı:

1. Tasarım onayından sonra forumun üretim hesabı/parola kurtarma ve e-posta
   doğrulama ihtiyacını tamamlamak; örnek içerikleri yayın ortamına taşımamak.
2. `/forum` için ayrı servis ve ters vekil yönlendirmesi, TLS, forum DB yedeği,
   moderasyon/gizlilik metni ve üretim admin kurulumu. Örnek Nginx dosyası yalnız
   planlama girdisidir; mevcut site yapılandırmasına otomatik uygulanmaz.
3. Kaynak canlı sürümünü doğrulayıp R114 kurucu/geri dönüş paketini hazırlamak;
   yeni istemci grafiğiyle Efsane ve Akademi gerçek tarayıcı girişlerini doğrulamak.

Bu çalışma için yük testi yapılmadı; kullanıcı sınırı gerektiğinde yalnız 50
oyuncudur. Buradaki hareket testleri performans veya sıfır takılma kanıtı değildir.
