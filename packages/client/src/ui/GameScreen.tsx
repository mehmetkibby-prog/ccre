import { AnnouncementBar, useCanAdmin } from '../admin/AdminPanel.tsx';
import React, { useEffect, useRef, useState } from 'react';
import { CLASSES, MAPS, TILE, classSkill, getLayout, Kind, MATERIAL, inMarket, type ClassId } from '@col/shared';
import { Game } from '../game/game.ts';
import { store, useStore, reqId } from '../game/store.ts';
import { iconUrl } from '../game/art/icons.ts';
import { SkillIcon, MenuIcon, ClassIcon } from './icons.tsx';
import { Panels } from './panels.tsx';
import { sfx } from '../game/audio.ts';
import { modelStatus, onModelStatus } from '../g3d/models.ts';
import { OFFLINE } from '../mode.ts';

export let currentGame: Game | null = null;

export function GameScreen({ ticket, onExit }: { ticket: string; onExit: (reason: string, toChannels?: boolean) => void }) {
  const gl = useRef<HTMLCanvasElement>(null);
  const ov = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  useEffect(() => {
    const g = new Game(gl.current!, ov.current!, ticket, (reason) => onExit(reason));
    currentGame = g;
    (window as unknown as { __colGame?: Game }).__colGame = g;
    (window as unknown as { __colStore?: typeof store }).__colStore = store;
    g.start();
    setGame(g);
    return () => { g.stop(); currentGame = null; };
  }, [ticket]);
  // fare: tıkla-yürü, hedef seç; basılı tutunca sürekli yürü
  useEffect(() => {
    const c = gl.current!;
    let held = false; let lastHover = 0;
    // kamera döndürme (sağ/orta tuşla sürükle) ve iki parmakla döndür/yakınlaştır
    let rot: { x: number; y: number; yaw: number; pitch: number; moved: boolean; btn: number } | null = null;
    const touches = new Map<number, { x: number; y: number }>();
    let pinch: { d: number; a: number; zoom: number; yaw: number } | null = null;
    // tek parmak: dokun-bırak = tıkla; yana kaydır = kamerayı döndür
    let drag: { id: number; x: number; y: number; t: number; yaw: number; pitch: number; rotating: boolean } | null = null;
    const pos = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const down = (e: PointerEvent) => {
      if (!game) return;
      if (e.pointerType === 'touch') {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size === 2) { drag = null; const [a, b] = [...touches.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x), zoom: game.renderer.camZoom, yaw: game.renderer.camYaw }; return; }
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), yaw: game.renderer.camYaw, pitch: game.renderer.camPitch, rotating: false };
        try { c.setPointerCapture(e.pointerId); } catch { /* */ }
        return;
      }
      (document.activeElement as HTMLElement | null)?.blur?.();
      if (e.button === 2 || e.button === 1) { rot = { x: e.clientX, y: e.clientY, yaw: game.renderer.camYaw, pitch: game.renderer.camPitch, moved: false, btn: e.button }; c.setPointerCapture(e.pointerId); return; }
      held = true; const p = pos(e); game.clickScreen(p.x, p.y);
    };
    const move = (e: PointerEvent) => {
      if (!game) return;
      if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch && touches.size === 2) {
          const [a, b] = [...touches.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
          game.renderer.camZoom = Math.max(0.6, Math.min(2.3, pinch.zoom * (d / Math.max(30, pinch.d))));
          game.renderer.camYaw = pinch.yaw - (ang - pinch.a);
        } else if (drag && drag.id === e.pointerId) {
          const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          if (!drag.rotating && Math.hypot(dx, dy) > 14) drag.rotating = true;
          if (drag.rotating) {
            game.renderer.camYaw = drag.yaw - dx * 0.011;
            game.renderer.camPitch = Math.max(0.1, Math.min(1.3, drag.pitch + dy * 0.006));
          }
        }
        return;
      }
      if (rot) { const dx = e.clientX - rot.x, dy = e.clientY - rot.y; if (Math.hypot(dx, dy) > 4) rot.moved = true; game.renderer.camYaw = rot.yaw - dx * 0.008; game.renderer.camPitch = Math.max(0.1, Math.min(1.3, rot.pitch + dy * 0.005)); return; }
      const p = pos(e);
      const now = performance.now();
      if (held && game.moveTarget) { const w = game.renderer.screenToWorld(p.x, p.y); game.moveTarget = w; }
      if (now - lastHover > 80) { lastHover = now; const hit = game.renderer.pickScreen(p.x, p.y); game.hoverId = hit?.e?.id ?? 0; c.style.cursor = hit?.type === 'ent' ? 'crosshair' : hit ? 'pointer' : 'default'; }
    };
    const wheel = (e: WheelEvent) => { if (!game) return; e.preventDefault(); game.renderer.camZoom = Math.max(0.6, Math.min(2.3, game.renderer.camZoom * (e.deltaY > 0 ? 0.9 : 1.1))); };
    const endTouch = (e: PointerEvent) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
    const up = (e: PointerEvent) => {
      held = false;
      if (e.pointerType === 'touch') {
        if (drag && drag.id === e.pointerId && game && e.type === 'pointerup') {
          if (!drag.rotating && performance.now() - drag.t < 600) { const p = pos(e); game.clickScreen(p.x, p.y); }
        }
        if (drag && drag.id === e.pointerId) drag = null;
        endTouch(e);
      }
      if (rot && game) {
        // sürüklemeden sağ tık: hedefe saldır
        if (!rot.moved && rot.btn === 2) { const p = pos(e); const hit = game.renderer.pickScreen(p.x, p.y); if (hit?.e) { game.setTarget(hit.e.id); game.autoAttack = true; } }
        rot = null;
      }
    };
    const ctx = (e: Event) => e.preventDefault();
    c.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); c.addEventListener('contextmenu', ctx); c.addEventListener('wheel', wheel, { passive: false });
    return () => { c.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); c.removeEventListener('contextmenu', ctx); c.removeEventListener('wheel', wheel); };
  }, [game]);
  return (
    <div className="game">
      <canvas ref={gl} className="gl" />
      <canvas ref={ov} className="ov" />
      {game && <Hud game={game} onExit={onExit} />}
    </div>
  );
}

