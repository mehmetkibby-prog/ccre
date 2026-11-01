import { Worker } from 'node:worker_threads';

// The default remains one reader. Extra readers are an explicit deployment
// experiment, never extra authorities: every worker opens the same WAL file
// read-only and the HTTP process retains authentication and the sole game owner.
export class WorldReadPool {
  constructor(databasePath, { maxQueued = 128, pipelineDepth = 1, workers = 1, positions, combat, workerFile = new URL('./world-read-worker.mjs', import.meta.url) } = {}) {
    if (!databasePath || databasePath === ':memory:') throw new Error('World reader requires an existing file database');
    if (!Number.isInteger(maxQueued) || maxQueued < 0 || maxQueued > 1024) throw new Error('Invalid world reader queue limit');
    if (!Number.isInteger(pipelineDepth) || pipelineDepth < 1 || pipelineDepth > 8) throw new Error('Invalid world reader pipeline depth');
    if (!Number.isInteger(workers) || workers < 1 || workers > 3) throw new Error('World reader workers must be 1, 2 or 3');
    this.positions = positions;
    this.combat = combat;
    this.queue = []; this.pending = new Map(); this.serial = 0; this.closed = false; this.available = false;
    // Preserve the existing GLOBAL accepted-work ceiling (129 by default),
    // independent of worker count. A pipeline slot is not an extra queue budget.
    this.maxQueued = maxQueued; this.pipelineDepth = Math.min(pipelineDepth, maxQueued + 1); this.failure = null;
    this.workers = []; this.workerStates = []; this.nextWorker = 0;
    // Statement text is posted to each worker once, then referenced by id.
    this.sqlIds = new Map(); this.nextSqlId = 0; this.validSql = new Set();
    this.stats = { completed: 0, dispatched: 0, rejected: 0, queueMs: 0, executionMs: 0, sharedQueries: 0, rosterQueriesSaved: 0,
      workers, inflight: 0, peakQueued: 0 };
    this.ready = new Promise((resolve, reject) => { this.resolveReady = resolve; this.rejectReady = reject; });
    this.ready.catch(() => {});
    try {
      for (let index = 0; index < workers; index++) {
        const worker = new Worker(workerFile, { workerData: { databasePath, readerIndex: index, memoryPositions: Boolean(positions?.enabled),memoryCombat:Boolean(combat?.enabled) } });
        const state = { worker, ready: false, pending: new Set(), knownSql: new Set(), combatCursor: this.combat?.enabled ? this.combat.createProjectionCursor() : null };
        this.workers.push(worker); this.workerStates.push(state);
        // Preserve the established single-worker diagnostic/test surface.
        this.worker ??= worker;
        worker.on('error', error => this.fail(error));
        worker.on('messageerror', () => this.fail(new Error('World reader returned an invalid message')));
        worker.on('exit', code => { if (!this.closed && !this.failure) this.fail(new Error(`World reader ${index} exited (${code})`)); });
        worker.on('message', message => this.receive(state, message));
      }
    } catch (error) { this.fail(error); }
  }
  receive(state, message) {
    if (this.closed || this.failure) return;
    if (!message || typeof message !== 'object') { this.fail(new Error('World reader returned an invalid message')); return; }
    if (message.ready) {
      state.ready = true;
      if (this.workerStates.length === this.stats.workers && this.workerStates.every(worker => worker.ready)) {
        this.available = true; this.resolveReady(); this.dispatch();
      }
      return;
    }
    const task = this.pending.get(message.id);
    if (!task) return;
    if (task.workerState !== state || (!message.error && !Array.isArray(message.results))) {
      this.fail(new Error('World reader returned an invalid task result')); return;
    }
    this.pending.delete(message.id); state.pending.delete(message.id); this.updateStats();
    this.stats.completed++;
    this.stats.sharedQueries += Number(message.sharedQueries) || 0;
    this.stats.rosterQueriesSaved += Number(message.rosterQueriesSaved) || 0;
    // Start of the worker's WAL snapshot, not result receipt or serialization.
    this.stats.queueMs = Math.max(task.queueMs, (Number(message.snapshotAtMs) || task.enteredAtMs) - task.enteredAtMs);
    this.stats.executionMs = Number(message.executionMs) || 0;
    if (message.error) task.reject(new Error(message.error));
    else {
      Object.defineProperty(message.results, 'snapshotAtMs', { value: message.snapshotAtMs, enumerable: false });
      Object.defineProperty(message.results, 'playersProjected', { value: message.playersProjected === true, enumerable: false });
      if (task.onTiming) {
        try { task.onTiming({ queueMs: this.stats.queueMs, executionMs: this.stats.executionMs, totalMs: performance.now() - task.entered }); } catch { /* Diagnostics never affect gameplay. */ }
      }
      if(this.positions?.enabled && task.projection){
        const result=message.results[task.projection.playersIndex];
        result.results=this.positions.mergeRows(result.results,{enteredAtMs:task.enteredAtMs});
      }
      if(this.combat?.enabled)for(const result of message.results)result.results=this.combat.mergeRows(result.results,{enteredAtMs:task.enteredAtMs});
      task.resolve(message.results);
    }
    this.dispatch();
  }
  get queued() {
    // Each worker can execute one snapshot; other posted pipeline entries wait
    // there, and unposted entries wait in the one global queue.
    return this.queue.length + this.workerStates.reduce((sum, state) => sum + Math.max(0, state.pending.size - 1), 0);
  }
  get busy() { return this.pending.size + this.queue.length > 0; }
  updateStats() {
    this.stats.inflight = this.pending.size;
    this.stats.peakQueued = Math.max(this.stats.peakQueued, this.queued);
  }
  read(statements, { onTiming, projection } = {}) {
    // Null is returned only before admission/dispatch. Accepted work is never
    // replayed on another worker or the HTTP thread after failure.
    if (this.closed || this.failure || this.queue.length + this.pending.size >= this.maxQueued + 1) {
      this.stats.rejected++; return null;
    }
    if (!Array.isArray(statements) || !statements.length || statements.length > 64 || statements.some(item =>
      !item || typeof item.sql !== 'string' || !Array.isArray(item.params) || !this.selectOnly(item.sql))) {
      return Promise.reject(new Error('World reader accepts only independent SELECT snapshots'));
    }
    // Own the bind values (the same values structuredClone would copy); the SQL
    // strings are immutable and are posted by id after their first use.
    const owned = statements.map(item => ({ sql: item.sql, params: item.params.map(value => value instanceof Uint8Array ? value.slice() : value) }));
    const id = ++this.serial, entered = performance.now(), enteredAtMs = Date.now();
    const ownedProjection = projection ? structuredClone(projection) : undefined;
    const result = new Promise((resolve, reject) => { this.queue.push({ id, statements: owned, projection: ownedProjection, entered, enteredAtMs, resolve, reject, onTiming }); });
    this.dispatch(); this.updateStats();
    return result;
  }
  selectOnly(sql) {
    if (this.validSql.has(sql)) return true;
    const ok = /^\s*SELECT\b/i.test(sql) && !/\b(?:changes|last_insert_rowid)\s*\(/i.test(sql);
    if (ok) { if (this.validSql.size >= 512) this.validSql.clear(); this.validSql.add(sql); }
    return ok;
  }
  encodeStatements(state, statements) {
    if (this.sqlIds.size >= 1024) {
      // Bounded: forget every mapping. Messages to one worker are FIFO, so the
      // reset is applied before any later task that re-sends the text.
      this.sqlIds.clear();
      for (const worker of this.workerStates) { worker.knownSql.clear(); worker.worker.postMessage({ forgetSql: true }); }
    }
    return statements.map(({ sql, params }) => {
      let sqlId = this.sqlIds.get(sql);
      if (sqlId === undefined) { sqlId = ++this.nextSqlId; this.sqlIds.set(sql, sqlId); }
      if (state.knownSql.has(sqlId)) return { i: sqlId, params };
      state.knownSql.add(sqlId);
      return { i: sqlId, sql, params };
    });
  }
  dispatch() {
    if (this.closed || this.failure || !this.available) return;
    while (this.queue.length) {
      let selected = null, selectedIndex = -1;
      // Least posted work wins; rotate equal-depth choices to distribute even
      // sequential reads. Each worker retains its existing serial WAL grouping.
      for (let offset = 0; offset < this.workerStates.length; offset++) {
        const index = (this.nextWorker + offset) % this.workerStates.length;
        const candidate = this.workerStates[index];
        if (candidate.ready && candidate.pending.size < this.pipelineDepth && (!selected || candidate.pending.size < selected.pending.size)) {
          selected = candidate; selectedIndex = index;
        }
      }
      if (!selected) break;
      this.nextWorker = (selectedIndex + 1) % this.workerStates.length;
      const task = this.queue.shift(); task.queueMs = performance.now() - task.entered; task.workerState = selected;
      this.pending.set(task.id, task); selected.pending.add(task.id);
      try {
        selected.worker.postMessage({ id: task.id, statements: this.encodeStatements(selected, task.statements), projection: task.projection, positions: this.positions?.enabled ? this.positions.projection() : undefined,combat:this.combat?.enabled?this.combat.projectionDelta(selected.combatCursor):undefined });
        this.stats.dispatched++;
      } catch (error) { this.fail(error); return; }
    }
    this.updateStats();
  }
  rejectAccepted(error) {
    for (const task of this.pending.values()) task.reject(error);
    this.pending.clear();
    for (const state of this.workerStates) state.pending.clear();
    while (this.queue.length) this.queue.shift().reject(error);
    this.updateStats();
  }
  terminateWorkers() {
    for (const state of this.workerStates) if(state.combatCursor){this.combat.releaseProjectionCursor(state.combatCursor);state.combatCursor=null;}
    return this.terminationPromise ??= Promise.allSettled(this.workers.map(worker => worker.terminate())).then(() => undefined);
  }
  fail(error) {
    if (this.failure || this.closed) return;
    this.failure = error; this.available = false; this.rejectReady(error);
    this.rejectAccepted(error);
    void this.terminateWorkers();
  }
  async close() {
    if (this.closePromise) return this.closePromise;
    this.closed = true; this.available = false;
    const error = new Error('World reader is closing'); this.rejectReady(error);
    this.rejectAccepted(error);
    this.closePromise = this.terminateWorkers();
    return this.closePromise;
  }
}
