"""Pinned R89 -> R90 verification-only update; retains client, runtime and DB."""
from pathlib import Path
import hashlib,json,re,zipfile

ROOT=Path(__file__).resolve().parent
BASE=Path('/tmp/core511-r89-work')
PACKAGE=ROOT/'r90-package'
CORE='core511-source/scripts/core511/'
HTTP='http-runtime/dist-vds/server/index.js'
MODULES=['installer.py','storage.py','central.mjs','r63_support.py','client_stage.py','retention.py','runtime_stage.py','inplace_stage.py','ingress_stage.py']
ALLOWED={CORE+n for n in ['afk-coordinator.mjs','channel-runtime.mjs','native-http-bindings.mjs','patch-native-bot-check.mjs','session-mirror.mjs','verification-room-r90.mjs']}|{HTTP}
BASE_CORE='8d145357746321e2376013af405de65cdf82b173206556a119d03505465aa75a'
def sha(data):return hashlib.sha256(data).hexdigest()
def encoded(value):return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()
def write(path,data):path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
def once(s,a,b):
 assert s.count(a)==1,'Anchor drift: '+a[:80]
 return s.replace(a,b)
def versions(text):return re.sub('R85|R86|r85|r86',lambda m:{'R85':'R89','R86':'R90','r85':'r89','r86':'r90'}[m[0]],text)
def identity(rows):
 rows=sorted(rows,key=lambda r:tuple(r['path'].split('/')))
 return sha(json.dumps({'kind':'core511-source-candidate-v1','baselineManifestSha256':'bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b','files':rows},ensure_ascii=False,separators=(',',':')).encode())

