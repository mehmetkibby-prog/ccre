import contextlib,copy,fcntl,importlib.util,json,os,sqlite3,sys,tempfile,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('installer_fixture',Path(__file__).with_name('installer-fixture.py'));F=importlib.util.module_from_spec(spec);spec.loader.exec_module(F)
I,S,R=F.I,F.S,F.R

class CliAndFailureTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='r85-cli-test-');self.f=F.Fixture(self.temp.name);self.archive=self.f.base/'r85-fixture.zip'
  with zipfile.ZipFile(self.archive,'w') as z:
   z.writestr('update.json',F.encoded(self.f.plan))
   for name,meta,data in self.f.updates:z.writestr('payload/'+name,data)
 def tearDown(self):self.f.close();self.temp.cleanup()
 def main(self,flag):return I.main([flag,'--archive',str(self.archive)])
 def test_check_is_read_only_and_apply_holds_both_actual_flock_files(self):
  before={str(p.relative_to(self.f.base)):p.read_bytes() for p in self.f.base.rglob('*') if p.is_file() and p!=self.f.events_file}
  self.main('--check')
  after={str(p.relative_to(self.f.base)):p.read_bytes() for p in self.f.base.rglob('*') if p.is_file() and p!=self.f.events_file}
  self.assertEqual(before,after);self.assertFalse(any(r[0]=='stop' for r in self.f.events()))
  original=I.old.backup_database;seen=[]
  def check_locks(*args,**kwargs):
   for path in (I.STATE.parent/'r23-backups/install.lock',self.f.database.parent/'backups/.backup.lock'):
    fd=os.open(path,os.O_RDWR)
    try:
     with self.assertRaises(BlockingIOError):fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
     seen.append(path.name)
    finally:os.close(fd)
   return original(*args,**kwargs)
  with patch.object(I.old,'backup_database',check_locks):self.main('--apply')
  self.assertEqual(seen,['install.lock','.backup.lock']);self.f.assert_intact(self,I.VERSION)
 def test_held_install_lock_prevents_any_service_stop(self):
  with I.lock(I.STATE.parent/'r23-backups/install.lock'):
   with self.assertRaises(BlockingIOError):self.main('--apply')
  self.assertFalse(any(r[0]=='stop' for r in self.f.events()));self.assertFalse(I.ACTIVE.exists())
 def test_held_daily_backup_lock_times_out_without_stopping_services(self):
  path=self.f.database.parent/'backups/.backup.lock';fd=os.open(path,os.O_CREAT|os.O_RDWR,0o600);fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
  try:
   with patch.object(I.old.time,'monotonic',side_effect=[0,1201]):
    with self.assertRaisesRegex(Exception,'gunluk_yedek_bekleme'):self.main('--apply')
  finally:os.close(fd)
  self.assertFalse(any(r[0]=='stop' for r in self.f.events()));self.assertFalse(I.ACTIVE.exists())
 def test_valid_nested_database_layout_refuses_wrong_daily_mutex_before_stopping(self):
  manifest_path=Path(F.read(self.f.config_file)['realm']['manifestFile']);manifest=F.read(manifest_path)
  manifest['realms'][0]['dataRoot']=str(self.f.base);F.put(manifest_path,F.encoded(manifest));self.f.backup_environment['CORE_DATA_ROOT']=str(self.f.base)
  # This is a valid native manifest (DB below dataRoot), but not the layout
  # whose mutex the inherited backup helper uses. Do not take the wrong lock.
  with patch.object(I.old,'scheduled_backup_lock',wraps=I.old.scheduled_backup_lock) as acquire:
   with self.assertRaisesRegex(RuntimeError,'dataRoot ile veritabanı'):self.main('--apply')
   self.assertFalse(acquire.called)
  self.assertFalse(any(r[0] in ('stop','backup-start') for r in self.f.events()));self.assertFalse(I.ACTIVE.exists())
 def test_actual_backup_environment_mismatch_is_refused_before_daily_lock(self):
  self.f.backup_environment['CORE_DATA_ROOT']=str(self.f.base/'other-data')
  with patch.object(I.old,'scheduled_backup_lock',wraps=I.old.scheduled_backup_lock) as acquire:
   with self.assertRaisesRegex(RuntimeError,'aynı veri dizini kilidini'):self.main('--apply')
   self.assertFalse(acquire.called)
  self.assertFalse(any(r[0]=='stop' for r in self.f.events()))
 def test_backup_unit_environment_change_while_waiting_is_refused_before_stop(self):
  original=I.old.scheduled_backup_lock
  @contextlib.contextmanager
  def change_after_lock(live):
   with original(live):
    self.f.backup_environment['CORE_DATA_ROOT']=str(self.f.base/'changed-after-lock');yield
  with patch.object(I.old,'scheduled_backup_lock',change_after_lock):
   with self.assertRaisesRegex(RuntimeError,'aynı veri dizini kilidini'):self.main('--apply')
  self.assertFalse(any(r[0] in ('stop','backup-start') for r in self.f.events()));self.assertFalse(I.ACTIVE.exists())
 def test_backup_environment_file_and_wrong_database_cannot_hide_lock_binding(self):
  self.f.backup_environment_files='/etc/custom-backup.env (ignore_errors=no)'
  with self.assertRaisesRegex(RuntimeError,'EnvironmentFile'):self.main('--check')
  self.f.backup_environment_files='';self.f.backup_environment['CORE_CONFIG_FILE']=str(self.f.accounts_file)
  with self.assertRaisesRegex(RuntimeError,'başka bir veritabanına'):self.main('--check')
  self.assertFalse(any(r[0]=='stop' for r in self.f.events()))
 def test_failed_rollback_start_is_fenced_and_subsequent_recovery_succeeds(self):
  self.f.fail_target=True;self.f.fail_previous=True
  with self.assertRaisesRegex(RuntimeError,'health failure'):self.main('--apply')
  self.assertEqual(self.f.journal()[1]['phase'],'rollback-starting');self.assertTrue(I.ACTIVE.exists());self.f.assert_intact(self,I.SOURCE_VERSION)
  for unit in (self.f.unit,self.f.rt):self.assertTrue(I.guard_path(unit).exists());self.assertEqual(F.read(self.f.service_file)[unit],'inactive')
  self.f.fail_previous=False;self.main('--recover');self.assertFalse(I.ACTIVE.exists());self.f.assert_intact(self,I.SOURCE_VERSION)
 def test_failed_validated_recovery_is_fenced_and_can_restart_later(self):
  with patch.object(I.old,'remove_own_database_backup',side_effect=OSError('injected cleanup')):
   with self.assertRaises(OSError):self.main('--apply')
  self.f.fail_target=True
  with self.assertRaisesRegex(RuntimeError,'health failure'):self.main('--recover')
  for unit in (self.f.unit,self.f.rt):self.assertTrue(I.guard_path(unit).exists());self.assertEqual(F.read(self.f.service_file)[unit],'inactive')
  self.assertEqual(self.f.journal()[1]['phase'],'validated');self.f.fail_target=False;self.main('--recover');self.assertFalse(I.ACTIVE.exists());self.f.assert_intact(self,I.VERSION)
 def test_health_failure_plus_guard_enospc_still_stops_all_game_units(self):
  self.f.fail_target=True;original=I.guards;enabled=[0]
  def disk_full(record,enable):
   if enable:
    enabled[0]+=1
    if enabled[0]>=2:raise OSError(28,'injected guard ENOSPC')
   return original(record,enable)
  with patch.object(I,'guards',disk_full):
   with self.assertRaisesRegex(RuntimeError,'injected health failure'):self.main('--apply')
  self.assertEqual(self.f.journal()[1]['phase'],'starting');self.assertTrue(I.ACTIVE.exists());self.f.assert_intact(self,I.VERSION)
  for unit in (self.f.unit,self.f.rt):
   self.assertEqual(F.read(self.f.service_file)[unit],'inactive');self.assertEqual(len([r for r in self.f.events() if r==['stop',unit]]),2)
  self.main('--recover');self.f.assert_intact(self,I.SOURCE_VERSION);self.assertFalse(I.ACTIVE.exists())
 def test_recovery_health_failure_and_guard_reload_error_preserve_original_exception(self):
  with patch.object(I.old,'remove_own_database_backup',side_effect=OSError('injected cleanup')):
   with self.assertRaises(OSError):self.main('--apply')
  self.f.fail_target=True;original=I.guards
  def reload_failed(record,enable):
   if enable:raise OSError('injected daemon-reload failure')
   return original(record,enable)
  with patch.object(I,'guards',reload_failed):
   with self.assertRaisesRegex(RuntimeError,'injected health failure'):self.main('--recover')
  for unit in (self.f.unit,self.f.rt):self.assertEqual(F.read(self.f.service_file)[unit],'inactive')
  self.f.fail_target=False;self.main('--recover');self.f.assert_intact(self,I.VERSION)
 def test_rt_stop_error_does_not_skip_main_game_stop(self):
  self.f.fail_target=True;original=I.service;rt_stops=[0];attempts=[]
  def rt_failed(unit,action):
   if action=='stop':
    attempts.append(unit)
    if unit==self.f.rt:
     rt_stops[0]+=1
     if rt_stops[0]>=2:raise OSError('injected RT stop failure')
   return original(unit,action)
  with patch.object(I,'service',rt_failed):
   with self.assertRaisesRegex(RuntimeError,'injected health failure'):self.main('--apply')
  self.assertEqual(F.read(self.f.service_file)[self.f.unit],'inactive');self.assertGreaterEqual(attempts.count(self.f.unit),2);self.assertEqual(attempts.count(self.f.unit),attempts.count(self.f.rt))
  self.main('--recover');self.f.assert_intact(self,I.SOURCE_VERSION)
 def test_quick_check_failure_happens_before_any_code_replacement(self):
  original=S._replace;replacements=[]
  def record(*args,**kwargs):replacements.append(args[2]['path']);return original(*args,**kwargs)
  with patch.object(I.old,'verify_database_backup',side_effect=RuntimeError('injected quick_check failure')),patch.object(S,'_replace',record):
   with self.assertRaisesRegex(RuntimeError,'quick_check failure'):self.main('--apply')
  self.assertEqual(replacements,[]);self.f.assert_intact(self,I.SOURCE_VERSION);self.assertFalse(I.ACTIVE.exists());self.assertEqual(self.f.database.stat().st_ino,self.f.db_identity['inode'])
 def test_open_game_database_fd_prevents_overlay_until_closed(self):
  db=sqlite3.connect(self.f.database);db.execute('SELECT * FROM progress').fetchall()
  try:
   with self.assertRaisesRegex(RuntimeError,'açık tutan süreç'):self.main('--apply')
  finally:db.close()
  self.assertTrue(I.ACTIVE.exists());self.assertEqual((self.f.root/self.f.a).read_bytes(),self.f.before_a);self.main('--recover');self.assertFalse(I.ACTIVE.exists());self.f.assert_intact(self,I.SOURCE_VERSION)
 def test_sqlite_api_backup_includes_committed_wal_from_dead_writer(self):
  pid=os.fork()
  if pid==0:
   db=sqlite3.connect(self.f.database);db.execute('PRAGMA journal_mode=WAL');db.execute('PRAGMA wal_autocheckpoint=0');db.execute('UPDATE progress SET value=71');db.commit();os._exit(77)
  _,status=os.waitpid(pid,0);self.assertEqual(os.WEXITSTATUS(status),77);self.assertTrue(Path(str(self.f.database)+'-wal').is_file())
  with contextlib.closing(sqlite3.connect(self.f.database.as_uri()+'?immutable=1',uri=True)) as db:self.assertEqual(db.execute('SELECT value FROM progress').fetchone()[0],10)
  original=I.old.backup_database;values=[]
  def check(live,directory,record,deadline):
   result=original(live,directory,record,deadline)
   with contextlib.closing(sqlite3.connect(directory/'game.sqlite')) as db:values.append(db.execute('SELECT value FROM progress').fetchone()[0])
   return result
  with patch.object(I.old,'backup_database',check):self.main('--apply')
  self.assertEqual(values,[71]);self.assertEqual(self.f.progress(),71);self.f.assert_intact(self,I.VERSION)
 def test_unlisted_zip_payload_is_refused(self):
  with zipfile.ZipFile(self.archive,'a') as z:z.writestr('payload/not-in-plan.mjs',b'extra')
  with self.assertRaisesRegex(RuntimeError,'delta dosya listesi'):self.main('--check')
  self.assertFalse(any(r[0]=='stop' for r in self.f.events()))

