import {readCommitRevisionR113} from './commit-revision-r113.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {encodeCommittedActorR113} from './committed-codec-r113.mjs';
import {readDungeonSettingsPointR113} from './dungeon-settings-point-r113.mjs';
import {readActorBundle} from './read-worker.mjs';
import {createColdWorldRules} from './generated/cold-world-rules.mjs';
import {readZumrutToolR93} from './zumrut-tools-r93.mjs';
import {publicAdventure} from './adventure-service.mjs';
import {demand} from './contract.mjs';
import {committedResultsR113,COMMITTED_RESULT_VERSION_R113,committedResultMetricsR113} from './committed-protocol-r113.mjs';
import {initializeCommittedStoreR113,storeCommittedImagesR113} from './committed-store-r113.mjs';
export {committedResultsR113,COMMITTED_RESULT_VERSION_R113,committedResultMetricsR113} from './committed-protocol-r113.mjs';

const kinds=new Set(['attack','pvp_attack','monster_reward','retaliation_death','adventure_step','native_action','dungeon','dungeon_entry']);
// Changes outside actor-private state have their own world/market/guild feeds.
// A previously unknown write must recover through an authoritative snapshot;
// it may never silently certify an incomplete result.
const covered=new Set(['players','player_items','player_storage_items','player_pets','player_stones','afk_hunt_state','fishing_sessions','pve_engagements','dungeon_materials','dungeon_wings','world_drops','monster_xp_claims','normal_reward_claims','monster_reward_claims','boss_reward_claims','sinsi_reward_claims','arena_reward_claims','pvp_reward_cooldowns','auth_rate_limits','guilds','guild_members','guild_skills','guild_monster_claims','guild_essence_rewards','community_kills','adventure_runs','adventure_members','adventure_monsters','adventure_awards','adventure_chests','adventure_portals','adventure_entries','adventure_receipts','adventure_schedule','content_champion_rewards_r102','content_forge_r102','content_battlefield_r102','content_receipts_r102','content_battlefield_claims_r102']);
for(const table of ['monsters','monster_participants','boss_participants','combat_events','boss_defeats','monster_defeats','sinsi_defeats','normal_defeats','mount_inventory_r49','mount_reward_claims_r49'])covered.add(table);
for(const table of ['dungeon_runs','dungeon_members','dungeon_finalizations','solo_daily_entries','solo_entry_receipts','dungeon_receipts'])covered.add(table);

const initializedR113=new WeakSet();
export const committedSchemaReadyR113=sql=>committedResultsR113&&initializedR113.has(sql);
export function initializeCommittedResultsR113(sql){
 if(!committedResultsR113)return;
 sql.exec('CREATE TABLE IF NOT EXISTS kernel511_actor_revision_r113(actor TEXT PRIMARY KEY,revision INTEGER NOT NULL CHECK(revision>=0)) WITHOUT ROWID');
 initializeCommittedStoreR113(sql);
 initializedR113.add(sql);
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
   const bundle=readActorBundle(sql,[id,owner.channel,owner.incarnation,owner.epoch,0,this.now],{insideTransaction:true,includeCatalogs:false,includeDungeonSettings:false});
   const read=(query,params=[])=>prepareCached477(sql,query).all(...params);
   const sections=this.rules.readCommittedSectionsR113(read,bundle.player,this.now);
   const tool=sections.dungeonMaterials.some(m=>m.amount>0&&['zumrut_axe_r93','zumrut_pickaxe_r93'].includes(m.kind))?readZumrutToolR93(sql,id):'';
   sections.owner={...sections.owner,equippedToolR93:tool};
   sections.adventure511=structuredClone(publicAdventure(bundle.adventure));
   // These immutable catalogs/settings and shared world projections are already
   // installed independently. Never repeat them once per reward recipient.
   delete bundle.profiles;delete bundle.settings;
   actors.push(encodeCommittedActorR113({id,base,next,bundle,sections}));
  }
  let committedR113={version:COMMITTED_RESULT_VERSION_R113,operationId:context.key,cycle:prepareCached477(sql,'SELECT cycle FROM world_state WHERE id=1').get().cycle,at:this.now,actors};
  // The channel already owns a full configuration snapshot. Certify its exact
  // contents, not a mutable revision number. A missing/different reference must
  // recover through the existing current full snapshot before applying actors.
  if(actors.length)committedR113.dungeonSettingsRefR113=readDungeonSettingsPointR113(sql).ref;
  if(payload.sharedLease){
   const world={system:prepareCached477(sql,"SELECT * FROM kernel511_system_owners WHERE service='world'").get(),world:prepareCached477(sql,'SELECT * FROM world_state WHERE id=1').get(),monsters:prepareCached477(sql,'SELECT * FROM monsters WHERE channel=0').all(),participants:prepareCached477(sql,'SELECT p.* FROM monster_participants p JOIN monsters m ON m.id=p.monster_id WHERE m.channel=0 AND m.spawn_round=p.spawn_round').all(),bossParticipants:prepareCached477(sql,'SELECT p.* FROM boss_participants p WHERE EXISTS(SELECT 1 FROM monsters m WHERE m.channel=0 AND m.is_boss=1 AND m.spawn_round=p.boss_round)').all()};
   // World-ending/global jobs retain the full native refresh protocol. This
   // committed image certifies the same HP/contribution inputs as world boot.
   if(world.system&&Buffer.byteLength(JSON.stringify(world))<=64*1024)committedR113.sharedWorld=world;
  }
  if(actors.some(part=>Buffer.byteLength(part.image)>1024*1024)){committedResultMetricsR113.bounds++;return result;}
  let receiptBytes=Buffer.byteLength(JSON.stringify({...result,committedR113}));
  if(receiptBytes>192*1024){committedR113=storeCommittedImagesR113(sql,committedR113);committedResultMetricsR113.indirect++;receiptBytes=Buffer.byteLength(JSON.stringify({...result,committedR113}));}
  if(receiptBytes>224*1024){committedResultMetricsR113.bounds++;return result;}
  for(const {id,next}of actors)prepareCached477(sql,'INSERT INTO kernel511_actor_revision_r113 VALUES(?,?) ON CONFLICT(actor) DO UPDATE SET revision=excluded.revision').run(id,next);
  committedResultMetricsR113.captured++;committedResultMetricsR113.actors+=actors.length;
  return {...result,committedR113};
 }
}
