"""Exercise installed core combat modules with production flags in both realm modes.

Immutable native fixture seed/listener adapters remain explicit. Real runtime
entry/native import closure is checked separately by installed-runtime.py.
"""
import contextlib,hashlib,json,os,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];REVIEW=ROOT.parents[1]
package=json.loads((ROOT/'evidence/package.json').read_text())
stage=json.loads((ROOT/'evidence/runtime-stage.json').read_text())
assert stage['package']['sha256']==package['sha256']
assert stage['targetCore']==package['targetCore']
# Combat assertions use a development DB factory. Supply that factory only
# while this local test runs; it is deliberately not an installed payload.
@contextlib.contextmanager
def development_fixture():
 release=Path(stage['release']).resolve()
 assert release.parent.parent==Path(tempfile.gettempdir()).resolve() and release.parent.name.startswith('r118-installed-')
 relative='core511-source/scripts/perf-r11/tests/reward/fixture.mjs'
 target=release/relative;source=ROOT.parent/'r109_latency_completion/working'/relative
 assert not target.is_symlink()
 previous=target.read_bytes() if target.exists() else None;data=source.read_bytes()
 target.write_bytes(data)
 try:yield {'path':relative,'sha256':hashlib.sha256(data).hexdigest(),'scope':'local test-only adapter; restored after test'}
 finally:
  if previous is None:target.unlink()
  else:target.write_bytes(previous)

results=[]
with development_fixture() as adapter:
 for realm in ['r1','r2']:
  env={**os.environ,'R118_TEST_CORE_ROOT':stage['release']+'/core511-source/scripts/core511',
       'R102_TEST_REALM':realm,'STUTTER_TREE':stage['release'],'CLIENT_TREE':stage['release']}
  file=ROOT/'evidence'/('installed-combat-'+realm+'.log')
  with file.open('w') as log:
   result=subprocess.run([sys.executable,str(REVIEW/'scripts/run.py'),'--test',
       '--test-concurrency=1',str(ROOT/'tests/champions-checkpoint-host.test.mjs')],
       cwd=REVIEW,env=env,stdout=log,stderr=log)
  results.append({'realmMode':realm,'exitCode':result.returncode,'log':str(file.relative_to(ROOT))})
  if result.returncode:
   print(file.read_text()[-10000:]);raise SystemExit(result.returncode)
record={'package':package,'release':stage['release'],'results':results,'developmentFixtureAdapter':adapter,
 'contract':'Installed core modules with actual release flags; immutable native fixture seed/listener adapters. Actual full runtime-entry closure is a separate check.'}
(ROOT/'evidence/installed-combat.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record,indent=2))