class R85SpecificBoundaryTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='r85-boundary-test-');self.f=F.Fixture(self.temp.name)
 def tearDown(self):self.f.close();self.temp.cleanup()
 def assert_not_stopped(self):
  self.assertFalse(any(row[0]=='stop' for row in self.f.events()));self.assertFalse(I.ACTIVE.exists())
 def test_r82_state_is_rejected_before_any_service_stop(self):
  state=F.read(I.STATE);state['r64Deployment']['version']='R82_GAMEPLAY';F.put(I.STATE,F.encoded(state),0o600)
  with self.assertRaisesRegex(RuntimeError,'yalnız doğrulanmış R84'):self.f.deploy()
  self.assert_not_stopped()
 def test_plan_requires_r84_source_and_r85_destination(self):
  for field,value in (('sourceVersion','R82_GAMEPLAY'),('version','R84_GAMEPLAY')):
   plan=copy.deepcopy(self.f.plan);plan[field]=value
   with self.assertRaisesRegex(RuntimeError,'sürüm kapsamı'):I.validate_scope(plan)
 def test_exact_reviewed_gameplay_scope_rejects_unknown_and_native_paths(self):
  for name in (I.old.CORE+'world-state.mjs',I.old.CORE+'unreviewed-helper-r85.mjs',I.old.CORE+'read-worker.mjs',I.old.CORE+'snapshot-read-queue.mjs',I.NATIVE_CHECKPOINT):
   plan=copy.deepcopy(self.f.plan);plan['files'][name]=plan['files'][self.f.a]
   with self.assertRaisesRegex(RuntimeError,'dosya kapsamı'):I.validate_scope(plan)
 def test_every_reviewed_gameplay_file_is_required(self):
  for name in self.f.plan['files']:
   plan=copy.deepcopy(self.f.plan);plan['files'].pop(name)
   with self.assertRaisesRegex(RuntimeError,'onaylanmış dosyaların tamamı'):I.validate_scope(plan)
 def test_existing_source_requires_before_hash_and_only_new_helpers_allow_null(self):
  for name in self.f.plan['files']:
   plan=copy.deepcopy(self.f.plan)
   if name in I.NEW_PRODUCTION_PATHS:
    plan['files'][name]['before']='0'*64
    with self.assertRaisesRegex(RuntimeError,'yeni yardımcı dosyası'):I.validate_scope(plan)
   else:
    plan['files'][name]['before']=None
    with self.assertRaisesRegex(RuntimeError,'başlangıç kimliği'):I.validate_scope(plan)
 def test_unexpected_existing_new_helper_is_refused_before_any_stop(self):
  name=next(iter(I.NEW_PRODUCTION_PATHS));F.put(self.f.root/name,b'unknown pre-existing helper')
  with self.assertRaisesRegex(RuntimeError,'kaynaklarıyla eşleşmiyor'):self.f.deploy()
  self.assert_not_stopped()
 def test_changed_r80_checkpoint_is_refused_before_any_stop(self):
  (self.f.root/I.NATIVE_CHECKPOINT).write_bytes(b'old R79 checkpoint or unknown update')
  with self.assertRaisesRegex(RuntimeError,'R80 kayıt işçisi'):self.f.deploy()
  self.assert_not_stopped()
 def test_active_admission_is_refused_before_any_stop(self):
  with contextlib.closing(sqlite3.connect(self.f.database)) as db,db:db.execute('INSERT INTO kernel511_admissions VALUES(1)')
  with self.assertRaisesRegex(RuntimeError,'45 saniye'):self.f.deploy()
  self.assert_not_stopped()
 def test_active_presence_is_refused_before_any_stop(self):
  with contextlib.closing(sqlite3.connect(self.f.database)) as db,db:db.execute('INSERT INTO game_presence VALUES(?)',(int(I.time.time()*1000)+60000,))
  with self.assertRaisesRegex(RuntimeError,'45 saniye'):self.f.deploy()
  self.assert_not_stopped()
 def test_recent_player_is_refused_before_any_stop(self):
  with contextlib.closing(sqlite3.connect(self.f.database)) as db,db:db.execute('INSERT INTO players VALUES(?)',(int(I.time.time()),))
  with self.assertRaisesRegex(RuntimeError,'45 saniye'):self.f.deploy()
  self.assert_not_stopped()
 def test_open_policy_is_not_silently_changed_by_installer(self):
  policy={**self.f.policy,'phase':'open','mode':'open','revision':245};F.put(self.f.policy_file,F.encoded(policy))
  with self.assertRaisesRegex(RuntimeError,'tamamlanmış bakım'):self.f.deploy()
  self.assertEqual(F.read(self.f.policy_file),policy);self.assert_not_stopped()
 def test_payload_hash_mismatch_is_refused_before_any_stop(self):
  archive=self.f.base/'bad-payload.zip'
  with zipfile.ZipFile(archive,'w') as z:
   z.writestr('update.json',F.encoded(self.f.plan));z.writestr('payload/'+self.f.a,b'corrupted gameplay')
  with self.assertRaisesRegex(RuntimeError,'bütünlüğü'):I.main(['--check','--archive',str(archive)])
  self.assert_not_stopped()

 def test_client_identity_cannot_be_unreviewed(self):
  with patch.object(I,'CLIENT_REVIEWED',False):
   with self.assertRaisesRegex(RuntimeError,'henüz doğrulanmadı'):I.validate_scope(self.f.plan)
  self.assert_not_stopped()
 def test_source_core_identity_is_pinned(self):
  plan=copy.deepcopy(self.f.plan);plan['baseCoreSHA256']='0'*64
  with self.assertRaisesRegex(RuntimeError,'R84 kaynak kimliği'):I.validate_scope(plan)
  self.assert_not_stopped()
 def test_http_source_pin_is_checked_before_any_stop(self):
  (self.f.root/I.HTTP).write_bytes(b'unknown HTTP replacement')
  with self.assertRaisesRegex(RuntimeError,'HTTP oyun dosyası'):self.f.deploy()
  self.assert_not_stopped()
 def test_missing_existing_server_file_is_refused_before_stop(self):
  (self.f.root/I.PRODUCTION_PATHS[2]).unlink()
  with self.assertRaisesRegex(RuntimeError,'kaynaklarıyla eşleşmiyor'):self.f.deploy()
  self.assert_not_stopped()
 def test_client_changes_cannot_be_turned_off(self):
  plan=copy.deepcopy(self.f.plan);plan['clientChanges']=False
  with self.assertRaisesRegex(RuntimeError,'istemci grafiği kapsamı'):I.validate_scope(plan)
  self.assert_not_stopped()
 def test_correctly_hashed_http_payload_cannot_add_route_logic(self):
  extra=self.f.after_http+b'\n// unreviewed HTTP route change\n'
  self.f.plan['files'][I.HTTP]['after']=F.sha(extra)
  self.f.plan['files'][I.HTTP]['bytes']=len(extra)
  self.f.updates=[(name,self.f.plan['files'][name],extra if name==I.HTTP else data) for name,meta,data in self.f.updates]
  with self.assertRaisesRegex(RuntimeError,'yalnız doğrulanmış istemci başvurularını'):self.f.deploy()
  self.assert_not_stopped()

