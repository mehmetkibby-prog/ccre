# Devir: R110_HANDOFF1 (Claude oturumu, 12 Kasım 2026)

Bu belge, bu depoda sonradan çalışacak bir asistanın (ChatGPT/Codex vb.)
R110'da ne yapıldığını tek yerden öğrenmesi içindir. Proje kuralları için
`CLAUDE.md` / `AGENTS.md` geçerlidir.

## 1. Canlı durum (en önemli kısım)

- VDS'de **R110_HANDOFF1 kurulu** (Efsane/r1 + Akademi/r2). Kurucu çıktısı:
  "R110 TAKILMA DÜZELTMESİ TAMAMLANDI. Efsane ve Akademi hazır."
- `state.json` → `r64Deployment.version = "R110_HANDOFF1"`.
- Sağlık yanıtı (`/api/vds-health`): eski işaretler aynen + yeni
  `realtimeHandoff: "R110_HANDOFF1"` (`latencyRepair: "R109_LATENCY2"` duruyor).
- Kurulu çekirdek kimliği (targetCore):
  `de7e042120f54f92fc62d53164696ff7df6ba2b60ef650fe0fc49bfaa00b2411`.
- Paket: `project/r110_takilma/delivery/r110-takilma.zip`, SHA256
  `4fd1fbb8a36de2ae89fb693f5617ac3a8e697f2608f4a6b14464b6703a83bcc0`.
- **İsim çakışması:** `measurements/not-installed/r110_responsiveness` ve
  `r111_latency` daha eski, KURULMAMIŞ denemelerdir; R110_HANDOFF1 ile ilgisi yok.
- R109 ve R110 ZIP'lerini canlıya tekrar uygulatma. Sonraki paketin kaynak
  sürümü **R110_HANDOFF1** olmalı.

## 2. Kod nerede

- Depo: `github.com/mehmetkibby-prog/ccre`, dal `claude/r110-takilma-duzeltmeleri`.
- Canlıdaki R110 kodu = `r109-inceleme/project/r109_latency_completion/working`
  (dizin adı R109 olarak kaldı; içerik R110). `npm run verify` yalnız R109
  tabanını doğrular, bu ağaçta değişen dosyaları bilerek "farklı" listeler.
- R110 kurucusu, paketleyicisi, testleri, belgeleri: `project/r110_takilma/`.

## 3. R110 neyi değiştirdi (12 runtime dosyası, veri/şema değişikliği yok)

| Dosya (working/ altında) | Değişiklik |
|---|---|
| `core511-source/scripts/delivery511/runtime-ingress.mjs` | WebSocket yükseltmesi, aynı denetimlerden sonra TCP vekili yerine `handoff(...)` ile kanal sürecine verilir; olmazsa eski TCP vekili. |
| `core511-source/scripts/delivery511/runtime-host.mjs` | `startIngress`'e `handoff: supervisor.handoffWebSocket` bağlanır. |
| `core511-source/scripts/core511/process-supervisor.mjs` | `handoffWebSocket()`: kanal hazırsa soketi `child.send(..., socket)` ile verir. **Önce `handle.readStop()`** (aksi halde ilk istemci çerçevesi kaybolur; `tests/ws-handoff-race.test.mjs` bunu korur). `socket.server=null` (kapanış asılı kalmasın). Sayaçlar: `handoffStatsR110`. |
| `core511-source/scripts/core511/channel-process.mjs` | `kernel511-ws-handoff` mesajındaki soketi `endpoint.adopt()` ile alır (bayraktan bağımsız hep açık). |
| `core511-source/scripts/core511/ws-endpoint.mjs` | `adopt()`: alınan soket için aynı upgrade işleyicisi (Origin, loopback, X-Real-IP, bekleyen sınırı, IP bütçesi, ws el sıkışması). |
| `core511-source/scripts/core511/r110-options.mjs` (yeni) | `CORE511_R110_WS_HANDOFF` (varsayılan açık, `=0` R109 davranışı). |
| `core511-source/scripts/core511/native-http-bindings.mjs` | Sağlık yanıtına `realtimeHandoff: 'R110_HANDOFF1'`. |
| `native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs` | Yazıcı kapsamı dışındaki `prepareCached477` çağrıları tek çağrılık kapsamda LRU kullanır (aynı şema denetimi). `CORE511_R110_SCOPED_FACADE=0` ile kapanır. |
| `core511-source/scripts/core511/checkpoint-sql-r531.mjs`, `nonlethal-rewards-r56.mjs` | Şema sürümü PRAGMA'ları her çağrıda derlenmez (`preparedSchemaVersions477`). |
| `core511-source/scripts/core511/shared-refresh-scope.mjs`, `item-refresh-audit-r57.mjs` | TEMP tablo okumaları `prepareCached477` ile. |

Değişmeyenler: oyun kuralları, RNG/seed, kayıt/makbuz biçimi, SQLite
COMMIT/kalıcılık, makbuz/idempotency, epoch/sahiplik, bilet/Origin/IP
denetimleri, kabul sınırı (r1 4×25, r2 4×10), oto atak IP kuralı, istemci.

## 4. Sonraki kurulum paketi (R111) nasıl yapılır

`project/r110_takilma/` şablondur:
- `deployment/modules/`: `installer.py` (`VERSION`, eski yedek temizliğinin
  izinli sürümlerine `R110_HANDOFF1`, temizlik sağlık koşuluna yeni işaret),
  `readiness.py` (bütün sürüm listelerine yeni sürüm + yeni işaret denetimi),
  `source_identity.py` (kaynak mesajı). R110'da yakalanan tuzak: R109
  kurucusundaki `latencyRepair == VERSION` koşulu yeni sürümde hiç sağlanmaz,
  yedek temizliği sessizce ertelenir; R110'da `realtimeHandoff == VERSION`
  yapıldı. Yeni sürümde VERSION'a bağlı bu koşulu da yeni işarete çevir.
