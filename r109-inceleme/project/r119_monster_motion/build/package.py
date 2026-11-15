"""Five explicitly reviewed presentation files on the immutable corrected R118."""
import hashlib,json,sys,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT.parent/'r109_latency_completion/working'
sys.path.insert(0,str(ROOT/'deployment/modules'))
import r63_support as identity
from storage import encoded
from source_identity import source_rows,target_rows
sha=lambda b:hashlib.sha256(b).hexdigest()
CORE='core511-source/scripts/core511/'
archive=ROOT.parent/'r118_royal_champions/artifacts/R118_ROYAL_61ba37784ffb.zip'
assert sha(archive.read_bytes())=='8a41b77d3cc136729468f0951ce651da56a01d8b71852b730de8e7f26c3c78e5'
with zipfile.ZipFile(archive) as z:
 previous=json.loads(z.read('plan.json'));bootstrap=z.read('__main__.py')
 source=target_rows(source_rows(previous['sources']['R117_HOOK10']),previous)
 assert identity.identity_from_rows(source.values())==previous['targetCore']
 retained={r['path']:r for r in previous['sources']['R117_HOOK10']['retainedFiles']}
 for name,row in previous['files'].items():
  if not name.startswith(CORE):retained[name]={'path':name,'bytes':row['bytes'],'sha256':row['after']}
spec=json.loads((ROOT/'build/client-spec.json').read_text())
assert len(spec['files'])==5 and spec['files'][:2]==['champions-client-r118.mjs','generated/native-client-proof.json']
assert all(n.startswith('generated/client/') and n.endswith('.js') for n in spec['files'][2:])
files={};data={}
for short in spec['files']:
 name=CORE+short;b=(WORK/name).read_bytes();before=source.get(short)
 files[name]={'before':[before['sha256'] if before else None],'after':sha(b),'bytes':len(b)}
 assert files[name]['before']!=[sha(b)]
 data['payload/'+name]=b
current=identity.core_rows(WORK/CORE)
assert {r['path'] for r in current if source.get(r['path'])!=r}==set(spec['files'])
assert not set(source)-{r['path'] for r in current}
for row in retained.values():assert sha((WORK/row['path']).read_bytes())==row['sha256']
sources={'R118_ROYAL1':{'core':previous['targetCore'],'coreRows':list(source.values()),'retainedFiles':list(retained.values()),**{k:previous[k] for k in ('namespace','game','admin','portal')}}}
plan={'site':None,'version':'R119_MOTION1','realms':['r1','r2'],'databaseChanges':False,'databaseSchemaChanges':False,'databaseScope':'none','backupPolicy':{'keep':1,'scope':'changed-code-only'},'nativeBaseline':previous['nativeBaseline'],'operationsCanonicalSHA256':previous['operationsCanonicalSHA256'],'sources':sources,'targetCore':identity.identity_from_rows(current),'files':files,**{k:spec[k] for k in ('namespace','game','admin','portal','clientNew')}}
assert identity.identity_from_rows(target_rows(source,plan).values())==plan['targetCore']
(ROOT/'deployment/modules/code_contract.py').write_text("# Exact reviewed presentation-only R119 delta.\nPLAN_SHA256 = '"+sha(encoded(plan))+"'\n")
modules={p.name:p.read_bytes() for p in (ROOT/'deployment/modules').iterdir() if p.suffix in ('.py','.mjs')}
data.update({'__main__.py':bootstrap,'plan.json':encoded(plan),'modules.json':encoded({n:sha(b) for n,b in modules.items()}),'KURULUM.md':(ROOT/'KURULUM.md').read_bytes()})
data.update({'modules/'+n:b for n,b in modules.items()})
key=sha(encoded({n:sha(b) for n,b in sorted(data.items())}));out=ROOT/'artifacts'/('R119_MOTION_'+key[:12]+'.zip');out.parent.mkdir(exist_ok=True)
if not out.exists():
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for n,b in sorted(data.items()):
   info=zipfile.ZipInfo(n,(2026,11,15,0,0,0));info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,b)
with zipfile.ZipFile(out) as z:assert z.testzip() is None;assert all(z.read(n)==b for n,b in data.items())
record={'file':str(out.relative_to(ROOT)),'sha256':sha(out.read_bytes()),'bytes':out.stat().st_size,'sourceVersion':'R118_ROYAL1','targetVersion':plan['version'],'sourceCore':previous['targetCore'],'targetCore':plan['targetCore'],'namespace':plan['namespace'],'changedCodeFiles':5,'databaseScope':'none','acceptance':'pending','deployed':False}
(ROOT/'evidence/package.json').write_bytes(encoded(record));print(json.dumps(record,indent=2))
