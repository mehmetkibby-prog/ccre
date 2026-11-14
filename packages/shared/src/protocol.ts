/**
 * Ağ protokolü.
 * Sunucu→istemci: sık gelen dünya durumu ikili SNAPSHOT; seyrek olaylar JSON metin çerçevesi.
 * İstemci→sunucu: hareket ikili (3 bayt + op), diğer komutlar JSON.
 */
import { BinReader, BinWriter } from './binary.ts';

export const enum Op { SNAPSHOT = 1 }
export const enum COp { MOVE = 1 }

export const enum Kind { PLAYER = 1, MONSTER = 2, LOOT = 3 }
export const enum Anim { IDLE = 0, WALK = 1, ATTACK = 2, HURT = 3, DEAD = 4, CAST = 5 }
export const enum Upd { POS = 1, HP = 2, ANIM = 4, MAXHP = 8, FLAGS = 16, LEVEL = 32 }
export const enum EFlag { DEAD = 1, MOUNTED = 2, PVP = 4, STUNNED = 8, ROOTED = 16, SHIELD = 32, GM = 64 }
export const enum Ev { DAMAGE = 1, CAST = 2, DEATH = 3, FX = 4, LEVELUP = 5, HEAL = 6 }
export const enum DmgFlag { CRIT = 1, BLOCK = 2, MISS = 4 }
export const enum Fx { TELEGRAPH_CIRCLE = 1, TELEGRAPH_RING = 2, TELEGRAPH_LINE = 3, TELEPORT = 4, LEVELUP = 5, AOE_BLAST = 6, HEAL_WAVE = 7, SHIELD = 8, PICKUP = 9 }

export interface PlayerSpawn { kind: Kind.PLAYER; id: number; cls: number; name: string; level: number; x: number; y: number; dir: number; anim: number; hp: number; maxHp: number; flags: number; weapon: number; wplus: number; guild: string }
export interface MonsterSpawn { kind: Kind.MONSTER; id: number; tpl: number; variant: number; level: number; x: number; y: number; dir: number; anim: number; hp: number; maxHp: number; flags: number }
export interface LootSpawn { kind: Kind.LOOT; id: number; icon: string; rarity: number; x: number; y: number; owner: number; ttl: number; label: string }
export type EntitySpawn = PlayerSpawn | MonsterSpawn | LootSpawn;

export interface EntityUpdate { id: number; mask: number; x?: number; y?: number; hp?: number; dir?: number; anim?: number; maxHp?: number; flags?: number; level?: number }
export type GameEvent =
  | { e: Ev.DAMAGE; src: number; tgt: number; amount: number; flags: number }
  | { e: Ev.HEAL; tgt: number; amount: number }
  | { e: Ev.CAST; src: number; skill: number; tgt: number; x: number; y: number }
  | { e: Ev.DEATH; id: number; killer: number }
  | { e: Ev.FX; fx: number; x: number; y: number; r: number; ms: number; a: number }
  | { e: Ev.LEVELUP; id: number; level: number };

export interface Snapshot {
  t: number; ack: number; sx: number; sy: number; shp: number; smaxHp: number; sflags: number;
  spawns: EntitySpawn[]; updates: EntityUpdate[]; removes: number[]; events: GameEvent[];
}

