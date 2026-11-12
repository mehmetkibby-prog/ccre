import json,os,shutil,tempfile
from pathlib import Path
from installer_test import Fixture,m,ROOT
baseline=os.environ.get('BOOT_BASELINE')=='1'
f=Fixture()
try:
 if not baseline:m.apply(f.live,f.z,f.plan)
 out=Path(tempfile.mkdtemp(prefix='r102-relocated-'))/'release'
 shutil.copytree(f.root,out,symlinks=True)
 native=out/'native510-bb3a6cc689c6'
 assert native.is_dir() and not native.is_symlink(),'staged native code must be independent'
 (native/'node_modules').mkdir(exist_ok=True)
 if not(native/'node_modules/ws').exists():(native/'node_modules/ws').symlink_to(str(ROOT.parents[1]/'node_modules/ws'),target_is_directory=True)
 for runtime in ('http-runtime','accounts-runtime'):
  for name in ('lib','vds-server','node_modules'):
   p=out/runtime/name
   if p.is_symlink():p.unlink()
   if not p.exists():p.symlink_to(native/name,target_is_directory=True)
  (out/runtime/'package.json').write_text('{"type":"module"}')
  # Unchanged generated asset manifest is absent from the source snapshot.
  # Health/runtime imports use an explicit empty renderer manifest fixture.
  (out/runtime/'dist-vds/server/__vite_rsc_assets_manifest.js').write_text('export default {serverResources:{},clientReferenceDeps:{}};')
 (ROOT/('evidence/runtime-stage-baseline.json' if baseline else 'evidence/runtime-stage.json')).write_text(json.dumps({'release':str(out),'package':json.loads((ROOT/'evidence/package.json').read_text()),'source':'exact installer output; native dependencies pinned; no development import aliases'},indent=2))
 print(out)
finally:f.close()
