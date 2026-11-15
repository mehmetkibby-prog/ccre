#!/usr/bin/env python3
"""Summarize raw runs without changing, hiding or reclassifying their results."""
import argparse,json,statistics
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('directory',type=Path);a=p.parse_args();root=a.directory
host=json.loads((root/'host-metrics.json').read_text());rows=[];failed=[]
for h in host:
 f=root/(h['name']+'.json')
 if not f.exists():continue
 d=json.loads(f.read_text())
 if not d.get('completed') or 'rawRuntimeMeasurements' not in d:
  failed.append({'name':h['name'],'functionalChecksAccepted':False,'completed':d.get('completed'),'fatal':d.get('fatal'),'errors':d.get('errors'),'disconnects':d.get('disconnects'),'unacked':d.get('unacked'),'faults':d.get('faults')});continue
 loops=d['rawRuntimeMeasurements']['eventLoops'];main=next(x for x in loops if x['target']=='main');chs=[x for x in loops if x['target'].startswith('channel-')]
 r={'name':h['name'],'area':d['area'],'nonlethal':d.get('nonlethal'),'fixtureNormalization':d.get('fixtureNormalization'),'functionalChecksAccepted':h.get('accepted',False),'players':d['players'],'defeats':d['actualRewards']['defeats'],'claims':d['actualRewards']['claims'],'collects':d['loot']['collects'],'errors':d['errors'],'disconnects':d['disconnects'],'faults':len(d['faults']),'unacked':d['unacked'],'unfinishedRewards':d['actualRewards']['unfinished'],'duplicateClaims':d['actualRewards']['duplicateClaims'],'attackP95Ms':d['latency']['attack']['p95'],'attackP99Ms':d['latency']['attack']['p99'],'attackMaxMs':d['latency']['attack']['max'],'channelTickP95WorstMs':max(x['tickP95'] for x in d['channels']),'channelTickP99WorstMs':max(x['tickP99'] for x in d['channels']),'channelMaxTickWorstMs':max(x['maxTick'] for x in d['channels']),'mainEluPercent':main['elu']*100,'mainCpuOneCorePercent':main['processCpuMs']/main['durationMs']*100,'mainTimerOver50Count':main['pauseCountsOver50Ms']['timer'],'mainMaxPauseMs':main['maxPauseMs'],'worstChannelTimerOver50Count':max(x['pauseCountsOver50Ms']['timer'] for x in chs),'rssSummedPeaksMiB':d['resources']['maxRssBytes']/1024**2,'cpuFourCoreBudgetPercent':d['resources']['totalCpuFraction']*100,'nrThrottled':h['cpuStatDelta']['nr_throttled'],'throttledUsec':h['cpuStatDelta']['throttled_usec'],'processWindowSeconds':d['durationS']}
 r['strictLatencyTargetMet']=r['channelTickP99WorstMs']<30 and r['mainTimerOver50Count']<=1 and r['worstChannelTimerOver50Count']<=1
 rows.append(r)
metrics=['defeats','claims','collects','attackP95Ms','attackP99Ms','attackMaxMs','channelTickP95WorstMs','channelTickP99WorstMs','channelMaxTickWorstMs','mainEluPercent','mainCpuOneCorePercent','mainTimerOver50Count','mainMaxPauseMs','worstChannelTimerOver50Count','rssSummedPeaksMiB','cpuFourCoreBudgetPercent','nrThrottled','throttledUsec']
summary={area:{'runs':len(rs),'allFunctionalChecksAccepted':all(r['functionalChecksAccepted'] for r in rs),'strictLatencyTargetMet':all(r['strictLatencyTargetMet'] for r in rs),'metrics':{k:{'median':statistics.median(r[k] for r in rs),'worst':max(r[k] for r in rs),'minimum':min(r[k] for r in rs)} for k in metrics}} for area in ['forest','champions'] if (rs:=[r for r in rows if r['area']==area])}
out={'contract':json.loads((root/'contract.json').read_text()),'notes':['Functional checks do not certify latency performance.','Channel p95/p99 are maximum per-channel percentiles in each run, not a pooled population percentile.','Main and channel timer gaps are separately reported; they may overlap and must not be added as unique physical freezes.','Cgroup throttling deltas cover startup, timed workload and drain, not only the timed window.','RSS is the conservative sum of per-process high-water marks.','Four-CPU shared-host synthetic fixture is not the eight-core production VDS; no production capacity or zero-lag guarantee.'],'runs':rows,'failedRuns':failed,'summary':summary}
(root/'summary.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(summary,indent=2))
