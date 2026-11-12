import {createAttackRules} from './generated/attack-rules.mjs';
import {CombatControls} from './combat-controls.mjs';
import {SupportMemory} from './support-memory.mjs';
import {demand,kernelError} from './contract.mjs';

export class SkillMemory{
 constructor({view,globals,party,arena,team,blocked,changed=()=>{}}){
  for(const fn of [party,arena,team,blocked])demand(typeof fn==='function','skill_dependencies');Object.assign(this,{view,globals,party,arena,team,blocked,changed});
  const storage={player:id=>this.player(id),players:()=>[...view.players.keys()].map(id=>this.player(id)),setPlayer:p=>this.setPlayer(p),party,arena,team,guild:id=>globals.__colCastle?.guild(id),blocked:id=>this.blocked(id)};
  this.support=new SupportMemory(storage);this.controls=new CombatControls(storage);this.rules=createAttackRules({globals,now:()=>this.tx.nowMs,uuid:()=>this.tx.uuid(),response:{json:(body,{status=200}={})=>({body,status})},ports:{publishRealtimeRoomEvent:(...args)=>{this.tx.events.push(args);},deliverRealtime:value=>value}});
 }
 player(id){return this.tx.players.get(id)??this.view.player(id);}
 setPlayer(p){if(this.blocked(p.id))throw kernelError('combat_resource_pending');this.tx.players.set(p.id,Object.freeze({...p}));}
 dash(...args){return this.rules.dashMemory(this.controls,...args);}
 step(context,{nowMs=Date.now(),uuid=()=>crypto.randomUUID()}={}){
  demand(!this.tx,'skill_overlap');this.tx={nowMs,uuid,players:new Map(),events:[]};
  try{
   if(this.blocked(context.playerId))return {deferred:true};
   let result;
   if(context.payload.action==='guardian_dash')result=this.rules.dashActionMemory(this,context);
   else{demand(context.payload.action==='cast_support456','skill_action');result=this.rules.supportMemory(this.support,context.player,context.settings,context.payload,context.requestReceivedAtMs);}
   demand(!result?.then,'async_skill');const changes={players:[...this.tx.players.values()]};for(const p of changes.players)this.view.setPlayer(p);this.changed(changes);return {result,events:this.tx.events,changes};
  }catch(error){if(error?.code==='combat_resource_pending')return {deferred:true};throw error;}
  finally{this.tx=null;}
 }
}
