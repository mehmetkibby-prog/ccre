"""Verify the existing R79 runtime; R86 never replaces Node or its symlink."""
import json,os,stat,subprocess
from pathlib import Path
from storage import digest,member,require

NODE='runtime/node-v22.23.4-linux-x64/bin/node'
LICENSE='runtime/node-v22.23.4-linux-x64/LICENSE'
NODE_SHA256='94efd062ed066c1a0b332e18249859c905e920eeada5df55d24c99b919629a90'
NODE_BYTES=124902584
ARCHIVE_SHA256='1805bcd35e6815559bd2eb97db438d3fdb0eb3a5e6a977b7c1badca76337e9ce'
LICENSE_SHA256='c738ae413cf561f174e34f6961f8ca458aae2369a73640dda6234c629b98bcc4'
LICENSE_BYTES=145485
VERSIONS={'node':'v22.23.4','sqlite':'3.53.4','modules':'127','arch':'x64','platform':'linux'}
LINK='../'+NODE

def validate_plan(plan):
 r=plan.get('runtime',{})
 require(r.get('path')==NODE and r.get('licensePath')==LICENSE and r.get('sha256')==NODE_SHA256 and r.get('bytes')==NODE_BYTES and r.get('versions')==VERSIONS and r.get('linkPath')=='bin/node' and r.get('linkTarget')==LINK and r.get('archiveSHA256')==ARCHIVE_SHA256,'R79 Node çalışma zamanı kimliği farklı')
 require(not any(n.startswith(('runtime/','bin/')) for n in plan['files']),'R86 mevcut Node çalışma zamanını değiştiremez')
 return r

def binding(root):
 p=member(root,'bin/node')
 require(p.is_symlink() and os.readlink(p)==LINK and p.resolve()==member(root,NODE).resolve(),'R79 Node bağı farklı')
 return {'kind':'symlink','target':LINK}

def prepare_manifest(root,manifest,plan):
 validate_plan(plan);binding(root)
 links=[r for r in manifest.get('symlinks',[]) if r['path']=='bin/node']
 require(len(links)==1 and links[0]['target']==LINK and not any(r['path']=='bin/node' for r in manifest['files']),'R79 Node bağı manifestle eşleşmiyor')
 for name,sha,size,executable in ((NODE,NODE_SHA256,NODE_BYTES,True),(LICENSE,LICENSE_SHA256,LICENSE_BYTES,False)):
  rows=[r for r in manifest['files'] if r['path']==name]
  require(len(rows)==1 and rows[0]['sha256']==sha and rows[0]['bytes']==size and rows[0].get('executable') is executable,'R79 çalışma zamanı manifesti farklı')
 # Deliberately no edits: the pinned runtime stays byte-for-byte R79.

def assert_runtime(root,plan):
 validate_plan(plan);binding(root)
 for name,sha,size,executable in ((NODE,NODE_SHA256,NODE_BYTES,True),(LICENSE,LICENSE_SHA256,LICENSE_BYTES,False)):
  p=member(root,name)
  require(not p.is_symlink() and p.is_file() and p.stat().st_size==size and digest(p)==sha and bool(p.stat().st_mode&0o111)==executable,'R79 çalışma zamanı dosyası farklı: '+name)
 result=subprocess.run([str(root/'bin/node'),'-p','JSON.stringify({node:process.version,sqlite:process.versions.sqlite,modules:process.versions.modules,arch:process.arch,platform:process.platform})'],capture_output=True,text=True,timeout=20)
 require(result.returncode==0,'Mevcut R79 Node başlatılamadı')
 require(json.loads(result.stdout)==VERSIONS,'Mevcut R79 Node/SQLite sürümü farklı')
 return VERSIONS
