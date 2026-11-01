import test from 'node:test';
import assert from 'node:assert/strict';
import {StreamControl} from '../../working/core511-source/scripts/core511/reliable-stream.mjs';
import {ActorIsolation} from '../../working/core511-source/scripts/core511/actor-isolation.mjs';
import {attachActorIsolation} from '../../working/core511-source/scripts/core511/actor-isolation-proof.mjs';
import {attachFreezeFailuresR85,freezeFailuresR85,receiveFreezeFailureR85,controlFreezeFailureForR85,rejectPendingFreezeStartR85} from '../../working/core511-source/scripts/core511/freeze-failure-r85.mjs';
const requests=[{id:'actor-a',epoch:3,token:'freeze-token-a'},{id:'actor-b',epoch:3,token:'freeze-token-b'}];
const facts=requests.map((r,i)=>({actor:r.id,epoch:r.epoch,freezeToken:r.token,channel:1,incarnation:'boot-exact',stage:'not_started',pending:i===0}));
const fresh=()=>Object.assign(Error('actor_command_pending'),{code:'actor_command_pending'});
const clone=value=>JSON.parse(JSON.stringify(value));

test('malformed, incomplete, and request-mismatched facts are rejected by the real parent control receiver',async()=>{
 const cases=[
  ['wrong freeze token',rows=>rows[0].freezeToken='different-token'],
  ['wrong epoch',rows=>rows[0].epoch++],
  ['wrong actor',rows=>rows[0].actor='other-actor'],
  ['duplicate actor',rows=>rows[1]={...rows[0]}],
  ['partial not-started group',rows=>rows.pop()],
  ['mixed not-started and started stages',rows=>{rows[0].stage='pending_command';}],
  ['missing pending member',rows=>{for(const row of rows)row.pending=false;}],
  ['wrong status type',rows=>{rows[0].pending='true';}],
 ];
 for(const [name,change]of cases){
  const stream=new StreamControl();let frame,received;stream.attach(f=>frame=f);
  const pending=stream.request('freeze_group',{requests}).catch(e=>received=e);
  const rows=clone(facts);change(rows);
  assert.throws(()=>stream.receive({type:'control_result',id:frame.id,ok:false,code:'actor_command_pending',freezeFailureR85:rows}),e=>/^invalid_freeze_failure/.test(e.code),name);
  assert.equal(stream.pending.size,1,name+' must not settle as a known refusal');stream.close();await pending;
  assert.equal(received.code,'ipc_control_outcome_unknown');assert.equal(freezeFailuresR85(received).length,0);
 }
});

function ownerFixture(){
 const owners=new Map(requests.map(r=>[r.id,{epoch:r.epoch,channel:1,incarnation:'boot-exact',state:'active'}]));
 const touches=[],held=requests.map(r=>({id:r.id,token:r.token,owner:{...owners.get(r.id)},phase:'freezing',endpoint:{refresh(){touches.push('refresh:'+r.id);throw Error('must not refresh invalid proof');}}}));
 const store=new Map(held.map(r=>[r.id,r])),core={authority:{owner:id=>owners.get(id)},permanent:{entries:store}};
 const isolation=new ActorIsolation(core);isolation.unknownActors.set('actor-a',new Set([{owners:[{id:'actor-a',owner:{...owners.get('actor-a')}}]}]));
 return {owners,touches,held,store,isolation};
}

test('per-actor facts require every exact current owner and every exact pending registry row',async()=>{
 const cases=[
  ['pending owner moved',s=>s.owners.get('actor-a').incarnation='replacement'],
  ['unstarted healthy owner moved',s=>s.owners.get('actor-b').epoch++],
  ['pending registry missing',s=>s.isolation.unknownActors.delete('actor-a')],
  ['pending registry stale',s=>[...s.isolation.unknownActors.get('actor-a')][0].owners[0].owner.epoch--],
  ['parent freeze token replaced',s=>{s.held[1].token='replacement-token';}],
 ];
 for(const [name,change]of cases){
  const s=ownerFixture(),error=receiveFreezeFailureR85(fresh(),clone(facts),'freeze_group',{requests});change(s);
  assert.equal(s.isolation.pendingFreeze(s.held,error),false,name);
  assert.equal(await s.isolation.rejectFreeze(s.held,error),false,name);
  assert.equal(s.store.size,2,name);assert.deepEqual(s.touches,[],name);
 }
});

