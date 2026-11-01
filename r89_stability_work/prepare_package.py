"""Package the R89 Rune and movement fixes for the verified installed R86."""
from pathlib import Path
import hashlib,json,re,zipfile

ROOT=Path('/workspace/ccre/r89_stability_work')
PACKAGE=ROOT/'r89-package'
PREVIOUS=ROOT.parent/'r86_stability_work'
TEMPLATE=ROOT.parent/'r85_stability_work'
CORE='core511-source/scripts/core511/'
HTTP='http-runtime/dist-vds/server/index.js'
INGRESS='core511-source/scripts/delivery511/runtime-ingress.mjs'
BASE_CORE='6965a41ff2c9f3018f6f70f091b1bfbfdc8c16bac8470f17b6ba78c637dfe2fc'
ARCHIVE_SHA='9eed28b0c88ee460d85ed329a577bb3fb8546c373bb4f1da383433ca42b579ac'
MODULES=['installer.py','storage.py','central.mjs','r63_support.py','client_stage.py','retention.py','runtime_stage.py','inplace_stage.py','ingress_stage.py']
ALLOWED={
 'reward-service-refresh-r89.mjs','reward-worker-runtime-r533.mjs','mode-services.mjs','game-services.mjs',
 'adapt-rune-respawn-r89.mjs','extract-pve-attack.mjs','generated/attack-rules.mjs',
 'potion-scope-r89.mjs','potion-join-r56.mjs','claim-actor-join-r56.mjs','potion-refresh.mjs',
 'actor-checkpoint.mjs','actor-section-reuse-r52.mjs','attack-loop.mjs','attack-writer.mjs',
 'default-loot-cache-r87.mjs','generated/attack-writer-rules.mjs','joined-checkpoint-r53.mjs',
 'native-http-bindings.mjs','rune-reward-scope-r87.mjs','writer-settings.mjs',
 'action-loop.mjs','attack-memory.mjs','channel-connections.mjs','client-transport.mjs',
 'death-movement-r86.mjs','fixed-loop.mjs','potion-batch-channel-r61.mjs',
 'resident-channel.mjs','reward-reply-r54.mjs',
 'generated/client/game-client-core511-r87-aaf06f246f8a616a.js',
 'generated/client/game-client-core511-r88-aa6aed7dd8933fa4.js',
 'generated/client/core511-transport-r88-f2a907c787e721a0.js',
 'generated/native-client-proof.json','generated/native-http-composition-proof.json',
}
def sha(data):return hashlib.sha256(data).hexdigest()
def encoded(value):return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()
def write(path,data):path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
def identity(rows):
 ordered=[{'path':r['path'],'bytes':r['bytes'],'sha256':r['sha256']} for r in sorted(rows,key=lambda r:tuple(r['path'].split('/')))]
 return sha(json.dumps({'kind':'core511-source-candidate-v1','baselineManifestSha256':'bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b','files':ordered},ensure_ascii=False,separators=(',',':')).encode())
def versions(text):return re.sub(r'R8[45]|r8[45]',lambda m:{'R84':'R86','R85':'R89','r84':'r86','r85':'r89'}[m[0]],text)
def once(text,before,after):
 assert text.count(before)==1,'Anchor drift: '+before[:100]
 return text.replace(before,after)
