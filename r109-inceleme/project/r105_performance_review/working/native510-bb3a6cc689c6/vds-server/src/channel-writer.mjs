import {perfR13Features} from './perf-r13-features.mjs';
import {parseRewardGroupsR13,supportedRewardSchemaR13} from './reward-batch-r7.mjs';
import {prepareCached477} from './prepared-statements477.mjs';
// The recognizer accepts the pinned, exact ordinary-monster reward SQL only.
// This does not memoize economy state. Re-read locked HP immediately after a
// zero-change defeat INSERT, after earlier targets and their triggers complete.
export function createNonlethalRewardExecutorR13(db,frames,observers){
 if(!perfR13Features.enabled('nonlethalRewardElision')||!db.isTransaction)return null;
 const parsed=parseRewardGroupsR13(frames);if(!parsed)return null;
 let schemaSupported=null;
 const entries=new Map();for(const group of parsed.groups){for(let index=1;index<=6;index++)entries.set(group.rows[index],{group,index});if(group.cauldron488)entries.set(group.cauldron488,{group,index:4.5});if(group.forge491)entries.set(group.forge491,{group,index:4.5});}
 let active=null;
 return function execute(frame,ordinary){
  const entry=entries.get(frame);
  if(!entry){active=null;return ordinary(frame);}
  const {group,index}=entry;
  // With the existing exact nonlethal proof there can be no new XP claim.
  // The strict ingredient statement would return no rows and must not issue
  // a new SQL query/RNG draw on intermediate attacks. Preserve next=5.
  if(index===4.5){if(active&&active.group===group&&active.next===5&&db.isTransaction)return {...active.zero,results:[],meta:{...active.zero.meta,duration:0,rows_read:0,rows_written:0,changed_db:false}};active=null;return ordinary(frame);}
  if(index===1){
   active=null;
   const result=ordinary(frame);
   if(result?.success!==true||result.results?.length!==0||result.meta?.changes!==0||!Number.isFinite(result.meta.last_row_id))return result;
   schemaSupported??=supportedRewardSchemaR13(db,observers);if(!schemaSupported)return result;
   const row=prepareCached477(db,`SELECT hp,spawn_round,is_boss,is_stone,area,
    EXISTS(SELECT 1 FROM monster_xp_claims WHERE claim_token=?) AS used_token
    FROM monsters WHERE id=?`).get(group.token,group.id);
   // Unknown/missing/dead/stale/special targets and reused claim tokens retain
   // the complete old sequence. No result is inferred from channel memory.
   const eligible=row&&Number.isFinite(row.hp)&&row.hp>group.damage&&row.spawn_round===group.round&&!row.is_boss&&!row.is_stone&&!row.used_token&&['forest','frozen','black','ancient','rune','afk','sinsi'].includes(row.area)&&! /^(?:frozen-(?:boss|water)|ancient-boss|dragon-world|stone-boss-black|dunya-bosu)/.test(group.id);
   // Execute the actual defeat INSERT even on this path: its zero-change
   // metadata preserves SQLite changes()/last_insert_rowid() for later SQL.
   if(eligible)active={group,next:2,zero:result};
   return result;
  }
  if(!active||active.group!==group||active.next!==index||!db.isTransaction){active=null;return ordinary(frame);}
  active.next++;
  // Preserve the exact pre-XP rows; the pure pinned SELECT has no side effects.
  if(index===2)return ordinary(frame);
  const result={...active.zero,results:[],meta:{...active.zero.meta,duration:0,rows_read:0,rows_written:0,changed_db:false}};
  if(index===6)active=null;
  return result;
 };
}

import {prepareRewardBatchR7} from './reward-batch-r7.mjs';
import {WriterRewardMetricsR10} from './writer-reward-metrics-r10.mjs';
import {randomUUID} from 'node:crypto';
import {WriterSqlPopulationMetrics477,verifiedWriterPopulation477} from './writer-sql-population477.mjs';
import {LoadLabWriterGuard,ensureLoadLabWriterSchema} from './loadlab-writer.mjs';
import {COMBAT_TABLES} from './combat-store.mjs';
import {POSITION_FIELDS} from './position-store.mjs';
import {requestDigest, channelError, MAX_CHANNEL_BYTES} from './channel-protocol.mjs';
import {WORLD_PUSH_TABLES,WORLD_PUSH_VOLATILE_PLAYER} from './world-push.mjs';
import {verifySharedLease} from './channel-shared-authority.mjs';
import {replayNativePlan} from './channel-native-plan.mjs';
import {withWriterSqlPhase477,recordWriterJobDetail477} from './writer-sql-timing477.mjs';

