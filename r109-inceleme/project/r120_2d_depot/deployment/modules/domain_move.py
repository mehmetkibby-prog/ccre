"""Narrow, journaled 2D alias/configuration changes. Never calls a DNS API."""
import copy,hashlib,http.client,json,re,socket,ssl,tempfile,time,urllib.request
import academy_origin
from pathlib import Path
from urllib.parse import urlsplit
from storage import require,encoded,digest,read

HOST='2d.coreoflife.net';ORIGIN='https://'+HOST
OLD=('coreoflife.net','www.coreoflife.net')
CONFIG=Path('/etc/caddy/coreoflife-realms-417.json')
SYSTEMD=Path('/etc/systemd/system');ENVROOT=Path('/etc/coreoflife-r120')
SITE=Path('/opt/coreoflife-site/current')
URL=re.compile(r'(https?://|wss?://)(?:www\.)?coreoflife\.net(?![\w.-])')
def urls(s):return URL.sub(lambda m:m[1]+HOST,s)
def api(value=None):
 req=urllib.request.Request('http://127.0.0.1:2019/'+('load' if value is not None else 'config/'),data=encoded(value) if value is not None else None,headers={'Content-Type':'application/json'})
 with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(req,timeout=20) as r:
  b=r.read();return json.loads(b) if b else None
def tree(value,fn):
 if isinstance(value,str):return fn(value)
 if isinstance(value,list):return [tree(v,fn) for v in value]
 if isinstance(value,dict):return {k:tree(v,fn) for k,v in value.items()}
 return value
def caddy_alias(config):
 # A successful --prepare-web already added our exact aliases. Accept only
 # those byte-equivalent routes, never a custom/partially edited 2d route.
 clean=copy.deepcopy(config);owned=False
 for server in clean.get('apps',{}).get('http',{}).get('servers',{}).values():
  keep=[]
  for route in server.get('routes',[]):
   if str(route.get('@id','')).startswith('r120-2d-'):
    owned=True
    require(route.get('match') and all(m.get('host')==[HOST] for m in route['match']),'Hazırlanmış 2D kuralı değiştirilmiş')
   else:keep.append(route)
  server['routes']=keep
 if owned:
  require(_caddy_alias_new(clean)==config,'Hazırlanmış 2D kuralları beklenen yönlendirmelerle eşleşmiyor')
  return copy.deepcopy(config)
 return _caddy_alias_new(config)

def _caddy_alias_new(config):
 out=copy.deepcopy(config);count=0
 for server in out.get('apps',{}).get('http',{}).get('servers',{}).values():
  routes=server.get('routes',[]);added=[]
  require(not any(HOST in m.get('host',[]) for r in routes for m in r.get('match',[])),'2D yayın alanı zaten özel bir kurala bağlı; üzerine yazılmadı')
  for i,route in enumerate(routes):
   matches=[m for m in route.get('match',[]) if 'coreoflife.net' in m.get('host',[])]
   if not matches:continue
   clone=tree(route,lambda s:urls(s) if s not in OLD else HOST)
   clone['match']=[{**tree(m,lambda s:urls(s) if s not in OLD else HOST),'host':[HOST]} for m in matches]
   def ids(n):
    if isinstance(n,dict):
     if '@id' in n:n['@id']='r120-2d-'+n['@id']
     for v in n.values():ids(v)
    elif isinstance(n,list):
     for v in n:ids(v)
   ids(clone);clone['@id']='r120-2d-'+str(i)+'-'+route.get('@id','route')
   added.append(clone);count+=1
  server['routes']=added+routes
  if added:
   for policy in server.get('tls_connection_policies',[]):
    sni=policy.get('match',{}).get('sni')
    if sni and 'coreoflife.net' in sni and HOST not in sni and '*.coreoflife.net' not in sni:sni.append(HOST)
 require(count>0,'Ana site için kopyalanabilir host kuralları bulunamadı')
 # DNS, upstreams and existing route objects are untouched. Only cloned
 # host routes and explicit TLS SNI eligibility are added.
 return out
def game_config(config):
 out=copy.deepcopy(config);require(isinstance(out.get('hosts'),list),'Servis host listesi bulunamadı')
 if HOST not in out['hosts']:out['hosts'].append(HOST)
 env=out.setdefault('environment',{})
 for key,value in list(env.items()):
  if isinstance(value,str) and (key.endswith(('_URL','_ORIGIN','_ORIGINS')) or key.startswith('NEXT_PUBLIC_')):env[key]=urls(value)
 # Existing origins continue working before the user's apex DNS cutover.
 existing=config.get('environment',{}).get('ALLOWED_ORIGINS','')
 origins=[s.strip() for s in existing.split(',') if s.strip()]
 origins+=['https://'+h for h in config['hosts']]
 env['ALLOWED_ORIGINS']=','.join(dict.fromkeys(origins+[ORIGIN]))
 # AUTH_PUBLIC_ORIGIN is the authoritative source of Resend reset links.
 # It may already be the unchanged accounts host; never redirect that host.
 if 'AUTH_PUBLIC_ORIGIN' in env:require(urlsplit(env['AUTH_PUBLIC_ORIGIN']).scheme=='https','E-posta origin HTTPS olmalı')
 return out
