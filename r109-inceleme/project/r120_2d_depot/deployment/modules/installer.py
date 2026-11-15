"""R118/R119 to R120: depot, 2D alias and origins; no player data migration."""
import argparse,hashlib,json,os,re,shutil,stat,subprocess,sys,time,uuid,zipfile
import asset_graph,runtime_imports,site_delta,domain_move,web_prepare
from pathlib import Path
from types import SimpleNamespace
import inplace_stage as inplace
import source_identity,readiness,r63_support as identity
from storage import atomic,descriptor,digest,encoded,read,require,sync_dir,lock
STATE=Path('/var/lib/core511/state.json');CONTROL=STATE.parent/'r102-admin-fix';ACTIVE=CONTROL/'active.json'
RELEASES=Path('/opt/core511/releases');SYSTEMD=Path('/etc/systemd/system');HERE=Path(__file__).resolve().parent
VERSION='R120_2D_DEPOT4';POLICY={'keep':1,'scope':'changed-code-only'};SCOPE='none';UNITS=('coreoflife-r1.service','coreoflife-r2.service','coreoflife-accounts.service','coreoflife-rt-r1.service','coreoflife-rt-r2.service')
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
 atomic(p,data,row.get('mode',0o644),(row['uid'],row['gid']) if row['exists'] else None)

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

def client_asset_paths(text,namespace):
 # Material icons intentionally keep an extensionless ../assets/ stem; the
 # game's icon resolver converts it to the final /assets/<namespace>/*.webp.
 # Preserve that relative stem and never prefix an already namespaced path.
 return re.sub(r'''(["'`])((?:\.\./|/)?)assets/(?!core511-[0-9a-f]{16}/)''',lambda m:m[1]+m[2]+'assets/'+namespace+'/',text)


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
   if updated is not None:updated=domain_move.urls(updated)
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
   text=domain_move.urls(client_asset_paths(text,plan['namespace']))
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
 require(plan['databaseChanges'] is False and plan['databaseSchemaChanges'] is False and plan['databaseScope']==SCOPE,'Şema kapsamı farklı')
 require(plan['backupPolicy']==POLICY,'Yedek kapsamı farklı')
 # Fixed release review: the contract binds every source and resulting byte.
 from code_contract import PLAN_SHA256
 public={k:v for k,v in plan.items() if not k.startswith('_')}
 require(hashlib.sha256(encoded(public)).hexdigest()==PLAN_SHA256,'İncelenmiş kod paketi farklı')

def preflight(live,z,plan,apply=False,restored_pending=False):
 validate_plan(plan)
 web_prepare.require_public_ready()
 require(not ACTIVE.exists(),'Yarım güncelleme var; aynı paketle --recover çalıştırın')
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
 plan['_domainPrepared']=domain_move.prepare(live,z,plan,run)
 result=payload(live,z,plan)+asset_updates(live,z,plan)
 if apply:
  p=central(live,'r1');require(p['phase']=='maintenance' and p.get('deadlineMs',0)<=int(time.time()*1000),'Ana panelden bakımı başlatıp 10 saniyelik geri sayımı tamamlayın')
 return result

def validate_record(j,completed=False):
 directory=Path(j['directory']);root=Path(j['root'])
 require(directory.parent==CONTROL and directory.name.startswith('install-') and not directory.is_symlink() and root.parent==RELEASES,'Geri dönüş kaydı kapsamı farklı')
 require(j['version']==VERSION and j['rollbackScope']=='single-previous-version-v1' and j['backupPolicy']==POLICY and j['databaseScope']==SCOPE,'Geri dönüş sözleşmesi farklı')
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

def rollback(live,j):
 validate_record(j);guards(j,True);stop_all()
 inplace.restore(live.root,Path(j['directory']),j,lambda:persist(j));inplace.cleanup(live.root,j,lambda:persist(j))
 for row in reversed(list(j['external'].values())):restore_file(row)
 restore_file(j['beforeState']);domain_move.restore(j,run);guards(j,False);start_all(live.manifest)
 readiness.wait(j['manifest'],j['identity']['version'],say=say);restore_gates(live,j)
 j['phase']='rolled-back';persist(j);atomic(Path(j['directory'])/'result.json',encoded(j));ACTIVE.unlink();sync_dir(CONTROL)
 say('Önceki oyun ve alan adı ayarları geri yüklendi; oyuncu verileri geri alınmadı.')

def recover(live,j):
 require(j.get('version')==VERSION,'Yarım güncelleme yalnız kendi sürümünün aynı paketiyle kurtarılabilir')
 if j['phase'] in ('prepared','stopped','described','backed-up') and not j.get('stage'):
  for row in j['files']:require(inplace.fingerprint(live.root,row['path'])==row['before'],'Hazırlık sırasında kod değişmiş')
  guards(j,False);start_all(live.manifest);readiness.wait(j['manifest'],j['identity']['version'],say=say);restore_gates(live,j)
  j['phase']='preparation-failed';persist(j);atomic(Path(j['directory'])/'result.json',encoded(j));ACTIVE.unlink();sync_dir(CONTROL)
 else:rollback(live,j)

