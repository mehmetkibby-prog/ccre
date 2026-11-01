import * as THREE from 'three';
import { sculpt, type Prim, type V3 } from './sculpt.ts';
import { BONES } from './humanoid.ts';
import { objTexture } from './textures.ts';

/**
 * Oynanabilir üç sınıfın heykel (SDF) modelleri.
 * Kemik düzeni humanoid.ts ile aynıdır; animasyon kodu ortaktır.
 */
let _bi: Record<string, number> | null = null;
const BIf = () => (_bi ??= Object.fromEntries(BONES.map((b, i) => [b[0], i])));
const S = (x: number): 1 | -1 => (x >= 0 ? 1 : -1);

interface Pal { skin: number; under: number; pants: number; boots: number; glove: number }

/** Çıplak taban gövde (kıyafetin altında; görünen yerler ten/iç giysi). */
function body(p: Pal, o: { bulk?: number; legs?: boolean } = {}): Prim[] {
  const b = o.bulk ?? 1;
  const P: Prim[] = [
    { kind: 'ell', a: [0, 0.98, 0], b: [0.155 * b, 0.11, 0.11], r1: 0, bone: 'hips', color: p.pants, k: 0.05 },
    { kind: 'cone', a: [0, 1.0, 0], b: [0, 1.22, 0], r1: 0.135 * b, r2: 0.15 * b, bone: 'spine', color: p.under, k: 0.06 },
    { kind: 'ell', a: [0, 1.33, 0], b: [0.19 * b, 0.16, 0.12], r1: 0, bone: 'chest', color: p.under, k: 0.06 },
    { kind: 'cone', a: [0, 1.45, -0.01], b: [0, 1.6, 0.0], r1: 0.058, r2: 0.05, bone: 'neck', color: p.skin, k: 0.04 },
  ];
  for (const s of [1, -1]) {
    const sl = s > 0 ? 'L' : 'R';
    P.push(
      { kind: 'ell', a: [s * 0.2 * b, 1.43, 0], b: [0.075, 0.07, 0.075], r1: 0, bone: 'upperArm' + sl, color: p.under, k: 0.05 },
      { kind: 'cone', a: [s * 0.205 * b, 1.42, 0], b: [s * 0.215, 1.16, 0], r1: 0.062, r2: 0.05, bone: 'upperArm' + sl, color: p.under, k: 0.03 },
      { kind: 'cone', a: [s * 0.215, 1.15, 0], b: [s * 0.222, 0.93, 0.005], r1: 0.05, r2: 0.038, bone: 'foreArm' + sl, color: p.skin, k: 0.03 },
      { kind: 'ell', a: [s * 0.224, 0.87, 0.012], b: [0.032, 0.058, 0.046], r1: 0, bone: 'hand' + sl, color: p.glove, k: 0.025 },
      { kind: 'cone', a: [s * 0.205, 0.9, 0.04], b: [s * 0.195, 0.86, 0.06], r1: 0.014, r2: 0.012, bone: 'hand' + sl, color: p.glove, k: 0.015 },
    );
    if (o.legs !== false) P.push(
      { kind: 'cone', a: [s * 0.1, 0.95, 0], b: [s * 0.105, 0.52, 0.005], r1: 0.088 * b, r2: 0.06, bone: 'thigh' + sl, color: p.pants, k: 0.05 },
      { kind: 'cone', a: [s * 0.105, 0.5, 0.005], b: [s * 0.1, 0.1, -0.005], r1: 0.058, r2: 0.042, bone: 'shin' + sl, color: p.pants, k: 0.03 },
      { kind: 'ell', a: [s * 0.1, 0.055, 0.045], b: [0.052, 0.048, 0.12], r1: 0, bone: 'foot' + sl, color: p.boots, k: 0.03 },
    );
  }
  return P;
}
/** Baş (ayrı, daha ince çözünürlükte yontulur). */
function head(skin: number): Prim[] {
  return [
    { kind: 'ell', a: [0, 1.695, -0.005], b: [0.092, 0.112, 0.102], r1: 0, bone: 'head', color: skin, k: 0.03 },
    { kind: 'ell', a: [0, 1.632, 0.028], b: [0.068, 0.058, 0.074], r1: 0, bone: 'head', color: skin, k: 0.04 },
    { kind: 'cone', a: [0, 1.7, 0.09], b: [0, 1.665, 0.112], r1: 0.011, r2: 0.016, bone: 'head', color: skin, k: 0.012 },
    { kind: 'ell', a: [0.093, 1.69, -0.005], b: [0.016, 0.03, 0.022], r1: 0, bone: 'head', color: skin, k: 0.01 },
    { kind: 'ell', a: [-0.093, 1.69, -0.005], b: [0.016, 0.03, 0.022], r1: 0, bone: 'head', color: skin, k: 0.01 },
  ];
}
const mirror = (list: Prim[]): Prim[] => list.flatMap((p) => {
  if (p.solo || (p.a[0] === 0 && (!p.b || p.kind !== 'cone' || p.b[0] === 0))) return [p];
  const m: Prim = { ...p, a: [-p.a[0], p.a[1], p.a[2]] as V3, bone: p.bone.replace(/L$/, '§').replace(/R$/, 'L').replace(/§$/, 'R') };
  if (p.kind === 'cone' && p.b) m.b = [-p.b[0], p.b[1], p.b[2]];
  if (p.rot) m.rot = [p.rot[0], -p.rot[1], -p.rot[2]];
  return [p, m];
});