export const isMobile = () => matchMedia('(pointer: coarse)').matches;

function Hud({ game, onExit }: { game: Game; onExit: (r: string, toChannels?: boolean) => void }) {
  const mobile = isMobile();
  return (
    <div className="hud">
      <TopBar />
      <PlayerPlate />
      <XpLine />
      <AnnouncementBar />
      <Minimap game={game} />
      <Toasts />
      <LootFeed />
      <Chat />
      <BottomBar game={game} />
      <Menu onExit={onExit} />
      <StallFab game={game} />
      {mobile && <MobileControls game={game} />}
      {mobile && <CameraControls game={game} />}
      <Panels game={game} onExit={onExit} />
      <DeathOverlay game={game} />
      <ConnStatus />
    </div>
  );
}

function ConnStatus() {
  const c = useStore((s) => s.connected);
  if (c) return null;
  return <div className="overlay"><div className="frame dead"><div className="title" style={{ fontSize: 20 }}>Bağlanıyor…</div><div className="muted">Sunucuyla bağlantı kuruluyor.</div></div></div>;
}

function TopBar() {
  const wh = useStore((s) => s.worldHealth);
  const t = useStore((s) => s.target);
  return (
    <div className="topbar">
      <div className="worldhp" title="Ortak Dünya Sağlığı: Yaşam Özü bağışlarıyla artar, zamanla azalır.">
        <div className="lbl"><span>DÜNYA ÇEKİRDEĞİ</span><span>%{wh.toFixed(1)}</span></div>
        <div className="bar"><i style={{ width: `${wh}%` }} /></div>
      </div>
      {t && (
        <div className="frame target">
          <div className="gem"><b>{t.level}</b></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row"><span className="nm" style={{ color: t.variant === 2 ? '#ff7a8a' : t.variant === 1 ? '#ffc070' : '#eef2fa' }}>{t.variant === 2 ? 'Katil ' : t.variant === 1 ? 'Agresif ' : ''}{t.name}</span></div>
            <div className="bar"><i style={{ width: `${Math.max(0, (t.hp / Math.max(1, t.maxHp)) * 100)}%` }} /></div>
            <div className="hpt">{t.hp.toLocaleString('tr-TR')} / {t.maxHp.toLocaleString('tr-TR')}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Test sürümünde 3B model yükleme durumu: modeller yüklenmezse sebebi ekranda görünsün. */
function ModelBadge() {
  const [, force] = useState(0);
  useEffect(() => onModelStatus(() => force((n) => n + 1)), []);
  const m = modelStatus;
  if (!OFFLINE && !m.failed) return null;
  if (!m.total && !m.lastError) return null;
  const bad = m.failed > 0 || (!!m.lastError && !m.loaded);
  return <div className="meta" style={{ color: bad ? '#ff8a7a' : '#8fe08a', whiteSpace: 'normal', maxWidth: 260 }}>Model {m.loaded}/{m.total}{m.lastError ? ' · ' + m.lastError.slice(0, 90) : ''}</div>;
}

/** Sol üst: çekirdek madalyonu (can ve deneyim halkaları, seviye), ad, can çubuğu, para birimleri. */
function PlayerPlate() {
  const self = useStore((s) => s.self);
  const char = useStore((s) => s.char);
  const hp = useStore((s) => s.hp), max = useStore((s) => s.maxHp);
  const ping = useStore((s) => s.ping);
  const fps = useStore((s) => s.fps);
  const online = useStore((s) => s.online);
  const ch = useStore((s) => s.channel);
  if (!self || !char) return null;
  const hk = Math.max(0, Math.min(1, hp / Math.max(1, max)));
  const xk = Math.min(1, self.xp / Math.max(1, self.xpNext));
  const C1 = 2 * Math.PI * 39, C2 = 2 * Math.PI * 44.5;
  return (
    <div className="plate">
      <div className="medal" title={`Can ${hp}/${max} · TP %${(xk * 100).toFixed(1)}`}>
        <svg className="rings" viewBox="0 0 92 92">
          <circle cx="46" cy="46" r="44.5" stroke="rgba(0,0,0,.6)" strokeWidth="3" fill="none" />
          <circle cx="46" cy="46" r="44.5" stroke="#b48cff" strokeWidth="3" fill="none" strokeDasharray={C2} strokeDashoffset={C2 * (1 - xk)} style={{ filter: 'drop-shadow(0 0 3px #b48cff)' }} />
          <circle cx="46" cy="46" r="39" stroke="rgba(0,0,0,.65)" strokeWidth="6" fill="rgba(7,10,18,.85)" />
          <circle cx="46" cy="46" r="39" stroke={hk < 0.3 ? '#ff2a4a' : '#ff4767'} strokeWidth="6" fill="none" strokeDasharray={C1} strokeDashoffset={C1 * (1 - hk)} style={{ transition: 'stroke-dashoffset .15s', filter: 'drop-shadow(0 0 4px #ff4767)' }} />
        </svg>
        <div className="core"><ClassIcon cls={char.cls} size={34} /></div>
        <div className="lvl">{self.level}</div>
      </div>
      <div className="frame pinfo">
        <div className="nm">{char.name}<small>{CLASSES[char.cls as ClassId]?.name}</small></div>
        <div className="bar hpbar"><i style={{ width: `${hk * 100}%` }} /></div>
        <div className="hpt"><span>{hp.toLocaleString('tr-TR')} / {max.toLocaleString('tr-TR')}</span><span>%{(hk * 100).toFixed(0)}</span></div>
        <div className="coins">
          <span className="g" title="Mücevher"><img src={iconUrl('gem')} alt="" />{self.gems.toLocaleString('tr-TR')}</span>
          <span className="e" title="Yaşam Özü"><img src={iconUrl('essence')} alt="" />{self.essence.toLocaleString('tr-TR')}</span>
          <span className="c" title="Çekirdek Puanı"><img src={iconUrl('cp')} alt="" />{self.cp.toLocaleString('tr-TR')}</span>
        </div>
        <div className="netinfo"><span>K{ch}</span><span style={{ color: ping > 200 ? '#ff6b7d' : ping > 100 ? '#ffdca3' : '#5ef0a6' }}>{ping} ms</span><span>{fps} fps</span><span>{online} çevrimiçi</span></div>
        <ModelBadge />
      </div>
    </div>
  );
}

/** Ekranın altında boydan boya deneyim çizgisi (onda birlik bölmeli). */
function XpLine() {
  const self = useStore((s) => s.self);
  if (!self) return null;
  const k = Math.min(1, self.xp / Math.max(1, self.xpNext));
  return (
    <div className="xpline" title="Deneyim">
      <i style={{ width: `${k * 100}%` }} />
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <b key={n} className="seg" style={{ left: `${n * 10}%` }} />)}
      <span>Seviye {self.level} · {self.xp.toLocaleString('tr-TR')} / {self.xpNext.toLocaleString('tr-TR')} TP · %{(k * 100).toFixed(1)}</span>
    </div>
  );
}

const GROUND_COL = ['#5f9a46', '#4e8a3c', '#a88a5a', '#9a948a', '#3f8ac0', '#d8c490', '#e8f0f8', '#a8d8f0', '#3a3240', '#6a6670', '#2a6a9a', '#a07a4a'];
function Minimap({ game }: { game: Game }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const map = useStore((s) => s.map);
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const [zone, setZone] = useState('');
  useEffect(() => {
    const l = getLayout(map);
    const c = document.createElement('canvas'); c.width = l.w * 4; c.height = l.h * 4;
    const x = c.getContext('2d')!;
    for (let ty = 0; ty < l.h; ty++) for (let tx = 0; tx < l.w; tx++) {
      x.fillStyle = GROUND_COL[l.ground[ty * l.w + tx]] ?? '#333';
      x.fillRect(tx * 4, ty * 4, 4, 4);
      if (l.blocked[ty * l.w + tx] && l.ground[ty * l.w + tx] !== 4 && l.ground[ty * l.w + tx] !== 10) { x.fillStyle = 'rgba(20,40,20,.55)'; x.fillRect(tx * 4, ty * 4, 4, 4); }
    }
    bgRef.current = c;
  }, [map]);
  useEffect(() => {
    const iv = setInterval(() => {
      const cv = ref.current, bg = bgRef.current; if (!cv || !bg) return;
      const ctx = cv.getContext('2d')!;
      const S = 150; cv.width = S * 2; cv.height = S * 2; ctx.scale(2, 2);
      const scale = 4 / TILE * 1.4; // piksel/dünya
      const cx = game.dx * scale, cy = game.dy * scale;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S, S);
      ctx.save();
      ctx.drawImage(bg, S / 2 - cx, S / 2 - cy, bg.width * 1.4, bg.height * 1.4);
      const dot = (x: number, y: number, c: string, r = 2.2) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(S / 2 + (x * scale - cx), S / 2 + (y * scale - cy), r, 0, Math.PI * 2); ctx.fill(); };
      for (const z of game.layout.zones) { ctx.strokeStyle = 'rgba(255,110,80,.55)'; ctx.fillStyle = 'rgba(220,70,50,.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(S / 2 + (z.x * scale - cx), S / 2 + (z.y * scale - cy), z.r * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      for (const n of game.layout.npcs) dot(n.x, n.y, '#ffd84a', 2.6);
      for (const e of game.ents.values()) dot(e.x, e.y, e.kind === Kind.MONSTER ? (e.variant === 2 ? '#ff3030' : '#e86a50') : e.kind === Kind.PLAYER ? '#6ab0ff' : '#fff6c2', e.kind === Kind.LOOT ? 1.5 : 2);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate((game.sdir / 256) * Math.PI * 2); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-2, 0); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.restore();
      // bulunulan yuva (girince adı görünür)
      const z = game.layout.zones.find((q) => Math.hypot(q.x - game.dx, q.y - game.dy) < q.r + 120);
      const label = z ? `${z.name} · Sv ${z.level[0]}-${z.level[1]}` : '';
      setZone((prev) => (prev === label ? prev : label));
    }, 200);
    return () => clearInterval(iv);
  }, [game]);
  return (
    <div className="mm" onClick={() => store.set({ panel: 'map' })} title="Harita (M)">
      <div className="dia"><canvas ref={ref} /></div>
      <div className="zn">{MAPS[map]?.name}{zone ? <small style={{ display: 'block', color: '#ffc9b8', fontSize: 11 }}>{zone}</small> : null}</div>
    </div>
  );
}

