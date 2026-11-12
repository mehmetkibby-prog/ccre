"""Report every accepted run, with raw pause counts and environment limitations."""
import json,statistics
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def counter(text):
 return {k:int(v) for k,v in (line.split() for line in text.strip().splitlines())}
def report(file):
 r=json.loads(file.read_text());s=r.get('summary')
 if not s:return {'file':file.name,'passed':r.get('passed'),'failure':r.get('failure')}
 loops=r['measurement']['measurement']['eventLoops'];main=next(x for x in loops if x['target']=='main');world=next(x for x in loops if x['target']=='world')
 before=counter(r['host']['before']['cpu.stat']);after=counter(r['host']['after']['cpu.stat'])
 gaps=[g for g in main['slowGaps'] if g['ms']>50]
 common=sum(any(min(g['endedAtMs'],w['endedAtMs'])-max(g['startedAtMs'],w['startedAtMs'])>30 for w in world['slowGaps']) for g in gaps)
 gc=r.get('mainGc',[])
 return {'file':file.name,'realm':r['realm'],'players':r['players'],'passed':r['passed'],'seconds':r['durationMs']/1000,**s,
  'mainCpuPercent':main['processCpuMs']/main['durationMs']*100,
  'mainGcMaxMs':max((g['ms'] for g in gc),default=0),
  'mainGcOver50':sum(g['ms']>50 for g in gc),
  'mainLongGapsOverlappingIndependentWorld':common,
  'throttledPeriods':after['nr_throttled']-before['nr_throttled'],
  'throttledMs':(after['throttled_usec']-before['throttled_usec'])/1000,
  'errors':r.get('errors'),'faults':r.get('faults'),
  'readyActors':sum(a['ready'] for a in r['actors']),
  'pendingKillsAtEnd':sum(a.get('pendingKills',0) for a in r['actors']),
  'actorCommandLatencyP95MaxMs':max(a['latencyP95Ms'] for a in r['actors']),
  'counts':r['counts']}
if __name__=='__main__':
 rows=[report(f) for pattern in ('r106-repeat-*.json','r107-repeat-*.json','r105-control-*.json','r106-academy-*.json','r107-academy-*.json','r106-separate-towers-*.json','r107-separate-towers-*.json') for f in sorted((root/'evidence').glob(pattern))]
 groups=[]
 for version in ('r106','r107'):
  for players in (30,40):
   runs=[r for r in rows if r['file'].startswith(version+'-repeat-') and r.get('players')==players]
   if not runs:continue
   groups.append({'version':version,'players':players,'runs':len(runs),'allPassed':all(r['passed'] for r in runs),
    **{k:{'median':statistics.median(r[k] for r in runs),'worst':max(r[k] for r in runs)} for k in ('tickP95Ms','tickP99Ms','maxTickMs','mainMaxPauseMs','mainPausesOver50Ms','channelPausesOver50Ms','mainElu','mainMaxRssBytes','mainCpuPercent','throttledMs')}})
 out={'localOnly':True,'cpuQuotaCores':4,'liveCpuCores':8,'liveDatabase':False,'durationPerRunSeconds':60,'separateBotsSameHost':True,'groups':groups,'runs':rows,'note':'Raw >50ms counts are retained. Simultaneous pauses in independent processes suggest shared scheduling pressure; this does not prove every pause is environmental. No guarantee of zero live lag.'}
 (root/'evidence/population-summary.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(groups,ensure_ascii=False,indent=2))
