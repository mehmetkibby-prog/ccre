import test from 'node:test';
import assert from 'node:assert/strict';
import {SharedCombatBridge} from '../shared-combat-bridge.mjs';

function fixture(){
 const peers=[1,2,3,4].map(channel=>({channel,incarnation:'boot-'+channel,realm:'test'}));
 const source={...peers[0],actor:'source',epoch:1},core={writer:{owners:new Map([['source',{...source,state:'active'}]])},reader:{query:async()=>({rows:{}})},process:peer=>peers.find(p=>p===peer)||assert.fail('process lost')};
 const world={core,row:{exited:false,owner:{epoch:1},peer:{incarnation:'world'},control:{request:async()=>({})}}},bridge=new SharedCombatBridge(world);
 const row={id:'terminal-operation',source,world:world.row,proof:'private-proof',phase:'leased',commandAck:{result:{}}};
 const held={row,token:'hold',phase:'frozen',channels:peers.map(peer=>({channel:{peer,control:{request:async()=>({token:'hold',released:true})}},answer:{actors:[{id:'actor-'+peer.channel,epoch:1,sequence:0}]}}))};
 row.terminal=held;bridge.terminal=held;bridge.requests.set(row.id,row);
 const request={playerId:'actor-4',epoch:1,sequence:1,operationId:'potion',operation:'native_action',payload:{input:{action:'use_potion'}}};
 return {bridge,peers,row,held,request,core};
}

test('actual terminal finish exposes a resumed CH4 while other release ACKs are pending; queued potion waits outside writer',async()=>{
 const {bridge,peers,row,held,request}=fixture();let release,firstReleased=false,writes=0;
 const gate=new Promise(resolve=>release=resolve);
 for(const c of held.channels)c.channel.control.request=async()=>{if(c.channel.peer.channel===4)firstReleased=true;else await gate;return {token:held.token,released:true};};
 const finish=bridge.finish(peers[0],{id:row.id,actor:'source',epoch:1,proof:row.proof});
 while(!firstReleased)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(held.phase,'refreshing');
 assert.throws(()=>bridge.guard(peers[3],request),e=>e.code==='shared_terminal_actor_fenced'&&e.context.operation==='native_action'&&e.context.action==='use_potion'&&e.context.actor==='actor-4'&&e.context.phase==='refreshing');
 const command=bridge.writable(peers[3],request).then(()=>{bridge.guard(peers[3],request);writes++;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(writes,0);assert.equal(bridge.actorWaits,1);
 release();await Promise.all([finish,command]);assert.equal(writes,1);assert.equal(bridge.terminal,null);
});

test('freezing drains accepted work; frozen and refreshing forbid unauthorized writes, including forged proofs',async()=>{
 const {bridge,peers,held,request}=fixture();held.phase='freezing';await bridge.writable(peers[3],request);assert.equal(bridge.guard(peers[3],request),true);
 for(const phase of ['frozen','refreshing']){held.phase=phase;assert.throws(()=>bridge.guard(peers[3],request),/shared_terminal_actor_fenced/);assert.throws(()=>bridge.guard(peers[3],{...request,payload:{sharedLease:'wrong'}}),/shared_terminal_actor_fenced/);}
 held.phase='frozen';assert.equal(bridge.guard(peers[0],{...request,playerId:'source',payload:{sharedLease:held.row.proof}}),true);
});

test('waiting never suppresses a genuinely lost channel incarnation or unknown terminal outcome',async()=>{
 const {bridge,peers,request,core}=fixture();let checked=0;core.process=()=>{checked++;throw Object.assign(Error('channel_process_fenced'),{code:'channel_process_fenced'});};
 const lost=bridge.writable(peers[3],request);bridge.terminal=null;bridge.wake();await assert.rejects(lost,/channel_process_fenced/);assert.equal(checked,1);
 const other=fixture(),pending=other.bridge.writable(other.peers[3],other.request);other.bridge.abort(Error('commit outcome unknown'));await assert.rejects(pending,/commit outcome unknown/);
});
