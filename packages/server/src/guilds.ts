import { pool } from './db/pool.ts';
import type { GuildTag, GuildWarInfo, ToWorker, AdminGive } from './types.ts';

/**
 * Loncalar (ana süreç; bütün kanallar ortak). Veriler veritabanında, çalışırken bellekte.
 *  - Kurma: 1000 Mücevher + 20. seviye (bedel kanal sunucusunda karakterden düşülür, sonra lonca yazılır).
 *  - Rütbe: 2 lider, 1 subay, 0 üye. Davet: lider/subay, hedef başka loncada değilse.
 *  - Öz vergisi (%0–20): üyelerin canavardan kazandığı Özün o kadarı lonca hazinesine gider (kanal sunucusu keser,
 *    toplu bildirir). Lider hazineden çekebilir.
 *  - Lonca savaşı: lider/subay rakip loncaya savaş ilan eder, rakip lider/subay kabul eder; 60 sn sonra, ilan eden
 *    oyuncunun kanalındaki Savaş Meydanı'nda 5 dakika. En çok rakip yenen lonca kazanır. Aynı hesaptan
 *    gelen öldürme sayılmaz.
 */
export const GUILD_COST = 1000, GUILD_MIN_LEVEL = 20, GUILD_MAX_MEMBERS = 30, GUILD_TAX_MAX = 20;
export const WAR_PREP_MS = 60_000, WAR_MS = 5 * 60_000, WAR_REQ_MS = 120_000, INVITE_MS = 60_000;
export const EMBLEM_COUNT = 16;

export interface GSession { sid: number; charId: number; accountId: number; name: string; cls: string; channel: number; level?: number }
export interface GuildHost {
  byChar(charId: number): GSession | undefined;
  byName(name: string): GSession | undefined;
  send(charId: number, o: unknown): void;
  toWorker(ch: number, m: ToWorker): void;
  toAllWorkers(m: ToWorker): void;
  give(charId: number, g: AdminGive): void;
  announce(text: string): void;
}
interface Member { charId: number; name: string; cls: string; level: number; rank: number; contributed: number }
interface Guild { id: number; name: string; emblem: number; tax: number; bank: number; notice: string; wins: number; losses: number; members: Map<number, Member> }
interface War extends GuildWarInfo { score: [number, number]; kills: Map<number, number> }

const validName = (n: string) => /^[A-Za-zÇĞİÖŞÜçğıöşü0-9 ]{3,16}$/.test(n) && !/ {2}/.test(n) && n.trim() === n;

export class Guilds {
  private g = new Map<number, Guild>();
  private byCharG = new Map<number, number>();
  private invites = new Map<number, { gid: number; from: string; at: number }>();
  private pending = new Map<string, { charId: number; name: string; emblem: number; sid: number }>();
  private wars = new Map<number, War>();
  private warReq = new Map<number, { from: number; channel: number; at: number; by: string }>();
  private nextWar = 1;
  private dirty = new Set<number>();
  private memberDirty = new Set<number>();

  constructor(private h: GuildHost) {}

  async load() {
    const gs = await pool.query('SELECT id, name, emblem, tax, bank, notice, wins, losses FROM guilds');
    for (const r of gs.rows) this.g.set(Number(r.id), { id: Number(r.id), name: r.name, emblem: r.emblem, tax: r.tax, bank: Number(r.bank), notice: r.notice, wins: r.wins, losses: r.losses, members: new Map() });
    const ms = await pool.query('SELECT m.char_id, m.guild_id, m.rank, m.contributed, c.name, c.cls, c.level FROM guild_members m JOIN characters c ON c.id = m.char_id WHERE c.deleted_at IS NULL');
    for (const r of ms.rows) {
      const gg = this.g.get(Number(r.guild_id)); if (!gg) continue;
      const id = Number(r.char_id);
      gg.members.set(id, { charId: id, name: r.name, cls: r.cls, level: r.level, rank: r.rank, contributed: Number(r.contributed) });
      this.byCharG.set(id, gg.id);
    }
    // lidersiz kalan loncaya en kıdemli üyeyi lider yap; üyesiz loncayı sil
    for (const gg of [...this.g.values()]) {
      if (!gg.members.size) { await pool.query('DELETE FROM guilds WHERE id=$1', [gg.id]); this.g.delete(gg.id); continue; }
      if (![...gg.members.values()].some((m) => m.rank === 2)) { const m = [...gg.members.values()].sort((a, b) => b.rank - a.rank)[0]; m.rank = 2; await pool.query('UPDATE guild_members SET rank=2 WHERE char_id=$1', [m.charId]); }
    }
  }

