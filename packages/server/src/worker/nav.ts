import type { MapLayout } from '@col/shared';

/**
 * Canavar yol bulma: karo ızgarasında (64 px) A*.
 * Düz çizgi açıksa kullanılmaz; yalnız arada ağaç kümesi, göl, ev gibi engel varsa yol hesaplanır.
 * Köşe kesme yok (iki engelin arasından sızmaz), düğüm sınırı var (uzak/ulaşılmaz hedefte sunucu yorulmaz).
 */
const T = 64;

export function freeAt(l: MapLayout, x: number, y: number) {
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  return tx >= 0 && ty >= 0 && tx < l.w && ty < l.h && l.blocked[ty * l.w + tx] === 0;
}

/** İki nokta arası gövde payıyla açık mı (çizgi + iki yanı 16 px aralıkla yoklanır). */
export function los(l: MapLayout, x0: number, y0: number, x1: number, y1: number, clear = 16) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
  if (d < 1) return freeAt(l, x1, y1);
  const nx = -dy / d * clear, ny = dx / d * clear;
  const n = Math.ceil(d / 16);
  for (let i = 1; i <= n; i++) {
    const k = i / n, x = x0 + dx * k, y = y0 + dy * k;
    if (!freeAt(l, x, y) || !freeAt(l, x + nx, y + ny) || !freeAt(l, x - nx, y - ny)) return false;
  }
  return true;
}

interface Buf { g: Float32Array; from: Int32Array; stamp: Uint32Array; closed: Uint32Array; gen: number }
const BUFS = new WeakMap<MapLayout, Buf>();
function buf(l: MapLayout): Buf {
  let b = BUFS.get(l);
  const n = l.w * l.h;
  if (!b || b.g.length !== n) { b = { g: new Float32Array(n), from: new Int32Array(n), stamp: new Uint32Array(n), closed: new Uint32Array(n), gen: 0 }; BUFS.set(l, b); }
  return b;
}

/** Hedefe en yakın açık karo (hedef karosu doluysa 2 karo çevresine bakar). */
function nearestOpen(l: MapLayout, tx: number, ty: number): number {
  const ok = (x: number, y: number) => x >= 0 && y >= 0 && x < l.w && y < l.h && l.blocked[y * l.w + x] === 0;
  if (ok(tx, ty)) return ty * l.w + tx;
  for (let r = 1; r <= 2; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && ok(tx + dx, ty + dy)) return (ty + dy) * l.w + tx + dx;
  return -1;
}

/**
 * A* yolu: başlangıçtan hedefe karo merkezleri (son nokta hedefin kendisi, açıksa).
 * Bulunamazsa null (ulaşılmaz ya da düğüm sınırı aşıldı).
 */
export function findPath(l: MapLayout, sx: number, sy: number, gx: number, gy: number, maxNodes = 2500): { x: number; y: number }[] | null {
  const W = l.w, H = l.h;
  const s0x = Math.floor(sx / T), s0y = Math.floor(sy / T);
  if (s0x < 0 || s0y < 0 || s0x >= W || s0y >= H) return null;
  const goal = nearestOpen(l, Math.floor(gx / T), Math.floor(gy / T));
  if (goal < 0) return null;
  const start = s0y * W + s0x;
  if (start === goal) return [{ x: gx, y: gy }];
  const b = buf(l); b.gen++; if (b.gen >= 0xfffffff0) { b.stamp.fill(0); b.closed.fill(0); b.gen = 1; }
  const gen = b.gen;
  const gxT = goal % W, gyT = (goal / W) | 0;
  const hf = (i: number) => { const x = i % W, y = (i / W) | 0, ax = Math.abs(x - gxT), ay = Math.abs(y - gyT); return Math.max(ax, ay) + 0.414 * Math.min(ax, ay); };
  // ikili yığın (f değerine göre)
  const heap: number[] = [], hf2: number[] = [];
  const push = (i: number, f: number) => {
    heap.push(i); hf2.push(f); let c = heap.length - 1;
    while (c > 0) { const p = (c - 1) >> 1; if (hf2[p] <= hf2[c]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; [hf2[p], hf2[c]] = [hf2[c], hf2[p]]; c = p; }
  };
  const pop = () => {
    const top = heap[0], li = heap.length - 1;
    heap[0] = heap[li]; hf2[0] = hf2[li]; heap.pop(); hf2.pop();
    let c = 0;
    for (;;) { const a = c * 2 + 1, bb = a + 1; let m = c; if (a < heap.length && hf2[a] < hf2[m]) m = a; if (bb < heap.length && hf2[bb] < hf2[m]) m = bb; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; [hf2[m], hf2[c]] = [hf2[c], hf2[m]]; c = m; }
    return top;
  };
  b.stamp[start] = gen; b.g[start] = 0; b.from[start] = -1; push(start, hf(start));
  const blk = l.blocked;
  let expanded = 0, found = false;
  while (heap.length) {
    const cur = pop();
    if (b.closed[cur] === gen) continue;
    b.closed[cur] = gen;
    if (cur === goal) { found = true; break; }
    if (++expanded > maxNodes) break;
    const cx = cur % W, cy = (cur / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (blk[ni] || b.closed[ni] === gen) continue;
      if (dx && dy && (blk[cy * W + nx] || blk[ny * W + cx])) continue; // köşe kesme yok
      const ng = b.g[cur] + (dx && dy ? 1.414 : 1);
      if (b.stamp[ni] === gen && ng >= b.g[ni]) continue;
      b.stamp[ni] = gen; b.g[ni] = ng; b.from[ni] = cur;
      push(ni, ng + hf(ni));
    }
  }
  if (!found) return null;
  const out: { x: number; y: number }[] = [];
  for (let i = goal; i !== start && i >= 0; i = b.from[i]) out.push({ x: (i % W) * T + T / 2, y: ((i / W) | 0) * T + T / 2 });
  out.reverse();
  if (freeAt(l, gx, gy)) out[out.length - 1] = { x: gx, y: gy };
  return out;
}
