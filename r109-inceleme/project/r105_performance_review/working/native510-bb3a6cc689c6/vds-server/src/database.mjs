import {perfR13Features} from './perf-r13-features.mjs';
function pendingCombatR13(store, plans) {
  if (!Array.isArray(plans) || !plans.length || plans.length > 32) return null;
  const provisionalHits = [];
  for (const plan of plans) {
    const row = store?.entry('monsters', plan.target.id)?.current;
    if (!row || row.spawn_round !== plan.target.spawn_round || row.hp <= 0 ||
        !Number.isFinite(plan.rolled) || plan.rolled <= 0 || !store.locks.has(row.id)) return null;
    provisionalHits.push({id:row.id, spawnRound:row.spawn_round,
      damage:Math.min(row.hp, plan.rolled), hp:Math.max(0, row.hp - plan.rolled),
      killPending:row.hp <= plan.rolled});
  }
  return {combatPending:true,combatPhase:'pending',rewardPending:false,
    xp:0,groundDrops:0,provisionalHits};
}


import {workDiagnostic477} from './work-diagnostics477.mjs';
import {perfStage477,recordCombatPath477} from './request-performance477.mjs';
import { DatabaseSync } from "node:sqlite";
import { backupInOneStep } from "./sqlite-backup.mjs";
import { existsSync } from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
import { reportRuntimeWork, sqlWorkName } from './runtime-performance.mjs';
import { WalSync } from './wal-sync.mjs';
import {isWorldSnapshotMetadataSql} from './world-snapshot-metadata.mjs';
import {installWriterSqlTiming477,measureWriterSql477} from './writer-sql-timing477.mjs';
import {GroupSizeMetrics477} from './writer-group-metrics477.mjs';
import {installPreparedStatements477,checkPreparedSchema477,withPreparedStatements477} from './prepared-statements477.mjs';
const worldSnapshotMetadataMode=Symbol('world-snapshot-metadata');
// The Node entry and bundled route must share the same request context.
const combatContextKey = Symbol.for("coreoflife.databaseCombatContext");
const combatContext = globalThis[combatContextKey] ??= new AsyncLocalStorage();
export const withCombatDatabasePriority = task => combatContext.run(true, task);
// Start recoverable work on the next I/O turn, outside the combat lane. A
// detached, already-started promise can still block socket flushing via microtasks.
export const deferDatabaseBackgroundTask = task => new Promise((resolve,reject) => {
  setImmediate(() => combatContext.run(false, () => Promise.resolve().then(task).then(resolve,reject)));
});

