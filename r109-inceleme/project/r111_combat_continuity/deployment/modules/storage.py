"""Immutable release staging and durable small-file writes; no SQL mutations."""
import contextlib,fcntl,hashlib,json,os,re,shutil,stat,tempfile,time
from pathlib import Path

def require(ok,message):
 if not ok:raise RuntimeError(message)
def read(file):return json.loads(Path(file).read_bytes())
def encoded(value):return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()
def digest(file):
 h=hashlib.sha256()
 with Path(file).open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def atomic(file,data,mode=0o600,owner=None):
 file=Path(file);file.parent.mkdir(parents=True,exist_ok=True)
 if file.exists():
  st=file.stat();owner=(st.st_uid,st.st_gid) if owner is None else owner
 fd,tmp=tempfile.mkstemp(prefix='.r64-',dir=file.parent)
 try:
  os.fchmod(fd,mode)
  if owner is not None:os.fchown(fd,*owner)
  with os.fdopen(fd,'wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
  os.replace(tmp,file);sync_dir(file.parent)
 finally:
  if os.path.exists(tmp):os.unlink(tmp)
def sync_dir(folder):
 fd=os.open(folder,os.O_RDONLY)
 try:os.fsync(fd)
 finally:os.close(fd)
def journal(file,value):atomic(file,encoded(value))
def descriptor(file):
 p=Path(file).resolve();s=p.stat();require(stat.S_ISREG(s.st_mode),'Normal dosya gerekli')
 return {'path':str(p),'device':s.st_dev,'inode':s.st_ino}
def member(root,name):
 p=Path(name);require(not p.is_absolute() and '..' not in p.parts and p.parts,'Paket yolu geçersiz')
 target=root/p;require(target.resolve().is_relative_to(root.resolve()),'Paket yolu dışarı çıkıyor')
 return target
@contextlib.contextmanager
def lock(path):
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
 fd=os.open(path,os.O_RDWR|os.O_CREAT|os.O_NOFOLLOW,0o600)
 try:
  require(os.fstat(fd).st_nlink==1,'Kilit dosyası geçersiz')
  fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB);yield
 finally:os.close(fd)

MEDIA={'.webp','.png','.jpg','.jpeg','.gif','.svg','.mp4','.webm','.mp3','.ogg','.wav','.woff','.woff2','.ttf'}
def release_stats(root):
 count=0;copied=0;linked=0;seen=set()
 for folder,dirs,files in os.walk(root,followlinks=False):
  for name in files:
   p=Path(folder)/name
   if p.is_symlink():continue
   s=p.stat();require(stat.S_ISREG(s.st_mode),'Sürümde özel dosya var')
   require(not p.name.endswith(('.sqlite','.sqlite-wal','.sqlite-shm','.db')),'Sürüm klasöründe kalıcı veritabanı bulundu')
   count+=1
   if p.suffix.lower() in MEDIA:linked+=s.st_size
   else:
    identity=(s.st_dev,s.st_ino)
    if identity not in seen:copied+=s.st_size;seen.add(identity)
 return {'files':count,'copyBytes':copied,'linkedMediaBytes':linked}
def clone_release(source,destination):
 source=Path(source).resolve();destination=Path(destination)
 require(not destination.exists() and not destination.is_symlink(),'Hedef sürüm zaten var')
 destination.mkdir(mode=0o755);seen=0;last=time.monotonic();copies={}
 def attributes(a,b):
  shutil.copystat(a,b,follow_symlinks=False);s=a.lstat();os.chown(b,s.st_uid,s.st_gid,follow_symlinks=False)
 def link(a,b):
  target=os.readlink(a)
  require(not Path(target).is_absolute() and a.resolve().is_relative_to(source),'Sürüm dışına çıkan sembolik bağ')
  os.symlink(target,b);attributes(a,b)
 for folder,dirs,files in os.walk(source,followlinks=False):
  src=Path(folder);dst=destination/src.relative_to(source)
  for name in dirs[:]:
   a=src/name;b=dst/name
   if a.is_symlink():link(a,b);dirs.remove(name)
   else:b.mkdir(mode=0o755);attributes(a,b)
  for name in files:
   a=src/name;b=dst/name
   if a.is_symlink():link(a,b)
   elif a.suffix.lower() in MEDIA:os.link(a,b)
   else:
    st=a.stat();identity=(st.st_dev,st.st_ino)
    if identity in copies:os.link(copies[identity],b)
    else:
     shutil.copyfile(a,b);attributes(a,b);copies[identity]=b
     with b.open('rb') as copied:os.fsync(copied.fileno())
   seen+=1
   if time.monotonic()-last>=5:print('Ayrı oyun sürümü hazırlanıyor: '+str(seen)+' dosya',flush=True);last=time.monotonic()
 # Persist the completed tree before selecting it through the systemd config.
 for folder,dirs,files in os.walk(destination,topdown=False,followlinks=False):sync_dir(folder)
 attributes(source,destination);sync_dir(destination);sync_dir(destination.parent)
 return seen
def overlay(root,updates):
 for name,meta,data in updates:
  p=member(root,name)
  require(not p.is_symlink(),'Güncellenecek dosya sembolik bağ')
  require((digest(p) if p.exists() else None)==meta['before'],'Paket başlangıç dosyası değişmiş: '+name)
  require(len(data)==meta['bytes'] and hashlib.sha256(data).hexdigest()==meta['after'],'Paket dosyası doğrulanamadı: '+name)
  st=p.stat() if p.exists() else root.stat()
  mode=(0o755 if meta['executable'] else 0o644) if 'executable' in meta else (stat.S_IMODE(st.st_mode) if p.exists() else 0o644)
  require('executable' not in meta or isinstance(meta['executable'],bool),'Dosya çalışma izni geçersiz')
  atomic(p,data,mode,(st.st_uid,st.st_gid))
