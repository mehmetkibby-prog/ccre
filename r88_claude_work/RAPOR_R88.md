# R88 (Claude) — lag/donma incelemesi ve iksir sırasında hareket

**Durum:** aday. Canlıya kurulmadı. VDS'ye erişim yok. Kurulum ZIP'i ve kurucu üretilmedi.
Dal: `r88-claude-movement` (temel: `r87-claude-handoff` / `029e7dd`).

## 1. Ölçülen kök nedenler

Bütün ölçümler bu ortamda, 4 CPU'lu yerel makinede yapıldı. Test üreticileri de aynı makinede çalıştı. Yerel tanıdır; VDS sonucu değildir.

1. **Donmalar oyunun oturmuş halinde değil, ani yük anlarında.**
   - R87, 50 oyuncu, 180 sn: 74 tahmin sınırı (prediction-limit) olayı vardı. 73'ü ilk 10 saniyedeydi, kalan 170 saniyede yalnız 1 tane oldu.
   - ChatGPT'nin son R87 koşusundaki 4 olayın 4'ü de 3. saniyede.
2. **Birinci patlama (≈1. sn): iksir.**
   - `use_potion` p50 500–850 ms sürüyor.
   - İksir dayanıklı yazılırken oyuncunun `player:` şeridi kilitli kalıyor (`durableGroup` bariyeri). Hareket `DEFER_INPUT` ile bekliyor.
   - Üstüne sunucu (`allowsFollowingMovement`) ve istemci (`mayPipelineMovement`) iksirin arkasından hareket gönderilmesine izin vermiyordu.
   - R86'nın öldürme istisnası iksiri kapsamıyordu.
3. **İkinci patlama (≈3–4. sn): 25 oyuncunun aynı anda ilk öldürmesi.**
   - Kanal döngü adımları 150–254 ms'ye çıkıyor (normalde p95 ≈ 38 ms). Kanal süreci o saniyelerde bir çekirdeğin %85–92'sini kullanıyor.
   - R86 öldürme izni çoğu harekette `blockedState` ile kapanıyor, çünkü canavar vuruşu vadesi geldiği için hareket bekletiliyor. Bu doğru bir güvenlik kontrolü.
4. **Ortada oyuncu katılması diğerlerini dondurmadı.**
   - `native-midjoin`: 49 oyuncu + 5. saniyede 1 katılım. 5–6. saniyelerde iki sürümde de 0 donma.
5. **Kapasite.**
   - `CAPACITY = 25` oyuncu/kanal. 50 oyuncu en az 2 kanala bölünür; test 25+25 ile en kötü durumu ölçüyor.
   - Oturmuş halde 25 oyunculu bir kanal süreci tek çekirdeğin ≈%60–63'ünü kullanıyor (profil ile). Yük dağılımı:

     | Bölüm | Pay |
     |---|---|
     | Projeksiyon | %15 |
     | Karşı saldırı (retaliation) | %15 |
     | GC | %9–10 |
     | Hareket yayını | %8,6 |
     | Soket yazımı | %8 |
     | `notificationViews` | %2,7 |

   - Tek bir sıcak nokta yok. 8 çekirdekte 4 kanal süreci kendi çekirdeğini alırsa oturmuş 50 oyuncu yükü sığar. Diğer süreçlerle CPU paylaşımı bu payı daraltır.
   - Oyun sırasında geç yüklenen modül yok. Profildeki loader örnekleri yalnız süreç açılışında görülüyor.

## 2. Yapılan değişiklik (R88)

Tek mantıksal değişiklik: **sıradan haritada iksir dayanıklı yazılırken oyuncu yürüyebilir.** R86'nın öldürme sırasında hareket mekanizması aynen yeniden kullanıldı.

