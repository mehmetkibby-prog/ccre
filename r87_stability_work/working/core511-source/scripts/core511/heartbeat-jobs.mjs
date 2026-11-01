import {r37Options} from './r37-options.mjs';
import {rewardRecoveryR62} from './reward-recovery-r62.mjs';
import {AbandonedNormal} from './abandoned-normal.mjs';
import {ScopedRewardMaintenanceR79} from './scoped-reward-maintenance-r79.mjs';
import {demand} from './contract.mjs';
import {canonicalAttack} from './attack-writer.mjs';

export class HeartbeatJobs {
 constructor(world){this.world=world;this.core=world.core;this.pending=new Map();this.held=null;this.core.heartbeatJobs=this;this.core.writer.heartbeatJobs=this;this.abandoned=new AbandonedNormal(world);this.scopedRewardsR79=new ScopedRewardMaintenanceR79(world);}
 schedule(peer,payload){
  const {actor,epoch,counter,nowMs,cycle,heartbeat}=payload??{},owner=this.core.writer.owners.get(actor);
  demand(owner?.admitted&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&owner.epoch===epoch&&Number.isSafeInteger(counter)&&counter>0&&Number.isSafeInteger(nowMs)&&nowMs>=0&&nowMs<=this.core.clock()+5000&&Number.isSafeInteger(cycle)&&heartbeat?.channel===peer.channel&&typeof heartbeat.area==='string'&&typeof heartbeat.arena_match_id==='string','heartbeat_schedule_fenced');
  const previous=this.pending.get(actor);if(previous&&previous.epoch===epoch&&previous.counter>=counter)return {queued:false};
  demand(this.pending.has(actor)||this.pending.size<100,'heartbeat_schedule_capacity');this.pending.set(actor,structuredClone(payload));return {queued:true};
 }
 async due(peer,{nowMs,cycle}){
  demand(this.world.row?.peer.incarnation===peer.incarnation&&!this.held,'heartbeat_job_process_fenced');const snapshot=[];
  for(const [id,row]of this.pending){const owner=this.core.writer.owners.get(id);if(!owner?.admitted||owner.epoch!==row.epoch||row.cycle!==cycle){this.pending.delete(id);continue;}
   // The world tick's clock predates its awaited upkeep/player jobs. A fresh
   // authenticated heartbeat can arrive while that scan waits. Keep it for
   // the next scan rather than pairing it with an older clock and failing the
   // reader's unchanged future-time fence. Never rewrite or consume the row.
   if(row.nowMs>nowMs+5000)continue;
   snapshot.push(row);
  }
  // The durable defeat ledger is the wake-up source. No browser heartbeat,
  // old owner epoch or reconnect is required to retain an unpaid obligation.
  let recovery=null;
  if(rewardRecoveryR62&&r37Options.abandonedLocal){
   const entry=(await this.core.reader.query('kernel511_normal_recovery_r62',{cycle,nowMs})).rows;
   if(entry){const result=await this.abandoned.run(peer,entry);recovery={recoveryOnlyR62:true,retryAfterMs:result?.deferred?250:50};}
  }
  if(!snapshot.length)return recovery;
  let selected=(await this.core.reader.query('kernel511_heartbeat_due',{entries:snapshot,cycle,nowMs,...(rewardRecoveryR62&&r37Options.abandonedLocal?{skipOrdinaryR62:true}:{})})).rows,localHandled=false;
  if(selected?.normalTarget){
   const result=await this.abandoned.run(peer,selected);localHandled=Boolean(result);
   if(localHandled){
    if(result.recovery||this.core.recoveringWorld)return null;
    // One bounded local batch, then visit drops/arena in THIS heartbeat. Keep
    // the wakeups until a later scan proves no work remains, even without a
    // new client heartbeat or when a fenced recipient deferred the local job.
    selected=(await this.core.reader.query('kernel511_heartbeat_due',{entries:snapshot,cycle,nowMs,skipAbandoned:true})).rows;
   }
  }
  const scoped=selected?.maintenanceReason?await this.scopedRewardsR79.run(peer,selected):null;
  if(scoped?.handled){
   // Rewards cannot starve arena queues/forfeits, even if a pending drop keeps
   // failing its native finalization. Arena still uses its global transition.
   selected=(await this.core.reader.query('kernel511_heartbeat_due',{entries:snapshot,cycle,nowMs:this.core.clock(),skipRewardsR79:true})).rows;
   if(!selected)return {scopedRewardR79:true,retryAfterMs:scoped.deferred?1000:50};
  }
  // A selected native task can consume only its own descriptor. Other arena
  // queues/forfeits must remain pending even if their actor never sends again.
  if(!localHandled)for(const row of snapshot)if((!selected||row.actor===selected.actor)&&this.pending.get(row.actor)===row)this.pending.delete(row.actor);
  if(selected)this.held={entry:selected,incarnation:peer.incarnation};return selected??recovery;
 }
 async obsolete(peer,cycle){
  const held=this.held,world=this.world.row;
  const current=()=>this.held===held&&held?.incarnation===peer.incarnation&&held.entry.cycle===cycle&&this.world.row===world&&world?.peer.incarnation===peer.incarnation&&!world.exited;
  demand(current(),'heartbeat_recheck_fenced');
  // Accepted foreground claims can settle the discovery while global prepare
  // drains shared producers. Repeat the original query; never infer that one
  // paid reward means the rest of this native maintenance batch is empty.
  const selected=(await this.core.reader.query('kernel511_heartbeat_due',{entries:[held.entry],cycle,nowMs:this.core.clock(),...(rewardRecoveryR62&&r37Options.abandonedLocal?{skipOrdinaryR62:true}:{})})).rows;
  demand(current(),'heartbeat_recheck_fenced');
  return selected===null?held:null;
 }
 assertHeld(sql,entry,context){
  demand(this.held?.incarnation===context.peer.incarnation&&canonicalAttack(this.held.entry)===canonicalAttack(entry),'heartbeat_job_not_selected');
  const owner=this.core.authority.owner(entry.actor,sql),admission=this.core.authority.admission(entry.actor,sql);return Boolean(owner?.state==='active'&&owner.epoch===entry.epoch&&admission?.epoch===entry.epoch);
 }
 complete(entry){demand(this.held&&canonicalAttack(this.held.entry)===canonicalAttack(entry),'heartbeat_completion_fenced');this.held=null;}
 reset(){this.held=null;}
}
