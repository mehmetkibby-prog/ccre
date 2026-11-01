import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,turns,gate} from './freeze-fixture.mjs';
import {actorIsolations} from '../../working/core511-source/scripts/core511/actor-isolation-proof.mjs';
const base=process.env.R85_TEST_BASELINE==='1'?'../../working/core511-source/scripts/core511/':'../../working/core511-source/scripts/core511/';
const {PermanentCoordinator}=await import(base+'permanent-coordinator.mjs');
const {TransferFreezeGroup}=await import(base+'transfer-freeze-group.mjs');
const {ActorIsolation:CandidateIsolation}=await import(base+'actor-isolation.mjs');

for(const reverse of [false,true])test('same-channel stopped and exact pending proof are both retained '+reverse,async()=>{
 const s=fixture(PermanentCoordinator,{kinds:['stopped','pending','healthy'],channels:[1,1,2],Isolation:CandidateIsolation});let writes=0,result;
 const pending=s.permanent.permanentPlayers(s.ids,()=>writes++).catch(error=>result=error);
 await turns();s.release(s.ids[reverse?1:0]);await turns();s.release(s.ids[2]);s.release(s.ids[reverse?0:1]);await pending;
 assert.equal(writes,0);assert.equal(result.code,'actor_command_pending');assert.deepEqual(actorIsolations(result).map(p=>p.actor),[s.ids[0]]);
 assert.deepEqual(s.isolated,[s.ids[0]]);assert(s.isolation.unknownActors.has(s.ids[1]));assert.equal(s.permanent.entries.size,0);assert.equal(s.players.get(s.ids[2]).suspended,false);assert.deepEqual(s.faults,[]);
});

test('same-channel stopped and pending proof releases only unentered party transfer group',async()=>{
 const s=fixture(PermanentCoordinator,{kinds:['stopped','pending','healthy'],channels:[1,1,2],Isolation:CandidateIsolation}),group=new TransferFreezeGroup(s.core,s.ids[0]);let writes=0,result;
 const pending=(async()=>{try{await group.freeze();writes++;}catch(error){if(!await group.rejectFreeze(error))group.fail(error);throw error;}})().catch(error=>result=error);
 await turns();s.release(s.ids[0]);await turns();s.release(s.ids[1]);s.release(s.ids[2]);await pending;
 assert.equal(writes,0);assert.equal(result.code,'actor_command_pending');assert.deepEqual(actorIsolations(result).map(p=>p.actor),[s.ids[0]]);
 assert.deepEqual(s.isolated,[s.ids[0]]);assert(s.isolation.unknownActors.has(s.ids[1]));assert.equal(s.core.transitions.size,0);assert.equal(group.phase,'released');assert.equal(s.players.get(s.ids[2]).suspended,false);assert.deepEqual(s.faults,[]);
});

for(const reverse of [false,true])test('parent joins and preserves two channel rejections; unrelated frozen actor resumes '+reverse,async t=>{
 const s=fixture(PermanentCoordinator);let writes=0,result;
 const pending=s.permanent.permanentPlayers(s.ids,()=>{writes++;}).then(()=>assert.fail('Cold callback should reject'),error=>result=error);
 await turns();s.release(reverse?s.ids[1]:s.ids[0]);await turns();s.release(s.ids[2]);await turns();s.release(reverse?s.ids[0]:s.ids[1]);await pending;
 const evidence=s.outcome(result);t.diagnostic(JSON.stringify(evidence));
 assert.equal(writes,0);assert.deepEqual(new Set(actorIsolations(result).map(p=>p.actor)),new Set(s.ids.slice(0,2)));
 assert.deepEqual(new Set(s.isolated),new Set(s.ids.slice(0,2)));assert.equal(s.permanent.entries.size,0);assert.equal(s.players.get(s.ids[2]).suspended,false);assert.deepEqual(s.faults,[]);
});

