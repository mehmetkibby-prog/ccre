#!/usr/bin/env python3
"""Assess preregistered raw evidence. Never reinterpret the old diagnostic gate."""
from pathlib import Path
import datetime
import hashlib
import importlib.util
import json
import math
import re

ROOT = Path(__file__).resolve().parents[2]
PLAN = 'evidence/scoped50-retry1-assessment-plan-r85.json'
BINDING = 'evidence/scoped50-retry1-final-binding-r85.json'
ASSESSOR = 'tests/runtime/scoped50-retry1-assessment.py'
SUMMARIZER = 'tests/runtime/summarize-mixed-load.py'
TARGETS = {'main', 'world', 'reader', 'channel-1', 'channel-2', 'channel-3', 'channel-4'}
ROLES = {'plan', 'assessor', 'summarizer', 'coreManifest', 'deliveryIngress', 'gameClient',
         'transportClient', 'nativeManifest', 'nodeBinary', 'runtimeConfig', 'functionalProof',
         'environment', 'harness', 'generator', 'fixtureLoader', 'measurement'}
TOPOLOGY = {'nativeProcesses': 6, 'nativeMeasurementTargets': 7,
            'readerSharesMainProcess': True, 'generatorMaximum': 4}
_spec = importlib.util.spec_from_file_location('scoped50_summarizer', ROOT / SUMMARIZER)
_summarizer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_summarizer)


def read(name):
    return json.loads((ROOT / name).read_text())


def pin(name):
    data = (ROOT / name).read_bytes()
    return {'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def write(name, value):
    (ROOT / name).write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + '\n')


def finite(value, minimum=0, maximum=math.inf):
    return type(value) in (int, float) and math.isfinite(value) and minimum <= value <= maximum


def integer(value, minimum=0, maximum=math.inf):
    return type(value) is int and minimum <= value <= maximum


def close(left, right, absolute=1e-8):
    return finite(left) and finite(right) and math.isclose(left, right, rel_tol=1e-9, abs_tol=absolute)


def records(value):
    return isinstance(value, list) and all(isinstance(row, dict) for row in value)


def text(value):
    return isinstance(value, str) and bool(value)


def sha(value):
    return isinstance(value, str) and re.fullmatch('[0-9a-f]{64}', value) is not None


def percentile(values, quantile):
    values = sorted(values)
    return values[min(len(values) - 1, math.ceil(len(values) * quantile) - 1)] if values else None


def distribution(values):
    return {'count': len(values), **{f'p{q}': percentile(values, q / 100) for q in (50, 95, 99)},
            'max': max(values) if values else None}


def normalized_summary(summary):
    result = dict(summary)
    evidence = result.get('evidence')
    if isinstance(evidence, str):
        result['evidence'] = str((ROOT / evidence).resolve())
    return result


def derived_summary(raw, raw_path, raw_sha):
    """Use the same pure summarizer, while validating raw metrics independently below."""
    class MemoryPath:
        def read_bytes(self):
            return json.dumps(raw).encode()

        def __str__(self):
            return str((ROOT / raw_path).resolve())
    result = _summarizer.summarize(MemoryPath())
    result['sha256'] = raw_sha
    return normalized_summary(result)


def validate_campaign_order(stage_runs):
    """Return failures for independent, ordered, nonoverlapping actual measurement runs."""
    failures = []
    if not records(stage_runs):
        return ['campaign_records_missing']
    for field in ('id', 'runId', 'rawSha256'):
        values = [r.get(field) for r in stage_runs]
        if not all(text(v) for v in values) or len(values) != len(set(v for v in values if text(v))):
            failures.append('campaign_unique_' + field)
    previous_end = None
    for row in stage_runs:
        start, end = row.get('startEpochMs'), row.get('endEpochMs')
        if not finite(start) or not finite(end) or end <= start:
            failures.append('campaign_complete_window_' + str(row.get('id')))
            continue
        if previous_end is not None and start < previous_end:
            failures.append('campaign_chronological_nonoverlap_' + str(row.get('id')))
        previous_end = end
    return failures