| Dosya | Değişiklik |
|---|---|
| `death-movement-r86.mjs` | Yeni `beginActionMovementR88(loop,{kernel,ids,lease})`. Uygunluk koşulları R86 ile aynı: ordinary alan (forest/frozen/ancient), hp>0, arena/instance yok, checkpoint yakalanmış ya da temiz, lease `player:` anahtarına sahip. İzin kontrolünde `p.deferred.length` artık aktörün başlangıçtaki ertelenmiş sayısıyla karşılaştırılıyor (R86 aktörleri için 0, değişmedi). Önizlemesi olmayan aktör `rejectDeathPreviewR54` çağırmaz. |
| `action-loop.mjs` | `use_potion` için beklenen kare (`expected`) alındıktan sonra izin açılır. Yazıcı ACK'ından hemen sonra kapanır. `committed` bağlamına `deathMotionR86` verilir. Checkpoint `rebaseDeathCheckpointR86` ile yeniden tabanlanır (R86 ile aynı). |
| `potion-batch-channel-r61.mjs` | Toplu iksir için aynısı. |
| `resident-channel.mjs` | İksir kısa yolu (`potionRefresh`), birleştirilmiş satırı (`mergeDeathRowR86`) karşılaştırır ve kurar. Uyumluluk kanıtı başarısızsa ham SQL satırı kullanılır (R86 ile aynı). |
| `fixed-loop.mjs` | `settled()` içinde `lastApplied=Math.max(...)`. İzinli hareket cevabı, daha eski ve ertelenmiş iksir cevabından önce yerleşebilir; sayaç geri gitmez. |
| `channel-connections.mjs`, `client-transport.mjs` | Bekleyen `use_potion` arkasından bir hareket paketi gönderilebilir. Sunucu ve istemci kuralları birbirinin aynısı. |
| İstemci grafiği | `prepare_client_r88.py`: yeni `core511-transport-r88-f2a907c787e721a0.js` (tek satır), yeni `game-client-core511-r88-aa6aed7dd8933fa4.js` (yalnız ulaşım dosyası adı değişti). İsim alanı `core511-cf3191131d993da1`. HTTP'de 351 isim alanı + 2 istemci adı değişti; ters dönüşüm eşitliği doğrulandı. Eski dosyalar korunuyor. |
| `tools/setup_local.py` | `vendor/node_modules → native-node_modules` bağlantısı. Olmadan `@livekit/protocol → @bufbuild/protobuf` çözülemiyordu. |

Değişmeyenler:
- Dayanıklı ödül/HP ACK'ı commit'ten önce verilmez.
- SQLite tek yazıcı olarak kalır.
- Tahmin sınırı (600 ms) aynı.
- Vuruş vadesi, checkpoint gecikmesi, kapsam ve sahiplik kontrolleri kaldırılmadı.

**Kapatma:** `CORE511_R88_ACTION_MOVEMENT=0`, sunucu tarafındaki izni kapatır. İstemci yine iksirin arkasından hareket gönderir; sunucu bunu eskisi gibi iksir bitene kadar bekletir.

**Bilinen yan etki:** iksir yazılırken bağlantı kopup yeniden bağlanılırsa (≈ yazma süresi kadar bir pencere), istemci o iksir isteğini `command_outcome_unknown` olarak görebilir. Dayanıklı sonuç ve HP yine doğru yazılır ve dünya güncellemesiyle gelir.

## 3. Sonuçlar (yerel, sentetik)

Kimlikler:

| | SHA |
|---|---|
| Çekirdek R87 | `e2226a62…db22` |
| Çekirdek R88 (istemci grafiği dahil) | `4ace1b93e4e2c0eec9523cccd12186c66ef832e252210968d69b891e4b7a9961` |
| HTTP | `c73f9f0414365fa6d93aa1d356053d022a3300e1ce69140162120bc19ca6e973` |
| Ingress (değişmedi) | `325bd1ca…ec9` |

| Koşu | Sürüm | Donma | Kısılan kare | 1. sn (iksir) | 3–4. sn (öldürme) |
|---|---|---|---|---|---|
| midjoin 50×60 | R87 | 63 | 260 | 36 / 162 kare | 24 / 94 kare |
| midjoin 50×60 | R88 | 52 | 165 | 11 / 14 kare | 36 / 141 kare |
| crowd 50×60 | R87 | 60 | 142 | 35 / 96 kare | 24 / 45 kare |
| crowd 50×60 | R88 | 52 | 248 | 2 / 5 kare | 49 / 242 kare |
| crowd 50×180 | R87 | 74 | 499 | — | — |
| crowd 50×180 | R88 | 132 | 617 | — | — |

**Yorum:**
- R88 iksir kaynaklı donmayı neredeyse tamamen kaldırıyor.
- Sentetik testte bütün aktörler aynı anda başladığı için, iksir beklemesi kalkınca ilk öldürmeler aynı ana yığılıyor. 3. saniye patlaması büyüyor; toplam donma koşudan koşuya ±%50 oynuyor.
- **R88, sentetik 50 oyuncu kabulünü tek başına geçirmez.**
- Gerçek oyunda otomatik iksir her %50 HP altında tetiklenir, yani iksir sık olur. R88'in faydası orada bu testten fazla olmalı. Bu VDS'de doğrulanmadı.

