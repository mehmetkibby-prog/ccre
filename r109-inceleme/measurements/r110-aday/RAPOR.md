# R110 adayı — takılma/gecikme incelemesi (R109_LATENCY2 üzerinde)

Başlangıç: `r109-inceleme/project/r109_latency_completion/working` (R109_LATENCY2).
Kurulum paketi ayrı: `project/r110_takilma/` (aşağıda). Eski ZIP'ler, R109
manifesti ve SHA256 kimlikleri değişmedi. Canlı VDS'ye hiçbir şey uygulanmadı. Bütün sayılar bu
çalışma ortamındaki **sentetik** yük testinden (4 çekirdek bütçe, botlar ayrı
süreçte, `steal` ≈ %1,5) gelir; canlı kapasite garantisi değildir.

## Kısa sonuç

1. **Oyuncu WebSocket trafiği tek iş parçacıklı ana süreçten geçiyordu.**
   Üretim giriş katmanı (`runtime-ingress.mjs`) her `/game/channel/N`
   bağlantısını kanal portuna TCP ile vekilliyordu; bütün oyuncu baytları
   SQLite yazıcısı/koordinatörün çalıştığı ana süreçte okunup yeniden
   yazılıyordu. Ana süreç bir GC/SQLite işinde 50–70 ms durduğunda **bütün
   kanalların oyuncu trafiği de duruyordu**. Canlı 6 oyunculu profilde bu
   aktarım örneklenmiş ana iş parçacığı zamanının ~%1,6'sı (~0,97 s/dk; saf
   `pipe` kısmı ~0,65 s/dk), yani ana meşguliyetin ~%7'si. Düzeltme: doğrulanan
   soket IPC ile kanal sürecine devredilir (53d7299).
2. **SQL derleme tekrarları** (40 oyuncuda dakikada 12.902 native derleme)
   üç küçük değişiklikle 5.248'e indi (−%59). CPU etkisi küçüktür (derleme
   süresi 777 → 613 ms/dk); tick'te ölçülebilir değişim yok.
3. **Test aracı hatası:** kanal süreçleri ws modülünü `file://` URL'siyle
   içe aktarınca yükleyici eşleyemiyordu; captcha 9/20 ve native 5/29 bu
   yüzden kırılıyordu (cff72b2). Oyun koduna dokunmadı.
4. Devretmenin ilk tasarımında **veri kaybı yarışı** bulundu ve kapatıldı:
   Node'da `pause()` okumayı durdurmaz, gönderilen tutamağın bu taraftaki
   okumaları atılır. Göndermeden önce `readStop` çağrılıyor; prototipte
   `readStop` olmadan ilk çerçeve her seferinde kayboldu, onunla ulaştı.

5. **Ölçülen etki (sentetik):** ana süreç olay döngüsü yükü her oyuncu
   sayısında %6–13 düştü; komut yanıtı p95 medyanı 50 oyuncuda −%11, 100'de
   −%19, ortak bossta −%30. Kanal tick'i 10–50 oyuncuda değişmedi; 100
   oyuncuda (4 vCPU doymuş) bir çiftte +6 ms. Toplam CPU değişmedi. Doğruluk
   denetimleri (ödül/ÇP/eşya, boss tek-sefer makbuzları) bütün koşularda
   geçti; tek `passed:false` test botunun ritim yanıtından (B5).

## Ölçüm sonuçları (sentetik, bu ortam)

Ölçüm düzeneği: `tests/population-load.mjs` (R109 ile aynı), 60 s ölçüm
penceresi, 6.000 arka plan canavarı, ekipmanlı botlar ayrı süreçte, karışık
mod normal haritalar + Kadim Kule + Solo Zindan + Sis Yarığı + Kara/Rün
bölgelerini içerir; ortak boss ayrı moddur. Kabul sınırı açık (r1 4×25, r2
4×10). Metrikler birbirinden farklıdır: tick = kanal simülasyon adımı süresi;
ana ELU = ana olay döngüsü doluluğu; duraklama = olay döngüsü gecikmesi;
komut yanıtı = botun `command()` gönderiminden yanıta kadar (kalıcı sonuç yolu
dahil); mesaj aralığı = istemciye gelen ardışık sunucu mesajları arası süre.

