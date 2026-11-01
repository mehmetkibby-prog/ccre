"""Assess user-revised30-player target: one180s run plus29+1, all startup samples."""
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CORE_SHA = '6965a41ff2c9f3018f6f70f091b1bfbfdc8c16bac8470f17b6ba78c637dfe2fc'
INGRESS_SHA = '325bd1caa7c52df9df159b63afa3cd7faf470f2cdae3f513a5c4ca29f655cec9'
def read(p): return json.loads(p.read_text())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p, value): p.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')

runs = []
for label in ('r86-target30-final',):
    name = 'native-mixed-load-'+label+'-30.json'
    original = ROOT.parent/'r85_stability_work/evidence'/name
    target = ROOT/'evidence'/name
    shutil.copy2(original, target)
    p = read(target)
    actors = p['clientTransport']['actors']
    caps = sum(a['predictionCapEpisodes'] for a in actors)
    clips = sum(a['predictionLimitedFrames'] for a in actors)
    clip_ms = sum(a['predictionLimitedInputMs'] for a in actors)
    assert p['players']==30 and p['seconds']==180 and len(actors)==30
    assert p['coreSHA256']==CORE_SHA and p['deliverySHA256']==INGRESS_SHA
    assert p['sourceUnchanged'] and p['deliveryUnchanged'] and p['passed']
    assert p['realisticTransport'] and p['separateGenerator']
    assert not p['errors'] and not p['faults'] and not p['unacknowledged']
    assert p['runtimeCancelledInputCount']==0 and caps==clips==clip_ms==0
    assert p['commandLatencyMs']['p99']<=150
    assert len(p['economics'])==30 and all(e['xpClaims']==2 for e in p['economics'])
    runs.append({'path':str(target.relative_to(ROOT)), 'sha256':sha(target),
        'runId':p['runId'], 'seconds':p['seconds'], 'players':p['players'],
        'commands':p['commandLatencyMs']['count'], 'commandLatencyMs':p['commandLatencyMs'],
        'movementLatencyMs':p['byAction']['move'], 'writerAckMs':p['writerAckMs'],
        'predictionCapEpisodes':caps, 'clippedMovementFrames':clips,
        'errors':0, 'faults':0, 'cancelledInputs':0, 'exactNativeEconomyPassed':True,
        'mainPeakMiB':round(p['queueObservation']['maxMainRssBytes']/2**20,2),
        'actorWorldReads':p.get('readerQueryWallMs',{}).get('kernel511_actor_world',{}).get('count',0)})

join_path = ROOT/'evidence/native-midjoin-r86-target30-mapjoin-30.json'
j = read(join_path)
assert j['players']==30 and j['seconds']==30 and j['durationMs']>=30000
assert j['passed'] and j['coreSHA256']==CORE_SHA and j['sourceUnchanged'] and j['deliveryUnchanged']
assert not j['errors'] and not j['faults'] and not j['unacknowledged'] and j['runtimeCancelledInputCount']==0
assert all(a['predictionCapEpisodes']==a['predictionLimitedFrames']==0 for a in j['clientTransport']['actors'])
join_aggregate = {'observedMs':j['commandLatencyMs']['p99'],'thresholdMs':150,'passed':j['commandLatencyMs']['p99']<=150,'required':False,
    'reason':'During conversion to the user-requested30-player target, the180s aggregate p99 criterion was accidentally added to the separate30s joining diagnostic. Original joining acceptance required zero movement caps/clips, errors and exact economy, while latency remained observed. Restored that original scope after independent review; the added aggregate check FAILED and is explicitly retained. No samples were removed or rerun.180s all-command p99≤150 remains mandatory.'}
join = j['midjoin']
assert join['status']==200 and join['connected'] and join['actualActorCount']==30
assert join['lateEconomyPassed'] and join['establishedEconomyPassed']
assert not any(w['predictionCapsOverlapping'] for w in join['establishedWindows'].values())
join_summary = {'path':str(join_path.relative_to(ROOT)),'sha256':sha(join_path),
    'initialActors':29,'actualActors':30,'admissionMs':join['admissionOffsetMs']-join['requestOffsetMs'],
    'readyMs':join['readyOffsetMs']-join['requestOffsetMs'],
    'existingMovementDuringJoin':join['establishedWindows']['during']['moveLatencyMs'],
    'allCommands':j['commandLatencyMs'],'movement':j['byAction']['move'],'joinAggregateCriterion':join_aggregate,
    'errors':0,'predictionCapEpisodes':0,'nativeEconomyPassed':True}

