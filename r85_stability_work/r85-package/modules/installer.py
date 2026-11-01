"""R85: verified in-place game update, with code-only recovery and an intact DB."""
import argparse,contextlib,hashlib,json,os,re,shlex,sqlite3,stat,subprocess,sys,time,zipfile
from pathlib import Path
import r63_support as old
from storage import atomic,descriptor,digest,encoded,journal,lock,member,read,require,sync_dir
import inplace_stage as inplace
import ingress_stage as ingress

STATE=Path('/var/lib/core511/state.json')
ROOT=Path('/var/lib/core511/r64-updates')
ACTIVE=ROOT/'active.json'
SYSTEMD=Path('/etc/systemd/system')
RELEASES=Path('/opt/core511/releases')
RESET_ACTIVE=Path('/var/lib/core511/launch-reset-r63/active.json')
SELF=Path(__file__).resolve().parent
VERSION='R85_GAMEPLAY'
SOURCE_VERSION='R84_GAMEPLAY'
# Unresolved constants deliberately prevent a release until the reviewed client
# filename/namespace is supplied; no plan may choose arbitrary asset paths.
CLIENT_REVIEWED=True
CLIENT_OLD_NAMESPACE='core511-6770c36eb6029ff7'
CLIENT_OLD_NAME='game-client-core511-r84-1295951c6cf23767.js'
CLIENT_NAMESPACE='core511-32083f0f5b1149bc'
CLIENT_NAME='game-client-core511-r85-b25e12cf61072ebe.js'
CLIENT_ASSETS='http-runtime/dist-vds/client/assets/'
SOURCE_CORE_SHA256='a0e0bcdfd87717a3d5129a0a30d29bda5a4f85639a2b68773af556f19bda6365'
HTTP='http-runtime/dist-vds/server/index.js'
# Exact reviewed scope; only the immutable game client is a new core file.
PRODUCTION_PATHS=('core511-source/scripts/core511/action-loop.mjs', 'core511-source/scripts/core511/action-writer.mjs', 'core511-source/scripts/core511/actor-isolation.mjs', 'core511-source/scripts/core511/actor-section-reuse-r52.mjs', 'core511-source/scripts/core511/adventure-channel.mjs', 'core511-source/scripts/core511/attack-loop.mjs', 'core511-source/scripts/core511/channel-runtime.mjs', 'core511-source/scripts/core511/claim-actor-join-r56.mjs', 'core511-source/scripts/core511/collect-light.mjs', 'core511-source/scripts/core511/command-failure-scope.mjs', 'core511-source/scripts/core511/coordinator.mjs', 'core511-source/scripts/core511/death-batch-single-r57.mjs', 'core511-source/scripts/core511/death-batch-writer-r57.mjs', 'core511-source/scripts/core511/game-services.mjs', 'core511-source/scripts/core511/generated/loot-profile-cache-r61-proof.json', 'core511-source/scripts/core511/generated/native-client-proof.json', 'core511-source/scripts/core511/generated/native-http-composition-proof.json', 'core511-source/scripts/core511/loot-profile-cache-r61.mjs', 'core511-source/scripts/core511/native-http-bindings.mjs', 'core511-source/scripts/core511/nonlethal-triggers-r56.mjs', 'core511-source/scripts/core511/notification-audience.mjs', 'core511-source/scripts/core511/ownership.mjs', 'core511-source/scripts/core511/permanent-coordinator.mjs', 'core511-source/scripts/core511/player-write-scope.mjs', 'core511-source/scripts/core511/reliable-stream.mjs', 'core511-source/scripts/core511/resident-control.mjs', 'core511-source/scripts/core511/reward-worker-runtime-r533.mjs', 'core511-source/scripts/core511/scoped-reward-maintenance-r79.mjs', 'core511-source/scripts/core511/shared-combat-bridge.mjs', 'core511-source/scripts/core511/shared-combat-channel.mjs', 'core511-source/scripts/core511/transfer-freeze-group.mjs', 'core511-source/scripts/core511/writer-lane-r533.mjs', 'core511-source/scripts/core511/actor-progress-refresh-r85.mjs', 'core511-source/scripts/core511/collect-encounter-r85.mjs', 'core511-source/scripts/core511/collect-join-r85.mjs', 'core511-source/scripts/core511/collect-materials-r85.mjs', 'core511-source/scripts/core511/freeze-failure-r85.mjs', 'core511-source/scripts/core511/freeze-outcomes-r85.mjs', 'core511-source/scripts/core511/generated/client/game-client-core511-r85-b25e12cf61072ebe.js', 'core511-source/scripts/core511/independent-death-batch-r85.mjs', 'core511-source/scripts/core511/respawn-notification-r85.mjs', 'core511-source/scripts/core511/reward-actor-scope-r85.mjs', 'core511-source/scripts/core511/reward-rank-refresh-r85.mjs', 'core511-source/scripts/core511/shared-claim-rejection-r85.mjs', 'http-runtime/dist-vds/server/index.js', 'core511-source/scripts/delivery511/runtime-ingress.mjs')
NEW_PRODUCTION_PATHS=frozenset(['core511-source/scripts/core511/actor-progress-refresh-r85.mjs', 'core511-source/scripts/core511/collect-encounter-r85.mjs', 'core511-source/scripts/core511/collect-join-r85.mjs', 'core511-source/scripts/core511/collect-materials-r85.mjs', 'core511-source/scripts/core511/freeze-failure-r85.mjs', 'core511-source/scripts/core511/freeze-outcomes-r85.mjs', 'core511-source/scripts/core511/generated/client/game-client-core511-r85-b25e12cf61072ebe.js', 'core511-source/scripts/core511/independent-death-batch-r85.mjs', 'core511-source/scripts/core511/respawn-notification-r85.mjs', 'core511-source/scripts/core511/reward-actor-scope-r85.mjs', 'core511-source/scripts/core511/reward-rank-refresh-r85.mjs', 'core511-source/scripts/core511/shared-claim-rejection-r85.mjs'])
NATIVE_TIMING='native510-bb3a6cc689c6/vds-server/src/writer-sql-timing477.mjs'
R78_NATIVE_TIMING_SHA256='9805eec530ab7ca17e13da370f332522ecd7ce328eca8574a483fdb8899f4663'
NATIVE_CHECKPOINT='native510-bb3a6cc689c6/vds-server/src/wal-checkpoint.mjs'
R80_NATIVE_CHECKPOINT_SHA256='049ca592fe8ff68dc0d76479f8df7c8328b4dacb9b34d6cf05bdf3d5f29ee630'
R84_HTTP_SHA256='c4c1f4c08345f4aaffcde30de40b93bd9578a42cc9c1b8b1d0b3b4326651f320'
def say(message):print(message,flush=True)
def command(args,timeout=90):
 result=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=timeout)
 require(result.returncode==0,'Komut tamamlanamadı: '+Path(args[0]).name)
 return result.stdout.strip()
def prop(unit,field):return command(['/usr/bin/systemctl','show',unit,'--property='+field,'--value'])
def service(unit,action):
 require(unit!='coreoflife-accounts.service' and re.fullmatch(r'coreoflife-(r\d+|rt-r\d+)\.service',unit),'Hesap servisi bu kurucuda durdurulamaz')
 return command(['/usr/bin/systemctl',action,unit])
def reload_units():command(['/usr/bin/systemctl','daemon-reload'])
def unit_path(unit):return SYSTEMD/(unit+'.d')/'92-core511-r64.conf'
def guard_path(unit):return SYSTEMD/(unit+'.d')/'96-core511-r64-guard.conf'
def file_record(file):
 file=Path(file)
 require(not file.is_symlink(),'Kaydedilecek dosya sembolik bağ')
 if not file.exists():return {'path':str(file),'exists':False}
 s=file.lstat();require(stat.S_ISREG(s.st_mode) and not file.is_symlink(),'Yedeklenecek dosya geçersiz')
 return {'path':str(file),'exists':True,'data':file.read_bytes().hex(),'sha256':digest(file),'mode':stat.S_IMODE(s.st_mode),'uid':s.st_uid,'gid':s.st_gid}
