"""Verify the exact staged delta locally; no live service access."""
import hashlib
import json
import os
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PACKAGE = ROOT / 'r85-package'
NODE = ROOT.parent / 'r79_stability_work/runtime/node-v22.23.4-linux-x64/bin/node'
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def record(name, value):
    (ROOT / 'evidence' / name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')

plan = json.loads((PACKAGE/'update.json').read_text())
checked = []
for name, meta in plan['files'].items():
    path = ROOT/'working'/name
    assert path.read_bytes() == (PACKAGE/'payload'/name).read_bytes()
    assert sha(path) == meta['after'] and path.stat().st_size == meta['bytes']
    if path.suffix in ('.mjs', '.js'):
        subprocess.run([str(NODE), '--check', str(path)], check=True)
        checked.append(name)
record('final-syntax.json', {'checked':checked, 'productionFiles':plan['files']})

runs = []
for suite in ('inplace', 'gates', 'client'):
    label = os.environ.get('R85_CHECK_LABEL', 'final3')
    assert label.replace('-', '').isalnum()
    output = ROOT/'evidence'/f'installer-{suite}-{label}.log'
    started = time.monotonic()
    command = ['docker', 'run', '--rm', '--network', 'none',
        '--mount', 'type=bind,src=/workspace/ccre,dst=/workspace/ccre',
        '-e', 'PYTHONDONTWRITEBYTECODE=1', 'python:3.12-slim',
        'python3', str(ROOT/'tests/installer'/f'installer-{suite}.test.py')]
    with output.open('w') as log:
        result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    assert result.returncode == 0, output
    import re
    text = output.read_text()
    match = re.search(r'Ran (\d+) tests? in ', text)
    assert match and re.search(r'^OK\s*$', text, re.M), output
    runs.append({'suite':suite, 'passed':int(match[1]),
        'seconds':round(time.monotonic()-started, 3),
        'output':output.relative_to(ROOT).as_posix(), 'sha256':sha(output)})
    print(f"{suite}: {match[1]} passed", flush=True)
record('installer-final.json', {
    'version':'R85_GAMEPLAY', 'recordedUtc':datetime.now(timezone.utc).isoformat(),
    'passed':sum(r['passed'] for r in runs), 'failed':0, 'runs':runs,
    'productionFiles':plan['files'],
    'modules':{p.name:sha(p) for p in (PACKAGE/'modules').glob('*') if p.is_file()},
    'tests':{p.name:sha(p) for p in (ROOT/'tests/installer').glob('*.py')},
    'scope':'Actual Python installer, real SQLite backup/quick_check, filesystem locks, crash journals, immutable client graph and current-DB-preserving rollback. Root permission checks in local network-disabled Docker; services/accounts HTTP and external release verification are isolated fixtures. No live VDS installation.'})