test('one stopped actor waits for slow healthy checkpoint and keeps its existing safe outcome',async()=>{
 const s=fixture(PermanentCoordinator,{kinds:['stopped','healthy'],channels:[1,2]});let writes=0,result,settled=false;
 const pending=s.permanent.permanentPlayers(s.ids,()=>{writes++;}).catch(error=>result=error).finally(()=>settled=true);
 await turns();s.release(s.ids[0]);await turns();assert.equal(settled,false);assert.equal(s.players.get(s.ids[1]).suspended,true);
 s.release(s.ids[1]);await pending;assert.equal(writes,0);assert.equal(actorIsolations(result).length,1);assert.equal(s.permanent.entries.size,0);assert.equal(s.players.get(s.ids[1]).suspended,false);assert.deepEqual(s.faults,[]);
});

test('same-channel group retains every existing stopped proof and resumes other channel',async()=>{
 const s=fixture(PermanentCoordinator,{channels:[1,1,2]});let writes=0,result;
 const pending=s.permanent.permanentPlayers(s.ids,()=>{writes++;}).catch(error=>result=error);
 await turns();s.release(s.ids[0]);await turns();s.release(s.ids[1]);s.release(s.ids[2]);await pending;
 assert.equal(writes,0);assert.equal(actorIsolations(result).length,2);assert.equal(s.permanent.entries.size,0);assert.equal(s.players.get(s.ids[2]).suspended,false);assert.deepEqual(s.faults,[]);
});

test('an unproven sibling cannot be concealed by a known stopped-actor result',async()=>{
 const s=fixture(PermanentCoordinator,{kinds:['stopped','unknown','healthy'],channels:[1,2,3]});let writes=0,result;
 const pending=s.permanent.permanentPlayers(s.ids,()=>{writes++;}).catch(error=>result=error);
 await turns();s.release(s.ids[0]);await turns();s.release(s.ids[1]);await turns();s.release(s.ids[2]);await pending;
 assert.equal(writes,0);assert.equal(result.code,'ipc_control_outcome_unknown');assert.equal(actorIsolations(result).length,0);assert.equal(s.permanent.entries.size,3);assert([...s.permanent.entries.values()].every(row=>row.phase==='unknown'));assert(s.ids.every(id=>s.players.get(id).suspended));assert(!s.events.some(event=>event.startsWith('resumed:')));
});

test('successful multi-channel native operation executes once and waits for durability',async()=>{
 const s=fixture(PermanentCoordinator,{kinds:['healthy','healthy'],channels:[1,2]}),durable=gate();let writes=0,entered=false,settled=false;
 s.permanent.durable=async()=>{entered=true;await durable.promise;};
 const pending=s.permanent.permanentPlayers(s.ids,()=>{writes++;return 42;}).finally(()=>settled=true);
 await turns();s.release(s.ids[0]);s.release(s.ids[1]);await turns(80);assert.equal(entered,true);assert.equal(writes,1);assert.equal(settled,false);assert(s.ids.every(id=>s.players.get(id).suspended));
 durable.resolve();assert.equal(await pending,42);assert.equal(writes,1);assert.equal(s.permanent.entries.size,0);assert(s.ids.every(id=>!s.players.get(id).suspended));assert.deepEqual(s.faults,[]);
});

test('party transfer aggregates cross-channel stopped proofs before releasing transition group',async t=>{
 const s=fixture(PermanentCoordinator),group=new TransferFreezeGroup(s.core,s.ids[0]);let writes=0,result;
 const pending=(async()=>{try{await group.freeze();writes++;}catch(error){if(!await group.rejectFreeze(error))group.fail(error);throw error;}})().catch(error=>result=error);
 await turns();s.release(s.ids[0]);await turns();s.release(s.ids[2]);await turns();s.release(s.ids[1]);await pending;
 t.diagnostic(JSON.stringify({...s.outcome(result),groupPhase:group.phase,groups:s.core.transferGroups.size}));
 assert.equal(writes,0);assert.equal(actorIsolations(result).length,2);assert.equal(group.phase,'released');assert.equal(s.core.transferGroups.size,0);assert.equal(s.core.transitions.size,0);assert.equal(s.players.get(s.ids[2]).suspended,false);assert.deepEqual(s.faults,[]);
});

