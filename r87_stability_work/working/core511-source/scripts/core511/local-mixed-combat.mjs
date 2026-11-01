import {olderGroupWaitingR57,rememberDeferredGroupR57} from './group-fairness-r57.mjs';
import {rememberResourceWaitR61} from './attack-resource-fairness-r61.mjs';
import {localMixedTargetLimitR51,mixedParticipantIndexR51} from './r51-options.mjs';
import {memoryCombatR53} from './r53-options.mjs';
import {joinedDeathR53} from './attack-commit-r53.mjs';
import {takeDeathBatchR57} from './death-batch-channel-r57.mjs';
import {planMixedSuccessorsR57,takeSingleDeathsR57} from './death-batch-single-r57.mjs';
import {mixedParticipantFastpathR52} from './r52-options.mjs';
import {mixedParticipantsR51} from './mixed-participants-r51.mjs';
import {mixedParticipantsR52} from './mixed-participants-r52.mjs';
import {expandedLocalBudgetR51} from './large-local-budget-r51.mjs';
import {r37Options} from './r37-options.mjs';
import {localMixedTargets} from './local-mixed-targets.mjs';
import {r35Options} from './r35-options.mjs';
import {LOCAL_MIXED_AREAS} from './local-mixed-scope.mjs';
import {captureLocalDeaths,publishLocalDeaths} from './local-deaths.mjs';
import {attackSeedR57} from './planned-attack-seed-r57.mjs';
import {attackRandom} from './attack-writer.mjs';
import {DEFER_INPUT} from './fixed-loop.mjs';
import {demand} from './contract.mjs';
const mixedBatchR61=process.env.CORE511_R61_MIXED_BATCH==='1';