def restore_file(saved):
 file=Path(saved['path'])
 if saved['exists']:atomic(file,bytes.fromhex(saved['data']),saved['mode'],(saved['uid'],saved['gid']))
 elif file.exists():file.unlink();sync_dir(file.parent)
def saved_matches(saved):
 p=Path(saved['path'])
 if p.is_symlink():return False
 if not saved['exists']:return not p.exists()
 if not p.is_file():return False
 s=p.stat()
 return digest(p)==saved['sha256'] and (stat.S_IMODE(s.st_mode),s.st_uid,s.st_gid)==(saved['mode'],saved['uid'],saved['gid'])
def write_record(directory,record,phase):
 require(not ACTIVE.is_symlink(),'Etkin işlem kaydı sembolik bağ')
 if ACTIVE.exists():require(read(ACTIVE).get('directory')==str(directory),'Başka güncelleme sürüyor; kaydına dokunulmadı')
 record['phase']=phase;journal(directory/'journal.json',record);journal(ACTIVE,{'directory':str(directory),'phase':phase})
def clear_active(directory):
 if ACTIVE.exists():require(not ACTIVE.is_symlink() and read(ACTIVE).get('directory')==str(directory),'Başka güncelleme kaydı silinmedi')
 ACTIVE.unlink(missing_ok=True);sync_dir(ROOT)
def guards(record,enable):
 body=('[Unit]\nConditionPathExists=!'+str(ACTIVE)+'\n').encode()
 for unit in record['units']:
  p=guard_path(unit)
  require(not p.is_symlink(),'Başlatma koruması sembolik bağ')
  if p.exists():require(p.read_bytes()==body,'Başka kurulum koruması bulundu')
  if enable:atomic(p,body,0o644)
  elif p.exists():p.unlink();sync_dir(p.parent)
 reload_units()
def process_identity(pid):
 raw=Path('/proc',str(pid),'stat').read_text()
 return {'pid':pid,'start':raw.rsplit(')',1)[1].split()[19]}

class Live:
 def __init__(self):
  self.state=read(STATE);require(self.state.get('installed') is True,'Kurulu oyun bulunamadı')
  self.root=Path(self.state['releaseRoot']).resolve();require(self.root.parent==RELEASES,'Sürüm dizini kapsamı geçersiz')
  prior=self.state['prior'];self.unit=prior['gameUnit'];self.accounts_unit=prior['accountsUnit']
  require(self.accounts_unit=='coreoflife-accounts.service' and re.fullmatch(r'coreoflife-r\d+\.service',self.unit),'Servis kapsamı geçersiz')
  self.config_file=Path(prior['newGameConfigFile']).resolve();self.config=read(self.config_file)
  self.accounts_file=Path(prior.get('newAccountsConfigFile') or prior['accountsConfigFile']).resolve();self.accounts_config=read(self.accounts_file)
  self.database=Path(self.config['database']).resolve();self.accounts_database=Path(self.accounts_config['database']).resolve()
  require(str(self.root)==self.config['delivery511']['releaseRoot'] and self.database==Path(prior['database']).resolve(),'Oyun yapılandırması eşleşmiyor')
  self.realm=self.config['realm']['id'];self.manifest=read(self.config['realm']['manifestFile'])
  require(self.realm==self.manifest['primaryRealmId'],'Yalnız birincil sunucu destekleniyor')
  require(self.accounts_database==Path(self.manifest['accountsDatabase']).resolve(),'Hesap veritabanı eşleşmiyor')
  realm=next(r for r in self.manifest['realms'] if r['id']==self.realm)
  require(self.database==Path(realm['database']).resolve(),'Sunucu veritabanı eşleşmiyor')
  self.data_root=Path(realm['dataRoot']).resolve()
  self.db_identity=descriptor(self.database);self.account_db_identity=descriptor(self.accounts_database)
  expected=prior['databaseIdentity'];require((self.db_identity['device'],self.db_identity['inode'])==(expected['dev'],expected['ino']),'Oyun veritabanı kimliği değişmiş')
  self.accounts_root=Path(self.state.get('r64Deployment',{}).get('accountsRoot',self.root)).resolve()
  require(self.accounts_root.parent==RELEASES,'Hesap sürüm dizini geçersiz')
  self.port=self.config['delivery511']['appPort'];self.node=self.root/'bin/node'
  self.rt_unit='coreoflife-rt-'+self.realm+'.service'
 def same_database(self):require(descriptor(self.database)==self.db_identity,'Oyun veritabanı kimliği değişmiş')
 def backup_binding(self):
  # The native backup uses CORE_DATA_ROOT/backups, while the inherited mutex
  # helper uses database.parent/backups. Bind the supported stock layout to
  # the actual service environment before acquiring that mutex, even in recovery.
  require(self.data_root==self.database.parent,'Günlük yedek dataRoot ile veritabanı üst dizini farklı; yanlış kilit kullanılmadı')
  unit='coreoflife-'+self.realm+'-backup.service'
  require(prop(unit,'LoadState')=='loaded','Günlük oyun yedek servisi doğrulanamadı')
  require(not prop(unit,'EnvironmentFiles'),'Günlük yedek EnvironmentFile ayarı desteklenen kilit bağını belirsiz yapıyor')
  watched={'CORE_DATA_ROOT','CORE_CONFIG_FILE','CORE_BACKUP_LOCK_HELD'}
  for key in ('UnsetEnvironment','PassEnvironment'):
   require(not any(v.split('=',1)[0] in watched for v in shlex.split(prop(unit,key))),'Günlük yedek ortam geçersiz kılma ayarı farklı')
  environment=dict(value.split('=',1) for value in shlex.split(prop(unit,'Environment')) if '=' in value)
  require(environment.get('CORE_DATA_ROOT') and Path(environment['CORE_DATA_ROOT']).resolve()==self.data_root and environment.get('CORE_BACKUP_LOCK_HELD')!='1','Günlük yedek servisi aynı veri dizini kilidini kullanmıyor')
  require(environment.get('CORE_CONFIG_FILE'),'Günlük yedek yapılandırması bulunamadı')
  config=Path(environment['CORE_CONFIG_FILE']).resolve()
  require(config.is_file() and Path(read(config)['database']).resolve()==self.database,'Günlük yedek başka bir veritabanına bağlı')
  paths=[prop(unit,'FragmentPath'),*prop(unit,'DropInPaths').split()]
  require(paths[0] and all(Path(p).is_file() for p in paths if p),'Günlük yedek servis dosyaları doğrulanamadı')
  return {'unit':unit,'dataRoot':str(self.data_root),'config':str(config),'configSHA256':digest(config),'unitFiles':{p:digest(p) for p in paths if p}}
 def accounts_identity(self):
  require(prop(self.accounts_unit,'ActiveState')=='active','Kayıt servisi çalışmıyor')
  pid=int(prop(self.accounts_unit,'MainPID'));require(pid>1,'Hesap servisi PID geçersiz');process=process_identity(pid)
  argv=Path('/proc',str(pid),'cmdline').read_bytes().split(b'\0')
  require(str(self.accounts_root/'core511-source/scripts/delivery511/generated/accounts-entry.mjs').encode() in argv,'Hesap servisi kaynak sürümü eşleşmiyor')
  env=dict(x.split(b'=',1) for x in Path('/proc',str(pid),'environ').read_bytes().split(b'\0') if b'=' in x)
  require(env.get(b'CORE_CONFIG_FILE')==str(self.accounts_file).encode(),'Hesap servisi yapılandırma yolu değişmiş')
  require(process_identity(pid)==process,'Hesap servisi kontrol sırasında değişti')
  unit_files=[prop(self.accounts_unit,'FragmentPath'),*prop(self.accounts_unit,'DropInPaths').split()]
  return {**process,'root':str(self.accounts_root),'configSHA256':digest(self.accounts_file),
          'database':descriptor(self.accounts_database),'unitFiles':{p:digest(p) for p in unit_files if p}}
 def account_stable(self,expected):require(self.accounts_identity()==expected,'Hesap servisi kimliği değişti; yeni kayıtlara dokunulmadı')
 def active_binding(self):
  require(prop(self.unit,'ActiveState')=='active','Oyun servisi çalışıyor olmalı')
  pid=int(prop(self.unit,'MainPID'));require(pid>1,'Oyun PID geçersiz')
  args=Path('/proc',str(pid),'cmdline').read_bytes().split(b'\0')
  entry=self.root/'core511-source/scripts/delivery511/runtime-entry.mjs'
  require(str(entry).encode() in args,'Çalışan oyun sürümü uyuşmuyor')
  env=dict(x.split(b'=',1) for x in Path('/proc',str(pid),'environ').read_bytes().split(b'\0') if b'=' in x)
  require(env.get(b'CORE_CONFIG_FILE')==str(self.config_file).encode(),'Çalışan oyun ayarı uyuşmuyor')
  if b'CORE_DATA_ROOT' in env:require(Path(os.fsdecode(env[b'CORE_DATA_ROOT'])).resolve()==self.data_root,'Çalışan oyun veri dizini yedek kilidiyle eşleşmiyor')
  if 'r64Deployment' in self.state:
   require(unit_path(self.unit).is_file() and digest(unit_path(self.unit))==self.state['r64Deployment']['dropinSHA256'],'R64 başlatma dosyası değişmiş')
  else:old.startup_verify(self)
  require(descriptor(self.database)==self.db_identity,'Oyun veritabanı değişmiş')
 def central(self,operation='snapshot',expected=None):
  raw=command([str(self.accounts_root/'bin/node'),str(SELF/'central.mjs'),str(self.accounts_root),str(self.config_file),str(self.accounts_file),operation,json.dumps(expected) if expected else ''],timeout=30)
  return json.loads(raw)
 def empty(self):
  with contextlib.closing(sqlite3.connect(self.database.as_uri()+'?mode=ro',uri=True,timeout=5)) as db:
   counts=[db.execute('SELECT COUNT(*) FROM game_presence WHERE expires_at_ms>?',(int(time.time()*1000),)).fetchone()[0],db.execute('SELECT COUNT(*) FROM players WHERE last_seen>?',(int(time.time())-40,)).fetchone()[0],db.execute('SELECT COUNT(*) FROM kernel511_admissions').fetchone()[0]]
  require(counts==[0,0,0],'Oyuncu veya admin oyunda. Çıkıp 45 saniye bekleyin.')
 def health(self,empty=True):
  h=old.local(self.port,'/api/vds-health');rows=h.get('channelProcesses',{}).get('channels',[])
  require(h.get('kernel511',{}).get('ready') is True and h.get('durable') is True and h.get('realm',{}).get('dbIdentity')==self.config['realm']['dbIdentity'],'Oyun sağlık kontrolü başarısız')
  require(len(rows)==4 and all(r.get('channel')==i+1 and r.get('ready') is True and r.get('capacity')==25 and (not empty or r.get('online')==0) for i,r in enumerate(rows)),'Dört kanal hazır değil')
  if self.state.get('r64Deployment',{}).get('version') in (SOURCE_VERSION,VERSION):
   from runtime_stage import VERSIONS
   checkpoint=h.get('checkpointR79',{})
   require(checkpoint.get('ready') is True and checkpoint.get('nodeVersion')==VERSIONS['node'] and checkpoint.get('sqliteVersion')==VERSIONS['sqlite'],'R79 kayıt işçisi veya çalışma zamanı hazır değil')
  if self.state.get('r64Deployment',{}).get('version')==VERSION:
   diagnostics=h.get('runtimeDiagnosticsR80',{})
   require(h.get('updateVersion')==VERSION and diagnostics.get('protocol')=='runtime-diagnostics-r80-v1' and diagnostics.get('available') is True,'R85 çalışma zamanı ve salt okunur tanılama uçları hazır değil')
  if empty:self.empty()
 def ready(self,record,empty=True):
  deadline=time.monotonic()+90;last=0
  while time.monotonic()<deadline:
   self.account_stable(record['accounts'])
   try:self.health(empty=empty);self.active_binding();return
   except (OSError,RuntimeError,ValueError):
    if time.monotonic()-last>5:say('Oyun kanalları hazırlanıyor; ön kayıt servisi açık.');last=time.monotonic()
    time.sleep(.5)
  raise RuntimeError('Dört kanalın açılması tamamlanamadı')

