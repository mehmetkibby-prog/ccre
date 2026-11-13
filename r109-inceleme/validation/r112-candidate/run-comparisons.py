import os,subprocess,json,shutil,time
from pathlib import Path
root=Path(__file__).resolve().parents[2];out=root/'validation/r112-candidate/comparisons';out.mkdir(exist_ok=True)
base={**os.environ,'REVIEW_NODE':'/workspace/ccre/r79_stability_work/runtime/node-v22.23.4-linux-x64/bin/node','R111_TEST_CONTROL':'1'}
base.pop('R111_TEST_STAGES',None)
records=[]
for mode,n in [('forest',30),('mixed',40),('shared_boss_terminal',30)]:
 for repeat in range(1,4):
  for version in (['r111','r112'] if repeat%2 else ['r112','r111']):
   env={**base,'STUTTER_TREE':'/tmp/r112-r111-baseline' if version=='r111' else str(root/'project/r109_latency_completion/working')}
   name=f'{mode}-{n}-{repeat}-{version}';before=set((root/'project/r109_latency_completion/evidence').glob('review-*.json'))
   with (out/(name+'.log')).open('w') as log:rc=subprocess.run(['python3','scripts/load.py','--players',str(n),'--seconds','30','--mode',mode],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT).returncode
   new=set((root/'project/r109_latency_completion/evidence').glob('review-*.json'))-before
   if len(new)!=1:raise RuntimeError((name,rc,'missing unique result',list(new)))
   p=new.pop();d=json.loads(p.read_text());shutil.copyfile(p,out/(name+'.json'))
   rec={'case':name,'exit':rc,'passed':d.get('passed'),'source':str(p.relative_to(root)),'summary':d.get('summary'),'deaths':d.get('combatDelivery',{}).get('deaths'),'visibleDeaths':d.get('combatDelivery',{}).get('visibleDeaths')};records.append(rec)
   (out/'index.json').write_text(json.dumps(records,indent=2)+'\n');print(name,rc,rec['passed'],rec['deaths'],flush=True)
   if rc or not d.get('passed'):raise SystemExit(rc or 1)
