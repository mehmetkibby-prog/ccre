import copy,json,sys,tempfile,unittest,subprocess,ssl
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'deployment/modules'))
import domain_move as d

def config():
 routes=[{'@id':'site','match':[{'host':['coreoflife.net','www.coreoflife.net'],'path':['/','/assets/*','/col-site/*','/rehber*','/game*','/_game*','/voice*']}],'handle':[{'handler':'static_response','body':'site'}],'terminal':True},
 {'@id':'forum','match':[{'host':['coreoflife.net'],'path':['/forum*']}],'handle':[{'handler':'reverse_proxy','upstreams':[{'dial':'127.0.0.1:8114'}],'headers':{'request':{'set':{'Host':['coreoflife.net']}}}}]},
 {'@id':'account','match':[{'host':['accounts.coreoflife.net']}],'handle':[{'handler':'static_response','body':'account'}]},
 {'@id':'rt','match':[{'host':['r1.coreoflife.net','r2.coreoflife.net','rt1.coreoflife.net','rt2.coreoflife.net','rt-r2.coreoflife.net','realtime.coreoflife.net']}],'handle':[{'handler':'static_response','body':'realtime'}]},
 {'@id':'reset','match':[{'host':['coreoflife.net'],'path':['/reset-password']}],'handle':[{'handler':'static_response','status_code':302,'headers':{'Location':['https://accounts.coreoflife.net{http.request.uri}']}}]}]
 return {'apps':{'http':{'servers':{'https':{'listen':[':443'],'routes':routes,'tls_connection_policies':[{'match':{'sni':['coreoflife.net','accounts.coreoflife.net']}}]}}}}}

