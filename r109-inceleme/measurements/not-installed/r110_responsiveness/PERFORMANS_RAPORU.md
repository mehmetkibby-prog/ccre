# R110 — saldırı tepkisi ve işlem maliyeti

Bu paket kurulu **R109_LATENCY2** üzerine Efsane ve Akademi için aynı kodu uygular. Canlıya bu ortamdan kurulmadı. Hasar, ganimet ve eşya sahipliği sunucu onayında kalır. Kayıt biçimi veya şema göçü yoktur.

## Sonuç ve sınır

**Yerel saldırı geri bildirimi eklendi ve üç dar kapsamlı maliyet azaltıldı. Bütün duraklamaların giderildiği kanıtlanmadı.** Özellikle 40 oyunculu yoğun kanal ve ortak boss senaryolarında kısa duraklamalar/uzun tekil yanıtlar kaldı. Sonuçlar aşağıda saklanmıştır; bu paket için sıfır lag veya 100 oyuncu kapasitesi iddiası yoktur.

Test makinesi 4 CPU kotasını oyun ve ayrı bot süreci arasında paylaşır. Canlı VDS 8 çekirdektir; aynı donanım testi değildir. İlk R109 koşularında CPU steal %17–23 iken sonraki koşullarda değişmiştir. Tablodaki bütün farkı kod iyileştirmesine mal etmek doğru olmaz. Bu nedenle arka arkaya ek R109/R110 40 oyuncu karşılaştırması da yapıldı.

## İncelenen alanlar ve yapılanlar

1. **Saldırı tepkisi:** normal harita/PvP/Kadim Kule saldırılarında görsel zaten sunucu cevabından önce başlıyordu. Eksik olan Solo Zindan planlanan saldırı ve kendi destek becerisi görseli yerelde başlatıldı. Sunucu can, ölüm, iyileştirme, eşya ve ödül hesabını yapmaya devam eder. Menzil/bekleme süresi/düzenleme kilitleri korunur.
2. **Sorgu hazırlama:** aynı SQL için tekrar tekrar kısa ömürlü yöntem sarmalayıcıları üretmek yerine bağlantıya özel, sınırlı ve değiştirilemeyen sarmalayıcılar yeniden kullanılır. Satır, parametre veya yetki sonucu önbelleğe alınmaz; şema değişimi/geri dönüşte temizlenir.
3. **Boss kayıtları:** aynı atomik kayıt grubunda kimliği ve güncel satırı zaten doğrulanmış canlı boss için ikinci bir genel tablo taraması yapılmaz. Belirsiz durum veya bilinmeyen tetikleyicide eski denetim yolu çalışır.
4. **Bellek/GC:** parçalı ağ mesajlarında büyüyen tamponu tekrar tekrar kopyalamak kaldırıldı. Bir mesaj için en fazla mevcut sınır kadar tampon ayrılır. Sorgu sarmalayıcılarının tekrar kullanılması da geçici nesne sayısını azaltır. Yeni heap/swap ayarı eklenmedi.
5. **Süreçler arası iletişim:** parçalı başlık/gövde, UTF-8 ve ardışık mesaj ayrıştırma değişti; paket biçimi, 1 MiB çerçeve sınırı, sıralama ve yeniden bağlantıda tek uygulama garantisi korunur.
6. **Yazma kuyruğu:** mevcut en fazla 8 iş / 3 ms grup bütçesi ve gruplar arası event-loop dönüşü incelendi. Atomik işin ortasına bekleme eklenmedi; SAVEPOINT/COMMIT/kalıcılık onayı kaldırılmadı. Test sonunda kuyruk boşluğu ve ödül hesaplaşması kontrol edilir. Tek iş bütçeyi aşabilir; bu nedenle 3 ms kesin üst sınır değildir.
7. **Bağlantı ve oyuncu durum kaydı:** mevcut oturum/IP sahipliği korumaları ve captcha worker korunur. Presence kayıtlarını keyfi olarak 30 saniye geciktirme veya güvenlik kapsamlarını silme uygulanmadı. Yeniden bağlantıda çift harcama/çift ödül ve eski yanıt tekrarları regresyon testlerine dahildir.
8. **Doğrulama ve teslim:** gerçek native kanal süreçleriyle karma harita/Solo/Kule/Sis Yarığı/Kara Taş/Karanlık Rün ve ortak boss yükü; kurulum/geri dönüş; geliştirme dizini dışından açılış; gerçek dağıtılan dosyalarla PC Efsane/mobil Akademi testleri. Değişiklikler ayrı commitlerdedir.

