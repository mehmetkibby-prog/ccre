import { Worker } from 'node:worker_threads';
import { config } from './config.ts';
import type { ToWorker, FromWorker, WorkerStats } from './types.ts';

export interface ChannelHandlers { onMessage(ch: number, m: FromWorker): void; onCrash(ch: number): void }

/** Her kanal ayrı bir worker thread'dir. Biri çökerse yalnız o yeniden başlar; diğerleri etkilenmez. */
export class ChannelManager {
  workers: (Worker | null)[] = [];
  stats: (WorkerStats | null)[] = [];
  population: number[] = [];
  pending: number[] = []; // kabul edilmiş ama henüz bağlanmamış
  maintenance: boolean[] = [];
  restarts: number[] = [];
  constructor(private h: ChannelHandlers) {}

  start() {
    for (let i = 1; i <= config.channels; i++) this.spawn(i);
  }
  private workerUrl(): { url: URL; execArgv: string[] } {
    const isTs = import.meta.url.endsWith('.ts');
    if (isTs) return { url: new URL('./worker/boot.mjs', import.meta.url), execArgv: ['--no-experimental-strip-types'] };
    return { url: new URL('./channel.js', import.meta.url), execArgv: [] };
  }
  private spawn(ch: number) {
    const { url, execArgv } = this.workerUrl();
    const w = new Worker(url, { workerData: { channel: ch, aoiMaxPlayers: config.aoiMaxPlayers, saveIntervalMs: config.saveIntervalMs }, execArgv, resourceLimits: { maxOldGenerationSizeMb: 768 } });
    this.workers[ch] = w;
    this.population[ch] = 0; this.pending[ch] = this.pending[ch] ?? 0; this.maintenance[ch] = false;
    w.on('message', (m: FromWorker) => {
      if (m.type === 'stats') { this.stats[ch] = m.data; this.population[ch] = m.data.players; }
      this.h.onMessage(ch, m);
    });
    w.on('error', (e) => console.error(`[ch${ch}] worker error`, e));
    w.on('exit', (code) => {
      if (this.workers[ch] !== w) return;
      this.workers[ch] = null;
      if (this.stopping) return;
      console.error(`[ch${ch}] worker exited code=${code}; yeniden başlatılıyor`);
      this.restarts[ch] = (this.restarts[ch] ?? 0) + 1;
      this.h.onCrash(ch);
      const n = this.restarts[ch];
      setTimeout(() => this.spawn(ch), Math.min(30_000, 500 * 2 ** Math.min(6, n - 1)));
    });
  }
  stopping = false;
  send(ch: number, m: ToWorker, transfer?: ArrayBuffer[]) {
    const w = this.workers[ch];
    if (w) w.postMessage(m, transfer ?? []);
  }
  broadcast(m: ToWorker) { for (let i = 1; i < this.workers.length; i++) this.send(i, m); }
  alive(ch: number) { return !!this.workers[ch]; }
  async stop() {
    this.stopping = true;
    await Promise.all(this.workers.map((w) => w && new Promise<void>((res) => { w.once('exit', () => res()); w.postMessage({ type: 'shutdown' }); setTimeout(() => { w.terminate(); res(); }, 4000); })));
  }
}