function Toasts() {
  const n = useStore((s) => s.notices);
  return <div className="toasts">{n.map((x) => <div key={x.id} className={'toast ' + x.kind}>{x.text}</div>)}</div>;
}
const RC: Record<string, string> = { white: '#e8e6df', blue: '#5fa8ff', orange: '#ffa53d', crimson: '#ff4d5a', unique: '#ffd84a', infinite: '#7cf3ff', purple: '#c58bff', emerald: '#3ef09a' };
function LootFeed() {
  const f = useStore((s) => s.lootFeed);
  return <div className="lootfeed">{f.map((x) => <div key={x.id} style={{ color: RC[x.rarity] ?? '#fff' }}>+ {x.text}</div>)}</div>;
}

function Chat() {
  const msgs = useStore((s) => s.chat);
  const tab = useStore((s) => s.chatTab);
  const chatOpen = useStore((s) => s.chatOpen);
  const [ch, setCh] = useState<'local' | 'world' | 'trade'>('local');
  const [text, setText] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollTo(0, 1e9); }, [msgs.length, tab]);
  const send = () => {
    const t = text.trim();
    if (!t) return;
    currentGame?.send({ t: 'chat', ch, text: t });
    setText('');
  };
  const list = msgs.filter((m) => tab === 'all' || m.ch === tab);
  const names: Record<string, string> = { world: 'Dünya', trade: 'Ticaret', local: 'Bölge', sys: 'Sistem' };
  return (
    <div className={'frame chat' + (chatOpen ? ' open' : '')}>
      <div className="tabs2">{['all', 'world', 'trade', 'local'].map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => store.set({ chatTab: t })}>{t === 'all' ? 'Tümü' : names[t]}</button>)}</div>
      <div className="msgs" ref={box}>
        {list.map((m) => <div key={m.id} className={'m ch-' + m.ch}>[{names[m.ch] ?? m.ch}] <b style={{ color: m.gm ? '#ffd84a' : undefined }}>{m.from}</b>: {m.text}</div>)}
      </div>
      <div className="in">
        <select value={ch} onChange={(e) => setCh(e.target.value as 'local')}><option value="local">Bölge</option><option value="world">Dünya</option><option value="trade">Ticaret</option></select>
        <input id="chat-input" value={text} maxLength={140} placeholder="Enter ile yaz…" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') { send(); (e.target as HTMLInputElement).blur(); } if (e.key === 'Escape') (e.target as HTMLInputElement).blur(); }} />
      </div>
    </div>
  );
}