test('failed transfer abort publishes unknown state and rejects its hold promise',async t=>{
 const s=fixture(PermanentCoordinator,{kinds:['stopped','healthy'],channels:[1,2]}),group=new TransferFreezeGroup(s.core,s.ids[0]);let result,doneResult;
 const failure=Object.assign(Error('read_worker_unavailable'),{code:'read_worker_unavailable'});
 s.controls.get(2).control.readBundle=async()=>{throw failure;};
 const done=group.done.catch(error=>doneResult=error);
 const pending=(async()=>{try{await group.freeze();assert.fail('No native write may begin');}catch(error){if(!await group.rejectFreeze(error))group.fail(error);throw error;}})().catch(error=>result=error);
 await turns();s.release(s.ids[0]);s.release(s.ids[1]);await pending;await turns();
 t.diagnostic(JSON.stringify({...s.outcome(result),groupPhase:group.phase,groups:s.core.transferGroups.size,holdRejected:doneResult===failure}));
 assert.equal(result,failure);assert.equal(group.phase,'unknown');assert.equal(s.core.transferGroups.size,0);assert.equal(doneResult,failure);await done;
 assert.equal(s.core.transitions.size,2);assert([...s.core.transitions.values()].every(row=>row.phase==='unknown'));assert(s.ids.every(id=>s.players.get(id).suspended));assert.equal(s.faults.filter(row=>row.where==='coordinator').length,2);assert(!s.events.some(event=>event.startsWith('resumed:')));
});

for(const reverse of [false,true])test('stopped and exact pending actors coexist without freezing a healthy sibling '+reverse,async t=>{
 const s=fixture(PermanentCoordinator,{kinds:['stopped','pending','healthy'],channels:[1,2,3],Isolation:CandidateIsolation});let writes=0,result;
 const pending=s.permanent.permanentPlayers(s.ids,()=>{writes++;}).catch(error=>result=error);
 await turns();s.release(reverse?s.ids[1]:s.ids[0]);await turns();s.release(s.ids[2]);s.release(reverse?s.ids[0]:s.ids[1]);await pending;
 t.diagnostic(JSON.stringify(s.outcome(result)));
 assert.equal(writes,0);assert.equal(result.code,'actor_command_pending');assert.deepEqual(s.isolated,[s.ids[0]]);assert(s.isolation.unknownActors.has(s.ids[1]));assert(s.players.get(s.ids[1]).suspended);assert.equal(s.permanent.entries.size,0);assert.equal(s.players.get(s.ids[2]).suspended,false);assert.deepEqual(s.faults,[]);
});

test('unproven failure escalates while a sibling stays hung and late ACK cannot rewrite unknown parent entry',async()=>{
 const s=fixture(PermanentCoordinator,{kinds:['unknown','healthy'],channels:[1,2]});let settled=false,result;
 const pending=s.permanent.permanentPlayers(s.ids,()=>assert.fail('No native operation')).catch(error=>result=error).finally(()=>settled=true);
 await turns();s.release(s.ids[0]);await turns(80);
 const early={settled,coordinatorFaults:s.faults.filter(row=>row.where==='coordinator').length};
 const late=s.permanent.entries.get(s.ids[1]);
 s.release(s.ids[1]);await pending;await turns(80);
 assert.deepEqual(early,{settled:true,coordinatorFaults:2});assert.equal(result.code,'ipc_control_outcome_unknown');assert(s.ids.every(id=>s.players.get(id).suspended));assert([...s.permanent.entries.values()].every(row=>row.phase==='unknown'));
 assert.equal(late.needsFreeze,true);assert.equal(late.finalSequence,undefined);
});

