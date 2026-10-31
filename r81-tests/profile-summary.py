"""Summarize sampled stack time in a supplied main-process CPU profile.

This is sampled wall attribution, not function call counts or exact CPU time.
The source profile is never modified or included in a release archive.
"""
import collections
import hashlib
import json
import sys
from pathlib import Path


def summarize(path):
    raw = Path(path).read_bytes()
    profile = json.loads(raw)
    nodes = {node['id']: node for node in profile['nodes']}
    assert len(nodes) == len(profile['nodes']), 'Duplicate profile nodes'
    parents = {}
    for node in nodes.values():
        for child in node.get('children', []):
            assert child in nodes and child not in parents, 'Invalid profile tree'
            parents[child] = node['id']
    assert len(set(nodes) - set(parents)) == 1, 'Expected one profile root'
    samples, deltas = profile['samples'], profile['timeDeltas']
    assert len(samples) == len(deltas) and samples, 'Mismatched sample arrays'
    assert all(sid in nodes for sid in samples), 'Unknown sample node'
    assert all(isinstance(value, int) and value > 0 for value in deltas)
    chains = {}
    for sid in nodes:
        stack, seen, current = [], set(), sid
        while current is not None:
            assert current not in seen, 'Cyclic profile tree'
            seen.add(current)
            stack.append(nodes[current]['callFrame'])
            current = parents.get(current)
        chains[sid] = stack
    first = nodes[samples[0]]['callFrame']
    startup = deltas[0] if first.get('functionName') == 'post' and first.get('url') == 'node:inspector' else 0
    total = sum(deltas)
    own, totals = collections.Counter(), collections.Counter()
    bins = [collections.Counter() for _ in range(6)]
    elapsed = 0
    for sid, duration in zip(samples, deltas):
        stack = chains[sid]
        leaf = stack[0]
        actor = any(frame.get('functionName') == 'abandonedActors' and frame.get('url', '').endswith('/abandoned-normal.mjs') for frame in stack)
        abandoned = any(frame.get('url', '').endswith('/abandoned-normal.mjs') for frame in stack)
        tags = {'idle'} if leaf.get('functionName') == '(idle)' else {'nonidle'}
        if actor:
            tags.add('abandonedActors')
            if leaf.get('url', '') == '' and leaf.get('functionName') in ('prepare', 'all'):
                tags.add('abandonedActors_native_' + leaf['functionName'])
        if abandoned:
            tags.add('abandonedNormalAnyFrame')
        for tag in tags:
            totals[tag] += duration
        own[(leaf.get('functionName'), leaf.get('url'), leaf.get('lineNumber'))] += duration
        for index, bucket in enumerate(bins):
            overlap = max(0, min(elapsed + duration - startup, (index + 1) * 10_000_000) - max(elapsed - startup, index * 10_000_000))
            if overlap:
                bucket['sampledUs'] += overlap
                for tag in tags:
                    bucket[tag] += overlap
        elapsed += duration
    active = totals['nonidle'] - startup
    return {
        'scope': 'Main-process sampled stack wall attribution; not exact CPU accounting or call counts',
        'inputSha256': hashlib.sha256(raw).hexdigest(),
        'inputBytes': len(raw), 'nodes': len(nodes), 'samples': len(samples),
        'profileSpanSeconds': (profile['endTime'] - profile['startTime']) / 1e6,
        'sampledSeconds': total / 1e6,
        'startupInspectorSecondsExcludedFromActiveDenominator': startup / 1e6,
        'postStartupSampledSeconds': (total - startup) / 1e6,
        'postStartupNonidleSeconds': active / 1e6,
        'postStartupNonidlePercent': active / (total - startup) * 100,
        'categories': {key: {'sampledSeconds': value / 1e6,
                             'percentWholeProfile': value / total * 100,
                             'percentPostStartupNonidle': value / active * 100 if key.startswith('abandoned') else None}
                       for key, value in totals.items()},
        'tenSecondBinsAfterStartup': [{key: value / 1e6 for key, value in bucket.items()} for bucket in bins],
        'topSelf': [{'function': key[0], 'url': key[1], 'lineZeroBased': key[2], 'sampledSeconds': value / 1e6}
                    for key, value in own.most_common(20)],
        'limitations': ['Different window from the earlier /proc measurement',
                        'No live query plan, channel profile or browser render trace in this file',
                        'The first inspector sample is separately identified, not discarded from the raw profile'],
    }


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Usage: python3 profile-summary.py INPUT.cpuprofile.json OUTPUT.json')
    report = summarize(sys.argv[1])
    Path(sys.argv[2]).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: report[key] for key in ('inputSha256', 'samples', 'postStartupNonidlePercent')}))
