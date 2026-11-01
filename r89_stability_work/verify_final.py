import os,subprocess,hashlib,json,re,sys
from pathlib import Path
R=Path('/workspace/ccre/r89_stability_work');target=json.loads((R/'evidence/package-plan.json').read_text())['targetCoreSHA256'];runner=R/'tests/run.py'
env={**os.environ,'R85_RUNTIME_TREE':str(R/'working'),'R85_EXPECT_CORE_SHA':target,'R85_EXPECT_INGRESS_SHA':'325bd1caa7c52df9df159b63afa3cd7faf470f2cdae3f513a5c4ca29f655cec9','R87_EXPECT_JOINED':'1'}
def run(name,args,label=None):
 log=R/'evidence'/name;e=dict(env)
 if label:e['R85_RUNTIME_LABEL']=label
 print(json.dumps({'stage':name,'state':'started'}),flush=True)
 with log.open('w') as out:r=subprocess.run(args,env=e,stdout=out,stderr=subprocess.STDOUT)
 print(json.dumps({'stage':name,'code':r.returncode}),flush=True)
 if r.returncode:print(log.read_text()[-7000:],flush=True);sys.exit(r.returncode)
 return log
for kind,label in [('crowd','r89-refresh-forest-final'),('rune','r89-refresh-rune-final')]:
 run(kind+'-refresh-final.log',['python3',str(runner),str(R/('tests/native-'+('crowd50' if kind=='crowd' else 'rune50')+'-claude.mjs')),'50','180'],label)
run('midjoin-refresh-confirm.log',['python3',str(runner),str(R/'tests/native-midjoin-r89.mjs'),'50','30'],'r89-refresh-midjoin-confirm')
core=R/'working/core511-source/scripts/core511'
files=sorted((R/'tests').glob('*.test.mjs'))+[R/'tests/instances/dungeon-native-r89.test.mjs']+[core/'tests'/name for name in ['tower-host.test.mjs','mist-integration-r19.test.mjs','rune-boss-writer.test.mjs','rune-boss.test.mjs']]
log=run('native-regressions-r89-final.log',['python3',str(runner),'--test','--test-concurrency=1',*map(str,files)])
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
s=log.read_text();n=lambda k:int(re.search(r'^# '+k+r' (\d+)$',s,re.M)[1]);tests={'coreSHA256':target,'passed':n('fail')==0 and n('pass')==n('tests'),'tests':n('tests'),'pass':n('pass'),'fail':n('fail'),'logs':[{'path':str(log.relative_to(R)),'sha256':sha(log)}]};(R/'evidence/final-checks.json').write_text(json.dumps(tests,indent=2)+'\n')
logs=[];count=0
for p in sorted((R/'tests/installer').glob('*.test.py')):
 log=run('final-'+p.name+'.log',['python3',str(p)]);s=log.read_text();count+=int(re.search(r'Ran (\d+) tests?',s)[1]);logs.append({'path':str(log.relative_to(R)),'sha256':sha(log)})
modules=[{'name':p.name,'sha256':sha(p)} for p in sorted((R/'r89-package/modules').iterdir()) if p.is_file()]
result={'coreSHA256':target,'passed':True,'tests':count,'logs':logs,'modules':modules};(R/'evidence/installer-final.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'completed':True,'nativeTests':tests['tests'],'installerTests':count,'coreSHA256':target}),flush=True)
