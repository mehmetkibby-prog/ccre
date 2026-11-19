/**
 * Kor Kulesi ve silah/zırh evrimi ayarları (yönetim panelinden değişir). Varsayılanlar oyunun özgün dengesidir.
 */
import type { DropTune } from './tuning.ts';
import { FORGE_PUZZLES, MOLD_MAX_PAIRS, type ForgePuzzle } from './content/forge.ts';

/** Bir dalga: canavar türü, normal sayısı, elit sayısı (grupta oyuncu başına artar) */
export interface ForgeWaveTune { monster: string; count: number; elite: number }
/** Bir katın canavar gücü (mutlak değerler): seviye, can, saldırı, savunma, TP */
export interface ForgeMonTune { level: number; hp: number; atk: number; def: number; xp: number }
export interface ForgeFloorTune {
  puzzle: ForgePuzzle;
  waves: ForgeWaveTune[];
  mon: ForgeMonTune;
  /** bu kattaki her öldürmede malzeme düşme olasılığı (0..1) ve adet */
  mats: { key: string; chance: number; qty: [number, number] }[];
}
export interface ForgeBossTune extends ForgeMonTune {
  /** canı bu yüzdelerin altına inince yardımcı golem çağırır */
  addAt: number[]; adds: number;
  /** tehlike alanı (yer çatlağı) hasar çarpanı */
  slamMul: number;
  /** boss ölünce her katkı verene doğrudan düşenler */
  drops: DropTune[];
}
export interface ForgeTune {
  enabled: boolean; minLevel: number;
  /** giriş bedeli (Mücevher) ve iki giriş arası bekleme (dakika) */
  entryGems: number; cooldownMin: number;
  /** grup: her ek oyuncu için dalga canavarı artışı (0.5 = %50) */
  partyScale: number;
  /** dalgalar arası nefes (saniye) */
  waveDelay: number;
  /** elit çarpanları (katın canavar gücüne göre) ve elit ganimet çarpanı */
  eliteHp: number; eliteAtk: number; eliteXp: number; eliteLoot: number;
  /** döküm kalıbı: çift sayısı ve yanlışta can kaybı (%) */
  moldPairs: number; moldZap: number;
  /** kor taşıma: köz sayısı ve soğuma süresi (sn) */
  emberCount: number; emberSec: number;
  /** 1. ve 2. kat */
  floors: ForgeFloorTune[];
  boss: ForgeBossTune;
  /** Kor Sandığı içeriği (bossu yenen herkese 1 sandık) */
  chest: { gems: [number, number]; essence: [number, number]; drops: DropTune[] };
}

export const FORGE_MATS = ['ember_stone', 'star_iron', 'evo_crystal'];
export const FORGE_DEFAULT: ForgeTune = {
  enabled: true, minLevel: 10, entryGems: 0, cooldownMin: 0, partyScale: 0.5, waveDelay: 4,
  eliteHp: 3, eliteAtk: 1.4, eliteXp: 4, eliteLoot: 3,
  moldPairs: 3, moldZap: 6, emberCount: 3, emberSec: 14,
  floors: [
    {
      puzzle: 'mold',
      waves: [{ monster: 'f_slag', count: 3, elite: 0 }, { monster: 'f_slag', count: 4, elite: 0 }, { monster: 'f_slag', count: 3, elite: 1 }],
      mon: { level: 12, hp: 1000, atk: 40, def: 8, xp: 70 },
      mats: [{ key: 'ember_stone', chance: 0.1, qty: [1, 1] }, { key: 'star_iron', chance: 0.02, qty: [1, 1] }],
    },
    {
      puzzle: 'ember',
      waves: [{ monster: 'f_brute', count: 4, elite: 0 }, { monster: 'f_brute', count: 5, elite: 0 }, { monster: 'f_brute', count: 4, elite: 2 }],
      mon: { level: 15, hp: 1400, atk: 50, def: 10, xp: 95 },
      mats: [{ key: 'ember_stone', chance: 0.14, qty: [1, 2] }, { key: 'star_iron', chance: 0.05, qty: [1, 1] }],
    },
  ],
  boss: {
    level: 20, hp: 24000, atk: 80, def: 14, xp: 3000, addAt: [70, 35], adds: 3, slamMul: 2.2,
    drops: [
      { kind: 'mat', key: 'ember_stone', chance: 1, qty: [3, 6] },
      { kind: 'mat', key: 'star_iron', chance: 0.6, qty: [1, 3] },
      { kind: 'mat', key: 'evo_crystal', chance: 0.12, qty: [1, 1] },
    ],
  },
  chest: {
    gems: [150, 400], essence: [50, 150],
    drops: [
      { kind: 'mat', key: 'ember_stone', chance: 1, qty: [2, 5] },
      { kind: 'mat', key: 'star_iron', chance: 0.5, qty: [1, 2] },
      { kind: 'mat', key: 'evo_crystal', chance: 0.08, qty: [1, 1] },
      { kind: 'mat', key: 'red_potion', chance: 1, qty: [5, 10] },
    ],
  },
};

