# R87 durdurma ve teknik devir — 1 Kasım 2026

## Durum ve yetki

Kullanıcı düzeltmeyi yarıda durdurup kaydetmeyi ve Claude Code'un devam etmesi için GitHub'a yüklemeyi istedi. Bu andan sonra oyun kodu üzerinde düzeltmeye devam edilmedi. R86'nın kurulduğu kullanıcı tarafından doğrulandı. R87 yayımlanmadı ve canlıya kurulmadı. VDS'ye bu ortamdan erişim yok; canlı veriler değiştirilmedi.

Güncel çekirdek kimliği: `e2226a62f64d51c4b60d2ec0efbbd609473bfebaf17e42406d41f11c2e81db22`.

R86 çekirdeği: `6965a41ff2c9f3018f6f70f091b1bfbfdc8c16bac8470f17b6ba78c637dfe2fc`.

R86 dağıtılan ZIP SHA-256: `9eed28b0c88ee460d85ed329a577bb3fb8546c373bb4f1da383433ca42b579ac` (1.562.829 bayt). Orijinal özel depo dalı `r86-download`, commit `8a6f56542b34e240e95c6718cebc3c48ae17f0f9`.

## Oyuncunun güncel bildirimi

- Oyun ekranı açık kalıyor, karakter takılıyor; son bildirimin anlamı giriş ekranına atılmak değil.
- Haritaya başka oyuncu geldiğinde lag başlayabiliyor.
- R86'da 65 seviye Rün Sahili'nde **canavar keserken veya ödül alırken** küçük takılma bildirildi.
- Hedef yeniden **50 oyuncu**. R86 için daha önce kabul edilen 30 oyuncu sonucu R87'nin 50 oyuncu hedefinin kanıtı değildir.
- Normal haritalar, Rün Sahili, Sis Yarığı, solo/grup zindanlar, kule, Etkinlik Adası ve iki tarayıcıda diğer oyuncunun hareketi birlikte ele alınmalı.

## Mimari ve kaynakların anlamı

Node 22.23.4, SQLite, JavaScript ES modules. Ana koordinatör, dört resident kanal, dünya süreci, okuyucu ve ödül yazıcı işçisi var. Kalıcı yazılar tek yetkili SQLite sırasından geçiyor; ödül işçisi ikinci bağımsız yazıcı değildir. Kanal belleğinde hareket/HP durumu, checkpoint, oyuncu/yaratık lease/epoch/scope ve kalıcı komut receipt'leri birlikte çalışır.

Kaynak `working/core511-source/scripts/core511/`; süreç girişleri `working/core511-source/scripts/delivery511/`; native taban `working/native510-bb3a6cc689c6/`; HTTP `working/http-runtime/dist-vds/server/index.js`. Şema ve native üretilmiş oyun kuralları dahil. Client dosyaları immutable isimlerle `core511/generated/client/` altında. Standart bir Next build'i bu kurulumu otomatik olarak yeniden üretmez; kaynak/istemci/HTTP namespace ve proof zinciri var.

Node binary'si GitHub'a konmadı (124,9 MB). Kurulum metaverisi `r86_stability_work/r86-package/RUNTIME.json` içinde. Native test bağımlılıklarının mevcut kopyaları `vendor/` içinde; lisansları korunmuştur. Büyük medya varlıkları ve gerçek veritabanı yok. Yerel fixture'lar geçici, sentetik veritabanı oluşturur.

## R87'de hazırlanmış değişiklikler

R86 → R87 tam dosya listesi ve SHA farkları `R87_CHANGES.json` içindedir.

