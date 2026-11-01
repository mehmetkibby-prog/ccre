import json,collections,sys
d=json.load(open(sys.argv[1]))
print('passed',d.get('passed'),'errors',len(d['errors']),'faults',len(d['faults']),'cancelled',d['runtimeCancelledInputCount'],'unack',d['unacknowledged'],'status',d['statusCounts'])
print('all',{k:round(v) if isinstance(v,float) else v for k,v in d['commandLatencyMs'].items()})
for k,v in d['byAction'].items(): print(' ',k,{a:round(b) if isinstance(b,float) else b for a,b in v.items()})
acts=d['clientTransport']['actors']
by=collections.defaultdict(list)
for s in d['samples']: by[s['actor']].append(s)
cnt=collections.Counter(); tw=collections.Counter(); durs=[]
for a in acts:
    for iv in a['predictionCapIntervals']:
        st,en=iv['startOffsetMs'],iv['endOffsetMs']; durs.append(iv['durationMs'])
        kinds=tuple(sorted(set(s['action'] for s in by[a['actor']] if s['offset']<=en and s['offset']+s['ms']>=st-100 and s['action']!='move')))
        cnt[kinds]+=1; tw[int(st/1000//10)*10]+=1
print('capEpisodes',sum(a['predictionCapEpisodes'] for a in acts),'limitedFrames',sum(a.get('predictionLimitedFrames') or 0 for a in acts),'dur max',round(max(durs)) if durs else 0)
print(' by inflight',cnt.most_common()); print(' by 10s window',sorted(tw.items()))
dm=(d.get('diagnosticsAfter') or {})
s=json.dumps(dm); i=s.find('deathMovementR86'); print('deathMovement metrics', s[i:i+600] if i>=0 else 'n/a')
