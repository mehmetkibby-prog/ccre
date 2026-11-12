#!/usr/bin/env python3
"""Prepare/run an isolated reader CPU diagnostic; never an acceptance load.

Default: prepare only. --run explicitly starts one load after preparation.
The whole core511-source tree is copied with new inodes; other unchanged
working roots are symlinked read-only by convention. No source is patched.
Use only while the parent has released the sequential load-test window.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
REVIEW_PROJECT=Path(__file__).resolve().parents[2]
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
RUNNER = Path(str(REVIEW_PROJECT / 'r102_content/tests/run.py'))
RELATIVE_READER = Path('scripts/core511/read-worker.mjs')
ANCHOR = "const rows=await loadWindow.command(message.payload);"
WORKER_ANCHOR = "if(!isMainThread&&workerData?.kernel511ReadWorker===true) {"


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def prepare(source, label, players):
    source = source.resolve(strict=True)
    source_core = source/'core511-source'
    original = source_core/RELATIVE_READER
    old_hash = sha(original)
    original_text = original.read_text()
    if original_text.count(ANCHOR) != 1 or original_text.count(WORKER_ANCHOR) != 1:
        raise RuntimeError('reader instrumentation anchors changed; inspect before running')
    if 'createReaderCpuDiagnosticR108' in original_text:
        raise RuntimeError('source already instrumented')
    stage = Path(tempfile.mkdtemp(prefix='r108-reader-diag-'))
    working = stage/'working'
    working.mkdir()
    shutil.copytree(source_core, working/'core511-source', symlinks=False, copy_function=shutil.copy2)
    linked = []
    for item in source.iterdir():
        if item.name == 'core511-source':
            continue
        (working/item.name).symlink_to(item.resolve(), target_is_directory=item.is_dir())
        linked.append({'name': item.name, 'target': str(item.resolve())})
    target = working/'core511-source'/RELATIVE_READER
    if target.stat().st_ino == original.stat().st_ino and target.stat().st_dev == original.stat().st_dev:
        raise RuntimeError('refusing to instrument a shared inode')
    helper = target.with_name('reader-cpu-diagnostic-r108.mjs')
    shutil.copy2(ROOT/'tests/reader-profile-bootstrap.mjs', helper)
    modified = "import {createReaderCpuDiagnosticR108} from './reader-cpu-diagnostic-r108.mjs';\n" + original_text
    modified = modified.replace(WORKER_ANCHOR, WORKER_ANCHOR + "\n const readerCpuDiagnosticR108=createReaderCpuDiagnosticR108({directory:process.env.R108_READER_PROFILE_DIR,incarnation:workerData.incarnation});")
    modified = modified.replace(ANCHOR, "const rows=await readerCpuDiagnosticR108.measure(message.payload,()=>loadWindow.command(message.payload));")
    target.write_text(modified)
    if sha(original) != old_hash:
        raise RuntimeError('source unexpectedly changed during preparation')
    evidence = ROOT/'evidence'
    evidence.mkdir(exist_ok=True)
    profiles = evidence/f'{label}-{players}-reader-profiles'
    profiles.mkdir(exist_ok=False)
    manifest = {
        'diagnosticOnly': True,
        'acceptanceEligible': False,
        'reason': 'Inspector CPU sampling in the real read worker perturbs timings; not an acceptance or capacity run.',
        'sourceWorking': str(source),
        'stagedWorking': str(working),
        'sourceReaderSha256': old_hash,
        'stagedReaderSha256': sha(target),
        'bootstrapSha256': sha(helper),
        'sourceReaderUnchanged': True,
        'coreCopyMethod': 'shutil.copytree/copy2; no hardlinks; symlinks dereferenced within core511-source',
        'otherWorkingRootsSymlinked': linked,
        'profiles': str(profiles),
        'label': label,
        'players': players,
    }
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path(str(REVIEW_PROJECT / 'r106_captcha_worker/working')))
    parser.add_argument('--label', required=True, help='Unique lowercase label; automatically prefixed reader-diag-.')
    parser.add_argument('--players', type=int, choices=(10, 30, 40, 50, 100), default=40)
    parser.add_argument('--realm', choices=('r1', 'r2'), default='r1')
    parser.add_argument('--milliseconds', type=int, default=60000)
    parser.add_argument('--run', action='store_true', help='Explicitly execute one load; default only prepares.')
    args = parser.parse_args()
    if not args.label or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in args.label):
        parser.error('label must contain only lowercase letters, digits and hyphens')
    if not 10000 <= args.milliseconds <= 180000:
        parser.error('milliseconds must be 10000..180000')
    if args.realm == 'r2' and args.players > 40:
        parser.error('respect the current Akademi capacity')
    label = 'reader-diag-'+args.label
    output = ROOT/'evidence'/f'{label}-{args.players}.json'
    log_path = output.with_suffix('.log')
    manifest_path = output.with_suffix('.diagnostic-manifest.json')
    if any(file.exists() for file in (output, log_path, manifest_path)):
        raise RuntimeError('diagnostic label already exists; preserve prior evidence')
    manifest = prepare(args.source, label, args.players)
    overrides = {
        'STUTTER_TREE': manifest['stagedWorking'],
        'R108_READER_PROFILE_DIR': manifest['profiles'],
        'R108_WS_TRANSPORT': 'tcp',
        'LOAD_PLAYERS': str(args.players),
        'LOAD_MS': str(args.milliseconds),
        'LOAD_LABEL': label,
        'POPULATION_MODE': os.environ.get('POPULATION_MODE', 'mixed'),
        'BACKGROUND_MONSTERS': '6000',
        'R102_TEST_REALM': args.realm,
        'CPU_PROFILE': '0',
        'ALLOCATION_PROFILE': '0',
    }
    command = ['python3', str(RUNNER), str(ROOT/'tests/population-load.mjs')]
    manifest.update(environment=overrides, command=command, executed=False)
    manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
    print(json.dumps({'manifest': str(manifest_path), **manifest}, indent=2), flush=True)
    if not args.run:
        return 0
    try:
        with log_path.open('x') as log:
            result = subprocess.run(command, env={**os.environ, **overrides}, stdout=log, stderr=subprocess.STDOUT, timeout=300)
        manifest.update(executed=True, exitCode=result.returncode)
        return result.returncode
    finally:
        if output.exists():
            report = json.loads(output.read_text())
            report.update(diagnosticOnly=True, acceptanceEligible=False, diagnosticReason=manifest['reason'])
            report.setdefault('instrumentation', {}).update(readerCpuSampling=True)
            output.write_text(json.dumps(report, indent=2)+'\n')
        manifest['profileFiles'] = sorted(str(f) for f in Path(manifest['profiles']).glob('*.cpuprofile'))
        manifest['sourceReaderUnchanged'] = sha(args.source/'core511-source'/RELATIVE_READER) == manifest['sourceReaderSha256']
        manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
        print(json.dumps({'manifest': str(manifest_path), 'profiles': manifest['profileFiles'], 'sourceReaderUnchanged': manifest['sourceReaderUnchanged']}, indent=2), flush=True)


if __name__ == '__main__':
    raise SystemExit(main())
