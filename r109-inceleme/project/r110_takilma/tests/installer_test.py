"""R110 on an installed R109: real files and the exact code delta.
Systemd and HTTP health are adapters (as in the R109 tests). SQLite files must remain untouched."""
import contextlib,hashlib,json,os,shutil,sqlite3,sys,tempfile,unittest,zipfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];PROJECT=ROOT.parent;sys.path.insert(0,str(ROOT/'deployment/modules'))
import installer as m
from storage import encoded,digest,descriptor,atomic
BASE=PROJECT/'r105_performance_review/working';R109=PROJECT/'r109_latency_completion/delivery/r109-gecikme.zip';NODE=Path(os.environ.get('REVIEW_NODE') or shutil.which('node'))
CORE='core511-source/scripts/core511/'
CHANGED={CORE+n for n in ('channel-process.mjs','process-supervisor.mjs','ws-endpoint.mjs','r110-options.mjs','native-http-bindings.mjs','checkpoint-sql-r531.mjs','nonlethal-rewards-r56.mjs','shared-refresh-scope.mjs','item-refresh-audit-r57.mjs')}|{'core511-source/scripts/delivery511/runtime-ingress.mjs','core511-source/scripts/delivery511/runtime-host.mjs','native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs'}
OPTIONS=CORE+'r110-options.mjs'
def marks(version):
 return {'ok':True,'updateVersion':'R102_CONTENT','adminHotfix':'R102_ADMIN1','rankingHotfix':'R102_RANK1','entryHotfix':'R102_ENTRY1','championLabelHotfix':'R102_LABEL1','mobileHud':'R102_HUD_SLIM1','autoIpLimit':'R102_AUTO_IP1','realmLoad':'R102_LOAD1','additionsHotfix':'R102_COMPLETE3','skillVisuals':'R103_SKILLS1','browserCompatibility':'R103_ABORT1','autoSession':'R103_AUTO_SESSION1','mobileChat':'R103_CHAT_ANCHOR2','academyPrereg':'R104_AKADEMI4','readerBoot':'R104_BOOT1','connectionRecovery':'R105_TOWER2','performanceReview':'R105_PERF1','captchaWorker':'R106_CAPTCHA1','populationStability':'R107_POPULATION1','latencyRepair':'R109_LATENCY2','realtimeHandoff':'R110_HANDOFF1' if version=='R110_HANDOFF1' else None}
