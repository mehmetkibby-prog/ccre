"""Build the pinned corrected-R90 -> R91 client recovery update."""
from pathlib import Path
import hashlib,json,re,zipfile
ROOT=Path(__file__).resolve().parent
BASE=Path('/tmp/core511-r90-startup-fix')
WORK=ROOT/'working';PACKAGE=ROOT/'r91-package'
CORE='core511-source/scripts/core511/';HTTP='http-runtime/dist-vds/server/index.js'
def sha(data):return hashlib.sha256(data).hexdigest()
def enc(value):return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()
def write(p,data):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
def once(s,a,b):
 assert s.count(a)==1,'Anchor drift: '+a[:120]
 return s.replace(a,b)
def versions(s):return re.sub('R89|R90|r89|r90',lambda m:{'R89':'R90','R90':'R91','r89':'r90','r90':'r91'}[m[0]],s)
def identity(rows):return sha(json.dumps({'kind':'core511-source-candidate-v1','baselineManifestSha256':'bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b','files':sorted(rows,key=lambda r:tuple(r['path'].split('/')))},ensure_ascii=False,separators=(',',':')).encode())
old=json.loads((BASE/'r90-package/update.json').read_bytes())
rows={r['path']:r for r in old['baseCoreRows']}
for n,m in old['files'].items():
 if n.startswith(CORE):rows[n[len(CORE):]]={'path':n[len(CORE):],'bytes':m['bytes'],'sha256':m['after']}
for n,m in rows.items():
 data=(BASE/'working'/CORE/n).read_bytes();assert len(data)==m['bytes'] and sha(data)==m['sha256'],n
base_sha=identity(list(rows.values()))
health=(BASE/'working'/CORE/'native-http-bindings.mjs').read_text()
write(WORK/CORE/'native-http-bindings.mjs',once(health,"updateVersion:'R90_GAMEPLAY'","updateVersion:'R91_GAMEPLAY'").encode())
client_evidence=json.loads((ROOT/'evidence/client.json').read_bytes())
allowed={CORE+n for n in ['native-http-bindings.mjs','verification-recovery-r91.mjs','generated/client/'+client_evidence['name'],'generated/native-client-proof.json','generated/native-http-composition-proof.json']}
files={}
for p in (WORK/CORE).rglob('*'):
 if not p.is_file():continue
 n=p.relative_to(WORK/CORE).as_posix();before=rows.get(n);data=p.read_bytes()
 if before and sha(data)==before['sha256']:continue
 files[CORE+n]={'before':before['sha256'] if before else None,'after':sha(data),'bytes':len(data)}
assert set(files)==allowed,(set(files)^allowed)
before_http=(BASE/'working'/HTTP).read_bytes();after_http=(WORK/HTTP).read_bytes()
files[HTTP]={'before':sha(before_http),'after':sha(after_http),'bytes':len(after_http)}
files=dict(sorted(files.items(),key=lambda x:(x[1]['before'] is None,x[0])))
client={k:client_evidence[k] for k in ('oldNamespace','namespace','oldName','name')};client['generatedNames']=[client['name']]
plan={k:old[k] for k in ('protocol','databaseChanges','databaseSchemaChanges','databaseScope','accountsChanges','nativeBaseline','operationsCanonicalSHA256','runtime')}
plan.update(version='R91_GAMEPLAY',sourceVersion='R90_GAMEPLAY',clientChanges=True,client=client,httpEntrySHA256=sha(before_http),baseCoreSHA256=base_sha,baseCoreRows=sorted(rows.values(),key=lambda r:tuple(r['path'].split('/'))),files=files)
module_names=list(json.loads((BASE/'r90-package/package-files.json').read_bytes()))
modules={n:(BASE/'r90-package/modules'/n).read_bytes() for n in module_names}
code=versions(modules['installer.py'].decode())
constants={'SOURCE_CORE_SHA256':base_sha,'R90_HTTP_SHA256':sha(before_http),'CLIENT_OLD_NAMESPACE':client['oldNamespace'],'CLIENT_NAMESPACE':client['namespace'],'CLIENT_OLD_NAME':client['oldName'],'CLIENT_NAME':client['name'],'PRODUCTION_PATHS':tuple(files)}
for k,v in constants.items():
 code,count=re.subn('^'+k+'=.*$',lambda _:k+'='+repr(v),code,flags=re.M);assert count==1,k
