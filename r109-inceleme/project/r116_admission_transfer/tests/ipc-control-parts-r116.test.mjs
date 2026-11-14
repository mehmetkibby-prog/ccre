import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createHash,randomBytes} from 'node:crypto';
import {MessageChannel} from 'node:worker_threads';
import {ReliableStream,StreamControl,createStreamServer,framed} from '../../r109_latency_completion/working/core511-source/scripts/core511/reliable-stream.mjs';
import {ProcessStream} from '../../r109_latency_completion/working/core511-source/scripts/core511/process-stream.mjs';
import {MessagePortStream} from '../../r109_latency_completion/working/core511-source/scripts/core511/message-port-stream.mjs';
import {CONTROL_PART_BYTES_R116,CONTROL_LIMIT_R116,CONTROL_CACHE_R116,controlPartsMethodR116,prepareControlPartsR116,takeControlPartR116,controlFingerprintR116,ControlPartsReceiverR116} from '../../r109_latency_completion/working/core511-source/scripts/core511/ipc-control-parts-r116.mjs';

const FRAME=1048576,hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const methods=['admit','admit_held','admit_passive','global_admit','shared_admit','rebind'];
const until=async(predicate,ms=5000)=>{const end=performance.now()+ms;while(!predicate()){if(performance.now()>end)throw Error('R116 transport test timed out');await new Promise(resolve=>setTimeout(resolve,2));}};
const controlFrame=(id='snapshot',method='admit',payload={text:'x'.repeat(FRAME+17)})=>({type:'control',id,method,payload});
function sizedFrame(size,id='snapshot',method='admit'){
 const frame=controlFrame(id,method,{text:''});frame.payload.text='x'.repeat(size-Buffer.byteLength(JSON.stringify(frame)));return frame;
}
const prepare=frame=>prepareControlPartsR116(frame,JSON.stringify(frame));
function finish(receiver,parts,mutate=frame=>frame){
 let answer;do{answer=receiver.append(mutate(takeControlPartR116(parts,parts.header.id,parts.index)));}while(answer.request);return answer.frame;
}
function rawParts(frame,bytes){
 return {buffer:bytes,index:0,header:{type:'control_parts',id:frame.id,method:frame.method,bytes:bytes.length,sha256:hash(bytes)}};
}

test('R116 admission snapshots round trip exact JSON and UTF8 through bounded frames',()=>{
 const payload={bundle:{player:{id:'actor-ö'},projection:{data:{text:randomBytes(850000).toString('base64'),unicode:'ö漢字😀\u0000\ud800'}}},identity:{actor:'actor-ö',epoch:4},security:{epoch:4},rates:{used:7},frozen:{token:'same-frozen-token'}};
 for(const method of methods){
  assert.equal(controlPartsMethodR116(method),true);
  const frame=controlFrame('same-snapshot',method,payload),parts=prepare(frame),receiver=new ControlPartsReceiverR116();
  assert.deepEqual(receiver.begin(parts.header),{type:'control_part_request',id:frame.id,index:0});
  const result=finish(receiver,parts,part=>{assert(framed(part).readUInt32BE()<=FRAME);return part;});
  assert.deepEqual(result,frame);assert.equal(receiver.bytes,0);assert.equal(receiver.rows.size,0);
  assert.throws(()=>takeControlPartR116(parts,frame.id,parts.index),{code:'ipc_control_part_order'});
 }
});