// D1-compatible API over one durable SQLite connection. All statements in a
// batch execute synchronously in one transaction, including changes() guards.
export class LocalDatabase {
  constructor(path, { create = false, groupWrites = false, asyncDurable = false, readOnly = false } = {}) {
    if (!create && (!path || !existsSync(path))) throw new Error("Imported game database is missing; refusing to create an empty world.");
    this.sqlite = new DatabaseSync(path, {readOnly});
    if (!readOnly) installWriterSqlTiming477(this.sqlite);
    this.readOnly = readOnly;
    this.sqlite.exec(readOnly
      ? "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA cache_size=-16384;"
      : "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; PRAGMA cache_size=-65536;");
    // Acknowledgements still wait for an fsync of the WAL; only the waiting moves
    // off the HTTP thread (see wal-sync.mjs). Any flush failure restores FULL.
    this.walSync = null;
    if (!readOnly && asyncDurable && path && path !== ":memory:" &&
      this.sqlite.prepare("PRAGMA journal_mode").get().journal_mode === "wal") {
      this.walSync = new WalSync(`${path}-wal`, { onFailure: error => this.restoreFullDurability(error) });
      this.sqlite.exec("PRAGMA synchronous=NORMAL");
    }
    // When the separate checkpoint worker is unavailable (SQLite < 3.51.3, see
    // wal-checkpoint.mjs) checkpoints run inside a main-thread COMMIT and fsync
    // the database file. Hot rows are rewritten constantly, so a larger interval
    // copies each hot page once per checkpoint instead of many times: fewer
    // checkpoints and less total disk work. The worker, when active, still
    // disables this and restores exactly this value on fallback.
    const autocheckpoint = Number(process.env.CORE_WAL_AUTOCHECKPOINT_PAGES ?? 4000);
    if (!readOnly && Number.isInteger(autocheckpoint) && autocheckpoint >= 1000 && autocheckpoint <= 20000)
      this.sqlite.exec(`PRAGMA wal_autocheckpoint=${autocheckpoint}`);
    this.turnDeadline = performance.now() + 6;
    this.nextTurn = null;
    this.combatDeadline = 0;
    this.statementCache = new Map();
    this.statementCacheBytes = 0;
    this.statementWorkNames = new Map();
    if(!readOnly)installPreparedStatements477(this.sqlite,{onInvalidate:()=>this.clearStatements()});
    this.schemaVersionStatement = this.sqlite.prepare("PRAGMA schema_version");
    this.schemaVersion = this.schemaVersionStatement.get().schema_version;
    this.batchSchemaChecked = false;
    this.groupWrites = groupWrites;
    this.writeQueue = [];
    this.writeDrain = null;
    this.writeGroupSequence477 = 0;
    this.writeStats = { memoryFlush:{count:0,lastMs:0,maxMs:0,lastDurableMs:0,maxDurableMs:0}, commits: 0, commitErrors: 0, totalCommitMs: 0, maxCommitMs: 0, groupedJobs: 0, singletonWrites: 0, guardedJobs: 0, guardedRejected: 0 };
    this.writerGroups477=readOnly?null:new GroupSizeMetrics477('committed-transactions',{config:{enabled:true,maxJobs:8,windowMs:0},maxSize:8});
    this.closed = false;
    this.metadataStatement = this.sqlite.prepare("SELECT changes() AS changes, last_insert_rowid() AS last_row_id");
  }
  checkSchema({writer=false}={}) {
    // Native modules share this file through other connections. A schema change
    // must invalidate Node's cached result-column mapping before the next read.
    const schemaVersion = this.schemaVersionStatement.get().schema_version;
    if(writer)checkPreparedSchema477(this.sqlite,schemaVersion);
    if (schemaVersion !== this.schemaVersion) {
      this.clearStatements();
      this.schemaVersion = schemaVersion;
    }
  }
  compiled(sql) {
    if (!this.batchSchemaChecked) this.checkSchema();
    const cached = this.statementCache.get(sql);
    if (cached) {
      this.statementCache.delete(sql);
      this.statementCache.set(sql, cached);
      return cached;
    }
    const prepared = this.sqlite.prepare(sql), bytes = sql.length * 2;
    // Bound both dynamic SQL variants and memory. Bind values are never keys.
    if (bytes > 131072) return prepared;
    while (this.statementCache.size >= 128 || this.statementCacheBytes + bytes > 524288) {
      const oldest = this.statementCache.keys().next().value;
      this.statementCache.delete(oldest);
      this.statementWorkNames.delete(oldest);
      this.statementCacheBytes -= oldest.length * 2;
    }
    this.statementCache.set(sql, prepared);
    this.statementWorkNames.set(sql,sqlWorkName(sql));
    this.statementCacheBytes += bytes;
    return prepared;
  }
  restoreFullDurability(error) {
    // Called from a thread-pool completion, never inside a transaction.
    console.error("wal_sync_fallback", String(error?.message || error));
    this.durabilityFallback = String(error?.message || error);
    this.fullDurabilityConfirmed477 = false;
    this.fallbackDurabilityRecovered477 = false;
    try {
      if (!this.closed && !this.sqlite.isTransaction) {
        this.sqlite.exec("PRAGMA synchronous=FULL");
        this.fullDurabilityConfirmed477 = this.sqlite.prepare('PRAGMA synchronous').get().synchronous === 2;
      }
    }
    catch (pragmaError) { console.error("wal_sync_restore_failed", String(pragmaError?.message || pragmaError)); }
  }
  totalChanges() { return (this.totalChangesStatement ??= this.sqlite.prepare("SELECT total_changes() AS n")).get().n; }
  // After a COMMIT: a promise for its durability, or null when COMMIT itself
  // already synced (FULL, or after a fallback).
  durableAfterCommit() {
    let durable = null;
    if (this.walSync && !this.walSync.failed) durable = this.walSync.durable();
    else if (this.walSync?.failed && !this.fallbackDurabilityRecovered477) {
      // FULL protects future writes, but an empty receipt-replay transaction
      // need not sync frames committed earlier under NORMAL. A checked WAL
      // recovery flush must first cover that previous, unacknowledged epoch.
      durable = !this.fullDurabilityConfirmed477
        ? Promise.reject(new Error('full_durability_restore_unconfirmed'))
        : this.walSync.recoverDurable().then(result => {this.fallbackDurabilityRecovered477 = true;return result;});
    }
    if(durable&&perfR13Features.enabled('asyncCombatPending')){
      const pending=this.worldDurabilityR13??=new Set();pending.add(durable);
      // Observe the original promise, not the WorldPush settled notifications
      // (which deliberately resolve even on failure while closing subscribers).
      durable.then(()=>pending.delete(durable),error=>{pending.delete(durable);this.worldDurabilityFailureR13=error;});
    }
    this.sqlite.worldPushLayer?.confirmDurable(durable);
    this.sqlite.positionLayer?.confirmDurable(durable);
    this.sqlite.combatLayer?.confirmDurable(durable);
    return durable;
  }
  worldReadFenceEnabledR13(){return perfR13Features.enabled('asyncCombatPending');}
  async worldReadDurableR13(){
    this.assertAvailable();
    if(!this.worldReadFenceEnabledR13())return;
    if(this.readOnly)throw Object.assign(Error('world_durability_unavailable'),{code:'world_durability_unavailable'});
    const check=()=>{
      this.assertAvailable();
      if((this.worldDurabilityFailureR13||this.walSync?.failed)&&!this.fallbackDurabilityRecovered477)
        throw Object.assign(Error('world_durability_unconfirmed'),{code:'world_durability_unconfirmed'});
    };
    check();
    // The payload is already read. This finite snapshot covers its visible
    // commits; subsequent commits must not prolong this reader indefinitely.
    const pending=this.worldDurabilityR13?[...this.worldDurabilityR13]:[];
    if(pending.length)await Promise.all(pending);
    check();
  }
  clearStatements() { this.statementCache.clear(); this.statementWorkNames.clear(); this.statementCacheBytes = 0; }
  assertAvailable() { if (this.closed) throw new Error("Database closed"); if (this.maintenance) throw new Error("Beta sıfırlaması tamamlandı; sunucu yeniden başlıyor."); }
  prepare(sql) { this.assertAvailable(); return new LocalStatement(this, sql, []); }
  yieldForIO() {
    // Awaiting an already-resolved SQLite promise only runs more microtasks.
    // A burst of world reads/reward recovery could therefore finish hundreds
    // of operations before Node flushed an already-committed combat response.
    // Yield between operations after a small shared budget, NEVER mid-batch.
    this.assertAvailable();
    const now = performance.now();
    if (this.sqlite.isTransaction || now < this.turnDeadline) return null;
    // Once ordinary work used its turn, allow a bounded combat lane to finish
    // short auth/read/commit chains instead of rejoining every upkeep wave.
    // Wall time bounds this lane too; it cannot monopolize socket delivery.
    if (combatContext.getStore() === true) {
      if (!this.combatDeadline) this.combatDeadline = now + 3;
      if (now < this.combatDeadline) return null;
    }
    return this.nextTurn ??= new Promise(resolve => setImmediate(() => {
      this.turnDeadline = performance.now() + 6;
      this.combatDeadline = 0;
      this.nextTurn = null;
      resolve();
    }));
  }
  flushMemory() {
    if(this.memoryFlush)return this.memoryFlush;
    const job=Promise.resolve().then(()=>this.batch([])).finally(() => { if(this.memoryFlush===job)this.memoryFlush = null; });
    return this.memoryFlush=job;
  }
  async positionCheckpoint(statement) {
    if (!this.positions?.enabled) return statement.first();
    let pause;
    while ((pause = this.yieldForIO())) await pause;
    // Combat no longer supplies frequent incidental position commits. At the
    // one-second boundary wait for durability instead of issuing a false CAS
    // rejection or acknowledging more than the permitted recovery window.
    if(this.combat?.enabled&&!this.positions.doubleBuffer){
      const overdue=()=>{const e=this.positions.entries.get(statement.params[7]);return e?.dirtyAt!==undefined&&this.positions.now()-e.dirtyAt>=1000;};
      while(overdue())await this.flushMemory();
    }
    if(this.channelCompute)return this.channelCompute.position(statement);
    // Guard SELECT + memory CAS run without any await/interleaving.
    return this.positions.checkpoint(this.sqlite, statement);
  }
  async executeAsync(statement) {
    // Movement and fishing checkpoints use UPDATE ... RETURNING through
    // first(), not batch(). They still require the same durable commit lane:
    // otherwise every concurrent player forces its own main-thread WAL sync.
    // SELECT/auth reads stay on the main connection and are never queued here.
    if (this.groupWrites && !this.sqlite.isTransaction &&
      statement instanceof LocalStatement && statement.database === this &&
      /^\s*(?:INSERT|UPDATE|DELETE|REPLACE)\b/i.test(statement.sql)) {
      this.writeStats.singletonWrites++;
      return (await this.batch([statement]))[0];
    }
    let pause;
    // Recheck after every yield: a concurrent burst must not all resume and
    // exhaust another whole backlog in the same event-loop turn.
    while ((pause = this.yieldForIO())) await pause;
    // An autocommitted statement that changed the database (WITH ... UPDATE,
    // DDL, a write outside the group lane) is acknowledged only after its WAL
    // flush. Pure reads (SELECT, WITH ... SELECT, PRAGMA reads) never wait.
    const checkChanges = this.walSync && !this.sqlite.isTransaction && !/^\s*SELECT\b/i.test(statement.sql);
    const before = checkChanges ? this.totalChanges() : 0;
    const result = this.execute(statement);
    if (checkChanges && !this.sqlite.isTransaction && (this.totalChanges() !== before || /^\s*(?:CREATE|ALTER|DROP)\b/i.test(statement.sql))) {
      const durable = this.durableAfterCommit();
      if (durable) await durable;
    }
    return result;
  }
  execute(statement) {
    this.assertAvailable();
    if (!(statement instanceof LocalStatement) || statement.database !== this) throw new Error("Invalid database statement");
    const started = performance.now();
    try {
    const prepared = this.compiled(statement.sql);
    // SQLite returns fresh private null-prototype rows. Normalize each one in
    // place instead of cloning every field and allocating a key array on every
    // world snapshot. Enumerate before changing the prototype, so even special
    // column names such as __proto__ and constructor stay ordinary own fields.
    // In an existing transaction the schema cannot change under this check.
    // For a DML statement with no result columns, run() returns SQLite's own
    // changes64/last_insert_rowid after the statement and all its triggers.
    // This preserves D1 metadata without issuing a second metadata SELECT.
    // RETURNING, SELECT, CTE, DDL and autocommit calls retain the original path.
    const writeWithoutRows = this.sqlite.isTransaction && !this.readOnly &&
      (/^\s*(?:INSERT|UPDATE|DELETE|REPLACE)\b/i.test(statement.sql) || perfR13Features.enabled('cteWriteMetadata') && /^\s*WITH\b/i.test(statement.sql)) && prepared.columns().length === 0;
    let directMetadata;
    const rawRows = writeWithoutRows ? (() => {
      const written = prepared.run(...statement.params);
      directMetadata = {changes: written.changes, last_row_id: written.lastInsertRowid};
      return [];
    })() : prepared.all(...statement.params);
    const rows = rawRows.map(row => {
      for (const key in row) {
        if (row[key] instanceof Uint8Array) row[key] = Array.from(row[key]);
      }
      return Object.setPrototypeOf(row, Object.prototype);
    });
    // The explicit audited world-snapshot lane has the same read-only metadata
    // contract as WorldReadPool. Ordinary D1 calls retain connection metadata.
    const metadata = this.snapshotReadMetadata ? {changes:0,last_row_id:0} : directMetadata ?? this.metadataStatement.get();
    return { results: rows, success: true, meta: { ...metadata, duration: performance.now() - started, served_by: "vds-sqlite", rows_read: rows.length, rows_written: /^\s*SELECT\b/i.test(statement.sql) || prepared.columns().length ? 0 : metadata.changes, changed_db: metadata.changes > 0, size_after: 0 } };
    } finally {
      reportRuntimeWork(this.statementWorkNames.get(statement.sql)??sqlWorkName(statement.sql),performance.now()-started,performance.timeOrigin+started);
    }
  }
  async batch(statements, metadataMode) {
    this.assertAvailable();
    // Coalesce concurrent durable commits, not player state. Each request keeps
    // its own savepoint and changes() chain. No response resolves before FULL
    // WAL commit, and no transaction spans an event-loop yield.
    if (this.groupWrites && statements.length && statements.every(statement =>
      statement instanceof LocalStatement && statement.database === this &&
      /^\s*(?:SELECT|INSERT|UPDATE|DELETE|REPLACE|WITH)\b/i.test(statement.sql)) &&
      !statements.every(statement => /^\s*SELECT\b/i.test(statement.sql))) {
      const owned = statements.map(statement => new LocalStatement(this, statement.sql,
        statement.params.map(value => value instanceof Uint8Array ? value.slice() : value)));
      return new Promise((resolve, reject) => {
        this.writeQueue.push({statements: owned, resolve, reject});
        this.scheduleWriteDrain();
      });
    }
    let pause;
    while ((pause = this.yieldForIO())) await pause;
    // Plain SELECT batches need one consistent snapshot, not a writer lock.
    // Keep mixed, foreign and uncertain statements on the existing write path.
    const readOnly = statements.length > 0 && statements.every(statement =>
      statement instanceof LocalStatement && statement.database === this && /^\s*SELECT\b/i.test(statement.sql));
    // Once this transaction has a schema snapshot, ordinary reads/writes cannot
    // change its shape. Avoid repeating the same PRAGMA for every world query.
    // DDL and unknown SQL retain the per-statement check, including ALTER followed
    // by a previously cached SELECT in the same batch.
    const stableSchema = statements.length > 0 && statements.every(statement =>
      statement instanceof LocalStatement && statement.database === this && /^\s*(?:SELECT|INSERT|UPDATE|DELETE|REPLACE)\b/i.test(statement.sql));
    const memoryFlushAt=statements.length===0?performance.now():null;
    this.sqlite.exec(readOnly ? "BEGIN DEFERRED" : "BEGIN IMMEDIATE");
    let durable = null, results;
    try {
      if (stableSchema) {
        this.checkSchema();
        this.batchSchemaChecked = true;
      }
      this.snapshotReadMetadata=readOnly && metadataMode===worldSnapshotMetadataMode;
      results = statements.map(statement => this.execute(statement));
      if (readOnly) { this.sqlite.exec("COMMIT"); return results; }
      this.commitWrites();
      if(memoryFlushAt!==null){const m=this.writeStats.memoryFlush;m.count++;m.lastMs=performance.now()-memoryFlushAt;m.maxMs=Math.max(m.maxMs,m.lastMs);}
      durable = this.durableAfterCommit();
      if (!durable) {
        if(memoryFlushAt!==null){const m=this.writeStats.memoryFlush;m.lastDurableMs=performance.now()-memoryFlushAt;m.maxDurableMs=Math.max(m.maxDurableMs,m.lastDurableMs);}
        return results;
      }
    } catch (error) { this.sqlite.exec("ROLLBACK"); throw error; }
    finally { this.batchSchemaChecked = false; this.snapshotReadMetadata=false; }
    // Outside the transaction: other requests run while the disk flushes.
    await durable;
    if(memoryFlushAt!==null){const m=this.writeStats.memoryFlush;m.lastDurableMs=performance.now()-memoryFlushAt;m.maxDurableMs=Math.max(m.maxDurableMs,m.lastDurableMs);}
    return results;
  }
  async guardedBatch(guard, statements, after) {
    this.assertAvailable();
    // This native-only API accepts one conditional UPDATE ... RETURNING guard.
    // A rejected guard must also roll back trigger side effects before the next
    // FIFO job runs. No SQL or parameter object is borrowed across the I/O turn.
    const ownedStatement = statement => {
      if (!(statement instanceof LocalStatement) || statement.database !== this ||
        !/^\s*(?:SELECT|INSERT|UPDATE|DELETE|REPLACE|WITH)\b/i.test(statement.sql)) {
        throw new Error("Invalid guarded database statement");
      }
      return new LocalStatement(this, statement.sql,
        statement.params.map(value => value instanceof Uint8Array ? Uint8Array.from(value) : value));
    };
    if (!(guard instanceof LocalStatement) || guard.database !== this ||
      !/^\s*UPDATE\b/i.test(guard.sql) || !/\bRETURNING\b/i.test(guard.sql) || !Array.isArray(statements)) {
      throw new Error("Guard must be an owned UPDATE ... RETURNING statement");
    }
    const job = {guard: ownedStatement(guard), statements: statements.map(ownedStatement), after};
    if (this.groupWrites) {
      return new Promise((resolve, reject) => {
        this.writeQueue.push({...job, resolve, reject});
        this.scheduleWriteDrain();
      });
    }
    let pause;
    while ((pause = this.yieldForIO())) await pause;
    this.sqlite.exec("BEGIN IMMEDIATE");
    let result, durable = null;
    try {
      this.checkSchema(); this.batchSchemaChecked = true;
      this.sqlite.exec("SAVEPOINT request_batch");
      result = this.executeGuardedJob(job);
      this.sqlite.exec(job.guardedRejected ? "ROLLBACK TO request_batch; RELEASE request_batch" : "RELEASE request_batch");
      this.commitWrites();
      this.writeStats.guardedJobs++;
      if (job.guardedRejected) this.writeStats.guardedRejected++;
      durable = this.durableAfterCommit();
    } catch (error) {
      if (this.sqlite.isTransaction) this.sqlite.exec("ROLLBACK");
      throw error;
    } finally { this.batchSchemaChecked = false; }
    if (durable) await durable;
    return result;
  }
  executeGuardedJob(job) {
    // Checking result columns before execution rejects misleading RETURNING
    // text in comments/literals without performing the UPDATE itself.
    if (!this.compiled(job.guard.sql).columns().length) throw new Error("Guard must return rows");
    const guard = this.execute(job.guard);
    job.guardedRejected = guard.results.length === 0;
    const results=job.guardedRejected ? [] : job.statements.map(statement => this.execute(statement));
    if(!job.guardedRejected&&job.after){const value=job.after(results);if(value&&typeof value.then==='function')throw Error('Atomic combat completion must be synchronous');}
    return {guard, results};
  }
  async combatHit(guard,plans,{durableCast473=false,onPendingR13}={}){
    const runeHealth485=this.runeV2HealthFence485;if(runeHealth485&&plans.some(p=>p.target.id===runeHealth485.id||runeHealth485.ids?.includes(p.target.id)))await runeHealth485.promise;
    let statements=plans.flatMap(p=>p.hitStatements);const store=this.combat;
    if(durableCast473)recordCombatPath477('durable_cast');
    if(!store&&!this.channelCompute&&!durableCast473)recordCombatPath477('disabled');
    const memory=durableCast473?null:this.channelCompute?await this.channelCompute.combat(guard,plans):store?.tryBatch(statements,{guard,hitPlans:plans});
    if(memory)return memory;
    // Eligibility is decided against current HP under the existing memory
    // transaction. Only a rejected fast path materializes durable kill plans;
    // the already rolled damage and target identity are retained exactly once.
    for(const plan of plans)plan.prepareDurable?.();
    statements=plans.flatMap(p=>p.hitStatements);
    if(!store?.enabled)return this.guardedBatch(guard,statements);
    const locked=plans.map(p=>p.target.id);for(const id of locked)store.locks.set(id,(store.locks.get(id)??0)+1);
    const started=performance.now();let kills=0,pending;
    try{
      pending=this.guardedBatch(guard,statements,results=>{
        let offset=0;
        for(const plan of plans){const row=results[offset+plan.healthResultIndex]?.results[0];if(row&&row.hp<=0){kills++;}offset+=plan.hitStatements.length;}
      });
      for(const id of locked){let waits=store.barriers.get(id);if(!waits)store.barriers.set(id,waits=new Set());waits.add(pending);}
      // Advisory callback after the existing write/barrier is installed. The
      // original promise, actor work, epoch check and durable ACK stay intact.
      if(perfR13Features.enabled('asyncCombatPending')&&typeof onPendingR13==='function'){
        const provisional=pendingCombatR13(store,plans);
        if(provisional)try{onPendingR13(provisional);}catch{}
      }
      const result=await pending;
      if(result.guard.results.length){store.stats.hits+=plans.length;store.stats.kills+=kills;}else store.stats.rejected++;
      if(kills)store.stats.killCommitMaxMs=Math.max(store.stats.killCommitMaxMs,performance.now()-started);
      return result;
    }catch(error){store.stats.errors++;throw error;}finally{for(const id of locked){const waits=store.barriers.get(id);waits?.delete(pending);if(!waits?.size)store.barriers.delete(id);const n=store.locks.get(id)-1;if(n)store.locks.set(id,n);else store.locks.delete(id);}}
  }
  async combatBatch(statements,playerId){
    if(this.combat?.enabled&&playerId){this.combat.syncEntity('players',playerId);this.combat.syncEntity('pve_engagements',playerId);}
    const result=this.channelCompute&&playerId?await this.channelCompute.combatBatch(statements,playerId):this.combat?.tryBatch(statements);return result??this.batch(statements);
  }
  scheduleWriteDrain() {
    if (this.writeDrain || !this.writeQueue.length) return;
    this.writeDrain = setImmediate(() => combatContext.run(false, () => this.drainWrites()));
  }
  // Main-process-only transaction entry for channel ownership and IPC receipts.
  // The callback cannot await or escape the existing bounded durable write lane.
  atomic(task, {timing} = {}) {
    this.assertAvailable();
    if (typeof task !== 'function' || task.constructor?.name === 'AsyncFunction') return Promise.reject(new TypeError('Synchronous atomic callback required'));
    return new Promise((resolve, reject) => {
      this.writeQueue.push({atomic: task, resolve, reject, timing, queuedAt477: performance.now()});
      this.scheduleWriteDrain();
    });
  }
  commitWrites() {
    const started = performance.now();
    try { this.sqlite.exec("COMMIT"); this.writeStats.commits++; if(this.positions?.doubleBuffer)this.memoryFlush=null; }
    catch (error) { this.writeStats.commitErrors++; throw error; }
    finally {
      const elapsed = performance.now() - started;
      this.lastCommitMs477 = elapsed;
      this.writeStats.totalCommitMs += elapsed;
      this.writeStats.maxCommitMs = Math.max(this.writeStats.maxCommitMs, elapsed);
      reportRuntimeWork('main_commit',elapsed,performance.timeOrigin+started);
      if(elapsed>=50)workDiagnostic477('native_commit_timing',{startedAtMs:Math.round(performance.timeOrigin+started),endedAtMs:Date.now(),durationMs:Math.round(elapsed*1000)/1000,scope:'synchronous-SQLite-COMMIT-wall; may-include-automatic-checkpoint-on-fallback; not-request-causality'});
    }
  }
  drainWrites() {
    const started=performance.now();
    this.writeDrain = null;
    const settled = [];
    let transaction = false, durable = null, committedAt477 = null;
    const batchId477 = `${process.pid}-${++this.writeGroupSequence477}`;
    try {
      this.assertAvailable();
      this.sqlite.exec("BEGIN IMMEDIATE"); transaction = true;
      this.checkSchema({writer:true}); this.batchSchemaChecked = true;
      const deadline = performance.now() + 3;
      do {
        const job = this.writeQueue.shift();
        settled.push(job);
        const jobStarted477 = performance.now();
        if (job.timing) {
          job.timing.batchId = batchId477;
          job.timing.queueMs = jobStarted477 - job.queuedAt477;
        }
        this.sqlite.exec("SAVEPOINT request_batch");
        try {
          const perform = () => job.atomic ? job.atomic(this.sqlite)
            : job.guard ? this.executeGuardedJob(job) : job.statements.map(statement => this.execute(statement));
          const scoped=()=>withPreparedStatements477(this.sqlite,perform,{schemaChecked:true});
          job.results = job.timing ? measureWriterSql477(this.sqlite, scoped, job.timing) : scoped();
          if (job.results && typeof job.results.then === 'function') throw new Error('Atomic callback must be synchronous');
          this.sqlite.exec(job.guardedRejected ? "ROLLBACK TO request_batch; RELEASE request_batch" : "RELEASE request_batch");
        } catch (error) {
          job.error = error;
          if (!this.sqlite.isTransaction) throw error;
          this.sqlite.exec("ROLLBACK TO request_batch; RELEASE request_batch");
        } finally {
          if (job.timing) job.timing.jobMs = performance.now() - jobStarted477;
        }
      } while (this.writeQueue.length && settled.length < 8 && performance.now() < deadline);
      this.commitWrites(); transaction = false;
      this.writerGroups477?.record(settled.length);
      committedAt477 = performance.now();
      for (const job of settled) if (job.timing) {
        job.timing.batchSize = settled.length;
        job.timing.transactionMs = committedAt477 - started;
        job.timing.commitMs = this.lastCommitMs477;
      }
      durable = this.durableAfterCommit();
      this.writeStats.groupedJobs += settled.length;
      for (const job of settled) if (job.guard && !job.error) {
        this.writeStats.guardedJobs++;
        if (job.guardedRejected) this.writeStats.guardedRejected++;
      }
    } catch (error) {
      if (transaction && this.sqlite.isTransaction) {
        try { this.sqlite.exec("ROLLBACK"); } catch {}
      }
      for (const job of settled) job.error = error;
      if (this.closed || this.maintenance || !settled.length) {
        for (const job of this.writeQueue.splice(0)) settled.push({...job, error});
      }
    } finally {
      this.batchSchemaChecked = false;
      reportRuntimeWork('main_write_group',performance.now()-started,performance.timeOrigin+started);
    }
    // Socket callbacks get a turn between bounded groups, including failures.
    // With the asynchronous WAL flush, the next group starts immediately while
    // this group's acknowledgements wait for their own durable flush.
    const settle = durability => {
      const at477 = performance.now();
      for (const job of settled) {
        if (job.timing && committedAt477 !== null) {
          job.timing.durableMs = durable ? at477 - committedAt477 : 0;
          job.timing.durabilityMode = durability?.durabilityMode ?? (durable ? 'unknown' : 'sqlite-full');
          if (Number.isFinite(durability?.fsyncWaitMs)) job.timing.fsyncWaitMs = durability.fsyncWaitMs;
          if (durability?.flushId) job.timing.flushId = durability.flushId;
        }
        job.error ? job.reject(job.error) : job.resolve(job.results);
      }
    };
    if (durable) durable.then(settle, error => { for (const job of settled) job.reject(error); });
    else settle();
    this.scheduleWriteDrain();
  }
  async readWorldSnapshot(statements, options) {
    const perfStarted477=performance.now();try{
    this.assertAvailable();
    // Only explicitly requested world reads use the dedicated connection.
    // Never move writes, authorization, or a read inside a writer transaction.
    const eligible=!this.sqlite.isTransaction && statements.length>0 && statements.every(statement =>
      statement instanceof LocalStatement && statement.database===this && /^\s*SELECT\b/i.test(statement.sql));
    if(eligible && this.worldReadPool){
      const pending=this.worldReadPool.read(statements.map(statement=>({sql:statement.sql,params:statement.params})),options);
      if(pending!==null){const results=await pending;this.assertAvailable();return results;}
    }
    const metadataMode=eligible&&statements.every(statement=>isWorldSnapshotMetadataSql(statement.sql))?worldSnapshotMetadataMode:undefined;
    return await this.batch(statements,metadataMode);
    }finally{perfStage477('world_snapshot_wall',performance.now()-perfStarted477);}
  }
  async exec(sql) {
    let pause;
    while ((pause = this.yieldForIO())) await pause;
    const started = performance.now();
    this.sqlite.exec(sql);
    this.clearStatements();
    if (!this.sqlite.isTransaction) { const durable = this.durableAfterCommit(); if (durable) await durable; }
    return { count: 1, duration: performance.now() - started };
  }
  async backup(path) { await backupInOneStep(this.sqlite, path); }
  close() {
    this.closed = true;
    if (this.writeDrain) clearImmediate(this.writeDrain);
    this.writeDrain = null;
    for (const job of this.writeQueue.splice(0)) job.reject(new Error("Database closed"));
    void this.worldReadPool?.close(); void this.walSync?.close(); this.clearStatements(); this.sqlite.close();
  }
}

