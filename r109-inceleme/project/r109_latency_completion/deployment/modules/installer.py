"""R102 combined HUD, tower, shop and equipment update. No SQLite reads, migrations or data backups."""
import argparse,hashlib,json,os,re,shutil,stat,subprocess,sys,time,uuid,zipfile
import asset_graph,runtime_imports,site_delta
from pathlib import Path
from types import SimpleNamespace
import inplace_stage as inplace
import source_identity,readiness,r63_support as identity
from storage import atomic,descriptor,digest,encoded,read,require,sync_dir,lock
STATE=Path('/var/lib/core511/state.json');CONTROL=STATE.parent/'r102-admin-fix';ACTIVE=CONTROL/'active.json'
RELEASES=Path('/opt/core511/releases');SYSTEMD=Path('/etc/systemd/system');HERE=Path(__file__).resolve().parent
VERSION='R109_LATENCY2';UNITS=('coreoflife-r1.service','coreoflife-r2.service','coreoflife-accounts.service','coreoflife-rt-r1.service','coreoflife-rt-r2.service')
START=('coreoflife-accounts.service','coreoflife-rt-r1.service','coreoflife-rt-r2.service','coreoflife-r1.service','coreoflife-r2.service')
def say(s):print(s,flush=True)

def run(args,timeout=90):
 p=subprocess.run([str(a) for a in args],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout)
 require(p.returncode==0,'Komut tamamlanamadı: '+Path(str(args[0])).name+'; '+p.stderr[-500:]);return p.stdout.strip()

def prop(unit,key):return run(['systemctl','show',unit,'--property='+key,'--value'])

def service(unit,action):require(unit in UNITS and action in ('start','stop','reset-failed'),'Servis kapsamı farklı');run(['systemctl',action,unit])

def reload():run(['systemctl','daemon-reload'])

def stop_all():
 for unit in reversed(START):service(unit,'stop')
 require(all(prop(u,'MainPID')=='0' for u in UNITS),'Oyun süreçleri kapanmadı')

def start_all(manifest=None):
 for unit in START:
  service(unit,'reset-failed');service(unit,'start')
  if unit=='coreoflife-accounts.service' and manifest is not None:
   end=time.monotonic()+30
   while True:
    try:
     if identity.local(manifest['authPort'],'/api/auth/me').get('authenticated') is False:break
    except Exception:pass
    require(time.monotonic()<end,'Hesap servisi 30 saniyede hazır olmadı; oyunlar henüz başlatılmadı')
    time.sleep(.25)

def record_file(p):
 p=Path(p);require(not p.is_symlink(),'Ayar yolu sembolik bağ')
 if not p.exists():return {'path':str(p),'exists':False}
 s=p.stat();require(stat.S_ISREG(s.st_mode),'Ayar normal dosya olmalı')
 return {'path':str(p),'exists':True,'data':p.read_bytes().hex(),'sha256':digest(p),'mode':stat.S_IMODE(s.st_mode),'uid':s.st_uid,'gid':s.st_gid}

def restore_file(row):
 p=Path(row['path']);require(not p.is_symlink(),'Geri dönüş yolu değişti')
 if row['exists']:atomic(p,bytes.fromhex(row['data']),row['mode'],(row['uid'],row['gid']))
 elif p.exists():p.unlink();sync_dir(p.parent)

def persist(j):atomic(ACTIVE,encoded(j))

def external(j,p,data):
 p=Path(p);require(str(p) not in j['external'],'Tekrarlanan ayar')
 row=record_file(p);j['external'][str(p)]=row;j['externalAfter'][str(p)]=hashlib.sha256(data).hexdigest();persist(j)
 atomic(p,data,row.get('mode',0o644),(row.get('uid',0),row.get('gid',0)))

