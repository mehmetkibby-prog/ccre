import os,subprocess,json,shutil
from pathlib import Path
root=Path(__file__).resolve().parents[2];out=root/'validation/r112-candidate/extras';out.mkdir(exist_ok=True)
env={**os.environ,'REVIEW_NODE':'/workspace/ccre/r79_stability_work/runtime/node-v22.23.4-linux-x64/bin/node','R111_TEST_CONTROL':'1'}
for realm,n in [('r2',40),('r1',10),('r1',50),('r1',100)]:
 name=f'{realm}-{n}-mixed';before=set((root/'project/r109_latency_completion/evidence').glob('review-*.json'))
 with (out/(name+'.log')).open('w') as log:rc=subprocess.run(['python3','scripts/load.py','--players',str(n),'--seconds','30','--mode','mixed','--realm',realm],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT).returncode
 new=set((root/'project/r109_latency_completion/evidence').glob('review-*.json'))-before
 if len(new)==1:
  p=new.pop();shutil.copy2(p,out/(name+'.json'));x=json.loads(p.read_text());print(name,rc,x['passed'],x['summary'],flush=True)
 else:print(name,rc,'no result',flush=True)
 if rc:raise SystemExit(rc)
