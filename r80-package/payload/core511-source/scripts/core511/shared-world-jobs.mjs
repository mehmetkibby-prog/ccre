import {rewardRecoveryR62} from './reward-recovery-r62.mjs';
import {randomUUID} from 'node:crypto';
import {OperationRandom} from './operation-random.mjs';
import {demand} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';

export class SharedWorldJobs {
 constructor(runtime){this.runtime=runtime;this.enabled=false;this.pending=null;this.blocked=false;this.transition=null;this.nextAt=0;this.nextMaintenanceAt=0;this.nextCleanupAt=0;this.serial=0;this.incarnation=randomUUID();}
 tick(nowMs){
  if(!this.enabled||this.pending||nowMs<this.nextAt)return;this.nextAt=nowMs+1000;
  this.pending=this.run(nowMs).catch(error=>{this.blocked=true;this.runtime.fail(error);throw error;}).finally(()=>{this.pending=null;});void this.pending.catch(()=>{});
 }
 async run(nowMs){
  const r=this.runtime,maintenance=nowMs>=this.nextMaintenanceAt;
  // Reward retries may wake this loop every 50/250 ms. Keep the ordinary
  // world/player scans on their own one-second cadence; no reward receipt,
  // ownership barrier or transition is skipped by this scheduling boundary.
  if(maintenance){
   this.nextMaintenanceAt=nowMs+1000;
   const key='world-upkeep:'+this.incarnation+':'+(++this.serial),ack=await r.writer.submit({key,kind:'world_upkeep',payload:{nowMs,cycle:r.initial.world.cycle}});r.setWorld(ack.result.worldPoint);
  }
  // A later reward retry must not push the next ordinary maintenance back.
  this.nextAt=Math.min(this.nextAt,this.nextMaintenanceAt);
  const state=r.initial.world,now=Math.floor(nowMs/1000);let mode=state.reset_at&&state.reset_at<=now?'reset':!state.reset_at&&state.guardian_reward_at<=now?'guardian':null;
  if(!mode&&maintenance&&(await r.request('guild_war_due',{nowMs})).due)mode='guild_timeout';
  let heartbeatJob=null;if(!mode){if(maintenance)await r.request('world_player_jobs',{nowMs,cycle:state.cycle});heartbeatJob=await r.request('heartbeat_due',{nowMs,cycle:state.cycle});if(rewardRecoveryR62&&heartbeatJob?.recoveryOnlyR62){demand([50,250].includes(heartbeatJob.retryAfterMs),'reward_recovery_retry_bound');this.nextAt=Math.min(this.nextAt,Date.now()+heartbeatJob.retryAfterMs);heartbeatJob=null;}if(heartbeatJob)mode='heartbeat';}
  if(heartbeatJob?.scopedRewardR79){demand([50,1000].includes(heartbeatJob.retryAfterMs),'scoped_reward_retry_bound');this.nextAt=Math.min(this.nextAt,Date.now()+heartbeatJob.retryAfterMs);heartbeatJob=null;mode=null;}
  if(!mode&&maintenance&&(await r.request('dungeon_lifecycle_due',{nowMs})).due)mode='dungeon_cleanup';
  if(!mode){await this.cleanup(nowMs);return;}
  this.blocked=true;if(r.lifecycle.pending)await r.lifecycle.pending;
  const token=randomUUID();this.transition={token,mode,cycle:r.initial.world.cycle,refreshed:false};
  const prepared=await r.request('world_transition_prepare',{token,mode,cycle:r.initial.world.cycle});
  if(prepared?.skipped===true){demand(mode==='heartbeat'&&prepared.token===token&&prepared.cycle===r.initial.world.cycle&&prepared.prepared===false&&!this.transition.refreshed,'world_transition_skip_ack');this.transition=null;this.blocked=false;return {skipped:true};}
  if(actorFaultIsolation&&prepared?.aborted===true&&prepared.prepared===false){demand(prepared.token===token&&prepared.cycle===r.initial.world.cycle&&!this.transition.refreshed,'world_transition_abort_ack');this.transition=null;this.blocked=false;return {aborted:true};}
  demand(prepared?.token===token&&prepared.prepared&&prepared.cycle===r.initial.world.cycle,'world_transition_prepare_ack');
  await r.sharedCombat?.idle();await r.journal.drain();await r.writer.drain();await r.project();
  const result=await r.writer.submit({key:'world-transition:'+token,kind:'world_transition',payload:{mode,token,cycle:r.initial.world.cycle,nowMs,seed:OperationRandom.seed(),...(heartbeatJob?{heartbeatJob}:{})}});
  demand(this.transition.refreshed&&result.result.world.cycle===r.initial.world.cycle,'world_transition_refresh_missing');this.transition=null;this.blocked=false;await this.cleanup(nowMs);
 }
 async cleanup(nowMs){if(nowMs<this.nextCleanupAt)return;this.nextCleanupAt=nowMs+30000;const r=this.runtime,answer=await r.request('world_cleanup',{nowMs,cycle:r.initial.world.cycle});if(answer.deferred)this.nextCleanupAt=nowMs+1000;}
 refresh({token,worldPoint,initial=null,contributions=null}){
  const r=this.runtime,t=this.transition;demand(t?.token===token&&this.blocked&&!t.refreshed,'shared_global_fenced');
  if(initial){demand(t.mode==='reset'&&initial.world.cycle===t.cycle+1&&initial.system.incarnation===r.peer.incarnation&&initial.system.epoch===r.writer.epoch,'shared_global_reset_scope');demand(!r.journal.pending&&!r.lifecycle.pending&&!r.projecting,'shared_global_reset_pending');
   demand(!r.sharedCombat?.busy,'shared_global_combat_pending');r.initial=initial;r.worldPoint=initial.worldPoint;r.view.monsters.clear();r.view.owners.clear();r.view.engagements.clear();r.view.engagedByMonster.clear();r.rules.regenClocks.clear();r.changed.clear();r.version=0;r.fullNeeded=true;
   for(const rows of r.journal.base.values())rows.clear();for(const rows of r.journal.current.values())rows.clear();r.journal.events.length=0;for(const m of initial.monsters)r.view.setMonster(m);r.view.receive(initial.engagements);r.journal.hydrate('monsters',initial.monsters);for(const [key,row]of Object.entries(initial.config))r.rules.config.set(key,row);
   for(const kind of ['participants','bossParticipants'])r.journal.hydrate(kind,initial[kind]??[]);
  }else{demand(worldPoint.world.cycle===t.cycle,'shared_global_refresh_cycle');r.setWorld(worldPoint);}
  if(contributions){demand(!r.sharedCombat?.busy&&!r.journal.pending,'shared_global_contributions_pending');for(const kind of ['participants','bossParticipants']){r.journal.base.get(kind).clear();r.journal.current.get(kind).clear();r.journal.hydrate(kind,contributions[kind]);}}
  t.refreshed=true;return {token,cycle:r.initial.world.cycle,refreshed:true};
 }
 async publish({token}){demand(this.transition?.token===token&&this.transition.refreshed,'shared_global_fenced');await this.runtime.project({full:true});return {token,published:true};}
 async drain(){this.enabled=false;if(this.pending)await this.pending;}
}
