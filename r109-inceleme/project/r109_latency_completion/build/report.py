import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];ev=ROOT/'evidence'
load=lambda n:json.loads((ev/n).read_text())
labels=[f'{v}-{n}' for n in (10,50,100) for v in ('r105','r106')]
if (ev/'r106-academy-10.json').exists():labels.append('r106-academy-10')
lines=['# R106 captcha ve performans incelemesi — 11 Kasım 2026','',
'Captcha çizimi artık veritabanı işlemi ve oyun koordinatörü dışında, sınırlı bir yardımcı iş parçacığında çalışıyor. İlk resmin veritabanı callback süresi bu ölçümde 28,32 ms → 0,60 ms. Bu değişiklik bütün GC/donma kaynaklarının giderildiği anlamına gelmez. **100 oyuncuda tick <20 ms ve sıfır >50 ms duraklama hedefi sağlanmadı.**','',
'## Captcha karşılaştırması','',
'Gerçek native LocalDatabase, WAL ve async fsync; eski/yeni aynı iş yükü, ayrı süreçler. İlk resim ardından üç kez 20 eşzamanlı kayıt resmi; toplam 61 challenge. Aynı sayıda geçerli kayıt, aynı güvenlik kuralları. Timer gecikmesi bu küçük testte 2 ms aralığının üzerindeki gecikmedir; oyun tablosundaki ham timer boşluğuyla birebir aynı metrik değildir.','',
'| Sürüm / aşama | DB callback p95 / max ms | En uzun transaction ms | Ana timer gecikmesi max ms | Yanıt p95 ms | RSS bitiş MiB |',
'|---|---:|---:|---:|---:|---:|']
for version in ('r105','r106'):
 d=load('captcha-benchmark-'+version+'.json');assert d['passed']
 for p in d['phases']:
  lines.append(f"| {version} / {p['phase']} | {p['databaseCallbackP95Ms']:.2f} / {p['databaseCallbackMaxMs']:.2f} | {p['transactionMaxMs']:.2f} | {p['timerDelayMaxMs']:.2f} | {p['requestP95Ms']:.2f} | {p['memoryAfter']['rss']/2**20:.1f} |")
lines+=['','İlk worker açılışı yanıtı yaklaşık 31 → 100 ms uzattı; sıcak 60 istekte toplam süreç CPU süresi 443 → 547 ms, bitiş RSS farkı yaklaşık 15 MiB. Amaç çizim işini oyun döngüsünden ayırmaktır; toplam CPU azalması iddiası yoktur. Worker tembel açılır, kuyruk 128 istekle ve istek ömrü 10 saniyeyle sınırlıdır. Worker başarısızlığında ana süreçte senkron çizime dönülmez.','',
'## 10 / 50 / 100 oyuncu','',
'200 oyuncu denenmedi. Efsane: dört gerçek kanal süreci, 25/kanal; 10 saniye ısınma ve 60 saniye ölçüm. Beşli kule grupları hareket eder, saldırır, ödül alır ve otomatik kat değiştirir. Yalnız test oyuncusu HP ve düşman HP/hasarı fixture değeridir. Botlar aynı makinede ve ana test sürecinde çalışır; CPU ve bellek bot maliyetini de içerir. Bunlar canlı VDS kapasite veya tarayıcı FPS ölçümleri değildir. Normal kule koşusu captcha üretmez; bu tablo captcha hızlanmasını ölçmek için kullanılmaz.','',
'Dört çekirdek CPU kotası. CPU sütunu bütün izlenen süreçlerin toplam tüketiminin bu kotaya oranıdır; ELU ana olay döngüsünün meşguliyetidir. Tick p95/p99 sütunu dört kanalın en yüksek değeridir. RAM ana süreç RSS / izlenen süreçlerin tepe RSS toplamıdır; ikinci sayı eşzamanlı kesin tepe değildir. >50 ms sayıları ham timer gözlemidir; histogram ayrıca aynı olayı yakalayabildiğinden sayılar toplanmaz. En uzun duraklama timer/histogram maksimumudur.','',
'| Deneme | Tick p95 / p99 ms | Tick max ms | >50 ms ana / kanallar | Ana max ms | ELU | CPU / 4 çekirdek | RAM ana / toplam MiB |',
'|---|---:|---:|---:|---:|---:|---:|---:|']
for label in labels:
 d=load(label+'.json');assert d['passed'];s=d['summary'];r=s['resources']
 lines.append(f"| {label} | {s['tickP95Ms']:.2f} / {s['tickP99Ms']:.2f} | {s['maxTickMs']:.2f} | {s['mainPausesOver50Ms']} / {s['channelPausesOver50Ms']} | {s['mainMaxPauseMs']:.2f} | {s['mainElu']:.1%} | {r['totalCpuFraction']:.1%} | {s['mainMaxRssBytes']/2**20:.0f} / {r['maxRssBytes']/2**20:.0f} |")
