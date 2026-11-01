import test from 'node:test';
import assert from 'node:assert/strict';
import {ResidentControl} from '../../working/core511-source/scripts/core511/resident-control.mjs';
import {ResourceLanes} from '../../working/core511-source/scripts/core511/resource-lanes.mjs';
import {PermanentCoordinator} from '../../working/core511-source/scripts/core511/permanent-coordinator.mjs';
import {ActorIsolation} from '../../working/core511-source/scripts/core511/actor-isolation.mjs';
import {fixture,gate,turns} from './freeze-fixture.mjs';

async function resident(){
 const barrier=gate(),events=[],faults=[],request={id:'actor-pending',epoch:2,token:'cancel-pending-exact-token'},player={epoch:2,barrier:barrier.promise,suspended:false};let unknown=true;
 const kernel={players:new Map([[request.id,player]]),async quiesce(id,epoch){assert.equal(id,request.id);assert.equal(epoch,2);if(unknown)throw Object.assign(Error('actor_command_pending'),{code:'actor_command_pending'});player.suspended=true;events.push('quiesce');return {id,epoch};},resume(id,epoch){assert.equal(id,request.id);assert.equal(epoch,2);player.suspended=false;events.push('resume');}};
 const control=new ResidentControl({kernel,peer:{channel:1,incarnation:'pending-owner'},lanes:new ResourceLanes(),writer:{finalSequence:()=>7},frames:{invalidate:()=>{},hydrate:()=>{}},checkpoints:{drain:async()=>events.push('durable-checkpoint'),hydrate:()=>{}},combatCheckpoints:{drain:async()=>{}},unknownActor:()=>unknown,readBundle:async()=>{events.push('current-db-read');return {player:{id:request.id,channel:1}};},applyBundle:()=>events.push('apply-current'),onFault:error=>faults.push(error)});
 await assert.rejects(control.freeze(request),{code:'actor_command_pending'});
 return {barrier,events,faults,request,player,kernel,control,settle(){unknown=false;player.barrier=null;barrier.resolve();}};
}

test('pending cancellation waits original barrier and checkpoints current image once; duplicate cancellation shares result',async()=>{
 const s=await resident();let settled=false;const pending=s.control.cancelPending(s.request);assert.equal(s.control.cancelPending(s.request),pending);void pending.then(()=>settled=true);await turns();assert.equal(settled,false);assert.deepEqual(s.events,[]);
 s.settle();const ack=await pending;assert.equal(ack.cancelledPendingR85,true);assert.deepEqual(s.events,['quiesce','durable-checkpoint','current-db-read','apply-current','resume']);assert.equal((await s.control.cancelPending(s.request)),ack);assert.equal(s.control.pendingFreezesR85.size,0);assert.equal(s.control.entries.size,0);
 for(const changed of [{...s.request,epoch:3},{...s.request,id:'replacement'}])assert.throws(()=>s.control.cancelPending(changed),{code:'resident_pending_cancel_fenced'});
});

test('stale token or replacement resident cannot resume after original barrier settles',async()=>{
 const s=await resident();assert.throws(()=>s.control.cancelPending({...s.request,token:'wrong-pending-token'}),{code:'resident_pending_cancel_fenced'});
 const pending=s.control.cancelPending(s.request);s.kernel.players.set(s.request.id,{epoch:3,barrier:null});s.settle();await assert.rejects(pending,{code:'resident_pending_cancel_fenced'});assert.deepEqual(s.events,[]);assert.equal(s.faults.length,1);
});

test('negative original barrier and checkpoint failure retain cancellation failure without resuming',async()=>{
 const s=await resident(),negative=Object.assign(Error('command_rolled_back'),{code:'command_rolled_back'}),pending=s.control.cancelPending(s.request);s.barrier.reject(negative);await assert.rejects(pending,error=>error===negative);assert.deepEqual(s.events,[]);assert.equal(s.faults.length,1);
 const next=await resident(),failure=Object.assign(Error('wal_ack_lost'),{code:'wal_ack_lost'});next.control.checkpoints.drain=async()=>{throw failure;};const cleanup=next.control.cancelPending(next.request);next.settle();await assert.rejects(cleanup,error=>error===failure);assert.equal(next.player.suspended,true);assert(!next.events.includes('resume'));assert.equal(next.control.entries.get(next.request.id).phase,'unknown');
});

for(const replacement of ['failed','entry','owner'])test('parent cancellation '+replacement+' preserves the current fence',async()=>{
 const s=fixture(PermanentCoordinator,{kinds:['pending','healthy'],Isolation:ActorIsolation}),answer=gate();let request;
 const endpoint=s.permanent.endpointFor;s.permanent.endpointFor=(channel,incarnation)=>({...endpoint(channel,incarnation),cancelPending:r=>{request=r;return answer.promise;}});
 const work=s.permanent.permanentPlayers(s.ids,()=>assert.fail('cold native callback must not execute')).catch(error=>error);await turns();for(const id of s.ids)s.release(id);const error=await work;assert.equal(error.code,'actor_command_pending');await turns();
 const original=s.permanent.entries.get(s.ids[0]);assert(original);assert.equal(s.players.get(s.ids[1]).suspended,false);assert.equal(s.permanent.entries.size,1);
 if(replacement==='entry'){const newer={id:original.id,phase:'freezing',owner:{...original.owner,epoch:2}};s.permanent.entries.set(original.id,newer);answer.resolve({...request,resumed:true,cancelledPendingR85:true});await original.pendingCleanupR85;assert.equal(s.permanent.entries.get(original.id),newer);assert.deepEqual(s.faults,[]);}
 else{if(replacement==='owner'){s.owners.set(original.id,{...original.owner,epoch:2,incarnation:'replacement-owner'});answer.resolve({...request,resumed:true,cancelledPendingR85:true});}else answer.reject(Object.assign(Error('old_child_exited'),{code:'old_child_exited'}));await original.pendingCleanupR85;assert.equal(s.permanent.entries.get(original.id),original);assert.equal(original.phase,'unknown');assert.equal(s.faults.filter(f=>f.where==='coordinator').length,1);}
});
