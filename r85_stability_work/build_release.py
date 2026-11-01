"""Package the frozen, tested R85 delta; never touches a live installation."""
import argparse
import hashlib
import io
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path
from prepare_package import ROOT, PACKAGE, CORE, MODULES, BASE_CORE, source_rows, identity

def sha(data):return hashlib.sha256(data).hexdigest()
def read(path):return json.loads(path.read_text())
def encoded(value):return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()
ACTIVE_REVIEW_CHAIN=[]
def reviewed_upgrade(phase=False,bounded=False):
    path=ROOT/('evidence/checkpoint-phase-bounded-integration-r85.json' if bounded else 'evidence/checkpoint-phase-integration-r85.json' if phase else 'evidence/performance-upgrade-integration-r85.json')
    if not path.exists():return None
    upgrade=read(path)
    before='874a158609e858f8f98a988e40d160b140857e890ed6de5bc562e760e3185587' if bounded else '47e7486138ceb488d645e78c20c5c297d3ea423a7acb5cb4215a828ca17c6759' if phase else '572129943dbd0df97818f6b53b4e12defa42b87483f3d456e669881edc1e9356'
    assert upgrade['status']=='reviewed-integrated-local' and upgrade['coreBefore']==before
    assert upgrade['checksPassed'] is True and upgrade['openFunctionalBlockers']==[]
    for row in upgrade['evidencePins']:
        data=(ROOT/row['path']).read_bytes()
        assert len(data)==row['bytes'] and sha(data)==row['sha256'], 'Changed upgrade proof: '+row['path']
    for row in upgrade['files']:
        for key in ('before','after'):
            meta=row.get(key)
            if meta is None:continue
            data=(ROOT/meta['path']).read_bytes()
            assert len(data)==meta['bytes'] and sha(data)==meta['sha256'], 'Changed upgrade source: '+meta['path']
    return upgrade

def current_or_reviewed_upgrade(short,expected,current):
    if current==expected:return True
    digest=expected
    for upgrade in ACTIVE_REVIEW_CHAIN:
        if upgrade:
            for row in upgrade['files']:
                if row['name']==short and (row.get('before') or {}).get('sha256')==digest:
                    digest=row['after']['sha256']
    return digest==current

def verify_pins(rows,prefix=''):
    for row in rows:
        path=ROOT/'working'/prefix/row['path'];data=path.read_bytes()
        short=path.relative_to(ROOT/'working'/CORE).as_posix()
        assert (len(data)==row['bytes'] and sha(data)==row['sha256']) or current_or_reviewed_upgrade(short,row['sha256'],sha(data)), 'Changed after verification: '+str(path)

