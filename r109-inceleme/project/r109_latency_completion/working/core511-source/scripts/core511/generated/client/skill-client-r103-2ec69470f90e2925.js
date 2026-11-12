// ccre/r103_skills/working/core511-source/scripts/core511/skill-visuals-r103.mjs
var TAU = Math.PI * 2;
var clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
var ease = (t) => 1 - (1 - clamp(t)) ** 3;
var phase = (t, a, b) => clamp((t - a) / (b - a));
var noise = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
var finitePoint = (p) => Number.isFinite(p?.x) && Number.isFinite(p?.y);
var colors = {
  gold: ["#ffb53f", "#ff6b21", "#fff2bd"],
  steel: ["#6fcfff", "#377fff", "#fff1c0"],
  jade: ["#6fffb0", "#12b886", "#eaffdb"],
  ice: ["#5cdeff", "#377bff", "#edffff"],
  violet: ["#c58aff", "#712bff", "#f6e7ff"],
  life: ["#91ffc0", "#1bd29f", "#fff3b0"]
};
var SKILLS_R103 = Object.freeze([
  { id: "muhafiz-0", role: "muhafiz", ability: 0, name: "K\u0131l\u0131\xE7 Darbesi", style: "slash", palette: "gold", duration: 720 },
  { id: "muhafiz-1", role: "muhafiz", ability: 1, name: "Kalkan Zinciri", style: "chain", palette: "steel", duration: 1080 },
  { id: "muhafiz-2", role: "muhafiz", ability: 2, name: "Muhaf\u0131z Hamlesi", style: "dash", palette: "gold", duration: 1e3 },
  { id: "muhafiz_tank", role: "muhafiz", ability: 3, name: "\xC7elik \u0130rade", style: "guard", palette: "steel", duration: 1500 },
  { id: "muhafiz_strike", role: "muhafiz", ability: 3, name: "H\xFCk\xFCm Darbesi", style: "judgment", palette: "gold", duration: 1400 },
  { id: "avci-0", role: "avci", ability: 0, name: "H\u0131zl\u0131 At\u0131\u015F", style: "arrow", palette: "jade", duration: 760 },
  { id: "avci-1", role: "avci", ability: 1, name: "Delici Ok", style: "pierce", palette: "ice", duration: 1e3 },
  { id: "avci-2", role: "avci", ability: 2, name: "Ok Ya\u011Fmuru", style: "rain", palette: "jade", duration: 1400 },
  { id: "avci_sharp", role: "avci", ability: 3, name: "\u015Eafak Oku", style: "dawn", palette: "gold", duration: 1400 },
  { id: "avci_trap", role: "avci", ability: 3, name: "K\xF6k Oku", style: "root", palette: "jade", duration: 1500 },
  { id: "arkanist-0", role: "arkanist", ability: 0, name: "Ark At\u0131\u015F\u0131", style: "orb", palette: "violet", duration: 800 },
  { id: "arkanist-1", role: "arkanist", ability: 1, name: "Ruh M\u0131zra\u011F\u0131", style: "spear", palette: "ice", duration: 1100 },
  { id: "arkanist-2", role: "arkanist", ability: 2, name: "Y\u0131ld\u0131r\u0131m \xC7emberi", style: "storm", palette: "violet", duration: 1450 },
  { id: "arkanist_burst", role: "arkanist", ability: 3, name: "\xD6z Patlamas\u0131", style: "nova", palette: "violet", duration: 1500 },
  { id: "arkanist_heal", role: "arkanist", ability: 3, name: "Ya\u015Fam Dalgas\u0131", style: "heal", palette: "life", duration: 1600 }
].map(Object.freeze));
var specs = new Map(SKILLS_R103.map((s) => [s.id, s]));
var defaults = { muhafiz: "muhafiz_strike", avci: "avci_sharp", arkanist: "arkanist_burst" };
var sprites = /* @__PURE__ */ new Map();
var blasts = /* @__PURE__ */ new Map();
function blastSprite(p) {
  if (blasts.has(p[0])) return;
  const c = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(192, 192) : typeof document === "object" ? document.createElement("canvas") : null;
  if (!c) return;
  c.width = c.height = 192;
  const g = c.getContext("2d");
  if (!g) return;
  g.translate(96, 96);
  g.globalCompositeOperation = "lighter";
  for (let layer = 0; layer < 3; layer++) {
    const r = 42 + layer * 16, gradient = g.createRadialGradient(0, 0, r * 0.22, 0, 0, r * 1.14);
    gradient.addColorStop(0, p[1] + "00");
    gradient.addColorStop(0.42, p[1] + "18");
    gradient.addColorStop(0.68, p[0] + "50");
    gradient.addColorStop(0.82, p[2] + "a0");
    gradient.addColorStop(1, p[0] + "00");
    g.fillStyle = gradient;
    g.beginPath();
    for (let i = 0; i <= 100; i++) {
      const a = i / 100 * TAU, v = r * (0.8 + 0.22 * noise(i + layer * 101) + 0.08 * Math.sin(a * 9));
      const x = Math.cos(a) * v, y = Math.sin(a) * v;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
    g.fill();
  }
  g.lineCap = "round";
  for (let i = 0; i < 23; i++) {
    const a = i * 2.399963, rr = 35 + noise(i + 71) * 42, span = 0.13 + noise(i + 21) * 0.31;
    g.strokeStyle = i % 3 ? p[0] + "9a" : p[2] + "d0";
    g.lineWidth = 1 + noise(i + 6) * 2.5;
    g.beginPath();
    g.arc(0, 0, rr, a, a + span);
    g.stroke();
  }
  blasts.set(p[0], c);
}
function blast(ctx, x, y, r, p, t, ground = false, low = false) {
  const sprite = blasts.get(p[0]);
  if (!sprite) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ground ? 0.48 : 0.86);
  ctx.rotate(t * 0.12);
  ctx.globalAlpha *= (1 - t) ** 1.15 * (low ? 0.65 : 0.85);
  ctx.drawImage(sprite, -r, -r, r * 2, r * 2);
  ctx.restore();
}
function glowSprite(color) {
  if (sprites.has(color)) return sprites.get(color);
  const c = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(96, 96) : typeof document === "object" ? document.createElement("canvas") : null;
  if (!c) return null;
  c.width = c.height = 96;
  const g = c.getContext("2d");
  if (!g) return null;
  const grad = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.1, color + "f0");
  grad.addColorStop(0.3, color + "85");
  grad.addColorStop(0.62, color + "24");
  grad.addColorStop(1, color + "00");
  g.fillStyle = grad;
  g.fillRect(0, 0, 96, 96);
  sprites.set(color, c);
  return c;
}
function glow(ctx, x, y, r, color, alpha = 1, sy = 1) {
  const sprite = sprites.get(color);
  if (!sprite || alpha <= 0 || r < 0.1) return;
  const before = ctx.globalAlpha;
  ctx.globalAlpha *= clamp(alpha);
  ctx.drawImage(sprite, x - r, y - r * sy, r * 2, r * 2 * sy);
  ctx.globalAlpha = before;
}
function line(ctx, points, color, width, alpha = 1) {
  const before = ctx.globalAlpha;
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
  ctx.globalAlpha = before;
}
function ellipse(ctx, x, y, r, color, width = 1, sy = 0.45, alpha = 1) {
  const before = ctx.globalAlpha;
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, r), Math.max(0.01, r * sy), 0, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = before;
}
function shard(ctx, x, y, r, angle, color, alpha = 1) {
  const before = ctx.globalAlpha;
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(r * 1.8, 0);
  ctx.lineTo(0, r * 0.38);
  ctx.lineTo(-r, 0);
  ctx.lineTo(0, -r * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = before;
}
function star(ctx, x, y, r, color, alpha = 1) {
  line(ctx, [[x - r, y], [x + r, y]], color, 1.2, alpha);
  line(ctx, [[x, y - r], [x, y + r]], color, 1.2, alpha);
}
function sparks(ctx, x, y, t, r, p, seed, count = 12, ground = false) {
  if (t <= 0 || t >= 1) return;
  const a = (1 - t) ** 1.3, progress = ease(t);
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399963 + noise(seed + i) * 0.6, rr = r * (0.35 + noise(seed + i + 31) * 0.65) * progress;
    const sx = x + Math.cos(angle) * rr, sy = y + Math.sin(angle) * rr * (ground ? 0.43 : 0.67) + (ground ? 0 : 25 * t * t);
    const tail = 5 + 10 * (1 - t), c = i % 3 === 0 ? p[2] : p[0];
    line(ctx, [[sx - Math.cos(angle) * tail, sy - Math.sin(angle) * tail * (ground ? 0.43 : 0.67)], [sx, sy]], c, i % 4 === 0 ? 2 : 1, a);
    if (i % 3 === 0) shard(ctx, sx, sy, 2 + 2 * (1 - t), angle, c, a);
  }
}
function seal(ctx, x, y, r, p, t, low = false, reduced = false) {
  ellipse(ctx, x, y, r, p[0], 1.5, 0.43, 0.65);
  ellipse(ctx, x, y, r * 0.83, p[1], 2, 0.43, 0.65);
  const n = low ? 6 : 12, rot = reduced ? 0 : t * 0.2;
  for (let i = 0; i < n; i++) {
    const a = i * TAU / n + rot, c = Math.cos(a), s = Math.sin(a), rr = r * 0.92;
    shard(ctx, x + c * rr, y + s * rr * 0.43, 3, a, p[2], 0.8);
    if (!low) line(ctx, [[x + c * r * 0.68, y + s * r * 0.68 * 0.43], [x + c * r * 0.74, y + s * r * 0.74 * 0.43]], p[0], 1, 0.7);
  }
}
function bolt(ctx, fx, fy, tx, ty, p, seed, alpha = 1, wide = 1) {
  const dx = tx - fx, dy = ty - fy, len = Math.hypot(dx, dy) || 1, n = 7, pts = [];
  for (let i = 0; i <= n; i++) {
    const bend = i === 0 || i === n ? 0 : (noise(seed + i) * 2 - 1) * Math.min(16, len * 0.18);
    pts.push([fx + dx * i / n - dy / len * bend, fy + dy * i / n + dx / len * bend]);
  }
  line(ctx, pts, p[1], 5 * wide, 0.23 * alpha);
  line(ctx, pts, p[0], 2 * wide, 0.85 * alpha);
  line(ctx, pts, p[2], 0.8 * wide, alpha);
}
function impact(ctx, x, y, t, r, p, seed, { low, reduced }, ground = true) {
  if (t <= 0 || t >= 1) return;
  const front = ease(phase(t, 0, 0.7)), a = (1 - t) ** 1.4;
  if (!reduced) blast(ctx, x, y + 6, r * (0.3 + front * 0.95), p, t, ground, low);
  glow(ctx, x, y, r * (0.35 + front * 0.65), p[0], a * (reduced ? 0.35 : 0.8), ground ? 0.52 : 1);
  ellipse(ctx, x, y + 8, r * (0.25 + front * 0.75), p[0], 2.6 * (1 - t) + 0.6, 0.43, a);
  if (!low) ellipse(ctx, x, y + 8, r * (0.15 + front * 0.65), p[2], 1, 0.43, a * 0.8);
  sparks(ctx, x, y, t, r * 1.2, p, seed, reduced ? 3 : low ? 6 : 14, ground);
}
function arrowHead(ctx, x, y, a, p, size = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  line(ctx, [[-40 * size, 0], [10 * size, 0]], p[0], 4 * size, 0.45);
  line(ctx, [[-40 * size, 0], [10 * size, 0]], p[2], 1.8 * size);
  ctx.fillStyle = p[2];
  ctx.beginPath();
  ctx.moveTo(16 * size, 0);
  ctx.lineTo(-2 * size, -5 * size);
  ctx.lineTo(1 * size, 0);
  ctx.lineTo(-2 * size, 5 * size);
  ctx.closePath();
  ctx.fill();
  line(ctx, [[-23 * size, -7 * size], [-33 * size, 0], [-23 * size, 7 * size]], p[0], 2 * size);
  ctx.restore();
}
function shield(ctx, x, y, size, p, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#0d294ac9";
  ctx.strokeStyle = p[0];
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -33);
  ctx.lineTo(27, -22);
  ctx.lineTo(22, 9);
  ctx.quadraticCurveTo(15, 25, 0, 34);
  ctx.quadraticCurveTo(-15, 25, -22, 9);
  ctx.lineTo(-27, -22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.globalCompositeOperation = "lighter";
  line(ctx, [[0, -25], [0, 23]], p[2], 2);
  line(ctx, [[-18, -12], [0, -18], [18, -12]], p[2], 2);
  shard(ctx, 0, 0, 9, -Math.PI / 2, p[2]);
  ctx.restore();
}
function slash(ctx, e, t, p, q) {
  const x = e.to.x, y = e.to.y - 26, a = Math.atan2(e.to.y - e.from.y, e.to.x - e.from.x);
  const turn = a - 1.4 + ease(phase(t, 0, 0.6)) * 2.6, rad = 43 + phase(t, 0, 0.7) * 15, alpha = 1 - phase(t, 0.45, 1);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  ctx.scale(1, 0.72);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = p[1];
  ctx.beginPath();
  ctx.arc(0, 0, rad, -1.9, 0.35);
  ctx.arc(0, 0, rad - 12, 0.35, -1.9, true);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = p[2];
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, rad, -1.6, 0.35);
  ctx.stroke();
  ctx.strokeStyle = p[0];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, rad + 7, -1.3, 0.3);
  ctx.stroke();
  ctx.restore();
  impact(ctx, x, y, phase(t, 0.18, 1), 55, p, e.seed, q, false);
}
function chain(ctx, e, t, p, q) {
  const fx = e.from.x, fy = e.from.y - 32, tx = e.to.x, ty = e.to.y - 28;
  const reach = t < 0.27 ? ease(t / 0.27) : 1 - phase(t, 0.52, 1) * 0.75, x = fx + (tx - fx) * reach, y = fy + (ty - fy) * reach, angle = Math.atan2(y - fy, x - fx), len = Math.hypot(x - fx, y - fy);
  glow(ctx, x, y, 42, p[0], 0.65 * (1 - t));
  line(ctx, [[fx, fy], [x, y]], p[1], 8, 0.18);
  ctx.save();
  ctx.translate(fx, fy);
  ctx.rotate(angle);
  const n = Math.min(q.low ? 15 : 26, Math.ceil(len / 11));
  ctx.strokeStyle = p[2];
  ctx.lineWidth = 2;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.ellipse((i + 0.5) * len / Math.max(1, n), 0, 6.5, i % 2 ? 2 : 4.5, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  shield(ctx, x, y, 0.65, p, 1 - phase(t, 0.65, 1));
  if (t > 0.26) impact(ctx, tx, ty, phase(t, 0.26, 1), 75, p, e.seed, q);
}
function dash(ctx, e, t, p, q) {
  const fx = e.from.x, fy = e.from.y - 22, tx = e.to.x, ty = e.to.y - 22, angle = Math.atan2(ty - fy, tx - fx), len = Math.max(55, Math.hypot(tx - fx, ty - fy)), travel = ease(phase(t, 0, 0.5)), alpha = 1 - phase(t, 0.38, 1);
  ctx.save();
  ctx.translate(fx, fy);
  ctx.rotate(angle);
  ctx.globalAlpha *= alpha;
  for (let i = 0; i < (q.low ? 3 : 5); i++) {
    const dy = (i - (q.low ? 1 : 2)) * 10, x = len * travel;
    line(ctx, [[Math.max(0, x - len * 0.85), dy * 0.4], [x * 0.6, dy], [x, 0]], i % 2 ? p[2] : p[0], i === 0 ? 4 : 2, 0.75);
  }
  ctx.fillStyle = p[1];
  ctx.globalAlpha *= 0.45;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(len * travel, 0);
  ctx.lineTo(0, 16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  glow(ctx, fx + (tx - fx) * travel, fy + (ty - fy) * travel, 55, p[0], alpha * 0.9, 0.6);
  impact(ctx, tx, ty, phase(t, 0.22, 1), 100, p, e.seed, q);
}
function guard(ctx, e, t, p, q) {
  const x = e.to.x, y = e.to.y, a = Math.min(1, t * 8) * (1 - phase(t, 0.62, 1));
  ctx.save();
  ctx.globalAlpha *= a;
  seal(ctx, x, y + 2, 65 + 7 * Math.sin(t * Math.PI), p, t, q.low, q.reduced);
  glow(ctx, x, y - 32, 86, p[0], 0.38, 0.9);
  shield(ctx, x, y - 40, 1.05 + Math.sin(t * Math.PI) * 0.08, p, 0.95);
  if (!q.reduced) for (let i = 0; i < (q.low ? 4 : 9); i++) {
    const px = x + (noise(i + e.seed) - 0.5) * 88, py = y - 8 - phase(t, 0.05, 1) * (48 + noise(i + 9) * 35);
    shard(ctx, px, py, 3, -Math.PI / 2, p[2], 0.8);
  }
  ctx.restore();
  impact(ctx, x, y, phase(t, 0.03, 0.65), 82, p, e.seed, q);
}
function judgment(ctx, e, t, p, q) {
  const x = e.to.x, y = e.to.y - 14, fall = ease(phase(t, 0, 0.3)), a = 1 - phase(t, 0.58, 0.92);
  seal(ctx, x, y + 16, 80, p, t, q.low, q.reduced);
  if (a > 0) {
    ctx.save();
    ctx.translate(x, y - 100 * (1 - fall));
    ctx.globalAlpha *= a;
    glow(ctx, 0, -38, 80, p[0], 0.8, 0.95);
    ctx.fillStyle = p[0];
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(-12, -38);
    ctx.lineTo(-8, -104);
    ctx.lineTo(8, -104);
    ctx.lineTo(12, -38);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p[2];
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(-2, -96);
    ctx.lineTo(5, -96);
    ctx.closePath();
    ctx.fill();
    line(ctx, [[-23, -96], [0, -88], [23, -96]], p[2], 5);
    line(ctx, [[0, -100], [0, -121]], p[0], 6);
    ctx.restore();
  }
  impact(ctx, x, y, phase(t, 0.26, 1), 133, p, e.seed, q);
  if (t > 0.27 && !q.reduced) for (let i = 0; i < (q.low ? 4 : 7); i++) {
    const a2 = i * TAU / 7, rr = 50 + 45 * ease(phase(t, 0.27, 0.65));
    bolt(ctx, x, y + 12, x + Math.cos(a2) * rr, y + 12 + Math.sin(a2) * rr * 0.45, p, e.seed + i, (1 - t) * 0.65, 0.75);
  }
}
function missile(ctx, e, t, p, q, style) {
  const hit = 0.4, travel = ease(phase(t, 0, hit)), fx = e.from.x, fy = e.from.y - 36, tx = e.to.x, ty = e.to.y - 29;
  const dx = tx - fx, dy = ty - fy, angle = Math.atan2(dy, dx), len = Math.hypot(dx, dy), x = fx + dx * travel, y = fy + dy * travel;
  const power = style === "dawn" || style === "spear" || style === "pierce", trail = Math.min(len, power ? 125 : 72);
  if (t < hit + 0.08) {
    ctx.save();
    ctx.globalAlpha *= 1 - phase(t, hit, hit + 0.08);
    ctx.translate(x, y);
    ctx.rotate(angle);
    glow(ctx, -trail * 0.3, 0, trail * 0.7 + 15, p[0], power ? 0.75 : 0.55, 0.17);
    line(ctx, [[-trail, 0], [0, 0]], p[0], power ? 5 : 3, 0.8);
    line(ctx, [[-trail * 0.7, 0], [2, 0]], p[2], power ? 2.4 : 1.5);
    if (power && !q.reduced) for (let side = -1; side <= 1; side += 2) {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const u = i / 14;
        pts.push([-trail * u, Math.sin(u * Math.PI * 3 - t * 8) * side * (style === "dawn" ? 13 : 8) * (1 - u * 0.5)]);
      }
      line(ctx, pts, p[0], 1.4, 0.65);
    }
    if (style === "spear") {
      ctx.fillStyle = p[2];
      ctx.beginPath();
      ctx.moveTo(25, 0);
      ctx.lineTo(-5, -9);
      ctx.lineTo(-47, 0);
      ctx.lineTo(-5, 9);
      ctx.closePath();
      ctx.fill();
      line(ctx, [[-74, 0], [5, 0]], p[0], 4);
    } else if (style === "orb") {
      glow(ctx, 0, 0, 42, p[0], 0.9);
      ctx.fillStyle = p[2];
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = p[0];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 21, 8, t * 8, 0, TAU);
      ctx.stroke();
      if (!q.low) bolt(ctx, -trail, 7, 2, 0, p, e.seed, 0.7, 0.6);
    } else {
      arrowHead(ctx, 0, 0, 0, p, style === "dawn" ? 1.6 : style === "pierce" ? 1.3 : 1);
      if (style === "dawn") for (let side = -1; side <= 1; side += 2) line(ctx, [[-6, 0], [-24, side * 24], [-51, side * 13], [-75, side * 10]], p[2], 2);
    }
    ctx.restore();
  }
  impact(ctx, tx, ty, phase(t, hit, 1), style === "dawn" ? 125 : style === "spear" ? 95 : style === "pierce" ? 76 : 50, p, e.seed, q);
  if (style === "spear" && t > hit && !q.low) for (let i = 0; i < 5; i++) {
    const a = i * TAU / 5, rr = phase(t, hit, 1) * 70;
    shard(ctx, tx + Math.cos(a) * rr, ty + Math.sin(a) * rr * 0.7, 8 * (1 - t), a, p[2], 1 - t);
  }
}
function rain(ctx, e, t, p, q) {
  const x = e.to.x, y = e.to.y - 5, fade = 1 - phase(t, 0.67, 1);
  ctx.save();
  ctx.globalAlpha *= fade;
  seal(ctx, x, y + 10, 84, p, t, q.low, q.reduced);
  ctx.restore();
  const count = q.reduced ? 4 : q.low ? 7 : 15;
  for (let i = 0; i < count; i++) {
    const a = i * 2.399, rr = 18 + Math.sqrt(noise(i + e.seed)) * 65, tx = x + Math.cos(a) * rr, ty = y + Math.sin(a) * rr * 0.45;
    const u = phase(t, 0.08 + i / count * 0.32, 0.42 + i / count * 0.32);
    if (u <= 0) continue;
    if (u < 1) {
      const fall = ease(u), xx = tx + 45 * (1 - fall), yy = ty - 155 * (1 - fall);
      line(ctx, [[xx + 18, yy - 65], [xx, yy]], p[0], 2, 0.7);
      arrowHead(ctx, xx, yy, Math.atan2(155, -45), p, 0.72);
    }
    const burst = phase(t, 0.38 + i / count * 0.32, 0.72 + i / count * 0.27);
    if (burst > 0 && burst < 1) {
      glow(ctx, tx, ty, 29, p[0], 1 - burst, 0.65);
      sparks(ctx, tx, ty, burst, 30, p, e.seed + i, q.low ? 2 : 4, true);
    }
  }
}
function root(ctx, e, t, p, q) {
  missile(ctx, e, t * 0.95, p, q, "arrow");
  if (t < 0.34) return;
  const x = e.to.x, y = e.to.y - 2, grow = ease(phase(t, 0.34, 0.68)), fade = 1 - phase(t, 0.74, 1);
  ctx.save();
  ctx.globalAlpha *= fade;
  seal(ctx, x, y + 8, 67, p, t, q.low, q.reduced);
  glow(ctx, x, y - 15, 78, p[0], 0.45, 0.65);
  const count = q.low ? 4 : 7;
  for (let i = 0; i < count; i++) {
    const a = i * TAU / count, sx = x + Math.cos(a) * 48, sy = y + Math.sin(a) * 22, h = (48 + noise(i) * 30) * grow;
    ctx.strokeStyle = i % 2 ? p[0] : p[1];
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(sx - 24, sy - h * 0.4, sx + 22, sy - h * 0.7, sx + Math.sin(a) * 13, sy - h);
    ctx.stroke();
    ctx.strokeStyle = p[2];
    ctx.lineWidth = 1;
    ctx.stroke();
    shard(ctx, sx + Math.sin(a) * 13, sy - h, 5, a, p[0]);
    if (!q.low) shard(ctx, sx + 10, sy - h * 0.5, 7, a + 0.7, p[0], 0.8);
  }
  ctx.restore();
}
function storm(ctx, e, t, p, q) {
  const x = e.to.x, y = e.to.y - 5, build = ease(phase(t, 0, 0.25)), fade = 1 - phase(t, 0.66, 1), r = 108 * build;
  ctx.save();
  ctx.globalAlpha *= fade;
  seal(ctx, x, y + 10, r, p, t, q.low, q.reduced);
  glow(ctx, x, y + 10, r * 1.12, p[0], 0.35, 0.4);
  const count = q.reduced ? 3 : q.low ? 5 : 8;
  for (let i = 0; i < count; i++) {
    const a = i * TAU / count, tx = x + Math.cos(a) * r * 0.82, ty = y + Math.sin(a) * r * 0.35, age = phase(t, 0.14 + i / count * 0.13, 0.75 + i / count * 0.14);
    if (age > 0 && age < 1) {
      bolt(ctx, tx + Math.cos(a) * 15, ty - 100 - i % 3 * 12, tx, ty, p, e.seed + i, (1 - age) * 0.95, 1.3);
      glow(ctx, tx, ty, 31, p[0], (1 - age) * 0.8);
      if (!q.low) bolt(ctx, x, y - 10, tx, ty, p, e.seed + i + 50, (1 - age) * 0.5, 0.65);
    }
  }
  ctx.restore();
  impact(ctx, x, y, phase(t, 0.22, 1), 140, p, e.seed, q);
}
function nova(ctx, e, t, p, q) {
  const x = e.to.x, y = e.to.y - 28, charge = phase(t, 0, 0.28), burst = phase(t, 0.25, 1);
  if (t < 0.35) {
    const r = 35 * (1 - charge * 0.65);
    glow(ctx, x, y, r * 2, p[0], 0.65 + charge * 0.3);
    ellipse(ctx, x, y, r, p[2], 2, 0.75);
    ellipse(ctx, x, y, r * 1.5, p[0], 2, 0.4);
    if (!q.reduced) for (let i = 0; i < (q.low ? 4 : 8); i++) {
      const a = i * TAU / 8 + t * 3, rr = (1 - charge) * 85 + 15;
      line(ctx, [[x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6], [x + Math.cos(a) * rr * 0.65, y + Math.sin(a) * rr * 0.4]], p[0], 2, 0.8);
    }
  }
  impact(ctx, x, y, burst, 174, p, e.seed, q, false);
  if (burst > 0 && burst < 1) {
    const r = ease(burst) * 121, a = (1 - burst) ** 1.3;
    ctx.save();
    ctx.globalAlpha *= a;
    ellipse(ctx, x, y + 24, r, p[2], 2.5, 0.42);
    ellipse(ctx, x, y + 24, r * 1.15, p[0], 1, 0.42);
    const n = q.low ? 6 : 11;
    for (let i = 0; i < n; i++) {
      const angle = i * TAU / n + 0.2;
      shard(ctx, x + Math.cos(angle) * r, y + Math.sin(angle) * r * 0.65, 9 * (1 - burst) + 2, angle, p[i % 2 ? 0 : 2], 0.9);
    }
    if (!q.reduced && !q.low) for (let i = 0; i < 4; i++) {
      const a2 = i * TAU / 4;
      bolt(ctx, x + Math.cos(a2) * 28, y + Math.sin(a2) * 18, x + Math.cos(a2) * r, y + Math.sin(a2) * r * 0.65, p, e.seed + i, 0.5);
    }
    ctx.restore();
  }
}
function heal(ctx, e, t, p, q) {
  const x = e.to.x, y = e.to.y, fade = Math.min(1, t * 8) * (1 - phase(t, 0.67, 1)), r = 74;
  ctx.save();
  ctx.globalAlpha *= fade;
  seal(ctx, x, y + 7, r, p, t, q.low, q.reduced);
  glow(ctx, x, y - 25, 92, p[0], 0.4, 0.85);
  const n = q.low ? 4 : 7;
  for (let i = 0; i < n; i++) {
    const a = i * TAU / n + t * (q.reduced ? 0 : 1.2), dx = Math.cos(a), dy = Math.sin(a);
    ctx.strokeStyle = i % 2 ? p[0] : p[2];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 5);
    ctx.bezierCurveTo(x + dx * r, y + dy * r * 0.35 - 4, x + dx * r * 0.72, y - 50, x, y - 80);
    ctx.stroke();
    if (!q.reduced) {
      const h = (t * 1.5 + noise(i)) % 1;
      star(ctx, x + dx * 40 * (1 - h * 0.4), y - h * 85, 3, p[2], 0.8);
    }
  }
  shard(ctx, x, y - 57, 12, -Math.PI / 2, p[2], 0.8);
  ctx.restore();
  impact(ctx, x, y + 5, phase(t, 0.04, 0.88), 105, p, e.seed, q);
}
var painters = { slash, chain, dash, guard, judgment, rain, root, storm, nova, heal };
function createSkillVisualsR103() {
  const list = [], seen = /* @__PURE__ */ new Map();
  let legacy = /* @__PURE__ */ new WeakSet(), serial = 0, dropped = 0, lastDrawn = 0;
  for (const p of Object.values(colors)) {
    glowSprite(p[0]);
    blastSprite(p);
  }
  const api = {
    get size() {
      return list.length;
    },
    stats() {
      return { queued: list.length, drawn: lastDrawn, dropped, keys: seen.size, sprites: sprites.size + blasts.size };
    },
    clear() {
      list.length = 0;
      seen.clear();
      legacy = /* @__PURE__ */ new WeakSet();
    },
    removeActor(id) {
      for (let i = list.length - 1; i >= 0; i--) if (list[i].sourcePlayerId === id || list[i].targetPlayerId === id) list.splice(i, 1);
    },
    enqueue({ role, ability, from, to, now, key = "", specialization = "", sourcePlayerId, targetPlayerId, own = false, follow = false } = {}) {
      const id = ability === 3 ? specs.has(specialization) && specs.get(specialization).role === role ? specialization : defaults[role] : role + "-" + ability, spec = specs.get(id);
      if (!spec || !Number.isInteger(ability) || !finitePoint(from) || !finitePoint(to) || !Number.isFinite(now)) return false;
      sourcePlayerId ??= from.id;
      targetPlayerId ??= to.id;
      const eventKey = key ? String(key).slice(0, 180) : "";
      if (eventKey && seen.has(eventKey) && now - seen.get(eventKey) < 2400 && now >= seen.get(eventKey)) return false;
      if (list.some((e) => e.spec.id === id && e.sourcePlayerId === sourcePlayerId && Math.abs(now - e.now) < 165 && Math.hypot(e.to.x - to.x, e.to.y - to.y) < 18)) return false;
      if (eventKey) {
        seen.set(eventKey, now);
        while (seen.size > 192) seen.delete(seen.keys().next().value);
      }
      if (list.length >= 40) {
        const i = list.findIndex((e) => !e.own);
        if (!own && i < 0) {
          dropped++;
          return false;
        }
        list.splice(i < 0 ? 0 : i, 1);
        dropped++;
      }
      list.push({ spec, from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y }, now, seed: ++serial, sourcePlayerId, targetPlayerId, own: !!own, follow: !!follow });
      return true;
    },
    consumeLegacy({ guardian = [], special = [], now, ownId } = {}) {
      for (const e of guardian) {
        if (legacy.has(e)) continue;
        legacy.add(e);
        if (e.ability !== 1 && e.ability !== 2) continue;
        api.enqueue({ role: "muhafiz", ability: e.ability, from: e.casterPoint ?? e.from, to: e.targetPoint ?? e.to, now: Number.isFinite(e.started) ? e.started : now, key: e.intentId ? "cast:" + e.intentId : e.eventId ? "guardian:" + e.eventId : "", sourcePlayerId: e.attackerId, targetPlayerId: e.targetId, own: e.attackerId === ownId });
      }
      for (const e of special) {
        if (legacy.has(e)) continue;
        legacy.add(e);
        if (!e.specialist462) continue;
        const spec = specs.get(e.specialist462);
        if (!spec) continue;
        const point = { x: e.x, y: e.y }, from = finitePoint({ x: e.fromX, y: e.fromY }) ? { x: e.fromX, y: e.fromY } : point;
        api.enqueue({ role: spec.role, ability: 3, from, to: point, now: Number.isFinite(e.started) ? e.started : now, key: e.specialistKey462 ?? "", specialization: spec.id, sourcePlayerId: e.sourcePlayerId, targetPlayerId: e.targetPlayerId, own: e.sourcePlayerId === ownId, follow: spec.style === "guard" || spec.style === "heal" });
      }
    },
    draw(ctx, now, { low = false, reduced = false, camera = null, width = Infinity, height = Infinity, resolve } = {}) {
      if (!ctx || !Number.isFinite(now)) return;
      for (let i = list.length - 1; i >= 0; i--) if (now - list[i].now >= list[i].spec.duration || now < list[i].now - 1e3) list.splice(i, 1);
      for (const [key, at] of seen) if (now - at > 3e3 || now < at - 1e3) seen.delete(key);
      lastDrawn = 0;
      const budget = low ? 10 : 24;
      const selected = [];
      for (let pass = 0; pass < 2; pass++) for (let i = list.length - 1; i >= 0 && selected.length < budget; i--) {
        const e = list[i];
        if (e.own !== (pass === 0)) continue;
        if (e.follow && e.targetPlayerId && resolve) {
          const target = resolve(e.targetPlayerId);
          if (finitePoint(target)) e.to = { x: target.x, y: target.y };
        }
        if (camera && (Math.max(e.from.x, e.to.x) < camera.x - width / 2 - 210 || Math.min(e.from.x, e.to.x) > camera.x + width / 2 + 210 || Math.max(e.from.y, e.to.y) < camera.y - height / 2 - 210 || Math.min(e.from.y, e.to.y) > camera.y + height / 2 + 230)) continue;
        selected.push(e);
      }
      for (let i = selected.length - 1; i >= 0; i--) {
        const e = selected[i], t = clamp((now - e.now) / e.spec.duration), p = colors[e.spec.palette];
        if (t <= 0) continue;
        ctx.save();
        try {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha *= reduced ? 0.62 : 0.92;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          const painter = painters[e.spec.style];
          if (painter) painter(ctx, e, t, p, { low, reduced });
          else missile(ctx, e, t, p, { low, reduced }, e.spec.style);
          lastDrawn++;
        } finally {
          ctx.restore();
        }
      }
    }
  };
  return api;
}

