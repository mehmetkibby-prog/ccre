from pathlib import Path
import os,subprocess,json,hashlib,sys
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT/'working';CORE=WORK/'core511-source/scripts/core511'
node='/workspace/ccre/r79_stability_work/runtime/node-v22.23.4-linux-x64/bin/node'
core=json.loads(subprocess.check_output([node,'--input-type=module','-e','const {sourceIdentity}=await import(process.argv[1]);console.log(JSON.stringify(sourceIdentity()));',(CORE/'source-identity.mjs').as_uri()]))['sha256']
env={**os.environ,'R85_RUNTIME_TREE':str(WORK),'R85_RUNTIME_LABEL':sys.argv[1],'R85_EXPECT_CORE_SHA':core,'R85_EXPECT_INGRESS_SHA':hashlib.sha256((WORK/'core511-source/scripts/delivery511/runtime-ingress.mjs').read_bytes()).hexdigest(),'R91_HISTORY_ROWS':sys.argv[2] if len(sys.argv)>2 else '0'}
log=ROOT/'evidence'/('crowd-'+sys.argv[1]+'.log')
with log.open('w') as f:result=subprocess.run(['python3',str(ROOT/'tests/run.py'),str(ROOT/'tests'/('crowd-rune.mjs' if os.environ.get('R91_SCENARIO')=='rune' else 'crowd-history.mjs')),'50',os.environ.get('R91_SECONDS','30')],env=env,stdout=f,stderr=subprocess.STDOUT)
print(json.dumps({'label':sys.argv[1],'returncode':result.returncode,'log':str(log)}));sys.exit(result.returncode)
