import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatCheckpoints as R81CombatCheckpoints} from '../r81-work/core511-source/scripts/core511/combat-checkpoint.mjs';
import {rejectActorJob} from '../r82-work/core511-source/scripts/core511/actor-rejection.mjs';
import {CombatCheckpoints,turn,deferred,until,monster,participant,combatEvent,ack,gatedJournal,joinedFixture,assertReleased,assertFenced} from './checkpoint-fixture.mjs';

for(const [name,dirty,targets,wait]of [
 ['same target',['dying'],['dying'],true],
 ['disjoint target',['other'],['dying'],false],
 ['mixed snapshot overlap',['dying','other'],['dying'],true],
 ['mixed death overlap',['other'],['dying','other'],true]
])test('reservation '+name+' preserves the required checkpoint dependency',async()=>{
 const f=gatedJournal();for(const id of dirty)f.dirty(id);const pending=f.journal.flush(),token=f.journal.reserveR54(targets);
 assert.equal(token.pending,wait?pending:null);assert.deepEqual([...f.journal.reservedR53],targets);
 if(!wait){const captured=f.journal.captureR53(targets,{reservationR54:token});f.journal.finishR53(captured);}
 else{assert.throws(()=>f.journal.captureR53(targets,{reservationR54:token}),/combat_join_pending/);}
 f.gate.resolve();await pending;
 if(wait){const captured=f.journal.captureR53(targets,{reservationR54:token});f.journal.finishR53(captured);}
 assert.equal(f.journal.reservedR53.size,0);
});

for(const scope of [undefined,null,[],{}])test('unknown checkpoint scope '+String(scope)+' waits and cannot capture early',async()=>{
 const f=gatedJournal();f.dirty('other');const pending=f.journal.flush();f.journal.pendingTargetsR54=scope;
 const token=f.journal.reserveR54(['dying']);assert.equal(token.pending,pending);
 assert.throws(()=>f.journal.captureR53(['dying'],{reservationR54:token}),/combat_join_pending/);
 f.gate.resolve();await pending;const captured=f.journal.captureR53(['dying'],{reservationR54:token});f.journal.finishR53(captured);
});

test('participant-only and event-only pending snapshots fence their real target',async()=>{
 for(const changes of [{participants:[participant('dying')]},{combatEvents:[combatEvent('dying')]}]){
  const f=gatedJournal();f.journal.changed(changes);const pending=f.journal.flush(),token=f.journal.reserveR54(['dying']);
  assert.equal(token.pending,pending);assert(f.journal.pendingTargetsR54.has('dying'));f.gate.resolve();await pending;f.journal.cancelReservationR54(token);
 }
});

test('reservation validation, cancellation and capture cancellation preserve future flush eligibility',async()=>{
 const f=gatedJournal();f.dirty('dying');const token=f.journal.reserveR54(['dying']);
 assert.equal(token.pending,null);assert.throws(()=>f.journal.reserveR54(['dying']),/combat_join_pending/);
 assert.throws(()=>f.journal.reserveR54(['other','other']),/combat_join_pending/);
 assert.deepEqual(await f.journal.flush(),{unchanged:true});f.journal.cancelReservationR54(token);
 const token2=f.journal.reserveR54(['dying']),capture=f.journal.captureR53(['dying'],{reservationR54:token2});
 assert.throws(()=>f.journal.cancelReservationR54(token2),/combat_join_changed/);f.journal.finishR53(capture);
 const pending=f.journal.flush();await until(()=>f.commands.length===1);assert.equal(f.commands[0].payload.monsters[0].current.id,'dying');f.gate.resolve();await pending;
});

test('future flush excludes all reserved target rows and cannot overwrite its committed death',async()=>{
 const f=gatedJournal();for(const id of ['dying','other'])f.dirty(id);
 f.journal.changed({participants:['dying','other'].map(id=>participant(id)),combatEvents:['dying','other'].map(id=>combatEvent(id))});
 const token=f.journal.reserveR54(['dying']),pending=f.journal.flush();await until(()=>f.commands.length===1);
 const payload=f.commands[0].payload;
 assert.deepEqual(payload.monsters.map(r=>r.current.id),['other']);assert.deepEqual(payload.participants.map(r=>r.current.monster_id),['other']);assert.deepEqual(payload.combatEvents.map(r=>r.target_id),['other']);
 const capture=f.journal.captureR53(['dying'],{reservationR54:token});assert.deepEqual(capture.payload.monsters.map(r=>r.current.id),['dying']);
 f.journal.finishR53(capture,{committed:true,result:{monsters:[monster('dying',0)],participants:[],bossParticipants:[]}});
 f.dirty('other',70);f.journal.changed({combatEvents:[combatEvent('other',2)]});f.gate.resolve();await pending;
 assert.equal(f.journal.current.get('monsters').get('["dying"]').hp,0);assert.equal(f.journal.base.get('monsters').get('["dying"]').hp,0);
 assert.deepEqual(f.journal.snapshot().monsters.map(r=>[r.current.id,r.base.hp,r.current.hp]),[['other',80,70]]);
 assert.deepEqual(f.journal.snapshot().combatEvents.map(r=>r.created_at),[2]);
});

