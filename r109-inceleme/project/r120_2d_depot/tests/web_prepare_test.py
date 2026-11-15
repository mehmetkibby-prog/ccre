"""Transactional web preparation; no live DNS, certificate requests or service changes."""
import contextlib,copy,json,os,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'deployment/modules'))
import domain_move as d
import web_prepare as w
from storage import encoded,digest

def config():
 return {'apps':{'http':{'servers':{'srv0':{'listen':[':443'],'routes':[{'@id':'home','match':[{'host':['coreoflife.net','www.coreoflife.net']}],'handle':[{'handler':'static_response','body':'Core of Life'}],'terminal':True},{'match':[{'host':['accounts.coreoflife.net']}],'handle':[{'handler':'static_response','body':'accounts'}]}]}}}}}

class Preparation(unittest.TestCase):
 def setUp(self):
  self.scope=contextlib.ExitStack();self.addCleanup(self.scope.close)
  self.home=Path(self.scope.enter_context(tempfile.TemporaryDirectory()));self.file=self.home/'caddy.json';self.journal=self.home/'private/prepare.json';self.initial=config();self.raw=json.dumps(self.initial,separators=(',',':')).encode();self.file.write_bytes(self.raw);self.file.chmod(0o640)
  self.running=copy.deepcopy(self.initial);self.loads=[];self.commands=[]
  self.scope.enter_context(patch.object(d,'CONFIG',self.file));self.scope.enter_context(patch.object(d,'api',side_effect=self.api));self.scope.enter_context(patch.object(w,'JOURNAL',self.journal));self.scope.enter_context(patch.object(w.socket,'getaddrinfo',return_value=[('resolved',)]))
  self.scope.enter_context(patch.object(d,'request_origin',side_effect=lambda *a,**k:(200,{},b'Core of Life unchanged')))
  self.scope.enter_context(patch.object(d,'certificate_ready',return_value=[{'path':None,'names':[d.HOST],'notAfter':'synthetic'}]))
  self.scope.enter_context(patch.object(w,'public_home',return_value={'status':200,'hostname':d.HOST}))
 def api(self,value=None):
  if value is not None:self.loads.append(copy.deepcopy(value));self.running=copy.deepcopy(value)
  return copy.deepcopy(self.running)
 def validate_cmd(self,args):
  self.assertEqual(args[:2],['caddy','validate']);self.assertTrue(Path(args[-1]).is_file());self.commands.append([str(a) for a in args]);return ''
 def prepare(self):return w.prepare(self.validate_cmd,lambda message:None,timeout=0)
 def test_default_auto_https_preflight_is_read_only(self):
  record=w.preflight(self.validate_cmd)
  self.assertEqual(record['before'],self.initial);self.assertFalse(self.journal.exists());self.assertEqual(self.file.read_bytes(),self.raw);self.assertEqual(self.loads,[]);self.assertEqual(self.running,self.initial)
  self.assertEqual(record['after']['apps']['http']['servers']['srv0']['routes'][1:],self.initial['apps']['http']['servers']['srv0']['routes'])
 def test_success_retry_and_rollback_preserve_exact_bytes_permissions(self):
  result=self.prepare();self.assertTrue(result['tlsVerified']);self.assertEqual(result['trust'],'system-ca');self.assertEqual(len(self.loads),1)
  self.assertEqual(w.saved()['phase'],'ready');self.assertEqual(self.journal.stat().st_mode&0o777,0o600);self.assertEqual(self.journal.parent.stat().st_mode&0o777,0o700)
  self.prepare();self.assertEqual(len(self.loads),1)
  w.rollback(lambda m:None);self.assertEqual(self.file.read_bytes(),self.raw);self.assertEqual(self.running,self.initial);self.assertEqual(self.file.stat().st_mode&0o777,0o640);self.assertEqual(w.saved()['phase'],'rolled-back')
 def test_certificate_failure_restores_old_site_without_services_or_database(self):
  with patch.object(d,'certificate_ready',side_effect=RuntimeError('certificate unavailable')):
   with self.assertRaisesRegex(RuntimeError,'sertifikası'):self.prepare()
  self.assertEqual(self.file.read_bytes(),self.raw);self.assertEqual(self.running,self.initial);self.assertEqual(w.saved()['phase'],'rolled-back');self.assertEqual(len(self.loads),2)
 def test_public_cloudflare_failure_restores_old_site(self):
  with patch.object(w,'public_home',side_effect=RuntimeError('wrong redirect')):
   with self.assertRaisesRegex(RuntimeError,'wrong redirect'):self.prepare()
  self.assertEqual(self.file.read_bytes(),self.raw);self.assertEqual(self.running,self.initial)
 def test_failed_caddy_load_restores_persisted_file(self):
  def fail_once(value=None):
   if value is not None and value!=self.initial:raise RuntimeError('load rejected')
   return self.api(value)
  with patch.object(d,'api',side_effect=fail_once):
   with self.assertRaisesRegex(RuntimeError,'load rejected'):self.prepare()
  self.assertEqual(self.file.read_bytes(),self.raw);self.assertEqual(self.running,self.initial)
 def test_interrupted_config_write_explicit_recovery(self):
  j=w.preflight(self.validate_cmd);w.store(j);self.file.write_bytes(encoded(j['after']))
  with self.assertRaisesRegex(RuntimeError,'dosya/bellek'):w.preflight(self.validate_cmd)
  w.rollback(lambda m:None);self.assertEqual(self.file.read_bytes(),self.raw);self.assertEqual(self.running,self.initial)
 def test_external_change_is_never_overwritten(self):
  self.prepare();modified=copy.deepcopy(self.running);modified['external']=True;self.file.write_bytes(encoded(modified));self.running=modified;before=self.file.read_bytes()
  with self.assertRaisesRegex(RuntimeError,'dışarıdan'):w.rollback(lambda m:None)
  self.assertEqual(self.file.read_bytes(),before)
 def test_disabled_auto_https_or_no_443_is_not_overridden(self):
  for override in ({'automatic_https':{'disable':True}},{'automatic_https':{'disable_certificates':True}},{'automatic_https':{'skip':[d.HOST]}},{'listen':[':80']}):
   self.running=config();self.running['apps']['http']['servers']['srv0'].update(override);self.file.write_bytes(encoded(self.running))
   with self.assertRaises(RuntimeError):w.preflight(self.validate_cmd)
   self.assertFalse(self.journal.exists());self.assertEqual(self.loads,[])
 def test_old_home_changes_trigger_rollback(self):
  calls=0
  def home(*args,**kwargs):
   nonlocal calls
   calls+=1
   return (200,{},b'Core of Life original' if calls==1 else b'Core of Life changed')
  with patch.object(d,'request_origin',side_effect=home):
   with self.assertRaisesRegex(RuntimeError,'ana site'):self.prepare()
  self.assertEqual(self.file.read_bytes(),self.raw)
 def test_edited_2d_route_not_accepted(self):
  self.prepare();self.running['apps']['http']['servers']['srv0']['routes'][0]['handle'][0]['body']='external';self.file.write_bytes(encoded(self.running))
  with self.assertRaisesRegex(RuntimeError,'dışarıdan'):w.preflight(self.validate_cmd)
 def test_private_journal_symlink_is_rejected_before_any_write(self):
  external=self.home/'external';external.mkdir();self.journal.parent.symlink_to(external,target_is_directory=True)
  with self.assertRaisesRegex(RuntimeError,'sembolik'):self.prepare()
  self.assertEqual(self.file.read_bytes(),self.raw);self.assertEqual(self.loads,[])

if __name__=='__main__':unittest.main()
