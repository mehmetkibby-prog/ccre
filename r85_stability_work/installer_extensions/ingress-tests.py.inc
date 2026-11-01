class R85IngressBoundaryTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='r85-ingress-test-');self.f=F.Fixture(self.temp.name)
  self.path=self.f.root/I.ingress.PATH
  self.before=self.path.read_bytes()
  self.after=I.ingress.canonical_payload(self.before)
 def tearDown(self):self.f.close();self.temp.cleanup()
 def snapshot(self):
  return {p.relative_to(self.f.base).as_posix():p.read_bytes() for p in self.f.base.rglob('*') if p.is_file() and p!=self.f.events_file}
 def reject_without_mutation(self,call,message):
  before=self.snapshot();events=[r for r in self.f.events() if r[0] in ('stop','start','gate','backup-start')]
  with self.assertRaisesRegex(RuntimeError,message):call()
  self.assertEqual(self.snapshot(),before)
  self.assertEqual([r for r in self.f.events() if r[0] in ('stop','start','gate','backup-start')],events)
 def alter_manifest(self,mutate):
  path=self.f.root/'release-manifest.json';manifest=F.read(path)
  mutate(manifest);F.put(path,F.encoded(manifest))
 def test_real_ingress_fixture_has_fixed_pins_and_only_one_property_delta(self):
  self.assertEqual((len(self.before),F.sha(self.before)),(5178,I.ingress.BEFORE_SHA256))
  self.assertEqual((len(self.after),F.sha(self.after)),(5191,I.ingress.AFTER_SHA256))
  self.assertEqual(self.after.replace(I.ingress.NEW_CONNECT,I.ingress.OLD_CONNECT,1),self.before)
  self.assertEqual(self.before.count(I.ingress.OLD_CONNECT),1)
  self.assertEqual(self.after.count(I.ingress.NEW_CONNECT),1)
 def test_unknown_before_bytes_abort_before_any_write_or_service_change(self):
  self.path.write_bytes(b'X'+self.before[1:])
  self.reject_without_mutation(self.f.deploy,'Ingress dosyası tanınmıyor.*bulunan SHA256')
 def test_unknown_before_size_aborts_before_any_write_or_service_change(self):
  self.path.write_bytes(self.before+b'\n')
  self.reject_without_mutation(self.f.deploy,'Ingress dosyası tanınmıyor.*bayt=5179')
 def test_missing_live_ingress_aborts_before_mutation(self):
  self.path.unlink()
  self.reject_without_mutation(self.f.deploy,'Ingress dosyası eksik')
 def test_wrong_manifest_hash_or_size_is_not_inferred_from_correct_disk_bytes(self):
  original=(self.f.root/'release-manifest.json').read_bytes()
  for field,value in (('sha256','0'*64),('bytes',5179),('bytes','5178')):
   with self.subTest(field=field,value=value):
    (self.f.root/'release-manifest.json').write_bytes(original)
    self.alter_manifest(lambda manifest:next(row for row in manifest['files'] if row['path']==I.ingress.PATH).__setitem__(field,value))
    self.reject_without_mutation(self.f.deploy,'Ingress release-manifest.json kaydı farklı/eksik')
 def test_missing_or_duplicate_manifest_row_aborts_before_mutation(self):
  original=(self.f.root/'release-manifest.json').read_bytes()
  for duplicate in (False,True):
   with self.subTest(duplicate=duplicate):
    (self.f.root/'release-manifest.json').write_bytes(original)
    def mutate(manifest):
     row=next(row for row in manifest['files'] if row['path']==I.ingress.PATH)
     if duplicate:manifest['files'].append(dict(row))
     else:manifest['files'].remove(row)
    self.alter_manifest(mutate)
    self.reject_without_mutation(self.f.deploy,'Ingress release-manifest.json kaydı farklı/eksik')
 def test_plan_cannot_change_pinned_before_after_size_or_expand_ingress_scope(self):
  original=copy.deepcopy(self.f.plan['files'][I.ingress.PATH])
  for field,value in (('before','0'*64),('after','f'*64),('bytes',5192),('otherScope',True)):
   with self.subTest(field=field):
    self.f.plan['files'][I.ingress.PATH]={**original,field:value}
    self.reject_without_mutation(self.f.deploy,'R85 ingress başlangıç kimliği/tek özellik kapsamı')
 def test_wrong_actual_payload_aborts_before_mutation_even_with_pinned_metadata(self):
  self.f.updates=[(name,meta,data+b'\n' if name==I.ingress.PATH else data) for name,meta,data in self.f.updates]
  self.reject_without_mutation(self.f.deploy,'R85 ingress yükü farklı')
 def test_rehashed_extra_ingress_change_is_rejected_before_mutation(self):
  extra=self.after+b'\n// unreviewed ingress change\n'
  self.f.plan['files'][I.ingress.PATH]={'before':I.ingress.BEFORE_SHA256,'after':F.sha(extra),'bytes':len(extra)}
  self.f.updates=[(name,self.f.plan['files'][name],extra if name==I.ingress.PATH else data) for name,meta,data in self.f.updates]
  self.reject_without_mutation(self.f.deploy,'R85 ingress başlangıç kimliği/tek özellik kapsamı')
 def test_success_and_idempotence_update_ingress_manifest_without_changing_database(self):
  self.assertTrue(self.f.deploy());self.f.assert_intact(self,I.VERSION)
  self.assertEqual(self.path.read_bytes(),self.after)
  row=I.ingress.manifest_row(F.read(self.f.root/'release-manifest.json'),updated=True)
  self.assertEqual((row['sha256'],row['bytes']),(I.ingress.AFTER_SHA256,5191))
  before=self.snapshot();events=[r for r in self.f.events() if r[0] in ('stop','start')]
  self.assertFalse(self.f.deploy());self.assertEqual(self.snapshot(),before)
  self.assertEqual([r for r in self.f.events() if r[0] in ('stop','start')],events)
 def test_already_installed_ingress_cannot_silently_fall_back_to_before_bytes(self):
  self.f.deploy();self.path.write_bytes(self.before)
  self.reject_without_mutation(self.f.deploy,'Ingress dosyası tanınmıyor')
 def test_already_installed_ingress_manifest_must_match_after_pin(self):
  self.f.deploy()
  self.alter_manifest(lambda manifest:next(row for row in manifest['files'] if row['path']==I.ingress.PATH).update(sha256=I.ingress.BEFORE_SHA256,bytes=5178))
  self.reject_without_mutation(self.f.deploy,'Ingress release-manifest.json kaydı farklı/eksik')
 def crash_after_ingress(self):
  def hook():
   original=S._replace
   def after(root,stage,row,data,**kwargs):
    original(root,stage,row,data,**kwargs)
    if row['path']==I.ingress.PATH:os._exit(77)
   S._replace=after
  self.f.crash(hook)
  self.assertEqual(self.path.read_bytes(),self.after)
 def test_interrupted_ingress_overlay_recovers_exact_before_code_and_current_database(self):
  self.crash_after_ingress()
  with contextlib.closing(sqlite3.connect(self.f.database)) as db,db:db.execute('UPDATE progress SET value=86')
  self.f.recover();self.f.assert_intact(self,I.SOURCE_VERSION)
  self.assertEqual(self.path.read_bytes(),self.before);self.assertEqual(self.f.progress(),86)
  self.assertFalse(I.ACTIVE.exists())
 def test_corrupted_original_ingress_backup_refuses_recovery_before_mutation(self):
  self.crash_after_ingress();directory,record=self.f.journal()
  row=next(row for row in record['files'] if row['path']==I.ingress.PATH)
  (directory/'code'/row['backup']).write_bytes(b'X'+self.before[1:])
  self.reject_without_mutation(self.f.recover,'Özgün istemci yedeği farklı')
  self.assertEqual(self.path.read_bytes(),self.after);self.assertTrue(I.ACTIVE.exists())
 def test_manual_rollback_restores_original_ingress_but_keeps_current_database(self):
  self.f.deploy()
  with contextlib.closing(sqlite3.connect(self.f.database)) as db,db:db.execute('UPDATE progress SET value=85')
  self.f.recover(manual=True);self.f.assert_intact(self,I.SOURCE_VERSION)
  self.assertEqual(self.path.read_bytes(),self.before);self.assertEqual(self.f.progress(),85)
  self.assertFalse(I.ACTIVE.exists())
