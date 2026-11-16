import { TUNING, ITEM_TPL, MATERIAL, MALL, RARITIES, MAX_PLUS } from '@col/shared';
import type { AdminGive } from './types.ts';

/**
 * Savaş Arenası (ana süreç): etkinliğin açılıp kapanması, bütün kanallardan gelen öldürmelerin tek sıralamada
 * toplanması, hile denetimi ve sonda ödül dağıtımı. Her kanalda arena ayrı haritadır; puan ortaktır.
 *
 * Hile (çoklu tarayıcı / yan hesapla kendine puan kasma) önlemleri — puan SAYILMAZ:
 *  1) Öldüren ve ölen aynı hesaptansa.
 *  2) Aynı IP adresindense (aynı bilgisayar/ev bağlantısından açılan ikinci tarayıcı).
 *  3) Aynı rakipten etkinlik boyunca en çok 3 puan (aynı kişiyi tekrar tekrar kesmek).
 *  4) Rakip yeni doğmuşsa (son 8 sn içinde öldü): doğuş noktasında bekleyip kesme.
 *  5) Rakip 20 seviyeden fazla düşükse.
 * Ayrıca aynı IP'den arenaya en çok 2 karakter girebilir (kanal sunucusu giriş isteğini buraya sorar).
 */
export interface ArenaSession { charId: number; accountId: number; ip: string; name: string; cls: string; channel: number }
export interface ArenaHost {
  sessionByChar(charId: number): ArenaSession | undefined;
  broadcastWorkers(m: { type: 'arena'; active: boolean; endsAt: number }): void;
  broadcastClients(o: unknown): void;
  give(charId: number, g: AdminGive): void;
  audit(action: string, detail: unknown): void;
}
interface Score { charId: number; accountId: number; name: string; cls: string; kills: number; deaths: number; at: number }

const fmtTr = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' });
function trNow() { const p = Object.fromEntries(fmtTr.formatToParts(new Date()).map((x) => [x.type, x.value])); return { hm: `${p.hour === '24' ? '00' : p.hour}:${p.minute}`, day: `${p.year}-${p.month}-${p.day}` }; }

export class Arena {
  active = false;
  startedAt = 0;
  endsAt = 0;
  private lastSlot = '';
  private scores = new Map<number, Score>();
  private pair = new Map<string, number>();
  private lastDeath = new Map<number, number>();
  private inArena = new Map<number, string>(); // charId → ip (girişte kaydedilir)
  last: { at: number; board: { name: string; cls: string; kills: number; deaths: number }[] } | null = null;
  rejected = 0;

  constructor(private h: ArenaHost) {}

  /** 5 sn'de bir: otomatik saat kontrolü, bitiş, sıralama yayını. */
  tick() {
    const now = Date.now();
    const A = TUNING.arena;
    if (!this.active && A.auto) {
      const { hm, day } = trNow();
      const slot = `${day} ${hm}`;
      if (A.times.includes(hm) && this.lastSlot !== slot) { this.lastSlot = slot; this.start(A.durationMin, 'otomatik'); }
    }
    if (this.active && now >= this.endsAt) this.stop('süre doldu');
    if (this.active) this.h.broadcastClients(this.view());
  }

  start(minutes: number, by: string) {
    if (this.active) return false;
    const now = Date.now();
    this.active = true; this.startedAt = now; this.endsAt = now + Math.max(1, Math.min(180, minutes)) * 60_000;
    this.scores.clear(); this.pair.clear(); this.lastDeath.clear(); this.inArena.clear(); this.rejected = 0;
    this.h.broadcastWorkers({ type: 'arena', active: true, endsAt: this.endsAt });
    this.h.broadcastClients({ t: 'chat', ch: 'world', from: 'Duyuru', text: `⚔ Savaş Arenası açıldı! ${Math.round((this.endsAt - now) / 60000)} dakika sürecek. Ekrandaki "Arenaya Katıl" ile gir; en çok rakip yenenler ödül kazanır.`, gm: true });
    this.h.broadcastClients(this.view());
    this.h.audit('arena.start', { by, endsAt: this.endsAt });
    return true;
  }

