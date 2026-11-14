"""R117 on installed R116: exact server code, progress-safe rollback and source checks.
Systemd and HTTP health are adapters (as in the R109 tests). Systemd/Caddy transport are adapters; no game SQL writes occur."""
import contextlib,hashlib,json,os,shutil,sqlite3,sys,tempfile,unittest,zipfile
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
CORE='core511-source/scripts/core511/'
CHANGED=set(json.loads((ROOT/'build/reviewed-files.json').read_text()))
OPTIONS=CORE+'tower-config.mjs'
def marks(version):
 return {'ok':True,'updateVersion':'R102_CONTENT','adminHotfix':'R102_ADMIN1','rankingHotfix':'R102_RANK1','entryHotfix':'R102_ENTRY1','championLabelHotfix':'R102_LABEL1','mobileHud':'R102_HUD_SLIM1','autoIpLimit':'R102_AUTO_IP1','realmLoad':'R102_LOAD1','additionsHotfix':'R102_COMPLETE3','skillVisuals':'R103_SKILLS1','browserCompatibility':'R103_ABORT1','autoSession':'R103_AUTO_SESSION1','mobileChat':'R103_CHAT_ANCHOR2','academyPrereg':'R104_AKADEMI4','readerBoot':'R104_BOOT1','connectionRecovery':'R105_TOWER2','performanceReview':'R105_PERF1','captchaWorker':'R106_CAPTCHA1','populationStability':'R107_POPULATION1','latencyRepair':'R109_LATENCY2','realtimeHandoff':'R110_HANDOFF1','combatContinuity':'R111_COMBAT1' if version in ('R111_COMBAT1','R112_FLOW1','R113_ENGINE1','R114_RUNE_FORUM1','R115_SHARED_SCOPE1','R116_ADMISSION_TRANSFER1','R117_HOOK10') else None,'runtimeFlow':'R112_FLOW1','engineRework':'R113_ENGINE1','engineReadyR113':True,'runeForum':'R114_RUNE_FORUM1','sharedScope':'R115_SHARED_SCOPE1' if version in ('R115_SHARED_SCOPE1','R116_ADMISSION_TRANSFER1','R117_HOOK10') else None,'admissionTransfer':'R116_ADMISSION_TRANSFER1' if version in ('R116_ADMISSION_TRANSFER1','R117_HOOK10') else None,'hookRate':version if version=='R117_HOOK10' else None,'azrailHookChance':10 if version=='R117_HOOK10' else 6,'kernel511':{'readerReady':True}}

def restore_client_assets(root):
 """Rebuild the source R116 asset graph without relying on expired /tmp stages."""
 baseline=PROJECT/'r105_performance_review/evidence/final-browser-assets/assets'
 http=root/'http-runtime/dist-vds/client';accounts=root/'accounts-runtime/dist-vds/client'
 shutil.copytree(baseline,http/'assets',dirs_exist_ok=True)
 shutil.copytree(http,accounts,copy_function=os.link)
 for archive in (R113,R114):
  with zipfile.ZipFile(archive) as z:
   plan=json.loads(z.read('plan.json'));plan['_resolvedIdentity']={'version':next(iter(plan['sources']))}
   rows=[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)} for p in http.rglob('*') if p.is_file() and not p.is_symlink()]
   (root/'release-manifest.json').write_bytes(encoded({'files':rows}))
   for name,meta,data in m.asset_updates(SimpleNamespace(root=root),z,plan):
    if data is None:data=(root/meta['linkSource']).read_bytes()
    assert len(data)==meta['bytes'] and hashlib.sha256(data).hexdigest()==meta['after']
    atomic(root/name,data,0o644)