// ─────────────────────────── MUHAFIZ ───────────────────────────
function guardian(): { body: Prim[]; head: Prim[]; glow: number } {
  const steel = 0x9aa3ae, dark = 0x5a6170, gold = 0xc89a48, red = 0x7a1a20, leather = 0x3a2618;
  const pal: Pal = { skin: 0xc89070, under: 0x5a3a30, pants: 0x3a3a44, boots: 0x2a1e16, glove: steel };
  const M = (p: Omit<Prim, 'mat'>): Prim => ({ ...p, mat: 1 });
  const B = body(pal, { bulk: 1.12 });
  const armor: Prim[] = [
    // göğüs zırhı ve karın plakası
    M({ kind: 'ell', a: [0, 1.31, 0.012], b: [0.24, 0.205, 0.158], r1: 0, bone: 'chest', color: steel, k: 0.02 }),
    M({ kind: 'cone', a: [0, 1.44, 0.15], b: [0, 1.2, 0.158], r1: 0.016, r2: 0.012, bone: 'chest', color: steel, k: 0.02 }),
    M({ kind: 'ell', a: [0, 1.125, 0.018], b: [0.195, 0.1, 0.142], r1: 0, bone: 'spine', color: steel, k: 0.015 }),
    M({ kind: 'ell', a: [0, 1.06, 0.018], b: [0.185, 0.05, 0.138], r1: 0, bone: 'spine', color: dark, k: 0.01 }),
    M({ kind: 'torus', a: [0, 1.495, 0.0], r1: 0.088, r2: 0.032, bone: 'chest', color: steel, k: 0.02 }),
    M({ kind: 'torus', a: [0, 1.15, 0.016], r1: 0.168, r2: 0.012, bone: 'spine', color: gold, k: 0.008 }),
    // kemer ve tokası
    { kind: 'ell', a: [0, 1.015, 0.01], b: [0.19, 0.038, 0.145], r1: 0, bone: 'hips', color: leather, k: 0.01 },
    M({ kind: 'box', a: [0, 1.015, 0.152], b: [0.034, 0.03, 0.012], r1: 0.006, bone: 'hips', color: gold, k: 0.006 }),
    // dizlik etekleri (tasset)
    M({ kind: 'box', a: [0.085, 0.915, 0.125], b: [0.075, 0.075, 0.014], r1: 0.012, rot: [-0.18, 0, -0.12], bone: 'hips', color: steel, noBlend: true }),
    M({ kind: 'box', a: [0.19, 0.915, 0.0], b: [0.014, 0.075, 0.075], r1: 0.012, rot: [0, 0, 0.18], bone: 'hips', color: steel, noBlend: true }),
    // arma kumaşı (tabard)
    { kind: 'box', a: [0, 0.83, 0.142], b: [0.075, 0.17, 0.01], r1: 0.008, rot: [-0.06, 0, 0], bone: 'hips', color: red, noBlend: true },
    { kind: 'box', a: [0, 0.86, -0.135], b: [0.08, 0.15, 0.01], r1: 0.008, rot: [0.06, 0, 0], bone: 'hips', color: red, noBlend: true },
    // omuzluk katmanları + altın kenar
    M({ kind: 'ell', a: [0.245, 1.475, 0], b: [0.13, 0.085, 0.13], r1: 0, rot: [0, 0, -0.38], bone: 'upperArmL', color: steel, k: 0.012 }),
    M({ kind: 'ell', a: [0.268, 1.41, 0], b: [0.118, 0.06, 0.118], r1: 0, rot: [0, 0, -0.45], bone: 'upperArmL', color: steel, k: 0.01 }),
    M({ kind: 'ell', a: [0.282, 1.355, 0], b: [0.1, 0.05, 0.1], r1: 0, rot: [0, 0, -0.5], bone: 'upperArmL', color: dark, k: 0.01 }),
    M({ kind: 'torus', a: [0.246, 1.452, 0], r1: 0.118, r2: 0.012, rot: [0, 0, -0.38], bone: 'upperArmL', color: gold, k: 0.006 }),
    // kol zırhı
    M({ kind: 'cone', a: [0.21, 1.38, 0], b: [0.218, 1.17, 0], r1: 0.072, r2: 0.06, bone: 'upperArmL', color: steel, k: 0.012 }),
    M({ kind: 'ell', a: [0.218, 1.155, -0.008], b: [0.07, 0.07, 0.075], r1: 0, bone: 'foreArmL', color: steel, k: 0.012 }),
    M({ kind: 'cone', a: [0.219, 1.12, 0], b: [0.225, 0.93, 0.004], r1: 0.06, r2: 0.052, bone: 'foreArmL', color: steel, k: 0.012 }),
    M({ kind: 'cone', a: [0.225, 0.96, 0.004], b: [0.226, 0.93, 0.006], r1: 0.066, r2: 0.066, bone: 'foreArmL', color: gold, k: 0.004 }),
    M({ kind: 'ell', a: [0.226, 0.865, 0.014], b: [0.042, 0.064, 0.055], r1: 0, bone: 'handL', color: dark, k: 0.02 }),
    // bacak zırhı
    M({ kind: 'cone', a: [0.1, 0.9, 0.012], b: [0.106, 0.56, 0.014], r1: 0.098, r2: 0.072, bone: 'thighL', color: steel, k: 0.012 }),
    M({ kind: 'ell', a: [0.106, 0.515, 0.04], b: [0.068, 0.07, 0.06], r1: 0, bone: 'shinL', color: steel, k: 0.01 }),
    M({ kind: 'cone', a: [0.106, 0.47, 0.012], b: [0.1, 0.13, 0.005], r1: 0.068, r2: 0.054, bone: 'shinL', color: steel, k: 0.012 }),
    M({ kind: 'ell', a: [0.1, 0.06, 0.05], b: [0.058, 0.055, 0.132], r1: 0, bone: 'footL', color: dark, k: 0.015 }),
    // pelerin (sırtta)
    { kind: 'ell', a: [0, 1.0, -0.175], b: [0.25, 0.5, 0.022], r1: 0, rot: [0.1, 0, 0], bone: 'chest', color: red, noBlend: true },
  ];
  const helm: Prim[] = [
    M({ kind: 'ell', a: [0, 1.705, 0.0], b: [0.124, 0.148, 0.136], r1: 0, bone: 'head', color: steel, k: 0.01 }),
    M({ kind: 'cone', a: [0, 1.6, 0.0], b: [0, 1.55, 0.0], r1: 0.115, r2: 0.105, bone: 'head', color: steel, k: 0.03 }),
    M({ kind: 'cone', a: [0, 1.82, 0.0], b: [0, 1.86, 0.0], r1: 0.06, r2: 0.03, bone: 'head', color: steel, k: 0.03 }),
    M({ kind: 'box', a: [0, 1.71, 0.13], b: [0.085, 0.01, 0.05], r1: 0.004, bone: 'head', color: 0x101014, sub: true }),
    M({ kind: 'box', a: [0, 1.655, 0.13], b: [0.01, 0.045, 0.05], r1: 0.004, bone: 'head', color: 0x101014, sub: true }),
    M({ kind: 'torus', a: [0, 1.6, 0.0], r1: 0.118, r2: 0.012, bone: 'head', color: gold, k: 0.004 }),
    M({ kind: 'box', a: [0, 1.79, 0.0], b: [0.012, 0.07, 0.13], r1: 0.008, bone: 'head', color: gold, k: 0.01 }),
    { kind: 'cone', a: [0, 1.88, -0.03], b: [0, 1.8, -0.26], r1: 0.042, r2: 0.012, bone: 'head', color: red, k: 0.02 },
  ];
  return { body: [...B, ...mirror(armor)], head: helm, glow: 0xffd080 };
}