test('untracked actor_command_pending escalates without waiting for a hung sibling',async()=>{
 const s=fixture(PermanentCoordinator,{kinds:['pending','healthy'],channels:[1,2],Isolation:CandidateIsolation});let settled=false,result,writes=0;
 // A matching error string is insufficient; no authoritative unknown command
 // was recorded in the parent. The resident still reports its local failure.
 s.isolation.unknownActors.set=()=>s.isolation.unknownActors;
 const pending=s.permanent.permanentPlayers(s.ids,()=>writes++).catch(error=>result=error).finally(()=>settled=true);
 await turns();s.release(s.ids[0]);await turns(80);
 const early={settled,faults:s.faults.filter(row=>row.where==='coordinator').length};
 s.release(s.ids[1]);await pending;await turns(80);
 assert.deepEqual(early,{settled:true,faults:2});assert.equal(result.code,'actor_command_pending');assert.equal(writes,0);assert.equal(s.isolated.length,0);assert(s.ids.every(id=>s.players.get(id).suspended));assert([...s.permanent.entries.values()].every(row=>row.phase==='unknown'));
});

test('a lost durability result never resumes actors or reruns the native callback',async()=>{
 const s=fixture(PermanentCoordinator,{kinds:['healthy','healthy'],channels:[1,2]});let writes=0,result;
 const durabilityFailure=Object.assign(Error('wal_sync_result_lost'),{code:'wal_sync_result_lost'});
 s.permanent.durable=async()=>{throw durabilityFailure;};
 const pending=s.permanent.permanentPlayers(s.ids,()=>writes++).catch(error=>result=error);
 await turns();s.release(s.ids[0]);s.release(s.ids[1]);await pending;
 assert.equal(result,durabilityFailure);assert.equal(writes,1);assert(s.ids.every(id=>s.players.get(id).suspended));assert([...s.permanent.entries.values()].every(row=>row.phase==='unknown'));assert(!s.events.some(e=>e.startsWith('resumed:')));
 await assert.rejects(s.permanent.permanentPlayers(s.ids,()=>writes++),{code:'permanent_actor_fenced'});assert.equal(writes,1);
});

test('late transfer freeze ACK cannot alter group that already escalated unknown',async()=>{
 const s=fixture(PermanentCoordinator,{kinds:['unknown','healthy'],channels:[1,2]}),group=new TransferFreezeGroup(s.core,s.ids[0]);let result,settled=false,writes=0;
 const pending=(async()=>{try{await group.freeze();writes++;}catch(error){if(!await group.rejectFreeze(error))group.fail(error);throw error;}})().catch(error=>result=error).finally(()=>settled=true);
 await turns();s.release(s.ids[0]);await turns(80);
 const early={settled,phase:group.phase,faults:s.faults.filter(r=>r.where==='coordinator').length},late=group.entries.get(s.ids[1]);
 s.release(s.ids[1]);await pending;await turns(80);
 assert.deepEqual(early,{settled:true,phase:'unknown',faults:2});assert.equal(result.code,'ipc_control_outcome_unknown');assert.equal(writes,0);assert.equal(late.needsFreeze,true);assert.equal(late.ack,undefined);assert.equal(group.phase,'unknown');assert(s.ids.every(id=>s.players.get(id).suspended));
});

test('late freeze ACK for an old parent entry cannot attach to a replacement',async()=>{
 const s=fixture(PermanentCoordinator,{kinds:['unknown','healthy'],channels:[1,2]});let result;
 const pending=s.permanent.permanentPlayers(s.ids,()=>assert.fail('unproven freeze cannot write')).catch(error=>result=error);
 await turns();s.release(s.ids[0]);await turns(80);const old=s.permanent.entries.get(s.ids[1]);
 const replacement={id:old.id,owner:{...old.owner,epoch:2},phase:'freezing',token:'replacement-token',needsFreeze:true};
 s.permanent.entries.set(old.id,replacement);s.release(s.ids[1]);await pending;await turns(80);
 assert.equal(result.code,'ipc_control_outcome_unknown');assert.equal(old.finalSequence,undefined);assert.equal(s.permanent.entries.get(old.id),replacement);assert.equal(replacement.finalSequence,undefined);assert.equal(replacement.phase,'freezing');
});
