import { WebSocketServer, WebSocket, type RawData } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { sanitizeChat, CHAT_MAX } from '@col/shared';
import { ChannelManager } from './channels.ts';
import { CharacterStore } from './store.ts';
import { WorldState } from './worldstate.ts';
import { config } from './config.ts';
import { randomToken } from './auth.ts';
import { RateLimiter } from './http.ts';
import type { CharState, FromWorker, Role, AdminGive } from './types.ts';
import { Arena } from './arena.ts';
import { Guilds } from './guilds.ts';
import { applyGive } from './worker/world.ts';
import { pool } from './db/pool.ts';

interface Ticket { accountId: number; charId: number; channel: number; role: Role; exp: number; nonce: string }
interface Session {
  sid: number; ws: WebSocket; accountId: number; charId: number; channel: number; name: string; cls: string; role: Role; since: number;
  state: 'joining' | 'active' | 'closing';
  needResync: boolean; awaitingReset: boolean; dropped: number;
  lastWorldChat: number; msgs: number; msgWindow: number; lastPm?: number; lastPing?: number;
  /** bağlantı IP'si (arena hile denetimi: aynı bağlantıdan açılan tarayıcılar birbirinden puan alamaz) */
  ip: string;
  /** girişteki seviye (lonca üye listesi için) */
  level?: number;
}

/**
 * Bağlantı geçidi. Kurallar:
 *  - Hesap başına tek etkin oturum. Yeni giriş eskisini düşürür; eski oturum artık komut gönderemez.
 *  - Karakter başına tek sahip: yeni kanal/oturum, önceki worker'ın son durumu teslim edilmeden yüklenmez (dupe önleme).
 *  - Yavaş istemci: tampon dolarsa snapshot'lar atılır ve tam yeniden eşitleme istenir; sunucu beklemez.
 */
