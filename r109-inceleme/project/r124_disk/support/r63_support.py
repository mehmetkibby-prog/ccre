"""Small subset of the established source identity format. No legacy installer."""
import hashlib,json,urllib.request
from storage import require

def identity_from_rows(rows):
 rows=sorted(rows,key=lambda r:tuple(r['path'].split('/')))
 body={'kind':'core511-source-candidate-v1','baselineManifestSha256':'bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b','files':[{k:r[k] for k in ('path','bytes','sha256')} for r in rows]}
 return hashlib.sha256(json.dumps(body,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def core_rows(root):
 rows=[]
 def walk(folder):
  for p in sorted(folder.iterdir(),key=lambda f:f.name):
   if p.name.startswith('.') or p.name in ('evidence','node_modules') or p.is_symlink():continue
   if p.is_dir():walk(p)
   elif p.is_file() and p.suffix in ('.mjs','.js','.json','.c'):
    b=p.read_bytes();rows.append({'path':p.relative_to(root).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
 walk(root);return rows
def core_identity(root):return identity_from_rows(core_rows(root))
def local(port,endpoint):
 with urllib.request.build_opener(urllib.request.ProxyHandler({})).open('http://127.0.0.1:'+str(port)+endpoint,timeout=3) as r:
  b=r.read(131073);require(len(b)<=131072,'Yerel yanıt çok büyük');return json.loads(b)
