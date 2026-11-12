"""Pinned, small marketing-site delta; never republish an entire site tree."""
from pathlib import Path
from storage import require,digest
import hashlib
SITE=Path('/opt/coreoflife-site/current')
def changes(z,plan):
 if plan.get('site') is None:return []
 spec=plan['site'];require(spec['root']=='/opt/coreoflife-site/current','Site hedefi farklı')
 root=SITE.resolve();require(root.is_dir() and root.is_relative_to(SITE.parent.resolve()),'Ana site dizini farklı')
 def safe(name):
  p=root/name
  require(not Path(name).is_absolute() and '..' not in Path(name).parts and p.resolve().is_relative_to(root),'Site dosya yolu farklı')
  require(not p.is_symlink() and p.parent.is_dir() and p.parent.resolve()==p.parent,'Site dosyası veya klasörü farklı')
  return p
 old=spec['sourceLauncher'];p=safe(old['path']);require(p.is_file() and digest(p)==old['sha256'],'Ana site giriş betiği değiştirilmiş; otomatik üzerine yazılmadı')
 result=[]
 for name,meta in spec['files'].items():
  p=safe(name);before=digest(p) if p.is_file() else None
  require(before in (meta['before'],meta['after']),'Ana site ön kontrolden önce değiştirilmiş: '+name)
  data=z.read('site/'+name);require(len(data)==meta['bytes'] and hashlib.sha256(data).hexdigest()==meta['after'],'Site paket içeriği bozuk')
  if before==meta['after']:continue
  result.append((p,before,data))
 # Immutable dependencies first, index last: navigation never sees missing assets.
 return sorted(result,key=lambda x:x[0].name=='index.html')
def apply(rows,j,external):
 for p,before,data in rows:
  require(not p.is_symlink() and (digest(p) if p.is_file() else None)==before,'Site kurulum sırasında değiştirilmiş; üzerine yazılmadı')
  external(j,p,data)
