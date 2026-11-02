/**
 * TARAYICI İÇİ TEST MODU
 * Gerçek oyun sunucusunun simülasyon kodu (World) burada, tarayıcının içinde çalışır.
 * API ve WebSocket taklit edilir; kayıtlar yalnız bu cihazın localStorage'ında tutulur.
 * Gerçek çok oyunculu sürüm VDS'teki sunucuyla çalışır; bu mod yalnız denemek içindir.
 */
import { World, makeItem } from '../../../server/src/worker/world.ts';
import type { CharState, FromWorker } from '../../../server/src/types.ts';
import { TUNING, MAPS, SELL_PRICES, getLayout, computeStats, validateCharacterName, normalizeName, CLASS_IDS, ITEM_TEMPLATES, NO_DIR, encodeMove, dirIndexFromVector, type ClassId } from '@col/shared';

const KEY = 'col_offline_v1';
interface Db { nextAcc: number; nextChar: number; accounts: { id: number; username: string; pass: string; starter: boolean }[]; chars: Record<number, CharState>; session: number | null; market?: unknown }
function loadDb(): Db {
  try { const d = JSON.parse(localStorage.getItem(KEY) ?? 'null'); if (d && d.accounts) return d; } catch { /* boş */ }
  return { nextAcc: 1, nextChar: 1, accounts: [], chars: {}, session: null };
}
let db = loadDb();
let saveTimer = 0;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* depolama kapalı olabilir */ } }, 300);
}
async function hash(s: string) {
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('col:' + s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
  catch { return 'p:' + s.length + ':' + [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); }
}
class ApiErr extends Error { constructor(public status: number, m: string) { super(m); } }

// ───────── yerel "sunucu" ─────────
class FakeSocket {
  readyState = 0;
  binaryType = 'arraybuffer';
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string | ArrayBuffer }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sid = 0;
  constructor(private ticket: string) { setTimeout(() => { this.readyState = 1; this.onopen?.(); B().connect(this, this.ticket); }, 30); }
  send(d: string | ArrayBuffer) { if (this.readyState === 1) B().fromClient(this, d); }
  close() { if (this.readyState === 3) return; this.readyState = 3; B().disconnect(this); setTimeout(() => this.onclose?.(), 0); }
  deliver(d: string | ArrayBuffer) { if (this.readyState === 1) this.onmessage?.({ data: d }); }
}

const BOT_NAMES = ['Ayşe', 'Mert', 'Zeynep', 'Kaan', 'Elif', 'Bora', 'Defne', 'Emir'];
interface Bot { sid: number; seq: number; tx: number; ty: number; forest: boolean; target: number; nextChat: number }

