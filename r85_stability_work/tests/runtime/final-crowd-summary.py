#!/usr/bin/env python3
"""Seal bounded diagnostics without treating a transport pass as capacity pass."""
from pathlib import Path
import datetime
import hashlib
import json
import sys

root = Path(__file__).resolve().parents[2]
label = sys.argv[1] if len(sys.argv) > 1 else 'r85-final5'
expected = sys.argv[2] if len(sys.argv) > 2 else '82a974b7e7ff1f0e1d657d553f34bc4cdd51ab589eb8ec34254b425e48e07ed4'
expected_ingress = sys.argv[3] if len(sys.argv) > 3 else ('325bd1caa7c52df9df159b63afa3cd7faf470f2cdae3f513a5c4ca29f655cec9' if label == 'r85-final5' else None)
targets = [1, 10, 30, 50, 100]


def pin(relative):
    data = (root / relative).read_bytes()
    return {'path': relative, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


stages = []
for count in targets:
    rawpath = f'evidence/native-mixed-load-{label}-{count}.json'
    summarypath = f'evidence/native-mixed-load-{label}-{count}-summary.json'
    if not (root / rawpath).exists():
        continue
    raw = json.loads((root / rawpath).read_text())
    summary = json.loads((root / summarypath).read_text())[0]
    failures = []
    if not raw['passed']:
        failures.append('transport_economy_or_source_check')
    if raw['coreSHA256'] != expected or not raw.get('sourceUnchanged'):
        failures.append('source_identity')
    if not raw.get('mainEagerStartup'):
        failures.append('installed_startup_policy')
    if label in ['r85-final4', 'r85-final5'] and not raw.get('separateGenerator'):
        failures.append('generator_not_separate')
    realistic_variant = 'native-mixed-load-realistic.mjs' in raw['harnessPins']
    if realistic_variant and (not raw.get('separateGenerator') or raw.get('generatorCount') != min(4, count)):
        failures.append('channel_generator_partition')
    if realistic_variant and raw.get('admissionOnly'):
        failures.append('admission_only_not_capacity_evidence')
    if expected_ingress and (raw.get('deliverySHA256') != expected_ingress or not raw.get('deliveryUnchanged')):
        failures.append('delivery_ingress_identity')
    if raw['seconds'] != (180 if count == 100 else 30 if count in [1, 10] else 60):
        failures.append('required_stage_duration')
    if summary['ackMs']['max'] > 300:
        failures.append('additional_wire_result_max_over300ms')
    if summary['predictionCapEpisodes'] or summary['predictionLimitedInputMs'] > 0:
        failures.append('production600ms_prediction_limit_reached')
    if summary['cancelledInputCount']:
        failures.append('live_input_cancellation')
    checks = []
    for row in summary['processLoops']:
        limit = 200 if row['target'] in ['main', 'world'] else 150
        checks.append({'target': row['target'], 'maxPauseMs': row['maxPauseMs'],
                       'strictCoreLimitMs': limit, 'withinStrictNumericLimit': row['maxPauseMs'] <= limit,
                       'withinHistoricalLocal300': row['maxPauseMs'] <= 300})
        if row['maxPauseMs'] > limit:
            failures.append('core_loop_pause_' + row['target'])
    main = next(row for row in summary['processLoops'] if row['target'] == 'main')
    rss = summary['resources']['maxRssBytes']
    cpu = summary['resources']['totalCpuFraction']
    if main['elu'] > .5:
        failures.append('main_ELU_over0.5')
    if rss > 3 * 1024 ** 3:
        failures.append('game_owner_RSS_over3GiB')
    if cpu > 1:
        failures.append('CPU_over4core_budget')
    stage = {key: summary[key] for key in [
        'players', 'seconds', 'ackMs', 'ackOver300ms', 'ackOver600ms',
        'predictionCapActors', 'predictionCapEpisodes', 'maxPredictionCapEpisodeMs',
        'predictionLimitedInputMs', 'cancelledInputCount', 'unacknowledged',
        'maxWriterDepth', 'maxOldestWriterAgeMs', 'economicActorsChecked', 'nativeKillClaims']}
    stage.update(passed=not failures, safetyEconomyPassed=raw['passed'], performanceFailures=failures,
                 loopChecks=checks, mainELU={'windowMean': main['elu'], 'limit': .5, 'withinLimit': main['elu'] <= .5},
                 totalGameOwnerPeakRSS={'bytes': rss, 'limitBytes': 3 * 1024 ** 3, 'withinLimit': rss <= 3 * 1024 ** 3,
                    'meaning': 'Sum of owner process lifetime peak RSS, not simultaneous sum. Reader shares main process; separate generator excluded when present.'},
                 CPUFractionOf4CoreBudget=cpu, raw=pin(rawpath), summary=pin(summarypath),
                 log=pin(f'evidence/native-mixed-load-{label}-{count}.log'),
                 harnessPinsAtRun=raw['harnessPins'], startup=raw['nodeExecArgv'], allSamplesIncluded=True)
    stage['mainELU']['nativeDiagnosticPeakSinceStartup'] = raw['diagnosticsAfter']['main'].get('eventLoopUtilizationMax')
    stage['separateGenerator'] = raw.get('separateGenerator', False)
    stage['generatorResources'] = raw.get('generatorResources')
    stage['generatorScheduling'] = {
        'variant': 'current-basic-cadence-and-automatic-potion' if realistic_variant else 'original-matched-comparison',
        'processCount': raw.get('generatorCount', 1 if raw.get('separateGenerator') else 0),
        'maxInputFrameGapMs': summary['maxGeneratorFrameGapMs'],
        'inputFrameIntervalMs': raw['clientTransport']['inputFrameIntervalMs'],
        'recordedBasicCadenceRetries': summary.get('recordedBasicCadenceRetries', 0),
        'resourcesMeaning': 'Per-process CPU cores, ELU and pause maxima are retained above. Summed client CPU shares the same host quota with the server; it is not server capacity or a browser FPS measurement.',
    }
    stage['automaticPotionLedger'] = summary.get('automaticPotionLedger')
    stage['topologyPins'] = raw.get('topologyPins')
    stage['deliveryIdentity'] = raw.get('deliveryIdentity')
    queue_rows = raw.get('queueObservation', {}).get('samples', [])
    stage['mainRSS'] = {'sampledPeakBytes': max((r['mainRssBytes'] for r in queue_rows), default=0),
                        'sampledMeanBytes': sum(r['mainRssBytes'] for r in queue_rows) / len(queue_rows) if queue_rows else None,
                        'sampleIntervalMs': 100}
    stages.append(stage)

tested = [stage['players'] for stage in stages]
same_harness = len({json.dumps(stage['harnessPinsAtRun'], sort_keys=True) for stage in stages}) == 1
same_delivery = len({json.dumps(stage['topologyPins'], sort_keys=True) for stage in stages}) == 1
passed = tested == targets and all(stage['passed'] for stage in stages) and same_harness and same_delivery
files = ['tests/runtime/native-mixed-load.mjs', 'tests/runtime/run.py',
         'tests/runtime/native-mixed-load-isolated.mjs', 'tests/runtime/native-mixed-generator.mjs',
         'tests/runtime/native-mixed-load-realistic.mjs', 'tests/runtime/native-mixed-generator-realistic.mjs',
         'tests/runtime/potion-ledger-fixture.mjs',
         'tests/runtime/README-realistic-variant.md', 'evidence/realistic-generator-variant-preparation-r85.json',
         'evidence/realistic-generator-potion-ledger-review-r85.json', 'evidence/final-crowd-execution-plan-r85.json',
         'tests/runtime/r84-fixture-loader.mjs', 'tests/runtime/register-r84-fixture.mjs',
         'tests/runtime/summarize-mixed-load.py', 'tests/runtime/final-crowd-summary.py',
         'evidence/performance-metric-provenance-r85.json', 'evidence/independent-integration-review.json',
         'evidence/rank-fixture-bootstrap-correction-r85.json', 'evidence/generator-isolation-provenance-r85.json',
         'evidence/generator-delivery-identity-r85.json', 'evidence/ingress-nodelay-delivery-verification-r85.json']
report = {
    'version': 1, 'writtenAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'coreSHA256': expected, 'deliverySHA256': expected_ingress, 'passed': passed, 'status': 'bounded-diagnostics-passed' if passed else 'performance-blocked-or-incomplete',
    'targetPlayers': targets, 'testedPlayers': tested, 'notRunPlayers': [n for n in targets if n not in tested],
    'sameHarnessPinsAcrossStages': same_harness,
    'sameDeliveryPinsAcrossStages': same_delivery,
    'failures': [{'players': stage['players'], 'reasons': stage['performanceFailures']} for stage in stages if not stage['passed']],
    'stages': stages, 'pins': {name: pin(name) for name in files},
    'environment': {'observedCgroupCPUQuota': '400000/100000 =4 cores', 'observedCgroupMemoryBytes': 34359738368,
                    'observedProcMemTotalKiB': 34906016, 'userTargetHardware': '8vCPU/8GB, user-reported',
                    'comparison': 'No direct hardware capacity extrapolation. Separate generator and server share the same host CPU quota when separateGenerator=true; generator costs reported separately.'},
    'scope': {'liveTouched': False, 'renderedBrowser': False, 'fullHistoricalLoadSuite': False,
              'transport': 'For separateGenerator=true: actual Core511Transport and OwnPrediction in separate client OS processes; TCP through pinned delivery main startIngress authorization/pipe to four native OS channel TCP listeners, world and SQLite writer. The realistic variant shards clients by channel; original comparison runs use one generator. Candidate ingress has one noDelay option relative to pinned archived predecessor. Outer Caddy/TLS omitted. Earlier co-located IPC results preserved separately.',
              'economy': 'Every actor checked for exact potion debit, seeded material remainder and initial kill receipts; repeated natural kills counted.',
              'metricMapping': 'performance-metric-provenance-r85.json: local300 and core150/200 mean event-loop pause. ACK300 is an additional diagnostic gate. Attack202 is provisional; writer awaits and durable outcomes are separate.',
              'earlySamples': 'No startup, potion, GC or OS exclusions. After10/20s statistics are diagnostic only.',
              'prediction': 'Production600ms limit unchanged. Cap episodes sampled at50ms; unadvanced requested input computed from real pending prediction. No rendered-stop inference.',
              'limits': ['No live VDS acceptance or verified live ingress byte identity', 'No Caddy/TLS or WAN; separate local generator at default process priority',
                         'No complete dungeon/arena/guild/trade/admin crowd mix', 'No full-game browser FPS or physical mobile proof']}}
(root / 'evidence/crowd-summary-r85.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'passed': passed, 'testedPlayers': tested, 'failures': report['failures']}))
