"""Real files and exact code delta. Systemd and HTTP health are adapters. SQLite files must remain untouched."""
import contextlib,hashlib,json,os,shutil,sqlite3,sys,tempfile,unittest,zipfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'deployment/modules'))
import installer as m
from storage import encoded,digest,descriptor,atomic
BASE=ROOT.parent/'r105_performance_review/working';NODE=Path(os.environ.get('REVIEW_NODE') or shutil.which('node'))
class Fixture:
 def __init__(self,source='R105_PERF1'):
  self.tmp=tempfile.TemporaryDirectory(prefix='r102-install-test-');self.home=Path(self.tmp.name);self.releases=self.home/'releases';self.releases.mkdir();self.root=self.releases/'r101';shutil.copytree(BASE,self.root,copy_function=shutil.copy2,symlinks=True)
  native=self.root/'native510-bb3a6cc689c6';assert native.is_dir() and not native.is_symlink()
  # Disposable fixture is outside the checkout; rebind only its dependency link.
  modules=native/'node_modules'
  if modules.is_symlink():modules.unlink()
  modules.symlink_to(ROOT.parents[1]/'node_modules',target_is_directory=True)
  self.control=self.home/'r102';self.statefile=self.home/'state.json';self.systemd=self.home/'systemd';self.scope=contextlib.ExitStack();self.z=zipfile.ZipFile(json.loads((ROOT/'evidence/package.json').read_text())['file']);self.plan=json.loads(self.z.read('plan.json'))
  if source=='R106_CAPTCHA1':
   with zipfile.ZipFile(ROOT.parent/'r106_captcha_worker/delivery/r106-captcha.zip') as prior:
    previous=json.loads(prior.read('plan.json'))
    for name,meta in previous['files'].items():
     data=prior.read('payload/'+name);assert hashlib.sha256(data).hexdigest()==meta['after'];atomic(self.root/name,data,0o644)
  self.root.joinpath('bin').mkdir(exist_ok=True);self.node=NODE
  self.core=m.source_identity.CORE;ops=self.root/m.source_identity.OPS;atomic(ops,m.source_identity.CANDIDATE.sub("export const CANDIDATE='"+self.plan['sources'][source]['core']+"';",ops.read_text()).encode(),0o644)
  old=self.plan['sources'][source];assets=self.root/'http-runtime/dist-vds/client/assets'/old['namespace'];assets.mkdir(parents=True)
  shutil.copytree(ROOT.parent/'r105_performance_review/evidence/final-browser-assets/assets'/old['namespace'],assets,dirs_exist_ok=True)
  # Unchanged media verified byte-for-byte against the live source namespace.
  # Include it in the real installer source manifest, not a new-client alias.
  (assets/'unchanged.webp').write_bytes(b'unchanged art');(assets/'entry.js').write_text("import './"+old['game']+"';\n")
  accounts=self.root/'accounts-runtime/dist-vds/client';shutil.copytree(self.root/'http-runtime/dist-vds/client',accounts,copy_function=os.link)
  rows=[]
  for tree in ('core511-source','http-runtime','accounts-runtime','native510-bb3a6cc689c6'):
   for p in (self.root/tree).rglob('*'):
    if p.is_file() and not p.is_symlink():rows.append({'path':p.relative_to(self.root).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)})
  (self.root/'release-manifest.json').write_bytes(encoded({'baselineSha256':self.plan['nativeBaseline'],'runtimeSha256':old['core'],'files':rows}))
  self.databases={};realms=[];self.configs={}
  for n,rid in enumerate(('r1','r2')):
   d=self.home/rid;d.mkdir();db=d/'game.sqlite'
   with sqlite3.connect(db) as c:c.executescript("CREATE TABLE players(id TEXT PRIMARY KEY,account_id TEXT,level INTEGER,rank_tier INTEGER,rank_xp INTEGER DEFAULT 0,gems INTEGER DEFAULT 100,hp REAL DEFAULT 100,max_hp REAL DEFAULT 100,is_gm INTEGER DEFAULT 0,area TEXT DEFAULT 'forest',daily_monster_day INTEGER DEFAULT 0,daily_monster_kills INTEGER DEFAULT 0);INSERT INTO players(id,account_id,level,rank_tier) VALUES('one','account',65,18);CREATE TABLE dungeon_materials(player_id TEXT,kind TEXT,amount INTEGER,PRIMARY KEY(player_id,kind));CREATE TABLE war_kill_claims(id TEXT PRIMARY KEY,killer_id TEXT,victim_id TEXT,created_at_ms INTEGER);CREATE TABLE kernel511_admissions(id TEXT);CREATE TABLE game_presence(expires_at_ms INTEGER);CREATE TABLE giant_untouched_history(id INTEGER,body BLOB);INSERT INTO giant_untouched_history VALUES(1,zeroblob(1048576));")
   self.databases[rid]=descriptor(db);realm={'id':rid,'name':rid,'initialChannelCapacity':25 if rid=='r1' else 10,'dbIdentity':'test-'+rid,'database':str(db),'ports':{'app':3500+n}};realms.append(realm)
   self.configs[rid]=d/'config.json';self.configs[rid].write_bytes(encoded({'database':str(db),'realm':{'id':rid,'dbIdentity':realm['dbIdentity'],'manifestFile':str(self.home/'manifest.json')},'delivery511':{'releaseRoot':str(self.root)}}))
  self.manifest={'primaryRealmId':'r1','realms':realms,'authPort':3400,'accountsDatabase':str(self.home/'accounts.sqlite')};(self.home/'manifest.json').write_bytes(encoded(self.manifest));self.af=self.home/'accounts.json';self.af.write_bytes(encoded({'database':self.manifest['accountsDatabase']}))
  self.state={'installed':True,'releaseRoot':str(self.root),'candidate':old['core'],'prior':{'gameUnit':'coreoflife-r1.service','accountsUnit':'coreoflife-accounts.service','newGameConfigFile':str(self.configs['r1']),'newAccountsConfigFile':str(self.af),'databaseIdentity':{'dev':self.databases['r1']['device'],'ino':self.databases['r1']['inode']}},'r101':{'realm2Config':str(self.configs['r2']),'sharedCpAuthority':True,'journal':'historical-migration-audit'},'r102':{'version':'R102_CONTENT','journal':'historical-r102-migration-audit'},'r64Deployment':{'version':source,'accountsRoot':str(self.root)}};self.statefile.write_bytes(encoded(self.state))
  self.site=self.home/'site';self.site.mkdir();self.site.joinpath('index.html').write_bytes(b'unchanged marketing site');self.scope.enter_context(patch.object(m.site_delta,'SITE',self.site))
  self.live=SimpleNamespace(root=self.root,node=NODE,state=self.state,gf=self.configs['r1'],af=self.af,game=json.loads(self.configs['r1'].read_text()),accounts=json.loads(self.af.read_text()),manifest=self.manifest,configs=self.configs,databases=self.databases)
  for name,value in {'STATE':self.statefile,'CONTROL':self.control,'ACTIVE':self.control/'active.json','RELEASES':self.releases,'SYSTEMD':self.systemd}.items():self.scope.enter_context(patch.object(m,name,value))
  self.scope.enter_context(patch.object(m,'preflight',side_effect=self.preflight));self.scope.enter_context(patch.object(m,'guards',side_effect=lambda *a:None));self.scope.enter_context(patch.object(m,'stop_all',side_effect=lambda:None));self.scope.enter_context(patch.object(m,'start_all',side_effect=lambda *a:None));self.scope.enter_context(patch.object(m,'check_access',side_effect=lambda *a:None));self.scope.enter_context(patch.object(m,'central',side_effect=self.central));self.scope.enter_context(patch.object(m.readiness,'wait',side_effect=self.health));self.fail=False
 def preflight(self,live,z,plan,apply=False):
  m.validate_plan(plan);m.runtime_imports.validate(live.root,plan,z);plan['_siteChanges']=m.site_delta.changes(z,plan);plan['_resolvedIdentity']=m.source_identity.resolve(live,plan);return m.payload(live,z,plan)+m.asset_updates(live,z,plan)
 def central(self,live,rid,action='snapshot',snapshot=None):return {'revision':1,'phase':'maintenance','mode':'maintenance','enabled':True,'deadlineMs':0,'realm':{'id':rid,'status':'closed' if rid=='r2' else 'maintenance','registrationOpen':True}}
 def health(self,manifest,version='R109_LATENCY2',**kwargs):
  if self.fail and version=='R109_LATENCY2':
   with sqlite3.connect(self.databases['r1']['path']) as db:db.execute('UPDATE players SET gems=123456');db.commit()
   raise RuntimeError('injected health failure')
  return {r['id']:{'ok':True,'updateVersion':'R102_CONTENT','adminHotfix':'R102_ADMIN1','rankingHotfix':'R102_RANK1','entryHotfix':'R102_ENTRY1','championLabelHotfix':'R102_LABEL1','mobileHud':'R102_HUD_SLIM1','autoIpLimit':'R102_AUTO_IP1','realmLoad':'R102_LOAD1','additionsHotfix':'R102_COMPLETE3','skillVisuals':'R103_SKILLS1','browserCompatibility':'R103_ABORT1','autoSession':'R103_AUTO_SESSION1','mobileChat':'R103_CHAT_ANCHOR2','academyPrereg':'R104_AKADEMI4','readerBoot':'R104_BOOT1','connectionRecovery':'R105_TOWER2','performanceReview':'R105_PERF1','captchaWorker':'R106_CAPTCHA1' if version in ('R106_CAPTCHA1','R109_LATENCY2') else None,'populationStability':'R107_POPULATION1' if version=='R109_LATENCY2' else None,'latencyRepair':'R109_LATENCY2' if version=='R109_LATENCY2' else None,'realm':{'realmId':r['id'],'dbIdentity':r['dbIdentity']},'channelProcesses':{'channels':[{'channel':n,'ready':True,'capacity':r['initialChannelCapacity']} for n in range(1,5)]}} for r in manifest['realms']}
 def close(self):self.scope.close();self.z.close();self.tmp.cleanup()
