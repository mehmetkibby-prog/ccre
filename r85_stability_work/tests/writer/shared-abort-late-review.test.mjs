import test from 'node:test';
import assert from 'node:assert/strict';
import {gate,turns} from './freeze-fixture.mjs';
const base=process.env.R85_TEST_BASELINE==='1'?'../../working/core511-source/scripts/core511/':'../../working/core511-source/scripts/core511/';
const {SharedCombatBridge}=await import(base+'shared-combat-bridge.mjs');

function healthyFixture(){
 const calls=[],peer={channel:1,incarnation:'boot-a'},source={...peer,actor:'actor-a',epoch:1};
 const core={recoveringWorld:false,writer:{owners:new Map([['actor-a',{epoch:1,channel:1,incarnation:'boot-a',state:'active'}]])},reader:{query:async()=>({rows:{}})}};
 const currentWorld={state:'running',exited:false,peer:{channel:0,incarnation:'current-world'},owner:{epoch:1},control:{async request(method){calls.push(method);return {finished:method==='shared_finish'};}}};
 const world={core,row:currentWorld},bridge=new SharedCombatBridge(world);
 const row={id:'healthy-operation',phase:'leased',world:currentWorld,source,proof:'healthy-world-proof',commandAck:null};
 const held={row,phase:'frozen',token:'healthy-hold-token',channels:[{answer:{actors:[]},channel:{peer,control:{async request(method,payload){calls.push(method);return {aborted:method==='shared_abort',released:method==='shared_release',token:payload.token,channel:1,incarnation:'boot-a'};}}}}]};
 row.terminal=held;bridge.terminal=held;bridge.requests.set(row.id,row);
 return {calls,peer,source,core,bridge,row,held,payload:{id:row.id,actor:source.actor,epoch:1,proof:row.proof,changes:{}}};
}

test('healthy ordinary abort completes once and releases its own exact terminal',async()=>{
 const s=healthyFixture();await s.bridge.abortTerminal(s.row);
 assert.deepEqual(s.calls,['shared_abort','shared_finish']);assert.equal(s.bridge.terminal,null);assert.equal(s.row.terminal,null);assert.equal(s.row.phase,'finished');assert.equal(s.core.recoveringWorld,false);
});

test('healthy ordinary finish can finish its world lease after intentionally releasing channel holds',async()=>{
 const s=healthyFixture();s.row.commandAck={result:{}};
 assert.deepEqual(await s.bridge.finish(s.peer,s.payload),{finished:true});
 assert.deepEqual(s.calls,['shared_reload','shared_release','shared_finish']);assert.equal(s.bridge.terminal,null);assert.equal(s.row.phase,'finished');assert.equal(s.core.recoveringWorld,false);
});

test('late ordinary abortTerminal ACK must not clear a replacement terminal or send old-world finish',async t=>{
 const hold=gate(),calls=[];
 const core={recoveringWorld:false},oldWorld={state:'running',exited:false,control:{async request(method){calls.push(method);return {finished:true};}}};
 const world={core,row:oldWorld},bridge=new SharedCombatBridge(world);
 const row={id:'original-operation',phase:'leased',world:oldWorld,source:{actor:'actor-a',epoch:1,channel:1,incarnation:'boot-a'},proof:'original-world-proof',commandAck:null};
 const held={row,phase:'frozen',token:'original-hold-token',channels:[{channel:{peer:{channel:1,incarnation:'boot-a'},control:{async request(method,payload){calls.push(method);await hold.promise;return {aborted:true,token:payload.token,channel:1,incarnation:'boot-a'};}}}}]};
 row.terminal=held;bridge.terminal=held;bridge.requests.set(row.id,row);
 let result;const pending=bridge.abortTerminal(row).catch(e=>result=e);await turns(40);
 assert.deepEqual(calls,['shared_abort']);
 core.recoveringWorld=true;oldWorld.exited=true;bridge.recovered();world.row={state:'running',exited:false};
 const replacement={phase:'freezing',channels:[],token:'replacement-hold',row:{id:'replacement-operation'}};
 bridge.terminal=replacement;core.recoveringWorld=false;hold.resolve();await pending;await turns(20);
 t.diagnostic(JSON.stringify({errorCode:result?.code??null,calls,terminalIsReplacement:bridge.terminal===replacement,terminal:bridge.terminal?.token??null}));
 assert.equal(bridge.terminal,replacement,'late ordinary abort must retain exact replacement terminal');
 assert.equal(calls.includes('shared_finish'),false,'old world must not receive finish after replacement');
});

test('late ordinary finish release ACK must not clear a replacement terminal or finish its old world',async t=>{
 const release=gate(),calls=[],peer={channel:1,incarnation:'boot-a'},source={...peer,actor:'actor-a',epoch:1};
 const core={recoveringWorld:false,writer:{owners:new Map([['actor-a',{epoch:1,channel:1,incarnation:'boot-a',state:'active'}]])},reader:{query:async()=>({rows:{}})}};
 const oldWorld={state:'running',exited:false,peer:{channel:0,incarnation:'old-world'},owner:{epoch:1},control:{async request(method){calls.push(method);return {};}}};
 const world={core,row:oldWorld},bridge=new SharedCombatBridge(world);
 const row={id:'original-operation',phase:'leased',world:oldWorld,source,proof:'original-world-proof',commandAck:{result:{}}};
 const held={row,phase:'frozen',token:'original-hold-token',channels:[{answer:{actors:[]},channel:{peer,control:{async request(method,payload){calls.push(method);await release.promise;return {released:true,token:payload.token};}}}}]};
 row.terminal=held;bridge.terminal=held;bridge.requests.set(row.id,row);
 let result;const pending=bridge.finish(peer,{id:row.id,actor:source.actor,epoch:1,proof:row.proof,changes:{}}).catch(e=>result=e);await turns(40);
 assert.deepEqual(calls,['shared_reload','shared_release']);
 core.recoveringWorld=true;oldWorld.exited=true;bridge.recovered();world.row={state:'running',exited:false};
 const replacement={phase:'freezing',channels:[],token:'replacement-hold',row:{id:'replacement-operation'}};
 bridge.terminal=replacement;core.recoveringWorld=false;release.resolve();await pending;await turns(20);
 t.diagnostic(JSON.stringify({errorCode:result?.code??null,calls,terminalIsReplacement:bridge.terminal===replacement,terminal:bridge.terminal?.token??null}));
 assert.equal(bridge.terminal,replacement,'late ordinary finish must retain exact replacement terminal');
 assert.equal(calls.includes('shared_finish'),false,'old world must not receive finish after replacement');
});
