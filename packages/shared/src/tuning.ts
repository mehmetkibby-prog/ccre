/**
 * Oyun ayarları (yönetim panelinden değişir). Varsayılanlar oyunun özgün dengesidir:
 * hepsi 1 / boşken davranış bu dosya yokmuş gibidir. Sunucu ve tarayıcı aynı nesneyi okur.
 */
/** Canavar türü başına ayar (boş alan = varsayılan / harita ganimet profili). */
import { QUESTS_DEFAULT, sanitizeQuests, type QuestDef } from './content/quests.ts';
import { DAYNIGHT_DEFAULT, sanitizeDayNight, type DayNightTune } from './dayNight.ts';
import { EVENTS_DEFAULT, sanitizeEvents, type EventsTune } from './events.ts';
import { GARDEN_DEFAULT, sanitizeGarden, type GardenTune } from './garden.ts';
import { FORGE_DEFAULT, sanitizeForge, EVO_DEFAULT, sanitizeEvo, type ForgeTune, type EvoTune } from './forgeTune.ts';
export interface MonsterTune {
  hpMul?: number; atkMul?: number; defAdd?: number; speedMul?: number; xpMul?: number; respawnMul?: number;
  equipChance?: number; // 0..1, ekipman düşme olasılığı
  rarity?: Record<string, number>; // nadirlik ağırlıkları
  gems?: [number, number]; essence?: [number, number];
  mats?: Record<string, number>; // malzeme düşme olasılığı (0..1)
  /** mutlak değerler (boss paneli): verilirse çarpanların yerine geçer */
  hp?: number; atk?: number; def?: number;
  /** canavar türünün sabit seviyesi (yönetim); boşsa MONSTER_LEVEL varsayılanı */
  level?: number;
  /** yeniden doğma süresi (dakika; boss) */
  respawnMin?: number;
  /**
   * Doğrudan değerler (yönetim "Canavarlar"): ref seviyesindeki normal canavarın canı/saldırısı/TP'si. Başka seviye ve
   * agresif/katil çeşitler aynı oranla ölçeklenir. speed: hız (birim/sn), respawnSec: yeniden doğma (saniye).
   */
  ref?: number; baseHp?: number; baseAtk?: number; baseXp?: number; speed?: number; respawnSec?: number;
  /** özel düşenler (boss paneli): eşya / malzeme / market ürünü, olasılık 0..1, adet */
  drops?: DropTune[];
}
/**
 * Bölge (harita) ganimet ayarı: haritadaki bütün canavarların ortak tablosu. Boş alanlar haritanın varsayılan
 * profilinden gelir; canavar türüne özel ayar (monsters) varsa onun üstüne yazar.
 *  maxLevel: bu seviyenin üstündeki oyuncu bu haritada az ganimet alır (0 = sınır yok); overMul: o durumda
 *  ekipman/malzeme/özel düşme çarpanı (ör. 0,1 = onda biri).
 */
