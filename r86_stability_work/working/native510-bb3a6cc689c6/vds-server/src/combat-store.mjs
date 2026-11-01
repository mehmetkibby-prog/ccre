import {recordCombatPath477} from './request-performance477.mjs';
import {CombatDirtyMap} from './combat-dirty-map.mjs';
import {dirtyWriter} from './dirty-writer.mjs';
import {FlushMetrics} from './flush-metrics.mjs';
import {CombatProjection} from './combat-projection.mjs';
import {indexedPresenceSql} from './position-store.mjs';
import {DatabaseSync} from 'node:sqlite';
import {reportRuntimeWork,measureRuntimeWork} from './runtime-performance.mjs';

// Only these columns are allowed to cross an acknowledgement before fsync.
// Scope, inventory, currency, XP, deaths and all reward receipts stay durable.
export const COMBAT_TABLES={
 players:{keys:['id'],fields:['hp','hp_revision','attack_one_at','attack_two_at','attack_three_at','attack_four_at','special_guard_until_ms','last_monster_hit_at','combat_lock_until_ms']},
 monsters:{keys:['id'],fields:['hp','last_damaged_at_ms','last_regen_at_ms']},
 monster_participants:{keys:['monster_id','spawn_round','player_id']},
 boss_participants:{keys:['boss_round','player_id']},
 pve_engagements:{keys:['player_id']},
 combat_events:{keys:['id']},
};
const quote=s=>'"'+s.replaceAll('"','""')+'"';
const same=(a,b,fields)=>a===null||b===null?a===b:fields.every(k=>a[k]===b[k]);
const empty=()=>({results:[],success:true,meta:{changes:0,rows_written:0,rows_read:0,served_by:'vds-combat-memory'}});
const token=/'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[[^\]]*\]|--[^\n]*|\/\*[\s\S]*?\*\/|[A-Za-z_][A-Za-z_0-9]*|[().,;]/g;
const reserved=new Set('WHERE JOIN LEFT RIGHT INNER OUTER FULL CROSS NATURAL ON USING GROUP ORDER LIMIT OFFSET UNION INTERSECT EXCEPT HAVING WINDOW RETURNING SET INDEXED NOT'.split(' '));
export function combatReadSql(sql){
 const originalSql=sql;
 if(!/^\s*(?:SELECT|WITH)\b/i.test(sql))return sql;
 if(/\b(?:FROM|JOIN)\s+players\b/i.test(sql))sql=indexedPresenceSql(sql);
 const words=[...sql.matchAll(token)].filter(m=>!m[0].startsWith('--')&&!m[0].startsWith('/*'));
 let depth=0;
 for(const w of words){if(!depth&&['UPDATE','INSERT','DELETE','REPLACE'].includes(w[0].toUpperCase()))return originalSql;if(!depth&&w[0].toUpperCase()==='SELECT')break;if(w[0]==='(')depth++;if(w[0]===')')depth--;}
 const edits=[];
 // Death commits stage participants before enqueueing rewards. Queue discovery
 // must keep the durable pending-defeat index as its driving table.
 const durableRewards=/\b(?:normal_defeats|boss_defeats|sinsi_defeats)\b/i.test(sql);
 for(let i=1;i<words.length;i++){
  const name=words[i][0].toLowerCase();if(!COMBAT_TABLES[name]||!['FROM','JOIN'].includes(words[i-1][0].toUpperCase()))continue;
  if(durableRewards&&['monster_participants','boss_participants'].includes(name))continue;
  if(COMBAT_TABLES[name].fields&&!sql.includes('*')&&!COMBAT_TABLES[name].fields.some(field=>new RegExp('\\b'+field+'\\b','i').test(sql))&&!(name==='players'&&/\blast_seen\b/i.test(sql)))continue;
  const next=words[i+1]?.[0],alias=next&&((/^[A-Za-z_][A-Za-z_0-9]*$/.test(next)&&!reserved.has(next.toUpperCase()))||/^["`\[]/.test(next));
  let source=`temp.col_combat_${name}`;
  // Restrict both UNION branches before joining players/monsters; historical
  // rounds must never become the driver of the live boss leaderboard.
  if(name==='monster_participants'&&sql.includes('stone_rows_json'))source="(SELECT * FROM temp.col_combat_monster_participants WHERE monster_id IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3','rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1','dragon-world-1') AND (monster_id,spawn_round) IN (SELECT id,spawn_round FROM main.monsters WHERE id IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3','rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1','dragon-world-1')))";
  if(name==='boss_participants'&&/\bboss\.is_boss\s*=\s*1/i.test(sql))source='(SELECT * FROM temp.col_combat_boss_participants WHERE boss_round IN (SELECT spawn_round FROM main.monsters WHERE is_boss=1))';
  edits.push([words[i].index,words[i][0].length,`${source}${alias?'':` AS ${name}`}`]);
 }
 for(const [at,len,replacement]of edits.reverse())sql=sql.slice(0,at)+replacement+sql.slice(at+len);
 return sql;
}

export class CombatStore{
 constructor(database,{positions,enabled=process.env.CORE_MEMORY_COMBAT!=='0',now=Date.now}={}){
  this.enabled=Boolean(enabled&&positions?.enabled);this.positions=positions;this.now=now;this.version=0;this.serial=0;this.accepting=true;
  this.flushMetrics=new FlushMetrics(Object.keys(COMBAT_TABLES));this.projections=new CombatProjection(this);
  this.stats={hits:0,kills:0,killCommitMaxMs:0,flushes:0,lastFlushMs:0,maxFlushMs:0,wsAttacks:0,httpAttacks:0,rejected:0,errors:0};
  this.pendingByMonster=new Map();this.tables=new Map();this.replicas=new Set();this.locks=new Map();this.barriers=new Map();this.dirty=new CombatDirtyMap();this.statements=new Map();
  if(!this.enabled)return;
  this.memory=new DatabaseSync(':memory:');this.memory.exec('PRAGMA foreign_keys=OFF');
  // Durable writers use positive AUTOINCREMENT IDs. A separate negative range
  // prevents a flush from overwriting an event inserted on another connection.
  this.nextEventId=Math.min(-(this.now()*1024),database.prepare('SELECT MIN(id) AS id FROM main.combat_events').get()?.id??0);
  this.memory.function('col_memory_event_id',()=>--this.nextEventId);
  for(const [name,definition]of Object.entries(COMBAT_TABLES)){
   const schema=database.prepare('SELECT sql FROM main.sqlite_schema WHERE type=\'table\' AND name=?').get(name);
   if(!schema)throw Error('Combat table missing: '+name);
   this.memory.exec(schema.sql);
   this.memory.exec(`CREATE UNIQUE INDEX col_memory_key_${name} ON ${name}(${definition.keys.map(quote).join(',')})`);
   const columns=database.prepare(`PRAGMA main.table_info(${name})`).all().map(c=>c.name);
   const spec={...definition,columns,fields:definition.fields??columns};
   // Schema membership is invariant for this store; values are still checked on every hit.
   spec.noncombatFields503=columns.filter(c=>!spec.fields.includes(c));
   const projectionFields=definition.fields?[...spec.fields,...(name==='players'?['id','area','channel','arena_match_id','realtime_scope_version']:['id','spawn_round','area','channel'])]:null;
   const records=new Map();const put=this.memory.prepare(`INSERT OR REPLACE INTO ${name}(${columns.map(quote).join(',')}) VALUES(${columns.map(()=>'?').join(',')})`);
   const find=this.memory.prepare(`SELECT * FROM ${name} WHERE ${spec.keys.map(k=>quote(k)+'=?').join(' AND ')}`);
   const remove=this.memory.prepare(`DELETE FROM ${name} WHERE ${spec.keys.map(k=>quote(k)+'=?').join(' AND ')}`);
   // Historical participation/events are never copied into the combat cache.
   // Actors and the current actor/target participation are loaded by PK on use.
   if(name==='combat_events'){const high=database.prepare('SELECT MAX(id) AS id FROM main.combat_events').get().id??0;this.memory.prepare("INSERT OR REPLACE INTO sqlite_sequence(name,seq) VALUES('combat_events',?)").run(high);}
   this.tables.set(name,{spec,projectionFields,records,put,find,remove,recent:new Set(),read:database.prepare(`SELECT * FROM main.${name} WHERE ${spec.keys.map(k=>quote(k)+'= ?').join(' AND ')}`)});
  }
  this.metadata=this.memory.prepare('SELECT changes() AS changes');
  this.touched=null;
  this.memory.function('col_combat_touch',{varargs:true},(table,...keys)=>{this.touched?.set(table+'\u001e'+keys.join('\u001f'),{table,keys});return 0;});
  for(const [name,{spec}]of this.tables)for(const [op,ref]of [['INSERT','NEW'],['UPDATE','NEW'],['DELETE','OLD']])this.memory.exec(`CREATE TRIGGER combat_${name}_${op} AFTER ${op} ON ${name} BEGIN SELECT col_combat_touch('${name}',${spec.keys.map(k=>ref+'.'+quote(k)).join(',')}); END;`);
 }
 waitForTarget(id){const pending=this.barriers.get(id);return pending?.size?Promise.all([...pending]).then(()=>undefined):null;}
 compiled(sql){let p=this.statements.get(sql);if(!p){if(this.statements.size>=256)this.statements.delete(this.statements.keys().next().value);let text=sql;if(/^\s*INSERT INTO combat_events\s*\(/i.test(text)&&!/^\s*INSERT INTO combat_events\s*\(\s*id\b/i.test(text))text=text.replace(/(INSERT INTO combat_events\s*\()/i,'$1id,').replace(/\bVALUES\s*\(/i,'VALUES(col_memory_event_id(),');this.statements.set(sql,p=this.memory.prepare(text));}return p;}
 execute(statement){const p=this.compiled(statement.sql),rows=p.all(...statement.params);const meta=this.metadata.get();return {results:rows,success:true,meta:{...meta,rows_read:rows.length,served_by:'vds-combat-memory'}};}
 entry(table,id){return this.tables.get(table)?.records.get(String(id));}
 value(table,field,id,hp,revision,scope,area,channel,fallback){
  const e=this.entry(table,id);if(!e?.current)return fallback;const p=e.current,b=e.base;
  if(table==='monsters')return p.spawn_round===revision&&(hp===b?.hp||hp===p.hp||p.last_damaged_at_ms>scope)?p[field]:fallback;
  return p.area===area&&p.channel===channel&&p.realtime_scope_version===scope&&revision<=p.hp_revision&&(hp===b?.hp||revision<p.hp_revision||hp===p.hp)?p[field]:fallback;
 }
 projection(){return measureRuntimeWork('combat_projection',()=>this.projectCurrent());}
 projectCurrent(){return this.projections.snapshot();}
 createProjectionCursor(){return this.projections.createCursor();}
 releaseProjectionCursor(cursor){this.projections.closeCursor(cursor);}
 projectionDelta(cursor){return measureRuntimeWork('combat_projection',()=>this.projections.delta(cursor));}
 publish(changes){this.worldPush?.memoryChanged(changes);this.version++;this.projections.changed(changes);for(const replica of this.replicas)replica.refresh(changes);this.worldLoop?.combatChanged(changes);}
 updateMonster(row,fields){
  const t=this.tables.get('monsters'),id=row.id;let e=t.records.get(id);
  if(!e||e.current?.spawn_round!==row.spawn_round)e={base:{...row},current:{...row},keys:[id],generation:0,written:0};
  if(e.current.hp<=0||this.locks.has(id))return;
  e.current={...e.current,...fields};e.generation++;e.dirtyAt??=this.now();(e.pending??=[]).push([e.generation,this.now()]);e.changedAt=this.now();e.version=++this.serial;
  t.records.set(id,e);t.recent.add(id);t.put.run(...t.spec.columns.map(c=>e.current[c]));this.dirty.set('monsters\u001e'+id,{name:'monsters',id,e});this.publish([{name:'monsters',id}]);
 }
 syncParticipant(name,keys){
  const t=this.tables.get(name),id=keys.join('\u001f');if(t.records.has(id))return;
  const row=t.read.get(...keys);if(!row)return;
  t.records.set(id,{base:row,current:row,keys,generation:0,written:0,changedAt:this.now()});t.recent.add(id);t.put.run(...t.spec.columns.map(c=>row[c]));this.projections.changed([{name,id}]);
 }
 indexPending(id,e){
  const monsterId=e.keys[0];let rows=this.pendingByMonster.get(monsterId);
  if(!e.dirtyAt){rows?.delete(id);if(!rows?.size)this.pendingByMonster.delete(monsterId);return;}
  if(!rows)this.pendingByMonster.set(monsterId,rows=new Map());rows.set(id,e);
 }
 syncEntity(name,id){
  // In channel mode durable changes arrive explicitly after the writer ACK.
  // Reading a committed-but-not-yet-ACKed checkpoint here could erase newer
  // local hits while fsync is still pending in the sole writer.
  if(this.resident&&this.tables.get(name)?.records.has(id))return;
  if(name==='players')this.positionChangesCursor?.changed(id);
  const t=this.tables.get(name),row=t.read.get(id),e=t.records.get(id);if(name==='pve_engagements'&&row?.monster_id)this.syncEntity('monsters',row.monster_id);if(!row){if(e?.base){e.base=null;e.current=null;e.pending=[];e.generation=0;e.written=0;delete e.dirtyAt;e.version=++this.serial;e.changedAt=this.now();t.remove.run(id);this.dirty.delete(name+'\u001e'+id);t.recent.add(id);this.publish([{name,id}]);}return;}
  if(!e){t.records.set(id,{base:row,current:row,keys:[id],generation:0,written:0,changedAt:this.now()});t.recent.add(id);t.put.run(...t.spec.columns.map(c=>row[c]));this.projections.changed([{name,id}]);return;}
  if(t.spec.columns.every(c=>row[c]===e.base?.[c]))return;
  const scope=name==='players'?['hp','hp_revision','area','channel','arena_match_id','realtime_scope_version']:['hp','spawn_round'];
  const conflict=(t.spec.fields===t.spec.columns?t.spec.columns:scope).some(c=>row[c]!==e.base?.[c]);
  const current=conflict?{...row}:{...row,...Object.fromEntries(t.spec.fields.map(c=>[c,e.current[c]]))};
  if(conflict){e.generation=0;e.written=0;delete e.dirtyAt;e.pending=[];this.dirty.delete(name+'\u001e'+id);}
  e.base=row;e.current=current;e.changedAt=this.now();e.version=++this.serial;t.put.run(...t.spec.columns.map(c=>current[c]));t.recent.add(id);this.publish([{name,id}]);
 }
 syncPositions(){
  const cursor=this.positions.resident?(this.positionChangesCursor??=this.positions.recent.createCursor()):null;
  if(cursor&&this.positionVersion===-1)cursor.invalidate();
  if(this.positionVersion===this.positions.version&&!cursor?.full&&!cursor?.pending.size)return;
  const t=this.tables.get('players');for(const id of cursor?cursor.keys():this.positions.recent){if(cursor&&!this.positions.recent.has(id))continue;const p=this.positions.entries.get(id),e=t.records.get(id);if(!p||!e?.current)continue;
   const fields=['x','y','position_revision','movement_checked_at_ms','movement_debt_ms','motion_stream_id','motion_sequence'];
   if(fields.every(k=>e.current[k]===p.current[k]))continue;
   const current={...e.current,...Object.fromEntries(fields.map(k=>[k,p.current[k]]))};t.put.run(...t.spec.columns.map(c=>current[c]));e.current=current;
  }cursor?.applied();this.positionVersion=this.positions.version;
 }
 tryBatch(statements,options){return measureRuntimeWork('combat_memory_hit',()=>this.applyMemoryBatch(statements,options));}
 applyMemoryBatch(statements,{guard,hitPlans}={}){
  recordCombatPath477('attempts');
  if(!this.enabled){recordCombatPath477('disabled');return null;}
  if(!this.accepting){recordCombatPath477('not_accepting');return null;}
  if(hitPlans?.some(p=>this.locks.has(p.target.id))){recordCombatPath477('target_locked');return null;}
  if(this.dirty.overdue(this.now())){recordCombatPath477('dirty_overdue');return null;}
  if(guard){this.syncEntity('players',guard.params[3]);this.syncEntity('pve_engagements',guard.params[3]);}
  for(const plan of hitPlans??[]){this.syncEntity('monsters',plan.target.id);if(guard){this.syncParticipant('monster_participants',[plan.target.id,plan.target.spawn_round,guard.params[3]]);this.syncParticipant('boss_participants',[plan.target.spawn_round,guard.params[3]]);}}
  for(const p of hitPlans??[]){const m=this.entry('monsters',p.target.id)?.current;const reason=!m?'target_missing':m.spawn_round!==p.target.spawn_round?'spawn_changed':m.hp<=p.rolled?'lethal':m.is_stone?'stone':m.area==='rune_v2'&&/^rune-v2-boss-c[1-3]-1$/.test(m.id)?'durable_required':null;if(reason){recordCombatPath477(reason);return null;}}
  this.syncPositions();this.touched=new Map();this.memory.exec('BEGIN');
  let result;
  try{
   const accepted=guard?this.execute(guard):null;
   if(accepted&&!accepted.results.length){this.memory.exec('ROLLBACK');this.stats.rejected++;recordCombatPath477('guard_rejected');return {guard:accepted,results:[]};}
   const results=statements.map(s=>{
    if(hitPlans&& !/^\s*(?:INSERT INTO (?:combat_events|monster_participants|boss_participants|pve_engagements)|UPDATE (?:monsters|players)|DELETE FROM pve_engagements|SELECT hp FROM monsters)/i.test(s.sql))return empty();
    // Presence is derived from the hit timestamp just like v411 movement.
    // Do not turn a nonlethal HP update into a durable presence write.
    const sql=/^\s*UPDATE players SET hp/.test(s.sql)&&s.sql.includes('last_monster_hit_at = ?')?s.sql.replace('last_seen = ?', 'last_seen = last_seen + 0 * ?'):s.sql;
    return this.execute(sql===s.sql?s:{sql,params:s.params});
   });
   const changes=[];
   for(const {table,keys}of this.touched.values()){
    const t=this.tables.get(table),id=keys.join('\u001f'),old=t.records.get(id),row=t.find.get(...keys)??null;
    // Never defer a death, scope transition, wave transition or any economic
    // column accidentally added by a future caller. Retry in the durable lane.
    if(t.spec.fields&&row&&old?.current){
     if(row.hp!==undefined&&row.hp<=0)throw new DurableRequired('resulting_death');
     if(t.spec.noncombatFields503.some(c=>row[c]!==old.current[c]))throw new DurableRequired('changed_noncombat');
    }
    if(same(old?.current??null,row,t.spec.columns))continue;
    changes.push({name:table,t,id,old,row,keys});
   }
   this.memory.exec('COMMIT');
   for(const {name,t,id,old,row,keys}of changes){const e=old??{base:null,generation:0,written:0,keys};e.current=row;e.generation++;e.dirtyAt??=this.now();(e.pending??=[]).push([e.generation,this.now()]);e.changedAt=this.now();e.version=++this.serial;t.records.set(id,e);t.recent.add(id);this.dirty.set(name+'\u001e'+id,{name,id,e});if(name==='monster_participants')this.indexPending(id,e);}
   if(changes.length)this.publish(changes);if(hitPlans)this.stats.hits+=hitPlans.length;
   result=guard?{guard:accepted,results}:results;
  }catch(error){if(this.memory.isTransaction)this.memory.exec('ROLLBACK');if(error instanceof DurableRequired){recordCombatPath477(error.message==='resulting_death'?'resulting_death':error.message==='changed_noncombat'?'changed_noncombat':'durable_required');return null;}throw error;}
  finally{this.touched=null;}
  recordCombatPath477('memory_accepted');return result;
 }
 stage(connection){
  const staged=[];staged.metrics=this.flushMetrics.begin();
  for(const {name,id,e}of this.dirty.values()){if(e.generation===e.written)continue;const t=this.tables.get(name);
   const c=connection.tables.get(name);
   const at=performance.now(),write=c.writer.write(e.current,e.base,e.keys);
   this.flushMetrics.wrote(staged.metrics,name,write.result.changes,write.columns,performance.now()-at);
   staged.push({name,id,e,generation:e.generation,row:e.current});
  }
  return staged;
 }
 committed(connection,ctx){
  const saved=[];
  for(const {name,id,e,generation}of ctx.staged){saved.push({name,id,e,generation});ctx.touched.set(name+'\u001e'+id,[name,e.keys]);}
  for(const [name,keys]of ctx.touched.values()){
   const t=this.tables.get(name),id=keys.join('\u001f'),row=connection.tables.get(name).read.get(...keys)??null,e=t.records.get(id);
   if(!e&&!row)continue;
   if(e&&same(e.current,row,t.spec.fields)){e.base=row;e.current=row;e.written=e.generation;e.version=++this.serial;}
   else {t.records.set(id,{base:row,current:row,keys,generation:0,written:0,changedAt:this.now(),version:++this.serial});this.dirty.delete(name+'\u001e'+id);if(name==='monster_participants')this.indexPending(id,{keys,dirtyAt:0});}t.recent.add(id);
   if(row)t.put.run(...t.spec.columns.map(c=>row[c]));else t.remove.run(...keys);
  }
  if(ctx.touched.size)this.publish([...ctx.touched.values()].map(([name,keys])=>({name,id:keys.join('\u001f')})));
  return saved.length?{saved,started:ctx.started}:null;
 }
 durable(batch,promise){if(!batch)return;
  const done=()=>{for(const {name,id,e,generation}of batch.saved){if(this.tables.get(name).records.get(id)!==e)continue;e.pending=(e.pending??[]).filter(([g])=>g>generation);if(e.generation===generation){this.dirty.delete(name+'\u001e'+id);delete e.dirtyAt;if(name==='monster_participants')this.indexPending(id,e);}else if(e.pending.length){e.dirtyAt=e.pending[0][1];this.dirty.refresh(name+'\u001e'+id);}}this.publish(batch.saved);const ms=performance.now()-batch.started;this.stats.flushes++;this.stats.lastFlushMs=ms;this.stats.maxFlushMs=Math.max(ms,this.stats.maxFlushMs);reportRuntimeWork('combat_flush',ms,performance.timeOrigin+batch.started);};
  if(promise)promise.then(done,()=>{this.stats.errors++;for(const {e}of batch.saved)e.written=-1;});else done();
 }
 start(flush){if(!this.enabled)return;this.timer=setInterval(()=>{if(this.flushing||![...this.dirty.values()].some(({e})=>e.generation!==e.written))return;this.flushing=Promise.resolve().then(flush).catch(()=>this.stats.errors++).finally(()=>this.flushing=null);},1000);this.timer.unref();}
 stop(){this.accepting=false;clearInterval(this.timer);this.positionChangesCursor?.close();}
 mergeRows(rows,{enteredAtMs=Infinity}={}){return rows.flatMap(row=>{
  if(!Object.hasOwn(row,'hp')||!row.id)return [row];const table=Object.hasOwn(row,'spawn_round')?'monsters':Object.hasOwn(row,'hp_revision')?'players':null;if(!table)return [row];
  const e=this.entry(table,row.id),p=e?.current;if(!p)return [row];
  const scopeChanged=table==='monsters'?row.spawn_round!==p.spawn_round:['area','channel','arena_match_id'].some(k=>Object.hasOwn(row,k)&&row[k]!==p[k]);
  if(scopeChanged)return e.changedAt>=enteredAtMs?[]:[row];
  if(table==='players'&&row.hp_revision>p.hp_revision)return [row];
  if(row.hp!==p.hp&&row.hp!==e.base?.hp&&!(table==='players'&&row.hp_revision<p.hp_revision)&&!(table==='monsters'&&row.last_damaged_at_ms<p.last_damaged_at_ms))return [row];
  for(const field of COMBAT_TABLES[table].fields)if(Object.hasOwn(row,field))row[field]=p[field];return [row];
 });}
 snapshot(){return {enabled:this.enabled,revision:3,projection:{...this.projections.stats},...this.flushMetrics.snapshot(),...Object.fromEntries(Object.entries(this.stats).map(([k,v])=>[k,k.endsWith('Ms')?Math.round(v*100)/100:v]))};}
}
class DurableRequired extends Error{}

export function attachCombatStore(database,store,{externalDurability=false,readOnly=false}={}){
 if(!store?.enabled)return null;
 const prepare=database.prepare.bind(database),exec=database.exec.bind(database);
 const rawPrepare=database.positionRawPrepare??prepare,rawExec=database.positionRawExec??exec;
 database.function('col_combat_value',{varargs:true},(...args)=>store.value(...args));
 const tables=new Map(),pending=[];let context=null,refreshVersion=-1;
 for(const [name,definition]of Object.entries(COMBAT_TABLES)){
  const columns=prepare(`PRAGMA main.table_info(${name})`).all().map(c=>c.name),spec={...definition,columns,fields:definition.fields??columns};
  const where=spec.keys.map(k=>quote(k)+'=?').join(' AND '),read=prepare(`SELECT * FROM main.${name} WHERE ${where}`);
  if(definition.fields){
   const source=name==='players'&&store.positions?.enabled?'temp.col_live_players':`main.${name}`;
   const fields=columns.map(c=>name==='players'&&c==='last_seen'?`MAX(p.last_seen,CAST(col_combat_value('players','last_monster_hit_at',p.id,p.hp,p.hp_revision,p.realtime_scope_version,p.area,p.channel,p.last_monster_hit_at)/1000 AS INTEGER)) AS last_seen`:definition.fields.includes(c)?`col_combat_value('${name}','${c}',p.id,p.hp,${name==='players'?'p.hp_revision,p.realtime_scope_version,p.area,p.channel':'p.spawn_round,p.last_damaged_at_ms,p.area,p.channel'},p.${quote(c)}) AS ${quote(c)}`:`p.${quote(c)}`);
   exec(`CREATE TEMP VIEW col_combat_${name} AS SELECT ${fields.join(',')} FROM ${source} p`);
  }else{
   exec(`CREATE TEMP TABLE col_combat_delta_${name} AS SELECT * FROM main.${name} WHERE 0; CREATE UNIQUE INDEX col_combat_key_${name} ON col_combat_delta_${name}(${spec.keys.map(quote).join(',')});CREATE TEMP TABLE col_combat_deleted_${name}(${spec.keys.map(k=>quote(k)+' NOT NULL').join(',')},PRIMARY KEY(${spec.keys.map(quote).join(',')}));`);
   if(name==='combat_events')exec('CREATE INDEX col_combat_events_time ON col_combat_delta_combat_events(created_at)');
   if(name==='pve_engagements')exec('CREATE INDEX col_combat_engagement_monster ON col_combat_delta_pve_engagements(monster_id)');
   const matches=alias=>spec.keys.map(k=>`${alias}.${quote(k)}=p.${quote(k)}`).join(' AND ');
   exec(`CREATE TEMP VIEW col_combat_${name} AS SELECT p.* FROM main.${name} p WHERE NOT EXISTS(SELECT 1 FROM col_combat_delta_${name} d WHERE ${matches('d')}) AND NOT EXISTS(SELECT 1 FROM col_combat_deleted_${name} d WHERE ${matches('d')}) UNION ALL SELECT * FROM col_combat_delta_${name}`);
  }
  tables.set(name,{spec,read,writer:dirtyWriter(prepare,{table:'main.'+name,keys:spec.keys,fields:spec.fields,columns,insert:!definition.fields}),
   delta:definition.fields?null:rawPrepare(`INSERT OR REPLACE INTO temp.col_combat_delta_${name} VALUES(${columns.map(()=>'?').join(',')})`),
   deleted:definition.fields?null:rawPrepare(`INSERT OR IGNORE INTO temp.col_combat_deleted_${name} VALUES(${spec.keys.map(()=>'?').join(',')})`),
   deltaRemove:definition.fields?null:rawPrepare(`DELETE FROM temp.col_combat_delta_${name} WHERE ${where}`),
   deletedRemove:definition.fields?null:rawPrepare(`DELETE FROM temp.col_combat_deleted_${name} WHERE ${where}`),seen:new Map()});
 }
 const presencePut=rawPrepare("INSERT OR REPLACE INTO temp.col_memory_presence VALUES(?,'combat',?)"),presenceRemove=rawPrepare("DELETE FROM temp.col_memory_presence WHERE id=? AND source='combat'"),presenceKnown=new Map();
 const refreshRow=(name,id)=>{
  const c=tables.get(name),e=store.tables.get(name)?.records.get(id);
  if(name==='players'){
   const stamp=e?.current?Math.floor(e.current.last_monster_hit_at/1000):null;
   if(stamp===null){if(presenceKnown.delete(id))presenceRemove.run(id);}
   else if(presenceKnown.get(id)!==stamp){presencePut.run(id,stamp);presenceKnown.set(id,stamp);}
  }
  if(!c?.delta)return;
  const active=e&&(readOnly||e.dirtyAt)&&(e.dirtyAt||e.changedAt>store.now()-30000);
  if(!active){const old=c.seen.get(id);if(old){c.deltaRemove.run(...old.keys);c.deletedRemove.run(...old.keys);c.seen.delete(id);}return;}
  if(c.seen.get(id)?.version===e.version)return;
  if(e.current){c.deletedRemove.run(...e.keys);c.delta.run(...c.spec.columns.map(k=>e.current[k]));}
  else{c.deltaRemove.run(...e.keys);c.deleted.run(...e.keys);}
  c.seen.set(id,{version:e.version,keys:e.keys});
 };
 const refresh=changes=>{
  if(refreshVersion===store.version)return;
  const changed=changes??(readOnly?store.changedRecords:null);
  if(changed){for(const {name,id}of changed)refreshRow(name,id);}
  else for(const [name,c]of tables){
   const t=store.tables.get(name);
   const ids=name==='monster_participants'&&!readOnly?[...store.pendingByMonster.values()].flatMap(rows=>[...rows.keys()]):t?.recent??[];
   const active=new Set(ids);for(const id of c.seen.keys())active.add(id);
   if(name==='players')for(const id of presenceKnown.keys())active.add(id);
   for(const id of active)refreshRow(name,id);
  }
  refreshVersion=store.version;
 };
 const replica={refresh};store.replicas?.add(replica);refresh();
 // A closed SQLite connection must no longer receive in-memory projections.
 // Remove only after a successful close; a failed close still owns its views.
 const close=database.close.bind(database);
 database.close=()=>{const result=close();store.replicas?.delete(replica);return result;};
 if(!readOnly){
  database.function('col_combat_changed',{varargs:true},(name,important,...keys)=>{
   if(important||store.tables.get(name)?.records.has(keys.join('\u001f')))context?.touched.set(name+'\u001e'+keys.join('\u001f'),[name,keys]);return 0;
  });
  for(const [name,{spec}]of tables){
   const watch=spec.fields===spec.columns?spec.columns:[...spec.fields,...(name==='players'?['area','channel','arena_match_id','realtime_scope_version']:['spawn_round','area','channel'])].filter(c=>spec.columns.includes(c));
   const important=name==='monsters'?['hp','spawn_round','area','channel'].filter(c=>spec.columns.includes(c)):watch;
   for(const [op,ref]of [['INSERT','NEW'],['UPDATE','NEW'],['DELETE','OLD']]){
    const changed=watch.map(k=>`NEW.${quote(k)} IS NOT OLD.${quote(k)}`).join(' OR ');
    const meaningful=important.map(k=>`NEW.${quote(k)} IS NOT OLD.${quote(k)}`).join(' OR ');
    exec(`CREATE TEMP TRIGGER col_combat_${name}_${op} AFTER ${op}${op==='UPDATE'?' OF '+watch.map(quote).join(','):''} ON main.${name}${op==='UPDATE'?' WHEN '+changed:''} BEGIN SELECT col_combat_changed('${name}',${op==='UPDATE'?'('+meaningful+')':'1'},${spec.keys.map(k=>ref+'.'+quote(k)).join(',')}); END;`);
   }
  }
  database.exec=sql=>{
   if(/^\s*BEGIN\s+(?:IMMEDIATE|EXCLUSIVE)\b/i.test(sql)){context={touched:new Map(),staged:[],started:performance.now()};const result=exec(sql);try{context.staged=store.stage({tables});return result;}catch(error){exec('ROLLBACK');context=null;throw error;}}
   if(/^\s*(?:COMMIT|END)\b/i.test(sql)){const at=performance.now(),result=exec(sql),commitMs=performance.now()-at;const ctx=context;context=null;if(ctx){const refreshAt=performance.now(),batch=store.committed({tables},ctx);const touched={};for(const [name]of ctx.touched.values())touched[name]=(touched[name]??0)+1;store.flushMetrics.finish(ctx.staged.metrics??store.flushMetrics.begin(),{commitMs,refreshMs:performance.now()-refreshAt,touched});if(externalDurability)pending.push(batch);else store.durable(batch,null);}return result;}
   if(/^\s*ROLLBACK\b(?!\s+TO)/i.test(sql)){const result=exec(sql);context=null;return result;}
   return exec(sql);
  };
 }
 database.prepare=sql=>{
  const rewritten=combatReadSql(sql),normal=prepare(sql);if(rewritten===sql)return normal;
  const projected=prepare(rewritten);
  for(const method of ['all','get','run']){const original=normal[method].bind(normal),live=projected[method].bind(projected);normal[method]=(...args)=>!readOnly&&context?original(...args):live(...args);}
  return normal;
 };
 const layer={store,refresh,confirmDurable:promise=>{for(const batch of pending.splice(0))store.durable(batch,promise);}};database.combatLayer=layer;return layer;
}

export function combatReplica(positions){return {enabled:true,positions,tables:new Map(),version:-1,now:Date.now,entry:CombatStore.prototype.entry,value:CombatStore.prototype.value,
 set(projection){
  this.changedRecords=[];
  if(!projection?.delta){for(const [name,t]of this.tables)for(const id of t.records.keys())this.changedRecords.push({name,id});this.tables.clear();}
  for(const [name,changes]of Object.entries(projection?.tables??{})){
   let table=this.tables.get(name);if(!table)this.tables.set(name,table={recent:new Set(),records:new Map()});
   for(const id of changes.removed??[]){table.recent.delete(id);table.records.delete(id);this.changedRecords.push({name,id});}
   for(const [id,e]of changes.entries){table.recent.add(id);table.records.set(id,{...e,generation:1,dirtyAt:1});this.changedRecords.push({name,id});}
  }this.version=projection?.version??-1;
 }};}
