# Efsane — kısa canavar ölüm gecikmesi bildirimi

12 Kasım 2026. Kullanıcı, yaklaşık 45 dakika önce bir oyuncunun kısa süreli
lag yaşadığını ve canavarın yaklaşık iki saniye sonra öldüğünü bildirdi.
Sunucu **Efsane/r1**. Harita, kanal, saldırı türü ve aynı anda diğer oyuncuların
etkilenip etkilenmediği bilinmiyor. Akademi henüz açılmadığı için bu olay r2
olarak yorumlanmamalı.

## Salt okunur kontrol

`health-observations.json` iki güncel HTTP sağlık yanıtından seçilen tanı
alanlarını içerir. Canlı süreç veya ayar değiştirilmedi; profil başlatılmadı.

- 20:19:50 ve 20:21:15 UTC: R110_HANDOFF1, dört kanal hazır, toplam 14 oyuncu.
- Örnek anlarında bekleyen yazma sayısı 0; ana olay döngüsü meşguliyeti
  %40,91 ve %28,02; iki saniyelik pencerelerin gecikme göstergesi 23,9 ve 7,9 ms.
- Süreçte gözlenen ana SQLite COMMIT tepe süresi 26,64 ms; >50 ms sayacı 0.
  Bu sayaç bütün oyun işlemlerini veya worker COMMIT'lerini kapsamaz.
- Ödül worker yeniden başlatma/rollback/replay sayıları 0. Tamamlanan işler
  11.672 → 11.819; bu aralıktaki ilerleme güncel servisin çalıştığını gösterir.
- `maxReadyWaitMs=949,96` ve `maxExternalMs=952,58` iki örnekte de sabit.
  Bunlar zaman damgalı olay kayıtları değildir. `RewardWorkerR533.prepare()`
  kanal kabulünden önce aynı yazma sırasında `ready()` beklemesini ölçebilir;
  bu nedenle ilk açılış beklemesi de maksimumlara dahildir. Bu değerleri
  oyuncunun yaşadığı iki saniyelik gecikmenin kanıtı saymak yanlış olur.

## Henüz belirlenmeyen neden

Güncel sağlık yanıtları yaklaşık 45 dakika önceki olayın gecikmesini ölçmez.
İstemciden komuta, kanaldan kalıcı yazmaya ve sonuç bildirimine kadar geçen
süre bu olay için elimizde yok. Ana makine CPU'su, ağ veya oyuncu cihazı
hakkında bu verilerden kesin neden çıkarılamaz. Önceki 15 oyunculu CPU profili
de bu olayın zamanıyla eşleştirilmiş değil.

Kodda `runtime-performance.mjs` özetleri 5 dakika, `slow-work504.mjs`
yavaş iş/GC kayıtları 15 dakika tutuluyor; bunlar bu olay için geçmişe dönük
45 dakikalık kayıt sağlamıyor. VDS günlükleri bu ortamdan erişilebilir değil.
İlk sonraki adım: bildirimin tahmini saatini kapsayan servis günlüklerini
kontrol etmek. Günlükte hata olmaması, kısa bir gecikme olmadığı anlamına gelmez.

```bash
journalctl -u coreoflife-r1.service -u coreoflife-rt-r1.service \
  --since "2026-11-12 19:10:00 UTC" --until "2026-11-12 20:00:00 UTC" \
  --utc --no-pager -o short-iso
```

Bu turda oyun kodu, paket veya canlı kurulum değiştirilmedi. Neden henüz
belirlenmedi; doğrulanmamış bir performans düzeltmesi yayımlanmadı.

## Gelen günlük ekranı: 14652.jpg

Kullanıcı istenen journal çıktısının son bölümünü gönderdi. Görünen
`world_timing` kayıtlarında `mode:full`, HTTP 200 ve 0–2 ms oturum kontrolü
var; kalan süre `response` alanına yazılıyor. Seçilen üç görünür örnek:

| UTC | Toplam sunucu yanıt süresi |
|---|---:|
| 19:40:52 | 1.613 ms |
| 19:41:17 | 1.085 ms |
| 19:53:22 | 1.377 ms |

Kaynak `screenshot-excerpt.json` yalnız elle okunan görünür satırları içerir;
tam günlük değildir. `world_timing` en az 200 ms süren isteklerde ve en fazla
5 saniyede bir yazılır. Bu görüntüden toplam gecikme sayısı çıkarılamaz.

