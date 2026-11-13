"""R114 on installed R113: real code/site/forum files and journal recovery.
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
CORE='core511-source/scripts/core511/'
CHANGED=set(json.loads((ROOT/'build/reviewed-files.json').read_text()))
OPTIONS=CORE+'engine-health-r113.mjs'
def marks(version):
 return {'ok':True,'updateVersion':'R102_CONTENT','adminHotfix':'R102_ADMIN1','rankingHotfix':'R102_RANK1','entryHotfix':'R102_ENTRY1','championLabelHotfix':'R102_LABEL1','mobileHud':'R102_HUD_SLIM1','autoIpLimit':'R102_AUTO_IP1','realmLoad':'R102_LOAD1','additionsHotfix':'R102_COMPLETE3','skillVisuals':'R103_SKILLS1','browserCompatibility':'R103_ABORT1','autoSession':'R103_AUTO_SESSION1','mobileChat':'R103_CHAT_ANCHOR2','academyPrereg':'R104_AKADEMI4','readerBoot':'R104_BOOT1','connectionRecovery':'R105_TOWER2','performanceReview':'R105_PERF1','captchaWorker':'R106_CAPTCHA1','populationStability':'R107_POPULATION1','latencyRepair':'R109_LATENCY2','realtimeHandoff':'R110_HANDOFF1','combatContinuity':'R111_COMBAT1' if version in ('R111_COMBAT1','R112_FLOW1','R113_ENGINE1','R114_RUNE_FORUM1') else None,'runtimeFlow':'R112_FLOW1','engineRework':'R113_ENGINE1','engineReadyR113':True,'runeForum':version if version=='R114_RUNE_FORUM1' else None,'kernel511':{'readerReady':True}}
class Fixture:
 """An installed R110_HANDOFF1: R105 files plus the exact R109 and R110 ZIP payloads."""
 def __init__(self,source='R113_ENGINE1'):
  self.tmp=tempfile.TemporaryDirectory(prefix='r114-install-test-');self.home=Path(self.tmp.name);self.releases=self.home/'releases';self.releases.mkdir();self.root=self.releases/'r101';shutil.copytree(BASE,self.root,copy_function=shutil.copy2,symlinks=True)
  native=self.root/'native510-bb3a6cc689c6';assert native.is_dir() and not native.is_symlink()
  modules=native/'node_modules'
  if modules.is_symlink():modules.unlink()
  modules.symlink_to(PROJECT.parent/'node_modules',target_is_directory=True)
  with zipfile.ZipFile(R109) as prior:
   previous=json.loads(prior.read('plan.json'))
   for name,meta in previous['files'].items():
    data=prior.read('payload/'+name);assert hashlib.sha256(data).hexdigest()==meta['after'];atomic(self.root/name,data,0o644)
  with zipfile.ZipFile(R110) as prior:
   previous=json.loads(prior.read('plan.json'))
   for name,meta in previous['files'].items():
    data=prior.read('payload/'+name);assert hashlib.sha256(data).hexdigest()==meta['after'];atomic(self.root/name,data,0o644)
  if source=='R113_ENGINE1':
   with zipfile.ZipFile(R113) as prior:
    previous=json.loads(prior.read('plan.json'))
    for name,meta in previous['files'].items():
     data=prior.read('payload/'+name);assert hashlib.sha256(data).hexdigest()==meta['after'];atomic(self.root/name,data,0o644)
  self.control=self.home/'r102';self.statefile=self.home/'state.json';self.systemd=self.home/'systemd';self.scope=contextlib.ExitStack();record=json.loads((ROOT/'evidence/package.json').read_text());archive=ROOT/record['file'];assert hashlib.sha256(archive.read_bytes()).hexdigest()==record['sha256'],'package record';self.z=zipfile.ZipFile(archive);self.plan=json.loads(self.z.read('plan.json'))
  self.root.joinpath('bin').mkdir(exist_ok=True);self.node=NODE
  self.core=m.source_identity.CORE;ops=self.root/m.source_identity.OPS;r109core=previous['targetCore'];assert m.identity.core_identity(self.root/self.core)==r109core
  atomic(ops,m.source_identity.CANDIDATE.sub("export const CANDIDATE='"+r109core+"';",ops.read_text()).encode(),0o644)
  old=self.plan['sources']['R113_ENGINE1'];assets=self.root/'http-runtime/dist-vds/client/assets'/old['namespace'];assets.mkdir(parents=True)
  stage=json.loads((PROJECT/'r113_engine/evidence/runtime-stage.json').read_text());assert stage['targetCore']==self.plan['sources']['R113_ENGINE1']['core'];shutil.copytree(Path(stage['release'])/'http-runtime/dist-vds/client/assets'/old['namespace'],assets,dirs_exist_ok=True)
  (assets/'unchanged.webp').write_bytes(b'unchanged art');(assets/'entry.js').write_text("import './"+old['game']+"';\n")
  accounts=self.root/'accounts-runtime/dist-vds/client';shutil.copytree(self.root/'http-runtime/dist-vds/client',accounts,copy_function=os.link)
  rows=[]
  for tree in ('core511-source','http-runtime','accounts-runtime','native510-bb3a6cc689c6'):
   for p in (self.root/tree).rglob('*'):
    if p.is_file() and not p.is_symlink():rows.append({'path':p.relative_to(self.root).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)})
  (self.root/'release-manifest.json').write_bytes(encoded({'baselineSha256':self.plan['nativeBaseline'],'runtimeSha256':r109core,'files':rows,'r102AdminFix':'R113_ENGINE1'}))
  self.databases={};realms=[];self.configs={}
  for n,rid in enumerate(('r1','r2')):
   d=self.home/rid;d.mkdir();db=d/'game.sqlite'
   with sqlite3.connect(db) as c:c.executescript("CREATE TABLE players(id TEXT PRIMARY KEY,account_id TEXT,level INTEGER,gems INTEGER DEFAULT 100);INSERT INTO players(id,account_id,level) VALUES('one','account',65);CREATE TABLE kernel511_admissions(id TEXT);CREATE TABLE kernel511_actor_revision_r113(actor TEXT PRIMARY KEY,revision INTEGER NOT NULL);INSERT INTO kernel511_actor_revision_r113 VALUES('one',77);")
   self.databases[rid]=descriptor(db);realm={'id':rid,'name':rid,'initialChannelCapacity':25 if rid=='r1' else 10,'dbIdentity':'test-'+rid,'database':str(db),'ports':{'app':3500+n}};realms.append(realm)
   self.configs[rid]=d/'config.json';self.configs[rid].write_bytes(encoded({'database':str(db),'realm':{'id':rid,'dbIdentity':realm['dbIdentity'],'manifestFile':str(self.home/'manifest.json')},'delivery511':{'releaseRoot':str(self.root)}}))
  self.manifest={'primaryRealmId':'r1','realms':realms,'authPort':3400,'accountsDatabase':str(self.home/'accounts.sqlite')};(self.home/'manifest.json').write_bytes(encoded(self.manifest));self.af=self.home/'accounts.json';self.af.write_bytes(encoded({'database':self.manifest['accountsDatabase']}))
  self.state={'installed':True,'releaseRoot':str(self.root),'candidate':r109core,'prior':{'gameUnit':'coreoflife-r1.service','accountsUnit':'coreoflife-accounts.service','newGameConfigFile':str(self.configs['r1']),'newAccountsConfigFile':str(self.af),'databaseIdentity':{'dev':self.databases['r1']['device'],'ino':self.databases['r1']['inode']}},'r101':{'realm2Config':str(self.configs['r2']),'sharedCpAuthority':True,'journal':'historical-migration-audit'},'r102':{'version':'R102_CONTENT','journal':'historical-r102-migration-audit'},'r64Deployment':{'version':source,'accountsRoot':str(self.root)}};self.statefile.write_bytes(encoded(self.state))
  self.site=self.home/'site';self.site.mkdir();self.site.joinpath('index.html').write_bytes((ROOT/'tests/fixtures/site-before.html').read_bytes());launcher=self.site/self.plan['site']['sourceLauncher']['path'];launcher.parent.mkdir(parents=True);launcher.write_bytes((ROOT/'tests/fixtures/site-entry-before.js').read_bytes());self.scope.enter_context(patch.object(m.site_delta,'SITE',self.site))
  self.live=SimpleNamespace(root=self.root,node=NODE,state=self.state,gf=self.configs['r1'],af=self.af,game=json.loads(self.configs['r1'].read_text()),accounts=json.loads(self.af.read_text()),manifest=self.manifest,configs=self.configs,databases=self.databases)
  for name,value in {'STATE':self.statefile,'CONTROL':self.control,'ACTIVE':self.control/'active.json','RELEASES':self.releases,'SYSTEMD':self.systemd}.items():self.scope.enter_context(patch.object(m,name,value))
  self.scope.enter_context(patch.object(m,'preflight',side_effect=self.preflight));self.scope.enter_context(patch.object(m,'guards',side_effect=lambda *a:None));self.scope.enter_context(patch.object(m,'stop_all',side_effect=lambda:None));self.scope.enter_context(patch.object(m,'start_all',side_effect=lambda *a:None));self.scope.enter_context(patch.object(m,'check_access',side_effect=lambda *a:None));self.scope.enter_context(patch.object(m,'central',side_effect=self.central));self.scope.enter_context(patch.object(m.readiness,'wait',side_effect=self.health));self.fail=False;self.versions=[];self.setup_forum()
 def preflight(self,live,z,plan,apply=False):
  m.validate_plan(plan);m.runtime_imports.validate(live.root,plan,z);plan['_siteChanges']=m.site_delta.changes(z,plan);plan['_resolvedIdentity']=m.source_identity.resolve(live,plan);plan['_forumPrepared']=m.forum_deploy.prepare(live,z,plan,self.run);return m.payload(live,z,plan)+m.asset_updates(live,z,plan)
 def central(self,live,rid,action='snapshot',snapshot=None):return {'revision':1,'phase':'maintenance','mode':'maintenance','enabled':True,'deadlineMs':0,'realm':{'id':rid,'status':'closed' if rid=='r2' else 'maintenance','registrationOpen':True}}
 def health(self,manifest,version='R114_RUNE_FORUM1',**kwargs):
  self.versions.append(version)
  if self.fail and version=='R114_RUNE_FORUM1':
   with sqlite3.connect(self.databases['r1']['path']) as db:db.execute('UPDATE players SET gems=123456');db.commit()
   raise RuntimeError('injected health failure')
  return {r['id']:{**marks(version),'realm':{'realmId':r['id'],'dbIdentity':r['dbIdentity']},'channelProcesses':{'channels':[{'channel':n,'ready':True,'capacity':r['initialChannelCapacity']} for n in range(1,5)]}} for r in manifest['realms']}
 def setup_forum(self):
  self.systemd.mkdir();self.forumroot=self.home/'forum-code';self.forumdata=self.home/'forum-data';self.caddy=self.home/'caddy.json';self.operations=[];self.failForum=False;self.caddyValue={'apps':{'http':{'servers':{'main':{'listen':[':443'],'routes':[{'@id':'col-marketing-pages-v2','match':[{'host':['coreoflife.net','www.coreoflife.net'],'path':['/']}],'handle':[{'handler':'file_server','root':str(self.site)}],'terminal':True},{'match':[{'host':['r1.coreoflife.net']}],'handle':[{'handler':'reverse_proxy','upstreams':[{'dial':'127.0.0.1:4111'}]}]}]}}}}};self.caddy.write_bytes(encoded(self.caddyValue));self.beforeCaddy=json.loads(json.dumps(self.caddyValue))
  for name,value in {'ROOT':self.forumroot,'DATA':self.forumdata,'CONFIG':self.caddy,'SYSTEMD':self.systemd}.items():self.scope.enter_context(patch.object(m.forum_deploy,name,value))
  self.scope.enter_context(patch.object(m.forum_deploy,'api',side_effect=self.caddy_api));self.scope.enter_context(patch.object(m,'run',side_effect=self.run));self.scope.enter_context(patch.object(m.forum_deploy,'health',side_effect=self.forum_health));self.scope.enter_context(patch.object(m.forum_deploy.pwd,'getpwnam',return_value=SimpleNamespace(pw_uid=os.getuid(),pw_gid=os.getgid(),pw_shell='/usr/sbin/nologin')))
 def caddy_api(self,path='config/',value=None):
  if value is not None:self.caddyValue=json.loads(json.dumps(value))
  return self.caddyValue
 def forum_health(self,run,proxy=True):
  if self.failForum and proxy:raise RuntimeError('injected forum HTTPS failure')
  return {'ok':True,'version':m.VERSION,'demo':False}
 def run(self,args,timeout=90):
  args=[str(a) for a in args];self.operations.append(args)
  if args[:2]==['systemctl','start'] and args[-1]==m.forum_deploy.SERVICE:
   from subprocess import run
   env={**os.environ,'FORUM_DB':str(self.forumdata/'forum.sqlite')}
   release=self.forumroot/'releases'/self.plan['forum']['release'];script="const {createForum}=await import(process.argv[1]);const app=await createForum({dbPath:process.env.FORUM_DB});await app.close();"
   result=run([str(NODE),'--input-type=module','-e',script,(release/'server.mjs').as_uri()],capture_output=True,text=True,env=env);assert result.returncode==0,result.stderr
  return ''
 def close(self):self.scope.close();self.z.close();self.tmp.cleanup()

class Installation(unittest.TestCase):
 def fixture(self):
  f=Fixture();self.addCleanup(f.close);return f
 def result(self,f):return json.loads((max(f.control.glob('install-*'),key=lambda p:p.stat().st_mtime)/'result.json').read_text())
 def assert_progress(self,f,gems=100):
  for row in f.databases.values():
   with sqlite3.connect(row['path']) as db:
    self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],gems)
    self.assertEqual(db.execute('SELECT revision FROM kernel511_actor_revision_r113').fetchone()[0],77)
 def test_exact_source_no_game_database_changes_and_no_unreviewed_payload(self):
  f=self.fixture();self.assertEqual(set(f.plan['sources']),{'R113_ENGINE1'});self.assertEqual(set(f.plan['files']),CHANGED)
  self.assertEqual(f.plan['databaseScope'],'none');self.assertIs(f.plan['databaseChanges'],False);self.assertIs(f.plan['databaseSchemaChanges'],False)
  self.assertNotEqual(f.plan['namespace'],f.plan['sources']['R113_ENGINE1']['namespace'])
  modified=json.loads(json.dumps(f.plan));modified['files'][OPTIONS]['bytes']+=1
  with self.assertRaises(RuntimeError):m.validate_plan(modified)
  self.assertNotIn('modules/derived-migration.mjs',f.z.namelist())
 def test_apply_rollback_and_reapply_preserve_players_forum_data_and_old_assets(self):
  f=self.fixture();before=m.identity.core_identity(f.root/f.core);old=f.plan['sources']['R113_ENGINE1'];oldasset=f.root/'http-runtime/dist-vds/client/assets'/old['namespace']/old['game'];oldbytes=oldasset.read_bytes()
  schemas={rid:digest(row['path']) for rid,row in f.databases.items()}
  m.apply(f.live,f.z,f.plan);j=self.result(f);m.validate_record(j,completed=True);self.assert_progress(f)
  self.assertEqual({rid:digest(row['path']) for rid,row in f.databases.items()},schemas)
  self.assertEqual(m.identity.core_identity(f.root/f.core),f.plan['targetCore']);self.assertEqual(oldasset.read_bytes(),oldbytes)
  self.assertEqual(f.site.joinpath('index.html').read_text().count('href="/forum"'),3)
  for runtime in ('http-runtime','accounts-runtime'):
   for name in f.plan['clientNew']:self.assertTrue((f.root/runtime/'dist-vds/client/assets'/f.plan['namespace']/name).is_file(),name)
  with sqlite3.connect(f.forumdata/'forum.sqlite') as db:
   db.execute("INSERT INTO users(name,name_key,email,password,role,created) VALUES('SavedUser','saveduser','private@example.invalid','test-hash','member',1)");db.commit()
  for row in f.databases.values():
   with sqlite3.connect(row['path']) as db:db.execute('UPDATE players SET gems=123456');db.commit()
  j['phase']='rollback-requested';m.persist(j);m.rollback(m.discover(),j)
  self.assert_progress(f,123456);self.assertEqual(m.identity.core_identity(f.root/f.core),before);self.assertEqual(oldasset.read_bytes(),oldbytes)
  self.assertEqual(f.versions[-1],'R113_ENGINE1');self.assertEqual(json.loads(f.statefile.read_text()),f.state);self.assertEqual(f.caddyValue,f.beforeCaddy)
  self.assertEqual(f.site.joinpath('index.html').read_bytes(),(ROOT/'tests/fixtures/site-before.html').read_bytes())
  with sqlite3.connect(f.forumdata/'forum.sqlite') as db:self.assertEqual(db.execute('SELECT name FROM users').fetchone()[0],'SavedUser')
  m.apply(m.discover(),f.z,f.plan);self.assertEqual(self.result(f)['phase'],'complete');self.assert_progress(f,123456)
  with sqlite3.connect(f.forumdata/'forum.sqlite') as db:self.assertEqual(db.execute('SELECT name FROM users').fetchone()[0],'SavedUser')
 def test_game_health_failure_restores_old_code_without_reverting_player_writes(self):
  f=self.fixture();f.fail=True
  with self.assertRaisesRegex(RuntimeError,'injected health'):m.apply(f.live,f.z,f.plan)
  self.assertFalse(m.ACTIVE.exists());self.assertEqual(m.identity.core_identity(f.root/f.core),f.state['candidate'])
  with sqlite3.connect(f.databases['r1']['path']) as db:self.assertEqual(db.execute('SELECT gems FROM players').fetchone()[0],123456)
  self.assertEqual(f.versions[-1],'R113_ENGINE1');self.assertFalse(f.forumroot.exists())
 def test_forum_https_failure_rolls_back_code_and_site_but_preserves_forum_database(self):
  f=self.fixture();f.failForum=True
  with self.assertRaisesRegex(RuntimeError,'forum HTTPS'):m.apply(f.live,f.z,f.plan)
  self.assertFalse(m.ACTIVE.exists());self.assertEqual(m.identity.core_identity(f.root/f.core),f.state['candidate']);self.assertEqual(f.caddyValue,f.beforeCaddy)
  self.assertTrue((f.forumdata/'forum.sqlite').exists());self.assertFalse((f.systemd/m.forum_deploy.SERVICE).exists());self.assert_progress(f)
 def test_partial_code_write_restores_previous_version(self):
  f=self.fixture();original=m.inplace._replace;writes=0
  def fail(root,stage,row,data,restore=False):
   nonlocal writes
   original(root,stage,row,data,restore=restore)
   if not restore:
    writes+=1
    if writes==4:raise RuntimeError('injected partial write')
  with patch.object(m.inplace,'_replace',side_effect=fail):
   with self.assertRaisesRegex(RuntimeError,'partial write'):m.apply(f.live,f.z,f.plan)
  self.assertFalse(m.ACTIVE.exists());self.assert_progress(f);self.assertEqual(m.identity.core_identity(f.root/f.core),f.state['candidate'])
 def test_power_cut_after_forum_routes_publish_recovers_all_prior_code(self):
  f=self.fixture();original=m.forum_deploy.api
  def cut(path='config/',value=None):
   result=original(path,value)
   if path=='load':os._exit(98)
   return result
  pid=os.fork()
  if pid==0:
   with patch.object(m.forum_deploy,'api',side_effect=cut):m.apply(f.live,f.z,f.plan)
   os._exit(99)
  _,status=os.waitpid(pid,0);self.assertEqual(os.waitstatus_to_exitcode(status),98)
  j=json.loads(m.ACTIVE.read_text());f.caddyValue=json.loads(f.caddy.read_text());m.recover(m.discover(),j)
  self.assertFalse(m.ACTIVE.exists());self.assertEqual(m.identity.core_identity(f.root/f.core),f.state['candidate']);self.assertEqual(f.caddyValue,f.beforeCaddy);self.assert_progress(f)
 def test_changed_source_site_or_caddy_stop_before_game_services(self):
  f=self.fixture();file=f.site/'index.html';before=file.read_bytes();file.write_bytes(before+b'foreign')
  with self.assertRaisesRegex(RuntimeError,'site'):f.preflight(f.live,f.z,f.plan)
  m.stop_all.assert_not_called();file.write_bytes(before)
  f.caddyValue['foreign']=True
  with self.assertRaisesRegex(RuntimeError,'Caddy'):f.preflight(f.live,f.z,f.plan)
  m.stop_all.assert_not_called();f.caddyValue.pop('foreign')
  p=f.root/OPTIONS;data=p.read_bytes();p.write_bytes(data+b'\n// foreign edit')
  with self.assertRaises(RuntimeError):f.preflight(f.live,f.z,f.plan)
  m.stop_all.assert_not_called()
 def test_tampered_backup_blocks_rollback_before_service_stop(self):
  f=self.fixture();m.apply(f.live,f.z,f.plan);j=self.result(f)
  row=next(r for r in j['files'] if r['backup']);p=Path(j['directory'])/'code'/row['backup'];p.write_bytes(p.read_bytes()+b'corrupt')
  m.stop_all.reset_mock()
  with self.assertRaises(RuntimeError):m.rollback(m.discover(),j)
  m.stop_all.assert_not_called()
 def test_zip_bootstrap_private_umask_still_allows_forum_user_to_read_code(self):
  f=self.fixture();prior=os.umask(0o077)
  try:m.apply(f.live,f.z,f.plan)
  finally:os.umask(prior)
  release=f.forumroot/'releases'/f.plan['forum']['release']
  for directory in [f.forumroot,f.forumroot/'releases',release,*[p for p in release.rglob('*') if p.is_dir()]]:
   self.assertEqual(directory.stat().st_mode&0o777,0o755,str(directory))
  self.assertEqual(f.forumdata.stat().st_mode&0o777,0o700)
 def test_caddy_changes_only_forum_routes_on_apex_and_canonical_www(self):
  f=self.fixture();result=m.forum_deploy.transform(f.beforeCaddy);routes=result['apps']['http']['servers']['main']['routes'];self.assertEqual(routes[2:],f.beforeCaddy['apps']['http']['servers']['main']['routes']);self.assertEqual(routes[0]['handle'][0]['status_code'],308);self.assertEqual(routes[1]['handle'][0]['headers']['request']['set']['X-Real-IP'],['{http.request.client_ip}'])
  with self.assertRaises(RuntimeError):m.forum_deploy.transform(result)
 def test_readiness_requires_r114_marker_and_previous_engine(self):
  f=self.fixture();manifest=f.manifest
  for row in manifest['realms']:row['ports']['realtime']=row['ports']['app']+10
  health=f.health(manifest)
  def request(port,path):
   if path=='/api/auth/me':return {'authenticated':False}
   realm=next(r for r in manifest['realms'] if port in r['ports'].values());rid=realm['id']
   if path=='/api/vds-health':return health[rid]
   if path=='/api/realm/context':return {'realm':{'id':rid}}
   return {'ok':True,'protocol':'col-realtime-1','transportRepairVersion':'R102_REALTIME1','realmId':rid,'dbIdentity':realm['dbIdentity']}
  self.assertEqual(m.readiness.probe(manifest,request=request)[1],[])
  health['r1']['runeForum']=None;self.assertTrue(m.readiness.probe(manifest,request=request)[1])
  health=f.health(manifest,'R113_ENGINE1');self.assertEqual(m.readiness.probe(manifest,'R113_ENGINE1',request=request)[1],[])
  health['r2']['engineReadyR113']=False;self.assertTrue(m.readiness.probe(manifest,'R113_ENGINE1',request=request)[1])
if __name__=='__main__':unittest.main()
