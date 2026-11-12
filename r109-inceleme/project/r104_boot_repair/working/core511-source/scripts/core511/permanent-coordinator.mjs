import {joinFreezeRequestsR85,unprovenFreezeR85} from './freeze-outcomes-r85.mjs';
import {demandFence} from './fence-diagnostics.mjs';
import {randomUUID} from 'node:crypto';
import {demand,kernelError} from './contract.mjs';
import {retiredFreezeOwner} from './freeze-redirect.mjs';

// Main-process gate for the existing synchronous rare-operation routes. The
// parent supplies endpoint references created with the channel; callers cannot
// provide a socket, channel, epoch, or SQL. No lease expires on a timeout.
export class PermanentCoordinator {
 constructor({authority,endpointFor,durable,onFault=()=>{},recoverRejectedFreeze=null,availabilityCheck=null,relatedActors=ids=>ids,knownPendingFreeze=()=>false}){
  demand(authority&&typeof endpointFor==='function'&&typeof durable==='function','permanent_dependencies');
  Object.assign(this,{authority,endpointFor,durable,onFault,recoverRejectedFreeze,availabilityCheck,relatedActors,knownPendingFreeze});this.entries=new Map();this.tail=Promise.resolve();this.closed=false;
 }
 guard(sql,peer,request){
  const ids=new Set([request.playerId,...(request.payload?.resources??[]).filter(k=>typeof k==='string'&&k.startsWith('player:')).map(k=>k.slice(7))]);
  // Accepted channel inputs/checkpoints must finish while we are draining.
  // The freeze ACK carries the resulting final durable writer sequence.
  for(const id of ids){const entry=this.entries.get(id);if(!entry||entry.phase==='freezing'&&this.sharedCombat?.allows(id,peer,request))continue;demandFence((entry.phase==='freezing'||entry.phase==='releasing')&&entry.owner?.channel===peer.channel&&entry.owner?.incarnation===peer.incarnation&&(id!==request.playerId||entry.owner?.epoch===request.epoch),'permanent_actor_fenced',()=>({operation:request.operation,phase:entry.phase,actor:id,session:entry.admission?.session_id,channel:peer.channel,incarnation:peer.incarnation,requestEpoch:request.epoch,ownerEpoch:entry.owner?.epoch,sequence:request.sequence,leaseKind:'permanent'}));}return true;
 }
 // R22: a shared terminal only fences briefly; mark that case so ownership
 // changes can wait it out and retry. Same code, so rejection rules are unchanged.
 assertAvailable(ids){
  this.availabilityCheck?.(ids);
  demandFence(!this.closed&&ids.every(id=>!this.entries.has(id)),'permanent_actor_fenced',()=>{const entry=ids.map(id=>this.entries.get(id)).find(Boolean);return {operation:'admission',phase:this.closed?'closed':entry?.phase,actor:entry?.id,session:entry?.admission?.session_id,channel:entry?.owner?.channel,incarnation:entry?.owner?.incarnation,ownerEpoch:entry?.owner?.epoch,leaseKind:'permanent'};});
  if(this.sharedCombat?.terminal)throw Object.assign(kernelError('permanent_actor_fenced'),{sharedTerminal:true,fenceContext:{operation:'admission',phase:this.sharedCombat.terminal.phase,leaseKind:'shared'}});return true;
 }
 permanentPlayers(ids,operation){return this.operate(ids,operation);}
 durablePlayers(ids,operation){return this.operate(ids,operation,{owned:true});}
 durablePlayersWhenIdle(ids,operation){return this.operate(ids,operation,{owned:true,idleOnly:true});}
 redirect(entry,ack){
  const {id,token,owner,admission,simulation}=entry;entry.owner=retiredFreezeOwner(this.authority,id,owner,ack,token);
  const nextAdmission=this.authority.admission(id),nextSimulation=this.authority.simulation?.(id);
  demand(admission?nextAdmission?.session_id===admission.session_id:!nextAdmission&&nextSimulation?.run_id===simulation?.run_id,'permanent_retirement_session');entry.token=randomUUID();entry.needsFreeze=true;
 }
 async operate(ids,operation,{owned=false,idleOnly=false}={}){
  demand(Array.isArray(ids)&&ids.length>0&&ids.length<=100&&ids.every(id=>typeof id==='string'&&id.length>0&&id.length<=160),'permanent_actor_set');
  demand(typeof operation==='function'&&(owned||operation.constructor.name!=='AsyncFunction'),'permanent_operation_must_be_synchronous');
  const earlier=this.tail;let release;this.tail=new Promise(r=>release=r);await earlier;
  const held=[];let value,rejected=null,ownershipHold=null;
  try{
   while(this.sharedCombat?.terminal)await this.sharedCombat.terminalIdle();
   const requested=ids;ids=this.relatedActors(ids);
   demand(Array.isArray(ids)&&ids.length<=100&&requested.every(id=>ids.includes(id))&&ids.every(id=>typeof id==='string'&&id.length>0&&id.length<=160),'permanent_related_scope');
   this.assertAvailable(ids);
   for(const id of [...new Set(ids)].sort()){
    const owner=this.authority.owner(id),admission=this.authority.admission(id),simulation=this.authority.simulation?.(id),heldOwner=admission??simulation;
    demand(!heldOwner||owner?.state==='active'&&owner.epoch===heldOwner.epoch&&owner.channel===heldOwner.channel,'permanent_owner_fenced');
    const entry={id,token:randomUUID(),owner:heldOwner?{...owner}:null,admission,simulation,phase:'freezing',endpoint:null,needsFreeze:Boolean(heldOwner)};
    this.entries.set(id,entry);held.push(entry);
   }
   let mayDeferIdle=idleOnly;
   do{
    const groups=new Map();
    for(const entry of held.filter(e=>e.needsFreeze)){
     const {owner}=entry,key=owner.channel+':'+owner.incarnation;
     entry.endpoint=this.endpointFor(owner.channel,owner.incarnation);demand(entry.endpoint,'permanent_channel_unavailable');
     const group=groups.get(key)??[];group.push(entry);groups.set(key,group);
    }
    // Only one resident process can atomically decide for the complete group.
    // Cross-channel ownership retains the existing coordinated freeze path.
    const tryIdle=mayDeferIdle&&groups.size===1;mayDeferIdle=false;let deferredIdle=false;
    const batches=[...groups.values()];
    await joinFreezeRequestsR85(batches.map(async group=>{
     const requests=group.map(e=>({id:e.id,epoch:e.owner.epoch,token:e.token})),endpoint=group[0].endpoint;
     demand(group.length===1||typeof endpoint.freezeGroup==='function','permanent_group_endpoint');
     let acks;
     if(tryIdle){
      demand(typeof endpoint.freezeIdleGroup==='function','permanent_idle_group_endpoint');
      const response=await endpoint.freezeIdleGroup(requests);
      if(response?.deferred===true){demand(response.notExecuted===true&&response.code==='reward_recovery_busy','permanent_idle_group_ack');deferredIdle=true;return;}
      acks=response?.acks;
     }else acks=group.length===1?[await endpoint.freeze(requests[0])]:await endpoint.freezeGroup(requests);
     demand(group.every(entry=>entry.phase==='freezing'&&this.entries.get(entry.id)===entry),'permanent_freeze_superseded');
     demand(Array.isArray(acks)&&acks.length===group.length,'permanent_group_ack');
     for(const [index,entry]of group.entries()){
      const {id,token,owner,admission,simulation}=entry,ack=acks[index];
      if(ack?.retired){
       this.redirect(entry,ack);continue;
      }
      const current=this.authority.owner(id),currentAdmission=this.authority.admission(id),currentSimulation=this.authority.simulation?.(id);
      demand(ack?.token===token&&ack.epoch===owner.epoch&&ack.channel===owner.channel&&ack.incarnation===owner.incarnation&&current?.incarnation===owner.incarnation&&current?.epoch===owner.epoch&&current?.sequence===ack.finalSequence&&(admission?currentAdmission?.session_id===admission.session_id:!currentAdmission&&currentSimulation?.epoch===simulation.epoch&&currentSimulation?.run_id===simulation.run_id),'permanent_freeze_mismatch');
      entry.needsFreeze=false;entry.finalSequence=ack.finalSequence;
     }
    }),{knownPending:(error,index)=>this.knownPendingFreeze(batches[index],error)});
    if(deferredIdle){
     // The sole resident group returned before any freeze or cold producer
     // hold. No callback/checkpoint/write ran; only our fresh entries may go.
     for(const entry of held){demand(entry.phase==='freezing'&&this.entries.get(entry.id)===entry,'permanent_idle_defer_scope');this.entries.delete(entry.id);}
     return {deferred:true,notExecuted:true,code:'reward_recovery_busy'};
    }
    // A foreign actor may have completed its freeze before the source's
    // accepted terminal hit. Its held lease is borrowable only in this phase.
    while(this.sharedCombat?.terminal)await this.sharedCombat.terminalIdle();
    for(const entry of held)if(entry.owner&&!entry.needsFreeze){const current=this.authority.owner(entry.id);if(current?.epoch!==entry.owner.epoch||current.incarnation!==entry.owner.incarnation)this.redirect(entry,await entry.endpoint.freeze({id:entry.id,epoch:entry.owner.epoch,token:entry.token}));}
   }while(held.some(e=>e.needsFreeze));
   ownershipHold=this.sharedCombat?.reserveOwnership();
   for(const entry of held)entry.phase='frozen';
   if(this.beforeNativeOperationR533)await this.beforeNativeOperationR533();
   // Explicit owned jobs may await their SystemWriter COMMIT/fsync receipt.
   // Legacy HTTP callbacks retain the original synchronous-only contract.
   if(owned)value=await operation(held);
   else{
    // Native routes return ordinary rule errors through a synchronous throw.
    // They may already have rolled back, or committed part of their original
    // work. In either case, finish durability and load CURRENT DB before
    // releasing the actor, then let the original route format that same error.
    // An asynchronous/owned failure or any lost durability/refresh ACK still
    // has an unknown outcome and must keep the old owner fenced.
    try{value=operation();}catch(error){rejected={error};}
   }
   demand(!value?.then,'permanent_operation_must_be_synchronous');
   // The old route's SQLite FULL commit and any asynchronous WAL synchronizer
   // must be durable before the new image can enter a simulation process.
   await this.durable();
   // Hydrate all frozen owners before any can produce new input. The parent
   // publishes exact-owner release before sending resume; an input may arrive
   // before the resume ACK without implying lost ownership.
   for(const entry of held)entry.phase='refreshing';
   await Promise.all(held.filter(e=>e.endpoint).map(async entry=>{
    demand(typeof entry.endpoint.refresh==='function','permanent_refresh_endpoint');
    const ack=await entry.endpoint.refresh({id:entry.id,epoch:entry.owner.epoch,token:entry.token});
    demand(ack?.id===entry.id&&ack.token===entry.token&&ack.epoch===entry.owner.epoch&&ack.refreshed===true,'permanent_refresh_mismatch');
   }));
   for(const entry of held)entry.phase='releasing';
   await Promise.all(held.filter(e=>e.endpoint).map(async entry=>{
    const ack=await entry.endpoint.resume({id:entry.id,epoch:entry.owner.epoch,token:entry.token});
    demand(ack?.token===entry.token&&ack.epoch===entry.owner.epoch&&ack.resumed===true,'permanent_resume_mismatch');
   }));
   for(const entry of held)this.entries.delete(entry.id);
  }catch(error){
   // A branded stopped-actor proof from a rejected freeze means the native
   // cold callback was never entered. Recover only this pre-operation case;
   // lost durability/refresh/resume still cannot be declared not executed.
   if(!unprovenFreezeR85(error)&&held.length&&held.every(entry=>entry.phase==='freezing')&&this.recoverRejectedFreeze){
    let recovered=false;try{recovered=await this.recoverRejectedFreeze(held,error);}catch(recoveryError){error=recoveryError;}
    if(recovered)throw error;
   }
   // Neither rejected fsync nor a lost resume ACK authorizes a second writer.
   // Recovery first retires the process incarnation, then loads committed DB.
   for(const entry of held){error.fenceContext??={operation:'permanent',phase:entry.phase,actor:entry.id,session:entry.admission?.session_id,channel:entry.owner?.channel,incarnation:entry.owner?.incarnation,ownerEpoch:entry.owner?.epoch,leaseKind:'permanent'};entry.phase='unknown';this.onFault(entry,error);}
   throw error;
  }finally{ownershipHold?.release();release();}
  if(rejected)throw rejected.error;return value;
 }
 // Only the trusted supervisor may reconcile a terminated incarnation after
 // writer recovery. This is not exposed as an HTTP or channel RPC operation.
 reconciled(id,{incarnation,recovered}){
  const entry=this.entries.get(id);demand(entry?.phase==='unknown'&&recovered===true&&entry.owner?.incarnation===incarnation,'permanent_recovery_required');
  const current=this.authority.owner(id);demand(!current||current.incarnation!==incarnation,'permanent_old_process_live');this.entries.delete(id);
 }
 reconciledOffline(id){const entry=this.entries.get(id);demand(entry?.phase==='unknown'&&entry.owner===null&&!this.authority.admission(id)&&!this.authority.simulation?.(id),'permanent_offline_recovery_required');this.entries.delete(id);}
 close(){this.closed=true;}
}