export class Gateway {
  wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: 4096 });
  tickets = new Map<string, Ticket>();
  accountTicket = new Map<number, string>();
  sessions = new Map<number, Session>();
  byAccount = new Map<number, Session>();
  /** charId → önceki sahibin bırakmasını bekleyen söz */
  charRelease = new Map<number, { promise: Promise<void>; resolve: () => void; channel: number; sid: number }>();
  private nextSid = 1;
  private cmdLimiter = new RateLimiter(40, 80);
  stats = { connects: 0, kicks: 0, dropped: 0, resyncs: 0, badMsgs: 0 };

  /** Savaş Arenası (bütün kanallar için ortak sıralama) */
  arena: Arena;
  /** Loncalar (bütün kanallar ortak; bkz. guilds.ts) */
  guilds: Guilds;
  private activeByChar(charId: number) { for (const s of this.sessions.values()) if (s.charId === charId && s.state === 'active') return s; return undefined; }

  /** canavar sıralaması: oyundakilerin bu dönemdeki av sayısı (kanallardan anında gelir) */
  liveKills = new Map<number, { charId: number; name: string; cls: string; level: number; k: string; n: number }>();
  constructor(public channels: ChannelManager, public store: CharacterStore, public world: WorldState) {
    this.arena = new Arena({
      sessionByChar: (charId) => { for (const s of this.sessions.values()) if (s.charId === charId && s.state !== 'closing') return { charId, accountId: s.accountId, ip: s.ip, name: s.name, cls: s.cls, channel: s.channel }; return undefined; },
      broadcastWorkers: (m) => this.channels.broadcast(m),
      broadcastClients: (o) => { const msg = JSON.stringify(o); for (const s of this.sessions.values()) if (s.state === 'active' && s.ws.readyState === WebSocket.OPEN) s.ws.send(msg); },
      give: (charId, g) => { void this.giveTo(charId, g); },
      audit: (action, detail) => { pool.query(`INSERT INTO audit_log(actor_account, action, detail) VALUES (NULL,$1,$2)`, [action, JSON.stringify(detail)]).catch(() => {}); },
    });
    this.guilds = new Guilds({
      byChar: (charId) => this.activeByChar(charId),
      byName: (name) => { const n = name.trim().toLocaleLowerCase('tr'); for (const s of this.sessions.values()) if (s.state === 'active' && s.name.toLocaleLowerCase('tr') === n) return s; return undefined; },
      send: (charId, o) => { const s = this.activeByChar(charId); if (s) this.sendJson(s, o); },
      toWorker: (ch, m) => this.channels.send(ch, m),
      toAllWorkers: (m) => this.channels.broadcast(m),
      give: (charId, g) => { void this.giveTo(charId, g); },
      announce: (text) => this.broadcastAll({ t: 'chat', ch: 'world', from: 'Lonca', text, gm: true }),
    });
    setInterval(() => { this.guilds.tick().catch((e) => console.error('[guild] tick', e)); }, 5000).unref();
    setInterval(() => this.arena.tick(), 5000).unref();
    setInterval(() => this.broadcastWorld(), 5000).unref();
    setInterval(() => { const now = Date.now(); for (const [k, t] of this.tickets) if (t.exp < now) { this.tickets.delete(k); if (this.accountTicket.get(t.accountId) === k) this.accountTicket.delete(t.accountId); } }, 10_000).unref();
  }

  online() { return this.sessions.size; }

  issueTicket(t: Omit<Ticket, 'exp'>): string {
    const prev = this.accountTicket.get(t.accountId);
    if (prev) this.tickets.delete(prev); // hesap başına tek bekleyen giriş
    const tk = randomToken(24);
    this.tickets.set(tk, { ...t, exp: Date.now() + 30_000 });
    this.accountTicket.set(t.accountId, tk);
    this.channels.pending[t.channel] = (this.channels.pending[t.channel] ?? 0) + 1;
    setTimeout(() => { this.channels.pending[t.channel] = Math.max(0, (this.channels.pending[t.channel] ?? 1) - 1); }, 30_000).unref();
    return tk;
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    const url = new URL(req.url ?? '/', 'http://x');
    const tk = url.searchParams.get('ticket') ?? '';
    const t = this.tickets.get(tk);
    if (!t || t.exp < Date.now()) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); socket.destroy(); return; }
    this.tickets.delete(tk); // tek kullanımlık
    if (this.accountTicket.get(t.accountId) === tk) this.accountTicket.delete(t.accountId);
    // gerçek oyuncu IP'si: nginx (Cloudflare real_ip ile) X-Real-IP olarak geçirir
    const ip = String(req.headers['x-real-ip'] ?? req.socket.remoteAddress ?? '').slice(0, 64);
    this.wss.handleUpgrade(req, socket, head, (ws) => this.onConnect(ws, t, ip));
  }

  /** Bütün oyunculara mesaj (duyuru vb.) */
  broadcastAll(o: unknown) { const msg = JSON.stringify(o); for (const s of this.sessions.values()) if (s.state === 'active' && s.ws.readyState === WebSocket.OPEN) s.ws.send(msg); }
  /** Ödül/hediye: çevrimiçiyse kanal sunucusu çantaya koyar, değilse kayda yazılır. */
  async giveTo(charId: number, g: AdminGive) {
    const ch = this.onlineChannel(charId);
    if (ch) { this.channels.send(ch, { type: 'admin', op: 'give', charId, give: g }); return; }
    try {
      const c = await this.store.load(charId);
      if (!c) return;
      applyGive(c, g); c.saveVersion++; this.store.enqueue(c, true);
    } catch (e) { console.error('[gw] give', e); }
  }

  private async onConnect(ws: WebSocket, t: Ticket, ip = '') {
    this.stats.connects++;
    const sid = this.nextSid++;
    const s: Session = { sid, ws, accountId: t.accountId, charId: t.charId, channel: t.channel, name: '', cls: '', role: t.role, state: 'joining', needResync: false, awaitingReset: false, dropped: 0, lastWorldChat: 0, msgs: 0, msgWindow: Date.now(), ip, since: Date.now() };
    this.sessions.set(sid, s);
    ws.binaryType = 'arraybuffer';
    ws.on('message', (data, isBinary) => this.onMessage(s, data, isBinary));
    ws.on('close', (code) => this.onClose(s, code));
    ws.on('error', () => {});

    // Aynı hesabın eski oturumunu düşür
    const old = this.byAccount.get(t.accountId);
    if (old && old !== s) this.kick(old, 'Hesabına başka bir yerden giriş yapıldı.');
    this.byAccount.set(t.accountId, s);
    // Aynı karakter başka yerdeyse bırakmasını bekle
    const rel = this.charRelease.get(t.charId);
    if (rel) {
      const ok = await Promise.race([rel.promise.then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), 8000))]);
      if (!ok) { this.sendJson(s, { t: 'fatal', text: 'Önceki oturum kapatılıyor…', retry: true }); ws.close(); return; }
    }
    if (s.state !== 'joining' || ws.readyState !== WebSocket.OPEN) return;
    let char: CharState | null;
    try { char = await this.store.load(t.charId); } catch (e) { console.error('[gw] load', e); char = null; }
    if (!char || char.accountId !== t.accountId) { this.sendJson(s, { t: 'fatal', text: 'Karakter yüklenemedi.' }); ws.close(); return; }
    if (s.state !== 'joining' || ws.readyState !== WebSocket.OPEN) return;
    if (!this.channels.alive(t.channel)) { this.sendJson(s, { t: 'fatal', text: 'Kanal hazırlanıyor…', retry: true }); ws.close(); return; }
    char.role = t.role;
    s.name = char.name; s.cls = char.cls; s.level = char.level;
    // sahipliği al
    let resolve!: () => void;
    const promise = new Promise<void>((r) => (resolve = r));
    this.charRelease.set(t.charId, { promise, resolve, channel: t.channel, sid });
    s.state = 'active';
    this.channels.send(t.channel, { type: 'join', sid, char });
  }

  kick(s: Session, reason: string) {
    if (s.state === 'closing') return;
    this.stats.kicks++;
    console.warn(`[gw] atıldı ${s.name || '#' + s.charId} ch${s.channel}: ${reason}`);
    this.sendJson(s, { t: 'kicked', text: reason });
    this.release(s);
    setTimeout(() => s.ws.terminate(), 200);
  }

  private onClose(s: Session, code = 0) {
    // 1000/1001 = oyuncu kendi kapattı; 1006 = ağ koptu (oyuncunun interneti, Cloudflare vb.)
    if (s.state === 'active') console.log(`[gw] bağlantı kapandı ${s.name || '#' + s.charId} ch${s.channel} kod=${code} süre=${Math.round((Date.now() - s.since) / 1000)}sn`);
    this.release(s);
  }

  /** Oturumu kapat; worker'dan son durumu iste. Karakter sahipliği 'left' gelince serbest kalır. */
  private release(s: Session) {
    if (s.state === 'closing') return;
    const wasActive = s.state === 'active';
    s.state = 'closing';
    this.sessions.delete(s.sid);
    if (this.byAccount.get(s.accountId) === s) this.byAccount.delete(s.accountId);
    if (wasActive) this.channels.send(s.channel, { type: 'leave', sid: s.sid, reason: 'close' });
    if (wasActive) this.guilds.onLeave(s.charId);
  }

  private onMessage(s: Session, data: RawData, isBinary: boolean) {
    if (s.state !== 'active') return; // eski/kapanan oturum komut gönderemez
    const now = Date.now();
    if (now - s.msgWindow > 1000) { s.msgWindow = now; s.msgs = 0; }
    // Saniyede 60'tan fazla mesaj yok sayılır. Mobil ağ takılıp biriken mesajlar tek seferde gelebilir: bu yüzden
    // oyuncu ATILMAZ (eskiden 200'ü aşınca atılıyordu). Yalnız açıkça saldırı düzeyindeki akış (saniyede 3000+) kesilir.
    if (++s.msgs > 60) { this.stats.badMsgs++; if (s.msgs > 3000) this.kick(s, 'Bağlantı kötüye kullanıldı.'); return; }
    if (isBinary) {
      const ab = data instanceof ArrayBuffer ? data : Buffer.isBuffer(data) ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : null;
      if (!ab || ab.byteLength !== 4) return;
      this.channels.send(s.channel, { type: 'move', sid: s.sid, data: ab as ArrayBuffer }, [ab as ArrayBuffer]);
      return;
    }
    const text = data.toString();
    if (text.length > 1024) { this.stats.badMsgs++; return; }
    // Gecikme ölçümü geçitte hemen yanıtlanır: dünya iş parçacığına gidip oyun adımının sonunu (0–50 ms)
    // beklemesin; böylece gösterilen ms yalnız gerçek ağ gidiş-dönüşüdür.
    if (text.startsWith('{"t":"ping"')) {
      if (s.lastPing && now - s.lastPing < 400) return;
      s.lastPing = now;
      const m = /"c":(\d{1,16})/.exec(text);
      if (m) s.ws.send(`{"t":"pong","c":${m[1]},"s":${Date.now()}}`);
      return;
    }
    if (!this.cmdLimiter.take(String(s.sid))) return;
    // Lonca: bütün kanallar ortak, ana süreçte işlenir
    if (text.startsWith('{"t":"guild"')) { let c: any; try { c = JSON.parse(text); } catch { return; } void this.guilds.handle(s, c); return; }
    // Dünya/ticaret sohbeti tüm kanallara: geçitte işlenir
    if (text.includes('"chat"')) {
      let c: any; try { c = JSON.parse(text); } catch { return; }
      if (c.t === 'chat' && (c.ch === 'world' || c.ch === 'trade')) return this.worldChat(s, c.ch, String(c.text ?? ''));
      if (c.t === 'chat' && c.ch === 'pm') return this.whisper(s, String(c.to ?? ''), String(c.text ?? ''));
    }
    this.channels.send(s.channel, { type: 'cmd', sid: s.sid, data: text });
  }

  private worldChat(s: Session, ch: 'world' | 'trade', raw: string) {
    const text = sanitizeChat(raw, CHAT_MAX);
    if (!text) return;
    const now = Date.now();
    if (now - s.lastWorldChat < 5000 && s.role === 'player') { this.sendJson(s, { t: 'notice', text: 'Dünya/Ticaret sohbetinde 5 saniye beklemelisin.', kind: 'error' }); return; }
    s.lastWorldChat = now;
    const msg = JSON.stringify({ t: 'chat', ch, from: s.name, cls: s.cls, text, chn: s.channel, gm: s.role !== 'player' });
    for (const o of this.sessions.values()) if (o.state === 'active' && o.ws.readyState === WebSocket.OPEN) o.ws.send(msg);
    this.logChat(ch, s.channel, s.name, text);
  }

  /** Yönetim: sohbetin canlı akışı (dünya, ticaret, bölge; fısıltı tutulmaz). Bellekte son 300 ileti. */
  chatLog: { id: number; at: number; ch: 'world' | 'trade' | 'local'; chn: number; from: string; text: string; map?: string }[] = [];
  private chatSeq = 0;
  /** CPU profili sonucu (api.ts bağlar) */
  onProfile?: (ch: number, m: Extract<FromWorker, { type: 'profile' }>) => void;
  logChat(ch: 'world' | 'trade' | 'local', chn: number, from: string, text: string, map?: string) {
    this.chatLog.push({ id: ++this.chatSeq, at: Date.now(), ch, chn, from, text, map });
    if (this.chatLog.length > 300) this.chatLog.splice(0, this.chatLog.length - 300);
  }

  /** Fısıltı (özel mesaj): bütün kanallarda, ada göre (büyük/küçük harf duyarsız). Saniyede en çok bir mesaj. */
  private whisper(s: Session, to: string, raw: string) {
    const text = sanitizeChat(raw, CHAT_MAX);
    const name = to.trim().toLocaleLowerCase('tr');
    if (!text || !name) return;
    const now = Date.now();
    if (now - (s.lastPm ?? 0) < 1000 && s.role === 'player') { this.sendJson(s, { t: 'notice', text: 'Biraz yavaş yaz.', kind: 'error' }); return; }
    s.lastPm = now;
    let target: Session | undefined;
    for (const o of this.sessions.values()) if (o.state === 'active' && o.name.toLocaleLowerCase('tr') === name) { target = o; break; }
    if (!target) { this.sendJson(s, { t: 'notice', text: `${to} şu an çevrimiçi değil.`, kind: 'error' }); return; }
    if (target === s) return;
    this.sendJson(target, { t: 'chat', ch: 'pm', from: s.name, cls: s.cls, text, chn: s.channel });
    this.sendJson(s, { t: 'chat', ch: 'pm', from: s.name, to: target.name, cls: s.cls, text, chn: s.channel, self: true });
  }

  sendJson(s: Session, o: unknown) { if (s.ws.readyState === WebSocket.OPEN) s.ws.send(JSON.stringify(o)); }

  broadcastWorld() {
    const msg = JSON.stringify({ t: 'world', health: Math.round(this.world.health * 100) / 100, online: this.sessions.size });
    for (const s of this.sessions.values()) if (s.state === 'active' && s.ws.readyState === WebSocket.OPEN) s.ws.send(msg);
    this.channels.broadcast({ type: 'world', health: this.world.health, online: this.sessions.size });
  }

  /** Yönetim: yeni oyun ayarlarını tüm kanallara ve oyunculara (duyuru, ışık) gönder. */
  broadcastTuning(tuning: unknown) {
    this.channels.broadcast({ type: 'tuning', data: tuning });
    const msg = JSON.stringify({ t: 'tuning', tuning });
    for (const s of this.sessions.values()) if (s.state === 'active' && s.ws.readyState === WebSocket.OPEN) s.ws.send(msg);
  }
  /** Karakter şu an hangi kanalda oyunda (yoksa 0). */
  onlineChannel(charId: number) { for (const s of this.sessions.values()) if (s.charId === charId && s.state !== 'closing') return s.channel; return 0; }
  onlineCharIds() { const out = new Set<number>(); for (const s of this.sessions.values()) if (s.state !== 'closing') out.add(s.charId); return out; }
  /** Yönetim: hesabın açık oturumlarını düşür (yasaklama sonrası). */
  /** hesabın rolü değişti: açık oturumlara ve oyundaki karaktere anında uygula */
  setAccountRole(accountId: number, role: Role) {
    for (const s of this.sessions.values()) if (s.accountId === accountId) { s.role = role; if (s.state === 'active') this.channels.send(s.channel, { type: 'admin', op: 'role', charId: s.charId, role }); }
  }
  kickAccount(accountId: number, reason: string) { for (const s of [...this.sessions.values()]) if (s.accountId === accountId) this.kick(s, reason); }

  /** Worker mesajları */
  onWorker(ch: number, m: FromWorker) {
    switch (m.type) {
      case 'chatlog': this.logChat('local', ch, m.from, m.text, m.map); break;
      case 'profile': this.onProfile?.(ch, m); break;
      case 'out': {
        for (const [sid, data] of m.batch) {
          const s = this.sessions.get(sid);
          if (!s || s.state !== 'active' || s.ws.readyState !== WebSocket.OPEN) continue;
          if (typeof data === 'string') { s.ws.send(data); continue; }
          const op = new Uint8Array(data, 0, 1)[0];
          if (s.awaitingReset && op !== 2) continue;
          if (s.ws.bufferedAmount > config.wsMaxBuffered) {
            s.dropped++; this.stats.dropped++;
            if (!s.needResync) { s.needResync = true; }
            continue;
          }
          if (s.needResync) {
            // yeniden eşitleme iste; sıfırlama paketine kadar ara paketleri at
            s.needResync = false; s.awaitingReset = true; this.stats.resyncs++;
            this.channels.send(s.channel, { type: 'cmd', sid: s.sid, data: '{"t":"sync"}' });
            continue;
          }
          if (op === 2) s.awaitingReset = false;
          s.ws.send(data);
        }
        break;
      }
      case 'save': this.store.enqueue(m.char, m.urgent); break;
      case 'market': this.queueMarket(m.channel, m.state, m.chars); break;
      case 'left': {
        this.store.enqueue(m.char, true);
        const rel = this.charRelease.get(m.char.id);
        if (rel && rel.sid === m.sid) { this.charRelease.delete(m.char.id); rel.resolve(); }
        break;
      }
      case 'joined': {
        const s = this.sessions.get(m.sid);
        if (!m.ok) { if (s) { this.sendJson(s, { t: 'fatal', text: m.err ?? 'Giriş başarısız.' }); s.ws.close(); } }
        else if (s && s.state === 'active') this.guilds.onJoin(s, s.level ?? 1);
        break;
      }
      case 'guild_charged': void this.guilds.onCharged(m.req, m.ok, m.err); break;
      case 'guild_tax': this.guilds.onTax(m.items); break;
      case 'gwar_kill': this.guilds.onWarKill(m.killer, m.victim); break;
      case 'arena_join': {
        const err = this.arena.canJoin(m.charId, m.level);
        this.channels.send(ch, { type: 'arena_join_ok', sid: m.sid, err });
        break;
      }
      case 'arena_kill': this.arena.kill(m.killer, m.victim, m.kLevel, m.vLevel); break;
      case 'kick': {
        const s = this.sessions.get(m.sid);
        if (s) { this.sendJson(s, { t: 'fatal', text: m.text }); s.ws.close(); }
        break;
      }
      case 'rank_kill': this.liveKills.set(m.charId, { charId: m.charId, name: m.name, cls: m.cls, level: m.level, k: m.k, n: m.n }); break;
      case 'arena_left': this.arena.left(m.charId); break;
      case 'donate': {
        const gain = this.world.donate(m.charId, m.name, m.amount);
        const s = this.sessions.get(m.sid);
        if (s) this.sendJson(s, { t: 'notice', kind: 'ok', text: `${m.amount} Öz bağışlandı. Dünya Sağlığı +${gain.toFixed(2)}` });
        this.broadcastWorld();
        break;
      }
      default: break;
    }
  }

  /**
   * Pazar yazımları kanal başına sırayla yapılır (geç gelen eski durum yenisini ezmesin). Hata olursa
   * aynı durum yeniden denenir; bu arada yeni bir durum gelirse onunla birleşir (karakterler korunur).
   */
  private marketQ = new Map<number, { state: unknown; chars: Map<number, CharState>; busy: boolean }>();
  private queueMarket(ch: number, state: unknown, chars: CharState[]) {
    const q = this.marketQ.get(ch) ?? { state: null, chars: new Map<number, CharState>(), busy: false };
    q.state = state;
    for (const c of chars) { const prev = q.chars.get(c.id); if (!prev || prev.saveVersion <= c.saveVersion) q.chars.set(c.id, c); }
    this.marketQ.set(ch, q);
    this.flushMarket(ch);
  }
  private flushMarket(ch: number) {
    const q = this.marketQ.get(ch);
    if (!q || q.busy || q.state === null) return;
    const state = q.state, chars = [...q.chars.values()];
    q.state = null; q.chars = new Map(); q.busy = true;
    this.store.writeMarket(ch, state, chars).then(() => { q.busy = false; this.flushMarket(ch); }, () => {
      q.busy = false;
      if (q.state === null) q.state = state; // daha yeni durum yoksa aynısını yeniden dene
      for (const c of chars) if (!q.chars.has(c.id)) q.chars.set(c.id, c);
      setTimeout(() => this.flushMarket(ch), 1000);
    });
  }

  /** Worker çöktü: o kanaldaki oturumlar kapanır; son kaydedilmiş durum geçerlidir. */
  onCrash(ch: number) {
    for (const s of [...this.sessions.values()]) {
      if (s.channel !== ch) continue;
      this.sendJson(s, { t: 'fatal', text: 'Kanal yeniden başlatılıyor…', retry: true });
      console.warn(`[gw] kanal ${ch} çöktü: ${s.name || '#' + s.charId} yeniden bağlanacak`);
      s.state = 'closing';
      this.sessions.delete(s.sid);
      if (this.byAccount.get(s.accountId) === s) this.byAccount.delete(s.accountId);
      s.ws.close();
    }
    for (const [charId, rel] of this.charRelease) if (rel.channel === ch) { this.charRelease.delete(charId); rel.resolve(); }
  }

  channelPopulation(ch: number) {
    let n = 0;
    for (const s of this.sessions.values()) if (s.channel === ch) n++;
    return n;
  }
}