class Fixture:
 """Installed R116: exact immutable release chain through the final R116 artifact."""
 def __init__(self,source='R116_ADMISSION_TRANSFER1'):
  self.tmp=tempfile.TemporaryDirectory(prefix='r117-install-test-');self.home=Path(self.tmp.name);self.releases=self.home/'releases';self.releases.mkdir();self.root=self.releases/'r101';shutil.copytree(BASE,self.root,copy_function=shutil.copy2,symlinks=True)
  native=self.root/'native510-bb3a6cc689c6';assert native.is_dir() and not native.is_symlink()
  modules=native/'node_modules'
  if modules.is_symlink():modules.unlink()
  modules.symlink_to(PROJECT.parent/'node_modules',target_is_directory=True)
  chain=[(R109,'1ba96d415891f8d474188edb64331b87b7bc12fdfb54733f49918a906e6ef068'),(R110,'4fd1fbb8a36de2ae89fb693f5617ac3a8e697f2608f4a6b14464b6703a83bcc0'),(R113,'4399dfe08550ebf04bd4c8ea7fbab8cedcdb804fd851495dd17847a0eabbcbc3'),(R114,'68dad6638a1b6911d0d499d2b3042e6d99dc1f51862567e6325654304bbcf2cf'),(R115,'791858ebddc240c5330e663b569982305fb5acb0c8645adde77e86ed1a6603ea'),(R116,'f8399793db7d40af7f873b4a892759c7c71c19f70bb4c45995b00b68d3071ac9')]
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
  restore_client_assets(self.root);old=self.plan['sources']['R116_ADMISSION_TRANSFER1']
  for runtime in ('http-runtime','accounts-runtime'):
   assets=self.root/runtime/'dist-vds/client/assets'/old['namespace']
   (assets/'unchanged.webp').write_bytes(b'unchanged art');(assets/'entry.js').write_text("import './"+old['game']+"';\n")
  rows=[]
  for tree in ('core511-source','http-runtime','accounts-runtime','native510-bb3a6cc689c6'):
   for p in (self.root/tree).rglob('*'):
    if p.is_file() and not p.is_symlink():rows.append({'path':p.relative_to(self.root).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)})
  (self.root/'release-manifest.json').write_bytes(encoded({'baselineSha256':self.plan['nativeBaseline'],'runtimeSha256':r109core,'files':rows,'r102AdminFix':'R116_ADMISSION_TRANSFER1'}))
  self.databases={};realms=[];self.configs={}
  for n,rid in enumerate(('r1','r2')):
   d=self.home/rid;d.mkdir();db=d/'game.sqlite'
   with sqlite3.connect(db) as c:c.executescript("CREATE TABLE players(id TEXT PRIMARY KEY,account_id TEXT,level INTEGER,gems INTEGER DEFAULT 100);INSERT INTO players(id,account_id,level) VALUES('one','account',65);CREATE TABLE kernel511_admissions(id TEXT);CREATE TABLE kernel511_actor_revision_r113(actor TEXT PRIMARY KEY,revision INTEGER NOT NULL);INSERT INTO kernel511_actor_revision_r113 VALUES('one',77);")
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
 def health(self,manifest,version='R117_HOOK10',**kwargs):
  self.versions.append(version)
  if self.fail and version=='R117_HOOK10':
   with sqlite3.connect(self.databases['r1']['path']) as db:db.execute('UPDATE players SET gems=123456');db.commit()
   raise RuntimeError('injected health failure')
  return {r['id']:{**marks(version),'realm':{'realmId':r['id'],'dbIdentity':r['dbIdentity']},'channelProcesses':{'channels':[{'channel':n,'ready':True,'capacity':r['initialChannelCapacity']} for n in range(1,5)]}} for r in manifest['realms']}
 def close(self):self.scope.close();self.z.close();self.tmp.cleanup()