export interface ZoneLootTune {
  equipChance?: number; rarity?: Record<string, number>; gems?: [number, number]; essence?: [number, number];
  mats?: Record<string, number>; drops?: DropTune[]; maxLevel?: number; overMul?: number;
  /** malzeme adedi (en az, en çok) */
  matQty?: Record<string, [number, number]>;
}
export interface DropTune { kind: 'item' | 'mat' | 'mall'; key: string; rarity?: string; chance: number; qty: [number, number] }
export interface MallTune { price?: Record<string, number>; off?: string[]; wings?: { atk?: number; def?: number; crit?: number } }
/** Dönüşüm (Haso): bkz. content/transform.ts */
export interface TransformCostTune { gems: number; mats: Record<string, number>; chance: number; minPlus: number; minLevel: number }
export interface TransformTune { enabled?: boolean; from?: string[]; cost?: Partial<Record<'weapon' | 'armor' | 'other', Partial<TransformCostTune>>> }
const RARITY_IDS = ['white', 'blue', 'orange', 'crimson', 'unique', 'infinite', 'purple', 'emerald'];
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
  /** Pazar Köyü yeni yıl süsü (ağaç, ışıklar, kar): 1 açık, 0 kapalı */
  newYear: number;
  /** Dünya Sağlığı: 1 Öz bağışının kazandırdığı puan (sağlık düştükçe etkisi artar). */
  worldDonateGain: number;
  /** saldırı tuşu: yakın dövüşçünün yürüyerek yaklaşacağı ek mesafe (px, ~64 = 1 adım) */
  meleeApproach: number;
  /** Tek hedefli saldırı becerilerinin hedef çevresine sıçrayan hasarı: yarıçap (px) ve çarpan (0 = kapalı) */
  splashRadius: number; splashMul: number;
  /** Market: X Öz → Y Mücevher dönüşümü ve Öz ile Kırmızı İksir fiyatı */
  essxEss: number; essxGems: number; potionEss: number;
  /** Market: bir Kırmızı İksirin Mücevher fiyatı */
  potionGems: number;
  /** Boss ganimeti: bossun canının en az bu yüzdesi kadar hasar veren her oyuncu ganimet alır */
  bossShareMin: number;
  /** Oto atak: günlük kullanım süresi (dakika; Türkiye saatiyle 00.00'da yenilenir) */
  autoAttackMin: number;
  /** saldırı tuşu: hedef ölünce bu süre (sn) boyunca yeni canavara yürünmez, yalnız menzildekine vurulur */
  retargetDelay: number;
  announcement: string;
  /** duyurunun ekranda kalma süresi (sn); 0 = kaldırılana kadar */
  annSec: number;
  /** duyurunun yayınlandığı an (epoch ms) */
  annAt: number;
  /** duyuru şeridinin rengi */
  annStyle: 'gold' | 'red' | 'green' | 'blue';
  /** Ana menüdeki küçük "2D oyun" düğmesinin adresi (boşsa düğme gizlenir). */
  classicUrl: string;
  monsters: Record<string, MonsterTune>;
  /** Bölge (harita) ganimet tabloları ve seviye sınırı */
  zoneLoot: Record<string, ZoneLootTune>;
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
  transform?: TransformTune;
  /** Seviye TP tablosu: 64 değer (1→2 … 64→65); boş = varsayılan tablo. */
  xpTable?: number[];
  /** Nesne Market: fiyatlar (ÇP), satıştan kaldırılanlar, kanat bonusları. */
  mall?: MallTune;
  /** Balıkçılık: olta fiyatı, vurma süresi, av tablosu. */
  fishing?: FishingTune;
  /** Savaş Arenası: otomatik saatler, süre, en düşük seviye, sıralama ödülleri. */
  arena: ArenaTune;
  /** Canavar sıralaması: dönem (gün/hafta/ay) ve ilk sıraların ödülleri (ÇP, Mücevher). */
  killRank: KillRankTune;
  /** Kadim Kule: kat başına canavar/güç/görev, kat malzemeleri ve Azrail Sandığı içeriği. */
  tower: TowerTune;
  /** Gece-gündüz döngüsü (Türkiye saati): açık/kapalı, gecenin koyuluğu, saatler, önizleme */
  dayNight: DayNightTune;
  /** etkinlikler (TP/eşya/Öz artışı, Kristal Sandık) */
  events: EventsTune;
  /** Şifa Bahçesi: orak, toplama, iksir tarifleri ve etkileri */
  garden: GardenTune;
  /** Kor Kulesi (Sv. 10+): dalgalar, katların canavar gücü, bulmacalar, Karademir ve Kor Sandığı */
  forge: ForgeTune;
  /** Silah/zırh evrimi: kademe başına av, Mücevher, malzeme ve artış */
  evo: EvoTune;
  /** Üretim (Zanaatkâr Pakize): yönetimden tanımlanan tarifler */
  crafts: CraftRecipe[];
  /** Görevler (yönetimden tasarlanır): bkz. content/quests.ts */
  quests: QuestDef[];
  /** Beceri geliştirme maliyeti: [0] = Sv. 1→2 … [8] = Sv. 9→10 (Mücevher, uzmanlık becerisi Mücevheri, malzemeler) */
  skillUp: SkillUpStep[];
  /** becerilerin açılma seviyesi (beceri kimliği → seviye); boş = sınıf tanımındaki */
  skillUnlock: Record<string, number>;
  /** uzmanlık seçme (ve uzmanlık becerisi) seviyesi */
  specLevel: number;
}
export interface SkillUpStep { gems: number; specGems: number; mats: Record<string, number> }
/** Varsayılan: Mücevher = seviye × 5, uzmanlık becerisi iki katı, malzeme yok (önceki sabit kural). */
export const SKILLUP_DEFAULT: SkillUpStep[] = Array.from({ length: 9 }, (_, i) => ({ gems: (i + 1) * 5, specGems: (i + 1) * 10, mats: {} }));
/** Beceri cur → cur+1 maliyeti (spec: uzmanlık becerisi). */
export function skillUpCost(cur: number, spec: boolean, t: { skillUp?: SkillUpStep[] } = TUNING): { gems: number; mats: Record<string, number> } {
  const st = (t.skillUp ?? SKILLUP_DEFAULT)[Math.max(0, Math.min(8, cur - 1))] ?? SKILLUP_DEFAULT[0];
  return { gems: spec ? st.specGems : st.gems, mats: st.mats ?? {} };
}
/**
 * Üretim tarifi: girdiler (malzeme / market ürünü anahtarı → adet), mücevher ve öz bedeli; çıktı eşya, malzeme ya da
 * market ürünü. Eşya anahtarı "w_cls" / "a_cls" / "h_cls" ise üretenin kendi sınıfının silahı/zırhı/miğferi olur.
 * Başarısızlıkta mücevher/öz gider, malzemelerin yarısı geri döner.
 */
