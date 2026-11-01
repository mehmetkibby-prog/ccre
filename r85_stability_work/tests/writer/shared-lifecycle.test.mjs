import test from 'node:test';
import assert from 'node:assert/strict';
import {gate,turns} from './freeze-fixture.mjs';
import {rejectSharedActorJob} from '../../working/core511-source/scripts/core511/actor-rejection.mjs';
const base=process.env.R85_TEST_BASELINE==='1'?'../../working/core511-source/scripts/core511/':'../../working/core511-source/scripts/core511/';
const {SharedCombatBridge}=await import(base+'shared-combat-bridge.mjs');
const fault=code=>Object.assign(Error(code),{code});

function fixture({pause=null,committed=false}={}){
 const gates=new Map(),calls=[],faults=[],recoveries=[],timers=[];if(pause)gates.set(pause,gate());
 const port=async(method,value)=>{calls.push(method);if(gates.has(method))await gates.get(method).promise;return value;};
 const peer={channel:1,incarnation:'boot-1',realm:'fixture'},source={...peer,actor:'actor-a',epoch:1};
 const owners=new Map([[source.actor,{epoch:1,channel:1,incarnation:'boot-1',sequence:0,state:'active'}]]);
 const core={realmId:'fixture',recoveringWorld:false,writer:{owners,command:()=>port('writer_command',ack)},reader:{query:()=>port('reader_query',{rows:{}})},actorIsolation:{commandStatus:()=>port('command_status',{status:'unresolved'})},onFault:row=>faults.push(row)};
 const oldWorld={state:'running',exited:false,peer:{channel:0,incarnation:'world-1'},owner:{epoch:1},control:{request:(method)=>port(method,{finished:true,proof:'lease-proof-test'})}};
 const world={core,row:oldWorld,global:{recover:issue=>recoveries.push(issue)}};
 const bridge=new SharedCombatBridge(world,{set(fn,ms){const timer={fn,ms,unref(){}};timers.push(timer);return timer;},clear:()=>{}});core.sharedWorld={combat:bridge};
 const row={id:'shared-lifecycle-operation-0001',phase:'leased',world:oldWorld,source,proof:'lease-proof-test',commandAck:null};
 const request={playerId:source.actor,epoch:1,sequence:1,operationId:'shared:'+row.id,operation:'attack',payload:{sharedLease:row.proof}},ack={key:request.operationId,result:{}};
 const held={row,phase:'frozen',token:'shared-hold-token',sourcePlayers:[{id:source.actor,epoch:1}],sessions:new Map(),channels:[1,2,3,4].map(channel=>({answer:{actors:[]},channel:{peer:{channel,incarnation:'boot-'+channel},control:{request:(method,payload)=>port(method,{token:payload.token,channel,incarnation:'boot-'+channel,aborted:true,released:true})}}}))};
 row.terminal=held;row.commandAck=committed?ack:null;bridge.terminal=held;bridge.requests.set(row.id,row);
 const payload={id:row.id,actor:source.actor,epoch:1,proof:row.proof,changes:{}};
 const replace=()=>{
  core.recoveringWorld=true;oldWorld.exited=true;bridge.recovered();world.row={...oldWorld,exited:false,peer:{channel:0,incarnation:'world-2'}};
  const replacementRow={id:'replacement-operation',phase:'leased',source:{...source,epoch:2},world:world.row,proof:'replacement-proof'};
  const replacement={row:replacementRow,token:'replacement-hold',phase:'freezing',channels:[]};replacementRow.terminal=replacement;bridge.terminal=replacement;bridge.requests.set(replacementRow.id,replacementRow);core.recoveringWorld=false;return replacement;
 };
 return {core,bridge,world,oldWorld,row,held,peer,payload,request,ack,gates,calls,faults,recoveries,timers,replace,port};
}

test('healthy ordinary cancellation waits for all abort ACKs then releases exactly its terminal',async()=>{
 const s=fixture({pause:'shared_abort'});let settled=false;
 const pending=s.bridge.cancel(s.peer,{...s.payload,operationId:s.request.operationId}).finally(()=>settled=true);await turns(60);
 assert.equal(settled,false);assert.equal(s.bridge.terminal,s.held);assert.equal(s.calls.filter(c=>c==='shared_abort').length,4);assert(!s.calls.includes('shared_finish'));
 s.gates.get('shared_abort').resolve();assert.deepEqual(await pending,{cancelled:true});assert.equal(s.row.phase,'finished');assert.equal(s.row.cancelled,true);assert.equal(s.bridge.terminal,null);assert.equal(s.calls.filter(c=>c==='shared_finish').length,1);assert.equal(s.recoveries.length,0);
});

