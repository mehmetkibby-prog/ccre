# R111 başlangıcı — R110 devri doğrulandı

Tarih: 12 Kasım 2026. Bu kayıt yeni bir R111 sürümü veya kurulum paketi değildir.
Bu devir sırasında oyun kodu değiştirilmedi ve canlıya işlem yapılmadı.

## Esas alınacak kaynak

- Depo: `https://github.com/mehmetkibby-prog/ccre`.
- Claude dalı: `claude/r110-takilma-duzeltmeleri`.
- Alınan commit: `01768c7a81b48e53c8e5ab2febbf22a362531ffb`.
- Yerel devam dalı: `codex/r111-r110-handoff1`.
- Kullanıcı ve devir belgesinin bildirdiği canlı sürüm: **R110_HANDOFF1**, r1 + r2.
- Güncel kod: `project/r109_latency_completion/working` (R110 içeriği).
- Çekirdek kimliği: `de7e042120f54f92fc62d53164696ff7df6ba2b60ef650fe0fc49bfaa00b2411`.
- R110 ZIP SHA256: `4fd1fbb8a36de2ae89fb693f5617ac3a8e697f2608f4a6b14464b6703a83bcc0`.

Ekli devir belgesi ve ZIP, depodaki dosyalarla birebir eşleşti. Paket yükünün
12 dosyası ve R109 manifestinden kalan 2.043 dosya doğrulandı. Tam kayıt:
[source-identity.json](validation/r111-baseline/source-identity.json).

## Korunacak davranış ve kurulum sözleşmesi

- WebSocket devri ve ilk istemci çerçevesini koruyan `handle.readStop()` sırası.
- SQL statement önbelleği, kapsam sınırları ve şema denetimleri.
- `realtimeHandoff: "R110_HANDOFF1"`; önceki sağlık işaretleri de korunur.
- SQLite COMMIT/kalıcılık, makbuz/idempotency, sahiplik, ödül ve RNG garantileri.
- İki realm ve dörder kanal; mevcut giriş ve oto atak IP kuralları.
- R111 paketi gerekirse şablon `project/r110_takilma`, kaynak **R110_HANDOFF1**.
  Taban, R109 üzerine doğrulanmış R110 yükü uygulanarak oluşturulmalı.
  Kaynak kimliği, yeni sağlık işareti, eski yedek temizliği koşulu ve geri dönüş
  testleri birlikte uyarlanmalı. Eski ZIP ve SHA256 değerleri değiştirilemez.
- `measurements/not-installed/r110_*` ve `r111_*` kurulmuş sürümler değildir.
  `measurements/r111-deneme` altındaki uygulanmamış Claude deneyleri de
  bu başlangıç sürümüne eklenmiş kabul edilmemeli.
- Her bağımsız değişiklik ayrı commit. Yeni ölçümlerde aynı koşullarda önce/sonra
  karşılaştırması yapılmalı; korumalar performans uğruna kaldırılmamalı.

## Doğrulama

Node.js 22.23.4 ile `npm ci` ve `npm run setup` uygulandı. İstenen dört test
grubunun komutları, çıkış kodları ve süreleri
[checks.json](validation/r111-baseline/checks.json) dosyasındadır; ayrıntılı
çıktılar aynı klasörde saklanır. Bunlar yerel sentetik verilerle yapılan
regresyon ve kurulum testleridir; canlı kapasite veya sıfır takılma garantisi değildir.

| Komut | Sonuç | Süre |
|---|---|---:|
| `npm test` | 56/56 geçti | 38,43 sn |
| `npm run test:native` | 29/29 geçti | 134,70 sn |
| `npm run test:captcha` | 20/20 geçti | 129,91 sn |
| `npm run test:r110` | 16 kurulum + 3 servis/WS testi geçti | 81,90 sn |

Toplam **124 test geçti**, başarısız veya atlanan test yok. Paket üzerinden
kurulan ağaçta iki realm, sekiz gerçek kanal, captcha worker ve WebSocket
devri/eski proxy dönüşü doğrulandı. Yeni çıktılar `validation/r111-baseline/`
altına alındı; önceki sürümlerin tarihsel kanıtları değiştirilmedi.

`npm run verify` tarihsel R109 manifestine bakar. R110'un bilinçli farkları
bu komutu geçirmek için geri alınmamalı.

## Sonraki performans çalışmasının ölçüm tabanı

Bu dal, devir metnindeki 11 oyunculu kayıttan sonra eklenmiş **15 oyunculu**
R110 profilini de içerir: `measurements/live-r110/fifteen-players-60s.cpuprofile.json`.
Analiz ve sınırları `measurements/live-r110/RAPOR.md` dosyasında açıklanmıştır.
Ana thread örneklenmiş meşguliyeti %35,4; bu değer tüm makine CPU'su veya kesin
event-loop gecikmesi değildir. Harita/etkinlik ve realm ayrıca belirtilmemiştir.

Sonraki incelemede savaşın kalıcı yazma/SQL yolu ve yanıt JSON maliyeti bu
tabanla karşılaştırılabilir. Eski profillerden 30–40 oyuncuda sıfır gecikme veya
oyuncu başına doğrusal kapasite sonucu çıkarılmamalı. Yeni bir performans
düzeltmesi, yük testi sonucu veya R111 paketi bu devir kaydında ileri sürülmüyor.