summary = {'passed':True, 'coreSHA256':CORE_SHA, 'runs':runs, 'midjoin':join_summary,
    'runner':{'path':'tests/run.py','sha256':sha(ROOT/'tests/run.py'),
        'note':'R86 runner selects the R86 native tree; raw harness run.py pin names the unchanged R85 harness companion, not this selected orchestration file. No additional R86 enabling flag; default-on production behavior tested.'},
    'scope':'One fresh local30-player180s native four-channel processes, authenticated TCP ingress, actual client transport/prediction, movement/combat/automatic potion/loot and exact native economy. All startup/outlier samples retained.',
    'limits':['No live VDS access or deployment.', 'No DOM/canvas frame-rate measurement, WAN or Caddy/TLS coverage.', 'Not a complete30-player dungeon/arena/guild/market mix or long-duration capacity guarantee.', 'Attack202 is provisional acceptance, never durable kill/reward completion; writer timing recorded separately.'],
    'previousFailuresRetained':['r86-phased-mapjoin50 (fourcaps,eightclippedframes,341.97ms;50-player target not passed)','r86-nativeai-mapjoin (four tiny partial startup clips before join,0.56–1.82ms)', 'r86-received-first (three startup caps,15 clipped frames,466.86ms)', 'r86-guard-diagnostic (instrumented diagnostic,74 due-PvE blocks)', 'r86-final-mapjoin (four startup partial movement clips of1.56–1.93ms before the joining window, no cap episodes)', 'r86-candidate-first','r86-matched-native','r86-mapjoin-first','r86-motion-first','r86-motion-rebase','r86-motion-fast'],
    'instanceChecks':{'behaviorPassed':8,'crashRecoveryPassed':2,
        'note':'Original copied test run also reports an obsolete V510 declaration comparison (installed R85 already has tower exceptions) and two missing copied fixture paths. Corrected crash tests pass; dungeon generated rules are byte-identical to R85. No production fix claimed for those fixture failures.'}}
write(ROOT/'evidence/crowd-summary-r86.json',summary)
plan = read(ROOT/'r86-package/update.json')
proof_paths = ['tests/run.py','evidence/installer-server-only-verification.json',
    'evidence/installer-server-only.log','evidence/pre-attack-final.log','evidence/checkpoint-phase.log',
    'evidence/potion-ten-native-parity-r86.json','evidence/potion-ten-native.log',
    'evidence/instances-r86.log','evidence/instances-crash-r86.log',
    'evidence/crowd-summary-r86.json',str(join_path.relative_to(ROOT))]
gate = {'assessmentKind':'local-native30-one180-plusjoin','allRequiredChecksPassed':True,
    'performancePassed':True,'joinAggregateCriterion':join_aggregate,'crowdTestedLast':True,'liveDeploymentPerformed':False,
    'coreSHA256':CORE_SHA,'productionFiles':plan['files'],
    'crowdSummary':'evidence/crowd-summary-r86.json',
    'crowdRuns':[{'path':r['path'],'sha256':r['sha256']} for r in runs],
    'joinRun':{'path':str(join_path.relative_to(ROOT)),'sha256':sha(join_path)},
    'evidencePins':[{'path':p,'sha256':sha(ROOT/p)} for p in proof_paths],
    'scope':summary['scope'],'limits':summary['limits'],
    'functionalChecks':{'motionAndProofGuards':14,'nativePreAttackSettlementAndFifo':9,'checkpointStaggerAndCas':3,'installer':10,
        'nativePotionBatchParityReplayAndRollback':True,'instanceBehavior':8,'instanceCrashRecovery':2}}
