import test from 'node:test';
import assert from 'node:assert/strict';
const {SharedCombatBridge}=await import(process.env.STUTTER_TREE+'/core511-source/scripts/core511/shared-combat-bridge.mjs');
function fixture(){
 let resolve;const projected=new Promise(r=>resolve=r),events=[],core={reader:{query:async name=>{events.push(name);return {rows:{durable:true}};}}};
 const world={core,row:{peer:{incarnation:'world'},owner:{epoch:1},control:{request:async(method,p)=>{assert(p.snapshot.durable);events.push(method);await projected;}}}},bridge=new SharedCombatBridge(world),row={id:'op',source:{actor:'p',epoch:1,channel:1,incarnation:'channel'},world:world.row,proof:'proof',commandRequest:{operationId:'shared:op',sequence:1}},held={row,phase:'frozen',channels:[]};
 row.terminal=held;bridge.terminal=held;bridge.requests.set(row.id,row);return {bridge,row,held,events,resolve};
}
test('durable shared deaths publish once before the source receives its cold-reload ACK; leases stay held',async()=>{
 const s=fixture(),ack={key:'shared:op',result:{players:[]}};
 assert.throws(()=>s.bridge.reloadCommittedWorldR112(s.row,s.held),/shared_terminal_commit_missing/);assert.deepEqual(s.events,[]);
 let replied=false;const first=s.bridge.acceptCommand(s.row,ack).then(()=>replied=true);await new Promise(r=>setImmediate(r));
 assert.deepEqual(s.events,['kernel511_world_boot','shared_reload']);assert.equal(replied,false);assert.equal(s.bridge.terminal,s.held);
 const second=s.bridge.acceptCommand(s.row,ack);s.resolve();await Promise.all([first,second]);assert(replied);assert.equal(s.events.length,2);assert.equal(s.bridge.terminal,s.held);assert.equal(s.held.phase,'frozen');
});
test('a replaced world cannot publish or complete a stale terminal result',async()=>{
 const s=fixture();const pending=s.bridge.acceptCommand(s.row,{key:'shared:op',result:{}});await new Promise(r=>setImmediate(r));s.bridge.world.row={};s.resolve();await assert.rejects(pending,/shared_bridge_superseded/);
});
