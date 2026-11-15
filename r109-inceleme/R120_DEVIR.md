# R120 devamı — 15 Kasım 2026

Güncel kurucu R120_2D_DEPOT3; oyun/istemci dosyaları ilk R120 ile aynıdır. Canlıda doğrulanan backend hâlâ
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
VDS TLS ve Cloudflare modu ekranları geldi: Full + otomatik mod; Caddy varsayılan
otomatik HTTPS, yalnız apex sertifikası var. Cloudflare kural envanteri hâlâ bekliyor.
Gerçek sertifika, public mobil/PC giriş/oyun/ses/e-posta testleri ve daha sonraki
apex DNS kesimi sonrası sıfır apex isteği testi tamamlanmadan "2D hazır" denmez.
`CLOUDFLARE-VE-CANLI-KONTROL.md` kullanıcıya tam adımları verir.

## V2 — mevcut otomatik sertifika düzeni (15 Kasım 2026)

İlk paket yukarıdaki SHA ile korunur; v2 tercih edilmeli. Yeni dosya:
`project/r120_2d_depot/artifacts/R120_2D_DEPOT_4cdc1af31b61.zip`
SHA256 `5fcf4d850076257437166f5634519041f803866b8956d95901bf2141c1664ff6`
Sürüm `R120_2D_DEPOT2`; çekirdek/namespace ve oyun/forum payload byte olarak aynı.

`--check-web` salt okunur. Bakım geri sayımı bittikten sonra `--prepare-web`
yalnız Caddy 2d eşlerini ekler, otomatik sertifikayı bekler, mevcut apex sayfasını
ve Cloudflare 2d ana sayfasını doğrular. Sonra normal `--check` / `--apply`.
Caddy reload WebSocket'leri yeniden bağlatabileceğinden aynı bakım aralığında.
Hata durumunda özel 0600 günlüğünden tam Caddy geri dönüşü; güç kesilmesinde
`--rollback-web`. Başka kurulum/bilinmeyen dış değişiklik üzerine yazılmaz.
Ana oyun geri dönüşü hazırlanmış 2d eşlerini korur; gerekirse ardından web geri dönüşü.

29 hedefli kontrol geçti (9 alan/koruma, 11 web hazırlık/hata, 3 CLI bakım,
1 gerçek Caddy otomatik TLS, 5 arşivden kurulum/geri dönüş). İlk R120 oyun
testleri geçerlidir; 16 oyun/forum payload dosyasının aynı olduğu doğrulandı.
Kanıt `evidence/verification-v2.json`. Yerel Caddy testi izole internal CA kullandı;
canlı ACME/Cloudflare ve telefon/PC akışları yapılmış gibi sunulmaz.

Cloudflare bölgesi Full; otomatik mod açık (sonraki tarama Dec 8). Bölge değişmedi.
Gerekiyorsa yalnız apex/www için Full Configuration Rule envanter sonrası
kullanıcıya tarif edilir; mevcut Full nedeniyle bugün strict istisnası zorunlu değil.

## V3 — dış 403 sonrası 2d TLS'i kaldırma döngüsü

Kullanıcı apex DNS'ini 3D'ye taşıdı. V2 --prepare-web yerel kontrolü geçti,
dış urllib GET HTTP 403 aldı ve aliası geri kaldırdı. Sonraki curl HTTP 525
verdi. İlk 403'ün kaynak/kuralı hâlâ kesin değil; ikinci 525 ile karıştırılmamalı.

V3 sadece hazırlık/kurucu değiştirir; oyun/forum dosyaları v1/v2 ile aynıdır.
Yerel TLS + ana sayfa + eski yerel apex kontrolü başarısızsa geri dönüş sürer.
Bu üç kontrol geçtiğinde dış erişim hatası yeni hostname'i kaldırmaz; özel
günlükte local-ready-public-pending olur, işlem başarısız çıkar, normal
--check/--apply tamamlanmış public hazırlık olmadan başlamaz. Yeniden deneme
aynı config'i tekrar yüklemez. --check-public yalnız okur. HTTP/CF-Ray/
CF-Mitigated ve redakte yönlendirme hostu gösterilir; redirect izlenmez.
Güvenlik/SSL kapatılmaz; user-agent açıkça CoreOfLife readiness olarak tanımlıdır.

