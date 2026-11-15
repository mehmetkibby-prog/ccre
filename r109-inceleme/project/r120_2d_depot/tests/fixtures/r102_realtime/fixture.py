"""Real native RT executable/HTTP/WS, real code transaction; systemd is simulated."""
import contextlib,hashlib,importlib.util,json,os,shutil,socket,sqlite3,subprocess,sys,tempfile,time,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parent;sys.path.insert(0,str(ROOT/'deployment/modules'))
import realtime_repair as r
from storage import atomic,encoded,digest
REVIEW=next(p for p in ROOT.parents if p.name=='r109-inceleme')
BASE=REVIEW/'project/r109_latency_completion/working/native510-bb3a6cc689c6'
NODE=Path(os.environ.get('REVIEW_NODE') or shutil.which('node'))
if subprocess.check_output([NODE,'--version'],text=True).strip()!='v22.23.4':raise RuntimeError('Use REVIEW_NODE=Node.js 22.23.4 for the Academy fixture')
WS=REVIEW/'node_modules/ws'
class Fixture:
 def __init__(self):
  self.tmp=tempfile.TemporaryDirectory(prefix='r102-rt-');self.home=Path(self.tmp.name);self.root=self.home/'release';self.root.mkdir();self.native=self.root/r.NATIVE
  shutil.copytree(BASE,self.native,symlinks=False,ignore=shutil.ignore_patterns('node_modules'))
  dependency=self.native/'node_modules/ws'
  if dependency.is_symlink():dependency.unlink()
  elif dependency.exists():shutil.rmtree(dependency)
  shutil.copytree(WS,dependency)
  (self.root/'bin').mkdir();(self.root/'bin/node').symlink_to(NODE)
  self.systemd=self.home/'systemd';self.systemd.mkdir();self.state=self.home/'state';self.state.mkdir();self.library=self.home/'lib';self.library.mkdir()
  self.data=self.home/'r2';self.data.mkdir();self.db=self.data/'game.sqlite';self.cfg=self.data/'config.json';self.manifest=self.home/'realms.json';self.dbid='11111111-2222-3333-4444-555555555555'
  with socket.socket() as s:s.bind(('127.0.0.1',0));self.port=s.getsockname()[1]
  keys=json.loads(subprocess.check_output([NODE,'--input-type=module','-e',"import{generateKeyPairSync}from'node:crypto';const k=generateKeyPairSync('ec',{namedCurve:'prime256v1'});console.log(JSON.stringify({public:k.publicKey.export({type:'spki',format:'der'}).toString('base64'),private:k.privateKey.export({type:'pkcs8',format:'pem'})}));"]))
  self.keys=keys;self.keyfile=self.home/'key.json';self.keyfile.write_bytes(encoded(keys));self.env={**os.environ,'PORT':str(self.port),'HOST':'127.0.0.1','CORE_REALM_ID':'r2','ALLOWED_ORIGINS':'https://r2.coreoflife.net','REALTIME_PUBLIC_KEY_SPKI':keys['public']}
  with sqlite3.connect(self.db) as db:
   db.executescript('CREATE TABLE realm_identity(id INTEGER PRIMARY KEY,realm_id TEXT,database_id TEXT); CREATE TABLE loadlab_entities_v1(kind TEXT,id TEXT,run_id TEXT,account_id TEXT,descriptor_json TEXT);')
   db.execute('INSERT INTO realm_identity VALUES(1,?,?)',('r2',self.dbid));db.execute('INSERT INTO loadlab_entities_v1 VALUES(?,?,?,?,?)',('player','blocked-bot','test-run','bot-account',json.dumps({'team':0,'channel':1,'area':'forest'})))
  manifest={'primaryRealmId':'r1','realms':[{'id':'r1'},{'id':'r2','dbIdentity':self.dbid,'dataRoot':str(self.data),'database':str(self.db),'ports':{'realtime':self.port},'origin':self.env['ALLOWED_ORIGINS']}]}
  self.manifest.write_bytes(encoded(manifest));self.cfg.write_bytes(encoded({'realm':{'id':'r2','dbIdentity':self.dbid,'manifestFile':str(self.manifest)},'database':str(self.db),'delivery511':{'releaseRoot':str(self.root)},'environment':{'REALTIME_PUBLIC_KEY_SPKI':keys['public']}}))
  self.live=SimpleNamespace(root=self.root,node=self.root/'bin/node',configs={'r2':self.cfg},manifest=manifest)
  (self.systemd/r.UNIT).write_bytes(r.expected_unit(self.live));self.events=[];self.status='failed';self.real=False;self.child=None;self.log=None;self.failready=False;self.interrupt=None
  self.ops=SimpleNamespace(SYSTEMD=self.systemd,STATE=self.state/'state.json',run=self.run,prop=self.prop,service=self.service,reload=lambda:self.events.append('reload'),say=lambda x:None)
  self.scope=contextlib.ExitStack();self.scope.enter_context(patch.object(r,'CONTROL',self.state/'repair'));self.scope.enter_context(patch.object(r,'LIBRARY',self.library/'core102'));self.scope.enter_context(patch.object(r,'ROOT_UID',os.getuid()))
  self.before=digest(self.db)
 def run(self,args):
  args=[str(a) for a in args]
  if args[0]=='runuser':args=args[4:]
  return subprocess.check_output(args,text=True,stderr=subprocess.PIPE).strip()
 def prop(self,unit,key):
  assert unit==r.UNIT
  return {'User':'col-r2','Group':'col-r2','ActiveState':self.status,'DropInPaths':' '.join(map(str,(self.systemd/(r.UNIT+'.d')).glob('*.conf')))}[key]
 def service(self,unit,action):
  assert unit==r.UNIT;self.events.append(action)
  if action=='stop':self.stop();self.status='inactive'
  elif action=='start':
   self.status='active'
   if self.real:
    target=Path(r.bundle(self.live,self.ops)['target']);self.log=open(self.home/'runtime.log','ab')
    self.child=subprocess.Popen([self.live.node,target/'realtime-entry.mjs',self.root,self.cfg],env=self.env,stdout=self.log,stderr=self.log)
  if self.interrupt==action:self.interrupt=None;raise RuntimeError('injected operation failure')
 def request(self,port,path):
  if self.failready:raise RuntimeError('injected health failure')
  if self.real:
   import urllib.request
   with urllib.request.urlopen('http://127.0.0.1:'+str(port)+path,timeout=.5) as response:return json.load(response)
  return {'ok':True,'protocol':'col-realtime-1','realmId':'r2','dbIdentity':self.dbid,'transportRepairVersion':r.VERSION}
 def stop(self):
  if self.child:
   self.child.terminate()
   try:self.child.wait(6)
   except subprocess.TimeoutExpired:self.child.kill();self.child.wait()
   self.child=None
  if self.log:self.log.close();self.log=None
 def close(self):self.stop();self.scope.close();self.tmp.cleanup()
