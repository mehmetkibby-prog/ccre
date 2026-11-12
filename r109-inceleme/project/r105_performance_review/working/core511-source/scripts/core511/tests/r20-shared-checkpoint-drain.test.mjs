import test from 'node:test';
import assert from 'node:assert/strict';
import {drainCombatCheckpoints} from '../shared-combat-channel.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
test('shared terminal waits for actor and combat durable receipts while starting both together',async()=>{
 const actor=deferred(),combat=deferred(),calls=[];let completed=false;
 const pending=drainCombatCheckpoints({checkpoints:{drain:id=>(calls.push(id),actor.promise)},combatCheckpoints:{drain:()=>(calls.push('combat'),combat.promise)}},['actor']).then(()=>completed=true);
 await turn();assert.deepEqual(calls,['actor','combat']);actor.resolve();await turn();assert.equal(completed,false);combat.resolve();await pending;assert.equal(completed,true);
});
test('shared terminal preserves typed rejection and joins sibling durability before recovery',async()=>{
 const actor=deferred(),combat=deferred(),rejection=Object.assign(Error('writer_statement_failed'),{code:'actor_write_rejected',actor:'actor'});let caught=null;
 const pending=drainCombatCheckpoints({checkpoints:{drain:()=>actor.promise},combatCheckpoints:{drain:()=>combat.promise}},['actor']).catch(error=>caught=error);
 actor.reject(rejection);await turn();assert.equal(caught,null);combat.resolve();await pending;assert.equal(caught,rejection);
});
test('shared terminal invokes other drains even if one checkpoint throws synchronously',async()=>{
 const actorError=Error('fenced_actor'),combat=deferred();let called=false,caught=null;
 const pending=drainCombatCheckpoints({checkpoints:{drain:()=>{throw actorError;}},combatCheckpoints:{drain:()=>{called=true;return combat.promise;}}},['actor']).catch(error=>caught=error);
 await turn();assert.equal(called,true);assert.equal(caught,null);combat.resolve();await pending;assert.equal(caught,actorError);
});
