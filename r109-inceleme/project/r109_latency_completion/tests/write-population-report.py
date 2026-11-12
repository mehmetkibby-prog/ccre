"""Generate measured tables without rounding away adverse runs."""
import json,csv
from pathlib import Path
root=Path(__file__).resolve().parents[1]
r=json.loads((root/'evidence/population-summary.json').read_text());g=r['groups']
text='''# R107 — 30/40 oyuncu incelemesi

**Sonuç: 30–40 oyuncuda hiç takılma olmayacağı doğrulanamadı.** Seçilen R106 paketinde
kısa gecikmeler ölçüldü. Kule/Sis Yarığı oda kontrolündeki tekrarlı dünya taraması
azaltıldı; bu bileşenin yoğun oda maliyeti düştü. Ancak tüm oyun için belirgin bir
gecikme iyileşmesi kanıtlanmadı; bazı 40 oyuncu sonuçları kötüleşti. Bu paket bir
“sıfır lag” çözümü olarak sunulmamalıdır.

## Kaynak ve kapsam

- Kullanıcının seçtiği **R106_CAPTCHA1** esas alındı; yüklenen ZIP'in SHA256 değeri
  `6c8a931dfa7da3cdaf054d5c2c5715103abfa35024ff422402a9aaa734d22d2a` olarak doğrulandı.
- R106_READY1, sürekli canlı metrik servisi, swap ayarı ve yeni Node bellek bayrakları eklenmedi.
- R106 üzerine yalnız `adventure-channel.mjs` oda taraması ve sağlık yanıtındaki
  `populationStability: R107_POPULATION1` işareti değişir. R105'ten kurulumda seçilen
  R106 captcha düzeltmesi de dahildir. Hasar, ganimet, kayıt biçimi, SQL
  dayanıklılığı, saldırı sırası, IP kuralı ve giriş izinleri değiştirilmedi.
- Efsane ve Akademi aynı kodu kullanır. Kurulum iki sunucu/dört kanal ve hesap
  servisini doğrular; bu rapor canlıya kurulum yapıldığı anlamına gelmez.

## Test ortamı ve sınırları

Yerel cgroup kotası **4 CPU**, bellek sınırı 32 GiB. Kullanıcının canlı VDS'i
8 CPU/12 GB'dir; aynı donanım değildir. Oyun ve ayrı bot süreci aynı kota altındadır.
Her karşılaştırma 10 saniye ısınma ardından 60 saniye ölçümdür. Koşular sıralı
çalıştırıldı. Sentetik veri kullanıldı: 6000 ek arka plan canavarı ve gerçek yerel
oyun tabloları. Canlı veritabanının anonim kopyası veya canlı davranış oranları yoktur.

Gerçek dört kanal süreci, dünya süreci, okuyucu worker, native oyun kuralları,
SQLite WAL, HTTP ve WebSocket akışı kullanıldı. Test köprüsü yereldir; internet,
VDS nginx/TLS, oyuncu cihazının çizim FPS'i veya çok sayıda gerçek tarayıcının GPU
maliyeti ölçülmedi. Dünya grafiği ve içerik çeşitliliği canlı veriye eşdeğer kabul edilmez.

Karma senaryo: Orman, Kara Taş bölgesi, Karanlık Rün Sahili, Kadim Kule, Solo
Zindan ve Sis Yarığı. Normal saldırı, hareket, iksir, sohbet, lonca/görev/pazar
HTTP okumaları vardır. Bu senaryo bütün becerilerin, PvP'nin, ticaretin ve her
menünün aynı anda kalabalık yükte denendiği anlamına gelmez. Ödül ve ticaretin
atomikliği ayrıca davranış testleriyle kontrol edilir.

30 oyuncuda bölge dağılımı: 8/4/4 normal bölge, 6 kule, 4 Solo, 4 Sis.
40 oyuncuda normal Orman 8, Kara Taş 4, Rün 4; kule/Solo/Sis sekizer.
Karma kule oyuncuları aynı kanalda grupludur. Ayrıca 40 ayrı kule odası testi
vardır: kanal başına 10 oda, kabul kapasitesi artırılmadan. Akademi 10, Efsane
25 kişi/kanal sınırları değiştirilmedi. Solo oyuncuları gerçek 1120,2 can ve
normal iksirle yaşatılır; 60 saniyelik karma test tüm Solo zindan turu değildir.

## Üç tekrarlı Efsane karşılaştırması

Hücreler **medyan / en kötü koşu** şeklindedir. Tick, kanal oyun döngüsünün
çalışma süresidir; her koşuda dört kanalın en yüksek yüzdelik değeri alınır. Ağ
yanıt süresi değildir. Ana süreç >50 ms sayısı dakikalık
olay döngüsü duraklamasıdır. Bunlar GC olarak etiketlenmez.

| Sürüm | Oyuncu | Tick p95 ms | Tick p99 ms | Ana süreç >50 ms/dk | En uzun ana duraklama ms |
|---|---:|---:|---:|---:|---:|
'''
def pair(a,d=2):return f"{a['median']:.{d}f} / {a['worst']:.{d}f}"
for x in g:text+=f"| {x['version'].upper()} | {x['players']} | {pair(x['tickP95Ms'])} | {pair(x['tickP99Ms'])} | {pair(x['mainPausesOver50Ms'],0)} | {pair(x['mainMaxPauseMs'])} |\n"
text+='''
**Olumsuz sonuç:** 40 kişide R107 ana süreç >50 ms duraklamalarının medyanı
1'den 3'e, en kötü koşusu 2'den 6'ya çıktı. Kanal duraklama toplamı da arttı.
Bu sonuçlar saklanmadı veya yalnız iyi koşular seçilmedi. Genel oyun gecikmesinin
azaldığı iddia edilmiyor. Aynı anda bağımsız süreçlerde görülen duraklamalar ve
cgroup kısıtlamaları ortak zamanlama etkisine işaret eder; her gecikmenin
ortamdan kaynaklandığını kanıtlamaz.

| Sürüm | Oyuncu | Kanal >50 ms toplam/dk | Ana ELU % medyan/en kötü | Ana RSS MiB medyan/en kötü | Kota nedeniyle bekleme ms medyan/en kötü |
|---|---:|---:|---:|---:|---:|
'''
for x in g:
 elu={k:v*100 for k,v in x['mainElu'].items()};rss={k:v/1048576 for k,v in x['mainMaxRssBytes'].items()}
 text+=f"| {x['version'].upper()} | {x['players']} | {pair(x['channelPausesOver50Ms'],0)} | {pair(elu)} | {pair(rss,1)} | {pair(x['throttledMs'])} |\n"