## Bileşen ölçümü

Bunlar bütün oyun kapasitesi ölçümü değildir; aynı küçük işin beş tekrarındaki medyandır.

| İş | R109 | R110 |
|---|---:|---:|
| 60.000 hazırlanmış sorgu erişimi | 145,1 ms | 62,9 ms |
| 30 parçalı mesajın birleştirilmesi | 154,7 ms | 81,9 ms |
| Aynı mesajlarda büyüyen Buffer.concat kopyası | 862,5 MB | 0 MB |

Yeni yol hâlâ her parçalı mesajı bir sınırlı tampona kopyalar ve JSON ayrıştırır; toplam bellek tahsisinin sıfır olduğu söylenmiyor. Boss bileşeninde 6.000 arka plan canavarı/40 katkı için aynı kayıtlar doğrulandı, ek boss taraması 1 → 0 oldu; tek başına büyük bir oyun hızlanması iddiası yoktur.

## Bütün yük koşuları

Her satır 60 saniyelik ölçümdür; öncesinde ısınma vardır. Tick p99, dört kanalın en yüksek p99 değeridir. `Ana >50` ana süreçteki, `Kanal >50` dört kanalın toplamındaki zamanlayıcı boşluklarıdır; ikinci sayı tek oyuncunun gördüğü benzersiz donma sayısı değildir. Doğruluk geçmesi gecikme hedefinin geçmesi demek değildir.

| Koşu | Kişi | Tick p99 ms | Ana >50 | Kanal >50 | Ana ELU % | CPU steal % | Ana RSS MiB |
|---|---:|---:|---:|---:|---:|---:|---:|
| base10b-10 | 10 | 33.4 | 22 | 12 | 26.8 | 21.1 | 457.5 |
| base30b-30 | 30 | 154.8 | 36 | 61 | 44.9 | 23.2 | 516.3 |
| base40-40 | 40 | 174.4 | 48 | 35 | 42.1 | 17.3 | 491.8 |
| baseboss-40 | 40 | 41.5 | 17 | 26 | 42.0 | 18.3 | 418.9 |
| next10a-10 | 10 | 9.2 | 3 | 4 | 10.8 | 3.0 | 448.9 |
| next10b-10 | 10 | 12.0 | 1 | 2 | 13.0 | 5.5 | 454.1 |
| next30a-30 | 30 | 15.9 | 0 | 1 | 23.8 | 3.8 | 484.6 |
| next30b-30 | 30 | 20.0 | 1 | 9 | 23.8 | 4.9 | 495.2 |
| next40a-40 | 40 | 34.3 | 3 | 12 | 21.8 | 4.1 | 479.7 |
| next40b-40 | 40 | 55.6 | 12 | 11 | 25.3 | 7.5 | 575.4 |
| nextacademy-40 | 40 | 19.5 | 1 | 4 | 27.3 | 4.3 | 517.9 |
| nextboss-a-40 | 40 | 16.5 | 3 | 1 | 22.1 | 4.8 | 408.6 |
| nextboss-b-40 | 40 | 13.3 | 4 | 7 | 22.1 | 3.8 | 407.6 |
| paired-before-40 | 40 | 33.4 | 2 | 8 | 22.7 | 4.5 | 480.2 |
| paired-after-40 | 40 | 28.7 | 2 | 4 | 20.6 | 3.4 | 639.0 |