/** Evrim kademesi: gereken av (son evrimden beri), Mücevher, malzemeler ve toplam artış (%) */
export interface EvoStep { kills: number; gems: number; mats: Record<string, number>; pct: number }
export interface EvoTune {
  enabled: boolean;
  /** silah: saldırı artışı · zırh: savunma artışı (kademe 1..3, toplam) */
  weapon: EvoStep[]; armor: EvoStep[];
  /** av sayılması için canavar en çok bu kadar seviye aşağıda olabilir (0 = her canavar sayılır) */
  maxGap: number;
}
export const EVO_TIERS = 3;
export const EVO_NAMES = ['', 'Uyanmış', 'Dövülmüş', 'Yücelmiş'];
export const EVO_COLORS = ['', '#5ad8ff', '#c27bff', '#ffd25a'];
export const EVO_DEFAULT: EvoTune = {
  enabled: true, maxGap: 15,
  weapon: [
    { kills: 300, gems: 1000, mats: { ember_stone: 10, star_iron: 2 }, pct: 8 },
    { kills: 1000, gems: 3000, mats: { ember_stone: 20, star_iron: 6, evo_crystal: 1 }, pct: 16 },
    { kills: 2500, gems: 7000, mats: { ember_stone: 35, star_iron: 12, evo_crystal: 2 }, pct: 25 },
  ],
  armor: [
    { kills: 300, gems: 1000, mats: { ember_stone: 10, star_iron: 2 }, pct: 8 },
    { kills: 1000, gems: 3000, mats: { ember_stone: 20, star_iron: 6, evo_crystal: 1 }, pct: 15 },
    { kills: 2500, gems: 7000, mats: { ember_stone: 35, star_iron: 12, evo_crystal: 2 }, pct: 22 },
  ],
};

