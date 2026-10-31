/** Sabit boyutlu halka tampon histogram; p50/p95/p99 için. */
export class Histogram {
  private buf: Float64Array;
  private n = 0;
  private i = 0;
  max = 0;
  constructor(size = 1200) { this.buf = new Float64Array(size); }
  add(v: number) { this.buf[this.i] = v; this.i = (this.i + 1) % this.buf.length; if (this.n < this.buf.length) this.n++; if (v > this.max) this.max = v; }
  snapshot() {
    if (!this.n) return { p50: 0, p95: 0, p99: 0, max: 0, n: 0 };
    const a = Array.from(this.buf.subarray(0, this.n)).sort((x, y) => x - y);
    const q = (p: number) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
    const r = { p50: round(q(0.5)), p95: round(q(0.95)), p99: round(q(0.99)), max: round(a[a.length - 1]), n: this.n };
    return r;
  }
  resetMax() { this.max = 0; }
}
const round = (v: number) => Math.round(v * 100) / 100;
