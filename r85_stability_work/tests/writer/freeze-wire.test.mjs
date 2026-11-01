import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,turns} from './freeze-fixture.mjs';
import {actorIsolations,receiveActorIsolation} from '../../working/core511-source/scripts/core511/actor-isolation-proof.mjs';
const base=process.env.R85_TEST_BASELINE==='1'?'../../working/core511-source/scripts/core511/':'../../working/core511-source/scripts/core511/';
const {PermanentCoordinator}=await import(base+'permanent-coordinator.mjs');
const {TransferFreezeGroup}=await import(base+'transfer-freeze-group.mjs');
const {ActorIsolation}=await import(base+'actor-isolation.mjs');

for(const channels of [[1,2,3],[1,1,2]])test('JSON transport preserves mixed stopped and exact pending proof '+channels,async()=>{
 const s=fixture(PermanentCoordinator,{kinds:['stopped','pending','healthy'],channels,Isolation:ActorIsolation,wire:true});let writes=0,error;
 const pending=s.permanent.permanentPlayers(s.ids,()=>writes++).catch(e=>error=e);
 await turns(80);s.release(s.ids[0]);await turns(80);s.release(s.ids[1]);s.release(s.ids[2]);await pending;
 assert.equal(writes,0);assert.equal(error.code,'actor_command_pending');assert.deepEqual(actorIsolations(error).map(p=>p.actor),[s.ids[0]]);assert.deepEqual(s.isolated,[s.ids[0]]);assert(s.isolation.unknownActors.has(s.ids[1]));assert.equal(s.players.get(s.ids[2]).suspended,false);assert.equal(s.permanent.entries.size,0);assert.deepEqual(s.faults,[]);
 assert([...s.controls.values()].every(row=>row.stream.pending.size===0));
});

test('JSON transport preserves a same-channel mixed proof for party transition abort',async()=>{
 const s=fixture(PermanentCoordinator,{kinds:['stopped','pending','healthy'],channels:[1,1,2],Isolation:ActorIsolation,wire:true}),group=new TransferFreezeGroup(s.core,s.ids[0]);let writes=0,error;
 const pending=(async()=>{try{await group.freeze();writes++;}catch(e){if(!await group.rejectFreeze(e))group.fail(e);throw e;}})().catch(e=>error=e);
 await turns(80);s.release(s.ids[0]);await turns(80);s.release(s.ids[1]);s.release(s.ids[2]);await pending;
 assert.equal(writes,0);assert.equal(error.code,'actor_command_pending');assert.deepEqual(actorIsolations(error).map(p=>p.actor),[s.ids[0]]);assert.deepEqual(s.isolated,[s.ids[0]]);assert.equal(group.phase,'released');assert.equal(s.core.transitions.size,0);assert.equal(s.players.get(s.ids[2]).suspended,false);assert.deepEqual(s.faults,[]);
});

test('a stopped proof for another token or actor cannot cross the control receiver',()=>{
 const proof={actor:'actor-1',epoch:1,token:'quarantine-token',freezeToken:'freeze-token',channel:1,incarnation:'boot-1',finalSequence:0,stopped:true};
 for(const request of [{id:'actor-1',epoch:1,token:'other-token'},{id:'actor-2',epoch:1,token:'freeze-token'},{id:'actor-1',epoch:2,token:'freeze-token'}]){
  assert.throws(()=>receiveActorIsolation(Object.assign(Error('actor_command_pending'),{code:'actor_command_pending'}),proof,'freeze',request),{code:'invalid_actor_isolation_scope'});
 }
});