export function writeSpawn(w: BinWriter, s: EntitySpawn) {
  w.wU32(s.id); w.wU8(s.kind);
  if (s.kind === Kind.PLAYER) {
    w.wU8(s.cls); w.wStr(s.name); w.wU16(s.level); w.wU16(s.x); w.wU16(s.y); w.wU8(s.dir); w.wU8(s.anim);
    w.wU32(s.hp); w.wU32(s.maxHp); w.wU8(s.flags); w.wU8(s.weapon); w.wU8(s.wplus); w.wStr(s.guild);
  } else if (s.kind === Kind.MONSTER) {
    w.wU16(s.tpl); w.wU8(s.variant); w.wU16(s.level); w.wU16(s.x); w.wU16(s.y); w.wU8(s.dir); w.wU8(s.anim);
    w.wU32(s.hp); w.wU32(s.maxHp); w.wU8(s.flags);
  } else {
    w.wStr(s.icon); w.wU8(s.rarity); w.wU16(s.x); w.wU16(s.y); w.wU32(s.owner); w.wU16(Math.min(65535, Math.round(s.ttl / 100))); w.wStr(s.label);
  }
}
export function writeUpdate(w: BinWriter, u: EntityUpdate) {
  w.wU32(u.id); w.wU8(u.mask);
  if (u.mask & Upd.POS) { w.wU16(u.x!); w.wU16(u.y!); }
  if (u.mask & Upd.HP) w.wU32(u.hp!);
  if (u.mask & Upd.ANIM) { w.wU8(u.dir!); w.wU8(u.anim!); }
  if (u.mask & Upd.MAXHP) w.wU32(u.maxHp!);
  if (u.mask & Upd.FLAGS) w.wU8(u.flags!);
  if (u.mask & Upd.LEVEL) w.wU16(u.level!);
}
export function writeEvent(w: BinWriter, ev: GameEvent) {
  w.wU8(ev.e);
  switch (ev.e) {
    case Ev.DAMAGE: w.wU32(ev.src); w.wU32(ev.tgt); w.wU32(ev.amount); w.wU8(ev.flags); break;
    case Ev.HEAL: w.wU32(ev.tgt); w.wU32(ev.amount); break;
    case Ev.CAST: w.wU32(ev.src); w.wU8(ev.skill); w.wU32(ev.tgt); w.wU16(ev.x); w.wU16(ev.y); break;
    case Ev.DEATH: w.wU32(ev.id); w.wU32(ev.killer); break;
    case Ev.FX: w.wU8(ev.fx); w.wU16(ev.x); w.wU16(ev.y); w.wU16(ev.r); w.wU16(ev.ms); w.wU16(ev.a); break;
    case Ev.LEVELUP: w.wU32(ev.id); w.wU16(ev.level); break;
  }
}

export function readSnapshot(buf: ArrayBuffer): Snapshot {
  const r = new BinReader(buf);
  r.u8_();
  const snap: Snapshot = { t: r.u32(), ack: r.u16(), sx: r.f32(), sy: r.f32(), shp: r.u32(), smaxHp: r.u32(), sflags: r.u8_(), spawns: [], updates: [], removes: [], events: [] };
  let n = r.u16();
  for (let i = 0; i < n; i++) {
    const id = r.u32(); const kind = r.u8_();
    if (kind === Kind.PLAYER) {
      snap.spawns.push({ kind, id, cls: r.u8_(), name: r.str(), level: r.u16(), x: r.u16(), y: r.u16(), dir: r.u8_(), anim: r.u8_(), hp: r.u32(), maxHp: r.u32(), flags: r.u8_(), weapon: r.u8_(), wplus: r.u8_(), guild: r.str() });
    } else if (kind === Kind.MONSTER) {
      snap.spawns.push({ kind, id, tpl: r.u16(), variant: r.u8_(), level: r.u16(), x: r.u16(), y: r.u16(), dir: r.u8_(), anim: r.u8_(), hp: r.u32(), maxHp: r.u32(), flags: r.u8_() });
    } else {
      snap.spawns.push({ kind: Kind.LOOT, id, icon: r.str(), rarity: r.u8_(), x: r.u16(), y: r.u16(), owner: r.u32(), ttl: r.u16() * 100, label: r.str() });
    }
  }
  n = r.u16();
  for (let i = 0; i < n; i++) {
    const u: EntityUpdate = { id: r.u32(), mask: r.u8_() };
    if (u.mask & Upd.POS) { u.x = r.u16(); u.y = r.u16(); }
    if (u.mask & Upd.HP) u.hp = r.u32();
    if (u.mask & Upd.ANIM) { u.dir = r.u8_(); u.anim = r.u8_(); }
    if (u.mask & Upd.MAXHP) u.maxHp = r.u32();
    if (u.mask & Upd.FLAGS) u.flags = r.u8_();
    if (u.mask & Upd.LEVEL) u.level = r.u16();
    snap.updates.push(u);
  }
  n = r.u16();
  for (let i = 0; i < n; i++) snap.removes.push(r.u32());
  n = r.u16();
  for (let i = 0; i < n; i++) {
    const e = r.u8_();
    switch (e) {
      case Ev.DAMAGE: snap.events.push({ e, src: r.u32(), tgt: r.u32(), amount: r.u32(), flags: r.u8_() }); break;
      case Ev.HEAL: snap.events.push({ e, tgt: r.u32(), amount: r.u32() }); break;
      case Ev.CAST: snap.events.push({ e, src: r.u32(), skill: r.u8_(), tgt: r.u32(), x: r.u16(), y: r.u16() }); break;
      case Ev.DEATH: snap.events.push({ e, id: r.u32(), killer: r.u32() }); break;
      case Ev.FX: snap.events.push({ e, fx: r.u8_(), x: r.u16(), y: r.u16(), r: r.u16(), ms: r.u16(), a: r.u16() }); break;
      case Ev.LEVELUP: snap.events.push({ e, id: r.u32(), level: r.u16() }); break;
      default: return snap;
    }
  }
  return snap;
}

