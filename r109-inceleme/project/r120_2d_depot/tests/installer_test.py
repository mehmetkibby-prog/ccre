"""Real archived R118/R119 -> R120 apply/rollback. Only services/TLS are adapters."""
import contextlib,copy,importlib,importlib.util,json,sqlite3,sys,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];OLD=ROOT.parent/'r119_monster_motion'
sys.path.insert(0,str(OLD/'tests'))
spec=importlib.util.spec_from_file_location('r119_fixture',OLD/'tests/installer_test.py');legacy=importlib.util.module_from_spec(spec);spec.loader.exec_module(legacy)
importlib.import_module('code_contract')
oldmods={k:v for k,v in sys.modules.items() if str(getattr(v,'__file__','')).startswith(str(OLD/'deployment/modules'))}
for k in oldmods:sys.modules.pop(k,None)
sys.path.insert(0,str(ROOT/'deployment/modules'))
import installer as m
from storage import digest,encoded
from domain_test import config

def previous(source):
 current={k:sys.modules.get(k) for k in oldmods};paths=sys.path[:]
 try:
  sys.modules.update(oldmods);sys.path.insert(0,str(OLD/'deployment/modules'))
  f=legacy.Fixture()
  if source=='R119_MOTION1':legacy.m.apply(f.live,f.z,f.plan)
  f.scope.close();f.live.state=json.loads(f.f.statefile.read_text());return f
 finally:
  sys.path[:]=paths
  for k,v in current.items():
   if v is None:sys.modules.pop(k,None)
   else:sys.modules[k]=v

class Fixture:
 def __init__(self,source='R118_ROYAL1'):
  self.base=previous(source);f=self.f=self.base.f;self.live=self.base.live;self.root=f.root;self.scope=contextlib.ExitStack();self.fail=False;self.source=source
  record=json.loads((ROOT/'evidence/package.json').read_text());file=ROOT/record['file'];assert digest(file)==record['sha256'];self.z=zipfile.ZipFile(file);self.plan=json.loads(self.z.read('plan.json'))
  for k,v in {'STATE':f.statefile,'CONTROL':f.control,'ACTIVE':f.control/'active.json','RELEASES':f.releases,'SYSTEMD':f.systemd}.items():self.scope.enter_context(patch.object(m,k,v))
  self.scope.enter_context(patch.object(m,'preflight',side_effect=self.preflight))
  for k in ('guards','stop_all','start_all','check_access'):self.scope.enter_context(patch.object(m,k,side_effect=lambda *a:None))
  self.scope.enter_context(patch.object(m,'central',side_effect=f.central));self.scope.enter_context(patch.object(m.readiness,'wait',side_effect=lambda *a,**k:f.health(f.manifest,'R118_ROYAL1')))
  self.config=f.home/'caddy.json';self.initial=config();self.caddy=copy.deepcopy(self.initial);self.config.write_bytes(encoded(self.initial));self.commands=[]
  self.scope.enter_context(patch.object(m.domain_move,'CONFIG',self.config));self.scope.enter_context(patch.object(m.domain_move,'api',side_effect=self.api))
  self.scope.enter_context(patch.object(m,'run',side_effect=lambda args,**k:self.commands.append(args)))
  self.scope.enter_context(patch.object(m.domain_move,'health',side_effect=self.health))
  self.settings={}
  for rid,p in f.configs.items():
   value=json.loads(p.read_text());value.setdefault('hosts',[rid+'.coreoflife.net']);value.setdefault('environment',{})['AUTH_PUBLIC_ORIGIN']='https://accounts.coreoflife.net';p.write_bytes(encoded(value));self.settings[p]=p.read_bytes()
  self.site=f.home/'r120-site/index.html';self.site.parent.mkdir();self.site.write_text('<a href="https://coreoflife.net/">Ana site</a>')
  self.forum=f.home/'forum';self.forum.mkdir();self.forum.joinpath('public').mkdir()
  for name in self.plan['domain']['forum']:(self.forum/name).write_bytes((ROOT.parent/'r114_rune_forum/forum'/name).read_bytes())
  self.newconf=f.home/'systemd/r120.conf'
 def api(self,value=None):
  if value is not None:self.caddy=copy.deepcopy(value)
  return copy.deepcopy(self.caddy)
 def preflight(self,live,z,plan,apply=False):
  m.validate_plan(plan);plan['_resolvedIdentity']=m.source_identity.resolve(live,plan);m.runtime_imports.validate(live.root,plan,z);plan['_siteChanges']=m.site_delta.changes(z,plan)
  rows=[(p,digest(p),encoded(m.domain_move.game_config(json.loads(p.read_text())))) for p in self.settings]
  rows+=m.domain_move.site_changes(self.site.parent)
  for name,meta in plan['domain']['forum'].items():
   p=self.forum/name;assert digest(p)==meta['before'];rows.append((p,digest(p),z.read('forum/'+name)))
  rows.append((self.newconf,None,b'[Service]\nEnvironment=ALLOWED_ORIGINS=https://2d.coreoflife.net\n'))
  plan['_domainPrepared']={'beforeConfig':self.initial,'afterConfig':m.domain_move.caddy_alias(self.initial),'certificate':'isolated-tls-adapter','rows':rows}
  return m.payload(live,z,plan)+m.asset_updates(live,z,plan)
 def health(self,j):
  assert self.caddy==m.domain_move.caddy_alias(self.initial)
  if self.fail:
   with sqlite3.connect(self.f.databases['r1']['path']) as db:db.execute('UPDATE players SET gems=234567');db.commit()
   raise RuntimeError('injected R120 HTTPS failure')
  return {'localPinnedTls':'adapter; actual TLS is separate caddy test','publicCloudflareTest':'pending'}
 def result(self):return json.loads((Path(json.loads(self.f.statefile.read_text())['r102AdminFix']['journal'])/'result.json').read_text())
 def close(self):self.scope.close();self.z.close();self.base.close()