1. **Ayar/ganimet önbelleği:** `writer-settings.mjs`, herhangi bir dış COMMIT sonrası ayarları yine okur fakat anahtarlar ve skaler değerler gerçekten aynıysa önceki immutable kimliği korur. Hareket/HP kaydının loot cache'i gereksiz düşürmesi azaltıldı. Gerçek ayar değişikliği ve rollback etkisi korunur.
2. **Varsayılan loot şablonu:** yeni `default-loot-cache-r87.mjs`, immutable skaler ayarlar için 32 kayıt / 256 KiB ve en fazla 8 canlı ayar durumu sınırıyla şablon tutar. Dönen nesne kopyalanır. `generated/attack-writer-rules.mjs` normal varsayılan profil fabrikalarında kullanır. Dinamik Rune/boss/etkinlik profilleri bu cache'e sokulmadı.
3. **Checkpoint:** R86'daki 1000–1500 ms hash dağılımı kaldırılıp 1500 ms uygunluk geri getirildi; 2000 ms güvenlik sınırı ve 5 yazı/50 ms bütçesi duruyor. Önceki dağılım yazı sıklığını artırıyordu.
4. **İstemci:** kanat sprite'ındaki 768×512 piksel ayıklama 8 satırlık asenkron parçalara bölündü; tamamlanmadan yayımlanmaz, tekrar deneme guard'ı temizlenir. Snapshot'taki oyuncu/canavar eşleştirmeleri ilk duplicate'i koruyan Map ile yapılır. Yeni client `game-client-core511-r87-aaf06f246f8a616a.js`. HTTP/proof dosyaları yeni immutable grafa uyarlandı. Eski client dosyaları korundu.
5. **Sıradan Rune öldürme ve ödülü:** yeni `rune-reward-scope-r87.mjs` yalnız `rune_v2` alanında, aynı CH için `rune-v2-(tide|warden|sentinel|wraith)-c[1-4]-[1-5]` kimlikli, boss/stone/summoned olmayan canavarı kabul eder. `attack-loop`, `attack-writer`, `joined-checkpoint-r53`, `actor-section-reuse-r52` mevcut tek commit yolunu bu dar kapsama açar. Yerel scope/katılım/ownership ve native ödül kuralları korunur. **Rune boss'unda is_boss=0 olabildiğinden alan veya is_boss kontrolü tek başına güvenli değildir.** Rune boss/dalga yolları kapsama alınmadı.

Yeni HTTP SHA: `37d72374fb8a0eb697a45a681320045008397c6be25e8f4fa2e9a1b7b857529c`.
Yeni namespace: `core511-27dfe29036d78e12`.
Ingress değişmedi: `325bd1caa7c52df9df159b63afa3cd7faf470f2cdae3f513a5c4ca29f655cec9`.

## Ölçümler — tamamlanmış kabul değildir

Tüm aşağıdaki dosyalar `r87_stability_work/evidence/` altındadır. Başarısız denemeler saklandı; yeniden adlandırılarak başarılı gibi gösterilmedi.

| Koşu | Süre | Tüm komut p99 / en yüksek | Prediction-limit olay / sınırlı kare |
|---|---:|---:|---:|
| `native-mixed-load-r87-twochannel-first-50.json` | 30 sn | 297,89 / 899,47 ms | 27 / 72 |
| `native-mixed-load-r87-cache-twochannel-50.json` | 30 sn | 312,09 / 429,92 ms | 2 / 4 |
| `native-mixed-load-r87-cpu-diagnostic-50.json` (profilleme açık) | 30 sn | 327,14 / 575,70 ms | 3 / 7 |
| `native-mixed-load-r87-candidate-twochannel180-50.json` (son kaynak) | 180 sn | 131,73 / 579,27 ms | **4 / 5** |

Son koşu durdurma isteğinden hemen önce tamamlandı: 58.566 komut, 0 hata/fault/iptal; hareket p99 98,79 ms, saldırı p99 92,69 ms, collect p99 327,87 ms. Ödül/receipt/otomatik iksir defteri kontrolleri geçti. **Akıcılık kabulü geçmedi: 4 prediction-limit olayı kaldı.** İlerleme logundaki geçici `predictionCapActors:0` nihai JSON'un yerine kullanılmamalı.

Test iki yoğun kanalda 25+25 aktör, dört kanal süreci ve dört generator süreci kullanır; aktörler ormanda birbirine yakın, potions/öldürmeler/loot ve doğal respawn vardır. Native TCP/WebSocket, gerçek istemci transport/prediction modülleri kullanılır. Düzenlenmiş yüksek HP/loot fixture'larıdır; DOM/canvas render, gerçek WAN, TLS/Caddy veya tüm haritalarda 50 gerçek tarayıcı ölçümü değildir. Test makinesi 4 CPU kotasıdır ve generator yükü aynı makinededir. Canlı 8 çekirdek kapasitesini doğrudan kanıtlamaz. 600 ms prediction sınırını yükseltip sorunu gizlemeyin.

Diğer kanıtlar:

