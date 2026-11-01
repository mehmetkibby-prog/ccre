import {potionBatchR61,POTION_BATCH_LIMIT_R86} from './potion-batch-writer-r61.mjs';
import {OperationRandom} from './operation-random.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {stageStartR51,stageEndR51,stageRecordR51} from './stage-timing-r51.mjs';
import {combatInputOrder} from './combat-input-order.mjs';
import {normalPlayerR53} from './r53-options.mjs';
import {potionJoinTargetsR56} from './potion-join-r56.mjs';
import {olderGroupWaitingR57} from './group-fairness-r57.mjs';
import {demand} from './contract.mjs';

const plans=new WeakSet(),areas=new Set(['forest','frozen','black','ancient']);
export const POTION_BATCH_EXTRA_LIMIT_R61=POTION_BATCH_LIMIT_R86-1;

// Planning has no input, mount, journal or resource mutation. A busy extension
// simply leaves the original potion available to its established path.
export function planPotionsR61(channel,context,{enabled=potionBatchR61,seedFor=()=>OperationRandom.seed(),eligible=()=>true}={}){
 const {id,input,inputOrder,now,kernel}=context,source=channel.view.player(id);
 if(!enabled||input?.action!=='use_potion'||!Number.isSafeInteger(inputOrder)||!normalPlayerR53(source)||!areas.has(source.area))return null;
 const scope=(actor,next,receivedAtMs)=>{
  const footprint=channel.actions.footprint(actor,next,receivedAtMs),ids=[...new Set([actor,...footprint.players])];
  const targets=potionJoinTargetsR56({input:next,footprint,ids,kernel});
  return targets===null?null:{resources:[...new Set(['player:'+actor,...footprint.resources])],targets};
 };
 const sourceActor=kernel.players.get(id),sourceCheckpoint=channel.checkpoints.entries.get(id);
 if(!sourceActor||sourceActor.barrier||sourceActor.suspended||sourceActor.externalHold||!sourceCheckpoint||sourceCheckpoint.pending||sourceCheckpoint.joinedR53)return null;
 const first=scope(id,input,context.receivedAtMs??now);if(!first)return null;
 const keys=new Set(first.resources),entries=[],heads=[];let nextQueuedOrder=kernel.players.get(id)?.queue[0]?.order??Infinity;
 for(const [actor,p]of combatInputOrder(kernel.players)){
  const head=p.queue[0],next=head.payload,row=channel.view.player(actor);
  if(actor===id||head.order<=inputOrder||head.order>=nextQueuedOrder||head.receivedAtMs>now||p.externalHold||next?.action!=='use_potion'||!normalPlayerR53(row)||row.area!==source.area||row.channel!==source.channel||!areas.has(row.area)||channel.checkpoints.overdueR53(actor)||(!channel.checkpoints.entries.has(actor)||channel.checkpoints.entries.get(actor).pending||channel.checkpoints.entries.get(actor).joinedR53)||channel.lanes.busy(['player:'+actor])||!eligible(actor,next,head.receivedAtMs))break;
  const identity=channel.identities.get(actor);if(!identity||channel.ports.guard(identity,next,now)!==true||channel.mounts?.rejectAction?.(actor,next))break;
  const own=scope(actor,next,head.receivedAtMs);if(!own||new Set([...keys,...own.resources]).size>2048)break;
  if(olderGroupWaitingR57({kernel,id:actor,input:next,inputOrder:head.order,ids:[actor],resources:own.resources}))break;
  kernel.state.assertOwner(actor,p.epoch);
  for(const key of own.resources)keys.add(key);
  entries.push({actor,epoch:p.epoch,sequence:head.sequence,input:next,nowMs:now,receivedAtMs:head.receivedAtMs,seed:seedFor(actor,head),resources:own.resources,targets:own.targets});heads.push({p,head});
  nextQueuedOrder=Math.min(nextQueuedOrder,p.queue[1]?.order??Infinity);
  if(entries.length===POTION_BATCH_EXTRA_LIMIT_R61)break;
 }
 if(!entries.length)return null;
 const plan={source:{actor:id,resources:first.resources,targets:first.targets},ids:[id,...entries.map(e=>e.actor)],resources:[...keys],entries,heads,context};plans.add(plan);return plan;
}

// The complete union takes part in fairness and READ leasing before consuming
// any secondary head. Exact queue identity and epoch are revalidated first.
export function leasePotionsR61(channel,plan,owner){
 if(!plan)return null;demand(plans.has(plan),'potion_batch_plan');
 const {context}=plan,priority={kernel:channel.kernel,id:context.id,input:context.input,inputOrder:context.inputOrder,ids:plan.ids,resources:plan.resources};
 if(olderGroupWaitingR57(priority))return null;
 for(let i=0;i<plan.entries.length;i++){const e=plan.entries[i],{p,head}=plan.heads[i];demand(channel.kernel.players.get(e.actor)===p&&p.epoch===e.epoch&&!p.barrier&&!p.suspended&&!p.passive&&!p.externalHold&&p.queue[0]===head,'potion_batch_queue_changed');channel.state.assertOwner(e.actor,e.epoch);}
 const lease=channel.lanes.acquire(plan.resources,owner,{readMonsters:true});if(!lease)return null;
 return lease;
}
function takePotionsR61(channel,plan){
 demand(plans.delete(plan),'potion_batch_plan');

 // RejectAction is the read-only mirror of beforeAction. No asynchronous
// boundary exists between validation, lease acquisition and this consumption.
 for(let i=0;i<plan.entries.length;i++){const e=plan.entries[i],{p,head}=plan.heads[i];if(channel.mounts?.enabled)demand(!channel.mounts.beforeAction(e.actor,e.input,e.receivedAtMs),'potion_batch_mount_changed');demand(p.queue.shift()===head,'potion_batch_queue_changed');p.deferred.push({type:'action',sequence:e.sequence});}
}

