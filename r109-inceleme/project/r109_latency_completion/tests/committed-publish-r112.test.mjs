import test from 'node:test';
import assert from 'node:assert/strict';
const {SharedCombatBridge}=await import(process.env.STUTTER_TREE+'/core511-source/scripts/core511/shared-combat-bridge.mjs');
function fixture(){
 let resolve,reject;const projected=new Promise((r,j)=>{resolve=r;reject=j;}),events=[],failures=[],core={reader:{query:async name=>{events.push(name);return {rows:{durable:true}};}}};
 const world={core,row:{peer:{incarnation:'world'},owner:{epoch:1},control:{request:async(method,p)=>{events.push(method);if(method==='shared_reload'){assert(p.snapshot.durable);await projected;}return {finished:true};}}}},bridge=new SharedCombatBridge(world),row={id:'op',phase:'leased',source:{actor:'p',epoch:1,channel:1,incarnation:'channel'},world:world.row,proof:'proof',commandRequest:{operationId:'shared:op',sequence:1}},held={row,phase:'frozen',channels:[]};
 row.terminal=held;bridge.terminal=held;bridge.requests.set(row.id,row);bridge.entry=()=>row;bridge.fail=error=>{failures.push(error);core.recoveringWorld=true;};return {bridge,row,held,events,failures,resolve,reject};
}
test('durable shared publication and source reload overlap; final release still awaits publication exactly once',async()=>{
 const s=fixture(),ack={key:'shared:op',result:{players:[]}};
 assert.throws(()=>s.bridge.reloadCommittedWorldR112(s.row,s.held),/shared_terminal_commit_missing/);assert.deepEqual(s.events,[]);
 assert.equal(await s.bridge.acceptCommand(s.row,ack),ack);await new Promise(r=>setImmediate(r));
 assert.deepEqual(s.events,['kernel511_world_boot','shared_reload']);assert.equal(s.bridge.terminal,s.held);assert.equal(s.held.phase,'frozen');
 assert.equal(await s.bridge.acceptCommand(s.row,ack),ack);assert.equal(s.events.length,2);
 let finished=false;const final=s.bridge.finish({},{}).then(()=>finished=true);await new Promise(r=>setImmediate(r));assert.equal(finished,false);assert.equal(s.bridge.terminal,s.held);
 s.resolve();await final;assert(finished);assert.deepEqual(s.events,['kernel511_world_boot','shared_reload','shared_finish']);assert.equal(s.bridge.terminal,null);assert.equal(s.row.phase,'finished');assert.deepEqual(s.failures,[]);
});
test('a replaced world cannot publish or complete a stale terminal result',async()=>{
 const s=fixture();await s.bridge.acceptCommand(s.row,{key:'shared:op',result:{}});await new Promise(r=>setImmediate(r));s.bridge.world.row={};s.resolve();await assert.rejects(s.row.committedReloadR112,/shared_bridge_superseded/);assert.deepEqual(s.failures,[]);
 await assert.rejects(s.bridge.finish({},{}),/shared_finish_superseded/);assert.equal(s.bridge.terminal,s.held);
});
test('publication failure is observed even without finish and cannot become a successful replay',async()=>{
 const s=fixture(),ack={key:'shared:op',result:{}};await s.bridge.acceptCommand(s.row,ack);await new Promise(r=>setImmediate(r));s.reject(new Error('publication_failed'));await assert.rejects(s.row.committedReloadR112,/publication_failed/);await new Promise(r=>setImmediate(r));assert.equal(s.failures.length,1);assert.equal(s.bridge.terminal,s.held);assert.equal(s.held.phase,'frozen');
 await assert.rejects(s.bridge.acceptCommand(s.row,ack),/shared_bridge_superseded/);await assert.rejects(s.bridge.finish({},{}),/shared_finish_superseded/);assert(!s.events.includes('shared_finish'));
});