// ─────────────────────────── AVCI ───────────────────────────
function hunter(): { body: Prim[]; head: Prim[]; glow: number } {
  const leather = 0x6a4428, dleather = 0x3a2416, green = 0x34502e, hood = 0x2c4226, scarf = 0x3a3424;
  const pal: Pal = { skin: 0xd8a888, under: 0x4a5a34, pants: 0x3e3628, boots: dleather, glove: dleather };
  const B = body(pal, { bulk: 0.98 });
  const gear: Prim[] = [
    { kind: 'ell', a: [0, 1.31, 0.01], b: [0.212, 0.19, 0.142], r1: 0, bone: 'chest', color: leather, k: 0.02 },
    { kind: 'cone', a: [0, 1.2, 0.0], b: [0, 1.04, 0.0], r1: 0.16, r2: 0.17, bone: 'spine', color: leather, k: 0.02 },
    { grp: 'coat', kind: 'cone', a: [0, 1.04, 0.0], b: [0, 0.83, -0.01], r1: 0.168, r2: 0.188, bone: 'hips', color: green, k: 0.015 },
    { grp: 'coat', kind: 'box', a: [0, 0.88, 0.17], b: [0.02, 0.1, 0.06], r1: 0.006, bone: 'hips', color: green, sub: true },
    { grp: 'coat', kind: 'box', a: [0, 0.82, 0.0], b: [0.25, 0.04, 0.25], r1: 0.0, bone: 'hips', color: green, sub: true },
    { kind: 'ell', a: [0, 1.03, 0.0], b: [0.18, 0.035, 0.145], r1: 0, bone: 'hips', color: dleather, k: 0.01 },
    { solo: true, kind: 'box', a: [0.13, 0.99, 0.11], b: [0.035, 0.04, 0.025], r1: 0.012, bone: 'hips', color: dleather, k: 0.01 },
    { solo: true, kind: 'box', a: [-0.15, 0.99, 0.08], b: [0.03, 0.035, 0.025], r1: 0.012, bone: 'hips', color: dleather, k: 0.01 },
    { solo: true, kind: 'cone', a: [0.15, 1.47, 0.12], b: [-0.15, 1.08, 0.15], r1: 0.018, r2: 0.018, bone: 'chest', color: dleather, k: 0.01 },
    // pelerinli omuzluk (kapüşon yakası)
    { kind: 'ell', a: [0, 1.435, -0.01], b: [0.27, 0.105, 0.19], r1: 0, bone: 'chest', color: hood, k: 0.02 },
    { kind: 'ell', a: [0, 1.25, -0.16], b: [0.22, 0.2, 0.02], r1: 0, rot: [0.15, 0, 0], bone: 'chest', color: hood, noBlend: true },
    // kollar: kolluk ve eldiven
    { kind: 'cone', a: [0.217, 1.11, 0], b: [0.224, 0.94, 0.004], r1: 0.058, r2: 0.05, bone: 'foreArmL', color: dleather, k: 0.012 },
    { kind: 'torus', a: [0.218, 1.07, 0], r1: 0.058, r2: 0.008, bone: 'foreArmL', color: leather, k: 0.004 },
    { kind: 'ell', a: [0.21, 1.4, 0.0], b: [0.085, 0.06, 0.085], r1: 0, rot: [0, 0, -0.4], bone: 'upperArmL', color: leather, k: 0.015 },
    // dizlik ve uzun çizme
    { kind: 'ell', a: [0.106, 0.515, 0.04], b: [0.06, 0.065, 0.05], r1: 0, bone: 'shinL', color: leather, k: 0.01 },
    { kind: 'cone', a: [0.106, 0.42, 0.005], b: [0.1, 0.1, -0.005], r1: 0.066, r2: 0.05, bone: 'shinL', color: dleather, k: 0.012 },
    { kind: 'torus', a: [0.106, 0.42, 0.005], r1: 0.066, r2: 0.014, bone: 'shinL', color: leather, k: 0.006 },
    { kind: 'ell', a: [0.1, 0.06, 0.05], b: [0.056, 0.052, 0.128], r1: 0, bone: 'footL', color: dleather, k: 0.015 },
    // sadak (sırt) ve oklar
    { solo: true, kind: 'cone', a: [-0.09, 1.5, -0.2], b: [0.08, 1.06, -0.17], r1: 0.055, r2: 0.05, bone: 'chest', color: dleather, k: 0.01 },
    { solo: true, kind: 'cone', a: [-0.12, 1.6, -0.21], b: [-0.09, 1.5, -0.2], r1: 0.01, r2: 0.012, bone: 'chest', color: 0xe8e0d0, k: 0.004 },
    { solo: true, kind: 'cone', a: [-0.08, 1.62, -0.19], b: [-0.07, 1.5, -0.19], r1: 0.01, r2: 0.012, bone: 'chest', color: 0xc84040, k: 0.004 },
    { solo: true, kind: 'cone', a: [-0.14, 1.59, -0.18], b: [-0.11, 1.49, -0.18], r1: 0.01, r2: 0.012, bone: 'chest', color: 0xe8e0d0, k: 0.004 },
  ];
  const hd: Prim[] = [
    ...head(0xd8a888),
    // kapüşon: yüz açıklığı oyulmuş
    { grp: 'hood', kind: 'ell', a: [0, 1.715, -0.012], b: [0.128, 0.142, 0.132], r1: 0, bone: 'head', color: hood, k: 0.02 },
    { grp: 'hood', kind: 'ell', a: [0, 1.69, 0.105], b: [0.072, 0.085, 0.07], r1: 0, bone: 'head', color: hood, sub: true },
    { grp: 'hood', kind: 'cone', a: [0, 1.76, -0.11], b: [0, 1.62, -0.22], r1: 0.05, r2: 0.012, bone: 'head', color: hood, k: 0.03 },
    // yüz örtüsü (atkı): yalnız gözler görünür
    { kind: 'ell', a: [0, 1.638, 0.052], b: [0.078, 0.046, 0.072], r1: 0, bone: 'head', color: scarf, k: 0.012 },
    { kind: 'ell', a: [0.032, 1.7, 0.088], b: [0.014, 0.008, 0.008], r1: 0, bone: 'head', color: 0x1a1410, noBlend: true },
    { kind: 'ell', a: [-0.032, 1.7, 0.088], b: [0.014, 0.008, 0.008], r1: 0, bone: 'head', color: 0x1a1410, noBlend: true },
    { kind: 'box', a: [0.032, 1.718, 0.088], b: [0.02, 0.004, 0.01], r1: 0.002, rot: [0, 0, -0.12], bone: 'head', color: 0x5a2e1a, noBlend: true },
    { kind: 'box', a: [-0.032, 1.718, 0.088], b: [0.02, 0.004, 0.01], r1: 0.002, rot: [0, 0, 0.12], bone: 'head', color: 0x5a2e1a, noBlend: true },
  ];
  return { body: [...B, ...mirror(gear)], head: hd, glow: 0xffe0a0 };
}