function useNow(ms = 100) { const [, set] = useState(0); useEffect(() => { const iv = setInterval(() => set((x) => x + 1), ms); return () => clearInterval(iv); }, [ms]); return performance.now(); }

function BottomBar({ game }: { game: Game }) {
  const self = useStore((s) => s.self);
  const cds = useStore((s) => s.cooldowns);
  const cls = useStore((s) => s.char?.cls) as ClassId | undefined;
  const now = useNow(100);
  if (!self || !cls) return null;
  const pots = self.materials?.red_potion ?? 0;
  const slot = (s: number, key: string) => {
    const sk = classSkill(cls, s, self.spec);
    const locked = !sk || self.level < sk.unlock;
    const left = s > 0 ? Math.max(0, (cds[s] ?? 0) - now) : 0;
    return (
      <button key={s} className={'slot' + (s === 0 ? ' big' : '') + (locked ? ' locked' : '')} title={sk ? `${sk.name} — ${sk.desc}${locked ? ` (Sv. ${sk.unlock})` : ''}` : 'Uzmanlık (Sv. 30)'}
        onPointerDown={(e) => { e.preventDefault(); sfx.unlock(); if (s === 0) game.attackPressed(true); else game.useSkill(s); }}
        onPointerUp={() => s === 0 && game.attackPressed(false)} onPointerLeave={() => s === 0 && game.input.attackHeld && game.attackPressed(false)}>
        <span className="key">{key}</span>
        {sk ? <SkillIcon id={sk.id} /> : <SkillIcon id="" />}
        {left > 0 && <div className="cd"><span>{(left / 1000).toFixed(left < 3000 ? 1 : 0)}</span></div>}
      </button>
    );
  };
  return (
    <div className="bottom">
      <div className="skillbar">
        <div className="slots">
          {slot(1, '2')}{slot(2, '3')}
          {slot(0, '1')}
          {slot(3, '4')}
          <button className="slot" title="Kırmızı İksir (Q): maks. canın %20'si" onPointerDown={(e) => { e.preventDefault(); game.potion(); }}>
            <span className="key">Q</span><img src={iconUrl('potion_red')} alt="" /><span className="cnt">{pots}</span>
          </button>
          <button className="slot" title="Ganimet topla (Z)" onPointerDown={(e) => { e.preventDefault(); game.pickupNearby(); }}><span className="key">Z</span><MenuIcon k="pick" /></button>
        </div>
      </div>
    </div>
  );
}