  tagOf(charId: number): GuildTag | null {
    const gg = this.g.get(this.byCharG.get(charId) ?? -1);
    return gg ? { gid: gg.id, name: gg.name, emblem: gg.emblem, tax: gg.tax } : null;
  }
  /** Karakter oyuna girdi: kanal sunucusuna etiket, oyuncuya lonca görünümü */
  onJoin(s: GSession, level: number) {
    const gg = this.g.get(this.byCharG.get(s.charId) ?? -1);
    if (gg) { const m = gg.members.get(s.charId); if (m) { m.level = level; m.name = s.name; } }
    this.h.toWorker(s.channel, { type: 'guild_set', charId: s.charId, g: this.tagOf(s.charId) });
    this.h.toWorker(s.channel, { type: 'gwar', wars: this.warList() });
    this.sendView(s.charId);
    if (gg) this.pushMembers(gg, s.charId);
  }
  onLeave(charId: number) { const gg = this.g.get(this.byCharG.get(charId) ?? -1); if (gg) this.pushMembers(gg, charId); }

  private view(charId: number) {
    const gg = this.g.get(this.byCharG.get(charId) ?? -1);
    const inv = this.invites.get(charId);
    const invG = inv && Date.now() - inv.at < INVITE_MS ? this.g.get(inv.gid) : undefined;
    const war = gg ? [...this.wars.values()].find((w) => w.a === gg.id || w.b === gg.id) : undefined;
    const req = gg ? this.warReq.get(gg.id) : undefined;
    const reqG = req && Date.now() - req.at < WAR_REQ_MS ? this.g.get(req.from) : undefined;
    return {
      t: 'guild',
      g: gg ? {
        id: gg.id, name: gg.name, emblem: gg.emblem, tax: gg.tax, bank: gg.bank, notice: gg.notice, wins: gg.wins, losses: gg.losses,
        members: [...gg.members.values()].sort((a, b) => b.rank - a.rank || b.contributed - a.contributed).map((m) => ({ id: m.charId, name: m.name, cls: m.cls, level: m.level, rank: m.rank, contributed: m.contributed, online: !!this.h.byChar(m.charId) })),
        myRank: gg.members.get(charId)?.rank ?? 0,
      } : null,
      invite: invG ? { gid: invG.id, name: invG.name, emblem: invG.emblem, from: inv!.from } : null,
      war: war ? this.warView(war) : null,
      warReq: reqG ? { gid: reqG.id, name: reqG.name, emblem: reqG.emblem, by: req!.by } : null,
    };
  }
  private warView(w: War) { return { id: w.id, a: w.a, b: w.b, an: w.an, bn: w.bn, ae: this.g.get(w.a)?.emblem ?? 0, be: this.g.get(w.b)?.emblem ?? 0, channel: w.channel, startAt: w.startAt, endsAt: w.endsAt, score: w.score }; }
  sendView(charId: number) { if (this.h.byChar(charId)) this.h.send(charId, this.view(charId)); }
  private pushMembers(gg: Guild, except?: number) { for (const m of gg.members.values()) if (m.charId !== except) this.sendView(m.charId); }
  private notice(charId: number, text: string, kind: 'ok' | 'error' | 'info' = 'info') { this.h.send(charId, { t: 'notice', text, kind }); }
  private setTag(charId: number) { const s = this.h.byChar(charId); if (s) this.h.toWorker(s.channel, { type: 'guild_set', charId, g: this.tagOf(charId) }); }

