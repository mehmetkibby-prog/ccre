// project/r109_latency_completion/working/core511-source/scripts/core511/royal-visuals-r118.mjs
var assetR118 = (name) => new URL(name, import.meta.url).href;
var ROYAL_MEDIA_R118 = Object.freeze({
  map: assetR118("champions-map-r118-b7ed6342e7d023a0.webp"),
  hero: assetR118("royal-hero-motion-r118-be48d4c46c491f0f.webp"),
  weapons: assetR118("royal-set-r118-cfe43838826cc23d.webp"),
  armor: assetR118("royal-armor-r118-7ea0badf6c7f1bd7.webp"),
  monsters: Object.freeze({
    ivory_guard: assetR118("champions-ivory_guard-r118-28fdfdad64d82ec3.webp"),
    golden_lion: assetR118("champions-golden_lion-r118-3113c551aa948a39.webp"),
    crescent_hunter: assetR118("champions-crescent_hunter-r118-80cde4cc5248ba49.webp"),
    royal_colossus: assetR118("champions-royal_colossus-r118-beb3cdcf61df5353.webp")
  }),
  icons: Object.freeze({
    weapon_muhafiz: assetR118("royal-icon-weapon_muhafiz-r118-df1750a1f9c3126e.webp"),
    weapon_avci: assetR118("royal-icon-weapon_avci-r118-a2ce6ce9fa6ea6b5.webp"),
    weapon_arkanist: assetR118("royal-icon-weapon_arkanist-r118-7784da8683f48b88.webp"),
    armor: assetR118("royal-icon-armor-r118-604fb486a94b793b.webp"),
    helmet: assetR118("royal-icon-helmet-r118-a7093d1e7fd2ec70.webp"),
    necklace: assetR118("royal-icon-necklace-r118-129f572914439776.webp"),
    shoes: assetR118("royal-icon-shoes-r118-6a7b63fbda295221.webp"),
    emerald_dust: assetR118("royal-icon-emerald_dust-r118-489c24fa11893ae1.webp"),
    royal_crown: assetR118("royal-icon-royal_crown-r118-7fd15c76f9b1f4c0.webp")
  })
});
function royalItemIconR118(kind, role = "muhafiz") {
  const key = kind === "weapon" ? "weapon_" + role : kind;
  return ROYAL_MEDIA_R118.icons[key] ?? null;
}
var royalFxAtlasR118;
var royalFxBudgetsR118 = /* @__PURE__ */ new WeakMap();
function royalAtlasR118() {
  if (royalFxAtlasR118) return royalFxAtlasR118;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 62);
  gradient.addColorStop(0, "rgba(255,251,225,.88)");
  gradient.addColorStop(0.14, "rgba(250,233,173,.60)");
  gradient.addColorStop(0.46, "rgba(212,169,81,.28)");
  gradient.addColorStop(1, "rgba(122,84,32,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "rgba(255,244,203,.95)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(158, 39);
  ctx.lineTo(161, 54);
  ctx.lineTo(174, 58);
  ctx.lineTo(161, 62);
  ctx.lineTo(158, 77);
  ctx.lineTo(155, 62);
  ctx.lineTo(142, 58);
  ctx.lineTo(155, 54);
  ctx.closePath();
  ctx.stroke();
  royalFxAtlasR118 = canvas;
  return canvas;
}
function royalFrameR118(ctx, now, quality, own) {
  if (!(quality > 0) || !Number.isFinite(now)) return null;
  const tick = Math.floor(now / 16);
  let frame = royalFxBudgetsR118.get(ctx);
  if (!frame) {
    frame = { tick, used: 0, limit: 96 };
    royalFxBudgetsR118.set(ctx, frame);
  } else if (frame.tick !== tick) {
    frame.tick = tick;
    frame.used = 0;
  }
  frame.limit = quality < 0.75 ? 48 : 96;
  return frame.used < (own ? frame.limit : frame.limit - 16) ? frame : null;
}
function royalPuffR118(ctx, atlas, frame, x, y, w, h, alpha) {
  if (frame.used >= frame.limit) return;
  frame.used++;
  ctx.globalAlpha = alpha;
  ctx.drawImage(atlas, 0, 0, 128, 128, x - w / 2, y - h / 2, w, h);
}
function drawRoyalArmorFxR118(ctx, x, y, now, quality = 1, own = false) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const frame = royalFrameR118(ctx, now, quality, own);
  if (!frame) return;
  const atlas = royalAtlasR118();
  if (!atlas) return;
  const count = quality < 0.75 ? 1 : 3;
  ctx.save();
  ctx.filter = "none";
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = "lighter";
  royalPuffR118(ctx, atlas, frame, x, y + 7, 104, 30, 0.3);
  for (let i = 0; i < count; i++) {
    const phase = (now / 2900 + i / count) % 1, side = i % 2 ? -1 : 1;
    royalPuffR118(
      ctx,
      atlas,
      frame,
      x + side * (20 + phase * 13) + Math.sin(now / 1050 + i * 2.4) * 4,
      y - 19 - phase * 84,
      30 + phase * 26,
      46 + phase * 30,
      Math.sin(phase * Math.PI) * 0.37
    );
  }
  ctx.globalAlpha = 0.58;
  ctx.strokeStyle = "#efd8a3";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 37, 10, 0, now / 3200, now / 3200 + 1.9);
  ctx.stroke();
  if (frame.used < frame.limit) {
    frame.used++;
    ctx.globalAlpha = 0.65;
    ctx.drawImage(atlas, 138, 35, 40, 46, x - 5, y - 58 - Math.sin(now / 1e3) * 6, 10, 12);
  }
  ctx.restore();
}
function drawRoyalWeaponFxR118(ctx, x, y, w, h, now, quality = 1, role = "muhafiz", own = false) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
  const frame = royalFrameR118(ctx, now, quality, own);
  if (!frame) return;
  const atlas = royalAtlasR118();
  if (!atlas) return;
  const count = quality < 0.75 ? 1 : 3;
  ctx.save();
  ctx.filter = "none";
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < count; i++) {
    const phase = (now / 1850 + i / count) % 1;
    const px = x + w * (role === "avci" ? 0.5 + Math.sin(phase * Math.PI * 2) * 0.12 : 0.5);
    royalPuffR118(ctx, atlas, frame, px, y + h * (0.13 + phase * 0.63), w * 0.27, h * 0.25, 0.22 + Math.sin(phase * Math.PI) * 0.24);
  }
  if (frame.used < frame.limit) {
    frame.used++;
    ctx.globalAlpha = 0.7;
    ctx.drawImage(atlas, 138, 35, 40, 46, x + w * 0.49 - 5, y + h * 0.13 - 7, 10, 14);
  }
  ctx.restore();
}
export {
  ROYAL_MEDIA_R118,
  drawRoyalArmorFxR118,
  drawRoyalWeaponFxR118,
  royalItemIconR118
};
