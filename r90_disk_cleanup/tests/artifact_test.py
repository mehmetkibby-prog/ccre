"""Reproduce VDS sourcemap false positives with actual lock-verified npm bytes."""
import json,sqlite3,sys,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'support'))
import cleanup as c
import cleanup_test as fixture
from storage import digest

FIXTURES=Path(__file__).parent/'fixtures/npm'

class Tests(unittest.TestCase):
 def setUp(self):
  self.f=fixture.Tests();self.f.setUp();self.addCleanup(self.f.doCleanups);self.maps=[]
  for relative in c.ARTIFACT_SOURCES:
   if not relative.endswith('.map'):continue
   local=FIXTURES/relative.removeprefix('deps/native/node_modules/')
   path=self.f.stale/relative;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(local.read_bytes());self.maps.append(path)
  self.update_manifest()
 def update_manifest(self):
  path=self.f.stale/'release-manifest.json';manifest=json.loads(path.read_bytes())
  manifest['files']=[r for r in manifest['files'] if not r['path'].endswith('.map')]
  for p in self.maps:manifest['files'].append({'path':p.relative_to(self.f.stale).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)})
  fixture.put(path,manifest)
 def test_real_npm_maps_reproduce_v2_then_unused_release_is_deleted(self):
  self.assertEqual(len(self.maps),4)
  with patch.object(c,'PACKAGED_SOURCES',c.SCHEMA_SOURCES):
   result=self.f.plan();self.assertNotIn(str(self.f.stale),result['candidates'])
   self.assertEqual(len(result['protectedDetails'][str(self.f.stale)]),4)
  self.assertIn(str(self.f.stale),self.f.plan()['candidates'])
  result=self.f.apply();self.assertEqual(result['deleted'],[str(self.f.stale)])
  self.assertTrue(self.f.current.exists() and self.f.accounts.exists() and self.f.base.exists())
 def test_changed_map_stays_protected_despite_changed_release_manifest(self):
  path=self.maps[0];value=json.loads(path.read_bytes());value['privateBackup']=[{'player':'preserve'}];fixture.put(path,value);self.update_manifest()
  result=self.f.plan();self.assertNotIn(str(self.f.stale),result['candidates'])
  self.f.apply();self.assertTrue(path.exists());self.assertIn('privateBackup',json.loads(path.read_bytes()))
 def test_identical_map_outside_original_package_path_is_protected(self):
  path=self.f.stale/'personal-snapshot.js.map';path.write_bytes(self.maps[0].read_bytes())
  self.assertNotIn(str(self.f.stale),self.f.plan()['candidates']);self.f.apply();self.assertTrue(path.exists())
 def test_sqlite_renamed_to_a_known_map_is_preserved(self):
  path=self.maps[0];path.unlink()
  with sqlite3.connect(path) as db:
   db.execute('CREATE TABLE preserved(value TEXT)');db.execute("INSERT INTO preserved VALUES ('keep')")
  self.update_manifest();self.assertNotIn(str(self.f.stale),self.f.plan()['candidates']);self.f.apply()
  with sqlite3.connect(path) as db:self.assertEqual(db.execute('SELECT value FROM preserved').fetchall(),[('keep',)])
 def test_different_tap_report_at_original_path_is_preserved(self):
  relative=next(name for name in c.ARTIFACT_SOURCES if name.endswith('.tap'))
  path=self.f.stale/relative;path.parent.mkdir(parents=True)
  body=b'TAP version 13\nok 1 - unrelated output\n1..1\n';size=c.ARTIFACT_SOURCES[relative]['bytes'];path.write_bytes(body+b' '*(size-len(body)))
  self.assertNotIn(str(self.f.stale),self.f.plan()['candidates']);self.f.apply();self.assertTrue(path.exists())
 def test_service_dependency_protects_old_release_with_real_maps(self):
  self.assertNotIn(str(self.f.stale),self.f.plan(external=str(self.f.stale/'bin/node'))['candidates'])
  self.f.apply(external=str(self.f.stale/'bin/node'));self.assertTrue(all(p.exists() for p in self.maps))

if __name__=='__main__':unittest.main(verbosity=2)
