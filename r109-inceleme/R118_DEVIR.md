# R118 — Hükümdar Kraliyet ve Şampiyonlar Diyarı

## Güncel teslim: kurulum kapsamı düzeltmesi

Kullanıcının VDS ekranında R116/R117 kurulumu tamamlanmış; ilk R118 arşivi
SHA doğrulamasını geçmiş, fakat `perf-r11/tests/reward/fixture.mjs` farklılığı
nedeniyle hem `--check` hem `--apply` ön kontrolde durmuş. R118 uygulanmamış.
Bu geliştirme fikstürü hiçbir R117 deltasında yoktur ve çalışan servislerin
bağımlılığı değildir. Yeni paket yalnız bu dosyayı dağıtım kapsamından çıkarır;
113 kalan payload dosyası ve tüm runtime/şema modülleri birebir korunur.

Güncel arşiv: `project/r118_royal_champions/artifacts/R118_ROYAL_61ba37784ffb.zip`.
SHA256: `8a41b77d3cc136729468f0951ce651da56a01d8b71852b730de8e7f26c3c78e5`.
Kaynak R117_HOOK10, hedef R118_ROYAL1, hedef çekirdek ve istemci kimliği aynı.
İlk 640cf76b… arşivi değiştirilmedi ve tarihsel kanıt olarak saklandı. Sonraki
sürümün delta kaynağı düzeltilmiş arşiv olmalı; eski test fikstürünü canlıda
kurulu varsaymayın. Gerekli üretim dosyalarının hash kontrolleri gevşetilmedi.

16 kurulum kontrolü (ilk koşudaki bir testin hata mesajı beklentisi düzeltildi,
hedefli tekrar geçti) ve yeni ZIP'in kurduğu dosyalarla 3 gerçek runtime testi
geçti. Test fikstürü tamamen yokken Efsane/Akademi, sekiz kanal, captcha ve
WebSocket devri doğrulandı. Farklı/eksik test fikstürüyle kurulum ve geri dönüş
başarılı; yabancı runtime değişikliği yine yazmadan reddediliyor. Kurulu çekirdekte gerçek savaş, kalıcı ölüm ve tek seferlik taç/öz ödülü iki
dünya için yeniden geçti. Eksik test DB fabrikası yalnız yerel savaş testinde
geçici adapter olarak sağlanıp kaldırılır; oyuna dağıtılmaz. Önceki UI ve
şema kanıtları byte eşitliğiyle taşınır; yük testi tekrarlanmadı, kapasite
iddiası yok. Kanıtlar `evidence/installer-scope-fix` ve güncel `package.json`.
Burada canlıya kurulum yapılmadı.

Aşağıdaki kayıtlar önceki teslimin tarihsel ayrıntılarıdır.

15 Kasım 2026. Dal `codex/r118-royal-champions`. Doğrulanan canlı kaynak
R117_HOOK10; bu çalışma kendi başına canlı kurulum anlamına gelmez.
Aktif kaynak yine `project/r109_latency_completion/working`.
Paket, kurucu ve kanıtlar: `project/r118_royal_champions`.

## Oyun davranışı

- Beyaz/altın Osmanlı esintili Hükümdar Kraliyet Seti; üç sınıf için silah,
  zırh, miğfer, kolye ve çizme simgeleri; özel sınırlı parlama/duman.
- Pazar Köyü Kraliyet Ustası: uygun Kadim Zümrüt eşyayı aynı kimlikle dönüştürür.
  Efsun, taş, artı seviyesi ve Sonsuz geçmişi korunur. Temel güç yaklaşık %8
  artar; artı basmanın sabit katkısı ikinci kez büyütülmez. Yeni güç tam sayıdır.
- Normal oyun tabanlarında Sonsuz/dönüşüm sırası eşdeğerdir. Özel yönetici
  tabanlarında yuvarlama en fazla 1 güç farkı oluşturabilir.
- Yalnız Şampiyon Lv 1+ kuşanır; normal seviye 1 de geçerlidir. Kadim ve
  Kraliyet parçaları aynı set ailesini paylaşır; bonus iki kez uygulanmaz.
- Haso'da kuşanılmamış, satış/ticaret kilidi olmayan bir uygun Kadim
  Zümrüt eşya, açık onayla tam 1 Zümrüt Tozu olur. Tekrarlanan istek harcamaz.
- İlk tarif: 8 toz + 1 Kraliyet Tacı + 5000 mücevher. Yönetici panelinde her
  parça için malzemeler/miktarlar değişir. Üretim sunucuda atomik/makbuzludur.
- Şampiyonlar Diyarı: normal açık dünya, PvP açık, 3600×2400; 4 tür ve kanal
  başına 48 canavar. Kullanıcının son isteğiyle türler karışık/dağınıktır,
  sıralı grid yoktur. Giriş/yeniden doğuş 1800,1950; çevresi boş tutulur.
- Başlangıç can/hasar realm'in mevcut rune_v2 ayarından +%12, tecrübe/öz
  +%10 alınır. Sonraki yönetici ayarları bağımsızdır; can yeni doğuşta uygulanır.