def origins(value):
 result=[s.strip() for s in value.split(',') if s.strip()]
 for s in result:
  u=urlsplit(s);require(u.scheme in ('http','https') and u.netloc and u.path in ('','/') and not u.query and not u.fragment and not u.username and not u.password and '\n' not in s and '"' not in s,'Origin listesi güvenli değil')
 return ','.join(dict.fromkeys(result+[ORIGIN]))
def realtime_dropin(unit,old):
 require(unit in ('coreoflife-rt-r1.service','coreoflife-rt-r2.service'),'Realtime servis kapsamı farklı')
 return (SYSTEMD/(unit+'.d')/'zz-r120-2d.conf',('[Service]\nEnvironmentFile='+str(ENVROOT/(unit+'.env'))+'\n').encode(),ENVROOT/(unit+'.env'),('ALLOWED_ORIGINS='+origins(old)+'\n').encode())
def tls_context(certificate=None):
 context=ssl.create_default_context(cafile=certificate)
 if certificate:context.verify_flags|=ssl.VERIFY_X509_PARTIAL_CHAIN
 return context

def tls_info(host=HOST,certificate=None,port=443):
 with socket.create_connection(('127.0.0.1',port),timeout=4) as raw:
  with tls_context(certificate).wrap_socket(raw,server_hostname=host) as connection:
   value=connection.getpeercert()
   return {'names':[v for k,v in value.get('subjectAltName',[]) if k=='DNS'],'notAfter':value.get('notAfter'),'tls':connection.version()}

def certificate_ready(config):
 now=time.time();found=[]
 for row in config.get('apps',{}).get('tls',{}).get('certificates',{}).get('load_files',[]):
  p=row.get('certificate')
  if not p:continue
  d=ssl._ssl._test_decode_cert(p);names=[v for k,v in d.get('subjectAltName',[]) if k=='DNS']
  if (HOST in names or '*.coreoflife.net' in names) and ssl.cert_time_to_seconds(d['notAfter'])>now and ssl.cert_time_to_seconds(d['notBefore'])<=now:found.append({'path':p,'names':names,'notAfter':d['notAfter']})
 if not found:
  try:
   info=tls_info()
   found.append({'path':None,'source':'automatic-or-system-trusted',**info})
  except (OSError,ValueError):pass
 require(found,'2d.coreoflife.net için doğrulanmış sertifika henüz hazır değil. Önce aynı paketle --check-web, ardından bakımda --prepare-web çalıştırın.')
 return found
def site_changes(root):
 root=Path(root).resolve();require(root.is_dir(),'Ana site bulunamadı');rows=[]
 # Only text web resources, never media, databases, email configuration or
 # arbitrary executable files. Changes are journaled against the read hash.
 for p in sorted(root.rglob('*')):
  if p.suffix.lower() not in ('.html','.js','.css','.xml','.txt','.json','.webmanifest','.svg') or not p.is_file():continue
  require(not p.is_symlink() and p.resolve().is_relative_to(root),'Site metin dosyası dışarıya bağlı')
  require(p.stat().st_size<8*1024**2,'Site metin dosyası beklenenden büyük')
  before=p.read_text();after=urls(before)
  if p.name=='robots.txt' and 'Sitemap:' not in after:after=after.rstrip()+'\nSitemap: '+ORIGIN+'/sitemap.xml\n'
  if after!=before:rows.append((p,digest(p),after.encode()))
 return rows
def process_origins(unit,run):
 pid=run(['systemctl','show',unit,'--property=MainPID','--value']);require(pid.isdigit() and int(pid)>1,'Realtime süreç kimliği bulunamadı')
 env=dict(v.split(b'=',1) for v in Path('/proc',pid,'environ').read_bytes().split(b'\0') if b'=' in v)
 return env.get(b'ALLOWED_ORIGINS',b'https://coreoflife.net,https://www.coreoflife.net').decode()

