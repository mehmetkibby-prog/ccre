"""R126 encounter checkpoint isolation for exact R125."""
import hashlib,json,sys,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];PROJECT=ROOT.parent;WORK=PROJECT/'r109_latency_completion/working';CORE='core511-source/scripts/core511/'
sys.path.insert(0,str(ROOT/'deployment/modules'))
import r63_support as identity
from storage import encoded
from source_identity import source_rows,target_rows
sha=lambda b:hashlib.sha256(b).hexdigest()
archive=PROJECT/'r121_cleanup_isolation/artifacts/R121_CLEANUP_e996c2d0f228.zip'
assert sha(archive.read_bytes())=='d99b560c1842e25a677ff836a1b1f299f0aadc716a08398e9ed9cac4238836f7'
with zipfile.ZipFile(archive) as z:p121=json.loads(z.read('plan.json'))
base=p121['sources']['R120_2D_DEPOT4'];rows=target_rows(source_rows(base),p121)
assert identity.identity_from_rows(rows.values())==p121['targets']['R120_2D_DEPOT4']['core']
with zipfile.ZipFile(PROJECT/'r123_freeze/artifacts/R123_FREEZE_932ebb79e8d4.zip') as z:p123=json.loads(z.read('plan.json'))
rows=target_rows(rows,p123)
assert identity.identity_from_rows(rows.values())==p123['targetCore']
with zipfile.ZipFile(PROJECT/'r124_boss/artifacts/R124_RUNE_78d7898a56ea.zip') as z:p124=json.loads(z.read('plan.json'))
rows=target_rows(rows,p124)
assert identity.identity_from_rows(rows.values())==p124['targetCore']
with zipfile.ZipFile(PROJECT/'r125_rune_client/artifacts/R125_RUNE_f5d222064ed8.zip') as z:p125=json.loads(z.read('plan.json'))
rows=target_rows(rows,p125)
assert identity.identity_from_rows(rows.values())==p125['targetCore']
source={**base,**{k:p125[k] for k in ('namespace','game','admin','portal')},'core':p125['targetCore'],'coreRows':list(rows.values())}
client={**{k:source[k] for k in ('namespace','game','admin','portal')},'clientNew':[]}
files={};data={}
for short in ['encounter-checkpoint.mjs']:
 name=CORE+short;b=(WORK/name).read_bytes()
 files[name]={'before':[rows[short]['sha256']],'after':sha(b),'bytes':len(b)}
 data['payload/'+name]=b
target=identity.identity_from_rows(target_rows(rows,{'files':files}).values())
assert all(files[CORE+n]['after']!=files[CORE+n]['before'][0] for n in ['encounter-checkpoint.mjs'])
plan={'site':None,'version':'R126_ENCOUNTER1','realms':['r1','r2'],'databaseChanges':False,'databaseSchemaChanges':False,'databaseScope':'none','backupPolicy':{'keep':1,'scope':'changed-code-only'},'nativeBaseline':p121['nativeBaseline'],'operationsCanonicalSHA256':p121['operationsCanonicalSHA256'],'sources':{'R125_RUNE_CLIENT1':source},'targets':{'R125_RUNE_CLIENT1':{'core':target}},'targetCore':target,'files':files,**client}
(ROOT/'deployment/modules/code_contract.py').write_text("# Exact R122 backend target. Separate --compact command is offline data maintenance.\nPLAN_SHA256 = '"+sha(encoded(plan))+"'\n")
modules={p.name:p.read_bytes() for p in (ROOT/'deployment/modules').iterdir() if p.suffix in ('.py','.mjs')}
with zipfile.ZipFile(archive) as z:bootstrap=z.read('__main__.py')
data.update({'__main__.py':bootstrap,'plan.json':encoded(plan),'modules.json':encoded({n:sha(b) for n,b in modules.items()})})
data.update({'modules/'+n:b for n,b in modules.items()})
key=sha(encoded({n:sha(b) for n,b in sorted(data.items())}));out=ROOT/'artifacts'/('R126_ENCOUNTER_'+key[:12]+'.zip')
if not out.exists():
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for n,b in sorted(data.items()):
   info=zipfile.ZipInfo(n,(2026,11,16,0,0,0));info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,b)
with zipfile.ZipFile(out) as z:assert z.testzip() is None;assert all(z.read(n)==b for n,b in data.items())
report={'file':str(out.relative_to(ROOT)),'sha256':sha(out.read_bytes()),'bytes':out.stat().st_size,'source':'R125_RUNE_CLIENT1','targetVersion':plan['version'],'targetCore':target,'changedCodeFiles':len(files),'deployed':False,'acceptance':'pending'}
(ROOT/'evidence/package.json').write_bytes(encoded(report));print(json.dumps(report,indent=2))
