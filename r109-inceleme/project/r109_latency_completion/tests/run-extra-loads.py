import os,subprocess,sys,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
cases=[
 ('r105_performance_review','r105-control','r1',{}),
 ('r106_captcha_worker','r106-academy','r2',{}),
 ('r107_population_stability','r107-academy','r2',{}),
 ('r107_population_stability','r107-cpu-audit','r1',{'CPU_PROFILE':'1'}),
]
for directory,label,realm,extra in cases:
 with (root/'evidence'/f'{label}-matrix.log').open('w') as log:
  result=subprocess.run(['python3','tests/run-population.py',str(root.parent/directory/'working'),label,realm,'40'],cwd=root,env={**os.environ,**extra},stdout=log,stderr=subprocess.STDOUT,timeout=300)
 print(json.dumps({'case':label,'exit':result.returncode}),flush=True)
 if result.returncode:sys.exit(result.returncode)