class ExistingPinnedNodeTests(unittest.TestCase):
 def test_real_shipped_node_license_symlink_versions_without_runtime_payload(self):
  base=F.BASE.parent/'r79_stability_work';plan={'runtime':F.runtime_plan(),'files':{}}
  with tempfile.TemporaryDirectory(prefix='r85-runtime-test-',dir=F.BASE) as folder:
   root=Path(folder)
   for name in (R.NODE,R.LICENSE):
    target=root/name;target.parent.mkdir(parents=True,exist_ok=True);os.link(base/name,target)
   (root/'bin').mkdir();(root/'bin/node').symlink_to(R.LINK)
   before={name:(F.digest(root/name),(root/name).stat().st_ino) for name in (R.NODE,R.LICENSE)};link_inode=(root/'bin/node').lstat().st_ino
   self.assertEqual(R.assert_runtime(root,plan),R.VERSIONS)
   manifest={'files':[{'path':R.NODE,'bytes':R.NODE_BYTES,'sha256':R.NODE_SHA256,'executable':True},{'path':R.LICENSE,'bytes':R.LICENSE_BYTES,'sha256':R.LICENSE_SHA256,'executable':False}],'symlinks':[{'path':'bin/node','target':R.LINK}]};snapshot=copy.deepcopy(manifest)
   R.prepare_manifest(root,manifest,plan);self.assertEqual(manifest,snapshot);self.assertEqual((root/'bin/node').lstat().st_ino,link_inode)
   self.assertEqual({name:(F.digest(root/name),(root/name).stat().st_ino) for name in (R.NODE,R.LICENSE)},before)
   (root/'bin/node').unlink();(root/'bin/node').symlink_to(root/R.NODE)
   with self.assertRaisesRegex(RuntimeError,'Node bağı'):R.assert_runtime(root,plan)