def validate_binding(plan, binding):
    """Validate mandatory role coverage before reading any campaign stage."""
    failures = []
    def require(name, passed):
        if not passed:
            failures.append(name)
    require('binding_schema', binding.get('schemaVersion') == 1)
    require('binding_status', binding.get('status') == 'frozen-before-scoped-campaign')
    require('binding_time', finite(binding.get('createdAtEpochMs'), 1))
    require('binding_plan', binding.get('plan') == pin(PLAN))
    require('binding_identities', sha(binding.get('coreSHA256')) and sha(binding.get('deliverySHA256')))
    require('binding_runtime', text(binding.get('nodeVersion')) and binding.get('nodeExecArgv') == ['--no-lazy'])
    require('binding_topology', binding.get('expectedTopology') == TOPOLOGY)
    flags = binding.get('featureFlags')
    require('binding_feature_flags', isinstance(flags, dict) and bool(flags) and all(text(k) and isinstance(v, str) for k, v in flags.items()))
    require('binding_stage_labels', binding.get('stageLabels') == [{k: s[k] for k in ('id', 'label', 'rawArtifact')} for s in plan['stages']])
    pins = binding.get('pins')
    pins = pins if records(pins) else []
    paths = [p.get('path') for p in pins]
    require('binding_nonempty_unique_pins', bool(pins) and all(text(p) for p in paths) and len(paths) == len(set(p for p in paths if text(p))))
    by_path = {}
    for row in pins:
        path = row.get('path')
        if not text(path):
            continue
        by_path[path] = row
        try:
            require('bound_file_' + path, row == pin(path))
        except (OSError, ValueError):
            require('bound_file_' + path, False)
    roles = binding.get('rolePins')
    roles = roles if isinstance(roles, dict) else {}
    for role in sorted(ROLES):
        entries = roles.get(role)
        valid = records(entries) and bool(entries)
        if valid:
            valid = all(text(p.get('path')) and p == by_path.get(p['path']) for p in entries)
        require('binding_role_' + role, valid)
    for role, path in [('plan', PLAN), ('assessor', ASSESSOR), ('summarizer', SUMMARIZER)]:
        require('binding_exact_' + role, roles.get(role) == [pin(path)])
    # A self-consistent raw header alone cannot supply missing disk identity pins.
    for name in ('harnessPins', 'topologyPins'):
        mapping = binding.get(name)
        valid = isinstance(mapping, dict) and bool(mapping)
        require('binding_' + name, valid)
        if valid:
            for source, value in mapping.items():
                digest = value.get('sha256') if isinstance(value, dict) else value
                require('binding_' + name + '_' + source, sha(digest) and any(
                    p.get('sha256') == digest and Path(p['path']).name == Path(source).name for p in pins if text(p.get('path'))))
    required_harness = {'native-mixed-load-realistic.mjs', 'native-mixed-generator-realistic.mjs', 'potion-ledger-fixture.mjs',
                        'run.py', 'r84-fixture-loader.mjs', 'register-r84-fixture.mjs'}
    require('binding_harness_coverage', set(binding.get('harnessPins', {})) == required_harness)
    expected_sources = {'harness': {'native-mixed-load-realistic.mjs'}, 'generator': {'native-mixed-generator-realistic.mjs'},
                        'fixtureLoader': {'run.py', 'r84-fixture-loader.mjs', 'register-r84-fixture.mjs'},
                        'measurement': {'load-measurements.mjs'}}
    for role, names in expected_sources.items():
        require('binding_source_role_' + role, names <= {Path(p['path']).name for p in roles.get(role, []) if isinstance(p, dict) and text(p.get('path'))})
    require('binding_delivery_role', any(p.get('sha256') == binding.get('deliverySHA256') for p in roles.get('deliveryIngress', []) if isinstance(p, dict)))
    verification = binding.get('functionalVerification', {})
    proof_paths = [p.get('path') for p in roles.get('functionalProof', []) if isinstance(p, dict)]
    require('binding_functional_verification', isinstance(verification, dict) and verification.get('passed') is True
            and verification.get('coreSHA256') == binding.get('coreSHA256')
            and verification.get('deliverySHA256') == binding.get('deliverySHA256')
            and verification.get('proofPaths') == proof_paths and bool(proof_paths))
    return failures


