import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,turns} from './freeze-fixture.mjs';
import {PermanentCoordinator} from '../../working/core511-source/scripts/core511/permanent-coordinator.mjs';
import {TransferFreezeGroup} from '../../working/core511-source/scripts/core511/transfer-freeze-group.mjs';
import {ActorIsolation} from '../../working/core511-source/scripts/core511/actor-isolation.mjs';
import {actorIsolations} from '../../working/core511-source/scripts/core511/actor-isolation-proof.mjs';

async function setup(){
 const s=fixture(PermanentCoordinator,{kinds:['stopped','pending','healthy'],channels:[1,1,2],Isolation:ActorIsolation});
 const candidate=new URL('../../working/core511-source/scripts/core511/resident-control.mjs',import.meta.url);
 // Preserve fixture-controlled ports while testing the candidate resident when
 // it exists. Before a resident patch exists the actual R84 resident is used.
 if(fs.existsSync(candidate)){
  const {ResidentControl}=await import(candidate.href);
  for(const row of s.controls.values())row.control=new ResidentControl({...row.control});
 }
 return s;
}

for(const reverse of [false,true])test('same-channel stopped+pending retains stopped proof and resumes only healthy peer '+reverse,async t=>{
 const s=await setup();let writes=0,error;
 const pending=s.permanent.permanentPlayers(s.ids,()=>writes++).catch(e=>error=e);
 await turns();s.release(s.ids[reverse?1:0]);await turns();s.release(s.ids[2]);s.release(s.ids[reverse?0:1]);await pending;
 t.diagnostic(JSON.stringify({writes,...s.outcome(error)}));
 assert.equal(writes,0);assert.equal(error.code,'actor_command_pending');
 assert.deepEqual(actorIsolations(error).map(p=>p.actor),[s.ids[0]]);
 assert.deepEqual(s.isolated,[s.ids[0]]);assert(s.isolation.unknownActors.has(s.ids[1]));
 assert.equal(s.players.get(s.ids[0]).suspended,true);
 assert.equal(s.players.get(s.ids[1]).suspended,true);
 assert.equal(s.players.get(s.ids[2]).suspended,false);
 assert.equal(s.permanent.entries.size,0);assert.deepEqual(s.faults,[]);
});

test('party-transfer same-channel stopped+pending releases only the unentered group',async t=>{
 const s=await setup(),group=new TransferFreezeGroup(s.core,s.ids[0]);let writes=0,error;
 const pending=(async()=>{try{await group.freeze();writes++;}catch(e){if(!await group.rejectFreeze(e))group.fail(e);throw e;}})().catch(e=>error=e);
 await turns();s.release(s.ids[0]);await turns();s.release(s.ids[1]);s.release(s.ids[2]);await pending;
 t.diagnostic(JSON.stringify({writes,...s.outcome(error),groupPhase:group.phase}));
 assert.equal(writes,0);assert.equal(error.code,'actor_command_pending');
 assert.deepEqual(actorIsolations(error).map(p=>p.actor),[s.ids[0]]);
 assert.deepEqual(s.isolated,[s.ids[0]]);assert(s.isolation.unknownActors.has(s.ids[1]));
 assert.equal(s.players.get(s.ids[2]).suspended,false);
 assert.equal(group.phase,'released');assert.equal(s.core.transferGroups.size,0);
 assert.equal(s.core.transitions.size,0);assert.deepEqual(s.faults,[]);
});