// ccre/r103_skills/working/core511-source/scripts/core511/skill-icons-r103.mjs
var palette = { muhafiz: ["#ffbf56", "#70411c"], avci: ["#64f7ba", "#124f43"], arkanist: ["#bc98ff", "#402066"] };
var path = (d, fill = "url(#metal)", stroke = "#f6edce", w = 1) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>`;
var arrow = (x, y, rotate = 0, color = "url(#metal)") => `<g transform="translate(${x} ${y}) rotate(${rotate})">${path("M-24 17 L10 -17 L7 -23 L27 -27 L23 -7 L17 -10 L-17 24 Z", color)}${path("M-25 9 L-15 13 L-10 23 L-24 25 L-27 12 Z", "#24566a", "#bdf5ff")}</g>`;
var sword = () => path("M44 76 L76 23 L76 10 L65 15 L35 67 Z") + path("M45 71 L72 19 L40 69 Z", "#faffed", "none") + path("M27 65 L49 79 L52 72 L31 58 Z", "url(#gold)") + path("M29 69 L39 76 L30 90 L22 83 Z", "#372a37", "#d6a964", 2);
var shield2 = () => path("M48 15 L73 26 L69 54 Q64 70 48 81 Q31 70 27 54 L23 26 Z", "url(#shield)", "#f4ce75", 2) + path("M48 23 L65 31 L62 53 Q58 65 48 72 Z", "#8ed9ec66", "#b1ecff", 1) + path("M48 29 L55 46 L48 61 L41 46 Z", "url(#gold)", "#fff3c0", 1.4);
var orb = (cx = 49, cy = 48, r = 17) => `<circle cx="${cx}" cy="${cy}" r="${r * 1.8}" fill="url(#aura)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#orb)" stroke="#f1d9ff" stroke-width="1.5"/>` + path(`M${cx - 7} ${cy + 10} L${cx + 3} ${cy - 5} L${cx - 2} ${cy - 5} L${cx + 6} ${cy - 14} L${cx + 1} ${cy + 1} L${cx + 7} ${cy + 1} Z`, "#fff4ff", "none");
function glyph(style) {
  switch (style) {
    case "slash":
      return path("M13 75 Q16 23 79 16 Q48 34 24 79 Z", "#ff822b88", "#ffcf77", 2) + sword();
    case "chain":
      return `<g fill="none" stroke="url(#gold)" stroke-width="3">${Array.from({ length: 5 }, (_, i) => `<ellipse cx="${18 + i * 10}" cy="${78 - i * 9}" rx="9" ry="5" transform="rotate(-42 ${18 + i * 10} ${78 - i * 9})"/>`).join("")}</g><g transform="translate(20 -6) scale(.8)">${shield2()}</g>`;
    case "dash":
      return path("M8 77 L55 38 L32 42 L82 12 L65 61 L60 43 L20 90 Z", "url(#gold)", "#fff1be", 1) + path("M10 47 L47 24 M10 61 L35 43 M47 83 L82 49", "none", "#ffac50", 3);
    case "guard":
      return `<ellipse cx="48" cy="81" rx="34" ry="9" fill="none" stroke="#66d5ff" stroke-width="2"/>` + path("M15 60 L15 33 M81 60 L81 33 M22 22 L24 12 M74 22 L72 12", "none", "#c5f7ff", 2) + shield2();
    case "judgment":
      return path("M14 86 L23 66 L31 78 L49 57 L59 77 L75 64 L84 87 Z", "#ff652a88", "#ffc55e", 2) + `<g transform="rotate(-31 48 48) translate(3 -5)">${sword()}</g>`;
    case "arrow":
      return path("M9 84 Q26 51 73 27 M17 88 Q28 63 51 50", "none", "#5af8ab", 3) + arrow(47, 46);
    case "pierce":
      return path("M7 87 L82 13 M8 68 Q19 41 47 39 Q76 35 82 11", "none", "#6debff", 3) + arrow(48, 46, 0) + path("M22 61 L14 58 M39 43 L33 34 M64 21 L61 12", "none", "#fff9dc", 2);
    case "rain":
      return `<ellipse cx="48" cy="79" rx="34" ry="10" fill="none" stroke="#5bffc4" stroke-width="2"/><g transform="translate(3 -9) scale(.7)">${arrow(34, 51, 90)}${arrow(78, 37, 90)}${arrow(111, 65, 90)}</g>` + path("M16 20 L30 36 M44 11 L60 28 M69 18 L82 33", "none", "#c6ffe4", 2);
    case "dawn":
      return `<circle cx="67" cy="29" r="18" fill="url(#aura)" stroke="#ffdf8c"/><g stroke="#ffe5a2" stroke-width="2">${Array.from({ length: 8 }, (_, i) => `<path transform="rotate(${i * 45} 67 29)" d="M67 7 L67 1"/>`).join("")}</g>` + arrow(45, 49, 0, "url(#gold)") + path("M16 57 L12 34 L37 39 M39 80 L62 84 L58 59", "none", "#ffdc7b", 3);
    case "root":
      return path("M20 85 Q4 60 34 53 Q58 46 43 21 M48 89 Q81 76 64 51 Q51 29 80 17", "none", "#58ec91", 5) + path("M28 58 Q4 32 12 30 Q40 31 28 58 M67 56 Q92 34 87 29 Q63 29 67 56", "#33b979", "#9dffc3", 1) + arrow(48, 49, 0);
    case "orb":
      return path("M9 83 Q18 48 55 44 M13 70 Q18 33 59 30", "none", "#a47dff", 3) + orb(57, 40, 20) + path("M39 34 L26 24 L29 13 M67 54 L78 59 L83 51", "none", "#f2c6ff", 2);
    case "spear":
      return path("M9 88 L62 28 L58 20 L85 9 L77 39 L68 35 L14 90 Z", "url(#metal)", "#d5ffff", 1.3) + path("M13 73 Q39 81 40 53 Q38 28 67 34 Q84 34 80 16", "none", "#63d9ff", 3) + path("M21 87 L69 29", "none", "#ffffff", 1.5);
    case "storm":
      return `<ellipse cx="48" cy="73" rx="34" ry="12" fill="none" stroke="#ae8dff" stroke-width="3"/>` + path("M49 12 L35 40 L45 40 L32 74 L66 35 L54 35 L66 12 Z", "url(#metal)", "#efe5ff", 1.5) + path("M17 27 L24 43 L15 43 L24 66 M82 26 L73 42 L82 43 L72 67", "none", "#ac87ff", 2);
    case "nova":
      return path("M48 6 L54 29 L75 15 L67 36 L91 43 L68 52 L80 76 L57 65 L49 92 L40 67 L16 80 L29 55 L6 46 L29 38 L18 16 L41 29 Z", "url(#burst)", "#e8bdff", 1) + orb(48, 47, 17);
    case "heal":
      return `<ellipse cx="48" cy="78" rx="33" ry="10" fill="none" stroke="#90ffca" stroke-width="2"/>` + path("M48 77 Q11 65 18 36 Q39 34 48 77 M48 77 Q84 65 78 36 Q57 34 48 77 M48 74 Q28 46 48 12 Q69 45 48 74", "url(#life)", "#d6ffe0", 1.5) + path("M48 28 L48 56 M36 42 L60 42", "none", "#fffbd5", 4);
    default:
      return "";
  }
}
var icons = /* @__PURE__ */ new Map();
for (const s of SKILLS_R103) {
  let [color, dark] = palette[s.role];
  if (s.style === "heal") {
    color = "#9affc0";
    dark = "#164434";
  }
  if (s.style === "dawn") {
    color = "#ffd981";
    dark = "#5a331b";
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs>
    <radialGradient id="bg"><stop stop-color="${dark}"/><stop offset="1" stop-color="#080e16"/></radialGradient>
    <radialGradient id="aura"><stop stop-color="#ffffff" stop-opacity=".8"/><stop offset=".25" stop-color="${color}" stop-opacity=".7"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>
    <linearGradient id="metal" x2="1" y2="1"><stop stop-color="#fcffff"/><stop offset=".38" stop-color="#d2eeff"/><stop offset=".5" stop-color="#779baa"/><stop offset=".62" stop-color="#f3fff3"/><stop offset="1" stop-color="${color}"/></linearGradient>
    <linearGradient id="gold" x2="1" y2="1"><stop stop-color="#fff3b8"/><stop offset=".5" stop-color="#cf8a30"/><stop offset="1" stop-color="#ffde85"/></linearGradient>
    <linearGradient id="shield" x2="1" y2="1"><stop stop-color="#3ca5cf"/><stop offset=".5" stop-color="#1a354d"/><stop offset="1" stop-color="#0c1826"/></linearGradient>
    <radialGradient id="orb" cx=".35" cy=".3"><stop stop-color="#ffffff"/><stop offset=".3" stop-color="#e2c1ff"/><stop offset=".65" stop-color="#8a46e5"/><stop offset="1" stop-color="#38106f"/></radialGradient>
    <radialGradient id="burst"><stop stop-color="#fff5ff"/><stop offset=".3" stop-color="#e4a9ff"/><stop offset=".65" stop-color="#a766e8"/><stop offset="1" stop-color="#512b7860"/></radialGradient>
    <linearGradient id="life" x2="0" y2="1"><stop stop-color="#edffd0"/><stop offset=".4" stop-color="#68f5bd" stop-opacity=".8"/><stop offset="1" stop-color="#088765" stop-opacity=".25"/></linearGradient>
  </defs><rect width="96" height="96" rx="9" fill="url(#bg)"/><circle cx="49" cy="47" r="43" fill="url(#aura)" opacity=".35"/>
  <path d="M7 24L24 7M72 7L89 24M7 72L24 89M72 89L89 72" fill="none" stroke="${color}" stroke-opacity=".25"/>
  <circle cx="48" cy="48" r="36" fill="none" stroke="${color}" stroke-opacity=".18"/>
  ${glyph(s.style)}
  <g fill="${color}" opacity=".85"><circle cx="12" cy="48" r="1"/><circle cx="83" cy="72" r="1.3"/><circle cx="30" cy="13" r="1"/><circle cx="61" cy="86" r="1.1"/></g>
  <rect x="1" y="1" width="94" height="94" rx="9" fill="none" stroke="${color}" stroke-opacity=".28"/></svg>`;
  icons.set(s.id, "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
}
function skillIconR103(role, slot, branch) {
  return icons.get(slot === 3 ? typeof branch === "string" ? branch : branch?.id : role + "-" + slot);
}
function allSkillIconsR103() {
  return Object.fromEntries(icons);
}
export {
  SKILLS_R103,
  allSkillIconsR103,
  createSkillVisualsR103,
  skillIconR103
};
