import type { ItemInstance } from '@col/shared';
import type { Player } from './entities.ts';

/**
 * Oyuncular arası etkileşim (kanal içi): davet, grup, güvenli ticaret, düello, arkadaşlık.
 *
 * Güvenlik:
 *  - Her istek sunucuda doğrulanır (mesafe, aynı harita, ölü değil, zaten grupta/ticarette değil, davet süresi).
 *  - Ticaret iki aşamalı: iki taraf da teklifini "kilitler", sonra iki taraf da "onaylar". Teklif değişirse iki
 *    tarafın kilidi/onayı düşer (son anda eşya değiştirme hilesi olmaz). Takas anında her şey yeniden denetlenir
 *    (eşya hâlâ çantada mı, kilitli değil mi, çanta yeri, mücevher) ve tek seferde yapılır; iki karakter hemen kaydedilir.
 *  - Aynı gruptakiler birbirine vuramaz (PvP ve arena dahil). Düello yalnız karşılıklı kabul ile; ölüm yok, can 1'de biter.
 */
export type InviteKind = 'party' | 'trade' | 'duel' | 'friend';
interface Invite { from: number; kind: InviteKind; at: number }
interface Party { id: number; leader: number; members: number[] }
interface Side { items: string[]; gems: number; locked: boolean; ok: boolean }
interface Trade { a: number; b: number; side: Map<number, Side> }
interface Duel { a: number; b: number; startAt: number; endAt: number; x: number; y: number }

export interface SocialHost {
  readonly now: number;
  byChar(charId: number): Player | undefined;
  sendJson(p: Player, o: unknown): void;
  notice(p: Player, text: string, kind?: 'info' | 'error' | 'ok'): void;
  save(p: Player, urgent?: boolean): void;
  bagCap: number;
}

export const PARTY_MAX = 5;
export const PARTY_XP_RANGE = 3200; // grup TP paylaşım menzili (px): geniş
const INVITE_MS = 30_000, TRADE_RANGE = 700, DUEL_RANGE = 1300, DUEL_MS = 180_000, FRIEND_MAX = 60, TRADE_ITEMS = 12;
const dist = (a: Player, b: Player) => Math.hypot(a.x - b.x, a.y - b.y);

export class Social {
  private parties = new Map<number, Party>();
  private partyOf = new Map<number, number>();
  private nextParty = 1;
  private invites = new Map<number, Invite[]>();
  private trades = new Map<number, Trade>();
  private duels = new Map<number, Duel>();
  private lastInvite = new Map<number, number>();
  constructor(private h: SocialHost) {}

  // ───────── sorgular (dünya kuralları için) ─────────
  sameParty(a: Player, b: Player) { const pa = this.partyOf.get(a.char.id); return pa !== undefined && pa === this.partyOf.get(b.char.id); }
  /** İki oyuncu şu an birbiriyle düelloda (geri sayım bitmiş) mı. */
  dueling(a: Player, b: Player) { const d = this.duels.get(a.char.id); return !!d && this.h.now >= d.startAt && (d.a === b.char.id || d.b === b.char.id); }
  inDuel(p: Player) { return this.duels.has(p.char.id); }
  /** Grup üyeleri (yalnız bu kanalda çevrimiçi olanlar). */
  partyMembers(p: Player): Player[] {
    const pid = this.partyOf.get(p.char.id); if (pid === undefined) return [p];
    const pt = this.parties.get(pid)!; const out: Player[] = [];
    for (const id of pt.members) { const q = this.h.byChar(id); if (q) out.push(q); }
    return out;
  }

