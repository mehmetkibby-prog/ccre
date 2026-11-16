import { it, expect } from 'vitest';
import { getLayout, findPath, los, stepMove, dirIndexFromVector, freeAt } from '@col/shared';

/**
 * Oto av yol izleme: arada engel (ağaç kümesi, göl, ev) olan rastgele başlangıç-hedef çiftlerinde karakter
 * 50 ms'lik adımlarla yolu izleyerek hedefe varabilmeli (eski düz çizgi + yana kaçma takılıyordu).
 */
it('oto av engellerin arkasındaki hedefe yol bularak ulaşır', async () => {
  const G: any = globalThis;
  G.window ??= G; G.addEventListener ??= () => {}; G.removeEventListener ??= () => {};
  G.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  G.document ??= { addEventListener: () => {}, createElement: () => ({ getContext: () => null, style: {} }), body: {}, documentElement: { style: {} }, visibilityState: 'visible' };
  G.matchMedia ??= () => ({ matches: false, addEventListener: () => {} });
  const { Game } = await import('../packages/client/src/game/game.ts');
  for (const map of ['forest', 'bazaar', 'frozen']) {
    const l = getLayout(map);
    let seed = 11; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    let tried = 0, ok = 0, oldOk = 0;
    const SPEED = 248;
    while (tried < 70) {
      const sx = rnd() * l.w * 64, sy = rnd() * l.h * 64, gx = sx + (rnd() - 0.5) * 1400, gy = sy + (rnd() - 0.5) * 1400;
      if (!freeAt(l, sx, sy) || !freeAt(l, gx, gy) || los(l, sx, sy, gx, gy, 14) || !findPath(l, sx, sy, gx, gy, 5000)) continue;
      tried++;
      const g: any = Object.create(Game.prototype);
      Object.assign(g, { layout: l, px: sx, py: sy, path: null, pathGoal: { x: 0, y: 0 }, pathAt: 0 });
      let reached = false;
      for (let k = 0; k < 600 && !reached; k++) {
        const pd = g.pathDir(gx, gy);
        const dir = pd === null || pd === -1 ? dirIndexFromVector(gx - g.px, gy - g.py) : pd;
        const pos = { x: g.px, y: g.py }; stepMove(l, pos, dir, SPEED); g.px = pos.x; g.py = pos.y;
        if (Math.hypot(gx - g.px, gy - g.py) < 70) reached = true;
      }
      if (reached) ok++;
      // karşılaştırma: düz çizgi yürüyüş (eski davranışın özü)
      const p = { x: sx, y: sy }; let r2 = false;
      for (let k = 0; k < 600 && !r2; k++) { stepMove(l, p, dirIndexFromVector(gx - p.x, gy - p.y), SPEED); if (Math.hypot(gx - p.x, gy - p.y) < 70) r2 = true; }
      if (r2) oldOk++;
    }
    console.log(`${map}: yol izleme ${ok}/${tried}, düz çizgi ${oldOk}/${tried}`);
    expect(ok / tried).toBeGreaterThan(0.95);
  }
});