test('a public error field or status code alone does not create private freeze evidence',async()=>{
 const s=ownerFixture(),error=Object.assign(fresh(),{freezeFailureR85:clone(facts),freezeFailuresR85:clone(facts)});
 assert.equal(freezeFailuresR85(error).length,0);assert.equal(s.isolation.pendingFreeze(s.held,error),false);
 assert.equal(await s.isolation.rejectFreeze(s.held,error),false);assert.equal(s.store.size,2);assert.deepEqual(s.touches,[]);
});

test('stopped-owner evidence cannot also identify the same actor as pending or not-started',()=>{
 const stopped={actor:'actor-a',epoch:3,freezeToken:'freeze-token-a',token:'quarantine-token-a',channel:1,incarnation:'boot-exact',stopped:true,finalSequence:0};
 const error=attachActorIsolation(fresh(),stopped);
 assert.throws(()=>receiveFreezeFailureR85(error,clone(facts),'freeze_group',{requests}),{code:'invalid_freeze_failure_overlap_r85'});
 const outgoing=attachFreezeFailuresR85(attachActorIsolation(fresh(),stopped),clone(facts));
 assert.throws(()=>controlFreezeFailureForR85(outgoing,'freeze_group',{requests}),{code:'invalid_freeze_failure_overlap_r85'});
 const s=ownerFixture();assert.equal(s.isolation.pendingFreeze(s.held,outgoing),false);
});

test('outer runtime never certifies not-started if a resident entry, completed token, or traffic hold already exists',()=>{
 for(const existing of ['resident','completed','traffic']){
  const runtime={peer:{channel:1,incarnation:'boot-exact'},commandRecovery:{hasActor:id=>id==='actor-a'},coldTraffic:new Map(),channel:{control:{validate:r=>assert(requests.includes(r)),entries:new Map(),completed:new Map()}}};
  if(existing==='resident')runtime.channel.control.entries.set('actor-b',{});
  if(existing==='completed')runtime.channel.control.completed.set('freeze-token-b',{});
  if(existing==='traffic')runtime.coldTraffic.set('traffic-token',{id:'actor-b'});
  let error;try{rejectPendingFreezeStartR85(runtime,requests);}catch(e){error=e;}
  assert.equal(error?.code,'actor_command_pending',existing);assert.equal(freezeFailuresR85(error).length,0,existing);
 }
});

test('valid not-started facts can clear only original parent entries without refresh, resume, or a native write',async()=>{
 const s=ownerFixture(),error=receiveFreezeFailureR85(fresh(),clone(facts),'freeze_group',{requests});
 assert.equal(s.isolation.pendingFreeze(s.held,error),true);
 assert.equal(await s.isolation.rejectFreeze(s.held,error),true);
 assert.equal(s.store.size,0);assert.deepEqual(s.touches,[]);assert.equal(s.isolation.unknownActors.has('actor-a'),true);
});

test('parent rejects positive freeze facts attached to a non-freeze admit_held wrapper reply',async()=>{
 const stream=new StreamControl();let frame,received;stream.attach(f=>frame=f);
 const pending=stream.request('admit_held',{frozen:requests[0]}).catch(e=>received=e);
 assert.throws(()=>stream.receive({type:'control_result',id:frame.id,ok:false,code:'actor_command_pending',freezeFailureR85:[{...facts[0]}]}),{code:'invalid_freeze_failure_scope_r85'});
 assert.equal(stream.pending.size,1);stream.close();await pending;
 assert.equal(received.code,'ipc_control_outcome_unknown');assert.equal(freezeFailuresR85(received).length,0);
});