def stage():
 archive=BASE/'artifacts/CORE511_R89_TOPLU.zip'
 assert sha(archive.read_bytes())=='cf18468029536e94b4b0a7ba1c08be201dbff5e86bcf16384b18239b90407566'
 with zipfile.ZipFile(archive) as z:
  old=json.loads(z.read('update.json'));rows={r['path']:r for r in old['baseCoreRows']}
  for n,m in old['files'].items():
   if n.startswith(CORE):rows[n[len(CORE):]]={'path':n[len(CORE):],'bytes':m['bytes'],'sha256':m['after']}
  runtime=z.read('RUNTIME.json');ingress=z.read('modules/ingress_stage.py')
 assert identity(list(rows.values()))==BASE_CORE
 for n,m in rows.items():
  data=(BASE/'working'/CORE/n).read_bytes();assert len(data)==m['bytes'] and sha(data)==m['sha256']
 actual={p.relative_to(ROOT/'working'/CORE).as_posix():p for p in (ROOT/'working'/CORE).rglob('*') if p.is_file()}
 files={}
 for n,p in actual.items():
  data=p.read_bytes();before=rows.get(n)
  if before and sha(data)==before['sha256']:continue
  files[CORE+n]={'before':before['sha256'] if before else None,'after':sha(data),'bytes':len(data)}
 before_http=(BASE/'working'/HTTP).read_bytes();after_http=(ROOT/'working'/HTTP).read_bytes()
 files[HTTP]={'before':sha(before_http),'after':sha(after_http),'bytes':len(after_http)}
 assert set(files)==ALLOWED and set(rows)<=set(actual)
 files=dict(sorted(files.items(),key=lambda r:(r[1]['before'] is None,r[0])))
 a=b'},bot,()=>Response.json({\n\t\t\trequired,\n\t\t\tdueAt: bot.deadline(auth.account.id),\n\t\t\t...required ? bot.challenge(auth.account.id, "game") : {}\n\t\t}, { headers: { "Cache-Control": "no-store" } })))'
 b=a.replace(b'()=>Response.json',b'()=>{const required=bot.required(auth.account.id);return Response.json').replace(b'} })))',b'} });}))')
 assert before_http.count(a)==1 and before_http.replace(a,b)==after_http
 client={'oldNamespace':old['client']['namespace'],'namespace':old['client']['namespace'],'oldName':old['client']['name'],'name':old['client']['name'],'generatedNames':[old['client']['name']]}
 plan={k:old[k] for k in ('protocol','databaseChanges','databaseSchemaChanges','databaseScope','accountsChanges','nativeBaseline','operationsCanonicalSHA256','runtime')}
 plan.update(version='R90_GAMEPLAY',sourceVersion='R89_GAMEPLAY',clientChanges=False,client=client,httpEntrySHA256=sha(before_http),baseCoreSHA256=BASE_CORE,baseCoreRows=sorted(rows.values(),key=lambda r:tuple(r['path'].split('/'))),files=files)
 source=Path('/workspace/ccre/r86_stability_work/artifacts/CORE511_R86_TOPLU.zip')
 assert sha(source.read_bytes())=='9eed28b0c88ee460d85ed329a577bb3fb8546c373bb4f1da383433ca42b579ac'
 with zipfile.ZipFile(source) as z:
  modules={n:z.read('modules/'+n) for n in MODULES};bootstrap=z.read('__main__.py')
 text=versions(modules['installer.py'].decode())
 constants={'SOURCE_CORE_SHA256':BASE_CORE,'R89_HTTP_SHA256':sha(before_http),'CLIENT_OLD_NAMESPACE':client['oldNamespace'],'CLIENT_NAMESPACE':client['namespace'],'CLIENT_OLD_NAME':client['oldName'],'CLIENT_NAME':client['name'],'PRODUCTION_PATHS':tuple(files),'NEW_PRODUCTION_PATHS':None}
 for key,value in constants.items():
  replacement=key+'='+('frozenset('+repr([n for n,m in files.items() if m['before'] is None])+')' if key=='NEW_PRODUCTION_PATHS' else repr(value))
  text,count=re.subn('^'+key+'=.*$',lambda _:replacement,text,flags=re.M);assert count==1,key
 text=once(text,"require(HTTP not in plan['files'] and not any(n.startswith(CLIENT_ASSETS) or n.startswith(old.CORE+'generated/client/') for n in plan['files']),'R90 istemci ve HTTP dosyalarını değiştiremez')","require(plan['files'][HTTP]['before']==R89_HTTP_SHA256 and not any(n.startswith(CLIENT_ASSETS) or n.startswith(old.CORE+'generated/client/') for n in plan['files']),'R90 yalnız sabit sunucu doğrulama değişikliğini içerir; istemci grafiği korunur')")
 text=once(text,"require(digest(member(live.root,HTTP))==R89_HTTP_SHA256,'Kurulu HTTP oyun dosyası farklı')","require(digest(member(live.root,HTTP))==(plan['files'][HTTP]['after'] if installed==VERSION else R89_HTTP_SHA256),'Kurulu HTTP oyun dosyası farklı')")
 text=once(text,'def prepare_updates(live,plan,updates,', 'VERIFICATION_HTTP_BEFORE='+repr(a)+'\nVERIFICATION_HTTP_AFTER='+repr(b)+'\ndef verification_http(data):\n require(data.count(VERIFICATION_HTTP_BEFORE)==1,\'HTTP doğrulama başlangıç bloğu farklı\')\n return data.replace(VERIFICATION_HTTP_BEFORE,VERIFICATION_HTTP_AFTER)\n\ndef prepare_updates(live,plan,updates,')
 text=once(text,"require(not any(name==HTTP or name.startswith(CLIENT_ASSETS) or name.startswith(old.CORE+'generated/client/') for name,meta,data in updates),'R90 istemci grafiğini değiştiremez')","require(not any(name.startswith(CLIENT_ASSETS) or name.startswith(old.CORE+'generated/client/') for name,meta,data in updates),'R90 istemci grafiğini değiştiremez')\n http_updates=[data for name,meta,data in updates if name==HTTP]\n require(len(http_updates)==1 and http_updates[0]==verification_http(original_http),'R90 HTTP yalnız doğrulama kararının güncel okunmasını değiştirebilir')")
 text=text.replace('# R90 retains the exact installed R89 HTTP/client graph. No asset copies,\n # renamed namespace or client payload is allowed, including during recovery.','# R90 retains the installed R89 client graph; only the pinned verification\n # HTTP response block changes. No asset copy or renamed namespace is allowed.')
 modules['installer.py']=text.encode()
 for name in ('inplace_stage.py','runtime_stage.py'):modules[name]=versions(modules[name].decode()).encode()
 modules['ingress_stage.py']=ingress
 for name,data in modules.items():write(PACKAGE/'modules'/name,data)
 write(PACKAGE/'__main__.py',versions(bootstrap.decode()).encode());write(PACKAGE/'update.json',encoded(plan));write(PACKAGE/'RUNTIME.json',runtime)
 for name in files:write(PACKAGE/'payload'/name,(ROOT/'working'/name).read_bytes())
 final=dict(rows)
 for name,m in files.items():
  if name.startswith(CORE):n=name[len(CORE):];final[n]={'path':n,'bytes':m['bytes'],'sha256':m['after']}
 proof={'version':plan['version'],'baseCoreSHA256':BASE_CORE,'targetCoreSHA256':identity(list(final.values())),'productionFiles':len(files),'files':files,'clientChanges':False,'databaseChanges':False,'liveDeployment':False}
 write(ROOT/'evidence/package-plan.json',encoded(proof));print(json.dumps({k:v for k,v in proof.items() if k!='files'},indent=2))
 return plan

if __name__=='__main__':stage()
