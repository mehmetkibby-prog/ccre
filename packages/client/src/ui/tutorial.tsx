/**
 * Yeni oyuncu rehberi (Sv. 12'ye kadar): adım adım ve olaya göre ipuçları.
 *  1) Tilki Korusu'na altın okla yönlendirir   2) 3 tilki avlatır
 *  3) can %50'nin altına inince Kırmızı İksir içirir
 *  4) 5 Mücevher olunca Market'ten Kırmızı İksir aldırır   5) 15 Mücevher olunca beceri geliştirtir
 * Tamamlanan adımlar sunucuda bit olarak saklanır (başka cihazda tekrar çıkmaz). "Rehberi kapat" hepsini bitirir.
 */
import { useEffect, useRef, useState } from 'react';
import { getLayout, TUNING, Kind, TILE } from '@col/shared';
import { store, useStore } from '../game/store.ts';
import { currentGame } from './GameScreen.tsx';
import { iconUrl } from '../game/art/icons.ts';
import { sfx } from '../game/audio.ts';

const B_GROVE = 1, B_HUNT = 2, B_POTION = 4, B_BUY = 8, B_SKILL = 16, B_OFF = 32;
const ALL = B_GROVE | B_HUNT | B_POTION | B_BUY | B_SKILL;
const HUNT_N = 3;
/** Tilki Korusu: köyün güneyindeki tilki alanının kuzey kenarı (karo) */
const GROVE = { tx: 43.5, ty: 63.5, y0: 62 };

const mark = (bits: number) => {
  const s = store.get().self; if (!s) return;
  store.set({ self: { ...s, tut: (s.tut ?? 0) | bits } });
  currentGame?.send({ t: 'tut', bits } as never);
};
/** hedef düğmeyi parlatır (görünmüyorsa yedeğini: ör. telefonda menü düğmesi) */
const glow = (sel: string | null, fallback?: string) => {
  document.querySelectorAll('.tut-hi').forEach((e) => e.classList.remove('tut-hi'));
  if (!sel) return;
  const el = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.offsetParent !== null);
  const f = !el && fallback ? [...document.querySelectorAll<HTMLElement>(fallback)].find((e) => e.offsetParent !== null) : null;
  (el ?? f)?.classList.add('tut-hi');
};