def prepare(live,z,plan,run):
 require(CONFIG.is_file() and not CONFIG.is_symlink(),'Caddy yayın ayarı bulunamadı')
 before=read(CONFIG);require(api()==before,'Caddy dosya/bellek ayarı farklı; üzerine yazılmadı')
 certs=certificate_ready(before);after=caddy_alias(before)
 with tempfile.TemporaryDirectory(prefix='r120-caddy-check-') as d:
  p=Path(d)/'config.json';p.write_bytes(encoded(after));run(['caddy','validate','--config',p])
 try:socket.getaddrinfo(HOST,443)
 except OSError:raise RuntimeError('Önce yalnız 2d A kaydını 45.84.191.223, proxy açık olarak oluşturun. Ana alan ve www DNS kayıtlarına dokunmayın.')
 rows=[]
 for file in [*live.configs.values(),live.af]:
  file=Path(file);require(not file.is_symlink(),'Servis ayarı sembolik bağ')
  value=read(file);new=game_config(value);rows.append((file,digest(file),encoded(new)))
 for unit in ('coreoflife-rt-r1.service','coreoflife-rt-r2.service'):
  old_origins=process_origins(unit,run)
  if unit==academy_origin.UNIT:academy=academy_origin.prepare(live,SYSTEMD,run,old_origins);rows+=academy['rows']
  drop,data,env,value=realtime_dropin(unit,old_origins)
  for p,b in ((drop,data),(env,value)):
   require(not p.exists() and not p.is_symlink(),'R120 realtime ayarı zaten var; üzerine yazılmadı');rows.append((p,None,b))
 root=SITE.resolve();require(root.is_relative_to(SITE.parent.resolve()),'Ana site dizini farklı')
 rows+=site_changes(root)
 forum=Path(run(['systemctl','show','coreoflife-forum.service','--property=WorkingDirectory','--value']))
 require(forum.parent==Path('/opt/coreoflife-forum/releases') and re.fullmatch('[a-f0-9]{16}',forum.name),'Kurulu forum kod yolu farklı')
 for name,meta in plan['domain']['forum'].items():
  p=forum/name;require(not p.is_symlink() and p.is_file() and digest(p)==meta['before'],'Kurulu forum dosyası değiştirilmiş: '+name)
  data=z.read('forum/'+name);require(hashlib.sha256(data).hexdigest()==meta['after'],'Forum paket içeriği bozuk')
  rows.append((p,meta['before'],data))
 p=SYSTEMD/'coreoflife-forum.service.d/zz-r120-2d.conf';require(not p.exists() and not p.is_symlink(),'Forum geçiş ayarı zaten var')
 rows.append((p,None,('[Service]\nEnvironment=FORUM_ORIGIN='+ORIGIN+'\nEnvironment=FORUM_ALLOWED_ORIGINS='+','.join([ORIGIN,*['https://'+h for h in OLD]])+'\n').encode()))
 require(len({str(p) for p,_,_ in rows})==len(rows),'Tekrarlanan geçiş dosyası')
 return {'beforeConfig':before,'afterConfig':after,'certificate':certs[0]['path'],'rows':rows,'academyRealtime':academy}

def apply(prepared,j,external,persist,run):
 require(read(CONFIG)==prepared['beforeConfig'] and api()==prepared['beforeConfig'],'Caddy ön kontrolden sonra değişti')
 j['domain']={k:prepared[k] for k in ('beforeConfig','afterConfig','certificate')};j['domain']['phase']='prepared';persist(j)
 if prepared.get('academyRealtime'):academy_origin.make_directory(prepared['academyRealtime'])
 for p,before,data in prepared['rows']:
  require(not p.is_symlink() and (digest(p) if p.exists() else None)==before,'Geçiş dosyası ön kontrolden sonra değişti: '+str(p))
  external(j,p,data)
 if prepared.get('academyRealtime'):academy_origin.check_access(prepared['academyRealtime'],run)
 if prepared['afterConfig']!=prepared['beforeConfig']:
  external(j,CONFIG,encoded(prepared['afterConfig']));api(prepared['afterConfig'])
 require(api()==prepared['afterConfig'],'Yeni Caddy ayarı etkinleşmedi')
 run(['systemctl','daemon-reload']);run(['systemctl','restart','coreoflife-forum.service'])
 j['domain']['phase']='published';persist(j)

def restore(j,run):
 d=j.get('domain')
 if not d:return
 require(read(CONFIG)==d['beforeConfig'],'Eski Caddy dosyası geri yüklenmedi')
 current=api();require(current in (d['beforeConfig'],d['afterConfig']),'Caddy dışarıdan değişti; üzerine yazılmadı')
 if current!=d['beforeConfig']:api(d['beforeConfig'])
 run(['systemctl','daemon-reload']);run(['systemctl','restart','coreoflife-forum.service'])

def request_origin(path,certificate=None,port=443,host=HOST):
 # Trust exactly the locally configured certificate, including Cloudflare
 # Origin certificates. Check hostname, dates and handshake without -k.
 context=tls_context(certificate)
 class Pinned(http.client.HTTPSConnection):
  def connect(self):self.sock=context.wrap_socket(socket.create_connection(('127.0.0.1',port),timeout=8),server_hostname=host)
 connection=Pinned(host,timeout=8,context=context)
 try:
  connection.request('GET',path,headers={'Host':host});response=connection.getresponse();body=response.read(2*1024*1024)
  return response.status,dict(response.getheaders()),body
 finally:connection.close()

def health(j):
 checks={}
 for p in ('/','/robots.txt','/forum/api/health','/akademi-kayit'):
  status,headers,body=request_origin(p,j['domain']['certificate'])
  require(status in (200,302,303,307,308),'2D yerel HTTPS yolu hazır değil: '+p+' '+str(status))
  if p=='/':require(b'2d.coreoflife.net' in body,'2D ana site adresi güncellenmedi')
  if p=='/forum/api/health':require(json.loads(body).get('ok') is True,'Forum hazır değil')
  checks[p]=status
 return {'localVerifiedTls':True,'trust':'configured-certificate' if j['domain']['certificate'] else 'system-ca','hostname':HOST,'routes':checks,'publicCloudflareTest':'pending'}