export function encodeMove(seq: number, dir: number): ArrayBuffer {
  const b = new ArrayBuffer(4);
  const v = new DataView(b);
  v.setUint8(0, COp.MOVE); v.setUint16(1, seq & 0xffff, true); v.setUint8(3, dir);
  return b;
}

/** İstemci→sunucu JSON komutları */
export type ClientCmd =
  | { t: 'attack'; id: number }
  | { t: 'skill'; s: number; id?: number; x?: number; y?: number }
  | { t: 'pickup'; id: number }
  | { t: 'respawn'; where: 'here' | 'town' }
  | { t: 'chat'; ch: 'world' | 'trade' | 'local' | 'guild' | 'pm'; text: string; to?: string; req?: string }
  | { t: 'equip'; item: string }
  | { t: 'unequip'; slot: string }
  | { t: 'potion' }
  | { t: 'autopotion'; on: boolean }
  | { t: 'travel'; map: string; req: string; confirm?: boolean }
  | { t: 'stats'; str: number; res: number; vit: number; rev: number }
  | { t: 'skillup'; s: number; req: string }
  | { t: 'spec'; spec: string; req: string }
  | { t: 'lock'; item: string; on: boolean }
  | { t: 'sell'; items: string[]; req: string }
  | { t: 'buy'; shop: string; product: string; qty: number; price: number; req: string }
  | { t: 'donate'; amount: number; req: string }
  | { t: 'upgrade'; item: string; expectPlus: number; mastery: boolean; req: string }
  | { t: 'npc'; id: string }
  | { t: 'use'; key: string; req: string; item?: string }
  | { t: 'mall_buy'; id: string; qty: number; req: string }
  | { t: 'stall_skin'; on: boolean }
  | { t: 'market_search'; q: string }
  | { t: 'chat_item'; item: string; req: string }
  | { t: 'fish_cast' }
  | { t: 'fish_end'; token: string; ok: boolean }
  | { t: 'fish_rod'; req: string }
  | { t: 'fish_sell'; req: string }
  | { t: 'bosses' }
  | { t: 'stall_open'; title: string; items: { id: string; price: number }[]; req: string }
  | { t: 'stall_close' }
  | { t: 'gm_set'; name: string; level?: number; gems?: number; essence?: number; potions?: number }
  | { t: 'gm_reset'; name: string }
  | { t: 'stall_view'; stall: string }
  | { t: 'stall_buy'; stall: string; item: string; price: number; req: string }
  | { t: 'ping'; c: number }
  | { t: 'sync' };
