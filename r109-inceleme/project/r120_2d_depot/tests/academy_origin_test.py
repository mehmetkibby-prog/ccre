"""Real R102 bootstrap failure -> R120 process/HTTP/signed WebSocket recovery."""
import importlib.util,json,os,sqlite3,subprocess,sys,time,unittest,urllib.request
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'deployment/modules'))
import academy_origin as a
from storage import atomic,digest,read
LEGACY=ROOT/'tests/fixtures/r102_realtime'
spec=importlib.util.spec_from_file_location('academy_legacy_fixture',LEGACY/'fixture.py')
legacy=importlib.util.module_from_spec(spec);spec.loader.exec_module(legacy)

class AcademyOrigin(unittest.TestCase):
 def fixture(self):
  f=legacy.Fixture();self.addCleanup(f.close);f.real=True
  legacy.r.apply(f.live,f.ops,f.request)
  self.addCleanup(patch.stopall)
  patch.object(a,'CONTROL',legacy.r.CONTROL).start();patch.object(a,'LIBRARY',legacy.r.LIBRARY).start();patch.object(a,'ROOT_UID',os.getuid()).start()
  self.original={str(p):digest(p) for p in a.LIBRARY.rglob('*') if p.is_file()}
  self.record=digest(a.CONTROL/'record.json');self.old_drop=Path(read(a.CONTROL/'record.json')['dropin']);self.drop_hash=digest(self.old_drop)
  return f
 def run_adapter(self,f,args):
  if args[0]=='systemctl':return str(f.child.pid)
  return f.run(args)
 def plan(self,f):return a.prepare(f.live,f.systemd,lambda args:self.run_adapter(f,args),f.env['ALLOWED_ORIGINS'])
 def publish(self,p):
  old=os.umask(0o077)
  try:
   a.make_directory(p)
   for path,before,data in p['rows']:self.assertIsNone(before);self.assertFalse(path.exists());atomic(path,data,0o644)
  finally:os.umask(old)
  self.assertEqual(Path(p['target']).stat().st_mode&0o777,0o755)
 def launch(self,f,target,env):
  f.stop();f.log=open(f.home/'runtime-v4.log','ab')
  f.child=subprocess.Popen([f.live.node,Path(target)/'realtime-entry.mjs',f.root,f.cfg],env=env,stdout=f.log,stderr=f.log)
  end=time.monotonic()+8
  while time.monotonic()<end:
   if f.child.poll() is not None:raise AssertionError((f.home/'runtime-v4.log').read_text())
   try:
    with urllib.request.urlopen('http://127.0.0.1:'+str(f.port)+'/readyz',timeout=.5) as r:return json.load(r)
   except OSError:time.sleep(.05)
  self.fail('new realtime not ready')
 def unchanged(self,f):
  self.assertEqual({p:digest(p) for p in self.original},self.original)
  self.assertEqual(digest(a.CONTROL/'record.json'),self.record);self.assertEqual(digest(self.old_drop),self.drop_hash);self.assertEqual(digest(f.db),f.before)
 def test_reproduce_old_failure_then_real_signed_connections_with_new_and_old_origin(self):
  f=self.fixture();p=self.plan(f);old=read(a.CONTROL/'record.json')['target']
  env={**f.env,'ALLOWED_ORIGINS':f.env['ALLOWED_ORIGINS']+','+a.ORIGIN}
  f.stop()
  before=subprocess.run([f.live.node,Path(old)/'realtime-entry.mjs',f.root,f.cfg],env=env,capture_output=True,text=True,timeout=10)
  self.assertNotEqual(before.returncode,0);self.assertIn('realtime_network_identity',before.stderr)
  self.publish(p);a.check_access(p,f.run);h=self.launch(f,p['target'],env)
  self.assertEqual(h['originCompatibility'],a.VERSION);self.assertEqual(h['transportRepairVersion'],'R102_REALTIME1');self.assertEqual(h['dbIdentity'],f.dbid)
  with urllib.request.urlopen('http://127.0.0.1:'+str(f.port)+'/healthz') as r:self.assertEqual(json.load(r)['originCompatibility'],a.VERSION)
  result=subprocess.check_output([f.live.node,ROOT/'tests/academy-websocket-probe.mjs',str(f.port),f.keyfile,f.native/'node_modules/ws/wrapper.mjs'],text=True)
  self.assertEqual(json.loads(result)['new2dOrigin'],'accepted');print(result.strip(),flush=True)
  # Same bundle also accepts the original single-origin environment for rollback safety.
  h=self.launch(f,p['target'],f.env);self.assertTrue(h['ok'])
  f.stop();self.unchanged(f)
  # Restore to old ExecStart by deleting only journaled new paths.
  for path,_,_ in p['rows']:path.unlink()
  self.launch(f,old,f.env);self.unchanged(f)
  p2=self.plan(f);self.assertEqual(p2['target'],p['target'])
 def test_network_realm_signing_and_database_guards_remain_strict(self):
  f=self.fixture();p=self.plan(f);self.publish(p);f.stop()
  common={**f.env,'ALLOWED_ORIGINS':f.env['ALLOWED_ORIGINS']+','+a.ORIGIN}
  cases=[({'ALLOWED_ORIGINS':'*'},'realtime_network_identity'),({'ALLOWED_ORIGINS':a.ORIGIN},'realtime_network_identity'),({'ALLOWED_ORIGINS':common['ALLOWED_ORIGINS']+',https://evil.test'},'realtime_network_identity'),({'ALLOWED_ORIGINS':'https://r1.coreoflife.net,'+a.ORIGIN},'realtime_network_identity'),({'PORT':str(f.port+1)},'realtime_network_identity'),({'HOST':'0.0.0.0'},'realtime_network_identity'),({'CORE_REALM_ID':'r1'},'realtime_academy_only'),({'REALTIME_PUBLIC_KEY_SPKI':'wrong'},'realtime_signing_identity')]
  for changes,error in cases:
   with self.subTest(changes=changes):
    result=subprocess.run([f.live.node,Path(p['target'])/'realtime-entry.mjs',f.root,f.cfg],env={**common,**changes},capture_output=True,text=True,timeout=10)
    self.assertNotEqual(result.returncode,0);self.assertIn(error,result.stderr)
  self.unchanged(f)
  with sqlite3.connect(f.db) as db:db.execute("UPDATE realm_identity SET realm_id='r1'")
  wrong_db=digest(f.db)
  result=subprocess.run([f.live.node,Path(p['target'])/'realtime-entry.mjs',f.root,f.cfg],env=common,capture_output=True,text=True,timeout=10)
  self.assertNotEqual(result.returncode,0);self.assertIn('Wrong realm database',result.stderr);self.assertEqual(digest(f.db),wrong_db)
 def test_tampered_legacy_bundle_or_record_is_rejected_before_mutations(self):
  f=self.fixture();target=Path(read(a.CONTROL/'record.json')['target'])
  for file in (target/'realtime-profile.mjs',target/'server.mjs',self.old_drop):
   before=file.read_bytes();file.write_bytes(before+b'\n// foreign edit\n')
   try:
    with self.assertRaises(RuntimeError):self.plan(f)
   finally:file.write_bytes(before)
  with self.assertRaisesRegex(RuntimeError,'Origin'):a.prepare(f.live,f.systemd,lambda args:self.run_adapter(f,args),'https://r2.coreoflife.net,https://evil.test')
  self.unchanged(f)
 def test_new_health_marker_is_required_only_for_v4_not_rollback(self):
  import readiness
  manifest={'authPort':8000,'realms':[{'id':'r2','dbIdentity':'test','ports':{'app':8001,'realtime':8002}}]}
  rt={'ok':True,'protocol':'col-realtime-1','realmId':'r2','dbIdentity':'test','transportRepairVersion':'R102_REALTIME1'}
  def request(port,path):return rt if port==8002 else {'authenticated':False}
  _,issues=readiness.probe(manifest,'R120_2D_DEPOT4',request)
  self.assertEqual([x for x in issues if x.startswith('r2 bağlantı:')],['r2 bağlantı: Akademi yeni alan adı bağlantı kodu hazır değil'])
  _,issues=readiness.probe(manifest,'R118_ROYAL1',request)
  self.assertFalse(any(x.startswith('r2 bağlantı:') for x in issues))
  rt['originCompatibility']=a.VERSION
  _,issues=readiness.probe(manifest,'R120_2D_DEPOT4',request)
  self.assertFalse(any(x.startswith('r2 bağlantı:') for x in issues))

if __name__=='__main__':unittest.main()