### Kaydın kodla eşleştirilmesi

- `http-runtime/dist-vds/server/index.js` içindeki dünya GET işleyicisi
  bütün `/api/world` çeşitlerine aynı zamanlayıcıyı uygular. `marketShop506`
  ayrımı logun `mode` alanında yoktur; pazar okuması da `full` görünür.
- Aktif R110 `readWorld` yolu normal dünya HTTP isteklerini 428 ile eski
  istemci protokolünden çıkarır. İstemcinin normal dünya görüntüsü
  `client-transport.mjs` üzerinden WebSocket görüntüsünden alınır.
- Pazar detay GET'i HTTP 200 dönebilir. `NativeHttpAction.readMarket()`
  ortak koordinatör sırasını, dünya terminal işleminin bitmesini, SELECT
  görüntüsünü ve kalıcılık beklemesini kapsar. Logdaki tek `response` alanı
  bu süreleri birbirinden ayırmaz. Saldırı işleminin süresi burada ölçülmez.

`world-timing-probe.mjs` bu ayrımı gerçek yerel HTTP/kanal fikstüründe test
etti. Yalnız testte koordinatör sırasına 1.600 ms bekleme eklendi:

- Normal dünya HTTP: 428; başlangıç pazar okuması yaklaşık 3,18 ms.
- Pazar yanıtı yaklaşık 1.603 ms; aynı log biçimi üretildi:
  `full / 200 / totalMs:1601 / session:1 / response:1600`.
- Aynı sırada WebSocket heartbeat komutu yaklaşık 52,24 ms'de tamamlandı.
- Test geçti, motor hatası çıkmadı. **Bu enjekte edilmiş bir beklemedir;
  canlı gecikmenin sebebini yeniden üretmiş olduğumuz anlamına gelmez.**
  Heartbeat ölçümü de canavar öldürme ölçümü yerine kullanılamaz.

Tekrar çalıştırma (Node 22.23.4, kurulu yerel test bağımlılıkları):

```bash
python3 scripts/run.py --test "$PWD/measurements/r111-investigation/2026-11-12-death-delay/world-timing-probe.mjs"
```

### Ek R110 yük kontrolü — 30 oyuncu, 60 saniye

Normal harita, kule, Solo, Sis, Kara Taş ve Rün alanlarını; sohbet, iksir ve
yardımcı HTTP okumalarını kapsayan mevcut karma senaryo çalıştırıldı.
30 bağlantının tamamında R110 soket devri kullanıldı. Sentetik DB ve ayrı bot
süreci kullanıldı; bu ortamın kotası 4 CPU, kullanıcının VDS'si 8 çekirdektir.

| Ölçü | Sonuç |
|---|---:|
| İşlem/bağlantı hatası | 0 |
| Komut yanıtları | 2.007 |
| En uzun komut yanıtı | 539,15 ms |
| Kanal tick p99, en kötü kanal | 16,21 ms |
| En uzun tick | 98,82 ms |
| Ana döngü en uzun duraklama | 80,08 ms |
| Ana döngü >50 ms duraklama | 3 |
| Kanallar toplam >50 ms duraklama | 6 |
| En uzun GC olayı | 17,93 ms |
| Ölçüm sırasında ek CPU kotalama | 0 olay / 0 µs |

Bu tek koşuda iki saniyelik komut beklemesi görülmedi. 539 ms yanıt tepesi ve
>50 ms duraklamalar devam ediyor; bütün performans hedefleri sağlandı veya
oyuncunun olayı çözüldü denemez. İki `main_write_group` örneği yaklaşık 57,3
ve 55,5 ms sürdü; bunlar canlı olaya veya bütün gecikmelere doğrudan neden
atfetmek için yeterli değildir. `passed:true` burada işlem doğruluğu anlamına
gelir; sıfır gecikme garantisi değildir.

Ham sonuçlar ve kısa özet aynı klasördedir. Harita ve normal canavar/boss
ayrımı kullanıcıdan istendi. Canlı saldırının iki saniyelik gecikmesini
açıklayacak zaman eşleşmeli komut kaydı henüz yok. Bu incelemede oyun kodu
ve eski paketler değiştirilmedi.
