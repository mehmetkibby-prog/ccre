#!/usr/bin/env python3
"""Weighted CPU sample audit; no application code or source profile modifications."""
import collections
import hashlib
import json
import math
from pathlib import Path

SOURCE = Path('/tmp/codex-remote-attachments/01a16fbd-091f-71a5-923e-6bb701b9105f/73822b7b-402f-4425-9689-b18b887a1626/1-coreoflife-main-e353cb5b-df54-4a35-a232-4adc8358820e.cpuprofile.json')
OUTPUT = Path(__file__).parent / 'independent-profile-analysis.json'
data = json.loads(SOURCE.read_text())
nodes = {n['id']: n for n in data['nodes']}
parents = {}
for n in nodes.values():
    for child in n.get('children', []):
        assert child not in parents, 'not a tree'
        parents[child] = n['id']
assert len(data['samples']) == len(data['timeDeltas'])
assert all(dt >= 0 for dt in data['timeDeltas'])
duration_us = data['endTime'] - data['startTime']

def frame_key(i):
    f = nodes[i]['callFrame']
    return (f['functionName'], f['url'], f['lineNumber'] + 1, f['columnNumber'] + 1)

chains = {}
for i in nodes:
    ancestry = []
    seen = set()
    while i in nodes:
        assert i not in seen, 'cycle'
        seen.add(i)
        ancestry.append(i)
        i = parents.get(i)
    chains[ancestry[0]] = ancestry

def category(i):
    name, url, *_ = frame_key(i)
    if name == '(idle)': return 'idle'
    if name == '(garbage collector)': return 'gc'
    if url == 'node:inspector': return 'inspector'
    if name == '(program)': return 'program_unattributed'
    if not url and name in {'prepare', 'get', 'all', 'run', 'exec'}:
        # Retain generic leaf names; ancestry determines SQLite attribution.
        return 'native_sql_method_leaf'
    if not url and name in {'writeBuffer', 'writev'}: return 'native_stream_write'
    if url == 'scripts/core511/reliable-stream.mjs': return 'reliable_stream_js'
    return 'other_sampled_work'

self_node = collections.Counter()
self_frame = collections.Counter()
inclusive_frame = collections.Counter()
categories = collections.Counter()
intervals = []
time_us = 0
for i, dt in zip(data['samples'], data['timeDeltas']):
    self_node[i] += dt
    self_frame[frame_key(i)] += dt
    for frame in {frame_key(a) for a in chains[i]}:
        inclusive_frame[frame] += dt
    cat = category(i)
    categories[cat] += dt
    intervals.append((time_us, time_us + dt, cat, i))
    time_us += dt

def frame_obj(key):
    return dict(function=key[0], url=key[1], line=key[2], column=key[3])

def ranked(counter, limit=None):
    return [{**frame_obj(k), 'weightedMs': round(v / 1000, 6), 'capturePercent': v / duration_us * 100}
            for k, v in counter.most_common(limit)]

def windows(width_us, offset_us=0):
    rows = []
    for start in range(offset_us, time_us, width_us):
        end = min(time_us, start + width_us)
        counts = collections.Counter()
        for a, b, cat, _ in intervals:
            if b <= start: continue
            if a >= end: break
            counts[cat] += min(b, end) - max(a, start)
        denom = end - start
        rows.append(dict(startMs=start / 1000, endMs=end / 1000,
                         complete=denom == width_us,
                         nonIdlePercent=(denom - counts['idle']) / denom * 100,
                         gcPercent=counts['gc'] / denom * 100,
                         categoriesMs={k: v / 1000 for k, v in counts.items()}))
    return rows

def distribution(rows):
    values = sorted(r['nonIdlePercent'] for r in rows if r['complete'])
    def percentile(p):
        index = (len(values) - 1) * p
        lo, hi = math.floor(index), math.ceil(index)
        return values[lo] + (values[hi] - values[lo]) * (index - lo)
    return dict(completeWindows=len(values), min=min(values), median=percentile(.5), p95=percentile(.95),
                max=max(values), windowsOver90=sum(x > 90 for x in values))

