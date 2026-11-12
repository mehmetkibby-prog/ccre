import {deathBatchR57} from './r57-options.mjs';
import {normalPlayerR53} from './r53-options.mjs';
import {combatInputOrder} from './combat-input-order.mjs';
import {localMixedTargets} from './local-mixed-targets.mjs';
import {settlementNeedsShared} from './settlement-resources.mjs';
import {attackSeedR57} from './planned-attack-seed-r57.mjs';
import {demand} from './contract.mjs';
const LIMIT=4;

// Only already accepted queue heads whose entire native write scope is held
// by this death may share its journal/transaction. No extra waiting window,
// clock advancement, damage prediction or speculative reward is introduced.
export function takeDeathBatchR57(runtime,{id,inputOrder,now,ids,targets,kernel}){
 if(!deathBatchR57||!Number.isSafeInteger(inputOrder)||targets.length>64)return [];
 const c=runtime.channel,source=c.view.player(id);
 if(!['forest','frozen','ancient'].includes(source?.area))return [];
 const takenActors=new Set([id]),heldActors=new Set(ids),heldTargets=new Set(targets.map(t=>t.id));
 const population=[...c.view.monsters.values()].filter(m=>m.area===source.area&&(m.channel===0||m.channel===source.channel)),chosen=[];
 for(const [actor,p]of combatInputOrder(kernel.players)){
  const head=p.queue[0],input=head.payload,player=c.view.player(actor);
  // A skipped older head must retain its original place ahead of later work.
  if(takenActors.has(actor)||head.order<=inputOrder||head.receivedAtMs>now||!heldActors.has(actor)||p.externalHold||!normalPlayerR53(player)||player.area!==source.area||player.channel!==source.channel||!['avci','arkanist'].includes(player.role)||input?.action!=='attack'||![0,1,2].includes(Math.min(3,Math.max(0,Math.floor(Number(input.ability)||0))))||!heldTargets.has(input.targetId)||runtime.forceSharedActors.get(actor)>Date.now())break;
  if(!runtime.localResident(actor)||c.checkpoints.overdueR53(actor)||settlementNeedsShared(c.view,actor,input,head.receivedAtMs)||c.retaliationMemory.due(actor,now).some(e=>c.view.monster(e.monster_id)?.channel===0))break;
  const group=runtime.localGroup(actor),scope=localMixedTargets(population,player,input,now);
  if(!group||group.some(member=>!heldActors.has(member))||!scope.length||scope.some(m=>!heldTargets.has(m.id)||m.channel!==source.channel||m.is_boss||m.is_stone))break;
  const identity=c.identities.get(actor);if(!identity||c.ports.guard(identity,input,now)!==true)break;
  kernel.state.assertOwner(actor,p.epoch);
  if(c.mounts?.rejectAction?.(actor,input))break;
  if(c.mounts.enabled)c.mounts.beforeAction(actor,input,head.receivedAtMs);
  demand(p.queue.shift()===head,'death_batch_queue_changed');
  p.deferred.push({type:'action',sequence:head.sequence});takenActors.add(actor);
  chosen.push({actor,epoch:p.epoch,sequence:head.sequence,receivedAtMs:head.receivedAtMs,seed:attackSeedR57({id:actor,epoch:p.epoch,input,inputOrder:head.order}),input});
  if(chosen.length===LIMIT)break;
 }
 if(chosen.length){kernel.metrics.deathBatchesR57=(kernel.metrics.deathBatchesR57??0)+1;kernel.metrics.deathBatchInputsR57=(kernel.metrics.deathBatchInputsR57??0)+chosen.length;}
 return chosen;
}

export function deathBatchReplyR57(ack,prior,actor,entries){
 const entry=entries.find(e=>e.actor===actor&&e.sequence===prior.sequence);
 if(!entry)return null;
 const rows=ack?.result?.batchResultsR57;
 demand(Array.isArray(rows)&&rows.length===entries.length&&new Set(rows.map(r=>r.actor)).size===rows.length,'death_batch_ack');
 const row=rows.find(r=>r.actor===actor&&r.sequence===prior.sequence);
 demand(row?.result&&Number.isInteger(row.result.status),'death_batch_ack_actor');
 return {type:'action',...row.result};
}
