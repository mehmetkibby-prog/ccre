// Yalnız geliştirme: sunucusuz 3B sahne ön izlemesi (ekran görüntüsü için).
import { Renderer3D } from './g3d/renderer3d.ts';
import { getLayout, Kind, Anim, MONSTER_INDEX } from '@col/shared';
import type { CEnt } from './game/game.ts';
import { store } from './game/store.ts';

const q = new URLSearchParams(location.search);
const map = q.get('map') ?? 'bazaar';
const cls = (q.get('cls') ?? 'guardian') as 'guardian';
store.set({ settings: { ...store.get().settings, quality: (q.get('q') as 'high') ?? 'high', zoom: Number(q.get('zoom') ?? 1) } });
const l = getLayout(map);
const ox = Number(q.get('ox') ?? 0), oy = Number(q.get('oy') ?? 0);
const g: any = { selfId: 1, cls, dx: l.spawn.x + ox, dy: l.spawn.y + oy, ents: new Map<number, CEnt>(), selfFlags: 0, selfAnim: Anim.IDLE, selfAnimStart: 0, lastMoveAt: 0, sdir: 64, targetId: 0, charId: 1, hoverId: 0, camYaw: 0 };
const r = new Renderer3D(g, document.getElementById('gl') as HTMLCanvasElement, document.getElementById('ov') as HTMLCanvasElement);
r.setLayout(l);
r.camYaw = Number(q.get('yaw') ?? 0); r.camZoom = Number(q.get('cz') ?? 1);
store.set({ char: { id: 1, name: 'Çağlar', cls, role: 'player' }, hp: 100, maxHp: 100 });
let id = 10;
const mk = (kind: number, x: number, y: number, extra: Partial<CEnt>): CEnt => ({ id: id++, kind, x, y, samples: [{ t: 0, x, y }], dir: 64, anim: 0, animStart: 0, hp: 100, maxHp: 100, flags: 0, level: 5, name: '', cls: 0, variant: 0, tpl: 0, weapon: 0, guild: '', icon: '', rarity: 0, owner: 0, ttlEnd: 1e12, label: '', hurtUntil: 0, spawnAt: 0, deadAt: 0, ...extra });
const add = (e: CEnt) => g.ents.set(e.id, e);
const sx = g.dx, sy = g.dy;
if (q.get('show') !== 'none') {
  add(mk(Kind.PLAYER, sx + 110, sy + 20, { name: 'Ayşe', cls: 1, dir: 90, level: 12 }));
  add(mk(Kind.PLAYER, sx - 110, sy + 30, { name: 'Mert', cls: 2, dir: 40, level: 18, weapon: 6 }));
  const mons = q.get('mons') ?? (map === 'forest' ? 'shadow_wolf,rot_guard,essence_eater' : '');
  mons.split(',').filter(Boolean).forEach((m, i) => add(mk(Kind.MONSTER, sx - 160 + i * 150, sy + 170, { tpl: MONSTER_INDEX.get(m)!, variant: i % 3, dir: 200, hp: 60, maxHp: 100, level: 7 })));
  add(mk(Kind.LOOT, sx + 50, sy + 110, { icon: 'sword', rarity: 2, owner: 1, label: 'Turuncu Kılıç' }));
}
const lineup = q.get('lineup');
if (lineup) {
  g.ents.clear();
  const list = lineup === 'chars' ? [['P', 0], ['P', 1], ['P', 2]] : lineup === 'mons' ? [['M', 'shadow_wolf'], ['M', 'rot_guard'], ['M', 'essence_eater'], ['M', 'frost_lynx'], ['M', 'ice_golem'], ['M', 'blizzard_seer']] : [];
  list.forEach(([k, v], i) => {
    const x = sx + (i - (list.length - 1) / 2) * (lineup === 'mons' ? 110 : 75), y = sy + 20;
    if (k === 'P') add(mk(Kind.PLAYER, x, y, { name: ['Muhafız', 'Avcı', 'Arkanist'][v as number], cls: v as number, dir: Number(q.get('dir') ?? 64), level: 30, weapon: 3 }));
    else add(mk(Kind.MONSTER, x, y, { tpl: MONSTER_INDEX.get(v as string)!, variant: i % 2, dir: 64, level: 20 }));
  });
  g.dx = sx - 1000; g.dy = sy - 1000; // kendini uzağa al
  (r as any).camOverride = { x: sx, y: sy + 20, dist: Number(q.get('dist') ?? 6), pitch: Number(q.get('pitch') ?? 0.42) };
}
const anim = q.get('anim') ?? 'idle';
let last = performance.now();
let frames = 0; const maxFrames = Number(q.get('frames') ?? 1e9);
const loop = (t: number) => {
  const dt = t - last; last = t;
  if (anim === 'walk') { g.lastMoveAt = t; g.dy += 0; }
  if (anim === 'attack' && t - g.selfAnimStart > 900) { g.selfAnim = Anim.ATTACK; g.selfAnimStart = t; }
  for (const e of g.ents.values()) if (e.kind !== Kind.LOOT && anim === 'attack' && t - e.animStart > 900) { e.anim = Anim.ATTACK; e.animStart = t; }
  r.draw(t, dt);
  if (++frames >= maxFrames) { (window as any).done = true; return; }
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
(window as any).ready = true;
