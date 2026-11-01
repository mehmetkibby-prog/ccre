import {beginDeathMovementR86,stopDeathMovementR86,rejectDeathMovementR86,rejectDeathResultsR86,validateDeathResultsR86,rebaseDeathCheckpointR86} from './death-movement-r86.mjs';
import {demand} from './contract.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {quarantineDrainR531,joinedCheckpointBoundR531} from './r531-options.mjs';
import {acceptDeathPreviewR54,rejectDeathPreviewR54} from './reward-reply-r54.mjs';
import {stageStartR51,stageEndR51,stageRecordR51} from './stage-timing-r51.mjs';
import {rewardAsyncReplyR54} from './r54-options.mjs';
import {packCheckpointR54} from './checkpoint-wire-r54.mjs';
import {deathActorNeedsCheckpointR57} from './clean-join-r57.mjs';
import {deathBatchReplyR57} from './death-batch-channel-r57.mjs';
import {deathLatencyR82} from './death-latency-r82.mjs';

// The target resource lease is the 'dying' marker: no second hit, respawn or
// defeat can pass it. Nothing is published until the receipt's durable ACK.
export function joinedDeathR53(loop,{id,input,now,receivedAtMs,kernel,local,ids,lease,seed,key,replyR54=null,batchAttacksR57=[]}){
 stageRecordR51('death.inputWait',Math.max(0,now-receivedAtMs));
 const previewR54=acceptDeathPreviewR54(replyR54,lease);
 let actors=[],combat=null,reservationR54=null,accepted=false,deathMotionR86=null;
 const cancel=()=>{for(const t of actors)if(t.entry.joinedR53===t)loop.checkpoints.finishR53(t);if(combat){loop.combatCheckpoints.finishR53(combat);combat=null;reservationR54=null;}else if(reservationR54){loop.combatCheckpoints.cancelReservationR54(reservationR54);reservationR54=null;}};
 kernel.durableGroup(ids,async()=>{
  const totalR54=stageStartR51(),deathObservationR82=deathLatencyR82.begin();let phaseR54=totalR54,outcomeR82='failed';
  try{
   // Await existing double buffers only; do not submit another actor fsync,
   // channel-wide drain or shared prepare before the defeat transaction.
   if(rewardAsyncReplyR54){
    // Reserve before yielding: later unrelated checkpoints cannot extend this
    // party's wait or include these dying targets. Overlapping snapshots ACK first.
    reservationR54=loop.combatCheckpoints.reserveR54(local.targets.map(t=>t.id));
    await Promise.all([...ids.map(actor=>loop.checkpoints.entries.get(actor)?.pending),reservationR54.pending]);
   }else{
    await Promise.all(ids.map(actor=>loop.checkpoints.entries.get(actor)?.pending));
    while(loop.combatCheckpoints.pending)await loop.combatCheckpoints.pending;
   }
   loop.lanes.assert(lease);
   const checkpointIdsR57=ids.filter(actor=>deathActorNeedsCheckpointR57(loop.checkpoints,actor,id));
   for(let i=checkpointIdsR57.length;i<ids.length;i++)stageRecordR51('death.cleanActorSkipped',0);
   if(quarantineDrainR531){for(const actor of checkpointIdsR57)actors.push(loop.checkpoints.captureR53(actor));}
   else actors=checkpointIdsR57.map(actor=>loop.checkpoints.captureR53(actor));
   combat=loop.combatCheckpoints.captureR53(local.targets.map(t=>t.id),{reservationR54});
   const rawCheckpointR54=combat?{actors:actors.map(t=>({actor:t.id,epoch:t.entry.epoch,payload:t.payload})),combat:combat.payload}:null;
   const packedR54=rewardAsyncReplyR54&&rawCheckpointR54?packCheckpointR54(rawCheckpointR54):null;
   const joined=Boolean(combat)&&(rewardAsyncReplyR54?Boolean(packedR54):!joinedCheckpointBoundR531||Buffer.byteLength(JSON.stringify(rawCheckpointR54))<=224*1024);
   stageRecordR51(joined?'death.joined':'death.joinFallback',0);
   if(process.env.CORE511_STAGE_TIMING==='1')loop.lastCaptureR54={...loop.combatCheckpoints.lastCaptureR54,actors:actors.length,actorBytes:Buffer.byteLength(JSON.stringify(actors.map(t=>({actor:t.id,epoch:t.entry.epoch,payload:t.payload})))),joined};
   if(!joined){cancel();actors=[];let waitR54=stageStartR51();await Promise.all(ids.map(actor=>loop.checkpoints.drain(actor)));stageEndR51('death.actorDrain',waitR54);waitR54=stageStartR51();await loop.combatCheckpoints.drain();stageEndR51('death.combatDrain',waitR54);loop.lanes.assert(lease);}
   const fresh=loop.frameFor(id,input,now,receivedAtMs),checkpointR53=joined?(rewardAsyncReplyR54?packedR54:rawCheckpointR54):null;
   stageEndR51('death.checkpointPrepare',phaseR54);phaseR54=stageStartR51();
   deathLatencyR82.phase(deathObservationR82,'writer');
   deathMotionR86=beginDeathMovementR86(loop,{kernel,id,input,ids,lease,preview:previewR54,entries:batchAttacksR57,joined});
   const ack=await loop.submit({actor:id,key,kind:'attack',payload:{...(batchAttacksR57.length?{batchAttacksR57}:{}),localScope:local.scope??{kind:'kill',targets:local.targets},...(joined?{checkpointR53}:{}),nowMs:now,receivedAtMs,seed,input,expected:{player:fresh.player,monster:fresh.preloadedAttackMonster,settings:fresh.settings},resources:lease.keys}});
   stageEndR51('death.writerAck',phaseR54);phaseR54=stageStartR51();
   deathLatencyR82.phase(deathObservationR82,'refresh');
   stopDeathMovementR86(deathMotionR86);
   demand(ack.key===key&&ack.result,'attack_join_ack');loop.lanes.assert(lease);accepted=true;
   const value=ack.result;validateDeathResultsR86(deathMotionR86,value);
   demand(value.players.every(p=>!kernel.players.has(p.id)||ids.includes(p.id)),'attack_commit_unlocked_resident');
   if(value.r53Rejected){
    demand(ids.includes(value.r53Rejected)&&value.result?.body?.not_executed===true&&value.result.status===409,'attack_join_rejection');cancel();
    await loop.committed(value);
    for(const player of value.players)if(kernel.players.has(player.id)){if(!rebaseDeathCheckpointR86(deathMotionR86,loop.checkpoints,player))loop.checkpoints.hydrateCommitted(player);loop.checkpoints.encounters?.hydrateCommitted(player.id,loop.memory.view.engagements.get(player.id)??null);}
    if(deathMotionR86)rejectDeathMovementR86(deathMotionR86,now);else rejectDeathPreviewR54(loop,previewR54,id,input,now);loop.lanes.release(lease);outcomeR82='rejected';return ack;
   }
   if(joined){demand(Array.isArray(value.checkpointR53)&&value.checkpointR53.length===actors.length,'attack_join_checkpoint_ack');
    for(const t of actors){const saved=value.checkpointR53.find(p=>p.id===t.id);demand(saved,'attack_join_actor_ack');loop.checkpoints.finishR53(t,saved);}}
   // The journal reserves just these targets. Other monsters' checkpoints may
   // be in flight; their immutable snapshots cannot contain the reserved IDs.
   if(joined){loop.combatCheckpoints.finishR53(combat,{committed:true,result:value});combat=null;reservationR54=null;}
   else{while(loop.combatCheckpoints.pending)await loop.combatCheckpoints.pending;loop.combatCheckpoints.committed(value);}
   loop.memory.committed(value);
   for(const m of value.monsters)loop.memory.view.setMonster(m);
   await loop.committed(value,deathMotionR86?{deathMotionR86}:undefined);
   rejectDeathResultsR86(deathMotionR86,value,now);
   stageEndR51('death.committedRefresh',phaseR54);
   for(const player of value.players)if(kernel.players.has(player.id)){if(!rebaseDeathCheckpointR86(deathMotionR86,loop.checkpoints,player))loop.checkpoints.hydrateCommitted(player);loop.checkpoints.encounters?.hydrateCommitted(player.id,loop.memory.view.engagements.get(player.id)??null);}
   for(const event of value.events)loop.publish(...event);
   loop.lanes.release(lease);outcomeR82='completed';return ack;
  }catch(error){
   stopDeathMovementR86(deathMotionR86);
   // An unknown COMMIT is never abandoned or translated to not_executed.
   const rejectedR82=!accepted&&actorRejection(error);
   if(rejectedR82){cancel();if(deathMotionR86)rejectDeathMovementR86(deathMotionR86,now);else rejectDeathPreviewR54(loop,previewR54,id,input,now);}
   if(lease.state==='held')loop.lanes.reject(lease,error);
   if(error?.code==='local_kill_requires_shared')loop.localRejected?.(local.targets,id);
   if(rejectedR82)outcomeR82='rejected';
   throw error;
  }finally{stopDeathMovementR86(deathMotionR86);stageEndR51('death.heldTotal',totalR54);deathLatencyR82.finish(deathObservationR82,outcomeR82);}
 },{replyTo:id,emitReceipt:false,groupAckResult:(ack,prior,actor)=>deathBatchReplyR57(ack,prior,actor,batchAttacksR57),ackResult:ack=>({type:'action',...ack.result.result})});
 return previewR54??{type:'action'};
}
