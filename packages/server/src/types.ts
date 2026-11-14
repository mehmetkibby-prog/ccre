import type { ClassId, ItemInstance, Slot, StatAlloc } from '@col/shared';

export type Role = 'player' | 'moderator' | 'gm' | 'admin' | 'owner';

/** Ana thread ↔ kanal worker'ı arasında taşınan kalıcı karakter durumu. Tek yazar: o anki worker. */
export interface CharState {
  id: number;
  accountId: number;
  role: Role;
  name: string;
  cls: ClassId;
  level: number;
  xp: number;
  hp: number;
  map: string;
  x: number; y: number;
  gems: number; essence: number; cp: number; arenaCoin: number;
  stats: StatAlloc;
  skills: number[]; // [temel, beceri2, beceri3, uzmanlık gücü]
  spec: string | null;
  kills: number;
  bag: ItemInstance[];
  equip: Partial<Record<Slot, ItemInstance>>;
  materials: Record<string, number>;
  misc: CharMisc;
  saveVersion: number;
}
export interface CharMisc {
  autoPotion?: boolean;
  statRev?: number;
  dailyKills?: { day: string; n: number };
  receipts?: string[]; // son işlem kimlikleri (idempotency, sınırlı)
  tutorial?: number;
  deadAt?: number; // epoch ms (ölüm durumu kalıcı)
  /** Nesne Market süreli etkileri: anahtar → bitiş (epoch ms) */
  buffs?: Record<string, number>;
  /** Oto iksir deposu (can) */
  autoPool?: number;
  /** Bereketli Olta Yemi: kalan av */
  bait?: number;
  /** Zümrüt tezgâh: sahip ve açık mı */
  stallSkin?: 0 | 1 | 2;
  /** Demircinin Koruma Mührü: sonraki başarısız artı basmada malzemelerin yarısı döner */
  protectSeal?: boolean;
}

// ana → worker
export type ToWorker =
  | { type: 'join'; sid: number; char: CharState }
  | { type: 'leave'; sid: number; reason: string }
  | { type: 'cmd'; sid: number; data: string }
  | { type: 'move'; sid: number; data: ArrayBuffer }
  | { type: 'chat'; ch: string; from: string; text: string; cls: string }
  | { type: 'world'; health: number; online: number }
  | { type: 'market_load'; state: unknown }
  /** Yönetim paneli: yeni oyun ayarları (canavar yoğunluğu değiştiyse harita yeniden kurulur). */
  | { type: 'tuning'; data: unknown }
  /** Yönetim paneli: bu kanaldaki çevrimiçi karakteri düzenle / sıfırla. */
  | { type: 'admin'; op: 'set' | 'reset' | 'addcp' | 'rename'; charId: number; patch?: { level?: number; gems?: number; potions?: number; cp?: number }; amount?: number; name?: string }
  | { type: 'shutdown' };

// worker → ana
/** Kanalın pazarı: bağımsız dükkânlar ve sahibi yokken yapılan satışların bekleyen kazancı. */
export interface MarketStall { id: string; ownerId: number; ownerName: string; zone: string; title: string; x: number; y: number; items: { item: ItemInstance; price: number }[]; openedAt: number; earned: number; skin?: string }
export interface MarketState { v: 1; stalls: MarketStall[]; pending: Record<string, { gems: number; sales: { buyer: string; name: string; price: number; at: number }[] }> }
export type FromWorker =
  | { type: 'out'; batch: [number, string | ArrayBuffer][] }
  | { type: 'save'; char: CharState; urgent: boolean }
  /** Pazar değişti: durum ve etkilenen karakterler tek işlemde yazılmalı. */
  | { type: 'market'; channel: number; state: MarketState; chars: CharState[] }
  | { type: 'left'; sid: number; char: CharState }
  | { type: 'joined'; sid: number; ok: boolean; err?: string }
  | { type: 'chat'; sid: number; ch: string; text: string }
  | { type: 'donate'; sid: number; charId: number; name: string; amount: number }
  | { type: 'stats'; data: WorkerStats };

export interface WorkerStats {
  channel: number;
  players: number;
  perMap: Record<string, number>;
  monsters: number;
  awakeMonsters: number;
  tick: { p50: number; p95: number; p99: number; max: number; overruns: number };
  elu: number;
  bytesOutPerSec: number;
  msgsOutPerSec: number;
  heapMB: number;
  at: number;
}
