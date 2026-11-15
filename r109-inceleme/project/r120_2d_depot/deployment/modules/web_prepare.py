"""Prepare the 2d alias with existing Caddy certificate automation.

Only Caddy config and a private recovery journal are written. No DNS, cloud
settings, game database, certificate private key or service restart is touched.
The caller requires maintenance because Caddy reload can reconnect WebSockets.
"""
import hashlib,json,socket,stat,tempfile,time,urllib.request
from urllib.parse import urlsplit
from pathlib import Path
import domain_move as d
from storage import atomic,encoded,read,require,digest

JOURNAL=Path('/var/lib/core511/r120-web/prepare.json')
VERSION='R120_WEB2'
sha=lambda b:hashlib.sha256(b).hexdigest()

def saved():
 require(not JOURNAL.parent.is_symlink() and not JOURNAL.is_symlink(),'Web hazırlık kaydı sembolik bağ olamaz')
 if not JOURNAL.exists():return None
 j=read(JOURNAL)
 require(j.get('version')==VERSION and j['configFile']==str(d.CONFIG),'Web hazırlık kaydı farklı')
 require(sha(bytes.fromhex(j['beforeBytes']))==j['beforeSHA256'],'Eski Caddy yedeği bozuk')
 require(json.loads(bytes.fromhex(j['beforeBytes']))==j['before'],'Eski Caddy yedeği uyuşmuyor')
 require(sha(encoded(j['after']))==j['afterSHA256'] and d.caddy_alias(j['before'])==j['after'],'Web yönlendirme yedeği bozuk')
 return j

def store(j):
 require(not JOURNAL.parent.is_symlink() and not JOURNAL.is_symlink(),'Web hazırlık kayıt yolu farklı')
 JOURNAL.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
 atomic(JOURNAL,encoded(j),0o600)

def current():
 require(d.CONFIG.is_file() and not d.CONFIG.is_symlink(),'Caddy yayın ayarı bulunamadı')
 value=read(d.CONFIG);require(d.api()==value,'Caddy dosya/bellek ayarı farklı; üzerine yazılmadı')
 return value

def validate(config,run):
 with tempfile.TemporaryDirectory(prefix='r120-web-check-') as folder:
  p=Path(folder)/'config.json';p.write_bytes(encoded(config));run(['caddy','validate','--config',p])

def preflight(run):
 before=current();record=saved()
 if record:
  require(before in (record['before'],record['after']),'Caddy hazırlıktan sonra dışarıdan değişmiş; üzerine yazılmadı')
  require(digest(d.CONFIG) in (record['beforeSHA256'],record['afterSHA256']),'Caddy dosyası hazırlıktan sonra değişmiş')
  after=record['after']
 else:
  after=d.caddy_alias(before)
  require(after!=before,'2D kuralları hazır fakat bu paketin hazırlık kaydı yok; önce kayıt incelenmeli')
 try:socket.getaddrinfo(d.HOST,443)
 except OSError:raise RuntimeError('2d DNS kaydı henüz çözümlenemiyor. Yalnız 2d A kaydını kontrol edin; apex/www değişmez.')
 # Defaults enable automatic HTTPS even when apps.tls is absent. Explicit
 # disabling / skipping this new hostname is never overridden silently.
 servers=[s for s in after.get('apps',{}).get('http',{}).get('servers',{}).values() if any(d.HOST in m.get('host',[]) for r in s.get('routes',[]) for m in r.get('match',[]))]
 require(servers,'2D HTTPS sunucusu bulunamadı')
 for s in servers:
  auto=s.get('automatic_https',{})
  require(not auto.get('disable') and not auto.get('disable_certificates') and d.HOST not in auto.get('skip',[]) and d.HOST not in auto.get('skip_certificates',[]),'Bu sunucuda otomatik HTTPS açık değil; ayarı zorla değiştirmedim')
  require(any(str(addr).rsplit(':',1)[-1]=='443' for addr in s.get('listen',[])),'2D için mevcut 443 dinleyicisi gerekli')
 validate(after,run)
 if record:return record
 raw=d.CONFIG.read_bytes();meta=d.CONFIG.stat()
 return {'version':VERSION,'configFile':str(d.CONFIG),'phase':'checked','before':before,'after':after,'beforeBytes':raw.hex(),'beforeSHA256':sha(raw),'afterSHA256':sha(encoded(after)),'mode':stat.S_IMODE(meta.st_mode),'uid':meta.st_uid,'gid':meta.st_gid}