class Backend {
  world: World;
  sockets = new Map<number, FakeSocket>();
  tickets = new Map<string, { accountId: number; charId: number }>();
  nextSid = 1;
  bots: Bot[] = [];
  merchants = 0;
  health = 100;
  started = false;
  lastWorld = 0;
  constructor() {
    this.world = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 8000, post: (m) => this.onWorld(m) });
    // pazar: dükkânlar ve sahibi yokken yapılan satışların kazancı bu cihazda kalıcı
    if (db.market) this.world.loadMarket(db.market);
  }
  start() {
    if (this.started) return;
    this.started = true;
    this.spawnBots();
    let next = performance.now();
    const loop = () => {
      const now = performance.now();
      let n = 0;
      while (now >= next && n < 3) { this.driveBots(); this.world.tick(); next += 50; n++; }
      if (now - next > 500) next = now + 50;
      if (now - this.lastWorld > 5000) { this.lastWorld = now; this.health = Math.max(0, this.health - 0.015 * TUNING.worldDecayMul); this.broadcast(JSON.stringify({ t: 'world', health: Math.round(this.health * 100) / 100, online: this.sockets.size + this.bots.length })); this.world.setWorld(this.health, this.sockets.size + this.bots.length); }
      setTimeout(loop, Math.max(0, next - performance.now()));
    };
    loop();
  }
  private onWorld(m: FromWorker) {
    switch (m.type) {
      case 'out': for (const [sid, d] of m.batch) this.sockets.get(sid)?.deliver(d); break;
      case 'market': {
        // dükkân durumu ve etkilenen karakterler aynı kayıtta (tek localStorage yazımı) saklanır
        db.market = m.state;
        for (const c of m.chars) if (c.id > 0) { const cur = db.chars[c.id]; if (!cur || cur.saveVersion <= c.saveVersion) db.chars[c.id] = c; }
        persist();
        break;
      }
      case 'save': case 'left': if (m.char.id > 0) { const cur = db.chars[m.char.id]; if (!cur || cur.saveVersion <= m.char.saveVersion) { db.chars[m.char.id] = m.char; persist(); } } break;
      case 'donate': {
        const gain = m.amount * 0.02 * Math.max(0.15, (100 - this.health) / 100);
        this.health = Math.min(100, this.health + gain);
        this.sockets.get(m.sid)?.deliver(JSON.stringify({ t: 'notice', kind: 'ok', text: `${m.amount} Öz bağışlandı. Dünya Sağlığı +${gain.toFixed(2)}` }));
        break;
      }
    }
  }
  connect(s: FakeSocket, ticket: string) {
    const t = this.tickets.get(ticket);
    this.tickets.delete(ticket);
    const ch = t ? db.chars[t.charId] : null;
    if (!t || !ch) { s.deliver(JSON.stringify({ t: 'fatal', text: 'Giriş bileti geçersiz.' })); s.close(); return; }
    // aynı karakter başka sekmede/oturumda açıksa onu kapat
    for (const [sid, o] of this.sockets) if ((o as unknown as { charId?: number }).charId === ch.id) { o.deliver(JSON.stringify({ t: 'kicked', text: 'Başka bir yerden giriş yapıldı.' })); o.close(); void sid; }
    s.sid = this.nextSid++;
    (s as unknown as { charId: number }).charId = ch.id;
    this.sockets.set(s.sid, s);
    this.start();
    this.world.join(s.sid, structuredClone(ch));
  }
  disconnect(s: FakeSocket) {
    if (!s.sid || !this.sockets.has(s.sid)) return;
    this.sockets.delete(s.sid);
    this.world.leave(s.sid);
  }
  fromClient(s: FakeSocket, d: string | ArrayBuffer) {
    if (typeof d !== 'string') { this.world.onMove(s.sid, d.slice(0)); return; }
    if (d.length > 1024) return;
    if (d.includes('"chat"')) {
      try {
        const c = JSON.parse(d);
        if (c.t === 'chat' && (c.ch === 'world' || c.ch === 'trade')) {
          const p = this.world.bySid.get(s.sid);
          this.broadcast(JSON.stringify({ t: 'chat', ch: c.ch, from: p?.char.name ?? '?', cls: p?.char.cls, text: String(c.text).slice(0, 140), chn: 1 }));
          return;
        }
      } catch { return; }
    }
    this.world.onCmd(s.sid, d);
  }
  broadcast(msg: string) { for (const s of this.sockets.values()) s.deliver(msg); }

  // ───────── test botları: köyde dolaşan ve ormanda avlanan oyuncular ─────────
  resetBots() {
    for (const bot of this.bots) this.world.leave(bot.sid);
    this.bots = []; this.merchants = 0;
    this.spawnBots();
  }
  private spawnBots() {
    const lv = getLayout('bazaar'), lf = getLayout('forest');
    const names = Array.from({ length: TUNING.bots }, (_, i) => BOT_NAMES[i % BOT_NAMES.length] + (i >= BOT_NAMES.length ? ' ' + (Math.floor(i / BOT_NAMES.length) + 1) : ''));
    names.forEach((name, i) => {
      const forest = i % 2 === 1;
      const cls = CLASS_IDS[i % 3];
      const l = forest ? lf : lv;
      const j = i % 8, level = forest ? 6 + j : 3 + j * 2;
      const c: CharState = {
        id: -(i + 1), accountId: -1, role: 'player', name, cls, level, xp: 0, hp: 99999, map: forest ? 'forest' : 'bazaar', x: l.spawn.x + (j - 4) * 60 + Math.floor(i / 8) * 25, y: l.spawn.y + 40 + Math.floor(i / 8) * 50,
        gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: Math.min(64, (level - 1) * 2), res: level - 1, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0,
        bag: [], equip: { weapon: makeItem(`w_${cls}`, j > 4 ? 'orange' : 'blue', 'bot', 1), armor: makeItem(`a_${cls}`, 'blue', 'bot', 1) }, materials: { red_potion: 999 }, misc: { autoPotion: true }, saveVersion: 0,
      };
      const sid = 10_000 + i;
      // köydeki ilk üç bot Pazar Meydanı'nda tezgâh açan tüccar
      const merchant = !forest && this.merchants < 3 && !!MAPS.bazaar.market;
      if (merchant) {
        const mk = MAPS.bazaar.market!, k = this.merchants++;
        const spots = [[-6, -4], [5, -5], [-3, 5]] as const;
        c.x = (mk.tx + spots[k][0]) * 64 + 32; c.y = (mk.ty + spots[k][1]) * 64 + 32;
        const rar = ['white', 'blue', 'blue', 'orange', 'orange', 'crimson'] as const;
        c.bag = Array.from({ length: 4 + k }, (_, n) => makeItem(ITEM_TEMPLATES[(i * 7 + n * 5) % ITEM_TEMPLATES.length].id, rar[(n + k) % rar.length], 'bot', (n + k) % 3));
      }
      this.world.join(sid, c);
      if (merchant) {
        const titles = [`${name}'nin Silah Dükkânı`, 'Ucuz zırh, kaçırma!', `${name} · Nadir eşyalar`];
        this.world.onCmd(sid, JSON.stringify({ t: 'stall_open', title: titles[this.merchants - 1], items: c.bag.map((it) => ({ id: it.id, price: Math.round((SELL_PRICES[it.rarity] ?? 5) * (2.5 + Math.random() * 2)) })), req: 'bot' + sid }));
      }
      this.bots.push({ sid, seq: 0, tx: c.x, ty: c.y, forest, target: 0, nextChat: performance.now() + 15000 + Math.random() * 40000 });
    });
  }
  /**
   * Test sürümü: köydeki botlar arada bir oyuncu dükkânlarından makul fiyatlı (NPC satış fiyatının en çok
   * 4 katı) bir eşya alır. Böylece sen başka yerdeyken satış ve "dükkânın sattı" akışı görülebilir.
   */
  private nextBotBuy = performance.now() + 45_000 + Math.random() * 60_000;
  private botShop() {
    if (performance.now() < this.nextBotBuy) return;
    this.nextBotBuy = performance.now() + 70_000 + Math.random() * 110_000;
    const offers = this.world.market.stalls.filter((s) => s.ownerId > 0).flatMap((s) => s.items.filter((m) => m.price <= (SELL_PRICES[m.item.rarity] ?? 5) * 4).map((m) => ({ s, m })));
    const shoppers = this.bots.filter((b) => !b.forest && !this.world.market.stalls.some((s) => s.ownerId === -(b.sid - 10_000 + 1)));
    if (!offers.length || !shoppers.length) return;
    const { s, m } = offers[Math.floor(Math.random() * offers.length)];
    const b = shoppers[Math.floor(Math.random() * shoppers.length)], p = this.world.bySid.get(b.sid);
    if (!p || p.zone.id !== s.zone) return;
    p.x = s.x + 60; p.y = s.y + 90; b.tx = p.x; b.ty = p.y;
    if (p.char.bag.length > 20) p.char.bag = [];
    p.char.gems = Math.max(p.char.gems, m.price);
    this.world.onCmd(b.sid, JSON.stringify({ t: 'stall_buy', stall: s.id, item: m.item.id, price: m.price, req: 'botbuy' + Date.now() }));
  }
  private driveBots() {
    this.botShop();
    const lines = ['Selam!', 'Orman bugün kalabalık', 'Haso artı basıyor mu?', 'Kurtlara dikkat', 'Grup arayan var mı?', 'Turuncu kılıç düştü!'];
    for (const b of this.bots) {
      const p = this.world.bySid.get(b.sid);
      if (!p) continue;
      if (p.dead) { this.world.onCmd(b.sid, '{"t":"respawn","where":"here"}'); continue; }
      if (this.world.market.stalls.some((s) => s.ownerId === p.char.id)) continue; // dükkânının başındaki tüccar yerinden kalkmaz
      let tx = b.tx, ty = b.ty;
      if (b.forest) {
        let t = b.target ? p.zone.monsterById.get(b.target) : undefined;
        if (!t || t.state === 3) {
          let bd = 900; b.target = 0;
          p.zone.monsters.radius(p.x, p.y, 900, (m, d2) => { const d = Math.sqrt(d2); if (m.state !== 3 && d < bd) { bd = d; b.target = m.id; } });
          t = b.target ? p.zone.monsterById.get(b.target) : undefined;
        }
        if (t) {
          const d = Math.hypot(t.x - p.x, t.y - p.y);
          if (d < p.stats.range - 20) { if (Math.random() < 0.15) this.world.onCmd(b.sid, JSON.stringify({ t: 'attack', id: t.id })); continue; }
          tx = t.x; ty = t.y;
        }
      } else if (Math.hypot(tx - p.x, ty - p.y) < 30 || Math.random() < 0.004) {
        const l = p.zone.layout;
        b.tx = l.spawn.x + (Math.random() - 0.5) * 1100; b.ty = l.spawn.y + (Math.random() - 0.5) * 700;
        if (Math.random() < 0.3) { b.tx = p.x; b.ty = p.y; } // biraz dur
        continue;
      }
      const dir = Math.hypot(tx - p.x, ty - p.y) > 20 ? dirIndexFromVector(tx - p.x, ty - p.y) : NO_DIR;
      if (dir !== NO_DIR) { b.seq = (b.seq + 1) & 0xffff; this.world.onMove(b.sid, encodeMove(b.seq, dir)); }
      if (performance.now() > b.nextChat) { b.nextChat = performance.now() + 40000 + Math.random() * 80000; this.broadcast(JSON.stringify({ t: 'chat', ch: 'world', from: p.char.name, cls: p.char.cls, text: lines[Math.floor(Math.random() * lines.length)], chn: 1 })); }
    }
  }
}
let _backend: Backend | null = null;
const B = () => (_backend ??= new Backend());
/** Yönetim ayarı değişti: çalışan dünyada yoğunluğu değişen haritaların yuvalarını ve botları yeniden kurar. */
export function onTuningChanged(prev: { density: Record<string, number>; bots: number }) {
  const b = _backend; if (!b) return;
  for (const id of new Set([...Object.keys(prev.density), ...Object.keys(TUNING.density)])) {
    if ((prev.density[id] ?? 1) !== (TUNING.density[id] ?? 1)) b.world.reseedMonsters(id);
  }
  if (prev.bots !== TUNING.bots && b.started) b.resetBots();
}
export function createSocket(url: string): WebSocket {
  const ticket = new URL(url, location.href).searchParams.get('ticket') ?? '';
  return new FakeSocket(ticket) as unknown as WebSocket;
}

