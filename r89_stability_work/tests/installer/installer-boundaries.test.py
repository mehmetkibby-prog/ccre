import contextlib,copy,fcntl,importlib.util,json,os,sqlite3,sys,tempfile,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('installer_fixture',Path(__file__).with_name('installer-fixture.py'));F=importlib.util.module_from_spec(spec);spec.loader.exec_module(F)
I,S,R=F.I,F.S,F.R

class R89SpecificBoundaryTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='r89-boundary-test-');self.f=F.Fixture(self.temp.name)
 def tearDown(self):self.f.close();self.temp.cleanup()
 def assert_not_stopped(self):
  self.assertFalse(any(row[0]=='stop' for row in self.f.events()));self.assertFalse(I.ACTIVE.exists())
 def test_r82_state_is_rejected_before_any_service_stop(self):
  state=F.read(I.STATE);state['r64Deployment']['version']='R82_GAMEPLAY';F.put(I.STATE,F.encoded(state),0o600)
  with self.assertRaisesRegex(RuntimeError,'yalnız doğrulanmış R86'):self.f.deploy()
  self.assert_not_stopped()
 def test_plan_requires_r86_source_and_r89_destination(self):
  for field,value in (('sourceVersion','R82_GAMEPLAY'),('version','R86_GAMEPLAY')):
   plan=copy.deepcopy(self.f.plan);plan[field]=value
   with self.assertRaisesRegex(RuntimeError,'sürüm kapsamı'):I.validate_scope(plan)
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
 def test_correctly_hashed_http_payload_cannot_add_route_logic(self):
  extra=self.f.after_http+b'\n// unreviewed HTTP route change\n'
  self.f.plan['files'][I.HTTP]['after']=F.sha(extra)
  self.f.plan['files'][I.HTTP]['bytes']=len(extra)
  self.f.updates=[(name,self.f.plan['files'][name],extra if name==I.HTTP else data) for name,meta,data in self.f.updates]
  with self.assertRaisesRegex(RuntimeError,'yalnız doğrulanmış istemci başvurularını'):self.f.deploy()
  self.assert_not_stopped()

if __name__=="__main__":unittest.main(verbosity=2)
