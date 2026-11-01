"""Reuse selected R85 recovery cases with a retained-client R86 fixture."""
import ast
from pathlib import Path
from prepare_package import PREVIOUS, ROOT, replace_once, versions

DEST = ROOT / 'tests/installer'
DEST.mkdir(parents=True, exist_ok=True)
fixture = versions((PREVIOUS / 'tests/installer/installer-fixture.py').read_text())
fixture = replace_once(fixture, "self.b=I.old.CORE+'native-http-bindings.mjs'", 'self.b=I.PRODUCTION_PATHS[1]')
fixture = replace_once(fixture, "  for name,data in ((I.NATIVE_CHECKPOINT,self.before_native)",
    "  put(self.root/I.HTTP,self.http)\n  put(self.root/I.ingress.PATH,(BASE/'working'/I.ingress.PATH).read_bytes())\n  for name,data in ((I.NATIVE_CHECKPOINT,self.before_native)")
fixture = replace_once(fixture, "+[self.old_game_core,*self.old_assets,*self.references,I.NATIVE_CHECKPOINT", "+[I.HTTP,I.ingress.PATH,self.old_game_core,*self.old_assets,*self.references,I.NATIVE_CHECKPOINT")
fixture = replace_once(fixture, "'clientChanges':True", "'clientChanges':False")
start = fixture.index('  new_prefix=self.root/(I.CLIENT_ASSETS+I.CLIENT_NAMESPACE)')
end = fixture.index('  for name,before in self.references.items():', start)
fixture = fixture[:start] + "  test.assertEqual((self.root/I.HTTP).read_bytes(),self.http)\n  test.assertEqual((self.root/I.ingress.PATH).read_bytes(),(BASE/'working'/I.ingress.PATH).read_bytes())\n" + fixture[end:]
(DEST / 'installer-fixture.py').write_text(fixture)

original = versions((PREVIOUS / 'tests/installer/installer-inplace.test.py').read_text())
tree = ast.parse(original)
selected = {
    'setUp', 'tearDown', 'assert_recovered',
    'test_apply_then_idempotent_apply_no_release_clone_runtime_or_database_change',
    'test_health_failure_rolls_back_code_but_keeps_post_backup_progress_and_account',
    'test_partial_gameplay_file_after_killed_writer_recovers_without_old_database',
    'test_manual_rollback_takes_fresh_backup_and_preserves_current_database',
    'test_before_hash_gate_refuses_unknown_source_without_stopping',
    'test_r85_journal_cannot_be_adopted_by_r86_recovery',
}
klass = next(n for n in tree.body if isinstance(n, ast.ClassDef))
methods = [n for n in klass.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name in selected]
assert {n.name for n in methods} == selected
lines = original.splitlines(keepends=True)
header = ''.join(lines[:klass.lineno-1]) + 'class InstallerTests(unittest.TestCase):\n'
body = ''.join(''.join(lines[n.lineno-1:n.end_lineno]) for n in methods)
extra = '''
 def test_actual_package_source_and_retained_graph_scope(self):
  plan=json.loads((F.BASE/'r86-package/update.json').read_text())
  # Health readiness is a live response constant, not inferred from STATE.
  # Reusing an R85 health marker would force an otherwise valid R86 rollback.
  health=F.BASE/'r86-package/payload/core511-source/scripts/core511/native-http-bindings.mjs'
  if not health.exists():health=F.BASE/'working/core511-source/scripts/core511/native-http-bindings.mjs'
  self.assertIn("updateVersion:'"+plan['version']+"'",health.read_text())
  # The fixture has smaller pinned bytes; restore exact shipped constants for
  # this independent real-plan/schema check.
  with patch.object(I,'SOURCE_CORE_SHA256',plan['baseCoreSHA256']),patch.object(I,'R85_HTTP_SHA256',plan['httpEntrySHA256']):
   I.validate_scope(plan)
   self.assertFalse(plan['clientChanges'])
   self.assertEqual(plan['client']['oldNamespace'],plan['client']['namespace'])
   self.assertEqual(plan['client']['oldName'],plan['client']['name'])
   self.assertEqual(I.old.identity_from_rows(plan['baseCoreRows']),plan['baseCoreSHA256'])
   for name,meta in plan['files'].items():
    data=(F.BASE/'r86-package/payload'/name).read_bytes()
    self.assertEqual(len(data),meta['bytes']);self.assertEqual(F.sha(data),meta['after'])
   for key,value in [('clientChanges',True),('baseCoreSHA256','0'*64),('sourceVersion','R84_GAMEPLAY')]:
    bad=copy.deepcopy(plan);bad[key]=value
    with self.assertRaises(RuntimeError):I.validate_scope(bad)
 def test_client_or_ingress_payload_injection_rejected_before_service_stop(self):
  for name in (I.HTTP,I.ingress.PATH,I.CLIENT_ASSETS+I.CLIENT_NAMESPACE+'/injected.js'):
   bad=copy.deepcopy(self.f.plan);bad['files'][name]={'before':None,'after':F.sha(b'injected'),'bytes':8}
   with self.assertRaises(RuntimeError):I.validate_scope(bad)
  self.assertFalse(any(r[0]=='stop' for r in self.f.events()))
 def test_retained_ingress_tamper_rejected_before_service_stop(self):
  (self.f.root/I.ingress.PATH).write_bytes(b'changed ingress')
  with self.assertRaises(RuntimeError):self.f.deploy()
  self.assertFalse(any(r[0]=='stop' for r in self.f.events()))
 def test_retained_http_tamper_rejected_before_service_stop(self):
  (self.f.root/I.HTTP).write_bytes(b'changed HTTP')
  with self.assertRaises(RuntimeError):self.f.deploy()
  self.assertFalse(any(r[0]=='stop' for r in self.f.events()))

if __name__=='__main__':unittest.main(verbosity=2)
'''
(DEST / 'installer-server-only.test.py').write_text(header + body + extra)
print('Prepared ten focused R86 installer cases; no test run or archive creation.')
