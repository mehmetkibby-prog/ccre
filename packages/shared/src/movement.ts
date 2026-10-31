import { DIR_STEPS, INPUT_DT, PLAYER_RADIUS, NO_DIR } from './constants.ts';
import { isBlockedAt, type MapLayout } from './mapgen.ts';

const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
/** Yön tablosu: tarayıcı motorları arasında trig farkını sabitlemek için yuvarlanmış. */
export const DIR_VEC: [number, number][] = Array.from({ length: DIR_STEPS }, (_, i) => {
  const a = (i / DIR_STEPS) * Math.PI * 2;
  return [r6(Math.cos(a)), r6(Math.sin(a))];
});
export function dirIndexFromVector(x: number, y: number): number {
  if (x === 0 && y === 0) return NO_DIR;
  let a = Math.atan2(y, x);
  if (a < 0) a += Math.PI * 2;
  return Math.round((a / (Math.PI * 2)) * DIR_STEPS) % DIR_STEPS;
}

function boxBlocked(l: MapLayout, x: number, y: number, r: number): boolean {
  // ayak çevresi kutusu (2.5B: gövde ayakta)
  return isBlockedAt(l, x - r, y - r * 0.6) || isBlockedAt(l, x + r, y - r * 0.6) || isBlockedAt(l, x - r, y + r * 0.4) || isBlockedAt(l, x + r, y + r * 0.4);
}

/** Tek hareket komutu: istemci öngörüsü ve sunucu aynı fonksiyonu kullanır. */
export function stepMove(l: MapLayout, pos: { x: number; y: number }, dir: number, speed: number): void {
  if (dir === NO_DIR || dir >= DIR_STEPS) return;
  const [vx, vy] = DIR_VEC[dir];
  const d = speed * INPUT_DT;
  const nx = pos.x + vx * d;
  if (!boxBlocked(l, nx, pos.y, PLAYER_RADIUS)) pos.x = nx;
  else {
    // köşeden kayma
    const slideX = pos.x + Math.sign(vx) * d * 0.15;
    if (Math.abs(vx) > 0.3 && !boxBlocked(l, slideX, pos.y, PLAYER_RADIUS)) pos.x = slideX;
  }
  const ny = pos.y + vy * d;
  if (!boxBlocked(l, pos.x, ny, PLAYER_RADIUS)) pos.y = ny;
  pos.x = Math.round(pos.x * 100) / 100;
  pos.y = Math.round(pos.y * 100) / 100;
}

export function canStand(l: MapLayout, x: number, y: number): boolean {
  return !boxBlocked(l, x, y, PLAYER_RADIUS);
}
/** Yakındaki ilk yürünebilir nokta (ışınlanma/doğuş için). */
export function nearestFree(l: MapLayout, x: number, y: number): { x: number; y: number } {
  if (canStand(l, x, y)) return { x, y };
  for (let r = 16; r < 800; r += 16) {
    for (let a = 0; a < 16; a++) {
      const px = x + Math.cos((a / 16) * Math.PI * 2) * r, py = y + Math.sin((a / 16) * Math.PI * 2) * r;
      if (canStand(l, px, py)) return { x: px, y: py };
    }
  }
  return { x: l.spawn.x, y: l.spawn.y };
}
