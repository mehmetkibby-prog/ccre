#!/usr/bin/env python3
from pathlib import Path
import os, subprocess, sys
ROOT=Path(__file__).resolve().parents[1];P=ROOT/'project';R=P/'r109_latency_completion'
runner=[sys.executable,str(ROOT/'scripts/run.py')]
groups={
 'focused':['adventure-scan.test.mjs','monster-snapshot.test.mjs','recovery.test.mjs','reply-wire.test.mjs','reply-wire-process.test.mjs','ipc-owned-buffer.test.mjs','slim-snapshot-reuse.test.mjs','cold-adventure-reuse-r108.test.mjs','combat-boss-validation.mjs','boot-pool-order-r108.test.mjs','reward-fallback-cache-r109.test.mjs','short-death-groups-r109.test.mjs','ws-handoff-race.test.mjs'],
 'captcha':['captcha.test.mjs','captcha-native.test.mjs','captcha-regression.test.mjs','captcha-accounts.test.mjs'],
}
group=sys.argv[1] if len(sys.argv)>1 else 'focused'
if group in groups:cmd=runner+['--test','--test-concurrency=1',*[str(R/'tests'/f) for f in groups[group]]]
elif group=='native':
    subprocess.run([sys.executable,str(R/'tests/prepare-native-regression.py')],cwd=R,check=True)
    files=[str(R/'evidence/native-tests'/f) for f in ['dungeon-native.test.mjs','dungeon-channel.test.mjs','native-http-trade-storage.test.mjs','additions-tower-process-r102.test.mjs']]
    files += [str(R/'working/core511-source/scripts/core511/tests'/f) for f in ['adventure-r19.test.mjs','checkpoint-ownership.test.mjs']]
    cmd=runner+['--test','--test-concurrency=1',*files]
elif group=='installer':cmd=[sys.executable,str(R/'tests/installer_test.py'),'-v']
elif group=='runtime':
    subprocess.run([sys.executable,str(R/'tests/stage-runtime.py')],cwd=R,env=os.environ,check=True)
    cmd=runner+['--test',str(R/'tests/relocated-entry.test.mjs')]
elif group=='handoff':
    # R110 candidate: installed R109 release + this tree's changed runtime files.
    subprocess.run([sys.executable,str(R/'tests/stage-candidate.py')],cwd=R,env=os.environ,check=True)
    cmd=runner+['--test',str(R/'tests/ws-handoff-runtime.test.mjs')]
elif group=='r110':
    # R110 installer on an installed R109, then the tree it installs started for real.
    T=P/'r110_takilma'
    rc=subprocess.run([sys.executable,str(T/'tests/installer_test.py'),'-v'],cwd=T,env=os.environ).returncode
    if rc:raise SystemExit(rc)
    subprocess.run([sys.executable,str(T/'tests/stage-runtime.py')],cwd=T,env=os.environ,check=True)
    stage=str(T/'evidence/runtime-stage.json')
    env={**os.environ,'RUNTIME_STAGE_FILE':stage,'RUNTIME_EVIDENCE_DIR':str(T/'evidence'),'RUNTIME_LABEL':'relocated-r110','RUNTIME_EXPECT_R110':'1','HANDOFF_STAGE_FILE':stage,'HANDOFF_EVIDENCE_FILE':str(T/'evidence/ws-handoff-runtime.json')}
    raise SystemExit(subprocess.run(runner+['--test','--test-concurrency=1',str(R/'tests/relocated-entry.test.mjs'),str(R/'tests/ws-handoff-runtime.test.mjs')],cwd=R,env=env).returncode)
elif group=='browser':cmd=runner+[str(R/'tests/tower-browser.mjs')]
else:raise SystemExit('Unknown check group: '+group)
raise SystemExit(subprocess.run(cmd,cwd=R,env=os.environ).returncode)