def rollback(say=print):
 j=saved();require(j is not None,'Web hazırlık kaydı yok')
 require(d.CONFIG.is_file() and not d.CONFIG.is_symlink(),'Caddy yayın ayarı farklı')
 current_file=read(d.CONFIG);running=d.api()
 require(current_file in (j['before'],j['after']) and running in (j['before'],j['after']),'Caddy dışarıdan değişti; üzerine yazılmadı')
 require(digest(d.CONFIG) in (j['beforeSHA256'],j['afterSHA256']),'Caddy dosyası dışarıdan değişti')
 j['phase']='restoring';store(j)
 atomic(d.CONFIG,bytes.fromhex(j['beforeBytes']),j['mode'],(j['uid'],j['gid']))
 if running!=j['before']:d.api(j['before'])
 require(current()==j['before'],'Eski Caddy ayarı doğrulanamadı')
 j['phase']='rolled-back';store(j);say('Eski web yönlendirmesi geri yüklendi. Oyun verisi ve DNS değişmedi.')

def wait_ready(config,timeout,say):
 end=time.monotonic()+timeout;next_log=0;last='TLS bekleniyor'
 while True:
  try:
   cert=d.certificate_ready(config)[0]
   status,_,body=d.request_origin('/',cert['path'])
   require(status==200 and (b'Core of Life' in body or b'CORE OF LIFE' in body),'2D ana sayfa doğrulanamadı: '+str(status))
   return {'hostname':d.HOST,'tlsVerified':True,'trust':'configured-certificate' if cert['path'] else 'system-ca','names':cert['names'],'notAfter':cert['notAfter'],'status':status}
  except (RuntimeError,OSError,ValueError) as e:last=str(e)[:180]
  require(time.monotonic()<end,'2D sertifikası/ana sayfası süre içinde hazırlanamadı: '+last)
  if time.monotonic()>=next_log:say('2d.coreoflife.net sertifikası bekleniyor; oyun servisleri yeniden başlatılmadı.');next_log=time.monotonic()+15
  time.sleep(1)

def public_home():
 # Cloudflare-facing HTTPS is separate from the local origin handshake.
 # No credentials/cookies, and no redirects back to the future 3D host.
 with urllib.request.urlopen(d.ORIGIN+'/',timeout=20) as response:
  body=response.read(2*1024*1024)
  require(response.status==200 and urlsplit(response.url).hostname==d.HOST and (b'Core of Life' in body or b'CORE OF LIFE' in body),'Cloudflare üzerinden 2D ana sayfası doğrulanamadı; yönlendirme kuralları incelenmeli')
  return {'status':response.status,'hostname':d.HOST}

def prepare(run,say=print,timeout=150):
 j=preflight(run)
 # The established apex must still be reachable with trusted TLS before and
 # after the alias load. Do not replace a working setup with an unchecked one.
 old_status,_,old_body=d.request_origin('/',host='coreoflife.net')
 require(old_status==200,'Mevcut ana site HTTPS kontrolü geçmedi; ayar değişmedi')
 j['oldPageSHA256']=sha(old_body)
 if current()!=j['after']:
  require(current()==j['before'] and digest(d.CONFIG)==j['beforeSHA256'],'Caddy ön kontrolden sonra değişmiş')
  j['phase']='prepared';store(j)
  try:
   atomic(d.CONFIG,encoded(j['after']),j['mode'],(j['uid'],j['gid']));d.api(j['after'])
   require(current()==j['after'],'Yeni Caddy ayarı etkinleşmedi')
   j['phase']='published';store(j)
  except BaseException:
   rollback(say);raise
 else:store(j)
 try:
  ready=wait_ready(j['after'],timeout,say)
  status,_,body=d.request_origin('/',host='coreoflife.net')
  require(status==old_status and sha(body)==j['oldPageSHA256'],'Mevcut ana site hazırlıkta değişti')
  ready['publicHomepage']=public_home()
  require(current()==j['after'],'Caddy hazırlık sırasında dışarıdan değişti')
  j['phase']='ready';j['verified']=ready;store(j)
 except BaseException:
  rollback(say);raise
 say('WEB HAZIRLIĞI TAMAM. Yeni adın TLS sertifikası ve ana sayfası doğrulandı; eski adres çalışıyor. DNS değişmedi.')
 return ready