class Installation(unittest.TestCase):
 def fixture(self):
  f=Fixture();self.addCleanup(f.close);return f
 def result(self,f):return json.loads((max(f.control.glob('install-*'),key=lambda p:p.stat().st_mtime)/'result.json').read_text())
 def test_exact_r116_source_and_reviewed_code_files_only(self):
  f=self.fixture();self.assertEqual(set(f.plan['sources']),{'R116_ADMISSION_TRANSFER1'});self.assertEqual(set(f.plan['files']),CHANGED)
  self.assertIn(OPTIONS,CHANGED);self.assertEqual(len(CHANGED),9);self.assertFalse(f.plan['databaseChanges']);self.assertFalse(f.plan['databaseSchemaChanges']);self.assertEqual(f.plan['databaseScope'],'none')
  self.assertEqual(len(f.plan['clientNew']),5);self.assertIsNone(f.plan['site']);self.assertNotIn('forum',f.plan)
  self.assertNotEqual(f.plan['namespace'],f.plan['sources']['R116_ADMISSION_TRANSFER1']['namespace'])
  m.validate_plan(f.plan);f.preflight(f.live,f.z,f.plan)
  changed=json.loads(json.dumps(f.plan));changed['files'][OPTIONS]['bytes']+=1
  with self.assertRaises(RuntimeError):m.validate_plan(changed)
 def test_apply_and_rollback_preserve_progress_old_client_site_and_forum(self):
  f=self.fixture();before=m.identity.core_identity(f.root/f.core);oldassets={p.relative_to(f.root).as_posix():digest(p) for runtime in ['http-runtime','accounts-runtime'] for p in (f.root/runtime/'dist-vds/client/assets'/f.plan['sources']['R116_ADMISSION_TRANSFER1']['namespace']).rglob('*') if p.is_file()}
  dbs={rid:digest(d['path']) for rid,d in f.databases.items()};site=digest(f.site/'index.html');forum=digest(f.forum)
  added=[name for name,row in f.plan['files'].items() if row['before']==[None]];self.assertTrue(added);self.assertTrue(all(not(f.root/name).exists() for name in added))
  m.apply(f.live,f.z,f.plan);j=self.result(f);m.validate_record(j,completed=True)
  self.assertTrue(all((f.root/name).is_file() for name in added));self.assertEqual(f.policies,f.initialPolicies)
  for runtime in ('http-runtime','accounts-runtime'):
   for name in f.plan['clientNew']:self.assertTrue((f.root/runtime/'dist-vds/client/assets'/f.plan['namespace']/name).is_file())
  self.assertTrue((Path(j['directory'])/'retention.json').is_file(),'successful two-realm checks must complete code retention')
  self.assertEqual(m.identity.core_identity(f.root/f.core),f.plan['targetCore']);self.assertEqual(json.loads(f.statefile.read_text())['r64Deployment']['version'],'R117_HOOK10')
  self.assertEqual({rid:digest(d['path']) for rid,d in f.databases.items()},dbs)
  self.assertEqual({name:digest(f.root/name) for name in oldassets},oldassets)
  for d in f.databases.values():
   with sqlite3.connect(d['path']) as db:db.execute('UPDATE players SET gems=87654');db.commit()
  j['phase']='rollback-requested';m.persist(j);m.rollback(f.live,j)
  self.assertTrue(all(not(f.root/name).exists() for name,row in f.plan['files'].items() if row['before']==[None]));self.assertEqual(f.policies,f.initialPolicies);self.assertEqual(m.identity.core_identity(f.root/f.core),before);self.assertEqual(json.loads(f.statefile.read_text())['r64Deployment']['version'],'R116_ADMISSION_TRANSFER1')
  for d in f.databases.values():
   with sqlite3.connect(d['path']) as db:self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],87654)
  self.assertEqual(digest(f.site/'index.html'),site);self.assertEqual(digest(f.forum),forum)
  for runtime in ('http-runtime','accounts-runtime'):self.assertFalse((f.root/runtime/'dist-vds/client/assets'/f.plan['namespace']).exists())
  self.assertEqual({name:digest(f.root/name) for name in oldassets},oldassets)
  self.assertFalse(m.ACTIVE.exists());self.assertIn('R116_ADMISSION_TRANSFER1',f.versions)
 def test_failed_health_returns_to_exact_r116_without_reverting_progress(self):
  f=self.fixture();f.fail=True
  with self.assertRaisesRegex(RuntimeError,'injected health failure'):m.apply(f.live,f.z,f.plan)
  self.assertEqual(json.loads(f.statefile.read_text())['r64Deployment']['version'],'R116_ADMISSION_TRANSFER1');self.assertFalse(m.ACTIVE.exists());self.assertTrue(all(not(f.root/name).exists() for name,row in f.plan['files'].items() if row['before']==[None]));self.assertEqual(f.policies,f.initialPolicies)
  self.assertEqual(m.identity.core_identity(f.root/f.core),f.plan['sources']['R116_ADMISSION_TRANSFER1']['core'])
  with sqlite3.connect(f.databases['r1']['path']) as db:self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],123456)
 def test_modified_source_or_wrong_version_stops_before_writes(self):
  f=self.fixture();f.live.state['r64Deployment']['version']='R113_ENGINE1'
  with self.assertRaisesRegex(RuntimeError,'R116'):f.preflight(f.live,f.z,f.plan)
  f.live.state['r64Deployment']['version']='R116_ADMISSION_TRANSFER1';p=f.root/OPTIONS;p.write_text(p.read_text()+'\n// altered\n')
  with self.assertRaisesRegex(RuntimeError,'çekirdek'):f.preflight(f.live,f.z,f.plan)
  self.assertFalse(m.ACTIVE.exists())
 def test_failure_after_code_write_recovers_both_realms(self):
  f=self.fixture();original=m.inplace.apply
  def crash(*args):original(*args);raise RuntimeError('injected interruption after code')
  with patch.object(m.inplace,'apply',side_effect=crash):
   with self.assertRaisesRegex(RuntimeError,'injected interruption'):m.apply(f.live,f.z,f.plan)
  self.assertEqual(m.identity.core_identity(f.root/f.core),f.plan['sources']['R116_ADMISSION_TRANSFER1']['core']);self.assertFalse(m.ACTIVE.exists());self.assertTrue(all(not(f.root/name).exists() for name,row in f.plan['files'].items() if row['before']==[None]));self.assertEqual(f.policies,f.initialPolicies)
 def test_readiness_requires_new_marker_in_both_realms_and_all_channels(self):
  f=self.fixture();manifest=json.loads(json.dumps(f.manifest))
  for i,r in enumerate(manifest['realms']):r['ports']['realtime']=3600+i
  health=f.health(manifest);ports={r['ports']['app']:r for r in manifest['realms']};rt={r['ports']['realtime']:r for r in manifest['realms']}
  def request(port,path):
   if port==manifest['authPort']:return {'authenticated':False}
   if port in rt:
    r=rt[port];return {'ok':True,'protocol':'col-realtime-1','transportRepairVersion':'R102_REALTIME1','realmId':r['id'],'dbIdentity':r['dbIdentity']}
   r=ports[port];return health[r['id']] if path=='/api/vds-health' else {'realm':{'id':r['id']}}
  self.assertEqual(m.readiness.probe(manifest,request=request)[1],[])
  del health['r2']['hookRate'];self.assertTrue(m.readiness.probe(manifest,request=request)[1]);health['r2']['hookRate']='R117_HOOK10'
  health['r1']['azrailHookChance']=6;self.assertTrue(m.readiness.probe(manifest,request=request)[1]);health['r1']['azrailHookChance']=10
  del health['r1']['sharedScope'];self.assertTrue(m.readiness.probe(manifest,request=request)[1]);health['r1']['sharedScope']='R115_SHARED_SCOPE1'
  health['r1']['channelProcesses']['channels'][0]['ready']=False;self.assertTrue(m.readiness.probe(manifest,request=request)[1])
 def test_atomic_writer_honors_strict_root_umask(self):
  f=self.fixture();before={name:(f.root/name).stat().st_mode & 0o777 for name in CHANGED if (f.root/name).exists()};prior=os.umask(0o077)
  try:m.apply(f.live,f.z,f.plan)
  finally:os.umask(prior)
  # Existing source permissions are preserved; new modules receive explicit 0644.
  for name in CHANGED:self.assertEqual((f.root/name).stat().st_mode & 0o777,before.get(name,0o644),name)
  for runtime in ('http-runtime','accounts-runtime'):
   for name in f.plan['clientNew']:self.assertEqual((f.root/runtime/'dist-vds/client/assets'/f.plan['namespace']/name).stat().st_mode & 0o777,0o644)

 def test_foreign_pending_recovery_stops_before_any_side_effect(self):
  f=self.fixture()
  with patch.object(m,'guards') as guards,patch.object(m,'start_all') as start,patch.object(m,'restore_gates') as restore:
   with self.assertRaisesRegex(RuntimeError,'aynı paketiyle'):m.recover(f.live,{'version':'R116_ADMISSION_TRANSFER1','phase':'prepared','files':[]})
   guards.assert_not_called();start.assert_not_called();restore.assert_not_called()
  self.assertEqual(f.centralCalls,[]);self.assertFalse(m.ACTIVE.exists())

 def test_unexpected_new_asset_or_changed_retained_source_stops_before_writes(self):
  f=self.fixture();name=next(n for n,row in f.plan['files'].items() if row['before']==[None]);added=f.root/name;added.write_text('// unexpected existing file\n')
  with self.assertRaisesRegex(RuntimeError,'çekirdek'):f.preflight(f.live,f.z,f.plan)
  added.unlink();retained=f.plan['sources']['R116_ADMISSION_TRANSFER1']['retainedFiles'][0];p=f.root/retained['path'];p.write_bytes(p.read_bytes()+b'\n')
  with self.assertRaisesRegex(RuntimeError,'korunacak dosya farklı'):f.preflight(f.live,f.z,f.plan)
  self.assertFalse(m.ACTIVE.exists());self.assertEqual(f.centralCalls,[])

 def test_corrupt_payload_is_rejected_before_writes(self):
  f=self.fixture();original=f.z.read
  def corrupted(name,*args,**kwargs):
   data=original(name,*args,**kwargs)
   return data+b'\n' if name=='payload/'+OPTIONS else data
  with patch.object(f.z,'read',side_effect=corrupted):
   with self.assertRaisesRegex(RuntimeError,'Paket verisi bozuk'):f.preflight(f.live,f.z,f.plan)
  self.assertFalse(m.ACTIVE.exists());self.assertEqual(f.centralCalls,[])

 def test_prune_requires_both_realms_and_preserves_unknown_archives(self):
  f=self.fixture();m.apply(f.live,f.z,f.plan);j=self.result(f)
  unknown=f.control/'install-unknown-history';unknown.mkdir();sentinel=unknown/'keep';sentinel.write_bytes(b'unknown recovery record')
  health=f.health(f.manifest);del health['r2']['hookRate']
  with patch.object(m,'resume_prune') as resume:
   with self.assertRaisesRegex(RuntimeError,'sekiz kanal'):m.prune(j,health)
   resume.assert_not_called()
  m.prune(j,f.health(f.manifest));self.assertEqual(sentinel.read_bytes(),b'unknown recovery record')

if __name__=='__main__':unittest.main()