- `build/package.py`: R109 tabanını R105 ağacı + R109 ZIP yükünden kurar ve
  `docs/r109-runtime-manifest.json`'a karşı doğrular. R111 için taban
  = bu + R110 ZIP yükü; sonucu R110 targetCore'una karşı doğrula. Değişen
  dosya kümesini incelenmiş listeye eşitle (assert).
- Sağlık işaretini `native-http-bindings.mjs`'teki nesneye ekle.
- `docs/GUNCELLEME_KURALLARI.md` uygulanır; eski ZIP/SHA256'lara dokunulmaz.
- Testler: `tests/installer_test.py` R109 düzeneği kurar; R111 için düzeneğe
  R110 yükü de yazılmalı ve kaynak `R110_HANDOFF1` olmalı.

## 5. Testler (hepsi bu dalda geçti)

```bash
cd r109-inceleme && npm ci && npm run setup
npm test               # odaklı 56/56 (yarış testi dahil)
npm run test:native    # 29/29
npm run test:captcha   # 20/20
npm run test:installer # R109 kurucusu 26/26 (setup gerekli)
npm run test:handoff   # çalışma ağacı R109 kurulumunun üstüne
npm run test:r110      # R110 kurucusu 16/16 + kurduğu ağaç gerçek runtime-entry ile
REVIEW_CHROMIUM=/path/chrome R102_TEST_REALM=r1 TOWER=1 BROWSER_WS_TRANSPORT=handoff npm run test:browser
```

## 6. Ölçüm araçları

- `npm run load -- --players 50 --mode mixed` (10/30/40/50/100; r2 en çok 40).
- Yalnız test tanıları (ortam değişkeni): `SQL_CENSUS=1` (sorgu sayımı),
  `FRAMING_CENSUS=1` (IPC çerçeve/gönderim sayımı), `CPU_PROFILE=1`.
  `scripts/run.py` `CORE511_*` değişkenlerini siler; bayrak A/B için ayrı
  koşucu gerekir.
- R109 ile A/B: R109 dosyalarıyla bir `working` kopyası `STUTTER_TREE` ve
  `CLIENT_TREE` olarak verilir (aynı test düzeneği, karışık sıra).

## 7. Sonuçlar ve öğrenilenler

- Laboratuvar (R109 ↔ R110, karışık sıra): ana süreç olay döngüsü yükü
  %6–13 daha düşük; komut yanıtı p95 medyanı 50 oyuncuda 161 → 144 ms, 100'de
  286 → 230 ms, ortak bossta 590 → 411 ms; tick 10–50 oyuncuda aynı; 100
  oyuncuda (4 vCPU doymuş) bir çiftte tick p99 +6 ms. Toplam CPU aynı.
  Ayrıntı: `measurements/r110-aday/RAPOR.md`.
- Canlı (R110 kurulu, `measurements/live-r110/RAPOR.md`): ana süreçteki oyuncu
  WebSocket aktarımı 654 → 27–83 ms/dk; 11 oyuncuda ana süreç %32,9 dolu,
  hiçbir 1 sn pencere %59'u geçmedi. Yükün çoğu savaş kayıt yolu (saldırı,
  canavar karşılığı, ödül SQL, yanıt JSON'u).
- Olumsuz/uygulanmayan denemeler (`measurements/r111-deneme/RAPOR.md`): ana
  süreç GC genç nesil ayarı, IPC çerçeve birleştirme, ham soket çifti — ölçülebilir
  fayda yok. `command-failure-scope` sarmalayıcısının maliyeti ölçülemiyor;
  profilde ona yazılan süre SQLite'ın kendi işi. Koruma sorguları kaldırılmaz.
- Test botu artık sunucunun yasal `429 basic_attack_cadence` yanıtında bekler
  (hata saymaz); botlar istemciye gelen mesaj aralıklarını da kaydeder.

## 8. Açık konular

- 30–40 gerçek oyunculu canlı profil ve `vmstat 1 60` henüz yok; ana sürecin
  o yükte doyup doymadığı bilinmiyor.
- Büyük ek kazanç mimari değişiklik ister (ör. SQLite yazıcısını ayrı iş
  parçacığına almak); yalnız canlı ölçüm doyma gösterirse gerekçelenir.
- R110'da ana süreç GC duraklaması oyuncu hareketini durdurmaz, yalnız ana
  sürece giden komut yanıtlarını kısa süre geciktirebilir.

## 9. Commit listesi (taban 6096cac)

`cff72b2` ws file:// eşlemesi · `25ae5da` SQL sayımı · `c72b24b`, `c5743e8`,
`30337a3` SQL derleme düzeltmeleri · `53d7299` WebSocket devretme · `a53f506`
runtime-entry testi · `e5bed25` bot ritim beklemesi · `7a255a6` mesaj aralığı
ölçümü · `3d008ce` yarış testi · `b4ca8b6` tarayıcı devretme modu · `ba1e072`,
`0dcb48f` rapor/kanıt · `bceb034` sağlık işareti · `137da54` R110 kurucu
modülleri · `c2a9e3b` paketleyici + ZIP · `a0ced95` R110 testleri · `52d3166`
göreli paket kaydı · `7cc540d`…`d0440b4` canlı profiller · `2d2d65d` çerçeve
sayımı · `6310cf3` olumsuz denemeler.