export function Tutorial() {
  const self = useStore((s) => s.self);
  const map = useStore((s) => s.map);
  const hp = useStore((s) => s.hp), maxHp = useStore((s) => s.maxHp);
  const [, tick] = useState(0);
  const base = useRef<number | null>(null);
  const prev = useRef<{ pots: number; gems: number; sk: number } | null>(null);
  const [cheer, setCheer] = useState<string | null>(null);
  useEffect(() => { const iv = setInterval(() => tick((x) => x + 1), 500); return () => clearInterval(iv); }, []);

  const tut = self?.tut ?? 0;
  const on = !!self && self.level <= 12 && !(tut & B_OFF) && (tut & ALL) !== ALL;
  const g = currentGame;
  const pots = self?.materials?.red_potion ?? 0, gems = self?.gems ?? 0, sk = (self?.skills ?? []).reduce((a, b) => a + (b ?? 1), 0);
  const potGems = Math.max(1, Math.round(TUNING.potionGems ?? 5));

  // olay algılama: iksir içildi / satın alındı / beceri geliştirildi
  useEffect(() => {
    if (!on || !self) { prev.current = null; return; }
    const p = prev.current; prev.current = { pots, gems, sk };
    if (!p) return;
    if ((tut & B_HUNT) && !(tut & B_POTION) && pots < p.pots) { mark(B_POTION); setCheer('Aferin! Kırmızı İksir canını %20 doldurur. Q tuşu ya da iksir düğmesi.'); }
    if ((tut & B_HUNT) && !(tut & B_BUY) && pots > p.pots && gems < p.gems) { mark(B_BUY); setCheer('Harika! Mücevherle iksir aldın. İksirin bitmeden yenisini al.'); }
    if ((tut & B_HUNT) && !(tut & B_SKILL) && sk > p.sk) { mark(B_SKILL); setCheer('Becerin güçlendi! Her kademe +%4 hasar. Seviye atladıkça yeni hak gelir.'); }
  }, [on, pots, gems, sk, tut]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!cheer) return; sfx.play('levelup'); const id = setTimeout(() => setCheer(null), 5000); return () => clearTimeout(id); }, [cheer]);

  // hangi kart: önce zorunlu adımlar (koru, av), sonra olaya bağlı ipuçları
  let card: { title: string; text: string; btn?: [string, () => void]; hi?: [string, string?] } | null = null;
  let guide: { x: number; y: number } | null = null;
  let done = 0, doneMsg = '';
  if (on && self && g && map === 'bazaar') {
    const inGrove = g.py / TILE >= GROVE.y0 - 1;
    if (!(tut & B_GROVE)) {
      if (inGrove) done = B_GROVE;
      guide = { x: GROVE.tx * TILE, y: GROVE.ty * TILE };
      card = { title: 'Hoş geldin, maceracı!', text: 'İlk avın köyün güneyindeki Tilki Korusu\'nda. Ayağının dibindeki altın oku takip et.' };
    } else if (!(tut & B_HUNT)) {
      if (base.current === null) base.current = self.kills;
      const n = Math.max(0, self.kills - base.current);
      if (n >= HUNT_N) { done = B_HUNT; doneMsg = 'Tebrikler! İlk tilkilerini avladın. Düşen eşya ve Mücevherleri toplamayı unutma.'; }
      // en yakın tilki
      let best: { x: number; y: number } | null = null, bd = 1e9;
      for (const e of g.ents.values()) if (e.kind === Kind.MONSTER && e.hp > 0 && !e.deadAt) { const d = Math.hypot(e.x - g.px, e.y - g.py); if (d < bd) { bd = d; best = { x: e.x, y: e.y }; } }
      guide = best && bd > 120 ? best : best ? null : { x: GROVE.tx * TILE, y: (GROVE.ty + 6) * TILE };
      card = { title: `Tilki avla · ${Math.min(n, HUNT_N)}/${HUNT_N}`, text: 'Bir tilkiye dokun ya da tıkla, sonra saldırı düğmesine bas (bilgisayarda Boşluk). Tilkiler sen saldırmadıkça saldırmaz.', hi: ['[data-tut="attack"]'] };
    }
  }
  if (on && self && g && (tut & B_GROVE) && !card) {
    if (!(tut & B_POTION) && maxHp > 0 && hp > 0 && hp / maxHp < 0.5 && pots > 0) {
      card = { title: 'Canın yarının altına indi!', text: 'Kırmızı İksir iç: canının %20\'sini hemen doldurur. Q tuşu ya da parlayan iksir düğmesi.', btn: ['İksir iç', () => g.potion()], hi: ['[data-tut="potion"]'] };
    } else if ((tut & B_HUNT) && !(tut & B_BUY) && gems >= potGems) {
      card = { title: `${gems.toLocaleString('tr-TR')} Mücevherin var!`, text: `Sağ üstteki Market'ten ${potGems} Mücevhere Kırmızı İksir alabilirsin. Avda iksirsiz kalma.`, btn: ['Market\'i aç', () => store.set({ panel: 'essmarket' })], hi: ['.ess-btn'] };
    } else if ((tut & B_HUNT) && !(tut & B_SKILL) && gems >= 15 && self.level >= 2) {
      card = { title: 'Becerini geliştir!', text: 'Beceri penceresinde bir becerinin yanındaki Geliştir\'e bas: her kademe +%4 hasar. Bedeli Mücevherle ödenir.', btn: ['Becerileri aç', () => store.set({ panel: 'skills' })], hi: ['[data-tut="skills"]', '.mob-menu-btn'] };
    }
  }
  useEffect(() => { if (!done) return; if (done === B_HUNT) base.current = null; mark(done); if (doneMsg) setCheer(doneMsg); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  const hiKey = card?.hi ? card.hi.join('|') : '';
  useEffect(() => { glow(card?.hi?.[0] ?? null, card?.hi?.[1]); return () => glow(null); }, [hiKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (g) g.renderer.guide = guide; }, [guide?.x, guide?.y, g]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (currentGame) currentGame.renderer.guide = null; }, []);

  if (!on && !cheer) return null;
  if (!card && !cheer) return null;
  return (
    <div className="tut-card" onPointerDown={(e) => e.stopPropagation()}>
      <img className="tut-ic" src={iconUrl(cheer ? 'gem' : 'potion_red')} alt="" />
      <div className="tut-body">
        {cheer ? <><b>Süper!</b><span>{cheer}</span></> : card && <><b>{card.title}</b><span>{card.text}</span></>}
        {!cheer && card?.btn && <button className="btn small primary" onClick={() => { sfx.play('ui'); card!.btn![1](); }}>{card.btn[0]}</button>}
      </div>
      {!cheer && <button className="tut-x" title="Rehberi kapat" onClick={() => { if (confirm('Yeni oyuncu rehberini kapatmak istiyor musun?')) mark(B_OFF); }}>✕</button>}
    </div>
  );
}
void getLayout;
