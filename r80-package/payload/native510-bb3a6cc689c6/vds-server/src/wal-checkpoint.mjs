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
    sqliteVersion = process.versions.sqlite, workerFile = new URL('./wal-checkpoint-worker.mjs', import.meta.url), onFallback = () => {},
    onReady = () => {}, standbyOnStart = false, probeIntervalMs = 30000, probeMaxIntervalMs = 300000, probeHealthyPasses = 2 } = {}) {
    if (!databasePath || databasePath === ':memory:') throw new Error('Checkpoint worker requires a file database');
    for (const [name, value] of Object.entries({ intervalMs, deadlineMs, startupMs, maxPendingPages, probeIntervalMs, probeMaxIntervalMs })) {
      if (!Number.isFinite(value) || value < 1) throw new Error(`Invalid checkpoint ${name}`);
    }
    if (typeof standbyOnStart !== 'boolean' || !Number.isSafeInteger(probeHealthyPasses) || probeHealthyPasses < 1 || probeHealthyPasses > 10 || probeMaxIntervalMs < probeIntervalMs) throw new Error('Invalid checkpoint recovery probe');
    this.connections = new Map(); this.available = false; this.closed = false; this.failure = null;
    this.serial = 0; this.pending = null; this.deadlineMs = deadlineMs; this.maxPendingPages = maxPendingPages; this.onFallback = onFallback; this.onReady = onReady;
    this.intervalMs = intervalMs; this.standbyOnStart = standbyOnStart; this.probing = false; this.initialized = false;
    this.probeIntervalMs = probeIntervalMs; this.probeMaxIntervalMs = probeMaxIntervalMs; this.probeHealthyPasses = probeHealthyPasses;
    this.probeDelayMs = probeIntervalMs; this.probeAttempts = 0; this.probeHealthy = 0; this.nextProbeAtMs = null;
    this.stats = { completed: 0, busy: 0, durationMs: 0, maxDurationMs: 0, logPages: 0, checkpointedPages: 0, pendingPages: 0, pageSize: 0, lastCompletedAtMs: 0 };
    this.sqliteVersion = sqliteVersion;
    this.ready = new Promise(resolve => { this.resolveReady = resolve; });
    if (!supportsConcurrentCheckpoint(sqliteVersion)) {
      this.failure = 'sqlite-version'; this.resolveReady(false); return;
    }
    try { this.worker = new Worker(workerFile, { workerData: { databasePath } }); }
    catch { this.fail('worker-start'); return; }
    this.exited = false;
    this.exitPromise = new Promise(resolve => { this.resolveExit = resolve; });
    this.worker.on('error', () => this.fail('worker-error'));
    this.worker.on('messageerror', () => this.fail('worker-message'));
    this.worker.once('exit', () => { this.exited = true; this.resolveExit(); if (!this.closed && !this.failure) this.fail('worker-exit'); });
    this.worker.on('message', message => {
      if (this.closed || this.failure) return;
      if (message?.ready) {
        if (this.initialized) { this.fail('worker-message'); return; }
        if (!supportsConcurrentCheckpoint(message.sqliteVersion)) { this.fail('worker-sqlite-version'); return; }
        clearTimeout(this.startupTimer);
        this.initialized = true;
        this.stats.pageSize = Number(message.pageSize) || 0;
        // Recovery begins with automatic checkpoints still enabled. One quiet
        // worker probes a pinned reader instead of repeatedly creating threads.
        if (this.standbyOnStart) { this.probing = true; void this.check(); }
        else this.activate();
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
      if (this.probing) {
        // A busy/unknown result is not evidence that the backlog has cleared.
        // Two complete passes, separated by a quiet interval, avoid flapping.
        const healthy = message.busy === 0 && message.log >= 0 && message.checkpointed === message.log;
        this.probeAttempts++; this.probeHealthy = healthy ? this.probeHealthy + 1 : 0;
        if (this.probeHealthy >= this.probeHealthyPasses) this.activate();
        else this.scheduleProbe(healthy);
      } else if (this.stats.pendingPages > this.maxPendingPages) this.fail('checkpoint-backlog');
      task.resolve(this.available && !this.failure);
    });
    this.startupTimer = setTimeout(() => this.fail('worker-start-timeout'), startupMs); this.startupTimer.unref();
  }
  activate() {
    if (this.closed || this.failure || this.available) return;
    try { for (const database of this.connections.keys()) database.exec('PRAGMA wal_autocheckpoint=0'); }
    catch { this.fail('connection-configuration'); return; }
    clearTimeout(this.probeTimer); this.nextProbeAtMs = null; this.probing = false;
    this.available = true; this.resolveReady(true);
    this.timer = setInterval(() => { void this.check(); }, this.intervalMs); this.timer.unref();
    this.worker.unref();
    try { this.onReady(); } catch { /* Observation cannot invalidate a ready worker. */ }
  }
  scheduleProbe(healthy) {
    if (this.closed || this.failure || !this.probing) return;
    clearTimeout(this.probeTimer);
    if (healthy) this.probeDelayMs = this.probeIntervalMs;
    const delay = this.probeDelayMs;
    if (!healthy) this.probeDelayMs = Math.min(this.probeMaxIntervalMs, delay * 2);
    this.nextProbeAtMs = Date.now() + delay;
    this.probeTimer = setTimeout(() => { this.nextProbeAtMs = null; void this.check(); }, delay);
    this.probeTimer.unref();
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
    if ((!this.available && !this.probing) || !this.initialized || this.failure || this.closed) return Promise.resolve(false);
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
    this.failure = reason; this.available = false; this.probing = false;
    clearTimeout(this.startupTimer); clearInterval(this.timer); clearTimeout(this.probeTimer); this.nextProbeAtMs = null; this.restore(); this.resolveReady(false);
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.resolve(false); this.pending = null; }
    try { this.onFallback(reason); } catch { /* Diagnostics cannot disable the fallback. */ }
    void this.stopWorker().catch(() => {});
  }
  stopWorker() {
    if (this.terminationPromise) return this.terminationPromise;
    if (!this.worker || this.exited) return this.terminationPromise = Promise.resolve();
    // A replacement may start only after both termination and the actual exit
    // event. A failed termination leaves the supervisor in safe fallback.
    try { this.terminationPromise = this.worker.terminate().then(() => this.exitPromise).then(() => undefined); }
    catch (error) { this.terminationPromise = Promise.reject(error); }
    return this.terminationPromise;
  }
  snapshot() {
    return { protocol: 'passive-wal-worker-v1', sqliteVersion: this.sqliteVersion, ready: this.available && !this.failure && !this.closed,
      fallback: this.failure, connections: this.connections.size, running: Boolean(this.pending), ...this.stats,
      recoveryProbe: { active: this.probing, attempts: this.probeAttempts, healthyPasses: this.probeHealthy,
        requiredHealthyPasses: this.probeHealthyPasses, nextProbeAtMs: this.nextProbeAtMs } };
  }
  close() {
    if (this.closePromise) return this.closePromise;
    this.closed = true; this.available = false; this.probing = false;
    clearTimeout(this.startupTimer); clearInterval(this.timer); clearTimeout(this.probeTimer); this.nextProbeAtMs = null; this.restore(); this.resolveReady(false);
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.resolve(false); this.pending = null; }
    this.closePromise = this.stopWorker();
    return this.closePromise;
  }
}
