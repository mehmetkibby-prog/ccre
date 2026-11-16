import { DIR_STEPS,
  readSnapshot, encodeMove, stepMove, dirIndexFromVector, getLayout, classSkill, attackCooldown, NO_DIR, TILE, Kind, Anim, Ev, Fx as FxKind, DmgFlag, EFlag,
  MONSTERS, TUNING, CLASS_IDS, CLASSES, MAPS, LOOT_PICKUP_RANGE, RARITIES, type MapLayout, type Snapshot, type ClassId, type ClientCmd,
} from '@col/shared';
import { store, notify, pushChat, pushLoot, reqId } from './store.ts';
import { Input } from './input.ts';
import { Renderer3D } from '../g3d/renderer3d.ts';
import type { Fx3D } from '../g3d/fx3d.ts';
import { sfx } from './audio.ts';
import { OFFLINE } from '../mode.ts';

export interface Sample { t: number; x: number; y: number }
export interface CEnt {
  id: number; kind: number;
  x: number; y: number; samples: Sample[];
  /** Zincir Çekişi: canavar eski yerinden oyuncuya sürüklenerek gelir */
  slide?: { x0: number; y0: number; t0: number };
  dir: number; anim: number; animStart: number; skill?: number;
  hp: number; maxHp: number; flags: number; level: number;
  name: string; cls: number; variant: number; tpl: number; weapon: number; wplus: number; cos: number; guild: string; combo?: number;
  icon: string; rarity: number; owner: number; ttlEnd: number; label: string;
  hurtUntil: number; spawnAt: number; deadAt: number;
  /** vuruşla geri sekme: yön (birim vektör) ve bitiş anı */
  kbX?: number; kbY?: number; kbUntil?: number;
  /** görüntü yumuşatma: ara değerlenen hedef ve gösterilen konum ayrı tutulur */
  sx?: number; sy?: number;
}

/**
 * Uzak varlık ara değerleme gecikmesi: ağın dalgalanmasına göre kendini ayarlar. Sabit 110 ms'de mobil ağda
 * paketler geciktiğinde karakter bir an durup sonra sıçrıyor, yürüme-koşma-durma animasyonu gidip geliyordu.
 */
const INTERP_MIN = 100, INTERP_MAX = 280;
const seqDiff = (a: number, b: number) => ((a - b + 0x8000) & 0xffff) - 0x8000;

/** Muhafız kılıcının hedefe değdiği an (saldırı animasyonunun başından, ms). */
export const MELEE_IMPACT_MS = 170;

export class Game {
  ws: WebSocket | null = null;
  layout!: MapLayout;
  ents = new Map<number, CEnt>();
  selfId = 0;
  charId = 0;
  cls: ClassId = 'guardian';
  // kendi karakter tahmini
  px = 0; py = 0; // tahmin edilen
  dx = 0; dy = 0; // ekranda gösterilen
  // Sabit 20 Hz adımlı tahmin, ekranda iki adım arası doğrusal akar (sabit hız, titreme yok).
  // Sunucu düzeltmesi görüntüde sıçrama yapmasın diye ayrı bir ofsette tutulur ve hızla söner.
  private ppx = 0; private ppy = 0; // bir önceki adımın tahmini
  private corrX = 0; private corrY = 0;
  sdir = 64; selfAnim = Anim.IDLE; selfAnimStart = 0; selfSkill = 0; lastMoveAt = 0; selfFlags = 0;
  seq = 0;
  pending: { seq: number; dir: number }[] = [];
  serverOffset: number | null = null;
  /** paketlerin en iyi duruma göre ne kadar geç geldiği (ms, kayan ortalama) ve buna göre ara değerleme gecikmesi */
  private netJitter = 0; private interpMs = INTERP_MIN; private lastInterpAt = 0;
  input = new Input();
  fx: Fx3D;
  renderer: Renderer3D;
  targetId = 0;
  moveTarget: { x: number; y: number } | null = null;
  interactNpc: string | null = null;
  autoAttack = false;
  /** hedefe yürüyerek saldırı yalnız fareyle canavara tıklayınca; saldırı tuşu (1 / boşluk / mobil düğme) olduğu yerde vurur */
  walkToTarget = false;
  private autoPauseUntil = 0;
  private avoidSide = 1; private avoidUntil = 0; private stuckBest = 1e9; private stuckAt = 0;
  /** Yakındaki başka oyuncunun sesi: uzaklıkla kısılır (~11 m'de susar). */
  private nearK(p: { x: number; y: number }) { const d = Math.hypot(p.x - this.dx, p.y - this.dy); return Math.pow(Math.max(0, 1 - d / 700), 1.5) * 0.6; }
  setAuto(on: boolean) { this.send({ t: 'auto', on }); }
  /** hedefimiz son öldüğünde (yeni hedefe yürüme beklemesi için) */
  private lastKillAt = 0;
  /** Saldırı basılıyken hedef öldü: yeni hedefe geçmek için tuş bırakılıp yeniden basılmalı (makro/ağırlıkla bot gibi kasılmayı önler). */
  attackNeedsRelease = false;
  private farHintAt = 0;
  /** Yakın dövüş saldırısı başlayanlar: vuruş anını eşlemek ve kombo sırası için */
  meleeCast = new Map<number, { at: number; combo: number }>();
  selfCombo = 0;
  lastAttackSent = 0;
  inputAcc = 0;
  lastFrame = 0;
  raf = 0;
  frames = 0; fpsAt = 0;
  stopped = false;
  hoverId = 0;
  pingSent = 0; pingPerf = 0; pingSamples: number[] = [];
  camYaw = 0;

  constructor(public canvas: HTMLCanvasElement, overlay: HTMLCanvasElement, private ticket: string, private onClose: (reason: string) => void) {
    if (OFFLINE) Object.assign(window, { __colGame: this, __colStore: store }); // yalnız tarayıcı test sürümünde: uçtan uca testler için
    this.renderer = new Renderer3D(this, canvas, overlay);
    this.fx = this.renderer.fx;
    this.setMap('bazaar', 0, 0);
  }

