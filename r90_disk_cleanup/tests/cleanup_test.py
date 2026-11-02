import contextlib,hashlib,json,os,sqlite3,sys,tempfile,time,unittest,zipfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'support'))
import cleanup as c
import retention as r
import installer as m
from storage import digest,encoded
from rollback_scope import validate_rollback
import rollback_scope

def put(path,value):
 path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(encoded(value));return path

class Tests(unittest.TestCase):
 def setUp(self):
  for module in (c,r,rollback_scope):
   owner=patch.object(module,"ROOT_UID",os.geteuid());owner.start();self.addCleanup(owner.stop)
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name)
  self.releases=self.root/'releases';self.releases.mkdir();self.data=self.root/'state';self.data.mkdir();self.home=self.root/'root';self.home.mkdir()
  self.current=self.release('r79');self.accounts=self.release('r66-accounts');self.stale=self.release('r78');self.base=self.release('698')
  self.journal=self.data/'r64-updates/current/journal.json';self.journal.parent.mkdir(parents=True)
  self.stack=contextlib.ExitStack();self.addCleanup(self.stack.close)
  self.stack.enter_context(patch.object(m,'SYSTEMD',self.root/'systemd'))
  self.config_file=put(self.data/'game-config.json',{'runtime':str(self.current)})
  dropin=m.unit_path('coreoflife-r1.service');dropin.parent.mkdir(parents=True);dropin.write_text('[Service]\nWorkingDirectory='+str(self.current)+'\n')
  state={'installed':True,'releaseRoot':str(self.current),'r64Deployment':{'version':'R90_GAMEPLAY','accountsRoot':str(self.accounts),'journal':str(self.journal),'inPlace':True}}
  put(self.data/'state.json',state);old={**state,'r64Deployment':{**state['r64Deployment'],'version':'R89_GAMEPLAY'}}
  for path in [self.journal.parent/'code/0.before']:
   path.parent.mkdir();path.write_bytes(b'before')
  current=self.current/'code.js';current.write_bytes(b'after');current.chmod(0o644)
  self.record={'version':'R90_GAMEPLAY','kind':'inplace-r90','phase':'complete','root':str(self.current),
   'beforeState':self.snapshot(old),'afterState':self.snapshot(state),
   'beforeConfig':m.file_record(self.config_file),'beforeDropin':m.file_record(dropin),
   'files':[{'path':'code.js','slot':'0','before':hashlib.sha256(b'before').hexdigest(),'after':digest(current),'backup':'0.before','mode':0o644,'afterMode':0o644,'uid':os.geteuid(),'gid':os.getegid()}]}
  put(self.journal,self.record)
  self.live=SimpleNamespace(root=self.current,accounts_root=self.accounts,state=state,config={},accounts_config={},manifest={},config_file=self.config_file,unit='coreoflife-r1.service')
  self.stack.enter_context(patch.object(c,'STAGING_PARENTS',(self.home,)))
 def snapshot(self,state):
  data=encoded(state);return {'path':str(self.data/'state.json'),'exists':True,'data':data.hex(),'sha256':hashlib.sha256(data).hexdigest()}
 def release(self,name):
  p=self.releases/('core511-'+name);p.mkdir();(p/'code.js').write_bytes(b'code')
  put(p/'release-manifest.json',{'runtimeSha256':'a'*64,'files':[{'path':'code.js','bytes':4,'sha256':digest(p/'code.js')}]});return p
 def staging(self,name='col-entry420.fixture'):
  p=self.home/name;p.mkdir();(p/'installer.py').write_text('print("old installer")');os.utime(p,(time.time()-7200,)*2);return p
 def plan(self,**kwargs):
  return r.plan(self.live,self.releases,self.data,external=kwargs.get('external',str(self.base)),mounts=kwargs.get('mounts',set()),staging=c.staging_directories)
 def apply(self,**kwargs):
  return r.cleanup(self.live,self.releases,self.data,apply=True,external=kwargs.get('external',str(self.base)),mounts=set(),staging=c.staging_directories,recheck=kwargs.get('recheck',lambda:None))
 def test_current_rollback_keeps_active_root_but_does_not_pin_old_clone(self):
  p=self.staging();before=(self.current/'code.js').read_bytes();backup=self.journal.parent/'code/0.before'
  for name in ['CORE511_R90_DUZELTILMIS.zip','CORE511_R91_TOPLU.zip','core-guncel.tgz']:(self.home/name).write_bytes(b'keep archive')
  db=self.data/'launch-reset-r63/keep.sqlite';db.parent.mkdir();db.write_bytes(b'keep backup')
  selected=self.plan();self.assertEqual(set(selected['candidates']),{str(self.stale),str(p)})
  result=self.apply();self.assertEqual(len(result['deleted']),2)
  self.assertFalse(self.stale.exists());self.assertFalse(p.exists());self.assertEqual((self.current/'code.js').read_bytes(),before)
  self.assertTrue(self.accounts.exists() and self.base.exists());self.assertEqual(backup.read_bytes(),b'before');self.assertEqual(db.read_bytes(),b'keep backup')
  self.assertEqual(len(list(self.home.glob('*.zip'))),2);self.assertEqual(self.apply()['deleted'],[])
 def test_corrupt_or_missing_rollback_backup_refuses_all_deletion(self):
  (self.journal.parent/'code/0.before').write_bytes(b'bad')
  with self.assertRaisesRegex(RuntimeError,'yedek|yedeği'):self.apply()
  self.assertTrue(self.stale.exists())
 def test_changed_state_and_wrong_old_release_refuse(self):
  state=json.loads((self.data/'state.json').read_bytes());state['other']='changed';put(self.data/'state.json',state)
  with self.assertRaises(RuntimeError):self.apply()
  put(self.data/'state.json',self.live.state);old=json.loads(bytes.fromhex(self.record['beforeState']['data']));old['releaseRoot']=str(self.stale);self.record['beforeState']=self.snapshot(old);put(self.journal,self.record)
  with self.assertRaisesRegex(RuntimeError,'farklı oyun'):self.apply()
 def test_rollback_different_account_root_refuses(self):
  old=json.loads(bytes.fromhex(self.record['beforeState']['data']));old['r64Deployment']['accountsRoot']=str(self.stale);self.record['beforeState']=self.snapshot(old);put(self.journal,self.record)
  with self.assertRaisesRegex(RuntimeError,'hesap'):self.apply()
 def test_running_process_and_service_pin_old_release(self):
  self.assertNotIn(str(self.stale),self.plan(external=str(self.stale/'bin/node'))['candidates'])
 def test_rollback_configuration_dependencies_are_protected(self):
  put(self.config_file,{'runtime':str(self.stale/'bin/node')})
  self.record['beforeConfig']=m.file_record(self.config_file);put(self.journal,self.record)
  self.assertNotIn(str(self.stale),self.plan()['candidates'])
 def test_corrupt_rollback_configuration_stops_deletion(self):
  self.record['beforeConfig']['data']=b'corrupt'.hex();put(self.journal,self.record)
  with self.assertRaisesRegex(RuntimeError,'ayar kopyası'):self.apply()
  self.assertTrue(self.stale.exists())
 def test_service_alias_outside_release_parent_is_resolved(self):
  parent=self.root/'legacy-app';parent.mkdir();alias=parent/'current';alias.symlink_to(self.stale,target_is_directory=True)
  self.assertNotIn(str(self.stale),self.plan(external=str(alias))['candidates'])
 def test_opaque_archive_in_old_release_is_preserved(self):
  (self.stale/'old-data.tar.gz').write_bytes(b'opaque archive')
  self.assertNotIn(str(self.stale),self.plan()['candidates'])
 def test_unknown_staging_dependency_pins_release_and_its_transitive_dependency(self):
  unknown=self.staging('personal-project');other=self.release('older')
  (unknown/'needed').symlink_to(self.stale,target_is_directory=True);(self.stale/'needed').symlink_to(other,target_is_directory=True)
  candidates=self.plan()['candidates'];self.assertNotIn(str(unknown),candidates);self.assertNotIn(str(self.stale),candidates);self.assertNotIn(str(other),candidates)
 def test_preserved_database_folder_pins_referenced_release(self):
  p=self.staging();(p/'game.db').write_bytes(b'potential data');(p/'needed').symlink_to(self.stale,target_is_directory=True)
  candidates=self.plan()['candidates'];self.assertNotIn(str(p),candidates);self.assertNotIn(str(self.stale),candidates)
 def test_sqlite_without_extension_and_backup_directory_are_protected(self):
  p=self.staging();
  with sqlite3.connect(p/'opaque') as db:db.execute('create table data(v)')
  self.assertNotIn(str(p),self.plan()['candidates']);(p/'opaque').unlink();(p/'backups').mkdir();self.assertNotIn(str(p),self.plan()['candidates'])
 def test_installer_zip_allowed_but_unknown_and_nested_archives_protected(self):
  p=self.staging();z=p/'old.zip'
  def ziprows(names):
   with zipfile.ZipFile(z,'w') as a:
    for name in names:a.writestr(name,b'placeholder')
   os.utime(p,(time.time()-7200,)*2)
  ziprows(['__main__.py','update.json','modules/installer.py']);self.assertIn(str(p),self.plan()['candidates'])
  ziprows(['__main__.py','update.json','game.sqlite']);self.assertNotIn(str(p),self.plan()['candidates'])
  ziprows(['__main__.py','update.json','payload.tar.xz']);self.assertNotIn(str(p),self.plan()['candidates'])
  ziprows(['user-document']);self.assertNotIn(str(p),self.plan()['candidates'])
 def test_future_current_and_unknown_staging_names_preserved(self):
  for name in ['core-r90-abc','core-r91-abc','col-entry426.abc','personal']:
   p=self.staging(name);self.assertNotIn(str(p),self.plan()['candidates'])
  p=self.staging('core-r64-abc');self.assertIn(str(p),self.plan()['candidates'])
 def test_young_or_group_writable_staging_is_preserved(self):
  p=self.staging();os.utime(p,None);self.assertNotIn(str(p),self.plan()['candidates']);os.utime(p,(time.time()-7200,)*2);p.chmod(0o777);self.assertNotIn(str(p),self.plan()['candidates'])
 def test_active_update_refuses(self):
  put(self.data/'r64-updates/active.json',{})
  with self.assertRaisesRegex(RuntimeError,'Yarım'):self.apply()
 def test_state_guard_checked_again_before_each_deletion(self):
  calls=[]
  def guard():
   calls.append(1)
   if len(calls)>1:raise RuntimeError('state changed')
  with self.assertRaisesRegex(RuntimeError,'state changed'):self.apply(recheck=guard)
  self.assertTrue(self.stale.exists())
 def test_new_unknown_folder_dependency_is_discovered_before_delete(self):
  calls=[]
  def guard():
   calls.append(1)
   if len(calls)==2:
    p=self.staging('new-project');(p/'needed').symlink_to(self.stale,target_is_directory=True)
  with self.assertRaisesRegex(RuntimeError,'kullanımı değişti'):self.apply(recheck=guard)
  self.assertTrue(self.stale.exists())
 def test_symlink_staging_root_and_mount_are_preserved(self):
  p=self.home/'col-entry420.alias';p.symlink_to(self.current,target_is_directory=True);self.assertNotIn(p,c.staging_directories())
  p=self.staging();self.assertNotIn(str(p),self.plan(mounts={p})['candidates'])

if __name__=='__main__':unittest.main(verbosity=2)