test('R116 keeps the original frame cap and allows only bounded cold admission snapshots',()=>{
 assert.doesNotThrow(()=>framed(sizedFrame(FRAME)));
 assert.throws(()=>framed(sizedFrame(FRAME+1)),{code:'ipc_frame_size'});
 for(const size of [FRAME+1,CONTROL_LIMIT_R116]){
  const frame=sizedFrame(size),parts=prepare(frame),receiver=new ControlPartsReceiverR116();
  assert.equal(parts.buffer.length,size);receiver.begin(parts.header);assert.deepEqual(finish(receiver,parts),frame);
 }
 for(const size of [FRAME,CONTROL_LIMIT_R116+1])assert.throws(()=>prepare(sizedFrame(size)),{code:'ipc_control_parts_size'});
 for(const method of ['command','command_status','read_actor','read_channel_refresh','freeze','refresh_frozen','global_refresh','session','metrics','admit_more']){
  assert.equal(controlPartsMethodR116(method),false);
  assert.throws(()=>prepare(controlFrame('other',method)),{code:'ipc_control_parts_scope'});
 }
 for(const id of ['',1,'x'.repeat(161)])assert.throws(()=>prepare(controlFrame(id)),{code:'ipc_control_parts_scope'});
});

test('R116 rejects malformed headers before allocation and bounds aggregate receiver memory',()=>{
 const receiver=new ControlPartsReceiverR116(),header=prepare(controlFrame()).header;
 for(const patch of [{type:'control'},{method:'command'},{id:''},{id:3},{id:'x'.repeat(161)},{bytes:0},{bytes:-1},{bytes:FRAME},{bytes:FRAME+.5},{bytes:CONTROL_LIMIT_R116+1},{bytes:NaN},{sha256:'a'.repeat(63)},{sha256:'A'.repeat(64)},{sha256:null},{extra:true}]){
  assert.throws(()=>receiver.begin({...header,...patch}),{code:'ipc_control_parts_scope'});assert.equal(receiver.bytes,0);assert.equal(receiver.rows.size,0);
 }
 assert.throws(()=>receiver.begin(null),{code:'ipc_control_parts_scope'});
 for(let i=0;i<4;i++)receiver.begin({...header,id:'held-'+i,bytes:CONTROL_LIMIT_R116});
 assert.equal(receiver.bytes,CONTROL_CACHE_R116);assert.equal(receiver.rows.size,4);
 assert.throws(()=>receiver.begin({...header,id:'overflow'}),{code:'ipc_control_parts_capacity'});
 assert.throws(()=>receiver.begin({...header,id:'held-0'}),{code:'ipc_control_parts_capacity'});
 receiver.clear();assert.equal(receiver.bytes,0);assert.equal(receiver.rows.size,0);
 receiver.begin(header);receiver.clear();assert.equal(receiver.bytes,0);
});

test('R116 rejects out-of-order, duplicate, malformed and noncanonical parts',()=>{
 const parts=prepare(controlFrame()),receiver=new ControlPartsReceiverR116();receiver.begin(parts.header);
 assert.throws(()=>takeControlPartR116(parts,'wrong',0),{code:'ipc_control_part_order'});
 assert.throws(()=>takeControlPartR116(parts,parts.header.id,1),{code:'ipc_control_part_order'});
 const first=takeControlPartR116(parts,parts.header.id,0);
 for(const patch of [{type:'result_part'},{id:'absent'},{index:-1},{index:.5},{index:1},{index:NaN},{bytes:null},{bytes:'!'},{bytes:first.bytes.slice(1)},{bytes:first.bytes+'AAAA'},{extra:true}]){
  assert.throws(()=>receiver.append({...first,...patch}),error=>['ipc_control_part_frame','ipc_control_part_size'].includes(error.code));
 }
 assert.equal(receiver.append(first).request.index,1);
 assert.throws(()=>receiver.append(first),{code:'ipc_control_part_frame'});
 assert.throws(()=>takeControlPartR116(parts,parts.header.id,0),{code:'ipc_control_part_order'});
 receiver.clear();assert.equal(receiver.bytes,0);
 // A legal-looking but noncanonical padding bit must not decode as an accepted byte.
 const padded=prepare(sizedFrame(CONTROL_PART_BYTES_R116*6+1)),paddedReceiver=new ControlPartsReceiverR116();paddedReceiver.begin(padded.header);
 for(let i=0;i<6;i++)paddedReceiver.append(takeControlPartR116(padded,padded.header.id,i));
 const last=takeControlPartR116(padded,padded.header.id,6),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 assert.equal(last.bytes.length,4);const altered={...last,bytes:last.bytes[0]+alphabet[alphabet.indexOf(last.bytes[1])+1]+'=='};
 assert.deepEqual(Buffer.from(altered.bytes,'base64'),Buffer.from(last.bytes,'base64'));
 assert.throws(()=>paddedReceiver.append(altered),{code:'ipc_control_part_size'});paddedReceiver.clear();
});