  // ───────── bağlantı ─────────
  start() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/ws?ticket=${encodeURIComponent(this.ticket)}`;
    const ws: WebSocket = OFFLINE ? (window as unknown as { __colCreateSocket: (u: string) => WebSocket }).__colCreateSocket(url) : new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    let closedReason = '';
    ws.onopen = () => { store.set({ connected: true, status: '' }); setTimeout(() => this.sendPing(), 1500); };
    ws.onmessage = (e) => {
      // gecikme: yanıtın geldiği an (olayın zaman damgası; o sırada çizim sürüyorsa beklenen süre ölçüme katılmaz)
      if (typeof e.data === 'string' && e.data.startsWith('{"t":"pong"')) { this.onPong(JSON.parse(e.data), e.timeStamp); return; }
      if (typeof e.data === 'string') this.onJson(JSON.parse(e.data), (r) => (closedReason = r));
      else this.onSnapshot(e.data as ArrayBuffer);
    };
    ws.onclose = () => { store.set({ connected: false }); if (!this.stopped) this.onClose(closedReason || 'Bağlantı koptu.'); this.stop(); };
    this.input.attach();
    this.input.onKey = (code, down, e) => this.onKey(code, down, e);
    this.lastFrame = performance.now();
    // kare sınırı (ayarlar): 120 Hz ekranlı telefon sınırsızken saniyede 120 kare çizip ısınıyordu
    // Kare sınırı biriken süreyle çalışır: 120 Hz'de her ikinci, 90 Hz ya da uyarlanabilir (Samsung 1–120 Hz)
    // ekranlarda üç karenin ikisi çizilir → tam 60. Önceki "son çizimden bu yana" ölçüsü 90 Hz'de 45 karede kalıyordu.
    let acc = 0, prevT = 0;
    const TOUCH = matchMedia('(pointer: coarse)').matches; // Isınma modu yalnız telefon/tablette
    const loop = (t: number) => {
      if (this.stopped) return;
      this.raf = requestAnimationFrame(loop);
      const st = store.get().settings;
      // Isınma modu: akıcılık korunur (60 kare; 120 Hz ekranda 120'ye çıkmaz); ısıyı çizim ayrıntısı azaltır
      const cap = st.cool && TOUCH ? 60 : st.fpsCap;
      const step = prevT ? Math.min(100, t - prevT) : 16.7; prevT = t;
      if (cap > 0) {
        const ft = 1000 / cap;
        acc = Math.min(acc + step, ft * 2);
        if (acc < ft - 2) return;
        acc -= ft; if (acc < 0) acc = 0;
      }
      this.frame(t);
    };
    this.raf = requestAnimationFrame(loop);
    setInterval(() => this.sendPing(), 2500);
  }
  private sendPing() { if (this.ws?.readyState === 1) { this.pingSent = Date.now(); this.pingPerf = performance.now(); this.send({ t: 'ping', c: this.pingSent }); } }
  /** Gösterilen ms: son 5 ölçümün ortancası (mobil ağdaki tek tük sıçramalar sayıyı oynatmasın). */
  private onPong(m: { c: number; s?: number }, ts: number) {
    if (m.c !== this.pingSent) return;
    const at = ts > 0 && ts >= this.pingPerf ? ts : performance.now();
    const rtt = Math.max(1, Math.round(at - this.pingPerf));
    this.pingSamples.push(rtt); if (this.pingSamples.length > 5) this.pingSamples.shift();
    const med = [...this.pingSamples].sort((a, b) => a - b)[this.pingSamples.length >> 1];
    store.set({ ping: med, clockSkew: typeof m.s === 'number' ? m.s - (this.pingSent + rtt / 2) : store.get().clockSkew });
  }
  stop() {
    sfx.setMusic(null);
    if (this.stopped) return;
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    this.input.detach();
    try { this.ws?.close(); } catch { /* */ }
  }
  send(c: ClientCmd) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(c)); }

  setMap(id: string, x: number, y: number) {
    this.layout = getLayout(id);
    this.ents.clear();
    this.px = this.dx = this.ppx = x || this.layout.spawn.x; this.py = this.dy = this.ppy = y || this.layout.spawn.y; this.corrX = this.corrY = 0;
    this.pending = [];
    this.targetId = 0; this.moveTarget = null; this.autoAttack = false;
    this.renderer.setLayout(this.layout);
    store.set({ map: id, target: null });
    sfx.setZone(MAPS[id]?.theme ?? 'village');
    sfx.setMusic(id);
  }

  private onJson(m: any, setReason: (r: string) => void) {
    switch (m.t) {
      case 'welcome':
        if (OFFLINE) Object.assign(window, { __colGame: this });
        this.selfId = m.entityId;
        this.setMap(m.map, m.x, m.y);
        store.set({ entityId: m.entityId, channel: m.channel, worldHealth: m.worldHealth, online: m.online });
        this.fx.shapes.push({ kind: 'teleport', x: m.x, y: m.y, r: 0, r2: 0, a: 0, t0: performance.now(), dur: 900, color: '' });
        break;
      case 'char': this.charId = m.id; this.cls = m.cls; store.set({ char: { id: m.id, name: m.name, cls: m.cls, role: m.role } }); break;
      case 'self': store.set((s) => ({ self: { ...(s.self ?? ({} as any)), ...strip(m) } })); break;
      case 'map': {
        store.set({ stalls: [], stallView: null, panel: store.get().panel === 'market' ? null : store.get().panel });
        const same = m.map === this.layout.def.id;
        if (same) { this.px = this.dx = this.ppx = m.x; this.py = this.dy = this.ppy = m.y; this.corrX = this.corrY = 0; this.pending = []; }
        else { this.setMap(m.map, m.x, m.y); notify(MAPS[m.map]?.name ?? m.map, 'zone'); }
        this.fx.shapes.push({ kind: 'teleport', x: m.x, y: m.y, r: 0, r2: 0, a: 0, t0: performance.now(), dur: 900, color: '' });
        sfx.play('teleport');
        store.set({ panel: null, npc: null, confirmTravel: null });
        break;
      }
      case 'world': store.set({ worldHealth: m.health, online: m.online }); break;
      case 'tuning': import('../admin/config.ts').then((c) => c.applyRemoteTuning(m.tuning)); break;
      case 'notice': notify(m.text, m.kind); if (m.kind === 'error') sfx.play('error'); break;
      // ───────── pazar tezgâhları ─────────
      case 'stalls': store.set({ stalls: Array.isArray(m.list) ? m.list : [] }); break;
      case 'stall': store.set((st) => (st.panel === 'market' && (!st.stallView || st.stallView.stall === m.stall) ? { stallView: m } : {})); break;
      case 'mystall': store.set({ myStall: m.stall ?? null }); break;
      case 'stall_away': store.set((st) => ({ stallLog: [...(m.sales ?? []).map((x: { buyer: string; name: string; price: number }) => `${x.buyer} · ${x.name} · ${Number(x.price).toLocaleString('tr-TR')} Mücevher (sen yokken)`), ...st.stallLog].slice(0, 20) })); sfx.play('drop'); break;
      case 'stall_sold': store.set((st) => ({ stallLog: [`${m.buyer} · ${m.name} · ${Number(m.price).toLocaleString('tr-TR')} Mücevher`, ...st.stallLog].slice(0, 20) })); sfx.play('drop'); break;
      case 'result': if (m.msg) notify(m.msg, m.ok ? 'ok' : 'error'); break;
      case 'chat':
        if (m.ch === 'pm') { pushChat({ ch: 'pm', from: m.self ? `→ ${m.to}` : m.from, text: m.text, cls: m.cls }); if (!m.self) { sfx.play('ui'); store.set({ whisperTo: store.get().whisperTo ?? m.from }); } }
        else pushChat({ ch: m.ch, from: m.from, text: m.text, cls: m.cls, gm: m.gm, item: m.item });
        break;
      // ───────── oyuncular arası: davet, grup, ticaret, düello, arkadaşlık ─────────
      case 'invite': store.set((s) => ({ invites: [...s.invites.filter((i) => !(i.from === m.from && i.kind === m.kind)), { kind: m.kind, from: m.from, name: m.name, cls: m.cls, level: m.level, at: Date.now() }].slice(-5) })); sfx.play('ui'); break;
      case 'party': store.set({ party: { members: Array.isArray(m.members) ? m.members : [], leader: m.leader | 0 } }); break;
      case 'trade': if (m.op === 'close') store.set({ trade: null }); else if (m.op === 'state') store.set({ trade: { with: m.with, me: m.me, them: m.them } }); break;
      case 'friends': store.set({ friends: Array.isArray(m.list) ? m.list : [] }); break;
      case 'arena': store.set({ arena: { active: !!m.active, endsAt: Number(m.endsAt) || 0, board: Array.isArray(m.board) ? m.board : [], at: Date.now() } }); break;
      case 'duel': if (m.op === 'start') { notify(`Düello: ${m.name}! ${Math.round((m.in ?? 3000) / 1000)} sn sonra başlıyor.`, 'zone'); sfx.play('skill'); } else { sfx.play(m.win ? 'levelup' : 'error'); } break;
      case 'bosses': store.set({ bosses: Array.isArray(m.list) ? m.list : [] }); break;
      case 'boss': {
        store.set({ bossBanner: { id: m.id, name: m.name, map: m.map, x: m.x, y: m.y, ev: m.ev, killer: m.killer, at: Date.now() } });
        if (m.ev === 'spawn') { sfx.play('levelup'); pushChat({ ch: 'sys', from: 'Duyuru', text: `${m.name} doğdu! (${MAPS[m.map]?.name ?? m.map})`, system: true }); }
        else pushChat({ ch: 'sys', from: 'Duyuru', text: `${m.name}, ${m.killer} ve arkadaşları tarafından yenildi.`, system: true });
        break;
      }
      case 'fish_wait': store.set({ fishing: { phase: 'wait', token: m.token, biteAt: performance.now() + m.biteIn, diff: m.diff, motion: m.motion }, fishResult: null }); break;
      case 'fish_result': store.set({ fishing: null, fishResult: { ok: m.ok, name: m.name, qty: m.qty, at: Date.now() } }); if (m.ok) sfx.play('loot'); break;
      case 'market_results': store.set({ marketResults: { q: m.q, list: Array.isArray(m.list) ? m.list : [] }, panel: 'tradeglass' }); break;
      case 'gain': {
        if (m.gems) this.fx.text(m.x, m.y, 1.6, `+${m.gems} Mücevher`, '#5ef0a8', 14, 1200);
        if (m.essence) this.fx.text(m.x + 18, m.y, 1.2, `+${m.essence} Öz`, '#8ff4ff', 13, 1200);
        break;
      }
      case 'loot': pushLoot(m.name, m.rarity); sfx.play('loot'); break;
      case 'dead': store.set({ dead: { killer: m.killer, lost: m.lost, at: Date.now(), respawnIn: m.respawnIn, town: m.town } }); this.autoAttack = false; sfx.play('death'); break;
      case 'respawned': store.set({ dead: null }); break;
      case 'state': if (!m.dead) store.set({ dead: null }); break;
      case 'cd': store.set((s) => ({ cooldowns: { ...s.cooldowns, [m.s]: performance.now() + m.until } })); break;
      case 'npc': store.set({ npc: { id: m.id, name: m.name, title: m.title, actions: m.actions }, panel: 'npc' }); sfx.play('ui'); break;
      case 'confirmTravel': store.set({ confirmTravel: { map: m.map, text: m.text } }); break;
      case 'chestResult': store.set({ modal: { title: m.title, lines: m.rewards } }); sfx.play('levelup'); break;
      case 'auto': store.set((st) => ({ self: st.self ? { ...st.self, autoOn: !!m.on, autoLeft: Number(m.left) || 0 } : st.self, autoSync: Date.now() })); if (!m.on) { this.autoAttack = false; this.walkToTarget = false; } break;
      case 'transformResult': store.set({ transformResult: { ok: m.ok, item: m.item, at: Date.now() } }); sfx.play(m.ok ? 'levelup' : 'error'); break;
      case 'upgradeResult': store.set({ upgradeResult: { ok: m.ok, before: m.before, after: m.after, chance: m.chance } }); sfx.play(m.ok ? 'levelup' : 'error'); break;
      case 'shop': break;
      case 'kicked': setReason(m.text); break;
      case 'fatal': setReason(m.text); break;
    }
  }

  // ───────── snapshot ─────────
  private onSnapshot(buf: ArrayBuffer) {
    const reset = new Uint8Array(buf, 0, 1)[0] === 2;
    const s: Snapshot = readSnapshot(buf);
    const now = performance.now();
    this.noteServerTime(s.t, now);
    if (reset) this.ents.clear();
    // kendi durumum + uzlaştırma
    this.reconcile(s);
    const wasDead = (this.selfFlags & EFlag.DEAD) !== 0;
    this.selfFlags = s.sflags;
    const st = store.get();
    if (st.hp !== s.shp || st.maxHp !== s.smaxHp) store.set({ hp: s.shp, maxHp: s.smaxHp });
    if (wasDead && !(s.sflags & EFlag.DEAD) && st.dead) store.set({ dead: null });
    for (const sp of s.spawns) {
      const e: CEnt = {
        id: sp.id, kind: sp.kind, x: sp.x, y: sp.y, samples: [{ t: s.t, x: sp.x, y: sp.y }], dir: 'dir' in sp ? sp.dir : 0, anim: 'anim' in sp ? sp.anim : 0, animStart: now,
        hp: 'hp' in sp ? sp.hp : 0, maxHp: 'maxHp' in sp ? sp.maxHp : 0, flags: 'flags' in sp ? sp.flags : 0, level: 'level' in sp ? sp.level : 0,
        name: sp.kind === Kind.PLAYER ? sp.name : sp.kind === Kind.MONSTER ? MONSTERS[sp.tpl]?.name ?? '?' : '', cls: sp.kind === Kind.PLAYER ? sp.cls : 0,
        variant: sp.kind === Kind.MONSTER ? sp.variant : 0, tpl: sp.kind === Kind.MONSTER ? sp.tpl : 0, weapon: sp.kind === Kind.PLAYER ? sp.weapon : 0, wplus: sp.kind === Kind.PLAYER ? sp.wplus : 0, cos: sp.kind === Kind.PLAYER ? sp.cos : 0, guild: sp.kind === Kind.PLAYER ? sp.guild : '',
        icon: sp.kind === Kind.LOOT ? sp.icon : '', rarity: sp.kind === Kind.LOOT ? sp.rarity : 0, owner: sp.kind === Kind.LOOT ? sp.owner : 0,
        ttlEnd: sp.kind === Kind.LOOT ? now + sp.ttl : 0, label: sp.kind === Kind.LOOT ? sp.label : '', hurtUntil: 0, spawnAt: now, deadAt: 0,
      };
      if (sp.kind === Kind.LOOT) { this.fx.burst(sp.x, sp.y, 0.4, 10, RAR_COLORS[sp.rarity], 2.2, 600, 0.18); if (sp.owner === this.charId && sp.rarity >= 2) sfx.play('drop'); }
      this.ents.set(sp.id, e);
    }
    for (const u of s.updates) {
      const e = this.ents.get(u.id);
      if (!e) continue;
      if (u.x !== undefined) { e.samples.push({ t: s.t, x: u.x, y: u.y! }); if (e.samples.length > 8) e.samples.shift(); }
      if (u.hp !== undefined) e.hp = u.hp;
      if (u.maxHp !== undefined) e.maxHp = u.maxHp;
      if (u.flags !== undefined) e.flags = u.flags;
      if (u.level !== undefined) e.level = u.level;
      if (u.dir !== undefined) {
        e.dir = u.dir;
        if (u.anim !== e.anim || (u.anim === Anim.ATTACK && now - e.animStart > 300)) { e.anim = u.anim!; e.animStart = now; }
      }
    }
    for (const id of s.removes) { this.ents.delete(id); if (id === this.targetId) this.setTarget(0); }
    for (const ev of s.events) this.onEvent(ev, now);
    // hedef bilgisini güncelle
    if (this.targetId) {
      const t = this.ents.get(this.targetId);
      const st2 = store.get().target;
      if (t && st2 && (st2.hp !== t.hp || st2.maxHp !== t.maxHp)) store.set({ target: { ...st2, hp: t.hp, maxHp: t.maxHp, level: t.level } });
    }
  }

  private reconcile(s: Snapshot) {
    this.pending = this.pending.filter((p) => seqDiff(p.seq, s.ack) > 0);
    const pos = { x: s.sx, y: s.sy };
    const speed = this.speed();
    for (const p of this.pending) stepMove(this.layout, pos, p.dir, speed);
    const ex = pos.x - this.px, ey = pos.y - this.py;
    if (ex === 0 && ey === 0) return;
    this.px = pos.x; this.py = pos.y;
    // ışınlanma / büyük sapma: anında; küçük sapma: görüntü yerinde kalır, fark birkaç karede erir
    if (Math.hypot(ex, ey) > 220) { this.ppx = this.px; this.ppy = this.py; this.dx = this.px; this.dy = this.py; this.corrX = this.corrY = 0; return; }
    this.ppx += ex; this.ppy += ey;
    this.corrX -= ex; this.corrY -= ey;
  }

  speed() { return store.get().self?.combat?.speed ?? CLASSES[this.cls].speed; }

  private onEvent(ev: Snapshot['events'][number], now: number) {
    const st = store.get().settings;
    switch (ev.e) {
      case Ev.DAMAGE: {
        // yakın dövüş: hasar ve vuruş efekti kılıcın değdiği ana kaydırılır (sunucu hasarı vuruş başında uygular)
        const mc = this.meleeCast.get(ev.src);
        if (mc && now - mc.at < 80 && !(ev as { _late?: boolean })._late) {
          const wait = Math.max(0, mc.at + MELEE_IMPACT_MS - now);
          window.setTimeout(() => this.onEvent({ ...ev, _late: true } as typeof ev, performance.now()), wait);
          break;
        }
        const t = ev.tgt === this.selfId ? null : this.ents.get(ev.tgt);
        const pos = ev.tgt === this.selfId ? { x: this.dx, y: this.dy } : t ? this.entPos(t) : null;
        if (!pos) break;
        if (t) t.hurtUntil = now + 140;
        const mine = ev.src === this.selfId, onMe = ev.tgt === this.selfId;
        if ((ev as { _late?: boolean })._late && t) {
          // ağır vuruş hissi: hedef vuruş yönünde geri seker, iki taraf bir an donar, kamera sarsılır, kıvılcım yıldızı
          const sp = mine ? { x: this.dx, y: this.dy } : (() => { const s2 = this.ents.get(ev.src); return s2 ? this.entPos(s2) : null; })();
          if (sp) { const a = Math.atan2(pos.y - sp.y, pos.x - sp.x); t.kbX = Math.cos(a); t.kbY = Math.sin(a); t.kbUntil = now + 200; }
          if (mine) {
            const crit = (ev.flags & DmgFlag.CRIT) !== 0;
            // yalnız vurulan kısa süre durur (kendi karakterin donmaz: takılma gibi hissettiriyordu)
            this.renderer.hitStop([ev.tgt], crit ? 90 : 55);
            this.renderer.shake(crit ? 4.5 : 2.4);
            this.fx.shapes.push({ kind: 'blast', x: pos.x, y: pos.y, r: crit ? 70 : 46, r2: 0, a: 0, t0: now, dur: 200, color: crit ? '#ffd84a' : '#fff4d8' });
            this.fx.light(pos.x, pos.y, 1.1, '#ffe2b0', crit ? 4 : 2.5, 160);
          }
        }
        if (!st.showDamage && !mine && !onMe) break;
        if (ev.flags & DmgFlag.BLOCK) { this.fx.text(pos.x, pos.y, 2.0, 'Blok', '#cfe3ff', 15); break; }
        const crit = (ev.flags & DmgFlag.CRIT) !== 0;
        const color = onMe ? '#ff5a5a' : crit ? '#ffcf3d' : mine ? '#ffffff' : '#d8d8d8';
        this.fx.text(pos.x, pos.y, 2.0, crit ? `${ev.amount}!` : String(ev.amount), color, crit ? 28 : onMe ? 19 : 18, crit ? 1100 : 850);
        if (mine || onMe) { this.fx.burst(pos.x, pos.y, 1.1, crit ? 16 : 7, onMe ? '#ff5040' : crit ? '#ffd84a' : '#ffe8c0', crit ? 4.5 : 3, 420, 0.16); sfx.play(crit ? 'crit' : 'hit'); }
        if (onMe) this.renderer.shake(crit ? 6 : 3);
        break;
      }
      case Ev.HEAL: {
        const pos = ev.tgt === this.selfId ? { x: this.dx, y: this.dy } : (() => { const t = this.ents.get(ev.tgt); return t ? this.entPos(t) : null; })();
        if (pos) { this.fx.text(pos.x, pos.y, 2.1, `+${ev.amount}`, '#6dff9a', 18); this.fx.burst(pos.x, pos.y, 0.6, 14, '#8dffb0', 1.2, 900, 0.2, 1.5); }
        if (ev.tgt === this.selfId) sfx.play('heal');
        break;
      }
      case Ev.CAST: {
        const isSelf = ev.src === this.selfId;
        const src = isSelf ? null : this.ents.get(ev.src);
        const sp = isSelf ? { x: this.dx, y: this.dy } : src ? this.entPos(src) : null;
        if (!sp) break;
        // 4 = uzmanlık becerisinin ikinci yolu (ör. Hüküm Darbesi, Kök Oku, Yaşam Dalgası)
        const variant = ev.skill === 4 ? 1 : 0, skill = ev.skill === 4 ? 3 : ev.skill;
        if (isSelf) { this.selfAnim = skill === 0 ? Anim.ATTACK : Anim.CAST; this.selfAnimStart = now; this.selfSkill = skill; this.sdir = Math.round(Math.atan2(ev.y - this.dy, ev.x - this.dx) / (Math.PI * 2) * 256) & 255; }
        else if (src) { src.anim = skill === 0 ? Anim.ATTACK : Anim.CAST; src.animStart = now; src.skill = skill; }
        const clsIdx = isSelf ? CLASS_IDS.indexOf(this.cls) : src?.kind === Kind.PLAYER ? src.cls : -1;
        if (skill === 9) { this.fx.projs.push({ x0: sp.x, y0: sp.y, tx: ev.x, ty: ev.y, tgt: ev.tgt, t0: now, dur: 420, kind: 'ice', color: '#8fe6ff' }); break; }
        const near = isSelf || ev.tgt === this.selfId || Math.hypot(sp.x - this.dx, sp.y - this.dy) < 1500;
        if (clsIdx === 1 && skill === 0) { if (near) this.fx.sk.basic(1, ev.src, ev.tgt, { x: sp.x, y: sp.y }, { x: ev.x, y: ev.y }, isSelf); sfx.play('bow', isSelf ? 1 : this.nearK(sp)); }
        else if (clsIdx === 2 && skill === 0) { if (near) this.fx.sk.basic(2, ev.src, ev.tgt, { x: sp.x, y: sp.y }, { x: ev.x, y: ev.y }, isSelf); if (isSelf) this.fx.light(sp.x, sp.y, 1.6, '#7cf3ff', 3, 300); sfx.play('magic', isSelf ? 1 : this.nearK(sp)); }
        else if (clsIdx === 0 && skill === 0) {
          // Muhafız kombosu: 1) sağdan sola yatay, 2) ters yükselen, 3) tepeden iniş; kesik izi vuruş anında
          const prev = this.meleeCast.get(ev.src);
          const combo = prev && now - prev.at < 1500 ? (prev.combo + 1) % 3 : 0;
          this.meleeCast.set(ev.src, { at: now, combo });
          if (isSelf) this.selfCombo = combo;
          else if (src) src.combo = combo;
          const a = Math.atan2(ev.y - sp.y, ev.x - sp.x);
          sfx.play('swing', isSelf ? 1 : this.nearK(sp));
          window.setTimeout(() => {
            const t2 = performance.now();
            this.fx.shapes.push({ kind: 'slash', x: sp.x, y: sp.y, r: combo === 2 ? 64 : 74, r2: combo, a: a + (combo === 1 ? 0.35 : combo === 0 ? -0.35 : 0), t0: t2, dur: 260, color: combo === 2 ? '#ffe2a0' : '#ffffff' });
            if (combo === 2) this.fx.burst(ev.x, ev.y, 0.1, 14, '#d9c7a1', 2, 500, 0.2, 1);
          }, MELEE_IMPACT_MS - 40);
        }
        if (clsIdx === 0 && skill === 1 && ev.tgt) { const te = this.ents.get(ev.tgt); if (te && te.kind === Kind.MONSTER && !MONSTERS[te.tpl]?.boss) te.slide = { x0: te.x, y0: te.y, t0: now + 120 }; }
        // ekran dışındaki uzak oyuncuların becerileri çizilmez (kalabalıkta gereksiz yük olmasın)
        if (skill > 0 && skill < 9 && clsIdx >= 0 && (isSelf || ev.tgt === this.selfId || Math.hypot(sp.x - this.dx, sp.y - this.dy) < 1500)) {
          this.fx.sk.play({
            cls: clsIdx, skill, variant, src: ev.src, tgt: ev.tgt, sp: { x: sp.x, y: sp.y }, tp: { x: ev.x, y: ev.y }, self: isSelf || ev.tgt === this.selfId,
            near: isSelf ? 1 : this.nearK(sp), now,
            shake: (n) => this.renderer.shake(n), hitStop: (ids, ms) => this.renderer.hitStop(ids, ms), sound: (name, k) => sfx.play(name, k),
          });
        }
        break;
      }
      case Ev.DEATH: {
        const e = this.ents.get(ev.id);
        if (e) { e.deadAt = now; const p = this.entPos(e); this.fx.burst(p.x, p.y, 0.8, 26, e.kind === Kind.MONSTER ? '#9ffff0' : '#ff8a8a', 3, 900, 0.22, -1); if (ev.killer === this.selfId) sfx.play('kill'); }
        if (ev.id === this.targetId) { this.autoAttack = false; this.walkToTarget = false; this.lastKillAt = performance.now(); if (this.input.attackHeld) this.attackNeedsRelease = true; this.setTarget(0); }
        break;
      }
      case Ev.FX: {
        const sh = { x: ev.x, y: ev.y, r: ev.r, r2: 0, a: 0, t0: now, dur: ev.ms, color: '#ff4d5a' };
        if (ev.fx === FxKind.TELEGRAPH_CIRCLE) this.fx.shapes.push({ kind: 'circle', ...sh });
        else if (ev.fx === FxKind.TELEGRAPH_RING) this.fx.shapes.push({ kind: 'ring', ...sh, r2: ev.a });
        else if (ev.fx === FxKind.TELEGRAPH_LINE) this.fx.shapes.push({ kind: 'line', ...sh, a: ev.a / 1000, r2: 70 });
        else if (ev.fx === FxKind.AOE_BLAST) {
          // görseli beceri olayı (Ev.CAST) çiziyor: sınıfa özgü koreografi
        } else if (ev.fx === FxKind.HEAL_WAVE) { /* Yaşam Dalgası görseli beceri olayında */ }
        else if (ev.fx === FxKind.SHIELD) {
          const fid = ev.a === (this.selfId & 0xffff) ? this.selfId : [...this.ents.keys()].find((id) => (id & 0xffff) === ev.a) ?? 0;
          this.fx.sk.dome(fid, { x: ev.x, y: ev.y }, ev.ms, '#ffcf5a');
        }
        else if (ev.fx === FxKind.TELEPORT) { this.fx.shapes.push({ kind: 'teleport', ...sh, color: ev.a === 1 ? 'emerald' : '' }); if (ev.a === 1) { this.fx.burst(ev.x, ev.y, 0.5, 40, '#3ef09a', 3, 900, 0.2, 1); this.fx.light(ev.x, ev.y, 1.4, '#3ef09a', 5, 700); } }
        else if (ev.fx === FxKind.PICKUP) this.fx.burst(ev.x, ev.y, 0.4, 12, '#fff6c2', 2, 500, 0.15, 2);
        break;
      }
      case Ev.LEVELUP: {
        const isSelf = ev.id === this.selfId;
        const e = isSelf ? null : this.ents.get(ev.id);
        const p = isSelf ? { x: this.dx, y: this.dy } : e ? this.entPos(e) : null;
        if (!p) break;
        this.fx.shapes.push({ kind: 'pillar', x: p.x, y: p.y, r: 34, r2: 0, a: 0, t0: now, dur: 1400, color: 'rgba(255,220,100,0.9)' });
        this.fx.burst(p.x, p.y, 1.0, 60, '#ffe680', 4, 1300, 0.24, 1); this.fx.light(p.x, p.y, 2, '#ffd860', 8, 1200);
        if (isSelf) { this.fx.text(p.x, p.y, 2.8, `Seviye ${ev.level}!`, '#ffe680', 30, 2000); sfx.play('levelup'); notify(`Tebrikler! Seviye ${ev.level} oldun.`, 'ok'); }
        break;
      }
    }
  }

  // ───────── çerçeve ─────────
  entPos(e: CEnt): { x: number; y: number } { return { x: e.x, y: e.y }; }

  /**
   * Uzak varlıklar: sunucu zamanında (şimdi − tampon) iki örnek arasında ara değerlenir. Tampon boşalırsa (paket
   * gecikti) son hızla en çok 150 ms ileri tahmin edilir; böylece karakter durup sıçramaz. Gösterilen konum hedefi
   * kısa bir süreyle (≈45 ms) yumuşakça izler: geç gelen paketle oluşan küçük geri-ileri düzeltmeler görünmez.
   */
  /** Sunucu saat farkı ve ağ dalgalanması: geç gelen paket tamponu hemen büyütür, sakin ağda yavaşça küçülür. */
  noteServerTime(st: number, now: number) {
    const off = st - now;
    if (this.serverOffset === null || off > this.serverOffset) this.serverOffset = off;
    else this.serverOffset += (off - this.serverOffset) * 0.02;
    const late = Math.max(0, this.serverOffset - off);
    this.netJitter += (late - this.netJitter) * (late > this.netJitter ? 0.25 : 0.03);
    const want = Math.min(INTERP_MAX, Math.max(INTERP_MIN, 75 + this.netJitter * 2.2));
    this.interpMs += (want - this.interpMs) * (want > this.interpMs ? 0.3 : 0.02);
  }

  interpolate(now: number) {
    const rt = (this.serverOffset ?? 0) + now - this.interpMs;
    const dt = this.lastInterpAt ? Math.min(100, now - this.lastInterpAt) : 16;
    this.lastInterpAt = now;
    const follow = 1 - Math.exp(-dt / 45);
    for (const e of this.ents.values()) {
      const s = e.samples;
      let tx: number, ty: number, snap = false;
      if (s.length === 1 || e.kind === Kind.LOOT) { tx = s[s.length - 1].x; ty = s[s.length - 1].y; snap = e.sx === undefined || e.kind === Kind.LOOT; }
      else {
        let i = s.length - 1;
        while (i > 0 && s[i - 1].t > rt) i--;
        if (i === 0) { tx = s[0].x; ty = s[0].y; }
        else {
          const a = s[i - 1], b = s[i];
          const jump = Math.hypot(b.x - a.x, b.y - a.y) > 300;
          if (jump) { tx = b.x; ty = b.y; snap = rt >= a.t; }
          else if (rt >= b.t) {
            // tampon boş: son hızla kısa ileri tahmin (en çok 150 ms), sonra bekle
            const over = Math.min(150, rt - b.t), span = Math.max(1, b.t - a.t);
            const moving = b.t - a.t < 400 && (b.x !== a.x || b.y !== a.y);
            tx = b.x + (moving ? (b.x - a.x) / span * over : 0); ty = b.y + (moving ? (b.y - a.y) / span * over : 0);
          } else {
            const k = (rt - a.t) / Math.max(1, b.t - a.t);
            tx = a.x + (b.x - a.x) * k; ty = a.y + (b.y - a.y) * k;
          }
        }
        while (s.length > 2 && s[1].t < rt - 300) s.shift();
      }
      if (snap || e.sx === undefined || e.sy === undefined || Math.hypot(tx - e.sx, ty - e.sy) > 300) { e.sx = tx; e.sy = ty; }
      else { e.sx += (tx - e.sx) * follow; e.sy += (ty - e.sy) * follow; }
      e.x = e.sx; e.y = e.sy;
      if (e.slide) {
        // zincir: önce kısa gerilme, sonra hızla oyuncuya sürüklenme
        const k = (now - e.slide.t0) / 380;
        if (k >= 1) e.slide = undefined;
        else { const q = k <= 0 ? 0 : 1 - (1 - k) * (1 - k); e.x = e.slide.x0 + (e.x - e.slide.x0) * q; e.y = e.slide.y0 + (e.y - e.slide.y0) * q; }
      }
    }
  }

  private frame(t: number) {
    const dt = Math.min(100, t - this.lastFrame);
    this.lastFrame = t;
    this.inputAcc += dt;
    let n = 0;
    while (this.inputAcc >= 50 && n < 4) {
      this.ppx = this.px; this.ppy = this.py;
      this.inputTick();
      this.inputAcc -= 50; n++;
    }
    if (this.inputAcc > 200) this.inputAcc = 0;
    // görüntü: son iki tahmin adımı arasında sabit hızla akar + sönen düzeltme ofseti
    const a = Math.min(1, Math.max(0, this.inputAcc / 50));
    const decay = Math.pow(0.002, dt / 1000); // ~0,15 sn'de erir
    this.corrX *= decay; this.corrY *= decay;
    if (Math.abs(this.corrX) < 0.05) this.corrX = 0;
    if (Math.abs(this.corrY) < 0.05) this.corrY = 0;
    this.dx = this.ppx + (this.px - this.ppx) * a + this.corrX;
    this.dy = this.ppy + (this.py - this.ppy) * a + this.corrY;
    this.interpolate(t);
    this.renderer.draw(t, dt);
    this.frames++;
    if (t - this.fpsAt > 1000) { store.set({ fps: Math.round(this.frames * 1000 / (t - this.fpsAt)) }); this.frames = 0; this.fpsAt = t; }
  }

  private selfRange() { return classSkill(this.cls, 0)!.range; }

  private inputTick() {
    const st = store.get();
    const dead = (this.selfFlags & EFlag.DEAD) !== 0;
    if (dead || !this.ws || this.ws.readyState !== 1) return;
    const mv0 = this.input.moveVector();
    // ekran yönü → dünya yönü (kamera döndürülmüş olabilir)
    const cy = Math.cos(this.camYaw), sy = Math.sin(this.camYaw);
    const mv = { x: mv0.x * cy + mv0.y * sy, y: -mv0.x * sy + mv0.y * cy };
    let dir = NO_DIR;
    if (!mv.x && !mv.y) this.lastJoyDir = NO_DIR;
    if (mv.x || mv.y) { dir = this.steadyDir(mv.x, mv.y); this.moveTarget = null; this.interactNpc = null; if (!this.input.attackHeld) this.autoAttack = false; }
    // OTO ATAK (Nesne Market yanındaki düğme, günlük süre sınırlı): ölen hedeften sonra yakındaki canavara yürüyüp vurur.
    // Elle yürüyünce 1,5 sn bırakır (oyuncu yönlendirebilsin).
    if (mv.x || mv.y) this.autoPauseUntil = performance.now() + 1500;
    if (st.self?.autoOn && performance.now() > this.autoPauseUntil) {
      const cur = this.targetId ? this.ents.get(this.targetId) : undefined;
      if (!cur || cur.hp <= 0 || cur.deadAt || cur.kind !== Kind.MONSTER) {
        const nt = this.nearestEnemy(700);
        if (nt) { this.setTarget(nt.id); this.autoAttack = true; this.walkToTarget = true; this.moveTarget = null; }
      } else { this.autoAttack = true; this.walkToTarget = true; }
    }
    // saldırı: basılı tutma veya otomatik hedef
    const wantAttack = (this.input.attackHeld && !this.attackNeedsRelease) || this.autoAttack;
    if (wantAttack) {
      // yürürken de vurulur: hedef menzildeyse saldırı gider, bacaklar yürümeye devam eder.
      // Elle yürümüyorsan ve hedef menzil dışındaysa (ör. Muhafız uzakta) önce hedefe yürünür.
      const manual = dir !== NO_DIR;
      let t = this.targetId ? this.ents.get(this.targetId) : undefined;
      if (t && (t.hp <= 0 || t.deadAt)) {
        // hedef öldü: basılı tutulan saldırı kendiliğinden sıradaki canavara geçmez
        t = undefined; this.autoAttack = false;
        if (this.input.attackHeld) this.attackNeedsRelease = true;
      } else if (!t && !this.attackNeedsRelease) { const nt = this.nearestEnemy(this.selfRange() + 40); if (nt) { this.setTarget(nt.id); t = nt; } }
      if (t) {
        const d = Math.hypot(t.x - this.px, t.y - this.py);
        const range = this.selfRange();
        if (d > range - 8) {
          // tuşla saldırıda karakter canavara yürümez (bot kurulmasın); yalnız tıklanan hedefe yürünür
          if (!manual && this.walkToTarget) dir = dirIndexFromVector(t.x - this.px, t.y - this.py);
          else if (!manual && this.input.attackHeld && performance.now() - this.farHintAt > 2500) { this.farHintAt = performance.now(); notify('Hedef çok uzak: yaklaş ya da canavara tıkla.', 'error'); }
        }
        else {
          const cd = attackCooldown(650, st.self?.combat?.atkSpeed ?? 0);
          const now = performance.now();
          if (now - this.lastAttackSent >= cd - 20) { this.lastAttackSent = now; this.send({ t: 'attack', id: t.id }); }
          if (!manual) this.sdir = Math.round(Math.atan2(t.y - this.py, t.x - this.px) / (Math.PI * 2) * 256) & 255;
        }
      }
    } else if (dir === NO_DIR && this.moveTarget) {
      const d = Math.hypot(this.moveTarget.x - this.px, this.moveTarget.y - this.py);
      if (d < 12) this.moveTarget = null;
      else dir = dirIndexFromVector(this.moveTarget.x - this.px, this.moveTarget.y - this.py);
      if (this.interactNpc) {
        const npc = this.layout.npcs.find((n) => n.id === this.interactNpc);
        if (npc && Math.hypot(npc.x - this.px, npc.y - this.py) < 170) { this.send({ t: 'npc', id: npc.id }); this.interactNpc = null; this.moveTarget = null; dir = NO_DIR; }
      }
    }
    // otomatik yürüyüşte (oto av, hedefe/tıklanan yere yürüme) engelin etrafından dolan: ağaç/nesneye takılıp kalmasın.
    // Yan yönler sırayla denenir; seçilen taraf kısa süre korunur (sağ-sol arasında titremesin). Elle yürüyüşe dokunulmaz.
    if (dir !== NO_DIR && !(mv.x || mv.y)) {
      const sp = this.speed(), want = sp * 0.5;
      const moves = (d: number) => { const t = { x: this.px, y: this.py }; stepMove(this.layout, t, d, sp); return Math.hypot(t.x - this.px, t.y - this.py) >= want * 0.05; };
      if (!moves(dir)) {
        const side = performance.now() < this.avoidUntil ? this.avoidSide : 1;
        let found = -1;
        for (const o of [6, 12, 18, 24]) { for (const sg of [side, -side]) { const d2 = (dir + o * sg + DIR_STEPS) % DIR_STEPS; if (moves(d2)) { found = d2; this.avoidSide = sg; break; } } if (found >= 0) break; }
        if (found >= 0) { dir = found; this.avoidUntil = performance.now() + 700; }
      }
      // uzun süre hedefe yaklaşamıyorsa (oto av) başka canavara geç
      const tg = this.targetId ? this.ents.get(this.targetId) : undefined;
      if (tg && st.self?.autoOn) {
        const dd = Math.hypot(tg.x - this.px, tg.y - this.py);
        if (dd < this.stuckBest - 8) { this.stuckBest = dd; this.stuckAt = performance.now(); }
        else if (performance.now() - this.stuckAt > 2500) { this.setTarget(0); this.stuckBest = 1e9; this.stuckAt = performance.now(); }
      }
    } else { this.stuckBest = 1e9; this.stuckAt = performance.now(); }
    // kendi ganimetini otomatik al (5 sn sonra sunucu da toplar; yakında elle de)
    if (dir !== NO_DIR) {
      const ox = this.px, oy = this.py;
      this.seq = (this.seq + 1) & 0xffff;
      this.ws.send(encodeMove(this.seq, dir));
      this.pending.push({ seq: this.seq, dir });
      if (this.pending.length > 60) this.pending.shift();
      const pos = { x: this.px, y: this.py };
      stepMove(this.layout, pos, dir, this.speed());
      this.px = pos.x; this.py = pos.y;
      // bakış yönü girişten: engel boyunca kayarken konum farkı yönü oynatıyordu
      if (pos.x !== ox || pos.y !== oy) { this.lastMoveAt = performance.now(); this.sdir = (dir * (256 / DIR_STEPS)) & 255; }
      else if (this.moveTarget) this.moveTarget = null; // engel: dur
    }
  }

  /**
   * Joystick yönü (64 adım) için histerezis: başparmak hiç tam durmadığından yön iki komşu adım arasında
   * her 50 ms'de gidip geliyor, karakterin gövdesi sallanıyordu. Önceki yön ham açıya 0,9 adımdan yakınsa korunur.
   */
  private lastJoyDir = NO_DIR;
  private steadyDir(x: number, y: number): number {
    const raw = dirIndexFromVector(x, y);
    const prev = this.lastJoyDir;
    if (prev !== NO_DIR && raw !== prev) {
      let a = Math.atan2(y, x) / (Math.PI * 2) * DIR_STEPS; if (a < 0) a += DIR_STEPS;
      let d = Math.abs(a - prev); if (d > DIR_STEPS / 2) d = DIR_STEPS - d;
      if (d < 0.9) return prev;
    }
    this.lastJoyDir = raw;
    return raw;
  }

  nearestEnemy(maxD: number): CEnt | null {
    let best: CEnt | null = null, bd = maxD;
    const pvp = MAPS[this.layout.def.id]?.pvp;
    for (const e of this.ents.values()) {
      if (e.hp <= 0 || e.deadAt) continue;
      if (e.kind !== Kind.MONSTER && !(pvp && e.kind === Kind.PLAYER)) continue;
      const d = Math.hypot(e.x - this.px, e.y - this.py);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  setTarget(id: number) {
    this.targetId = id;
    const e = id ? this.ents.get(id) : null;
    if (!e) { store.set({ target: null }); return; }
    store.set({ target: { id, name: e.name, level: e.level, hp: e.hp, maxHp: e.maxHp, kind: e.kind, variant: e.variant, boss: e.kind === Kind.MONSTER && !!MONSTERS[e.tpl]?.boss } });
  }

  // ───────── eylemler ─────────
  attackPressed(down: boolean) {
    if (down && this.input.attackHeld) return; // klavye tekrarı yeni basış sayılmaz
    this.input.attackHeld = down;
    if (!down) { this.attackNeedsRelease = false; return; }
    if (down) {
      // yakın dövüşçü (Muhafız) hafif uzaktaki canavara da yürüyüp vurur; menzil kısa olduğu için. Uzaktaki
      // canavara gitmez (tuşa basılı tutup haritada bot gibi dolaşılmasın); ölünce yeniden basmak gerekir.
      // yönetimden: yaklaşma mesafesi ve öldürdükten sonra bekleme (hızlı basarak oto saldırı olmasın)
      const fresh = performance.now() - this.lastKillAt < (TUNING.retargetDelay ?? 1.2) * 1000;
      const approach = this.selfRange() < 160 && !fresh ? (TUNING.meleeApproach ?? 90) : 40;
      const reach = this.selfRange() + approach;
      let t = this.targetId ? this.ents.get(this.targetId) : undefined;
      if (t && (t.hp <= 0 || Math.hypot(t.x - this.px, t.y - this.py) > reach)) t = undefined;
      if (!t) { const nt = this.nearestEnemy(reach); if (nt) { this.setTarget(nt.id); t = nt; } else if (!this.targetId || !this.ents.get(this.targetId)) this.setTarget(0); }
      this.walkToTarget = !!t && approach > 40;
      this.autoAttack = true;
      this.moveTarget = null;
    }
  }
  /** Ekran görüntüsü: oyun sahnesini PNG kaydeder (telefonda paylaşım menüsü, değilse İndirilenler'e). */
  async screenshot() {
    const blob = await this.renderer.capture();
    if (!blob) return notify('Ekran görüntüsü alınamadı.', 'error');
    const d = new Date(), z = (n: number) => String(n).padStart(2, '0');
    const name = `coreoflife3d-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}.png`;
    sfx.play('ui');
    const file = new File([blob], name, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (matchMedia('(pointer: coarse)').matches && nav.canShare?.({ files: [file] })) {
      try { await nav.share({ files: [file], title: 'Core of Life 3D' }); return; } catch { /* paylaşım kapatıldı: indirmeye düş */ }
    }
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    notify('Ekran görüntüsü kaydedildi (İndirilenler)', 'ok');
  }
  useSkill(s: number) {
    const sk = classSkill(this.cls, s, store.get().self?.spec ?? null);
    if (!sk) return notify('Bu beceri henüz açılmadı.', 'error');
    const lvl = store.get().self?.level ?? 1;
    if (lvl < sk.unlock) return notify(`${sk.name} ${sk.unlock}. seviyede açılır.`, 'error');
    const cdEnd = store.get().cooldowns[s] ?? 0;
    if (performance.now() < cdEnd - 50) return;
    let t = this.targetId ? this.ents.get(this.targetId) : undefined;
    if ((!t || t.hp <= 0) && sk.kind !== 'buff' && sk.kind !== 'heal') { const nt = this.nearestEnemy(sk.range + 100); if (nt) { this.setTarget(nt.id); t = nt; } }
    if (sk.kind !== 'buff' && sk.kind !== 'heal' && !t && sk.kind !== 'aoe') return notify('Önce bir hedef seç.', 'error');
    this.send({ t: 'skill', s, id: t?.id, x: Math.round(t?.x ?? this.px), y: Math.round(t?.y ?? this.py) });
  }
  pickupNearby() {
    let best: CEnt | null = null, bd = LOOT_PICKUP_RANGE;
    for (const e of this.ents.values()) if (e.kind === Kind.LOOT && e.owner === this.charId) { const d = Math.hypot(e.x - this.px, e.y - this.py); if (d < bd) { bd = d; best = e; } }
    if (best) this.send({ t: 'pickup', id: best.id });
    else notify('Yakında toplanacak ganimet yok.', 'info');
  }
  potion() { this.send({ t: 'potion' }); }
  /** Bir tezgâhı aç: yakınsa içeriğini iste, uzaksa önce yürü. */
  openStall(id: string) {
    const s = store.get().stalls.find((q) => q.id === id);
    store.set({ stallView: { stall: id, name: s?.name, title: s?.title }, panel: 'market' });
    if (s && Math.hypot(s.x - this.px, s.y - this.py) > 520) this.moveTarget = { x: s.x, y: s.y + 110 };
    else this.send({ t: 'stall_view', stall: id });
  }
  /** Dünya noktasındaki dükkân (tezgâh, direkler ve tente alanı). */
  stallAt(wx: number, wy: number): string | null {
    let best: string | null = null, bd = 95;
    for (const s of store.get().stalls) { const d = Math.hypot(s.x - wx, s.y + 40 - wy); if (d < bd) { bd = d; best = s.id; } }
    return best;
  }
  /** Pazar Meydanı'na yürü (köyün doğusu). */
  goToMarket() {
    const m = this.layout.def.market;
    if (m) this.moveTarget = { x: m.tx * 64 + 32 - 200, y: m.ty * 64 + 32 + 60 };
  }
  mallBuy(id: string, qty: number) { this.send({ t: 'mall_buy', id, qty, req: reqId() }); }
  useItem(key: string, item?: string) { this.send({ t: 'use', key, req: reqId(), ...(item ? { item } : {}) }); }
  fishCast() { this.send({ t: 'fish_cast' }); }
  fishEnd(ok: boolean) { const f = store.get().fishing; if (f) this.send({ t: 'fish_end', token: f.token, ok }); if (!ok) store.set({ fishing: null }); }
  /** Oyuncunun yakınında su var mı (Olta At düğmesi için). */
  nearWater(): boolean {
    const l = this.layout; if (!l) return false;
    const tx = Math.floor(this.px / 64), ty = Math.floor(this.py / 64);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= l.w || y >= l.h) continue; const g = l.ground[y * l.w + x]; if (g === 4 || g === 10) return true; }
    return false;
  }
  donate(amount: number) { this.send({ t: 'donate', amount: Math.floor(amount), req: reqId() }); }
  travel(map: string, confirm = false) { this.send({ t: 'travel', map, req: reqId(), confirm }); }

  /** Ekran tıklaması: hedef seç, NPC ile konuş, ganimet al veya yürü. */
  clickScreen(sx: number, sy: number) {
    const hit = this.renderer.pickScreen(sx, sy);
    const { x: wx, y: wy } = this.renderer.screenToWorld(sx, sy);
    if (hit?.type === 'loot') {
      const e = hit.e!;
      if (e.owner !== this.charId) { notify('Bu ganimet sana ait değil.', 'error'); return; }
      if (Math.hypot(e.x - this.px, e.y - this.py) <= LOOT_PICKUP_RANGE) this.send({ t: 'pickup', id: e.id });
      else this.moveTarget = { x: e.x, y: e.y };
      return;
    }
    // dükkân: tıklanan nokta bir dükkânın tezgâhına yakınsa (dükkân sahipten bağımsız bir nesnedir)
    if (hit?.type !== 'npc') { const sl = this.stallAt(wx, wy); if (sl && !(hit?.type === 'ent' && hit.e!.kind === Kind.MONSTER)) { this.openStall(sl); return; } }
    if (hit?.type === 'ent') {
      this.setTarget(hit.e!.id);
      if (hit.e!.kind === Kind.MONSTER || (MAPS[this.layout.def.id]?.pvp && hit.e!.kind === Kind.PLAYER)) { this.autoAttack = true; this.walkToTarget = true; this.moveTarget = null; }
      return;
    }
    if (hit?.type === 'npc') {
      const npc = this.layout.npcs.find((n) => n.id === hit.npc)!;
      if (Math.hypot(npc.x - this.px, npc.y - this.py) < 170) this.send({ t: 'npc', id: npc.id });
      else { this.interactNpc = npc.id; this.moveTarget = { x: npc.x, y: npc.y + 40 }; }
      return;
    }
    this.autoAttack = false;
    this.moveTarget = { x: wx, y: wy };
    this.renderer.clickMark(wx, wy);
  }
  pick(wx: number, wy: number): { type: 'ent' | 'loot' | 'npc'; e?: CEnt; npc?: string } | null {
    let best: { type: 'ent' | 'loot' | 'npc'; e?: CEnt; npc?: string } | null = null, bd = 1e9;
    for (const e of this.ents.values()) {
      if (e.deadAt && e.kind !== Kind.LOOT) continue;
      const cy = e.kind === Kind.LOOT ? e.y - 8 : e.y - 28;
      const r = e.kind === Kind.LOOT ? 30 : 36;
      const d = Math.hypot(e.x - wx, cy - wy);
      if (d < r && d < bd) { bd = d; best = { type: e.kind === Kind.LOOT ? 'loot' : 'ent', e }; }
    }
    if (best) return best;
    for (const n of this.layout.npcs) { const d = Math.hypot(n.x - wx, n.y - 30 - wy); if (d < 40 && d < bd) { bd = d; best = { type: 'npc', npc: n.id }; } }
    return best;
  }

  cycleTarget() {
    const list = [...this.ents.values()].filter((e) => e.kind === Kind.MONSTER && e.hp > 0 && !e.deadAt).sort((a, b) => Math.hypot(a.x - this.px, a.y - this.py) - Math.hypot(b.x - this.px, b.y - this.py)).slice(0, 8);
    if (!list.length) return;
    const i = list.findIndex((e) => e.id === this.targetId);
    this.setTarget(list[(i + 1) % list.length].id);
  }

  private onKey(code: string, down: boolean, e: KeyboardEvent) {
    if (code === 'Space' || code === 'Digit1') { this.attackPressed(down); return; }
    if (code === 'PrintScreen') { if (!down) this.screenshot(); return; } // tarayıcılar çoğunlukla yalnız bırakmayı iletir
    if (!down) return;
    const toggle = (p: any) => store.set((s) => ({ panel: s.panel === p ? null : p }));
    switch (code) {
      case 'Digit2': this.useSkill(1); break;
      case 'Digit3': this.useSkill(2); break;
      case 'Digit4': this.useSkill(3); break;
      case 'KeyQ': case 'Digit5': this.potion(); break;
      case 'KeyZ': case 'KeyF': this.pickupNearby(); break;
      case 'KeyH': if (store.get().self?.mount?.owned) this.send({ t: 'mount', op: 'ride' }); break;
      case 'Tab': this.cycleTarget(); break;
      case 'KeyI': case 'KeyB': toggle('inventory'); break;
      case 'KeyC': toggle('character'); break;
      case 'F8': this.screenshot(); break;
      case 'KeyK': toggle('skills'); break;
      case 'KeyM': toggle('map'); break;
      case 'KeyT': toggle('teleport'); break;
      case 'Escape': if (store.get().panel) store.set({ panel: null, npc: null }); else { this.setTarget(0); this.autoAttack = false; } break;
      case 'Enter': e.preventDefault(); store.set({ chatOpen: true, unread: 0 }); setTimeout(() => (document.getElementById('chat-input') as HTMLInputElement | null)?.focus(), 0); break;
    }
  }
}

export const RAR_COLORS = ['#f2f0ea', '#5fa8ff', '#ffa53d', '#ff4d5a', '#ffd84a', '#7cf3ff', '#c58bff', '#3ef09a'];
export const RARITY_IDS = RARITIES;
function strip(m: any) { const { t, ...rest } = m; return rest; }
export { TILE };
