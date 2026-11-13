"""Bind reported checks and every delivered file to the final immutable ZIP."""
import hashlib,json,re,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];EV=ROOT/'evidence';PROJECT=ROOT.parent;REVIEW=PROJECT.parent
p=json.loads((EV/'package.json').read_text());runtime=json.loads((EV/'release-runtime.json').read_text());reg=json.loads((EV/'release-regressions.json').read_text())
assert len(reg)==6 and len(runtime['checks'])==3 and all(r['exitCode']==0 for r in reg+runtime['checks'])
assert runtime['packageSHA256']==p['sha256'];assert hashlib.sha256((ROOT/p['file']).read_bytes()).hexdigest()==p['sha256']
counts={}
for row in reg:
 text=(EV/('release-'+row['check']+'.log')).read_text();counts[row['check']]=int(re.findall(r'^# pass (\d+)',text,re.M)[-1]);assert re.findall(r'^# fail (\d+)',text,re.M)[-1]=='0'
installer=(EV/'installer-final.log').read_text();assert 'FAILED' not in installer and re.search(r'\nOK\s*$',installer);counts['r114Installer']=int(re.findall(r'Ran (\d+) tests',installer)[-1])
counts['exactInstalledRuntime']=3;counts['forumBrowserChecks']=len(json.loads((EV/'forum-browser.json').read_text())['checks']);counts['mainSiteViewports']=len(json.loads((EV/'site-browser.json').read_text())['checks']);counts['realHttpsProxy']=1
for n in ['forum-browser','site-browser','caddy-integration']:assert json.loads((EV/(n+'.json')).read_text())['passed']
for rid in ['r1','r2']:
 report=json.loads((EV/('game-browser-'+rid+'.json')).read_text());assert report['passed'] and not report['errors'] and not report['missingAssets'];counts['gameBrowser_'+rid]=len(report['checks'])
real=json.loads((EV/'relocated-r114-runtime.json').read_text());assert real['realChannels']==8 and real['cleanShutdown'];assert all(v['health']['runeForum']=='R114_RUNE_FORUM1' and v['health']['engineReadyR113'] for v in real['realms'])
with zipfile.ZipFile(ROOT/p['file']) as z:
 plan=json.loads(z.read('plan.json'));assert z.testzip() is None
 assert set(plan['sources'])=={'R113_ENGINE1'};assert not plan['databaseChanges'] and not plan['databaseSchemaChanges'];assert len(plan['files'])==8
 for name,meta in plan['forum']['files'].items():
  assert hashlib.sha256(z.read('forum/'+name)).hexdigest()==meta['sha256'];assert z.read('forum/'+name)==(ROOT/'forum'/name).read_bytes()
 for name,meta in plan['files'].items():assert z.read('payload/'+name)==(PROJECT/'r109_latency_completion/working'/name).read_bytes()
 for name,checksum in json.loads(z.read('modules.json')).items():
  assert hashlib.sha256(z.read('modules/'+name)).hexdigest()==checksum;assert z.read('modules/'+name)==(ROOT/'deployment/modules'/name).read_bytes()
 assert z.read('site/index.html')==(REVIEW/'website/index.html').read_bytes()
 assert not any(n.endswith(('.sqlite','.db','.pem','.cpuprofile')) for n in z.namelist())
prior=[(PROJECT/'r109_latency_completion/delivery/r109-gecikme.zip','1ba96d415891f8d474188edb64331b87b7bc12fdfb54733f49918a906e6ef068'),(PROJECT/'r110_takilma/delivery/r110-takilma.zip','4fd1fbb8a36de2ae89fb693f5617ac3a8e697f2608f4a6b14464b6703a83bcc0'),(PROJECT/'r113_engine/artifacts/R113_ENGINE_76cd8cd4c40f.zip','4399dfe08550ebf04bd4c8ea7fbab8cedcdb804fd851495dd17847a0eabbcbc3')]
for file,checksum in prior:assert hashlib.sha256(file.read_bytes()).hexdigest()==checksum
p['acceptance']='functional-and-recovery-checks-passed';p['checks']=counts;p['deployed']=False;(EV/'package.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
v={'version':'R114_RUNE_FORUM1','packageSHA256':p['sha256'],'passed':True,'counts':counts,'scope':['rune/rune_v2 geometry','standalone forum','main-site navigation','two-realm installation and rollback'],'live':False,'loadTestRun':False,'limits':['systemd installer lifecycle uses local adapters; generated units passed systemd-analyze verify','real Caddy/TLS and real forum tested separately','r1/r2 are synthetic local databases, not live VDS','no zero-lag or capacity claim'],'regressionCaughtBeforeDelivery':'ZIP umask 0077: explicit 0755 code folders, database folder stays 0700; dedicated installer regression now required','historicalPackagesUnmodified':True}
(EV/'verification-release.json').write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');print(json.dumps(v,indent=2))