function Menu({ onExit }: { onExit: (r: string, toChannels?: boolean) => void }) {
  const open = (p: any) => { sfx.play('ui'); store.set((s) => ({ panel: s.panel === p ? null : p })); };
  const self = useStore((s) => s.self);
  const unread = useStore((s) => s.unread);
  const canAdmin = useCanAdmin();
  const statPts = self ? self.statBudget - (self.statAlloc.str + self.statAlloc.res + self.statAlloc.vit) : 0;
  return (
    <div className="menu">
      <button onClick={() => open('inventory')}><MenuIcon k="bag" /><small>I</small><span className="tag">Çanta</span></button>
      <button onClick={() => open('character')}><MenuIcon k="char" /><small>C</small><span className="tag">Karakter</span>{statPts > 0 && <span className="badge">{statPts}</span>}</button>
      <button onClick={() => open('skills')}><MenuIcon k="skills" /><small>K</small><span className="tag">Beceriler</span></button>
      <button onClick={() => open('teleport')}><MenuIcon k="tp" /><small>T</small><span className="tag">Işınlan</span></button>
      <button onClick={() => open('map')}><MenuIcon k="map" /><small>M</small><span className="tag">Harita</span></button>
      <button onClick={() => open('settings')}><MenuIcon k="gear" /><span className="tag">Ayarlar</span></button>
      {canAdmin && <button onClick={() => open('admin')}><MenuIcon k="admin" /><span className="tag">Yönetim</span></button>}
      <button className="mob-only" onClick={() => store.set((s) => ({ chatOpen: !s.chatOpen, unread: 0 }))}><MenuIcon k="chat" />{unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}</button>
      <button className="exit" onClick={() => { currentGame?.stop(); onExit('', true); }}><MenuIcon k="exit" /><span className="tag">Kanal / Çıkış</span></button>
    </div>
  );
}