// ─────────────────────────── ARKANİST ───────────────────────────
function arcanist(): { body: Prim[]; head: Prim[]; glow: number } {
  const robe = 0x2c2660, robe2 = 0x1c1840, trim = 0xc8a04a, sash = 0x6a1e2a, cowl = 0x221e48;
  const pal: Pal = { skin: 0xe8c0a0, under: robe, pants: robe2, boots: 0x1a1420, glove: 0xe8c0a0 };
  const B = body(pal, { bulk: 0.96, legs: true });
  const glow = 0x7cf3ff;
  const G = (p: Omit<Prim, 'mat'>): Prim => ({ ...p, mat: 2 });
  const gear: Prim[] = [
    { kind: 'ell', a: [0, 1.31, 0.008], b: [0.208, 0.188, 0.142], r1: 0, bone: 'chest', color: robe, k: 0.02 },
    { kind: 'cone', a: [0, 1.22, 0.0], b: [0, 1.02, 0.0], r1: 0.155, r2: 0.165, bone: 'spine', color: robe, k: 0.02 },
    // etek: kalçadan yere, önü açık iç astar
    { grp: 'robe', kind: 'cone', a: [0, 1.0, 0.0], b: [0, 0.05, 0.0], r1: 0.17, r2: 0.33, bone: 'hips', color: robe, k: 0.02 },
    { grp: 'robe', kind: 'box', a: [0, 0.48, 0.3], b: [0.06, 0.46, 0.08], r1: 0.01, rot: [0.2, 0, 0], bone: 'hips', color: robe, sub: true },
    { kind: 'cone', a: [0, 0.95, 0.12], b: [0, 0.07, 0.2], r1: 0.07, r2: 0.13, bone: 'hips', color: sash, k: 0.01 },
    { kind: 'torus', a: [0, 0.07, 0.0], r1: 0.322, r2: 0.016, bone: 'hips', color: trim, mat: 1, k: 0.006 },
    { kind: 'ell', a: [0, 1.03, 0.0], b: [0.18, 0.042, 0.15], r1: 0, bone: 'hips', color: sash, k: 0.01 },
    { solo: true, kind: 'box', a: [0.06, 0.88, 0.155], b: [0.028, 0.13, 0.008], r1: 0.004, rot: [-0.08, 0, 0.05], bone: 'hips', color: sash, noBlend: true },
    { solo: true, kind: 'box', a: [-0.17, 0.97, 0.06], b: [0.035, 0.055, 0.028], r1: 0.006, rot: [0, 0.4, 0], bone: 'hips', color: 0x4a1a1a, k: 0.008 },
    // omuz atkısı ve yüksek yaka
    { kind: 'ell', a: [0, 1.44, -0.005], b: [0.255, 0.095, 0.18], r1: 0, bone: 'chest', color: robe2, k: 0.02 },
    { kind: 'torus', a: [0, 1.43, 0.0], r1: 0.19, r2: 0.012, bone: 'chest', color: trim, mat: 1, k: 0.006 },
    { kind: 'box', a: [0, 1.62, -0.13], b: [0.15, 0.15, 0.014], r1: 0.01, rot: [0.3, 0, 0], bone: 'chest', color: robe2, noBlend: true },
    // çan kol
    { kind: 'cone', a: [0.217, 1.13, 0], b: [0.225, 0.92, 0.006], r1: 0.055, r2: 0.088, bone: 'foreArmL', color: robe, k: 0.012 },
    { kind: 'torus', a: [0.225, 0.925, 0.006], r1: 0.084, r2: 0.01, bone: 'foreArmL', color: trim, mat: 1, k: 0.004 },
    // omuz kristalleri
    G({ kind: 'ell', a: [0.17, 1.47, 0.11], b: [0.018, 0.028, 0.012], r1: 0, bone: 'chest', color: glow, k: 0.004 }),
  ];
  const hd: Prim[] = [
    ...head(0xe8c0a0),
    { grp: 'hood', kind: 'ell', a: [0, 1.715, -0.012], b: [0.132, 0.148, 0.138], r1: 0, bone: 'head', color: cowl, k: 0.02 },
    { grp: 'hood', kind: 'ell', a: [0, 1.69, 0.11], b: [0.075, 0.09, 0.07], r1: 0, bone: 'head', color: cowl, sub: true },
    { grp: 'hood', kind: 'cone', a: [0, 1.79, -0.06], b: [0, 1.9, -0.18], r1: 0.06, r2: 0.012, bone: 'head', color: cowl, k: 0.03 },
    { kind: 'ell', a: [0, 1.67, 0.05], b: [0.082, 0.085, 0.05], r1: 0, bone: 'head', color: 0x0a0812, k: 0.01 },
    G({ kind: 'ell', a: [0.03, 1.705, 0.092], b: [0.014, 0.007, 0.006], r1: 0, bone: 'head', color: glow, noBlend: true }),
    G({ kind: 'ell', a: [-0.03, 1.705, 0.092], b: [0.014, 0.007, 0.006], r1: 0, bone: 'head', color: glow, noBlend: true }),
    { kind: 'torus', a: [0, 1.8, 0.0], r1: 0.1, r2: 0.008, rot: [-0.25, 0, 0], bone: 'head', color: trim, mat: 1, k: 0.004 },
  ];
  return { body: [...B, ...mirror(gear)], head: hd, glow };
}