def allowed_policy(p):
 if p['phase']=='maintenance':return p['mode']=='maintenance' and p['deadlineMs']<=int(time.time()*1000)
 return p['phase']=='waiting' and p['mode'] in ('closed','scheduled') and p['enabled']==1 and p['registrationOpen'] is True
def same_policy(a,b):return all(a[k]==b[k] for k in ('phase','mode','enabled','revision'))
def assert_frame(live,record,held=True):
 live.account_stable(record['accounts']);current=live.central()
 require(live.backup_binding()==record['backupBinding'],'Günlük yedek servis bağı kurulum sırasında değişti')
 require(same_policy(current,record['policy']),'Oyun durumu kurulum sırasında değişti')
 expected={**record['policy']['realm'],'status':'maintenance'} if held else record['policy']['realm']
 require(current['realm']==expected,'Sunucu giriş ayarı kurulum sırasında değişti')
 require(descriptor(live.database)==record['database'],'Oyun veritabanı kimliği değişmiş')
 return current
def verify_release(root,expected_core):
 require(old.core_identity(root/old.CORE)==expected_core,'Oyun kaynak kimliği eşleşmiyor')
 manifest=read(root/'release-manifest.json');require(manifest.get('runtimeSha256')==expected_core,'Sürüm manifest kimliği eşleşmiyor')
 script="import{pathToFileURL}from'node:url';const r=process.argv[1];const{verifyPackage}=await import(pathToFileURL(r+'/core511-source/scripts/delivery511/install-operations.mjs'));const m=verifyPackage(r);const fs=await import('node:fs');for(const row of m.files){if(Object.hasOwn(row,'executable')&&(typeof row.executable!=='boolean'||Boolean(fs.lstatSync(r+'/'+row.path).mode&0o111)!==row.executable))throw Error('release_executable_mismatch:'+row.path);}"
 say('Sürüm dosyaları doğrulanıyor; ön kayıt servisi çalışmaya devam ediyor.')
 old.verify_command([str(root/'bin/node'),'--input-type=module','-e',script,str(root)],old.verification_budget(manifest))
