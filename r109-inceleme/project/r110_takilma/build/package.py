"""Build the R110 code-only installer from the reviewed working tree.

Source: an installed R109_LATENCY2 (the R109 ZIP applied to R105_PERF1 or
R106_CAPTCHA1; both give the same R109 core). The R109 tree is rebuilt here
from repository bytes only: R105 working tree + R109 ZIP payload. It is checked
against docs/r109-runtime-manifest.json before any delta is computed.
Old ZIPs, manifests and SHA256 identities are only read.
"""
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
with tempfile.TemporaryDirectory(prefix='r110-base-core-') as temp:
 base_core=Path(temp)/'core511';shutil.copytree(r105/core,base_core,symlinks=True)
 for name,data in installed.items():
  if name.startswith(core):target=base_core/name[len(core):];target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 sourceRows=identity.core_rows(base_core)
assert identity.identity_from_rows(sourceRows)==previous['targetCore']
rows={};data={}
for tree in TREES:
 for file in sorted((work/tree).rglob('*')):
  if not file.is_file() or file.is_symlink() or '__pycache__' in file.parts or file.name.startswith('.'):continue
  name=file.relative_to(work).as_posix();b=file.read_bytes();old=base_bytes(name);before=sha(old) if old is not None else None
  if before==sha(b):continue
  rows[name]={'before':[before],'after':sha(b),'bytes':len(b)};data['payload/'+name]=b
allowed={core+n for n in ('channel-process.mjs','process-supervisor.mjs','ws-endpoint.mjs','r110-options.mjs','native-http-bindings.mjs','checkpoint-sql-r531.mjs','nonlethal-rewards-r56.mjs','shared-refresh-scope.mjs','item-refresh-audit-r57.mjs')}
allowed|={'core511-source/scripts/delivery511/runtime-ingress.mjs','core511-source/scripts/delivery511/runtime-host.mjs','native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs'}
assert set(rows)==allowed,set(rows)^allowed
assert rows[core+'r110-options.mjs']['before']==[None] and all(r['before'][0] is not None for n,r in rows.items() if n!=core+'r110-options.mjs')
# Client, generated proofs, HTTP bundles and installer operations stay R109.
for name in ('generated/native-client-proof.json','generated/native-http-composition-proof.json','generated/native-http-services.mjs'):
 assert (work/core/name).read_bytes()==base_bytes(core+name)
for name in ('http-runtime/dist-vds/server/index.js','accounts-runtime/dist-vds/server/index.js'):assert (work/name).read_bytes()==base_bytes(name)
sources={'R109_LATENCY2':{'core':previous['targetCore'],'coreRows':sourceRows,**{k:previous[k] for k in ('namespace','game','admin','portal')}}}
plan={'site':None,'version':'R110_HANDOFF1','realms':['r1','r2'],'databaseChanges':False,'databaseSchemaChanges':False,'databaseScope':'none','backupPolicy':{'keep':1,'scope':'changed-code-only'},'nativeBaseline':previous['nativeBaseline'],'operationsCanonicalSHA256':previous['operationsCanonicalSHA256'],'sources':sources,'targetCore':identity.core_identity(work/core),'files':rows,**{k:previous[k] for k in ('namespace','game','admin','portal')},'clientNew':[]}
from source_identity import source_rows,target_rows
for source in sources.values():assert identity.identity_from_rows(target_rows(source_rows(source),plan).values())==plan['targetCore']
(ROOT/'deployment/modules/code_contract.py').write_text("# Exact reviewed code-only delta.\nPLAN_SHA256 = '"+sha(encoded(plan))+"'\n")
modules={p.name:p.read_bytes() for p in sorted((ROOT/'deployment/modules').iterdir()) if p.suffix in ('.py','.mjs')}
data.update({'__main__.py':bootstrap,'plan.json':encoded(plan),'modules.json':encoded({n:sha(b) for n,b in modules.items()})});data.update({'modules/'+n:b for n,b in modules.items()})
for name in ('KURULUM.md','DOGRULAMA.md','PERFORMANS_RAPORU.md'):data[name]=(ROOT/name).read_bytes()
key=sha(encoded({n:sha(b) for n,b in sorted(data.items())}));out=ROOT/'artifacts'/('R110_HANDOFF_'+key[:8]+'.zip');out.parent.mkdir(exist_ok=True)
if not out.exists():
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for n,b in sorted(data.items()):
   info=zipfile.ZipInfo(n,(2026,11,12,0,0,0));info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,b)
with zipfile.ZipFile(out) as z:assert z.testzip() is None;assert all(z.read(n)==b for n,b in data.items())
delivery=ROOT/'delivery/r110-takilma.zip';delivery.parent.mkdir(exist_ok=True);shutil.copyfile(out,delivery)
digest=sha(delivery.read_bytes());(ROOT/'delivery/r110-takilma.zip.sha256').write_text(digest+'  r110-takilma.zip\n')
report={'file':delivery.relative_to(ROOT).as_posix(),'bytes':delivery.stat().st_size,'sha256':digest,'sourceVersion':'R109_LATENCY2','sourceCore':previous['targetCore'],'targetVersion':'R110_HANDOFF1','targetCore':plan['targetCore'],'changedCodeFiles':len(rows),'newFiles':[n for n,r in rows.items() if r['before']==[None]],'databaseScope':'none','namespace':plan['namespace']}
(ROOT/'evidence/package.json').write_bytes(encoded(report));print(json.dumps(report,indent=2))
