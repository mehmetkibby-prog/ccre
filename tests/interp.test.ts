import { it, expect } from 'vitest';

/**
 * Uzak oyuncu ara değerleme benzetimi: sunucu 50 ms'de bir konum yollar, paketler 40 ms + dalgalanma ile gelir
 * (çoğu 0–120 ms, ara sıra 250 ms'lik gecikme). Ekranda (60 kare) karakter hiç geri gitmemeli ve neredeyse hiç
 * durmamalı; hızı da sabite yakın kalmalı.
 */
it('düzensiz ağda uzak oyuncu geri gitmez, takılmaz', async () => {
  // istemci modülleri yüklenirken tarayıcı nesnelerine dokunuyor: en küçük taklitler
  const G: any = globalThis;
  G.window ??= G; G.addEventListener ??= () => {}; G.removeEventListener ??= () => {};
  G.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  G.document ??= { addEventListener: () => {}, createElement: () => ({ getContext: () => null, style: {} }), body: {}, documentElement: { style: {} }, visibilityState: 'visible' };
  G.matchMedia ??= () => ({ matches: false, addEventListener: () => {} });
  const { Game } = await import('../packages/client/src/game/game.ts');
  const g: any = Object.create(Game.prototype);
  Object.assign(g, { serverOffset: null, netJitter: 0, interpMs: 100, lastInterpAt: 0, ents: new Map() });
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const SPEED = 12.4; // dünya birimi / sunucu adımı (≈6 m/sn)
  const packets: { at: number; t: number; x: number }[] = [];
  for (let k = 0; k < 400; k++) {
    const t = 1_000_000 + k * 50; // sunucu zamanı
    const jitter = rnd() < 0.05 ? 250 * rnd() : 120 * rnd() * rnd();
    packets.push({ at: k * 50 + 40 + jitter, t, x: 1000 + k * SPEED });
  }
  packets.sort((a, b) => a.at - b.at);
  const e: any = { id: 1, kind: 1, anim: 1, x: 1000, y: 500, samples: [{ t: packets[0].t, x: 1000, y: 500 }] };
  g.ents.set(1, e);
  let pi = 0, prev = 1000, back = 0, stalls = 0, frames = 0; const speeds: number[] = [];
  for (let now = 0; now < 19000; now += 1000 / 60) {
    while (pi < packets.length && packets[pi].at <= now) {
      const p = packets[pi++];
      g.noteServerTime(p.t, now);
      if (p.t > e.samples[e.samples.length - 1].t) { e.samples.push({ t: p.t, x: p.x, y: 500 }); if (e.samples.length > 8) e.samples.shift(); }
    }
    g.interpolate(now);
    if (now > 2000 && now < 18000) {
      const v = e.x - prev; frames++;
      if (v < -0.01) back++;
      if (v < SPEED / 3 * 0.15) stalls++;
      speeds.push(v);
    }
    prev = e.x;
  }
  const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const sd = Math.sqrt(speeds.reduce((a, b) => a + (b - mean) ** 2, 0) / speeds.length);
  console.log(`kare=${frames} geri=${back} takılma=${stalls} hız ort=${mean.toFixed(2)} sapma=${(sd / mean * 100).toFixed(0)}% tampon=${g.interpMs.toFixed(0)}ms`);
  expect(back).toBe(0);
  expect(stalls / frames).toBeLessThan(0.01);
  expect(sd / mean).toBeLessThan(0.2);
});

it('uzak oyuncu durunca son konumunun önüne kaymaz', async () => {
  const { Game } = await import('../packages/client/src/game/game.ts');
  const g: any = Object.create(Game.prototype);
  Object.assign(g, { serverOffset: null, netJitter: 0, interpMs: 100, lastInterpAt: 0, ents: new Map() });
  const e: any = { id: 1, kind: 1, anim: 1, x: 1000, y: 500, samples: [{ t: 1_000_000, x: 1000, y: 500 }] };
  g.ents.set(1, e);
  // 1 sn yürür (20 adım), sonra durur: sunucu konum göndermeyi keser, "durdu" (IDLE) gelir
  let maxX = 0;
  for (let now = 0; now < 3000; now += 1000 / 60) {
    const k = Math.floor((now - 40) / 50);
    if (k >= 1 && k <= 20 && e.samples[e.samples.length - 1].t < 1_000_000 + k * 50) { g.noteServerTime(1_000_000 + k * 50, now); e.samples.push({ t: 1_000_000 + k * 50, x: 1000 + k * 12.4, y: 500 }); if (e.samples.length > 8) e.samples.shift(); }
    if (k === 21) e.anim = 0;
    g.interpolate(now);
    maxX = Math.max(maxX, e.x);
  }
  const last = 1000 + 20 * 12.4;
  console.log(`son konum ${last.toFixed(1)} · en ileri ${maxX.toFixed(1)} · durduğu yer ${e.x.toFixed(1)}`);
  expect(maxX).toBeLessThanOrEqual(last + 1);
  expect(Math.abs(e.x - last)).toBeLessThan(0.5);
});
