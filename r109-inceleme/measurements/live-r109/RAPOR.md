# R109 sonrası canlı CPU profili — 6 oyuncu

Kullanıcı oyuncu sayısını **6** olarak bildirdi. Ölçümdeki harita/etkinlik ve
sunucu ayrıca belirtilmedi. Ayrı sağlık sorgusu Efsane'nin güncel durumunu
doğruladı; bu sorgu profilin çekildiği aynı zaman aralığı değildir.

## Sonuç

Kayıt 60.433 saniye, 27.931 örnek. İlk
426.486 ms doğrudan profiler başlatma yığınında;
oyun yükü özetinden ayrı tutuldu. Sonraki 60.006
saniyede ana iş parçacığının örneklenmiş meşguliyeti **%21,96**, bekleme payı
**%78,04**. Bu tüm VDS CPU'su veya bütün oyun süreçlerinin CPU toplamı değildir.
Bir saniyelik örnek pencerelerinde en yüksek meşguliyet %35,38.

Önceki tek oyunculu kayıttaki 103 ms kesintisiz GC örnek dizisi bu kayıtta
görülmedi. Yeni en uzun kesintisiz GC örnek dizisi **27,883 ms**; bu olumlu
bir işaret ama tam bir GC olay zamanlayıcısı veya event-loop donma ölçümü değil.
Farklı faaliyet ve nüfusla tek dakikadan kalıcı iyileşme yüzdesi çıkarılamaz.

## Üç gerçek ölçümün karşılaştırması

| Kayıt | Ana örneklenmiş meşguliyet | Native SQL öz-süre toplamı (ms) | Native prepare (ms) | GC örnek toplamı (ms) | En uzun ardışık GC örnek aralığı (ms) |
|---|---:|---:|---:|---:|---:|
| Önceki kayıt: 10 oyuncu | %21.88 | 2844.6 | 514.9 | 990.4 | 41.1 |
| Önceki kayıt: 1 oyuncu | %2.88 | 331.6 | 25.2 | 204.8 | 103.0 |
| Yeni kayıt: 6 oyuncu | %21.96 | 3024.1 | 335.0 | 672.5 | 27.9 |

Oyuncu sayısı, aktivite, ekipman ve harita aynı değil. Bu tablo yamanın nedensel
önce/sonra hızlanma testi değildir. Özellikle 6 oyunculu yeni kaydın ana
meşguliyeti eski 10 oyunculu kayıtla benzer; genel performans sorununun çözüldüğü
sonucu çıkarılamaz. Oyuncu başına bölüp 30/40/100 kişiye doğrusal tahmin yapmak
doğru olmaz.

## Kalan maliyet nerede?

- Native SQL çağrıları toplam **3.024 ms**, bunun sorgu hazırlama kısmı **335 ms**.
  Bunlar yaklaşık 60 saniyeye dağılmış örneklerdir, tek bir 3 saniyelik donma değil.
- `drainWrites` kapsayıcı örnek süresi yaklaşık **5.427 ms**. Bu, içindeki SQL ve
  oyun işlemlerini de içerir; SQL toplamıyla toplanmaz. Bu fonksiyona tek başına
  5,4 saniyelik donma veya bütün GC'nin nedeni denemez.
- SQL hata/geri dönüş koruma sarmalayıcısı `command-failure-scope` içindeki
  statement çağrısının öz-süresi yaklaşık **641 ms**. Bu korumayı silmek kayıt ve
  ödül tutarlılığını bozabilir; sadece profilde görünmesi kaldırma gerekçesi değil.
- Süreçler arası JSON paketleme `framed` öz-süresi yaklaşık **538 ms**,
  `prepareReplyWireR105` yaklaşık **156 ms**. İletişim ve nesne üretimi sonraki
  incelemede ele alınabilecek alanlar.
- `writer-sql-timing477` dosyasındaki fonksiyonların toplam öz-süresi **12,7 ms**;
  yaklaşık 5.016 ms kapsayıcı süre alt sorguları da içerir. Ayrıntılı SQL
  zamanlamasının 5 saniye harcadığını söylemek yanlış olur. İncelenen sürümde
  ayrıntılı ölçüm varsayılan kapalı; düşük maliyetli dış fonksiyonlar kalıyor.
- Ana thread profilinde captcha çizimi örneği yok. Worker çizimi bu profilde
  zaten görünmez; bu kayıt tek başına captcha üretiminin çalıştırıldığını veya
  süresinin sıfır olduğunu kanıtlamaz.

## Ayrı canlı sağlık kontrolü

Efsane sağlık yanıtında **R109_LATENCY2** ve **R106_CAPTCHA1** görüldü.
Dört kanal hazır; sorgu anında toplam **6 oyuncu** vardı. Aynı yanıtın mevcut
iki saniyelik tanı penceresinde ana ELU **%18,9**, gecikme göstergesi **13,1 ms**;
yazma kuyruğu boştu. Bu 13,1 ms değeri bu CPU profilinin tick p99'u değildir.
COMMIT gözlemcisinin >50 ms sayacı 0, COMMIT tepe değeri 9,72 ms idi; yalnız bu
sayacın kapsadığı ana SQLite COMMIT'leri için geçerlidir, tüm oyunun donma sayısı
değildir. Sağlık tanısı zamanı: 2026-11-12T09:29:47.033000+00:00.

Akademi HTTP sorgusu çalışma ortamının proxy'sinde 403 ile engellendi;
bu Akademi servisinin bozuk olduğuna dair bir sonuç değildir. Bu turda onun
canlı sürümü ayrıca doğrulanamadı. Paket iki sunucuyu kapsar.

## Ölçümün sınırı ve sonraki karar

Bu dosya ana thread CPU örneklerini içeriyor. Kesin tick p95/p99, >50 ms
event-loop donma sayısı, oyuncu komut yanıt süreleri, RSS/swap, GC türü
(Scavenge/Mark-Compact) ve oyuncu cihazı FPS'i bu dosyada yok. Bu nedenle sıfır
takılma veya 30–40 oyuncu kapasitesi onayı verilemez. Önceki R109 izole yük
testlerindeki olumsuz sonuçlar bu yeni kayıtla geçersiz sayılmıyor.

Yeni sürüm bu turda değiştirilmedi. Öncelik, mevcut kayıt/ödül işlem yolundaki
sorgu hazırlama ve iletişim maliyetini temsilî aynı aktivitede incelemek;
işlem güvenliği kontrollerini kaldırmak veya bu tek kayıttan yeni bellek/swap
ayarı önermek için kanıt yok. Mevcut kurulum yeniden çalıştırılmamalı.

## Kanıt ve tekrar üretme

- Ham dosya değişmedi; SHA256: `42f50688a62556e2dd874fac092b060aba015823ef9370743b6b014ea365fd3e`.
- `evidence/new-profile-analysis.json`: ağırlıklı öz-süre/kapsayıcı sıralama.
- `evidence/sample-span-audit.json`: üç profil ve GC örnek aralıkları.
- `evidence/live-r1-health.json`: ayrı salt okunur canlı yanıt.
- `audit-extra.py` ve `build-report.py`: yerel inceleme ve rapor üretimi.
- Kullanılan ana analiz: `../r105_postinstall_profile/analyze-profile.py`.

CPU örnekleri çağrı sayıları veya kesin fonksiyon süreleri değildir. Örnekler
arasındaki bekleme aralıkları son örneklenen yaprağa ağırlık olarak atanmıştır;
işletim sistemi zamanlaması ve native bekleme bu ağırlığı etkileyebilir.
