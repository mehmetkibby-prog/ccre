import {olderGroupWaitingR57,rememberDeferredGroupR57} from './group-fairness-r57.mjs';
import {rememberResourceWaitR61} from './attack-resource-fairness-r61.mjs';
import {memoryCombatR53} from './r53-options.mjs';
import {joinedDeathR53} from './attack-commit-r53.mjs';
import {randomUUID} from 'node:crypto';
import {attackSeedR57} from './planned-attack-seed-r57.mjs';
import {attackRandom} from './attack-writer.mjs';
import {DEFER_INPUT} from './fixed-loop.mjs';
import {demand} from './contract.mjs';
import {captureLocalDeaths,publishLocalDeaths} from './local-deaths.mjs';
import {instanceRewardAreaR71} from './instance-reward-scope-r71.mjs';
const localDeathAreas=new Set(['forest','frozen','black','ancient','sanctum']);

// Only the channel's trusted context/footprint providers may construct frames
// and affected-actor sets. Client payloads cannot choose ownership or rewards.
export class AttackLoop {
 constructor({memory,lanes,checkpoints,combatCheckpoints,submit,frameFor,affectedActors,committed,publish,clock=Date.now}){
  for(const fn of [submit,frameFor,affectedActors,committed,publish])demand(typeof fn==='function','attack_loop_dependencies');
  Object.assign(this,{memory,lanes,checkpoints,combatCheckpoints,submit,frameFor,affectedActors,committed,publish,clock});this.incarnation=randomUUID();this.serial=0;
  memory.blocked=monster=>lanes.busy(['monster:'+monster.id]);
 }
 attack({id,epoch,input,now,receivedAtMs=now,inputOrder,kernel}){
  if(this.lanes.busy(['player:'+id]))return DEFER_INPUT;
  const context=this.frameFor(id,input,now,receivedAtMs),seed=attackSeedR57({id,epoch,input,inputOrder});
  demand(context.playerId===id&&context.player.channel===kernel.state.channel,'attack_context_scope');
  const result=this.memory.step(context,{...attackRandom(seed),nowMs:now});
  if(result.deferred){rememberResourceWaitR61(result,{id,epoch,input,inputOrder,kernel},this.memory.view);return DEFER_INPUT;}
  if(!result.durable){for(const event of result.events)this.publish(...event);return {type:'action',...result.result};}
  // A local monster's historical contributors may now live on other channels.
  // The preview has not promoted its overlay. Reuse its accepted seed/time in
  // the existing shared cold barrier before any native reward SQL executes.
  let local=this.shared?this.localKill?.(id,result)??null:null;
  if(this.shared&&!local)return this.shared.act({id,epoch,input,now,receivedAtMs,kernel},{seed});
  const ids=local?.ids??[...new Set([id,...result.boundary.players??[],...this.affectedActors(id,result.boundary.targets)])];
  const batchPlanR57=memoryCombatR53&&local&&result.boundary.reason==='defeat'?this.planBatchR57?.({id,input,inputOrder,now,kernel},local):null;
  if(batchPlanR57)local={...local,targets:batchPlanR57.targets,...(batchPlanR57.scope?{scope:batchPlanR57.scope}:{})};
  const targetIdsR57=batchPlanR57?local.targets.map(t=>t.id):result.boundary.targets;
  const priorityR57={kernel,id,input,inputOrder,ids,resources:targetIdsR57.map(target=>'monster:'+target)};
  if(olderGroupWaitingR57(priorityR57)){rememberDeferredGroupR57(priorityR57);return DEFER_INPUT;}
  if(ids.some(actor=>!kernel.players.has(actor)||kernel.players.get(actor).barrier||kernel.players.get(actor).suspended)){rememberDeferredGroupR57(priorityR57);return DEFER_INPUT;}
  const lease=this.lanes.acquire([...ids.map(actor=>'player:'+actor),...targetIdsR57.map(target=>'monster:'+target)],this.incarnation);if(!lease){rememberDeferredGroupR57(priorityR57);return DEFER_INPUT;}
  const death=local?.targets?.length===1?{target:{...local.targets[0]},before:this.memory.view?.monster?.(local.targets[0].id),scope:{area:context.player.area,channel:context.player.channel,cycle:context.player.world_cycle,version:context.player.realtime_scope_version},actors:ids.map(id=>({id,p:kernel.players.get(id),epoch:kernel.players.get(id).epoch,owner:kernel.state.owners.get(id)}))}:null;
  const deaths=local?.targets?.length>1?captureLocalDeaths(this,local.targets,context.player,ids,kernel):null;
  const key='attack:'+this.incarnation+':'+(++this.serial);
  if(memoryCombatR53&&local&&result.boundary.reason==='defeat'&&local.targets.every(t=>{const m=this.memory.view.monster(t.id);return m&&!m.is_boss&&!m.is_stone&&(localDeathAreas.has(m.area)||instanceRewardAreaR71(m.area));}))return joinedDeathR53(this,{batchAttacksR57:batchPlanR57?this.takeBatchR57(batchPlanR57):[],id,input,now,receivedAtMs,kernel,local,ids,lease,seed,key,replyR54:result.boundary.replyR54});
  let barrier;
  try{
   barrier=kernel.durableGroup(ids,async()=>{
    try{
     // Stop accepted actor inputs first (durableGroup), then drain the latest
     // position/HP/encounters and shared contribution checkpoint. No kill is
     // applied against a stale five-second SQL image.
     await Promise.all(ids.map(actor=>this.checkpoints.drain(actor)));await this.combatCheckpoints.drain();
     this.lanes.assert(lease);const fresh=this.frameFor(id,input,now,receivedAtMs);
     const ack=await this.submit({actor:id,key,kind:'attack',payload:{...(local?{localScope:{kind:'kill',targets:local.targets}}:{}),nowMs:now,receivedAtMs:context.requestReceivedAtMs,seed,input,expected:{player:fresh.player,monster:fresh.preloadedAttackMonster,settings:fresh.settings},resources:lease.keys}});
     demand(ack.key===key&&ack.result,'attack_ack_mismatch');this.lanes.assert(lease);
     demand(ack.result.players.every(p=>!kernel.players.has(p.id)||ids.includes(p.id)),'attack_commit_unlocked_resident');
     if(death)await this.publishLocalDeath({death,result:ack.result,lease,kernel,barrier,id,epoch});
     if(deaths)await publishLocalDeaths(this,{deaths,result:ack.result,lease,kernel,barrier,id,epoch});
     await this.committed(ack.result);
     // R22: other residents keep hitting while this local kill commits, so a
     // periodic combat checkpoint may now be in flight. Let it finish, then
     // apply this commit to memory without yielding again.
     while(this.combatCheckpoints.pending)await this.combatCheckpoints.pending;
     this.memory.committed(ack.result);this.combatCheckpoints.committed(ack.result);
     for(const player of ack.result.players)if(kernel.players.has(player.id))this.checkpoints.hydrateCommitted(player);
     this.checkpoints.encounters?.hydrateCommitted(id,ack.result.engagement);
     for(const event of ack.result.events)this.publish(...event);
     this.lanes.release(lease);return ack;
    }catch(error){if(lease.state==='held')this.lanes.reject(lease,error);if(local&&error?.code==='local_kill_requires_shared')this.localRejected?.(local.targets,id);throw error;}
   },{replyTo:id,emitReceipt:false,ackResult:ack=>({type:'action',...ack.result.result})});
  }catch(error){if(lease.state==='held')this.lanes.reject(lease,error);throw error;}
  return {type:'action'};
 }
 async publishLocalDeath({death,result,lease,kernel,barrier,id,epoch}){
  const {before,target,scope,actors}=death,monster=result.monsters?.[0];
  const valid=()=>{
   const player=kernel.state.read('players',id);
   return Boolean(before&&Object.isFrozen(before)&&this.memory.view?.monster(target.id)===before&&before.id===target.id&&before.spawn_round===target.spawnRound&&before.hp>0&&before.is_boss===0&&before.is_stone===0&&localDeathAreas.has(before.area)&&before.channel===kernel.state.channel&&before.area===scope.area&&before.channel===scope.channel&&player?.hp>0&&player.area===scope.area&&player.channel===scope.channel&&player.cycle===scope.cycle&&player.realtime_scope_version===scope.version&&!player.arena_match_id&&!player.instance_id&&!player.instanceId&&Array.isArray(result.monsters)&&result.monsters.length===1&&monster?.id===before.id&&monster.hp===0&&monster.spawn_round===before.spawn_round&&monster.channel===before.channel&&monster.area===before.area&&monster.is_boss===0&&monster.is_stone===0&&monster.max_hp===before.max_hp&&!result.removed?.length&&!result.moves?.length&&!result.mistLoot&&result.bossParticipants?.length===0&&barrier&&kernel.players.get(id)?.epoch===epoch&&lease.state==='held'&&lease.owner===this.incarnation&&this.lanes.tokens.has(lease)&&lease.keys.every(key=>this.lanes.owns(lease,key))&&actors.every(a=>kernel.players.get(a.id)===a.p&&kernel.state.owners.get(a.id)===a.owner&&a.owner?.epoch===a.epoch&&a.p.epoch===a.epoch&&a.owner.state==='active'&&a.p.barrier===barrier&&a.p.accepting&&!a.p.quiescer&&!a.p.suspended&&!a.p.externalHold));
  };
  if(!valid())return false;
  // This is the writer's acknowledged death, never the lethal preview. A
  // concurrent journal must settle before ANY terminal row is installed.
  while(this.combatCheckpoints.pending)await this.combatCheckpoints.pending;
  if(!valid())return false;
  this.lanes.assert(lease);
  this.memory.committed(result);this.combatCheckpoints.committed(result);
  this.memory.view.setMonster(monster);
  // Only the next normal world projection can publish this committed row.
  // Full actor refresh, original journal join, events and durable reply remain
  // below the caller's unchanged barrier; none is acknowledged here.
  return true;
 }
}
