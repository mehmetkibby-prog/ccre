import contextlib,copy,fcntl,hashlib,importlib.util,json,os,sqlite3,stat,sys,tempfile,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('installer_fixture',Path(__file__).with_name('installer-fixture.py'));F=importlib.util.module_from_spec(spec);spec.loader.exec_module(F)
I,S,R=F.I,F.S,F.R

class InstallerTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='r82-installer-test-');self.f=F.Fixture(self.temp.name)
 def tearDown(self):self.f.close();self.temp.cleanup()
 def assert_recovered(self):
  self.f.assert_intact(self,I.SOURCE_VERSION);self.assertEqual(self.f.state_file.read_bytes(),self.f.before_state);self.assertFalse(I.ACTIVE.exists());self.assertEqual((self.f.root/self.f.b).read_bytes(),self.f.before_b);self.assertFalse((self.f.root/(I.old.CORE+'nested')).exists());self.assertFalse(any(self.f.root.parent.glob('.r82-stage-*')));self.assertEqual(F.read(self.f.policy_file),self.f.policy)
  for unit in (self.f.unit,self.f.rt):self.assertFalse(I.guard_path(unit).exists());self.assertEqual(F.read(self.f.service_file)[unit],'active')
 def test_apply_then_idempotent_apply_no_release_clone_runtime_or_database_change(self):
  self.assertTrue(self.f.deploy());self.f.assert_intact(self,I.VERSION);directory,record=self.f.journal()
  self.assertEqual(record['phase'],'complete');self.assertEqual(record['databaseBackup']['status'],'deleted');self.assertFalse(I.ACTIVE.exists());self.assertFalse(any(self.f.root.parent.glob('.r82-stage-*')))
  self.assertEqual(F.read(self.f.policy_file),self.f.policy);self.assertEqual(record['files'][-1]['path'],'release-manifest.json');self.assertLess(sum(p.stat().st_size for p in (directory/'code').iterdir()),10000)
  events=self.f.events();stop=min(i for i,row in enumerate(events) if row[0]=='stop');backup=next(i for i,row in enumerate(events) if row[0]=='backup-start');self.assertLess(stop,backup)
  self.assertFalse(self.f.deploy());self.assertEqual(len(list(self.f.work.glob('*/journal.json'))),1)
 def test_health_failure_rolls_back_code_but_keeps_post_backup_progress_and_account(self):
  self.f.fail_target=True;self.f.write_on_fail=True
  with self.assertRaisesRegex(RuntimeError,'health failure'):self.f.deploy()
  self.assert_recovered();self.assertEqual(self.f.progress(),20)
  with contextlib.closing(sqlite3.connect(self.f.account_db)) as db, db:self.assertEqual(db.execute('SELECT COUNT(*) FROM accounts').fetchone()[0],2)
  _,record=self.f.journal();self.assertEqual(record['phase'],'rolled_back');self.assertEqual(record['databaseBackup']['status'],'deleted')
 def test_crash_after_new_helper_is_installed_removes_it_on_recovery(self):
  new_name=next(iter(I.NEW_PRODUCTION_PATHS))
  def hook():
   original=S._replace
   def after(root,stage,row,data,**kwargs):
    original(root,stage,row,data,**kwargs)
    if row['path']==new_name:os._exit(77)
   S._replace=after
  self.f.crash(hook);self.assertTrue((self.f.root/new_name).is_file())
  self.f.recover();self.assert_recovered();self.assertFalse((self.f.root/new_name).exists())
 def test_manual_rollback_takes_fresh_backup_and_preserves_current_database(self):
  self.f.deploy()
  with contextlib.closing(sqlite3.connect(self.f.database)) as db, db:db.execute('UPDATE progress SET value=88')
  self.f.recover(manual=True);self.assert_recovered();self.assertEqual(self.f.progress(),88)
  _,record=self.f.journal();self.assertEqual(record['phase'],'rolled_back');self.assertEqual(len([r for r in self.f.events() if r[0]=='backup-verified']),2)
 def test_partial_gameplay_file_after_killed_writer_recovers_without_old_database(self):
  def hook():
   original=S._replace
   def after(root,stage,row,data,**kwargs):
    original(root,stage,row,data,**kwargs)
    if row['path']==self.f.a:os._exit(77)
   S._replace=after
  self.f.crash(hook);directory,record=self.f.journal();self.assertEqual(record['phase'],'writing');self.assertEqual((self.f.root/self.f.a).read_bytes(),self.f.after_a)
  with contextlib.closing(sqlite3.connect(self.f.database)) as db, db:db.execute('UPDATE progress SET value=23')
  self.f.recover();self.assert_recovered();self.assertEqual(self.f.progress(),23)
 def test_partial_temp_after_killed_writer_is_outside_source_and_recoverable(self):
  def hook():
   def die(root,stage,row,data,**kwargs):
    (stage/(row['slot']+'.part')).write_bytes(b'incomplete replacement');os._exit(77)
   S._replace=die
  self.f.crash(hook);self.assertEqual(I.old.core_identity(self.f.root/I.old.CORE),self.f.before_core);self.f.recover();self.assert_recovered()
 def test_state_selected_before_journal_persist_recovers(self):
  def hook():
   original=I.restore_file
   def after(saved):
    original(saved)
    if saved['path']==str(I.STATE) and F.read(I.STATE)['r64Deployment']['version']==I.VERSION:os._exit(77)
   I.restore_file=after
  self.f.crash(hook);self.assertEqual(self.f.journal()[1]['phase'],'writing');self.assertEqual(F.read(I.STATE)['r64Deployment']['version'],I.VERSION);self.f.recover();self.assert_recovered()
 def test_unknown_manual_file_blocks_all_restore_writes(self):
  def hook():
   original=I.write_record
   def after(directory,record,phase):
    original(directory,record,phase)
    if phase=='selected':os._exit(77)
   I.write_record=after
  self.f.crash(hook);path=self.f.root/self.f.a;path.write_bytes(b'operator edited gameplay file')
  before={r['path']:(self.f.root/r['path']).read_bytes() for r in self.f.journal()[1]['files']};state=I.STATE.read_bytes()
  with self.assertRaisesRegex(RuntimeError,'dışarıdan değişmiş'):self.f.recover()
  self.assertEqual(before,{name:(self.f.root/name).read_bytes() for name in before});self.assertEqual(I.STATE.read_bytes(),state);self.assertTrue(I.ACTIVE.exists());self.assertEqual(F.descriptor(self.f.database),self.f.db_identity)
 def test_unknown_manual_state_blocks_before_file_writes(self):
  self.f.deploy();state=F.read(I.STATE);state['operatorNote']='do not overwrite';F.put(I.STATE,F.encoded(state),0o600)
  before=(self.f.root/self.f.a).read_bytes()
  with self.assertRaisesRegex(RuntimeError,'başka bir işlemle'):self.f.recover(manual=True)
  self.assertEqual((self.f.root/self.f.a).read_bytes(),before);self.assertFalse(I.ACTIVE.exists())
 def test_changed_database_inode_refuses_code_rollback(self):
  self.f.deploy();replacement=self.f.database.with_name('replacement.sqlite')
  with contextlib.closing(sqlite3.connect(replacement)) as db, db:db.execute('CREATE TABLE current(id INTEGER)')
  os.replace(replacement,self.f.database)
  with self.assertRaisesRegex(RuntimeError,'veritabanı kimliği'):self.f.recover(manual=True)
  self.assertEqual((self.f.root/self.f.a).read_bytes(),self.f.after_a)
 def test_cleanup_failure_does_not_rollback_validated_r82_and_recover_finishes(self):
  with patch.object(I.old,'remove_own_database_backup',side_effect=OSError('injected cleanup failure')):
   with self.assertRaisesRegex(OSError,'cleanup'):self.f.deploy()
  self.f.assert_intact(self,I.VERSION);self.assertEqual(self.f.journal()[1]['phase'],'validated');self.assertTrue(I.ACTIVE.exists())
  self.f.recover();self.f.assert_intact(self,I.VERSION);self.assertFalse(I.ACTIVE.exists());self.assertEqual(self.f.journal()[1]['phase'],'complete')
 def test_validated_recover_respects_new_owner_policy_and_online_players(self):
  with patch.object(I.old,'remove_own_database_backup',side_effect=OSError('injected cleanup')):
   with self.assertRaises(OSError):self.f.deploy()
  owner={**self.f.policy,'phase':'open','mode':'open','revision':245,'realm':{'status':'open','registrationOpen':False}};F.put(self.f.policy_file,F.encoded(owner))
  with contextlib.closing(sqlite3.connect(self.f.database)) as db, db:db.execute('INSERT INTO kernel511_admissions VALUES(99)')
  self.f.recover();self.assertEqual(F.read(self.f.policy_file),owner);self.f.assert_intact(self,I.VERSION)
 def test_verified_backup_metadata_is_recovered_from_attempt_journal(self):
  def hook():
   original=I.old.backup_database
   def after(*args,**kwargs):original(*args,**kwargs);os._exit(77)
   I.old.backup_database=after
  self.f.crash(hook);directory,record=self.f.journal();self.assertEqual(record['phase'],'database-backup');self.assertNotIn('databaseBackup',record)
  self.f.recover();self.assert_recovered();self.assertEqual(self.f.journal()[1]['databaseBackup']['status'],'deleted')
 def test_unverified_backup_file_is_never_restored_or_silently_deleted(self):
  def hook():
   def die(live,directory,record,deadline):
    (directory/'game.sqlite').write_bytes(b'unverified interrupted backup');os._exit(77)
   I.old.backup_database=die
  self.f.crash(hook);directory,record=self.f.journal();orphan=directory/record['backupAttempt']['directory']/'game.sqlite';self.f.recover();self.assert_recovered();self.assertEqual(orphan.read_bytes(),b'unverified interrupted backup');self.assertEqual(self.f.progress(),10)
 def test_manual_rollback_backup_crash_retries_before_code_change(self):
  self.f.deploy()
  with contextlib.closing(sqlite3.connect(self.f.database)) as db, db:db.execute('UPDATE progress SET value=66')
  def hook():
   def die(live,directory,record,deadline):
    (directory/'game.sqlite.partial').write_bytes(b'partial');os._exit(77)
   I.old.backup_database=die
  self.f.crash(hook,manual=True);self.assertEqual((self.f.root/self.f.a).read_bytes(),self.f.after_a);self.assertEqual(self.f.journal()[1]['phase'],'rollback-backup')
  self.f.recover();self.assert_recovered();self.assertEqual(self.f.progress(),66);self.assertEqual(self.f.journal()[1]['databaseBackup']['status'],'deleted')
 def test_completed_backup_recovery_does_not_repeat_backup(self):
  self.f.deploy()
  def hook():
   original=I.old.backup_database
   def die(*args,**kwargs):original(*args,**kwargs);os._exit(77)
   I.old.backup_database=die
  self.f.crash(hook,manual=True);before=len([r for r in self.f.events() if r[0]=='backup-verified']);self.f.recover();self.assert_recovered();self.assertEqual(len([r for r in self.f.events() if r[0]=='backup-verified']),before)
 def test_unknown_own_backup_inode_blocks_cleanup_without_rolling_back_r82(self):
  with patch.object(I.old,'remove_own_database_backup',side_effect=OSError('hold')):
   with self.assertRaises(OSError):self.f.deploy()
  directory,record=self.f.journal();p=I.backup_folder(directory,record)/'game.sqlite';replacement=p.with_name('changed.sqlite');replacement.write_bytes(p.read_bytes());os.replace(replacement,p)
  with self.assertRaises(Exception):self.f.recover()
  self.f.assert_intact(self,I.VERSION);self.assertTrue(p.exists());self.assertTrue(I.ACTIVE.exists())
 def test_before_hash_gate_refuses_unknown_source_without_stopping(self):
  (self.f.root/self.f.a).write_bytes(b'unknown original source')
  with self.assertRaises(RuntimeError):self.f.deploy()
  self.assertFalse(any(r[0]=='stop' for r in self.f.events()));self.assertFalse(I.ACTIVE.exists())
 def test_wrong_native_scope_or_http_before_metadata_is_refused(self):
  plan=copy.deepcopy(self.f.plan);plan['files'][I.NATIVE_CHECKPOINT]={'before':F.sha(self.f.before_native),'after':'0'*64,'bytes':1}
  with self.assertRaises(RuntimeError):I.validate_scope(plan)
  plan=copy.deepcopy(self.f.plan);plan['files'][I.HTTP]={'before':'0'*64,'after':'1'*64,'bytes':1}
  with self.assertRaises(RuntimeError):I.validate_scope(plan)
 def test_runtime_payload_is_rejected(self):
  plan=copy.deepcopy(self.f.plan);plan['files'][R.NODE]={'before':None,'after':R.NODE_SHA256,'bytes':R.NODE_BYTES}
  with self.assertRaisesRegex(RuntimeError,'Node çalışma zamanını değiştiremez'):I.validate_scope(plan)
 def test_account_service_call_rejected_by_real_service_guard(self):
  for action in ('stop','start','restart'):
   with self.assertRaises(RuntimeError):I.service(self.f.acc,action)
  self.assertEqual(F.read(self.f.service_file)[self.f.acc],'active')
 def test_guard_enable_disable_idempotent_and_unknown_guard_refused(self):
  record={'units':[self.f.unit,self.f.rt]};I.guards(record,True);I.guards(record,True);I.guards(record,False);I.guards(record,False)
  path=I.guard_path(self.f.unit);F.put(path,b'operator guard')
  with self.assertRaises(RuntimeError):I.guards(record,True)
  self.assertEqual(path.read_bytes(),b'operator guard')
 def test_accounts_restart_is_tolerated_only_for_recovery_identity(self):
  self.f.deploy();live=self.f.live();directory,record=self.f.journal();restarted={**live.accounts_identity(),'pid':54321,'start':'new'}
  with patch.object(live,'accounts_identity',return_value=restarted):
   with self.assertRaises(RuntimeError):I.stable_accounts(live,record)
   I.stable_accounts(live,record,allow_restart=True)
  self.assertEqual(record['accounts']['pid'],54321)
 def test_new_file_parent_symlink_and_broken_target_are_refused(self):
  p=self.f.root/(I.old.CORE+'nested');p.symlink_to(self.f.root/I.old.CORE,target_is_directory=True)
  with self.assertRaises(RuntimeError):S.describe(self.f.root,self.f.updates+[(I.old.CORE+'nested/new-r82.mjs',{'before':None,'after':F.sha(self.f.new_data),'bytes':len(self.f.new_data)},self.f.new_data)])
  p.unlink();(self.f.root/self.f.a).unlink();(self.f.root/self.f.a).symlink_to('missing.mjs')
  with self.assertRaises(RuntimeError):S.describe(self.f.root,self.f.updates)
 def test_other_active_update_record_is_never_overwritten(self):
  I.ACTIVE.write_bytes(F.encoded({'directory':'/other/installer','phase':'writing'}));before=I.ACTIVE.read_bytes()
  with self.assertRaisesRegex(RuntimeError,'Başka güncelleme'):I.write_record(self.f.work/'ours',{'phase':'prepared'},'prepared')
  self.assertEqual(I.ACTIVE.read_bytes(),before)
 def test_r81_journal_cannot_be_adopted_by_r82_recovery(self):
  self.f.deploy();directory,record=self.f.journal()
  record['version']='R81_GAMEPLAY';record['kind']='inplace-r81';F.put(directory/'journal.json',F.encoded(record),0o600)
  before=list(self.f.events())
  with self.assertRaisesRegex(RuntimeError,'farklı pakete ait'):self.f.recover(manual=True)
  self.assertEqual(self.f.events(),before);self.f.assert_intact(self,I.VERSION)
 def test_rollback_requires_completed_maintenance_before_creating_active(self):
  self.f.deploy();policy={**self.f.policy,'phase':'open','mode':'open','revision':245};F.put(self.f.policy_file,F.encoded(policy))
  with self.assertRaisesRegex(RuntimeError,'bakım modu'):self.f.recover(manual=True)
  self.assertFalse(I.ACTIVE.exists());self.f.assert_intact(self,I.VERSION)

