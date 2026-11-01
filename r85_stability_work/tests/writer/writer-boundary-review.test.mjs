import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {fixture,turns} from './freeze-fixture.mjs';
import {attachActorIsolation,actorIsolations} from '../../working/core511-source/scripts/core511/actor-isolation-proof.mjs';
import {demand,PROTOCOL} from '../../working/core511-source/scripts/core511/contract.mjs';
import {actorFaultIsolation} from '../../working/core511-source/scripts/core511/r48-options.mjs';
import {rewardRecoverySchedulerR52} from '../../working/core511-source/scripts/core511/r52-options.mjs';

const baseline=process.env.R85_TEST_BASELINE==='1';
const base=new URL(baseline?'../../working/core511-source/scripts/core511/':'../../working/core511-source/scripts/core511/',import.meta.url);
const {PermanentCoordinator}=await import(new URL('permanent-coordinator.mjs',base));
const {ActorIsolation}=await import(new URL('actor-isolation.mjs',base));
const {StreamControl,ReliableStream,framed}=await import(new URL('reliable-stream.mjs',base));
const {joinFreezeRequestsR85,unprovenFreezeR85}=baseline?{}:await import(new URL('freeze-outcomes-r85.mjs',base));

// The complete ChannelRuntime cannot boot until 42 exact source bodies arrive.
// Evaluate its unchanged control() method bytes in isolation, retaining the real
// flags/contract and real ResidentControl/StreamControl protocol below. The only
// injected ports are actor identity, command-book state, and cold-traffic events.
const channelPath=new URL('channel-runtime.mjs',base);
const channelBytes=readFileSync(channelPath),source=channelBytes.toString('utf8');
const start=source.indexOf(' async control(method,payload){'),end=source.indexOf('\n start(){',start);
assert(start>0&&end>start);
const failureModule=new URL('freeze-failure-r85.mjs',base);
const failureFacts=existsSync(failureModule)?await import(failureModule):{};
const control=Function('demand','actorFaultIsolation','rewardRecoverySchedulerR52','rejectPendingFreezeStartR85',
  'return ({'+source.slice(start,end)+'}).control;')(demand,actorFaultIsolation,rewardRecoverySchedulerR52,failureFacts.rejectPendingFreezeStartR85);

// Real production framing, child control serializer, and parent receiver.
// The transport itself is in memory; there are no sockets, processes, or live
// service calls. A private authenticated-connection identity is a fixture port.
async function connectWire(dispatch,t){
 const parent=new StreamControl(),socket=new EventEmitter(),frames=[];
 socket.destroyed=false;socket.writableNeedDrain=false;
 socket.destroy=()=>{if(!socket.destroyed){socket.destroyed=true;socket.emit('close');}};
 socket.write=bytes=>{
  assert.equal(bytes.readUInt32BE(0),bytes.length-4);const frame=JSON.parse(bytes.subarray(4).toString('utf8'));frames.push(frame);
  queueMicrotask(()=>{if(socket.destroyed)return;if(frame.type==='hello')socket.emit('data',framed({type:'ready',protocol:PROTOCOL}));else parent.receive(frame);});return true;
 };
 const child=new ReliableStream({open:()=>socket,handshake:()=>({}),control:dispatch});
 child.start();socket.emit('connect');await turns(20);
 // PROTOCOL is imported from the same production contract below; asserting
 // readiness makes a framing/handshake mismatch fail before any freeze call.
 assert.equal(child.ready,true,'real child stream handshake');
 parent.attach(frame=>queueMicrotask(()=>{if(!socket.destroyed)socket.emit('data',framed(frame));}));
 t.after(()=>{child.close();parent.close();});
 return {parent,child,frames,socket};
}