// ───────── taklit API ─────────
export async function localApi(path: string, body: any): Promise<any> {
  await new Promise((r) => setTimeout(r, 60));
  const me = () => { const a = db.accounts.find((x) => x.id === db.session); if (!a) throw new ApiErr(401, 'Oturum gerekli.'); return a; };
  switch (path) {
    case '/api/register': {
      const u = String(body?.username ?? '').trim();
      if (!/^[A-Za-z0-9_.]{3,20}$/.test(u)) throw new ApiErr(400, 'Kullanıcı adı 3–20 karakter; harf, rakam, _ ve . olabilir.');
      if (String(body?.password ?? '').length < 8) throw new ApiErr(400, 'Parola en az 8 karakter olmalı.');
      if (body.password !== body.password2) throw new ApiErr(400, 'Parolalar eşleşmiyor.');
      if (db.accounts.some((a) => a.username.toLowerCase() === u.toLowerCase())) throw new ApiErr(409, 'Bu kullanıcı adı alınmış.');
      const a = { id: db.nextAcc++, username: u, pass: await hash(body.password), starter: true };
      db.accounts.push(a); db.session = a.id; persist();
      return { ok: true };
    }
    case '/api/login': {
      const a = db.accounts.find((x) => x.username.toLowerCase() === String(body?.username ?? '').trim().toLowerCase());
      if (!a || a.pass !== await hash(String(body?.password ?? ''))) throw new ApiErr(401, 'Kullanıcı adı veya parola hatalı.');
      db.session = a.id; persist();
      return { ok: true };
    }
    case '/api/logout': db.session = null; persist(); return { ok: true };
    case '/api/password/forgot': return { ok: true, note: 'Test modunda parola sıfırlama yok; yeni hesap açabilirsin.' };
    case '/api/password/reset': throw new ApiErr(400, 'Test modunda kullanılamaz.');
    case '/api/me': {
      const a = me();
      const chars = Object.values(db.chars).filter((c) => c.accountId === a.id).map((c) => ({ id: c.id, name: c.name, cls: c.cls, level: c.level, map: c.map }));
      return { account: { id: a.id, username: a.username, role: 'player' }, characters: chars };
    }
    case '/api/characters': {
      const a = me();
      const name = String(body?.name ?? '').trim();
      const cls = body?.cls as ClassId;
      const err = validateCharacterName(name);
      if (err) throw new ApiErr(400, err);
      if (!CLASS_IDS.includes(cls)) throw new ApiErr(400, 'Geçersiz sınıf.');
      if (Object.values(db.chars).some((c) => normalizeName(c.name) === normalizeName(name)) || BOT_NAMES.some((b) => normalizeName(b) === normalizeName(name))) throw new ApiErr(409, 'Bu karakter adı alınmış.');
      if (Object.values(db.chars).filter((c) => c.accountId === a.id).length >= 4) throw new ApiErr(400, 'Hesap başına en fazla 4 karakter.');
      const l = getLayout('bazaar');
      const equip: CharState['equip'] = {};
      for (const tplId of [`w_${cls}`, `a_${cls}`]) { const t = ITEM_TEMPLATES.find((x) => x.id === tplId)!; equip[t.slot] = makeItem(tplId, 'white', 'starter', 0); }
      const materials: Record<string, number> = { red_potion: 5 };
      if (a.starter) { materials.starter_chest = 1; a.starter = false; }
      const c: CharState = {
        id: db.nextChar++, accountId: a.id, role: 'player', name, cls, level: 1, xp: 0, hp: computeStats({ cls, level: 1, stats: { str: 0, res: 0, vit: 0 }, equip: {} }).maxHp,
        map: 'bazaar', x: l.spawn.x, y: l.spawn.y, gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0,
        bag: [], equip, materials, misc: {}, saveVersion: 0,
      };
      db.chars[c.id] = c; persist();
      return { ok: true, id: c.id };
    }
    case '/api/channels': {
      me();
      const online = B().sockets.size + (B().started ? B().bots.length : TUNING.bots);
      return { open: true, reason: null, channels: [{ id: 1, name: 'Test Kanalı', population: online, capacity: 120, status: 'ok' }], realm: { name: 'Yaşam Çekirdeği (tarayıcı içi test)', online, capacity: 120 } };
    }
    case '/api/admission': {
      const a = me();
      const c = db.chars[Number(body?.characterId)];
      if (!c || c.accountId !== a.id) throw new ApiErr(404, 'Karakter bulunamadı.');
      const ticket = Math.random().toString(36).slice(2) + Date.now().toString(36);
      B().tickets.set(ticket, { accountId: a.id, charId: c.id });
      return { ok: true, ticket, nonce: body?.nonce, channel: 1 };
    }
    case '/api/status': return { opening: { mode: 'open' }, online: B().sockets.size, worldHealth: B().health, serverTime: Date.now() };
    default: throw new ApiErr(404, 'Bulunamadı');
  }
}

(window as unknown as { __colCreateSocket: typeof createSocket }).__colCreateSocket = createSocket;
