"""Audit the separately preregistered scoped retry1 campaign; exclusively seal only with --seal.

Does not run gameplay, change the historical gate, or create a release archive.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys

sys.dont_write_bytecode = True
from build_release import ROOT, PACKAGE, audit, encoded

CORE = '874a158609e858f8f98a988e40d160b140857e890ed6de5bc562e760e3185587'
INGRESS = '325bd1caa7c52df9df159b63afa3cd7faf470f2cdae3f513a5c4ca29f655cec9'
PLAN_SHA = '5826ac8f89271306fdfe55b99aa748e772d30a1f64ee0182e7bc88a5c786a60c'
ASSESSMENT = 'evidence/scoped50-retry1-assessment-r85.json'
LEDGER = 'evidence/scoped50-retry1-wire-outliers-r85.json'
OUTPUT = 'evidence/final-release-gate-scoped50-retry1-r85.json'
STAGES = ['regression-1', 'regression-10', 'regression-30',
          'primary-50-first', 'primary-50-second', 'capacity-100']
FUNCTIONAL = {'evidence/installer-final.json',
              'evidence/ingress-installer-verification-r85.json',
              'evidence/instances-r85-final-candidate.json',
              'evidence/performance-upgrade-integration-r85.json',
              'evidence/checkpoint-phase-integration-r85.json'}
OBSERVED = {}


def observe(name, data):
    meta = {'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    assert OBSERVED.setdefault(name, meta) == meta, 'Evidence changed during validation: ' + name
    return dict(meta)


def read(name):
    data = (ROOT / name).read_bytes()
    observe(name, data)
    return json.loads(data)


def pin(name):
    data = (ROOT / name).read_bytes()
    return observe(name, data)


def validate():
    OBSERVED.clear()
    # Capture evidence before using it. The full source/installer audit runs
    # at the final boundary, before every captured hash is rechecked.
    plan, target = read('r85-package/update.json'), CORE
    assert target == CORE and len(plan['files']) == 48, 'Wrong final candidate'
    assert plan['files']['core511-source/scripts/delivery511/runtime-ingress.mjs']['after'] == INGRESS
    spec = importlib.util.spec_from_file_location('scoped_seal_assessor', ROOT / 'tests/runtime/scoped50-retry1-assessment.py')
    assessor = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(assessor)
    campaign_plan, binding = read(assessor.PLAN), read(assessor.BINDING)
    assert pin(assessor.PLAN)['sha256'] == PLAN_SHA, 'Preregistered criteria changed'
    assert not assessor.validate_binding(campaign_plan, binding), 'Invalid or changed binding'
    assert binding['coreSHA256'] == target and binding['deliverySHA256'] == INGRESS
    assert [s['id'] for s in campaign_plan['stages']] == STAGES
    functional_paths = {r['path'] for r in binding['rolePins']['functionalProof']}
    assert FUNCTIONAL <= functional_paths, 'Missing final functional prerequisite'
    # These are the already-written, hash-bound proofs, not newly asserted dates.
    # Their filesystem completion precedes the frozen binding; every raw load
    # must in turn begin after that binding. A rewritten proof fails closed.
    for name in functional_paths:
        assert (ROOT / name).stat().st_mtime_ns / 1_000_000 <= binding['createdAtEpochMs'], 'Functional proof written after binding: ' + name
    assert read('evidence/installer-final.json')['passed'] == 99
    instances = read('evidence/instances-r85-final-candidate.json')
    assert instances['uniqueChecks'] == 8 and instances['failed'] == instances['skipped'] == 0
    ingress = read('evidence/ingress-installer-verification-r85.json')
    assert ingress['targetCoreSHA256'] == target and ingress['productionFiles'] == 48

    paths = set()
    def include(name):
        meta = pin(name)  # Missing files are errors, never optional passes.
        paths.add(name)
        return meta
    def include_meta(meta):
        actual = include(meta['path'])
        assert actual['sha256'] == meta['sha256'] and actual['bytes'] == meta['bytes'], 'Evidence changed: ' + meta['path']
    def include_table(table):
        for name, meta in table.items():
            if isinstance(meta, str):
                assert include(name)['sha256'] == meta
            else:
                include_meta({'path': name, **meta})

    report = read(ASSESSMENT)
    assert report['plan'] == pin(assessor.PLAN) and report['binding'] == pin(assessor.BINDING)
    assert report['coreSHA256'] == target and report['deliverySHA256'] == INGRESS
    assert report['status'] == 'scoped50-quality-passed'
    assert report['historicalFullAcceptance'] == 'not-assessed'
    assert report['durableInputPolicyAssessed'] is False and report['renderedGameFPSAssessed'] is False
    assert report['liveDeploymentPerformed'] is False
    rows, observations = [], []
    for stage in campaign_plan['stages']:
        raw_path = stage['rawArtifact']
        raw, stored = read(raw_path), read(raw_path.replace('.json', '-summary.json'))
        assert isinstance(stored, list) and len(stored) == 1
        derived = assessor._summarizer.summarize(ROOT / raw_path)
        assert assessor.normalized_summary(stored[0]) == assessor.normalized_summary(derived), 'Summary differs from complete raw evidence'
        row, outliers = assessor.assess_stage(stage, raw, stored[0], binding)
        assert row['integrityPassed'] is True and row['integrityFailures'] == []
        assert row['allSamplesIncluded'] is True and row['startEpochMs'] > binding['createdAtEpochMs']
        if row['requiredForScoped50']:
            assert row['scopedQualityPassed'] is True and row['movementRuntimeQualityPassed'] is True
        if row['role'] == 'primary-quality':
            assert row['newMeasuredWireP99TargetPassed'] is True
        for field in ('raw', 'summary', 'log'):
            include_meta(row[field])
        rows.append(row)
        observations.extend(outliers)
    campaign = assessor.assess_campaign(campaign_plan, rows)
    assert campaign['testedStages'] == STAGES and campaign['notRunStages'] == campaign['campaignFailures'] == []
    assert campaign['eligibleForScopedReleaseReview'] is True
    assert campaign['scoped50QualityPassed'] is True and campaign['allStagesIntegrityPassed'] is True
    assert all(report[k] == value for k, value in campaign.items()) and report['stages'] == rows
    assert sum(row['requiredForScoped50'] for row in rows) == 5 and len(rows) == 6
    ledger = read(LEDGER)
    expected_ledger = {'plan': pin(assessor.PLAN), 'binding': pin(assessor.BINDING),
                       'thresholdMs': 300, 'allObservationsRetained': True,
                       'count': len(observations), 'observations': observations}
    assert ledger == expected_ledger, 'Every original outlier and its context must be retained'
    assert report['wireOutliers'] == pin(LEDGER) and report['wireOutlierInvestigations'] == len(observations)

    base_paths = {
        'evidence/handoff-integrity.json', 'evidence/source-recovery.json',
        'evidence/client-integration.json', 'evidence/client-review.json', 'evidence/browser-native.json',
        'evidence/progress-summary-r85.json', 'evidence/collect-summary-r85.json',
        'evidence/reward-rank-refresh-verification-r85.json', 'evidence/independent-integration-review.json',
        'evidence/independent-collect-trigger-proof.json', 'evidence/performance-metric-provenance-r85.json',
        'evidence/ingress-nodelay-delivery-verification-r85.json', 'evidence/ingress-installer-verification-r85.json',
        'evidence/instances-r85-final-candidate.json', 'evidence/instances-r85-final-candidate.tap',
        'evidence/installer-final.json', 'evidence/final-syntax.json', 'evidence/package-plan.json',
        'tests/writer/writer-verification.json', 'tests/writer/writer-production-pins.json',
        'tests/client/native-respawn-change.json', 'tests/runtime/run.py',
        'tests/runtime/final-crowd-summary.py', 'seal_release.py', 'build_release.py',
        'prepare_package.py', 'publish_r85.py', 'seal_release_scoped_retry1.py',
        'evidence/scoped50-assessor-review-r85.json', 'tests/runtime/scoped50-assessment-unit.test.py',
        'tests/runtime/create-scoped50-retry1-binding.py', 'evidence/scoped50-retry1-inputs/functional-certificate.json',
        'evidence/scoped50-retry1-assessment-plan-r85.md', 'KURULUM.md', 'SONUC.md', 'R85_DURUM.md',
        ASSESSMENT, LEDGER, assessor.PLAN, assessor.BINDING, assessor.ASSESSOR, assessor.SUMMARIZER,
    }
    for name in base_paths:
        include(name)
    for name in ('KURULUM.md', 'SONUC.md', 'R85_DURUM.md'):
        assert b'__PENDING__' not in (ROOT / name).read_bytes(), 'Unfinished release documentation: ' + name
    for meta in binding['pins']:
        include_meta(meta)
    for name in ('progress-summary-r85.json', 'collect-summary-r85.json'):
        for meta in read('evidence/' + name)['artifacts']:
            include_meta(meta)
    for name in ('reward-rank-refresh-verification-r85.json', 'ingress-nodelay-delivery-verification-r85.json', 'ingress-installer-verification-r85.json'):
        include_table(read('evidence/' + name)['evidence'])
    for result in read('tests/writer/writer-verification.json')['results']:
        assert include(result['log'])['sha256'] == result['sha256']
    include_table(instances['pins'])
    for result in read('evidence/installer-final.json')['runs']:
        assert include(result['output'])['sha256'] == result['sha256']
    for folder, values in [('r85-package/modules', read('evidence/installer-final.json')['modules']),
                           ('tests/installer', read('evidence/installer-final.json')['tests'])]:
        for name, digest in values.items():
            assert include(folder + '/' + name)['sha256'] == digest
    inline = read('evidence/writer-inline-verification-r85.json')
    include('evidence/writer-inline-verification-r85.json')
    for meta in [inline['candidateAfter'], *inline['artifacts']]:
        include_meta(meta)
    for name in ('independent-deaths-r85-verification.json', 'independent-death-review-final-addendum-r85.json', 'crowd-fix-integration-r85.json'):
        include('evidence/' + name)
    for meta in read('evidence/independent-deaths-r85-verification.json')['artifacts']:
        # This older producer report recorded SHA256 without a byte count.
        # Verify that original hash, then pin the actual byte count in the seal.
        assert include(meta['path'])['sha256'] == meta['sha256']
    approval = read('evidence/independent-death-review-final-addendum-r85.json')
    for meta in [*approval['candidateFiles'], *approval['newArtifacts']]:
        include_meta(meta)
    for name in ('final-candidate-integration-r85.json', 'performance-upgrade-integration-r85.json', 'checkpoint-phase-integration-r85.json'):
        include('evidence/' + name)
        upgrade = read('evidence/' + name)
        for meta in upgrade['evidencePins']:
            include_meta(meta)
        for item in upgrade['files']:
            for side in ('before', 'after'):
                if item.get(side) is not None:
                    include_meta(item[side])
    # Retry registration retains the original failed campaign byte for byte.
    # Its failure cannot be adopted as evidence of this new candidate's success.
    include('seal_release_scoped.py')
    include('evidence/scoped50-retry1-preregistration-r85.json')
    include('evidence/scoped50-retry1-independent-review-r85.json')
    registration = read('evidence/scoped50-retry1-preregistration-r85.json')
    approval = read('evidence/scoped50-retry1-independent-review-r85.json')
    assert registration['plan'] == pin(assessor.PLAN)
    assert approval['preregistration'] == pin('evidence/scoped50-retry1-preregistration-r85.json')
    assert approval['status'] == 'preregistration-and-path-only-tooling-reviewed'
    for field in ('plan', 'planMarkdown', 'assessor', 'bindingHelper'):
        include_meta(registration[field])
        assert approval[field] == registration[field]
    for meta in registration['originalArtifactsVerifiedUnchanged']:
        include_meta(meta)
    original_failure = read('evidence/scoped50-assessment-r85.json')
    assert original_failure['eligibleForScopedReleaseReview'] is False
    assert original_failure['status'] == 'scoped50-blocked-or-incomplete'
    assert original_failure['notRunStages'] == ['capacity-100']
    # Preserve the historical gate and failures as evidence only, never recast
    # their status as a scoped pass and never overwrite them.
    for name in ('evidence/final-release-gate.json', 'evidence/crowd-summary-r85.json'):
        if (ROOT / name).exists():
            include(name)
    audited_plan, audited_target = audit()
    assert audited_plan == plan and audited_target == target, 'Final audit differs from captured candidate'
    for name in sorted(set(paths) | set(OBSERVED)):
        pin(name)  # Rechecking must equal the first observed bytes, never repin a change.
    pins = [dict(OBSERVED[name]) for name in sorted(OBSERVED)]
    return {'version': 'R85_GAMEPLAY', 'recordedUtc': datetime.now(timezone.utc).isoformat(),
            'assessmentKind': 'preregistered-scoped50', 'campaign': 'retry1', 'coreSHA256': target,
            'baseCoreSHA256': plan['baseCoreSHA256'], 'deliverySHA256': INGRESS,
            'productionFiles': plan['files'], 'allRequiredChecksPassed': True,
            'scoped50QualityPassed': True, 'allStagesIntegrityPassed': True,
            'historicalFullAcceptance': 'not-assessed', 'durableInputPolicyAssessed': False,
            'capacity100Status': campaign['capacity100Status'], 'historical100TargetRetained': True,
            'liveDeploymentPerformed': False, 'crowdTestedLast': True,
            'chronology': {'functionalProofsCompletedBeforeBinding': True,
                           'bindingCreatedAtEpochMs': binding['createdAtEpochMs'],
                           'firstLoadStartEpochMs': rows[0]['startEpochMs'],
                           'lastLoadEndEpochMs': rows[-1]['endEpochMs']},
            'crowdSummary': ASSESSMENT, 'campaignBinding': pin(assessor.BINDING),
            'wireOutliers': pin(LEDGER), 'wireOutlierInvestigations': len(observations),
            'evidencePins': pins,
            'scope': 'Scoped preregistered50-player quality and all-six-stage integrity only. Complete100-player historical acceptance and durable-input policy remain not assessed. Every over300ms wire observation remains visible. No live VDS, WAN, rendered FPS or physical-mobile claim.'}


def main():
    if not __debug__:
        raise RuntimeError('Release verification requires Python assertions')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--seal', action='store_true', help='Exclusively create the new scoped gate after successful audit')
    args = parser.parse_args()
    gate = validate()
    if args.seal:
        with (ROOT / OUTPUT).open('xb') as output:
            output.write(encoded(gate))
            output.flush()
            os.fsync(output.fileno())
    print(json.dumps({'verified': True, 'sealed': args.seal, 'gate': OUTPUT,
                      'coreSHA256': CORE, 'evidenceFiles': len(gate['evidencePins'])}))


if __name__ == '__main__':
    main()