def audit():
    global ACTIVE_REVIEW_CHAIN
    plan=read(PACKAGE/'update.json');previous,baseline=source_rows()
    assert plan['sourceVersion']=='R84_GAMEPLAY' and plan['version']=='R85_GAMEPLAY'
    assert plan['baseCoreSHA256']==BASE_CORE and identity(plan['baseCoreRows'])==BASE_CORE
    assert {r['path']:r for r in plan['baseCoreRows']}==baseline
    assert not any(plan[key] for key in ('databaseChanges','databaseSchemaChanges','accountsChanges'))
    rows={}
    for path in (ROOT/'working'/CORE).rglob('*'):
        if path.is_file():
            assert not path.is_symlink();data=path.read_bytes();short=path.relative_to(ROOT/'working'/CORE).as_posix()
            rows[short]={'path':short,'bytes':len(data),'sha256':sha(data)}
    expected=dict(baseline)
    for name,meta in plan['files'].items():
        data=(ROOT/'working'/name).read_bytes()
        assert (PACKAGE/'payload'/name).read_bytes()==data
        assert len(data)==meta['bytes'] and sha(data)==meta['after']
        if name.startswith(CORE):
            short=name[len(CORE):]
            assert baseline.get(short,{}).get('sha256')==meta['before']
            expected[short]={'path':short,'bytes':len(data),'sha256':sha(data)}
    assert rows==expected,'Payload does not cover exact target source identity'
    target=identity(rows.values())
    upgrade=reviewed_upgrade()
    phase_upgrade=reviewed_upgrade(phase=True) if upgrade and target!=upgrade['coreAfter'] else None
    bounded_upgrade=reviewed_upgrade(bounded=True) if phase_upgrade and target!=phase_upgrade['coreAfter'] else None
    ACTIVE_REVIEW_CHAIN=[item for item in (upgrade,phase_upgrade,bounded_upgrade) if item]
    if bounded_upgrade:
        assert phase_upgrade and phase_upgrade['coreAfter']==bounded_upgrade['coreBefore'] and bounded_upgrade['coreAfter']==target
        for item in bounded_upgrade['files']:
            assert plan['files'][CORE+item['name']]['after']==item['after']['sha256']
    if phase_upgrade:
        assert upgrade and upgrade['coreAfter']==phase_upgrade['coreBefore'] and phase_upgrade['coreAfter']==(bounded_upgrade['coreBefore'] if bounded_upgrade else target)
        for item in phase_upgrade['files']:
            assert current_or_reviewed_upgrade(item['name'],item['after']['sha256'],plan['files'][CORE+item['name']]['after'])
    if upgrade:
        assert upgrade['coreAfter']==(phase_upgrade['coreBefore'] if phase_upgrade else target)
        for item in upgrade['files']:
            assert plan['files'][CORE+item['name']]['after']==item['after']['sha256']
    writer=read(ROOT/'tests/writer/writer-verification.json')
    pins=ROOT/writer['productionPins'];assert sha(pins.read_bytes())==writer['productionPinsSHA256']
    verify_pins(read(pins),CORE)
    for result in writer['results']:
        assert result['tests']==result['pass']>0 and result['fail']==result['cancelled']==result['skipped']==0
        assert sha((ROOT/result['log']).read_bytes())==result['sha256']
    verify_pins(read(ROOT/'evidence/progress-summary-r85.json')['productionFiles'])
    collect=read(ROOT/'evidence/collect-summary-r85.json')
    assert collect['passed'] is True and collect['behaviorChecks']['fail']==0
    verify_pins(collect['productionFiles'])
    for row in collect['artifacts']:
        assert sha((ROOT/row['path']).read_bytes())==row['sha256']
    ranks=read(ROOT/'evidence/reward-rank-refresh-verification-r85.json')
    assert ranks['status']=='complete' and ranks['nativeProof']['passed']==6 and ranks['nativeProof']['failed']==0
    verify_pins(ranks['productionPins'],'core511-source')
    for path,meta in ranks['evidence'].items():
        data=(ROOT/path).read_bytes();assert len(data)==meta['bytes'] and sha(data)==meta['sha256']
    respawn=read(ROOT/'tests/client/native-respawn-change.json')
    verify_pins(respawn['productionFiles'],CORE)
    syntax=read(ROOT/'evidence/final-syntax.json');assert syntax['productionFiles']==plan['files']
    installer=read(ROOT/'evidence/installer-final.json');assert installer['productionFiles']==plan['files'] and installer['failed']==0 and installer['passed']>0
    for name,digest in installer['modules'].items():assert sha((PACKAGE/'modules'/name).read_bytes())==digest
    for name,digest in installer['tests'].items():assert sha((ROOT/'tests/installer'/name).read_bytes())==digest
    for result in installer['runs']:assert sha((ROOT/result['output']).read_bytes())==result['sha256']
    ingress=read(ROOT/'evidence/ingress-nodelay-delivery-verification-r85.json')
    assert ingress['status']=='frozen' and ingress['inverseByteEquality'] is True
    ingress_path=ingress['target']; ingress_bytes=(ROOT/'working'/ingress_path).read_bytes()
    assert plan['files'][ingress_path]=={'before':ingress['before']['sha256'],'after':ingress['after']['sha256'],'bytes':ingress['after']['bytes']}
    assert len(ingress_bytes)==ingress['after']['bytes'] and sha(ingress_bytes)==ingress['after']['sha256']
    for path,meta in ingress['evidence'].items():
        data=(ROOT/path).read_bytes();assert len(data)==meta['bytes'] and sha(data)==meta['sha256']
    ingress_install=read(ROOT/'evidence/ingress-installer-verification-r85.json')
    assert ingress_install['status']=='passed-local-installer-fixtures' and ingress_install['installerTestsFailed']==0
    assert ingress_install['ingress']['before']==ingress['before'] and ingress_install['ingress']['after']==ingress['after']
    assert ingress_install['bootstrapNineModuleHelpSmokePassed'] is True
    for path,meta in ingress_install['evidence'].items():
        data=(ROOT/path).read_bytes();assert len(data)==meta['bytes'] and sha(data)==meta['sha256']
    if CORE+'writer-lane-r533.mjs' in plan['files']:
        inline=read(ROOT/'evidence/writer-inline-verification-r85.json')
        assert inline['status']=='candidate-frozen-not-installed' and inline['correctness']['targetedPassed']==10
        before,after=inline['productionBefore'],inline['candidateAfter']
        assert plan['files'][CORE+'writer-lane-r533.mjs']=={'before':before['sha256'],'after':after['sha256'],'bytes':after['bytes']}
        for row in [after,*inline['artifacts']]:
            data=(ROOT/row['path']).read_bytes();assert len(data)==row['bytes'] and sha(data)==row['sha256']
    if CORE+'death-batch-single-r57.mjs' in plan['files']:
        batch_path=ROOT/'evidence/independent-deaths-r85-verification.json'
        batch=read(batch_path);assert batch['status']=='passed_candidate_only'
        assert batch['proof']['nativeExactEconomyDifferential'] is True
        for row in batch['files']:
            assert current_or_reviewed_upgrade(row['name'],row['candidateSha256'],plan['files'][CORE+row['name']]['after'])
            assert sha((ROOT/'candidates/independent-deaths-r85'/row['name']).read_bytes())==row['candidateSha256']
            assert sha((ROOT/'candidates/integrated-before-82a'/row['name']).read_bytes())==row['baseSha256']
        for row in batch['artifacts']:assert sha((ROOT/row['path']).read_bytes())==row['sha256']
        approval=read(ROOT/'evidence/independent-death-review-final-addendum-r85.json')
        assert approval['status']=='approved_for_integration' and approval['frozenVerification']['sha256']==sha(batch_path.read_bytes())
        for row in [*approval['candidateFiles'],*approval['newArtifacts']]:
            data=(ROOT/row['path']).read_bytes();assert len(data)==row['bytes'] and sha(data)==row['sha256']
    if any(CORE+name in plan['files'] for name in ('adventure-channel.mjs','loot-profile-cache-r61.mjs')):
        latest=read(ROOT/'evidence/final-candidate-integration-r85.json')
        assert latest['status']=='reviewed-integrated-local' and latest['coreAfter']==(upgrade['coreBefore'] if upgrade else target)
        assert {row['name'] for row in latest['files']}=={'adventure-channel.mjs','loot-profile-cache-r61.mjs','generated/loot-profile-cache-r61-proof.json'}
        for row in latest['files']:
            assert plan['files'][CORE+row['name']]['after']==row['after']['sha256']
            for meta in (row['before'],row['after']):
                data=(ROOT/meta['path']).read_bytes()
                assert len(data)==meta['bytes'] and sha(data)==meta['sha256']
        for meta in latest['evidencePins']:
            data=(ROOT/meta['path']).read_bytes()
            assert len(data)==meta['bytes'] and sha(data)==meta['sha256']
    instances=read(ROOT/'evidence/instances-r85-final-candidate.json')
    assert instances['passed'] is True and instances['sourceUnchanged'] is True and instances['core']==target
    review=read(ROOT/'evidence/independent-integration-review.json')
    assert review['status']=='reviewed-no-confirmed-open-blockers' and review['finalCoreSHA256']==target and review['writerProductionPinsVerified']
    for row in review['files']:verify_pins([row],CORE)
    return plan,target

