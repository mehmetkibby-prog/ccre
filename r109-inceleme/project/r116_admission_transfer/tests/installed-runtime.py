"""Run real two-realm entry and handoff checks against R116's own installer output."""
import json,os,subprocess,sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1];PROJECT=ROOT.parent;REVIEW=PROJECT.parent
record=ROOT/'evidence/runtime-stage.json';stage=json.loads(record.read_text())
package=json.loads((ROOT/'evidence/package.json').read_text())
assert stage['package']['sha256']==package['sha256'] and stage['targetCore']==package['targetCore']
assert stage['installedVersion']=='R116_ADMISSION_TRANSFER1'
env={**os.environ,'RUNTIME_STAGE_FILE':str(record),'RUNTIME_EVIDENCE_DIR':str(ROOT/'evidence'),
 'RUNTIME_LABEL':'relocated-r116','HANDOFF_STAGE_FILE':str(record),
 'HANDOFF_EVIDENCE_FILE':str(ROOT/'evidence/ws-handoff-runtime.json'),
 **{'RUNTIME_EXPECT_R'+str(n):'1' for n in range(110,116)}}
tests=PROJECT/'r109_latency_completion/tests'
command=[sys.executable,str(REVIEW/'scripts/run.py'),'--test','--test-concurrency=1',
 str(tests/'relocated-entry.test.mjs'),str(tests/'ws-handoff-runtime.test.mjs')]
subprocess.run(command,cwd=PROJECT/'r109_latency_completion',env=env,check=True)
observed=json.loads((ROOT/'evidence/relocated-r116-runtime.json').read_text())
assert observed['package']['sha256']==package['sha256'] and observed['realChannels']==8
assert {r['realm'] for r in observed['realms']}=={'r1','r2'}
for row in observed['realms']:
 health=row['health']
 assert health['admissionTransfer']=='R116_ADMISSION_TRANSFER1'
 assert health['sharedScope']=='R115_SHARED_SCOPE1'
 channels=health['channelProcesses']['channels']
 assert len(channels)==4 and all(c['ready'] is True for c in channels)
print('R116 exact installed artifact: both health markers, both realms, eight real channels and WebSocket handoff verified.')
