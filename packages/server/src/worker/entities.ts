import { computeStats, type CombatStats, type MonsterDef, type SpawnPoint, type ItemInstance, Anim, monsterStats, MONSTER_INDEX, CLASS_IDS, TUNING } from '@col/shared';
import type { CharState } from '../types.ts';
import type { Zone } from './zone.ts';

let nextId = 1;
export const newEntityId = () => { nextId = (nextId + 1) >>> 0; if (nextId === 0) nextId = 1; return nextId; };

export class Player {
  id = newEntityId();
  cell = -1;
  zone!: Zone;
  x: number; y: number;
  dir = 64; // 0..255 açı (aşağı bakış)
  anim = Anim.IDLE;
  animUntil = 0;
  hp: number;
  stats!: CombatStats;
  dirty = 0;
  // hareket
  inputs: { seq: number; dir: number }[] = [];
  lastSeq = 0;
  moveBudget = 0;
  movedThisTick = false;
  // savaş
  cooldowns = [0, 0, 0, 0];
  combatUntil = 0;
  dead = false;
  deadAt = 0;
  stunUntil = 0;
  rootUntil = 0;
  shieldUntil = 0;
  shieldPct = 0;
  lastPotionAt = 0;
  lastAutoPotionAt = 0;
  lastDamageAt = 0;
  lastActiveAt = Date.now();
  // görüş
  known = new Map<number, number>(); // entityId → kind
  resetPending = true;
  lastSnapTick = 0;
  // kayıt
  saveDirty = false;
  lastSaveAt = Date.now();
  selfDirty = 0; // bit: 1 cüzdan/xp, 2 çanta, 4 statlar
  chatTimes: number[] = [];
  flags = 0;

  constructor(public sid: number, public char: CharState) {
    this.x = char.x; this.y = char.y;
    this.hp = char.hp;
    this.recompute(false);
  }
  get clsIndex() { return CLASS_IDS.indexOf(this.char.cls); }
  get name() { return this.char.name; }
  recompute(keepRatio: boolean) {
    const oldMax = this.stats?.maxHp ?? 0;
    this.stats = computeStats({ cls: this.char.cls, level: this.char.level, stats: this.char.stats, equip: this.char.equip });
    if (keepRatio && oldMax > 0) {
      // max can değişimi bedava iyileşme sağlamaz: mevcut can korunur, yalnız üst sınıra kırpılır
      this.hp = Math.min(this.hp, this.stats.maxHp);
    }
    if (this.hp > this.stats.maxHp) this.hp = this.stats.maxHp;
    if (this.hp <= 0 && !this.dead) this.hp = this.stats.maxHp;
  }
  weaponRarityIndex(): number {
    const w = this.char.equip.weapon;
    return w ? ['white', 'blue', 'orange', 'crimson', 'unique', 'infinite', 'purple', 'emerald'].indexOf(w.rarity) : 0;
  }
  markSave() { this.saveDirty = true; }
}

export const enum MState { IDLE, CHASE, RETURN, DEAD }

export interface Telegraph { at: number; shape: 'circle' | 'ring' | 'line'; x: number; y: number; r: number; r2?: number; a?: number; len?: number; dmgMult: number }

export class Monster {
  id = newEntityId();
  cell = -1;
  zone!: Zone;
  tplIndex: number;
  x: number; y: number;
  hp: number; maxHp: number; atk: number; armor: number; xp: number;
  dir = 64;
  anim = Anim.IDLE;
  animUntil = 0;
  state = MState.IDLE;
  target: Player | null = null;
  threat = new Map<Player, number>();
  nextAttackAt = 0;
  lastHitAt = 0;
  rootUntil = 0;
  stunUntil = 0;
  deadAt = 0;
  removeAt = 0;
  dirty = 0;
  wanderAt = 0;
  wx = 0; wy = 0;
  telegraphs: Telegraph[] = [];
  nextPatternAt = 0;
  killed = false; // ölüm makbuzu: bir kez
  constructor(public def: MonsterDef, public sp: SpawnPoint) {
    this.tplIndex = MONSTER_INDEX.get(def.id)!;
    this.x = sp.x; this.y = sp.y;
    const s = monsterStats(def, sp.level, sp.variant);
    // yönetim çarpanları doğuş anında uygulanır (yaşayan canavar değişmez, yeniden doğan yeni değeri alır)
    const hp = Math.max(1, Math.round(s.maxHp * TUNING.monsterHpMul));
    this.maxHp = hp; this.hp = hp; this.atk = Math.max(1, Math.round(s.atk * TUNING.monsterAtkMul)); this.armor = s.def; this.xp = s.xp;
    this.wanderAt = Date.now() + Math.random() * 8000;
  }
  get level() { return this.sp.level; }
  get variant() { return this.sp.variant; }
  get alive() { return this.state !== MState.DEAD; }
}

export type LootPayload = { kind: 'item'; item: ItemInstance } | { kind: 'mat'; key: string; qty: number };
export class Loot {
  id = newEntityId();
  cell = -1;
  zone!: Zone;
  taken = false;
  constructor(public x: number, public y: number, public ownerChar: number, public ownerEntity: number, public createdAt: number, public payload: LootPayload) {}
}
