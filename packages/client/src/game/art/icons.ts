import { OUTLINE, ell, rr, fillStroke, vgrad, rgrad, shade, star, makeCanvas, type Ctx } from './draw.ts';

/** Eşya/arayüz ikonları: 64×64 çizilip dataURL olarak önbelleğe alınır. */
const cache = new Map<string, string>();
const RAR = ['#e8e6df', '#5fa8ff', '#ffa53d', '#ff4d5a', '#ffd84a', '#7cf3ff', '#c58bff', '#3ef09a'];

/** Meshy ile üretilmiş, saydam arka planlı 128×128 ikonlar (public/icons). Nadirlik çerçeveyle gösterilir. */
const PNG_ICONS = new Set(['armor_arcanist','armor_guardian','armor_hunter','boots','bow','bracelet','branch','chest','crystal','dust','earring','essence','gem','helm_arcanist','helm_guardian','helm_hunter','herb','iron','necklace','pearl_red','pearl_white','potion_red','scroll','scroll_evo','seal','seal_gold','staff','sword','talisman','w_arcanist_blue','w_arcanist_crimson','w_arcanist_orange','w_guardian_blue','w_guardian_crimson','w_guardian_orange','w_hunter_blue','w_hunter_crimson','w_hunter_orange']);
export function iconUrl(name: string, rarity = 0): string {
  if (PNG_ICONS.has(name)) return `icons/${name}.png`;
  const key = name + '|' + rarity;
  const c = cache.get(key);
  if (c) return c;
  const cv = makeCanvas(128, 128);
  const ctx = cv.getContext('2d')!;
  ctx.scale(2, 2);
  ctx.translate(32, 32);
  const tint = rarity > 0 ? RAR[rarity] : null;
  (ICONS[name] ?? ICONS.bag)(ctx, tint);
  const url = cv.toDataURL();
  cache.set(key, url);
  return url;
}
export function iconCanvas(name: string, rarity = 0): HTMLImageElement {
  const img = new Image();
  img.src = iconUrl(name, rarity);
  return img;
}

type P = (ctx: Ctx, tint: string | null) => void;
const metal = (ctx: Ctx, t: string | null, y0: number, y1: number) => vgrad(ctx, y0, y1, '#ffffff', t ?? '#a9b6c6');

