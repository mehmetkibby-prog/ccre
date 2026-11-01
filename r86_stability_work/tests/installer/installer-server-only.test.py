import contextlib,copy,fcntl,hashlib,importlib.util,json,os,sqlite3,stat,sys,tempfile,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('installer_fixture',Path(__file__).with_name('installer-fixture.py'));F=importlib.util.module_from_spec(spec);spec.loader.exec_module(F)
I,S,R=F.I,F.S,F.R

class InstallerTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='r86-installer-test-');self.f=F.Fixture(self.temp.name)
 def tearDown(self):self.f.close();self.temp.cleanup()
 def assert_recovered(self):
  self.f.assert_intact(self,I.SOURCE_VERSION);self.assertEqual(self.f.state_file.read_bytes(),self.f.before_state);self.assertFalse(I.ACTIVE.exists());self.assertEqual((self.f.root/self.f.b).read_bytes(),self.f.before_b);self.assertFalse((self.f.root/(I.old.CORE+'nested')).exists());self.assertFalse(any(self.f.root.parent.glob('.r86-stage-*')));self.assertEqual(F.read(self.f.policy_file),self.f.policy)
  for unit in (self.f.unit,self.f.rt):self.assertFalse(I.guard_path(unit).exists());self.assertEqual(F.read(self.f.service_file)[unit],'active')
 def test_apply_then_idempotent_apply_no_release_clone_runtime_or_database_change(self):
  original={p.relative_to(self.f.root).as_posix():p.read_bytes() for p in self.f.root.rglob('*') if p.is_file()}
  self.assertTrue(self.f.deploy());self.f.assert_intact(self,I.VERSION);directory,record=self.f.journal()
  self.assertEqual(record['phase'],'complete');self.assertEqual(record['databaseBackup']['status'],'deleted');self.assertFalse(I.ACTIVE.exists());self.assertFalse(any(self.f.root.parent.glob('.r86-stage-*')))
  self.assertEqual(F.read(self.f.policy_file),self.f.policy);self.assertEqual(record['files'][-1]['path'],'release-manifest.json');self.assertEqual({p.name:p.read_bytes() for p in (directory/'code').iterdir()},{row['backup']:original[row['path']] for row in record['files'] if row['before'] is not None})
  events=self.f.events();stop=min(i for i,row in enumerate(events) if row[0]=='stop');backup=next(i for i,row in enumerate(events) if row[0]=='backup-start');self.assertLess(stop,backup)
  self.assertFalse(self.f.deploy());self.assertEqual(len(list(self.f.work.glob('*/journal.json'))),1)
 def test_health_failure_rolls_back_code_but_keeps_post_backup_progress_and_account(self):
  self.f.fail_target=True;self.f.write_on_fail=True
  with self.assertRaisesRegex(RuntimeError,'health failure'):self.f.deploy()
  self.assert_recovered();self.assertEqual(self.f.progress(),20)
  with contextlib.closing(sqlite3.connect(self.f.account_db)) as db, db:self.assertEqual(db.execute('SELECT COUNT(*) FROM accounts').fetchone()[0],2)
  _,record=self.f.journal();self.assertEqual(record['phase'],'rolled_back');self.assertEqual(record['databaseBackup']['status'],'deleted')
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
 def test_before_hash_gate_refuses_unknown_source_without_stopping(self):
  (self.f.root/self.f.a).write_bytes(b'unknown original source')
  with self.assertRaises(RuntimeError):self.f.deploy()
  self.assertFalse(any(r[0]=='stop' for r in self.f.events()));self.assertFalse(I.ACTIVE.exists())
 def test_r85_journal_cannot_be_adopted_by_r86_recovery(self):
  self.f.deploy();directory,record=self.f.journal()
  record['version']='R85_GAMEPLAY';record['kind']='inplace-r85';F.put(directory/'journal.json',F.encoded(record),0o600)
  before=list(self.f.events())
  with self.assertRaisesRegex(RuntimeError,'farklı pakete ait'):self.f.recover(manual=True)
  self.assertEqual(self.f.events(),before);self.f.assert_intact(self,I.VERSION)

 def test_actual_package_source_and_retained_graph_scope(self):
  plan=json.loads((F.BASE/'r86-package/update.json').read_text())
  # Health readiness is a live response constant, not inferred from STATE.
  # Reusing an R85 health marker would force an otherwise valid R86 rollback.
  health=F.BASE/'r86-package/payload/core511-source/scripts/core511/native-http-bindings.mjs'
  if not health.exists():health=F.BASE/'working/core511-source/scripts/core511/native-http-bindings.mjs'
  self.assertIn("updateVersion:'"+plan['version']+"'",health.read_text())
  # The fixture has smaller pinned bytes; restore exact shipped constants for
  # this independent real-plan/schema check.
  with patch.object(I,'SOURCE_CORE_SHA256',plan['baseCoreSHA256']),patch.object(I,'R85_HTTP_SHA256',plan['httpEntrySHA256']):
   I.validate_scope(plan)
   self.assertFalse(plan['clientChanges'])
   self.assertEqual(plan['client']['oldNamespace'],plan['client']['namespace'])
   self.assertEqual(plan['client']['oldName'],plan['client']['name'])
   self.assertEqual(I.old.identity_from_rows(plan['baseCoreRows']),plan['baseCoreSHA256'])
   for name,meta in plan['files'].items():
    data=(F.BASE/'r86-package/payload'/name).read_bytes()
    self.assertEqual(len(data),meta['bytes']);self.assertEqual(F.sha(data),meta['after'])
   for key,value in [('clientChanges',True),('baseCoreSHA256','0'*64),('sourceVersion','R84_GAMEPLAY')]:
    bad=copy.deepcopy(plan);bad[key]=value
    with self.assertRaises(RuntimeError):I.validate_scope(bad)
 def test_client_or_ingress_payload_injection_rejected_before_service_stop(self):
  for name in (I.HTTP,I.ingress.PATH,I.CLIENT_ASSETS+I.CLIENT_NAMESPACE+'/injected.js'):
   bad=copy.deepcopy(self.f.plan);bad['files'][name]={'before':None,'after':F.sha(b'injected'),'bytes':8}
   with self.assertRaises(RuntimeError):I.validate_scope(bad)
  self.assertFalse(any(r[0]=='stop' for r in self.f.events()))
 def test_retained_ingress_tamper_rejected_before_service_stop(self):
  (self.f.root/I.ingress.PATH).write_bytes(b'changed ingress')
  with self.assertRaises(RuntimeError):self.f.deploy()
  self.assertFalse(any(r[0]=='stop' for r in self.f.events()))
 def test_retained_http_tamper_rejected_before_service_stop(self):
  (self.f.root/I.HTTP).write_bytes(b'changed HTTP')
  with self.assertRaises(RuntimeError):self.f.deploy()
  self.assertFalse(any(r[0]=='stop' for r in self.f.events()))

if __name__=='__main__':unittest.main(verbosity=2)