def assess_campaign(plan, rows):
    """Pure release classification: 100-player performance and integrity differ."""
    expected = [s['id'] for s in plan['stages']]
    tested = [s['id'] for s in rows]
    failures = validate_campaign_order(rows)
    if tested != expected[:len(tested)]:
        failures.append('campaign_preregistered_stage_order')
    for earlier, later in zip(rows, rows[1:]):
        if earlier['requiredForScoped50'] and not earlier['scopedQualityPassed']:
            failures.append('campaign_progressed_after_failure_' + earlier['id'])
    primary = [s for s in rows if s['requiredForScoped50']]
    quality = not failures and len(primary) == 5 and all(s['scopedQualityPassed'] for s in primary)
    integrity = not failures and tested == expected and all(s['integrityPassed'] for s in rows)
    capacity = next((s for s in rows if s['players'] == 100), None)
    capacity_status = ('not-run' if capacity is None else 'integrity-blocked' if not capacity['integrityPassed']
        else 'bounded-diagnostic-comparisons-passed' if capacity['scopedQualityPassed'] and capacity['newMeasuredWireP99TargetPassed']
        else 'documented-100-player-target-not-demonstrated')
    return {'testedStages': tested, 'notRunStages': [s for s in expected if s not in tested],
            'campaignFailures': failures, 'scoped50QualityPassed': quality, 'allStagesIntegrityPassed': integrity,
            'eligibleForScopedReleaseReview': quality and integrity, 'capacity100Status': capacity_status}