def stage():
 archive=PREVIOUS/'artifacts/CORE511_R86_TOPLU.zip';assert sha(archive.read_bytes())==ARCHIVE_SHA
 with zipfile.ZipFile(archive) as z:
  previous=json.loads(z.read('update.json'));assert previous['version']=='R86_GAMEPLAY'
  rows={r['path']:dict(r) for r in previous['baseCoreRows']}
  assert identity(rows.values())==previous['baseCoreSHA256']
  for n,m in previous['files'].items():
   data=z.read('payload/'+n);assert len(data)==m['bytes'] and sha(data)==m['after']
   assert n.startswith(CORE)
   short=n[len(CORE):];assert rows.get(short,{}).get('sha256')==m['before']
   rows[short]={'path':short,'bytes':len(data),'sha256':sha(data)}
  preserved_ingress=z.read('modules/ingress_stage.py')
  runtime=z.read('RUNTIME.json')
 assert len(rows)==1181 and identity(rows.values())==BASE_CORE
 actual={p.relative_to(ROOT/'working'/CORE).as_posix():p for p in (ROOT/'working'/CORE).rglob('*') if p.is_file()}
 assert set(rows)<=set(actual)
 changed=[]
 for n,p in actual.items():
  assert not p.is_symlink();data=p.read_bytes();before=rows.get(n)
  if before and len(data)==before['bytes'] and sha(data)==before['sha256']:continue
  assert n in ALLOWED,'Unreviewed file: '+n
  changed.append(n)
 assert set(changed)==ALLOWED,(set(changed)^ALLOWED)
 files={}
 for n in sorted(changed,key=lambda n:(n not in rows,n)):
  data=actual[n].read_bytes();files[CORE+n]={'before':rows.get(n,{}).get('sha256'),'after':sha(data),'bytes':len(data)}
 before_http=(PREVIOUS/'working'/HTTP).read_bytes();after_http=(ROOT/'working'/HTTP).read_bytes()
 assert sha(before_http)==previous['httpEntrySHA256']
 evidence=json.loads((ROOT/'evidence/client-integration-claude.json').read_text())
 final=evidence['http'];client={'oldNamespace':previous['client']['namespace'],'namespace':final['namespace'],'oldName':previous['client']['name'],'name':final['name']}
 client['generatedNames']=sorted(n[len('generated/client/'):] for n in changed if n.startswith('generated/client/'))
 assert sha(after_http)==final['generatedSha256']
 rewritten=before_http.replace(client['oldNamespace'].encode(),client['namespace'].encode()).replace(client['oldName'].encode(),client['name'].encode())
 assert rewritten==after_http,'R86 → R88 HTTP must only rewrite immutable references'
 assert after_http.replace(client['namespace'].encode(),client['oldNamespace'].encode()).replace(client['name'].encode(),client['oldName'].encode())==before_http
 assert (ROOT/'working'/INGRESS).read_bytes()==(PREVIOUS/'working'/INGRESS).read_bytes()
 files[HTTP]={'before':sha(before_http),'after':sha(after_http),'bytes':len(after_http)}
 plan={k:previous[k] for k in ('protocol','databaseChanges','databaseSchemaChanges','databaseScope','accountsChanges','nativeBaseline','operationsCanonicalSHA256','runtime')}
 plan.update(version='R89_GAMEPLAY',sourceVersion='R86_GAMEPLAY',clientChanges=True,client=client,httpEntrySHA256=sha(before_http),baseCoreSHA256=BASE_CORE,baseCoreRows=sorted(rows.values(),key=lambda r:tuple(r['path'].split('/'))),files=files)
 with zipfile.ZipFile(TEMPLATE/'artifacts/CORE511_R85_TOPLU.zip') as z:
  modules={n:z.read('modules/'+n) for n in MODULES};bootstrap=z.read('__main__.py')
 text=versions(modules['installer.py'].decode())
 constants={'CLIENT_OLD_NAMESPACE':client['oldNamespace'],'CLIENT_NAMESPACE':client['namespace'],'CLIENT_OLD_NAME':client['oldName'],'CLIENT_NAME':client['name'],'SOURCE_CORE_SHA256':BASE_CORE,'R86_HTTP_SHA256':sha(before_http)}
 for k,v in constants.items():text,count=re.subn(r'^'+k+r'=.*$',k+'='+repr(v),text,flags=re.M);assert count==1,k
 start=text.index('PRODUCTION_PATHS=');end=text.index('NATIVE_TIMING=',start)
 text=text[:start]+'PRODUCTION_PATHS='+repr(tuple(files))+'\nNEW_PRODUCTION_PATHS=frozenset('+repr(sorted(n for n,m in files.items() if m['before'] is None))+')\nCLIENT_GENERATED_NAMES='+repr(client['generatedNames'])+'\n'+text[end:]
 text=once(text,"'generatedNames':[CLIENT_NAME]","'generatedNames':CLIENT_GENERATED_NAMES")
 modules['installer.py']=text.encode()
 modules['ingress_stage.py']=preserved_ingress.replace(b'R86 mevcut R85',b'R89 mevcut R86')
 for n in ('runtime_stage.py','inplace_stage.py'):modules[n]=versions(modules[n].decode()).encode()
 for n,data in modules.items():write(PACKAGE/'modules'/n,data)
 write(PACKAGE/'__main__.py',versions(bootstrap.decode()).encode())
 for n in files:write(PACKAGE/'payload'/n,(ROOT/'working'/n).read_bytes())
 write(PACKAGE/'update.json',encoded(plan));write(PACKAGE/'client-plan.json',encoded(client));write(PACKAGE/'RUNTIME.json',runtime)
 target=dict(rows)
 for n,m in files.items():
  if n.startswith(CORE):short=n[len(CORE):];target[short]={'path':short,'bytes':m['bytes'],'sha256':m['after']}
 assert set(target)==set(actual)
 proof={'sourceCommit':'2ede3bf7c7f5f4c37f68e72195949c3b8b4fc771','sourceCoreSHA256':BASE_CORE,'targetCoreSHA256':identity(target.values()),'files':files,'productionFiles':len(files),'generatedNames':client['generatedNames'],'httpExactRewrite':True,'performanceAccepted':False,'userRequestedInstallationAsIs':False}
 write(ROOT/'evidence/package-plan.json',encoded(proof));print(json.dumps({k:v for k,v in proof.items() if k!='files'},ensure_ascii=False,indent=2))
if __name__=='__main__':
 if not __debug__:raise RuntimeError('Assertions required')
 stage()
