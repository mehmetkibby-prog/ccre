// Yalnız geliştirme: sunucusuz 3B sahne ön izlemesi (ekran görüntüsü için).
import { Renderer3D } from './g3d/renderer3d.ts';
import { getLayout, Kind, Anim, MONSTER_INDEX, TUNING } from '@col/shared';
import type { CEnt } from './game/game.ts';
import { store } from './game/store.ts';
import { GUARDIAN_IMPACT_S } from './g3d/charAnims.ts';

const q = new URLSearchParams(location.search);
if (q.get('dn')) TUNING.dayNight.force = q.get('dn') as 'night'; // gece-gündüz önizlemesi
if (q.get('dark')) TUNING.dayNight.dark = Number(q.get('dark'));
const map = q.get('map') ?? 'bazaar';
const cls = (q.get('cls') ?? 'guardian') as 'guardian';
store.set({ settings: { ...store.get().settings, quality: (q.get('q') as 'high') ?? 'high', zoom: Number(q.get('zoom') ?? 1) } });
const l = getLayout(map);
// tx,ty: sahne merkezi karo olarak (video çekimi); yoksa doğma noktasına göre ox,oy
const ox = q.get('tx') ? Number(q.get('tx')) * 64 + 32 - l.spawn.x : Number(q.get('ox') ?? 0), oy = q.get('ty') ? Number(q.get('ty')) * 64 + 32 - l.spawn.y : Number(q.get('oy') ?? 0);
const g: any = { selfId: 1, cls, dx: l.spawn.x + ox, dy: l.spawn.y + oy, ents: new Map<number, CEnt>(), selfFlags: 0, selfAnim: Anim.IDLE, selfAnimStart: 0, lastMoveAt: 0, sdir: 64, targetId: 0, charId: 1, hoverId: 0, camYaw: 0 };
const r = new Renderer3D(g, document.getElementById('gl') as HTMLCanvasElement, document.getElementById('ov') as HTMLCanvasElement);
r.setLayout(l);
r.camYaw = Number(q.get('yaw') ?? 0); r.camZoom = Number(q.get('cz') ?? 1); r.camPitch = Number(q.get('cp') ?? 0.62);
store.set({ char: { id: 1, name: 'Çağlar', cls, role: 'player' }, hp: 100, maxHp: 100 });
let id = 10;
const mk = (kind: number, x: number, y: number, extra: Partial<CEnt>): CEnt => ({ id: id++, kind, x, y, samples: [{ t: 0, x, y }], dir: 64, anim: 0, animStart: 0, hp: 100, maxHp: 100, flags: 0, level: 5, name: '', cls: 0, variant: 0, tpl: 0, weapon: 0, wplus: 0, cos: Number(q.get('cos') ?? 0), guild: '', icon: '', rarity: 0, owner: 0, ttlEnd: 1e12, label: '', hurtUntil: 0, spawnAt: 0, deadAt: 0, ...extra });
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
// kalabalık denemesi: crowd=N oyuncu, karışık sınıf/ekipman/kozmetik, rastgele dolaşır
const crowd = Number(q.get('crowd') ?? 0);
const walkers: CEnt[] = [];
for (let i = 0; i < crowd; i++) {
  const a = (i / crowd) * Math.PI * 2, rr = 140 + (i % 5) * 70;
  const e = mk(Kind.PLAYER, sx + Math.cos(a) * rr, sy + Math.sin(a) * rr, { name: 'Oyuncu' + i, cls: i % 3, level: 10 + i, weapon: [0, 17, 34, 51, 68][i % 5], wplus: i % 7, cos: [0, 1, 2, 3, 4, 7][i % 6] });
  add(e); walkers.push(e);
}
if (lineup) {
  g.ents.clear();
  const list = lineup.startsWith('m:') ? lineup.slice(2).split(',').map((m) => ['M', m]) : lineup === 'chars' ? [['P', 0], ['P', 1], ['P', 2]] : lineup.startsWith('arm') ? [0, 1, 2, 3].map(() => ['P', Number(lineup.slice(3))]) : lineup.startsWith('p') ? [['P', Number(lineup.slice(1))]] : lineup === 'mons' ? [['M', 'shadow_wolf'], ['M', 'rot_guard'], ['M', 'essence_eater'], ['M', 'frost_lynx'], ['M', 'ice_golem'], ['M', 'blizzard_seer']] : [];
  list.forEach(([k, v], i) => {
    const x = sx + (i - (list.length - 1) / 2) * (lineup === 'mons' ? 110 : 75), y = sy + 20;
    if (k === 'P') add(mk(Kind.PLAYER, x, y, { name: ['Muhafız', 'Avcı', 'Arkanist'][v as number], cls: v as number, dir: Number(q.get('dir') ?? 64), level: 30, flags: (q.get('fishing') ? 128 : 0) | (q.get('mounted') ? 2 : 0), weapon: Number(q.get('gears')?.split(',')[i] ?? q.get('gear') ?? 3), wplus: Number(q.get('wpluses')?.split(',')[i] ?? q.get('wplus') ?? 0), cos: q.get('coses') ? Number(q.get('coses')!.split(',')[v as number] ?? 0) : Number(q.get('cos') ?? 0) }));
    else add(mk(Kind.MONSTER, x, y, { tpl: MONSTER_INDEX.get(v as string)!, variant: lineup.startsWith('m:') ? i : i % 2, dir: Number(q.get('dir') ?? 64), level: 20 }));
  });
  g.dx = sx - 1000; g.dy = sy; // kendini uzağa al (efekt görüş sınırı içinde kalsın)
  (r as any).camOverride = { x: sx, y: sy + 20, dist: Number(q.get('dist') ?? 6), pitch: Number(q.get('pitch') ?? 0.42) };
}
// serbest dizilim (video): ents=P,sınıf,silah,wplus,kozmetik,dx,dy,yön[,lonca][,bayrak];M,canavar,dx,dy,yön[,tür]  (dx,dy dünya birimi)
const entsQ = q.get('ents');
if (entsQ) {
  g.ents.clear();
  for (const it of entsQ.split(';').filter(Boolean)) {
    const a = it.split(',');
    if (a[0] === 'P') add(mk(Kind.PLAYER, sx + Number(a[5]), sy + Number(a[6]), { name: a[10] ?? ['Muhafız', 'Avcı', 'Arkanist'][Number(a[1])], cls: Number(a[1]), weapon: Number(a[2]), wplus: Number(a[3]), cos: Number(a[4]), dir: Number(a[7] ?? 64), level: 30 + (Number(a[1]) * 7) % 20, guild: a[8] ? a[8].replace('~', '|') : '', flags: Number(a[9] ?? 0) }));
    else add(mk(Kind.MONSTER, sx + Number(a[2]), sy + Number(a[3]), { tpl: MONSTER_INDEX.get(a[1])!, dir: Number(a[4] ?? 64), variant: Number(a[5] ?? 0), level: 30 }));
  }
  // kendi karakteri sahnenin ortasında ama gizli: silah/zırh parıltıları "yakındaki oyuncu" sınırına takılmasın
  if (q.get('selffar')) { g.dx = sx - 1000; g.dy = sy; } else { g.dx = sx; g.dy = sy; (window as any).__hideSelf = true; }
  (r as any).camOverride = { x: sx, y: sy + 20, dist: Number(q.get('dist') ?? 6), pitch: Number(q.get('pitch') ?? 0.42) };
}
// beceri efekti denemesi: sfx=sınıf,beceri,yol → oyuncu önündeki canavara periyodik beceri
const sfxq = q.get('sfx');
let sfxAt = -1e9; const sfxP = sfxq ? (() => { const [c] = sfxq.split(',').map(Number); g.ents.clear(); const P = mk(Kind.PLAYER, sx, sy, { name: '', cls: c, dir: 0, level: 30, weapon: Number(q.get('gear') ?? 3) }); add(P); const M = mk(Kind.MONSTER, sx + Number(q.get('tdist') ?? 260), sy, { tpl: MONSTER_INDEX.get(q.get('mon') ?? 'wild_fox')!, dir: 128, level: 20 }); add(M); g.dx = sx - 3000; g.dy = sy - 3000; (r as any).camOverride = { x: sx + Number(q.get('camx') ?? 140), y: sy + Number(q.get('camy') ?? 30), dist: Number(q.get('dist') ?? 9), pitch: Number(q.get('pitch') ?? 0.5) }; return { P, M }; })() : null;
(window as any).__sfx = (t: number) => {
  if (!sfxP || !sfxq) return;
  const [c, s, v] = sfxq.split(',').map(Number);
  const { P, M } = sfxP; P.anim = s === 0 ? Anim.ATTACK : Anim.CAST; P.animStart = t; P.skill = s;
  if (s === 0) {
    const combo = (window as any).__combo ?? 0; P.combo = combo; r.fx.sk.basic(c, P.id, M.id, { x: P.x, y: P.y }, { x: M.x, y: M.y }, true, combo);
    if (c === 0) setTimeout(() => { M.hurtUntil = performance.now() + 140; r.fx.sk.meleeImpact(P.id, { x: M.x, y: M.y }, Math.min(2.2, Math.max(0.45, r.fx.heightOf(M.id) * 0.5)), combo, !!q.get('crit'), true); }, GUARDIAN_IMPACT_S * 1000);
    return;
  }
  if (c === 0 && s === 3 && !v) r.fx.sk.dome(P.id, { x: P.x, y: P.y }, 3000, '#ffcf5a');
  r.fx.sk.play({ cls: c, skill: s, variant: v ?? 0, src: P.id, tgt: M.id, sp: { x: P.x, y: P.y }, tp: { x: M.x, y: M.y }, self: true, near: 0, now: t, shake: (n) => r.shake(n), hitStop: (ids, ms) => r.hitStop(ids, ms), sound: () => {} });
};
const anim = q.get('anim') ?? 'idle';
let last = performance.now();
let frames = 0; const maxFrames = Number(q.get('frames') ?? 1e9);
const loop = (t: number) => {
  // video çekimi (sahte saat): zaman ilerlemediyse aynı kare yeniden çizilmez (çekim 2-3 kat hızlanır)
  if (t === last && (window as any).__fk?.on) { requestAnimationFrame(loop); return; }
  const dt = t - last; last = t;
  if (anim === 'walk') { g.lastMoveAt = t; g.dy += 0; for (const e of g.ents.values()) if (e.kind === Kind.MONSTER) e.anim = Anim.WALK; }
  if (anim === 'attack' && t - g.selfAnimStart > 900) { g.selfAnim = Anim.ATTACK; g.selfAnimStart = t; }
  const period = Number(q.get('period') ?? 900);
  for (const e of g.ents.values()) if (e.kind !== Kind.LOOT && anim === 'attack' && t - e.animStart > period) { e.anim = Anim.ATTACK; e.animStart = t; e.combo = ((e.combo ?? -1) + 1) % 3; if (q.get('combo')) e.combo = Number(q.get('combo')); }
  for (const e of g.ents.values()) if (e.kind === Kind.PLAYER && anim === 'cast' && t - e.animStart > Number(q.get('period') ?? 1400)) { e.anim = Anim.CAST; e.animStart = t; e.skill = Number(q.get('skill') ?? 1); }
  if (q.get('stroll')) { for (const e of g.ents.values()) if (e.kind === Kind.PLAYER) { const ph = ((t / 1000) % 8) < 4; if (ph) { e.x += dt * Number(q.get('spd') ?? 0.09); e.dir = 0; } e.samples = [{ t: 0, x: e.x, y: e.y }]; const co = (r as any).camOverride; if (co) co.x = e.x; } }
  for (const [i, e] of walkers.entries()) { const a = t / 3000 + i; e.x += Math.cos(a) * dt * 0.08; e.y += Math.sin(a * 1.3) * dt * 0.08; e.dir = ((Math.atan2(Math.sin(a * 1.3), Math.cos(a)) / (Math.PI * 2)) * 256 + 256) % 256; e.anim = Anim.WALK; e.samples = [{ t: 0, x: e.x, y: e.y }]; }
  const ft = (window as any).__ft ??= []; ft.push(dt); if (ft.length > 600) ft.shift();
  (window as any).__phase = [...g.ents.values()].map((e: CEnt) => Math.round(t - e.animStart));
  if (sfxq && !q.get('manual') && t - sfxAt > Number(q.get('period') ?? 2600)) { sfxAt = t; (window as any).__sfx(t); }
  if ((window as any).__hideSelf) { const sv = (r as any).self; if (sv) sv.obj.visible = false; r.selfRing.visible = false; }
  r.draw(t, dt);
  if ((window as any).__hideSelf) { const sv = (r as any).self; if (sv) sv.obj.visible = false; }
  if (++frames >= maxFrames) { (window as any).done = true; return; }
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
(window as any).ready = true; (window as any).__r = r; (window as any).__g = g; (window as any).__store = store;
(window as any).__pose = (kind: 'a' | 's', idx: number, t: number) => { for (const v of (r as any).views.values()) v.glb?.debugPose?.(kind, idx, t); };
// geliştirme: klip anında silah ucu ve el, karakterin yerel ekseninde (x: sağ, y: yukarı, z: ileri; metre)
(window as any).__probe = (kind: 'a' | 's', idx: number, t: number) => {
  const out: Record<string, number[]> = {};
  for (const [id, v] of (r as any).views as Map<number, any>) {
    v.glb?.debugPose?.(kind, idx, t);
    v.obj.updateMatrixWorld(true);
    const inv = v.obj.matrixWorld.clone().invert();
    const loc = (p: any) => { const q = p.clone().applyMatrix4(inv); return [-q.x, q.y, q.z].map((n: number) => Math.round(n * 100) / 100); };
    const tip = r.fx.tipOf(id); const h = v.glb?.hand?.getWorldPosition(new (tip?.constructor ?? Object)());
    if (tip) out.tip = loc(tip); if (h) out.hand = loc(h);
    break;
  }
  return out;
};
