"""Seal only the explicit two-short-run urgent release scope, never the failed long gate."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
import sys

sys.dont_write_bytecode=True
from build_release import ROOT, audit, encoded

CORE='a8c5e2804ba67cbe9e52ddca95dc0c6ec67d19cc18776362e24920e5e296aef9'
PLAN_SHA='01f949dcfc807fbbadd9d1613598028288d437d51da460df35ab578bdba52794'
ASSESSMENT='evidence/urgent50-assessment-r85.json'
OUTPUT='evidence/final-release-gate-urgent50-r85.json'

def validate():
    observed={}
    def pin(path):
        data=(ROOT/path).read_bytes()
        meta={'path':path,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
        assert observed.setdefault(path,meta)==meta, 'Changed while sealing: '+path
        return meta
    def read(path):
        pin(path)
        return json.loads((ROOT/path).read_text())
    def verify(meta):
        assert pin(meta['path'])==meta, 'Changed evidence: '+meta['path']
    spec=importlib.util.spec_from_file_location('urgent_assessor',ROOT/'tests/runtime/urgent50-assessment.py')
    assessor=importlib.util.module_from_spec(spec);spec.loader.exec_module(assessor)
    plan=read(assessor.PLAN);binding=read(assessor.BINDING)
    assert pin(assessor.PLAN)['sha256']==PLAN_SHA
    assert not assessor.validate_binding(plan,binding)
    assert binding['coreSHA256']==CORE
    assert [(s['id'],s['players'],s['seconds']) for s in plan['stages']]==[('urgent50-a',50,30),('urgent50-b',50,30)]
    for meta in binding['pins']:verify(meta)
    functional={r['path'] for r in binding['rolePins']['functionalProof']}
    assert {'evidence/installer-final.json','evidence/ingress-installer-verification-r85.json',
            'evidence/instances-r85-final-candidate.json','evidence/checkpoint-phase-bounded-integration-r85.json'} <= functional
    for path in functional:
        assert (ROOT/path).stat().st_mtime_ns/1_000_000<=binding['createdAtEpochMs']
    installer=read('evidence/installer-final.json')
    assert installer['passed']==99 and installer['failed']==0
    instances=read('evidence/instances-r85-final-candidate.json')
    assert instances['core']==CORE and instances['uniqueChecks']==8 and instances['failed']==instances['skipped']==0
    report=read(ASSESSMENT)
    assert report['plan']==pin(assessor.PLAN) and report['binding']==pin(assessor.BINDING)
    assert report['assessor']==pin(assessor.ASSESSOR) and report['validationDependency']==pin(assessor.DEPENDENCY)
    assert report['coreSHA256']==CORE and report['deliverySHA256']==binding['deliverySHA256']
    assert report['urgentStabilityPassed'] is True and report['testedStages']==['urgent50-a','urgent50-b']
    assert report['notRunStages']==report['campaignFailures']==[]
    assert report['originalLongCampaignPassed'] is False and report['historicalFullAcceptance']=='not-assessed'
    assert all(report[k] is False for k in ('durableInputPolicyAssessed','liveDeploymentPerformed','renderedGameFPSAssessed'))
    rows=[];outliers=[]
    for stage in plan['stages']:
        path=stage['rawArtifact'];raw=read(path);stored=read(path.replace('.json','-summary.json'))
        assert len(stored)==1
        derived=assessor.base._summarizer.summarize(ROOT/path)
        assert assessor.base.normalized_summary(stored[0])==assessor.base.normalized_summary(derived)
        row,observations=assessor.base.assess_stage(stage,raw,stored[0],binding)
        assert row['integrityPassed'] is True and row['integrityFailures']==[] and row['allSamplesIncluded'] is True
        assert row['startEpochMs']>binding['createdAtEpochMs']
        assert all(row['prediction'][k]==0 for k in ('predictionCapEpisodes','predictionLimitedFrames','predictionLimitedInputMs'))
        row['urgentStabilityPassed']=True;row['previousScopedQualityFieldsAreDiagnosticOnly']=True
        for field in ('raw','summary','log'):verify(row[field])
        rows.append(row);outliers.extend(observations)
    assert not assessor.base.validate_campaign_order(rows) and report['stages']==rows
    ledger_path='evidence/urgent50-wire-outliers-r85.json';ledger=read(ledger_path)
    assert ledger=={'plan':pin(assessor.PLAN),'binding':pin(assessor.BINDING),'thresholdMs':300,
                    'allObservationsRetained':True,'count':len(outliers),'observations':outliers}
    assert report['wireOutliers']==pin(ledger_path)
    for path in ('evidence/scoped50-assessment-r85.json','evidence/scoped50-retry1-assessment-r85.json'):
        prior=read(path)
        assert prior['eligibleForScopedReleaseReview'] is False
    for path in ('build_release.py','publish_r85.py','seal_release_urgent.py','prepare_package.py',
                 'evidence/independent-integration-review.json','evidence/final-syntax.json',
                 'evidence/checkpoint-phase-failure-review-r85.json','KURULUM.md','SONUC.md','R85_DURUM.md'):
        pin(path)
    for path in ('KURULUM.md','SONUC.md','R85_DURUM.md'):
        assert b'__PENDING__' not in (ROOT/path).read_bytes()
    package,target=audit()
    assert target==CORE and len(package['files'])==48
    for path in list(observed):pin(path)
    return {'version':'R85_GAMEPLAY','recordedUtc':datetime.now(timezone.utc).isoformat(),
            'assessmentKind':'urgent-two-short50','coreSHA256':CORE,'baseCoreSHA256':package['baseCoreSHA256'],
            'productionFiles':package['files'],'allRequiredChecksPassed':True,'crowdTestedLast':True,
            'originalLongCampaignPassed':False,'historicalFullAcceptance':'not-assessed','capacity100Status':'not-tested',
            'liveDeploymentPerformed':False,'crowdSummary':ASSESSMENT,'wireOutliers':pin(ledger_path),
            'evidencePins':[observed[k] for k in sorted(observed)],
            'scope':'Urgent mitigation release: two fresh50-player30-second checks only. Earlier long campaigns failed and remain unchanged. Not a guarantee of no lag or full50/100-player acceptance. No live VDS or rendered-game measurement.'}

if __name__=='__main__':
    if not __debug__:raise RuntimeError('Assertions required')
    parser=argparse.ArgumentParser();parser.add_argument('--seal',action='store_true');args=parser.parse_args()
    gate=validate()
    if args.seal:
        with (ROOT/OUTPUT).open('xb') as file:
            file.write(encoded(gate));file.flush();os.fsync(file.fileno())
    print(json.dumps({'verified':True,'sealed':args.seal,'gate':OUTPUT,'core':CORE}))
