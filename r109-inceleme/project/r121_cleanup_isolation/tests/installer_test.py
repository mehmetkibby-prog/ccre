"""Archived source apply/rollback; OS services and HTTP only are adapters."""
import contextlib,importlib,importlib.util,json,sqlite3,sys,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];OLD=ROOT.parent/'r120_2d_depot'
sys.path.insert(0,str(OLD/'tests'))
spec=importlib.util.spec_from_file_location('r120_fixture',OLD/'tests/installer_test.py');legacy=importlib.util.module_from_spec(spec);spec.loader.exec_module(legacy)
importlib.import_module('code_contract')
oldmods={k:v for k,v in sys.modules.items() if str(getattr(v,'__file__','')).startswith(str(OLD/'deployment/modules'))}
for k in oldmods:sys.modules.pop(k,None)
sys.path.insert(0,str(ROOT/'deployment/modules'))
import installer as m
from storage import digest

def previous(source):
 current={k:sys.modules.get(k) for k in oldmods};paths=sys.path[:]
 try:
  sys.modules.update(oldmods);sys.path.insert(0,str(OLD/'deployment/modules'))
  f=legacy.Fixture('R118_ROYAL1' if source=='R118_ROYAL1' else 'R119_MOTION1')
  if source=='R120_2D_DEPOT4':legacy.m.apply(f.live,f.z,f.plan)
  f.scope.close();f.live.state=json.loads(f.f.statefile.read_text());return f
 finally:
  sys.path[:]=paths
  for k,v in current.items():
   if v is None:sys.modules.pop(k,None)
   else:sys.modules[k]=v

class Fixture:
 def __init__(self,source):
  self.base=previous(source);self.f=self.base.f;self.live=self.base.live;self.root=self.f.root;self.source=source;self.fail=False;self.scope=contextlib.ExitStack()
  record=json.loads((ROOT/'evidence/package.json').read_text());file=ROOT/record['file'];assert digest(file)==record['sha256'];self.z=zipfile.ZipFile(file);self.plan=json.loads(self.z.read('plan.json'))
  for k,v in {'STATE':self.f.statefile,'CONTROL':self.f.control,'ACTIVE':self.f.control/'active.json','RELEASES':self.f.releases,'SYSTEMD':self.f.systemd}.items():self.scope.enter_context(patch.object(m,k,v))
  self.scope.enter_context(patch.object(m,'preflight',side_effect=self.preflight))
  for k in ('guards','stop_all','start_all','check_access'):self.scope.enter_context(patch.object(m,k,side_effect=lambda *a:None))
  self.scope.enter_context(patch.object(m,'central',side_effect=self.f.central));self.scope.enter_context(patch.object(m.readiness,'wait',side_effect=self.health))
 def preflight(self,live,z,plan,apply=False):
  m.validate_plan(plan);plan['_resolvedIdentity']=m.source_identity.resolve(live,plan);m.runtime_imports.validate(live.root,plan,z);plan['_siteChanges']=m.site_delta.changes(z,plan)
  return m.payload(live,z,plan)+m.asset_updates(live,z,plan)
 def health(self,manifest,version='R121_CLEANUP1',**kwargs):
  if self.fail and version=='R121_CLEANUP1':
   with sqlite3.connect(self.f.databases['r1']['path']) as db:db.execute('UPDATE players SET gems=234567');db.commit()
   raise RuntimeError('injected R121 readiness failure')
  return {rid:{**h,'cleanupIsolation':'R121_CLEANUP1','cleanupIsolationReady':True} for rid,h in self.f.health(manifest,'R118_ROYAL1').items()}
 def result(self):return json.loads((Path(json.loads(self.f.statefile.read_text())['r102AdminFix']['journal'])/'result.json').read_text())
 def close(self):self.scope.close();self.z.close();self.base.close()

class Installation(unittest.TestCase):
 def fixture(self,source):f=Fixture(source);self.addCleanup(f.close);return f
 def test_exact_backend_scope(self):
  f=self.fixture('R118_ROYAL1');self.assertEqual(len(f.plan['files']),5);self.assertFalse(f.plan['databaseChanges']);self.assertEqual(f.plan['clientNew'],[]);self.assertEqual(set(m.UNITS),{'coreoflife-r1.service','coreoflife-r2.service'})
  self.assertTrue(all('/tests/' not in name and name.endswith('.mjs') for name in f.plan['files']))
  f.live.state['r64Deployment']['version']='unreviewed'
  with self.assertRaises(RuntimeError):f.preflight(f.live,f.z,f.plan)
 def test_sources_apply_and_rollback_keep_client_settings_and_new_player_progress(self):
  for source in ('R118_ROYAL1','R119_MOTION1','R120_2D_DEPOT4'):
   with self.subTest(source=source):
    f=Fixture(source)
    try:
     before={rid:digest(row['path']) for rid,row in f.f.databases.items()};settings={str(p):p.read_bytes() for p in f.f.configs.values()};client=f.plan['sources'][source]
     m.apply(f.live,f.z,f.plan);j=f.result();m.validate_record(j,completed=True)
     self.assertEqual({rid:digest(row['path']) for rid,row in f.f.databases.items()},before)
     self.assertEqual({p:Path(p).read_bytes() for p in settings},settings);self.assertEqual(json.loads(f.f.statefile.read_text())['r102AdminFix']['namespace'],client['namespace'])
     self.assertEqual(m.identity.core_identity(f.root/m.source_identity.CORE),f.plan['targets'][source]['core'])
     for row in f.f.databases.values():
      with sqlite3.connect(row['path']) as db:db.execute('UPDATE players SET gems=98765');db.commit()
     j['phase']='rollback-requested';m.persist(j);m.rollback(f.live,j)
     self.assertEqual(m.identity.core_identity(f.root/m.source_identity.CORE),client['core']);self.assertEqual(f.f.policies,f.f.initialPolicies)
     for row in f.f.databases.values():
      with sqlite3.connect(row['path']) as db:self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],98765)
    finally:f.close()
 def test_failed_startup_restores_code_without_reverting_progress(self):
  f=self.fixture('R120_2D_DEPOT4');f.fail=True
  with self.assertRaisesRegex(RuntimeError,'injected R121'):m.apply(f.live,f.z,f.plan)
  self.assertFalse(m.ACTIVE.exists());self.assertEqual(json.loads(f.f.statefile.read_text())['r64Deployment']['version'],'R120_2D_DEPOT4')
  with sqlite3.connect(f.f.databases['r1']['path']) as db:self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],234567)
 def test_tampered_code_rejected_before_service_stop(self):
  f=self.fixture('R118_ROYAL1');p=f.root/m.source_identity.CORE/'presence.mjs';p.write_bytes(p.read_bytes()+b'\n// unreviewed\n')
  with patch.object(m,'stop_all') as stop:
   with self.assertRaisesRegex(RuntimeError,'çekirdek eşleşmedi'):m.apply(f.live,f.z,f.plan)
   stop.assert_not_called()

if __name__=='__main__':unittest.main(verbosity=2)