  /** İstemciden { t:'guild', op, ... } */
  async handle(s: GSession, c: Record<string, unknown>) {
    const op = String(c.op ?? '');
    const me = s.charId, gid = this.byCharG.get(me), gg = gid ? this.g.get(gid) : undefined, rank = gg?.members.get(me)?.rank ?? -1;
    const err = (t: string) => this.notice(me, t, 'error');
    try {
      switch (op) {
        case 'info': return this.sendView(me);
        case 'list': {
          const list = [...this.g.values()].sort((a, b) => b.wins - a.wins || b.members.size - a.members.size).slice(0, 50).map((x) => ({ id: x.id, name: x.name, emblem: x.emblem, members: x.members.size, wins: x.wins, losses: x.losses }));
          return this.h.send(me, { t: 'guildList', list });
        }
        case 'create': {
          if (gg) return err('Zaten bir loncadasın.');
          const name = String(c.name ?? '').trim().replace(/\s+/g, ' ');
          if (!validName(name)) return err('Lonca adı 3–16 karakter olmalı (harf, rakam, boşluk).');
          if ([...this.g.values()].some((x) => x.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr'))) return err('Bu adda bir lonca var.');
          const emblem = Math.max(0, Math.min(EMBLEM_COUNT - 1, Number(c.emblem) | 0));
          const req = `g${me}-${Date.now()}`;
          this.pending.set(req, { charId: me, name, emblem, sid: s.sid });
          // bedel kanal sunucusunda tahsil edilir (seviye ve mücevher orada), sonra onCharged
          this.h.toWorker(s.channel, { type: 'guild_charge', sid: s.sid, req, gems: GUILD_COST, minLevel: GUILD_MIN_LEVEL });
          return;
        }
        case 'invite': {
          if (!gg || rank < 1) return err('Davet için lider ya da subay olmalısın.');
          const t = this.h.byName(String(c.name ?? ''));
          if (!t) return err('Oyuncu çevrimiçi değil.');
          if (this.byCharG.has(t.charId)) return err(`${t.name} zaten bir loncada.`);
          if (gg.members.size >= GUILD_MAX_MEMBERS) return err(`Lonca dolu (en çok ${GUILD_MAX_MEMBERS} üye).`);
          this.invites.set(t.charId, { gid: gg.id, from: s.name, at: Date.now() });
          this.h.send(t.charId, { t: 'guildInvite', gid: gg.id, name: gg.name, emblem: gg.emblem, from: s.name });
          this.sendView(t.charId);
          return this.notice(me, `${t.name} loncaya davet edildi.`, 'ok');
        }
        case 'accept': {
          const inv = this.invites.get(me); this.invites.delete(me);
          if (!inv || Date.now() - inv.at > INVITE_MS) return err('Davetin süresi doldu.');
          if (gg) return err('Zaten bir loncadasın.');
          const tg = this.g.get(inv.gid); if (!tg) return err('Lonca artık yok.');
          if (tg.members.size >= GUILD_MAX_MEMBERS) return err('Lonca dolu.');
          await pool.query('INSERT INTO guild_members(char_id, guild_id, rank) VALUES ($1,$2,0)', [me, tg.id]);
          tg.members.set(me, { charId: me, name: s.name, cls: s.cls, level: s.level ?? (Number(c.level) || 1), rank: 0, contributed: 0 });
          this.byCharG.set(me, tg.id);
          this.setTag(me); this.pushMembers(tg);
          for (const m of tg.members.values()) if (m.charId !== me) this.notice(m.charId, `${s.name} loncaya katıldı.`, 'ok');
          return this.notice(me, `${tg.name} loncasına katıldın!`, 'ok');
        }
        case 'decline': this.invites.delete(me); return this.sendView(me);
        case 'leave': {
          if (!gg) return;
          if (rank === 2 && gg.members.size > 1) return err('Lider ayrılmadan önce liderliği devretmeli ya da loncayı dağıtmalı.');
          if (this.inWar(gg.id)) return err('Savaş sürerken loncadan ayrılamazsın.');
          if (gg.members.size <= 1) return this.disband(gg);
          await this.removeMember(gg, me);
          return this.notice(me, 'Loncadan ayrıldın.', 'ok');
        }
        case 'kick': {
          const id = Number(c.id); const m = gg?.members.get(id);
          if (!gg || !m || id === me) return;
          if (rank < 1 || m.rank >= rank) return err('Bu üyeyi çıkarma yetkin yok.');
          if (this.inWar(gg.id)) return err('Savaş sürerken üye çıkarılamaz.');
          await this.removeMember(gg, id);
          this.notice(id, `${gg.name} loncasından çıkarıldın.`, 'error');
          return this.notice(me, `${m.name} loncadan çıkarıldı.`, 'ok');
        }
        case 'rank': {
          const id = Number(c.id); const m = gg?.members.get(id); const to = Number(c.rank) === 1 ? 1 : 0;
          if (!gg || !m || rank !== 2 || id === me) return err('Rütbeyi yalnız lider değiştirir.');
          m.rank = to; await pool.query('UPDATE guild_members SET rank=$1 WHERE char_id=$2', [to, id]);
          this.pushMembers(gg); return;
        }
        case 'transfer': {
          const id = Number(c.id); const m = gg?.members.get(id);
          if (!gg || !m || rank !== 2 || id === me) return;
          m.rank = 2; gg.members.get(me)!.rank = 1;
          await pool.query('UPDATE guild_members SET rank = CASE WHEN char_id=$1 THEN 2 ELSE 1 END WHERE char_id IN ($1,$2)', [id, me]);
          this.pushMembers(gg);
          for (const x of gg.members.values()) this.notice(x.charId, `${m.name} loncanın yeni lideri.`, 'ok');
          return;
        }
        case 'settings': {
          if (!gg || rank !== 2) return err('Ayarları yalnız lider değiştirir.');
          const tax = Math.max(0, Math.min(GUILD_TAX_MAX, Math.round(Number(c.tax ?? gg.tax))));
          const emblem = Math.max(0, Math.min(EMBLEM_COUNT - 1, Math.round(Number(c.emblem ?? gg.emblem))));
          const notice = String(c.notice ?? gg.notice).replace(/[\u0000-\u001f]/g, '').slice(0, 200);
          gg.tax = tax; gg.emblem = emblem; gg.notice = notice;
          await pool.query('UPDATE guilds SET tax=$1, emblem=$2, notice=$3 WHERE id=$4', [tax, emblem, notice, gg.id]);
          for (const m of gg.members.values()) this.setTag(m.charId);
          this.pushMembers(gg);
          return this.notice(me, 'Lonca ayarları kaydedildi.', 'ok');
        }
        case 'withdraw': {
          if (!gg || rank !== 2) return err('Hazineden yalnız lider çekebilir.');
          const n = Math.max(0, Math.min(gg.bank, Math.round(Number(c.amount) || 0)));
          if (!n) return;
          gg.bank -= n; await pool.query('UPDATE guilds SET bank=bank-$1 WHERE id=$2', [n, gg.id]);
          this.h.give(me, { kind: 'essence', qty: n });
          this.pushMembers(gg);
          return this.notice(me, `Hazineden ${n.toLocaleString('tr-TR')} Öz çektin.`, 'ok');
        }
        case 'disband': {
          if (!gg || rank !== 2) return;
          if (this.inWar(gg.id)) return err('Savaş sürerken lonca dağıtılamaz.');
          return this.disband(gg);
        }
        case 'war': {
          if (!gg || rank < 1) return err('Savaşı lider ya da subay ilan eder.');
          const tg = this.g.get(Number(c.gid));
          if (!tg || tg.id === gg.id) return err('Rakip lonca bulunamadı.');
          if (this.inWar(gg.id) || this.inWar(tg.id)) return err('Loncalardan biri zaten savaşta.');
          const r = this.warReq.get(tg.id);
          if (r && Date.now() - r.at < WAR_REQ_MS) return err('Bu loncaya zaten bir savaş ilanı bekliyor.');
          this.warReq.set(tg.id, { from: gg.id, channel: s.channel, at: Date.now(), by: s.name });
          let any = false;
          for (const m of tg.members.values()) if (m.rank >= 1 && this.h.byChar(m.charId)) { any = true; this.h.send(m.charId, { t: 'guildWarReq', gid: gg.id, name: gg.name, emblem: gg.emblem, by: s.name }); this.sendView(m.charId); }
          return this.notice(me, any ? `${tg.name} loncasına savaş ilan edildi. Kabul etmeleri bekleniyor (2 dk).` : `${tg.name} loncasının lideri/subayı şu an çevrimiçi değil; ilan 2 dk bekler.`, 'ok');
        }
        case 'war_accept': case 'war_decline': {
          if (!gg || rank < 1) return;
          const r = this.warReq.get(gg.id); this.warReq.delete(gg.id);
          if (!r || Date.now() - r.at > WAR_REQ_MS) return err('Savaş ilanının süresi doldu.');
          const og = this.g.get(r.from); if (!og) return;
          if (op === 'war_decline') { for (const m of og.members.values()) this.notice(m.charId, `${gg.name} savaş ilanını reddetti.`, 'info'); return this.sendView(me); }
          if (this.inWar(gg.id) || this.inWar(og.id)) return err('Loncalardan biri zaten savaşta.');
          const now = Date.now();
          const w: War = { id: this.nextWar++, a: og.id, b: gg.id, an: og.name, bn: gg.name, channel: r.channel, startAt: now + WAR_PREP_MS, endsAt: now + WAR_PREP_MS + WAR_MS, score: [0, 0], kills: new Map() };
          this.wars.set(w.id, w);
          this.h.toAllWorkers({ type: 'gwar', wars: this.warList() });
          for (const x of [og, gg]) for (const m of x.members.values()) { this.sendView(m.charId); this.notice(m.charId, `Lonca savaşı: ${og.name} – ${gg.name}! 60 sn sonra Kanal ${w.channel}'de Savaş Meydanı'nda başlıyor. Lonca panelinden "Savaşa katıl".`, 'ok'); }
          this.h.announce(`Lonca savaşı ilan edildi: ${og.name} ⚔ ${gg.name} (Kanal ${w.channel})`);
          return;
        }
        case 'war_join': {
          if (!gg) return;
          const w = [...this.wars.values()].find((x) => x.a === gg.id || x.b === gg.id);
          if (!w) return err('Loncan şu an savaşta değil.');
          if (Date.now() > w.endsAt) return err('Savaş bitti.');
          if (s.channel !== w.channel) return err(`Savaş Kanal ${w.channel}'de. Ayarlar → "Kanal / karakter değiştir" ile Kanal ${w.channel}'e geç.`);
          this.h.toWorker(s.channel, { type: 'gwar_join', sid: s.sid, side: w.a === gg.id ? 0 : 1 });
          return;
        }
      }
    } catch (e) { console.error('[guild]', op, e); err('Lonca işlemi yapılamadı, tekrar dene.'); }
  }

  /** Kanal sunucusu kurma bedelini tahsil etti (ya da edemedi) */
  async onCharged(req: string, ok: boolean, errText?: string) {
    const p = this.pending.get(req); this.pending.delete(req);
    if (!p) return;
    if (!ok) return this.notice(p.charId, errText ?? 'Lonca kurulamadı.', 'error');
    try {
      if (this.byCharG.has(p.charId)) throw new Error('zaten loncada');
      const r = await pool.query('INSERT INTO guilds(name, emblem) VALUES ($1,$2) RETURNING id', [p.name, p.emblem]);
      const id = Number(r.rows[0].id);
      await pool.query('INSERT INTO guild_members(char_id, guild_id, rank) VALUES ($1,$2,2)', [p.charId, id]);
      const s = this.h.byChar(p.charId);
      const gg: Guild = { id, name: p.name, emblem: p.emblem, tax: 0, bank: 0, notice: '', wins: 0, losses: 0, members: new Map([[p.charId, { charId: p.charId, name: s?.name ?? '?', cls: s?.cls ?? 'guardian', level: s?.level ?? GUILD_MIN_LEVEL, rank: 2, contributed: 0 }]]) };
      this.g.set(id, gg); this.byCharG.set(p.charId, id);
      this.setTag(p.charId); this.sendView(p.charId);
      this.notice(p.charId, `${p.name} loncası kuruldu! Oyunculara tıklayıp "Loncaya davet et" diyebilirsin.`, 'ok');
      this.h.announce(`${s?.name ?? 'Bir kahraman'} "${p.name}" loncasını kurdu!`);
    } catch (e) {
      // ad çakışması vb.: bedel geri verilir
      this.h.give(p.charId, { kind: 'gems', qty: GUILD_COST });
      this.notice(p.charId, /unique|duplicate/i.test(String(e)) ? 'Bu adda bir lonca var; mücevherin iade edildi.' : 'Lonca kurulamadı; mücevherin iade edildi.', 'error');
    }
  }
  /** Öz vergisi (kanal sunucularından toplu) */
  onTax(items: [number, number, number][]) {
    for (const [gid, charId, n] of items) {
      const gg = this.g.get(gid); if (!gg || n <= 0) continue;
      gg.bank += n; this.dirty.add(gid);
      const m = gg.members.get(charId); if (m) { m.contributed += n; this.memberDirty.add(charId); }
    }
  }
  /** Savaş meydanında öldürme */
  onWarKill(killer: number, victim: number) {
    const ga = this.byCharG.get(killer), gb = this.byCharG.get(victim);
    if (!ga || !gb || ga === gb) return;
    const w = [...this.wars.values()].find((x) => (x.a === ga && x.b === gb) || (x.a === gb && x.b === ga));
    const now = Date.now();
    if (!w || now < w.startAt || now > w.endsAt) return;
    const ks = this.h.byChar(killer), vs = this.h.byChar(victim);
    if (ks && vs && ks.accountId === vs.accountId) return; // aynı hesap: sayılmaz
    w.score[w.a === ga ? 0 : 1]++;
    w.kills.set(killer, (w.kills.get(killer) ?? 0) + 1);
    this.pushWar(w);
  }
  private pushWar(w: War) {
    const v = { t: 'guildWar', war: this.warView(w) };
    for (const gid of [w.a, w.b]) for (const m of this.g.get(gid)?.members.values() ?? []) if (this.h.byChar(m.charId)) this.h.send(m.charId, v);
  }
  private warList(): GuildWarInfo[] { return [...this.wars.values()].map(({ id, a, b, an, bn, channel, startAt, endsAt }) => ({ id, a, b, an, bn, channel, startAt, endsAt })); }
  private inWar(gid: number) { return [...this.wars.values()].some((w) => w.a === gid || w.b === gid); }

  /** 5 sn'de bir: savaş bitişi, hazine/katkı yazımı, eski davetlerin temizliği */
  async tick() {
    const now = Date.now();
    for (const w of [...this.wars.values()]) {
      if (now < w.endsAt) { if (now >= w.startAt) this.pushWar(w); continue; }
      this.wars.delete(w.id);
      const A = this.g.get(w.a), B = this.g.get(w.b);
      const [sa, sb] = w.score;
      const win = sa === sb ? null : sa > sb ? A : B, lose = sa === sb ? null : sa > sb ? B : A;
      if (win && lose) {
        win.wins++; lose.losses++;
        await pool.query('UPDATE guilds SET wins=wins+1 WHERE id=$1', [win.id]).catch(() => {});
        await pool.query('UPDATE guilds SET losses=losses+1 WHERE id=$1', [lose.id]).catch(() => {});
      }
      const top = [...w.kills.entries()].sort((a, b) => b[1] - a[1])[0];
      const topName = top ? (A?.members.get(top[0]) ?? B?.members.get(top[0]))?.name : null;
      this.h.announce(`Lonca savaşı bitti: ${w.an} ${sa} – ${sb} ${w.bn}. ${win ? `Kazanan: ${win.name}!` : 'Berabere!'}${topName ? ` En çok yenen: ${topName} (${top[1]})` : ''}`);
      this.h.toAllWorkers({ type: 'gwar', wars: this.warList() });
      for (const gg of [A, B]) if (gg) for (const m of gg.members.values()) { this.sendView(m.charId); this.h.send(m.charId, { t: 'guildWar', war: null, result: { an: w.an, bn: w.bn, score: w.score, win: win?.name ?? null } }); }
    }
    for (const [k, r] of this.warReq) if (now - r.at > WAR_REQ_MS) this.warReq.delete(k);
    for (const [k, i] of this.invites) if (now - i.at > INVITE_MS) this.invites.delete(k);
    await this.flush();
  }
  async flush() {
    const gids = [...this.dirty]; this.dirty.clear();
    for (const id of gids) { const gg = this.g.get(id); if (gg) await pool.query('UPDATE guilds SET bank=$1 WHERE id=$2', [gg.bank, id]).catch(() => this.dirty.add(id)); }
    const cids = [...this.memberDirty]; this.memberDirty.clear();
    for (const id of cids) { const gg = this.g.get(this.byCharG.get(id) ?? -1); const m = gg?.members.get(id); if (m) await pool.query('UPDATE guild_members SET contributed=$1 WHERE char_id=$2', [m.contributed, id]).catch(() => this.memberDirty.add(id)); }
  }
  private async removeMember(gg: Guild, charId: number) {
    await pool.query('DELETE FROM guild_members WHERE char_id=$1', [charId]);
    gg.members.delete(charId); this.byCharG.delete(charId);
    this.setTag(charId); this.sendView(charId); this.pushMembers(gg);
  }
  private async disband(gg: Guild) {
    await pool.query('DELETE FROM guilds WHERE id=$1', [gg.id]);
    this.g.delete(gg.id);
    const ids = [...gg.members.keys()];
    for (const id of ids) { this.byCharG.delete(id); this.setTag(id); this.sendView(id); this.notice(id, `${gg.name} loncası dağıtıldı.`, 'info'); }
    if (gg.bank > 0) { const leader = [...gg.members.values()].find((m) => m.rank === 2); if (leader) this.h.give(leader.charId, { kind: 'essence', qty: gg.bank }); }
  }
  stats() { return { guilds: this.g.size, wars: this.wars.size }; }
}
