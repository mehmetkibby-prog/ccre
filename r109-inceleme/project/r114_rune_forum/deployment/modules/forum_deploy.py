"""Separate forum process/data, journaled Caddy routes and crash-safe code rollback."""
import copy,getpass,hashlib,json,os,pwd,re,subprocess,tempfile,time,urllib.request
from pathlib import Path
from storage import require,encoded,digest,atomic,read
ROOT=Path('/opt/coreoflife-forum');DATA=Path('/var/lib/coreoflife-forum')
CONFIG=Path('/etc/caddy/coreoflife-realms-417.json');SYSTEMD=Path('/etc/systemd/system')
USER='coreoflife-forum';ORIGIN='https://coreoflife.net';VERSION='R114_RUNE_FORUM1'
SERVICE='coreoflife-forum.service';BACKUP='coreoflife-forum-backup.service';TIMER='coreoflife-forum-backup.timer'
IDS={'col-forum-r114','col-forum-www-r114'}
def api(path='config/',value=None):
 req=urllib.request.Request('http://127.0.0.1:2019/'+path,data=encoded(value) if value is not None else None,headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=15) as response:
  data=response.read();return json.loads(data) if data else None

def transform(config):
 result=copy.deepcopy(config);targets=[]
 for key,server in result.get('apps',{}).get('http',{}).get('servers',{}).items():
  routes=server.get('routes',[])
  require(not any(r.get('@id') in IDS for r in routes),'Forum zaten yönlendirilmiş; mevcut kurulum incelenmeli')
  if any(r.get('@id')=='col-marketing-pages-v2' for r in routes):
   require(any('coreoflife.net' in m.get('host',[]) for r in routes for m in r.get('match',[])),'Ana site alan adı farklı')
   targets.append(key)
   routes[0:0]=[
    {'@id':'col-forum-www-r114','match':[{'host':['www.coreoflife.net'],'path':['/forum','/forum/*']}],'handle':[{'handler':'static_response','status_code':308,'headers':{'Location':['https://coreoflife.net{http.request.uri}']}}],'terminal':True},
    {'@id':'col-forum-r114','match':[{'host':['coreoflife.net'],'path':['/forum','/forum/*']}],'handle':[{'handler':'reverse_proxy','upstreams':[{'dial':'127.0.0.1:8114'}],'headers':{'request':{'set':{'X-Real-IP':['{http.request.client_ip}'],'Host':['coreoflife.net']}}}}],'terminal':True}]
 require(len(targets)==1,'Tek ana site Caddy yönlendirmesi bulunamadı')
 check=copy.deepcopy(result)
 for server in check['apps']['http']['servers'].values():server['routes']=[r for r in server.get('routes',[]) if r.get('@id') not in IDS]
 require(check==config,'Forum dışındaki ağ ayarı değişiyor')
 return result

def units(node,release):
 # CPU/memory limits apply only to the independent forum service.
 common=f'User={USER}\nGroup={USER}\nUMask=0077\nNoNewPrivileges=true\nPrivateTmp=true\nProtectSystem=strict\nProtectHome=true\nReadWritePaths={DATA}\nRestrictSUIDSGID=true\nEnvironment=FORUM_DB={DATA}/forum.sqlite\n'
 main=f'[Unit]\nDescription=Core of Life community forum R114\nAfter=network.target\nStartLimitIntervalSec=60\nStartLimitBurst=10\n[Service]\nType=simple\n{common}WorkingDirectory={release}\nEnvironment=FORUM_ORIGIN={ORIGIN}\nEnvironment=FORUM_TRUST_PROXY=1\nExecStart={node} {release}/server.mjs\nRestart=on-failure\nRestartSec=3\nTimeoutStopSec=20\nMemoryMax=512M\nCPUQuota=50%\nTasksMax=64\n[Install]\nWantedBy=multi-user.target\n'
 backup=f'[Unit]\nDescription=Verified daily Core of Life forum backup\n[Service]\nType=oneshot\n{common}ExecStart=/usr/bin/flock -n {DATA}/backup.lock {node} {release}/backup.mjs\nMemoryMax=256M\nCPUQuota=25%\nNice=10\nIOSchedulingClass=idle\n'
 timer=f'[Unit]\nDescription=Daily forum backup schedule\n[Timer]\nOnCalendar=*-*-* 03:20:00\nRandomizedDelaySec=20m\nPersistent=true\nUnit={BACKUP}\n[Install]\nWantedBy=timers.target\n'
 return{SERVICE:main.encode(),BACKUP:backup.encode(),TIMER:timer.encode()}

