import json,sys,collections
def spans(path):
    d=json.load(open(path));nodes={n['id']:n for n in d['nodes']};par={}
    for n in d['nodes']:
        for c in n.get('children',[]):par[c]=n['id']
    S=d['samples'];D=d['timeDeltas'];name=lambda i:nodes[i]['callFrame']['functionName']
    def stack(i):
        out=[]
        while i in nodes:out.append(nodes[i]['callFrame']);i=par.get(i)
        return out
    # weight of sample k = D[k+1] (time until next sample), as in the repo analyzer
    w=[D[k+1] if k+1<len(D) else 0 for k in range(len(S))]
    gc=[];busy=[];cur_gc=0;cur_b=0;cur_frames=collections.Counter()
    start_skip=0
    for k,s in enumerate(S):
        leaf=name(s)
        if leaf=='(garbage collector)':cur_gc+=w[k]
        else:
            if cur_gc:gc.append(cur_gc/1000);cur_gc=0
        if leaf not in ('(idle)','(root)') and not (k<5 and leaf=='post'):
            cur_b+=w[k]
            for f in stack(s):
                u=f['url'].split('/')[-1]
                if u and not u.startswith('node:') and f['functionName']:cur_frames[f['functionName']+'@'+u]+=w[k];break
        else:
            if cur_b:busy.append((cur_b/1000,cur_frames.most_common(3)));cur_b=0;cur_frames=collections.Counter()
    gc.sort(reverse=True);busy.sort(key=lambda x:-x[0])
    return gc,busy
for label,p in zip(sys.argv[1::2],sys.argv[2::2]):
    gc,busy=spans(p)
    print('==',label,'| GC runs >10ms:',sum(1 for x in gc if x>10),' >20ms:',sum(1 for x in gc if x>20),' longest GC run',round(gc[0],1) if gc else 0,'ms')
    print('   longest busy stretches (ms):',[round(b[0],1) for b in busy[:8]],' >50ms:',sum(1 for b in busy if b[0]>50))
    for b in busy[:3]:print('     ',round(b[0],1),'ms',[(f,round(v/1000,1)) for f,v in b[1]])
