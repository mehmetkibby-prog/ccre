import {clientPolishR62,azrailIconR62} from './core511-gameplay-r62-a97877c1988dff73.js';
// working/core511-source/scripts/core511/adventure-media.mjs
var MIST_MAP = "/assets/mist-map-r28-4571c1332b66c295.webp";
var MIST_ATLAS = "/assets/mist-enemies-r28-12bf61b21ddfc6fa.webp";
var TOWER_ATLAS = "/assets/tower-enemies-r28-e2cc29228f5c4301.webp";

// working/core511-source/scripts/core511/tower-material-icons-r40.mjs
var outline = "#18251f";
var shape = (d, fill, stroke = outline, width = 2) => Object.freeze({ d, fill, stroke, width });
var TOWER_MATERIAL_ART_R40 = Object.freeze({
  tower_seal_shard: Object.freeze([
    shape("M32 5 49 13 56 30 49 49 32 59 15 49 8 30 15 13Z", "#a87935"),
    shape("M32 11 45 17 50 31 44 45 32 52 20 45 14 31 20 17Z", "#e1bd6f"),
    shape("M32 18 41 31 32 44 23 31Z", "#86612d"),
    shape("M32 23V39M25 31H39", "none", "#ffe6a4", 2.5)
  ]),
  tower_chain_ore: Object.freeze([
    shape("M12 33 26 12Q32 4 40 9L43 11Q51 16 45 25L33 42Q27 49 19 44L16 42Q9 38 12 33Z", "#788e95"),
    shape("M21 32 31 17Q34 13 38 16Q42 18 38 23L28 38Q25 41 22 38Q18 36 21 32Z", "#172822"),
    shape("M23 40 35 23Q40 16 48 21L51 23Q58 29 52 37L40 54Q34 62 26 56L23 54Q16 49 23 40Z", "#aabcc1"),
    shape("M30 43 41 29Q44 26 47 29Q50 31 47 35L36 49Q33 53 30 50Q27 47 30 43Z", "#20342c"),
    shape("M15 33 27 16M42 24 48 27", "none", "#e6f0ee", 2)
  ]),
  tower_mourning_essence: Object.freeze([
    shape("M32 5 48 17 56 36 45 53 25 59 10 44 8 24 20 11Z", "#433653"),
    shape("M32 5 35 27 20 32 8 24 20 11Z", "#b5a2cb"),
    shape("M35 27 48 17 56 36 39 39Z", "#80679f"),
    shape("M20 32 35 27 39 39 25 59 10 44Z", "#66517f"),
    shape("M30 23 40 34 31 45 22 34Z", "#bce4d2"),
    shape("M30 28 35 34 30 39 26 34Z", "#effff7", "none")
  ]),
  tower_azrail_seal: Object.freeze([
    shape("M19 8H45L41 17 43 46 49 54Q32 61 15 54L21 46 23 17Z", "#735044"),
    shape("M20 18Q32 22 44 18L43 46Q31 53 20 46Z", "#a65563"),
    shape("M21 25Q32 29 43 25M21 32Q32 36 43 32M21 39Q32 43 43 39", "none", "#e0a0a7", 2),
    shape("M39 45Q53 44 49 55Q46 62 55 57", "none", "#c77381", 3),
    shape("M19 8Q32 3 45 8L42 13Q31 17 22 13Z", "#bd9270")
  ]),
  tower_azrail_chest: Object.freeze([
    shape("M9 29Q9 13 21 12H43Q55 13 55 29V50Q32 58 9 50Z", "#735137"),
    shape("M9 29Q9 13 21 12H43Q55 13 55 29Z", "#a77d43"),
    shape("M9 30 32 37 55 30V50L32 57 9 50Z", "#6a482f"),
    shape("M18 14V31L24 33V12M40 12V33L46 31V14", "none", "#d5b465", 4),
    shape("M9 29 32 36 55 29M32 36V56", "none", "#d5b465", 3),
    shape("M27 31H37V43H27Z", "#e1c078"),
    shape("M32 35V40", "none", "#4d3b2c", 2.5)
  ]),
  tower_azrail_hook: Object.freeze([
    shape("M29 6H39L37 23 39 37Q42 51 31 57Q18 63 11 51L9 40 18 47Q23 53 29 47Q34 44 31 36L29 23Z", "#96a8b1"),
    shape("M29 6H39L38 17H30Z", "#765a80"),
    shape("M30 10H38M30 14H38", "none", "#c2a1c9", 2),
    shape("M35 24 37 39Q39 50 30 53Q22 57 16 49", "none", "#edf2ed", 2),
    shape("M9 40 18 47 13 49Z", "#dbe7e5")
  ])
});
function towerMaterialIconR40(React, kind, label2) {
  const iconR62=azrailIconR62(React,kind,label2);if(iconR62)return iconR62;
  if (!Object.hasOwn(TOWER_MATERIAL_ART_R40, kind)) return null;
  const paths = TOWER_MATERIAL_ART_R40[kind], h = React.createElement;
  return h(
    "svg",
    {
      className: "tower18-icon tower40-material-icon",
      viewBox: "0 0 64 64",
      width: 54,
      height: 54,
      role: "img",
      "aria-label": label2,
      focusable: "false",
      style: { backgroundImage: "none", overflow: "visible" }
    },
    h("title", null, label2),
    ...paths.map((p, index) => h("path", {
      key: index,
      d: p.d,
      fill: p.fill,
      stroke: p.stroke,
      strokeWidth: p.width,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  );
}
var canvasPaths = /* @__PURE__ */ new Map();
function drawTowerMaterialIconR40(ctx, loot) {
  if (!Object.hasOwn(TOWER_MATERIAL_ART_R40, loot?.kind) || typeof Path2D === "undefined") return false;
  const shapes = TOWER_MATERIAL_ART_R40[loot.kind];
  let paths = canvasPaths.get(loot.kind);
  if (!paths) {
    paths = shapes.map((s) => ({ ...s, path: new Path2D(s.d) }));
    canvasPaths.set(loot.kind, paths);
  }
  ctx.save();
  ctx.translate(loot.x - 25, loot.y - 45);
  ctx.scale(50 / 64, 50 / 64);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const p of paths) {
    if (p.fill !== "none") {
      ctx.fillStyle = p.fill;
      ctx.fill(p.path);
    }
    if (p.stroke !== "none") {
      ctx.strokeStyle = p.stroke;
      ctx.lineWidth = p.width;
      ctx.stroke(p.path);
    }
  }
  ctx.restore();
  return true;
}

// working/core511-source/scripts/core511/r40-client.mjs
var disabled = Object.freeze({ mobileMenu: false, inventoryWrap: false, mistAutoTarget: false, enchantmentDisplay: false, towerMaterialIcons: false, reconnectRecovery: false, bagLimit: null });
var options = disabled;
function readR40Options() {
  return options;
}

// working/core511-source/scripts/core511/tower-materials-client.mjs
function createTowerMaterials(React, { Icon, items, css: css3 }) {
  const h = React.createElement;
  return function TowerMaterials({ world, own, post, onChange }) {
    const [busy, setBusy] = React.useState(false), [message, setMessage] = React.useState("");
    const lock = React.useRef(false), pending = React.useRef(null), alive = React.useRef(true);
    React.useEffect(() => {
      alive.current = true;
      return () => {
        alive.current = false;
      };
    }, []);
    const counts = new Map((world?.dungeonMaterials ?? []).map((row) => [row.kind, row.amount]));
    const count = (kind) => counts.has(kind) ? counts.get(kind) : world?.adventure511?.towerInfo?.inventory?.[kind] ?? 0;
    const rows = items.filter(([kind]) => count(kind) > 0), run = world?.adventure511?.run;
    async function act(action, kind) {
      if (lock.current) return;
      const key = action + ":" + kind;
      if (pending.current && pending.current.key !== key) {
        setMessage("\xD6nce \xF6nceki i\u015Flemi ayn\u0131 d\xFC\u011Fmeyle yeniden sorgula.");
        return;
      }
      pending.current ??= { key, requestId: crypto.randomUUID() };
      lock.current = true;
      setBusy(true);
      setMessage("");
      try {
        const result = await post("/api/action", { action, kind, amount: 1, requestId: pending.current.requestId });
        if (result.error) throw Error(result.error);
        pending.current = null;
        if (alive.current) {
          setMessage(result.message ?? "Tamamland\u0131.");
          await onChange?.();
        }
      } catch (error) {
        if (error?.status >= 400 && error.status < 500 && error?.payload?.code !== "command_outcome_unknown") pending.current = null;
        if (alive.current) setMessage(error.message ?? "\u0130\u015Flem do\u011Frulanamad\u0131; ayn\u0131 d\xFC\u011Fmeyle yeniden sorgula.");
      } finally {
        lock.current = false;
        if (alive.current) setBusy(false);
      }
    }
    return h(React.Fragment, null, h("style", null, css3), ...rows.map(([kind, name, forge]) => h("article", { className: "bag-item tower27-material", key: kind }, h("div", { className: "item-icon" }, h(Icon, { kind })), h("div", { className: "tower27-label" }, h("strong", null, name + " \xD7 " + count(kind)), h("small", null, kind === "tower_azrail_chest" ? (clientPolishR62.azrail?"Kadim Kule’nin hazinesi. İçinde değerli eşyalar seni bekliyor.":"\u0130\xE7eri\u011Fi admin panelindeki sand\u0131k ayar\u0131na g\xF6re belirlenir.") : kind === "tower_azrail_hook" ? "Kadim Kulesi\u2019ne \xF6zel e\u015Fya." : "Kadim Kulesi art\u0131 basma malzemesi.")), h("div", { className: "bag-actions" }, kind === "tower_azrail_chest" && h("button", { disabled: busy || !!run, onClick: () => act("adventure_tower_chest", kind) }, "A\xE7")))), message && h("p", { role: "status" }, message));
  };
}
var INVENTORY_R27_CSS = `.equipped-jewelry463 .gear-slot{min-width:0;height:auto;min-height:76px}.equipped-jewelry463 .gear-slot>span{min-width:0}.equipped-jewelry463 .gear-slot strong,.equipped-jewelry463 .gear-slot small,.equipped-jewelry463 .gear-slot b{white-space:normal;overflow-wrap:anywhere;line-height:1.3}.bag-item-inspect{min-width:0;max-width:100%}.bag-item-inspect>span,.tower27-label{min-width:0;overflow-wrap:anywhere}.bag-item-inspect strong,.bag-item-inspect small,.tower27-label strong,.tower27-label small{white-space:normal;overflow-wrap:anywhere;line-height:1.35}.bag-actions{flex-wrap:wrap;min-width:0}.bag-gear-card,.tower27-material{min-width:0;max-width:100%}.tower27-material{display:grid!important;grid-template-columns:52px minmax(0,1fr) auto;gap:10px;align-items:center}.tower27-label small{display:block}.tower27-material .tower18-icon{width:48px;height:48px}.equipped-jewelry463{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:8px;min-width:0;width:100%;grid-column:1/-1}.equipped-jewelry463>.gear-slot{width:100%;box-sizing:border-box}.equipped-jewelry463 button{min-width:0;white-space:normal;overflow-wrap:anywhere}.trade-glass499-confirm .gear-quick-details{width:100%;min-width:0;box-sizing:border-box}.trade-glass499-confirm .gear-quick-details strong{white-space:normal;overflow-wrap:anywhere}@media(max-width:520px){.tower27-material{grid-template-columns:48px minmax(0,1fr)}.tower27-material .bag-actions{grid-column:2}.bag-gear-card .bag-actions{display:flex;flex-wrap:wrap}.equipped-jewelry463{grid-template-columns:minmax(0,1fr)!important}}`;

// working/core511-source/scripts/core511/r27-inventory-client.mjs
var exchangeOpenR27 = false;
function chooseEssenceExchange(balance, cost, reward) {
  if (!Number.isSafeInteger(cost) || cost < 1 || !Number.isSafeInteger(reward) || reward < 1) return Promise.resolve(null);
  const available = balance;
  balance = Math.floor(balance / cost) * cost;
  if (exchangeOpenR27 || !Number.isSafeInteger(balance) || balance < 1 || typeof document === "undefined") return Promise.resolve(null);
  exchangeOpenR27 = true;
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "donation438";
    dialog.setAttribute("aria-labelledby", "donation438-title");
    const add = (tag, text, parent = dialog) => {
      const node = document.createElement(tag);
      if (text) node.textContent = text;
      parent.append(node);
      return node;
    };
    const style = add("style");
    style.textContent = ".donation438{box-sizing:border-box;width:min(390px,calc(100vw - 24px));max-height:calc(100dvh - 20px);overflow:auto;padding:22px;border:1px solid #a2ba77;border-radius:18px;background:#102a22;color:#f5efd9;box-shadow:0 20px 70px #0008;font:15px system-ui}.donation438::backdrop{background:#00120c9c}.donation438 h2{margin:0 0 8px;font:700 23px Georgia,serif;color:#eedc9b}.donation438 p{margin:8px 0 16px;color:#b8cec1;line-height:1.4}.donation438 label{display:block}.donation438 input{box-sizing:border-box;width:100%;min-height:46px;margin:8px 0;padding:10px;background:#071c15;border:1px solid #728b63;border-radius:8px;color:#fff;font:20px system-ui}.donation438 button{min-height:42px;border:1px solid #a8a66e;border-radius:8px;padding:8px 14px;background:#183f31;color:#f5efd9;font:600 14px system-ui;touch-action:manipulation}.donation438-actions{display:flex;gap:8px;margin-top:14px}.donation438-actions button{flex:1}.donation438 button[type=submit]{background:#d4b56a;color:#152a1e}.donation438-status{min-height:20px;color:#f7d895;font-size:13px}.donation438 small{display:block;color:#a5c8b4}@media(max-height:430px){.donation438{padding:14px}.donation438 p{margin:5px 0 8px}.donation438-actions{margin-top:8px}}";
    add("h2", "Ya\u015Fam \xD6z\xFC Takas Et").id = "donation438-title";
    add("p", "Ne kadar \xD6z takas etmek istersin?");
    const form = add("form");
    const label2 = add("label", "Takas edilecek \xD6z miktar\u0131", form);
    const input = add("input", "", label2);
    Object.assign(input, { type: "number", inputMode: "numeric", min: String(cost), max: String(balance), step: String(cost), value: String(cost), required: true });
    input.setAttribute("aria-describedby", "donation438-balance");
    add("small", "Elindeki \xF6z: " + available.toLocaleString("tr-TR") + " \xB7 " + cost + " \xD6z = " + reward + " M\xFCcevher", form).id = "donation438-balance";
    const all = add("button", "T\xFCm\xFCn\xFC se\xE7", form);
    all.type = "button";
    const status = add("div", "", form);
    status.className = "donation438-status";
    status.setAttribute("role", "status");
    const actions = add("div", "", form);
    actions.className = "donation438-actions";
    const cancel = add("button", "Vazge\xE7", actions);
    cancel.type = "button";
    const submit = add("button", "Takas et", actions);
    submit.type = "submit";
    let confirmedAmount = null, settled = false;
    const cancelEvents = ["coreoflife:maintenance", "coreoflife:game-session-ended", "pagehide"];
    const cancelForSession = () => finish(null);
    const finish = (amount) => {
      if (settled) return;
      settled = true;
      if (typeof window !== "undefined") for (const name of cancelEvents) window.removeEventListener(name, cancelForSession);
      dialog.remove();
      exchangeOpenR27 = false;
      resolve(amount);
    };
    if (typeof window !== "undefined") for (const name of cancelEvents) window.addEventListener(name, cancelForSession);
    const change = () => {
      confirmedAmount = null;
      status.textContent = "";
      const amount = Number(input.value);
      submit.textContent = Number.isSafeInteger(amount) && amount >= cost && amount <= balance && amount % cost === 0 ? amount.toLocaleString("tr-TR") + " \xD6z \u2192 " + (amount / cost * reward).toLocaleString("tr-TR") + " M\xFCcevher" : "Takas Et";
    };
    input.addEventListener("input", change);
    all.addEventListener("click", () => {
      input.value = String(balance);
      change();
    });
    cancel.addEventListener("click", () => finish(null));
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish(null);
    });
    dialog.addEventListener("close", () => finish(null));
    dialog.addEventListener("keydown", (event) => event.stopPropagation());
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const amount = Number(input.value);
      if (!Number.isSafeInteger(amount) || amount < cost || amount > balance || amount % cost !== 0) {
        status.textContent = cost + " ile " + balance + " aras\u0131nda, " + cost + " say\u0131s\u0131n\u0131n kat\u0131 olan bir miktar gir.";
        return;
      }
      if ((amount === balance && balance > 1 || amount >= 100) && confirmedAmount !== amount) {
        confirmedAmount = amount;
        status.textContent = amount === balance ? "Se\xE7ilen \xD6z takas edilecek. Onaylamak i\xE7in tekrar dokun." : amount.toLocaleString("tr-TR") + " \xD6z takas edeceksin. Onaylamak i\xE7in tekrar dokun.";
        submit.textContent = "Onayla \xB7 " + amount.toLocaleString("tr-TR") + " \xD6z";
        return;
      }
      finish(amount);
    });
    change();
    document.body.append(dialog);
    try {
      dialog.showModal();
    } catch {
      finish(null);
    }
  });
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
var islands = [[610, 490, 115, 115], [1780, 490, 125, 115], [720, 1030, 110, 145], [1680, 1030, 110, 145]];
function castleWalkable(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 150 || x > 2250 || y < 235 || y > 1505) return false;
  return !islands.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1);
}
function castleSegment(x, y, tx, ty) {
  if (!castleWalkable(x, y) || !castleWalkable(tx, ty)) return false;
  const steps = Math.ceil(Math.hypot(tx - x, ty - y) / 35);
  for (let i = 1; i < steps; i++) if (!castleWalkable(x + (tx - x) * i / steps, y + (ty - y) * i / steps)) return false;
  return true;
}

