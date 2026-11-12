"""Sequential controlled loads; never run two load generators simultaneously."""
import os, pathlib, subprocess, sys, json, time
root=pathlib.Path(__file__).resolve().parents[1]
tree,label,realm=sys.argv[1:4]
order=[(30,1),(40,1),(40,2),(30,2),(30,3),(40,3)]
if len(sys.argv)>4:order=[(int(sys.argv[4]),1)]
for players,repeat in order:
 name=f'{label}-{realm}-run{repeat}'
 output=root/'evidence'/f'{name}-{players}.log'
 if output.exists():raise RuntimeError(f'do not overwrite {output}')
 env={**os.environ,'STUTTER_TREE':tree,'LOAD_PLAYERS':str(players),'LOAD_MS':'60000','LOAD_LABEL':name,'POPULATION_MODE':os.environ.get('POPULATION_MODE','mixed'),'BACKGROUND_MONSTERS':'6000','R102_TEST_REALM':realm}
 started=time.time()
 with output.open('w') as log:
  result=subprocess.run(['python3',str(REVIEW_PROJECT / 'r102_content/tests/run.py'),str(root/'tests/population-load.mjs')],env=env,stdout=log,stderr=subprocess.STDOUT,timeout=300)
 record={'label':name,'players':players,'exit':result.returncode,'seconds':round(time.time()-started,1)}
 f=output.with_suffix('.json')
 if f.exists():
  r=json.loads(f.read_text());record.update(passed=r.get('passed'),summary=r.get('summary'),errors=r.get('errors'),failure=r.get('failure'))
 print(json.dumps(record,ensure_ascii=False),flush=True)
 if result.returncode:sys.exit(result.returncode)
