"""Exercise the exact verified predecessor archives on independent synthetic realms."""
import contextlib
import importlib.util
import json
import sqlite3
import sys
import zipfile
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
source = sys.argv[1]
old_dir = ROOT.parent / ('r126_encounter' if source == 'R125_RUNE_CLIENT1' else 'r127_academy_update')
spec = importlib.util.spec_from_file_location('verified_predecessor', old_dir / 'tests/installer_test.py')
old = importlib.util.module_from_spec(spec)
spec.loader.exec_module(old)
f = old.Fixture()
try:
    if source == 'R127_ACADEMY1':
        old.m.apply(f.live, f.z, f.plan)
    f.scope.close()
    f.live.state = json.loads(f.f.statefile.read_text())
    assert f.live.state['r64Deployment']['version'] == source
    for name, module in list(sys.modules.items()):
        if str(getattr(module, '__file__', '')).startswith(str(old_dir/'deployment/modules')):
            sys.modules.pop(name)
    sys.path.insert(0, str(ROOT/'deployment/modules'))
    import installer as m
    from storage import digest
    original = {rid: digest(row['path']) for rid, row in f.f.databases.items()}
    report = json.loads((ROOT/'evidence/package.json').read_text())
    assert digest(ROOT/report['file']) == report['sha256']
    with zipfile.ZipFile(ROOT/report['file']) as archive, contextlib.ExitStack() as scope:
        plan = json.loads(archive.read('plan.json'))
        for key, val in dict(STATE=f.f.statefile, CONTROL=f.f.control, ACTIVE=f.f.control/'active.json',
                             RELEASES=f.f.releases, SYSTEMD=f.f.systemd).items():
            scope.enter_context(patch.object(m, key, val))
        for key in ('guards','stop_all','start_all','check_access'):
            scope.enter_context(patch.object(m, key))
        scope.enter_context(patch.object(m,'central',side_effect=f.f.central))
        def ready(manifest, version='R127_PERF2', **kwargs):
            if len(sys.argv)>2 and version=='R127_PERF2':
                raise RuntimeError('simulated failed startup')
            return f.health(manifest)
        scope.enter_context(patch.object(m.readiness,'wait',side_effect=ready))
        m.validate_plan(plan)
        plan['_resolvedIdentity']=m.source_identity.resolve(f.live,plan)
        m.runtime_imports.validate(f.live.root,plan,archive)
        plan['_siteChanges']=m.site_delta.changes(archive,plan)
        changes=m.payload(f.live,archive,plan)+m.asset_updates(f.live,archive,plan)
        if len(sys.argv)>2:
            try:
                m.apply(f.live,archive,plan,prepared=changes)
            except RuntimeError as err:
                assert str(err)=='simulated failed startup', err
            else:
                raise AssertionError('startup error swallowed')
        else:
            m.apply(f.live,archive,plan,prepared=changes)
            state=json.loads(f.f.statefile.read_text())
            assert state['r64Deployment']['version']=='R127_PERF2'
            assert m.identity.core_identity(f.live.root/m.source_identity.CORE)==plan['targetCore']
            assert original=={rid:digest(row['path']) for rid,row in f.f.databases.items()}
            for row in f.f.databases.values():
                with sqlite3.connect(row['path']) as db:
                    db.execute('UPDATE players SET gems=98765')
            j=json.loads((Path(state['r102AdminFix']['journal'])/'result.json').read_text())
            m.validate_record(j,completed=True)
            j['phase']='rollback-requested'
            m.persist(j)
            m.rollback(f.live,j)
            for row in f.f.databases.values():
                with sqlite3.connect(row['path']) as db:
                    assert db.execute('SELECT gems FROM players').fetchone()[0]==98765
        assert json.loads(f.f.statefile.read_text())['r64Deployment']['version']==source
        assert m.identity.core_identity(f.live.root/m.source_identity.CORE)==plan['sources'][source]['core']
        assert not m.ACTIVE.exists()
        print('PASS',source,'to R127_PERF2 and back, both realms')
finally:
    f.close()
