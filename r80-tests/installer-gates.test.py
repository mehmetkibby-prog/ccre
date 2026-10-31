import contextlib,copy,fcntl,importlib.util,json,os,sqlite3,sys,tempfile,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('installer_fixture',Path(__file__).with_name('installer-fixture.py'));F=importlib.util.module_from_spec(spec);spec.loader.exec_module(F)
I,S,R=F.I,F.S,F.R

class CliAndFailureTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='r80-cli-test-');self.f=F.Fixture(self.temp.name);self.archive=self.f.base/'r80-fixture.zip'
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

class ExistingPinnedNodeTests(unittest.TestCase):
 def test_real_shipped_node_license_symlink_versions_without_runtime_payload(self):
  base=F.BASE/'r79-audit';plan={'runtime':F.runtime_plan(),'files':{}}
  with tempfile.TemporaryDirectory(prefix='r80-runtime-test-',dir=F.BASE) as folder:
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
 def test_r80_health_requires_own_version_and_available_diagnostics_but_r79_does_not(self):
  live=I.Live.__new__(I.Live);live.port=19999;live.config={'realm':{'dbIdentity':'fixture'}};live.empty=lambda:None
  health={'kernel511':{'ready':True},'durable':True,'realm':{'dbIdentity':'fixture'},'channelProcesses':{'channels':[{'channel':n,'ready':True,'capacity':25,'online':0} for n in range(1,5)]},'checkpointR79':{'ready':True,'nodeVersion':R.VERSIONS['node'],'sqliteVersion':R.VERSIONS['sqlite']}}
  with patch.object(I.old,'local',side_effect=lambda *args:copy.deepcopy(health)):
   live.state={'r64Deployment':{'version':I.SOURCE_VERSION}};live.health()
   live.state={'r64Deployment':{'version':I.VERSION}}
   with self.assertRaisesRegex(RuntimeError,'R80 çalışma zamanı'):live.health()
   health['updateVersion']=I.VERSION;health['runtimeDiagnosticsR80']={'protocol':'runtime-diagnostics-r80-v1','available':False}
   with self.assertRaisesRegex(RuntimeError,'R80 çalışma zamanı'):live.health()
   health['runtimeDiagnosticsR80']['available']=True;live.health()
   health['checkpointR79']['ready']=False
   with self.assertRaisesRegex(RuntimeError,'kayıt işçisi'):live.health()

class ActualPayloadTests(unittest.TestCase):
 def test_actual_six_file_r80_plan_and_payload_load_without_node_payload(self):
  plan=F.read(F.BASE/'r80-package/update.json');I.validate_scope(plan)
  self.assertEqual(plan['sourceVersion'],I.SOURCE_VERSION);self.assertEqual(plan['version'],I.VERSION);self.assertFalse(plan['clientChanges']);self.assertEqual(len(plan['files']),6)
  self.assertEqual(I.old.identity_from_rows(plan['baseCoreRows']),plan['baseCoreSHA256'])
  with tempfile.TemporaryDirectory(prefix='r80-payload-test-') as temp:
   archive=Path(temp)/'actual-payload.zip'
   with zipfile.ZipFile(archive,'w') as z:
    z.writestr('update.json',F.encoded(plan))
    for name in plan['files']:z.writestr('payload/'+name,(F.BASE/'r80-package/payload'/name).read_bytes())
   loaded,updates=I.load_package(archive);self.assertEqual(loaded,plan);self.assertEqual(len(updates),6)
   self.assertTrue(all(not name.startswith(('runtime/','http-runtime/','bin/')) for name,_,_ in updates))

if __name__=='__main__':unittest.main(verbosity=2)