// working/core511-source/scripts/core511/castle-client-r59.mjs
var CASTLE_MAP_R59 = "/assets/castle-map-r59.webp";
var css = `.castle59-entry{position:absolute;right:16px;top:110px;z-index:24;border:1px solid #af915b;background:linear-gradient(135deg,#302a26,#111a21);color:#f8e7bb;border-radius:10px;padding:10px 15px;font:700 13px system-ui;box-shadow:0 4px 16px #0008}.castle59-hud{position:absolute;top:84px;left:50%;transform:translateX(-50%);width:min(540px,calc(100% - 32px));padding:12px 16px;background:linear-gradient(120deg,#121c27ee,#252322ed);border:1px solid #a68e5a88;border-radius:12px;color:#efe4ce;z-index:23;pointer-events:none;box-shadow:0 7px 26px #0005;font:13px system-ui}.castle59-hud header,.castle59-row{display:flex;justify-content:space-between;align-items:center;gap:12px}.castle59-hud header strong{color:#f2d89a;letter-spacing:.08em}.castle59-hud small{color:#bac6d0}.castle59-objectives{display:flex;gap:8px;margin:9px 0}.castle59-objectives span{flex:1;padding:6px;border:1px solid #c7a56d33;border-radius:7px;text-align:center;background:#0002}.castle59-hud p{margin:5px 0;color:#c8d2d9;font-size:12px}.castle59-hud button{pointer-events:auto}.castle59-dialog{position:fixed;inset:0;z-index:150;display:grid;place-items:center;background:#050c14bd;padding:18px;backdrop-filter:blur(5px)}.castle59-card{width:min(680px,100%);max-height:90dvh;overflow:auto;border:1px solid #b19760;border-radius:17px;background:#121b24;color:#e9e4d8;box-shadow:0 24px 80px #000a;font:14px/1.5 system-ui}.castle59-hero{height:160px;background:linear-gradient(0deg,#121b24,transparent 80%),url('${CASTLE_MAP_R59}') center 24%/cover;display:flex;align-items:end;padding:20px 24px}.castle59-hero h2{margin:0;font-size:30px;color:#ffe9b9}.castle59-body{padding:0 24px 24px}.castle59-body p{color:#bfcbd5}.castle59-body ol{padding-left:20px}.castle59-body li{margin:7px 0}.castle59-buttons{display:flex;gap:10px;flex-wrap:wrap}.castle59-button{cursor:pointer;border:1px solid #b99b60;background:#28313a;color:#f3e9cf;border-radius:8px;padding:9px 13px;font:700 13px system-ui}.castle59-button.primary{background:linear-gradient(130deg,#bf9b55,#8e6530);color:#10161c}.castle59-button:disabled{opacity:.45;cursor:wait}.castle59-chest{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;margin:8px 0;background:#25313b;border-radius:9px}.castle59-notice{padding:10px;border-left:3px solid #d4b171;background:#0002}.castle59-hud .castle59-button{padding:5px 9px;font-size:12px}@media(max-width:650px){.castle59-entry{right:10px;top:100px;padding:8px 11px}.castle59-hud{top:66px;padding:8px 10px;font-size:11px;width:calc(100% - 20px)}.castle59-hud p{font-size:10px}.castle59-objectives{margin:5px 0;gap:4px}.castle59-objectives span{padding:4px}.castle59-hero{height:125px;padding:16px}.castle59-hero h2{font-size:26px}.castle59-body{padding:0 16px 18px}}@media(prefers-reduced-motion:reduce){.castle59-dialog{backdrop-filter:none}}`;

// working/core511-source/scripts/core511/mist-loot-actions.mjs
var MIST_LOOT_ACTIONS = Object.freeze(["adventure_loot_begin", "adventure_loot_finish", "adventure_loot_cancel"]);

// working/core511-source/scripts/core511/adventure-maps.mjs
var AREA = /^(kadim|sis)_([a-f0-9]{32})(?:_(0[1-9]|10))?$/;
var ADVENTURE_ACTIONS = Object.freeze([...MIST_LOOT_ACTIONS, "adventure_tower_enter", "adventure_next", "adventure_leave", "adventure_mist_enter", "adventure_chest", "adventure_tower_chest", "adventure_refine"]);
function adventureArea(area) {
  if (area === CASTLE_AREA) return { kind: "castle", run: "castle-r59", floor: 1 };
  if (typeof area !== "string") return null;
  const m = AREA.exec(area);
  if (!m || m[1] === "kadim" && !m[3] || m[1] === "sis" && m[3]) return null;
  return { kind: m[1] === "kadim" ? "tower" : "mist", run: m[2], floor: m[3] ? Number(m[3]) : 1 };
}
var isAdventureArea = (area) => adventureArea(area) !== null;
var isMistArea = (area) => adventureArea(area)?.kind === "mist";
var ADVENTURE_BOUNDS = Object.freeze({ width: 1600, height: 1100 });
var ADVENTURE_ENTRY = Object.freeze({ x: 800, y: 940 });
var MIST_BOUNDS = Object.freeze({ width: 2400, height: 1600 });
var MIST_ENTRY = Object.freeze({ x: 1171.875, y: 1359.375 });
var mistKind = (area) => area === "mist" || isMistArea(area);
var adventureBounds = (area) => area === CASTLE_AREA ? CASTLE_BOUNDS : mistKind(area) ? MIST_BOUNDS : ADVENTURE_BOUNDS;
function adventureWalkable(area, x, y) {
  if (area === CASTLE_AREA) return castleWalkable(x, y);
  const bounds = adventureBounds(area);
  return isAdventureArea(area) && Number.isFinite(x) && Number.isFinite(y) && x >= 80 && x <= bounds.width - 80 && y >= 100 && y <= bounds.height - 80;
}
function adventureSegment(area, x, y, tx, ty) {
  if (area === CASTLE_AREA) return castleSegment(x, y, tx, ty);
  return adventureWalkable(area, x, y) && adventureWalkable(area, tx, ty);
}
function adventureLabel(area) {
  if (area === CASTLE_AREA) return "Lonca Kalesi";
  const a = adventureArea(area);
  return a ? a.kind === "tower" ? `Kadim Kulesi \xB7 ${a.floor}. Kat` : "Sis Yar\u0131\u011F\u0131" : null;
}

// working/core511-source/scripts/core511/adventure-images.mjs
var ADVENTURE_ASSET_EVENT = "coreoflife:adventure-assets";
function createAdventureImageCache({ makeImage = () => new Image(), schedule = setTimeout, cancel = clearTimeout, notify = () => {
}, timeoutMs = 12e3, retryDelays = [750, 2e3, 5e3] } = {}) {
  const entries = /* @__PURE__ */ new Map(), listeners = /* @__PURE__ */ new Set();
  function changed() {
    notify();
    for (const listener of [...listeners]) listener();
  }
  function start(entry) {
    entry.attempt++;
    entry.status = "loading";
    const image = makeImage();
    entry.image = image;
    image.decoding = "async";
    let finished = false;
    const finish = (ok) => {
      if (finished || entry.image !== image) return;
      finished = true;
      cancel(entry.timer);
      entry.timer = null;
      image.onload = image.onerror = null;
      if (ok) {
        entry.status = "ready";
        changed();
        return;
      }
      entry.status = entry.attempt <= retryDelays.length ? "retrying" : "failed";
      changed();
      if (entry.status === "retrying") entry.timer = schedule(() => {
        entry.timer = null;
        start(entry);
      }, retryDelays[entry.attempt - 1]);
    };
    image.onerror = () => finish(false);
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        finish(false);
        return;
      }
      try {
        Promise.resolve(typeof image.decode === "function" ? image.decode() : void 0).then(() => finish(true), () => finish(false));
      } catch {
        finish(false);
      }
    };
    entry.timer = schedule(() => finish(false), timeoutMs);
    try {
      image.src = entry.url;
    } catch {
      finish(false);
    }
  }
  const api = {
    get(url) {
      let entry = entries.get(url);
      if (!entry) {
        entry = { url, attempt: 0, status: "loading", image: null, timer: null };
        entries.set(url, entry);
        start(entry);
      }
      return entry.status === "ready" ? entry.image : null;
    },
    status(url) {
      return entries.get(url)?.status ?? "idle";
    },
    retry(url) {
      const entry = entries.get(url);
      if (!entry) return this.get(url);
      if (entry.status === "failed") {
        entry.attempt = 0;
        start(entry);
        changed();
      }
      return entry.status === "ready" ? entry.image : null;
    },
    // Admission preflight only. No movement, combat or received ACK waits here.
    wait(urls, { signal, waitMs = 15e3 } = {}) {
      return new Promise((resolve, reject) => {
        let done = false, timer;
        const finish = (error) => {
          if (done) return;
          done = true;
          cancel(timer);
          listeners.delete(check);
          signal?.removeEventListener("abort", abort);
          error ? reject(error) : resolve(urls.map((url) => entries.get(url)?.image));
        };
        const abort = () => finish(Object.assign(Error("Sefer g\xF6rsellerinin y\xFCklenmesi iptal edildi."), { name: "AbortError" }));
        const check = () => {
          if (urls.every((url) => api.status(url) === "ready")) finish();
          else if (urls.some((url) => api.status(url) === "failed")) finish(Object.assign(Error("Sefer g\xF6rselleri indirilemedi. Tekrar dene; hen\xFCz harita de\u011Fi\u015Ftirilmedi."), { code: "adventure_assets_unavailable" }));
        };
        if (signal?.aborted) {
          abort();
          return;
        }
        signal?.addEventListener("abort", abort, { once: true });
        timer = schedule(() => finish(Object.assign(Error("Sefer g\xF6rselleri h\xE2l\xE2 y\xFCkleniyor. Haz\u0131r oldu\u011Funda tekrar gir; hen\xFCz harita de\u011Fi\u015Ftirilmedi."), { code: "adventure_assets_timeout" })), waitMs);
        for (const url of urls) api.retry(url);
        listeners.add(check);
        check();
      });
    }
  };
  return api;
}
var cache = createAdventureImageCache({ notify: () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ADVENTURE_ASSET_EVENT));
} });
function adventureImage(url) {
  return typeof Image === "undefined" ? null : cache.get(url);
}
function adventureImageStatus(url) {
  return cache.status(url);
}
function retryAdventureImage(url) {
  return typeof Image === "undefined" ? null : cache.retry(url);
}
function waitAdventureImages(urls, options2) {
  return cache.wait(urls, options2);
}

