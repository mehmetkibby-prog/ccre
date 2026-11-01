import contextlib,copy,fcntl,importlib.util,json,os,sqlite3,sys,tempfile,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('installer_fixture',Path(__file__).with_name('installer-fixture.py'));F=importlib.util.module_from_spec(spec);spec.loader.exec_module(F)
I,S,R=F.I,F.S,F.R

class CliAndFailureTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='r89-cli-test-');self.f=F.Fixture(self.temp.name);self.archive=self.f.base/'r89-fixture.zip'
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
 def test_failed_rollback_start_is_fenced_and_subsequent_recovery_succeeds(self):
  self.f.fail_target=True;self.f.fail_previous=True
  with self.assertRaisesRegex(RuntimeError,'health failure'):self.main('--apply')
  self.assertEqual(self.f.journal()[1]['phase'],'rollback-starting');self.assertTrue(I.ACTIVE.exists());self.f.assert_intact(self,I.SOURCE_VERSION)
  for unit in (self.f.unit,self.f.rt):self.assertTrue(I.guard_path(unit).exists());self.assertEqual(F.read(self.f.service_file)[unit],'inactive')
  self.f.fail_previous=False;self.main('--recover');self.assertFalse(I.ACTIVE.exists());self.f.assert_intact(self,I.SOURCE_VERSION)
 def test_quick_check_failure_happens_before_any_code_replacement(self):
  original=S._replace;replacements=[]
  def record(*args,**kwargs):replacements.append(args[2]['path']);return original(*args,**kwargs)
  with patch.object(I.old,'verify_database_backup',side_effect=RuntimeError('injected quick_check failure')),patch.object(S,'_replace',record):
   with self.assertRaisesRegex(RuntimeError,'quick_check failure'):self.main('--apply')
  self.assertEqual(replacements,[]);self.f.assert_intact(self,I.SOURCE_VERSION);self.assertFalse(I.ACTIVE.exists());self.assertEqual(self.f.database.stat().st_ino,self.f.db_identity['inode'])
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

if __name__=="__main__":unittest.main(verbosity=2)