export interface CraftRecipe {
  id: string; name: string;
  out: { kind: 'item' | 'mat' | 'mall'; key: string; rarity?: string; qty: number };
  inputs: Record<string, number>; gems: number; essence: number;
  /** başarı şansı (yüzde) ve en düşük seviye */
  chance: number; minLevel: number;
  off?: boolean;
}
export const CRAFTS_DEFAULT: CraftRecipe[] = [
  { id: 'r_mastery', name: 'Ustalık Mührü', out: { kind: 'mat', key: 'mastery_seal', qty: 1 }, inputs: { tower_seal: 3, mourn_silk: 2 }, gems: 500, essence: 0, chance: 100, minLevel: 25 },
  { id: 'r_necklace', name: 'Kadim Kolye', out: { kind: 'item', key: 'necklace', rarity: 'crimson', qty: 1 }, inputs: { tower_seal: 5, soul_ring: 3, sly_core: 2 }, gems: 2000, essence: 200, chance: 60, minLevel: 30 },
  { id: 'r_earring', name: 'Kadim Küpe', out: { kind: 'item', key: 'earring', rarity: 'crimson', qty: 1 }, inputs: { tower_seal: 4, sly_core: 3, mourn_silk: 2 }, gems: 2000, essence: 200, chance: 60, minLevel: 30 },
  { id: 'r_bracelet', name: 'Kadim Bilezik', out: { kind: 'item', key: 'bracelet', rarity: 'crimson', qty: 1 }, inputs: { tower_seal: 4, soul_ring: 3, mourn_silk: 2 }, gems: 2000, essence: 200, chance: 60, minLevel: 30 },
  { id: 'r_azrail_weapon', name: 'Azrail\'in Silahı (sınıfına)', out: { kind: 'item', key: 'w_cls', rarity: 'unique', qty: 1 }, inputs: { azrail_hook: 1, tower_seal: 10, soul_ring: 5, sly_core: 5, mourn_silk: 5 }, gems: 10000, essence: 1000, chance: 50, minLevel: 40 },
];
export function sanitizeCrafts(raw: unknown): CraftRecipe[] {
  if (!Array.isArray(raw)) return structuredClone(CRAFTS_DEFAULT);
  const key = (v: unknown) => typeof v === 'string' && /^[a-z0-9_]{1,32}$/.test(v) ? v : null;
  const num = (v: unknown, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const out: CraftRecipe[] = []; const ids = new Set<string>();
  for (const x of raw.slice(0, 60)) {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    const id = key(o.id); if (!id || ids.has(id)) continue;
    const oo = (o.out && typeof o.out === 'object' ? o.out : {}) as Record<string, unknown>;
    const kind = oo.kind === 'item' || oo.kind === 'mat' || oo.kind === 'mall' ? oo.kind : null; const k = key(oo.key);
    if (!kind || !k) continue;
    const inputs: Record<string, number> = {};
    for (const [ik, iv] of Object.entries((o.inputs && typeof o.inputs === 'object' ? o.inputs : {}) as Record<string, unknown>).slice(0, 8)) { const kk = key(ik), q = Math.round(num(iv, 0, 9999, 0)); if (kk && q > 0) inputs[kk] = q; }
    ids.add(id);
    out.push({
      id, name: typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 40) : id,
      out: { kind, key: k, qty: Math.round(num(oo.qty, 1, 999, 1)), ...(kind === 'item' && typeof oo.rarity === 'string' && RARITY_IDS.includes(oo.rarity) ? { rarity: oo.rarity } : {}) },
      inputs, gems: Math.round(num(o.gems, 0, 1e9, 0)), essence: Math.round(num(o.essence, 0, 1e9, 0)), chance: num(o.chance, 0, 100, 100), minLevel: Math.round(num(o.minLevel, 1, 120, 1)),
      ...(o.off === true ? { off: true } : {}),
    });
  }
  return out;
}
/** Kat görevi: öldür / mühür sırası / anahtar / bilmece / sunak / boss (Azrail). */
export type TowerPuzzle = 'kill' | 'seq' | 'key' | 'riddle' | 'altar' | 'boss';
export const TOWER_PUZZLES: TowerPuzzle[] = ['kill', 'seq', 'key', 'riddle', 'altar', 'boss'];
export interface TowerFloorTune {
  puzzle: TowerPuzzle; monster: string; count: number; level: [number, number];
  /** canavar can ve saldırı çarpanı (bu kattaki canavarlara) */
  hpMul: number; atkMul: number;
  /** öldürme görevinde gereken canavar sayısı */
  kills: number;
  /** kat malzemelerinin düşme olasılığı (0..1) */
  mats: Record<string, number>;
}
export interface TowerTune {
  enabled: boolean; minLevel: number;
  floors: TowerFloorTune[];
  /** anahtar katında her öldürmede Kat Anahtarı olasılığı (0..1); 15 öldürmede kesin */
  keyChance: number;
  /** Azrail Sandığı: mücevher, öz, özel düşenler ve Azrail Kancası olasılığı */
  chest: { gems: [number, number]; essence: [number, number]; drops: DropTune[]; hookChance: number };
}
export const TOWER_MATS = ['tower_seal', 'soul_ring', 'sly_core', 'mourn_silk'];
const tf = (puzzle: TowerPuzzle, monster: string, count: number, level: [number, number], kills: number, k: number): TowerFloorTune =>
  ({ puzzle, monster, count, level, hpMul: 1, atkMul: 1, kills, mats: { tower_seal: 0.03 * k, soul_ring: 0.02 * k, sly_core: 0.015 * k, mourn_silk: 0.015 * k } });
