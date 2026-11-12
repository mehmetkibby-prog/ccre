import {workDiagnostic477} from './work-diagnostics477.mjs';
import { open, stat } from 'node:fs/promises';
import { openSync, fsyncSync, closeSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

// Durable group commit without blocking the HTTP thread.
//
// With journal_mode=WAL and synchronous=FULL, every COMMIT on the main
// connection performs fsync() synchronously, so the whole Node process (auth,
// sockets, JSON, the next commit group) stops while the disk flushes. Under a
// crowd this is the dominant main-thread cost, and on a small VDS disk it is
// the direct cause of multi-hundred-millisecond HTTP queues.
//
// Here the main connection commits with synchronous=NORMAL (the WAL frames are
// written to the OS, not yet flushed) and this helper flushes the same WAL inode
// with FileHandle.sync(), which runs on libuv's thread pool. Callers resolve a
// request ONLY after a flush that started after their COMMIT has completed, so
// no player-visible acknowledgement is ever sent before the data is on disk: the
// acknowledgement guarantee is the same as FULL. Concurrent commit groups share
// one flush, and the main thread keeps serving requests while the disk works.
//
// Any failure is reported to the owner, which permanently restores FULL.
export class WalSync {
  constructor(walPath, { onFailure = () => {} } = {}) {
    this.walPath = walPath; this.onFailure = onFailure;
    this.handle = null; this.inode = null; this.checkedAt = -Infinity;
    this.waiting = []; this.running = null; this.failed = null; this.closed = false;
    this.tracePrefix = randomBytes(8).toString('hex'); this.traceSequence = 0;
    this.stats = { protocol: 'async-wal-fsync-v1', syncs: 0, waiters: 0, totalMs: 0, maxMs: 0, errors: 0, reopened: 0 };
  }
  // Resolves after a flush that began after this call. A commit that completed
  // before calling durable() is therefore covered by the resolved flush.
  durable() {
    if (this.failed) return Promise.reject(this.failed);
    if (this.closed) return Promise.reject(new Error('Database closed'));
    return new Promise((resolve, reject) => { this.waiting.push({ resolve, reject }); this.pump(); });
  }
  // A failed NORMAL-mode flush leaves earlier commits without a durability
  // proof. Switching SQLite to FULL alone does not prove those frames, notably
  // when the next transaction only replays an existing receipt. The owner must
  // first restore FULL successfully, then await this explicit recovery barrier.
  // Keep the failed flag: this never re-enables NORMAL-mode scheduling, replays
  // a write, or retries a reward. One attempt/result is retained for this failed
  // epoch; a failed recovery remains fail-closed for every subsequent caller.
  recoverDurable() {
    if (this.recovery) return this.recovery;
    this.recovery = (async () => {
      if (!this.failed || this.closed) throw new Error('WAL recovery unavailable');
      if (this.running) await this.running;
      if (this.closed) throw new Error('Database closed');
      this.checkedAt = -Infinity; // Verify current WAL inode even within 1 s.
      const trace = await this.flush();
      if (this.closed) throw new Error('Database closed');
      return Object.freeze({...trace,durabilityMode:'recovery-wal-fsync'});
    })();
    return this.recovery;
  }
  pump() {
    if (this.closed || this.running || !this.waiting.length) return;
    const batch = this.waiting.splice(0);
    this.stats.waiters += batch.length;
    this.running = this.flush().then(
      trace => { for (const waiter of batch) waiter.resolve(trace); },
      error => {
        this.stats.errors++;
        this.failed ??= error;
        for (const waiter of batch) waiter.reject(error);
        for (const waiter of this.waiting.splice(0)) waiter.reject(error);
        try { this.onFailure(error); } catch { /* The owner restores FULL itself. */ }
      },
    ).finally(() => { this.running = null; if (!this.failed) this.pump(); });
  }
  async flush() {
    const started = performance.now();
    const flushId = this.tracePrefix + (++this.traceSequence).toString(16).padStart(16, '0');
    // The WAL file is persistent while connections are open. If it was ever
    // replaced, flush the current inode instead of a stale descriptor.
    // The path is re-checked at most once per second; SQLite keeps the WAL
    // inode while any connection is open, so this is only a safety net.
    if (!this.handle || started - this.checkedAt >= 1000) {
      const current = await stat(this.walPath);
      if (!this.handle || current.ino !== this.inode) {
        if (this.handle) { this.stats.reopened++; await this.handle.close().catch(() => {}); }
        this.handle = await open(this.walPath, 'r+');
        this.inode = (await this.handle.stat()).ino;
        if (this.inode !== current.ino) throw new Error('WAL file changed while opening the flush handle');
      }
      this.checkedAt = started;
    }
    const syncStarted477=performance.now();await this.handle.sync();const syncEnded477=performance.now();
    const elapsed = performance.now() - started;
    this.stats.syncs++; this.stats.totalMs += elapsed; this.stats.maxMs = Math.max(this.stats.maxMs, elapsed);
    if(elapsed>=50)workDiagnostic477('native_fsync_timing',{startedAtMs:Math.round(performance.timeOrigin+started),endedAtMs:Math.round(performance.timeOrigin+syncEnded477),prepareMs:Math.round((syncStarted477-started)*1000)/1000,syncAwaitMs:Math.round((syncEnded477-syncStarted477)*1000)/1000,totalMs:Math.round(elapsed*1000)/1000,scope:'WAL-FileHandle.sync-await-wall-including-libuv-queue-and-scheduling; not-kernel-only-fsync-or-request-causality'});
    // Shared by every waiter in this flush. This is FileHandle.sync await wall
    // including libuv scheduling, not kernel-only or per-request fsync cost.
    return Object.freeze({ flushId, fsyncWaitMs: syncEnded477-syncStarted477, durabilityMode: 'async-wal-fsync' });
  }
  snapshot() {
    return { ...this.stats, ready: !this.failed && !this.closed, fallback: this.failed ? String(this.failed.message || this.failed) : null,
      meanMs: this.stats.syncs ? Math.round(this.stats.totalMs / this.stats.syncs * 100) / 100 : 0, maxMs: Math.round(this.stats.maxMs * 100) / 100,
      totalMs: Math.round(this.stats.totalMs) };
  }
  // Shutdown: commits that are waiting for a flush get one final synchronous
  // flush instead of an error, so a restart never reports a committed action
  // as failed. An in-flight flush keeps its own handle until it settles.
  close() {
    if (this.closed) return;
    this.closed = true;
    const waiters = this.waiting.splice(0);
    let flushed = false, trace;
    if (waiters.length && !this.failed) {
      try { const fd = openSync(this.walPath, 'r+'); try { const started=performance.now();fsyncSync(fd);trace=Object.freeze({flushId:this.tracePrefix+(++this.traceSequence).toString(16).padStart(16,'0'),fsyncWaitMs:performance.now()-started,durabilityMode:'sync-wal-fsync'});flushed = true; } finally { closeSync(fd); } } catch { /* reported below */ }
    }
    for (const waiter of waiters) flushed ? waiter.resolve(trace) : waiter.reject(new Error('Database closed'));
    // A flush/recovery may be awaiting stat/open and acquire its handle after
    // close() begins. Capture only after both settle, so late-opened FDs cannot
    // escape shutdown and no in-flight sync sees a prematurely cleared handle.
    this.closing = Promise.allSettled([this.running,this.recovery]).then(async () => {
      const handle = this.handle; this.handle = null;
      await handle?.close().catch(() => {});
    });
  }
}