def assess_stage(stage, raw, summary, binding):
    integrity, quality, checks = [], [], {}
    count, duration = stage['players'], stage['seconds'] * 1000
    def check(name, passed):
        checks[name] = bool(passed)
    check('native_transport_and_economy', raw.get('passed') is True)
    check('no_error_or_fault', isinstance(raw.get('errors'), list) and not raw['errors']
          and isinstance(raw.get('faults'), list) and not raw['faults']
          and not raw.get('error') and not raw.get('cleanupErrors'))
    for key, unchanged in [('coreSHA256', 'sourceUnchanged'), ('deliverySHA256', 'deliveryUnchanged')]:
        check(key + '_identity', sha(raw.get(key)) and raw.get(key) == binding.get(key) and raw.get(unchanged) is True)
    for key in ('harnessPins', 'topologyPins'):
        check(key + '_identity', isinstance(raw.get(key), dict) and bool(raw[key]) and raw[key] == binding.get(key))
    check('normal_startup', raw.get('mainEagerStartup') is True and raw.get('nodeExecArgv') == ['--no-lazy']
          and raw.get('nodeExecArgv') == binding.get('nodeExecArgv') and text(raw.get('nodeVersion')) and raw['nodeVersion'] == binding.get('nodeVersion'))
    check('exact_duration', integer(raw.get('seconds'), 1) and raw['seconds'] == stage['seconds'] and finite(raw.get('durationMs'), duration))
    check('timed_workload', raw.get('admissionOnly') is False and raw.get('realisticTransport') is True and text(raw.get('runId')))
    transport = raw.get('clientTransport') if isinstance(raw.get('clientTransport'), dict) else {}
    check('unchanged_prediction_budget', transport.get('predictionLimitMs') == 600 and transport.get('inputFrameIntervalMs') == 50)
    actors = transport.get('actors') if records(transport.get('actors')) else []
    ids = [a.get('actor') for a in actors]
    actor_ids = {a for a in ids if text(a)}
    actor_map = {a['actor']: a for a in actors if text(a.get('actor'))}
    check('exact_population', integer(raw.get('players'), 1) and raw['players'] == count and len(actors) == count and len(actor_ids) == count)
    actor_numbers = ('motionFrames', 'inputFrames', 'predictionCapEpisodes', 'predictionLimitedFrames', 'remainingCommandQueue')
    actor_metrics = ('maxMoveAckGapMs', 'maxGeneratorFrameGapMs', 'totalPredictionCapMs', 'sampledCappedFrameElapsedMs',
                     'maxPredictionCapEpisodeMs', 'predictionLimitedInputMs')
    check('complete_actor_metrics', bool(actors) and all(
        integer(a.get('channel'), 1, 4) and integer(a.get('generatorShard'), 0, min(4, count) - 1)
        and all(integer(a.get(k)) for k in actor_numbers) and a.get('inputFrames', 0) > 0
        and all(finite(a.get(k)) for k in actor_metrics)
        and all(isinstance(a.get(k), list) for k in ('cancelledInputs', 'predictionCapIntervals', 'predictionLimitedSamples')) for a in actors))
    check('prediction_observation_consistency', bool(actors) and all(
        isinstance(a.get('predictionCapIntervals'), list) and a.get('predictionCapEpisodes') == len(a['predictionCapIntervals'])
        and isinstance(a.get('predictionLimitedSamples'), list) and integer(a.get('predictionLimitedFrames'))
        and a['predictionLimitedFrames'] >= len(a['predictionLimitedSamples'])
        and (a.get('predictionCapEpisodes') != 0 or (a.get('totalPredictionCapMs') == 0 and a.get('maxPredictionCapEpisodeMs') == 0))
        and (a.get('predictionLimitedFrames') != 0 or a.get('predictionLimitedInputMs') == 0) for a in actors))
    check('input_drained', integer(raw.get('unacknowledged'), 0, 0) and integer(raw.get('runtimeCancelledInputCount'), 0, 0) and bool(actors)
          and all(a.get('cancelledInputs') == [] and a.get('remainingCommandQueue') == 0 for a in actors))
    predictions = {}
    for key in ('predictionCapEpisodes', 'predictionLimitedFrames', 'predictionLimitedInputMs'):
        predictions[key] = sum(a[key] for a in actors) if actors and all(finite(a.get(key)) for a in actors) else None
        if predictions[key] != 0:
            quality.append(key)
    predictions['predictionCapActors'] = sum(a['predictionCapEpisodes'] > 0 for a in actors) if actors and all(integer(a.get('predictionCapEpisodes')) for a in actors) else None
    predictions['maxPredictionCapEpisodeMs'] = max((a['maxPredictionCapEpisodeMs'] for a in actors), default=None) if all(finite(a.get('maxPredictionCapEpisodeMs')) for a in actors) else None

    samples = raw.get('samples') if records(raw.get('samples')) else []
    sample_valid = bool(samples) and all(text(s.get('actor')) and s['actor'] in actor_map
        and s.get('channel') == actor_map[s['actor']].get('channel') and integer(s.get('sequence'), 1)
        and text(s.get('action')) and integer(s.get('status'), 100, 599)
        and finite(s.get('ms')) and finite(s.get('offset')) for s in samples)
    check('complete_wire_samples', sample_valid)
    check('unique_wire_results', sample_valid and len({(s['actor'], s['sequence']) for s in samples}) == len(samples))
    check('all_actors_measured', sample_valid and {s['actor'] for s in samples} == actor_ids)
    valid_samples = [s for s in samples if finite(s.get('ms')) and finite(s.get('offset')) and text(s.get('action')) and integer(s.get('status'), 100, 599)]
    ack = distribution([s['ms'] for s in valid_samples])
    action_groups, groups = {}, {}
    for s in valid_samples:
        action_groups.setdefault(s['action'], []).append(s['ms'])
        groups.setdefault(f"{s['action']}:{s['status']}", []).append(s['ms'])
    check('wire_statistics_match_samples', sample_valid and raw.get('commandLatencyMs') == ack
        and raw.get('byAction') == {k: distribution(v) for k, v in action_groups.items()}
        and raw.get('statusCounts') == {str(k): sum(s['status'] == k for s in samples) for k in {s['status'] for s in valid_samples}})

    economics = raw.get('economics') if records(raw.get('economics')) else []
    check('complete_economic_population', len(economics) == count and {e.get('actor') for e in economics if text(e.get('actor'))} == actor_ids and len(actor_ids) == count)
    economy_ok = bool(economics)
    for e in economics:
        potion = e.get('automaticPotion', {})
        lives = e.get('terminalLives')
        economy_ok = economy_ok and isinstance(potion, dict) and records(lives) and len(lives) == 2
        economy_ok = economy_ok and e.get('potions') == e.get('expectedPotions') == 64 and e.get('auto_potion_remaining') == 0
        economy_ok = economy_ok and e.get('auto_potion_owned') == 0 and e.get('auto_potion_enabled') == 0 and e.get('auto_potion_total') == 1000000
        economy_ok = economy_ok and integer(potion.get('mutatingCommands'), 1) and potion.get('chargeDebit') == 900000 and finite(e.get('material'), 6)
        economy_ok = economy_ok and e.get('dropsRemaining') == 0 and e.get('xpClaims') == 2 and integer(e.get('allOwnTargetKillClaims'), 2)
        economy_ok = economy_ok and all(finite(l.get('hp')) and integer(l.get('spawn_round')) and (l['hp'] == 0 or l['spawn_round'] > 17) for l in (lives if records(lives) else []))
    check('economic_results', economy_ok)

    generator = raw.get('generatorResources') if isinstance(raw.get('generatorResources'), dict) else {}
    processes = generator.get('processes') if records(generator.get('processes')) else []
    start, end = generator.get('startEpochMs'), generator.get('endEpochMs')
    requested, completed = generator.get('nativeEndRequestedEpochMs'), generator.get('nativeEndCompletedEpochMs')
    generator_count = min(4, count)
    check('binding_precedes_load', finite(start, 1) and finite(binding.get('createdAtEpochMs'), 1) and start > binding['createdAtEpochMs'])
    check('separate_generators', raw.get('separateGenerator') is True and raw.get('generatorCount') == generator_count
        and generator.get('count') == generator_count and len(processes) == generator_count
        and {p.get('shard') for p in processes if integer(p.get('shard'))} == set(range(generator_count))
        and len({p.get('pid') for p in processes if integer(p.get('pid'), 1)}) == generator_count
        and isinstance(raw.get('generatorPids'), list) and sorted(raw['generatorPids']) == sorted(p['pid'] for p in processes if integer(p.get('pid'), 1)))
    check('complete_generator_window', finite(start, 1) and finite(end, 1) and finite(requested, 1) and finite(completed, 1)
        and start + duration <= requested <= completed <= end
        and close(generator.get('wholeWindowMs'), end - start) and close(raw.get('durationMs'), requested - start))
    process_ok = bool(processes)
    for p in processes:
        process_ok = process_ok and integer(p.get('players'), 1) and p.get('startEpochMs') == start
        process_ok = process_ok and all(finite(p.get(k)) for k in ('resourceStartedEpochMs', 'endedEpochMs', 'commonEndEpochMs', 'drainOffsetMs', 'durationMs', 'cpuMs', 'cpuCores', 'eluActiveMs', 'eluIdleMs', 'maxPauseMs', 'sampledMeanRssBytes'))
        process_ok = process_ok and finite(p.get('elu'), 0, 1) and integer(p.get('sampleCount'), 1) and finite(p.get('peakRssBytes'), 1)
        if process_ok:
            process_ok = p['endedEpochMs'] >= completed and p['durationMs'] >= duration and close(p['durationMs'], p['endedEpochMs'] - start)
            process_ok = process_ok and close(p['cpuCores'], p['cpuMs'] / p['durationMs']) and p['drainOffsetMs'] >= duration
    check('complete_generator_process_metrics', process_ok and sum(p.get('players', 0) for p in processes if integer(p.get('players'))) == count)
    check('generator_actor_assignment', process_ok and all(sum(a.get('generatorShard') == p.get('shard') for a in actors) == p.get('players') for p in processes))
    if process_ok and checks['complete_generator_window']:
        cpu = sum(p['cpuMs'] for p in processes)
        active, idle = sum(p['eluActiveMs'] for p in processes), sum(p['eluIdleMs'] for p in processes)
        check('generator_aggregate_metrics', close(generator.get('cpuMs'), cpu)
            and close(generator.get('cpuCores'), cpu / generator['wholeWindowMs'])
            and close(generator.get('eluActiveMs'), active) and close(generator.get('eluIdleMs'), idle)
            and close(generator.get('weightedElu'), active / (active + idle))
            and generator.get('sumLifetimePeakRssBytes') == sum(p['peakRssBytes'] for p in processes)
            and close(generator.get('sumSampledMeanRssBytes'), sum(p['sampledMeanRssBytes'] for p in processes))
            and generator.get('maxPauseMs') == max(p['maxPauseMs'] for p in processes)
            and generator.get('maxProcessElu') == max(p['elu'] for p in processes))
    else:
        check('generator_aggregate_metrics', False)
    admissions = raw.get('admissions') if records(raw.get('admissions')) else []
    admitted = [a for p in admissions for a in (p.get('actors') if records(p.get('actors')) else [])]
    check('complete_admissions', len(admissions) == generator_count and len(admitted) == count
        and {a.get('actor') for a in admitted if text(a.get('actor'))} == actor_ids
        and all(p.get('errors') == [] and integer(p.get('players'), 1) and records(p.get('actors')) and p['players'] == len(p['actors']) for p in admissions)
        and all(a.get('ready') is True and a.get('channel') == actor_map.get(a.get('actor'), {}).get('channel') for a in admitted))

    measurement = raw.get('measurement') if isinstance(raw.get('measurement'), dict) else {}
    window = measurement.get('measurement') if isinstance(measurement.get('measurement'), dict) else {}
    native_loops = window.get('eventLoops') if records(window.get('eventLoops')) else []
    check('complete_process_targets', window.get('runId') == raw.get('runId') and len(native_loops) == 7
        and {r.get('target') for r in native_loops if text(r.get('target'))} == TARGETS)
    check('unique_process_measurements', len(native_loops) == 7
        and len({(r.get('pid'), r.get('threadId')) for r in native_loops if integer(r.get('pid'), 1) and integer(r.get('threadId'))}) == 7
        and len({r.get('incarnation') for r in native_loops if text(r.get('incarnation'))}) == 7)
    loop_valid = bool(native_loops)
    loops = []
    for row in native_loops:
        target = row.get('target')
        valid = row.get('protocol') == 'core511-load-window-v1' and row.get('complete') is True and row.get('runId') == raw.get('runId')
        valid = valid and finite(row.get('startedAtMs'), 1) and finite(row.get('endedAtMs'), 1) and finite(row.get('durationMs'), duration)
        valid = valid and integer(row.get('delaySamples'), 1) and integer(row.get('timerSamples'), 1) and finite(row.get('elu'), 0, 1)
        valid = valid and all(finite(row.get(k)) for k in ('histogramMaxPauseMs', 'timerMaxPauseMs', 'maxPauseMs'))
        if valid:
            valid = finite(start) and finite(requested) and row['startedAtMs'] <= start and row['endedAtMs'] >= requested
            # Epoch timestamps lose sub-microsecond precision; this is arithmetic consistency, not a duration exemption.
            valid = valid and close(row['durationMs'], row['endedAtMs'] - row['startedAtMs'], .001)
            valid = valid and row['maxPauseMs'] == max(row['histogramMaxPauseMs'], row['timerMaxPauseMs'])
        valid = valid and (row.get('processCpuMs') is None and row.get('maxRssBytes') is None if target == 'reader'
                           else finite(row.get('processCpuMs')) and finite(row.get('maxRssBytes'), 1))
        loop_valid = loop_valid and valid
        pause = max(row['histogramMaxPauseMs'], row['timerMaxPauseMs']) if all(finite(row.get(k)) for k in ('histogramMaxPauseMs', 'timerMaxPauseMs')) else None
        limit = 200 if target in ('main', 'world') else 150
        loops.append({'target': target, 'maxPauseMs': pause, 'limitMs': limit})
        if not finite(pause) or pause > limit:
            quality.append('process_pause_' + str(target))
    check('complete_process_windows', loop_valid)
    main_loop = next((r for r in native_loops if r.get('target') == 'main'), {})
    reader = next((r for r in native_loops if r.get('target') == 'reader'), {})
    owners = [r for r in native_loops if r.get('target') != 'reader']
    check('actual_native_topology', len(owners) == 6 and all(r.get('threadId') == 0 for r in owners)
        and len({r.get('pid') for r in owners if integer(r.get('pid'), 1)}) == 6
        and reader.get('pid') == main_loop.get('pid') and integer(reader.get('threadId'), 1)
        and not ({r.get('pid') for r in owners} & {p.get('pid') for p in processes}))
    reported_resources = measurement.get('resources') if isinstance(measurement.get('resources'), dict) else {}
    resources = {'cpuBudget': 4, 'totalCpuFraction': None, 'maxRssBytes': None}
    if len(owners) == 6 and all(finite(r.get('durationMs'), 1) and finite(r.get('processCpuMs')) and finite(r.get('maxRssBytes'), 1) for r in owners):
        resources['totalCpuFraction'] = sum(r['processCpuMs'] / r['durationMs'] for r in owners) / 4
        resources['maxRssBytes'] = sum(r['maxRssBytes'] for r in owners)
    check('resource_totals_match_raw_processes', reported_resources.get('cpuBudget') == 4
        and close(reported_resources.get('totalCpuFraction'), resources['totalCpuFraction'])
        and finite(reported_resources.get('maxRssBytes'), 1) and reported_resources['maxRssBytes'] == resources['maxRssBytes'])
    if not finite(main_loop.get('elu'), 0, .5):
        quality.append('main_mean_ELU')
    if not finite(resources['maxRssBytes'], 1, 3 * 1024 ** 3):
        quality.append('game_owner_peak_RSS_sum')
    if not finite(resources['totalCpuFraction'], 0, 1):
        quality.append('game_owner_four_core_budget')
    if not checks['complete_process_targets'] or not loop_valid:
        quality.append('complete_runtime_measurements')

    queue = raw.get('queueObservation') if isinstance(raw.get('queueObservation'), dict) else {}
    queue_rows = queue.get('samples') if records(queue.get('samples')) else []
    client_rows = queue.get('clientSamples') if records(queue.get('clientSamples')) else []
    queue_ok = queue.get('sampleEveryMs') == 100 and bool(queue_rows) and bool(client_rows)
    queue_ok = queue_ok and all(finite(q.get('offset')) and integer(q.get('writerDepth')) and finite(q.get('oldestWriterAgeMs')) and finite(q.get('mainRssBytes'), 1) for q in queue_rows)
    queue_ok = queue_ok and all(finite(q.get('offset')) and integer(q.get('maxClientQueue'), 0, 32) and integer(q.get('maxClientPending'), 0, 2)
        and finite(q.get('generatorRssBytes'), 1) and integer(q.get('generatorShard'), 0, generator_count - 1) for q in client_rows)
    check('complete_queue_observations', queue_ok and {q.get('generatorShard') for q in client_rows} == set(range(generator_count))
          and isinstance(queue.get('commandHoldsOver600Ms'), list) and finite(queue.get('maxPendingCommandAgeMs')))
    check('queue_totals_match_samples', queue_ok and queue.get('maxWriterDepth') == max(q['writerDepth'] for q in queue_rows)
        and queue.get('maxOldestWriterAgeMs') == max(q['oldestWriterAgeMs'] for q in queue_rows)
        and queue.get('maxMainRssBytes') == max(q['mainRssBytes'] for q in queue_rows))
    writers = raw.get('writerAcks') if records(raw.get('writerAcks')) else []
    writers_ok = bool(writers) and all(finite(w.get('ms')) and finite(w.get('offset')) and text(w.get('operation')) for w in writers)
    writer_snapshot = raw.get('writerAckMs') if isinstance(raw.get('writerAckMs'), dict) else {}
    snapshot_count = writer_snapshot.get('count')
    # The harness snapshots this aggregate before teardown, while retaining the
    # writer array by reference. Later checkpoint spans remain in that array.
    # Validate the exact captured prefix, and derive/report every retained span.
    check('complete_writer_observations', writers_ok and integer(snapshot_count, 1, len(writers))
          and writer_snapshot == distribution([w['ms'] for w in writers[:snapshot_count]]))
    raw_pin = pin(stage['rawArtifact'])
    try:
        check('summary_matches_raw', isinstance(summary, dict) and normalized_summary(summary) == derived_summary(raw, stage['rawArtifact'], raw_pin['sha256']))
    except (KeyError, TypeError, ValueError, ZeroDivisionError):
        check('summary_matches_raw', False)
    integrity.extend(name for name, passed in checks.items() if not passed)
    outliers = []
    for index, sample in enumerate(samples):
        if finite(sample.get('ms')) and sample['ms'] > 300:
            nearest = min(queue_rows, key=lambda q: abs(q['offset'] - sample['offset'])) if queue_ok and finite(sample.get('offset')) else None
            overlapping = [w for w in writers if finite(w.get('offset')) and finite(w.get('ms')) and finite(sample.get('offset'))
                           and w['offset'] <= sample['offset'] + sample['ms'] and w['offset'] + w['ms'] >= sample['offset']]
            outliers.append({**sample, 'stage': stage['id'], 'label': stage['label'], 'rawArtifact': stage['rawArtifact'], 'sampleIndex': index,
                'classification': 'provisional-attack-202' if sample.get('action') == 'attack' and sample.get('status') == 202 else 'matching-wire-result',
                'investigationStatus': 'unresolved-investigation-item', 'nearestQueueObservation': nearest,
                'overlappingWriterSpans': overlapping,
                'attribution': 'Temporal context only: writer spans lack actor/sequence correlation. No sum of unrelated stages or assumption of a rendered freeze.'})
    wire_target = sample_valid and finite(ack['p99'], 0, 150)
    return {
        'id': stage['id'], 'label': stage['label'], 'players': count, 'seconds': stage['seconds'], 'role': stage['role'],
        'runId': raw.get('runId'), 'startEpochMs': start, 'endEpochMs': end, 'rawSha256': raw_pin['sha256'],
        'integrityPassed': not integrity, 'integrityFailures': integrity,
        'movementRuntimeQualityPassed': not quality, 'movementRuntimeQualityFailures': quality,
        'newMeasuredWireP99TargetPassed': wire_target, 'requiredForScoped50': count <= 50,
        'scopedQualityPassed': not integrity and not quality and (stage['role'] != 'primary-quality' or wire_target),
        'allSamplesIncluded': True, 'ackMs': ack, 'byActionAndStatus': {k: distribution(v) for k, v in groups.items()},
        'prediction': predictions, 'processLoops': loops, 'mainELU': main_loop.get('elu'), 'resources': resources,
        'generatorResources': raw.get('generatorResources'),
        'writerAckMs': distribution([w['ms'] for w in writers]) if writers_ok else None,
        'writerSnapshotAckMs': writer_snapshot,
        'writerTimingScope': 'writerAckMs includes every retained span, including checkpoints appended during teardown; writerSnapshotAckMs is the validated earlier prefix. Neither measures client durable-input completion.',
        'maxWriterDepth': queue.get('maxWriterDepth'), 'maxOldestWriterAgeMs': queue.get('maxOldestWriterAgeMs'),
        'economicActorsChecked': len(economics), 'nativeKillClaims': sum(e.get('allOwnTargetKillClaims', 0) for e in economics if integer(e.get('allOwnTargetKillClaims'))),
        'wireOver300Count': len(outliers), 'checks': checks, 'raw': raw_pin,
        'summary': pin(stage['rawArtifact'].replace('.json', '-summary.json')),
        'log': pin(stage['rawArtifact'].replace('.json', '.log')),
    }, outliers


