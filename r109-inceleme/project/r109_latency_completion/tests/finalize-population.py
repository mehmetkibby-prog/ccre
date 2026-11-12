"""Deliver only after functional validation; retain performance failures explicitly."""
import hashlib,json,re,shutil,subprocess,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1];ev=root/'evidence'
sha=lambda b:hashlib.sha256(b).hexdigest()
def read(name):return json.loads((ev/name).read_text())
def taps(file,count):
 s=(ev/file).read_text();found={k:int(re.findall(r'^# '+k+r' (\d+)$',s,re.M)[-1]) for k in ('tests','pass','fail')}
 assert found=={'tests':count,'pass':count,'fail':0},(file,found)
 return {'log':file,**found}
checks=[taps('validation-focused.log',24),taps('validation-native-current-final.log',29),taps('validation-captcha.log',20),taps('validation-relocated-runtime.log',2)]
assert re.search(r'Ran 26 tests.*\n\nOK', (ev/'validation-installer.log').read_text(),re.S)
progress=read('validation-progress.json');assert len(progress)==9 and all(x['exit']==0 for x in progress),progress
browsers=[]
for p in ['browser-r1-hud-r107-population/report.json','browser-r2-hud-mobile-r107-population/report.json','three-browser-r107-population/report.json']:
 r=read(p);assert r['passed'] is True,p;assert not r['errors'] and not r['nativeFaults'] and not r['missingAssets'],p
 browsers.append({'report':p,'passed':True,'seconds':r['durationMs']/1000})
load=read('population-summary.json');assert len(load['runs'])==17 and all(r['passed'] and not r['errors'] and not r['faults'] and r['readyActors']==r['players'] for r in load['runs'])
base=root.parent/'r106_captcha_worker/delivery/r106-captcha.zip';expected='6c8a931dfa7da3cdaf054d5c2c5715103abfa35024ff422402a9aaa734d22d2a';assert sha(base.read_bytes())==expected
upload=Path('/tmp/codex-remote-attachments/01a16fbd-091f-71a5-923e-6bb701b9105f/2b464a78-5dae-45aa-addb-7e2a7dc9c0b0/1-r106-captcha.zip');assert sha(upload.read_bytes())==expected
stage=read('runtime-stage.json');tested=stage['package'];assert sha(Path(tested['file']).read_bytes())==tested['sha256']
validation={'version':'R107_POPULATION1','functionalChecksPassed':True,'zeroLagTargetMet':False,'overallLatencyImprovementProved':False,'liveInstalled':False,'productionAccess':False,'loadEnvironment':{'cpuQuota':4,'liveVdsCpu':8,'liveDatabase':False,'durationSeconds':60,'runs':17,'profileExcluded':True},'baselineZipSHA256':expected,'selectedSource':'R106_CAPTCHA1','rejectedSource':'R106_READY1','sources':['R105_PERF1','R106_CAPTCHA1'],'tests':checks,'installerTests':26,'browserChecks':browsers,'testedPackage':tested,'testedInstalledRoot':stage['release'],'adverseEvidence':['validation-native-r1.log','validation-inherited-r106.log','validation-native-current-first.log','population-summary.json'],'notes':['40-player main-loop >50ms/min median worsened 1 to 3; all raw runs retained','four-core shared synthetic environment is not the eight-core production VDS','browser tower fixture uses low HP; load bots do not test client GPU FPS','selected original R106 ZIP is unchanged']}
(ev/'release-validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2)+'\n')
subprocess.run(['python3','tests/write-population-report.py'],cwd=root,check=True)
subprocess.run(['python3','build/package.py'],cwd=root,check=True)
final=read('package.json')
with zipfile.ZipFile(tested['file']) as a,zipfile.ZipFile(final['file']) as b:
 assert set(a.namelist())==set(b.namelist())
 changed=[name for name in a.namelist() if a.read(name)!=b.read(name)]
 assert set(changed)<= {'PERFORMANS_RAPORU.md','DOGRULAMA.md','KURULUM.md'},changed
 validation['documentationOnlyArchiveChanges']=changed
 validation['testedExecutableBytesMatchFinal']=True
out=root/'delivery';out.mkdir(exist_ok=True)
for source,name in [(Path(final['file']),'r107-kalabalik.zip'),(root/'PERFORMANS_RAPORU.md','R107-olcum-raporu.md'),(ev/'population-results.csv','R107-olcumler.csv')]:
 dest=out/name
 if dest.exists():assert dest.read_bytes()==source.read_bytes(),'Do not overwrite a delivered artifact: '+str(dest)
 else:shutil.copyfile(source,dest)
final['delivery']=str(out/'r107-kalabalik.zip');validation['finalPackage']=final
(ev/'release-validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2)+'\n')
checksum=out/'r107-kalabalik.zip.sha256';value=final['sha256']+'  r107-kalabalik.zip\n'
if checksum.exists():assert checksum.read_text()==value
else:checksum.write_text(value)
print(json.dumps({'delivery':final['delivery'],'sha256':final['sha256'],'bytes':final['bytes'],'functionalChecksPassed':True,'zeroLagTargetMet':False},indent=2))
