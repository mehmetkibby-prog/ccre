"""Actual Caddy default host automation, isolated local issuer, no global CA install."""
import json,os,socket,ssl,subprocess,sys,tempfile,time,unittest,urllib.request
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'deployment/modules'))
import domain_move as d
CADDY='/workspace/ccre/site_launch_v2/tooling/caddy'
def port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
class AutomaticTLS(unittest.TestCase):
 def test_new_host_gets_separate_cert_old_host_unchanged_all_tls_verified(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);listen=port();admin=port();ca=root/'storage/pki/authorities/local/root.crt'
   route={'@id':'home','match':[{'host':['coreoflife.net','www.coreoflife.net']}],'handle':[{'handler':'static_response','body':'Core of Life stable'}],'terminal':True}
   before={'admin':{'listen':'127.0.0.1:'+str(admin)},'storage':{'module':'file_system','root':str(root/'storage')},'apps':{'pki':{'certificate_authorities':{'local':{'install_trust':False}}},'tls':{'automation':{'policies':[{'issuers':[{'module':'internal'}]}]}},'http':{'https_port':listen,'servers':{'s':{'listen':['127.0.0.1:'+str(listen)],'automatic_https':{'disable_redirects':True},'routes':[route]}}}}}
   file=root/'config.json';file.write_text(json.dumps(before));log=(ROOT/'evidence/caddy-auto-tls-v2-process.log').open('w')
   child=subprocess.Popen([CADDY,'run','--config',str(file)],stdout=log,stderr=log)
   def ready(host):
    end=time.monotonic()+10
    while True:
     try:return d.tls_info(host,port=listen)
     except (OSError,ValueError):
      if time.monotonic()>end or child.poll() is not None:raise
      time.sleep(.05)
   try:
    # The isolated issuer root is trusted for this process only; production
    # uses OS roots. No -k / CERT_NONE and no system trust-store modifications.
    with patch.dict(os.environ,{'SSL_CERT_FILE':str(ca)}):
     old=ready('coreoflife.net');self.assertEqual(old['names'],['coreoflife.net']);self.assertEqual(d.request_origin('/',port=listen,host='coreoflife.net')[0],200)
     with self.assertRaises(ssl.SSLError):d.tls_info(d.HOST,port=listen)
     after=d.caddy_alias(before);request=urllib.request.Request('http://127.0.0.1:'+str(admin)+'/load',data=json.dumps(after).encode(),headers={'Content-Type':'application/json'})
     with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(request,timeout=10) as response:self.assertEqual(response.status,200)
     new=ready(d.HOST);self.assertEqual(new['names'],[d.HOST]);self.assertEqual(d.tls_info('coreoflife.net',port=listen),old)
     for host in ('coreoflife.net','www.coreoflife.net',d.HOST):
      self.assertEqual(d.request_origin('/?query=kept',port=listen,host=host),(200,unittest.mock.ANY,b'Core of Life stable'))
     actual_tls=d.tls_info
     with patch.object(d,'tls_info',side_effect=lambda:actual_tls(port=listen)):
      certificate=d.certificate_ready(after)[0];self.assertIsNone(certificate['path']);self.assertEqual(certificate['names'],[d.HOST])
     with self.assertRaises(ssl.SSLError):d.tls_info('unconfigured.coreoflife.net',port=listen)
    with patch.dict(os.environ,{'SSL_CERT_FILE':'/etc/ssl/certs/ca-certificates.crt'}):
     with self.assertRaises(ssl.SSLCertVerificationError):d.tls_info(d.HOST,port=listen)
    (ROOT/'evidence/caddy-auto-tls-v2.json').write_text(json.dumps({'scope':'Actual isolated Caddy; local issuer used to avoid production ACME. Trust limited to test process. No Cloudflare/live test.','newHostnameCertificate':new,'oldCertificateUnchanged':True,'oldAndNewHostsServeHomepage':True,'untrustedCertificateRejected':True,'noManualCertificateLoaders':True},indent=2))
   finally:child.terminate();child.wait(timeout=10);log.close()
if __name__=='__main__':unittest.main()
