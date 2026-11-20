import {prepareCached477} from './writer-statements.mjs';
import {readCommitRevisionR113} from './commit-revision-r113.mjs';

const potionTables=new Set(['players','auth_rate_limits']);
const collectTables=new Set([...potionTables,'player_items','world_drops','guild_essence_rewards','dungeon_materials','pve_engagements']);
const collectAreas=new Set(['forest','frozen','ancient','sanctum','black']);
const potionAreas=new Set([...collectAreas,'rune_v2','champions']);

// Only a successful, audited, single-owner operation may use the established
// channel refresh. The durable revision advances inside the reward transaction.
export function captureLocalCommitR127(sql,kind,payload,context,result){
 if(kind!=='native_action'||payload.sharedLease||result.players?.length!==1||result.result?.status!==200||
    result.result.body?.ok!==true||result.monsters?.length||result.drop||result.mistLoot||result.fishing)return null;
 const action=payload.input?.action,actor=context.actor,row=result.players[0],audit=result.sharedRefresh;
 if(!actor||actor!==row.id||row.hp<=0||row.arena_match_id||!context.peer||row.channel!==context.peer.channel||
    audit?.version!==1||audit.all!==false||!Array.isArray(audit.tables)||!Array.isArray(audit.actors)||audit.actors.some(id=>id!==actor))return null;
 if(action==='collect'){
  if(!collectAreas.has(row.area)||payload.localScope?.kind!=='collect'||payload.localScope.owner!==actor||result.collectLight?.version!==1||
     result.collectLight.actor!==actor||typeof payload.input.targetId!=='string'||result.collectLight.target!==payload.input.targetId||
     audit.tables.some(table=>!collectTables.has(table)))return null;
 }else if(action==='use_potion'){
  if(!potionAreas.has(row.area)||payload.batchPotionsR61||result.batchPotionsR61||result.encounters?.length!==1||
     result.encounters[0]?.[0]!==actor||audit.tables.some(table=>!potionTables.has(table)))return null;
 }else return null;
 const owner=prepareCached477(sql,"SELECT o.channel,o.incarnation,o.epoch FROM kernel511_channel_owners o JOIN kernel511_admissions a ON a.player_id=o.player_id AND a.epoch=o.epoch AND a.channel=o.channel WHERE o.player_id=? AND o.state='active'").get(actor);
 if(!owner||owner.epoch!==context.epoch||owner.channel!==context.peer.channel||owner.incarnation!==context.peer.incarnation)return null;
 const base=readCommitRevisionR113(sql,actor);
 if(!Number.isSafeInteger(base)||!Number.isSafeInteger(base+1))return null;
 const cycle=prepareCached477(sql,'SELECT cycle FROM world_state WHERE id=1').get().cycle;
 const commit={version:3,kind:'local',action,operationId:context.key,cycle,id:actor,base,next:base+1,...owner};
 const value={...result,committedR113:commit};
 if(Buffer.byteLength(JSON.stringify(value))>224*1024)return null;
 prepareCached477(sql,'INSERT INTO kernel511_actor_revision_r113 VALUES(?,?) ON CONFLICT(actor) DO UPDATE SET revision=excluded.revision').run(actor,commit.next);
 return value;
}

// A stale ACK or a different incarnation goes straight to the existing
// authoritative reader. It must never replay an old pickup or potion.
export function matchesLocalCommitR127(channel,proof,result,context){
 const id=context?.id,owner=channel.owners.get(id),actor=channel.kernel.players.get(id);
 return proof.version===3&&proof.kind==='local'&&typeof proof.operationId==='string'&&proof.id===id&&
  proof.action===context?.input?.action&&['collect','use_potion'].includes(proof.action)&&
  proof.cycle===channel.world.cycle&&owner&&owner.epoch===proof.epoch&&owner.channel===proof.channel&&
  owner.incarnation===proof.incarnation&&actor?.barrier&&actor.epoch===owner.epoch&&channel.lanes.busy(['player:'+id])&&
  Number.isSafeInteger(proof.base)&&proof.next===proof.base+1&&channel.commitRevisionsR113.get(id)===proof.base&&
  result.players?.length===1&&result.players[0].id===id;
}
