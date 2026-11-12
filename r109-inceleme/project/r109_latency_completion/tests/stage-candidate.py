"""Stage the installed R109 release plus this working tree's runtime changes.

Test-only. The R109 ZIP is applied to the R105 fixture exactly as in
stage-runtime.py, then every runtime file that differs from the pinned R109
manifest (docs/r109-runtime-manifest.json), or is new in the same runtime
directories, is copied over it. The list is written to the stage record so a
reviewer can see exactly which files the candidate adds. No ZIP, manifest,
SHA256 identity or installer state is changed.
"""
import hashlib,json,shutil,tempfile
from pathlib import Path
from installer_test import Fixture,m,ROOT
REVIEW=ROOT.parents[1]
WORKING=ROOT/'working'
DIRS=['core511-source/scripts/core511','core511-source/scripts/delivery511','native510-bb3a6cc689c6/vds-server/src']
pinned={r['path']:r['sha256'] for r in json.loads((REVIEW/'docs/r109-runtime-manifest.json').read_text())['runtimeFiles']}
def overlay_files():
 rows=[]
 for d in DIRS:
  for p in sorted((WORKING/d).rglob('*')):
   if not p.is_file() or p.is_symlink():continue
   rel=p.relative_to(WORKING).as_posix();key=p.relative_to(REVIEW).as_posix();digest=hashlib.sha256(p.read_bytes()).hexdigest()
   if pinned.get(key)!=digest:rows.append({'path':rel,'sha256':digest,'r109Sha256':pinned.get(key)})
 return rows
f=Fixture()
try:
 m.apply(f.live,f.z,f.plan)
 out=Path(tempfile.mkdtemp(prefix='r110-candidate-'))/'release'
 shutil.copytree(f.root,out,symlinks=True)
 native=out/'native510-bb3a6cc689c6'
 assert native.is_dir() and not native.is_symlink(),'staged native code must be independent'
 (native/'node_modules').mkdir(exist_ok=True)
 if not(native/'node_modules/ws').exists():(native/'node_modules/ws').symlink_to(str(REVIEW/'node_modules/ws'),target_is_directory=True)
 for runtime in ('http-runtime','accounts-runtime'):
  for name in ('lib','vds-server','node_modules'):
   p=out/runtime/name
   if p.is_symlink():p.unlink()
   if not p.exists():p.symlink_to(native/name,target_is_directory=True)
  (out/runtime/'package.json').write_text('{"type":"module"}')
  (out/runtime/'dist-vds/server/__vite_rsc_assets_manifest.js').write_text('export default {serverResources:{},clientReferenceDeps:{}};')
 files=overlay_files()
 for row in files:
  target=out/row['path'];target.parent.mkdir(parents=True,exist_ok=True)
  # Installed R109 file must be the pinned one before it is replaced.
  if row['r109Sha256']:assert hashlib.sha256(target.read_bytes()).hexdigest()==row['r109Sha256'],row['path']
  else:assert not target.exists(),row['path']
  shutil.copyfile(WORKING/row['path'],target)
 (ROOT/'evidence/runtime-stage-candidate.json').write_text(json.dumps({'release':str(out),'base':'installed R109 ZIP on the R105 fixture','overlay':files},indent=2)+'\n')
 print(out)
finally:f.close()