// Ordinary potion groups are optional. Any unsupported/busy/oversized prefix
// returns null before consuming inputs, retaining ActionLoop's original path.
export function ordinaryPotionBatchR61(channel,context){
 if(!potionBatchR61||context.input?.action!=='use_potion')return null;
 const plan=planPotionsR61(channel,context);if(!plan)return null;
 const actions=channel.actions,kernel=channel.kernel,lease=leasePotionsR61(channel,plan,actions.incarnation);if(!lease)return null;
 const tokens=[],cancel=()=>{for(const t of tokens)if(t.entry.joinedR53===t)actions.checkpoints.finishR53(t);tokens.length=0;};
 let entries,payload;
 try{
  for(const id of plan.ids)tokens.push(actions.checkpoints.captureR53(id));
  const p=kernel.players.get(context.id),first={actor:context.id,epoch:p.epoch,sequence:p.queue[0]?p.queue[0].sequence-1:p.lastAccepted,input:context.input,nowMs:context.now,receivedAtMs:context.receivedAtMs??context.now,seed:OperationRandom.seed(),resources:plan.source.resources};
  entries=[first,...plan.entries].map(e=>({actor:e.actor,epoch:e.epoch,sequence:e.sequence,payload:{input:e.input,nowMs:e.nowMs,receivedAtMs:e.receivedAtMs,seed:e.seed,expected:actions.frameFor(e.actor,e.input,e.nowMs),resources:e.resources,claimActorsR56:[{actor:e.actor,epoch:e.epoch,payload:tokens.find(t=>t.id===e.actor).payload}]}}));
  payload={...entries[0].payload,resources:lease.keys,batchPotionsR61:entries};
  if(Buffer.byteLength(JSON.stringify(payload))>224*1024){cancel();actions.lanes.release(lease);return null;}
  takePotionsR61(channel,plan);
 }catch(error){cancel();if(lease.state==='held')actions.lanes.release(lease);throw error;}
 const key='action:'+actions.incarnation+':'+(++actions.serial),targets=[...new Set([...(plan.source.targets??[]),...plan.entries.flatMap(e=>e.targets)])];
 for(const e of entries)stageRecordR51('action.potion.inputWait',Math.max(0,context.now-e.payload.receivedAtMs));
 const metric=kernel.metrics;metric.potionBatchesR61=(metric.potionBatchesR61??0)+1;metric.potionBatchInputsR61=(metric.potionBatchInputsR61??0)+entries.length-1;
 try{kernel.durableGroup(plan.ids,async()=>{
  const total=stageStartR51();let phase=total;
  try{
   await actions.combatCheckpoints.drainTargetsR531(targets);actions.lanes.assert(lease);
   stageEndR51('action.potion.combatDrain',phase);phase=stageStartR51();
   const ack=await actions.submit({actor:context.id,key,kind:'native_action',payload});
   stageEndR51('action.potion.writerAck',phase);phase=stageStartR51();
   demand(ack.key===key&&ack.result,'potion_batch_ack');actions.lanes.assert(lease);
   const parts=ack.result.potionBatchResultsR61;
   demand(Array.isArray(parts)&&parts.length===entries.length&&parts.every((r,i)=>r.actor===entries[i].actor&&r.sequence===entries[i].sequence&&r.value?.result&&r.value.players?.length===1&&r.value.players[0].id===r.actor&&r.value.encounters?.length===1&&r.value.encounters[0][0]===r.actor),'potion_batch_ack');
   if(ack.result.cancelActorsR61){demand(JSON.stringify(ack.result.cancelActorsR61)===JSON.stringify(plan.ids)&&parts.every(r=>r.value.r56ClaimRejected===r.actor&&r.value.result.status===409&&r.value.result.body?.not_executed===true),'potion_batch_cancel_ack');cancel();}
   else{for(const t of tokens){const value=parts.find(r=>r.actor===t.id).value;demand(Array.isArray(value.claimActorsR56)&&value.claimActorsR56.length===1&&value.claimActorsR56[0].id===t.id,'potion_batch_join_ack');actions.checkpoints.finishR53(t,value.claimActorsR56[0]);}tokens.length=0;}
   for(const [i,r]of parts.entries()){
    await actions.committed(r.value,{id:r.actor,input:entries[i].payload.input});
    actions.checkpoints.hydrateCommitted(r.value.players[0]);actions.checkpoints.encounters?.hydrateCommitted(r.actor,r.value.encounters[0][1]);
   }
   stageEndR51('action.potion.refresh',phase);
   for(const event of ack.result.events)actions.publish(...event);actions.lanes.release(lease);return ack;
  }catch(error){if(actorRejection(error))cancel();if(lease.state==='held')actions.lanes.reject(lease,error);throw error;}
  finally{stageEndR51('action.potion.heldTotal',total);}
 },{emitReceipt:false,groupAckResult:(ack,prior,actor)=>{
  const row=ack.result.potionBatchResultsR61.find(r=>r.actor===actor&&r.sequence===prior.sequence);demand(row,'potion_batch_reply');return {type:'action',...row.value.result};
 }});}catch(error){if(lease.state==='held')actions.lanes.reject(lease,error);throw error;}
 return {type:'action'};
}
