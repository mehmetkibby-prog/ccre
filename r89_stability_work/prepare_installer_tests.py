"""Adapt existing filesystem/SQLite installer cases to the R86 → R89 delta."""
import ast
from pathlib import Path
from prepare_package import ROOT,TEMPLATE,versions,once
dest=ROOT/'tests/installer'
dest.mkdir(parents=True,exist_ok=True)
fixture=versions((TEMPLATE/'tests/installer/installer-fixture.py').read_text())
fixture=once(fixture,"self.b=I.old.CORE+'native-http-bindings.mjs'",'self.b=I.PRODUCTION_PATHS[1]')
fixture=once(fixture,"  for name,data in ((I.NATIVE_CHECKPOINT,self.before_native)","  put(self.root/I.ingress.PATH,(BASE/'working'/I.ingress.PATH).read_bytes())\n  for name,data in ((I.NATIVE_CHECKPOINT,self.before_native)")
fixture=once(fixture,"+[self.old_game_core,*self.old_assets,*self.references,I.NATIVE_CHECKPOINT","+[I.ingress.PATH,self.old_game_core,*self.old_assets,*self.references,I.NATIVE_CHECKPOINT")
fixture=once(fixture,"'generatedNames':[I.CLIENT_NAME]","'generatedNames':I.CLIENT_GENERATED_NAMES")
fixture=once(fixture,'  self.stack=contextlib.ExitStack()',"  self.stack=contextlib.ExitStack()\n  real_main,uid,real_stat=I.main,os.geteuid(),Path.stat\n  def fixture_stat(path,*args,**kwargs):\n   row=real_stat(path,*args,**kwargs)\n   if path==I.ROOT:\n    fields=list(row);fields[4]=0;return os.stat_result(fields)\n   return row\n  def fixture_main(*args,**kwargs):\n   import itertools\n   with patch.object(Path,'stat',fixture_stat),patch.object(I.os,'geteuid',side_effect=itertools.chain([0],itertools.repeat(uid))):return real_main(*args,**kwargs)\n  self.stack.enter_context(patch.object(I,'main',fixture_main))")
(dest/'installer-fixture.py').write_text(fixture)

def selected(source,methods,out,classname):
 tree=ast.parse(source);klass=next(n for n in tree.body if isinstance(n,ast.ClassDef) and n.name==classname)
 found=[n for n in klass.body if isinstance(n,ast.FunctionDef) and n.name in methods]
 assert {n.name for n in found}==set(methods)
 lines=source.splitlines(keepends=True)
 first=next(n for n in tree.body if isinstance(n,ast.ClassDef))
 text=''.join(lines[:first.lineno-1])+'class '+classname+'(unittest.TestCase):\n'+''.join(''.join(lines[n.lineno-1:n.end_lineno]) for n in found)+'\nif __name__=="__main__":unittest.main(verbosity=2)\n'
 (dest/out).write_text(versions(text))

selected((TEMPLATE/'tests/installer/installer-inplace.test.py').read_text(),{
 'setUp','tearDown','assert_recovered',
 'test_apply_then_idempotent_apply_no_release_clone_runtime_or_database_change',
 'test_health_failure_rolls_back_code_but_keeps_post_backup_progress_and_account',
 'test_crash_after_third_existing_file_replaces_only_code_and_recovers',
 'test_manual_rollback_takes_fresh_backup_and_preserves_current_database',
 'test_partial_gameplay_file_after_killed_writer_recovers_without_old_database',
 'test_before_hash_gate_refuses_unknown_source_without_stopping',
 'test_unknown_manual_file_blocks_all_restore_writes',
 'test_r84_journal_cannot_be_adopted_by_r85_recovery',
},'installer-recovery.test.py','InstallerTests')

source=(TEMPLATE/'tests/installer/installer-client.test.py').read_text()
tree=ast.parse(source);klass=next(n for n in tree.body if isinstance(n,ast.ClassDef) and n.name=='ImmutableClientTests')
selected(source,{n.name for n in klass.body if isinstance(n,ast.FunctionDef)},'installer-client.test.py','ImmutableClientTests')

source=(TEMPLATE/'tests/installer/installer-gates.test.py').read_text()
selected(source,{
 'setUp','tearDown','main',
 'test_check_is_read_only_and_apply_holds_both_actual_flock_files',
 'test_held_install_lock_prevents_any_service_stop',
 'test_failed_rollback_start_is_fenced_and_subsequent_recovery_succeeds',
 'test_quick_check_failure_happens_before_any_code_replacement',
 'test_sqlite_api_backup_includes_committed_wal_from_dead_writer',
 'test_unlisted_zip_payload_is_refused',
},'installer-gates.test.py','CliAndFailureTests')
selected(source,{
 'setUp','tearDown','assert_not_stopped',
 'test_r82_state_is_rejected_before_any_service_stop',
 'test_plan_requires_r84_source_and_r85_destination',
 'test_active_admission_is_refused_before_any_stop',
 'test_active_presence_is_refused_before_any_stop',
 'test_recent_player_is_refused_before_any_stop',
 'test_open_policy_is_not_silently_changed_by_installer',
 'test_payload_hash_mismatch_is_refused_before_any_stop',
 'test_correctly_hashed_http_payload_cannot_add_route_logic',
},'installer-boundaries.test.py','R85SpecificBoundaryTests')
selected(source,{'test_r85_health_requires_own_version_and_available_diagnostics_but_r84_does_not'},'installer-health.test.py','HealthVersionGateTests')
print('Prepared 34 recovery, client, maintenance, backup and health checks.')

# Tests exercise the real installer paths in a temporary filesystem. The
# production root-only guard remains intact; this runner itself is unprivileged.