const ICONS: Record<string, P> = {
  sword(ctx, t) {
    ctx.rotate(-Math.PI / 4);
    if (t) { ctx.shadowColor = t; ctx.shadowBlur = 8; }
    ctx.beginPath(); ctx.moveTo(-4, -26); ctx.lineTo(0, -32); ctx.lineTo(4, -26); ctx.lineTo(4, 8); ctx.lineTo(-4, 8); ctx.closePath(); fillStroke(ctx, metal(ctx, t, -32, 8), 2.2);
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, 6); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2; ctx.stroke();
    rr(ctx, -12, 8, 24, 5, 2); fillStroke(ctx, '#f0c75e', 2);
    rr(ctx, -2.5, 13, 5, 12, 1.5); fillStroke(ctx, '#7a4a2a', 1.6);
    ell(ctx, 0, 27, 4, 4); fillStroke(ctx, '#f0c75e', 1.6);
  },
  bow(ctx, t) {
    ctx.rotate(-Math.PI / 4);
    ctx.beginPath(); ctx.moveTo(-6, -26); ctx.quadraticCurveTo(18, 0, -6, 26); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = t ?? '#b07a44'; ctx.lineWidth = 4.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -26); ctx.lineTo(-6, 26); ctx.strokeStyle = '#f5efe0'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(16, 0); ctx.strokeStyle = '#6a4426'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(13, -4); ctx.lineTo(13, 4); ctx.closePath(); fillStroke(ctx, '#dfe6ee', 1.4);
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-25, -4); ctx.moveTo(-20, 0); ctx.lineTo(-25, 4); ctx.strokeStyle = '#e65b5b'; ctx.lineWidth = 2; ctx.stroke();
  },
  staff(ctx, t) {
    ctx.rotate(-Math.PI / 4);
    rr(ctx, -2.5, -14, 5, 42, 2); fillStroke(ctx, vgrad(ctx, -14, 28, '#9a6a3e', '#5a3a20'), 1.8);
    ctx.beginPath(); ctx.moveTo(-8, -14); ctx.quadraticCurveTo(-10, -24, -3, -28); ctx.moveTo(8, -14); ctx.quadraticCurveTo(10, -24, 3, -28); ctx.strokeStyle = '#ffd66b'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.shadowColor = t ?? '#7cf3ff'; ctx.shadowBlur = 12;
    ell(ctx, 0, -22, 7.5, 7.5); fillStroke(ctx, rgrad(ctx, 0, -22, 8, '#ffffff', t ?? '#7cf3ff'), 1.8);
    ctx.shadowBlur = 0;
  },
  armor_guardian(ctx, t) { armor(ctx, t ?? '#8fa6c2', '#f0c75e', 'plate'); },
  armor_hunter(ctx, t) { armor(ctx, t ? shade(t, -0.2) : '#6cab5a', '#c99a5b', 'vest'); },
  armor_arcanist(ctx, t) { armor(ctx, t ? shade(t, -0.15) : '#8a6ae3', '#ffd66b', 'robe'); },
  helm_guardian(ctx, t) {
    ctx.beginPath(); ctx.arc(0, 4, 20, Math.PI, 0); ctx.lineTo(20, 14); ctx.lineTo(-20, 14); ctx.closePath(); fillStroke(ctx, metal(ctx, t, -16, 14), 2.4);
    rr(ctx, -3, -18, 6, 30, 2); fillStroke(ctx, '#f0c75e', 1.6);
    rr(ctx, -14, 2, 9, 4, 1.5); ctx.fillStyle = OUTLINE; ctx.fill(); rr(ctx, 5, 2, 9, 4, 1.5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.quadraticCurveTo(10, -30, 22, -24); ctx.strokeStyle = '#c8414f'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
  },
  helm_hunter(ctx, t) {
    ctx.beginPath(); ctx.moveTo(-20, 18); ctx.lineTo(-20, 0); ctx.arc(0, 0, 20, Math.PI, 0); ctx.lineTo(20, 18); ctx.lineTo(13, 18); ctx.quadraticCurveTo(14, -6, 0, -8); ctx.quadraticCurveTo(-14, -6, -13, 18); ctx.closePath();
    fillStroke(ctx, vgrad(ctx, -20, 18, t ?? '#5f9f5c', shade(t ?? '#4f8f4c', -0.3)), 2.2);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 7, -18); ctx.lineTo(s * 14, -30); ctx.lineTo(s * 17, -14); ctx.closePath(); fillStroke(ctx, t ?? '#4f8f4c', 1.8); }
  },
  helm_arcanist(ctx, t) {
    ell(ctx, 0, 14, 24, 7); fillStroke(ctx, shade(t ?? '#6d52cf', -0.1), 2);
    ctx.beginPath(); ctx.moveTo(-16, 12); ctx.quadraticCurveTo(-4, -16, 12, -28); ctx.quadraticCurveTo(6, -6, 16, 12); ctx.closePath(); fillStroke(ctx, vgrad(ctx, -28, 12, shade(t ?? '#6d52cf', 0.25), shade(t ?? '#6d52cf', -0.2)), 2);
    star(ctx, 0, 0, 5); fillStroke(ctx, '#ffd66b', 1.2);
  },
  boots(ctx, t) {
    for (const [x, s] of [[-8, 0.9], [6, 1]] as const) {
      ctx.save(); ctx.translate(x, 0); ctx.scale(s, s);
      ctx.beginPath(); ctx.moveTo(-6, -20); ctx.lineTo(6, -20); ctx.lineTo(7, 8); ctx.lineTo(18, 12); ctx.quadraticCurveTo(20, 20, 12, 20); ctx.lineTo(-7, 20); ctx.closePath();
      fillStroke(ctx, vgrad(ctx, -20, 20, t ? shade(t, -0.1) : '#9a6a3e', '#5a3a20'), 2);
      rr(ctx, -8, -22, 16, 6, 2); fillStroke(ctx, '#c99a5b', 1.6);
      ctx.restore();
    }
  },
  necklace(ctx, t) {
    ctx.beginPath(); ctx.arc(0, -6, 20, 0.2, Math.PI - 0.2); ctx.strokeStyle = '#f0c75e'; ctx.lineWidth = 3; ctx.stroke();
    for (let i = 0; i < 9; i++) { const a = 0.25 + (i / 8) * (Math.PI - 0.5); ell(ctx, Math.cos(a) * 20, -6 + Math.sin(a) * 20, 2.2, 2.2); ctx.fillStyle = '#ffe9a0'; ctx.fill(); }
    ctx.shadowColor = t ?? '#ff6a8a'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(8, 16); ctx.lineTo(0, 28); ctx.lineTo(-8, 16); ctx.closePath(); fillStroke(ctx, rgrad(ctx, 0, 18, 10, '#ffffff', t ?? '#ff6a8a'), 2);
    ctx.shadowBlur = 0;
  },
  earring(ctx, t) {
    for (const x of [-10, 10]) {
      ell(ctx, x, -14, 5, 5); ctx.strokeStyle = '#f0c75e'; ctx.lineWidth = 2.6; ctx.stroke();
      ctx.shadowColor = t ?? '#7cf3ff'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(x, -6); ctx.quadraticCurveTo(x + 8, 8, x, 20); ctx.quadraticCurveTo(x - 8, 8, x, -6); ctx.closePath(); fillStroke(ctx, rgrad(ctx, x, 8, 10, '#ffffff', t ?? '#7cf3ff'), 1.8);
      ctx.shadowBlur = 0;
    }
  },
  bracelet(ctx, t) {
    ell(ctx, 0, 4, 22, 14); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 10; ctx.stroke(); ctx.strokeStyle = '#f0c75e'; ctx.lineWidth = 7; ctx.stroke();
    ell(ctx, 0, 2, 22, 14); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    for (const [x, y] of [[-14, 15], [0, 18], [14, 15]] as const) { ctx.shadowColor = t ?? '#3ef09a'; ctx.shadowBlur = 6; ell(ctx, x, y, 4, 4); fillStroke(ctx, t ?? '#3ef09a', 1.4); ctx.shadowBlur = 0; }
  },
  potion_red(ctx) { potion(ctx, '#ff4d5a'); },
  seal(ctx) { seal(ctx, '#ff8a3d', '#ffd27a'); },
  seal_gold(ctx) { seal(ctx, '#ffd84a', '#fff6c2'); },
  branch(ctx) {
    ctx.rotate(-0.5);
    ctx.beginPath(); ctx.moveTo(-24, 6); ctx.quadraticCurveTo(0, -2, 24, 2); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = '#9c6b3c'; ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(10, -14); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = '#9c6b3c'; ctx.lineWidth = 3.5; ctx.stroke();
    for (const [x, y] of [[10, -16], [24, 0], [-10, 2]] as const) { ell(ctx, x, y - 4, 6, 3.5, -0.6); fillStroke(ctx, '#7fcf5a', 1.6); }
  },
  crystal(ctx) { gem(ctx, '#7fd6ff'); },
  herb(ctx) {
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(0, 22); ctx.quadraticCurveTo(i * 8, 0, i * 12, -18 + Math.abs(i) * 4); ctx.strokeStyle = '#7a8a3a'; ctx.lineWidth = 3; ctx.stroke(); ell(ctx, i * 12, -20 + Math.abs(i) * 4, 5, 8, i * 0.3); fillStroke(ctx, '#c9b458', 1.6); }
    rr(ctx, -6, 16, 12, 8, 2); fillStroke(ctx, '#c8414f', 1.4);
  },
  scroll(ctx) { scroll(ctx, '#e8d6a8', '#c8414f'); },
  scroll_evo(ctx) { scroll(ctx, '#d6c4ff', '#7b5cd6'); },
  iron(ctx) {
    ctx.beginPath(); ctx.moveTo(-22, 8); ctx.lineTo(-14, -10); ctx.lineTo(18, -10); ctx.lineTo(24, 8); ctx.closePath(); fillStroke(ctx, vgrad(ctx, -10, 8, '#b8bec6', '#6d7682'), 2);
    ctx.beginPath(); ctx.moveTo(-22, 8); ctx.lineTo(24, 8); ctx.lineTo(24, 16); ctx.lineTo(-22, 16); ctx.closePath(); fillStroke(ctx, '#5a626e', 2);
    ell(ctx, -4, 0, 4, 2); ctx.fillStyle = '#a0643a'; ctx.fill(); ell(ctx, 10, -4, 3, 1.6); ctx.fill();
  },
  pearl_white(ctx) { pearl(ctx, '#ffffff', '#c8c4e8'); },
  pearl_red(ctx) { pearl(ctx, '#ffd0d6', '#ff4d6a'); },
  dust(ctx) {
    ell(ctx, 0, 12, 24, 10); fillStroke(ctx, vgrad(ctx, 2, 22, '#e6e0d6', '#a8a296'), 2);
    for (let i = 0; i < 12; i++) { ell(ctx, -16 + (i * 37) % 32, 4 + (i * 13) % 12, 1.8, 1.8); ctx.fillStyle = i % 2 ? '#fff' : '#c8c2b8'; ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(-20, 12); ctx.quadraticCurveTo(0, -18, 20, 12); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
  },
  talisman(ctx) { gem(ctx, '#5ce0b0', true); },
  chest(ctx) {
    rr(ctx, -24, -6, 48, 28, 4); fillStroke(ctx, vgrad(ctx, -6, 22, '#c08a4a', '#7a4e2a'), 2.2);
    ctx.beginPath(); ctx.moveTo(-24, -4); ctx.quadraticCurveTo(-24, -24, 0, -24); ctx.quadraticCurveTo(24, -24, 24, -4); ctx.closePath(); fillStroke(ctx, vgrad(ctx, -24, -4, '#d6a060', '#9a6a3a'), 2.2);
    for (const x of [-16, 14]) { ctx.fillStyle = '#f0c75e'; ctx.fillRect(x, -22, 4, 44); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.strokeRect(x, -22, 4, 44); }
    rr(ctx, -6, -8, 12, 12, 2); fillStroke(ctx, '#f0c75e', 1.8); ell(ctx, 0, -1, 2, 2.6); ctx.fillStyle = OUTLINE; ctx.fill();
    ctx.shadowColor = '#ffe680'; ctx.shadowBlur = 10; star(ctx, 16, -24, 5); ctx.fillStyle = '#fff6c2'; ctx.fill(); ctx.shadowBlur = 0;
  },
  gem(ctx) { gem(ctx, '#3ef09a'); },
  essence(ctx) {
    ctx.shadowColor = '#7cf3ff'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.quadraticCurveTo(18, -2, 12, 12); ctx.quadraticCurveTo(0, 26, -12, 12); ctx.quadraticCurveTo(-18, -2, 0, -24); ctx.closePath();
    fillStroke(ctx, rgrad(ctx, 0, 4, 20, '#e8ffff', '#3ac8e8'), 2);
    ctx.shadowBlur = 0; ell(ctx, -4, 0, 3.5, 5); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
  },
  cp(ctx) {
    ell(ctx, 0, 0, 22, 22); fillStroke(ctx, rgrad(ctx, 0, 0, 24, '#fff2a8', '#e0a020'), 2.4);
    ell(ctx, 0, 0, 15, 15); ctx.strokeStyle = '#b07a10'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#8a5a00'; ctx.font = 'bold 15px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ÇP', 0, 1);
  },
  bag(ctx) {
    ctx.beginPath(); ctx.moveTo(-18, -6); ctx.quadraticCurveTo(-24, 24, 0, 24); ctx.quadraticCurveTo(24, 24, 18, -6); ctx.closePath(); fillStroke(ctx, vgrad(ctx, -6, 24, '#c99a5b', '#8a5e34'), 2.2);
    rr(ctx, -12, -16, 24, 10, 4); fillStroke(ctx, '#a07040', 2);
  },
  skull(ctx) { ell(ctx, 0, -2, 18, 17); fillStroke(ctx, '#f1ead8', 2.2); ell(ctx, -7, 0, 5, 6); ctx.fillStyle = OUTLINE; ctx.fill(); ell(ctx, 7, 0, 5, 6); ctx.fill(); rr(ctx, -8, 14, 16, 8, 2); fillStroke(ctx, '#f1ead8', 2); },
};

