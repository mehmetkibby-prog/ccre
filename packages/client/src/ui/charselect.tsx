/**
 * Karakter seçimi: "Öz Sunağı". Kahramanlar alttaki yay üzerinde rün mühürlerinde durur; seçilen kahraman ortada,
 * dönen rün çemberli sunağın üstünde 3B görünür. Solda kahraman kartı (sınıf, seviye, yer, güç grafiği),
 * sağda sınıfın becerileri. Yeni kahraman: üç büyük sınıf sancağı, ad, "Kahramanı Uyandır".
 */
import React, { useEffect, useMemo, useState } from 'react';
import { CLASSES, CLASS_IDS, MAPS, validateCharacterName, type ClassId } from '@col/shared';
import { api } from '../api.ts';
import { SkillIcon } from './icons.tsx';
import './charselect.css';

export interface CharSelectMe { account: { username: string; prereg?: boolean; preregGranted?: boolean }; characters: { id: number; name: string; cls: ClassId; level: number; map: string }[] }

const MAX_CHARS = 4;
/** Sınıf kimliği: renk, rol, zorluk ve (tasarım) güç dağılımı 1–5 */
const CLS: Record<ClassId, { color: string; glow: string; role: string; tag: string; diff: number; stats: [number, number, number, number, number] }> = {
  guardian: { color: '#e2b250', glow: 'rgba(226,178,80,.55)', role: 'Yakın dövüş · Ön saf', tag: 'Kalkan çeker, sersemletir, düşmeyi bilmez.', diff: 1, stats: [3, 5, 5, 2, 1] },
  hunter: { color: '#5fe0a0', glow: 'rgba(95,224,160,.5)', role: 'Uzak menzil · Kritik', tag: 'Rüzgâr gibi koşar, oku hedefini affetmez.', diff: 2, stats: [4, 2, 2, 5, 5] },
  arcanist: { color: '#b08aff', glow: 'rgba(176,138,255,.55)', role: 'Büyü · Alan hasarı', tag: 'Yaşam Özü\'nü bükerek ateş ve şifa yağdırır.', diff: 3, stats: [5, 2, 3, 3, 4] },
};
const STAT_NAMES = ['Saldırı', 'Savunma', 'Can', 'Hız', 'Menzil'];
const DIFF = ['', 'Kolay', 'Orta', 'Zor'];
const RANDOM_NAMES = ['Alpkara', 'Toygar', 'Ayaz', 'Börteçin', 'Kayra', 'Tolunay', 'Ilgaz', 'Yağız', 'Aybars', 'Elçin', 'Göktürk', 'Bilge', 'Akın', 'Doruk', 'Sarp', 'Atilla', 'Asena', 'Umay', 'Kutluk', 'Tegin'];

/** Beş köşeli güç grafiği */
function Radar({ v, color }: { v: number[]; color: string }) {
  const R = 46, c = 60, pt = (i: number, k: number) => { const a = -Math.PI / 2 + (i / 5) * Math.PI * 2; return [c + Math.cos(a) * R * k, c + Math.sin(a) * R * k]; };
  const poly = (k: number | number[]) => v.map((_, i) => pt(i, Array.isArray(k) ? k[i] : k).join(',')).join(' ');
  return (
    <svg viewBox="-14 -8 148 138" className="cs-radar" aria-hidden>
      {[1, 0.66, 0.33].map((k) => <polygon key={k} points={poly(k)} fill="none" stroke="rgba(248,226,164,.16)" strokeWidth="1" />)}
      {v.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgba(248,226,164,.12)" />; })}
      <polygon points={poly(v.map((x) => x / 5))} fill={color} fillOpacity=".28" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {v.map((x, i) => { const [px, py] = pt(i, x / 5); return <circle key={i} cx={px} cy={py} r="2.6" fill={color} />; })}
      {STAT_NAMES.map((n, i) => { const [x, y] = pt(i, 1.27); return <text key={n} x={x} y={y + 3} textAnchor="middle" fontSize="8.5" fill="rgba(248,236,210,.75)" fontWeight="700">{n}</text>; })}
    </svg>
  );
}

function Skills({ cls }: { cls: ClassId }) {
  const C = CLASSES[cls];
  const list = [C.skills[0], C.first, C.skills[1], C.extra, C.skills[2]].filter(Boolean);
  const [hover, setHover] = useState(0);
  const s = list[hover] ?? list[0];
  return (
    <div className="cs-skills">
      <div className="cs-skrow">
        {list.map((k, i) => <button key={k.id} className={'cs-sk' + (i === hover ? ' on' : '')} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} aria-label={k.name}><SkillIcon id={k.id} /><small>Sv.{k.unlock}</small></button>)}
      </div>
      <div className="cs-skinfo"><b>{s.name}</b><span>{s.desc}</span></div>
    </div>
  );
}

