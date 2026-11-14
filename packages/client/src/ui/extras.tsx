/**
 * Oyun içi ek arayüzler: Nesne Market, boss duyurusu / takip / listesi, balık tutma oyunu ve Balıkçı Hasan,
 * Ticaret Camı araması.
 */
import React, { useEffect, useRef, useState } from 'react';
import { MALL_ITEMS, MALL, MALL_CATS, mallPrice, mallForSale, mallIcon, MAPS, fishTable, fishingConf, ROD_ID, RARITY, itemDisplayName, type MallCat } from '@col/shared';
import type { Game } from '../game/game.ts';
import { store, useStore, notify, type BossInfo } from '../game/store.ts';
import { iconUrl } from '../game/art/icons.ts';
import { api } from '../api.ts';
import { sfx } from '../game/audio.ts';
import { startMallMusic, stopMallMusic } from '../game/mallMusic.ts';
import { Panel, ItemTip } from './panels.tsx';

const nowSrv = () => Date.now() + (store.get().clockSkew ?? 0);
const fmtCountdown = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60; return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(ss).padStart(2, '0')}`; };
function useTick(ms: number) { const [, set] = useState(0); useEffect(() => { const iv = setInterval(() => set((x) => x + 1), ms); return () => clearInterval(iv); }, [ms]); }

// ═══════════════════════ Nesne Market ═══════════════════════
export function MallButton() {
  const open = useStore((s) => s.panel === 'mall');
  return (
    <button className={'mall-btn' + (open ? ' on' : '')} title="Nesne Market" onClick={() => { sfx.play('ui'); store.set((s) => ({ panel: s.panel === 'mall' ? null : 'mall' })); }}>
      <span className="mall-btn-ic"><img src={iconUrl('mall_cp_100')} alt="" /></span>
      <span>Market</span>
    </button>
  );
}
export function BossButton() {
  const bosses = useStore((s) => s.bosses);
  const alive = bosses.some((b) => b.alive);
  return (
    <button className={'boss-btn' + (alive ? ' alive' : '')} title="Bosslar" onClick={() => store.set((s) => ({ panel: s.panel === 'bosses' ? null : 'bosses' }))}>
      <CrownIcon /><span>Boss</span>
    </button>
  );
}
function CrownIcon() { return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M3 18 L2 7 L7.5 11 L12 4 L16.5 11 L22 7 L21 18 Z" fill="#ffd84a" stroke="#6a4512" strokeWidth="1.4" strokeLinejoin="round" /><rect x="3" y="18.5" width="18" height="3" rx="1" fill="#e2b250" stroke="#6a4512" strokeWidth="1.2" /></svg>; }

export function MallPanel({ game }: { game: Game }) {
  const self = useStore((s) => s.self);
  const vol = useStore((s) => s.settings.music);
  const [cat, setCat] = useState<MallCat | 'hepsi'>('hepsi');
  const [pick, setPick] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [bought, setBought] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { startMallMusic(vol); sfx.duckMusic(true); return () => { stopMallMusic(); sfx.duckMusic(false); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!self) return null;
  const cp = self.cp ?? 0;
  const list = MALL_ITEMS.filter((m) => (cat === 'hepsi' ? m.cat !== 'yakinda' && !m.epin : m.cat === cat)).sort((a, b) => a.no - b.no);
  const item = pick ? MALL.get(pick) : null;
  const total = item ? mallPrice(item.id) * qty : 0;
  const buy = () => {
    if (!item) return;
    game.mallBuy(item.id, qty);
    setBought(item.id); setPick(null); setQty(1); sfx.play('levelup');
    setTimeout(() => setBought(null), 2600);
  };
  const redeem = async () => {
    setBusy(true);
    try { const r = await api<{ text: string }>('/api/epin', { code, characterId: store.get().char?.id }); notify(r.text, 'ok'); setCode(''); sfx.play('levelup'); }
    catch (e) { notify((e as Error).message, 'error'); }
    setBusy(false);
  };
  return (
    <div className="mall-ov" onPointerDown={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) store.set({ panel: null }); }}>
      <div className="mall" role="dialog" aria-label="Nesne Market">
        <div className="mall-sparkles" aria-hidden>{Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.7) % 5}s` }} />)}</div>
        <header className="mall-hd">
          <div className="mall-title"><span className="mall-star">✦</span>Nesne Market<small>Sevgiyle seçilmiş ürünler</small></div>
          <div className="mall-cp" title="Çekirdek Puanı"><img src={iconUrl('mall_epin_200')} alt="" /><b>{cp.toLocaleString('tr-TR')}</b><span>ÇP</span></div>
          <button className="mall-x" onClick={() => store.set({ panel: null })} aria-label="Kapat">✕</button>
        </header>
        <nav className="mall-cats">
          {([['hepsi', 'Hepsi'] as [MallCat | 'hepsi', string], ...MALL_CATS]).map(([k, l]) => <button key={k} className={cat === k ? 'on c-' + k : 'c-' + k} onClick={() => setCat(k)}>{l}</button>)}
        </nav>
        <div className="mall-body">
          {cat === 'cp' && (
            <div className="mall-epin">
              <div><b>E-PIN Kullan</b><small>Satın aldığın kodu yaz, ÇP anında hesabına yüklensin.</small></div>
              <input className="inp" placeholder="TGR-XXXX-XXXX-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={28} />
              <button className="mall-buy" disabled={busy || code.trim().length < 8} onClick={redeem}>Yükle</button>
            </div>
          )}
          <div className="mall-grid">
            {list.map((m) => {
              const sale = mallForSale(m.id), price = mallPrice(m.id);
              return (
                <button key={m.id} className={'mall-card' + (bought === m.id ? ' bought' : '') + (!sale ? ' off' : '')} onClick={() => { if (sale) { setPick(m.id); setQty(1); } }}>
                  <span className="mall-ic"><img src={iconUrl(mallIcon(m.id))} alt="" />{m.id === 'support_pack' && <><img className="pk2" src={iconUrl('mall_loot_charm')} alt="" /><img className="pk3" src={iconUrl('mall_crimson_wings')} alt="" /></>}</span>
                  <span className="mall-nm">{m.name}</span>
                  <span className="mall-ds">{m.desc}</span>
                  {m.epin ? <span className="mall-tag">Kodla yüklenir</span> : m.soon ? <span className="mall-tag soon">Yakında</span> : sale ? <span className="mall-price"><img src={iconUrl('mall_epin_200')} alt="" />{price.toLocaleString('tr-TR')}</span> : <span className="mall-tag soon">Satışta değil</span>}
                  {(self.materials[m.id] ?? 0) > 0 && <span className="mall-own">Çantada {self.materials[m.id]}</span>}
                  {bought === m.id && <span className="mall-pop">Çantana eklendi! ✦</span>}
                </button>
              );
            })}
          </div>
        </div>
        {item && (
          <div className="mall-sheet" onPointerDown={(e) => { if (e.target === e.currentTarget) setPick(null); }}>
            <div className="mall-detail">
              <span className="mall-ic big"><img src={iconUrl(mallIcon(item.id))} alt="" /></span>
              <h3>{item.name}</h3>
              <p>{item.desc}</p>
              <div className="mall-qty">
                <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Azalt">−</button><b>{qty}</b><button onClick={() => setQty(Math.min(99, qty + 1))} aria-label="Artır">+</button>
              </div>
              <div className="mall-total">Toplam <b>{total.toLocaleString('tr-TR')} ÇP</b>{total > cp && <small> · {(total - cp).toLocaleString('tr-TR')} ÇP eksik</small>}</div>
              <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
                <button className="mall-ghost" onClick={() => setPick(null)}>Vazgeç</button>
                <button className="mall-buy" disabled={total > cp} onClick={buy}>Satın Al</button>
              </div>
            </div>
          </div>
        )}
        <footer className="mall-ft">Satın aldıkların çantanın <b>Nesne Market</b> bölümüne gelir; süreli ürünler oradan <b>Kullan</b> deyince başlar.</footer>
      </div>
    </div>
  );
}

