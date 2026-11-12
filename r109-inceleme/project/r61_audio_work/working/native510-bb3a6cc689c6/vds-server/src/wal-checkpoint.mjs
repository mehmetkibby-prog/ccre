import {workDiagnostic477} from './work-diagnostics477.mjs';
import { Worker } from 'node:worker_threads';

// SQLite's WAL-reset race was fixed in 3.51.3, with these two backports.
// Older runtimes keep their original connection-local automatic checkpoints.
export function supportsConcurrentCheckpoint(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version));
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  return major > 3 || (major === 3 && (minor > 51 || (minor === 51 && patch >= 3) || (minor === 50 && patch >= 7) || (minor === 44 && patch >= 6)));
}

// One small independent worker removes checkpoint copying/sync from the HTTP
// thread. Individual FULL commits still sync before their promises resolve.
// A stuck reader can prevent any PASSIVE checkpoint (including SQLite's normal
// automatic one) from finishing. Observe that backlog and fall back rather than
// silently leave automatic checkpoints disabled on a failed worker.
export class WalCheckpoint {
  constructor(databasePath, { intervalMs = 1000, deadlineMs = 10000, startupMs = 5000, maxPendingPages = 16384,
    sqliteVersion = process.versions.sqlite, workerFile = new URL('./wal-checkpoint-worker.mjs', import.meta.url), onFallback = () => {} } = {}) {
    if (!databasePath || databasePath === ':memory:') throw new Error('Checkpoint worker requires a file database');
    for (const [name, value] of Object.entries({ intervalMs, deadlineMs, startupMs, maxPendingPages })) {
      if (!Number.isFinite(value) || value < 1) throw new Error(`Invalid checkpoint ${name}`);
    }
    this.connections = new Map(); this.available = false; this.closed = false; this.failure = null;
    this.serial = 0; this.pending = null; this.deadlineMs = deadlineMs; this.maxPendingPages = maxPendingPages; this.onFallback = onFallback;
    this.stats = { completed: 0, busy: 0, durationMs: 0, maxDurationMs: 0, logPages: 0, checkpointedPages: 0, pendingPages: 0, pageSize: 0, lastCompletedAtMs: 0 };
    this.sqliteVersion = sqliteVersion;
    this.ready = new Promise(resolve => { this.resolveReady = resolve; });
    if (!supportsConcurrentCheckpoint(sqliteVersion)) {
      this.failure = 'sqlite-version'; this.resolveReady(false); return;
    }
    try { this.worker = new Worker(workerFile, { workerData: { databasePath } }); }
    catch { this.fail('worker-start'); return; }
    this.worker.on('error', () => this.fail('worker-error'));
    this.worker.on('messageerror', () => this.fail('worker-message'));
    this.worker.on('exit', () => { if (!this.closed && !this.failure) this.fail('worker-exit'); });
    this.worker.on('message', message => {
      if (this.closed || this.failure) return;
      if (message?.ready) {
        if (!supportsConcurrentCheckpoint(message.sqliteVersion)) { this.fail('worker-sqlite-version'); return; }
        clearTimeout(this.startupTimer);
        this.stats.pageSize = Number(message.pageSize) || 0;
        try { for (const database of this.connections.keys()) database.exec('PRAGMA wal_autocheckpoint=0'); }
        catch { this.fail('connection-configuration'); return; }
        this.available = true; this.resolveReady(true);
        this.timer = setInterval(() => { void this.check(); }, intervalMs); this.timer.unref();
        this.worker.unref();
        return;
      }
      if (!this.pending || message?.id !== this.pending.id) return;
      if (message.error) { this.fail('checkpoint-error'); return; }
      if (![message.log, message.checkpointed].every(value => Number.isSafeInteger(value) && value >= -1)
        || ![0, 1].includes(message.busy) || !Number.isFinite(message.durationMs) || message.durationMs < 0) {
        this.fail('checkpoint-result'); return;
      }
      const task = this.pending; this.pending = null; clearTimeout(task.timer);
      if(message.durationMs>=50&&Number.isSafeInteger(message.startedAtMs477)&&Number.isSafeInteger(message.endedAtMs477))workDiagnostic477('native_checkpoint_timing',{startedAtMs:message.startedAtMs477,endedAtMs:message.endedAtMs477,receivedAtMs:Date.now(),durationMs:Math.round(message.durationMs*1000)/1000,busy:message.busy,logPages:message.log,checkpointedPages:message.checkpointed,scope:'worker-PASSIVE-checkpoint-wall; temporal-overlap-is-not-request-causality'});
      this.worker.unref();
      Object.assign(this.stats, { completed: this.stats.completed + 1, busy: this.stats.busy + (message.busy ? 1 : 0),
        durationMs: message.durationMs, maxDurationMs: Math.max(this.stats.maxDurationMs, message.durationMs),
        logPages: Math.max(0, message.log), checkpointedPages: Math.max(0, message.checkpointed),
        pendingPages: Math.max(0, message.log - message.checkpointed), lastCompletedAtMs: Date.now() });
      if (this.stats.pendingPages > this.maxPendingPages) this.fail('checkpoint-backlog');
      task.resolve(!this.failure);
    });
    this.startupTimer = setTimeout(() => this.fail('worker-start-timeout'), startupMs); this.startupTimer.unref();
  }
  register(database, { externallyDurable = false } = {}) {
    if (this.closed || this.failure || this.connections.has(database)) return () => {};
    const original = Number(database.prepare('PRAGMA wal_autocheckpoint').get().wal_autocheckpoint);
    // externallyDurable: synchronous=NORMAL whose acknowledgements wait for a
    // separate WAL fsync (wal-sync.mjs). NORMAL still syncs around checkpoints.
    const durable = Number(database.prepare('PRAGMA synchronous').get().synchronous) >= (externallyDurable ? 1 : 2);
    if (!durable || !Number.isInteger(original) || original < 1) throw new Error('Checkpoint isolation requires durable automatic-checkpoint connections');
    this.connections.set(database, original);
    if (this.available) database.exec('PRAGMA wal_autocheckpoint=0');
    return () => {
      if (!this.connections.has(database)) return;
      try { database.exec(`PRAGMA wal_autocheckpoint=${original}`); } finally { this.connections.delete(database); }
    };
  }
  check() {
    if (!this.available || this.failure || this.closed) return Promise.resolve(false);
    if (this.pending) return this.pending.promise;
    const task = { id: ++this.serial };
    task.promise = new Promise(resolve => { task.resolve = resolve; });
    this.pending = task;
    this.worker.ref();
    task.timer = setTimeout(() => this.fail('checkpoint-timeout'), this.deadlineMs); task.timer.unref();
    try { this.worker.postMessage({ type: 'checkpoint', id: task.id }); }
    catch { this.fail('worker-message'); }
    return task.promise;
  }
  restore() {
    for (const [database, original] of this.connections) {
      try { database.exec(`PRAGMA wal_autocheckpoint=${original}`); } catch { /* A stopped service may already have closed this connection. */ }
    }
    this.connections.clear();
  }
  fail(reason) {
    if (this.closed || this.failure) return;
    this.failure = reason; this.available = false;
    clearTimeout(this.startupTimer); clearInterval(this.timer); this.restore(); this.resolveReady(false);
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.resolve(false); this.pending = null; }
    try { this.onFallback(reason); } catch { /* Diagnostics cannot disable the fallback. */ }
    void this.worker?.terminate();
  }
  snapshot() {
    return { protocol: 'passive-wal-worker-v1', sqliteVersion: this.sqliteVersion, ready: this.available && !this.failure && !this.closed,
      fallback: this.failure, connections: this.connections.size, running: Boolean(this.pending), ...this.stats };
  }
  close() {
    if (this.closePromise) return this.closePromise;
    this.closed = true; this.available = false;
    clearTimeout(this.startupTimer); clearInterval(this.timer); this.restore(); this.resolveReady(false);
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.resolve(false); this.pending = null; }
    this.closePromise = this.worker?.terminate().then(() => undefined) ?? Promise.resolve();
    return this.closePromise;
  }
}
