"""Build the frozen R86 delta after native30 duration and mid-join gates pass."""
import argparse
import hashlib
import io
import json
import subprocess
import sys
import zipfile
from pathlib import Path
from prepare_package import ROOT, PACKAGE, CORE, MODULES, BASE_CORE, source, identity

TARGET = '6965a41ff2c9f3018f6f70f091b1bfbfdc8c16bac8470f17b6ba78c637dfe2fc'
GATE = 'evidence/final-release-gate-r86.json'
HTTP = 'http-runtime/dist-vds/server/index.js'
INGRESS = 'core511-source/scripts/delivery511/runtime-ingress.mjs'

def sha(data): return hashlib.sha256(data).hexdigest()
def read(path): return json.loads(path.read_text())
def encoded(value): return (json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode()
def check(condition, message):
    if not condition: raise RuntimeError(message)
def pinned(path, digest):
    data=(ROOT/path).read_bytes(); check(sha(data)==digest, 'Changed evidence: '+str(path)); return data

def audit():
    plan=read(PACKAGE/'update.json'); old, baseline, _, _, _=source()
    check(plan['sourceVersion']=='R85_GAMEPLAY' and plan['version']=='R86_GAMEPLAY', 'Wrong release versions')
    check(plan['baseCoreSHA256']==BASE_CORE and identity(plan['baseCoreRows'])==BASE_CORE, 'Wrong source identity')
    check({r['path']:r for r in plan['baseCoreRows']}==baseline, 'Wrong source rows')
    check(not any(plan[k] for k in ('databaseChanges','databaseSchemaChanges','accountsChanges','clientChanges')), 'Unexpected update scope')
    check(plan['client']['oldNamespace']==plan['client']['namespace']==old['client']['namespace'] and plan['client']['oldName']==plan['client']['name']==old['client']['name'], 'Client identity changed')
    expected=dict(baseline)
    for name, meta in plan['files'].items():
        check(name.startswith(CORE), 'Unexpected payload: '+name)
        data=(ROOT/'working'/name).read_bytes(); short=name[len(CORE):]
        check((PACKAGE/'payload'/name).read_bytes()==data, 'Stale payload: '+name)
        check(len(data)==meta['bytes'] and sha(data)==meta['after'] and baseline.get(short,{}).get('sha256')==meta['before'], 'Payload hash mismatch: '+name)
        expected[short]={'path':short,'bytes':len(data),'sha256':sha(data)}
    actual={}
    for path in (ROOT/'working'/CORE).rglob('*'):
        if path.is_file():
            check(not path.is_symlink(), 'Symlink in source'); data=path.read_bytes(); short=path.relative_to(ROOT/'working'/CORE).as_posix()
            actual[short]={'path':short,'bytes':len(data),'sha256':sha(data)}
    check(actual==expected and identity(actual.values())==TARGET, 'Source changed after final tests')
    check(len(plan['files'])==19, 'Unreviewed production file count')
    for name in (HTTP, INGRESS):
        check(sha((ROOT/'working'/name).read_bytes())==old['files'][name]['after'], 'Retained runtime changed: '+name)
    health=(PACKAGE/'payload'/CORE/'native-http-bindings.mjs').read_text()
    check("updateVersion:'R86_GAMEPLAY'" in health, 'Wrong health version')
    verified=read(ROOT/'evidence/installer-server-only-verification.json')
    check(verified['passed'] and verified['tests']==10 and verified['targetCoreSHA256']==TARGET and verified['productionFiles']==19, 'Installer checks missing')
    pinned('evidence/installer-server-only.log', verified['logSHA256'])
    for row in verified['modules']:
        check(sha((PACKAGE/'modules'/row['name']).read_bytes())==row['targetSHA256'], 'Installer changed after checks')
    gate=read(ROOT/GATE)
    check(gate['coreSHA256']==TARGET and gate['productionFiles']==plan['files'], 'Gate/source mismatch')
    check(gate['assessmentKind']=='local-native30-one180-plusjoin' and gate['performancePassed'] is True and gate['allRequiredChecksPassed'] is True and gate['crowdTestedLast'] is True and gate['liveDeploymentPerformed'] is False, 'Final gate not passed')
    for row in gate['evidencePins']: pinned(row['path'],row['sha256'])
    runs=gate['crowdRuns']; check(len(runs)==1, 'One native30 duration run required')
    join=gate['joinRun']; check(join['path']!=runs[0]['path'], 'Separate native29+1 join run required')
    for index,row in enumerate([*runs,join]):
        run=json.loads(pinned(row['path'],row['sha256']))
        seconds=180 if index==0 else 30
        check(run['players']==30 and run['seconds']==seconds and run['durationMs']>=seconds*1000, 'Wrong crowd duration/count')
        check(run['coreSHA256']==TARGET and run['deliverySHA256']==old['files'][INGRESS]['after'], 'Wrong measured source')
        check(run['passed'] is True and run['sourceUnchanged'] is True and run['deliveryUnchanged'] is True and run['liveTouched'] is False, 'Native integrity gate failed')
        check(not run['errors'] and not run['faults'] and run['unacknowledged']==0 and run['runtimeCancelledInputCount']==0, 'Native command errors')
        if index==0:check(run['commandLatencyMs']['p99']<=150, '180s all-wire p99 exceeds150ms')
        actors=run['clientTransport']['actors']; check(len(actors)==30, 'Missing actor observations')
        for actor in actors:
            check(all(actor[k]==0 for k in ('predictionCapEpisodes','totalPredictionCapMs','predictionLimitedFrames','predictionLimitedInputMs','remainingCommandQueue')) and not actor['cancelledInputs'], 'Prediction clipped, capped or inputs cancelled')
        check(len(run['economics'])==30 and len(run['automaticPotionLedger'])>=30, 'Missing native economy results')
        if index==1:
            criterion=gate['joinAggregateCriterion']
            check(criterion['observedMs']==run['commandLatencyMs']['p99'] and criterion['thresholdMs']==150 and criterion['passed'] is False and criterion['required'] is False and bool(criterion['reason']), 'Missing explicit failed short-run aggregate check/correction')
            joined=run['midjoin']
            check(joined['initialActors']==29 and joined['actualActorCount']==30 and joined['status']==200 and joined['connected'] is True, 'Mid-load admission failed')
            check(joined['lateEconomyPassed'] is True and joined['establishedEconomyPassed'] is True, 'Mid-load economy failed')
    crowd=read(ROOT/gate['crowdSummary']); check(crowd['coreSHA256']==TARGET, 'Wrong crowd summary')
    return plan, gate, crowd

def zip_bytes(files):
    stream=io.BytesIO()
    with zipfile.ZipFile(stream,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        for name,data in sorted(files.items()):
            entry=zipfile.ZipInfo(name,(2026,11,1,0,0,0));entry.external_attr=0o100644<<16
            archive.writestr(entry,data,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
    return stream.getvalue()

def build():
    plan,gate,crowd=audit()
    files={name:(PACKAGE/name).read_bytes() for name in ('__main__.py','update.json','RUNTIME.json')}
    modules={name:(PACKAGE/'modules'/name).read_bytes() for name in MODULES}
    files['package-files.json']=encoded({name:sha(data) for name,data in modules.items()})
    files.update({'modules/'+name:data for name,data in modules.items()})
    files.update({'payload/'+name:(PACKAGE/'payload'/name).read_bytes() for name in plan['files']})
    files['evidence/R86_KANIT.json']=encoded(gate);files['evidence/crowd-summary.json']=encoded(crowd)
    for row in [*gate['crowdRuns'],gate['joinRun']]:
        name=row['path']
        check(name=='evidence/'+Path(name).name, 'Raw evidence must be staged inside package evidence directory')
        files[name]=pinned(name,row['sha256'])
    verified=read(ROOT/'evidence/installer-server-only-verification.json')
    files['evidence/installer-server-only-verification.json']=(ROOT/'evidence/installer-server-only-verification.json').read_bytes()
    files['evidence/installer-server-only.log']=pinned('evidence/installer-server-only.log',verified['logSHA256'])
    evidence_pins={row['path']:row['sha256'] for row in gate['evidencePins']}
    for name in ('evidence/pre-attack-final.log','evidence/checkpoint-phase.log'):
        if name in evidence_pins: files[name]=pinned(name,evidence_pins[name])
    for name in ('KURULUM.md','SONUC.md'):
        data=(ROOT/name).read_bytes();check(b'__PENDING__' not in data, 'Unfinished report: '+name);files[name]=data
    artifact=ROOT/'artifacts/CORE511_R86_TOPLU.zip';check(not artifact.exists(), 'Never overwrite a release package')
    data=zip_bytes(files);artifact.parent.mkdir(exist_ok=True);artifact.write_bytes(data)
    with zipfile.ZipFile(artifact) as archive:
        check(archive.testzip() is None and sorted(archive.namelist())==sorted(files), 'Archive integrity failed')
        for name,body in files.items():check(archive.read(name)==body, 'Archive member changed: '+name)
    smoke=subprocess.run([sys.executable,str(artifact),'--help'],capture_output=True,text=True)
    check(smoke.returncode==0, smoke.stdout+smoke.stderr)
    digest=sha(data);(artifact.parent/(artifact.name+'.sha256')).write_text(digest+'  '+artifact.name+'\n')
    result={'name':artifact.name,'bytes':len(data),'sha256':digest,'sourceCoreSHA256':BASE_CORE,'targetCoreSHA256':TARGET,'productionFiles':len(plan['files']),'members':len(files),'bootstrapHelpPassed':True,'liveDeployment':False,'gatePath':GATE,'assessmentKind':gate['assessmentKind']}
    (ROOT/'evidence/release-artifact.json').write_bytes(encoded(result));print(json.dumps(result,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--archive',action='store_true');args=parser.parse_args()
    if args.archive:build()
    else:
        plan,_,_=audit();print(json.dumps({'verified':True,'coreSHA256':TARGET,'productionFiles':len(plan['files']),'archiveProduced':False},indent=2))
