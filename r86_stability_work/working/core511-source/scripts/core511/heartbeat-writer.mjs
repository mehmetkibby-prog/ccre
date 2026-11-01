import {actorFrameConflict} from './actor-frame-rejection.mjs';
import {nativeHeartbeatBatch,nativeHeartbeatPublication,nativeHeartbeatResponse,HEARTBEAT_GEAR_DUE_SQL} from './generated/heartbeat-rules.mjs';
import {REST_INPUT_FIELDS} from './generated/rest-regeneration-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {readAttackFrame,canonicalAttack} from './attack-writer.mjs';
import {stablePresenceFrame} from './presence.mjs';
import {OperationRandom} from './operation-random.mjs';
import {demand} from './contract.mjs';

export const heartbeatRestFrame=player=>Object.fromEntries(REST_INPUT_FIELDS.filter(k=>k!=='last_seen').map(k=>[k,player[k]]));
export function readHeartbeatState(sql,id){return {gearDue:Boolean(sql.prepare(HEARTBEAT_GEAR_DUE_SQL).get(id)),queue:sql.prepare('SELECT * FROM arena_queue WHERE player_id=?').get(id)??null};}
export function createHeartbeatWriterHandler({settingsFor,globalsFor,assertOwnership,assertResources,settleRetaliation,clock=Date.now}){
 for(const fn of [settingsFor,globalsFor,assertOwnership,assertResources,settleRetaliation])demand(typeof fn==='function','heartbeat_writer_dependencies');
 return (sql,payload,context)=>{
  demand(sql.isTransaction&&assertOwnership(sql,context.peer,context.actor,context.epoch)===true,'heartbeat_owner_fenced');demand(assertResources(sql,payload,context)===true,'heartbeat_resources_fenced');
  const {nowMs,expected,seed}=payload;demand(Number.isSafeInteger(nowMs)&&nowMs>=0&&nowMs<=clock()+5000,'heartbeat_writer_time');
  const globals=globalsFor(sql,context.actor),settings=settingsFor(sql,context.actor),raw=sql.prepare('SELECT * FROM players WHERE id=?').get(context.actor),player=readAttackFrame(sql,context.actor,'',globals).player,state=readHeartbeatState(sql,context.actor);
  if(!(raw&&canonicalAttack(stablePresenceFrame(player))===canonicalAttack(stablePresenceFrame(expected?.player))&&canonicalAttack(heartbeatRestFrame(raw))===canonicalAttack(expected?.rest)&&canonicalAttack(settings)===canonicalAttack(expected?.settings)&&canonicalAttack(state)===canonicalAttack(expected?.state)))throw actorFrameConflict('heartbeat_frame_conflict',context,sql);
  const events=[],publishRealtimeRoomEvent=(...args)=>events.push(args),rng=new OperationRandom(seed),pendingRetaliation=settleRetaliation(sql,context.actor,settings,nowMs,{...context,globals,random:()=>rng.roll(),publish:publishRealtimeRoomEvent});demand(!pendingRetaliation?.then,'heartbeat_async_settlement');
  const heartbeat=nativeHeartbeatBatch(nativeAtomicStatements(sql),context.actor,settings,nowMs),cycle=sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle;
  nativeHeartbeatPublication(heartbeat,{cycle},context.actor,nowMs,{publishRealtimeRoomEvent,deliverRealtime:value=>value});
  return {result:{body:nativeHeartbeatResponse(heartbeat,pendingRetaliation),status:200},events,player:sql.prepare('SELECT * FROM players WHERE id=?').get(context.actor),engagement:sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(context.actor)??null,heartbeat,maintenance:{actor:context.actor,nowMs,cycle}};
 };
}
