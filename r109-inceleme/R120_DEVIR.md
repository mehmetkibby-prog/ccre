# R120 devamı — 15 Kasım 2026

Aktif ağaç R120_2D_DEPOT1 adayıdır. Canlıda doğrulanan backend hâlâ
R118_ROYAL1; R119 istemci kurulumunun durumu bilinmiyor. Yeni paket tam R118
veya R119 üzerine uygulanır, R119 animasyonları dahil. Tarihsel ZIP/SHA değişmedi.

## Kapsam
- Depo: ikinci bölüm düğmeleri üstte; mobil flex küçülmesi giderildi. Eşya
  işlemleri/kapasite/DB değiştirilmedi. Native testte 25. yuva eşya alma geçti.
- Yeni ana site 2d.coreoflife.net. Eski apex/www geçiş süresince çalışmaya devam eder.
- Caddy eski host rotalarını koruyarak yeni host eşlerini ekler; yeni hostname
  sertifikası ve DNS kontrolü hizmetler durmadan önce zorunludur.
- accounts/r1/r2/realtime Origin listelerine ekleme; WS kontrolleri korunur.
- Ana site SEO/medya/URL, forum Ana site bağlantıları ve origin allowlisti;
  host-only çerezler; Resend env origin dönüşümü. JWT issuer değişmez.
- DNS, e-posta DNS, Cloudflare bölge ayarları ve 3D sunucusu değiştirilmez.

## Paket
`project/r120_2d_depot/artifacts/R120_2D_DEPOT_074a106a8fd8.zip`
SHA256 `afc268526f78b8e895e92b2d6048055e02f74fc17bf939ee69d49911c3ac12cc`
Çekirdek `a216bbf26f9129220c59e6d24ce92bfcb7bf76c7a75028e238b219d960a14ff1`
Namespace `core511-17d72e47dc4df4fa`
14 çekirdek/istemci dosyası; ayrıca mevcut site/forum ve host ayarları günlüklü.
Tam önceki ayara dönüş, DB ilerlemesini geri almadan sınandı.

## Kanıt
`project/r120_2d_depot/evidence/verification.json`.
9 alan adı/koruma, 1 gerçek Caddy TLS/yol, 10 forum, 6 Origin/e-posta/WS,
4 kurulum/geri dönüş, 3 kurulu runtime/8 gerçek kanal ve 3 animasyon testi geçti.
`npm test`, `test:native`, `test:captcha`, `test:r110` eşdeğer runner grupları geçti.
Depo masaüstü Efsane ve mobil Akademi native browser testleri geçti.
Yayın öncesi bulunan kurucu/test düzeneği hataları verification içinde saklanır.
Performans/lag iyileşmesi iddia edilmiyor.

## Canlıda bekleyenler
Kullanıcı 2d A kaydını eklediğini bildirdi. Bu oturumda VDS/Cloudflare yönetim
bağlantısı yok; yeni hosta erişim çalışma ortamı CONNECT proxy'sinde 403 ile
engelleniyor. Eski apex temiz browser HTTP200, service worker kayıt listesi boş.
Kullanıcının eski cihaz kayıtları bununla doğrulanmış sayılmaz.
Salt okunur VDS audit çıktısı ve SSL modu/kural envanteri istendi, yanıt bekleniyor.
Gerçek sertifika, public mobil/PC giriş/oyun/ses/e-posta testleri ve daha sonraki
apex DNS kesimi sonrası sıfır apex isteği testi tamamlanmadan "2D hazır" denmez.
`CLOUDFLARE-VE-CANLI-KONTROL.md` kullanıcıya tam adımları verir.