test('R116 verifies integrity, UTF8, JSON and complete control identity before dispatch',()=>{
 const original=controlFrame(),serialized=Buffer.from(JSON.stringify(original));
 for(const kind of ['hash','utf8','json','id','method','type','extra','missing-payload']){
  let bytes=Buffer.from(serialized),expected;
  if(kind==='hash'){bytes[bytes.length-5]^=1;expected='ipc_control_parts_integrity';}
  else if(kind==='utf8'){bytes[bytes.length-5]=255;expected='ipc_control_parts_encoding';}
  else if(kind==='json'){bytes[0]=91;expected='ipc_control_parts_encoding';}
  else{
   const value=JSON.parse(serialized);
   if(kind==='id')value.id='other';else if(kind==='method')value.method='rebind';else if(kind==='type')value.type='request';else if(kind==='extra')value.extra=true;else{value.padding=value.payload;delete value.payload;}
   bytes=Buffer.from(JSON.stringify(value));expected='ipc_control_parts_identity';
  }
  const parts=rawParts(original,bytes);if(kind==='hash')parts.header.sha256=hash(serialized);
  const receiver=new ControlPartsReceiverR116();receiver.begin(parts.header);
  assert.throws(()=>finish(receiver,parts),{code:expected},kind);assert.equal(receiver.bytes,0);assert.equal(receiver.rows.size,0);
 }
});

test('R116 replay fingerprints remain bounded and distinguish method and payload',()=>{
 assert.equal(controlFingerprintR116('admit',{a:1}),JSON.stringify(['admit',{a:1}]));
 const large={text:'漢😀'.repeat(50000)},first=controlFingerprintR116('admit',large);
 assert.match(first,/^sha256:[a-f0-9]{64}$/);assert.equal(first,controlFingerprintR116('admit',structuredClone(large)));
 assert.notEqual(first,controlFingerprintR116('rebind',large));assert.notEqual(first,controlFingerprintR116('admit',{...large,last:true}));
});

test('R116 StreamControl rejects unsupported or excessive snapshots before sending and releases every retained byte',async()=>{
 const control=new StreamControl(),sent=[];control.attach(frame=>sent.push(frame));
 assert.throws(()=>control.request('admit',sizedFrame(CONTROL_LIMIT_R116+1,'large').payload,{id:'large'}),{code:'ipc_control_parts_size'});
 assert.throws(()=>control.request('command',controlFrame().payload),{code:'ipc_frame_size'});
 assert.throws(()=>control.request('admit',controlFrame().payload,{timeoutMs:1}),{code:'ipc_control_timeout_scope'});
 assert.equal(control.pending.size,0);assert.equal(control.partBytesR116,0);assert.equal(sent.length,0);
 const payload=sizedFrame(CONTROL_LIMIT_R116,'p0').payload,promises=[];
 for(let i=0;i<4;i++){const promise=control.request('admit',payload,{id:'p'+i});promises.push(promise);void promise.catch(()=>{});}
 assert.equal(control.partBytesR116,CONTROL_CACHE_R116);assert(sent.every(frame=>frame.type==='control_parts'));
 assert.throws(()=>control.request('admit',payload,{id:'p4'}),{code:'ipc_control_parts_capacity'});assert.equal(control.pending.size,4);
 control.receive({type:'control_result',id:'p0',ok:true,value:{admitted:true}});assert.deepEqual(await promises.shift(),{admitted:true});assert.equal(control.partBytesR116,CONTROL_CACHE_R116-CONTROL_LIMIT_R116);
 control.receive({type:'control_result',id:'p0',ok:true,value:{admitted:true}});assert.equal(control.partBytesR116,CONTROL_CACHE_R116-CONTROL_LIMIT_R116);
 const replacement=control.request('admit',payload,{id:'p4'});void replacement.catch(()=>{});promises.push(replacement);assert.equal(control.partBytesR116,CONTROL_CACHE_R116);
 control.receive({type:'control_result',id:'p1',ok:false,code:'channel_admission_security'});await assert.rejects(promises.shift(),{code:'channel_admission_security'});assert.equal(control.partBytesR116,CONTROL_CACHE_R116-CONTROL_LIMIT_R116);
 const rejected=promises.map(promise=>assert.rejects(promise,{code:'ipc_control_outcome_unknown'}));control.close();await Promise.all(rejected);
 assert.equal(control.partBytesR116,0);assert.equal(control.pending.size,0);assert.throws(()=>control.partR116('p4',0),{code:'ipc_control_part_order'});
});

