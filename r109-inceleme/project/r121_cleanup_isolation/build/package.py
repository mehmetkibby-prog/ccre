"""Five backend files, preserving each exact installed R118/R119/R120 client."""
import hashlib,json,sys,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];PROJECT=ROOT.parent;WORK=PROJECT/'r109_latency_completion/working';CORE='core511-source/scripts/core511/'
sys.path.insert(0,str(ROOT/'deployment/modules'))
import r63_support as identity
from storage import encoded
from source_identity import source_rows,target_rows
sha=lambda b:hashlib.sha256(b).hexdigest()
inputs=[('r118_royal_champions/artifacts/R118_ROYAL_61ba37784ffb.zip','8a41b77d3cc136729468f0951ce651da56a01d8b71852b730de8e7f26c3c78e5'),('r119_monster_motion/artifacts/R119_MOTION_4596197ee9b4.zip','8f544b172c6ea7afc737267f587c61daada01f6c6d33ba61d97a9db830575e39'),('r120_2d_depot/artifacts/R120_2D_DEPOT_f2ae90415c02.zip','2763f8fbc6e37749f2dcd1df5f2ad4c57e391761ef49208f28f5438b1aad05b8')]
plans=[]
for name,checksum in inputs:
 file=PROJECT/name;assert sha(file.read_bytes())==checksum
 with zipfile.ZipFile(file) as z:plans.append(json.loads(z.read('plan.json')));bootstrap=z.read('__main__.py')
p118,p119,p120=plans;rows118=source_rows(p119['sources']['R118_ROYAL1']);rows119=target_rows(rows118,p119);rows120=target_rows(rows119,p120)
sources={}
for p,rows in [(p118,rows118),(p119,rows119),(p120,rows120)]:
 assert identity.identity_from_rows(rows.values())==p['targetCore']
 source={'core':p['targetCore'],'coreRows':list(rows.values()),'retainedFiles':p119['sources']['R118_ROYAL1']['retainedFiles'],**{k:p[k] for k in ('namespace','game','admin','portal')}}
 versions=[p['version']] if p!=p120 else ['R120_2D_DEPOT1','R120_2D_DEPOT2','R120_2D_DEPOT3','R120_2D_DEPOT4']
 for version in versions:sources[version]=source
names=['ipc-safe-stream.mjs','command-failure-scope.mjs','writer-runtime.mjs','world-cleanup-coordinator.mjs','engine-health-r113.mjs']
files={};data={}
for short in names:
 name=CORE+short;b=(WORK/name).read_bytes();before=list(dict.fromkeys(source_rows(s)[short]['sha256'] for s in sources.values()))
 assert len(before)==1 and before!=[sha(b)]
 files[name]={'before':before,'after':sha(b),'bytes':len(b)};data['payload/'+name]=b
targets={version:{'core':identity.identity_from_rows(target_rows(source_rows(source),{'files':files}).values())} for version,source in sources.items()}
assert identity.core_identity(WORK/CORE)==targets['R120_2D_DEPOT4']['core'],'Unreviewed runtime difference'
plan={'site':None,'version':'R121_CLEANUP1','realms':['r1','r2'],'databaseChanges':False,'databaseSchemaChanges':False,'databaseScope':'none','backupPolicy':{'keep':1,'scope':'changed-code-only'},'nativeBaseline':p120['nativeBaseline'],'operationsCanonicalSHA256':p120['operationsCanonicalSHA256'],'sources':sources,'targets':targets,'targetCore':targets['R120_2D_DEPOT4']['core'],'files':files,'clientNew':[],**{k:p120[k] for k in ('namespace','game','admin','portal')}}
(ROOT/'deployment/modules/code_contract.py').write_text("# Exact R121 backend-only per-source target contract.\nPLAN_SHA256 = '"+sha(encoded(plan))+"'\n")
modules={p.name:p.read_bytes() for p in (ROOT/'deployment/modules').iterdir() if p.suffix in ('.py','.mjs')}
data.update({'__main__.py':bootstrap,'plan.json':encoded(plan),'modules.json':encoded({n:sha(b) for n,b in modules.items()}),'KURULUM.md':(ROOT/'KURULUM.md').read_bytes()})
data.update({'modules/'+n:b for n,b in modules.items()})
key=sha(encoded({n:sha(b) for n,b in sorted(data.items())}));out=ROOT/'artifacts'/('R121_CLEANUP_'+key[:12]+'.zip')
if not out.exists():
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for n,b in sorted(data.items()):
   info=zipfile.ZipInfo(n,(2026,11,16,0,0,0));info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,b)
with zipfile.ZipFile(out) as z:assert z.testzip() is None;assert all(z.read(n)==b for n,b in data.items())
report={'file':str(out.relative_to(ROOT)),'sha256':sha(out.read_bytes()),'bytes':out.stat().st_size,'sources':list(sources),'targetVersion':plan['version'],'targets':targets,'changedCodeFiles':len(files),'databaseScope':'none','deployed':False,'acceptance':'pending'}
(ROOT/'evidence/package.json').write_bytes(encoded(report));print(json.dumps(report,indent=2))