function mergeGroups(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  const names = ['position', 'normal', 'color', 'uv', 'skinIndex', 'skinWeight'];
  const na = a.attributes.position.count;
  for (const n of names) {
    const A = a.attributes[n] as THREE.BufferAttribute, Bv = b.attributes[n] as THREE.BufferAttribute;
    const Arr = A.array.constructor as new (n: number) => Float32Array;
    const arr = new Arr(A.array.length + Bv.array.length);
    arr.set(A.array as Float32Array, 0); arr.set(Bv.array as Float32Array, A.array.length);
    out.setAttribute(n, new THREE.BufferAttribute(arr, A.itemSize));
  }
  const idx: number[] = [];
  let start = 0;
  for (let m = 0; m < 3; m++) {
    for (const [g, off] of [[a, 0], [b, na]] as [THREE.BufferGeometry, number][]) {
      const gr = g.groups.find((x) => x.materialIndex === m);
      if (!gr) continue;
      const ix = g.index!;
      for (let i = gr.start; i < gr.start + gr.count; i++) idx.push(ix.getX(i) + off);
    }
    const count = idx.length - start;
    out.addGroup(start, count, m); start = idx.length;
  }
  out.setIndex(idx);
  out.computeBoundingSphere();
  return out;
}

const cache = new Map<string, THREE.Object3D>();
/** Sınıf için heykel şablonu; yoksa null (eski parça modeli kullanılır). */
export function sculptedTemplate(id: string): THREE.Object3D | null {
  if (cache.has(id)) return cache.get(id)!;
  const def = id === 'guardian' ? guardian() : id === 'hunter' ? hunter() : id === 'arcanist' ? arcanist() : null;
  if (!def) return null;
  const t0 = performance.now();
  const BI = BIf();
  const bodyGeo = sculpt(def.body, BI, { min: [-0.44, 0.0, -0.3], max: [0.44, 1.62, 0.3] }, 0.0115);
  const headGeo = sculpt(def.head, BI, { min: [-0.17, 1.5, -0.3], max: [0.17, 1.95, 0.2] }, 0.0065);
  const geo = mergeGroups(bodyGeo, headGeo);
  const cloth = objTexture('cloth');
  const mats = [
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, normalMap: cloth.normal, normalScale: new THREE.Vector2(0.12, 0.12) }),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.88, map: objTexture('metal').map, envMapIntensity: 1.3 }),
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: def.glow, emissiveIntensity: 3 }),
  ];
  const bones: THREE.Bone[] = [];
  for (const [n, p, x, y, z] of BONES) {
    const b = new THREE.Bone(); b.name = n; b.position.set(x, y, z);
    if (p) bones[BI[p]].add(b);
    bones.push(b);
  }
  const mesh = new THREE.SkinnedMesh(geo, mats);
  mesh.add(bones[0]);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  const root = new THREE.Group();
  const bodyG = new THREE.Group(); bodyG.name = 'body';
  bodyG.add(mesh); root.add(bodyG);
  console.debug('[3d] heykel', id, Math.round(performance.now() - t0), 'ms', geo.attributes.position.count, 'köşe');
  cache.set(id, root);
  return root;
}