async function attachResidentWire(s,t){
 for(const row of s.controls.values()){
  const dispatch=(method,payload)=>{
   if(method==='freeze')return row.control.freeze(payload);
   if(method==='freeze_group')return row.control.freezeGroup(payload.requests);
   if(method==='refresh_frozen')return row.control.refresh(payload);
   if(method==='resume')return row.control.resume(payload);
   throw Error('unexpected '+method);
  };
  const {parent}=await connectWire(dispatch,t);row.stream=parent;row.request=(method,payload)=>parent.request(method,payload);
  row.endpoint={freeze:p=>row.request('freeze',p),freezeGroup:requests=>row.request('freeze_group',{requests}),refresh:p=>row.request('refresh_frozen',p),resume:p=>row.request('resume',p)};
 }
}

test('outer production control precheck must not manufacture a failed refresh for an unentered healthy member',async t=>{
 const s=fixture(PermanentCoordinator,{kinds:['pending','healthy','healthy'],channels:[1,1,2],Isolation:ActorIsolation});
 const confirmed=new Set();let raced=false,writes=0,error;
 for(const [channel,row]of s.controls){
  const runtime={peer:row.peer,coldTraffic:new Map(),channel:{control:row.control,identities:new Map()},commandRecovery:{hasActor:id=>confirmed.has(id)},
   holdColdTraffic:async requests=>{s.events.push('cold:'+requests.map(r=>r.id).join(','));for(const r of requests)runtime.coldTraffic.set(r.token,{...r});},releaseColdTraffic:r=>runtime.coldTraffic.delete(r.token),rates:{snapshot:()=>null}};
  const {parent:stream}=await connectWire(async(method,payload)=>{
   // This is after parent assertAvailable and before resident control dispatch.
   if(channel===1&&method==='freeze_group'&&!raced){
    raced=true;confirmed.add(s.ids[0]);s.players.get(s.ids[0]).suspended=true;
    s.isolation.unknownActors.set(s.ids[0],new Set([{owners:[{id:s.ids[0],owner:{...s.owners.get(s.ids[0])}}]}]));
   }
   return control.call(runtime,method,payload);
  },t);row.stream=stream;
  row.request=(method,payload)=>stream.request(method,payload);
  row.endpoint={freeze:p=>row.request('freeze',p),freezeGroup:requests=>row.request('freeze_group',{requests}),refresh:p=>row.request('refresh_frozen',p),resume:p=>row.request('resume',p)};
 }
 const pending=s.permanent.permanentPlayers(s.ids,()=>writes++).catch(e=>error=e);
 await turns(100);for(const id of s.ids)s.release(id);await pending;
 const evidence={controlSourceSha256:createHash('sha256').update(channelBytes).digest('hex'),writes,...s.outcome(error)};
 t.diagnostic(JSON.stringify(evidence));
 assert.equal(writes,0);assert.equal(error.code,'actor_command_pending');
 assert.equal(s.players.get(s.ids[1]).suspended,false);
 assert.equal(s.players.get(s.ids[2]).suspended,false);
 assert.equal(s.permanent.entries.size,0);assert.deepEqual(s.faults,[]);
});

test('one tracked pending member must not classify another untracked member in the same RPC as known',async t=>{
 const s=fixture(PermanentCoordinator,{kinds:['pending','pending','healthy'],channels:[1,1,2],Isolation:ActorIsolation});
 await attachResidentWire(s,t);
 // A parent status may clear one exact unknown before the channel receives its
 // acknowledgement. Retain actor-1 but remove actor-2 at registration here to
 // model the resulting parent/child command-book skew without mutating owners.
 const registry=s.isolation.unknownActors,originalSet=registry.set.bind(registry);
 registry.set=(id,value)=>id===s.ids[1]?registry:originalSet(id,value);
 let settled=false,writes=0,error;
 const pending=s.permanent.permanentPlayers(s.ids,()=>writes++).catch(e=>error=e).finally(()=>settled=true);
 await turns(100);s.release(s.ids[0]);s.release(s.ids[1]);await turns(200);
 const beforeSiblingRelease={settled,faults:[...s.faults],tracked:[...registry.keys()],phases:[...s.permanent.entries].map(([id,row])=>({id,phase:row.phase}))};
 // Clean up all observed Promises before asserting the prompt-failure property.
 s.release(s.ids[2]);await pending;
 t.diagnostic(JSON.stringify({beforeSiblingRelease,writes,...s.outcome(error)}));
 assert.equal(beforeSiblingRelease.settled,true,'an untracked group member must trigger fenced recovery before its hung sibling answers');
 assert.equal(writes,0);
});

