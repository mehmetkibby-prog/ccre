#!/usr/bin/env python3
"""Urgent two-run stability classification; preserve the failed longer campaigns."""
from pathlib import Path
import datetime
import importlib.util
import json
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
PLAN = 'evidence/urgent50-assessment-plan-r85.json'
BINDING = 'evidence/urgent50-final-binding-r85.json'
ASSESSOR = 'tests/runtime/urgent50-assessment.py'
DEPENDENCY = 'tests/runtime/scoped50-retry1-assessment.py'
spec = importlib.util.spec_from_file_location('urgent50_validation', ROOT / DEPENDENCY)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
base.PLAN, base.BINDING, base.ASSESSOR = PLAN, BINDING, ASSESSOR
SUMMARIZER, TOPOLOGY = base.SUMMARIZER, base.TOPOLOGY
pin, read, write = base.pin, base.read, base.write


def validate_binding(plan, binding):
    failures = base.validate_binding(plan, binding)
    if pin(DEPENDENCY) not in binding.get('pins', []):
        failures.append('bound_validation_dependency')
    return failures


def main():
    plan, binding = read(PLAN), read(BINDING)
    failures = validate_binding(plan, binding)
    if failures:
        raise ValueError('Invalid urgent binding: ' + ', '.join(failures))
    rows, outliers = [], []
    for stage in plan['stages']:
        if not (ROOT / stage['rawArtifact']).exists():
            continue
        raw = read(stage['rawArtifact'])
        summary = read(stage['rawArtifact'].replace('.json', '-summary.json'))
        if not isinstance(summary, list) or len(summary) != 1:
            raise ValueError('Expected exactly one summary')
        actual = base._summarizer.summarize(ROOT / stage['rawArtifact'])
        if base.normalized_summary(summary[0]) != base.normalized_summary(actual):
            raise ValueError('Summary differs from complete raw evidence')
        row, observations = base.assess_stage(stage, raw, summary[0], binding)
        prediction = row['prediction']
        row['urgentStabilityPassed'] = row['integrityPassed'] and all(
            prediction.get(k) == 0 for k in ('predictionCapEpisodes', 'predictionLimitedFrames', 'predictionLimitedInputMs'))
        row['previousScopedQualityFieldsAreDiagnosticOnly'] = True
        rows.append(row)
        outliers.extend(observations)
    expected = [s['id'] for s in plan['stages']]
    tested = [r['id'] for r in rows]
    campaign_failures = base.validate_campaign_order(rows)
    if tested != expected[:len(tested)]:
        campaign_failures.append('registered_stage_order')
    if any(not r['urgentStabilityPassed'] for r in rows[:-1]):
        campaign_failures.append('progression_after_mandatory_failure')
    passed = tested == expected and not campaign_failures and all(r['urgentStabilityPassed'] for r in rows)
    write('evidence/urgent50-wire-outliers-r85.json', {
        'plan': pin(PLAN), 'binding': pin(BINDING), 'thresholdMs': 300,
        'allObservationsRetained': True, 'count': len(outliers), 'observations': outliers})
    report = {
        'writtenAtUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'plan': pin(PLAN), 'binding': pin(BINDING), 'assessor': pin(ASSESSOR), 'validationDependency': pin(DEPENDENCY),
        'coreSHA256': binding['coreSHA256'], 'deliverySHA256': binding['deliverySHA256'],
        'urgentStabilityPassed': passed, 'scope': plan['scope'], 'testedStages': tested,
        'notRunStages': [s for s in expected if s not in tested], 'campaignFailures': campaign_failures,
        'stages': rows, 'wireOutliers': pin('evidence/urgent50-wire-outliers-r85.json'),
        'originalLongCampaignPassed': False, 'historicalFullAcceptance': 'not-assessed',
        'durableInputPolicyAssessed': False, 'liveDeploymentPerformed': False, 'renderedGameFPSAssessed': False,
        'limitations': plan['exclusions']}
    write('evidence/urgent50-assessment-r85.json', report)
    print(json.dumps({'urgentStabilityPassed': passed, 'testedStages': tested,
                      'campaignFailures': campaign_failures, 'stagesPassed': [r['urgentStabilityPassed'] for r in rows]}))


if __name__ == '__main__':
    main()