// working/core511-source/scripts/core511/adventure-client.mjs
var profiles = /* @__PURE__ */ new WeakMap();
var FIRST_TOWER = "kadim_" + "0".repeat(32) + "_01";
var ANY_MIST = "sis_" + "0".repeat(32);
function admissionTextureArea(action, run, portal) {
  if (action === "adventure_tower_enter") return FIRST_TOWER;
  if (action === "adventure_mist_enter") return ANY_MIST;
  if (action === "adventure_next" && run?.kind === "tower" && run.floor < 10) {
    const a = adventureArea(run.area);
    return a ? "kadim_" + a.run + "_" + String(run.floor + 1).padStart(2, "0") : null;
  }
  return null;
}
var MIST_NOTICE_MS = 8e3;
var MIST_PORTAL_PARTICLES = 12;
var mistObjectiveText = Object.freeze({ clear: "Canavarlar\u0131 temizle, m\xFCh\xFCrl\xFC sand\u0131\u011F\u0131 a\xE7.", seals: "\xDC\xE7 m\xFChr\xFC k\u0131r, gizli bossu yen.", hunt: "Gezgin Sis Avc\u0131s\u0131\u2019n\u0131 bul ve yen." });
function mistObjectiveLabel(run) {
  return mistObjectiveText[run?.objective] ?? "Sis i\xE7indeki hedefini ke\u015Ffet.";
}
function mistProgressLabel(run) {
  if (run?.chestClaimed) return "Sand\u0131k a\xE7\u0131ld\u0131";
  if (run?.clear) return "Sand\u0131k haz\u0131r";
  const p = run?.progress;
  if (!p) return "G\xF6rev s\xFCr\xFCyor";
  if (run.objective === "seals" && p.sealsRemaining > 0) return p.sealsRemaining + " m\xFCh\xFCr kald\u0131";
  if (run.objective === "hunt") return "Nadir yarat\u0131\u011F\u0131 bul";
  if (run.objective === "seals" && p.bossRemaining > 0) return "Bossu yen";
  return Math.max(0, p.remaining ?? p.enemies ?? 0) + " d\xFC\u015Fman kald\u0131";
}
function nearbyMistPortals(portals, area, own, now) {
  return (portals ?? []).filter((p) => p.area === area && p.closes_ms > now && p.entered < p.capacity && (!own || Math.hypot(own.x - p.x, own.y - p.y) <= 600));
}
var ADVENTURE_DOCK = Object.freeze({ width: 96, buttonHeight: 44, gap: 6, inset: 10 });
function adventureDockBounds(width, height, hasRun = true, chatOpen = false) {
  const d = ADVENTURE_DOCK, h = d.buttonHeight * (hasRun ? 2 : 1) + (hasRun ? d.gap : 0);
  return { x: width - (chatOpen && height <= 500 && width >= 600 ? Math.min(360, width - 16) + 16 : d.inset) - d.width, y: (height - h) / 2, width: d.width, height: h };
}
var ADVENTURE_DOCK_CSS = `.tower20-dock{position:fixed;right:max(${ADVENTURE_DOCK.inset}px,env(safe-area-inset-right,0px));top:50%;transform:translateY(-50%);z-index:35;display:grid;gap:${ADVENTURE_DOCK.gap}px;width:${ADVENTURE_DOCK.width}px;pointer-events:auto}.tower20-dock button{box-sizing:border-box;width:100%;height:${ADVENTURE_DOCK.buttonHeight}px;min-height:${ADVENTURE_DOCK.buttonHeight}px;margin:0;padding:4px 6px;border:1px solid #a98b52;border-radius:9px;background:#0d211deb;color:#f0dfb5;font:700 12px/1.25 system-ui;cursor:pointer;touch-action:manipulation}.tower20-dock button:disabled{opacity:.55}.tower20-dock small{display:block;font:10px/1.2 system-ui;color:#d0c7af}.tower20-dock .tower20-leave{background:#321d22ed}.tower20-expedition{display:grid;gap:10px}.tower20-expedition h3,.tower20-expedition p{margin:0}.tower20-expedition-actions{display:flex;gap:8px;flex-wrap:wrap}.tower20-expedition-actions button{flex:1 1 140px;min-height:44px}.tower18-dialog{box-sizing:border-box;max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);overscroll-behavior:contain}.tower20-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}@media(max-height:500px) and (min-width:600px){body:has(.game-shell .chat-panel.open) .tower20-dock{right:calc(min(360px,100vw - 16px) + 16px)}}`;
function adventureTextureURLs(area) {
  if (area === CASTLE_AREA) return [CASTLE_MAP_R59];
  const a = adventureArea(area);
  if (!a) return [];
  return a.kind === "tower" ? ["/assets/tower-r18/floor-" + (a.floor < 4 ? 1 : a.floor < 7 ? 4 : a.floor < 10 ? 7 : 10) + ".webp", TOWER_ATLAS] : [MIST_MAP, MIST_ATLAS];
}
function adventureTexture(area) {
  const url = adventureTextureURLs(area)[0];
  return url ? adventureImage(url) : null;
}
function adventureTextureStatus(area) {
  const states = adventureTextureURLs(area).map(adventureImageStatus);
  return states.includes("failed") ? "failed" : states.length && states.some((s) => s !== "ready") ? "loading" : "ready";
}
function retryAdventureTextures(area) {
  for (const url of adventureTextureURLs(area)) retryAdventureImage(url);
}
function preloadAdventureTextures(area) {
  const a = adventureArea(area);
  if (!a) return;
  for (const url of adventureTextureURLs(area)) adventureImage(url);
  if (a.kind === "tower" && a.floor < 10) {
    const next = a.floor + 1;
    adventureImage("/assets/tower-r18/floor-" + (next < 4 ? 1 : next < 7 ? 4 : next < 10 ? 7 : 10) + ".webp");
  }
}
function adventureProfile(world, id) {
  const data = world?.adventure511;
  if (!data) return null;
  let map = profiles.get(data);
  if (!map) {
    map = new Map(data.profiles ?? []);
    profiles.set(data, map);
  }
  return map.get(id) ?? null;
}
function drawAdventurePlaceholder(ctx, enemy, selected) {
  const hp = Number(enemy?.hp) || 0, max = Math.max(1, Number(enemy?.maxHp ?? enemy?.max_hp) || hp);
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.fillStyle = "#23312be6";
  ctx.strokeStyle = selected ? "#e2c583" : "#9ba995";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -30, 22, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.font = "700 12px system-ui";
  ctx.fillStyle = "#eee1bc";
  ctx.strokeStyle = "#07110e";
  ctx.lineWidth = 3;
  ctx.strokeText(enemy.name ?? "Sefer d\xFC\u015Fman\u0131", 0, -73);
  ctx.fillText(enemy.name ?? "Sefer d\xFC\u015Fman\u0131", 0, -73);
  ctx.fillStyle = "#17211a";
  ctx.fillRect(-40, -67, 80, 5);
  ctx.fillStyle = "#bc8465";
  ctx.fillRect(-40, -67, 80 * Math.max(0, Math.min(1, hp / max)), 5);
  ctx.restore();
}
var MIST_SPRITES = Object.freeze({ "claw": { "rect": [23, 108, 423, 395], "outline": [[22, 312], [16, 289], [0, 108], [0, 104], [1, 95], [2, 91], [6, 84], [39, 27], [40, 26], [79, 1], [95, 0], [103, 0], [199, 25], [281, 64], [283, 65], [335, 93], [337, 95], [400, 171], [401, 175], [412, 239], [421, 331], [422, 346], [422, 355], [410, 360], [332, 387], [313, 393], [287, 394], [262, 389]] }, "guard": { "rect": [405, 48, 481, 453], "outline": [[62, 379], [0, 68], [203, 1], [211, 0], [214, 1], [225, 5], [243, 14], [456, 368], [467, 388], [469, 392], [480, 417], [96, 452], [94, 452], [91, 450], [89, 449], [85, 446], [81, 442], [78, 438]] }, "spirit": { "rect": [779, 62, 389, 449], "outline": [[388, 179], [388, 181], [387, 299], [321, 414], [315, 419], [312, 421], [263, 448], [258, 448], [252, 447], [248, 446], [234, 439], [131, 382], [124, 378], [121, 375], [79, 331], [4, 233], [2, 230], [0, 226], [0, 216], [41, 126], [42, 124], [43, 122], [164, 15], [180, 1], [186, 0], [287, 3], [294, 4], [307, 21], [331, 59], [387, 173]] }, "seal": { "rect": [1224, 84, 250, 425], "outline": [[246, 155], [249, 169], [249, 172], [244, 349], [240, 386], [215, 396], [157, 419], [72, 424], [34, 411], [30, 409], [21, 404], [4, 394], [2, 392], [0, 297], [11, 193], [39, 133], [80, 64], [170, 3], [173, 1], [175, 0], [177, 0], [179, 4]] }, "keeper": { "rect": [2, 508, 498, 456], "outline": [[326, 0], [442, 25], [462, 90], [469, 111], [491, 206], [492, 214], [494, 232], [497, 320], [497, 325], [495, 407], [485, 428], [482, 434], [480, 436], [454, 445], [449, 446], [405, 452], [92, 455], [84, 455], [79, 454], [76, 453], [58, 447], [43, 431], [39, 425], [18, 374], [17, 371], [15, 364], [1, 304], [0, 284], [0, 280], [135, 68], [157, 37], [159, 35], [165, 33], [210, 20], [291, 4]] }, "rare": { "rect": [508, 603, 293, 372], "outline": [[158, 366], [3, 302], [2, 299], [0, 289], [0, 264], [2, 57], [11, 28], [12, 26], [18, 21], [57, 4], [75, 0], [91, 0], [146, 28], [209, 65], [235, 86], [236, 88], [256, 116], [258, 120], [278, 162], [279, 170], [291, 315], [292, 326], [292, 334], [283, 340], [225, 364], [210, 370], [184, 371]] }, "gold": { "rect": [787, 511, 422, 457], "outline": [[346, 456], [58, 443], [49, 436], [48, 435], [41, 425], [17, 363], [0, 301], [0, 299], [3, 281], [89, 71], [90, 69], [125, 29], [168, 7], [188, 0], [222, 6], [287, 21], [322, 31], [374, 60], [389, 114], [402, 161], [413, 215], [421, 311], [419, 438], [417, 439], [412, 441], [395, 448], [389, 450], [381, 452], [353, 456]] }, "chest": { "rect": [1214, 621, 310, 348], "outline": [[0, 175], [0, 154], [12, 116], [19, 101], [40, 64], [58, 46], [63, 43], [152, 6], [193, 0], [274, 69], [286, 87], [287, 89], [301, 129], [308, 156], [309, 172], [309, 175], [305, 306], [226, 347], [225, 347], [26, 298], [18, 296], [12, 294], [10, 293]] } });
var mistSpriteCache = /* @__PURE__ */ new WeakMap();
function mistSprite(image, kind) {
  const spec = MIST_SPRITES[kind];
  if (!spec) return null;
  let cache2 = mistSpriteCache.get(image);
  if (!cache2) {
    cache2 = /* @__PURE__ */ new Map();
    mistSpriteCache.set(image, cache2);
  }
  if (cache2.has(kind)) return cache2.get(kind);
  const [x, y, w, h] = spec.rect, sx = image.naturalWidth / 1536, sy = image.naturalHeight / 1024;
  let cutout;
  if (typeof OffscreenCanvas !== "undefined") cutout = new OffscreenCanvas(w, h);
  else if (typeof document !== "undefined") {
    cutout = document.createElement("canvas");
    cutout.width = w;
    cutout.height = h;
  }
  const c = cutout?.getContext("2d");
  if (c) {
    c.beginPath();
    for (let i = 0; i < spec.outline.length; i++) {
      const p = spec.outline[i];
      if (i) c.lineTo(p[0], p[1]);
      else c.moveTo(p[0], p[1]);
    }
    c.closePath();
    c.clip();
    c.drawImage(image, x * sx, y * sy, w * sx, h * sy, 0, 0, w, h);
  }
  const result = c ? { image: cutout, x: 0, y: 0, width: w, height: h, ratio: w / h } : { image, x: x * sx, y: y * sy, width: w * sx, height: h * sy, ratio: w / h };
  cache2.set(kind, result);
  return result;
}
var ADVENTURE_MOTION_FRAMES = 5;
var motionCache = /* @__PURE__ */ new Map();
var motionBytes = 0;
var MOTION_CACHE_BYTES = 48 * 1024 * 1024;
var motionSelections = Object.fromEntries(["idle", "walk", "attack"].map((state) => [state, Object.freeze(Array.from({ length: 5 }, (_, frame) => Object.freeze({ state, frame })))]));
var meshX = [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1];
var meshY = [0, 0.18, 0.3, 0.43, 0.55, 0.68, 0.8, 0.9, 1];
function adventureMotionFrame(now, moving, attack, travel, stationary = false) {
  const phase = Math.max(0, Math.min(0.999, Number(attack) || 0));
  const state = phase > 0 ? "attack" : moving && !stationary ? "walk" : "idle", frame = phase > 0 ? Math.floor(phase * 5) : moving && !stationary ? Math.floor(Math.max(0, Number(travel) || 0) / 19) % 5 : Math.floor(Math.max(0, Number(now) || 0) / 190) % 5;
  return motionSelections[state][frame];
}
function adventureMotionPoint(x, y, state, frame, style = "humanoid") {
  const phase = frame / 5 * Math.PI * 2, step = state === "walk" ? Math.sin(phase) : 0, breath = state === "idle" ? Math.sin(phase) : 0;
  const wind = state === "attack" ? [0, -0.5, 0.35, 1, 0.15][frame] : 0;
  const turn = (px, py, cx, cy, angle) => {
    const co = Math.cos(angle), si = Math.sin(angle);
    return { x: cx + (px - cx) * co - (py - cy) * si, y: cy + (px - cx) * si + (py - cy) * co };
  };
  if (style === "stone") return { x: x + (x - 0.5) * 0.018 * breath, y: y - Math.sin(Math.PI * y) * 0.01 * breath };
  if (style === "beast") {
    const front = Math.max(0, (x - 0.5) * 2), feet = Math.max(0, (y - 0.55) / 0.45), side2 = x < 0.5 ? -1 : 1;
    return { x: x + step * side2 * 0.13 * feet + wind * (0.035 + front * 0.1), y: y - Math.max(0, step * side2) * 0.11 * feet - Math.abs(step) * 0.015 - front * wind * 0.05 - breath * 8e-3 * Math.sin(Math.PI * y) };
  }
  let p = { x, y };
  const side = x < 0.5 ? -1 : 1, leg = Math.max(0, Math.min(1, (y - 0.61) / 0.24));
  const legPose = turn(x, y, side < 0 ? 0.35 : 0.65, 0.62, step * side * 0.28);
  p.x += (legPose.x - x) * leg;
  p.y += (legPose.y - y) * leg - Math.max(0, step * side) * 0.055 * leg;
  const arm = Math.max(0, Math.min(1, (Math.abs(x - 0.5) - 0.14) / 0.2)) * Math.max(0, 1 - Math.abs(y - 0.49) / 0.32);
  const armPose = turn(x, y, side < 0 ? 0.33 : 0.67, 0.3, side * (wind * 0.8 - step * 0.27));
  p.x += (armPose.x - x) * arm;
  p.y += (armPose.y - y) * arm;
  const torso = Math.max(0, 1 - Math.abs(y - 0.43) / 0.34);
  p.x += wind * 0.055 * torso;
  p.y -= Math.abs(step) * 0.018 + breath * 0.012 * torso;
  if (style === "caster") {
    p.x += Math.sin(phase + y * 6) * 0.035 * Math.max(0, (y - 0.55) / 0.45);
    p.y -= Math.abs(step) * 0.025 + wind * 0.025;
  }
  return p;
}
function motionCanvas(width, height) {
  let c;
  if (typeof OffscreenCanvas !== "undefined") c = new OffscreenCanvas(width, height);
  else if (typeof document !== "undefined") {
    c = document.createElement("canvas");
    c.width = width;
    c.height = height;
  }
  return c;
}
function drawMotionTriangle(ctx, image, source, target) {
  const [s0, s1, s2] = source, [t0, t1, t2] = target, ux = s1.x - s0.x, uy = s1.y - s0.y, vx = s2.x - s0.x, vy = s2.y - s0.y, det = ux * vy - uy * vx;
  if (!det) return;
  const ax = t1.x - t0.x, ay = t1.y - t0.y, bx = t2.x - t0.x, by = t2.y - t0.y, a = (ax * vy - bx * uy) / det, b = (ay * vy - by * uy) / det, c = (bx * ux - ax * vx) / det, d = (by * ux - ay * vx) / det;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(t0.x, t0.y);
  ctx.lineTo(t1.x, t1.y);
  ctx.lineTo(t2.x, t2.y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(a, b, c, d, t0.x - a * s0.x - c * s0.y, t0.y - b * s0.x - d * s0.y);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}
var motionPending = /* @__PURE__ */ new Set();
var motionFailed = /* @__PURE__ */ new Set();
var motionQueue = [];
var motionScheduled = false;
function prepareMotionFrame(sprite, cacheKey, state, frame, style) {
  const scale = Math.min(1, 256 / Math.max(sprite.width, sprite.height)), w = Math.max(1, Math.round(sprite.width * scale)), h = Math.max(1, Math.round(sprite.height * scale)), pad = 32, canvas = motionCanvas(w + pad * 2, h + pad * 2), c = canvas?.getContext("2d"), base = motionCanvas(w, h), b = base?.getContext("2d");
  if (!c || !b) throw Error("adventure_motion_canvas_unavailable");
  b.drawImage(sprite.image, sprite.x, sprite.y, sprite.width, sprite.height, 0, 0, w, h);
  const points = meshY.map((y) => meshX.map((x) => {
    const p = adventureMotionPoint(x, y, state, frame, style);
    return { source: { x: x * w, y: y * h }, target: { x: pad + p.x * w, y: pad + p.y * h } };
  }));
  for (let row = 0; row < meshY.length - 1; row++) for (let col = 0; col < meshX.length - 1; col++) {
    const a = points[row][col], b2 = points[row][col + 1], d = points[row + 1][col], e = points[row + 1][col + 1];
    drawMotionTriangle(c, base, [a.source, b2.source, e.source], [a.target, b2.target, e.target]);
    drawMotionTriangle(c, base, [a.source, e.source, d.source], [a.target, e.target, d.target]);
  }
  const entry = { canvas, w, h, pad, bytes: canvas.width * canvas.height * 4 };
  motionCache.set(cacheKey, entry);
  motionBytes += entry.bytes;
  while (motionBytes > MOTION_CACHE_BYTES && motionCache.size > 1) {
    const oldest = motionCache.keys().next().value;
    motionBytes -= motionCache.get(oldest).bytes;
    motionCache.delete(oldest);
  }
}
function scheduleMotionJob() {
  if (motionScheduled || !motionQueue.length) return;
  motionScheduled = true;
  const run = (deadline) => {
    motionScheduled = false;
    const started = performance.now();
    let count = 0;
    try {
      do {
        const job = motionQueue.shift();
        try {
          if (job && !motionCache.has(job.cacheKey)) prepareMotionFrame(job.sprite, job.cacheKey, job.state, job.frame, job.style);
        } catch {
          if (job) {
            motionFailed.add(job.cacheKey);
            while (motionFailed.size > 256) motionFailed.delete(motionFailed.values().next().value);
          }
        } finally {
          if (job) motionPending.delete(job.cacheKey);
        }
        count++;
      } while (motionQueue.length && count < 4 && performance.now() - started < 4 && (!deadline || deadline.timeRemaining() > 2));
    } finally {
      scheduleMotionJob();
    }
  };
  if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 1e3 });
  else if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => setTimeout(run, 0));
  else setTimeout(run, 0);
}
function queueMotionFrame(sprite, key, state, frame, style, priority = false) {
  const cacheKey = key + ":" + state + ":" + frame;
  if (motionCache.has(cacheKey) || motionFailed.has(cacheKey)) return;
  if (motionPending.has(cacheKey)) {
    if (priority) {
      const i = motionQueue.findIndex((job2) => job2.cacheKey === cacheKey);
      if (i > 0) motionQueue.unshift(motionQueue.splice(i, 1)[0]);
    }
    return;
  }
  if (motionQueue.length >= 256) return;
  motionPending.add(cacheKey);
  const job = { sprite, cacheKey, state, frame, style };
  if (priority) motionQueue.unshift(job);
  else motionQueue.push(job);
  scheduleMotionJob();
}
function drawAdventureMotion(ctx, sprite, key, width, height, now, moving, attack, travel, style = "humanoid", stationary = false) {
  const selected = adventureMotionFrame(now, moving, attack, travel, stationary), cacheKey = key + ":" + selected.state + ":" + selected.frame;
  let entry = motionCache.get(cacheKey);
  if (entry) {
    motionCache.delete(cacheKey);
    motionCache.set(cacheKey, entry);
  } else {
    queueMotionFrame(sprite, key, selected.state, selected.frame, style, true);
    for (const state of ["idle", "walk", "attack"]) for (let frame = 0; frame < 5; frame++) queueMotionFrame(sprite, key, state, frame, style);
    for (let offset = 1; offset < 5 && !entry; offset++) entry = motionCache.get(key + ":" + selected.state + ":" + (selected.frame + 5 - offset) % 5);
    if (!entry) return false;
  }
  const px = entry.pad * width / entry.w, py = entry.pad * height / entry.h;
  ctx.drawImage(entry.canvas, -width / 2 - px, -height - py, width + px * 2, height + py * 2);
  return true;
}
function drawAdventureEnemy(ctx, enemy, profile, selected, now, moving, attack, travel, direction, drawTower, nativeRig, area) {
  if (!profile) {
    if (isAdventureArea(area ?? enemy?.area) && /^(?:curuk|yutan|golge)-adv-[a-f0-9]{32}$/.test(enemy?.id ?? "")) {
      drawAdventurePlaceholder(ctx, enemy, selected);
      return true;
    }
    return false;
  }
  const decorated = { ...enemy, maxHp: enemy.max_hp, direction };
  if (profile.feature === "tower") return drawTower(ctx, { ...decorated, towerKind: profile.kind }, selected, now, moving, attack, travel, nativeRig);
  const kinds = ["claw", "guard", "spirit", "seal", "keeper", "rare", "gold"], index = kinds.indexOf(profile.kind), img = adventureImage(MIST_ATLAS);
  if (index < 0) return false;
  if (!img) {
    drawAdventurePlaceholder(ctx, decorated, selected);
    return true;
  }
  const sprite = mistSprite(img, profile.kind), boss = profile.boss, size = boss ? 250 : profile.stationary ? 170 : 155, height = size * MIST_SPRITES[profile.kind].rect[3] / 512, width = height * sprite.ratio, style = profile.stationary ? "stone" : ["claw", "rare"].includes(profile.kind) ? "beast" : profile.kind === "spirit" ? "caster" : "humanoid";
  ctx.save();
  ctx.fillStyle = selected ? "#c1e2c366" : "#0007";
  ctx.beginPath();
  ctx.ellipse(enemy.x, enemy.y + 8, size * 0.23, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(enemy.x, enemy.y + 8);
  ctx.scale(direction?.x > 0.1 ? -1 : 1, 1);
  if (!drawAdventureMotion(ctx, sprite, "mist:" + profile.kind, width, height, now, moving, attack, travel, style, !!profile.stationary)) ctx.drawImage(sprite.image, sprite.x, sprite.y, sprite.width, sprite.height, -width / 2, -height, width, height);
  ctx.restore();
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "700 12px system-ui";
  ctx.strokeStyle = "#071510";
  ctx.fillStyle = boss ? "#e9ce8a" : "#c4eee1";
  ctx.lineWidth = 3;
  ctx.strokeText(enemy.name, enemy.x, enemy.y - height - 8);
  ctx.fillText(enemy.name, enemy.x, enemy.y - height - 8);
  ctx.fillStyle = "#08231f";
  ctx.fillRect(enemy.x - 45, enemy.y - height - 2, 90, 5);
  ctx.fillStyle = "#78b9ab";
  ctx.fillRect(enemy.x - 45, enemy.y - height - 2, 90 * Math.max(0, Math.min(1, enemy.hp / Math.max(1, enemy.max_hp))), 5);
  ctx.restore();
  return true;
}
var mistFxCache = [null, null];
var mistSparks = Object.freeze(Array.from({ length: MIST_PORTAL_PARTICLES }, (_, i) => Object.freeze({ phase: i / MIST_PORTAL_PARTICLES, speed: 0.68 + i % 4 * 0.11, radius: 39 + i % 3 * 5 })));
function mistEffectSprites(gold) {
  const key = gold ? 1 : 0;
  if (mistFxCache[key]) return mistFxCache[key];
  const make = (width, height, paint) => {
    let canvas;
    if (typeof OffscreenCanvas !== "undefined") canvas = new OffscreenCanvas(width, height);
    else if (typeof document !== "undefined") {
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
    } else return null;
    const c = canvas.getContext("2d");
    if (!c) return null;
    paint(c);
    return canvas;
  };
  const glow = gold ? "232,191,105" : "116,214,199";
  const mouth = make(160, 220, (c) => {
    c.translate(80, 110);
    c.scale(0.65, 1);
    const g = c.createRadialGradient(0, 0, 4, 0, 0, 100);
    g.addColorStop(0, "rgba(2,14,20,.98)");
    g.addColorStop(0.55, "rgba(5,24,29,.97)");
    g.addColorStop(0.7, `rgba(${glow},.55)`);
    g.addColorStop(0.79, `rgba(${glow},.15)`);
    g.addColorStop(1, `rgba(${glow},0)`);
    c.fillStyle = g;
    c.fillRect(-120, -110, 240, 220);
  });
  const fog = make(96, 96, (c) => {
    const g = c.createRadialGradient(48, 48, 2, 48, 48, 46);
    g.addColorStop(0, `rgba(${glow},.26)`);
    g.addColorStop(0.4, `rgba(${glow},.13)`);
    g.addColorStop(1, `rgba(${glow},0)`);
    c.fillStyle = g;
    c.fillRect(0, 0, 96, 96);
  });
  if (!mouth || !fog) return null;
  return mistFxCache[key] = { mouth, fog };
}
function drawMistPortal(ctx, portal, nowMs) {
  const fx = mistEffectSprites(portal.gold), t = nowMs / 1e3, pulse = 1 + Math.sin(t * 2.2) * 0.025;
  ctx.save();
  ctx.translate(portal.x, portal.y);
  ctx.fillStyle = portal.gold ? "#d4ad4c26" : "#5aaea62c";
  ctx.beginPath();
  ctx.ellipse(0, 7, 65, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  if (fx) {
    ctx.drawImage(fx.mouth, -80 * pulse, -175 * pulse, 160 * pulse, 220 * pulse);
    for (let i = 0; i < 6; i++) {
      const a = t * 0.24 + i * Math.PI / 3;
      ctx.drawImage(fx.fog, Math.cos(a) * 38 - 44, -55 + Math.sin(a) * 58 - 44, 88, 88);
    }
  } else {
    ctx.fillStyle = "#071c22ee";
    ctx.beginPath();
    ctx.ellipse(0, -65, 43, 77, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = portal.gold ? "#edce82" : "#9de8db";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, -65, 43 * pulse, 77 * pulse, 0, t * 0.7, t * 0.7 + Math.PI * 1.45);
  ctx.stroke();
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, -65, 35, 66, 0, -t * 0.9, -t * 0.9 + Math.PI * 1.4);
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let i = 0; i < mistSparks.length; i++) {
    const p = mistSparks[i], f = (t * 0.13 * p.speed + p.phase) % 1, a = f * Math.PI * 2, x = Math.cos(a) * p.radius, y = -65 + Math.sin(a) * 78;
    ctx.globalAlpha = 0.35 + 0.6 * Math.sin(f * Math.PI);
    ctx.fillStyle = portal.gold ? "#ffdf94" : "#c0fff0";
    ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
  ctx.globalAlpha = 1;
  ctx.font = "700 13px system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#071916";
  ctx.fillStyle = portal.gold ? "#f6d48b" : "#d4f7e8";
  const label2 = portal.gold ? "Alt\u0131n Sis Yar\u0131\u011F\u0131" : "Sis Yar\u0131\u011F\u0131";
  ctx.strokeText(label2, 0, -164);
  ctx.fillText(label2, 0, -164);
  ctx.font = "11px system-ui";
  const seconds = Math.max(0, Math.ceil((portal.closes_ms - nowMs) / 1e3)), hint = portal.entered >= portal.capacity ? "Dolu" : seconds + " sn \xB7 " + portal.entered + "/" + portal.capacity;
  ctx.strokeText(hint, 0, -147);
  ctx.fillText(hint, 0, -147);
  ctx.restore();
}
function drawAdventureScene(ctx, world, nowMs, visible) {
  const data = world?.adventure511;
  if (!data) return;
  for (const portal of data.portals ?? []) {
    if (portal.area !== world.area || portal.closes_ms <= nowMs || visible && !visible(portal.x, portal.y, 200)) continue;
    drawMistPortal(ctx, portal, nowMs);
  }
  const run = data.run;
  if (!run || run.area !== world.area) return;
  const h = run.hazard;
  if (h && h.at > nowMs) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.angle ?? 0);
    ctx.strokeStyle = "#ffc783";
    ctx.fillStyle = "#d43b494a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (h.kind === "line") ctx.rect(-h.radius, -65, h.radius * 2, 130);
    else {
      ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
      if (h.kind === "ring") {
        ctx.moveTo(Math.max(0, h.radius - 110), 0);
        ctx.arc(0, 0, Math.max(0, h.radius - 110), 0, Math.PI * 2, true);
      }
    }
    ctx.fill("evenodd");
    ctx.stroke();
    ctx.restore();
  }
  if (run.clear && run.kind === "tower") {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "700 18px system-ui";
    ctx.fillStyle = "#e7cf8b";
    ctx.strokeStyle = "#09251e";
    ctx.lineWidth = 4;
    const label2 = run.floor < 10 ? "Kat tamamland\u0131 \xB7 Sonraki kat" : "Azrail yenildi \xB7 Sand\u0131\u011F\u0131n \xE7antanda";
    ctx.strokeText(label2, 800, 140);
    ctx.fillText(label2, 800, 140);
    ctx.restore();
  }
}
var MIST_UI_CSS = `.tower20-dock.mist24-dock button{-webkit-tap-highlight-color:transparent;border-color:#6da799;background:#0d2522f2}.tower20-dock .mist24-arrival{font:600 11px/12px system-ui;padding:3px 4px;white-space:normal}.tower20-dock .mist24-ready{border-color:#d7be77;color:#f4d99b}.mist24-dialog.tower18-dialog{width:min(540px,calc(100vw - 24px));padding:18px;border-color:#5f9a8b}.mist24-title{display:flex;align-items:center;gap:10px;font-size:20px;color:#d3f0e3}.mist24-statline{display:flex;gap:8px;flex-wrap:wrap}.mist24-statline span{padding:5px 9px;border:1px solid #3e675d;border-radius:7px;background:#16372e;font-size:12px}.mist24-pvp{color:#ffc7ad}.mist24-objective{padding:12px;border:1px solid #477d6d;border-radius:9px;background:#102e25}.mist24-objective strong,.mist24-objective small{display:block}.mist24-objective small{margin-top:8px;color:#acccbb}.mist24-portal{display:grid;gap:5px;width:100%;text-align:left!important;border-color:#538477!important}.mist24-portal small{display:block;font-size:12px;color:#bccfc1}.mist24-rules{font-size:12px;line-height:1.6;color:#b5c5bb}.mist24-expedition .tower20-expedition-actions button{min-height:44px}.mist24-fallback{position:fixed;inset:50% auto auto 50%;transform:translate(-50%,-50%);z-index:70;overflow:auto;background:#0d1a16;color:#e7e5d6;border:1px solid #5f9a8b;border-radius:12px;box-shadow:0 20px 70px #000b;max-height:calc(100dvh - 24px)}@media(max-height:500px){.mist24-dialog.tower18-dialog{padding:12px;max-height:calc(100dvh - 20px)}.mist24-dialog .tower20-expedition{gap:7px}.mist24-objective{padding:8px}}`;
function adventureTransitionConfirmed(pending, data, area) {
  if (!pending || !data || data === pending.beforeData) return false;
  const r = data.run;
  if (pending.action === "adventure_next") return !!r && r.id === pending.runId && r.kind === "tower" && r.floor === pending.floor + 1 && r.revision > pending.revision && r.area === area && area !== pending.area;
  if (pending.action === "adventure_leave") return !!pending.runId && !r && !!area && !isAdventureArea(area) && area !== pending.area;
  if (pending.action === "adventure_tower_enter") return !pending.runId && !!r?.id && r.kind === "tower" && r.floor === 1 && r.area === area && isAdventureArea(area) && area !== pending.area;
  if (pending.action === "adventure_mist_enter") return !pending.runId && !!pending.portalRunId && r?.id === pending.portalRunId && r.kind === "mist" && r.area === area && isMistArea(area) && area !== pending.area;
  return false;
}
function createAdventureUI(React, { Dialog, Content, Header, Title, Description, Portal, Icon, css: css3, TOWER_ITEMS: TOWER_ITEMS2 = [] } = {}) {
  const h = React.createElement;
  function Entry({ world, own, post, onChange, onTravel, uiSuspended }) {
    const data = world?.adventure511, run = data?.run, info = data?.towerInfo, config = info?.config, items = info?.inventory ?? {}, area = own?.area ?? world?.area;
    const [open, setOpen] = React.useState(false), [tab, setTab] = React.useState("tower"), [busy, setBusy] = React.useState(false), [message, setMessage] = React.useState(""), [now, setNow] = React.useState(Date.now()), [notice, setNotice] = React.useState(null), [claimedRun, setClaimedRun] = React.useState(null), [preparing, setPreparing] = React.useState(false);
    const lock = React.useRef(false), pending = React.useRef(null), seen = React.useRef(/* @__PURE__ */ new Set()), alive = React.useRef(true), preflight = React.useRef(null), active = React.useRef(null), context = React.useRef(null);
    context.current = { area, actor: own?.id, runId: run?.id };
    const chestClaimed = run?.chestClaimed === true || !!run?.id && claimedRun === run.id;
    const [, assetChanged] = React.useReducer((n) => n + 1, 0);
    React.useEffect(() => {
      const changed = () => assetChanged();
      window.addEventListener(ADVENTURE_ASSET_EVENT, changed);
      return () => window.removeEventListener(ADVENTURE_ASSET_EVENT, changed);
    }, []);
    React.useEffect(() => {
      alive.current = true;
      const show = () => {
        preloadAdventureTextures("kadim_" + "0".repeat(32) + "_01");
        setOpen(true);
        setTab("tower");
      }, end = () => {
        preflight.current?.abort();
        setOpen(false);
      };
      window.addEventListener("tower-open", show);
      window.addEventListener("coreoflife:game-session-ended", end);
      return () => {
        alive.current = false;
        preflight.current?.abort();
        window.removeEventListener("tower-open", show);
        window.removeEventListener("coreoflife:game-session-ended", end);
      };
    }, []);
    React.useEffect(() => {
      const operation = pending.current;
      if (world?.area === area && (adventureTransitionConfirmed(operation, data, area) || operation?.action === "adventure_chest" && operation.runId === run?.id && run?.chestClaimed)) {
        operation.settled = true;
        pending.current = null;
        setMessage("Sefer durumu sunucudan do\u011Fruland\u0131.");
        setOpen(false);
      }
    }, [data, area, world?.area]);
    React.useEffect(() => {
      if (uiSuspended) setOpen(false);
    }, [uiSuspended]);
    React.useEffect(() => {
      preloadAdventureTextures(area);
      if (!own?.id || isAdventureArea(area)) return;
      const timer = setTimeout(() => preloadAdventureTextures(area === "bazaar" ? FIRST_TOWER : ANY_MIST), 300);
      return () => clearTimeout(timer);
    }, [area, own?.id]);
    React.useEffect(() => () => preflight.current?.abort(), [area, own?.id, run?.id]);
    React.useEffect(() => {
      setNow(Date.now());
    }, [run?.id, run?.deadline]);
    React.useEffect(() => {
      if (!run && !data?.portals?.length) return;
      const timer = setInterval(() => setNow(Date.now()), 1e3);
      return () => clearInterval(timer);
    }, [!!run, !!data?.portals?.length]);
    React.useEffect(() => {
      const at = Date.now();
      for (const p of nearbyMistPortals(data?.portals, area, own, at)) {
        preloadAdventureTextures(ANY_MIST);
        if (!seen.current.has(p.id)) {
          seen.current.add(p.id);
          setNotice({ id: p.id, area, until: at + MIST_NOTICE_MS, text: "Yak\u0131nda bir " + (p.gold ? "Alt\u0131n Sis Yar\u0131\u011F\u0131" : "Sis Yar\u0131\u011F\u0131") + " a\xE7\u0131ld\u0131!" });
        }
      }
      if (seen.current.size > 128) seen.current = new Set((data?.portals ?? []).map((p) => p.id));
    }, [data?.portals, area, own?.x, own?.y]);
    React.useEffect(() => {
      if (!notice) return;
      const timer = setTimeout(() => setNotice(null), Math.max(0, notice.until - Date.now()));
      return () => clearTimeout(timer);
    }, [notice]);
    async function act(action, extra = {}) {
      if (lock.current) {
        if (action === "adventure_leave" && preflight.current) {
          preflight.current.abort();
          preflight.current = null;
        } else return;
      }
      const key = JSON.stringify([action, extra]);
      if (pending.current && pending.current.key !== key) {
        setMessage("\xD6nce \xF6nceki i\u015Flemi ayn\u0131 d\xFC\u011Fmeyle yeniden sorgula.");
        return;
      }
      if (action === "adventure_chest" && chestClaimed) return;
      const token = {};
      active.current = token;
      lock.current = true;
      setBusy(true);
      setMessage("");
      let operation = null;
      try {
        const target = admissionTextureArea(action, run);
        if (target && !pending.current) {
          const snapshot = context.current, abort = new AbortController();
          preflight.current = abort;
          setPreparing(true);
          setMessage("Sefer g\xF6rselleri haz\u0131rlan\u0131yor\u2026");
          setOpen(true);
          await waitAdventureImages(adventureTextureURLs(target), { signal: abort.signal });
          if (abort.signal.aborted || context.current.area !== snapshot.area || context.current.actor !== snapshot.actor || context.current.runId !== snapshot.runId || active.current !== token) return;
          preflight.current = null;
          setPreparing(false);
        }
        pending.current ??= { key, id: crypto.randomUUID(), action, beforeData: data, runId: run?.id ?? null, floor: run?.floor, revision: run?.revision ?? 0, area, portalRunId: data?.portals?.find((p) => p.id === extra.portalId)?.run_id };
        operation = pending.current;
        const result = await post("/api/action", { action, ...extra, requestId: operation.id });
        if (result.error) throw Error(result.error);
        pending.current = null;
        if (alive.current) {
          if (action === "adventure_chest") setClaimedRun(operation.runId);
          setMessage(result.message ?? "Tamamland\u0131.");
          if (["adventure_tower_enter", "adventure_next", "adventure_leave", "adventure_mist_enter"].includes(action)) setOpen(false);
          onChange?.();
        }
      } catch (error) {
        if (operation?.settled || active.current !== token || error?.name === "AbortError") return;
        if (error?.status >= 400 && error.status < 500 && error?.payload?.code !== "command_outcome_unknown") pending.current = null;
        if (alive.current) {
          setMessage(error?.message ?? "\u0130\u015Flem tamamlanamad\u0131. Ayn\u0131 d\xFC\u011Fmeyle yeniden sorgula.");
          setTab(action === "adventure_tower_enter" ? "tower" : "expedition");
          setOpen(true);
        }
      } finally {
        if (active.current === token) {
          preflight.current = null;
          active.current = null;
          lock.current = false;
          if (alive.current) {
            setBusy(false);
            setPreparing(false);
          }
        }
      }
    }
    const portals = nearbyMistPortals(data?.portals, area, own, now), remaining = Math.max(0, Math.ceil(((run?.deadline ?? now) - now) / 1e3));
    const assetStatus = adventureTextureStatus(area);
    const assetNotice = run && assetStatus !== "ready" && h("p", { role: "status", className: "mist24-rules" }, assetStatus === "failed" ? "Sefer g\xF6rselleri indirilemedi." : "Sefer g\xF6rselleri y\xFCkleniyor\u2026", assetStatus === "failed" && h("button", { type: "button", onClick: () => retryAdventureTextures(area) }, "G\xF6rselleri yeniden y\xFCkle"));
    const summary = run ? run.kind === "tower" ? run.floor + ". Kat \xB7 " + run.name : (run.gold ? "Alt\u0131n " : "") + "Sis Yar\u0131\u011F\u0131" : null;
    const clock = Math.floor(remaining / 60) + ":" + String(remaining % 60).padStart(2, "0");
    const mistContext = tab === "expedition" && (run?.kind === "mist" || !run && portals.length > 0), arrival = notice && notice.area === area && notice.until > now && portals.some((p) => p.id === notice.id) ? notice.text : "";
    const expedition = h("section", { className: "tower20-expedition" + (mistContext ? " mist24-expedition" : "") }, run ? h(React.Fragment, null, h("h3", { className: run.kind === "mist" ? "mist24-title" : void 0 }, summary), run.kind === "tower" ? h(React.Fragment, null, h("p", null, "Kalan s\xFCre: " + clock), h("p", null, "Dalga " + run.wave + " / " + run.waves)) : h(React.Fragment, null, h("div", { className: "mist24-statline" }, h("span", null, "Kalan s\xFCre " + clock), h("span", { className: "mist24-pvp" }, "PVP A\xC7IK")), h("div", { className: "mist24-objective" }, h("strong", null, mistObjectiveLabel(run)), h("small", null, mistProgressLabel({ ...run, chestClaimed }))), h("p", { className: "mist24-rules" }, "Bir oyuncu seni \xF6ld\xFCr\xFCrse biriken t\xFCm \xD6z\xFCn ve M\xFCcevherinin %15\u2019i, d\xFC\u015Ft\xFC\u011F\xFCn yerde ad\u0131n\u0131n yazd\u0131\u011F\u0131 sand\u0131\u011Fa konur. Sand\u0131\u011Fa dokunan oyuncu 3 saniye kesintisiz bekleyerek onu alabilir; hareket, sald\u0131r\u0131 veya hasar toplamay\u0131 keser. \xD6l\xFCrsen Pazar K\xF6y\xFC\u2019ne d\xF6nersin. S\xFCre dolunca geldi\u011Fin haritaya d\xF6nersin. \u0130stedi\u011Fin zaman \xE7\u0131kabilirsin.")), h("div", { className: "tower20-expedition-actions" }, run.clear && run.kind === "tower" && run.floor < 10 && h("button", { disabled: busy, onClick: () => act("adventure_next") }, "Sonraki kata ge\xE7"), run.clear && run.kind === "mist" && h("button", { disabled: busy || chestClaimed, onClick: () => act("adventure_chest") }, chestClaimed ? "Sis Sand\u0131\u011F\u0131 a\xE7\u0131ld\u0131" : "Sis Sand\u0131\u011F\u0131\u2019n\u0131 a\xE7"), h("button", { disabled: busy && !preparing, onClick: () => act("adventure_leave") }, "Seferden \xE7\u0131k"))) : h(React.Fragment, null, h("p", { className: "mist24-rules" }, "Her yar\u0131kta rastgele bir hedef. En fazla 4 ki\u015Fi girer; i\xE7eride PvP a\xE7\u0131kt\u0131r. Bir oyuncu seni \xF6ld\xFCr\xFCrse biriken t\xFCm \xD6z\xFCn ve M\xFCcevherinin %15\u2019i, d\xFC\u015Ft\xFC\u011F\xFCn yerde ad\u0131n\u0131n yazd\u0131\u011F\u0131 sand\u0131\u011Fa konur. Sand\u0131\u011Fa dokunan oyuncu 3 saniye kesintisiz bekleyerek onu alabilir; hareket, sald\u0131r\u0131 veya hasar toplamay\u0131 keser. \xD6l\xFCrsen Pazar K\xF6y\xFC\u2019ne d\xF6nersin."), ...portals.map((p) => h("button", { className: "mist24-portal", key: p.id, disabled: busy || !own || Math.hypot(own.x - p.x, own.y - p.y) > 150, onClick: () => act("adventure_mist_enter", { portalId: p.id }) }, (p.gold ? "Alt\u0131n " : "") + "Sis Yar\u0131\u011F\u0131 \xB7 " + p.entered + "/" + p.capacity + " \xB7 " + Math.ceil((p.closes_ms - now) / 1e3) + " sn", h("small", null, !own || Math.hypot(own.x - p.x, own.y - p.y) > 150 ? "Girmek i\xE7in portala yakla\u015F" : "Sis Yar\u0131\u011F\u0131\u2019na gir"))), !portals.length && h("p", null, "Aktif seferin yok.")));
    const body = h("div", { className: "tower18-body" }, !mistContext && h("nav", { className: "tower18-nav" }, ...[...run || portals.length ? ["expedition"] : [], "tower"].map((x) => h("button", { key: x, onClick: () => setTab(x), "aria-pressed": tab === x }, x === "expedition" ? "Sefer" : x === "tower" ? "Kadim Kulesi" : "Kule \xC7antas\u0131"))), message && h("p", { role: "status" }, message), assetNotice, tab === "expedition" ? expedition : tab === "tower" ? h(React.Fragment, null, h("div", { className: "tower18-hero" }, h("img", { src: "/assets/tower-r18/entrance.webp", alt: "Kadim Kulesi" }), h("div", null, h("h3", null, "Kadim Kulesi"), h("p", null, "10 kat. Dalgalar\u0131 tamamla, bir sonraki kata ge\xE7. \u0130stedi\u011Fin zaman \xE7\u0131kabilirsin."))), h("div", { className: "tower18-floor-grid" }, ...(config?.floors ?? []).map((f, i) => h("div", { className: "tower18-floor", key: i }, h("b", null, i + 1 + ". kat"), f.name, " \xB7 " + f.waves + " dalga"))), run ? h("button", { onClick: () => setOpen(false) }, "Seferine d\xF6n") : area !== "bazaar" ? h("button", { onClick: () => {
      setOpen(false);
      onTravel?.();
    } }, "Pazar K\xF6y\xFC\u2019ne git") : h("button", { disabled: busy || !config?.enabled, onClick: () => act("adventure_tower_enter") }, config?.enabled ? "Kadim Kulesi\u2019ne gir" : "Kule kapal\u0131")) : h("div", { className: "tower18-items" }, ...TOWER_ITEMS2.map(([kind, name, forge]) => h("div", { className: "tower18-item", key: kind }, Icon && h(Icon, { kind }), h("span", null, name, h("small", null, (items[kind] ?? 0) + " adet")), kind === "tower_azrail_chest" && h("button", { disabled: busy || !!run || !(items[kind] > 0), onClick: () => act("adventure_tower_chest") }, "A\xE7"), forge > 0 && h("button", { disabled: busy || !!run || area !== "bazaar" || !(items[kind] > 0), onClick: () => act("adventure_refine", { kind, amount: 1 }) }, forge + " Kor M\xFChr\xFC")))));
    const dock = !uiSuspended && (run || portals.length > 0) && h("aside", { className: "tower20-dock" + (run?.kind === "mist" || portals.length ? " mist24-dock" : ""), "aria-label": "Sefer kontrolleri" }, h("button", { type: "button", className: !run && arrival ? "mist24-arrival" : run?.kind === "mist" && run.clear ? "mist24-ready" : void 0, "aria-label": run ? "Sefer bilgileri: " + summary : "Yak\u0131ndaki Sis Yar\u0131klar\u0131", "aria-expanded": open && tab === "expedition", onClick: () => {
      setTab("expedition");
      setOpen(true);
    } }, !run && arrival ? arrival : h(React.Fragment, null, run ? run.kind === "tower" ? run.floor + ". Kat" : chestClaimed ? "Sand\u0131k a\xE7\u0131ld\u0131" : run.clear ? "Sand\u0131k haz\u0131r" : "Sis Yar\u0131\u011F\u0131" : "Sis Yar\u0131\u011F\u0131", h("small", null, run ? run.clear ? "Tamamland\u0131 \xB7 \u0130ncele" : clock + " \xB7 Sefer" : "Yakla\u015F ve gir"))), run && h("button", { type: "button", className: "tower20-leave", disabled: busy && !preparing, onClick: () => act("adventure_leave") }, "Seferden \xE7\u0131k"), arrival && h("span", { className: "tower20-sr", role: "status" }, arrival));
    return h(React.Fragment, null, h("style", null, (css3 ?? ADVENTURE_DOCK_CSS) + MIST_UI_CSS), dock && (Portal ? Portal(dock, document.body) : dock), Dialog ? h(Dialog, { open: open && !uiSuspended, onOpenChange: setOpen }, h(Content, { className: "tower18-dialog" + (mistContext ? " mist24-dialog" : "") }, h(Header, null, h(Title, null, mistContext ? "Sis Yar\u0131\u011F\u0131" : tab === "expedition" ? "Sefer" : "Kadim Kulesi"), h(Description, null, mistContext ? "Hedefin, kalan s\xFCren ve g\xFCvenli \xE7\u0131k\u0131\u015F" : tab === "expedition" ? "\u0130lerleme, ge\xE7itler ve \xE7\u0131k\u0131\u015F" : "Katlar ve sefer bilgisi")), body)) : open && !uiSuspended ? h("div", { className: "tower18-dialog" + (mistContext ? " mist24-dialog mist24-fallback" : ""), role: "dialog", "aria-label": mistContext ? "Sis Yar\u0131\u011F\u0131" : "Sefer" }, h("button", { onClick: () => setOpen(false) }, "Kapat"), body) : null);
  }
  return { Entry };
}
function adventureAttackProgress(world, id, now) {
  const run = world?.adventure511?.run, h = run?.hazard;
  if (run?.area !== world?.area || !h || h.at <= now || h.created > now || adventureProfile(world, id)?.kind !== "azrail") return null;
  return Math.max(1e-3, Math.min(0.999, (now - h.created) / Math.max(1, h.at - h.created)));
}