function wireFrames(message){
 if(message?.type!=='kernel511-bytes'||!message.bytes)return [];
 const bytes=Buffer.from(message.bytes),frames=[];let offset=0;
 while(offset<bytes.length){const length=bytes.readUInt32BE(offset);assert(length>0&&length<=FRAME);frames.push(JSON.parse(bytes.toString('utf8',offset+4,offset+4+length)));offset+=length+4;}
 assert.equal(offset,bytes.length);return frames;
}
// Use the actual ProcessStream transport. These peers emulate advanced Node IPC:
// send clones each message and completes its callback only after asynchronous delivery.
function processPair(inspect,stream='kernel511'){
 const parentPeer=new EventEmitter(),childPeer=new EventEmitter();let closed=false;
 const pair={cut(){if(closed)return;closed=true;for(const peer of [parentPeer,childPeer]){peer.connected=false;peer.emit('disconnect');}}};
 for(const [peer,other,direction]of [[parentPeer,childPeer,'parent'],[childPeer,parentPeer,'child']]){
  peer.connected=true;peer.send=(message,callback)=>{const copied=structuredClone(message);setImmediate(()=>{
   if(closed){callback(Error('test_ipc_disconnected'));return;}
   const action=inspect?.({direction,frames:wireFrames(copied),pair});
   if(action==='cut'){callback();pair.cut();return;}
   if(action!=='drop')other.emit('message',copied);callback();
  });};
 }
 pair.parent=new ProcessStream(parentPeer,{connect:false,stream});pair.child=new ProcessStream(childPeer,{stream});
 for(const socket of [pair.parent,pair.child])socket.on('close',()=>pair.cut());return pair;
}
async function harness(t,{handler,inspect,stream='kernel511',messagePort=false}={}){
 const control=new StreamControl(),pairs=[],observed={opens:0,auths:0,calls:0,writes:0,frames:[],errors:[]};let client;
 const server=createStreamServer({authenticate:hello=>{assert.equal(hello.proof,'r116-test-proof');observed.auths++;return {channel:1,incarnation:'same-process'};},controlFor:()=>control,dispatch:(_,method,payload)=>{assert.equal(method,'checkpoint');observed.writes++;return {committed:true,sequence:payload.sequence};}});
 const state={control,pairs,observed,get client(){return client;}};
 client=new ReliableStream({retryMs:2,open:()=>{
  observed.opens++;let pair;
  if(messagePort){const {port1,port2}=new MessageChannel();pair={parent:new MessagePortStream(port1),child:new MessagePortStream(port2)};pair.cut=()=>{pair.parent.destroy();pair.child.destroy();};}
  else pair=processPair(info=>{for(const frame of info.frames)observed.frames.push({direction:info.direction,type:frame.type,id:frame.id,index:frame.index});return inspect?.({...info,...state});},stream);
  pairs.push(pair);server.emit('connection',pair.parent);return pair.child;
 },handshake:()=>({proof:'r116-test-proof'}),onState:(name,code)=>{if(name==='error')observed.errors.push(code);},control:async(method,payload,id)=>{observed.calls++;return handler?handler({...state,method,payload,id}):{admitted:true,epoch:payload.identity?.epoch??1};}});
 t.after(()=>{client.close();control.close();for(const pair of pairs)pair.cut();server.close();});client.start();await until(()=>client.ready);return state;
}
const largePayload=()=>({bundle:{player:{id:'player'},projection:{data:{noise:randomBytes(850000).toString('base64'),unicode:'İö漢字😀'}}},identity:{actor:'player',epoch:7},security:{actor:'player',epoch:7},rates:{used:3}});

