import {readResourceMonstersR56} from './resource-reads-r56.mjs';
import {demand} from './contract.mjs';
import {createActorCheckpointHandler} from './actor-checkpoint.mjs';
import {createCombatCheckpointHandler} from './combat-checkpoint.mjs';
import {createCheckpointResourceGuard} from './checkpoint-resource-guard.mjs';
import {checkpointConflictProof} from './checkpoint-rejection.mjs';
import {actorFrameConflictProof} from './actor-frame-rejection.mjs';
import {memoryCombatR53} from './r53-options.mjs';
import {localMixedTargetLimitR51} from './r51-options.mjs';
import {unpackCheckpointR54} from './checkpoint-wire-r54.mjs';
import {compactJoinedAckR57} from './joined-ack-r57.mjs';
import {instanceRewardAreaR71} from './instance-reward-scope-r71.mjs';
import {ordinaryRuneRewardR87} from './rune-reward-scope-r87.mjs';

// Called inside the attack's existing owner/resource/write-audit transaction.
// Only a private, locally created checkpoint rejection may become not_executed.
// A timeout, foreign epoch, disk failure or unknown commit retains its old fence.
export function createJoinedCheckpointR53(authority){
 const actor=createActorCheckpointHandler(),combat=createCombatCheckpointHandler({assertResources:createCheckpointResourceGuard(authority)});
 return (sql,payload,context)=>{
  if(!payload.checkpointR53)return null;
  demand(memoryCombatR53&&!payload.sharedLease&&['kill','mixed'].includes(payload.localScope?.kind),'checkpoint_join_scope');
  const {actors,combat:journal}=unpackCheckpointR54(payload.checkpointR53),held=new Set(payload.resources),targets=new Set(payload.localScope.targets.map(t=>t.id));
  demand(Array.isArray(actors)&&actors.length>0&&actors.length<=25&&new Set(actors.map(a=>a.actor)).size===actors.length&&actors.some(a=>a.actor===context.actor),'checkpoint_join_actors');
  demand(targets.size>0&&targets.size<=(payload.localScope.kind==='mixed'?localMixedTargetLimitR51:10)&&journal&&journal.bossParticipants?.length===0&&journal.monsters.every(r=>targets.has(r.current.id)&&!r.current.is_boss&&!r.current.is_stone)&&journal.participants.every(r=>targets.has(r.current.monster_id)&&held.has('player:'+r.current.player_id))&&journal.combatEvents.every(r=>targets.has(r.target_id)&&held.has('player:'+r.player_id)),'checkpoint_join_journal');
  const monstersR56=readResourceMonstersR56(sql,payload.localScope.targets.map(t=>t.id),'scope');
  for(const t of payload.localScope.targets){const m=monstersR56?monstersR56.get(t.id):sql.prepare('SELECT id,area,channel,spawn_round,is_boss,is_stone,summoned FROM monsters WHERE id=?').get(t.id);demand(m&&m.channel===context.peer.channel&&m.spawn_round===t.spawnRound&&!m.is_boss&&!m.is_stone&&(['forest','frozen','black','ancient','sanctum'].includes(m.area)||payload.localScope.kind==='kill'&&(instanceRewardAreaR71(m.area)||ordinaryRuneRewardR87(m)))&&held.has('monster:'+t.id),'checkpoint_join_monster');}
  const saved=[];sql.exec('SAVEPOINT core511_join_r53');
  try{
   for(const row of actors){
    demand(held.has('player:'+row.actor),'checkpoint_join_unlocked');authority.assertAdmitted(sql,context.peer,row.actor,row.epoch);
    const sub={...context,actor:row.actor,epoch:row.epoch};
    try{saved.push(compactJoinedAckR57(row.actor,row.payload,actor(sql,row.payload,sub)));}
    catch(error){
     const request={operation:'actor_checkpoint',playerId:row.actor,epoch:row.epoch,operationId:context.key,payload:row.payload};
     if(!(checkpointConflictProof(error,context.peer,request)||actorFrameConflictProof(error,context.peer,request)))throw error;
     sql.exec('ROLLBACK TO core511_join_r53; RELEASE core511_join_r53');
     const player=sql.prepare('SELECT * FROM players WHERE id=?').get(row.actor),engagement=sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(row.actor)??null;
     return {rejected:{actor:row.actor,code:error.code,player,engagement}};
    }
   }
   combat(sql,journal,context);sql.exec('RELEASE core511_join_r53');return {saved};
  }catch(error){if(sql.isTransaction)sql.exec('ROLLBACK TO core511_join_r53; RELEASE core511_join_r53');throw error;}
 };
}