// working/core511-source/scripts/core511/mist-admin-client.mjs
var MIST_ADMIN_CSS = `.mist24-admin{isolation:isolate}.mist24-admin p{line-height:1.55}.mist24-admin .mist24-check{display:flex;align-items:center;gap:8px;min-height:36px}.mist24-admin .mist24-check input{width:18px;height:18px;flex:none}.mist24-admin .mist24-schedule{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid #49634b;border-radius:7px}.mist24-admin .mist24-schedule span{overflow-wrap:anywhere}.mist24-admin .tower18-save{flex-wrap:wrap}.mist24-admin .tower18-status{margin:0}.mist24-admin input:invalid{border-color:#db9771}@media(max-width:600px){.mist24-admin .tower18-save{position:static}.mist24-admin .mist24-schedule{align-items:flex-start;flex-direction:column}}`;
var mistScheduleTimestamp = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return NaN;
  return Date.parse(value + ":00+03:00");
};
function createMistAdmin(React, css3) {
  const h = React.createElement;
  return function MistAdmin({ act, busy: outerBusy }) {
    const [draft, setDraft] = React.useState(null), [meta, setMeta] = React.useState({}), [revision, setRevision] = React.useState(null), [busy, setBusy] = React.useState(false), [message, setMessage] = React.useState(""), [tab, setTab] = React.useState("general"), [kind, setKind] = React.useState("claw"), [dirty, setDirty] = React.useState(false), [retry, setRetry] = React.useState(null);
    const [spawn, setSpawn] = React.useState({ area: "forest", channel: 1, x: 1800, y: 1100, gold: false, when: "" });
    const lock = React.useRef(false), mounted = React.useRef(true), pending = React.useRef(null), container = React.useRef(null);
    const call = async (action, extra = {}) => {
      if (lock.current || outerBusy) return;
      const portal = action === "sis_mist_spawn" || action === "sis_mist_schedule", key = JSON.stringify([action, extra]);
      if (portal && pending.current && pending.current.key !== key) {
        setMessage("\xD6nce bekleyen portal i\u015Flemini yeniden sorgula; ayn\u0131 portal iki kez g\xF6nderilmesin.");
        return;
      }
      lock.current = true;
      setBusy(true);
      setMessage("");
      if (portal) pending.current ??= { key, action, extra, id: crypto.randomUUID() };
      try {
        const r = await act({ action, ...extra, ...portal ? { requestId: pending.current.id } : {} });
        if (!r?.mist?.config) throw Error(r?.error ?? "Yan\u0131t al\u0131namad\u0131. \u0130\u015Flemi yeniden sorgulayabilirsin.");
        if (portal) {
          pending.current = null;
          setRetry(null);
        }
        if (mounted.current) {
          if (action === "sis_mist_get" || action === "sis_mist_save") {
            setDraft(structuredClone(r.mist.config));
            setRevision(r.mist.revision);
            setDirty(false);
          }
          setMeta(r.mist);
          setMessage(action === "sis_mist_get" ? "Canl\u0131 ayarlar y\xFCklendi." : action === "sis_mist_save" ? "Kaydedildi. Yeni ayarlar yeni yar\u0131klara uygulan\u0131r." : action === "sis_mist_cancel" ? "Portal plan\u0131 iptal edildi." : r.mist.operation?.status === "completed" ? "Bu portal i\u015Flemi daha \xF6nce i\u015Flendi; tekrar olu\u015Fturulmad\u0131." : action === "sis_mist_spawn" ? "Portal iste\u011Fi kaydedildi. Kanal kapasitesi doluysa s\u0131rada bekler." : "Portal plan\u0131 kaydedildi.");
        }
      } catch (error) {
        if (portal && Number.isInteger(error?.status) && error.status >= 400 && error.status < 500) {
          pending.current = null;
          setRetry(null);
        }
        if (mounted.current) {
          setMessage(error.message ?? "\u0130\u015Flem tamamlanamad\u0131.");
          if (portal && pending.current) setRetry(pending.current);
        }
      } finally {
        lock.current = false;
        if (mounted.current) setBusy(false);
      }
    };
    React.useEffect(() => {
      mounted.current = true;
      void call("sis_mist_get");
      return () => {
        mounted.current = false;
      };
    }, []);
    React.useEffect(() => {
      if (!outerBusy && !draft && !lock.current) void call("sis_mist_get");
    }, [outerBusy]);
    const edit = (fn) => {
      setDraft((old) => {
        const next = structuredClone(old);
        fn(next);
        return next;
      });
      setDirty(true);
    };
    const disabled2 = busy || outerBusy;
    const valid = () => {
      const field = container.current?.querySelector("input:invalid");
      if (field) {
        field.reportValidity();
        return false;
      }
      return true;
    };
    const num = (label2, value, change, min = 0, max = 1e8, step = 1) => h("label", null, label2, h("input", { type: "number", min, max, step, value, required: true, disabled: disabled2, onChange: (e2) => change(e2.target.value === "" ? "" : Number(e2.target.value)) }));
    const check = (label2, value, change) => h("label", { className: "mist24-check" }, h("input", { type: "checkbox", checked: value, disabled: disabled2, onChange: (e2) => change(e2.target.checked) }), label2);
    const button = (text, onClick, props = {}) => h("button", { type: "button", disabled: disabled2, onClick, ...props }, text);
    const drops = (rows, change) => h("div", null, ...rows.map((r, i) => {
      const item = meta.catalog?.find((c) => c.id === r.itemId), stack = ["resource", "material", "stone"].includes(item?.type);
      return h("div", { className: "tower18-drop", key: i }, h("label", null, "E\u015Fya", h("select", { disabled: disabled2, value: r.itemId, onChange: (e2) => change((a) => {
        a[i].itemId = e2.target.value;
        const selected = meta.catalog.find((c) => c.id === e2.target.value);
        if (!["resource", "material", "stone"].includes(selected?.type)) {
          a[i].min = 1;
          a[i].max = 1;
        }
      }) }, ...(meta.catalog ?? []).map((c) => h("option", { key: c.id, value: c.id, disabled: c.id !== r.itemId && rows.some((row) => row.itemId === c.id) }, c.name)))), num("\u015Eans %", r.chance, (v) => change((a) => {
        a[i].chance = v;
      }), 0, 100, 0.01), num("En az", r.min, (v) => change((a) => {
        a[i].min = v;
      }), 1, stack ? 1e3 : 1), num("En \xE7ok", r.max, (v) => change((a) => {
        a[i].max = v;
      }), 1, stack ? 1e3 : 1), button("Kald\u0131r", () => change((a) => a.splice(i, 1))));
    }), button("\xD6d\xFCl ekle", () => {
      const item = meta.catalog?.find((c) => !rows.some((r) => r.itemId === c.id));
      if (item) change((a) => a.push({ itemId: item.id, chance: 10, min: 1, max: 1 }));
    }, { disabled: disabled2 || rows.length >= 16 || !(meta.catalog ?? []).some((c) => !rows.some((r) => r.itemId === c.id)) }));
    if (!draft) return h("section", { className: "admin-card tower18-admin mist24-admin" }, h("style", null, css3 + MIST_ADMIN_CSS), h("h2", null, "Sis Yar\u0131\u011F\u0131"), h("p", { role: "status" }, message || "Y\xFCkleniyor\u2026"), button("Yeniden y\xFCkle", () => call("sis_mist_get")));
    const e = draft.enemies[kind], spawnFields = { area: spawn.area, channel: spawn.channel, x: spawn.x, y: spawn.y, gold: spawn.gold };
    const sections = { general: "Genel", enemies: "D\xFC\u015Fmanlar ve ganimet", chest: "Sis Sand\u0131klar\u0131", spawn: "Portal g\xF6nder / planla" };
    const reload = () => {
      if (!dirty || confirm("Kaydedilmemi\u015F Sis Yar\u0131\u011F\u0131 de\u011Fi\u015Fiklikleri silinsin mi?")) void call("sis_mist_get");
    };
    return h(
      "section",
      { className: "admin-card tower18-admin mist24-admin", ref: container },
      h("style", null, css3 + MIST_ADMIN_CSS),
      h("h2", null, "Sis Yar\u0131\u011F\u0131"),
      h("p", { className: "tower18-muted" }, "En fazla 4 oyuncu \xB7 PvP a\xE7\u0131k \xB7 \xD6l\xFCmde Pazar K\xF6y\xFC \xB7 \u0130stendi\u011Finde \xE7\u0131k\u0131\u015F"),
      message && h("p", { role: "status", className: "tower18-status" }, message),
      retry && button("Bekleyen portal i\u015Flemini yeniden sorgula", () => call(retry.action, retry.extra)),
      h("nav", { className: "tower18-nav", "aria-label": "Sis Yar\u0131\u011F\u0131 ayarlar\u0131" }, ...Object.entries(sections).map(([k, label2]) => button(label2, () => setTab(k), { key: k, "aria-pressed": tab === k }))),
      tab === "general" ? h(
        React.Fragment,
        null,
        check("Portal \xFCretimi a\xE7\u0131k", draft.enabled, (v) => edit((d) => d.enabled = v)),
        h("div", { className: "tower18-fields" }, ...Object.entries({ minLevel: ["Asgari seviye", 1, 100, 1], chancePercent: ["Kesim ba\u015F\u0131na portal %", 0, 100, 0.01], goldChancePercent: ["A\xE7\u0131lan portal\u0131n alt\u0131n olma %", 0, 100, 0.01], portalSeconds: ["Portal a\xE7\u0131k kalma (sn)", 5, 300, 1], durationSeconds: ["\u0130\xE7eride s\xFCre (sn)", 60, 3600, 1], maxPlayers: ["Oyuncu s\u0131n\u0131r\u0131", 1, 4, 1], maxActivePerChannel: ["Kanal ba\u015F\u0131na yar\u0131k s\u0131n\u0131r\u0131", 1, 25, 1], killCooldownSeconds: ["Kanal ba\u015F\u0131na portal aral\u0131\u011F\u0131 (sn)", 0, 3600, 1], xpMultiplier: ["XP \xE7arpan\u0131", 0, 10, 0.1], essenceMultiplier: ["\xD6z \xE7arpan\u0131", 0, 10, 0.1] }).map(([key, [label2, min, max, step]]) => h(React.Fragment, { key }, num(label2, draft[key], (v) => edit((d) => d[key] = v), min, max, step)))),
        h("fieldset", null, h("legend", null, "Portal \xE7\u0131kabilecek haritalar"), h("p", { className: "tower18-muted" }, "Oto Av Adas\u0131 ve test botlar\u0131 portal \xFCretemez."), ...Object.entries(meta.maps ?? {}).map(([k, label2]) => h(React.Fragment, { key: k }, check(label2, draft.maps.includes(k), (v) => edit((d) => {
          d.maps = v ? [...d.maps, k] : d.maps.filter((x) => x !== k);
        }))))),
        h("fieldset", null, h("legend", null, "Rastgele g\xF6rev havuzu"), h("p", null, "Her yar\u0131k i\xE7in a\xE7\u0131k g\xF6revlerden biri otomatik se\xE7ilir. Oyuncuya g\xF6rev se\xE7tirilmez. En az bir g\xF6rev a\xE7\u0131k kalmal\u0131."), ...Object.entries({ clear: "Canavarlar\u0131 temizle ve m\xFCh\xFCrl\xFC sand\u0131\u011F\u0131 a\xE7", seals: "\xDC\xE7 m\xFChr\xFC k\u0131r ve gizli bossu yen", hunt: "Gezgin nadir yarat\u0131\u011F\u0131 bul ve yen" }).map(([k, label2]) => h(React.Fragment, { key: k }, check(label2, draft.objectives[k], (v) => edit((d) => d.objectives[k] = v))))),
        h("fieldset", null, h("legend", null, "Oyuncuya g\xF6re d\xFC\u015Fman \xF6l\xE7e\u011Fi"), h("p", null, "\u0130lk girenin seviyesi, azami can\u0131 ve sald\u0131r\u0131s\u0131 \xFCzerinden; tur boyunca sabit."), h("div", { className: "tower18-fields" }, ...Object.entries({ level: "Seviye katsay\u0131s\u0131", hp: "Can katsay\u0131s\u0131", attack: "Sald\u0131r\u0131 katsay\u0131s\u0131", maximum: "Azami \xE7arpan" }).map(([key, label2]) => h(React.Fragment, { key }, num(label2, draft.scale[key], (v) => edit((d) => d.scale[key] = v), key === "maximum" ? 1 : 0, key === "maximum" ? 100 : key === "hp" ? 0.1 : 1, key === "maximum" ? 1 : 1e-5)))))
      ) : tab === "enemies" ? h(React.Fragment, null, h("nav", { className: "tower18-nav", "aria-label": "D\xFC\u015Fman t\xFCr\xFC" }, ...Object.entries(meta.kinds ?? {}).map(([k, label2]) => button(label2, () => setKind(k), { key: k, "aria-pressed": kind === k }))), h("p", { className: "tower18-muted" }, "Her d\xFC\u015Fman\u0131n temel g\xFCc\xFC, say\u0131s\u0131 ve \xF6d\xFCl\xFC ayr\u0131d\u0131r. Can ve sald\u0131r\u0131ya oyuncu \xF6l\xE7e\u011Fi uygulan\u0131r; XP ve \xF6z ayr\u0131ca genel \xE7arpanlar\u0131 kullan\u0131r."), h("div", { className: "tower18-fields" }, ...Object.entries({ count: ["Say\u0131", 1, 30], hp: ["Can", 1, 1e8], damage: ["Hasar", 0, 1e6], speed: ["H\u0131z", 0, 240], attackMs: ["Sald\u0131r\u0131 aral\u0131\u011F\u0131 (ms)", 600, 6e4], xp: ["XP", 0, 1e6], essence: ["\xD6z", 0, 1e5], gems: ["M\xFCcevher", 0, 1e5] }).map(([key, [label2, min, max]]) => h(React.Fragment, { key }, kind === "seal" && key === "count" ? h("p", null, "M\xFCh\xFCr say\u0131s\u0131: 3") : num(label2, e[key], (v) => edit((d) => d.enemies[kind][key] = v), min, max)))), h("h3", null, "D\xFC\u015Fen e\u015Fyalar"), drops(e.drops, (fn) => edit((d) => fn(d.enemies[kind].drops)))) : tab === "chest" ? h(React.Fragment, null, h("h3", null, "Sis Sand\u0131\u011F\u0131"), drops(draft.chest, (fn) => edit((d) => fn(d.chest))), h("h3", null, "Alt\u0131n Sis Sand\u0131\u011F\u0131"), drops(draft.goldChest, (fn) => edit((d) => fn(d.goldChest))), h("p", null, "Oranlar her e\u015Fya i\xE7in ayr\u0131 d\xFC\u015Fme olas\u0131l\u0131\u011F\u0131d\u0131r. Kuleye \xF6zel malzemeler bu listede bulunmaz. Bitirme \xF6d\xFCl\xFC m\xFCcadeleye kat\u0131lan oyuncuya bir kez verilir.")) : h(React.Fragment, null, h("p", null, "Manuel portal se\xE7ti\u011Fin kanalda a\xE7\u0131l\u0131r. Zamanlar T\xFCrkiye saatidir (UTC+3). Kanal kapasitesi doluysa plan bekler; ikinci portal olu\u015Fturulmaz."), !meta.config?.enabled && h("p", { className: "tower18-status" }, "Portal \xFCretimi kapal\u0131. \xD6nce Genel b\xF6l\xFCm\xFCnden a\xE7\u0131p kaydet."), h("div", { className: "tower18-fields" }, h("label", null, "Harita", h("select", { value: spawn.area, disabled: disabled2, onChange: (e2) => {
        const area = e2.target.value;
        setSpawn((s) => ({ ...s, area, ...meta.spawnPoints?.[area] ?? {} }));
      } }, ...Object.entries(meta.maps ?? {}).map(([k, label2]) => h("option", { key: k, value: k }, label2)))), num("Kanal", spawn.channel, (v) => setSpawn((s) => ({ ...s, channel: v })), 1, 4), num("X", spawn.x, (v) => setSpawn((s) => ({ ...s, x: v }))), num("Y", spawn.y, (v) => setSpawn((s) => ({ ...s, y: v }))), check("Alt\u0131n portal", spawn.gold, (v) => setSpawn((s) => ({ ...s, gold: v }))), h("label", null, "Tarih ve saat (T\xFCrkiye \xB7 UTC+3)", h("input", { type: "datetime-local", value: spawn.when, disabled: disabled2, onChange: (e2) => setSpawn((s) => ({ ...s, when: e2.target.value })) }))), h("p", { className: "tower18-muted" }, "Harita de\u011Fi\u015Fince y\xFCr\xFCnebilir \xF6rnek konum gelir. \u0130stersen X ve Y konumunu de\u011Fi\u015Ftirebilirsin."), h("div", { className: "tower18-nav" }, button("\u015Eimdi g\xF6nder", () => {
        if (valid()) void call("sis_mist_spawn", spawnFields);
      }, { disabled: disabled2 || !meta.config?.enabled }), button("Planla", () => {
        if (valid()) void call("sis_mist_schedule", { ...spawnFields, at_ms: mistScheduleTimestamp(spawn.when) });
      }, { disabled: disabled2 || !meta.config?.enabled || !Number.isFinite(mistScheduleTimestamp(spawn.when)) })), h("h3", null, "Bekleyen portal planlar\u0131"), !(meta.schedules ?? []).length && h("p", null, "Bekleyen plan yok."), ...(meta.schedules ?? []).map((s) => h("div", { className: "mist24-schedule", key: s.id }, h("span", null, (meta.maps?.[s.area] ?? s.area) + " \xB7 Kanal " + s.channel + " \xB7 " + new Date(s.at_ms).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }) + " \xB7 " + (s.gold ? "Alt\u0131n Sis Yar\u0131\u011F\u0131" : "Sis Yar\u0131\u011F\u0131") + " \xB7 X " + s.x + " / Y " + s.y), button("\u0130ptal", () => call("sis_mist_cancel", { id: s.id }))))),
      h("div", { className: "tower18-save" }, button("Sis Yar\u0131\u011F\u0131 ayarlar\u0131n\u0131 kaydet", () => {
        if (valid()) void call("sis_mist_save", { revision, config: draft });
      }, { disabled: disabled2 || !dirty }), button("Canl\u0131 ayarlar\u0131 y\xFCkle", reload), h("small", null, dirty ? "Kaydedilmemi\u015F ayarlar\u0131n var. Portal g\xF6nderme bu tasla\u011F\u0131 de\u011Fi\u015Ftirmez." : "Yeni ayarlar yaln\u0131z yeni yar\u0131klara uygulan\u0131r."))
    );
  };
}

