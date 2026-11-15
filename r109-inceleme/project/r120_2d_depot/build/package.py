"""Cumulative exact R118/R119 client delta and separately journaled host alias."""
import hashlib,json,sys,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT.parent/'r109_latency_completion/working';CORE='core511-source/scripts/core511/'
sys.path.insert(0,str(ROOT/'deployment/modules'))
import r63_support as identity
from storage import encoded
from source_identity import source_rows,target_rows
sha=lambda b:hashlib.sha256(b).hexdigest()
inputs=[(ROOT.parent/'r118_royal_champions/artifacts/R118_ROYAL_61ba37784ffb.zip','8a41b77d3cc136729468f0951ce651da56a01d8b71852b730de8e7f26c3c78e5'),(ROOT.parent/'r119_monster_motion/artifacts/R119_MOTION_4596197ee9b4.zip','8f544b172c6ea7afc737267f587c61daada01f6c6d33ba61d97a9db830575e39')]
plans=[]
for path,checksum in inputs:
 assert sha(path.read_bytes())==checksum
 with zipfile.ZipFile(path) as z:plans.append(json.loads(z.read('plan.json')));bootstrap=z.read('__main__.py')
p118,p119=plans
rows118=target_rows(source_rows(p118['sources']['R117_HOOK10']),p118)
rows119=target_rows(rows118,p119)
assert identity.identity_from_rows(rows118.values())==p118['targetCore']
assert identity.identity_from_rows(rows119.values())==p119['targetCore']
retained=p119['sources']['R118_ROYAL1']['retainedFiles']
for row in retained:assert sha((WORK/row['path']).read_bytes())==row['sha256']
sources={}
for previous,rows in [(p118,rows118),(p119,rows119)]:
 sources[previous['version']]={'core':previous['targetCore'],'coreRows':list(rows.values()),'retainedFiles':retained,**{k:previous[k] for k in ('namespace','game','admin','portal')}}
spec=json.loads((ROOT/'build/client-spec.json').read_text())
current={r['path']:r for r in identity.core_rows(WORK/CORE)}
allowed=set(spec['files'])|{'academy-page-r101.mjs','server-choice-r104.mjs','site-origin-r120.mjs','client-assets.mjs'}|{n[len(CORE):] for n in p119['files']}
changed={n for n,r in current.items() if any(rows.get(n)!=r for rows in (rows118,rows119))}
assert changed<=allowed,changed-allowed
assert not set(rows119)-set(current)
files={};data={}
for short in sorted(changed):
 b=(WORK/CORE/short).read_bytes();before=list(dict.fromkeys(rows.get(short,{}).get('sha256') for rows in (rows118,rows119)))
 files[CORE+short]={'before':before,'after':sha(b),'bytes':len(b)};data['payload/'+CORE+short]=b
forum={}
for name in ('server.mjs','public/index.html'):
 b=(ROOT/'forum'/name).read_bytes();old=(ROOT.parent/'r114_rune_forum/forum'/name).read_bytes()
 forum[name]={'before':sha(old),'after':sha(b),'bytes':len(b)};data['forum/'+name]=b
plan={'site':None,'domain':{'canonicalOrigin':'https://2d.coreoflife.net','keepApexBeforeCutover':True,'dnsChanges':False,'zoneChanges':False,'forum':forum},'version':'R120_2D_DEPOT1','realms':['r1','r2'],'databaseChanges':False,'databaseSchemaChanges':False,'databaseScope':'none','backupPolicy':{'keep':1,'scope':'changed-code-only'},'nativeBaseline':p119['nativeBaseline'],'operationsCanonicalSHA256':p119['operationsCanonicalSHA256'],'sources':sources,'targetCore':identity.identity_from_rows(current.values()),'files':files,**{k:spec[k] for k in ('namespace','game','admin','portal','clientNew')}}
plan['clientNew']=list(dict.fromkeys(plan['clientNew']+[n for n in p119['clientNew'] if n.startswith('core511-map-')]))
for rows in (rows118,rows119):assert identity.identity_from_rows(target_rows(rows,plan).values())==plan['targetCore']
(ROOT/'deployment/modules/code_contract.py').write_text("# Exact reviewed R120 source/target and host migration contract.\nPLAN_SHA256 = '"+sha(encoded(plan))+"'\n")
modules={p.name:p.read_bytes() for p in (ROOT/'deployment/modules').iterdir() if p.suffix in ('.py','.mjs')}
data.update({'__main__.py':bootstrap,'plan.json':encoded(plan),'modules.json':encoded({n:sha(b) for n,b in modules.items()}),'KURULUM.md':(ROOT/'KURULUM.md').read_bytes()})
data.update({'modules/'+n:b for n,b in modules.items()})
data['CLOUDFLARE-VE-CANLI-KONTROL.md']=(ROOT/'CLOUDFLARE-VE-CANLI-KONTROL.md').read_bytes()
for p in (ROOT/'tools').iterdir():
 if p.suffix in ('.py','.mjs'):data['tools/'+p.name]=p.read_bytes()
key=sha(encoded({n:sha(b) for n,b in sorted(data.items())}));out=ROOT/'artifacts'/('R120_2D_DEPOT_'+key[:12]+'.zip');out.parent.mkdir(exist_ok=True)
if not out.exists():
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for n,b in sorted(data.items()):
   info=zipfile.ZipInfo(n,(2026,11,15,0,0,0));info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,b)
with zipfile.ZipFile(out) as z:assert z.testzip() is None;assert all(z.read(n)==b for n,b in data.items())
record={'file':str(out.relative_to(ROOT)),'sha256':sha(out.read_bytes()),'bytes':out.stat().st_size,'sourceVersions':list(sources),'targetVersion':plan['version'],'targetCore':plan['targetCore'],'namespace':plan['namespace'],'changedCodeFiles':len(files),'databaseScope':'none','acceptance':'pending','deployed':False,'publicDomainTests':'pending'}
(ROOT/'evidence/package.json').write_bytes(encoded(record));print(json.dumps(record,indent=2))
