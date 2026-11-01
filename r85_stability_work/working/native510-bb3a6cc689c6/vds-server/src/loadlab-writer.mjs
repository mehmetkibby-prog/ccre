import {perfR13Features} from './perf-r13-features.mjs';
import {prepareCached477,preparedSchemaVersions477} from './prepared-statements477.mjs';
import {withWriterSqlPhase477,withWriterSqlCost477,recordWriterJobDetail477} from './writer-sql-timing477.mjs';
import {channelError} from './channel-protocol.mjs';
import {createHash} from 'node:crypto';

const q=s=>'"'+s.replaceAll('"','""')+'"';
export const LOADLAB_CONTEXT_SQL="CREATE TABLE IF NOT EXISTS loadlab_writer_context_v1(id INTEGER PRIMARY KEY CHECK(id=1),replay_active INTEGER NOT NULL DEFAULT 0 CHECK(replay_active IN(0,1))); INSERT OR IGNORE INTO loadlab_writer_context_v1 VALUES(1,0);";
const BOOK=new Set(['normal_defeats','boss_defeats','monster_xp_claims','normal_reward_claims','boss_reward_claims','monster_participants','boss_participants','war_kill_claims','pvp_reward_cooldowns','broken_core_state464']);
const BOOK_KEYS={normal_defeats:['monster_id','spawn_round'],boss_defeats:['boss_round'],monster_xp_claims:['monster_id','spawn_round','player_id'],normal_reward_claims:['monster_id','spawn_round','player_id'],boss_reward_claims:['boss_round','player_id'],monster_participants:['monster_id','spawn_round','player_id'],boss_participants:['boss_round','player_id'],war_kill_claims:['id'],pvp_reward_cooldowns:['player_id','reward_scope'],broken_core_state464:['player_id']};
const CALC=new Set([...BOOK,'players','player_items','world_drops','messages','community_kills','community_runs','community_contributions','community_progress','guild_monster_claims','guilds','guild_essence_rewards','world_state']);
const PLAYER_FIELDS=new Set('hp hp_revision attack_one_at attack_two_at attack_three_at attack_four_at special_guard_until_ms last_monster_hit_at last_regen_at last_movement_at_ms combat_lock_until_ms stun_until_ms root_until_ms respawn_at_ms x y movement_checked_at_ms movement_debt_ms position_revision motion_stream_id motion_sequence last_seen area realtime_scope_version'.split(' '));
const MONSTER_FIELDS=new Set('hp last_damaged_at_ms last_regen_at_ms respawn_at despawn_at spawn_round wave_stage stun_until_ms root_until_ms control_x control_y'.split(' '));
const SIM={players:PLAYER_FIELDS,monsters:MONSTER_FIELDS,auth_sessions:new Set(['last_seen_at']),auth_rate_limits:new Set(['attempts','window_started_at','blocked_until']),
 monster_participants:new Set('monster_id spawn_round player_id created_at stone_damage476 stone_first_hit_at_ms476'.split(' ')),
 boss_participants:new Set('boss_round player_id hit_count total_damage created_at'.split(' ')),
 pve_engagements:new Set('player_id monster_id spawn_round next_hit_at_ms expires_at_ms hit_sequence updated_at_ms last_skill_at_ms attackers489'.split(' ')),
 combat_events:new Set('id player_id target_id role ability created_at'.split(' '))};
