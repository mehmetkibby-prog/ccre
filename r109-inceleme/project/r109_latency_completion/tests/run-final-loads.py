"""One load at a time; declared scenario sequence, preserve every result."""
import os, subprocess, sys, json, time
from pathlib import Path
root=Path(__file__).resolve().parents[1]
order=[('r108-final-boss-1','r1','shared_boss_terminal',False,True,40),('r108-final-packed-1','r1','mixed',True,True,40),('r108-final-academy','r2','mixed',False,True,40),('r108-tcp-candidate','r1','mixed',False,False,None)]
for repeat in (2,3):
 order.extend([(f'r108-final-boss-{repeat}','r1','shared_boss_terminal',False,True,40),(f'r108-final-packed-{repeat}','r1','mixed',True,True,40)])
progress=[]
for label,realm,mode,packed,equipment,players in order:
 log=root/'evidence'/f'{label}-run.log'
 if log.exists():raise RuntimeError('Never overwrite evidence: '+str(log))
 env={**os.environ,'POPULATION_MODE':mode,'POPULATION_EQUIPMENT':'1' if equipment else '0','LOAD_DISTRIBUTION':'packed' if packed else 'balanced','CPU_PROFILE':'0','ALLOCATION_PROFILE':'0','R108_WS_TRANSPORT':'tcp','R108_TEST_READ_BATCH':'1'}
 command=[sys.executable,str(root/'tests/run-population.py'),str(root/'working'),label,realm]+([] if players is None else [str(players)])
 start=time.time()
 with log.open('w') as out:r=subprocess.run(command,cwd=root,env=env,stdout=out,stderr=subprocess.STDOUT,timeout=1500)
 row={'label':label,'exit':r.returncode,'seconds':round(time.time()-start,1),'log':str(log)};progress.append(row)
 (root/'evidence/final-load-progress.json').write_text(json.dumps(progress,indent=2)+'\n');print(json.dumps(row),flush=True)
 if r.returncode:raise SystemExit(r.returncode)
