import {immutableRow} from './immutable-row.mjs';
import {mountMovementRules} from './mount-runtime.mjs';
import {actorFrameConflict} from './actor-frame-rejection.mjs';
import {EncounterChanges} from './encounter-checkpoint.mjs';
import {MovementMemory} from './movement-memory.mjs';
import {createRules} from './generated/rules.mjs';
import {createMovementActionMemory,createMovementActionWriter} from './generated/movement-action.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {canonicalAttack} from './attack-writer.mjs';
import {OperationRandom} from './operation-random.mjs';
import {demand} from './contract.mjs';
const terminal=Symbol('movement-retaliation-death');

export class MovementActionMemory {
 constructor({state,view,world,fishing,epoch,settings,retaliate,changed,recordSecurityEvent,mountSpeed=null,wall=Date.now}){
  for(const fn of [epoch,settings,retaliate,changed,recordSecurityEvent])demand(typeof fn==='function','movement_action_dependencies');
  Object.assign(this,{state,view,world,fishing,epoch,settings,retaliate,changed,recordSecurityEvent});this.running=false;
  const tx=this;
  this.overlay={player:id=>tx.t.players.get(id)??view.player(id),monster:id=>view.monster(id),setPlayer:row=>tx.t.players.set(row.id,Object.freeze({...row})),setEngagement:(id,row)=>tx.t.engagements.set(id,immutableRow(row)),get engagements(){return {get:id=>tx.t.engagements.has(id)?tx.t.engagements.get(id):view.engagements.get(id)};}};
  const stateOverlay={read:(kind,id)=>{demand(kind==='players','movement_entity_kind');return this.overlay.player(id);},assertOwner:(...a)=>state.assertOwner(...a),patch:(kind,id,patch)=>{demand(kind==='players','movement_entity_kind');const row={...this.overlay.player(id),...patch};this.overlay.setPlayer(row);return row;}};
  this.storage=new MovementMemory({state:stateOverlay,world,fishing,epoch,wall,pveHitDue:(id,time)=>(this.overlay.engagements.get(id)?.next_hit_at_ms??Infinity)<=time});
  this.rules=createMovementActionMemory(mountSpeed?mountMovementRules(createRules(),now=>mountSpeed(this.t.actor,this.overlay.player(this.t.actor),now)):createRules(),{
   getGameSettings:()=>settings(this.t.actor),settlePveEngagement:(_,id,s,time)=>{const result=retaliate(id,s,time,this.overlay,{random:this.t.random,publish:(...a)=>this.t.events.push(a)});if(result?.durable){this.t.monsterId=result.monsterId;throw terminal;}return result;},
   publishRealtimeRoomEvent:(...a)=>{this.t.events.push(a);},deliverRealtime:v=>v,recordSecurityEvent:(...a)=>this.t.security.push(a)
  });
 }
 commit(proposal){for(const row of proposal.changes.players)this.view.setPlayer({...row,last_seen:Math.max(row.last_seen,this.view.player(row.id).last_seen)});for(const [id,row]of proposal.changes.engagements)this.view.setEngagement(id,row);this.changed(proposal.changes);for(const args of proposal.security)this.recordSecurityEvent(...args);return proposal;}
 step({auth,payload,nowMs,scope,random=Math.random,commit=true}){
  demand(!this.running,'movement_action_overlap');this.running=true;this.t={actor:auth.player.id,players:new Map(),engagements:new EncounterChanges(id=>this.view.engagements.get(id)),events:[],security:[],random,monsterId:null};
  try{
   const result=this.rules(null,auth,this.storage,payload,nowMs,scope);demand(!result?.then,'async_movement_result');
   const changes={players:[...this.t.players.values()],engagements:this.t.engagements.snapshot()},proposal={durable:false,result,events:this.t.events,changes,security:this.t.security};if(commit)this.commit(proposal);return proposal;
  }catch(error){if(error===terminal)return {durable:true,monsterId:this.t.monsterId};if(error?.code==='combat_resource_pending')return {deferred:true};throw error;}
  finally{this.t=null;this.running=false;}
 }
}

export function createMovementWriterHandler({settingsFor,globalsFor,settleRetaliation,assertOwnership,assertResources,recordSecurityEvent,randomFor=p=>new OperationRandom(p.seed),clock=Date.now}){
 for(const fn of [settingsFor,globalsFor,settleRetaliation,assertOwnership,assertResources,recordSecurityEvent])demand(typeof fn==='function','movement_writer_dependencies');
 return (sql,payload,context)=>{
  demand(sql.isTransaction&&assertOwnership(sql,context.peer,context.actor,context.epoch)===true,'movement_writer_owner');demand(assertResources(sql,payload,context)===true,'movement_writer_resources');
  const {nowMs,input,scope,seed,expected}=payload;demand(Number.isSafeInteger(nowMs)&&nowMs>=0&&nowMs<=clock()+5000&&input?.action==='move','movement_writer_time');
  const account=sql.prepare('SELECT account_id FROM players WHERE id=?').get(context.actor);demand(account,'movement_writer_actor');
  const auth={account:{id:account.account_id},player:{id:context.actor}},db=nativeAtomicStatements(sql),events=[],rng=randomFor(payload),settings=settingsFor(sql,context.actor),globals=globalsFor(sql,context.actor),record=(...a)=>{events.push(a);};
  const sync=value=>{demand(!value?.then,'async_movement_writer');return value;};
  const rules=createMovementActionWriter(createRules(),{getGameSettings:()=>settings,settlePveEngagement:(_,id,s,time)=>sync(settleRetaliation(sql,id,s,time,{...context,globals,random:()=>rng.roll(),publish:record})),publishRealtimeRoomEvent:record,deliverRealtime:sync,recordSecurityEvent:(...a)=>sync(recordSecurityEvent(sql,...a))});
  const frame=rules.readAuthoritativeMovement(db,context.actor,account.account_id,nowMs);if(!(canonicalAttack(frame)===canonicalAttack(expected?.movement)&&canonicalAttack(settings)===canonicalAttack(expected?.settings)))throw actorFrameConflict('movement_frame_conflict',context,sql);
  const result=rules.executeMovementAction(null,auth,db,input,nowMs,scope);return {result,events,player:sql.prepare('SELECT * FROM players WHERE id=?').get(context.actor),engagement:sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(context.actor)??null};
 };
}
