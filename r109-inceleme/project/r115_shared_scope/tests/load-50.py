"""Sequential local 50-player comparison; never a live zero-lag guarantee."""
import hashlib,json,os,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];REVIEW=ROOT.parent.parent;OUT=ROOT/'evidence/load-50';OUT.mkdir(exist_ok=True)
GAME=ROOT.parent/'r109_latency_completion';SOURCE=GAME/'evidence'
trees={v:json.loads((ROOT.parent/folder/'evidence/runtime-stage.json').read_text())['release'] for v,folder in [('R114','r114_rune_forum'),('R115','r115_shared_scope')]}
rows=[]
def cgroup():
 p=Path('/sys/fs/cgroup/cpu.stat');return dict((k,int(v)) for k,v in (line.split() for line in p.read_text().splitlines())) if p.exists() else {}
def frozen():
 return {v:{name:hashlib.sha256((Path(tree)/'core511-source/scripts/core511'/name).read_bytes()).hexdigest() for name in ('shared-bridge-partitions-r113.mjs','reward-actor-scope-r85.mjs','engine-health-r113.mjs')} for v,tree in trees.items()}
pins=frozen();manifest={'trees':trees,'runtimeHashes':pins,'players':50,'seconds':60,'cpuMax':Path('/sys/fs/cgroup/cpu.max').read_text().strip(),'live':False,'synthetic':True,'trace':False,'profile':False}
assert not (OUT/'index.json').exists(),'Retain prior runs: use a fresh output directory'
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
def run(version,repeat,mode='mixed',history=False):
 assert frozen()==pins,'Runtime changed during measurement'
 key=f'{version}-{mode}-{repeat}'+('-shared-history' if history else '')
 before=set(SOURCE.glob('review-*.json'));stat=cgroup();started=time.time();print('START '+key,flush=True)
 env={**os.environ,'STUTTER_TREE':trees[version],'CLIENT_TREE':trees[version],'POPULATION_UI_POLLING':'1','POPULATION_SHARED_HISTORY_R115':'1' if history else '0'}
 with (OUT/(key+'.log')).open('w') as log:
  code=subprocess.run([sys.executable,str(REVIEW/'scripts/load.py'),'--players','50','--seconds','60','--realm','r1','--mode',mode,'--arrival','open','--control'],cwd=REVIEW,env=env,stdout=log,stderr=subprocess.STDOUT).returncode
 created=set(SOURCE.glob('review-*.json'))-before;assert len(created)==1,(key,'missing or ambiguous evidence',code)
 raw=created.pop();data=json.loads(raw.read_text());(OUT/(key+'.json')).write_bytes(raw.read_bytes());after=cgroup()
 row={'key':key,'version':version,'repeat':repeat,'mode':mode,'history':history,'returncode':code,'passed':data.get('passed',False),'seconds':round(time.time()-started,2),'summary':data.get('summary'),'combatDelivery':data.get('combatDelivery'),'sharedAcquires':data.get('sharedTerminal',{}).get('acquiresByChannel'),'cpuStatDelta':{k:after[k]-stat.get(k,0) for k in after},'raw':key+'.json','log':key+'.log'}
 rows.append(row);(OUT/'index.json').write_text(json.dumps(rows,indent=2)+'\n');print('END '+json.dumps(row),flush=True)
 if code:raise SystemExit(code)
 if history:assert sum(row['sharedAcquires'].values())>50,'History scenario did not exercise shared combat'
for repeat in range(1,4):
 for version in ('R114','R115'):run(version,repeat)
run('R115',1,'forest',True)
