"""Actual Caddy HTTPS reverse proxy and real standalone Node forum; no VDS access."""
import json,os,shutil,ssl,subprocess,sys,tempfile,time,unittest,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'deployment/modules'))
import forum_deploy as f
NODE=os.environ['REVIEW_NODE'];CADDY=os.environ.get('REVIEW_CADDY','/tmp/r114-caddy-test/caddy')
class Proxy(unittest.TestCase):
 def test_actual_tls_proxy_keeps_other_routes_and_overwrites_untrusted_ip(self):
  with tempfile.TemporaryDirectory(prefix='forum-https-') as d:
   root=Path(d);cert=root/'cert.pem';key=root/'key.pem';log=open(root/'caddy.log','w');flog=open(root/'forum.log','w')
   subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=coreoflife.net','-addext','subjectAltName=DNS:coreoflife.net,DNS:www.coreoflife.net','-keyout',str(key),'-out',str(cert)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
   config={'admin':{'listen':'127.0.0.1:18219'},'apps':{'tls':{'certificates':{'load_files':[{'certificate':str(cert),'key':str(key)}]}},'http':{'servers':{'main':{'listen':['127.0.0.1:18443'],'automatic_https':{'disable':True},'tls_connection_policies':[{}],'routes':[{'@id':'col-marketing-pages-v2','match':[{'host':['coreoflife.net'],'path':['/']}],'handle':[{'handler':'static_response','body':'Main site preserved'}],'terminal':True},{'match':[{'host':['coreoflife.net'],'path':['/api/game-fixture']}],'handle':[{'handler':'static_response','body':'Game route preserved'}],'terminal':True}]}}}}}
   planned=f.transform(config);file=root/'caddy.json';file.write_text(json.dumps(planned))
   subprocess.run([CADDY,'validate','--config',str(file)],stdout=log,stderr=log,check=True)
   env={**os.environ,'FORUM_DB':str(root/'forum.sqlite'),'FORUM_ORIGIN':'https://coreoflife.net','FORUM_TRUST_PROXY':'1'}
   forum=subprocess.Popen([NODE,str(ROOT/'forum/server.mjs')],stdout=flog,stderr=flog,env=env)
   caddy=subprocess.Popen([CADDY,'run','--config',str(file)],stdout=log,stderr=log)
   def request(path,host='coreoflife.net',extra=[]):
    args=['curl','-sS','--fail','--max-time','3','--noproxy','*','--cacert',str(cert),'--resolve',host+':18443:127.0.0.1','https://'+host+':18443'+path,*extra]
    return subprocess.run(args,capture_output=True,text=True)
   try:
    for _ in range(80):
     response=request('/forum/api/health')
     if response.returncode==0:break
     time.sleep(.1)
    self.assertEqual(response.returncode,0,response.stderr);self.assertEqual(json.loads(response.stdout),{'ok':True,'version':f.VERSION,'demo':False})
    self.assertIn('Maceranın buluşma noktası',request('/forum').stdout)
    self.assertEqual(request('/').stdout,'Main site preserved');self.assertEqual(request('/api/game-fixture').stdout,'Game route preserved')
    www=request('/forum?x=1','www.coreoflife.net',['-D','-']);self.assertIn('308',www.stdout);self.assertIn('https://coreoflife.net/forum?x=1',www.stdout)
    captcha=request('/forum/api/captcha',extra=['-D','-']);self.assertIn('HttpOnly; SameSite=Strict',captcha.stdout);self.assertIn('Secure',captcha.stdout);self.assertIn('data:image/png;base64',captcha.stdout)
    # Distinct forged IP headers must not bypass the per-client CAPTCHA cap.
    codes=[]
    for n in range(16):
     r=request('/forum/api/captcha',extra=['-H','X-Real-IP: 198.51.100.'+str(n),'-H','X-Forwarded-For: 203.0.113.'+str(n),'-D','-']);codes.append(r.stdout)
    self.assertIn('429',codes[-1]);self.assertIn('retry-after:',codes[-1].lower())
    req=urllib.request.Request('http://127.0.0.1:18219/load',data=json.dumps(config).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=3):pass
    self.assertEqual(request('/').stdout,'Main site preserved');self.assertEqual(request('/api/game-fixture').stdout,'Game route preserved')
    self.assertNotIn('Topluluk forumu',request('/forum').stdout)
    (ROOT/'evidence/caddy-integration.json').write_text(json.dumps({'passed':True,'caddy':subprocess.check_output([CADDY,'version'],text=True).strip(),'checks':['real HTTPS with certificate verification','forum health and HTML','Secure HttpOnly cookies','canonical www redirect','forged IP headers replaced','unrelated routes preserved','configuration rollback'],'live':False},indent=2)+'\n')
   finally:
    for process in (caddy,forum):
     process.terminate()
     try:process.wait(timeout=10)
     except subprocess.TimeoutExpired:process.kill();process.wait()
    log.close();flog.close()
if __name__=='__main__':unittest.main()