def discover():
 state=read(STATE);require(state.get('installed') and state.get('r101'),'Kurulu iki sunuculu R101 gerekli')
 root=Path(state['releaseRoot']).resolve();require(root.parent==RELEASES,'Sürüm dizini farklı')
 prior=state['prior'];require(prior['gameUnit']=='coreoflife-r1.service' and prior['accountsUnit']=='coreoflife-accounts.service','Servis bağı farklı')
 gf=Path(prior['newGameConfigFile']).resolve();af=Path(prior.get('newAccountsConfigFile') or prior['accountsConfigFile']).resolve();g=read(gf);ac=read(af);manifest=read(g['realm']['manifestFile'])
 require([r['id'] for r in manifest['realms']]==['r1','r2'] and manifest['primaryRealmId']=='r1','İki sunucunun manifesti farklı')
 r2file=Path(state['r101']['realm2Config']);configs={'r1':gf,'r2':r2file};databases={}
 for realm in manifest['realms']:
  cfg=read(configs[realm['id']]);db=Path(realm['database']).resolve()
  require(cfg['database']==str(db) and cfg['realm']['id']==realm['id'] and cfg['realm']['dbIdentity']==realm['dbIdentity'] and cfg['delivery511']['releaseRoot']==str(root),'Sunucu yapılandırması farklı')
  databases[realm['id']]=descriptor(db)
 require(databases['r1']['device']==prior['databaseIdentity']['dev'] and databases['r1']['inode']==prior['databaseIdentity']['ino'],'Ana veritabanı kimliği değişti')
 require(Path(state.get('r64Deployment',{}).get('accountsRoot',root)).resolve()==root,'Hesap ve oyun kodu ortak sürümde olmalı')
 require(ac['database']==manifest['accountsDatabase'],'Hesap veritabanı bağı farklı')
 return SimpleNamespace(root=root,state=state,node=root/'bin/node',gf=gf,af=af,game=g,accounts=ac,manifest=manifest,configs=configs,databases=databases)

def payload(live,z,plan):
 result=[]
 for name,row in plan['files'].items():
  before=inplace.fingerprint(live.root,name);require(before in row['before'],'Kurulu dosya farklı: '+name)
  data=z.read('payload/'+name);require(hashlib.sha256(data).hexdigest()==row['after'] and len(data)==row['bytes'],'Paket verisi bozuk')
  if before!=row['after']:result.append((name,{**row,'before':before},data))
 binding=plan['_resolvedIdentity'];data=source_identity.operations_update(live.root,binding)
 result.append((source_identity.OPS,{'before':binding['operationsBefore'],'after':binding['operationsAfter'],'bytes':len(data)},data));return result

