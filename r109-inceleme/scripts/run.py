#!/usr/bin/env python3
"""Run isolated fixtures with the original release flags and local dependencies."""
import json, os, pathlib, shutil, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
PROJECT=ROOT/'project'
def environment():
    flags=json.loads((ROOT/'config/test-release-flags.json').read_text())
    env={k:v for k,v in os.environ.items() if not k.startswith(('CORE_','CORE511_','COL_','R35_','R43_','R47_','R51_','R57_','R61_')) and k!='NODE_OPTIONS'}
    env.update(flags['INSTALL_FLAGS'])
    realm=os.environ.get('R102_TEST_REALM','r1')
    if realm not in ['r1','r2']:raise SystemExit('R102_TEST_REALM must be r1 or r2')
    env.update(CORE101_REALM_ID=realm,CORE_REALM_ID=realm,
        COL_CORE511_BASE=str(PROJECT/'r61_audio_work/working/native510-bb3a6cc689c6'),
        COL_TEST_ACORN_MODULE=str(ROOT/'node_modules/acorn/dist/acorn.mjs'),
        STUTTER_TREE=os.environ.get('STUTTER_TREE',str(PROJECT/'r109_latency_completion/working')),
        CLIENT_TREE=os.environ.get('CLIENT_TREE',str(PROJECT/'r109_latency_completion/working')))
    env['NODE_OPTIONS']='--no-warnings --loader '+(ROOT/'scripts/dependency-loader.mjs').as_uri()
    return env,flags['R61_NODE_STARTUP_POLICY']
def main(args):
    node=os.environ.get('REVIEW_NODE') or shutil.which('node')
    if not node:raise SystemExit('Install Node.js 22.23.4 or set REVIEW_NODE')
    version=subprocess.check_output([node,'--version'],text=True).strip()
    if version!='v22.23.4' and os.environ.get('REVIEW_ALLOW_NODE_VERSION')!='1':
        raise SystemExit('Use Node.js v22.23.4 for comparable results; got '+version)
    env,policy=environment()
    options=policy['nodeArgumentsWhenEnabled'] if env.get(policy['flag'])=='1' else []
    return subprocess.run([node,*options,*args],cwd=PROJECT/'r109_latency_completion',env=env).returncode
if __name__=='__main__':raise SystemExit(main(sys.argv[1:]))
