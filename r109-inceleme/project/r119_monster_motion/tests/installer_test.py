"""Real R118 -> R119 installer and rollback; systemd/HTTP adapters only."""
import contextlib,importlib,importlib.util,json,os,shutil,sqlite3,sys,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];R118=ROOT.parent/'r118_royal_champions'
sys.path.insert(0,str(R118/'deployment/modules'))
spec=importlib.util.spec_from_file_location('r118_fixture',R118/'tests/installer_test.py');legacy=importlib.util.module_from_spec(spec);spec.loader.exec_module(legacy)
importlib.import_module('code_contract')
oldmods={k:v for k,v in sys.modules.items() if str(getattr(v,'__file__','')).startswith(str(R118/'deployment/modules'))}
for k in oldmods:sys.modules.pop(k,None)
sys.path.remove(str(R118/'deployment/modules'));sys.path.insert(0,str(ROOT/'deployment/modules'))
import installer as m
from storage import digest

def installed_r118():
 current={k:sys.modules.get(k) for k in oldmods};paths=sys.path[:]
 try:
  sys.modules.update(oldmods);sys.path.insert(0,str(R118/'deployment/modules'))
  f=legacy.Fixture();legacy.m.apply(f.live,f.z,f.plan);f.scope.close()
  return f
 finally:
  sys.path[:]=paths
  for k,v in current.items():
   if v is None:sys.modules.pop(k,None)
   else:sys.modules[k]=v

class Fixture:
 def __init__(self):
  self.f=installed_r118();f=self.f;self.live=f.live;self.live.state=json.loads(f.statefile.read_text());self.root=f.root;self.scope=contextlib.ExitStack();self.fail=False
  record=json.loads((ROOT/'evidence/package.json').read_text());file=ROOT/record['file'];assert digest(file)==record['sha256'];self.z=zipfile.ZipFile(file);self.plan=json.loads(self.z.read('plan.json'))
  for k,v in {'STATE':f.statefile,'CONTROL':f.control,'ACTIVE':f.control/'active.json','RELEASES':f.releases,'SYSTEMD':f.systemd}.items():self.scope.enter_context(patch.object(m,k,v))
  self.scope.enter_context(patch.object(m,'preflight',side_effect=self.preflight))
  for k in ('guards','stop_all','start_all','check_access'):self.scope.enter_context(patch.object(m,k,side_effect=lambda *a:None))
  self.scope.enter_context(patch.object(m,'central',side_effect=f.central));self.scope.enter_context(patch.object(m.readiness,'wait',side_effect=self.health))
 def preflight(self,live,z,plan,apply=False):
  m.validate_plan(plan);m.runtime_imports.validate(live.root,plan,z);plan['_siteChanges']=m.site_delta.changes(z,plan);plan['_resolvedIdentity']=m.source_identity.resolve(live,plan);return m.payload(live,z,plan)+m.asset_updates(live,z,plan)
 def health(self,manifest,version='R119_MOTION1',**kwargs):
  if self.fail and version=='R119_MOTION1':
   with sqlite3.connect(self.f.databases['r1']['path']) as db:db.execute('UPDATE players SET gems=234567');db.commit()
   raise RuntimeError('injected R119 health failure')
  return self.f.health(manifest,'R118_ROYAL1')
 def result(self):
  state=json.loads(self.f.statefile.read_text());return json.loads((Path(state['r102AdminFix']['journal'])/'result.json').read_text())
 def close(self):self.scope.close();self.z.close();self.f.close()

