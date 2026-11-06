import * as THREE from 'three';

/**
 * Ufuk manzarası: haritayı çevreleyen iki sıra dağ (önde alçak, mavimsi ormanlı tepeler; arkada karlı yüksek zirveler).
 * Kamerayla birlikte yatayda kayar (gökyüzü gibi sonsuz uzakta görünür), ilk çizilir ve derinlik yazmaz:
 * dünyadaki her şey üstüne çizilir. Tek ağ, tek çizim çağrısı, ışık/sis hesabı yok (köşe renkleri hazır).
 */
export interface MountainTheme { rock: number; far: number; snow: number; hill: number; haze: number; snowLine: number; peak: number }
export const MOUNTAIN_THEMES: Record<string, MountainTheme> = {
  village: { rock: 0x465a7c, far: 0x7a8fb2, snow: 0xf6f9ff, hill: 0x5f8a78, haze: 0xd8e4ee, snowLine: 0.66, peak: 1 },
  forest: { rock: 0x435672, far: 0x7489a8, snow: 0xf4f8ff, hill: 0x4f7c66, haze: 0xcfdde4, snowLine: 0.66, peak: 1 },
  lake: { rock: 0x485e82, far: 0x7c92b6, snow: 0xf6faff, hill: 0x5a8a80, haze: 0xd8e6f0, snowLine: 0.66, peak: 1 },
  frozen: { rock: 0x8e9cb4, far: 0xb4c2d6, snow: 0xffffff, hill: 0xa8b8cc, haze: 0xe2eaf2, snowLine: 0.25, peak: 1.15 },
  black: { rock: 0x4a3c48, far: 0x6a5a68, snow: 0xb05a40, hill: 0x3a3038, haze: 0xa89aa8, snowLine: 0.85, peak: 0.9 },
  ancient: { rock: 0x9a8a6a, far: 0xb4a888, snow: 0xf2eee2, hill: 0x8a8a5a, haze: 0xd8d6c4, snowLine: 0.7, peak: 0.85 },
};

function rng(seed: number) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** Açıya göre dağ yüksekliği: üçgen zirvelerin en büyüğü + ince pürüz (keskin, çizgi film sırtı). */
function ridge(seed: number, count: number, hMin: number, hMax: number, wMin: number, wMax: number) {
  const r = rng(seed);
  const peaks = Array.from({ length: count }, () => ({ c: r() * Math.PI * 2, w: wMin + r() * (wMax - wMin), h: hMin + r() * (hMax - hMin), skew: 0.6 + r() * 0.8 }));
  return (a: number) => {
    let h = 0;
    for (const p of peaks) {
      let d = a - p.c; d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
      const k = d < 0 ? -d / (p.w * p.skew) : d / (p.w / p.skew);
      if (k < 1) h = Math.max(h, p.h * (1 - k) ** 1.15);
    }
    return h + (Math.sin(a * 37 + seed) * 0.5 + Math.sin(a * 91 + seed * 2) * 0.3) * hMax * 0.012;
  };
}

export function buildMountains(themeId: string, seed = 7): THREE.Mesh {
  const T = MOUNTAIN_THEMES[themeId] ?? MOUNTAIN_THEMES.forest;
  const N = 540;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const c = new THREE.Color(), haze = new THREE.Color(T.haze), snow = new THREE.Color(T.snow);
  // katman: yarıçap, sırt, taban rengi, kar var mı, pusa karışma
  const layers = [
    { r: 250, f: ridge(seed, 34, 38 * T.peak, 92 * T.peak, 0.1, 0.32), base: new THREE.Color(T.far), snowy: true, mist: 0.14 },
    { r: 236, f: ridge(seed + 11, 40, 26 * T.peak, 62 * T.peak, 0.08, 0.22), base: new THREE.Color(T.rock), snowy: true, mist: 0.0 },
    { r: 222, f: ridge(seed + 23, 60, 7, 20, 0.05, 0.14), base: new THREE.Color(T.hill), snowy: false, mist: 0.1 },
  ];
  const ROWS = [0, 0.35, 0.55, 0.7, 0.82, 1];
  for (const L of layers) {
    const start = pos.length / 3;
    let hMax = 0; for (let i = 0; i < N; i++) hMax = Math.max(hMax, L.f((i / N) * Math.PI * 2));
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const h = L.f(a);
      // yamaç ışığı: güneşe bakan yüz açık, öteki koyu (sırt boyunca eğime göre)
      const slope = (L.f(a + 0.004) - L.f(a - 0.004)) / 0.008;
      const lit = THREE.MathUtils.clamp(0.5 + slope / (hMax * 4), 0.15, 0.9);
      const sl = T.snowLine * hMax * (0.9 + 0.2 * Math.sin(a * 13 + i));
      for (const t of ROWS) {
        const y = -30 + (h + 30) * t;
        pos.push(Math.cos(a) * L.r, y, Math.sin(a) * L.r);
        c.copy(L.base).multiplyScalar(0.62 + lit * 0.7);
        if (L.snowy && y > sl) c.lerp(snow.clone().multiplyScalar(0.8 + lit * 0.25), Math.min(1, (y - sl) / (hMax * 0.05)));
        // aşağı doğru pusa karışır (ufuk çizgisi yumuşak)
        c.lerp(haze, Math.min(1, L.mist + (1 - t) * (1 - t) * 0.4));
        col.push(c.r, c.g, c.b);
      }
    }
    const R = ROWS.length;
    for (let i = 0; i < N; i++) for (let k = 0; k < R - 1; k++) {
      const a = start + i * R + k, b = start + (i + 1) * R + k;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  m.renderOrder = -10; m.frustumCulled = false; m.name = 'mountains';
  // arka katman önce: ön katmanlar onun üstüne çizilir (derinlik yazılmadığı için sıra önemli)
  return m;
}