  // ───────── davet ─────────
  invite(p: Player, t: Player | null, kind: InviteKind) {
    const h = this.h;
    if (!t || t === p || t.zone !== p.zone) return h.notice(p, 'Oyuncu yakında değil.');
    if (t.dead || p.dead) return h.notice(p, 'Şu an davet gönderilemez.');
    if (h.now - (this.lastInvite.get(p.char.id) ?? 0) < 1500) return h.notice(p, 'Biraz bekle.');
    this.lastInvite.set(p.char.id, h.now);
    if (dist(p, t) > 2000) return h.notice(p, 'Oyuncu çok uzakta.');
    if (kind === 'party') {
      if (this.partyOf.has(t.char.id)) return h.notice(p, `${t.char.name} zaten bir grupta.`);
      const pid = this.partyOf.get(p.char.id);
      if (pid !== undefined) { const pt = this.parties.get(pid)!; if (pt.leader !== p.char.id) return h.notice(p, 'Gruba yalnız lider davet edebilir.'); if (pt.members.length >= PARTY_MAX) return h.notice(p, `Grup dolu (en çok ${PARTY_MAX}).`); }
    } else if (kind === 'trade') {
      if (this.trades.has(p.char.id) || this.trades.has(t.char.id)) return h.notice(p, 'Taraflardan biri zaten ticarette.');
      if (dist(p, t) > TRADE_RANGE) return h.notice(p, 'Ticaret için yanına git.');
    } else if (kind === 'duel') {
      if (this.duels.has(p.char.id) || this.duels.has(t.char.id)) return h.notice(p, 'Taraflardan biri zaten düelloda.');
      if (this.sameParty(p, t)) return h.notice(p, 'Grup arkadaşınla düello yapamazsın.');
      if (p.zone.def.pvp) return h.notice(p, 'Savaş alanında düello yapılmaz.');
    } else if (kind === 'friend') {
      if ((p.char.misc.friends ?? []).includes(t.char.name)) return h.notice(p, `${t.char.name} zaten arkadaşın.`);
      if ((p.char.misc.friends ?? []).length >= FRIEND_MAX) return h.notice(p, 'Arkadaş listen dolu.');
    }
    const list = (this.invites.get(t.char.id) ?? []).filter((i) => !(i.from === p.char.id && i.kind === kind) && h.now - i.at < INVITE_MS);
    list.push({ from: p.char.id, kind, at: h.now });
    this.invites.set(t.char.id, list.slice(-6));
    h.sendJson(t, { t: 'invite', kind, from: p.char.id, name: p.char.name, cls: p.char.cls, level: p.char.level });
    h.notice(p, `${t.char.name} adlı oyuncuya ${KIND_NAME[kind]} isteği gönderildi.`, 'info');
  }

  answer(p: Player, from: number, kind: InviteKind, accept: boolean) {
    const h = this.h;
    const list = this.invites.get(p.char.id) ?? [];
    const i = list.findIndex((x) => x.from === from && x.kind === kind);
    if (i < 0) return h.notice(p, 'Davet bulunamadı ya da süresi doldu.');
    const inv = list.splice(i, 1)[0];
    if (h.now - inv.at > INVITE_MS) return h.notice(p, 'Davetin süresi doldu.');
    const q = h.byChar(from);
    if (!q) return h.notice(p, 'Davet eden oyuncu artık burada değil.');
    if (!accept) { h.notice(q, `${p.char.name} ${KIND_NAME[kind]} isteğini reddetti.`, 'info'); return; }
    if (q.zone !== p.zone || q.dead || p.dead) return h.notice(p, 'Şu an kabul edilemez.');
    if (kind === 'party') return this.joinParty(q, p);
    if (kind === 'trade') return this.openTrade(q, p);
    if (kind === 'duel') return this.startDuel(q, p);
    if (kind === 'friend') return this.addFriends(q, p);
  }

  // ───────── grup ─────────
  private joinParty(leader: Player, p: Player) {
    const h = this.h;
    if (this.partyOf.has(p.char.id)) return h.notice(p, 'Zaten bir gruptasın.');
    let pid = this.partyOf.get(leader.char.id);
    if (pid === undefined) { pid = this.nextParty++; this.parties.set(pid, { id: pid, leader: leader.char.id, members: [leader.char.id] }); this.partyOf.set(leader.char.id, pid); }
    const pt = this.parties.get(pid)!;
    if (pt.leader !== leader.char.id) return h.notice(p, 'Davet eden artık lider değil.');
    if (pt.members.length >= PARTY_MAX) return h.notice(p, 'Grup dolu.');
    pt.members.push(p.char.id); this.partyOf.set(p.char.id, pid);
    for (const m of this.partyMembers(p)) h.notice(m, `${p.char.name} gruba katıldı.`, 'ok');
    this.pushParty(pt);
  }
  leaveParty(p: Player, quiet = false) {
    const pid = this.partyOf.get(p.char.id); if (pid === undefined) return;
    const pt = this.parties.get(pid)!;
    pt.members = pt.members.filter((x) => x !== p.char.id); this.partyOf.delete(p.char.id);
    this.h.sendJson(p, { t: 'party', members: [], leader: 0 });
    if (!quiet) this.h.notice(p, 'Gruptan ayrıldın.', 'info');
    if (pt.members.length <= 1) { for (const id of pt.members) { this.partyOf.delete(id); const q = this.h.byChar(id); if (q) { this.h.sendJson(q, { t: 'party', members: [], leader: 0 }); this.h.notice(q, 'Grup dağıldı.', 'info'); } } this.parties.delete(pid); return; }
    if (pt.leader === p.char.id) pt.leader = pt.members[0];
    for (const id of pt.members) { const q = this.h.byChar(id); if (q) this.h.notice(q, `${p.char.name} gruptan ayrıldı.`, 'info'); }
    this.pushParty(pt);
  }
  kick(p: Player, target: number) {
    const pid = this.partyOf.get(p.char.id); if (pid === undefined) return;
    const pt = this.parties.get(pid)!;
    if (pt.leader !== p.char.id) return this.h.notice(p, 'Yalnız lider gruptan çıkarabilir.');
    if (!pt.members.includes(target) || target === p.char.id) return;
    const q = this.h.byChar(target);
    if (q) { this.leaveParty(q, true); this.h.notice(q, 'Gruptan çıkarıldın.', 'info'); }
    else { pt.members = pt.members.filter((x) => x !== target); this.partyOf.delete(target); this.pushParty(pt); }
  }
  private pushParty(pt: Party) {
    const list = pt.members.map((id) => { const q = this.h.byChar(id); return q ? { id, eid: q.id, name: q.char.name, cls: q.char.cls, level: q.char.level, hp: Math.max(0, Math.round(q.hp)), maxHp: q.stats.maxHp, map: q.zone.id, dead: q.dead } : { id, eid: 0, name: '?', cls: 'guardian', level: 0, hp: 0, maxHp: 1, map: '', dead: false }; });
    for (const id of pt.members) { const q = this.h.byChar(id); if (q) this.h.sendJson(q, { t: 'party', members: list, leader: pt.leader }); }
  }

