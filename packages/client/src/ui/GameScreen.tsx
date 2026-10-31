import React, { useEffect, useRef, useState } from 'react';
import { CLASSES, MAPS, TILE, classSkill, getLayout, Kind, MATERIAL, type ClassId } from '@col/shared';
import { Game } from '../game/game.ts';
import { store, useStore, reqId } from '../game/store.ts';
import { iconUrl } from '../game/art/icons.ts';
import { SkillIcon, MenuIcon } from './icons.tsx';
import { Panels } from './panels.tsx';
import { sfx } from '../game/audio.ts';

export let currentGame: Game | null = null;

export function GameScreen({ ticket, onExit }: { ticket: string; onExit: (reason: string, toChannels?: boolean) => void }) {
  const gl = useRef<HTMLCanvasElement>(null);
  const ov = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  useEffect(() => {
    const g = new Game(gl.current!, ov.current!, ticket, (reason) => onExit(reason));
    currentGame = g;
    g.start();
    setGame(g);
    return () => { g.stop(); currentGame = null; };
  }, [ticket]);
  // fare: tıkla-yürü, hedef seç; basılı tutunca sürekli yürü
  useEffect(() => {
    const c = gl.current!;
    let held = false; let lastHover = 0;
    const pos = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const down = (e: PointerEvent) => {
      if (!game || e.pointerType === 'touch' && isMobile()) { if (game && e.pointerType === 'touch') { const p = pos(e); game.clickScreen(p.x, p.y); } return; }
      (document.activeElement as HTMLElement | null)?.blur?.();
      if (e.button === 2) { const p = pos(e); const hit = game.renderer.pickScreen(p.x, p.y); if (hit?.e) { game.setTarget(hit.e.id); game.autoAttack = true; } return; }
      held = true; const p = pos(e); game.clickScreen(p.x, p.y);
    };
    const move = (e: PointerEvent) => {
      if (!game) return;
      const p = pos(e);
      const now = performance.now();
      if (held && game.moveTarget) { const w = game.renderer.screenToWorld(p.x, p.y); game.moveTarget = w; }
      if (now - lastHover > 80) { lastHover = now; const hit = game.renderer.pickScreen(p.x, p.y); game.hoverId = hit?.e?.id ?? 0; c.style.cursor = hit?.type === 'ent' ? 'crosshair' : hit ? 'pointer' : 'default'; }
    };
    const up = () => { held = false; };
    const ctx = (e: Event) => e.preventDefault();
    c.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); c.addEventListener('contextmenu', ctx);
    return () => { c.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); c.removeEventListener('contextmenu', ctx); };
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
      <Wallet />
      <Minimap game={game} />
      <Toasts />
      <LootFeed />
      <Chat />
      <BottomBar game={game} />
      <Menu onExit={onExit} />
      {mobile && <MobileControls game={game} />}
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
      <div className="frame worldhp" title="Ortak Dünya Sağlığı: Yaşam Özü bağışlarıyla artar, zamanla azalır.">
        <div className="lbl"><span>DÜNYA SAĞLIĞI</span><span>%{wh.toFixed(1)}</span></div>
        <div className="bar"><i style={{ width: `${wh}%` }} /></div>
      </div>
      {t && (
        <div className="frame target">
          <div style={{ flex: 1 }}>
            <div className="row"><span className="nm" style={{ color: t.variant === 2 ? '#ff7a6a' : t.variant === 1 ? '#ffb35a' : '#f2ecdc' }}>{t.variant === 2 ? 'Katil ' : t.variant === 1 ? 'Agresif ' : ''}{t.name}</span><div className="spacer" /><span className="muted" style={{ fontSize: 11, fontWeight: 800 }}>Sv. {t.level}</span></div>
            <div className="bar"><i style={{ width: `${Math.max(0, (t.hp / Math.max(1, t.maxHp)) * 100)}%` }} /></div>
            <div className="hpt">{t.hp.toLocaleString('tr-TR')} / {t.maxHp.toLocaleString('tr-TR')}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Wallet() {
  const self = useStore((s) => s.self);
  const ping = useStore((s) => s.ping);
  const fps = useStore((s) => s.fps);
  const online = useStore((s) => s.online);
  const ch = useStore((s) => s.channel);
  if (!self) return null;
  return (
    <div className="frame wallet">
      <div className="w"><img src={iconUrl('gem')} alt="" />{self.gems.toLocaleString('tr-TR')} <span className="muted" style={{ fontSize: 10 }}>Mücevher</span></div>
      <div className="w"><img src={iconUrl('essence')} alt="" />{self.essence.toLocaleString('tr-TR')} <span className="muted" style={{ fontSize: 10 }}>Öz</span></div>
      <div className="w"><img src={iconUrl('cp')} alt="" />{self.cp.toLocaleString('tr-TR')} <span className="muted" style={{ fontSize: 10 }}>ÇP</span></div>
      <div className="meta"><span>K{ch}</span><span>{online} çevrimiçi</span><span style={{ color: ping > 200 ? '#ff8a7a' : ping > 100 ? '#ffd27a' : '#8fe08a' }}>{ping} ms</span><span>{fps} fps</span></div>
    </div>
  );
}

const GROUND_COL = ['#5f9a46', '#4e8a3c', '#a88a5a', '#9a948a', '#3f8ac0', '#d8c490', '#e8f0f8', '#a8d8f0', '#3a3240', '#6a6670', '#2a6a9a', '#a07a4a'];
function Minimap({ game }: { game: Game }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const map = useStore((s) => s.map);
  const bgRef = useRef<HTMLCanvasElement | null>(null);
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
      const S = 164; cv.width = S * 2; cv.height = S * 2; ctx.scale(2, 2);
      const scale = 4 / TILE * 1.4; // piksel/dünya
      const cx = game.dx * scale, cy = game.dy * scale;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S, S);
      ctx.save(); ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(bg, S / 2 - cx, S / 2 - cy, bg.width * 1.4, bg.height * 1.4);
      const dot = (x: number, y: number, c: string, r = 2.2) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(S / 2 + (x * scale - cx), S / 2 + (y * scale - cy), r, 0, Math.PI * 2); ctx.fill(); };
      for (const n of game.layout.npcs) dot(n.x, n.y, '#ffd84a', 2.6);
      for (const e of game.ents.values()) dot(e.x, e.y, e.kind === Kind.MONSTER ? (e.variant === 2 ? '#ff3030' : '#e86a50') : e.kind === Kind.PLAYER ? '#6ab0ff' : '#fff6c2', e.kind === Kind.LOOT ? 1.5 : 2);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate((game.sdir / 256) * Math.PI * 2); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-2, 0); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.restore();
    }, 200);
    return () => clearInterval(iv);
  }, [game]);
  return (
    <div className="frame mm" onClick={() => store.set({ panel: 'map' })}>
      <canvas ref={ref} />
      <div className="zn">{MAPS[map]?.name}</div>
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
    <div className="frame chat">
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
  const hp = useStore((s) => s.hp), max = useStore((s) => s.maxHp);
  const self = useStore((s) => s.self);
  const cds = useStore((s) => s.cooldowns);
  const cls = useStore((s) => s.char?.cls) as ClassId | undefined;
  const now = useNow(100);
  if (!self || !cls) return null;
  const pots = self.materials?.red_potion ?? 0;
  const xpk = Math.min(1, self.xp / Math.max(1, self.xpNext));
  const slot = (s: number, key: string) => {
    const sk = classSkill(cls, s, self.spec);
    const locked = !sk || self.level < sk.unlock;
    const left = s > 0 ? Math.max(0, (cds[s] ?? 0) - now) : 0;
    return (
      <button key={s} className={'slot' + (locked ? ' locked' : '')} title={sk ? `${sk.name} — ${sk.desc}${locked ? ` (Sv. ${sk.unlock})` : ''}` : 'Uzmanlık (Sv. 30)'}
        onPointerDown={(e) => { e.preventDefault(); sfx.unlock(); if (s === 0) game.attackPressed(true); else game.useSkill(s); }}
        onPointerUp={() => s === 0 && game.attackPressed(false)} onPointerLeave={() => s === 0 && game.input.attackHeld && game.attackPressed(false)}>
        <span className="key">{key}</span>
        {sk ? <SkillIcon id={sk.id} /> : <SkillIcon id="" />}
        {left > 0 && <div className="cd">{(left / 1000).toFixed(left < 3000 ? 1 : 0)}</div>}
      </button>
    );
  };
  return (
    <div className="bottom">
      <div className="orb" title="Can">
        <div className="fill" style={{ height: `${Math.max(0, Math.min(100, (hp / Math.max(1, max)) * 100))}%` }} />
        <div className="shine" />
        <div className="t">{hp}<br />/{max}</div>
      </div>
      <div className="frame skillbar">
        <div className="slots">
          {slot(0, '1')}{slot(1, '2')}{slot(2, '3')}{slot(3, '4')}
          <button className="slot" title="Kırmızı İksir (Q): maks. canın %20'si" onPointerDown={(e) => { e.preventDefault(); game.potion(); }}>
            <span className="key">Q</span><img src={iconUrl('potion_red')} style={{ width: 38, height: 38 }} alt="" /><span className="cnt">{pots}</span>
          </button>
          <button className="slot" title="Ganimet topla (Z)" onPointerDown={(e) => { e.preventDefault(); game.pickupNearby(); }}><span className="key">Z</span><MenuIcon k="pick" /></button>
        </div>
        <div className="bar xp"><i style={{ width: `${xpk * 100}%` }} /></div>
        <div className="xpl">Seviye {self.level} · TP {self.xp.toLocaleString('tr-TR')} / {self.xpNext.toLocaleString('tr-TR')} ({(xpk * 100).toFixed(1)}%)</div>
      </div>
    </div>
  );
}

