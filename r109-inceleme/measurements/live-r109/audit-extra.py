"""Read-only sample-span audit. CPU samples are not event-loop/GC event timers."""
import collections
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ATTACHMENTS = Path('/tmp/codex-remote-attachments/01a16fbd-091f-71a5-923e-6bb701b9105f')
SOURCES = {
    'old_10_players': ATTACHMENTS / '73822b7b-402f-4425-9689-b18b887a1626/1-coreoflife-main-e353cb5b-df54-4a35-a232-4adc8358820e.cpuprofile.json',
    'previous_1_player': ATTACHMENTS / 'd42cb91a-9e69-4406-82c7-94446ec12862/1-coreoflife-main-f280c6dc-e42e-49b0-886f-921b0863171c.cpuprofile.json',
    'new_6_players': ATTACHMENTS / '1e9bdfab-3436-4eb1-8699-1029192d9a06/1-coreoflife-main-df19d3d8-0759-4de0-ba1c-39f1e592537f.cpuprofile.json',
}

def audit(path):
    raw = path.read_bytes()
    data = json.loads(raw)
    nodes = {n['id']: n for n in data['nodes']}
    assert len(nodes) == len(data['nodes'])
    assert len(data['samples']) == len(data['timeDeltas'])
    assert all(t >= 0 for t in data['timeDeltas'])
    parent = {}
    for node in nodes.values():
        for child in node.get('children', []):
            assert child in nodes and child not in parent
            parent[child] = node['id']
    chains = {}
    for ident in nodes:
        chain, seen, current = [], set(), ident
        while current in nodes:
            assert current not in seen
            seen.add(current)
            chain.append(current)
            current = parent.get(current)
        chains[ident] = chain
    weights = collections.Counter()
    episodes, active, elapsed = [], None, 0
    for index, (ident, delta) in enumerate(zip(data['samples'], data['timeDeltas'])):
        assert ident in nodes
        weights[ident] += delta
        if nodes[ident]['callFrame']['functionName'] == '(garbage collector)':
            if active is None:
                active = {'startMs': elapsed / 1000, 'sampleSpanMs': 0, 'samples': 0}
            active['sampleSpanMs'] += delta / 1000
            active['samples'] += 1
        elif active is not None:
            episodes.append(active)
            active = None
        elapsed += delta
    if active is not None:
        episodes.append(active)
    def matched(fragment):
        ids = {i for i, node in nodes.items() if fragment.lower() in
               (node['callFrame']['functionName'] + ' ' + node['callFrame']['url']).lower()}
        return {'nodes': len(ids), 'selfMs': sum(weights[i] for i in ids) / 1000,
                'inclusiveUnionMs': sum(w for i, w in weights.items() if ids.intersection(chains[i])) / 1000}
    first = nodes[data['samples'][0]]['callFrame']
    assert first['url'] == 'node:inspector' and first['functionName'] == 'post', 'Do not discard an arbitrary first sample'
    idle_us = sum(w for i, w in weights.items() if nodes[i]['callFrame']['functionName'] == '(idle)')
    work_window = elapsed - data['timeDeltas'][0]
    native_sql_us = sum(w for i, w in weights.items() if not nodes[i]['callFrame']['url'] and
                        nodes[i]['callFrame']['functionName'] in {'prepare', 'all', 'get', 'run', 'exec'})
    prepare_us = sum(w for i, w in weights.items() if not nodes[i]['callFrame']['url'] and
                     nodes[i]['callFrame']['functionName'] == 'prepare')
    return {
        'source': str(path), 'sha256': hashlib.sha256(raw).hexdigest(),
        'durationMs': (data['endTime'] - data['startTime']) / 1000,
        'sampledMs': elapsed / 1000, 'unobservedTailMs': (data['endTime'] - data['startTime'] - elapsed) / 1000,
        'initialInspectorSampleMs': data['timeDeltas'][0] / 1000,
        'afterInspectorSampledMs': work_window / 1000,
        'afterInspectorNonIdlePercent': (work_window - idle_us) / work_window * 100,
        'nativeSqlLeafMs': native_sql_us / 1000, 'nativePrepareLeafMs': prepare_us / 1000,
        'gcSampledMs': sum(x['sampleSpanMs'] for x in episodes),
        'gcSampleSpans': sorted(episodes, key=lambda x: x['sampleSpanMs'], reverse=True),
        'frameFamilies': {key: matched(key) for key in ['captcha', 'checkSchema', 'checkPreparedSchema477',
            'writer-sql-timing477', 'reward-worker-r533', 'shared-terminal', 'tower', 'adventure', 'dungeon',
            'drainWrites', 'command-failure-scope.mjs', 'reliable-stream.mjs', 'prepareReplyWireR105']},
        'limits': ['A contiguous GC sample span is not a measured GC event or proof of event-loop delay.',
                   'Self and inclusive figures overlap; never sum inclusive families.',
                   'Only the main thread is sampled. Player population and current version are not in this file.',
                   'Different populations/actions preclude causal before/after performance claims.'],
    }

out = {label: audit(path) for label, path in SOURCES.items()}
(ROOT / 'evidence/sample-span-audit.json').write_text(json.dumps(out, indent=2) + '\n')
for label, row in out.items():
    print(label, 'non-idle', round(row['afterInspectorNonIdlePercent'], 3),
          'maxGCsampleSpanMs', round(row['gcSampleSpans'][0]['sampleSpanMs'], 3))