class HealthVersionGateTests(unittest.TestCase):
 def test_r85_health_requires_own_version_and_available_diagnostics_but_r84_does_not(self):
  live=I.Live.__new__(I.Live);live.port=19999;live.config={'realm':{'dbIdentity':'fixture'}};live.empty=lambda:None
  health={'kernel511':{'ready':True},'durable':True,'realm':{'dbIdentity':'fixture'},'channelProcesses':{'channels':[{'channel':n,'ready':True,'capacity':25,'online':0} for n in range(1,5)]},'checkpointR79':{'ready':True,'nodeVersion':R.VERSIONS['node'],'sqliteVersion':R.VERSIONS['sqlite']}}
  with patch.object(I.old,'local',side_effect=lambda *args:copy.deepcopy(health)):
   live.state={'r64Deployment':{'version':I.SOURCE_VERSION}};live.health()
   live.state={'r64Deployment':{'version':I.VERSION}}
   with self.assertRaisesRegex(RuntimeError,'R85 çalışma zamanı'):live.health()
   health['updateVersion']=I.VERSION;health['runtimeDiagnosticsR80']={'protocol':'runtime-diagnostics-r80-v1','available':False}
   with self.assertRaisesRegex(RuntimeError,'R85 çalışma zamanı'):live.health()
   health['runtimeDiagnosticsR80']['available']=True;health['updateVersion']=I.SOURCE_VERSION
   with self.assertRaisesRegex(RuntimeError,'R85 çalışma zamanı'):live.health()
   health['updateVersion']=I.VERSION;live.health()
   health['checkpointR79']['ready']=False
   with self.assertRaisesRegex(RuntimeError,'kayıt işçisi'):live.health()