`base` R109, `next` R110, `paired-before/after` arka arkaya R109/R110. `40a/40b` tek kanala 25 kişi, diğerine 15 kişi yerleştirir; 30 kişilik ve boss testleri dört kanala dengeli dağıtılır. `academy` Akademi dört kanal × 10 kişi sınırını korur.

## R110 tekrarları: medyan / en kötü

| Senaryo | Tekrar | Tick p99 medyan / en kötü ms | Ana >50 medyan / en kötü |
|---|---:|---:|---:|
| 10 karma | 2 | 10.6 / 12.0 | 2.0 / 3 |
| 30 karma | 2 | 18.0 / 20.0 | 0.5 / 1 |
| 40 yoğun kanal | 3 | 34.3 / 55.6 | 3.0 / 12 |
| 40 ortak boss | 2 | 14.9 / 16.5 | 3.5 / 4 |

## Yanıt, GC ve kaynak değerleri

Saldırı sütunu varsa oyuncu girdisinden eşleşen terminal sonuç/reddetmeye kadar en uzun süreyi gösterir. Ön kabul (202) tamamlanmış saldırı sayılmaz. HTTP, sohbet, iksir, hareket ve zindan eşitleme kırılımları `evidence/r110-load-summary.json` içindedir. Oyuncu bazlı p95 değerlerinin en büyüğü, birleşik p95 değildir.

| Koşu | En uzun terminal saldırı ms | En uzun ana duraklama ms | En uzun GC ms | >20 ms GC | nr_throttled fark | throttled ms fark |
|---|---:|---:|---:|---:|---:|---:|
| base10b-10 | 478.7 | 184.3 | 46.7 | 10 | 2 | 46.9 |
| base30b-30 | 2779.3 | 372.2 | 68.3 | 14 | 38 | 1225.8 |
| base40-40 | 1565.0 | 541.6 | 69.1 | 6 | 9 | 253.0 |
| baseboss-40 | 2722.8 | 116.9 | 31.4 | 8 | 13 | 260.7 |
| next10a-10 | 156.2 | 88.5 | 19.4 | 0 | 0 | 0.0 |
| next10b-10 | 247.9 | 56.5 | 54.2 | 4 | 1 | 68.1 |
| next30a-30 | 649.2 | 40.1 | 30.5 | 1 | 0 | 0.0 |
| next30b-30 | 335.6 | 72.7 | 17.5 | 0 | 1 | 42.6 |
| next40a-40 | 375.8 | 131.1 | 14.0 | 0 | 0 | 0.0 |
| next40b-40 | 717.6 | 116.7 | 81.1 | 1 | 1 | 0.1 |
| nextacademy-40 | 394.1 | 59.5 | 30.4 | 1 | 3 | 18.9 |
| nextboss-a-40 | 1549.7 | 57.7 | 21.2 | 1 | 0 | 0.0 |
| nextboss-b-40 | 943.2 | 104.9 | 14.6 | 0 | 0 | 0.0 |
| paired-before-40 | 465.9 | 63.4 | 17.7 | 0 | 1 | 3.7 |
| paired-after-40 | 595.8 | 102.0 | 23.7 | 1 | 0 | 0.0 |

Ayrı tanı koşusunda CPU/allocation profili alındı; tanı koşusu performans kabul tablosuna dahil edilmedi. Sonuçları bütün GC duraklamalarının tek nedeni olarak yorumlanmadı. SQL ayrıntı zamanlaması mevcut sürümde varsayılan kapalıdır; 6 oyunculu canlı profilin kapsayıcı süreleri SQL sarmalayıcısının öz maliyetiyle karıştırılmadı.

## Test kapsamı ve kalan sınırlar