// ═══════════════════════ Bosslar ═══════════════════════
const where = (b: { map: string; x: number; y: number }) => {
  const m = MAPS[b.map]; const name = m?.name ?? b.map;
  if (b.map === 'bazaar' && b.y > 100 * 64) return `${name} · Tilki Korusu'nun güney ucu`;
  return name;
};
function goTo(game: Game, b: { id: string; map: string }) {
  store.set({ bossTrack: b.id, bossBanner: null, panel: null });
  if (store.get().map !== b.map) { game.travel(b.map); notify(`${MAPS[b.map]?.name ?? b.map} haritasına ışınlanıyorsun; ok seni bossa götürecek.`, 'info'); }
}
export function BossBanner({ game }: { game: Game }) {
  const b = useStore((s) => s.bossBanner);
  const bosses = useStore((s) => s.bosses);
  useTick(1000);
  useEffect(() => { if (!b) return; const id = setTimeout(() => store.set({ bossBanner: null }), b.ev === 'spawn' ? 16000 : 9000); return () => clearTimeout(id); }, [b]);
  if (!b) return null;
  const info = bosses.find((x) => x.id === b.id && x.map === b.map);
  return (
    <div className={'boss-banner ' + b.ev}>
      <div className="bb-crown"><CrownIcon /></div>
      <div className="bb-txt">
        <b>{b.ev === 'spawn' ? `${b.name} doğdu!` : `${b.name} yenildi`}</b>
        <span>{b.ev === 'spawn' ? where(b) : `${b.killer ?? ''} ve arkadaşları zafer kazandı. ${info?.nextAt ? `Yeniden doğmasına ${fmtCountdown(info.nextAt - nowSrv())}` : ''}`}</span>
      </div>
      {b.ev === 'spawn' && <button className="btn small primary" onClick={() => goTo(game, b)}>{store.get().map === b.map ? 'Yol göster' : 'Işınlan ve git'}</button>}
      <button className="bb-x" onClick={() => store.set({ bossBanner: null })} aria-label="Kapat">✕</button>
    </div>
  );
}
/** Takip edilen boss için ekranın üstünde yön oku ve uzaklık. */
export function BossCompass({ game }: { game: Game }) {
  const track = useStore((s) => s.bossTrack);
  const bosses = useStore((s) => s.bosses);
  const map = useStore((s) => s.map);
  const ref = useRef<HTMLDivElement>(null);
  const b = bosses.find((x) => x.id === track);
  useEffect(() => {
    if (!b || b.map !== map) return;
    let raf = 0;
    const loop = () => {
      const el = ref.current;
      if (el) {
        const dx = b.x - game.px, dy = b.y - game.py, d = Math.hypot(dx, dy);
        if (d < 180) { store.set({ bossTrack: null }); return; }
        const cy = Math.cos(game.camYaw), sy = Math.sin(game.camYaw);
        const sx = dx * cy - dy * sy, sz = dx * sy + dy * cy;
        const ang = Math.atan2(sz, sx) * 180 / Math.PI + 90;
        (el.querySelector('.bc-arrow') as HTMLElement).style.transform = `rotate(${ang}deg)`;
        (el.querySelector('.bc-d') as HTMLElement).textContent = `${Math.round(d / 32)} m`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [b?.id, b?.map, b?.x, b?.y, map, game]);
  if (!b) return null;
  if (b.map !== map) return <div className="boss-compass"><CrownIcon /><span><b>{b.name}</b> · {MAPS[b.map]?.name}</span><button className="btn small" onClick={() => game.travel(b.map)}>Işınlan</button><button className="bb-x" onClick={() => store.set({ bossTrack: null })}>✕</button></div>;
  return (
    <div className="boss-compass" ref={ref}>
      <span className="bc-arrow">➤</span>
      <span><b>{b.name}</b> · <span className="bc-d">…</span>{!b.alive && b.nextAt ? ` · ${fmtCountdown(b.nextAt - nowSrv())} sonra doğar` : ''}</span>
      <button className="bb-x" onClick={() => store.set({ bossTrack: null })} aria-label="Takibi bırak">✕</button>
    </div>
  );
}
/** Boss ölüyken bulunduğu yerin üstünde geri sayım. */
export function BossCountdowns({ game }: { game: Game }) {
  const bosses = useStore((s) => s.bosses);
  const map = useStore((s) => s.map);
  const box = useRef<HTMLDivElement>(null);
  const list = bosses.filter((b) => b.map === map && !b.alive && b.nextAt);
  useEffect(() => {
    if (!list.length) return;
    let raf = 0;
    const loop = () => {
      const el = box.current; const r = game.renderer;
      if (el && r) list.forEach((b, i) => {
        const node = el.children[i] as HTMLElement; if (!node) return;
        const p = r.project(b.x, b.y, 3.2);
        node.style.display = p.vis ? '' : 'none';
        node.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
        (node.querySelector('b') as HTMLElement).textContent = fmtCountdown((b.nextAt ?? 0) - nowSrv());
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [list.map((b) => b.id + b.nextAt).join(), game]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!list.length) return null;
  return <div className="boss-cds" ref={box}>{list.map((b) => <div key={b.id + b.x} className="boss-cd"><CrownIcon /><span>{b.name}</span><small>doğmasına</small><b>--:--</b></div>)}</div>;
}
export function BossPanel({ game }: { game: Game }) {
  const bosses = useStore((s) => s.bosses);
  const self = useStore((s) => s.self);
  useTick(1000);
  useEffect(() => { game.send({ t: 'bosses' }); }, [game]);
  const tracker = (self?.buffs?.boss_tracker ?? 0) > nowSrv();
  const free = (b: BossInfo) => tracker || b.id === 'fox_king';
  return (
    <Panel title="Bosslar" width={520}>
      {!tracker && <div className="boss-note">Tilki Kral herkese açık. Diğer bossların yerini ve doğma süresini görmek için <b>Boss Takip</b> (Nesne Market) gerekir.</div>}
      <div className="boss-list">
        {bosses.map((b) => (
          <div key={b.id + b.map + b.x} className={'boss-row' + (b.alive ? ' alive' : '')}>
            <span className="br-ic"><CrownIcon /></span>
            <div className="br-mid">
              <b>{b.name}</b><small>Sv. {b.level} · {free(b) ? where(b) : '???'}</small>
              {b.alive ? <div className="bar br-hp"><i style={{ width: `${b.hp}%` }} /></div> : <small className="br-cd">{free(b) && b.nextAt ? `Doğmasına ${fmtCountdown(b.nextAt - nowSrv())}` : 'Yeniden doğuyor'}</small>}
            </div>
            {free(b) && <button className="btn small" onClick={() => goTo(game, b)}>{store.get().map === b.map ? 'Yol göster' : 'Git'}</button>}
          </div>
        ))}
        {!bosses.length && <div className="muted">Bilgi alınıyor…</div>}
      </div>
    </Panel>
  );
}

// ═══════════════════════ Balıkçılık ═══════════════════════
export function FishButton({ game }: { game: Game }) {
  const has = useStore((s) => (s.self?.materials[ROD_ID] ?? 0) > 0);
  const fishing = useStore((s) => s.fishing);
  const [near, setNear] = useState(false);
  useEffect(() => { const iv = setInterval(() => setNear(game.nearWater()), 500); return () => clearInterval(iv); }, [game]);
  if (!has || !near || fishing) return null;
  return <button className="fish-btn" onClick={() => { sfx.play('ui'); game.fishCast(); }}><img src={iconUrl('rod')} alt="" />Olta At</button>;
}
/** Stardew Valley tarzı tutma: yeşil alanı balığın üstünde tut, ilerleme dolunca balık senin. */
export function FishGame({ game }: { game: Game }) {
  const f = useStore((s) => s.fishing);
  const res = useStore((s) => s.fishResult);
  const [phase, setPhase] = useState<'wait' | 'hit' | 'reel'>('wait');
  const cv = useRef<HTMLCanvasElement>(null);
  const hold = useRef(false);
  useEffect(() => { if (res) { const id = setTimeout(() => store.set({ fishResult: null }), 2600); return () => clearTimeout(id); } }, [res]);
  useEffect(() => {
    if (!f) return;
    setPhase('wait');
    const t = setTimeout(() => { setPhase('hit'); sfx.play('crit'); setTimeout(() => setPhase('reel'), 650); }, Math.max(0, f.biteAt - performance.now()));
    return () => clearTimeout(t);
  }, [f?.token]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!f || phase !== 'reel') return;
    const c = cv.current!; const ctx = c.getContext('2d')!;
    const H = 300, W = 46; c.width = W * 2; c.height = H * 2; ctx.scale(2, 2);
    const diff = f.diff / 100;
    const zoneH = H * (0.34 - diff * 0.14);
    let zone = H - zoneH, zv = 0, fish = H * 0.6, ft = H * 0.5, fv = 0, prog = 0.3, last = performance.now(), tNext = 0, done = false;
    const keyDown = (e: KeyboardEvent) => { if (e.code === 'Space') { hold.current = true; e.preventDefault(); } };
    const keyUp = (e: KeyboardEvent) => { if (e.code === 'Space') hold.current = false; };
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      // yeşil alan: basılıyken yukarı ivme, bırakınca yerçekimi; dipte hafif sekme
      zv += (hold.current ? -900 : 650) * dt; zv *= 0.985;
      zone += zv * dt;
      if (zone < 0) { zone = 0; zv = 0; } if (zone > H - zoneH) { zone = H - zoneH; zv = zv > 120 ? -zv * 0.35 : 0; }
      // balık: türüne göre hareket
      tNext -= dt;
      if (tNext <= 0) {
        const m = f.motion;
        const jump = m === 'dart' ? 0.7 : m === 'mixed' ? 0.5 : 0.3;
        ft = Math.max(8, Math.min(H - 8, (m === 'sinker' ? H * 0.75 : fish) + (Math.random() - 0.5) * H * jump * (0.6 + diff)));
        tNext = (m === 'dart' ? 0.35 : 0.8) * (1.4 - diff) + Math.random() * 0.6;
      }
      fv += (ft - fish) * (6 + diff * 14) * dt; fv *= 0.86; fish += fv * dt * 6;
      fish = Math.max(6, Math.min(H - 6, fish));
      const inZone = fish > zone && fish < zone + zoneH;
      prog += (inZone ? 0.24 : -(0.14 + diff * 0.12)) * dt;
      // çizim
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a7fa8'); g.addColorStop(1, '#0d3a5a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(4, 0, W - 8, H, 10); ctx.fill();
      ctx.fillStyle = inZone ? 'rgba(120,240,140,.85)' : 'rgba(120,240,140,.55)';
      ctx.beginPath(); ctx.roundRect(7, zone, W - 14, zoneH, 6); ctx.fill();
      ctx.strokeStyle = '#d8ffe0'; ctx.lineWidth = 1.5; ctx.stroke();
      // balık (çizim): gövde, kuyruk, göz
      ctx.save(); ctx.translate(W / 2, fish);
      ctx.fillStyle = '#ffb35c'; ctx.strokeStyle = '#5a2a10'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(15, -6); ctx.lineTo(15, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-2, 0, 11, 6.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-8, -1.5, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-8.3, -1.5, 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      const pb = document.getElementById('fish-prog'); if (pb) { pb.style.height = `${Math.max(0, Math.min(1, prog)) * 100}%`; pb.style.background = prog < 0.25 ? '#ff6b5a' : prog < 0.6 ? '#ffd84a' : '#8fdc8a'; }
      if (!done && prog >= 1) { done = true; game.fishEnd(true); return; }
      if (!done && prog <= 0) { done = true; game.fishEnd(false); notify('Balık kaçtı!', 'error'); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); };
  }, [phase, f?.token]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!f) return res ? <div className={'fish-result' + (res.ok ? ' ok' : '')}>{res.ok ? <><b>{res.name}</b> tuttun!{(res.qty ?? 1) > 1 ? ` ×${res.qty}` : ''}</> : 'Balık kaçtı…'}</div> : null;
  const down = (e: React.PointerEvent) => { e.preventDefault(); hold.current = true; };
  const up = () => { hold.current = false; };
  return (
    <div className="fish-ov">
      {phase === 'wait' && <div className="fish-wait"><span className="bobber" />Şamandıra suda… sabırlı ol<button className="btn small ghost" onClick={() => game.fishEnd(false)}>Vazgeç</button></div>}
      {phase === 'hit' && <div className="fish-hit">Vurdu!</div>}
      {phase === 'reel' && (
        <div className="fish-game" onPointerDown={down} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
          <canvas ref={cv} style={{ width: 46, height: 300 }} />
          <div className="fish-progwrap"><i id="fish-prog" /></div>
          <div className="fish-help"><b>Basılı tut</b><span>Yeşil alanı balığın üstünde tut</span><small>Boşluk tuşu da olur</small></div>
        </div>
      )}
    </div>
  );
}
export function FishShop({ game }: { game: Game }) {
  const self = useStore((s) => s.self);
  if (!self) return null;
  const has = (self.materials[ROD_ID] ?? 0) > 0;
  const conf = fishingConf();
  const table = fishTable();
  const sellable = table.filter((f) => f.price > 0 && (self.materials[f.id] ?? 0) > 0);
  const total = sellable.reduce((a, f) => a + f.price * (self.materials[f.id] ?? 0), 0);
  return (
    <Panel title="Balıkçı Hasan" width={460}>
      <div className="npc-greet">“Göl bugün cömert görünüyor. Oltan yoksa benden al; tuttuğun balıkları da ben alırım.”</div>
      <div className="fish-shop">
        <div className="fs-row"><img src={iconUrl('rod')} alt="" /><div><b>Olta</b><small>Suya yakın dur, “Olta At”a bas.</small></div>
          {has ? <span className="pill ok">Oltan var</span> : <button className="btn small primary" disabled={self.gems < conf.rodPrice} onClick={() => game.send({ t: 'fish_rod', req: Math.random().toString(36).slice(2) })}>{conf.rodPrice.toLocaleString('tr-TR')} Mücevher</button>}
        </div>
        <div className="sect" style={{ marginTop: 12 }}>Balık fiyatları</div>
        {table.map((f) => (
          <div key={f.id} className="fs-row small"><img src={iconUrl(f.pearl ? (f.id === 'red_pearl' ? 'pearl_red' : 'pearl_white') : f.id)} alt="" /><div><b>{f.name}</b><small>Elinde {self.materials[f.id] ?? 0}</small></div><span className="muted">{f.price > 0 ? `${f.price} Mücevher` : 'Hasan almaz'}</span></div>
        ))}
        <button className="btn primary" style={{ width: '100%', marginTop: 12 }} disabled={!total} onClick={() => game.send({ t: 'fish_sell', req: Math.random().toString(36).slice(2) })}>{total ? `Balıkları sat (+${total.toLocaleString('tr-TR')} Mücevher)` : 'Satılacak balık yok'}</button>
      </div>
    </Panel>
  );
}

// ═══════════════════════ Ticaret Camı ═══════════════════════
export function TradeGlass({ game }: { game: Game }) {
  const r = useStore((s) => s.marketResults);
  const [q, setQ] = useState(r?.q ?? '');
  const [tip, setTip] = useState<{ it: import('@col/shared').ItemInstance; x: number; y: number } | null>(null);
  return (
    <Panel title="Ticaret Camı · Pazar Arama" width={620}>
      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        <input className="inp" style={{ flex: 1 }} placeholder="Eşya adı (ör. kılıç, kızıl, +5)" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && game.send({ t: 'market_search', q })} />
        <button className="btn primary" onClick={() => game.send({ t: 'market_search', q })}>Ara</button>
      </div>
      <div className="tg-list">
        {r?.list.map((x, i) => (
          <div key={i} className="tg-row" onClick={(e) => setTip({ it: x.item, x: e.clientX, y: e.clientY })}>
            <b style={{ color: RARITY[x.item.rarity]?.color }}>{itemDisplayName(x.item)}</b>
            <span className="muted">{x.owner}{x.title ? ` · ${x.title}` : ''}</span>
            <span className="tg-price">{x.price.toLocaleString('tr-TR')} Mücevher</span>
          </div>
        ))}
        {r && !r.list.length && <div className="muted">Sonuç yok.</div>}
      </div>
      {tip && <ItemTip it={tip.it} x={tip.x} y={tip.y} pinned onClose={() => setTip(null)} />}
    </Panel>
  );
}