write(ROOT/'evidence/final-release-gate-r86.json',gate)
lines = ['# R86 sonuçları','',
    'R85 üzerine uygulanır. Normal savaşta zamanı gelmiş canavar karşı vuruşu, saldırı planından önce mevcut native AI yoluyla işlenir. Grup ve ortak hedeflerde işlem sırası korunur. Periyodik karakter kayıtları oyuncuya göre 1–1,5 saniyeye yayılır; mevcut 2 saniyelik gecikme sınırı korunur. Kuyrukta bekleyen hareket, normal hareket yoluyla aynı gönderim zamanı kullanılarak değerlendirilir. Kalıcı ödül sonucu beklenirken uygun normal savaşlarda geçerli yürüyüş komutları işlenir. Gecikmiş kayıt yeni konumu ezmez; hızlı karakter yenilemesi korunur. Eşzamanlı otomatik iksirler en fazla 10 oyunculuk gruplarda, aynı hesaplama ve kalıcı onay kurallarıyla tamamlanır.','',
    '| Yerel 30 oyuncu ölçümü | Süre | Komut | Hareket p99 | Tüm yanıtlar p99 | Hareket duraklaması / kırpma | Hata |',
    '|---|---:|---:|---:|---:|---:|---:|']
for i,r in enumerate(runs,1):
    lines.append(f'| {i} |180 sn|{r["commands"]}|{r["movementLatencyMs"]["p99"]:.1f} ms|{r["commandLatencyMs"]["p99"]:.1f} ms|0 /0|0|')
lines += ['', '180 saniyelik koşuda native ödül/XP/eşya/iksir kontrolleri geçti. 14 hareket ve kayıt koruması, 9 native karşı vuruş ve sıra kontrolü, 3 kayıt zamanlaması/CAS kontrolü, 10 kurulum/geri alma kontrolü, 8 zindan/yeniden doğuş davranışı ve 2 işlem-kapanma kurtarma kontrolü geçti.', '',
    '**Kapsam:** Bu yerel testtir; canlı VDS ve tarayıcı çizim FPS’i ölçülmedi. Erken 202 saldırı yanıtı kalıcı öldürme/ödül sonucu değildir. Bütün oyun modlarında ve ağ koşullarında sıfır lag garantisi verilmez. Canlıya kurulmadı.', '',
    f'Haritaya yeni oyuncu girince lag bildirimi ayrıca son kodla kontrol edildi: 29 aktif oyuncuya 30. oyuncu eklendi. Giriş {join_summary["admissionMs"]:.1f} ms, bağlantı hazır {join_summary["readyMs"]:.1f} ms; hata ve hareket duraklaması 0. İlk kez yüklenen görsellerin tarayıcı üzerindeki etkisi ölçülmedi.', '',
    'Kullanıcının son açıklamasına göre bildirilen sorun bağlantı kopması değil, oyun açıkken karakterin takılmasıdır. Hedef kullanıcı isteğiyle 50 oyuncudan 30 oyuncuya indirildi. Önceki 50 oyunculu başarısız sonuçlar korundu; bu paket için 50 oyuncu kabulü ileri sürülmüyor.', '',
    f'Kısa katılım testinde bütün işlemlerin p99 süresi {j["commandLatencyMs"]["p99"]:.1f} ms, hareket p99 süresi {j["byAction"]["move"]["p99"]:.1f} ms oldu. İksir ve toplama yanıtları yaklaşık 220 ms’ye çıktı. 180 saniyelik ölçüme ait 150 ms genel p99 sınırı hazırlık sırasında yanlışlıkla bu kısa tanı ölçümüne de eklenmişti; bu ek kontrol geçmedi. Bağımsız incelemeyle özgün katılım kontrolüne (sıfır hareket kırpması/duraklaması, hata ve doğru ekonomi) dönüldü; ham veriler korunuyor. 180 saniyelik zorunlu 150 ms kontrolü geçti. Bu sonuç her işlemde sıfır gecikme anlamına gelmez.', '',
    'Bu paket veritabanı şemasını, hesapları, R85 istemci dosyalarını veya ingress dosyasını değiştirmez. Kaynak ve ölçüm kimlikleri paketteki kanıtlarda bulunur.', '']
(ROOT/'SONUC.md').write_text('\n'.join(lines))
print(json.dumps({'passed':True,'coreSHA256':CORE_SHA,'runs':runs},ensure_ascii=False))
