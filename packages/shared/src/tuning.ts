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
  /** mutlak değerler (boss paneli): verilirse çarpanların yerine geçer */
  hp?: number; atk?: number; def?: number;
  /** yeniden doğma süresi (dakika; boss) */
  respawnMin?: number;
  /** özel düşenler (boss paneli): eşya / malzeme / market ürünü, olasılık 0..1, adet */
  drops?: DropTune[];
}
export interface DropTune { kind: 'item' | 'mat' | 'mall'; key: string; rarity?: string; chance: number; qty: [number, number] }
export interface MallTune { price?: Record<string, number>; off?: string[]; wings?: { atk?: number; def?: number; crit?: number } }
export interface FishingTune { rodPrice?: number; biteMin?: number; biteMax?: number; catches?: Record<string, { weight?: number; diff?: number; price?: number; off?: boolean }> }
/** Harita doğma grubu ayarı: anahtar `harita:sıra`. */
export interface SpawnTune { count?: number; level?: [number, number]; variants?: [number, number, number] }
/** Efsun ayarı: düşen eşyada efsun sayısı ve kademe oranları, kademe değerleri, kapalı efsunlar. */
export interface EnchantTune {
  /** Nadirlik grubu başına efsunlu düşme olasılığı (0..1); boş = her düşen eşya efsunlu. */
  chance?: Record<string, number>;
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
  /** Dünya Sağlığı: 1 Öz bağışının kazandırdığı puan (sağlık düştükçe etkisi artar). */
  worldDonateGain: number;
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
  /** Seviye TP tablosu: 64 değer (1→2 … 64→65); boş = varsayılan tablo. */
  xpTable?: number[];
  /** Nesne Market: fiyatlar (ÇP), satıştan kaldırılanlar, kanat bonusları. */
  mall?: MallTune;
  /** Balıkçılık: olta fiyatı, vurma süresi, av tablosu. */
  fishing?: FishingTune;
}
export interface UpgradeStepTune { chance: number; gems: number; mats: Record<string, number>; weapon: number; armor: number }
export interface UpgradeTune { steps?: UpgradeStepTune[]; failDown?: boolean }
export const DEFAULT_TUNING: GameTuning = {
  xpMul: 1, gemMul: 1, essenceMul: 1, dropMul: 1,
  monsterHpMul: 1, monsterAtkMul: 1, respawnMul: 1,
  density: {}, bots: 8, worldDecayMul: 1, brightness: 1, worldDonateGain: 0.02, announcement: '',
  monsters: {}, spawns: {}, enchants: {}, rarityPower: {}, rarityDrop: {}, sellPrice: {}, upgrade: {},
};
/** Panelde gösterilen sınırlar: değerler her zaman bu aralığa sıkıştırılır. */
export const TUNING_LIMITS: Record<Exclude<keyof GameTuning, 'density' | 'announcement' | 'monsters' | 'spawns' | 'enchants' | 'rarityPower' | 'rarityDrop' | 'sellPrice' | 'upgrade' | 'xpTable' | 'mall' | 'fishing'>, [number, number, number]> = {
  xpMul: [0.1, 10, 0.1], gemMul: [0, 10, 0.1], essenceMul: [0, 10, 0.1], dropMul: [0, 10, 0.1],
  monsterHpMul: [0.2, 5, 0.05], monsterAtkMul: [0.2, 5, 0.05], respawnMul: [0.2, 5, 0.05],
  bots: [0, 24, 1], worldDecayMul: [0, 5, 0.1], brightness: [0.6, 1.6, 0.05], worldDonateGain: [0, 0.5, 0.005],
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
    set('hp', num(m.hp, 1, 1e9)); set('atk', num(m.atk, 0, 1e7)); set('def', num(m.def, 0, 1e6)); set('respawnMin', num(m.respawnMin, 0.5, 24 * 60));
    if (Array.isArray(m.drops)) {
      const drops: DropTune[] = [];
      for (const raw2 of m.drops.slice(0, 24)) {
        const d = obj(raw2); const kind = d.kind === 'item' || d.kind === 'mat' || d.kind === 'mall' ? d.kind : null;
        const k = typeof d.key === 'string' && key(d.key) ? d.key : null; const ch = num(d.chance, 0, 1); const q = pair(d.qty, 1, 9999) ?? [1, 1];
        if (kind && k && ch !== undefined) drops.push({ kind, key: k, chance: ch, qty: q, ...(typeof d.rarity === 'string' && key(d.rarity) ? { rarity: d.rarity } : {}) });
      }
      if (drops.length) t.drops = drops;
    }
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
  const ch: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(e.chance))) { const n = num(v, 0, 1); if (key(k) && n !== undefined && n !== 1) ch[k] = n; }
  if (Object.keys(ch).length) et.chance = ch;
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
  const ml = obj(r.mall), mall: MallTune = {};
  const mp: Record<string, number> = {}; for (const [k, v] of Object.entries(obj(ml.price))) { const n = num(v, 0, 1e7); if (key(k) && n !== undefined) mp[k] = Math.round(n); }
  if (Object.keys(mp).length) mall.price = mp;
  if (Array.isArray(ml.off)) { const off = ml.off.filter((x): x is string => typeof x === 'string' && key(x)).slice(0, 60); if (off.length) mall.off = off; }
  const wg = obj(ml.wings), wa = num(wg.atk, 0, 1e5), wd = num(wg.def, 0, 1e5), wc = num(wg.crit, 0, 100);
  if (wa !== undefined || wd !== undefined || wc !== undefined) mall.wings = { ...(wa !== undefined ? { atk: wa } : {}), ...(wd !== undefined ? { def: wd } : {}), ...(wc !== undefined ? { crit: wc } : {}) };
  if (Object.keys(mall).length) out.mall = mall;
  const fs = obj(r.fishing), fish: FishingTune = {};
  const rp = num(fs.rodPrice, 0, 1e9); if (rp !== undefined) fish.rodPrice = Math.round(rp);
  const b0 = num(fs.biteMin, 0.5, 60), b1 = num(fs.biteMax, 0.5, 120); if (b0 !== undefined) fish.biteMin = b0; if (b1 !== undefined) fish.biteMax = b1;
  const ct: NonNullable<FishingTune['catches']> = {};
  for (const [k, v] of Object.entries(obj(fs.catches))) {
    if (!key(k)) continue; const o = obj(v), e: { weight?: number; diff?: number; price?: number; off?: boolean } = {};
    const w = num(o.weight, 0, 10000), d = num(o.diff, 1, 100), pr = num(o.price, 0, 1e7);
    if (w !== undefined) e.weight = w; if (d !== undefined) e.diff = Math.round(d); if (pr !== undefined) e.price = Math.round(pr); if (o.off === true) e.off = true;
    if (Object.keys(e).length) ct[k] = e;
  }
  if (Object.keys(ct).length) fish.catches = ct;
  if (Object.keys(fish).length) out.fishing = fish;
  if (Array.isArray(r.xpTable) && r.xpTable.length === 64) {
    const xt = r.xpTable.map((x) => num(x, 1, 1e9));
    if (!xt.some((x) => x === undefined)) out.xpTable = xt.map((x) => Math.round(x as number));
  }
  return out;
}
/** Ayarları yerinde günceller (aynı nesne; okuyanlar her seferinde güncel değeri görür). */
export function applyTuning(raw: unknown): GameTuning {
  const t = sanitizeTuning(raw);
  Object.assign(TUNING, t);
  return TUNING;
}
