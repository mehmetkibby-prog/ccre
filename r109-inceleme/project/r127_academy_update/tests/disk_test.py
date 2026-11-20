import hashlib,os,sqlite3,sys,tempfile,unittest
from contextlib import closing
from unittest.mock import patch
from types import SimpleNamespace
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'deployment/modules'))
from disk_space import reclaim
import disk_job

class ReclaimTest(unittest.TestCase):
 def test_operator_command_waits_for_the_worker_and_propagates_failed_cleanup(self):
  with tempfile.TemporaryDirectory() as tmp:
   package=Path(tmp)/'r127.zip';package.touch()
   for code in (0,1):
    calls=[]
    def execute(args,**kw):
     calls.append(args);return SimpleNamespace(returncode=code if args[0]=='systemd-run' else 0)
    with patch.object(disk_job.subprocess,'run',side_effect=execute):
     if code:
      with self.assertRaisesRegex(RuntimeError,'tamamlanmadı'):disk_job.dispatch('disk_clean',package)
     else:disk_job.dispatch('disk_clean',package)
    self.assertIn('--wait',calls[0]);self.assertIn('--disk-worker',calls[0]);self.assertNotIn('--no-block',calls[0])
 def test_systemd_retries_restoring_the_game_after_an_interrupted_resume(self):
  with tempfile.TemporaryDirectory() as tmp:
   mark,guard=Path(tmp)/'active',Path(tmp)/'guard.conf'
   guard.write_bytes(disk_job.GUARD_CONTENT);mark.write_bytes(b'restore-r1\n')
   calls=[]
   def interrupted(*args):
    calls.append(args)
    if args[0]=='start':raise RuntimeError('interrupted start')
   with patch.object(disk_job,'MARK',mark),patch.object(disk_job,'GUARD',guard):
    with patch.object(disk_job,'ctl',side_effect=interrupted),self.assertRaisesRegex(RuntimeError,'interrupted'):
     disk_job.resume()
    self.assertTrue(mark.exists());self.assertFalse(guard.exists())
    with patch.object(disk_job,'ctl',side_effect=lambda *args:calls.append(args)):
     disk_job.resume()
     self.assertFalse(mark.exists())
     prior=calls[:];disk_job.resume();self.assertEqual(calls,prior)
    self.assertEqual(calls.count(('daemon-reload',)),2)
    self.assertEqual(calls.count(('start',disk_job.UNIT)),2)
    self.assertEqual(calls[-1],('is-active','--quiet',disk_job.UNIT))
 def test_reclaims_free_physical_blocks_without_replacing_database_or_touching_persisted_rows(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'game.sqlite'
   with sqlite3.connect(p) as con:
    con.executescript('PRAGMA journal_mode=WAL; PRAGMA secure_delete=OFF; CREATE TABLE items(id INTEGER PRIMARY KEY, owner TEXT, data BLOB); CREATE INDEX buyers ON items(owner);')
    con.executemany('INSERT INTO items VALUES(?,?,?)',((i,'player-'+str(i%3),os.urandom(8192)) for i in range(4000)))
    con.execute('DELETE FROM items WHERE id%8!=0')
   con.close()
   def rows():
    with closing(sqlite3.connect(p)) as c:
     digest=hashlib.sha256()
     for i,owner,data in c.execute('SELECT id,owner,data FROM items ORDER BY id'):
      digest.update(str(i).encode()+owner.encode()+data)
     self.assertEqual(c.execute('PRAGMA integrity_check').fetchone(),('ok',))
     return digest.hexdigest()
   kept=rows();st=p.stat();ident=(st.st_dev,st.st_ino)
   with self.assertRaisesRegex(RuntimeError,'kimliği'):reclaim(p,(st.st_dev,st.st_ino+1))
   with sqlite3.connect(p,timeout=1) as writer:
    writer.execute('BEGIN IMMEDIATE')
    with self.assertRaises((RuntimeError,sqlite3.OperationalError)):reclaim(p,ident)
    writer.rollback()
   writer.close()
   freed=reclaim(p,ident)
   self.assertGreater(freed,15*1024**2);self.assertEqual(rows(),kept)
   self.assertEqual((p.stat().st_ino,p.stat().st_size),(st.st_ino,st.st_size))
   self.assertEqual(reclaim(p,ident),0)
   with sqlite3.connect(p) as c:
    c.execute("INSERT INTO items VALUES (5000,'new',randomblob(1048576))");c.commit()
    self.assertEqual(c.execute('SELECT length(data) FROM items WHERE id=5000').fetchone(),(1048576,))
    self.assertEqual(c.execute('PRAGMA integrity_check').fetchone(),('ok',))
   print('%.1f MiB reclaimed, live rows and index verified; file reused after restart'%(freed/1024**2))
if __name__=='__main__':unittest.main(verbosity=2)
