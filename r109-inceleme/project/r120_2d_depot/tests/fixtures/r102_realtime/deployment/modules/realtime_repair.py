"""Independent, code-only repair of the known R101 Academy RT bootstrap.

Never edit the immutable native tree or grant Academy the primary controller key.
This prerequisite survives a later R102 content rollback (same RT protocol).
"""
import hashlib,json,os,re,shutil,stat,time,uuid
from pathlib import Path
from storage import atomic,digest,encoded,read,require,sync_dir
HERE=Path(__file__).resolve().parent
UNIT='coreoflife-rt-r2.service'
NATIVE='native510-bb3a6cc689c6'
SOURCE_SHA='d35482bb1d2e0d28e3086d0e81ca35c9c0a159bf8f8fdf2abf98e5a9cd3204b3'
VERSION='R102_REALTIME1'
CONTROL=Path('/var/lib/core511/r102-realtime-repair')
LIBRARY=Path('/usr/local/lib/core102')
ROOT_UID=0

def trusted(path,directory=False):
 p=Path(path);s=p.lstat()
 require(not p.is_symlink() and s.st_uid==ROOT_UID and not s.st_mode&0o022 and (stat.S_ISDIR(s.st_mode) if directory else stat.S_ISREG(s.st_mode)),'Bağlantı onarım dosyası sahibi/izni farklı: '+str(p))
 return p

def compose(source,native,ws):
 require(hashlib.sha256(source).hexdigest()==SOURCE_SHA,'Bağlantı sunucusu beklenen R101 kaynağı değil')
 s=source.decode();old="""export function createRealtimeServer() {
  const labRuntimeConfig = loadRuntimeConfig(process.env.CORE_LOADLAB_RUNTIME_FILE);
  if (!labRuntimeConfig) throw Error("loadlab_runtime_configuration_required");
  const labRegistryHandle = installRegistry({config:labRuntimeConfig});
  const labGuard = createLabRealtimeGuard({key:labRuntimeConfig.controlKey});"""
 new="""export function createRealtimeServer(profile) {
  if (profile?.realmId !== 'r2' || !profile.registryHandle || !profile.guard) throw Error('academy_realtime_profile_required');
  const labRegistryHandle = profile.registryHandle;
  const labGuard = profile.guard;"""
 require(s.count(old)==1,'Bağlantı başlangıç sözleşmesi farklı');s=s.replace(old,new)
 marker='{ ok: true, loadlabProtocol: 1,'
 require(s.count(marker)==2,'Bağlantı sağlık sözleşmesi farklı')
 s=s.replace(marker,"{ ok: true, realmId:profile.realmId, dbIdentity:profile.dbIdentity, transportRepairVersion:'"+VERSION+"', loadlabProtocol: 1,")
 # Resolve all original imports as if still in native/realtime-server/src.
 def ref(m):
  spec=m[2]
  if spec.startswith('.'):spec=(native/'realtime-server/src'/spec).resolve().as_uri()
  elif spec=='ws':spec=Path(ws).resolve().as_uri()
  else:require(spec.startswith('node:'),'Beklenmeyen bağlantı modülü')
  return m[1]+json.dumps(spec)
 s=re.sub(r'(\bfrom\s+)[\'"]([^\'"]+)[\'"]',ref,s)
 # Entry below belongs to the immutable native executable only. The new entry
 # handles the same security readiness and shutdown, plus closes its registry.
 at=s.index('if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {')
 return s[:at].encode()

def bundle(live,ops):
 native=live.root/NATIVE;source=native/'realtime-server/src/server.mjs'
 require(digest(source)==SOURCE_SHA,'Kurulu bağlantı kaynağı farklı')
 resolver="import{createRequire}from'node:module';console.log(createRequire(process.argv[1]).resolve('ws'))"
 ws=Path(ops.run([live.node,'--input-type=module','-e',resolver,source])).resolve().parent/'wrapper.mjs'
 require(ws.is_file() and ws.is_relative_to(live.root),'WebSocket bağımlılığı sürüm dışında')
 files={'server.mjs':compose(source.read_bytes(),native,ws)}
 for n in ('realtime-entry.mjs','realtime-profile.mjs'):files[n]=(HERE/n).read_bytes()
 m={'version':VERSION,'root':str(live.root),'config':str(live.configs['r2']),'files':{n:hashlib.sha256(b).hexdigest() for n,b in files.items()}}
 files['bundle.json']=encoded(m)
 key=hashlib.sha256(encoded({n:hashlib.sha256(b).hexdigest() for n,b in files.items()})).hexdigest()
 target=LIBRARY/('academy-realtime-'+key[:16])
 override=('[Service]\nExecStart=\nExecStart='+str(live.node)+' '+str(target/'realtime-entry.mjs')+' '+str(live.root)+' '+str(live.configs['r2'])+'\n').encode()
 return {'key':key,'target':str(target),'files':files,'override':override,'dropin':str(ops.SYSTEMD/(UNIT+'.d')/'zz-r102-realtime.conf')}

