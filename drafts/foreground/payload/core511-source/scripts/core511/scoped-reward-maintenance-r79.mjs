import {scopedRewardActorsR79} from './reward-actor-scope-r80.mjs';
export {scopedRewardActorsR79} from './reward-actor-scope-r80.mjs';
import {randomUUID} from 'node:crypto';
import {OperationRandom} from './operation-random.mjs';
import {createAttackWriterRules} from './generated/attack-writer-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {mountRewardResult} from './mounts-rewards.mjs';
import {demand} from './contract.mjs';

const reasons=new Set(['pending_boss','pending_sinsi','abandoned_normal','pending_drop']);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// Background rewards reuse the original native selectors and award functions,
// but never run the unrelated arena/world work in nativeHeartbeatMaintenance.
export function selectScopedRewardR79(writer,reason){
 const sql=writer.database.sqlite,db=nativeAtomicStatements(sql),rules=createAttackWriterRules({globals:writer.services.globals}),settings=writer.settingsCache.read(sql);
 if(reason==='pending_boss'){const row=rules.readPendingBoss511(db,settings);return row?{kind:'boss',round:row.boss_round}:null;}
 if(reason==='pending_sinsi'){const row=rules.readPendingSinsi511(db,settings);return row?{kind:'sinsi',id:row.monster_id,round:row.spawn_round}:null;}
 if(reason==='abandoned_normal'){const row=rules.readPendingNormal511(db,settings);return row?{kind:'normal',id:row.monster_id,round:row.spawn_round,...(row.loot_source_key==='adventure.catalog'?{globalOnly:true}:{})}:null;}
 if(reason==='pending_drop'){
  const rows=rules.readPendingDrops511(db,settings).map(row=>prepareCached477(sql,'SELECT id,owner_id FROM world_drops WHERE id=?').get(row.id)).filter(Boolean);
  return rows.length?{kind:'drops',rows:rows.map(row=>({id:row.id,owner:row.owner_id})).sort((a,b)=>a.id.localeCompare(b.id))}:null;
 }
 return null;
}


export class ScopedRewardMaintenanceR79 {
 constructor(world){this.world=world;this.core=world.core;this.held=null;this.trace=[];this.core.writer.scopedRewardsR79=this;}
 async run(peer,entry){
  if(!reasons.has(entry?.maintenanceReason))return null;
  const c=this.core,started=performance.now();let actors=[],previous=new Map(),executing=false;
  try{return await c.serial(async()=>{
   if(this.world.row?.peer.incarnation!==peer.incarnation||this.world.row.exited||this.held||c.recoveringWorld)return {handled:true,deferred:true};
   const target=selectScopedRewardR79(c.writer,entry.maintenanceReason);
   if(!target)return {handled:true,stale:true};
   // Adventure run awards retain their original global owner until audited.
   // Event/dragon award bodies only write recipient rewards and receipts;
   // they use the same transaction/RNG service context below as native claims.
   if(target.globalOnly)return null;
   actors=scopedRewardActorsR79(c.database.sqlite,target);
   // Preserve the original global fallback for unbounded historic recipient
   // sets or orphaned native records; never leave them in an endless retry.
   if(!actors.length||actors.length>100)return null;
   if(actors.some(id=>c.transitions.has(id)||c.entryReads.has(id)))return {handled:true,deferred:true};
   previous=new Map(actors.map(id=>[id,c.permanent.entries.get(id)]));c.permanent.assertAvailable(actors);
   const result=await c.permanent.durablePlayers(actors,async locked=>{
    executing=true;
    const payload={target,actors,reason:entry.maintenanceReason,cycle:entry.cycle,nowMs:c.clock(),seed:OperationRandom.seed(),token:randomUUID()},key='scoped-reward:'+payload.token;
    this.held={peer,payload,key,locked};
    try{const ack=await this.world.row.control.request('player_job_execute',{key,kind:'scoped_reward',payload});demand(ack?.key===key&&ack.result,'scoped_reward_ack');return ack.result;}finally{this.held=null;}
   });
   const deferred=Boolean(result.deferred||target.kind==='drops'&&result.result?.processed===0);
   this.record({reason:entry.maintenanceReason,actors:actors.length,holdAndRefreshMs:performance.now()-started,deferred,global:false});return {handled:true,...(deferred?{deferred:true}:{})};
  });}catch(error){
   // The existing permanent coordinator owns uncertain durability/recovery.
   // Do not tear down the otherwise healthy world or drop an unpaid obligation.
   const recovery=executing||actors.some(id=>{const e=c.permanent.entries.get(id);return e&&e!==previous.get(id);});
   this.record({reason:entry.maintenanceReason,actors:actors.length,deferred:true,recovery,code:error?.code??'scoped_reward_deferred',global:false});return {handled:true,deferred:true,recovery};
  }
 }
 record(row){this.trace.push(row);if(this.trace.length>128)this.trace.shift();}
 assertHeld(sql,payload,context){
  const h=this.held;demand(h&&h.peer.incarnation===context.peer.incarnation&&h.key===context.key&&same(h.payload,payload)&&prepareCached477(sql,'SELECT cycle FROM world_state WHERE id=1').get().cycle===payload.cycle,'scoped_reward_writer_fenced');
  for(const held of h.locked){const e=this.core.permanent.entries.get(held.id);demand(e===held&&e.phase==='frozen','scoped_reward_actor_not_frozen');if(e.owner){const owner=this.core.authority.owner(e.id,sql);demand(owner?.state==='active'&&owner.epoch===e.owner.epoch&&owner.incarnation===e.owner.incarnation&&owner.sequence===e.finalSequence,'scoped_reward_sequence_fenced');}}
  return true;
 }
}

