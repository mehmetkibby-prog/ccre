import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture,gate,turn,until,source,hash,writeDrafts,load} from './server-heartbeat-fixture.mjs';

const proof=writeDrafts();
fs.writeFileSync(new URL('../r83-investigation/server/heartbeat-tail-source-proof.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');

for(const shared of [false,true])test(`R82 reproduction: ${shared?'shared':'local'} heartbeat retains actor barrier after COMMIT/refresh/lease release solely for background enqueue`,async()=>{
 const f=await fixture({shared});await f.start();await until(()=>f.scheduleRequests.length===1);
 assert.deepEqual(f.events.filter(s=>['native-ack','refresh-end','schedule-start'].includes(s)),['native-ack','refresh-end','schedule-start']);
 assert.equal(f.c.lanes.busy(['player:a']),false);assert(f.actor.barrier);assert.equal(f.actor.lastApplied,0);
 await f.tick();assert(!f.events.includes('move'));
 f.scheduleGate.resolve();await until(()=>f.actor.barrier===null);await f.tick();
 assert.equal(f.actor.lastApplied,2);assert.equal(f.events.filter(e=>e==='move').length,1);assert.equal(f.c.kernel.failure,null);
});

for(const shared of [false,true])test(`candidate: ${shared?'shared':'local'} heartbeat ACK releases movement while only background descriptor remains pending`,async()=>{
 const f=await fixture({fixed:true,shared});await f.start();await until(()=>f.scheduleRequests.length===1&&f.actor.barrier===null);
 assert(!f.events.includes('schedule-end'));assert.equal(f.c.lanes.busy(['player:a']),false);assert.equal(f.state.owners.get('a').pending,0);assert.equal(f.loop.pending.size,1);
 await f.tick();assert.equal(f.actor.lastApplied,2);assert.equal(f.events.filter(e=>e==='move').length,1);
 const heartbeat=f.sent.flatMap(p=>p.results).find(r=>r.sequence===1);assert.equal(heartbeat.status,200);
 let drained=false;const drain=f.loop.drain().then(()=>{drained=true;});await turn();assert.equal(drained,false);
 f.scheduleGate.resolve();await drain;assert.equal(f.loop.pending.size,0);assert.equal(f.c.kernel.failure,null);
});

for(const shared of [false,true])test(`candidate: ${shared?'shared':'local'} writer ACK and authoritative refresh remain mandatory movement barriers`,async()=>{
 const writerGate=gate(),refreshGate=gate(),f=await fixture({fixed:true,shared,writerGate,refreshGate});await f.start();await until(()=>f.nativeRequests.length===1);
 assert(f.actor.barrier);assert.equal(f.c.lanes.busy(['player:a']),true);assert.equal(f.scheduleRequests.length,0);await f.tick();assert(!f.events.includes('move'));
 writerGate.resolve();await until(()=>f.events.includes('refresh-start'));
 assert(f.actor.barrier);assert.equal(f.c.lanes.busy(['player:a']),true);assert.equal(f.scheduleRequests.length,0);await f.tick();assert(!f.events.includes('move'));
 refreshGate.resolve();await until(()=>f.actor.barrier===null);await f.tick();assert.equal(f.actor.lastApplied,2);
 f.scheduleGate.resolve();await f.loop.drain();
});

for(const shared of [false,true])test(`candidate: ${shared?'shared':'local'} unknown native writer failure still fences actor and resource lane`,async()=>{
 const writerGate=gate(),f=await fixture({fixed:true,shared,writerGate});const {barrier}=await f.start();barrier.catch(()=>{});await until(()=>f.nativeRequests.length===1);
 const error=Object.assign(Error('controlled unknown writer outcome'),{code:'controlled_unknown_writer'});writerGate.reject(error);
 await until(()=>f.c.kernel.failure===error);assert(f.actor.barrier);assert.equal(f.c.lanes.busy(['player:a']),true);assert.equal(f.c.lanes.held.get('player:a').state,'unknown');assert(!f.events.includes('move'));assert.equal(f.scheduleRequests.length,0);
});

test('candidate: shared heartbeat whose re-plan is nonterminal also stops waiting on maintenance descriptor',async()=>{
 for(const fixed of [false,true]){
  const f=await fixture({fixed,shared:true,sharedDurable:false});await f.start();await until(()=>f.scheduleRequests.length===1);
  assert.equal(f.nativeRequests.length,0);assert.equal(f.c.lanes.busy(['player:a']),false);
  await turn();assert.equal(f.actor.barrier===null,fixed);
  await f.tick();assert.equal(f.events.includes('move'),fixed);
  f.scheduleGate.resolve();await until(()=>f.actor.barrier===null);await f.tick();assert.equal(f.actor.lastApplied,2);
 }
});

test('candidate: ordinary nonterminal heartbeat behavior remains memory-only and already asynchronous',async()=>{
 for(const fixed of [false,true]){
  const f=await fixture({fixed});f.setGearDue(false);await f.start();await until(()=>f.scheduleRequests.length===1);
  assert.equal(f.nativeRequests.length,0);assert.equal(f.actor.barrier,null);assert.equal(f.actor.lastApplied,2);assert.equal(f.loop.pending.size,1);
  assert.equal(f.events.filter(e=>e==='move').length,1);f.scheduleGate.resolve();await f.loop.drain();
 }
});

for(const code of ['heartbeat_schedule_fenced','heartbeat_schedule_capacity','heartbeat_world_required','ipc_backpressure'])test(`candidate: expected descriptor rejection ${code} remains retryable and not a gameplay failure`,async()=>{
 const f=await fixture({fixed:true,scheduleError:Object.assign(Error(code),{code})});await f.start();await until(()=>f.actor.barrier===null&&f.scheduleRequests.length===1);
 f.scheduleGate.resolve();await f.loop.drain();await f.tick();assert.equal(f.c.kernel.failure,null);assert.equal(f.fatals.length,0);assert.equal(f.actor.lastApplied,2);assert.equal(f.loop.pending.size,0);
});

for(const shared of [false,true])test(`candidate: ${shared?'shared':'local'} unexpected schedule exception still reports onFatal and rejects background drain`,async()=>{
 const error=Object.assign(Error('controlled scheduling failure'),{code:'controlled_schedule_failure'}),f=await fixture({fixed:true,shared,scheduleError:error});await f.start();await until(()=>f.scheduleRequests.length===1&&f.actor.barrier===null);
 const draining=f.loop.drain();f.scheduleGate.resolve();await assert.rejects(draining,e=>e===error);await turn();assert(f.fatals.includes(error));assert.equal(f.c.kernel.failure,error);assert.equal(f.loop.pending.size,0);
});

for(const shared of [false,true])test(`candidate: ${shared?'shared':'local'} quiesce can finish after gameplay but lifecycle drain still waits before owner detach`,async()=>{
 const f=await fixture({fixed:true,shared});await f.start();await until(()=>f.actor.barrier===null&&f.scheduleRequests.length===1);await f.tick();
 let detached=false,quiesced=false;
 const drain=(async()=>{
  await f.c.kernel.quiesce('a',1);quiesced=true;
  await f.loop.drain();
  f.state.freeze('a',1);f.c.kernel.detach('a',1);f.c.owners.delete('a');detached=true;
 })();
 await until(()=>quiesced);assert.equal(detached,false);assert.equal(f.actor.accepting,false);assert.equal(f.actor.suspended,true);assert.equal(f.state.owners.get('a').state,'quiesced');assert.equal(f.loop.pending.size,1);
 f.scheduleGate.resolve();await drain;assert.equal(detached,true);assert.equal(f.loop.pending.size,0);assert.equal(f.c.kernel.players.has('a'),false);assert.equal(f.state.owners.has('a'),false);
});

test('candidate: immutable descriptor captures original actor epoch and heartbeat row before caller can detach or replace state',async()=>{
 const f=await fixture({fixed:true});await f.start();await until(()=>f.scheduleRequests.length===1&&f.actor.barrier===null);
 const request=structuredClone(f.scheduleRequests[0]);f.c.owners.set('a',{epoch:2,channel:1});f.state.patch('players','a',{hp:75,hp_revision:2});
 assert.deepEqual(f.scheduleRequests[0],request);assert.equal(request.epoch,1);assert.equal(request.heartbeat.hp,100);assert.equal(request.counter,1);
 f.scheduleGate.resolve();await f.loop.drain();assert.equal(f.loop.pending.size,0);
});

test('candidate: later heartbeat can proceed with separate captured counter while first schedule is pending',async()=>{
 const f=await fixture({fixed:true});await f.start();await until(()=>f.actor.barrier===null&&f.scheduleRequests.length===1);await f.tick();
 f.enqueue('heartbeat');f.enqueue('move');await f.tick();await until(()=>f.scheduleRequests.length===2);
 assert.deepEqual(f.scheduleRequests.map(r=>r.counter),[1,2]);assert.equal(f.actor.lastApplied,4);assert.equal(f.loop.pending.size,2);assert.equal(f.nativeRequests.length,1);
 f.scheduleGate.resolve();await f.loop.drain();assert.equal(f.loop.pending.size,0);
});

test('source-exact descriptor selector keeps newest counter and rejects retired epoch',()=>{
 const text=source('heartbeat-jobs.mjs');const method=text.slice(text.indexOf(' schedule(peer,payload){'),text.indexOf('\n async due('));assert(method.startsWith(' schedule(peer,payload){'));
 const make=Function('demand',`return {${method}}`);
 const owner={admitted:true,channel:1,incarnation:'fixture',epoch:1},receiver=make((ok,code)=>{if(!ok)throw Object.assign(Error(code),{code});});receiver.core={writer:{owners:new Map([['a',owner]])},clock:()=>100000};receiver.pending=new Map();
 const peer={channel:1,incarnation:'fixture'},row={actor:'a',epoch:1,counter:2,nowMs:100000,cycle:1,heartbeat:{channel:1,area:'forest',arena_match_id:'',hp:100}};
 assert.deepEqual(receiver.schedule(peer,row),{queued:true});assert.deepEqual(receiver.schedule(peer,{...row,counter:1}),{queued:false});assert.equal(receiver.pending.get('a').counter,2);
 owner.epoch=2;assert.throws(()=>receiver.schedule(peer,row),{code:'heartbeat_schedule_fenced'});
});

test('patch is exactly two scheduling-tail substitutions, preserving full source and helper hashes',()=>{
 for(const entry of proof.files){const after=fs.readFileSync(new URL('../r83-investigation/server/'+entry.path,import.meta.url),'utf8');assert.equal(hash(after),entry.afterSha256);assert.equal(after.replace(entry.replacement,entry.old),source(entry.path));}
 assert.equal(proof.files.length,2);
});