- `cache-parity.log`, `native-r86-r87-parity.json`: SQLite/WAL gerçek ayar invalidation/rollback, cache kopya izolasyonu ve sabit RNG ile 10 seri R86 saldırısı karşısında R87 ödül/DB/receipt eşitliği.
- `rune-baseline.json`: sıradan Rune öldürmesinde R86 saldırı sonrası ödül tamamlanma alanı 0; sonraki claim ile ödül.
- `rune-candidate.json`, `rune-candidate2.log`: son R87'de native süreç + iki oyuncu + bir Rune öldürmesi; saldırı commit'iyle ödül tamamlanıyor, iki claim isteği tek ödül kaydını koruyor, gözlemci hareketi 200 ve fault yok. ACK 150,42 ms; R86 tek ölçüm 152,64 ms. Bu küçük fark hız kanıtı değildir; doğrulanan değişiklik ayrı ödül aşamasının birleşmesidir.
- `rune-candidate.log`: ilk eksik joined-writer allowlist yüzünden başarısız koşu; düzeltildi ve ikinci log geçti. İlk logu başarılı saymayın.
- `browser-atlas.json`: gerçek Chromium/Edge, 4× CPU yavaşlatma, sentetik atlas, 50 eşzamanlı loader çağrısı; eski/yeni RGBA birebir aynı, 64 slice, dilim en yüksek ~4,9 ms. İzole eski loader testinde frame freeze yeniden üretilmedi. Yeni kanat hazır olma süresi ~300 ms, eski ~48 ms. Bu tüm oyunun FPS veya 50 tarayıcı testi değildir.
- `worker-inner.cpuprofile.json`, `worker-inner-spans.json`, `sql-thread-*.json`: CPU/SQL teşhisleri. Tek bir SQL her gecikmeyi açıklamıyor; writer ve refresh maliyetleri dağınık. Bunlar canlı profil değil, yerel tanıdır.

## Kalan işler / araştırma sırası

1. Nihai 50 aktör JSON'unda kalan prediction-limit olaylarının zamanını writer kuyruğu, auto potion/toplu ölüm/collect ve due-PvE hareket guard'larıyla eşleştir. p99 tek başına yeterli değil.
2. Rün Sahili 50 oyuncu veya anlamlı karma harita yükü henüz çalıştırılmadı. Son Rune testi yalnız sıradan tek hedef/two-actor doğrulamasıdır. Boss/summoned/yanlış CH negatif kapsamı ve native Rune konfigürasyon/boss testleri tamamlanmalı.
3. Normal haritalar dışındaki Sis, kule, solo/grup zindan, etkinlik ve boss toplu ödül akışları son R87 üzerinde yeniden doğrulanmadı. Mevcut native testler çekirdekte; yakın tarihli fixture uyarlamaları R85/R86 `tests/instances` altında. Bu dosyaların bir kısmı kendi R85/R86 kaynaklarını import eder; son R87 testi olarak koşmadan import kapsamını kontrol edin.
4. Map eşleştirme değişikliğinin duplicate/missing actor semantik testi ve gerçek tam oyun hareket/giriş tarayıcı testi bitmedi. Büyük medya arşivi bu devirde yok; gerekiyorsa kullanıcıdan erişim veya ayrı varlık arşivi alın.
5. Cache'in 8 canlı settings sınırı ve plain-prototype guard'ı için ek dar doğrulama planlandı, yapılmadı.
6. Son aday üzerinde birleşik regresyon, yeterli 50 oyuncu performans kabulü, R87 paketleme ve kurucu/geri alma testleri tamamlanmadı.

## Güvenlik ve uygulanmayan fikirler

Kalıcı ödülü disk commit'inden önce onaylamak, SQLite yazılarını kontrolsüz paralelleştirmek, native karşı vuruşu/due-PvE'yi atlamak, başarısız scope guard'larını kapatmak ve prediction süresini yükseltmek uygulanmadı. Bunlar mevcut tutarlılığı bozabilir. Rune'yi tüm 'normal harita' listelerine körlemesine eklemeyin. Sıradan savaşta kısıtlı hareket izni R86'da var; ödül, HP, seviye, lifesteal, ölüm, scope ve rollback ile etkileşimi incelenmeli.

## Paketleme ve geri dönüş

R87 ZIP/kurucusu henüz yok. R85'in client değişikliği destekleyen kurucu kaynağı, R86'nın server-only kurucusu, her iki teslim ZIP'i ve testleri dahil. R87 client grafiği değiştiği için R86 `prepare_package.py` aynen çalıştırılmamalı: R85 client-stage yaklaşımı R86 kaynak pinlerine uyarlanmalı; yeni manifest, immutable assets, HTTP referansları ve geri alma birlikte doğrulanmalı. Bunlar devirde otomatik çalıştırılmaz.

R85/R86 eski build/seal betikleri tarihsel kanıtlara bağlıdır; tüm eski aday/önbellek ağacı aktarılmadı. Bunları R87 build'i gibi kullanmayın. `r85_stability_work/handoff` içindeki R84 notları tarihsel bağlamdır; güncel görev, canlı sürüm ve test iddiaları için bu not önceliklidir.

Claude'un dönüşünde: yeni dal ve commit, değişiklik özeti, ölçüm çıktıları, sınırlar, gerekiyorsa doğrulanmış R86→R87 kurucu + SHA-256 + geri alma yönergesi verilmeli. Hesaplar ve oyuncu verileri taşınmamalı/sıfırlanmamalı.
