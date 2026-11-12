import {olderGroupWaitingR57,rememberDeferredGroupR57} from './group-fairness-r57.mjs';
import {stageStartR51,stageEndR51,stageRecordR51} from './stage-timing-r51.mjs';
import {memoryCombatR53} from './r53-options.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {CASTLE_AREA,castleEnabled} from './castle-model-r59.mjs';
import {randomUUID} from 'node:crypto';
import {OperationRandom} from './operation-random.mjs';
import {attackRandom} from './attack-writer.mjs';
import {DEFER_INPUT} from './fixed-loop.mjs';
import {demand} from './contract.mjs';

export class PvpLoop{
 constructor({memory,lanes,checkpoints,combatCheckpoints,submit,frameFor,affectedActors,committed,publish}){
  for(const fn of [submit,frameFor,affectedActors,committed,publish])demand(typeof fn==='function','pvp_loop_dependencies');
  Object.assign(this,{memory,lanes,checkpoints,combatCheckpoints,submit,frameFor,affectedActors,committed,publish});this.incarnation=randomUUID();this.serial=0;const blocked=memory.blocked;memory.blocked=id=>lanes.busy(['player:'+id])||blocked(id);
 }
 attack({id,input,now,receivedAtMs=now,inputOrder,kernel}){
  // A cold equipment/ownership barrier invalidates the target projection.
  // Wait before constructing that frame, not only when applying its damage.
  const castle=castleEnabled()&&kernel.state.read('players',id)?.area===CASTLE_AREA,priority={kernel,id,input,inputOrder,ids:[...new Set([id,input.targetPlayerId].filter(x=>typeof x==='string'))]};
  const defer=ids=>{if(castle)rememberDeferredGroupR57({...priority,ids:ids??priority.ids});return DEFER_INPUT;};
  if(castle&&olderGroupWaitingR57(priority)||this.lanes.busy(['player:'+id])||typeof input.targetPlayerId==='string'&&this.lanes.busy(['player:'+input.targetPlayerId]))return defer();
  const context=this.frameFor(id,input,now,receivedAtMs),seed=OperationRandom.seed();demand(context.playerId===id&&context.actionSnapshot.player.channel===kernel.state.channel,'pvp_context_scope');
  const result=this.memory.step(context,{...attackRandom(seed),nowMs:now});if(result.deferred)return defer(result.players);
  if(!result.durable){for(const event of result.events)this.publish(...event);return {type:'action',...result.result};}
  if(this.shared&&!(castleEnabled()&&context.actionSnapshot.player.area===CASTLE_AREA)){
   const actor=context.actionSnapshot.player,players=actor.area==='arena'?[...this.shared.channel.view.players.values()].filter(p=>p.channel===actor.channel&&p.area==='arena'&&p.arena_match_id===actor.arena_match_id&&kernel.players.has(p.id)).map(p=>p.id):[...new Set([id,...result.boundary.players])];
   return this.shared.act({id,epoch:kernel.players.get(id).epoch,input,now,receivedAtMs,kernel},{players,seed});
  }
  const ids=[...new Set([...result.boundary.players,...this.affectedActors(context,result.boundary.players)])];
  if(castle&&olderGroupWaitingR57({...priority,ids})||ids.some(pid=>!kernel.players.has(pid)||kernel.players.get(pid).barrier||kernel.players.get(pid).suspended))return defer(ids);
  const lease=this.lanes.acquire([...ids.map(pid=>'player:'+pid),...(result.boundary.targets??[]).map(id=>'monster:'+id)],this.incarnation);if(!lease)return defer(ids);
  const key='pvp:'+this.incarnation+':'+(++this.serial),joined=castleEnabled()&&memoryCombatR53&&context.actionSnapshot.player.area===CASTLE_AREA;let actors=[],accepted=false;const cancel=()=>{for(const t of actors)if(t.entry.joinedR53===t)this.checkpoints.finishR53(t);};
  stageRecordR51('castle.pvp.inputWait',Math.max(0,now-receivedAtMs));
  try{kernel.durableGroup(ids,async()=>{
   let stage=stageStartR51();try{
    if(joined){await Promise.all(ids.map(pid=>this.checkpoints.entries.get(pid)?.pending));for(const pid of ids)actors.push(this.checkpoints.captureR53(pid));}else await Promise.all(ids.map(pid=>this.checkpoints.drain(pid)));
    // Castle PvP reads no prior combat-event history and grants no kill rewards.
    // HP/cooldown journals are joined above; visual history keeps its existing
    // bounded periodic journal and mandatory ownership-exit drain.
    if(!joined)await this.combatCheckpoints.drain();this.lanes.assert(lease);
    stageEndR51('castle.pvp.checkpoint',stage);stage=stageStartR51();
    const fresh=this.frameFor(id,input,now,receivedAtMs);
    const ack=await this.submit({actor:id,key,kind:'pvp_attack',payload:{...(joined?{castleActorsR59:actors.map(t=>({actor:t.id,epoch:t.entry.epoch,payload:t.payload}))}:{}),nowMs:now,receivedAtMs:context.requestReceivedAtMs,input,seed,expected:fresh.actionSnapshot,originalSnapshot:context.originalSnapshot??context.actionSnapshot,resources:lease.keys}});
    stageEndR51('castle.pvp.writer',stage);stage=stageStartR51();
    demand(ack.key===key&&ack.result,'pvp_ack_mismatch');this.lanes.assert(lease);accepted=true;
    if(ack.result.castleRejectedR59){demand(joined&&ids.includes(ack.result.castleRejectedR59)&&ack.result.result?.status===409&&ack.result.result.body?.not_executed===true,'castle_join_rejection');cancel();}
    else if(joined){demand(ack.result.castleActorsR59?.length===actors.length,'castle_join_ack');for(const t of actors){const saved=ack.result.castleActorsR59.find(p=>p.id===t.id);demand(saved,'castle_join_actor_ack');this.checkpoints.finishR53(t,saved);}}
    await this.committed(ack.result);stageEndR51('castle.pvp.refresh',stage);
    for(const p of ack.result.players)if(kernel.players.has(p.id)){demand(ids.includes(p.id),'pvp_unlocked_recipient');this.checkpoints.hydrateCommitted(p);}
    if(ack.result.monsters?.length){this.memory.mixedApplied?.(ack.result);this.combatCheckpoints.committed(ack.result);}
    for(const [pid,row]of ack.result.encounters)this.checkpoints.encounters?.hydrateCommitted(pid,row);
    for(const event of ack.result.events)this.publish(...event);this.lanes.release(lease);return ack;
   }catch(error){if(!accepted&&actorRejection(error))cancel();if(lease.state==='held')this.lanes.reject(lease,error);throw error;}
  },{replyTo:id,emitReceipt:false,ackResult:ack=>({type:'action',...ack.result.result})});}catch(error){if(lease.state==='held')this.lanes.reject(lease,error);throw error;}
  return {type:'action'};
 }
}