class Installation(unittest.TestCase):
 def fixture(self):f=Fixture();self.addCleanup(f.close);return f
 def test_exact_five_presentation_files_without_test_fixture_or_database_migration(self):
  f=self.fixture();self.assertEqual(set(f.plan['sources']),{'R118_ROYAL1'});self.assertEqual(len(f.plan['files']),5)
  self.assertFalse(f.plan['databaseChanges']);self.assertFalse(f.plan['databaseSchemaChanges']);self.assertEqual(f.plan['databaseScope'],'none')
  self.assertFalse(any('/tests/' in n or 'http-runtime/' in n or 'native510' in n for n in f.plan['files']))
  f.preflight(f.live,f.z,f.plan)
  bad=json.loads(json.dumps(f.plan));bad['databaseChanges']=True
  with self.assertRaises(RuntimeError):m.validate_plan(bad)
 def test_apply_and_rollback_preserve_royal_schema_items_progress_and_historical_recovery(self):
  f=self.fixture();old=f.result();oldbackup={str(p):digest(p) for p in Path(old['directory']).rglob('*') if p.is_file()}
  dbBefore={k:digest(v['path']) for k,v in f.f.databases.items()}
  m.apply(f.live,f.z,f.plan);j=f.result();m.validate_record(j,completed=True)
  self.assertEqual(json.loads(f.f.statefile.read_text())['r64Deployment']['version'],'R119_MOTION1')
  self.assertEqual(dbBefore,{k:digest(v['path']) for k,v in f.f.databases.items()})
  self.assertEqual(oldbackup,{p:digest(p) for p in oldbackup})
  for row in f.f.databases.values():
   with sqlite3.connect(row['path']) as db:
    db.execute('UPDATE players SET gems=98765');db.execute("INSERT INTO royal_receipts_r118 VALUES('r119-test','test-request','royal_transform_r118','digest','{}',1)");db.commit()
  j['phase']='rollback-requested';m.persist(j);m.rollback(f.live,j)
  self.assertEqual(m.identity.core_identity(f.root/m.source_identity.CORE),f.plan['sources']['R118_ROYAL1']['core'])
  self.assertEqual(f.f.policies,f.f.initialPolicies)
  for row in f.f.databases.values():
   with sqlite3.connect(row['path']) as db:
    self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],98765)
    self.assertEqual(db.execute("SELECT count(*) FROM royal_receipts_r118 WHERE player_id='r119-test'").fetchone()[0],1)
    self.assertEqual(db.execute("SELECT count(*) FROM monsters WHERE area='champions'").fetchone()[0],192)
 def test_absent_or_different_development_fixture_is_never_touched(self):
  f=self.fixture();file=f.root/'core511-source/scripts/perf-r11/tests/reward/fixture.mjs';original=file.read_bytes()
  for value in (None,original+b'\n// unrelated native test customization\n'):
   if value is None:file.unlink()
   else:file.write_bytes(value)
   changes=f.preflight(f.live,f.z,f.plan);self.assertNotIn(str(file.relative_to(f.root)),{n for n,_,_ in changes})
  m.apply(f.live,f.z,f.plan);self.assertEqual(file.read_bytes(),value)
 def test_unknown_source_or_changed_runtime_rejected_before_stop(self):
  f=self.fixture();f.live.state['r64Deployment']['version']='R117_HOOK10'
  with self.assertRaisesRegex(RuntimeError,'R118'):f.preflight(f.live,f.z,f.plan)
  f.live.state['r64Deployment']['version']='R118_ROYAL1';p=f.root/m.source_identity.CORE/'champions-client-r118.mjs';p.write_bytes(p.read_bytes()+b'\n// unknown change\n')
  with patch.object(m,'stop_all') as stop:
   with self.assertRaisesRegex(RuntimeError,'çekirdek eşleşmedi'):m.apply(f.live,f.z,f.plan)
   stop.assert_not_called()
  self.assertFalse(m.ACTIVE.exists())
 def test_failed_readiness_restores_r118_without_reverting_player_progress(self):
  f=self.fixture();f.fail=True
  with self.assertRaisesRegex(RuntimeError,'injected R119'):m.apply(f.live,f.z,f.plan)
  self.assertEqual(json.loads(f.f.statefile.read_text())['r64Deployment']['version'],'R118_ROYAL1')
  self.assertFalse(m.ACTIVE.exists());self.assertEqual(f.f.policies,f.f.initialPolicies)
  with sqlite3.connect(f.f.databases['r1']['path']) as db:self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],234567)
 def test_readiness_keeps_royal_and_eight_channel_requirements(self):
  f=self.fixture();realms=f.f.manifest['realms'];health=f.health(f.f.manifest)
  def request(port,endpoint):
   if port==f.f.manifest['authPort']:return {'authenticated':False}
   realm=next(r for r in realms if port in r['ports'].values())
   if endpoint=='/api/vds-health':return health[realm['id']]
   if endpoint=='/api/realm/context':return {'realm':{'id':realm['id']}}
   return {'ok':True,'protocol':'col-realtime-1','transportRepairVersion':'R102_REALTIME1','realmId':realm['id'],'dbIdentity':realm['dbIdentity']}
  for i,r in enumerate(realms):r['ports']['realtime']=4500+i
  self.assertEqual(m.readiness.probe(f.f.manifest,request=request)[1],[])
  health['r2']['royalReadyR118']=False;self.assertTrue(m.readiness.probe(f.f.manifest,request=request)[1])
  health['r2']['royalReadyR118']=True;health['r1']['channelProcesses']['channels'].pop();self.assertTrue(m.readiness.probe(f.f.manifest,request=request)[1])

if __name__=='__main__':unittest.main()