function MobileControls({ game }: { game: Game }) {
  const joy = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLElement>(null);
  const cds = useStore((s) => s.cooldowns);
  const now = useNow(150);
  useEffect(() => {
    const el = joy.current!; let id: number | null = null;
    const set = (e: PointerEvent) => {
      const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2);
      const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      game.input.joy = { x: dx, y: dy, active: true };
      if (knob.current) knob.current.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
    };
    const down = (e: PointerEvent) => { id = e.pointerId; el.setPointerCapture(e.pointerId); set(e); };
    const move = (e: PointerEvent) => { if (e.pointerId === id) set(e); };
    const up = (e: PointerEvent) => { if (e.pointerId !== id) return; id = null; game.input.joy = { x: 0, y: 0, active: false }; if (knob.current) knob.current.style.transform = ''; };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
  }, [game]);
  const cd = (s: number) => { const l = Math.max(0, (cds[s] ?? 0) - now); return l > 0 ? <div className="cdo">{(l / 1000).toFixed(0)}</div> : null; };
  const self = store.get().self; const cls = store.get().char?.cls as ClassId;
  const sk = (s: number) => cls ? classSkill(cls, s, self?.spec ?? null) : null;
  return (
    <>
      <div className="joy" ref={joy}><i ref={knob} /></div>
      <div className="mact">
        <button className="atk" onPointerDown={(e) => { e.preventDefault(); game.attackPressed(true); }} onPointerUp={() => game.attackPressed(false)} onPointerCancel={() => game.attackPressed(false)}>⚔</button>
        {[1, 2, 3].map((s) => <button key={s} className={'s' + s} onPointerDown={(e) => { e.preventDefault(); game.useSkill(s); }}>{sk(s) ? <SkillIcon id={sk(s)!.id} /> : s + 1}{cd(s)}</button>)}
        <button className="pot" onPointerDown={(e) => { e.preventDefault(); game.potion(); }}><img src={iconUrl('potion_red')} style={{ width: 30 }} alt="" /></button>
        <button className="pick" onPointerDown={(e) => { e.preventDefault(); game.pickupNearby(); }}><MenuIcon k="pick" /></button>
      </div>
    </>
  );
}