test('R116 actual ProcessStream path preserves immutable snapshot, interleaved requests and replay result',async t=>{
 const payload=largePayload(),expected=structuredClone(payload),s=await harness(t,{handler:async({client,method,payload,id})=>{assert.equal(method,'admit');assert.equal(id,'stable-admission');assert.deepEqual(payload,expected);return client.request('checkpoint',{sequence:9});}});
 const pending=s.control.request('admit',payload,{id:'stable-admission'});payload.bundle.projection.data.noise='mutated after request';
 assert.deepEqual(await pending,{committed:true,sequence:9});assert.equal(s.observed.calls,1);assert.equal(s.observed.writes,1);assert.equal(s.control.pending.size,0);assert.equal(s.control.partBytesR116,0);
 assert.deepEqual(await s.control.request('admit',expected,{id:'stable-admission'}),{committed:true,sequence:9});assert.equal(s.observed.calls,1);assert.equal(s.observed.writes,1);
 assert.equal(s.client.controlCompleted.get('stable-admission').fingerprint.length,71);
 for(const type of ['control_parts','control_part','control_part_request','control_result','request','result'])assert(s.observed.frames.some(row=>row.type===type),type);
 assert.equal(s.observed.errors.length,0);
});

for(const cut of ['after-header','mid-parts','final-part','during-handler','lost-ack'])test('R116 disconnect '+cut+' replays one admission and one side effect',{timeout:15000},async t=>{
 const payload=largePayload(),expected=structuredClone(payload);let interrupted=false,release;const gate=new Promise(resolve=>release=resolve);t.after(()=>release());
 const s=await harness(t,{inspect:({direction,frames})=>{
  if(interrupted)return;
  const selected=cut==='after-header'?direction==='child'&&frames.some(f=>f.type==='control_part_request'&&f.index===0):cut==='mid-parts'?direction==='parent'&&frames.some(f=>f.type==='control_part'&&f.index===2):cut==='final-part'?direction==='parent'&&frames.some(f=>f.type==='control_part'&&Buffer.from(f.bytes,'base64').length<CONTROL_PART_BYTES_R116):cut==='lost-ack'?direction==='child'&&frames.some(f=>f.type==='control_result'):false;
  if(selected){interrupted=true;return 'cut';}
 },handler:async({client,pairs,method,payload,id})=>{
  assert.equal(method,'admit');assert.equal(id,'admission-'+cut);assert.deepEqual(payload,expected);
  const result=await client.request('checkpoint',{sequence:11});
  if(cut==='during-handler'&&!interrupted){interrupted=true;pairs.at(-1).cut();await gate;}
  return {admitted:true,sequence:result.sequence};
 }});
 const result=s.control.request('admit',payload,{id:'admission-'+cut});
 await until(()=>interrupted&&s.observed.opens>=2&&s.client.ready);
 // Replay must use the retained initial bytes even when its caller has changed objects.
 payload.bundle.projection.data.noise='caller changed during reconnect';release();
 assert.deepEqual(await result,{admitted:true,sequence:11});assert.equal(s.observed.calls,1);assert.equal(s.observed.writes,1);assert.equal(s.observed.opens,2);assert.equal(s.observed.auths,2);
 assert.equal(s.control.pending.size,0);assert.equal(s.control.partBytesR116,0);assert.equal(s.client.pending.size,0);assert.equal(s.observed.errors.length,0);
 assert.deepEqual(await s.client.request('checkpoint',{sequence:12}),{committed:true,sequence:12});
});

