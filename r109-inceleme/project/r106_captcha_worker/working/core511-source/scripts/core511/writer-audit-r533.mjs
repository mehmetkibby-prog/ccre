import {writerAuditR533} from './r533-options.mjs';
import {rewardIdleCostR54} from './r54-options.mjs';
import {auditGateR56} from './r56-options.mjs';
import {gameplayR60} from './r60-options.mjs';
import {MOUNT_PRIVATE_TABLES_R60} from './reward-sections-r60.mjs';
const quote=s=>'"'+s.replaceAll('"','""')+'"';
const privateColumns=new Map(['player_items','player_storage_items','player_pets','player_stones','afk_hunt_state','fishing_sessions','pve_engagements','dungeon_materials','dungeon_wings','arena_reward_claims','boss_reward_claims','monster_reward_claims','monster_xp_claims','sinsi_reward_claims','pvp_reward_cooldowns','direct_message_dismissals','normal_reward_claims'].map(t=>[t,'player_id']));privateColumns.set('world_drops','owner_id');privateColumns.set('players','id');
for(const table of ['content_champion_rewards_r102','content_forge_r102','content_battlefield_r102','content_receipts_r102','content_battlefield_claims_r102'])privateColumns.set(table,'player_id');
if(gameplayR60.rewardSections)for(const table of MOUNT_PRIVATE_TABLES_R60)privateColumns.set(table,'player_id');
// Split table invalidation and actor invalidation. Each insert executes only
// for the first affected key in this scope, rather than on every loot row.
// This remains SQLite TEMP state: inner savepoint rollback restores the set.
export function refreshTriggersR533(sql,{name,event,refs,enabled,broad,columns,global=false}){
 if(!writerAuditR533)return false;
 const column=privateColumns.get(name),simple=column&&(name==='players'||columns?.has(column));
 if(!global&&!simple&&!broad)return false;
 const when=event==='DELETE'?'BEFORE':'AFTER',literal="'"+name.replaceAll("'","''")+"'",prefix='kernel511_refresh_r533_'+name+'_'+event;
 if(rewardIdleCostR54){
  // Ordinary checkpoints have refresh auditing disabled. Evaluate that gate
  // once per changed row, rather than enter up to three trigger programs.
  // The inner SELECT guards retain UPSERT-safe deduplication and rollback.
  let body=`INSERT INTO kernel511_refresh_tables SELECT ${literal},${broad} WHERE NOT EXISTS(SELECT 1 FROM kernel511_refresh_tables WHERE name=${literal});`;
  if(simple)for(const ref of refs){const value=ref+'.'+quote(column);body+=`INSERT INTO kernel511_refresh_actors SELECT ${value} WHERE ${value} IS NOT NULL AND NOT EXISTS(SELECT 1 FROM kernel511_refresh_actors WHERE id=${value}) AND EXISTS(SELECT 1 FROM players WHERE id=${value});`;}
  // The TEMP sets are transaction/savepoint state. Once all keys are already
  // present, entering the trigger body cannot add information. Keep the same
  // body and enabled/identity predicates, but bypass repeated empty INSERT
  // programs. This is not a persistent JS cache or a gameplay trigger change.
  let gate=`(${enabled})`;
  if(auditGateR56&&simple){
   const missing=[`NOT EXISTS(SELECT 1 FROM kernel511_refresh_tables WHERE name=${literal})`];
   for(const ref of refs){const value=ref+'.'+quote(column);missing.push(`(${value} IS NOT NULL AND NOT EXISTS(SELECT 1 FROM kernel511_refresh_actors WHERE id=${value}) AND EXISTS(SELECT 1 FROM players WHERE id=${value}))`);}
   gate+=' AND ('+missing.join(' OR ')+')';
  }
  sql.exec(`CREATE TEMP TRIGGER ${quote(prefix+'_scope')} ${when} ${event} ON main.${quote(name)} WHEN ${gate} BEGIN ${body} END;`);return true;
 }
 sql.exec(`CREATE TEMP TRIGGER ${quote(prefix+'_table')} ${when} ${event} ON main.${quote(name)} WHEN (${enabled}) AND NOT EXISTS(SELECT 1 FROM kernel511_refresh_tables WHERE name=${literal}) BEGIN INSERT INTO kernel511_refresh_tables VALUES(${literal},${broad}); END;`);
 if(simple)for(const ref of refs){const value=ref+'.'+quote(column);sql.exec(`CREATE TEMP TRIGGER ${quote(prefix+'_'+ref)} ${when} ${event} ON main.${quote(name)} WHEN (${enabled}) AND ${value} IS NOT NULL AND NOT EXISTS(SELECT 1 FROM kernel511_refresh_actors WHERE id=${value}) AND EXISTS(SELECT 1 FROM players WHERE id=${value}) BEGIN INSERT INTO kernel511_refresh_actors VALUES(${value}); END;`);}
 return true;
}