### A. Aynı ağaç, yalnız taşıma farkı (karışık sıra, aynı botlar)

| r1 karışık | n | tick p99 (ms) | ana ELU % | ana en uzun duraklama (ms) | ana >50 ms | kanal >50 ms | komut p95 medyan (ms) | komut en kötü (ms) | mesaj aralığı p99 medyan (ms) | en uzun mesaj boşluğu (ms) | >150 ms boşluk (adet) | kanal ELU top. % | toplam CPU % | geçti |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| TCP vekili (=0) · 50 | 2 | 25,4 | 39,1 | 43,6 | 0/0 | 0/0 | 161,3 | 783,0 | 392,4 | 1096,5 | 5369/5379 | 83,2 | 46,5 | 2/2 |
| devretme · 50 | 2 | 25,1 | 36,3 | 37,9 | 0/0 | 0/0 | 143,9 | 971,8 | 409,8 | 1053,5 | 5565/5461 | 82,2 | 46,5 | 2/2 |
| TCP vekili (=0) · 100 | 2 | 45,0 | 69,9 | 68,2 | 4/7 | 1/2 | 285,5 | 1354,9 | 302,7 | 1122,1 | 7859/7813 | 134,4 | 64,5 | 2/2 |
| devretme · 100 | 2 | 47,9 | 63,9 | 83,6 | 3/4 | 0/0 | 230,4 | 1349,3 | 299,1 | 1047,5 | 7345/8032 | 137,1 | 63,3 | 2/2 |

### B. Aynı ağaç, bayrak A/B (karışık sıra; bu koşularda mesaj aralığı ölçümü henüz yoktu)

| 50 oyuncu, r1 karışık | n | tick p99 (en kötü kanal, ms) | kanal p99 ort. (ms) | en uzun tick (ms) | ana ELU % | ana en uzun duraklama (ms) | ana >50 ms | kanal >50 ms | komut yanıtı p95 medyan (ms) | komut yanıtı en kötü (ms) | toplam CPU % | kanal ELU toplamı % | geçti |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| ikisi kapalı | 2 | 27,1 | 26,0 | 62,6 | 41,6 | 56,9 | 2/1 | 1/0 | 181,7 | 1116,8 | 48,2 | 86,5 | 1/2 |
| yalnız devretme | 2 | 30,7 | 28,3 | 68,0 | 37,7 | 57,1 | 1/1 | 0/0 | 167,2 | 904,5 | 46,6 | 87,8 | 2/2 |
| ikisi açık | 2 | 27,5 | 26,5 | 65,8 | 36,9 | 63,9 | 1/1 | 0/0 | 156,9 | 1132,1 | 46,0 | 84,7 | 2/2 |

"İkisi kapalı" koşularından biri botun yasal ritim yanıtını hata sayması
yüzünden `passed:false` (B5); metrikleri tabloda bırakıldı.

### C. R109 tabanı ↔ aday (karışık sıra, her biri 1 koşu)

