// working/core511-source/scripts/core511/gameplay-client-r60.mjs
var clientGameplayR60 = { mountMaterials: false, mountState: false, mountRender: false, castleNotices: false };
function acceptGameplayR60(flags) {
  for (const key of Object.keys(clientGameplayR60)) clientGameplayR60[key] = flags?.[key] === true;
}
var materials = Object.freeze({ saddle_leather: "Sa\u011Flam Deri", saddle_buckle: "Eyer Tokas\u0131", saddle_rein: "Dizgin Par\xE7as\u0131" });
var art = "/assets/mount-materials-r60.webp";
function mountMaterialIconR60(React, kind) {
  if (!clientGameplayR60.mountMaterials || !Object.hasOwn(materials, kind)) return null;
  const index = Object.keys(materials).indexOf(kind);
  return React.createElement("span", { className: "mount60-material-icon", role: "img", "aria-label": materials[kind], style: { display: "inline-block", width: 48, height: 48, maxWidth: "100%", flexShrink: 0, backgroundImage: `url("${art}")`, backgroundSize: "300% 100%", backgroundPosition: `${index * 50}% 0`, backgroundRepeat: "no-repeat" } });
}
function mountMarketEntriesR60(world, React) {
  return clientGameplayR60.mountMaterials ? Object.entries(materials).map(([kind, label2]) => ({ id: "part:" + kind, kind: "dungeon_material", materialKind: kind, label: label2, amount: world?.dungeonMaterials?.find((row) => row.kind === kind)?.amount ?? 0, icon: mountMaterialIconR60(React, kind) })) : [];
}
function createMountMaterialsR60(React) {
  const h = React.createElement;
  return function MountMaterials({ world }) {
    return h(React.Fragment, null, ...mountMarketEntriesR60(world, React).filter((row) => row.amount > 0).map((row) => h("article", { key: row.materialKind, className: "bag-item tower27-material" }, h("div", { className: "item-icon" }, row.icon), h("div", { className: "tower27-label" }, h("strong", null, row.label + " \xD7 " + row.amount), h("small", null, "Eyer \xFCretim malzemesi \xB7 Oyuncu pazar\u0131nda sat\u0131labilir.")))));
  };
}

// working/core511-source/scripts/core511/mount-rider-r58.mjs
function seatedRiderR58(sample, { left, top, w, h }, host) {
  const make = () => {
    const c = host.document.createElement("canvas");
    c.width = 144;
    c.height = 152;
    return c;
  };
  const torso = make(), legs = make(), upper = torso.getContext("2d"), lower = legs.getContext("2d");
  if (!upper || !lower) return null;
  const hipX = 72, hipY = 108, cut = 0.55, bodyH = 65, scale = bodyH / (h * cut), bodyW = w * scale;
  const leg = (near) => {
    lower.save();
    lower.translate(hipX + (near ? 4 : -11), hipY - 3);
    lower.globalAlpha = near ? 1 : 0.66;
    lower.rotate(near ? -1.02 : -0.82);
    const start = near ? 0.51 : 0.23, width = near ? 0.37 : 0.29;
    lower.drawImage(sample, left + w * start, top + h * 0.55, w * width, h * 0.24, -7, 0, near ? 19 : 15, 25);
    lower.translate(0, 22);
    lower.rotate(near ? 1.15 : 0.95);
    lower.drawImage(sample, left + w * start, top + h * 0.77, w * width, h * 0.23, -7, 0, near ? 18 : 14, 26);
    lower.restore();
  };
  leg(false);
  leg(true);
  upper.drawImage(sample, left, top, w, h * cut, hipX - bodyW / 2, hipY - bodyH, bodyW, bodyH);
  return { r58: true, torso, legs };
}
function drawSeatedRiderR58(ctx, sprite, pose, x, y, direction) {
  const phase = pose.attackPhase ?? 0, swing = pose.attacking ? Math.sin(phase * Math.PI) : 0;
  ctx.save();
  ctx.translate(x, y - 20 + pose.bob);
  if (direction < -0.08) ctx.scale(-1, 1);
  ctx.drawImage(sprite.legs, -72, -108);
  ctx.rotate(0.06 + swing * 0.16);
  ctx.drawImage(sprite.torso, -72, -108);
  ctx.restore();
  return true;
}

// working/core511-source/scripts/core511/mount-rider-r60.mjs
function seatedRiderR60(sample, bounds, host, roleIndex) {
  const sprite = seatedRiderR58(sample, bounds, host);
  if (!sprite) return null;
  const { left, top, w, h } = bounds, cut = 0.61, bodyH = 72, scale = bodyH / (h * cut), bodyW = w * scale;
  const gripPoints = [{ x: 0.16, y: 0.54 }, { x: 0.88, y: 0.54 }, { x: 0.27, y: 0.55 }], point = gripPoints[roleIndex] ?? gripPoints[0];
  const torso = sprite.torso, ctx = torso.getContext("2d");
  ctx.clearRect(0, 0, torso.width, torso.height);
  ctx.drawImage(sample, left, top, w, h * cut, 72 - bodyW / 2, 108 - bodyH, bodyW, bodyH);
  const glove = host.document.createElement("canvas");
  glove.width = 144;
  glove.height = 152;
  const g = glove.getContext("2d");
  const gx = left + w * point.x, gy = top + h * point.y, gw = w * 0.1, gh = h * 0.075;
  g.drawImage(sample, gx - gw / 2, gy - gh / 2, gw, gh, 72 - bodyW / 2 + (gx - left - gw / 2) * scale, 108 - bodyH + (gy - top - gh / 2) * scale, gw * scale, gh * scale);
  return { ...sprite, r60: true, glove, grip: { x: (point.x - 0.5) * bodyW, y: -bodyH + point.y * h * scale } };
}
function mountedLeanR60(pose) {
  return 0.025 + (pose?.attacking ? Math.sin(Math.max(0, Math.min(1, pose.attackPhase ?? 0)) * Math.PI) * 0.13 : 0);
}
function drawRiderLayerR60(ctx, sprite, pose, x, y, direction, gloveOnly = false) {
  ctx.save();
  ctx.translate(x, y - 20 + pose.bob);
  if (direction < -0.08) ctx.scale(-1, 1);
  if (!gloveOnly) ctx.drawImage(sprite.legs, -72, -108);
  ctx.rotate(mountedLeanR60(pose));
  ctx.drawImage(gloveOnly ? sprite.glove : sprite.torso, -72, -108);
  ctx.restore();
  return true;
}
function mountedHandR60(x, y, direction, mount) {
  const facing = direction < -0.08 ? -1 : 1, p = mount.gripR60, lean = mountedLeanR60(mount), cos = Math.cos(lean), sin = Math.sin(lean);
  return { x: x + facing * (p.x * cos - p.y * sin), y: y + 8 + (mount.bob ?? 0) + p.x * sin + p.y * cos, facing };
}
function mountedWeaponRotationR60(role, rotation, pose) {
  if (role !== "muhafiz" || !pose?.mountedR58?.gripR60) return rotation;
  return pose.attacking ? rotation : rotation - Math.PI;
}

// working/core511-source/scripts/core511/castle-model-r59.mjs
var CASTLE_AREA = "guild_castle";
var CASTLE_BOUNDS = Object.freeze({ width: 2400, height: 1600 });
var CASTLE_ENTRY = Object.freeze({ x: 1200, y: 1430 });
var CASTLE_OBJECTIVES = Object.freeze([
  Object.freeze({ id: "west", name: "Bat\u0131 M\xFChr\xFC", x: 535, y: 910, radius: 115, captureMs: 1e4 }),
  Object.freeze({ id: "east", name: "Do\u011Fu M\xFChr\xFC", x: 1870, y: 910, radius: 115, captureMs: 1e4 }),
  Object.freeze({ id: "throne", name: "Kale Taht\u0131", x: 1200, y: 535, radius: 145, captureMs: 3e4 })
]);

