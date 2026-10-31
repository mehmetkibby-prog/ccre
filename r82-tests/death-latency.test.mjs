import test from 'node:test';
import assert from 'node:assert/strict';
import {createDeathLatencyR82,publicDeathLatencyR82,deathLatencyR82} from '../r82-work/core511-source/scripts/core511/death-latency-r82.mjs';
import {adminLoad511} from '../r82-work/core511-source/scripts/core511/admin-diagnostics.mjs';
import {rejectActorJob} from '../r82-work/core511-source/scripts/core511/actor-rejection.mjs';
import {joinedFixture,deferred,until} from './checkpoint-fixture.mjs';

function fixture(){let time=0;const metrics=createDeathLatencyR82({now:()=>time,wall:()=>1700000000000+time});return {metrics,set:value=>time=value};}

test('asynchronous phase time is separate from CPU and each completed hold is accounted once',()=>{
 const f=fixture(),token=f.metrics.begin();f.set(500);f.metrics.phase(token,'writer');f.set(515);f.metrics.phase(token,'refresh');f.set(550);f.metrics.finish(token,'completed');f.metrics.finish(token,'failed');
 const s=f.metrics.snapshot();assert.equal(s.active,0);assert.equal(s.completed,1);assert.equal(s.failed,0);assert.equal(s.samples,1);
 assert.deepEqual(s.last,{atMs:1700000000550,outcome:'completed',totalMs:550,checkpointMs:500,writerMs:15,refreshMs:35});assert.equal(s.totalP95Ms,550);assert.equal(s.recentSlow.length,1);
});

test('currently waiting callbacks expose counts and oldest phase age without pretending a final sample exists',()=>{
 const f=fixture(),a=f.metrics.begin();f.set(20);const b=f.metrics.begin();f.set(30);f.metrics.phase(b,'writer');f.set(80);
 const s=f.metrics.snapshot();assert.equal(s.active,2);assert.equal(s.oldestActiveMs,80);assert.deepEqual(s.phaseActive,{checkpoint:1,writer:1,refresh:0});assert.deepEqual(s.phaseOldestMs,{checkpoint:80,writer:50,refresh:null});assert.equal(s.samples,0);assert.equal(s.totalP95Ms,null);assert.equal(s.last,null);
 f.metrics.finish(a,'failed');f.metrics.finish(b,'rejected');assert.equal(f.metrics.snapshot().failed,1);assert.equal(f.metrics.snapshot().rejected,1);
});

test('invalid or backward clocks and phase order discard observations without affecting the caller',()=>{
 for(const bad of [NaN,Infinity,-1,()=>{throw Error('clock unavailable');}]){
  const metrics=createDeathLatencyR82({now:typeof bad==='function'?bad:()=>bad});assert.doesNotThrow(()=>{const t=metrics.begin();metrics.phase(t,'writer');metrics.finish(t);metrics.snapshot();});assert.equal(metrics.snapshot().dropped,1);
 }
 const f=fixture();f.set(10);const a=f.metrics.begin();f.set(9);f.metrics.phase(a,'writer');assert.equal(f.metrics.snapshot().dropped,1);
 const b=f.metrics.begin();f.metrics.phase(b,'refresh');assert.equal(f.metrics.snapshot().dropped,2);assert.equal(f.metrics.snapshot().samples,0);
});

test('active callbacks, recent observations and slow history all stay bounded',()=>{
 const f=fixture(),tokens=Array.from({length:140},()=>f.metrics.begin());assert.equal(tokens.filter(Boolean).length,128);assert.equal(f.metrics.snapshot().dropped,12);f.set(101);tokens.forEach(token=>f.metrics.finish(token,'completed'));
 for(let i=0;i<400;i++){f.set(200+i*200);const t=f.metrics.begin();f.set(350+i*200);f.metrics.finish(t,i%2?'failed':'rejected');}
 const s=f.metrics.snapshot();assert.equal(s.active,0);assert.equal(s.samples,128);assert.equal(s.recentSlow.length,16);assert.equal(s.completed,128);assert.equal(s.failed,200);assert.equal(s.rejected,200);assert.equal(s.totalMaxMs,150);
 s.recentSlow[0].totalMs=999999;s.last.totalMs=999999;assert.equal(f.metrics.snapshot().totalMaxMs,150);assert.equal(f.metrics.snapshot().last.totalMs,150);
});

