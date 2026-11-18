import contextlib,importlib.util,json,os,sqlite3,sys,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import runner as m
NODE=Path('/workspace/ccre/r79_stability_work/runtime/node-v22.23.4-linux-x64/bin/node')

class Run(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name);self.source=self.root/'game.sqlite'
  db=sqlite3.connect(self.source);db.executescript("PRAGMA journal_mode=WAL;CREATE TABLE players(id PRIMARY KEY,gold INTEGER);INSERT INTO players VALUES('p',12345);CREATE TABLE kernel511_host_boot(id INTEGER PRIMARY KEY,incarnation TEXT);INSERT INTO kernel511_host_boot VALUES(1,'boot-a');");db.close()
  self.pid='0';self.started=0;self.policy={'phase':'maintenance','deadlineMs':0}
  self.live=SimpleNamespace(node=NODE,databases={'r1':m.descriptor(self.source)},manifest={},gf=self.root/'config.json',game={})
  self.scope=contextlib.ExitStack();self.addCleanup(self.scope.close)
  for name,value in {'ROOT':self.root/'control','ACTIVE':self.root/'control/active.json','BLOCKED':self.root/'control/blocked','GUARD':self.root/'unit.d/guard.conf'}.items():self.scope.enter_context(patch.object(m,name,value))
  self.scope.enter_context(patch.object(m.installed,'prop',side_effect=lambda *a:self.pid))
  self.scope.enter_context(patch.object(m.installed,'reload'))
  self.scope.enter_context(patch.object(m.installed,'central',side_effect=lambda *a:dict(self.policy)))
  self.scope.enter_context(patch.object(m.installed,'service',side_effect=self.service))
  self.scope.enter_context(patch.object(m.installed.readiness,'wait',return_value={}))
  self.scope.enter_context(patch.object(m,'retention_minutes',return_value=60))
 def service(self,unit,action):
  if action=='stop':self.pid='0'
  if action=='start':
   self.assertFalse(m.BLOCKED.exists());self.pid='123';self.started+=1
 def gold(self):
  with sqlite3.connect(self.source) as db:return db.execute('SELECT gold FROM players').fetchone()[0]
 def test_full_copy_install_keeps_inode_and_controls(self):
  ino=self.source.stat().st_ino;m.apply(self.live)
  self.assertEqual(self.source.stat().st_ino,ino);self.assertEqual(self.gold(),12345);self.assertFalse(m.ACTIVE.exists());self.assertFalse(m.BLOCKED.exists());self.assertEqual(self.started,1)
  self.assertEqual(json.loads((m.ROOT/'last.json').read_text())['phase'],'complete')
 def test_preparation_failure_restarts_original_and_discards_partial(self):
  def fail(live,j,mode):
   (Path(j['directory'])/'verified.sqlite').write_bytes(b'partial');raise RuntimeError('copy failed')
  with patch.object(m,'worker',side_effect=fail),self.assertRaisesRegex(RuntimeError,'copy failed'):m.apply(self.live)
  self.assertEqual(self.gold(),12345);self.assertFalse(m.ACTIVE.exists());self.assertFalse(m.BLOCKED.exists());self.assertEqual(self.started,1)
  self.assertFalse(list(m.ROOT.glob('run-*/verified.sqlite')))
 def test_post_commit_crash_is_guarded_and_resumes_forward(self):
  real=m.worker
  def fail(live,j,mode):
   real(live,j,mode)
   if mode=='install':raise RuntimeError('lost worker completion')
  with patch.object(m,'worker',side_effect=fail),self.assertRaisesRegex(RuntimeError,'lost worker'):m.apply(self.live)
  self.assertEqual(m.read(m.ACTIVE)['phase'],'installing');self.assertTrue(m.BLOCKED.exists());self.assertEqual(self.started,0)
  m.recover(self.live,m.read(m.ACTIVE));self.assertEqual(self.gold(),12345);self.assertEqual(self.started,1);self.assertFalse(m.ACTIVE.exists())
 def test_recovery_after_start_does_not_restore_older_player_progress(self):
  actual=m.installed.readiness.wait
  actual.side_effect=[{},RuntimeError('health timeout')]
  with self.assertRaisesRegex(RuntimeError,'health timeout'):m.apply(self.live)
  actual.side_effect=None
  with sqlite3.connect(self.source) as db:db.execute('UPDATE players SET gold=54321')
  self.assertEqual(m.read(m.ACTIVE)['phase'],'starting')
  with patch.object(m,'worker',side_effect=AssertionError('must not copy again')):m.recover(self.live,m.read(m.ACTIVE))
  self.assertEqual(self.gold(),54321);self.assertFalse(m.ACTIVE.exists())
 def test_open_game_is_rejected_before_stop(self):
  self.policy['phase']='open'
  with self.assertRaisesRegex(RuntimeError,'bakımı'):m.apply(self.live)
  self.assertEqual(self.started,0);self.assertFalse(m.ACTIVE.exists());self.assertEqual(self.gold(),12345)
 def test_actual_retention_keeps_longer_configured_window(self):
  self.scope.close()
  # Only these two safe values are interpreted; no process secrets are logged.
  self.live.game={'environment':{'CORE511_RETENTION_MINUTES':'45'}}
  env=b'CORE_CONFIG_FILE='+str(self.live.gf).encode()+b'\0CORE511_RETENTION_MINUTES=15\0'
  with patch.object(m.installed,'prop',return_value='123'),patch.object(Path,'read_bytes',return_value=env):self.assertEqual(m.retention_minutes(self.live),1440)
 def test_unknown_recovery_phase_is_rejected(self):
  folder=m.ROOT/('run-'+'a'*32);folder.mkdir(parents=True)
  j={'version':'R122_DISK1','phase':'unexpected','directory':str(folder),'source':str(self.source),'database':self.live.databases['r1']}
  with self.assertRaisesRegex(RuntimeError,'aşaması'):m.recover(self.live,j)
  self.assertEqual(self.started,0)

if __name__=='__main__':unittest.main(verbosity=2)
