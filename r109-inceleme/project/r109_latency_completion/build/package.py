import hashlib,json,sys,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'deployment/modules'))
import r63_support as identity
from storage import encoded
sha=lambda b:hashlib.sha256(b).hexdigest()
base=ROOT.parent/'r105_performance_review/working';work=ROOT/'working';core='core511-source/scripts/core511/'
prior=ROOT.parent/'r105_performance_review/delivery/r105-kule-performans.zip'
assert sha(prior.read_bytes())=='1f3d315f6f75a1854bcad7c72946471f6f817dd4bb74feaec97eb7e3e5472ba9'
with zipfile.ZipFile(prior) as z:previous=json.loads(z.read('plan.json'));bootstrap=z.read('__main__.py')
proof=json.loads((base/core/'generated/native-client-proof.json').read_text());composition=json.loads((base/core/'generated/native-http-composition-proof.json').read_text())
sourceRows=identity.core_rows(base/core);sourceCore=identity.identity_from_rows(sourceRows);assert sourceCore==previous['targetCore']
client={k:previous[k] for k in ('namespace','game','admin','portal')};client['clientNew']=[];rows={};data={}
for tree in ('core511-source','http-runtime','accounts-runtime','native510-bb3a6cc689c6'):
 for file in sorted((work/tree).rglob('*')):
  if not file.is_file() or file.is_symlink() or '__pycache__' in file.parts or file.name.startswith('.'):continue
  name=file.relative_to(work).as_posix();old=base/name;b=file.read_bytes();before=sha(old.read_bytes()) if old.is_file() else None
  if before==sha(b):continue
  rows[name]={'before':[before],'after':sha(b),'bytes':len(b)};data['payload/'+name]=b
allowed={core+n for n in ('native-bot-check.mjs','native-http-bindings.mjs','generated/native-http-composition-proof.json')}|{'http-runtime/dist-vds/server/index.js','accounts-runtime/dist-vds/server/index.js'}|{'native510-bb3a6cc689c6/vds-server/src/'+n for n in ('bot-check.mjs','captcha-renderer-r106.mjs','captcha-worker-r106.mjs')}
allowed.update(core+n for n in ('adventure-channel.mjs','process-stream.mjs','cold-world.mjs','read-worker.mjs','slim-reload.mjs','combat-checkpoint.mjs','coordinator.mjs'))
allowed.update(core+n for n in ('reward-worker-r533.mjs','statement-boot-pool-r61.mjs','reward-sql-r531.mjs','death-batch-channel-r57.mjs','death-batch-single-r57.mjs'))
assert set(rows)==allowed,set(rows)^allowed
for name in ('entry-writer.mjs','native-presence.mjs','auto-ip-r102.mjs','content-service-r102.mjs','generated/native-http-services.mjs','generated/native-client-proof.json'):
 assert (work/core/name).read_bytes()==(base/core/name).read_bytes()
selected=ROOT.parent/'r106_captcha_worker/delivery/r106-captcha.zip'
assert sha(selected.read_bytes())=='6c8a931dfa7da3cdaf054d5c2c5715103abfa35024ff422402a9aaa734d22d2a'
with zipfile.ZipFile(selected) as z:captcha=json.loads(z.read('plan.json'))
captchaBase=ROOT.parent/'r106_captcha_worker/working';captchaRows=identity.core_rows(captchaBase/core)
assert identity.identity_from_rows(captchaRows)==captcha['targetCore']
sources={'R105_PERF1':{'core':sourceCore,'coreRows':sourceRows,'namespace':composition['clientAssetNamespace'],'game':proof['name'],'admin':proof['admin']['name'],'portal':proof['portal']['name']},'R106_CAPTCHA1':{'core':captcha['targetCore'],'coreRows':captchaRows,**{k:captcha[k] for k in ('namespace','game','admin','portal')}}}
for name,row in rows.items():
 p=captchaBase/name;before=sha(p.read_bytes()) if p.is_file() else None
 if before not in row['before']:row['before'].append(before)
plan={'site':None,'version':'R109_LATENCY2','realms':['r1','r2'],'databaseChanges':False,'databaseSchemaChanges':False,'databaseScope':'none','backupPolicy':{'keep':1,'scope':'changed-code-only'},'nativeBaseline':previous['nativeBaseline'],'operationsCanonicalSHA256':previous['operationsCanonicalSHA256'],'sources':sources,'targetCore':identity.core_identity(work/core),'files':rows,**{k:client[k] for k in ('namespace','game','admin','portal','clientNew')}}
from source_identity import source_rows,target_rows
for source in sources.values():assert identity.identity_from_rows(target_rows(source_rows(source),plan).values())==plan['targetCore']
(ROOT/'deployment/modules/code_contract.py').write_text("# Exact reviewed code-only delta.\nPLAN_SHA256 = '"+sha(encoded(plan))+"'\n")
modules={p.name:p.read_bytes() for p in sorted((ROOT/'deployment/modules').iterdir()) if p.suffix in ('.py','.mjs')}
data.update({'__main__.py':bootstrap,'plan.json':encoded(plan),'modules.json':encoded({n:sha(b) for n,b in modules.items()})});data.update({'modules/'+n:b for n,b in modules.items()})
for name in ('KURULUM.md','DOGRULAMA.md','PERFORMANS_RAPORU.md'):
 if (ROOT/name).exists():data[name]=(ROOT/name).read_bytes()
key=sha(encoded({n:sha(b) for n,b in sorted(data.items())}));out=ROOT/'artifacts'/('R109_LATENCY_'+key[:8]+'.zip');out.parent.mkdir(exist_ok=True)
if not out.exists():
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for n,b in sorted(data.items()):
   info=zipfile.ZipInfo(n,(2026,11,11,0,0,0));info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,b)
with zipfile.ZipFile(out) as z:assert z.testzip() is None;assert all(z.read(n)==b for n,b in data.items())
report={'file':str(out),'bytes':out.stat().st_size,'sha256':sha(out.read_bytes()),'sourceCore':sourceCore,'targetCore':plan['targetCore'],'changedCodeFiles':len(rows),'databaseScope':'none','namespace':plan['namespace']}
(ROOT/'evidence/package.json').write_bytes(encoded(report));print(json.dumps(report,indent=2))