function Menu({ onExit }: { onExit: (r: string, toChannels?: boolean) => void }) {
  const open = (p: any) => { sfx.play('ui'); store.set((s) => ({ panel: s.panel === p ? null : p })); };
  const self = useStore((s) => s.self);
  const statPts = self ? self.statBudget - (self.statAlloc.str + self.statAlloc.res + self.statAlloc.vit) : 0;
  return (
    <div className="frame menu">
      <button title="Çanta (I)" onClick={() => open('inventory')}><MenuIcon k="bag" /><small>I</small></button>
      <button title="Karakter (C)" onClick={() => open('character')}><MenuIcon k="char" /><small>C</small>{statPts > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#c8302c', borderRadius: 8, fontSize: 10, padding: '0 4px', color: '#fff' }}>{statPts}</span>}</button>
      <button title="Beceriler (K)" onClick={() => open('skills')}><MenuIcon k="skills" /><small>K</small></button>
      <button title="Işınlan (T)" onClick={() => open('teleport')}><MenuIcon k="tp" /><small>T</small></button>
      <button title="Harita (M)" onClick={() => open('map')}><MenuIcon k="map" /><small>M</small></button>
      <button title="Ayarlar" onClick={() => open('settings')}><MenuIcon k="gear" /></button>
      <button title="Kanal değiştir / Çıkış" onClick={() => { currentGame?.stop(); onExit('', true); }} style={{ gridColumn: 'span 3', width: '100%', fontSize: 12, fontWeight: 800 }}>Kanal / Çıkış</button>
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