native_callers = {}
for name in ('all', 'get', 'prepare', 'exec', 'run', 'writeBuffer'):
    c = collections.Counter()
    for i, v in self_node.items():
        f = frame_key(i)
        if f[0] != name or f[1]: continue
        business = [frame_key(a) for a in chains[i][1:] if frame_key(a)[1]
                    and not frame_key(a)[1].startswith('node:')
                    and not any(part in frame_key(a)[1] for part in
                                ('writer-sql-timing', 'prepared-statements', 'writer-statements', 'command-failure-scope'))]
        c[tuple(business[:3])] += v
    native_callers[name] = [dict(weightedMs=v / 1000, callers=[frame_obj(k) for k in chain]) for chain, v in c.most_common()]

ipc = collections.Counter()
ipc_urls = {'scripts/core511/reliable-stream.mjs', 'scripts/core511/reply-wire-r57.mjs', 'node:internal/child_process/serialization'}
for i, dt in zip(data['samples'], data['timeDeltas']):
    leaf = frame_key(i)
    frames = [frame_key(a) for a in chains[i]]
    if leaf[0] == 'writeBuffer' and not leaf[1]:
        ipc['writeBufferSelfUs'] += dt
        if any(f[1] == 'node:internal/child_process/serialization' for f in frames):
            ipc['writeBufferChildProcessSelfUs'] += dt
        else:
            ipc['writeBufferOtherSocketSelfUs'] += dt
    if any(f[1] in ipc_urls for f in frames):
        ipc['reliableReplyChildSerializationInclusiveUnionUs'] += dt
    if any((f[0] in ('framed', 'replyBytes') and f[1].endswith('/reliable-stream.mjs'))
           or f[1] in ('scripts/core511/reply-wire-r57.mjs', 'node:internal/child_process/serialization') for f in frames):
        ipc['framedReplyBytesReplyWireChildSerializationInclusiveUnionUs'] += dt

initial_us = data['timeDeltas'][0]
windows_output = {}
for width in (1, 2, 5):
    for offset, label in ((0, 'full'), (initial_us, 'afterInspectorStartup')):
        rows = windows(width * 1000000, offset)
        windows_output[f'{width}s_{label}'] = dict(summary=distribution(rows), rows=rows)

out = dict(source=str(SOURCE), sha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(), installedVersion='R104_AKADEMI4 last public health; profile version not embedded',
           durationMs=duration_us / 1000, sumTimeDeltasMs=time_us / 1000, unsampledTailMs=(duration_us-time_us)/1000,
           nodes=len(nodes), samples=len(data['samples']), method='Attribute each preceding timeDelta to its sampled leaf, walk ancestors with frame deduplication; windows split intervals at boundaries. These are sampled wall-time fractions, not OS CPU utilization, invocation durations, or call counts.',
           categories=[dict(category=k, weightedMs=v/1000, capturePercent=v/duration_us*100) for k,v in categories.most_common()],
           afterInspector=dict(durationMs=(time_us-initial_us)/1000,
                               idlePercent=categories['idle']/(time_us-initial_us)*100,
                               nonIdlePercent=(time_us-initial_us-categories['idle'])/(time_us-initial_us)*100),
           topSelfFrames=ranked(self_frame,100), topInclusiveFrames=ranked(inclusive_frame,150),
           nativeLeafCallers=native_callers, ipcAttribution=dict(ipc), windows=windows_output,
           largestTimeDeltas=[dict(index=j, deltaMs=data['timeDeltas'][j]/1000, stack=[frame_obj(frame_key(a)) for a in chains[data['samples'][j]]])
                              for j in sorted(range(len(data['samples'])), key=lambda j:data['timeDeltas'][j],reverse=True)[:20]],
           limits=['Inclusive rows overlap and must not be added.', 'CPU profile includes main process only, not reward worker/world/channel processes or mobile rendering.', 'Sample timeDelta is not a function-duration measure and does not bound event-loop stalls.', 'Sampled native SQL includes synchronous native/blocking work; cannot infer instruction CPU versus disk wait.', 'One 60-second capture cannot establish 100-player capacity, player count, leak, or exact SQL row cardinality.', 'No live VDS changes or deployment.'])
OUTPUT.write_text(json.dumps(out, indent=2)+'\n')
print(json.dumps({k:out[k] for k in ['durationMs','sumTimeDeltasMs','unsampledTailMs','categories','afterInspector']},indent=2))
print(json.dumps({k:v['summary'] for k,v in windows_output.items()},indent=2))
print(OUTPUT)
