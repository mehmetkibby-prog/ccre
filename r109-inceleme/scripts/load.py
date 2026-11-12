#!/usr/bin/env python3
"""Synthetic local load only; results are not a live capacity certification."""
import argparse,datetime,os,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--players',type=int,choices=[10,30,40,50,100],default=10)
p.add_argument('--seconds',type=int,default=60);p.add_argument('--realm',choices=['r1','r2'],default='r1')
p.add_argument('--mode',choices=['mixed','forest','tower','solo','mist','black','rune_v2','shared_boss_terminal'],default='mixed')
a=p.parse_args()
if not 10<=a.seconds<=180:p.error('seconds must be 10..180')
if a.realm=='r2' and a.players>40:p.error('Academy fixture capacity is 4x10. Do not bypass admission.')
label='review-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')
env={**os.environ,'LOAD_PLAYERS':str(a.players),'LOAD_MS':str(a.seconds*1000),'LOAD_LABEL':label,
 'POPULATION_MODE':a.mode,'POPULATION_EQUIPMENT':'1','BACKGROUND_MONSTERS':'6000','LOAD_DISTRIBUTION':'balanced',
 'R108_WS_TRANSPORT':'tcp','R102_TEST_REALM':a.realm,'CPU_PROFILE':'0','ALLOCATION_PROFILE':'0','SQL_DIAGNOSTIC':'0'}
raise SystemExit(subprocess.run([sys.executable,str(root/'scripts/run.py'),str(root/'project/r109_latency_completion/tests/population-load.mjs')],env=env).returncode)