text+='''
Kanal sayıları aynı fiziksel duraklamayı birden çok kez içerebilir; benzersiz
oyuncu kesintisi sayısı değildir. R107 30 kişi bir koşuda kanal azami duraklama
265,42 ms, ana süreç 196,35 ms; aynı koşuda ana GC azami 27,26 ms ölçüldü.
Bu uzun gecikme “GC tamamen düzeldi” veya “sadece GC sorunu” sonucunu desteklemez.

## Komut gecikmesi

Komutun gönderilmesinden cevabına kadar, yerel test köprüsü dahil süre de
ölçüldü. Her koşunun en yüksek oyuncu p95'i alındığında, üç tekrarın
medyanı/en kötüsü şöyledir:

| Oyuncu | R106 komut p95 ms | R107 komut p95 ms |
|---|---:|---:|
| 30 | 155,24 / 186,50 | 152,92 / 154,37 |
| 40 | 172,99 / 253,36 | 191,62 / 207,05 |

40 oyuncuda medyan komut gecikmesi de artmıştır; bunu genel iyileşme diye
sunmak doğru olmaz. Bütün final tekrarlar sonunda bekleyen öldürme kaydı
sayısı sıfırdı. Gerçek internet gecikmesi bu ölçüme dahil değildir.

## Tek koşulu ek kontroller

Bunlar üç tekrarlı sonuçların yerine geçmez; iki realm aynı anda 40+40 kişiyle
çalıştırılmış değildir. Üretim ortamının kapasite garantisi olarak okunmamalıdır.

| Senaryo | Oyuncu | Tick p95 ms | Tick p99 ms | Ana >50 ms/dk | Kanal >50 ms toplam/dk | Ana azami duraklama ms |
|---|---:|---:|---:|---:|---:|---:|
'''
labels={'r105-control':'Mevcut R105 / Efsane karma','r106-academy':'R106 / Akademi karma','r107-academy':'R107 / Akademi karma','r106-separate-towers':'R106 / Efsane ayrı kuleler','r107-separate-towers':'R107 / Efsane ayrı kuleler'}
for prefix,label in labels.items():
 x=next(x for x in r['runs'] if x['file'].startswith(prefix))
 text+=f"| {label} | {x['players']} | {x['tickP95Ms']:.2f} | {x['tickP99Ms']:.2f} | {x['mainPausesOver50Ms']} | {x['channelPausesOver50Ms']} | {x['mainMaxPauseMs']:.2f} |\n"