export function CharSelect({ me, onPlay, onReload, onLogout, error, Preview, extra }: {
  me: CharSelectMe; onPlay: (id: number) => void; onReload: () => void; onLogout: () => void; error: string;
  Preview: React.ComponentType<{ cls: ClassId }>; extra?: React.ReactNode;
}) {
  const chars = me.characters;
  const [sel, setSel] = useState<number | null>(chars[0]?.id ?? null);
  const [creating, setCreating] = useState(chars.length === 0);
  const [name, setName] = useState('');
  const [cls, setCls] = useState<ClassId>('guardian');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const selChar = chars.find((c) => c.id === sel) ?? null;
  const viewCls: ClassId = creating ? cls : selChar?.cls ?? 'guardian';
  const K = CLS[viewCls];
  const create = async () => {
    const v = validateCharacterName(name);
    if (v) return setErr(v);
    if (busy) return;
    setBusy(true); setErr('');
    try { const r = await api<{ id: number }>('/api/characters', { name, cls }); setCreating(false); setSel(r.id); setName(''); onReload(); }
    catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  // klavye: oklar mühürler arasında, Enter oyuna
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'Enter' && !creating && selChar) onPlay(selChar.id);
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && chars.length && !creating) {
        const i = Math.max(0, chars.findIndex((c) => c.id === sel)), n = (i + (e.key === 'ArrowRight' ? 1 : -1) + chars.length) % chars.length;
        setSel(chars[n].id);
      }
    };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  }, [chars, sel, creating, selChar, onPlay]);
  const slots = useMemo(() => Array.from({ length: MAX_CHARS }, (_, i) => chars[i] ?? null), [chars]);
  return (
    <div className="cs-root" style={{ '--cc': K.color, '--cg': K.glow } as React.CSSProperties}>
      <div className="cs-vignette" />
      <header className="cs-top">
        <div className="cs-brand"><b>Öz Sunağı</b><small>{creating ? 'Yeni bir kahraman uyandır' : 'Kahramanını seç'}</small></div>
        <div className="cs-acc"><span>{me.account.username}</span>{extra}<button className="cs-ghost" onClick={onLogout}>Çıkış</button></div>
      </header>
      {error && <div className="cs-error">{error}</div>}
      {me.account.prereg && <div className="prereg-note cs-prereg"><img src="/site/prereg_chest.png" alt="" width={34} height={34} /><span><b>Ön kaydın alındı</b>{me.account.preregGranted ? 'Ön Kayıt Sandığı karakterinin çantasında.' : 'Ön Kayıt Sandığı ilk karakterinin çantasına eklenecek.'}</span></div>}

      <main className="cs-stage">
        {/* sol: kahraman kartı */}
        <aside className="cs-card">
          {creating ? (
            <>
              <span className="cs-eyebrow">Sınıf</span>
              <h2 style={{ color: K.color }}>{CLASSES[cls].name}</h2>
              <div className="cs-role">{K.role}</div>
              <p className="cs-tag">{K.tag}</p>
            </>
          ) : selChar ? (
            <>
              <span className="cs-eyebrow">{CLASSES[selChar.cls].name}</span>
              <h2>{selChar.name}</h2>
              <div className="cs-meta"><span className="cs-lv">Sv. {selChar.level}</span><span>⌖ {MAPS[selChar.map]?.name ?? selChar.map}</span></div>
              <div className="cs-role">{K.role}</div>
            </>
          ) : <h2>Kahraman yok</h2>}
          <Radar v={K.stats} color={K.color} />
          <div className="cs-diff">Zorluk <span>{[1, 2, 3].map((d) => <i key={d} className={d <= K.diff ? 'on' : ''} />)}</span><b>{DIFF[K.diff]}</b></div>
        </aside>

        {/* orta: sunak ve 3B kahraman */}
        <section className="cs-altar">
          <div className="cs-ring" aria-hidden><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" /><circle cx="100" cy="100" r="78" className="d" />{Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <text key={i} x={100 + Math.cos(a) * 85} y={100 + Math.sin(a) * 85 + 4} textAnchor="middle" transform={`rotate(${(i / 12) * 360 + 90} ${100 + Math.cos(a) * 85} ${100 + Math.sin(a) * 85})`}>{'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ'[i]}</text>; })}</svg></div>
          <div className="cs-motes" aria-hidden>{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ left: `${8 + ((i * 37) % 84)}%`, animationDelay: `${(i * 0.73) % 6}s`, animationDuration: `${5 + (i % 5)}s` }} />)}</div>
          <div className="cs-hero"><Preview cls={viewCls} /></div>
          <div className="cs-plate">{creating ? (name.trim() || 'İsimsiz kahraman') : selChar?.name ?? ''}</div>
        </section>

        {/* sağ: beceriler ya da yaratma formu */}
        <aside className="cs-side">
          {creating ? (
            <div className="cs-create">
              <span className="cs-eyebrow">Sınıfını seç</span>
              <div className="cs-classes">
                {CLASS_IDS.map((c) => (
                  <button key={c} className={'cs-class' + (cls === c ? ' on' : '')} style={{ '--k': CLS[c].color } as React.CSSProperties} onClick={() => setCls(c)}>
                    <img src={`/portraits/${c}.jpg`} alt="" /><span><b>{CLASSES[c].name}</b><small>{CLS[c].role}</small></span>
                  </button>
                ))}
              </div>
              <label className="cs-name"><span>Kahramanının adı</span>
                <div><input value={name} maxLength={18} placeholder="2–18 harf" onChange={(e) => { setName(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && create()} autoFocus />
                  <button type="button" title="Rastgele ad" onClick={() => setName(RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)] + (Math.random() < 0.5 ? '' : String(Math.floor(Math.random() * 90) + 10)))}>🎲</button></div>
              </label>
              {err && <div className="cs-err">{err}</div>}
              <button className="cs-cta" onClick={create} disabled={busy}><span>{busy ? 'Uyanıyor…' : 'Kahramanı Uyandır'}</span></button>
              {chars.length > 0 && <button className="cs-ghost wide" onClick={() => setCreating(false)}>← Kahramanlarıma dön</button>}
              <div className="cs-note">Hesap başına bir kez Başlangıç Sandığı: 50 Mücevher + 10 Kırmızı İksir.</div>
            </div>
          ) : (
            <>
              <span className="cs-eyebrow">Beceriler</span>
              <Skills cls={viewCls} />
              <p className="cs-desc">{CLASSES[viewCls].desc}</p>
            </>
          )}
        </aside>
      </main>

      {/* alt: kahraman mühürleri ve giriş */}
      <footer className="cs-bottom">
        <div className="cs-seals">
          {slots.map((c, i) => c ? (
            <button key={c.id} className={'cs-seal' + (!creating && sel === c.id ? ' on' : '')} style={{ '--k': CLS[c.cls].color } as React.CSSProperties} onClick={() => { setSel(c.id); setCreating(false); }} onDoubleClick={() => onPlay(c.id)}>
              <span className="cs-face"><img src={`/portraits/${c.cls}.jpg`} alt="" /></span>
              <span className="cs-sn"><b>{c.name}</b><small>Sv. {c.level} · {CLASSES[c.cls].name}</small></span>
            </button>
          ) : (
            <button key={'e' + i} className={'cs-seal empty' + (creating && i === chars.length ? ' on' : '')} onClick={() => setCreating(true)} disabled={i !== chars.length}>
              <span className="cs-face">+</span><span className="cs-sn"><b>{i === chars.length ? 'Yeni kahraman' : 'Boş mühür'}</b><small>{i === chars.length ? 'Uyandırmak için dokun' : '—'}</small></span>
            </button>
          ))}
        </div>
        {!creating && selChar && <button className="cs-cta big" onClick={() => onPlay(selChar.id)}><span>Maceraya Başla</span><small>Enter</small></button>}
      </footer>
    </div>
  );
}
