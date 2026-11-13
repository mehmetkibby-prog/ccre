"""Build a new R113 engine delta from the verified installed R110 ZIP. Old archives are read only."""
import hashlib,json,shutil,sys,tempfile,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];PROJECT=ROOT.parent;REVIEW=PROJECT.parent
sys.path.insert(0,str(ROOT/'deployment/modules'))
import r63_support as identity
from storage import encoded
sha=lambda b:hashlib.sha256(b).hexdigest()
TREES=('core511-source','http-runtime','accounts-runtime','native510-bb3a6cc689c6')
core='core511-source/scripts/core511/'
work=PROJECT/'r109_latency_completion/working';r105=PROJECT/'r105_performance_review/working'
prior=PROJECT/'r109_latency_completion/delivery/r109-gecikme.zip'
assert sha(prior.read_bytes())=='1ba96d415891f8d474188edb64331b87b7bc12fdfb54733f49918a906e6ef068'
with zipfile.ZipFile(prior) as z:
 previous=json.loads(z.read('plan.json'));bootstrap=z.read('__main__.py')
 installed={n:z.read('payload/'+n) for n in previous['files']}
assert previous['version']=='R109_LATENCY2'
def base_bytes(name):
 if name in installed:return installed[name]
 p=r105/name
 return p.read_bytes() if p.is_file() and not p.is_symlink() else None
# Installed R109 equals the pinned R109 review tree, byte for byte.
pinned=json.loads((REVIEW/'docs/r109-runtime-manifest.json').read_text())['runtimeFiles'];prefix='project/r109_latency_completion/working/'
for row in pinned:
 if row['path'].startswith(prefix):data=base_bytes(row['path'][len(prefix):]);assert data is not None and sha(data)==row['sha256'],row['path']
r110=PROJECT/'r110_takilma/delivery/r110-takilma.zip'
assert sha(r110.read_bytes())=='4fd1fbb8a36de2ae89fb693f5617ac3a8e697f2608f4a6b14464b6703a83bcc0'
with zipfile.ZipFile(r110) as z:
 previous=json.loads(z.read('plan.json'))
 installed.update({n:z.read('payload/'+n) for n in previous['files']})
assert previous['version']=='R110_HANDOFF1'
assert previous['targetCore']=='de7e042120f54f92fc62d53164696ff7df6ba2b60ef650fe0fc49bfaa00b2411'
with tempfile.TemporaryDirectory(prefix='r113-base-core-') as temp:
 base_core=Path(temp)/'core511';shutil.copytree(r105/core,base_core,symlinks=True)
 for name,data in installed.items():
  if name.startswith(core):target=base_core/name[len(core):];target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 sourceRows=identity.core_rows(base_core)
assert identity.identity_from_rows(sourceRows)==previous['targetCore']
# The production listener verifies the HTTP entry against this proof before
# opening. Bind the one reviewed route-call edit; never disable that guard.
entryName='http-runtime/dist-vds/server/index.js'
entryBefore=base_bytes(entryName);entryAfter=(work/entryName).read_bytes()
beforeCall=b"db().core511HttpAction.action(auth,{action:'native_chat'},"
afterCall=b"db().core511HttpAction.chat(auth,payload,"
assert entryBefore.count(beforeCall)==1
assert entryAfter==entryBefore.replace(beforeCall,afterCall)
proofName=core+'generated/native-http-composition-proof.json'
proof=json.loads(base_bytes(proofName));assert proof['generatedSha256']==sha(entryBefore)
proof['generatedSha256']=sha(entryAfter)
proof['r111ChatContinuity']={'sourceSha256':sha(entryBefore),'callSiteReplacements':1,'scope':'Plain world/trade chat uses the bound continuity gate; all native filtering, SQL and notification code is unchanged.'}
assert json.loads((work/proofName).read_text())==proof
rows={};data={}
for tree in TREES:
 for file in sorted((work/tree).rglob('*')):
  if not file.is_file() or file.is_symlink() or '__pycache__' in file.parts or 'evidence' in file.relative_to(work).parts or file.name.startswith('.'):continue
  name=file.relative_to(work).as_posix();b=file.read_bytes();old=base_bytes(name);before=sha(old) if old is not None else None
  if before==sha(b):continue
  rows[name]={'before':[before],'after':sha(b),'bytes':len(b)};data['payload/'+name]=b