const quote = value => '"' + value.replaceAll('"', '""') + '"';
const ALLOWED = new Set(['position', ...Object.keys(COMBAT_TABLES)]);
let perfEpoch477=-1,perfLogs477=0,perfDropped477=0;
function logWriter477(event){const minute=Math.floor(Date.now()/60000);if(minute!==perfEpoch477){perfEpoch477=minute;perfLogs477=0;}if(perfLogs477>=20){perfDropped477++;return;}perfLogs477++;try{console.info('native_writer_timing',JSON.stringify({...event,droppedEvents:perfDropped477,droppedScope:'process-lifetime'}));}catch{}}

// Only the private, authenticated child IPC exposes this service. Browser input
// never supplies SQL. The existing game route builds the statements in the child.
// There is no simulation state, timer, world projection or player tick here.
export class ChannelWriter {
  constructor(database, authority, {sharedSecret,nativeOperations} = {}) {
    this.sharedSecret=sharedSecret;
    this.nativeOperations=nativeOperations;
    this.database = database;
    database.writerSqlPopulation477??=new WriterSqlPopulationMetrics477({generation:randomUUID()});
    database.writerRewardMetricsR10??=new WriterRewardMetricsR10({generation:randomUUID()});
    this.loadlab=new LoadLabWriterGuard(database);
    this.authority = authority;
    this.tables = new Map();
    this.stats = {transactions: 0, replays: 0, deltaRows: 0, rejected: 0};
    this.changed = null;
    this.deltaScopeReads477 = null;
    this.notifications=new Map();
    const raw = database.sqlite.prepare.bind(database.sqlite);
    for (const name of ['players', ...Object.keys(COMBAT_TABLES).filter(n => n !== 'players')]) {
      const columns = raw(`PRAGMA main.table_info(${quote(name)})`).all().map(c => c.name);
      this.tables.set(name, {columns, columnSet503: new Set(columns), keys: COMBAT_TABLES[name].keys});
    }
    const nativeTables=raw("SELECT name FROM main.sqlite_schema WHERE type='table' AND (name GLOB 'dungeon_*' OR name GLOB 'solo_*')").all().map(r=>r.name);
    for(const name of new Set([...Object.keys(COMBAT_TABLES),...WORLD_PUSH_TABLES,'pve_engagements','dungeon_settings','progression_settings','quest_settings438','battle_pass_settings','status_settings','rune_settings','rune_v2_settings','arena_market_settings','arena_market_receipts','event_island_settings444','event_island_monsters444','event_island_receipts444','event_island_defeats444','starter_admin_grants','expansion456_receipts','broken_core_state464','broken_core_settings464',...nativeTables])){
      const info=raw(`PRAGMA main.table_info(${quote(name)})`).all();if(!info.length)continue;
      const columns=info.map(c=>c.name),primary=info.filter(c=>c.pk).sort((a,b)=>a.pk-b.pk).map(c=>c.name);
      const keys=COMBAT_TABLES[name]?.keys??(primary.length?primary:[columns.includes('player_id')?'player_id':columns[0]]);
      const id=columns.includes('id')?'id':columns.includes('player_id')?'player_id':columns[0];
      const owner=columns.includes('owner_id')?'owner_id':columns.includes('player_id')?'player_id':name==='players'?'id':null;
      this.notifications.set(name,{columns,keys,id,owner,peer:columns.includes('recipient_id')?'recipient_id':name==='player_friends487'?'friend_id':null});
    }
  }
  async initialize() {
    await this.database.atomic(db => db.exec(`
      CREATE TABLE IF NOT EXISTS channel_write_streams (
        channel INTEGER NOT NULL, incarnation TEXT NOT NULL, sequence INTEGER NOT NULL,
        PRIMARY KEY(channel,incarnation));
      CREATE TABLE IF NOT EXISTS channel_write_receipts (
        channel INTEGER NOT NULL, incarnation TEXT NOT NULL, sequence INTEGER NOT NULL,
        digest TEXT NOT NULL, response TEXT NOT NULL, created_ms INTEGER NOT NULL,
        PRIMARY KEY(channel,incarnation,sequence));
      CREATE INDEX IF NOT EXISTS channel_write_receipt_expiry ON channel_write_receipts(created_ms);
      CREATE TABLE IF NOT EXISTS channel_event_ranges (
        channel INTEGER NOT NULL, incarnation TEXT NOT NULL,
        top INTEGER NOT NULL, bottom INTEGER NOT NULL,
        PRIMARY KEY(channel,incarnation));
    `));
    await this.database.atomic(db=>ensureLoadLabWriterSchema(db));
    const sqlite = this.database.sqlite;
    sqlite.function('col_channel_writer_changed', {varargs: true}, (table,id,owner,peer,staticChanged,...keys) => {
      // No scope row survives a monster write, including a nested trigger.
      // Clear the small pass-local map rather than guessing OLD ids on rename.
      if(table==='monsters')this.deltaScopeReads477?.monsters.clear();
      if(this.nativeScopedIds&&owner&&!this.nativeScopedIds.has(owner))this.nativeScopeViolation=true;
      const key=table+'\u001e'+JSON.stringify(keys),old=this.changed?.get(key);
      this.changed?.set(key, {table,keys,id,owner,peer,staticChanged:staticChanged||old?.staticChanged||''});
      return 0;
    });
    for (const [table, {keys,columns,id,owner,peer}] of this.notifications) for (const [operation, ref] of [['INSERT','NEW'],['UPDATE','NEW'],['DELETE','OLD']]) {
      const fields=columns.filter(c=>!WORLD_PUSH_VOLATILE_PLAYER.includes(c));
      const staticChanged=table==='players'&&operation==='UPDATE'?(fields.length?`CASE ${fields.map(c=>`WHEN OLD.${quote(c)} IS NOT NEW.${quote(c)} THEN '${c}'`).join(' ')} ELSE '' END`:"''"):'1';
      sqlite.exec(`CREATE TEMP TRIGGER col_writer_${table}_${operation} AFTER ${operation} ON main.${quote(table)} BEGIN SELECT col_channel_writer_changed('${table}',${ref}.${quote(id)},${owner?`${ref}.${quote(owner)}`:'NULL'},${peer?`${ref}.${quote(peer)}`:'NULL'},${staticChanged},${keys.map(k => `${ref}.${quote(k)}`).join(',')}); END;`);
    }
    this.loadlab.install();
    return this;
  }
  reserveEvents(peer, size = 1_000_000_000) {
    if (!Number.isSafeInteger(size) || size < 1 || size > 1_000_000_000) return Promise.reject(channelError('invalid_event_reservation'));
    return this.database.atomic(db => {
      this.authority.assertProcess(peer.channel, peer.incarnation, db);
      const previous = this.database.compiled('SELECT top,bottom FROM channel_event_ranges WHERE channel=? AND incarnation=?').get(peer.channel, peer.incarnation);
      if (previous) return previous;
      // Reserve below BOTH all earlier reservations and the legacy negative
      // IDs. A restart never reuses an unflushed incarnation's event numbers.
      const top = Math.min(0,
        this.database.compiled('SELECT MIN(id) AS n FROM main.combat_events').get().n ?? 0,
        this.database.compiled('SELECT MIN(bottom) AS n FROM channel_event_ranges').get().n ?? 0);
      const bottom = top - size;
      if (!Number.isSafeInteger(bottom)) throw channelError('event_range_exhausted');
      this.database.compiled('INSERT INTO channel_event_ranges VALUES(?,?,?,?)').run(peer.channel, peer.incarnation, top, bottom);
      return {top,bottom};
    });
  }
  pruneReceipts(beforeMs, limit = 32, {maxBatches = 1} = {}) {
    if (!Number.isSafeInteger(beforeMs) || !Number.isInteger(limit) || limit < 1 || limit > 128
      || !Number.isInteger(maxBatches) || maxBatches < 1 || maxBatches > 128) return Promise.reject(channelError('invalid_receipt_prune'));
    // The stream sequence is retained forever, so an expired reply can never
    // turn a duplicate command into a new reward or currency mutation.
    if (this.receiptPrune) return this.receiptPrune;
    const job = (async () => {
      // An indexed due check avoids an empty write transaction each minute.
      if (!this.database.compiled('SELECT 1 FROM channel_write_receipts WHERE created_ms<? LIMIT 1').get(beforeMs)) return {changes: 0};
      let changes = 0, batchSize = limit;
      for (let batch = 0; batch < maxBatches; batch++) {
        let batchMs;
        const result = await this.database.atomic(() => {
          const started = performance.now();
          const removed = this.database.compiled(`DELETE FROM channel_write_receipts WHERE rowid IN
            (SELECT rowid FROM channel_write_receipts WHERE created_ms<? ORDER BY created_ms LIMIT ?)`).run(beforeMs, batchSize);
          batchMs = performance.now() - started;
          return removed;
        });
        changes += Number(result.changes);
        if (result.changes < batchSize) break;
        // Each batch keeps the existing durable writer/ACK boundary. Give HTTP
        // and combat a turn between batches; slow storage reduces the next slice.
        if (batchMs > 2 && batchSize > 16) batchSize = Math.max(16, Math.floor(batchSize / 2));
        if (batch + 1 < maxBatches) await new Promise(resolve => setImmediate(resolve));
      }
      return {changes};
    })();
    this.receiptPrune = job;
    void job.finally(() => { if (this.receiptPrune === job) this.receiptPrune = null; }).catch(() => {});
    return job;
  }
  deltaMonsterScope477(id) {
    const cache=this.deltaScopeReads477?.monsters;
    if(cache?.has(id))return cache.get(id);
    const row=this.database.compiled('SELECT channel,spawn_round FROM main.monsters WHERE id=?').get(id);
    cache?.set(id,row);return row;
  }
  applyDelta(db, peer, delta, owners, shared = false) {
    if (!ALLOWED.has(delta.table)) throw channelError('invalid_memory_table');
    const name = delta.table === 'position' ? 'players' : delta.table;
    const schema = this.tables.get(name), keys = schema.keys;
    if (!Array.isArray(delta.keys) || delta.keys.length !== keys.length) throw channelError('invalid_memory_keys');
    const definition = delta.table === 'position' ? {fields: POSITION_FIELDS} : COMBAT_TABLES[name];
    const fields = definition.fields ?? schema.columns.filter(c => !keys.includes(c));
    const before = delta.before, after = delta.after;
    const row = after ?? before;
    if (!row || typeof row !== 'object') throw channelError('invalid_memory_delta');
    for (const value of [before, after]) if (value) {
      for (const key of Object.keys(value)) if (!schema.columnSet503.has(key)) throw channelError('invalid_memory_column');
      for (let i = 0; i < keys.length; i++) if (value[keys[i]] !== undefined && value[keys[i]] !== delta.keys[i]) throw channelError('memory_key_changed');
    }
    const id = delta.keys[0];
    if (name === 'players' || name === 'pve_engagements') {
      if (!owners.has(id)) throw channelError('memory_owner_missing');
    } else if (name === 'monsters') {
      const monster = this.deltaMonsterScope477(id);
      if (!monster || monster.channel !== peer.channel && !(monster.channel === 0 && (shared || !this.sharedSecret && peer.channel === 1))) throw channelError('monster_channel_fenced');
      if (before?.spawn_round !== monster.spawn_round) throw channelError('monster_round_fenced');
    } else if (name === 'monster_participants' || name === 'boss_participants') {
      const playerId = row.player_id;
      if (!owners.has(playerId) && !shared) throw channelError('memory_owner_missing');
      if (name === 'monster_participants') {
        const monster = this.deltaMonsterScope477(row.monster_id);
        if (!monster || monster.spawn_round !== row.spawn_round || monster.channel !== peer.channel && !(monster.channel === 0 && (shared || !this.sharedSecret && peer.channel === 1))) throw channelError('participant_scope_fenced');
        if(monster.channel!==0&&!owners.has(playerId))throw channelError('memory_owner_missing');
      } else if (!shared && (this.sharedSecret || peer.channel !== 1)) throw channelError('boss_owner_fenced');
    } else if (name === 'combat_events') {
      // Reservations are changed only by reserveEvents, a separate atomic job.
      // No allowed memory delta writes this table; this pass holds the writer
      // lock throughout and never carries the range into a later job/action.
      const reads=this.deltaScopeReads477;
      const range = reads?.eventRangeRead ? reads.eventRange : this.database.compiled('SELECT top,bottom FROM channel_event_ranges WHERE channel=? AND incarnation=?').get(peer.channel,peer.incarnation);
      if(reads){reads.eventRange=range;reads.eventRangeRead=true;}
      if (!Number.isSafeInteger(id) || !range || id >= range.top || id < range.bottom) throw channelError('invalid_memory_event_id');
    }
    if (definition.fields && (!before || !after)) throw channelError('memory_entity_missing');
    if ((name === 'players' || name === 'monsters') && delta.table !== 'position' && !(after.hp > 0)) throw channelError('death_requires_durable_operation');
    const where = keys.map(k => `${quote(k)} IS ?`), params = [...delta.keys];
    if (before) {
      // Compare the exact dirty fields and scope. Economy columns never enter a
      // memory flush, and changed scope cannot inherit an old channel's values.
      const guardFields = definition.fields
        ? [...fields, ...(name === 'players' ? ['area','channel','arena_match_id','realtime_scope_version'] : ['spawn_round'])]
        : schema.columns;
      for (const field of guardFields) if (!keys.includes(field) && Object.hasOwn(before, field)) {
        where.push(`${quote(field)} IS ?`); params.push(before[field]);
      }
    }
    if (!after) {
      const result = this.database.compiled(`DELETE FROM main.${quote(name)} WHERE ${where.join(' AND ')}`).run(...params);
      if (result.changes !== 1) throw channelError('memory_delta_conflict');
      return 1;
    }
    if (!before) {
      const columns = schema.columns.filter(c => Object.hasOwn(after, c));
      this.database.compiled(`INSERT INTO main.${quote(name)}(${columns.map(quote).join(',')}) VALUES(${columns.map(() => '?').join(',')})`).run(...columns.map(c => after[c]));
      return 1;
    }
    for (const field of schema.columns) if (!keys.includes(field) && !fields.includes(field) && Object.hasOwn(after, field) && after[field] !== before[field]) throw channelError('memory_field_not_allowed');
    const changed = fields.filter(f => Object.hasOwn(after, f) && after[f] !== before[f]);
    if (!changed.length) return 0;
    const result = this.database.compiled(`UPDATE main.${quote(name)} SET ${changed.map(c => `${quote(c)}=?`).join(',')} WHERE ${where.join(' AND ')}`).run(...changed.map(c => after[c]), ...params);
    if (result.changes !== 1) throw channelError('memory_delta_conflict');
    return 1;
  }
  nativeScopeValid(scope,leaseRows) {
    if(!scope||scope.version!==1||!Array.isArray(scope.players)||scope.players.length>4096)throw channelError('invalid_native_owner_scope');
    const ids=new Set();
    for(const p of scope.players){
      if(typeof p?.playerId!=='string'||!p.playerId||ids.has(p.playerId)||p.channel!==null&&![1,2,3].includes(p.channel))throw channelError('invalid_native_owner_scope');
      ids.add(p.playerId);
      const player=this.database.compiled('SELECT channel FROM players WHERE id=?').get(p.playerId);
      if((player?.channel??null)!==p.channel)return false;
      // Local rows were already validated by the unchanged ordinary lease
      // fence; reuse them instead of doing the same indexed lookup twice.
      const owner=leaseRows.get(p.playerId)??this.database.compiled('SELECT epoch,channel,incarnation,state FROM channel_owners WHERE player_id=?').get(p.playerId)??null;
      if(Boolean(owner)!==Boolean(p.lease))return false;
      if(owner&&(owner.epoch!==p.lease.epoch||owner.channel!==p.lease.channel||owner.incarnation!==p.lease.incarnation||!(owner.state===p.lease.state||['active','draining'].includes(owner.state)&&['active','draining'].includes(p.lease.state))))return false;
    }
    return true;
  }
  nativeScopeSupported(plan) {
    this.nativeScopeTableInfo??=new Map();
    for(const sql of plan.statements){
      if(/^\s*SELECT\b/i.test(sql))continue;
      const match=/^\s*(?:UPDATE\s+|INSERT(?:\s+OR\s+\w+)?\s+INTO\s+|REPLACE\s+INTO\s+|DELETE\s+FROM\s+)(?:main\.)?["`]?([a-z_]\w*)["`]?(?:\s|\()/i.exec(sql);
      if(!match)return false;
      const table=match[1].toLowerCase();
      if(!this.nativeScopeTableInfo.has(table))this.nativeScopeTableInfo.set(table,this.database.compiled('PRAGMA main.table_info("'+table+'")').all().map(c=>c.name));
      const columns=this.nativeScopeTableInfo.get(table);
      if(!columns.length||(table==='players'||columns.includes('player_id')||columns.includes('owner_id'))&&!this.notifications.has(table))return false;
    }
    return true;
  }
  write(peer, request) {
    const {sequence, owners = [], deltas = [], statements = [], guard = null, nativePlan = null,nativeOperation=null,nativeScope=null} = request;
    if(nativePlan&&(statements.length||guard||!owners.length&&!request.sharedProof&&!nativeScope))return Promise.reject(channelError('invalid_native_plan_scope'));
    if(nativeOperation&&(nativePlan||statements.length||guard||!owners.length))return Promise.reject(channelError('invalid_native_operation_scope'));
    if (!Number.isSafeInteger(sequence) || sequence < 1 || !Array.isArray(owners) || !Array.isArray(deltas) || !Array.isArray(statements) || deltas.length > 4096 || statements.length > 512) return Promise.reject(channelError('invalid_writer_request'));
    const digest = requestDigest(request);
    const observe477=Boolean(globalThis.__colLoadLab?.hasKnownEntities());
    const jobKind477=nativePlan?'native_plan':nativeOperation?'native_operation':guard?'guarded_action':statements.length?'statements':'memory_flush';
    const timing477=observe477?{sqlJobKind:jobKind477,sqlPopulation:'unattributed'}:undefined;let replayed477=false,responseBytes477=0;
    const queued477=observe477?performance.now():0;let entered477=0,finished477=0;
    return this.database.atomic(db => {
      if(observe477)entered477=performance.now();try{
      const fence477=withWriterSqlPhase477(db,'fence',()=>{
      this.authority.assertProcess(peer.channel, peer.incarnation, db);
      // Both point lookups share one call and the same locked snapshot. The
      // singleton key keeps the first write (no stream/receipt yet) present.
      const previous = this.database.compiled(`WITH writer_key(channel,incarnation,sequence) AS (VALUES(?,?,?))
        SELECT r.digest,r.response,s.sequence AS stream_sequence FROM writer_key AS k
        LEFT JOIN channel_write_receipts AS r ON r.channel=k.channel AND r.incarnation=k.incarnation AND r.sequence=k.sequence
        LEFT JOIN channel_write_streams AS s ON s.channel=k.channel AND s.incarnation=k.incarnation`).get(peer.channel, peer.incarnation, sequence);
      if (previous.digest !== null) {
        if (previous.digest !== digest) throw channelError('writer_sequence_reused');
        this.stats.replays++;
        replayed477=true;
        if(observe477){responseBytes477=Buffer.byteLength(previous.response);timing477.sqlJobKind='receipt_replay';}
        return {replay:JSON.parse(previous.response)};
      }
      if (sequence !== (previous.stream_sequence ?? 0) + 1) throw channelError('writer_sequence_gap');
      const leased = new Set(),leaseRows = new Map();
      for (const claim of owners) {
        const owner = this.authority.owner(claim.playerId, db);
        if (!owner || owner.epoch !== claim.epoch || owner.channel !== peer.channel || owner.incarnation !== peer.incarnation || !['active','draining'].includes(owner.state)) throw channelError('owner_epoch_fenced');
        leased.add(claim.playerId);leaseRows.set(claim.playerId,owner);
      }
      let shared=false;
      if(request.sharedProof){
        if(!this.sharedSecret)throw channelError('invalid_shared_lease');
        const lease=verifySharedLease(this.sharedSecret,request.sharedProof);
        if(lease.channel!==peer.channel||lease.incarnation!==peer.incarnation)throw channelError('shared_source_fenced');
        this.authority.assertProcess(1,lease.ownerIncarnation,db);shared=true;
      }
      return {leased,leaseRows,shared};
      });
      if(replayed477)return fence477.replay;
      const {leased,leaseRows,shared}=fence477;
      recordWriterJobDetail477(db,'deltaRows',deltas.length);
      recordWriterJobDetail477(db,'statementFrames',statements.length);
      let rows = 0;
      let labRejected=null;
      const labEnabled=this.loadlab.required()||statements.some(frame=>frame?.loadlabReward||frame?.loadlabRateLimit);
      this.changed = new Map();
      try {
      if(labEnabled)withWriterSqlPhase477(db,'schema',()=>this.loadlab.begin(request.actor??null,leased));
      const labDeltas=withWriterSqlPhase477(db,'delta',()=>{
        this.deltaScopeReads477={monsters:new Map(),eventRangeRead:false,eventRange:undefined};
        try{
          const applied=labEnabled?this.loadlab.applyDeltas(this.loadlab.partitionDeltas(deltas),delta=>this.applyDelta(db,peer,delta,leased,shared),{checkpoint:()=>new Map(this.changed),restore:value=>{this.changed=value;this.deltaScopeReads477?.monsters.clear();},reset:()=>this.nativeOperations?.reset()}):null;
          if(!applied)for(const delta of deltas)rows+=this.applyDelta(db,peer,delta,leased,shared);
          return applied;
        }finally{this.deltaScopeReads477=null;}
      });
      if(labDeltas){rows+=labDeltas.rows;labRejected=labDeltas.rejection;}
      for (const delta of labDeltas?.quarantined??[]){
        const table=delta.table==='position'?'players':delta.table,row=delta.after??delta.before,id=delta.keys[0],owner=table==='players'?id:row?.player_id??null;
        const key=table+'\u001e'+JSON.stringify(delta.keys);this.changed.set(key,{table,keys:delta.keys,id,owner,peer:null,staticChanged:'loadlab_reconcile'});
      }
      const prepare = frame => {
        if (!frame || typeof frame.sql !== 'string' || !Array.isArray(frame.params) || !/^\s*(SELECT|INSERT|UPDATE|DELETE|REPLACE|WITH)\b/i.test(frame.sql)) throw channelError('invalid_game_statement');
        return this.database.prepare(frame.sql).bind(...frame.params);
      };
      let result;
      const labBeforeChanges=labEnabled?new Map(this.changed):null;
      withWriterSqlPhase477(db,'action',()=>{
      if(labEnabled)db.exec('SAVEPOINT channel_loadlab_action');
      try{
      if(labRejected){this.loadlab.violation=labRejected;throw channelError(labRejected.code);}
      if(labEnabled&&(statements.length||guard||nativePlan||nativeOperation)){this.loadlab.beginAction();if(timing477)timing477.sqlPopulation=verifiedWriterPopulation477(this.loadlab,request,leased,globalThis.__colLoadLab);}else if(timing477&&!request.actor)timing477.sqlPopulation='background';
      const executeFrames=frames=>{const bulk=prepareRewardBatchR7(db,frames,this.loadlab.generatedObserverSqlR8),current=bulk?.frames??frames;const elideR13=!bulk?createNonlethalRewardExecutorR13(db,current,this.loadlab.generatedObserverSqlR8):null,ordinaryR13=frame=>this.database.execute(prepare(frame)),executeR13=frame=>elideR13?elideR13(frame,ordinaryR13):ordinaryR13(frame);const output=!labEnabled?current.map(executeR13):this.loadlab.execute(current,executeR13,{checkpoint:()=>new Map(this.changed),restore:value=>{this.changed=value;},reset:()=>this.nativeOperations?.reset()});const restored=bulk?bulk.restore(output):output;if(bulk)recordWriterJobDetail477(db,'bulkRewardExecuted');return restored;};
      if(nativeOperation){
        if(!this.nativeOperations||!leased.has(nativeOperation.playerId))throw channelError('native_operation_fenced');
        const beforeChanges=new Map(this.changed);
        db.exec('SAVEPOINT channel_native_inventory');
        try{
          const value=this.nativeOperations.execute(nativeOperation);
          if(value&&typeof value.then==='function')throw channelError('async_native_operation');
          result={native:{ok:true,value}};
        }catch(error){
          db.exec('ROLLBACK TO channel_native_inventory');this.changed=beforeChanges;this.nativeOperations.reset();
          if(error.code)throw error;
          // A normal game rejection (full storage, insufficient balance) is a
          // known rollback, not a lost IPC outcome or a reason to kill a channel.
          result={native:{ok:false,message:String(error.message).slice(0,300)}};
        }
        db.exec('RELEASE channel_native_inventory');
      } else if (nativePlan) {
        const beforeChanges=new Map(this.changed);
        db.exec('SAVEPOINT channel_native_operation');
        this.nativeScopedIds=nativeScope?new Set(nativeScope.players.map(p=>p.playerId)):null;
        this.nativeScopeViolation=false;
        try{result=nativeScope&&(!this.nativeScopeValid(nativeScope,leaseRows)||!this.nativeScopeSupported(nativePlan))?{committed:false,reason:'native_snapshot_changed',scope:true}:replayNativePlan(this.database,nativePlan);}finally{this.nativeScopedIds=null;}
        if(result.committed&&nativeScope){
          // Every owned changed row must be covered, including foreign reward
          // recipients. Never make an actor-only scope silently authorize it.
          if(this.nativeScopeViolation)result={committed:false,reason:'native_snapshot_changed',scope:true};
        }
        if(!result.committed){
          db.exec('ROLLBACK TO channel_native_operation');
          this.changed=beforeChanges;
        }
        db.exec('RELEASE channel_native_operation');
      } else if (guard) {
        db.exec('SAVEPOINT channel_game_operation');
        const checked = this.database.execute(prepare(guard));
        if (!checked.results.length) {
          db.exec('ROLLBACK TO channel_game_operation; RELEASE channel_game_operation');
          result = {guard: checked, results: []};
        } else {
          result = {guard: checked, results: executeFrames(statements)};
          db.exec('RELEASE channel_game_operation');
        }
      } else result = executeFrames(statements);
      if(labEnabled)db.exec('RELEASE channel_loadlab_action');
      }catch(error){
        if(!labEnabled)throw error;
        db.exec('ROLLBACK TO channel_loadlab_action; RELEASE channel_loadlab_action');
        this.changed=labBeforeChanges;this.nativeOperations?.reset();
        if(!this.loadlab.violation)throw error;
        labRejected={...this.loadlab.violation};result=null;
      }finally{if(labEnabled)this.loadlab.end();}
      });
      if(request.ownerlessWorld&&[...this.changed.values()].some(c=>c.owner&&!leased.has(c.owner)))throw channelError('ownerless_world_changed_player');
      const response = {result, rows, changed: [...this.changed.values()],...(labRejected?{labRejected}:{})};
      const encodedResponse=JSON.stringify(response);
      if(observe477)responseBytes477=Buffer.byteLength(encodedResponse);
      withWriterSqlPhase477(db,'receipt',()=>{
        this.database.compiled('INSERT INTO channel_write_receipts VALUES(?,?,?,?,?,?)').run(peer.channel, peer.incarnation, sequence, digest, encodedResponse, Date.now());
        this.database.compiled(`INSERT INTO channel_write_streams VALUES(?,?,?) ON CONFLICT(channel,incarnation) DO UPDATE SET sequence=excluded.sequence`).run(peer.channel, peer.incarnation, sequence);
      });
      this.stats.transactions++; this.stats.deltaRows += rows;
      return response;
      } finally { this.changed = null;this.deltaScopeReads477=null; }
      }finally{if(observe477)finished477=performance.now();}
    }, {timing:timing477}).then(response=>{
      if(timing477)this.database.writerSqlPopulation477.record(timing477.sqlPopulation,timing477);
      if(timing477)this.database.writerRewardMetricsR10.record(timing477.sqlPopulation,timing477,{replayed:replayed477,actionRolledBack:Boolean(response.labRejected)});
      if(observe477){const at=performance.now(),elapsed=at-queued477;if(elapsed>=100)logWriter477({version:2,pid:process.pid,channel:peer.channel,atMs:Math.round(performance.timeOrigin+queued477),endedAtMs:Math.round(performance.timeOrigin+at),operation:nativePlan?'native_plan':nativeOperation?'native_operation':guard?'guarded_action':statements.length?'statements':'memory_flush',statements:statements.length,deltas:deltas.length,queueMs:Math.round((entered477-queued477)*1000)/1000,transactionWorkMs:Math.round((finished477-entered477)*1000)/1000,ackTailMs:Math.round((at-finished477)*1000)/1000,totalMs:Math.round(elapsed*1000)/1000,...timing477,replayed:replayed477,scope:'per-job SQL/queue; group transaction/COMMIT and flush shared; fsync await includes libuv/scheduling; overlap-not-additive'});}
      this.loadlab.notifyStopped();
      if(!timing477)return response;
      const names477={queueMs:'writer_batch_queue_wall',sqlWallMs:'writer_sql_wall',sqlPrepareWallMs:'writer_sql_prepare_wall',sqlPrepareNestedWallMs:'writer_sql_prepare_nested_wall',jobMs:'writer_job_wall',transactionMs:'writer_transaction_wall',commitMs:'writer_commit_wall',durableMs:'writer_durable_wall',fsyncWaitMs:'writer_fsync_wait_wall'};
      const writerTiming=Object.fromEntries(Object.entries(names477).flatMap(([key,name])=>Number.isFinite(timing477[key])&&timing477[key]>=0?[[name,Math.round(timing477[key]*1000)/1000]]:[]));
      // Timing is transport metadata only. Durable receipts contain the original
      // economic response; replay never repeats SQL or rewrites that receipt.
      const writerBatch={id:timing477.batchId,size:timing477.batchSize,sqlCalls:timing477.sqlCalls??0,sqlExecCalls:timing477.sqlExecCalls??0,sqlPrepareWallMs:timing477.sqlPrepareWallMs??0,sqlPrepareNestedWallMs:timing477.sqlPrepareNestedWallMs??0,sqlPrepareCalls:timing477.sqlPrepareCalls??0,sqlCacheHits:timing477.sqlCacheHits??0,sqlCacheMisses:timing477.sqlCacheMisses??0,...(timing477.sqlBreakdown?{sqlBreakdown:timing477.sqlBreakdown}:{}),sqlJobKind:timing477.sqlJobKind,...(timing477.sqlJobDetail?{sqlJobDetail:timing477.sqlJobDetail}:{}),durabilityMode:timing477.durabilityMode,replayed:replayed477,...(timing477.flushId?{flushId:timing477.flushId}:{})};
      // Optional diagnostics must never turn a valid economic ACK into an IPC
      // size failure. Reserve ample space for the authenticated RPC envelope.
      if(responseBytes477+Buffer.byteLength(JSON.stringify({writerTiming,writerBatch}))-1>MAX_CHANNEL_BYTES-4096)return response;
      return {...response,writerTiming,writerBatch};
    });
  }
}