// PvE-only third-skill lane. All cross-owner/PvP/boss/stone/instance cases keep
// the existing SharedCombat route. No movement or shared lease is weakened.
export class LocalMixedCombat {
 constructor(runtime){this.runtime=runtime;this.serial=0;this.metrics={hot:0,durable:0,rejected:0,deaths:0};}
 act(context){
  const r=this.runtime,c=r.channel,{id,epoch,input,now,receivedAtMs=now,inputOrder,kernel}=context,p=c.view.player(id);
  if(!r35Options.localMixed||process.env.CORE511_LOCAL_KILL==='0'||!r35Options.localAoe||input.action!=='attack'||Math.min(3,Math.max(0,Math.floor(Number(input.ability)||0)))!==2||!['avci','arkanist'].includes(p?.role)||!LOCAL_MIXED_AREAS.has(p.area)||p.arena_match_id||p.instance_id||p.instanceId||r.forceSharedActors.get(id)>Date.now())return null;
  if(c.retaliationMemory.due(id,now).some(e=>c.view.monster(e.monster_id)?.channel===0))return null;
  const population=[...c.view.monsters.values()].filter(m=>m.area===p.area&&(m.channel===0||m.channel===p.channel));
  const monsters=r37Options.mixedNarrow?localMixedTargets(population,p,input,now):population;
  if(!monsters.length||monsters.length>localMixedTargetLimitR51||monsters.some(m=>m.channel!==r.peer.channel||m.is_boss||m.is_stone)||!monsters.some(m=>m.id===input.targetId))return null;
  // Nonterminal PvE changes no other recipient's economy. Planning is wholly
  // synchronous and the immutable proposal is checked again by commit(). A
  // party member's potion/HTTP barrier cannot freeze the caster's plain hit.
  let preview=null,previewFrame=null,previewSeed=null;
  if(memoryCombatR53){
   if(c.lanes.busy(['player:'+id]))return DEFER_INPUT;
   previewFrame=c.frames.attack(id,input,receivedAtMs,now);previewSeed=attackSeedR57(context);
   preview=c.attackMemory.plan(previewFrame,{...attackRandom(previewSeed),nowMs:now});
   if(preview.deferred){rememberResourceWaitR61(preview,context,c.view);return DEFER_INPUT;}
   if(!preview.durable&&preview.changes.players.every(row=>row.id===id)){
    const keys=['player:'+id,...preview.changes.monsters.map(m=>'monster:'+m.id)],lease=c.lanes.acquire(keys,c.attack.incarnation);if(!lease)return DEFER_INPUT;
    try{c.attackMemory.commit(preview);for(const e of preview.events)c.ports.publish(...e);this.metrics.hot++;return {type:'action',...preview.result};}finally{c.lanes.release(lease);}
   }
  }
  const ids=[];
  const actors=r37Options.mixedNarrow?(mixedParticipantIndexR51?(mixedParticipantFastpathR52?mixedParticipantsR52(id,monsters,c.attackMemory.participants):mixedParticipantsR51(id,monsters,c.attackMemory.participants.values())):new Set([id,...[...c.attackMemory.participants.values()].filter(row=>monsters.some(m=>m.hp>0&&m.id===row.monster_id&&m.spawn_round===row.spawn_round)).map(row=>row.player_id)])):c.kernel.players.keys();
  for(const actor of actors){
   if(!r.localResident(actor))return null;
   const group=r.localGroup(actor);if(!group)return null;for(const member of group)if(!ids.includes(member))ids.push(member);
  }
  if(!ids.includes(id)||ids.length>25)return null;
  if(monsters.length>1024&&!expandedLocalBudgetR51(monsters,ids))return null;
  // The first area cast may kill only part of the nearby wave. Plan later
  // accepted heads before acquiring the lease. Optional actor expansion uses
  // only the trusted local parties of casts overlapping the monster union.
  const originalKeysR61=[...ids.map(actor=>'player:'+actor),...monsters.map(m=>'monster:'+m.id)];
  const batchPlanR61=mixedBatchR61&&memoryCombatR53&&preview?.durable&&['defeat','mixed_terminal'].includes(preview.boundary?.reason)&&!(preview.boundary.players??[]).some(actor=>actor!==id)&&!ids.some(actor=>kernel.players.get(actor).barrier||kernel.players.get(actor).suspended)&&!c.lanes.busy(originalKeysR61)
   ?planMixedSuccessorsR57(r,{id,input,inputOrder,now,kernel,mixedStartR61:true},{ids,targets:monsters.map(m=>({id:m.id,spawnRound:m.spawn_round}))}):null;
  if(batchPlanR61?.ids)ids.splice(0,ids.length,...batchPlanR61.ids);
  const keys=batchPlanR61?[...ids.map(actor=>'player:'+actor),...batchPlanR61.targets.map(m=>'monster:'+m.id)]:originalKeysR61;
  const priorityR57={kernel,id,input,inputOrder,ids,resources:keys};
  if(olderGroupWaitingR57(priorityR57)){rememberDeferredGroupR57(priorityR57);return DEFER_INPUT;}
  if(ids.some(actor=>kernel.players.get(actor).barrier||kernel.players.get(actor).suspended)||c.lanes.busy(keys)){rememberDeferredGroupR57(priorityR57);return DEFER_INPUT;}
  // Planning and acquiring are synchronous. No owner can change between them.
  const frame=previewFrame??c.frames.attack(id,input,receivedAtMs,now),seed=previewSeed??attackSeedR57(context),plan=preview??c.attackMemory.plan(frame,{...attackRandom(seed),nowMs:now});
  if(plan.deferred){rememberResourceWaitR61(plan,context,c.view);return DEFER_INPUT;}
  const loop=c.attack,lease=c.lanes.acquire(keys,loop.incarnation);if(!lease){rememberDeferredGroupR57(priorityR57);return DEFER_INPUT;}
  if(!plan.durable){try{c.attackMemory.commit(plan);for(const e of plan.events)c.ports.publish(...e);this.metrics.hot++;return {type:'action',...plan.result};}finally{c.lanes.release(lease);}}
  const targets=batchPlanR61?.targets??monsters.map(m=>({id:m.id,spawnRound:m.spawn_round})),deaths=captureLocalDeaths(loop,targets,frame.player,ids,kernel),key='local-mixed:'+loop.incarnation+':'+(++this.serial);let barrier;
  if(memoryCombatR53&&['defeat','mixed_terminal'].includes(plan.boundary?.reason)&&!(plan.boundary.players??[]).some(actor=>actor!==id)){
   const batchAttacksR57=batchPlanR61?takeSingleDeathsR57(c,batchPlanR61):takeDeathBatchR57(r,{id,inputOrder,now,ids,targets,kernel});
   this.metrics.durable++;return joinedDeathR53(loop,{batchAttacksR57,id,input,now,receivedAtMs,kernel,local:{ids,targets,scope:{kind:'mixed',area:p.area,targets,...(r37Options.mixedNarrow?{narrow:true}:{})}},ids,lease,seed,key,replyR54:plan.boundary.replyR54});
  }
  try{
   barrier=kernel.durableGroup(ids,async()=>{
    try{
     await Promise.all(ids.map(actor=>c.checkpoints.drain(actor)));await c.combatCheckpoints.drain();c.lanes.assert(lease);
     const fresh=c.frames.attack(id,input,receivedAtMs,now),ack=await c.writer.submit({actor:id,key,kind:'attack',payload:{localScope:{kind:'mixed',area:p.area,targets,...(r37Options.mixedNarrow?{narrow:true}:{})},nowMs:now,receivedAtMs,seed,input,expected:{player:fresh.player,monster:fresh.preloadedAttackMonster,settings:fresh.settings},resources:lease.keys}});
     demand(ack.key===key&&ack.result,'local_mixed_ack');c.lanes.assert(lease);demand(ack.result.players.every(row=>!kernel.players.has(row.id)||ids.includes(row.id)),'attack_commit_unlocked_resident');
     this.metrics.deaths+=await publishLocalDeaths(loop,{deaths,result:ack.result,lease,kernel,barrier,id,epoch});
     await c.applyCommit(ack.result);while(c.combatCheckpoints.pending)await c.combatCheckpoints.pending;
     c.attackMemory.committed(ack.result);c.combatCheckpoints.committed(ack.result);
     for(const row of ack.result.players)if(kernel.players.has(row.id))c.checkpoints.hydrateCommitted(row);c.encounters.hydrateCommitted(id,ack.result.engagement);
     for(const event of ack.result.events)c.ports.publish(...event);c.lanes.release(lease);this.metrics.durable++;return ack;
    }catch(error){if(lease.state==='held')c.lanes.reject(lease,error);if(error?.code==='local_kill_requires_shared'){r.forceSharedTargets(targets,id);this.metrics.rejected++;}throw error;}
   },{replyTo:id,emitReceipt:false,ackResult:ack=>({type:'action',...ack.result.result})});
  }catch(error){if(lease.state==='held')c.lanes.reject(lease,error);throw error;}
  return {type:'action'};
 }
}
