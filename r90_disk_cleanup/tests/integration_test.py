"""Real temp files, SQLite and flock; simulated systemd/health/Live binding."""
import json,os,sqlite3,sys,unittest
from pathlib import Path
from unittest.mock import Mock,patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'support'))
import cleanup as c
import installer as m
import retention as r
from storage import descriptor,digest,lock,require
import cleanup_test as fixture

class Tests(unittest.TestCase):
 def setUp(self):
  self.f=fixture.Tests();self.f.setUp();self.addCleanup(self.f.doCleanups)
  f=self.f;live=f.live;self.stage=f.staging()
  live.database=f.root/'game-data/game.sqlite';live.accounts_database=f.root/'accounts-data/accounts.sqlite'
  self.db_files=[]
  for db in (live.database,live.accounts_database):
   db.parent.mkdir();folder=db.parent/'backups';folder.mkdir();(folder/'.backup.lock').touch()
   for path in (db,folder/'daily.sqlite'):
    with sqlite3.connect(path) as connection:
     connection.execute('CREATE TABLE preserved(value TEXT)');connection.execute("INSERT INTO preserved VALUES ('keep me')")
    self.db_files.append(path)
  live.accounts_file=fixture.put(f.data/'accounts-config.json',{'database':str(live.accounts_database)})
  manifest=fixture.put(f.data/'realm.json',{'database':str(live.database)})
  live.config={'database':str(live.database),'realm':{'manifestFile':str(manifest)}}
  fixture.put(live.config_file,live.config);f.record['beforeConfig']=m.file_record(live.config_file);fixture.put(f.journal,f.record)
  identity=descriptor(live.database);accounts={'database':descriptor(live.accounts_database),'pid':123}
  live.active_binding=Mock();live.health=Mock();live.accounts_identity=Mock(return_value=accounts)
  live.same_database=Mock(side_effect=lambda:require(descriptor(live.database)==identity,'database identity changed'))
  live.account_stable=Mock(side_effect=lambda expected:require(expected==accounts,'account identity changed'))
  live.backup_binding=Mock()
  for target,name,value in ((c,'DATA',f.data),(m,'STATE',f.data/'state.json'),(m,'RELEASES',f.releases),(m,'Live',lambda:live),(r,'system_references',lambda:str(f.base)),(r,'mount_points',lambda:set())):
   f.stack.enter_context(patch.object(target,name,value))
  # Production requires uid 0; these real filesystem tests run as uid 1000.
  f.stack.enter_context(patch.object(c.os,'geteuid',return_value=0))
  self.before={p:digest(p) for p in [*self.db_files,f.data/'state.json',f.config_file,f.journal,f.journal.parent/'code/0.before',f.current/'code.js']}
 def assert_preserved(self):
  self.assertEqual({p:digest(p) for p in self.before},self.before)
  for p in self.db_files:
   with sqlite3.connect(p.as_uri()+'?mode=ro',uri=True) as db:
    self.assertEqual(db.execute('SELECT value FROM preserved').fetchall(),[('keep me',)])
 def test_readonly_inspection_then_apply_and_repeated_apply(self):
  f=self.f
  report=c.run(apply=False);self.assertEqual(set(report['candidates']),{str(f.stale),str(self.stage)})
  self.assertTrue(f.stale.exists() and self.stage.exists());self.assertFalse((f.data/'release-retention').exists());self.assert_preserved()
  report=c.run(apply=True);self.assertEqual(len(report['deleted']),2)
  self.assertFalse(f.stale.exists() or self.stage.exists());self.assert_preserved()
  self.assertEqual(c.run(apply=True)['deleted'],[]);self.assert_preserved()
  self.assertTrue(f.live.health.called);self.assertTrue(all(call.kwargs=={'empty':False} for call in f.live.health.call_args_list))
 def test_daily_backup_locks_stop_before_deletion(self):
  for db in (self.f.live.database,self.f.live.accounts_database):
   with lock(db.parent/'backups/.backup.lock'):
    with self.assertRaises(BlockingIOError):c.run(apply=True)
   self.assertTrue(self.f.stale.exists() and self.stage.exists());self.assert_preserved()
 def test_install_lock_stops_before_deletion(self):
  with lock(self.f.data/'r23-backups/install.lock'):
   with self.assertRaises(BlockingIOError):c.run(apply=True)
  self.assertTrue(self.f.stale.exists());self.assert_preserved()
 def test_initial_health_failure_stops_before_deletion(self):
  self.f.live.health.side_effect=RuntimeError('health failed')
  with self.assertRaisesRegex(RuntimeError,'health failed'):c.run(apply=True)
  self.assertTrue(self.f.stale.exists());self.assert_preserved()
 def test_health_change_before_first_deletion_stops(self):
  self.f.live.health.side_effect=[None,None,RuntimeError('health changed')]
  with self.assertRaisesRegex(RuntimeError,'health changed'):c.run(apply=True)
  self.assertTrue(self.f.stale.exists() and self.stage.exists());self.assert_preserved()
 def test_missing_backup_lock_refuses_cleanup(self):
  (self.f.live.database.parent/'backups/.backup.lock').unlink()
  with self.assertRaisesRegex(RuntimeError,'yedek kilidi'):c.run(apply=True)
  self.assertTrue(self.f.stale.exists());self.assert_preserved()
 def test_late_configuration_change_stops_cleanup(self):
  calls=[]
  def references():
   calls.append(1)
   if len(calls)==1:fixture.put(self.f.live.accounts_file,{'database':'changed'})
   return str(self.f.base)
  with patch.object(r,'system_references',side_effect=references):
   with self.assertRaisesRegex(RuntimeError,'ayar kaydı değişti'):c.run(apply=True)
  self.assertTrue(self.f.stale.exists() and self.stage.exists())
 def test_command_line_requires_explicit_action(self):
  with patch.object(sys,'argv',['cleanup.zip']):
   with self.assertRaises(SystemExit) as result:c.main()
  self.assertEqual(result.exception.code,2);self.assertTrue(self.f.stale.exists());self.assert_preserved()

if __name__=='__main__':unittest.main(verbosity=2)
