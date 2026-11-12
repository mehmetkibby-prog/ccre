"""Build the read-only R109 follow-up report from the preserved uploaded profiles."""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
evidence = ROOT / 'evidence'
audit = json.loads((evidence / 'sample-span-audit.json').read_text())
detail = json.loads((evidence / 'new-profile-analysis.json').read_text())
latest = audit['new_6_players']
assert latest['sha256'] == detail['sha256']
assert abs(latest['afterInspectorNonIdlePercent'] - detail['afterInspector']['nonIdlePercent']) < 1e-10
assert abs(latest['nativeSqlLeafMs'] - next(x['weightedMs'] for x in detail['categories'] if x['category'] == 'native_sql_method_leaf')) < 1e-8
health = json.loads((evidence / 'live-r1-health.json').read_text())
assert health['latencyRepair'] == 'R109_LATENCY2' and health['captchaWorker'] == 'R106_CAPTCHA1'
observed = datetime.fromtimestamp(health['runtimeDiagnosticsR80']['measuredAtMs'] / 1000, timezone.utc).isoformat()
rows = []
for label, key in [('Önceki kayıt: 10 oyuncu', 'old_10_players'), ('Önceki kayıt: 1 oyuncu', 'previous_1_player'), ('Yeni kayıt: 6 oyuncu', 'new_6_players')]:
    r = audit[key]
    rows.append(f"| {label} | %{r['afterInspectorNonIdlePercent']:.2f} | {r['nativeSqlLeafMs']:.1f} | {r['nativePrepareLeafMs']:.1f} | {r['gcSampledMs']:.1f} | {r['gcSampleSpans'][0]['sampleSpanMs']:.1f} |")
table = '\n'.join(rows)
report = f'''# R109 sonrası canlı CPU profili — 6 oyuncu

Kullanıcı oyuncu sayısını **6** olarak bildirdi. Ölçümdeki harita/etkinlik ve
sunucu ayrıca belirtilmedi. Ayrı sağlık sorgusu Efsane'nin güncel durumunu
doğruladı; bu sorgu profilin çekildiği aynı zaman aralığı değildir.

## Sonuç

Kayıt {latest['durationMs']/1000:.3f} saniye, 27.931 örnek. İlk
{latest['initialInspectorSampleMs']:.3f} ms doğrudan profiler başlatma yığınında;
oyun yükü özetinden ayrı tutuldu. Sonraki {latest['afterInspectorSampledMs']/1000:.3f}
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
{table}

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
değildir. Sağlık tanısı zamanı: {observed}.

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

- Ham dosya değişmedi; SHA256: `{latest['sha256']}`.
- `evidence/new-profile-analysis.json`: ağırlıklı öz-süre/kapsayıcı sıralama.
- `evidence/sample-span-audit.json`: üç profil ve GC örnek aralıkları.
- `evidence/live-r1-health.json`: ayrı salt okunur canlı yanıt.
- `audit-extra.py` ve `build-report.py`: yerel inceleme ve rapor üretimi.
- Kullanılan ana analiz: `../r105_postinstall_profile/analyze-profile.py`.

CPU örnekleri çağrı sayıları veya kesin fonksiyon süreleri değildir. Örnekler
arasındaki bekleme aralıkları son örneklenen yaprağa ağırlık olarak atanmıştır;
işletim sistemi zamanlaması ve native bekleme bu ağırlığı etkileyebilir.
'''
(ROOT / 'RAPOR.md').write_text(report)
summary = {'players': 6, 'populationSource': 'user reply', 'captureRealm': None, 'captureActivities': None,
           'mainSampledNonIdlePercent': latest['afterInspectorNonIdlePercent'],
           'longestGcSampleSpanMs': latest['gcSampleSpans'][0]['sampleSpanMs'],
           'sourceSha256': latest['sha256'], 'r1LiveR109Confirmed': True, 'r2LiveConfirmed': False,
           'r2AccessFailure': 'workspace proxy HTTP403, not a service health finding',
           'liveCodeChanged': False, 'performanceTargetProven': False, 'zeroLagProven': False}
(evidence / 'conclusion.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
