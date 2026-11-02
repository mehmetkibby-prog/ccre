import hashlib,json,os,sqlite3,sys,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'support'))
import retention as r

def write(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d))
class Tests(unittest.TestCase):
 def setUp(self):
  owner=patch.object(r,"ROOT_UID",os.geteuid());owner.start();self.addCleanup(owner.stop)
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.d=Path(self.tmp.name);self.rel=self.d/'releases';self.rel.mkdir();self.state=self.d/'state';self.state.mkdir();self.updates=self.state/'r64-updates'
  self.current=self.tree('current');self.prev=self.tree('previous');self.accounts=self.tree('accounts');self.stale=self.tree('stale')
  j=self.updates/'latest/journal.json';write(j,{'phase':'complete','source':str(self.prev),'destination':str(self.current)})
  self.live=SimpleNamespace(root=self.current,accounts_root=self.accounts,state={'r64Deployment':{'journal':str(j)}},config={},accounts_config={},manifest={})
 def tree(self,name):
  p=self.rel/('core511-'+name);p.mkdir();(p/'code.js').write_bytes(b'x'*8192)
  write(p/'release-manifest.json',{'runtimeSha256':'a'*64,'files':[{'path':'code.js','bytes':8192,'sha256':hashlib.sha256(b'x'*8192).hexdigest()}]});return p
 def plan(self,**kw):return r.plan(self.live,self.rel,self.state,external=kw.get('external',''),mounts=kw.get('mounts',set()))
 def clean(self):return r.cleanup(self.live,self.rel,self.state,apply=True,external='',mounts=set())
 def test_current_previous_accounts_retained_and_old_removed(self):
  backup=self.state/'backups/data.sqlite';backup.parent.mkdir();backup.write_bytes(b'save')
  p=self.plan();self.assertEqual(p['candidates'],[str(self.stale)]);self.assertTrue(self.stale.exists())
  self.clean();self.assertFalse(self.stale.exists());self.assertTrue(all(p.exists() for p in (self.current,self.prev,self.accounts)));self.assertEqual(backup.read_bytes(),b'save');self.assertEqual(self.clean()['deleted'],[])
 def test_effective_service_and_process_path_protected(self):
  self.assertEqual(self.plan(external=str(self.stale)+'/bin/node')['candidates'],[])
 def test_transitive_symlink_dependencies_protected(self):
  older=self.tree('older');(self.prev/'dependency').symlink_to(self.stale,target_is_directory=True);(self.stale/'dependency').symlink_to(older,target_is_directory=True);self.assertEqual(self.plan()['candidates'],[])
 def test_unknown_manifest_and_mount_preserved(self):
  (self.stale/'release-manifest.json').unlink();self.assertEqual(self.plan()['candidates'],[])
  new=self.tree('mount');self.assertEqual(self.plan(mounts={new})['candidates'],[])
 def test_database_names_and_hidden_sqlite_protected(self):
  (self.stale/'game.db').write_bytes(b'x');self.assertEqual(self.plan()['candidates'],[]);(self.stale/'game.db').unlink()
  with sqlite3.connect(self.stale/'opaque') as db:db.execute('create table account(id int)')
  self.assertEqual(self.plan()['candidates'],[])
 def test_active_update_and_reset_block_deletion(self):
  write(self.state/'other/active.json',{} )
  with self.assertRaisesRegex(RuntimeError,'Yarım'):self.clean()
  self.assertTrue(self.stale.exists())
 def test_bad_rollback_record_blocks(self):
  write(Path(self.live.state['r64Deployment']['journal']),{'phase':'complete','source':str(self.prev),'destination':str(self.stale)})
  with self.assertRaises(RuntimeError):self.clean()
 def test_hardlinks_are_not_counted_as_reclaimed_if_live(self):
  before=self.plan()['reclaimableBytes'];os.link(self.stale/'code.js',self.current/'shared.js');after=self.plan()['reclaimableBytes'];self.assertEqual(before-after,(self.stale/'code.js').stat().st_blocks*512)
  self.clean();self.assertEqual((self.current/'shared.js').read_bytes(),b'x'*8192)
 def test_external_symlink_not_followed(self):
  outside=self.d/'outside';outside.mkdir();(outside/'safe').write_text('ok');(self.stale/'external').symlink_to(outside,target_is_directory=True);self.clean();self.assertEqual((outside/'safe').read_text(),'ok')
 def test_new_process_reference_before_delete_stops(self):
  with patch.object(r,'system_references',side_effect=['',str(self.stale)]):
   with self.assertRaisesRegex(RuntimeError,'kullanımı değişti'):r.cleanup(self.live,self.rel,self.state,apply=True,mounts=set())
  self.assertTrue(self.stale.exists())
 def test_interrupted_deletion_retries_without_manifest(self):
  real=r.shutil.rmtree
  def interrupted(p):
   (p/'release-manifest.json').unlink();raise OSError('power loss')
  with patch.object(r.shutil,'rmtree',interrupted):
   interrupted.avoids_symlink_attacks=True
   with self.assertRaisesRegex(OSError,'power loss'):self.clean()
  self.assertTrue(self.stale.exists());self.clean();self.assertFalse(self.stale.exists())
 def test_active_alias_and_unknown_tree_dependency_protected(self):
  (self.rel.parent/'current').symlink_to(self.stale,target_is_directory=True);self.assertEqual(self.plan()['candidates'],[]);(self.rel.parent/'current').unlink()
  unknown=self.rel/'custom';unknown.mkdir();(unknown/'dep').symlink_to(self.stale,target_is_directory=True);self.assertEqual(self.plan()['candidates'],[])
if __name__=='__main__':unittest.main(verbosity=2)
