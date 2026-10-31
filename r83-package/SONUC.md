# R83 — tamamlanan karakter işleminin arka plan cevabını beklemesi

## Düzeltilen davranış

R82'de belirli periyodik karakter kontrolleri, gerçek oyun işlemi kaydedilip
karakter durumu güncellendikten ve kaynak kilidi bırakıldıktan sonra
`heartbeat_schedule` arka plan görevini kuyruğa koyma cevabını bekliyordu.
Bu ek bekleme, oyuncunun `FixedLoop` işlem bariyerini ve tarayıcıdaki
heartbeat komut sırasını açık tutuyordu.

Mevcut istemci, onaylanmamış hareket geçmişini 600 ms ile sınırlar. Bu
tampon dolduğunda karakter ilerlemeyi durdurur. Bu koruma PC ve mobilde
kullanılan ortak istemcidedir. Sorunu yalnızca mobil çizim performansına
bağlamak doğru değildir.

R83 iki noktayı değiştirir:

1. `HeartbeatLoop` kalıcı işlem yolunda, tamamlanmış oyun işleminin ardından
   bakım görevini mevcut takip mekanizmasına bırakır ve oyun cevabını döndürür.
2. `SharedCombatChannel` ortak dünya heartbeat yolunun işlem sonrası çağrısı
   aynı arka plan cevabını oyuncunun bariyerine eklemez.

Gerçek yazıcı cevabı, karakterin yetkili durumunun yenilenmesi, ortak dünya
tamamlama cevabı ve kaynak kilidi kontrolleri aynı sırada beklenir. Arka plan
görevi `pending` kümesinde takip edilmeye devam eder; çıkış ve sahiplik
aktarımının `drain()` işlemi bu görevleri yine bekler. Beklenen kuyruk hataları
yeniden denenebilir kalır; beklenmeyen hataların mevcut fatal yolu korunur.

Üçüncü dosya değişikliği, sağlık yanıtındaki `R82_GAMEPLAY` sürüm etiketinin
`R83_GAMEPLAY` yapılmasıdır. İstemci dosyaları ve 600 ms tahmin sınırı değişmez.

## Yeniden üretim ve test

Kontrollü entegrasyon testi, mevcut gerçek tarayıcı taşıyıcısını ve hareket
tahminini; gerçek `FixedLoop`, `HeartbeatLoop`, `HeartbeatMemory` ve
`SharedCombatChannel` davranışlarıyla birleştirir. Yalnız arka plan görev
kuyruğu cevabı 900 ms geciktirilir. Asıl oyun yazısı ve karakter yenilemesi
önceden tamamlanmıştır.

| Kontrollü senaryo | R82 | R83 |
| --- | ---: | ---: |
| Heartbeat oyun cevabının alınması | 900 ms | Sonraki 50 ms adımında |
| İlk hareket komutunun gönderilmesi | 900 ms | 50 ms |
| Aynı testte karakterin sabit kaldığı süre | 300 ms | 0 ms |

Bu üç yolun her biri doğrulandı: yerel kalıcı heartbeat, ortak kalıcı
heartbeat ve ortak yetki alındıktan sonra bellekte tamamlanabilir hâle gelen
heartbeat. Bu sayılar sentetik gecikme testine aittir; canlı VDS kazancı,
gerçek ağ pingi, FPS veya 13:45:36 olayının ölçümü değildir.

22 sunucu davranışı testi ve 3 istemci entegrasyon testi geçti. Gerçek yazıcı
ve yenileme beklerken hareketin hâlâ korunduğu, sonucu bilinmeyen yazının
kilidinin kaldırılmadığı, arka plan görevlerinin çıkışta beklendiği, eski
oyuncu oturumunun yeni oturuma taşınmadığı ve yinelenen oyun yazısı
üretilmediği de test edildi.

Kurucu için 68 test geçti: 34 yaşam döngüsü/kesinti/kurtarma testi ile
34 kaynak, paket, yedek, çalışma zamanı, sağlık ve kapsam kontrolü.
Toplam **93 test geçti; başarısız, atlanan veya iptal edilen oyun testi yok**.
Üç üretim JavaScript dosyası ayrıca sözdizimi kontrolünden geçti.

## Pakete alınmayan okuma değişikliği

Birden fazla karakter okumasını aynı SQLite görüntüsünde gruplayan kuyrukta
ilk biten yanıtın sonraki okumaları bekleyebildiği doğrulandı. Buna yönelik
8 ms'lik grup bütçesi incelendi. Gerçek `ColdReadCache` ve SQLite ile yapılan
yazma trafiği testinde, daha sık görüntü açmak önbelleği daha sık geçersiz
kıldı ve iki iş yükünde toplam süre yaklaşık 1,97 ve 2,48 katına çıktı.

Bu nedenle okuma değişikliği **R83'e alınmadı**. Orijinal
`snapshot-read-queue.mjs` dosyası R82 ile birebir aynıdır. Bu adayın testleri
93 üretim doğrulama testine dahil edilmemiştir.

## Kaynak ve çalışma kapsamı

- Kaynak: doğrulanmış R82_GAMEPLAY; hedef: R83_GAMEPLAY.
- Üç mevcut sunucu dosyası değişir; yeni üretim dosyası yoktur.
- 1166 kaynak kimliğinin tamamı önceki doğrulanmış paketten türetilir.
- Yerelde mevcut 1124 kaynak dosyası doğrulanmıştır. Eksik 42 dosya eski
  sürümlerle doldurulmamıştır; kurucu VDS'deki tam kimliği denetler.
- Eksik güncel modüller nedeniyle tam canlı oyun sunucusu yerelde
  başlatılmamıştır. Testler gerçek ilgili sınıfları, açıkça kontrollü IPC/yazıcı
  uçlarını ve kurucuda gerçek dosya sistemi/SQLite işlemlerini kullanır.
- Kurucu testlerinde işletim sistemi servisleri, hesap HTTP hizmeti ve tam
  harici sürüm doğrulayıcısı yalıtılmış test karşılıklarıyla çalışır.
- HTTP paketi, istemci varlıkları, Node/SQLite, hesap servisi ve veritabanı
  şeması bu güncellemenin kapsamı dışındadır.
- Canlı VDS'ye bu çalışmadan doğrudan kurulum yapılmamıştır.

R83'ün ortadan kaldırdığı bekleme koddaki ve testteki somut bir hatadır.
Her normal heartbeat bu yoldan geçmez: yerel yol terminal hasar, ekipman
kontrolü veya arena kuyruğu gibi kalıcı işlem isteyen durumlarla sınırlıdır.
Özel 13:45:36 olayının tam nedeni ve diğer duraksamaların durumu kurulum
sonrası gerçek oyun gözlemiyle değerlendirilmelidir.

Oyuncunun kalıcı ölüm kaydı bozuksa bu paket veritabanına zorla can yazmaz
ve ölüm zamanını değiştirmez. R82'nin istemci dirilme düzeltmesi korunur;
henüz gelmemiş ölüm-kayıt ölçümü, kalıcı ölüm sorununun ayrı nedenini
doğrulamak için gereklidir.