def validate_scope(plan):
 require(CLIENT_REVIEWED is True,'R85 istemci kimliği henüz doğrulanmadı')
 require(plan.get('baseCoreSHA256')==SOURCE_CORE_SHA256,'Paket yalnız doğrulanmış R84 kaynak kimliği üzerine uygulanır')
 require(plan.get('version')==VERSION and plan.get('sourceVersion')==SOURCE_VERSION,'Paket R84 → R85 sürüm kapsamı geçersiz')
 require(plan.get('databaseChanges') is False and plan.get('databaseSchemaChanges') is False and plan.get('databaseScope')=='none' and plan.get('accountsChanges') is False and plan.get('clientChanges') is True and 'schemaMigration' not in plan,'R85 oyun kodu ve doğrulanmış istemci grafiği kapsamı farklı; DB, hesaplar ve çalışma zamanı korunur')
 require(plan.get('httpEntrySHA256')==R84_HTTP_SHA256,'R84 HTTP kimliği farklı')
 from runtime_stage import validate_plan
 validate_plan(plan)
 require(set(plan['files'])==set(PRODUCTION_PATHS),'R85 dosya kapsamı farklı; onaylanmış dosyaların tamamı gerekli')
 require(plan.get('client')=={'oldNamespace':CLIENT_OLD_NAMESPACE,'namespace':CLIENT_NAMESPACE,'oldName':CLIENT_OLD_NAME,'name':CLIENT_NAME,'generatedNames':[CLIENT_NAME]},'R85 değişmez istemci grafiği kimliği farklı')
 require(plan['files'][HTTP]['before']==R84_HTTP_SHA256,'R85 HTTP başlangıç kimliği farklı')
 for name,meta in plan['files'].items():
  require('linkSource' not in meta,'Paket doğrudan istemci bağı taşıyamaz')
  require(not name.endswith(('.sqlite','.db','.sqlite-wal','.sqlite-shm')),'Veritabanı dosyası kod güncellemesi olamaz')
  if name in NEW_PRODUCTION_PATHS:
   require(meta.get('before') is None,'R85 yeni yardımcı dosyası önceden var olamaz: '+name)
  else:
   require(meta.get('before') is not None,'R85 mevcut oyun dosyası başlangıç kimliği gerekli: '+name)
 ingress.validate_plan(plan)

def initial_core(live,plan):
 validate_scope(plan)
 installed=live.state.get('r64Deployment',{}).get('version')
 require(installed in (SOURCE_VERSION,VERSION),'Bu güncelleme yalnız doğrulanmış R84 üzerine uygulanır')
 manifest=read(live.root/'release-manifest.json')
 require(manifest.get('baselineSha256')==plan['nativeBaseline'],'Oyun tabanı farklı')
 ingress.validate_installed(live.root,manifest,updated=installed==VERSION)
 rows={r['path']:dict(r) for r in plan['baseCoreRows']}
 require(len(rows)==len(plan['baseCoreRows']) and old.identity_from_rows(rows.values())==plan['baseCoreSHA256'],'Paket R84 kaynak listesi bozuk')
 # Preserve the historical C-file export exception only at its verified live
 # manifest identity, exactly as the R79 installer did.
 extra_name=old.CORE+'benchmark/no-network.c';extras=[r for r in manifest['files'] if r['path']==extra_name]
 require(len(extras)<=1,'Tekrarlanan kaynak kaydı');extra=member(live.root,extra_name)
 if extras:
  row=extras[0];require(extra.is_file() and not extra.is_symlink() and extra.stat().st_size==row['bytes'] and digest(extra)==row['sha256'],'Benchmark kaynak kaydı değişmiş')
  rows['benchmark/no-network.c']={**row,'path':'benchmark/no-network.c'}
 else:require(not extra.exists(),'Manifest dışı benchmark kaynağı var')
 before=old.identity_from_rows(rows.values());after_rows=dict(rows)
 for name,meta in plan['files'].items():
  if name.startswith(old.CORE):
   short=name[len(old.CORE):];base=rows.get(short)
   require(meta['before']==(base['sha256'] if base else None),'Delta R84 kaynak listesiyle eşleşmiyor: '+name)
   after_rows[short]={'path':short,'bytes':meta['bytes'],'sha256':meta['after']}
 after=old.identity_from_rows(after_rows.values());expected=after if installed==VERSION else before
 require(live.state.get('candidate')==expected and manifest.get('runtimeSha256')==expected and old.core_identity(live.root/old.CORE)==expected,'Kurulu oyun doğrulanmış R84/R85 kaynaklarıyla eşleşmiyor')
 require(digest(member(live.root,HTTP))==(plan['files'][HTTP]['after'] if installed==VERSION else R84_HTTP_SHA256),'Kurulu HTTP oyun dosyası farklı')
 require(digest(member(live.root,NATIVE_TIMING))==R78_NATIVE_TIMING_SHA256,'Kurulu SQL ölçüm dosyası farklı')
 require(digest(member(live.root,NATIVE_CHECKPOINT))==R80_NATIVE_CHECKPOINT_SHA256,'Kurulu R80 kayıt işçisi dosyası farklı')
 from runtime_stage import assert_runtime
 assert_runtime(live.root,plan)
 ops=member(live.root,old.OPS).read_text();matches=list(re.finditer(r"export const CANDIDATE='([0-9a-f]{64})';",ops))
 require(len(matches)==1 and matches[0][1]==expected,'Kurucu kaynak kimliği farklı')
 canonical=ops.replace(matches[0][0],"export const CANDIDATE='R66_BASE_CORE';")
 require(hashlib.sha256(canonical.encode()).hexdigest()==plan['operationsCanonicalSHA256'],'Kurucu kaynak dosyası değişmiş')
 plan['targetCore']=after
 return expected

def prepare_updates(live,plan,updates,*,original_manifest=None,original_manifest_bytes=None,source_reader=None,verify_start=True):
 """Bind the exact immutable client closure to the verified original release."""
 if verify_start:
  for name,meta,data in updates:
   p=inplace.checked_path(live.root,name)
   require((digest(p) if p.exists() else None)==meta['before'],'Paket başlangıç dosyası değişmiş: '+name)
 original_manifest=original_manifest if original_manifest is not None else read(live.root/'release-manifest.json')
 manifest=json.loads(json.dumps(original_manifest));by_name={r['path']:r for r in manifest['files']}
 require(len(by_name)==len(manifest['files']),'Tekrarlanan manifest dosyası')
 ingress.validate_update(live.root,plan,updates,original_manifest,source_reader=source_reader)
 from runtime_stage import prepare_manifest
 prepare_manifest(live.root,manifest,plan);by_name={r['path']:r for r in manifest['files']}
 result=list(updates)
 # R85 changes the HTTP bundle only to point at the new immutable graph.
 # Enforce that at install/recovery time too, before any service is stopped;
 # an otherwise correctly hashed payload cannot expand this reviewed scope.
 http_row=by_name[HTTP]
 original_http=source_reader(http_row) if source_reader else inplace.checked_path(live.root,HTTP).read_bytes()
 require(hashlib.sha256(original_http).hexdigest()==R84_HTTP_SHA256,'Özgün HTTP kaynak kimliği farklı')
 expected_http=original_http.replace(CLIENT_OLD_NAMESPACE.encode(),CLIENT_NAMESPACE.encode()).replace(CLIENT_OLD_NAME.encode(),CLIENT_NAME.encode())
 http_updates=[data for name,meta,data in updates if name==HTTP]
 require(len(http_updates)==1 and expected_http==http_updates[0],'R85 HTTP yalnız doğrulanmış istemci başvurularını değiştirebilir')
 from client_stage import prepare_client_updates,journaled_link_updates
 extra,links=prepare_client_updates(live,plan,updates,original_manifest=original_manifest,source_reader=source_reader,check_destination=verify_start)
 result+=extra+journaled_link_updates(links)
 operations=member(live.root,old.OPS)
 source_bytes=source_reader(by_name[old.OPS]) if source_reader else operations.read_bytes();source=source_bytes.decode()
 require(hashlib.sha256(source_bytes).hexdigest()==by_name[old.OPS]['sha256'],'Özgün kurucu kaynak kimliği farklı')
 replacement=re.sub(r"export const CANDIDATE='[0-9a-f]{64}';","export const CANDIDATE='"+plan['targetCore']+"';",source,count=1).encode()
 result.append((old.OPS,{'before':hashlib.sha256(source_bytes).hexdigest(),'after':hashlib.sha256(replacement).hexdigest(),'bytes':len(replacement)},replacement))
 for name,meta,data in result:
  # New immutable hardlinks retain the existing source mode; no chmod is ever
  # applied to a linked asset because that would modify the old namespace.
  linked=by_name.get(meta.get('linkSource'),{})
  by_name[name]={**by_name.get(name,{}),'path':name,'bytes':meta['bytes'],'sha256':meta['after'],**({'executable':meta['executable']} if 'executable' in meta else ({'executable':linked['executable']} if 'executable' in linked else {}))}
 manifest['files']=[by_name[n] for n in sorted(by_name)];manifest['runtimeSha256']=plan['targetCore']
 data=encoded(manifest)
 original_bytes=original_manifest_bytes if original_manifest_bytes is not None else (live.root/'release-manifest.json').read_bytes()
 result.append(('release-manifest.json',{'before':hashlib.sha256(original_bytes).hexdigest(),'after':hashlib.sha256(data).hexdigest(),'bytes':len(data)},data))
 return result

