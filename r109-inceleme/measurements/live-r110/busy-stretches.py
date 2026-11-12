import json,sys,collections
d=json.load(open(sys.argv[1]));nodes={n['id']:n for n in d['nodes']};par={}
for n in d['nodes']:
    for c in n.get('children',[]):par[c]=n['id']
S=d['samples'];D=d['timeDeltas'];cur=None;out=[]
def info(s):
    i=s;chain=[]
    while i in nodes:chain.append(nodes[i]['callFrame']);i=par.get(i)
    app=[cf for cf in chain if ('core511' in cf['url'] or 'vds-server' in cf['url']) and cf['functionName']]
    deep=[cf['functionName']+'@'+cf['url'].split('/')[-1] for cf in app[:6]]
    outer=app[-1]['functionName']+'@'+app[-1]['url'].split('/')[-1] if app else chain[0]['functionName']
    return outer,deep
for k,s in enumerate(S):
    w=D[k+1] if k+1<len(D) else 0;leaf=nodes[s]['callFrame']['functionName']
    if leaf in('(idle)','(root)') or k<3:
        if cur and cur['ms']>100000:out.append(cur)
        cur=None;continue
    o,deep=info(s)
    if cur is None:cur={'ms':0,'outer':collections.Counter(),'deep':collections.Counter(),'switch':0,'last':None}
    cur['ms']+=w;cur['outer'][o]+=w
    for f in deep:cur['deep'][f]+=w
    if o!=cur['last']:cur['switch']+=1;cur['last']=o
for c in sorted(out,key=lambda c:-c['ms'])[:4]:
    print(round(c['ms']/1000),'ms, giriş değişimi',c['switch'],'| dış:',[(k,round(v/1000)) for k,v in c['outer'].most_common(3)])
    print('    iç:',[(k,round(v/1000)) for k,v in c['deep'].most_common(8)])