class Installation(unittest.TestCase):
 def fixture(self,source='R105_PERF1'):f=Fixture(source);self.addCleanup(f.close);return f
 def result(self,f):return json.loads((next(f.control.glob('install-*'))/'result.json').read_text())
 def test_selected_r106_updates_only_reviewed_game_files_and_restores_exact_previous_source(self):
  f=self.fixture('R106_CAPTCHA1');before=m.identity.core_identity(f.root/f.core);worker=f.root/'native510-bb3a6cc689c6/vds-server/src/captcha-worker-r106.mjs';worker_before=worker.read_bytes()
  m.apply(f.live,f.z,f.plan);j=self.result(f);m.validate_record(j,completed=True)
  changed={r['path'] for r in j['files']}
  self.assertEqual(changed,{f.core+n for n in ('adventure-channel.mjs','native-http-bindings.mjs','process-stream.mjs','cold-world.mjs','read-worker.mjs','slim-reload.mjs','combat-checkpoint.mjs','coordinator.mjs','reward-worker-r533.mjs','statement-boot-pool-r61.mjs','reward-sql-r531.mjs','death-batch-channel-r57.mjs','death-batch-single-r57.mjs')}|{m.source_identity.OPS})
  self.assertEqual(worker.read_bytes(),worker_before)
  j['phase']='rollback-requested';m.persist(j);m.rollback(m.discover(),j)
  self.assertEqual(m.identity.core_identity(f.root/f.core),before);self.assertEqual(worker.read_bytes(),worker_before);self.assertEqual(json.loads(f.statefile.read_text()),f.state)
 def test_selected_r106_health_failure_restores_code_and_preserves_player_progress(self):
  f=self.fixture('R106_CAPTCHA1');f.fail=True
  with self.assertRaisesRegex(RuntimeError,'injected health'):m.apply(f.live,f.z,f.plan)
  self.assertFalse(m.ACTIVE.exists());self.assertEqual(m.identity.core_identity(f.root/f.core),f.state['candidate'])
  with sqlite3.connect(f.databases['r1']['path']) as db:self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],123456)
 def test_native_captcha_code_is_pinned_backed_up_and_restored_with_both_realms(self):
  f=self.fixture();name='native510-bb3a6cc689c6/vds-server/src/bot-check.mjs';before=(f.root/name).read_bytes()
  self.assertEqual(hashlib.sha256(before).hexdigest(),f.plan['files'][name]['before'][0]);m.apply(f.live,f.z,f.plan);j=self.result(f)
  self.assertEqual((f.root/name).read_bytes(),f.z.read('payload/'+name))
  row=next(row for row in j['files'] if row['path']==name);self.assertEqual((Path(j['directory'])/'code'/row['backup']).read_bytes(),before)
  j['phase']='rollback-requested';m.persist(j);m.rollback(m.discover(),j);self.assertEqual((f.root/name).read_bytes(),before)
 def test_modified_native_captcha_file_stops_before_maintenance(self):
  f=self.fixture();p=f.root/'native510-bb3a6cc689c6/vds-server/src/bot-check.mjs';p.write_text(p.read_text()+'\n// local change\n')
  with self.assertRaisesRegex(RuntimeError,'dosya farklı'):f.preflight(f.live,f.z,f.plan)
  m.stop_all.assert_not_called();self.assertFalse(m.ACTIVE.exists())
 def test_native_payload_never_follows_a_symlink_into_another_release(self):
  f=self.fixture();name='native510-bb3a6cc689c6/vds-server/src/bot-check.mjs';p=f.root/name;outside=f.home/'foreign.mjs';outside.write_bytes(p.read_bytes());before=outside.read_bytes();p.unlink();p.symlink_to(outside)
  with self.assertRaisesRegex(RuntimeError,'sembolik bağ|Paket yolu dışarı çıkıyor'):f.preflight(f.live,f.z,f.plan)
  self.assertEqual(outside.read_bytes(),before);m.stop_all.assert_not_called()
 def test_exact_package_updates_both_clients_and_only_backs_up_changed_code(self):
  f=self.fixture();before={rid:digest(row['path']) for rid,row in f.databases.items()};m.apply(f.live,f.z,f.plan);j=self.result(f);m.validate_record(j,completed=True)
  self.assertEqual((f.site/'index.html').read_bytes(),b'unchanged marketing site');self.assertIsNone(f.plan['site']);self.assertEqual(f.plan['clientNew'],[])
  self.assertFalse(m.ACTIVE.exists());self.assertEqual(j['databaseScope'],'none');self.assertEqual({rid:digest(row['path']) for rid,row in f.databases.items()},before)
  self.assertEqual(set(p.name for p in Path(j['directory']).iterdir()),{'result.json','code','retention.json'})
  self.assertTrue(all(r['before'] is not None for r in j['files'] if r['backup']))
  ns=f.plan['namespace'];old=f.plan['sources']['R105_PERF1']['namespace'];a=f.root/'http-runtime/dist-vds/client/assets';self.assertEqual((a/ns/'unchanged.webp').stat().st_ino,(a/old/'unchanged.webp').stat().st_ino)
  for floor in (4,7,10):
   relative='tower-r18/floor-'+str(floor)+'.webp';self.assertEqual((a/ns/relative).read_bytes(),(a/old/relative).read_bytes());self.assertEqual((a/ns/relative).stat().st_ino,(a/old/relative).stat().st_ino)
  accounts=f.root/'accounts-runtime/dist-vds/client/assets'/ns;self.assertEqual((accounts/f.plan['admin']).read_bytes(),(a/ns/f.plan['admin']).read_bytes())
  self.assertIn(f.plan['admin'],(f.root/'http-runtime/dist-vds/server/index.js').read_text());self.assertIn(f.plan['admin'],(f.root/'accounts-runtime/dist-vds/server/index.js').read_text())
  self.assertEqual(m.discover().databases,f.databases)
  for directory in (a/ns,accounts):
   for asset in directory.rglob('*.js'):self.assertNotIn('https://discord.gg/sCbQh9D8r',asset.read_text(),str(asset))
  self.assertFalse(any('/client/' in row['path'] for row in j['files']))
  self.assertTrue((f.root/'native510-bb3a6cc689c6/vds-server/src/captcha-worker-r106.mjs').is_file())
 def test_failure_restores_both_code_trees_but_keeps_player_progress_then_retry_retains_one(self):
  f=self.fixture();f.fail=True
  with self.assertRaisesRegex(RuntimeError,'injected health'):m.apply(f.live,f.z,f.plan)
  self.assertFalse(m.ACTIVE.exists());self.assertEqual(json.loads(f.statefile.read_text()),f.state);self.assertEqual(m.identity.core_identity(f.root/f.core),f.state['candidate'])
  with sqlite3.connect(f.databases['r1']['path']) as db:self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],123456)
  self.assertEqual((f.site/'index.html').read_bytes(),b'unchanged marketing site')
  f.fail=False;m.apply(f.live,f.z,f.plan);self.assertEqual(len(list(f.control.glob('install-*'))),1)
 def test_partial_code_write_restores_all_changes(self):
  f=self.fixture();original=m.inplace._replace;writes=0
  def fail(root,stage,row,data,restore=False):
   nonlocal writes
   original(root,stage,row,data,restore=restore)
   if not restore:
    writes+=1
    if writes==5:raise RuntimeError('injected partial write')
  with patch.object(m.inplace,'_replace',side_effect=fail):
   with self.assertRaisesRegex(RuntimeError,'partial write'):m.apply(f.live,f.z,f.plan)
  self.assertFalse(m.ACTIVE.exists());self.assertEqual(m.identity.core_identity(f.root/f.core),f.state['candidate'])
 def test_power_loss_during_backup_requires_no_complete_backup_to_recover(self):
  f=self.fixture()
  with patch.object(m.inplace,'store_backups',side_effect=RuntimeError('power loss in backup')),patch.object(m,'recover',side_effect=SystemExit('power cut')):
   with self.assertRaises(SystemExit):m.apply(f.live,f.z,f.plan)
  j=json.loads(m.ACTIVE.read_text());self.assertEqual(j['phase'],'described');m.recover(f.live,j);self.assertFalse(m.ACTIVE.exists());self.assertEqual(json.loads(f.statefile.read_text()),f.state)
 def test_independent_rollback_keeps_new_player_progress_and_foreign_repair_records(self):
  f=self.fixture();foreign=f.home/'r102-realtime-repair';foreign.mkdir();(foreign/'record.json').write_text('keep');m.apply(f.live,f.z,f.plan);j=self.result(f)
  with sqlite3.connect(f.databases['r1']['path']) as db:db.execute('UPDATE players SET gems=456789');db.commit()
  j['phase']='rollback-requested';m.persist(j);m.rollback(m.discover(),j)
  with sqlite3.connect(f.databases['r1']['path']) as db:self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],456789)
  self.assertEqual(m.identity.core_identity(f.root/f.core),f.state['candidate']);self.assertEqual(json.loads(f.statefile.read_text()),f.state);self.assertEqual((foreign/'record.json').read_text(),'keep')
  self.assertEqual((f.site/'index.html').read_bytes(),b'unchanged marketing site')
 def test_independent_site_edits_are_preserved(self):
  f=self.fixture();changed=b'independent new site';(f.site/'index.html').write_bytes(changed)
  m.apply(f.live,f.z,f.plan);self.assertEqual((f.site/'index.html').read_bytes(),changed)
 def test_missing_installed_client_asset_is_rejected_before_service_stop(self):
  f=self.fixture();p=f.root/'http-runtime/dist-vds/client/assets'/f.plan['namespace']/f.plan['game'];p.unlink()
  with self.assertRaisesRegex(RuntimeError,'manifestle'):m.apply(f.live,f.z,f.plan)
  m.stop_all.assert_not_called();self.assertFalse(m.ACTIVE.exists())
 def test_new_worker_files_are_removed_on_rollback(self):
  f=self.fixture();name='native510-bb3a6cc689c6/vds-server/src/captcha-worker-r106.mjs';self.assertFalse((f.root/name).exists());m.apply(f.live,f.z,f.plan)
  j=self.result(f);self.assertTrue((f.root/name).is_file());j['phase']='rollback-requested';m.persist(j);m.rollback(m.discover(),j);self.assertFalse((f.root/name).exists())
 def test_worker_dependency_must_match_installed_manifest_before_service_stop(self):
  f=self.fixture();p=f.root/'native510-bb3a6cc689c6/vds-server/src/captcha-image.mjs';p.write_bytes(p.read_bytes()+b'\n// changed dependency\n')
  with self.assertRaisesRegex(RuntimeError,'modül manifestle'):m.apply(f.live,f.z,f.plan)
  m.stop_all.assert_not_called();self.assertFalse(m.ACTIVE.exists())
 def test_corrupted_current_backup_prevents_retiring_previous(self):
  f=self.fixture();m.apply(f.live,f.z,f.plan);j=self.result(f);one=next(r for r in j['files'] if r['backup']);(Path(j['directory'])/'code'/one['backup']).write_bytes(b'corrupted')
  with self.assertRaisesRegex(RuntimeError,'yedeği'):m.prune(j,f.health(f.manifest))
 def test_unready_or_different_realm_patch_blocks_cleanup(self):
  f=self.fixture();m.apply(f.live,f.z,f.plan);j=self.result(f)
  for change in (lambda h:h['r2'].update(latencyRepair='old'),lambda h:h['r2'].update(populationStability='old'),lambda h:h['r2'].update(captchaWorker='old'),lambda h:h['r2'].update(connectionRecovery='old'),lambda h:h['r2'].update(autoIpLimit='old'),lambda h:h['r2'].update(skillVisuals='old'),lambda h:h['r2'].update(browserCompatibility='old'),lambda h:h['r2'].update(autoSession='old'),lambda h:h['r2'].update(mobileChat='old'),lambda h:h['r2']['channelProcesses']['channels'][0].update(ready=False),lambda h:h.pop('r2')):
   health=f.health(f.manifest);change(health)
   with self.assertRaisesRegex(RuntimeError,'doğrulanmadan'):m.prune(j,health)
 def test_readiness_requires_both_fixes_and_accepts_exact_previous_version_for_rollback(self):
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
  for field in ('autoSession','mobileChat','academyPrereg','readerBoot','connectionRecovery','performanceReview','captchaWorker','populationStability','latencyRepair'):
   health=f.health(manifest);health['r2'][field]='old'
   self.assertTrue(m.readiness.probe(manifest,request=request)[1])
  health=f.health(manifest,'R105_PERF1')
  self.assertEqual(m.readiness.probe(manifest,'R105_PERF1',request=request)[1],[])
  self.assertEqual(len(m.readiness.probe(manifest,request=request)[1]),2)
  health=f.health(manifest,'R106_CAPTCHA1')
  self.assertEqual(m.readiness.probe(manifest,'R106_CAPTCHA1',request=request)[1],[])
  self.assertEqual(len(m.readiness.probe(manifest,request=request)[1]),2)
 def test_unselected_readiness_release_is_not_accepted_as_a_source(self):
  f=self.fixture();f.live.state['r64Deployment']['version']='R106_READY1'
  with self.assertRaisesRegex(RuntimeError,'R105_PERF1 veya R106_CAPTCHA1'):f.preflight(f.live,f.z,f.plan)
  m.stop_all.assert_not_called()
 def test_prior_admin_code_record_can_retire_after_new_rollback_backup_is_valid(self):
  f=self.fixture();f.fail=True
  with self.assertRaisesRegex(RuntimeError,'injected health'):m.apply(f.live,f.z,f.plan)
  prior=next(f.control.glob('install-*'));old=json.loads((prior/'result.json').read_text());old['version']='R105_PERF1';(prior/'result.json').write_bytes(encoded(old))
  f.fail=False;m.apply(f.live,f.z,f.plan);self.assertFalse(prior.exists());self.assertEqual(len(list(f.control.glob('install-*'))),1);m.validate_record(self.result(f),completed=True)
 def test_unknown_files_are_preserved_by_retention(self):
  f=self.fixture();f.fail=True
  with self.assertRaisesRegex(RuntimeError,'injected health'):m.apply(f.live,f.z,f.plan)
  old=next(f.control.glob('install-*'));(old/'foreign.sqlite').write_text('unknown');f.fail=False;m.apply(f.live,f.z,f.plan)
  self.assertEqual((old/'foreign.sqlite').read_text(),'unknown')
 def test_interrupted_retirement_resumes_without_removing_new_record(self):
  f=self.fixture();f.fail=True
  with self.assertRaisesRegex(RuntimeError,'injected health'):m.apply(f.live,f.z,f.plan)
  f.fail=False;original=Path.unlink;removed=0
  def cut(p,*a,**kw):
   nonlocal removed
   if any(x.startswith('.retired-') for x in p.parts):
    removed+=1
    if removed==2:raise SystemExit('power cut during retirement')
   return original(p,*a,**kw)
  with patch.object(Path,'unlink',cut):
   with self.assertRaises(SystemExit):m.apply(f.live,f.z,f.plan)
  self.assertTrue((f.control/'prune-intent.json').exists());self.assertFalse(m.ACTIVE.exists());j=self.result(f);m.prune(j,f.health(f.manifest));self.assertFalse((f.control/'prune-intent.json').exists());self.assertEqual(len(list(f.control.glob('install-*'))),1);m.validate_record(j,completed=True)
 def test_optional_historical_source_keeps_identity(self):
  f=self.fixture();extra=f.root/f.core/m.source_identity.EXTRA;extra.parent.mkdir(exist_ok=True);extra.write_text('/* historical diagnostic source */\n');candidate=m.identity.core_identity(f.root/f.core);ops=f.root/m.source_identity.OPS;atomic(ops,m.source_identity.CANDIDATE.sub("export const CANDIDATE='"+candidate+"';",ops.read_text()).encode(),0o644)
  manifest=json.loads((f.root/'release-manifest.json').read_text());manifest['runtimeSha256']=candidate;manifest['files']=[r for r in manifest['files'] if r['path']!=m.source_identity.OPS]
  for p in (ops,extra):manifest['files'].append({'path':p.relative_to(f.root).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)})
  (f.root/'release-manifest.json').write_bytes(encoded(manifest));f.state['candidate']=candidate;f.statefile.write_bytes(encoded(f.state));m.apply(f.live,f.z,f.plan);m.validate_record(self.result(f),completed=True)
 def test_code_contract_binds_every_reviewed_byte(self):
  f=self.fixture();m.validate_plan(f.plan)
  for key,value in [('databaseChanges',True),('databaseSchemaChanges',True),('databaseScope','all')]:
   p=json.loads(json.dumps(f.plan));p[key]=value
   with self.assertRaises(RuntimeError):m.validate_plan(p)
  next(iter(f.plan['files'].values()))['after']='0'*64
  with self.assertRaisesRegex(RuntimeError,'İncelenmiş'):m.validate_plan(f.plan)
 def test_obsolete_game_reference_fails_before_any_service_stop(self):
  f=self.fixture();f.plan['_resolvedIdentity']=m.source_identity.resolve(f.live,f.plan)
  updates=[(n,h,b if b is not None else (f.root/h['linkSource']).read_bytes()) for n,h,b in m.asset_graph.existing(f.live,f.plan)]
  broken=[]
  for name,meta,data in updates:
   if name.endswith('/'+f.plan['portal']):data=data.replace(f.plan['game'].encode(),b'game-client-core511-r102-b896c05b93a63114.js')
   broken.append((name,meta,data))
  with self.assertRaisesRegex(RuntimeError,'güncel oyun sürümüne'):m.asset_graph.validate(f.live,f.plan,broken)
  m.stop_all.assert_not_called();self.assertFalse(m.ACTIVE.exists())
 def test_missing_lazy_dependency_blocks_release(self):
  f=self.fixture();f.plan['_resolvedIdentity']=m.source_identity.resolve(f.live,f.plan)
  updates=[(n,h,b if b is not None else (f.root/h['linkSource']).read_bytes()) for n,h,b in m.asset_graph.existing(f.live,f.plan)]
  broken=[(n,h,b) for n,h,b in updates if not n.endswith('/'+json.loads((ROOT.parent/'r105_performance_review/evidence/client-build.json').read_text())['bridge'])]
  with self.assertRaisesRegex(RuntimeError,'dosyası eksik'):m.asset_graph.validate(f.live,f.plan,broken)
  m.stop_all.assert_not_called()
 def test_unversioned_preload_reference_blocks_release(self):
  f=self.fixture();f.plan['_resolvedIdentity']=m.source_identity.resolve(f.live,f.plan)
  updates=[(n,h,b if b is not None else (f.root/h['linkSource']).read_bytes()) for n,h,b in m.asset_graph.existing(f.live,f.plan)]
  broken=[]
  for name,meta,data in updates:
   if name.endswith('/'+f.plan['portal']):data=data.replace(('assets/'+f.plan['namespace']+'/').encode(),b'assets/')
   broken.append((name,meta,data))
  with self.assertRaisesRegex(RuntimeError,'sürümü dışında'):m.asset_graph.validate(f.live,f.plan,broken)
if __name__=='__main__':unittest.main()