Hepsinde hata, fault, iptal ve ACK'sız komut 0; ekonomi ve iksir defteri kontrolleri `passed: true`.

## 4. Çalıştırılan doğruluk testleri (R88 ağacı)

- `r87 tests/settings-cache.test.mjs`, `attack-secondary/native-economy.test.mjs`: 3/3.
- `r86 death-movement.test.mjs`, `death-movement-secondary.test.mjs`, `death-movement-sections.test.mjs`, `core511/tests/potion-refresh.test.mjs`: 15/15. Kopyalar `r88_claude_work/tests/` içinde, R87 ağacına yönlendirildi.
- `r86 potion-ten-native.test.mjs` (10 iksir ↔ seri iyileşme/şarj eşitliği, replay, 10. SQL hatasında toplu geri alma): 1/1.

**Yazılmayan test:** iksir sırasında hareketi uçtan uca doğrulayan özel bir birim testi yazılmadı. Kanıt yük testlerindeki `actionGroups`, `moves` ve `preservedPositions` metrikleri. Örneğin midjoin R88: 2 grup, 13 aktör.

## 5. Test düzeneği notları

- `native-crowd50-claude.mjs` ve `native-midjoin-claude.mjs`, kurulum kontrolünü `hp<=100000` yerine `hp<=400000` ve `auto_potion_remaining<=900000` olarak gevşetir.
  - Sebep: bu makinede kurulum yavaş sürüyor; otomatik iksir ölçümden önce 1–2 kez tetiklenebiliyor (örnek: hp=299.955).
  - Ölçüm kapsamı değişmez; can açığı yine ≥600 bin.
  - Orijinal dosyalar değiştirilmedi.
- `setup_commands_drained` hatası ara sıra çıkıyor (10 sn kurulum boşaltma süresi). Tekrar koşunca geçiyor.

## 6. Doğrulanamayanlar

- Canlı VDS, gerçek WAN/TLS/Caddy, gerçek tarayıcıda 50 oyuncu ve FPS.
- Rün Sahili 50 oyuncu, Sis Yarığı, solo/grup zindan, kule, Etkinlik Adası.
  - R88 izni yalnız `forest/frozen/ancient` alanlarında açılır; diğer alanlarda davranış değişmedi.
- R88 için kurulum ZIP'i ve geri alma testi.
- İki tarayıcıda diğer oyuncunun hareket akıcılığı.

## 7. Önerilen sonraki adımlar (öncelik sırası)

1. **İlk öldürme patlaması.** Aynı tick'te çok sayıda öldürmenin dayanıklı yazılmasını yaymak. Yazıcı başına tick bütçesi ya da `combatContinuation` sınırı; ödül doğruluğunu bozmadan.
2. **Vuruş vadesi gelmiş hareket.** R86/R88'deki `blockedState`, hareketlerin çoğunu bekletiyor. Vadesi gelen vuruşu hareketten önce kendi içinde (yalnız HP) uygulayıp sonra hareket etmek, ayrı bir doğruluk tasarımı gerektirir.
3. **Kanal CPU'su.**
   - `notificationViews` her olayda tüm oyunculara sanal soket kuruyor (olay × oyuncu).
   - `diffWorld/diffWorldRowsLinear` abone başına dünya farkı hesaplıyor.
   - Oda başına paylaşılan önbellek ve olay başına alıcı listesi önbelleği aday.
4. **VDS'de** `CORE511_R88_ACTION_MOVEMENT` açık/kapalı A/B, gerçek oyuncu ile.

## 8. Yeniden üretme

```bash
python3 tools/setup_local.py                # Node 22.23.4 resmi arşivi + SHA, vendor bağlantıları
export R85_RUNTIME_TREE=/workspace/ccre/r87_stability_work/working
export R85_EXPECT_INGRESS_SHA=325bd1caa7c52df9df159b63afa3cd7faf470f2cdae3f513a5c4ca29f655cec9
export R85_EXPECT_CORE_SHA=4ace1b93e4e2c0eec9523cccd12186c66ef832e252210968d69b891e4b7a9961
R85_RUNTIME_LABEL=r88-check python3 r87_stability_work/tests/run.py /workspace/ccre/r88_claude_work/tests/native-midjoin-claude.mjs 50 60
R85_RUNTIME_LABEL=r88-check python3 r87_stability_work/tests/run.py /workspace/ccre/r88_claude_work/tests/native-crowd50-claude.mjs 50 60
```

Analiz: `python3 r88_claude_work/analyze_caps.py <json>`. Donmaları saniyeye ve o anda bekleyen komuta göre gruplar.
