"""Sequential, reproducible R110/R113 offered-load comparisons; no live data.

Do not run other builds, browsers, tests or load while this matrix is running.
Functional success is not latency acceptance. Every raw failure is retained.
"""
import argparse,datetime,hashlib,json,os,pathlib,shutil,statistics,subprocess,sys,time
ROOT=pathlib.Path(__file__).resolve().parents[1];REVIEW=ROOT.parent.parent
SOURCE=REVIEW/'project/r109_latency_completion/evidence';OUT=ROOT/'evidence/matrix';OUT.mkdir(parents=True,exist_ok=True)
p=argparse.ArgumentParser();p.add_argument('--baseline',required=True);p.add_argument('--soak-seconds',type=int,default=1800);p.add_argument('--resume',action='store_true');p.add_argument('--output');p.add_argument('--primary-only',action='store_true');p.add_argument('--farm-probe',action='store_true');a=p.parse_args()
if a.output:OUT=pathlib.Path(a.output).resolve();OUT.mkdir(parents=True,exist_ok=True)
assert a.resume or not (OUT/'index.json').exists(),'Use --resume to retain all prior runs'
baseline=pathlib.Path(a.baseline).resolve();assert (baseline/'core511-source/scripts/core511/coordinator.mjs').is_file()
sys.path.insert(0,str(ROOT/'deployment/modules'))
from r63_support import core_identity
candidate=REVIEW/'project/r109_latency_completion/working'
frozen={name:core_identity(tree/'core511-source/scripts/core511') for name,tree in [('R110',baseline),('R113',candidate)]}
harnessFiles=sorted((REVIEW/'project/r109_latency_completion/tests').glob('population-*.mjs'))+[REVIEW/'scripts/load.py']
harnessIdentity=lambda:{str(p.relative_to(REVIEW)):hashlib.sha256(p.read_bytes()).hexdigest() for p in harnessFiles}
frozenHarness=harnessIdentity()
manifest=OUT/'runtime-manifest.json'
if a.resume and manifest.exists():
 assert json.loads(manifest.read_text())['coreIdentities']==frozen and json.loads(manifest.read_text()).get('harnessIdentity')==frozenHarness,'Runtime changed: use a new output directory'
elif a.resume and (OUT/'index.json').exists():
 raise SystemExit('Older matrix lacks source freeze; retain it and use a new output directory')
else:
 manifest.write_text(json.dumps({'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'candidateCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=REVIEW,text=True).strip(),'coreIdentities':frozen,'harnessIdentity':frozenHarness,'uiPolling':True,'baseline':str(baseline),'candidate':str(candidate),'profiling':False,'liveDatabase':False},indent=2)+'\n')
record=OUT/'index.json';rows=json.loads(record.read_text()) if a.resume and record.exists() else []
assert a.resume or not record.exists(),'Use --resume to retain all prior runs'
def save():
 temp=record.with_suffix('.preparing');temp.write_text(json.dumps(rows,indent=2)+'\n');temp.replace(record)
def run(version,n,mode,repeat,realm='r1',seconds=60,farm=False,distribution='balanced'):
 key=f'{version}-{realm}-{mode}{"-farm" if farm else ""}{"-packed" if distribution=="packed" else ""}-{n}-{repeat}-{seconds}'
 if (OUT/'STOP').exists():raise SystemExit('Stopped at run boundary; previous raw results retained')
 if any(r['key']==key for r in rows):return
 assert harnessIdentity()==frozenHarness,'Harness changed during matrix'
 for name,tree in [('R110',baseline),('R113',candidate)]:assert core_identity(tree/'core511-source/scripts/core511')==frozen[name],'Runtime changed during matrix: '+name
 env={**os.environ};env.pop('STUTTER_TREE',None);env.pop('CLIENT_TREE',None);env.pop('R111_TEST_STAGES',None);env['POPULATION_FARM_STRESS']='1' if farm else '0';env['PROFILE_WRITER_R113']='0';env['POPULATION_UI_POLLING']='1'
 if version=='R110':env.update(STUTTER_TREE=str(baseline),CLIENT_TREE=str(baseline))
 before=set(SOURCE.glob('review-*.json'));start=time.time();log=OUT/(key+'.log')
 print(json.dumps({'starting':key,'at':datetime.datetime.now(datetime.timezone.utc).isoformat()}),flush=True)
 with log.open('w') as output:
  result=subprocess.run([sys.executable,str(REVIEW/'scripts/load.py'),'--players',str(n),'--seconds',str(seconds),'--mode',mode,'--realm',realm,'--arrival','open','--distribution',distribution,'--control'],cwd=REVIEW,env=env,stdout=output,stderr=subprocess.STDOUT)
 created=set(SOURCE.glob('review-*.json'))-before;assert len(created)==1,(key,'missing/ambiguous result',result.returncode)
 src=created.pop();value=json.loads(src.read_text());dest=OUT/(key+'.json');shutil.copyfile(src,dest)
 row={'key':key,'version':version,'players':n,'mode':mode,'distribution':distribution,'farmStress':farm,'repeat':repeat,'realm':realm,'seconds':seconds,'source':str(src.relative_to(REVIEW)),'raw':dest.name,'log':log.name,'returncode':result.returncode,'elapsedSeconds':time.time()-start,'functional':value.get('passed',False),'summary':value.get('summary'),'deaths':value.get('combatDelivery',{}).get('deaths'),'controlMaxPauseMs':value.get('independentControl',{}).get('maxPauseMs')}
 rows.append(row);save();print(json.dumps({'finished':key,**{k:row[k] for k in ['functional','summary','deaths','controlMaxPauseMs']}}),flush=True)
 if version=='R113' and not row['functional']:raise SystemExit('Candidate functional failure; matrix paused at '+key)

# Pair the primary 40-player workload across versions within each repetition.
# Other requested populations get three independent fresh starts per version.
if a.farm_probe:
 for version in ['R110','R113']:run(version,40,'forest',1,farm=True)
 print(json.dumps({'farmProbeComplete':True,'runs':len(rows)}),flush=True);raise SystemExit(0)
for repeat in range(1,4):
 for n in ([40] if a.primary_only else [40,10,50,100]):
  for version in ['R110','R113']:run(version,n,'mixed',repeat)
 for n in [30,40]:run('R113',n,'forest',repeat)
 run('R113',40,'forest',repeat,distribution='packed')
if a.primary_only:
 print(json.dumps({'primaryMatrixComplete':True,'runs':len(rows)}),flush=True);raise SystemExit(0)
run('R113',40,'mixed',1,'r2')
run('R113',10,'shared_boss_terminal',1)
if a.soak_seconds:run('R113',40,'forest',1,seconds=a.soak_seconds)
print(json.dumps({'matrixComplete':True,'runs':len(rows),'acceptance':'evaluate raw latency, pauses and offered/completed counts separately'}),flush=True)
