"""Sequential release checks; run only after performance windows have ended."""
import json,os,subprocess,time,sys
from pathlib import Path
REVIEW_PROJECT=Path(__file__).resolve().parents[2]
root=Path(__file__).resolve().parents[1]
runner=['python3',str(REVIEW_PROJECT / 'r102_content/tests/run.py')]
env={**os.environ,'STUTTER_TREE':str(root/'working'),'CLIENT_TREE':str(root/'working'),'R102_TEST_REALM':'r1'}
results=[]
start_from=sys.argv[1] if len(sys.argv)>1 else None
started=start_from is None
if start_from is not None:
 previous=json.loads((root/'evidence/validation-progress.json').read_text())
 (root/'evidence'/('validation-attempt-'+str(time.time_ns())+'.json')).write_text(json.dumps(previous,indent=2)+'\n')
 index=next((i for i,row in enumerate(previous) if row['name']==start_from),len(previous))
 results=previous[:index]
 assert all(row['exit']==0 for row in results),'Cannot skip an earlier failed validation stage'
def run(label,command,extra=None,timeout=600):
 global started
 if label==start_from:started=True
 if not started:return
 start=time.time();log=root/'evidence'/f'validation-{label}.log'
 if log.exists():log=log.with_name(log.stem+'-'+str(time.time_ns())+'.log')
 with log.open('w') as out:r=subprocess.run(command,cwd=root,env={**env,**(extra or {})},stdout=out,stderr=subprocess.STDOUT,timeout=timeout)
 row={'name':label,'exit':r.returncode,'seconds':round(time.time()-start,2),'log':str(log)};results.append(row)
 (root/'evidence/validation-progress.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(row),flush=True)
 if r.returncode:raise SystemExit(r.returncode)
def node_tests(label,files,extra=None):run(label,runner+['--test','--test-concurrency=1',*[str(root/f) for f in files]],extra)
node_tests('focused',['tests/adventure-scan.test.mjs','tests/monster-snapshot.test.mjs','tests/recovery.test.mjs','tests/reply-wire.test.mjs','tests/reply-wire-process.test.mjs','tests/ipc-owned-buffer.test.mjs','tests/slim-snapshot-reuse.test.mjs','tests/cold-adventure-reuse-r108.test.mjs','tests/combat-boss-validation.mjs','tests/boot-pool-order-r108.test.mjs','tests/reward-fallback-cache-r109.test.mjs','tests/short-death-groups-r109.test.mjs'])
run('boss-prewarm',runner+['--loader',str(root/'tests/cold-fixture-diagnostic-loader.mjs'),'--loader',str(root/'tests/boss-shape-loader-r109.mjs'),'--test',str(root/'tests/boss-prewarm-r109.test.mjs')],{'R108_FIXTURE_PREREQS':'1','R108_BOSS_PREWARM_SHAPE_TEST':'1'})
run('cold-worker-regression',['python3','tests/run-cold-worker-regression.py'])
run('native-fixtures',['python3','tests/prepare-native-regression.py'])
core='working/core511-source/scripts/core511/tests/'
native=['dungeon-native.test.mjs','dungeon-channel.test.mjs','native-http-trade-storage.test.mjs','additions-tower-process-r102.test.mjs']
node_tests('native-current',['evidence/native-tests/'+n for n in native]+[core+'adventure-r19.test.mjs',core+'checkpoint-ownership.test.mjs'])
node_tests('captcha',['tests/captcha.test.mjs','tests/captcha-native.test.mjs','tests/captcha-regression.test.mjs','tests/captcha-accounts.test.mjs'])
run('package-build',['python3','build/package.py'])
run('installer',['python3','tests/installer_test.py','-v'])
run('runtime-stage',['python3','tests/stage-runtime.py'])
node_tests('relocated-runtime',['tests/relocated-entry.test.mjs'])
run('browser-assets',['python3','tests/stage-package-browser.py'])
stage=json.loads((root/'evidence/runtime-stage.json').read_text())['release']
for realm,mode in [('r1','pc'),('r2','mobile')]:
 run('browser-'+realm,runner+[str(root/'tests/tower-browser.mjs')],{'STUTTER_TREE':stage,'AUDIT_ASSETS':str(root/'evidence/chat-browser-assets'),'R102_TEST_REALM':realm,'MODE':mode,'TOWER':'1','PREVIEW_NAME':'r109-latency'})
run('three-browser-tower',runner+[str(root/'tests/three-browser.mjs')],{'STUTTER_TREE':stage,'AUDIT_ASSETS':str(root/'evidence/chat-browser-assets'),'AUDIT_NAME':'r109-latency'},timeout=720)
(root/'evidence/validation-progress.json').write_text(json.dumps(results,indent=2)+'\n')