const token=/'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[[^\]]*\]|--[^\n]*|\/\*[\s\S]*?\*\/|[A-Za-z_][A-Za-z_0-9]*/g;
function wrappedTrigger(sql){
 const words=[...sql.matchAll(token)].filter(x=>/^[A-Za-z_]/.test(x[0]));
 const begin=words.find(x=>x[0].toUpperCase()==='BEGIN');if(!begin)throw Error('loadlab_trigger_shape');
 const when=words.find(x=>x.index<begin.index&&x[0].toUpperCase()==='WHEN');
 const guard='COALESCE((SELECT replay_active FROM loadlab_writer_context_v1 WHERE id=1),1)=0';
 const header=when?sql.slice(0,when.index)+'WHEN ('+sql.slice(when.index+4,begin.index).trim()+') AND '+guard+' ':sql.slice(0,begin.index)+'WHEN '+guard+' ';
 return header+sql.slice(begin.index);
}
// Run once after ordinary schema helpers, before accepting requests. No DDL in
// a reward phase. The unchanged original SQL is retained for explicit uninstall.
export function ensureLoadLabWriterSchema(db){
 db.exec(LOADLAB_CONTEXT_SQL);
 if(prepareCached477(db,'SELECT replay_active FROM loadlab_writer_context_v1 WHERE id=1').get()?.replay_active!==0)throw Error('loadlab_replay_context_not_clear');
 db.exec('CREATE TABLE IF NOT EXISTS loadlab_writer_triggers_v1(name TEXT PRIMARY KEY,original_sql TEXT NOT NULL,wrapped_sql TEXT NOT NULL)');
 for(const t of prepareCached477(db,"SELECT name,tbl_name,sql FROM sqlite_schema WHERE type='trigger' AND sql IS NOT NULL").all())if(BOOK.has(t.tbl_name)){
  const old=prepareCached477(db,'SELECT * FROM loadlab_writer_triggers_v1 WHERE name=?').get(t.name);
  if(old?.wrapped_sql===t.sql)continue;
  if(t.sql.includes('loadlab_writer_context_v1'))throw Error('loadlab_unknown_trigger_guard');
  const next=wrappedTrigger(t.sql);
  db.exec('DROP TRIGGER '+q(t.name));db.exec(next);
  prepareCached477(db,'INSERT INTO loadlab_writer_triggers_v1 VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET original_sql=excluded.original_sql,wrapped_sql=excluded.wrapped_sql').run(t.name,t.sql,next);
 }
}
// V477 daily maintenance is realm-wide, not a bot reward result. Migrate the
// existing IF-NOT-EXISTS hooks before startup catch-up; leave normal owner lanes
// intact and journal their exact SQL for a stopped-service code rollback.
export function scopeLoadLabDailyRewardTriggers(db){
 db.exec('SAVEPOINT loadlab_daily_scope_v1');
 try{
 db.exec(LOADLAB_CONTEXT_SQL);
 if(prepareCached477(db,'SELECT replay_active FROM loadlab_writer_context_v1 WHERE id=1').get()?.replay_active!==0)throw Error('loadlab_replay_context_not_clear');
 db.exec('CREATE TABLE IF NOT EXISTS loadlab_writer_triggers_v1(name TEXT PRIMARY KEY,original_sql TEXT NOT NULL,wrapped_sql TEXT NOT NULL)');
 const names=['daily_monster_capture477','daily_monster_rollover477','daily_monster_delete477','daily_monster_ban477','daily_monster_account_delete477'];
 const replaceOne=(sql,from,to)=>{if(sql.split(from).length!==2)throw Error('loadlab_daily_trigger_shape');return sql.replace(from,to);};
 for(const name of names){
  const current=prepareCached477(db,"SELECT sql FROM sqlite_schema WHERE type='trigger' AND name=?").get(name);
  if(!current?.sql)throw Error('loadlab_daily_trigger_missing:'+name);
  const old=prepareCached477(db,'SELECT * FROM loadlab_writer_triggers_v1 WHERE name=?').get(name);
  const original=old?.original_sql??current.sql;
  let scoped;
  if(name==='daily_monster_capture477')scoped=replaceOne(original,'WHERE p.is_gm=0 AND p.daily_monster_kills>0',"WHERE p.loadlab_run_id='' AND p.is_gm=0 AND p.daily_monster_kills>0");
  else{
   const guard=name==='daily_monster_rollover477'||name==='daily_monster_delete477'?"OLD.loadlab_run_id=''":'NOT EXISTS(SELECT 1 FROM loadlab_admissions_v1 WHERE account_id=OLD.id)';
   scoped=replaceOne(replaceOne(original,'WHEN ','WHEN '+guard+' AND ('),' BEGIN ',') BEGIN ');
  }
  if(old&&(old.wrapped_sql!==scoped||![original,scoped].includes(current.sql)))throw Error('loadlab_daily_trigger_changed:'+name);
  if(current.sql===scoped)continue;
  if(current.sql.includes('loadlab_'))throw Error('loadlab_daily_trigger_unknown:'+name);
  db.exec('DROP TRIGGER '+q(name));db.exec(scoped);
  prepareCached477(db,'INSERT INTO loadlab_writer_triggers_v1 VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET original_sql=excluded.original_sql,wrapped_sql=excluded.wrapped_sql').run(name,original,scoped);
 }
 db.exec('RELEASE loadlab_daily_scope_v1');
 }catch(error){db.exec('ROLLBACK TO loadlab_daily_scope_v1; RELEASE loadlab_daily_scope_v1');throw error;}
}
export function restoreLoadLabWriterTriggers(db){
 if(prepareCached477(db,'SELECT replay_active FROM loadlab_writer_context_v1 WHERE id=1').get()?.replay_active!==0)throw Error('loadlab_replay_context_not_clear');
 for(const t of prepareCached477(db,'SELECT * FROM loadlab_writer_triggers_v1').all()){
  const current=prepareCached477(db,"SELECT sql FROM sqlite_schema WHERE type='trigger' AND name=?").get(t.name);
  if(current?.sql===t.original_sql)continue;
  if(current?.sql!==t.wrapped_sql)throw Error('loadlab_trigger_changed:'+t.name);
  db.exec('DROP TRIGGER '+q(t.name));db.exec(t.original_sql);
 }
}
export class LoadLabWriterGuard {
 constructor(database){this.database=database;this.db=database.sqlite;this.phase='';this.tables=new Map();this.generatedObserverSqlR8=new Map();this.blocked=new Set();this.pendingStops=new Map();this.internal=false;}
 install(){
  // A SQL UPDATE used as a phase flag would overwrite SQLite changes() between
  // existing game statements. This connection-local flag preserves that API.
  this.enabled=false;this.setEnabled={run:value=>{this.enabled=!!value;}};
  this.db.function('col_loadlab_writer_enabled',()=>this.enabled?1:0);
  this.db.function('col_loadlab_observe',{varargs:true},(...args)=>this.observe(...args));
 }
 required(){return withWriterSqlCost477(this.db,'test_validation',()=>{
  const r=this.registry();
  let needed=!(typeof r.enabled==='function'&&typeof r.hasKnownEntities==='function'&&r.enabled()===false&&r.hasKnownEntities()===false);
  if(!needed&&!this.emptyVerified){needed=!!prepareCached477(this.db,"SELECT 1 FROM players WHERE loadlab_run_id<>'' LIMIT 1").get()||!!prepareCached477(this.db,"SELECT 1 FROM monsters WHERE loadlab_run_id<>'' LIMIT 1").get();this.emptyVerified=!needed;}
  if(needed){this.emptyVerified=false;return true;}
  if(this.tables.size){for(const name of this.tables.keys())for(const op of ['INSERT','UPDATE','DELETE'])this.db.exec('DROP TRIGGER IF EXISTS temp.'+q('col_loadlab_'+name+'_'+op));this.tables.clear();this.generatedObserverSqlR8.clear();this.schemaVersion=undefined;this.tempSchemaVersion=undefined;}
  return false;
 });}
 refreshSchema(){return withWriterSqlCost477(this.db,'test_validation',()=>{
  const {mainVersion:version,tempVersion}=preparedSchemaVersions477(this.db);if(version===this.schemaVersion&&tempVersion===this.tempSchemaVersion)return;
  // The optional puzzle uses connection-local triggers installed after some
  // startup helpers. They also calculate once and are suppressed only on replay.
  for(const t of prepareCached477(this.db,"SELECT name,tbl_name,sql FROM sqlite_temp_schema WHERE type='trigger' AND sql IS NOT NULL").all())if(BOOK.has(t.tbl_name)&&!t.name.startsWith('col_')&&!t.sql.includes('loadlab_writer_context_v1')){
   const next=wrappedTrigger(t.sql).replace(/^CREATE\s+TRIGGER\b/i,'CREATE TEMP TRIGGER');
   this.db.exec('DROP TRIGGER temp.'+q(t.name));this.db.exec(next);
  }
  // TEMP trigger creation is transactional too. If a previous writer job
  // rolled back its first schema refresh, the JavaScript table map alone must
  // never be treated as evidence that the database still has its observers.
  if(this.tables.size&&(version!==this.schemaVersion||tempVersion!==this.tempSchemaVersion)){for(const name of this.tables.keys())for(const op of ['INSERT','UPDATE','DELETE'])this.db.exec('DROP TRIGGER IF EXISTS temp.'+q('col_loadlab_'+name+'_'+op));this.tables.clear();this.generatedObserverSqlR8.clear();}
  for(const t of prepareCached477(this.db,"SELECT name FROM main.sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()){
   if(this.tables.has(t.name))continue;
   const info=prepareCached477(this.db,'PRAGMA main.table_info('+q(t.name)+')').all();
   const columns=info.map(c=>c.name),primary=info.filter(c=>c.pk).sort((a,b)=>a.pk-b.pk).map(c=>c.name);
   let keys=primary;
   if(BOOK.has(t.name)){
    const expected=BOOK_KEYS[t.name],matches=actual=>actual.length===expected.length&&actual.every((c,i)=>c===expected[i]);
    const unique=matches(primary)||prepareCached477(this.db,'PRAGMA main.index_list('+q(t.name)+')').all().some(index=>index.unique===1&&index.partial===0&&matches(prepareCached477(this.db,'PRAGMA main.index_info('+q(index.name)+')').all().sort((a,b)=>a.seqno-b.seqno).map(c=>c.name)));
    if(!unique)throw Error('loadlab_bookkeeping_unique_key_missing:'+t.name);
    keys=expected;
   }
   this.tables.set(t.name,{columns,keys});
   const refs=columns.filter(c=>['id','loadlab_run_id','player_id','monster_id','spawn_round','boss_round','owner_id','recipient_id','target_id','killer_id','victim_id','leader_id','account_id'].includes(c));
   if(t.name==='auth_rate_limits'&&(columns.length!==4||columns.some(c=>!['key','attempts','window_started_at','blocked_until'].includes(c))))throw Error('loadlab_rate_limit_schema');
   const selected=BOOK.has(t.name)||t.name==='auth_rate_limits'?columns:t.name==='auth_sessions'?[...refs,'last_seen_at','expires_at']:t.name==='messages'?[...refs,'player_name','scope','area','channel','body','announcement_request_id']:t.name==='pve_engagements'&&columns.includes('attackers489')?[...refs,'attackers489']:refs;
   if(selected.length>60)throw Error('loadlab_observer_columns_limit:'+t.name);
   const row=ref=>selected.length?'json_object('+selected.map(c=>"'"+c+"',"+(t.name==='pve_engagements'&&c==='attackers489'?"("+ref+'.'+q(c)+"||'')":ref+'.'+q(c))).join(',')+')':"'{}'";
   const forbidden=SIM[t.name]?columns.filter(c=>!SIM[t.name].has(c)):columns;
   for(const op of ['INSERT','UPDATE','DELETE']){
    const old=op==='INSERT'?"'null'":row('OLD'),next=op==='DELETE'?"'null'":row('NEW');
    const bad=op==='UPDATE'?(forbidden.map(c=>'OLD.'+q(c)+' IS NOT NEW.'+q(c)).join(' OR ')||'0'):'1';
    const observerName='col_loadlab_'+t.name+'_'+op;
    const observerSql=`CREATE TEMP TRIGGER ${q(observerName)} AFTER ${op} ON main.${q(t.name)} WHEN col_loadlab_writer_enabled()=1 BEGIN SELECT col_loadlab_observe('${t.name}','${op}',${old},${next},${bad}); END;`;
    this.db.exec(observerSql);
    // SQLite stores TEMP triggers without TEMP or their final semicolon. Trust
    // only the SQL this instance just generated and successfully installed;
    // never read existing trigger definitions into this allowlist.
    this.generatedObserverSqlR8.set(observerName,observerSql.replace(/^CREATE TEMP TRIGGER /,'CREATE TRIGGER ').slice(0,-1));
   }
  }
  // Reject a new unwrapped bookkeeping trigger rather than silently replay it.
  for(const t of prepareCached477(this.db,"SELECT name,tbl_name,sql FROM main.sqlite_schema WHERE type='trigger' AND sql IS NOT NULL").all())if(BOOK.has(t.tbl_name)&&!t.sql.includes('loadlab_writer_context_v1'))throw Error('loadlab_unwrapped_bookkeeping_trigger:'+t.name);
  const finalVersions=preparedSchemaVersions477(this.db);this.schemaVersion=finalVersions.mainVersion;this.tempSchemaVersion=finalVersions.tempVersion;
 });}
 registry(){const r=globalThis.__colLoadLab;if(!r||['playerRun','monsterRun','accountRun','active','stop'].some(k=>typeof r[k]!=='function'))throw channelError('loadlab_registry_unavailable');return r;}
 fail(code,detail=''){
  this.violation={code,detail:String(detail).slice(0,180),runId:this.reward?.runId||this.rateLimit?.runId||this.actorRun||this.deltaRun||this.detectedRun||''};
  if(this.violation.runId){this.blocked.add(this.violation.runId);this.pendingStops.set(this.violation.runId,this.violation);}
  throw Object.assign(channelError(code),{loadlabRejected:true});
 }
 resolve(kind,id){return withWriterSqlCost477(this.db,'test_validation',()=>{
  if(id===null||id===undefined||id==='')return null;
  const key=kind+':'+id;if(this.cache.has(key))return this.cache.get(key);
  const table=kind==='player'?'players':kind==='monster'?'monsters':null;
  const r=this.registry();let run,exists=true;
  if(table){const p=prepareCached477(this.db,'SELECT loadlab_run_id FROM main.'+table+' WHERE id=?').get(id);exists=!!p;run=p?.loadlab_run_id??'';const registered=(kind==='player'?r.playerRun(id):r.monsterRun(id))||'';if(run!==registered)this.fail('loadlab_registry_mismatch',key);}
  else{run=r.accountRun(id)||'';exists=!!prepareCached477(this.db,'SELECT 1 FROM main.accounts WHERE id=?').get(id);}
  const result={run,exists};this.rememberRead477(this.cache,key,result);if(kind==='player')this.rememberRead477(this.targetPlayers,id,exists);return result;
 });}
 begin(actor,leased){
  withWriterSqlPhase477(this.db,'schema',()=>this.refreshSchema());this.cache=new Map();this.targetPlayers=new Map();this.violation=null;this.detectedRun='';this.actor=actor??null;this.actorRun='';this.reward=null;this.leased=leased;
 }
 beginAction(){
  this.phase='action';this.setEnabled.run(1);
  if(this.actor!==null){if(typeof this.actor!=='string'||!this.leased.has(this.actor))this.fail('loadlab_actor_not_leased');const p=this.resolve('player',this.actor);if(!p?.exists)this.fail('loadlab_actor_missing');this.actorRun=p.run;}
  if(this.actorRun&&(!this.registry().active(this.actorRun)||this.blocked.has(this.actorRun)))this.fail('loadlab_lease_inactive');
 }
 end(){this.internal=true;try{if(this.replaying)prepareCached477(this.db,'UPDATE loadlab_writer_context_v1 SET replay_active=0 WHERE id=1').run();}finally{this.replaying=false;this.internal=false;this.setEnabled.run(0);this.phase='';this.reward=null;this.clearReads477();}}
 clearReads477(){this.cache?.clear();this.targetPlayers?.clear();}
 // Snapshot identity/existence only, never HP, claims, leases or economy data.
 // A rollback restores the exact pre-savepoint maps; identities learned or
 // invalidated by rolled-back triggers must not escape into replay.
 snapshotIdentityR13(){return perfR13Features.enabled('loadlabRollbackReads')?{cache:new Map(this.cache),players:new Map(this.targetPlayers)}:null;}
 restoreIdentityR13(snapshot){if(snapshot){this.cache=new Map(snapshot.cache);this.targetPlayers=new Map(snapshot.players);}else this.clearReads477();}
 // This row was read on the same locked synchronous writer connection. Keep
 // the original registry equality check and cache only identity/existence.
 verifiedMonsterRowR13(id,row){
  if(!perfR13Features.enabled('loadlabMonsterRead'))return this.resolve('monster',id);
  const run=row?.loadlab_run_id??'',exists=!!row,registered=this.registry().monsterRun(id)||'';
  if(run!==registered)this.fail('loadlab_registry_mismatch','monster:'+id);
  const value={run,exists};this.rememberRead477(this.cache,'monster:'+id,value);return value;
 }
 rememberRead477(cache,key,value){if(!cache)return;if(!cache.has(key)&&cache.size>=4096)cache.delete(cache.keys().next().value);cache.set(key,value);}
 // These contain identity/existence only, never HP, economy values, ownership
 // leases or reward claims. Their lifetime is one synchronous writer job.
 // Identity-changing observers invalidate both before and after keys; every
 // savepoint rollback clears them, including rows that ceased to exist.
 invalidateIdentity477(table,op,before,after){
  const kind=table==='players'?'player':table==='monsters'?'monster':table==='accounts'?'account':null;
  if(!kind)return;
  if(op==='UPDATE'&&before?.id===after?.id&&before?.loadlab_run_id===after?.loadlab_run_id)return;
  for(const row of [before,after])if(row?.id!==null&&row?.id!==undefined){this.cache?.delete(kind+':'+row.id);if(kind==='player')this.targetPlayers?.delete(row.id);}
 }
 targetIsPlayer477(id,lookups){return withWriterSqlCost477(this.db,'test_validation',()=>{
  if(lookups?.has(id))return lookups.get(id);
  if(this.targetPlayers?.has(id)){const found=this.targetPlayers.get(id);lookups?.set(id,found);return found;}
  const found=!!prepareCached477(this.db,'SELECT 1 FROM players WHERE id=?').get(id);
  lookups?.set(id,found);this.rememberRead477(this.targetPlayers,id,found);return found;
 });}
 // This bounded object is the game's existing V489 encounter format. Resolve
 // every key with the same DB-marker/registry equality and per-job identity
 // cache as the original primary monster. No timers or extra writer job.
 pveAttackers492(row){
  if(!row||row.attackers489===undefined)return [];
  if(!this.actorRun&&!this.deltaRun&&!this.detectedRun)this.detectedRun=this.resolve('player',row.player_id)?.run||this.resolve('monster',row.monster_id)?.run||'';
  const raw=row.attackers489;if(typeof raw!=='string'||raw.length>16384)this.fail('loadlab_pve_attackers_invalid','size');
  let value;try{value=JSON.parse(raw);}catch{this.fail('loadlab_pve_attackers_invalid','json');}
  if(!value||Array.isArray(value)||typeof value!=='object')this.fail('loadlab_pve_attackers_invalid','object');
  const entries=Object.entries(value);if(entries.length>32)this.fail('loadlab_pve_attackers_invalid','count');
  for(const [id,entry]of entries){
   if(!id||id.length>128||!entry||Array.isArray(entry)||typeof entry!=='object'||entry.monster_id!==id||Object.keys(entry).length!==4||['spawn_round','next_hit_at_ms','last_skill_at_ms'].some(k=>!Object.hasOwn(entry,k)||!Number.isSafeInteger(entry[k])||entry[k]<0))this.fail('loadlab_pve_attackers_invalid','entry');
  }
  // JSON.parse keeps the last duplicate key while SQLite JSON may keep the
  // first. All values above are objects, so strings at depth one are keys.
  let depth=0;const keys=new Set();for(const match of raw.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\]]/g)){const token=match[0];if(token==='{'||token==='[')depth++;else if(token==='}'||token===']')depth--;else if(depth===1){const key=JSON.parse(token);if(keys.has(key))this.fail('loadlab_pve_attackers_invalid','duplicate');keys.add(key);}}
  return entries.map(([id])=>id);
 }
 references(table,row,targetPlayers){return withWriterSqlCost477(this.db,'test_validation',()=>{
  if(!row)return [];
  const out=[];const add=(kind,id)=>{if(id!==null&&id!==undefined&&id!=='')out.push(this.resolve(kind,id));};
  if(table==='players')add('player',row.id);else if(table==='monsters')add('monster',row.id);else{
   for(const key of ['player_id','owner_id','recipient_id','killer_id','victim_id','leader_id'])if(Object.hasOwn(row,key))add('player',row[key]);
   if(Object.hasOwn(row,'monster_id'))add('monster',row.monster_id);
   if(table==='pve_engagements')for(const id of this.pveAttackers492(row))add('monster',id);
   if(Object.hasOwn(row,'account_id'))add('account',row.account_id);
   if(Object.hasOwn(row,'boss_round')){const entry=this.registry().bossMonster?.(row.boss_round);if(entry){if(typeof entry.id!=='string'||typeof entry.runId!=='string'||this.resolve('monster',entry.id)?.run!==entry.runId)this.fail('loadlab_boss_registry_mismatch');add('monster',entry.id);}}
   if(Object.hasOwn(row,'target_id')&&row.target_id){const r=this.registry();if(r.playerRun(row.target_id)||this.targetIsPlayer477(row.target_id,targetPlayers))add('player',row.target_id);else add('monster',row.target_id);}
  }
  return out;
 });}
 validateDelta(delta,targetPlayers){
  const table=delta.table==='position'?'players':delta.table;
  const refs=[...this.references(table,delta.before??delta.after,targetPlayers),...this.references(table,delta.after??delta.before,targetPlayers)];
  const runs=new Set(refs.map(r=>r.run));this.detectedRun=[...runs].find(Boolean)||'';if(this.detectedRun&&(refs.some(r=>!r.exists)||runs.size!==1))this.fail('loadlab_mixed_memory_delta',table);
 }
 deltaEntities(delta,targetPlayers){
  const table=delta.table==='position'?'players':delta.table,out=new Set();
  const add=(kind,id)=>{if(typeof id==='string'&&id)out.add(kind+':'+id);};
  for(const row of [delta.before,delta.after].filter(Boolean)){
   if(table==='players')add('player',row.id??delta.keys[0]);else if(table==='monsters')add('monster',row.id??delta.keys[0]);else{
    if(row.player_id)add('player',row.player_id);
    if(row.monster_id)add('monster',row.monster_id);
    if(table==='pve_engagements'&&typeof row.attackers489==='string'&&row.attackers489.length<=16384){try{const value=JSON.parse(row.attackers489);if(value&&typeof value==='object'&&!Array.isArray(value)){const ids=Object.keys(value);if(ids.length<=32)for(const id of ids)if(id.length<=128)add('monster',id);}}catch{}}
    if(row.target_id)add(this.targetIsPlayer477(row.target_id,targetPlayers)?'player':'monster',row.target_id);
    if(row.boss_round!==undefined){const target=this.registry().bossMonster?.(row.boss_round);if(target?.id)add('monster',target.id);}
   }
  }
  return [...out];
 }
 partitionDeltas(deltas){
  const parents=new Map(),targetPlayers=new Map(),entities=deltas.map(d=>this.deltaEntities(d,targetPlayers));
  const root=id=>{let p=parents.get(id);if(p===undefined){parents.set(id,id);return id;}while(p!==parents.get(p))p=parents.get(p);parents.set(id,p);return p;};
  for(const ids of entities)for(const id of ids){const a=root(ids[0]),b=root(id);if(a!==b)parents.set(b,a);}
  const tainted=new Set(),failed=new Set();let rejection=null;
  for(let i=0;i<deltas.length;i++)try{this.validateDelta(deltas[i],targetPlayers);}catch(error){if(!this.violation)throw error;rejection??={...this.violation};failed.add(i);for(const id of entities[i])tainted.add(root(id));}
  const accepted=[],quarantined=[],components=new Map();
  for(let i=0;i<deltas.length;i++){
   if(failed.has(i)||entities[i].some(id=>tainted.has(root(id))))quarantined.push(deltas[i]);
   else{accepted.push(deltas[i]);const key=entities[i].length?root(entities[i][0]):'isolated:'+i;if(!components.has(key))components.set(key,[]);components.get(key).push(deltas[i]);}
  }
  this.violation=null;this.detectedRun='';return {accepted,quarantined,rejection,components:[...components.values()]};
 }
 applyDeltas(partition,apply,{checkpoint,restore,reset}={}){
  let rows=0,rejection=partition.rejection;const quarantined=[...partition.quarantined];
  for(const component of partition.components){
   const saved=checkpoint?.();let count=0;this.db.exec('SAVEPOINT col_loadlab_delta');
   this.phase='delta';this.setEnabled.run(1);
   try{
    for(const delta of component){
     const table=delta.table==='position'?'players':delta.table;
     this.deltaRun=this.references(table,delta.after??delta.before).find(r=>r.run)?.run||'';
     count+=apply(delta);
    }
    this.db.exec('RELEASE col_loadlab_delta');rows+=count;
   }catch(error){
    this.db.exec('ROLLBACK TO col_loadlab_delta; RELEASE col_loadlab_delta');this.clearReads477();restore?.(saved);reset?.();
    if(!this.violation)throw error;
    rejection??={...this.violation};quarantined.push(...component);
   }finally{this.phase='';this.deltaRun='';this.violation=null;this.detectedRun='';this.setEnabled.run(0);}
  }
  return {rows,quarantined,rejection};
 }
 observe(table,op,oldJson,newJson,bad){return withWriterSqlCost477(this.db,'test_validation',()=>{
  if(this.internal)return 0;
  if(table.startsWith('loadlab_writer_')||table.startsWith('col_loadlab_'))this.fail('loadlab_internal_table_mutation',table);
  const before=JSON.parse(oldJson),after=JSON.parse(newJson),rows=[before,after].filter(Boolean);
  this.invalidateIdentity477(table,op,before,after);
  if(this.rateLimit){
   if(this.phase!=='action'||table!=='auth_rate_limits'||!['INSERT','UPDATE'].includes(op)||bad&&op==='UPDATE'||rows.some(row=>row.key!==this.rateLimit.key)||['attempts','window_started_at','blocked_until'].some(c=>!Number.isSafeInteger(after[c])||after[c]<0))this.fail('loadlab_rate_limit_scope',table);
   return 0;
  }
  if(table==='auth_rate_limits'&&this.actorRun)this.fail('loadlab_rate_limit_proof_missing');
  if(table==='players'||table==='monsters')for(const row of rows){
   const registered=(table==='players'?this.registry().playerRun(row.id):this.registry().monsterRun(row.id))||'';
   if(row.loadlab_run_id!==registered){this.detectedRun=row.loadlab_run_id||registered;this.fail('loadlab_marker_mutation',table);}
  }
  const refs=rows.flatMap(row=>this.references(table,row)),runs=new Set(refs.map(r=>r.run));
  this.detectedRun=[...runs].find(Boolean)||'';
  if(this.phase==='reward'){
   if(!CALC.has(table))this.fail('loadlab_reward_table_forbidden',table);
   if(table==='messages'){
    const match=/^level-(10|20|30|40|50)$/.exec(after?.announcement_request_id??'');
    const player=after?.player_id?prepareCached477(this.db,'SELECT name,level FROM players WHERE id=?').get(after.player_id):null;
    if(op!=='INSERT'||!match||after.player_name!=='SEVİYE'||after.scope!=='world'||after.recipient_id!==null||after.area!==null||after.channel!==1||!player||player.level<Number(match[1])||after.body!==player.name+' oyuncusu '+match[1]+'. Seviyeye ulaştı!')this.fail('loadlab_reward_message_forbidden');
   }
   if(this.reward.phase==='pvp'&&!['war_kill_claims','pvp_reward_cooldowns','players'].includes(table))this.fail('loadlab_pvp_reward_table',table);
   if(refs.some(r=>!r.exists||r.run!==this.reward.runId))this.fail('loadlab_reward_foreign_owner',table);
   if(['players','monsters'].includes(table)&&op!=='UPDATE')this.fail('loadlab_reward_identity_mutation',table);
   if(table==='players'&&rows.some(row=>row.loadlab_run_id!==this.reward.runId))this.fail('loadlab_reward_marker_mutation');
   if(BOOK.has(table)){
    const spec=this.tables.get(table);if(!spec.keys.length)this.fail('loadlab_bookkeeping_key_missing',table);
    for(const row of rows)this.validateBook(table,row);
    const key=JSON.stringify([table,...spec.keys.map(k=>(after??before)[k])]);
    this.capture.set(key,{table,keys:spec.keys.map(k=>(after??before)[k]),row:after});
    if(this.capture.size>4096)this.fail('loadlab_bookkeeping_limit');
   }
   return 0;
  }
  if(this.phase==='replay'){
   if(!BOOK.has(table))this.fail('loadlab_replay_side_effect',table);
   for(const row of rows)this.validateBook(table,row);
   return 0;
  }
  const touched=this.phase==='delta'?this.deltaRun||this.detectedRun:this.actorRun||this.detectedRun;if(!touched)return 0;
  if(table==='auth_sessions'&&(this.phase!=='action'||op!=='UPDATE'||!Number.isSafeInteger(after.last_seen_at)||after.last_seen_at<before.last_seen_at||after.last_seen_at>after.expires_at))this.fail('loadlab_session_touch_forbidden',table);
  if(!SIM[table]||bad&&op==='UPDATE'||['players','monsters'].includes(table)&&op!=='UPDATE')this.fail('loadlab_action_mutation_forbidden',table);
  if(!refs.length||refs.some(r=>!r.exists||r.run!==touched))this.fail('loadlab_action_foreign_owner',table);
  if(this.phase==='delta'&&this.deltaRun!==touched||this.phase!=='delta'&&this.actor&&this.actorRun!==touched)this.fail('loadlab_real_actor_test_target',table);
  if(this.phase!=='delta'&&(!this.registry().active(touched)||this.blocked.has(touched)))this.fail('loadlab_lease_inactive',table);
  return 0;
 });}
 validateBook(table,row){return withWriterSqlCost477(this.db,'test_validation',()=>{
  const g=this.reward;
  if(BOOK_KEYS[table].some(key=>row[key]===null||row[key]===undefined))this.fail('loadlab_bookkeeping_null_key',table);
  if(g.phase==='pvp'){
   if(!['war_kill_claims','pvp_reward_cooldowns'].includes(table))this.fail('loadlab_pvp_bookkeeping_table',table);
   if(table==='war_kill_claims'&&(row.killer_id!==g.actorId||row.victim_id!==g.victimId||row.victim_hp_revision!==g.victimHpRevision))this.fail('loadlab_pvp_bookkeeping_scope');
   if(table==='pvp_reward_cooldowns'&&(row.player_id!==g.actorId||row.reward_scope!=='war_kill:'+g.victimId))this.fail('loadlab_pvp_cooldown_scope');
   return;
  }
  if(g.phase==='inline_many'){
   const target=Object.hasOwn(row,'monster_id')?g.targets.find(t=>t.monsterId===row.monster_id):null;
   if(Object.hasOwn(row,'monster_id')&&!target)this.fail('loadlab_bookkeeping_monster',table);
   if(Object.hasOwn(row,'spawn_round')&&(!target||row.spawn_round!==target.spawnRound))this.fail('loadlab_bookkeeping_round',table);
   if(Object.hasOwn(row,'boss_round'))this.fail('loadlab_bookkeeping_boss_round',table);
   if(row.player_id&&this.resolve('player',row.player_id)?.run!==g.runId)this.fail('loadlab_bookkeeping_player',table);
   return;
  }
  if(Object.hasOwn(row,'monster_id')&&row.monster_id!==g.monsterId)this.fail('loadlab_bookkeeping_monster',table);
  if(Object.hasOwn(row,'spawn_round')&&row.spawn_round!==g.spawnRound)this.fail('loadlab_bookkeeping_round',table);
  if(Object.hasOwn(row,'boss_round')&&row.boss_round!==g.spawnRound)this.fail('loadlab_bookkeeping_boss_round',table);
  if(row.player_id&&this.resolve('player',row.player_id)?.run!==g.runId)this.fail('loadlab_bookkeeping_player',table);
 });}
 validateGroup(frames,start){return withWriterSqlCost477(this.db,'test_validation',()=>{
  const g=frames[start].loadlabReward;
  if(g?.phase==='inline_many'){
   if(g.version!==2||typeof g.runId!=='string'||!g.runId||!Array.isArray(g.targets)||g.targets.length<2||g.targets.length>32||new Set(g.targets.map(t=>t?.monsterId)).size!==g.targets.length||!Number.isInteger(g.count)||g.count<1||g.count>512||g.index!==0||start+g.count>frames.length)this.fail('loadlab_reward_metadata');
   if(g.targets.some(t=>!t||Object.keys(t).length!==2||typeof t.monsterId!=='string'||!Number.isSafeInteger(t.spawnRound)||t.spawnRound<0))this.fail('loadlab_reward_metadata');
   const wanted={...g};delete wanted.index;for(let i=0;i<g.count;i++){const x=frames[start+i].loadlabReward;if(!x||x.index!==i||Object.keys(wanted).some(k=>x[k]!==wanted[k])||Object.keys(x).length!==Object.keys(g).length)this.fail('loadlab_reward_group_incomplete');}
   this.detectedRun=g.runId;if(this.actorRun!==g.runId||!this.registry().active(g.runId)||this.blocked.has(g.runId))this.fail('loadlab_reward_actor');
   const rows=prepareCached477(this.db,"SELECT m.id,m.loadlab_run_id,m.spawn_round,m.is_boss,m.is_stone FROM json_each(?) wanted JOIN monsters m ON m.id=json_extract(wanted.value,'$.monsterId')").all(JSON.stringify(g.targets));
   if(rows.length!==g.targets.length)this.fail('loadlab_reward_scope');
   for(const row of rows){const target=g.targets.find(t=>t.monsterId===row.id);if(!target||row.loadlab_run_id!==g.runId||this.verifiedMonsterRowR13(row.id,row)?.run!==g.runId||row.is_boss||row.is_stone)this.fail('loadlab_reward_scope');if(row.spawn_round!==target.spawnRound)this.fail('loadlab_reward_stale_round');}
   return g;
  }
  this.detectedRun=typeof g?.monsterId==='string'?(this.registry().monsterRun(g.monsterId)||''):typeof g?.actorId==='string'?(this.registry().playerRun(g.actorId)||''):'';
  if(!g||g.version!==1||!['inline','deferred','pvp'].includes(g.phase)||typeof g.runId!=='string'||!g.runId||!Number.isInteger(g.count)||g.count<1||g.count>512||g.index!==0||start+g.count>frames.length)this.fail('loadlab_reward_metadata');
  const wanted={...g};delete wanted.index;
  for(let i=0;i<g.count;i++){const x=frames[start+i].loadlabReward;if(!x||x.index!==i||Object.keys(wanted).some(k=>x[k]!==wanted[k])||Object.keys(x).length!==Object.keys(g).length)this.fail('loadlab_reward_group_incomplete');}
  if(g.phase==='pvp'){
   if(typeof g.actorId!=='string'||typeof g.victimId!=='string'||g.actorId===g.victimId||!Number.isSafeInteger(g.victimHpRevision)||g.victimHpRevision<1||this.actor!==g.actorId||this.actorRun!==g.runId||this.resolve('player',g.victimId)?.run!==g.runId||!this.registry().active(g.runId)||this.blocked.has(g.runId))this.fail('loadlab_pvp_reward_scope');
   const victim=prepareCached477(this.db,'SELECT hp,hp_revision FROM players WHERE id=?').get(g.victimId);
   if(!victim||victim.hp!==0||victim.hp_revision!==g.victimHpRevision)this.fail('loadlab_pvp_reward_revision');
   return g;
  }
  if(typeof g.monsterId!=='string'||!Number.isSafeInteger(g.spawnRound)||g.spawnRound<0)this.fail('loadlab_reward_metadata');
  const monster=prepareCached477(this.db,'SELECT loadlab_run_id,is_boss,spawn_round FROM monsters WHERE id=?').get(g.monsterId);
  if(!monster||monster.loadlab_run_id!==g.runId||this.verifiedMonsterRowR13(g.monsterId,monster)?.run!==g.runId||!this.registry().active(g.runId)||this.blocked.has(g.runId))this.fail('loadlab_reward_scope');
  if(g.phase==='inline'&&this.actorRun!==g.runId)this.fail('loadlab_reward_actor');
  if(g.phase==='inline'&&monster.spawn_round!==g.spawnRound)this.fail('loadlab_reward_stale_round');
  if(monster.is_boss){const entry=this.registry().bossMonster?.(g.spawnRound);if(!entry||entry.id!==g.monsterId||entry.runId!==g.runId)this.fail('loadlab_boss_registry_mismatch');const ledger=prepareCached477(this.db,'SELECT monster_id,run_id FROM loadlab_boss_rounds_v1 WHERE boss_round=?').get(g.spawnRound);if(ledger?.monster_id!==g.monsterId||ledger.run_id!==g.runId)this.fail('loadlab_boss_round_proof');}
  return g;
 });}
 validateRateLimit(g){return withWriterSqlCost477(this.db,'test_validation',()=>{
  this.detectedRun=typeof g?.accountId==='string'?(this.registry().accountRun(g.accountId)||''):'';
  if(!g||g.version!==1||!['realtime-ticket','claim-rewards'].includes(g.scope)||typeof g.runId!=='string'||!g.runId||typeof g.accountId!=='string'||!g.accountId||g.key!==createHash('sha256').update(g.scope+':'+g.accountId).digest('base64url')||this.resolve('account',g.accountId)?.run!==g.runId||!this.resolve('account',g.accountId)?.exists||!this.registry().active(g.runId)||this.blocked.has(g.runId)||this.actorRun&&this.actorRun!==g.runId)this.fail('loadlab_rate_limit_metadata');
  return g;
 });}
 readCaptured477(){
  const captured=[...this.capture.values()].map(entry=>({...entry,row:null})),groups=new Map();
  for(let index=0;index<captured.length;index++){
   const entry=captured[index];let group=groups.get(entry.table);if(!group)groups.set(entry.table,group=[]);group.push({entry,index});
  }
  // Read each table's final rows together, after all cascaded reward triggers.
  // Keep the original capture order for replay, exact IS key comparisons and
  // missing-row deletion semantics. Bounded chunks avoid a large bind/JSON.
  for(const [table,entries]of groups){
   const spec=this.tables.get(table),columns=spec.columns.map(c=>'actual.'+q(c)).join(',');
   if(entries.length===1){const {entry,index}=entries[0];captured[index].row=prepareCached477(this.db,'SELECT '+spec.columns.map(q).join(',')+' FROM '+q(table)+' WHERE '+spec.keys.map(k=>q(k)+' IS ?').join(' AND ')).get(...entry.keys)??null;continue;}
   const sql='SELECT wanted.key AS "__col_capture_index477",'+columns+' FROM json_each(?) AS wanted JOIN '+q(table)+' AS actual ON '+spec.keys.map((k,i)=>'actual.'+q(k)+' IS json_extract(wanted.value,\'$['+i+']\')').join(' AND ');
   for(let start=0;start<entries.length;start+=128){
    const chunk=entries.slice(start,start+128),rows=prepareCached477(this.db,sql).all(JSON.stringify(chunk.map(({entry})=>entry.keys)));
    for(const row of rows){
     const index=Number(row.__col_capture_index477);if(!Number.isSafeInteger(index)||index<0||index>=chunk.length)this.fail('loadlab_capture_result_index');
     const next={};for(const column of spec.columns)Object.defineProperty(next,column,{value:row[column],enumerable:true,writable:true,configurable:true});
     captured[chunk[index].index].row=next;
    }
   }
  }
  recordWriterJobDetail477(this.db,'capturedRows',captured.length);
  recordWriterJobDetail477(this.db,'participantRows',captured.filter(entry=>entry.table==='monster_participants'||entry.table==='boss_participants').length);
  recordWriterJobDetail477(this.db,'capturedDefeatRows',captured.filter(entry=>entry.row&&(entry.table==='normal_defeats'||entry.table==='boss_defeats')).length);
  recordWriterJobDetail477(this.db,'capturedXpClaimRows',captured.filter(entry=>entry.row&&entry.table==='monster_xp_claims').length);
  return captured;
 }
 execute(frames,execute,{checkpoint,restore,reset}={}){
  const output=[];
  for(let i=0;i<frames.length;){
   if(/\b(?:loadlab_writer_|col_loadlab_)/i.test(frames[i].sql))this.fail('loadlab_internal_sql');
   if(frames[i].loadlabRateLimit){
    if(frames[i].loadlabReward)this.fail('loadlab_phase_metadata_conflict');
    this.rateLimit=this.validateRateLimit(frames[i].loadlabRateLimit);
    try{output.push(execute(frames[i++]));}finally{this.rateLimit=null;}
    continue;
   }
   if(!frames[i].loadlabReward){output.push(execute(frames[i++]));continue;}
   const group=withWriterSqlPhase477(this.db,'reward_prepare',()=>this.validateGroup(frames,i)),saved=checkpoint?.(),savedIdentityR13=this.snapshotIdentityR13();
   recordWriterJobDetail477(this.db,'rewardGroups');recordWriterJobDetail477(this.db,'rewardFrames',group.count);
   recordWriterJobDetail477(this.db,(group.phase==='inline'||group.phase==='inline_many')?'inlineRewardGroups':group.phase==='deferred'?'deferredRewardGroups':'pvpRewardGroups');
   this.reward=group;this.capture=new Map();this.phase='reward';
   this.db.exec('SAVEPOINT col_loadlab_reward');
   try{
    withWriterSqlPhase477(this.db,'reward_prepare',()=>{for(let n=0;n<group.count;n++)output.push(execute(frames[i+n]));});
    // AFTER observers skip ignored INSERTs. Read the final row after all
    // cascaded triggers so a later trigger UPDATE cannot be overwritten by the
    // outer operation's older NEW image.
    const captured=withWriterSqlPhase477(this.db,'reward_capture',()=>this.readCaptured477());
    this.db.exec('ROLLBACK TO col_loadlab_reward');this.restoreIdentityR13(savedIdentityR13);restore?.(saved);reset?.();
    if(captured.length||!perfR13Features.enabled('loadlabEmptyReplay'))withWriterSqlPhase477(this.db,'reward_replay',()=>{
    this.phase='replay';this.internal=true;
    try{prepareCached477(this.db,'UPDATE loadlab_writer_context_v1 SET replay_active=1 WHERE id=1').run();this.replaying=true;}finally{this.internal=false;}
    for(const entry of captured){
     recordWriterJobDetail477(this.db,'replayRows');
     const spec=this.tables.get(entry.table),where=spec.keys.map(k=>q(k)+' IS ?').join(' AND ');
     if(!entry.row)prepareCached477(this.db,'DELETE FROM '+q(entry.table)+' WHERE '+where).run(...entry.keys);
     else{
      const columns=spec.columns,updates=columns.filter(c=>!spec.keys.includes(c));
      const conflict=updates.length?'DO UPDATE SET '+updates.map(c=>q(c)+'=excluded.'+q(c)).join(','):'DO NOTHING';
      prepareCached477(this.db,'INSERT INTO '+q(entry.table)+'('+columns.map(q).join(',')+') VALUES('+columns.map(()=>'?').join(',')+') ON CONFLICT('+spec.keys.map(q).join(',')+') '+conflict).run(...columns.map(c=>entry.row[c]));
     }
    }
    this.internal=true;try{prepareCached477(this.db,'UPDATE loadlab_writer_context_v1 SET replay_active=0 WHERE id=1').run();this.replaying=false;}finally{this.internal=false;}
    });
    else withWriterSqlPhase477(this.db,'reward_replay',()=>{
     // The old context OFF write left SQLite changes() at 1. Preserve that
     // connection metadata for following HP SELECTs and durable receipts,
     // while avoiding the unused ON write when no bookkeeping was captured.
     this.internal=true;try{prepareCached477(this.db,'UPDATE loadlab_writer_context_v1 SET replay_active=0 WHERE id=1').run();}finally{this.internal=false;}
    });
    this.db.exec('RELEASE col_loadlab_reward');
   }catch(error){this.db.exec('ROLLBACK TO col_loadlab_reward; RELEASE col_loadlab_reward');this.restoreIdentityR13(savedIdentityR13);restore?.(saved);reset?.();if(!this.violation)this.fail('loadlab_reward_sql_rejected',error.message);throw error;}
   finally{this.phase='action';this.reward=null;this.capture=null;}
   i+=group.count;
  }
  return output;
 }
 notifyStopped(){for(const [runId,reason]of this.pendingStops){this.pendingStops.delete(runId);try{Promise.resolve(this.registry().stop(runId,reason)).catch(()=>{});}catch{ /* Local blocked set stays fail-closed; caller receives the known rejection. */ }}}
}