| karışık mod (boss ayrı) | n | tick p99 (en kötü kanal, ms) | kanal p99 ort. (ms) | en uzun tick (ms) | ana ELU % | ana en uzun duraklama (ms) | ana >50 ms | kanal >50 ms | komut yanıtı p95 medyan (ms) | komut yanıtı en kötü (ms) | toplam CPU % | kanal ELU toplamı % | geçti |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| R109 · 10 · r1 | 1 | 9,2 | 7,9 | 17,8 | 13,5 | 25,4 | 0 | 0 | 91,0 | 154,6 | 20,2 | 32,0 | 1/1 |
| aday · 10 · r1 | 1 | 8,3 | 7,8 | 15,4 | 11,8 | 34,4 | 0 | 0 | 91,3 | 155,1 | 19,2 | 31,4 | 1/1 |
| R109 · 40 · r1 | 1 | 22,5 | 19,9 | 65,3 | 32,3 | 66,8 | 1 | 0 | 122,0 | 1200,0 | 41,4 | 69,5 | 1/1 |
| aday · 40 · r1 | 1 | 20,7 | 19,3 | 37,7 | 29,8 | 44,3 | 0 | 0 | 112,7 | 882,2 | 40,9 | 70,7 | 1/1 |
| R109 · 40 · r2 | 1 | 21,1 | 19,1 | 37,3 | 33,0 | 41,0 | 0 | 0 | 125,6 | 900,5 | 42,4 | 70,7 | 1/1 |
| aday · 40 · r2 | 1 | 21,2 | 20,0 | 45,7 | 29,9 | 37,9 | 0 | 0 | 130,9 | 1238,4 | 41,2 | 70,6 | 1/1 |
| R109 · 50 · r1 | 1 | 26,6 | 25,5 | 59,0 | 41,7 | 33,9 | 0 | 0 | 160,2 | 1018,6 | 48,1 | 85,6 | 1/1 |
| aday · 50 · r1 | 1 | 27,0 | 25,5 | 52,2 | 36,7 | 47,3 | 0 | 0 | 154,9 | 902,7 | 46,1 | 82,3 | 1/1 |
| R109 · 100 · r1 | 1 | 54,0 | 51,1 | 120,9 | 72,1 | 87,1 | 2 | 1 | 286,8 | 2638,4 | 66,1 | 140,5 | 1/1 |
| aday · 100 · r1 | 1 | 55,6 | 51,8 | 114,4 | 67,6 | 74,1 | 7 | 3 | 266,1 | 1250,5 | 66,1 | 154,8 | 1/1 |
| R109 · ortak boss 40 · r1 | 2 | 13,6 | 12,9 | 32,9 | 26,9 | 55,0 | 2/0 | 0/0 | 589,6 | 1461,6 | 30,2 | 52,6 | 2/2 |
| aday · ortak boss 40 · r1 | 2 | 14,4 | 13,2 | 32,8 | 24,7 | 58,9 | 0/2 | 0/0 | 410,9 | 1162,5 | 29,3 | 51,8 | 2/2 |

### D. Sıralı ilk ölçümler (50 oyuncu × 3, aynı gün; ortam kayması olabilir)

| 50 oyuncu, r1 karışık | n | tick p99 (en kötü kanal, ms) | kanal p99 ort. (ms) | en uzun tick (ms) | ana ELU % | ana en uzun duraklama (ms) | ana >50 ms | kanal >50 ms | komut yanıtı p95 medyan (ms) | komut yanıtı en kötü (ms) | toplam CPU % | kanal ELU toplamı % | geçti |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| R109 | 3 | 26,9 | 24,9 | 67,9 | 40,9 | 53,9 | 1/1/2 | 0/0/0 | 161,0 | 815,3 | 48,1 | 84,5 | 3/3 |
| +SQL | 3 | 27,1 | 25,3 | 54,8 | 40,1 | 53,3 | 1/0/0 | 0/0/0 | 173,6 | 872,7 | 47,0 | 82,2 | 3/3 |
| +SQL+devretme | 3 | 29,1 | 27,0 | 67,8 | 37,5 | 45,2 | 0/0/0 | 0/0/0 | 146,9 | 842,9 | 47,0 | 85,1 | 3/3 |

### Okuma

- **Ana süreç yükü her noktada düştü** (ana ELU, aday ↔ R109): 10 oyuncu
  13,5 → 11,8; 40/r1 32,3 → 29,8; 40/r2 33,0 → 29,9; 50 41,7 → 36,7;
  100 72,1 → 67,6. Aynı ağaçta yalnız taşıma değişince 50'de 39,1 → 36,3,
  100'de 69,9 → 63,9. Ana süreç CPU süresi de 2–4 s/dk azaldı.
- **Komut yanıtı iyileşti, en çok yük altında:** p95 medyanı 50'de 161 → 144 ms
  (−%11), 100'de 286 → 230 ms (−%19); ortak boss 40'ta R109 590 → aday 411 ms
  (−%30), en kötü 1.462 → 1.163 ms. Tek koşuluk noktalarda (10, 40) fark
  gürültü içinde.