/** Telefonda kamera düğmeleri: basılı tut = döndür, +/− = yakınlaştır. */
function CameraControls({ game }: { game: Game }) {
  const hold = (fn: () => void) => {
    let raf = 0;
    const loop = () => { fn(); raf = requestAnimationFrame(loop); };
    return {
      onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* */ } cancelAnimationFrame(raf); loop(); },
      onPointerUp: () => cancelAnimationFrame(raf), onPointerCancel: () => cancelAnimationFrame(raf), onPointerLeave: () => cancelAnimationFrame(raf),
    };
  };
  const r = game.renderer;
  return (
    <div className="camctl" aria-label="Kamera">
      <button aria-label="Kamerayı sola döndür" {...hold(() => { r.camYaw += 0.035; })}>⟲</button>
      <button aria-label="Kamerayı sağa döndür" {...hold(() => { r.camYaw -= 0.035; })}>⟳</button>
      <button aria-label="Yakınlaş" {...hold(() => { r.camZoom = Math.min(2.3, r.camZoom * 1.015); })}>+</button>
      <button aria-label="Uzaklaş" {...hold(() => { r.camZoom = Math.max(0.6, r.camZoom / 1.015); })}>−</button>
      <button aria-label="Kamerayı sıfırla" className="small" onPointerDown={(e) => { e.preventDefault(); r.camYaw = 0; r.camZoom = 1; r.camPitch = 0.62; }}>⌂</button>
    </div>
  );
}

function DeathOverlay({ game }: { game: Game }) {
  const d = useStore((s) => s.dead);
  const now = useNow(250);
  void now;
  if (!d) return null;
  const left = Math.max(0, Math.ceil((d.at + d.respawnIn - Date.now()) / 1000));
  return (
    <div className="overlay">
      <div className="frame dead">
        <h2>Yaşam Çekirdeği seni geri çağırıyor</h2>
        {d.killer && <div className="muted">{d.killer} seni yendi.</div>}
        {d.lost > 0 && <div className="err">{d.lost} Mücevher kaybettin.</div>}
        <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
          <button className="btn" disabled={left > 0} onClick={() => game.send({ t: 'respawn', where: 'here' })}>{left > 0 ? `Burada doğ (${left})` : 'Burada doğ'}</button>
          <button className="btn primary" onClick={() => game.send({ t: 'respawn', where: 'town' })}>Pazar Köyü'nde doğ</button>
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 10 }}>Yerinde doğarsan canın yarısıyla dönersin.</div>
      </div>
    </div>
  );
}

export { MATERIAL, CLASSES, reqId };

/** Pazar Meydanı'nda tezgâh kurma kısayolu; tezgâh açıkken "Tezgâhım". */
function StallFab({ game }: { game: Game }) {
  const map = useStore((s) => s.map);
  const my = useStore((s) => s.myStall);
  const panel = useStore((s) => s.panel);
  const [here, setHere] = useState(false);
  useEffect(() => {
    const def = MAPS[map];
    if (!def?.market) { setHere(false); return; }
    const iv = setInterval(() => setHere(inMarket(def, game.px, game.py)), 400);
    return () => clearInterval(iv);
  }, [map, game]);
  if (panel) return null;
  if (!here) return null;
  if (my) return <button className="btn small primary stall-fab" onClick={() => store.set({ panel: 'market', stallView: null })}>Dükkânım · {my.items.length} eşya</button>;
  return <button className="btn small primary stall-fab" onClick={() => store.set({ panel: 'market', stallView: null })}>Dükkân Kur</button>;
}
