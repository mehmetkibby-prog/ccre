import {refreshTriggersR533} from './writer-audit-r533.mjs';
import {demand} from './contract.mjs';
import {REFRESH_SCOPE_V2} from './performance-options.mjs';
import {gameplayR60} from './r60-options.mjs';
import {MOUNT_PRIVATE_TABLES_R60} from './reward-sections-r60.mjs';
import {initializeItemRefreshR57,clearItemRefreshR57,readItemRefreshR57} from './item-refresh-audit-r57.mjs';
const quote=s=>'"'+s.replaceAll('"','""')+'"';
// Conservative invalidation of cold resident images. TEMP triggers observe
// native statements AND trigger side effects in the same savepoint. Unknown
// tables invalidate everybody; this metadata never authorizes a write.
const privateTables=new Set(['player_items','player_storage_items','player_pets','player_stones','afk_hunt_state','fishing_sessions','pve_engagements','dungeon_materials','dungeon_wings','arena_reward_claims','boss_reward_claims','monster_reward_claims','monster_xp_claims','sinsi_reward_claims','pvp_reward_cooldowns','direct_message_dismissals']);
// These have separate live world, combat-event, or durable mailbox delivery;
// they are not private cold inventory/membership projections.
const liveTables=new Set(['monsters','monster_participants','boss_participants','combat_events','boss_defeats','monster_defeats','sinsi_defeats']);
for(const table of ['content_champion_rewards_r102','content_forge_r102','content_battlefield_r102','content_receipts_r102','content_battlefield_claims_r102'])privateTables.add(table);
for(const table of ['content_auto_r102','content_battlefield_victims_r102','content_admin_audit_r102'])liveTables.add(table);
if(gameplayR60.rewardSections)for(const table of MOUNT_PRIVATE_TABLES_R60)privateTables.add(table);
// See the R30 table audit. These journals are not resident bundle inputs.
// Native trigger effects on players/guilds/community state remain observed.
if(REFRESH_SCOPE_V2){
 privateTables.add('normal_reward_claims');
 for(const name of ['normal_defeats','auth_rate_limits','guild_monster_claims','guild_essence_rewards','community_kills'])liveTables.add(name);
}
export class SharedRefreshScope{
 constructor({affectedActors=null}={}){this.affectedActors=affectedActors;}
 initialize(sql){
  this.sql=sql;
  sql.exec('CREATE TEMP TABLE kernel511_refresh_enabled(v INTEGER NOT NULL);INSERT INTO kernel511_refresh_enabled VALUES(0);CREATE TEMP TABLE kernel511_refresh_actors(id TEXT PRIMARY KEY) WITHOUT ROWID;CREATE TEMP TABLE kernel511_refresh_tables(name TEXT PRIMARY KEY,all_actors INTEGER NOT NULL) WITHOUT ROWID;');
  // An outer native UPSERT/OR REPLACE can override OR IGNORE in its triggers.
  // Do not attempt a duplicate tracking insert: filter existing keys first and
  // deduplicate each SELECT source. The native statement's conflict policy and
  // changes() semantics remain untouched.
  const actors=select=>`INSERT INTO kernel511_refresh_actors SELECT DISTINCT candidate.id FROM (${select}) AS candidate WHERE candidate.id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM kernel511_refresh_actors AS tracked WHERE tracked.id=candidate.id);`;
  const add=expr=>actors(`SELECT id FROM players WHERE id=${expr}`);
  const group=(table,key,value)=>actors(`SELECT player_id AS id FROM ${table} WHERE ${key}=${value}`);
  for(const {name}of sql.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'kernel511_%'").all()){
   if(liveTables.has(name)||name==='players'&&this.affectedActors){
    // Global maintenance has no PlayerWriteScope. Its own trigger mode also
    // records contribution invalidation; normal shared casts keep R30 work.
    for(const [event,refs]of [['INSERT',['NEW']],['UPDATE',['OLD','NEW']],['DELETE',['OLD']]]){
     if(refreshTriggersR533(sql,{name,event,refs,enabled:'(SELECT v FROM kernel511_refresh_enabled)=2',broad:0,global:true}))continue;
     const literal="'"+name.replaceAll("'","''")+"'",body=name==='players'?refs.map(p=>add(p+'.id')).join(''):'';
     sql.exec(`CREATE TEMP TRIGGER ${quote('kernel511_global_refresh_'+name+'_'+event)} ${event==='DELETE'?'BEFORE':'AFTER'} ${event} ON main.${quote(name)} WHEN (SELECT v FROM kernel511_refresh_enabled)=2 BEGIN INSERT INTO kernel511_refresh_tables SELECT ${literal},0 WHERE NOT EXISTS(SELECT 1 FROM kernel511_refresh_tables WHERE name=${literal});${body} END;`);
    }
    continue;
   }
   const cols=new Set(sql.prepare('PRAGMA table_info('+quote(name)+')').all().map(r=>r.name));
   const body=p=>{
    if(name==='players')return add(p+'.id');
    if(name==='accounts')return actors(`SELECT id FROM players WHERE account_id=${p}.id`);
    if(privateTables.has(name)&&cols.has('player_id'))return add(p+'.player_id');
    if(name==='world_drops')return add(p+'.owner_id');
    if(name==='party_members')return add(p+'.player_id')+group('party_members','party_id',p+'.party_id');
    if(name==='parties')return group('party_members','party_id',p+'.id');
    if(name==='party_invites'&&cols.has('sender_id')&&cols.has('recipient_id'))return add(p+'.sender_id')+add(p+'.recipient_id');
    if(name==='guild_members')return add(p+'.player_id')+group('guild_members','guild_id',p+'.guild_id');
    if(name==='guilds')return group('guild_members','guild_id',p+'.id');
    if(name==='guild_skills'&&cols.has('guild_id'))return group('guild_members','guild_id',p+'.guild_id');
    if(name==='arena_match_players')return add(p+'.player_id')+group('arena_match_players','match_id',p+'.match_id');
    if(name==='arena_matches')return group('arena_match_players','match_id',p+'.id');
    if(name==='dungeon_members'&&cols.has('run_id'))return add(p+'.player_id')+group('dungeon_members','run_id',p+'.run_id');
    if(name==='dungeon_runs')return group('dungeon_members','run_id',p+'.id');
    if(liveTables.has(name))return '';
    return null;
   };
   const broad=body('NEW')===null?1:0;
   for(const [event,refs]of [['INSERT',['NEW']],['UPDATE',['OLD','NEW']],['DELETE',['OLD']]]){
    // BEFORE DELETE captures old membership; one AFTER INSERT/UPDATE captures both group identities.
    // Reuse the existing ownership write set for hot player rows; live world rows have their own delivery.
    for(const when of [event==='DELETE'?'BEFORE':'AFTER']){
     if(refreshTriggersR533(sql,{name,event,refs,enabled:'(SELECT v FROM kernel511_refresh_enabled)>0',broad,columns:cols}))continue;
     const statements=refs.map(p=>body(p)??'').join('');
     const literal="'"+name.replaceAll("'","''")+"'";
     sql.exec(`CREATE TEMP TRIGGER ${quote('kernel511_refresh_'+name+'_'+event+'_'+when)} ${when} ${event} ON main.${quote(name)} WHEN (SELECT v FROM kernel511_refresh_enabled)>0 BEGIN INSERT INTO kernel511_refresh_tables SELECT ${literal},${broad} WHERE NOT EXISTS(SELECT 1 FROM kernel511_refresh_tables WHERE name=${literal});${statements} END;`);
    }
   }
  }
  initializeItemRefreshR57(sql);
 }
 run(sql,payload,context,work,{global=false,local=false}={}){
  if(!payload.sharedLease&&!global&&!local)return work();
  demand(sql===this.sql&&sql.isTransaction&&!this.active,'shared_refresh_transaction');this.active=true;
  clearItemRefreshR57(sql);
  sql.exec('DELETE FROM temp.kernel511_refresh_actors;DELETE FROM temp.kernel511_refresh_tables;UPDATE temp.kernel511_refresh_enabled SET v='+(global?2:1));
  try{const result=work();demand(!result?.then,'shared_refresh_synchronous');
   const tables=sql.prepare('SELECT * FROM temp.kernel511_refresh_tables ORDER BY name').all(),actors=[...new Set([...sql.prepare('SELECT id FROM temp.kernel511_refresh_actors ORDER BY id').all().map(r=>r.id),...(global?[]:this.affectedActors?.()??[])])].sort();
   return {...result,sharedRefresh:{version:1,actors,all:tables.some(r=>r.all_actors===1),tables:tables.map(r=>r.name),...(tables.some(r=>r.name==='player_items')?readItemRefreshR57(sql):{})}};
  }finally{this.active=false;sql.exec('UPDATE temp.kernel511_refresh_enabled SET v=0;DELETE FROM temp.kernel511_refresh_actors;DELETE FROM temp.kernel511_refresh_tables');clearItemRefreshR57(sql);}
 }
}