- Kraliyet Tacı ilk düşüş oranı %2. Diğer eşya düşüşleri başlangıçta kapalıdır;
  yalnız yeni paneldeki oranlar kullanılır. Eski genel etkinlik ganimeti sızmaz.
- Yeni haritada ölüm eşyayı silmez veya %5 mücevher kesmez. Mevcut başka
  haritaların ölüm/ganimet kuralları değiştirilmez.

## Erişim ve kaynaklar

- Oyuncu: Işınlanma → Av Bölgeleri → Şampiyonlar Diyarı.
- Kraliyet paneli: ayrı NPC; Kasaba ve Sosyal bölümünden de açılır.
- Admin: Eşya ve gelişim → Kraliyet Eşyaları; Haritalar ve savaş →
  Şampiyonlar Diyarı. Yeni kullanıcı yazıları Türkçedir; enum adları gösterilmez.
- `build/client.mjs`, sabit R117 arşivinden yeni değişmez varlık grafiğini
  üretir; sözdizimi, çözülmeyen değişkenler ve ters yama eşitliği denetlenir.
- `build/drafts` tek kullanımlık geçmiş yazım kayıtlarıdır; yeniden üretim
  aracı değildir. Çalışan son sunucu kaynakları ve pinli kanıtlar esas alınır.
- `build/http-proof.py` eski HTTP kaynağını ve bütünlük korumasını koruyarak
  yalnız 10 incelenmiş R118 değişikliğinin ileri/geri byte eşitliğini kaydeder.
- Özel kanal başlangıcında iç kabul zamanlayıcısı mevcut 20 sn supervisor
  bütçesiyle eşitlendi. Eski 5 sn sınırı, ağır ilk yüklemede geçerli kanalı erken
  kapatabiliyordu; iki tanı çağrı yığını bunu 5003/5001 ms'de gösterdi. Varsayılan
  bağlantı 5 sn ve kimlik/sahiplik/mesaj sınırları korunur. Bu düzeltme yalnız
  doğrulanan özel çocuk işlem borusu için geçerlidir; oyun tick süresini uzatmaz.
- Paket gerçek ek şema geçişi içerir. Yalnız değişen şema/tetikleyici kapsamı
  tutarlı SQLite yedeğine alınır. Yeni içerik kullanıldıktan sonra eski sürüme
  veri silen geri dönüş engellenir; yeni sürümle ileri kurtarma gerekir.
- R117 ve önceki ZIP/SHA kimlikleri değişmez. Efsane/Akademi birlikte hedeflenir;
  bakım ve ön kayıt ayarları korunur. Canlı DB/kimlik bilgileri depoya eklenmez.

## Savaş protokolü ve ödül yolunun korunması

- Yeni alanın sıradan canavarları, dar katalog/kanal/kimlik doğrulamasıyla
  birleşik checkpoint ve hızlı ödül yoluna kabul edilir. Taş/boss/çağrılmış,
  eski doğuş, başka kanal ve tutulmayan kaynaklar reddedilmeye devam eder.
- Canavar kimlikleri `champions-ivory-guard-c1-01` biçimindedir; dört türün
  ayar anahtarları içeride alt çizgili kalır. Mevcut istemci/sunucu ödül talebi
  normalleştiricisi değiştirilmez. 192 kimlik uçtan uca sözleşme testinden geçer.
- Yeni şema için 6 ana ve21 geçici SQL tetikleyicisinin 27 tam hash'i incelenip
  mevcut native ödül önizleme sertifikasına alternatif olarak eklendi. Eski
  hash'ler, bilinmeyen/değişen SQL'de tam güvenli yola dönüş ve RNG aynı kalır.
  `evidence/r118-trigger-review.json` gerçek SQL ve hash incelemesini içerir.
- Laboratuvar veritabanının eski battlefield tetikleyici sarmalayıcısı yalnız
  sentetik test fikstüründe tam üretim SQL'ine döndürülür. Runtime tarafında
  keyfi tetikleyiciler için izin genişletilmez.

## Hazır kanal aboneliği

Son kurulu-kopya kontrolü, henüz başlangıç verisini yükleyen fakat online olarak
kayıtlı kanala dünya yayını gitmesini yeniden üretti. `6c0cf8f` yalnız
`world-supervisor.mjs` içinde dört kanal için incarnation eşleşmeli abonelik
kullanır. Gerçek hazır mesajından sonra attachChannel ilk tam snapshot'ı aynı
kuyruğa atomik ekler; sonraki deltalar bunu geçemez. Eski kanal hatası yeni
aboneliği silemez. Dünya yeniden başlarsa geçerli kanallar yeni epoch'un tam
görüntüsünü alır. Normal5 sn ve başlangıç20 sn sınırları değiştirilmez.
Eski kodla hata tekrarı ve yeni10 + mevcut2 test kanıtı:
`evidence/world-ready-subscription.json`. Son adayda gerçek eşzamanlı iki realm
büyük veri açılışı ve sekiz kanal0 başlangıç hatası/kurtarma ile geçti.
Nihai arşiv kimliği ve kalan kabul için package.json esas alınır.