class CrashPhaseTests(unittest.TestCase):
 def test_each_durable_apply_phase_recovers_idempotently(self):
  phases=('preparing','prepared','gating','stopping','database-backup','writing','selected','starting','validated','complete')
  for phase in phases:
   with self.subTest(phase=phase),tempfile.TemporaryDirectory(prefix='r82-phase-') as temp:
    f=F.Fixture(temp)
    try:
     def hook():
      original=I.write_record
      def after(directory,record,current):
       original(directory,record,current)
       if current==phase:os._exit(77)
      I.write_record=after
     f.crash(hook);f.recover();f.recover();expected=I.VERSION if phase in ('validated','complete') else I.SOURCE_VERSION
     f.assert_intact(self,expected);self.assertFalse(I.ACTIVE.exists());self.assertEqual(f.progress(),10)
    finally:f.close()
 def test_each_durable_manual_rollback_phase_recovers_idempotently(self):
  phases=('gating-rollback','rollback-stopping','rollback-backup','rolling-back','rollback-starting','rolled-back-validated','rolled_back')
  for phase in phases:
   with self.subTest(phase=phase),tempfile.TemporaryDirectory(prefix='r82-rollback-phase-') as temp:
    f=F.Fixture(temp)
    try:
     f.deploy()
     with contextlib.closing(sqlite3.connect(f.database)) as db, db:db.execute('UPDATE progress SET value=99')
     def hook():
      original=I.write_record
      def after(directory,record,current):
       original(directory,record,current)
       if current==phase:os._exit(77)
      I.write_record=after
     f.crash(hook,manual=True);f.recover();f.recover();f.assert_intact(self,I.SOURCE_VERSION);self.assertFalse(I.ACTIVE.exists());self.assertEqual(f.progress(),99)
    finally:f.close()

if __name__=='__main__':unittest.main(verbosity=2)