def prune(j,health):
 require(set(health)=={'r1','r2'} and all(h.get('royalChampions')=='R118_ROYAL1' and h.get('royalReadyR118') is True and h.get('hookRate')=='R117_HOOK10' and h.get('azrailHookChance')==10 and h.get('admissionTransfer')=='R116_ADMISSION_TRANSFER1' and h.get('sharedScope')=='R115_SHARED_SCOPE1' and h.get('runeForum')=='R114_RUNE_FORUM1' and h.get('engineRework')=='R113_ENGINE1' and h.get('engineReadyR113') is True and len(h['channelProcesses']['channels'])==4 and all(c['ready'] for c in h['channelProcesses']['channels']) for h in health.values()),'İki sunucu ve sekiz kanal doğrulanmadan temizlik yapılamaz')
 require(not ACTIVE.exists(),'Etkin kurulumda temizlik yapılamaz');validate_record(j,completed=True);resume_prune(j)
 # Prior R113/schema archives belong to their own recovery contracts. Retain
 # them; only validated, superseded R120 code-only journals can be pruned here.
 removed=0
 for directory in sorted(CONTROL.glob('install-*')):
  if str(directory)==j['directory'] or directory.is_symlink() or not directory.is_dir() or not(directory/'result.json').is_file():continue
  old=read(directory/'result.json')
  if old.get('version')!=VERSION or old.get('phase') not in ('complete','rolled-back') or old.get('root')!=j['root'] or old.get('databases')!=j['databases'] or old.get('databaseScope')!=SCOPE:continue
  if set(p.name for p in directory.iterdir())-{'result.json','code','retention.json'}:continue
  folder=directory/'code';expected={r['backup']:r['before'] for r in old['files'] if r['backup']}
  if not folder.is_dir() or folder.is_symlink() or set(p.name for p in folder.iterdir())!=set(expected):continue
  if any((folder/n).is_symlink() or digest(folder/n)!=h for n,h in expected.items()):continue
  if any(p.is_symlink() for p in directory.rglob('*')):continue
  files={str(p.relative_to(directory)):digest(p) for p in directory.rglob('*') if p.is_file()}
  atomic(CONTROL/'prune-intent.json',encoded({'source':directory.name,'current':j['directory'],'currentSHA256':digest(Path(j['directory'])/'result.json'),'device':directory.stat().st_dev,'inode':directory.stat().st_ino,'files':files}));resume_prune(j);removed+=1
 atomic(Path(j['directory'])/'retention.json',encoded({'keep':1,'removed':removed,'historicalRecoveryArchives':'retained'}));return removed

def apply(live,z,plan,prepared=None):
 changes=preflight(live,z,plan,apply=True) if prepared is None else prepared
 CONTROL.mkdir(mode=0o700,parents=True,exist_ok=True)
 directory=CONTROL/('install-'+time.strftime('%Y%m%dT%H%M%S')+'-'+uuid.uuid4().hex[:6]);directory.mkdir(mode=0o700)
 j={'version':VERSION,'root':str(live.root),'directory':str(directory),'phase':'prepared','rollbackScope':'single-previous-version-v1','backupPolicy':plan['backupPolicy'],'databaseScope':SCOPE,'beforeState':record_file(STATE),'identity':plan['_resolvedIdentity'],'manifest':live.manifest,'databases':live.databases,'files':[],'external':{},'externalAfter':{},'policies':{}}
 persist(j)
 try:
  for rid in ('r1','r2'):j['policies'][rid]=central(live,rid);persist(j);central(live,rid,'gate',j['policies'][rid])
  guards(j,True);stop_all();j['phase']='stopped';persist(j)
  say('Yalnız değişen oyun kodu yedekleniyor; oyuncu veritabanı taraması ve sıkıştırma yok.')
  j['files'],j['createdDirectories']=inplace.describe(live.root,changes);j['phase']='described';persist(j)
  inplace.store_backups(live.root,directory,j['files']);j['phase']='backed-up';persist(j)
  inplace.apply(live.root,directory,j,changes,lambda:persist(j));inplace.cleanup(live.root,j,lambda:persist(j));j['phase']='code';persist(j)
  site_delta.apply(plan['_siteChanges'],j,external)
  domain_move.apply(plan['_domainPrepared'],j,external,persist,run)
  release_manifest(live,j);source_identity.verify_target(live.root,j['identity']);check_access(live,plan)
  after=json.loads(json.dumps(live.state));after['candidate']=j['identity']['targetCore'];after['r64Deployment']={**after.get('r64Deployment',{}),'version':VERSION,'accountsRoot':str(live.root)};after['r102AdminFix']={'version':VERSION,'journal':str(directory),'namespace':plan['namespace']};j['afterStateSHA256']=hashlib.sha256(encoded(after)).hexdigest();persist(j);atomic(STATE,encoded(after));j['phase']='starting';persist(j)
  guards(j,False);start_all(live.manifest);health=readiness.wait(live.manifest,say=say);j['domainHealth']=domain_move.health(j);persist(j)
  restore_gates(live,j)
  j['phase']='complete';persist(j);atomic(directory/'result.json',encoded(j));ACTIVE.unlink();sync_dir(CONTROL)
 except BaseException as e:
  say('Yama durdu: '+str(e)[:300]);recover(live,j);raise
 try:prune(j,health)
 except Exception as e:say('Kod yedeği temizliği ertelendi; oyun hazır: '+str(e)[:180])
 say('R120 TAMAMLANDI. Efsane ve Akademi depo düzeltildi, 2D alan adı yerel HTTPS üzerinden doğrulandı; sekiz kanal hazır. Bakım ayarın korundu.')

