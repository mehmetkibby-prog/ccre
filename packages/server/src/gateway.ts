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
import type { CharState, FromWorker, Role } from './types.ts';

interface Ticket { accountId: number; charId: number; channel: number; role: Role; exp: number; nonce: string }
interface Session {
  sid: number; ws: WebSocket; accountId: number; charId: number; channel: number; name: string; cls: string; role: Role;
  state: 'joining' | 'active' | 'closing';
  needResync: boolean; awaitingReset: boolean; dropped: number;
  lastWorldChat: number; msgs: number; msgWindow: number;
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

  constructor(public channels: ChannelManager, public store: CharacterStore, public world: WorldState) {
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
    this.wss.handleUpgrade(req, socket, head, (ws) => this.onConnect(ws, t));
  }

  private async onConnect(ws: WebSocket, t: Ticket) {
    this.stats.connects++;
    const sid = this.nextSid++;
    const s: Session = { sid, ws, accountId: t.accountId, charId: t.charId, channel: t.channel, name: '', cls: '', role: t.role, state: 'joining', needResync: false, awaitingReset: false, dropped: 0, lastWorldChat: 0, msgs: 0, msgWindow: Date.now() };
    this.sessions.set(sid, s);
    ws.binaryType = 'arraybuffer';
    ws.on('message', (data, isBinary) => this.onMessage(s, data, isBinary));
    ws.on('close', () => this.onClose(s));
    ws.on('error', () => {});

    // Aynı hesabın eski oturumunu düşür
    const old = this.byAccount.get(t.accountId);
    if (old && old !== s) this.kick(old, 'Hesabına başka bir yerden giriş yapıldı.');
    this.byAccount.set(t.accountId, s);
    // Aynı karakter başka yerdeyse bırakmasını bekle
    const rel = this.charRelease.get(t.charId);
    if (rel) {
      const ok = await Promise.race([rel.promise.then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), 8000))]);
      if (!ok) { this.sendJson(s, { t: 'fatal', text: 'Önceki oturum kapatılamadı, birkaç saniye sonra tekrar dene.' }); ws.close(); return; }
    }
    if (s.state !== 'joining' || ws.readyState !== WebSocket.OPEN) return;
    let char: CharState | null;
    try { char = await this.store.load(t.charId); } catch (e) { console.error('[gw] load', e); char = null; }
    if (!char || char.accountId !== t.accountId) { this.sendJson(s, { t: 'fatal', text: 'Karakter yüklenemedi.' }); ws.close(); return; }
    if (s.state !== 'joining' || ws.readyState !== WebSocket.OPEN) return;
    if (!this.channels.alive(t.channel)) { this.sendJson(s, { t: 'fatal', text: 'Kanal şu an hazır değil.' }); ws.close(); return; }
    char.role = t.role;
    s.name = char.name; s.cls = char.cls;
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
    this.sendJson(s, { t: 'kicked', text: reason });
    this.release(s);
    setTimeout(() => s.ws.terminate(), 200);
  }

  private onClose(s: Session) { this.release(s); }

  /** Oturumu kapat; worker'dan son durumu iste. Karakter sahipliği 'left' gelince serbest kalır. */
  private release(s: Session) {
    if (s.state === 'closing') return;
    const wasActive = s.state === 'active';
    s.state = 'closing';
    this.sessions.delete(s.sid);
    if (this.byAccount.get(s.accountId) === s) this.byAccount.delete(s.accountId);
    if (wasActive) this.channels.send(s.channel, { type: 'leave', sid: s.sid, reason: 'close' });
  }

  private onMessage(s: Session, data: RawData, isBinary: boolean) {
    if (s.state !== 'active') return; // eski/kapanan oturum komut gönderemez
    const now = Date.now();
    if (now - s.msgWindow > 1000) { s.msgWindow = now; s.msgs = 0; }
    if (++s.msgs > 60) { this.stats.badMsgs++; if (s.msgs > 200) this.kick(s, 'Çok fazla istek.'); return; }
    if (isBinary) {
      const ab = data instanceof ArrayBuffer ? data : Buffer.isBuffer(data) ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : null;
      if (!ab || ab.byteLength !== 4) return;
      this.channels.send(s.channel, { type: 'move', sid: s.sid, data: ab as ArrayBuffer }, [ab as ArrayBuffer]);
      return;
    }
    const text = data.toString();
    if (text.length > 1024) { this.stats.badMsgs++; return; }
    if (!this.cmdLimiter.take(String(s.sid))) return;
    // Dünya/ticaret sohbeti tüm kanallara: geçitte işlenir
    if (text.includes('"chat"')) {
      let c: any; try { c = JSON.parse(text); } catch { return; }
      if (c.t === 'chat' && (c.ch === 'world' || c.ch === 'trade')) return this.worldChat(s, c.ch, String(c.text ?? ''));
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
  kickAccount(accountId: number, reason: string) { for (const s of [...this.sessions.values()]) if (s.accountId === accountId) this.kick(s, reason); }

  /** Worker mesajları */
  onWorker(ch: number, m: FromWorker) {
    switch (m.type) {
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
        if (!m.ok) { const s = this.sessions.get(m.sid); if (s) { this.sendJson(s, { t: 'fatal', text: m.err ?? 'Giriş başarısız.' }); s.ws.close(); } }
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
      this.sendJson(s, { t: 'fatal', text: 'Kanal yeniden başlatılıyor. Lütfen tekrar bağlan.' });
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
