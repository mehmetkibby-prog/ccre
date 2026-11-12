import json,sys,collections
for label,p in zip(sys.argv[1::2],sys.argv[2::2]):
    d=json.load(open(p));nodes={n['id']:n for n in d['nodes']};par={}
    for n in d['nodes']:
        for c in n.get('children',[]):par[c]=n['id']
    S=d['samples'];D=d['timeDeltas'];t=d['startTime'];runs=[];cur=None
    times=[];acc=d['startTime']
    for k in range(len(S)):acc+=D[k];times.append(acc)
    for k,s in enumerate(S):
        w=(D[k+1] if k+1<len(D) else 0)
        leaf=nodes[s]['callFrame']['functionName']
        if leaf=='(garbage collector)':
            if cur is None:
                # what ran just before the GC (previous non-idle sample's top app frame)
                prev=None
                for j in range(k-1,max(0,k-30),-1):
                    fr=[];i=S[j]
                    while i in nodes:
                        cf=nodes[i]['callFrame'];u=cf['url'].split('/')[-1]
                        if u and cf['functionName']:fr.append(cf['functionName']+'@'+u)
                        i=par.get(i)
                    if fr:prev=fr[:3];break
                cur=[times[k],0,prev]
            cur[1]+=w
        elif cur is not None:runs.append(cur);cur=None
    runs.sort(key=lambda r:-r[1])
    print('==',label,'duration',round((times[-1]-d['startTime'])/1e6,1),'s')
    for r in runs[:6]:print('   at',round((r[0]-d['startTime'])/1e6,2),'s  GC',round(r[1]/1000,1),'ms  before:',r[2])
