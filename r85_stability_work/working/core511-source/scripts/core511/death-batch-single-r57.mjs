import {INDEPENDENT_DEATH_EXTRA_LIMIT_R85} from './independent-death-batch-r85.mjs';
import {deathBatchR57} from './r57-options.mjs';
import {normalPlayerR53} from './r53-options.mjs';
import {combatInputOrder} from './combat-input-order.mjs';
import {attackSeedR57,reserveAttackSeedR57} from './planned-attack-seed-r57.mjs';
import {attackRandom} from './attack-writer.mjs';
import {demand} from './contract.mjs';
import {localMixedTargets} from './local-mixed-targets.mjs';
import {r37Options} from './r37-options.mjs';
import {olderGroupWaitingR57} from './group-fairness-r57.mjs';
const plans=new WeakSet();
const mixedBatchR61=process.env.CORE511_R61_MIXED_BATCH==='1';
const batchActorsR61=process.env.CORE511_R61_BATCH_ACTORS==='1';
// A single death followed by queued area casts can use one ordinary mixed
// scope. Derive and lease the entire conservative monster union BEFORE any
// input is consumed. The optional R61 actor union also leases an accepted
// overlapping cast's complete trusted local party; no future input is taken.
export function planMixedSuccessorsR57(runtime,{id,input,inputOrder,now,kernel,mixedStartR61=false},local){
 const c=runtime.channel,source=c.view.player(id);
 const areaStartR61=mixedBatchR61&&mixedStartR61&&Math.min(3,Math.max(0,Math.floor(Number(input?.ability)||0)))===2;
 const growActorsR61=areaStartR61&&batchActorsR61;
 if(!deathBatchR57||!r37Options.mixedNarrow||!input||!Number.isSafeInteger(inputOrder)||!['avci','arkanist'].includes(source?.role)||!['forest','frozen','ancient'].includes(source.area)||!local||local.ids.length>25||local.targets.length>(areaStartR61?64:10))return null;
 const actors=new Set(local.ids),population=[...c.view.monsters.values()].filter(m=>m.area===source.area&&(m.channel===0||m.channel===source.channel)),targets=new Map(),entries=[],heads=[];
 const include=(scope,permitted=actors)=>{
  if(!scope.length||scope.some(m=>m.channel!==source.channel||m.is_boss||m.is_stone)||new Set([...targets.keys(),...scope.map(m=>m.id)]).size>64)return false;
  const added=new Set(scope.filter(m=>m.hp>0&&!targets.has(m.id)).map(m=>m.id));
  for(const row of c.attackMemory.participants.values())if(added.has(row.monster_id)&&scope.some(m=>m.id===row.monster_id&&m.spawn_round===row.spawn_round)){
   const group=runtime.localGroup(row.player_id);if(!group||group.some(member=>!permitted.has(member)))return false;
  }
  for(const m of scope)targets.set(m.id,{id:m.id,spawnRound:m.spawn_round});return true;
 };
 if(!include(localMixedTargets(population,source,input,now))||local.targets.some(t=>targets.get(t.id)?.spawnRound!==t.spawnRound))return null;
 let nextQueuedOrder=Infinity,areaCast=areaStartR61;
 for(const [actor,p]of combatInputOrder(kernel.players)){
  const head=p.queue[0],next=head.payload,player=c.view.player(actor),ability=Math.min(3,Math.max(0,Math.floor(Number(next?.ability)||0)));
  if(head.order>=nextQueuedOrder||actor===id||head.order<=inputOrder||head.receivedAtMs>now||(!actors.has(actor)&&!growActorsR61)||p.externalHold||!normalPlayerR53(player)||player.area!==source.area||player.channel!==source.channel||!['avci','arkanist'].includes(player.role)||next?.action!=='attack'||![0,1,2].includes(ability)||runtime.forceSharedActors.get(actor)>Date.now())break;
  if(!runtime.localResident(actor)||c.checkpoints.overdueR53(actor)||c.retaliationMemory.due(actor,now).some(e=>c.view.monster(e.monster_id)?.channel===0))break;
  const group=runtime.localGroup(actor),identity=c.identities.get(actor);if(!group)break;
  const added=group.filter(member=>!actors.has(member));if(added.length&&(!growActorsR61||actors.size+new Set(added).size>25)||!identity||c.ports.guard(identity,next,now)!==true)break;
  // Do not delay the first death for a new party's pending work. Expansion
  // is optional and consumes no inputs until all final resource leases exist.
  if(added.some(member=>{const row=c.view.player(member),resident=kernel.players.get(member);return !runtime.localResident(member)||!normalPlayerR53(row)||row.area!==source.area||row.channel!==source.channel||!resident||resident.barrier||resident.suspended||resident.passive||resident.externalHold||c.lanes.busy(['player:'+member]);}))break;
  const permitted=added.length?new Set([...actors,...added]):actors;
  kernel.state.assertOwner(actor,p.epoch);if(c.mounts?.rejectAction?.(actor,next))break;
  const scope=localMixedTargets(population,player,next,now);
  if(added.length&&!scope.some(m=>targets.get(m.id)?.spawnRound===m.spawn_round)||!include(scope,permitted))break;
  for(const member of added)actors.add(member);
  entries.push({actor,epoch:p.epoch,sequence:head.sequence,receivedAtMs:head.receivedAtMs,seed:attackSeedR57({id:actor,epoch:p.epoch,input:next,inputOrder:head.order}),input:next});heads.push({p,head});nextQueuedOrder=Math.min(nextQueuedOrder,p.queue[1]?.order??Infinity);areaCast||=ability===2;if(entries.length===4)break;
 }
 if(!entries.length||!areaCast)return null;
 const list=[...targets.values()],plan={targets:list,entries,heads,...(growActorsR61?{ids:[...actors]}:{}),scope:{kind:'mixed',area:source.area,targets:list,narrow:true}};plans.add(plan);return plan;
}
// Prepare without consuming inputs or changing resident combat state. Only
// already lethal ordinary single-target heads on DIFFERENT lives participate.
// The optional actor union leases each independent kill's entire trusted local
// group before any head is consumed. A blocked/older/noncandidate head still
// stops selection; there is no wait window or reordering of accepted inputs.
export function planSingleDeathsR57(runtime,{id,input,inputOrder,now,kernel},local){
 if(!deathBatchR57||!local||!Number.isSafeInteger(inputOrder)||local.ids.length>25||local.targets.length>10)return null;
 const mixed=planMixedSuccessorsR57(runtime,{id,input,inputOrder,now,kernel},local);if(mixed)return mixed;
 const c=runtime.channel,source=c.view.player(id),actors=new Set(local.ids),targets=new Map(local.targets.map(t=>[t.id,t]));
 if(!normalPlayerR53(source)||!['forest','frozen','ancient'].includes(source.area))return null;
 const entries=[],heads=[];let nextQueuedOrder=Infinity;
 let independentR85=Math.min(3,Math.max(0,Math.floor(Number(input?.ability)||0)))===0&&local.targets.length===1&&local.targets[0].id===input?.targetId&&local.targets[0].spawnRound===input?.spawnRound;
 for(const [actor,p]of combatInputOrder(kernel.players)){
  const head=p.queue[0],input=head.payload,player=c.view.player(actor);
  if(head.order>=nextQueuedOrder||actor===id||head.order<=inputOrder||head.receivedAtMs>now||!actors.has(actor)&&!batchActorsR61||p.externalHold||!normalPlayerR53(player)||player.area!==source.area||player.channel!==source.channel||input?.action!=='attack'||Math.min(3,Math.max(0,Math.floor(Number(input.ability)||0)))!==0||targets.has(input.targetId)||runtime.forceSharedActors.get(actor)>Date.now())break;
  if(!runtime.localResident(actor)||c.checkpoints.overdueR53(actor)||c.retaliationMemory.due(actor,now).some(e=>c.view.monster(e.monster_id)?.channel===0))break;
  const identity=c.identities.get(actor);if(!identity||c.ports.guard(identity,input,now)!==true)break;
  kernel.state.assertOwner(actor,p.epoch);
  if(c.mounts?.rejectAction?.(actor,input))break;
  const seed=reserveAttackSeedR57({id:actor,epoch:p.epoch,input,inputOrder:head.order}),frame=c.frames.attack(actor,input,head.receivedAtMs,now),preview=c.attackMemory.plan(frame,{...attackRandom(seed),nowMs:now}),scope=runtime.localKill(actor,preview);
  if(preview.deferred||!scope||scope.targets.some(t=>targets.has(t.id))||targets.size+scope.targets.length>10)break;
  // A later independent kill cannot borrow the first actor's older priority
  // to pass a remembered waiter omitted from the active-head iterator.
  if(olderGroupWaitingR57({kernel,id:actor,input,inputOrder:head.order,ids:scope.ids,resources:scope.targets.map(t=>'monster:'+t.id)}))break;
  const added=scope.ids.filter(member=>!actors.has(member));
  if(added.length&&(!batchActorsR61||actors.size+new Set(added).size>25))break;
  // Expansion is optional. Do not make the original kill wait on another
  // group's gameplay hold, foreign scope, overdue journal or failed owner.
  if(added.some(member=>{const row=c.view.player(member),resident=kernel.players.get(member);return !runtime.localResident(member)||!normalPlayerR53(row)||row.area!==source.area||row.channel!==source.channel||!resident||resident.barrier||resident.suspended||resident.passive||resident.externalHold||c.checkpoints.overdueR53(member)||c.lanes.busy(['player:'+member]);}))break;
  const singleR85=scope.targets.length===1&&scope.targets[0].id===input.targetId&&scope.targets[0].spawnRound===input.spawnRound;
  if(entries.length>=4&&(!independentR85||!singleR85))break;
  const entryR85={actor,epoch:p.epoch,sequence:head.sequence,receivedAtMs:head.receivedAtMs,seed,input};
  // Refuse before consuming any head; ingress permits much larger individual
  // inputs than the unchanged 64KiB whole-batch writer envelope.
  if(Buffer.byteLength(JSON.stringify([...entries,entryR85]))>65536)break;
  independentR85&&=singleR85;
  for(const member of added)actors.add(member);
  for(const target of scope.targets)targets.set(target.id,target);
  entries.push(entryR85);heads.push({p,head});nextQueuedOrder=Math.min(nextQueuedOrder,p.queue[1]?.order??Infinity);
  if(entries.length===(independentR85?INDEPENDENT_DEATH_EXTRA_LIMIT_R85:4))break;
 }
 if(!entries.length)return null;
 const plan={targets:[...targets.values()],entries,heads,ids:[...actors]};plans.add(plan);return plan;
}
export function takeSingleDeathsR57(channel,plan){
 if(!plan)return [];
 demand(plans.delete(plan),'death_batch_plan');
 for(let i=0;i<plan.entries.length;i++){const e=plan.entries[i],{p,head}=plan.heads[i];demand(channel.kernel.players.get(e.actor)===p&&p.epoch===e.epoch&&!p.barrier&&!p.suspended&&p.queue[0]===head,'death_batch_queue_changed');channel.state.assertOwner(e.actor,e.epoch);}
 for(let i=0;i<plan.entries.length;i++){const e=plan.entries[i],{p,head}=plan.heads[i];if(channel.mounts.enabled)channel.mounts.beforeAction(e.actor,e.input,e.receivedAtMs);p.queue.shift();p.deferred.push({type:'action',sequence:head.sequence});}
 const m=channel.kernel.metrics;m.deathBatchesR57=(m.deathBatchesR57??0)+1;m.deathBatchInputsR57=(m.deathBatchInputsR57??0)+plan.entries.length;m.singleDeathBatchInputsR57=(m.singleDeathBatchInputsR57??0)+plan.entries.length;
 if(plan.scope)m.promotedDeathBatchInputsR57=(m.promotedDeathBatchInputsR57??0)+plan.entries.length;
 return plan.entries;
}
