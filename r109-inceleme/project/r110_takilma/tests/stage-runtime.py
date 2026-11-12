"""Stage the tree that the R110 installer itself produces on an installed R109.

Test-only: the real installer code applies the R110 ZIP to the R109 fixture
(installer_test.Fixture, systemd/HTTP adapters only); the resulting release
directory is copied and given the same local dependency links as the R109
runtime stage. The record is written to evidence/runtime-stage.json here.
"""
import json,shutil,sys,tempfile
from pathlib import Path
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from installer_test import Fixture,m,ROOT,PROJECT
f=Fixture()
try:
 m.apply(f.live,f.z,f.plan);result=json.loads((next(f.control.glob('install-*'))/'result.json').read_text());m.validate_record(result,completed=True)
 out=Path(tempfile.mkdtemp(prefix='r110-installed-'))/'release'
 shutil.copytree(f.root,out,symlinks=True)
 native=out/'native510-bb3a6cc689c6';assert native.is_dir() and not native.is_symlink()
 link=native/'node_modules'
 if link.is_symlink():link.unlink()
 link.symlink_to(str(PROJECT.parent/'node_modules'),target_is_directory=True)
 for runtime in ('http-runtime','accounts-runtime'):
  for name in ('lib','vds-server','node_modules'):
   p=out/runtime/name
   if p.is_symlink():p.unlink()
   if not p.exists():p.symlink_to(native/name,target_is_directory=True)
  (out/runtime/'package.json').write_text('{"type":"module"}')
  (out/runtime/'dist-vds/server/__vite_rsc_assets_manifest.js').write_text('export default {serverResources:{},clientReferenceDeps:{}};')
 record={'release':str(out),'base':'R110 ZIP applied by its own installer to an installed R109_LATENCY2 fixture','package':json.loads((ROOT/'evidence/package.json').read_text()),'installedVersion':json.loads(f.statefile.read_text())['r64Deployment']['version'],'targetCore':result['identity']['targetCore'],'overlay':[{'path':r['path'],'sha256':r['after']} for r in result['files']]}
 (ROOT/'evidence/runtime-stage.json').write_text(json.dumps(record,indent=2)+'\n')
 print(out)
finally:f.close()