lines+=['','Her koşuda bütün hesaplar bağlı kaldı; komut/native hata ve bekleyen işlem görülmedi. Akademi 10/kanal kapasitesi korunarak 10 oyuncuyla ayrıca sınanır; 50/100 için kapasite koruması kaldırılmaz. İşlevsel başarı, performans hedefinin sağlandığı anlamına gelmez.','',
'İlk R106 100 oyuncu denemesinde 182 ms Scavenge ve 210 ms ana gecikme görüldü. Eski sürümün GC kayıtlı tekrarında da 117,60 ms Scavenge ve 209,62 ms ana gecikme görüldü. Captcha üretilmeyen bu koşulda farkı captcha değişikliğine bağlamak doğru olmaz. Testleri yalnız iyi sonuçları seçmeden aşağıda koruduk. CPU kotası nedeniyle throttling de görüldü; herhangi bir gecikme sonuçtan çıkarılmadı.','',
'## Son altı önerinin incelemesi','',
'### 1. GC türü ve 32 MB denemesi','',
'Yerel süreçler gerçek `--trace-gc` ile çalıştırıldı; ayrıca PerformanceObserver GC türü ve süresini ölçtü. Canlı VDS’ye kabuk erişimi olmadığı için **canlıda bir saatlik trace alınmadı**. Aşağıdaki ek koşular 100 oyuncu / 60 saniyedir. Allocation satırında inspector CPU ve allocation örneklemesi ek yük oluşturur; normal hız karşılaştırmasına katılmamalıdır.','',
'| Koşu | Scavenge adet / max ms | Major GC max ms | Ana >50 ms | Ana max ms | Ana RSS MiB |',
'|---|---:|---:|---:|---:|---:|']
audit=load('gc-allocation-audit.json')
for label in ('r105-trace','r106-trace','r106-semi32','r106-allocation'):
 row=next(r for r in audit['gcRuns'] if r['file']==label+'-100.json');s=row['summary'];minor=next(g for g in row['groups'] if g['kind'].startswith('minor'));major=next(g for g in row['groups'] if g['kind'].startswith('major'))
 lines.append(f"| {label} | {minor['count']} / {minor['maxMs']:.2f} | {major['maxMs']:.2f} | {s['mainPausesOver50Ms']} | {s['mainMaxPauseMs']:.2f} | {s['mainMaxRssBytes']/2**20:.0f} |")