class Installation(unittest.TestCase):
 def fixture(self,source='R118_ROYAL1'):f=Fixture(source);self.addCleanup(f.close);return f
 def roundtrip(self,source):
  f=self.fixture(source);beforedb={k:digest(v['path']) for k,v in f.f.databases.items()};prior=f.result();oldBackup={str(p):digest(p) for p in Path(prior['directory']).rglob('*') if p.is_file()}
  m.apply(f.live,f.z,f.plan);j=f.result();m.validate_record(j,completed=True)
  self.assertEqual(beforedb,{k:digest(v['path']) for k,v in f.f.databases.items()});self.assertEqual(oldBackup,{p:digest(p) for p in oldBackup})
  self.assertEqual(json.loads(f.f.statefile.read_text())['r64Deployment']['version'],'R120_2D_DEPOT3');self.assertIn('2d.coreoflife.net',f.site.read_text());self.assertTrue(f.newconf.exists())
  for p in f.settings:self.assertIn('2d.coreoflife.net',json.loads(p.read_text())['hosts'])
  for row in f.f.databases.values():
   with sqlite3.connect(row['path']) as db:db.execute('UPDATE players SET gems=98765');db.commit()
  j['phase']='rollback-requested';m.persist(j);m.rollback(f.live,j)
  self.assertEqual(m.identity.core_identity(f.root/m.source_identity.CORE),f.plan['sources'][source]['core']);self.assertEqual(f.caddy,f.initial);self.assertFalse(f.newconf.exists());self.assertEqual(f.site.read_text(),'<a href="https://coreoflife.net/">Ana site</a>')
  for p,b in f.settings.items():self.assertEqual(p.read_bytes(),b)
  for row in f.f.databases.values():
   with sqlite3.connect(row['path']) as db:self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],98765);self.assertEqual(db.execute("SELECT count(*) FROM monsters WHERE area='champions'").fetchone()[0],192)
 def test_r118_cumulative_apply_and_rollback(self):self.roundtrip('R118_ROYAL1')
 def test_r119_apply_and_rollback(self):self.roundtrip('R119_MOTION1')
 def test_prepared_web_alias_apply_and_rollback_do_not_reload_caddy(self):
  f=self.fixture();f.initial=m.domain_move.caddy_alias(f.initial);f.caddy=copy.deepcopy(f.initial);f.config.write_bytes(encoded(f.initial))
  m.apply(f.live,f.z,f.plan);j=f.result()
  self.assertNotIn(str(f.config),j['external'])
  self.assertFalse(any(call.args for call in m.domain_move.api.call_args_list))
  j['phase']='rollback-requested';m.persist(j);m.rollback(f.live,j)
  self.assertEqual(f.caddy,f.initial);self.assertEqual(json.loads(f.config.read_text()),f.initial)
  self.assertFalse(any(call.args for call in m.domain_move.api.call_args_list))
 def test_failed_https_restores_every_domain_setting_and_keeps_progress(self):
  f=self.fixture();f.fail=True
  with self.assertRaisesRegex(RuntimeError,'injected R120'):m.apply(f.live,f.z,f.plan)
  self.assertFalse(m.ACTIVE.exists());self.assertEqual(f.caddy,f.initial);self.assertFalse(f.newconf.exists())
  for p,b in f.settings.items():self.assertEqual(p.read_bytes(),b)
  self.assertEqual(json.loads(f.f.statefile.read_text())['r64Deployment']['version'],'R118_ROYAL1')
  with sqlite3.connect(f.f.databases['r1']['path']) as db:self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],234567)
 def test_unknown_source_rejected_and_no_database_migration(self):
  f=self.fixture();self.assertEqual(set(f.plan['sources']),{'R118_ROYAL1','R119_MOTION1'});self.assertEqual(f.plan['databaseScope'],'none');self.assertFalse(f.plan['databaseSchemaChanges']);self.assertFalse(f.plan['domain']['dnsChanges']);self.assertFalse(f.plan['domain']['zoneChanges'])
  self.assertFalse(any('/tests/' in n or 'http-runtime/' in n or 'native510' in n for n in f.plan['files']))
  f.live.state['r64Deployment']['version']='unknown'
  with patch.object(m,'stop_all') as stop:
   with self.assertRaisesRegex(RuntimeError,'R118'):m.apply(f.live,f.z,f.plan)
   stop.assert_not_called()

if __name__=='__main__':unittest.main()
