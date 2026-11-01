#!/usr/bin/env python3
"""Run local R84 integration fixtures with pinned Node and release feature flags."""
import ast
import hashlib
import os
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
node = root.parent/'r79_stability_work/runtime/node-v22.23.4-linux-x64/bin/node'
assert hashlib.sha256(node.read_bytes()).hexdigest() == '94efd062ed066c1a0b332e18249859c905e920eeada5df55d24c99b919629a90'
tree = ast.parse((root/'handoff/r84-package/modules/r63_support.py').read_text())
flags = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'INSTALL_FLAGS' for t in n.targets))
env = {k:v for k,v in os.environ.items() if not k.startswith(('CORE_', 'CORE511_', 'COL_', 'R35_', 'R43_', 'R47_', 'R51_', 'R57_', 'R61_')) and k != 'NODE_OPTIONS'}
env.update(flags)
env['NODE_OPTIONS'] = '--no-warnings --import '+str(root/'tests/runtime/register-r84-fixture.mjs')
env['COL_CORE511_BASE'] = str(root/'working/native510-bb3a6cc689c6')
# Match the installer-owned R61 game service ExecStart policy, not only its
# environment. Reward workers inherit this main-process compilation policy.
startup = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'R61_NODE_STARTUP_POLICY' for t in n.targets))
node_args = startup['nodeArgumentsWhenEnabled'] if env.get(startup['flag']) == '1' else []
raise SystemExit(subprocess.run([str(node), *node_args, *sys.argv[1:]], cwd=root, env=env).returncode)