test('healthy committed finish can close the world lease after releasing its channel terminal',async()=>{
 const s=fixture({committed:true,pause:'shared_finish'});let settled=false;
 const pending=s.bridge.finish(s.peer,s.payload).finally(()=>settled=true);await turns(100);
 assert.equal(settled,false);assert.equal(s.bridge.terminal,null);assert.equal(s.row.phase,'finishing');assert.equal(s.calls.filter(c=>c==='shared_release').length,4);
 s.gates.get('shared_finish').resolve();assert.deepEqual(await pending,{finished:true,proof:'lease-proof-test'});assert.equal(s.row.phase,'finished');assert.equal(s.bridge.terminal,null);assert.equal(s.recoveries.length,0);
});

test('a valid late world-finish ACK updates only its old row after a subsequent terminal starts',async()=>{
 const s=fixture({committed:true,pause:'shared_finish'}),pending=s.bridge.finish(s.peer,s.payload);await turns(100);assert.equal(s.bridge.terminal,null);
 // The same live world may grant its next lease after processing finish but
 // before the old finish reply reaches the parent. That ACK may finish its
 // original row, but it must not clear the subsequently granted terminal.
 const next={row:{id:'next-lease',source:s.row.source},token:'next-terminal',phase:'freezing',channels:[]};s.bridge.terminal=next;
 s.gates.get('shared_finish').resolve();await pending;assert.equal(s.row.phase,'finished');assert.equal(s.bridge.terminal,next);assert.equal(s.recoveries.length,0);
});

for(const pause of ['reader_query','shared_reload','shared_release','shared_finish'])for(const reject of [false,true])test('retired committed finish '+pause+' '+(reject?'failure':'ACK')+' cannot disturb replacement',async()=>{
 const s=fixture({committed:true,pause});let error;
 const pending=s.bridge.finish(s.peer,s.payload).catch(e=>error=e);await turns(100);assert(s.calls.includes(pause));const callsBefore=s.calls.length,replacement=s.replace();
 reject?s.gates.get(pause).reject(fault('old_control_failed')):s.gates.get(pause).resolve();await pending;await turns(80);
 assert(error);assert.equal(s.bridge.terminal,replacement);assert.equal(s.core.recoveringWorld,false);assert.equal(s.recoveries.length,0);assert.equal(s.calls.length,callsBefore);assert.notEqual(s.row.phase,'finished');
});

for(const pause of ['shared_abort','shared_finish'])for(const reject of [false,true])test('retired cancellation '+pause+' '+(reject?'failure':'ACK')+' stays within old scope',async()=>{
 const s=fixture({pause});let error;
 const pending=s.bridge.cancel(s.peer,{...s.payload,operationId:s.request.operationId}).catch(e=>error=e);await turns(100);assert(s.calls.includes(pause));const callsBefore=s.calls.length,replacement=s.replace();
 reject?s.gates.get(pause).reject(fault('old_abort_failed')):s.gates.get(pause).resolve();await pending;await turns(80);
 assert(error);assert.equal(s.bridge.terminal,replacement);assert.equal(s.core.recoveringWorld,false);assert.equal(s.recoveries.length,0);assert.equal(s.calls.length,callsBefore);assert.notEqual(s.row.cancelled,true);
});

test('current failed cancellation keeps the terminal fenced and requests recovery once',async()=>{
 const s=fixture({pause:'shared_abort'});let error;
 const pending=s.bridge.cancel(s.peer,{...s.payload,operationId:s.request.operationId}).catch(e=>error=e);await turns(80);s.gates.get('shared_abort').reject(fault('current_abort_failed'));await pending;
 assert.equal(error.code,'current_abort_failed');assert.equal(s.bridge.terminal,s.held);assert.equal(s.row.phase,'leased');assert.equal(s.core.recoveringWorld,true);assert.equal(s.recoveries.length,1);assert(!s.calls.includes('shared_finish'));
});