class LocalStatement {
  constructor(database, sql, params) { this.database = database; this.sql = sql; this.params = params; }
  bind(...params) {
    const bound = params.map(value => {
      if (value === null || typeof value === "string" || typeof value === "number") return value;
      if (value instanceof ArrayBuffer) return new Uint8Array(value);
      if (value instanceof Uint8Array) return value;
      if (Array.isArray(value) && value.every(v => Number.isInteger(v) && v >= 0 && v <= 255)) return new Uint8Array(value);
      throw new Error("Unsupported SQLite bind value");
    });
    return new LocalStatement(this.database, this.sql, bound);
  }
  async all() { return this.database.executeAsync(this); }
  async run() { return this.database.executeAsync(this); }
  async first(column) {
    const row = (await this.database.executeAsync(this)).results[0];
    if (!row) return null;
    if (column === undefined) return row;
    if (!Object.hasOwn(row, column)) throw new Error("Unknown result column");
    return row[column];
  }
  async raw(options = {}) {
    let pause;
    while ((pause = this.database.yieldForIO())) await pause;
    const statement = this.database.compiled(this.sql);
    // Execute before reading columns: SQLite may recompile after schema changes.
    const result = statement.all(...this.params);
    const names = statement.columns().map(column => column.name);
    const rows = result.map(row => names.map(name => row[name]));
    return options.columnNames ? [names, ...rows] : rows;
  }
}