## Doğrulama kayıtları

`evidence/required-projection-release-checks.json` güncel640 arşivi ve
6c0cf8f dünya aboneliği düzeltmesi üzerinde geçen temel60 ve native29 testini
kaydeder. Aynı arşivden kurulan gerçek servisler eşzamanlı büyük veri açılışı,
captcha ve WebSocket devri3/3 geçti; Efsane/Akademi kurulu çekirdeklerinde
savaş, kalıcı ölüm, tekrar ödül isteği ve tam1 taç +3 öz toplama geçti.

Önceki20 captcha testi ve değişmeyen R110 arşivinin16 kurulum +3 çalışma testi,
son tekrarın kapsamı açıkça belirtilerek taşınır; güncel arşivde20 captcha
testinin tekrarlandığı iddia edilmez. Kullanıcının süre/kredi sınırı nedeniyle
ilgisiz tekrarlama daraltıldı; güncel captcha worker gerçek kurulu-kopya testinde
ayrıca doğrulandı. Bütün başarısız koşular ve açıklamalar korunur.

İki eski test hatası yalnız test düzeneğinde düzeltildi: geçici DB silinmeden
WAL kapanışı beklenir; eski değişmez R110 arşivi realm'leri sırayla açar ve
sonunda her iki realm/sekiz kanalı birlikte doğrular. R118 gerçek kurulum testi
ise üretim gibi iki realm'i eşzamanlı açar; başlangıçta hata/kurtarma oluşursa
sonradan hazır olsa bile testi reddeder. Üretim süreleri ve eski ZIP değişmez.

Son tarayıcı matrisi `evidence/runtime-browser-matrix.json` 4/4 geçti. Her iki
realmde masaüstü/mobil, gerçek Kraliyet NPC'si, Haso, şehir menüsü, yeni alan
savaşı, ormana dönüş ve admin ayarları doğrulanır. Her koşuda48 doğru canavar
kimliği,4 gerçek atlas ve Türkçe adları görünür. HTTP/tarayıcı/native hata ve
eksik varlık0. Merkezi admin kimliği test fikstürüdür; yeni handler'lar,
eşya/malzeme ve kalıcı oyun işlemleri gerçek motordur.

Hedefli kontroller: 10 harita,7 checkpoint/gerçek ödül akışı,2 kimlik sözleşmesi,
iki realmde6 ödül sertifikası testi. Kurucu13 ve geçiş9 testten geçti. Son adayın
kurduğu dosyalarla gerçek servis/sekiz kanal/WebSocket devri ve kurulu çekirdekte
savaş geçti; `evidence/package.json` nihai durumu bildirir.
`acceptance:pending` tamamlanmış teslim değildir; burada canlıya kurulmadı.

Önceki 50 oyuncu ölçümlerinin hataları saklanır: ilk sürücü botların gerçek canı,
konumu ve saldırı zamanını izlemiyordu; ikinci ölçümde yeni harita entegrasyon
açığı ve sertifikasız SQL yolu ortaya çıktı. Bu koşular temiz önce/sonra veya
canlı kapasite ölçümü değildir. Kullanıcının son süre/kredi sınırıyla ölçüm birer 50 oyunculu orman/yeni harita
sabit savaş koşusuna daraltıldı; üç tekrar veya dolaşım kapsamı iddia edilmez.
Sentetik DB ve 4 CPU kotası kullanılır. Botlar ve oyun aynı
makineyi paylaşır; canlı8 çekirdek/12 GB ortamını veya sıfır gecikmeyi garanti etmez.

Canvas kaynakları değişmedi: `art/canvas-summary-clean-final.json` üçer tekrar
sonuçlarını verir. Tam efektte bir >50 ms kare aralığı gözlendi; bu sonuç da
saklanır. Headless çizim süresi gerçek cihaz FPS'i değildir.

Son yük sürücüsü sınırı: ilk girişte savaş alanında bekleyen botlar ve orman
engellerinden geçen düz hareketler geçersiz ön denemeler üretti. Bunlar
siliniyor veya başarılı sayılıyor değildir. Son karşılaştırma, her iki alanda
aynı kontrollü can/hasarla sabit savaş yapar; gerçek admin dengesi, dolaşım,
kalabalık canlı veritabanı veya tüm oyun kapasitesi ölçümü olarak kullanılamaz.


Nihai yük durumu: `evidence/load-validation.json`. Geçerli zamanlı karşılaştırma
sayısı 0. Son kurulumda botların türetilmiş canı beklenen hazırlığı temsil
etmedi (hp=0/max_hp=100); ölçüm başlamadan duruldu. Süre/kredi yönlendirmesiyle
ek deneme yapılmadı. Özellik/kurulum kabulü başarılı, yük doğrulaması mevcut
değil: `acceptance=functional-passed-load-validation-unavailable`. Bu ayrım
teslim README'sinde de açıkça yazılır. 50 kişilik kapasite veya sıfır gecikme
iddiası kurmayın. Son ZIP640; burada canlı kurulum yapılmadı.
