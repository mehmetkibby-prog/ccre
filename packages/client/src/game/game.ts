import { DIR_STEPS,
  readSnapshot, encodeMove, stepMove, dirIndexFromVector, getLayout, classSkill, attackCooldown, NO_DIR, TILE, Kind, Anim, Ev, Fx as FxKind, DmgFlag, EFlag,
  MONSTERS, CLASS_IDS, CLASSES, MAPS, LOOT_PICKUP_RANGE, RARITIES, type MapLayout, type Snapshot, type ClassId, type ClientCmd,
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
  dir: number; anim: number; animStart: number; skill?: number;
  hp: number; maxHp: number; flags: number; level: number;
  name: string; cls: number; variant: number; tpl: number; weapon: number; wplus: number; guild: string; combo?: number;
  icon: string; rarity: number; owner: number; ttlEnd: number; label: string;
  hurtUntil: number; spawnAt: number; deadAt: number;
  /** vuruşla geri sekme: yön (birim vektör) ve bitiş anı */
  kbX?: number; kbY?: number; kbUntil?: number;
}

const INTERP_MS = 110;
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
  input = new Input();
  fx: Fx3D;
  renderer: Renderer3D;
  targetId = 0;
  moveTarget: { x: number; y: number } | null = null;
  interactNpc: string | null = null;
  autoAttack = false;
  /** Saldırı basılıyken hedef öldü: yeni hedefe geçmek için tuş bırakılıp yeniden basılmalı (makro/ağırlıkla bot gibi kasılmayı önler). */
  attackNeedsRelease = false;
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
  pingSent = 0;
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
    ws.onopen = () => store.set({ connected: true, status: '' });
    ws.onmessage = (e) => {
      if (typeof e.data === 'string') this.onJson(JSON.parse(e.data), (r) => (closedReason = r));
      else this.onSnapshot(e.data as ArrayBuffer);
    };
    ws.onclose = () => { store.set({ connected: false }); if (!this.stopped) this.onClose(closedReason || 'Bağlantı koptu.'); this.stop(); };
    this.input.attach();
    this.input.onKey = (code, down, e) => this.onKey(code, down, e);
    this.lastFrame = performance.now();
    // kare sınırı (ayarlar): 120 Hz ekranlı telefon sınırsızken saniyede 120 kare çizip ısınıyordu
    let lastDraw = 0;
    const loop = (t: number) => {
      if (this.stopped) return;
      this.raf = requestAnimationFrame(loop);
      const cap = store.get().settings.fpsCap;
      if (cap > 0 && t - lastDraw < 1000 / cap - 3) return;
      lastDraw = t;
      this.frame(t);
    };
    this.raf = requestAnimationFrame(loop);
    setInterval(() => { if (this.ws?.readyState === 1) { this.pingSent = Date.now(); this.send({ t: 'ping', c: this.pingSent }); } }, 3000);
  }
  stop() {
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
      case 'chat': pushChat({ ch: m.ch, from: m.from, text: m.text, cls: m.cls, gm: m.gm, item: m.item }); break;
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
      case 'upgradeResult': store.set({ upgradeResult: { ok: m.ok, before: m.before, after: m.after, chance: m.chance } }); sfx.play(m.ok ? 'levelup' : 'error'); break;
      case 'shop': break;
      case 'pong': store.set({ ping: Date.now() - m.c, clockSkew: typeof m.s === 'number' ? m.s - (Date.now() + m.c) / 2 : store.get().clockSkew }); break;
      case 'kicked': setReason(m.text); break;
      case 'fatal': setReason(m.text); break;
    }
  }

  // ───────── snapshot ─────────
  private onSnapshot(buf: ArrayBuffer) {
    const reset = new Uint8Array(buf, 0, 1)[0] === 2;
    const s: Snapshot = readSnapshot(buf);
    const now = performance.now();
    const off = s.t - now;
    if (this.serverOffset === null || off > this.serverOffset) this.serverOffset = off;
    else this.serverOffset += (off - this.serverOffset) * 0.02;
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
        variant: sp.kind === Kind.MONSTER ? sp.variant : 0, tpl: sp.kind === Kind.MONSTER ? sp.tpl : 0, weapon: sp.kind === Kind.PLAYER ? sp.weapon : 0, wplus: sp.kind === Kind.PLAYER ? sp.wplus : 0, guild: sp.kind === Kind.PLAYER ? sp.guild : '',
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
            this.renderer.hitStop([this.selfId, ev.tgt], crit ? 110 : 70);
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
        if (isSelf) { this.selfAnim = ev.skill === 0 ? Anim.ATTACK : Anim.CAST; this.selfAnimStart = now; this.selfSkill = ev.skill; this.sdir = Math.round(Math.atan2(ev.y - this.dy, ev.x - this.dx) / (Math.PI * 2) * 256) & 255; }
        else if (src) { src.anim = ev.skill === 0 ? Anim.ATTACK : Anim.CAST; src.animStart = now; src.skill = ev.skill; }
        const clsIdx = isSelf ? CLASS_IDS.indexOf(this.cls) : src?.kind === Kind.PLAYER ? src.cls : -1;
        if (ev.skill === 9) { this.fx.projs.push({ x0: sp.x, y0: sp.y, tx: ev.x, ty: ev.y, tgt: ev.tgt, t0: now, dur: 420, kind: 'ice', color: '#8fe6ff' }); break; }
        if (clsIdx === 1 && (ev.skill === 0 || ev.skill === 2 || ev.skill === 3)) { this.fx.projs.push({ x0: sp.x, y0: sp.y, tx: ev.x, ty: ev.y, tgt: ev.tgt, t0: now, dur: 200, kind: 'arrow', color: '#fff' }); if (isSelf) sfx.play('bow'); }
        else if (clsIdx === 2 && ev.skill === 0) { this.fx.projs.push({ x0: sp.x, y0: sp.y, tx: ev.x, ty: ev.y, tgt: ev.tgt, t0: now, dur: 260, kind: 'orb', color: '#7cf3ff' }); this.fx.light(sp.x, sp.y, 1.6, '#7cf3ff', 3, 300); if (isSelf) sfx.play('magic'); }
        else if (clsIdx === 0 && ev.skill === 0) {
          // Muhafız kombosu: 1) sağdan sola yatay, 2) ters yükselen, 3) tepeden iniş; kesik izi vuruş anında
          const prev = this.meleeCast.get(ev.src);
          const combo = prev && now - prev.at < 1500 ? (prev.combo + 1) % 3 : 0;
          this.meleeCast.set(ev.src, { at: now, combo });
          if (isSelf) this.selfCombo = combo;
          else if (src) src.combo = combo;
          const a = Math.atan2(ev.y - sp.y, ev.x - sp.x);
          if (isSelf) sfx.play('swing');
          window.setTimeout(() => {
            const t2 = performance.now();
            this.fx.shapes.push({ kind: 'slash', x: sp.x, y: sp.y, r: combo === 2 ? 64 : 74, r2: combo, a: a + (combo === 1 ? 0.35 : combo === 0 ? -0.35 : 0), t0: t2, dur: 260, color: combo === 2 ? '#ffe2a0' : '#ffffff' });
            if (combo === 2) this.fx.burst(ev.x, ev.y, 0.1, 14, '#d9c7a1', 2, 500, 0.2, 1);
          }, MELEE_IMPACT_MS - 40);
        }
        else if (ev.skill > 0 && isSelf) sfx.play('skill');
        if (clsIdx === 0 && ev.skill === 1) this.fx.shapes.push({ kind: 'slash', x: sp.x, y: sp.y, r: 70, r2: 0, a: Math.atan2(ev.y - sp.y, ev.x - sp.x), t0: now, dur: 300, color: '#ffd27a' });
        if (ev.skill > 0 && ev.skill < 9) this.skillFx(clsIdx, ev.skill, sp, ev, now);
        break;
      }
      case Ev.DEATH: {
        const e = this.ents.get(ev.id);
        if (e) { e.deadAt = now; const p = this.entPos(e); this.fx.burst(p.x, p.y, 0.8, 26, e.kind === Kind.MONSTER ? '#9ffff0' : '#ff8a8a', 3, 900, 0.22, -1); if (ev.killer === this.selfId) sfx.play('kill'); }
        if (ev.id === this.targetId) { this.autoAttack = false; if (this.input.attackHeld) this.attackNeedsRelease = true; this.setTarget(0); }
        break;
      }
      case Ev.FX: {
        const sh = { x: ev.x, y: ev.y, r: ev.r, r2: 0, a: 0, t0: now, dur: ev.ms, color: '#ff4d5a' };
        if (ev.fx === FxKind.TELEGRAPH_CIRCLE) this.fx.shapes.push({ kind: 'circle', ...sh });
        else if (ev.fx === FxKind.TELEGRAPH_RING) this.fx.shapes.push({ kind: 'ring', ...sh, r2: ev.a });
        else if (ev.fx === FxKind.TELEGRAPH_LINE) this.fx.shapes.push({ kind: 'line', ...sh, a: ev.a / 1000, r2: 70 });
        else if (ev.fx === FxKind.AOE_BLAST) {
          const col = this.cls === 'arcanist' ? '#b28bff' : this.cls === 'hunter' ? '#9dff6a' : '#ffd27a';
          this.fx.shapes.push({ kind: 'blast', ...sh, color: col });
          this.fx.burst(ev.x, ev.y, 0.3, 40, col, 5, 700, 0.25); this.fx.light(ev.x, ev.y, 1.2, col, 6, 500);
          sfx.play('boom');
        } else if (ev.fx === FxKind.HEAL_WAVE) this.fx.shapes.push({ kind: 'heal', ...sh });
        else if (ev.fx === FxKind.SHIELD) this.fx.shapes.push({ kind: 'shield', ...sh, follow: ev.a === (this.selfId & 0xffff) ? this.selfId : undefined });
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

  /** Becerilere özgü görsel: kullanan karakterde toplanan ışık, hedefte sınıfa göre ayrı etki. */
  private skillFx(clsIdx: number, skill: number, sp: { x: number; y: number }, ev: { x: number; y: number; tgt: number }, now: number) {
    const col = clsIdx === 0 ? '#ffd27a' : clsIdx === 1 ? '#9dff6a' : '#b28bff';
    const fx = this.fx, a = Math.atan2(ev.y - sp.y, ev.x - sp.x);
    // hazırlık: ayak altında halka, yükselen kıvılcımlar, kısa ışık
    fx.shapes.push({ kind: 'blast', x: sp.x, y: sp.y, r: 70, r2: 0, a: 0, t0: now, dur: 480, color: col });
    fx.burst(sp.x, sp.y, 0.2, 18, col, 1.4, 600, 0.14, 2.5);
    fx.light(sp.x, sp.y, 1.2, col, 2.5, 450);
    const later = (ms: number, f: () => void) => window.setTimeout(f, ms);
    if (clsIdx === 0) {
      if (skill === 1) { // zincir: hedefe uzanan altın ışın, hedefte kıvılcım
        fx.projs.push({ x0: sp.x, y0: sp.y, tx: ev.x, ty: ev.y, tgt: ev.tgt, t0: now, dur: 180, kind: 'orb', color: col });
        later(180, () => { fx.burst(ev.x, ev.y, 1, 26, col, 3, 600, 0.2); fx.light(ev.x, ev.y, 1.2, col, 5, 350); });
      } else if (skill === 2) { // hücum: arkada toz izi, hedefte şok dalgası
        for (let i = 0; i < 6; i++) { const k = i / 6; fx.burst(sp.x + (ev.x - sp.x) * k, sp.y + (ev.y - sp.y) * k, 0.1, 6, '#d9c7a1', 1.2, 600, 0.22, 1); }
        later(160, () => { fx.shapes.push({ kind: 'blast', x: ev.x, y: ev.y, r: 160, r2: 0, a: 0, t0: performance.now(), dur: 520, color: col }); fx.burst(ev.x, ev.y, 0.2, 40, '#fff1c4', 4, 700, 0.22); fx.light(ev.x, ev.y, 1, col, 7, 450); });
      } else { // uzmanlık: kalkan / hüküm darbesi
        fx.shapes.push({ kind: 'slash', x: sp.x, y: sp.y, r: 95, r2: 0, a, t0: now, dur: 360, color: col });
        fx.shapes.push({ kind: 'blast', x: sp.x + Math.cos(a) * 110, y: sp.y + Math.sin(a) * 110, r: 200, r2: 0, a: 0, t0: now, dur: 560, color: col });
      }
    } else if (clsIdx === 1) {
      if (skill === 1) { // yelpaze: hedef çevresine beş ok
        for (let i = 0; i < 5; i++) {
          const ox = (Math.random() - 0.5) * 220, oy = (Math.random() - 0.5) * 220;
          later(i * 45, () => fx.projs.push({ x0: sp.x, y0: sp.y, tx: ev.x + ox, ty: ev.y + oy, tgt: 0, t0: performance.now(), dur: 240, kind: 'arrow', color: col }));
        }
        later(300, () => fx.burst(ev.x, ev.y, 0.3, 30, col, 3, 650, 0.2));
      } else { // delici / şafak oku: parlayan büyük ok ve iz
        fx.projs.push({ x0: sp.x, y0: sp.y, tx: ev.x, ty: ev.y, tgt: ev.tgt, t0: now, dur: 230, kind: 'orb', color: skill === 3 ? '#fff3a8' : col });
        later(230, () => { fx.burst(ev.x, ev.y, 1, 36, skill === 3 ? '#fff3a8' : col, 4, 700, 0.22); fx.light(ev.x, ev.y, 1.2, col, 6, 400); if (skill === 2) fx.shapes.push({ kind: 'blast', x: ev.x, y: ev.y, r: 110, r2: 0, a: 0, t0: performance.now(), dur: 700, color: col }); });
      }
    } else if (clsIdx === 2) {
      if (skill === 2) { // kırağı mührü: buz küresi, hedefte buz çiçeği
        fx.projs.push({ x0: sp.x, y0: sp.y, tx: ev.x, ty: ev.y, tgt: ev.tgt, t0: now, dur: 300, kind: 'ice', color: '#bff4ff' });
        later(300, () => { fx.burst(ev.x, ev.y, 0.3, 46, '#dff9ff', 2.5, 900, 0.2, 1); fx.shapes.push({ kind: 'blast', x: ev.x, y: ev.y, r: 130, r2: 0, a: 0, t0: performance.now(), dur: 800, color: '#8fe6ff' }); fx.light(ev.x, ev.y, 1, '#8fe6ff', 6, 600); });
      } else { // öz halkası / patlama: hedefe süzülen küre, ardından halka
        fx.projs.push({ x0: sp.x, y0: sp.y, tx: ev.x, ty: ev.y, tgt: ev.tgt, t0: now, dur: 280, kind: 'orb', color: col });
        later(280, () => { fx.shapes.push({ kind: 'blast', x: ev.x, y: ev.y, r: skill === 3 ? 190 : 170, r2: 0, a: 0, t0: performance.now(), dur: 600, color: col }); fx.burst(ev.x, ev.y, 0.5, 50, col, 4.5, 800, 0.24); });
      }
    }
  }

  // ───────── çerçeve ─────────
  entPos(e: CEnt): { x: number; y: number } { return { x: e.x, y: e.y }; }

  private interpolate(now: number) {
    const rt = (this.serverOffset ?? 0) + now - INTERP_MS;
    for (const e of this.ents.values()) {
      const s = e.samples;
      if (s.length === 1 || e.kind === Kind.LOOT) { e.x = s[s.length - 1].x; e.y = s[s.length - 1].y; continue; }
      let i = s.length - 1;
      while (i > 0 && s[i - 1].t > rt) i--;
      if (i === 0) { e.x = s[0].x; e.y = s[0].y; continue; }
      const a = s[i - 1], b = s[i];
      if (rt >= b.t) {
        // ekstrapolasyon yok: son bilinen konumda bekle (ışınlanma titremesi olmasın)
        e.x = b.x; e.y = b.y;
      } else {
        const k = (rt - a.t) / Math.max(1, b.t - a.t);
        if (Math.hypot(b.x - a.x, b.y - a.y) > 300) { e.x = b.x; e.y = b.y; }
        else { e.x = a.x + (b.x - a.x) * k; e.y = a.y + (b.y - a.y) * k; }
      }
      while (s.length > 2 && s[1].t < rt - 200) s.shift();
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
      } else if (!t && !this.attackNeedsRelease) { const nt = this.nearestEnemy(manual ? this.selfRange() + 60 : 700); if (nt) { this.setTarget(nt.id); t = nt; } }
      if (t) {
        const d = Math.hypot(t.x - this.px, t.y - this.py);
        const range = this.selfRange();
        if (d > range - 8) { if (!manual) dir = dirIndexFromVector(t.x - this.px, t.y - this.py); }
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
      const t = this.targetId ? this.ents.get(this.targetId) : null;
      if (!t || t.hp <= 0) { const nt = this.nearestEnemy(700); if (nt) this.setTarget(nt.id); }
      this.autoAttack = true;
      this.moveTarget = null;
    }
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
      if (hit.e!.kind === Kind.MONSTER || (MAPS[this.layout.def.id]?.pvp && hit.e!.kind === Kind.PLAYER)) { this.autoAttack = true; this.moveTarget = null; }
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
    if (!down) return;
    const toggle = (p: any) => store.set((s) => ({ panel: s.panel === p ? null : p }));
    switch (code) {
      case 'Digit2': this.useSkill(1); break;
      case 'Digit3': this.useSkill(2); break;
      case 'Digit4': this.useSkill(3); break;
      case 'KeyQ': case 'Digit5': this.potion(); break;
      case 'KeyZ': case 'KeyF': this.pickupNearby(); break;
      case 'Tab': this.cycleTarget(); break;
      case 'KeyI': case 'KeyB': toggle('inventory'); break;
      case 'KeyC': toggle('character'); break;
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
