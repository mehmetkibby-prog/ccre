import {castleEnabled,CASTLE_AREA,CASTLE_CHANNEL} from './castle-model-r59.mjs';
import {createActorCheckpointHandler} from './actor-checkpoint.mjs';
import {checkpointConflictProof} from './checkpoint-rejection.mjs';
import {actorFrameConflictProof} from './actor-frame-rejection.mjs';
import {compactJoinedAckR57} from './joined-ack-r57.mjs';
import {demand} from './contract.mjs';
// Castle victim journals and the lethal hit share one existing receipt/fsync.
// Capture remains local to the exact <=30 server-selected fenced actors.
export function createCastleJoinedR59(authority){
 const checkpoint=createActorCheckpointHandler();
 return (sql,payload,context)=>{
  const actors=payload.castleActorsR59;if(!actors)return null;
  const held=new Set(payload.resources??[]);
  demand(castleEnabled()&&sql.isTransaction&&!payload.sharedLease&&context.peer.channel===CASTLE_CHANNEL&&payload.expected?.player?.area===CASTLE_AREA,'castle_join_scope');
  demand(Array.isArray(actors)&&actors.length>0&&actors.length<=30&&held.size<=30&&new Set(actors.map(a=>a.actor)).size===actors.length&&actors.some(a=>a.actor===context.actor)&&Buffer.byteLength(JSON.stringify(actors))<=224*1024,'castle_join_actors');
  const saved=[];sql.exec('SAVEPOINT castle_join_r59');
  try{for(const row of actors){
   demand(held.has('player:'+row.actor),'castle_join_unlocked');authority.assertAdmitted(sql,context.peer,row.actor,row.epoch);
   const p=sql.prepare('SELECT area,channel,arena_match_id FROM players WHERE id=?').get(row.actor);demand(p?.area===CASTLE_AREA&&p.channel===CASTLE_CHANNEL&&!p.arena_match_id,'castle_join_player');
   try{saved.push(compactJoinedAckR57(row.actor,row.payload,checkpoint(sql,row.payload,{...context,actor:row.actor,epoch:row.epoch})));}
   catch(error){const request={operation:'actor_checkpoint',playerId:row.actor,epoch:row.epoch,operationId:context.key,payload:row.payload};if(!checkpointConflictProof(error,context.peer,request)&&!actorFrameConflictProof(error,context.peer,request))throw error;
    sql.exec('ROLLBACK TO castle_join_r59; RELEASE castle_join_r59');return {rejected:{actor:row.actor,code:error.code,player:sql.prepare('SELECT * FROM players WHERE id=?').get(row.actor),engagement:sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(row.actor)??null}};
   }
  }sql.exec('RELEASE castle_join_r59');return {saved};}
  catch(error){if(sql.isTransaction)sql.exec('ROLLBACK TO castle_join_r59; RELEASE castle_join_r59');throw error;}
 };
}
