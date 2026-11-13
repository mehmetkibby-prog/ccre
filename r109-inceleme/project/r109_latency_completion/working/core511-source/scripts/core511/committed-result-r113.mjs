import {readCommitRevisionR113} from './commit-revision-r113.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {readActorBundle} from './read-worker.mjs';
import {createColdWorldRules} from './generated/cold-world-rules.mjs';
import {readZumrutToolR93} from './zumrut-tools-r93.mjs';
import {publicAdventure} from './adventure-service.mjs';
import {demand} from './contract.mjs';

export const committedResultsR113=process.env.CORE511_COMMITTED_R113!=='0';
export const COMMITTED_RESULT_VERSION_R113=1;
export const committedResultMetricsR113={captured:0,actors:0,applied:0,recovered:0,bounds:0,unsupported:{}};
const kinds=new Set(['attack','pvp_attack','monster_reward','retaliation_death']);
// Changes outside actor-private state have their own world/market/guild feeds.
// A previously unknown write must recover through an authoritative snapshot;
// it may never silently certify an incomplete result.
const covered=new Set(['players','player_items','player_storage_items','player_pets','player_stones','afk_hunt_state','fishing_sessions','pve_engagements','dungeon_materials','dungeon_wings','world_drops','monster_xp_claims','normal_reward_claims','monster_reward_claims','boss_reward_claims','sinsi_reward_claims','arena_reward_claims','pvp_reward_cooldowns','auth_rate_limits','guilds','guild_members','guild_skills','guild_monster_claims','guild_essence_rewards','community_kills','adventure_runs','adventure_members','adventure_monsters','adventure_awards','adventure_chests','adventure_portals','adventure_entries','adventure_receipts','adventure_schedule','content_champion_rewards_r102','content_forge_r102','content_battlefield_r102','content_receipts_r102','content_battlefield_claims_r102']);

export function initializeCommittedResultsR113(sql){
 if(!committedResultsR113)return;
 sql.exec('CREATE TABLE IF NOT EXISTS kernel511_actor_revision_r113(actor TEXT PRIMARY KEY,revision INTEGER NOT NULL CHECK(revision>=0)) WITHOUT ROWID');
}


export class CommittedResultProducerR113{
 constructor(services){this.services=services;this.rules=createColdWorldRules({globals:services.globals,now:()=>this.now});}
 candidate(kind){return committedResultsR113&&kinds.has(kind);}
 capture(sql,kind,payload,context,result){
  if(!this.candidate(kind)||!Array.isArray(result.players)||result.result?.status>=400)return result;
  demand(sql.isTransaction,'committed_result_transaction');
  const tables=result.sharedRefresh?.tables;
  if(!Array.isArray(tables))return result;
  const unknown=tables.filter(table=>!covered.has(table));
  if(unknown.length){for(const table of unknown)committedResultMetricsR113.unsupported[table]=(committedResultMetricsR113.unsupported[table]??0)+1;return result;}
  const actors=[];this.now=Date.now();
  for(const player of result.players){
   const id=player.id,owner=prepareCached477(sql,"SELECT o.* FROM kernel511_channel_owners o WHERE player_id=? AND state='active' AND (EXISTS(SELECT 1 FROM kernel511_admissions a WHERE a.player_id=o.player_id AND a.epoch=o.epoch) OR EXISTS(SELECT 1 FROM kernel511_simulations s WHERE s.player_id=o.player_id AND s.epoch=o.epoch))").get(id);
   if(!owner)continue; // Offline recipients retain their already-committed reward.
   const base=readCommitRevisionR113(sql,id);demand(Number.isSafeInteger(base),'committed_revision_schema_missing');
   const next=base+1;demand(Number.isSafeInteger(next),'committed_revision_overflow');
   const bundle=readActorBundle(sql,[id,owner.channel,owner.incarnation,owner.epoch,0,this.now],{insideTransaction:true});
   const read=(query,params=[])=>prepareCached477(sql,query).all(...params);
   const sections=this.rules.readCommittedSectionsR113(read,bundle.player,this.now);
   const tool=sections.dungeonMaterials.some(m=>m.amount>0&&['zumrut_axe_r93','zumrut_pickaxe_r93'].includes(m.kind))?readZumrutToolR93(sql,id):'';
   sections.owner={...sections.owner,equippedToolR93:tool};
   sections.adventure511=structuredClone(publicAdventure(bundle.adventure));
   // These immutable catalogs/settings and shared world projections are already
   // installed independently. Never repeat them once per reward recipient.
   delete bundle.profiles;delete bundle.settings;
   actors.push({id,base,next,bundle,sections});
  }
  const committedR113={version:COMMITTED_RESULT_VERSION_R113,operationId:context.key,cycle:prepareCached477(sql,'SELECT cycle FROM world_state WHERE id=1').get().cycle,at:this.now,actors};
  if(Buffer.byteLength(JSON.stringify(committedR113))>2*1024*1024){committedResultMetricsR113.bounds++;return result;}
  for(const {id,next}of actors)prepareCached477(sql,'INSERT INTO kernel511_actor_revision_r113 VALUES(?,?) ON CONFLICT(actor) DO UPDATE SET revision=excluded.revision').run(id,next);
  committedResultMetricsR113.captured++;committedResultMetricsR113.actors+=actors.length;
  return {...result,committedR113};
 }
}