for(const [label,Journal,blocked]of [['R81 regression control',R81CombatCheckpoints,true],['R82 disjoint fix',CombatCheckpoints,false]])test(label+' uses actual joined death and FixedLoop barrier',async()=>{
 const f=joinedFixture({Journal}),gate=deferred();f.journal.submit=async e=>{await gate.promise;return ack(e);};f.journal.changed({monsters:[monster('other',80)]});
 const checkpoint=f.journal.flush(),{barrier}=f.start();await turn();
 assert.equal(f.writes.length,blocked?0:1);
 if(blocked){assert(f.kernel.players.get('actor-1').barrier);assert.equal(f.published.length,0);}else{await barrier;await turn();assertReleased(f);assert.equal(f.published.length,1);assert(f.journal.pending);}
 gate.resolve();await checkpoint;await barrier;await turn();assertReleased(f);assert.equal(f.writes.length,1);assert.equal(f.published.length,1);
});

test('same-target checkpoint retains the whole party barrier until its ACK',async()=>{
 const f=joinedFixture({actors:['actor-1','party-2']}),gate=deferred();f.journal.submit=async e=>{await gate.promise;return ack(e);};f.journal.changed({monsters:[monster('dying',80)]});
 const checkpoint=f.journal.flush(),{barrier}=f.start();await turn();assert.equal(f.writes.length,0);
 for(const p of f.kernel.players.values())assert.equal(p.barrier,barrier);assert.equal(f.published.length,0);
 gate.resolve();await checkpoint;await barrier;await turn();assertReleased(f);assert.equal(f.writes.length,1);
});

test('same-target ACK rebases joined capture while retaining newer in-memory damage and contributions',async()=>{
 const f=gatedJournal();f.dirty('dying',80);f.journal.changed({participants:[participant('dying')],combatEvents:[combatEvent('dying')]});
 const pending=f.journal.flush(),token=f.journal.reserveR54(['dying']);f.dirty('dying',60);
 f.journal.changed({participants:[{...participant('dying'),stone_damage476:5}],combatEvents:[combatEvent('dying',2)]});
 f.gate.resolve();await pending;const captured=f.journal.captureR53(['dying'],{reservationR54:token});
 assert.equal(captured.payload.monsters[0].base.hp,80);assert.equal(captured.payload.monsters[0].current.hp,60);
 assert.equal(captured.payload.participants[0].base.stone_damage476,0);assert.equal(captured.payload.participants[0].current.stone_damage476,5);
 assert.deepEqual(captured.payload.combatEvents.map(r=>r.created_at),[2]);f.journal.finishR53(captured);
});

test('party actor checkpoints still ACK, while a new unrelated flush during that wait cannot extend it',async()=>{
 const actorGates=new Map([['actor-1',deferred()],['party-2',deferred()]]);
 const f=joinedFixture({actors:[...actorGates.keys()],checkpointSubmit:async e=>{await actorGates.get(e.actor).promise;return {key:e.key,result:{saved:e.payload.current}};}});
 const actorPending=[...actorGates.keys()].map(id=>{f.state.patch('players',id,{x:1,position_revision:2});return f.checkpoints.flush(id);});
 f.journal.changed({monsters:[monster('dying',80),monster('other',80)]});const {barrier}=f.start();
 const gate=deferred(),snapshots=[];f.journal.submit=async e=>{snapshots.push(e.payload);await gate.promise;return ack(e);};const pending=f.journal.flush();await turn();
 assert.equal(f.writes.length,0);assert.deepEqual(snapshots[0].monsters.map(r=>r.current.id),['other']);
 actorGates.get('actor-1').resolve();await actorPending[0];await turn();assert.equal(f.writes.length,0);
 actorGates.get('party-2').resolve();await actorPending[1];await barrier;await turn();assertReleased(f);assert(f.journal.pending);assert.equal(f.writes.length,1);
 gate.resolve();await pending;
});

test('death ACK alone releases success; neither submission nor unrelated ACK publishes a speculative death',async()=>{
 const death=deferred(),other=deferred(),f=joinedFixture({deathSubmit:async(e,result)=>{await death.promise;return result(e);}});
 f.journal.submit=async e=>{await other.promise;return ack(e);};f.journal.changed({monsters:[monster('other',80)]});const pending=f.journal.flush(),{barrier}=f.start();await turn();
 assert.equal(f.writes.length,1);assert.equal(f.published.length,0);assert.equal(f.lease.state,'held');
 other.resolve();await pending;await turn();assert.equal(f.published.length,0);assert(f.kernel.players.get('actor-1').barrier);
 death.resolve();await barrier;await turn();assertReleased(f);assert.equal(f.published.length,1);
});

