"""Four serial isolated full-client runs; stop on the first failed case."""
import json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REVIEW=ROOT.parents[1]
node=os.environ.get('REVIEW_NODE','/workspace/ccre/r79_stability_work/runtime/node-v22.23.4-linux-x64/bin/node')
subprocess.run([node,str(ROOT/'tests/stage-browser.mjs')],cwd=REVIEW,check=True)
rows=[]
for realm in ('r1','r2'):
 for mode in ('desktop','mobile'):
  name=f'runtime-browser-{realm}-{mode}'
  env={**os.environ,'REVIEW_NODE':node,'CORE101_REALM_ID':realm,'R102_TEST_REALM':realm,'MODE':mode,'BROWSER_WS_TRANSPORT':'handoff'}
  env.pop('ADMIN_ONLY',None)
  cached=ROOT/'evidence'/name/'report.json'
  proof=json.loads((ROOT.parent/'r109_latency_completion/working/core511-source/scripts/core511/generated/native-client-proof.json').read_text())
  if os.environ.get('R118_BROWSER_RESUME')=='1' and cached.exists():
   saved=json.loads(cached.read_text())
   if saved.get('passed') and saved.get('client')==proof['name']:
    rows.append({'realm':realm,'layout':mode,'passed':True,'client':saved['client'],'checks':saved['checks'],'errors':saved['errors'],'missingAssets':saved['missingAssets'],'nativeFaults':saved['nativeFaults'],'webSocketHandoffs':saved['webSocketHandoffs'],'durationMs':saved['durationMs'],'report':f'{name}/report.json'})
    print('Retaining same-build successful case',name,flush=True)
    continue
  print('Starting',name,flush=True)
  with (ROOT/'evidence'/f'{name}.log').open('w') as log:
   result=subprocess.run([sys.executable,str(REVIEW/'scripts/run.py'),str(ROOT/'tests/runtime-browser.mjs')],cwd=REVIEW,env=env,stdout=log,stderr=subprocess.STDOUT)
  report=json.loads((ROOT/'evidence'/name/'report.json').read_text())
  rows.append({'realm':realm,'layout':mode,'passed':bool(report.get('passed')) and result.returncode==0,'client':report['client'],'checks':report['checks'],'errors':report['errors'],'missingAssets':report['missingAssets'],'nativeFaults':report['nativeFaults'],'webSocketHandoffs':report['webSocketHandoffs'],'durationMs':report['durationMs'],'report':f'{name}/report.json'})
  (ROOT/'evidence/runtime-browser-matrix.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
  print(name,'PASS' if rows[-1]['passed'] else 'FAIL',report.get('failure',{}).get('message',''),flush=True)
  if not rows[-1]['passed']:sys.exit(1)
