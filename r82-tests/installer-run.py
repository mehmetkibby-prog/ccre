"""Run the final staged R82 installer suites and record their exact inputs."""
import datetime
import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
TESTS = BASE / 'r82-tests'
PACKAGE = BASE / 'r82-package'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    plan_path = PACKAGE / 'update.json'
    assert plan_path.is_file(), 'Stage the final reviewed R82 payload before running installer evidence'
    plan = json.loads(plan_path.read_text())
    runs = []
    for name in ('installer-inplace.test.py', 'installer-gates.test.py', 'installer-client.test.py'):
        command = [sys.executable, str(TESTS / name)]
        start = time.monotonic()
        result = subprocess.run(command, cwd=BASE, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        seconds = round(time.monotonic() - start, 3)
        output = TESTS / name.replace('.test.py', '-results.txt')
        output.write_text(result.stdout)
        match = re.search(r'^Ran (\d+) tests? in ', result.stdout, re.MULTILINE)
        passed = int(match[1]) if result.returncode == 0 and match else 0
        runs.append({'command': ['python3', 'r82-tests/' + name], 'passed': passed,
                     'exitCode': result.returncode, 'seconds': seconds,
                     'outputFile': output.relative_to(BASE).as_posix(), 'outputSHA256': sha(output)})
        print(f'{name}: exit={result.returncode}, passed={passed}, seconds={seconds}', flush=True)
        if result.returncode or not match:
            print(result.stdout, flush=True)
            raise SystemExit(result.returncode or 1)
    module_hashes = {path.name: sha(path) for path in sorted((PACKAGE / 'modules').iterdir()) if path.is_file()}
    test_hashes = {path.name: sha(path) for path in sorted(TESTS.glob('installer-*.py'))}
    evidence = {
        'version': plan['version'], 'sourceVersion': plan['sourceVersion'],
        'recordedUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'scope': 'Real R82 Python installer; actual filesystem, SQLite, backup API, locks, atomic overlay, journals and crash recovery. OS services/account HTTP and full external release verification use isolated fixtures.',
        'passedTests': sum(run['passed'] for run in runs), 'failedTests': 0, 'runs': runs,
        'durableCrashPhaseSubcases': {'apply': 10, 'manualRollback': 7, 'includedInTestCount': True},
        'preservedBehavior': [
            'Exact R81 source and R82 destination, full 1164-row production base identity.',
            'Exact reviewed production path scope and explicit before:null only for new helper/generated client files.',
            'All updated/new fixture paths verified after apply and rollback; crash after new helper insertion removes helper on recovery.',
            'Correct R82 health version and available runtimeDiagnosticsR80 required before target validation.',
            'R81 recovery journal cannot be adopted by R82; unrelated active update cannot be overwritten.',
            'Real install/daily-backup flock and matching backup environment/data-root gates.',
            'Real SQLite backup, quick_check and WAL preservation; current DB progress remains after code-only rollback.',
            'Accounts service never stopped/restarted, inode and service identity retained.',
            'Maintenance/registration policy and empty online/admission gates; no automatic opening.',
            'Pinned R80 native WAL and unchanged Node 22.23.4 / SQLite 3.53.4 runtime; HTTP differs from pinned R79 only by exact immutable client references.',
            'Immutable client graph closure from verified live rows; journaled atomic hardlinks, unchanged old asset bytes/inodes/modes/owners, and deterministic exact expanded path/new-directory recovery scope.',
            'Validated/rollback crash recovery, guard fencing, cleanup failure and fresh rollback backup behavior.',
        ],
        'actualPayloadLoaderTest': {'productionFiles': plan['files'], 'baseCoreSHA256': plan['baseCoreSHA256'],
                                   'baseRows': len(plan['baseCoreRows']), 'fullGameplayExecution': False},
        'moduleSHA256': module_hashes, 'testSHA256': test_hashes,
        'buildScriptSHA256': sha(BASE / 'r82-build.py'), 'updateManifestSHA256': sha(plan_path),
        'liveDeploymentPerformed': False,
    }
    target = TESTS / 'installer-evidence.json'
    target.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n')
    (PACKAGE / 'evidence').mkdir(exist_ok=True)
    shutil.copy2(target, PACKAGE / 'evidence' / target.name)
    for run in runs:
        output = BASE / run['outputFile']
        shutil.copy2(output, PACKAGE / 'evidence' / output.name)
    print(json.dumps({'passedTests': evidence['passedTests'], 'failedTests': 0,
                      'evidence': str(target), 'productionFiles': len(plan['files'])}, indent=2))


if __name__ == '__main__':
    main()
