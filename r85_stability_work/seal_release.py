"""Bind completed local evidence to the exact R85 candidate after crowd tests."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from build_release import ROOT, audit, encoded

plan, target = audit()
crowd_path = ROOT/'evidence/crowd-summary-r85.json'
crowd = json.loads(crowd_path.read_text())
assert crowd['passed'] is True and crowd['coreSHA256'] == target
assert crowd['testedPlayers'] == [1,10,30,50,100]
assert crowd['deliverySHA256'] == plan['files']['core511-source/scripts/delivery511/runtime-ingress.mjs']['after']
assert b'__PENDING__' not in (ROOT/'SONUC.md').read_bytes()

paths = {
    'evidence/handoff-integrity.json', 'evidence/source-recovery.json',
    'evidence/client-integration.json', 'evidence/client-review.json',
    'evidence/browser-native.json', 'evidence/progress-summary-r85.json',
    'evidence/collect-summary-r85.json', 'evidence/reward-rank-refresh-verification-r85.json',
    'evidence/independent-integration-review.json', 'evidence/independent-collect-trigger-proof.json',
    'evidence/performance-metric-provenance-r85.json',
    'evidence/ingress-nodelay-delivery-verification-r85.json',
    'evidence/ingress-installer-verification-r85.json',
    'evidence/instances-r85-final-candidate.json', 'evidence/instances-r85-final-candidate.tap',
    'evidence/installer-final.json', 'evidence/final-syntax.json',
    'evidence/crowd-summary-r85.json', 'evidence/package-plan.json',
    'tests/writer/writer-verification.json', 'tests/writer/writer-production-pins.json',
    'tests/client/native-respawn-change.json', 'tests/runtime/run.py',
    'tests/runtime/native-mixed-load-isolated.mjs', 'tests/runtime/native-mixed-generator.mjs',
    'tests/runtime/summarize-mixed-load.py', 'tests/runtime/final-crowd-summary.py',
    'KURULUM.md', 'SONUC.md',
}
for name in ('progress-summary-r85.json','collect-summary-r85.json'):
    for row in json.loads((ROOT/'evidence'/name).read_text()).get('artifacts', []):
        paths.add(row['path'])
rank = json.loads((ROOT/'evidence/reward-rank-refresh-verification-r85.json').read_text())
paths.update(rank['evidence'])
if 'core511-source/scripts/core511/writer-lane-r533.mjs' in plan['files']:
    paths.add('evidence/writer-inline-verification-r85.json')
    inline=json.loads((ROOT/'evidence/writer-inline-verification-r85.json').read_text())
    paths.add(inline['candidateAfter']['path'])
    paths.update(row['path'] for row in inline['artifacts'])
if 'core511-source/scripts/core511/death-batch-single-r57.mjs' in plan['files']:
    paths.update(('evidence/independent-deaths-r85-verification.json',
                  'evidence/independent-death-review-final-addendum-r85.json',
                  'evidence/crowd-fix-integration-r85.json'))
    batch=json.loads((ROOT/'evidence/independent-deaths-r85-verification.json').read_text())
    paths.update(row['path'] for row in batch['artifacts'])
    approval=json.loads((ROOT/'evidence/independent-death-review-final-addendum-r85.json').read_text())
    paths.update(row['path'] for row in [*approval['candidateFiles'],*approval['newArtifacts']])
for row in json.loads((ROOT/'tests/writer/writer-verification.json').read_text())['results']:
    paths.add(row['log'])
if any('core511-source/scripts/core511/'+name in plan['files'] for name in ('adventure-channel.mjs','loot-profile-cache-r61.mjs')):
    paths.add('evidence/final-candidate-integration-r85.json')
    latest=json.loads((ROOT/'evidence/final-candidate-integration-r85.json').read_text())
    paths.update(row['path'] for row in latest['evidencePins'])
    for row in latest['files']:
        paths.update((row['before']['path'],row['after']['path']))
for row in json.loads((ROOT/'evidence/installer-final.json').read_text())['runs']:
    paths.add(row['output'])
for name in ('ingress-nodelay-delivery-verification-r85.json','ingress-installer-verification-r85.json'):
    paths.update(json.loads((ROOT/'evidence'/name).read_text())['evidence'])
for name,meta in crowd['pins'].items():
    data=(ROOT/name).read_bytes()
    assert len(data)==meta['bytes'] and hashlib.sha256(data).hexdigest()==meta['sha256']
    paths.add(name)
for stage in crowd['stages']:
    assert stage['passed'] is True and stage['allSamplesIncluded'] is True
    assert stage['deliveryIdentity']['beforeSHA256']==crowd['deliverySHA256']==stage['deliveryIdentity']['afterSHA256']
    for key in ('raw','summary','log'):
        meta=stage[key];data=(ROOT/meta['path']).read_bytes()
        assert len(data)==meta['bytes'] and hashlib.sha256(data).hexdigest()==meta['sha256']
        paths.add(meta['path'])
pins = []
for name in sorted(paths):
    data = (ROOT/name).read_bytes()
    pins.append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
gate = {'version':'R85_GAMEPLAY', 'recordedUtc':datetime.now(timezone.utc).isoformat(),
    'coreSHA256':target, 'baseCoreSHA256':plan['baseCoreSHA256'], 'productionFiles':plan['files'],
    'allRequiredChecksPassed':True, 'liveDeploymentPerformed':False, 'crowdTestedLast':True,
    'crowdSummary':'evidence/crowd-summary-r85.json', 'evidencePins':pins,
    'scope':'Local native SQLite/channel/worker/real-WebSocket integration and bounded final mixed protocol load. Does not certify live VDS traffic, full-game rendering, physical mobile or zero future lag.'}
(ROOT/'evidence/final-release-gate.json').write_bytes(encoded(gate))
print(json.dumps({'sealed':True,'coreSHA256':target,'evidenceFiles':len(pins)}))
