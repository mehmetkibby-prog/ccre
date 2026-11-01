import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {ReliableStream,StreamControl,createStreamServer} from '../reliable-stream.mjs';
import {MessagePortStream} from '../message-port-stream.mjs';
import {until} from './helpers.mjs';

test('control rejection distinguishes exhausted capacity, duplicate identity and a retired process',async()=>{
 const control=new StreamControl({maxPending:2}),first=control.request('freeze',{}, {id:'one'});
 assert.throws(()=>control.request('freeze',{}, {id:'one'}),{code:'ipc_control_duplicate_pending_id'});
 const second=control.request('resume',{}, {id:'two'});
 assert.throws(()=>control.request('freeze',{}, {id:'three'}),{code:'ipc_control_backpressure'});
 const retired=Promise.all([assert.rejects(first,{code:'ipc_control_outcome_unknown'}),assert.rejects(second,{code:'ipc_control_outcome_unknown'})]);control.close();await retired;
 assert.throws(()=>control.request('resume',{}, {id:'three'}),{code:'ipc_control_closed'});assert.equal(control.pending.size,0);
});

for(const cut of ['during-work','after-work'])test('same authenticated writer stream: control '+cut+' disconnect replays without applying twice',async t=>{
 const control=new StreamControl();let calls=0,checkpoints=0,opens=0,auths=0,allowFinish,cutOnce=false;
 const barrier=new Promise(resolve=>allowFinish=resolve),sockets=new Set();
 const server=createStreamServer({authenticate:hello=>{assert.equal(hello.proof,'fixture');auths++;return {channel:4,incarnation:'test-incarnation'};},
  dispatch:async(peer,method,payload)=>{assert.equal(peer.channel,4);assert.equal(method,'checkpoint');checkpoints++;return {committed:true,sequence:payload.sequence};},
  controlFor:peer=>{assert.equal(peer.channel,4);return control;}});
 const client=new ReliableStream({retryMs:2,open:()=>{
  opens++;const {port1,port2}=new MessageChannel(),a=new MessagePortStream(port1),b=new MessagePortStream(port2);
  for(const s of [a,b]){sockets.add(s);s.on('close',()=>sockets.delete(s));}
  if(cut==='after-work'&&!cutOnce){const write=a._write.bind(a);a._write=(bytes,encoding,callback)=>{
   const frame=JSON.parse(bytes.subarray(4));if(frame.type==='control_result'){cutOnce=true;callback();a.destroy();return;}write(bytes,encoding,callback);
  };}
  server.emit('connection',b);return a;
 },handshake:()=>({proof:'fixture'}),control:async(method,payload)=>{
  calls++;assert.equal(method,'freeze');const receipt=await client.request('checkpoint',{sequence:7});
  assert.equal(receipt.committed,true);
  if(cut==='during-work'){client.socket.destroy();await barrier;}
  return {frozen:payload.actor,finalSequence:receipt.sequence};
 }});
 t.after(()=>{allowFinish();control.close();client.close();for(const s of sockets)s.destroy();server.close();});
 client.start();await until(()=>client.ready);
 const result=control.request('freeze',{actor:'player-4'},{id:'freeze-1'});
 if(cut==='during-work'){await until(()=>opens>=2&&client.ready);allowFinish();}
 assert.deepEqual(await result,{frozen:'player-4',finalSequence:7});
 assert.equal(calls,1);assert.equal(checkpoints,1);assert.equal(opens,2);assert.equal(auths,2);
 assert.equal(control.pending.size,0);assert.equal(client.pending.size,0);
 assert.deepEqual(await client.request('checkpoint',{sequence:8}),{committed:true,sequence:8});
 // A cached control result is a replay only for the identical request.
 assert.deepEqual(await control.request('freeze',{actor:'player-4'},{id:'freeze-1'}),{frozen:'player-4',finalSequence:7});assert.equal(calls,1);
});
