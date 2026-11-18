import assert from 'node:assert/strict';
import test from 'node:test';
import {ActorCheckpoints} from '../r109_latency_completion/working/core511-source/scripts/core511/actor-checkpoint.mjs';
import {SharedCombatChannel} from '../r109_latency_completion/working/core511-source/scripts/core511/shared-combat-channel.mjs';
import {actorRejection} from '../r109_latency_completion/working/core511-source/scripts/core511/actor-rejection.mjs';

test('scope mismatch during shared hold aborts without a write or fatal error', async () => {
 const peer={channel:4,incarnation:'test-channel'};
 const owner={epoch:1};
 const owners=new Map([['p',owner]]);
 const player={epoch:1,suspended:false};
 const lease={state:'held'};
 let row={id:'p',area:'forest'}, stopped=false, released=false, resumed=false;
 const state={owners,read:()=>row,assertOwner:()=>owner,freeze:()=>{stopped=true;}};
 const quarantines={entries:new Map()};
 const checkpoints=new ActorCheckpoints({state,peer,
  submit:()=>assert.fail('must not submit incompatible snapshot'),
  onRejected:(id,error)=>{
   assert.equal(actorRejection(error).outcome,'not_executed');
   quarantines.entries.set(id,{epoch:1,error});
  },
 });
 checkpoints.hydrate(row);
 row={...row,area:'dungeon'};
 const shared=new SharedCombatChannel({
  channel:{peer,owners,checkpoints,quarantines,kernel:{players:new Map([['p',player]])},
   control:{entries:new Map()},lanes:{acquire:()=>lease,assert:()=>{},release:()=>{released=true;}},
   combatCheckpoints:{drain:async()=>{}},
  },
  flushPresence:async()=>{},mailbox:{hold:async()=>{},resume:()=>{resumed=true;}},
  fail:()=>assert.fail('must not fail channel'),
 });
 const answer=await shared.hold({token:'hold',except:[]});
 assert.deepEqual(answer.rejected,{actor:'p',epoch:1,code:'actor_checkpoint_rejected',reason:'checkpoint_scope_changed'});
 assert.equal(answer.aborted,true);
 assert(stopped&&released&&resumed&&player.suspended);
 assert.equal(shared.abortHold({token:'hold'}).aborted,true);
 await assert.rejects(checkpoints.drain('p'),{code:'checkpoint_scope_changed'});
});