39 hedefli test geçti; v2 rolled-back günlüğüyle uyumluluk doğrulandı.
Ayrıntı evidence/verification-v3.json. Tam paket: `artifacts/R120_2D_DEPOT_a75c635543cf.zip`
SHA256 `28d5eeb6029029d529ba8d3789d05b9f167d13146100267f1e262e11f50a9821`. Eski ZIP'ler/SHA'lar korunur.
Canlı kurulum ve dış erişim kabulü henüz doğrulanmadı; 2D hazır denmez.

## V4 — Akademi realtime_network_identity (15 Kasım, 22:36 ekranı)

V3 web hazırlığı canlıda yerel TLS/ana sayfa + dış HTTP 200 geçti. Ana kurulum
r2 bağlantı sağlık kontrolünde durdu ve önceki kod/alan ayarları geri yüklendi.
Web hazırlığının yeni 2d eşleri yerinde kaldı. V3 ana kurulu sayılmaz; kaynak
tam R118/R119 olarak kalır. Eski 403/525 bu yeni servisin hatası değildir.

Günlük kesin neden: R102 `realtime-profile.mjs` içindeki
`env.ALLOWED_ORIGINS===realm.origin`. R120 yeni 2d origin ekleyince bu şart
sağlanmıyor. Son satır R102_REALTIME1'in rollback sonrası hazır olduğunu gösterdi.

V4 `academy_origin.py` eski R102 kayıt/manifest/dosya SHA/servis komutu ve canlı
PID bağını doğrular. Yeni profili gerçek col-r2 ile servisleri durdurmadan,
salt okunur DB üzerinden sınar. Yeni kod ayrı academy-realtime-r120-<hash>
dizinine, normal geri dönüş günlüğüyle yazılır; zz-r120-realtime.conf devreye
alınır. Eski paket, kayıt ve zz-r102-realtime.conf hiç değiştirilmez.

Yalnız tam r2 origin veya tam r2 + sabit 2d origin kabul edilir. Port/localhost,
imza, realm/veritabanı kimliği, bot/proof korumaları sürer. İki realtime sağlık
yolunda R102_REALTIME1 korunur ve R120_ORIGIN1 eklenir; v4 readiness bunu ister.
Geri dönüş eski sürümde yeni işareti istemez; yeni dosyaları/override'ı kaldırır.

Paket `artifacts/R120_2D_DEPOT_f2ae90415c02.zip`, sürüm R120_2D_DEPOT4.
SHA256 `2763f8fbc6e37749f2dcd1df5f2ad4c57e391761ef49208f28f5438b1aad05b8`.
Çekirdek/namespace ve 16 oyun/forum payload dosyası v3 ile byte olarak aynıdır.
Tüm önceki R120 ZIP SHA'ları tekrar doğrulandı. DNS/3D/Cloudflare değişmedi.

44 test geçti: 9 alan, 14 web hazırlık, 5 CLI, 6 public probe, 4 gerçek Academy
servis/Origin/kimlik/WS ve 6 paket kurulum/geri dönüş. İki ilk kurulum-test
fikstürü hatası (eksik dizin ve UID1000 uyarlaması) düzeltildi ve logları korundu;
üretim root koruması gevşetilmedi. `evidence/verification-v4.json` kanıtıdır.
Testler sentetik veridedir; canlı v4 kurulumu ve tam mobil/masaüstü kabul hâlâ
bekler. Kullanıcıya yeni v4 indirme/kurulum bloğu verilecek; 2D hazır denmez.

V4 indirilebilir paket yayımlandı ve anonim HTTP 200 + SHA256 doğrulandı:
https://raw.githubusercontent.com/mehmetkibby-prog/ccre/5fb5d5cc6a415a85e5c9a897e858398fe82d5345/r120-2d-depo-v4.zip
Kaynak commit: 1053c9792bc53a1c73f0df5355f030276bdf72a3.
Kanıt: project/r120_2d_depot/evidence/download-v4.json. Canlı kurulum bekliyor.