test('command abort caller cannot recover replacement after its old proof abort was superseded',async()=>{
 const s=fixture({pause:'shared_abort'}),rejected=rejectSharedActorJob(fault('owner_epoch_fenced'),s.peer,s.request);let error,writes=0;
 s.core.writer.command=async()=>{writes++;throw rejected;};
 const pending=s.bridge.command(s.peer,s.request).catch(e=>error=e);await turns(100);assert(s.calls.includes('shared_abort'));const replacement=s.replace();s.gates.get('shared_abort').resolve();await pending;await turns(80);
 assert(error);assert.equal(writes,1);assert.equal(s.bridge.terminal,replacement);assert.equal(s.core.recoveringWorld,false);assert.equal(s.recoveries.length,0);assert(!s.calls.includes('shared_finish'));assert.equal(s.row.commandRejected,undefined);
});

test('late writer failure does not probe or recover a replacement owner',async()=>{
 const s=fixture({pause:'writer_command'});let error;
 s.core.actorIsolation.commandStatus=async()=>{s.calls.push('command_status');throw fault('owner_epoch_fenced');};
 const pending=s.bridge.command(s.peer,s.request).catch(e=>error=e);await turns(80);const replacement=s.replace();s.gates.get('writer_command').reject(fault('writer_reply_lost'));await pending;
 assert.equal(error.code,'writer_reply_lost');assert.equal(s.bridge.terminal,replacement);assert.equal(s.core.recoveringWorld,false);assert.equal(s.recoveries.length,0);assert(!s.calls.includes('command_status'));assert.equal(s.row.commandAck,null);
});

test('late exact-status failure does not recover replacement or replay the writer',async()=>{
 const s=fixture({pause:'command_status'});let error,writes=0;
 s.core.writer.command=async()=>{writes++;throw fault('writer_reply_lost');};
 const pending=s.bridge.command(s.peer,s.request).catch(e=>error=e);await turns(100);assert(s.calls.includes('command_status'));const replacement=s.replace();s.gates.get('command_status').reject(fault('status_owner_retired'));await pending;
 assert.equal(error.code,'status_owner_retired');assert.equal(writes,1);assert.equal(s.bridge.terminal,replacement);assert.equal(s.core.recoveringWorld,false);assert.equal(s.recoveries.length,0);assert.equal(s.timers.length,0);
});

test('late unknown-outcome watchdog status failure cannot schedule replacement recovery',async()=>{
 const s=fixture({pause:'command_status'});s.row.commandRequest=s.request;s.bridge.watchUnknown(s.row,fault('writer_reply_lost'));assert.equal(s.timers.length,1);s.timers[0].fn();await turns(80);assert(s.calls.includes('command_status'));
 const replacement=s.replace();s.gates.get('command_status').reject(fault('status_owner_retired'));await turns(160);
 assert.equal(s.bridge.terminal,replacement);assert.equal(s.core.recoveringWorld,false);assert.equal(s.recoveries.length,0);assert.equal(s.row.commandUnknown,null);assert(!s.calls.includes('writer_command'));
});

test('a genuine unresolved current command still waits for exact status and keeps its watchdog',async()=>{
 const s=fixture();let error,writes=0;s.core.writer.command=async()=>{writes++;throw fault('writer_reply_lost');};
 await s.bridge.command(s.peer,s.request).catch(e=>error=e);assert.equal(error.code,'writer_reply_lost');assert.equal(writes,1);assert.equal(s.row.commandAck,null);assert.equal(s.bridge.terminal,s.held);assert.equal(s.row.commandUnknown.error,error);assert.equal(s.timers.length,1);assert.equal(s.recoveries.length,0);
 s.bridge.clearUnknown(s.row);
});

test('late returning-group release ACK cannot clear replacement or finish the old world',async()=>{
 const s=fixture({committed:true,pause:'shared_release'});s.row.phase='returning';s.row.commandAck.result.moves=[];let error;
 const pending=s.bridge.returnReady(s.peer,{...s.payload,actors:[{id:s.row.source.actor,epoch:1}]}).catch(e=>error=e);await turns(100);assert(s.calls.includes('shared_release'));const replacement=s.replace();s.gates.get('shared_release').resolve();await pending;
 assert(error);assert.equal(s.bridge.terminal,replacement);assert.equal(s.core.recoveringWorld,false);assert.equal(s.recoveries.length,0);assert(!s.calls.includes('shared_finish'));
});
