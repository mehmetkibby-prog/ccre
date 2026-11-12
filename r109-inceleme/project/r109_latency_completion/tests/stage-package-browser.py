"""Stage exact unchanged installed assets; no historical aliases or rewrites."""
import json,os,shutil
from pathlib import Path
from installer_test import Fixture,m,ROOT
f=Fixture()
try:
 m.apply(f.live,f.z,f.plan)
 out=Path(os.environ.get('R106_ASSET_STAGE',str(ROOT/'evidence/chat-browser-assets')))
 out.mkdir(parents=True,exist_ok=True)
 shutil.copytree(f.root/'http-runtime/dist-vds/client/assets',out/'assets',dirs_exist_ok=True)
 for name in ('index.html','accounts-index.html'):
  shutil.copyfile(ROOT.parent/'r105_performance_review/evidence/final-browser-assets'/name,out/name)
 graph=m.asset_graph.validate_existing(f.live,f.plan)
 (ROOT/'evidence/package-browser-assets.json').write_text(json.dumps({'package':json.loads((ROOT/'evidence/package.json').read_text()),'graph':graph,'source':'exact installer output; unchanged R105 clients','fallback':False},indent=2)+'\n')
 print(graph)
finally:f.close()
