#!/usr/bin/env python3
"""Pure assessor regression checks; no loads, campaign binding or report writes.

Historical runs remain historical. The synthetic binding predates each fixture
solely to exercise assess_stage; it is never a registered campaign binding.
"""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


ASSESSOR = module('scoped50_assessment_under_test', 'tests/runtime/scoped50-assessment.py')
SUMMARIZER = module('scoped50_historical_summarizer', 'tests/runtime/summarize-mixed-load.py')


class MemoryPath:
    def __init__(self, name, data):
        self.name, self.data = name, data

    def read_bytes(self):
        return self.data

    def __str__(self):
        return self.name


class Scoped50AssessmentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixtures = {}
        for players, label in [(1, 'r85-final-exact2-1'), (10, 'r85-final-exact2-10'),
                               (50, 'r85-crowd-diagnostic3-50')]:
            name = 'evidence/native-mixed-load-' + label + '.json'
            cls.fixtures[players] = (name, json.loads((ROOT / name).read_text()))

    def fixture(self, players=1):
        name, original = self.fixtures[players]
        raw = copy.deepcopy(original)
        stage = {'id': 'historical-diagnostic-' + str(players), 'label': 'unit-only-' + str(players),
                 'players': players, 'seconds': raw['seconds'],
                 'role': 'primary-quality' if players == 50 else 'regression', 'rawArtifact': name}
        binding = {'coreSHA256': raw['coreSHA256'], 'deliverySHA256': raw['deliverySHA256'],
                   'harnessPins': copy.deepcopy(raw['harnessPins']), 'topologyPins': copy.deepcopy(raw['topologyPins']),
                   'nodeVersion': raw['nodeVersion'], 'nodeExecArgv': copy.deepcopy(raw['nodeExecArgv']),
                   'createdAtEpochMs': raw['generatorResources']['startEpochMs'] - 1000,
                   'unitTestOnly': True}
        return stage, raw, binding

    def assess(self, stage, raw, binding, summary_edit=None):
        # Supply coherent bytes/hash/derived summary for the in-memory variant,
        # so a missing-data test cannot pass merely by tripping a stale hash.
        data = json.dumps(raw, sort_keys=True, separators=(',', ':')).encode()
        summary = SUMMARIZER.summarize(MemoryPath(str(ROOT / stage['rawArtifact']), data))
        if summary_edit:
            summary_edit(summary)
        native_pin = ASSESSOR.pin

        def pin(name):
            if name == stage['rawArtifact']:
                return {'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
            return native_pin(name)

        with patch.object(ASSESSOR, 'pin', side_effect=pin), \
             patch.object(ASSESSOR, 'write', side_effect=AssertionError('unit test attempted report write')):
            return ASSESSOR.assess_stage(stage, raw, summary, binding)

    def rejected_integrity(self, raw_edit, players=1, summary_edit=None):
        stage, raw, binding = self.fixture(players)
        raw_edit(raw)
        result, _ = self.assess(stage, raw, binding, summary_edit)
        self.assertFalse(result['integrityPassed'], result)
        self.assertFalse(result['scopedQualityPassed'], result)

    def test_historical_one_and_ten_pass_scoped_regression_checks(self):
        for players in (1, 10):
            with self.subTest(players=players):
                result, outliers = self.assess(*self.fixture(players))
                self.assertTrue(result['integrityPassed'], result['integrityFailures'])
                self.assertTrue(result['movementRuntimeQualityPassed'], result['movementRuntimeQualityFailures'])
                self.assertTrue(result['scopedQualityPassed'])
                self.assertTrue(result['newMeasuredWireP99TargetPassed'])
                self.assertEqual(len(outliers), 0)

    def test_historical_diagnostic50_retains_cap_limited_input_and_all_sixty_outliers(self):
        result, outliers = self.assess(*self.fixture(50))
        self.assertTrue(result['integrityPassed'], result['integrityFailures'])
        self.assertFalse(result['movementRuntimeQualityPassed'])
        self.assertFalse(result['scopedQualityPassed'])
        self.assertFalse(result['newMeasuredWireP99TargetPassed'])
        self.assertEqual(result['prediction']['predictionCapEpisodes'], 1)
        self.assertEqual(result['prediction']['predictionLimitedFrames'], 2)
        self.assertAlmostEqual(result['prediction']['predictionLimitedInputMs'], 3.491232999999726)
        self.assertEqual(result['wireOver300Count'], 60)
        self.assertEqual(len(outliers), 60)
        self.assertEqual(len({r['sampleIndex'] for r in outliers}), 60)
        self.assertTrue(all(r['investigationStatus'] == 'unresolved-investigation-item' for r in outliers))

    def test_historical_writer_prefix_and_all_late_spans_remain_distinct(self):
        stage, raw, binding = self.fixture(10)
        result, _ = self.assess(stage, raw, binding)
        self.assertTrue(result['checks']['complete_writer_observations'])
        self.assertLess(raw['writerAckMs']['count'], len(raw['writerAcks']))
        self.assertEqual(result['writerSnapshotAckMs'], raw['writerAckMs'])
        self.assertEqual(result['writerAckMs']['count'], len(raw['writerAcks']))

    def test_tampered_writer_prefix_is_rejected(self):
        self.rejected_integrity(lambda r: r['writerAckMs'].update(p99=0))

    def test_missing_actor_array_is_incomplete_evidence(self):
        self.rejected_integrity(lambda r: r['clientTransport'].pop('actors'))

    def test_missing_actor_prediction_counter_is_not_an_observed_zero(self):
        for key in ('predictionCapEpisodes', 'predictionLimitedFrames', 'predictionLimitedInputMs'):
            with self.subTest(field=key):
                self.rejected_integrity(lambda r, k=key: r['clientTransport']['actors'][0].pop(k))

    def test_duplicate_actor_cannot_replace_missing_actor(self):
        def mutate(raw):
            raw['clientTransport']['actors'][1] = copy.deepcopy(raw['clientTransport']['actors'][0])
        self.rejected_integrity(mutate, players=10)

    def test_duplicate_economic_actor_cannot_replace_missing_actor(self):
        def mutate(raw):
            raw['economics'][1] = copy.deepcopy(raw['economics'][0])
        self.rejected_integrity(mutate, players=10)

    def test_missing_errors_or_faults_is_not_zero_errors(self):
        for key in ('errors', 'faults'):
            with self.subTest(field=key):
                self.rejected_integrity(lambda r, k=key: r.pop(k))

    def test_missing_raw_measurement_is_incomplete(self):
        self.rejected_integrity(lambda r: r.pop('measurement'))

    def test_unfinished_loop_cannot_pass_as_complete(self):
        self.rejected_integrity(lambda r: r['measurement']['measurement']['eventLoops'][0].update(complete=False))

    def test_wrong_loop_run_id_is_rejected(self):
        self.rejected_integrity(lambda r: r['measurement']['measurement']['eventLoops'][0].update(runId='different-run'))

    def test_truncated_loop_window_is_rejected(self):
        def mutate(raw):
            row = raw['measurement']['measurement']['eventLoops'][0]
            row['durationMs'] = 1
            row['endedAtMs'] = row['startedAtMs'] + 1
        self.rejected_integrity(mutate)

    def test_duplicate_loop_target_is_rejected(self):
        def mutate(raw):
            rows = raw['measurement']['measurement']['eventLoops']
            rows.append(copy.deepcopy(rows[0]))
        self.rejected_integrity(mutate)

    def test_raw_timer_or_histogram_cannot_be_hidden_by_smaller_reported_maximum(self):
        for key in ('histogramMaxPauseMs', 'timerMaxPauseMs'):
            with self.subTest(field=key):
                self.rejected_integrity(lambda r, k=key: r['measurement']['measurement']['eventLoops'][0].update({k: 9999}))

    def test_nan_resource_totals_are_incomplete_evidence(self):
        for key in ('maxRssBytes', 'totalCpuFraction'):
            with self.subTest(field=key):
                self.rejected_integrity(lambda r, k=key: r['measurement']['resources'].update({k: float('nan')}))

    def test_nan_loop_elu_is_incomplete_evidence(self):
        self.rejected_integrity(lambda r: r['measurement']['measurement']['eventLoops'][0].update(elu=float('nan')))

    def test_missing_generator_process_evidence_is_incomplete(self):
        self.rejected_integrity(lambda r: r['generatorResources'].pop('processes'))

    def test_summary_tamper_cannot_hide_historical_caps(self):
        def edit(summary):
            summary.update(predictionCapEpisodes=0, predictionLimitedFrames=0, predictionLimitedInputMs=0)
            summary['ackMs'] = {**summary['ackMs'], 'p99': 1}
        self.rejected_integrity(lambda r: None, players=50, summary_edit=edit)

    def test_binding_must_precede_first_measurement(self):
        stage, raw, binding = self.fixture()
        binding['createdAtEpochMs'] = raw['generatorResources']['startEpochMs'] + 1
        result, _ = self.assess(stage, raw, binding)
        self.assertFalse(result['integrityPassed'])


class Scoped50CampaignOrderTests(unittest.TestCase):
    def rows(self):
        return [
            {'id': 'primary-50-first', 'runId': 'first-unique-native-run',
             'startEpochMs': 1000, 'endEpochMs': 181000, 'rawSha256': 'a' * 64},
            {'id': 'primary-50-second', 'runId': 'second-unique-native-run',
             'startEpochMs': 190000, 'endEpochMs': 370000, 'rawSha256': 'b' * 64},
        ]

    def test_separate_chronological_runs_are_accepted(self):
        self.assertEqual(ASSESSOR.validate_campaign_order(self.rows()), [])

    def test_copied_first_primary_run_cannot_satisfy_second_primary(self):
        rows = self.rows()
        rows[1] = {**copy.deepcopy(rows[0]), 'id': 'primary-50-second'}
        self.assertTrue(ASSESSOR.validate_campaign_order(rows))

    def test_duplicate_run_id_is_rejected_even_with_distinct_artifact_bytes(self):
        rows = self.rows()
        rows[1]['runId'] = rows[0]['runId']
        self.assertTrue(ASSESSOR.validate_campaign_order(rows))

    def test_duplicate_raw_digest_is_rejected_even_with_distinct_run_id(self):
        rows = self.rows()
        rows[1]['rawSha256'] = rows[0]['rawSha256']
        self.assertTrue(ASSESSOR.validate_campaign_order(rows))

    def test_duplicate_stage_id_is_rejected(self):
        rows = self.rows()
        rows[1]['id'] = rows[0]['id']
        self.assertTrue(ASSESSOR.validate_campaign_order(rows))

    def test_overlapping_native_windows_are_rejected(self):
        rows = self.rows()
        rows[1]['startEpochMs'] = rows[0]['endEpochMs'] - 1
        self.assertTrue(ASSESSOR.validate_campaign_order(rows))

    def test_reverse_execution_order_is_rejected(self):
        rows = self.rows()
        first, second = rows[0], rows[1]
        first['startEpochMs'], second['startEpochMs'] = second['startEpochMs'], first['startEpochMs']
        first['endEpochMs'], second['endEpochMs'] = second['endEpochMs'], first['endEpochMs']
        self.assertTrue(ASSESSOR.validate_campaign_order(rows))

    def test_inverted_measurement_window_is_rejected(self):
        rows = self.rows()
        rows[0]['endEpochMs'] = rows[0]['startEpochMs'] - 1
        self.assertTrue(ASSESSOR.validate_campaign_order(rows))

    def test_nonfinite_timestamps_are_rejected(self):
        for key in ('startEpochMs', 'endEpochMs'):
            for value in (float('nan'), float('inf'), -float('inf')):
                with self.subTest(field=key, value=value):
                    rows = self.rows()
                    rows[0][key] = value
                    self.assertTrue(ASSESSOR.validate_campaign_order(rows))


class Scoped50BindingTests(unittest.TestCase):
    @staticmethod
    def memory_pin(name):
        data = ('unit-test-virtual-file:' + name).encode()
        return {'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

    def fixture(self):
        plan = json.loads((ROOT / ASSESSOR.PLAN).read_text())
        role_paths = {
            'plan': [ASSESSOR.PLAN], 'assessor': [ASSESSOR.ASSESSOR], 'summarizer': [ASSESSOR.SUMMARIZER],
            'coreManifest': ['unit-only/core-manifest.json'],
            'deliveryIngress': ['unit-only/runtime-ingress.mjs'],
            'gameClient': ['unit-only/game-client.js'], 'transportClient': ['unit-only/transport-client.js'],
            'nativeManifest': ['unit-only/native-manifest.json'], 'nodeBinary': ['unit-only/node'],
            'runtimeConfig': ['unit-only/runtime-config.json'], 'functionalProof': ['unit-only/functional-proof.json'],
            'environment': ['unit-only/environment.json'],
            'harness': ['unit-only/native-mixed-load-realistic.mjs', 'unit-only/potion-ledger-fixture.mjs'],
            'generator': ['unit-only/native-mixed-generator-realistic.mjs'],
            'fixtureLoader': ['unit-only/run.py', 'unit-only/r84-fixture-loader.mjs', 'unit-only/register-r84-fixture.mjs'],
            'measurement': ['unit-only/load-measurements.mjs'],
        }
        topology_names = ['runtime-entry.mjs', 'runtime-host.mjs', 'runtime-ingress.mjs',
                          'channel-process.mjs', 'process-supervisor.mjs']
        paths = sorted({p for ps in role_paths.values() for p in ps} | {'unit-only/' + p for p in topology_names})
        pins = [self.memory_pin(p) for p in paths]
        roles = {k: [self.memory_pin(p) for p in ps] for k, ps in role_paths.items()}
        harness_names = ['native-mixed-load-realistic.mjs', 'native-mixed-generator-realistic.mjs',
                         'potion-ledger-fixture.mjs', 'run.py', 'r84-fixture-loader.mjs', 'register-r84-fixture.mjs']
        binding = {
            'schemaVersion': 1, 'status': 'frozen-before-scoped-campaign', 'createdAtEpochMs': 1000,
            'plan': self.memory_pin(ASSESSOR.PLAN), 'coreSHA256': 'c' * 64,
            'deliverySHA256': roles['deliveryIngress'][0]['sha256'],
            'nodeVersion': 'v22.23.4', 'nodeExecArgv': ['--no-lazy'],
            'expectedTopology': copy.deepcopy(ASSESSOR.TOPOLOGY), 'featureFlags': {'CORE511_UNIT_TEST_ONLY': '1'},
            'stageLabels': [{k: s[k] for k in ('id', 'label', 'rawArtifact')} for s in plan['stages']],
            'pins': pins, 'rolePins': roles,
            'harnessPins': {n: self.memory_pin('unit-only/' + n)['sha256'] for n in harness_names},
            'topologyPins': {n: {k: v for k, v in self.memory_pin('unit-only/' + n).items() if k != 'path'} for n in topology_names},
            'functionalVerification': {'passed': True, 'coreSHA256': 'c' * 64,
                                       'deliverySHA256': roles['deliveryIngress'][0]['sha256'],
                                       'proofPaths': role_paths['functionalProof']},
            'unitTestOnly': True,
        }
        return plan, binding

    def validate(self, plan, binding):
        with patch.object(ASSESSOR, 'pin', side_effect=self.memory_pin), \
             patch.object(ASSESSOR, 'write', side_effect=AssertionError('binding test attempted report write')):
            return ASSESSOR.validate_binding(plan, binding)

    def test_complete_in_memory_binding_is_accepted(self):
        self.assertEqual(self.validate(*self.fixture()), [])

    def test_empty_pin_list_is_rejected(self):
        plan, binding = self.fixture()
        binding['pins'] = []
        self.assertIn('binding_nonempty_unique_pins', self.validate(plan, binding))

    def test_every_mandatory_role_requires_pinned_evidence(self):
        for role in sorted(ASSESSOR.ROLES):
            with self.subTest(role=role):
                plan, binding = self.fixture()
                binding['rolePins'].pop(role)
                self.assertIn('binding_role_' + role, self.validate(plan, binding))

    def test_assessor_and_summarizer_bytes_must_match_bound_identity(self):
        for role in ('assessor', 'summarizer'):
            with self.subTest(role=role):
                plan, binding = self.fixture()
                binding['rolePins'][role][0]['sha256'] = 'f' * 64
                self.assertIn('binding_exact_' + role, self.validate(plan, binding))

    def test_functional_certificate_must_match_candidate(self):
        for field, value in [('passed', False), ('coreSHA256', 'e' * 64),
                             ('deliverySHA256', 'e' * 64), ('proofPaths', [])]:
            with self.subTest(field=field):
                plan, binding = self.fixture()
                binding['functionalVerification'][field] = value
                self.assertIn('binding_functional_verification', self.validate(plan, binding))

    def test_registered_stage_labels_are_mandatory(self):
        plan, binding = self.fixture()
        binding.pop('stageLabels')
        self.assertIn('binding_stage_labels', self.validate(plan, binding))

    def test_harness_and_topology_mapping_must_match_pinned_files(self):
        for group in ('harnessPins', 'topologyPins'):
            with self.subTest(group=group):
                plan, binding = self.fixture()
                name = next(iter(binding[group]))
                if group == 'harnessPins':
                    binding[group][name] = 'f' * 64
                else:
                    binding[group][name]['sha256'] = 'f' * 64
                self.assertIn('binding_' + group + '_' + name, self.validate(plan, binding))


class Scoped50CampaignPolicyTests(unittest.TestCase):
    def fixture(self):
        plan = json.loads((ROOT / ASSESSOR.PLAN).read_text())
        rows = []
        start = 1000
        for i, stage in enumerate(plan['stages']):
            end = start + stage['seconds'] * 1000
            rows.append({**copy.deepcopy(stage), 'runId': 'independent-run-' + str(i),
                         'startEpochMs': start, 'endEpochMs': end,
                         'rawSha256': hashlib.sha256(str(i).encode()).hexdigest(),
                         'requiredForScoped50': stage['players'] <= 50,
                         'scopedQualityPassed': True, 'integrityPassed': True,
                         'newMeasuredWireP99TargetPassed': True})
            start = end + 1000
        return plan, rows

    def test_complete_six_stage_campaign_can_reach_release_review(self):
        result = ASSESSOR.assess_campaign(*self.fixture())
        self.assertEqual(result['campaignFailures'], [])
        self.assertTrue(result['scoped50QualityPassed'])
        self.assertTrue(result['allStagesIntegrityPassed'])
        self.assertTrue(result['eligibleForScopedReleaseReview'])
        self.assertEqual(result['capacity100Status'], 'bounded-diagnostic-comparisons-passed')

    def test_only_100_player_performance_failure_preserves_scoped50_review(self):
        plan, rows = self.fixture()
        rows[-1].update(scopedQualityPassed=False, newMeasuredWireP99TargetPassed=False)
        result = ASSESSOR.assess_campaign(plan, rows)
        self.assertTrue(result['scoped50QualityPassed'])
        self.assertTrue(result['allStagesIntegrityPassed'])
        self.assertTrue(result['eligibleForScopedReleaseReview'])
        self.assertEqual(result['capacity100Status'], 'documented-100-player-target-not-demonstrated')

    def test_100_player_integrity_failure_blocks_release_review(self):
        plan, rows = self.fixture()
        rows[-1].update(integrityPassed=False, scopedQualityPassed=False)
        result = ASSESSOR.assess_campaign(plan, rows)
        self.assertTrue(result['scoped50QualityPassed'])
        self.assertFalse(result['allStagesIntegrityPassed'])
        self.assertFalse(result['eligibleForScopedReleaseReview'])
        self.assertEqual(result['capacity100Status'], 'integrity-blocked')

    def test_missing_100_player_run_blocks_release_review(self):
        plan, rows = self.fixture()
        result = ASSESSOR.assess_campaign(plan, rows[:-1])
        self.assertTrue(result['scoped50QualityPassed'])
        self.assertFalse(result['allStagesIntegrityPassed'])
        self.assertFalse(result['eligibleForScopedReleaseReview'])
        self.assertEqual(result['capacity100Status'], 'not-run')

    def test_progression_after_failed_first_primary_blocks_campaign(self):
        plan, rows = self.fixture()
        rows[3].update(scopedQualityPassed=False, newMeasuredWireP99TargetPassed=False)
        result = ASSESSOR.assess_campaign(plan, rows)
        self.assertIn('campaign_progressed_after_failure_primary-50-first', result['campaignFailures'])
        self.assertFalse(result['scoped50QualityPassed'])
        self.assertFalse(result['eligibleForScopedReleaseReview'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
