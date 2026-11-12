import json,sys,collections
# inclusive ms per app-level function (project files only), deduplicated per sample
def run(path):
    d=json.load(open(path));nodes={n['id']:n for n in d['nodes']};par={}
    for n in d['nodes']:
        for c in n.get('children',[]):par[c]=n['id']
    S=d['samples'];D=d['timeDeltas'];inc=collections.Counter()
    for k,s in enumerate(S):
        w=D[k+1] if k+1<len(D) else 0;seen=set();i=s
        while i in nodes:
            cf=nodes[i]['callFrame'];u=cf['url']
            if ('core511' in u or 'vds-server' in u) and cf['functionName']:
                key=cf['functionName']+' @'+u.split('/')[-1]
                if key not in seen:inc[key]+=w;seen.add(key)
            i=par.get(i)
    return inc
a=run(sys.argv[1]);b=run(sys.argv[2])
keys=[k for k,_ in (a+b).most_common(400)]
interest=[k for k in keys if any(x in k for x in ('writer','reward','checkpoint','death','retaliation','combat','claim','kill','monster','boss','loot','drop','presence','coordinator','reply','framed','request','tick','actor','channel','world','snapshot','guild','market','quest','chat','http','auth','session','admission'))]
print(f"{'fonksiyon':60s} {'eski10':>8s} {'r110-11':>8s}")
for k in interest[:45]:print(f"{k[:60]:60s} {a[k]/1000:8.0f} {b[k]/1000:8.0f}")
