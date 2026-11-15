"""Actual local Caddy TLS: hostname, old host continuity and route/query preservation."""
import copy,http.server,json,os,socket,ssl,subprocess,sys,tempfile,threading,time,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'deployment/modules'))
import domain_move as d
CADDY='/workspace/ccre/site_launch_v2/tooling/caddy'
def port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
class Proxy(http.server.BaseHTTPRequestHandler):
 def do_GET(self):
  self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps({'uri':self.path,'host':self.headers['Host']}).encode())
 def log_message(self,*args):pass
class Caddy(unittest.TestCase):
 def test_real_tls_old_and_new_hosts_and_all_primary_paths(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);cert=root/'server.pem';key=root/'key.pem';listen=port();upstream=http.server.ThreadingHTTPServer(('127.0.0.1',0),Proxy);thread=threading.Thread(target=upstream.serve_forever,daemon=True);thread.start()
   subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','2','-keyout',str(key),'-out',str(cert),'-subj','/CN=coreoflife.net','-addext','subjectAltName=DNS:coreoflife.net,DNS:www.coreoflife.net,DNS:*.coreoflife.net'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   route={'@id':'primary','match':[{'host':['coreoflife.net','www.coreoflife.net']}],'handle':[{'handler':'reverse_proxy','upstreams':[{'dial':'127.0.0.1:'+str(upstream.server_port)}]}],'terminal':True}
   config={'admin':{'disabled':True},'apps':{'tls':{'certificates':{'load_files':[{'certificate':str(cert),'key':str(key)}]}},'http':{'servers':{'s':{'listen':['127.0.0.1:'+str(listen)],'automatic_https':{'disable_redirects':True},'tls_connection_policies':[{'match':{'sni':['coreoflife.net','www.coreoflife.net']}}],'routes':[route]}}}}}
   after=d.caddy_alias(config);d.certificate_ready(after);file=root/'config.json';file.write_text(json.dumps(after));log=(ROOT/'evidence/caddy-tls-process.log').open('w')
   p=subprocess.Popen([CADDY,'run','--config',str(file)],stdout=log,stderr=log)
   try:
    end=time.time()+10
    while True:
     try:status,_,b=d.request_origin('/',str(cert),listen);break
     except OSError:
      if time.time()>end or p.poll() is not None:raise
      time.sleep(.05)
    paths=['/','/assets/a.js','/col-site/video.mp4','/api/health','/ws','/voice/rtc','/game/channel/1','/_game/api/session','/rehber','/forum/api/health','/on-kayit','/akademi-kayit','/reset-password']
    result=[]
    for path in paths:
     uri=path+'?a=1%202&token=safe_test';status,_,body=d.request_origin(uri,str(cert),listen);value=json.loads(body)
     self.assertEqual(status,200);self.assertEqual(value,{'uri':uri,'host':d.HOST});result.append({'uri':uri,'status':status})
    context=ssl.create_default_context(cafile=str(cert))
    for host in ('coreoflife.net','www.coreoflife.net'):
     with context.wrap_socket(socket.create_connection(('127.0.0.1',listen)),server_hostname=host) as s:
      s.sendall(('GET /?old=1 HTTP/1.1\r\nHost: '+host+'\r\nConnection: close\r\n\r\n').encode());body=b''
      while True:
       chunk=s.recv(65536)
       if not chunk:break
       body+=chunk
      self.assertIn(b'200 OK',body);self.assertIn(host.encode(),body)
    (ROOT/'evidence/caddy-tls.json').write_text(json.dumps({'scope':'Actual isolated Caddy and synthetic valid TLS certificate; not live Cloudflare. HTTP route forwarding, not voice media or WS authentication.','hostnameVerified':d.HOST,'oldHostsStillWork':True,'checks':result},indent=2))
   finally:p.terminate();p.wait(timeout=10);log.close();upstream.shutdown();upstream.server_close()
if __name__=='__main__':unittest.main()