test('unrelated checkpoint failure during actor await forbids a death request and retains unknown fences',async()=>{
 const actor=deferred(),other=deferred(),f=joinedFixture({checkpointSubmit:async e=>{await actor.promise;return {key:e.key,result:{saved:e.payload.current}};}});
 f.state.patch('players','actor-1',{x:1});const own=f.checkpoints.flush('actor-1');
 f.journal.submit=async e=>{await other.promise;return ack(e);};f.journal.changed({monsters:[monster('other',80)]});const pending=f.journal.flush();pending.catch(()=>{});
 const {barrier}=f.start(),error=Error('unrelated-durable-failed');other.reject(error);await assert.rejects(pending,e=>e===error);
 actor.resolve();await own;await assert.rejects(barrier,/combat_checkpoint_fenced/);await turn();
 assert.equal(f.writes.length,0);assertFenced(f);assert.deepEqual(f.journalFatals,[error]);assert.equal(f.fatals.length,1);
});

test('unrelated checkpoint failure after death submit but before its ACK prevents publication and reservation retirement',async()=>{
 const death=deferred(),other=deferred(),f=joinedFixture({deathSubmit:async(e,result)=>{await death.promise;return result(e);}});
 f.journal.submit=async e=>{await other.promise;return ack(e);};f.journal.changed({monsters:[monster('other',80)]});const pending=f.journal.flush();pending.catch(()=>{});
 const {barrier}=f.start();await until(()=>f.writes.length===1);const error=Error('unknown-checkpoint-commit');other.reject(error);await assert.rejects(pending,e=>e===error);
 death.resolve();await assert.rejects(barrier,/combat_checkpoint_fenced/);await turn();assertFenced(f);
 assert.equal(f.journal.base.get('monsters').get('["dying"]').hp,100);assert.deepEqual(f.journalFatals,[error]);
});

test('failure after an independently durable death still calls onFatal once and fences future journal work',async()=>{
 const other=deferred(),f=joinedFixture();f.journal.submit=async e=>{await other.promise;return ack(e);};f.journal.changed({monsters:[monster('other',80)]});const pending=f.journal.flush();pending.catch(()=>{});
 const {barrier}=f.start();await barrier;await turn();assertReleased(f);assert.equal(f.published.length,1);
 const error=Error('later-unrelated-failure');other.reject(error);await assert.rejects(pending,e=>e===error);assert.equal(f.kernel.failure,error);assert.deepEqual(f.journalFatals,[error]);
 assert.throws(()=>f.journal.reserveR54(['other']),/combat_checkpoint_fenced/);assert.throws(()=>f.journal.flush(),/combat_checkpoint_fenced/);assert.equal(f.published.length,1);
});

test('same-target failure propagates its original error without a new death request',async()=>{
 const gate=deferred(),f=joinedFixture();f.journal.submit=async()=>gate.promise;f.journal.changed({monsters:[monster('dying',80)]});const pending=f.journal.flush();pending.catch(()=>{});const {barrier}=f.start();
 const error=Error('same-target-failed');gate.reject(error);await assert.rejects(pending,e=>e===error);await assert.rejects(barrier,e=>e===error);await turn();assert.equal(f.writes.length,0);assertFenced(f);
});

test('onFatal callback throwing cannot erase the original journal failure fence',async()=>{
 const original=Error('checkpoint-failure'),callback=Error('fatal-callback-failure');let calls=0;
 const f=gatedJournal({onFatal:()=>{calls++;throw callback;}});f.dirty('other');const pending=f.journal.flush();f.gate.reject(original);await assert.rejects(pending,e=>e===callback);
 assert.equal(f.journal.failure,original);assert.equal(calls,1);assert.throws(()=>f.journal.reserveR54(['dying']),/combat_checkpoint_fenced/);
});

test('proven pre-execution actor rejection cancels a disjoint reservation without publishing rewards',async()=>{
 const f=joinedFixture({deathSubmit:e=>{const error=Object.assign(Error('local_kill_requires_shared'),{code:'local_kill_requires_shared'});throw rejectActorJob(error,{channel:1,incarnation:'fixture'},{playerId:'actor-1',epoch:1,sequence:1,operationId:e.key,operation:'attack',payload:e.payload});}});
 const {barrier}=f.start();await assert.rejects(barrier,/local_kill_requires_shared/);await turn();assertReleased(f);assert.equal(f.published.length,0);assert.equal(f.memoryCommits.length,0);
 assert.equal(f.checkpoints.entries.get('actor-1').joinedR53,null);
});

test('unknown death write rejection retains leases and reservations instead of retrying or duplicating rewards',async()=>{
 const f=joinedFixture({deathSubmit:async()=>{throw Error('death-ACK-lost');}}),{barrier}=f.start();await assert.rejects(barrier,/death-ACK-lost/);await turn();assertFenced(f);assert.equal(f.writes.length,1);
 assert.equal(f.lanes.acquire(['monster:dying'],'second-death'),null);assert.throws(()=>f.journal.reserveR54(['dying']),/combat_join_pending/);
});