EXPECTED_UNIT='[Unit]\nDescription=Core Akademi realtime\nAfter=network.target\nStartLimitIntervalSec=120\nStartLimitBurst=5\n[Service]\nUser=col-r2\nGroup=col-r2\nWorkingDirectory=/RELEASE/native510-bb3a6cc689c6\nExecStart=/RELEASE/bin/node /RELEASE/native510-bb3a6cc689c6/realtime-server/src/server.mjs\nEnvironmentFile=/DATA/realtime.env\nRestart=on-failure\nRestartSec=10\nMemoryMax=256M\nKillMode=control-group\nUMask=0077\nNoNewPrivileges=yes\nPrivateTmp=yes\nProtectSystem=strict\nProtectHome=yes\nReadWritePaths=/DATA\n[Install]\nWantedBy=multi-user.target\n'

def expected_unit(live):
 for path in (live.root,live.configs['r2'].parent):require(re.fullmatch(r'/[A-Za-z0-9_./-]+',str(path)) and '..' not in path.parts,'Servis yolu farklı')
 return EXPECTED_UNIT.replace('/RELEASE',str(live.root)).replace('/DATA',str(live.configs['r2'].parent)).encode()

def validate_unit(live,ops):
 require(ops.prop(UNIT,'User')=='col-r2' and ops.prop(UNIT,'Group')=='col-r2','Akademi bağlantı servis kullanıcısı farklı')
 trusted(ops.SYSTEMD,True);unit=trusted(ops.SYSTEMD/UNIT)
 require(unit.read_bytes()==expected_unit(live),'Akademi bağlantı servis tanımı farklı')
 allowed={'zz-r102-realtime.conf','zz-r101-guard.conf','zz-r102-guard.conf'}
 folder=ops.SYSTEMD/(UNIT+'.d')
 if folder.exists():trusted(folder,True)
 dropins=set(map(Path,ops.prop(UNIT,'DropInPaths').split()))|set(folder.glob('*.conf'))
 for name in dropins:
  p=trusted(name);require(p.parent==folder and p.name in allowed,'Beklenmeyen Akademi bağlantı ek ayarı')
  if p.name!='zz-r102-realtime.conf':
   control=ops.STATE.parent/('r101' if p.name=='zz-r101-guard.conf' else 'r102-updates')
   require(p.read_bytes()==('[Unit]\nConditionPathExists=!'+str(control/'blocked')+'\n').encode() and not (control/'blocked').exists(),'Başka kurulum bağlantı servisini kapalı tutuyor')

def verify_files(plan):
 target=trusted(plan['target'],True)
 require({p.name for p in target.iterdir()}==set(plan['files']),'Bağlantı kod klasörü kapsamı farklı')
 for name,data in plan['files'].items():require(trusted(target/name).read_bytes()==data,'Bağlantı onarım kodu değişmiş')

def inspect(live,ops):
 validate_unit(live,ops);plan=bundle(live,ops);record=CONTROL/'record.json';dropin=Path(plan['dropin'])
 require(not CONTROL.is_symlink() and not record.is_symlink() and not dropin.is_symlink(),'Bağlantı onarım yolu sembolik bağ')
 if record.exists():
  trusted(CONTROL,True);j=read(trusted(record))
  require(j['version']==VERSION and j['key']==plan['key'] and j['root']==str(live.root) and j['dropin']==plan['dropin'] and j['before']['exists'] is False,'Bağlantı onarım kaydı farklı')
  require(j['phase'] in ('prepared','switched','healthy','restored') and j['unitSHA256']==digest(ops.SYSTEMD/UNIT) and isinstance(j['before'].get('active'),bool),'Bağlantı onarım aşaması/servisi farklı')
  verify_files(plan)
  require(not dropin.exists() or trusted(dropin).read_bytes()==plan['override'],'Bağlantı ek ayarı dışarıdan değişmiş')
 elif dropin.exists():raise RuntimeError('Kayıtsız Akademi bağlantı ek ayarı var')
 else:j=None
 plan['record']=j;plan['needed']=not(j and j['phase']=='healthy' and dropin.exists())
 return plan

