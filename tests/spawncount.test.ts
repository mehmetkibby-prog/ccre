import { it, expect } from 'vitest';
import { applyTuning, DEFAULT_TUNING, getLayout, rebuildSpawns, MAPS, TILE } from '@col/shared';

it('Yönetimden canavar sayısı artırılınca gerçekten artar; dağınık yerleşir, agresif/katil oranı korunur', () => {
  for (const map of ['frozen', 'black', 'forest', 'bazaar']) {
    const t = structuredClone(DEFAULT_TUNING); applyTuning(t);
    const l = getLayout(map); rebuildSpawns(l);
    const groups = MAPS[map].spawns;
    const gi = groups.findIndex((g) => g.count > 3);
    const mon = groups[gi].monster;
    const base = l.spawnPoints.filter((s) => s.monster === mon).length;
    expect(base).toBe(groups.filter((g) => g.monster === mon).reduce((a, g) => a + g.count, 0)); // varsayılan sayı eksiksiz yerleşir
    const want = groups[gi].count * 3;
    t.spawns[map + ':' + gi] = { count: want, variants: [20, 40, 40] };
    applyTuning(t); rebuildSpawns(l);
    const pts = l.spawnPoints.filter((s) => s.monster === mon);
    const others = groups.filter((g, i) => i !== gi && g.monster === mon).reduce((a, g) => a + g.count, 0); // aynı türün başka grubu (ör. ormanda iki kurt grubu)
    expect(pts.length).toBe(want + others);
    // dağınık: hiçbir iki canavar 1,5 karodan yakın değil (büyük çoğunluk)
    let close = 0; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) < 1.5 * TILE) close++;
    expect(close).toBeLessThan(pts.length * 0.05);
    const v = [0, 0, 0]; for (const s of pts) v[s.variant]++;
    expect(v[1] + v[2]).toBeGreaterThan(pts.length * 0.6); // agresif+katil ~%80
  }
  applyTuning(structuredClone(DEFAULT_TUNING));
});
