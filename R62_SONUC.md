# R62 — ön kayıt ödülleri, Azrail sandığı, envanter ve doğrulama

## Yapılanlar

- Ön kayıt sayfasına oyunun gerçek Başlangıç Tilkisi görseli ve mevcut sandık ödülleri eklendi: **3 günlük tilki, 50 Mücevher, 10 Kırmızı İksir**. Tilki çağrıldığında +10 saldırı/+350 can verir; süre sandık açılınca başlar ve çevrimdışı da ilerler. Hesap başına bir kez verildiği belirtilir. Ödül ekonomisi değiştirilmedi; yalnız ön kayıt yapanlara özel olduğu iddia edilmez.
- Azrail açıklaması: **“Kadim Kule’nin hazinesi. İçinde değerli eşyalar seni bekliyor.”** Yeni şeffaf WebP ikon **96×96, 4.726 bayt**; ekranda 48×48 görünür.
- Sandığın gerçekten verdiği eşyalar, mevcut Dünya sohbetinde **Sunucu** adıyla yayınlanır. Çok sayıda ödül 140 karakteri geçmeyen satırlara ayrılır. Duyuru ödülle aynı işlemde kaydedilir; kalıcı kayıt tamamlandıktan sonra mevcut sohbet dağıtımıyla gönderilir. Aynı isteğin tekrarında ikinci ödül/duyuru oluşmaz.
- Azrail sandığı pazar listesine ve native malzeme ayrıştırıcısına eklendi. Listeleme, iptal, satın alma, para/eşya bakiyeleri ve tekrar istekleri gerçek native servislerle kontrol edildi.
- Çantadaki ve giyili ekipman kutularında yalnız eşya adı ve + seviyesi gösterilir. Uzun ad iki satırda kısaltılır; güç, sınıf, seviye ve efsun bilgileri mevcut tıklama/dokunma ayrıntı penceresinde kalır. Kutular büyütülmez. PC'de Hızlı Sat / Rün / Statü / İstatistikler tek satırdır. Dar mobil ekranda dokunma alanları için 2×2 düzen korunur.
- Altı rakamlı oyun içi doğrulamada başarılı yanıtın yalnız oluşturulması için ikinci kez ortak koordinatör/yazıcı kuyruğuna girdiği bulundu. Yanıt ilk doğrulama işleminde alınır. Eski yolun beklediği, yeni yolun beklemediği deterministik testle gösterildi. Kimlik, CSRF, deneme sınırı, tek kullanım, kalıcı kayıt ve mevcut kanal onayı korunur. Oyuncunun hangi ekranı kastettiği teyit edilmediğinden bütün bağlantı gecikmelerinin çözüldüğü iddia edilmez.

## Kaynak ve yük

Taban R61 core: `cdaffd0d1297c1ef49248bffb39226e966f1195148a808a480dee36bee5961a9`.
R62 core: `1957760ba0a499db494d7a06daee6cedd925c77704cca6baedbf837c35b7def4`.
Site: `20261026-4385eb249bd8` → `20261026-5f33dadbb1f9`.

16 çekirdek/üretilmiş dosya değişikliği vardır; ayrıntılı SHA listesi `DEGISEN_DOSYALAR.txt`, tam metin diff'i `R61_R62.diff` içindedir. Önceki teslim edilen aday R61 olduğundan canlı taban ve önceki teslim karşılaştırması aynı diff'tir. Görselin baytları oyun payload'ında, boyut/SHA kaydı diff ve manifesttedir.

`action-writer.mjs` değişikliği yalnız mevcut sefer/sandık komutuna olay kaydedicisini geçirmekten oluşur; savaş, hareket, collect, claim, kilit veya ödül RNG algoritmaları değiştirilmez. Yeni timer, yoklama isteği, fsync veya checkpoint eklenmez. Azrail açılışında en fazla 16 ödül satırına karşılık gelen sınırlı sohbet kaydı ve bir world-cycle okuması mevcut işlem içindedir. Bildirim mevcut outbox üzerinden gider. İstemci seçenekleri mevcut seçenek isteğinden gelir.