class Domain(unittest.TestCase):
 def test_exact_urls_preserve_accounts_email_issuer_queries_and_foreign_hosts(self):
  s='https://coreoflife.net/forum/a?x=1&v=2 https://www.coreoflife.net/col-site/a.mp4 wss://coreoflife.net/ws https://accounts.coreoflife.net/ user@coreoflife.net https://coreoflife.net.evil/ coreoflife.net'
  out=d.urls(s)
  self.assertIn('https://2d.coreoflife.net/forum/a?x=1&v=2',out);self.assertIn('wss://2d.coreoflife.net/ws',out)
  for s in ('https://accounts.coreoflife.net/','user@coreoflife.net','https://coreoflife.net.evil/'):self.assertIn(s,out)
 def test_existing_routes_identical_new_alias_is_complete(self):
  before=config();saved=copy.deepcopy(before);after=d.caddy_alias(before)
  self.assertEqual(saved,before)
  old=before['apps']['http']['servers']['https']['routes'];new=after['apps']['http']['servers']['https']['routes']
  self.assertEqual(new[3:],old)
  for r in new[:3]:self.assertEqual(r['match'][0]['host'],[d.HOST])
  self.assertEqual(new[1]['handle'][0]['headers']['request']['set']['Host'],[d.HOST])
  self.assertEqual(new[2]['handle'][0]['headers']['Location'],['https://accounts.coreoflife.net{http.request.uri}'])
  self.assertIn(d.HOST,after['apps']['http']['servers']['https']['tls_connection_policies'][0]['match']['sni'])
  self.assertEqual(len({r['@id'] for r in new}),len(new))
 def test_preexisting_alias_is_not_overwritten(self):
  with self.assertRaisesRegex(RuntimeError,'zaten'):d.caddy_alias(d.caddy_alias(config()))
 def test_game_origins_keep_both_hosts_and_no_domain_cookie(self):
  for account in ('https://coreoflife.net','https://accounts.coreoflife.net'):
   before={'hosts':['r1.coreoflife.net'],'environment':{'ALLOWED_ORIGINS':'https://coreoflife.net,https://www.coreoflife.net','AUTH_PUBLIC_ORIGIN':account,'REALTIME_URL':'wss://realtime.coreoflife.net/ws','AUTH_EMAIL_FROM':'Core <send@coreoflife.net>'},'database':'unchanged.sqlite'}
   result=d.game_config(before);self.assertEqual(result['hosts'],['r1.coreoflife.net',d.HOST]);self.assertEqual(result['database'],before['database'])
   self.assertEqual(set(result['environment']['ALLOWED_ORIGINS'].split(',')),{'https://r1.coreoflife.net','https://coreoflife.net','https://www.coreoflife.net',d.ORIGIN})
   self.assertEqual(result['environment']['AUTH_PUBLIC_ORIGIN'],d.ORIGIN if account=='https://coreoflife.net' else account)
   self.assertEqual(result['environment']['REALTIME_URL'],before['environment']['REALTIME_URL']);self.assertEqual(result['environment']['AUTH_EMAIL_FROM'],before['environment']['AUTH_EMAIL_FROM'])
 def test_realtime_exact_origin_union_and_env_injection_rejected(self):
  drop,body,env,val=d.realtime_dropin('coreoflife-rt-r2.service','https://r2.coreoflife.net')
  self.assertIn(b'https://r2.coreoflife.net,https://2d.coreoflife.net',val)
  for s in ('https://evil.test\nEVIL=yes','https://a.test/extra','https://a.test?x=1','*'):
   with self.assertRaises(RuntimeError):d.origins(s)
 def test_site_canonical_email_media_manifest_sitemap_and_old_backup(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);data={'index.html':'<link rel="canonical" href="https://coreoflife.net/"><a href="https://accounts.coreoflife.net">', 'robots.txt':'User-agent: *\nAllow: /', 'sitemap.xml':'<loc>https://coreoflife.net/rehber</loc>', 'manifest.webmanifest':json.dumps({'start_url':'https://coreoflife.net/','scope':'https://coreoflife.net/'})}
   for n,b in data.items():(root/n).write_text(b)
   rows=d.site_changes(root);self.assertEqual(len(rows),4)
   for p,h,b in rows:self.assertEqual(p.read_text(),data[p.name]);self.assertNotIn(b'https://coreoflife.net',b)
 def test_certificate_hostname_and_validity_before_install(self):
  with tempfile.TemporaryDirectory() as folder:
   p=Path(folder)
   for name,san in [('wild','*.coreoflife.net'),('old','coreoflife.net')]:
    subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','2','-keyout',str(p/(name+'.key')),'-out',str(p/(name+'.crt')),'-subj','/CN='+san,'-addext','subjectAltName=DNS:'+san],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   def c(name):return {'apps':{'tls':{'certificates':{'load_files':[{'certificate':str(p/(name+'.crt'))}]}}}}
   self.assertEqual(d.certificate_ready(c('wild'))[0]['names'],['*.coreoflife.net'])
   with self.assertRaisesRegex(RuntimeError,'sertifika'):d.certificate_ready(c('old'))
 def test_import_guard_distinguishes_resource_directory_from_module(self):
  from types import SimpleNamespace
  import runtime_imports as r
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);(root/'release-manifest.json').write_text('{"files":[]}');core=root/r.CORE;(core/'generated/client').mkdir(parents=True)
   name=r.CORE+'client-assets.mjs';plan={'files':{name:{}}}
   archive=SimpleNamespace(read=lambda _:b"const p=new URL('./generated/client/',import.meta.url);")
   self.assertEqual(r.validate(root,plan,archive),1)
   archive=SimpleNamespace(read=lambda _:b"import './generated/client/';")
   with self.assertRaisesRegex(RuntimeError,'bulunamadı'):r.validate(root,plan,archive)
   archive=SimpleNamespace(read=lambda _:b"const p=new URL('./missing.mjs',import.meta.url);")
   with self.assertRaisesRegex(RuntimeError,'bulunamadı'):r.validate(root,plan,archive)
 def test_restore_refuses_external_caddy_change(self):
  with tempfile.TemporaryDirectory() as folder:
   p=Path(folder)/'config.json';before=config();after=d.caddy_alias(before);p.write_text(json.dumps(before));j={'domain':{'beforeConfig':before,'afterConfig':after}}
   calls=[]
   with patch.object(d,'CONFIG',p),patch.object(d,'api',side_effect=lambda v=None: calls.append(v) if v else after):d.restore(j,lambda args:None)
   self.assertEqual(calls,[before])
   with patch.object(d,'CONFIG',p),patch.object(d,'api',return_value={'unexpected':True}):
    with self.assertRaisesRegex(RuntimeError,'dışarıdan'):d.restore(j,lambda args:None)

if __name__=='__main__':unittest.main()
