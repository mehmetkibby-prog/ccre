"""Summarize local inspector sampling and GC observations without inventing causes."""
import collections,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];ev=ROOT/'evidence'
load=json.loads((ev/'r106-allocation-100.json').read_text())
heap=json.loads((ev/'r106-allocation-100.heapprofile').read_text())
flat=[]
def walk(node,parents):
 frame=node['callFrame'];chain=parents+[frame];flat.append((node,chain))
 for child in node.get('children',[]):walk(child,chain)
walk(heap['head'],[])
frame_key=lambda f:(f.get('functionName') or '(anonymous)',f.get('url','').split('/working/')[-1],f.get('lineNumber',-1)+1)
self_bytes=collections.Counter();under_drain=collections.Counter();unions=collections.Counter()
for node,chain in flat:
 size=node.get('selfSize',0);self_bytes[frame_key(node['callFrame'])]+=size
 for key,pattern in [('drainWrites',r'drainWrites'),('world',r'world-state|world-jobs|shared-world'),('market',r'market'),('guild',r'guild'),('prepareCache',r'prepared-statements477'),('IPC',r'reliable-stream|process-stream|reply-wire')]:
  if any(re.search(pattern,f.get('functionName','')+' '+f.get('url','')) for f in chain):unions[key]+=size
 if any('drainWrites' in f.get('functionName','') for f in chain):under_drain[frame_key(node['callFrame'])]+=size
cpu=json.loads((ev/'r106-allocation-100.cpuprofile').read_text());nodes={n['id']:n for n in cpu['nodes']};parents={ch:n['id'] for n in cpu['nodes'] for ch in n.get('children',[])}
cpu_self=collections.Counter();cpu_drain=collections.Counter()
for sid,us in zip(cpu['samples'],cpu['timeDeltas']):
 f=nodes[sid]['callFrame'];key=frame_key(f);cpu_self[key]+=us/1000
 chain=[];idx=sid
 while idx in nodes:
  chain.append(nodes[idx]['callFrame']);idx=parents.get(idx)
 if any('drainWrites' in r.get('functionName','') for r in chain):cpu_drain[key]+=us/1000
def top(c,unit):return [{'function':k[0],'file':k[1],'line':k[2],unit:round(v,3)} for k,v in c.most_common(30)]
gcs=[]
for p in sorted(ev.glob('*-100.json')):
 try:d=json.loads(p.read_text())
 except Exception:continue
 if 'mainGc' not in d:continue
 groups=[]
 window=next(r for r in d['measurement']['measurement']['eventLoops'] if r['target']=='main')
 for kind,label in [(1,'minor / Scavenge'),(4,'major / Mark-Compact'),(8,'incremental'),(16,'weak callbacks')]:
  rows=[g for g in d['mainGc'] if g['kind']==kind and window['startedAtMs']<=g['atMs']<window['endedAtMs']]
  if rows:groups.append({'kind':label,'count':len(rows),'totalMs':round(sum(g['ms'] for g in rows),3),'maxMs':round(max(g['ms'] for g in rows),3)})
 gcs.append({'file':p.name,'passed':d.get('passed'),'groups':groups,'summary':d.get('summary'),'writerStalls':d.get('writerStalls')})
report={'localOnly':True,'liveHourRecorded':False,'samplingBytes':32768,'heapMethod':'Estimated allocation sampling, including objects collected by minor/major GC; not a retained-heap snapshot. Main process includes protocol bot workload. Inclusive branches overlap.','sampledAllocationBytes':sum(self_bytes.values()),'inclusiveAllocationBytes':dict(unions),'topAllocationSelf':top(self_bytes,'estimatedBytes'),'allocationUnderDrainWrites':top(under_drain,'estimatedBytes'),'cpuDurationMs':(cpu['endTime']-cpu['startTime'])/1000,'cpuSelf':top(cpu_self,'sampledMs'),'cpuUnderDrainWrites':top(cpu_drain,'sampledMs'),'gcRuns':gcs,'causality':'GC can run during any allocation; an enclosing stack alone does not prove where the collected objects originated. Local cgroup CPU throttling was observed and no pauses are excluded.'}
(ev/'gc-allocation-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ('sampledAllocationBytes','inclusiveAllocationBytes','topAllocationSelf','allocationUnderDrainWrites')},indent=2))