const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
const num = (v: unknown, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const int = (v: unknown, lo: number, hi: number, d: number) => Math.round(num(v, lo, hi, d));
const id = (v: unknown, d: string) => (typeof v === 'string' && /^[a-z0-9_]{1,32}$/.test(v) ? v : d);
const pair = (v: unknown, lo: number, hi: number, d: [number, number]): [number, number] => {
  if (!Array.isArray(v) || v.length !== 2) return [...d];
  const a = int(v[0], lo, hi, d[0]), b = int(v[1], lo, hi, d[1]); return [Math.min(a, b), Math.max(a, b)];
};
export function sanitizeDrops(v: unknown, d: DropTune[]): DropTune[] { return drops(v, d); }
function drops(v: unknown, d: DropTune[]): DropTune[] {
  if (!Array.isArray(v)) return structuredClone(d);
  const out: DropTune[] = [];
  for (const raw of v.slice(0, 24)) {
    const o = obj(raw); const kind = o.kind === 'item' || o.kind === 'mat' || o.kind === 'mall' ? o.kind : null;
    const k = typeof o.key === 'string' && /^[a-z0-9_:]{1,32}$/.test(o.key) ? o.key : null;
    if (kind && k) out.push({ kind, key: k, chance: num(o.chance, 0, 1, 0), qty: pair(o.qty, 1, 9999, [1, 1]), ...(typeof o.rarity === 'string' && /^[a-z]{1,16}$/.test(o.rarity) ? { rarity: o.rarity } : {}) });
  }
  return out;
}
function mon(v: unknown, d: ForgeMonTune): ForgeMonTune {
  const o = obj(v);
  return { level: int(o.level, 1, 120, d.level), hp: int(o.hp, 1, 1e8, d.hp), atk: int(o.atk, 0, 1e6, d.atk), def: int(o.def, 0, 1e5, d.def), xp: int(o.xp, 0, 1e8, d.xp) };
}
export function sanitizeForge(raw: unknown): ForgeTune {
  const r = obj(raw), D = FORGE_DEFAULT;
  const fl = Array.isArray(r.floors) ? r.floors : [];
  const floors = D.floors.map((d, i) => {
    const o = obj(fl[i]);
    const wv = Array.isArray(o.waves) ? o.waves : [];
    const waves = d.waves.map((dw, j) => { const w = obj(wv[j]); return { monster: id(w.monster, dw.monster), count: int(w.count, 0, 40, dw.count), elite: int(w.elite, 0, 10, dw.elite) }; });
    const mats = Array.isArray(o.mats) ? o.mats.slice(0, 8).map((m) => { const x = obj(m); return { key: id(x.key, ''), chance: num(x.chance, 0, 1, 0), qty: pair(x.qty, 1, 999, [1, 1]) }; }).filter((m) => m.key) : structuredClone(d.mats);
    return { puzzle: FORGE_PUZZLES.includes(o.puzzle as ForgePuzzle) ? o.puzzle as ForgePuzzle : d.puzzle, waves, mon: mon(o.mon, d.mon), mats };
  });
  const b = obj(r.boss), c = obj(r.chest);
  const addAt = Array.isArray(b.addAt) ? b.addAt.map(Number).filter((n) => Number.isFinite(n) && n >= 1 && n <= 99).slice(0, 4).map(Math.round).sort((a, z) => z - a) : [...D.boss.addAt];
  return {
    enabled: r.enabled === undefined ? D.enabled : !!r.enabled, minLevel: int(r.minLevel, 1, 120, D.minLevel),
    entryGems: int(r.entryGems, 0, 1e7, D.entryGems), cooldownMin: int(r.cooldownMin, 0, 1440, D.cooldownMin),
    partyScale: num(r.partyScale, 0, 3, D.partyScale), waveDelay: num(r.waveDelay, 1, 30, D.waveDelay),
    eliteHp: num(r.eliteHp, 1, 50, D.eliteHp), eliteAtk: num(r.eliteAtk, 1, 20, D.eliteAtk), eliteXp: num(r.eliteXp, 1, 50, D.eliteXp), eliteLoot: num(r.eliteLoot, 1, 50, D.eliteLoot),
    moldPairs: int(r.moldPairs, 2, MOLD_MAX_PAIRS, D.moldPairs), moldZap: num(r.moldZap, 0, 50, D.moldZap),
    emberCount: int(r.emberCount, 1, 8, D.emberCount), emberSec: int(r.emberSec, 5, 60, D.emberSec),
    floors,
    boss: { ...mon(b, D.boss), addAt, adds: int(b.adds, 0, 12, D.boss.adds), slamMul: num(b.slamMul, 0, 20, D.boss.slamMul), drops: drops(b.drops, D.boss.drops) },
    chest: { gems: pair(c.gems, 0, 1e7, D.chest.gems), essence: pair(c.essence, 0, 1e7, D.chest.essence), drops: drops(c.drops, D.chest.drops) },
  };
}
function steps(v: unknown, d: EvoStep[]): EvoStep[] {
  const arr = Array.isArray(v) ? v : [];
  return d.map((ds, i) => {
    const o = obj(arr[i]);
    const mats: Record<string, number> = {};
    const m = o.mats === undefined ? ds.mats : obj(o.mats);
    for (const [k, q] of Object.entries(m).slice(0, 8)) { const n = int(q, 0, 1e6, 0); if (/^[a-z0-9_]{1,32}$/.test(k) && n > 0) mats[k] = n; }
    return { kills: int(o.kills, 0, 1e7, ds.kills), gems: int(o.gems, 0, 1e9, ds.gems), mats, pct: num(o.pct, 0, 500, ds.pct) };
  });
}
export function sanitizeEvo(raw: unknown): EvoTune {
  const r = obj(raw), D = EVO_DEFAULT;
  return { enabled: r.enabled === undefined ? D.enabled : !!r.enabled, maxGap: int(r.maxGap, 0, 120, D.maxGap), weapon: steps(r.weapon, D.weapon), armor: steps(r.armor, D.armor) };
}
/** Evrim kademesinin toplam artışı (%): silahta karakterin TOPLAM saldırısına, zırhta TOPLAM savunmasına uygulanır */
export function evoPct(t: { evo?: EvoTune }, slot: string, evo: number): number {
  if (!evo || (slot !== 'weapon' && slot !== 'armor')) return 0;
  const st = (t.evo ?? EVO_DEFAULT)[slot as 'weapon' | 'armor'][Math.min(EVO_TIERS, evo) - 1];
  return st?.pct ?? 0;
}