  stop(why: string) {
    if (!this.active) return false;
    this.active = false;
    const board = this.ranking();
    const rewards = TUNING.arena.rewards;
    const given: { name: string; rank: number }[] = [];
    board.forEach((s, i) => {
      if (i >= rewards.length || s.kills < 1) return;
      const r = rewards[i];
      if (r.gems > 0) this.h.give(s.charId, { kind: 'gems', qty: r.gems });
      for (const [key, qty] of Object.entries(r.mats)) if ((MATERIAL.has(key) || MALL.has(key)) && qty > 0) this.h.give(s.charId, { kind: 'mat', key, qty });
      if (r.item && ITEM_TPL.has(r.item.tpl) && (RARITIES as readonly string[]).includes(r.item.rarity)) this.h.give(s.charId, { kind: 'item', tpl: r.item.tpl, rarity: r.item.rarity, plus: Math.min(MAX_PLUS, r.item.plus) });
      given.push({ name: s.name, rank: i + 1 });
    });
    this.last = { at: Date.now(), board: board.slice(0, 10).map((s) => ({ name: s.name, cls: s.cls, kills: s.kills, deaths: s.deaths })) };
    this.h.broadcastWorkers({ type: 'arena', active: false, endsAt: 0 });
    const top = given.slice(0, 3).map((g) => `${g.rank}. ${g.name}`).join(' · ');
    this.h.broadcastClients({ t: 'chat', ch: 'world', from: 'Duyuru', text: `⚔ Savaş Arenası bitti. ${top ? 'Kazananlar: ' + top + '. Ödüller çantalarına gönderildi.' : 'Puan alan olmadı.'}`, gm: true });
    this.h.broadcastClients({ t: 'arena', active: false, endsAt: 0, board: this.last.board });
    this.h.audit('arena.stop', { why, board: this.last.board, rejected: this.rejected });
    return true;
  }

  /** Kanal sunucusu arenaya giriş için sorar: etkinlik açık mı, aynı IP'den 2'den fazla karakter var mı. */
  canJoin(charId: number, level: number): string | null {
    if (!this.active) return 'Arena şu an kapalı.';
    const s = this.h.sessionByChar(charId);
    if (!s) return 'Oturum bulunamadı.';
    if (level < TUNING.arena.minLevel) return `Arenaya girmek için en az ${TUNING.arena.minLevel}. seviye gerekir.`;
    let sameIp = 0;
    for (const [cid, ip] of this.inArena) if (cid !== charId && ip === s.ip && s.ip) sameIp++;
    if (sameIp >= 2) return 'Aynı bağlantıdan arenaya en çok 2 karakter girebilir.';
    this.inArena.set(charId, s.ip);
    return null;
  }
  left(charId: number) { this.inArena.delete(charId); }

  /** Kanal sunucusundan: arenada bir oyuncu bir başkasını öldürdü. Hile denetiminden geçerse puan. */
  kill(killerId: number, victimId: number, kLevel: number, vLevel: number) {
    if (!this.active || killerId === victimId) return;
    const now = Date.now();
    const K = this.h.sessionByChar(killerId), V = this.h.sessionByChar(victimId);
    const lastDeath = this.lastDeath.get(victimId) ?? 0;
    this.lastDeath.set(victimId, now);
    const vs = this.score(victimId, V); if (vs) vs.deaths++;
    if (!K || !V) return;
    const key = `${killerId}:${victimId}`, n = this.pair.get(key) ?? 0;
    const bad = K.accountId === V.accountId || (!!K.ip && K.ip === V.ip) || n >= 3 || now - lastDeath < 8000 || vLevel < kLevel - 20;
    if (bad) { this.rejected++; return; }
    this.pair.set(key, n + 1);
    const ks = this.score(killerId, K)!;
    ks.kills++; ks.at = now;
  }

  private score(charId: number, s?: ArenaSession) {
    let x = this.scores.get(charId);
    if (!x && s) { x = { charId, accountId: s.accountId, name: s.name, cls: s.cls, kills: 0, deaths: 0, at: Date.now() }; this.scores.set(charId, x); }
    return x;
  }
  ranking() { return [...this.scores.values()].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths || a.at - b.at); }
  view() {
    return { t: 'arena', active: this.active, endsAt: this.endsAt, board: this.ranking().slice(0, 10).map((s) => ({ id: s.charId, name: s.name, cls: s.cls, kills: s.kills, deaths: s.deaths })) };
  }
  adminView() { return { active: this.active, startedAt: this.startedAt, endsAt: this.endsAt, rejected: this.rejected, board: this.ranking().slice(0, 30).map((s) => ({ name: s.name, cls: s.cls, kills: s.kills, deaths: s.deaths })), last: this.last }; }
}
