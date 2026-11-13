import os,subprocess,json,time
from pathlib import Path
root=Path(__file__).resolve().parents[2]
env={**os.environ,'REVIEW_NODE':'/workspace/ccre/r79_stability_work/runtime/node-v22.23.4-linux-x64/bin/node'}
results=[]
for group in ['focused','native','captcha','r110','r112']:
 start=time.monotonic();log=root/'validation/r112-candidate'/('final-'+group+'.log')
 with log.open('w') as out:rc=subprocess.run(['python3','scripts/check.py',group],cwd=root,env=env,stdout=out,stderr=subprocess.STDOUT).returncode
 results.append({'group':group,'exit':rc,'seconds':time.monotonic()-start,'log':str(log.relative_to(root))})
 (root/'validation/r112-candidate/checks.json').write_text(json.dumps(results,indent=2)+'\n');print(group,rc,flush=True)
 if rc:raise SystemExit(rc)
