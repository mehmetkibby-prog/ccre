import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {setImmediate as nextTurn,setTimeout as delay} from 'node:timers/promises';
import {publicCheckpointR80,runtimeHealthR80} from '../r80-work/core511-source/scripts/core511/runtime-health-r80.mjs';
import {exclusiveWriterLaneR533,writerLaneSnapshotR80} from '../r80-work/core511-source/scripts/core511/writer-lane-r533.mjs';

const processSample=()=>({current:{sampledAtMs:10000,loopUtilization:.4,loopExcessMs:8},cpuCoresMean:.2,cpuCoresMax:1.4});
const baseCore=()=>({database:{},writer:{},diagnostics:{}});

test('ELU and real process CPU have distinct fields and explicit time windows',()=>{
 const result=runtimeHealthR80(baseCore(),{nowMs:12000,processSnapshot:processSample()});
 assert.equal(result.main.eventLoopBusyPercent,40);
 assert.equal(result.main.cpu.meanPercent,20);
 assert.equal(result.main.cpu.maxPercent,140);
 assert.equal(result.main.sampleSeconds,2);
 assert.equal(result.main.cpu.windowSeconds,300);
 assert.equal(result.main.cpu.resolutionPercentPoints,10);
 assert.match(result.main.cpu.scope,/one-core-is-100/);
 assert.equal(result.main.status,'live');
});

test('stale, missing and future samples do not become a live percentage',()=>{
 for(const [nowMs,p,status]of [[18000,processSample(),'stale'],[9999,processSample(),'stale'],[12000,{},'unavailable']]){
  const r=runtimeHealthR80(baseCore(),{nowMs,processSnapshot:p});
  assert.equal(r.main.status,status);assert.equal(r.main.eventLoopBusyPercent,null);assert.equal(r.main.cpu.meanPercent,null);
 }
});

test('malformed/non-finite counters are null and never coerced to zero',()=>{
 const p=processSample();Object.assign(p.current,{loopUtilization:Infinity,loopExcessMs:-1});p.cpuCoresMean=null;p.cpuCoresMax='secret';
 const r=runtimeHealthR80(baseCore(),{nowMs:12000,processSnapshot:p});
 assert.equal(r.main.eventLoopBusyPercent,null);assert.equal(r.main.eventLoopDelayMs,null);assert.equal(r.main.cpu.meanPercent,null);assert.equal(r.main.cpu.maxPercent,null);
});

test('checkpoint retry and probe fields are a strict public whitelist',()=>{
 const r=publicCheckpointR80({ready:false,fallback:'checkpoint-backlog',pendingPages:17000,secret:'private',retryR80:{state:'retry-wait',attempts:2,consecutiveAttempts:2,maxAttempts:5,nextRetryAtMs:42000,recoveries:1,lastFallback:'checkpoint-backlog',lastRecoveredAtMs:10000,retryAllowed:true,actor:'private'},recoveryProbe:{active:true,attempts:3,healthyPasses:1,requiredHealthyPasses:2,nextProbeAtMs:44000,path:'private'}});
 assert.equal(r.retryR80.attempts,2);assert.equal(r.recoveryProbe.healthyPasses,1);
 assert.equal(r.fallback,'checkpoint-backlog');assert.equal(r.pendingPages,17000);
 assert.equal(JSON.stringify(r).includes('private'),false);
});

test('unknown checkpoint text and invalid numeric fields are removed',()=>{
 const r=publicCheckpointR80({fallback:'/private/db.sqlite: password',pendingPages:-1,retryR80:{state:'password',attempts:NaN,lastFallback:'private'},recoveryProbe:{attempts:1.2}});
 assert.equal(r.fallback,'unknown');assert.equal(r.retryR80.state,'unknown');assert.equal(r.pendingPages,null);assert.equal(r.retryR80.attempts,null);assert.equal(r.recoveryProbe.attempts,null);
 assert.equal(JSON.stringify(r).includes('private'),false);assert.equal(JSON.stringify(r).includes('password'),false);
});

test('durability metrics expose current waiting separately from completed work',()=>{
 const core=baseCore();core.database.walSync={failed:Error('/private/path'),running:Promise.resolve(),waiting:[{}],snapshot:()=>({ready:false,syncs:2,waiters:4,meanMs:15,maxMs:25,totalMs:30,errors:1,reopened:0,fallback:'private',walPath:'private'})};
 core.writer.rewardWorkerR533={slot:{pending:{id:'private'}},stats:{jobs:3,restarts:1,maxWorkerMs:100,secret:'private'}};
 core.diagnostics.writerStallsR79={snapshot:()=>({lastCommitMs:4,maxCommitMs:9,slowCommits:0,lastSlowAtMs:null,raw:'private'})};
 const r=runtimeHealthR80(core,{nowMs:12000,processSnapshot:processSample()});
 assert.equal(r.walSync.running,true);assert.equal(r.walSync.queuedForNextFlush,1);assert.equal(r.walSync.pumpedCallsTotal,4);assert.equal(r.walSync.fallback,true);
 assert.match(r.walSync.scope,/excluding-preflush-queue/);
 assert.equal(r.rewardWorker.pending,true);assert.match(r.rewardWorker.scope,/completed/);assert.equal(r.mainCommits.lastCommitMs,4);
 assert.equal(JSON.stringify(r).includes('private'),false);
});