@unittest.skipUnless((F.BASE/'r85-package/update.json').is_file(), 'Final R85 payload not staged yet')
class ActualPayloadTests(unittest.TestCase):
 def test_actual_reviewed_r85_plan_and_payload_load_without_node_payload(self):
  plan=F.read(F.BASE/'r85-package/update.json');I.validate_scope(plan)
  self.assertEqual(plan['sourceVersion'],I.SOURCE_VERSION);self.assertEqual(plan['version'],I.VERSION);self.assertTrue(plan['clientChanges']);self.assertEqual(set(plan['files']),set(I.PRODUCTION_PATHS));self.assertEqual(len(plan['baseCoreRows']),1167)
  self.assertEqual(I.old.identity_from_rows(plan['baseCoreRows']),plan['baseCoreSHA256'])
  self.assertEqual(plan['baseCoreSHA256'],I.SOURCE_CORE_SHA256)
  self.assertEqual({name for name,meta in plan['files'].items() if meta['before'] is None},set(I.NEW_PRODUCTION_PATHS))
  with tempfile.TemporaryDirectory(prefix='r85-payload-test-') as temp:
   archive=Path(temp)/'actual-payload.zip'
   with zipfile.ZipFile(archive,'w') as z:
    z.writestr('update.json',F.encoded(plan))
    for name in plan['files']:z.writestr('payload/'+name,(F.BASE/'r85-package/payload'/name).read_bytes())
   loaded,updates=I.load_package(archive);self.assertEqual(loaded,plan);self.assertEqual(tuple(name for name,_,_ in updates),I.PRODUCTION_PATHS)
   self.assertTrue(all(not name.startswith(('runtime/','bin/')) for name,_,_ in updates))
   self.assertEqual([name for name,_,_ in updates if name.startswith('http-runtime/')],[I.HTTP])