// working/core511-source/scripts/core511/mist-loot-client.mjs
var MIST_LOOT_MS = 3e3;
var MIST_LOOT_REACH = 120;
var MIST_LOOT_OPEN = "core511:mist-loot-open";
var MIST_LOOT_CANCEL = "core511:mist-loot-cancel";
var activeCollectors = /* @__PURE__ */ new Set();
var finite = Number.isFinite;
var terminal = (error) => Number(error?.status) >= 400 && Number(error?.status) < 500 && error?.payload?.code !== "command_outcome_unknown" && error?.body?.code !== "command_outcome_unknown";
var label = (value) => Array.from(String(value ?? "Oyuncu").replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "")).slice(0, 32).join("") || "Oyuncu";
function mistLootName(row) {
  return label(row?.ownerName) + " \xB7 Sand\u0131k";
}
function mistLootRows(world) {
  const run = world?.adventure511?.run;
  if (run?.kind !== "mist" || run.area !== world?.area) return [];
  return (world.adventure511.loot ?? []).filter((row) => row && typeof row.id === "string" && row.runId === run.id && row.area === world.area && row.channel === world.channel && finite(row.x) && finite(row.y));
}
function mistLootHit(world, x, y) {
  if (!finite(x) || !finite(y)) return null;
  let chosen = null, distance = Infinity;
  for (const row of mistLootRows(world)) {
    if (Math.abs(x - row.x) > 42 || y < row.y - 65 || y > row.y + 12) continue;
    const d = Math.hypot(x - row.x, y - (row.y - 25));
    if (d < distance) {
      chosen = row;
      distance = d;
    }
  }
  return chosen;
}
function activateMistLoot(row, target = globalThis.window) {
  if (row?.id && target?.dispatchEvent) target.dispatchEvent(new CustomEvent(MIST_LOOT_OPEN, { detail: { id: row.id } }));
}
function cancelMistLoot(reason = "interrupted") {
  for (const cancel of activeCollectors) cancel(reason);
}
function drawMistLoot(ctx, world, _now, visible) {
  for (const row of mistLootRows(world)) {
    if (visible && !visible(row.x, row.y, 140)) continue;
    ctx.save();
    ctx.translate(row.x, row.y);
    ctx.fillStyle = "#b6decb28";
    ctx.beginPath();
    ctx.ellipse(0, 3, 39, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#32271b";
    ctx.strokeStyle = "#c7a36c";
    ctx.beginPath();
    ctx.moveTo(-31, -26);
    ctx.lineTo(-31, -42);
    ctx.quadraticCurveTo(0, -65, 31, -42);
    ctx.lineTo(31, -26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#664427";
    ctx.fillRect(-31, -27, 62, 29);
    ctx.strokeRect(-31, -27, 62, 29);
    ctx.fillStyle = "#b68c4e";
    ctx.fillRect(-24, -44, 6, 46);
    ctx.fillRect(18, -44, 6, 46);
    ctx.fillStyle = "#ead191";
    ctx.fillRect(-7, -30, 14, 17);
    ctx.fillStyle = "#213d35";
    ctx.fillRect(-3, -25, 6, 7);
    ctx.textAlign = "center";
    ctx.font = "700 12px system-ui";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#08110f";
    ctx.fillStyle = "#f1ddad";
    const name = mistLootName(row);
    ctx.strokeText(name, 0, -70, 200);
    ctx.fillText(name, 0, -70, 200);
    ctx.restore();
  }
}
function contextOf(input) {
  const world = input?.world, own = input?.own, run = world?.adventure511?.run;
  return { world, own, run, key: JSON.stringify([own?.id, world?.area, world?.channel, run?.id]), valid: !!own?.id && own.hp > 0 && run?.kind === "mist" && run.area === world.area && !input?.uiSuspended, x: own?.x, y: own?.y, hp: own?.hp, hpRevision: own?.hp_revision ?? own?.hpRevision, positionRevision: own?.position_revision ?? own?.positionRevision };
}
function unchanged(before, after) {
  return after.valid && before.key === after.key && before.hp === after.hp && before.hpRevision === after.hpRevision && before.positionRevision === after.positionRevision && before.x === after.x && before.y === after.y;
}
function createMistLootController({ post, getContext, now = () => performance.now(), uuid = () => crypto.randomUUID(), onState = () => {
}, onChange = () => {
} }) {
  let state = { phase: "idle", progress: 0, message: "" }, operation = null, generation = 0, disposed = false;
  const publish = (patch) => {
    state = { ...state, ...patch };
    if (operation && !operation.finishSent && !disposed) activeCollectors.add(cancel);
    else activeCollectors.delete(cancel);
    if (!disposed) onState({ ...state });
  };
  const cancelRemote = (token) => {
    if (!token) return;
    Promise.resolve().then(() => post("/api/action", { action: "adventure_loot_cancel", requestId: uuid(), token })).catch(() => {
    });
  };
  const normalError = (error) => String(error?.payload?.error ?? error?.body?.error ?? error?.message ?? "\u0130\u015Flem tamamlanamad\u0131.");
  const postResult = async (body) => {
    const result = await post("/api/action", body);
    if (result?.error || result?.ok === false) throw Object.assign(Error(result.error ?? result.message ?? "\u0130\u015Flem tamamlanamad\u0131."), { status: result.status ?? 409, payload: result });
    return result;
  };
  function cancel(reason = "interrupted") {
    const op = operation;
    if (!op) return;
    if (op.finishSent) {
      op.interrupted = true;
      publish({ progress: 0, message: "Sand\u0131k sonucu sunucudan do\u011Frulan\u0131yor." });
      return;
    }
    generation++;
    operation = null;
    cancelRemote(op.token);
    publish({ phase: "idle", progress: 0, chest: null, message: reason === "taken" ? "Sand\u0131k art\u0131k burada de\u011Fil." : "Sand\u0131k toplama kesildi." });
  }
  async function beginRequest(op) {
    if (op.inFlight || operation !== op) return;
    op.inFlight = true;
    publish({ phase: "starting", progress: 0, message: "Sand\u0131k haz\u0131rlan\u0131yor\u2026" });
    try {
      const result = await postResult({ action: "adventure_loot_begin", requestId: op.beginId, chestId: op.chest.id });
      if (operation !== op || op.generation !== generation || disposed) {
        cancelRemote(result?.token);
        return;
      }
      if (typeof result?.token !== "string" || !result.token || result.chestId !== op.chest.id || !finite(result.startedAt) || !finite(result.readyAt) || result.readyAt - result.startedAt !== MIST_LOOT_MS) throw Error("Sand\u0131k s\xFCresi sunucudan do\u011Frulanamad\u0131.");
      op.token = result.token;
      if (!unchanged(op.context, contextOf(getContext()))) {
        cancel("interrupted");
        return;
      }
      op.receivedAt = now();
      op.finishId = uuid();
      publish({ phase: "channeling", progress: 0, message: "Sand\u0131k a\xE7\u0131l\u0131yor \xB7 Hareket etme" });
    } catch (error) {
      if (operation !== op || disposed) return;
      if (terminal(error)) {
        operation = null;
        publish({ phase: "error", progress: 0, message: normalError(error) });
      } else publish({ phase: "retry_begin", progress: 0, message: "Ba\u011Flant\u0131 sonucu belirsiz. Ayn\u0131 i\u015Flemi yeniden sorgula." });
    } finally {
      op.inFlight = false;
    }
  }
  async function finishRequest(op) {
    if (op.inFlight || operation !== op || !op.token) return;
    op.inFlight = true;
    op.finishSent = true;
    publish({ phase: "confirming", progress: op.interrupted ? 0 : 1, message: "Sunucu onay\u0131 bekleniyor\u2026" });
    try {
      const result = await postResult({ action: "adventure_loot_finish", requestId: op.finishId, chestId: op.chest.id, token: op.token });
      if (operation !== op || disposed) return;
      if (result?.collected !== true || result.chestId !== op.chest.id) throw Error("Sand\u0131k sonucu do\u011Frulanamad\u0131.");
      operation = null;
      onChange();
      publish({ phase: "complete", progress: 1, message: result.message ?? "Sand\u0131k topland\u0131." });
    } catch (error) {
      if (operation !== op || disposed) return;
      if (terminal(error)) {
        operation = null;
        onChange();
        publish({ phase: "error", progress: 0, message: normalError(error) });
      } else publish({ phase: "retry_finish", progress: op.interrupted ? 0 : 1, message: "Sonu\xE7 hen\xFCz do\u011Frulanamad\u0131. Ayn\u0131 i\u015Flemi yeniden sorgula." });
    } finally {
      op.inFlight = false;
    }
  }
  async function select(id) {
    if (disposed) return;
    if (operation) {
      if (operation.chest.id === id) return retry();
      publish({ message: "\xD6nce mevcut sand\u0131k i\u015Flemini tamamla veya iptal et." });
      return;
    }
    const context = contextOf(getContext()), chest = mistLootRows(context.world).find((row) => row.id === id);
    if (!context.valid || !chest) return;
    if (!finite(context.x) || !finite(context.y) || Math.hypot(context.x - chest.x, context.y - chest.y) > MIST_LOOT_REACH) {
      publish({ phase: "error", chest, message: "Sand\u0131\u011F\u0131 almak i\xE7in yakla\u015F.", progress: 0 });
      return;
    }
    const op = { chest, context, generation: ++generation, beginId: uuid(), inFlight: false, finishSent: false };
    operation = op;
    publish({ chest });
    return beginRequest(op);
  }
  function update() {
    const op = operation;
    if (!op || op.finishSent) return;
    const context = contextOf(getContext());
    if (!unchanged(op.context, context)) {
      cancel("interrupted");
      return;
    }
    if (!mistLootRows(context.world).some((row) => row.id === op.chest.id)) {
      cancel("taken");
      return;
    }
  }
  function tick() {
    update();
    const op = operation;
    if (!op || state.phase !== "channeling") return;
    const progress = Math.max(0, Math.min(1, (now() - op.receivedAt) / MIST_LOOT_MS));
    publish({ progress });
    if (progress >= 1) return finishRequest(op);
  }
  function retry() {
    const op = operation;
    if (!op || op.inFlight) return;
    if (state.phase === "retry_begin") return beginRequest(op);
    if (state.phase === "retry_finish") return finishRequest(op);
  }
  function dismiss() {
    if (operation) return cancel();
    publish({ phase: "idle", chest: null, progress: 0, message: "" });
  }
  function dispose() {
    cancel("disconnected");
    disposed = true;
    generation++;
    operation = null;
    activeCollectors.delete(cancel);
  }
  return { select, retry, cancel, update, tick, dismiss, dispose, get state() {
    return { ...state };
  } };
}
var MIST_LOOT_CSS = `.mist31-loot{position:fixed;left:50%;bottom:calc(126px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:42;box-sizing:border-box;width:min(360px,calc(100vw - 28px));padding:13px 15px;border:1px solid #a38b51;border-radius:12px;background:linear-gradient(145deg,#14271ff5,#101713f5);color:#eadfbd;box-shadow:0 8px 28px #0009;pointer-events:auto;font:13px/1.4 system-ui}.mist31-loot strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f2d79b;font-size:14px}.mist31-loot p{margin:6px 0;overflow-wrap:anywhere}.mist31-loot small{display:block;color:#b0c8b8}.mist31-loot-track{height:12px;margin:10px 0 7px;overflow:hidden;border:1px solid #5b6950;border-radius:99px;background:#050e0c}.mist31-loot-fill{height:100%;background:linear-gradient(90deg,#548873,#b9d4a1,#e5cd88);border-radius:inherit;box-shadow:0 0 12px #c9e7a260;transition:width .06s linear}.mist31-loot-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}.mist31-loot button{min-height:40px;padding:5px 12px;border:1px solid #8d805b;border-radius:7px;background:#263a2d;color:#eee2bd;touch-action:manipulation;font:600 12px system-ui}.mist31-loot button:disabled{opacity:.5}@media(max-height:500px){.mist31-loot{bottom:12px;left:12px;transform:none;width:min(310px,calc(100vw - 24px));padding:9px 12px}.mist31-loot small{display:none}}`;
function createMistLootUI(React, { Portal } = {}) {
  const h = React.createElement;
  function Panel({ state, onRetry, onDismiss }) {
    const active = ["starting", "channeling", "confirming"].includes(state.phase), retry = state.phase === "retry_begin" || state.phase === "retry_finish", progress = Math.round(Math.min(1, Math.max(0, state.progress)) * 100);
    return h("aside", { className: "mist31-loot", "aria-label": "Sis Yar\u0131\u011F\u0131 ganimet sand\u0131\u011F\u0131" }, h("strong", null, mistLootName(state.chest)), h("p", { role: "status", "aria-live": "polite" }, state.message), (state.phase === "channeling" || state.phase === "confirming") && h("div", { className: "mist31-loot-track", role: "progressbar", "aria-label": "Sand\u0131k toplama", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": progress }, h("div", { className: "mist31-loot-fill", style: { width: progress + "%" } })), state.phase === "channeling" && h("small", null, "3 saniye \xB7 Hareket, sald\u0131r\u0131 veya hasar toplama i\u015Flemini keser."), h("div", { className: "mist31-loot-actions" }, retry && h("button", { type: "button", onClick: onRetry }, "Sonucu yeniden sorgula"), h("button", { type: "button", disabled: state.phase === "confirming" || state.phase === "retry_finish", onClick: onDismiss }, active || state.phase === "retry_begin" ? "Vazge\xE7" : "Kapat")));
  }
  function Entry({ world, own, post, onChange, uiSuspended }) {
    const [state, setState] = React.useState({ phase: "idle", progress: 0, message: "" }), context = React.useRef(null), callbacks = React.useRef(null), control = React.useRef(null);
    context.current = { world, own, uiSuspended };
    callbacks.current = { post, onChange };
    React.useEffect(() => {
      const controller = createMistLootController({ post: (...args) => callbacks.current.post(...args), getContext: () => context.current, onState: setState, onChange: () => callbacks.current.onChange?.() });
      control.current = controller;
      const open = (event) => controller.select(event?.detail?.id), cancel = (event) => controller.cancel(event?.detail?.reason ?? "disconnected"), hidden = () => {
        if (document.hidden) cancel();
      };
      window.addEventListener(MIST_LOOT_OPEN, open);
      window.addEventListener(MIST_LOOT_CANCEL, cancel);
      const endings = ["coreoflife:game-session-ended", "coreoflife:instance-ended", "coreoflife:maintenance-exit491", "offline", "blur"];
      for (const name of endings) window.addEventListener(name, cancel);
      document.addEventListener("visibilitychange", hidden);
      return () => {
        controller.dispose();
        if (control.current === controller) control.current = null;
        window.removeEventListener(MIST_LOOT_OPEN, open);
        window.removeEventListener(MIST_LOOT_CANCEL, cancel);
        for (const name of endings) window.removeEventListener(name, cancel);
        document.removeEventListener("visibilitychange", hidden);
      };
    }, []);
    React.useEffect(() => {
      control.current?.update();
    }, [world, own, uiSuspended]);
    React.useEffect(() => {
      if (state.phase !== "channeling") return;
      const timer = setInterval(() => control.current?.tick(), 50);
      return () => clearInterval(timer);
    }, [state.phase]);
    const run = world?.adventure511?.run;
    if (uiSuspended || run?.kind !== "mist" || state.phase === "idle") return null;
    const body = h(Panel, { state, onRetry: () => control.current?.retry(), onDismiss: () => control.current?.dismiss() });
    return h(React.Fragment, null, h("style", null, MIST_LOOT_CSS), Portal ? Portal(body, document.body) : body);
  }
  return { Entry, Panel };
}

// working/core511-source/scripts/core511/tower-client.mjs
var TOWER_KINDS = { guard: "Zincirli N\xF6bet\xE7i", acolyte: "K\xFCl Vaizi", claw: "Yar\u0131k Pen\xE7e", stone: "Kadim Sinsi Ta\u015F", warden: "K\xF6r Gardiyan", mourner: "Matem Rahibesi", azrail: "Azrail" };
var TOWER_ENTRANCE = Object.freeze({ x: 2070, y: 430, width: 280, height: 420 });
var TOWER_NAMES = ["M\xFCh\xFCr Avlusu", "K\xFCl Koridoru", "Pen\xE7e Ge\xE7idi", "Zincir Salonu", "Gardiyan\u0131n Zindan\u0131", "K\u0131r\u0131k Ruhlar", "Matem Mabedi", "Sessiz \xC7\u0131\u011Fl\u0131k", "Son M\xFCh\xFCr", "Azrail\u2019in Taht\u0131"];
var TOWER_ITEMS = [["tower_seal_shard", "Kadim Kat M\xFChr\xFC", 0], ["tower_chain_ore", "Ruh Zinciri Halkas\u0131", 0], ["tower_mourning_essence", "Sinsi Ta\u015F \xC7ekirde\u011Fi", 0], ["tower_azrail_seal", "Matem \u0130pe\u011Fi", 0], ["tower_azrail_chest", "Azrail Sand\u0131\u011F\u0131", 0], ["tower_azrail_hook", "AZRA\u0130L KANCASI", 0]];
var ART = "/assets/tower-r18/";
var TOWER_SPRITES = Object.freeze({
  guard: [0.04, 0.07, 0.18, 0.41],
  acolyte: [0.29, 0.07, 0.16, 0.42],
  claw: [0.53, 0.14, 0.21, 0.34],
  stone: [0.8, 0.07, 0.14, 0.41],
  warden: [0.04, 0.56, 0.18, 0.37],
  mourner: [0.29, 0.56, 0.18, 0.37],
  azrail: [0.53, 0.56, 0.21, 0.37]
});
var TOWER_ICON_RECTS = [[40, 24, 500, 480], [544, 24, 480, 480], [1024, 24, 512, 480], [16, 512, 520, 496], [544, 512, 480, 496], [1024, 512, 512, 496]];
var TOWER_TINTS = [null, null, "rgba(33,27,20,0.05)", "rgba(89,28,10,0.06)", null, "rgba(25,33,52,0.06)", "rgba(65,29,15,0.06)", null, "rgba(25,17,62,0.06)", "rgba(79,16,43,0.06)", null];
var tinted = null;
var towerImage = adventureImage;
function towerMap(run) {
  if (run?.mode !== "tower") return null;
  const stage = Math.max(1, Math.min(10, run.stage));
  return { name: run.tower?.floorName ?? TOWER_NAMES[stage - 1], image: ART + "floor-" + (stage < 4 ? 1 : stage < 7 ? 4 : stage < 10 ? 7 : 10) + ".webp" };
}
function towerMapTexture(run) {
  const map = towerMap(run);
  if (!map) return null;
  const image = towerImage(map.image);
  if (!image) return null;
  const color = TOWER_TINTS[run.stage];
  if (!color || typeof document === "undefined") return image;
  if (tinted?.stage === run.stage) return tinted.canvas;
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return image;
  ctx.drawImage(image, 0, 0);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  Object.assign(canvas, { complete: true, naturalWidth: canvas.width, naturalHeight: canvas.height });
  tinted = { stage: run.stage, canvas };
  return canvas;
}
function towerEntranceHit(x, y) {
  const t = TOWER_ENTRANCE;
  return Math.abs(x - t.x) <= t.width / 2 && y >= t.y - t.height && y <= t.y + 24;
}
function drawTowerEntrance(ctx, now) {
  const t = TOWER_ENTRANCE, img = towerImage(ART + "entrance.webp");
  if (!img) return;
  ctx.save();
  ctx.drawImage(img, t.x - t.width / 2, t.y - t.height, t.width, t.height);
  ctx.font = "700 16px system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#06130e";
  ctx.fillStyle = "#e5c989";
  ctx.strokeText("Kadim Kulesi", t.x, t.y + 24);
  ctx.fillText("Kadim Kulesi", t.x, t.y + 24);
  ctx.font = "12px system-ui";
  ctx.strokeText("10 kat \xB7 Giri\u015F", t.x, t.y + 41);
  ctx.fillText("10 kat \xB7 Giri\u015F", t.x, t.y + 41);
  ctx.restore();
}
function towerMotionPose(kind, now, moving, attack, travel) {
  const stone = kind === "stone", boss = ["warden", "mourner", "azrail"].includes(kind);
  const phase = attack > 0 ? Math.sin(Math.min(1, Math.max(0, attack)) * Math.PI) : 0;
  const step = moving && !stone ? Math.sin((Number(travel) || 0) / 78 * Math.PI * 2) : 0;
  const breath = Math.sin((Number(now) || 0) / (boss ? 760 : 620));
  return { phase, step, upperX: stone ? 0 : step * 3 + phase * (boss ? 15 : 10), upperY: stone ? 0 : breath * 0.7 - Math.abs(step) * 2 - phase * 4, middleX: stone ? 0 : -step * 1.8 + phase * 4, middleY: stone ? 0 : -Math.abs(step) * 0.8 - phase * 1.5 };
}
function drawTowerEnemy(ctx, enemy, selected, now, moving, attack, travel, nativeRig) {
  if (!enemy?.towerKind) return false;
  const row = Object.keys(TOWER_KINDS).indexOf(enemy.towerKind), img = towerImage(TOWER_ATLAS);
  if (row < 0) return false;
  if (!img) {
    drawAdventurePlaceholder(ctx, enemy, selected);
    return true;
  }
  const boss = ["warden", "mourner", "azrail"].includes(enemy.towerKind), stone = enemy.towerKind === "stone", size = enemy.towerKind === "azrail" ? 300 : boss ? 250 : stone ? 220 : 170, rect = TOWER_SPRITES[enemy.towerKind], sw = rect[2] * img.naturalWidth, sh = rect[3] * img.naturalHeight, sx = rect[0] * img.naturalWidth, sy = rect[1] * img.naturalHeight, width = size * sw / sh, pose = towerMotionPose(enemy.towerKind, now, moving, attack, travel), face = enemy.direction?.x > 0.1 ? -1 : 1;
  ctx.save();
  ctx.fillStyle = selected ? "#c4a26766" : "#0006";
  ctx.beginPath();
  ctx.ellipse(enemy.x, enemy.y + 9, size * 0.25, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(enemy.x, enemy.y + 8);
  ctx.scale(face, 1);
  if (stone) {
    ctx.scale(1 + pose.phase * 0.025, 1 + Math.sin(now / 800) * 4e-3);
    ctx.drawImage(img, sx, sy, sw, sh, -width / 2, -size, width, size);
  } else if (!drawAdventureMotion(ctx, { image: img, x: sx, y: sy, width: sw, height: sh }, "tower-r27:" + enemy.towerKind, width, size, now, moving, attack, travel, enemy.towerKind === "claw" ? "beast" : ["acolyte", "mourner", "azrail"].includes(enemy.towerKind) ? "caster" : "humanoid")) ctx.drawImage(img, sx, sy, sw, sh, -width / 2, -size, width, size);
  if (!stone && attack > 0) {
    const phase = Math.sin(Math.min(1, attack) * Math.PI);
    ctx.save();
    ctx.globalAlpha = phase * 0.7;
    ctx.strokeStyle = enemy.towerKind === "azrail" ? "#ff6c70" : "#dfc094";
    ctx.lineWidth = boss ? 5 : 3;
    ctx.beginPath();
    ctx.arc(0, -size * 0.46, size * 0.42, -1.8 + attack * 1.5, 0.2 + attack * 1.5);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "700 12px system-ui";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#130d19";
  ctx.fillStyle = boss ? "#f1cc83" : "#d9e5d8";
  ctx.strokeText(enemy.name ?? TOWER_KINDS[enemy.towerKind], enemy.x, enemy.y - size - 3);
  ctx.fillText(enemy.name ?? TOWER_KINDS[enemy.towerKind], enemy.x, enemy.y - size - 3);
  const w = boss ? 125 : 90;
  ctx.fillStyle = "#130e19";
  ctx.fillRect(enemy.x - w / 2, enemy.y - size + 3, w, 6);
  ctx.fillStyle = stone ? "#7fe4bf" : boss ? "#cba14f" : "#bb665c";
  ctx.fillRect(enemy.x - w / 2, enemy.y - size + 3, w * Math.max(0, Math.min(1, enemy.hp / Math.max(1, enemy.maxHp))), 6);
  ctx.restore();
  return true;
}
function towerItemIndex(kind) {
  return TOWER_ITEMS.findIndex((row) => row[0] === kind);
}
function drawTowerLoot(ctx, loot) {
  if (readR40Options().towerMaterialIcons && drawTowerMaterialIconR40(ctx, loot)) return true;
  const index = towerItemIndex(loot.kind), img = towerImage(ART + "items.webp");
  if (index < 0) return false;
  if (!img) return true;
  const [x, y, w, h] = TOWER_ICON_RECTS[index];
  ctx.drawImage(img, x, y, w, h, loot.x - 25, loot.y - 45, 50, 50);
  return true;
}
var css2 = ADVENTURE_DOCK_CSS + INVENTORY_R27_CSS + `.tower18-dialog{width:min(790px,95vw);max-height:88dvh;overflow:auto;color:#e7e5d6;background:#0d1a16;border:1px solid #806c40}.tower18-body{display:grid;gap:14px}.tower18-hero{display:flex;gap:18px;align-items:center;padding:12px;background:linear-gradient(110deg,#10231d,#231c27);border:1px solid #705f3f;border-radius:12px}.tower18-hero img{width:110px;height:150px;object-fit:contain}.tower18-hero h3{font-size:24px;color:#e6c781;margin:0 0 9px}.tower18-muted{color:#b0b7a9;font-size:13px;line-height:1.5}.tower18-dialog button,.tower18-admin button{min-height:38px;border:1px solid #75653f;background:#193329;color:#f0e5c5;padding:8px 12px;border-radius:7px;cursor:pointer}.tower18-dialog button:disabled,.tower18-admin button:disabled{opacity:.45;cursor:default}.tower18-nav{display:flex;gap:7px;flex-wrap:wrap}.tower18-nav [aria-pressed=true]{background:#6d552e}.tower18-floor-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.tower18-floor{background:#17251f;border:1px solid #48533e;border-radius:7px;padding:8px;font-size:11px}.tower18-floor b{display:block;color:#e6c781;font-size:16px}.tower18-items{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.tower18-item{display:flex;gap:8px;align-items:center;background:#17251f;border:1px solid #42523d;border-radius:8px;padding:9px;flex-wrap:wrap}.tower18-item small{display:block;color:#b3bdac}.tower18-icon{width:54px;height:54px;display:inline-block;flex-shrink:0;background-image:url(/assets/tower-r18/items.webp);background-size:300% 200%;background-repeat:no-repeat}.tower18-status{padding:9px;border-left:3px solid #cbaa68;white-space:pre-wrap}.tower18-admin{grid-column:1 / -1;display:grid;gap:15px;min-width:0}.tower18-admin .tower18-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px}.tower18-admin label{display:grid;gap:4px;color:#ccd8c7;font-size:12px}.tower18-admin input,.tower18-admin select{width:100%;min-width:0;color:#eff1e6;background:#10221a;border:1px solid #49634b;padding:8px;border-radius:5px}.tower18-admin input[type=checkbox]{width:auto}.tower18-admin fieldset{border:1px solid #516344;border-radius:9px;padding:13px;min-width:0}.tower18-admin legend{color:#e5c886;padding:0 7px}.tower18-drop{display:grid;grid-template-columns:minmax(150px,2fr) repeat(3,minmax(64px,1fr)) auto;gap:7px;align-items:end;margin:8px 0}.tower18-admin h3{color:#e6c781;margin:4px 0}.tower18-admin .tower18-save{position:sticky;bottom:0;display:flex;gap:12px;align-items:center;padding:12px;background:#10231ff5;border:1px solid #73613a;z-index:2}.tower18-objective{font-size:13px;color:#e2cc96}@media(max-width:600px){.tower18-items{grid-template-columns:repeat(2,minmax(0,1fr))}.tower18-floor-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.tower18-drop{grid-template-columns:repeat(2,minmax(0,1fr))}.tower18-drop label:first-child{grid-column:1 / -1}.tower18-hero img{width:75px;height:110px}.tower18-hero h3{font-size:20px}}`;
function createTowerUI(React, ui = {}) {
  const h = React.createElement;
  function Icon({ kind }) {
    const iconR62=azrailIconR62(React,kind);if(iconR62)return iconR62;
    const i = towerItemIndex(kind);
    if (i < 0) return null;
    if (readR40Options().towerMaterialIcons) return towerMaterialIconR40(React, kind, TOWER_ITEMS[i][1]);
    const [x, y, w, height] = TOWER_ICON_RECTS[i];
    return h("span", { className: "tower18-icon", role: "img", "aria-label": TOWER_ITEMS[i][1], style: { backgroundSize: 1536 / w * 100 + "% " + 1024 / height * 100 + "%", backgroundPosition: x / (1536 - w) * 100 + "% " + y / (1024 - height) * 100 + "%" } });
  }
  function Entry({ snapshot, post, area, playerId, onResult, onChange, onTravel, uiSuspended }) {
    const [open, setOpen] = React.useState(false), [tab, setTab] = React.useState("tower"), [busy, setBusy] = React.useState(false), [message, setMessage] = React.useState("");
    const lock = React.useRef(false), pending = React.useRef(null), live = React.useRef(true);
    React.useEffect(() => {
      live.current = true;
      const show = () => {
        setOpen(true);
        setMessage("");
      }, end = () => setOpen(false);
      window.addEventListener("tower-open", show);
      window.addEventListener("coreoflife:game-session-ended", end);
      return () => {
        live.current = false;
        window.removeEventListener("tower-open", show);
        window.removeEventListener("coreoflife:game-session-ended", end);
      };
    }, []);
    React.useEffect(() => {
      if (uiSuspended) setOpen(false);
    }, [uiSuspended]);
    const info = snapshot?.towerInfo, config = info?.config, run = snapshot?.run, items = info?.inventory ?? snapshot?.materials ?? {}, inTower = run?.mode === "tower";
    React.useEffect(() => {
      if (inTower && pending.current?.key === JSON.stringify(["create_tower", {}])) pending.current = null;
    }, [inTower, run?.id]);
    async function act(action, extra = {}) {
      if (lock.current) return;
      const key = JSON.stringify([action, extra]);
      if (pending.current && pending.current.key !== key) {
        setMessage("\xD6nce belirsiz kalan i\u015Flemi ayn\u0131 d\xFC\u011Fmeyle yeniden sorgula.");
        return;
      }
      lock.current = true;
      setBusy(true);
      setMessage("");
      pending.current ??= { key, id: crypto.randomUUID() };
      try {
        const result = await post("/api/dungeon", { action, ...extra, requestId: pending.current.id });
        if (result.error) throw Error(result.error);
        pending.current = null;
        if (!live.current) return;
        onResult(result);
        onChange?.();
        setMessage(result.message ?? "\u0130\u015Flem tamamland\u0131.");
        if (action === "create_tower" || action === "leave") setOpen(false);
      } catch (error) {
        if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500 && error?.payload?.code !== "command_outcome_unknown") pending.current = null;
        if (live.current) setMessage(error?.message ?? "\u0130\u015Flem tamamlanamad\u0131. Ayn\u0131 d\xFC\u011Fmeyle yeniden sorgula.");
      } finally {
        lock.current = false;
        if (live.current) setBusy(false);
      }
    }
    const count = (kind) => Number(Array.isArray(items) ? items.find((x) => x.kind === kind)?.amount ?? 0 : items[kind] ?? 0);
    const body = h("div", { className: "tower18-body" }, h("nav", { className: "tower18-nav" }, ...["tower", "items"].map((t) => h("button", { key: t, type: "button", "aria-pressed": tab === t, onClick: () => setTab(t) }, t === "tower" ? "Kadim Kulesi" : "Kule \xC7antas\u0131"))), message && h("p", { className: "tower18-status", role: "status" }, message), tab === "tower" ? h(React.Fragment, null, h("div", { className: "tower18-hero" }, h("img", { src: ART + "entrance.webp", alt: "Kadim Kulesi" }), h("div", null, h("h3", null, "On Kat, Son Bir M\xFCh\xFCr"), h("p", { className: "tower18-muted" }, "Dalgalar\u0131 ve Sinsi Ta\u015Flar\u0131 temizle. Kat tamamlan\u0131nca ge\xE7ide y\xFCr\xFCyerek bir \xFCst kata \xE7\u0131k. Azrail son katta seni bekliyor."), h("b", null, (config?.minLevel ?? "\u2026") + ". seviye \xB7 " + Math.round((config?.durationSeconds ?? 3600) / 60) + " dakika"))), h("div", { className: "tower18-floor-grid" }, ...(config?.floors ?? TOWER_NAMES.map((name) => ({ name }))).map((floor, i) => h("div", { className: "tower18-floor", key: i }, h("b", null, i + 1 + ". Kat"), floor.name, floor.waves && h("small", null, " \xB7 " + floor.waves + " dalga")))), h("p", { className: "tower18-muted" }, "Son kat Azrail her tamamlanan turda 1 Azrail Sand\u0131\u011F\u0131 verir. AZRA\u0130L KANCASI bu sand\u0131ktan %10 olas\u0131l\u0131kla \xE7\u0131kar."), run ? h("button", { type: "button", onClick: () => {
      setOpen(false);
      window.dispatchEvent(new Event("dungeon-keeper"));
    } }, inTower ? "Kule turuna d\xF6n" : "Devam eden zindan\u0131na d\xF6n") : area !== "bazaar" ? h("button", { type: "button", disabled: busy, onClick: () => {
      setOpen(false);
      onTravel?.();
    } }, "\xD6nce Pazar K\xF6y\xFC\u2019ne git") : h("button", { type: "button", disabled: busy || !config?.enabled, onClick: () => act("create_tower") }, busy ? "Giriliyor\u2026" : !config ? "Kule bilgisi y\xFCkleniyor\u2026" : config.enabled ? "Kadim Kulesi\u2019ne gir" : "Kule \u015Fu an kapal\u0131")) : h(React.Fragment, null, h("div", { className: "tower18-items" }, ...TOWER_ITEMS.map(([kind, name, forge]) => h("div", { className: "tower18-item", key: kind }, h(Icon, { kind }), h("span", null, h("strong", null, name), h("small", null, count(kind) + " adet"), forge > 0 && h("small", null, "1 adet \u2192 " + forge + " Kor M\xFChr\xFC")), kind === "tower_azrail_chest" && h("button", { type: "button", disabled: busy || count(kind) < 1 || !!run, onClick: () => act("tower_open_chest") }, "Sand\u0131\u011F\u0131 a\xE7"), forge > 0 && h("button", { type: "button", disabled: busy || count(kind) < 1 || !!run || area !== "bazaar", onClick: () => act("tower_refine", { kind, amount: 1 }) }, "1 adet d\xF6n\xFC\u015Ft\xFCr")))), h("p", { className: "tower18-muted" }, "Kule malzemeleri art\u0131 basma malzemesidir. Sand\u0131\u011F\u0131 turdan \xE7\u0131kt\u0131ktan sonra a\xE7.")));
    return h(React.Fragment, null, h("style", null, css2), inTower && !uiSuspended && h("aside", { className: "tower18-exit", "aria-label": "Kuleden \xE7\u0131k\u0131\u015F" }, h("button", { type: "button", disabled: busy, onClick: () => act("leave") }, busy ? "\xC7\u0131k\u0131l\u0131yor\u2026" : "Kuleden \xE7\u0131k"), message && !open && h("p", { role: "status" }, message)), h("button", { type: "button", className: "action-tile dungeon-shortcut", "aria-label": "Kadim Kulesi", title: "Kadim Kulesi / Kule \xC7antas\u0131", onClick: () => setOpen(true) }, h("span", null, "\u265C"), h("span", null, "Kadim Kulesi")), ui.Dialog ? h(ui.Dialog, { open: open && !uiSuspended, onOpenChange: setOpen }, h(ui.Content, { className: "tower18-dialog" }, h(ui.Header, null, h(ui.Title, null, "Kadim Kulesi"), h(ui.Description, null, "Katlar, ganimetler ve kule e\u015Fyalar\u0131")), body)) : open ? h("div", { role: "dialog", className: "tower18-dialog", "aria-label": "Kadim Kulesi" }, h("button", { onClick: () => setOpen(false) }, "Kapat"), body) : null);
  }
  function Objective({ run }) {
    return run?.mode === "tower" ? h("p", { className: "tower18-objective" }, run.stage + ". kat / 10 \xB7 Dalga " + (run.tower?.wave ?? run.wave) + " / " + (run.tower?.waves ?? "?") + " \xB7 Kalan hedef: " + (run.tower?.remaining ?? run.enemies.filter((e) => e.hp > 0).length)) : null;
  }
  function Admin({ act, busy: outerBusy }) {
    const [draft, setDraft] = React.useState(null), [catalog, setCatalog] = React.useState([]), [revision, setRevision] = React.useState(null), [floor, setFloor] = React.useState(0), [tab, setTab] = React.useState("floors"), [busy, setBusy] = React.useState(false), [message, setMessage] = React.useState(""), [dirty, setDirty] = React.useState(false);
    const lock = React.useRef(false), alive = React.useRef(true);
    const accept = (result) => {
      const value = result?.tower;
      if (!value?.config) throw Error("Kule ayarlar\u0131 al\u0131namad\u0131.");
      setDraft(structuredClone(value.config));
      setRevision(value.revision ?? value.config.revision);
      setCatalog(value.catalog ?? []);
      setDirty(false);
    };
    const read = async () => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      setMessage("");
      try {
        const result = await act({ action: "kadim_tower_get" });
        if (alive.current) accept(result);
      } catch (error) {
        if (alive.current) setMessage(error.message ?? "Ayarlar y\xFCklenemedi.");
      } finally {
        lock.current = false;
        if (alive.current) setBusy(false);
      }
    };
    React.useEffect(() => {
      alive.current = true;
      void read();
      return () => {
        alive.current = false;
      };
    }, []);
    const edit = (change) => {
      setDraft((d) => {
        const next = structuredClone(d);
        change(next);
        return next;
      });
      setDirty(true);
    };
    const locked = busy || outerBusy;
    const num = (label2, value, set, min = 0, max = 1e8, step = 1, fixed = false) => h("label", null, label2, h("input", { type: "number", value, min, max, step, disabled: locked || fixed, onChange: (e) => set(Number(e.target.value)) }));
    const save = async () => {
      if (lock.current || !draft) return;
      lock.current = true;
      setBusy(true);
      setMessage("");
      try {
        const result = await act({ action: "kadim_tower_save", revision, config: draft });
        if (alive.current) {
          accept(result);
          setMessage("Kaydedildi. Ayarlar yeni kule turlar\u0131nda uygulan\u0131r.");
        }
      } catch (error) {
        if (alive.current) setMessage(error.message ?? "Kaydedilemedi.");
      } finally {
        lock.current = false;
        if (alive.current) setBusy(false);
      }
    };
    function Drops({ rows, change, chest = false }) {
      const options2 = catalog.filter((c) => c.id !== "tower:azrail_chest" && (chest || c.id !== "tower:azrail_hook"));
      return h("div", null, ...rows.map((row, index) => {
        const hook = row.itemId === "tower:azrail_hook";
        return h("div", { className: "tower18-drop", key: index }, h("label", null, "E\u015Fya", h("select", { value: row.itemId, disabled: locked || hook, onChange: (e) => change((next) => {
          next[index].itemId = e.target.value;
        }) }, ...options2.map((c) => h("option", { value: c.id, key: c.id }, c.name)))), num("Olas\u0131l\u0131k %", row.chance, (v) => !hook && change((next) => {
          next[index].chance = v;
        }), 0, 100, 0.01, hook), num("En az", row.min, (v) => !hook && change((next) => {
          next[index].min = v;
        }), 1, 1e3, 1, hook), num("En \xE7ok", row.max, (v) => !hook && change((next) => {
          next[index].max = v;
        }), 1, 1e3, 1, hook), h("button", { type: "button", disabled: locked || hook, onClick: () => change((next) => next.splice(index, 1)) }, hook ? "Sabit %10" : "Kald\u0131r"));
      }), h("button", { type: "button", disabled: locked || rows.length >= 16, onClick: () => {
        const next = options2.find((c) => !rows.some((r) => r.itemId === c.id));
        if (next) change((r) => r.push({ itemId: next.id, chance: 10, min: 1, max: 1 }));
      } }, "\xD6d\xFCl ekle"));
    }
    if (!draft) return h("section", { className: "admin-card tower18-admin" }, h("style", null, css2), h("h2", null, "Kadim Kulesi"), h("p", { role: "status" }, message || "Ayarlar y\xFCkleniyor\u2026"), h("button", { disabled: locked, onClick: read }, "Yeniden y\xFCkle"));
    const f = draft.floors[floor];
    return h("section", { className: "admin-card tower18-admin" }, h("style", null, css2), h("h2", null, "Kadim Kulesi \xB7 10 Kat"), h("p", { className: "tower18-muted" }, "Her kat\u0131 ayr\u0131 d\xFCzenle. Canavarlar her dalgada; Sinsi Ta\u015Flar kat ba\u015F\u0131nda; bosslar son dalgada \xE7\u0131kar. Devam eden turlar kendi ayarlar\u0131n\u0131 korur."), h("div", { className: "tower18-fields" }, h("label", null, h("span", null, h("input", { type: "checkbox", checked: draft.enabled, disabled: locked, onChange: (e) => edit((d) => {
      d.enabled = e.target.checked;
    }) }), " Kuleye giri\u015F a\xE7\u0131k")), num("Asgari seviye", draft.minLevel, (v) => edit((d) => {
      d.minLevel = v;
    }), 1, 100), num("Tur s\xFCresi (sn)", draft.durationSeconds, (v) => edit((d) => {
      d.durationSeconds = v;
    }), 300, 14400)), h("nav", { className: "tower18-nav" }, ...["floors", "patterns", "chest"].map((t) => h("button", { key: t, type: "button", "aria-pressed": tab === t, onClick: () => setTab(t) }, t === "floors" ? "Katlar ve D\xFC\u015Fmanlar" : t === "patterns" ? "Azrail Sald\u0131r\u0131 Alanlar\u0131" : "Azrail Sand\u0131\u011F\u0131"))), message && h("p", { className: "tower18-status", role: "status" }, message), tab === "floors" ? h(React.Fragment, null, h("nav", { className: "tower18-nav" }, ...draft.floors.map((f2, i) => h("button", { key: i, type: "button", "aria-pressed": floor === i, onClick: () => setFloor(i) }, i + 1 + ". Kat"))), h("div", { className: "tower18-fields" }, h("label", null, "Kat ad\u0131", h("input", { value: f.name, maxLength: 60, disabled: locked, onChange: (e) => edit((d) => {
      d.floors[floor].name = e.target.value;
    }) })), num("Dalga say\u0131s\u0131", f.waves, (v) => edit((d) => {
      d.floors[floor].waves = v;
    }), 1, 10), num("Dalgalar aras\u0131 (ms)", f.waveDelayMs, (v) => edit((d) => {
      d.floors[floor].waveDelayMs = v;
    }), 500, 3e4)), ...f.spawns.map((s, i) => h("fieldset", { key: i }, h("legend", null, TOWER_KINDS[s.kind]), h("div", { className: "tower18-fields" }, h("label", null, "T\xFCr", h("select", { value: s.kind, disabled: locked, onChange: (e) => edit((d) => {
      d.floors[floor].spawns[i].kind = e.target.value;
    }) }, ...Object.entries(TOWER_KINDS).filter(([kind]) => kind !== "azrail" || floor === 9).map(([kind, label2]) => h("option", { value: kind, key: kind }, label2)))), ...Object.entries({ count: ["Adet", 0, 30], hp: ["Can", 1, 1e8], xp: ["Tecr\xFCbe puan\u0131 (XP)", 0, 1e8], damage: ["Hasar", 0, 1e6], speed: ["H\u0131z", 0, 240], attackMs: ["Sald\u0131r\u0131 aral\u0131\u011F\u0131 (ms)", 600, 6e4], range: ["Menzil", 60, 650], telegraphMs: ["Alan i\u015Fareti s\xFCresi (ms)", 300, 1e4], radius: ["Alan yar\u0131\xE7ap\u0131", 40, 650] }).map(([key, [label2, min, max]]) => h(React.Fragment, { key }, num(label2, s[key], (v) => edit((d) => {
      d.floors[floor].spawns[i][key] = v;
    }), min, max)))), h("h3", null, "Bu d\xFC\u015Fman\u0131n ganimeti"), Drops({ rows: s.drops, change: (fn) => edit((d) => {
      fn(d.floors[floor].spawns[i].drops);
    }) }), h("button", { type: "button", disabled: locked || s.kind === "azrail", onClick: () => edit((d) => {
      d.floors[floor].spawns.splice(i, 1);
    }) }, "D\xFC\u015Fman grubunu kald\u0131r"))), h("button", { type: "button", disabled: locked || f.spawns.length >= 14, onClick: () => edit((d) => {
      d.floors[floor].spawns.push({ kind: "guard", count: 1, hp: 1e3, xp: 200, damage: 20, speed: 100, attackMs: 2200, range: 150, telegraphMs: 900, radius: 105, drops: [] });
    }) }, "Canavar / ta\u015F / boss ekle")) : tab === "patterns" ? h(React.Fragment, null, h("p", { className: "tower18-muted" }, "En az bir sald\u0131r\u0131 alan\u0131 a\xE7\u0131k kal\u0131r. \u0130\u015Faretlenen alandan s\xFCre bitmeden \xE7\u0131kmayan oyuncu sunucuda hasar al\u0131r."), ...Object.entries(draft.patterns).map(([kind, p]) => h("fieldset", { key: kind }, h("legend", null, { circle: "Ruh \xC7emberi", line: "\xD6l\xFCm Hatt\u0131", ring: "Matem Halkas\u0131" }[kind]), h("label", null, h("span", null, h("input", { type: "checkbox", checked: p.enabled, disabled: locked, onChange: (e) => edit((d) => {
      d.patterns[kind].enabled = e.target.checked;
    }) }), " Etkin")), h("div", { className: "tower18-fields" }, ...Object.entries({ damage: ["Hasar", 0, 1e6], telegraphMs: ["Ka\xE7\u0131\u015F s\xFCresi (ms; en az 750)", 750, 1e4], cooldownMs: ["Tekrar aral\u0131\u011F\u0131 (ms)", 1e3, 6e4], radius: ["Alan boyutu", 60, 650] }).map(([key, [label2, min, max]]) => h(React.Fragment, { key }, num(label2, p[key], (v) => edit((d) => {
      d.patterns[kind][key] = v;
    }), min, max))))))) : h(React.Fragment, null, h("p", null, "10. kat Azrail\u2019den 1 Azrail Sand\u0131\u011F\u0131 kesin d\xFC\u015Fer. Sand\u0131k i\xE7eri\u011Fini a\u015Fa\u011F\u0131da ayarla. AZRA\u0130L KANCASI %10 / 1 adet sabittir."), Drops({ rows: draft.chest, chest: true, change: (fn) => edit((d) => {
      fn(d.chest);
    }) })), h("div", { className: "tower18-save" }, h("button", { type: "button", disabled: locked || !dirty, onClick: save }, busy ? "Kaydediliyor\u2026" : "Kule ayarlar\u0131n\u0131 kaydet"), h("button", { type: "button", disabled: locked, onClick: () => {
      if (!dirty || confirm("Kaydedilmemi\u015F de\u011Fi\u015Fiklikler silinsin mi?")) read();
    } }, "Canl\u0131 ayarlar\u0131 y\xFCkle")));
  }
  return { ...createAdventureUI(React, { ...ui, Icon, css: css2, TOWER_ITEMS }), Materials: createTowerMaterials(React, { Icon, items: TOWER_ITEMS, css: css2 }), Admin, Icon, Objective, MistAdmin: createMistAdmin(React, css2) };
}
export {
  ADVENTURE_BOUNDS,
  ADVENTURE_DOCK,
  ADVENTURE_DOCK_CSS,
  ADVENTURE_MOTION_FRAMES,
  MIST_LOOT_CANCEL,
  MIST_LOOT_CSS,
  MIST_LOOT_MS,
  MIST_LOOT_OPEN,
  MIST_LOOT_REACH,
  MIST_NOTICE_MS,
  MIST_PORTAL_PARTICLES,
  MIST_SPRITES,
  MIST_UI_CSS,
  TOWER_ENTRANCE,
  TOWER_ICON_RECTS,
  TOWER_ITEMS,
  TOWER_KINDS,
  TOWER_NAMES,
  TOWER_SPRITES,
  activateMistLoot,
  admissionTextureArea,
  adventureArea,
  adventureAttackProgress,
  adventureBounds,
  adventureDockBounds,
  adventureImage,
  adventureLabel,
  adventureMotionFrame,
  adventureMotionPoint,
  adventureProfile,
  adventureSegment,
  adventureTexture,
  adventureTextureStatus,
  adventureTextureURLs,
  cancelMistLoot,
  chooseEssenceExchange,
  createAdventureUI,
  createMistLootController,
  createMistLootUI,
  createTowerUI,
  drawAdventureEnemy,
  drawAdventureMotion,
  drawAdventurePlaceholder,
  drawAdventureScene,
  drawMistLoot,
  drawMistPortal,
  drawTowerEnemy,
  drawTowerEntrance,
  drawTowerLoot,
  isAdventureArea,
  isMistArea,
  mistLootHit,
  mistLootName,
  mistLootRows,
  mistObjectiveLabel,
  mistProgressLabel,
  nearbyMistPortals,
  preloadAdventureTextures,
  retryAdventureTextures,
  towerEntranceHit,
  towerImage,
  towerItemIndex,
  towerMap,
  towerMapTexture,
  towerMotionPose
};
