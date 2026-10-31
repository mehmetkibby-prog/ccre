import { useSyncExternalStore } from 'react';
import type { ItemInstance, Slot, StatAlloc } from '@col/shared';

export interface SelfInfo {
  level: number; xp: number; xpNext: number; gems: number; essence: number; cp: number; kills: number; autoPotion: boolean; daily: number;
  bag: ItemInstance[]; equip: Partial<Record<Slot, ItemInstance>>; materials: Record<string, number>;
  statAlloc: StatAlloc; statRev: number; statBudget: number; skills: number[]; spec: string | null; skillBudget: number;
  combat: { maxHp: number; atk: number; def: number; crit: number; critDmg: number; speed: number; atkSpeed: number; block: number; lifesteal: number; pvpPower: number; pvpResist: number };
}
export interface ChatMsg { id: number; ch: string; from: string; text: string; cls?: string; gm?: boolean; at: number; system?: boolean }
export interface Notice { id: number; text: string; kind: string; at: number }
export interface TargetInfo { id: number; name: string; level: number; hp: number; maxHp: number; kind: number; variant: number; boss?: boolean }
export type Panel = 'inventory' | 'character' | 'skills' | 'map' | 'settings' | 'teleport' | 'npc' | 'shop' | 'upgrade' | 'help' | null;

export interface UiState {
  connected: boolean; status: string;
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
  cooldowns: Record<number, number>; // beceri → bitiş (performance.now)
  ping: number; fps: number;
  confirmTravel: { map: string; text: string } | null;
  modal: { title: string; lines: string[] } | null;
  upgradeResult: { ok: boolean; before: number; after: number; chance: number } | null;
  lootFeed: { id: number; text: string; rarity: string; at: number }[];
  settings: { music: number; sfx: number; quality: 'low' | 'medium' | 'high'; zoom: number; showNames: boolean; showDamage: boolean; fpsCap: number };
}

const SETTINGS_KEY = 'col_settings';
function loadSettings(): UiState['settings'] {
  const def = { music: 0.5, sfx: 0.7, quality: 'high' as const, zoom: 1, showNames: true, showDamage: true, fpsCap: 60 };
  try { return { ...def, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }; } catch { return def; }
}

let state: UiState = {
  connected: false, status: '', map: 'bazaar', channel: 1, entityId: 0, char: null, self: null, hp: 1, maxHp: 1, dead: null, target: null,
  worldHealth: 100, online: 0, chat: [], chatTab: 'all', chatOpen: false, unread: 0, notices: [], panel: null, npc: null, shop: null, cooldowns: {},
  ping: 0, fps: 0, confirmTravel: null, modal: null, upgradeResult: null, lootFeed: [], settings: loadSettings(),
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