def expanded_space(live,updates):
 """Reserve actual rewritten text/code bytes; immutable hardlinks add no body."""
 written=sum(meta['bytes'] for name,meta,data in updates if data is not None)
 originals=sum(member(live.root,name).stat().st_size for name,meta,data in updates if meta['before'] is not None)
 links=sum(data is None for name,meta,data in updates);metadata=(links+len(updates))*8192
 db_bytes=old.database_space(live,STATE.parent)
 for folder,needed in ((live.root,written+metadata+32*1024*1024),(STATE.parent,db_bytes+originals+written+metadata+old.DB_RESERVE)):
  statv=os.statvfs(folder);require(statv.f_bavail*statv.f_frsize>=needed,'Yerinde istemci grafiği ve yedek için disk alanı yetersiz')
 return {'expandedWriteBytes':written,'expandedBackupBytes':originals,'immutableClientLinks':links}
def preflight(live,plan):
 require(not RESET_ACTIVE.exists(),'Hesap sıfırlaması sürüyor. Tamamlanmasını bekleyin.')
 validate_scope(plan)
 live.backup_binding()
 require(live.accounts_root!=live.root,'Yerinde güncelleme için hesap ve oyun kaynakları ayrı olmalı')
 require(not live.database.is_relative_to(live.root) and not live.accounts_database.is_relative_to(live.root),'Kalıcı veritabanı sürüm dizininde olamaz')
 live.active_binding();accounts=live.accounts_identity();policy=live.central()
 require(allowed_policy(policy),'Ön kayıt veya tamamlanmış bakım modu gerekli')
 require(policy['realm']['status'] in ('open','maintenance'),'Sunucu giriş durumu uygun değil')
 live.empty();core=initial_core(live,plan);verify_release(live.root,core);live.account_stable(accounts)
 require(same_policy(live.central(),policy),'Hazırlıkta oyun durumu değişti')
 live.active_binding();live.same_database()
 # Reserve only the changed originals, one atomic replacement and the SQLite
 # backup. Never budget, clone or prune an entire release directory.
 original=sum(member(live.root,n).stat().st_size for n,m in plan['files'].items() if m['before'] is not None)
 metadata=sum(member(live.root,n).stat().st_size for n in (old.OPS,'release-manifest.json'))+STATE.stat().st_size
 delta=sum(m['bytes'] for m in plan['files'].values());db_bytes=old.database_space(live,STATE.parent)
 code_need=original+metadata+delta+32*1024*1024
 for folder,needed in ((live.root,delta+metadata+32*1024*1024),(STATE.parent,db_bytes+code_need+old.DB_RESERVE)):
  v=os.statvfs(folder);require(v.f_bavail*v.f_frsize>=needed,'Yerinde delta ve doğrulanmış DB yedeği için boş alan yetersiz')
 require(live.root.stat().st_dev==live.root.parent.stat().st_dev,'Sürüm dizini atomik yerinde güncellemeye uygun değil')
 return accounts,policy,core,{'changedFiles':len(plan['files']),'deltaBytes':delta,'codeBackupBytes':original+metadata,'databaseBackupBytes':db_bytes}

def stop_game(record):
 errors=[]
 for unit in reversed(record['units']):
  try:service(unit,'stop');require(prop(unit,'ActiveState') in ('inactive','failed'),'Oyun servisi durmadı: '+unit)
  except BaseException as error:errors.append(error)
 if errors:raise errors[0]
def failure_fence(record):
 # A full/read-only /etc or daemon-reload failure must never suppress stop.
 # Keep the triggering error as the caller's exception; report fencing failure
 # separately after independently attempting every game unit.
 errors=[]
 try:guards(record,True)
 except BaseException as error:errors.append(error)
 try:stop_game(record)
 except BaseException as error:errors.append(error)
 if errors:say('Başlatma koruması veya durdurma tam doğrulanamadı; aynı R85 paketiyle --recover gerekli. Hesap servisine dokunulmadı.')
 return errors
def start_game(record):
 for unit in record['units']:service(unit,'start')
def ensure_quiet(record):
 identity=(record['database']['device'],record['database']['inode'])
 for process in Path('/proc').iterdir():
  if not process.name.isdigit():continue
  try:fds=list((process/'fd').iterdir())
  except (FileNotFoundError,PermissionError,ProcessLookupError):continue
  for fd in fds:
   try:s=fd.stat()
   except (FileNotFoundError,PermissionError,ProcessLookupError):continue
   require((s.st_dev,s.st_ino)!=identity,'Oyun veritabanını açık tutan süreç var: '+process.name)
def plan_identity(plan):
 return hashlib.sha256(encoded({k:v for k,v in plan.items() if k!='targetCore'})).hexdigest()

def stable_accounts(live,record,*,allow_restart=False):
 current=live.accounts_identity();expected=record['accounts']
 if allow_restart:
  require({k:v for k,v in current.items() if k not in ('pid','start')}=={k:v for k,v in expected.items() if k not in ('pid','start')},'Hesap hizmetinin kaynak/ayar/veritabanı kimliği değişmiş')
  record['accounts']=current
 else:live.account_stable(expected)

def validate_record(live,directory,record,plan,payload_updates):
 require(directory.parent==ROOT and directory.resolve()==directory and not directory.is_symlink(),'Kurtarma dizini kapsamı geçersiz')
 s=directory.stat();require(s.st_uid==os.geteuid() and stat.S_IMODE(s.st_mode)==0o700,'Kurtarma dizini izinleri değişmiş')
 require(record.get('version')==VERSION and record.get('kind')=='inplace-r85' and record.get('planSHA256')==plan_identity(plan),'Bu kurtarma kaydı farklı pakete ait; aynı R85 paketi gerekli')
 require(record['root']==str(live.root) and live.accounts_root!=live.root,'Kurtarma kaynak dizini farklı')
 require(record['units'] in ([live.unit],[live.unit,live.rt_unit]),'Kurtarma servis kapsamı geçersiz')
 require(descriptor(live.database)==record['database'],'Kurtarma veritabanı uyuşmuyor')
 require(record['beforeState']['path']==str(STATE) and record['afterState']['path']==str(STATE),'Kurtarma STATE yolu farklı')
 for saved in (record['beforeState'],record['afterState']):
  require(saved['exists'] and hashlib.sha256(bytes.fromhex(saved['data'])).hexdigest()==saved['sha256'],'Kurtarma STATE yedeği bozuk')
 require(saved_matches(record['beforeState']) or saved_matches(record['afterState']),'Kurulum kaydı başka bir işlemle değişmiş')
 require(record['beforeDropin']['path']==str(unit_path(live.unit)) and saved_matches(record['beforeDropin']),'Oyun başlatma dosyası değişmiş')
 require(record['beforeConfig']['path']==str(live.config_file) and saved_matches(record['beforeConfig']),'Oyun yapılandırma dosyası değişmiş')
 validate_expanded_record(live,directory,record,plan,payload_updates)
 require(record['runtimePlan']=={'runtime':plan['runtime'],'files':{}},'Kurtarma çalışma zamanı kimliği farklı')
 require(live.backup_binding()==record['backupBinding'],'Kurtarmada günlük yedek servis bağı değişmiş')
 return record