test('public diagnostics whitelist scalars and bounded rows and keep missing data null',()=>{
 const f=fixture(),t=f.metrics.begin();f.set(150);f.metrics.finish(t,'completed');const value=f.metrics.snapshot();
 value.actor='SECRET-ACTOR';value.sql='SECRET-SQL';value.last.actor='SECRET-ACTOR';value.recentSlow=Array.from({length:100},()=>({...value.last,secret:'SECRET-SESSION'}));value.completed=NaN;value.phaseActive.refresh=-1;
 const p=publicDeathLatencyR82(value);assert.equal(p.recentSlow.length,16);assert.equal(p.completed,null);assert.equal(p.phaseActive.refresh,null);assert(!JSON.stringify(p).includes('SECRET'));assert.equal(publicDeathLatencyR82(null),null);assert.equal(publicDeathLatencyR82({}),null);assert.equal(publicDeathLatencyR82({...value,active:129}),null);
});

test('authenticated admin formatter emits death timing only for a fresh channel snapshot',()=>{
 const f=fixture(),t=f.metrics.begin();f.set(120);f.metrics.finish(t,'completed');const now=1700000000200;
 const metrics={players:1,deathWaitR82:{...f.metrics.snapshot(),actor:'SECRET'},process:{current:{sampledAtMs:now,loopUtilization:.1,loopExcessMs:3},memoryMb:{rss:100}}};
 const snapshot={measuredAtMs:now,targets:[{target:'channel-1',available:true,metrics}],main:{current:{sampledAtMs:now,loopUtilization:.2,loopExcessMs:5},memoryMb:{rss:200}}};
 const current=adminLoad511(snapshot,now);assert.equal(current.rows[2].kernel511.deathWaitR82.completed,1);assert(!JSON.stringify(current).includes('SECRET'));assert.equal(current.rows[0].kernel511,null);assert.equal(current.rows[3].kernel511,null);
 assert.equal(adminLoad511(snapshot,now+8000).rows[2].kernel511,null);delete metrics.deathWaitR82;assert.equal(adminLoad511(snapshot,now).rows[2].kernel511.deathWaitR82,null);
});

test('actual joined-death callback records writer and refresh waits without releasing the actor early',async()=>{
 const writer=deferred(),refresh=deferred(),before=deathLatencyR82.snapshot().completed;
 const f=joinedFixture({deathSubmit:async(command,resultFor)=>{await writer.promise;return resultFor(command);}});
 const committed=f.loop.committed;f.loop.committed=async value=>{await refresh.promise;return committed(value);};
 const {barrier}=f.start();await until(()=>f.writes.length===1);
 assert.equal(deathLatencyR82.snapshot().phaseActive.writer,1);assert.equal(f.published.length,0);assert(f.kernel.players.get('actor-1').barrier);
 writer.resolve();await until(()=>deathLatencyR82.snapshot().phaseActive.refresh===1);assert.equal(f.published.length,0);assert(f.kernel.players.get('actor-1').barrier);
 refresh.resolve();await barrier;const s=deathLatencyR82.snapshot();assert.equal(s.active,0);assert.equal(s.completed,before+1);assert.equal(s.last.outcome,'completed');assert.equal(f.published.length,1);
});

test('actual joined-death failure is counted as failure and retains the original lease fence',async()=>{
 const before=deathLatencyR82.snapshot().failed,gate=deferred();
 const f=joinedFixture({deathSubmit:async()=>gate.promise}),{barrier}=f.start();await until(()=>f.writes.length===1);gate.reject(Object.assign(Error('unknown commit'),{code:'ipc_request_timeout'}));await assert.rejects(barrier);
 assert.equal(deathLatencyR82.snapshot().failed,before+1);assert.equal(deathLatencyR82.snapshot().active,0);assert.equal(f.lease.state,'unknown');assert.equal(f.published.length,0);assert(f.kernel.players.get('actor-1').barrier);
});

test('a proven pre-execution rejection is counted separately and retains normal safe cancellation',async()=>{
 const before=deathLatencyR82.snapshot(),f=joinedFixture({deathSubmit:command=>{
  const error=Object.assign(Error('local_kill_requires_shared'),{code:'local_kill_requires_shared'});
  throw rejectActorJob(error,{channel:1,incarnation:'fixture'},{playerId:'actor-1',epoch:1,sequence:1,operationId:command.key,operation:'attack',payload:command.payload});
 }}),{barrier}=f.start();await assert.rejects(barrier,/local_kill_requires_shared/);await until(()=>f.kernel.players.get('actor-1').barrier===null);
 const after=deathLatencyR82.snapshot();assert.equal(after.rejected,before.rejected+1);assert.equal(after.failed,before.failed);assert.equal(after.active,0);assert.equal(f.lease.state,'released');assert.equal(f.published.length,0);
});
