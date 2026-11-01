import {randomUUID} from 'node:crypto';
import {OperationRandom} from './operation-random.mjs';
import {nativeDailyNext} from './generated/player-job-rules.mjs';
import {demand} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {actorIsolations} from './actor-isolation-proof.mjs';
export class WorldPlayerJobs {
 constructor(world){this.world=world;this.core=world.core;this.running=null;this.held=null;this.nextDaily=0;this.deferred=new WeakSet();this.core.writer.playerJobs=this;}
 run(peer,{nowMs,cycle}){
  demand(!this.running&&this.world.row?.peer.incarnation===peer.incarnation&&Number.isSafeInteger(nowMs)&&nowMs>0&&nowMs<=this.core.clock()+5000,'player_jobs_request');
  this.running=this.execute(peer,nowMs,cycle).catch(error=>{if(actorFaultIsolation&&this.deferred.delete(error))return {deferred:true};this.world.global.held??={phase:'unknown',token:randomUUID()};this.core.onFault({error,playerJobs:true});this.world.global.recover({error});throw error;}).finally(()=>{this.running=null;});return this.running;
 }
 async read(kind,nowMs){return (await this.core.reader.query('kernel511_player_jobs',{kind,nowMs})).rows;}
 async execute(peer,nowMs,cycle){
  let paid=0;
  if(nowMs>=this.nextDaily){
   let daily=await this.read('daily',nowMs);demand(daily.state,'daily_state_missing');
   if(daily.state.enabled){
    if(daily.state.active_day<daily.today){await this.command(peer,{job:'daily_advance',cycle});daily=await this.read('daily',nowMs);}
    if(daily.pending){const result=await this.command(peer,{job:daily.present?'daily_pay':'daily_missing',actor:daily.present?daily.pending.player_id:null,entry:daily.pending,cycle});if(!result?.deferred)paid++;}
    if(!(await this.read('daily',nowMs)).pending)this.nextDaily=nativeDailyNext(nowMs);
   }else this.nextDaily=nativeDailyNext(nowMs);
  }
  const {actors}=await this.read('premium',nowMs);let premiumOwners=0;for(const actor of actors){const result=await this.command(peer,{job:'premium',actor,cycle});if(!result?.deferred)premiumOwners++;await new Promise(resolve=>setImmediate(resolve));}
  const guildOwners=await this.guild(peer,cycle);return {premiumOwners,dailySettlements:paid,guildOwners};
 }
 async guild(peer,cycle){
  const token=randomUUID(),feed=this.core.writer.guildState;let sequence=0,start=true,owners=0;
  while(true){
   const frame=(await this.core.reader.query('kernel511_guild_step',{token,sequence,start,incarnation:peer.incarnation,nowMs:this.core.clock(),durableRevision:feed.current})).rows;demand(frame.token===token,'guild_sync_token');
   if(frame.ahead!==undefined){demand(frame.sequence===sequence,'guild_sync_ahead_sequence');await feed.waitFor(frame.ahead);continue;}
   demand(frame.sequence===sequence+1,'guild_sync_sequence');sequence=frame.sequence;start=false;if(frame.done)return owners;
   if(frame.actor){const result=await this.command(peer,{job:'guild_sync',actor:frame.actor,cycle});if(!result?.deferred)owners++;}
  }
 }
 command(peer,{job,actor=null,entry=null,cycle}){
  const c=this.core;
  return c.serial(async()=>{
   demand(this.world.row?.peer.incarnation===peer.incarnation&&!this.held,'player_job_process_fenced');
   // The exact parent registry already owns this actor's reconciliation.
   // Skip only that actor on later ticks; never turn its fence into a global
   // failure or infer that its earlier command did not commit.
   if(actorFaultIsolation&&actor&&c.actorIsolation?.hasPending(actor))return {deferred:true,actor,job};
   let entered=false;
   const execute=async locked=>{
    entered=true;
    const token=locked?.token??randomUUID(),payload={job,actor,entry,cycle,token,nowMs:c.clock(),seed:OperationRandom.seed()},key='player-job:'+randomUUID(),h={peer,payload,key,locked};this.held=h;
    try{const ack=await this.world.row.control.request('player_job_execute',{key,kind:'player_upkeep',payload});demand(ack.key===key&&ack.result.job===job,'player_job_ack');return ack.result;}finally{this.held=null;}
   };
   try{if(actor)return await c.permanent.durablePlayers([actor],entries=>execute(entries[0]));return await execute(null);}
   catch(error){
    const proofs=actorFaultIsolation?actorIsolations(error):[],proof=proofs.length===1?proofs[0]:null,isolating=actor&&c.actorIsolation?.entries.get(actor);
    // PermanentCoordinator has already aborted the untouched callback,
    // resumed healthy owners and queued this exact stopped actor. Let the
    // next ordinary scheduler tick re-read due work; never replay a command.
    if(!entered&&proof?.actor===actor&&!c.permanent.entries.has(actor)&&isolating?.token===proof.token&&isolating.epoch===proof.epoch)this.deferred.add(error);
    throw error;
   }
  });
 }
 assertHeld(sql,payload,context){
  const h=this.held;demand(h&&h.peer.incarnation===context.peer.incarnation&&h.key===context.key&&JSON.stringify(h.payload)===JSON.stringify(payload)&&sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle===payload.cycle,'player_job_writer_fenced');
  if(payload.actor){const entry=this.core.permanent.entries.get(payload.actor);demand(entry===h.locked&&entry.phase==='frozen'&&entry.token===payload.token,'player_job_actor_fenced');if(entry.owner){const current=this.core.authority.owner(payload.actor);demand(current?.epoch===entry.owner.epoch&&current.incarnation===entry.owner.incarnation&&current.state==='active'&&current.sequence===entry.finalSequence,'player_job_sequence_fenced');}}
  return true;
 }
}