function armor(ctx: Ctx, c: string, trim: string, kind: 'plate' | 'vest' | 'robe') {
  ctx.beginPath();
  if (kind === 'robe') { ctx.moveTo(-12, -22); ctx.lineTo(-26, -12); ctx.lineTo(-20, -4); ctx.lineTo(-16, -8); ctx.lineTo(-20, 26); ctx.lineTo(20, 26); ctx.lineTo(16, -8); ctx.lineTo(20, -4); ctx.lineTo(26, -12); ctx.lineTo(12, -22); ctx.quadraticCurveTo(0, -14, -12, -22); }
  else { ctx.moveTo(-12, -22); ctx.lineTo(-26, -14); ctx.lineTo(-22, 0); ctx.lineTo(-16, -2); ctx.lineTo(-16, 22); ctx.quadraticCurveTo(0, 26, 16, 22); ctx.lineTo(16, -2); ctx.lineTo(22, 0); ctx.lineTo(26, -14); ctx.lineTo(12, -22); ctx.quadraticCurveTo(0, -14, -12, -22); }
  ctx.closePath();
  fillStroke(ctx, vgrad(ctx, -22, 26, shade(c, 0.3), shade(c, -0.25)), 2.4);
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 22); ctx.strokeStyle = trim; ctx.lineWidth = 2.6; ctx.stroke();
  ctx.fillStyle = trim; ctx.fillRect(-16, 8, 32, 4);
  if (kind === 'plate') { ell(ctx, -16, -14, 7, 5); fillStroke(ctx, shade(c, 0.2), 1.8); ell(ctx, 16, -14, 7, 5); fillStroke(ctx, shade(c, 0.2), 1.8); }
}
function potion(ctx: Ctx, c: string) {
  rr(ctx, -5, -26, 10, 10, 2); fillStroke(ctx, '#c08a5a', 1.8);
  ctx.beginPath(); ctx.moveTo(-6, -18); ctx.lineTo(-6, -10); ctx.quadraticCurveTo(-22, -4, -20, 10); ctx.quadraticCurveTo(-16, 26, 0, 26); ctx.quadraticCurveTo(16, 26, 20, 10); ctx.quadraticCurveTo(22, -4, 6, -10); ctx.lineTo(6, -18); ctx.closePath();
  fillStroke(ctx, 'rgba(230,245,255,0.6)', 2.2);
  ctx.save(); ctx.clip(); ctx.fillStyle = vgrad(ctx, -2, 26, shade(c, 0.25), shade(c, -0.25)); ctx.fillRect(-24, -2, 48, 30); ctx.restore();
  ell(ctx, -8, 4, 3.5, 7, 0.3); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
  ell(ctx, 4, 12, 2, 2); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
}
function seal(ctx: Ctx, c: string, hi: string) {
  ctx.shadowColor = c; ctx.shadowBlur = 8;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ell(ctx, Math.cos(a) * 18, Math.sin(a) * 18, 6, 6); ctx.fillStyle = c; ctx.fill(); }
  ctx.shadowBlur = 0;
  ell(ctx, 0, 0, 20, 20); fillStroke(ctx, rgrad(ctx, 0, 0, 22, hi, c), 2.2);
  star(ctx, 0, 0, 10, 6, 0.5); fillStroke(ctx, hi, 1.6);
}
function gem(ctx: Ctx, c: string, round = false) {
  ctx.shadowColor = c; ctx.shadowBlur = 10;
  ctx.beginPath();
  if (round) { ctx.moveTo(0, -22); ctx.lineTo(18, -6); ctx.lineTo(12, 20); ctx.lineTo(-12, 20); ctx.lineTo(-18, -6); }
  else { ctx.moveTo(-18, -8); ctx.lineTo(-8, -20); ctx.lineTo(8, -20); ctx.lineTo(18, -8); ctx.lineTo(0, 22); }
  ctx.closePath(); fillStroke(ctx, vgrad(ctx, -22, 22, shade(c, 0.5), shade(c, -0.3)), 2.2);
  ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(18, -8); ctx.moveTo(-8, -20); ctx.lineTo(-4, -8); ctx.lineTo(0, 22); ctx.moveTo(8, -20); ctx.lineTo(4, -8); ctx.lineTo(0, 22);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.3; ctx.stroke();
}
function pearl(ctx: Ctx, a: string, b: string) {
  ell(ctx, 0, 16, 22, 7); fillStroke(ctx, '#8a6ab0', 2);
  ctx.shadowColor = b; ctx.shadowBlur = 10;
  ell(ctx, 0, 0, 16, 16); fillStroke(ctx, rgrad(ctx, 0, 0, 18, a, b), 2.2);
  ctx.shadowBlur = 0; ell(ctx, -5, -6, 5, 3.5, -0.5); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
}
function scroll(ctx: Ctx, paper: string, ribbon: string) {
  rr(ctx, -20, -18, 40, 36, 3); fillStroke(ctx, vgrad(ctx, -18, 18, '#fff8e6', paper), 2);
  for (const y of [-20, 20]) { ell(ctx, 0, y, 22, 4.5); fillStroke(ctx, shade(paper, -0.1), 1.8); }
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-13, -9 + i * 6); ctx.lineTo(13 - (i % 2) * 6, -9 + i * 6); ctx.strokeStyle = 'rgba(80,60,40,0.45)'; ctx.lineWidth = 1.5; ctx.stroke(); }
  rr(ctx, -4, -4, 8, 26, 1); ctx.fillStyle = ribbon; ctx.fill();
  ell(ctx, 0, 10, 6, 6); fillStroke(ctx, ribbon, 1.6);
}
