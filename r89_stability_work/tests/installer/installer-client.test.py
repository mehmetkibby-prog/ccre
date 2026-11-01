"""Immutable client graph and in-place crash/recovery boundaries."""
import copy
import importlib.util
import json
import os
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('installer_fixture',Path(__file__).with_name('installer-fixture.py'));F=importlib.util.module_from_spec(spec);spec.loader.exec_module(F)
I,S=F.I,F.S


class ImmutableClientTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='r89-immutable-client-');self.f=F.Fixture(self.temp.name)
 def tearDown(self):self.f.close();self.temp.cleanup()
 def assert_not_stopped(self):
  self.assertFalse(any(row[0]=='stop' for row in self.f.events()));self.assertFalse(I.ACTIVE.exists())
 def test_complete_circular_graph_portal_ssr_html_manifest_and_old_inodes(self):
  self.f.deploy();self.f.assert_intact(self,I.VERSION)
  new=self.f.root/(I.CLIENT_ASSETS+I.CLIENT_NAMESPACE)
  for name in (I.CLIENT_NAME,'auth-portal.js','bootstrap.js'):
   text=(new/name).read_text()
   for referenced in re.findall(r'"(\./[^\"]+)"',text):self.assertTrue((new/referenced).is_file(),referenced)
   self.assertNotIn(I.CLIENT_OLD_NAME,text);self.assertNotIn(I.CLIENT_OLD_NAMESPACE,text)
  self.assertIn('/assets/'+I.CLIENT_NAMESPACE+'/nested/image.webp',(new/I.CLIENT_NAME).read_text())
  _,record=self.f.journal();links=[row for row in record['files'] if row.get('linkSource')]
  self.assertEqual(len(links),3)
  for row in links:
   self.assertIsNone(row['before']);self.assertIsNone(row['backup'])
   self.assertTrue(row['linkSource'].startswith(I.CLIENT_ASSETS+I.CLIENT_OLD_NAMESPACE+'/'))
   self.assertTrue(row['path'].startswith(I.CLIENT_ASSETS+I.CLIENT_NAMESPACE+'/'))
 def test_crash_after_hardlink_restores_refs_and_unlinks_only_new_names(self):
  old=self.f.root/(I.CLIENT_ASSETS+I.CLIENT_OLD_NAMESPACE+'/plain.js');before=old.stat().st_nlink
  def hook():
   original=S._link
   def die(root,row):
    original(root,row)
    if row['path'].endswith('/plain.js'):os._exit(77)
   S._link=die
  self.f.crash(hook);self.assertEqual(old.stat().st_nlink,before+1)
  self.f.recover();self.f.assert_intact(self,I.SOURCE_VERSION);self.assertEqual(old.stat().st_nlink,before)
  self.assertFalse(I.ACTIVE.exists())
 def test_existing_new_namespace_is_preserved_and_update_refused(self):
  path=self.f.root/(I.CLIENT_ASSETS+I.CLIENT_NAMESPACE);path.mkdir();(path/'owner.txt').write_text('owner data')
  with self.assertRaisesRegex(RuntimeError,'zaten var'):self.f.deploy()
  self.assertEqual((path/'owner.txt').read_text(),'owner data');self.assert_not_stopped()
 def test_corrupt_old_graph_refused_before_any_service_stop(self):
  (self.f.root/next(iter(self.f.old_assets))).write_bytes(b'unknown old asset')
  with self.assertRaises(RuntimeError):self.f.deploy()
  self.assert_not_stopped()
 def test_parent_symlink_in_old_graph_refused_before_stop(self):
  old=self.f.root/(I.CLIENT_ASSETS+I.CLIENT_OLD_NAMESPACE+'/nested');saved=old.with_name('original-nested');old.rename(saved);old.symlink_to(saved,target_is_directory=True)
  with self.assertRaisesRegex(RuntimeError,'sembolik bağ'):self.f.deploy()
  self.assert_not_stopped()
 def test_explicit_package_cannot_inject_link_source(self):
  plan=copy.deepcopy(self.f.plan);plan['files'][self.f.a]['linkSource']=self.f.b
  with self.assertRaisesRegex(RuntimeError,'doğrudan istemci bağı'):I.validate_scope(plan)
 def test_journal_link_source_cannot_be_redirected_to_core(self):
  self.f.deploy();directory,record=self.f.journal()
  row=next(row for row in record['files'] if row.get('linkSource'));row['linkSource']=self.f.a
  F.put(directory/'journal.json',F.encoded(record),0o600);events=self.f.events()
  with self.assertRaisesRegex(RuntimeError,'bağı kimliği farklı'):self.f.recover(manual=True)
  self.assertEqual(self.f.events(),events);self.f.assert_intact(self,I.VERSION)
 def test_journal_created_directories_cannot_include_owner_directory(self):
  self.f.deploy();directory,record=self.f.journal();owner=self.f.root/'owner-empty';owner.mkdir()
  record['createdDirectories'].append('owner-empty');F.put(directory/'journal.json',F.encoded(record),0o600);events=self.f.events()
  with self.assertRaisesRegex(RuntimeError,'yeni dizin kapsamı'):self.f.recover(manual=True)
  self.assertEqual(self.f.events(),events);self.assertTrue(owner.is_dir());self.f.assert_intact(self,I.VERSION)
 def test_modified_new_hardlink_identity_blocks_rollback_without_old_graph_mutation(self):
  self.f.deploy();new=self.f.root/(I.CLIENT_ASSETS+I.CLIENT_NAMESPACE+'/plain.js');data=new.read_bytes();replacement=new.with_suffix('.replacement');replacement.write_bytes(data);replacement.chmod(new.stat().st_mode & 0o777);os.replace(replacement,new)
  with self.assertRaisesRegex(RuntimeError,'bağı kimliği'):self.f.recover(manual=True)
  self.assertEqual((self.f.root/self.f.a).read_bytes(),self.f.after_a)
  for name,content in self.f.old_assets.items():self.assertEqual((self.f.root/name).read_bytes(),content)
 def test_modified_ssr_reference_is_never_overwritten_by_rollback(self):
  self.f.deploy();name=next(iter(self.f.references));path=self.f.root/name;path.write_bytes(b'operator modified SSR')
  with self.assertRaises(RuntimeError):self.f.recover(manual=True)
  self.assertEqual(path.read_bytes(),b'operator modified SSR');self.assertEqual((self.f.root/self.f.a).read_bytes(),self.f.after_a)
 def test_client_metadata_cannot_silently_change_namespace_or_source(self):
  for key,value in (('namespace',I.CLIENT_OLD_NAMESPACE),('oldName','unrelated.js'),('generatedNames',[])):
   plan=copy.deepcopy(self.f.plan);plan['client'][key]=value
   with self.assertRaisesRegex(RuntimeError,'grafiği kimliği'):I.validate_scope(plan)

if __name__=="__main__":unittest.main(verbosity=2)