def wait_ready(live,ops,request,timeout=30):
 realm=next(r for r in live.manifest['realms'] if r['id']=='r2');end=time.monotonic()+timeout;error='henüz yanıt yok'
 while time.monotonic()<end:
  try:
   require(ops.prop(UNIT,'ActiveState')=='active','servis çalışmıyor')
   for route in ('/healthz','/readyz'):
    h=request(realm['ports']['realtime'],route)
    require(h.get('ok') is True and h.get('protocol')=='col-realtime-1' and h.get('realmId')=='r2' and h.get('dbIdentity')==realm['dbIdentity'] and h.get('transportRepairVersion')==VERSION,'bağlantı kimliği/hazırlığı farklı')
   return
  except Exception as e:error=str(e)[:140]
  time.sleep(.5)
 raise RuntimeError('Akademi bağlantı servisi hazır olmadı: '+error)

def apply(live,ops,request):
 plan=inspect(live,ops);dropin=Path(plan['dropin']);target=Path(plan['target']);j=plan['record']
 if not plan['needed']:
  if ops.prop(UNIT,'ActiveState')!='active':ops.service(UNIT,'reset-failed');ops.service(UNIT,'start')
  wait_ready(live,ops,request);return
 for parent,mode in ((LIBRARY,0o755),(CONTROL,0o700)):
  trusted(parent.parent,True)
  if not parent.exists():parent.mkdir(mode=mode);parent.chmod(mode);sync_dir(parent.parent)
  trusted(parent,True)
 if target.exists():verify_files(plan)
 else:
  stage=LIBRARY/('.realtime-'+uuid.uuid4().hex);stage.mkdir(mode=0o755);stage.chmod(0o755)
  try:
   for name,data in plan['files'].items():atomic(stage/name,data,0o644,(ROOT_UID,os.getgid()))
   sync_dir(stage);os.rename(stage,target);sync_dir(LIBRARY)
  finally:
   if stage.exists():shutil.rmtree(stage)
 verify_files(plan)
 if not j:
  j={'version':VERSION,'key':plan['key'],'root':str(live.root),'dropin':plan['dropin'],'target':plan['target'],'phase':'prepared','before':{'exists':False,'active':ops.prop(UNIT,'ActiveState')=='active'},'unitSHA256':digest(ops.SYSTEMD/UNIT)}
  atomic(CONTROL/'record.json',encoded(j))
 # Check access using the actual service account before any service is stopped.
 ops.run(['runuser','-u','col-r2','--',live.node,'--input-type=module','-e',"import fs from 'node:fs';for(const p of process.argv.slice(1))fs.accessSync(p,fs.constants.R_OK);",live.configs['r2'],target/'realtime-entry.mjs',target/'server.mjs'])
 try:
  if not dropin.parent.exists():dropin.parent.mkdir(mode=0o755);dropin.parent.chmod(0o755);sync_dir(dropin.parent.parent)
  trusted(dropin.parent,True)
  ops.service(UNIT,'stop');atomic(dropin,plan['override'],0o644,(ROOT_UID,os.getgid()));j['phase']='switched';atomic(CONTROL/'record.json',encoded(j));ops.reload()
  ops.service(UNIT,'reset-failed');ops.service(UNIT,'start');wait_ready(live,ops,request)
 except BaseException:
  ops.service(UNIT,'stop')
  if dropin.exists():require(trusted(dropin).read_bytes()==plan['override'],'Onarım sırasında bağlantı ek ayarı değişti');dropin.unlink();sync_dir(dropin.parent)
  ops.reload();j['phase']='restored';atomic(CONTROL/'record.json',encoded(j))
  # Restore a previously running legacy transport, but never restart an already
  # failed original or enter the content updater after this failure.
  if j['before']['active']:ops.service(UNIT,'reset-failed');ops.service(UNIT,'start')
  raise
 j['phase']='healthy';atomic(CONTROL/'record.json',encoded(j));ops.say('Akademi bağlantı servisi onarıldı; yerel bağlantı ve kimlik doğrulandı.')
