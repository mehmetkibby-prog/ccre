import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './freeze-fixture.mjs';
import {PermanentCoordinator} from '../../working/core511-source/scripts/core511/permanent-coordinator.mjs';
import {ActorIsolation} from '../../working/core511-source/scripts/core511/actor-isolation.mjs';
import {attachActorIsolation} from '../../working/core511-source/scripts/core511/actor-isolation-proof.mjs';
import {attachFreezeFailuresR85,controlFreezeFailureForR85,receiveFreezeFailureR85,freezeFailuresR85,rejectPendingFreezeStartR85} from '../../working/core511-source/scripts/core511/freeze-failure-r85.mjs';

const pendingError=()=>Object.assign(Error('actor_command_pending'),{code:'actor_command_pending'});
const request={id:'actor-a',epoch:1,token:'freeze-token-a'};
const fact={actor:'actor-a',epoch:1,freezeToken:'freeze-token-a',channel:1,incarnation:'boot-1',stage:'pending_command',pending:true};

test('freeze facts cannot cross a different request, method, or malformed control scope',()=>{
 for(const [method,payload]of [['freeze',{...request,id:'another-actor'}],['freeze',{...request,epoch:2}],['freeze',{...request,token:'another-token'}],['admit',request],['freeze_group',{requests:[request,request]}]]){
  assert.throws(()=>receiveFreezeFailureR85(pendingError(),[fact],method,payload),{code:'invalid_freeze_failure_scope_r85'});
 }
 for(const patch of [{epoch:0},{freezeToken:'short'},{channel:0},{pending:'true'},{stage:'committed'},{stage:'pending_command',pending:false}]){
  assert.throws(()=>receiveFreezeFailureR85(pendingError(),[{...fact,...patch}],'freeze',request),{code:'invalid_freeze_failure_r85'});
 }
 assert.throws(()=>receiveFreezeFailureR85(Object.assign(Error('arbitrary_failed_write'),{code:'arbitrary_failed_write'}),[fact],'freeze',request),{code:'invalid_freeze_failure_code_r85'});
 assert.equal(controlFreezeFailureForR85(attachFreezeFailuresR85(pendingError(),[fact]),'admit_held',{frozen:request}),null);
});

test('a not-started group must attest the whole exact RPC and cannot include a started actor',()=>{
 const other={id:'actor-b',epoch:1,token:'freeze-token-b'},payload={requests:[request,other]},unstarted={...fact,stage:'not_started'};
 assert.throws(()=>receiveFreezeFailureR85(pendingError(),[unstarted],'freeze_group',payload),{code:'invalid_freeze_failure_scope_r85'});
 assert.throws(()=>receiveFreezeFailureR85(pendingError(),[unstarted,{...fact,actor:other.id,freezeToken:other.token}],'freeze_group',payload),{code:'invalid_freeze_failure_scope_r85'});
 const facts=[unstarted,{...unstarted,actor:other.id,freezeToken:other.token,pending:false}];
 const received=receiveFreezeFailureR85(pendingError(),JSON.parse(JSON.stringify(facts)),'freeze_group',payload);
 assert.deepEqual(freezeFailuresR85(received),facts);
});

test('stopped and pending proofs for the same actor are contradictory at the wire boundary',()=>{
 const error=attachActorIsolation(pendingError(),{...fact,token:'quarantine-token',stopped:true,finalSequence:0});
 attachFreezeFailuresR85(error,[fact]);
 assert.throws(()=>controlFreezeFailureForR85(error,'freeze',request),{code:'invalid_freeze_failure_overlap_r85'});
 assert.throws(()=>receiveFreezeFailureR85(error,[fact],'freeze',request),{code:'invalid_freeze_failure_overlap_r85'});
});

test('every pending member needs current exact registry and freeze-token identity',()=>{
 const s=fixture(PermanentCoordinator,{kinds:['pending','pending'],channels:[1,1],Isolation:ActorIsolation});
 const held=s.ids.map(id=>({id,token:'freeze-'+id,owner:{...s.owners.get(id)}}));
 const facts=held.map(entry=>({actor:entry.id,epoch:1,freezeToken:entry.token,channel:1,incarnation:'boot-1',stage:'pending_command',pending:true}));
 for(const entry of held)s.isolation.unknownActors.set(entry.id,new Set([{owners:[{id:entry.id,owner:{...entry.owner}}]}]));
 const error=attachFreezeFailuresR85(pendingError(),facts);assert.equal(s.isolation.pendingFreeze(held,error),true);
 const saved=s.isolation.unknownActors.get(held[1].id);s.isolation.unknownActors.delete(held[1].id);assert.equal(s.isolation.pendingFreeze(held,error),false);s.isolation.unknownActors.set(held[1].id,saved);
 for(const patch of [{epoch:2},{channel:2},{incarnation:'stale-boot'}]){
  s.isolation.unknownActors.set(held[1].id,new Set([{owners:[{id:held[1].id,owner:{...held[1].owner,...patch}}]}]));
  assert.equal(s.isolation.pendingFreeze(held,error),false);
 }
 s.isolation.unknownActors.set(held[1].id,saved);
 assert.equal(s.isolation.pendingFreeze(held,attachFreezeFailuresR85(pendingError(),[facts[0],{...facts[1],freezeToken:'wrong-token'}])),false);
 s.owners.set(held[1].id,{...s.owners.get(held[1].id),epoch:2});assert.equal(s.isolation.pendingFreeze(held,error),false);
 assert.equal(s.isolation.pendingFreeze(held,pendingError()),false);
});

test('runtime cannot attest unstarted after any matching resident, completed, or cold-traffic hold exists',()=>{
 const runtime={peer:{channel:1,incarnation:'boot-1'},commandRecovery:{hasActor:()=>true},coldTraffic:new Map(),channel:{control:{validate:()=>{},entries:new Map(),completed:new Map()}}};
 for(const started of ['resident','completed','traffic']){
  runtime.channel.control.entries.clear();runtime.channel.control.completed.clear();runtime.coldTraffic.clear();
  if(started==='resident')runtime.channel.control.entries.set(request.id,{token:'older-token'});
  if(started==='completed')runtime.channel.control.completed.set(request.token,{retired:true});
  if(started==='traffic')runtime.coldTraffic.set('different-token',{id:request.id,epoch:request.epoch,token:'different-token'});
  let error;try{rejectPendingFreezeStartR85(runtime,[request]);}catch(e){error=e;}
  assert.equal(error?.code,'actor_command_pending');assert.deepEqual(freezeFailuresR85(error),[]);
 }
 runtime.coldTraffic.clear();runtime.channel.control.completed.clear();runtime.channel.control.entries.clear();
 let error;try{rejectPendingFreezeStartR85(runtime,[request]);}catch(e){error=e;}
 assert.deepEqual(freezeFailuresR85(error),[{...fact,stage:'not_started'}]);
});