Yük botları ayrı süreçten native HTTP/WebSocket kullanır. 6.000 arka plan canavarı, ekipman/silah gelişimi, canavar ölümü ve ganimet toplama vardır. Lonca/market okuma, görev, sohbet ve iksir istekleri eklenir. Market/lonca düzenlemeleri ve gerçek oyuncu davranış oranları için canlı log veya anonimleştirilmiş canlı DB yoktur; sentetik veridir. Bu çalışma bütün cihazlarda FPS, internet gecikmesi, uzun süreli bellek sızıntısı veya 50/100 oyuncu kapasitesi onayı değildir.

İlk eski-sürüm 30 kişilik deneme botun yasal saldırı bekleme cevabını hata saydığı için durdu. Test istemcisi yalnız açık `basic_attack_cadence` / geçerli `retryAfterMs` cevabına uyarlandı; sunucu sınırı değiştirilmedi. Son karşılaştırmalarda aynı istemci kullanıldı, ilk başarısız kayıt tutuldu.

İlk Solo tarayıcı denemelerindeki sorun testin basılı tut düğmesine çok kısa tıklamasıydı. Arayüz düzenleme kilidi kaldırılmadı. Beceri düğmesine gerçek giriş ile yerel efekt sunucu cevabından önce görüldü. Son test ayrıca onaydan sonra çift efekt olmadığını ve yerel efektin canı değiştirmediğini denetler.


### Özellikle kaydedilen olumsuz sonuç

Arka arkaya 40 kişilik karşılaştırmada tick p99 33.4 → 28.7 ms ve ana ELU %22.7 → %20.6 oldu. Buna karşılık en uzun terminal saldırı yanıtı 465.9 → 595.8 ms, ana RSS tepe değeri 480.2 → 639.0 MiB oldu. Ana süreçte >50 ms boşluk sayısı 2 → 2. Tüm göstergelerin iyileştiği söylenemez. Daha yüksek RSS'nin kalıcı sızıntı olup olmadığı bir dakikalık koşudan çıkarılamaz; major GC sıklığı da bu iki koşuda farklıydı.

Ayrı küçük bellek tanısında değiştirilmiş sorgu/tampon kodu 6 döngüde sınandı (döngü başına 30.000 sorgu, 30 parçalı mesaj). Zorlanmış GC yalnız bu izole tanı sürecinde kullanıldı, oyuna eklenmedi. Sonuç: True. Bu tanı uzun oyun oturumlarında sızıntı bulunmadığı garantisi değildir.
| Son doğrulama aşaması | Sonuç |
|---|---|
| focused | Geçti |
| boss-prewarm | Geçti |
| cold-worker-regression | Geçti |
| native-fixtures | Geçti |
| native-current | Geçti |
| captcha | Geçti |
| package-build | Geçti |
| installer | Geçti |
| runtime-stage | Geçti |
| relocated-runtime | Geçti |
| browser-assets | Geçti |
| browser-r1 | Geçti |
| browser-r2 | Geçti |
| presentation-r1 | Geçti |
| presentation-r2 | Geçti |
| three-browser-tower | Geçti |

r1 gerçek dağıtılan istemci: 300 ms ek gidiş-dönüşte yerel efekt, eşleşen native sonuçtan **548 ms önce**; onaylı görsel sayısı 1. Bu yapay gecikme testidir, canlı ağ ölçümü değildir.

r2 gerçek dağıtılan istemci: 300 ms ek gidiş-dönüşte yerel efekt, eşleşen native sonuçtan **488 ms önce**; onaylı görsel sayısı 1. Bu yapay gecikme testidir, canlı ağ ölçümü değildir.

## Kurulum

Değişen 12 kod dosyası ve ilgili yayın başvuruları güncellenir. Tam veritabanı taraması/sıkıştırması çalışmaz. Bağımsız tek önceki kod yedeği, bakım ayarı ve iki sunucunun sağlık kapısı korunur. Captcha düzeltmesi R109 kaynağından korunur; yeni captcha veya swap ayarı yoktur. Eski ZIP dosyaları/hashleri değiştirilmedi.
