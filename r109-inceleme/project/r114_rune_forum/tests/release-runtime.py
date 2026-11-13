"""Verify actual installed R114 server and browser entry for both realms."""
import json,os,re,shutil,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];REVIEW=ROOT.parent.parent;GAME=ROOT.parent/'r109_latency_completion';OUT=ROOT/'evidence'
stage=json.loads((OUT/'runtime-stage.json').read_text());release=Path(stage['release']);record=json.loads((OUT/'package.json').read_text());assert stage['package']['sha256']==record['sha256']
import zipfile
with zipfile.ZipFile(ROOT/record['file']) as z:plan=json.loads(z.read('plan.json'))
# The HTTP wrapper fixture's RSC references are rewritten to the exact installed
# namespace, just like the production server renderer. JS/CSS files are copied
# byte for byte from the installer output, with no missing-module fallback.
assets=OUT/'installed-browser';assets.mkdir(exist_ok=True)
shutil.copytree(release/'http-runtime/dist-vds/client/assets',assets/'assets',dirs_exist_ok=True)
for name in ('index.html','accounts-index.html'):
 text=(ROOT.parent/'r105_performance_review/evidence/final-browser-assets'/name).read_text()
 text=text.replace('core511-1025c65a35480d96',plan['namespace']).replace('game-client-core511-r105-4a0d3559a0e0e553.js',plan['game']).replace('auth-portal-core511-r105-eab63de9b642530e.js',plan['portal'])
 (assets/name).write_text(text)
env={**os.environ,'RUNTIME_STAGE_FILE':str(OUT/'runtime-stage.json'),'RUNTIME_EVIDENCE_DIR':str(OUT),'RUNTIME_LABEL':'relocated-r114','RUNTIME_EXPECT_R110':'1','RUNTIME_EXPECT_R111':'1','RUNTIME_EXPECT_R112':'1','RUNTIME_EXPECT_R113':'1','RUNTIME_EXPECT_R114':'1','HANDOFF_STAGE_FILE':str(OUT/'runtime-stage.json'),'HANDOFF_EVIDENCE_FILE':str(OUT/'ws-handoff-runtime.json')}
checks=[('runtime',['python3',str(REVIEW/'scripts/run.py'),'--test','--test-concurrency=1',str(GAME/'tests/relocated-entry.test.mjs'),str(GAME/'tests/ws-handoff-runtime.test.mjs')],env)]
for rid in ('r1','r2'):
 cfg={**env,'STUTTER_TREE':str(release),'CLIENT_TREE':str(release),'AUDIT_ASSETS':str(assets),'R102_TEST_REALM':rid,'PREVIEW_NAME':'r114-release','TOWER':'1','BROWSER_WS_TRANSPORT':'handoff'}
 checks.append(('browser-'+rid,['python3',str(REVIEW/'scripts/run.py'),str(GAME/'tests/tower-browser.mjs')],cfg))
results=[]
for name,cmd,cfg in checks:
 start=time.time()
 with open(OUT/('release-'+name+'.log'),'w') as f:code=subprocess.run(cmd,cwd=REVIEW,env=cfg,stdout=f,stderr=subprocess.STDOUT).returncode
 row={'name':name,'exitCode':code,'seconds':round(time.time()-start,2)};results.append(row);print(json.dumps(row),flush=True)
 if name.startswith('browser-'):
  rid=name.split('-')[1];src=GAME/'evidence'/('browser-'+rid+'-hud-r114-release')/'report.json'
  if src.exists():shutil.copyfile(src,OUT/('game-browser-'+rid+'.json'))
 (OUT/'release-runtime.json').write_text(json.dumps({'packageSHA256':record['sha256'],'checks':results,'live':False},indent=2)+'\n')
 if code:raise SystemExit(code)