- **Kanal tick'i 10–50 oyuncuda değişmedi** (karışık sıralı çiftlerde
  ±2 ms). 100 oyuncuda (4 vCPU doymuş, toplam CPU %64–66) bir çiftte tick p99
  43,7 → 50,1 ms, diğerinde 46,2 → 45,8 ms; R109 ↔ aday 54,0 → 55,6 ms. Kanal
  CPU süresi yalnız +%1,6–3,3 iken kanal ELU'su arttı; ana süreç artık bot
  patlamalarını sıraya dizmediği için kanalların aynı anda uyanıp 4 vCPU'da
  sıra beklemesiyle uyumlu. Olumsuz sonuç olarak kayıtlı; 8 çekirdekli canlı
  sunucuda ayrıca ölçülmeli.
- **Duraklama sayıları gürültü içinde:** ana >50 ms 50 oyuncuda çoğunlukla 0–1,
  100'de 3–7; kanal >50 ms 100'de vekille 1/2, devretmeyle 0/0 (R109 ↔ aday tek çiftte
  1 ↔ 3). Kesin bir iyileşme iddiası yok.
- **Toplam CPU değişmedi** (iş taşındı, azalmadı).
- **Mesaj aralığı ölçüsü ayırt edici değil:** oyuncu başına p99 aralık
  ~300–650 ms; sunucu her tick'te her oyuncuya mesaj göndermediği için doğal
  olay boşlukları, ana sürecin ≤90 ms duraklamalarını örtüyor.
- **SQL düzeltmesinin ayrı etkisi gürültü düzeyinde** (yalnız devretme ↔
  ikisi açık: ana ELU 37,7 ↔ 36,9; tick aynı).

## Bulgular ve kanıt

### B1 — Oyuncu WebSocket baytları ana süreçten geçiyordu

- Kod: `delivery511/runtime-ingress.mjs` yükseltmeyi doğruladıktan sonra
  `net.connect(kanal portu)` ve `socket.pipe(upstream).pipe(socket)` yapıyordu.
  Ana süreç aynı zamanda SQLite yazıcısı, koordinatör ve HTTP girişidir.
- Canlı 6 oyunculu profil (`measurements/live-r109`, değiştirilmedi): soket
  okuma yığınları ~971 ms/dk, bunun uygulama çerçevesi olmayan saf
  akış/`pipe` kısmı ~941 ms; `ondata→write` ~654 ms/dk. Ana iş parçacığı
  örneklenmiş meşguliyeti %21,96 (≈13,2 s/dk) olduğundan aktarım bunun ~%7'si.
  Bu oran oyuncu trafiğiyle büyür; kişi başına bölüp kapasite tahmini yapılmadı.
- Etkisi yalnız CPU değil: ana süreç 50–70 ms durunca o sırada bütün
  kanallara giden ve gelen oyuncu çerçeveleri de bekliyordu.
- Düzeltme ve güvenlik ayrıntısı commit `53d7299` mesajında. Doğrulama:
  `/proc` tablolarına göre soket açıkken kanal sürecine ait, `=0` iken ana
  sürece (`evidence/ws-handoff-runtime.json`).

### B2 — Native SQL derleme tekrarları

- `SQL_CENSUS=1` (yalnız test) ile 40 oyuncuda dakikada 12.902 native
  `prepare`; büyük kısmı yazıcı kapsamı dışındaki önbellekli sorgular, her
  çağrıda iki PRAGMA şema sürümü derlemesi ve her yazma işinde üç TEMP okuma.
- Sonra: 5.248/dk (−%59). Derleme süresi 777 → 613 ms/dk (−%21). Kanıt:
  `evidence/review-20261112124618-40.json` ↔ `census-after-20261112130103-40.json`.

### B3 — Devretmenin ilk tasarımındaki veri kaybı yarışı

- Node 22.23.4 `Socket.prototype.pause` yalnız `onread` tamponlu soketlerde
  `readStop` çağırır; `child.send(…, socket)` ise gönderen taraftaki tutamağın
  `onread`'ini no-op yapar ve ACK gelene kadar kapatmaz. Ana süreç boştayken
  ve kanal meşgulken gelen ilk istemci çerçevesi ana süreçte okunup atılır.
- Deterministik tekrar: kanal 400 ms meşgulken istemci ilk çerçeveyi yollar;
  `readStop` olmadan çerçeve hiç ulaşmaz, `readStop` ile ulaşır
  (`tests/ws-handoff-race.test.mjs`, focused grubunda).

