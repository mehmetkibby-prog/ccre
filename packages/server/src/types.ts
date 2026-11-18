import type { QuestState } from '@col/shared';
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
  /** canavar sıralaması: bu dönemin (k) av sayısı; dönem değişince önceki prev'e geçer (ödül hesabı için) */
  rankKills?: { k: string; n: number; prev?: { k: string; n: number } };
  /** oto atak: bugün kullanılan süre (ms) */
  autoDay?: { day: string; ms: number };
  /** arkadaş listesi (karakter adları) */
  friends?: string[];
  /** binek: sahiplik, binekte mi, Seyis görevi ilerlemesi */
  mount?: { owned?: boolean; riding?: boolean; quest?: { kills: number } };
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
  /** Kadim Kule: kat, ilerleme, bulmaca durumu, en iyi kat ve Azrail zaferi sayısı */
  tower?: TowerProgress;
  /** Sv. 7 becerisi: atış sayacı (zamanlama çubuğunun yeşil bölgesi buna göre değişir) */
  qn?: number;
  /** Kor Kulesi: son giriş anı (bekleme süresi) */
  forgeAt?: number;
  /** görevler: etkin (ilerleme) ve biten (gün) */
  quests?: QuestState;
}
export interface TowerProgress {
  f: number; n: number; done?: boolean; key?: boolean;
  /** mühür sırası (taş sırası) ve sıradaki adım */
  seq?: number[]; si?: number;
  /** bilmece: soru sırası ve taş → seçenek (0 doğru) */
  rd?: number; opts?: number[];
  /** sunak: yanan sunaklar (bit) ve ilk yanma anı */
  alt?: number; altAt?: number;
  best?: number; clears?: number;
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
  | { type: 'admin'; op: 'set' | 'reset' | 'addcp' | 'rename' | 'give'; charId: number; patch?: { level?: number; gems?: number; potions?: number; cp?: number }; amount?: number; name?: string; give?: AdminGive }
  /** Savaş Arenası: etkinlik açıldı/kapandı; giriş isteğinin yanıtı */
  | { type: 'arena'; active: boolean; endsAt: number }
  | { type: 'arena_join_ok'; sid: number; err: string | null }
  /** Lonca: karakterin lonca bilgisi (ad etiketi ve öz vergisi için), kurma bedeli tahsili, savaşlar, savaşa giriş */
  | { type: 'guild_set'; charId: number; g: GuildTag | null }
  | { type: 'guild_charge'; sid: number; req: string; gems: number; minLevel: number }
  | { type: 'gwar'; wars: GuildWarInfo[] }
  | { type: 'gwar_join'; sid: number; side: 0 | 1 }
  | { type: 'shutdown' };
export interface GuildTag { gid: number; name: string; emblem: number; tax: number }
export interface GuildWarInfo { id: number; a: number; b: number; an: string; bn: string; channel: number; startAt: number; endsAt: number }

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
  /** Savaş Arenası: giriş isteği (ana süreç hile/IP denetimi yapar), arenada öldürme, arenadan çıkış */
  | { type: 'arena_join'; sid: number; charId: number; level: number }
  | { type: 'arena_kill'; killer: number; victim: number; kLevel: number; vLevel: number }
  | { type: 'arena_left'; charId: number }
  | { type: 'guild_charged'; sid: number; req: string; ok: boolean; err?: string }
  /** öz vergisi: [lonca, karakter, miktar] */
  | { type: 'guild_tax'; items: [number, number, number][] }
  | { type: 'gwar_kill'; killer: number; victim: number }
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

/** Yönetim: oyuncuya eşya (silah/zırh/takı; nadirlik, artı) ya da malzeme / Nesne Market ürünü verme */
export type AdminGive = { kind: 'item'; tpl: string; rarity: string; plus?: number } | { kind: 'mat'; key: string; qty: number } | { kind: 'gems'; qty: number } | { kind: 'cp'; qty: number } | { kind: 'essence'; qty: number };
