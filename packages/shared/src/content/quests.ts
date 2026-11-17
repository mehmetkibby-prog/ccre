/**
 * Görev sistemi: görevler yönetim panelinden tasarlanır (TUNING.quests). Bir görevi bir NPC verir, (aynı ya da
 * başka) bir NPC teslim alır. Hedefler: canavar öldür, eşya getir (teslimde alınır), NPC ile konuş, seviyeye ulaş,
 * Kadim Kule'de kata çık. Ödül: mücevher, öz, TP, ÇP ve eşya/malzeme/market ürünü.
 */
export type QuestObjKind = 'kill' | 'collect' | 'talk' | 'level' | 'tower';
export interface QuestObj {
  kind: QuestObjKind;
  /** kill: canavar kimliği ya da 'any'; collect: malzeme/market ürünü anahtarı; talk: NPC kimliği */
  key: string;
  /** kill: harita ('any' = her yerde) */
  map?: string;
  /** kill/collect: adet; level: seviye; tower: kat */
  n: number;
}
export interface QuestReward { gems: number; essence: number; xp: number; cp: number; items: { kind: 'item' | 'mat' | 'mall'; key: string; rarity?: string; qty: number }[] }
export interface QuestDef {
  id: string; name: string; desc: string;
  giver: string; turnin: string;
  minLevel: number; prereq?: string;
  repeat: 'none' | 'daily';
  objs: QuestObj[];
  reward: QuestReward;
  off?: boolean;
}
/** Oyuncunun görev durumu (CharMisc.quests) */
export interface QuestState {
  /** etkin görevler: hedef ilerlemeleri (kill/talk için sayaç) ve alınma günü */
  a: Record<string, { p: number[]; day?: string }>;
  /** biten görevler: bitirildiği gün (TR) */
  d: Record<string, string>;
}
export const QUEST_MAX_ACTIVE = 10;
export const QUEST_OBJ_NAMES: Record<QuestObjKind, string> = { kill: 'Canavar öldür', collect: 'Eşya getir', talk: 'NPC ile konuş', level: 'Seviyeye ulaş', tower: 'Kadim Kule katına çık' };

const R = (gems: number, essence: number, xp: number, items: QuestReward['items'] = [], cp = 0): QuestReward => ({ gems, essence, xp, cp, items });
export const QUESTS_DEFAULT: QuestDef[] = [
  { id: 'q_fox', name: 'Korudaki Tilkiler', desc: 'Tilkiler pazara inip tezgâhları talan ediyor. Güneydeki Tilki Korusu\'nda 10 tilkiyi kov.', giver: 'tuccar', turnin: 'tuccar', minLevel: 1, repeat: 'none', objs: [{ kind: 'kill', key: 'wild_fox', map: 'bazaar', n: 10 }], reward: R(60, 10, 300, [{ kind: 'mat', key: 'red_potion', qty: 5 }]) },
  { id: 'q_goblin', name: 'Hırsız Goblinler', desc: 'Goblinler Haso\'nun dallarını çalmış. 8 goblin yen, 3 Güçlü Dal topla ve Demirci Haso\'ya götür.', giver: 'tuccar', turnin: 'haso', minLevel: 2, prereq: 'q_fox', repeat: 'none', objs: [{ kind: 'kill', key: 'sneaky_goblin', map: 'bazaar', n: 8 }, { kind: 'collect', key: 'strong_branch', n: 3 }], reward: R(150, 20, 900, [{ kind: 'mat', key: 'kor_seal', qty: 2 }]) },
  { id: 'q_letter', name: 'Rauf\'un Mektubu', desc: 'Depocu Rauf\'un mektubunu Şelale Gölü\'ndeki Balıkçı Hasan\'a ulaştır.', giver: 'rauf', turnin: 'hasan', minLevel: 3, repeat: 'none', objs: [{ kind: 'talk', key: 'hasan', n: 1 }], reward: R(100, 0, 500) },
  { id: 'q_wolves', name: 'Ormanın Gölgeleri', desc: 'Kuzey Ormanı\'nda Gölge Kurtları yolcuları tehdit ediyor. 20 tanesini avla, sonra Işınlayıcı Nur\'a haber ver.', giver: 'nur', turnin: 'nur', minLevel: 10, repeat: 'none', objs: [{ kind: 'kill', key: 'shadow_wolf', map: 'forest', n: 20 }], reward: R(250, 60, 3000, [{ kind: 'mat', key: 'strong_branch', qty: 3 }]) },
  { id: 'q_level20', name: 'Ustalık Yolu', desc: '20. seviyeye ulaş ve Seyis Arda\'ya kendini göster.', giver: 'arda', turnin: 'arda', minLevel: 10, repeat: 'none', objs: [{ kind: 'level', key: '', n: 20 }], reward: R(500, 100, 0, [{ kind: 'mat', key: 'mastery_seal', qty: 1 }]) },
  { id: 'q_tower_daily', name: 'Kulenin Çağrısı (günlük)', desc: 'Kadim Kule\'de 5. kata çık ve Zindan Bekçisi\'ne dön. Her gün yeniden alınabilir.', giver: 'bekci', turnin: 'bekci', minLevel: 25, repeat: 'daily', objs: [{ kind: 'tower', key: '', n: 5 }], reward: R(400, 150, 0, [{ kind: 'mat', key: 'tower_seal', qty: 1 }]) },
];