test('health reads do not install a writer, run SQL or start process sampling',()=>{
 const core=baseCore();core.database.sqlite=new Proxy({},{get(){throw Error('SQL was touched');}});
 assert.equal(writerLaneSnapshotR80(core.database),null);
 const r=runtimeHealthR80(core,{nowMs:12000,processSnapshot:processSample()});
 assert.equal(r.available,true);assert.equal(r.writerLane,null);assert.equal(writerLaneSnapshotR80(core.database),null);
});

test('failed optional observers cannot break the health result',()=>{
 const core=baseCore();core.database.walSync={snapshot(){throw Error('private');}};
 assert.deepEqual(runtimeHealthR80(core,{nowMs:12000,processSnapshot:processSample()}),{protocol:'runtime-diagnostics-r80-v1',available:false});
});

function writerFixture(){
 const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE writes (position INTEGER PRIMARY KEY, value TEXT NOT NULL)');
 const database={sqlite:sql,writeQueue:[],writeDrain:null,assertAvailable(){assert.equal(sql.isOpen,true);},scheduleWriteDrain(){if(this.writeDrain)return;this.writeDrain=setImmediate(()=>{this.writeDrain=null;this.drainWrites();});},drainWrites(){const batch=this.writeQueue.splice(0);for(const job of batch)try{job.resolve(job.native());}catch(e){job.reject(e);}}};
 const lane=exclusiveWriterLaneR533(database);
 const write=value=>sql.prepare('INSERT INTO writes(value) VALUES (?)').run(value);
 const native=value=>new Promise((resolve,reject)=>{database.writeQueue.push({native:()=>write(value),resolve,reject,queuedAt477:performance.now()});database.scheduleWriteDrain();});
 return {database,lane,sql,write,native,values:()=>sql.prepare('SELECT value FROM writes ORDER BY position').all().map(r=>r.value),close(){lane.close();sql.close();}};
}

test('observability preserves the single FIFO across real SQLite writes and an async barrier',async()=>{
 const f=writerFixture();let release;const gate=new Promise(r=>release=r);
 try{
  const first=f.native('first');const external=f.lane.run(async()=>{await gate;f.write('external');return 37;});const last=f.native('last');
  await first;await nextTurn();await nextTurn();
  assert.deepEqual(f.values(),['first']);
  const before=f.lane.snapshot();assert.equal(before.externalBusy,true);assert.equal(before.queuedWrites,1);assert.equal(before.completedExternal,0);assert.ok(before.externalAgeMs>=0);
  await delay(5);assert.ok(f.lane.snapshot().externalAgeMs>=before.externalAgeMs);
  release();assert.equal(await external,37);await last;await f.lane.idle();
  assert.deepEqual(f.values(),['first','external','last']);
  const after=f.lane.snapshot();assert.equal(after.externalBusy,false);assert.equal(after.externalAgeMs,null);assert.equal(after.completedExternal,1);assert.ok(after.maxExternalMs>=5);
 }finally{release?.();await f.lane.idle();f.close();}
});

test('external rejection releases the same FIFO and retains original error identity',async()=>{
 const f=writerFixture(),failure=Error('expected test failure');
 try{
  const pending=f.lane.run(()=>{throw failure;});const check=assert.rejects(pending,e=>e===failure),last=f.native('after-error');
  await check;await last;await f.lane.idle();
  assert.deepEqual(f.values(),['after-error']);assert.equal(f.lane.snapshot().completedExternal,1);assert.equal(f.lane.snapshot().externalBusy,false);
 }finally{await f.lane.idle();f.close();}
});

test('queue metrics count waiting external jobs without exposing job payloads',async()=>{
 const f=writerFixture();let release;const gate=new Promise(r=>release=r);
 try{
  const one=f.lane.run(()=>gate),two=f.lane.run(()=>1);await nextTurn();
  const r=runtimeHealthR80({database:f.database},{nowMs:12000,processSnapshot:processSample()});
  assert.equal(r.writerLane.externalBusy,true);assert.equal(r.writerLane.queuedExternal,1);
  release();await Promise.all([one,two]);await f.lane.idle();assert.equal(f.lane.snapshot().completedExternal,2);
 }finally{release?.();await f.lane.idle();f.close();}
});

test('public health does not traverse an unbounded write backlog',()=>{
 const f=writerFixture();
 try{
  f.database.writeQueue=Object.assign(Array.from({length:257},()=>({queuedAt477:performance.now()})),{reduce(){throw Error('backlog was traversed');}});
  const r=runtimeHealthR80({database:f.database},{nowMs:12000,processSnapshot:processSample()});
  assert.equal(r.available,true);assert.equal(r.writerLane.queuedWrites,257);assert.equal(r.writerLane.queuedExternal,null);
 }finally{f.database.writeQueue=[];f.close();}
});
