import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {createNativeContentRules,seedNativeAdditionalContent} from './generated/channel-content-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {demand} from './contract.mjs';

const marker='native510-fourth-channel-v1',baseline='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b';
const quote=s=>'"'+s.replaceAll('"','""')+'"',hash=s=>createHash('sha256').update(s).digest('hex');
const tables=['monsters','world_state','players','boss_participants','monster_participants','normal_defeats','normal_reward_claims','stone_boss_quarantine476','game_settings','combat_settings','monster_combat_profiles','rune_settings','rune_v2_settings'];
const configurations=new Map([['game_settings','id'],['combat_settings','id'],['monster_combat_profiles','profile_key'],['rune_settings','id'],['rune_v2_settings','id']]);
function configuration(sql){return tables.map(name=>{const schema=sql.prepare("SELECT sql FROM sqlite_schema WHERE type='table' AND name=?").get(name)?.sql;demand(schema,'channel_content_schema_'+name);return {name,schema,rows:configurations.has(name)?sql.prepare('SELECT * FROM '+quote(name)+' ORDER BY '+quote(configurations.get(name))).all():[]};});}
function insert(sql,table,row){const names=Object.keys(row);return sql.prepare('INSERT INTO '+quote(table)+'('+names.map(quote).join(',')+') VALUES('+names.map(()=>'?').join(',')+')').run(...names.map(n=>row[n]));}
const applied=sql=>sql.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='kernel511_content_bootstrap'").get()?sql.prepare('SELECT * FROM kernel511_content_bootstrap WHERE id=?').get(marker):null;

// Current configuration is the only live data copied into the private database.
// No live monster, player, contribution or receipt is used as a spawn template.
// Legacy layout mutations run exclusively on empty in-memory tables.
export async function buildFourthChannelPlan(sql,{nowMs=Date.now()}={}){
 const config=configuration(sql),privateDb=new DatabaseSync(':memory:');
 try{
  privateDb.exec('PRAGMA foreign_keys=OFF');
  for(const item of config){privateDb.exec(item.schema);for(const row of item.rows)insert(privateDb,item.name,row);}
  await createNativeContentRules(nativeAtomicStatements(privateDb),Math.floor(nowMs/1000)).seedWorld();
  privateDb.exec('BEGIN IMMEDIATE');try{seedNativeAdditionalContent(privateDb);privateDb.exec('COMMIT');}catch(error){privateDb.exec('ROLLBACK');throw error;}
  const nativeRows=privateDb.prepare('SELECT * FROM monsters WHERE channel=3 ORDER BY id').all();demand(nativeRows.length>0,'channel_content_empty');
  const rows=nativeRows.map(row=>{demand(row.loadlab_run_id===''&&row.summoned===0&&row.is_boss===0&&/-c3(?:-|$)/.test(row.id),'channel_content_native_identity');return {...row,id:row.id.replace(/-c3(?=-|$)/,'-c4'),channel:4};});
  demand(new Set(rows.map(r=>r.id)).size===rows.length,'channel_content_duplicate');
  return {baseline,configHash:hash(JSON.stringify(config)),rows,rowsHash:hash(JSON.stringify(rows))};
 }finally{privateDb.close();}
}

// Called by the sole writer BEFORE any simulation/HTTP admission starts. The
// host must prove its exclusive stopped state; this function starts no service.
// A completed marker never recreates a subsequently missing NPC or resets HP.
export async function bootstrapFourthChannel(database,{assertStopped,nowMs=Date.now()}={}){
 demand(typeof assertStopped==='function'&&assertStopped()===true,'channel_content_requires_stopped_host');
 const previous=applied(database.sqlite);if(previous){demand(previous.baseline===baseline,'channel_content_baseline');return {applied:false,inserted:0,marker:previous};}
 const plan=await buildFourthChannelPlan(database.sqlite,{nowMs});
 return database.atomic(sql=>{
  demand(assertStopped()===true,'channel_content_requires_stopped_host');
  const previous=applied(sql);if(previous){demand(previous.baseline===baseline,'channel_content_baseline');return {applied:false,inserted:0,marker:previous};}
  demand(hash(JSON.stringify(configuration(sql)))===plan.configHash,'channel_content_configuration_changed');
  const world=sql.prepare('SELECT layout_version FROM world_state WHERE id=1').get();demand(world&&world.layout_version>=24,'channel_content_requires_current_layout');
  sql.exec('CREATE TABLE IF NOT EXISTS kernel511_content_bootstrap(id TEXT PRIMARY KEY,baseline TEXT NOT NULL,config_hash TEXT NOT NULL,rows_hash TEXT NOT NULL,inserted INTEGER NOT NULL,created_at_ms INTEGER NOT NULL)');
  let inserted=0;
  for(const row of plan.rows){
   const current=sql.prepare('SELECT * FROM monsters WHERE id=?').get(row.id);
   if(current){for(const key of ['channel','area','is_boss','is_stone','summoned','loadlab_run_id'])demand(current[key]===row[key],'channel_content_identity_conflict');continue;}
   // An absent NPC with historical ledger/archive state is not a new spawn.
   // Refuse instead of guessing its lost life or reusing a reward identity.
   for(const table of ['normal_defeats','normal_reward_claims','monster_participants'])demand(!sql.prepare('SELECT 1 FROM '+table+' WHERE monster_id=? LIMIT 1').get(row.id),'channel_content_orphaned_ledger');
   demand(!sql.prepare('SELECT 1 FROM stone_boss_quarantine476 WHERE id=?').get(row.id),'channel_content_quarantined');
   if(sql.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='rune_v2_rollback_monsters483'").get())demand(!sql.prepare('SELECT 1 FROM rune_v2_rollback_monsters483 WHERE id=?').get(row.id),'channel_content_quarantined');
   insert(sql,'monsters',row);inserted++;
  }
  sql.prepare('INSERT INTO kernel511_content_bootstrap(id,baseline,config_hash,rows_hash,inserted,created_at_ms) VALUES(?,?,?,?,?,?)').run(marker,baseline,plan.configHash,plan.rowsHash,inserted,nowMs);
  return {applied:true,inserted,marker:applied(sql)};
 });
}
