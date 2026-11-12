#!/usr/bin/env python3
"""Verify R108 release proof, rebuild docs only, optionally deliver immutable files."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import runpy
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EV = ROOT / 'evidence'
VERSION = 'R108_LATENCY1'
DOCS = {'PERFORMANS_RAPORU.md', 'DOGRULAMA.md', 'KURULUM.md'}
EXPECTED_STEPS = ['focused', 'cold-worker-regression', 'native-fixtures', 'native-current',
                  'captcha', 'package-build', 'installer', 'runtime-stage', 'relocated-runtime',
                  'browser-assets', 'browser-r1', 'browser-r2', 'three-browser-tower']
TAP_TOTALS = {'focused': 46, 'cold-worker-regression': 2, 'native-current': 29, 'captcha': 20, 'relocated-runtime': 2}
REPORTS = ['browser-r1-hud-r108-latency/report.json', 'browser-r2-hud-mobile-r108-latency/report.json',
           'three-browser-r108-latency/report.json']


def require(condition, detail):
    if not condition:
        raise RuntimeError(detail)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    return json.loads(Path(path).read_text())


def log_path(row):
    path = Path(row['log'])
    path = path if path.is_absolute() else ROOT / path
    require(path.resolve().is_relative_to(EV.resolve()), 'Validation log is outside evidence')
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--deliver', action='store_true', help='Copy verified immutable ZIP/report/CSV into delivery/')
    args = parser.parse_args()
    report = runpy.run_path(str(ROOT / 'tests/write-latency-report.py'))
    load = report['collect'](strict=True)
    progress = read(EV / 'validation-progress.json')
    require([row['name'] for row in progress] == EXPECTED_STEPS, 'All thirteen ordered release validation steps are required')
    require(all(row['exit'] == 0 for row in progress), 'A release validation step failed')
    by_name = {row['name']: row for row in progress}
    checks = []
    for label, count in TAP_TOTALS.items():
        path = log_path(by_name[label]); text = path.read_text(); found = {}
        for key in ('tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'):
            matches = re.findall(r'^# ' + key + r' (\d+)\s*$', text, re.M)
            require(bool(matches), f'{label}: missing TAP {key}')
            found[key] = int(matches[-1])
        require(found == {'tests': count, 'pass': count, 'fail': 0, 'cancelled': 0, 'skipped': 0, 'todo': 0}, f'{label}: unexpected TAP summary {found}')
        checks.append({'name': label, 'log': str(path.relative_to(EV)), 'sha256': sha(path), **found})
    installer = log_path(by_name['installer'])
    require(bool(re.search(r'Ran 26 tests[^\n]*\n\s*\nOK\s*$', installer.read_text(), re.M)), 'Installer must finish all 26 tests successfully')
    browsers = []
    for name in REPORTS:
        path = EV / name; data = read(path)
        require(data.get('passed') is True and not data.get('failure'), f'Browser did not pass: {name}')
        require(all(key in data and not data[key] for key in ('errors', 'nativeFaults', 'missingAssets')), f'Browser evidence invalid: {name}')
        browsers.append({'report': name, 'sha256': sha(path), 'passed': True, 'seconds': data['durationMs'] / 1000})
    baseline = ROOT.parent / 'r106_captcha_worker/delivery/r106-captcha.zip'
    require(sha(baseline) == report['BASELINE_SHA'], 'Selected original R106 ZIP changed')
    upload = Path('/tmp/codex-remote-attachments/01a16fbd-091f-71a5-923e-6bb701b9105f/2b464a78-5dae-45aa-addb-7e2a7dc9c0b0/1-r106-captcha.zip')
    if upload.exists():
        require(sha(upload) == report['BASELINE_SHA'], 'Original uploaded R106 ZIP changed')
    stage = read(EV / 'runtime-stage.json')
    tested = stage.get('actualTestedPackage', stage.get('package'))
    require(isinstance(tested, dict) and sha(tested['file']) == tested['sha256'], 'Staged test archive SHA does not match')
    release = Path(stage['release'])
    with zipfile.ZipFile(tested['file']) as archive:
        plan = json.loads(archive.read('plan.json'))
        require(plan['version'] == VERSION, 'Staged tests used another version')
        require(set(plan['sources']) == {'R105_PERF1', 'R106_CAPTCHA1'}, 'Unexpected source version')
        require(plan['databaseScope'] == 'none' and plan['databaseChanges'] is False and plan['databaseSchemaChanges'] is False, 'Unexpected database changes')
        for name, row in plan['files'].items():
            payload = archive.read('payload/' + name)
            require(hashlib.sha256(payload).hexdigest() == row['after'], f'Archive payload hash mismatch: {name}')
            require((release / name).read_bytes() == payload, f'Staged code differs from tested archive: {name}')
    validation = {'version': VERSION, 'functionalChecksPassed': True,
                  'zeroLagTargetMet': False, 'localAllProcessPauseTargetMet': load['localAllProcessPauseTargetMet'],
                  'liveInstalled': False, 'productionAccess': False, 'delivered': False,
                  'archiveVerificationComplete': False,
                  'baselineZipSHA256': report['BASELINE_SHA'], 'selectedSource': 'R106_CAPTCHA1',
                  'rejectedSource': 'R106_READY1', 'sources': ['R105_PERF1', 'R106_CAPTCHA1'],
                  'tests': checks, 'installerTests': 26, 'installerLog': str(installer.relative_to(EV)),
                  'installerLogSHA256': sha(installer), 'progress': progress,
                  'browserChecks': browsers, 'actualTestedPackage': tested, 'testedInstalledRoot': str(release),
                  'matchedRuns': load['matched'], 'extraRuns': load['extras'], 'excludedEvidence': load['excluded'],
                  'loadEnvironment': {'cpuQuota': 4, 'liveVdsCpu': 8, 'liveDatabase': False,
                                      'durationSeconds': 60, 'matchedRuns': 12, 'profileExcluded': True},
                  'notes': ['Performance targets are separate from functional validation.',
                            'All declared reader/world/main/channel pause maxima are included.',
                            'Synthetic local TCP results are not a live VDS or client FPS guarantee.']}
    output = EV / 'release-validation.json'
    output.write_text(json.dumps(validation, ensure_ascii=False, indent=2) + '\n')
    report['write_report'](strict=True, validation=validation)
    subprocess.run([sys.executable, 'build/package.py'], cwd=ROOT, check=True)
    final = read(EV / 'package.json')
    require(sha(final['file']) == final['sha256'], 'Final archive SHA mismatch')
    with zipfile.ZipFile(tested['file']) as before, zipfile.ZipFile(final['file']) as after:
        require(set(before.namelist()) == set(after.namelist()), 'Final archive member set changed since tests')
        changed = [name for name in before.namelist() if before.read(name) != after.read(name)]
        require(set(changed) <= DOCS, 'Untested executable/plan/module bytes changed: ' + repr(changed))
    validation.update(documentationOnlyArchiveChanges=changed, testedExecutableBytesMatchFinal=True,
                      archiveVerificationComplete=True, finalPackage=final)
    if args.deliver:
        out = ROOT / 'delivery'
        sources = [(Path(final['file']), 'r108-gecikme.zip'), (ROOT / 'PERFORMANS_RAPORU.md', 'R108-olcum-raporu.md'),
                   (EV / 'latency-measurements.csv', 'R108-olcumler.csv'), (EV / 'latency-run-inventory.csv', 'R108-kosu-envanteri.csv')]
        content = [(out / name, source.read_bytes()) for source, name in sources]
        content.append((out / 'r108-gecikme.zip.sha256', (final['sha256'] + '  r108-gecikme.zip\n').encode()))
        for destination, data in content:
            require(not destination.exists() or destination.read_bytes() == data, 'Never overwrite an existing delivery: ' + str(destination))
        out.mkdir(exist_ok=True)
        for destination, data in content:
            if not destination.exists():
                with destination.open('xb') as stream:
                    stream.write(data)
        validation.update(delivered=True, delivery=str(out / 'r108-gecikme.zip'))
    output.write_text(json.dumps(validation, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: validation[key] for key in ('version', 'functionalChecksPassed', 'localAllProcessPauseTargetMet', 'zeroLagTargetMet', 'delivered', 'actualTestedPackage', 'finalPackage')}, indent=2))


if __name__ == '__main__':
    main()
