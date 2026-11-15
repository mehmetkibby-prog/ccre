"""Start validation from archived R120 v4 plus the exact five-file R121 installer."""
import json,shutil,tempfile
from pathlib import Path
from installer_test import Fixture,m,ROOT
f=Fixture()
try:
 m.apply(f.live,f.z,f.plan);j=f.result();m.validate_record(j,completed=True)
 out=Path(tempfile.mkdtemp(prefix='r122-installed-'))/'release';shutil.copytree(f.root,out,symlinks=True)
 native=out/'native510-bb3a6cc689c6';link=native/'node_modules'
 if link.is_symlink():link.unlink()
 link.symlink_to(ROOT.parents[1]/'node_modules',target_is_directory=True)
 for runtime in ('http-runtime','accounts-runtime'):
  for name in ('lib','vds-server','node_modules'):
   p=out/runtime/name
   if p.is_symlink():p.unlink()
   if not p.exists():p.symlink_to(native/name,target_is_directory=True)
  (out/runtime/'package.json').write_text('{"type":"module"}')
  (out/runtime/'dist-vds/server/__vite_rsc_assets_manifest.js').write_text('export default {serverResources:{},clientReferenceDeps:{}};')
 record={'release':str(out),'base':'Archived R120 and R121 installed, then exact R122 ZIP applied by its own installer','package':json.loads((ROOT/'evidence/package.json').read_text()),'installedVersion':'R122_RETENTION1','targetCore':j['identity']['targetCore'],'overlay':[{'path':r['path'],'sha256':r['after']} for r in j['files']]}
 (ROOT/'evidence/runtime-stage.json').write_text(json.dumps(record,indent=2)+'\n');print(out)
finally:f.close()
