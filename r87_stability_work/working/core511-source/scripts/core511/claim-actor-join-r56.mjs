import {claimActorJoinR56,potionActorJoinR56} from './r56-options.mjs';
import {soloCollectJoinR85,validCollectMaterialDropR85} from './collect-join-r85.mjs';
import {assertLocalCollectScope,LOCAL_COLLECT_REJECTED} from './local-collect-scope.mjs';
import {prepareCached477} from './writer-statements.mjs';
// Cache only the existing prepared-statement facade; every query still runs.
const potionStatementsR61=process.env.CORE511_R61_POTION_STATEMENTS==='1';
const preparePotionStatementR61=(sql,text)=>potionStatementsR61?prepareCached477(sql,text):sql.prepare(text);
import {assertSettlementResources} from './settlement-resources.mjs';
import {createActorCheckpointHandler} from './actor-checkpoint.mjs';
import {checkpointConflictProof} from './checkpoint-rejection.mjs';
import {actorFrameConflictProof} from './actor-frame-rejection.mjs';
import {normalPlayerR53,normalMonsterR53} from './r53-options.mjs';
import {potionPlayerR89,potionMonsterR89} from './potion-scope-r89.mjs';
import {demand} from './contract.mjs';
import {compactJoinedAckR57} from './joined-ack-r57.mjs';