test('a private unproven failure cannot regain a stopped proof when it crosses the real child serializer',{skip:baseline?'R85 helper-only safety regression; not present in R84':false},async t=>{
 const request={id:'actor-1',epoch:1,token:'freeze-token-one'},original=attachActorIsolation(Object.assign(Error('actor_command_pending'),{code:'actor_command_pending'}),
  {actor:request.id,epoch:request.epoch,freezeToken:request.token,token:'quarantine-token-one',channel:1,incarnation:'boot-1',stopped:true,finalSequence:0});
 let marked;await joinFreezeRequestsR85([Promise.reject(original)],{knownPending:()=>false}).catch(e=>marked=e);
 assert.equal(unprovenFreezeR85(marked),true);assert.equal(actorIsolations(marked).length,1,'precondition: the same error has a prior stopped fact');
 const {parent,frames}=await connectWire(()=>{throw marked;},t);let received;
 await parent.request('freeze',request).catch(e=>received=e);
 const reply=frames.find(f=>f.type==='control_result');
 t.diagnostic(JSON.stringify({wireKeys:Object.keys(reply),receivedCode:received?.code,receivedStoppedFacts:actorIsolations(received).length}));
 assert.equal(received.code,'actor_command_pending');assert.equal(actorIsolations(received).length,0);
 assert.equal(Object.hasOwn(reply,'actorIsolation'),false);assert.equal(Object.hasOwn(reply,'freezeFailureR85'),false);
});

test('actual admit_held wrapper returns its coded pending failure without leaking inner freeze facts or destroying transport',async t=>{
 const s=fixture(PermanentCoordinator,{kinds:['pending'],channels:[1],Isolation:ActorIsolation}),row=s.controls.get(1),admitted=[];
 const runtime={peer:row.peer,coldTraffic:new Map(),commandRecovery:{hasActor:id=>id===s.ids[0]},sessions:{update:()=>{},check:()=>true},rates:{snapshot:()=>null},
  channel:{control:row.control,identities:new Map(),owners:new Map(),admit(bundle,identity){admitted.push(identity.actor);this.owners.set(identity.actor,{epoch:identity.epoch});}},
  holdColdTraffic:async()=>{throw Error('precheck must precede cold traffic');},releaseColdTraffic:()=>{}};
 runtime.control=(method,payload)=>control.call(runtime,method,payload);
 const identity={actor:s.ids[0],epoch:1,session:'test-session'},payload={identity,security:{...identity},bundle:{player:{id:identity.actor}},frozen:{id:identity.actor,epoch:1,token:'nested-freeze-token'}};
 const {parent,child,frames,socket}=await connectWire(runtime.control,t);let received,settled=false;
 const pending=parent.request('admit_held',payload).catch(e=>received=e).finally(()=>settled=true);
 await turns(200);
 const beforeCleanup={settled,transportDestroyed:socket.destroyed,replies:frames.filter(f=>f.type==='control_result')};
 // A serializer regression can leave the parent RPC pending for replay; stop
 // fixture transport explicitly rather than waiting for a production timeout.
 if(!settled){child.close();parent.close();}await pending;
 t.diagnostic(JSON.stringify({baseline,admitted,beforeCleanup,receivedCode:received?.code}));
 assert.equal(beforeCleanup.settled,true,'wrapper must answer its original RPC');assert.equal(beforeCleanup.transportDestroyed,false);
 assert.equal(received?.code,'actor_command_pending');assert.deepEqual(admitted,[identity.actor]);
 const reply=beforeCleanup.replies[0];assert(reply);assert.equal(Object.hasOwn(reply,'freezeFailureR85'),false);assert.equal(Object.hasOwn(reply,'actorIsolation'),false);
});
