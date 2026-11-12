/**
 * Oyun ayarları (yönetim panelinden değişir). Varsayılanlar oyunun özgün dengesidir:
 * hepsi 1 / boşken davranış bu dosya yokmuş gibidir. Sunucu ve tarayıcı aynı nesneyi okur.
 */
/** Canavar türü başına ayar (boş alan = varsayılan / harita ganimet profili). */
export interface MonsterTune {
  hpMul?: number; atkMul?: number; defAdd?: number; speedMul?: number; xpMul?: number; respawnMul?: number;
  equipChance?: number; // 0..1, ekipman düşme olasılığı
  rarity?: Record<string, number>; // nadirlik ağırlıkları
  gems?: [number, number]; essence?: [number, number];
  mats?: Record<string, number>; // malzeme düşme olasılığı (0..1)
}
/** Harita doğma grubu ayarı: anahtar `harita:sıra`. */
export interface SpawnTune { count?: number; level?: [number, number]; variants?: [number, number, number] }
/** Efsun ayarı: düşen eşyada efsun sayısı ve kademe oranları, kademe değerleri, kapalı efsunlar. */
export interface EnchantTune {
  countWeights?: Record<string, [number, number, number, number]>; // nadirlik (white/blue/orange/default) → 1..4 efsun ağırlığı
  tierWeights?: [number, number, number, number];
  values?: Record<string, [number, number, number, number]>;
  disabled?: string[];
}
export interface GameTuning {
  xpMul: number; gemMul: number; essenceMul: number; dropMul: number;
  monsterHpMul: number; monsterAtkMul: number; respawnMul: number;
  density: Record<string, number>; // harita başına canavar yoğunluğu çarpanı
  bots: number; worldDecayMul: number; brightness: number;
  announcement: string;
  monsters: Record<string, MonsterTune>;
  spawns: Record<string, SpawnTune>;
  enchants: EnchantTune;
  /** Nadirlik başına güç çarpanı (silah / zırh-takı); boş = varsayılan denge. */
  rarityPower: Record<string, { weapon?: number; armor?: number }>;
  /** Bütün canavarlarda nadirlik düşme ağırlığı çarpanı (beyaz/mavi/turuncu/kızıl…). */
  rarityDrop: Record<string, number>;
  /** Nadirlik başına satış fiyatı (Mücevher). */
  sellPrice: Record<string, number>;
  /** Artı basma: 6 kademelik tablo (boş = varsayılan) ve başarısızlıkta kademe düşmesi. */
  upgrade: UpgradeTune;
}
export interface UpgradeStepTune { chance: number; gems: number; mats: Record<string, number>; weapon: number; armor: number }
export interface UpgradeTune { steps?: UpgradeStepTune[]; failDown?: boolean }
export const DEFAULT_TUNING: GameTuning = {
  xpMul: 1, gemMul: 1, essenceMul: 1, dropMul: 1,
  monsterHpMul: 1, monsterAtkMul: 1, respawnMul: 1,
  density: {}, bots: 8, worldDecayMul: 1, brightness: 1, announcement: '',
  monsters: {}, spawns: {}, enchants: {}, rarityPower: {}, rarityDrop: {}, sellPrice: {}, upgrade: {},
};
/** Panelde gösterilen sınırlar: değerler her zaman bu aralığa sıkıştırılır. */
export const TUNING_LIMITS: Record<Exclude<keyof GameTuning, 'density' | 'announcement' | 'monsters' | 'spawns' | 'enchants' | 'rarityPower' | 'rarityDrop' | 'sellPrice' | 'upgrade'>, [number, number, number]> = {
  xpMul: [0.1, 10, 0.1], gemMul: [0, 10, 0.1], essenceMul: [0, 10, 0.1], dropMul: [0, 10, 0.1],
  monsterHpMul: [0.2, 5, 0.05], monsterAtkMul: [0.2, 5, 0.05], respawnMul: [0.2, 5, 0.05],
  bots: [0, 24, 1], worldDecayMul: [0, 5, 0.1], brightness: [0.6, 1.6, 0.05],
};
export const DENSITY_LIMITS: [number, number, number] = [0.3, 3, 0.05];
export const TUNING: GameTuning = structuredClone(DEFAULT_TUNING);

