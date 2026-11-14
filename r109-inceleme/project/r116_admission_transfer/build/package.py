"""Immutable R116 code delta, reconstructed from the exact final R115 artifact."""
import hashlib,json,os,shutil,subprocess,sys,tempfile,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];PROJECT=ROOT.parent;REVIEW=PROJECT.parent
sys.path.insert(0,str(ROOT/'deployment/modules'))
import r63_support as identity
from storage import encoded
sha=lambda b:hashlib.sha256(b).hexdigest()
CORE='core511-source/scripts/core511/';WORK=PROJECT/'r109_latency_completion/working';BASE=PROJECT/'r105_performance_review/working'
prior=[(PROJECT/'r109_latency_completion/delivery/r109-gecikme.zip','1ba96d415891f8d474188edb64331b87b7bc12fdfb54733f49918a906e6ef068'),(PROJECT/'r110_takilma/delivery/r110-takilma.zip','4fd1fbb8a36de2ae89fb693f5617ac3a8e697f2608f4a6b14464b6703a83bcc0'),(PROJECT/'r113_engine/artifacts/R113_ENGINE_76cd8cd4c40f.zip','4399dfe08550ebf04bd4c8ea7fbab8cedcdb804fd851495dd17847a0eabbcbc3'),(PROJECT/'r114_rune_forum/artifacts/R114_FORUM_47c1d3316429.zip','68dad6638a1b6911d0d499d2b3042e6d99dc1f51862567e6325654304bbcf2cf')]
prior.append((PROJECT/'r115_shared_scope/artifacts/R115_SHARED_SCOPE_a668b021b2e3.zip','791858ebddc240c5330e663b569982305fb5acb0c8645adde77e86ed1a6603ea'))
installed={}
for file,checksum in prior:
 assert sha(file.read_bytes())==checksum
 with zipfile.ZipFile(file) as z:
  previous=json.loads(z.read('plan.json'));bootstrap=z.read('__main__.py');installed.update({n:z.read('payload/'+n) for n in previous['files']})
assert previous['version']=='R115_SHARED_SCOPE1' and previous['targetCore']=='95dd77f5e5a15ceb5d5afa752545a8bd6483ab95bf2fa466265fd294e1eb4039'
def before(name):
 if name in installed:return installed[name]
 p=BASE/name;return p.read_bytes() if p.is_file() and not p.is_symlink() else None
with tempfile.TemporaryDirectory(prefix='r116-source-') as d:
 base=Path(d)/'core';shutil.copytree(BASE/CORE,base,symlinks=True)
 for name,b in installed.items():
  if name.startswith(CORE):p=base/name[len(CORE):];p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
 sourceRows=identity.core_rows(base)
assert identity.identity_from_rows(sourceRows)==previous['targetCore']
rows={};data={}
for tree in ('core511-source','http-runtime','accounts-runtime','native510-bb3a6cc689c6'):
 for p in sorted((WORK/tree).rglob('*')):
  if not p.is_file() or p.is_symlink() or '__pycache__' in p.parts or 'evidence' in p.relative_to(WORK).parts or p.name.startswith('.'):continue
  n=p.relative_to(WORK).as_posix();b=p.read_bytes();old=before(n);checksum=sha(old) if old is not None else None
  if checksum==sha(b):continue
  rows[n]={'before':[checksum],'after':sha(b),'bytes':len(b)};data['payload/'+n]=b
allowed=set(json.loads((ROOT/'build/reviewed-files.json').read_text()));assert set(rows)==allowed,set(rows)^allowed
pinned=[{'path':n,'bytes':len(b),'sha256':sha(b)} for n,b in sorted(installed.items()) if not n.startswith(CORE) and n not in rows]
assert all(sha((WORK/r['path']).read_bytes())==r['sha256'] for r in pinned)
sources={'R115_SHARED_SCOPE1':{'core':previous['targetCore'],'coreRows':sourceRows,'retainedFiles':pinned,**{k:previous[k] for k in ('namespace','game','admin','portal')}}}
node=os.environ.get('REVIEW_NODE') or shutil.which('node')
namespace=subprocess.check_output([node,'--input-type=module','-e',"import {CLIENT_ASSET_NAMESPACE as n} from "+json.dumps((WORK/CORE/'client-assets.mjs').as_uri())+";process.stdout.write(n)"],text=True)
client=json.loads((WORK/CORE/'generated/native-client-proof.json').read_text())
assert namespace==previous['namespace'] and client['name']==previous['game'] and client['portal']['name']==previous['portal']
plan={'site':None,'version':'R116_ADMISSION_TRANSFER1','realms':['r1','r2'],'databaseChanges':False,'databaseSchemaChanges':False,'databaseScope':'none','backupPolicy':{'keep':1,'scope':'changed-code-only'},'nativeBaseline':previous['nativeBaseline'],'operationsCanonicalSHA256':previous['operationsCanonicalSHA256'],'sources':sources,'targetCore':identity.core_identity(WORK/CORE),'files':rows,'namespace':namespace,'game':client['name'],'portal':client['portal']['name'],'admin':previous['admin'],'clientNew':[]}
from source_identity import source_rows,target_rows
assert identity.identity_from_rows(target_rows(source_rows(sources['R115_SHARED_SCOPE1']),plan).values())==plan['targetCore']
(ROOT/'deployment/modules/code_contract.py').write_text("# Exact reviewed R116 server-code contract.\nPLAN_SHA256 = '"+sha(encoded(plan))+"'\n")
modules={p.name:p.read_bytes() for p in sorted((ROOT/'deployment/modules').iterdir()) if p.suffix in ('.py','.mjs')}
data.update({'__main__.py':bootstrap,'plan.json':encoded(plan),'modules.json':encoded({n:sha(b) for n,b in modules.items()})});data.update({'modules/'+n:b for n,b in modules.items()});data['KURULUM.md']=(ROOT/'KURULUM.md').read_bytes()
key=sha(encoded({n:sha(b) for n,b in sorted(data.items())}));out=ROOT/'artifacts'/('R116_ADMISSION_TRANSFER_'+key[:12]+'.zip');out.parent.mkdir(exist_ok=True)
if not out.exists():
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for n,b in sorted(data.items()):
   info=zipfile.ZipInfo(n,(2026,11,14,0,0,0));info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,b)
with zipfile.ZipFile(out) as z:assert z.testzip() is None;assert all(z.read(n)==b for n,b in data.items())
report={'file':out.relative_to(ROOT).as_posix(),'bytes':out.stat().st_size,'sha256':sha(out.read_bytes()),'sourceVersion':'R115_SHARED_SCOPE1','sourceCore':previous['targetCore'],'targetVersion':plan['version'],'targetCore':plan['targetCore'],'changedCodeFiles':len(rows),'forumChanges':False,'databaseScope':'none','namespace':namespace,'acceptance':'pending','deployed':False}
(ROOT/'evidence').mkdir(exist_ok=True);(ROOT/'evidence/package.json').write_bytes(encoded(report));print(json.dumps(report,indent=2))