Native HTTP'nin iki ek yamasının ve oyun/portal/kule istemcisi değişikliklerinin ters uygulanması byte olarak R61'e eşittir. Native temel kaynak ağacı değiştirilmedi; eski istemci dosyaları tutulur. R61 performans anahtarları ve Node başlangıç ayarı korunur.

## Doğrulama kapsamı

- Doğrulama kuyruğu ve native güvenlik/dayanıklılık: 8 test; sandık ödülü/pazar/duyuru: 4 test geçti. Yanlış yanıt, çift istek ve COMMIT öncesi/sonrası zorunlu süreç ölümü senaryoları dahildir.
- Gerçek native HTTP, kanal WebSocket süreçleri ve Chromium ile oyuna giriş, sandık açma ve görünür Dünya sohbeti kontrol edildi. 1280×900, 844×390 ve 390×844 ekranlarında metin taşması, ekipman kutusu çakışması ve sayfa taşması yok; JavaScript hatası yok. PC tıklaması ve 844×390 gerçek dokunma emülasyonuyla hem giyili hem çantadaki eşyanın tam ayrıntıları açıldı. Efsunlu ve taşlı örneklerde **EFSUNLAR → Kritik Vuruş Şansı +%10** ve **TAKILI TAŞLAR → Kritik Şansı Taşı +%7** iki giriş biçiminde de görünür olarak doğrulandı.
- Ön kayıt/admin açılış davranışında 17 tarayıcı kontrolü; ön kayıt/admin mobil ekranlarında otomatik erişilebilirlik ihlali yok.
- Site kurulumunda gerçek Caddy/dosya sistemi ile 7 kontrol: ön kontrol, tekrar kurulum, eski video/range erişimi, geri alma, değiştirilmiş tabanı reddetme ve hata sonrası geri dönüş.
- Oyun ve siteyi birlikte çalıştıran kurucunun sıralama/hata geri alma davranışında 6 test geçti.
- Anahtar kapalı pazar davranışı ve istemcide ikon/stil/listenin eski yola dönmesi; native/istemci ters yama eşitlikleri doğrulandı.

Kısa regresyon yükü: **80 oyuncu, 4 kanal × 20 kişi, 40 saniye**. Yerel 4 CPU kotasında saldırı p95 **71 ms**, ölüm ve tüm kalıcı ödüller p95 **391 ms** (20 ölüm ölçümü). Kopma, bekleyen ACK, süreç hatası, yarım kalan ödül ve çift ödül **0**; kapanış temiz. Tepe toplam RSS yaklaşık **2,30 GiB**. Bu kısa örneklem yeni bir 100 oyuncu kapasite ölçümü veya VDS performans garantisi değildir. Yük testinden sonra yalnız aynı özet CSS seçicisi kemer düğmesine genişletildi; son paketin sunucu kodu/ayarları ölçülen sürümle byte olarak aynı. İki kaynak kimliği ve yalnız istemci farkı `load-client-only-proof.json` içinde.

Tam oyun kurucu testinde anahtarlar, değiştirilmiş tabanı/payload'ı reddetme, başarısız sağlık kontrolünde otomatik geri dönüş, tekrar kurulum, güncel DB ile geri alma ve 9 başlangıç güvenliği kontrolü geçti. Son kullanıcı isteği yalnız istemci düzenini değiştirdi; nihai ZIP için ayrıca gerçek kurulum/geri alma ve güncel verinin korunması tekrar doğrulandı. Kanıt dosyaları `installer-previous-client.json` ve `installer-final.json` ile ayrı kaynak kimliklerine bağlıdır.

## Sınırlar

Testler yerel, izole hesap ve veritabanlarıyla yapıldı; canlı VDS'ye kurulum yapılmadı. Oyun kurulum testinde ZIP, Node, SQLite ve dosya sistemi gerçektir; root ve systemd servis sağlığı taklit edilir. Tarayıcı fixture'ında yeni ikon yüklenir; önceden var olan 11 medya/favicon yolu yerel önbellekte eksiktir ve 404 verir. Bu, yeni pakette bu dosyaların silindiği anlamına gelmez; canlı sitenin bütün medyası doğrulanmış sayılmaz. Kısa yük kontrolü 100 oyuncu kapasite/onay testi değildir.
