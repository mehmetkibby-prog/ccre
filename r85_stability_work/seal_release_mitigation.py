"""Deliver reviewed functional fixes with the failed performance target explicitly retained."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
import sys
sys.dont_write_bytecode=True
from build_release import ROOT,audit,encoded

CORE='47e7486138ceb488d645e78c20c5c297d3ea423a7acb5cb4215a828ca17c6759'
SUMMARY='evidence/delivery-mitigation-summary-r85.json'
OUTPUT='evidence/final-release-gate-mitigation-r85.json'

def validate():
    observed={}
    def capture(path):
        data=(ROOT/path).read_bytes()
        meta={'path':path,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
        assert observed.setdefault(path,meta)==meta,'Changed evidence: '+path
        return data,meta
    def read(path):return json.loads(capture(path)[0])
    def pin(path):return capture(path)[1]
    def verify(meta):assert pin(meta['path'])==meta,meta['path']
    package,target=audit()
    assert target==CORE and len(package['files'])==46
    assert not any(p.endswith(('/actor-checkpoint.mjs','/checkpoint-phase-r85.mjs')) for p in package['files'])
    summary=read(SUMMARY)
    assert summary['coreSHA256']==CORE and summary['full50PlayerStabilityPassed'] is False
    assert summary['deliverySHA256']==package['files']['core511-source/scripts/delivery511/runtime-ingress.mjs']['after']
    spec=importlib.util.spec_from_file_location('original50',ROOT/'tests/runtime/scoped50-assessment.py')
    assessor=importlib.util.module_from_spec(spec);spec.loader.exec_module(assessor)
    plan=read(assessor.PLAN);binding=read(assessor.BINDING)
    assert binding['coreSHA256']==CORE
    rows=[]
    for stage in plan['stages']:
        if stage['id'] not in ('primary-50-first','primary-50-second'):continue
        assert stage['players']==50 and stage['seconds']==180
        raw=read(stage['rawArtifact']);stored=read(stage['rawArtifact'].replace('.json','-summary.json'))
        derived=assessor._summarizer.summarize(ROOT/stage['rawArtifact'])
        assert len(stored)==1 and assessor.normalized_summary(stored[0])==assessor.normalized_summary(derived)
        row,_=assessor.assess_stage(stage,raw,stored[0],binding)
        assert row['integrityPassed'] is True and row['integrityFailures']==[] and row['allSamplesIncluded'] is True
        assert row['prediction']['predictionLimitedFrames']==row['prediction']['predictionLimitedInputMs']==0
        for key in ('raw','summary','log'):verify(row[key])
        rows.append(row)
    assert rows==summary['stages'] and len(rows)==2
    assert sum(r['prediction']['predictionCapEpisodes'] for r in rows)==3
    assert not assessor.validate_campaign_order(rows)
    for path in ('evidence/scoped50-assessment-r85.json','evidence/scoped50-retry1-assessment-r85.json'):
        assert read(path)['eligibleForScopedReleaseReview'] is False
    assert read('evidence/urgent50-assessment-r85.json')['urgentStabilityPassed'] is False
    for name in ('build_release.py','publish_r85.py','seal_release_mitigation.py','prepare_package.py',
                 'tests/runtime/scoped50-assessment.py','tests/runtime/summarize-mixed-load.py',
                 'evidence/installer-final.json','evidence/final-syntax.json','evidence/package-plan.json',
                 'evidence/ingress-installer-verification-r85.json','evidence/independent-integration-review.json',
                 'evidence/instances-r85-final-candidate.json','evidence/instances-r85-exact47e-restoration.json',
                 'evidence/checkpoint-phase-revert-mitigation-r85.json','evidence/installer-bootstrap-mitigation-final.json',
                 'evidence/performance-upgrade-integration-r85.json','KURULUM.md','SONUC.md','R85_DURUM.md'):
        pin(name)
    for path in ('KURULUM.md','SONUC.md','R85_DURUM.md'):
        assert b'__PENDING__' not in capture(path)[0]
    final_package,final_target=audit()
    assert package==final_package and target==final_target
    for path in list(observed):pin(path)
    return {'version':'R85_GAMEPLAY','recordedUtc':datetime.now(timezone.utc).isoformat(),
            'assessmentKind':'verified-functional-mitigation','coreSHA256':CORE,'baseCoreSHA256':package['baseCoreSHA256'],
            'productionFiles':package['files'],'allRequiredChecksPassed':True,'allRequiredFunctionalChecksPassed':True,
            'exactPreviouslyMeasuredSourceRestored':True,'crowdTestedLast':False,
            'full50PlayerStabilityPassed':False,'originalLongCampaignPassed':False,'capacity100Status':'not-tested',
            'liveDeploymentPerformed':False,'crowdSummary':SUMMARY,'evidencePins':[observed[k] for k in sorted(observed)],
            'scope':'Functional mitigation release only. Exact previously measured47e source restored; both scheduling experiments excluded. Two50x180-second runs had zero clipped movement frames, but second had three near-limit markers. Full50 stability target remains failed;100-player capacity and live performance not verified.'}

if __name__=='__main__':
    if not __debug__:raise RuntimeError('Assertions required')
    parser=argparse.ArgumentParser();parser.add_argument('--seal',action='store_true');args=parser.parse_args()
    result=validate()
    if args.seal:
        with (ROOT/OUTPUT).open('xb') as file:
            file.write(encoded(result));file.flush();os.fsync(file.fileno())
    print(json.dumps({'verified':True,'sealed':args.seal,'gate':OUTPUT,'full50PlayerStabilityPassed':False}))
