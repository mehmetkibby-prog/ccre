"""Verify exact installed R121 bytes with real r1/r2 processes and R118 schema."""
import json, os, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parent
record = ROOT / 'evidence/runtime-stage.json'
stage = json.loads(record.read_text())
package = json.loads((ROOT / 'evidence/package.json').read_text())
assert stage['package']['sha256'] == package['sha256']
assert stage['installedVersion'] == 'R121_CLEANUP1'
assert stage['targetCore'] == package['targets']['R120_2D_DEPOT4']['core']
env = {**os.environ, 'RUNTIME_STAGE_FILE': str(record),
       'RUNTIME_EVIDENCE_DIR': str(ROOT / 'evidence'),
       'RUNTIME_LABEL': 'relocated-r121',
       **{'RUNTIME_EXPECT_R' + str(n): '1' for n in range(110, 116)}}
if '--verify-record' not in sys.argv:
    subprocess.run([sys.executable, str(PROJECT.parent / 'scripts/run.py'),
                    '--test', str(PROJECT / 'r118_royal_champions/tests/relocated-entry.test.mjs')],
                   env=env, check=True)
observed = json.loads((ROOT / 'evidence/relocated-r121-runtime.json').read_text())
assert observed['package']['sha256'] == package['sha256']
assert observed['realChannels'] == 8 and observed['cleanShutdown'] is True
assert {row['realm'] for row in observed['realms']} == {'r1', 'r2'}
for row in observed['realms']:
    h = row['health']
    assert h['cleanupIsolation'] == 'R121_CLEANUP1' and h['cleanupIsolationReady'] is True
    assert h['royalChampions'] == 'R118_ROYAL1' and h['royalReadyR118'] is True
    assert h['admissionTransfer'] == 'R116_ADMISSION_TRANSFER1'
    assert h['hookRate'] == 'R117_HOOK10' and h['azrailHookChance'] == 10
    assert h['realtimeHandoff'] == 'R110_HANDOFF1'
    assert len(h['channelProcesses']['channels']) == 4
    assert all(c['ready'] is True for c in h['channelProcesses']['channels'])
print('Exact R121 archive: both realms, eight channels, cleanup and prior markers verified.')
