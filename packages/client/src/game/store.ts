import { useSyncExternalStore } from 'react';
import type { ItemInstance, Slot, StatAlloc } from '@col/shared';

export interface SelfInfo {
  level: number; xp: number; xpNext: number; gems: number; essence: number; cp: number; kills: number; autoPotion: boolean; daily: number;
  mount?: { owned?: boolean; riding?: boolean; quest?: { kills: number } };
  buffs?: Record<string, number>; autoLeft?: number; autoOn?: boolean; autoPool?: number; bait?: number; stallSkin?: number;
  bag: ItemInstance[]; equip: Partial<Record<Slot, ItemInstance>>; materials: Record<string, number>;
  statAlloc: StatAlloc; statRev: number; statBudget: number; skills: number[]; spec: string | null; skillBudget: number;
  combat: { maxHp: number; atk: number; def: number; crit: number; critDmg: number; speed: number; atkSpeed: number; block: number; lifesteal: number; pvpPower: number; pvpResist: number };
}
export interface PmConv { name: string; msgs: { me: boolean; text: string; at: number }[]; open: boolean; unread: number; z: number }
let pmZ = 1;
/** Fısıltı geldi/gitti: konuşmaya ekle. Yeni gelen konuşma küçük (zarf) başlar; açık penceresi varsa mesaj oraya düşer. */
export function pmPush(name: string, me: boolean, text: string) {
  store.set((s) => {
    const list = [...s.pms];
    let i = list.findIndex((c) => c.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr'));
    if (i < 0) { list.push({ name, msgs: [], open: me, unread: 0, z: ++pmZ }); i = list.length - 1; }
    const c = { ...list[i], msgs: [...list[i].msgs.slice(-80), { me, text, at: Date.now() }] };
    if (!me && !c.open) c.unread++;
    list[i] = c;
    return { pms: list.slice(-8) };
  });
}
/** Fısıltı penceresini aç (yoksa oluştur), öne getir. */
export function pmOpen(name: string) {
  store.set((s) => {
    const list = [...s.pms];
    const i = list.findIndex((c) => c.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr'));
    if (i < 0) list.push({ name, msgs: [], open: true, unread: 0, z: ++pmZ });
    else list[i] = { ...list[i], open: true, unread: 0, z: ++pmZ };
    return { pms: list.slice(-8), playerMenu: null };
  });
}
export function pmSet(name: string, p: Partial<PmConv> | null) {
  store.set((s) => ({ pms: p === null ? s.pms.filter((c) => c.name !== name) : s.pms.map((c) => (c.name === name ? { ...c, ...p, ...(p.open ? { z: ++pmZ, unread: 0 } : {}) } : c)) }));
}
export interface ChatMsg { id: number; ch: string; from: string; text: string; cls?: string; gm?: boolean; at: number; system?: boolean; item?: ItemInstance }
export interface Notice { id: number; text: string; kind: string; at: number }
export interface TargetInfo { id: number; name: string; level: number; hp: number; maxHp: number; kind: number; variant: number; boss?: boolean; tpl?: number }
export type Panel = 'inventory' | 'character' | 'skills' | 'map' | 'settings' | 'teleport' | 'npc' | 'shop' | 'upgrade' | 'help' | 'admin' | 'market' | 'donate' | 'mall' | 'bosses' | 'fishshop' | 'tradeglass' | 'auto' | 'friends' | 'mount' | 'essmarket' | 'rankings' | 'tower' | 'craft' | null;

export interface TowerView {
  f: number; puzzle: 'kill' | 'seq' | 'key' | 'riddle' | 'altar' | 'boss'; need: number; have: number; done: boolean; best: number; clears: number;
  seq?: number[]; si: number; riddle?: { q: string; opts: string[] }; alt: number; altLeft: number; key: boolean; kills: number; at: number;
}
export interface StallInfo { id: string; ownerId: number; name: string; title: string; x: number; y: number; n: number; skin?: string }
export interface BossInfo { id: string; name: string; map: string; x: number; y: number; alive: boolean; hp: number; nextAt: number | null; level: number }
export interface FishState { phase: 'wait' | 'bite' | 'reel'; token: string; biteAt: number; diff: number; motion: string }
export interface StallView { stall: string; name?: string; title?: string; items?: { item: ItemInstance; price: number }[]; own?: boolean; closed?: boolean; far?: boolean; x?: number; y?: number }
/** Oyuncunun kendi dükkânı (sahibinden bağımsız; oyundan çıksa da açık kalır). */
export interface MyStall { id: string; title: string; zone: string; x: number; y: number; items: { item: ItemInstance; price: number }[]; earned: number; openedAt: number }
export interface InviteInfo { kind: 'party' | 'trade' | 'duel' | 'friend'; from: number; name: string; cls: string; level: number; at: number }
export interface PartyMember { id: number; eid: number; name: string; cls: string; level: number; hp: number; maxHp: number; map: string; dead: boolean }
export interface TradeSideView { items: ItemInstance[]; gems: number; locked: boolean; ok: boolean }
export interface TradeView { with: string; me: TradeSideView; them: TradeSideView }
export interface UiState {
  connected: boolean; status: string;
  /** oyuncuya sağ tık (telefonda uzun basma) menüsü */
  playerMenu: { id: number; name: string; x: number; y: number } | null;
  invites: InviteInfo[];
  party: { members: PartyMember[]; leader: number };
  trade: TradeView | null;
  friends: { name: string; here: boolean }[];
  /** fısıltı: sohbet girişine hedef adı */
  whisperTo: string | null;
  /** Fısıltı pencereleri (Metin2 tarzı): konuşma başına pencere; küçültülünce zarf simgesi */
  pms: PmConv[];
  /** Savaş Arenası: etkinlik durumu ve canlı sıralama (bütün kanallar ortak) */
  /** Kadim Kule: kat ve görev durumu (sunucudan); at = alındığı an */
  tower: TowerView | null; towerHold: { i: number; at: number } | null; towerReplayAt: number; /** mühür sırası gösteriminin başladığı an (performance.now) */ towerSeqAt: number;
  arena: { active: boolean; endsAt: number; board: { id?: number; name: string; cls: string; kills: number; deaths: number }[]; at: number } | null;
  map: string; channel: number; entityId: number;
  char: { id: number; name: string; cls: string; role: string } | null;
  self: SelfInfo | null;
  hp: number; maxHp: number;
  dead: { killer: string | null; lost: number; at: number; respawnIn: number; town?: string } | null;
  target: TargetInfo | null;
  worldHealth: number; online: number;
  chat: ChatMsg[]; chatTab: string; chatOpen: boolean; unread: number;
  notices: Notice[];
  panel: Panel;
  npc: { id: string; name: string; title: string; actions: string[] } | null;
  shop: string | null;
  stalls: StallInfo[]; stallView: StallView | null; myStall: MyStall | null; stallLog: string[];
  cooldowns: Record<number, number>; // beceri → bitiş (performance.now)
  ping: number; fps: number;
  confirmTravel: { map: string; text: string } | null;
  modal: { title: string; lines: string[] } | null;
  upgradeResult: { ok: boolean; before: number; after: number; chance: number } | null;
  transformResult: { ok: boolean; item: string; at: number } | null;
  /** oto atak durumunun sunucudan son geldiği an (kalan süre bundan geri sayılır) */
  autoSync: number;
  lootFeed: { id: number; text: string; rarity: string; at: number }[];
  bosses: BossInfo[]; bossBanner: { id: string; name: string; map: string; x: number; y: number; ev: 'spawn' | 'dead'; killer?: string; at: number } | null; bossTrack: string | null;
  /** sunucu saati farkı (ms): geri sayımlar için */
  clockSkew: number;
  fishing: FishState | null; fishResult: { ok: boolean; name?: string; qty?: number; at: number } | null;
  marketResults: { q: string; list: { stall: string; owner: string; title: string; item: ItemInstance; price: number; x: number; y: number }[] } | null;
  mallTarget: string | null;
  settings: { music: number; sfx: number; quality: 'low' | 'medium' | 'high'; zoom: number; showNames: boolean; showDamage: boolean; fpsCap: number; v?: number; /** Isınma modu: telefon ısınmasın diye çizim yükü azaltılır (oyun kuralları değişmez) */ cool?: boolean };
}

const SETTINGS_KEY = 'col_settings';
function loadSettings(): UiState['settings'] {
  // telefon/tablet: orta kalite (pahalı ortam gölgelemesi kapalı, düşük çözünürlük)
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const def = { music: 0.5, sfx: 0.7, quality: (touch ? 'medium' : 'high') as UiState['settings']['quality'], zoom: 1, showNames: true, showDamage: true, fpsCap: 60, v: 2 };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    if (saved.v !== 2) delete saved.quality; // eski sürümün "yüksek" varsayılanını taşıma
    return { ...def, ...saved, v: 2 };
  } catch { return def; }
}

let state: UiState = {
  connected: false, status: '', playerMenu: null, invites: [], party: { members: [], leader: 0 }, trade: null, friends: [], whisperTo: null, pms: [], arena: null, tower: null, towerHold: null, towerReplayAt: 0, towerSeqAt: 0, map: 'bazaar', channel: 1, entityId: 0, char: null, self: null, hp: 1, maxHp: 1, dead: null, target: null,
  worldHealth: 100, online: 0, chat: [], chatTab: 'all', chatOpen: true, unread: 0, notices: [], panel: null, npc: null, shop: null, stalls: [], stallView: null, myStall: null, stallLog: [], cooldowns: {},
  ping: 0, fps: 0, confirmTravel: null, modal: null, upgradeResult: null, transformResult: null, autoSync: 0, lootFeed: [], settings: loadSettings(),
  bosses: [], bossBanner: null, bossTrack: null, clockSkew: 0, fishing: null, fishResult: null, marketResults: null, mallTarget: null,
};
const listeners = new Set<() => void>();
export const store = {
  get: () => state,
  set(p: Partial<UiState> | ((s: UiState) => Partial<UiState>)) {
    const patch = typeof p === 'function' ? p(state) : p;
    state = { ...state, ...patch };
    if (patch.settings) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch { /* yoksay */ } }
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
};
export function useStore<T>(sel: (s: UiState) => T): T {
  return useSyncExternalStore(store.subscribe, () => sel(state));
}
let nid = 1;
export function notify(text: string, kind = 'info') {
  const n = { id: nid++, text, kind, at: Date.now() };
  store.set((s) => ({ notices: [...s.notices.slice(-4), n] }));
  setTimeout(() => store.set((s) => ({ notices: s.notices.filter((x) => x.id !== n.id) })), 3800);
}
export function pushChat(m: Omit<ChatMsg, 'id' | 'at'>) {
  store.set((s) => ({ chat: [...s.chat.slice(-120), { ...m, id: nid++, at: Date.now() }], unread: s.chatOpen ? 0 : s.unread + (m.system ? 0 : 1) }));
}
export function pushLoot(text: string, rarity: string) {
  const e = { id: nid++, text, rarity, at: Date.now() };
  store.set((s) => ({ lootFeed: [...s.lootFeed.slice(-5), e] }));
  setTimeout(() => store.set((s) => ({ lootFeed: s.lootFeed.filter((x) => x.id !== e.id) })), 4500);
}
export const reqId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