const clamp = (v: unknown, [lo, hi]: [number, number, number], d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
/** Güvenilmeyen kaynaktan gelen ayarı doğrular; eksik alan varsayılan kalır. */
export function sanitizeTuning(raw: unknown): GameTuning {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = structuredClone(DEFAULT_TUNING);
  for (const k of Object.keys(TUNING_LIMITS) as (keyof typeof TUNING_LIMITS)[]) out[k] = clamp(r[k], TUNING_LIMITS[k], DEFAULT_TUNING[k]);
  out.bots = Math.round(out.bots);
  const dn = (r.density && typeof r.density === 'object' ? r.density : {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(dn)) if (/^[a-z_]{1,24}$/.test(k)) out.density[k] = clamp(v, DENSITY_LIMITS, 1);
  out.announcement = typeof r.announcement === 'string' ? r.announcement.slice(0, 200) : '';
  const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
  const num = (v: unknown, lo: number, hi: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : undefined; };
  const pair = (v: unknown, lo: number, hi: number): [number, number] | undefined => {
    if (!Array.isArray(v) || v.length !== 2) return undefined;
    const a = num(v[0], lo, hi), b = num(v[1], lo, hi);
    return a === undefined || b === undefined ? undefined : [Math.round(Math.min(a, b)), Math.round(Math.max(a, b))];
  };
  const quad = (v: unknown, lo: number, hi: number): [number, number, number, number] | undefined => {
    if (!Array.isArray(v) || v.length !== 4) return undefined;
    const q = v.map((x) => num(x, lo, hi));
    return q.some((x) => x === undefined) ? undefined : q as [number, number, number, number];
  };
  const key = (k: string) => /^[a-z0-9_:]{1,32}$/.test(k);
  for (const [id, raw] of Object.entries(obj(r.monsters))) {
    if (!key(id)) continue;
    const m = obj(raw), t: MonsterTune = {};
    const set = <K extends keyof MonsterTune>(k: K, v: MonsterTune[K] | undefined) => { if (v !== undefined) t[k] = v; };
    set('hpMul', num(m.hpMul, 0.05, 20)); set('atkMul', num(m.atkMul, 0.05, 20)); set('defAdd', num(m.defAdd, -200, 2000));
    set('speedMul', num(m.speedMul, 0.2, 3)); set('xpMul', num(m.xpMul, 0, 50)); set('respawnMul', num(m.respawnMul, 0.1, 20));
    set('equipChance', num(m.equipChance, 0, 1)); set('gems', pair(m.gems, 0, 1_000_000)); set('essence', pair(m.essence, 0, 1_000_000));
    const rar: Record<string, number> = {}; for (const [k, v] of Object.entries(obj(m.rarity))) { const n = num(v, 0, 10000); if (key(k) && n !== undefined) rar[k] = n; }
    if (Object.keys(rar).length && Object.values(rar).some((x) => x > 0)) t.rarity = rar;
    const mats: Record<string, number> = {}; for (const [k, v] of Object.entries(obj(m.mats))) { const n = num(v, 0, 1); if (key(k) && n !== undefined) mats[k] = n; }
    if (Object.keys(mats).length) t.mats = mats;
    if (Object.keys(t).length) out.monsters[id] = t;
  }
  for (const [id, raw] of Object.entries(obj(r.spawns))) {
    if (!key(id)) continue;
    const m = obj(raw), t: SpawnTune = {};
    const c = num(m.count, 0, 400); if (c !== undefined) t.count = Math.round(c);
    const lv = pair(m.level, 1, 120); if (lv) t.level = lv;
    if (Array.isArray(m.variants) && m.variants.length === 3) { const v = m.variants.map((x) => num(x, 0, 1000)); if (!v.some((x) => x === undefined) && v.some((x) => (x as number) > 0)) t.variants = v as [number, number, number]; }
    if (Object.keys(t).length) out.spawns[id] = t;
  }
  const e = obj(r.enchants), et: EnchantTune = {};
  const cw: Record<string, [number, number, number, number]> = {};
  for (const [k, v] of Object.entries(obj(e.countWeights))) { const q = quad(v, 0, 1000); if (key(k) && q && q.some((x) => x > 0)) cw[k] = q; }
  if (Object.keys(cw).length) et.countWeights = cw;
  const tw = quad(e.tierWeights, 0, 1000); if (tw && tw.some((x) => x > 0)) et.tierWeights = tw;
  const vals: Record<string, [number, number, number, number]> = {};
  for (const [k, v] of Object.entries(obj(e.values))) { const q = quad(v, 0, 100000); if (key(k) && q) vals[k] = q; }
  if (Object.keys(vals).length) et.values = vals;
  if (Array.isArray(e.disabled)) et.disabled = e.disabled.filter((x): x is string => typeof x === 'string' && key(x)).slice(0, 40);
  out.enchants = et;
  for (const [k, v] of Object.entries(obj(r.rarityPower))) {
    if (!key(k)) continue;
    const o = obj(v), w = num(o.weapon, 0.1, 50), a = num(o.armor, 0.1, 50);
    if (w !== undefined || a !== undefined) out.rarityPower[k] = { ...(w !== undefined ? { weapon: w } : {}), ...(a !== undefined ? { armor: a } : {}) };
  }
  for (const [k, v] of Object.entries(obj(r.sellPrice))) { const n = num(v, 0, 1e7); if (key(k) && n !== undefined) out.sellPrice[k] = Math.round(n); }
  for (const [k, v] of Object.entries(obj(r.rarityDrop))) { const n = num(v, 0, 100); if (key(k) && n !== undefined && n !== 1) out.rarityDrop[k] = n; }
  const up = obj(r.upgrade);
  if (Array.isArray(up.steps) && up.steps.length === 6) {
    const steps: UpgradeStepTune[] = [];
    for (const raw of up.steps) {
      const o = obj(raw), mats: Record<string, number> = {};
      for (const [k, v] of Object.entries(obj(o.mats)).slice(0, 6)) { const n = num(v, 0, 9999); if (key(k) && n) mats[k] = Math.round(n); }
      steps.push({ chance: num(o.chance, 0, 100) ?? 100, gems: Math.round(num(o.gems, 0, 1e7) ?? 0), mats, weapon: num(o.weapon, 0, 1000) ?? 0, armor: num(o.armor, 0, 1000) ?? 0 });
    }
    out.upgrade.steps = steps;
  }
  if (typeof up.failDown === 'boolean') out.upgrade.failDown = up.failDown;
  return out;
}
/** Ayarları yerinde günceller (aynı nesne; okuyanlar her seferinde güncel değeri görür). */
export function applyTuning(raw: unknown): GameTuning {
  const t = sanitizeTuning(raw);
  Object.assign(TUNING, t);
  return TUNING;
}