class Fixture:
 """An installed R109_LATENCY2: R105 files plus the exact R109 ZIP payload."""
 def __init__(self,source='R109_LATENCY2'):
  self.tmp=tempfile.TemporaryDirectory(prefix='r110-install-test-');self.home=Path(self.tmp.name);self.releases=self.home/'releases';self.releases.mkdir();self.root=self.releases/'r101';shutil.copytree(BASE,self.root,copy_function=shutil.copy2,symlinks=True)
  native=self.root/'native510-bb3a6cc689c6';assert native.is_dir() and not native.is_symlink()
  modules=native/'node_modules'
  if modules.is_symlink():modules.unlink()
  modules.symlink_to(PROJECT.parent/'node_modules',target_is_directory=True)
  with zipfile.ZipFile(R109) as prior:
   previous=json.loads(prior.read('plan.json'))
   for name,meta in previous['files'].items():
    data=prior.read('payload/'+name);assert hashlib.sha256(data).hexdigest()==meta['after'];atomic(self.root/name,data,0o644)
  self.control=self.home/'r102';self.statefile=self.home/'state.json';self.systemd=self.home/'systemd';self.scope=contextlib.ExitStack();self.z=zipfile.ZipFile(json.loads((ROOT/'evidence/package.json').read_text())['file']);self.plan=json.loads(self.z.read('plan.json'))
  self.root.joinpath('bin').mkdir(exist_ok=True);self.node=NODE
  self.core=m.source_identity.CORE;ops=self.root/m.source_identity.OPS;r109core=previous['targetCore'];assert m.identity.core_identity(self.root/self.core)==r109core
  atomic(ops,m.source_identity.CANDIDATE.sub("export const CANDIDATE='"+r109core+"';",ops.read_text()).encode(),0o644)
  old=self.plan['sources']['R109_LATENCY2'];assets=self.root/'http-runtime/dist-vds/client/assets'/old['namespace'];assets.mkdir(parents=True)
  shutil.copytree(PROJECT/'r105_performance_review/evidence/final-browser-assets/assets'/old['namespace'],assets,dirs_exist_ok=True)
  (assets/'unchanged.webp').write_bytes(b'unchanged art');(assets/'entry.js').write_text("import './"+old['game']+"';\n")
  accounts=self.root/'accounts-runtime/dist-vds/client';shutil.copytree(self.root/'http-runtime/dist-vds/client',accounts,copy_function=os.link)
  rows=[]
  for tree in ('core511-source','http-runtime','accounts-runtime','native510-bb3a6cc689c6'):
   for p in (self.root/tree).rglob('*'):
    if p.is_file() and not p.is_symlink():rows.append({'path':p.relative_to(self.root).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)})
  (self.root/'release-manifest.json').write_bytes(encoded({'baselineSha256':self.plan['nativeBaseline'],'runtimeSha256':r109core,'files':rows,'r102AdminFix':'R109_LATENCY2'}))
  self.databases={};realms=[];self.configs={}
  for n,rid in enumerate(('r1','r2')):
   d=self.home/rid;d.mkdir();db=d/'game.sqlite'
   with sqlite3.connect(db) as c:c.executescript("CREATE TABLE players(id TEXT PRIMARY KEY,account_id TEXT,level INTEGER,gems INTEGER DEFAULT 100);INSERT INTO players(id,account_id,level) VALUES('one','account',65);CREATE TABLE kernel511_admissions(id TEXT);")
   self.databases[rid]=descriptor(db);realm={'id':rid,'name':rid,'initialChannelCapacity':25 if rid=='r1' else 10,'dbIdentity':'test-'+rid,'database':str(db),'ports':{'app':3500+n}};realms.append(realm)
   self.configs[rid]=d/'config.json';self.configs[rid].write_bytes(encoded({'database':str(db),'realm':{'id':rid,'dbIdentity':realm['dbIdentity'],'manifestFile':str(self.home/'manifest.json')},'delivery511':{'releaseRoot':str(self.root)}}))
  self.manifest={'primaryRealmId':'r1','realms':realms,'authPort':3400,'accountsDatabase':str(self.home/'accounts.sqlite')};(self.home/'manifest.json').write_bytes(encoded(self.manifest));self.af=self.home/'accounts.json';self.af.write_bytes(encoded({'database':self.manifest['accountsDatabase']}))
  self.state={'installed':True,'releaseRoot':str(self.root),'candidate':r109core,'prior':{'gameUnit':'coreoflife-r1.service','accountsUnit':'coreoflife-accounts.service','newGameConfigFile':str(self.configs['r1']),'newAccountsConfigFile':str(self.af),'databaseIdentity':{'dev':self.databases['r1']['device'],'ino':self.databases['r1']['inode']}},'r101':{'realm2Config':str(self.configs['r2']),'sharedCpAuthority':True,'journal':'historical-migration-audit'},'r102':{'version':'R102_CONTENT','journal':'historical-r102-migration-audit'},'r64Deployment':{'version':source,'accountsRoot':str(self.root)}};self.statefile.write_bytes(encoded(self.state))
  self.site=self.home/'site';self.site.mkdir();self.site.joinpath('index.html').write_bytes(b'unchanged marketing site');self.scope.enter_context(patch.object(m.site_delta,'SITE',self.site))
  self.live=SimpleNamespace(root=self.root,node=NODE,state=self.state,gf=self.configs['r1'],af=self.af,game=json.loads(self.configs['r1'].read_text()),accounts=json.loads(self.af.read_text()),manifest=self.manifest,configs=self.configs,databases=self.databases)
  for name,value in {'STATE':self.statefile,'CONTROL':self.control,'ACTIVE':self.control/'active.json','RELEASES':self.releases,'SYSTEMD':self.systemd}.items():self.scope.enter_context(patch.object(m,name,value))
  self.scope.enter_context(patch.object(m,'preflight',side_effect=self.preflight));self.scope.enter_context(patch.object(m,'guards',side_effect=lambda *a:None));self.scope.enter_context(patch.object(m,'stop_all',side_effect=lambda:None));self.scope.enter_context(patch.object(m,'start_all',side_effect=lambda *a:None));self.scope.enter_context(patch.object(m,'check_access',side_effect=lambda *a:None));self.scope.enter_context(patch.object(m,'central',side_effect=self.central));self.scope.enter_context(patch.object(m.readiness,'wait',side_effect=self.health));self.fail=False;self.versions=[]
 def preflight(self,live,z,plan,apply=False):
  m.validate_plan(plan);m.runtime_imports.validate(live.root,plan,z);plan['_siteChanges']=m.site_delta.changes(z,plan);plan['_resolvedIdentity']=m.source_identity.resolve(live,plan);return m.payload(live,z,plan)+m.asset_updates(live,z,plan)
 def central(self,live,rid,action='snapshot',snapshot=None):return {'revision':1,'phase':'maintenance','mode':'maintenance','enabled':True,'deadlineMs':0,'realm':{'id':rid,'status':'closed' if rid=='r2' else 'maintenance','registrationOpen':True}}
 def health(self,manifest,version='R110_HANDOFF1',**kwargs):
  self.versions.append(version)
  if self.fail and version=='R110_HANDOFF1':
   with sqlite3.connect(self.databases['r1']['path']) as db:db.execute('UPDATE players SET gems=123456');db.commit()
   raise RuntimeError('injected health failure')
  return {r['id']:{**marks(version),'realm':{'realmId':r['id'],'dbIdentity':r['dbIdentity']},'channelProcesses':{'channels':[{'channel':n,'ready':True,'capacity':r['initialChannelCapacity']} for n in range(1,5)]}} for r in manifest['realms']}
 def close(self):self.scope.close();self.z.close();self.tmp.cleanup()
