"""Validate reachable same-release JS/CSS imports before services are stopped."""
import re,posixpath
from storage import require,read,digest
from inplace_stage import checked_path

REFERENCES=re.compile(r'''["'`]((?:\./|/?assets/)[^"'`\s\\<>]*\.(?:js|css))["'`]''')

def existing(live,plan):
 """Validation-only entries; never feed unchanged files into the write stage."""
 prefix='http-runtime/dist-vds/client/assets/'+plan['namespace']+'/'
 entries=[]
 account=live.root/'accounts-runtime/dist-vds/client'
 shared=account.resolve()==(live.root/'http-runtime/dist-vds/client').resolve()
 require(shared or (account.is_dir() and not account.is_symlink()),'Hesap istemci dizini farklı')
 for row in read(live.root/'release-manifest.json')['files']:
  name=row['path']
  if not name.startswith(prefix) or not name.endswith(('.js','.css')):continue
  file=checked_path(live.root,name)
  require(file.is_file() and file.stat().st_size==row['bytes'] and digest(file)==row['sha256'],'İstemci kaynağı manifestle eşleşmiyor: '+name)
  if not shared:
   other=checked_path(live.root,name.replace('http-runtime/','accounts-runtime/',1))
   require(other.is_file() and other.stat().st_size==row['bytes'] and digest(other)==row['sha256'],'Hesap ve oyun istemci dosyaları farklı: '+name)
  entries.append((name,{'before':row['sha256'],'after':row['sha256'],'bytes':row['bytes'],'linkSource':name},None))
 return entries

def validate_existing(live,plan):return validate(live,plan,existing(live,plan))

def validate(live,plan,updates):
 prefix='http-runtime/dist-vds/client/assets/'+plan['namespace']+'/'
 assets={name[len(prefix):]:(meta,data) for name,meta,data in updates if name.startswith(prefix)}
 pending=[plan[k] for k in ('portal','game','admin')];seen=set();edges=0
 while pending:
  name=pending.pop()
  if name in seen:continue
  require(name in assets,'İstemci dosyası eksik: '+name)
  meta,data=assets[name]
  if data is None:data=checked_path(live.root,meta['linkSource']).read_bytes()
  seen.add(name)
  if not name.endswith(('.js','.css')):continue
  references=REFERENCES.findall(data.decode('utf-8'))
  if name==plan['portal']:
   games={posixpath.basename(p) for p in references if posixpath.basename(p).startswith('game-client-') and p.endswith('.js')}
   require(games=={plan['game']},'Giriş dosyası güncel oyun sürümüne bağlı değil')
  for reference in references:
   if reference.startswith('./'):
    target=posixpath.normpath(posixpath.join(posixpath.dirname(name),reference))
   else:
    absolute='/'+reference.lstrip('/');expected='/assets/'+plan['namespace']+'/'
    require(absolute.startswith(expected),'İstemci sürümü dışında dosya bağlantısı: '+name+' -> '+reference)
    target=absolute[len(expected):]
   require(not target.startswith('../') and target in assets,'İstemci dosyası eksik: '+name+' -> '+target)
   pending.append(target);edges+=1
 return {'files':len(seen),'edges':edges}