def asset_updates(live,z,plan):
 """Only new namespace files. Identical resources are inode-shared, not copied."""
 old=plan['sources'][plan['_resolvedIdentity']['version']];prefix='http-runtime/dist-vds/client/assets/';source=inplace.checked_path(live.root,prefix+old['namespace']);target=prefix+plan['namespace']
 if old['namespace']==plan['namespace']:
  require(not plan['clientNew'] and all(plan[k]==old[k] for k in ('game','admin','portal')),'Kod yaması istemci kimliğini değiştiremez')
  asset_graph.validate_existing(live,plan)
  return []
 require(source.is_dir() and not inplace.checked_path(live.root,target).exists(),'İstemci varlık dizini farklı')
 manifest={r['path']:r for r in read(live.root/'release-manifest.json')['files']}
 replacements={old['namespace']:plan['namespace'],old['game']:plan['game'],old['admin']:plan['admin'],old['portal']:plan['portal'],'https://discord.gg/sCbQh9D8r':'https://discord.gg/pBywtjhTN'}
 result=[];skip={old['game'],old['admin'],old['portal']};new=set(plan['clientNew'])
 for parent,dirs,files in os.walk(source,followlinks=False):
  for n in dirs:require(not (Path(parent)/n).is_symlink(),'Varlık klasörü sembolik bağ')
  for n in sorted(files):
   f=Path(parent)/n;require(not f.is_symlink() and f.is_file(),'Varlık dosyası değişmiş')
   relative=f.relative_to(source).as_posix()
   if relative in skip or relative in new:continue
   src=f.relative_to(live.root).as_posix();row=manifest.get(src);require(row is not None and row['bytes']==f.stat().st_size and digest(f)==row['sha256'],'Varlık kaynağı manifestle eşleşmiyor: '+relative)
   text=f.read_text() if f.suffix in ('.js','.css') else None;updated=text
   if text is not None:
    for a,b in replacements.items():updated=updated.replace(a,b)
   if updated is not None and updated!=text:
    data=updated.encode();meta={'before':None,'after':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
   else:data=None;meta={'before':None,'after':row['sha256'],'bytes':row['bytes'],'linkSource':src}
   result.append((target+'/'+relative,meta,data))
 for n in plan['clientNew']:
  src=source_identity.CORE+'generated/client/'+n;row=plan['files'].get(src)
  data=z.read('payload/'+src) if row else inplace.checked_path(live.root,src).read_bytes()
  if n.endswith(('.js','.css')):
   text=data.decode('utf-8')
   for a,b in replacements.items():text=text.replace(a,b)
   # Both absolute media URLs and Vite's relative preload array need the namespace.
   text=re.sub(r'''(["'`])(/?)assets/(?!core511-[0-9a-f]{16}/)''',lambda m:m[1]+m[2]+'assets/'+plan['namespace']+'/',text)
   data=text.encode()
  result.append((target+'/'+n,{'before':None,'after':hashlib.sha256(data).hexdigest(),'bytes':len(data)},data))
 # The installed R101 has a separate accounts client tree whose unchanged
 # assets are hardlinked to HTTP. Update both namespaces. Also accept a shared
 # client-directory symlink without replacing it. Never assume those layouts
 # are interchangeable just because their files happen to have the same inode.
 account=live.root/'accounts-runtime/dist-vds/client'
 if account.resolve()!=(live.root/'http-runtime/dist-vds/client').resolve():
  require(account.is_dir() and not account.is_symlink(),'Hesap istemci dizini farklı')
  prior_assets=inplace.checked_path(live.root,'accounts-runtime/dist-vds/client/assets/'+old['namespace']);require(prior_assets.is_dir(),'Hesap istemci kaynak varlıkları yok')
  for name,meta,data in list(result):
   suffix=name[len(target)+1:];source_account=prior_assets/suffix;source_http=source/suffix
   if suffix not in new and source_account.exists():
    require(not source_account.is_symlink() and source_account.is_file(),'Hesap varlık kaynağı farklı')
    a,b=source_account.stat(),source_http.stat()
    require((a.st_dev,a.st_ino)==(b.st_dev,b.st_ino) or digest(source_account)==digest(source_http),'Hesap ve oyun eski varlıkları farklı')
   result.append(('accounts-runtime/dist-vds/client/assets/'+plan['namespace']+'/'+suffix,dict(meta),data))
 for runtime in ('http-runtime','accounts-runtime'):
  for name in ('server/__vite_rsc_assets_manifest.js','server/ssr/__vite_rsc_assets_manifest.js'):
   relative=runtime+'/dist-vds/'+name;p=inplace.checked_path(live.root,relative)
   if not p.exists():continue
   data=p.read_text()
   for a,b in replacements.items():data=data.replace(a,b)
   value=data.encode();before=digest(p);after=hashlib.sha256(value).hexdigest()
   if before!=after:result.append((relative,{'before':before,'after':after,'bytes':len(value)},value))
 asset_graph.validate(live,plan,result)
 return result

def central(live,rid,action='snapshot',snapshot=None):
 return json.loads(run([live.node,HERE/'central.mjs',live.root,live.configs[rid],live.af,action,json.dumps(snapshot) if snapshot else '']))

def guard_bytes():return ('[Unit]\nConditionPathExists=!'+str(CONTROL/'blocked')+'\n').encode()

def guards(j,enable):
 for unit in UNITS:
  p=SYSTEMD/(unit+'.d')/'zz-r102-admin-guard.conf'
  if enable:
   require(not p.exists() or digest(p)==hashlib.sha256(guard_bytes()).hexdigest(),'Koruma dosyası farklı')
   atomic(p,guard_bytes(),0o644)
  elif p.exists():require(not p.is_symlink() and p.read_bytes()==guard_bytes(),'Koruma dosyası değişmiş');p.unlink();sync_dir(p.parent)
 if enable:atomic(CONTROL/'blocked',b'R102_ADMIN1\n')
 else:(CONTROL/'blocked').unlink(missing_ok=True)
 reload()

def check_access(live,plan):
 common=[live.root/source_identity.CORE/'generated/client'/plan['game'],live.root/'http-runtime/dist-vds/client/assets'/plan['namespace'],Path(live.game['realm']['manifestFile'])]
 script="import fs from 'node:fs';for(const p of process.argv.slice(1))fs.accessSync(p,fs.constants.R_OK|(fs.statSync(p).isDirectory()?fs.constants.X_OK:0));"
 for rid,file in live.configs.items():run(['runuser','-u',prop('coreoflife-'+rid+'.service','User') or 'root','--',live.node,'--input-type=module','-e',script,file,*common])
 run(['runuser','-u',prop('coreoflife-accounts.service','User') or 'root','--',live.node,'--input-type=module','-e',script,live.af,live.root/'accounts-runtime/dist-vds/client/assets'/plan['namespace']/plan['portal']])

def release_manifest(live,j):
 m=read(live.root/'release-manifest.json');rows={r['path']:r for r in m['files']}
 for r in j['files']:rows[r['path']]={'path':r['path'],'bytes':r['bytes'],'sha256':r['after']}
 m['files']=sorted(rows.values(),key=lambda r:r['path']);m['runtimeSha256']=j['identity']['targetCore'];m['r102AdminFix']=VERSION
 external(j,live.root/'release-manifest.json',encoded(m))

def restore_gates(live,j):
 for rid,p in j.get('policies',{}).items():
  result=central(live,rid,'restore',p)
  if result.get('restoreDeferred'):
   j.setdefault('deferredPolicies',{})[rid]=result
   persist(j);say(rid+': Dünya açılış kontrolü nedeniyle bakım korundu. Dünya canını panelden inceleyin; dünya sıfırlanmadı.')

def resume_prune(j):
 intent_file=CONTROL/'prune-intent.json'
 if not intent_file.exists():return
 v=read(intent_file);require(v['current']==j['directory'] and v['currentSHA256']==digest(Path(j['directory'])/'result.json'),'Temizlik başka tamamlanmış yedeğe bağlı')
 source=CONTROL/v['source'];tomb=CONTROL/('.retired-'+v['source']);require(source.parent==CONTROL and source.name.startswith('install-') and not source.is_symlink() and not tomb.is_symlink(),'Temizlik yolu farklı')
 require(not(source.exists() and tomb.exists()),'Temizlik kaynakları çakışıyor')
 folder=tomb if tomb.exists() else source
 if folder.exists():
  st=folder.stat();require((st.st_dev,st.st_ino)==(v['device'],v['inode']),'Temizlik dizin kimliği farklı')
  for p in folder.rglob('*'):
   require(not p.is_symlink(),'Temizlik dosyası sembolik bağ')
   if p.is_dir():require(p.relative_to(folder).as_posix()=='code','Temizlik alt dizini farklı');continue
   n=p.relative_to(folder).as_posix();require(n in v['files'] and digest(p)==v['files'][n],'Eski yedek dosyası dışarıdan değişmiş')
  if folder==source:os.rename(source,tomb);sync_dir(CONTROL)
  # Unlink only validated files. A power cut can leave a subset; the same intent
  # accepts missing files but never accepts a replacement inode or unknown data.
  for p in sorted(tomb.rglob('*'),key=lambda p:len(p.parts),reverse=True):
   if p.is_file():p.unlink()
   elif p.is_dir():p.rmdir()
  tomb.rmdir();sync_dir(CONTROL)
 intent_file.unlink();sync_dir(CONTROL)

def validate_plan(plan):
 require(plan['version']==VERSION and plan['realms']==['r1','r2'],'Yama kapsamı farklı')
 require(plan['databaseChanges'] is False and plan['databaseSchemaChanges'] is False and plan['databaseScope']=='none','Yama veri değişikliği içeremez')
 require(plan['backupPolicy']=={'keep':1,'scope':'changed-code-only'},'Yedek kapsamı farklı')
 # Fixed release review: the contract binds every source and resulting byte.
 from code_contract import PLAN_SHA256
 public={k:v for k,v in plan.items() if not k.startswith('_')}
 require(hashlib.sha256(encoded(public)).hexdigest()==PLAN_SHA256,'İncelenmiş kod paketi farklı')

def preflight(live,z,plan,apply=False,restored_pending=False):
 validate_plan(plan)
 if ACTIVE.exists():
  require(restored_pending,'Yarım birleşik güncelleme yaması var; aynı paketle --recover çalıştırın')
  validate_restored_legacy(live,read(ACTIVE))
 require(not(CONTROL/'prune-intent.json').exists(),'Yarım yedek temizliği var; --cleanup çalıştırın')
 for p in ('r102-updates/active.json','r101/active.json','r64-updates/active.json','launch-reset-r63/active.json'):
  require(not(STATE.parent/p).exists(),'Başka kurulum devam ediyor')
 require(live.state.get('r102',{}).get('version')=='R102_CONTENT','Önce kurulmuş R102 gerekli')
 failures=[u for u in UNITS if prop(u,'ActiveState')!='active'];require(not failures,'Çalışmayan servis: '+', '.join(failures))
 for rid,file in live.configs.items():
  pid=int(prop('coreoflife-'+rid+'.service','MainPID'));require(pid>1,'Oyun PID bulunamadı')
  args=Path('/proc',str(pid),'cmdline').read_bytes().split(b'\0');require(str(live.root/'core511-source/scripts/delivery511/runtime-entry.mjs').encode() in args,'Çalışan kod dizini farklı')
  env=dict(x.split(b'=',1) for x in Path('/proc',str(pid),'environ').read_bytes().split(b'\0') if b'=' in x);require(env.get(b'CORE_CONFIG_FILE')==str(file).encode(),'Çalışan ayar dosyası farklı')
 plan['_resolvedIdentity']=source_identity.resolve(live,plan)
 runtime_imports.validate(live.root,plan,z)
 needed=sum(r['bytes'] for r in plan['files'].values())*3+512*1024**2;require(shutil.disk_usage(live.root).free>needed,'Kod yedeği için boş alan yetersiz')
 plan['_siteChanges']=site_delta.changes(z,plan)
 result=payload(live,z,plan)+asset_updates(live,z,plan)
 if apply:
  p=central(live,'r1');require(p['phase']=='maintenance' and p.get('deadlineMs',0)<=int(time.time()*1000),'Ana panelden bakımı başlatıp 10 saniyelik geri sayımı tamamlayın')
 return result

def validate_record(j,completed=False,legacy=False):
 directory=Path(j['directory']);root=Path(j['root'])
 require(directory.parent==CONTROL and directory.name.startswith('install-') and not directory.is_symlink() and root.parent==RELEASES,'Geri dönüş kaydı kapsamı farklı')
 require((j['version']==VERSION or legacy and j['version']=='R102_COMPLETE2') and j['rollbackScope']=='single-previous-version-v1' and j['backupPolicy']=={'keep':1,'scope':'changed-code-only'} and j['databaseScope']=='none','Geri dönüş sözleşmesi farklı')
 for row in j['databases'].values():require(descriptor(row['path'])==row,'Veritabanı dosya kimliği farklı')
 for row in [j['beforeState'],*j['external'].values()]:
  if row['exists']:require(hashlib.sha256(bytes.fromhex(row['data'])).hexdigest()==row['sha256'],'Gömülü eski ayar bozuk')
 inplace.validate(root,directory,j['files'])
 for name,row in j['external'].items():
  p=Path(name);require(not p.is_symlink() and (digest(p) if p.exists() else None) in (row.get('sha256'),j['externalAfter'][name]),'Ayar dışarıdan değişmiş')
 require(digest(STATE) in (j['beforeState']['sha256'],j.get('afterStateSHA256')),'Durum dosyası dışarıdan değişmiş')
 if completed:
  require(j['phase']=='complete' and read(directory/'result.json')==j and digest(STATE)==j['afterStateSHA256'],'Tamamlanmış kayıt doğrulanamadı')
  for name,checksum in j['externalAfter'].items():require(digest(name)==checksum,'Güncel ayar dosyası değişmiş')
  source_identity.verify_target(root,j['identity'])
 return True

def validate_restored_legacy(live,j):
 """Only finalize the known COMPLETE2 attempt after all old bytes are back."""
 from legacy_contract import PLAN
 require(j['version']=='R102_COMPLETE2' and j['phase']=='starting','Eski kurtarma kaydı beklenen aşamada değil')
 validate_record(j,legacy=True)
 require(j['root']==str(live.root) and j['manifest']==live.manifest,'Eski kurtarma sunucuları farklı')
 before=json.loads(bytes.fromhex(j['beforeState']['data']))
 require(before.get('r64Deployment',{}).get('version')=='R102_IP_MOBILE1' and digest(STATE)==j['beforeState']['sha256'],'Önceki sürüm durumuna dönüş tamamlanmamış')
 rows=source_identity.source_rows(PLAN['sources']['R102_IP_MOBILE1']);target=source_identity.target_rows(rows,PLAN)
 inherited=j['identity'].get('inheritedSource')
 if inherited:
  require(inherited['path']==source_identity.EXTRA,'Eski kaynak eki farklı');rows[inherited['path']]=inherited;target[inherited['path']]=inherited
 require(identity.identity_from_rows(rows.values())==j['identity']['sourceCore'] and identity.identity_from_rows(target.values())==j['identity']['targetCore'],'Eski kurulum paket kimliği farklı')
 require(identity.core_identity(live.root/source_identity.CORE)==j['identity']['sourceCore'],'Eski kod tamamen geri dönmemiş')
 actual={r['path']:r for r in j['files']}
 for name,row in PLAN['files'].items():
  got=actual.get(name);require(got is not None and got['before'] in row['before'] and got['after']==row['after'] and got['bytes']==row['bytes'],'Eski paket dosya kaydı farklı: '+name)
 require(all(inplace.fingerprint(live.root,r['path'])==r['before'] for r in j['files']),'Eski kurulumda geri dönmemiş kod var')
 for row in j['external'].values():require(record_file(row['path'])==row,'Önceki dış ayar geri yüklenmemiş')
 require(digest(live.root/source_identity.OPS)==j['identity']['operationsBefore'],'Önceki kaynak kimliği geri dönmemiş')
 require(not(CONTROL/'blocked').exists() and inplace.stage_directory(live.root,j) is None,'Eski kurtarma koruması veya kod sahnesi açık')
 readiness.wait(live.manifest,'R102_IP_MOBILE1',say=say)
 return True

def finish_restored_legacy(live,j):
 validate_restored_legacy(live,j);restore_gates(live,j)
 j['phase']='rolled-back';j['recoveryCompletedBy']=VERSION;persist(j)
 atomic(Path(j['directory'])/'result.json',encoded(j));ACTIVE.unlink();sync_dir(CONTROL)
 say('Önceki başarısız kurulumun eski koda dönüşü doğrulandı; yarım kurtarma kaydı tamamlandı. Oyuncu verisi ve dünya döngüsü değiştirilmedi.')

def rollback(live,j):
 validate_record(j);guards(j,True);stop_all()
 inplace.restore(live.root,Path(j['directory']),j,lambda:persist(j));inplace.cleanup(live.root,j,lambda:persist(j))
 for row in reversed(list(j['external'].values())):restore_file(row)
 restore_file(j['beforeState']);guards(j,False);start_all(live.manifest)
 readiness.wait(j['manifest'],j['identity']['version'],say=say);restore_gates(live,j)
 j['phase']='rolled-back';persist(j);atomic(Path(j['directory'])/'result.json',encoded(j));ACTIVE.unlink();sync_dir(CONTROL)
 say('Önceki oyun kodu iki sunucuda doğrulandı; oyuncu verileri ve ayarlar geri alınmadı.')

def recover(live,j):
 if j['phase'] in ('prepared','stopped','described','backed-up') and not j.get('stage'):
  for row in j['files']:require(inplace.fingerprint(live.root,row['path'])==row['before'],'Hazırlık sırasında kod değişmiş')
  guards(j,False);start_all(live.manifest);readiness.wait(j['manifest'],j['identity']['version'],say=say);restore_gates(live,j)
  j['phase']='preparation-failed';persist(j);atomic(Path(j['directory'])/'result.json',encoded(j));ACTIVE.unlink();sync_dir(CONTROL)
 else:rollback(live,j)

def prune(j,health):
 require(set(health)=={'r1','r2'} and all(h.get('updateVersion')=='R102_CONTENT' and h.get('adminHotfix')=='R102_ADMIN1' and h.get('rankingHotfix')=='R102_RANK1' and h.get('entryHotfix')=='R102_ENTRY1' and h.get('championLabelHotfix')=='R102_LABEL1' and h.get('autoIpLimit')=='R102_AUTO_IP1' and h.get('mobileHud')=='R102_HUD_SLIM1' and h.get('realmLoad')=='R102_LOAD1' and h.get('additionsHotfix')=='R102_COMPLETE3' and h.get('skillVisuals')=='R103_SKILLS1' and h.get('browserCompatibility')=='R103_ABORT1' and h.get('autoSession')=='R103_AUTO_SESSION1' and h.get('mobileChat')=='R103_CHAT_ANCHOR2' and h.get('academyPrereg')=='R104_AKADEMI4' and h.get('readerBoot')=='R104_BOOT1' and h.get('connectionRecovery')=='R105_TOWER2' and h.get('performanceReview')=='R105_PERF1' and h.get('captchaWorker')=='R106_CAPTCHA1' and h.get('populationStability')=='R107_POPULATION1' and h.get('latencyRepair')==VERSION and len(h['channelProcesses']['channels'])==4 and all(c['ready'] for c in h['channelProcesses']['channels']) for h in health.values()),'İki sunucu ve sekiz kanal doğrulanmadan yedek temizlenemez')
 require(not ACTIVE.exists(),'Etkin kurulumda temizlik yapılamaz');validate_record(j,completed=True);resume_prune(j)
 removed=0
 for directory in sorted(CONTROL.glob('install-*')):
  if str(directory)==j['directory'] or directory.is_symlink() or not directory.is_dir():continue
  if not(directory/'result.json').is_file():continue
  old=read(directory/'result.json')
  if old.get('version') not in ('R102_ADMIN1','R102_RANK1','R102_ENTRY1','R102_LABEL1','R102_IP_MOBILE1','R102_COMPLETE2','R102_COMPLETE3','R103_SKILLS1','R103_CHAT_AUTO1','R104_AKADEMI1','R104_AKADEMI2','R104_AKADEMI3','R103_STARTUP1','R104_AKADEMI4','R105_PERF1','R106_CAPTCHA1','R107_POPULATION1',VERSION) or old.get('phase') not in ('complete','rolled-back') or old.get('root')!=j['root'] or old.get('databases')!=j['databases'] or old.get('databaseScope') not in ('none','academy-launch-settings-v1'):continue
  if set(p.name for p in directory.iterdir())-{'result.json','code','retention.json'}:continue
  folder=directory/'code';expected={r['backup']:r['before'] for r in old['files'] if r['backup']}
  if not folder.is_dir() or folder.is_symlink() or set(p.name for p in folder.iterdir())!=set(expected):continue
  if any((folder/n).is_symlink() or not(folder/n).is_file() or digest(folder/n)!=h for n,h in expected.items()):continue
  if any(p.is_symlink() for p in directory.rglob('*')):continue
  files={str(p.relative_to(directory)):digest(p) for p in directory.rglob('*') if p.is_file()}
  atomic(CONTROL/'prune-intent.json',encoded({'source':directory.name,'current':j['directory'],'currentSHA256':digest(Path(j['directory'])/'result.json'),'device':directory.stat().st_dev,'inode':directory.stat().st_ino,'files':files}));resume_prune(j);removed+=1
 atomic(Path(j['directory'])/'retention.json',encoded({'keep':1,'removed':removed}));return removed

def apply(live,z,plan,prepared=None):
 changes=preflight(live,z,plan,apply=True) if prepared is None else prepared
 CONTROL.mkdir(mode=0o700,parents=True,exist_ok=True)
 directory=CONTROL/('install-'+time.strftime('%Y%m%dT%H%M%S')+'-'+uuid.uuid4().hex[:6]);directory.mkdir(mode=0o700)
 j={'version':VERSION,'root':str(live.root),'directory':str(directory),'phase':'prepared','rollbackScope':'single-previous-version-v1','backupPolicy':plan['backupPolicy'],'databaseScope':'none','beforeState':record_file(STATE),'identity':plan['_resolvedIdentity'],'manifest':live.manifest,'databases':live.databases,'files':[],'external':{},'externalAfter':{},'policies':{}}
 persist(j)
 try:
  for rid in ('r1','r2'):j['policies'][rid]=central(live,rid);persist(j);central(live,rid,'gate',j['policies'][rid])
  guards(j,True);stop_all();j['phase']='stopped';persist(j)
  say('Yalnız değişen kod dosyaları yedekleniyor; veritabanı taraması ve sıkıştırma yok.')
  j['files'],j['createdDirectories']=inplace.describe(live.root,changes);j['phase']='described';persist(j)
  inplace.store_backups(live.root,directory,j['files']);j['phase']='backed-up';persist(j)
  inplace.apply(live.root,directory,j,changes,lambda:persist(j));inplace.cleanup(live.root,j,lambda:persist(j));j['phase']='code';persist(j)
  site_delta.apply(plan['_siteChanges'],j,external)
  release_manifest(live,j);source_identity.verify_target(live.root,j['identity']);check_access(live,plan)
  after=json.loads(json.dumps(live.state));after['candidate']=j['identity']['targetCore'];after['r64Deployment']={**after.get('r64Deployment',{}),'version':VERSION,'accountsRoot':str(live.root)};after['r102AdminFix']={'version':VERSION,'journal':str(directory),'namespace':plan['namespace']};j['afterStateSHA256']=hashlib.sha256(encoded(after)).hexdigest();persist(j);atomic(STATE,encoded(after));j['phase']='starting';persist(j)
  guards(j,False);start_all(live.manifest);health=readiness.wait(live.manifest,say=say);restore_gates(live,j)
  j['phase']='complete';persist(j);atomic(directory/'result.json',encoded(j));ACTIVE.unlink();sync_dir(CONTROL)
 except BaseException as e:
  say('Yama durdu: '+str(e)[:300]);recover(live,j);raise
 try:prune(j,health)
 except Exception as e:say('Kod yedeği temizliği ertelendi; oyun hazır: '+str(e)[:180])
 say('R109 GECİKME DÜZELTMESİ TAMAMLANDI. Efsane ve Akademi hazır. Bakım ayarın korundu.')

def main(archive):
 p=argparse.ArgumentParser(description='R109 gecikme ve R106 captcha düzeltmesi');g=p.add_mutually_exclusive_group(required=True)
 for name in ('check','apply','recover','rollback','cleanup','status'):g.add_argument('--'+name,action='store_true')
 args=p.parse_args();require(os.geteuid()==0,'VDS üzerinde root ile çalıştırın')
 if args.status:say(json.dumps({'pending':ACTIVE.exists(),'adminFix':read(STATE).get('r102AdminFix')},ensure_ascii=False));return
 with lock(STATE.parent/'r23-backups/install.lock'):
  live=discover()
  if args.recover:
   require(ACTIVE.exists(),'Bekleyen birleşik güncelleme yaması yok');j=read(ACTIVE)
   if j['version']=='R102_COMPLETE2':finish_restored_legacy(live,j)
   else:recover(live,j)
   return
  if args.rollback or args.cleanup:
   require(not ACTIVE.exists(),'Önce yarım yama kurtarılmalı');j=read(Path(live.state['r102AdminFix']['journal'])/'result.json');validate_record(j,completed=True)
   if args.cleanup:prune(j,readiness.wait(live.manifest,say=say));return
   require(central(live,'r1')['phase']=='maintenance','Geri dönüş için ana panelden bakımı başlatın');j['phase']='rollback-requested';j['policies']={};persist(j)
   for rid in ('r1','r2'):j['policies'][rid]=central(live,rid);persist(j);central(live,rid,'gate',j['policies'][rid])
   rollback(live,j);return
  if live.state.get('r64Deployment',{}).get('version')==VERSION:
   j=read(Path(live.state['r102AdminFix']['journal'])/'result.json');validate_record(j,completed=True);readiness.wait(live.manifest,say=say);say('Bu birleşik güncelleme düzeltmesi zaten kurulu ve iki sunucu hazır.');return
  with zipfile.ZipFile(archive) as z:
   plan=json.loads(z.read('plan.json'));validate_plan(plan)
   legacy=read(ACTIVE) if ACTIVE.exists() else None
   if legacy and legacy.get('version')=='R102_COMPLETE2' and args.apply:
    finish_restored_legacy(live,legacy);live=discover();legacy=None
   changes=preflight(live,z,plan,apply=args.apply,restored_pending=bool(legacy and legacy.get('version')=='R102_COMPLETE2'))
   if args.check:say('İki sunucu için captcha yaması ön kontrolü geçti. Kurulum yapılmadı.');return
   apply(live,z,plan,prepared=changes)
