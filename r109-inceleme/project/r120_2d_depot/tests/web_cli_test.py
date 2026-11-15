"""Web preparation CLI requires maintenance and refuses pending game installs."""
import contextlib,json,sys,tempfile,time,unittest
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'deployment/modules'))
import installer as m
class CLI(unittest.TestCase):
 def setUp(self):
  self.scope=contextlib.ExitStack();self.addCleanup(self.scope.close);self.root=Path(self.scope.enter_context(tempfile.TemporaryDirectory()))
  self.archive=ROOT/json.loads((ROOT/'evidence/package.json').read_text())['file']
  for name,value in {'STATE':self.root/'state.json','CONTROL':self.root/'control','ACTIVE':self.root/'control/active.json'}.items():self.scope.enter_context(patch.object(m,name,value))
  self.scope.enter_context(patch.object(m,'discover',return_value=SimpleNamespace()))
  self.scope.enter_context(patch.object(m.source_identity,'resolve',return_value={'fixture':'source identity separately tested'}))
  self.scope.enter_context(patch.object(m.os,'geteuid',return_value=0))
  self.policy={'phase':'open','deadlineMs':0};self.central=self.scope.enter_context(patch.object(m,'central',side_effect=lambda *a:dict(self.policy)))
  self.prepare=self.scope.enter_context(patch.object(m.web_prepare,'prepare'));self.rollback=self.scope.enter_context(patch.object(m.web_prepare,'rollback'));self.check=self.scope.enter_context(patch.object(m.web_prepare,'preflight'));self.scope.enter_context(patch.object(m,'say'))
 def command(self,flag):
  with patch.object(sys,'argv',['installer','--'+flag]):m.main(self.archive)
 def test_readonly_check_works_while_game_is_open(self):
  self.command('check-web');self.check.assert_called_once();self.prepare.assert_not_called();self.rollback.assert_not_called();self.central.assert_not_called()
 def test_prepare_and_rollback_require_completed_maintenance_countdown(self):
  for flag in ('prepare-web','rollback-web'):
   for policy in ({'phase':'open'},{'phase':'countdown'},{'phase':'maintenance','deadlineMs':int(time.time()*1000)+60000}):
    self.policy=policy
    with self.assertRaisesRegex(RuntimeError,'bakımı'):self.command(flag)
  self.prepare.assert_not_called();self.rollback.assert_not_called()
  self.policy={'phase':'maintenance','deadlineMs':0};self.command('prepare-web');self.prepare.assert_called_once();self.command('rollback-web');self.rollback.assert_called_once()
 def test_other_incomplete_install_is_not_ignored(self):
  self.policy={'phase':'maintenance','deadlineMs':0};marker=self.root/'r101/active.json';marker.parent.mkdir();marker.write_text('{}')
  with self.assertRaisesRegex(RuntimeError,'Başka kurulum'):self.command('prepare-web')
  self.prepare.assert_not_called()
if __name__=='__main__':unittest.main()
