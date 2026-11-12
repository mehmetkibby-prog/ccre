import {performance} from 'node:perf_hooks';

const laneSettings = Object.freeze({
  channelJoin: Object.freeze({concurrency: 1, maxPending: 32, waitMs: 4000}),
  characterJoin: Object.freeze({concurrency: 1, maxPending: 96, waitMs: 4000}),
  passwordCheck: Object.freeze({concurrency: 2, maxPending: 96, waitMs: 4000}),
});
const lanes = new Map();

export class EntryAdmissionError477 extends Error {
  constructor(code) {
    super(code === 'entry_queue_cancelled' ? 'Giriş isteği iptal edildi.' : 'Giriş yoğunluğu var. Birkaç saniye sonra tekrar dene.');
    this.name = 'EntryAdmissionError477';
    this.code = code;
    this.status = code === 'entry_queue_cancelled' ? 499 : 429;
  }
}

class EntryLane477 {
  constructor(settings) {
    this.settings = settings;
    this.pending = [];
    this.keys = new Set();
    this.active = 0;
    this.stats = {started: 0, queued: 0, completed: 0, cancelled: 0, expired: 0, rejected: 0, maxPending: 0, totalWaitMs: 0, maxWaitMs: 0, maxActive: 0, totalRunMs: 0, maxRunMs: 0};
  }
  acquire(key, signal) {
    if (signal?.aborted) return Promise.reject(new EntryAdmissionError477('entry_queue_cancelled'));
    if (this.keys.has(key)) {
      this.stats.rejected++;
      return Promise.reject(new EntryAdmissionError477('entry_queue_duplicate'));
    }
    if (this.active >= this.settings.concurrency && this.pending.length >= this.settings.maxPending) {
      this.stats.rejected++;
      return Promise.reject(new EntryAdmissionError477('entry_queue_full'));
    }
    this.keys.add(key);
    return new Promise((resolve, reject) => {
      const entry = {key, signal, resolve, reject, at: performance.now(), timer: null, onAbort: null, state: 'waiting'};
      entry.onAbort = () => this.remove(entry, 'entry_queue_cancelled');
      if (this.active < this.settings.concurrency && this.pending.length === 0) {
        this.start(entry);
        return;
      }
      this.pending.push(entry);
      this.stats.queued++;
      this.stats.maxPending = Math.max(this.stats.maxPending, this.pending.length);
      entry.timer = setTimeout(() => this.remove(entry, 'entry_queue_timeout'), this.settings.waitMs);
      entry.timer.unref?.();
      signal?.addEventListener('abort', entry.onAbort, {once: true});
      // Handle an already-aborted signal even if a nonstandard signal changed
      // state while its listener was being attached.
      if (signal?.aborted) entry.onAbort();
    });
  }
  detach(entry) {
    clearTimeout(entry.timer);
    entry.signal?.removeEventListener('abort', entry.onAbort);
  }
  remove(entry, code) {
    if (entry.state !== 'waiting') return;
    entry.state = 'removed';
    const index = this.pending.indexOf(entry);
    if (index >= 0) this.pending.splice(index, 1);
    this.detach(entry);
    this.keys.delete(entry.key);
    this.stats[code === 'entry_queue_cancelled' ? 'cancelled' : 'expired']++;
    entry.reject(new EntryAdmissionError477(code));
    this.drain();
  }
  start(entry) {
    if (entry.state !== 'waiting') return;
    if (entry.signal?.aborted) {this.remove(entry, 'entry_queue_cancelled');return;}
    const waitMs = Math.max(0, performance.now() - entry.at);
    // A busy event loop may dispatch the release before an expired timer.
    // Never begin a stale queued request in that ordering.
    if (waitMs >= this.settings.waitMs) {this.remove(entry, 'entry_queue_timeout');return;}
    entry.state = 'active';
    this.detach(entry);
    this.active++;
    this.stats.maxActive = Math.max(this.stats.maxActive, this.active);
    entry.startedAt = performance.now();
    this.stats.started++;
    this.stats.totalWaitMs += waitMs;
    this.stats.maxWaitMs = Math.max(this.stats.maxWaitMs, waitMs);
    let released = false;
    entry.resolve(() => {
      if (released) return;
      released = true;
      entry.state = 'done';
      const runMs = Math.max(0, performance.now() - entry.startedAt);
      this.stats.totalRunMs += runMs;
      this.stats.maxRunMs = Math.max(this.stats.maxRunMs, runMs);
      this.active--;
      this.keys.delete(entry.key);
      this.stats.completed++;
      this.drain();
    });
  }
  drain() {
    while (this.active < this.settings.concurrency && this.pending.length) this.start(this.pending.shift());
  }
  snapshot() {
    return {active: this.active, pending: this.pending.length, concurrency: this.settings.concurrency,
      pendingLimit: this.settings.maxPending, waitLimitMs: this.settings.waitMs, ...this.stats};
  }
}

export async function runEntryAdmission477(name, key, signal, operation) {
  const settings = laneSettings[name];
  if (!settings || typeof key !== 'string' || !key || key.length > 256 || typeof operation !== 'function') throw Error('invalid_entry_admission');
  let lane = lanes.get(name);
  if (!lane) lanes.set(name, lane = new EntryLane477(settings));
  const release = await lane.acquire(key, signal);
  try {
    if (signal?.aborted) throw new EntryAdmissionError477('entry_queue_cancelled');
    // Once admitted, the durable action completes normally even if the client
    // disconnects. Its receipt/owner fences are never abandoned by a timeout.
    return await operation();
  } finally {release();}
}

export function entryAdmissionResponse477(error) {
  if (!(error instanceof EntryAdmissionError477)) return null;
  return Response.json({error: error.message, code: error.code, retryAfter: 2}, {
    status: error.status,
    headers: {'cache-control': 'no-store', 'retry-after': '2'},
  });
}

// No account, token, password or IP leaves this bounded aggregate view.
export function entryAdmissionSnapshot477() {
  return Object.fromEntries([...lanes].map(([name, lane]) => [name, lane.snapshot()]));
}
