import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {ReliableStream,acceptStreamSocket,framed} from '../working/core511-source/scripts/core511/reliable-stream.mjs';
import {ProcessStream} from '../working/core511-source/scripts/core511/process-stream.mjs';
import {IpcReplay} from '../working/core511-source/scripts/core511/coordinator.mjs';
import {readPartsMethod} from '../working/core511-source/scripts/core511/ipc-read-parts.mjs';
const peer={realm:'r57-wire',channel:1,incarnation:'r57-wire-boot'};
async function pipe(t,dispatch,{stream='kernel511',cutAtPart=null}={}){
 const servers=[],wire={frames:0,maxBytes:0,parts:0,compressed:0,ready:0},states=[],replay=new IpcReplay();let client,cut=false;
 const inspect=(message,direction)=>{
  if(message.bytes===null)return;
  const bytes=Buffer.from(message.bytes);
  for(let at=0;at<bytes.length;){const size=bytes.readUInt32BE(at),frame=JSON.parse(bytes.subarray(at+4,at+4+size).toString('utf8'));assert(size<=1048576);wire.frames++;wire.maxBytes=Math.max(wire.maxBytes,size);if(direction==='reply'&&frame.replyWireR57)wire.compressed++;if(direction==='reply'&&frame.type==='result_part'){wire.parts++;if(cutAtPart!==null&&!cut&&wire.parts===cutAtPart){cut=true;queueMicrotask(()=>client.socket.destroy());return false;}}at+=size+4;}
  return true;
 };
 let ready;const connected=new Promise(resolve=>ready=resolve);
 client=new ReliableStream({retryMs:1,handshake:()=>peer,open:()=>{
  const a=new EventEmitter(),b=new EventEmitter();for(const p of [a,b])p.connected=true;
  a.send=(message,callback)=>queueMicrotask(()=>{if(inspect(message,'request')!==false)b.emit('message',message);callback?.();});
  b.send=(message,callback)=>queueMicrotask(()=>{if(inspect(message,'reply')!==false)a.emit('message',message);callback?.();});
  const server=new ProcessStream(b,{stream,connect:false});servers.push(server);
  acceptStreamSocket(server,{authenticate:hello=>hello.channel===peer.channel&&hello.incarnation===peer.incarnation?peer:null,dispatch:(p,method,payload,id)=>replay.run(id,method,payload,()=>dispatch(p,method,payload))});
  return new ProcessStream(a,{stream});
 },onState:(state,code)=>{states.push({state,code});if(state==='ready'){wire.ready++;ready();}}});
 t.after(()=>{client.close();for(const server of servers)server.destroy();});client.start();await connected;
 // This is exactly the production channel-process allowlist adapter.
 const request=(method,payload,options)=>client.request(method,payload,readPartsMethod(method)?{...options,readParts:true}:options);
 return {client,servers,wire,states,request};
}

test('negotiated process reply, reconnect replay and status retain exact result and one dispatch',async t=>{
 const value={key:'operation:1',result:{players:[{id:'p',data:'ö😀'.repeat(30000)}],events:[]}};let calls=0;
 const f=await pipe(t,(_peer,method)=>{calls++;return method==='command_status'?{status:'committed',ack:value}:value;});
 const id=f.client.requestPrefix+':1';assert.deepEqual(await f.request('command',{}, {id}),value);
 f.client.socket.destroy();assert.deepEqual(await f.request('command',{}, {id}),value);assert.equal(calls,1);
 assert.deepEqual(await f.request('command_status',{}, {id:f.client.requestPrefix+':2'}),{status:'committed',ack:value});assert.equal(calls,2);
 assert.equal(f.wire.compressed,process.env.CORE511_R57_REPLY_WIRE==='1'?3:0);assert(f.wire.maxBytes<1048576);
});
test('non-kernel stream and unrelated methods keep existing uncompressed replies',async t=>{
 const value={data:'x'.repeat(40000)};
 const other=await pipe(t,()=>value,{stream:'browser-forward'});assert.deepEqual(await other.request('command',{}),value);assert.equal(other.wire.compressed,0);
 const native=await pipe(t,()=>value);assert.deepEqual(await native.request('ping',{}),value);assert.equal(native.wire.compressed,0);
});

test('negotiated small reply serializes its value once; replies never share a mutable buffer',async t=>{
 let reads=0;
 const f=await pipe(t,(_peer,_method,payload)=>({get message(){reads++;return payload.text;}}));
 const input=['ilk ö😀','ikinci ğ'];
 const replies=await Promise.all(input.map(text=>f.request('command',{text})));
 assert.deepEqual(replies,input.map(message=>({message})));
 assert.equal(reads,2);
});

test('large committed replies still transfer in bounded parts and replay once after interrupted transfer',async t=>{
 const value={data:'ğ😀'.repeat(220000)};let calls=0;
 const f=await pipe(t,()=>{calls++;return value;},{cutAtPart:2});
 assert.deepEqual(await f.request('command',{}),value);
 assert.equal(calls,1);assert(f.wire.parts>2);assert(f.wire.ready>=2);assert(f.wire.maxBytes<=1048576);
});
test('reply above the bounded transfer limit fails without dispatching twice',async t=>{
 let calls=0;const f=await pipe(t,()=>{calls++;return {data:'x'.repeat(8388608)};});
 await assert.rejects(f.request('command',{}),e=>e.code==='ipc_frame_size');assert.equal(calls,1);
});