  /**
   * Grup TP paylaşımı: öldürülen canavarın çevresindeki (geniş menzil) canlı grup üyeleri TP'yi bölüşür; kalabalık
   * grup bonusu var (kişi başı %15). Ganimet öldürende kalır.
   */
  shareXp(killer: Player, mx: number, my: number, base: (q: Player) => number): [Player, number][] {
    const members = this.partyMembers(killer).filter((q) => q === killer || (q.zone === killer.zone && !q.dead && Math.hypot(q.x - mx, q.y - my) <= PARTY_XP_RANGE));
    const n = members.length;
    const k = n <= 1 ? 1 : (1 + 0.15 * (n - 1)) / n;
    return members.map((q) => [q, Math.max(1, Math.round(base(q) * k))]);
  }

  // ───────── ticaret ─────────
  private openTrade(a: Player, b: Player) {
    if (this.trades.has(a.char.id) || this.trades.has(b.char.id)) return this.h.notice(b, 'Taraflardan biri zaten ticarette.');
    if (dist(a, b) > TRADE_RANGE) return this.h.notice(b, 'Ticaret için yanına git.');
    const tr: Trade = { a: a.char.id, b: b.char.id, side: new Map([[a.char.id, { items: [], gems: 0, locked: false, ok: false }], [b.char.id, { items: [], gems: 0, locked: false, ok: false }]]) };
    this.trades.set(a.char.id, tr); this.trades.set(b.char.id, tr);
    this.pushTrade(tr);
  }
  tradeSet(p: Player, items: unknown, gems: unknown) {
    const tr = this.trades.get(p.char.id); if (!tr) return;
    const ids = Array.isArray(items) ? [...new Set(items.map(String))].slice(0, TRADE_ITEMS) : [];
    const ok = ids.filter((id) => { const it = p.char.bag.find((x) => x.id === id); return it && !it.locked; });
    const g = Math.max(0, Math.min(p.char.gems, Math.floor(Number(gems) || 0)));
    const s = tr.side.get(p.char.id)!;
    s.items = ok; s.gems = g;
    for (const x of tr.side.values()) { x.locked = false; x.ok = false; } // teklif değişti: iki taraf yeniden kilitler
    this.pushTrade(tr);
  }
  tradeLock(p: Player) { const tr = this.trades.get(p.char.id); if (!tr) return; tr.side.get(p.char.id)!.locked = true; this.pushTrade(tr); }
  tradeConfirm(p: Player) {
    const tr = this.trades.get(p.char.id); if (!tr) return;
    const sides = [...tr.side.values()];
    if (!sides.every((s) => s.locked)) return this.h.notice(p, 'Önce iki taraf da teklifini kilitlemeli.');
    tr.side.get(p.char.id)!.ok = true;
    if (sides.every((s) => s.ok)) this.execTrade(tr); else this.pushTrade(tr);
  }
  tradeCancel(p: Player, why = 'Ticaret iptal edildi.') {
    const tr = this.trades.get(p.char.id); if (!tr) return;
    this.closeTrade(tr, why);
  }
  private closeTrade(tr: Trade, why: string) {
    this.trades.delete(tr.a); this.trades.delete(tr.b);
    for (const id of [tr.a, tr.b]) { const q = this.h.byChar(id); if (q) { this.h.sendJson(q, { t: 'trade', op: 'close' }); this.h.notice(q, why, 'info'); } }
  }
  private execTrade(tr: Trade) {
    const A = this.h.byChar(tr.a), B = this.h.byChar(tr.b);
    if (!A || !B) return this.closeTrade(tr, 'Ticaret iptal: oyunculardan biri ayrıldı.');
    if (A.zone !== B.zone || dist(A, B) > TRADE_RANGE || A.dead || B.dead) return this.closeTrade(tr, 'Ticaret iptal: oyuncular birbirinden uzaklaştı.');
    const sa = tr.side.get(tr.a)!, sb = tr.side.get(tr.b)!;
    const take = (p: Player, s: Side): ItemInstance[] | null => { const out: ItemInstance[] = []; for (const id of s.items) { const it = p.char.bag.find((x) => x.id === id); if (!it || it.locked) return null; out.push(it); } return out; };
    const ia = take(A, sa), ib = take(B, sb);
    if (!ia || !ib) return this.closeTrade(tr, 'Ticaret iptal: tekliften bir eşya artık yok.');
    if (A.char.gems < sa.gems || B.char.gems < sb.gems) return this.closeTrade(tr, 'Ticaret iptal: mücevher yetersiz.');
    if (A.char.bag.length - ia.length + ib.length > this.h.bagCap) return this.closeTrade(tr, `Ticaret iptal: ${A.char.name} çantası dolu.`);
    if (B.char.bag.length - ib.length + ia.length > this.h.bagCap) return this.closeTrade(tr, `Ticaret iptal: ${B.char.name} çantası dolu.`);
    // takas (tek seferde)
    const sa2 = new Set(sa.items), sb2 = new Set(sb.items);
    A.char.bag = A.char.bag.filter((x) => !sa2.has(x.id)); B.char.bag = B.char.bag.filter((x) => !sb2.has(x.id));
    A.char.bag.push(...ib); B.char.bag.push(...ia);
    A.char.gems += sb.gems - sa.gems; B.char.gems += sa.gems - sb.gems;
    for (const q of [A, B]) { q.selfDirty |= 1 | 2 | 4; this.h.save(q, true); }
    this.trades.delete(tr.a); this.trades.delete(tr.b);
    for (const q of [A, B]) { this.h.sendJson(q, { t: 'trade', op: 'close' }); this.h.notice(q, 'Ticaret tamamlandı.', 'ok'); }
  }
  private pushTrade(tr: Trade) {
    const A = this.h.byChar(tr.a), B = this.h.byChar(tr.b);
    if (!A || !B) return this.closeTrade(tr, 'Ticaret iptal edildi.');
    const view = (p: Player) => { const s = tr.side.get(p.char.id)!; return { items: s.items.map((id) => p.char.bag.find((x) => x.id === id)).filter(Boolean), gems: s.gems, locked: s.locked, ok: s.ok }; };
    this.h.sendJson(A, { t: 'trade', op: 'state', with: B.char.name, me: view(A), them: view(B) });
    this.h.sendJson(B, { t: 'trade', op: 'state', with: A.char.name, me: view(B), them: view(A) });
  }

