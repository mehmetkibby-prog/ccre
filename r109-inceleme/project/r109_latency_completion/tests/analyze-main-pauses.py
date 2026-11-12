"""Correlate a diagnostic CPU sample window with unadjusted timer witnesses.

A long interval without samples is unobserved time, not evidence that the
previous sampled function ran continuously through it.
"""
import collections,json,sys
from pathlib import Path
source=Path(sys.argv[1]);r=json.loads(source.read_text());p=json.loads(source.with_suffix('.cpuprofile').read_text())
nodes={n['id']:n for n in p['nodes']};parents={ch:n['id'] for n in p['nodes'] for ch in n.get('children',[])}
origin=r['instrumentation']['cpuClockOriginMs'];now=p['startTime']/1000+origin;samples=[]
for nid,delta in zip(p['samples'],p['timeDeltas']):
 end=now+delta/1000;samples.append((now,end,nid));now=end
loops=r['measurement']['measurement']['eventLoops'];main=next(x for x in loops if x['target']=='main')
assert abs(samples[0][0]-main['startedAtMs'])<5000,'CPU/monotonic clocks do not align; do not infer pause stacks'
def frame(n):
 f=nodes[n]['callFrame'];return {'function':f['functionName'],'file':f['url'].split('/core511/')[-1],'line':f['lineNumber']+1}
out={'source':str(source),'diagnosticOnly':True,'samplingGapInterpretation':'Intervals >10ms are reported as unobserved, not charged to a JS function.','samplesStartedAtMs':samples[0][0],'measurementStartedAtMs':main['startedAtMs'],'pauses':[]}
for gap in main['slowGaps']:
 start,end=gap['startedAtMs'],gap['endedAtMs'];own=collections.Counter();inclusive=collections.Counter();unobserved=[]
 for a,b,n in samples:
  overlap=min(b,end)-max(a,start)
  if overlap<=0:continue
  if b-a>10:unobserved.append({'sampleIntervalMs':b-a,'overlapMs':overlap,'precedingSampleContext':frame(n)});continue
  own[n]+=overlap
  while n in nodes:inclusive[n]+=overlap;n=parents.get(n)
 others=[{'target':x['target'],'gap':g} for x in loops if x['target']!='main' for g in x['slowGaps'] if min(end,g['endedAtMs'])>max(start,g['startedAtMs'])]
 gc=[g for g in r['mainGc'] if min(end,g['atMs']+g['ms'])>max(start,g['atMs'])]
 out['pauses'].append({'gap':gap,'mainGc':gc,'otherTargets':others,'unobservedSampleIntervals':unobserved,'topSelf':[{'sampledMs':v,**frame(n)} for n,v in own.most_common(8)],'topInclusive':[{'sampledMs':v,**frame(n)} for n,v in inclusive.most_common(12)]})
target=source.with_suffix('.pause-analysis.json');target.write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