export const TOWER_DEFAULT: TowerTune = {
  enabled: true, minLevel: 25, keyChance: 0.12,
  floors: [
    tf('kill', 't_skeleton', 14, [26, 28], 12, 1), tf('kill', 't_skeleton', 16, [28, 30], 15, 1),
    tf('seq', 't_gargoyle', 10, [30, 32], 0, 1.2), tf('kill', 't_gargoyle', 16, [32, 34], 15, 1.2),
    tf('key', 't_wraith', 14, [34, 36], 0, 1.4), tf('kill', 't_wraith', 16, [36, 38], 18, 1.4),
    tf('riddle', 't_knight', 8, [38, 40], 0, 1.6), tf('kill', 't_knight', 16, [40, 42], 18, 1.6),
    tf('altar', 't_executioner', 10, [42, 44], 0, 2), tf('boss', 'azrail', 1, [50, 50], 0, 0),
  ],
  chest: {
    gems: [400, 1000], essence: [150, 400], hookChance: 0.05,
    drops: [
      { kind: 'mat', key: 'tower_seal', chance: 0.6, qty: [1, 3] }, { kind: 'mat', key: 'soul_ring', chance: 0.45, qty: [1, 2] },
      { kind: 'mat', key: 'sly_core', chance: 0.35, qty: [1, 2] }, { kind: 'mat', key: 'mourn_silk', chance: 0.35, qty: [1, 2] },
      { kind: 'mat', key: 'red_potion', chance: 1, qty: [10, 20] },
    ],
  },
};
export function sanitizeTower(raw: unknown): TowerTune {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const D = TOWER_DEFAULT;
  const num = (v: unknown, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
  const pair = (v: unknown, lo: number, hi: number, d: [number, number]): [number, number] => {
    if (!Array.isArray(v) || v.length !== 2) return [...d];
    const a = Math.round(num(v[0], lo, hi, d[0])), b = Math.round(num(v[1], lo, hi, d[1])); return [Math.min(a, b), Math.max(a, b)];
  };
  const id = (v: unknown, d: string) => typeof v === 'string' && /^[a-z0-9_]{1,32}$/.test(v) ? v : d;
  const fl = Array.isArray(r.floors) ? r.floors : [];
  const floors = D.floors.map((d, i) => {
    const o = obj(fl[i]);
    const mats: Record<string, number> = { ...d.mats };
    for (const [k, v] of Object.entries(obj(o.mats)).slice(0, 8)) if (/^[a-z0-9_]{1,32}$/.test(k)) mats[k] = num(v, 0, 1, 0);
    const puzzle = TOWER_PUZZLES.includes(o.puzzle as TowerPuzzle) ? o.puzzle as TowerPuzzle : d.puzzle;
    return {
      puzzle: i === 9 ? 'boss' as const : puzzle === 'boss' ? 'kill' as const : puzzle,
      monster: id(o.monster, d.monster), count: Math.round(num(o.count, i === 9 ? 1 : 0, 60, d.count)), level: pair(o.level, 1, 120, d.level),
      hpMul: num(o.hpMul, 0.05, 50, d.hpMul), atkMul: num(o.atkMul, 0.05, 50, d.atkMul), kills: Math.round(num(o.kills, 0, 500, d.kills)), mats,
    };
  });
  const c = obj(r.chest);
  const drops: DropTune[] = [];
  if (Array.isArray(c.drops)) for (const raw2 of c.drops.slice(0, 24)) {
    const d = obj(raw2); const kind = d.kind === 'item' || d.kind === 'mat' || d.kind === 'mall' ? d.kind : null;
    const k = typeof d.key === 'string' && /^[a-z0-9_:]{1,32}$/.test(d.key) ? d.key : null;
    if (kind && k) drops.push({ kind, key: k, chance: num(d.chance, 0, 1, 0), qty: pair(d.qty, 1, 9999, [1, 1]), ...(typeof d.rarity === 'string' && /^[a-z]{1,16}$/.test(d.rarity) ? { rarity: d.rarity } : {}) });
  }
  return {
    enabled: r.enabled === undefined ? D.enabled : !!r.enabled, minLevel: Math.round(num(r.minLevel, 1, 120, D.minLevel)), keyChance: num(r.keyChance, 0, 1, D.keyChance), floors,
    chest: { gems: pair(c.gems, 0, 1e7, D.chest.gems), essence: pair(c.essence, 0, 1e7, D.chest.essence), hookChance: num(c.hookChance, 0, 1, D.chest.hookChance), drops: Array.isArray(c.drops) ? drops : structuredClone(D.chest.drops) },
  };
}
export interface KillRankTune { period: 'day' | 'week' | 'month'; rewards: { cp: number; gems: number }[] }
export const KILLRANK_DEFAULT: KillRankTune = { period: 'week', rewards: [{ cp: 100, gems: 0 }, { cp: 50, gems: 0 }, { cp: 0, gems: 1000 }] };
function sanitizeKillRank(raw: unknown): KillRankTune {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown, hi: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(0, Math.round(n))) : 0; };
  const period = r.period === 'day' || r.period === 'month' || r.period === 'week' ? r.period : KILLRANK_DEFAULT.period;
  const rewards = Array.isArray(r.rewards) ? r.rewards.slice(0, 10).map((x) => { const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>; return { cp: num(o.cp, 1e6), gems: num(o.gems, 1e8) }; }) : structuredClone(KILLRANK_DEFAULT.rewards);
  return { period, rewards };
}
/** Arena ödülü (sıra başına): mücevher, malzeme/market ürünleri (anahtar → adet), isteğe bağlı eşya. */
export interface ArenaReward { gems: number; mats: Record<string, number>; item?: { tpl: string; rarity: string; plus: number } }
export interface ArenaTune { auto: boolean; times: string[]; durationMin: number; minLevel: number; rewards: ArenaReward[] }
export const ARENA_DEFAULT: ArenaTune = {
  auto: false, times: ['21:00'], durationMin: 15, minLevel: 10,
  rewards: [{ gems: 5000, mats: {} }, { gems: 3000, mats: {} }, { gems: 1500, mats: {} }],
};
function sanitizeArena(raw: unknown): ArenaTune {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };
  const times = Array.isArray(r.times) ? [...new Set(r.times.map(String).filter((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)))].sort().slice(0, 12) : ARENA_DEFAULT.times;
  const rewards = Array.isArray(r.rewards) ? r.rewards.slice(0, 10).map((x) => {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    const mats: Record<string, number> = {};
    for (const [k, v] of Object.entries((o.mats && typeof o.mats === 'object' ? o.mats : {}) as Record<string, unknown>).slice(0, 6)) if (/^[a-z0-9_]{1,32}$/.test(k)) { const q = num(v, 0, 9999, 0); if (q > 0) mats[k] = q; }
    const it = o.item && typeof o.item === 'object' ? o.item as Record<string, unknown> : null;
    const item = it && /^[a-z0-9_]{1,40}$/.test(String(it.tpl)) && RARITY_IDS.includes(String(it.rarity)) ? { tpl: String(it.tpl), rarity: String(it.rarity), plus: num(it.plus, 0, 9, 0) } : undefined;
    return { gems: num(o.gems, 0, 10_000_000, 0), mats, ...(item ? { item } : {}) };
  }) : structuredClone(ARENA_DEFAULT.rewards);
  return { auto: r.auto === undefined ? ARENA_DEFAULT.auto : !!r.auto, times, durationMin: num(r.durationMin, 3, 120, ARENA_DEFAULT.durationMin), minLevel: num(r.minLevel, 1, 100, ARENA_DEFAULT.minLevel), rewards };
}
export interface UpgradeStepTune { chance: number; gems: number; mats: Record<string, number>; weapon: number; armor: number }
export interface UpgradeTune { steps?: UpgradeStepTune[]; failDown?: boolean }
export const DEFAULT_TUNING: GameTuning = {
  xpMul: 1, gemMul: 1, essenceMul: 1, dropMul: 1,
  monsterHpMul: 1, monsterAtkMul: 1, respawnMul: 1,
  density: {}, bots: 8, worldDecayMul: 1, brightness: 1, newYear: 1, worldDonateGain: 0.02, meleeApproach: 90, splashRadius: 140, splashMul: 0.7, retargetDelay: 1.2, autoAttackMin: 120, essxEss: 200, essxGems: 15, potionEss: 20, potionGems: 5, bossShareMin: 3, announcement: '', annSec: 60, annAt: 0, annStyle: 'gold', classicUrl: 'https://2d.coreoflife.net',
  monsters: {}, zoneLoot: {}, spawns: {}, enchants: {}, rarityPower: {}, rarityDrop: {}, sellPrice: {}, upgrade: {},
  arena: structuredClone(ARENA_DEFAULT),
  killRank: structuredClone(KILLRANK_DEFAULT),
  tower: structuredClone(TOWER_DEFAULT),
  forge: structuredClone(FORGE_DEFAULT),
  dayNight: structuredClone(DAYNIGHT_DEFAULT),
  events: structuredClone(EVENTS_DEFAULT),
  garden: structuredClone(GARDEN_DEFAULT),
  evo: structuredClone(EVO_DEFAULT),
  crafts: structuredClone(CRAFTS_DEFAULT),
  skillUp: structuredClone(SKILLUP_DEFAULT),
  skillUnlock: {}, specLevel: 30,
  quests: structuredClone(QUESTS_DEFAULT),
};
/** Panelde gösterilen sınırlar: değerler her zaman bu aralığa sıkıştırılır. */
export const TUNING_LIMITS: Record<Exclude<keyof GameTuning, 'density' | 'announcement' | 'annSec' | 'annAt' | 'annStyle' | 'classicUrl' | 'monsters' | 'zoneLoot' | 'spawns' | 'enchants' | 'rarityPower' | 'rarityDrop' | 'sellPrice' | 'upgrade' | 'xpTable' | 'mall' | 'fishing' | 'transform' | 'arena' | 'killRank' | 'tower' | 'forge' | 'dayNight' | 'events' | 'garden' | 'evo' | 'crafts' | 'quests' | 'skillUp' | 'skillUnlock'>, [number, number, number]> = {
  xpMul: [0.1, 10, 0.1], gemMul: [0, 10, 0.1], essenceMul: [0, 10, 0.1], dropMul: [0, 10, 0.1],
  monsterHpMul: [0.2, 5, 0.05], monsterAtkMul: [0.2, 5, 0.05], respawnMul: [0.2, 5, 0.05],
  bots: [0, 24, 1], worldDecayMul: [0, 5, 0.1], brightness: [0.6, 1.6, 0.05], newYear: [0, 1, 1], worldDonateGain: [0, 0.5, 0.005], meleeApproach: [0, 320, 10], splashRadius: [0, 400, 10], splashMul: [0, 1.5, 0.05], autoAttackMin: [0, 1440, 5], retargetDelay: [0, 5, 0.1], essxEss: [10, 100000, 10], essxGems: [1, 100000, 1], potionEss: [1, 10000, 1], potionGems: [1, 10000, 1], specLevel: [1, 120, 1], bossShareMin: [0, 50, 0.5],
};
export const DENSITY_LIMITS: [number, number, number] = [0.3, 3, 0.05];
export const TUNING: GameTuning = structuredClone(DEFAULT_TUNING);

