import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHANNELS,CAPACITY,PROTOCOL} from '../r81-work/core511-source/scripts/core511/contract.mjs';
import {publicCheckpointR80,runtimeHealthR80} from '../r81-work/core511-source/scripts/core511/runtime-health-r80.mjs';
import {exclusiveWriterLaneR533} from '../r81-work/core511-source/scripts/core511/writer-lane-r533.mjs';
import {createRuntimePerformance} from '../r81-work/native510-bb3a6cc689c6/vds-server/src/runtime-performance.mjs';

// Execute the EXACT current health() source, without loading the unrelated
// generated native service composition. This tests method/helper integration,
// not server startup, routing, authentication, or full module importability.
const source=readFileSync(new URL('../r81-work/core511-source/scripts/core511/native-http-bindings.mjs',import.meta.url),'utf8');
const start=source.indexOf('\n health(){'),end=source.indexOf('\n async stop(){',start);
assert.ok(start>=0&&end>start,'health method boundaries must match the source');
const method=source.slice(start+1,end);
const HealthMethodFixture=new Function('CHANNELS','CAPACITY','PROTOCOL','publicCheckpointR80','runtimeHealthR80',`return class HealthMethodFixture {${method}}`)(CHANNELS,CAPACITY,PROTOCOL,publicCheckpointR80,runtimeHealthR80);
const runtimeKey=Symbol.for('coreoflife.runtimePerformance');
const secret='PRIVATE_HEALTH_FIXTURE_PAYLOAD';

function fixture(t){
 const prior=globalThis[runtimeKey],now=Date.now();
 const runtime=createRuntimePerformance({now:()=>now});
 runtime.record({loopUtilization:.4,cpuCores:.2,loopExcessMs:12});
 globalThis[runtimeKey]=runtime;
 t.after(()=>{if(prior===undefined)delete globalThis[runtimeKey];else globalThis[runtimeKey]=prior;});
 const checkpoint={ready:false,fallback:'checkpoint-backlog',running:false,pendingPages:17000,
  retryR80:{state:'retry-wait',attempts:2,consecutiveAttempts:2,maxAttempts:5,nextRetryAtMs:now+1000,recoveries:1,lastFallback:'checkpoint-backlog',lastRecoveredAtMs:now-1000,retryAllowed:true,secret},
  recoveryProbe:{active:true,attempts:3,healthyPasses:1,requiredHealthyPasses:2,nextProbeAtMs:now+1000,secret}};
 const database={writeQueue:[],scheduleWriteDrain(){throw Error('health scheduled writes');},drainWrites(){throw Error('health drained writes');},
  sqlite:new Proxy({},{get(){throw Error('health touched SQL');}}),
  core511CheckpointR79:{snapshot:()=>checkpoint},
  walSync:{failed:Error(secret),running:Promise.resolve(),waiting:[{}],snapshot:()=>({ready:false,syncs:2,waiters:4,meanMs:15,maxMs:25,totalMs:30,errors:1,reopened:0,secret})}};
 const lane=exclusiveWriterLaneR533(database);t.after(()=>lane.close());
 const realm={role:'game',id:'fixture-realm'},core={database,realm,clock:()=>now,
  nativeBootstrap:{counts:()=>new Map([[1,6],[2,4],[3,0],[4,0]])},
  channelSupervisor:{rows:new Map(CHANNELS.map(channel=>[channel,{state:'running',ready:true,peer:{incarnation:channel}}]))},
  processes:new Map(CHANNELS.map(channel=>[channel,{online:true,peer:{incarnation:channel}}])),
  sharedWorld:{row:{state:'running'}},reader:{slot:{}},
  diagnostics:{writerStallsR79:{snapshot:()=>({slowCommits:1,lastCommitMs:5,maxCommitMs:25,lastSlowAtMs:now-100,secret})}},
  writer:{rewardWorkerR533:{slot:{pending:{secret}},stats:{jobs:3,fallbacks:1,replays:0,rollbacks:0,restarts:0,maxWorkerMs:100,maxPreflightMs:10,maxReadyWaitMs:7,secret}}}};
 const binding=new HealthMethodFixture();
 Object.assign(binding,{accepting:true,towerReady:true,mistAdmin:{},guildReader:{ready:true},core:()=>core,
  host:{database,boot:'fixture-startup',expected:{realmId:realm.id,dbIdentity:'fixture-db'},nativeRealmStartup:{ready:true,runtime:realm}}});
 return {binding,core,checkpoint};
}

test('R81 exact health version integrates the unchanged R80 helper, retry fields and source runtime sampler',async t=>{
 const {binding}=fixture(t),response=binding.health(),body=await response.json();
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(body.updateVersion,'R81_GAMEPLAY');assert.equal(body.kernel511.ready,true);
 assert.equal(body.checkpointR79.retryR80.state,'retry-wait');assert.equal(body.checkpointR79.recoveryProbe.healthyPasses,1);
 const r=body.runtimeDiagnosticsR80;
 assert.equal(r.available,true);assert.equal(r.main.status,'live');assert.equal(r.main.eventLoopBusyPercent,40);
 assert.equal(r.main.cpu.meanPercent,20);assert.equal(r.main.cpu.sampleCount,1);assert.equal(r.main.cpu.resolutionPercentPoints,10);
 assert.equal(r.writerLane.queuedWrites,0);assert.equal(r.walSync.queuedForNextFlush,1);assert.equal(r.walSync.pumpedCallsTotal,4);
 assert.equal(r.rewardWorker.pending,true);assert.equal(r.mainCommits.maxCommitMs,25);
 assert.equal(JSON.stringify(body).includes(secret),false);
});

test('exact health method preserves readiness failure and HTTP 503 independently of live metrics',async t=>{
 const {binding,core}=fixture(t);core.processes.get(2).peer.incarnation='stale-owner';
 const response=binding.health(),body=await response.json();
 assert.equal(response.status,503);assert.equal(body.ok,false);assert.equal(body.kernel511.ready,false);
 assert.equal(body.channelProcesses.channels[1].ready,false);assert.equal(body.runtimeDiagnosticsR80.main.status,'live');
});

test('exact health method remains available when an optional metric observer fails',async t=>{
 const {binding,core}=fixture(t);core.database.walSync.snapshot=()=>{throw Error(secret);};
 const response=binding.health(),body=await response.json();
 assert.equal(response.status,200);assert.equal(body.ok,true);
 assert.deepEqual(body.runtimeDiagnosticsR80,{protocol:'runtime-diagnostics-r80-v1',available:false});
 assert.equal(JSON.stringify(body).includes(secret),false);
});
