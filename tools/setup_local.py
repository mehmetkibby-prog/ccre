#!/usr/bin/env python3
"""Restore local-only fixture paths/dependencies. Never touches a game service or DB."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def link(target, destination):
    target = Path(target).resolve(strict=True)
    if destination.exists() or destination.is_symlink():
        if destination.resolve() != target:
            raise RuntimeError(f'Existing different path; refusing replacement: {destination}')
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.symlink_to(os.path.relpath(target, destination.parent), target_is_directory=target.is_dir())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node', type=Path, help='Use an existing exact Linux x64 Node binary')
    args = parser.parse_args()
    if ROOT != Path('/workspace/ccre'):
        raise SystemExit('Historical tests use /workspace/ccre. Use the documented Docker mount or clone there. No files were changed.')
    spec = json.loads((ROOT/'r86_stability_work/r86-package/RUNTIME.json').read_text())
    destination = ROOT/'r79_stability_work'/spec['node']
    if not destination.exists():
        if args.node:
            node = args.node.resolve(strict=True)
            if hashlib.sha256(node.read_bytes()).hexdigest() != spec['nodeSha256']:
                raise SystemExit('Wrong Node binary; expected exact pinned SHA-256.')
            link(node, destination)
        else:
            with tempfile.TemporaryDirectory(prefix='core511-node-') as temporary:
                archive = Path(temporary)/spec['archive']
                urllib.request.urlretrieve(spec['source'], archive)
                if archive.stat().st_size != spec['archiveBytes'] or hashlib.sha256(archive.read_bytes()).hexdigest() != spec['archiveSha256']:
                    raise SystemExit('Node archive SHA-256/size mismatch.')
                destination.parents[2].mkdir(parents=True, exist_ok=True)
                subprocess.run(['tar', '-xJf', str(archive), '-C', str(destination.parents[2])], check=True)
    if hashlib.sha256(destination.read_bytes()).hexdigest() != spec['nodeSha256']:
        raise SystemExit('Installed local Node binary differs from the pinned runtime.')
    for version in (85, 86, 87):
        working = ROOT/f'r{version}_stability_work/working'
        link(ROOT/'vendor/native-node_modules', working/'native510-bb3a6cc689c6/node_modules')
        link(ROOT/'vendor/build-node_modules', working/'deps/build/node_modules')
    # Packages vendored under native-node_modules resolve their own peer
    # dependencies (e.g. @livekit/protocol -> @bufbuild/protobuf) only through
    # an ancestor node_modules directory.
    link(ROOT/'vendor/native-node_modules', ROOT/'vendor/node_modules')
    build = ROOT/'r87_stability_work/working/deps/build'
    for name in ('core511-build-deps', 'col-perf-r11-dependencies'):
        link(build, Path('/tmp')/name)
    baseline = ROOT/'r85_stability_work/tests/runtime/r84-baseline'
    reference = ROOT/'r85_stability_work/working'
    for relative in ('core511-source/scripts/delivery511', 'core511-source/scripts/perf-r11', 'native510-bb3a6cc689c6'):
        link(reference/relative, baseline/relative)
    print('Local native fixture dependencies restored. No tests or live installer were run.')


if __name__ == '__main__':
    main()