def validate_expanded_record(live,directory,record,plan,payload_updates):
 """Re-derive every payload, client link/reference, metadata path and new dir.

 The original manifest is read from its verified live before hash or its exact
 indexed code backup. The same rule obtains SSR/portal bytes already changed by
 an interrupted update. Old namespace assets are never changed and remain the
 only allowed hardlink sources. Nothing in the journal can extend this scope.
 """
 rows=record['files'];by_name={row['path']:row for row in rows}
 require(len(by_name)==len(rows) and rows and rows[-1]['path']=='release-manifest.json','Kurtarma dosya kapsamı değişmiş')
 for index,row in enumerate(rows):
  inplace.checked_path(live.root,row['path'])
  require(row['slot']==str(index) and row['backup']==(str(index)+'.before' if row['before'] is not None else None),'Kurtarma kod yedeği sırası farklı')
 require([name for name,meta,data in payload_updates]==list(plan['files']),'Kurtarma paket sırası farklı')
 for name,meta,data in payload_updates:
  require(meta==plan['files'][name] and isinstance(data,bytes) and len(data)==meta['bytes'] and hashlib.sha256(data).hexdigest()==meta['after'],'Kurtarma paket kimliği farklı')
 def original_bytes(name,sha,size=None):
  p=inplace.checked_path(live.root,name)
  if p.is_file() and digest(p)==sha:data=p.read_bytes()
  else:
   saved=by_name.get(name);require(saved is not None and saved['before']==sha and saved['backup'] is not None,'Özgün istemci kaynağı veya yedeği yok: '+name)
   p=inplace.checked_path(directory,'code/'+saved['backup']);require(p.is_file(),'Özgün istemci yedeği eksik: '+name);data=p.read_bytes()
  require(hashlib.sha256(data).hexdigest()==sha and (size is None or len(data)==size),'Özgün istemci yedeği farklı: '+name)
  return data
 original_data=original_bytes('release-manifest.json',rows[-1]['before'])
 original_manifest=json.loads(original_data);source_rows={row['path']:row for row in original_manifest['files']}
 require(len(source_rows)==len(original_manifest['files']),'Özgün manifest dosyası tekrarlı')
 core_rows={row['path']:dict(row) for row in plan['baseCoreRows']}
 require(len(core_rows)==len(plan['baseCoreRows']) and old.identity_from_rows(core_rows.values())==plan['baseCoreSHA256'],'Kurtarma kaynak listesi farklı')
 extra=source_rows.get(old.CORE+'benchmark/no-network.c')
 if extra:core_rows['benchmark/no-network.c']={**extra,'path':'benchmark/no-network.c'}
 before_core=old.identity_from_rows(core_rows.values())
 require(original_manifest.get('runtimeSha256')==before_core and record['beforeCore']==before_core,'Özgün manifest kaynak kimliği farklı')
 for name,meta in plan['files'].items():
  base=source_rows.get(name);require(meta['before']==(base['sha256'] if base else None),'Kurtarma başlangıç manifesti farklı: '+name)
  if name.startswith(old.CORE):core_rows[name[len(old.CORE):]]={'path':name[len(old.CORE):],'sha256':meta['after'],'bytes':meta['bytes']}
 target_core=old.identity_from_rows(core_rows.values());require(record['targetCore']==target_core,'Kurtarma hedef kaynak kimliği farklı')
 prepared=prepare_updates(live,{**plan,'targetCore':target_core},payload_updates,original_manifest=original_manifest,original_manifest_bytes=original_data,source_reader=lambda row:original_bytes(row['path'],row['sha256'],row['bytes']),verify_start=False)
 require([row['path'] for row in rows]==[name for name,meta,data in prepared],'Kurtarma dosya kapsamı değişmiş')
 for row,(name,meta,data) in zip(rows,prepared):
  require(all(row[k]==meta[k] for k in ('before','after','bytes')) and row.get('linkSource')==meta.get('linkSource'),'Kurtarma delta veya varlık bağı kimliği farklı: '+name)
  if meta.get('linkSource') is not None:
   source_prefix=CLIENT_ASSETS+plan['client']['oldNamespace']+'/';target_prefix=CLIENT_ASSETS+plan['client']['namespace']+'/'
   require(meta['linkSource'].startswith(source_prefix) and name==target_prefix+meta['linkSource'][len(source_prefix):] and meta['before'] is None,'Kurtarma varlık bağı kapsamı farklı')
 original_dirs={Path('.')}
 for row in [*original_manifest['files'],*original_manifest.get('symlinks',[])]:
  member(live.root,row['path'])
  original_dirs.update(Path(row['path']).parents)
 created=set()
 for name,meta,data in prepared:
  for parent in Path(name).parents:
   if parent in original_dirs:break
   created.add(parent.as_posix())
 expected_dirs=sorted(created,key=lambda name:(len(Path(name).parts),name))
 require(record.get('createdDirectories',[])==expected_dirs,'Kurtarma yeni dizin kapsamı farklı')

def state_after(live,directory,target):
 state=json.loads(json.dumps(live.state));state['candidate']=target
 state['r64Deployment']={**state['r64Deployment'],'version':VERSION,'accountsRoot':str(live.accounts_root),'journal':str(directory/'journal.json'),'protocol':1,'inPlace':True,'sourceVersion':SOURCE_VERSION}
 before=file_record(STATE);data=encoded(state)
 return {**before,'data':data.hex(),'sha256':hashlib.sha256(data).hexdigest()}

def finish(live,directory,record,*,rolled_back=False):
 # Only called after the selected code has passed health and source checks.
 # A cleanup failure leaves a resumable validated journal, not a second rollback.
 stable_accounts(live,record);live.same_database()
 live.central('restore',record['policy'])
 inplace.cleanup(live.root,record,lambda:write_record(directory,record,record['phase']))
 folder=backup_folder(directory,record)
 if folder is not None:
  adopt_backup(directory,record)
  old.remove_own_database_backup(folder,record)
  if not record.get('databaseBackup') and (folder/'game.sqlite').exists():
   say('Kesintide doğrulama kaydı oluşmamış özel DB yedeği korundu; güncel DB değişmedi.')
 write_record(directory,record,'rolled_back' if rolled_back else 'complete');clear_active(directory)
 say('R84 kodu geri geldi; güncel oyun veritabanı ve hesaplar korundu.' if rolled_back else 'R85 TAMAMLANDI. Yerinde güncelleme kuruldu. Dört kanal hazır; mevcut veritabanı, hesap servisi ve yönetici oyun durumu korundu.')

def gate_for_recovery(live,directory,record,*,fresh=False):
 current=live.central();held={**record['policy']['realm'],'status':'maintenance'}
 if not fresh and same_policy(current,record['policy']) and current['realm']==held:return
 require(allowed_policy(current),'Kurtarma için ön kayıt veya tamamlanmış bakım modu gerekli')
 if fresh or not same_policy(current,record['policy']) or current['realm']!=record['policy']['realm']:
  record['policy']=current
 write_record(directory,record,'gating-rollback');live.central('gate',record['policy'])

