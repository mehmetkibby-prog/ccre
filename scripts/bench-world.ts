/**
 * Dünya adımı ölçümü (sunucusuz): N oyuncu (bir kısmı köyde kalabalık, kalanı ormanda canavar avlıyor),
 * her adımda hareket + saldırı. Adım süresinin dağılımını yazar. --cpu-prof ile profil çıkarılabilir.
 *   npx tsx scripts/bench-world.ts 200 600
 */
import { createHash } from 'node:crypto';
// HASH=1: rastgelelik ve saat sabitlenir, gönderilen tüm paketlerin özeti yazılır (kodlama değişikliği doğrulaması)
const HASH = process.env.HASH === '1';
let fakeT = 1.7e12;
const H = createHash('sha256');
if (HASH) { let r = 12345; Math.random = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); Date.now = () => fakeT; }
const { World } = await import( '../packages/server/src/worker/world.ts');
import { getLayout, encodeMove, dirIndexFromVector, Kind } from '../packages/shared/src/index.ts';

const N = Number(process.argv[2] ?? 200), TICKS = Number(process.argv[3] ?? 600), VILLAGE = Number(process.argv[4] ?? 0.3);
let out = 0;
const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m: any) => { if (m.type === 'out') { out += m.batch.length; if (HASH) for (const [sid, d] of m.batch) { H.update(String(sid)); H.update(typeof d === 'string' ? d : new Uint8Array(d)); } } } });
const lb = getLayout('bazaar'), lf = getLayout('forest');
for (let i = 1; i <= N; i++) {
  const vil = i <= N * VILLAGE;
  const l = vil ? lb : lf;
  const ch: any = { id: i, accountId: i, role: 'player', name: 'B' + i, cls: ['guardian', 'hunter', 'arcanist'][i % 3], level: 10 + (i % 20), xp: 0, hp: 9999, map: vil ? 'bazaar' : 'forest',
    x: l.spawn.x + ((i * 37) % 600) - 300, y: l.spawn.y + ((i * 53) % 400) - 200, gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 };
  w.join(i, ch);
}
const P = [...Array(N)].map((_, i) => w.bySid.get(i + 1)!);
const times: number[] = []; let seq = 0;
for (let t = 0; t < TICKS; t++) {
  for (const [i, p] of P.entries()) {
    if (!p || p.dead) { if (p?.dead && Math.random() < 0.05) w.onCmd(i + 1, '{"t":"respawn","where":"here"}'); continue; }
    if (Math.random() < 0.8) w.onMove(i + 1, encodeMove(++seq, ((t >> 4) + i * 7) & 31));
    if (Math.random() < 0.1) {
      // en yakın canavar
      let best = 0, bd = 1e12;
      for (const m of (p as any).zone.monsterList) { if (m.dead) continue; const d = (m.x - p.x) ** 2 + (m.y - p.y) ** 2; if (d < bd) { bd = d; best = m.id; } }
      if (best) w.onCmd(i + 1, JSON.stringify({ t: 'attack', id: best }));
    }
  }
  if (HASH) fakeT += 50;
  (w as any).now = Date.now();
  const t0 = performance.now(); w.tick(); times.push(performance.now() - t0);
}
if (process.env.STATS) {
  let known = 0, np = 0; for (const p of P) if (p) { known += (p as any).known.size; np++; }
  const zs = [...(w as any).zones.values()].filter((z: any) => z.playerSet.size).map((z: any) => `${z.id}: oyuncu=${z.playerSet.size} canavar=${z.monsterList.length} olay/adım=${z.events.length}`);
  console.log('ort. bilinen varlık/oyuncu', (known / np).toFixed(0), zs.join(' | '));
}
times.sort((a, b) => a - b);
const q = (p: number) => times[Math.floor(p * (times.length - 1))].toFixed(2);
if (HASH) console.log('özet', H.digest('hex').slice(0, 16));
console.log(`N=${N} adım=${TICKS}  p50=${q(0.5)}ms p95=${q(0.95)}ms p99=${q(0.99)}ms max=${q(1)}ms  (bütçe 50ms)  mesaj=${out}`);