const clamp = (v: unknown, [lo, hi]: [number, number, number], d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
/** Güvenilmeyen kaynaktan gelen ayarı doğrular; eksik alan varsayılan kalır. */
export function sanitizeTuning(raw: unknown): GameTuning {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = structuredClone(DEFAULT_TUNING);
  for (const k of Object.keys(TUNING_LIMITS) as (keyof typeof TUNING_LIMITS)[]) out[k] = clamp(r[k], TUNING_LIMITS[k], DEFAULT_TUNING[k]);
  out.bots = Math.round(out.bots); out.newYear = out.newYear >= 0.5 ? 1 : 0;
  const dn = (r.density && typeof r.density === 'object' ? r.density : {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(dn)) if (/^[a-z_]{1,24}$/.test(k)) out.density[k] = clamp(v, DENSITY_LIMITS, 1);
  out.announcement = typeof r.announcement === 'string' ? r.announcement.slice(0, 200) : '';
  { const n = Number(r.annSec); out.annSec = Number.isFinite(n) ? Math.round(Math.min(86400, Math.max(0, n))) : DEFAULT_TUNING.annSec; }
  { const n = Number(r.annAt); out.annAt = Number.isFinite(n) && n > 0 ? Math.round(n) : 0; }
  out.annStyle = (['gold', 'red', 'green', 'blue'] as const).includes(r.annStyle as 'gold') ? r.annStyle as GameTuning['annStyle'] : 'gold';
  // yalnız https:// ya da site içi yol (javascript: vb. engellenir)
  out.classicUrl = typeof r.classicUrl === 'string' && /^(https:\/\/[^\s"'<>]+|\/[^\s"'<>]*)?$/.test(r.classicUrl.trim()) ? r.classicUrl.trim().slice(0, 200) : DEFAULT_TUNING.classicUrl;
  out.arena = sanitizeArena(r.arena);
  out.killRank = sanitizeKillRank(r.killRank);
  out.tower = sanitizeTower(r.tower);
  out.forge = sanitizeForge(r.forge);
  out.dayNight = sanitizeDayNight(r.dayNight);
  out.events = sanitizeEvents(r.events);
  out.garden = sanitizeGarden(r.garden);
  out.evo = sanitizeEvo(r.evo);
  out.crafts = sanitizeCrafts(r.crafts);
  out.quests = sanitizeQuests(r.quests);
  out.skillUp = sanitizeSkillUp(r.skillUp);
  out.specLevel = Math.round(out.specLevel);
  { const su = (r.skillUnlock && typeof r.skillUnlock === 'object' && !Array.isArray(r.skillUnlock) ? r.skillUnlock : {}) as Record<string, unknown>; for (const [k, v] of Object.entries(su)) { const n = Number(v); if (/^[a-z0-9_]{1,24}$/.test(k) && Number.isFinite(n)) out.skillUnlock[k] = Math.round(Math.min(120, Math.max(1, n))); } }
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
  const parseDrops = (v: unknown): DropTune[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const drops: DropTune[] = [];
    for (const raw2 of v.slice(0, 24)) {
      const d = obj(raw2); const kind = d.kind === 'item' || d.kind === 'mat' || d.kind === 'mall' ? d.kind : null;
      const k = typeof d.key === 'string' && key(d.key) ? d.key : null; const ch = num(d.chance, 0, 1); const q = pair(d.qty, 1, 9999) ?? [1, 1];
      if (kind && k && ch !== undefined) drops.push({ kind, key: k, chance: ch, qty: q, ...(typeof d.rarity === 'string' && key(d.rarity) ? { rarity: d.rarity } : {}) });
    }
    return drops.length ? drops : undefined;
  };
  for (const [id, raw] of Object.entries(obj(r.zoneLoot))) {
    if (!key(id)) continue;
    const m = obj(raw), t: ZoneLootTune = {};
    const set = <K extends keyof ZoneLootTune>(k: K, v: ZoneLootTune[K] | undefined) => { if (v !== undefined) t[k] = v; };
    set('equipChance', num(m.equipChance, 0, 1)); set('gems', pair(m.gems, 0, 1_000_000)); set('essence', pair(m.essence, 0, 1_000_000));
    const rar: Record<string, number> = {}; for (const [k, v] of Object.entries(obj(m.rarity))) { const n = num(v, 0, 10000); if (key(k) && n !== undefined) rar[k] = n; }
    if (Object.keys(rar).length && Object.values(rar).some((x) => x > 0)) t.rarity = rar;
    const mats: Record<string, number> = {}; for (const [k, v] of Object.entries(obj(m.mats))) { const n = num(v, 0, 1); if (key(k) && n !== undefined) mats[k] = n; }
    if (Object.keys(mats).length) t.mats = mats;
    const mq: Record<string, [number, number]> = {}; for (const [k, v] of Object.entries(obj(m.matQty))) { const q = pair(v, 1, 9999); if (key(k) && q) mq[k] = [Math.round(q[0]), Math.round(Math.max(q[0], q[1]))]; }
    if (Object.keys(mq).length) t.matQty = mq;
    set('drops', parseDrops(m.drops));
    const ml = num(m.maxLevel, 0, 120); if (ml !== undefined) t.maxLevel = Math.round(ml);
    set('overMul', num(m.overMul, 0, 1));
    if (Object.keys(t).length) out.zoneLoot[id] = t;
  }
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
    const ref = num(m.ref, 1, 120); if (ref !== undefined) t.ref = Math.round(ref);
    const lvl = num(m.level, 1, 120); if (lvl !== undefined) t.level = Math.round(lvl);
    set('baseHp', num(m.baseHp, 1, 1e9)); set('baseAtk', num(m.baseAtk, 0, 1e7)); set('baseXp', num(m.baseXp, 0, 1e8));
    set('speed', num(m.speed, 0, 1000)); set('respawnSec', num(m.respawnSec, 1, 24 * 3600));
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
  // dönüşüm (Haso): kaynak nadirlikler, grup başına mücevher/malzeme/şans/en az artı/seviye
  const tr = obj(r.transform);
  if (Object.keys(tr).length) {
    const t: TransformTune = {};
    if (typeof tr.enabled === 'boolean') t.enabled = tr.enabled;
    if (Array.isArray(tr.from)) t.from = tr.from.filter((x): x is string => typeof x === 'string' && RARITY_IDS.includes(x) && x !== 'unique').slice(0, 8);
    const cost: NonNullable<TransformTune['cost']> = {};
    for (const g of ['weapon', 'armor', 'other'] as const) {
      const o = obj(obj(tr.cost)[g]);
      if (!Object.keys(o).length) continue;
      const mats: Record<string, number> = {};
      for (const [k, v] of Object.entries(obj(o.mats)).slice(0, 6)) { const n = num(v, 0, 9999); if (key(k) && n) mats[k] = Math.round(n); }
      cost[g] = { gems: Math.round(num(o.gems, 0, 1e8) ?? 0), mats, chance: num(o.chance, 0, 100) ?? 100, minPlus: Math.round(num(o.minPlus, 0, 6) ?? 0), minLevel: Math.round(num(o.minLevel, 1, 200) ?? 1) };
    }
    if (Object.keys(cost).length) t.cost = cost;
    out.transform = t;
  }
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

function sanitizeSkillUp(raw: unknown): SkillUpStep[] {
  const arr = Array.isArray(raw) ? raw : [];
  return SKILLUP_DEFAULT.map((d, i) => {
    const o = (arr[i] && typeof arr[i] === 'object' ? arr[i] : {}) as Record<string, unknown>;
    const n = (v: unknown, dv: number) => { const x = Number(v); return Number.isFinite(x) ? Math.round(Math.min(1e9, Math.max(0, x))) : dv; };
    const mats: Record<string, number> = {};
    const m = o.mats && typeof o.mats === 'object' && !Array.isArray(o.mats) ? o.mats as Record<string, unknown> : {};
    for (const [k, v] of Object.entries(m).slice(0, 8)) { const q = n(v, 0); if (/^[a-z0-9_]{1,40}$/.test(k) && q > 0) mats[k] = q; }
    return { gems: n(o.gems, d.gems), specGems: n(o.specGems, d.specGems), mats };
  });
}