class R85IngressBoundaryTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='r85-ingress-test-');self.f=F.Fixture(self.temp.name)
  self.path=self.f.root/I.ingress.PATH
  self.before=self.path.read_bytes()
  self.after=I.ingress.canonical_payload(self.before)
 def tearDown(self):self.f.close();self.temp.cleanup()
 def snapshot(self):
  return {p.relative_to(self.f.base).as_posix():p.read_bytes() for p in self.f.base.rglob('*') if p.is_file() and p!=self.f.events_file}
 def reject_without_mutation(self,call,message):
  before=self.snapshot();events=[r for r in self.f.events() if r[0] in ('stop','start','gate','backup-start')]
  with self.assertRaisesRegex(RuntimeError,message):call()
  self.assertEqual(self.snapshot(),before)
  self.assertEqual([r for r in self.f.events() if r[0] in ('stop','start','gate','backup-start')],events)
 def alter_manifest(self,mutate):
  path=self.f.root/'release-manifest.json';manifest=F.read(path)
  mutate(manifest);F.put(path,F.encoded(manifest))
 def test_real_ingress_fixture_has_fixed_pins_and_only_one_property_delta(self):
  self.assertEqual((len(self.before),F.sha(self.before)),(5178,I.ingress.BEFORE_SHA256))
  self.assertEqual((len(self.after),F.sha(self.after)),(5191,I.ingress.AFTER_SHA256))
  self.assertEqual(self.after.replace(I.ingress.NEW_CONNECT,I.ingress.OLD_CONNECT,1),self.before)
  self.assertEqual(self.before.count(I.ingress.OLD_CONNECT),1)
  self.assertEqual(self.after.count(I.ingress.NEW_CONNECT),1)
 def test_unknown_before_bytes_abort_before_any_write_or_service_change(self):
  self.path.write_bytes(b'X'+self.before[1:])
  self.reject_without_mutation(self.f.deploy,'Ingress dosyası tanınmıyor.*bulunan SHA256')
 def test_unknown_before_size_aborts_before_any_write_or_service_change(self):
  self.path.write_bytes(self.before+b'\n')
  self.reject_without_mutation(self.f.deploy,'Ingress dosyası tanınmıyor.*bayt=5179')
 def test_missing_live_ingress_aborts_before_mutation(self):
  self.path.unlink()
  self.reject_without_mutation(self.f.deploy,'Ingress dosyası eksik')
 def test_wrong_manifest_hash_or_size_is_not_inferred_from_correct_disk_bytes(self):
  original=(self.f.root/'release-manifest.json').read_bytes()
  for field,value in (('sha256','0'*64),('bytes',5179),('bytes','5178')):
   with self.subTest(field=field,value=value):
    (self.f.root/'release-manifest.json').write_bytes(original)
    self.alter_manifest(lambda manifest:next(row for row in manifest['files'] if row['path']==I.ingress.PATH).__setitem__(field,value))
    self.reject_without_mutation(self.f.deploy,'Ingress release-manifest.json kaydı farklı/eksik')
 def test_missing_or_duplicate_manifest_row_aborts_before_mutation(self):
  original=(self.f.root/'release-manifest.json').read_bytes()
  for duplicate in (False,True):
   with self.subTest(duplicate=duplicate):
    (self.f.root/'release-manifest.json').write_bytes(original)
    def mutate(manifest):
     row=next(row for row in manifest['files'] if row['path']==I.ingress.PATH)
     if duplicate:manifest['files'].append(dict(row))
     else:manifest['files'].remove(row)
    self.alter_manifest(mutate)
    self.reject_without_mutation(self.f.deploy,'Ingress release-manifest.json kaydı farklı/eksik')
 def test_plan_cannot_change_pinned_before_after_size_or_expand_ingress_scope(self):
  original=copy.deepcopy(self.f.plan['files'][I.ingress.PATH])
  for field,value in (('before','0'*64),('after','f'*64),('bytes',5192),('otherScope',True)):
   with self.subTest(field=field):
    self.f.plan['files'][I.ingress.PATH]={**original,field:value}
    self.reject_without_mutation(self.f.deploy,'R85 ingress başlangıç kimliği/tek özellik kapsamı')
 def test_wrong_actual_payload_aborts_before_mutation_even_with_pinned_metadata(self):
  self.f.updates=[(name,meta,data+b'\n' if name==I.ingress.PATH else data) for name,meta,data in self.f.updates]
  self.reject_without_mutation(self.f.deploy,'R85 ingress yükü farklı')
 def test_rehashed_extra_ingress_change_is_rejected_before_mutation(self):
  extra=self.after+b'\n// unreviewed ingress change\n'
  self.f.plan['files'][I.ingress.PATH]={'before':I.ingress.BEFORE_SHA256,'after':F.sha(extra),'bytes':len(extra)}
  self.f.updates=[(name,self.f.plan['files'][name],extra if name==I.ingress.PATH else data) for name,meta,data in self.f.updates]
  self.reject_without_mutation(self.f.deploy,'R85 ingress başlangıç kimliği/tek özellik kapsamı')
 def test_success_and_idempotence_update_ingress_manifest_without_changing_database(self):
  self.assertTrue(self.f.deploy());self.f.assert_intact(self,I.VERSION)
  self.assertEqual(self.path.read_bytes(),self.after)
  row=I.ingress.manifest_row(F.read(self.f.root/'release-manifest.json'),updated=True)
  self.assertEqual((row['sha256'],row['bytes']),(I.ingress.AFTER_SHA256,5191))
  before=self.snapshot();events=[r for r in self.f.events() if r[0] in ('stop','start')]
  self.assertFalse(self.f.deploy());self.assertEqual(self.snapshot(),before)
  self.assertEqual([r for r in self.f.events() if r[0] in ('stop','start')],events)
 def test_already_installed_ingress_cannot_silently_fall_back_to_before_bytes(self):
  self.f.deploy();self.path.write_bytes(self.before)
  self.reject_without_mutation(self.f.deploy,'Ingress dosyası tanınmıyor')
 def test_already_installed_ingress_manifest_must_match_after_pin(self):
  self.f.deploy()
  self.alter_manifest(lambda manifest:next(row for row in manifest['files'] if row['path']==I.ingress.PATH).update(sha256=I.ingress.BEFORE_SHA256,bytes=5178))
  self.reject_without_mutation(self.f.deploy,'Ingress release-manifest.json kaydı farklı/eksik')
 def crash_after_ingress(self):
  def hook():
   original=S._replace
   def after(root,stage,row,data,**kwargs):
    original(root,stage,row,data,**kwargs)
    if row['path']==I.ingress.PATH:os._exit(77)
   S._replace=after
  self.f.crash(hook)
  self.assertEqual(self.path.read_bytes(),self.after)
 def test_interrupted_ingress_overlay_recovers_exact_before_code_and_current_database(self):
  self.crash_after_ingress()
  with contextlib.closing(sqlite3.connect(self.f.database)) as db,db:db.execute('UPDATE progress SET value=86')
  self.f.recover();self.f.assert_intact(self,I.SOURCE_VERSION)
  self.assertEqual(self.path.read_bytes(),self.before);self.assertEqual(self.f.progress(),86)
  self.assertFalse(I.ACTIVE.exists())
 def test_corrupted_original_ingress_backup_refuses_recovery_before_mutation(self):
  self.crash_after_ingress();directory,record=self.f.journal()
  row=next(row for row in record['files'] if row['path']==I.ingress.PATH)
  (directory/'code'/row['backup']).write_bytes(b'X'+self.before[1:])
  self.reject_without_mutation(self.f.recover,'Özgün istemci yedeği farklı')
  self.assertEqual(self.path.read_bytes(),self.after);self.assertTrue(I.ACTIVE.exists())
 def test_manual_rollback_restores_original_ingress_but_keeps_current_database(self):
  self.f.deploy()
  with contextlib.closing(sqlite3.connect(self.f.database)) as db,db:db.execute('UPDATE progress SET value=85')
  self.f.recover(manual=True);self.f.assert_intact(self,I.SOURCE_VERSION)
  self.assertEqual(self.path.read_bytes(),self.before);self.assertEqual(self.f.progress(),85)
  self.assertFalse(I.ACTIVE.exists())

if __name__=='__main__':unittest.main(verbosity=2)
