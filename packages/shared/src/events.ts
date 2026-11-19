/**
 * Etkinlikler (yönetim panelinden): TP, eşya düşme ve Öz artışı; Kristal Sandık etkinliği (canavarlardan belli
 * oranda Kristal Sandık düşer). Her etkinlik hemen, belirli bir tarihte ya da her gün belirli saatte (Türkiye saati)
 * başlar ve süresi kadar sürer. Sunucu ve istemci aynı hesabı yapar (istemci kalan süreyi gösterir).
 */
import type { DropTune } from './tuning.ts';
import { sanitizeDrops } from './forgeTune.ts';
import { TR_OFFSET_MS } from './time.ts';

export type EventKind = 'xp' | 'drop' | 'essence' | 'chest';
export type EventMode = 'now' | 'once' | 'daily';
export interface EventDef {
  id: string;
  kind: EventKind;
  /** açık mı (kapatılırsa hiç başlamaz) */
  on: boolean;
  /** TP / eşya / Öz için çarpan (2 = iki kat) */
  mult: number;
  /** Kristal Sandık için her canavar öldürmede düşme şansı (0..1) */
  chance: number;
  mode: EventMode;
  /** 'now' ve 'once': başlangıç anı (epoch ms) */
  start: number;
  /** süre (dakika) */
  durMin: number;
  /** 'daily': başlangıç saati (Türkiye) "SS:DD" */
  at: string;
  /** 'daily': haftanın günleri (0 Pazar … 6 Cumartesi); boşsa her gün */
  days: number[];
}
export interface ChestTune { gems: [number, number]; essence: [number, number]; drops: DropTune[] }
export interface EventsTune { list: EventDef[]; chest: ChestTune; /** başlarken herkese sohbette duyur */ announce: boolean }

export const EVENT_NAMES: Record<EventKind, string> = { xp: 'TP Artışı', drop: 'Eşya Düşme Artışı', essence: 'Öz Artışı', chest: 'Kristal Sandık' };
export const EVENT_ICONS: Record<EventKind, string> = { xp: '✦', drop: '🎁', essence: '💧', chest: '💎' };

export const EVENTS_DEFAULT: EventsTune = {
  announce: true,
  list: [],
  chest: {
    gems: [20, 80], essence: [40, 160],
    drops: [
      { kind: 'mat', key: 'red_potion', chance: 0.6, qty: [3, 8] },
      { kind: 'mat', key: 'kor_seal', chance: 0.35, qty: [1, 3] },
      { kind: 'mat', key: 'ember_stone', chance: 0.25, qty: [2, 5] },
      { kind: 'mat', key: 'star_iron', chance: 0.1, qty: [1, 2] },
    ],
  },
};

const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
const num = (v: unknown, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const pair = (v: unknown, d: [number, number]): [number, number] => {
  if (!Array.isArray(v) || v.length !== 2) return [...d];
  const a = Math.round(num(v[0], 0, 1e7, d[0])), b = Math.round(num(v[1], 0, 1e7, d[1])); return [Math.min(a, b), Math.max(a, b)];
};
const KINDS: EventKind[] = ['xp', 'drop', 'essence', 'chest'];
const MODES: EventMode[] = ['now', 'once', 'daily'];

export function sanitizeEvents(raw: unknown): EventsTune {
  const r = obj(raw), c = obj(r.chest);
  const list: EventDef[] = [];
  for (const x of Array.isArray(r.list) ? r.list.slice(0, 30) : []) {
    const o = obj(x);
    const kind = KINDS.includes(o.kind as EventKind) ? o.kind as EventKind : null;
    if (!kind) continue;
    list.push({
      id: typeof o.id === 'string' && /^[a-z0-9]{1,16}$/.test(o.id) ? o.id : Math.random().toString(36).slice(2, 10),
      kind, on: o.on !== false,
      mult: num(o.mult, 1, 10, 2), chance: num(o.chance, 0, 1, 0.03),
      mode: MODES.includes(o.mode as EventMode) ? o.mode as EventMode : 'now',
      start: Math.round(num(o.start, 0, 9e15, 0)), durMin: Math.round(num(o.durMin, 1, 60 * 24 * 14, 60)),
      at: typeof o.at === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(o.at) ? o.at : '20:00',
      days: Array.isArray(o.days) ? [...new Set(o.days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [],
    });
  }
  return {
    announce: r.announce !== false, list,
    chest: { gems: pair(c.gems, EVENTS_DEFAULT.chest.gems), essence: pair(c.essence, EVENTS_DEFAULT.chest.essence), drops: sanitizeDrops(c.drops, EVENTS_DEFAULT.chest.drops) },
  };
}

/** Etkinliğin şu anki (ya da bugünkü) penceresi: etkin ise [başlangıç, bitiş], değilse null. */
export function eventWindow(e: EventDef, now: number): [number, number] | null {
  if (!e.on) return null;
  const dur = e.durMin * 60_000;
  if (e.mode !== 'daily') return now >= e.start && now < e.start + dur ? [e.start, e.start + dur] : null;
  const [h, m] = e.at.split(':').map(Number);
  // bugünün ve dünün başlangıcı (gece yarısını aşan etkinlik için)
  const tr = new Date(now + TR_OFFSET_MS);
  const day0 = Date.UTC(tr.getUTCFullYear(), tr.getUTCMonth(), tr.getUTCDate()) - TR_OFFSET_MS;
  for (const back of [0, 1]) {
    const s = day0 - back * 86400_000 + (h * 60 + m) * 60_000;
    const wd = new Date(s + TR_OFFSET_MS).getUTCDay();
    if (e.days.length && !e.days.includes(wd)) continue;
    if (now >= s && now < s + dur) return [s, s + dur];
  }
  return null;
}
/** Sıradaki başlangıç (yönetimde "sonraki" göstermek için); yoksa null */
export function eventNextStart(e: EventDef, now: number): number | null {
  if (!e.on) return null;
  if (e.mode !== 'daily') return e.start > now ? e.start : null;
  const [h, m] = e.at.split(':').map(Number);
  const tr = new Date(now + TR_OFFSET_MS);
  const day0 = Date.UTC(tr.getUTCFullYear(), tr.getUTCMonth(), tr.getUTCDate()) - TR_OFFSET_MS;
  for (let k = 0; k < 8; k++) {
    const s = day0 + k * 86400_000 + (h * 60 + m) * 60_000;
    const wd = new Date(s + TR_OFFSET_MS).getUTCDay();
    if (s > now && (!e.days.length || e.days.includes(wd))) return s;
  }
  return null;
}
export interface ActiveEvents { xp: number; drop: number; essence: number; chest: number; list: { e: EventDef; end: number }[] }
/** Şu an etkin olanlar: çarpanlar çarpılır (iki TP etkinliği aynı anda: 2×1,5 = 3), sandık şansı en yükseği. */
export function activeEvents(t: EventsTune | undefined, now: number): ActiveEvents {
  const out: ActiveEvents = { xp: 1, drop: 1, essence: 1, chest: 0, list: [] };
  for (const e of t?.list ?? []) {
    const w = eventWindow(e, now); if (!w) continue;
    out.list.push({ e, end: w[1] });
    if (e.kind === 'chest') out.chest = Math.max(out.chest, e.chance);
    else out[e.kind] *= e.mult;
  }
  return out;
}
