"""Isolated filesystem/SQLite fixture for the real R81 Python installer.

Only OS services/accounts HTTP and full external Node release verification are
substituted. Source identity, plan gates, backups, SQLite, locks, atomic overlays,
STATE, startup guards, journals and recovery execute the actual shipped modules.
"""
import contextlib,copy,hashlib,importlib.util,json,os,sqlite3,stat,sys,tempfile
from pathlib import Path
from unittest.mock import patch

BASE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(BASE/'r81-package/modules'))
import installer as I
import inplace_stage as S
import runtime_stage as R
from storage import atomic,digest,encoded,read,require,descriptor

def sha(data):return hashlib.sha256(data).hexdigest()
def put(path,data,mode=0o644):
 path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data);path.chmod(mode)
def runtime_plan():
 return {'path':R.NODE,'licensePath':R.LICENSE,'sha256':R.NODE_SHA256,'bytes':R.NODE_BYTES,'versions':R.VERSIONS,'linkPath':'bin/node','linkTarget':R.LINK,'archiveSHA256':R.ARCHIVE_SHA256}

class Fixture:
 def __init__(self,path):
  self.base=Path(path);self.root=self.base/'releases/game-r80';self.accounts_root=self.base/'releases/accounts';self.state_file=self.base/'var/state.json';self.work=self.base/'var/r64-updates';self.systemd=self.base/'systemd';self.config_file=self.base/'config/game.json';self.accounts_file=self.base/'config/accounts.json'
  self.database=self.base/'data/game.sqlite';self.account_db=self.base/'account-data/accounts.sqlite';self.unit='coreoflife-r1.service';self.rt='coreoflife-rt-r1.service';self.acc='coreoflife-accounts.service'
  self.backup_unit='coreoflife-r1-backup.service';self.backup_environment_files='';self.backup_pass='';self.backup_unset=''
  self.policy_file=self.base/'policy.json';self.service_file=self.base/'services.json';self.events_file=self.base/'events.json';self.fail_target=False;self.fail_previous=False;self.write_on_fail=False
  self.root.mkdir(parents=True);self.accounts_root.mkdir(parents=True);self.work.mkdir(parents=True,mode=0o700);self.work.chmod(0o700);self.database.parent.mkdir();(self.database.parent/'backups').mkdir();self.account_db.parent.mkdir()
  with contextlib.closing(sqlite3.connect(self.database)) as db, db:
   db.executescript('CREATE TABLE game_presence(expires_at_ms INTEGER); CREATE TABLE players(last_seen INTEGER); CREATE TABLE kernel511_admissions(id INTEGER); CREATE TABLE progress(id INTEGER PRIMARY KEY, value INTEGER); INSERT INTO progress VALUES(1,10);')
  with contextlib.closing(sqlite3.connect(self.account_db)) as db, db:db.executescript('CREATE TABLE accounts(id INTEGER PRIMARY KEY, name TEXT); INSERT INTO accounts VALUES(1,"before");')
  self.db_identity=descriptor(self.database);self.account_identity=descriptor(self.account_db)
  self.before_a=b'export const value = 80;\n';self.after_a=b'export const value = 81;\n';self.new_data=b'export const newRewardScope = true;\n';self.before_b=b"export const updateVersion='R80_GAMEPLAY';\n";self.after_b=b"export const updateVersion='R81_GAMEPLAY';\n";self.before_native=b'export const checkpoint = 80;\n';self.after_native=self.before_native;self.http=b'fixture unchanged http\n';self.timing=b'fixture unchanged timing\n';self.node=b'fixture unchanged runtime\n'
  self.a=I.old.CORE+'abandoned-normal.mjs';self.b=I.old.CORE+'native-http-bindings.mjs'
  for name,data in ((self.a,self.before_a),(self.b,self.before_b),(I.NATIVE_CHECKPOINT,self.before_native),(I.HTTP,self.http),(I.NATIVE_TIMING,self.timing),('bin/node',self.node)):
   put(self.root/name,data,0o755 if name=='bin/node' else 0o644)
  core_rows=[{'path':'abandoned-normal.mjs','sha256':sha(self.before_a),'bytes':len(self.before_a)},{'path':'native-http-bindings.mjs','sha256':sha(self.before_b),'bytes':len(self.before_b)}];self.before_core=I.old.identity_from_rows(core_rows)
  operations=("export const CANDIDATE='"+self.before_core+"';\nexport const fixture = true;\n").encode();put(self.root/I.old.OPS,operations)
  manifest={'baselineSha256':'fixture-native-baseline','runtimeSha256':self.before_core,'files':[],'symlinks':[]}
  for name in (self.a,self.b,I.NATIVE_CHECKPOINT,I.HTTP,I.NATIVE_TIMING,'bin/node',I.old.OPS):
   p=self.root/name;manifest['files'].append({'path':name,'bytes':p.stat().st_size,'sha256':digest(p),'executable':name=='bin/node'})
  put(self.root/'release-manifest.json',encoded(manifest))
  central_manifest=self.base/'config/realms.json'
  put(central_manifest,encoded({'primaryRealmId':'r1','accountsDatabase':str(self.account_db),'realms':[{'id':'r1','database':str(self.database),'dataRoot':str(self.database.parent)}]}))
  config={'database':str(self.database),'delivery511':{'releaseRoot':str(self.root),'appPort':19999},'realm':{'id':'r1','manifestFile':str(central_manifest),'dbIdentity':'fixture-game'},'environment':{'CORE_WAL_CHECKPOINT_WORKER':'1'}}
  put(self.config_file,encoded(config),0o600);put(self.accounts_file,encoded({'database':str(self.account_db)}),0o600)
  self.backup_environment={'CORE_DATA_ROOT':str(self.database.parent),'CORE_CONFIG_FILE':str(self.config_file)}
  self.backup_unit_file=self.systemd/self.backup_unit;put(self.backup_unit_file,b'[Service]\n# stock backup fixture\n')
  self.dropin=self.systemd/(self.unit+'.d')/'92-core511-r64.conf';put(self.dropin,b'[Service]\n# R80 unchanged binding\n')
  state={'installed':True,'releaseRoot':str(self.root),'candidate':self.before_core,'prior':{'gameUnit':self.unit,'accountsUnit':self.acc,'newGameConfigFile':str(self.config_file),'newAccountsConfigFile':str(self.accounts_file),'database':str(self.database),'databaseIdentity':{'dev':self.db_identity['device'],'ino':self.db_identity['inode']}},'r64Deployment':{'version':I.SOURCE_VERSION,'accountsRoot':str(self.accounts_root),'journal':str(self.base/'old/journal.json'),'dropinSHA256':digest(self.dropin),'protocol':1}}
  put(self.state_file,encoded(state),0o600);self.before_state=self.state_file.read_bytes();self.before_config=self.config_file.read_bytes();self.before_dropin=self.dropin.read_bytes()
  self.policy={'phase':'maintenance','mode':'maintenance','enabled':0,'revision':244,'deadlineMs':0,'registrationOpen':True,'realm':{'status':'open','registrationOpen':True}}
  put(self.policy_file,encoded(self.policy));put(self.service_file,encoded({self.unit:'active',self.rt:'active',self.acc:'active',self.backup_unit:'inactive'}));put(self.events_file,b'[]')
  files={}
  for name,before,after in ((self.a,self.before_a,self.after_a),(self.b,self.before_b,self.after_b)):
   files[name]={'before':sha(before) if before is not None else None,'after':sha(after),'bytes':len(after)}
  self.plan={'version':I.VERSION,'sourceVersion':I.SOURCE_VERSION,'protocol':1,'databaseChanges':False,'databaseSchemaChanges':False,'databaseScope':'none','accountsChanges':False,'clientChanges':False,'nativeBaseline':manifest['baselineSha256'],'baseCoreRows':core_rows,'baseCoreSHA256':self.before_core,'operationsCanonicalSHA256':sha(operations.replace(self.before_core.encode(),b'R66_BASE_CORE')),'httpEntrySHA256':sha(self.http),'runtime':runtime_plan(),'files':files}
  self.updates=[(self.a,files[self.a],self.after_a),(self.b,files[self.b],self.after_b)]
  self.stack=contextlib.ExitStack()
  overrides={'STATE':self.state_file,'ROOT':self.work,'ACTIVE':self.work/'active.json','SYSTEMD':self.systemd,'RELEASES':self.root.parent,'RESET_ACTIVE':self.base/'no-reset','R79_HTTP_SHA256':sha(self.http),'R78_NATIVE_TIMING_SHA256':sha(self.timing),'R80_NATIVE_CHECKPOINT_SHA256':sha(self.before_native),'command':self.command,'verify_release':self.verify_release,'say':lambda message:self.event('say',message)}
  for name,value in overrides.items():self.stack.enter_context(patch.object(I,name,value))
  self.stack.enter_context(patch.object(R,'prepare_manifest',lambda root,manifest,plan:R.validate_plan(plan)))
  self.stack.enter_context(patch.object(R,'assert_runtime',self.assert_runtime))
  f=self;ActualLive=I.Live
  class FixtureLive(ActualLive):
   def accounts_identity(self):
    require(read(f.service_file)[f.acc]=='active','fixture accounts down')
    return {'pid':12345,'start':'unchanged','root':str(f.accounts_root),'configSHA256':digest(f.accounts_file),'database':descriptor(f.account_db),'unitFiles':{'fixture-accounts':'unchanged'}}
   def active_binding(self):
    require(read(f.service_file)[f.unit]=='active','fixture game not active');self.same_database();require(digest(f.dropin)==self.state['r64Deployment']['dropinSHA256'],'fixture binding changed')
   def central(self,operation='snapshot',expected=None):
    policy=read(f.policy_file)
    if operation=='gate':
     require(policy==expected,'fixture policy changed');policy['realm']['status']='maintenance';put(f.policy_file,encoded(policy));f.event('gate')
    elif operation=='restore':
     if policy['realm']=={**expected['realm'],'status':'maintenance'}:policy['realm']=expected['realm'];put(f.policy_file,encoded(policy))
     f.event('restore-policy')
    return policy
   def health(self,empty=True):
    self.active_binding();f.verify_release(self.root,self.state['candidate'])
    if empty:self.empty()
   def ready(self,record,empty=True):
    self.account_stable(record['accounts']);version=self.state['r64Deployment']['version']
    if (f.fail_target and version==I.VERSION) or (f.fail_previous and version==I.SOURCE_VERSION):
     if f.write_on_fail:
      with contextlib.closing(sqlite3.connect(f.database)) as db, db:db.execute('UPDATE progress SET value=20 WHERE id=1')
      with contextlib.closing(sqlite3.connect(f.account_db)) as db, db:db.execute('INSERT INTO accounts VALUES(2,"during-update")')
     raise RuntimeError('injected health failure')
    self.health(empty=empty)
  self.stack.enter_context(patch.object(I,'Live',FixtureLive))
  self.original_backup=I.old.backup_database
  def measured_backup(live,directory,record,deadline):
   f.event('backup-start',record['phase']);result=f.original_backup(live,directory,record,deadline)
   with contextlib.closing(sqlite3.connect(directory/'game.sqlite')) as db, db:require(db.execute('PRAGMA quick_check').fetchall()==[('ok',)],'fixture quick_check failed')
   f.event('backup-verified');return result
  self.stack.enter_context(patch.object(I.old,'backup_database',measured_backup))
 def close(self):self.stack.close()
 def event(self,*data):
  rows=read(self.events_file);rows.append(list(data));put(self.events_file,encoded(rows))
 def events(self):return read(self.events_file)
 def command(self,args,timeout=90):
  require(args[0]=='/usr/bin/systemctl','unexpected external command in fixture')
  operation=args[1];states=read(self.service_file)
  if operation=='show':
   unit=args[2];field=args[3].split('=',1)[1]
   if field=='ActiveState':return states.get(unit,'inactive')
   if field=='LoadState':return 'loaded' if unit in states else 'not-found'
   if unit==self.backup_unit:
    if field=='EnvironmentFiles':return self.backup_environment_files
    if field=='PassEnvironment':return self.backup_pass
    if field=='UnsetEnvironment':return self.backup_unset
    if field=='Environment':return ' '.join(key+'='+value for key,value in self.backup_environment.items())
    if field=='FragmentPath':return str(self.backup_unit_file)
    if field=='DropInPaths':return ''
   raise AssertionError(field)
  if operation=='daemon-reload':self.event('daemon-reload');return ''
  unit=args[2];require(unit!=self.acc,'accounts service MUST NEVER be touched')
  if operation=='stop':states[unit]='inactive'
  elif operation=='start':
   require(not I.guard_path(unit).exists() or not I.ACTIVE.exists(),'fixture startup guard blocked')
   states[unit]='active'
  else:raise AssertionError(operation)
  put(self.service_file,encoded(states));self.event(operation,unit);return ''
 def assert_runtime(self,root,plan):
  R.validate_plan(plan);require((root/'bin/node').read_bytes()==self.node,'fixture pinned runtime changed');return R.VERSIONS
 def verify_release(self,root,core):
  require(I.old.core_identity(root/I.old.CORE)==core,'fixture core identity mismatch')
  manifest=read(root/'release-manifest.json');require(manifest['runtimeSha256']==core,'fixture manifest identity mismatch')
  for row in manifest['files']:
   p=root/row['path'];require(p.is_file() and not p.is_symlink() and p.stat().st_size==row['bytes'] and digest(p)==row['sha256'],'fixture full manifest mismatch: '+row['path'])
   if 'executable' in row:require(bool(p.stat().st_mode&0o111)==row['executable'],'fixture manifest mode mismatch')
 def live(self):return I.Live()
 def deploy(self):return I.deploy(self.live(),copy.deepcopy(self.plan),copy.deepcopy(self.updates))
 def recover(self,manual=False):return I.recover(self.live(),copy.deepcopy(self.plan),manual=manual)
 def journal(self):
  if I.ACTIVE.exists():directory=Path(read(I.ACTIVE)['directory'])
  else:
   rows=list(self.work.glob('*/journal.json'));require(len(rows)==1,'fixture ambiguous journal');directory=rows[0].parent
  return directory,read(directory/'journal.json')
 def progress(self):
  with contextlib.closing(sqlite3.connect(self.database)) as db, db:return db.execute('SELECT value FROM progress').fetchone()[0]
 def assert_intact(self,test,version):
  test.assertEqual(descriptor(self.database),self.db_identity);test.assertEqual(descriptor(self.account_db),self.account_identity)
  test.assertEqual(read(self.state_file)['releaseRoot'],str(self.root));test.assertEqual(self.config_file.read_bytes(),self.before_config);test.assertEqual(self.dropin.read_bytes(),self.before_dropin);test.assertEqual((self.root/'bin/node').read_bytes(),self.node)
  test.assertEqual(read(self.state_file)['r64Deployment']['version'],version);test.assertEqual((self.root/self.b).read_bytes(),self.after_b if version==I.VERSION else self.before_b);test.assertEqual(read(self.service_file)[self.acc],'active')
  test.assertFalse(any(row[0] in ('stop','start') and row[1]==self.acc for row in self.events()))
  test.assertEqual(sorted(p.name for p in self.root.parent.iterdir() if p.is_dir() and not p.name.startswith('.')),['accounts','game-r80'])
 def crash(self,hook,*,manual=False):
  pid=os.fork()
  if pid==0:
   fd=os.open(os.devnull,os.O_WRONLY);os.dup2(fd,1);os.dup2(fd,2);os.close(fd)
   try:
    hook()
    self.recover(manual=True) if manual else self.deploy()
   except BaseException:
    import traceback
    (self.base/'child-error.txt').write_text(traceback.format_exc());os._exit(80)
   os._exit(81)
  _,status=os.waitpid(pid,0)
  require(os.WIFEXITED(status) and os.WEXITSTATUS(status)==77,'fixture child did not reach requested crash point: '+str(status)+' '+((self.base/'child-error.txt').read_text() if (self.base/'child-error.txt').exists() else ''))
