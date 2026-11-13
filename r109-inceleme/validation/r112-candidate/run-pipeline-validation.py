import os, subprocess, json, shutil
from pathlib import Path

root = Path(__file__).resolve().parents[2]
out = root / 'validation/r112-candidate/pipeline-final'
out.mkdir(exist_ok=True)
env = {**os.environ, 'REVIEW_NODE': '/workspace/ccre/r79_stability_work/runtime/node-v22.23.4-linux-x64/bin/node', 'R111_TEST_CONTROL': '1'}
env.pop('R111_TEST_STAGES', None)
env.pop('STUTTER_TREE', None)
records = []
cases = [(mode, n, 'r1', repeat) for mode, n in [('forest', 30), ('mixed', 40), ('shared_boss_terminal', 30)] for repeat in range(1, 4)]
cases += [('mixed', n, realm, 1) for realm, n in [('r2', 40), ('r1', 10), ('r1', 50), ('r1', 100)]]
for mode, n, realm, repeat in cases:
    name = f'{realm}-{mode}-{n}-{repeat}'
    before = set((root / 'project/r109_latency_completion/evidence').glob('review-*.json'))
    with (out / (name + '.log')).open('w') as log:
        rc = subprocess.run(['python3', 'scripts/load.py', '--players', str(n), '--seconds', '30', '--mode', mode, '--realm', realm], cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT).returncode
    new = set((root / 'project/r109_latency_completion/evidence').glob('review-*.json')) - before
    if len(new) != 1:
        raise RuntimeError((name, rc, 'missing unique result', list(new)))
    p = new.pop()
    d = json.loads(p.read_text())
    shutil.copyfile(p, out / (name + '.json'))
    rec = {'case': name, 'exit': rc, 'passed': d.get('passed'), 'source': str(p.relative_to(root)), 'summary': d.get('summary'), 'deaths': d.get('combatDelivery', {}).get('deaths'), 'visibleDeaths': d.get('combatDelivery', {}).get('visibleDeaths')}
    records.append(rec)
    (out / 'index.json').write_text(json.dumps(records, indent=2) + '\n')
    print(name, rc, rec['passed'], rec['deaths'], flush=True)
    if rc or not d.get('passed'):
        raise SystemExit(rc or 1)

checks = {}
for name, command in [
    ('package', ['python3', 'project/r112_runtime_flow/build/package.py']),
    ('native', ['python3', 'scripts/check.py', 'native']),
    ('r112', ['python3', 'scripts/check.py', 'r112']),
]:
    with (out / (name + '.log')).open('w') as log:
        rc = subprocess.run(command, cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT).returncode
    checks[name] = rc
    (out / 'checks.json').write_text(json.dumps(checks, indent=2) + '\n')
    print(name, rc, flush=True)
    if rc:
        raise SystemExit(rc)