def zip_bytes(files):
    stream=io.BytesIO()
    with zipfile.ZipFile(stream,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name,data in sorted(files.items()):
            entry=zipfile.ZipInfo(name,(2026,11,1,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;entry.external_attr=0o100644<<16
            z.writestr(entry,data,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
    return stream.getvalue()

def archive(scoped50=False,retry1=False,urgent=False,mitigation=False):
    plan,target=audit()
    gate_path='evidence/final-release-gate-mitigation-r85.json' if mitigation else 'evidence/final-release-gate-urgent50-r85.json' if urgent else ('evidence/final-release-gate-scoped50-retry1-r85.json' if retry1 else 'evidence/final-release-gate-scoped50-r85.json') if scoped50 else 'evidence/final-release-gate.json'
    gate=read(ROOT/gate_path)
    assert (gate.get('assessmentKind')=='preregistered-scoped50')==scoped50
    assert (gate.get('assessmentKind')=='urgent-two-short50')==urgent
    assert (gate.get('assessmentKind')=='verified-functional-mitigation')==mitigation
    assert gate['coreSHA256']==target and gate['productionFiles']==plan['files']
    assert gate['allRequiredChecksPassed'] is True and gate['liveDeploymentPerformed'] is False
    assert gate['crowdTestedLast'] is True if not mitigation else gate['exactPreviouslyMeasuredSourceRestored'] is True
    for row in gate['evidencePins']:
        assert sha((ROOT/row['path']).read_bytes())==row['sha256'],'Evidence changed: '+row['path']
    crowd=read(ROOT/gate['crowdSummary'])
    assert crowd['coreSHA256']==target
    assert crowd['deliverySHA256']==plan['files']['core511-source/scripts/delivery511/runtime-ingress.mjs']['after']
    if mitigation:
        assert gate['allRequiredFunctionalChecksPassed'] is True and gate['full50PlayerStabilityPassed'] is False
        assert crowd['full50PlayerStabilityPassed'] is False and crowd['coreSHA256']==target
        assert len(crowd['stages'])==2 and all(row['integrityPassed'] is True for row in crowd['stages'])
        assert all(row['prediction']['predictionLimitedFrames']==row['prediction']['predictionLimitedInputMs']==0 for row in crowd['stages'])
        assert sum(row['prediction']['predictionCapEpisodes'] for row in crowd['stages'])==3
    elif urgent:
        assert crowd['urgentStabilityPassed'] is True and crowd['testedStages']==['urgent50-a','urgent50-b']
        assert crowd['notRunStages']==crowd['campaignFailures']==[]
        assert crowd['originalLongCampaignPassed'] is False and crowd['historicalFullAcceptance']=='not-assessed'
        assert gate['originalLongCampaignPassed'] is False and gate['capacity100Status']=='not-tested'
    elif gate.get('assessmentKind')=='preregistered-scoped50':
        assert crowd['eligibleForScopedReleaseReview'] is True and crowd['scoped50QualityPassed'] is True and crowd['allStagesIntegrityPassed'] is True
        assert crowd['historicalFullAcceptance']=='not-assessed' and crowd['durableInputPolicyAssessed'] is False
        assert crowd['testedStages']==['regression-1','regression-10','regression-30','primary-50-first','primary-50-second','capacity-100']
        assert gate['historicalFullAcceptance']=='not-assessed'
    else:
        assert crowd['passed'] is True and crowd['testedPlayers']==[1,10,30,50,100]
    evidence=encoded(gate)
    files={'__main__.py':(PACKAGE/'__main__.py').read_bytes(),
           'update.json':(PACKAGE/'update.json').read_bytes(),
           'RUNTIME.json':(PACKAGE/'RUNTIME.json').read_bytes(),
           'evidence/R85_KANIT.json':evidence,
           'evidence/crowd-summary.json':encoded(crowd)}
    if scoped50 or urgent:
        files['evidence/wire-outliers.json']=(ROOT/gate['wireOutliers']['path']).read_bytes()
        files['evidence/urgent50-plan.json' if urgent else 'evidence/scoped50-plan.json']=(ROOT/crowd['plan']['path']).read_bytes()
    modules={name:(PACKAGE/'modules'/name).read_bytes() for name in MODULES}
    files['package-files.json']=encoded({name:sha(data) for name,data in modules.items()})
    for name,data in modules.items():files['modules/'+name]=data
    for name in plan['files']:files['payload/'+name]=(PACKAGE/'payload'/name).read_bytes()
    for name in ('KURULUM.md','SONUC.md'):
        data=(ROOT/name).read_bytes();assert b'__PENDING__' not in data;files[name]=data
    data=zip_bytes(files);digest=sha(data)
    artifacts=ROOT/'artifacts';artifacts.mkdir(exist_ok=True)
    path=artifacts/'CORE511_R85_TOPLU.zip'
    assert not path.exists(),'Never overwrite an already released package'
    path.write_bytes(data)
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None and sorted(z.namelist())==sorted(files)
        for name,body in files.items():assert z.read(name)==body
    check=subprocess.run([sys.executable,str(path),'--help'],capture_output=True,text=True)
    assert check.returncode==0,check.stdout+check.stderr
    (artifacts/(path.name+'.sha256')).write_text(digest+'  '+path.name+'\n')
    result={'name':path.name,'bytes':len(data),'sha256':digest,'targetCoreSHA256':target,'sourceCoreSHA256':BASE_CORE,
            'productionFiles':len(plan['files']),'members':len(files),'bootstrapHelpPassed':True,'liveDeployment':False,
            'gatePath':gate_path,'assessmentKind':gate.get('assessmentKind','historical-full-gate')}
    (ROOT/'evidence/release-artifact.json').write_bytes(encoded(result))
    print(json.dumps(result,indent=2))

if __name__=='__main__':
    if not __debug__:raise RuntimeError('Release verification requires Python assertions')
    parser=argparse.ArgumentParser();parser.add_argument('--archive',action='store_true');parser.add_argument('--scoped50',action='store_true');parser.add_argument('--retry1',action='store_true');parser.add_argument('--urgent',action='store_true');parser.add_argument('--mitigation',action='store_true');args=parser.parse_args()
    if args.scoped50 and not args.archive:parser.error('--scoped50 requires --archive')
    if args.retry1 and not args.scoped50:parser.error('--retry1 requires --scoped50')
    if args.urgent and (not args.archive or args.scoped50 or args.retry1):parser.error('--urgent requires --archive alone')
    if args.mitigation and (not args.archive or args.scoped50 or args.retry1 or args.urgent):parser.error('--mitigation requires --archive alone')
    if args.archive:archive(scoped50=args.scoped50,retry1=args.retry1,urgent=args.urgent,mitigation=args.mitigation)
    else:
        plan,target=audit();print(json.dumps({'verified':True,'coreSHA256':target,'productionFiles':len(plan['files']),'archiveProduced':False},indent=2))
