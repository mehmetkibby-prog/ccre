#!/usr/bin/env python3
"""Run the unchanged cold worker regression on R106 and this candidate.

Only the disposable PvP fixture gains the bootstrap tables introduced after
the original test was written. Runtime modules and assertions stay unchanged;
the diagnostic worker-error transform is explicitly disabled. The shared
runner verifies and uses the pinned Node binary and release feature flags.
"""
import argparse
import os
from pathlib import Path
import subprocess
import sys


def main():
    candidate = Path(__file__).resolve().parent.parent
    workspace = candidate.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=Path, default=workspace / 'r106_captcha_worker')
    args = parser.parse_args()
    relative = Path('working/core511-source/scripts/core511/tests/cold-world.test.mjs')
    cases = [args.baseline.resolve() / relative, candidate / relative]
    runner = workspace / 'r102_content/tests/run.py'
    loader = candidate / 'tests/cold-fixture-diagnostic-loader.mjs'
    for required in [runner, loader, *cases]:
        if not required.is_file():
            parser.error(f'Required regression input is missing: {required}')
    env = os.environ.copy()
    env['R108_FIXTURE_PREREQS'] = '1'
    env.pop('R108_FIXTURE_DIAGNOSTIC', None)
    command = [sys.executable, str(runner), '--loader', loader.as_uri(),
               '--test', '--test-concurrency=1', *(str(case) for case in cases)]
    print('Cold worker regression: R106 and candidate; fixture bootstrap only, runtime diagnostics disabled.', flush=True)
    return subprocess.run(command, cwd=candidate, env=env, check=False).returncode


if __name__ == '__main__':
    raise SystemExit(main())