export function sanitizeQuests(raw: unknown): QuestDef[] {
  if (!Array.isArray(raw)) return structuredClone(QUESTS_DEFAULT);
  const key = (v: unknown) => typeof v === 'string' && /^[a-z0-9_]{1,32}$/.test(v) ? v : null;
  const num = (v: unknown, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const out: QuestDef[] = []; const ids = new Set<string>();
  for (const x of raw.slice(0, 120)) {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    const id = key(o.id); if (!id || ids.has(id)) continue;
    const giver = key(o.giver), turnin = key(o.turnin) ?? giver;
    if (!giver || !turnin) continue;
    const objs: QuestObj[] = [];
    for (const r2 of Array.isArray(o.objs) ? o.objs.slice(0, 6) : []) {
      const b = (r2 && typeof r2 === 'object' ? r2 : {}) as Record<string, unknown>;
      const kind = ['kill', 'collect', 'talk', 'level', 'tower'].includes(b.kind as string) ? b.kind as QuestObjKind : null;
      if (!kind) continue;
      const k = kind === 'level' || kind === 'tower' ? '' : key(b.key);
      if (k === null) continue;
      objs.push({ kind, key: k, n: num(b.n, 1, kind === 'level' ? 120 : kind === 'tower' ? 10 : 100000, 1), ...(kind === 'kill' ? { map: key(b.map) ?? 'any' } : {}) });
    }
    if (!objs.length) continue;
    const rw = (o.reward && typeof o.reward === 'object' ? o.reward : {}) as Record<string, unknown>;
    const items: QuestReward['items'] = [];
    for (const r3 of Array.isArray(rw.items) ? rw.items.slice(0, 8) : []) {
      const b = (r3 && typeof r3 === 'object' ? r3 : {}) as Record<string, unknown>;
      const kind = b.kind === 'item' || b.kind === 'mat' || b.kind === 'mall' ? b.kind : null; const k = key(b.key);
      if (kind && k) items.push({ kind, key: k, qty: num(b.qty, 1, 9999, 1), ...(kind === 'item' && typeof b.rarity === 'string' && /^[a-z]{1,16}$/.test(b.rarity) ? { rarity: b.rarity } : {}) });
    }
    ids.add(id);
    out.push({
      id, name: str(o.name, 50) || id, desc: str(o.desc, 400), giver, turnin, minLevel: num(o.minLevel, 1, 120, 1),
      ...(key(o.prereq) ? { prereq: key(o.prereq)! } : {}), repeat: o.repeat === 'daily' ? 'daily' : 'none', objs,
      reward: { gems: num(rw.gems, 0, 1e9, 0), essence: num(rw.essence, 0, 1e9, 0), xp: num(rw.xp, 0, 1e10, 0), cp: num(rw.cp, 0, 1e6, 0), items },
      ...(o.off === true ? { off: true } : {}),
    });
  }
  return out;
}
