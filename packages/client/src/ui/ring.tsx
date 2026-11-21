/**
 * Pazar Köyü Kan Meydanı: meydanın içindeyken ekranın en solunda, ortada küçük panel: bugün kim kaç kişi öldürdü.
 * Meydandan çıkınca kapanır. Girişte/çıkışta kısa bildirim.
 */
import React, { useEffect, useState } from 'react';
import { inPvpRing, PVP_RING } from '@col/shared';
import type { Game } from '../game/game.ts';
import { useStore, notify } from '../game/store.ts';

export function RingPanel({ game }: { game: Game }) {
  const board = useStore((s) => s.ringBoard);
  const map = useStore((s) => s.map);
  const me = useStore((s) => s.char?.name ?? '');
  const [inside, setInside] = useState(false);
  useEffect(() => {
    if (map !== PVP_RING.map) { setInside(false); return; }
    let was = inPvpRing(map, game.px, game.py);
    setInside(was);
    const iv = setInterval(() => {
      const now = inPvpRing(map, game.px, game.py);
      if (now !== was) {
        notify(now ? `${PVP_RING.name}: burada herkes birbirine saldırabilir! Adın kırmızı.` : `${PVP_RING.name}'ndan çıktın.`, now ? 'error' : 'info');
        was = now; setInside(now);
      }
    }, 250);
    return () => clearInterval(iv);
  }, [map, game]);
  if (!inside) return null;
  const list = board?.board ?? [];
  const mine = list.find((b) => b.name === me)?.n ?? 0;
  return (
    <div className="ring-panel">
      <div className="rp-h"><span className="rp-ic">⚔</span><b>{PVP_RING.name}</b><small>bugün</small></div>
      {list.length === 0 ? <div className="rp-empty">Bugün henüz kimse düşmedi. İlk kanı sen dök!</div> : (
        <ol className="rp-list">
          {list.map((b, i) => <li key={b.name} className={(b.name === me ? 'me ' : '') + (i < 3 ? 'top' + (i + 1) : '')}><span className="rp-i">{i + 1}</span><span className="rp-n">{b.name}</span><b>{b.n}</b></li>)}
        </ol>
      )}
      <div className="rp-me">Senin: <b>{mine}</b> öldürme</div>
    </div>
  );
}