  // ───────── düello ─────────
  private startDuel(a: Player, b: Player) {
    if (this.duels.has(a.char.id) || this.duels.has(b.char.id)) return this.h.notice(b, 'Taraflardan biri zaten düelloda.');
    const d: Duel = { a: a.char.id, b: b.char.id, startAt: this.h.now + 3000, endAt: this.h.now + 3000 + DUEL_MS, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.duels.set(a.char.id, d); this.duels.set(b.char.id, d);
    for (const q of [a, b]) { this.h.sendJson(q, { t: 'duel', op: 'start', vs: q === a ? b.id : a.id, name: (q === a ? b : a).char.name, in: 3000 }); this.h.notice(q, 'Düello 3 saniye sonra başlıyor!', 'info'); }
  }
  /** Düelloda can sıfıra inerse ölüm yerine düello biter (kaybeden 1 canda kalır). true: ölüm engellendi. */
  duelDown(loser: Player, winner: Player | null): boolean {
    const d = this.duels.get(loser.char.id);
    if (!d || !winner || !(d.a === winner.char.id || d.b === winner.char.id)) return false;
    this.endDuel(d, winner, loser, `${winner.char.name} düelloyu kazandı!`);
    return true;
  }
  private endDuel(d: Duel, winner: Player | null, loser: Player | null, text: string) {
    this.duels.delete(d.a); this.duels.delete(d.b);
    for (const id of [d.a, d.b]) { const q = this.h.byChar(id); if (q) { this.h.sendJson(q, { t: 'duel', op: 'end', win: winner?.char.id === id }); this.h.notice(q, text, winner?.char.id === id ? 'ok' : 'info'); } }
    if (loser) loser.combatUntil = 0;
  }

  // ───────── arkadaşlık ─────────
  private addFriends(a: Player, b: Player) {
    for (const [x, y] of [[a, b], [b, a]] as const) {
      const f = x.char.misc.friends ?? (x.char.misc.friends = []);
      if (!f.includes(y.char.name) && f.length < FRIEND_MAX) f.push(y.char.name);
      x.markSave(); this.sendFriends(x);
      this.h.notice(x, `${y.char.name} artık arkadaşın.`, 'ok');
    }
  }
  removeFriend(p: Player, name: string) {
    const f = p.char.misc.friends ?? [];
    p.char.misc.friends = f.filter((n) => n !== name); p.markSave(); this.sendFriends(p);
  }
  sendFriends(p: Player) {
    const here = new Set<string>(); for (const id of this.allCharNames()) here.add(id);
    this.h.sendJson(p, { t: 'friends', list: (p.char.misc.friends ?? []).map((n) => ({ name: n, here: here.has(n) })) });
  }
  allCharNames: () => Iterable<string> = () => [];

  // ───────── bakım ─────────
  /** Saniyede bir: süresi dolan davetler, uzaklaşan ticaret/düello, grup durumu. */
  tick() {
    const h = this.h, now = h.now;
    for (const [k, list] of this.invites) { const l = list.filter((i) => now - i.at < INVITE_MS); if (l.length) this.invites.set(k, l); else this.invites.delete(k); }
    for (const tr of new Set(this.trades.values())) { const A = h.byChar(tr.a), B = h.byChar(tr.b); if (!A || !B || A.zone !== B.zone || dist(A, B) > TRADE_RANGE * 1.4 || A.dead || B.dead) this.closeTrade(tr, 'Ticaret iptal: oyuncular birbirinden uzaklaştı.'); }
    for (const d of new Set(this.duels.values())) {
      const A = h.byChar(d.a), B = h.byChar(d.b);
      if (!A || !B) { this.endDuel(d, A ?? B ?? null, null, 'Düello bitti: rakip ayrıldı.'); continue; }
      if (A.zone !== B.zone) { this.endDuel(d, null, null, 'Düello bitti.'); continue; }
      const outA = Math.hypot(A.x - d.x, A.y - d.y) > DUEL_RANGE, outB = Math.hypot(B.x - d.x, B.y - d.y) > DUEL_RANGE;
      if (outA || outB) { const w = outA ? B : A, l = outA ? A : B; this.endDuel(d, w, l, `${l.char.name} düello alanından çıktı: ${w.char.name} kazandı.`); continue; }
      if (now > d.endAt) this.endDuel(d, null, null, 'Düello süresi doldu: berabere.');
    }
    for (const pt of this.parties.values()) this.pushParty(pt);
  }
  /** Oyuncu kanaldan ayrılınca: ticaret ve düello biter, davetler silinir; grupta kalır (çevrimdışı görünür). */
  onLeave(p: Player) {
    this.tradeCancel(p, 'Ticaret iptal: oyuncu ayrıldı.');
    const d = this.duels.get(p.char.id); if (d) { const o = this.h.byChar(d.a === p.char.id ? d.b : d.a) ?? null; this.endDuel(d, o, p, 'Düello bitti: rakip ayrıldı.'); }
    this.invites.delete(p.char.id);
    this.leaveParty(p, true);
  }
  /** Harita değişince ticaret ve düello biter. */
  onZoneChange(p: Player) {
    this.tradeCancel(p, 'Ticaret iptal: oyuncu haritadan ayrıldı.');
    const d = this.duels.get(p.char.id); if (d) { const o = this.h.byChar(d.a === p.char.id ? d.b : d.a) ?? null; this.endDuel(d, o, p, 'Düello bitti: oyuncu haritadan ayrıldı.'); }
  }
}

const KIND_NAME: Record<InviteKind, string> = { party: 'grup', trade: 'ticaret', duel: 'düello', friend: 'arkadaşlık' };