def backup_folder(directory,record):
 row=record.get('backupAttempt')
 if row is None:return None
 require(re.fullmatch(r'database-[0-9a-f]{16}',row['directory']),'DB yedeği dizin kapsamı farklı')
 p=directory/row['directory'];s=p.lstat()
 require(p.is_dir() and not p.is_symlink() and (s.st_dev,s.st_ino)==(row['device'],row['inode']) and s.st_uid==os.geteuid() and stat.S_IMODE(s.st_mode)==0o700,'DB yedeği dizin kimliği değişmiş')
 return p

def adopt_backup(directory,record):
 # backup_database journals in its own private attempt directory. If killed
 # between that fsync and our main journal fsync, recover the verified metadata.
 folder=backup_folder(directory,record)
 if folder is not None and not record.get('databaseBackup') and (folder/'journal.json').is_file():
  previous=read(folder/'journal.json')
  require(previous.get('version')==VERSION and previous.get('database')==record['database'] and previous.get('backupAttempt')==record['backupAttempt'],'DB yedeği doğrulama kaydı farklı')
  if previous.get('databaseBackup'):record['databaseBackup']=previous['databaseBackup']

def take_backup(live,directory,record):
 # A distinct attempt avoids touching an incomplete backup left by process
 # death. Such an unverified file is never a restore source or silently removed.
 if record.get('backupAttempt'):
  record.setdefault('previousBackupAttempts',[]).append(record['backupAttempt'])
 folder=directory/('database-'+os.urandom(8).hex());folder.mkdir(mode=0o700);sync_dir(directory);s=folder.stat()
 record['backupAttempt']={'directory':folder.name,'device':s.st_dev,'inode':s.st_ino};record.pop('databaseBackup',None)
 write_record(directory,record,record['phase'])
 old.backup_database(live,folder,record,old.installation_window())
 write_record(directory,record,record['phase']);check_backup(directory,record)

def check_backup(directory,record):
 adopt_backup(directory,record)
 row=record.get('databaseBackup',{})
 require(row.get('status')=='verified' and row.get('quickCheck')=='ok' and row.get('file')=='game.sqlite','Doğrulanmış kurulum DB yedeği bulunamadı')
 folder=backup_folder(directory,record);require(folder is not None,'Kurulum DB yedeği dizini yok')
 p=folder/'game.sqlite';require(p.is_file() and not p.is_symlink(),'Kurulum DB yedeği kayıp')
 s=p.stat();require((s.st_dev,s.st_ino,s.st_size)==(row['dev'],row['ino'],row['bytes']),'Kurulum DB yedeği dışarıdan değişmiş')

def cancel_preparation(live,directory,record):
 # Preparing/prepared phases precede the gate, guards and every live mutation.
 stable_accounts(live,record,allow_restart=True)
 require(saved_matches(record['beforeState']) and saved_matches(record['beforeDropin']) and saved_matches(record['beforeConfig']),'Yarım hazırlıkta canlı ayarlar değişmiş')
 inplace.validate(live.root,directory,record['files'],before_only=True,backups=False)
 write_record(directory,record,'cancelled');clear_active(directory)
 say('Yarım hazırlık iptal edildi; oyun dosyaları ve veritabanı değişmedi.')

def rollback(live,directory,record,plan,payload_updates,*,manual=False):
 validate_record(live,directory,record,plan,payload_updates);stable_accounts(live,record,allow_restart=True)
 states=inplace.validate(live.root,directory,record['files'])
 live.empty()
 if manual:
  require(allowed_policy(live.central()),'Geri almak için ön kayıt veya tamamlanmış bakım modu gerekli')
  record['rollbackBackupPending']=True;write_record(directory,record,'gating-rollback')
 gate_for_recovery(live,directory,record,fresh=manual)
 guards(record,True);write_record(directory,record,'rollback-stopping');stop_game(record);ensure_quiet(record)
 live.same_database();live.empty();assert_frame(live,record)
 changed=any(s=='after' for s in states) or not saved_matches(record['beforeState'])
 if record.get('rollbackBackupPending'):
  # The installation backup has already been removed. Take a new, current
  # backup before a later operator-requested code rollback; never restore it.
  write_record(directory,record,'rollback-backup')
  adopt_backup(directory,record)
  if record.get('databaseBackup',{}).get('status')!='verified':take_backup(live,directory,record)
  check_backup(directory,record);record['rollbackBackupPending']=False;write_record(directory,record,'rollback-backup')
 elif changed:check_backup(directory,record)
 write_record(directory,record,'rolling-back')
 inplace.restore(live.root,directory,record,lambda:write_record(directory,record,record['phase']))
 require(saved_matches(record['beforeState']) or saved_matches(record['afterState']),'STATE geri alma sırasında değişmiş')
 if not saved_matches(record['beforeState']):restore_file(record['beforeState'])
 previous=Live();previous.same_database();stable_accounts(previous,record)
 verify_release(previous.root,record['beforeCore'])
 from runtime_stage import assert_runtime
 assert_runtime(previous.root,record['runtimePlan'])
 assert_frame(previous,record);write_record(directory,record,'rollback-starting')
 try:
  guards(record,False);start_game(record);previous.ready(record);assert_frame(previous,record)
 except BaseException:
  failure_fence(record);raise
 write_record(directory,record,'rolled-back-validated')
 finish(previous,directory,record,rolled_back=True)

def deploy(live,plan,updates):
 payload_updates=updates
 accounts,policy,core,stats=preflight(live,plan)
 if live.state.get('r64Deployment',{}).get('version')==VERSION:
  live.health();say('R85 zaten kurulu; yerinde dosyalar ve mevcut çalışma zamanı doğrulandı.');return False
 updates=prepare_updates(live,plan,updates);stats.update(expanded_space(live,updates))
 rows,directories=inplace.describe(live.root,updates)
 token=time.strftime('%Y%m%dT%H%M%SZ',time.gmtime())+'-'+os.urandom(4).hex();directory=ROOT/token;directory.mkdir(mode=0o700);sync_dir(ROOT)
 units=[live.unit]
 if prop(live.rt_unit,'LoadState')!='not-found' and prop(live.rt_unit,'ActiveState')=='active':units.append(live.rt_unit)
 record={'version':VERSION,'kind':'inplace-r85','planSHA256':plan_identity(plan),'phase':'preparing','root':str(live.root),
  'accounts':accounts,'policy':policy,'database':live.db_identity,'units':units,'beforeCore':core,'targetCore':plan['targetCore'],
  'beforeState':file_record(STATE),'afterState':state_after(live,directory,plan['targetCore']),
  'beforeDropin':file_record(unit_path(live.unit)),'beforeConfig':file_record(live.config_file),
  'files':rows,'createdDirectories':directories,'runtimePlan':{'runtime':plan['runtime'],'files':{}},'space':stats,'backupBinding':live.backup_binding()}
 write_record(directory,record,'preparing')
 try:
  inplace.store_backups(live.root,directory,rows);inplace.validate(live.root,directory,rows,before_only=True)
  write_record(directory,record,'prepared')
  validate_record(live,directory,record,plan,payload_updates);live.empty();assert_frame(live,record,False)
  write_record(directory,record,'gating');live.central('gate',policy)
  guards(record,True);write_record(directory,record,'stopping');stop_game(record);ensure_quiet(record)
  live.empty();live.same_database();assert_frame(live,record)
  write_record(directory,record,'database-backup')
  take_backup(live,directory,record)
  live.same_database();assert_frame(live,record);write_record(directory,record,'writing')
  inplace.apply(live.root,directory,record,updates,lambda:write_record(directory,record,record['phase']))
  require(saved_matches(record['beforeState']),'STATE kurulum sırasında değişmiş')
  restore_file(record['afterState']);write_record(directory,record,'selected')
  selected=Live();verify_release(selected.root,record['targetCore'])
  from runtime_stage import assert_runtime
  assert_runtime(selected.root,record['runtimePlan']);assert_frame(selected,record)
  guards(record,False);write_record(directory,record,'starting');start_game(record)
  selected.ready(record);assert_frame(selected,record);write_record(directory,record,'validated')
 except BaseException:
  say('Kurulum tamamlanamadı. Hesap servisi açık tutularak yalnız oyun kodu geri alınıyor.')
  try:
   if record['phase'] in ('preparing','prepared'):cancel_preparation(live,directory,record)
   else:
    # A failed health/start attempt must not leave unvalidated code running.
    failure_fence(record)
    rollback(Live(),directory,record,plan,payload_updates)
  except BaseException:
   say('Kurtarma gerekli: aynı R85 paketiyle --recover çalıştırın. Güncel veritabanı geri alınmadı; hesap servisi durdurulmadı.')
  raise
 finish(selected,directory,record);return True

