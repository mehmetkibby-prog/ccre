import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { Session } from 'node:inspector';

/**
 * Bir thread'in (ana işlem ya da kanal worker'ı) canlı yükü:
 *  - işlem yoğunluğu: son 2 sn'de olay döngüsünün meşgul kaldığı pay (event loop utilization, yalnız bu thread)
 *  - döngü gecikmesi: aynı aralıkta en uzun döngü duraklaması (zamanlayıcının ne kadar geç çalıştığı)
 *  - kaydedilen işler: son 15 dk'da eşiği aşan yavaş işler (en çok 60; en yeni üstte)
 */
import type { LoadJob, LoadSnap } from './types.ts';

const WINDOW_MS = 15 * 60_000, MAX_JOBS = 60;
/** bu kadar uzun döngü duraklaması "kaydedilen iş" olarak tutulur */
export const STALL_MS = 100;

export class LoadMon {
  private elu = performance.eventLoopUtilization();
  private h = monitorEventLoopDelay({ resolution: 10 });
  private jobs: LoadJob[] = [];
  last: LoadSnap = { elu: 0, delayMs: 0, heapMB: 0, rssMB: 0, jobs: [], at: Date.now() };
  constructor(private everyMs = 2000) {
    this.h.enable();
    setInterval(() => this.sample(), everyMs).unref();
  }
  private sample() {
    const e = performance.eventLoopUtilization(this.elu);
    this.elu = performance.eventLoopUtilization();
    // histogram en küçük örnekleme aralığını (10 ms) da içerir; duraklama = gecikme − çözünürlük
    const delay = Math.max(0, this.h.max / 1e6 - 10);
    this.h.reset();
    if (delay >= STALL_MS) this.job('Döngü duraklaması', delay, 'Bu sürede thread başka hiçbir işi yapamadı');
    const m = process.memoryUsage();
    this.last = { elu: Math.round(e.utilization * 1000) / 10, delayMs: Math.round(delay * 10) / 10, heapMB: Math.round(m.heapUsed / 1048576 * 10) / 10, rssMB: Math.round(m.rss / 1048576 * 10) / 10, jobs: this.recent(), at: Date.now() };
  }
  /** eşiği aşan işi kaydet (ölçen yer eşiği kendisi seçer) */
  job(name: string, ms: number, detail?: string) {
    this.jobs.unshift({ at: Date.now(), name, ms: Math.round(ms * 10) / 10, detail });
    if (this.jobs.length > MAX_JOBS) this.jobs.length = MAX_JOBS;
  }
  private recent() { const t = Date.now() - WINDOW_MS; this.jobs = this.jobs.filter((j) => j.at >= t); return this.jobs.slice(); }
  snapshot(): LoadSnap { return { ...this.last, jobs: this.recent() }; }
}

/** Bu thread'in CPU profilini çıkarır (Chrome DevTools .cpuprofile biçimi). Yalnız ölçüm sırasında ek yük oluşturur. */
export function cpuProfile(ms: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const s = new Session();
    try { s.connect(); } catch (e) { reject(e); return; }
    const fail = (e: unknown) => { try { s.disconnect(); } catch { /* */ } reject(e); };
    s.post('Profiler.enable', (e1) => {
      if (e1) return fail(e1);
      s.post('Profiler.setSamplingInterval', { interval: 1000 }, () => {
        s.post('Profiler.start', (e2) => {
          if (e2) return fail(e2);
          setTimeout(() => {
            s.post('Profiler.stop', (e3, r) => {
              if (e3) return fail(e3);
              const out = JSON.stringify((r as { profile: unknown }).profile);
              s.post('Profiler.disable', () => { s.disconnect(); resolve(out); });
            });
          }, ms);
        });
      });
    });
  });
}
