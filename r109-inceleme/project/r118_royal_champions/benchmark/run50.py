#!/usr/bin/env python3
"""Serial, explicit local 50-player comparison. Never connects to a live realm."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import time

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
REVIEW = PROJECT.parents[1]
RUNTIME = PROJECT.parent / 'r109_latency_completion/working'
NODE = '/workspace/ccre/r79_stability_work/runtime/node-v22.23.4-linux-x64/bin/node'


def read(path):
    try:
        return Path(path).read_text().strip()
    except OSError:
        return None


def host():
    cpu = {}
    for line in (read('/sys/fs/cgroup/cpu.stat') or '').splitlines():
        key, value = line.split()
        cpu[key] = int(value)
    return {
        'at': time.time(), 'cpuStat': cpu,
        'cpuMax': read('/sys/fs/cgroup/cpu.max'),
        'cpusEffective': read('/sys/fs/cgroup/cpuset.cpus.effective'),
        'loadavg': read('/proc/loadavg'),
        'cpuTimes': next((x for x in (read('/proc/stat') or '').splitlines() if x.startswith('cpu ')), None),
        'memory': read('/sys/fs/cgroup/memory.current'),
    }


def fingerprint():
    h = hashlib.sha256()
    count = 0
    for root in [RUNTIME/'core511-source', RUNTIME/'native510-bb3a6cc689c6', RUNTIME/'http-runtime', RUNTIME/'accounts-runtime']:
        for p in sorted(root.rglob('*')):
            if not p.is_file() or p.is_symlink() or any(part in {'evidence', 'node_modules', '__pycache__'} for part in p.parts) or p.suffix not in {'.mjs','.js','.jsx','.json','.ts','.c','.webp'}:
                continue
            h.update(str(p.relative_to(RUNTIME)).encode())
            h.update(p.read_bytes())
            count += 1
    for p in [HERE/'load50.mjs',HERE/'run50.py',PROJECT/'tests/production-trigger-fixture-r118.mjs',REVIEW/'config/test-release-flags.json',REVIEW/'scripts/run.py',REVIEW/'scripts/dependency-loader.mjs']:
        h.update(p.name.encode());h.update(p.read_bytes());count+=1
    return {'sha256': h.hexdigest(), 'files': count, 'includes':['core511','native/lib','native/vds-server','HTTP/accounts runtime','client/media','benchmark driver/runner/fixture normalization','install flags and Node loader']}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--run', action='store_true', help='Explicitly execute after the shared CPU test window is cleared')
    parser.add_argument('--seconds', type=int, default=60)
    parser.add_argument('--repetitions', type=int, default=3)
    parser.add_argument('--areas', nargs='+', choices=['forest', 'champions'], default=['forest', 'champions'])
    parser.add_argument('--label', default=time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()))
    args = parser.parse_args()
    if not args.run:
        parser.error('Nothing ran. Pass --run only after coordinating a clear CPU window.')
    if args.seconds < 10 or args.repetitions < 1:
        parser.error('At least 10 seconds and one repetition required')
    output = PROJECT/'evidence'/('load50-'+args.label)
    output.mkdir(parents=True, exist_ok=False)
    # Use the reviewed install flags and dependency loader, then append only
    # this driver's controls. scripts/run.py itself strips CORE_* variables.
    spec=importlib.util.spec_from_file_location('r118_review_runner',REVIEW/'scripts/run.py')
    runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)
    env,policy=runner.environment()
    node_options=policy['nodeArgumentsWhenEnabled'] if env.get(policy['flag'])=='1' else []
    env.update({
        'REVIEW_NODE': NODE, 'CORE511_LOCAL_REPRO_AUTHORIZED':'1',
        'CORE_MS':str(args.seconds*1000), 'CORE_SCENARIO':'real', 'CORE_FIGHTERS':'1',
        'CORE_COLLECT':'1', 'CORE_COLLECT_RETRY':'1', 'CORE_OBS':'0',
    })
    all_runs = []
    contract = {'players':50, 'perChannel':[13,13,12,12], 'seconds':args.seconds,
        'repetitions':args.repetitions, 'source':fingerprint(), 'node':NODE,'nodeArguments':node_options,'installFlags':json.loads((REVIEW/'config/test-release-flags.json').read_text())['INSTALL_FLAGS'],
        'notes':['Synthetic fresh database, not a sanitized production database.',
                 'Bots and server share this host; not a production capacity guarantee.',
                 'Known legacy fixture-only battlefield trigger wrapper normalized to exact production SQL before writer start.',
                 'Stationary combat only: one nearby target per actor, matched HP3000/admin damage1/respawn10s; ordinary retaliation and all gameplay guards remain active.',
                 'Not a navigation test, not real admin damage, and not a production capacity validation. Prior walking/setup failures remain in separate raw reports.',
                 'Basic attack cadence uses last dispatch +650ms and actual server cooldown; response latency is not added twice.',
                 'Provisional kill ACKs require durable monster_result; bounded drain and strict rejection/accounting checks preserve unfinished outcomes.',
                 'Map reward policies remain their real policies, including the default 2% crown chance.']}
    (output/'contract.json').write_text(json.dumps(contract,indent=2))
    for repetition in range(1,args.repetitions+1):
        for area in args.areas:
            name=f'{repetition:02}-{area}'
            target=output/(name+'.json')
            run_env={**env, 'R118_BENCH_AREA':area, 'CORE_OUT':str(target)}
            before=host()
            print('START',name,flush=True)
            with (output/(name+'.log')).open('wb') as log:
                process=subprocess.run([NODE,*node_options,str(HERE/'load50.mjs')],
                    cwd=REVIEW,env=run_env,stdout=log,stderr=subprocess.STDOUT,timeout=args.seconds+240)
            after=host()
            row={'name':name,'exitCode':process.returncode,'before':before,'after':after,
                 'cpuStatDelta':{k:after['cpuStat'][k]-v for k,v in before['cpuStat'].items() if k in after['cpuStat']}}
            all_runs.append(row)
            (output/'host-metrics.json').write_text(json.dumps(all_runs,indent=2))
            report=json.loads(target.read_text()) if target.exists() else {}
            players=report.get('playerEvidence',[])
            rewards=report.get('actualRewards',{})
            checks={
                'completed':report.get('completed') is True,
                'exact50':len(players)==50 and report.get('players')==50,
                'allFought':len(players)==50 and all(p.get('ready') and p.get('successfulAttacks',0)>0 and p.get('rewardClaims',0)>0 for p in players),
                'allAlive':len(players)==50 and all(p.get('hp',0)>0 for p in players),
                'exactChannels':[sum(p.get('channel')==ch for p in players) for ch in [1,2,3,4]]==[13,13,12,12],
                'runtimePopulation':[r.get('players') for r in sorted(report.get('channels',[]),key=lambda x:x.get('ch',''))]==[13,13,12,12],
                'noFailures':report.get('errors')==0 and report.get('disconnects')==0 and not report.get('faults') and not report.get('failures') and report.get('unacked')==0,
                'balancedInputs':report.get('completionAccounting',{}).get('balanced') is True,
                'durableResults':report.get('rewardObservationR54',{}).get('pendingFinal')==[] and report.get('rewardObservationR54',{}).get('rejected')==0,
                'productionTriggerCertification':report.get('nonlethal',{}).get('schemaReady') is True,
                'realRewards':rewards.get('defeats',0)>0 and rewards.get('claims',0)>0 and rewards.get('unfinished')==0 and rewards.get('duplicateClaims')==0,
                'realCollection':report.get('loot',{}).get('collects',0)>0 and report.get('loot',{}).get('failed')==0 and sum(p.get('collected',0) for p in players)>0,
            }
            row['acceptanceChecks']=checks
            row['accepted']=all(checks.values())
            (output/'host-metrics.json').write_text(json.dumps(all_runs,indent=2))
            print('DONE',name,'exit',process.returncode,'completed',report.get('completed'),
                  'rewards',report.get('actualRewards'),'latency',report.get('latency'),flush=True)
            if process.returncode or not row['accepted']:
                raise SystemExit('Run failed; raw evidence preserved at '+str(output))
    final=fingerprint()
    (output/'source-after.json').write_text(json.dumps(final,indent=2))
    if final!=contract['source']:
        raise SystemExit('Runtime sources changed during measurement. Do not compare as a frozen run: '+str(output))
    print('EVIDENCE',output,flush=True)


if __name__=='__main__':
    main()
