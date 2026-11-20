"""R127 game update and separately invoked disk maintenance for exact R126."""
import hashlib,json,sys,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];PROJECT=ROOT.parent;WORK=PROJECT/'r109_latency_completion/working';CORE='core511-source/scripts/core511/'
sys.path.insert(0,str(ROOT/'deployment/modules'))
import r63_support as identity
from storage import encoded
from source_identity import source_rows,target_rows
sha=lambda b:hashlib.sha256(b).hexdigest()
archive=PROJECT/'r126_encounter/artifacts/R126_ENCOUNTER_ce09ea6316de.zip'
assert sha(archive.read_bytes())=='8838bffefee002964455e0273deb4f788b5acf1c14d4ebb76aafe54902946e5e'
with zipfile.ZipFile(archive) as z:prev=json.loads(z.read('plan.json'))
base=prev['sources']['R125_RUNE_CLIENT1'];rows=target_rows(source_rows(base),prev)
assert identity.identity_from_rows(rows.values())==prev['targetCore']
source={**base,'core':prev['targetCore'],'coreRows':list(rows.values())}
from client import build
game,portal,atlas=build()
assets=[game,portal,atlas]
namespace='core511-'+sha((ROOT/'assets'/game).read_bytes()+(ROOT/'assets'/portal).read_bytes())[:16]
client={'namespace':namespace,'game':game,'portal':portal,'admin':base['admin'],'clientNew':assets+[base['admin']]}
files={};data={}
def include(name,body,before):
 assert sha(body)!=before,name
 files[name]={'before':[before],'after':sha(body),'bytes':len(body)}
 data['payload/'+name]=body
for short in ['auto-ip-r102.mjs','engine-health-r113.mjs','native-http-action.mjs','stone-art-r127.mjs','world-projection.mjs','market-state.mjs','shop-feed-r127.mjs','nonlethal-rewards-r56.mjs','generated/attack-rules.mjs','generated/attack-writer-rules.mjs']:
 include(CORE+short,(WORK/CORE/short).read_bytes(),rows.get(short,{}).get('sha256'))
name='http-runtime/dist-vds/server/index.js'
include(name,(WORK/name).read_bytes(),next(r['sha256'] for r in source['retainedFiles'] if r['path']==name))
for name in assets:include(CORE+'generated/client/'+name,(ROOT/'assets'/name).read_bytes(),None)
target=identity.identity_from_rows(target_rows(rows,{'files':files}).values())
plan={'site':None,'version':'R127_ACADEMY1','realms':['r1','r2'],'databaseChanges':False,'databaseSchemaChanges':False,'databaseScope':'none','backupPolicy':{'keep':1,'scope':'changed-code-only'},'nativeBaseline':prev['nativeBaseline'],'operationsCanonicalSHA256':prev['operationsCanonicalSHA256'],'sources':{'R126_ENCOUNTER1':source},'targets':{'R126_ENCOUNTER1':{'core':target}},'targetCore':target,'files':files,**client}
(ROOT/'deployment/modules/code_contract.py').write_text("# R127 code identity. Disk maintenance is invoked separately.\nPLAN_SHA256 = '"+sha(encoded(plan))+"'\n")
modules={p.name:p.read_bytes() for p in (ROOT/'deployment/modules').iterdir() if p.suffix in ('.py','.mjs')}
with zipfile.ZipFile(archive) as z:bootstrap=z.read('__main__.py')
data.update({'__main__.py':bootstrap,'plan.json':encoded(plan),'modules.json':encoded({n:sha(b) for n,b in modules.items()})})
data.update({'modules/'+n:b for n,b in modules.items()})
key=sha(encoded({n:sha(b) for n,b in sorted(data.items())}));out=ROOT/'artifacts'/('R127_TOPLU_'+key[:12]+'.zip')
if not out.exists():
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for n,b in sorted(data.items()):
   info=zipfile.ZipInfo(n,(2026,11,16,0,0,0));info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,b)
with zipfile.ZipFile(out) as z:assert z.testzip() is None;assert all(z.read(n)==b for n,b in data.items())
report={'file':str(out.relative_to(ROOT)),'sha256':sha(out.read_bytes()),'bytes':out.stat().st_size,'source':'R126_ENCOUNTER1','targetVersion':plan['version'],'targetCore':target,'changedCodeFiles':len(files),'deployed':False,'acceptanceReport':'evidence/validation.json'}
(ROOT/'evidence/package.json').write_bytes(encoded(report));print(json.dumps(report,indent=2))