// working/core511-source/scripts/core511/castle-client-r59.mjs
var available = false;
var acceptCastleOptionsR59 = (v) => available = v?.castleR59 === true;
var castleFeatureR59 = () => available;
var CASTLE_MAP_R59 = "/assets/castle-map-r59.webp";
var isCastleAreaR59 = (area) => area === CASTLE_AREA;
function castleFriendlyR59(world, id) {
  const c = world?.castleR59;
  return !c || !c.enabled || c.phase !== "battle" || !c.guild?.id || !c.guilds?.[id] || c.guild.id === c.guilds[id];
}
var palette = ["#63d5e4", "#cf89ee", "#eb8272", "#99cf76", "#a5b8ff", "#eac970"];
var color = (id) => {
  if (!id) return "#c8baa0";
  let hash = 0;
  for (const ch of id) hash = hash * 31 + ch.charCodeAt(0) | 0;
  return palette[Math.abs(hash) % palette.length];
};
function label(ctx, text, x, y, size = 18) {
  ctx.textAlign = "center";
  ctx.font = `700 ${size}px system-ui`;
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#101719";
  ctx.strokeText(String(text).slice(0, 48), x, y);
  ctx.fillStyle = "#fff3d6";
  ctx.fillText(String(text).slice(0, 48), x, y);
}
function drawThroneR59(ctx, tone, t, owned) {
  const shape = (points, fill, stroke = "#634a23", width = 2) => {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const p of points.slice(1)) ctx.lineTo(...p);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  ctx.fillStyle = "#0a111666";
  ctx.beginPath();
  ctx.ellipse(2, 14, 63, 21, 0, 0, Math.PI * 2);
  ctx.fill();
  shape([[-52, 4], [0, -14], [52, 4], [52, 16], [0, 33], [-52, 16]], "#796a53", "#ad915a");
  shape([[-52, 4], [0, -14], [52, 4], [0, 21]], "#b7a182", "#e4c780");
  const gold = ctx.createLinearGradient(-40, -120, 40, 10);
  gold.addColorStop(0, "#fcdf8a");
  gold.addColorStop(0.4, "#9b6b2b");
  gold.addColorStop(0.68, "#f6d47a");
  gold.addColorStop(1, "#735122");
  shape([[-34, -24], [-36, -88], [-23, -115], [0, -132], [23, -115], [36, -88], [34, -24]], gold, "#5b4025", 3);
  const velvet = ctx.createLinearGradient(0, -111, 0, -25);
  velvet.addColorStop(0, "#762d37");
  velvet.addColorStop(1, "#271823");
  shape([[-25, -31], [-27, -85], [-16, -105], [0, -116], [16, -105], [27, -85], [25, -31]], velvet, "#edca76");
  for (const y of [-87, -65, -43]) {
    ctx.fillStyle = "#c59959";
    ctx.beginPath();
    ctx.arc(0, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  shape([[-31, -25], [31, -25], [40, -7], [0, 5], [-40, -7]], "#792e35", "#e8c474", 3);
  for (const side of [-1, 1]) {
    const x = side * 36;
    shape([[x - 5, -39], [x + 5, -39], [x + 7, 13], [x - 5, 16]], gold);
    ctx.fillStyle = "#f4d688";
    ctx.beginPath();
    ctx.arc(x, -43, 7, 0, Math.PI * 2);
    ctx.fill();
    shape([[x - 8, -25], [x + 8, -25], [x + 8, -13], [x - 8, -13]], gold);
  }
  shape([[-14, -124], [0, -145], [14, -124], [0, -116]], gold, "#f9df9f");
  ctx.globalAlpha = owned ? 0.78 + 0.15 * Math.sin(t * 2) : 0.7;
  shape([[0, -136], [6, -126], [0, -119], [-6, -126]], owned ? tone : "#a5b2bc", "#fcf1c8", 1);
  ctx.globalAlpha = 1;
}
function drawCastleSceneR59(ctx, world, now, visible = () => true) {
  if (world?.area !== CASTLE_AREA) return;
  const c = world.castleR59, t = now / 1e3;
  ctx.save();
  for (const o of CASTLE_OBJECTIVES) {
    if (!visible(o.x, o.y, 250)) continue;
    const owner = o.id === "throne" ? c?.owner?.id : c?.seals?.[o.id], tone = color(owner), capture = c?.captures?.[o.id], phase = capture ? Math.max(0, Math.min(1, (now - capture.since) / o.captureMs)) : 0;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.strokeStyle = tone;
    ctx.fillStyle = tone + "15";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, o.radius, o.radius * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.4 + 0.15 * Math.sin(t * 2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, o.radius + 10, o.radius * 0.62 + 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (capture) {
      ctx.strokeStyle = color(capture.guild);
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.ellipse(0, 0, o.radius + 5, o.radius * 0.62 + 3, 0, -Math.PI / 2, -Math.PI / 2 + phase * Math.PI * 2);
      ctx.stroke();
    }
    if (o.id === "throne") {
      drawThroneR59(ctx, tone, t, Boolean(owner));
    } else {
      ctx.fillStyle = "#403f46";
      ctx.strokeStyle = "#b1a38d";
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 19, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = tone;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -76);
      ctx.lineTo(19, -42);
      ctx.lineTo(0, -8);
      ctx.lineTo(-19, -42);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#f7edcf";
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + t * 0.22;
      ctx.globalAlpha = 0.3 + 0.25 * Math.sin(t * 1.5 + i);
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (o.radius * 0.8), Math.sin(a) * (o.radius * 0.42) - 12 - 8 * Math.sin(t + i), 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    label(ctx, o.name, 0, o.radius * 0.62 + 27, 17);
    if (capture) label(ctx, Math.ceil((1 - phase) * o.captureMs / 1e3) + " sn", 0, 30, 15);
    ctx.restore();
  }
  if (visible(1200, 260, 500)) {
    const owner = c?.owner;
    ctx.fillStyle = "#25232aec";
    ctx.strokeStyle = owner ? color(owner.id) : "#b89a62";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(940, 203);
    ctx.lineTo(1460, 203);
    ctx.lineTo(1460, 268 + Math.sin(t * 1.1) * 3);
    ctx.lineTo(1200, 285);
    ctx.lineTo(940, 268 + Math.sin(t) * 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    label(ctx, owner?.name ?? "SAH\u0130PS\u0130Z KALE", 1200, 239, 27);
    label(ctx, c?.phase === "battle" ? "Taht i\xE7in sava\u015F" : c?.phase === "preparation" ? "Haz\u0131rl\u0131k \xB7 PvP kapal\u0131" : "Lonca Kalesi", 1200, 265, 14);
  }
  ctx.restore();
}
var css = `.castle59-entry{position:absolute;right:16px;top:110px;z-index:24;border:1px solid #af915b;background:linear-gradient(135deg,#302a26,#111a21);color:#f8e7bb;border-radius:10px;padding:10px 15px;font:700 13px system-ui;box-shadow:0 4px 16px #0008}.castle59-hud{position:absolute;top:84px;left:50%;transform:translateX(-50%);width:min(540px,calc(100% - 32px));padding:12px 16px;background:linear-gradient(120deg,#121c27ee,#252322ed);border:1px solid #a68e5a88;border-radius:12px;color:#efe4ce;z-index:23;pointer-events:none;box-shadow:0 7px 26px #0005;font:13px system-ui}.castle59-hud header,.castle59-row{display:flex;justify-content:space-between;align-items:center;gap:12px}.castle59-hud header strong{color:#f2d89a;letter-spacing:.08em}.castle59-hud small{color:#bac6d0}.castle59-objectives{display:flex;gap:8px;margin:9px 0}.castle59-objectives span{flex:1;padding:6px;border:1px solid #c7a56d33;border-radius:7px;text-align:center;background:#0002}.castle59-hud p{margin:5px 0;color:#c8d2d9;font-size:12px}.castle59-hud button{pointer-events:auto}.castle59-dialog{position:fixed;inset:0;z-index:150;display:grid;place-items:center;background:#050c14bd;padding:18px;backdrop-filter:blur(5px)}.castle59-card{width:min(680px,100%);max-height:90dvh;overflow:auto;border:1px solid #b19760;border-radius:17px;background:#121b24;color:#e9e4d8;box-shadow:0 24px 80px #000a;font:14px/1.5 system-ui}.castle59-hero{height:160px;background:linear-gradient(0deg,#121b24,transparent 80%),url('${CASTLE_MAP_R59}') center 24%/cover;display:flex;align-items:end;padding:20px 24px}.castle59-hero h2{margin:0;font-size:30px;color:#ffe9b9}.castle59-body{padding:0 24px 24px}.castle59-body p{color:#bfcbd5}.castle59-body ol{padding-left:20px}.castle59-body li{margin:7px 0}.castle59-buttons{display:flex;gap:10px;flex-wrap:wrap}.castle59-button{cursor:pointer;border:1px solid #b99b60;background:#28313a;color:#f3e9cf;border-radius:8px;padding:9px 13px;font:700 13px system-ui}.castle59-button.primary{background:linear-gradient(130deg,#bf9b55,#8e6530);color:#10161c}.castle59-button:disabled{opacity:.45;cursor:wait}.castle59-chest{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;margin:8px 0;background:#25313b;border-radius:9px}.castle59-notice{padding:10px;border-left:3px solid #d4b171;background:#0002}.castle59-hud .castle59-button{padding:5px 9px;font-size:12px}@media(max-width:650px){.castle59-entry{right:10px;top:100px;padding:8px 11px}.castle59-hud{top:66px;padding:8px 10px;font-size:11px;width:calc(100% - 20px)}.castle59-hud p{font-size:10px}.castle59-objectives{margin:5px 0;gap:4px}.castle59-objectives span{padding:4px}.castle59-hero{height:125px;padding:16px}.castle59-hero h2{font-size:26px}.castle59-body{padding:0 16px 18px}}@media(prefers-reduced-motion:reduce){.castle59-dialog{backdrop-filter:none}}`;
function createCastleUIR59(React, loadOptions) {
  const h = React.createElement;
  return function CastleHost({ own, world, joined, post, onChanged, uiSuspended }) {
    const [enabled2, setEnabled] = React.useState(false), [open, setOpen] = React.useState(false), [data, setData] = React.useState(null), [busy, setBusy] = React.useState(false), [notice, setNotice] = React.useState(""), lock = React.useRef(false), close = React.useRef(null);
    React.useEffect(() => {
      let active = true;
      loadOptions().then((v) => {
        if (active) setEnabled(v.castleR59 === true);
      });
      return () => {
        active = false;
      };
    }, []);
    const act = async (action, extra = {}) => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      try {
        const r = await post("/api/castle-r59", { action, ...extra });
        if (r.castle) setData(r.castle);
        setNotice(r.message ?? "");
        if (action === "enter") {
          setOpen(false);
          await onChanged?.();
        } else if (action !== "status") {
          await onChanged?.();
          const state = await post("/api/castle-r59", { action: "status" });
          setData(state.castle);
        }
      } catch (e) {
        setNotice(e.message ?? "Kale bilgileri al\u0131namad\u0131.");
      } finally {
        lock.current = false;
        setBusy(false);
      }
    };
    const show = () => {
      setOpen(true);
      void act("status");
    };
    React.useEffect(() => {
      if (!open) return;
      const old = document.activeElement;
      close.current?.focus();
      const key = (e) => {
        e.stopImmediatePropagation();
        if (e.key === "Escape" && !lock.current) setOpen(false);
        if (e.key === "Tab") {
          const nodes = [...document.querySelectorAll(".castle59-card button:not(:disabled)")];
          if (!nodes.length) return;
          const first = nodes[0], last = nodes.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      window.addEventListener("keydown", key, true);
      return () => {
        window.removeEventListener("keydown", key, true);
        old?.focus?.();
      };
    }, [open]);
    if (!enabled2 || !joined || !own || uiSuspended) return null;
    const inside = world?.area === CASTLE_AREA, c = world?.castleR59 ?? data, phase = c?.phase, seconds = Math.max(0, Math.ceil(((phase === "battle" ? c.endsAt : c?.startsAt) ?? 0) - (c?.serverTime ?? 0)) / 1e3), clock = Math.floor(seconds / 60) + ":" + String(Math.ceil(seconds % 60)).padStart(2, "0");
    const button = (text, fn, primary = false, disabled = false) => h("button", { type: "button", className: "castle59-button" + (primary ? " primary" : ""), disabled: busy || disabled, onClick: fn }, text);
    return h(React.Fragment, null, h("style", null, css), !inside && world?.area === "bazaar" && h("button", { type: "button", className: "castle59-entry", onClick: show }, "\u265C Lonca Kalesi"), inside && h("aside", { className: "castle59-hud", "aria-label": "Kale sava\u015F\u0131" }, h("header", null, h("strong", null, "\u265C LONCA KALES\u0130"), h("span", null, c?.enabled && c?.status === "active" && phase === "battle" ? (c?.test ? "TEST \xB7 " : "SAVA\u015E \xB7 ") + clock : phase === "preparation" ? "HAZIRLIK \xB7 " + clock : "PvP kapal\u0131")), h("div", { className: "castle59-objectives" }, ...CASTLE_OBJECTIVES.map((o) => {
      const owner = o.id === "throne" ? c?.owner?.id : c?.seals?.[o.id];
      return h("span", { key: o.id, style: { borderColor: color(owner) + "88" } }, o.name, h("br"), h("small", null, owner ? c?.guildNames?.[owner] ?? "Lonca" : "Sahipsiz"));
    })), h("p", null, c?.test ? "Y\xF6netici testi \xB7 \xD6d\xFCl yok. \u0130ki m\xFChr\xFC al, taht\u0131 tut." : c?.enabled && c?.status === "active" && phase === "battle" ? "\u0130ki m\xFChr\xFC al \u2192 tahtta 30 sn dur. Rakip \xE7embere girerse s\xFCre s\u0131f\u0131rlan\u0131r." : "Haz\u0131rl\u0131k 19:30 \xB7 Sava\u015F 20:00\u201320:30 \xB7 T\xFCrkiye saati"), h("div", { className: "castle59-row" }, h("small", null, c?.scores?.[0] ? c.scores[0].name + " \xB7 " + Math.floor(c.scores[0].ms / 1e3) + " puan" : "Taht\u0131 tutan lonca saniyede 1 puan kazan\u0131r."), button("Kale / Sand\u0131k", show))), open && h("div", { className: "castle59-dialog", onPointerDown: (e) => e.stopPropagation() }, h("section", { className: "castle59-card", role: "dialog", "aria-modal": true, "aria-labelledby": "castle59-title" }, h("div", { className: "castle59-hero" }, h("h2", { id: "castle59-title" }, "Lonca Kalesi")), h("div", { className: "castle59-body" }, h("p", null, "Her g\xFCn T\xFCrkiye saatiyle 19:30 haz\u0131rl\u0131k, 20:00 sava\u015F, 20:30 sonu\xE7. Lonca ba\u015F\u0131na sava\u015Fa kat\u0131l\u0131m kotas\u0131 yok."), h("ol", null, h("li", null, "Bat\u0131 ve Do\u011Fu M\xFChr\xFC \xE7emberlerinde 10 saniye durarak ikisini de loncana ge\xE7ir."), h("li", null, "\u0130ki m\xFCh\xFCr sizdeyken taht \xE7emberinde 30 saniye kal. Rakip lonca \xE7embere girerse ele ge\xE7irme s\xFCresi s\u0131f\u0131rlan\u0131r."), h("li", null, "Taht\u0131 tuttu\u011Funuz her saniye 1 puan. 20:30\u2019da en y\xFCksek puanl\u0131 lonca kazan\u0131r; e\u015Fitlikte en uzun kesintisiz tutu\u015F kazan\u0131r.")), h("p", null, "Lonca arkada\u015F\u0131na hasar veremezsin. \xD6l\xFCrsen Pazar K\xF6y\xFC\u2019nde canlan\u0131r, tekrar kaleye girebilirsin. Kalede \xF6l\xFCm nedeniyle e\u015Fya, EXP veya m\xFCcevher kayb\u0131 yok."), h("p", null, "Sava\u015F ba\u015Flad\u0131\u011F\u0131nda kazanan loncan\u0131n \xFCyesi olan her karakter, \xE7evrimd\u0131\u015F\u0131 olsa da bir ki\u015Fisel sand\u0131k kazan\u0131r. \u0130\xE7eri\u011Fi y\xF6netici belirler; ge\xE7mi\u015F sand\u0131k haklar\u0131 g\xFCnl\xFCk yenilenmede silinmez."), data?.owner && h("p", null, "Kalenin sahibi: " + data.owner.name), data && !data.enabled && h("p", { className: "castle59-notice" }, "Sava\u015F hen\xFCz y\xF6netici taraf\u0131ndan a\xE7\u0131lmad\u0131. Haritay\u0131 ziyaret edebilirsin."), data?.test && h("p", { className: "castle59-notice" }, "Y\xF6netici test sava\u015F\u0131 a\xE7\u0131k. Testten sand\u0131k/\xF6d\xFCl kazan\u0131lmaz; eski sand\u0131k haklar\u0131n korunur."), h("h3", null, "Kale sand\u0131klar\u0131m"), ...(data?.chests ?? []).map((chest) => h("div", { key: chest.day, className: "castle59-chest" }, h("span", null, chest.day + " \xB7 Zafer sand\u0131\u011F\u0131"), button("Sand\u0131\u011F\u0131 a\xE7", () => void act("claim", { day: chest.day }), true))), data && !data.chests?.length && h("p", null, "A\xE7\u0131lmam\u0131\u015F kale sand\u0131\u011F\u0131n yok."), notice && h("p", { role: "status", className: "castle59-notice" }, notice), h("div", { className: "castle59-buttons" }, inside ? button("Pazara d\xF6n", () => void act("leave")) : button(data?.guild ? "Kaleye gir" : "Lonca \xFCyeli\u011Fi gerekli", () => void act("enter"), true, !data?.guild || own.hp <= 0), h("button", { ref: close, type: "button", className: "castle59-button", disabled: busy, onClick: () => setOpen(false) }, "Kapat"))))));
  };
}

// working/core511-source/scripts/core511/gameplay-client-r55.mjs
var clientGameplayR55 = { mountRender: false, mobileExperience: false, dungeonProgress: false };
var EXPERIENCE_CSS_R55 = `@media(pointer:coarse){
.game-shell[data-col-r55-xp="true"] .combat-dock .hero-level{display:flex!important;flex:0 0 48px;flex-direction:column;align-items:center;align-self:flex-end;justify-content:flex-end;min-width:48px;width:48px;max-width:48px;padding:0 2px 8px;gap:3px;box-sizing:border-box}
.game-shell[data-col-r55-xp="true"] .combat-dock .hero-level>span{display:none}
.game-shell[data-col-r55-xp="true"] .combat-dock .hero-level strong{width:28px;min-width:28px;height:28px;font-size:13px;line-height:24px}
.game-shell[data-col-r55-xp="true"] .combat-dock .hero-level [data-slot=progress]{display:block!important;width:44px;height:5px;min-height:5px;flex-shrink:0}
.game-shell[data-col-r55-xp="true"] .combat-dock .hero-level small{display:block!important;white-space:normal;overflow-wrap:anywhere;text-align:center;max-width:48px;font-size:9px;line-height:1.15;color:#e1d5af}
}`;
function createGameplayUIR55(React, loadOptions) {
  return function GameplayUIR55() {
    const [flags, setFlags] = React.useState(null);
    React.useEffect(() => {
      let active = true;
      void loadOptions().then((data) => {
        if (!active) return;
        const next = data.gameplayR55 ?? {};
        for (const key of Object.keys(clientGameplayR55)) clientGameplayR55[key] = next[key] === true;
        setFlags({ ...clientGameplayR55 });
      });
      return () => {
        active = false;
      };
    }, []);
    React.useEffect(() => {
      const shell = document.querySelector(".game-shell");
      if (!shell || !flags?.mobileExperience) return;
      shell.setAttribute("data-col-r55-xp", "true");
      window.dispatchEvent(new Event("resize"));
      return () => shell.removeAttribute("data-col-r55-xp");
    }, [flags?.mobileExperience]);
    return flags?.mobileExperience ? React.createElement("style", null, EXPERIENCE_CSS_R55) : null;
  };
}
var dungeonMotionR55 = (Legacy, Native) => class {
  constructor(x, y) {
    return new (clientGameplayR55.dungeonProgress ? Native : Legacy)(x, y);
  }
};

// working/core511-source/scripts/core511/gameplay-client-r58.mjs
var clientGameplayR58 = { mountCombat: false, mountRender: false, dungeonWorldControls: false, adminAccessories: false, mistLevelRewards: false };
function acceptGameplayR58(flags) {
  for (const key of Object.keys(clientGameplayR58)) clientGameplayR58[key] = flags?.[key] === true;
}
var mountedSkillBlockedR58 = (player, ability) => clientGameplayR58.mountCombat && player?.mount?.mounted === true && Number(ability) !== 0;
function mountedHandR58(role, x, y, frame, direction, mount) {
  if (mount?.gripR60) return mountedHandR60(x, y, direction, mount);
  const facing = direction < -0.08 ? -1 : 1, phase = mount?.attackPhase ?? 0, swing = mount?.attacking ? Math.sin(phase * Math.PI) : 0, lean = 0.06 + swing * 0.16;
  const hx = role === "avci" ? 23 : role === "arkanist" ? 20 : 22, hy = -5;
  return { x: x + facing * (hx * Math.cos(lean) - hy * Math.sin(lean)), y: y + 8 + (mount?.bob ?? 0) + hx * Math.sin(lean) + hy * Math.cos(lean), facing };
}
function dungeonSnapshotR58(data) {
  return !clientGameplayR58.dungeonWorldControls || Object.hasOwn(data ?? {}, "run");
}
function dungeonAttackR58(control, skill, now = performance.now()) {
  if (!control.me || control.me.hp <= 0 || control.run?.status !== "active") return;
  const support = skill === 3 && ["heal", "guard"].includes(control.branch456?.effect);
  let target = control.run.enemies.find((row) => row.id === control.target && row.hp > 0);
  if (!target && !support) {
    let distance = Infinity;
    for (const row of control.run.enemies) {
      if (row.hp <= 0) continue;
      const d = Math.hypot(row.x - control.me.x, row.y - control.me.y);
      if (d < distance) {
        target = row;
        distance = d;
      }
    }
  }
  if (!target && !support) return;
  control.queued = skill;
  if (target && !support) {
    control.target = target.id;
    control.chase = true;
    control.destination = null;
    if (skill === 0) control.autoAttack = true;
  }
  control.prepareStrike(now);
}

// working/core511-source/scripts/core511/mount-render-r49.mjs
var KINDS = /* @__PURE__ */ new Set(["wolf", "boar", "stag"]);
function createMountRendererR49(art2 = {}, host = globalThis) {
  const images = /* @__PURE__ */ new Map(), riders = /* @__PURE__ */ new Map(), sourceIds = /* @__PURE__ */ new WeakMap();
  let nextSourceId = 0;
  function asset(kind) {
    if (!KINDS.has(kind) || !art2[kind]) return null;
    let row = images.get(kind);
    if (!row) {
      const config = typeof art2[kind] === "string" ? { src: art2[kind] } : art2[kind], image = new host.Image();
      row = { ...config, image, columns: config.columns ?? 6, rows: config.rows ?? 1, width: config.width ?? 200, seatX: config.seatX ?? 0.44, seatY: config.seatY ?? 0.44, baseline: config.baseline ?? 0.9375 };
      image.decoding = "async";
      image.src = config.src;
      images.set(kind, row);
    }
    return row.image.complete && row.image.naturalWidth > 0 && row.image.naturalHeight > 0 ? row : null;
  }
  function pose(mount, moving, now, direction = 1, attackPhase = 0, attacking = false) {
    if (!mount?.mounted || !KINDS.has(mount.kind)) return null;
    const a = asset(mount.kind);
    if (!a) return null;
    const cellWidth = a.image.naturalWidth / a.columns, cellHeight = a.image.naturalHeight / a.rows, height = a.width * cellHeight / cellWidth, frame = moving ? 1 + Math.floor(now / 105) % Math.max(1, a.columns * a.rows - 1) : 0, placement = a.placement?.[frame] ?? a;
    const baseline = placement.baseline ?? a.baseline, seatY = placement.seatY ?? a.seatY, seatX = placement.seatX ?? a.seatX, lift = Math.max(48, (baseline - seatY) * height + 8);
    return { ...a, baseline, seatX, seatY, cellWidth, cellHeight, height, frame, flip: direction < -0.08 ? -1 : 1, bob: moving ? Math.sin(now / 105 * Math.PI) * 1.15 : 0, lift, labelLift: Math.max(20, lift - 36), attackPhase, attacking };
  }
  function animal(ctx, p, x, y) {
    if (!p) return false;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(p.flip, 1);
    ctx.shadowBlur = 0;
    ctx.drawImage(p.image, p.frame % p.columns * p.cellWidth, Math.floor(p.frame / p.columns) * p.cellHeight, p.cellWidth, p.cellHeight, -p.seatX * p.width, -p.baseline * p.height, p.width, p.height);
    ctx.restore();
    return true;
  }
  function riderImage(image, row, tinted, fallback = false) {
    if (!image?.complete && !image?.width) return null;
    const source = tinted ?? image, sw = tinted ? source.width : fallback ? (image.naturalWidth ?? image.width) / 3 : (image.naturalWidth ?? image.width) / 6, sh = tinted ? source.height : fallback ? image.naturalHeight ?? image.height : (image.naturalHeight ?? image.height) / 3;
    if (!(sw > 0 && sh > 0)) return null;
    if (!sourceIds.has(source)) sourceIds.set(source, ++nextSourceId);
    const fixed = clientGameplayR55.mountRender, key = sourceIds.get(source) + ":" + row + ":" + fallback + ":" + fixed + ":" + clientGameplayR58.mountRender + ":" + clientGameplayR60.mountRender;
    let cached = riders.get(key);
    if (cached && cached.source === source) return cached.canvas;
    const sample = host.document.createElement("canvas");
    sample.width = Math.ceil(sw);
    sample.height = Math.ceil(sh);
    const c = sample.getContext("2d", { willReadFrequently: true });
    if (!c) return null;
    c.drawImage(source, tinted ? 0 : fallback ? row * sw : 0, tinted || fallback ? 0 : row * sh, sw, sh, 0, 0, sw, sh);
    let left = sw, top = sh, right = 0, bottom = 0;
    try {
      const pixels = c.getImageData(0, 0, sample.width, sample.height).data;
      for (let y = 0; y < sample.height; y++) for (let x = 0; x < sample.width; x++) if (pixels[(y * sample.width + x) * 4 + 3] > 24) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    } catch {
      return null;
    }
    if (right <= left || bottom <= top) return null;
    if (clientGameplayR58.mountRender) {
      const canvas2 = clientGameplayR60.mountRender ? seatedRiderR60(sample, { left, top, w: right - left + 1, h: bottom - top + 1 }, host, row) : seatedRiderR58(sample, { left, top, w: right - left + 1, h: bottom - top + 1 }, host);
      if (!canvas2) return null;
      if (riders.size >= 72) riders.delete(riders.keys().next().value);
      riders.set(key, { source, canvas: canvas2 });
      return canvas2;
    }
    const w = right - left + 1, h = bottom - top + 1, canvas = host.document.createElement("canvas");
    canvas.width = 144;
    canvas.height = 152;
    const out = canvas.getContext("2d");
    if (!out) return null;
    const bodyH = fixed ? 74 : 86, cut = fixed ? 0.55 : 0.7, bodyW = Math.min(94, bodyH * w / (h * (fixed ? cut : 0.72))), seatX = 72, seatY = 108;
    const leg = (x, alpha) => {
      out.save();
      out.globalAlpha = alpha;
      out.translate(x, seatY - 4);
      out.rotate(fixed ? -0.95 : -0.67);
      out.drawImage(sample, left + w * 0.47, top + h * cut, w * 0.31, h * (fixed ? 0.2 : 0.15), -6, 0, 16, fixed ? 24 : 21);
      out.translate(0, fixed ? 21 : 17);
      out.rotate(fixed ? 1.2 : 0.89);
      out.drawImage(sample, left + w * 0.48, top + h * (fixed ? 0.75 : 0.84), w * 0.31, h * (fixed ? 0.25 : 0.16), -6, 0, 14, fixed ? 28 : 24);
      out.restore();
    };
    leg(seatX - 13, 0.68);
    out.drawImage(sample, left, top, w, h * cut, seatX - bodyW / 2, seatY - bodyH, bodyW, bodyH);
    leg(seatX + 4, 1);
    if (riders.size >= 72) riders.delete(riders.keys().next().value);
    riders.set(key, { source, canvas });
    return canvas;
  }
  function body(ctx, p, { image, roleIndex = 0, tinted, fallback, x, y, direction }) {
    const sprite = riderImage(image, roleIndex, tinted, false) ?? riderImage(fallback, roleIndex, null, true);
    if (!sprite) return false;
    if (sprite.r60) {
      p.riderR60 = sprite;
      p.gripR60 = sprite.grip;
      return drawRiderLayerR60(ctx, sprite, p, x, y, direction);
    }
    if (sprite.r58) return drawSeatedRiderR58(ctx, sprite, p, x, y, direction);
    ctx.save();
    ctx.translate(x, y - 20 + p.bob);
    if (direction < -0.08) ctx.scale(-1, 1);
    ctx.drawImage(sprite, -72, -108, 144, 152);
    ctx.restore();
    return true;
  }
  function grip(ctx, p, x, y, direction) {
    return !!p?.riderR60 && drawRiderLayerR60(ctx, p.riderR60, p, x, y, direction, true);
  }
  return { pose, animal, body, grip, cacheSize: () => ({ images: images.size, riders: riders.size }) };
}

// working/core511-source/scripts/core511/mount-client-r49.mjs
var MOUNT_LABELS_R49 = Object.freeze({ wolf: "Kuzey Kurdu", boar: "Z\u0131rhl\u0131 Yaban Domuzu", stag: "Kadim Geyik" });
var MOUNT_NPC_R49 = Object.freeze({ x: 650, y: 1060, reach: 245, name: "Seyis Arda", title: "\u0130lk Yolda\u015F\u0131n", role: "avci" });
var enabled = false;
var suppressedActor = null;
var availabilityListeners = /* @__PURE__ */ new Set();
function setEnabledR49(value) {
  enabled = value === true;
  for (const fn of availabilityListeners) fn(enabled);
}
function createMountOptionsLoaderR49() {
  let flight;
  return (request = globalThis.fetch) => flight ??= Promise.resolve().then(async () => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5e3);
    try {
      const response = await request("/api/core511-r49-options", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      if (!response.ok) return { mounts: false };
      const result = await response.json();
      acceptGameplayR58(result?.gameplayR58);
      acceptGameplayR60(result?.gameplayR60);
      acceptCastleOptionsR59(result);
      return { ...result, mounts: result?.mounts === true, ...result?.gameplayR55 ? { gameplayR55: result.gameplayR55 } : {} };
    } finally {
      clearTimeout(timer);
    }
  }).catch(() => ({ mounts: false }));
}
var loadMountOptionsR49 = createMountOptionsLoaderR49();
var mountEnabledR49 = () => enabled;
function mountStateR49(player) {
  if (!player?.mount?.mounted) {
    if (suppressedActor === player?.id) suppressedActor = null;
    return null;
  }
  return enabled && suppressedActor !== player.id && Object.hasOwn(MOUNT_LABELS_R49, player.mount.kind) ? player.mount : null;
}
function mountSpeedR49(player) {
  return mountStateR49(player) ? 1.25 : 1;
}
function suppressMountR49(player) {
  if (!clientGameplayR58.mountCombat && enabled && player?.mount?.mounted) suppressedActor = player.id;
}
function mountNpcHitR49(world, x, y, coarse) {
  const n = MOUNT_NPC_R49;
  return enabled && world?.area === "bazaar" && Math.abs(x - n.x) < (coarse ? 82 : 66) && y > n.y - 165 && y < n.y + 30 ? n : null;
}
function mountShortcutR49(event, context, host = globalThis.window) {
  if (!enabled || String(event.key).toLowerCase() !== "v") return false;
  const doc = host.document, typing = 'input,textarea,select,[role="textbox"],[contenteditable]:not([contenteditable="false"]),.chat-form';
  if (event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || !context.joined || context.blocked || context.editing || context.pending > 0 || doc.hidden || host.matchMedia("(pointer: coarse)").matches) return true;
  if ([event.target, doc.activeElement, ...event.composedPath?.() ?? []].some((node) => node?.isContentEditable || node?.closest?.(typing)) || doc.querySelector('[role="dialog"],[role="alertdialog"],dialog[open]')) return true;
  const button = doc.querySelector(".mount49-toggle");
  if (button && !button.disabled) {
    event.preventDefault();
    button.click();
  }
  return true;
}
function createMountCommandsR49({ uuid = () => crypto.randomUUID(), now = Date.now, storage = () => globalThis.sessionStorage } = {}) {
  const pending = /* @__PURE__ */ new Map(), allowed = /* @__PURE__ */ new Set(["start", "craft", "tame_start", "tame_step", "select"]);
  const key = (id) => "core511:mount-r49:" + id;
  function read(id) {
    if (pending.has(id)) return pending.get(id);
    try {
      const v = JSON.parse(storage()?.getItem(key(id)) ?? "null");
      if (v && allowed.has(v.action) && typeof v.requestId === "string" && v.requestId.length <= 100 && Number.isSafeInteger(v.requestAt) && v.actorId === id) {
        pending.set(id, v);
        return v;
      }
    } catch {
    }
    return null;
  }
  function clear(id) {
    pending.delete(id);
    try {
      storage()?.removeItem(key(id));
    } catch {
    }
  }
  async function command(post, actorId, action, extra = {}) {
    if (!actorId || !allowed.has(action)) throw Error("Binek i\u015Flemi ge\xE7ersiz.");
    const fingerprint = JSON.stringify([action, extra]), old = read(actorId);
    if (old && old.fingerprint !== fingerprint) throw Error("\xD6nce bekleyen i\u015Flemin sonucunu yeniden sorgula.");
    if (old?.flight) return old.flight;
    const item = old ?? { actorId, action, extra, fingerprint, requestId: uuid(), requestAt: now() };
    pending.set(actorId, item);
    try {
      storage()?.setItem(key(actorId), JSON.stringify(item));
    } catch {
    }
    item.flight = Promise.resolve().then(() => post("/api/mount-r49", { action, ...extra, requestId: item.requestId, requestAt: item.requestAt })).then((result) => {
      if (!result?.ok) throw Object.assign(Error(result?.error ?? "\u0130\u015Flem sonucu hen\xFCz al\u0131namad\u0131."), { status: result?.status, payload: result });
      clear(actorId);
      return result;
    }).catch((error) => {
      const code = error?.payload?.code ?? error?.code;
      if (error?.status >= 400 && error.status < 500 && !["command_outcome_unknown", "operation_pending", "permanent_actor_fenced"].includes(code)) clear(actorId);
      throw error;
    }).finally(() => {
      item.flight = null;
    });
    return item.flight;
  }
  return { command, pending: read, retry: (post, id) => {
    const p = read(id);
    return p ? command(post, id, p.action, p.extra) : Promise.reject(Error("Bekleyen i\u015Flem yok."));
  } };
}
var MOUNT_CSS_R49 = `
.mount49-entry{display:inline-flex;align-items:center;justify-content:center;gap:6px}.mount49-entry svg,.mount49-toggle svg{width:20px;height:20px;flex:none}.mount49-toggle{display:flex;align-items:center;justify-content:center;gap:7px;min-width:64px;min-height:44px;padding:8px 13px;border:1px solid #bfa46a;border-radius:9px;background:#172b23;color:#f5dfac;font:700 13px system-ui;touch-action:manipulation;cursor:pointer}.mount49-toggle[aria-pressed=true]{background:#304b31;border-color:#d4c48d}.mount49-toggle:disabled{opacity:.55;cursor:default}.mount49-toggle kbd{font:600 10px system-ui;color:#b7c6b7;border:1px solid #65765b;padding:1px 4px;border-radius:3px}.mount49-controls{position:fixed;right:calc(18px + env(safe-area-inset-right));bottom:calc(18px + env(safe-area-inset-bottom));z-index:48;display:grid;gap:5px;max-width:180px;pointer-events:auto}.mount49-toast{font-size:11px;color:#f2ddb2;padding:7px 9px;background:#14241eeb;border-radius:7px;overflow-wrap:anywhere}.mount49-dialog{box-sizing:border-box;width:min(820px,calc(100vw - 24px))!important;max-width:calc(100vw - 24px)!important;max-height:calc(100dvh - 24px)!important;overflow:auto!important;background:#111f1b!important;color:#ece9d8;border:1px solid #927a4e!important;border-radius:18px!important;padding:24px!important}.mount49-dialog *{box-sizing:border-box}.mount49-dialog h2{font:700 28px Georgia,serif;color:#edcf8d;margin:0}.mount49-dialog h3{font:700 19px Georgia,serif;color:#e8cf93;margin:0 0 9px}.mount49-dialog p{font-size:13px;line-height:1.55;white-space:normal;overflow-wrap:anywhere}.mount49-dialog button{cursor:pointer;touch-action:manipulation;min-height:44px;white-space:normal;overflow-wrap:anywhere}.mount49-dialog button:disabled{opacity:.5;cursor:default}.mount49-intro{color:#b8c7b9;margin:8px 0 14px}.mount49-badge{display:inline-block;background:#2b402c;color:#d2e3bd;border:1px solid #61734b;border-radius:20px;padding:5px 10px;font-size:11px;margin:0 5px 5px 0}.mount49-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0 18px}.mount49-choice{position:relative;min-width:0;text-align:left;padding:10px;border:1px solid #465a46;border-radius:12px;background:linear-gradient(150deg,#263a2b,#18271f);color:#e7e2c9}.mount49-choice[aria-pressed=true]{border-color:#dabb74;box-shadow:inset 0 0 0 1px #dabb7455;background:linear-gradient(150deg,#3d4930,#252b20)}.mount49-art{display:block;aspect-ratio:1;max-height:160px;width:100%;background-repeat:no-repeat;background-size:600% 100%;background-position:0 0}.mount49-choice strong,.mount49-choice small{display:block;white-space:normal;overflow-wrap:anywhere}.mount49-choice strong{font:700 15px Georgia,serif}.mount49-choice small{font-size:11px;color:#b8c9ad;line-height:1.4;margin-top:6px}.mount49-status{margin:8px 0;color:#bfcdb8}.mount49-steps{display:flex;gap:6px;list-style:none;padding:0;margin:14px 0}.mount49-steps li{flex:1;min-width:0;font-size:11px;border-top:3px solid #3f5041;padding-top:7px;color:#a4b3a0}.mount49-steps li.active{border-color:#d7b86b;color:#f4ddb0}.mount49-steps li.done{border-color:#75aa74;color:#bbd9b1}.mount49-section{padding:16px;background:#15261e;border:1px solid #405642;border-radius:12px;margin:12px 0}.mount49-progress{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.mount49-progress article,.mount49-materials article{padding:10px;border:1px solid #405640;border-radius:8px;min-width:0;background:#192d21}.mount49-progress strong,.mount49-progress small,.mount49-materials strong,.mount49-materials small{display:block;white-space:normal;overflow-wrap:anywhere;font-size:12px;line-height:1.4}.mount49-progress small,.mount49-materials small{color:#c6cfbb;margin-top:4px}.mount49-progress progress{width:100%;height:7px;accent-color:#a7c977}.mount49-materials{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.mount49-materials .ready{border-color:#699165}.mount49-materials .missing{border-color:#856349}.mount49-action{border:1px solid #ddbd75;border-radius:8px;background:linear-gradient(#d9b775,#b18c48);color:#17241a;padding:11px 18px;font-weight:750;font-size:14px}.mount49-secondary{border:1px solid #70825d;border-radius:8px;background:#243c2a;color:#e1d7b7;padding:10px 14px;font-weight:650}.mount49-footer{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-top:16px}.mount49-footer p{flex:1;min-width:150px;margin:0;color:#adbea9}.mount49-message{white-space:pre-wrap!important;padding:10px 12px;border-left:3px solid #c7ab6e;background:#29392a;color:#eadfbe}.mount49-tame{position:relative;height:26px;border:1px solid #658662;background:#0d1b15;border-radius:20px;overflow:hidden;margin:20px 0 12px}.mount49-target{position:absolute;top:0;bottom:0;background:#72bd7666;border-left:1px solid #a8d991;border-right:1px solid #a8d991}.mount49-needle{position:absolute;top:0;bottom:0;width:5px;background:#ffe5a8;box-shadow:0 0 8px #ffe5a8;animation:mount49-sweep var(--mount-duration) linear both;animation-delay:var(--mount-delay)}@keyframes mount49-sweep{from{left:0}to{left:100%}}.mount49-tame-help{font-size:12px;color:#c6d1ba}.mount49-error{color:#f4bca4}.mount49-close{margin-top:12px;background:transparent;border:1px solid #60725c;color:#cbd7c0;padding:8px 13px;border-radius:7px}.mount49-dialog :focus-visible,.mount49-toggle:focus-visible,.mount49-entry:focus-visible{outline:2px solid #e6c57d;outline-offset:3px}
@media(pointer:coarse){.mount49-controls{right:auto;left:calc(18px + env(safe-area-inset-left));bottom:calc(190px + env(safe-area-inset-bottom));max-width:135px}.mount49-toggle{min-height:44px;min-width:63px;padding:7px 10px}.mount49-toggle kbd{display:none}.mobile-controls-editing .mount49-controls{display:none}}@media(max-width:560px){.mount49-dialog{padding:17px!important}.mount49-dialog h2{font-size:24px}.mount49-choices{gap:7px}.mount49-choice{padding:7px}.mount49-choice strong{font-size:12px}.mount49-choice small{font-size:10px}.mount49-section{padding:12px}.mount49-progress{grid-template-columns:1fr}.mount49-materials{grid-template-columns:repeat(2,minmax(0,1fr))}.mount49-steps li{font-size:10px}.mount49-footer .mount49-action{width:100%}}
`;
function createMountUIR49(React, { Dialog, Content, Header, Title, Description, art: art2 = {}, togglePath = "/api/mount-r49", loadOptions = loadMountOptionsR49 } = {}) {
  const h = React.createElement, commands = createMountCommandsR49();
  function Icon() {
    return h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, "aria-hidden": true }, h("path", { d: "M5 20V11L9 5l1-3 3 4 5 3 1 4-4 2-3-2v7M6 11l5-2m4 1h.1M5 20h8" }));
  }
  function Art({ kind }) {
    return h("span", { className: "mount49-art", role: "img", "aria-label": MOUNT_LABELS_R49[kind], style: art2[kind] ? { backgroundImage: `url("${typeof art2[kind] === "string" ? art2[kind] : art2[kind].src}")`, backgroundSize: `${(art2[kind].columns ?? 6) * 100}% ${(art2[kind].rows ?? 1) * 100}%` } : void 0 });
  }
  function Entry({ joined, uiSuspended = false }) {
    const [visible, setVisible] = React.useState(enabled);
    React.useEffect(() => {
      availabilityListeners.add(setVisible);
      setVisible(enabled);
      return () => availabilityListeners.delete(setVisible);
    }, []);
    return joined && visible ? h("button", { type: "button", className: "mount49-entry", "aria-label": "Binekler ve \u0130lk Yolda\u015F\u0131n g\xF6revi", title: "Binekler \xB7 \u0130lk Yolda\u015F\u0131n", disabled: uiSuspended, onClick: () => window.dispatchEvent(new Event("mount49-open")) }, h(Icon), h("span", null, "Binek")) : null;
  }
  function Host({ own, world, joined, post, onChanged, uiSuspended = false }) {
    const [open, setOpen] = React.useState(false), [data, setData] = React.useState(null), [choice, setChoice] = React.useState("wolf"), [busy, setBusy] = React.useState(false), [loading, setLoading] = React.useState(false), [message, setMessage] = React.useState(""), [toast, setToast] = React.useState("");
    const latest = React.useRef(null), alive = React.useRef(false), generation = React.useRef(0), flight = React.useRef(false), offset = React.useRef(0);
    latest.current = { own, world, joined, post, onChanged, uiSuspended };
    function accept(result, id) {
      if (!alive.current || latest.current.own?.id !== id) return;
      const status = result?.mounts ?? result;
      if (typeof status?.enabled !== "boolean") throw Error("Binek bilgileri al\u0131namad\u0131.");
      setEnabledR49(status.enabled);
      setData(status);
      if (Number.isFinite(status.serverTime)) offset.current = status.serverTime - Date.now();
    }
    async function load() {
      const current = latest.current;
      if (!current.joined || !current.own?.id || flight.current) return;
      const id = current.own.id, seq = ++generation.current;
      setLoading(true);
      try {
        const flags = await loadOptions();
        if (!alive.current || seq !== generation.current) return;
        if (!flags.mounts) {
          accept({ enabled: false }, id);
          return;
        }
        setEnabledR49(true);
        const result = await current.post("/api/mount-r49", { action: "status" });
        if (seq === generation.current) accept(result, id);
      } catch (error) {
        if (alive.current && seq === generation.current) {
          if (error?.payload?.code === "mount_disabled" || error?.code === "mount_disabled") accept({ enabled: false }, id);
          else setMessage(error?.message ?? "Binek bilgileri al\u0131namad\u0131.");
        }
      } finally {
        if (alive.current && seq === generation.current) setLoading(false);
      }
    }
    React.useEffect(() => {
      alive.current = true;
      const show = () => {
        if (latest.current.joined && latest.current.own && !latest.current.uiSuspended) {
          setOpen(true);
          setMessage("");
          void load();
        }
      }, hide = () => {
        setOpen(false);
        setToast("");
      };
      window.addEventListener("mount49-open", show);
      for (const event of ["coreoflife:maintenance", "coreoflife:game-session-ended", "pagehide"]) window.addEventListener(event, hide);
      return () => {
        alive.current = false;
        generation.current++;
        window.removeEventListener("mount49-open", show);
        for (const event of ["coreoflife:maintenance", "coreoflife:game-session-ended", "pagehide"]) window.removeEventListener(event, hide);
      };
    }, []);
    React.useEffect(() => {
      setOpen(false);
      setData(null);
      setMessage("");
      setToast("");
      setEnabledR49(false);
      suppressedActor = null;
      generation.current++;
      if (joined && own?.id) void load();
    }, [own?.id, joined]);
    React.useEffect(() => {
      if (uiSuspended) setOpen(false);
    }, [uiSuspended]);
    React.useEffect(() => {
      if (!toast) return;
      const timer = setTimeout(() => setToast(""), 6e3);
      return () => clearTimeout(timer);
    }, [toast]);
    async function act(action, extra = {}) {
      if (flight.current || !own) return;
      flight.current = true;
      generation.current++;
      setLoading(false);
      setBusy(true);
      setMessage("");
      const id = own.id;
      try {
        const result = action === "retry" ? await commands.retry(post, id) : await commands.command(post, id, action, extra);
        accept(result, id);
        if (alive.current && latest.current.own?.id === id) {
          setMessage(result.message ?? "\u0130\u015Flem tamamland\u0131.");
          await latest.current.onChanged?.();
        }
      } catch (error) {
        if (alive.current && latest.current.own?.id === id) setMessage(error?.message ?? "Sonucu yeniden sorgula.");
      } finally {
        flight.current = false;
        if (alive.current) setBusy(false);
      }
    }
    async function toggle() {
      if (flight.current || !own || !joined || uiSuspended) return;
      if (!data?.selected) {
        setOpen(true);
        void load();
        return;
      }
      flight.current = true;
      setBusy(true);
      setToast("");
      const id = own.id;
      try {
        const result = await post(togglePath, { action: "toggle", mounted: !mountStateR49(own), requestId: crypto.randomUUID() });
        if (!result?.ok) throw Error(result?.error ?? "Bine\u011Fe binilemedi.");
        if (alive.current && latest.current.own?.id === id) {
          if (result.mounted || result.mount?.mounted) suppressedActor = null;
          setToast(result.message ?? "Binek g\xFCncellendi.");
          await latest.current.onChanged?.();
        }
      } catch (error) {
        if (alive.current && latest.current.own?.id === id) setToast(error?.message ?? "Binek i\u015Flemi tamamlanamad\u0131.");
      } finally {
        flight.current = false;
        if (alive.current) setBusy(false);
      }
    }
    const quest = data?.quest ?? {}, owned = Array.isArray(data?.owned) ? data.owned : [], waiting = commands.pending(own?.id), mounted = !!mountStateR49(own), near = world?.area === "bazaar" && own && Math.hypot(own.x - MOUNT_NPC_R49.x, own.y - MOUNT_NPC_R49.y) <= MOUNT_NPC_R49.reach, chosen = quest.active ? quest.variant : choice, stage = quest.stage ?? "not_started", stageIndex = { not_started: 0, hunt: 1, craft: 2, tame: 3, complete: 4 }[stage] ?? 0;
    const rows = Array.isArray(data?.materials) ? data.materials : [], hunts = Array.isArray(quest.hunts) ? quest.hunts : [], bosses = Array.isArray(quest.bosses) ? quest.bosses : [], challenge = data?.challenge;
    const now = Date.now() + offset.current, duration = 3200, elapsed = challenge ? now - (challenge.targetAt - 1600) : 0, windowMs = challenge?.windowMs ?? 650;
    const button = (label2, action, extra, disabled = false) => h("button", { type: "button", className: "mount49-action", disabled: busy || loading || !!waiting || disabled, onClick: () => void act(action, extra) }, busy ? "\u0130\u015Fleniyor\u2026" : label2);
    const panel = h(
      React.Fragment,
      null,
      h(Header ?? "header", null, h(Title ?? "h2", null, "\u0130lk Yolda\u015F\u0131n"), h(Description ?? "p", { className: "mount49-intro" }, "Birlikte katetti\u011Finiz yollarla kazan\u0131lan bir ba\u011F. Seyis Arda\u2019n\u0131n g\xF6revini tamamla, eyerini \xFCret ve yolda\u015F\u0131n\u0131n g\xFCvenini kazan.")),
      h("span", { className: "mount49-badge" }, "Seviye 30"),
      h("span", { className: "mount49-badge" }, "Her binekte +%25 yolculuk h\u0131z\u0131"),
      h("span", { className: "mount49-badge" }, "Sava\u015F g\xFCc\xFC vermez"),
      h("div", { className: "mount49-choices" }, ...Object.entries(MOUNT_LABELS_R49).map(([kind, label2]) => h("button", { key: kind, type: "button", className: "mount49-choice", "aria-pressed": chosen === kind, disabled: busy || !!waiting || !!quest.active, onClick: () => setChoice(kind) }, h(Art, { kind }), h("strong", null, label2), h("small", null, owned.includes(kind) ? data?.selected === kind ? "Se\xE7ili yolda\u015F" : "Ba\u011F kuruldu" : kind === "wolf" ? "Kuzeyin \xE7evik yol arkada\u015F\u0131" : kind === "boar" ? "Sa\u011Flam ad\u0131mlarla uzun yollar" : "Kadim orman\u0131n sessiz bek\xE7isi")))),
      owned.length > 0 && h("section", { className: "mount49-section" }, h("h3", null, "Yolda\u015Flar\u0131n"), h("div", { className: "mount49-footer" }, ...owned.map((kind) => h("button", { key: kind, type: "button", className: "mount49-secondary", "aria-pressed": data.selected === kind, disabled: busy || !!waiting || data.selected === kind, onClick: () => void act("select", { kind }) }, data.selected === kind ? "\u2713 " + MOUNT_LABELS_R49[kind] : MOUNT_LABELS_R49[kind]))), h("p", { className: "mount49-status" }, clientGameplayR58.mountCombat ? "Bin / \u0130n d\xFC\u011Fmesini veya PC\u2019de V tu\u015Funu kullan. Binek \xFCzerinde 1, Space veya Sald\u0131r ile d\xFCz vuru\u015F yapabilirsin. Yetenek i\xE7in inmelisin. Sava\u015F s\u0131ras\u0131nda yeniden binemezsin; arena, kule ve zindanlarda kullan\u0131lamaz." : "Bin / \u0130n d\xFC\u011Fmesini veya PC\u2019de V tu\u015Funu kullan. Sald\u0131r\u0131nca ve hasar al\u0131nca inersin; sava\u015F s\u0131ras\u0131nda yeniden binemezsin. Arena, kule ve zindanlarda kullan\u0131lamaz.")),
      h("ol", { className: "mount49-steps", "aria-label": "G\xF6rev a\u015Famalar\u0131" }, ...["Yolda\u015F se\xE7", "\u0130z s\xFCr", "Eyer \xFCret", "G\xFCven kazan"].map((label2, index) => h("li", { key: label2, className: stageIndex > index ? "done" : stageIndex === index ? "active" : "" }, `${index + 1}. ${label2}`))),
      loading && h("p", { role: "status" }, "Binek bilgileri y\xFCkleniyor\u2026"),
      stage === "not_started" || stage === "complete" ? h("section", { className: "mount49-section" }, h("h3", null, stage === "complete" ? "Yeni yollar seni bekliyor" : "Seyis Arda seni bekliyor"), h("p", null, "Pazar K\xF6y\xFC\u2019n\xFCn g\xFCneybat\u0131s\u0131nda Seyis Arda\u2019ya yakla\u015F. \xDC\xE7 b\xF6lgede avlan, iki farkl\u0131 boss sava\u015F\u0131na katk\u0131 ver ve eyer malzemelerini topla. G\xF6rev seviye 30\u2019da ba\u015Flar; Kara B\xF6lge a\u015Famas\u0131 seviye 40 ister."), h("div", { className: "mount49-footer" }, h("p", null, !near ? "Seyis Arda: Pazar K\xF6y\xFC \xB7 g\xFCneybat\u0131" : (own?.level ?? 0) < 30 ? "G\xF6reve ba\u015Flamak i\xE7in seviye 30 olmal\u0131s\u0131n." : "Se\xE7ti\u011Fin yolda\u015F i\xE7in g\xF6reve haz\u0131rs\u0131n."), button(owned.includes(choice) ? "Bu yolda\u015F zaten senin" : "G\xF6reve ba\u015Fla", "start", { kind: choice }, !near || (own?.level ?? 0) < 30 || owned.includes(choice)))) : null,
      stage === "hunt" || stage === "craft" ? h("section", { className: "mount49-section" }, h("h3", null, "\u0130z s\xFCrme ve haz\u0131rl\u0131k"), h("div", { className: "mount49-progress" }, ...hunts.map((row) => h("article", { key: row.area }, h("strong", null, row.label), h("small", null, `${row.current} / ${row.required}${row.minLevel > 1 ? " \xB7 Sv. " + row.minLevel : ""}`), h("progress", { value: Math.min(row.current, row.required), max: row.required, "aria-label": row.label })))), h("p", null, `Boss katk\u0131s\u0131: ${bosses.filter((row) => row.earned).length} / ${quest.bossRequired ?? 2} farkl\u0131 boss. Son vuru\u015F \u015Fart de\u011Fil.`), bosses.length > 0 && h("p", { className: "mount49-status" }, bosses.map((row) => (row.earned ? "\u2713 " : "\u25CB ") + row.label).join(" \xB7 ")), h("h3", null, "Eyer malzemeleri"), h("div", { className: "mount49-materials" }, ...rows.map((row) => h("article", { key: row.kind, className: row.amount >= row.required ? "ready" : "missing" }, mountMaterialIconR60(React, row.kind), h("strong", null, row.label), h("small", null, `${row.amount} / ${row.required}`)))), h("div", { className: "mount49-footer" }, h("p", null, clientGameplayR60.mountMaterials ? "Eyer malzemeleri \xC7anta \u2192 Malzemeler b\xF6l\xFCm\xFCnde birikir; oyuncu pazar\u0131nda al\u0131n\u0131p sat\u0131labilir. Eyer \xFCretimi kesindir." : "Malzemeler karakterine ba\u011Fl\u0131d\u0131r. Eyer \xFCretimi kesindir; ba\u015Far\u0131s\u0131z \xFCretim yok."), button(!near ? "Seyis Arda\u2019ya yakla\u015F" : "Eyeri \xFCret", "craft", {}, !near || stage !== "craft"))) : null,
      stage === "tame" ? h("section", { className: "mount49-section" }, h("h3", null, `${MOUNT_LABELS_R49[chosen] ?? "Yolda\u015F\u0131n"} ile ba\u011F kur`), h("p", null, "\u0130\u015Faret ye\u015Fil alana geldi\u011Finde \u201CSakinle\u015Ftir\u201De dokun. \xDC\xE7 do\u011Fru ad\u0131mla g\xFCvenini kazan. Ka\xE7\u0131r\u0131rsan eyerin ve malzemelerin korunur."), challenge ? h(React.Fragment, null, h("p", { className: "mount49-tame-help" }, `G\xFCven ad\u0131m\u0131 ${challenge.step + 1} / 3`), h("div", { className: "mount49-tame", role: "img", "aria-label": "Ye\u015Fil alan geldi\u011Finde Sakinle\u015Ftir d\xFC\u011Fmesine bas" }, h("span", { className: "mount49-target", style: { left: `${Math.max(0, (1600 - windowMs) / duration * 100)}%`, width: `${Math.min(100, windowMs * 2 / duration * 100)}%` } }), h("span", { key: challenge.id + ":" + challenge.step, className: "mount49-needle", style: { "--mount-duration": duration + "ms", "--mount-delay": -Math.max(0, elapsed) + "ms" } })), button("Sakinle\u015Ftir", "tame_step", { challengeId: challenge.id, step: challenge.step }, !near), h("p", { className: "mount49-tame-help" }, "Deneme s\xFCresi dolarsa a\u015Fa\u011F\u0131daki yeniden dene d\xFC\u011Fmesiyle \xFCcretsiz ba\u015Flayabilirsin."), h("button", { type: "button", className: "mount49-close", disabled: busy || !!waiting || !near, onClick: () => void act("tame_start", {}) }, "Denemeyi yeniden ba\u015Flat")) : h("div", { className: "mount49-footer" }, h("p", null, near ? "Eyerin haz\u0131r. Yolda\u015F\u0131na yava\u015F\xE7a yakla\u015F." : "Denemek i\xE7in Seyis Arda\u2019ya yakla\u015F."), button("G\xFCven denemesine ba\u015Fla", "tame_start", {}, !near))) : null,
      waiting && h("div", { className: "mount49-message", role: "status" }, h("p", null, "Bekleyen i\u015Flemin sonucu al\u0131namad\u0131. Ayn\u0131 i\u015Flemi g\xFCvenle yeniden sorgulayabilirsin."), h("button", { type: "button", className: "mount49-secondary", disabled: busy, onClick: () => void act("retry") }, "Sonucu yeniden sorgula")),
      message && h("p", { className: "mount49-message", role: "status" }, message),
      h("button", { type: "button", className: "mount49-close", disabled: busy, onClick: () => setOpen(false) }, "Kapat")
    );
    if (!joined || !own || data?.enabled === false) return null;
    if (!data && !open) return null;
    return h(React.Fragment, null, h("style", null, MOUNT_CSS_R49), !uiSuspended && data?.selected && h("div", { className: "mount49-controls" }, h("button", { type: "button", className: "mount49-toggle", "aria-pressed": mounted, "aria-label": mounted ? "Binekten in" : "Bine\u011Fe bin", title: "Bin / \u0130n \xB7 V", disabled: busy || own.hp <= 0, onClick: () => void toggle() }, h(Icon), mounted ? "\u0130n" : "Bin", h("kbd", null, "V")), toast && h("span", { className: "mount49-toast", role: "status" }, toast)), Dialog ? h(Dialog, { open, onOpenChange: (value) => {
      if (!busy) setOpen(value);
    } }, h(Content, { className: "mount49-dialog" }, panel)) : open ? h("section", { className: "mount49-dialog", role: "dialog", "aria-modal": true, "aria-label": "\u0130lk Yolda\u015F\u0131n" }, panel) : null);
  }
  return { Host, Entry, Icon, Art };
}
export {
  MOUNT_CSS_R49,
  MOUNT_LABELS_R49,
  MOUNT_NPC_R49,
  castleFeatureR59,
  castleFriendlyR59,
  clientGameplayR55,
  clientGameplayR58,
  clientGameplayR60,
  createCastleUIR59,
  createGameplayUIR55,
  createMountCommandsR49,
  createMountMaterialsR60,
  createMountOptionsLoaderR49,
  createMountRendererR49,
  createMountUIR49,
  drawCastleSceneR59,
  dungeonAttackR58,
  dungeonMotionR55,
  dungeonSnapshotR58,
  isCastleAreaR59,
  loadMountOptionsR49,
  mountEnabledR49,
  mountMarketEntriesR60,
  mountMaterialIconR60,
  mountNpcHitR49,
  mountShortcutR49,
  mountSpeedR49,
  mountStateR49,
  mountedHandR58,
  mountedSkillBlockedR58,
  mountedWeaponRotationR60,
  suppressMountR49
};