def validate_payload(z,spec):
 require(spec['version']==VERSION and re.fullmatch('[a-f0-9]{16}',spec['release']),'Forum paket kimliği farklı')
 for name,row in spec['files'].items():
  p=Path(name);require(not p.is_absolute() and '..' not in p.parts and p.suffix in ('.mjs','.html','.js','.css','.webp','.woff2'),'Forum dosyası kapsamı farklı')
  b=z.read('forum/'+name);require(len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256'],'Forum dosyası bozuk: '+name)
 require({'server.mjs','create-admin.mjs','backup.mjs','public/index.html'}<=set(spec['files']),'Forum paket içeriği eksik')

def prepare(live,z,plan,run):
 spec=plan['forum'];validate_payload(z,spec)
 require(CONFIG.is_file() and not CONFIG.is_symlink(),'Etkin Caddy JSON ayarı bulunamadı')
 before=read(CONFIG);require(api()==before,'Caddy bellek ve dosya ayarları farklı; üzerine yazılmadı')
 after=transform(before)
 require(not ROOT.is_symlink() and not DATA.is_symlink(),'Forum klasörü sembolik bağ olamaz')
 release=ROOT/'releases'/spec['release'];require(not release.exists(),'Forum sürüm dizini zaten var')
 require(all(not (SYSTEMD/n).exists() for n in (SERVICE,BACKUP,TIMER)),'Mevcut forum servisi üzerine kurulmadı')
 if (DATA/'forum.sqlite').exists():
  require(not (DATA/'forum.sqlite').is_symlink() and (DATA/'owner.json').is_file() and read(DATA/'owner.json')=={'product':'coreoflife-forum','schema':1},'Önceki forum verisinin sahipliği doğrulanamadı')
 with tempfile.TemporaryDirectory(prefix='col-forum-check-') as d:
  file=Path(d)/'caddy.json';file.write_bytes(encoded(after));run(['caddy','validate','--config',file])
 import socket
 with socket.socket() as sock:
  try:sock.bind(('127.0.0.1',8114))
  except OSError:raise RuntimeError('Forum için 8114 portu kullanımda')
 run([live.node,'--input-type=module','-e',"import {DatabaseSync,backup} from 'node:sqlite';if(typeof backup!=='function')process.exit(1)"])
 return{'beforeSHA256':digest(CONFIG),'beforeConfig':before,'afterConfig':after,'release':str(release),'files':spec['files']}

def apply(live,z,plan,j,external,persist,run):
 pending=plan['_forumPrepared'];release=Path(pending['release'])
 require(digest(CONFIG)==pending['beforeSHA256'] and api()==pending['beforeConfig'],'Caddy kurulum sırasında değişti')
 require(not release.exists(),'Forum sürüm yolu değişti')
 # Journal precedes service/config writes; data survives every rollback.
 j['forum']={**pending,'node':str(live.node),'data':str(DATA),'phase':'prepared'};persist(j)
 try:account=pwd.getpwnam(USER)
 except KeyError:
  run(['useradd','--system','--user-group','--home-dir',DATA,'--no-create-home','--shell','/usr/sbin/nologin',USER]);account=pwd.getpwnam(USER)
 require(account.pw_uid!=0 and account.pw_shell in ('/usr/sbin/nologin','/sbin/nologin','/bin/false'),'Forum servis hesabı uygun değil')
 DATA.mkdir(parents=True,exist_ok=True,mode=0o700);os.chmod(DATA,0o700);os.chown(DATA,account.pw_uid,account.pw_gid)
 atomic(DATA/'owner.json',encoded({'product':'coreoflife-forum','schema':1}),0o600,(account.pw_uid,account.pw_gid))
 # The executable ZIP sets umask 0077. Code must remain traversable by the
 # dedicated forum user; only its database/backups remain private (0700/0600).
 for directory in (ROOT,ROOT/'releases',release):
  require(not directory.is_symlink(),'Forum kod klasörü sembolik bağ olamaz')
  directory.mkdir(parents=True,exist_ok=True,mode=0o755);os.chmod(directory,0o755)
 for name in pending['files']:
  p=release/name
  for directory in reversed(p.parent.parents):
   if directory!=release and directory.is_relative_to(release):
    directory.mkdir(exist_ok=True,mode=0o755);os.chmod(directory,0o755)
  p.parent.mkdir(exist_ok=True,mode=0o755);os.chmod(p.parent,0o755)
  external(j,p,z.read('forum/'+name))
 run(['runuser','-u',USER,'--',live.node,'--version'])
 for name,data in units(live.node,release).items():external(j,SYSTEMD/name,data)
 run(['systemctl','daemon-reload']);j['forum']['phase']='starting';persist(j)
 run(['systemctl','enable',SERVICE,TIMER]);run(['systemctl','start',SERVICE]);health(run,proxy=False)
 external(j,CONFIG,encoded(pending['afterConfig']));api('load',pending['afterConfig']);require(api()==pending['afterConfig'],'Forum yönlendirmesi yüklenemedi')
 j['forum']['phase']='published';persist(j);health(run)
 run(['systemctl','start',BACKUP]);run(['systemctl','start',TIMER]);j['forum']['phase']='ready';persist(j)

def health(run,proxy=True):
 end=time.monotonic()+20;last=None
 while time.monotonic()<end:
  try:
   with urllib.request.urlopen('http://127.0.0.1:8114/forum/api/health',timeout=2) as r:v=json.load(r)
   require(v.get('ok') is True and v.get('version')==VERSION and v.get('demo') is False,'Forum sürümü veya veri modu yanlış')
   if proxy:
    response=json.loads(run(['curl','--fail','--silent','--show-error','--connect-timeout','3','--max-time','8','--noproxy','*','--resolve','coreoflife.net:443:127.0.0.1',ORIGIN+'/forum/api/health']))
    require(response==v,'HTTPS forum yönlendirmesi doğrulanamadı')
   return v
  except Exception as e:last=e;time.sleep(.25)
 raise RuntimeError('Forum açılışı doğrulanamadı: '+str(last)[:150])

def stop(j,run):
 if 'forum' not in j:return
 # Only these freshly-created units belong to this installation.
 for unit in (TIMER,BACKUP,SERVICE):
  if (SYSTEMD/unit).exists():run(['systemctl','stop',unit])
 for unit in (TIMER,SERVICE):
  if (SYSTEMD/unit).exists():run(['systemctl','disable',unit])

def restored(j,run):
 if 'forum' not in j:return
 before=j['forum']['beforeConfig'];require(read(CONFIG)==before,'Eski Caddy dosyası geri yüklenmedi')
 current=api();require(current in (before,j['forum']['afterConfig']),'Caddy kurtarma sırasında dışarıdan değiştirildi')
 if current!=before:api('load',before)
 require(api()==before,'Eski ağ yönlendirmesi doğrulanamadı');run(['systemctl','daemon-reload'])
 # Empty code directories are safe to remove; the DB and its backups remain.
 release=Path(j['forum']['release'])
 if release.exists():
  for d in sorted((p for p in release.rglob('*') if p.is_dir()),key=lambda p:len(p.parts),reverse=True):
   if not any(d.iterdir()):d.rmdir()
  if not any(release.iterdir()):release.rmdir()

def create_admin(live,run):
 unit=SYSTEMD/SERVICE;require(unit.is_file(),'Önce R114 kurulmalı')
 matches=re.findall(r'^ExecStart=\S+ (/opt/coreoflife-forum/releases/[a-f0-9]{16})/server.mjs$',unit.read_text(),re.M)
 require(len(matches)==1,'Forum servis kaydı farklı')
 name=input('Forum yönetici kullanıcı adı: ').strip();email=input('Yönetici e-posta adresi: ').strip()
 password=getpass.getpass('Forum yönetici parolası (en az 12 karakter): ');repeat=getpass.getpass('Parola tekrar: ')
 require(password==repeat,'Parolalar eşleşmiyor')
 args=['runuser','-u',USER,'--','env','FORUM_DB='+str(DATA/'forum.sqlite'),str(live.node),matches[0]+'/create-admin.mjs']
 result=subprocess.run(args,input=json.dumps({'name':name,'email':email,'password':password}),text=True,capture_output=True,timeout=30)
 require(result.returncode==0,'Yönetici oluşturulamadı; kullanıcı adı/e-posta benzersiz, parola en az 12 karakter olmalı.')
 print('Yönetici hazır. https://coreoflife.net/forum → Giriş yap. Yeni konu aç ile duyuru yayınlayabilirsin.')