def load_package(path):
 with zipfile.ZipFile(path) as z:
  names=z.namelist();require(len(names)==len(set(names)),'Paket içinde tekrarlanan ZIP dosyası var')
  plan=json.loads(z.read('update.json'));updates=[]
  require(plan.get('protocol')==1 and isinstance(plan.get('files'),dict) and bool(plan['files']),'Güncelleme protokolü geçersiz')
  validate_scope(plan)
  for name,meta in plan['files'].items():
   require(not name.startswith(('/','.')) and '..' not in Path(name).parts and str(Path(name))==name and '\\' not in name,'Paket dosya yolu geçersiz')
   require((meta.get('before') is None or re.fullmatch(r'[0-9a-f]{64}',meta['before'])) and re.fullmatch(r'[0-9a-f]{64}',meta.get('after','')) and type(meta.get('bytes')) is int and meta['bytes']>0,'Paket SHA/uzunluk kaydı geçersiz')
   data=z.read('payload/'+name);require(len(data)==meta['bytes'] and hashlib.sha256(data).hexdigest()==meta['after'],'Paket bütünlüğü bozuk')
   updates.append((name,meta,data))
  require({n for n in names if n.startswith('payload/') and not n.endswith('/')}=={'payload/'+n for n in plan['files']},'Paket delta dosya listesi farklı')
 return plan,updates

def recover(live,plan,payload_updates,*,manual=False):
 if manual:
  require(not ACTIVE.exists(),'Önce --recover çalıştırın')
  require(live.state.get('r64Deployment',{}).get('version')==VERSION,'Geri alınacak R85 kurulumu yok')
  directory=Path(live.state['r64Deployment']['journal']).parent
 else:
  if not ACTIVE.exists():say('Yarım R85 işlemi yok.');return
  require(not ACTIVE.is_symlink(),'Etkin işlem kaydı geçersiz');directory=Path(read(ACTIVE)['directory'])
 require(directory.parent==ROOT and directory.resolve()==directory and not directory.is_symlink(),'Kurtarma kaydı kapsamı geçersiz')
 record=read(directory/'journal.json');validate_record(live,directory,record,plan,payload_updates)
 stable_accounts(live,record,allow_restart=True)
 phase=record['phase']
 if manual:
  require(phase=='complete','Geri almak için tamamlanmış R85 kaydı gerekli')
  core=initial_core(live,plan);verify_release(live.root,core)
  rollback(live,directory,record,plan,payload_updates,manual=True);return
 if phase in ('preparing','prepared','cancelled'):
  cancel_preparation(live,directory,record);return
 if phase in ('validated','complete','rolled-back-validated','rolled_back'):
  back=phase in ('rolled-back-validated','rolled_back')
  inplace.validate(live.root,directory,record['files'],before_only=back)
  require(saved_matches(record['beforeState'] if back else record['afterState']),'Tamamlanacak sürüm STATE kimliği farklı')
  verify_release(live.root,record['beforeCore'] if back else record['targetCore'])
  from runtime_stage import assert_runtime
  assert_runtime(live.root,record['runtimePlan'])
  try:
   guards(record,False);start_game(record);live.ready(record,empty=False)
  except BaseException:
   failure_fence(record);raise
  finish(live,directory,record,rolled_back=back);return
 require(phase in ('gating','stopping','database-backup','writing','selected','starting','gating-rollback','rollback-stopping','rollback-backup','rolling-back','rollback-starting'),'Kurtarma aşaması tanınmıyor')
 rollback(live,directory,record,plan,payload_updates)

def main(argv=None,archive=None):
 p=argparse.ArgumentParser(description=__doc__);actions=p.add_mutually_exclusive_group(required=True)
 for flag in ('check','apply','recover','rollback-latest','disk-report'):actions.add_argument('--'+flag,action='store_true')
 p.add_argument('--archive',default=archive);a=p.parse_args(argv)
 require(os.geteuid()==0,'Root olarak çalıştırın');require(a.archive,'Güncelleme paketi gerekli')
 plan,updates=load_package(a.archive)
 require(not RESET_ACTIVE.exists(),'Hesap sıfırlaması sürüyor. SIFIRLAMA TAMAMLANDI mesajını bekleyin.')
 live=Live()
 if a.disk_report:
  say('Disk alanı dağılımı (yalnız okuma):')
  r=subprocess.run(['/usr/bin/du','-x','-h','-d','2',str(RELEASES),str(STATE.parent),'/var/lib/coreoflife-realms-417','/var/tmp','/var/log'],capture_output=True,text=True,timeout=120)
  say(r.stdout);return
 if a.check:
  require(not ACTIVE.exists(),'Yarım güncelleme var; ilgili paketle --recover kullanın')
  accounts,policy,core,stats=preflight(live,plan)
  if live.state.get('r64Deployment',{}).get('version')!=VERSION:
   expanded=prepare_updates(live,plan,updates);inplace.describe(live.root,expanded);stats.update(expanded_space(live,expanded))
  say(json.dumps({'uygun':True,'surum':VERSION,'onKayit':policy['phase']=='waiting','hesapServisiYenidenBaslatilacak':False,'veritabaniGeriAlinacak':False,'ayriOyunSurumu':False,'yerindeGuncelleme':True,**stats},ensure_ascii=False));return
 ROOT.mkdir(parents=True,exist_ok=True,mode=0o700);require(not ROOT.is_symlink() and ROOT.stat().st_uid==0 and stat.S_IMODE(ROOT.stat().st_mode)==0o700,'İşlem dizini izinleri geçersiz')
 with lock(STATE.parent/'r23-backups/install.lock'):
  require(not RESET_ACTIVE.exists(),'Sıfırlama sürüyor');live=Live()
  locked_database=live.db_identity
  locked_backup=live.backup_binding()
  with old.scheduled_backup_lock(live):
   # Refresh all live identities after waiting for the daily backup lock.
   live=Live();require(live.db_identity==locked_database,'Günlük yedek kilidi beklenirken oyun veritabanı değişti')
   require(live.backup_binding()==locked_backup,'Günlük yedek servisi kilit beklenirken değişti')
   require(not RESET_ACTIVE.exists(),'Sıfırlama sürüyor')
   if a.recover or a.rollback_latest:recover(live,plan,updates,manual=a.rollback_latest);return
   require(not ACTIVE.exists(),'Yarım güncelleme var; ilgili paketle --recover kullanın')
   deploy(live,plan,updates)

if __name__=='__main__':
 try:main()
 except (Exception,KeyboardInterrupt) as error:
  say('DURDU: '+(str(error) if isinstance(error,RuntimeError) else type(error).__name__));sys.exit(1)