for(const encoding of ['fragmented','normal'])test('R116 completed ID cannot be reused with changed '+encoding+' payload',async t=>{
 const payload=largePayload(),s=await harness(t);await s.control.request('admit',payload,{id:'reused'});
 const changed=encoding==='fragmented'?{...payload,changed:true}:{identity:{epoch:99}};
 const pending=s.control.request('admit',changed,{id:'reused'}),rejected=assert.rejects(pending,{code:'ipc_control_outcome_unknown'});
 await until(()=>s.observed.errors.includes('ipc_control_id_reused'));s.client.close();s.control.close();await rejected;
 assert.equal(s.observed.calls,1);assert.equal(s.control.pending.size,0);assert.equal(s.control.partBytesR116,0);
});

test('R116 an executing control rejects a changed-payload replay before a second handler starts',async t=>{
 let release;const gate=new Promise(resolve=>release=resolve);t.after(()=>release());
 const s=await harness(t,{handler:async()=>{await gate;return {done:true};}}),pending=s.control.request('admit',largePayload(),{id:'executing'}),rejected=assert.rejects(pending,{code:'ipc_control_outcome_unknown'});
 await until(()=>s.observed.calls===1);
 s.pairs.at(-1).parent.write(framed(controlFrame('executing','admit',{changed:true})));
 await until(()=>s.observed.errors.includes('ipc_control_id_reused'));s.client.close();s.control.close();release();await rejected;
 assert.equal(s.observed.calls,1);assert.equal(s.control.partBytesR116,0);
});

test('R116 fragmented controls cannot dispatch before the authenticated ready handshake',async t=>{
 const parts=prepare(controlFrame('before-auth')),pairs=[],errors=[];let calls=0;
 const client=new ReliableStream({retryMs:2,open:()=>{const pair=processPair();pairs.push(pair);pair.parent.on('error',()=>{});pair.parent.write(framed(parts.header));return pair.child;},handshake:()=>({proof:'not-yet-authenticated'}),onState:(state,code)=>{if(state==='error')errors.push(code);},control:()=>{calls++;}});
 t.after(()=>{client.close();for(const pair of pairs)pair.cut();});client.start();await until(()=>errors.includes('ipc_auth_failed'));client.close();assert.equal(calls,0);
});

for(const mode of ['wrong-process-stream','message-port'])test('R116 large controls cannot use '+mode,async t=>{
 const s=await harness(t,{stream:mode==='wrong-process-stream'?'another-stream':'kernel511',messagePort:mode==='message-port'});
 const pending=s.control.request('admit',largePayload(),{id:'private-only'}),rejected=assert.rejects(pending,{code:'ipc_control_outcome_unknown'});
 await until(()=>s.observed.errors.includes('ipc_control_parts_transport'));s.client.close();s.control.close();await rejected;
 assert.equal(s.observed.calls,0);assert.equal(s.control.partBytesR116,0);
});

test('R116 ordinary small control frames and pending limit remain unchanged',async t=>{
 const s=await harness(t);assert.deepEqual(await s.control.request('admit',{identity:{epoch:2}},{id:'small'}),{admitted:true,epoch:2});
 assert(s.observed.frames.some(frame=>frame.type==='control'&&frame.id==='small'));assert(!s.observed.frames.some(frame=>frame.type==='control_parts'));assert.equal(s.control.partBytesR116,0);
 const bounded=new StreamControl({maxPending:1}),pending=bounded.request('admit',largePayload(),{id:'one'}),rejected=assert.rejects(pending,{code:'ipc_control_outcome_unknown'});
 assert.throws(()=>bounded.request('admit',largePayload(),{id:'two'}),{code:'ipc_control_backpressure'});bounded.close();await rejected;assert.equal(bounded.partBytesR116,0);
});

