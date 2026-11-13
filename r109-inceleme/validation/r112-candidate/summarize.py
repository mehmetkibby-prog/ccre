"""Summarize every run, including regressions and raw scheduling pauses."""
import json, statistics, hashlib, subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
here = Path(__file__).resolve().parent
old = json.loads((here / 'comparisons/index.json').read_text())
final = json.loads((here / 'pipeline-final/index.json').read_text())
assert len(old) == 18 and len(final) == 13
metrics = {
    'tickP99Ms': lambda r: r['summary']['tickP99Ms'],
    'visibleDeathP99Ms': lambda r: r['visibleDeaths']['p99Ms'],
    'terminalDeathP99Ms': lambda r: r['deaths']['p99Ms'],
    'mainEluPercent': lambda r: 100 * r['summary']['mainElu'],
    'totalCpuBudgetPercent': lambda r: 100 * r['summary']['resources']['totalCpuFraction'],
    'totalRssMiB': lambda r: r['summary']['resources']['maxRssBytes'] / 1048576,
    'mainPausesOver50Ms': lambda r: r['summary']['mainPausesOver50Ms'],
    'channelPausesOver50Ms': lambda r: r['summary']['channelPausesOver50Ms'],
    'mainMaxPauseMs': lambda r: r['summary']['mainMaxPauseMs'],
    'maxChannelPauseMs': lambda r: r['summary']['maxChannelPauseMs'],
}

def summarize(rows):
    return {
        'cases': [r['case'] for r in rows],
        'allFunctionalChecksPassed': all(r['passed'] and r['exit'] == 0 for r in rows),
        'deathSamples': sum(r['deaths']['count'] for r in rows),
        'medianAndWorst': {k: {'median': statistics.median(f(r) for r in rows), 'worst': max(f(r) for r in rows)} for k, f in metrics.items()},
    }

comparisons = {}
for mode, n in [('forest', 30), ('mixed', 40), ('shared_boss_terminal', 30)]:
    before = [r for r in old if r['case'].startswith(f'{mode}-{n}-') and r['case'].endswith('-r111')]
    after = [r for r in final if r['case'].startswith(f'r1-{mode}-{n}-')]
    assert len(before) == len(after) == 3
    comparisons[f'{mode}-{n}'] = {'R111': summarize(before), 'R112': summarize(after)}

def host_delta(x):
    def stat(t):
        return dict((k, int(v)) for k, v in (line.split() for line in t.splitlines()))
    a, b = [stat(x['host'][point]['cpu.stat']) for point in ('before', 'after')]
    return {k: b[k] - a[k] for k in ('nr_throttled', 'throttled_usec')}

extra = []
for p in sorted((here / 'pipeline-final').glob('r*.json')):
    x = json.loads(p.read_text())
    extra.append({'file': str(p.relative_to(root)), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'players': x['players'], 'realm': x['realm'], 'durationMs': x['durationMs'], 'cpuQuota': x['summary']['resources']['cpuBudget'], 'cgroupDelta': host_delta(x), 'maxMainGcMs': max((g['ms'] for g in x['mainGc']), default=0), 'functionalPassed': x['passed'], 'errors': x['errors'], 'faults': x['faults']})

result = {
    'sourceCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
    'baselineCore': '23f618c8c94e42abc65c189bd12f6e669d900a0584ad038199a089b90faeb95b',
    'baselineVersion': 'R111_COMBAT1',
    'lastConfirmedInstalledVersion': 'R110_HANDOFF1',
    'candidatePackage': json.loads((root / 'project/r112_runtime_flow/evidence/package.json').read_text()),
    'performanceAcceptance': {
        'productionVerified': False,
        'zeroPausesAt30To40': all(r['summary']['mainPausesOver50Ms'] == 0 and r['summary']['channelPausesOver50Ms'] == 0 for r in final if '-30-' in r['case'] or '-40-' in r['case']),
        'note': 'An installable archive and passing functional assertions are not a certificate that the requested latency goal is achieved.',
    },
    'notes': [
        'Local synthetic data and clients; no production database, production traffic trace or live deployment.',
        'Same test host and fixture, four CPU quota. Production is eight cores; no capacity extrapolation.',
        'Each comparison uses three 30-second windows, R111 from the preceding alternating set and final R112 after the read-pipeline change. Every raw run is retained.',
        'Boss fixture has one terminal boss per window: its three observations are not a reliable population p99 estimate.',
        'Visible death is first matching committed dead-HP projection for the exact attack confirmed to kill; final receipt latency remains separate.',
        'No scheduling pause is excluded. Control-probe coincidence is not proof of an external cause.',
        'Functional success is not a zero-stutter performance acceptance result.',
        'Earlier candidate regressions and the corrected checkpoint concurrency failure remain in comparisons/ and selected-attack-mixed.log.',
    ],
    'comparisons': comparisons,
    'extraSingleRuns': [r for r in final if r['case'].startswith('r2-') or any(f'-{n}-' in r['case'] for n in (10, 50, 100))],
    'rawFinalRuns': extra,
    'archiveChecks': json.loads((here / 'pipeline-final/checks.json').read_text()),
}
(here / 'summary.json').write_text(json.dumps(result, indent=2) + '\n')
for case, pair in comparisons.items():
    print(case, {version: {k: {side: round(v, 2) for side, v in vals.items()} for k, vals in summary['medianAndWorst'].items()} for version, summary in pair.items()})