text+='''
Son kabul edilen karma/ek koşuların tümünde bot komut hatası ve kanal arızası
listeleri boş; bütün aktörler ölçüm sonunda hazırdı. Bu, her olası oyuncu
sorununun yokluğu anlamına gelmez. İlk 12 karşılaştırmada sürekli soket kapanma
sayacı yoktu; bu nedenle yalnız bu koşul sonlarından “hiç kopma olmadı” sonucu
çıkarılmaz. Sonraki ek koşul ve üç tarayıcı testinde ayrıca soket kapanması izlenir.

## Doğrulanmış dar düzeltme

Önce her oda tüm dünya canavarlarını tekrar diziye çevirip süzüyordu. Şimdi bir
senkron tur içinde üyeler ve canlı canavarlar bir kez gruplanır. Tur dışında
saklanan önbellek yoktur: sonraki turda ölüm/kat/üyelik değişiklikleri yeniden
okunur. Oda, sahiplik ve bekleyen işlem sırası korunur. Savaş/ödül işlemleri
ve veritabanı yazma garantileri gevşetilmedi.

Bileşen testi, 500 tur toplamı (aynı işlemlerin eski/yeni sürümü):

| Oda / oyuncu / canavar | R106 ms | R107 ms |
|---|---:|---:|
'''
b=json.loads((root/'evidence/adventure-scan-benchmark-valid-capacity.json').read_text())
for a,z in zip(b[::2],b[1::2]):text+=f"| {a['rooms']} / {a['players']} / {a['size']} | {a['ms']:.2f} | {z['ms']:.2f} |\n"
text+='''
8 oda/6032 canavarda bu bileşen yaklaşık 4,7 kat, 10 bağımsız odada yaklaşık
2 kat hızlandı. İki odada daha yavaş: tur başına yaklaşık 0,035 → 0,048 ms.
Bunlar **bileşen sonuçlarıdır**, tüm oyunun 4,7 kat hızlandığı anlamına gelmez.
Kanal kabul sınırını aşan eski 40 odalı mikro stres testi kanıtlarda tutuldu,
ancak kapasiteyi temsil eden ana sonuç olarak kullanılmadı.

300 rastgele durum karşılaştırması, sekiz tur boyunca veri değişimleri ve
canavar listesinin tek kez gezilmesi kontrol edildi. Ölüm/çıkış, zaman aşımı,
Azrail/mühür, hazır olmayan üye, kat geçişi ve bekleyen işlem kararları eskiyle
eşleşti. Genel kodun tamamı değil, değiştirilen karar yolu için eşdeğerlik kanıtıdır.

## Yerel CPU tanı kaydı

Ayrı 40 oyuncu koşusunda yalnız tanı için CPU profili alındı; karşılaştırma
medyanlarına dahil edilmedi. Yaklaşık 60,24 saniyede 45,89 saniye idle;
writeBuffer 1155,6 ms, GC 1008,7 ms, SQL run/get/all toplam yaklaşık 2264 ms,
prepare 506 ms görüldü. drainWrites dahil yığın 4985 ms; bu kapsayıcı süre
alt işlerle üst üste gelir ve ayrıca toplanamaz. Profiler başlangıcındaki
213 ms boşluk ölçüm penceresi dışındadır; oyun takılması diye sayılmadı.

Tek bir değişiklikle kalan uzun kuyrukları giderecek kesin bir sebep
kanıtlanmadı. Bu nedenle ödül/sahiplik sınırları, transaction biçimi veya
süreç mimarisi tahminle değiştirilmedi. Canlıdaki eski 1/5 oyuncu profilleriyle
bu sentetik yük doğrusal biçimde karşılaştırılamaz.

## Doğrulama ve başarısız denemeler

Kesin son kontrol sonuçları `evidence/release-validation.json` kaydında tutulur.
Paket teslimi öncesi bu kayıt oluşturulmalı; şu dosya tek başına test başarı
iddiası değildir. Ham loglar `evidence/validation-*.log` altındadır.

İlk geniş native test çalıştırmasında 29 testin 15'i başarısızdı. Aynı 15 hata,
değiştirilmemiş R106'da da üretildi. Eski testler eksik kule/çanta şeması,
R102 öncesi stat beklentisi, artık zorunlu kanal seçiminden önce bilet isteği
ve canlı canavar görüntüsünü atlayan doğrudan SQL değişikliği kullanıyordu.
Üretim davranışı değiştirilmedi; `tests/prepare-native-regression.py` yalnız
ayrı test kopyalarını günceller. İlk uyarlanmış çalışmada eksik çanta indeksi
bir testte kaldı; gerçek açılış şema kurulumunu ekleyince o test geçti.
Başarısız loglar korunur. Kule testi artık canavarı gerçek saldırılarla öldürür.

İlk yük denemelerinde geçersiz sentetik Rün canavarı kimliği, eksik HTTP
parametresi, normal bekleyen öldürme yanıtını hata sayma ve Solo oyuncusunun
ölümünden sonra iksir kullanma sorunları vardı. Bunlar test sürücüsünde
düzeltildi; final karşılaştırmaya farklı/bozuk senaryolar karıştırılmadı.
Üretimde ölüm veya tekrar saldırı kontrolleri kaldırılmadı.

## Canlı için çıkarım

Bu çalışma kalabalıkta belirli bir gereksiz işi azaltır; internet/cihaz
dahil sorunsuzluk garantisi vermez. Özellikle 40 oyuncuda olumsuz kuyruk
ölçümleri nedeniyle R107 geniş performans sorunlarını çözmüş kabul edilmemelidir.
Canlı 30–40 oyuncu için kesin kapasite beyanı, aynı donanım ve gerçekçi anonim
veriyle daha uzun tekrarlı ölçüm olmadan yapılamaz. Hedeflenen “50 ms üstü
hiç donma yok” koşulu sağlanmadı.

Ham tekrarlar: `r106-repeat-r1-run{1,2,3}-{30,40}.json` ve
`r107-repeat-r1-run{1,2,3}-{30,40}.json`. Özet: `population-summary.json`.
Ekler: `*-academy-*.json`, `*-separate-towers-*.json`, `r105-control-*.json`,
`cpu-audit-summary.json`, `adventure-scan-benchmark-valid-capacity.json`.
Bütün yollar bu çalışma dizininin `evidence/` klasörüne göredir.
'''
validation=root/'evidence/release-validation.json'
if validation.exists():
 v=json.loads(validation.read_text())
 text+='\n## Tamamlanan son işlev kontrolleri\n\n'
 text+='24 oda/bağlantı testi, güncel test tablolarıyla 29 native kural/ganimet/ödül/ticaret testi, '
 text+='20 captcha ve 26 kurulum/geri dönüş testi geçti. Gerçek kurucu çıktısıyla iki realm ve sekiz '
 text+='kanal açıldı; Efsane PC ve Akademi mobil karakter→kanal→dünya girişleri ve zorunlu '
 text+='bağlantı kaybından sonra kule toparlanması geçti. Üç ayrı tarayıcı/üç hesap aynı grupta '
 text+='10 kata otomatik çıktı; hata ve beklenmeyen soket kapanması görülmedi. Bu son kule '
 text+='testi düşük canlı canavar test ayarı kullanır; normal zorluk veya kalabalık grafik FPS ölçümü değildir.\n\n'
 text+='İşlev kontrollerinin geçmesi, yukarıdaki olumsuz performans sonuçlarını geçersiz kılmaz. '
 text+='Canlı kurulum yapılmadı. Dağıtılan son ZIP ile tarayıcıda test edilen ZIP arasındaki '
 text+='fark yalnız belgelerdedir; bütün çalıştırılabilir dosyalar, plan ve kurucu modülleri '
 text+='birebir karşılaştırılır ve release-validation.json kaydına işlenir.\n'
(root/'PERFORMANS_RAPORU.md').write_text(text)
keys=['file','realm','players','tickP95Ms','tickP99Ms','maxTickMs','mainMaxPauseMs','mainPausesOver50Ms','channelPausesOver50Ms','mainElu','mainMaxRssBytes','mainCpuPercent','throttledMs','passed']
with (root/'evidence/population-results.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=keys,extrasaction='ignore');w.writeheader();w.writerows(r['runs'])
print('Report and all-run CSV written:',len(r['runs']),'runs')