def main():
    plan, binding = read(PLAN), read(BINDING)
    failures = validate_binding(plan, binding)
    if failures:
        raise ValueError('Invalid campaign binding: ' + ', '.join(failures))
    rows, outliers = [], []
    for stage in plan['stages']:
        if not (ROOT / stage['rawArtifact']).exists():
            continue
        raw = read(stage['rawArtifact'])
        summary_path = stage['rawArtifact'].replace('.json', '-summary.json')
        stored = read(summary_path)
        if not isinstance(stored, list) or len(stored) != 1 or not isinstance(stored[0], dict):
            raise ValueError('Expected exactly one stage summary: ' + summary_path)
        # Recompute from exact disk bytes, including every field; path spelling alone is normalized.
        derived = _summarizer.summarize(ROOT / stage['rawArtifact'])
        if normalized_summary(stored[0]) != normalized_summary(derived):
            raise ValueError('Stored summary differs from raw evidence: ' + summary_path)
        result, observations = assess_stage(stage, raw, stored[0], binding)
        rows.append(result)
        outliers.extend(observations)
    campaign = assess_campaign(plan, rows)
    ledger = {'plan': pin(PLAN), 'binding': pin(BINDING), 'thresholdMs': 300, 'allObservationsRetained': True,
              'count': len(outliers), 'observations': outliers}
    write('evidence/scoped50-retry1-wire-outliers-r85.json', ledger)
    report = {'writtenAtUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'plan': pin(PLAN), 'binding': pin(BINDING),
        'coreSHA256': binding['coreSHA256'], 'deliverySHA256': binding['deliverySHA256'],
        'status': 'scoped50-quality-passed' if campaign['eligibleForScopedReleaseReview'] else 'scoped50-blocked-or-incomplete',
        **campaign, 'stages': rows,
        'wireOutliers': pin('evidence/scoped50-retry1-wire-outliers-r85.json'), 'wireOutlierInvestigations': len(outliers),
        'historicalFullAcceptance': 'not-assessed', 'durableInputPolicyAssessed': False,
        'liveDeploymentPerformed': False, 'renderedGameFPSAssessed': False,
        'limitations': ['Provisional attack202 wire results are not durable native completion measurements.',
                        '100-player historical complete mixed-mode acceptance remains unproven.',
                        'No live VDS, WAN/TLS, complete game rendering or physical mobile capacity proof.',
                        'Every startup/GC/slow sample retained; server and separate generators share4CPU quota.']}
    write('evidence/scoped50-retry1-assessment-r85.json', report)
    print(json.dumps({k: report[k] for k in ('status', 'testedStages', 'scoped50QualityPassed', 'allStagesIntegrityPassed', 'wireOutlierInvestigations', 'capacity100Status')}))


if __name__ == '__main__':
    main()
