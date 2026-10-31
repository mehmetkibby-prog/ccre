"""Create an immutable admin asset graph from the verified installed release."""
import hashlib,os
from pathlib import Path
from storage import digest,member,read,require,sync_dir
ASSETS='http-runtime/dist-vds/client/assets/'
CORE='core511-source/scripts/core511/'
def prepare_client_updates(live,plan,updates):
 client=plan['client'];old=client['oldNamespace'];new=client['namespace'];old_name=client['oldName'];new_name=client['name']
 require(old!=new and old_name!=new_name,'Panel istemci sürümü değişmemiş')
 rows=read(live.root/'release-manifest.json')['files'];prefix=ASSETS+old+'/';target_prefix=ASSETS+new+'/'
 require(not member(live.root,target_prefix[:-1]).exists(),'Yeni panel istemci dizini zaten var')
 source_rows=[r for r in rows if r['path'].startswith(prefix)];require(source_rows,'Kurulu panel istemci dosyaları bulunamadı')
 generated={n[len(CORE+'generated/client/'):]:data for n,meta,data in updates if n.startswith(CORE+'generated/client/')}
 require(set(generated)==set((client.get('generatedNames') or [new_name,*([client['navName']] if 'navName' in client else [])])),'Oyun istemci dosya kapsamı farklı')
 require(any(r['path']==prefix+old_name for r in source_rows),'Kurulu yönetim paneli dosyası yok')
 output=[];links=[];seen=set(n for n,meta,data in updates)
 def rewrite(data):
  data=data.replace(old.encode(),new.encode()).replace(old_name.encode(),new_name.encode())
  for source,target in client.get('replacements',{}).items():data=data.replace(source.encode(),target.encode())
  return data
 def add(name,data,before=None):
  require(name not in seen,'Tekrarlanan panel dosyası');seen.add(name)
  output.append((name,{'before':before,'after':hashlib.sha256(data).hexdigest(),'bytes':len(data)},data))
 for row in source_rows:
  name=row['path'];short=name[len(prefix):]
  # The new admin body is supplied explicitly, not obtained by renaming old UI.
  if short==old_name or short in generated:continue
  source=member(live.root,name);require(not source.is_symlink(),'Panel varlığı sembolik bağ')
  require(source.stat().st_size==row['bytes'] and digest(source)==row['sha256'],'Panel varlığı doğrulanamadı')
  target=target_prefix+short
  if source.suffix in ('.js','.mjs','.json','.html'):
   before=source.read_bytes();after=rewrite(before)
   if after!=before:add(target,after);continue
  links.append({'path':target,'source':name,'bytes':row['bytes'],'sha256':row['sha256']})
 for name,data in generated.items():
  text=data.decode();text=text.replace('/assets/', '/assets/'+new+'/').replace('"assets/','"assets/'+new+'/').replace("'assets/","'assets/"+new+'/').replace('`assets/','`assets/'+new+'/')
  add(target_prefix+name,text.encode())
 # The source-only export omits some Vite manifests. Bind these to verified
 # live manifest rows and transform exact references, including SSR chunks.
 for row in rows:
  name=row['path']
  if name in seen or not name.startswith('http-runtime/dist-vds/') or name.startswith(ASSETS) or Path(name).suffix not in ('.js','.mjs','.json','.html'):continue
  source=member(live.root,name);require(not source.is_symlink() and digest(source)==row['sha256'],'HTTP istemci başvuru dosyası farklı')
  data=source.read_bytes();after=rewrite(data)
  if after!=data:add(name,after,row['sha256'])
 return output,links
def stage_client_links(root,links):
 directories=set()
 for row in links:
  source=member(root,row['source']);target=member(root,row['path']);require(not target.exists() and digest(source)==row['sha256'],'Panel varlık kopyası değişmiş')
  target.parent.mkdir(parents=True,exist_ok=True,mode=0o755);os.link(source,target)
  directory=target.parent
  while directory!=root:directories.add(directory);directory=directory.parent
 for directory in sorted(directories,key=lambda p:len(p.parts),reverse=True):sync_dir(directory)
