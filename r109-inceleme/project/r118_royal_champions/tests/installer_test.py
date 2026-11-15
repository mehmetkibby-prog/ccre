"""R118 on installed R117: coherent schema migration and guarded progress-safe rollback.
Systemd and HTTP health are adapters (as in the R109 tests). Systemd/Caddy transport are adapters; real SQLite schema migration runs."""
import contextlib,hashlib,json,os,shutil,sqlite3,subprocess,sys,tempfile,unittest,zipfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];PROJECT=ROOT.parent;sys.path.insert(0,str(ROOT/'deployment/modules'))
import installer as m
from storage import encoded,digest,descriptor,atomic
BASE=PROJECT/'r105_performance_review/working';R109=PROJECT/'r109_latency_completion/delivery/r109-gecikme.zip';NODE=Path(os.environ.get('REVIEW_NODE') or shutil.which('node'))
R110=PROJECT/'r110_takilma/delivery/r110-takilma.zip'
R113=PROJECT/'r113_engine/artifacts/R113_ENGINE_76cd8cd4c40f.zip'
R114=PROJECT/'r114_rune_forum/artifacts/R114_FORUM_47c1d3316429.zip'
R115=PROJECT/'r115_shared_scope/artifacts/R115_SHARED_SCOPE_a668b021b2e3.zip'
R116=PROJECT/'r116_admission_transfer/artifacts/R116_ADMISSION_TRANSFER_568aca987578.zip'
R117=PROJECT/'r117_hook_rate/artifacts/R117_HOOK10_28ecda32950b.zip'
CORE='core511-source/scripts/core511/'
CHANGED=set(json.loads((ROOT/'build/reviewed-files.json').read_text()))
OPTIONS=CORE+'royal-config-r118.mjs'
DEVELOPMENT_FIXTURE='core511-source/scripts/perf-r11/tests/reward/fixture.mjs'
ORIGINAL_R118=ROOT/'artifacts/R118_ROYAL_6fa07edb5ce7.zip'
def marks(version):
 return {'ok':True,'updateVersion':'R102_CONTENT','adminHotfix':'R102_ADMIN1','rankingHotfix':'R102_RANK1','entryHotfix':'R102_ENTRY1','championLabelHotfix':'R102_LABEL1','mobileHud':'R102_HUD_SLIM1','autoIpLimit':'R102_AUTO_IP1','realmLoad':'R102_LOAD1','additionsHotfix':'R102_COMPLETE3','skillVisuals':'R103_SKILLS1','browserCompatibility':'R103_ABORT1','autoSession':'R103_AUTO_SESSION1','mobileChat':'R103_CHAT_ANCHOR2','academyPrereg':'R104_AKADEMI4','readerBoot':'R104_BOOT1','connectionRecovery':'R105_TOWER2','performanceReview':'R105_PERF1','captchaWorker':'R106_CAPTCHA1','populationStability':'R107_POPULATION1','latencyRepair':'R109_LATENCY2','realtimeHandoff':'R110_HANDOFF1','combatContinuity':'R111_COMBAT1' if version in ('R111_COMBAT1','R112_FLOW1','R113_ENGINE1','R114_RUNE_FORUM1','R115_SHARED_SCOPE1','R116_ADMISSION_TRANSFER1','R117_HOOK10','R118_ROYAL1') else None,'runtimeFlow':'R112_FLOW1','engineRework':'R113_ENGINE1','engineReadyR113':True,'runeForum':'R114_RUNE_FORUM1','sharedScope':'R115_SHARED_SCOPE1' if version in ('R115_SHARED_SCOPE1','R116_ADMISSION_TRANSFER1','R117_HOOK10','R118_ROYAL1') else None,'admissionTransfer':'R116_ADMISSION_TRANSFER1' if version in ('R116_ADMISSION_TRANSFER1','R117_HOOK10','R118_ROYAL1') else None,'hookRate':'R117_HOOK10' if version in ('R117_HOOK10','R118_ROYAL1') else None,'azrailHookChance':10 if version in ('R117_HOOK10','R118_ROYAL1') else 6,'royalChampions':'R118_ROYAL1' if version=='R118_ROYAL1' else None,'royalReadyR118':version=='R118_ROYAL1','kernel511':{'readerReady':True}}