test('R116 preserves handler start order when later small controls follow a fragmented admission',async t=>{
 const order=[],s=await harness(t,{handler:({method,id})=>{order.push([method,id]);return {done:true};}});
 const firstPayload=largePayload();firstPayload.bundle.projection.data.extra='x'.repeat(FRAME);
 const admission=s.control.request('admit',firstPayload,{id:'earlier-admission'}),second=s.control.request('rebind',largePayload(),{id:'second-admission'}),revoke=s.control.request('revoke',{actor:'player',revision:8},{id:'later-revoke'});
 assert.deepEqual(await Promise.all([admission,second,revoke]),[{done:true},{done:true},{done:true}]);
 assert.deepEqual(order,[['admit','earlier-admission'],['rebind','second-admission'],['revoke','later-revoke']]);
});

test('R116 sends later controls after assembly without waiting for the first handler ACK',{timeout:5000},async t=>{
 let release;const gate=new Promise(resolve=>release=resolve),order=[];t.after(()=>release());
 const s=await harness(t,{handler:async({method})=>{order.push(method);if(method==='admit')await gate;else release();return {done:true};}});
 const first=s.control.request('admit',largePayload(),{id:'blocked-handler'}),second=s.control.request('revoke',{actor:'player',revision:8},{id:'release-handler'});
 assert.deepEqual(await Promise.all([first,second]),[{done:true},{done:true}]);assert.deepEqual(order,['admit','revoke']);assert.equal(s.control.partBytesR116,0);
});

test('R116 reconnect preserves the queued control order behind an interrupted snapshot',{timeout:10000},async t=>{
 let cut=false;const order=[],s=await harness(t,{inspect:({direction,frames})=>{if(!cut&&direction==='parent'&&frames.some(frame=>frame.type==='control_part'&&frame.index===2)){cut=true;return 'cut';}},handler:({id})=>{order.push(id);return {done:id};}});
 const requests=[s.control.request('admit',largePayload(),{id:'first'}),s.control.request('rebind',largePayload(),{id:'second'}),s.control.request('revoke',{actor:'player',revision:8},{id:'third'})];
 assert.deepEqual(await Promise.all(requests),[{done:'first'},{done:'second'},{done:'third'}]);assert.equal(cut,true);assert.equal(s.observed.opens,2);assert.equal(s.observed.calls,3);assert.deepEqual(order,['first','second','third']);assert.equal(s.control.partBytesR116,0);
});

test('R116 an earlier handler ACK cannot release a different snapshot barrier after reconnect',{timeout:10000},async t=>{
 let release,cut=false;const gate=new Promise(resolve=>release=resolve),order=[],barriers=[];t.after(()=>release());
 const s=await harness(t,{inspect:({direction,frames,observed,control})=>{
  if(observed.opens<2||direction!=='child')return;
  if(frames.some(frame=>frame.type==='control_part_request'&&frame.id==='second'&&frame.index===1))release();
  if(frames.some(frame=>frame.type==='control_result'&&frame.id==='first'))queueMicrotask(()=>barriers.push(control.sendingPartsR116));
 },handler:async({id,pairs,client})=>{
  order.push(id);
  if(id==='first'){await client.request('checkpoint',{sequence:1});if(!cut){cut=true;pairs.at(-1).cut();}await gate;}
  return {done:id};
 }});
 const secondPayload=largePayload();secondPayload.bundle.projection.data.extra='x'.repeat(FRAME);
 const requests=[s.control.request('admit',largePayload(),{id:'first'}),s.control.request('rebind',secondPayload,{id:'second'}),s.control.request('session',{revision:8},{id:'session'}),s.control.request('revoke',{actor:'player',revision:9},{id:'revoke'})];
 assert.deepEqual(await Promise.all(requests),[{done:'first'},{done:'second'},{done:'session'},{done:'revoke'}]);
 assert.equal(s.observed.opens,2);assert.equal(s.observed.calls,4);assert.equal(s.observed.writes,1);assert.deepEqual(order,['first','second','session','revoke']);assert.deepEqual(barriers,['second']);assert.equal(s.control.partBytesR116,0);assert.equal(s.control.sendingPartsR116,null);
});