### B4 — Test aracı: kanal süreci ws içe aktarımı

- Kanal süreçleri ws modülünü `file:///tmp/core511-build-deps/…` URL'siyle
  içe aktarıyor; yükleyici yalnız düz yolu eşliyordu. Bu ortamda captcha 9/20
  ve native 5/29 `channel_process_failed` ile kırılıyordu (`cff72b2`).

### Ek kanıt dosyaları

- `evidence/cpu-20261112125418-50.cpuprofile` (+ `.json`): R109, 50 oyuncu,
  ana süreç CPU profili; sıcak nokta araması (SQL derleme, soket aktarımı)
  buradan başladı. Örnekler kesin çağrı sayısı veya donma sayacı değildir.
- `evidence/handoff-smoke-*-10.json`: devretmenin ilk 10 oyunculuk duman
  koşuları (10/10 soket kanal sürecine geçti, hata 0).
- `evidence/ws-handoff-runtime.json`: kurulu runtime-entry testi (r1/r2).
- `evidence/browser-*-r110-*/report.json`: Chromium kule testleri.

### B5 — Bilinen test istemcisi sınırı (olumsuz sonuç olarak kayıtlı)

- Bir A/B koşusunda (iki R110 bayrağı da kapalı) bot, sunucunun yasal
  `429 basic_attack_cadence` (`retryAfterMs` 662) yanıtını hata saydı; koşu
  `passed:false`. Sunucu, önceki saldırıyı kabul ettiği zamana göre ritmi doğru
  uyguladı; bot ise kendi 950 ms saatini kullanıyor. Aynı sınır R110 deneme
  raporunda R109 için kayıtlı. Ölçüm tablolarında bu koşu ayrıca işaretlendi.

## Değişiklikler (her biri ayrı commit)

| Commit | Tür | Ne yapar | Kapatma |
|---|---|---|---|
| `cff72b2` | test aracı | Bağımlılık yükleyicisi kanal sürecinin `file://…/ws/wrapper.mjs` içe aktarımını da eşler. captcha 9/20 ve native 5/29 bundan kırılıyordu. | — |
| `25ae5da` | tanı | Yük testine isteğe bağlı SQL sayımı (`SQL_CENSUS=1`, yalnız test). | varsayılan kapalı |
| `c72b24b` | perf | Yazıcı kapsamı dışındaki `prepareCached477` çağrıları her seferinde native derleme yapmak yerine tek çağrılık kapsam açar (aynı şema sürümü denetimi, aynı LRU/rollback/büyük bağlama kuralları). | `CORE511_R110_SCOPED_FACADE=0` |
| `c5743e8` | perf | Tetik denetimi önbellekleri PRAGMA şema sürümünü her çağrıda derlemek yerine bağlantının hazır şema sorgusundan okur. | — (aynı değer) |
| `30337a3` | perf | Paylaşılan yenileme kapsamının üç TEMP tablo okuması yazıcı LRU'sundan. | — (aynı sorgu) |
| `53d7299` | perf | WebSocket soket devretme (yukarıda). | `CORE511_R110_WS_HANDOFF=0` |
| `a53f506` | test | Kurulu `runtime-entry` üzerinden devretme testi (`npm run test:handoff`). | — |

Değişmeyenler: oyun kuralları, RNG/seed, kayıt biçimi, SQLite COMMIT/kalıcılık,
makbuz/idempotency, epoch/sahiplik, bilet/Origin/IP denetimleri, kanal kabul
sınırı (r1 4×25, r2 4×10), oto atak IP kuralı. Hiçbir koruma kaldırılmadı.

## Regresyon testleri (bu ağaçta, son durum)

| Grup | Sonuç |
|---|---|
| `npm test` (focused) | 56/56 (54 + 2 yeni yarış testi) |
| `npm run test:native` | 29/29 |
| `npm run test:captcha` | 20/20 |
| `npm run test:handoff` (yeni, gerçek runtime-entry, r1+r2) | 1/1 |
| Tarayıcı (Chromium, kule kurtarma) | 3/3: r1 PC devretme, r2 mobil devretme, r1 PC köprü (kule akışı kaybı, kat 1→2, tekrar oynatma yok) |

