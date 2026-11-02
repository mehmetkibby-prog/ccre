"""Regression for real bundled SQL migrations/schema snapshots blocking R78."""
import json,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'support'))
import cleanup as c
import cleanup_test as fixture
from storage import digest

FIXTURES=Path(__file__).parent/'fixtures'
NATIVE='native510-bb3a6cc689c6'

class Tests(unittest.TestCase):
 def setUp(self):
  self.f=fixture.Tests();self.f.setUp();self.addCleanup(self.f.doCleanups)
  self.files=[]
  for name in ['drizzle/0000_good_onslaught.sql','drizzle/meta/0000_snapshot.json']:
   path=self.f.stale/NATIVE/name;path.parent.mkdir(parents=True,exist_ok=True)
   path.write_bytes((FIXTURES/Path(name).name).read_bytes());self.files.append(path)
  self.update_manifest()
 def update_manifest(self):
  path=self.f.stale/'release-manifest.json';manifest=json.loads(path.read_bytes())
  manifest['files']=[row for row in manifest['files'] if not row['path'].startswith(NATIVE+'/drizzle/')]
  for file in self.files:
   manifest['files'].append({'path':file.relative_to(self.f.stale).as_posix(),'bytes':file.stat().st_size,'sha256':digest(file)})
  fixture.put(path,manifest)
 def test_real_packaged_schema_reproduces_old_block_then_allows_unused_release(self):
  self.assertEqual(c.staging_archive_guard(self.f.stale,set()),['backup/data file']*2)
  self.assertEqual(c.staging_archive_guard(self.f.stale,set(),managed=True),[])
  self.assertIn(str(self.f.stale),self.f.plan()['candidates'])
  self.f.apply();self.assertFalse(self.f.stale.exists());self.assertTrue(self.f.current.exists() and self.f.accounts.exists() and self.f.base.exists())
 def test_same_size_modified_sql_and_manifest_do_not_bypass_hash_pin(self):
  sql=self.files[0];data=sql.read_bytes();sql.write_bytes(b'X'+data[1:]);self.update_manifest()
  result=self.f.plan();self.assertNotIn(str(self.f.stale),result['candidates'])
  self.assertEqual(result['protectedDetails'][str(self.f.stale)][0]['path'],sql.relative_to(self.f.stale).as_posix())
  self.f.apply();self.assertTrue(sql.exists())
 def test_snapshot_with_row_data_is_preserved_even_when_manifest_updated(self):
  path=self.files[1];value=json.loads(path.read_bytes());value['rows']=[{'player':'must keep'}];fixture.put(path,value);self.update_manifest()
  self.assertNotIn(str(self.f.stale),self.f.plan()['candidates']);self.f.apply();self.assertTrue(path.exists())
 def test_identical_schema_under_backup_path_is_preserved(self):
  extra=self.f.stale/'copy-snapshot.json';extra.write_bytes(self.files[1].read_bytes())
  self.assertNotIn(str(self.f.stale),self.f.plan()['candidates']);self.f.apply();self.assertTrue(extra.exists())
 def test_sql_dump_alongside_known_schema_blocks_deletion(self):
  extra=self.f.stale/'players.sql';extra.write_text("INSERT INTO players VALUES ('keep');")
  result=self.f.plan();self.assertNotIn(str(self.f.stale),result['candidates'])
  self.assertEqual(result['protectedDetails'][str(self.f.stale)],[{'reason':'backup/data file','path':'players.sql'}])
 def test_live_service_binding_still_protects_known_schema_release(self):
  self.assertNotIn(str(self.f.stale),self.f.plan(external=str(self.f.stale/'bin/node'))['candidates'])
  self.f.apply(external=str(self.f.stale/'bin/node'));self.assertTrue(self.files[0].exists())
 def test_schema_exception_does_not_apply_to_staging_folders(self):
  stage=self.f.staging();target=stage/NATIVE/'drizzle/0000_good_onslaught.sql';target.parent.mkdir(parents=True);target.write_bytes(self.files[0].read_bytes())
  self.assertEqual(c.staging_archive_guard(stage,set()),['backup/data file'])
 def test_unknown_schema_filename_is_not_whitelisted(self):
  extra=self.files[0].with_name('9999_unknown.sql');extra.write_bytes(self.files[0].read_bytes())
  self.assertNotIn(str(self.f.stale),self.f.plan()['candidates'])

if __name__=='__main__':unittest.main(verbosity=2)
