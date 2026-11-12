import json,os,subprocess,time
from pathlib import Path
REVIEW_PROJECT=Path(__file__).resolve().parents[2]
root=Path(__file__).resolve().parents[1]
# Single load at a time, six explicit 60s windows, no profiling/instrumentation.
scenarios=[('packed-1',40,'r1','mixed','packed'),('boss-1',40,'r1','shared_boss_terminal','balanced'),('balanced30',30,'r1','mixed','balanced'),('academy40',40,'r2','mixed','balanced'),('packed-2',40,'r1','mixed','packed'),('boss-2',40,'r1','shared_boss_terminal','balanced')]
progress=[]
for name,n,realm,mode,distribution in scenarios:
 label='r109-ready-'+name;log=root/'evidence'/f'{label}-{n}.log';assert not log.exists()
 env={**os.environ,'STUTTER_TREE':str(root/'working'),'LOAD_PLAYERS':str(n),'LOAD_MS':'60000','LOAD_LABEL':label,'POPULATION_MODE':mode,'POPULATION_EQUIPMENT':'1','BACKGROUND_MONSTERS':'6000','LOAD_DISTRIBUTION':distribution,'R108_WS_TRANSPORT':'tcp','R108_TEST_READ_BATCH':'1','R102_TEST_REALM':realm,'CPU_PROFILE':'0','ALLOCATION_PROFILE':'0','SQL_DIAGNOSTIC':'0'}
 for key in ['PROFILE_CHANNELS','SQL_PLAN_DIAGNOSTIC','R108_BOSS_PREWARM_SHAPE_TEST']:env.pop(key,None)
 start=time.time()
 with log.open('w') as f:r=subprocess.run(['python3',str(REVIEW_PROJECT / 'r102_content/tests/run.py'),str(root/'tests/population-load.mjs')],cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=240)
 item={'name':name,'players':n,'realm':realm,'mode':mode,'distribution':distribution,'exit':r.returncode,'seconds':round(time.time()-start,1),'file':f'{label}-{n}.json'};progress.append(item);(root/'evidence/r109-ready-load-progress.json').write_text(json.dumps(progress,indent=2)+'\n');print(json.dumps(item),flush=True)
 if r.returncode:raise SystemExit(r.returncode)