`npm run verify` R109 tabanını doğrular; bu ağaçta beklendiği gibi değişen 10
runtime dosyasını ve çekirdek kimliğini "farklı" listeler (R109 kimliği
değiştirilmedi; yeni dosya `r110-options.mjs`).

## Olumsuz / nötr sonuçlar ve sınırlar

- SQL derleme düzeltmesi derleme **sayısını** %59 azalttı ama derleme
  **süresi** yalnız ~%21 düştü (ucuz PRAGMA/TEMP derlemeleri gitti). 50
  oyuncuda tick ve ana ELU'da gürültüden ayırt edilebilir fark yok.
- Devretme toplam CPU'yu azaltmaz: iş ana süreçten kanal süreçlerine geçer
  (kanal ELU toplamı biraz artar). Kazanç, oyuncu trafiğinin ana süreç
  duraklamalarından **ayrılması** ve ana sürecin yazıcı/komut işine kalan payıdır.
- Node, tutamak taşıyan IPC mesajının ACK'ine kadar aynı kanala giden sonraki
  mesajları bekletir (yaklaşık bir kanal olay döngüsü turu). Bağlantı başına
  bir kez; 24'lük yeniden bağlanma patlamasında ilk çerçeve en geç
  28 ms'de yanıtlandı.
- Bu ortamda `steal` ≈ %1,5. Canlı VDS'deki host çalma/kotalama ölçülmedi;
  önceki R110/R111 deneme ortamında %17–23 görülmüştü. Bütün süreçleri aynı
  anda durduran host kaynaklı duraklamaları kod düzeltemez.
- Sentetik botlar gerçek oyunculardan daha az trafik üretir (canlı 6 oyuncu
  ana iş parçacığında ~%22 meşguliyet). Örneklenmiş CPU'yu oyuncu sayısına
  bölüp kapasite tahmini yapılmadı; 50 oyuncu için canlı garanti verilemez.
- Gerçek Caddy/Cloudflare önünde, gerçek oturum açmayla uçtan uca tarayıcı
  testi bu ortamda yok. Kapsam ikiye bölündü: gerçek giriş katmanı + gerçek
  kanal el sıkışması (`test:handoff`, geçersiz biletle), gerçek bilet/oyun
  akışı + aynı devretme fonksiyonu (yük testi geçidi ve tarayıcı testi).

## Canlıya alma

1. Kurulum paketi: `project/r110_takilma/delivery/r110-takilma.zip`
   (SHA256 `4fd1fbb8a36de2ae89fb693f5617ac3a8e697f2608f4a6b14464b6703a83bcc0`).
   Yalnız kurulu R109_LATENCY2 üzerine; 12 kod dosyası; veri/şema değişikliği
   yok; iki realm birlikte; tek önceki kod yedeği. Adımlar:
   `project/r110_takilma/KURULUM.md`. Doğrulama: `npm run test:r110`
   (R109 → R110 kurucu testleri + kurulmuş ağacın gerçek `runtime-entry` ile
   iki realm/sekiz kanal açılışı ve bağlantı devretme testi).
2. Kurulumdan sonra aynı saatlerde 30–40 oyuncuyla: sağlık yanıtındaki ana ELU
   ve COMMIT gözlemcisi, `vmstat 1 60` (özellikle `st` sütunu) ve 60 sn ana
   CPU profili. Sorun sürerse paketle `--rollback` R109 koduna döner.
3. `st` (steal) %5'i sık geçiyorsa takılmanın önemli kısmı host kaynaklıdır;
   ayrılmış vCPU'lu plan veya sağlayıcıyla görüşme gerekir.

## Tekrar üretme

```bash
cd r109-inceleme && npm ci && npm run setup
npm test && npm run test:native && npm run test:captcha && npm run test:handoff
npm run load -- --players 50 --mode mixed
```

R109 tabanı ile karşılaştırma için çalışma ağacının R109 dosyalarıyla bir
kopyası `STUTTER_TREE`/`CLIENT_TREE` ile verilir (manifestle 2.054/2.054 dosya
doğrulandı); aynı test düzeneği, aynı makine, sırayla karışık koşular.