def main(archive):
 p=argparse.ArgumentParser(description='R120 depo, canavar animasyonları ve 2D alan adı geçişi (tam R118/R119 üzerine)');g=p.add_mutually_exclusive_group(required=True)
 for name in ('check','apply','recover','rollback','cleanup','status','check-web','prepare-web','rollback-web','check-public'):g.add_argument('--'+name,action='store_true')
 args=p.parse_args();require(os.geteuid()==0,'VDS üzerinde root ile çalıştırın')
 if args.status:say(json.dumps({'pending':ACTIVE.exists(),'adminFix':read(STATE).get('r102AdminFix')},ensure_ascii=False));return
 with lock(STATE.parent/'r23-backups/install.lock'):
  live=discover()
  if args.check_public:web_prepare.check_public(say);return
  if args.check_web or args.prepare_web or args.rollback_web:
   require(not ACTIVE.exists(),'Önce bekleyen oyun güncellemesini --recover ile tamamlayın')
   require(not(CONTROL/'prune-intent.json').exists(),'Yarım yedek temizliği var; önce kendi paketiyle --cleanup çalıştırın')
   for other in ('r102-updates/active.json','r101/active.json','r64-updates/active.json','launch-reset-r63/active.json'):
    require(not(STATE.parent/other).exists(),'Başka kurulum devam ediyor; web ayarı değiştirilmedi')
   with zipfile.ZipFile(archive) as z:
    plan=json.loads(z.read('plan.json'));validate_plan(plan);source_identity.resolve(live,plan)
   if args.check_web:
    web_prepare.preflight(run);say('WEB ÖN KONTROLÜ GEÇTİ. Ayar değişmedi. Ana panelden bakımı başlatıp geri sayımı bekleyin; ardından --prepare-web çalıştırın.');return
   policy=central(live,'r1')
   require(policy['phase']=='maintenance' and policy.get('deadlineMs',0)<=int(time.time()*1000),'Caddy yenilemesi bağlantıları yeniden kurabilir. Ana panelden bakımı başlatıp geri sayımı bekleyin.')
   if args.rollback_web:web_prepare.rollback(say)
   else:web_prepare.prepare(run,say)
   return
  if args.recover:
   require(ACTIVE.exists(),'Bekleyen birleşik güncelleme yaması yok');j=read(ACTIVE)
   recover(live,j)
   return
  if args.rollback or args.cleanup:
   require(not ACTIVE.exists(),'Önce yarım yama kurtarılmalı');j=read(Path(live.state['r102AdminFix']['journal'])/'result.json');validate_record(j,completed=True)
   if args.cleanup:prune(j,readiness.wait(live.manifest,say=say));return
   require(central(live,'r1')['phase']=='maintenance','Geri dönüş için ana panelden bakımı başlatın');j['phase']='rollback-requested';j['policies']={};persist(j)
   for rid in ('r1','r2'):j['policies'][rid]=central(live,rid);persist(j);central(live,rid,'gate',j['policies'][rid])
   rollback(live,j);return
  if live.state.get('r64Deployment',{}).get('version')==VERSION:
   j=read(Path(live.state['r102AdminFix']['journal'])/'result.json');validate_record(j,completed=True);readiness.wait(live.manifest,say=say);say('R120 zaten kurulu; iki sunucu hazır.');return
  with zipfile.ZipFile(archive) as z:
   plan=json.loads(z.read('plan.json'));validate_plan(plan)
   changes=preflight(live,z,plan,apply=args.apply)
   if args.check:say('R120 iki sunucu ön kontrolü geçti. Kurulum yapılmadı.');return
   apply(live,z,plan,prepared=changes)
