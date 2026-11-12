"""Preserve every matched real-TCP sample, including negative/outlier results."""
import csv,json,statistics
from pathlib import Path
root=Path(__file__).resolve().parents[1]
rows=[]
def stat(text):
 return {k:int(v) for k,v in (line.split() for line in text.splitlines())}
for label in ('r106-tcp-baseline','r108-ready-candidate'):
 for file in sorted((root/'evidence').glob(label+'-r1-run*-*.json')):
  d=json.loads(file.read_text());s=d['summary'];loops=d['measurement']['measurement']['eventLoops']
  assert d['passed'] and d['webSocketTransport']=='production-style-tcp-proxy'
  assert not d['instrumentation']['cpuSampling'] and not d['instrumentation']['allocationSampling']
  reader=next(x for x in loops if x['target']=='reader');query=reader['readWork']['queries']['kernel511_actor_world']
  before,after=(stat(d['host'][x]['cpu.stat']) for x in ('before','after'))
  r={'version':label.split('-')[0],'players':d['players'],'file':file.name,**{k:s[k] for k in ('tickP95Ms','tickP99Ms','maxTickMs','mainMaxPauseMs','mainPausesOver50Ms','channelPausesOver50Ms','maxChannelPauseMs','mainElu','mainMaxRssBytes')},
   'readerMaxPauseMs':reader['maxPauseMs'],'readerPausesOver50Ms':reader['pauseCountsOver50Ms']['timer'],'readerActorWorldAverageMs':query['totalMs']/query['count'],
   'maxGcMs':max((g['ms'] for g in d['mainGc']),default=0),'maxPlayerCommandP95Ms':max(a['latencyP95Ms'] for a in d['actors']),
   'socketCloses':d['counts'].get('socketCloses',0),'socketErrors':d['counts'].get('socketErrors',0),
   'nrThrottled':after['nr_throttled']-before['nr_throttled'],'throttledUsec':after['throttled_usec']-before['throttled_usec'],
   'allProcessMaxRssBytes':s['resources']['maxRssBytes'],'totalCpuFraction':s['resources']['totalCpuFraction']}
  for zone in ('forest','tower','solo','mist','black','rune_v2'):
   actors=[a for a in d['actors'] if a['zone']==zone]
   r[zone+'CommandP95Ms']=max((a['latencyP95Ms'] for a in actors),default=0)
  rows.append(r)
summary=[]
for version in ('r106','r108'):
 for players in (30,40):
  group=[r for r in rows if r['version']==version and r['players']==players]
  if not group:continue
  summary.append({'version':version,'players':players,'runs':len(group),'metrics':{k:{'median':statistics.median(r[k] for r in group),'worst':max(r[k] for r in group)} for k in group[0] if k not in ('version','players','file')}})
(root/'evidence/latency-summary.json').write_text(json.dumps({'rows':rows,'groups':summary},indent=2)+'\n')
if rows:
 with (root/'evidence/latency-measurements.csv').open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
print(json.dumps(summary,indent=2))