// Native claims, ordinary potions or solo owned ground collects, journals and the receipt
// share the existing transaction/fsync. The established journal wire and ACK
// are reused; potion never moves to the separate reward worker.
export function createJoinedClaimActorsR56(authority){
 const checkpoint=createActorCheckpointHandler();
 return (sql,payload,context)=>{
  if(!payload.claimActorsR56)return null;
  const actors=payload.claimActorsR56,targets=payload.localScope?.targets,held=new Set(payload.resources);
  const potion=potionActorJoinR56&&payload.input?.action==='use_potion'&&!payload.localScope;
  const claim=claimActorJoinR56&&payload.input?.action==='claim_rewards'&&payload.localScope?.kind==='claim'&&Array.isArray(targets)&&targets.length>0&&targets.length<=10;
  const collect=payload.input?.action==='collect'&&soloCollectJoinR85({id:context.actor,input:payload.input,scope:payload.localScope,resources:payload.resources,sharedLease:payload.sharedLease,player:preparePotionStatementR61(sql,'SELECT * FROM players WHERE id=?').get(context.actor),channel:context.peer.channel});
  demand(sql.isTransaction&&!payload.sharedLease&&(potion||claim||collect),'claim_join_scope');
  demand(Array.isArray(actors)&&actors.length>0&&actors.length<=25&&new Set(actors.map(a=>a.actor)).size===actors.length&&actors.some(a=>a.actor===context.actor)&&Buffer.byteLength(JSON.stringify(actors))<=224*1024,'claim_join_actors');
  if(potion){
   demand(actors.length===1&&actors[0].actor===context.actor&&held.size<=1025,'potion_join_actor');
   const player=preparePotionStatementR61(sql,'SELECT * FROM players WHERE id=?').get(context.actor);
   demand(potionPlayerR89(player)&&player.channel===context.peer.channel,'potion_join_player');
   for(const key of held){
    if(key==='player:'+context.actor)continue;
    demand(key.startsWith('monster:'),'potion_join_resource');
    const m=preparePotionStatementR61(sql,'SELECT id,area,channel,is_boss,is_stone,summoned FROM monsters WHERE id=?').get(key.slice(8));
    demand(potionMonsterR89(m)&&m.channel===player.channel&&m.area===player.area,'potion_join_monster');
   }
  }else if(collect){
   demand(actors.length===1&&actors[0].actor===context.actor,'collect_join_actor');
  }else for(const t of targets){const m=preparePotionStatementR61(sql,'SELECT area,channel,is_boss,is_stone FROM monsters WHERE id=?').get(t.id);demand(normalMonsterR53(m)&&m.channel===context.peer.channel&&held.has('monster:'+t.id),'claim_join_monster');}
  const saved=[];sql.exec('SAVEPOINT core511_claim_join_r56');
  const collectDrop=()=>preparePotionStatementR61(sql,"SELECT d.owner_id,d.monster_id,d.kind,CAST(d.amount AS REAL) AS amount,typeof(d.amount) AS amount_type,d.enchantments,CAST(COALESCE(m.amount,0) AS REAL) AS stored_amount,typeof(COALESCE(m.amount,0)) AS stored_type FROM world_drops d LEFT JOIN dungeon_materials m ON m.player_id=d.owner_id AND m.kind=d.kind WHERE d.id=?").get(payload.localScope.target);
  const rejectCollect=()=>{
   sql.exec('ROLLBACK TO core511_claim_join_r56');
   const rejected={actor:context.actor,code:LOCAL_COLLECT_REJECTED,player:preparePotionStatementR61(sql,'SELECT * FROM players WHERE id=?').get(context.actor),engagement:preparePotionStatementR61(sql,'SELECT * FROM pve_engagements WHERE player_id=?').get(context.actor)??null};
   sql.exec('RELEASE core511_claim_join_r56');return {rejected};
  };
  try{
   if(collect&&!validCollectMaterialDropR85(collectDrop(),payload.localScope))return rejectCollect();
   for(const row of actors){
    demand(held.has('player:'+row.actor),'claim_join_unlocked');authority.assertAdmitted(sql,context.peer,row.actor,row.epoch);
    demand((potion?potionPlayerR89:normalPlayerR53)(preparePotionStatementR61(sql,'SELECT area,arena_match_id FROM players WHERE id=?').get(row.actor)),'claim_join_player');
    try{saved.push(compactJoinedAckR57(row.actor,row.payload,checkpoint(sql,row.payload,{...context,actor:row.actor,epoch:row.epoch})));}
    catch(error){
     const request={operation:'actor_checkpoint',playerId:row.actor,epoch:row.epoch,operationId:context.key,payload:row.payload};
     if(!(checkpointConflictProof(error,context.peer,request)||actorFrameConflictProof(error,context.peer,request)))throw error;
     sql.exec('ROLLBACK TO core511_claim_join_r56');
     const rejected={actor:row.actor,code:error.code,player:preparePotionStatementR61(sql,'SELECT * FROM players WHERE id=?').get(row.actor),engagement:preparePotionStatementR61(sql,'SELECT * FROM pve_engagements WHERE player_id=?').get(row.actor)??null};
     sql.exec('RELEASE core511_claim_join_r56');return {rejected};
    }
   }
   // The journal can introduce a new due attacker that was absent from SQL
   // during the first resource guard. Check the newly saved encounter before
   // native retaliation can read it. Failure rolls back the entire journal.
   if(potion)assertSettlementResources(sql,payload,context);
   if(collect){
    // The authority preflight still runs before any write. Check again here:
    // native checkpoint triggers may have changed the drop/party meanwhile.
    // Only this exact guard's rejection, after successful savepoint rollback,
    // becomes the existing negative joined receipt. Native loot has not run.
    try{demand(assertLocalCollectScope(sql,{local:payload.localScope,input:payload.input,resources:payload.resources,peer:context.peer,actor:context.actor,nowMs:payload.nowMs}).length===0,'collect_join_offline');}
    catch(error){
     if(error.code!==LOCAL_COLLECT_REJECTED)throw error;
     return rejectCollect();
    }
   }
   if(collect&&!validCollectMaterialDropR85(collectDrop(),payload.localScope))return rejectCollect();
   sql.exec('RELEASE core511_claim_join_r56');return {saved};
  }catch(error){if(sql.isTransaction)sql.exec('ROLLBACK TO core511_claim_join_r56;RELEASE core511_claim_join_r56');throw error;}
 };
}
