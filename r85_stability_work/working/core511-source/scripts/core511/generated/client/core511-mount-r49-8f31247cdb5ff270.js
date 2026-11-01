// mounts_r49_work/working/core511-source/scripts/core511/mount-render-r49.mjs
var KINDS = /* @__PURE__ */ new Set(["wolf", "boar", "stag"]);
function createMountRendererR49(art = {}, host = globalThis) {
  const images = /* @__PURE__ */ new Map(), riders = /* @__PURE__ */ new Map(), sourceIds = /* @__PURE__ */ new WeakMap();
  let nextSourceId = 0;
  function asset(kind) {
    if (!KINDS.has(kind) || !art[kind]) return null;
    let row = images.get(kind);
    if (!row) {
      const config = typeof art[kind] === "string" ? { src: art[kind] } : art[kind], image = new host.Image();
      row = { ...config, image, columns: config.columns ?? 6, rows: config.rows ?? 1, width: config.width ?? 200, seatX: config.seatX ?? 0.44, seatY: config.seatY ?? 0.44, baseline: config.baseline ?? 0.9375 };
      image.decoding = "async";
      image.src = config.src;
      images.set(kind, row);
    }
    return row.image.complete && row.image.naturalWidth > 0 && row.image.naturalHeight > 0 ? row : null;
  }
  function pose(mount, moving, now, direction = 1) {
    if (!mount?.mounted || !KINDS.has(mount.kind)) return null;
    const a = asset(mount.kind);
    if (!a) return null;
    const cellWidth = a.image.naturalWidth / a.columns, cellHeight = a.image.naturalHeight / a.rows, height = a.width * cellHeight / cellWidth, frame = moving ? 1 + Math.floor(now / 105) % Math.max(1, a.columns * a.rows - 1) : 0, placement = a.placement?.[frame] ?? a;
    const baseline = placement.baseline ?? a.baseline, seatY = placement.seatY ?? a.seatY, seatX = placement.seatX ?? a.seatX, lift = Math.max(48, (baseline - seatY) * height + 8);
    return { ...a, baseline, seatX, seatY, cellWidth, cellHeight, height, frame, flip: direction < -0.08 ? -1 : 1, bob: moving ? Math.sin(now / 105 * Math.PI) * 1.15 : 0, lift, labelLift: Math.max(20, lift - 36) };
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
    const key = sourceIds.get(source) + ":" + row + ":" + fallback;
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
    const w = right - left + 1, h = bottom - top + 1, canvas = host.document.createElement("canvas");
    canvas.width = 144;
    canvas.height = 152;
    const out = canvas.getContext("2d");
    if (!out) return null;
    const bodyH = 86, bodyW = Math.min(94, bodyH * w / (h * 0.72)), seatX = 72, seatY = 108, cut = 0.7;
    const leg = (x, alpha) => {
      out.save();
      out.globalAlpha = alpha;
      out.translate(x, seatY - 4);
      out.rotate(-0.67);
      out.drawImage(sample, left + w * 0.47, top + h * cut, w * 0.31, h * 0.15, -6, 0, 16, 21);
      out.translate(0, 17);
      out.rotate(0.89);
      out.drawImage(sample, left + w * 0.48, top + h * 0.84, w * 0.31, h * 0.16, -6, 0, 14, 24);
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
    ctx.save();
    ctx.translate(x, y - 20 + p.bob);
    if (direction < -0.08) ctx.scale(-1, 1);
    ctx.drawImage(sprite, -72, -108, 144, 152);
    ctx.restore();
    return true;
  }
  return { pose, animal, body, cacheSize: () => ({ images: images.size, riders: riders.size }) };
}

// mounts_r49_work/working/core511-source/scripts/core511/mount-client-r49.mjs
var MOUNT_LABELS_R49 = Object.freeze({ wolf: "Kuzey Kurdu", boar: "Zırhlı Yaban Domuzu", stag: "Kadim Geyik" });
var MOUNT_NPC_R49 = Object.freeze({ x: 650, y: 1060, reach: 245, name: "Seyis Arda", title: "İlk Yoldaşın", role: "avci" });
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
      return { mounts: result?.mounts === true };
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
  if (enabled && player?.mount?.mounted) suppressedActor = player.id;
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
    if (!actorId || !allowed.has(action)) throw Error("Binek işlemi geçersiz.");
    const fingerprint = JSON.stringify([action, extra]), old = read(actorId);
    if (old && old.fingerprint !== fingerprint) throw Error("Önce bekleyen işlemin sonucunu yeniden sorgula.");
    if (old?.flight) return old.flight;
    const item = old ?? { actorId, action, extra, fingerprint, requestId: uuid(), requestAt: now() };
    pending.set(actorId, item);
    try {
      storage()?.setItem(key(actorId), JSON.stringify(item));
    } catch {
    }
    item.flight = Promise.resolve().then(() => post("/api/mount-r49", { action, ...extra, requestId: item.requestId, requestAt: item.requestAt })).then((result) => {
      if (!result?.ok) throw Object.assign(Error(result?.error ?? "İşlem sonucu henüz alınamadı."), { status: result?.status, payload: result });
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
    return p ? command(post, id, p.action, p.extra) : Promise.reject(Error("Bekleyen işlem yok."));
  } };
}
var MOUNT_CSS_R49 = `
.mount49-entry{display:inline-flex;align-items:center;justify-content:center;gap:6px}.mount49-entry svg,.mount49-toggle svg{width:20px;height:20px;flex:none}.mount49-toggle{display:flex;align-items:center;justify-content:center;gap:7px;min-width:64px;min-height:44px;padding:8px 13px;border:1px solid #bfa46a;border-radius:9px;background:#172b23;color:#f5dfac;font:700 13px system-ui;touch-action:manipulation;cursor:pointer}.mount49-toggle[aria-pressed=true]{background:#304b31;border-color:#d4c48d}.mount49-toggle:disabled{opacity:.55;cursor:default}.mount49-toggle kbd{font:600 10px system-ui;color:#b7c6b7;border:1px solid #65765b;padding:1px 4px;border-radius:3px}.mount49-controls{position:fixed;right:calc(18px + env(safe-area-inset-right));bottom:calc(18px + env(safe-area-inset-bottom));z-index:48;display:grid;gap:5px;max-width:180px;pointer-events:auto}.mount49-toast{font-size:11px;color:#f2ddb2;padding:7px 9px;background:#14241eeb;border-radius:7px;overflow-wrap:anywhere}.mount49-dialog{box-sizing:border-box;width:min(820px,calc(100vw - 24px))!important;max-width:calc(100vw - 24px)!important;max-height:calc(100dvh - 24px)!important;overflow:auto!important;background:#111f1b!important;color:#ece9d8;border:1px solid #927a4e!important;border-radius:18px!important;padding:24px!important}.mount49-dialog *{box-sizing:border-box}.mount49-dialog h2{font:700 28px Georgia,serif;color:#edcf8d;margin:0}.mount49-dialog h3{font:700 19px Georgia,serif;color:#e8cf93;margin:0 0 9px}.mount49-dialog p{font-size:13px;line-height:1.55;white-space:normal;overflow-wrap:anywhere}.mount49-dialog button{cursor:pointer;touch-action:manipulation;min-height:44px;white-space:normal;overflow-wrap:anywhere}.mount49-dialog button:disabled{opacity:.5;cursor:default}.mount49-intro{color:#b8c7b9;margin:8px 0 14px}.mount49-badge{display:inline-block;background:#2b402c;color:#d2e3bd;border:1px solid #61734b;border-radius:20px;padding:5px 10px;font-size:11px;margin:0 5px 5px 0}.mount49-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0 18px}.mount49-choice{position:relative;min-width:0;text-align:left;padding:10px;border:1px solid #465a46;border-radius:12px;background:linear-gradient(150deg,#263a2b,#18271f);color:#e7e2c9}.mount49-choice[aria-pressed=true]{border-color:#dabb74;box-shadow:inset 0 0 0 1px #dabb7455;background:linear-gradient(150deg,#3d4930,#252b20)}.mount49-art{display:block;aspect-ratio:1;max-height:160px;width:100%;background-repeat:no-repeat;background-size:600% 100%;background-position:0 0}.mount49-choice strong,.mount49-choice small{display:block;white-space:normal;overflow-wrap:anywhere}.mount49-choice strong{font:700 15px Georgia,serif}.mount49-choice small{font-size:11px;color:#b8c9ad;line-height:1.4;margin-top:6px}.mount49-status{margin:8px 0;color:#bfcdb8}.mount49-steps{display:flex;gap:6px;list-style:none;padding:0;margin:14px 0}.mount49-steps li{flex:1;min-width:0;font-size:11px;border-top:3px solid #3f5041;padding-top:7px;color:#a4b3a0}.mount49-steps li.active{border-color:#d7b86b;color:#f4ddb0}.mount49-steps li.done{border-color:#75aa74;color:#bbd9b1}.mount49-section{padding:16px;background:#15261e;border:1px solid #405642;border-radius:12px;margin:12px 0}.mount49-progress{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.mount49-progress article,.mount49-materials article{padding:10px;border:1px solid #405640;border-radius:8px;min-width:0;background:#192d21}.mount49-progress strong,.mount49-progress small,.mount49-materials strong,.mount49-materials small{display:block;white-space:normal;overflow-wrap:anywhere;font-size:12px;line-height:1.4}.mount49-progress small,.mount49-materials small{color:#c6cfbb;margin-top:4px}.mount49-progress progress{width:100%;height:7px;accent-color:#a7c977}.mount49-materials{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.mount49-materials .ready{border-color:#699165}.mount49-materials .missing{border-color:#856349}.mount49-action{border:1px solid #ddbd75;border-radius:8px;background:linear-gradient(#d9b775,#b18c48);color:#17241a;padding:11px 18px;font-weight:750;font-size:14px}.mount49-secondary{border:1px solid #70825d;border-radius:8px;background:#243c2a;color:#e1d7b7;padding:10px 14px;font-weight:650}.mount49-footer{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-top:16px}.mount49-footer p{flex:1;min-width:150px;margin:0;color:#adbea9}.mount49-message{white-space:pre-wrap!important;padding:10px 12px;border-left:3px solid #c7ab6e;background:#29392a;color:#eadfbe}.mount49-tame{position:relative;height:26px;border:1px solid #658662;background:#0d1b15;border-radius:20px;overflow:hidden;margin:20px 0 12px}.mount49-target{position:absolute;top:0;bottom:0;background:#72bd7666;border-left:1px solid #a8d991;border-right:1px solid #a8d991}.mount49-needle{position:absolute;top:0;bottom:0;width:5px;background:#ffe5a8;box-shadow:0 0 8px #ffe5a8;animation:mount49-sweep var(--mount-duration) linear both;animation-delay:var(--mount-delay)}@keyframes mount49-sweep{from{left:0}to{left:100%}}.mount49-tame-help{font-size:12px;color:#c6d1ba}.mount49-error{color:#f4bca4}.mount49-close{margin-top:12px;background:transparent;border:1px solid #60725c;color:#cbd7c0;padding:8px 13px;border-radius:7px}.mount49-dialog :focus-visible,.mount49-toggle:focus-visible,.mount49-entry:focus-visible{outline:2px solid #e6c57d;outline-offset:3px}
@media(pointer:coarse){.mount49-controls{right:auto;left:calc(18px + env(safe-area-inset-left));bottom:calc(190px + env(safe-area-inset-bottom));max-width:135px}.mount49-toggle{min-height:44px;min-width:63px;padding:7px 10px}.mount49-toggle kbd{display:none}.mobile-controls-editing .mount49-controls{display:none}}@media(max-width:560px){.mount49-dialog{padding:17px!important}.mount49-dialog h2{font-size:24px}.mount49-choices{gap:7px}.mount49-choice{padding:7px}.mount49-choice strong{font-size:12px}.mount49-choice small{font-size:10px}.mount49-section{padding:12px}.mount49-progress{grid-template-columns:1fr}.mount49-materials{grid-template-columns:repeat(2,minmax(0,1fr))}.mount49-steps li{font-size:10px}.mount49-footer .mount49-action{width:100%}}
`;
function createMountUIR49(React, { Dialog, Content, Header, Title, Description, art = {}, togglePath = "/api/mount-r49", loadOptions = loadMountOptionsR49 } = {}) {
  const h = React.createElement, commands = createMountCommandsR49();
  function Icon() {
    return h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, "aria-hidden": true }, h("path", { d: "M5 20V11L9 5l1-3 3 4 5 3 1 4-4 2-3-2v7M6 11l5-2m4 1h.1M5 20h8" }));
  }
  function Art({ kind }) {
    return h("span", { className: "mount49-art", role: "img", "aria-label": MOUNT_LABELS_R49[kind], style: art[kind] ? { backgroundImage: `url("${typeof art[kind] === "string" ? art[kind] : art[kind].src}")`, backgroundSize: `${(art[kind].columns ?? 6) * 100}% ${(art[kind].rows ?? 1) * 100}%` } : void 0 });
  }
  function Entry({ joined, uiSuspended = false }) {
    const [visible, setVisible] = React.useState(enabled);
    React.useEffect(() => {
      availabilityListeners.add(setVisible);
      setVisible(enabled);
      return () => availabilityListeners.delete(setVisible);
    }, []);
    return joined && visible ? h("button", { type: "button", className: "mount49-entry", "aria-label": "Binekler ve İlk Yoldaşın görevi", title: "Binekler · İlk Yoldaşın", disabled: uiSuspended, onClick: () => window.dispatchEvent(new Event("mount49-open")) }, h(Icon), h("span", null, "Binek")) : null;
  }
  function Host({ own, world, joined, post, onChanged, uiSuspended = false }) {
    const [open, setOpen] = React.useState(false), [data, setData] = React.useState(null), [choice, setChoice] = React.useState("wolf"), [busy, setBusy] = React.useState(false), [loading, setLoading] = React.useState(false), [message, setMessage] = React.useState(""), [toast, setToast] = React.useState("");
    const latest = React.useRef(null), alive = React.useRef(false), generation = React.useRef(0), flight = React.useRef(false), offset = React.useRef(0);
    latest.current = { own, world, joined, post, onChanged, uiSuspended };
    function accept(result, id) {
      if (!alive.current || latest.current.own?.id !== id) return;
      const status = result?.mounts ?? result;
      if (typeof status?.enabled !== "boolean") throw Error("Binek bilgileri alınamadı.");
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
          else setMessage(error?.message ?? "Binek bilgileri alınamadı.");
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
          setMessage(result.message ?? "İşlem tamamlandı.");
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
        if (!result?.ok) throw Error(result?.error ?? "Bineğe binilemedi.");
        if (alive.current && latest.current.own?.id === id) {
          if (result.mounted || result.mount?.mounted) suppressedActor = null;
          setToast(result.message ?? "Binek güncellendi.");
          await latest.current.onChanged?.();
        }
      } catch (error) {
        if (alive.current && latest.current.own?.id === id) setToast(error?.message ?? "Binek işlemi tamamlanamadı.");
      } finally {
        flight.current = false;
        if (alive.current) setBusy(false);
      }
    }
    const quest = data?.quest ?? {}, owned = Array.isArray(data?.owned) ? data.owned : [], waiting = commands.pending(own?.id), mounted = !!mountStateR49(own), near = world?.area === "bazaar" && own && Math.hypot(own.x - MOUNT_NPC_R49.x, own.y - MOUNT_NPC_R49.y) <= MOUNT_NPC_R49.reach, chosen = quest.active ? quest.variant : choice, stage = quest.stage ?? "not_started", stageIndex = { not_started: 0, hunt: 1, craft: 2, tame: 3, complete: 4 }[stage] ?? 0;
    const rows = Array.isArray(data?.materials) ? data.materials : [], hunts = Array.isArray(quest.hunts) ? quest.hunts : [], bosses = Array.isArray(quest.bosses) ? quest.bosses : [], challenge = data?.challenge;
    const now = Date.now() + offset.current, duration = 3200, elapsed = challenge ? now - (challenge.targetAt - 1600) : 0, windowMs = challenge?.windowMs ?? 650;
    const button = (label, action, extra, disabled = false) => h("button", { type: "button", className: "mount49-action", disabled: busy || loading || !!waiting || disabled, onClick: () => void act(action, extra) }, busy ? "İşleniyor…" : label);
    const panel = h(
      React.Fragment,
      null,
      h(Header ?? "header", null, h(Title ?? "h2", null, "İlk Yoldaşın"), h(Description ?? "p", { className: "mount49-intro" }, "Birlikte katettiğiniz yollarla kazanılan bir bağ. Seyis Arda’nın görevini tamamla, eyerini üret ve yoldaşının güvenini kazan.")),
      h("span", { className: "mount49-badge" }, "Seviye 30"),
      h("span", { className: "mount49-badge" }, "Her binekte +%25 yolculuk hızı"),
      h("span", { className: "mount49-badge" }, "Savaş gücü vermez"),
      h("div", { className: "mount49-choices" }, ...Object.entries(MOUNT_LABELS_R49).map(([kind, label]) => h("button", { key: kind, type: "button", className: "mount49-choice", "aria-pressed": chosen === kind, disabled: busy || !!waiting || !!quest.active, onClick: () => setChoice(kind) }, h(Art, { kind }), h("strong", null, label), h("small", null, owned.includes(kind) ? data?.selected === kind ? "Seçili yoldaş" : "Bağ kuruldu" : kind === "wolf" ? "Kuzeyin çevik yol arkadaşı" : kind === "boar" ? "Sağlam adımlarla uzun yollar" : "Kadim ormanın sessiz bekçisi")))),
      owned.length > 0 && h("section", { className: "mount49-section" }, h("h3", null, "Yoldaşların"), h("div", { className: "mount49-footer" }, ...owned.map((kind) => h("button", { key: kind, type: "button", className: "mount49-secondary", "aria-pressed": data.selected === kind, disabled: busy || !!waiting || data.selected === kind, onClick: () => void act("select", { kind }) }, data.selected === kind ? "✓ " + MOUNT_LABELS_R49[kind] : MOUNT_LABELS_R49[kind]))), h("p", { className: "mount49-status" }, "Bin / İn düğmesini veya PC’de V tuşunu kullan. Saldırınca ve hasar alınca inersin; savaş sırasında yeniden binemezsin. Arena, kule ve zindanlarda kullanılamaz.")),
      h("ol", { className: "mount49-steps", "aria-label": "Görev aşamaları" }, ...["Yoldaş seç", "İz sür", "Eyer üret", "Güven kazan"].map((label, index) => h("li", { key: label, className: stageIndex > index ? "done" : stageIndex === index ? "active" : "" }, `${index + 1}. ${label}`))),
      loading && h("p", { role: "status" }, "Binek bilgileri yükleniyor…"),
      stage === "not_started" || stage === "complete" ? h("section", { className: "mount49-section" }, h("h3", null, stage === "complete" ? "Yeni yollar seni bekliyor" : "Seyis Arda seni bekliyor"), h("p", null, "Pazar Köyü’nün güneybatısında Seyis Arda’ya yaklaş. Üç bölgede avlan, iki farklı boss savaşına katkı ver ve eyer malzemelerini topla. Görev seviye 30’da başlar; Kara Bölge aşaması seviye 40 ister."), h("div", { className: "mount49-footer" }, h("p", null, !near ? "Seyis Arda: Pazar Köyü · güneybatı" : (own?.level ?? 0) < 30 ? "Göreve başlamak için seviye 30 olmalısın." : "Seçtiğin yoldaş için göreve hazırsın."), button(owned.includes(choice) ? "Bu yoldaş zaten senin" : "Göreve başla", "start", { kind: choice }, !near || (own?.level ?? 0) < 30 || owned.includes(choice)))) : null,
      stage === "hunt" || stage === "craft" ? h("section", { className: "mount49-section" }, h("h3", null, "İz sürme ve hazırlık"), h("div", { className: "mount49-progress" }, ...hunts.map((row) => h("article", { key: row.area }, h("strong", null, row.label), h("small", null, `${row.current} / ${row.required}${row.minLevel > 1 ? " · Sv. " + row.minLevel : ""}`), h("progress", { value: Math.min(row.current, row.required), max: row.required, "aria-label": row.label })))), h("p", null, `Boss katkısı: ${bosses.filter((row) => row.earned).length} / ${quest.bossRequired ?? 2} farklı boss. Son vuruş şart değil.`), bosses.length > 0 && h("p", { className: "mount49-status" }, bosses.map((row) => (row.earned ? "✓ " : "○ ") + row.label).join(" · ")), h("h3", null, "Eyer malzemeleri"), h("div", { className: "mount49-materials" }, ...rows.map((row) => h("article", { key: row.kind, className: row.amount >= row.required ? "ready" : "missing" }, h("strong", null, row.label), h("small", null, `${row.amount} / ${row.required}`)))), h("div", { className: "mount49-footer" }, h("p", null, "Malzemeler karakterine bağlıdır. Eyer üretimi kesindir; başarısız üretim yok."), button(!near ? "Seyis Arda’ya yaklaş" : "Eyeri üret", "craft", {}, !near || stage !== "craft"))) : null,
      stage === "tame" ? h("section", { className: "mount49-section" }, h("h3", null, `${MOUNT_LABELS_R49[chosen] ?? "Yoldaşın"} ile bağ kur`), h("p", null, "İşaret yeşil alana geldiğinde “Sakinleştir”e dokun. Üç doğru adımla güvenini kazan. Kaçırırsan eyerin ve malzemelerin korunur."), challenge ? h(React.Fragment, null, h("p", { className: "mount49-tame-help" }, `Güven adımı ${challenge.step + 1} / 3`), h("div", { className: "mount49-tame", role: "img", "aria-label": "Yeşil alan geldiğinde Sakinleştir düğmesine bas" }, h("span", { className: "mount49-target", style: { left: `${Math.max(0, (1600 - windowMs) / duration * 100)}%`, width: `${Math.min(100, windowMs * 2 / duration * 100)}%` } }), h("span", { key: challenge.id + ":" + challenge.step, className: "mount49-needle", style: { "--mount-duration": duration + "ms", "--mount-delay": -Math.max(0, elapsed) + "ms" } })), button("Sakinleştir", "tame_step", { challengeId: challenge.id, step: challenge.step }, !near), h("p", { className: "mount49-tame-help" }, "Deneme süresi dolarsa aşağıdaki yeniden dene düğmesiyle ücretsiz başlayabilirsin."), h("button", { type: "button", className: "mount49-close", disabled: busy || !!waiting || !near, onClick: () => void act("tame_start", {}) }, "Denemeyi yeniden başlat")) : h("div", { className: "mount49-footer" }, h("p", null, near ? "Eyerin hazır. Yoldaşına yavaşça yaklaş." : "Denemek için Seyis Arda’ya yaklaş."), button("Güven denemesine başla", "tame_start", {}, !near))) : null,
      waiting && h("div", { className: "mount49-message", role: "status" }, h("p", null, "Bekleyen işlemin sonucu alınamadı. Aynı işlemi güvenle yeniden sorgulayabilirsin."), h("button", { type: "button", className: "mount49-secondary", disabled: busy, onClick: () => void act("retry") }, "Sonucu yeniden sorgula")),
      message && h("p", { className: "mount49-message", role: "status" }, message),
      h("button", { type: "button", className: "mount49-close", disabled: busy, onClick: () => setOpen(false) }, "Kapat")
    );
    if (!joined || !own || data?.enabled === false) return null;
    if (!data && !open) return null;
    return h(React.Fragment, null, h("style", null, MOUNT_CSS_R49), !uiSuspended && data?.selected && h("div", { className: "mount49-controls" }, h("button", { type: "button", className: "mount49-toggle", "aria-pressed": mounted, "aria-label": mounted ? "Binekten in" : "Bineğe bin", title: "Bin / İn · V", disabled: busy || own.hp <= 0, onClick: () => void toggle() }, h(Icon), mounted ? "İn" : "Bin", h("kbd", null, "V")), toast && h("span", { className: "mount49-toast", role: "status" }, toast)), Dialog ? h(Dialog, { open, onOpenChange: (value) => {
      if (!busy) setOpen(value);
    } }, h(Content, { className: "mount49-dialog" }, panel)) : open ? h("section", { className: "mount49-dialog", role: "dialog", "aria-modal": true, "aria-label": "İlk Yoldaşın" }, panel) : null);
  }
  return { Host, Entry, Icon, Art };
}
export {
  MOUNT_CSS_R49,
  MOUNT_LABELS_R49,
  MOUNT_NPC_R49,
  createMountCommandsR49,
  createMountOptionsLoaderR49,
  createMountRendererR49,
  createMountUIR49,
  mountEnabledR49,
  mountNpcHitR49,
  mountShortcutR49,
  mountSpeedR49,
  mountStateR49,
  suppressMountR49
};