lines+=['','32 MB denemesinde küçük GC sayısı azaldı; en uzun küçük GC iyileşmedi, >50 ms gecikme devam etti ve bellek arttı. Bu tek çift koşu genel iyileşmeyi veya güvenli canlı kapasiteyi kanıtlamaz. Canlı Node ayarı değiştirilmedi. Uzun yerel örnekler Scavenge idi; Major GC kaynaklı büyüyen nesne/sızıntı kanıtı yok. Canlı heap snapshot alınmadı.','',
'### 2. drainWrites allocation','',
f"100 oyuncuda 32 KiB örnekleme aralığıyla toplam yaklaşık {audit['sampledAllocationBytes']/2**30:.2f} GiB tahmini kümülatif allocation örneklendi. Bu tutar tutulan heap/RAM değildir. drainWrites altındaki tahmini pay {audit['inclusiveAllocationBytes']['drainWrites']/audit['sampledAllocationBytes']:.1%}. En büyük kalemler aşağıdadır; wrapper adı, alttaki native SQLite sonucunun nesne üretimini de gösterebilir.",'',
'| drainWrites altındaki kaynak | Tahmini kümülatif MiB |','|---|---:|']
for row in audit['allocationUnderDrainWrites'][:6]:lines.append(f"| {row['function']} — {row['file'].split('/')[-1]}:{row['line']} | {row['estimatedBytes']/2**20:.1f} |")
lines+=['','Toplam örnekte ws.onMessage, istemci dünya birleştirme ve client-transport yüksek pay taşıyor: test botları ana süreçtedir. Bu nedenle bu allocation miktarları canlı sunucuya aynen taşınamaz. Dünya/market/lonca isimli koruma kapsamları diğer işlemleri de sarar; o isimlerin stack içinde olması bu kayıtların donmanın asıl kaynağı olduğunu kanıtlamaz. “Bütün GC donmaları drainWrites/world-market-guild yüzünden” sonucu doğrulanmadı. Atomik kayıt ve tekrar işleme korumaları kaldırılmadı.','',
'### 3. SQLite ve COMMIT','',
'İncelenen native yazıcı WAL kullanıyor. Async WAL senkronizasyonu açıkken synchronous=NORMAL (1); yanıt yine fsync sonucunu bekliyor. Hata durumunda FULL’a dönüş var. Focused gerçek LocalDatabase testinde WAL/NORMAL ve asyncWal=true okundu. Canlı bağlantının PRAGMA değeri uzaktan ayrıca okunmadı. drainWrites zaten en fazla 8 işi veya yaklaşık 3 ms iş bütçesini bir transaction içinde topluyor; her işin SAVEPOINT’i ayrı hata geri dönüşünü koruyor. Yeni COMMIT/ACK gevşetmesi yapılmadı.','',
'### 4. Retaliation ve reward sorguları','',
'nativeAtomicStatements bağlantı başına en fazla 512 SQL kalıbını, reward-sql-r531 ise sınırlı statement ve ödül tarifi önbelleğini zaten kullanıyor. Saldırı/ölüm/ödül işlemleri sahiplik, HP/ekipman güncelliği ve tek ödül garantisiyle sıralanıyor. “Her saldırıda aynı iki sorgu bağımsız COMMIT ediyor” varsayımı doğrulanmadı. Bunları tick sonuna ertelemek veya tek sorguya sıkıştırmak mevcut doğruluk kanıtını korumadan yapılmadı.','',
'### 5. Prepare önbelleği','',
'Son gönderilen 1 oyunculu CPU dosyasında native prepare örneklenmiş süresi yaklaşık 25,16 ms; 170 ms/dakika bu dosyada doğrulanmadı. 100 botlu ve inspector açık farklı yükte bu sayı doğal olarak daha yüksek; birebir canlı karşılaştırma değildir. actor-checkpoint bağlantı başına prepared handle ve değişen sütun kalıbı önbelleği kullanıyor. prepareCached477 256 giriş/512 KiB sınırına ve şema/rollback doğrulamasına sahip. bot-check temel sorguları baştan hazırlanıyor. NativeBotCheck.refresh içindeki iki ek okuma profilin başlıca sıcak noktası değil. Şema koruması kaldırılmadı, sonuç verisi cache’lenmedi.','',
'### 6. Süreçler arası mesajlar','',
'ProcessStream._writev mevcut yazı gruplarını tek pipe mesajına topluyor; R105 aynı yanıtın JSON metnini tekrar kullanıyor. Tick başına bütün kontrol/ACK mesajlarını bekletmek gecikme, sahiplik devri ve tekrar gönderim davranışını değiştirir. Bu değişiklik uygulanmadı; mevcut çerçeve, boyut, sıra ve idempotent tekrar kontrolleri korundu.','',
'## Tek oyunculu canlı CPU dosyası','',
'60,45 saniyelik dosyanın inspector başlangıcı çıkarıldığında örneklenmiş non-idle payı yaklaşık %2,88. Eski dosya 10 oyunculu olduğundan yüzdelik iyileşme veya oyuncu başına doğrusal kapasite hesabı yapılamaz. Yaklaşık 103 ms ardışık GC örneği görülüyor; CPU dosyası tek başına kesin event-loop duraklaması veya GC kökeni kanıtlamaz. Tick ve RAM bu dosyada yoktur. Ayrıntı: ../r105_postinstall_profile/RAPOR.md.','',
'Ham kanıtlar evidence/ altında korunur: r105/r106-10/50/100.json, captcha-benchmark-*.json, GC trace logları, r106-allocation-100.heapprofile/.cpuprofile ve gc-allocation-audit.json. Dağıtılan oyun kodunda kalıcı profil/trace veya 32 MB bayrağı açılmaz.']
isolated=['r106-isolated-10','r106-isolated-50','r105-isolated-100','r106-isolated-100']
if all((ev/(name+'.json')).exists() for name in isolated):
 section=['## Botlar ayrı süreçte: sunucu ölçümü','',
 'Allocation bulgusu üzerine botlar ayrı Node sürecine/heap’e taşındı. Üretim kodu değişmeden aynı oyun, dört kanal ve native HTTP/WebSocket işlemleri kullanıldı. Sunucu tarafındaki yerel test bağlantı geçidi ölçüme dahildir. CPU kotası hâlâ aynı makinede paylaşılır; bu da canlı VDS kapasite garantisi değildir. Aşağıdaki sunucu RAM/CPU değerlerine ayrı bot süreci dahil değildir; onun RAM’i son sütundadır. Her koşu 10 saniye ısınma +60 saniye ölçümdür. 10 saniyelik harness ön kontrolü performans tablosuna alınmadı.','',
 '| Koşu | Tick p95 / p99 ms | >50 ms ana / kanallar | Ana max ms | Ana ELU | Sunucu CPU / 4 çekirdek | RAM ana / sunucular / bot MiB |',
 '|---|---:|---:|---:|---:|---:|---:|']
 for name in isolated:
  d=load(name+'.json');assert d['passed'];s=d['summary'];r=s['resources']
  section.append(f"| {name} | {s['tickP95Ms']:.2f} / {s['tickP99Ms']:.2f} | {s['mainPausesOver50Ms']} / {s['channelPausesOver50Ms']} | {s['mainMaxPauseMs']:.2f} | {s['mainElu']:.1%} | {r['totalCpuFraction']:.1%} | {s['mainMaxRssBytes']/2**20:.0f} / {r['maxRssBytes']/2**20:.0f} / {d['botDriver']['maxRssBytes']/2**20:.0f} |")
 section+=['','Bu ayrım test istemcisinin GC’sini sunucudan ayırır. Oyuncu başına CPU yüzdesiyle doğrusal kapasite tahmini yapılmaz; bütün işlevsel koşular ve kalan gecikmeler birlikte raporlanır.','']
 at=lines.index('## 10 / 50 / 100 oyuncu');lines[at:at]=section
 lines[lines.index('## 10 / 50 / 100 oyuncu')]='## İlk karşılaştırma: botlar aynı süreçte'
(ROOT/'PERFORMANS_RAPORU.md').write_text('\n'.join(lines)+'\n')
print('report written; runs',len(labels))