export function runScopedRewardR79(writer,sql,payload,context){
 demand(context.peer.channel===0&&context.peer.role==='world'&&writer.scopedRewardsR79?.assertHeld(sql,payload,context),'scoped_reward_owner');
 const {target,actors,nowMs}=payload;
 // Revalidate after every recipient has drained. Changed selection or party
 // membership is deferred before any native reward/random draw occurs.
 if(!same(selectScopedRewardR79(writer,payload.reason),target)||!same(scopedRewardActorsR79(sql,target),actors))return {deferred:true};
 const scoped={...payload,sharedLease:payload.token,resources:actors.map(id=>'player:'+id)},ctx={...context,actor:actors[0]},shared={assertWrite:()=>writer.scopedRewardsR79.assertHeld(sql,payload,context),allows:id=>actors.includes(id)};
 return writer.services.run(payload,()=>writer.playerWrites.run(sql,scoped,ctx,'scoped_reward',()=>writer.monsterWrites.run(sql,scoped,ctx,()=>{
  const events=[],record=(...args)=>events.push(args),sync=value=>{demand(!value?.then,'scoped_reward_async');return value;};
  const rules=createAttackWriterRules({...writer.services.active,globals:writer.services.globals,now:()=>nowMs,fourChannels:true,ports:{publishRealtimeRoomEvent:record,publishRealtimeRoomEventToChannels:record,publishRealtimePlayerEvent:record,publishRealtimeWorldEvent:record,deliverRealtime:sync,runRewardDelivery:(_,key,fn)=>mountRewardResult(writer.services.globals,key,sync(fn()))}}),db=nativeAtomicStatements(sql),settings=writer.settingsCache.read(sql),now=Math.floor(nowMs/1000);
  let result;
  if(target.kind==='boss')result=sync(rules.awardPendingBossRewards(db,settings,now,target.round));
  else if(target.kind==='sinsi')result=sync(rules.awardPendingSinsiStoneRewards(db,settings,now,{id:target.id,spawn_round:target.round}));
  else if(target.kind==='normal')result=sync(rules.awardPendingNormalRewards(db,settings,now,{id:target.id,spawn_round:target.round}));
  else{for(const row of target.rows)sync(rules.tryFinalizePendingDropEnchantments(db,settings,{ownerId:row.owner,dropId:row.id}));result={processed:target.rows.filter(row=>!prepareCached477(sql,"SELECT 1 FROM world_drops WHERE id=? AND enchantments IN ('__pending__','__profile_pending__')").get(row.id)).length};}
  return writer.notifications.append(sql,ctx,{result:result??null,events},{immediatePublisher:false});
 },{shared,readOnly:true}),{shared,afterWriteGuard:(_,ids)=>{demand(ids.every(id=>actors.includes(id)),'scoped_reward_unlocked_recipient');return writer.scopedRewardsR79.assertHeld(sql,payload,context);}}));
}
