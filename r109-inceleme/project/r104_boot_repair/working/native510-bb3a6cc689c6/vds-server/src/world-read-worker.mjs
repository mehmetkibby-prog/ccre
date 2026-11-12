// Dedicated SQLite reader: world snapshots share a WAL transaction while the
// HTTP/combat thread continues handling sockets and authoritative writes.
import {attachPositionStore,positionReplica,positionReadSql} from './position-store.mjs';
import {attachCombatStore,combatReplica,combatReadSql} from './combat-store.mjs';
import { parentPort, workerData } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import {createWorldPlayerProjector} from './world-player-projection.mjs';
import {isSnapshotSharedQuery} from './world-shared-query.mjs';

const database = new DatabaseSync(workerData.databasePath, { readOnly: true });
const positions=workerData.memoryPositions?positionReplica():null;
if(positions)attachPositionStore(database,positions,{readOnly:true});
const combat=workerData.memoryCombat?combatReplica(positions):null;
const combatLayer=combat?attachCombatStore(database,combat,{readOnly:true}):null;
database.exec('PRAGMA query_only=ON; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=250; PRAGMA cache_size=-16384');
if (database.prepare('PRAGMA journal_mode').get().journal_mode !== 'wal') throw new Error('World reader requires WAL mode');
const schemaStatement = database.prepare('PRAGMA schema_version');
let schemaVersion = schemaStatement.get().schema_version;
const statements = new Map();
const positionQueries = new Set();
const combatQueries = new Set();
let cacheBytes = 0;
function compiled(sql) {
  const cached = statements.get(sql);
  if (cached) { statements.delete(sql); statements.set(sql, cached); return cached; }
  const prepared = database.prepare(sql), bytes = sql.length * 2;
  if (bytes > 131072) return prepared;
  while (statements.size >= 128 || cacheBytes + bytes > 524288) {
    const oldest = statements.keys().next().value;
    statements.delete(oldest); positionQueries.delete(oldest);combatQueries.delete(oldest); cacheBytes -= oldest.length * 2;
  }
  if(positions&&positionReadSql(sql)!==sql)positionQueries.add(sql);
  if(combat&&combatReadSql(sql)!==sql)combatQueries.add(sql);
  statements.set(sql, prepared); cacheBytes += bytes;
  return prepared;
}
// Cache lives only for this small group and is discarded at COMMIT. It never
// hides a later write, authorization change, or a maintenance fence.
let sharedRows = null, sharedHits = 0, rosterHits = 0;
function sharedRead(sql, params) {
  if(params.some(p=>p!==null&&typeof p!=='string'&&!(typeof p==='number'&&Number.isFinite(p))))return compiled(sql).all(...params);
  const key=JSON.stringify([sql,params]);
  const cached=sharedRows.get(key);
  if(cached&&(cached.positionVersion===null||cached.positionVersion===positions?.version)&&(cached.combatVersion===null||cached.combatVersion===combat?.version)){sharedHits++;return cached.rows;}
  const rows=compiled(sql).all(...params);
  sharedRows.set(key,{rows,positionVersion:positionQueries.has(sql)?positions.version:null,combatVersion:combatQueries.has(sql)?combat.version:null});return rows;
}
const projectPlayers=createWorldPlayerProjector(sharedRead);
const validSql=new Set();
const selectOnly=sql=>{if(validSql.has(sql))return true;const ok=/^\s*SELECT\b/i.test(sql)&&!/\b(?:changes|last_insert_rowid)\s*\(/i.test(sql);if(ok){if(validSql.size>=512)validSql.clear();validSql.add(sql);}return ok;};
function validate(batch, projection) {
  if (!Array.isArray(batch) || !batch.length || batch.length > 64 || batch.some(item =>
    !item || typeof item.sql !== 'string' || !Array.isArray(item.params) || !selectOnly(item.sql))) {
    throw new Error('World reader accepts only independent SELECT snapshots');
  }
  if(projection && (!Number.isInteger(projection.playersIndex)||projection.playersIndex<0||projection.playersIndex>=batch.length||typeof projection.ownerId!=='string')) throw new Error('Invalid world player projection');
}
function roomRead(sql, params, projection, snapshotAtMs) {
  const markers=['WHERE (p.last_seen >= ? OR p.id = ?)',
    'AND (p.is_gm != 1 OR p.gm_invisible != 1 OR p.id = ?)',
    'p.arena_match_id = (SELECT arena_match_id FROM players WHERE id = ?)'];
  if(!projection?.roomRoster || params.length!==6 || !sql.includes('WITH visible_players AS MATERIALIZED') ||
     markers.some(marker=>!sql.includes(marker)) || [params[1],params[4],params[5]].some(id=>id!==projection.ownerId)) return compiled(sql).all(...params);
  // Eligibility is checked INSIDE the same WAL snapshot. Hidden/inactive owners
  // keep the original private exceptions; moved owners keep original semantics.
  const owner=compiled('SELECT last_seen,is_gm,gm_invisible,channel,area,arena_match_id FROM players WHERE id=?').get(projection.ownerId);
  if(!owner || owner.last_seen<params[0] || owner.is_gm===1&&owner.gm_invisible===1 || owner.channel!==params[2] || owner.area!==params[3]) return compiled(sql).all(...params);
  const publicSql=sql.replace(markers[0],'WHERE p.last_seen >= ?')
    .replace(markers[1],'AND (p.is_gm != 1 OR p.gm_invisible != 1)')
    .replace(markers[2],'p.arena_match_id = ?')
    .replaceAll('unixepoch()',String(Math.floor(snapshotAtMs/1000)));
  const before=sharedHits,rows=sharedRead(publicSql,[params[0],params[2],params[3],owner.arena_match_id]);
  if(sharedHits>before)rosterHits++;
  return rows;
}
function readBatch(batch, projection, snapshotAtMs) {
  const before=sharedHits,rostersBefore=rosterHits;
  const results=batch.map(({sql,params},index)=>{
    const started=performance.now();
    const rows=projection?.playersIndex===index?roomRead(sql,params,projection,snapshotAtMs):
      isSnapshotSharedQuery(sql)?sharedRead(sql,params):compiled(sql).all(...params);
    // SQLite owns these fresh rows; copying every monster/player field here
    // allocated another whole snapshot before postMessage copied it again.
    // Normalize in place, as the main connection does. Shared roster rows only
    // receive this representation normalization; owner projection below creates
    // separate objects, and every postMessage independently clones its reply.
    for(const row of rows){
      for(const name in row)if(row[name] instanceof Uint8Array)row[name]=Array.from(row[name]);
      Object.setPrototypeOf(row,Object.prototype);
    }
    return {results:rows,success:true,meta:{duration:performance.now()-started,served_by:'vds-sqlite-reader',rows_read:rows.length,rows_written:0,changes:0,last_row_id:0,changed_db:false,size_after:0}};
  });
  if(projection)results[projection.playersIndex].results=projectPlayers(results[projection.playersIndex].results,projection.ownerId,snapshotAtMs);
  return {results,snapshotAtMs,playersProjected:Boolean(projection),sharedQueries:sharedHits-before,rosterQueriesSaved:rosterHits-rostersBefore};
}
const queue=[];let scheduled=false;
function schedule(){if(scheduled||!queue.length)return;scheduled=true;setImmediate(drain);}
function drain(){
  scheduled=false;
  const replies=[],snapshotAtMs=Date.now(),deadline=performance.now()+8;
  sharedRows=new Map();sharedHits=0;rosterHits=0;
  try {
    database.exec('BEGIN DEFERRED');
    const currentSchema=schemaStatement.get().schema_version;
    if(currentSchema!==schemaVersion){
      database.prepare('SELECT name FROM sqlite_schema LIMIT 1').all();
      statements.clear();positionQueries.clear();combatQueries.clear();cacheBytes=0;schemaVersion=currentSchema;
    }
    do {
      const {id,statements:batch,projection,positions:projectionPositions,combat:projectionCombat}=queue.shift(),started=performance.now();
      // Position-dependent rows carry their projection version. An ordinary
      // move must not discard unchanged monsters/settings/equipment from this
      // same WAL snapshot; those rows still expire together at COMMIT below.
      if(positions)positions.set(projectionPositions);
      if(combat)combat.set(projectionCombat);
      if(positions||combat){database.exec('PRAGMA query_only=OFF');try{database.positionPresenceRefresh?.();combatLayer?.refresh();}finally{database.exec('PRAGMA query_only=ON');}}
      try {validate(batch,projection);replies.push({id,...readBatch(batch,projection,snapshotAtMs),executionMs:performance.now()-started});}
      catch(error){replies.push({id,error:String(error?.message||error),executionMs:performance.now()-started});}
    }while(queue.length&&replies.length<4&&performance.now()<deadline);
    database.exec('COMMIT');
  }catch(error){
    if(database.isTransaction)database.exec('ROLLBACK');
    if(!replies.length&&queue.length)replies.push({id:queue.shift().id});
    for(const reply of replies){delete reply.results;reply.error=String(error?.message||error);}
  }finally{sharedRows=null;}
  for(const reply of replies){reply.executionMs=Date.now()-snapshotAtMs;parentPort.postMessage(reply);}
  schedule();
}
// SQL text is sent once per statement shape; later tasks carry only its id
// (world-read-pool.mjs). Resolution happens on arrival, so a queued task always
// holds complete {sql, params} items and validation is unchanged.
const sqlById=new Map();
parentPort.on('message',task=>{
  if(task?.forgetSql){sqlById.clear();return;}
  if(Array.isArray(task?.statements))task.statements=task.statements.map(item=>{
    if(!item||typeof item!=='object'||!Number.isInteger(item.i))return item;
    if(typeof item.sql==='string')sqlById.set(item.i,item.sql);
    return {sql:sqlById.get(item.i),params:item.params};
  });
  queue.push(task);schedule();
});
parentPort.postMessage({ready:true});