class Installation(unittest.TestCase):
 def fixture(self,source='R109_LATENCY2'):f=Fixture(source);self.addCleanup(f.close);return f
 def result(self,f):return json.loads((next(f.control.glob('install-*'))/'result.json').read_text())
 def test_plan_is_the_reviewed_code_only_delta_from_r109(self):
  f=self.fixture();self.assertEqual(f.plan['version'],'R110_HANDOFF1');self.assertEqual(set(f.plan['sources']),{'R109_LATENCY2'});self.assertEqual(set(f.plan['files']),CHANGED)
  self.assertEqual(f.plan['files'][OPTIONS]['before'],[None]);self.assertIsNone(f.plan['site']);self.assertEqual(f.plan['clientNew'],[])
  self.assertEqual((f.plan['databaseChanges'],f.plan['databaseSchemaChanges'],f.plan['databaseScope']),(False,False,'none'))
  with zipfile.ZipFile(R109) as prior:old=json.loads(prior.read('plan.json'))
  self.assertEqual(f.plan['sources']['R109_LATENCY2']['core'],old['targetCore']);self.assertEqual({k:f.plan[k] for k in ('namespace','game','admin','portal')},{k:old[k] for k in ('namespace','game','admin','portal')})
 def test_exact_package_updates_only_reviewed_files_and_rollback_restores_r109(self):
  f=self.fixture();before={rid:digest(row['path']) for rid,row in f.databases.items()};source=m.identity.core_identity(f.root/f.core);old={n:(f.root/n).read_bytes() for n in CHANGED if (f.root/n).exists()}
  m.apply(f.live,f.z,f.plan);j=self.result(f);m.validate_record(j,completed=True)
  self.assertEqual({r['path'] for r in j['files']},CHANGED|{m.source_identity.OPS});self.assertEqual(j['databaseScope'],'none');self.assertEqual({rid:digest(row['path']) for rid,row in f.databases.items()},before)
  for n in CHANGED:self.assertEqual((f.root/n).read_bytes(),f.z.read('payload/'+n))
  self.assertEqual(m.identity.core_identity(f.root/f.core),f.plan['targetCore']);state=json.loads(f.statefile.read_text());self.assertEqual(state['r64Deployment']['version'],'R110_HANDOFF1');self.assertEqual(state['candidate'],f.plan['targetCore'])
  self.assertEqual(set(p.name for p in Path(j['directory']).iterdir()),{'result.json','code','retention.json'});self.assertTrue(all(r['before'] is not None for r in j['files'] if r['backup']))
  self.assertEqual(f.versions[-1],'R110_HANDOFF1');self.assertEqual((f.site/'index.html').read_bytes(),b'unchanged marketing site')
  j['phase']='rollback-requested';m.persist(j);m.rollback(m.discover(),j)
  self.assertEqual(m.identity.core_identity(f.root/f.core),source);self.assertFalse((f.root/OPTIONS).exists());self.assertEqual(json.loads(f.statefile.read_text()),f.state)
  for n,b in old.items():self.assertEqual((f.root/n).read_bytes(),b)
  self.assertEqual(f.versions[-1],'R109_LATENCY2','rollback waits for the exact R109 markers')
 def test_health_failure_restores_r109_code_and_preserves_player_progress(self):
  f=self.fixture();f.fail=True
  with self.assertRaisesRegex(RuntimeError,'injected health'):m.apply(f.live,f.z,f.plan)
  self.assertFalse(m.ACTIVE.exists());self.assertEqual(m.identity.core_identity(f.root/f.core),f.state['candidate']);self.assertFalse((f.root/OPTIONS).exists());self.assertEqual(json.loads(f.statefile.read_text()),f.state)
  with sqlite3.connect(f.databases['r1']['path']) as db:self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],123456)
  f.fail=False;m.apply(f.live,f.z,f.plan);self.assertEqual(len(list(f.control.glob('install-*'))),1)
 def test_partial_code_write_restores_all_changes(self):
  f=self.fixture();original=m.inplace._replace;writes=0
  def fail(root,stage,row,data,restore=False):
   nonlocal writes
   original(root,stage,row,data,restore=restore)
   if not restore:
    writes+=1
    if writes==7:raise RuntimeError('injected partial write')
  with patch.object(m.inplace,'_replace',side_effect=fail):
   with self.assertRaisesRegex(RuntimeError,'partial write'):m.apply(f.live,f.z,f.plan)
  self.assertFalse(m.ACTIVE.exists());self.assertEqual(m.identity.core_identity(f.root/f.core),f.state['candidate']);self.assertFalse((f.root/OPTIONS).exists())
 def test_power_loss_during_backup_requires_no_complete_backup_to_recover(self):
  f=self.fixture()
  with patch.object(m.inplace,'store_backups',side_effect=RuntimeError('power loss in backup')),patch.object(m,'recover',side_effect=SystemExit('power cut')):
   with self.assertRaises(SystemExit):m.apply(f.live,f.z,f.plan)
  j=json.loads(m.ACTIVE.read_text());self.assertEqual(j['phase'],'described');m.recover(f.live,j);self.assertFalse(m.ACTIVE.exists());self.assertEqual(json.loads(f.statefile.read_text()),f.state)
 def test_modified_installed_file_stops_before_maintenance(self):
  f=self.fixture();p=f.root/'core511-source/scripts/delivery511/runtime-ingress.mjs';p.write_text(p.read_text()+'\n// local change\n')
  with self.assertRaisesRegex(RuntimeError,'dosya farklı'):f.preflight(f.live,f.z,f.plan)
  m.stop_all.assert_not_called();self.assertFalse(m.ACTIVE.exists())
 def test_existing_options_file_is_not_overwritten(self):
  f=self.fixture();(f.root/OPTIONS).write_text('export const foreign=1;\n')
  with self.assertRaises(RuntimeError):f.preflight(f.live,f.z,f.plan)
  self.assertEqual((f.root/OPTIONS).read_text(),'export const foreign=1;\n');m.stop_all.assert_not_called()
 def test_only_installed_r109_is_accepted_as_source(self):
  for version in ('R105_PERF1','R106_CAPTCHA1','R107_POPULATION1'):
   f=self.fixture();f.live.state['r64Deployment']['version']=version
   with self.assertRaisesRegex(RuntimeError,'R109_LATENCY2 sürümü kurulu olmalı'):f.preflight(f.live,f.z,f.plan)
   m.stop_all.assert_not_called()
 def test_r105_files_without_r109_are_rejected(self):
  f=self.fixture();name=CORE+'coordinator.mjs';(f.root/name).write_bytes((BASE/name).read_bytes())
  with self.assertRaisesRegex(RuntimeError,'Kurulu çekirdek eşleşmedi'):f.preflight(f.live,f.z,f.plan)
  m.stop_all.assert_not_called()
 def test_already_installed_r110_is_not_applied_twice(self):
  f=self.fixture();m.apply(f.live,f.z,f.plan);live=m.discover()
  with self.assertRaisesRegex(RuntimeError,'R109_LATENCY2 sürümü kurulu olmalı'):f.preflight(live,f.z,f.plan)
 def test_prior_r109_install_record_retires_after_new_backup_is_valid(self):
  f=self.fixture();f.fail=True
  with self.assertRaisesRegex(RuntimeError,'injected health'):m.apply(f.live,f.z,f.plan)
  prior=next(f.control.glob('install-*'));old=json.loads((prior/'result.json').read_text());old['version']='R109_LATENCY2';(prior/'result.json').write_bytes(encoded(old))
  f.fail=False;m.apply(f.live,f.z,f.plan);self.assertFalse(prior.exists());self.assertEqual(len(list(f.control.glob('install-*'))),1);m.validate_record(self.result(f),completed=True)
 def test_unknown_files_are_preserved_by_retention(self):
  f=self.fixture();f.fail=True
  with self.assertRaisesRegex(RuntimeError,'injected health'):m.apply(f.live,f.z,f.plan)
  old=next(f.control.glob('install-*'));(old/'foreign.sqlite').write_text('unknown');f.fail=False;m.apply(f.live,f.z,f.plan)
  self.assertEqual((old/'foreign.sqlite').read_text(),'unknown')
 def test_unready_or_different_realm_blocks_cleanup(self):
  f=self.fixture();m.apply(f.live,f.z,f.plan);j=self.result(f)
  for field in ('realtimeHandoff','latencyRepair','populationStability','captchaWorker','connectionRecovery'):
   health=f.health(f.manifest);health['r2'][field]='old'
   with self.assertRaisesRegex(RuntimeError,'doğrulanmadan'):m.prune(j,health)
  m.prune(j,f.health(f.manifest))
 def test_readiness_requires_r110_and_accepts_exact_r109_for_rollback(self):
  f=self.fixture();manifest=json.loads(json.dumps(f.manifest))
  for i,realm in enumerate(manifest['realms']):realm['ports']['realtime']=3600+i
  health=f.health(manifest)
  def request(port,path):
   if port==manifest['authPort']:return {'authenticated':False}
   realm=next(r for r in manifest['realms'] if port in r['ports'].values());rid=realm['id']
   if path=='/api/vds-health':return health[rid]
   if path=='/api/realm/context':return {'realm':{'id':rid}}
   return {'ok':True,'protocol':'col-realtime-1','transportRepairVersion':'R102_REALTIME1','realmId':rid,'dbIdentity':realm['dbIdentity']}
  self.assertEqual(m.readiness.probe(manifest,request=request)[1],[])
  for field in ('realtimeHandoff','latencyRepair','populationStability','captchaWorker','performanceReview','connectionRecovery'):
   health=f.health(manifest);health['r2'][field]='old'
   self.assertTrue(m.readiness.probe(manifest,request=request)[1],field)
  health=f.health(manifest,'R109_LATENCY2')
  self.assertEqual(m.readiness.probe(manifest,'R109_LATENCY2',request=request)[1],[])
  self.assertEqual(len(m.readiness.probe(manifest,request=request)[1]),2,'R109 code is not accepted as R110')
 def test_code_contract_binds_every_reviewed_byte(self):
  f=self.fixture();m.validate_plan(f.plan)
  for key,value in [('databaseChanges',True),('databaseSchemaChanges',True),('databaseScope','all'),('version','R109_LATENCY2')]:
   p=json.loads(json.dumps(f.plan));p[key]=value
   with self.assertRaises(RuntimeError):m.validate_plan(p)
  f.plan['files'][OPTIONS]['after']='0'*64
  with self.assertRaisesRegex(RuntimeError,'İncelenmiş'):m.validate_plan(f.plan)
 def test_changed_imports_resolve_inside_the_release(self):
  f=self.fixture();self.assertGreaterEqual(m.runtime_imports.validate(f.root,f.plan,f.z),3)
  # runtime_imports covers core/native modules; check the two delivery511 entry files too.
  import posixpath
  for name in ('core511-source/scripts/delivery511/runtime-ingress.mjs','core511-source/scripts/delivery511/runtime-host.mjs'):
   for spec in m.runtime_imports.IMPORT.findall(f.z.read('payload/'+name).decode()):
    if not spec.startswith('.'):continue
    target=posixpath.normpath(posixpath.join(posixpath.dirname(name),spec));self.assertFalse(target.startswith('../'),target)
    self.assertTrue(target in f.plan['files'] or (f.root/target).is_file(),name+' -> '+spec)
if __name__=='__main__':unittest.main()