allowed=set(json.loads((ROOT/'build/reviewed-files.json').read_text()))
assert set(rows)==allowed,set(rows)^allowed
assert (work/'accounts-runtime/dist-vds/server/index.js').read_bytes()==base_bytes('accounts-runtime/dist-vds/server/index.js')
pinned=[{'path':n,'bytes':r['bytes'],'sha256':r['after']} for n,r in sorted(previous['files'].items()) if not n.startswith(core)]
assert len(pinned)==3 and all(sha((work/r['path']).read_bytes())==r['sha256'] for r in pinned)
sources={'R110_HANDOFF1':{'core':previous['targetCore'],'coreRows':sourceRows,'retainedFiles':pinned,**{k:previous[k] for k in ('namespace','game','admin','portal')}}}
import os,subprocess
node=os.environ.get('REVIEW_NODE') or shutil.which('node')
namespace=subprocess.check_output([node,'--input-type=module','-e',"import {CLIENT_ASSET_NAMESPACE as n} from "+json.dumps((work/core/'client-assets.mjs').as_uri())+";process.stdout.write(n)"],text=True)
client=json.loads((work/core/'generated/native-client-proof.json').read_text())
assert client['engineR113']['baseline']['name']==previous['game']
from derived_schema import SCOPE,POLICY,TABLES
plan={'site':None,'version':'R113_ENGINE1','realms':['r1','r2'],'databaseChanges':False,'databaseSchemaChanges':True,'databaseScope':SCOPE,'derivedTables':TABLES,'backupPolicy':POLICY,'nativeBaseline':previous['nativeBaseline'],'operationsCanonicalSHA256':previous['operationsCanonicalSHA256'],'sources':sources,'targetCore':identity.core_identity(work/core),'files':rows,'namespace':namespace,'game':client['name'],'portal':client['portal']['name'],'admin':previous['admin'],'clientNew':[client['name'],client['bridge'],client['portal']['name'],previous['admin']]}
from source_identity import source_rows,target_rows
for source in sources.values():assert identity.identity_from_rows(target_rows(source_rows(source),plan).values())==plan['targetCore']
(ROOT/'deployment/modules/code_contract.py').write_text("# Exact reviewed R113 code and additive-schema contract.\nPLAN_SHA256 = '"+sha(encoded(plan))+"'\n")
modules={p.name:p.read_bytes() for p in sorted((ROOT/'deployment/modules').iterdir()) if p.suffix in ('.py','.mjs')}
data.update({'__main__.py':bootstrap,'plan.json':encoded(plan),'modules.json':encoded({n:sha(b) for n,b in modules.items()})});data.update({'modules/'+n:b for n,b in modules.items()})
data['KURULUM.md']=(ROOT/'KURULUM.md').read_bytes()
key=sha(encoded({n:sha(b) for n,b in sorted(data.items())}));out=ROOT/'artifacts'/('R113_ENGINE_'+key[:12]+'.zip');out.parent.mkdir(exist_ok=True)
if not out.exists():
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for n,b in sorted(data.items()):
   info=zipfile.ZipInfo(n,(2026,11,13,0,0,0));info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,b)
with zipfile.ZipFile(out) as z:assert z.testzip() is None;assert all(z.read(n)==b for n,b in data.items())
report={'file':out.relative_to(ROOT).as_posix(),'bytes':out.stat().st_size,'sha256':sha(out.read_bytes()),'sourceVersion':'R110_HANDOFF1','sourceCore':previous['targetCore'],'targetVersion':'R113_ENGINE1','targetCore':plan['targetCore'],'changedCodeFiles':len(rows),'newFiles':[n for n,r in rows.items() if None in r['before']],'databaseScope':SCOPE,'namespace':namespace,'acceptance':'pending','deployed':False}
(ROOT/'evidence/package.json').write_bytes(encoded(report));print(json.dumps({k:v for k,v in report.items() if k!='newFiles'},indent=2))
