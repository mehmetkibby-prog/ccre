import { CLASSES, type ClassId } from './content/classes.ts';
import { ITEM_TPL, itemPower, type ItemInstance, type Slot, type EnchantType } from './content/items.ts';

export const LEVEL_CAP_BASE = 50;
export const LEVEL_CAP_EXPANSION = 65;
export const STAT_MAX = 64;
export const STAT_BONUS_AT_MAX = { str: 0.10, res: 0.10, vit: 0.12 }; // 64 puanda toplam katkı

/** TP eğrisi (yönetimden ayarlanabilir; varsayılan). */
export function xpToNext(level: number): number {
  return Math.round(55 * Math.pow(level, 1.9) + 45 * level + 40);
}
export function statBudget(level: number): number { return (level - 1) * 3; }
export function skillUpgradeBudget(level: number): number { return Math.min(30, Math.max(3, level)); }

export interface StatAlloc { str: number; res: number; vit: number }
export interface CombatStats {
  maxHp: number; atk: number; def: number; speed: number; range: number;
  crit: number; critDmg: number; atkSpeed: number; skillSpeed: number; lifesteal: number; block: number;
  pvpPower: number; pvpResist: number; pvePower: number;
  enchants: Partial<Record<EnchantType, number>>;
}

export interface CharCore {
  cls: ClassId; level: number; stats: StatAlloc;
  equip: Partial<Record<Slot, ItemInstance>>;
  buffs?: { atkFlat?: number; hpFlat?: number; dmgReducePct?: number };
}

export function computeStats(c: CharCore): CombatStats {
  const def = CLASSES[c.cls];
  let maxHp = def.baseHp + def.hpPerLevel * (c.level - 1);
  let atk = def.baseAtk + def.atkPerLevel * (c.level - 1);
  let dfn = def.baseDef + def.defPerLevel * (c.level - 1);
  const s: CombatStats = {
    maxHp: 0, atk: 0, def: 0, speed: def.speed, range: def.range,
    crit: 5, critDmg: 50, atkSpeed: 0, skillSpeed: 0, lifesteal: 0, block: 0, pvpPower: 0, pvpResist: 0, pvePower: 0, enchants: {},
  };
  let hpFlat = 0, atkFlat = 0;
  for (const it of Object.values(c.equip)) {
    if (!it) continue;
    const t = ITEM_TPL.get(it.tpl);
    if (!t) continue;
    const p = itemPower(it);
    if (t.slot === 'weapon') atkFlat += p;
    else if (t.slot === 'armor' || t.slot === 'helmet' || t.slot === 'boots') dfn += p;
    else { dfn += Math.round(p * 0.4); hpFlat += p * 6; }
    for (const e of it.ench) s.enchants[e.t] = (s.enchants[e.t] ?? 0) + e.v;
    if (it.plus >= 5) {
      if (t.slot === 'weapon') s.pvpPower += 5;
      if (t.slot === 'boots') s.pvpPower += 3;
      if (t.slot === 'armor') s.pvpResist += 5;
      if (t.slot === 'necklace') s.pvpResist += 3;
      if (t.slot === 'helmet') s.critDmg += 10;
    }
  }
  const e = s.enchants;
  hpFlat += e.hp ?? 0;
  s.crit += e.crit ?? 0;
  s.atkSpeed += e.atk_speed ?? 0;
  s.skillSpeed += e.skill_speed ?? 0;
  s.lifesteal += e.lifesteal ?? 0;
  s.block += e.block ?? 0;
  s.pvpPower += e.pvp_power ?? 0;
  s.pvpResist += e.pvp_resist ?? 0;
  if (c.buffs?.atkFlat) atkFlat += c.buffs.atkFlat;
  if (c.buffs?.hpFlat) hpFlat += c.buffs.hpFlat;
  const st = c.stats;
  atk = (atk + atkFlat) * (1 + (STAT_BONUS_AT_MAX.str * st.str) / STAT_MAX);
  dfn = dfn * (1 + (STAT_BONUS_AT_MAX.res * st.res) / STAT_MAX);
  maxHp = (maxHp + hpFlat) * (1 + (STAT_BONUS_AT_MAX.vit * st.vit) / STAT_MAX);
  s.maxHp = Math.round(maxHp);
  s.atk = Math.round(atk);
  s.def = Math.round(dfn);
  return s;
}

/** Saldırı aralığı: hız bonusu sınırlı oranla kısaltır (en fazla %40). */
export function attackCooldown(baseMs: number, speedPct: number): number {
  const f = Math.min(0.4, speedPct / 100);
  return Math.round(baseMs * (1 - f));
}

export function skillDamageMult(skillLevel: number): number { return 1 + 0.04 * Math.max(0, skillLevel - 1); }

/** Hasar formülü: rastgelelik çağıranın RNG'sinden gelir (sunucuda). */
export function rollDamage(atk: number, mult: number, targetDef: number, critPct: number, critDmgPct: number, rnd: () => number) {
  const variance = 0.9 + rnd() * 0.2;
  let dmg = atk * mult * variance - targetDef * 0.55;
  dmg = Math.max(1, dmg);
  const crit = rnd() * 100 < critPct;
  if (crit) dmg *= 1 + critDmgPct / 100;
  return { dmg: Math.round(dmg), crit };
}

// ───────── efsunların savaş etkisi ─────────
export type AttackKind = 'sword' | 'arrow' | 'magic';
/** Oyuncu saldırısının türü sınıfa göre: Muhafız kılıç, Avcı ok, Arkanist büyü. */
export function classAttackKind(cls: ClassId): AttackKind { return cls === 'hunter' ? 'arrow' : cls === 'arcanist' ? 'magic' : 'sword'; }
/** Canavar saldırısının türü: uzaktan saldıranlar (Öz Yutan, Tipi Kâhini, boss) büyü, diğerleri yakın dövüş. */
export function monsterAttackKind(range: number): AttackKind { return range >= 200 ? 'magic' : 'sword'; }
/**
 * Saldıranın efsunlarından hasar çarpanı. targetTheme: canavarın bulunduğu haritanın teması (oyuncu hedefte null).
 * Ateş ve Buz her hedefe işler; Donmuş Çam canavarları ateşe 1,5 kat zayıf, buza yarı dayanıklıdır.
 */
export function enchantAttackMult(e: CombatStats['enchants'], targetTheme: string | null): number {
  const frozen = targetTheme === 'frozen';
  let pct = (e.fire_dmg ?? 0) * (frozen ? 1.5 : 1) + (e.ice_dmg ?? 0) * (frozen ? 0.5 : 1);
  if (frozen) pct += e.frost_power ?? 0;
  if (targetTheme === 'forest') pct += e.forest_power ?? 0;
  return 1 + pct / 100;
}
/** Savunanın efsunlarından gelen hasar çarpanı (tür savunması en çok %60). */
export function enchantDefenseMult(e: CombatStats['enchants'], kind: AttackKind): number {
  const pct = kind === 'sword' ? e.sword_def ?? 0 : kind === 'arrow' ? e.arrow_def ?? 0 : e.magic_def ?? 0;
  return 1 - Math.min(60, pct) / 100;
}
