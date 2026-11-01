import {immutableRow} from './immutable-row.mjs';
import {EncounterChanges} from './encounter-checkpoint.mjs';
import {restRegeneration,REST_INPUT_FIELDS} from './generated/rest-regeneration-rules.mjs';
import {nativeHeartbeatResponse,nativeHeartbeatPublication} from './generated/heartbeat-rules.mjs';
import {RetaliationMemory} from './retaliation-memory.mjs';
import {demand} from './contract.mjs';

// Native heartbeat combat/rest phase. Nearby acquisition precedes settlement,
// as in V510. The caller arms/checkpoints those nonterminal entries separately.
// This overlay cannot expose healing before a lethal incoming hit or silently
// skip native equipment/queue work; those cases use the durable writer lane.
export class HeartbeatMemory {
 constructor({view,globals,frameFor,settings,gearDue,queue,blocked,cycle}){
  for(const fn of [frameFor,settings,gearDue,queue,blocked,cycle])demand(typeof fn==='function','heartbeat_memory_dependencies');Object.assign(this,{view,frameFor,settings,gearDue,queue,blocked,cycle});this.tx=null;
  this.overlay={player:id=>this.tx.players.get(id)??view.player(id),monster:id=>view.monster(id),setPlayer:p=>this.tx.players.set(p.id,Object.freeze({...p})),setEngagement:(id,e)=>this.tx.engagements.set(id,immutableRow(e)),engagements:{get:id=>this.tx.engagements.has(id)?this.tx.engagements.get(id):view.engagements.get(id)}};
  this.retaliation=new RetaliationMemory({view:this.overlay,globals,publish:(...args)=>this.tx.events.push(args)});
 }
 plan(id,nowMs,{random=Math.random}={}){
  demand(!this.tx&&Number.isSafeInteger(nowMs)&&nowMs>=0,'heartbeat_memory_scope');this.tx={players:new Map(),engagements:new EncounterChanges(id=>this.view.engagements.get(id)),events:[]};
  try{
   const due=this.retaliation.due(id,nowMs);if(this.blocked('player:'+id)||due.some(e=>this.blocked('monster:'+e.monster_id)))return {deferred:true};
   const settings=this.settings(id),settled=this.retaliation.settle({playerId:id,settings,nowMs,frameFor:(actor,entries,view)=>this.frameFor(actor,entries,view),random});
   if(settled.durable)return {durable:true,reason:'death',monsterId:settled.monsterId};
   if(this.gearDue(id))return {durable:true,reason:'gear'};if(this.queue(id))return {durable:true,reason:'arena_queue'};
   const player=this.overlay.player(id);demand(player&&REST_INPUT_FIELDS.every(field=>Number.isFinite(player[field])),'heartbeat_player_frame');
   const next=restRegeneration(player,[nowMs,id,settings.rest_regen_percent,settings.rest_regen_combat_delay_seconds,settings.rest_regen_still_seconds]);this.overlay.setPlayer(next);
   nativeHeartbeatPublication(next,{cycle:this.cycle()},id,nowMs,{publishRealtimeRoomEvent:(...args)=>this.tx.events.push(args),deliverRealtime:value=>value});
   return {durable:false,result:{body:nativeHeartbeatResponse(next,settled.result),status:200},changes:{players:[...this.tx.players.values()],engagements:this.tx.engagements.snapshot()},events:this.tx.events};
  }finally{this.tx=null;}
 }
 commit(plan){demand(!plan.durable&&!plan.deferred,'heartbeat_plan_not_memory');for(const player of plan.changes.players)this.view.setPlayer({...player,last_seen:Math.max(player.last_seen,this.view.player(player.id).last_seen)});for(const [id,entry]of plan.changes.engagements)this.view.setEngagement(id,entry);}
}