def restore_client_assets(root):
 """Rebuild the source R117 asset graph without relying on expired /tmp stages."""
 baseline=PROJECT/'r105_performance_review/evidence/final-browser-assets/assets'
 http=root/'http-runtime/dist-vds/client';accounts=root/'accounts-runtime/dist-vds/client'
 shutil.copytree(baseline,http/'assets',dirs_exist_ok=True)
 shutil.copytree(http,accounts,copy_function=os.link)
 for archive in (R113,R114,R117):
  with zipfile.ZipFile(archive) as z:
   plan=json.loads(z.read('plan.json'));plan['_resolvedIdentity']={'version':next(iter(plan['sources']))}
   rows=[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)} for p in http.rglob('*') if p.is_file() and not p.is_symlink()]
   (root/'release-manifest.json').write_bytes(encoded({'files':rows}))
   for name,meta,data in m.asset_updates(SimpleNamespace(root=root),z,plan):
    if data is None:data=(root/meta['linkSource']).read_bytes()
    assert len(data)==meta['bytes'] and hashlib.sha256(data).hexdigest()==meta['after']
    atomic(root/name,data,0o644)

class Fixture:
 """Installed R117: exact immutable release chain through the final R117 artifact."""
 def __init__(self,source='R117_HOOK10'):
  self.tmp=tempfile.TemporaryDirectory(prefix='r118-install-test-');self.home=Path(self.tmp.name);self.releases=self.home/'releases';self.releases.mkdir();self.root=self.releases/'r101';shutil.copytree(BASE,self.root,copy_function=shutil.copy2,symlinks=True)
  native=self.root/'native510-bb3a6cc689c6';assert native.is_dir() and not native.is_symlink()
  modules=native/'node_modules'
  if modules.is_symlink():modules.unlink()
  modules.symlink_to(PROJECT.parent/'node_modules',target_is_directory=True)
  chain=[(R109,'1ba96d415891f8d474188edb64331b87b7bc12fdfb54733f49918a906e6ef068'),(R110,'4fd1fbb8a36de2ae89fb693f5617ac3a8e697f2608f4a6b14464b6703a83bcc0'),(R113,'4399dfe08550ebf04bd4c8ea7fbab8cedcdb804fd851495dd17847a0eabbcbc3'),(R114,'68dad6638a1b6911d0d499d2b3042e6d99dc1f51862567e6325654304bbcf2cf'),(R115,'791858ebddc240c5330e663b569982305fb5acb0c8645adde77e86ed1a6603ea'),(R116,'f8399793db7d40af7f873b4a892759c7c71c19f70bb4c45995b00b68d3071ac9'),(R117,'420135643eddb53f8b81fc490014d31fb877d7513077716c792fba92a5658996')]
  for archive,checksum in chain:
   assert digest(archive)==checksum
   with zipfile.ZipFile(archive) as prior:
    previous=json.loads(prior.read('plan.json'))
    for name,meta in previous['files'].items():
     data=prior.read('payload/'+name);assert hashlib.sha256(data).hexdigest()==meta['after'];atomic(self.root/name,data,0o644)
  assert previous['version']==source
  self.control=self.home/'r102';self.statefile=self.home/'state.json';self.systemd=self.home/'systemd';self.scope=contextlib.ExitStack();record=json.loads((ROOT/'evidence/package.json').read_text());archive=ROOT/record['file'];assert hashlib.sha256(archive.read_bytes()).hexdigest()==record['sha256'],'package record';self.z=zipfile.ZipFile(archive);self.plan=json.loads(self.z.read('plan.json'))
  self.root.joinpath('bin').mkdir(exist_ok=True);self.node=NODE
  self.core=m.source_identity.CORE;ops=self.root/m.source_identity.OPS;r109core=previous['targetCore'];assert m.identity.core_identity(self.root/self.core)==r109core
  atomic(ops,m.source_identity.CANDIDATE.sub("export const CANDIDATE='"+r109core+"';",ops.read_text()).encode(),0o644)
  restore_client_assets(self.root);old=self.plan['sources']['R117_HOOK10']
  for runtime in ('http-runtime','accounts-runtime'):
   assets=self.root/runtime/'dist-vds/client/assets'/old['namespace']
   (assets/'unchanged.webp').write_bytes(b'unchanged art');(assets/'entry.js').write_text("import './"+old['game']+"';\n")
  rows=[]
  for tree in ('core511-source','http-runtime','accounts-runtime','native510-bb3a6cc689c6'):
   for p in (self.root/tree).rglob('*'):
    if p.is_file() and not p.is_symlink():rows.append({'path':p.relative_to(self.root).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)})
  (self.root/'release-manifest.json').write_bytes(encoded({'baselineSha256':self.plan['nativeBaseline'],'runtimeSha256':r109core,'files':rows,'r102AdminFix':'R117_HOOK10'}))
  self.databases={};realms=[];self.configs={}
  for n,rid in enumerate(('r1','r2')):
   d=self.home/rid;d.mkdir();db=d/'game.sqlite'
   subprocess.run([str(NODE),str(ROOT/'tests/seed-source.mjs'),str(db)],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
   self.databases[rid]=descriptor(db);realm={'id':rid,'name':rid,'initialChannelCapacity':25 if rid=='r1' else 10,'dbIdentity':'test-'+rid,'database':str(db),'ports':{'app':3500+n}};realms.append(realm)
   self.configs[rid]=d/'config.json';self.configs[rid].write_bytes(encoded({'database':str(db),'realm':{'id':rid,'dbIdentity':realm['dbIdentity'],'manifestFile':str(self.home/'manifest.json')},'delivery511':{'releaseRoot':str(self.root)}}))
  self.manifest={'primaryRealmId':'r1','realms':realms,'authPort':3400,'accountsDatabase':str(self.home/'accounts.sqlite')};(self.home/'manifest.json').write_bytes(encoded(self.manifest));self.af=self.home/'accounts.json';self.af.write_bytes(encoded({'database':self.manifest['accountsDatabase']}))
  self.state={'installed':True,'releaseRoot':str(self.root),'candidate':r109core,'prior':{'gameUnit':'coreoflife-r1.service','accountsUnit':'coreoflife-accounts.service','newGameConfigFile':str(self.configs['r1']),'newAccountsConfigFile':str(self.af),'databaseIdentity':{'dev':self.databases['r1']['device'],'ino':self.databases['r1']['inode']}},'r101':{'realm2Config':str(self.configs['r2']),'sharedCpAuthority':True,'journal':'historical-migration-audit'},'r102':{'version':'R102_CONTENT','journal':'historical-r102-migration-audit'},'r64Deployment':{'version':source,'accountsRoot':str(self.root)}};self.statefile.write_bytes(encoded(self.state))
  self.site=self.home/'site';self.site.mkdir();self.site.joinpath('index.html').write_text('existing R114 site and forum link')
  self.forum=self.home/'forum.sqlite';self.forum.write_bytes(b'existing forum database sentinel')
  self.live=SimpleNamespace(root=self.root,node=NODE,state=self.state,gf=self.configs['r1'],af=self.af,game=json.loads(self.configs['r1'].read_text()),accounts=json.loads(self.af.read_text()),manifest=self.manifest,configs=self.configs,databases=self.databases)
  for name,value in {'STATE':self.statefile,'CONTROL':self.control,'ACTIVE':self.control/'active.json','RELEASES':self.releases,'SYSTEMD':self.systemd}.items():self.scope.enter_context(patch.object(m,name,value))
  self.scope.enter_context(patch.object(m,'preflight',side_effect=self.preflight));self.scope.enter_context(patch.object(m,'guards',side_effect=lambda *a:None));self.scope.enter_context(patch.object(m,'stop_all',side_effect=lambda:None));self.scope.enter_context(patch.object(m,'start_all',side_effect=lambda *a:None));self.scope.enter_context(patch.object(m,'check_access',side_effect=lambda *a:None));self.scope.enter_context(patch.object(m,'central',side_effect=self.central));self.scope.enter_context(patch.object(m.readiness,'wait',side_effect=self.health));self.fail=False;self.versions=[];self.centralCalls=[]
  self.policies={rid:{'revision':7 if rid=='r1' else 11,'phase':'maintenance' if rid=='r1' else 'open','mode':'maintenance' if rid=='r1' else 'open','enabled':True,'registrationOpen':rid=='r2','deadlineMs':0,'realm':{'id':rid,'status':'maintenance' if rid=='r1' else 'closed','registrationOpen':rid=='r2'}} for rid in ('r1','r2')};self.initialPolicies=json.loads(json.dumps(self.policies))
 def preflight(self,live,z,plan,apply=False):
  m.validate_plan(plan);m.runtime_imports.validate(live.root,plan,z);plan['_siteChanges']=m.site_delta.changes(z,plan);plan['_resolvedIdentity']=m.source_identity.resolve(live,plan);return m.payload(live,z,plan)+m.asset_updates(live,z,plan)
 def central(self,live,rid,action='snapshot',snapshot=None):
  self.centralCalls.append((rid,action,json.loads(json.dumps(snapshot))))
  current=self.policies[rid]
  if action=='gate':
   assert current==snapshot
   current['realm']['status']='maintenance'
  elif action=='restore':
   if current['realm']['status']=='maintenance':current['realm']=dict(snapshot['realm'])
   else:assert current['realm']==snapshot['realm']
  else:assert action=='snapshot'
  return json.loads(json.dumps(current))
 def health(self,manifest,version='R118_ROYAL1',**kwargs):
  self.versions.append(version)
  if self.fail and version=='R118_ROYAL1':
   with sqlite3.connect(self.databases['r1']['path']) as db:db.execute('UPDATE players SET gems=123456');db.commit()
   raise RuntimeError('injected health failure')
  return {r['id']:{**marks(version),'realm':{'realmId':r['id'],'dbIdentity':r['dbIdentity']},'channelProcesses':{'channels':[{'channel':n,'ready':True,'capacity':r['initialChannelCapacity']} for n in range(1,5)]}} for r in manifest['realms']}
 def close(self):self.scope.close();self.z.close();self.tmp.cleanup()

class Installation(unittest.TestCase):
 def fixture(self):
  f=Fixture();self.addCleanup(f.close);return f
 def result(self,f):return json.loads((max(f.control.glob('install-*'),key=lambda p:p.stat().st_mtime)/'result.json').read_text())
 def test_corrected_archive_preserves_every_runtime_byte_and_identity(self):
  record=json.loads((ROOT/'evidence/package.json').read_text())
  self.assertEqual(digest(ORIGINAL_R118),'640cf76b08b9d072db55d88cd8b8d539fb74b442cb26e78d3a437b5b37422fd7')
  with zipfile.ZipFile(ORIGINAL_R118) as old,zipfile.ZipFile(ROOT/record['file']) as new:
   before=json.loads(old.read('plan.json'));after=json.loads(new.read('plan.json'))
   self.assertEqual(set(before['files'])-set(after['files']),{DEVELOPMENT_FIXTURE})
   self.assertEqual(set(after['files'])-set(before['files']),set())
   for key in set(before)-{'files'}:self.assertEqual(before[key],after[key],key)
   for name in after['files']:
    self.assertEqual(before['files'][name],after['files'][name],name)
    self.assertEqual(old.read('payload/'+name),new.read('payload/'+name),name)
   self.assertNotIn('payload/'+DEVELOPMENT_FIXTURE,new.namelist())
   for name in old.namelist():
    if name.startswith('modules/') and name!='modules/code_contract.py':
     self.assertEqual(old.read(name),new.read(name),name)
 def test_different_or_missing_development_fixture_survives_apply_and_rollback(self):
  for missing in (False,True):
   with self.subTest(missing=missing):
    f=self.fixture();file=f.root/DEVELOPMENT_FIXTURE
    if missing:file.unlink()
    else:file.write_bytes(file.read_bytes()+b'\n// Locally adapted native test fixture.\n')
    expected=None if missing else file.read_bytes()
    m.apply(f.live,f.z,f.plan);j=self.result(f);m.validate_record(j,completed=True)
    self.assertNotIn(DEVELOPMENT_FIXTURE,{row['path'] for row in j['files']})
    self.assertEqual(file.read_bytes() if file.exists() else None,expected)
    j['phase']='rollback-requested';m.persist(j);m.rollback(f.live,j)
    self.assertEqual(file.read_bytes() if file.exists() else None,expected)
    self.assertEqual(json.loads(f.statefile.read_text())['r64Deployment']['version'],'R117_HOOK10')
    self.assertEqual(f.policies,f.initialPolicies)
    # Restore patched module globals before constructing the next fixture.
    f.scope.close()
 def test_changed_production_files_still_stop_before_any_installation_write(self):
  f=self.fixture();beforeState=f.statefile.read_bytes();beforeDB={rid:digest(row['path']) for rid,row in f.databases.items()}
  for name,error in ((CORE+'attack-loop.mjs','Kurulu çekirdek eşleşmedi:'),('native510-bb3a6cc689c6/lib/combat-stats.ts','Kurulu dosya farklı:')):
   with self.subTest(path=name):
    file=f.root/name;original=file.read_bytes();file.write_bytes(original+b'\n// Unrecognized production modification.\n')
    try:
     with patch.object(m,'stop_all') as stop:
      with self.assertRaisesRegex(RuntimeError,error):m.apply(f.live,f.z,f.plan)
      stop.assert_not_called()
     self.assertEqual(f.statefile.read_bytes(),beforeState)
     self.assertEqual({rid:digest(row['path']) for rid,row in f.databases.items()},beforeDB)
     self.assertFalse(m.ACTIVE.exists());self.assertEqual(f.centralCalls,[])
    finally:file.write_bytes(original)
 def test_client_graph_rejects_missing_new_monster_art_before_mutation(self):
  plan={'namespace':'core511-aaaaaaaaaaaaaaaa','game':'game-client-x.js','portal':'portal.js','admin':'admin.js'}
  prefix='http-runtime/dist-vds/client/assets/'+plan['namespace']+'/'
  entries=[(prefix+n,{},b) for n,b in {'portal.js':b'import "./game-client-x.js"','game-client-x.js':b'let a="/assets/core511-aaaaaaaaaaaaaaaa/boss-r118-deadbeef.webp"','admin.js':b'','boss-r118-deadbeef.webp':b'RIFF'}.items()]
  self.assertEqual(m.asset_graph.validate(SimpleNamespace(),plan,entries),{'files':4,'edges':2})
  with self.assertRaisesRegex(RuntimeError,'boss-r118-deadbeef.webp'):m.asset_graph.validate(SimpleNamespace(),plan,entries[:-1])
 def test_relative_market_material_icon_paths_match_browser_staging_once(self):
  namespace='core511-aaaaaaaaaaaaaaaa'
  old='{"image":"../assets/royal-icon-emerald_dust-r118-deadbeef","other":"/assets/crown-r118-deadbeef.webp","vite":"assets/game.js"}'
  actual=m.client_asset_paths(old,namespace)
  self.assertIn('"../assets/'+namespace+'/royal-icon-emerald_dust-r118-deadbeef"',actual)
  self.assertIn('"/assets/'+namespace+'/crown-r118-deadbeef.webp"',actual)
  self.assertIn('"assets/'+namespace+'/game.js"',actual)
  self.assertEqual(m.client_asset_paths(actual,namespace),actual)
  plan={'namespace':namespace,'game':'game-client-x.js','portal':'portal.js','admin':'admin.js'}
  prefix='http-runtime/dist-vds/client/assets/'+namespace+'/'
  entries=[(prefix+n,{},b) for n,b in {'portal.js':b'import "./game-client-x.js"','game-client-x.js':actual.encode(),'admin.js':b'','royal-icon-emerald_dust-r118-deadbeef.webp':b'RIFF','crown-r118-deadbeef.webp':b'RIFF','game.js':b''}.items()]
  self.assertEqual(m.asset_graph.validate(SimpleNamespace(),plan,entries)['files'],6)
  damaged=[(name,meta,old.encode() if name.endswith('game-client-x.js') else data) for name,meta,data in entries]
  with self.assertRaisesRegex(RuntimeError,'malzeme simgesi sürüm dışında'):m.asset_graph.validate(SimpleNamespace(),plan,damaged)
 def test_actual_runtime_health_contract_satisfies_installer_readiness(self):
  observed=json.loads((ROOT/'evidence/relocated-r118-runtime.json').read_text())
  realms=[];byport={}
  for n,row in enumerate(observed['realms']):
   h=row['health'];rid=row['realm'];realm={'id':rid,'dbIdentity':h['realm']['dbIdentity'],'initialChannelCapacity':h['channelProcesses']['channels'][0]['capacity'],'ports':{'app':5000+n,'realtime':6000+n}}
   realms.append(realm);byport[5000+n]=(realm,h);byport[6000+n]=(realm,h)
  manifest={'realms':realms,'authPort':7000}
  def request(port,endpoint):
   if port==7000:return {'authenticated':False}
   realm,h=byport[port]
   if endpoint=='/api/vds-health':return h
   if endpoint=='/api/realm/context':return {'realm':{'id':realm['id']}}
   return {'ok':True,'protocol':'col-realtime-1','transportRepairVersion':'R102_REALTIME1','realmId':realm['id'],'dbIdentity':realm['dbIdentity']}
  health,issues=m.readiness.probe(manifest,request=request)
  self.assertEqual(issues,[]);self.assertEqual(set(health),{'r1','r2'})
  byport[5000][1]['royalReadyR118']=False
  _,issues=m.readiness.probe(manifest,request=request);self.assertTrue(any('R118' in issue for issue in issues))
 def test_exact_r117_reviewed_source_schema_scope_and_asset_graph(self):
  f=self.fixture();self.assertEqual(set(f.plan['sources']),{'R117_HOOK10'});self.assertEqual(set(f.plan['files']),CHANGED)
  self.assertIn(OPTIONS,CHANGED);self.assertTrue(f.plan['databaseChanges']);self.assertTrue(f.plan['databaseSchemaChanges']);self.assertEqual(f.plan['databaseScope'],'r118-royal-champions-additive-v1')
  self.assertIsNone(f.plan['site']);self.assertNotIn('forum',f.plan);self.assertNotEqual(f.plan['namespace'],f.plan['sources']['R117_HOOK10']['namespace'])
  m.validate_plan(f.plan);f.preflight(f.live,f.z,f.plan);changed=json.loads(json.dumps(f.plan));changed['files'][OPTIONS]['bytes']+=1
  with self.assertRaises(RuntimeError):m.validate_plan(changed)
 def test_apply_and_unused_rollback_preserve_old_progress_assets_site_forum(self):
  f=self.fixture();before=m.identity.core_identity(f.root/f.core);oldassets={p.relative_to(f.root).as_posix():digest(p) for runtime in ['http-runtime','accounts-runtime'] for p in (f.root/runtime/'dist-vds/client/assets'/f.plan['sources']['R117_HOOK10']['namespace']).rglob('*') if p.is_file()};site=digest(f.site/'index.html');forum=digest(f.forum)
  m.apply(f.live,f.z,f.plan);j=self.result(f);m.validate_record(j,completed=True);self.assertEqual(f.policies,f.initialPolicies)
  for runtime in ('http-runtime','accounts-runtime'):
   for name in f.plan['clientNew']:self.assertTrue((f.root/runtime/'dist-vds/client/assets'/f.plan['namespace']/name).is_file())
   game=(f.root/runtime/'dist-vds/client/assets'/f.plan['namespace']/f.plan['game']).read_text()
   for kind in ('emerald_dust','royal_crown'):
    self.assertIn('../assets/'+f.plan['namespace']+'/royal-icon-'+kind+'-r118-',game)
    self.assertNotIn('../assets/royal-icon-'+kind+'-r118-',game)
  self.assertEqual(m.identity.core_identity(f.root/f.core),f.plan['targetCore']);self.assertEqual(json.loads(f.statefile.read_text())['r64Deployment']['version'],'R118_ROYAL1');self.assertEqual({name:digest(f.root/name) for name in oldassets},oldassets)
  for d in f.databases.values():
   with sqlite3.connect(d['path']) as db:
    self.assertEqual(db.execute("SELECT count(*) FROM monsters WHERE area='champions'").fetchone()[0],192);db.execute('UPDATE players SET gems=87654');db.commit()
  j['phase']='rollback-requested';m.persist(j);m.rollback(f.live,j)
  self.assertEqual(f.policies,f.initialPolicies);self.assertEqual(m.identity.core_identity(f.root/f.core),before);self.assertEqual(json.loads(f.statefile.read_text())['r64Deployment']['version'],'R117_HOOK10')
  for d in f.databases.values():
   with sqlite3.connect(d['path']) as db:
    self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],87654);self.assertEqual(db.execute("SELECT count(*) FROM sqlite_schema WHERE name='royal_settings_r118'").fetchone()[0],0);self.assertEqual(db.execute("SELECT count(*) FROM monsters WHERE area='champions'").fetchone()[0],0)
  self.assertEqual(digest(f.site/'index.html'),site);self.assertEqual(digest(f.forum),forum);self.assertFalse(m.ACTIVE.exists())
  for runtime in ('http-runtime','accounts-runtime'):self.assertFalse((f.root/runtime/'dist-vds/client/assets'/f.plan['namespace']).exists())
  self.assertEqual({name:digest(f.root/name) for name in oldassets},oldassets)
 def test_failed_health_rolls_back_unused_schema_and_preserves_legacy_progress(self):
  f=self.fixture();f.fail=True
  with self.assertRaisesRegex(RuntimeError,'injected health failure'):m.apply(f.live,f.z,f.plan)
  self.assertEqual(json.loads(f.statefile.read_text())['r64Deployment']['version'],'R117_HOOK10');self.assertFalse(m.ACTIVE.exists());self.assertEqual(f.policies,f.initialPolicies)
  self.assertEqual(m.identity.core_identity(f.root/f.core),f.plan['sources']['R117_HOOK10']['core'])
  with sqlite3.connect(f.databases['r1']['path']) as db:self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],123456)
 def test_gameplay_blocks_downgrade_and_recovers_current_version_without_loss(self):
  f=self.fixture();m.apply(f.live,f.z,f.plan);j=self.result(f)
  with sqlite3.connect(f.databases['r1']['path']) as db:db.execute("INSERT INTO royal_receipts_r118 VALUES('one','req','royal_transform_r118','digest','{}',1)");db.commit()
  j['phase']='rollback-requested';m.persist(j)
  with self.assertRaisesRegex(RuntimeError,'dönüş engellendi'):m.rollback(f.live,j)
  self.assertEqual(json.loads(f.statefile.read_text())['r64Deployment']['version'],'R118_ROYAL1');self.assertFalse(m.ACTIVE.exists());self.assertEqual(m.identity.core_identity(f.root/f.core),f.plan['targetCore'])
  with sqlite3.connect(f.databases['r1']['path']) as db:self.assertEqual(db.execute('SELECT count(*) FROM royal_receipts_r118').fetchone()[0],1)
 def test_partial_second_realm_migration_failure_recovers_both_schemas_and_code(self):
  f=self.fixture();original=m.database_action
  def fault(live,rid,action,snapshot):
   if rid=='r2' and action=='apply':raise RuntimeError('injected second realm migration failure')
   return original(live,rid,action,snapshot)
  with patch.object(m,'database_action',side_effect=fault):
   with self.assertRaisesRegex(RuntimeError,'injected second realm'):m.apply(f.live,f.z,f.plan)
  self.assertEqual(m.identity.core_identity(f.root/f.core),f.plan['sources']['R117_HOOK10']['core']);self.assertFalse(m.ACTIVE.exists())
  for d in f.databases.values():
   with sqlite3.connect(d['path']) as db:self.assertEqual(db.execute("SELECT count(*) FROM sqlite_schema WHERE name='royal_settings_r118'").fetchone()[0],0)
 def test_wrong_source_or_corrupt_payload_stops_before_mutation(self):
  f=self.fixture();f.live.state['r64Deployment']['version']='R116_ADMISSION_TRANSFER1'
  with self.assertRaisesRegex(RuntimeError,'R117'):f.preflight(f.live,f.z,f.plan)
  f.live.state['r64Deployment']['version']='R117_HOOK10';original=f.z.read
  def corrupted(name,*a,**k):
   value=original(name,*a,**k);return value+b'\n' if name=='payload/'+OPTIONS else value
  with patch.object(f.z,'read',side_effect=corrupted):
   with self.assertRaisesRegex(RuntimeError,'Paket verisi bozuk'):f.preflight(f.live,f.z,f.plan)
  self.assertFalse(m.ACTIVE.exists());self.assertEqual(f.centralCalls,[])
 def test_atomic_writer_honors_strict_umask(self):
  f=self.fixture();before={name:(f.root/name).stat().st_mode & 0o777 for name in CHANGED if (f.root/name).exists()};prior=os.umask(0o077)
  try:m.apply(f.live,f.z,f.plan)
  finally:os.umask(prior)
  for name in CHANGED:self.assertEqual((f.root/name).stat().st_mode & 0o777,before.get(name,0o644),name)
  for runtime in ('http-runtime','accounts-runtime'):
   for name in f.plan['clientNew']:self.assertEqual((f.root/runtime/'dist-vds/client/assets'/f.plan['namespace']/name).stat().st_mode & 0o777,0o644)
  j=self.result(f)
  for row in j['databaseBackups'].values():self.assertEqual(Path(row['snapshot']).stat().st_mode & 0o777,0o600)
 def test_corrupt_schema_backup_blocks_rollback_before_writes(self):
  f=self.fixture();m.apply(f.live,f.z,f.plan);j=self.result(f);Path(j['databaseBackups']['r1']['snapshot']).write_bytes(b'corrupt')
  with patch.object(m,'stop_all') as stop:
   with self.assertRaisesRegex(RuntimeError,'yedek|yedeği'):m.rollback(f.live,j)
   stop.assert_not_called()
  self.assertEqual(m.identity.core_identity(f.root/f.core),f.plan['targetCore'])
 def test_foreign_pending_recovery_has_no_side_effects(self):
  f=self.fixture()
  with patch.object(m,'guards') as guards,patch.object(m,'start_all') as start:
   with self.assertRaisesRegex(RuntimeError,'aynı paketiyle'):m.recover(f.live,{'version':'R117_HOOK10','phase':'prepared','files':[]})
   guards.assert_not_called();start.assert_not_called()
 def test_health_requires_r118_and_r116_guards_and_all_eight_channels(self):
  f=self.fixture();health=f.health(f.manifest);m.apply(f.live,f.z,f.plan);j=self.result(f)
  for field in ('royalChampions','admissionTransfer'):
   damaged=json.loads(json.dumps(health));del damaged['r2'][field]
   with self.assertRaisesRegex(RuntimeError,'sekiz kanal'):m.prune(j,damaged)
  damaged=json.loads(json.dumps(health));damaged['r1']['channelProcesses']['channels'][0]['ready']=False
  with self.assertRaisesRegex(RuntimeError,'sekiz kanal'):m.prune(j,damaged)

if __name__=='__main__':unittest.main()