code,count=re.subn('^NEW_PRODUCTION_PATHS=.*$',lambda _:'NEW_PRODUCTION_PATHS=frozenset('+repr([n for n,m in files.items() if m['before'] is None])+')',code,flags=re.M);assert count==1
code=once(code,"plan.get('clientChanges') is False","plan.get('clientChanges') is True")
code=once(code,"require(plan['files'][HTTP]['before']==R90_HTTP_SHA256 and not any(n.startswith(CLIENT_ASSETS) or n.startswith(old.CORE+'generated/client/') for n in plan['files']),'R91 yalnız sabit sunucu doğrulama değişikliğini içerir; istemci grafiği korunur')","require(plan['files'][HTTP]['before']==R90_HTTP_SHA256 and not any(n.startswith(CLIENT_ASSETS) for n in plan['files']),'R91 istemci grafiği yalnız doğrulanmış kurulu kaynaklardan hazırlanır')")
start=code.index('VERIFICATION_HTTP_BEFORE=');end=code.index('def prepare_updates(',start);code=code[:start]+code[end:]
start=code.index(' # R91 retains the installed R90 client graph;');end=code.index(' operations=member(live.root,old.OPS)',start)
replacement=""" # Bind the new immutable client graph and HTTP proof to the verified base.
 http_row=by_name[HTTP]
 original_http=source_reader(http_row) if source_reader else inplace.checked_path(live.root,HTTP).read_bytes()
 require(hashlib.sha256(original_http).hexdigest()==R90_HTTP_SHA256 and http_row['sha256']==R90_HTTP_SHA256,'Özgün HTTP kaynak kimliği farklı')
 expected_http=original_http.replace(CLIENT_OLD_NAMESPACE.encode(),CLIENT_NAMESPACE.encode()).replace(CLIENT_OLD_NAME.encode(),CLIENT_NAME.encode())
 http_updates=[data for name,meta,data in updates if name==HTTP]
 require(len(http_updates)==1 and http_updates[0]==expected_http,'R91 HTTP yalnız doğrulanmış istemci başvurularını değiştirebilir')
 proof_row=by_name[HTTP_PROOF]
 before_proof=source_reader(proof_row) if source_reader else inplace.checked_path(live.root,HTTP_PROOF).read_bytes()
 expected_proof=json.loads(before_proof)
 require(expected_proof.get('generatedSha256')==hashlib.sha256(original_http).hexdigest() and expected_proof.get('clientAssetNamespace')==CLIENT_OLD_NAMESPACE,'R90 HTTP ve istemci kanıtı eşleşmiyor')
 expected_proof['generatedSha256']=hashlib.sha256(http_updates[0]).hexdigest()
 expected_proof['clientAssetNamespace']=CLIENT_NAMESPACE
 proof_updates=[data for name,meta,data in updates if name==HTTP_PROOF]
 require(len(proof_updates)==1 and proof_updates[0]==encoded(expected_proof),'R91 HTTP açılış kanıtı yeni istemci grafiğine bağlanmalı')
 from client_stage import prepare_client_updates,journaled_link_updates
 extra,links=prepare_client_updates(live,plan,updates,original_manifest=original_manifest,source_reader=source_reader,check_destination=verify_start)
 result+=extra+journaled_link_updates(links)
"""
code=code[:start]+replacement+code[end:]
code=code.replace('# Exact reviewed server-only scope; the installed R90 client is retained.','# Exact reviewed verification recovery and versioned client graph.')
modules['installer.py']=code.encode()
for n in ('runtime_stage.py','inplace_stage.py'):modules[n]=versions(modules[n].decode()).encode()
for n,data in modules.items():
 if n.endswith('.py'):compile(data,n,'exec')
 write(PACKAGE/'modules'/n,data)
write(PACKAGE/'__main__.py',versions((BASE/'r90-package/__main__.py').read_text()).encode())
write(PACKAGE/'update.json',enc(plan));write(PACKAGE/'RUNTIME.json',(BASE/'r90-package/RUNTIME.json').read_bytes())
write(PACKAGE/'package-files.json',enc({n:sha(data) for n,data in modules.items()}))
for stale in (PACKAGE/'payload').rglob('*'):
 if stale.is_file() and stale.relative_to(PACKAGE/'payload').as_posix() not in files:stale.unlink()
for n in files:write(PACKAGE/'payload'/n,(WORK/n).read_bytes())
final=dict(rows)
for n,m in files.items():
 if n.startswith(CORE):final[n[len(CORE):]]={'path':n[len(CORE):],'bytes':m['bytes'],'sha256':m['after']}
write(ROOT/'evidence/package.json',enc({'baseCoreSHA256':base_sha,'targetCoreSHA256':identity(list(final.values())),'files':files,'client':client}))
ROOT.joinpath('artifacts').mkdir(exist_ok=True)
archive=ROOT/'artifacts/CORE511_R91_DOGRULAMA.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_STORED) as z:
 for p in sorted(PACKAGE.rglob('*')):
  if not p.is_file() or '__pycache__' in p.parts:continue
  info=zipfile.ZipInfo(p.relative_to(PACKAGE).as_posix(),(2026,11,2,0,0,0));info.external_attr=0o100644<<16;z.writestr(info,p.read_bytes())
digest=sha(archive.read_bytes());write(archive.with_suffix('.zip.sha256'),(digest+'  '+archive.name+'\n').encode())
print(json.dumps({'base':base_sha,'files':len(files),'bytes':archive.stat().st_size,'sha256':digest}))
