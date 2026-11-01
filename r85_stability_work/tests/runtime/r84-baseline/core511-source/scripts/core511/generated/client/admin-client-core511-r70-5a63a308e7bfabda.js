import {createAdminNavigatorR66,adminSectionR66} from './core511-admin-nav-r66-712de6ba4040fcaa.js';
import {createMotionAdmin} from './core511-motion-admin-r34-85bc86838e29a3fd.js';
import {createAfkAdmin} from './core511-afk-admin-r32-abb1bb7ecdb247a0.js';
import { createTowerUI as createTower511 } from "./core511-tower-0fd926810ba551cc.js";
const colEnhanceKinds491 = Object.freeze(["weapon", "armor", "helmet", "shoes", "necklace", "earring", "bracelet"]);
const colEnhanceWeapon491 = Object.freeze([0, 3, 8, 15, 25, 40]);
const colEnhanceDefense491 = Object.freeze([0, 2, 6, 11, 18, 28]);
const colEnhanceSpecial491 = Object.freeze({ weapon: "Oyunculara kar\u015F\u0131 g\xFC\xE7 +%5", armor: "Oyunculara kar\u015F\u0131 diren\xE7 +%5", helmet: "Kritik vuru\u015F hasar\u0131 +%10", shoes: "Oyunculara kar\u015F\u0131 g\xFC\xE7 +%3", necklace: "Oyunculara kar\u015F\u0131 diren\xE7 +%3" });
function colEnhanceLevel491(item) {
  const explicit = item?.enhancementLevel;
  if (Number.isInteger(explicit) && explicit >= 0 && explicit <= 5) return explicit;
  const match = /^\+([0-5])\s/u.exec(String(item?.item_name ?? ""));
  return match ? Number(match[1]) : 0;
}
function colEnhanceName491(item) {
  const name = item?.item_name;
  if (typeof name !== "string" || !colEnhanceKinds491.includes(item?.kind)) return name;
  return "+" + colEnhanceLevel491(item) + " " + name.replace(/^(?:\+[0-5]\s+)+/u, "");
}
function colEnhanceBonusDetail491({ React, item }) {
  if (!colEnhanceKinds491.includes(item?.kind) || colEnhanceLevel491(item) !== 5 || !colEnhanceSpecial491[item.kind]) return null;
  return React.createElement("p", { className: "enhancement491-special" }, React.createElement("strong", null, "+5 bonusu \xB7 "), colEnhanceSpecial491[item.kind]);
}
function colEnhanceRequest491() {
  if (globalThis.crypto?.randomUUID) return "enhance491_" + globalThis.crypto.randomUUID();
  if (!globalThis.crypto?.getRandomValues) throw Error("G\xFCvenli i\u015Flem ba\u015Flat\u0131lamad\u0131. Sayfay\u0131 yenileyin.");
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return "enhance491_" + Array.from(bytes, (n2) => n2.toString(16).padStart(2, "0")).join("");
}
function colEnhancePending491(actorId, ref, value, expectedRequestId) {
  const actor = String(actorId ?? "");
  if (!actor) return null;
  const key = "coreoflife:enhance491:" + actor;
  if (arguments.length >= 3) {
    if (value) ref.current = { actor, payload: value };
    else if (ref.current?.actor === actor && (!expectedRequestId || ref.current.payload?.requestId === expectedRequestId)) ref.current = null;
    try {
      if (value) globalThis.sessionStorage?.setItem(key, JSON.stringify(value));
      else {
        const stored = JSON.parse(globalThis.sessionStorage?.getItem(key) ?? "null");
        if (!expectedRequestId || stored?.requestId === expectedRequestId) globalThis.sessionStorage?.removeItem(key);
      }
    } catch {
    }
    return value;
  }
  if (ref.current?.actor === actor) return ref.current.payload;
  try {
    const stored = JSON.parse(globalThis.sessionStorage?.getItem(key) ?? "null");
    if (stored && typeof stored.requestId === "string" && /^enhance491_[A-Za-z0-9-]{16,80}$/.test(stored.requestId) && typeof stored.itemId === "string" && stored.itemId.length <= 128 && Number.isInteger(stored.expectedLevel) && stored.expectedLevel >= 0 && stored.expectedLevel < 5 && Number.isSafeInteger(stored.configRevision) && stored.configRevision >= 0) {
      ref.current = { actor, payload: stored };
      return stored;
    }
  } catch {
  }
  return null;
}
function colEnhanceValidate491(config, catalog) {
  const percent = (value) => Number.isFinite(value) && value >= 0 && value <= 100 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-7;
  if (!config || typeof config.enabled !== "boolean") return "Sistemin a\xE7\u0131k veya kapal\u0131 oldu\u011Funu se\xE7in.";
  if (!percent(config.dropPercent)) return "Kor M\xFChr\xFC d\xFC\u015Fme oran\u0131 0\u2013100 aras\u0131nda, en fazla iki ondal\u0131k basamakl\u0131 olmal\u0131.";
  if (!Array.isArray(config.stages) || config.stages.length !== 5) return "Be\u015F geli\u015Ftirme a\u015Famas\u0131 bulunmal\u0131.";
  const available = new Set((catalog ?? []).map((row) => row.id));
  for (let i2 = 0; i2 < 5; i2++) {
    const row = config.stages[i2];
    if (row.level !== i2 + 1 || !percent(row.successPercent)) return "+" + (i2 + 1) + " ba\u015Far\u0131 oran\u0131 0\u2013100 aras\u0131nda, en fazla iki ondal\u0131k basamakl\u0131 olmal\u0131.";
    if (!Array.isArray(row.requirements) || row.requirements.length > 12) return "Bir a\u015Famada en fazla 12 malzeme se\xE7ilebilir.";
    const seen = /* @__PURE__ */ new Set();
    for (const cost of row.requirements) {
      if (!available.has(cost.id)) return "Listeden ge\xE7erli bir malzeme se\xE7in.";
      if (seen.has(cost.id)) return "Ayn\u0131 malzemeyi bir a\u015Famada iki kez se\xE7meyin.";
      seen.add(cost.id);
      if (!Number.isSafeInteger(cost.amount) || cost.amount < 1 || cost.amount > 1e6) return "Malzeme miktar\u0131 1\u20131.000.000 aras\u0131nda tam say\u0131 olmal\u0131.";
    }
  }
  return "";
}
function colEnhanceAdmin491({ React, value, busy, act }) {
  const h2 = React.createElement, copy = (config) => JSON.parse(JSON.stringify(config ?? { enabled: false, dropPercent: 0, stages: [1, 2, 3, 4, 5].map((level) => ({ level, successPercent: 0, requirements: [] })) }));
  const [draft, setDraft] = React.useState(() => copy(value?.config)), [revision, setRevision] = React.useState(value?.revision), [saving, setSaving] = React.useState(false), [notice, setNotice] = React.useState(""), [changed, setChanged] = React.useState(false);
  const dirty = React.useRef(false), lock = React.useRef(false), mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  React.useEffect(() => {
    if (!dirty.current) {
      setDraft(copy(value?.config));
      setRevision(value?.revision);
    }
  }, [value]);
  const catalog = value?.catalog ?? [], conflict = dirty.current && revision !== value?.revision, validation = colEnhanceValidate491(draft, catalog), disabled = busy || saving;
  const edit = (fn2) => {
    dirty.current = true;
    setChanged(true);
    setNotice("");
    setDraft((previous) => fn2(previous));
  };
  const editStage = (level, fn2) => edit((previous) => ({ ...previous, stages: previous.stages.map((row) => row.level === level ? fn2(row) : row) }));
  const numberInput = (label, number, update, min, max, step = 1) => h2("label", { className: "enhancement491-field" }, h2("span", null, label), h2("input", { type: "number", inputMode: step === 1 ? "numeric" : "decimal", min, max, step, value: number, disabled, onChange: (event) => update(event.target.value === "" ? "" : Number(event.target.value)) }));
  const save = async () => {
    if (lock.current || disabled || validation || conflict || !dirty.current) return;
    lock.current = true;
    setSaving(true);
    setNotice("");
    try {
      const response = await act({ action: "enhancement_settings491", config: draft, expectedRevision: revision });
      if (response?.enhancement491) {
        dirty.current = false;
        if (mounted.current) {
          setDraft(copy(response.enhancement491.config));
          setRevision(response.enhancement491.revision);
          setChanged(false);
          setNotice("Art\u0131 basma ayarlar\u0131 kaydedildi.");
        }
      } else if (mounted.current) setNotice("Kaydedilemedi. \xDCstteki y\xF6netici mesaj\u0131n\u0131 kontrol edin.");
    } catch (error) {
      if (mounted.current) setNotice(error instanceof Error ? error.message : "Ayarlar kaydedilemedi.");
    } finally {
      lock.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  if (!value) return h2("section", { className: "admin-card enhancement491-admin" }, h2("h2", null, "Art\u0131 Basma"), h2("p", null, "Ayarlar y\xFCklenemedi. Canl\u0131 veriyi yenileyin."));
  return h2(
    "section",
    { className: "admin-card enhancement491-admin" },
    h2("header", { className: "enhancement491-heading" }, h2("img", { src: "/game/haso-forge-v186.webp", alt: "", width: 64, height: 64 }), h2("div", null, h2("small", null, "DEM\u0130RC\u0130 HASO \xB7 EK\u0130PMAN GEL\u0130\u015ET\u0130RME"), h2("h2", null, "Art\u0131 Basma"), h2("p", null, "T\xFCm s\u0131n\u0131flar ve e\u015Fya renkleri ayn\u0131 geli\u015Ftirme katk\u0131s\u0131n\u0131 al\u0131r. Efsun, ta\u015F ve evrim \xF6zellikleri korunur."))),
    h2("div", { className: "enhancement491-admin-top" }, h2("label", { className: "enhancement491-toggle" }, h2("input", { type: "checkbox", checked: draft.enabled === true, disabled, onChange: (event) => edit((previous) => ({ ...previous, enabled: event.target.checked })) }), h2("span", null, h2("strong", null, draft.enabled ? "Art\u0131 basma A\xC7IK" : "Art\u0131 basma KAPALI"), h2("small", null, "Kapal\u0131yken yeni deneme yap\u0131lamaz. Var olan art\u0131lar ve bonuslar korunur."))), numberInput("Kor M\xFChr\xFC d\xFC\u015Fme \u015Fans\u0131 (%)", draft.dropPercent, (n2) => edit((previous) => ({ ...previous, dropPercent: n2 })), 0, 100, 0.01)),
    h2("p", { className: "enhancement491-hint" }, "Kor M\xFChr\xFC yaln\u0131z ger\xE7ek canavar \xF6l\xFCm\xFCnde, se\xE7ti\u011Finiz oranla d\xFC\u015Fer. Tek vuru\u015F ba\u015F\u0131na yeniden denenmez."),
    h2("div", { className: "enhancement491-summary" }, h2("div", null, h2("small", null, "+5 silah katk\u0131s\u0131"), h2("strong", null, "+40 sald\u0131r\u0131")), h2("div", null, h2("small", null, "+5 savunma e\u015Fyas\u0131 ba\u015F\u0131na"), h2("strong", null, "+28 savunma")), h2("div", null, h2("small", null, "Alt\u0131 savunma e\u015Fyas\u0131 toplam\u0131"), h2("strong", null, "+168 savunma"))),
    h2("p", { className: "enhancement491-risk" }, "Ba\u015Far\u0131s\u0131zl\u0131kta mevcut art\u0131 1 d\xFC\u015Fer; +0\u2019\u0131n alt\u0131na inmez. Se\xE7ilen malzemeler ba\u015Far\u0131da da ba\u015Far\u0131s\u0131zl\u0131kta da harcan\u0131r. E\u015Fya k\u0131r\u0131lmaz."),
    h2("div", { className: "enhancement491-stage-grid" }, draft.stages.map((stage) => h2(
      "article",
      { key: stage.level, className: "enhancement491-stage" },
      h2("header", null, h2("span", { className: "enhancement491-stage-number" }, "+" + stage.level), h2("div", null, h2("h3", null, "+" + (stage.level - 1) + " \u2192 +" + stage.level), h2("small", null, "Ba\u015Far\u0131s\u0131zl\u0131kta +" + Math.max(0, stage.level - 2)))),
      numberInput("Ba\u015Far\u0131 \u015Fans\u0131 (%)", stage.successPercent, (n2) => editStage(stage.level, (row) => ({ ...row, successPercent: n2 })), 0, 100, 0.01),
      h2("div", { className: "enhancement491-stage-stats" }, h2("span", null, "Ba\u015Far\u0131s\u0131zl\u0131k: %" + (Number.isFinite(stage.successPercent) ? Math.round((100 - stage.successPercent) * 100) / 100 : "\u2014")), h2("span", null, "Toplam +" + colEnhanceWeapon491[stage.level] + " sald\u0131r\u0131 / +" + colEnhanceDefense491[stage.level] + " savunma")),
      stage.level === 5 ? h2("details", { className: "enhancement491-special" }, h2("summary", null, "+5 \xF6zel bonuslar\u0131"), h2("ul", null, [["Silah", "weapon"], ["Z\u0131rh", "armor"], ["Kask", "helmet"], ["Ayakkab\u0131", "shoes"], ["Kolye", "necklace"]].map(([name, kind]) => h2("li", { key: kind }, name + ": " + colEnhanceSpecial491[kind]))), h2("small", null, "K\xFCpe ve bilezikte ek +5 \xF6zel bonus yok. Art\u0131 +4\u2019e d\xFC\u015Ferse \xF6zel bonus kapan\u0131r.")) : null,
      h2("h4", null, "\u0130stenen malzemeler"),
      h2("div", { className: "enhancement491-requirements" }, stage.requirements.map((cost, index) => h2(
        "div",
        { className: "enhancement491-requirement", key: stage.level + "-" + index },
        h2("label", { className: "enhancement491-field" }, h2("span", null, "Malzeme " + (index + 1)), h2("select", { value: cost.id, disabled, "aria-label": "+" + stage.level + " malzeme " + (index + 1), onChange: (event) => editStage(stage.level, (row) => ({ ...row, requirements: row.requirements.map((entry, n2) => n2 === index ? { ...entry, id: event.target.value } : entry) })) }, h2("option", { value: "" }, "Malzeme se\xE7in"), catalog.map((entry) => h2("option", { key: entry.id, value: entry.id, disabled: stage.requirements.some((other, n2) => n2 !== index && other.id === entry.id) }, entry.name)))),
        numberInput("Miktar", cost.amount, (n2) => editStage(stage.level, (row) => ({ ...row, requirements: row.requirements.map((entry, at2) => at2 === index ? { ...entry, amount: n2 } : entry) })), 1, 1e6),
        h2("button", { type: "button", className: "enhancement491-remove", disabled, "aria-label": "+" + stage.level + " a\u015Famas\u0131ndan " + (catalog.find((row) => row.id === cost.id)?.name ?? "malzeme") + " kald\u0131r", onClick: () => editStage(stage.level, (row) => ({ ...row, requirements: row.requirements.filter((_2, at2) => at2 !== index) })) }, "Kald\u0131r")
      ))),
      stage.requirements.length === 0 ? h2("p", { className: "enhancement491-hint" }, "Bu a\u015Fama malzeme istemiyor. \u0130sterseniz malzeme ekleyin.") : null,
      h2("button", { type: "button", className: "enhancement491-add", disabled: disabled || stage.requirements.length >= 12 || stage.requirements.length >= catalog.length, onClick: () => editStage(stage.level, (row) => ({ ...row, requirements: [...row.requirements, { id: catalog.find((entry) => !row.requirements.some((cost) => cost.id === entry.id))?.id ?? "", amount: 1 }] })) }, "+ Malzeme ekle")
    ))),
    conflict ? h2("p", { className: "enhancement491-alert", role: "alert" }, "Ayarlar ba\u015Fka bir oturumda de\u011Fi\u015Fti. Yazd\u0131klar\u0131n\u0131z korunuyor; kaydetmeden \xF6nce g\xFCncel ayarlar\u0131 y\xFCkleyin.") : null,
    validation ? h2("p", { className: "enhancement491-alert", role: "alert" }, validation) : null,
    notice ? h2("p", { className: "enhancement491-notice", role: "status" }, notice) : null,
    h2("footer", { className: "enhancement491-admin-save" }, h2("span", null, changed ? "Kaydedilmemi\u015F de\u011Fi\u015Fiklikler var." : "G\xFCncel ayarlar g\xF6r\xFCnt\xFCleniyor."), h2("button", { type: "button", disabled, onClick: () => {
      dirty.current = false;
      setChanged(false);
      setDraft(copy(value.config));
      setRevision(value.revision);
      setNotice("");
    } }, "G\xFCncel ayarlar\u0131 y\xFCkle"), h2("button", { type: "button", className: "enhancement491-primary", disabled: disabled || !!validation || conflict || !changed, onClick: () => void save() }, saving ? "Kaydediliyor\u2026" : "Art\u0131 basma ayarlar\u0131n\u0131 kaydet"))
  );
}
const colCauldronIngredients488 = Object.freeze([
  { id: "bat_wing", name: "Yarasa Kanad\u0131", image: "/assets/cauldron488-bat-wing.webp" },
  { id: "ghost_dust", name: "Hayalet Tozu", image: "/assets/cauldron488-ghost-dust.webp" },
  { id: "pumpkin_seed", name: "Balkaba\u011F\u0131 \xC7ekirde\u011Fi", image: "/assets/cauldron488-pumpkin-seed.webp" }
]);
function colCauldronIcon488(React, item, className = "") {
  const h2 = React.createElement, icon = item?.icon;
  if (String(item?.id ?? item?.itemId ?? "").startsWith("class:")) return h2("svg", { viewBox: "0 0 24 24", className: "cauldron488-item-art " + className, "aria-hidden": true }, h2("path", { d: "m12 3 9 5-9 5-9-5Zm-9 5v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5", fill: "#294962", stroke: "#8cd1ef", strokeWidth: 1.4, strokeLinejoin: "round" }));
  if (icon?.src) {
    const columns = Math.max(1, Number(icon.columns) || 1), rows = Math.max(1, Number(icon.rows) || 1);
    return h2("span", { className: "cauldron488-item-art " + className, role: "img", "aria-label": item.label ?? item.name ?? "", style: { backgroundImage: `url(${icon.src})`, backgroundSize: `${columns * 100}% ${rows * 100}%`, backgroundPosition: `${columns === 1 ? 0 : (Number(icon.col) || 0) / (columns - 1) * 100}% ${rows === 1 ? 0 : (Number(icon.row) || 0) / (rows - 1) * 100}%` } });
  }
  if (item?.image) return h2("img", { className: "cauldron488-item-art " + className, src: item.image, alt: "", loading: "lazy", decoding: "async" });
  if (["pearl", "essence", "gem", "potion"].includes(icon?.glyph)) {
    const red = item?.id === "resource:red_pearls" || item?.itemId === "resource:red_pearls";
    const children = icon.glyph === "pearl" ? [h2("circle", { key: 1, cx: 12, cy: 12, r: 8.2, fill: red ? "#e35b76" : "#dff8ff", stroke: red ? "#ffb5c0" : "#a9dbe7", strokeWidth: 1.4 }), h2("circle", { key: 2, cx: 9.2, cy: 8.8, r: 2.2, fill: "#fff", fillOpacity: 0.92 }), h2("path", { key: 3, d: "M7.2 15.8c2.8 2.4 6.9 2.7 9.7-.5", stroke: red ? "#8f1732" : "#8ebdcc", strokeWidth: 1.1, strokeLinecap: "round", opacity: 0.7 })] : icon.glyph === "potion" ? [h2("path", { key: 1, d: "M9 3h6v6l4 7a4 4 0 0 1-3.5 6h-7A4 4 0 0 1 5 16l4-7Z", fill: "#7a233a", stroke: "#f1c29b", strokeWidth: 1.5 }), h2("path", { key: 2, d: "M8 14h8l2 4q1 3-3 3H9q-4 0-3-3Z", fill: "#e44459" }), h2("path", { key: 3, d: "M8 3h8M8 7h8", stroke: "#e5b17e", strokeWidth: 2 })] : [h2("path", { key: 1, d: icon.glyph === "essence" ? "m12 2 7 10-7 10-7-10Z" : "m6 4-4 6 10 12 10-12-4-6Z", fill: "#236a55", stroke: "#7fe4b8", strokeWidth: 1.3 }), h2("path", { key: 2, d: icon.glyph === "essence" ? "M12 2v20L8 12Z" : "m6 4 6 18 6-18M2 10h20", fill: icon.glyph === "essence" ? "#81edb7" : "none", stroke: "#9af7ce", strokeWidth: 1.2 })];
    return h2("svg", { viewBox: "0 0 24 24", className: "cauldron488-item-art " + className, "aria-hidden": true }, children);
  }
  return h2("span", { className: "cauldron488-item-art cauldron488-glyph " + className, "aria-hidden": true, style: { color: icon?.color ?? "#dec18c" } }, icon?.glyph ?? "\u2726");
}
function colCauldronCanBrew488(state, recipe) {
  if (!state?.enabled || !recipe?.id) return false;
  if ((Number(state.dailyCrafts?.[recipe.id]) || 0) >= Number(recipe.dailyLimit)) return false;
  return colCauldronIngredients488.every((item) => (Number(state.ingredients?.[item.id]) || 0) >= (Number(recipe.cost?.[item.id]) || 0));
}
function colCauldronRequestId488() {
  if (globalThis.crypto?.randomUUID) return "cauldron488_" + globalThis.crypto.randomUUID();
  if (!globalThis.crypto?.getRandomValues) throw Error("G\xFCvenli i\u015Flem ba\u015Flat\u0131lamad\u0131. Sayfay\u0131 yenileyip tekrar dene.");
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return "cauldron488_" + Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}
function colCauldronCalendarEntry488(React, enabled, onOpen, onClose) {
  if (!enabled) return null;
  const h2 = React.createElement;
  return h2("button", { type: "button", className: "cauldron488-calendar-entry", onClick: () => {
    onClose();
    onOpen?.();
  } }, h2("img", { src: "/assets/cauldron488-icon.webp", alt: "", width: 44, height: 44 }), h2("span", null, h2("strong", null, "Cad\u0131n\u0131n Kazan\u0131"), h2("small", null, "Malzemelerini topla, tatl\u0131 \xF6d\xFCller haz\u0131rla")), h2("span", { "aria-hidden": true }, "\u2192"));
}
function colCauldronDraft488(value) {
  return JSON.parse(JSON.stringify(value ?? { version: 1, enabled: false, dropMaps: [], drops: { bat_wing: 0, ghost_dust: 0, pumpkin_seed: 0 }, recipes: [] }));
}
function colCauldronSearch488(catalog, query, group, page, size = 24) {
  const text = String(query ?? "").trim().toLocaleLowerCase("tr");
  const matched = (catalog ?? []).filter((item) => (!group || item.group === group) && (!text || [item.label, item.name, item.id, item.group, item.description].some((value) => String(value ?? "").toLocaleLowerCase("tr").includes(text))));
  const pages = Math.max(1, Math.ceil(matched.length / size)), current = Math.max(0, Math.min(pages - 1, Number(page) || 0));
  return { total: matched.length, pages, page: current, items: matched.slice(current * size, (current + 1) * size) };
}
function colCauldronValidateDraft488(config, catalog) {
  const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
  if (!config || typeof config.enabled !== "boolean" || !Array.isArray(config.recipes) || config.recipes.length > 8) return "En fazla 8 tarif ekleyebilirsin.";
  if (colCauldronIngredients488.some((item) => !integer(config.drops?.[item.id], 0, 1e6))) return "Malzeme oranlar\u0131 %0\u2013100 aras\u0131nda olmal\u0131.";
  if (config.enabled && (!config.recipes.length || !config.dropMaps.length)) return "Etkinli\u011Fi a\xE7mak i\xE7in en az bir harita ve \xF6d\xFCll\xFC tarif se\xE7.";
  const ids = /* @__PURE__ */ new Set();
  for (const recipe of config.recipes) {
    if (!/^[a-zA-Z0-9_-]{1,48}$/.test(recipe.id) || ids.has(recipe.id)) return "Tarif kimlikleri ge\xE7ersiz.";
    ids.add(recipe.id);
    if (!String(recipe.name ?? "").trim() || recipe.name.length > 48) return "Her tarife 1\u201348 karakterlik bir ad ver.";
    if (!integer(recipe.dailyLimit, 1, 100)) return "G\xFCnl\xFCk hak 1\u2013100 aras\u0131nda olmal\u0131.";
    if (colCauldronIngredients488.some((item) => !integer(recipe.cost?.[item.id], 0, 1e3)) || colCauldronIngredients488.reduce((sum, item) => sum + recipe.cost[item.id], 0) < 1) return "Tarif en az bir malzeme istemeli; her malzeme en fazla 1000 olabilir.";
    if (!Array.isArray(recipe.rewards) || recipe.rewards.length < 1 || recipe.rewards.length > 8) return "Her tarife 1\u20138 \xF6d\xFCl ekle.";
    for (const reward of recipe.rewards) {
      const item = catalog.find((row) => row.id === reward.itemId);
      if (!item || !integer(reward.amount, 1, item.maxAmount ?? 1e6)) return "\xD6d\xFCl miktarlar\u0131n\u0131 kontrol et.";
      if (item.powerMin !== void 0 && !integer(reward.power, item.powerMin, item.powerMax)) return "Ekipman veya r\xFCn g\xFCc\xFCn\xFC kontrol et.";
    }
  }
  return "";
}
function colCauldronAdmin488({ React, value, expectedEvents, busy, act }) {
  const h2 = React.createElement;
  const [draft, setDraft] = React.useState(() => colCauldronDraft488(value?.config)), [expected, setExpected] = React.useState({ revision: value?.revision, events: expectedEvents }), [saving, setSaving] = React.useState(false), [notice, setNotice] = React.useState(""), [picker, setPicker] = React.useState(""), [query, setQuery] = React.useState(""), [group, setGroup] = React.useState(""), [page, setPage] = React.useState(0);
  const dirty = React.useRef(false), lock = React.useRef(false);
  React.useEffect(() => {
    if (!dirty.current) {
      setDraft(colCauldronDraft488(value?.config));
      setExpected({ revision: value?.revision, events: expectedEvents });
    }
  }, [value, expectedEvents]);
  const catalog = value?.catalog ?? [], areas = value?.areas ?? [], conflict = dirty.current && (expected.revision !== value?.revision || expected.events !== expectedEvents);
  const validation = colCauldronValidateDraft488(draft, catalog), disabled = busy || saving;
  const set = (fn2) => {
    dirty.current = true;
    setDraft((old) => fn2(old));
    setNotice("");
  };
  const changeRecipe = (id, fn2) => set((old) => ({ ...old, recipes: old.recipes.map((recipe) => recipe.id === id ? fn2(recipe) : recipe) }));
  const input = (label, value2, onChange, min, max, step = 1) => h2("label", { className: "cauldron488-field", key: label }, h2("span", null, label), h2("input", { type: "number", min, max, step, value: value2, disabled, onChange: (event) => onChange(event.target.value === "" ? "" : Number(event.target.value)) }));
  const save = async () => {
    if (lock.current || disabled || validation || conflict || !dirty.current) return;
    lock.current = true;
    setSaving(true);
    setNotice("");
    try {
      const result = await act({ action: "cauldron_settings488", config: draft, expectedRevision: expected.revision, expectedEvents: expected.events });
      if (result?.cauldron488) {
        dirty.current = false;
        setDraft(colCauldronDraft488(result.cauldron488.config));
        setExpected({ revision: result.cauldron488.revision, events: result.settings?.events_json });
        setNotice("Cad\u0131n\u0131n Kazan\u0131 ayarlar\u0131 kaydedildi.");
      } else setNotice("Ayarlar kaydedilemedi. \xDCstteki y\xF6netici mesaj\u0131n\u0131 kontrol et.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ayarlar kaydedilemedi.");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  const results = React.useMemo(() => picker ? colCauldronSearch488(catalog, query, group, page) : { total: 0, pages: 1, page: 0, items: [] }, [catalog, picker, query, group, page]);
  const groups = React.useMemo(() => picker ? [...new Set(catalog.map((item) => item.group).filter(Boolean))].sort((a2, b2) => a2.localeCompare(b2, "tr")) : [], [catalog, picker]);
  if (!value) return h2("section", { className: "admin-card" }, h2("h2", null, "Cad\u0131n\u0131n Kazan\u0131"), h2("p", null, "Etkinlik ayarlar\u0131 y\xFCklenemedi. Canl\u0131 veriyi yenile."));
  return h2(
    "section",
    { className: "admin-card cauldron488-admin" },
    h2("header", { className: "cauldron488-admin-head" }, h2("img", { src: "/assets/cauldron488-icon.webp", alt: "", width: 64, height: 64 }), h2("div", null, h2("span", { className: "cauldron488-eyebrow" }, "CADILAR BAYRAMI ETK\u0130NL\u0130\u011E\u0130"), h2("h2", null, "Cad\u0131n\u0131n Kazan\u0131"), h2("p", null, "Malzemeler canavarlardan \xE7\u0131kar. Oyuncu se\xE7ti\u011Fi tarifin b\xFCt\xFCn \xF6d\xFCllerini al\u0131r."))),
    h2("label", { className: "cauldron488-enable" }, h2("input", { type: "checkbox", checked: draft.enabled, disabled, onChange: (event) => set((old) => ({ ...old, enabled: event.target.checked })) }), h2("span", null, h2("strong", null, draft.enabled ? "Etkinlik A\xC7IK" : "Etkinlik KAPALI"), h2("small", null, "Kaydetti\u011Finde oyunculara uygulan\u0131r. Kapat\u0131nca birikmi\u015F malzemeler korunur."))),
    h2("div", { className: "cauldron488-admin-block" }, h2("h3", null, "1. Malzemelerin \xE7\u0131kaca\u011F\u0131 haritalar"), h2("div", { className: "cauldron488-map-grid" }, areas.map((area) => {
      const id = Array.isArray(area) ? area[0] : area.id ?? area.area, name = Array.isArray(area) ? area[1] : area.name ?? area.label ?? id;
      return h2("label", { key: id }, h2("input", { type: "checkbox", checked: draft.dropMaps.includes(id), disabled, onChange: (event) => set((old) => ({ ...old, dropMaps: event.target.checked ? [...old.dropMaps, id] : old.dropMaps.filter((item) => item !== id) })) }), name);
    })), h2("p", { className: "cauldron488-muted" }, "Yaln\u0131z se\xE7ilen av haritalar\u0131ndaki uygun canavarlar malzeme verir. Bu malzemeler sat\u0131lamaz ve takas edilemez.")),
    h2("div", { className: "cauldron488-admin-block" }, h2("h3", null, "2. Malzeme d\xFC\u015Fme \u015Fanslar\u0131"), h2("div", { className: "cauldron488-rate-grid" }, colCauldronIngredients488.map((item) => h2("div", { key: item.id, className: "cauldron488-rate" }, h2("img", { src: item.image, alt: "", width: 60, height: 60 }), input(item.name + " (%)", draft.drops[item.id] === "" ? "" : draft.drops[item.id] / 1e4, (value2) => set((old) => ({ ...old, drops: { ...old.drops, [item.id]: value2 === "" ? "" : Math.round(value2 * 1e4) } })), 0, 100, 1e-4)))), h2("p", { className: "cauldron488-muted" }, "Her malzemenin \u015Fans\u0131 ayr\u0131 hesaplan\u0131r; toplam\u0131n %100 olmas\u0131 gerekmez. Ayn\u0131 canavardan birden fazla malzeme \xE7\u0131kabilir. %0 kapal\u0131, %5 ise her uygun kesimde %5 \u015Fanst\u0131r.")),
    h2(
      "div",
      { className: "cauldron488-admin-block" },
      h2("div", { className: "cauldron488-admin-row" }, h2("h3", null, "3. Tarifler ve \xF6d\xFCller"), h2("button", { type: "button", disabled: disabled || draft.recipes.length >= 8, onClick: () => {
        const id = "tarif_" + colCauldronRequestId488().replace(/[^a-zA-Z0-9]/g, "").slice(-16);
        set((old) => ({ ...old, recipes: [...old.recipes, { id, name: "Cad\u0131n\u0131n Hediyesi", cost: { bat_wing: 3, ghost_dust: 2, pumpkin_seed: 1 }, dailyLimit: 5, rewards: [] }] }));
      } }, "+ Tarif ekle")),
      !draft.recipes.length ? h2("p", { className: "cauldron488-empty" }, "\u0130lk tarifini olu\u015Ftur. \xD6d\xFClleri sen se\xE7ene kadar etkinlik kapal\u0131 kal\u0131r.") : null,
      draft.recipes.map((recipe, recipeIndex) => h2(
        "article",
        { className: "cauldron488-admin-recipe", key: recipe.id },
        h2("div", { className: "cauldron488-admin-row" }, h2("h4", null, "Tarif ", recipeIndex + 1), h2("button", { type: "button", className: "cauldron488-remove", disabled, onClick: () => {
          if (picker === recipe.id) setPicker("");
          set((old) => ({ ...old, recipes: old.recipes.filter((row) => row.id !== recipe.id) }));
        } }, "Tarifi kald\u0131r")),
        h2("div", { className: "cauldron488-edit-grid" }, h2("label", { className: "cauldron488-field" }, h2("span", null, "Oyuncunun g\xF6rece\u011Fi tarif ad\u0131"), h2("input", { value: recipe.name, maxLength: 48, disabled, onChange: (event) => changeRecipe(recipe.id, (row) => ({ ...row, name: event.target.value })) })), input("Oyuncu ba\u015F\u0131na g\xFCnl\xFCk hak", recipe.dailyLimit, (count) => changeRecipe(recipe.id, (row) => ({ ...row, dailyLimit: count })), 1, 100)),
        h2("div", { className: "cauldron488-cost-grid" }, colCauldronIngredients488.map((item) => input(item.name, recipe.cost[item.id], (count) => changeRecipe(recipe.id, (row) => ({ ...row, cost: { ...row.cost, [item.id]: count } })), 0, 1e3))),
        h2("h5", null, "Verilecek \xF6d\xFCller \xB7 ", recipe.rewards.length, " / 8"),
        h2("div", { className: "cauldron488-selected-rewards" }, recipe.rewards.map((reward, index) => {
          const item = catalog.find((row) => row.id === reward.itemId);
          return h2("div", { className: "cauldron488-selected-reward", key: reward.itemId + ":" + index }, colCauldronIcon488(React, item), h2("span", { className: "cauldron488-reward-name" }, h2("strong", null, item?.label ?? item?.name ?? reward.itemId), h2("small", null, item?.description ?? item?.group ?? "")), input("Miktar", reward.amount, (amount) => changeRecipe(recipe.id, (row) => ({ ...row, rewards: row.rewards.map((entry, i2) => i2 === index ? { ...entry, amount } : entry) })), 1, item?.maxAmount ?? 1e6), item?.powerMin !== void 0 ? input("G\xFC\xE7", reward.power ?? item.defaultPower, (power) => changeRecipe(recipe.id, (row) => ({ ...row, rewards: row.rewards.map((entry, i2) => i2 === index ? { ...entry, power } : entry) })), item.powerMin, item.powerMax) : null, h2("button", { type: "button", disabled, "aria-label": (item?.name ?? "\xD6d\xFCl") + " \xF6d\xFCl\xFCn\xFC kald\u0131r", onClick: () => changeRecipe(recipe.id, (row) => ({ ...row, rewards: row.rewards.filter((entry, i2) => i2 !== index) })) }, "Kald\u0131r"));
        })),
        h2("button", { type: "button", className: "cauldron488-add-reward", disabled: disabled || recipe.rewards.length >= 8, onClick: () => {
          setPicker(picker === recipe.id ? "" : recipe.id);
          setQuery("");
          setGroup("");
          setPage(0);
        } }, picker === recipe.id ? "\xD6d\xFCl se\xE7iciyi kapat" : "+ Oyundaki \xF6d\xFCllerden se\xE7"),
        picker === recipe.id ? h2("div", { className: "cauldron488-picker" }, h2("div", { className: "cauldron488-picker-filters" }, h2("label", { className: "cauldron488-field" }, h2("span", null, "\xD6d\xFCl ara"), h2("input", { type: "search", value: query, placeholder: "E\u015Fya, para, kanat, kupon\u2026", onChange: (event) => {
          setQuery(event.target.value);
          setPage(0);
        } })), h2("label", { className: "cauldron488-field" }, h2("span", null, "Kategori"), h2("select", { value: group, onChange: (event) => {
          setGroup(event.target.value);
          setPage(0);
        } }, h2("option", { value: "" }, "T\xFCm kategoriler"), groups.map((name) => h2("option", { key: name, value: name }, name))))), h2("p", { className: "cauldron488-muted" }, results.total, " \xF6d\xFCl \xB7 Sayfa ", results.page + 1, " / ", results.pages), h2("div", { className: "cauldron488-picker-items" }, results.items.map((item) => h2("button", { type: "button", key: item.id, disabled: disabled || recipe.rewards.length >= 8 || recipe.rewards.some((reward) => reward.itemId === item.id), onClick: () => changeRecipe(recipe.id, (row) => ({ ...row, rewards: [...row.rewards, { itemId: item.id, amount: 1, ...item.powerMin !== void 0 ? { power: item.defaultPower ?? item.powerMin } : {} }] })) }, colCauldronIcon488(React, item), h2("span", null, h2("strong", null, item.label ?? item.name), h2("small", null, item.group), item.description ? h2("small", null, item.description) : null)))), h2("div", { className: "cauldron488-picker-pages" }, h2("button", { type: "button", disabled: results.page === 0, onClick: () => setPage(results.page - 1) }, "\u2190 \xD6nceki"), h2("button", { type: "button", disabled: results.page + 1 >= results.pages, onClick: () => setPage(results.page + 1) }, "Sonraki \u2192"))) : null
      ))
    ),
    h2("p", { className: "cauldron488-muted" }, "\xD6d\xFCller rastgele se\xE7ilmez: tarifteki listenin tamam\u0131 verilir. S\xFCreli e\u015Fyalar, \xFCzerlerinde yazan mevcut oyun s\xFCresiyle verilir. G\xFCnl\xFCk haklar T\xFCrkiye saatiyle 00.00\u2019da yenilenir."),
    h2("div", { className: "cauldron488-admin-status", role: "status", "aria-live": "polite" }, notice || (conflict ? "Canl\u0131 ayarlar de\u011Fi\u015Fti. Tasla\u011F\u0131n korundu; g\xFCncel ayarlar\u0131 y\xFCkleyip de\u011Fi\u015Fikliklerini tekrar uygula." : validation)),
    h2("div", { className: "cauldron488-admin-actions" }, h2("button", { type: "button", className: "admin-primary", disabled: disabled || !!validation || conflict || !dirty.current, onClick: () => void save() }, saving ? "Kaydediliyor\u2026" : "Cad\u0131n\u0131n Kazan\u0131 ayarlar\u0131n\u0131 kaydet"), h2("button", { type: "button", disabled, onClick: () => {
      dirty.current = false;
      setDraft(colCauldronDraft488(value.config));
      setExpected({ revision: value.revision, events: expectedEvents });
      setNotice("");
      setPicker("");
    } }, "G\xFCncel ayarlar\u0131 y\xFCkle"))
  );
}
function defaultFishingCatch482() {
  return { pearl: 12, red_pearl: 8, talisman: 10, sokan: 30, levrek: 20, zargana: 20 };
}
function validateFishingCatch482(input) {
  const keys = ["pearl", "red_pearl", "talisman", "sokan", "levrek", "zargana"];
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== keys.length || Object.keys(input).some((key) => !keys.includes(key))) throw Error("Alt\u0131 av \xF6d\xFCl\xFCn\xFCn oran\u0131n\u0131 gir.");
  const next = {};
  let total = 0;
  for (const key of keys) {
    const value = input[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100 || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) throw Error("Oranlar 0\u2013100 aras\u0131nda, en fazla iki ondal\u0131kl\u0131 olmal\u0131.");
    next[key] = value;
    total += Math.round(value * 100);
  }
  if (total !== 1e4) throw Error("Yakalama oranlar\u0131n\u0131n toplam\u0131 %100 olmal\u0131.");
  return next;
}
function readFishingCatch482(raw) {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    return validateFishingCatch482(value?.fishingCatchWeights482 ?? defaultFishingCatch482());
  } catch {
    return defaultFishingCatch482();
  }
}
function createLoadLabAdmin477(React) {
  const h2 = React.createElement;
  function panelBudgetSecondsR12(botCount, durationMinutes = 5) {
    if (!Number.isSafeInteger(botCount) || botCount < 1 || botCount > 75 || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 10) return null;
    return Math.ceil((3e4 + Math.floor((botCount - 1) / 10) * 3e4 + (botCount - 1) % 10 * 150 + 3e4 + durationMinutes * 6e4 + 8e3) / 1e3);
  }
  function balancedAllocationR12(botCount, settings, rows, now = Date.now()) {
    if (!Number.isSafeInteger(botCount) || botCount < 1 || botCount > 75 || !Array.isArray(rows)) return null;
    const capacities = [1, 2, 3].map((id) => {
      const row = rows.find((value) => value.id === id), age = now - Date.parse(row?.observedAt);
      if (!row || !Number.isFinite(age) || age < -2e3 || age > 6e3 || !Number.isSafeInteger(row.humanPlayers) || row.humanPlayers < 0 || !Number.isSafeInteger(row.botPlayers) || row.botPlayers < 0) return null;
      return Math.max(0, 25 - row.humanPlayers - row.botPlayers - Number(settings.reserveOne && settings.reserveChannel === id));
    });
    if (capacities.some((value) => value === null) || capacities.reduce((a2, b2) => a2 + b2, 0) < botCount) return null;
    const chosen = [0, 0, 0];
    for (let i2 = 0; i2 < botCount; i2++) {
      let channel = -1;
      for (let j2 = 0; j2 < 3; j2++) if (chosen[j2] < capacities[j2] && (channel < 0 || chosen[j2] < chosen[channel])) channel = j2;
      chosen[channel]++;
    }
    return chosen;
  }
  const endpoint = "/api/admin?loadlab=1";
  const base = "0d352caa12e40846a3864eb9645c8de3a593b53b38b1666e2eb213fb7b8b12fc";
  const states = { unknown: "Durum bilinmiyor", idle: "Haz\u0131r", starting: "Ba\u015Flat\u0131l\u0131yor", running: "\xC7al\u0131\u015F\u0131yor", stopping: "Durduruluyor / temizleniyor", completed: "Tamamland\u0131", stopped: "Durduruldu", invalid: "\xD6l\xE7\xFCm ge\xE7ersiz", failed: "\u0130\u015Flem ba\u015Far\u0131s\u0131z" };
  const scenarios = { pve: "Da\u011F\u0131n\u0131k PvE", pvp10v10: "10v10 PvP", boss: "Boss ba\u015F\u0131nda toplanma", mixed: "Kar\u0131\u015F\u0131k" };
  const number = (value, digits = 1) => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("tr-TR", { maximumFractionDigits: digits }) : "\u2014";
  const percent = (value) => typeof value === "number" && Number.isFinite(value) ? number(value) + "%" : "\u2014";
  const stamp = (value) => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString("tr-TR") : "\u2014";
  const css = ".loadlab-admin477{grid-column:1/-1;min-width:0}.loadlab-admin477 *{box-sizing:border-box}.loadlab-admin477 .lab-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px}.loadlab-admin477 label{display:flex;flex-direction:column;gap:6px}.loadlab-admin477 input,.loadlab-admin477 select,.loadlab-admin477 textarea{width:100%;min-height:44px;color:inherit;background:#162333;border:1px solid #65758d;border-radius:8px;padding:8px}.loadlab-admin477 .lab-check{display:flex;flex-direction:row;align-items:center;gap:8px}.loadlab-admin477 .lab-check input{width:20px;min-height:20px;flex:0 0 20px}.loadlab-admin477 .lab-actions{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.loadlab-admin477 button{min-height:44px;cursor:pointer;padding:9px 14px}.loadlab-admin477 button:disabled{cursor:not-allowed;opacity:.55}.loadlab-admin477 .lab-stop{display:block;width:100%;min-height:64px;background:#a21324;color:#fff;border:2px solid #ff8f99;border-radius:10px;font-size:20px;font-weight:800}.loadlab-admin477 .lab-banner{padding:12px;background:#102e43;border:1px solid #598bab;border-radius:8px}.loadlab-admin477 .lab-error{color:#ffb6bb}.loadlab-admin477 .lab-table{overflow:auto;max-width:100%;margin:12px 0}.loadlab-admin477 table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}.loadlab-admin477 th,.loadlab-admin477 td{padding:9px;text-align:left;white-space:nowrap;border-bottom:1px solid #4a596a}.loadlab-admin477 textarea{min-height:100px;overflow-wrap:anywhere}.loadlab-admin477 fieldset{min-width:0;border:1px solid #53637c;padding:12px;border-radius:8px;margin:16px 0}.loadlab-admin477 .lab-report{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;border-bottom:1px solid #53637c;padding:10px 0}.loadlab-admin477 .lab-note{font-size:13px;line-height:1.5}.loadlab-admin477 code{overflow-wrap:anywhere}.loadlab-admin477 h3{margin-top:22px}";
  return function LoadLabAdmin477() {
    const [status, setStatus] = React.useState(null), [statusAvailable, setStatusAvailable] = React.useState(false), [error, setError] = React.useState(""), [notice, setNotice] = React.useState("");
    const [busy, setBusy] = React.useState(""), [stopping, setStopping] = React.useState(false), [pairing, setPairing] = React.useState("");
    const [minutes, setMinutes] = React.useState(60), [reports, setReports] = React.useState([]), [download, setDownload] = React.useState("");
    const [form, setForm] = React.useState({ botCount: 70, channels: [24, 23, 23], reserveOne: true, reserveChannel: 1, durationMinutes: 5, ramp: { enabled: true, stepBots: 10, everySeconds: 30 }, scenario: "pve" });
    const alive = React.useRef(false), requests = React.useRef(/* @__PURE__ */ new Set()), poll = React.useRef(null), inFlight = React.useRef(false), lock = React.useRef(false), stopLock = React.useRef(false), downloadTask = React.useRef(null), commandEpoch = React.useRef(0), pairingTimer = React.useRef(null);
    const refreshRef = React.useRef(null);
    async function request(operation, payload = {}, signal) {
      const controller = new AbortController();
      requests.current.add(controller);
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) controller.abort();
      const timeout = setTimeout(abort, operation === "status" ? 12e3 : 3e4);
      try {
        const response = await fetch(endpoint, {
          method: operation === "status" ? "GET" : "POST",
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          signal: controller.signal,
          ...operation === "status" ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "loadlab", operation, payload }) }
        });
        const result = await response.json();
        if (!response.ok || result?.ok === false) throw Object.assign(Error(result?.error || result?.message || "\u0130\u015Flem tamamlanamad\u0131."), { code: result?.code });
        return result;
      } finally {
        clearTimeout(timeout);
        requests.current.delete(controller);
        signal?.removeEventListener("abort", abort);
      }
    }
    function acceptStatus(result) {
      if (!alive.current) return;
      setStatus(result);
      setStatusAvailable(typeof result?.enabled === "boolean");
      if (Array.isArray(result?.agent?.reports)) setReports(result.agent.reports.slice(0, 50));
      if (result?.enabled === false) setPairing("");
    }
    async function refresh() {
      if (!alive.current || inFlight.current || document.visibilityState === "hidden") return;
      inFlight.current = true;
      try {
        acceptStatus(await request("status"));
      } catch (cause) {
        if (alive.current) {
          setStatusAvailable(false);
          setError(cause?.name === "AbortError" ? "Test durumu zaman\u0131nda al\u0131namad\u0131. A\xE7\u0131k/kapal\u0131 ve temizlik durumu do\u011Frulanamad\u0131." : cause?.message || "Test durumu al\u0131namad\u0131.");
        }
      } finally {
        inFlight.current = false;
      }
    }
    refreshRef.current = refresh;
    React.useEffect(() => {
      alive.current = true;
      let generation = 0;
      const update = () => {
        const version = ++generation;
        clearTimeout(poll.current);
        if (document.visibilityState === "hidden") {
          setPairing("");
          return;
        }
        void refreshRef.current().finally(() => {
          if (alive.current && version === generation && document.visibilityState !== "hidden") poll.current = setTimeout(update, 2e3);
        });
      };
      document.addEventListener("visibilitychange", update);
      update();
      return () => {
        alive.current = false;
        ++generation;
        clearTimeout(poll.current);
        clearTimeout(pairingTimer.current);
        downloadTask.current?.abort();
        for (const controller of requests.current) controller.abort();
        requests.current.clear();
        document.removeEventListener("visibilitychange", update);
      };
    }, []);
    async function command(operation, payload = {}) {
      if (lock.current || stopLock.current) return;
      lock.current = true;
      const epoch = ++commandEpoch.current;
      setBusy(operation);
      setError("");
      setNotice("");
      try {
        const result = await request(operation, payload);
        if (!alive.current || commandEpoch.current !== epoch) return;
        if (typeof result?.pairingToken === "string") {
          setPairing(result.pairingToken);
          clearTimeout(pairingTimer.current);
          pairingTimer.current = setTimeout(() => {
            if (alive.current) setPairing("");
          }, Math.max(0, Math.min(36e5, (result.expiresAtMs ?? Date.now()) - Date.now())));
        }
        if (operation === "reports") setReports(Array.isArray(result?.reports) ? result.reports.slice(0, 50) : []);
        if (operation === "disable") setPairing("");
        if (["stop", "cleanup", "disable"].includes(operation) && result?.protocol === "col-loadlab-cleanup-v2") {
          setStatus((previous) => ({ ...previous ?? {}, clean: result.clean === true, cleanupProgress: result.cleanup, cleanupError: result.cleanupError ?? null }));
          setNotice(result.clean === true ? "Test kay\u0131tlar\u0131n\u0131n temizli\u011Fi do\u011Fruland\u0131." : "Durdurma al\u0131nd\u0131. Temizlik s\xFCr\xFCyor; tamamlanmadan yeni test ba\u015Flayamaz.");
          await refreshRef.current();
          return;
        }
        setNotice({ enable: "S\xFCreli test modu a\xE7\u0131ld\u0131. Test VDS\u2019ini a\u015Fa\u011F\u0131daki kodla e\u015Fle\u015Ftir.", pair: "Yeni e\u015Fle\u015Ftirme kodu haz\u0131r. Test VDS\u2019indeki e\u015Fle\u015Ftirmeyi g\xFCncelle.", disable: "Test modunu kapatma iste\u011Fi al\u0131nd\u0131.", cleanup: "Yaln\u0131z bu teste ait kay\u0131tlar i\xE7in temizlik istendi.", start: "Ba\u015Flatma iste\u011Fi test VDS\u2019ine g\xF6nderildi. Canl\u0131 durumdan sonucu izle.", reports: "Rapor listesi g\xFCncellendi." }[operation] || "\u0130stek al\u0131nd\u0131.");
        await refreshRef.current();
      } catch (cause) {
        if (alive.current && commandEpoch.current === epoch) {
          setError(cause?.code === "stale_admin_epoch" ? "Kontrol durumu de\u011Fi\u015Fti. G\xFCncel durumu kontrol edip yeniden ba\u015Flat." : cause?.name === "AbortError" ? "Yan\u0131t s\xFCresi doldu. \u0130\u015Flem sonucu bilinmiyor; canl\u0131 durumu kontrol et." : cause?.message || "\u0130\u015Flem tamamlanamad\u0131.");
          if (cause?.code === "stale_admin_epoch") await refreshRef.current();
        }
      } finally {
        lock.current = false;
        if (alive.current) setBusy("");
      }
    }
    async function emergencyStop() {
      if (stopLock.current) return;
      stopLock.current = true;
      ++commandEpoch.current;
      setStopping(true);
      setNotice("Acil durdurma iste\u011Fi g\xF6nderiliyor\u2026");
      setError("");
      try {
        const result = await request("stop");
        if (alive.current) {
          if (result?.protocol === "col-loadlab-cleanup-v2") setStatus((previous) => ({ ...previous, clean: result.clean === true, cleanupProgress: result.cleanup, cleanupError: result.cleanupError ?? null }));
          setNotice(result?.clean === true ? "Botlar durduruldu ve temizlik do\u011Fruland\u0131." : "Acil durdurma al\u0131nd\u0131. Botlar\u0131n \xE7\u0131k\u0131\u015F\u0131 ve temizlik s\xFCr\xFCyor; a\u015Fa\u011F\u0131daki canl\u0131 temizlik durumunu izle.");
        }
        await refreshRef.current();
      } catch (cause) {
        if (alive.current) setError("Durdurma yan\u0131t\u0131 do\u011Frulanamad\u0131. Durumu yenile; gerekirse canl\u0131 sunucuda sudo col-loadlab-live disable komutunu \xE7al\u0131\u015Ft\u0131r.");
      } finally {
        stopLock.current = false;
        if (alive.current) setStopping(false);
      }
    }
    async function downloadReport(id, format) {
      if (downloadTask.current || typeof id !== "string") return;
      const task = new AbortController();
      downloadTask.current = task;
      setDownload(id + format);
      setError("");
      try {
        const deadline = Date.now() + 6e4;
        while (!task.signal.aborted && Date.now() < deadline) {
          if (document.visibilityState === "hidden") throw Error("Rapor indirmesi sekme gizlendi\u011Fi i\xE7in duraklat\u0131ld\u0131. Bu ekrana d\xF6n\xFCnce yeniden \u0130ndir\u2019e bas.");
          const result = await request("report", { id, format }, task.signal);
          if (result?.state === "ready") {
            if (result.id !== id || result.format !== format || format === "txt" && typeof result.data !== "string") throw Error("Rapor yan\u0131t\u0131 do\u011Frulanamad\u0131.");
            const body = format === "json" ? JSON.stringify(result.data, null, 2) + "\n" : result.data;
            const url = URL.createObjectURL(new Blob([body], { type: format === "json" ? "application/json;charset=utf-8" : "text/plain;charset=utf-8" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = "bot-testi-" + id.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 100) + "." + format;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1e3);
            if (alive.current) setNotice("Rapor indirme iste\u011Fi taray\u0131c\u0131ya g\xF6nderildi.");
            return;
          }
          if (result?.state !== "pending") throw Error("Rapor hen\xFCz haz\u0131r de\u011Fil veya test VDS\u2019ine ula\u015F\u0131lam\u0131yor.");
          await new Promise((resolve, reject) => {
            const timer = setTimeout(done, 2e3);
            function done() {
              task.signal.removeEventListener("abort", cancel);
              resolve();
            }
            function cancel() {
              clearTimeout(timer);
              task.signal.removeEventListener("abort", cancel);
              reject(new DOMException("\u0130ptal", "AbortError"));
            }
            task.signal.addEventListener("abort", cancel, { once: true });
          });
        }
        if (!task.signal.aborted) throw Error("Rapor bekleme s\xFCresi doldu. Test VDS\u2019inin ba\u011Flant\u0131s\u0131n\u0131 kontrol edip yeniden indir.");
      } catch (cause) {
        if (alive.current && cause?.name !== "AbortError") setError(cause?.code === "report_requires_new_pairing" ? "Bu raporun \xF6nbelle\u011Fi yok. Test modunu a\xE7\u0131p test VDS\u2019ini yeniden e\u015Fle\u015Ftir veya test VDS\u2019indeki \xF6zel panelden indir." : cause?.message || "Rapor indirilemedi.");
      } finally {
        downloadTask.current = null;
        if (alive.current) setDownload("");
      }
    }
    const cleanupProgress492 = status?.cleanupProgress;
    const cleanupFailed492 = status?.cleanupError || ["failed", "requires_cleanup"].includes(cleanupProgress492?.status);
    const cleanupMessages492 = (Array.isArray(cleanupProgress492?.failures) ? cleanupProgress492.failures : []).slice(-3).map((f2) => typeof f2?.code === "string" ? f2.code : "bilinmeyen_temizlik_hatasi");
    const agent = status?.agent, metrics = agent?.status;
    const actionNames = [["attack", "Sald\u0131r\u0131"], ["move", "Hareket"], ["world", "D\xFCnya"]];
    const serverMetric = (key) => metrics?.actionTimingMs?.[key]?.stages?.server_total;
    const serverValue = (key, field) => serverMetric(key)?.count > 0 ? number(serverMetric(key)[field], 2) : "\u2014";
    const cpuGroups = metrics?.processTotals?.groups ?? [];
    const connected = agent?.connected === true;
    const fresh = statusAvailable && connected && metrics?.observedAt && Date.now() - Date.parse(metrics.observedAt) >= -2e3 && Date.now() - Date.parse(metrics.observedAt) < 7e3;
    const active = status?.active === true || ["starting", "running", "stopping"].includes(metrics?.state) || ["queued", "accepted", "executing"].includes(agent?.command?.state);
    const change = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
    const rebalance = (count = form.botCount) => {
      if (busy || active || stopping) return;
      const channels = balancedAllocationR12(count, form, metrics?.channels);
      if (!channels) {
        setError("Da\u011F\u0131l\u0131m i\xE7in g\xFCncel kanal bilgisi ve yeterli bo\u015F yer gerekli.");
        return;
      }
      setError("");
      setForm((previous) => ({ ...previous, botCount: count, channels }));
    };
    const changeCount = (value) => {
      if (busy || active || stopping) return;
      setForm((previous) => ({ ...previous, botCount: value, channels: balancedAllocationR12(value, previous, metrics?.channels) ?? previous.channels }));
    };
    const allocation = (channel, value) => setForm((previous) => {
      const channels = previous.channels.map((n2, i2) => i2 === channel ? value : n2);
      return { ...previous, channels, botCount: channels.reduce((sum, n2) => sum + n2, 0) };
    });
    const issue = (() => {
      if (!Number.isInteger(form.botCount) || form.botCount < 1 || form.botCount > 75) return "Toplam bot say\u0131s\u0131 1\u201375 aras\u0131nda olmal\u0131.";
      if (form.channels.some((n2) => !Number.isInteger(n2) || n2 < 0 || n2 > 25) || form.channels.reduce((sum, n2) => sum + n2, 0) !== form.botCount) return "\xDC\xE7 kanal\u0131n toplam\u0131 bot say\u0131s\u0131na e\u015Fit olmal\u0131; kanal ba\u015F\u0131na en fazla 25 oyuncu.";
      if (form.reserveOne && form.channels[form.reserveChannel - 1] > 24) return "Sana yer ayr\u0131lan kanalda en fazla 24 bot olabilir.";
      if (!Number.isInteger(form.durationMinutes) || form.durationMinutes < 1 || form.durationMinutes > 10) return "Kararl\u0131 \xF6l\xE7\xFCm s\xFCresi 1\u201310 dakika olmal\u0131.";
      if (form.ramp.enabled !== true || form.ramp.stepBots !== 10 || form.ramp.everySeconds !== 30) return "Sabit rampa: her 30 saniyede 10 bot; \u0131s\u0131nma 30 saniye.";
      if (form.scenario === "pvp10v10" && (form.botCount !== 20 || form.channels.filter(Boolean).length !== 1)) return "10v10 PvP i\xE7in tek kanalda tam 20 bot se\xE7.";
      if (form.scenario === "mixed" && (form.botCount < 21 || !form.channels.some((n2) => n2 >= 20))) return "Kar\u0131\u015F\u0131k senaryoda bir kanalda 20 PvP botu ve en az 1 ek bot gerekir.";
      if (!Number.isInteger(form.ramp.stepBots) || form.ramp.stepBots < 1 || form.ramp.stepBots > 25 || !Number.isInteger(form.ramp.everySeconds) || form.ramp.everySeconds < 10 || form.ramp.everySeconds > 60) return "Art\u0131\u015F i\xE7in 10\u201360 saniyede 1\u201325 bot se\xE7.";
      for (const row of metrics?.channels ?? []) {
        const remaining = 25 - (row.humanPlayers ?? 25) - (row.botPlayers ?? 0) - Number(form.reserveOne && form.reserveChannel === row.id);
        if (form.channels[row.id - 1] > remaining) return "Kanal " + row.id + " i\xE7in ger\xE7ek oyuncular ve ayr\u0131lan yer sonras\u0131 bo\u015Fluk yetersiz.";
      }
      return "";
    })();
    const input = (label, value, min, max, onChange, disabled = !!busy || active || stopping) => h2("label", null, h2("span", null, label), h2("input", { type: "number", min, max, step: 1, value: Number.isNaN(value) ? "" : value, disabled, onChange: (event) => onChange(event.target.value === "" ? NaN : Number(event.target.value)) }));
    const button = (text, operation, payload, disabled = false) => h2("button", { type: "button", disabled: !!busy || stopping || disabled, onClick: () => void command(operation, payload) }, busy === operation ? "\u0130\u015Fleniyor\u2026" : text);
    const table = (headings, rows) => h2("div", { className: "lab-table" }, h2("table", null, h2("thead", null, h2("tr", null, ...headings.map((heading) => h2("th", { key: heading, scope: "col" }, heading)))), h2("tbody", null, ...rows.map((row, i2) => h2("tr", { key: i2 }, ...row.map((cell, index) => h2("td", { key: index }, cell)))))));
    return h2(
      "section",
      { className: "admin-card loadlab-admin477", "data-loadlab-admin477": "" },
      h2("style", null, css),
      h2("h2", null, "Bot Testi \xB7 ger\xE7ek\xE7i sentetik v2"),
      h2("p", { className: "lab-note" }, "Sabit istemci profili: temel sald\u0131r\u0131 1,3 sn; beceriler 20,8/24,7 sn; hareket kontrol\xFC 1 sn. Ger\xE7ek oyuncu p90/p99 \xF6l\xE7\xFClmedi. Son bot ba\u011Fland\u0131ktan sonra 30 sn \u0131s\u0131nma, ard\u0131ndan se\xE7ti\u011Fin s\xFCre boyunca kararl\u0131 \xF6l\xE7\xFCm. 5 dakika Protokol v1 kar\u015F\u0131la\u015Ft\u0131rmas\u0131d\u0131r; di\u011Fer s\xFCreler \xF6zel \xF6l\xE7\xFCm olarak raporlan\u0131r. Giri\u015F ve \u0131s\u0131nma se\xE7ilen s\xFCreye dahil de\u011Fildir."),
      h2("p", { className: "lab-banner" }, h2("strong", null, "Kapasite: 75 oyuncu \xB7 3 kanal \xD7 25. "), "100 oyuncu i\xE7in 4. kanal gerekir. Ger\xE7ek oyuncular ve sana ayr\u0131lan yer, kullan\u0131labilir bot kapasitesinden d\xFC\u015F\xFCl\xFCr."),
      h2("p", null, "Botlar ayr\u0131 test VDS\u2019inde (45.84.191.73) \xE7al\u0131\u015F\u0131r. Bu y\xF6netim ekran\u0131 canl\u0131 sunucudaki s\xFCreli test yetkisini ve uzak botlar\u0131 kontrol eder."),
      h2("div", { className: "lab-grid" }, input("Test modu s\xFCresi (dakika)", minutes, 1, 60, setMinutes, !!busy || active), h2("div", null, h2("strong", null, !statusAvailable ? "Test modu durumu bilinmiyor" : status?.enabled === true ? "Test modu a\xE7\u0131k" : "Test modu kapal\u0131"), h2("p", null, connected ? "Test VDS\u2019i ba\u011Fl\u0131" : "Test VDS\u2019i ba\u011Fl\u0131 de\u011Fil"), h2("small", null, "Yetki biti\u015Fi: ", stamp(status?.lease?.expiresAtMs ?? metrics?.live?.expiresAt)))),
      h2("div", { className: "lab-actions" }, button("Test modunu a\xE7", "enable", { minutes }, !statusAvailable || status?.clean === false || active || !Number.isInteger(minutes) || minutes < 1 || minutes > 60), button("E\u015Fle\u015Ftirme kodu \xFCret", "pair", {}, !status?.enabled || active), button("Test modunu kapat", "disable", {}, !status?.enabled), button("Test kay\u0131tlar\u0131n\u0131 temizle", "cleanup", {}, active), h2("button", { type: "button", onClick: () => void refresh(), disabled: stopping }, "Durumu yenile")),
      pairing && h2("fieldset", null, h2("legend", null, "Test VDS\u2019ini e\u015Fle\u015Ftir"), h2("p", null, "45.84.191.73 terminalinde a\u015Fa\u011F\u0131daki komutu \xE7al\u0131\u015Ft\u0131r; istendi\u011Finde bu kodu yap\u0131\u015Ft\u0131r. Kod yaln\u0131z bu yetki penceresinde kullan\u0131l\u0131r. Sohbete g\xF6nderme."), h2("code", null, "sudo col-loadlab pair"), h2("textarea", { readOnly: true, value: pairing, "aria-label": "Test VDS\u2019i e\u015Fle\u015Ftirme kodu", autoComplete: "off", spellCheck: false }), h2("div", { className: "lab-actions" }, h2("button", { type: "button", onClick: async () => {
        try {
          await navigator.clipboard.writeText(pairing);
          if (alive.current) setNotice("E\u015Fle\u015Ftirme kodu kopyaland\u0131.");
        } catch {
          if (alive.current) setError("Kod otomatik kopyalanamad\u0131. Metni se\xE7erek kopyala.");
        }
      } }, "Kodu kopyala"), h2("button", { type: "button", onClick: () => setPairing("") }, "Kodu gizle"))),
      h2(
        "fieldset",
        { disabled: !!busy || active || stopping },
        h2("legend", null, "Test ayarlar\u0131"),
        h2("div", { className: "lab-grid" }, input("Toplam bot say\u0131s\u0131", form.botCount, 1, 75, changeCount), ...form.channels.map((n2, i2) => h2("div", { key: i2 }, input("Kanal " + (i2 + 1) + " bot say\u0131s\u0131", n2, 0, form.reserveOne && form.reserveChannel === i2 + 1 ? 24 : 25, (value) => allocation(i2, value)))), input("Kararl\u0131 \xF6l\xE7\xFCm (dakika)", form.durationMinutes, 1, 10, (value) => change("durationMinutes", value)), h2("label", null, "Senaryo", h2("select", { value: form.scenario, onChange: (event) => change("scenario", event.target.value) }, ...Object.entries(scenarios).map(([value, label]) => h2("option", { key: value, value }, label))))),
        h2("button", { type: "button", disabled: !!busy || active || stopping, onClick: () => rebalance() }, "Dengeli da\u011F\u0131t"),
        h2("p", { className: "lab-note", role: "status" }, panelBudgetSecondsR12(form.botCount, form.durationMinutes) === null ? "Bot say\u0131s\u0131n\u0131 ve s\xFCreyi kontrol et." : form.botCount + " bot \xB7 " + form.durationMinutes + " dakika kararl\u0131 \xF6l\xE7\xFCm \xB7 giri\u015F ve \u0131s\u0131nma dahil test b\xFCt\xE7esi " + panelBudgetSecondsR12(form.botCount, form.durationMinutes) + " sn. Test yetkisi bunun en az 60 sn \xF6tesine uzanmal\u0131."),
        h2("p", null, h2("label", { className: "lab-check" }, h2("input", { type: "checkbox", checked: form.reserveOne, onChange: (event) => change("reserveOne", event.target.checked) }), "1 yeri benim i\xE7in bo\u015F b\u0131rak")),
        h2("label", null, "Bana yer ayr\u0131lacak kanal", h2("select", { value: form.reserveChannel, disabled: !form.reserveOne, onChange: (event) => change("reserveChannel", Number(event.target.value)) }, ...[1, 2, 3].map((n2) => h2("option", { key: n2, value: n2 }, "Kanal " + n2)))),
        h2("p", null, h2("label", { className: "lab-check" }, h2("input", { type: "checkbox", disabled: true, checked: form.ramp.enabled, onChange: (event) => change("ramp", { ...form.ramp, enabled: event.target.checked }) }), "Bot say\u0131s\u0131n\u0131 kademeli art\u0131r")),
        form.ramp.enabled && h2("div", { className: "lab-grid" }, input("Her ad\u0131mda eklenecek bot", form.ramp.stepBots, 10, 10, (value) => change("ramp", { ...form.ramp, stepBots: value }), true), input("Art\u0131\u015F aral\u0131\u011F\u0131 (saniye)", form.ramp.everySeconds, 30, 30, (value) => change("ramp", { ...form.ramp, everySeconds: value }), true)),
        issue && h2("p", { className: "lab-error", role: "status" }, issue),
        h2("p", { className: "lab-note" }, "10v10 PvP botlar\u0131 yaln\u0131z kendi test grubuyla sava\u015F\u0131r. Ba\u015Flang\u0131\xE7ta sunucu kapasiteyi, yetki s\xFCresini ve g\xFCvenlik \xF6l\xE7\xFCmlerini tekrar do\u011Frular."),
        button("Testi ba\u015Flat", "start", { settings: form, expectedEpoch: agent?.epoch }, !!issue || !status?.enabled || !fresh || active || status?.clean === false || !Number.isSafeInteger(agent?.epoch))
      ),
      h2("button", { type: "button", className: "lab-stop", disabled: stopping, onClick: () => void emergencyStop() }, stopping ? "DURDURMA G\xD6NDER\u0130L\u0130YOR\u2026" : "AC\u0130L DURDUR"),
      h2("p", { className: "lab-note" }, "Durdurma bot ba\u011Flant\u0131lar\u0131n\u0131 kapat\u0131r. Test kay\u0131tlar\u0131n\u0131n temizli\u011Fi tamamlanana kadar yeni test ba\u015Flayamaz. Kanal ELU %90 veya loop delay 200 ms s\u0131n\u0131r\u0131n\u0131 10 saniyeden uzun a\u015Farsa otomatik durdurma devrededir."),
      error && h2("p", { className: "lab-error", role: "alert" }, error),
      notice && h2("p", { role: "status" }, notice),
      h2("section", { className: cleanupFailed492 ? "lab-banner lab-error" : "lab-banner", "aria-label": "Canl\u0131 test temizli\u011Fi", role: cleanupFailed492 ? "alert" : "status" }, h2("strong", null, !statusAvailable ? "Canl\u0131 temizlik durumu do\u011Frulanamad\u0131." : status?.clean === true ? "Canl\u0131 test kay\u0131tlar\u0131 temiz." : cleanupFailed492 ? "Temizlik tamamlanamad\u0131; yeni test engelli." : "Test kay\u0131tlar\u0131 hen\xFCz temizlenmedi; yeni test engelli."), status?.cleanupError && h2("p", null, "Hata: ", String(status.cleanupError)), cleanupMessages492.length > 0 && h2("p", null, "Son temizlik hatalar\u0131: ", cleanupMessages492.join(" \xB7 ")), cleanupProgress492 && h2("small", null, "Durum: ", String(cleanupProgress492.status ?? "bilinmiyor"), " \xB7 Deneme: ", number(cleanupProgress492.attempts, 0))),
      h2("h3", null, "Canl\u0131 \xF6l\xE7\xFCm"),
      h2("p", null, states[metrics?.state] || "Test VDS\u2019inden veri bekleniyor", " \xB7 ", fresh ? "G\xFCncel" : "Veri g\xFCncel de\u011Fil / ba\u011Flant\u0131 bekleniyor", " \xB7 Son veri: ", stamp(metrics?.observedAt)),
      h2("p", null, fresh ? "Ba\u011Fl\u0131 bot: " : "Son bildirilen bot say\u0131s\u0131 (g\xFCncel de\u011Fil): ", number(metrics?.bots?.connected, 0), " \xB7 Hata: ", number(metrics?.bots?.errors, 0), " \xB7 Kopma: ", number(metrics?.bots?.disconnects, 0)),
      ["pending", "requires_attention", "confirmed"].includes(metrics?.cleanup?.status) && h2(
        "p",
        { className: metrics.cleanup.status === "requires_attention" ? "lab-banner lab-error" : "lab-banner", role: "status" },
        metrics.cleanup.status === "pending" ? "Temizlik do\u011Frulan\u0131yor. Nihai rapor hen\xFCz haz\u0131r de\u011Fil." : metrics.cleanup.status === "requires_attention" ? "Temizlik do\u011Frulanamad\u0131. Nihai rapor bekletiliyor; AC\u0130L DURDUR ile yeniden dene." : metrics.cleanup.reportReady ? "Temizlik do\u011Fruland\u0131. Nihai rapor haz\u0131r." : "Temizlik do\u011Fruland\u0131. Rapor haz\u0131rlan\u0131yor.",
        " \xB7 Deneme: ",
        number(metrics.cleanup.attempts, 0)
      ),
      (metrics?.generator?.saturated || metrics?.invalidReasons?.length > 0) && h2("p", { className: "lab-error", role: "alert" }, metrics?.generator?.saturated ? "\xDCretici doymu\u015F, sonu\xE7 ge\xE7ersiz. " : "\xD6l\xE7\xFCm ge\xE7ersiz. ", (metrics?.invalidReasons ?? []).join(" \xB7 ")),
      metrics?.stopReason && h2("p", null, "Durdurma nedeni: ", metrics.stopReason),
      h2(
        "section",
        { className: "lab-banner", "aria-label": "Oyun sunucusu i\u015Flem s\xFCreleri", style: { margin: "18px 0", padding: "18px" } },
        h2("h3", { style: { marginTop: 0 } }, "Oyun sunucusu i\u015Flem s\xFCresi \xB7 test geneli"),
        h2("div", { className: "lab-grid" }, ...actionNames.map(([key, label]) => h2(
          "div",
          { key },
          h2("div", null, label + " \xB7 p95"),
          h2("strong", { style: { fontSize: "clamp(24px,4vw,36px)", display: "block", lineHeight: 1.3 } }, serverValue(key, "p95"), " ms"),
          h2("div", null, "p50 ", serverValue(key, "p50"), " ms \xB7 max ", serverValue(key, "max"), " ms"),
          h2("small", null, number(serverMetric(key)?.count, 0), " sunucu \xF6rne\u011Fi / ", number(metrics?.actionTimingMs?.[key]?.acceptedReplies, 0), " ba\u015Far\u0131l\u0131 yan\u0131t")
        ))),
        h2("p", { className: "lab-note" }, "Ger\xE7ek oyunculara da hizmet veren oyun sunucusu yolunda \xF6l\xE7\xFCl\xFCr. A\u011F, test ge\xE7idi ve cihaz \xE7izimi hari\xE7tir; ger\xE7ek oyuncunun u\xE7tan uca gecikme garantisi de\u011Fildir. Bot izolasyonunun farkl\u0131 kalan ad\u0131mlar\u0131 raporda belirtilir."),
        h2("p", { className: "lab-note" }, "Test ba\u015F\u0131ndan itibaren biriken p50/p95/max. \xD6l\xE7\xFClmeyen veya eski s\xFCr\xFCmde bulunmayan a\u015Fama \u2014 g\xF6sterilir; bot yan\u0131t s\xFCresiyle doldurulmaz.")
      ),
      h2("h3", null, "Bot u\xE7tan uca yan\u0131t\u0131 \xB7 test geneli"),
      table(["\u0130\u015Flem", "p50 (ms)", "p95 (ms)", "En y\xFCksek (ms)", "\xD6rnek"], actionNames.map(([key, label]) => {
        const row = metrics?.latencyMs?.[key];
        return [label, row?.count > 0 ? number(row.p50, 3) : "\u2014", row?.count > 0 ? number(row.p95, 3) : "\u2014", row?.count > 0 ? number(row.max, 3) : "\u2014", number(row?.count, 0)];
      })),
      h2("p", { className: "lab-note" }, "\u0130ki saniyede yenilenir; son iki saniyenin gecikmesi de\u011Fildir. Bot, ba\u011Flant\u0131 ve test ge\xE7idi s\xFCrelerini i\xE7erir. p95 de\u011Ferleri birbirinden \xE7\u0131kar\u0131larak a\u011F s\xFCresi hesaplanmaz."),
      h2(
        "details",
        null,
        h2("summary", null, "Sald\u0131r\u0131, hareket ve d\xFCnya a\u015Famalar\u0131n\u0131 g\xF6ster"),
        ...actionNames.map(([key, label]) => h2(
          "div",
          { key },
          h2("h3", null, label),
          table(["\xD6l\xE7\xFClen a\u015Fama", "p50 ms", "p95 ms", "max ms", "\xD6rnek"], Object.entries(metrics?.actionTimingMs?.[key]?.stages ?? {}).slice(0, 64).map(([stage, row]) => [stage, row?.count > 0 ? number(row.p50, 2) : "\u2014", row?.count > 0 ? number(row.p95, 2) : "\u2014", row?.count > 0 ? number(row.max, 2) : "\u2014", number(row?.count, 0)]))
        )),
        h2("p", { className: "lab-note" }, "A\u015Famalar i\xE7 i\xE7e olabilir; toplanmaz. HTTP ile WebSocket yollar\u0131 farkl\u0131d\u0131r. Saydam WebSocket test ge\xE7idinin istek ba\u015F\u0131na s\xFCresi ayr\u0131ca \xF6l\xE7\xFClmez; eksik \xF6l\xE7\xFCm s\u0131f\u0131r anlam\u0131na gelmez.")
      ),
      table(["Kanal", "Ger\xE7ek / bot", "ELU", "Loop delay (ms)", "CPU", "RAM (MiB)"], [1, 2, 3].map((id) => {
        const row = metrics?.channels?.find((item) => item.id === id);
        return [id, number(row?.humanPlayers, 0) + " / " + number(row?.botPlayers, 0), typeof row?.elu === "number" ? percent(row.elu * 100) : "\u2014", number(row?.loopDelayMs, 3), percent(row?.cpuPercent), typeof row?.ramBytes === "number" ? number(row.ramBytes / 1048576) : "\u2014"];
      })),
      h2("p", null, "Canl\u0131 VDS CPU: ", percent(metrics?.host?.cpuPercent), " \xB7 Steal: ", percent(metrics?.host?.stealPercent), " \xB7 Fsync aral\u0131k ortalamas\u0131 / s\xFCre\xE7 boyunca en y\xFCksek: ", number(metrics?.host?.fsyncIntervalMeanMs, 3), " / ", number(metrics?.host?.fsyncLifetimeMaxMs, 3), " ms"),
      h2("p", { className: "lab-note" }, "Steal canl\u0131 VDS geneline, fsync ortak yaz\u0131c\u0131ya aittir; kanal ba\u015F\u0131na ba\u011F\u0131ms\u0131z fsync veya fsync p95 \xF6l\xE7\xFCm\xFC de\u011Fildir."),
      h2("h3", null, "Oyun ve test CPU toplamlar\u0131"),
      h2("div", { className: "lab-grid" }, ...[["game-runtime", "Oyun s\xFCre\xE7leri"], ["isolated-test-overhead", "Test ge\xE7idi \xB7 canl\u0131 VDS"], ["isolated-test-producer", "Bot \xFCreticisi \xB7 test VDS"]].map(([scope, label]) => {
        const row = cpuGroups.find((v2) => v2.scope === scope);
        return h2("div", { key: scope, className: "lab-banner" }, h2("div", null, label), h2("strong", { style: { fontSize: "24px", display: "block" } }, row?.complete ? number(row.cores, 2) : "\u2014", " \xE7ekirdek"), h2("small", null, row?.complete ? "Son \xF6l\xE7\xFClen aral\u0131k \xB7 " + stamp(row.observedAt) : "Tam toplam i\xE7in s\xFCre\xE7 \xF6l\xE7\xFCmleri bekleniyor"));
      })),
      h2("p", { className: "lab-note" }, "Bu \xFC\xE7 toplam ayr\u0131d\u0131r; host CPU ile toplanmaz. Oyun toplam\u0131na test ge\xE7idi veya ayr\u0131 VDS \xFCreticisi eklenmez. Oyun s\xFCre\xE7lerindeki bot sava\u015F/izolasyon i\u015Fi oyun toplam\u0131nda kal\u0131r."),
      h2("h3", null, "S\xFCre\xE7 CPU da\u011F\u0131l\u0131m\u0131"),
      table(["S\xFCre\xE7 / VDS", "CPU \xB7 1 \xE7ekirdek", "CPU \xB7 VDS", "RAM MiB", "Durum / yeniden ba\u015Flama"], (metrics?.processes ?? []).map((row) => [row.label + " / " + (row.host === "live" ? "Canl\u0131" : "Test"), percent(row.cpuPercentOfOneCore), percent(row.cpuPercentOfHost), typeof row.ramBytes === "number" ? number(row.ramBytes / 1048576) : "\u2014", ({ ready: "G\xFCncel", warming: "\u0130lk aral\u0131k bekleniyor", restarted: "Yeniden ba\u015Flad\u0131", unavailable: "\xD6l\xE7\xFCm yok", duplicate: "PID \xE7ak\u0131\u015Fmas\u0131" }[row.state] || "\xD6l\xE7\xFCm yok") + " / " + number(row.restartsObserved, 0)])),
      h2("p", { className: "lab-note" }, "CPU 100% bir \xE7ekirdektir; VDS y\xFCzdesi kullan\u0131labilir \xE7ekirde\u011Fe b\xF6l\xFCn\xFCr. Yeniden ba\u015Flama sayac\u0131 g\xF6zlenen PID/ba\u015Flang\u0131\xE7 kimli\u011Fi de\u011Fi\u015Fimidir; tek ba\u015F\u0131na \xE7\xF6kme kan\u0131t\u0131 de\u011Fildir. Rapor aktif test ve temizlik CPU zirvelerini ayr\u0131 zamanlar\u0131yla verir. \xDCretici/panel/i\u015F\xE7i threadleri tek s\xFCre\xE7te bir kez say\u0131l\u0131r. Eksik \xF6l\xE7\xFCmde CPU bo\u015F kal\u0131r. RSS toplamlar\u0131 ortak belle\u011Fi tekrar sayabilir."),
      h2("p", null, "Test VDS\u2019i CPU: ", percent(metrics?.generator?.cpuPercent), " \xB7 Bot zamanlama sapmas\u0131 p50 / p95 / en y\xFCksek: ", number(metrics?.generator?.schedulingDriftMs?.p50, 3), " / ", number(metrics?.generator?.schedulingDriftMs?.p95, 3), " / ", number(metrics?.generator?.schedulingDriftMs?.max, 3), " ms"),
      h2("p", { className: "lab-note" }, "Veriler bu b\xF6l\xFCm g\xF6r\xFCn\xFCrken yakla\u015F\u0131k 2 saniyede yenilenir. B\xF6l\xFCmden ayr\u0131l\u0131nca veya sekme gizlenince sorgulama durur."),
      h2("h3", null, "\u0130ndirilebilir raporlar"),
      button("Rapor listesini yenile", "reports", {}, !connected),
      !reports.length && h2("p", null, "Hen\xFCz rapor yok veya test VDS\u2019i ba\u011Fl\u0131 de\u011Fil."),
      ...reports.map((row) => h2("div", { key: row.id, className: "lab-report" }, h2("span", null, stamp(row.createdAt), " \xB7 ", number(row.botCount, 0), " bot \xB7 ", scenarios[row.scenario] || row.scenario || "Test", " \xB7 ", row.valid === true ? "Ge\xE7erli" : "Ge\xE7ersiz / tamamlanmad\u0131", row.cleanupConfirmed ? " \xB7 Temizlik do\u011Fruland\u0131" : " \xB7 Temizlik do\u011Frulanmad\u0131"), h2("div", { className: "lab-actions" }, ...["json", "txt"].map((format) => h2("button", { key: format, type: "button", disabled: !!download, onClick: () => void downloadReport(row.id, format) }, download === row.id + format ? "Haz\u0131rlan\u0131yor\u2026" : format === "json" ? "JSON indir" : "\xD6zeti indir"))))),
      h2("p", { className: "lab-note" }, "Rapor sava\u015F, hasar, \xF6d\xFCl haz\u0131rl\u0131\u011F\u0131 ve SQL ad\u0131mlar\u0131n\u0131; kal\u0131c\u0131 \xF6d\xFCl, g\xF6r\xFCn\xFCrl\xFCk ve kay\u0131t bak\u0131m\u0131ndan ger\xE7ek sald\u0131r\u0131dan farkl\u0131 kalan noktalar\u0131 listeler. Canl\u0131 taban: V477 \xB7 ", base.slice(0, 16))
    );
  };
}
function createGuildResetAdmin470(React) {
  const h2 = React.createElement;
  const warning = "T\xFCm loncalar kapat\u0131lacak. Sat\u0131n al\u0131nm\u0131\u015F \u015Fatolar, \u015Fato geli\u015Fimleri ve lonca kasalar\u0131 silinecek. Bu i\u015Flem geri al\u0131namaz. Loncalar\u0131 s\u0131f\u0131rlamak istiyor musun?";
  function GuildResetAdmin470({ busy, act }) {
    const [pending, setPending] = React.useState(false);
    const [message, setMessage] = React.useState("");
    const [error, setError] = React.useState("");
    const request = React.useRef(null), inFlight = React.useRef(false), mounted = React.useRef(true), latest = React.useRef({ busy, act });
    latest.current = { busy, act };
    React.useEffect(() => {
      mounted.current = true;
      return () => {
        mounted.current = false;
      };
    }, []);
    async function resetGuilds470() {
      if (inFlight.current || latest.current.busy) return;
      if (!globalThis.confirm(warning)) return;
      inFlight.current = true;
      setPending(true);
      setError("");
      setMessage("");
      try {
        if (!request.current) request.current = { requestId: globalThis.crypto.randomUUID() };
        const token = request.current;
        const result = await latest.current.act({ action: "reset_guilds", requestId: token.requestId, confirmation: "LONCALARI SIFIRLA" });
        const receipt = result?.guildReset;
        if (receipt?.ok === true && receipt.requestId === token.requestId) {
          request.current = null;
          if (mounted.current) setMessage(receipt.replayed ? "\xD6nceki lonca s\u0131f\u0131rlama i\u015Flemi do\u011Fruland\u0131." : "Loncalar ve sat\u0131n al\u0131nm\u0131\u015F \u015Fatolar s\u0131f\u0131rland\u0131.");
        } else if (mounted.current) setError("S\u0131f\u0131rlama sonucu do\u011Frulanamad\u0131. Tekrar denedi\u011Finde ayn\u0131 i\u015Flem kontrol edilir. Y\xF6netim bildirimini de kontrol et.");
      } catch (cause) {
        if (mounted.current) setError(cause?.message || "S\u0131f\u0131rlama sonucu do\u011Frulanamad\u0131. Tekrar denedi\u011Finde ayn\u0131 i\u015Flem kontrol edilir.");
      } finally {
        inFlight.current = false;
        if (mounted.current) setPending(false);
      }
    }
    return h2(
      "section",
      { className: "admin-card danger-card", "data-guild-reset470": "" },
      h2("div", { className: "admin-card-title" }, h2("div", null, h2("h2", null, "Loncalar\u0131 s\u0131f\u0131rla"), h2("p", null, "T\xFCm loncalar\u0131 kapat\u0131r; sat\u0131n al\u0131nm\u0131\u015F \u015Fatolar\u0131, \u015Fato geli\u015Fimlerini ve lonca kasalar\u0131n\u0131 siler."))),
      h2("button", { type: "button", disabled: !!busy || pending, onClick: resetGuilds470 }, pending ? "S\u0131f\u0131rlan\u0131yor\u2026" : "Loncalar\u0131 s\u0131f\u0131rla"),
      error && h2("p", { role: "alert" }, error),
      message && h2("p", { role: "status" }, message)
    );
  }
  return GuildResetAdmin470;
}
const colSpecialistSkills459 = (function createSpecialistSkills459() {
  const defaults = {
    arkanist_burst: { multiplier: 2.1, cooldownMs: 18e3 },
    arkanist_heal: { healPercent: 20, cooldownMs: 24e3 },
    avci_sharp: { multiplier: 2.2, cooldownMs: 18e3 },
    avci_trap: { multiplier: 1.5, rootMs: 1800, cooldownMs: 2e4 },
    muhafiz_tank: { healPercent: 12, guardPercent: 20, guardMs: 6e3, cooldownMs: 24e3 },
    muhafiz_strike: { multiplier: 2.2, cooldownMs: 18e3 }
  };
  const bounds = { multiplier: [0.1, 10], healPercent: [0, 30], guardPercent: [0, 75], guardMs: [0, 3e4], rootMs: [0, 2e3], cooldownMs: [1e3, 12e4] };
  const plain = (value) => !!value && typeof value === "object" && !Array.isArray(value);
  const freeze = (value) => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.freeze(value);
      for (const child of Object.values(value)) freeze(child);
    }
    return value;
  };
  freeze(defaults);
  freeze(bounds);
  function defaultConfig() {
    return { revision: 0, skills: Object.fromEntries(Object.entries(defaults).map(([id, values]) => [id, { ...values }])) };
  }
  function validate(input) {
    if (!plain(input) || !Number.isSafeInteger(input.revision) || input.revision < 0 || input.revision >= Number.MAX_SAFE_INTEGER || !plain(input.skills)) throw Error("Uzmanl\u0131k becerisi ayarlar\u0131 veya s\xFCr\xFCm\xFC ge\xE7ersiz.");
    if (Object.keys(input).some((k2) => !["revision", "skills"].includes(k2)) || Object.keys(input.skills).some((id) => !Object.hasOwn(defaults, id))) throw Error("Bilinmeyen uzmanl\u0131k becerisi veya ayar alan\u0131.");
    const skills = {};
    for (const [id, fields] of Object.entries(defaults)) {
      const row = input.skills[id];
      if (!plain(row) || Object.keys(row).some((k2) => !Object.hasOwn(fields, k2))) throw Error("Uzmanl\u0131k becerisi alanlar\u0131 ge\xE7ersiz: " + id);
      skills[id] = {};
      for (const key of Object.keys(fields)) {
        const n2 = row[key], [min, max] = bounds[key];
        if (typeof n2 !== "number" || !Number.isFinite(n2) || n2 < min || n2 > max || key.endsWith("Ms") && !Number.isSafeInteger(n2)) throw Error(id + ": " + key + " " + min + "\u2013" + max + " aras\u0131nda olmal\u0131.");
        skills[id][key] = n2;
      }
    }
    return { revision: input.revision, skills };
  }
  const cache = /* @__PURE__ */ new Map();
  let parses = 0;
  function record(raw) {
    const key = typeof raw === "string" ? raw : "";
    let hit = cache.get(key);
    if (hit) {
      cache.delete(key);
      cache.set(key, hit);
      return hit;
    }
    let config;
    try {
      const value = key ? JSON.parse(key) : null;
      config = value?.specialistSkills459 === void 0 ? defaultConfig() : validate(value.specialistSkills459);
    } catch {
      config = defaultConfig();
    }
    parses++;
    hit = { config: freeze(config), branches: /* @__PURE__ */ new Map() };
    cache.set(key, hit);
    if (cache.size > 8) cache.delete(cache.keys().next().value);
    return hit;
  }
  function read(raw) {
    return record(raw).config;
  }
  function configure(branch, settings) {
    if (!branch) return null;
    if (settings === void 0) return branch;
    const entry = record(typeof settings === "string" ? settings : settings?.events_json), row = entry.config.skills[branch.id];
    if (!row) return branch;
    if (!entry.branches.has(branch.id)) entry.branches.set(branch.id, freeze({
      ...branch,
      ...row.multiplier !== void 0 ? { multiplier: row.multiplier } : {},
      ...row.healPercent !== void 0 ? { heal: row.healPercent / 100 } : {},
      ...row.guardPercent !== void 0 ? { guard: row.guardPercent / 100 } : {},
      ...row.guardMs !== void 0 ? { guardMs: row.guardMs } : {},
      ...row.rootMs !== void 0 ? { rootMs: row.rootMs } : {},
      cooldown: row.cooldownMs
    }));
    return entry.branches.get(branch.id);
  }
  return { defaults, bounds, defaultConfig, validate, read, configure, diagnostics: () => ({ cacheSize: cache.size, parses }) };
})();
const colEventsModel456 = /* @__PURE__ */ (() => {
  const EVENT_KINDS = ["loot", "xp", "essence", "chest", "moonlight", "fishing", "halloween"];
  const EVENT_LABELS = { loot: "Ganimet Bereketi", xp: "Tecr\xFCbe Bereketi", essence: "\xD6z Bereketi", chest: "Kristal Sand\u0131\u011F\u0131", moonlight: "Ay\u0131\u015F\u0131\u011F\u0131 Sand\u0131\u011F\u0131", fishing: "Bal\u0131k\xE7\u0131l\u0131k Etkinli\u011Fi", halloween: "Cad\u0131lar Bayram\u0131" };
  const CHEST_PRIZES = [
    { id: "pearl", label: "Beyaz \u0130nci", weight: 2 },
    { id: "potion", label: "K\u0131rm\u0131z\u0131 \u0130ksir", weight: 20 },
    { id: "weapon", label: "Turuncu Silah", weight: 1 },
    { id: "armor", label: "Turuncu Z\u0131rh", weight: 1 },
    { id: "essence5", label: "5 \xD6z", weight: 20 },
    { id: "essence8", label: "8 \xD6z", weight: 15 },
    { id: "essence10", label: "10 \xD6z", weight: 15 },
    { id: "essence15", label: "15 \xD6z", weight: 10 },
    { id: "essence20", label: "20 \xD6z", weight: 6 },
    { id: "sokan", label: "Sokan Bal\u0131\u011F\u0131", weight: 10 },
    { id: "fifth_enchant", label: "Be\u015Finci Efsun Nesnesi", weight: 0.1 },
    { id: "red_pearl", label: "K\u0131rm\u0131z\u0131 \u0130nci", weight: 0.1 }
  ];
  const MOONLIGHT_PRIZES = [
    { id: "essence20", label: "20 Ya\u015Fam \xD6z\xFC", weight: 30 },
    { id: "potions5", label: "5 K\u0131rm\u0131z\u0131 \u0130ksir", weight: 25 },
    { id: "dust5", label: "5 Ta\u015F Tozu", weight: 20 },
    { id: "gems20", label: "20 M\xFCcevher", weight: 15 },
    { id: "wing", label: "Kanat Par\xE7as\u0131", weight: 1 },
    { id: "pearl", label: "Beyaz \u0130nci", weight: 2 },
    { id: "dragon", label: "Ejderha Par\xE7as\u0131", weight: 0.6 },
    { id: "necklace", label: "K\u0131rm\u0131z\u0131 Kolye \xB7 rastgele efsun", weight: 1 },
    { id: "attack_stone", label: "Sald\u0131r\u0131 G\xFCc\xFC Ta\u015F\u0131", weight: 1 },
    { id: "evolution_scroll", label: "Evrim Par\u015F\xF6meni", weight: 1 },
    { id: "fifth_enchant", label: "Be\u015Finci Efsun Nesnesi", weight: 0.05 },
    { id: "red_pearl", label: "K\u0131rm\u0131z\u0131 \u0130nci", weight: 0.05 }
  ];
  const FISHING_EVENT_PRIZES = [
    { id: "enchant_scroll", label: "Efsun De\u011Fi\u015Ftirme Nesnesi", weight: 50, image: "/game/enchant-change.webp" },
    { id: "enchant_add", label: "Efsun Art\u0131rma Nesnesi", weight: 30, image: "/game/enchant-add-v262.webp" },
    { id: "afk_ticket", label: "Oto Av Bileti \xB7 +2 saat", weight: 15, image: "/game/afk-ticket-v350.webp" },
    { id: "auto_potion", label: "Oto K\u0131rm\u0131z\u0131 \u0130ksir", weight: 5, image: "/game/auto-red-potion.webp" }
  ];
  function defaultEvents() {
    return { version: 1, events: Object.fromEntries(EVENT_KINDS.map((kind) => [kind, { enabled: false, start: 0, end: 0, percent: kind === "chest" ? 2 : kind === "moonlight" || kind === "fishing" || kind === "halloween" ? 1 : 20, runId: "" }])), weights: Object.fromEntries(CHEST_PRIZES.map((p2) => [p2.id, p2.weight])), moonlightWeights: Object.fromEntries(MOONLIGHT_PRIZES.map((p2) => [p2.id, p2.weight])), fishingWeights: Object.fromEntries(FISHING_EVENT_PRIZES.map((p2) => [p2.id, p2.weight])), halloweenWeights: Object.fromEntries(MOONLIGHT_PRIZES.map((p2) => [p2.id, p2.weight])), halloweenWandChance: 20, fishingRedPearlChance460: 5, fishingCatchWeights482: defaultFishingCatch482(), specialistSkills459: colSpecialistSkills459.defaultConfig() };
  }
  function validateEvents(input) {
    if (!input || typeof input !== "object") throw new Error("Etkinlik ayarlar\u0131 ge\xE7ersiz.");
    const config = defaultEvents();
    for (const kind of EVENT_KINDS) {
      const e2 = (kind === "moonlight" || kind === "fishing" || kind === "halloween") && !input.events?.[kind] ? config.events[kind] : input.events?.[kind];
      if (!e2 || typeof e2.enabled !== "boolean" || !Number.isFinite(e2.percent) || e2.percent < 0 || e2.percent > (kind === "chest" || kind === "moonlight" || kind === "fishing" || kind === "halloween" ? 100 : 500) || !Number.isSafeInteger(e2.start) || !Number.isSafeInteger(e2.end) || e2.start < 0 || e2.end < 0 || e2.end > 4102444800 || (e2.enabled || e2.start || e2.end) && !(e2.start > 0 && e2.end > e2.start)) throw new Error(`${EVENT_LABELS[kind]}: oran\u0131 ve ba\u015Flang\u0131\xE7/biti\u015F saatini kontrol et.`);
      config.events[kind] = { enabled: e2.enabled, start: e2.start, end: e2.end, percent: e2.percent, runId: typeof e2.runId === "string" ? e2.runId.slice(0, 80) : "" };
      config.events[kind].schedule499 = colEventNormalize499(kind, e2.schedule499, config.events[kind]);
    }
    for (const prize of CHEST_PRIZES) {
      const w2 = input.weights?.[prize.id] ?? (prize.id === "fifth_enchant" || prize.id === "red_pearl" ? prize.weight : void 0);
      if (!Number.isFinite(w2) || w2 < 0 || w2 > 1e5) throw new Error("Sand\u0131k a\u011F\u0131rl\u0131klar\u0131 0\u2013100000 aras\u0131nda olmal\u0131.");
      config.weights[prize.id] = w2;
    }
    if (Object.values(config.weights).reduce((a2, b2) => a2 + b2, 0) <= 0) throw new Error("Sand\u0131kta en az bir \xF6d\xFCl a\xE7\u0131k olmal\u0131.");
    for (const prize of MOONLIGHT_PRIZES) {
      const w2 = input.moonlightWeights?.[prize.id] ?? (input.moonlightWeights === void 0 || prize.id === "red_pearl" ? prize.weight : void 0);
      if (!Number.isFinite(w2) || w2 < 0 || w2 > 1e5) throw new Error("Ay\u0131\u015F\u0131\u011F\u0131 Sand\u0131\u011F\u0131 a\u011F\u0131rl\u0131klar\u0131 0\u2013100000 aras\u0131nda olmal\u0131.");
      config.moonlightWeights[prize.id] = w2;
    }
    if (Object.values(config.moonlightWeights).reduce((a2, b2) => a2 + b2, 0) <= 0) throw new Error("Ay\u0131\u015F\u0131\u011F\u0131 Sand\u0131\u011F\u0131nda en az bir \xF6d\xFCl a\xE7\u0131k olmal\u0131.");
    for (const prize of FISHING_EVENT_PRIZES) {
      const w2 = input.fishingWeights?.[prize.id] ?? (input.fishingWeights === void 0 ? prize.weight : void 0);
      if (!Number.isFinite(w2) || w2 < 0 || w2 > 1e5) throw new Error("Bal\u0131k\xE7\u0131l\u0131k \xF6d\xFCl a\u011F\u0131rl\u0131klar\u0131 0\u2013100000 aras\u0131nda olmal\u0131.");
      config.fishingWeights[prize.id] = w2;
    }
    if (Object.values(config.fishingWeights).reduce((a2, b2) => a2 + b2, 0) <= 0) throw new Error("Bal\u0131k\xE7\u0131l\u0131k etkinli\u011Finde en az bir \xF6d\xFCl a\xE7\u0131k olmal\u0131.");
    for (const prize of MOONLIGHT_PRIZES) {
      const w2 = input.halloweenWeights?.[prize.id] ?? (input.halloweenWeights === void 0 ? config.moonlightWeights[prize.id] : prize.id === "red_pearl" ? prize.weight : void 0);
      if (!Number.isFinite(w2) || w2 < 0 || w2 > 1e5) throw new Error("Bal Kaba\u011F\u0131 a\u011F\u0131rl\u0131klar\u0131 0\u2013100000 aras\u0131nda olmal\u0131.");
      config.halloweenWeights[prize.id] = w2;
    }
    if (Object.values(config.halloweenWeights).reduce((a2, b2) => a2 + b2, 0) <= 0) throw new Error("Bal Kaba\u011F\u0131nda en az bir \xF6d\xFCl a\xE7\u0131k olmal\u0131.");
    const wand = input.halloweenWandChance ?? 20;
    if (!Number.isFinite(wand) || wand < 0 || wand > 100) throw new Error("Cad\u0131 de\u011Fne\u011Fi \u015Fans\u0131 0\u2013100 aras\u0131nda olmal\u0131.");
    config.halloweenWandChance = wand;
    const red = input.fishingRedPearlChance460 ?? 5;
    if (typeof red !== "number" || !Number.isFinite(red) || red < 0 || red > 100 || Math.abs(red * 100 - Math.round(red * 100)) > 1e-6) throw new Error("K\u0131rm\u0131z\u0131 inci \u015Fans\u0131 0\u2013100 aras\u0131nda, en fazla iki ondal\u0131kl\u0131 olmal\u0131.");
    config.fishingRedPearlChance460 = red;
    config.fishingCatchWeights482 = validateFishingCatch482(input.fishingCatchWeights482 ?? defaultFishingCatch482());
    config.specialistSkills459 = colSpecialistSkills459.validate(input.specialistSkills459 ?? colSpecialistSkills459.defaultConfig());
    return config;
  }
  function parseEvents(raw) {
    try {
      return validateEvents(typeof raw === "string" ? JSON.parse(raw) : raw);
    } catch {
      return defaultEvents();
    }
  }
  let cachedEventsRaw, cachedEventsConfig;
  const deepFreeze = (value) => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.freeze(value);
      for (const child of Object.values(value)) deepFreeze(child);
    }
    return value;
  };
  function readEventsConfig(raw) {
    if (typeof raw !== "string") return parseEvents(raw);
    if (raw !== cachedEventsRaw) {
      cachedEventsConfig = deepFreeze(parseEvents(raw));
      cachedEventsRaw = raw;
    }
    return cachedEventsConfig;
  }
  function eventActive(event, now = Date.now() / 1e3) {
    return !!event?.enabled && now >= event.start && now < event.end;
  }
  function eventBonus(config, kind, now = Date.now() / 1e3) {
    const e2 = config.events[kind];
    return eventActive(e2, now) ? e2.percent : 0;
  }
  function bonusAmount(amount, percent, random = Math.random) {
    const value = Math.max(0, amount) * (1 + Math.max(0, percent) / 100), base = Math.floor(value);
    return base + (random() < value - base ? 1 : 0);
  }
  function pickChestPrize(config, random = Math.random) {
    const total = CHEST_PRIZES.reduce((n2, p2) => n2 + config.weights[p2.id], 0);
    let roll = Math.max(0, Math.min(1 - Number.EPSILON, random())) * total;
    for (const p2 of CHEST_PRIZES) {
      roll -= config.weights[p2.id];
      if (roll < 0) return p2;
    }
    return CHEST_PRIZES.findLast((p2) => config.weights[p2.id] > 0);
  }
  function pickMoonlightPrize(config, random = Math.random) {
    const total = MOONLIGHT_PRIZES.reduce((n2, p2) => n2 + config.moonlightWeights[p2.id], 0);
    let roll = Math.max(0, Math.min(1 - Number.EPSILON, random())) * total;
    for (const p2 of MOONLIGHT_PRIZES) {
      roll -= config.moonlightWeights[p2.id];
      if (roll < 0) return p2;
    }
    return MOONLIGHT_PRIZES.findLast((p2) => config.moonlightWeights[p2.id] > 0);
  }
  function eventRemaining(seconds) {
    const n2 = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(n2 / 86400)}g ${String(Math.floor(n2 / 3600) % 24).padStart(2, "0")}:${String(Math.floor(n2 / 60) % 60).padStart(2, "0")}:${String(n2 % 60).padStart(2, "0")}`;
  }
  function rollFishingEventReward(config, now = Date.now() / 1e3, random = Math.random) {
    const chance = eventBonus(config, "fishing", now);
    if (chance <= 0 || random() * 100 >= chance) return null;
    const total = FISHING_EVENT_PRIZES.reduce((sum, p2) => sum + config.fishingWeights[p2.id], 0);
    let roll = Math.max(0, Math.min(1 - Number.EPSILON, random())) * total;
    for (const prize of FISHING_EVENT_PRIZES) {
      roll -= config.fishingWeights[prize.id];
      if (roll < 0) return prize;
    }
    return null;
  }
  function pickHalloweenPrize(config, random = Math.random) {
    return pickMoonlightPrize({ moonlightWeights: config.halloweenWeights }, random);
  }
  return { EVENT_KINDS, EVENT_LABELS, CHEST_PRIZES, MOONLIGHT_PRIZES, FISHING_EVENT_PRIZES, defaultEvents, validateEvents, parseEvents, readEventsConfig, eventActive, eventBonus, eventRemaining, pickHalloweenPrize };
})();
const colHalloweenAdminFactory456 = function createEventsAdmin456(React, model) {
  const h2 = React.createElement, localDate = colEventDateInput499;
  function Panel({ raw, busy, act, serverTime }) {
    const [draft, setDraft] = React.useState(() => model.parseEvents(raw)), [plans499, setPlans499] = React.useState({}), [modes, setModes] = React.useState({}), [durations, setDurations] = React.useState({}), [error, setError] = React.useState(""), [now, setNow] = React.useState(serverTime);
    React.useEffect(() => setDraft(model.parseEvents(raw)), [raw]);
    React.useEffect(() => {
      const start2 = performance.now();
      setNow(serverTime);
      const timer = setInterval(() => setNow(serverTime + (performance.now() - start2) / 1e3), 1e3);
      return () => clearInterval(timer);
    }, [serverTime]);
    const edit = (kind, key, value) => key === "start" || key === "end" ? setPlans499((d2) => ({ ...d2, [kind]: { ...d2[kind] ?? { start: 0, end: 0 }, [key]: value } })) : setDraft((d2) => ({ ...d2, events: { ...d2.events, [kind]: { ...d2.events[kind], [key]: value } } }));
    const numeric = (label, value, change, max = 1e5, step = 0.01) => h2("label", null, label, h2("input", { type: "number", min: 0, max, step, value: Number.isNaN(value) ? "" : value, onChange: (e2) => change(e2.target.value === "" ? NaN : Number(e2.target.value)) }));
    const start = async (kind) => {
      try {
        setError("");
        const e2 = { ...draft.events[kind], ...plans499[kind] ?? { start: 0, end: 0 } }, mode = modes[kind] ?? "schedule";
        let body;
        if (mode === "schedule") {
          if (!Number.isSafeInteger(e2.start) || !Number.isSafeInteger(e2.end) || e2.start <= 0 || e2.end <= e2.start) throw Error("Ba\u015Flang\u0131\xE7 ve biti\u015F tarihini se\xE7. Biti\u015F, ba\u015Flang\u0131\xE7tan sonra olmal\u0131.");
          body = { action: "event_schedule", eventKind: kind, eventStart: e2.start, eventEnd: e2.end, percent: e2.percent, expectedEvents: raw };
        } else {
          const duration = durations[kind] ?? { hours: 1, minutes: 0 }, seconds = (duration.hours * 60 + duration.minutes) * 60;
          if (!Number.isSafeInteger(duration.hours) || !Number.isSafeInteger(duration.minutes) || duration.hours < 0 || duration.minutes < 0 || duration.minutes > 59 || !Number.isSafeInteger(seconds) || seconds < 60 || seconds > 31536e3) throw Error("S\xFCre 1 dakika ile 365 g\xFCn aras\u0131nda olmal\u0131. Dakika alan\u0131na 0\u201359 yaz.");
          body = { action: "event_start", eventKind: kind, percent: e2.percent, durationSeconds: seconds, expectedEvents: raw };
        }
        await act(body);
      } catch (e2) {
        setError(e2.message ?? "Etkinlik ba\u015Flat\u0131lamad\u0131.");
      }
    };
    const liveConfig499 = model.parseEvents(raw);
    const cards = model.EVENT_KINDS.map((kind) => {
      const e2 = { ...draft.events[kind], ...plans499[kind] ?? { start: 0, end: 0 } }, live = colEventDisplay499(liveConfig499.events[kind], now), mode = modes[kind] ?? "schedule", duration = durations[kind] ?? { hours: 1, minutes: 0 }, isDrop = ["chest", "moonlight", "halloween", "fishing"].includes(kind);
      return h2("article", { key: kind }, h2("h3", null, model.EVENT_LABELS[kind]), h2("p", null, model.eventActive(live, now) ? "Aktif \xB7 " + model.eventRemaining(live.end - now) : live.enabled && now < live.start ? "Ba\u015Flamas\u0131na " + model.eventRemaining(live.start - now) : "Kapal\u0131 / sona erdi"), numeric(kind === "halloween" ? "Bal Kaba\u011F\u0131 d\xFC\u015Fme \u015Fans\u0131 (%)" : kind === "fishing" ? "Av ba\u015F\u0131na ek \xF6d\xFCl \u015Fans\u0131 (%)" : isDrop ? "Sand\u0131k d\xFC\u015Fme \u015Fans\u0131 (%)" : "Ek kazan\xE7 (%)", e2.percent, (n2) => edit(kind, "percent", n2), isDrop ? 100 : 500, 0.1), h2("label", null, "Ba\u015Flatma \u015Fekli", h2("select", { value: mode, onChange: (e3) => setModes((d2) => ({ ...d2, [kind]: e3.target.value })) }, h2("option", { value: "schedule" }, "Se\xE7ti\u011Fim tarihte ba\u015Flat"), h2("option", { value: "now" }, "Hemen ba\u015Flat \u2014 s\xFCre belirle"))), mode === "schedule" ? h2(React.Fragment, null, h2("label", null, "Ba\u015Flang\u0131\xE7", h2("input", { type: "datetime-local", value: localDate(e2.start), onChange: (v2) => edit(kind, "start", colEventDateParse499(v2.target.value)) })), h2("label", null, "Biti\u015F", h2("input", { type: "datetime-local", value: localDate(e2.end), onChange: (v2) => edit(kind, "end", colEventDateParse499(v2.target.value)) }))) : h2("div", { className: "event-duration-fields" }, numeric("Saat", duration.hours, (n2) => setDurations((d2) => ({ ...d2, [kind]: { ...duration, hours: n2 } })), 8760, 1), numeric("Dakika", duration.minutes, (n2) => setDurations((d2) => ({ ...d2, [kind]: { ...duration, minutes: n2 } })), 59, 1)), h2("div", { className: "event-admin-actions" }, h2("button", { disabled: busy, onClick: () => void start(kind) }, mode === "schedule" ? "Takvime ekle" : "Belirledi\u011Fim s\xFCreyle \u015Fimdi ba\u015Flat"), h2("button", { disabled: busy, onClick: () => void act({ action: "event_stop", eventKind: kind, expectedEvents: raw }) }, "Durdur")));
    });
    const weights = (title, list, key, description, fishing = false) => {
      const total = Object.values(draft[key]).reduce((a2, b2) => a2 + b2, 0);
      return h2(React.Fragment, { key }, h2("h3", null, title), h2("p", null, description), h2("div", { className: "event-prize-grid" }, ...list.map((p2) => h2("label", { key: p2.id }, p2.label, h2("input", { type: "number", min: 0, max: 1e5, step: 0.01, value: draft[key][p2.id], onChange: (e2) => setDraft((d2) => ({ ...d2, [key]: { ...d2[key], [p2.id]: Number(e2.target.value) } })) }), h2("small", null, (fishing ? "Av ba\u015F\u0131na %" : "%") + (total > 0 ? draft[key][p2.id] / total * (fishing ? draft.events.fishing.percent : 100) : 0).toFixed(3))))));
    };
    return h2("section", { className: "admin-card events-admin" }, h2("h2", null, "Etkinlikler"), h2("p", null, "Birden fazla etkinli\u011Fi \xF6nceden planlayabilirsin. Ba\u015Flang\u0131\xE7 ve biti\u015F otomatik uygulan\u0131r; panelin a\xE7\u0131k kalmas\u0131 gerekmez. Tarihler T\xFCrkiye saatindedir (UTC+3)."), error && h2("p", { role: "alert" }, error), h2("div", { className: "event-admin-grid" }, ...cards), colEventAdminRows499(React, liveConfig499, now, model.EVENT_LABELS, busy, act, raw, setError), h2("p", null, "Takvime ekle yaln\u0131z se\xE7ilen yeni plan\u0131 kaydeder; mevcut etkinlikler korunur. \u0130\xE7erik oranlar\u0131n\u0131 de\u011Fi\u015Ftirdikten sonra a\u015Fa\u011F\u0131daki kaydet d\xFC\u011Fmesine bas. Planlar\u0131n oranlar\u0131 eklendikleri haliyle korunur."), weights("Bal\u0131k\xE7\u0131l\u0131k Etkinli\u011Fi \xB7 \xD6d\xFCl oranlar\u0131", model.FISHING_EVENT_PRIZES, "fishingWeights", "Ba\u015Far\u0131l\u0131 her av, normal \xF6d\xFCle ek olarak en fazla bir etkinlik \xF6d\xFCl\xFC verir. Bereketli yem bunu \xE7o\u011Faltmaz.", true), weights("Kristal Sand\u0131\u011F\u0131 \xB7 \u0130\xE7erik oranlar\u0131", model.CHEST_PRIZES, "weights", "Her sand\u0131ktan bir \xF6d\xFCl \xE7\u0131kar. A\u011F\u0131rl\u0131k 0 \xF6d\xFCl\xFC kapat\u0131r. Sand\u0131klar etkinlik bittikten sonra da a\xE7\u0131l\u0131r."), weights("Ay\u0131\u015F\u0131\u011F\u0131 Sand\u0131\u011F\u0131 \xB7 \u0130\xE7erik oranlar\u0131", model.MOONLIGHT_PRIZES, "moonlightWeights", "Her sand\u0131ktan bir \xF6d\xFCl \xE7\u0131kar. Kanat ve Ejderha par\xE7alar\u0131 mevcut malzemelerle birle\u015Fir."), weights("Cad\u0131lar Bayram\u0131 \xB7 Bal Kaba\u011F\u0131 i\xE7eri\u011Fi", model.MOONLIGHT_PRIZES, "halloweenWeights", "\u0130lk i\xE7erik Ay\u0131\u015F\u0131\u011F\u0131 Sand\u0131\u011F\u0131ndan al\u0131n\u0131r; buradaki de\u011Fi\u015Fiklikler Ay\u0131\u015F\u0131\u011F\u0131n\u0131 de\u011Fi\u015Ftirmez. Her Bal Kaba\u011F\u0131ndan bir \xF6d\xFCl ve ayr\u0131ca a\u015Fa\u011F\u0131daki \u015Fansla Cad\u0131n\u0131n Sihirli De\u011Fne\u011Fi \xE7\u0131kar."), numeric("Ek Cad\u0131 de\u011Fne\u011Fi \u015Fans\u0131 (%)", draft.halloweenWandChance, (n2) => setDraft((d2) => ({ ...d2, halloweenWandChance: n2 })), 100, 0.1), h2("p", null, "50 Cad\u0131 de\u011Fne\u011Fi \u2192 1 Cad\u0131 \u015Eekeri. \u015Eeker 3 saat %25 tecr\xFCbe verir. Cad\u0131 yaln\u0131z etkinlik a\xE7\u0131kken Pazar K\xF6y\xFCne gelir; kazan\u0131lm\u0131\u015F e\u015Fyalar etkinlik sonunda kaybolmaz."), h2("button", { disabled: busy, onClick: () => void act({ action: "save_events", events: draft, expectedEvents: raw }) }, "\xD6d\xFCl oranlar\u0131n\u0131 kaydet"));
  }
  return { Panel };
};
let colHalloweenAdmin456;
var colAffixValues454 = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var enchantment_tiers_exports = {};
  __export(enchantment_tiers_exports, {
    ENCHANT_TIERS: () => ENCHANT_TIERS,
    ENCHANT_TIER_DEFAULTS: () => ENCHANT_TIER_DEFAULTS,
    ENCHANT_TIER_KEYS: () => ENCHANT_TIER_KEYS,
    TIER_SUFFIXES: () => TIER_SUFFIXES,
    enchantTierValues: () => enchantTierValues,
    rollEnchantmentValue: () => rollEnchantmentValue,
    tierKeys: () => tierKeys,
    validateEnchantmentTiers: () => validateEnchantmentTiers
  });
  var ENCHANT_TIERS = [
    ["forest_power", "Kuzey Orman\u0131 g\xFCc\xFC", [2, 4, 8, 10], 10],
    ["frozen_power", "Donmu\u015F \xC7am g\xFCc\xFC", [2, 4, 8, 10], 10],
    ["fire", "Ate\u015F", [2, 4, 8, 10], 80],
    ["ice", "Buz", [2, 4, 8, 10], 80],
    ["sword_defense", "K\u0131l\u0131\xE7 savunmas\u0131", [2, 4, 9, 12], 80],
    ["arrow_defense", "Ok savunmas\u0131", [2, 4, 9, 12], 80],
    ["magic_defense", "B\xFCy\xFC savunmas\u0131", [2, 4, 9, 12], 80],
    ["strong_players", "Oyunculara kar\u015F\u0131 g\xFC\xE7", [2, 4, 8, 10], 80],
    ["resistant_players", "Oyunculara kar\u015F\u0131 savunma", [2, 4, 9, 12], 80],
    ["critical", "Kritik \u015Fans\u0131", [1, 2, 4, 6], 80],
    ["attack_speed", "Sald\u0131r\u0131 h\u0131z\u0131", [2, 4, 8, 10], 80],
    ["cast_speed", "B\xFCy\xFC H\u0131z\u0131", [4, 8, 16, 20], 50],
    ["life_steal", "Can \xE7alma", [3, 6, 12, 15], 15],
    ["attack_block", "Sald\u0131r\u0131 bloklama", [3, 6, 12, 15], 15],
    ["hp", "Azami can", [60, 120, 240, 300], 1e6]
  ];
  var TIER_SUFFIXES = ["one", "two", "four", "five"];
  var tierKeys = (kind) => TIER_SUFFIXES.map((suffix) => `enchant_${kind}_tier_${suffix}`);
  var ENCHANT_TIER_DEFAULTS = Object.fromEntries(ENCHANT_TIERS.flatMap(([kind, , values]) => tierKeys(kind).map((key, i2) => [key, values[i2]])));
  var ENCHANT_TIER_KEYS = Object.keys(ENCHANT_TIER_DEFAULTS);
  function enchantTierValues(settings, kind) {
    const definition = ENCHANT_TIERS.find((d2) => d2[0] === kind);
    if (!definition) throw new Error("Ge\xE7ersiz efsun t\xFCr\xFC.");
    const valid = (value) => Number.isSafeInteger(value) && value >= 1 && value <= definition[3];
    const keys = tierKeys(kind), legacyKey = `enchant_${kind}_tier_three`;
    if (settings?.[keys[2]] == null && settings?.[keys[3]] == null && settings?.[legacyKey] != null) {
      const oldMax = Number(settings[legacyKey]);
      const top = valid(oldMax) ? oldMax : definition[2][3];
      const oldMin = Number(settings[keys[0]] ?? Math.min(definition[2][0], top));
      const low = valid(oldMin) && oldMin <= top ? oldMin : Math.min(definition[2][0], top);
      return Array.from({ length: 4 }, (_2, i2) => low + Math.floor((top - low) * i2 / 3));
    }
    return keys.map((key, i2) => {
      const value = Number(settings?.[key] ?? definition[2][i2]);
      return valid(value) ? value : definition[2][i2];
    });
  }
  function rollEnchantmentValue(settings, kind, random = Math.random) {
    const roll = Number(random());
    return enchantTierValues(settings, kind)[Number.isFinite(roll) ? Math.min(3, Math.max(0, Math.floor(roll * 4))) : 0];
  }
  function validateEnchantmentTiers(input, current) {
    const result = {};
    for (const [kind, label, , max] of ENCHANT_TIERS) {
      const keys = tierKeys(kind);
      if (!keys.some((key) => Object.hasOwn(input, key))) continue;
      const previous = enchantTierValues(current, kind);
      const values = keys.map((key, i2) => Object.hasOwn(input, key) ? Number(input[key]) : previous[i2]);
      const legacyUnchanged = previous[3] - previous[0] < 3 && previous.every((value, i2) => value === values[i2] && (!i2 || previous[i2 - 1] <= value));
      if (values.some((v2) => !Number.isSafeInteger(v2) || v2 < 1 || v2 > max) || !legacyUnchanged && !values.every((value, i2) => !i2 || values[i2 - 1] < value))
        throw new Error(`${label}: d\xF6rt farkl\u0131 tam say\u0131 k\xFC\xE7\xFCkten b\xFCy\xFC\u011Fe, 1\u2013${max} aras\u0131nda olmal\u0131; 4. kademe en y\xFCksek de\u011Ferdir.`);
      keys.forEach((key, i2) => {
        result[key] = values[i2];
      });
    }
    return result;
  }
  return __toCommonJS(enchantment_tiers_exports);
})();
function colAffixAdminFieldValue454(settings, key) {
  const match = /^enchant_([a-z_]+)_tier_(one|two|four|five)$/.exec(key);
  if (!match) return settings?.[key] ?? "";
  const keys = colAffixValues454.tierKeys(match[1]), legacy = settings?.[keys[2]] == null && settings?.[keys[3]] == null && settings?.["enchant_" + match[1] + "_tier_three"] != null;
  if (!legacy && settings?.[key] != null) return settings[key];
  return colAffixValues454.enchantTierValues(settings, match[1])[keys.indexOf(key)];
}
var colSeasonalEditorModule453 = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var seasonal_editor453_exports = {};
  __export(seasonal_editor453_exports, {
    createSeasonalEditor453: () => createSeasonalEditor453
  });
  var winter = {
    bazaar: { props: [[1, 0.26, 0.26, 250], [0, 0.22, 0.32, 120], [3, 0.83, 0.37, 160], [2, 0.13, 0.48, 165], [2, 0.88, 0.61, 165], [4, 0.39, 0.135, 75, true], [4, 0.81, 0.18, 85, true], [5, 0.74, 0.79, 180], [0, 0.29, 0.78, 100]], lights: [[0.15, 0.18, 0.3, 0.13, 0.025], [0.36, 0.09, 0.59, 0.09, 0.035], [0.79, 0.14, 0.94, 0.27, 0.045], [0.09, 0.63, 0.15, 0.8, 0.025], [0.69, 0.91, 0.85, 0.83, 0.025]] },
    forest: { props: [[1, 0.37, 0.32, 270], [0, 0.35, 0.35, 130], [2, 0.19, 0.52, 185], [5, 0.65, 0.59, 190], [1, 0.73, 0.31, 230], [4, 0.22, 0.19, 100, true], [4, 0.62, 0.29, 115, true], [2, 0.39, 0.74, 185], [1, 0.62, 0.84, 245], [0, 0.65, 0.85, 125], [2, 0.82, 0.68, 180]], lights: [[0.26, 0.14, 0.37, 0.17, 0.025], [0.31, 0.37, 0.39, 0.34, 0.02], [0.61, 0.19, 0.68, 0.23, 0.025], [0.65, 0.62, 0.74, 0.64, 0.025], [0.38, 0.81, 0.46, 0.85, 0.02]] },
    frozen: { props: [[5, 0.34, 0.33, 245], [1, 0.57, 0.29, 280], [0, 0.59, 0.32, 135], [2, 0.32, 0.63, 190], [1, 0.68, 0.66, 290], [4, 0.55, 0.19, 120, true], [5, 0.81, 0.56, 230], [0, 0.19, 0.45, 130], [2, 0.42, 0.85, 200], [1, 0.24, 0.78, 240]], lights: [[0.12, 0.38, 0.23, 0.39, 0.018], [0.43, 0.14, 0.5, 0.14, 0.025], [0.53, 0.3, 0.59, 0.32, 0.02], [0.73, 0.6, 0.79, 0.64, 0.024], [0.33, 0.76, 0.39, 0.8, 0.02]] },
    black: { props: [[2, 0.16, 0.21, 200], [4, 0.47, 0.1, 120, true], [0, 0.22, 0.72, 155], [3, 0.83, 0.65, 200], [2, 0.8, 0.2, 200], [1, 0.34, 0.87, 235], [5, 0.69, 0.82, 230], [4, 0.89, 0.49, 100, true]], lights: [[0.09, 0.16, 0.21, 0.13, 0.026], [0.44, 0.065, 0.56, 0.065, 0.027], [0.79, 0.15, 0.91, 0.24, 0.02], [0.79, 0.77, 0.87, 0.71, 0.02]] },
    fishing: { props: [[1, 0.24, 0.22, 160], [0, 0.19, 0.26, 85], [2, 0.1, 0.51, 150], [2, 0.9, 0.56, 150], [5, 0.3, 0.87, 150], [4, 0.77, 0.18, 85, true], [0, 0.71, 0.88, 85]], lights: [[0.1, 0.38, 0.15, 0.29, 0.018], [0.82, 0.29, 0.9, 0.4, 0.02], [0.29, 0.9, 0.39, 0.94, 0.015]] },
    sanctum: { props: [[1, 0.33, 0.25, 170], [5, 0.67, 0.27, 150], [2, 0.24, 0.49, 155], [2, 0.77, 0.51, 155], [4, 0.45, 0.15, 65, true], [4, 0.57, 0.16, 65, true], [0, 0.33, 0.68, 85], [0, 0.67, 0.67, 85]], lights: [[0.31, 0.25, 0.38, 0.19, 0.012], [0.62, 0.19, 0.7, 0.25, 0.012], [0.3, 0.66, 0.35, 0.71, 0.01]] },
    sinsi: { props: [[1, 0.29, 0.23, 165], [0, 0.31, 0.26, 85], [5, 0.7, 0.24, 155], [2, 0.22, 0.49, 130], [2, 0.76, 0.51, 130], [1, 0.31, 0.81, 175], [0, 0.65, 0.82, 85], [4, 0.5, 0.4, 70, true]], lights: [[0.24, 0.21, 0.33, 0.2, 0.018], [0.7, 0.35, 0.74, 0.41, 0.018], [0.26, 0.72, 0.34, 0.73, 0.014]] },
    war: { props: [[1, 0.25, 0.2, 250], [0, 0.23, 0.24, 125], [2, 0.13, 0.49, 190], [2, 0.88, 0.52, 190], [5, 0.75, 0.79, 195], [1, 0.28, 0.8, 230]], lights: [[0.23, 0.18, 0.34, 0.14, 0.022], [0.66, 0.14, 0.77, 0.18, 0.022]] },
    arena: { props: [[2, 0.17, 0.24, 165], [2, 0.83, 0.24, 165], [1, 0.15, 0.8, 190], [5, 0.85, 0.8, 170], [0, 0.17, 0.84, 85], [4, 0.5, 0.12, 75, true]], lights: [[0.3, 0.14, 0.42, 0.11, 0.02], [0.58, 0.11, 0.7, 0.14, 0.02]] },
    "ancient": { "props": [[1, 0.16, 0.2, 185], [2, 0.65, 0.2, 175], [5, 0.83, 0.4, 180], [2, 0.2, 0.57, 180], [1, 0.48, 0.78, 170], [0, 0.8, 0.84, 90]], "lights": [[0.1, 0.15, 0.22, 0.16, 0.016], [0.78, 0.32, 0.89, 0.35, 0.015]] },
    "afk": { "props": [[1, 0.25, 0.22, 170], [2, 0.59, 0.15, 175], [5, 0.82, 0.31, 165], [2, 0.23, 0.5, 160], [1, 0.76, 0.69, 170], [0, 0.42, 0.73, 90]], "lights": [[0.22, 0.16, 0.32, 0.14, 0.015], [0.65, 0.75, 0.76, 0.77, 0.014]] },
    "dragon": { "props": [[1, 0.27, 0.22, 185], [2, 0.72, 0.23, 185], [5, 0.16, 0.47, 175], [2, 0.84, 0.47, 175], [1, 0.32, 0.66, 180], [0, 0.69, 0.66, 90]], "lights": [[0.23, 0.19, 0.35, 0.15, 0.018], [0.65, 0.15, 0.77, 0.19, 0.018]] },
    "event": { "props": [[1, 0.27, 0.2, 175], [2, 0.61, 0.17, 165], [5, 0.82, 0.29, 170], [2, 0.83, 0.64, 175], [1, 0.33, 0.76, 170], [0, 0.17, 0.47, 90]], "lights": [[0.23, 0.14, 0.35, 0.14, 0.016], [0.7, 0.78, 0.81, 0.74, 0.016]] },
    "rune": { "props": [[1, 0.39, 0.24, 185], [2, 0.66, 0.28, 180], [5, 0.32, 0.43, 175], [2, 0.66, 0.58, 180], [1, 0.35, 0.7, 175], [0, 0.65, 0.82, 90]], "lights": [[0.35, 0.22, 0.43, 0.18, 0.014], [0.7, 0.52, 0.78, 0.49, 0.015]] }
  };
  var harvest = {
    bazaar: { props: [[5, 0.17, 0.4, 160], [0, 0.19, 0.43, 90], [1, 0.3, 0.31, 180], [4, 0.8, 0.28, 180], [3, 0.83, 0.71, 125], [0, 0.73, 0.83, 90], [2, 0.14, 0.73, 160], [0, 0.39, 0.16, 85], [0, 0.61, 0.15, 75]], lights: [[0.35, 0.12, 0.54, 0.12, 0.035], [0.8, 0.2, 0.91, 0.29, 0.035]] },
    forest: { props: [[1, 0.34, 0.34, 255], [0, 0.32, 0.37, 115], [2, 0.62, 0.31, 220], [4, 0.22, 0.22, 225], [3, 0.23, 0.59, 145], [0, 0.65, 0.64, 125], [2, 0.79, 0.45, 220], [1, 0.41, 0.79, 225], [5, 0.7, 0.81, 230], [0, 0.73, 0.82, 110]], lights: [[0.27, 0.14, 0.37, 0.19, 0.03], [0.6, 0.25, 0.68, 0.26, 0.026], [0.63, 0.72, 0.72, 0.76, 0.025]] },
    frozen: { props: [[2, 0.36, 0.35, 220], [0, 0.38, 0.38, 115], [1, 0.59, 0.36, 245], [4, 0.22, 0.51, 225], [3, 0.64, 0.71, 160], [2, 0.81, 0.55, 225], [0, 0.41, 0.85, 125], [5, 0.23, 0.77, 210]], lights: [[0.25, 0.16, 0.34, 0.18, 0.025], [0.59, 0.64, 0.67, 0.67, 0.025]] },
    black: { props: [[2, 0.16, 0.27, 235], [1, 0.82, 0.32, 240], [5, 0.24, 0.73, 225], [0, 0.27, 0.75, 125], [3, 0.77, 0.77, 165], [4, 0.36, 0.15, 230], [2, 0.66, 0.87, 235], [0, 0.88, 0.49, 120]], lights: [[0.43, 0.08, 0.56, 0.08, 0.022], [0.77, 0.77, 0.85, 0.71, 0.026]] },
    fishing: { props: [[4, 0.24, 0.27, 170], [0, 0.21, 0.3, 80], [3, 0.11, 0.6, 110], [1, 0.88, 0.61, 180], [0, 0.3, 0.84, 80], [5, 0.72, 0.86, 125]], lights: [[0.11, 0.4, 0.17, 0.3, 0.024], [0.83, 0.38, 0.9, 0.47, 0.02]] },
    sanctum: { props: [[2, 0.32, 0.28, 180], [2, 0.69, 0.29, 180], [0, 0.37, 0.21, 75], [0, 0.63, 0.2, 75], [3, 0.25, 0.52, 110], [3, 0.75, 0.51, 110], [4, 0.34, 0.72, 160]], lights: [[0.29, 0.32, 0.36, 0.23, 0.02], [0.64, 0.23, 0.72, 0.33, 0.02]] },
    sinsi: { props: [[1, 0.3, 0.27, 175], [0, 0.33, 0.28, 75], [2, 0.7, 0.24, 150], [3, 0.24, 0.53, 100], [4, 0.58, 0.46, 150], [5, 0.34, 0.82, 150], [0, 0.67, 0.81, 80]], lights: [[0.19, 0.42, 0.25, 0.48, 0.022], [0.6, 0.73, 0.69, 0.71, 0.02]] },
    war: { props: [[1, 0.27, 0.22, 235], [1, 0.75, 0.24, 225], [0, 0.24, 0.26, 105], [3, 0.13, 0.58, 140], [2, 0.86, 0.62, 205], [5, 0.69, 0.84, 205]], lights: [[0.2, 0.26, 0.27, 0.19, 0.025], [0.71, 0.17, 0.81, 0.23, 0.025]] },
    arena: { props: [[2, 0.16, 0.25, 165], [2, 0.84, 0.25, 165], [0, 0.19, 0.82, 90], [0, 0.81, 0.82, 90], [1, 0.27, 0.16, 170], [1, 0.73, 0.16, 170]], lights: [[0.33, 0.13, 0.45, 0.11, 0.02], [0.55, 0.11, 0.67, 0.13, 0.02]] },
    "ancient": { "props": [[1, 0.16, 0.2, 185], [2, 0.65, 0.2, 175], [4, 0.83, 0.4, 180], [3, 0.2, 0.57, 180], [5, 0.48, 0.78, 170], [0, 0.8, 0.84, 90]], "lights": [[0.1, 0.15, 0.22, 0.16, 0.016], [0.78, 0.32, 0.89, 0.35, 0.015]] },
    "afk": { "props": [[1, 0.25, 0.22, 170], [2, 0.59, 0.15, 175], [4, 0.82, 0.31, 165], [3, 0.23, 0.5, 160], [5, 0.76, 0.69, 170], [0, 0.42, 0.73, 90]], "lights": [[0.22, 0.16, 0.32, 0.14, 0.015], [0.65, 0.75, 0.76, 0.77, 0.014]] },
    "dragon": { "props": [[1, 0.27, 0.22, 185], [2, 0.72, 0.23, 185], [4, 0.16, 0.47, 175], [3, 0.84, 0.47, 175], [5, 0.32, 0.66, 180], [0, 0.69, 0.66, 90]], "lights": [[0.23, 0.19, 0.35, 0.15, 0.018], [0.65, 0.15, 0.77, 0.19, 0.018]] },
    "event": { "props": [[1, 0.27, 0.2, 175], [2, 0.61, 0.17, 165], [4, 0.82, 0.29, 170], [3, 0.83, 0.64, 175], [5, 0.33, 0.76, 170], [0, 0.17, 0.47, 90]], "lights": [[0.23, 0.14, 0.35, 0.14, 0.016], [0.7, 0.78, 0.81, 0.74, 0.016]] },
    "rune": { "props": [[1, 0.39, 0.24, 185], [2, 0.66, 0.28, 180], [4, 0.32, 0.43, 175], [3, 0.66, 0.58, 180], [5, 0.35, 0.7, 175], [0, 0.65, 0.82, 90]], "lights": [[0.35, 0.22, 0.43, 0.18, 0.014], [0.7, 0.52, 0.78, 0.49, 0.015]] }
  };
  var ramadan = {
    bazaar: { props: [[1, 0.28, 0.28, 230], [5, 0.8, 0.32, 185], [3, 0.2, 0.46, 100], [2, 0.17, 0.44, 80], [0, 0.15, 0.66, 175], [0, 0.86, 0.65, 175], [3, 0.77, 0.79, 100], [4, 0.4, 0.13, 115, true], [4, 0.82, 0.19, 105, true], [0, 0.64, 0.86, 165]], lights: [[0.18, 0.19, 0.3, 0.15, 0.035], [0.37, 0.09, 0.57, 0.1, 0.035], [0.79, 0.19, 0.92, 0.3, 0.038], [0.14, 0.67, 0.22, 0.79, 0.025]] },
    forest: { props: [[0, 0.36, 0.33, 230], [1, 0.2, 0.58, 225], [4, 0.28, 0.21, 155, true], [0, 0.64, 0.34, 225], [4, 0.65, 0.29, 140, true], [0, 0.77, 0.62, 220], [2, 0.39, 0.78, 100], [0, 0.41, 0.79, 220], [1, 0.66, 0.83, 205]], lights: [[0.31, 0.37, 0.39, 0.33, 0.025], [0.62, 0.62, 0.72, 0.63, 0.026], [0.38, 0.81, 0.46, 0.85, 0.025]] },
    frozen: { props: [[0, 0.35, 0.33, 235], [1, 0.59, 0.32, 225], [0, 0.23, 0.58, 220], [4, 0.52, 0.18, 145, true], [0, 0.66, 0.68, 235], [4, 0.75, 0.56, 140, true], [1, 0.27, 0.8, 210], [2, 0.4, 0.86, 95]], lights: [[0.24, 0.18, 0.34, 0.16, 0.025], [0.64, 0.64, 0.73, 0.68, 0.025]] },
    black: { props: [[5, 0.24, 0.23, 235], [3, 0.26, 0.29, 140], [2, 0.22, 0.29, 105], [1, 0.65, 0.15, 260], [0, 0.16, 0.65, 245], [0, 0.82, 0.68, 245], [4, 0.48, 0.1, 185, true], [1, 0.32, 0.85, 235], [4, 0.83, 0.27, 150, true]], lights: [[0.12, 0.17, 0.24, 0.14, 0.026], [0.45, 0.075, 0.56, 0.075, 0.024], [0.79, 0.17, 0.9, 0.25, 0.027], [0.73, 0.81, 0.84, 0.74, 0.025]] },
    fishing: { props: [[0, 0.23, 0.24, 170], [4, 0.28, 0.18, 100, true], [3, 0.13, 0.57, 85], [0, 0.88, 0.58, 160], [1, 0.72, 0.85, 165], [2, 0.29, 0.85, 70], [0, 0.34, 0.91, 150]], lights: [[0.12, 0.39, 0.17, 0.29, 0.024], [0.82, 0.28, 0.89, 0.39, 0.024], [0.63, 0.91, 0.72, 0.87, 0.018]] },
    sanctum: { props: [[1, 0.34, 0.25, 175], [1, 0.66, 0.25, 175], [0, 0.24, 0.48, 165], [0, 0.76, 0.48, 165], [4, 0.48, 0.15, 110, true], [0, 0.35, 0.72, 150], [0, 0.65, 0.72, 150]], lights: [[0.31, 0.26, 0.38, 0.19, 0.018], [0.62, 0.19, 0.7, 0.25, 0.018]] },
    sinsi: { props: [[1, 0.29, 0.26, 180], [4, 0.33, 0.2, 100, true], [0, 0.7, 0.24, 160], [0, 0.23, 0.5, 150], [0, 0.75, 0.53, 150], [3, 0.34, 0.8, 85], [2, 0.36, 0.83, 70], [1, 0.66, 0.79, 165]], lights: [[0.25, 0.21, 0.35, 0.19, 0.024], [0.59, 0.42, 0.67, 0.37, 0.022], [0.27, 0.72, 0.35, 0.74, 0.02]] },
    war: { props: [[1, 0.28, 0.23, 230], [1, 0.73, 0.22, 230], [0, 0.12, 0.53, 220], [0, 0.88, 0.53, 220], [0, 0.32, 0.82, 205], [0, 0.69, 0.82, 205]], lights: [[0.22, 0.2, 0.33, 0.14, 0.025], [0.67, 0.14, 0.78, 0.2, 0.025]] },
    arena: { props: [[0, 0.16, 0.27, 180], [0, 0.84, 0.27, 180], [1, 0.28, 0.16, 185], [1, 0.72, 0.16, 185], [0, 0.16, 0.82, 170], [0, 0.84, 0.82, 170]], lights: [[0.34, 0.13, 0.44, 0.11, 0.018], [0.56, 0.11, 0.66, 0.13, 0.018]] },
    "ancient": { "props": [[0, 0.16, 0.2, 185], [1, 0.65, 0.2, 175], [0, 0.83, 0.4, 180], [1, 0.2, 0.57, 180], [0, 0.48, 0.78, 170], [2, 0.8, 0.84, 90]], "lights": [[0.1, 0.15, 0.22, 0.16, 0.016], [0.78, 0.32, 0.89, 0.35, 0.015]] },
    "afk": { "props": [[0, 0.25, 0.22, 170], [1, 0.59, 0.15, 175], [0, 0.82, 0.31, 165], [1, 0.23, 0.5, 160], [0, 0.76, 0.69, 170], [2, 0.42, 0.73, 90]], "lights": [[0.22, 0.16, 0.32, 0.14, 0.015], [0.65, 0.75, 0.76, 0.77, 0.014]] },
    "dragon": { "props": [[0, 0.27, 0.22, 185], [1, 0.72, 0.23, 185], [0, 0.16, 0.47, 175], [1, 0.84, 0.47, 175], [0, 0.32, 0.66, 180], [2, 0.69, 0.66, 90]], "lights": [[0.23, 0.19, 0.35, 0.15, 0.018], [0.65, 0.15, 0.77, 0.19, 0.018]] },
    "event": { "props": [[0, 0.27, 0.2, 175], [1, 0.61, 0.17, 165], [0, 0.82, 0.29, 170], [1, 0.83, 0.64, 175], [0, 0.33, 0.76, 170], [2, 0.17, 0.47, 90]], "lights": [[0.23, 0.14, 0.35, 0.14, 0.016], [0.7, 0.78, 0.81, 0.74, 0.016]] },
    "rune": { "props": [[0, 0.39, 0.24, 185], [1, 0.66, 0.28, 180], [0, 0.32, 0.43, 175], [1, 0.66, 0.58, 180], [0, 0.35, 0.7, 175], [2, 0.65, 0.82, 90]], "lights": [[0.35, 0.22, 0.43, 0.18, 0.014], [0.7, 0.52, 0.78, 0.49, 0.015]] }
  };
  var firstLight = {
    bazaar: { props: [[0, 0.28, 0.27, 260], [2, 0.24, 0.32, 85], [1, 0.35, 0.29, 185], [3, 0.7, 0.28, 235], [5, 0.72, 0.78, 160], [2, 0.75, 0.83, 85], [1, 0.15, 0.65, 190], [1, 0.85, 0.65, 190], [4, 0.42, 0.14, 115, true], [4, 0.8, 0.18, 105, true], [5, 0.27, 0.78, 145]], lights: [[0.15, 0.19, 0.3, 0.13, 0.027], [0.36, 0.09, 0.6, 0.09, 0.03], [0.78, 0.15, 0.92, 0.26, 0.026], [0.67, 0.91, 0.82, 0.85, 0.025]] },
    forest: { props: [[0, 0.35, 0.35, 290], [2, 0.33, 0.38, 100], [1, 0.63, 0.34, 250], [5, 0.66, 0.61, 215], [4, 0.26, 0.2, 160, true], [3, 0.71, 0.81, 290], [1, 0.39, 0.76, 240], [2, 0.22, 0.59, 105], [5, 0.78, 0.45, 190], [4, 0.65, 0.27, 150, true]], lights: [[0.28, 0.15, 0.38, 0.19, 0.024], [0.61, 0.25, 0.69, 0.27, 0.025], [0.65, 0.72, 0.72, 0.77, 0.024]] },
    frozen: { props: [[0, 0.35, 0.34, 290], [5, 0.6, 0.32, 200], [1, 0.27, 0.59, 255], [4, 0.54, 0.19, 155, true], [3, 0.68, 0.7, 285], [2, 0.65, 0.74, 100], [1, 0.82, 0.58, 255], [5, 0.27, 0.81, 200], [2, 0.43, 0.85, 100]], lights: [[0.25, 0.18, 0.35, 0.16, 0.025], [0.64, 0.64, 0.73, 0.68, 0.025], [0.4, 0.79, 0.45, 0.82, 0.018]] },
    black: { props: [[3, 0.28, 0.22, 310], [1, 0.19, 0.31, 270], [0, 0.65, 0.16, 310], [2, 0.62, 0.2, 115], [5, 0.22, 0.73, 220], [1, 0.82, 0.66, 270], [4, 0.48, 0.1, 185, true], [5, 0.68, 0.84, 215], [2, 0.87, 0.51, 110]], lights: [[0.12, 0.17, 0.25, 0.14, 0.027], [0.44, 0.07, 0.56, 0.07, 0.025], [0.79, 0.17, 0.9, 0.25, 0.025]] },
    fishing: { props: [[5, 0.25, 0.26, 160], [1, 0.11, 0.51, 175], [2, 0.12, 0.59, 80], [0, 0.72, 0.84, 205], [4, 0.76, 0.19, 105, true], [1, 0.89, 0.56, 175], [2, 0.31, 0.87, 80]], lights: [[0.13, 0.39, 0.18, 0.29, 0.02], [0.81, 0.29, 0.89, 0.4, 0.02], [0.63, 0.92, 0.73, 0.87, 0.02]] },
    sanctum: { props: [[0, 0.33, 0.27, 210], [0, 0.67, 0.27, 210], [1, 0.23, 0.48, 180], [1, 0.77, 0.48, 180], [5, 0.34, 0.7, 140], [5, 0.66, 0.7, 140], [4, 0.5, 0.15, 115, true], [2, 0.39, 0.21, 70], [2, 0.62, 0.21, 70]], lights: [[0.3, 0.28, 0.38, 0.19, 0.018], [0.62, 0.19, 0.71, 0.28, 0.018]] },
    sinsi: { props: [[0, 0.29, 0.26, 200], [5, 0.7, 0.25, 145], [1, 0.22, 0.5, 175], [1, 0.76, 0.52, 175], [4, 0.49, 0.41, 110, true], [3, 0.33, 0.82, 195], [2, 0.65, 0.83, 80]], lights: [[0.24, 0.21, 0.34, 0.19, 0.02], [0.61, 0.43, 0.68, 0.37, 0.02], [0.29, 0.74, 0.37, 0.77, 0.02]] },
    war: { props: [[0, 0.27, 0.22, 285], [3, 0.72, 0.23, 270], [1, 0.12, 0.52, 235], [1, 0.88, 0.52, 235], [5, 0.32, 0.82, 200], [5, 0.68, 0.82, 200], [2, 0.25, 0.26, 105]], lights: [[0.23, 0.19, 0.34, 0.14, 0.025], [0.66, 0.14, 0.77, 0.2, 0.025]] },
    arena: { props: [[1, 0.16, 0.26, 190], [1, 0.84, 0.26, 190], [0, 0.29, 0.16, 205], [0, 0.71, 0.16, 205], [2, 0.17, 0.83, 80], [2, 0.83, 0.83, 80], [4, 0.5, 0.11, 95, true]], lights: [[0.33, 0.13, 0.44, 0.11, 0.018], [0.56, 0.11, 0.67, 0.13, 0.018]] },
    "ancient": { "props": [[0, 0.16, 0.2, 185], [1, 0.65, 0.2, 175], [5, 0.83, 0.4, 180], [1, 0.2, 0.57, 180], [0, 0.48, 0.78, 170], [2, 0.8, 0.84, 90]], "lights": [[0.1, 0.15, 0.22, 0.16, 0.016], [0.78, 0.32, 0.89, 0.35, 0.015]] },
    "afk": { "props": [[0, 0.25, 0.22, 170], [1, 0.59, 0.15, 175], [5, 0.82, 0.31, 165], [1, 0.23, 0.5, 160], [0, 0.76, 0.69, 170], [2, 0.42, 0.73, 90]], "lights": [[0.22, 0.16, 0.32, 0.14, 0.015], [0.65, 0.75, 0.76, 0.77, 0.014]] },
    "dragon": { "props": [[0, 0.27, 0.22, 185], [1, 0.72, 0.23, 185], [5, 0.16, 0.47, 175], [1, 0.84, 0.47, 175], [0, 0.32, 0.66, 180], [2, 0.69, 0.66, 90]], "lights": [[0.23, 0.19, 0.35, 0.15, 0.018], [0.65, 0.15, 0.77, 0.19, 0.018]] },
    "event": { "props": [[0, 0.27, 0.2, 175], [1, 0.61, 0.17, 165], [5, 0.82, 0.29, 170], [1, 0.83, 0.64, 175], [0, 0.33, 0.76, 170], [2, 0.17, 0.47, 90]], "lights": [[0.23, 0.14, 0.35, 0.14, 0.016], [0.7, 0.78, 0.81, 0.74, 0.016]] },
    "rune": { "props": [[0, 0.39, 0.24, 185], [1, 0.66, 0.28, 180], [5, 0.32, 0.43, 175], [1, 0.66, 0.58, 180], [0, 0.35, 0.7, 175], [2, 0.65, 0.82, 90]], "lights": [[0.35, 0.22, 0.43, 0.18, 0.014], [0.7, 0.52, 0.78, 0.49, 0.015]] }
  };
  winter.guild_arena = { props: [[1, 0.15, 0.17, 185], [5, 0.85, 0.18, 170], [0, 0.21, 0.85, 90], [2, 0.8, 0.87, 170], [4, 0.36, 0.09, 80, true], [4, 0.66, 0.09, 80, true]], lights: [[0.22, 0.08, 0.39, 0.08, 0.017], [0.59, 0.08, 0.76, 0.08, 0.017], [0.24, 0.89, 0.42, 0.9, 0.013]] };
  harvest.guild_arena = { props: [[2, 0.15, 0.2, 170], [2, 0.85, 0.2, 170], [0, 0.25, 0.85, 85], [0, 0.75, 0.85, 85], [1, 0.38, 0.1, 145], [1, 0.62, 0.1, 145]], lights: [[0.22, 0.085, 0.39, 0.085, 0.019], [0.61, 0.085, 0.78, 0.085, 0.019]] };
  ramadan.guild_arena = { props: [[0, 0.15, 0.21, 180], [0, 0.85, 0.21, 180], [1, 0.26, 0.86, 150], [1, 0.74, 0.86, 150], [4, 0.38, 0.09, 90, true], [4, 0.62, 0.09, 90, true]], lights: [[0.22, 0.085, 0.4, 0.085, 0.019], [0.6, 0.085, 0.78, 0.085, 0.019]] };
  firstLight.guild_arena = { props: [[0, 0.16, 0.19, 190], [0, 0.84, 0.19, 190], [1, 0.24, 0.87, 170], [1, 0.76, 0.87, 170], [4, 0.38, 0.09, 95, true], [4, 0.64, 0.09, 95, true], [2, 0.42, 0.89, 80], [2, 0.58, 0.89, 80]], lights: [[0.22, 0.085, 0.4, 0.085, 0.017], [0.6, 0.085, 0.78, 0.085, 0.017]] };
  var FESTIVAL_LAYOUTS = { new_year: winter, halloween: harvest, ramadan, first_light: firstLight };
  function festivalLayout(theme, area) {
    return FESTIVAL_LAYOUTS[theme]?.[area];
  }
  var labels = {
    new_year: ["K\u0131zak", "I\u015F\u0131kl\u0131 \xC7am", "\xC7an Dire\u011Fi", "K\u0131\u015F Tezg\xE2h\u0131", "\xC7am Girland\u0131", "Buz Geyi\u011Fi", "Kardan Adam", "Hediye Y\u0131\u011F\u0131n\u0131", "F\u0131nd\u0131kk\u0131ran", "\xC7elenk Dire\u011Fi", "K\u0131\u015F Feneri", "Mum K\xF6\u015Fesi"],
    halloween: ["Balkaba\u011F\u0131 K\xFCmesi", "Korkuluk", "Kuzgun Heykeli", "Cad\u0131 Kazan\u0131", "Fenerli Ge\xE7it", "Hasat Arabas\u0131", "B\xFCy\xFCl\xFC Cad\u0131 Kazan\u0131", "Hasat Korkulu\u011Fu", "Eski Mezarta\u015Flar\u0131", "\u0130skeletli Tabut", "Balkaba\u011F\u0131 Arabas\u0131", "Yarasa Sanca\u011F\u0131"],
    ramadan: ["Fanus Dire\u011Fi", "Hilal", "Davul", "\u0130ftar Masas\u0131", "As\u0131l\u0131 Fanus", "T\xF6ren \xC7ad\u0131r\u0131"],
    first_light: ["\xC7ekirdek Feneri", "T\xF6ren Sanca\u011F\u0131", "Mum K\xFCmesi", "T\xF6ren Kemeri", "Prizma Girland\u0131", "Fidan Havuzu"]
  };
  var sizes = { new_year: [120, 250, 165, 160, 85, 180, 165, 100, 200, 180, 150, 90], halloween: [90, 180, 160, 125, 180, 160, 140, 190, 150, 155, 160, 190], ramadan: [175, 230, 80, 100, 105, 185], first_light: [260, 185, 85, 235, 105, 160] };
  var catalog = Object.freeze(Object.fromEntries(Object.entries(labels).map(([theme, names]) => [theme, Object.freeze(names.map((label, kind) => Object.freeze({ kind, label, name: label, size: sizes[theme][kind], wall: kind === 4 })))])));
  var lastText;
  var lastParsed = {};
  function seasonalSettings453(settings) {
    const text = settings?.seasonal_themes_json ?? "{}";
    if (text !== lastText) {
      lastText = text;
      try {
        const parsed = JSON.parse(text);
        lastParsed = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } catch {
        lastParsed = {};
      }
    }
    return lastParsed;
  }
  var args = (first, second, third) => typeof first === "string" ? [first, second, third] : [second, third, first];
  var copy = (layout) => ({ revision: Number.isSafeInteger(layout?.revision) && layout.revision >= 0 ? layout.revision : 0, custom: layout?.custom === true, props: (layout?.props ?? []).map((p2) => p2.slice()), lights: (layout?.lights ?? []).map((p2) => p2.slice()) });
  function defaultDecorLayout(theme, area) {
    return copy(festivalLayout(theme, area));
  }
  function decorRevision(first, second, third) {
    const [theme, area, settings] = args(first, second, third);
    const entry = seasonalSettings453(settings).__decor?.layouts?.[`${theme}:${area}`];
    return Number.isSafeInteger(entry?.revision) && entry.revision >= 0 ? entry.revision : 0;
  }
  function decorLayout(first, second, third) {
    const [theme, area, settings] = args(first, second, third), entry = seasonalSettings453(settings).__decor?.layouts?.[`${theme}:${area}`];
    return entry?.custom === true && Array.isArray(entry.props) && Array.isArray(entry.lights) ? copy(entry) : defaultDecorLayout(theme, area);
  }
  var SEASONAL_ATLAS_BOUNDS453 = {
    "new_year": [
      [
        54,
        110,
        417,
        382
      ],
      [
        590,
        12,
        382,
        500
      ],
      [
        1175,
        10,
        335,
        493
      ],
      [
        25,
        512,
        475,
        475
      ],
      [
        524,
        605,
        535,
        298
      ],
      [
        1100,
        493,
        390,
        520
      ]
    ],
    "halloween": [
      [
        39,
        119,
        450,
        380
      ],
      [
        565,
        7,
        411,
        503
      ],
      [
        1156,
        23,
        269,
        482
      ],
      [
        34,
        560,
        459,
        408
      ],
      [
        526,
        523,
        485,
        452
      ],
      [
        1066,
        536,
        448,
        437
      ]
    ],
    "ramadan": [
      [
        140,
        0,
        248,
        545
      ],
      [
        554,
        16,
        427,
        530
      ],
      [
        1080,
        133,
        390,
        403
      ],
      [
        8,
        560,
        503,
        453
      ],
      [
        514,
        557,
        527,
        396
      ],
      [
        1070,
        528,
        460,
        480
      ]
    ],
    "first_light": [
      [
        95,
        7,
        366,
        502
      ],
      [
        658,
        0,
        225,
        530
      ],
      [
        1072,
        92,
        415,
        410
      ],
      [
        62,
        518,
        439,
        482
      ],
      [
        524,
        512,
        500,
        409
      ],
      [
        1110,
        527,
        395,
        480
      ]
    ]
  };
  var SEASONAL_EXTRA_BOUNDS453 = [[49, 9, 321, 379], [400, 104, 402, 274], [895, 3, 149, 411], [69, 389, 319, 367], [461, 386, 248, 372], [789, 422, 347, 334]];
  var SEASONAL_LIMITS453 = Object.freeze({ props: 32, lights: 8, spriteSide: 320, stripSide: 640, stripEntries: 24, stripPixels: 1048576, sceneEntries: 2 });
  var palettes = {
    new_year: { rgb: "255,208,128", accent: "#e8edda", particle: "#eaf2f4" },
    halloween: { rgb: "237,151,62", accent: "#acb794", particle: "#c9c9ad" },
    ramadan: { rgb: "255,210,139", accent: "#8cbeb2", particle: "#eddbaf" },
    first_light: { rgb: "127,222,167", accent: "#ead59e", particle: "#e5d8a5" }
  };
  var imageRecords = /* @__PURE__ */ new WeakMap();
  var layoutAliases = /* @__PURE__ */ new WeakMap();
  var halos = /* @__PURE__ */ new Map();
  var strips = /* @__PURE__ */ new Map();
  var stripPixels = 0;
  var canvas = () => typeof document !== "undefined" ? document.createElement("canvas") : null;
  var validImage = (image) => !!image?.complete && Number(image.naturalWidth) > 0 && Number(image.naturalHeight) > 0;
  var num = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
  var array = (value) => Array.isArray(value) ? value : [];
  var themeKey = (theme) => Object.hasOwn(palettes, theme) ? theme : "none";
  var wrap = (n2, max) => (n2 % max + max) % max;
  var keyFor = (o2, layout) => `${o2.theme}:${o2.area}:${o2.width}:${o2.height}:${layout.custom ? "custom" : "default"}:${layout.props.map((p2) => p2.join(",")).join(";")}/${layout.lights.map((p2) => p2.join(",")).join(";")}`;
  const SEASONAL_HALLOWEEN_EXTRA_BOUNDS469 = [[0, 0, 512, 512], [548, 0, 464, 512], [1032, 0, 496, 512], [32, 520, 510, 490], [542, 540, 490, 450], [1108, 512, 356, 512]];
  function boundedSeasonalLayout453(theme, area, value) {
    const count = theme === "new_year" || theme === "halloween" ? 12 : SEASONAL_ATLAS_BOUNDS453[theme]?.length ?? 0;
    const input = value && value.custom !== false && typeof value === "object" && Array.isArray(value.props) && Array.isArray(value.lights) && (!value.theme || value.theme === theme) && (!value.area || value.area === area) ? value : festivalLayout(theme, area);
    if (!input) return null;
    const props = [], lights = [];
    for (const p2 of array(input.props).slice(0, 32)) {
      if (!Array.isArray(p2) || !Number.isInteger(p2[0]) || p2[0] < 0 || p2[0] >= count || !num(p2[1], 0, 1) || !num(p2[2], 0, 1) || !num(p2[3], 60, 320)) continue;
      props.push([p2[0], p2[1], p2[2], p2[3], p2[4] === true]);
    }
    for (const p2 of array(input.lights).slice(0, 8)) {
      if (!Array.isArray(p2) || p2.length < 5 || !p2.slice(0, 4).every((n2) => num(n2, 0, 1)) || !num(p2[4], 0, 0.08)) continue;
      lights.push(p2.slice(0, 5));
    }
    return { props, lights, custom: input === value && value?.custom !== false };
  }
  function halo(theme) {
    let cached = halos.get(theme);
    if (cached) return cached;
    const c2 = canvas();
    if (!c2) return null;
    c2.width = c2.height = 96;
    const ctx = c2.getContext("2d");
    if (!ctx) return null;
    const g2 = ctx.createRadialGradient(48, 48, 1, 48, 48, 48), rgb = palettes[theme].rgb;
    g2.addColorStop(0, `rgba(${rgb},.40)`);
    g2.addColorStop(0.35, `rgba(${rgb},.14)`);
    g2.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, 96, 96);
    halos.set(theme, c2);
    return c2;
  }
  function makeSprite(image, theme, index, extra = false) {
    const bounds = extra ? (theme === "halloween" ? SEASONAL_HALLOWEEN_EXTRA_BOUNDS469 : SEASONAL_EXTRA_BOUNDS453)[index] : SEASONAL_ATLAS_BOUNDS453[theme]?.[index];
    if (!bounds) return null;
    const [left, top, width, height] = bounds;
    if (!(width > 0 && height > 0 && left >= 0 && top >= 0 && left + width <= image.naturalWidth && top + height <= image.naturalHeight)) return null;
    const c2 = canvas();
    if (!c2) return null;
    const scale = Math.min(1, 320 / Math.max(width, height));
    c2.width = Math.ceil(width * scale);
    c2.height = Math.ceil(height * scale);
    const ctx = c2.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(image, left, top, width, height, 0, 0, c2.width, c2.height);
    return c2;
  }
  function lightStrip(theme, points, width, height, custom = false) {
    const key = `${theme}:${width}:${height}:${custom ? "custom:" : ""}${points.join(",")}`;
    let cached = strips.get(key);
    if (cached) {
      strips.delete(key);
      strips.set(key, cached);
      return cached;
    }
    const [ax, ay, bx, by, sag] = points, x1 = ax * width, y1 = ay * height, x2 = bx * width, y2 = by * height, drop = sag * height;
    const left = Math.min(x1, x2) - 14, top = Math.min(y1, y2) - 14, w2 = Math.abs(x2 - x1) + 28, h2 = Math.abs(y2 - y1) + drop + 45;
    const scale = Math.min(1, 640 / Math.max(w2, h2), custom ? Math.sqrt(65536 / (w2 * h2)) : 1), c2 = canvas();
    if (!c2) return null;
    c2.width = Math.ceil(w2 * scale);
    c2.height = Math.ceil(h2 * scale);
    const ctx = c2.getContext("2d");
    if (!ctx) return null;
    const glow = halo(theme);
    if (!glow) return null;
    ctx.scale(scale, scale);
    ctx.translate(-left, -top);
    ctx.strokeStyle = theme === "new_year" ? "#344138" : "#67573f";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + drop * 2, x2, y2);
    ctx.stroke();
    const count = Math.min(18, Math.max(6, Math.round(Math.hypot(x2 - x1, y2 - y1) / (theme === "new_year" ? 27 : 60))));
    for (let i2 = 0; i2 < count; i2++) {
      const t2 = i2 / (count - 1), x3 = x1 + (x2 - x1) * t2, y3 = y1 + (y2 - y1) * t2 + 4 * drop * t2 * (1 - t2), fanous = theme === "ramadan", size = fanous ? 6 : theme === "new_year" ? 2.8 : 4;
      ctx.drawImage(glow, x3 - 13, y3 - 8, 26, 26);
      ctx.fillStyle = i2 % 3 === 0 ? palettes[theme].accent : "#f0d3a0";
      if (fanous) {
        ctx.strokeStyle = "#a08650";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x3, y3);
        ctx.lineTo(x3, y3 + 5);
        ctx.stroke();
        ctx.fillRect(x3 - size / 2, y3 + 5, size, size * 1.3);
      } else {
        ctx.beginPath();
        ctx.arc(x3, y3, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    cached = { canvas: c2, key, left, top, width: w2, height: h2, pixels: c2.width * c2.height };
    strips.set(key, cached);
    stripPixels += cached.pixels;
    while (strips.size > 24 || stripPixels > 1048576) {
      const oldest = strips.keys().next().value, item = strips.get(oldest);
      strips.delete(oldest);
      stripPixels -= item.pixels;
    }
    return cached;
  }
  function recordsFor(image) {
    let record = imageRecords.get(image);
    if (!record) {
      record = { art: /* @__PURE__ */ new Map(), scenes: /* @__PURE__ */ new Map() };
      imageRecords.set(image, record);
    }
    return record;
  }
  function sceneStart(o2) {
    const theme = themeKey(o2.theme);
    if (theme === "none" || !validImage(o2.image) || !num(o2.width, 1, 2e4) || !num(o2.height, 1, 2e4)) return null;
    const layout = boundedSeasonalLayout453(theme, o2.area, o2.layout);
    if (!layout) return null;
    const needExtra = (theme === "new_year" || theme === "halloween") && layout.props.some((p2) => p2[0] >= 6);
    if (needExtra && !validImage(o2.extraImage)) return null;
    const key = keyFor(o2, layout), record = recordsFor(o2.image), cached = record.scenes.get(key);
    if (cached && cached.lights.every((l2) => strips.has(l2.key))) {
      if (o2.layout && typeof o2.layout === "object") layoutAliases.set(o2.layout, cached);
      record.active = cached;
      return { cached };
    }
    const base = record.art.get(theme) ?? [];
    record.art.set(theme, base);
    const extraRecord = needExtra ? recordsFor(o2.extraImage) : null, extra = extraRecord ? extraRecord.art.get(theme === "halloween" ? "halloweenExtra469" : "extra") ?? [] : [];
    if (extraRecord) extraRecord.art.set(theme === "halloween" ? "halloweenExtra469" : "extra", extra);
    const art = [];
    const scene = { theme, area: o2.area, width: o2.width, height: o2.height, key, layout, art, lights: [], glow: null, ready: false };
    const jobs = [];
    for (let i2 = 0; i2 < SEASONAL_ATLAS_BOUNDS453[theme].length; i2++) jobs.push(() => {
      if (!base[i2]) base[i2] = makeSprite(o2.image, theme, i2);
      art[i2] = base[i2];
    });
    if (needExtra) for (let i2 = 0; i2 < 6; i2++) jobs.push(() => {
      if (!extra[i2]) extra[i2] = makeSprite(o2.extraImage, theme, i2, true);
      art[6 + i2] = extra[i2];
    });
    jobs.push(() => {
      scene.glow = halo(theme);
    });
    for (const points of layout.lights) jobs.push(() => {
      const strip = lightStrip(theme, points, o2.width, o2.height, layout.custom);
      if (strip) {
        const { key: key2, left, top, width, height } = strip;
        scene.lights.push({ key: key2, left, top, width, height, x1: points[0] });
      }
    });
    const finish = () => {
      scene.ready = !!scene.glow && scene.art.length === (needExtra ? 12 : 6) && scene.art.every(Boolean);
      if (!scene.ready) return;
      record.scenes.set(key, scene);
      while (record.scenes.size > 2) record.scenes.delete(record.scenes.keys().next().value);
      record.active = scene;
      if (o2.layout && typeof o2.layout === "object") layoutAliases.set(o2.layout, scene);
    };
    return { scene, jobs, finish };
  }
  function prepareSeasonalScene453(o2) {
    const work = sceneStart(o2);
    if (!work) return null;
    if (work.cached) return work.cached;
    for (const job of work.jobs) job();
    work.finish();
    return work.scene.ready ? work.scene : null;
  }
  function seasonalParticleBudget453(o2) {
    switch (o2.area) {
      case "ancient":
      case "afk":
      case "dragon":
      case "event":
      case "rune":
        return 0;
    }
    return o2.still ? 0 : o2.heat ? 8 : o2.reduced ? 16 : 28;
  }
  function drawSeasonalScene453(ctx, o2, actors) {
    const theme = themeKey(o2.theme);
    if (theme === "none" || !validImage(o2.image)) return;
    const records = imageRecords.get(o2.image);
    if (!records) return;
    const alias = o2.layout && typeof o2.layout === "object" ? layoutAliases.get(o2.layout) : null;
    const scene = alias?.theme === theme && alias?.area === o2.area && alias.width === o2.width && alias.height === o2.height ? alias : records.active;
    if (!scene?.ready || scene.theme !== theme || scene.area !== o2.area || scene.width !== o2.width || scene.height !== o2.height) return;
    const { layout, art, glow } = scene, palette = palettes[theme], time = o2.still ? 0 : Math.floor(o2.now / (o2.heat ? 125 : 80)) * (o2.heat ? 125 : 80);
    const left = o2.cameraX - o2.viewWidth / 2, top = o2.cameraY - o2.viewHeight / 2, right = left + o2.viewWidth, bottom = top + o2.viewHeight;
    const visible = (x2, y2, w2, h2) => x2 + w2 > left && x2 < right && y2 + h2 > top && y2 < bottom;
    ctx.save();
    try {
      for (const strip of scene.lights) {
        if (!visible(strip.left, strip.top, strip.width, strip.height)) continue;
        const raster = strips.get(strip.key);
        if (!raster) continue;
        ctx.globalAlpha = o2.still ? 1 : 0.94 + Math.sin(time / 2400 + strip.x1 * 8) * 0.06;
        ctx.drawImage(raster.canvas, strip.left, strip.top, strip.width, strip.height);
      }
      ctx.globalAlpha = 1;
      for (let index = 0; index < layout.props.length; index++) {
        const [kind, ax, ay, size, wall] = layout.props[index], im = art[kind];
        if (!im) continue;
        const x2 = ax * o2.width, y2 = ay * o2.height, h2 = size, w2 = size * im.width / im.height;
        if (!visible(x2 - w2 / 2, y2 - h2, w2, h2 + size * 0.18)) continue;
        if (!wall) {
          ctx.globalAlpha = 0.48;
          ctx.drawImage(glow, x2 - size * 0.4, y2 - size * 0.12, size * 0.8, size * 0.28);
          ctx.globalAlpha = 1;
        }
        const draw = () => {
          ctx.save();
          ctx.drawImage(im, x2 - w2 / 2, y2 - h2, w2, h2);
          if (kind === (theme === "first_light" ? 0 : theme === "new_year" ? 1 : theme === "ramadan" ? 0 : 3)) {
            ctx.globalAlpha = o2.still ? 0.13 : 0.13 + 0.025 * Math.sin(time / 2300 + index);
            ctx.drawImage(glow, x2 - size * 0.22, y2 - h2 * 0.7, size * 0.44, size * 0.38);
          }
          ctx.restore();
        };
        if (wall) draw();
        else actors.push({ y: y2, draw });
      }
      if (!layout.props.length) return;
      const count = seasonalParticleBudget453(o2);
      for (let i2 = 0; i2 < count; i2++) {
        const anchor = layout.props[i2 % layout.props.length], size = anchor[3];
        const x2 = anchor[1] * o2.width + (wrap(i2 * 79.17, size * 1.5) - size * 0.75) + Math.sin(time / 3200 + i2) * 9;
        const snow = theme === "new_year" && o2.area !== "black", rise = wrap(i2 * 47.11 + time * (snow ? 0.013 : -8e-3), size * 0.8), y2 = anchor[2] * o2.height - size * 0.85 + rise;
        if (!visible(x2 - 8, y2 - 8, 16, 16)) continue;
        ctx.globalAlpha = 0.28 + 0.2 * Math.sin(time / 2100 + i2) ** 2;
        ctx.fillStyle = palette.particle;
        if (theme === "halloween") ctx.drawImage(glow, x2 - 16, y2 - 5, 32, 10);
        else if (theme === "first_light") {
          ctx.beginPath();
          ctx.moveTo(x2, y2 - 3.5);
          ctx.lineTo(x2 + 1.7, y2);
          ctx.lineTo(x2, y2 + 3.5);
          ctx.lineTo(x2 - 1.7, y2);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.ellipse(x2, y2, snow ? 1.9 : 1.5, snow ? 1.5 : 2.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } finally {
      ctx.restore();
    }
  }
  function seasonalSpriteRatios453(theme) {
    return [...SEASONAL_ATLAS_BOUNDS453[theme] ?? [], ...theme === "new_year" ? SEASONAL_EXTRA_BOUNDS453 : theme === "halloween" ? SEASONAL_HALLOWEEN_EXTRA_BOUNDS469 : []].map(([, , w2, h2]) => Math.ceil(w2 * Math.min(1, 320 / Math.max(w2, h2))) / Math.ceil(h2 * Math.min(1, 320 / Math.max(w2, h2))));
  }
  var MAX_PROPS = 32;
  var MAX_LIGHTS = 8;
  var cloneLayout = (layout) => ({ props: (layout?.props ?? []).map((p2) => [...p2]), lights: (layout?.lights ?? []).map((l2) => [...l2]) });
  var layoutEqual = (a2, b2) => JSON.stringify(a2) === JSON.stringify(b2);
  var bound = (n2, lo, hi) => Math.max(lo, Math.min(hi, n2));
  function editorCamera({ width, height, worldWidth, worldHeight, focus = [0.5, 0.5], overview = true }) {
    const zoom = Math.min(width / worldWidth, height / worldHeight) * (overview ? 1 : 2.1);
    return { width, height, worldWidth, worldHeight, zoom, x: (overview ? 0.5 : focus[0]) * worldWidth, y: (overview ? 0.5 : focus[1]) * worldHeight };
  }
  function screenToWorld(camera, x2, y2) {
    return { x: (x2 - camera.width / 2) / camera.zoom + camera.x, y: (y2 - camera.height / 2) / camera.zoom + camera.y };
  }
  function propRect(prop, world, ratios) {
    const [kind, ax, ay, h2] = prop, w2 = h2 * (ratios[kind] || 1);
    return { x: ax * world.width - w2 / 2, y: ay * world.height - h2, width: w2, height: h2 };
  }
  function distanceToSegment(x2, y2, ax, ay, bx, by) {
    const length = (bx - ax) ** 2 + (by - ay) ** 2;
    const t2 = length ? bound(((x2 - ax) * (bx - ax) + (y2 - ay) * (by - ay)) / length, 0, 1) : 0;
    return Math.hypot(x2 - ax - t2 * (bx - ax), y2 - ay - t2 * (by - ay));
  }
  function hitDecoration(layout, world, ratios, point, tolerance) {
    const sorted = layout.props.map((p2, i2) => ({ p: p2, i: i2 })).sort((a2, b2) => Number(Boolean(a2.p[4])) - Number(Boolean(b2.p[4])) || b2.p[2] - a2.p[2] || b2.i - a2.i);
    for (const { p: p2, i: i2 } of sorted) {
      const r2 = propRect(p2, world, ratios);
      if (point.x >= r2.x - tolerance && point.x <= r2.x + r2.width + tolerance && point.y >= r2.y - tolerance && point.y <= r2.y + r2.height + tolerance) return { kind: "prop", index: i2 };
    }
    for (let index = layout.lights.length - 1; index >= 0; index--) {
      const [ax, ay, bx, by, sag] = layout.lights[index];
      let px = ax * world.width, py = ay * world.height;
      for (let step = 1; step <= 16; step++) {
        const t2 = step / 16, x2 = (ax + (bx - ax) * t2) * world.width, y2 = (ay + (by - ay) * t2 + 4 * sag * t2 * (1 - t2)) * world.height;
        if (distanceToSegment(point.x, point.y, px, py, x2, y2) <= tolerance) return { kind: "light", index };
        px = x2;
        py = y2;
      }
    }
    return null;
  }
  function moveDecoration(layout, selected, from, to, world, ratios) {
    if (!selected) return layout;
    const next = cloneLayout(layout), dx = (to.x - from.x) / world.width, dy = (to.y - from.y) / world.height;
    if (selected.kind === "prop") {
      const p2 = next.props[selected.index];
      if (!p2) return layout;
      const half = p2[3] * (ratios[p2[0]] || 1) / (2 * world.width), height = p2[3] / world.height;
      p2[1] = bound(p2[1] + dx, Math.min(0.49, half), Math.max(0.51, 1 - half));
      p2[2] = bound(p2[2] + dy, Math.min(0.99, height), 1);
    } else {
      const l2 = next.lights[selected.index];
      if (!l2) return layout;
      const sx = bound(dx, -Math.min(l2[0], l2[2]), 1 - Math.max(l2[0], l2[2]));
      const sy = bound(dy, -Math.min(l2[1], l2[3]), 1 - Math.max(l2[1], l2[3]) - l2[4]);
      l2[0] += sx;
      l2[2] += sx;
      l2[1] += sy;
      l2[3] += sy;
    }
    return next;
  }
  function resizeProp(layout, index, size, world, ratios) {
    const next = cloneLayout(layout), p2 = next.props[index];
    if (!p2) return layout;
    p2[3] = bound(Number(size) || 80, 60, 320);
    return moveDecoration(next, { kind: "prop", index }, { x: 0, y: 0 }, { x: 0, y: 0 }, world, ratios);
  }
  function removeDecoration(layout, selected) {
    if (!selected) return layout;
    const next = cloneLayout(layout);
    next[selected.kind === "prop" ? "props" : "lights"].splice(selected.index, 1);
    return next;
  }
  function makeDraft(layout, revision) {
    const copied = cloneLayout(layout);
    return { layout: copied, original: cloneLayout(layout), expectedRevision: revision, dirty: false };
  }
  function updateDraft(draft, layout) {
    return { ...draft, layout, dirty: !layoutEqual(draft.original, layout) };
  }
  function reconcileDraft(draft, layout, revision) {
    return !draft || !draft.dirty ? makeDraft(layout, revision) : draft;
  }
  function acknowledgeDraft(draft, submitted, revision) {
    return { ...draft, original: cloneLayout(submitted), expectedRevision: revision, dirty: !layoutEqual(draft.layout, submitted) };
  }
  function beginDrag(pointerId, selected, layout, point) {
    return { pointerId, selected, layout: cloneLayout(layout), point };
  }
  function dragPointer(drag, pointerId, point, world, ratios) {
    return drag?.pointerId === pointerId ? moveDecoration(drag.layout, drag.selected, drag.point, point, world, ratios) : null;
  }
  function cancelDrag(drag, pointerId) {
    return drag?.pointerId === pointerId ? cloneLayout(drag.layout) : null;
  }
  function createSeasonalEditor453(React, { SEASONAL_AREAS, SEASONAL_ART, seasonalTheme, FESTIVAL_MAPS, areaWorld }) {
    const { useEffect, useMemo, useRef, useState } = React;
    function ratiosFor(theme) {
      return seasonalSpriteRatios453(theme);
    }
    function SeasonalPreview({ theme, area = "bazaar", overview = false, layout, selected = null, disabled = false, onLayout, onSelect }) {
      const ref = useRef(null), paintRef = useRef(() => {
      }), dragRef = useRef(null), dragFrame = useRef(0), pendingPoint = useRef(null);
      const latest = useRef({ layout, selected, disabled, onLayout, onSelect });
      latest.current = { layout, selected, disabled, onLayout, onSelect };
      const [status, setStatus] = useState("loading");
      const label = SEASONAL_AREAS.find(([id]) => id === area)?.[1] ?? (area === "guild_arena" ? "Lonca Sava\u015F\u0131" : area);
      const world = areaWorld(area), ratios = ratiosFor(theme);
      const camera = () => editorCamera({ width: ref.current?.clientWidth || 1, height: ref.current?.clientHeight || 1, worldWidth: world.width, worldHeight: world.height, focus: FESTIVAL_MAPS[area].focus, overview });
      const point = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return screenToWorld(camera(), (event.clientX - rect.left) * event.currentTarget.clientWidth / rect.width, (event.clientY - rect.top) * event.currentTarget.clientHeight / rect.height);
      };
      const finish = (event, cancelled = false) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        window.cancelAnimationFrame(dragFrame.current);
        dragFrame.current = 0;
        const next = cancelled ? cancelDrag(drag, event.pointerId) : dragPointer(drag, event.pointerId, pendingPoint.current ?? point(event), world, ratios);
        pendingPoint.current = null;
        dragRef.current = null;
        if (next) latest.current.onLayout?.(next);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      };
      useEffect(() => {
        const canvas2 = ref.current;
        if (!canvas2) return;
        const ctx = canvas2.getContext("2d");
        if (!ctx) return;
        setStatus("loading");
        let alive = true, visible = true, frame = 0;
        const map = new Image(), art = new Image(), extra = theme === "new_year" || theme === "halloween" ? new Image() : void 0, meta = FESTIVAL_MAPS[area], currentWorld = areaWorld(area), currentRatios = ratiosFor(theme);
        const paint = () => {
          frame = 0;
          if (!alive || document.hidden || !visible) return;
          const width = canvas2.clientWidth, height = canvas2.clientHeight, dpr = Math.min(devicePixelRatio || 1, 1.5);
          if (!width || !height) return;
          const ready = map.complete && map.naturalWidth && art.complete && art.naturalWidth && (!extra || extra.complete && extra.naturalWidth);
          if (canvas2.width !== Math.round(width * dpr) || canvas2.height !== Math.round(height * dpr)) {
            canvas2.width = Math.round(width * dpr);
            canvas2.height = Math.round(height * dpr);
          }
          const cam = editorCamera({ width, height, worldWidth: currentWorld.width, worldHeight: currentWorld.height, focus: meta.focus, overview });
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.fillStyle = "#09130f";
          ctx.fillRect(0, 0, width, height);
          ctx.translate(width / 2, height / 2);
          ctx.scale(cam.zoom, cam.zoom);
          ctx.translate(-cam.x, -cam.y);
          if (map.complete && map.naturalWidth) ctx.drawImage(map, 0, 0, currentWorld.width, currentWorld.height);
          if (ready) {
            const actors = [];
            prepareSeasonalScene453({ theme, area, ...currentWorld, image: art, extraImage: extra, layout: latest.current.layout });
            drawSeasonalScene453(ctx, { theme, area, ...currentWorld, now: 0, image: art, extraImage: extra, cameraX: cam.x, cameraY: cam.y, viewWidth: width / cam.zoom, viewHeight: height / cam.zoom, reduced: true, still: true, layout: latest.current.layout }, actors);
            actors.sort((a2, b2) => a2.y - b2.y).forEach((a2) => a2.draw());
            const pick = latest.current.selected, current = latest.current.layout;
            if (pick && current) {
              ctx.strokeStyle = "#ffe9a2";
              ctx.fillStyle = "#ffe9a2";
              ctx.lineWidth = 2 / cam.zoom;
              ctx.setLineDash([6 / cam.zoom, 4 / cam.zoom]);
              if (pick.kind === "prop" && current.props[pick.index]) {
                const r2 = propRect(current.props[pick.index], currentWorld, currentRatios);
                ctx.strokeRect(r2.x - 4 / cam.zoom, r2.y - 4 / cam.zoom, r2.width + 8 / cam.zoom, r2.height + 8 / cam.zoom);
              } else if (pick.kind === "light" && current.lights[pick.index]) {
                const [ax, ay, bx, by, sag] = current.lights[pick.index];
                ctx.beginPath();
                ctx.moveTo(ax * currentWorld.width, ay * currentWorld.height);
                ctx.quadraticCurveTo((ax + bx) * currentWorld.width / 2, ((ay + by) / 2 + sag * 2) * currentWorld.height, bx * currentWorld.width, by * currentWorld.height);
                ctx.stroke();
                ctx.setLineDash([]);
                for (const [x2, y2] of [[ax, ay], [bx, by]]) {
                  ctx.beginPath();
                  ctx.arc(x2 * currentWorld.width, y2 * currentWorld.height, 5 / cam.zoom, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
              ctx.setLineDash([]);
            }
          }
        };
        const schedule = () => {
          if (alive && !frame && !document.hidden && visible) frame = requestAnimationFrame(paint);
        };
        paintRef.current = schedule;
        const loaded = () => {
          if (!alive) return;
          if (map.complete && map.naturalWidth && art.complete && art.naturalWidth && (!extra || extra.complete && extra.naturalWidth)) setStatus("ready");
          schedule();
        };
        const failed = () => {
          if (alive) setStatus("error");
        };
        map.onload = loaded;
        art.onload = loaded;
        map.onerror = failed;
        art.onerror = failed;
        if (extra) {
          extra.onload = loaded;
          extra.onerror = failed;
        }
        const observer = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (!visible) {
            window.cancelAnimationFrame(frame);
            frame = 0;
          } else schedule();
        });
        observer.observe(canvas2);
        const resize = new ResizeObserver(schedule);
        resize.observe(canvas2);
        const visibility = () => {
          if (document.hidden) {
            window.cancelAnimationFrame(frame);
            frame = 0;
            if (dragRef.current) {
              latest.current.onLayout?.(cloneLayout(dragRef.current.layout));
              const id = dragRef.current.pointerId;
              dragRef.current = null;
              if (canvas2.hasPointerCapture(id)) canvas2.releasePointerCapture(id);
            }
            window.cancelAnimationFrame(dragFrame.current);
            dragFrame.current = 0;
            pendingPoint.current = null;
          } else schedule();
        };
        document.addEventListener("visibilitychange", visibility);
        map.src = meta.asset;
        art.src = SEASONAL_ART[theme].asset;
        if (extra) extra.src = theme === "halloween" ? "/game/halloween-decor-v469.webp" : "/game/festival-new-year-extra-v453.webp";
        schedule();
        return () => {
          alive = false;
          paintRef.current = () => {
          };
          window.cancelAnimationFrame(frame);
          window.cancelAnimationFrame(dragFrame.current);
          dragFrame.current = 0;
          pendingPoint.current = null;
          const id = dragRef.current?.pointerId;
          dragRef.current = null;
          if (id !== void 0 && canvas2.hasPointerCapture(id)) canvas2.releasePointerCapture(id);
          map.onload = art.onload = null;
          map.onerror = art.onerror = null;
          if (extra) {
            extra.onload = extra.onerror = null;
          }
          observer.disconnect();
          resize.disconnect();
          document.removeEventListener("visibilitychange", visibility);
        };
      }, [theme, area, overview]);
      useEffect(() => {
        paintRef.current();
      }, [layout, selected]);
      return /* @__PURE__ */ React.createElement("figure", { className: "seasonal-preview-stage" }, /* @__PURE__ */ React.createElement("canvas", { ref, className: onLayout ? "seasonal-edit-canvas" : void 0, "aria-label": `${SEASONAL_ART[theme].label} \xB7 ${label} dekor yerle\u015Fimi`, onPointerDown: (event) => {
        if (!onLayout || disabled || status !== "ready" || dragRef.current || event.pointerType === "mouse" && event.button !== 0) return;
        event.preventDefault();
        const current = latest.current.layout;
        if (!current) return;
        const start = point(event), pick = hitDecoration(current, world, ratios, start, 12 / camera().zoom);
        latest.current.onSelect?.(pick);
        if (!pick) return;
        dragRef.current = beginDrag(event.pointerId, pick, current, start);
        event.currentTarget.setPointerCapture(event.pointerId);
      }, onPointerMove: (event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        event.preventDefault();
        pendingPoint.current = point(event);
        if (!dragFrame.current) dragFrame.current = requestAnimationFrame(() => {
          dragFrame.current = 0;
          const drag = dragRef.current, pending = pendingPoint.current;
          if (!drag || !pending) return;
          const next = dragPointer(drag, drag.pointerId, pending, world, ratios);
          if (next) latest.current.onLayout?.(next);
        });
      }, onPointerUp: (event) => finish(event), onPointerCancel: (event) => finish(event, true), onLostPointerCapture: (event) => {
        if (dragRef.current?.pointerId === event.pointerId) finish(event, true);
      } }), status !== "ready" && /* @__PURE__ */ React.createElement("div", { className: "seasonal-preview-status", role: "status" }, status === "error" ? "G\xF6rseller y\xFCklenemedi. Ba\u015Fka harita se\xE7ip yeniden deneyebilirsin." : "Harita ve s\xFCsler y\xFCkleniyor\u2026"), /* @__PURE__ */ React.createElement("figcaption", null, label, " \xB7 ", SEASONAL_ART[theme].label));
    }
    function SeasonalPanel({ settings, busy, act }) {
      const [preview, setPreview] = useState("first_light"), [area, setArea] = useState("bazaar"), [overview, setOverview] = useState(true), [drafts, setDrafts] = useState({}), [selected, setSelected] = useState(null), [note, setNote] = useState(""), [resetKeys, setResetKeys] = useState({});
      const key = `${preview}:${area}`, revision = decorRevision(preview, area, settings), base = useMemo(() => cloneLayout(decorLayout(preview, area, settings)), [revision, preview, area]);
      const draft = drafts[key] ?? makeDraft(base, revision), layout = draft.layout, ratios = ratiosFor(preview), world = areaWorld(area), catalog2 = catalog[preview];
      useEffect(() => {
        setDrafts((current) => ({ ...current, [key]: reconcileDraft(current[key], base, revision) }));
      }, [key, revision, base]);
      useEffect(() => {
        setSelected(null);
        setNote("");
      }, [key]);
      const change = (next, reset = false) => {
        setDrafts((current) => ({ ...current, [key]: { ...updateDraft(current[key] ?? makeDraft(base, revision), next), ...reset ? { dirty: true } : {} } }));
        setResetKeys((current) => ({ ...current, [key]: reset }));
      };
      const dirty = draft.dirty || Boolean(resetKeys[key]);
      const navigate = (set) => {
        setSelected(null);
        setNote("");
        set();
      };
      const save = async () => {
        const submitted = cloneLayout(layout), anchor = draft.expectedRevision;
        const response = await act(resetKeys[key] ? { action: "reset_decor_layout", theme: preview, area, expectedRevision: anchor } : { action: "set_decor_layout", theme: preview, area, props: submitted.props, lights: submitted.lights, expectedRevision: anchor });
        if (!response?.settings) {
          setNote("Kaydedilemedi. Tasla\u011F\u0131n korunuyor; canl\u0131 veriyi yenileyip tekrar kontrol et.");
          return;
        }
        const nextRevision = decorRevision(preview, area, response.settings);
        setDrafts((current) => ({ ...current, [key]: acknowledgeDraft(current[key] ?? draft, submitted, nextRevision) }));
        setResetKeys((current) => ({ ...current, [key]: false }));
        setNote("Yerle\u015Fim kaydedildi. Haritan\u0131n temas\u0131 a\xE7\u0131ksa oyuncular bu yerle\u015Fimi g\xF6r\xFCr.");
      };
      const defaults = () => {
        change(cloneLayout(defaultDecorLayout(preview, area)), true);
        setSelected(null);
        setNote("Varsay\u0131lan yerle\u015Fim tasla\u011Fa al\u0131nd\u0131. Uygulamak i\xE7in Kaydet.");
      };
      const cancel = () => {
        setDrafts((current) => ({ ...current, [key]: makeDraft(base, revision) }));
        setResetKeys((current) => ({ ...current, [key]: false }));
        setSelected(null);
        setNote("Bu haritan\u0131n kaydedilmemi\u015F de\u011Fi\u015Fiklikleri iptal edildi.");
      };
      const selectedProp = selected?.kind === "prop" ? layout.props[selected.index] : null;
      return /* @__PURE__ */ React.createElement("section", { className: "admin-card seasonal-maps-card" }, /* @__PURE__ */ React.createElement("h2", null, "Etkinlik G\xF6r\xFCn\xFCmleri"), /* @__PURE__ */ React.createElement("p", null, "Temay\u0131 ve haritay\u0131 se\xE7. S\xFCsleri fareyle veya parma\u011F\u0131nla s\xFCr\xFCkle; d\xFCzenin yaln\u0131z Kaydet d\xFC\u011Fmesiyle uygulan\u0131r."), /* @__PURE__ */ React.createElement("div", { className: "seasonal-theme-choices", role: "group", "aria-label": "Tema se\xE7imi" }, Object.entries(SEASONAL_ART).map(([id, art]) => /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, key: id, "aria-pressed": preview === id, onClick: () => navigate(() => setPreview(id)) }, /* @__PURE__ */ React.createElement("strong", null, art.label), /* @__PURE__ */ React.createElement("span", null, art.subtitle)))), /* @__PURE__ */ React.createElement("div", { className: "seasonal-preview-controls" }, /* @__PURE__ */ React.createElement("label", null, "Yerle\u015Fim haritas\u0131", /* @__PURE__ */ React.createElement("select", { disabled: busy, value: area, onChange: (e2) => navigate(() => setArea(e2.target.value)) }, SEASONAL_AREAS.map(([id, label]) => /* @__PURE__ */ React.createElement("option", { key: id, value: id }, label)), /* @__PURE__ */ React.createElement("option", { value: "guild_arena" }, "Lonca Sava\u015F\u0131 \xB7 Arena temas\u0131"))), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, "aria-pressed": overview, onClick: () => setOverview((v2) => !v2) }, overview ? "Yak\u0131ndan incele" : "Haritan\u0131n tamam\u0131n\u0131 g\xF6r")), /* @__PURE__ */ React.createElement(SeasonalPreview, { theme: preview, area, overview, layout, selected, disabled: busy || !settings, onLayout: change, onSelect: setSelected }), /* @__PURE__ */ React.createElement("div", { className: "seasonal-editor-toolbar" }, /* @__PURE__ */ React.createElement("span", null, layout.props.length, "/", MAX_PROPS, " s\xFCs \xB7 ", layout.lights.length, "/", MAX_LIGHTS, " \u0131\u015F\u0131k dizisi"), /* @__PURE__ */ React.createElement("strong", null, dirty ? "Kaydedilmemi\u015F de\u011Fi\u015Fiklikler" : "Kay\u0131tl\u0131 yerle\u015Fim")), /* @__PURE__ */ React.createElement("div", { className: "seasonal-decor-picker", role: "group", "aria-label": "S\xFCs ekle" }, catalog2.map((item, slot) => /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy || !settings || layout.props.length >= MAX_PROPS, key: slot, onClick: () => {
        const next = cloneLayout(layout);
        next.props.push([slot, 0.5, 0.52, item.size, item.wall ?? false]);
        change(next);
        setSelected({ kind: "prop", index: next.props.length - 1 });
      } }, item.label)), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy || !settings || layout.lights.length >= MAX_LIGHTS, onClick: () => {
        const next = cloneLayout(layout);
        next.lights.push([0.35, 0.4, 0.65, 0.4, 0.025]);
        change(next);
        setSelected({ kind: "light", index: next.lights.length - 1 });
      } }, "I\u015F\u0131k dizisi")), /* @__PURE__ */ React.createElement("div", { className: "seasonal-selected-decor" }, selected ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, selectedProp ? catalog2[selectedProp[0]]?.label ?? "S\xFCs" : "I\u015F\u0131k dizisi", " se\xE7ili"), selectedProp && /* @__PURE__ */ React.createElement("label", null, "Boyut ", /* @__PURE__ */ React.createElement("input", { "aria-label": "Se\xE7ili s\xFCs\xFCn boyutu", type: "range", min: "60", max: "320", step: "5", disabled: busy, value: selectedProp[3], onChange: (e2) => change(resizeProp(layout, selected.index, Number(e2.target.value), world, ratios)) }), /* @__PURE__ */ React.createElement("output", null, selectedProp[3])), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, onClick: () => {
        change(removeDecoration(layout, selected));
        setSelected(null);
      } }, "Se\xE7iliyi kald\u0131r")) : /* @__PURE__ */ React.createElement("span", null, "Ta\u015F\u0131mak veya boyutunu ayarlamak i\xE7in haritadaki bir s\xFCse dokun.")), /* @__PURE__ */ React.createElement("div", { className: "seasonal-editor-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "seasonal-save", disabled: busy || !settings || !dirty, onClick: () => void save() }, "Kaydet"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy || !dirty, onClick: cancel }, "\u0130ptal"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy || !settings, onClick: defaults }, "Varsay\u0131lan yerle\u015Fim"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy || !settings || !layout.props.length && !layout.lights.length, onClick: () => {
        change({ props: [], lights: [] });
        setSelected(null);
      } }, "S\xFCsleri temizle")), note && /* @__PURE__ */ React.createElement("p", { className: "seasonal-editor-feedback", role: "status" }, note), dirty && revision !== draft.expectedRevision && /* @__PURE__ */ React.createElement("p", { className: "seasonal-editor-feedback", role: "status" }, "Bu yerle\u015Fim ba\u015Fka bir y\xF6netici ekran\u0131nda de\u011Fi\u015Fti. Tasla\u011F\u0131n korunuyor; \u0130ptal ile son kayda d\xF6nebilirsin."), /* @__PURE__ */ React.createElement("p", { className: "seasonal-map-note" }, FESTIVAL_MAPS[area].note), /* @__PURE__ */ React.createElement("p", { className: "seasonal-preview-note" }, "Tema veya harita de\u011Fi\u015Ftirince tasla\u011F\u0131n korunur. S\xFCsler sava\u015F, hareket ve ganimet kurallar\u0131n\u0131 de\u011Fi\u015Ftirmez. Zindanlar ayn\u0131 kal\u0131r."), /* @__PURE__ */ React.createElement("div", { className: "seasonal-map-list" }, SEASONAL_AREAS.map(([id, label]) => /* @__PURE__ */ React.createElement("label", { key: id }, /* @__PURE__ */ React.createElement("span", null, label), /* @__PURE__ */ React.createElement("select", { "aria-label": label + " temas\u0131", disabled: busy || !settings, value: seasonalTheme(settings, id), onChange: (e2) => void act({ action: "set_map_theme", area: id, theme: e2.target.value, expectedTheme: seasonalTheme(settings, id) }) }, /* @__PURE__ */ React.createElement("option", { value: "none" }, "Kapal\u0131 \xB7 Normal harita"), Object.entries(SEASONAL_ART).map(([theme, art]) => /* @__PURE__ */ React.createElement("option", { key: theme, value: theme }, art.label)))))));
    }
    return { Panel: SeasonalPanel, Preview: SeasonalPreview };
  }
  return __toCommonJS(seasonal_editor453_exports);
})();
function createEventIslandAdmin444(React, { Composer, sendGm }) {
  const h2 = React.createElement;
  function Admin({ value, busy, act }) {
    const [draft, setDraft] = React.useState(() => structuredClone(value.config)), [revision, setRevision] = React.useState(value.revision), [status, setStatus] = React.useState(""), [working, setWorking] = React.useState(false);
    const request = React.useRef(null), dirty = React.useRef(false), inFlight448 = React.useRef(false);
    const [hpDraft448, setHpDraft448] = React.useState({});
    const hpText448 = (b2) => Object.hasOwn(hpDraft448, b2.kind) ? hpDraft448[b2.kind].value : String(value.config.hpOverrides?.[b2.kind] ?? b2.effectiveHp ?? b2.baseHp ?? "");
    const hpValid448 = (b2) => {
      const text = hpText448(b2);
      return /^\d+$/.test(text) && Number.isSafeInteger(Number(text)) && Number(text) >= 1 && Number(text) <= 1e8;
    };
    const hpNumber448 = (n2) => Number.isSafeInteger(Number(n2)) && Number(n2) > 0 ? Number(n2).toLocaleString("tr-TR") : "\u2014";
    React.useEffect(() => {
      if (!dirty.current) {
        setDraft(structuredClone(value.config));
        setRevision(value.revision);
      }
    }, [value.revision]);
    const set = (fn2) => {
      dirty.current = true;
      setDraft((old) => {
        const next = structuredClone(old);
        fn2(next);
        return next;
      });
    };
    const locked = busy || working, counts = [1, 2, 3].map((channel) => ({ channel, active: (value.active ?? []).filter((b2) => b2.channel === channel && b2.hp > 0).length, planned: draft.plan.filter((b2) => b2.channel === channel).reduce((sum, b2) => sum + Number(b2.count || 0), 0) }));
    const invalid = !Number.isSafeInteger(draft.maxBossesPerChannel) || draft.maxBossesPerChannel < 1 || draft.maxBossesPerChannel > 8 || draft.plan.some((row) => !Number.isSafeInteger(row.count) || row.count < 1 || row.count > 8) || counts.some((v2) => v2.active + v2.planned > draft.maxBossesPerChannel);
    const run = async (action, body) => {
      if (locked || inFlight448.current) return;
      inFlight448.current = true;
      setWorking(true);
      setStatus("");
      try {
        if (action !== "save_event_island") request.current ??= { action, id: Date.now() + "-" + crypto.randomUUID(), body: JSON.stringify(body) };
        if (request.current && (request.current.action !== action || request.current.body !== JSON.stringify(body))) request.current = { action, id: Date.now() + "-" + crypto.randomUUID(), body: JSON.stringify(body) };
        const result = await act({ action, ...body, ...action !== "save_event_island" ? { requestId: request.current.id } : {} });
        if (result) {
          request.current = null;
          if (result.eventIsland) {
            if (action === "set_event_island_hp") {
              setDraft((old) => ({ ...old, hpOverrides: structuredClone(result.eventIsland.config.hpOverrides ?? {}) }));
              setHpDraft448((old) => Object.fromEntries(Object.entries(old).filter(([kind]) => kind !== body.kind).map(([kind, row]) => [kind, row.revision === body.revision ? { ...row, revision: result.eventIsland.revision } : row])));
              if (!dirty.current || revision === body.revision) setRevision(result.eventIsland.revision);
            } else {
              dirty.current = false;
              setDraft(structuredClone(result.eventIsland.config));
              setRevision(result.eventIsland.revision);
            }
          }
          setStatus(result.message || "Etkinlik Adas\u0131 g\xFCncellendi.");
        } else setStatus("\u0130\u015Flem tamamlanmad\u0131. Hata mesaj\u0131n\u0131 kontrol et.");
      } catch (e2) {
        setStatus(e2.message || "\u0130\u015Flem tamamlanamad\u0131.");
      } finally {
        inFlight448.current = false;
        setWorking(false);
      }
    };
    const update = (index, key, v2) => set((d2) => {
      d2.plan[index][key] = key === "kind" ? v2 : Number(v2);
    });
    const button = (label, onClick, disabled = false) => h2("button", { type: "button", disabled: locked || disabled, onClick }, label);
    return h2(
      "section",
      { className: "event444-admin" },
      h2("style", null, `.event444-admin{display:grid;gap:18px;min-width:0;color:#e9f4ed}.event444-head{position:relative;overflow:hidden;border:1px solid #638478;border-radius:16px;padding:22px;background:#112a25}.event444-head img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.23;pointer-events:none}.event444-head>div{position:relative}.event444-head h2{margin:0 0 8px}.event444-head p{margin:0;max-width:720px}.event444-toolbar,.event444-summary{display:flex;flex-wrap:wrap;align-items:center;gap:12px}.event444-admin button{min-height:42px;padding:9px 15px;border:1px solid #907d47;border-radius:9px;background:#bc9a51;color:#161d15;font-weight:700}.event444-admin button:disabled{opacity:.45}.event444-admin input,.event444-admin select{min-height:42px;border:1px solid #45675c;border-radius:7px;padding:8px;background:#0c211c;color:#edf6ee;min-width:0;width:100%;font-size:16px}.event444-admin input[type=checkbox]{width:20px;min-height:20px;margin-right:10px}.event444-toolbar label{display:flex;align-items:center;gap:8px}.event444-toolbar input[type=number]{max-width:85px}.event444-summary span{padding:10px 14px;border:1px solid #45675c;border-radius:10px;background:#112921}.event444-plan{display:grid;gap:10px}.event444-plan-row{display:grid;grid-template-columns:minmax(170px,2fr) minmax(100px,1fr) 100px auto;gap:10px;align-items:end;border:1px solid #304d42;padding:12px;border-radius:10px}.event444-plan-row label{display:grid;gap:6px;font-size:13px}.event444-current{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;max-height:300px;overflow:auto}.event444-current article{background:#10261f;border-radius:9px;padding:12px}.event444-current small{display:block;color:#adcebf;margin-top:5px}.event444-alert{color:#f6ce87}.event444-gm{border-top:1px solid #405d50;padding-top:16px}.event444-actions{display:flex;flex-wrap:wrap;gap:10px}.event444-empty{color:#a8bfb3}.event448-hp{display:grid;gap:12px;min-width:0;border:1px solid #466c57;border-radius:12px;padding:16px;background:#10251d}.event448-hp h3,.event448-hp p{margin:0}.event448-hp>p{color:#b9d2c4;line-height:1.55}.event448-hp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px}.event448-hp-card{display:grid;gap:10px;min-width:0;padding:14px;background:#0b1d17;border:1px solid #355345;border-radius:10px}.event448-hp-card h4{margin:0;color:#f1dfad}.event448-hp-card dl{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 10px;margin:0;font-size:13px}.event448-hp-card dt{color:#b9d2c4}.event448-hp-card dd{margin:0;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.event448-hp-card label{display:grid;gap:6px;font-size:13px}.event448-hp-card input{box-sizing:border-box;min-height:44px}.event448-hp-card .event444-actions{align-items:stretch}.event448-hp-card button{min-height:44px;flex:1 1 auto}.event448-hp-card small{color:#b9d2c4}.event448-hp-card [role=alert]{color:#f6ce87;font-size:13px}@media(max-width:700px){.event448-hp{padding:12px}.event448-hp-grid{grid-template-columns:minmax(0,1fr)}.event448-hp-card{padding:12px}.event444-plan-row{grid-template-columns:minmax(0,1fr) 90px}.event444-plan-row label:first-child{grid-column:1/-1}.event444-head{padding:16px}.event444-summary{gap:7px}.event444-summary span{flex:1;padding:8px;font-size:13px}.event444-toolbar{align-items:flex-start;flex-direction:column}.event444-admin{gap:13px}}`),
      h2("header", { className: "event444-head" }, h2("img", { src: "/game/event-island-mobile-v444.webp", alt: "", loading: "lazy", decoding: "async" }), h2("div", null, h2("h2", null, "Etkinlik Adas\u0131"), h2("p", null, "Adan\u0131n kap\u0131lar\u0131n\u0131 a\xE7, bosslar\u0131n\u0131 se\xE7 ve her kanal\u0131n kar\u015F\u0131la\u015Fmas\u0131n\u0131 planla. Adet s\u0131n\u0131r\u0131 doluysa yeni boss g\xF6nderilmez."))),
      h2("div", { className: "event444-toolbar" }, h2("label", null, h2("input", { type: "checkbox", checked: !!draft.enabled, disabled: locked, onChange: (e2) => set((d2) => {
        d2.enabled = e2.target.checked;
      }) }), "Etkinlik Adas\u0131 a\xE7\u0131k"), h2("label", null, "Kanal ba\u015F\u0131na boss s\u0131n\u0131r\u0131", h2("input", { type: "number", min: 1, max: 8, step: 1, value: draft.maxBossesPerChannel, disabled: locked, onChange: (e2) => set((d2) => {
        d2.maxBossesPerChannel = Number(e2.target.value);
      }) })), button("Ayarlar\u0131 kaydet", () => run("save_event_island", { config: draft, revision }))),
      h2("p", { className: "event444-alert" }, "Ada kapat\u0131ld\u0131\u011F\u0131nda giri\u015F gizlenir, adadaki oyuncular g\xFCvenle Pazar K\xF6y\xFC\u2019ne d\xF6ner. G\xF6nderilen bosslar yeniden do\u011Fmaz. Zindan bosslar\u0131 burada a\xE7\u0131k alan sava\u015F d\xFCzeniyle d\xF6v\xFC\u015F\xFCr."),
      h2(
        "section",
        { className: "event448-hp", "aria-labelledby": "event448-hp-title" },
        h2("h3", { id: "event448-hp-title" }, "Etkinlik bosslar\u0131n\u0131n can\u0131"),
        h2("p", null, "Can ayar\u0131 yeni \xE7a\u011Fr\u0131lacak bosslara uygulan\u0131r. Yaln\u0131z Etkinlik Adas\u0131 i\xE7in ge\xE7erlidir; adadaki mevcut bosslar\u0131n can\u0131 ve di\u011Fer haritalar de\u011Fi\u015Fmez."),
        h2("div", { className: "event448-hp-grid" }, ...(value.catalog ?? []).map((b2) => {
          const input = hpText448(b2), valid = hpValid448(b2), changed = Object.hasOwn(hpDraft448, b2.kind), hasOverride = Object.hasOwn(value.config.hpOverrides ?? {}, b2.kind);
          return h2(
            "article",
            { className: "event448-hp-card", key: b2.kind },
            h2("h4", null, b2.name),
            h2("dl", null, h2("dt", null, "Kaynak boss can\u0131"), h2("dd", null, hpNumber448(b2.baseHp)), h2("dt", null, "Adada yeni do\u011Fu\u015F can\u0131"), h2("dd", null, hpNumber448(b2.effectiveHp)), h2("dt", null, "Can ayar\u0131"), h2("dd", null, hasOverride ? "Adaya \xF6zel" : "Varsay\u0131lan")),
            h2("label", { htmlFor: "event448-hp-" + b2.kind }, "Etkinlik Adas\u0131 can\u0131", h2("input", { id: "event448-hp-" + b2.kind, type: "number", inputMode: "numeric", min: 1, max: 1e8, step: 1, value: input, disabled: locked, "aria-invalid": !valid, "aria-label": b2.name + " etkinlik can\u0131", onChange: (e2) => {
              const text = e2.target.value;
              setHpDraft448((old) => ({ ...old, [b2.kind]: { value: text, revision: value.revision } }));
            } })),
            !valid && h2("p", { role: "alert" }, "1 ile 100.000.000 aras\u0131nda tam say\u0131 gir."),
            h2("div", { className: "event444-actions" }, button("Kaydet ve uygula", () => {
              if (!valid || !changed) return;
              return run("set_event_island_hp", { kind: b2.kind, hp: Number(input), revision: hpDraft448[b2.kind]?.revision ?? value.revision });
            }, !valid || !changed), button("Geri al", () => {
              if (!hasOverride) {
                setHpDraft448((old) => {
                  const next = { ...old };
                  delete next[b2.kind];
                  return next;
                });
                return;
              }
              return run("set_event_island_hp", { kind: b2.kind, hp: null, revision: value.revision });
            }, !hasOverride && !changed)),
            h2("small", null, "Geri al: yeni \xE7a\u011Fr\u0131lacak bosslar kaynak bossun can ayar\u0131n\u0131 kullan\u0131r.")
          );
        }))
      ),
      h2("div", { className: "event444-summary" }, ...counts.map((row) => h2("span", { key: row.channel }, h2("b", null, "Kanal " + row.channel), h2("br"), row.active + " aktif \xB7 " + row.planned + " planlanan / " + draft.maxBossesPerChannel))),
      h2("div", { className: "event444-plan" }, h2("h3", null, "Boss plan\u0131"), ...draft.plan.map((row, index) => h2("div", { className: "event444-plan-row", key: index }, h2("label", null, "Boss", h2("select", { value: row.kind, disabled: locked, onChange: (e2) => update(index, "kind", e2.target.value) }, ...(value.catalog ?? []).map((b2) => h2("option", { key: b2.kind, value: b2.kind }, b2.name)))), h2("label", null, "Kanal", h2("select", { value: row.channel, disabled: locked, onChange: (e2) => update(index, "channel", e2.target.value) }, ...[1, 2, 3].map((n2) => h2("option", { key: n2, value: n2 }, "Kanal " + n2)))), h2("label", null, "Adet", h2("input", { type: "number", min: 1, max: 8, step: 1, value: row.count, disabled: locked, onChange: (e2) => update(index, "count", e2.target.value) })), button("Kald\u0131r", () => {
        request.current = null;
        set((d2) => {
          d2.plan.splice(index, 1);
        });
      }))), !draft.plan.length && h2("p", { className: "event444-empty" }, "Hen\xFCz bir boss se\xE7ilmedi."), h2("div", { className: "event444-actions" }, button("+ Boss ekle", () => {
        request.current = null;
        set((d2) => {
          d2.plan.push({ kind: value.catalog[0]?.kind ?? "world", channel: 1, count: 1 });
        });
      }, draft.plan.length >= 21), button("Plan\u0131 adaya g\xF6nder", () => run("spawn_event_island", { plan: draft.plan }), !value.config.enabled || invalid || !draft.plan.length))),
      invalid && h2("p", { role: "alert", className: "event444-alert" }, "Plan\u0131n adetlerini ve kanal s\u0131n\u0131rlar\u0131n\u0131 kontrol et; aktif bosslar da s\u0131n\u0131ra dahildir."),
      status && h2("p", { role: "status" }, status),
      h2("h3", null, "Adadaki bosslar"),
      h2("div", { className: "event444-current" }, ...(value.active ?? []).filter((b2) => b2.hp > 0).map((b2) => h2("article", { key: b2.id }, h2("strong", null, b2.name), h2("small", null, "Kanal " + b2.channel + " \xB7 " + Number(b2.hp).toLocaleString("tr-TR") + " / " + Number(b2.max_hp).toLocaleString("tr-TR") + " can")))),
      !(value.active ?? []).some((b2) => b2.hp > 0) && h2("p", { className: "event444-empty" }, "Adada ya\u015Fayan boss yok."),
      h2("div", { className: "event444-actions" }, ...[1, 2, 3].map((channel) => button("Kanal " + channel + " bosslar\u0131n\u0131 kald\u0131r", () => run("clear_event_island", { channel }), !counts[channel - 1].active))),
      h2("div", { className: "event444-gm" }, h2("h3", null, "GM duyurusu"), h2("p", null, "Etkinlik mesaj\u0131n\u0131 oyunculara buradan yay\u0131nla."), h2(Composer, { author: "Oyun Y\xF6netimi", send: (body, requestId, durationSeconds) => sendGm({ action: "announce", body, requestId, durationSeconds }) }))
    );
  }
  return { Admin };
}
const EMERALD_SET444 = Object.freeze({ name: "Kadim Z\xFCmr\xFCt Seti", slots: ["weapon", "armor", "helmet", "shoes", "necklace"], bonuses: { hp: 1e3, pve: 10, pvp: 10, resistance: 0, speed: 12, attack: 50 } });
function emeraldName444(kind, role) {
  return kind === "weapon" ? { muhafiz: "Kadim Z\xFCmr\xFCt H\xFCk\xFCmk\u0131l\u0131c\u0131", avci: "Kadim Z\xFCmr\xFCt Ufuk Yay\u0131", arkanist: "Kadim Z\xFCmr\xFCt \xD6z Asas\u0131" }[role] ?? "Kadim Z\xFCmr\xFCt H\xFCk\xFCmk\u0131l\u0131c\u0131" : { armor: "Kadim Z\xFCmr\xFCt Z\u0131rh\u0131", helmet: "Kadim Z\xFCmr\xFCt Tac\u0131", necklace: "Kadim Z\xFCmr\xFCt Kalbi", shoes: "Kadim Z\xFCmr\xFCt \xC7izmeleri" }[kind] ?? "Kadim Z\xFCmr\xFCt";
}
function emeraldPower444(kind, settings = {}) {
  if (kind === "weapon") return 350;
  if (kind === "armor") return 300;
  const unique = Math.max(1, Number(settings[kind === "weapon" ? "unique_weapon_power" : "unique_armor_power"]) || (kind === "weapon" ? 180 : 150));
  const percent = Number.isFinite(Number(settings.infinite_power_percent)) ? Math.max(0, Number(settings.infinite_power_percent)) : 30;
  const weaponBase = Math.max(1, Number(settings.infinite_weapon_power) || 230);
  const infinite = globalThis.__colDragonBoss?.infinitePower?.({ kind, power: unique }) ?? (kind === "weapon" && unique <= 180 ? Math.max(unique, weaponBase) : kind === "weapon" ? Math.max(unique, Math.round(unique * (1 + percent / 100)), weaponBase) : Math.round(unique * (1 + percent / 100)));
  return Math.min(1e5, Math.ceil(infinite * 1.15));
}
const EMERALD_CATALOG444 = ["muhafiz", "avci", "arkanist"].flatMap((role) => ["weapon", "armor", "helmet", "necklace", "shoes"].map((kind) => ({ id: `gear:${role}:${kind}:emerald`, name: emeraldName444(kind, role), type: "gear", kind, role, rarity: "emerald", group: "Kadim Z\xFCmr\xFCt" })));
function emeraldIconStyle444(kind, role) {
  if (kind === "armor") return { display: "inline-block", flexShrink: 0, backgroundImage: "url(/game/emerald-armor-v447.webp)", backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" };
  const col = kind === "weapon" ? Math.max(0, ["muhafiz", "avci", "arkanist"].indexOf(role)) : Math.max(0, ["helmet", "necklace", "shoes"].indexOf(kind));
  return { display: "inline-block", flexShrink: 0, backgroundImage: "url(/game/emerald-set-v447.webp)", backgroundSize: "300% 200%", backgroundPosition: `${col * 50}% ${kind === "weapon" ? 0 : 100}%`, backgroundRepeat: "no-repeat" };
}
function emeraldGroundArt444(drop) {
  if (drop.kind === "armor") return { src: "/game/emerald-armor-v447.webp", columns: 1, rows: 1, col: 0, row: 0, glyph: "\u25C6", label: drop.item_name ?? emeraldName444("armor", drop.role), color: "#39c889", rarity: "emerald" };
  return { src: "/game/emerald-set-v447.webp", columns: 3, rows: 2, col: drop.kind === "weapon" ? Math.max(0, ["muhafiz", "avci", "arkanist"].indexOf(drop.role)) : Math.max(0, ["helmet", "necklace", "shoes"].indexOf(drop.kind)), row: drop.kind === "weapon" ? 0 : 1, glyph: "\u25C6", label: drop.item_name ?? emeraldName444(drop.kind, drop.role), color: "#39c889", rarity: "emerald" };
}
function emeraldGrantFields444(current, change, settings = {}) {
  const next = { ...current, ...change };
  if (next.rarity !== "emerald") return next;
  return { ...next, itemName: emeraldName444(next.kind, next.role), power: emeraldPower444(next.kind, settings) };
}
import {createQuestsAdminR70 as createQuestsAdmin438} from './core511-quests-r70-2792b663bdaba7a3.js';
export function createLaunchModeUI438(React, fetcher = fetch) {
  const h2 = React.createElement;
  const opening478 = Date.parse("2026-10-23T20:00:00+03:00");
  const options = [
    ["scheduled", "23 Ekim · Otomatik açılış", "Cuma 20.00’da (T\xFCrkiye saati) oyuncu eri\u015Fimi kendili\u011Finden a\xE7\u0131l\u0131r ve a\xE7\u0131k kal\u0131r. Kay\u0131tlar \u015Fimdiden al\u0131nabilir."],
    ["closed", "Elle kapal\u0131 \xB7 \xD6n kay\u0131t", "Oyuncu eri\u015Fimi kapal\u0131 kal\u0131r; saya\xE7 dolsa da otomatik a\xE7\u0131lmaz. \u0130zinli hesaplar\u0131n test eri\u015Fimi korunur."],
    ["open", "Oyun a\xE7\u0131k", "Ziyaret\xE7iler kay\u0131t olabilir veya hesaplar\u0131na giri\u015F yapabilir."],
    ["maintenance", "Bak\u0131m modu", "Oyundaki herkes, y\xF6neticiler dahil, 10 saniyelik uyar\u0131dan sonra bak\u0131m ekran\u0131na al\u0131n\u0131r. Y\xF6netim paneline eri\u015Fim korunur."]
  ];
  return function LaunchModePanel438() {
    const [draft, setDraft] = React.useState(null), [busy, setBusy] = React.useState(false), [notice, setNotice] = React.useState("");
    const mounted = React.useRef(false), lock = React.useRef(false);
    const [tick,setTick]=React.useState(Date.now());
    React.useEffect(()=>{const timer=setInterval(()=>setTick(Date.now()),1000);return()=>clearInterval(timer);},[]);
    const left=Math.max(0,Math.ceil(((draft?.public_opens_at||opening478)-tick)/1000));
    const countdown=left?Math.floor(left/86400)+' gün '+String(Math.floor(left/3600)%24).padStart(2,'0')+':'+String(Math.floor(left/60)%60).padStart(2,'0')+':'+String(left%60).padStart(2,'0'):'Açılış zamanı geldi';
    React.useEffect(() => {
      mounted.current = true;
      let current = true;
      const controller = new AbortController();
      fetcher("/api/admin/launch", { cache: "no-store", signal: controller.signal }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw Error(data.error || "Durum al\u0131namad\u0131.");
        if (current) setDraft(data.settings);
      }).catch((error) => {
        if (current && error.name !== "AbortError") setNotice(error.message);
      });
      return () => {
        current = false;
        mounted.current = false;
        controller.abort();
      };
    }, []);
    const mode = draft?.mode === "maintenance" ? "maintenance" : draft?.mode === "open" || draft?.enabled === 0 ? "open" : draft?.mode === "scheduled" && draft?.public_opens_at > 0 ? "scheduled" : "closed";
    const save = async () => {
      if (lock.current || !draft) return;
      lock.current = true;
      setBusy(true);
      setNotice("");
      try {
        const response = await fetcher("/api/admin/launch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", settings: { ...draft, enabled: 1, mode } }) });
        const data = await response.json();
        if (!response.ok) throw Error(data.error || "Durum kaydedilemedi.");
        if (mounted.current) {
          setDraft(data.settings);
          setNotice(mode === "maintenance" ? "Bak\u0131m kaydedildi. Oyundaki oyuncular sunucunun 10 saniyelik s\xFCresi dolunca bak\u0131m ekran\u0131na al\u0131n\u0131r." : "Oyun durumu kaydedildi.");
        }
      } catch (error) {
        if (mounted.current) setNotice(error.message);
      } finally {
        lock.current = false;
        if (mounted.current) setBusy(false);
      }
    };
    return h2(
      "section",
      { className: "admin-card status438-panel status491fix1-panel" },
      h2("div", { className: "status491fix1-heading" }, h2("h2", null, "Oyun Durumu"), h2("p", null, "A\xE7\u0131l\u0131\u015F ekran\u0131n\u0131 ve oyuncu eri\u015Fimini y\xF6net. De\u011Fi\u015Fiklikler Kaydet d\xFC\u011Fmesine bast\u0131\u011F\u0131nda uygulan\u0131r.")),
      draft && h2(
        React.Fragment,
        null,
        h2("div", { className: "status491fix1-options", role: "group", "aria-label": "Oyun durumu" }, ...options.map(([id, label, description]) => h2(
          "button",
          { key: id, type: "button", className: "status491fix1-option", disabled: busy, "aria-pressed": mode === id, onClick: () => {
            if (!lock.current) setDraft({ ...draft, enabled: 1, mode: id, ...id === "scheduled" ? { public_opens_at: opening478 } : {} });
          } },
          h2("span", { className: "status491fix1-option-title" }, h2("span", { className: "status491fix1-choice", "aria-hidden": true }, mode === id ? "\u2713" : ""), h2("strong", null, label)),
          h2("small", null, description)
        ))),
        mode === "scheduled" && h2("p", { className: "status491fix1-info" }, "23 Ekim 2026 Cuma, 20.00 · Türkiye saati. Açılışa: "+countdown+". Öncesinde yalnız izin verdiğin hesaplar oyuna girebilir."),
        h2("label", { className: "status491fix1-label" }, "Bak\u0131m a\xE7\u0131klamas\u0131", h2("textarea", { value: draft.maintenance_text ?? "", rows: 4, maxLength: 2e3, disabled: busy, placeholder: "Oyuncular\u0131n bak\u0131m ekran\u0131nda g\xF6rece\u011Fi a\xE7\u0131klamay\u0131 yaz\u2026", onChange: (event) => {
          if (!lock.current) setDraft({ ...draft, maintenance_text: event.target.value });
        } })),
        h2("p", { className: "status491fix1-hint" }, "Kaydetti\u011Fin a\xE7\u0131klama a\xE7\u0131k bak\u0131m ekranlar\u0131nda yakla\u015F\u0131k 5 saniyede yenilenir."),
        h2("div", { className: "status491fix1-footer" }, h2("button", { type: "button", className: "status491fix1-save", disabled: busy, onClick: save }, busy ? "Kaydediliyor\u2026" : "Durumu ve a\xE7\u0131klamay\u0131 kaydet"))
      ),
      notice && h2("p", { className: "status491fix1-notice", role: "status" }, notice),
      !draft && !notice && h2("p", null, "Durum y\xFCkleniyor\u2026")
    );
  };
}
function createBattlePassAdmin434(React) {
  const h2 = React.createElement;
  const fmt = (n2) => Number(n2 || 0).toLocaleString("tr-TR");
  const clone = (config) => ({ ...config, tiers: (config?.tiers || []).map((tier) => ({ ...tier, free: tier.free ? { ...tier.free } : null, premium: tier.premium ? { ...tier.premium } : null })) });
  const defaults = () => ({ enabled: false, title: "Kadim Miras", price: 1e3, durationDays: 20, tiers: Array.from({ length: 30 }, (_2, i2) => ({ id: i2 + 1, xp: Math.ceil(2e5 * (i2 + 1) / 30), free: null, premium: null })) });
  const integer = (value) => value === "" ? NaN : Number(value);
  const maxAmount = (item) => item?.id === "resource:core_coins" ? 1e5 : ["resource", "material", "stone"].includes(item?.type) ? 1e4 : 1;
  const powerDefault = (item) => item?.type === "rune" ? 1 : { white: 10, blue: 20, orange: 35, red: 50, purple: 70, unique: 90, infinite: 100, emerald: 265 }[item?.rarity] || 10;
  const date = (value) => {
    const n2 = Number(value);
    return n2 > 0 ? new Date(n2 < 1e12 ? n2 * 1e3 : n2).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "Hen\xFCz ba\u015Flamad\u0131";
  };
  function Mark() {
    return h2("svg", { viewBox: "0 0 48 48", fill: "none", "aria-hidden": true }, h2("path", { d: "M24 3 40 12v21L24 45 8 33V12L24 3Z", stroke: "currentColor", strokeWidth: 1.8 }), h2("path", { d: "m24 10 9 14-9 14-9-14 9-14Zm0 0v28M15 24h18", stroke: "currentColor", strokeWidth: 1.4 }), h2("path", { d: "m7 20-4 4 4 4m34-8 4 4-4 4", stroke: "currentColor", strokeWidth: 1.5 }));
  }
  function Admin({ value, busy, act }) {
    const [draft, setDraft] = React.useState(() => clone(value?.config || defaults()));
    const [revision, setRevision] = React.useState(value?.revision);
    const [count, setCount] = React.useState(() => value?.config?.tiers?.length || 30);
    const [finalXp, setFinalXp] = React.useState(() => value?.config?.tiers?.at(-1)?.xp || 2e5);
    const [editing, setEditing] = React.useState("");
    const [message, setMessage] = React.useState("");
    const [error, setError] = React.useState("");
    const [saving, setSaving] = React.useState(false);
    const [confirmStart, setConfirmStart] = React.useState(false);
    const [accepted469, setAccepted469] = React.useState(null);
    const [confirmStop469, setConfirmStop469] = React.useState(null);
    const mounted469 = React.useRef(true);
    React.useEffect(() => {
      mounted469.current = true;
      return () => {
        mounted469.current = false;
      };
    }, []);
    const currentValue469 = accepted469 && Number(accepted469.revision) > Number(value?.revision ?? -1) ? accepted469 : value;
    const latest469 = React.useRef(currentValue469);
    latest469.current = currentValue469;
    const dirty = React.useRef(false), lock = React.useRef(false);
    const catalog = value?.catalog || [];
    const items = React.useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);
    const groups = React.useMemo(() => {
      const out = /* @__PURE__ */ new Map();
      for (const item of catalog) {
        const key = item.group || "Di\u011Fer";
        if (!out.has(key)) out.set(key, []);
        out.get(key).push(item);
      }
      return [...out];
    }, [catalog]);
    const season = currentValue469?.season;
    const active = season?.status === "active" || season?.status === "paused";
    const locked = !!busy || saving;
    const coins = draft.tiers.reduce((sum, tier) => sum + (tier.premium?.itemId === "resource:core_coins" ? Number(tier.premium.amount) || 0 : 0), 0);
    const freeCoins = draft.tiers.reduce((sum, tier) => sum + (tier.free?.itemId === "resource:core_coins" ? Number(tier.free.amount) || 0 : 0), 0);
    const accept = (settings) => {
      setAccepted469(settings);
      setConfirmStop469(null);
      dirty.current = false;
      setDraft(clone(settings.config));
      setRevision(settings.revision);
      setCount(settings.config.tiers.length);
      setFinalXp(settings.config.tiers.at(-1)?.xp || 2e5);
      setEditing("");
      setConfirmStart(false);
    };
    React.useEffect(() => {
      if (currentValue469?.config && !dirty.current) accept(currentValue469);
    }, [value?.revision]);
    const change = (next) => {
      dirty.current = true;
      setDraft((old) => typeof next === "function" ? next(old) : { ...old, ...next });
      setError("");
      setMessage("Kaydedilmemi\u015F de\u011Fi\u015Fiklikler var.");
      setConfirmStart(false);
    };
    const changeTier = (id, key, reward) => change((old) => ({ ...old, tiers: old.tiers.map((tier) => tier.id === id ? { ...tier, [key]: reward } : tier) }));
    const fail = (text) => {
      setError(text);
      setMessage("");
    };
    function validate() {
      if (!draft.title?.trim() || draft.title.trim().length > 64) throw Error("Sezon ad\u0131 1\u201364 karakter olmal\u0131.");
      if (!Number.isSafeInteger(integer(draft.price)) || draft.price < 1 || draft.price > 1e6) throw Error("Bilet fiyat\u0131 1\u20131.000.000 \xC7P aras\u0131nda tam say\u0131 olmal\u0131.");
      if (!Number.isSafeInteger(integer(draft.durationDays)) || draft.durationDays < 1 || draft.durationDays > 365) throw Error("Sezon s\xFCresi 1\u2013365 g\xFCn aras\u0131nda olmal\u0131.");
      if (!draft.tiers.length || draft.tiers.length > 100) throw Error("Kademe say\u0131s\u0131 1\u2013100 aras\u0131nda olmal\u0131.");
      let previous = -1;
      for (const tier of draft.tiers) {
        if (!Number.isSafeInteger(integer(tier.xp)) || tier.xp < 1 || tier.xp <= previous || tier.xp > 9e12) throw Error(tier.id + ". kademenin toplam tecr\xFCbe hedefi \xF6nceki kademeden b\xFCy\xFCk olmal\u0131.");
        previous = tier.xp;
        if (!tier.free && !tier.premium) throw Error(tier.id + ". kademeye en az bir \xF6d\xFCl ekle.");
        for (const track of ["premium", "free"]) {
          const reward = tier[track];
          if (!reward) continue;
          const item = items.get(reward.itemId);
          if (!item) throw Error(tier.id + ". kademede ge\xE7erli bir \xF6d\xFCl se\xE7.");
          if (!Number.isSafeInteger(integer(reward.amount)) || reward.amount < 1 || reward.amount > maxAmount(item)) throw Error(tier.id + ". kademedeki " + item.name + " adedi 1\u2013" + fmt(maxAmount(item)) + " aras\u0131nda olmal\u0131.");
          if (["gear", "rune"].includes(item.type) && (!Number.isSafeInteger(integer(reward.power)) || reward.power < (item.type === "rune" ? 1 : 0) || reward.power > 1e5)) throw Error(tier.id + ". kademedeki e\u015Fya g\xFCc\xFC / r\xFCn seviyesi ge\xE7ersiz.");
        }
      }
      return { ...draft, title: draft.title.trim() };
    }
    async function save() {
      if (lock.current || locked) return;
      let config;
      try {
        config = validate();
      } catch (e2) {
        fail(e2.message);
        return;
      }
      lock.current = true;
      setSaving(true);
      setError("");
      try {
        const result = await act({ action: "battle_pass_save", config, revision });
        if (result?.battlePass) {
          accept(result.battlePass);
          setMessage("Sezon tasla\u011F\u0131 kaydedildi. Ba\u015Flang\u0131\xE7 d\xFC\u011Fmesine bas\u0131lmadan yeni sezon a\xE7\u0131lmaz.");
        } else fail("Taslak kaydedilemedi. Y\xF6netim bildirimindeki a\xE7\u0131klamay\u0131 kontrol et; de\u011Fi\u015Fikliklerin burada duruyor.");
      } catch (e2) {
        fail(e2.message || "Taslak kaydedilemedi.");
      } finally {
        lock.current = false;
        setSaving(false);
      }
    }
    async function start() {
      if (lock.current || locked || dirty.current || active) return;
      lock.current = true;
      setSaving(true);
      setError("");
      try {
        const result = await act({ action: "battle_pass_start", revision });
        if (result?.battlePass) {
          accept(result.battlePass);
          setMessage("Sezon ba\u015Flad\u0131. Oyuncular Nesne Market > Sava\u015F Bileti b\xF6l\xFCm\xFCnden kat\u0131labilir.");
        } else fail("Sezon ba\u015Flat\u0131lamad\u0131. Y\xF6netim bildirimindeki a\xE7\u0131klamay\u0131 kontrol et.");
      } catch (e2) {
        fail(e2.message || "Sezon ba\u015Flat\u0131lamad\u0131.");
      } finally {
        lock.current = false;
        setSaving(false);
      }
    }
    function openStop469() {
      if (lock.current || locked || !active || !season?.id) return;
      if (confirmStop469) {
        setConfirmStop469(null);
        return;
      }
      try {
        setConfirmStart(false);
        setError("");
        setConfirmStop469({ seasonId: season.id, revision: currentValue469.revision, title: season.title || season.config?.title || "Sava\u015F Bileti", requestId: globalThis.crypto.randomUUID() });
      } catch {
        fail("\u0130\u015Flem kimli\u011Fi olu\u015Fturulamad\u0131. Paneli yenileyip tekrar dene.");
      }
    }
    async function stop469() {
      const token = confirmStop469, current = latest469.current;
      if (!token || lock.current || locked) return;
      if (current?.season?.id !== token.seasonId || current?.revision !== token.revision || !["active", "paused"].includes(current?.season?.status)) {
        setConfirmStop469(null);
        fail("Sezon bilgileri de\u011Fi\u015Fti. G\xFCncel sezonu kontrol edip yeniden onayla.");
        return;
      }
      lock.current = true;
      setSaving(true);
      setError("");
      try {
        const result = await act({ action: "battle_pass_end", seasonId: token.seasonId, revision: token.revision, requestId: token.requestId });
        if (!mounted469.current) return;
        const settings = result?.battlePass, latest = latest469.current;
        if (!settings?.config || settings.season?.id !== token.seasonId || settings.season?.status !== "ended" || !Number.isSafeInteger(settings.revision) || settings.revision < token.revision) {
          fail("Sezon durdurulamad\u0131. Y\xF6netim bildirimindeki a\xE7\u0131klamay\u0131 kontrol et; ayn\u0131 onayla tekrar deneyebilirsin.");
          return;
        }
        if (Number(latest?.revision) > settings.revision || Number(latest?.revision) >= settings.revision && latest?.season?.id !== settings.season.id) {
          setConfirmStop469(null);
          fail("Sezon bilgileri bu s\u0131rada de\u011Fi\u015Fti. G\xFCncel durumu kontrol et.");
          return;
        }
        if (dirty.current) {
          setAccepted469(settings);
          if (revision === token.revision) setRevision(settings.revision);
          setConfirmStop469(null);
          setConfirmStart(false);
        } else accept(settings);
        setMessage(dirty.current ? "Sezon durduruldu. Tasla\u011F\u0131n korunuyor; kaydettikten sonra yeni sezonu hemen ba\u015Flatabilirsin." : "Sezon durduruldu. Haz\u0131r taslakla yeni sezonu hemen ba\u015Flatabilirsin.");
      } catch (e2) {
        if (mounted469.current) fail(e2.message || "Sezon durdurulamad\u0131. Ayn\u0131 onayla tekrar deneyebilirsin.");
      } finally {
        lock.current = false;
        if (mounted469.current) setSaving(false);
      }
    }
    function resize() {
      const n2 = integer(count);
      if (!Number.isSafeInteger(n2) || n2 < 1 || n2 > 100) return fail("Kademe say\u0131s\u0131 1\u2013100 aras\u0131nda olmal\u0131.");
      change((old) => {
        const last = old.tiers.at(-1)?.xp || 0, step = Math.max(1, Math.ceil(last / Math.max(1, old.tiers.length)));
        return { ...old, tiers: Array.from({ length: n2 }, (_2, i2) => old.tiers[i2] || { id: i2 + 1, xp: last + step * (i2 + 1 - old.tiers.length), free: null, premium: null }) };
      });
      setEditing("");
    }
    function spread() {
      const n2 = integer(finalXp);
      if (!Number.isSafeInteger(n2) || n2 < draft.tiers.length || n2 > 9e12) return fail("Son hedef, kademe say\u0131s\u0131ndan k\xFC\xE7\xFCk olmayan bir tam say\u0131 olmal\u0131 (en fazla 9 trilyon).");
      change((old) => ({ ...old, tiers: old.tiers.map((tier, i2) => ({ ...tier, xp: Math.ceil(n2 * (i2 + 1) / old.tiers.length) })) }));
    }
    function Reward({ tier, track }) {
      const reward = tier[track], item = reward && items.get(reward.itemId), key = tier.id + ":" + track;
      const open = editing === key;
      return h2(
        "div",
        { className: "bp434-reward-cell " + track },
        h2("small", { className: "bp434-track-label" }, track === "premium" ? "PREMIUM" : "\xDCCRETS\u0130Z"),
        h2(
          "button",
          { className: "bp434-reward-pick", type: "button", disabled: locked, "aria-expanded": open, "aria-label": tier.id + ". kademe " + (track === "premium" ? "premium" : "\xFCcretsiz") + " \xF6d\xFCl\xFCn\xFC d\xFCzenle", onClick: () => setEditing(open ? "" : key) },
          h2("span", { className: "bp434-reward-icon", "aria-hidden": true }, item?.image ? h2("img", { src: item.image, alt: "", loading: "lazy", decoding: "async" }) : item?.id === "resource:core_coins" ? "\xC7P" : h2(Mark)),
          h2("span", null, h2("strong", null, item?.name || (reward ? "Se\xE7ilen e\u015Fya" : "\xD6d\xFCl se\xE7")), h2("small", null, reward ? fmt(reward.amount) + " adet" + (item?.type === "rune" ? " \xB7 Sv. " + reward.power : item?.type === "gear" ? " \xB7 G\xFC\xE7 " + reward.power : "") : "Bu kademede \xF6d\xFCl yok")),
          h2("span", { className: "bp434-edit-label" }, open ? "Kapat" : "D\xFCzenle")
        ),
        open && h2(
          "div",
          { className: "bp434-reward-editor" },
          h2("label", null, "\xD6d\xFCl", h2("select", { value: reward?.itemId || "", disabled: locked, onChange: (e2) => {
            const next = items.get(e2.target.value);
            changeTier(tier.id, track, next ? { itemId: next.id, amount: 1, ...["gear", "rune"].includes(next.type) ? { power: powerDefault(next) } : {} } : null);
          } }, h2("option", { value: "" }, "\xD6d\xFCl yok"), ...groups.map(([name, list]) => h2("optgroup", { key: name, label: name }, ...list.map((x2) => h2("option", { key: x2.id, value: x2.id }, x2.name)))))),
          reward && item && h2("div", { className: "bp434-reward-inputs" }, h2("label", null, "Adet", h2("input", { type: "number", inputMode: "numeric", min: 1, max: maxAmount(item), step: 1, value: reward.amount, disabled: locked || maxAmount(item) === 1, onChange: (e2) => changeTier(tier.id, track, { ...reward, amount: e2.target.value === "" ? "" : Number(e2.target.value) }) })), ["gear", "rune"].includes(item.type) && h2("label", null, item.type === "rune" ? "R\xFCn seviyesi" : "E\u015Fya g\xFCc\xFC", h2("input", { type: "number", inputMode: "numeric", min: item.type === "rune" ? 1 : 0, max: 1e5, step: 1, value: reward.power ?? powerDefault(item), disabled: locked, onChange: (e2) => changeTier(tier.id, track, { ...reward, power: e2.target.value === "" ? "" : Number(e2.target.value) }) })))
        )
      );
    }
    if (!value?.config) return h2("section", { className: "bp434-admin" }, h2("h2", null, "Sava\u015F Bileti"), h2("p", { role: "status" }, "Bilet ayarlar\u0131 y\xFCkleniyor\u2026"));
    return h2(
      "section",
      { className: "bp434-admin" },
      h2("header", { className: "bp434-admin-hero" }, h2("div", { className: "bp434-admin-mark" }, h2(Mark)), h2("div", null, h2("small", null, "CORE OF LIFE \xB7 SEZON Y\xD6NET\u0130M\u0130"), h2("h2", null, "Sava\u015F Bileti"), h2("p", null, "Oynad\u0131k\xE7a ilerle. Her kademede yeni bir \xF6d\xFCl."))),
      season?.id && h2("section", { className: "bp434-live-season" }, h2("div", null, h2("small", null, "YAYINDAK\u0130 SEZON"), h2("strong", null, season.title || season.config?.title || "Sava\u015F Bileti"), h2("span", { className: "bp434-state " + (active ? "active" : "") }, { active: "Sezon a\xE7\u0131k", paused: "Eri\u015Fim kapal\u0131", ended: "Sona erdi", draft: "Taslak" }[season.status] || "Taslak")), h2("p", null, "Ba\u015Flang\u0131\xE7: ", date(season.startsAt), h2("br"), "Biti\u015F: ", date(season.endsAt)), h2("small", null, "Yay\u0131ndaki sezonun \xF6d\xFClleri, hedefleri ve s\xFCresi korunur. A\u015Fa\u011F\u0131daki taslak bir sonraki sezon i\xE7indir.")),
      h2("div", { className: "bp434-admin-heading" }, h2("div", null, h2("h3", null, "Yeni sezon ayarlar\u0131"), h2("p", null, "Tecr\xFCbe hedefleri sezon boyunca kazan\u0131lan toplam puand\u0131r; her kademede s\u0131f\u0131rlanmaz.")), h2("span", { className: "bp434-state" }, dirty.current ? "Kaydedilmedi" : "Taslak")),
      h2("div", { className: "bp434-admin-stats" }, ...[[fmt(draft.price) + " \xC7P", "Bilet fiyat\u0131"], [draft.durationDays + " g\xFCn", "Sezon s\xFCresi"], [draft.tiers.length, "\xD6d\xFCl kademesi"], [fmt(coins) + " \xC7P", "Premium geri kazan\u0131m"]].map(([number, label]) => h2("div", { key: label }, h2("strong", null, number), h2("small", null, label)))),
      h2(
        "div",
        { className: "bp434-admin-fields" },
        h2("label", { className: "bp434-name" }, "Sezon ad\u0131", h2("input", { value: draft.title, maxLength: 64, disabled: locked, onChange: (e2) => change({ title: e2.target.value }) })),
        h2("label", null, "Premium fiyat\u0131 \xB7 \xC7P", h2("input", { type: "number", inputMode: "numeric", min: 1, max: 1e6, value: draft.price, disabled: locked, onChange: (e2) => change({ price: e2.target.value === "" ? "" : Number(e2.target.value) }) })),
        h2("label", null, "Sezon s\xFCresi \xB7 g\xFCn", h2("input", { type: "number", inputMode: "numeric", min: 1, max: 365, value: draft.durationDays, disabled: locked, onChange: (e2) => change({ durationDays: e2.target.value === "" ? "" : Number(e2.target.value) }) }))
      ),
      h2("div", { className: "bp434-enabled" }, h2("span", null, h2("strong", null, "\xD6nce tasarla, sonra sezonu a\xE7"), h2("small", null, "Tasla\u011F\u0131 kaydetmek sezonu ba\u015Flatmaz. S\xFCre, \xF6d\xFCller ve tecr\xFCbe hedefleri \u201CSezonu ba\u015Flat\u201D ile o sezon i\xE7in sabitlenir."))),
      h2(
        "div",
        { className: "bp434-tier-tools" },
        h2("div", null, h2("label", null, "Kademe say\u0131s\u0131", h2("input", { type: "number", inputMode: "numeric", min: 1, max: 100, value: count, disabled: locked, onChange: (e2) => setCount(e2.target.value === "" ? "" : Number(e2.target.value)) })), h2("button", { type: "button", disabled: locked || Number(count) === draft.tiers.length, onClick: resize }, "Say\u0131s\u0131n\u0131 uygula")),
        h2("div", null, h2("label", null, "Son \xF6d\xFCl i\xE7in toplam tecr\xFCbe", h2("input", { type: "number", inputMode: "numeric", min: draft.tiers.length, max: 9e12, value: finalXp, disabled: locked, onChange: (e2) => setFinalXp(e2.target.value === "" ? "" : Number(e2.target.value)) })), h2("button", { type: "button", disabled: locked, onClick: spread }, "Hedefleri e\u015Fit da\u011F\u0131t"))
      ),
      h2("p", { className: "bp434-admin-note" }, "Her hedefi ve iki hatt\u0131n \xF6d\xFCl\xFCn\xFC a\u015Fa\u011F\u0131dan ayr\u0131 ayr\u0131 de\u011Fi\u015Ftirebilirsin. Premium \xC7P toplam\u0131 \xF6d\xFCllerden hesaplan\u0131r; ilk sezon \xF6nerisi 300 \xC7P.", freeCoins > 0 ? " \xDCcretsiz hatta ayr\u0131ca " + fmt(freeCoins) + " \xC7P var." : ""),
      h2("div", { className: "bp434-tier-list" }, ...draft.tiers.map((tier) => h2("article", { className: "bp434-tier-row", key: tier.id }, h2("div", { className: "bp434-tier-target" }, h2("span", { className: "bp434-tier-number" }, String(tier.id).padStart(2, "0")), h2("label", null, "Toplam tecr\xFCbe", h2("input", { type: "number", inputMode: "numeric", min: 1, max: 9e12, step: 1, value: tier.xp, disabled: locked, "aria-label": tier.id + ". kademe toplam tecr\xFCbe", onChange: (e2) => changeTier(tier.id, "xp", e2.target.value === "" ? "" : Number(e2.target.value)) }))), Reward({ tier, track: "premium" }), Reward({ tier, track: "free" })))),
      h2(
        "footer",
        { className: "bp434-admin-footer" },
        error && h2("p", { role: "alert", className: "bp434-admin-error" }, error),
        message && h2("p", { role: "status", className: "bp434-admin-message" }, message),
        currentValue469?.revision !== revision && dirty.current && h2("p", { className: "bp434-admin-error" }, "Canl\u0131 ayarlar ba\u015Fka bir i\u015Flemde de\u011Fi\u015Fti. Tasla\u011F\u0131n korunuyor. Kaydetmeden \xF6nce canl\u0131 tasla\u011F\u0131 y\xFCkleyip yeniden d\xFCzenle."),
        h2("div", { className: "bp434-admin-actions" }, h2("button", { type: "button", disabled: locked || !dirty.current, onClick: () => {
          accept(currentValue469);
          setError("");
          setMessage("Kaydedilmi\u015F taslak y\xFCklendi.");
        } }, "Kaydedilmi\u015F tasla\u011F\u0131 y\xFCkle"), h2("button", { type: "button", className: "bp434-primary", disabled: locked || !dirty.current, onClick: save }, saving ? "\u0130\u015Fleniyor\u2026" : "Tasla\u011F\u0131 kaydet"), h2("button", { type: "button", className: "bp434-start", disabled: locked || dirty.current || active, onClick: () => setConfirmStart((v2) => !v2) }, "Sezonu ba\u015Flat")),
        active && h2("div", { className: "bp434-admin-actions" }, h2("button", { type: "button", className: "bp434-start", disabled: locked, onClick: openStop469 }, "Sezonu Durdur")),
        active && h2("small", null, "Yeni sezonu hemen ba\u015Flatmak i\xE7in yay\u0131ndaki sezonu \xF6nce durdurabilirsin."),
        confirmStop469 && h2("div", { className: "bp434-start-confirm" }, h2("strong", null, confirmStop469.title, " sezonu durdurulsun mu?"), h2("p", null, "Bu sezonun s\xFCresi \u015Fimdi sona erer; yeni sezon ilerlemesi ve bilet sat\u0131\u015F\u0131 kapan\u0131r. Kazan\u0131lm\u0131\u015F \xF6d\xFCller yeni sezon ba\u015Flayana kadar al\u0131nabilir. Yeni sezonu ba\u015Flatt\u0131\u011F\u0131nda eski sezonun \xF6d\xFCl alma d\xF6nemi de kapan\u0131r."), h2("div", null, h2("button", { type: "button", disabled: locked, onClick: () => setConfirmStop469(null) }, "Vazge\xE7"), h2("button", { type: "button", className: "bp434-primary", disabled: locked, onClick: stop469 }, saving ? "\u0130\u015Fleniyor\u2026" : "Evet, sezonu durdur"))),
        confirmStart && h2("div", { className: "bp434-start-confirm" }, h2("strong", null, draft.title, " sezonu a\xE7\u0131ls\u0131n m\u0131?"), h2("p", null, draft.durationDays, " g\xFCnl\xFCk s\xFCre \u015Fimdi ba\u015Flayacak. ", draft.tiers.length, " kademe, ", fmt(draft.price), " \xC7P premium fiyat\u0131 ve ", fmt(coins), " \xC7P geri kazan\u0131m bu sezon i\xE7in sabitlenir."), h2("div", null, h2("button", { type: "button", disabled: locked, onClick: () => setConfirmStart(false) }, "Vazge\xE7"), h2("button", { type: "button", className: "bp434-primary", disabled: locked, onClick: start }, "Evet, sezonu a\xE7")))
      )
    );
  }
  return { Admin };
}
function colSlowWorkView504(row, flags, now) {
  const source = row?.slowWork504;
  if (flags?.slowWork === false || source?.enabled !== true) return null;
  const measured = Number.isFinite(now) ? now : source.measuredAtMs;
  if (!Number.isFinite(measured)) return null;
  const name = (value) => typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,96}$/.test(value) ? value : "unattributed";
  const validTime = (value) => Number.isFinite(value) && value >= measured - 9e5 && value <= measured + 1e3;
  const safeGc = (value) => ({ count: Number.isInteger(value?.count) && value.count >= 0 ? value.count : 0, totalMs: Number.isFinite(value?.totalMs) && value.totalMs >= 0 ? value.totalMs : 0, maxMs: Number.isFinite(value?.maxMs) && value.maxMs >= 0 ? value.maxMs : 0 });
  const events = (list) => (Array.isArray(list) ? list : []).filter((x2) => x2 && Number.isFinite(x2.startedAtMs) && x2.startedAtMs <= measured + 1e3 && Number.isFinite(x2.durationMs) && x2.durationMs >= 0 && x2.startedAtMs + x2.durationMs > measured - 9e5 && (x2.kind === "gc" || x2.durationMs > 50)).map((x2) => ({ name: name(x2.name), kind: x2.kind === "gc" ? "gc" : "job", startedAtMs: x2.startedAtMs, durationMs: x2.durationMs }));
  const top = events(source.top).sort((a2, b2) => b2.durationMs - a2.durationMs || b2.startedAtMs - a2.startedAtMs).slice(0, 10);
  const intervals = (Array.isArray(source.busyWindows) ? source.busyWindows : []).filter((x2) => x2 && validTime(x2.endedAtMs) && Number.isFinite(x2.startedAtMs) && x2.startedAtMs <= x2.endedAtMs && Number.isFinite(x2.loopUtilization) && x2.loopUtilization > 0.9 && x2.loopUtilization <= 1).sort((a2, b2) => b2.endedAtMs - a2.endedAtMs).slice(0, 8).map((x2) => ({ startedAtMs: x2.startedAtMs, endedAtMs: x2.endedAtMs, loopUtilization: x2.loopUtilization, gc: safeGc(x2.gc), top: (Array.isArray(x2.top) ? x2.top : []).filter((y2) => y2 && Number.isFinite(y2.totalMs) && y2.totalMs >= 0 && Number.isFinite(y2.maxMs) && y2.maxMs >= 0 && Number.isInteger(y2.count) && y2.count >= 0).sort((a2, b2) => b2.totalMs - a2.totalMs).slice(0, 5).map((y2) => ({ name: name(y2.name), totalMs: y2.totalMs, maxMs: y2.maxMs, count: y2.count })) }));
  const gc = source.gc ?? {};
  return { top, intervals, gc: { ...safeGc(gc), recent: events(gc.recent).slice(0, 10) }, droppedEvents: Number.isInteger(source.droppedEvents) && source.droppedEvents >= 0 ? source.droppedEvents : 0, droppedGc: Number.isInteger(source.droppedGc) && source.droppedGc >= 0 ? source.droppedGc : 0, stale: row.status !== "live" };
}
function colPlayerCount504(row, flags) {
  if (flags?.channelCounts === false || !/^channel-[1-3]$/.test(row?.key ?? "")) return null;
  if (flags?.channelCounts !== true && !row.online504) return null;
  const online = row.online504, n2 = online?.count;
  return online?.status === "live" && online.capacity === 25 && Number.isSafeInteger(n2) && n2 >= 0 ? String(n2) + " / 25" : "\u2014 / 25";
}
function colSlowWorkCard504(h2, row, flags, now, fmt) {
  const view = colSlowWorkView504(row, flags, now);
  if (!view) return null;
  const stamp = (n2) => new Date(n2).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const list = (rows) => h2("ol", { style: { paddingLeft: 18, margin: "8px 0", fontSize: 12 } }, ...rows.map((x2, i2) => h2("li", { key: i2, style: { marginBottom: 5, overflowWrap: "anywhere" } }, h2("strong", null, x2.kind === "gc" ? "GC \xB7 " + x2.name : x2.name), " \xB7 ", fmt(x2.durationMs), " ms \xB7 ", h2("time", { dateTime: new Date(x2.startedAtMs).toISOString() }, stamp(x2.startedAtMs)))));
  return h2(
    "details",
    { className: "col-slow504", style: { borderTop: "1px solid #385346", marginTop: 10, paddingTop: 10, textAlign: "left" } },
    h2("summary", { style: { cursor: "pointer", fontSize: 12 } }, "Kaydedilen i\u015Fler \xB7 Son 15 dk", view.stale ? " \xB7 Son kay\u0131t" : ""),
    h2("p", { style: { fontSize: 11, margin: "8px 0" } }, "En uzun 10 i\u015F. \xD6l\xE7\xFCm, kaydedilen e\u015Fzamanl\u0131 \xE7al\u0131\u015Fma s\xFCresidir; bekleme ve t\xFCm CPU i\u015Fi de\u011Fildir. \u0130\xE7 i\xE7e i\u015Fler ve GC s\xFCreleri \xF6rt\xFC\u015Febilir; toplanmaz."),
    view.top.length ? list(view.top) : h2("p", { style: { fontSize: 12 } }, "50 ms \xFCzerinde kaydedilen i\u015F yok."),
    h2("p", { style: { fontSize: 11 } }, "GC: ", view.gc.count, " duraklama \xB7 toplam ", fmt(view.gc.totalMs), " ms \xB7 en uzun ", fmt(view.gc.maxMs), " ms"),
    view.gc.recent.length > 0 && h2("details", null, h2("summary", { style: { fontSize: 11, cursor: "pointer" } }, "Son GC duraklamalar\u0131"), list(view.gc.recent)),
    h2("strong", { style: { fontSize: 12 } }, "ELU %90 \xFCzeri aral\u0131klar"),
    view.intervals.length ? view.intervals.map((x2, i2) => h2("details", { key: i2, style: { marginTop: 7 } }, h2("summary", { style: { fontSize: 11, cursor: "pointer" } }, stamp(x2.startedAtMs), "\u2013", stamp(x2.endedAtMs), " \xB7 %", fmt(x2.loopUtilization * 100)), h2("ul", { style: { paddingLeft: 17, fontSize: 11 } }, ...x2.top.map((y2, j2) => h2("li", { key: j2, style: { overflowWrap: "anywhere" } }, y2.name, " \xB7 ", fmt(y2.totalMs), " ms toplam \xB7 ", y2.count, " kez \xB7 en uzun ", fmt(y2.maxMs), " ms"))), h2("p", { style: { fontSize: 11 } }, "Aral\u0131ktaki GC: ", x2.gc.count, " \xB7 ", fmt(x2.gc.totalMs), " ms \xB7 en uzun ", fmt(x2.gc.maxMs), " ms"), !x2.top.length && h2("p", { style: { fontSize: 11 } }, "Bu aral\u0131kta ad\u0131 belirlenen i\u015F yok."))) : h2("p", { style: { fontSize: 11 } }, "Kaydedilen y\xFCksek yo\u011Funluk aral\u0131\u011F\u0131 yok."),
    view.droppedEvents > 0 && h2("small", null, "Bellek s\u0131n\u0131r\u0131 nedeniyle elenen kay\u0131t: ", view.droppedEvents),
    view.droppedGc > 0 && h2("small", { style: { display: "block" } }, "GC kay\u0131t s\u0131n\u0131r\u0131na ula\u015F\u0131ld\u0131; bu toplam yaln\u0131z saklanan duraklamalar\u0131 i\xE7erir.")
  );
}
function createLoadUI430(React, { fetcher = (...args) => globalThis.fetch(...args) } = {}) {
  const h2 = React.createElement, fmt = (n2) => n2 === null || n2 === void 0 ? "\u2014" : Number(n2).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
  function profileComponent507({ React: React2, fetcher: fetcher2 }) {
    const h3 = React2.createElement, [target, setTarget] = React2.useState("main"), [state, setState] = React2.useState({ state: "idle" }), [error, setError] = React2.useState(""), [busy, setBusy] = React2.useState(false), [refresh, setRefresh] = React2.useState(0);
    const running = ["starting", "recording", "finishing"].includes(state.state);
    React2.useEffect(() => {
      let stopped = false, timer = null, controller = null;
      async function poll() {
        controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7e3);
        try {
          const r2 = await fetcher2("/api/admin?cpu_profile507=status", { cache: "no-store", signal: controller.signal });
          if (!r2.ok) throw Error("Profil durumu al\u0131namad\u0131.");
          const value = await r2.json();
          if (!stopped) {
            setState(value);
            setError("");
            if (["starting", "recording", "finishing"].includes(value.state)) timer = setTimeout(poll, 2e3);
          }
        } catch (e2) {
          if (!stopped) setError("Profil durumu al\u0131namad\u0131. Durumu yenileyebilirsin.");
        } finally {
          clearTimeout(timeout);
        }
      }
      void poll();
      return () => {
        stopped = true;
        clearTimeout(timer);
        controller?.abort();
      };
    }, [refresh]);
    async function start() {
      setBusy(true);
      setError("");
      try {
        const r2 = await fetcher2("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "cpu_profile507", target }), signal: AbortSignal.timeout(1e4) });
        const value = await r2.json();
        if (!r2.ok) throw Error(value.error ?? "Profil ba\u015Flat\u0131lamad\u0131.");
        setState(value);
        setRefresh((n2) => n2 + 1);
      } catch (e2) {
        setError(e2.message ?? "Profil ba\u015Flat\u0131lamad\u0131.");
        setRefresh((n2) => n2 + 1);
      } finally {
        setBusy(false);
      }
    }
    const label = state.target === "main" ? "Ana i\u015Flem" : /^channel-[1-3]$/.test(state.target ?? "") ? "Kanal " + state.target.slice(-1) : "";
    return h3(
      "div",
      { className: "col-profile507", style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", margin: "12px 0", padding: 12, border: "1px solid #385346", borderRadius: 10 } },
      h3("label", { style: { display: "flex", alignItems: "center", gap: 8 } }, "Profil al\u0131nacak s\xFCre\xE7", h3("select", { "aria-label": "Profil al\u0131nacak s\xFCre\xE7", value: target, disabled: busy || running, onChange: (e2) => setTarget(e2.target.value), style: { width: "auto", padding: "6px 10px" } }, h3("option", { value: "main" }, "Ana i\u015Flem"), ...[1, 2, 3].map((i2) => h3("option", { key: i2, value: "channel-" + i2 }, "Kanal " + i2)))),
      h3("button", { type: "button", disabled: busy || running, onClick: start }, busy ? "Ba\u015Flat\u0131l\u0131yor\u2026" : "60 saniyelik i\u015Flemci profili"),
      running && h3("span", { role: "status" }, label + " \xB7 Profil al\u0131n\u0131yor \xB7 " + Math.max(0, Math.ceil(((state.endsAtMs ?? Date.now()) - Date.now()) / 1e3)) + " sn"),
      state.state === "ready" && h3("a", { href: "/api/admin?cpu_profile507=download&id=" + encodeURIComponent(state.id), download: true, style: { textDecoration: "underline" } }, label + " \xB7 .cpuprofile indir"),
      ["failed", "expired"].includes(state.state) && h3("span", { role: "status" }, state.state === "expired" ? "Profilin saklama s\xFCresi doldu." : "Profil tamamlanamad\u0131; s\xFCre\xE7 kapanm\u0131\u015F olabilir."),
      error && h3("span", { role: "alert" }, error),
      h3("button", { type: "button", disabled: busy, onClick: () => setRefresh((n2) => n2 + 1) }, "Durumu yenile"),
      h3("small", { style: { flexBasis: "100%" } }, "Yaln\u0131z \xF6l\xE7\xFCm s\u0131ras\u0131nda ek y\xFCk olu\u015Fturur. Ayn\u0131 anda tek s\xFCre\xE7 \xF6l\xE7\xFCl\xFCr; haz\u0131r dosya 5 dakika saklan\u0131r.")
    );
  }
  function Panel() {
    const [data, setData] = React.useState(null), [error, setError] = React.useState("");
    React.useEffect(() => {
      let stopped = false, timer = null, inflight = null, sequence = 0;
      async function refresh() {
        if (stopped || document.visibilityState === "hidden" || inflight) return;
        const controller = new AbortController(), id = ++sequence;
        inflight = controller;
        const timeout = setTimeout(() => controller.abort(), 5e3);
        try {
          const response = await fetcher("/api/admin?load=1", { cache: "no-store", signal: controller.signal });
          if (!response.ok) throw Error(response.status === 403 ? "Y\xF6netici oturumu gerekli." : "\xD6l\xE7\xFCmler al\u0131namad\u0131.");
          const next = await response.json();
          if (!Array.isArray(next.rows)) throw Error("\xD6l\xE7\xFCm hen\xFCz haz\u0131r de\u011Fil.");
          if (!stopped && id === sequence) {
            setData(next);
            setError("");
          }
        } catch (e2) {
          if (!stopped && id === sequence) {
            setData(null);
            setError("\xD6l\xE7\xFCmler yenilenemedi; tekrar deneniyor.");
          }
        } finally {
          clearTimeout(timeout);
          if (inflight === controller) inflight = null;
          if (!stopped && document.visibilityState !== "hidden" && id === sequence) timer = setTimeout(refresh, 2e3);
        }
      }
      function visibility() {
        clearTimeout(timer);
        sequence++;
        inflight?.abort();
        inflight = null;
        if (document.visibilityState === "hidden") {
          setData(null);
          setError("");
        } else void refresh();
      }
      document.addEventListener("visibilitychange", visibility);
      void refresh();
      return () => {
        stopped = true;
        sequence++;
        clearTimeout(timer);
        inflight?.abort();
        document.removeEventListener("visibilitychange", visibility);
      };
    }, []);
    const rows = data?.rows ?? [{ key: "main", label: "Ana i\u015Flem" }, ...[1, 2, 3].map((i2) => ({ key: "channel-" + i2, label: "Kanal " + i2 })), { key: "realtime", label: "Realtime" }];
    return h2(
      "section",
      { className: "admin-card col-load430", "aria-label": "Canl\u0131 i\u015Flem y\xFCk\xFC" },
      h2("header", null, h2("div", null, h2("small", null, "SUNUCU \u0130\u015ELEMLER\u0130"), h2("h2", null, "Canl\u0131 i\u015Flem y\xFCk\xFC")), h2("span", { className: "col-load430-live" }, data ? "\u25CF 2 sn \xF6l\xE7\xFCm" : "\u25CF \xD6l\xE7\xFCm bekleniyor")),
      h2(profileComponent507, { React, fetcher }),
      h2("p", null, "Ana i\u015Flem, her kanal ve realtime ayr\u0131 \xF6l\xE7\xFCl\xFCr. \u0130\u015Flem yo\u011Funlu\u011Fu, son 2 saniyede olay d\xF6ng\xFCs\xFCn\xFCn me\u015Fgul kald\u0131\u011F\u0131 payd\u0131r; VDS toplam CPU y\xFCzdesi veya oyuncu pingi de\u011Fildir."),
      h2("div", { className: "col-load430-grid" }, ...rows.map((r2) => {
        const live = r2.status === "live", level = !live ? "unknown" : r2.busyPercent >= 85 ? "high" : r2.busyPercent >= 60 ? "medium" : "low";
        return h2(
          "article",
          { key: r2.key, "data-load": level },
          h2("div", { className: "col-load430-title" }, h2("strong", null, r2.label), h2("small", null, !live ? r2.status === "unavailable" ? "Ula\u015F\u0131lam\u0131yor" : "\xD6l\xE7\xFCm bekleniyor" : level === "high" ? "Y\xFCksek" : level === "medium" ? "Artm\u0131\u015F" : "D\xFC\u015F\xFCk")),
          h2("div", { className: "col-load430-number" }, fmt(r2.busyPercent), h2("span", null, "%")),
          h2("span", { className: "col-load430-label" }, "\u0130\u015Flem yo\u011Funlu\u011Fu"),
          h2("div", { className: "col-load430-meter", role: "meter", "aria-label": r2.label + " i\u015Flem yo\u011Funlu\u011Fu", "aria-valuemin": 0, "aria-valuemax": 100, ...live ? { "aria-valuenow": r2.busyPercent } : {} }, h2("i", { style: { width: (r2.busyPercent ?? 0) + "%" } })),
          h2("dl", null, h2("div", null, h2("dt", null, "D\xF6ng\xFC gecikmesi"), h2("dd", null, fmt(r2.loopDelayMs) + " ms")), h2("div", null, h2("dt", null, "Bellek \xB7 RSS"), h2("dd", null, fmt(r2.memoryMb) + " MB")), colPlayerCount504(r2, data?.flags504) !== null && h2("div", null, h2("dt", null, "Oyuncu say\u0131s\u0131"), h2("dd", null, colPlayerCount504(r2, data?.flags504)))),
          colSlowWorkCard504(h2, r2, data?.flags504, data?.measuredAtMs, fmt)
        );
      })),
      h2("small", { className: "col-load430-note" }, "Gecikme: son \xF6l\xE7\xFCm aral\u0131\u011F\u0131ndaki en b\xFCy\xFCk d\xF6ng\xFC duraklamas\u0131. Renkler yaln\u0131z yo\u011Funlu\u011Fu \xF6zetler; tek ba\u015F\u0131na lag kan\u0131t\u0131 de\u011Fildir. Panel g\xF6r\xFCn\xFCrken yenilenir."),
      error && h2("p", { role: "status", className: "col-load430-error" }, error)
    );
  }
  return { Panel };
}
const colStatusModel429 = /* @__PURE__ */ (() => {
  const STATUS_CAP = 64;
  const STATUS_FIELDS = ["attack", "defense", "hp"];
  const STATUS_TYPES = { attack: { label: "G\xFC\xE7", effect: "Sald\u0131r\u0131", color: "#ff8c86", icon: "sword" }, defense: { label: "Diren\xE7", effect: "Savunma", color: "#85bdff", icon: "shield" }, hp: { label: "Canl\u0131l\u0131k", effect: "Maksimum can", color: "#7ae8b4", icon: "heart" } };
  function defaultStatusConfig() {
    return { enabled: true, attack: 10, defense: 10, hp: 12 };
  }
  function validateStatusConfig(input) {
    if (!input || typeof input.enabled !== "boolean") throw Error("Stat\xFC ayar\u0131 ge\xE7ersiz.");
    const out = { enabled: input.enabled };
    for (const k2 of STATUS_FIELDS) {
      const n2 = input[k2];
      if (typeof n2 !== "number" || !Number.isFinite(n2) || n2 < 0 || n2 > 30) throw Error("Stat\xFC bonuslar\u0131 %0\u201330 aras\u0131nda olmal\u0131.");
      out[k2] = Math.round(n2 * 100) / 100;
    }
    return out;
  }
  function statusBudget(level) {
    return Math.max(0, Math.min(65, Math.floor(Number(level) || 1)) - 1) * 3;
  }
  function statusBonus(player, stat, config) {
    if (!config?.enabled || !player) return 0;
    const a2 = Math.max(0, Math.min(64, Number(player.stat_attack) || 0)), d2 = Math.max(0, Math.min(64, Number(player.stat_defense) || 0)), h2 = Math.max(0, Math.min(64, Number(player.stat_hp) || 0));
    const sum = a2 + d2 + h2, ratio = Math.min(1, statusBudget(player.level) / Math.max(1, sum));
    return (stat === "attack" ? a2 : stat === "defense" ? d2 : h2) * ratio / 64 * (Number(config[stat]) || 0) / 100;
  }
  function validateStatusPoints(input, level) {
    const out = {};
    for (const k2 of STATUS_FIELDS) {
      const n2 = input?.[k2];
      if (!Number.isInteger(n2) || n2 < 0 || n2 > 64) throw Error("Her stat\xFC 0\u201364 tam puan olmal\u0131.");
      out[k2] = n2;
    }
    if (out.attack + out.defense + out.hp > statusBudget(level)) throw Error("Yeterli stat\xFC puan\u0131n yok.");
    return out;
  }
  return { STATUS_CAP, STATUS_FIELDS, STATUS_TYPES, defaultStatusConfig, validateStatusConfig, statusBudget, statusBonus, validateStatusPoints };
})();
function createStatusUI429(React, { fetcher, post, Button = "button" }) {
  const h2 = React.createElement, M2 = colStatusModel429, T2 = M2.STATUS_TYPES, fmt = (n2) => Number(n2).toLocaleString("tr-TR", { maximumFractionDigits: 3 });
  function Icon({ kind = "attack" }) {
    const paths = { attack: "M14 3h7v7l-9 9-7-7 9-9ZM3 21l5-5M3 13l8 8M14 3l7 7", defense: "M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7l-9-4Zm0 5v9m-4-5h8", hp: "M12 21C8 17 2 13 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 5-6 9-10 13Z" };
    return h2("svg", { viewBox: "0 0 24 24", width: 24, height: 24, fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true }, h2("path", { d: paths[kind] }));
  }
  function Entry({ own, onChanged }) {
    const [open, setOpen] = React.useState(false), [state, setState] = React.useState(null), [draft, setDraft] = React.useState(null), [busy, setBusy] = React.useState(false), [error, setError] = React.useState(""), [message, setMessage] = React.useState("");
    const dialog = React.useRef(null), lock = React.useRef(false), generation = React.useRef(0);
    React.useEffect(() => {
      if (!open) return;
      const d2 = dialog.current;
      if (d2 && !d2.open) d2.showModal();
      const close = () => setOpen(false);
      window.addEventListener("coreoflife:bot-check", close);
      return () => {
        window.removeEventListener("coreoflife:bot-check", close);
        if (d2?.open) d2.close();
      };
    }, [open]);
    React.useEffect(() => {
      if (!open) return;
      const abort = new AbortController(), version = ++generation.current;
      setState(null);
      setDraft(null);
      setError("");
      setMessage("");
      fetcher("/api/ranks?view=status", { cache: "no-store", signal: abort.signal }).then(async (r2) => {
        const data = await r2.json();
        if (!r2.ok) throw Error(data.error || "Stat\xFCler al\u0131namad\u0131.");
        if (version !== generation.current) return;
        setState(data);
        setDraft({ ...data.points });
      }).catch((e2) => {
        if (e2.name !== "AbortError" && version === generation.current) setError(e2.message);
      });
      return () => {
        generation.current++;
        abort.abort();
      };
    }, [open, own?.id]);
    const available = state && draft ? state.total - draft.attack - draft.defense - draft.hp : 0;
    const dirty = !!state && !!draft && M2.STATUS_FIELDS.some((k2) => state.points[k2] !== draft[k2]);
    const change = (key, n2) => {
      if (busy) return;
      setMessage("");
      setDraft((old) => {
        const spare = state.total - old.attack - old.defense - old.hp, next = Math.max(0, Math.min(64, old[key] + Math.min(n2, spare)));
        return { ...old, [key]: n2 < 0 ? Math.max(0, old[key] + n2) : next };
      });
    };
    const save = async () => {
      if (lock.current || !state || !draft) return;
      lock.current = true;
      setBusy(true);
      setError("");
      setMessage("");
      const version = generation.current;
      try {
        const r2 = await post("/api/ranks", { action: "status_allocate", points: draft, revision: state.revision, settingsRevision: state.settings.revision });
        if (version === generation.current) {
          setState(r2.state);
          setDraft({ ...r2.state.points });
          setMessage("Stat\xFC puanlar\u0131n uyguland\u0131.");
        }
        await onChanged?.();
      } catch (e2) {
        if (version === generation.current) setError(e2.message || "Puanlar kaydedilemedi.");
      } finally {
        lock.current = false;
        setBusy(false);
      }
    };
    return h2(React.Fragment, null, h2(Button, { type: "button", className: "status429-entry", onPointerDown: (e2) => e2.stopPropagation(), onClick: (e2) => {
      e2.stopPropagation();
      setOpen(true);
    } }, h2(Icon, {}), " Stat\xFC"), open && h2(
      "dialog",
      { ref: dialog, className: "status429-dialog", "aria-labelledby": "status429-title", onCancel: () => setOpen(false), onClose: () => setOpen(false), onPointerDown: (e2) => e2.stopPropagation(), onClick: (e2) => e2.stopPropagation() },
      h2("header", null, h2("div", null, h2("small", null, "KARAKTER GEL\u0130\u015E\u0130M\u0130"), h2("h2", { id: "status429-title" }, "Stat\xFC")), h2("button", { type: "button", onClick: () => setOpen(false), "aria-label": "Stat\xFC penceresini kapat" }, "\xD7")),
      error && h2("p", { className: "status429-error", role: "alert" }, error),
      !state && !error && h2("p", { role: "status" }, "Stat\xFC puanlar\u0131 al\u0131n\u0131yor\u2026"),
      state && draft && h2(
        React.Fragment,
        null,
        h2("div", { className: "status429-summary" }, h2("span", null, "Seviye ", state.level), h2("strong", null, available, " bo\u015F puan"), h2("span", null, "Toplam ", state.total)),
        !state.settings.config.enabled && h2("p", { role: "status" }, "Stat\xFC sistemi y\xF6netim taraf\u0131ndan kapat\u0131ld\u0131."),
        h2("div", { className: "status429-grid" }, ...M2.STATUS_FIELDS.map((key) => {
          const item = T2[key], percent = draft[key] / 64 * state.settings.config[key];
          return h2("section", { key, className: "status429-card", style: { "--status-color": item.color } }, h2("div", { className: "status429-icon" }, h2(Icon, { kind: key })), h2("h3", null, item.label), h2("small", null, item.effect), h2("b", { className: "status429-bonus" }, "+%", fmt(percent)), h2("div", { className: "status429-track" }, h2("i", { style: { width: draft[key] / 64 * 100 + "%" } })), h2("div", { className: "status429-counter" }, h2("button", { type: "button", disabled: busy || draft[key] <= 0 || !state.settings.config.enabled, onClick: () => change(key, -1), "aria-label": item.label + " puan\u0131n\u0131 azalt" }, "\u2212"), h2("strong", null, draft[key], h2("small", null, " / 64")), h2("button", { type: "button", disabled: busy || available <= 0 || draft[key] >= 64 || !state.settings.config.enabled, onClick: () => change(key, 1), "aria-label": item.label + " puan\u0131n\u0131 art\u0131r" }, "+")), h2("button", { className: "status429-add", type: "button", disabled: busy || available <= 0 || draft[key] >= 64 || !state.settings.config.enabled, onClick: () => change(key, 5) }, "+5 puan"), h2("small", null, "\xDCst s\u0131n\u0131r: %", fmt(state.settings.config[key])));
        })),
        h2("p", { className: "status429-help" }, "Her seviyede 3 puan kazan\u0131rs\u0131n. 65. seviyede toplam 192 puan; her stat\xFCde en fazla 64 puan. Bonuslar r\xFCnlerle toplan\u0131r. Can de\u011Fi\u015Fikli\u011Fi seni iyile\u015Ftirmez."),
        h2("footer", null, h2("button", { type: "button", disabled: busy || !state.settings.config.enabled, onClick: () => {
          setDraft({ attack: 0, defense: 0, hp: 0 });
          setMessage("S\u0131f\u0131rlamay\u0131 kaydetmek i\xE7in Uygula d\xFC\u011Fmesine bas.");
        } }, "S\u0131f\u0131rla"), h2("button", { type: "button", disabled: busy || !dirty || available < 0 || !state.settings.config.enabled, onClick: save }, busy ? "Kaydediliyor\u2026" : "Uygula")),
        h2("p", { className: "status429-message", role: "status" }, message || "Puan da\u011F\u0131t\u0131m\u0131 ve s\u0131f\u0131rlama sava\u015F d\u0131\u015F\u0131nda, \xFCcretsizdir.")
      )
    ));
  }
  function Admin({ value, busy, act }) {
    const [draft, setDraft] = React.useState(() => ({ ...value.config })), [revision, setRevision] = React.useState(value.revision), [message, setMessage] = React.useState("");
    const dirty = React.useRef(false);
    React.useEffect(() => {
      if (!dirty.current) {
        setDraft({ ...value.config });
        setRevision(value.revision);
      }
    }, [value.revision]);
    const change = (key, value2) => {
      dirty.current = true;
      setDraft((old) => ({ ...old, [key]: value2 }));
      setMessage("Kaydedilmemi\u015F de\u011Fi\u015Fiklikler");
    };
    return h2("section", { className: "status429-admin" }, h2("h2", null, "Stat\xFC sistemi"), h2("p", null, "Her seviye 3 puan; 65. seviyede 192 puan. Her stat\xFC 64 puanla a\u015Fa\u011F\u0131daki \xFCst s\u0131n\u0131ra ula\u015F\u0131r. De\u011Ferler y\xFCzde olarak do\u011Frusal uygulan\u0131r."), h2("label", null, h2("input", { type: "checkbox", checked: draft.enabled, onChange: (e2) => change("enabled", e2.target.checked) }), " Stat\xFC bonuslar\u0131 etkin"), h2("div", { className: "status429-grid" }, ...M2.STATUS_FIELDS.map((k2) => h2("label", { key: k2 }, T2[k2].effect + " \xFCst s\u0131n\u0131r\u0131 (%)", h2("input", { type: "number", min: 0, max: 30, step: 0.1, value: draft[k2], onChange: (e2) => change(k2, Number(e2.target.value)) })))), h2("p", null, "Can bonusunu art\u0131rmak mevcut can\u0131 doldurmaz; azaltmak can\u0131 yeni \xFCst s\u0131n\u0131ra indirir. Kapatmak da\u011F\u0131t\u0131lm\u0131\u015F puanlar\u0131 silmez."), h2("button", { disabled: busy, onClick: async () => {
      const result = await act({ action: "save_status", config: draft, revision });
      if (result?.status) {
        dirty.current = false;
        setDraft({ ...result.status.config });
        setRevision(result.status.revision);
        setMessage("Stat\xFC ayarlar\u0131 kaydedildi.");
      } else setMessage("Ayarlar kaydedilemedi.");
    } }, "Stat\xFC ayarlar\u0131n\u0131 kaydet"), h2("p", { role: "status" }, message));
  }
  return { Entry, Admin };
}
function createUpdate425UI(React, { fetcher = fetch, post, rankLabel = (n2) => "R\xFCtbe " + n2 } = {}) {
  const h2 = React.createElement;
  function StatusControls({ draft, setDraft, busy, act }) {
    const mode = draft.mode === "maintenance" ? "maintenance" : !draft.enabled || draft.mode === "open" ? "open" : "closed";
    return h2(
      "div",
      { className: "status425-controls" },
      h2("label", null, "Oyun durumu", h2("select", { value: mode, onChange: (e2) => setDraft({ ...draft, enabled: 1, mode: e2.target.value }) }, h2("option", { value: "closed" }, "\xD6n kay\u0131t"), h2("option", { value: "open" }, "Oyun a\xE7\u0131k"), h2("option", { value: "maintenance" }, "Bak\u0131m modu"))),
      h2("p", null, "\xD6n kay\u0131t: yak\u0131nda a\xE7\u0131laca\u011F\u0131z ve kay\u0131t ekran\u0131. Oyun a\xE7\u0131k: kay\u0131t ol veya giri\u015F yap. Bak\u0131m: giri\u015F kapan\u0131r; oyuncular 10 saniye sonra bak\u0131m ekran\u0131na al\u0131n\u0131r. Y\xF6netici eri\u015Fimi korunur."),
      h2("label", null, "Bak\u0131m a\xE7\u0131klamas\u0131", h2("textarea", { value: draft.maintenance_text ?? "", maxLength: 2e3, rows: 4, placeholder: "Bak\u0131m hakk\u0131nda oyunculara g\xF6sterilecek a\xE7\u0131klama\u2026", onChange: (e2) => setDraft({ ...draft, maintenance_text: e2.target.value }) })),
      h2("small", null, "Kaydetti\u011Finde bak\u0131m ekran\u0131ndaki metin a\xE7\u0131k sayfalarda da g\xFCncellenir."),
      h2("button", { disabled: busy, onClick: () => act({ action: "save", settings: { ...draft, enabled: 1, mode } }) }, busy ? "Kaydediliyor\u2026" : "Durumu ve a\xE7\u0131klamay\u0131 kaydet")
    );
  }
  function BagItems({ own, onChanged }) {
    const [busy, setBusy] = React.useState(false), [error, setError] = React.useState("");
    const receipt = React.useRef(null);
    const act = async (body) => {
      if (busy) return;
      setBusy(true);
      setError("");
      const key = JSON.stringify(body);
      if (receipt.current?.key !== key) receipt.current = { key, id: crypto.randomUUID() };
      try {
        await post("/api/ranks", { ...body, requestId: receipt.current.id });
        receipt.current = null;
        await onChanged?.();
      } catch (e2) {
        setError(e2.message);
      } finally {
        setBusy(false);
      }
    };
    return h2(
      React.Fragment,
      null,
      own?.arena_wings_owned > 0 && h2("button", { className: "bag-item arena425-item", disabled: busy, onClick: () => act({ action: "arena_market_wings", enabled: !own.arena_wings_equipped }) }, h2("span", { className: "item-icon" }, h2("img", { src: "/game/arena-wings-v424.webp", alt: "" })), h2("span", null, h2("strong", null, "Arena Kanatlar\u0131"), h2("small", null, "+10 sald\u0131r\u0131 \xB7 +%10 canavarlara g\xFC\xE7"), h2("b", null, own.arena_wings_equipped ? "Ku\u015Fan\u0131ld\u0131 \xB7 \xC7\u0131kar" : "Kal\u0131c\u0131 \xB7 Ku\u015Fan"))),
      own?.arena_exp_rings > 0 && h2("button", { className: "bag-item arena425-item", disabled: busy, onClick: () => act({ action: "arena_market_exp" }) }, h2("span", { className: "item-icon" }, h2("img", { src: "/game/exp-ring-v424.webp", alt: "" })), h2("span", null, h2("strong", null, "Arena Tecr\xFCbe Y\xFCz\xFC\u011F\xFC"), h2("small", null, "1 saat +%20 tecr\xFCbe"), h2("b", null, own.arena_exp_rings + " adet \xB7 Kullan"))),
      own?.red_pearls > 0 && h2("div", { className: "bag-item arena425-item" }, h2("span", { className: "item-icon" }, h2("span", { className: "red-pearl425", role: "img", "aria-label": "K\u0131rm\u0131z\u0131 inci" })), h2("span", null, h2("strong", null, "K\u0131rm\u0131z\u0131 \u0130nci"), h2("small", null, "Ejderha giri\u015Fi: 1 inci + 100 m\xFCcevher + 200 \xF6z"), h2("b", null, own.red_pearls + " adet"))),
      error && h2("p", { className: "arena425-error", role: "alert" }, error)
    );
  }
  function Ranking({ playerId }) {
    const [open, setOpen] = React.useState(false), [tab, setTab] = React.useState("level"), [data, setData] = React.useState(null), [error, setError] = React.useState("");
    const dialog = React.useRef(null);
    React.useEffect(() => {
      const d2 = dialog.current;
      if (open && !d2.open) d2.showModal();
      if (!open && d2.open) d2.close();
    }, [open]);
    React.useEffect(() => {
      if (!open) return;
      let stopped = false, timer, controller;
      const refresh = async () => {
        if (stopped || document.hidden) return;
        controller?.abort();
        controller = new AbortController();
        const current = controller;
        const timeout = setTimeout(() => current.abort(), 8e3);
        try {
          const r2 = await fetcher("/api/level-ranking", { cache: "no-store", signal: current.signal }), s2 = await r2.json();
          if (!r2.ok) throw Error(s2.error ?? "S\u0131ralama al\u0131namad\u0131.");
          if (!stopped) {
            setData(s2);
            setError("");
          }
        } catch (e2) {
          if (!stopped) setError(e2.message);
        } finally {
          clearTimeout(timeout);
          if (!stopped) timer = setTimeout(refresh, 15e3);
        }
      };
      const visible = () => {
        clearTimeout(timer);
        if (document.hidden) controller?.abort();
        else void refresh();
      };
      void refresh();
      document.addEventListener("visibilitychange", visible);
      return () => {
        stopped = true;
        clearTimeout(timer);
        controller?.abort();
        document.removeEventListener("visibilitychange", visible);
      };
    }, [open, playerId]);
    const monsters = tab === "monsters", rows = monsters ? data?.monsters?.rows : data?.rows;
    return h2(
      React.Fragment,
      null,
      h2("button", { type: "button", className: "mobile-dungeon level-ranking-open", onClick: () => setOpen(true), title: "S\u0131ralamalar", "aria-label": "Seviye, r\xFCtbe ve canavar s\u0131ralamalar\u0131" }, h2("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, width: 20, height: 20, "aria-hidden": true }, h2("path", { d: "M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 13v7m-4 1h8" })), h2("span", null, "S\u0131ralamalar")),
      h2(
        "dialog",
        { ref: dialog, className: "level-ranking-dialog ranking425-dialog", onCancel: () => setOpen(false), onClose: () => setOpen(false), "aria-labelledby": "ranking425-title" },
        h2("header", null, h2("h2", { id: "ranking425-title" }, "S\u0131ralamalar"), h2("button", { onClick: () => setOpen(false), "aria-label": "S\u0131ralamay\u0131 kapat" }, "\xD7")),
        h2("div", { className: "ranking425-tabs", role: "tablist" }, h2("button", { role: "tab", "aria-selected": !monsters, onClick: () => setTab("level") }, "Seviye ve R\xFCtbe"), h2("button", { role: "tab", "aria-selected": monsters, onClick: () => setTab("monsters") }, "Canavar S\u0131ralamas\u0131")),
        h2("p", null, monsters ? "T\xFCm kanallar \xB7 Bug\xFCn ilk 10 \xB7 00.00\u2019da birinciye 50 \xC7P" : "T\xFCm kanallar \xB7 \u0130lk 20"),
        error && h2("p", { role: "alert" }, error),
        !data && h2("p", null, "S\u0131ralama y\xFCkleniyor\u2026"),
        h2("div", { className: "level-ranking-scroll" }, h2("table", null, h2("thead", null, h2("tr", null, ...["S\u0131ra", "Oyuncu", monsters ? "Canavar" : "Seviye / R\xFCtbe", ...monsters ? [] : ["TP"]].map((t2) => h2("th", { key: t2 }, t2)))), h2("tbody", null, ...(rows ?? []).slice(0, monsters ? 10 : 20).map((row) => h2("tr", { key: row.id, className: row.id === playerId ? "ranking-mine" : "" }, h2("td", null, row.rank), h2("td", null, h2("strong", null, row.name + (row.id === playerId ? " \xB7 Sen" : ""))), h2("td", null, monsters ? row.kills : row.rankTier ? rankLabel(row.rankTier, true) : row.level), !monsters && h2("td", null, (row.rankTier ? row.rankXp ?? 0 : row.xp).toLocaleString("tr-TR")))))), data && !rows?.length && h2("p", null, monsters ? "Bug\xFCn hen\xFCz canavar kesilmedi." : "Hen\xFCz s\u0131ralanacak oyuncu yok.")),
        h2("footer", null, !monsters && data?.own && h2("strong", null, "S\u0131ran: " + data.own.rank), h2("small", null, monsters ? "\xD6d\xFCl hakk\u0131 kazand\u0131\u011F\u0131n canavarlar say\u0131l\u0131r. G\xFCn sonunda birinciye 50 \xC7P, \xE7evrimd\u0131\u015F\u0131yken de bir kez eklenir. E\u015Fitlikte mevcut oyuncu kimli\u011Fi s\u0131ras\u0131 ge\xE7erlidir. GM karakterleri dahil edilmez." : "65. seviyeden sonra r\xFCtbe ve r\xFCtbe TP\u2019si belirleyicidir."), h2("small", null, "A\xE7\u0131kken 15 saniyede bir yenilenir."))
      )
    );
  }
  return { StatusControls, BagItems, Ranking };
}
function createArenaUI(React, { fetcher = fetch, post } = {}) {
  const h2 = React.createElement, coin = "/game/arena-coin-v424.webp";
  const images460 = Object.freeze({ "material:strong_branch": "/dungeon/strong-branch-v410.webp", "material:strong_crystal": "/dungeon/strong-crystal-v410.webp", "material:desert_plant": "/dungeon/desert-plant-v410.webp", "material:master_scroll": "/dungeon/master-scroll-v410.webp", "resource:fifth_enchant_scrolls": "/game/enchant-fifth-v260.webp" });
  function ItemIcon460({ item }) {
    if (item.itemId === "resource:pearls") return h2("svg", { className: "pearl-icon", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" }, h2("circle", { cx: "12", cy: "12", r: "8.2", fill: "#dff8ff", stroke: "currentColor", strokeWidth: "1.4" }), h2("circle", { cx: "9.2", cy: "8.8", r: "2.2", fill: "#fff", fillOpacity: ".92" }), h2("path", { d: "M7.2 15.8c2.8 2.4 6.9 2.7 9.7-.5", stroke: "#8ebdcc", strokeWidth: "1.1", strokeLinecap: "round", opacity: ".7" }));
    const src = images460[item.itemId] ?? item.image;
    return src ? h2("img", { src, alt: "", loading: "lazy" }) : h2("span", null, item.type === "gear" ? "\u2694" : "\u2726");
  }
  const rewards = { "1v1": 5, "2v2": 6, "3v3": 7, "5v5": 10 }, limits = { "1v1": 5, "2v2": 3, "3v3": 2, "5v5": 1 };
  const send = post ?? (async (url, body) => {
    const r2 = await fetcher(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d2 = await r2.json();
    if (!r2.ok) throw Error(d2.error ?? "\u0130\u015Flem ba\u015Far\u0131s\u0131z.");
    return d2;
  });
  function Reward({ mode }) {
    return h2("small", { className: "arena424-reward" }, h2("img", { src: coin, alt: "", width: 20, height: 20 }), `+${rewards[mode]} Arena Coin \xB7 G\xFCnde ${limits[mode]} giri\u015F`);
  }
  function Market({ onChanged, own }) {
    const [state, setState] = React.useState(null), [open, setOpen] = React.useState(false), [busy, setBusy] = React.useState(false), [message, setMessage] = React.useState(""), [error, setError] = React.useState("");
    const mounted = React.useRef(true), request = React.useRef(null);
    const refresh = async () => {
      try {
        const r2 = await fetcher("/api/ranks?view=arena-market", { cache: "no-store" });
        const s2 = await r2.json();
        if (!r2.ok) throw Error(s2.error ?? "Market y\xFCklenemedi.");
        if (mounted.current) {
          setState(s2);
          setError("");
        }
      } catch (e2) {
        if (mounted.current) setError(e2.message);
      }
    };
    React.useEffect(() => {
      mounted.current = true;
      void refresh();
      return () => {
        mounted.current = false;
      };
    }, []);
    const act = async (body) => {
      if (busy) return;
      setBusy(true);
      setError("");
      const fingerprint = JSON.stringify(body);
      if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
      try {
        const r2 = await send("/api/ranks", { ...body, requestId: request.current.id });
        request.current = null;
        if (mounted.current) {
          setState(r2.state);
          setMessage(r2.message);
        }
        await onChanged?.();
      } catch (e2) {
        if (mounted.current) setError(e2.message);
      } finally {
        if (mounted.current) setBusy(false);
      }
    };
    return h2(
      "section",
      { className: "arena424-market", "data-open": open },
      h2("button", { type: "button", className: "arena424-entry", onClick: () => {
        setOpen(!open);
        if (!open) void refresh();
      }, "aria-expanded": open }, h2("img", { src: coin, alt: "", width: 32, height: 32 }), h2("span", null, h2("strong", null, "Arena Market"), h2("small", null, `${state?.coins ?? own?.arena_coins ?? "\u2014"} Arena Coin`)), h2("b", null, open ? "Kapat" : "Marketi a\xE7")),
      state && h2("div", { className: "arena424-limits" }, ...Object.entries(state.limits).map(([m2, l2]) => h2("span", { key: m2 }, `${m2}: ${Math.max(0, l2.limit - l2.used)}/${l2.limit} hak`))),
      h2("small", { className: "arena424-reset" }, "Haklar T\xFCrkiye saatiyle 00.00\u2019da yenilenir. Kuyruktan ayr\u0131lmak hak t\xFCketmez."),
      open && h2(
        "div",
        { className: "arena424-content" },
        state?.wingsOwned ? h2("button", { disabled: busy, onClick: () => act({ action: "arena_market_wings", enabled: !state.wingsEquipped }) }, state.wingsEquipped ? "Arena Kanatlar\u0131n\u0131 \xE7\u0131kar" : "Arena Kanatlar\u0131n\u0131 ku\u015Fan") : null,
        state?.rings > 0 ? h2("button", { disabled: busy, onClick: () => act({ action: "arena_market_exp" }) }, `EXP y\xFCz\xFC\u011F\xFCn\xFC kullan (${state.rings}) \xB7 1 saat +%20`) : null,
        state?.expUntil > state?.serverTime ? h2("p", null, "+%20 EXP etkin \xB7 Biti\u015F: ", new Date(state.expUntil).toLocaleString("tr-TR")) : null,
        h2("div", { className: "arena424-items" }, ...(state?.items ?? []).map((item) => h2("article", { key: item.itemId }, h2("div", { className: "arena424-icon" }, h2(ItemIcon460, { item })), h2("div", null, h2("strong", null, item.name), h2("small", null, item.description ?? `${item.amount} adet${item.power ? " \xB7 G\xFC\xE7 / Seviye " + item.power : ""}`)), h2("button", { disabled: busy || state.coins < item.price || item.itemId === "arena:wings" && !!state.wingsOwned, onClick: () => act({ action: "arena_market_buy", itemId: item.itemId, revision: state.revision }) }, h2("img", { src: coin, alt: "Arena Coin", width: 22, height: 22 }), item.price, " \xB7 Al")))),
        !state ? h2("button", { disabled: busy, onClick: refresh }, "Yenile") : null
      ),
      error && h2("p", { role: "alert", className: "arena424-error" }, error),
      message && h2("p", { role: "status" }, message)
    );
  }
  function Admin({ value, busy, act }) {
    const [rows, setRows] = React.useState(value.config), [chosen, setChosen] = React.useState(""), [query, setQuery] = React.useState("");
    React.useEffect(() => setRows(value.config), [value.revision]);
    const catalog = value.catalog, byId = new Map(catalog.map((i2) => [i2.id, i2]));
    const update = (i2, k2, v2) => setRows(rows.map((r2, n2) => n2 === i2 ? { ...r2, [k2]: Number(v2) } : r2));
    return h2(
      "section",
      { className: "arena424-admin" },
      h2("h2", null, "Arena Market"),
      h2("p", null, "Oyundaki e\u015Fyalardan se\xE7; coin bedelini ve adedini belirle. Kald\u0131r\u0131lan e\u015Fya oyuncular\u0131n \xE7antas\u0131ndan silinmez."),
      h2("input", { placeholder: "E\u015Fya ara\u2026", value: query, onChange: (e2) => setQuery(e2.target.value), "aria-label": "E\u015Fya ara" }),
      h2("select", { value: chosen, onChange: (e2) => setChosen(e2.target.value), "aria-label": "Sat\u0131lacak e\u015Fya" }, h2("option", { value: "" }, "E\u015Fya se\xE7"), ...catalog.filter((i2) => !rows.some((r2) => r2.itemId === i2.id) && i2.name.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))).map((i2) => h2("option", { key: i2.id, value: i2.id }, `${i2.group} \xB7 ${i2.name}`))),
      h2("button", { disabled: busy || !chosen, onClick: () => {
        setRows([...rows, { itemId: chosen, price: 1, amount: 1, ...["gear", "rune"].includes(byId.get(chosen)?.type) ? { power: byId.get(chosen).type === "rune" ? 1 : 10 } : {} }]);
        setChosen("");
      } }, "Listeye ekle"),
      ...rows.map((r2, i2) => {
        const item = byId.get(r2.itemId);
        return h2("article", { key: r2.itemId }, h2("strong", null, item?.name), h2("label", null, "Arena Coin", h2("input", { type: "number", min: 1, max: 1e8, value: r2.price, onChange: (e2) => update(i2, "price", e2.target.value) })), h2("label", null, "Adet", h2("input", { type: "number", min: 1, max: ["material", "stone", "resource"].includes(item?.type) ? 1e4 : 1, value: r2.amount, onChange: (e2) => update(i2, "amount", e2.target.value) })), ["gear", "rune"].includes(item?.type) ? h2("label", null, "G\xFC\xE7 / Seviye", h2("input", { type: "number", min: item.type === "rune" ? 1 : 0, max: 1e5, value: r2.power ?? (item.type === "rune" ? 1 : 10), onChange: (e2) => update(i2, "power", e2.target.value) })) : null, h2("button", { disabled: busy, onClick: () => setRows(rows.filter((_2, n2) => n2 !== i2)) }, "Kald\u0131r"));
      }),
      h2("button", { disabled: busy, onClick: () => act({ action: "save_arena_market", config: rows, revision: value.revision }) }, busy ? "Kaydediliyor\u2026" : "Arena Marketi kaydet")
    );
  }
  function BagEntry(props) {
    const [open, setOpen] = React.useState(false);
    return h2("div", { className: "arena424-bag" }, h2("button", { onClick: () => setOpen(!open), "aria-expanded": open }, "Arena e\u015Fyalar\u0131"), open && h2(Market, props));
  }
  return { Market, Reward, Admin, BagEntry };
}
const colRuneModel = (() => {
  const RUNE_TYPES = Object.freeze({
    rune_defense: { label: "Safir Siper R\xFCn\xFC", short: "Savunma", stat: "defense", color: "#55aeff", image: "rune-defense-v422", shard: "Safir Siper Par\xE7as\u0131" },
    rune_attack: { label: "K\u0131z\u0131l Kudret R\xFCn\xFC", short: "Sald\u0131r\u0131", stat: "attack", color: "#ff6478", image: "rune-attack-v422", shard: "K\u0131z\u0131l Kudret Par\xE7as\u0131" },
    rune_hp: { label: "Z\xFCmr\xFCt Ya\u015Fam R\xFCn\xFC", short: "Can", stat: "hp", color: "#4fde9b", image: "rune-hp-v422", shard: "Z\xFCmr\xFCt Ya\u015Fam Par\xE7as\u0131" }
  });
  const RUNE_MOBS = Object.freeze([
    { key: "tide", name: "Gelgit Pen\xE7esi", count: 5, hp: 4800, damage: 62, xp: 180 },
    { key: "warden", name: "Mercan Muhaf\u0131z\u0131", count: 5, hp: 6200, damage: 75, xp: 220 },
    { key: "sentinel", name: "\u015Eato N\xF6bet\xE7isi", count: 5, hp: 7400, damage: 88, xp: 260 },
    { key: "wraith", name: "Derinlik Ruhu", count: 5, hp: 5500, damage: 96, xp: 240 }
  ]);
  const RUNE_WORLD = { width: 4320, height: 2880 };
  const RUNE_SPAWN = { x: 2121, y: 2579 };
  const RUNE_GATE_MESSAGE = "Giri\u015F i\xE7in 65. seviye ve \xD6z Avc\u0131s\u0131 r\xFCtbesi gerekiyor.";
  const runeEligible = (p2) => !!p2 && Number(p2.level) >= 65 && Number(p2.rank_tier ?? p2.rank?.tier) >= 1;
  const isRuneKind = (k2) => typeof k2 === "string" && Object.hasOwn(RUNE_TYPES, k2);
  function runeUpgradeCost(level) {
    if (!Number.isSafeInteger(level) || level < 1 || !Number.isSafeInteger(level + 2)) throw Error("R\xFCn seviyesi ge\xE7ersiz.");
    return level + 2;
  }
  const runeBonusPercent = (level, step = 0.2) => Math.round(level * step * 1e6) / 1e6;
  function runeMonsterKey(monster) {
    return monster?.area === "rune" ? String(monster.id).match(/^rune-(tide|warden|sentinel|wraith)-c[1-3]-\d+$/)?.[1] ?? null : null;
  }
  const RUNE_WALKABLE_POLYGON = [[1195, 967], [2162, 844], [2232, 615], [3164, 615], [3234, 809], [4096, 686], [4219, 914], [4078, 1125], [4781, 1195], [4816, 1494], [4500, 1916], [4430, 2514], [3938, 2812], [3076, 3076], [2900, 3463], [2426, 3463], [2250, 3094], [1652, 2760], [1301, 2461], [1195, 2004], [1125, 1600], [1055, 1248]].map(([x2, y2]) => [Math.round(x2 * 0.8), Math.round(y2 * 0.8)]);
  const RUNE_OBSTACLES = [[[2039, 1121], [2278, 1058], [2584, 1146], [2739, 1287], [2591, 1498], [2275, 1568], [2039, 1434]], [[3347, 1870], [3561, 1870], [3730, 1986], [3544, 2148], [3305, 2116], [3206, 2e3]]].map((poly) => poly.map(([x2, y2]) => [Math.round(x2 * 0.8), Math.round(y2 * 0.8)]));
  const inside = (x2, y2, poly) => {
    let yes = false;
    for (let i2 = 0, j2 = poly.length - 1; i2 < poly.length; j2 = i2++) {
      const a2 = poly[i2], b2 = poly[j2];
      if (a2[1] > y2 !== b2[1] > y2 && x2 < (b2[0] - a2[0]) * (y2 - a2[1]) / (b2[1] - a2[1]) + a2[0]) yes = !yes;
    }
    return yes;
  };
  const edgeDistance = (x2, y2, a2, b2) => {
    const dx = b2[0] - a2[0], dy = b2[1] - a2[1], t2 = Math.max(0, Math.min(1, ((x2 - a2[0]) * dx + (y2 - a2[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x2 - a2[0] - t2 * dx, y2 - a2[1] - t2 * dy);
  };
  const runeEdges = [RUNE_WALKABLE_POLYGON, ...RUNE_OBSTACLES].flatMap((poly) => poly.map((p2, i2) => [p2, poly[(i2 + 1) % poly.length]]));
  function runeWalkable(x2, y2, margin = 0) {
    if (!Number.isFinite(x2) || !Number.isFinite(y2) || !inside(x2, y2, RUNE_WALKABLE_POLYGON) || RUNE_OBSTACLES.some((p2) => inside(x2, y2, p2))) return false;
    return !(margin > 0) || runeEdges.every(([a2, b2]) => edgeDistance(x2, y2, a2, b2) >= margin);
  }
  function runeWalkableSegment(x1, y1, x2, y2, margin = 0) {
    if (!runeWalkable(x1, y1, margin) || !runeWalkable(x2, y2, margin)) return false;
    const cross = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    for (const [a2, b2] of runeEdges) {
      const c1 = cross(x1, y1, x2, y2, ...a2), c2 = cross(x1, y1, x2, y2, ...b2), c3 = cross(...a2, ...b2, x1, y1), c4 = cross(...a2, ...b2, x2, y2);
      if (c1 * c2 <= 0 && c3 * c4 <= 0 && Math.max(x1, x2) >= Math.min(a2[0], b2[0]) && Math.min(x1, x2) <= Math.max(a2[0], b2[0]) && Math.max(y1, y2) >= Math.min(a2[1], b2[1]) && Math.min(y1, y2) <= Math.max(a2[1], b2[1])) return false;
      if (margin > 0 && (edgeDistance(...a2, [x1, y1], [x2, y2]) < margin || edgeDistance(...b2, [x1, y1], [x2, y2]) < margin)) return false;
    }
    return true;
  }
  const runePoints = { "tide": [[3750, 1140], [1230, 1980], [3190, 720], [2770, 1840], [2350, 1140]], "warden": [[950, 1e3], [3330, 1980], [1510, 860], [3330, 1420], [2350, 1560]], "sentinel": [[2350, 2120], [1930, 1420], [1790, 2260], [1650, 1840], [2770, 720]], "wraith": [[2350, 580], [2770, 1280], [1370, 1420], [1930, 720], [2770, 2260]] };
  const RUNE_SPAWNS = Object.freeze(Object.entries(runePoints).flatMap(([key, points]) => points.map(([x2, y2], i2) => ({ key, slot: i2 + 1, x: x2, y: y2 }))));
  function defaultRuneConfig() {
    return { enabled: true, bonusPerLevel: 0.2, monsters: Object.fromEntries(RUNE_MOBS.map((m2) => [m2.key, { name: m2.name, hp: m2.hp, damage: m2.damage, xp: m2.xp, respawnSeconds: 30, loot: { ...Object.fromEntries(Object.keys(RUNE_TYPES).map((k2) => [k2, { chance: 3, min: 1, max: 1 }])), essence: { chance: 100, min: 5, max: 10 }, gems: { chance: 10, min: 1, max: 3 }, potions: { chance: 5, min: 1, max: 1 }, red: { chance: 1, min: 1, max: 1 }, orange: { chance: 2, min: 1, max: 1 }, blue: { chance: 3, min: 1, max: 1 }, white: { chance: 0, min: 1, max: 1 }, purple: { chance: 0, min: 1, max: 1 }, stone_dust: { chance: 2, min: 1, max: 2 }, stone_book: { chance: 1, min: 1, max: 1 }, evolution_scroll: { chance: 0.2, min: 1, max: 1 }, pearl: { chance: 0, min: 1, max: 1 }, weathered_iron: { chance: 0, min: 1, max: 1 }, wing: { chance: 0, min: 1, max: 1 }, infinite: { chance: 0, min: 1, max: 1 }, pet: { chance: 0, min: 1, max: 1 }, emerald: { chance: 0.05, min: 1, max: 1 } } }])) };
  }
  const RUNE_LOOT_LABELS = { ...Object.fromEntries(Object.entries(RUNE_TYPES).map(([k2, v2]) => [k2, v2.shard])), essence: "Ya\u015Fam \xD6z\xFC", gems: "M\xFCcevher", potions: "K\u0131rm\u0131z\u0131 \u0130ksir", red: "K\u0131rm\u0131z\u0131 ekipman", orange: "Turuncu ekipman", blue: "Mavi ekipman", white: "Beyaz ekipman", purple: "Mor ekipman", stone_dust: "Ta\u015F Tozu", stone_book: "Ta\u015F Sanat\u0131 Kitab\u0131", evolution_scroll: "Evrim Par\u015F\xF6meni", pearl: "\u0130nci", weathered_iron: "Eskitilmi\u015F Demir Par\xE7as\u0131", wing: "Kanat Par\xE7as\u0131", infinite: "Sonsuz Ta\u015F\u0131 Par\xE7as\u0131", pet: "Ejderha Par\xE7as\u0131", emerald: "Kadim Z\xFCmr\xFCt ekipman (5 par\xE7a)" };
  function validateRuneConfig(input) {
    const def = defaultRuneConfig(), out = { enabled: input?.enabled === true, bonusPerLevel: Number(input?.bonusPerLevel), monsters: {} };
    if (typeof input?.enabled !== "boolean" || !Number.isFinite(out.bonusPerLevel) || out.bonusPerLevel < 0 || out.bonusPerLevel > 100) throw Error("R\xFCn seviye bonusu %0\u2013100 aras\u0131nda olmal\u0131.");
    for (const m2 of RUNE_MOBS) {
      const v2 = input?.monsters?.[m2.key];
      if (!v2) throw Error("D\xF6rt canavar\u0131n ayarlar\u0131 gerekli.");
      const row = { name: m2.name, hp: Number(v2.hp), damage: Number(v2.damage), xp: Number(v2.xp), respawnSeconds: Number(v2.respawnSeconds), loot: {} };
      for (const [k2, min, max] of [["hp", 1, 1e7], ["damage", 0, 1e6], ["xp", 0, 1e6], ["respawnSeconds", 1, 86400]]) if (!Number.isSafeInteger(row[k2]) || row[k2] < min || row[k2] > max) throw Error(m2.name + ": " + k2 + " ayar\u0131 ge\xE7ersiz.");
      for (const k2 of Object.keys(def.monsters[m2.key].loot)) {
        const r2 = v2.loot?.[k2] ?? (k2 === "emerald" ? def.monsters[m2.key].loot.emerald : null);
        if (!r2 || !Number.isFinite(r2.chance) || r2.chance < 0 || r2.chance > 100 || !Number.isSafeInteger(r2.min) || !Number.isSafeInteger(r2.max) || r2.min < 1 || r2.max < r2.min || r2.max > (["white", "blue", "orange", "red", "purple", "emerald"].includes(k2) ? 3 : 100)) throw Error(m2.name + ": " + RUNE_LOOT_LABELS[k2] + " oran\u0131 veya miktar\u0131 ge\xE7ersiz.");
        row.loot[k2] = { chance: r2.chance, min: r2.min, max: r2.max };
      }
      out.monsters[m2.key] = row;
    }
    return out;
  }
  return { RUNE_TYPES, RUNE_MOBS, RUNE_LOOT_LABELS, RUNE_WORLD, RUNE_SPAWN, runeEligible, isRuneKind, runeUpgradeCost, runeBonusPercent, runeWalkable, runeWalkableSegment, runeMonsterKey, RUNE_GATE_MESSAGE };
})();
function createRuneUI(React, { model, fetcher, post, Button = "button", onImage = "/game/" }) {
  const h2 = React.createElement, types = model.RUNE_TYPES;
  let step = 0.2;
  const pct = (level) => model.runeBonusPercent(Number(level) || 1, step).toLocaleString("tr-TR", { maximumFractionDigits: 6 });
  function Icon({ kind, className = "" }) {
    const t2 = types[kind];
    return t2 ? h2("img", { src: "/game/" + t2.image + ".webp", alt: t2.label, className: "rune-icon " + className, draggable: false }) : null;
  }
  function Details({ item }) {
    const t2 = types[item.kind];
    return t2 ? h2("div", { className: "rune-details" }, h2("strong", null, t2.label), h2("b", { style: { color: t2.color } }, "Seviye " + item.power + " \xB7 +%" + pct(item.power) + " " + t2.short), h2("small", null, "Tak\u0131ld\u0131\u011F\u0131nda etkin \xB7 Geli\u015Ftirilebilir \xB7 Pazarda sat\u0131labilir")) : null;
  }
  function BagEntry({ own, bonusStep, onChanged }) {
    if (Number.isFinite(bonusStep)) step = bonusStep;
    const [open, setOpen] = React.useState(false), [state, setState] = React.useState(null), [error, setError] = React.useState(""), [busy, setBusy] = React.useState(false), dialog = React.useRef(null), lock = React.useRef(false);
    const allowed = model.runeEligible(own);
    React.useEffect(() => {
      if (!open) return;
      const d2 = dialog.current;
      if (d2 && !d2.open) d2.showModal();
      const close = () => setOpen(false);
      const rotate = () => {
        if (window.matchMedia("(pointer:coarse)").matches && window.innerHeight > window.innerWidth) close();
      };
      window.addEventListener("resize", rotate);
      window.addEventListener("orientationchange", rotate);
      window.addEventListener("coreoflife:bot-check", close);
      return () => {
        window.removeEventListener("resize", rotate);
        window.removeEventListener("orientationchange", rotate);
        window.removeEventListener("coreoflife:bot-check", close);
        if (d2?.open) d2.close();
      };
    }, [open]);
    React.useEffect(() => {
      if (!open || !allowed) return;
      const abort = new AbortController();
      setError("");
      setState(null);
      fetcher("/api/ranks?view=runes", { cache: "no-store", signal: abort.signal }).then(async (r2) => {
        const data = await r2.json();
        if (!r2.ok) throw Error(data.error || "R\xFCnler al\u0131namad\u0131.");
        step = data.config.bonusPerLevel;
        setState(data);
      }).catch((e2) => {
        if (e2.name !== "AbortError") setError(e2.message);
      });
      return () => abort.abort();
    }, [open, own?.id, allowed]);
    const command = async (action, item) => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      setError("");
      try {
        const result = await post("/api/ranks", { action, requestId: crypto.randomUUID(), ...item?.id ? { itemId: item.id, expectedLevel: item.power } : { kind: item?.kind } });
        setState(result.state);
        step = result.state.config.bonusPerLevel;
        await onChanged?.();
      } catch (e2) {
        setError(e2.message || "\u0130\u015Flem tamamlanamad\u0131.");
      } finally {
        lock.current = false;
        setBusy(false);
      }
    };
    return h2(React.Fragment, null, h2(Button, { type: "button", className: "rune-entry-button", onPointerDown: (e2) => e2.stopPropagation(), onClick: (e2) => {
      e2.stopPropagation();
      setOpen(true);
    } }, h2(Icon, { kind: "rune_defense" }), " R\xFCn"), open && h2("dialog", { ref: dialog, className: "rune-dialog", onCancel: () => setOpen(false), onClose: () => setOpen(false), onPointerDown: (e2) => e2.stopPropagation(), onClick: (e2) => e2.stopPropagation(), "aria-labelledby": "rune-heading" }, h2("header", { className: "rune-header" }, h2("div", null, h2("small", null, "KAD\u0130M R\xDCN SANATI"), h2("h2", { id: "rune-heading" }, "R\xFCnler")), h2("button", { type: "button", onClick: () => setOpen(false), "aria-label": "R\xFCn penceresini kapat" }, "\xD7")), !allowed ? h2("p", { role: "status", className: "rune-locked" }, model.RUNE_GATE_MESSAGE) : h2(React.Fragment, null, h2("p", { className: "rune-intro" }, "Her t\xFCrden bir r\xFCn takabilirsin. Seviye s\u0131n\u0131r\u0131 yoktur. Tak\u0131l\u0131 r\xFCnler sat\u0131lamaz."), error && h2("p", { role: "alert", className: "rune-error" }, error), !state && !error && h2("p", { role: "status" }, "R\xFCnlerin y\xFCkleniyor\u2026"), state && !state.claimed && h2("button", { className: "rune-primary", disabled: busy, onClick: () => command("rune_claim") }, "\xDC\xE7 ba\u015Flang\u0131\xE7 r\xFCn\xFCn\xFC al"), state && h2("div", { className: "rune-columns" }, ...Object.entries(types).map(([kind, t2]) => {
      const items = state.items.filter((i2) => i2.kind === kind), fragments = state.materials[kind] ?? 0;
      return h2("section", { key: kind, className: "rune-type", style: { "--rune-color": t2.color } }, h2("div", { className: "rune-type-title" }, h2(Icon, { kind }), h2("div", null, h2("h3", null, t2.label), h2("span", null, "Seviye ba\u015F\u0131na +%" + step.toLocaleString("tr-TR") + " " + t2.short))), h2("div", { className: "rune-shards" }, h2("img", { src: "/dungeon/" + t2.image + "-shard.webp", alt: "" }), h2("span", null, t2.shard), h2("b", null, fragments.toLocaleString("tr-TR"))), h2("div", { className: "rune-item-list" }, ...items.map((item) => {
        const cost = model.runeUpgradeCost(item.power);
        return h2("article", { key: item.id, className: "rune-item " + (item.equipped ? "is-equipped" : "") }, h2("div", { className: "rune-level-line" }, h2("strong", null, "Seviye " + item.power), h2("span", null, item.equipped ? "Tak\u0131l\u0131" : "\xC7antada")), h2("b", { className: "rune-bonus" }, "+%" + pct(item.power) + " " + t2.short), h2("small", null, "Sonraki seviye: " + cost.toLocaleString("tr-TR") + " par\xE7a"), h2("div", { className: "rune-item-actions" }, h2("button", { disabled: busy, onClick: () => command(item.equipped ? "rune_unequip" : "rune_equip", item) }, item.equipped ? "\xC7\u0131kar" : "Tak"), h2("button", { disabled: busy || fragments < cost, onClick: () => command("rune_upgrade", item) }, "Geli\u015Ftir")));
      })), h2("button", { className: "rune-craft", disabled: busy || fragments < 5, onClick: () => command("rune_craft", { kind }) }, "Yeni r\xFCn \xFCret \xB7 5 par\xE7a"));
    })), h2("p", { className: "rune-footnote" }, "Par\xE7alar Kadim R\xFCn Sahili\u2019nde d\xFC\u015Fer. Par\xE7alar\u0131 ve tak\u0131l\u0131 olmayan r\xFCnlerini Pazar Tezg\xE2h\u0131m\u2019dan satabilirsin. R\xFCn takmak can\u0131n\u0131 doldurmaz."))));
  }
  function Loot({ profile, label }) {
    return h2("div", { className: "rune-loot-information" }, h2("strong", null, label ?? profile.label), h2("p", null, "Her \xF6d\xFCl ba\u011F\u0131ms\u0131z hesaplan\u0131r. Bu haritada R\xFCn panelinin oranlar\u0131 ge\xE7erlidir."), ...Object.entries(profile.runeLoot).filter(([, r2]) => r2.chance > 0).map(([kind, r2]) => h2("div", { key: kind, className: "rune-odds-row" }, types[kind] && h2("img", { src: "/dungeon/" + types[kind].image + "-shard.webp", alt: "" }), h2("span", null, model.RUNE_LOOT_LABELS[kind] ?? kind), h2("b", null, "%" + r2.chance.toLocaleString("tr-TR")), h2("small", null, r2.min === r2.max ? r2.min + " adet" : r2.min + "\u2013" + r2.max + " adet"))));
  }
  function Admin({ value, busy, act }) {
    const [draft, setDraft] = React.useState(() => structuredClone(value.config)), [revision, setRevision] = React.useState(value.revision), [tab, setTab] = React.useState("tide"), [status, setStatus] = React.useState("");
    const dirty = React.useRef(false);
    React.useEffect(() => {
      if (!dirty.current) {
        setDraft(structuredClone(value.config));
        setRevision(value.revision);
      }
    }, [value.revision]);
    const set = (fn2) => {
      dirty.current = true;
      setDraft((old) => {
        const next = structuredClone(old);
        fn2(next);
        return next;
      });
      setStatus("Kaydedilmemi\u015F de\u011Fi\u015Fiklikler");
    };
    const number = (label, value2, change, min, max, step2 = 1) => h2("label", { className: "rune-field" }, h2("span", null, label), h2("input", { type: "number", min, max, step: step2, value: value2, onChange: (e2) => change(Number(e2.target.value)) }));
    const m2 = draft.monsters[tab];
    return h2("section", { className: "rune-admin" }, h2("header", null, h2("h2", null, "R\xFCnler ve Kadim R\xFCn Sahili"), h2("p", null, "Bu haritan\u0131n canavarlar\u0131 ve ganimetleri yaln\u0131z buradan y\xF6netilir. Can ve hasar oyuncu say\u0131s\u0131yla artmaz.")), h2("div", { className: "rune-admin-general" }, h2("label", null, h2("input", { type: "checkbox", checked: draft.enabled, onChange: (e2) => set((d2) => {
      d2.enabled = e2.target.checked;
    }) }), " Haritaya giri\u015F a\xE7\u0131k"), number("Seviye ba\u015F\u0131na r\xFCn bonusu (%)", draft.bonusPerLevel, (v2) => set((d2) => {
      d2.bonusPerLevel = v2;
    }), 0, 100, 0.01)), h2("nav", { className: "rune-admin-tabs" }, ...model.RUNE_MOBS.map((monster) => h2("button", { key: monster.key, type: "button", "aria-pressed": tab === monster.key, onClick: () => setTab(monster.key) }, monster.name + " \xB7 " + monster.count))), h2("div", { className: "rune-admin-stats" }, number("Can", m2.hp, (v2) => set((d2) => {
      d2.monsters[tab].hp = v2;
    }), 1, 1e7), number("Hasar", m2.damage, (v2) => set((d2) => {
      d2.monsters[tab].damage = v2;
    }), 0, 1e6), number("Tecr\xFCbe", m2.xp, (v2) => set((d2) => {
      d2.monsters[tab].xp = v2;
    }), 0, 1e6), number("Yeniden do\u011Fma (sn)", m2.respawnSeconds, (v2) => set((d2) => {
      d2.monsters[tab].respawnSeconds = v2;
    }), 1, 86400)), h2("p", null, "Can de\u011Fi\u015Fikli\u011Fi sonraki do\u011Fu\u015Fta uygulan\u0131r. Ganimet kesim an\u0131nda kaydedilir; daha sonra yap\u0131lan ayar de\u011Fi\u015Fikli\u011Fi kazan\u0131lm\u0131\u015F \xF6d\xFCl\xFC de\u011Fi\u015Ftirmez."), h2("div", { className: "rune-loot-editor" }, ...Object.entries(model.RUNE_LOOT_LABELS).map(([kind, label]) => h2("fieldset", { key: kind }, h2("legend", null, label), number(kind === "purple" ? "Temel d\xFC\u015Fme (%)" : "D\xFC\u015Fme (%)", m2.loot[kind].chance, (v2) => set((d2) => {
      d2.monsters[tab].loot[kind].chance = v2;
    }), 0, 100, 0.01), kind === "purple" && h2("small", null, "Yeni kesimlerde mor \u015Fans\u0131: %" + (m2.loot[kind].chance * 0.5).toLocaleString("tr-TR", { maximumFractionDigits: 10 }) + " (temel oran\u0131n yar\u0131s\u0131; seviye dengesi ayr\u0131ca uygulan\u0131r)."), number("En az", m2.loot[kind].min, (v2) => set((d2) => {
      d2.monsters[tab].loot[kind].min = v2;
    }), 1, ["white", "blue", "orange", "red", "purple", "emerald"].includes(kind) ? 3 : 100), number("En \xE7ok", m2.loot[kind].max, (v2) => set((d2) => {
      d2.monsters[tab].loot[kind].max = v2;
    }), 1, ["white", "blue", "orange", "red", "purple", "emerald"].includes(kind) ? 3 : 100)))), h2("div", { className: "rune-admin-save" }, h2("span", { role: "status" }, status), h2("button", { disabled: busy, onClick: async () => {
      const result = await act({ action: "save_runes", config: draft, revision });
      if (result?.runes) {
        dirty.current = false;
        setDraft(structuredClone(result.runes.config));
        setRevision(result.runes.revision);
        setStatus("R\xFCn ayarlar\u0131 kaydedildi.");
      } else setStatus("Kaydedilemedi. Hata mesaj\u0131n\u0131 kontrol et.");
    } }, busy ? "Kaydediliyor\u2026" : "R\xFCn ayarlar\u0131n\u0131 kaydet")));
  }
  return { BagEntry, Icon, Details, Loot, Admin, setStep: (value) => {
    if (Number.isFinite(value) && value >= 0) step = value;
  } };
}
import { r as e } from "./rolldown-runtime-S-ySWqyJ-ga4172.js";
import { i as t, r as n } from "./framework-CXnKph_e-ga4172.js";
import r from "./link-C6WHyGA8-ga4172-v418ws-3c02836f-e510-8225403c2fcc-9c637f1178.js";
import { $ as i, $t as a, A as o, B as s, Bt as c, C as l, F as u, G as d, Gt as f, H as p, Ht as m, I as h, J as g, Jt as _, K as v, L as y, Lt as b, M as x, N as S, O as C, P as w, Q as T, R as E, Rt as D, S as O, T as k, U as A, Ut as j, V as M, Vt as N, W as ee, Wt as te, Y as P, Z as ne, _ as F, a as re, at as ie, bt as ae, c as oe, ct as se, d as ce, dt as I, en as L, et as R, f as le, ft as z, h as ue, i as B, in as V, j as de, k as H, lt as U, m as fe, n as pe, nn as W, nt as me, o as he, ot as ge, p as _e, q as ve, qt as ye, r as be, rn as xe, rt as Se, s as Ce, sn as we, st as G, tn as K, tt as Te, ut as Ee, w as De, x as Oe, z as ke, zt as q } from "./monster-loot-a2QO0cPh-ga4172-92bdd7a4-bab8-e499-fab4fcb1e1b2-f4f682b8.js";
import { t as J } from "./createLucideIcon-BiVFlVzr-ga4172.js";
import { F as Ae, P as je, a as Me, i as Ne, j as Pe, l as Y, r as Fe, t as Ie } from "./launch-landing-qVKrjo7K-ga4172-prereg-1788-e486-48ff1d5b32ef-74b8821e.js";
import { t as Le } from "./circle-check-CykMSVzB-ga4172.js";
var Re = [["forest_power", "Kuzey Orman\u0131 g\xFCc\xFC", [2, 4, 8, 10], 10], ["frozen_power", "Donmu\u015F \xC7am g\xFCc\xFC", [2, 4, 8, 10], 10], ["fire", "Ate\u015F", [2, 4, 8, 10], 80], ["ice", "Buz", [2, 4, 8, 10], 80], ["sword_defense", "K\u0131l\u0131\xE7 savunmas\u0131", [2, 4, 9, 12], 80], ["arrow_defense", "Ok savunmas\u0131", [2, 4, 9, 12], 80], ["magic_defense", "B\xFCy\xFC savunmas\u0131", [2, 4, 9, 12], 80], ["strong_players", "Oyunculara kar\u015F\u0131 g\xFC\xE7", [2, 4, 8, 10], 80], ["resistant_players", "Oyunculara kar\u015F\u0131 savunma", [2, 4, 9, 12], 80], ["critical", "Kritik \u015Fans\u0131", [1, 2, 4, 6], 80], ["attack_speed", "Sald\u0131r\u0131 h\u0131z\u0131", [2, 4, 8, 10], 80], ["cast_speed", "B\xFCy\xFC H\u0131z\u0131", [4, 8, 16, 20], 50], ["life_steal", "Can \xE7alma", [3, 6, 12, 15], 15], ["attack_block", "Sald\u0131r\u0131 bloklama", [3, 6, 12, 15], 15], ["hp", "Azami can", [60, 120, 240, 300], 1e6]], ze = ["one", "two", "four", "five"], Be = (e2) => ze.map((t2) => `enchant_${e2}_tier_${t2}`);
Object.fromEntries(Re.flatMap(([e2, , t2]) => Be(e2).map((e3, n2) => [e3, t2[n2]])));
function Ve(e2, t2) {
  return colAffixValues454.enchantTierValues(e2, t2);
}
import {createCastleAdminR59} from "./core511-castle-admin-r59-100832b6836a087b.js";
var X = e(t(), 1), Z = n();
const colAdminNavigatorR66=createAdminNavigatorR66(X);
const colCastleAdminR59=createCastleAdminR59(X);
const colAccessoryGrantR58=(function createMaterialGrantAdminR55(React,catalog,options={}){
 const h=React.createElement,storageKey=options.storageKey??'core511.r55.materialGrant.pending',find=kind=>catalog.find(item=>item.kind===kind);
 const css='.mount49-admin{min-width:0}.mount49-admin p{line-height:1.5;overflow-wrap:anywhere}.mount49-admin-controls{display:flex;align-items:end;gap:12px;flex-wrap:wrap}.mount49-admin-controls label{display:grid;gap:6px;min-width:0;flex:1 1 160px}.mount49-admin-controls select,.mount49-admin-controls input{width:100%;min-width:0;box-sizing:border-box;min-height:42px}.mount49-admin button{min-height:42px;white-space:normal}.mount49-admin-status{padding:10px;border:1px solid #76633b;border-radius:6px;background:#201e16}.mount49-admin small{color:#c6bca8}';
 const valid=job=>job&&typeof job.playerId==='string'&&job.playerId.length>0&&typeof job.playerName==='string'&&find(job.kind)&&Number.isSafeInteger(job.amount)&&job.amount>0&&job.amount<=find(job.kind).cap&&typeof job.requestId==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(job.requestId);
 const restore=()=>{try{const value=JSON.parse(sessionStorage.getItem(storageKey));return valid(value)?value:null;}catch{return null;}};
 return function MaterialGrantAdminR55({player,busy,act}){
  const [kind,setKind]=React.useState(catalog[0].kind),[amount,setAmount]=React.useState(1),[pending,setPending]=React.useState(restore),[sending,setSending]=React.useState(false),[message,setMessage]=React.useState(''),[enabled,setEnabled]=React.useState(null),[optionError,setOptionError]=React.useState(false);
  const held=React.useRef(pending),lock=React.useRef(false),mounted=React.useRef(true);
  React.useEffect(()=>{mounted.current=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);fetch('/api/core511-r49-options',{cache:'no-store',credentials:'same-origin',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('options');const flags=await response.json();if(mounted.current)setEnabled((options.accessories?flags.gameplayR58?.adminAccessories:flags.gameplayR55?.adminMaterials)===true);}).catch(()=>{if(mounted.current)setOptionError(true);}).finally(()=>clearTimeout(timer));return()=>{mounted.current=false;controller.abort();clearTimeout(timer);};},[]);
  const save=job=>{held.current=job;if(mounted.current)setPending(job);try{if(job)sessionStorage.setItem(storageKey,JSON.stringify(job));else sessionStorage.removeItem(storageKey);}catch{}};
  const send=async(retry=false)=>{
   if(lock.current||busy||enabled!==true)return;
   if(!retry&&held.current){setMessage('Önce bekleyen gönderimi yeniden sorgula.');return;}
   const item=find(kind);
   if(!retry&&(!player?.id||!item||!Number.isSafeInteger(amount)||amount<1||amount>item.cap)){setMessage('Oyuncu ve malzeme seç; geçerli bir adet yaz.');return;}
   const job=held.current??{playerId:player.id,playerName:player.name,kind,amount,requestId:crypto.randomUUID()};
   if(!valid(job)){setMessage('Bekleyen gönderim okunamadı. Paneli yenile.');return;}
   lock.current=true;setSending(true);setMessage('');save(job);
   try{
    const data=await act({action:'grant_enhancement_material_r55',playerId:job.playerId,kind:job.kind,amount:job.amount,requestId:job.requestId}),result=data?.materialGrant;
    if(!result||result.ok!==true||result.requestId!==job.requestId||result.playerId!==job.playerId||result.kind!==job.kind||result.amount!==job.amount||!Number.isSafeInteger(result.balance))throw Error('Gönderim sonucu doğrulanamadı. Aynı işlemi yeniden sorgula.');
    save(null);if(mounted.current)setMessage(job.playerName+': '+result.amount+' '+find(job.kind).label+' '+(result.replayed?'daha önce gönderilmişti; tekrar eklenmedi.':'gönderildi.')+' Toplam: '+result.balance+'.');
   }catch(error){
    // A lost reply can follow COMMIT. Retain the exact request across retries
    // and reloads until a receipt confirms it or a definite rejection arrives.
    if([400,404,413,415,422].includes(error?.status)||['material_balance_limit','bag_full'].includes(error?.payload?.code))save(null);
    if(mounted.current)setMessage(error?.message??'Yanıt alınamadı. Aynı işlemi yeniden sorgula.');
   }finally{lock.current=false;if(mounted.current)setSending(false);}
  };
  if(enabled===false)return null;
  if(enabled!==true)return optionError?h('section',{className:'admin-card'},h('h2',null,options.accessories?'Aksesuar Gönder':'Artı Basma ve Kule Malzemeleri'),h('p',{role:'status'},'Malzeme gönderimi durumu alınamadı. Paneli yenileyip tekrar dene.')):null;
  const item=find(kind),disabled=!!busy||sending;
  return h('section',{className:'admin-card mount49-admin'},h('style',null,css),h('h2',null,options.accessories?'Aksesuar Gönder':'Artı Basma ve Kule Malzemeleri'),h('p',null,player?player.name+' · Seçili oyuncu':'Oyuncular listesinden bir oyuncu seç.'),h('p',null,options.accessories?'Küpe, bilezik ve kemeri seçili oyuncunun çantasına gönder. Çevrimdışı oyuncuya da gönderebilirsin.':'Artı basma kaynakları, zindan ve Kadim Kulesi malzemeleri doğrudan seçili oyuncunun envanterine eklenir. Çevrimdışı oyuncuya da gönderebilirsin.'),h('div',{className:'mount49-admin-controls'},h('label',null,options.accessories?'Aksesuar':'Artı basma / kule malzemesi',h('select',{'aria-label':options.accessories?'Aksesuar':'Artı basma / kule malzemesi',value:kind,disabled:disabled||!!pending,onChange:event=>{const next=find(event.target.value);if(next){setKind(next.kind);setAmount(1);}}},catalog.map(entry=>h('option',{key:entry.kind,value:entry.kind},entry.label+' · En çok '+entry.cap)))),h('label',null,'Adet',h('input',{type:'number',inputMode:'numeric',min:1,max:item.cap,step:1,required:true,value:amount,disabled:disabled||!!pending,onChange:event=>setAmount(event.target.value===''?'':Number(event.target.value))})),h('button',{type:'button',className:'admin-primary',disabled:disabled||!!pending||!player?.id||!Number.isSafeInteger(amount)||amount<1||amount>item.cap,onClick:()=>void send()},sending?'Gönderiliyor…':'Oyuncuya gönder')),h('p',null,h('small',null,'Gönderim sonucu belirsizse yeni işlem açma; aynı gönderimi yeniden sorgula. Tekrar sorgulama eşya miktarını ikinci kez artırmaz.')),pending&&h('div',{className:'mount49-admin-status'},h('p',null,'Bekleyen gönderim: '+pending.playerName+' · '+pending.amount+' '+find(pending.kind).label),h('button',{type:'button',disabled,onClick:()=>void send(true)},'Aynı gönderimi yeniden sorgula')),message&&h('p',{className:'mount49-admin-status',role:'status'},message));
 };
})(X,[{"kind":"equipment:earring","label":"Yaşam Küpesi","cap":35},{"kind":"equipment:bracelet","label":"Yaşam Bileziği","cap":35},{"kind":"equipment:belt:wisdom","label":"Bilgelik Kemeri","cap":35},{"kind":"equipment:belt:sovereign","label":"Hükümdar Kemeri","cap":35}],{accessories:true,storageKey:"core511.r58.accessoryGrant.pending"});
const colMaterialGrantR55=(function createMaterialGrantAdminR55(React,catalog){
 const h=React.createElement,storageKey='core511.r55.materialGrant.pending',find=kind=>catalog.find(item=>item.kind===kind);
 const css='.mount49-admin{min-width:0}.mount49-admin p{line-height:1.5;overflow-wrap:anywhere}.mount49-admin-controls{display:flex;align-items:end;gap:12px;flex-wrap:wrap}.mount49-admin-controls label{display:grid;gap:6px;min-width:0;flex:1 1 160px}.mount49-admin-controls select,.mount49-admin-controls input{width:100%;min-width:0;box-sizing:border-box;min-height:42px}.mount49-admin button{min-height:42px;white-space:normal}.mount49-admin-status{padding:10px;border:1px solid #76633b;border-radius:6px;background:#201e16}.mount49-admin small{color:#c6bca8}';
 const valid=job=>job&&typeof job.playerId==='string'&&job.playerId.length>0&&typeof job.playerName==='string'&&find(job.kind)&&Number.isSafeInteger(job.amount)&&job.amount>0&&job.amount<=find(job.kind).cap&&typeof job.requestId==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(job.requestId);
 const restore=()=>{try{const value=JSON.parse(sessionStorage.getItem(storageKey));return valid(value)?value:null;}catch{return null;}};
 return function MaterialGrantAdminR55({player,busy,act}){
  const [kind,setKind]=React.useState(catalog[0].kind),[amount,setAmount]=React.useState(1),[pending,setPending]=React.useState(restore),[sending,setSending]=React.useState(false),[message,setMessage]=React.useState(''),[enabled,setEnabled]=React.useState(null),[optionError,setOptionError]=React.useState(false);
  const held=React.useRef(pending),lock=React.useRef(false),mounted=React.useRef(true);
  React.useEffect(()=>{mounted.current=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);fetch('/api/core511-r49-options',{cache:'no-store',credentials:'same-origin',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('options');const flags=await response.json();if(mounted.current)setEnabled(flags.gameplayR55?.adminMaterials===true);}).catch(()=>{if(mounted.current)setOptionError(true);}).finally(()=>clearTimeout(timer));return()=>{mounted.current=false;controller.abort();clearTimeout(timer);};},[]);
  const save=job=>{held.current=job;if(mounted.current)setPending(job);try{if(job)sessionStorage.setItem(storageKey,JSON.stringify(job));else sessionStorage.removeItem(storageKey);}catch{}};
  const send=async(retry=false)=>{
   if(lock.current||busy||enabled!==true)return;
   if(!retry&&held.current){setMessage('Önce bekleyen gönderimi yeniden sorgula.');return;}
   const item=find(kind);
   if(!retry&&(!player?.id||!item||!Number.isSafeInteger(amount)||amount<1||amount>item.cap)){setMessage('Oyuncu ve malzeme seç; geçerli bir adet yaz.');return;}
   const job=held.current??{playerId:player.id,playerName:player.name,kind,amount,requestId:crypto.randomUUID()};
   if(!valid(job)){setMessage('Bekleyen gönderim okunamadı. Paneli yenile.');return;}
   lock.current=true;setSending(true);setMessage('');save(job);
   try{
    const data=await act({action:'grant_enhancement_material_r55',playerId:job.playerId,kind:job.kind,amount:job.amount,requestId:job.requestId}),result=data?.materialGrant;
    if(!result||result.ok!==true||result.requestId!==job.requestId||result.playerId!==job.playerId||result.kind!==job.kind||result.amount!==job.amount||!Number.isSafeInteger(result.balance))throw Error('Gönderim sonucu doğrulanamadı. Aynı işlemi yeniden sorgula.');
    save(null);if(mounted.current)setMessage(job.playerName+': '+result.amount+' '+find(job.kind).label+' '+(result.replayed?'daha önce gönderilmişti; tekrar eklenmedi.':'gönderildi.')+' Toplam: '+result.balance+'.');
   }catch(error){
    // A lost reply can follow COMMIT. Retain the exact request across retries
    // and reloads until a receipt confirms it or a definite rejection arrives.
    if([400,404,413,415,422].includes(error?.status)||error?.payload?.code==='material_balance_limit')save(null);
    if(mounted.current)setMessage(error?.message??'Yanıt alınamadı. Aynı işlemi yeniden sorgula.');
   }finally{lock.current=false;if(mounted.current)setSending(false);}
  };
  if(enabled===false)return null;
  if(enabled!==true)return optionError?h('section',{className:'admin-card'},h('h2',null,'Artı Basma ve Kule Malzemeleri'),h('p',{role:'status'},'Malzeme gönderimi durumu alınamadı. Paneli yenileyip tekrar dene.')):null;
  const item=find(kind),disabled=!!busy||sending;
  return h('section',{className:'admin-card mount49-admin'},h('style',null,css),h('h2',null,'Artı Basma ve Kule Malzemeleri'),h('p',null,player?player.name+' · Seçili oyuncu':'Oyuncular listesinden bir oyuncu seç.'),h('p',null,'Artı basma kaynakları, zindan ve Kadim Kulesi malzemeleri doğrudan seçili oyuncunun envanterine eklenir. Çevrimdışı oyuncuya da gönderebilirsin.'),h('div',{className:'mount49-admin-controls'},h('label',null,'Artı basma / kule malzemesi',h('select',{'aria-label':'Artı basma / kule malzemesi',value:kind,disabled:disabled||!!pending,onChange:event=>{const next=find(event.target.value);if(next){setKind(next.kind);setAmount(1);}}},catalog.map(entry=>h('option',{key:entry.kind,value:entry.kind},entry.label+' · En çok '+entry.cap)))),h('label',null,'Adet',h('input',{type:'number',inputMode:'numeric',min:1,max:item.cap,step:1,required:true,value:amount,disabled:disabled||!!pending,onChange:event=>setAmount(event.target.value===''?'':Number(event.target.value))})),h('button',{type:'button',className:'admin-primary',disabled:disabled||!!pending||!player?.id||!Number.isSafeInteger(amount)||amount<1||amount>item.cap,onClick:()=>void send()},sending?'Gönderiliyor…':'Oyuncuya gönder')),h('p',null,h('small',null,'Gönderim sonucu belirsizse yeni işlem açma; aynı gönderimi yeniden sorgula. Tekrar sorgulama eşya miktarını ikinci kez artırmaz.')),pending&&h('div',{className:'mount49-admin-status'},h('p',null,'Bekleyen gönderim: '+pending.playerName+' · '+pending.amount+' '+find(pending.kind).label),h('button',{type:'button',disabled,onClick:()=>void send(true)},'Aynı gönderimi yeniden sorgula')),message&&h('p',{className:'mount49-admin-status',role:'status'},message));
 };
})(X,[{"kind":"resource:gems","label":"Mücevher","cap":1000000},{"kind":"resource:essence","label":"Yaşam Özü","cap":1000000},{"kind":"resource:pearls","label":"Beyaz İnci","cap":1000000},{"kind":"resource:red_pearls","label":"Kırmızı İnci","cap":1000000},{"kind":"resource:potions","label":"Kırmızı İksir","cap":1000000},{"kind":"resource:stone_dust","label":"Taş Tozu","cap":1000000},{"kind":"resource:fish_sokan","label":"Sokan Balığı","cap":1000000},{"kind":"resource:fish_levrek","label":"Levrek","cap":1000000},{"kind":"resource:fish_zargana","label":"Zargana","cap":1000000},{"kind":"resource:talisman_stones","label":"Tılsım Taşı","cap":1000000},{"kind":"resource:item_link_orbs","label":"Eşya Yansıtma","cap":1000000},{"kind":"resource:enchant_scrolls","label":"Efsun Değiştirme Parşömeni","cap":1000000},{"kind":"resource:enchant_add_scrolls","label":"Efsun Artırma Nesnesi","cap":1000000},{"kind":"resource:fifth_enchant_scrolls","label":"5. Efsun Nesnesi","cap":1000000},{"kind":"resource:rename_scrolls","label":"İsim Değiştirme Parşömeni","cap":1000000},{"kind":"resource:arena_coins","label":"Arena Coin","cap":1000000},{"kind":"material:forge_ember491","label":"Kor Mührü","cap":1000000},{"kind":"material:strong_branch","label":"Güçlü Dal","cap":1000000},{"kind":"material:strong_crystal","label":"Güçlü Kristal","cap":1000000},{"kind":"material:desert_plant","label":"Çöl Bitkisi","cap":1000000},{"kind":"material:master_scroll","label":"Usta Parşömeni","cap":1000000},{"kind":"material:weathered_iron","label":"Eskitilmiş Demir Parçası","cap":1000000},{"kind":"material:solo_key","label":"Zindan Anahtarı","cap":1000000},{"kind":"material:wing","label":"Kanat Parçası","cap":1000000},{"kind":"material:infinite","label":"Sonsuz Taşı Parçası","cap":1000000},{"kind":"material:pet","label":"Ejderha Parçası","cap":1000000},{"kind":"material:rune_attack","label":"Kızıl Kudret Parçası","cap":1000000},{"kind":"material:rune_defense","label":"Safir Siper Parçası","cap":1000000},{"kind":"material:rune_hp","label":"Zümrüt Yaşam Parçası","cap":1000000},{"kind":"material:halloween_pumpkin","label":"Bal Kabağı","cap":1000000},{"kind":"material:witch_wand","label":"Cadının Sihirli Değneği","cap":1000000},{"kind":"material:halloween_candy","label":"Cadı Şekeri","cap":1000000},{"kind":"material:specialization_reset_scroll463","label":"Uzmanlık Sıfırlama Parşömeni","cap":1000000},{"kind":"stone:book","label":"Taş Sanatı Kitabı","cap":1000000},{"kind":"stone:evolution_scroll","label":"Evrim Parşömeni","cap":1000000},{"kind":"stone:crystal_chest","label":"Kristal Sandığı","cap":1000000},{"kind":"stone:moonlight_chest","label":"Ayışığı Sandığı","cap":1000000},{"kind":"stone:critical","label":"Kritik Şansı Taşı · temel","cap":1000000},{"kind":"stone:attack","label":"Saldırı Gücü Taşı · temel","cap":1000000},{"kind":"stone:defense","label":"Savunma Taşı · temel","cap":1000000},{"kind":"stone:block","label":"Bloklama Taşı · temel","cap":1000000},{"kind":"stone:critical:7","label":"Kritik Şansı Taşı %7","cap":1000000},{"kind":"stone:critical:8","label":"Kritik Şansı Taşı %8","cap":1000000},{"kind":"stone:critical:9","label":"Kritik Şansı Taşı %9","cap":1000000},{"kind":"stone:critical:10","label":"Kritik Şansı Taşı %10","cap":1000000},{"kind":"stone:attack:20","label":"Saldırı Gücü Taşı +20","cap":1000000},{"kind":"stone:attack:25","label":"Saldırı Gücü Taşı +25","cap":1000000},{"kind":"stone:attack:30","label":"Saldırı Gücü Taşı +30","cap":1000000},{"kind":"stone:defense:30","label":"Savunma Taşı +30","cap":1000000},{"kind":"stone:defense:40","label":"Savunma Taşı +40","cap":1000000},{"kind":"stone:defense:50","label":"Savunma Taşı +50","cap":1000000},{"kind":"stone:block:6","label":"Bloklama Taşı %6","cap":1000000},{"kind":"stone:block:7","label":"Bloklama Taşı %7","cap":1000000},{"kind":"stone:block:8","label":"Bloklama Taşı %8","cap":1000000},{"kind":"material:tower_seal_shard","label":"Kadim Kat Mührü","cap":1000000},{"kind":"material:tower_chain_ore","label":"Ruh Zinciri Halkası","cap":1000000},{"kind":"material:tower_mourning_essence","label":"Sinsi Taş Çekirdeği","cap":1000000},{"kind":"material:tower_azrail_seal","label":"Matem İpeği","cap":1000000},{"kind":"material:tower_azrail_chest","label":"Azrail Sandığı","cap":1000000},{"kind":"material:tower_azrail_hook","label":"AZRAİL KANCASI","cap":1000000},{"kind":"resource:mastery_seals492","label":"Ustalık Mührü","cap":1000000}]);
const colMountDropsR55=(function createMountDropsAdminR55(React,defaults){
 const h=React.createElement,copy=v=>JSON.parse(JSON.stringify(v));
 return function MountDropsAdminR55({act,busy}){
  const [data,setData]=React.useState(null),[draft,setDraft]=React.useState(null),[message,setMessage]=React.useState(''),[working,setWorking]=React.useState(false);const alive=React.useRef(true),lock=React.useRef(false);
  async function load(){if(lock.current)return;lock.current=true;setWorking(true);try{const r=await act({action:'mount_drop_get_r55'});if(!r?.mountDrops?.ok)throw Error('Binek ayarları alınamadı.');if(alive.current){setData(r.mountDrops);setDraft(copy(r.mountDrops.config));setMessage('');}}catch(e){if(alive.current)setMessage(e.message??'Binek ayarları alınamadı.');}finally{lock.current=false;if(alive.current)setWorking(false);}}
  React.useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;};},[]);
  const edit=(kind,change)=>setDraft(prior=>({materials:prior.materials.map(row=>row.kind===kind?change(copy(row)):row)}));
  async function save(){if(lock.current||!data||!draft)return;lock.current=true;setWorking(true);setMessage('');try{const r=await act({action:'mount_drop_save_r55',expectedRevision:data.revision,config:draft});if(!r?.mountDrops?.ok)throw Error('Kayıt sonucu alınamadı. Aynı ayarları yeniden kaydet.');if(alive.current){setData(r.mountDrops);setDraft(copy(r.mountDrops.config));setMessage('Binek malzemelerinin düşme ayarları kaydedildi.');}}catch(e){if(alive.current)setMessage(e.message??'Kayıt sonucu alınamadı. Aynı ayarları yeniden kaydet.');}finally{lock.current=false;if(alive.current)setWorking(false);}}
  const disabled=working||busy,legacy={saddle_leather:'Kuzey Ormanı: görevin ilk 30 uygun avında birer Sağlam Deri.',saddle_buckle:'Donmuş Çam Geçidi: ilk 50 görev avında her 5. avda bir Eyer Tokası.',saddle_rein:'Kara Bölge: ilk 50 görev avında her 10. avda bir Dizgin Parçası.'};
  return h('section',{className:'admin-card mount55-admin'},h('style',null,'.mount55-admin{min-width:0}.mount55-admin p{line-height:1.5;overflow-wrap:anywhere}.mount55-admin fieldset{border:1px solid #645c43;border-radius:8px;margin:16px 0;padding:14px;min-width:0}.mount55-admin legend{font-weight:700;color:#e6cd91}.mount55-admin label{display:grid;gap:5px;min-width:0}.mount55-admin select,.mount55-admin input{min-width:0;width:100%;box-sizing:border-box;min-height:42px}.mount55-source{display:grid;grid-template-columns:minmax(120px,2fr) minmax(100px,1fr) 90px auto;gap:10px;align-items:end;margin:12px 0}.mount55-admin button{min-height:42px;white-space:normal}.mount55-actions{display:flex;flex-wrap:wrap;gap:12px}@media(max-width:650px){.mount55-source{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}'),
   h('h2',null,'Binek'),h('p',null,'Sağlam Deri, Eyer Tokası ve Dizgin Parçası için düşme haritalarını ve oranlarını buradan yönetebilirsin.'),
   h('p',null,'Malzemeler aktif binek görevi olan, ödüle hak kazanmış oyunculara verilir. Toplama ve parti ödül kuralları korunur. Gerekli miktara ulaşan malzeme tekrar verilmez. Görev av sayısı ve iki boss belgesi şartı değişmez.'),
   !draft?h('p',{role:'status'},working?'Ayarlar yükleniyor…':'Ayarları yüklemek için Yenile’ye bas.'):draft.materials.map(row=>h('fieldset',{key:row.kind,disabled},h('legend',null,data.materials.find(x=>x.kind===row.kind)?.label??row.kind),
    h('label',null,'Dağıtım',h('select',{'aria-label':'Dağıtım',value:row.mode,onChange:e=>{const value=e.target.value;edit(row.kind,r=>value==='legacy'?copy(defaults.materials.find(x=>x.kind===r.kind)):{...r,mode:'chance'});}},h('option',{value:'legacy'},'Mevcut görev sayacı'),h('option',{value:'chance'},'Harita ve yüzde ile düşür'))),
    row.mode==='legacy'?h('p',null,legacy[row.kind]+' Bu düzen rastgele yüzde değildir.'):h(React.Fragment,null,h('p',null,'Her uygun ölümde aşağıdaki oran uygulanır. Av görevi 50/50 olduktan sonra da eksik malzemeyi toplamaya devam edebilir.'),
     ...row.sources.map((s,i)=>h('div',{className:'mount55-source',key:i},
      h('label',null,'Harita',h('select',{'aria-label':'Harita',value:s.area,onChange:e=>{const value=e.target.value;edit(row.kind,r=>{r.sources[i].area=value;return r;});}},data.areas.map(a=>h('option',{key:a.id,value:a.id},a.label)))),
      h('label',null,'Canavar',h('select',{'aria-label':'Canavar',value:s.monsters,onChange:e=>{const value=e.target.value;edit(row.kind,r=>{r.sources[i].monsters=value;return r;});}},h('option',{value:'normal'},'Normal canavar'),h('option',{value:'boss'},'Boss'),h('option',{value:'stone'},'Sinsi taş'))),
      h('label',null,'Oran (%)',h('input',{type:'number',min:0,max:100,step:.01,value:s.chance,inputMode:'decimal',onChange:e=>{const value=e.target.value;edit(row.kind,r=>{r.sources[i].chance=value===''?'':Number(value);return r;});}})),
      h('button',{type:'button',onClick:()=>edit(row.kind,r=>{r.sources.splice(i,1);return r;})},'Kaldır'))),
     h('button',{type:'button',disabled:disabled||row.sources.length>=20,onClick:()=>edit(row.kind,r=>{const pair=data.areas.flatMap(a=>['normal','boss','stone'].map(monsters=>({area:a.id,monsters,chance:0}))).find(s=>!r.sources.some(x=>x.area===s.area&&x.monsters===s.monsters));if(pair)r.sources.push(pair);return r;})},'Harita ekle'),h('small',null,' Zindan/kule içi düşmanlar ve çağrılmış/test canavarları bu listeye dahil değildir.')))),
   h('div',{className:'mount55-actions'},h('button',{type:'button',className:'admin-primary',disabled:disabled||!draft,onClick:()=>void save()},working?'İşleniyor…':'Ayarları kaydet'),h('button',{type:'button',disabled,onClick:()=>void load()},'Yenile')),message&&h('p',{role:'status'},message));
 };
})(X,{"materials":[{"kind":"saddle_leather","mode":"legacy","sources":[{"area":"forest","chance":100,"monsters":"normal"}]},{"kind":"saddle_buckle","mode":"legacy","sources":[{"area":"frozen","chance":20,"monsters":"normal"}]},{"kind":"saddle_rein","mode":"legacy","sources":[{"area":"black","chance":10,"monsters":"normal"}]}]});
const colMountGrantR49=(function createMountGrantAdminR49(React,catalog){
 const h=React.createElement,storageKey='core511.r49.mountGrant.pending',find=kind=>catalog.find(item=>item.kind===kind);
 const css='.mount49-admin{min-width:0}.mount49-admin p{line-height:1.5;overflow-wrap:anywhere}.mount49-admin-controls{display:flex;align-items:end;gap:12px;flex-wrap:wrap}.mount49-admin-controls label{display:grid;gap:6px;min-width:0;flex:1 1 160px}.mount49-admin-controls select,.mount49-admin-controls input{width:100%;min-width:0;box-sizing:border-box;min-height:42px}.mount49-admin button{min-height:42px;white-space:normal}.mount49-admin-status{padding:10px;border:1px solid #76633b;border-radius:6px;background:#201e16}.mount49-admin small{color:#c6bca8}';
 const valid=job=>job&&typeof job.playerId==='string'&&job.playerId.length>0&&typeof job.playerName==='string'&&find(job.kind)&&Number.isSafeInteger(job.amount)&&job.amount>0&&job.amount<=find(job.kind).cap&&typeof job.requestId==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(job.requestId);
 const restore=()=>{try{const value=JSON.parse(sessionStorage.getItem(storageKey));return valid(value)?value:null;}catch{return null;}};
 return function MountGrantAdminR49({player,busy,act}){
  const [kind,setKind]=React.useState(catalog[0].kind),[amount,setAmount]=React.useState(catalog[0].cap),[pending,setPending]=React.useState(restore),[sending,setSending]=React.useState(false),[message,setMessage]=React.useState(''),[enabled,setEnabled]=React.useState(null),[optionError,setOptionError]=React.useState(false);
  const held=React.useRef(pending),lock=React.useRef(false),mounted=React.useRef(true);
  React.useEffect(()=>{mounted.current=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);fetch('/api/core511-r49-options',{cache:'no-store',credentials:'same-origin',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('options');const flags=await response.json();if(mounted.current)setEnabled(flags.mounts===true);}).catch(()=>{if(mounted.current)setOptionError(true);}).finally(()=>clearTimeout(timer));return()=>{mounted.current=false;controller.abort();clearTimeout(timer);};},[]);
  const save=job=>{held.current=job;if(mounted.current)setPending(job);try{if(job)sessionStorage.setItem(storageKey,JSON.stringify(job));else sessionStorage.removeItem(storageKey);}catch{}};
  const send=async(retry=false)=>{
   if(lock.current||busy||enabled!==true)return;
   if(!retry&&held.current){setMessage('Önce bekleyen gönderimi yeniden sorgula.');return;}
   const item=find(kind);
   if(!retry&&(!player?.id||!item||!Number.isSafeInteger(amount)||amount<1||amount>item.cap)){setMessage('Oyuncu ve malzeme seç; geçerli bir adet yaz.');return;}
   const job=held.current??{playerId:player.id,playerName:player.name,kind,amount,requestId:crypto.randomUUID()};
   if(!valid(job)){setMessage('Bekleyen gönderim okunamadı. Paneli yenile.');return;}
   lock.current=true;setSending(true);setMessage('');save(job);
   try{
    const data=await act({action:'grant_mount_material_r49',playerId:job.playerId,kind:job.kind,amount:job.amount,requestId:job.requestId}),result=data?.mountGrant;
    if(!result||result.ok!==true||result.requestId!==job.requestId||result.playerId!==job.playerId||result.kind!==job.kind||result.amount!==job.amount||!Number.isSafeInteger(result.balance))throw Error('Gönderim sonucu doğrulanamadı. Aynı işlemi yeniden sorgula.');
    save(null);if(mounted.current)setMessage(job.playerName+': '+result.amount+' '+find(job.kind).label+' '+(result.replayed?'daha önce gönderilmişti; tekrar eklenmedi.':'gönderildi.')+' Toplam: '+result.balance+'.');
   }catch(error){
    // A lost reply can follow COMMIT. Retain the exact request across retries
    // and reloads until a receipt confirms it or a definite rejection arrives.
    if([400,404,413,415,422].includes(error?.status)||error?.payload?.code==='mount_material_cap')save(null);
    if(mounted.current)setMessage(error?.message??'Yanıt alınamadı. Aynı işlemi yeniden sorgula.');
   }finally{lock.current=false;if(mounted.current)setSending(false);}
  };
  if(enabled===false)return null;
  if(enabled!==true)return optionError?h('section',{className:'admin-card'},h('h2',null,'Binek Görevi Malzemeleri'),h('p',{role:'status'},'Binek durumu alınamadı. Paneli yenileyip tekrar dene.')):null;
  const item=find(kind),disabled=!!busy||sending;
  return h('section',{className:'admin-card mount49-admin'},h('style',null,css),h('h2',null,'Binek Görevi Malzemeleri'),h('p',null,player?player.name+' · Seçili oyuncu':'Oyuncular listesinden bir oyuncu seç.'),h('p',null,'Av mühürleri, boss belgeleri ve bütün eyer malzemeleri oyuncuya bağlı görev çantasına gider. Çevrimdışı oyuncuya da gönderebilirsin.'),h('div',{className:'mount49-admin-controls'},h('label',null,'Malzeme / görev belgesi',h('select',{value:kind,disabled:disabled||!!pending,onChange:event=>{const next=find(event.target.value);if(next){setKind(next.kind);setAmount(next.cap);}}},catalog.map(entry=>h('option',{key:entry.kind,value:entry.kind},entry.label+' · En çok '+entry.cap)))),h('label',null,'Adet',h('input',{type:'number',inputMode:'numeric',min:1,max:item.cap,step:1,required:true,value:amount,disabled:disabled||!!pending,onChange:event=>setAmount(event.target.value===''?'':Number(event.target.value))})),h('button',{type:'button',className:'admin-primary',disabled:disabled||!!pending||!player?.id||!Number.isSafeInteger(amount)||amount<1||amount>item.cap,onClick:()=>void send()},sending?'Gönderiliyor…':'Oyuncuya gönder')),h('p',null,h('small',null,'Hızlı test: 30. seviyedeki oyuncuyla Seyis’ten görev al. Üç av mührünü, iki farklı boss belgesini ve üç eyer malzemesini gönder; oyuncu eyeri üretsin ve bineği evcilleştirsin. Sadece evcilleştirmeyi denemek için Evcilleştirme Eyeri gönderebilirsin.')),pending&&h('div',{className:'mount49-admin-status'},h('p',null,'Bekleyen gönderim: '+pending.playerName+' · '+pending.amount+' '+find(pending.kind).label),h('button',{type:'button',disabled,onClick:()=>void send(true)},'Aynı gönderimi yeniden sorgula')),message&&h('p',{className:'mount49-admin-status',role:'status'},message));
 };
})(X,[{"kind":"hunt_forest","label":"Kuzey Ormanı Av Mührü","cap":50,"required":50,"bound":true},{"kind":"hunt_frozen","label":"Donmuş Çam Geçidi Av Mührü","cap":50,"required":50,"bound":true},{"kind":"hunt_black","label":"Kara Bölge Av Mührü","cap":50,"required":50,"bound":true},{"kind":"boss_world","label":"Dünya Bossu Katkı Belgesi","cap":1,"bound":true},{"kind":"boss_frozen","label":"Buz Tahtı Muhafızı Katkı Belgesi","cap":1,"bound":true},{"kind":"boss_ancient","label":"Kadim Muhafız Katkı Belgesi","cap":1,"bound":true},{"kind":"saddle_leather","label":"Sağlam Deri","required":30,"cap":30,"bound":true},{"kind":"saddle_buckle","label":"Eyer Tokası","required":8,"cap":8,"bound":true},{"kind":"saddle_rein","label":"Dizgin Parçası","required":5,"cap":5,"bound":true},{"kind":"mount_saddle","label":"Evcilleştirme Eyeri","cap":1,"required":1,"bound":true}]);
const colAfkAdminR32=createAfkAdmin(X);
const colMotionAdminR34=createMotionAdmin(X);
const colAzrailGrantR31=(function createAzrailGrantAdminR31(React){
 const h=React.createElement,storageKey='core511.r31.azrailGrant.pending';
 const css='.azrail31-card{min-width:0}.azrail31-heading{display:flex;align-items:center;gap:12px}.azrail31-icon{width:58px;height:58px;flex:none}.azrail31-card p{overflow-wrap:anywhere;line-height:1.5}.azrail31-controls{display:flex;align-items:end;gap:12px;flex-wrap:wrap}.azrail31-controls label{display:grid;gap:6px;min-width:0;flex:1 1 160px}.azrail31-controls input{width:100%;min-width:0;box-sizing:border-box}.azrail31-controls button{min-height:42px;white-space:normal}.azrail31-status{padding:10px;border:1px solid #76633b;border-radius:6px;background:#201e16}';
 const valid=job=>job&&typeof job.playerId==='string'&&job.playerId.length>0&&typeof job.playerName==='string'&&Number.isSafeInteger(job.amount)&&job.amount>0&&typeof job.requestId==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(job.requestId);
 const restore=()=>{try{const value=JSON.parse(sessionStorage.getItem(storageKey));return valid(value)?value:null;}catch{return null;}};
 const chest=()=>h('svg',{className:'azrail31-icon',viewBox:'0 0 64 64',role:'img','aria-label':'Azrail Sandığı'},h('path',{d:'M9 29Q9 12 25 12H39Q55 12 55 29V51H9Z',fill:'#282b32',stroke:'#c9a36a',strokeWidth:3}),h('path',{d:'M9 29H55M21 14V50M43 14V50',stroke:'#937140',strokeWidth:3}),h('path',{d:'M27 26H37V40H27Z',fill:'#d1ad68',stroke:'#f4daa4',strokeWidth:2}),h('path',{d:'M32 29L35 33L32 37L29 33Z',fill:'#8b343d'}));
 return function AzrailGrantAdmin({player,busy,act}){
  const [amount,setAmount]=React.useState(1),[pending,setPending]=React.useState(restore),[sending,setSending]=React.useState(false),[message,setMessage]=React.useState('');
  const held=React.useRef(pending),lock=React.useRef(false),mounted=React.useRef(true);
  React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const save=job=>{held.current=job;setPending(job);try{if(job)sessionStorage.setItem(storageKey,JSON.stringify(job));else sessionStorage.removeItem(storageKey);}catch{}};
  const send=async(retry=false)=>{
   if(lock.current||busy)return;
   if(!retry&&held.current){setMessage('Önce bekleyen gönderimi yeniden sorgula.');return;}
   if(!retry&&(!player?.id||!Number.isSafeInteger(amount)||amount<1)){setMessage('Oyuncu seç ve pozitif bir tam sayı yaz.');return;}
   const job=held.current??{playerId:player.id,playerName:player.name,amount,requestId:crypto.randomUUID()};
   if(!valid(job)){setMessage('Bekleyen gönderim okunamadı. Paneli yenile.');return;}
   lock.current=true;setSending(true);setMessage('');save(job);
   try{
    const data=await act({action:'grant_azrail_chests',playerId:job.playerId,amount:job.amount,requestId:job.requestId}),result=data?.azrailGrant;
    if(!result||result.requestId!==job.requestId||result.playerId!==job.playerId||result.amount!==job.amount)throw Error('Gönderim sonucu doğrulanamadı. Aynı işlemi yeniden sorgula.');
    save(null);if(mounted.current)setMessage(result.playerName+': '+result.amount.toLocaleString('tr-TR')+' Azrail Sandığı '+(result.replayed?'daha önce gönderilmişti; tekrar eklenmedi.':'gönderildi.')+' İşlem sonrası toplam: '+result.balance.toLocaleString('tr-TR')+'.');
   }catch(error){
    // A queue/transport failure may follow COMMIT. Keep the exact request until
    // the durable receipt confirms it; never silently replace a pending gift.
    if([400,404,413,422].includes(error?.status))save(null);
    if(mounted.current)setMessage(error?.message??'Yanıt alınamadı. Aynı işlemi yeniden sorgula.');
   }finally{lock.current=false;if(mounted.current)setSending(false);}
  };
  const disabled=!!busy||sending;
  return h('section',{className:'admin-card azrail31-card'},h('style',null,css),h('div',{className:'azrail31-heading'},chest(),h('div',null,h('h2',null,'Azrail Sandığı Gönder'),h('p',null,player?player.name+' · Seçili oyuncu':'Oyuncular listesinden bir oyuncu seç.'))),h('p',null,'Sandıklar oyuncunun çantasına eklenir. Çevrimdışı oyunculara da gönderebilirsin.'),h('div',{className:'azrail31-controls'},h('label',null,'Sandık adedi',h('input',{type:'number',inputMode:'numeric',min:1,max:Number.MAX_SAFE_INTEGER,step:1,required:true,value:amount,disabled:disabled||!!pending,onChange:event=>setAmount(event.target.value===''?'':Number(event.target.value))})),h('button',{type:'button',className:'admin-primary',disabled:disabled||!!pending||!player?.id||!Number.isSafeInteger(amount)||amount<1,onClick:()=>void send()},sending?'Gönderiliyor…':'Sandıkları gönder')),pending&&h('div',{className:'azrail31-status'},h('p',null,'Bekleyen gönderim: '+pending.playerName+' · '+pending.amount.toLocaleString('tr-TR')+' sandık'),h('button',{type:'button',disabled,onClick:()=>void send(true)},'Aynı gönderimi yeniden sorgula')),message&&h('p',{className:'azrail31-status',role:'status'},message));
 };
})(X);
function He({ value: e2, busy: t2, act: n2, mode: r2 }) {
  let [i2, a2] = (0, X.useState)(() => structuredClone(e2[r2])), [o2, s2] = (0, X.useState)(``), [c2, l2] = (0, X.useState)(`material:weathered_iron`);
  (0, X.useEffect)(() => {
    a2(structuredClone(e2[r2]));
  }, [e2.revision, r2]);
  let u2 = (e3, t3) => a2((n3) => ({ ...n3, [e3]: t3 })), d2 = (e3, t3, n3, r3) => (0, Z.jsxs)(`label`, { children: [t3, (0, Z.jsx)(`input`, { type: `number`, min: n3, max: r3, step: `1`, value: i2[e3], onChange: (t4) => u2(e3, Number(t4.target.value)) })] }, e3), p2 = (e3, t3) => (0, Z.jsx)(`div`, { className: `progression-rule-fields`, children: [[`chance`, `D\xFC\u015Fme (%)`, 0, 100, 1e-3], [`min`, `En az`, 1, 1e4, 1], [`max`, `En \xE7ok`, 1, 1e4, 1]].map(([n3, r3, i3, a3, o3]) => (0, Z.jsxs)(`label`, { children: [r3, (0, Z.jsx)(`input`, { type: `number`, min: i3, max: a3, step: o3, value: e3[n3], onChange: (r4) => t3({ ...e3, [n3]: Number(r4.target.value) }) })] }, n3)) });
  return (0, Z.jsxs)(`section`, { className: `progression-editor`, children: [(0, Z.jsxs)(`header`, { children: [(0, Z.jsx)(`small`, { children: r2 === `solo` ? `TEK OYUNCULU Z\u0130NDAN` : `B\xD6LGE GAN\u0130METLER\u0130` }), (0, Z.jsx)(`h2`, { children: r2 === `solo` ? `Pasl\u0131 Mahzen` : `Art\u0131 Basma Malzemeleri` }), (0, Z.jsx)(`p`, { children: r2 === `solo` ? `\xDC\xE7 kademe ve \xFC\xE7\xFCnc\xFC kademenin sonunda Demir H\xFCk\xFCmdar. De\u011Fi\u015Fiklikler yeni ba\u015Flayan turlara uygulan\u0131r.` : `D\xF6rt malzemenin oran\u0131n\u0131 ve adet aral\u0131\u011F\u0131n\u0131 d\xFCzenle. Canavar bilgi ekran\u0131 ayn\u0131 oranlar\u0131 g\xF6sterir.` })] }), r2 === `solo` ? (0, Z.jsxs)(Z.Fragment, { children: [(0, Z.jsxs)(`label`, { className: `progression-switch`, children: [(0, Z.jsx)(`input`, { type: `checkbox`, checked: i2.enabled, onChange: (e3) => u2(`enabled`, e3.target.checked) }), `Solo zindan\u0131 oyunculara a\xE7`] }), (0, Z.jsxs)(`div`, { className: `progression-fields`, children: [d2(`daily_limit`, `G\xFCnl\xFCk giri\u015F hakk\u0131`, 1, 100), d2(`minimum_level`, `Gerekli seviye`, 1, 65), d2(`duration_seconds`, `Tur s\xFCresi (saniye)`, 300, 3600)] }), (0, Z.jsx)(`p`, { children: `Her giri\u015F 1 Zindan Anahtar\u0131 t\xFCketir. Haso d\xF6n\xFC\u015F\xFCm\xFC: 3 \u0130nci + 100 M\xFCcevher. G\xFCnl\xFCk haklar T\xFCrkiye saatiyle 00.00\u2019da yenilenir.` }), (0, Z.jsx)(`div`, { className: `progression-stages`, children: [1, 2, 3].map((e3) => (0, Z.jsxs)(`article`, { children: [(0, Z.jsx)(`img`, { src: j[e3].image, alt: `` }), (0, Z.jsxs)(`h3`, { children: [e3, `. Kademe \xB7 `, j[e3].name] }), d2(`stage${e3}_hp`, `Canavar can\u0131`, 1, 1e8), d2(`stage${e3}_damage`, `Canavar hasar\u0131`, 1, 1e6)] }, e3)) }), (0, Z.jsx)(`h3`, { children: `Demir H\xFCk\xFCmdar` }), (0, Z.jsxs)(`div`, { className: `progression-fields`, children: [d2(`boss_hp`, `Boss can\u0131`, 1, 1e8), d2(`boss_damage`, `Boss hasar\u0131`, 1, 1e6)] }), (0, Z.jsx)(`h3`, { children: `Bossun d\xFC\u015F\xFCrebilece\u011Fi e\u015Fyalar` }), (0, Z.jsx)(`p`, { children: `Her tamamlamada 3 ganimet se\xE7ilir. Oranlar se\xE7im a\u011F\u0131rl\u0131\u011F\u0131d\u0131r; %0 e\u015Fya se\xE7imini kapat\u0131r. Ayn\u0131 e\u015Fya birden fazla se\xE7ilebilir. Miktar aral\u0131\u011F\u0131 her se\xE7ime uygulan\u0131r.` }), (0, Z.jsxs)(`div`, { className: `progression-add`, children: [(0, Z.jsx)(`input`, { "aria-label": `\xD6d\xFCl ara`, placeholder: `E\u015Fya ad\u0131yla ara\u2026`, value: o2, onChange: (e3) => s2(e3.target.value) }), (0, Z.jsx)(`select`, { "aria-label": `Boss \xF6d\xFCl\xFC`, value: c2, onChange: (e3) => l2(e3.target.value), children: N.filter((e3) => !o2 || dungeonLootSearchText460(e3).toLocaleLowerCase(`tr`).includes(o2.toLocaleLowerCase(`tr`)) || e3.id === c2).map((e3) => (0, Z.jsxs)(`option`, { title: e3.name, value: e3.id, children: [dungeonLootLabel460(e3, true)] }, e3.id)) }), (0, Z.jsx)(`button`, { disabled: i2.loot.length >= 64 || i2.loot.some((e3) => e3.itemId === c2), onClick: () => u2(`loot`, [...i2.loot, { itemId: c2, chance: 1, min: 1, max: 1 }]), children: `E\u015Fya ekle` })] }), i2.loot.map((e3, t3) => {
    let n3 = m.get(e3.itemId), r3 = te[n3?.kind];
    return (0, Z.jsxs)(`article`, { className: `progression-drop`, children: [(0, Z.jsxs)(`div`, { children: [r3 && (0, Z.jsx)(`img`, { src: `/dungeon/${r3.image}.webp`, alt: `` }), (0, Z.jsx)(`strong`, { children: dungeonLootLabel460(n3) })] }), p2(e3, (e4) => u2(`loot`, i2.loot.map((n4, r4) => r4 === t3 ? e4 : n4))), (0, Z.jsx)(`button`, { className: `progression-remove`, "aria-label": `${dungeonLootLabel460(n3)} \xF6d\xFCl\xFCn\xFC kald\u0131r`, onClick: () => u2(`loot`, i2.loot.filter((e4, n4) => n4 !== t3)), children: `Kald\u0131r` })] }, e3.itemId);
  })] }) : (0, Z.jsxs)(Z.Fragment, { children: [(0, Z.jsx)(`p`, { children: `Ba\u015Flang\u0131\xE7 oran\u0131 her b\xF6lgede %1, miktar\u0131 1 adettir. Bu oran t\u0131ls\u0131m ve etkinlik bonuslar\u0131ndan etkilenmez.` }), f.map((e3) => {
    let t3 = te[e3];
    return (0, Z.jsxs)(`article`, { className: `progression-drop`, children: [(0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`img`, { src: `/dungeon/${t3.image}.webp`, alt: `` }), (0, Z.jsxs)(`span`, { children: [(0, Z.jsx)(`strong`, { children: t3.label }), (0, Z.jsxs)(`small`, { children: [t3.areaName, ` canavarlar\u0131`] })] })] }), p2(i2[e3], (t4) => u2(e3, t4))] }, e3);
  })] }), (0, Z.jsx)(`button`, { className: `progression-save`, disabled: t2, onClick: () => void n2({ action: r2 === `solo` ? `save_solo` : `save_materials`, config: i2, revision: e2.revision }), children: t2 ? `Kaydediliyor\u2026` : `Ayarlar\u0131 kaydet` })] });
}
function Ue({ value: e2, busy: t2, act: n2 }) {
  let [r2, i2] = (0, X.useState)(e2.config), [a2, o2] = (0, X.useState)(``), [s2, c2] = (0, X.useState)(``), [l2, u2] = (0, X.useState)(false);
  (0, X.useEffect)(() => {
    i2(e2.config), u2(false);
  }, [e2.revision]);
  let d2 = (e3) => {
    i2(e3), u2(true);
  }, f2 = ye.filter((e3) => !r2.loot.some((t3) => t3.itemId === e3.id) && `${e3.name} ${e3.group}`.toLocaleLowerCase(`tr-TR`).includes(a2.toLocaleLowerCase(`tr-TR`)));
  return (0, Z.jsxs)(`section`, { className: `admin-card dragon-boss-editor`, children: [(0, Z.jsx)(`h2`, { children: `Ejderha D\xFCnya Bossu \xB7 K\xFClkanat Krateri` }), (0, Z.jsx)(`p`, { children: `Hasar ve ate\u015F topu g\xFCc\xFC mevcut d\xFCnya bossuyla ayn\u0131d\u0131r. Can ayar\u0131 bir sonraki do\u011Fu\u015Fta uygulan\u0131r. Hasar veren her oyuncu en az 3, en fazla 5 ayr\u0131 ki\u015Fisel ganimet al\u0131r. \xD6nce her sat\u0131r\u0131n y\xFCzdesi ayr\u0131 denenir; \xFC\xE7 ganimet \xE7\u0131kmazsa eksikler a\xE7\u0131k sat\u0131rlardan bu y\xFCzdeler a\u011F\u0131rl\u0131k kabul edilerek tamamlan\u0131r. Bu y\xFCzden toplam kazanma ihtimali ilk y\xFCzdeden y\xFCksek olabilir. Be\u015Ften fazla \xE7ekili\u015F ba\u015Far\u0131l\u0131 olursa aralar\u0131ndan rastgele be\u015Fi se\xE7ilir; listedeki s\u0131ra \xF6ncelik sa\u011Flamaz. Ayn\u0131 e\u015Fya tekrar \xE7\u0131kabilir. %0 kapal\u0131d\u0131r, %100 ilk \xE7ekili\u015Fte kesindir; be\u015Fli s\u0131n\u0131rda son se\xE7im garantisi yoktur. A\xE7\u0131k boss i\xE7in en az bir oran pozitif olmal\u0131d\u0131r.` }), (0, Z.jsxs)(`div`, { className: `dragon-config-grid`, children: [(0, Z.jsxs)(`label`, { children: [`Harita ve boss`, (0, Z.jsxs)(`select`, { value: r2.enabled ? `1` : `0`, onChange: (e3) => d2({ ...r2, enabled: e3.target.value === `1` }), children: [(0, Z.jsx)(`option`, { value: `1`, children: `Oyunculara a\xE7\u0131k` }), (0, Z.jsx)(`option`, { value: `0`, children: `Kapal\u0131` })] })] }), (0, Z.jsxs)(`label`, { children: [`Can`, (0, Z.jsx)(`input`, { type: `number`, min: `1`, max: `100000000`, value: r2.hp, onChange: (e3) => d2({ ...r2, hp: Number(e3.target.value) }) })] }), (0, Z.jsxs)(`label`, { children: [`Yeniden do\u011Fma (dakika)`, (0, Z.jsx)(`input`, { type: `number`, min: `1`, max: `10080`, value: r2.interval / 60, onChange: (e3) => d2({ ...r2, interval: Math.round(Number(e3.target.value) * 60) }) })] })] }), (0, Z.jsx)(`h3`, { children: `T\xFCm e\u015Fyalardan ganimet se\xE7` }), (0, Z.jsx)(`p`, { children: `Liste ekipmanlar\u0131n t\xFCm renk ve s\u0131n\u0131flar\u0131n\u0131, malzemeleri, ta\u015Flar\u0131, petleri, g\xF6r\xFCn\xFCmleri ve Nesne Market \xFCr\xFCnlerini i\xE7erir. S\xFCreli \xFCr\xFCnlerde s\xFCre teslimde ba\u015Flar. Nadir ve \xFCcretli \xFCr\xFCnler varsay\u0131lan olarak kapal\u0131d\u0131r.` }), (0, Z.jsxs)(`div`, { className: `dragon-item-picker`, children: [(0, Z.jsx)(`input`, { "aria-label": `E\u015Fya ara`, placeholder: `\u0130sim veya kategori ara\u2026`, value: a2, onChange: (e3) => {
    o2(e3.target.value), c2(``);
  } }), (0, Z.jsxs)(`select`, { "aria-label": `Ganimete eklenecek e\u015Fya`, value: s2, onChange: (e3) => c2(e3.target.value), children: [(0, Z.jsxs)(`option`, { value: ``, children: [`E\u015Fya se\xE7 (`, f2.length, `)`] }), f2.map((e3) => (0, Z.jsxs)(`option`, { value: e3.id, children: [e3.group, ` \xB7 `, e3.name] }, e3.id))] }), (0, Z.jsx)(`button`, { disabled: t2 || !s2, onClick: () => {
    d2({ ...r2, loot: [...r2.loot, { itemId: s2, chance: 0, min: 1, max: 1 }] }), c2(``);
  }, children: `Listeye ekle` })] }), (0, Z.jsx)(`div`, { className: `dragon-loot-editor-list`, children: r2.loot.map((e3, n3) => (0, Z.jsxs)(`div`, { className: `dragon-loot-row`, children: [(0, Z.jsxs)(`strong`, { children: [_.get(e3.itemId)?.name, (0, Z.jsx)(`small`, { children: _.get(e3.itemId)?.group })] }), [`chance`, `min`, `max`].map((t3) => (0, Z.jsxs)(`label`, { children: [t3 === `chance` ? `\u0130lk \u015Fans (%)` : t3 === `min` ? `En az` : `En \xE7ok`, (0, Z.jsx)(`input`, { type: `number`, min: t3 === `chance` ? 0 : 1, max: t3 === `chance` ? 100 : 1e4, step: t3 === `chance` ? 1e-4 : 1, value: e3[t3], onChange: (e4) => d2({ ...r2, loot: r2.loot.map((r3, i3) => i3 === n3 ? { ...r3, [t3]: Number(e4.target.value) } : r3) }) })] }, t3)), (0, Z.jsx)(`button`, { "aria-label": `${_.get(e3.itemId)?.name} kald\u0131r`, disabled: t2, onClick: () => d2({ ...r2, loot: r2.loot.filter((e4, t3) => t3 !== n3) }), children: `\xD7` })] }, e3.itemId)) }), (0, Z.jsxs)(`div`, { className: `admin-actions`, children: [(0, Z.jsx)(`button`, { className: `admin-primary`, disabled: t2 || !l2, onClick: () => void n2({ action: `save_dragon`, dragonConfig: r2, dragonRevision: e2.revision }), children: `Ejderha ayarlar\u0131n\u0131 kaydet` }), (0, Z.jsx)(`button`, { disabled: t2 || l2 || !r2.enabled, onClick: () => void n2({ action: `dragon_command`, dragonCommand: `spawn` }), children: `Ejderhay\u0131 \u015Fimdi getir` }), (0, Z.jsx)(`button`, { disabled: t2 || l2, onClick: () => void n2({ action: `dragon_command`, dragonCommand: `remove` }, `Ejderha kald\u0131r\u0131ls\u0131n ve do\u011Fma sayac\u0131 yeniden ba\u015Flas\u0131n m\u0131?`), children: `Kald\u0131r ve sayac\u0131 ba\u015Flat` })] })] });
}
function We({ value: e2, busy: t2, save: n2 }) {
  let [r2, i2] = (0, X.useState)(() => structuredClone(e2.config)), [o2, s2] = (0, X.useState)(e2.revision), [c2, l2] = (0, X.useState)(``), u2 = JSON.stringify(r2) !== JSON.stringify(e2.config), d2 = o2 !== e2.revision;
  function f2(e3, t3, n3) {
    i2((r3) => ({ ...r3, tiers: r3.tiers.map((r4, i3) => i3 === e3 ? { ...r4, [t3]: n3 } : r4) }));
  }
  async function p2() {
    try {
      l2(``), await n2(we(r2), o2) && s2(o2 + 1);
    } catch (e3) {
      l2(e3 instanceof Error ? e3.message : `Kaydedilemedi.`);
    }
  }
  return (0, Z.jsxs)(`section`, { className: `admin-card level-curve-card`, children: [(0, Z.jsx)(`div`, { className: `admin-card-title`, children: (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `R\xFCtbe \xB7 65. Seviye Sonras\u0131` }), (0, Z.jsx)(`p`, { children: `Sava\u015F\xE7\u0131n\u0131n Yolu hedefleri, her kademenin TP bedeli, bonuslar\u0131 ve kal\u0131c\u0131 \xF6d\xFClleri.` })] }) }), (0, Z.jsx)(`h3`, { children: `Sava\u015F\xE7\u0131n\u0131n Yolu \xB7 Giri\u015F g\xF6revi` }), (0, Z.jsx)(`div`, { className: `level-band-grid`, children: a.map(([e3, t3]) => (0, Z.jsxs)(`label`, { children: [t3, (0, Z.jsx)(`input`, { type: `number`, min: 1, max: 1e5, value: r2.requirements[e3], onChange: (t4) => i2((n3) => ({ ...n3, requirements: { ...n3.requirements, [e3]: Number(t4.target.value) } })) }), (0, Z.jsx)(`small`, { children: `Normal canavar \xF6ld\xFCrme hedefi` })] }, e3)) }), (0, Z.jsx)(`p`, { children: `Hedefi 50\u2019den 5\u2019e indirebilirsin. Kaydedince mevcut say\u0131mlar korunur; yeni hedefleri tamamlayan oyuncular\u0131n r\xFCtbesi a\xE7\u0131l\u0131r.` }), (0, Z.jsxs)(`p`, { children: [`\xD6z Avc\u0131s\u0131 1 g\xF6revle a\xE7\u0131l\u0131r. Di\u011Fer TP de\u011Ferleri \xF6nceki kademeden bu kademeye ge\xE7i\u015F bedelidir. Bonuslar `, (0, Z.jsx)(`b`, { children: `bu kademede eklenecek` }), ` miktard\u0131r; \xF6nceki bonuslarla toplan\u0131r. Tablo de\u011Fi\u015Fince mevcut r\xFCtbe ve kademe i\xE7i ilerleme oran\u0131 korunur.`] }), (0, Z.jsx)(`div`, { className: `level-band-grid`, children: L.map(([e3], n3) => (0, Z.jsxs)(`article`, { children: [(0, Z.jsx)(`h3`, { style: { color: xe(n3 * 3 + 1) }, children: e3 }), (0, Z.jsxs)(`div`, { className: `level-band-actions`, children: [(0, Z.jsx)(`button`, { type: `button`, disabled: t2, onClick: () => i2((e4) => ({ ...e4, tiers: e4.tiers.map((e5, t3) => t3 > 0 && Math.floor(t3 / 3) === n3 ? { ...e5, xp: Math.max(1, Math.round(e5.xp * 0.9)) } : e5) })), children: `%10 Kolayla\u015Ft\u0131r` }), (0, Z.jsx)(`button`, { type: `button`, disabled: t2, onClick: () => i2((e4) => ({ ...e4, tiers: e4.tiers.map((e5, t3) => t3 > 0 && Math.floor(t3 / 3) === n3 ? { ...e5, xp: Math.min(1e8, Math.round(e5.xp * 1.1)) } : e5) })), children: `%10 Zorla\u015Ft\u0131r` })] }), r2.tiers.slice(n3 * 3, n3 * 3 + 3).map((e4, t3) => {
    let r3 = n3 * 3 + t3;
    return (0, Z.jsxs)(`details`, { children: [(0, Z.jsxs)(`summary`, { children: [V(r3 + 1), ` \xB7 `, r3 ? e4.xp.toLocaleString(`tr-TR`) + ` TP` : `Giri\u015F g\xF6revi`] }), r3 > 0 && (0, Z.jsxs)(`label`, { children: [`Gereken TP`, (0, Z.jsx)(`input`, { type: `number`, min: 1, max: 1e8, value: e4.xp, onChange: (e5) => f2(r3, `xp`, Number(e5.target.value)) })] }), [[`hp`, `Can`, 1e4], [`defense`, `Savunma`, 1e3], [`pve`, `Canavarlara hasar (%)`, 10], [`pvp`, `Oyunculara hasar (%)`, 10]].map(([t4, n4, i3]) => (0, Z.jsxs)(`label`, { children: [n4, (0, Z.jsx)(`input`, { type: `number`, min: 0, max: i3, value: e4[t4], onChange: (e5) => f2(r3, String(t4), Number(e5.target.value)) })] }, t4)), (0, Z.jsxs)(`label`, { children: [`Kal\u0131c\u0131 g\xF6r\xFCn\xFCm \xF6d\xFCl\xFC`, (0, Z.jsxs)(`select`, { value: e4.reward, onChange: (e5) => f2(r3, `reward`, e5.target.value), children: [(0, Z.jsx)(`option`, { value: ``, children: `\xD6zel g\xF6r\xFCn\xFCm yok` }), K.map((e5) => (0, Z.jsx)(`option`, { value: e5.id, children: e5.name }, e5.id))] })] })] }, r3);
  })] }, e3)) }), c2 && (0, Z.jsx)(`p`, { role: `alert`, children: c2 }), d2 && (0, Z.jsx)(`p`, { role: `status`, children: `Canl\u0131 ayarlar de\u011Fi\u015Fti. D\xFCzenlemeye devam etmek i\xE7in g\xFCncel tabloyu y\xFCkle.` }), (0, Z.jsxs)(`div`, { className: `level-curve-footer`, children: [(0, Z.jsx)(`button`, { type: `button`, disabled: t2, onClick: () => {
    i2(structuredClone(e2.config)), s2(e2.revision), l2(``);
  }, children: `Canl\u0131 tabloyu y\xFCkle` }), (0, Z.jsx)(`button`, { type: `button`, disabled: t2 || !u2 || d2, onClick: () => void p2(), children: t2 ? `Kaydediliyor\u2026` : `R\xFCtbe ayarlar\u0131n\u0131 kaydet` })] })] });
}
function Ge() {
  let [e2, t2] = (0, X.useState)(null), [n2, r2] = (0, X.useState)(``), [i2, a2] = (0, X.useState)(false), [o2, s2] = (0, X.useState)(``);
  async function c2() {
    try {
      let e3 = await fetch(`/api/admin/updates`, { cache: `no-store` }), n3 = await e3.json();
      if (!e3.ok) throw Error(n3.error);
      t2(n3), r2(n3.update.previewPlayerId);
    } catch (e3) {
      s2(e3 instanceof Error ? e3.message : `Y\xFCklenemedi.`);
    }
  }
  (0, X.useEffect)(() => {
    c2();
  }, []);
  async function l2(r3) {
    if (!(!e2 || i2)) {
      a2(true), s2(``);
      try {
        let i3 = await fetch(`/api/admin/updates`, { method: `POST`, headers: { "Content-Type": `application/json` }, body: JSON.stringify({ enabled: r3, previewPlayerId: n2, revision: e2.update.revision }) }), a3 = await i3.json();
        if (!i3.ok) throw Error(a3.error);
        t2(a3), s2(r3 ? `65 seviye ve Kadim K\xF6k Vadisi t\xFCm oyunculara a\xE7\u0131ld\u0131.` : `\xD6nizleme kaydedildi. Yaln\u0131z se\xE7ili GM eri\u015Febilir.`);
      } catch (e3) {
        s2(e3 instanceof Error ? e3.message : `Kaydedilemedi.`);
      } finally {
        a2(false);
      }
    }
  }
  return (0, Z.jsxs)(`section`, { className: `admin-card`, style: { gridColumn: `1 / -1` }, children: [(0, Z.jsx)(`div`, { className: `admin-card-title`, children: (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `G\xFCncellemeler \xB7 65 Seviye ve Kadim K\xF6k Vadisi` }), (0, Z.jsx)(`p`, { children: e2?.update.enabled ? `Oyunculara a\xE7\u0131k` : `GM \xF6nizlemesi \xB7 oyunculara kapal\u0131` })] }) }), (0, Z.jsx)(`p`, { children: `50. seviyeden girilen yeni av b\xF6lgesi ve 65 seviye s\u0131n\u0131r\u0131 birlikte a\xE7\u0131l\u0131r. \xD6nizlemede di\u011Fer oyuncular\u0131n s\u0131n\u0131r\u0131 50 olarak kal\u0131r.` }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `\xD6nizleme yapacak GM` }), (0, Z.jsxs)(`select`, { "aria-label": `\xD6nizleme yapacak GM`, value: n2, disabled: i2, onChange: (e3) => r2(e3.target.value), children: [(0, Z.jsx)(`option`, { value: ``, children: `Kimse` }), e2?.gms.map((e3) => (0, Z.jsxs)(`option`, { value: e3.id, children: [e3.name, ` \xB7 Sv. `, e3.level] }, e3.id))] })] }), (0, Z.jsx)(`p`, { children: `Se\xE7ili GM, oyundaki I\u015F\u0131nlanma men\xFCs\xFCnden haritaya girer. Haritaya giri\u015F i\xE7in GM de en az 50 seviye olmal\u0131d\u0131r.` }), (0, Z.jsxs)(`p`, { children: [`Can ve hasar: `, (0, Z.jsx)(`b`, { children: `Sava\u015F \u2192 Kadim K\xF6k Vadisi` }), `. Tecr\xFCbe ve yeniden do\u011Fma: `, (0, Z.jsx)(`b`, { children: `Sava\u015F \u2192 Kadim K\xF6k Vadisi` }), `. D\xFC\u015F\xFC\u015Fler: `, (0, Z.jsx)(`b`, { children: `Ganimet \u2192 Kadim K\xF6k Vadisi` }), `. Seviye bedelleri: `, (0, Z.jsx)(`b`, { children: `Sava\u015F \u2192 Seviye Kas\u0131lma Dengesi` }), `.`] }), (0, Z.jsxs)(`div`, { className: `admin-actions`, children: [(0, Z.jsx)(`button`, { disabled: i2 || !e2, onClick: () => void l2(false), children: `Yaln\u0131z Se\xE7ili GM\u2019ye A\xE7` }), (0, Z.jsx)(`button`, { className: `admin-primary`, disabled: i2 || !e2 || !!e2.update.enabled, onClick: () => void l2(true), children: `G\xFCncellemeyi T\xFCm Oyunculara A\xE7` }), (0, Z.jsx)(`button`, { disabled: i2, onClick: () => void c2(), children: `Durumu Yenile` })] }), (0, Z.jsx)(`p`, { children: `Tekrar \xF6nizlemeye al\u0131rsan eri\u015Fimi olmayan oyuncular g\xFCvenle Pazar K\xF6y\xFC\u2019ne d\xF6ner. Kazan\u0131lan seviyeler ve e\u015Fyalar korunur.` }), o2 && (0, Z.jsx)(`p`, { role: `status`, children: o2 })] });
}
function Ke(props) {
  return X.createElement(colSeasonalEditor453.Preview, props);
}
function qe(props) {
  return X.createElement(colSeasonalEditor453.Panel, props);
}
function Je({ prices: e2, busy: t2, act: n2 }) {
  let [r2, i2] = (0, X.useState)(() => I(e2)), [a2, o2] = (0, X.useState)(() => I(e2));
  return (0, X.useEffect)(() => {
    i2(I(e2)), o2(I(e2));
  }, [e2]), (0, Z.jsxs)(`section`, { className: `admin-card market-prices-admin`, children: [(0, Z.jsx)(`h2`, { children: `Nesne Market \xB7 Fiyatlar ve \u0130ndirimler` }), X.createElement("p", null, "\xC7P kuponlar\u0131n\u0131n indirim sonras\u0131 fiyat\u0131 kupon de\u011Ferinden d\xFC\u015F\xFCk olamaz: 100, 200 ve 500 \xC7P."), (0, Z.jsx)(`p`, { children: `\xC7P \xFCr\xFCnlerinde sat\u0131n alma fiyat\u0131 do\u011Frudan uygulan\u0131r. TL paketleri oyun i\xE7i ilan fiyat\u0131n\u0131 de\u011Fi\u015Ftirir; Sonteklif ve Itemci ilanlar\u0131n\u0131 ayr\u0131ca ayn\u0131 fiyata g\xFCncellemelisin. \xC7P paketlerinde indirim kapal\u0131d\u0131r; yaln\u0131z normal fiyat de\u011Fi\u015Fir. Di\u011Fer \xFCr\xFCnlerde %0 indirimi kald\u0131r\u0131r. E-PIN\u2019in verdi\u011Fi \xC7P miktar\u0131 de\u011Fi\u015Fmez.` }), (0, Z.jsx)(`div`, { className: `market-price-rows`, children: Object.entries(U).map(([e3, t3]) => (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`strong`, { children: t3.name }), (0, Z.jsxs)(`label`, { children: [`Normal fiyat (`, t3.currency, `)`, (0, Z.jsx)(`input`, { type: `number`, min: 1, max: 1e6, step: 1, value: r2[e3].base, onChange: (t4) => i2((n3) => ({ ...n3, [e3]: { ...n3[e3], base: Number(t4.target.value) } })) })] }), (0, Z.jsxs)(`label`, { children: [`\u0130ndirim (%)`, (0, Z.jsx)(`input`, { disabled: e3.startsWith(`coins_`), type: `number`, min: 0, max: 90, step: 1, value: r2[e3].discount, onChange: (t4) => i2((n3) => ({ ...n3, [e3]: { ...n3[e3], discount: Number(t4.target.value) } })) })] }), (0, Z.jsxs)(`b`, { children: [Ee(r2, e3).amount, ` `, t3.currency] })] }, e3)) }), (0, Z.jsx)(`button`, { className: `admin-primary`, disabled: t2, onClick: () => void n2({ action: `save_market_prices`, prices: r2, expectedPrices: a2 }), children: `Fiyatlar\u0131 ve indirimleri kaydet` })] });
}
var Ye = { forest_after_level: 30, forest_reduction_percent: 30 };
function Xe({ policy: e2, busy: t2, act: n2 }) {
  let [r2, i2] = (0, X.useState)(e2 ?? Ye);
  (0, X.useEffect)(() => i2(e2 ?? Ye), [e2]);
  let a2 = Number.isInteger(r2.forest_after_level) && r2.forest_after_level >= 0 && r2.forest_after_level <= 50 && Number.isInteger(r2.forest_reduction_percent) && r2.forest_reduction_percent >= 0 && r2.forest_reduction_percent <= 100;
  return (0, Z.jsxs)(`section`, { className: `admin-card`, children: [(0, Z.jsx)(`h2`, { children: "Av haritalar\u0131 \xB7 Seviyeye g\xF6re e\u015Fya d\xFC\u015F\xFC\u015F\xFC" }), (0, Z.jsx)(`p`, { children: "Azaltma oran\u0131 Kuzey Orman\u0131 i\xE7in a\u015Fa\u011F\u0131daki seviyenin \xFCst\xFCnde, Donmu\u015F Ge\xE7it i\xE7in 40 ve \xFCst\xFCnde, Kara B\xF6lge i\xE7in 50 ve \xFCst\xFCnde uygulan\u0131r. TP, Ya\u015Fam \xD6z\xFC, bosslar ve sabit art\u0131 malzemesi oranlar\u0131 etkilenmez." }), (0, Z.jsxs)(`div`, { className: `admin-grid`, children: [(0, Z.jsxs)(`label`, { children: [`Bu seviyeden sonra`, (0, Z.jsx)(`input`, { type: `number`, min: 0, max: 50, step: 1, value: r2.forest_after_level, onChange: (e3) => i2({ ...r2, forest_after_level: Number(e3.target.value) }) })] }), (0, Z.jsxs)(`label`, { children: [`D\xFC\u015F\xFC\u015F azaltma (%)`, (0, Z.jsx)(`input`, { type: `number`, min: 0, max: 100, step: 1, value: r2.forest_reduction_percent, onChange: (e3) => i2({ ...r2, forest_reduction_percent: Number(e3.target.value) }) })] })] }), (0, Z.jsx)(`p`, { children: r2.forest_reduction_percent === 0 ? `Azaltma kapal\u0131.` : `${r2.forest_after_level + 1}. seviyeden itibaren e\u015Fya \u015Fans\u0131 %${r2.forest_reduction_percent} azal\u0131r. \xD6rne\u011Fin %10 \u015Fans, %${(10 * (1 - r2.forest_reduction_percent / 100)).toLocaleString(`tr-TR`)} olur.` }), (0, Z.jsx)(`button`, { className: `admin-primary`, disabled: t2 || !a2 || !e2, onClick: () => void n2({ action: `save_forest_loot_policy`, forestLootPolicy: r2, expectedForestLootPolicy: e2 }), children: `Orman d\xFC\u015F\xFC\u015F ayar\u0131n\u0131 kaydet` })] });
}
function Ze(e2, t2, n2, r2, i2, a2) {
  if (n2 === `schedule`) {
    if (!Number.isSafeInteger(t2.start) || !Number.isSafeInteger(t2.end) || t2.start <= 0 || t2.end <= t2.start) throw Error(`Ba\u015Flang\u0131\xE7 ve biti\u015F tarihini se\xE7. Biti\u015F, ba\u015Flang\u0131\xE7tan sonra olmal\u0131.`);
    return { action: `event_schedule`, eventKind: e2, eventStart: t2.start, eventEnd: t2.end, percent: t2.percent, expectedEvents: a2 };
  }
  let o2 = (r2 * 60 + i2) * 60;
  if (!Number.isSafeInteger(r2) || !Number.isSafeInteger(i2) || r2 < 0 || i2 < 0 || i2 > 59 || !Number.isSafeInteger(o2) || o2 < 60 || o2 > 365 * 86400) throw Error(`S\xFCre 1 dakika ile 365 g\xFCn aras\u0131nda olmal\u0131. Dakika alan\u0131na 0\u201359 yaz.`);
  return { action: `event_start`, eventKind: e2, percent: t2.percent, durationSeconds: o2, expectedEvents: a2 };
}
var Qe = (e2) => e2 ? new Date(e2 * 1e3 - new Date(e2 * 1e3).getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : ``;
function $e(props) {
  colHalloweenAdmin456 ??= colHalloweenAdminFactory456(X, colEventsModel456);
  return X.createElement(colHalloweenAdmin456.Panel, props);
}
var et = (e2) => new Date((e2 + 10800) * 1e3).toISOString().slice(0, 16);
function tt() {
  let [e2, t2] = (0, X.useState)(null), [n2, r2] = (0, X.useState)(T), [i2, a2] = (0, X.useState)(null), [o2, s2] = (0, X.useState)(`now`), [c2, l2] = (0, X.useState)(``), [u2, d2] = (0, X.useState)(24), [f2, p2] = (0, X.useState)(0), [m2, h2] = (0, X.useState)(false), [g2, _2] = (0, X.useState)(``), [v2, y2] = (0, X.useState)(``), [b2, x2] = (0, X.useState)(0), S2 = (0, X.useRef)({ server: 0, local: 0 }), C2 = (e3) => {
    t2(e3), S2.current = { server: e3.serverTime, local: performance.now() }, x2(e3.serverTime);
  }, w2 = (e3) => {
    a2(e3), r2(e3 ? { title: e3.title, minimum: e3.minimum, stages: structuredClone(e3.stages) } : T()), s2(e3 && e3.start > S2.current.server + (performance.now() - S2.current.local) / 1e3 ? `schedule` : `now`), l2(et(e3?.start ?? Math.floor(Date.now() / 1e3) + 3600)), d2(e3 ? (e3.end - e3.start) / 3600 : 24), p2(0), _2(``), y2(``);
  };
  (0, X.useEffect)(() => {
    let e3 = true, t3 = new AbortController();
    fetch(`/api/admin/community-event`, { cache: `no-store`, signal: t3.signal }).then(async (t4) => {
      let n4 = await t4.json();
      if (!t4.ok) throw Error(n4.error);
      e3 && (C2(n4), w2(n4.runs.find((e4) => e4.end > n4.serverTime) ?? n4.runs[0] ?? null));
    }).catch((t4) => {
      e3 && _2(t4.message);
    });
    let n3 = setInterval(() => {
      S2.current.server && x2(S2.current.server + (performance.now() - S2.current.local) / 1e3);
    }, 1e3);
    return () => {
      e3 = false, t3.abort(), clearInterval(n3);
    };
  }, []);
  let E2 = e2?.runs.find((e3) => e3.id === i2?.id) ?? i2, D2 = !!(E2?.published && b2 >= E2.start), O2 = !!(E2?.published && b2 < E2.end);
  async function k2(e3) {
    if (!m2) {
      h2(true), _2(``), y2(``);
      try {
        let t3 = e3 === `save` || e3 === `publish` ? { action: e3, id: E2?.id, revision: E2?.revision, config: n2, start: o2 === `now` ? `now` : Math.floor((/* @__PURE__ */ new Date(c2 + `:00+03:00`)).getTime() / 1e3), duration: Math.round(u2 * 3600) } : { action: e3, id: E2?.id, revision: E2?.revision, seconds: 3600 }, r3 = await fetch(`/api/admin/community-event`, { method: `POST`, headers: { "Content-Type": `application/json` }, body: JSON.stringify(t3) }), i3 = await r3.json();
        if (!r3.ok) throw Error(i3.error);
        C2(i3), w2(i3.runs.find((e4) => e4.id === E2?.id) ?? i3.runs[0]), y2(e3 === `publish` ? `Etkinlik plan\u0131 yay\u0131nland\u0131.` : e3 === `stop` ? `Etkinlik durduruldu; kazan\u0131lm\u0131\u015F \xF6d\xFCl haklar\u0131 korundu.` : `Ayarlar kaydedildi.`);
      } catch (e4) {
        _2(e4 instanceof Error ? e4.message : `\u0130\u015Flem tamamlanamad\u0131.`);
      } finally {
        h2(false);
      }
    }
  }
  let A2 = (e3) => r2((t3) => {
    let n3 = structuredClone(t3);
    return e3(n3.stages[f2]), n3;
  });
  return (0, Z.jsxs)(`section`, { className: `admin-community`, children: [(0, Z.jsxs)(`header`, { children: [(0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`p`, { children: `TOPLULUK ETK\u0130NL\u0130\u011E\u0130` }), (0, Z.jsx)(`h2`, { children: `Kuzey Orman\u0131 Uyan\u0131yor` }), (0, Z.jsx)(`span`, { children: `T\xFCm kanallar ayn\u0131 hedef i\xE7in birlikte sava\u015F\u0131r.` })] }), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`button`, { disabled: m2, onClick: async () => {
    h2(true);
    try {
      let e3 = await fetch(`/api/admin/community-event`, { cache: `no-store` }), t3 = await e3.json();
      if (!e3.ok) throw Error(t3.error);
      C2(t3), w2(t3.runs.find((e4) => e4.id === E2?.id) ?? null);
    } catch (e3) {
      _2(e3 instanceof Error ? e3.message : `Yenilenemedi.`);
    } finally {
      h2(false);
    }
  }, children: `Yenile` }), ` `, (0, Z.jsx)(`button`, { disabled: m2 || !e2, onClick: () => w2(null), children: `Yeni etkinlik` })] })] }), g2 && (0, Z.jsx)(`p`, { className: `community-admin-error`, role: `alert`, children: g2 }), v2 && (0, Z.jsx)(`p`, { role: `status`, children: v2 }), !e2 && !g2 && (0, Z.jsx)(`p`, { children: `Y\xFCkleniyor\u2026` }), e2 && (0, Z.jsxs)(Z.Fragment, { children: [(0, Z.jsxs)(`label`, { children: [`Etkinlik ge\xE7mi\u015Fi`, (0, Z.jsxs)(`select`, { disabled: m2, value: E2?.id ?? ``, onChange: (t3) => w2(e2.runs.find((e3) => e3.id === t3.target.value) ?? null), children: [(0, Z.jsx)(`option`, { value: ``, children: `Yeni taslak` }), e2.runs.map((e3) => (0, Z.jsxs)(`option`, { value: e3.id, children: [e3.title, ` \xB7 `, new Date(e3.start * 1e3).toLocaleString(`tr-TR`, { timeZone: `Europe/Istanbul` }), ` \xB7 `, e3.published ? b2 < e3.start ? `Planland\u0131` : b2 < e3.end ? `Aktif` : `Bitti` : `Taslak`] }, e3.id))] })] }), E2 && (0, Z.jsxs)(`p`, { children: [`Ortak ilerleme: `, (0, Z.jsx)(`b`, { children: E2.total.toLocaleString(`tr-TR`) }), ` \xB7 Biti\u015F: `, new Date(E2.end * 1e3).toLocaleString(`tr-TR`, { timeZone: `Europe/Istanbul` })] }), (0, Z.jsxs)(`fieldset`, { disabled: m2 || D2, children: [(0, Z.jsxs)(`div`, { className: `community-admin-fields`, children: [(0, Z.jsxs)(`label`, { children: [`Etkinlik ad\u0131`, (0, Z.jsx)(`input`, { value: n2.title, maxLength: 64, onChange: (e3) => r2({ ...n2, title: e3.target.value }) })] }), (0, Z.jsxs)(`label`, { children: [`Ki\u015Fisel asgari katk\u0131`, (0, Z.jsx)(`input`, { type: `number`, min: 1, max: 1e5, value: n2.minimum, onChange: (e3) => r2({ ...n2, minimum: Number(e3.target.value) }) })] }), (0, Z.jsxs)(`label`, { children: [`Ba\u015Flang\u0131\xE7`, (0, Z.jsxs)(`select`, { value: o2, onChange: (e3) => s2(e3.target.value), children: [(0, Z.jsx)(`option`, { value: `now`, children: `Yay\u0131nlay\u0131nca hemen` }), (0, Z.jsx)(`option`, { value: `schedule`, children: `Tarih ve saat se\xE7` })] })] }), o2 === `schedule` && (0, Z.jsxs)(`label`, { children: [`T\xFCrkiye saati (UTC+3)`, (0, Z.jsx)(`input`, { type: `datetime-local`, value: c2, onChange: (e3) => l2(e3.target.value) })] }), (0, Z.jsxs)(`label`, { children: [`S\xFCre (saat)`, (0, Z.jsx)(`input`, { type: `number`, min: 1 / 60, max: 720, step: `any`, value: u2, onChange: (e3) => d2(Number(e3.target.value)) })] })] }), (0, Z.jsx)(`nav`, { "aria-label": `\xD6d\xFCl kademeleri`, children: n2.stages.map((e3, t3) => (0, Z.jsxs)(`button`, { type: `button`, "aria-pressed": f2 === t3, onClick: () => p2(t3), children: [`Kademe `, t3 + 1] }, t3)) }), (0, Z.jsxs)(`label`, { children: [`Toplam canavar hedefi \xB7 Kademe `, f2 + 1, (0, Z.jsx)(`input`, { type: `number`, min: 1, max: 1e7, value: n2.stages[f2].target, onChange: (e3) => A2((t3) => {
    t3.target = Number(e3.target.value);
  }) })] }), (0, Z.jsx)(`p`, { children: `Hedefler birikimlidir ve her kademede artmal\u0131d\u0131r.` }), n2.stages[f2].rewards.map((e3, t3) => (0, Z.jsxs)(`div`, { className: `community-admin-reward`, children: [(0, Z.jsxs)(`label`, { children: [`\xD6d\xFCl`, (0, Z.jsx)(`select`, { value: e3.kind, onChange: (e4) => A2((n3) => {
    n3.rewards[t3].kind = e4.target.value;
  }), children: Object.entries(P).map(([e4, r3]) => (0, Z.jsx)(`option`, { value: e4, disabled: n2.stages[f2].rewards.some((n3, r4) => r4 !== t3 && n3.kind === e4), children: r3 }, e4)) })] }), (0, Z.jsxs)(`label`, { children: [`Adet`, (0, Z.jsx)(`input`, { type: `number`, min: 1, max: 1e6, value: e3.amount, onChange: (e4) => A2((n3) => {
    n3.rewards[t3].amount = Number(e4.target.value);
  }) })] }), (0, Z.jsx)(`button`, { type: `button`, disabled: n2.stages[f2].rewards.length === 1, onClick: () => A2((e4) => {
    e4.rewards.splice(t3, 1);
  }), children: `Kald\u0131r` })] }, t3)), (0, Z.jsx)(`button`, { type: `button`, disabled: n2.stages[f2].rewards.length === 7, onClick: () => A2((e3) => {
    let t3 = Object.keys(P).find((t4) => !e3.rewards.some((e4) => e4.kind === t4));
    t3 && e3.rewards.push({ kind: t3, amount: 1 });
  }), children: `+ \xD6d\xFCl ekle` })] }), (0, Z.jsxs)(`div`, { className: `community-admin-preview`, children: [(0, Z.jsx)(`h3`, { children: `Oyuncular\u0131n g\xF6rece\u011Fi \xF6d\xFCller` }), n2.stages.map((e3, t3) => (0, Z.jsxs)(`p`, { children: [(0, Z.jsxs)(`b`, { children: [t3 + 1, `. Kademe \xB7 `, e3.target.toLocaleString(`tr-TR`), ` canavar`] }), (0, Z.jsx)(`br`, {}), ne(e3.rewards)] }, t3))] }), (0, Z.jsx)(`p`, { children: `Ba\u015Flay\u0131nca hedefler, \xF6d\xFCller ve ki\u015Fisel katk\u0131 kilitlenir. Ger\xE7ek sald\u0131r\u0131 katk\u0131s\u0131 gerekir. Son hedef erken tamamlansa da s\xFCre bitene kadar ki\u015Fisel katk\u0131 devam eder. Kazan\u0131lan \xF6d\xFCller biti\u015Ften sonra 72 saat al\u0131nabilir.` }), (0, Z.jsxs)(`footer`, { children: [!D2 && (0, Z.jsxs)(Z.Fragment, { children: [(0, Z.jsx)(`button`, { disabled: m2, onClick: () => void k2(`save`), children: `Tasla\u011F\u0131 kaydet` }), (0, Z.jsx)(`button`, { disabled: m2, className: `primary`, onClick: () => void k2(`publish`), children: o2 === `now` ? `Etkinli\u011Fi ba\u015Flat` : `Etkinli\u011Fi planla` })] }), O2 && (0, Z.jsxs)(Z.Fragment, { children: [(0, Z.jsx)(`button`, { disabled: m2, onClick: () => void k2(`extend`), children: `S\xFCreyi 1 saat uzat` }), (0, Z.jsx)(`button`, { disabled: m2, onClick: () => {
    window.confirm(`Etkinlik durdurulsun mu? Kazan\u0131lm\u0131\u015F \xF6d\xFCl haklar\u0131 korunacak.`) && k2(`stop`);
  }, children: `Etkinli\u011Fi bitir` })] })] })] })] });
}
var nt = J(`activity`, [[`path`, { d: `M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2`, key: `169zse` }]]), rt = J(`ban`, [[`circle`, { cx: `12`, cy: `12`, r: `10`, key: `1mglay` }], [`path`, { d: `M4.929 4.929 19.07 19.071`, key: `196cmz` }]]), it = J(`copy`, [[`rect`, { width: `14`, height: `14`, x: `8`, y: `8`, rx: `2`, ry: `2`, key: `17jyea` }], [`path`, { d: `M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2`, key: `zix9uf` }]]), at = J(`download`, [[`path`, { d: `M12 15V3`, key: `m9g1x1` }], [`path`, { d: `M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4`, key: `ih7n3h` }], [`path`, { d: `m7 10 5 5 5-5`, key: `brsn70` }]]), ot = J(`earth`, [[`path`, { d: `M21.54 15H17a2 2 0 0 0-2 2v4.54`, key: `1djwo0` }], [`path`, { d: `M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17`, key: `1tzkfa` }], [`path`, { d: `M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05`, key: `14pb5j` }], [`circle`, { cx: `12`, cy: `12`, r: `10`, key: `1mglay` }]]), st = J(`globe`, [[`circle`, { cx: `12`, cy: `12`, r: `10`, key: `1mglay` }], [`path`, { d: `M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20`, key: `13o1zl` }], [`path`, { d: `M2 12h20`, key: `9i4pu4` }]]), ct = J(`inbox`, [[`polyline`, { points: `22 12 16 12 14 15 10 15 8 12 2 12`, key: `o97t9d` }], [`path`, { d: `M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z`, key: `oot6mr` }]]), lt = J(`layout-dashboard`, [[`rect`, { width: `7`, height: `9`, x: `3`, y: `3`, rx: `1`, key: `10lvy0` }], [`rect`, { width: `7`, height: `5`, x: `14`, y: `3`, rx: `1`, key: `16une8` }], [`rect`, { width: `7`, height: `9`, x: `14`, y: `12`, rx: `1`, key: `1hutg5` }], [`rect`, { width: `7`, height: `5`, x: `3`, y: `16`, rx: `1`, key: `ldoo1y` }]]), ut = J(`rotate-ccw`, [[`path`, { d: `M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8`, key: `1357e3` }], [`path`, { d: `M3 3v5h5`, key: `1xhq8a` }]]), Q = J(`save`, [[`path`, { d: `M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z`, key: `1c8476` }], [`path`, { d: `M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7`, key: `1ydtos` }], [`path`, { d: `M7 3v4a1 1 0 0 0 1 1h7`, key: `t51u73` }]]), dt = J(`search`, [[`path`, { d: `m21 21-4.34-4.34`, key: `14j7rj` }], [`circle`, { cx: `11`, cy: `11`, r: `8`, key: `4ej97u` }]]), ft = J(`shield-alert`, [[`path`, { d: `M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z`, key: `oel41y` }], [`path`, { d: `M12 8v4`, key: `1got3b` }], [`path`, { d: `M12 16h.01`, key: `1drbdi` }]]), pt = J(`trash-2`, [[`path`, { d: `M10 11v6`, key: `nco0om` }], [`path`, { d: `M14 11v6`, key: `outv1u` }], [`path`, { d: `M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6`, key: `miytrc` }], [`path`, { d: `M3 6h18`, key: `d0wm0j` }], [`path`, { d: `M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2`, key: `e791ji` }]]), mt = J(`user-round-check`, [[`path`, { d: `M2 21a8 8 0 0 1 13.292-6`, key: `bjp14o` }], [`circle`, { cx: `10`, cy: `8`, r: `5`, key: `o932ke` }], [`path`, { d: `m16 19 2 2 4-4`, key: `1b14m6` }]]), ht = J(`user-round-minus`, [[`path`, { d: `M2 21a8 8 0 0 1 13.292-6`, key: `bjp14o` }], [`circle`, { cx: `10`, cy: `8`, r: `5`, key: `o932ke` }], [`path`, { d: `M22 19h-6`, key: `vcuq98` }]]);
function gt({ settings: e2 }) {
  let [t2, n2] = (0, X.useState)(`ended`), [r2, i2] = (0, X.useState)(`visitor`), [a2, o2] = (0, X.useState)(`desktop`), [s2, c2] = (0, X.useState)(``), l2 = [e2.registration_at, e2.opens_at, e2.ends_at].every((e3) => Number.isFinite(e3) && e3 > 0) && e2.registration_at < e2.opens_at && e2.opens_at < e2.ends_at, u2 = () => c2(`Bu bir \xF6n izlemedir. Hesap olu\u015Fturulmaz, oturum veya eri\u015Fim izinleri de\u011Fi\u015Ftirilmez.`);
  return (0, Z.jsxs)(`div`, { className: `launch-preview-shell`, children: [(0, Z.jsxs)(`div`, { className: `launch-preview-controls`, children: [(0, Z.jsxs)(`label`, { children: [`D\xF6nem`, (0, Z.jsxs)(`select`, { value: t2, onChange: (e3) => n2(e3.target.value), children: [(0, Z.jsx)(`option`, { value: `ended`, children: `Beta sonras\u0131 \xB7 \xC7ok yak\u0131nda` }), (0, Z.jsx)(`option`, { value: `waiting`, children: `Beta \xF6ncesi \xB7 Geri say\u0131m` })] })] }), (0, Z.jsxs)(`label`, { children: [`Hesap g\xF6r\xFCn\xFCm\xFC`, (0, Z.jsxs)(`select`, { value: r2, onChange: (e3) => {
    i2(e3.target.value), c2(``);
  }, children: [(0, Z.jsx)(`option`, { value: `visitor`, children: `Ziyaret\xE7i \xB7 yaln\u0131z kay\u0131t` }), (0, Z.jsx)(`option`, { value: `registered`, children: `Kay\u0131tl\u0131 \xB7 izinsiz` })] })] }), (0, Z.jsxs)(`label`, { children: [`Ekran`, (0, Z.jsxs)(`select`, { value: a2, onChange: (e3) => o2(e3.target.value), children: [(0, Z.jsx)(`option`, { value: `desktop`, children: `Bilgisayar` }), (0, Z.jsx)(`option`, { value: `mobile`, children: `Mobil` })] })] }), (0, Z.jsx)(`p`, { children: `Se\xE7ti\u011Fin d\xF6nemin \xF6n kay\u0131t g\xF6r\xFCn\xFCm\xFC. Kaydedilmemi\u015F de\u011Fi\u015Fiklikler canl\u0131ya uygulanmaz. Video oynat\u0131labilir.` }), s2 && (0, Z.jsx)(`p`, { role: `status`, children: s2 })] }), l2 ? (0, Z.jsx)(`div`, { className: `launch-preview-viewport ${a2 === `mobile` ? `launch-preview-mobile` : ``}`, children: (0, Z.jsx)(Ie, { preview: true, account: r2 === `visitor` ? void 0 : r2 === `allowed` ? `\u0130zinli Oyuncu` : `Kay\u0131tl\u0131 Oyuncu`, status: { phase: t2, showLanding: true, canPlay: r2 === `allowed`, earlyAccess: r2 === `allowed`, registrationOpen: true, registrationAt: e2.registration_at, opensAt: e2.opens_at, endsAt: e2.ends_at, serverTime: Math.max(e2.registration_at, Math.min(Date.now(), e2.opens_at - 1e3)) }, onRegister: u2, onLogin: u2, onPlay: u2, onLogout: u2 }) }) : (0, Z.jsx)(`p`, { role: `alert`, children: `\xD6n izleme i\xE7in ge\xE7erli kay\u0131t, a\xE7\u0131l\u0131\u015F ve biti\u015F tarihlerini s\u0131rayla se\xE7.` })] });
}
var _t = { pending: `Bekliyor`, sending: `\u0130\u015Fleniyor`, accepted: `G\xF6nderildi`, failed: `Hata`, review: `Kontrol gerekli`, cancelled: `\u0130ptal edildi` };
function vt(e2) {
  return e2 === `provider_429` ? `Resend g\xF6nderim s\u0131n\u0131r\u0131na ula\u015F\u0131ld\u0131. Sistem bekleyip yeniden deneyecek; Resend kotan\u0131 kontrol et.` : e2 === `provider_401` || e2 === `provider_403` ? `Resend API anahtar\u0131n\u0131 ve do\u011Frulanm\u0131\u015F g\xF6nderici alan ad\u0131n\u0131 kontrol et. Ayarlar d\xFCzeldi\u011Finde g\xF6nderim devam eder.` : e2 === `delivery_uncertain` ? `\xD6nceki g\xF6nderimin sonucu do\u011Frulanamad\u0131. Tekrar e-posta g\xF6ndermemek i\xE7in durduruldu; Resend kay\u0131tlar\u0131n\u0131 kontrol et.` : e2 ? `Sa\u011Flay\u0131c\u0131ya ula\u015F\u0131lamad\u0131 veya e-posta kabul edilmedi. Ge\xE7ici hatalar otomatik yeniden denenir.` : ``;
}
function yt({ initial: e2 }) {
  let [t2, n2] = (0, X.useState)(e2), [r2, i2] = (0, X.useState)(false), [a2, o2] = (0, X.useState)(``);
  (0, X.useEffect)(() => {
    n2(e2);
  }, [e2]);
  async function s2(e3) {
    i2(true), o2(``);
    try {
      let t3 = await fetch(`/api/admin/launch`, e3 ? { method: `POST`, headers: { "Content-Type": `application/json` }, body: JSON.stringify(e3) } : { cache: `no-store` }), r3 = await t3.json();
      if (!t3.ok) throw Error(r3.error || `\u0130\u015Flem tamamlanamad\u0131.`);
      n2(r3.email), e3?.action === `email_test` && o2(`Test e-postas\u0131 y\xF6netici hesab\u0131n\u0131n e-posta adresine g\xF6nderilmek \xFCzere kabul edildi. Gelen kutusu ve spam klas\xF6r\xFCn\xFC kontrol et.`);
    } catch (e4) {
      o2(e4 instanceof Error ? e4.message : `\u0130\u015Flem tamamlanamad\u0131.`);
    } finally {
      i2(false);
    }
  }
  return t2 ? (0, Z.jsxs)(`section`, { style: { margin: `24px 0`, padding: `16px`, border: `1px solid #48654d`, borderRadius: 10 }, children: [(0, Z.jsx)(`h3`, { children: `A\xE7\u0131l\u0131\u015F E-postas\u0131` }), (0, Z.jsx)(`p`, { children: `Yaln\u0131zca e-posta izni verenlere bir kez g\xF6nderilir. G\xF6nderim, kaydedilen a\xE7\u0131l\u0131\u015F saatinden 15 dakika \xF6nce ba\u015Flar. A\xE7\u0131l\u0131\u015F tarihi de\u011Fi\u015Firse g\xF6nderim saati de de\u011Fi\u015Fir. Manuel kapal\u0131 modda g\xF6nderim bekler; manuel a\xE7\u0131k modda da planlanan saatten \xF6nce ba\u015Flamaz.` }), (0, Z.jsxs)(`p`, { children: [(0, Z.jsx)(`strong`, { children: t2.configured ? `Resend ayarlar\u0131 mevcut` : `Resend ayarlar\u0131 eksik veya ge\xE7ersiz` }), ` \xB7 `, t2.enabled ? t2.waiting ? `G\xF6nderim zaman\u0131n\u0131 bekliyor` : `G\xF6nderim a\xE7\u0131k` : `G\xF6nderim duraklat\u0131ld\u0131`] }), Number.isFinite(t2.sendAt) && (0, Z.jsxs)(`p`, { children: [(0, Z.jsx)(`strong`, { children: `G\xF6nderim ba\u015Flang\u0131c\u0131:` }), ` `, new Intl.DateTimeFormat(`tr-TR`, { timeZone: `Europe/Istanbul`, day: `numeric`, month: `long`, year: `numeric`, hour: `2-digit`, minute: `2-digit` }).format(new Date(t2.sendAt)), ` \xB7 T\xFCrkiye saati`] }), !t2.configured && (0, Z.jsx)(`p`, { children: `Sunucudaki RESEND_API_KEY, AUTH_EMAIL_FROM ve AUTH_PUBLIC_ORIGIN ayarlar\u0131n\u0131 kontrol et.` }), (0, Z.jsxs)(`div`, { className: `admin-actions`, children: [(0, Z.jsxs)(`span`, { children: [`\u0130zin veren: `, (0, Z.jsx)(`strong`, { children: t2.subscribers })] }), Object.entries(_t).map(([e3, n3]) => (0, Z.jsxs)(`span`, { children: [n3, `: `, (0, Z.jsx)(`strong`, { children: t2.counts[e3] || 0 })] }, e3))] }), (0, Z.jsx)(`p`, { style: { fontSize: 14 }, children: `\u201CG\xF6nderildi\u201D, Resend\u2019in e-postay\u0131 kabul etti\u011Fini g\xF6sterir; gelen kutusuna ula\u015Fma garantisi de\u011Fildir. E-postalar s\u0131rayla g\xF6nderilir; g\xFCnl\xFCk kota dolarsa kuyruk bekler.` }), (t2.lastError || t2.counts.review > 0) && (0, Z.jsx)(`p`, { role: `status`, children: vt(t2.lastError || `delivery_uncertain`) }), (0, Z.jsxs)(`div`, { className: `admin-actions`, children: [(0, Z.jsx)(`button`, { disabled: r2, onClick: () => void s2({ action: `email_enabled`, enabled: !t2.enabled }), children: t2.enabled ? `G\xF6nderimi Duraklat` : `Otomatik G\xF6nderimi A\xE7` }), (0, Z.jsx)(`button`, { disabled: r2 || !t2.configured, onClick: () => void s2({ action: `email_test` }), children: `Bana Test E-postas\u0131 G\xF6nder` }), (0, Z.jsx)(`button`, { disabled: r2, onClick: () => void s2(), children: `Durumu Yenile` })] }), a2 && (0, Z.jsx)(`p`, { role: `status`, children: a2 }), (0, Z.jsxs)(`details`, { style: { marginTop: 12 }, children: [(0, Z.jsx)(`summary`, { children: `E-posta i\xE7eri\u011Fi` }), (0, Z.jsx)(`p`, { children: (0, Z.jsx)(`strong`, { children: t2.preview.subject }) }), (0, Z.jsx)(`p`, { children: t2.preview.text }), (0, Z.jsxs)(`p`, { children: [`D\xFC\u011Fme: `, t2.preview.button, ` \xB7 Alt b\xF6l\xFCm: e-posta iznini kald\u0131rma ba\u011Flant\u0131s\u0131`] })] }), t2.recent.length > 0 && (0, Z.jsxs)(`details`, { style: { marginTop: 12 }, children: [(0, Z.jsx)(`summary`, { children: `Son g\xF6nderimler` }), t2.recent.map((e3, t3) => (0, Z.jsxs)(`p`, { children: [e3.username, ` \xB7 `, _t[e3.status] || e3.status, e3.last_error ? ` \xB7 ` + vt(e3.last_error) : ``] }, t3))] })] }) : (0, Z.jsxs)(`section`, { children: [(0, Z.jsx)(`h3`, { children: `A\xE7\u0131l\u0131\u015F E-postas\u0131` }), (0, Z.jsx)(`p`, { children: `Bu b\xF6l\xFCm i\xE7in g\xFCncel VDS paketini y\xFCkle.` })] });
}
var bt = (e2) => new Date(e2 + 3 * 36e5).toISOString().slice(0, 16), xt = (e2) => Date.parse(e2 + `:00+03:00`);
function St() {
  return X.createElement(col438LaunchModeUI);
}
function Ct() {
  let [e2, t2] = (0, X.useState)(null), [n2, r2] = (0, X.useState)(``), [i2, a2] = (0, X.useState)(``), [o2, s2] = (0, X.useState)(1), [c2, l2] = (0, X.useState)(0), [u2, d2] = (0, X.useState)(false), [f2, p2] = (0, X.useState)(true), [m2, h2] = (0, X.useState)(``), g2 = (0, X.useRef)(false);
  (0, X.useEffect)(() => {
    let e3 = new AbortController();
    return p2(true), h2(``), fetch(`/api/admin/launch?view=registrations&q=` + encodeURIComponent(i2) + `&page=` + o2, { cache: `no-store`, signal: e3.signal }).then(async (n3) => {
      let r3 = await n3.json();
      if (!n3.ok) throw Error(r3.error || `Kay\u0131tlar al\u0131namad\u0131.`);
      e3.signal.aborted || t2(r3);
    }).catch((t3) => {
      e3.signal.aborted || h2(t3.message);
    }).finally(() => {
      e3.signal.aborted || p2(false);
    }), () => e3.abort();
  }, [i2, o2, c2]);
  async function _2(e3) {
    if (!g2.current) {
      g2.current = true, d2(true), h2(``);
      try {
        let t3 = await fetch(`/api/admin/launch`, { method: `POST`, headers: { "Content-Type": `application/json` }, body: JSON.stringify({ action: `grant`, accountId: e3.id, allow: !e3.allowed }) }), n3 = await t3.json();
        if (!t3.ok) throw Error(n3.error || `\u0130zin de\u011Fi\u015Ftirilemedi.`);
        l2((e4) => e4 + 1);
      } catch (e4) {
        h2(e4 instanceof Error ? e4.message : `\u0130\u015Flem tamamlanamad\u0131.`);
      } finally {
        g2.current = false, d2(false);
      }
    }
  }
  let v2 = (e3) => new Intl.DateTimeFormat(`tr-TR`, { timeZone: `Europe/Istanbul`, dateStyle: `medium`, timeStyle: `short` }).format(new Date(e3 * 1e3));
  return (0, Z.jsxs)(`section`, { className: `admin-card`, children: [(0, Z.jsx)(`h2`, { children: `Kay\u0131t Listesi` }), (0, Z.jsx)(`p`, { children: `Karakter olu\u015Fturmayanlar dahil b\xFCt\xFCn oyun hesaplar\u0131. En yeni kay\u0131t en \xFCsttedir; tarihler T\xFCrkiye / KKTC saatidir.` }), (0, Z.jsxs)(`p`, { children: [(0, Z.jsxs)(`strong`, { children: [`Toplam kay\u0131t: `, e2?.totalRegistered ?? `\u2026`] }), e2 && i2 && ` \xB7 Aramayla e\u015Fle\u015Fen: ${e2.total}`] }), (0, Z.jsxs)(`form`, { className: `admin-actions`, onSubmit: (e3) => {
    e3.preventDefault(), s2(1), a2(n2.trim()), l2((e4) => e4 + 1);
  }, children: [(0, Z.jsx)(`input`, { "aria-label": `Kay\u0131t ara`, placeholder: `Kullan\u0131c\u0131 ad\u0131, e-posta veya karakter`, value: n2, onChange: (e3) => r2(e3.target.value), maxLength: 80 }), (0, Z.jsx)(`button`, { disabled: f2 || u2, children: `Ara` }), (0, Z.jsx)(`button`, { type: `button`, disabled: f2 || u2, onClick: () => l2((e3) => e3 + 1), children: `Yenile` })] }), (0, Z.jsxs)(`p`, { children: [`\u0130zin verdi\u011Fin oyuncu farkl\u0131 cihazdan ba\u011Flanacaksa bu ba\u011Flant\u0131y\u0131 payla\u015F: `, (0, Z.jsx)(`a`, { href: `/early-access`, target: `_blank`, rel: `noreferrer`, children: `Test eri\u015Fimini do\u011Frula \u2197` })] }), (0, Z.jsx)(`p`, { children: `Ba\u011Flant\u0131 tek ba\u015F\u0131na oyun izni vermez. Oyuncu hesab\u0131n\u0131 do\u011Frular; yaln\u0131z izinliyse \u201COyuna Gir\u201D g\xF6r\xFCn\xFCr.` }), m2 && (0, Z.jsx)(`p`, { role: `alert`, children: m2 }), f2 && (0, Z.jsx)(`p`, { role: `status`, children: `Kay\u0131tlar y\xFCkleniyor\u2026` }), e2 && (0, Z.jsxs)(Z.Fragment, { children: [(0, Z.jsx)(`div`, { style: { overflowX: `auto` }, children: (0, Z.jsxs)(`table`, { style: { width: `100%`, textAlign: `left` }, children: [(0, Z.jsx)(`thead`, { children: (0, Z.jsxs)(`tr`, { children: [(0, Z.jsx)(`th`, { children: `Kullan\u0131c\u0131` }), (0, Z.jsx)(`th`, { children: `E-posta` }), (0, Z.jsx)(`th`, { children: `Kay\u0131t tarihi` }), (0, Z.jsx)(`th`, { children: `Karakter` }), (0, Z.jsx)(`th`, { children: `Erken eri\u015Fim` })] }) }), (0, Z.jsx)(`tbody`, { children: e2.accounts.map((e3) => (0, Z.jsxs)(`tr`, { children: [(0, Z.jsx)(`td`, { children: e3.username }), (0, Z.jsx)(`td`, { style: { overflowWrap: `anywhere` }, children: e3.email }), (0, Z.jsx)(`td`, { children: v2(e3.created_at) }), (0, Z.jsx)(`td`, { children: e3.player_name || `Hen\xFCz olu\u015Fturulmad\u0131` }), (0, Z.jsxs)(`td`, { children: [(0, Z.jsx)(`span`, { children: e3.allowed ? `\u0130zinli` : `Bekliyor` }), (0, Z.jsx)(`br`, {}), (0, Z.jsx)(`button`, { disabled: u2 || f2, onClick: () => void _2(e3), children: e3.allowed ? `\u0130zni kald\u0131r` : `\u0130zin ver` })] })] }, e3.id)) })] }) }), !e2.accounts.length && !f2 && (0, Z.jsx)(`p`, { children: `Kay\u0131t bulunamad\u0131.` }), (0, Z.jsxs)(`div`, { className: `admin-actions`, children: [(0, Z.jsx)(`button`, { disabled: f2 || u2 || e2.page <= 1, onClick: () => s2(e2.page - 1), children: `\xD6nceki` }), (0, Z.jsxs)(`span`, { children: [`Sayfa `, e2.page, ` / `, e2.pageCount] }), (0, Z.jsx)(`button`, { disabled: f2 || u2 || e2.page >= e2.pageCount, onClick: () => s2(e2.page + 1), children: `Sonraki` })] })] })] });
}
var wt = `BETA \u0130\xC7\u0130N T\xDCM OYUNCULARI S\u0130L`;
function Tt() {
  let [e2, t2] = (0, X.useState)(null), [n2, r2] = (0, X.useState)(``), [i2, a2] = (0, X.useState)(false), [o2, s2] = (0, X.useState)(``), [c2, l2] = (0, X.useState)(false);
  async function u2(o3 = false) {
    if (!(i2 || c2)) {
      a2(true), s2(``);
      try {
        let i3 = await fetch(`/api/admin`, { method: `POST`, headers: { "Content-Type": `application/json` }, body: JSON.stringify(o3 ? { action: `beta_reset_execute`, token: e2?.token, confirmation: n2 } : { action: `beta_reset_preview` }) }), a3 = await i3.json();
        if (!i3.ok) throw Error(a3.error || `\u0130\u015Flem tamamlanamad\u0131.`);
        o3 ? (l2(true), t2(null), r2(``), s2(`S\u0131f\u0131rlama tamamland\u0131. Yedek al\u0131nd\u0131; sunucu yeniden ba\u015Fl\u0131yor. Birka\xE7 saniye sonra paneli yenileyebilirsin.`)) : (t2(a3), r2(``));
      } catch (e3) {
        s2(e3 instanceof Error ? e3.message : `Ba\u011Flant\u0131 kesildi. Yeniden denemeden \xF6nce paneli yenileyip sonucu kontrol et.`), o3 && t2(null);
      } finally {
        a2(false);
      }
    }
  }
  return (0, Z.jsxs)(`section`, { className: `admin-card danger-card beta-reset-card`, children: [(0, Z.jsx)(`h2`, { children: `A\xE7\u0131k Beta \xD6ncesi Tam S\u0131f\u0131rlama` }), (0, Z.jsx)(`p`, { children: `Y\xF6netici hesab\u0131 d\u0131\u015F\u0131ndaki t\xFCm oyun hesaplar\u0131 silinir. Y\xF6netici karakteri dahil b\xFCt\xFCn karakterler, seviye ve paralar, ekipmanlar, depolar, kanatlar, petler, ta\u015Flar, pazarlar, loncalar ve zindan ilerlemeleri temizlenir. Oyuncular yeniden kay\u0131t olur.` }), (0, Z.jsx)(`p`, { children: `Y\xF6netici eri\u015Fimi, oyun dengesi ve d\xFC\u015Fme oranlar\u0131 korunur. \xD6deme ve i\u015Flem kay\u0131tlar\u0131 saklan\u0131r. \xD6nceden olu\u015Fturulan E-Pinler silinmez veya iptal edilmez; kodlar, s\xFCreleri ve kullan\u0131m durumlar\u0131 aynen korunur. \xD6nce do\u011Frulanm\u0131\u015F yedek al\u0131n\u0131r. \u0130\u015Flem sonunda t\xFCm oyun oturumlar\u0131 kapan\u0131r ve sunucu k\u0131sa s\xFCreli yeniden ba\u015Flar.` }), !e2 && !c2 && (0, Z.jsx)(`button`, { type: `button`, disabled: i2, onClick: () => void u2(), children: `S\u0131f\u0131rlama \xD6nizlemesini A\xE7` }), e2 && (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`p`, { children: (0, Z.jsxs)(`strong`, { children: [e2.accounts, ` hesap \xB7 `, e2.players, ` karakter \xB7 `, e2.items, ` \xE7anta/depo ekipman\u0131`] }) }), (0, Z.jsxs)(`p`, { children: [`Bu say\u0131lara ek olarak t\xFCm petler, kanatlar, malzemeler ve pazar e\u015Fyalar\u0131 da temizlenir. `, e2.preservedAdminAccounts, ` y\xF6netici oyun hesab\u0131 korunur. Onay 5 dakika ge\xE7erlidir.`] }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsxs)(`span`, { children: [`Onaylamak i\xE7in aynen yaz: `, (0, Z.jsx)(`strong`, { children: wt })] }), (0, Z.jsx)(`input`, { autoComplete: `off`, value: n2, onChange: (e3) => r2(e3.target.value), disabled: i2 })] }), (0, Z.jsxs)(`div`, { className: `admin-actions`, children: [(0, Z.jsx)(`button`, { type: `button`, disabled: i2 || n2 !== wt || Date.now() > e2.expiresAt, onClick: () => void u2(true), children: i2 ? `Yedek al\u0131n\u0131yor ve s\u0131f\u0131rlan\u0131yor\u2026` : `Yedek Al ve T\xFCm Test Verilerini Sil` }), (0, Z.jsx)(`button`, { type: `button`, disabled: i2, onClick: () => {
    t2(null), r2(``);
  }, children: `Vazge\xE7` })] })] }), o2 && (0, Z.jsx)(`p`, { role: `status`, children: o2 })] });
}
function Et({ players: e2, selectedPlayerId: t2, busy: n2, act: r2 }) {
  let [i2, a2] = (0, X.useState)(``), [o2, s2] = (0, X.useState)(100), [c2, l2] = (0, X.useState)(``), u2 = (0, X.useRef)(null), d2 = (0, X.useRef)(false), f2 = e2.find((e3) => e3.id === t2)?.name ?? ``;
  (0, X.useEffect)(() => {
    a2(f2), l2(``);
  }, [f2]);
  let p2 = e2.find((e3) => e3.name === i2.trim());
  async function m2() {
    if (d2.current || n2) return;
    let e3 = i2.trim();
    if (!(!e3 || !Number.isSafeInteger(o2) || o2 < 1 || o2 > 1e6)) {
      d2.current = true, l2(``), (!u2.current || u2.current.playerName !== e3 || u2.current.amount !== o2) && (u2.current = { playerName: e3, amount: o2, requestId: crypto.randomUUID() });
      try {
        let e4 = await r2({ action: `grant_core_coins`, ...u2.current });
        if (e4?.coreCoinGrant) {
          let t3 = e4.coreCoinGrant;
          u2.current = null, l2(`${t3.playerName}: ${t3.amount.toLocaleString(`tr-TR`)} \xC7P ${t3.replayed ? `daha \xF6nce g\xF6nderilmi\u015Fti; tekrar eklenmedi` : `g\xF6nderildi`}. \u0130\u015Flem sonras\u0131 bakiye: ${t3.balance.toLocaleString(`tr-TR`)} \xC7P.`);
        }
      } finally {
        d2.current = false;
      }
    }
  }
  return (0, Z.jsxs)(`section`, { className: `admin-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(v, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Oyuncuya \xC7P G\xF6nder` }), (0, Z.jsx)(`p`, { children: `Oyuncunun mevcut \xC7ekirdek Paras\u0131 bakiyesine eklenir. \xC7evrim d\u0131\u015F\u0131ndaki oyunculara da g\xF6nderebilirsin.` })] })] }), (0, Z.jsxs)(`div`, { className: `stone-book-admin-grant`, children: [(0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `Oyuncunun tam ad\u0131` }), (0, Z.jsx)(`input`, { list: `core-coin-players`, maxLength: 32, value: i2, disabled: n2, onChange: (e3) => {
    a2(e3.target.value), l2(``);
  } }), (0, Z.jsx)(`datalist`, { id: `core-coin-players`, children: e2.map((e3) => (0, Z.jsx)(`option`, { value: e3.name }, e3.id)) })] }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `G\xF6nderilecek \xC7P` }), (0, Z.jsx)(`input`, { type: `number`, inputMode: `numeric`, min: 1, max: 1e6, step: 1, value: o2, disabled: n2, onChange: (e3) => {
    s2(Number(e3.target.value)), l2(``);
  } })] })] }), p2 && (0, Z.jsxs)(`p`, { children: [p2.name, ` \xB7 Mevcut bakiye: `, (0, Z.jsxs)(`strong`, { children: [Number(p2.core_coins ?? 0).toLocaleString(`tr-TR`), ` \xC7P`] })] }), (0, Z.jsxs)(`button`, { type: `button`, className: `admin-primary`, disabled: n2 || !i2.trim() || !Number.isSafeInteger(o2) || o2 < 1 || o2 > 1e6, onClick: () => void m2(), children: [(0, Z.jsx)(v, {}), ` `, n2 ? `\u0130\u015Fleniyor\u2026` : `\xC7P G\xF6nder`] }), c2 && (0, Z.jsx)(`p`, { role: `status`, children: c2 })] });
}
function Dt({ player: e2, settings: t2, busy: n2, act: r2 }) {
  let i2 = e2?.rank?.tier ?? 0, [a2, o2] = (0, X.useState)(i2 || 1), [s2, c2] = (0, X.useState)(``), l2 = (0, X.useRef)(false);
  (0, X.useEffect)(() => {
    o2(i2 || 1), c2(``);
  }, [e2?.id, i2]);
  let u2 = W(a2, t2.config), d2 = t2.config.tiers.slice(0, a2).map((e3) => K.find((t3) => t3.id === e3.reward)).filter(Boolean);
  async function f2() {
    if (!(!e2 || e2.level < 65 || n2 || l2.current)) {
      l2.current = true;
      try {
        await r2({ action: `grant_rank`, playerId: e2.id, tier: a2, expectedTier: i2 }) && c2(`${e2.name}: ${V(a2)} uyguland\u0131.`);
      } finally {
        l2.current = false;
      }
    }
  }
  return (0, Z.jsxs)(`section`, { className: `admin-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(ve, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Oyuncuya R\xFCtbe Ver` }), (0, Z.jsx)(`p`, { children: `Anl\u0131k Oyuncu Kontrol\xFC\u2019nden se\xE7ti\u011Fin 65. seviye oyuncuya do\u011Frudan r\xFCtbe ve kademe uygula.` })] })] }), (0, Z.jsxs)(`p`, { children: [(0, Z.jsx)(`strong`, { children: e2?.name ?? `\xD6nce oyuncu se\xE7` }), e2 && ` \xB7 Sv. ${e2.level} \xB7 Mevcut: ${i2 ? V(i2) : `R\xFCtbe a\xE7\u0131lmam\u0131\u015F`}`] }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `Verilecek r\xFCtbe ve kademe` }), (0, Z.jsx)(`select`, { value: a2, disabled: n2 || !e2, onChange: (e3) => {
    o2(Number(e3.target.value)), c2(``);
  }, children: t2.config.tiers.map((e3, t3) => (0, Z.jsx)(`option`, { value: t3 + 1, children: V(t3 + 1) }, t3)) })] }), (0, Z.jsxs)(`p`, { style: { color: xe(a2) }, children: [(0, Z.jsx)(`strong`, { children: V(a2) }), ` \xB7 Toplam +`, u2.hp, ` can, +`, u2.defense, ` savunma, +%`, u2.pve, ` canavar hasar\u0131, +%`, u2.pvp, ` oyuncu hasar\u0131.`] }), (0, Z.jsx)(`p`, { children: d2.length ? `A\xE7\u0131lan g\xF6r\xFCn\xFCmler: ${d2.map((e3) => e3.name).join(`, `)}.` : `Bu kademeye kadar \xF6zel g\xF6r\xFCn\xFCm \xF6d\xFCl\xFC yok.` }), (0, Z.jsx)(`p`, { children: `G\xF6rev \u015Fart\u0131 atlan\u0131r; se\xE7ilen kademenin ba\u015Flang\u0131\xE7 tecr\xFCbesi uygulan\u0131r. Ayn\u0131 r\xFCtbe tekrar verilirse mevcut tecr\xFCbe korunur. Daha d\xFC\u015F\xFCk r\xFCtbe se\xE7ilirse bonuslar azal\u0131r; kazan\u0131lm\u0131\u015F g\xF6r\xFCn\xFCmler korunur.` }), e2 && e2.level < 65 && (0, Z.jsx)(`p`, { role: `status`, children: `\xD6nce oyuncuyu Anl\u0131k Oyuncu Kontrol\xFC\u2019nden 65. seviyeye getir.` }), (0, Z.jsxs)(`button`, { type: `button`, className: `admin-primary`, disabled: n2 || !e2 || e2.level < 65, onClick: () => void f2(), children: [(0, Z.jsx)(ve, {}), `R\xFCtbeyi Uygula`] }), s2 && (0, Z.jsx)(`p`, { role: `status`, children: s2 })] });
}
var Ot = { enabled: `Zindan a\xE7\u0131k (1) / kapal\u0131 (0)`, minimum_level: `Giri\u015F seviyesi`, ready_seconds: `Haz\u0131rl\u0131k s\xFCresi (sn)`, duration_seconds: `Azami ko\u015Fu s\xFCresi (sn)`, enemy_hp: `Canavar temel can\u0131 (3 ki\u015Fi)`, boss_hp: `Boss temel can\u0131 (3 ki\u015Fi)`, enemy_damage: `Canavar hasar\u0131`, boss_damage: `Boss hasar\u0131`, crystal_hp: `Korunacak kristalin can\u0131`, wing_bonus_chance: `\u0130kinci Kanat Par\xE7as\u0131 %`, infinite_bonus_chance: `\u0130kinci Sonsuz Ta\u015F\u0131 Par\xE7as\u0131 %`, pet_bonus_chance: `\u0130kinci Ejderha Par\xE7as\u0131 %`, red_chance: `K\u0131rm\u0131z\u0131 e\u015Fya d\xFC\u015Fme %`, helmet_chance: `Zindan son boss \xB7 Kask d\xFC\u015Fme %`, wing_cost: `Kanat i\xE7in par\xE7a`, infinite_cost: `Sonsuz i\xE7in par\xE7a`, infinite_gems: `Sonsuz i\xE7in m\xFCcevher`, infinite_pearls: `Sonsuz i\xE7in beyaz inci`, pet_cost: `Ejderha i\xE7in par\xE7a`, pet_gems: `Ejderha i\xE7in m\xFCcevher`, winner_gems: `Hasar birincisi m\xFCcevher`, winner_red_chance: `Hasar birincisi ek k\u0131rm\u0131z\u0131 e\u015Fya %`, infinite_weapon_power: `Sonsuz standart silah g\xFCc\xFC`, infinite_power_percent: `Sonsuz savunma ekipman\u0131 / \xF6zel silah g\xFC\xE7 art\u0131\u015F\u0131 %` };
function kt({ settings: e2, busy: t2, act: n2 }) {
  let [r2, i2] = (0, X.useState)(e2 ?? {}), [a2, o2] = (0, X.useState)(``), [s2, c2] = (0, X.useState)(`wing`), [l2, u2] = (0, X.useState)(1);
  return (0, X.useEffect)(() => i2(e2 ?? {}), [e2]), (0, Z.jsxs)(`section`, { className: `admin-card`, children: [(0, Z.jsx)(`h2`, { children: `\xC7ekirde\u011Fin Kalbi \xB7 Zindan ve \xF6d\xFCller` }), (0, Z.jsx)(`p`, { children: `Yeni ko\u015Fular g\xFCncel ayarlarla a\xE7\u0131l\u0131r. Ba\u015Flam\u0131\u015F ko\u015Fular\u0131n zorlu\u011Fu ve \xF6d\xFCl olas\u0131l\u0131klar\u0131 de\u011Fi\u015Fmez. Her oyuncuya Kanat, Sonsuz Ta\u015F\u0131 ve Ejderha par\xE7alar\u0131n\u0131n her birinden 1 adet kesin d\xFC\u015Fer. \u0130kinci adet a\u015Fa\u011F\u0131daki ayr\u0131 olas\u0131l\u0131kla \xE7\u0131kar (varsay\u0131lan %10); toplam en fazla 2 adettir. Oran\u0131 0 yapmak yaln\u0131z ikinci adedi kapat\u0131r. K\u0131rm\u0131z\u0131 e\u015Fya ve kask ayr\u0131 zar atar. Hasar birincisinin ek k\u0131rm\u0131z\u0131 \xF6d\xFCl\xFC a\u015Fa\u011F\u0131daki ayr\u0131 oranla belirlenir (0 ile kapan\u0131r). Aktif Ganimet Bereketi, ikinci par\xE7a ve di\u011Fer d\xFC\u015F\xFC\u015F olas\u0131l\u0131klar\u0131n\u0131 art\u0131r\u0131r; \xFCst s\u0131n\u0131r %100\u2019d\xFCr. Kristal Sand\u0131\u011F\u0131 yaln\u0131z kendi etkinli\u011Fi aktifken, etkinlik panelindeki oranla d\xFC\u015Fer. Kanat, Sonsuz ve Ejderha par\xE7alar\u0131; silah, z\u0131rh, kask, \xE7izme, kolye ve Kristal Sand\u0131\u011F\u0131 pazarda sat\u0131labilir. M\xFCcevher do\u011Frudan para birimidir.` }), e2 ? (0, Z.jsxs)(Z.Fragment, { children: [(0, Z.jsxs)(`form`, { onSubmit: (e3) => {
    e3.preventDefault(), n2({ action: `dungeon_settings`, settings: r2 });
  }, children: [(0, Z.jsx)(`div`, { className: `dungeon-admin-grid`, children: Object.entries(Ot).map(([e3, t3]) => (0, Z.jsxs)(`label`, { children: [t3, (0, Z.jsx)(`input`, { type: `number`, min: 0, max: e3.endsWith(`_chance`) ? 100 : e3 === `enabled` ? 1 : void 0, step: e3.endsWith(`_chance`) ? 0.1 : 1, value: r2[e3] ?? 0, onChange: (t4) => i2((n3) => ({ ...n3, [e3]: Number(t4.target.value) })) })] }, e3)) }), (0, Z.jsx)(`button`, { disabled: t2, children: `Zindan ayarlar\u0131n\u0131 kaydet` })] }), (0, Z.jsx)(`h3`, { children: `Oyuncuya zindan \xF6d\xFCl\xFC ver` }), (0, Z.jsxs)(`form`, { className: `dungeon-admin-grant`, onSubmit: (e3) => {
    e3.preventDefault(), n2({ action: `dungeon_grant`, playerName: a2, kind: s2, amount: l2 });
  }, children: [(0, Z.jsx)(`input`, { required: true, "aria-label": `Oyuncu ad\u0131`, placeholder: `Tam oyuncu ad\u0131`, value: a2, onChange: (e3) => o2(e3.target.value) }), (0, Z.jsx)(`select`, { "aria-label": `\xD6d\xFCl`, value: s2, onChange: (e3) => c2(e3.target.value), children: [[`wing`, `Kanat Par\xE7as\u0131`], [`infinite`, `Sonsuz Ta\u015F\u0131 Par\xE7as\u0131`], [`pet`, `Ejderha Par\xE7as\u0131`], [`wings`, `Kalbin I\u015F\u0131\u011F\u0131 Kanatlar\u0131`], [`dragon`, `\xC7ekirdek Ejderhas\u0131`]].map(([e3, t3]) => (0, Z.jsx)(`option`, { value: e3, children: t3 }, e3)) }), ![`wings`, `dragon`].includes(s2) && (0, Z.jsx)(`input`, { "aria-label": `Miktar`, type: `number`, min: 1, max: 1e4, value: l2, onChange: (e3) => u2(Number(e3.target.value)) }), (0, Z.jsx)(`button`, { disabled: t2, children: `Oyuncuya ver` })] })] }) : (0, Z.jsx)(`p`, { children: `Zindan sunucu g\xFCncellemesi hen\xFCz kurulmam\u0131\u015F.` })] });
}
function At({ curve: e2, busy: t2, save: n2 }) {
  let [r2, i2] = (0, X.useState)(e2), [a2, o2] = (0, X.useState)(() => e2 ? JSON.parse(e2) : C()), [s2, c2] = (0, X.useState)(``), [u2, d2] = (0, X.useState)(300), f2 = JSON.stringify(a2) !== r2, p2 = (e3, t3) => {
    c2(``), o2((n3) => De(n3, e3 + 1, e3 + 2, 1, t3));
  }, m2 = (e3, t3, n3) => {
    c2(``), o2((r3) => De(r3, e3, t3, n3));
  }, h2 = async () => {
    try {
      H(a2), c2(``), await n2(a2, r2) && i2(JSON.stringify(a2));
    } catch (e3) {
      c2(e3 instanceof Error ? e3.message : `Tablo kaydedilemedi.`);
    }
  };
  return (0, Z.jsxs)(`section`, { className: `admin-card level-curve-card`, children: [(0, Z.jsx)(`div`, { className: `admin-card-title`, children: (0, Z.jsxs)(`div`, { children: [(0, Z.jsxs)(`h2`, { children: [`Seviye Kas\u0131lma Dengesi `, (0, Z.jsx)(`span`, { children: `En fazla 65 \xB7 a\xE7\u0131k s\u0131n\u0131r G\xFCncellemeler\u2019den y\xF6netilir` })] }), (0, Z.jsx)(`p`, { children: `\u0130lk 10 seviye h\u0131zl\u0131, son 10 seviye zor. TP bedelini art\u0131rmak kas\u0131lmay\u0131 yava\u015Flat\u0131r.` })] }) }), (0, Z.jsx)(`p`, { children: `Kaydetti\u011Finde mevcut oyuncular\u0131n seviyesi ve seviye i\xE7indeki ilerleme oran\u0131 korunur. S\xFCreler tahmindir; ekipman, grup ve EXP bonuslar\u0131 sonucu de\u011Fi\u015Ftirir.` }), e2 !== r2 && (0, Z.jsx)(`p`, { role: `status`, children: `Canl\u0131 tablo de\u011Fi\u015Fti. Kaydetmeden \xF6nce g\xFCncel tabloyu y\xFCkle.` }), (0, Z.jsx)(`p`, { children: `De\u011Ferler tam say\u0131ya ve izin verilen s\u0131n\u0131rlara otomatik uyarlan\u0131r. S\u0131ra bozulursa yaln\u0131z gerekli kom\u015Fu seviyeler d\xFCzeltilir; kaydetmeden \xF6nce g\xFCncel toplamlar\u0131 g\xF6rebilirsin.` }), (0, Z.jsxs)(`div`, { className: `level-curve-toolbar`, children: [(0, Z.jsx)(`button`, { type: `button`, disabled: t2, onClick: () => m2(1, a2.length + 1, 0.9), children: `T\xFCm\xFCn\xFC %10 kolayla\u015Ft\u0131r` }), (0, Z.jsx)(`button`, { type: `button`, disabled: t2, onClick: () => m2(1, a2.length + 1, 1.1), children: `T\xFCm\xFCn\xFC %10 zorla\u015Ft\u0131r` }), (0, Z.jsxs)(`label`, { children: [`Tahmin i\xE7in dakikada kazan\u0131lan TP`, (0, Z.jsx)(`input`, { type: `number`, min: `1`, max: `10000000`, value: u2, onChange: (e3) => d2(Math.max(1, Number(e3.target.value) || 1)) })] }), (0, Z.jsx)(`button`, { type: `button`, disabled: t2, onClick: () => {
    o2(JSON.parse(e2)), i2(e2), c2(``);
  }, children: `Canl\u0131 tabloyu y\xFCkle` })] }), (0, Z.jsx)(`div`, { className: `level-band-grid`, children: [...l, ...a2.length === 64 ? O : []].map(({ from: e3, to: n3 }) => {
    let r3 = a2.slice(e3 - 1, n3 - 1).reduce((e4, t3) => e4 + t3, 0);
    return (0, Z.jsxs)(`article`, { children: [(0, Z.jsxs)(`h3`, { children: [e3, ` \u2192 `, n3, ` `, (0, Z.jsx)(`small`, { children: e3 === 1 ? `H\u0131zl\u0131 ba\u015Flang\u0131\xE7` : e3 >= 40 ? `Zorlu son seviyeler` : `Kademeli ilerleme` })] }), (0, Z.jsxs)(`strong`, { children: [r3.toLocaleString(`tr-TR`), ` TP`] }), (0, Z.jsxs)(`p`, { children: [`Girilen h\u0131za g\xF6re \u2248 `, Math.round(r3 / u2), ` dakika`] }), (0, Z.jsxs)(`div`, { className: `level-band-actions`, children: [(0, Z.jsx)(`button`, { type: `button`, disabled: t2, onClick: () => m2(e3, n3, 0.9), children: `%10 Kolayla\u015Ft\u0131r` }), (0, Z.jsx)(`button`, { type: `button`, disabled: t2, onClick: () => m2(e3, n3, 1.1), children: `%10 Zorla\u015Ft\u0131r` })] }), (0, Z.jsxs)(`details`, { children: [(0, Z.jsx)(`summary`, { children: `Seviyeleri tek tek d\xFCzenle` }), a2.slice(e3 - 1, n3 - 1).map((t3, n4) => (0, Z.jsxs)(`label`, { children: [(0, Z.jsxs)(`span`, { children: [e3 + n4, ` \u2192 `, e3 + n4 + 1, ` TP`] }), (0, Z.jsx)(`input`, { type: `number`, min: `1`, max: `100000000`, step: `1`, value: t3, onChange: (t4) => p2(e3 - 1 + n4, Number(t4.target.value)) })] }, n4))] })] }, e3);
  }) }), s2 && (0, Z.jsx)(`p`, { role: `alert`, className: `level-curve-error`, children: s2 }), (0, Z.jsxs)(`div`, { className: `level-curve-footer`, children: [(0, Z.jsx)(`button`, { type: `button`, disabled: t2, onClick: () => o2(a2.length === 64 ? k(C()) : C()), children: `Ge\xE7ici ba\u015Flang\u0131\xE7 tablosunu y\xFCkle` }), (0, Z.jsx)(`button`, { type: `button`, disabled: t2 || !f2 || e2 !== r2, onClick: () => void h2(), children: t2 ? `Kaydediliyor\u2026` : f2 ? `Seviye tablosunu kaydet` : `Tablo g\xFCncel` })] })] });
}
var jt = [`sokan`, `levrek`, `zargana`, `pearl`, `talisman`];
function Mt(e2) {
  if (!e2 || typeof e2 != `object`) throw Error(`Yakalama oranlar\u0131n\u0131 gir.`);
  let t2 = jt.map((t3) => e2[t3] ?? (t3 === `talisman` ? 0 : NaN));
  if (t2.some((e3) => typeof e3 != `number` || !Number.isFinite(e3) || e3 < 0 || e3 > 100 || Math.abs(e3 * 100 - Math.round(e3 * 100)) > 1e-6)) throw Error(`Oranlar 0\u2013100 aras\u0131nda, en fazla iki ondal\u0131kl\u0131 olmal\u0131.`);
  if (t2.reduce((e3, t3) => e3 + Math.round(t3 * 100), 0) !== 1e4) throw Error(`Yakalama oranlar\u0131n\u0131n toplam\u0131 %100 olmal\u0131.`);
  return { fish_sokan_weight: Math.round(t2[0] * 100), fish_levrek_weight: Math.round(t2[1] * 100), fish_zargana_weight: Math.round(t2[2] * 100), fishing_pearl_chance: t2[3] / 100, ...`talisman` in e2 ? { fishing_talisman_chance: t2[4] / 100 } : {} };
}
function Nt(e2) {
  let t2 = Math.max(0, Math.min(1e4, Math.round((e2.fishing_pearl_chance ?? 0.03) * 1e4))), n2 = Math.max(0, Math.min(1e4 - t2, Math.round((e2.fishing_talisman_chance ?? 0) * 1e4))), r2 = [e2.fish_sokan_weight ?? 55, e2.fish_levrek_weight ?? 30, e2.fish_zargana_weight ?? 15].map((e3) => Math.max(0, e3)), i2 = r2.reduce((e3, t3) => e3 + t3, 0) || 1, a2 = r2.map((e3) => e3 / i2 * (1e4 - t2 - n2)), o2 = a2.map(Math.floor), s2 = 1e4 - t2 - n2 - o2.reduce((e3, t3) => e3 + t3, 0), c2 = [0, 1, 2].sort((e3, t3) => a2[t3] - o2[t3] - (a2[e3] - o2[e3]));
  s2 > 3 && (o2[0] += s2, s2 = 0);
  for (let e3 = 0; e3 < s2; e3++) o2[c2[e3]]++;
  return { sokan: o2[0] / 100, levrek: o2[1] / 100, zargana: o2[2] / 100, pearl: t2 / 100, ...e2.fishing_talisman_chance === void 0 ? {} : { talisman: n2 / 100 } };
}
var Pt = new Intl.DateTimeFormat(`tr-TR`, { day: `2-digit`, month: `2-digit`, hour: `2-digit`, minute: `2-digit`, second: `2-digit`, timeZone: `Europe/Istanbul` });
function Ft() {
  let [e2, t2] = (0, X.useState)([]), [n2, r2] = (0, X.useState)(true), [i2, a2] = (0, X.useState)(``), [o2, s2] = (0, X.useState)(0), [c2, l2] = (0, X.useState)(0);
  return (0, X.useEffect)(() => {
    let e3 = false, n3, i3 = null, o3 = true, c3 = async () => {
      if (e3 || !o3 || document.visibilityState === `hidden` || i3) return;
      let l4 = new AbortController();
      i3 = l4, r2(true);
      let u2 = setTimeout(() => l4.abort(), 15e3);
      try {
        let n4 = await fetch(`/api/admin/gm?view=world-chat`, { cache: `no-store`, signal: l4.signal });
        if (e3 || i3 !== l4 || l4.signal.aborted) return;
        if (n4.status === 401 || n4.status === 403) {
          o3 = false, t2([]), a2(`D\xFCnya sohbetini g\xF6rmek i\xE7in ana y\xF6netici oturumunu a\xE7mal\u0131s\u0131n.`);
          return;
        }
        let r3 = await n4.json();
        if (e3 || i3 !== l4 || l4.signal.aborted) return;
        if (!n4.ok || !Array.isArray(r3.messages)) throw Error(`D\xFCnya sohbeti yenilenemedi. Tekrar denenecek.`);
        t2(r3.messages), s2(Date.now()), a2(``);
      } catch {
        !e3 && i3 === l4 && a2(`D\xFCnya sohbeti yenilenemedi. Tekrar denenecek.`);
      } finally {
        clearTimeout(u2), i3 === l4 && (i3 = null, e3 || (r2(false), o3 && document.visibilityState !== `hidden` && (n3 = setTimeout(() => void c3(), 5e3))));
      }
    }, l3 = () => {
      clearTimeout(n3), document.visibilityState === `hidden` ? (i3?.abort(), i3 = null, r2(false)) : c3();
    };
    return document.addEventListener(`visibilitychange`, l3), c3(), () => {
      e3 = true, clearTimeout(n3), i3?.abort(), i3 = null, document.removeEventListener(`visibilitychange`, l3);
    };
  }, [c2]), (0, Z.jsxs)(`section`, { className: `admin-card gm-world-chat-card`, children: [(0, Z.jsxs)(`div`, { className: `gm-world-chat-heading`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(st, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `D\xFCnya Sohbeti` }), (0, Z.jsx)(`p`, { children: `T\xFCm kanallardaki son 100 mesaj. En yeni mesaj \xFCstte; bu b\xF6l\xFCm a\xE7\u0131kken 5 saniyede bir yenilenir.` })] })] }), (0, Z.jsxs)(`button`, { type: `button`, className: `gm-world-chat-refresh`, disabled: n2, onClick: () => l2((e3) => e3 + 1), children: [(0, Z.jsx)(je, { "aria-hidden": `true` }), n2 ? `Y\xFCkleniyor\u2026` : `Yenile`] })] }), (0, Z.jsx)(`p`, { className: `gm-world-chat-status`, children: o2 ? `Son yenileme: ${Pt.format(o2)} \xB7 T\xFCrkiye saati` : `D\xFCnya sohbeti y\xFCkleniyor\u2026` }), i2 && (0, Z.jsx)(`p`, { className: `gm-error`, role: `status`, children: i2 }), (0, Z.jsxs)(`div`, { className: `gm-world-chat-list`, role: `region`, "aria-label": `D\xFCnya sohbeti mesajlar\u0131`, "aria-busy": n2, tabIndex: 0, children: [e2.map((e3) => (0, Z.jsxs)(`article`, { children: [(0, Z.jsxs)(`header`, { children: [(0, Z.jsx)(`strong`, { children: e3.player_name }), (0, Z.jsx)(`time`, { dateTime: new Date(e3.created_at * 1e3).toISOString(), children: Pt.format(e3.created_at * 1e3) })] }), (0, Z.jsx)(`p`, { children: e3.body })] }, e3.id)), !n2 && !i2 && !e2.length && (0, Z.jsx)(`p`, { className: `gm-world-chat-empty`, children: `Hen\xFCz d\xFCnya sohbeti mesaj\u0131 yok.` })] })] });
}
var It = (e2) => e2 === `avci` ? `Avc\u0131` : e2 === `arkanist` ? `Arkanist` : `Muhaf\u0131z`;
async function Lt(e2) {
  let t2 = await fetch(`/api/admin/gm`, { method: `POST`, headers: { "content-type": `application/json` }, body: JSON.stringify(e2) }), n2 = await t2.json();
  if (!t2.ok) throw Error(n2.error ?? `\u0130\u015Flem tamamlanamad\u0131.`);
  return n2;
}
function Rt() {
  let [e2, t2] = (0, X.useState)(null), [n2, r2] = (0, X.useState)(``), [i2, a2] = (0, X.useState)(null), [o2, s2] = (0, X.useState)(false), [c2, l2] = (0, X.useState)(true), [u2, f2] = (0, X.useState)(``), [p2, m2] = (0, X.useState)(``), h2 = (0, X.useRef)(0), g2 = (0, X.useRef)(n2);
  g2.current = n2;
  let _2 = (0, X.useCallback)(async (e3) => {
    let n3 = ++h2.current;
    try {
      let r3 = await fetch(`/api/admin/gm?q=${encodeURIComponent(g2.current)}`, { cache: `no-store`, signal: e3 }), i3 = await r3.json();
      if (!r3.ok) throw Error(i3.error ?? `GM listesi y\xFCklenemedi.`);
      n3 === h2.current && (t2(i3), f2(``), a2((e4) => e4 ? i3.players.find((t3) => t3.id === e4.id) ?? i3.gms.find((t3) => t3.id === e4.id) ?? e4 : null));
    } catch (t3) {
      !e3?.aborted && n3 === h2.current && f2(t3 instanceof Error ? t3.message : `Ba\u011Flant\u0131 kurulamad\u0131.`);
    } finally {
      n3 === h2.current && l2(false);
    }
  }, []);
  (0, X.useEffect)(() => {
    let e3 = new AbortController();
    l2(true);
    let t3 = setTimeout(() => void _2(e3.signal), 200);
    return () => {
      clearTimeout(t3), e3.abort(), h2.current += 1;
    };
  }, [n2, _2]);
  let v2 = async (e3, t3) => {
    if (!o2) {
      s2(true), f2(``), m2(``);
      try {
        await Lt({ action: `set_gm`, playerId: e3.id, enabled: t3 }), a2((n3) => n3?.id === e3.id ? { ...n3, is_gm: +!!t3 } : n3), m2(t3 ? `${e3.name} GM olarak atand\u0131.` : `${e3.name} i\xE7in GM yetkisi kald\u0131r\u0131ld\u0131.`), await _2();
      } catch (e4) {
        f2(e4 instanceof Error ? e4.message : `Yetki de\u011Fi\u015Ftirilemedi.`);
      } finally {
        s2(false);
      }
    }
  };
  return (0, Z.jsxs)(`div`, { className: `gm-admin-layout`, children: [(0, Z.jsxs)("section", { className: "admin-card gm-site-visitors457", style: { gridColumn: "1 / -1" }, children: [(0, Z.jsx)("h2", { children: "Bug\xFCnk\xFC site ziyaret\xE7isi" }), (0, Z.jsx)("strong", { style: { fontSize: "32px", color: "#9be6bc" }, children: e2?.siteVisitorsToday?.available ? Number(e2.siteVisitorsToday.count).toLocaleString("tr-TR") : "\u2014" }), (0, Z.jsx)("p", { children: "T\xFCrkiye saatiyle g\xFCnl\xFCk tekil taray\u0131c\u0131 say\u0131s\u0131. Sayfa yenilemeleri ve oyun sunucusuna ge\xE7i\u015Fler tekrar say\u0131lmaz." })] }), (0, Z.jsxs)(`section`, { className: `admin-card gm-management-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(d, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `GM Y\xF6netimi` }), (0, Z.jsx)(`p`, { children: `Atad\u0131\u011F\u0131n oyuncu sar\u0131 GM unvan\u0131 ta\u015F\u0131r ve oyun i\xE7inden duyuru g\xF6nderebilir. GM atama, ekonomi ve hesap yapt\u0131r\u0131mlar\u0131 sende kal\u0131r.` })] })] }), (0, Z.jsxs)(`label`, { className: `gm-search`, children: [(0, Z.jsx)(dt, {}), (0, Z.jsx)(`input`, { type: `search`, value: n2, onChange: (e3) => r2(e3.target.value), placeholder: `Oyuncu veya hesap ad\u0131 ara`, "aria-label": `GM yap\u0131lacak oyuncuyu ara`, maxLength: 40 })] }), (0, Z.jsxs)(`div`, { className: `gm-player-results`, "aria-busy": c2, children: [c2 ? (0, Z.jsx)(`p`, { children: `Oyuncular y\xFCkleniyor\u2026` }) : e2?.players.map((t3) => (0, Z.jsxs)(`button`, { type: `button`, className: i2?.id === t3.id ? `selected` : ``, "aria-pressed": i2?.id === t3.id, onClick: () => {
    a2(t3), m2(``);
  }, children: [(0, Z.jsxs)(`span`, { children: [(0, Z.jsx)(`strong`, { children: t3.name }), (0, Z.jsxs)(`small`, { children: [`Sv. `, t3.level, ` \xB7 `, It(t3.role)] })] }), t3.is_gm === 1 ? (0, Z.jsx)(`b`, { className: `gm-mini-badge`, children: `GM` }) : (0, Z.jsx)(`small`, { children: t3.last_seen * 1e3 >= (e2?.serverNowMs ?? 0) - 3e4 ? `\xC7evrimi\xE7i` : `\xC7evrimd\u0131\u015F\u0131` })] }, t3.id)), !c2 && !e2?.players.length && (0, Z.jsx)(`p`, { children: `Oyuncu bulunamad\u0131.` })] }), i2 && (0, Z.jsxs)(`div`, { className: `gm-selected-player`, children: [(0, Z.jsxs)(`span`, { children: [(0, Z.jsx)(`strong`, { children: i2.name }), (0, Z.jsx)(`small`, { children: i2.is_gm === 1 ? `GM yetkisi a\xE7\u0131k` : `Oyuncu` })] }), (0, Z.jsxs)(`button`, { type: `button`, disabled: o2, onClick: () => void v2(i2, i2.is_gm !== 1), children: [i2.is_gm === 1 ? (0, Z.jsx)(ht, {}) : (0, Z.jsx)(mt, {}), o2 ? `Kaydediliyor\u2026` : i2.is_gm === 1 ? `GM Yetkisini Kald\u0131r` : `GM Yap`] })] }), u2 && (0, Z.jsx)(`p`, { className: `gm-error`, role: `alert`, children: u2 }), p2 && (0, Z.jsx)(`p`, { className: `gm-success`, role: `status`, children: p2 }), (0, Z.jsxs)(`div`, { className: `gm-roster`, children: [(0, Z.jsxs)(`h3`, { children: [`G\xF6revli GM\u2019ler `, (0, Z.jsx)(`span`, { children: e2?.gms.length ?? 0 })] }), e2?.gms.map((e3) => (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`b`, { className: `gm-mini-badge`, children: `GM` }), (0, Z.jsx)(`strong`, { children: e3.name }), (0, Z.jsx)(`button`, { type: `button`, disabled: o2, onClick: () => void v2(e3, false), "aria-label": `${e3.name} i\xE7in GM yetkisini kald\u0131r`, children: `Yetkiyi Kald\u0131r` })] }, e3.id)), e2 && !e2.gms.length && (0, Z.jsx)(`p`, { children: `Hen\xFCz GM atamad\u0131n.` })] })] }), (0, Z.jsxs)(`section`, { className: `admin-card gm-announcement-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(ke, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Oyun Duyurusu` }), (0, Z.jsx)(`p`, { children: `Mesaj\u0131n t\xFCm haritalarda, ekran\u0131n \xFCst bilgi alanlar\u0131n\u0131n alt\u0131nda se\xE7ti\u011Fin s\xFCre boyunca g\xF6r\xFCn\xFCr.` })] })] }), (0, Z.jsx)(F, { send: async (e3, t3, n3) => Lt({ action: `announce`, body: e3, requestId: t3, durationSeconds: n3 }), author: `Oyun Y\xF6netimi`, onSent: () => void _2() }), (0, Z.jsxs)(`div`, { className: `gm-history`, children: [(0, Z.jsx)(`h3`, { children: `Son Duyurular` }), e2?.announcements.map((e3) => (0, Z.jsxs)(`article`, { children: [(0, Z.jsxs)(`header`, { children: [(0, Z.jsx)(`strong`, { children: e3.player_name }), (0, Z.jsx)(`time`, { dateTime: new Date(e3.created_at * 1e3).toISOString(), children: new Date(e3.created_at * 1e3).toLocaleTimeString(`tr-TR`, { hour: `2-digit`, minute: `2-digit` }) })] }), (0, Z.jsx)(`p`, { children: e3.body })] }, e3.id)), e2 && !e2.announcements.length && (0, Z.jsx)(`p`, { children: `Hen\xFCz duyuru g\xF6nderilmedi.` })] })] }), (0, Z.jsx)(Ft, {})] });
}
var zt = [{ title: `D\xFCnya Dengesi`, fields: [[`health_decay_per_second`, `Saniyelik sa\u011Fl\u0131k kayb\u0131 (%)`, 1e-3], [`donation_health_per_essence`, `1 \xF6z\xFCn iyile\u015Ftirmesi (%)`, 0.01]] }, { title: `Oyuncu Can\u0131`, fields: [[`player_max_hp`, `Genel oyuncu azami can\u0131`, 10]] }, { title: `Donmu\u015F \xC7am Ge\xE7idi \xB7 Normal Canavarlar\u0131n Yeniden Do\u011Fmas\u0131`, fields: [[`frozen_monster_respawn_seconds`, `\xD6ld\xFCkten sonra bekleme (saniye, 1\u20133600)`, 1]] }, { title: `Kara B\xF6lge \xB7 Canavarlar\u0131n Yeniden Do\u011Fmas\u0131`, fields: [[`black_monster_respawn_seconds`, `\xD6ld\xFCkten sonra bekleme (saniye, 1\u20133600)`, 1]] }, { title: `Otomatik Av Adas\u0131 \xB7 \xD6n \u0130zleme ve \xD6d\xFCller`, fields: [[`afk_island_enabled`, `Oyunculara a\xE7 (0: yaln\u0131z y\xF6netici, 1: a\xE7\u0131k)`, 1], [`afk_island_xp_reward`, `Canavar ba\u015F\u0131na temel TP`, 1], [`afk_island_respawn_seconds`, `Yeniden do\u011Fma (saniye)`, 1]] }, { title: `Kuzey Orman\u0131 \xB7 Canavarlar\u0131n Yeniden Do\u011Fmas\u0131`, fields: [[`forest_monster_respawn_seconds`, `\xD6ld\xFCkten sonra bekleme (saniye, 1\u20133600)`, 1]] }, { title: `Dinlenirken Can Yenilenmesi`, fields: [[`rest_regen_percent`, `Saniyede azami can\u0131n y\xFCzdesi (0: kapal\u0131)`, 0.5], [`rest_regen_combat_delay_seconds`, `Son sald\u0131r\u0131dan sonra bekleme (saniye)`, 1], [`rest_regen_still_seconds`, `Hareketsiz bekleme (saniye)`, 1]] }, { title: `Canavar Dinlenme Yenilenmesi`, fields: [[`monster_rest_regen_percent`, `Saniyede azami can\u0131n y\xFCzdesi (0: kapal\u0131)`, 0.5], [`monster_rest_regen_combat_delay_seconds`, `Sald\u0131r\u0131 bittikten sonra bekleme (saniye)`, 1]] }, { title: `Mor E\u015Fya \xB7 K\xF6k Vadisi ve Bosslar`, fields: [[`ancient_normal_purple_chance`, `K\xF6k Vadisi normal canavarlar\u0131 \xB7 kesim ba\u015F\u0131na (%)`, 1e-3], [`ancient_boss_purple_chance`, `Kadim K\xF6k\xFCn Muhaf\u0131z\u0131 \xB7 \xF6ld\xFCrme ba\u015F\u0131na (%)`, 1e-3], [`world_boss_purple_chance`, `D\xFCnya Bossu \xB7 \xF6ld\xFCrme ba\u015F\u0131na (%)`, 1e-3]] }, { title: `D\xFCnya Bossu`, fields: [[`boss_fire_interval_seconds`, `Kor Patlamas\u0131 aral\u0131\u011F\u0131 (1\u201360 sn)`, 1], [`boss_fire_damage_multiplier`, `Kor Patlamas\u0131 / d\xFCz vuru\u015F (1,2 = %20 fazla)`, 0.1], [`boss_hp`, `Boss can\u0131`, 1e3], [`boss_damage_scale`, `Vuru\u015F hasar\u0131 \xE7arpan\u0131`, 0.05], [`boss_respawn_seconds`, `Gelme aral\u0131\u011F\u0131 (sn)`, 60], [`boss_duration_seconds`, `Haritada kalma (sn)`, 30]] }, { title: `Kadim K\xF6k Vadisi \xB7 Tecr\xFCbe ve Yeniden Do\u011Fma`, fields: [[`ancient_golge_xp_reward`, `K\u0131z\u0131l Pen\xE7e TP`, 1], [`ancient_curuk_xp_reward`, `K\xF6k Muhaf\u0131z\u0131 TP`, 1], [`ancient_yutan_xp_reward`, `K\xFCl K\xE2hini TP`, 1], [`ancient_monster_respawn_seconds`, `Yeniden do\u011Fma (saniye)`, 1]] }, { title: `Kadim K\xF6k\xFCn Muhaf\u0131z\u0131 \xB7 Merkez Bossu`, fields: [[`ancient_boss_enabled`, `Boss a\xE7\u0131k (1) / kapal\u0131 (0)`, 1], [`ancient_boss_hp`, `Boss can\u0131`, 100], [`ancient_boss_damage_scale`, `Hasar \xE7arpan\u0131`, 0.05], [`ancient_boss_respawn_seconds`, `Yeniden do\u011Fma (saniye; varsay\u0131lan 2400)`, 60], [`ancient_boss_xp_reward`, `TP \xF6d\xFCl\xFC`, 1], [`ancient_boss_reward_gems`, `M\xFCcevher \xF6d\xFCl\xFC`, 1]] }, { title: `Canavar Deneyim \xD6d\xFClleri`, fields: [[`shadow_wolf_xp_reward`, `G\xF6lge Kurdu TP`, 1], [`rotten_guardian_xp_reward`, `\xC7\xFCr\xFCk Muhaf\u0131z TP`, 1], [`essence_devourer_xp_reward`, `\xD6z Yutan TP`, 1], [`aggressive_variant_xp_reward`, `Agresif orman varyant\u0131 TP`, 1], [`killer_variant_xp_reward`, `Katil orman varyant\u0131 TP`, 1], [`frozen_shadow_wolf_xp_reward`, `Donmu\u015F Ge\xE7it \xB7 K\u0131ra\u011F\u0131 Va\u015Fa\u011F\u0131 TP`, 1], [`frozen_rotten_guardian_xp_reward`, `Donmu\u015F Ge\xE7it \xB7 Buzk\xF6k Golemi TP`, 1], [`frozen_essence_devourer_xp_reward`, `Donmu\u015F Ge\xE7it \xB7 Tipi K\xE2hini TP`, 1], [`frozen_aggressive_variant_xp_reward`, `Donmu\u015F Ge\xE7it \xB7 Agresif varyant TP`, 1], [`frozen_killer_variant_xp_reward`, `Donmu\u015F Ge\xE7it \xB7 Katil varyant TP`, 1], [`black_monster_xp_reward`, `Kara B\xF6lge \xB7 Her canavar\u0131n temel TP \xF6d\xFCl\xFC`, 1], [`sinsi_shadow_wolf_xp_reward`, `Sinsi G\xF6lge Kurdu TP`, 1], [`sinsi_guardian_xp_reward`, `Sinsi Muhaf\u0131z TP`, 1], [`sinsi_devourer_xp_reward`, `Sinsi \xD6z Yutan TP`, 1], [`sinsi_stone_xp_reward`, `Sinsi Ta\u015F TP`, 1], [`boss_xp_reward`, `D\xFCnya bossu TP`, 1]] }, { title: `D\xFCnya Muhaf\u0131zlar\u0131`, fields: [[`guardian_reward_gems`, `Birinciye verilecek m\xFCcevher`, 1], [`guardian_reward_seconds`, `\xD6d\xFCl aral\u0131\u011F\u0131 (sn)`, 60]] }, { title: `Seviye, Temel Sald\u0131r\u0131 ve Yetenek Dengesi`, fields: [[`skill_two_unlock_level`, `2. yetenek a\xE7\u0131lma seviyesi`, 1], [`skill_three_unlock_level`, `3. yetenek a\xE7\u0131lma seviyesi`, 1], [`skill_two_cooldown_ms`, `2. yetenek bekleme (ms)`, 100], [`skill_three_cooldown_ms`, `3. yetenek bekleme (ms)`, 100], [`skill_damage_scale`, `Genel sald\u0131r\u0131 hasar \xF6l\xE7e\u011Fi`, 0.01], [`skill_one_multiplier`, `Temel sald\u0131r\u0131 \xE7arpan\u0131`, 0.05], [`skill_two_multiplier`, `2. yetenek \xE7arpan\u0131`, 0.05], [`skill_three_multiplier`, `3. yetenek \xE7arpan\u0131`, 0.05], [`skill_upgrade_damage_per_level`, `Y\xFCkseltme ba\u015F\u0131na hasar`, 0.01]] }, { title: `S\u0131n\u0131f ve Ba\u015Flang\u0131\xE7 G\xFCc\xFC`, fields: [[`starter_weapon_power`, `Ba\u015Flang\u0131\xE7 silah\u0131 hasar\u0131`, 1], [`guardian_base_attack`, `Muhaf\u0131z temel sald\u0131r\u0131s\u0131`, 1], [`hunter_base_attack`, `Avc\u0131 temel sald\u0131r\u0131s\u0131`, 1], [`arcanist_base_attack`, `Arkanist temel sald\u0131r\u0131s\u0131`, 1]] }, { title: `Kritik ve Kanat`, fields: [[`base_critical_chance`, `Temel kritik \u015Fans\u0131 (%)`, 0.1], [`third_skill_critical_bonus`, `3. skill ek kritik (%)`, 0.1], [`critical_damage_multiplier`, `Kritik hasar \xE7arpan\u0131`, 0.05], [`wing_gem_cost`, `Kanat fiyat\u0131 (m\xFCcevher)`, 100], [`wing_attack_bonus`, `Kanat sald\u0131r\u0131 bonusu`, 1], [`wing_defense_bonus`, `Kanat savunma bonusu`, 1], [`wing_critical_chance`, `Kanat kritik bonusu (%)`, 0.1]] }, { title: `Ekonomi`, fields: [[`potion_essence_cost`, `Can iksiri \xF6z maliyeti`, 1], [`exchange_essence_cost`, `Takas i\xE7in \xF6z`, 1], [`exchange_gem_reward`, `Takas \xF6d\xFCl\xFC m\xFCcevher`, 1], [`skill_upgrade_gem_cost`, `Yetenek kademe ba\u015F\u0131 M\xFCcevher (\xF6nerilen 5)`, 1]] }, { title: `Silah Sald\u0131r\u0131 Aral\u0131klar\u0131`, fields: [[`white_weapon_power_min`, `Beyaz minimum`, 1], [`white_weapon_power_max`, `Beyaz maksimum`, 1], [`blue_weapon_power_min`, `Mavi minimum`, 1], [`blue_weapon_power_max`, `Mavi maksimum`, 1], [`orange_weapon_power_min`, `Turuncu minimum`, 1], [`orange_weapon_power_max`, `Turuncu maksimum`, 1], [`red_weapon_power_min`, `K\u0131rm\u0131z\u0131 minimum`, 1], [`red_weapon_power_max`, `K\u0131rm\u0131z\u0131 maksimum`, 1]] }, { title: `Savunma Ekipman\u0131 G\xFC\xE7 Aral\u0131klar\u0131`, fields: [[`white_armor_power_min`, `Beyaz minimum`, 1], [`white_armor_power_max`, `Beyaz maksimum`, 1], [`blue_armor_power_min`, `Mavi minimum`, 1], [`blue_armor_power_max`, `Mavi maksimum`, 1], [`orange_armor_power_min`, `Turuncu minimum`, 1], [`orange_armor_power_max`, `Turuncu maksimum`, 1], [`red_armor_power_min`, `K\u0131rm\u0131z\u0131 minimum`, 1], [`red_armor_power_max`, `K\u0131rm\u0131z\u0131 maksimum`, 1]] }, { title: `E\u015Fya Sat\u0131\u015F De\u011Feri`, fields: [[`item_sale_white`, `Beyaz e\u015Fya`, 1], [`item_sale_blue`, `Mavi e\u015Fya`, 1], [`item_sale_orange`, `Turuncu e\u015Fya`, 1], [`item_sale_red`, `K\u0131rm\u0131z\u0131 e\u015Fya`, 1]] }, { title: `Bal\u0131k\xE7\u0131l\u0131k`, fields: [[`fishing_rod_cost`, `Olta fiyat\u0131 (m\xFCcevher)`, 1], [`fish_sokan_value`, `Sokan sat\u0131\u015F de\u011Feri`, 1], [`fish_levrek_value`, `Levrek sat\u0131\u015F de\u011Feri`, 1], [`fish_zargana_value`, `Zargana sat\u0131\u015F de\u011Feri`, 1]] }, { title: `Demirci Haso \xB7 E\u015Fsiz D\xF6n\xFC\u015F\xFCm`, fields: [[`blacksmith_dust_cost`, `Ta\u015F Tozu maliyeti`, 1], [`blacksmith_pearl_cost`, `\u0130nci maliyeti`, 1], [`blacksmith_gem_cost`, `M\xFCcevher maliyeti`, 100], [`unique_weapon_power`, `E\u015Fsiz silah g\xFCc\xFC`, 1], [`unique_armor_power`, `E\u015Fsiz z\u0131rh g\xFCc\xFC`, 1]] }, { title: `Lonca kurulu\u015Fu`, fields: [[`guild_create_level`, `Kurulu\u015F seviyesi`, 1], [`guild_create_gems`, `Kurulu\u015F m\xFCcevher bedeli`, 10]] }, { title: `Demirci Haso \xB7 Ta\u015F Sanat\u0131`, fields: [[`stone_art_dust_cost`, `Her ta\u015F i\xE7in Ta\u015F Tozu`, 1], [`stone_art_book_cost`, `Her ta\u015F i\xE7in Ta\u015F Sanat\u0131 Kitab\u0131`, 1], [`stone_art_gem_cost`, `Her ta\u015F i\xE7in M\xFCcevher`, 10]] }, { title: `Silah Evrimi \xB7 1. A\u015Fama`, fields: [[`evolution_1_kills`, `Toplam canavar \xF6ld\xFCrme`, 1], [`evolution_1_gems`, `M\xFCcevher bedeli`, 1], [`evolution_1_scrolls`, `Evrim Par\u015F\xF6meni bedeli`, 1], [`evolution_1_attack`, `Ek sald\u0131r\u0131`, 1], [`evolution_1_critical`, `Ek kritik (%)`, 1], [`evolution_1_players`, `Oyunculara kar\u015F\u0131 g\xFC\xE7l\xFC (%)`, 1]] }, { title: `Silah Evrimi \xB7 2. A\u015Fama`, fields: [[`evolution_2_kills`, `Toplam canavar \xF6ld\xFCrme`, 1], [`evolution_2_gems`, `M\xFCcevher bedeli`, 1], [`evolution_2_scrolls`, `Evrim Par\u015F\xF6meni bedeli`, 1], [`evolution_2_attack`, `Ek sald\u0131r\u0131`, 1], [`evolution_2_critical`, `Ek kritik (%)`, 1], [`evolution_2_players`, `Oyunculara kar\u015F\u0131 g\xFC\xE7l\xFC (%)`, 1]] }, { title: `Silah Evrimi \xB7 3. A\u015Fama`, fields: [[`evolution_3_kills`, `Toplam canavar \xF6ld\xFCrme`, 1], [`evolution_3_gems`, `M\xFCcevher bedeli`, 1], [`evolution_3_scrolls`, `Evrim Par\u015F\xF6meni bedeli`, 1], [`evolution_3_attack`, `Ek sald\u0131r\u0131`, 1], [`evolution_3_critical`, `Ek kritik (%)`, 1], [`evolution_3_players`, `Oyunculara kar\u015F\u0131 g\xFC\xE7l\xFC (%)`, 1]] }, { title: `Bosslar \xB7 Ta\u015F Sanat\u0131 Kitab\u0131`, fields: [[`world_boss_stone_book_chance`, `D\xFCnya Bossu d\xFC\u015Fme \u015Fans\u0131 (%)`, 0.1], [`world_boss_stone_book_min`, `D\xFCnya Bossu en az kitap`, 1], [`world_boss_stone_book_max`, `D\xFCnya Bossu en \xE7ok kitap`, 1], [`frozen_boss_stone_book_chance`, `Ayaz Taht\u0131 d\xFC\u015Fme \u015Fans\u0131 (%)`, 0.1], [`frozen_boss_stone_book_min`, `Ayaz Taht\u0131 en az kitap`, 1], [`frozen_boss_stone_book_max`, `Ayaz Taht\u0131 en \xE7ok kitap`, 1], [`frozen_water_stone_book_chance`, `Buzg\xF6l\xFC Semenderi d\xFC\u015Fme \u015Fans\u0131 (%)`, 0.1], [`frozen_water_stone_book_min`, `Semender en az kitap`, 1], [`frozen_water_stone_book_max`, `Semender en \xE7ok kitap`, 1]] }, { title: `Bosslar \xB7 Evrim Par\u015F\xF6meni`, fields: [[`world_boss_evolution_scroll_chance`, `D\xFCnya Bossu d\xFC\u015Fme \u015Fans\u0131 (%)`, 0.1], [`world_boss_evolution_scroll_min`, `D\xFCnya Bossu en az par\u015F\xF6men`, 1], [`world_boss_evolution_scroll_max`, `D\xFCnya Bossu en \xE7ok par\u015F\xF6men`, 1], [`frozen_boss_evolution_scroll_chance`, `Ayaz Taht\u0131 d\xFC\u015Fme \u015Fans\u0131 (%)`, 0.1], [`frozen_boss_evolution_scroll_min`, `Ayaz Taht\u0131 en az par\u015F\xF6men`, 1], [`frozen_boss_evolution_scroll_max`, `Ayaz Taht\u0131 en \xE7ok par\u015F\xF6men`, 1], [`frozen_water_evolution_scroll_chance`, `Buzg\xF6l\xFC Semenderi d\xFC\u015Fme \u015Fans\u0131 (%)`, 0.1], [`frozen_water_evolution_scroll_min`, `Semender en az par\u015F\xF6men`, 1], [`frozen_water_evolution_scroll_max`, `Semender en \xE7ok par\u015F\xF6men`, 1]] }, { title: `Kanallar`, fields: [[`channel_capacity`, `Kanal ba\u015F\u0131na oyuncu s\u0131n\u0131r\u0131 (en fazla 30)`, 1]] }, { title: `Sinsi Ta\u015F Vadisi`, fields: [[`sinsi_stone_unlock_level`, `Harita a\xE7\u0131lma seviyesi`, 1], [`sinsi_stone_hp`, `Ta\u015F can\u0131`, 100], [`sinsi_stone_respawn_seconds`, `Ta\u015F yeniden do\u011Fma s\xFCresi (sn)`, 10], [`sinsi_stone_wave_count`, `Her a\u015Famada \xE7\u0131kan canavar`, 1], [`sinsi_stone_summon_hp`, `\xC7\u0131kan canavar can\u0131`, 10], [`sinsi_stone_summon_damage_scale`, `\xC7\u0131kan canavar hasar \xE7arpan\u0131`, 0.05]] }, { title: `Donmu\u015F \xC7am Ge\xE7idi`, fields: [[`frozen_zone_enabled`, `Harita a\xE7\u0131k (1) / kapal\u0131 (0)`, 1], [`frozen_boss_enabled`, `Merkez bossu a\xE7\u0131k (1) / kapal\u0131 (0)`, 1], [`frozen_boss_hp`, `Merkez bossu can\u0131`, 100], [`frozen_boss_damage_scale`, `Merkez bossu hasar \xE7arpan\u0131`, 0.05], [`frozen_boss_respawn_seconds`, `Merkez bossu yeniden do\u011Fma s\xFCresi (sn)`, 60], [`frozen_boss_xp_reward`, `Merkez bossu TP \xF6d\xFCl\xFC`, 1], [`frozen_boss_reward_gems`, `Merkez bossu m\xFCcevher \xF6d\xFCl\xFC`, 1], [`frozen_water_enabled`, `Buzg\xF6l\xFC Semenderi a\xE7\u0131k (1) / kapal\u0131 (0)`, 1], [`frozen_water_hp`, `Buzg\xF6l\xFC Semenderi can\u0131`, 100], [`frozen_water_damage_scale`, `Buzg\xF6l\xFC Semenderi hasar \xE7arpan\u0131`, 0.05], [`frozen_water_respawn_seconds`, `Buzg\xF6l\xFC Semenderi yeniden do\u011Fma s\xFCresi (sn)`, 60], [`frozen_water_xp_reward`, `Buzg\xF6l\xFC Semenderi TP \xF6d\xFCl\xFC`, 1], [`frozen_water_reward_gems`, `Buzg\xF6l\xFC Semenderi m\xFCcevher \xF6d\xFCl\xFC`, 1]] }, { title: `Efsun \u015Eanslar\u0131`, fields: [[`enchant_item_chance`, `E\u015Fyan\u0131n efsunlu gelme \u015Fans\u0131 (%)`, 0.1], [`enchant_one_chance`, `1 efsun a\u011F\u0131rl\u0131\u011F\u0131 (%)`, 0.1], [`enchant_two_chance`, `2 efsun a\u011F\u0131rl\u0131\u011F\u0131 (%)`, 0.1], [`enchant_three_chance`, `3 efsun a\u011F\u0131rl\u0131\u011F\u0131 (%)`, 0.1], [`enchant_four_chance`, `4 efsun a\u011F\u0131rl\u0131\u011F\u0131 (%)`, 0.1], [`enchant_forest_power_weight`, "Kuzey Orman\u0131 g\xFCc\xFC a\u011F\u0131rl\u0131\u011F\u0131 (silah, z\u0131rh, kolye)", 0.1], [`enchant_frozen_power_weight`, "Donmu\u015F \xC7am g\xFCc\xFC a\u011F\u0131rl\u0131\u011F\u0131 (silah, z\u0131rh, kolye)", 0.1], [`enchant_fire_weight`, `Ate\u015F se\xE7ilme a\u011F\u0131rl\u0131\u011F\u0131 (yaln\u0131z silah)`, 0.1], [`enchant_ice_weight`, `Buz se\xE7ilme a\u011F\u0131rl\u0131\u011F\u0131 (yaln\u0131z silah)`, 0.1], [`enchant_attack_speed_weight`, `Sald\u0131r\u0131 h\u0131z\u0131 a\u011F\u0131rl\u0131\u011F\u0131 (yaln\u0131z silah)`, 0.1], ["enchant_cast_speed_weight", "B\xFCy\xFC H\u0131z\u0131 a\u011F\u0131rl\u0131\u011F\u0131 (silah, z\u0131rh, kolye)", 0.1], [`enchant_life_steal_weight`, `Can \xE7alma a\u011F\u0131rl\u0131\u011F\u0131 (silah ve z\u0131rh)`, 0.1], [`enchant_attack_block_weight`, `Sald\u0131r\u0131 bloklama a\u011F\u0131rl\u0131\u011F\u0131 (savunma e\u015Fyalar\u0131)`, 0.1], [`enchant_sword_defense_weight`, `K\u0131l\u0131\xE7 savunmas\u0131 a\u011F\u0131rl\u0131\u011F\u0131 (savunma e\u015Fyalar\u0131)`, 0.1], [`enchant_arrow_defense_weight`, `Ok savunmas\u0131 a\u011F\u0131rl\u0131\u011F\u0131 (savunma e\u015Fyalar\u0131)`, 0.1], [`enchant_magic_defense_weight`, `B\xFCy\xFC savunmas\u0131 a\u011F\u0131rl\u0131\u011F\u0131 (savunma e\u015Fyalar\u0131)`, 0.1], [`enchant_strong_players_weight`, `Oyunculara kar\u015F\u0131 g\xFC\xE7 a\u011F\u0131rl\u0131\u011F\u0131`, 0.1], [`enchant_resistant_players_weight`, `Oyunculara kar\u015F\u0131 savunma a\u011F\u0131rl\u0131\u011F\u0131 (savunma e\u015Fyalar\u0131)`, 0.1], [`enchant_critical_weight`, `Kritik \u015Fans\u0131 efsunu a\u011F\u0131rl\u0131\u011F\u0131`, 0.1], [`enchant_hp_weight`, `Azami can efsunu a\u011F\u0131rl\u0131\u011F\u0131`, 0.1]] }, ...Re.map(([e2, t2, , n2]) => ({ title: `${t2} \xB7 D\xF6rt Kademe \xB7 4. de\u011Fer azami${e2 === `hp` ? ` (+Can)` : ` (%)`}`, fields: Be(e2).map((e3, t3) => [e3, `${t3 + 1}. kademe (1\u2013${n2})`, 1]) })), { title: `Element ve Sava\u015F Meydan\u0131`, fields: [[`elemental_tick_count`, `Ate\u015F/buz efekt vuru\u015F say\u0131s\u0131`, 1], [`elemental_tick_interval_ms`, `Efekt vuru\u015F aral\u0131\u011F\u0131 (ms)`, 20], [`pvp_kill_reward_gems`, `Oyuncu \xF6ld\xFCrme \xF6d\xFCl\xFC`, 1], [`pvp_death_loss_gems`, `\xD6l\xFCmde kaybedilen m\xFCcevher`, 1], [`pvp_respawn_seconds`, `PvP yeniden do\u011Fma s\xFCresi (sn)`, 1]] }, { title: `Arena Zafer \xD6d\xFClleri`, fields: [[`arena_1v1_reward_gems`, `1'e 1 \xB7 kazanan oyuncuya`, 1], [`arena_2v2_reward_gems`, `2\u2019ye 2 \xB7 kazanan her oyuncuya`, 1], [`arena_3v3_reward_gems`, `3'e 3 \xB7 kazanan her oyuncuya`, 1], [`arena_5v5_reward_gems`, `5'e 5 \xB7 kazanan her oyuncuya`, 1]] }, { "title": "Kara B\xF6lge \xB7 Kara Ta\u015F Muhaf\u0131z\u0131", "fields": [["black_stone_boss_enabled", "Boss a\xE7\u0131k (1) / kapal\u0131 (0)", 1], ["black_stone_boss_hp", "Boss can\u0131", 100], ["black_stone_boss_damage_scale", "Sald\u0131r\u0131 hasar\u0131 (savunma \xF6ncesi)", 1], ["black_stone_boss_respawn_seconds", "Yeniden do\u011Fma (saniye)", 60], ["black_stone_boss_xp_reward", "TP \xF6d\xFCl\xFC", 1], ["black_stone_boss_reward_gems", "M\xFCcevher \xF6d\xFCl\xFC", 1]] }], Bt = [{ id: "loadlab477", label: "Bot Testi", note: "Ayr\u0131 VDS \xB7 75 oyuncu", icon: X.createElement("span", { "aria-hidden": true }, "\u25C9") }, { id: "status", label: "Stat\xFC", note: `Kademeler, giri\u015F ve boss ganimeti`, icon: (0, Z.jsx)(de, {}) }, { id: "arenaMarket", label: "Arena Market", note: `Kademeler, giri\u015F ve boss ganimeti`, icon: (0, Z.jsx)(de, {}) }, { id: "runes", label: "R\xFCn", note: `Kademeler, giri\u015F ve boss ganimeti`, icon: (0, Z.jsx)(de, {}) }, { id: `solo`, label: `Solo Zindan`, note: `Kademeler, giri\u015F ve boss ganimeti`, icon: (0, Z.jsx)(de, {}) }, { id: `materials`, label: `Art\u0131 Basma Malzemeleri`, note: `B\xF6lge, oran ve adetler`, icon: (0, Z.jsx)(y, {}) }, { id: `updates`, label: `G\xFCncellemeler`, note: `GM \xF6nizlemesi ve yay\u0131na a\xE7ma`, icon: (0, Z.jsx)(ot, {}) }, { id: `market`, label: `Nesne Market`, note: `Fiyatlar ve indirimler`, icon: (0, Z.jsx)(p, {}) }, { id: "wheel483", label: "\xC7ark", note: "\xD6d\xFCl \xE7\u0131kma oranlar\u0131", icon: (0, Z.jsx)(p, {}) }, { id: "runes_v2", label: "Karanl\u0131k R\xFCn Sahili", note: "Karanl\u0131k sahil ve boss", icon: (0, Z.jsx)(p, {}) }, { id: "sis_mist", label: "Sis Yar\u0131\u011F\u0131", note: "Portallar, d\xFC\u015Fmanlar ve \xF6d\xFCller", icon: (0, Z.jsx)(p, {}) }, { id: "kadim_tower", label: "Kadim Kulesi", note: "10 kat, d\xFC\u015Fmanlar ve ganimetler", icon: (0, Z.jsx)(p, {}) }, { id:"mount_r55",label:"Binek",note:"Malzeme haritaları ve düşme oranları",icon:(0,Z.jsx)(p,{}) }, { id: `overview`, label: `Genel Bak\u0131\u015F`, note: `Canl\u0131 durum`, icon: (0, Z.jsx)(lt, {}) }, { id: `community`, label: `Ortak Etkinlik`, note: `Hedefler ve kademe \xF6d\xFClleri`, icon: (0, Z.jsx)(o, {}) }, { id: `events`, label: `Etkinlikler`, note: `Bonuslar ve kristal sand\u0131\u011F\u0131`, icon: (0, Z.jsx)(y, {}) }, { id: `world`, label: `D\xFCnya`, note: `D\xF6ng\xFC ve yarat\u0131klar`, icon: (0, Z.jsx)(ot, {}) }, { id: "launch", label: "Oyun Durumu", note: "\xD6n kay\u0131t, a\xE7\u0131k ve bak\u0131m", icon: (0, Z.jsx)(ot, {}) }, { id: "afk_suspects", label: "ŞÜPHELİLER", note: "Doğrulama ve kasma kayıtları", icon: (0, Z.jsx)(ft, {}) }, { id: `players`, label: `Oyuncular`, note: `Hesap ve e\u015Fya`, icon: (0, Z.jsx)(o, {}) }, { id: `registrations`, label: `Kay\u0131t Listesi`, note: `\xDCyeler ve erken eri\u015Fim`, icon: (0, Z.jsx)(Pe, {}) }, { id: `gm`, label: `GM ve Duyurular`, note: `G\xF6revliler ve mesajlar`, icon: (0, Z.jsx)(E, {}) }, { id: "specialistSkills459", label: "Uzmanl\u0131k Becerileri", note: "Alt\u0131 becerinin g\xFCc\xFC ve s\xFCreleri", icon: (0, Z.jsx)(de, {}) }, { id: "brokenCore464", label: "K\u0131r\u0131k Ya\u015Fam \xC7ekirde\u011Fi", note: "Bulmaca, s\u0131kl\u0131k ve \xF6d\xFCller", icon: (0, Z.jsx)(de, {}) }, { id: `combat`, label: `Sava\u015F`, note: `Hasar ve beceri`, icon: (0, Z.jsx)(de, {}) }, { id: `loot`, label: `E\u015Fya ve D\xFC\u015F\xFC\u015F`, note: `Ganimet ve g\xFC\xE7`, icon: (0, Z.jsx)(y, {}) }, { id: `economy`, label: `Ekonomi`, note: `Bal\u0131k\xE7\u0131l\u0131k ve Haso`, icon: (0, Z.jsx)(v, {}) }, { id: `epins`, label: `E-PIN`, note: `Destek kodlar\u0131`, icon: (0, Z.jsx)(Ae, {}) }, { id: `support`, label: `Destek`, note: `Oyuncu talepleri`, icon: (0, Z.jsx)(s, {}) }, { id: `security`, label: `G\xFCvenlik`, note: `Hile olaylar\u0131`, icon: (0, Z.jsx)(ft, {}) }, { id: "battle_pass", label: "Sava\u015F Bileti", note: `Kademeler, giri\u015F ve boss ganimeti`, icon: (0, Z.jsx)(de, {}) }, { id: "quests438", label: "G\xF6revler", note: `Kademeler, giri\u015F ve boss ganimeti`, icon: (0, Z.jsx)(de, {}) }, { id: "enhancement491", label: "Art\u0131 Basma", note: "Ba\u015Far\u0131 oranlar\u0131, malzemeler ve Kor M\xFChr\xFC", icon: X.createElement("span", { "aria-hidden": true, style: { fontWeight: 800, color: "#cfad6b" } }, "+5") }, { id: "cauldron488", label: "Cad\u0131n\u0131n Kazan\u0131", note: "Cad\u0131lar Bayram\u0131 \xB7 tarifler ve \xF6d\xFCller", icon: X.createElement("img", { src: "/assets/cauldron488-icon.webp", alt: "", width: 28, height: 28 }) }, { id: "eventIsland", label: "Etkinlik Adas\u0131", note: "Boss plan\u0131, ada ve GM duyurusu", icon: (0, Z.jsx)(de, {}) }, { id: "stone_boss", label: "Kara Ta\u015F Muhaf\u0131z\u0131", note: "Kara B\xF6lge bossu, g\xFC\xE7 ve ganimet", icon: (0, Z.jsx)(ot, {}) }];
const colAdminOriginalTabsR66=Bt;Bt=[...Bt,{id:'enchants_r66',label:'Efsunlar',note:'Efsun şansları ve kademe değerleri',icon:X.createElement('span',null,'✦')},{id:'castle_r66',label:'Kale Savaşı',note:'Savaş saati, test modu ve sandık ödülleri',icon:X.createElement('span',null,'♜')}];
function Vt(e2) {
  if (e2 === "Kara B\xF6lge \xB7 Kara Ta\u015F Muhaf\u0131z\u0131") return "stone_boss";
  return [`D\xFCnya Dengesi`, `Oyuncu Can\u0131`, `D\xFCnya Bossu`, `D\xFCnya Muhaf\u0131zlar\u0131`, `Kanallar`, `Sinsi Ta\u015F Vadisi`, `Donmu\u015F \xC7am Ge\xE7idi`].includes(e2) ? `world` : [`Kadim K\xF6k Vadisi \xB7 Tecr\xFCbe ve Yeniden Do\u011Fma`, `Canavar Deneyim \xD6d\xFClleri`, `Seviye, Temel Sald\u0131r\u0131 ve Yetenek Dengesi`, `S\u0131n\u0131f ve Ba\u015Flang\u0131\xE7 G\xFCc\xFC`, `Kritik ve Kanat`, `Element ve Sava\u015F Meydan\u0131`, `Arena Zafer \xD6d\xFClleri`].includes(e2) ? `combat` : [`Ekonomi`, `Bal\u0131k\xE7\u0131l\u0131k`, `Demirci Haso \xB7 E\u015Fsiz D\xF6n\xFC\u015F\xFCm`].includes(e2) ? `economy` : `loot`;
}
var Ht = [[`hp`, `Can`, 1], [`level`, `Seviye`, 1], [`gems`, `M\xFCcevher`, 10], [`essence`, `Ya\u015Fam \xD6z\xFC`, 10], [`contribution`, `Katk\u0131`, 10], [`potions`, `\u0130ksir`, 1], [`pearls`, `\u0130nci`, 1], [`stoneDust`, `Metin Tozu`, 1], [`fishSokan`, `Sokan`, 1], [`fishLevrek`, `Levrek`, 1], [`fishZargana`, `Zargana`, 1], [`skillOne`, `Temel Sald\u0131r\u0131`, 1], [`skillTwo`, `2. Yetenek`, 1], [`skillThree`, `3. Yetenek`, 1]], Ut = [[``, `Efsun yok`], [`forest_power`, `Kuzey Orman\u0131 G\xFCc\xFC`], [`frozen_power`, `Donmu\u015F \xC7am G\xFCc\xFC`], [`fire`, `Ate\u015F g\xFCc\xFC`], [`ice`, `Buz g\xFCc\xFC`], [`sword_defense`, `K\u0131l\u0131\xE7 savunmas\u0131`], [`arrow_defense`, `Ok savunmas\u0131`], [`magic_defense`, `B\xFCy\xFC savunmas\u0131`], [`strong_players`, `Oyunculara kar\u015F\u0131 g\xFC\xE7`], [`resistant_players`, `Oyunculara kar\u015F\u0131 savunma`], [`critical`, `Kritik \u015Fans\u0131`], [`attack_speed`, `Sald\u0131r\u0131 h\u0131z\u0131`], ["cast_speed", "B\xFCy\xFC H\u0131z\u0131"], [`life_steal`, `Can \xE7alma`], [`attack_block`, `Sald\u0131r\u0131 bloklama`], [`hp`, `Azami can`]], Wt = /* @__PURE__ */ new Set([`sword_defense`, `arrow_defense`, `magic_defense`, `resistant_players`, `attack_block`, `hp`]), Gt = (e2, t2) => e2 ? ["forest_power", "frozen_power", "cast_speed"].includes(e2) ? ["weapon", "armor", "necklace"].includes(t2) : e2 === `attack_block` ? t2 === `armor` || t2 === `helmet` : t2 === `weapon` ? !Wt.has(e2) : t2 === `armor` || t2 === `helmet` ? e2 !== `fire` && e2 !== `ice` && e2 !== `attack_speed` : e2 !== `fire` && e2 !== `ice` && e2 !== `attack_speed` && e2 !== `life_steal` : true, Kt = new Set(`ancient_normal_purple_chance.ancient_boss_purple_chance.world_boss_purple_chance.regular_item_drop_chance.regular_armor_chance.regular_blue_chance.regular_orange_chance.regular_red_chance.boss_armor_chance.boss_blue_chance.boss_orange_chance.boss_red_chance.base_critical_chance.third_skill_critical_bonus.wing_critical_chance.sinsi_stone_armor_chance.sinsi_stone_blue_chance.sinsi_stone_orange_chance.sinsi_stone_red_chance.frozen_boss_item_drop_chance.frozen_water_item_drop_chance.world_boss_stone_book_chance.frozen_boss_stone_book_chance.frozen_water_stone_book_chance.world_boss_evolution_scroll_chance.frozen_boss_evolution_scroll_chance.frozen_water_evolution_scroll_chance.fishing_pearl_chance.fishing_talisman_chance.enchant_item_chance.enchant_one_chance.enchant_two_chance.enchant_three_chance.enchant_four_chance`.split(`.`)), qt = /* @__PURE__ */ new Set([`frozen_zone_enabled`, `frozen_boss_enabled`, `frozen_water_enabled`, `ancient_boss_enabled`]);
function Jt(e2) {
  return Object.fromEntries(Object.entries(e2).map(([e3, t2]) => [e3, Kt.has(e3) ? Number((t2 * 100).toFixed(3)) : t2]));
}
function Yt(e2) {
  return Object.fromEntries(Object.entries(e2).map(([e3, t2]) => [e3, Kt.has(e3) ? t2 / 100 : t2]));
}
var Xt = { ancient: `Kadim K\xF6k Vadisi`, black: `Kara B\xF6lge`, forest: `Kuzey Orman\u0131`, frozen: `Donmu\u015F \xC7am Ge\xE7idi`, sinsi: `Sinsi Ta\u015F Vadisi`, boss: `Bosslar` }, Zt = (e2) => JSON.parse(JSON.stringify(e2)), Qt = (e2) => e2.split(`.`, 1)[0] || `forest`, $ = (e2) => Number((Math.max(0, e2) / 1e4).toFixed(4)), $t = (e2) => Math.round(Math.max(0, Number.isFinite(e2) ? e2 : 0) * 1e4), en = (e2) => String(e2).replace(`.`, `,`);
function tn({ fieldId: e2, value: t2, disabled: n2, invalid: r2, onCommit: i2, onValidityChange: a2, amount: o2 = false }) {
  let s2 = (0, X.useRef)(null), c2 = (e3) => {
    let t3 = e3.trim().replace(`,`, `.`), n3 = Number(t3);
    return o2 ? /^\d+$/.test(t3) && Number.isSafeInteger(n3) && n3 >= 1 && n3 <= 1e6 ? n3 : null : t3 && Number.isFinite(n3) && n3 >= 0 && n3 <= 100 ? Number(n3.toFixed(4)) : null;
  };
  (0, X.useEffect)(() => {
    let e3 = s2.current;
    e3 && !r2 && document.activeElement !== e3 && (e3.value = en(t2));
  }, [r2, t2]);
  let l2 = (t3) => {
    let n3 = c2(t3.value);
    if (n3 === null) {
      a2(e2, false);
      return;
    }
    t3.value = en(n3), a2(e2, true), i2(n3);
  };
  return (0, Z.jsx)(`input`, { ref: s2, type: `text`, inputMode: o2 ? `numeric` : `decimal`, disabled: n2, "aria-invalid": r2, defaultValue: en(t2), onChange: (t3) => {
    if (/[.,]$/.test(t3.currentTarget.value.trim())) {
      a2(e2, false);
      return;
    }
    let n3 = c2(t3.currentTarget.value);
    a2(e2, n3 !== null), n3 !== null && i2(n3);
  }, onBlur: (e3) => l2(e3.currentTarget), onKeyDown: (e3) => {
    e3.key === `Enter` && e3.currentTarget.blur();
  } });
}
var nn = [{ rarity: `red`, label: `K\u0131rm\u0131z\u0131`, main: `red_all` }, { rarity: `orange`, label: `Turuncu`, main: `orange_main`, accessory: `orange_accessory` }, { rarity: `blue`, label: `Mavi`, main: `blue_main`, accessory: `blue_accessory` }, { rarity: `white`, label: `Beyaz`, main: `white_main`, accessory: `white_accessory` }], rn = (e2) => {
  let t2 = e2.filter((e3) => e3.outcomes.some((e4) => e4.item.type === `gear`));
  return t2.length === 1 && t2[0].outcomes.every((e3) => e3.item.type === `gear`);
};
function an({ email: e2, signOutPath: t2 }) {
 const [colR55AdminFlags,colR55SetFlags]=X.useState({});X.useEffect(()=>{let alive=true;const c=new AbortController(),timer=setTimeout(()=>c.abort(),5000);fetch('/api/core511-r49-options',{cache:'no-store',credentials:'same-origin',signal:c.signal}).then(r=>r.ok?r.json():{}).then(v=>{if(alive)colR55SetFlags(v.gameplayR55??{});}).catch(()=>{}).finally(()=>clearTimeout(timer));return()=>{alive=false;c.abort();clearTimeout(timer);};},[]);
  const [colAdminReadyR66,colSetAdminReadyR66]=X.useState(false);X.useEffect(()=>colSetAdminReadyR66(true),[]);
  let [n2, i2] = (0, X.useState)(`overview`), [a2, s2] = (0, X.useState)(``), [c2, l2] = (0, X.useState)(``), [d2, f2] = (0, X.useState)(null), [m2, h2] = (0, X.useState)({}), [_2, v2] = (0, X.useState)(64), [b2, C2] = (0, X.useState)(`Canl\u0131 oyun verileri y\xFCkleniyor\u2026`), [T2, E2] = (0, X.useState)(true), [D2, O2] = (0, X.useState)(``), [k2, j2] = (0, X.useState)(100), [N2, te2] = (0, X.useState)(100), [P2, ne2] = (0, X.useState)(`Sonteklif Destek Paketi`), [F2, re2] = (0, X.useState)(`core-coins-500-v1`), [ie2, ae2] = (0, X.useState)(25), [oe2, ce2] = (0, X.useState)(0), [I2, L2] = (0, X.useState)([]), [R2, le2] = (0, X.useState)(``), [z2, ue2] = (0, X.useState)(5), [B2, V2] = (0, X.useState)({ hp: 100, level: 1, gems: 0, essence: 0, contribution: 0, potions: 0, pearls: 0, stoneDust: 0, fishSokan: 0, fishLevrek: 0, fishZargana: 0, skillOne: 1, skillTwo: 1, skillThree: 1, hasRod: 0, rodEquipped: 0, hasWings: 0, wingsEquipped: 0 }), [H2, U2] = (0, X.useState)({ kind: `weapon`, itemName: `Y\xF6netici Hediyesi`, rarity: `red`, power: 100, role: `muhafiz`, enchantments: Array.from({ length: 4 }, () => ({ kind: ``, value: 5 })) }), [fe2, pe2] = (0, X.useState)(null), [W2, me2] = (0, X.useState)(0), [he2, _e2] = (0, X.useState)(null), [ve2, ye2] = (0, X.useState)(() => Date.now());
  (0, X.useEffect)(() => {
    let e3 = false, t3 = false, n3 = new AbortController(), r2 = async () => {
      if (!(e3 || t3 || n3 === "loadlab477" || document.visibilityState === `hidden`)) {
        t3 = true;
        try {
          let t4 = await fetch(`/api/admin?live=1`, { cache: `no-store`, signal: n3.signal });
          if (!t4.ok) return;
          let r3 = await t4.json();
          if (e3) return;
          _e2(r3.stats), pe2(new Set((r3.presence ?? []).map((e4) => e4.id))), me2(Date.now()), f2((e4) => e4 && { ...e4, stats: r3.stats, world: r3.world ?? e4.world, boss: r3.boss ?? e4.boss, channels: e4.channels.map((e5) => ({ ...e5, online: r3.channels.find((t5) => t5.channel === e5.id)?.online ?? 0 })) });
        } catch {
        } finally {
          t3 = false;
        }
      }
    };
    r2();
    let i3 = window.setInterval(() => void r2(), 3e3);
    return window.addEventListener(`focus`, r2), document.addEventListener(`visibilitychange`, r2), () => {
      e3 = true, n3.abort(), window.clearInterval(i3), window.removeEventListener(`focus`, r2), document.removeEventListener(`visibilitychange`, r2);
    };
  }, [n2]);
  let [be2, xe2] = (0, X.useState)(() => Date.now()), [Se2, Ce2] = (0, X.useState)(null), we2 = (0, X.useRef)(null), G2 = (0, X.useRef)({}), K2 = (0, X.useRef)(false), Te2 = (0, X.useCallback)((e3, t3) => {
    let n3 = Jt(e3), r2 = we2.current, i3 = new Set(t3.acknowledgedKeys);
    we2.current = n3, Ce2(n3), h2((e4) => {
      let a3 = { ...n3 };
      for (let [o2, s3] of Object.entries(e4)) {
        if (!Object.prototype.hasOwnProperty.call(n3, o2)) {
          a3[o2] = s3;
          continue;
        }
        if ((G2.current[o2] ?? 0) !== (t3.startedVersions[o2] ?? 0)) {
          a3[o2] = s3;
          continue;
        }
        !i3.has(o2) && r2 && Object.prototype.hasOwnProperty.call(r2, o2) && !Object.is(s3, r2[o2]) && (a3[o2] = s3);
      }
      return a3;
    });
  }, []), De2 = (0, X.useCallback)(async () => {
    if (K2.current) return;
    K2.current = true, E2(true);
    let e3 = { ...G2.current };
    try {
      let t3 = await fetch(`/api/admin`, { cache: `no-store` }), n3 = await t3.json();
      if (!t3.ok) throw Error(n3.error ?? `Veriler al\u0131namad\u0131.`);
      xe2(() => Date.now()), f2(n3), Te2(n3.settings, { startedVersions: e3, acknowledgedKeys: [] }), v2(n3.world.health), O2((e4) => e4 || n3.players[0]?.id || ``), le2((e4) => e4 || n3.players[0]?.id || ``), C2(`Canl\u0131 veriler g\xFCncel; kaydedilmemi\u015F alanlar\u0131n korundu.`);
    } finally {
      K2.current = false, E2(false);
    }
  }, [Te2]);
  (0, X.useEffect)(() => {
    let e3 = window.setTimeout(() => void De2().catch((e4) => C2(e4 instanceof Error ? e4.message : `Ba\u011Flant\u0131 hatas\u0131.`)), 0);
    return () => window.clearTimeout(e3);
  }, [De2]), (0, X.useEffect)(() => {
    let e3 = window.setInterval(() => ye2(Date.now()), 1e3);
    return () => window.clearInterval(e3);
  }, []), (0, X.useEffect)(() => {
    let e3 = d2?.players.find((e4) => e4.id === R2);
    if (!e3) return;
    let t3 = window.setTimeout(() => V2({ hp: e3.hp, level: e3.level, gems: e3.gems, essence: e3.essence, contribution: e3.contribution, potions: e3.potions, pearls: e3.pearls, stoneDust: e3.stone_dust, fishSokan: e3.fish_sokan, fishLevrek: e3.fish_levrek, fishZargana: e3.fish_zargana, skillOne: e3.skill_one, skillTwo: e3.skill_two, skillThree: e3.skill_three, hasRod: e3.has_rod, rodEquipped: e3.rod_equipped, hasWings: e3.has_wings, wingsEquipped: e3.wings_equipped }), 0);
    return () => window.clearTimeout(t3);
  }, [R2, d2?.serverTime, d2?.players]);
  let ke2 = (0, X.useRef)(null), q2 = async (e3, t3) => {
    const colSecurityBody508 = e3;
    if (t3 && !window.confirm(t3)) return null;
    if (K2.current) return C2(`Devam eden y\xF6netici i\u015Flemi tamamlan\u0131nca tekrar dene.`), null;
    K2.current = true;
    let n3 = { ...G2.current }, r2 = e3.action === `save_settings` && e3.settings && typeof e3.settings == `object` && !Array.isArray(e3.settings) ? Object.keys(e3.settings) : [];
    E2(true);
    try {
      let t4 = await fetch(e3.action === "grant_enhancement_material_r55" || e3.action.startsWith("mount_drop_") ? "/api/admin?core511=gameplay-r55" : e3.action === "grant_mount_material_r49" ? "/api/admin?core511=mounts" : e3.action === "grant_azrail_chests" ? "/api/admin?core511=azrail-grant" : e3.action.startsWith("sis_mist_") ? "/api/admin?core511=mist" : e3.action === "kadim_tower_get" || e3.action === "kadim_tower_save" ? "/api/admin?core511=tower" : `/api/admin`, { method: `POST`, headers: { "content-type": `application/json` }, body: JSON.stringify(e3) }), i3 = await t4.json();
      if (!t4.ok) {
        if ((colSecurityBody508.action.startsWith("sis_mist_") || (colSecurityBody508.action === "grant_azrail_chests" || colSecurityBody508.action === "grant_mount_material_r49" || colSecurityBody508.action === "grant_enhancement_material_r55" || colSecurityBody508.action.startsWith("mount_drop_")))) throw Object.assign(Error(i3.errors?.length ? i3.errors.join(" ") : i3.error ?? "Sis Yar\u0131\u011F\u0131 i\u015Flemi tamamlanamad\u0131."), { status: t4.status, payload: i3 });
        let e4 = i3.errors?.length ? i3.errors.join(` `) : i3.error;
        throw t4.status === 409 ? Error(`${e4 ?? `Bu kay\u0131t ba\u015Fka bir y\xF6netici ekran\u0131nda de\u011Fi\u015Ftirildi.`} Tasla\u011F\u0131n korunuyor; canl\u0131 veriyi yenileyip farklar\u0131 kontrol et.`) : Error(e4 ?? `\u0130\u015Flem ba\u015Far\u0131s\u0131z.`);
      }
      colSecurityNotice508(colSecurityBody508, i3);
      if (i3.adminRefreshRequired508) return i3;
      return xe2(() => Date.now()), f2(i3), Te2(i3.settings, { startedVersions: n3, acknowledgedKeys: r2 }), v2(i3.world.health), C2(`De\u011Fi\u015Fiklik canl\u0131 oyuna uyguland\u0131; di\u011Fer kaydedilmemi\u015F alanlar\u0131n korundu.`), i3;
    } catch (e4) {
      colSecurityNotice508(colSecurityBody508, null, e4);
      if ((colSecurityBody508.action.startsWith("sis_mist_") || (colSecurityBody508.action === "grant_azrail_chests" || colSecurityBody508.action === "grant_mount_material_r49" || colSecurityBody508.action === "grant_enhancement_material_r55" || colSecurityBody508.action.startsWith("mount_drop_")))) {
        C2(e4 instanceof Error ? e4.message : "Sis Yar\u0131\u011F\u0131 i\u015Flemi tamamlanamad\u0131.");
        throw e4;
      }
      return C2(e4 instanceof Error ? e4.message : `\u0130\u015Flem ba\u015Far\u0131s\u0131z.`), null;
    } finally {
      K2.current = false, E2(false);
    }
  }, J2 = async () => {
    let e3 = await q2({ action: `generate_epins`, name: P2, count: ie2, validDays: oe2, productCode: F2 });
    e3?.generatedEpins && (L2(e3.generatedEpins.codes), C2(`${e3.generatedEpins.codes.length} yeni E-PIN \xFCretildi. Kodlar\u0131 \u015Fimdi kopyala veya indir; g\xFCvenlik i\xE7in tekrar g\xF6sterilmez.`));
  }, Me2 = async () => {
    I2.length && (await navigator.clipboard.writeText(I2.join(`
`)), C2(`${I2.length} E-PIN panoya kopyaland\u0131.`));
  }, Ne2 = () => {
    if (!I2.length) return;
    let e3 = new Blob([`${I2.join(`
`)}
`], { type: `text/plain;charset=utf-8` }), t3 = URL.createObjectURL(e3), n3 = document.createElement(`a`);
    n3.href = t3, n3.download = `yasam-cekirdegi-epin-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.txt`, n3.click(), URL.revokeObjectURL(t3), C2(`${I2.length} E-PIN metin dosyas\u0131 olarak indirildi.`);
  }, Y2 = Number(d2?.serverTime ?? 0) + Math.max(0, Math.floor((ve2 - be2) / 1e3)), Fe2 = (e3) => !!(Se2 && !Object.is(m2[e3], Se2[e3])), Ie2 = (e3, t3) => {
    G2.current[e3] = (G2.current[e3] ?? 0) + 1, h2((n3) => ({ ...n3, [e3]: t3 }));
  }, Le2 = (e3, t3 = false) => {
    let n3 = e3.filter(Fe2), r2 = n3.length || !t3 ? n3 : [...e3];
    r2.length && q2({ action: `save_settings`, settingsSchemaVersion: 2, settings: Yt(Object.fromEntries(r2.map((e4) => [e4, m2[e4]]))) });
  };
  return (0, Z.jsxs)(`main`, { className: colAdminReadyR66?'admin-shell admin-r66':'admin-shell', children: [(0, Z.jsxs)(`header`, { className: `admin-header`, children: [(0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`span`, { className: `admin-kicker`, children: `YA\u015EAM \xC7EK\u0130RDE\u011E\u0130` }), (0, Z.jsx)(`h1`, { children: `Oyun Y\xF6netimi` }), (0, Z.jsxs)(`p`, { children: [e2, ` \xB7 Canl\u0131 d\xFCnya kontrol\xFC`] })] }), (0, Z.jsxs)(`nav`, { children: [(0, Z.jsxs)(`button`, { disabled: T2, onClick: () => void De2().catch((e3) => C2(e3 instanceof Error ? e3.message : `Ba\u011Flant\u0131 hatas\u0131.`)), children: [(0, Z.jsx)(je, {}), ` Canl\u0131 veriyi yenile`] }), (0, Z.jsxs)(r, { href: `/`, children: [(0, Z.jsx)(g, {}), ` Oyuna d\xF6n`] }), (0, Z.jsx)(`a`, { href: t2, children: `\xC7\u0131k\u0131\u015F` })] })] }), (0, Z.jsxs)(`div`, { className: `admin-notice`, children: [(0, Z.jsx)(nt, {}), b2] }), (0, Z.jsxs)(`section`, { className: `admin-stats`, children: [(0, Z.jsx)(pn, { icon: (0, Z.jsx)(M, {}), label: `D\xFCnya Sa\u011Fl\u0131\u011F\u0131`, value: `%${d2?.world.health.toFixed(2) ?? `\u2014`}` }), (0, Z.jsx)(pn, { icon: (0, Z.jsx)(o, {}), label: `\xC7evrimi\xE7i / Toplam`, value: `${he2?.onlinePlayers ?? d2?.stats.onlinePlayers ?? 0} / ${he2?.totalPlayers ?? d2?.stats.totalPlayers ?? 0}` }), (0, Z.jsx)(pn, { icon: (0, Z.jsx)(x, {}), label: `A\xE7\u0131k Tezg\xE2h`, value: String(d2?.stats.shops ?? 0) }), (0, Z.jsx)(pn, { icon: (0, Z.jsx)(p, {}), label: `D\xFCnyadaki E\u015Fya`, value: String(d2?.stats.items ?? 0) })] }), (colAdminReadyR66?X.createElement(colAdminNavigatorR66,{rows:Bt.filter(row=>row.id!=="mount_r55"||colR55AdminFlags.mountDrops===true),selected:n2,onSelect:i2}):(0, Z.jsx)(`nav`, { className: `admin-page-nav`, "aria-label": `Y\xF6netim b\xF6l\xFCmleri`, children: colAdminOriginalTabsR66.filter(row=>row.id!=="mount_r55"||colR55AdminFlags.mountDrops===true).map((e3) => (0, Z.jsxs)(`button`, { className: n2 === e3.id ? `active` : ``, "aria-current": n2 === e3.id ? `page` : void 0, onClick: () => i2(e3.id), children: [e3.icon, (0, Z.jsxs)(`span`, { children: [(0, Z.jsx)(`strong`, { children: e3.label }), (0, Z.jsx)(`small`, { children: e3.note })] })] }, e3.id)) })), (0, Z.jsxs)(`div`, { className: `admin-grid admin-page-${n2}`, children: [n2 === "castle_r66" && X.createElement(colCastleAdminR59), n2 === "world" && X.createElement(colMotionAdminR34), n2 === "afk_suspects" && X.createElement(colAfkAdminR32), n2 === "loadlab477" && X.createElement(colLoadLabAdmin477), n2 === `market` && d2 && (0, Z.jsx)(Je, { prices: d2.premiumPrices, busy: T2, act: q2 }), n2 === `events` && d2 && (0, Z.jsx)($e, { raw: String(d2.settings.events_json ?? ``), serverTime: d2.serverTime, busy: T2, act: q2 }), n2 === `community` && (0, Z.jsx)(tt, {}), n2 === "specialistSkills459" && (d2?.specialistSkills459 ? (0, Z.jsx)(colSpecialistAdmin459.Admin, { value: d2.specialistSkills459, expectedEvents: String(d2.settings.events_json ?? ""), busy: T2, act: q2 }) : (0, Z.jsx)("p", { children: "Uzmanl\u0131k ayarlar\u0131 y\xFCklenemedi. Canl\u0131 veriyi yenile." })), n2 === "brokenCore464" && X.createElement(colBrokenCore464Admin.Settings, { value: d2?.brokenCore464, busy: T2, act: q2 }), n2 === `gm` && (0, Z.jsx)(Rt, {}), (n2 === "gm" || n2 === "world") && 0, n2 === "overview" && Z.jsx(colLoadUI430.Panel, {}), n2 === "enhancement491" && X.createElement(colEnhanceAdmin491, { React: X, value: d2?.enhancement491, busy: T2, act: q2 }), n2 === "cauldron488" && X.createElement(colCauldronAdmin488, { React: X, value: d2?.cauldron488, expectedEvents: d2?.settings?.events_json, busy: T2, act: q2 }), n2 === `loot` && (0, Z.jsx)(colBalanceAdmin487, { value: d2?.highLevelBalance487, expectedEvents: d2?.settings?.events_json, busy: T2, act: q2 }), n2 === `loot` && (0, Z.jsx)(Xe, { policy: d2?.forestLootPolicy, busy: T2, act: q2 }), n2 === `updates` && d2?.guildVillage && (0, Z.jsxs)(`section`, { className: `admin-card`, children: [(0, Z.jsx)(`h2`, { children: `Lonca K\xF6y\xFC \xB7 \u015Eatolar` }), (0, Z.jsxs)(`p`, { children: [d2.guildVillage.enabled ? `Oyunculara a\xE7\u0131k.` : `Yaln\u0131z GM \xF6n izlemesine a\xE7\u0131k.`, ` Oyunda I\u015F\u0131nlan \u2192 Lonca K\xF6y\xFC veya Lonca \u2192 \u015Eatom. \u015Eato bedeli: 20 inci, 10.000 m\xFCcevher, 2.000 \xF6z. Kapatt\u0131\u011F\u0131nda oyuncular k\xF6yden g\xFCvenle \xE7\u0131kar\u0131l\u0131r; \u015Fatolar korunur.`] }), (0, Z.jsx)(`button`, { disabled: T2, onClick: () => void q2({ action: `save_guild_village`, guildVillageEnabled: !d2.guildVillage.enabled, guildVillageRevision: d2.guildVillage.revision }), children: d2.guildVillage.enabled ? `Oyunculara kapat` : `Oyunculara a\xE7` })] }), (n2 === `loot` || n2 === `combat`) && d2?.dragon && (0, Z.jsx)(Ue, { value: d2.dragon, busy: T2, act: q2 }), n2 === "stone_boss" && (0, Z.jsx)(colStoneBossStatus476, { data: d2, busy: T2, act: q2 }), (n2 === "loot" || n2 === "stone_boss") && (0, Z.jsx)(fn, { lootEventPercent: ge(se(d2?.settings.events_json), `loot`, d2?.serverTime), records: (d2?.lootProfiles ?? []).filter((colRow476) => n2 === "stone_boss" ? colRow476.sourceKey === "boss.black_stone" : colRow476.sourceKey !== "boss.black_stone"), templates: d2?.lootTemplates ?? [], busy: T2, act: q2 }), n2 === `arenaMarket` && d2?.arenaMarket && (0, Z.jsx)(colArenaUI.Admin, { value: d2.arenaMarket, busy: T2, act: q2 }), n2 === `runes` && d2?.runes && (0, Z.jsx)(colRuneUI.Admin, { value: d2.runes, busy: T2, act: q2 }), n2 === "runes_v2" && d2?.runeV2 && X.createElement(colAdminContent483.RuneV2, { value: d2.runeV2, busy: T2, act: q2 }), n2 === "wheel483" && (d2?.wheel483 ? X.createElement(colAdminContent483.Wheel, { value: d2.wheel483, busy: T2, act: q2 }) : X.createElement("p", null, "\xC7ark ayarlar\u0131 y\xFCklenemedi. Canl\u0131 veriyi yenile.")), n2 === "eventIsland" && d2?.eventIsland && (0, Z.jsx)(colEventAdmin444.Admin, { value: d2.eventIsland, busy: T2, act: q2 }), n2 === "quests438" && d2?.quests438 && (0, Z.jsx)(colQuests438Admin.Admin, { value: d2.quests438, busy: T2, act: q2 }), n2 === "battle_pass" && d2?.battlePass && (0, Z.jsx)(colBattlePassAdmin434.Admin, { value: d2.battlePass, busy: T2, act: q2 }), n2 === "status" && d2?.status && (0, Z.jsx)(colStatusUI429.Admin, { value: d2.status, busy: T2, act: q2 }), (n2 === `solo` || n2 === `materials`) && (d2?.progression ? (0, Z.jsx)(He, { mode: n2, value: d2.progression, busy: T2, act: q2 }) : (0, Z.jsx)(`p`, { children: `Bu b\xF6l\xFCm oyun sunucusu g\xFCncellemesiyle a\xE7\u0131lacak.` })), (n2 === `loot` || n2 === `players`) && d2 && (0, Z.jsx)(kt, { settings: d2.dungeonSettings, busy: T2, act: q2 }), n2 === `combat` && d2 && (0, Z.jsx)(At, { curve: String(d2.settings.xp_curve_json ?? ``), busy: T2, save: async (e3, t3) => !!await q2({ action: `save_level_curve`, costs: e3, expectedCurve: t3 }) }), n2 === `combat` && d2?.ranks && (0, Z.jsx)(We, { value: d2.ranks, busy: T2, save: async (e3, t3) => !!await q2({ action: `save_ranks`, config: e3, revision: t3 }) }), n2 === `updates` && (0, Z.jsx)(Ge, {}), n2 === `combat` && (0, Z.jsx)(dn, { snapshot: d2?.monsterBalance ?? null, busy: T2, act: q2, blackXp: { value: m2.black_monster_xp_reward ?? 0, dirty: !!d2 && !Object.is(m2.black_monster_xp_reward, d2.settings.black_monster_xp_reward), change: (e3) => Ie2(`black_monster_xp_reward`, e3), save: () => Le2([`black_monster_xp_reward`]) } }), n2 === `support` && (0, Z.jsx)(ln, {}), n2 === `economy` && d2 && (0, Z.jsx)(mn, { settings: d2.settings, busy: T2, act: q2 }), n2 === "launch" && d2 && (0, Z.jsx)(St, {}), n2 === `registrations` && (0, Z.jsx)(Ct, {}), n2 === `security` && (0, Z.jsx)(Tt, {}), n2 === `security` && (0, Z.jsxs)(`section`, { className: `admin-card word-filter-card`, children: [(0, Z.jsx)(`h2`, { children: `Yasakl\u0131 Kelimeler` }), (0, Z.jsx)(`p`, { children: `Yerle\u015Fik k\xFCf\xFCr filtresi her zaman a\xE7\u0131k. Ekledi\u011Fin kelimeler yeni d\xFCnya, b\xF6lge ve \xF6zel mesajlarda y\u0131ld\u0131zlan\u0131r. Bu i\u015Flem hesaplara ceza vermez.` }), (0, Z.jsxs)(`form`, { onSubmit: (e3) => {
    e3.preventDefault(), q2({ action: `add_blocked_word`, word: a2 });
  }, children: [(0, Z.jsxs)(`label`, { children: [`Yeni yasakl\u0131 kelime`, (0, Z.jsx)(`input`, { value: a2, maxLength: 40, onChange: (e3) => s2(e3.target.value), placeholder: `Kelime yaz` })] }), (0, Z.jsx)(`button`, { disabled: T2 || a2.trim().length < 2, children: `Ekle` })] }), (0, Z.jsx)(`div`, { className: `blocked-word-list`, children: d2?.blockedWords?.map((e3) => (0, Z.jsxs)(`span`, { children: [e3, (0, Z.jsx)(`button`, { "aria-label": `${e3} kelimesini kald\u0131r`, disabled: T2, onClick: () => void q2({ action: `remove_blocked_word`, word: e3 }), children: `Kald\u0131r` })] }, e3)) }), (0, Z.jsx)(`small`, { className: `admin-live-age`, children: W2 ? (ve2 - W2 > 1e4 ? `Canl\u0131 veri ba\u011Flant\u0131s\u0131 bekleniyor \xB7 ` : `Son g\xFCncelleme \xB7 `) + Math.max(0, Math.floor((ve2 - W2) / 1e3)) + ` sn \xF6nce` : `Canl\u0131 veriler y\xFCkleniyor\u2026` }), !d2?.blockedWords?.length && (0, Z.jsx)(`p`, { children: `Hen\xFCz ek kelime yok. Yerle\u015Fik filtre \xE7al\u0131\u015Fmaya devam eder.` })] }), [`world`, `combat`, `loot`, `economy`, "stone_boss", "enchants_r66"].includes(n2) && (0, Z.jsxs)(`section`, { className: `admin-card settings-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(u, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: n2 === `loot` ? `Eşya Gücü ve Gelişim Ayarları` : `${Bt.find((e3) => e3.id === n2)?.label} Ayarlar\u0131` }), (0, Z.jsx)(`p`, { children: n2 === `loot` ? `Ganimet tabloları ve eşya gücü burada; efsun şansları ve kademeleri Efsunlar bölümünde.` : `Kaydetti\u011Finde haz\u0131rlad\u0131\u011F\u0131n t\xFCm ayarlar g\xFCvenli bi\xE7imde uygulan\u0131r.` })] })] }), (0, Z.jsx)(`div`, { className: `settings-groups`, children: zt.filter((e3) => adminSectionR66(e3,Vt(e3.title)) === n2).map((e3) => {
    let t3 = e3.fields.map(([e4]) => e4), n3 = t3.filter(Fe2).length, r2 = e3.title === `Bosslar \xB7 Ta\u015F Sanat\u0131 Kitab\u0131`;
    return (0, Z.jsxs)(`fieldset`, { children: [(0, Z.jsx)(`legend`, { children: e3.title }), r2 && (0, Z.jsx)(`p`, { className: `settings-group-note`, children: `Kaydetti\u011Finde kitap oran\u0131 ve adetleri ilgili bossun aktif ganimet tablosuna da uygulan\u0131r. %0 d\xFC\u015F\xFC\u015F\xFC kapat\u0131r. Kay\u0131tl\u0131 de\u011Ferleri yeniden uygulamak i\xE7in a\u015Fa\u011F\u0131daki d\xFC\u011Fmeyi kullan.` }), e3.title === `Mor E\u015Fya \xB7 K\xF6k Vadisi ve Bosslar` && (0, Z.jsx)(`p`, { className: `settings-group-note`, children: `K\xF6k Vadisi\u2019nin \xFC\xE7 normal canavar\u0131nda ayr\u0131 mor \u015Fans\u0131 kesim ba\u015F\u0131nad\u0131r; ba\u015Far\u0131da en fazla bir ekipman \xE7\u0131kar. Bosslarda ba\u015Far\u0131 bir garanti ekipman\u0131 mora \xE7evirir. Her sonu\xE7 be\u015F t\xFCrden e\u015Fit olas\u0131l\u0131kla se\xE7ilir. Varsay\u0131lan: normal %0,1, Kadim %0,1, D\xFCnya %0,05. %0 mor d\xFC\u015F\xFC\u015F\xFC kapat\u0131r.` }), e3.title === `E\u015Fya Sat\u0131\u015F De\u011Feri` && (0, Z.jsx)(`p`, { className: `settings-group-note`, children: `Bu fiyatlar silah, z\u0131rh, ayakkab\u0131 ve kolyede nadirli\u011Fe g\xF6re ayn\u0131d\u0131r. Yaln\u0131z de\u011Fi\u015Ftirdi\u011Fin fiyatlar kaydedilir; ba\u015Fka bir kart veya eski ekran bunlar\u0131 geri yazamaz.` }), e3.fields.map(([e4, t4, n4]) => (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: t4 }), (0, Z.jsx)(`input`, { type: `number`, step: n4, ...e4 === `channel_capacity` ? { min: 1, max: 30 } : Kt.has(e4) ? { min: 0, max: 100 } : qt.has(e4) ? { min: 0, max: 1 } : {}, value: e4 === "black_stone_boss_damage_scale" ? Math.round(Number(colAffixAdminFieldValue454(m2, e4) ?? 0) * 48) : colAffixAdminFieldValue454(m2, e4), onChange: (t5) => Ie2(e4, e4 === "black_stone_boss_damage_scale" ? Number(t5.target.value) / 48 : Number(t5.target.value)), ...colBossBounds494(e4) })] }, e4)), (0, Z.jsxs)(`button`, { type: `button`, className: `settings-group-save`, disabled: T2 || !d2 || n3 < 1 && !r2, onClick: () => Le2(t3, r2), children: [(0, Z.jsx)(Q, {}), ` `, n3 > 0 ? `${n3} De\u011Fi\u015Fikli\u011Fi Kaydet` : r2 ? `Kitap ayarlar\u0131n\u0131 uygula` : `De\u011Fi\u015Fiklik Yok`] })] }, e3.title);
  }) })] }), (0, Z.jsxs)(`aside`, { className: `admin-side`, children: [n2 === "mount_r55" && colR55AdminFlags.mountDrops === true && X.createElement(colMountDropsR55,{act:q2,busy:T2}), n2 === "sis_mist" && X.createElement(tower511Admin.MistAdmin, { act: q2, busy: T2 }), n2 === "kadim_tower" && X.createElement(tower511Admin.Admin, { act: q2, busy: T2 }), n2 === `overview` && (0, Z.jsxs)(`section`, { className: `admin-card admin-overview-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(lt, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Kontrol Merkezi` }), (0, Z.jsx)(`p`, { children: `Canl\u0131 durum yukar\u0131da. Bir b\xF6l\xFCme ge\xE7erek yaln\u0131z ilgili ara\xE7lar\u0131 g\xF6r.` })] })] }), (colAdminReadyR66?null:(0, Z.jsx)(`div`, { className: `overview-links`, children: colAdminOriginalTabsR66.filter((e3) => e3.id !== `overview`).map((e3) => (0, Z.jsxs)(`button`, { onClick: () => i2(e3.id), children: [e3.icon, (0, Z.jsxs)(`span`, { children: [(0, Z.jsx)(`strong`, { children: e3.label }), (0, Z.jsx)(`small`, { children: e3.note })] })] }, e3.id)) }))] }), n2 === `epins` && (0, Z.jsx)(Z.Fragment, { children: (0, Z.jsxs)(`section`, { className: `admin-card epin-admin-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(Ae, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `E-PIN Y\xF6netimi` }), (0, Z.jsx)(`p`, { children: `200 / 500 / 1000 \xC7P veya destek paketi i\xE7in tek kullan\u0131ml\u0131k kod \xFCret.` })] })] }), (0, Z.jsxs)(`div`, { className: `epin-summary`, children: [(0, Z.jsxs)(`span`, { children: [(0, Z.jsx)(`small`, { children: `Aktif` }), (0, Z.jsx)(`strong`, { children: d2?.epins.active ?? 0 })] }), (0, Z.jsxs)(`span`, { children: [(0, Z.jsx)(`small`, { children: `Kullan\u0131lm\u0131\u015F` }), (0, Z.jsx)(`strong`, { children: d2?.epins.redeemed ?? 0 })] }), (0, Z.jsxs)(`span`, { children: [(0, Z.jsx)(`small`, { children: `\u0130ptal` }), (0, Z.jsx)(`strong`, { children: d2?.epins.revoked ?? 0 })] })] }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `Kod \xFCr\xFCn\xFC` }), (0, Z.jsxs)(`select`, { value: F2, onChange: (e3) => re2(e3.target.value), children: [(0, Z.jsxs)(`option`, { value: `core-coins-200-v1`, children: [`200 \xC7ekirdek Paras\u0131 \xB7 `, Ee(d2?.premiumPrices, `coins_200`).amount, ` TL`] }), (0, Z.jsxs)(`option`, { value: `core-coins-500-v1`, children: [`500 \xC7ekirdek Paras\u0131 \xB7 `, Ee(d2?.premiumPrices, `coins_500`).amount, ` TL`] }), (0, Z.jsxs)(`option`, { value: `core-coins-1000-v1`, children: [`1000 \xC7ekirdek Paras\u0131 \xB7 `, Ee(d2?.premiumPrices, `coins_1000`).amount, ` TL`] }), (0, Z.jsxs)(`option`, { value: `core-coins-3000-v1`, children: [`3000 \xC7ekirdek Paras\u0131 \xB7 `, Ee(d2?.premiumPrices, `coins_3000`).amount, ` TL`] }), (0, Z.jsxs)(`option`, { value: `destek-paketi-100-v1`, children: [`Destek Paketi \xB7 Y\xFCz\xFCk/t\u0131ls\u0131m 5 g\xFCn, kanat 14 g\xFCn \xB7 `, Ee(d2?.premiumPrices, `support`).amount, ` TL`] })] })] }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `Grup ad\u0131` }), (0, Z.jsx)(`input`, { value: P2, maxLength: 80, onChange: (e3) => ne2(e3.target.value) })] }), (0, Z.jsxs)(`div`, { className: `epin-generator-fields`, children: [(0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `Kod adedi` }), (0, Z.jsx)(`input`, { type: `number`, min: `1`, max: `100`, step: `1`, value: ie2, onChange: (e3) => ae2(Number(e3.target.value)) })] }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `Ge\xE7erlilik g\xFCn\xFC \xB7 0 s\xFCresiz` }), (0, Z.jsx)(`input`, { type: `number`, min: `0`, max: `3650`, step: `1`, value: oe2, onChange: (e3) => ce2(Number(e3.target.value)) })] })] }), (0, Z.jsxs)(`button`, { className: `admin-primary`, disabled: T2 || ie2 < 1 || ie2 > 100, onClick: () => void J2(), children: [(0, Z.jsx)(Ae, {}), ` E-PIN \xDCret`] }), I2.length > 0 && (0, Z.jsxs)(`div`, { className: `generated-epins`, children: [(0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`strong`, { children: `Yeni kodlar \xB7 yaln\u0131zca \u015Fimdi g\xF6sterilir` }), (0, Z.jsxs)(`span`, { children: [(0, Z.jsxs)(`button`, { onClick: () => void Me2(), children: [(0, Z.jsx)(it, {}), ` Kopyala`] }), (0, Z.jsxs)(`button`, { onClick: Ne2, children: [(0, Z.jsx)(at, {}), ` \u0130ndir`] })] })] }), (0, Z.jsx)(`textarea`, { readOnly: true, value: I2.join(`
`), "aria-label": `Yeni \xFCretilen E-PIN kodlar\u0131` })] }), (0, Z.jsxs)(`div`, { className: `epin-batches`, children: [(0, Z.jsx)(`h3`, { children: `Son kod gruplar\u0131` }), d2?.epins.batches.map((e3) => (0, Z.jsxs)(`article`, { children: [(0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`strong`, { children: e3.name }), (0, Z.jsxs)(`small`, { children: [e3.active_count, ` aktif \xB7 `, e3.redeemed_count, ` kullan\u0131lm\u0131\u015F \xB7 `, e3.expires_at ? new Date(e3.expires_at * 1e3).toLocaleDateString(`tr-TR`) + ` tarihine kadar` : `s\xFCresiz`] })] }), (0, Z.jsxs)(`button`, { disabled: T2 || e3.active_count < 1, title: `Kalan aktif kodlar\u0131 iptal et`, onClick: () => void q2({ action: `revoke_epin_batch`, batchId: e3.id }, `${e3.name} grubundaki ${e3.active_count} aktif kod iptal edilsin mi?`), children: [(0, Z.jsx)(rt, {}), ` \u0130ptal`] })] }, e3.id)), !d2?.epins.batches.length && (0, Z.jsx)(`p`, { children: `Hen\xFCz E-PIN grubu olu\u015Fturulmad\u0131.` })] })] }) }), n2 === `players` && (0, Z.jsxs)(Z.Fragment, { children: [(0, Z.jsxs)(`section`, { className: `admin-card player-live-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(nt, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Anl\u0131k Oyuncu Kontrol\xFC` }), (0, Z.jsx)(`p`, { children: `Oyuncunun geli\u015Fimini, kaynaklar\u0131n\u0131, yeteneklerini ve \xF6zel e\u015Fyalar\u0131n\u0131 tek ekrandan y\xF6net.` })] })] }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `Oyuncu` }), (0, Z.jsx)(`select`, { value: R2, onChange: (e3) => le2(e3.target.value), children: d2?.players.map((e3) => (0, Z.jsxs)(`option`, { value: e3.id, children: [e3.name, ` \xB7 Sv. `, e3.level, ` \xB7 `, (fe2 ? fe2.has(e3.id) : e3.last_seen >= (d2?.serverTime ?? 0) - 30) ? `\xC7evrimi\xE7i` : `\xC7evrim d\u0131\u015F\u0131`] }, e3.id)) })] }), (0, Z.jsx)(`div`, { className: `player-control-grid`, children: Ht.map(([e3, t3, n3]) => (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: t3 }), (0, Z.jsx)(`input`, { type: `number`, min: e3.startsWith(`skill`) || e3 === `level` ? 1 : 0, ...e3 === `hp` ? { max: d2?.players.find((e4) => e4.id === R2)?.max_hp ?? d2?.settings.player_max_hp ?? 100 } : e3.startsWith(`skill`) ? { max: 10 } : {}, step: n3, value: B2[e3], onChange: (t4) => V2((n4) => ({ ...n4, [e3]: Number(t4.target.value) })) })] }, e3)) }), (0, Z.jsxs)(`div`, { className: `wing-admin-toggles`, children: [(0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`input`, { type: `checkbox`, checked: B2.hasRod === 1, onChange: (e3) => V2((t3) => ({ ...t3, hasRod: +!!e3.target.checked, rodEquipped: e3.target.checked ? t3.rodEquipped : 0 })) }), (0, Z.jsx)(A, {}), ` Olta sahibi`] }), (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`input`, { type: `checkbox`, checked: B2.rodEquipped === 1, disabled: B2.hasRod !== 1, onChange: (e3) => V2((t3) => ({ ...t3, rodEquipped: +!!e3.target.checked })) }), (0, Z.jsx)(A, {}), ` Olta ku\u015Fan\u0131l\u0131`] }), (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`input`, { type: `checkbox`, checked: B2.hasWings === 1, onChange: (e3) => V2((t3) => ({ ...t3, hasWings: +!!e3.target.checked, wingsEquipped: e3.target.checked ? t3.wingsEquipped : 0 })) }), (0, Z.jsx)(ee, {}), ` Kanat sahibi`] }), (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`input`, { type: `checkbox`, checked: B2.wingsEquipped === 1, disabled: B2.hasWings !== 1, onChange: (e3) => V2((t3) => ({ ...t3, wingsEquipped: +!!e3.target.checked })) }), (0, Z.jsx)(ee, {}), ` Kanat ku\u015Fan\u0131l\u0131`] })] }), (0, Z.jsxs)(`button`, { className: `admin-primary`, disabled: T2 || !R2, onClick: () => void q2({ action: `update_player`, playerId: R2, playerState: B2 }), children: [(0, Z.jsx)(Q, {}), ` Oyuncuya An\u0131nda Uygula`] })] }), (0, Z.jsxs)(`section`, { className: `admin-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(y, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Ba\u015Flang\u0131\xE7 Sand\u0131\u011F\u0131 G\xF6nder` }), (0, Z.jsx)(`p`, { children: `Se\xE7ili oyuncunun normal \xE7antas\u0131na 1 sand\u0131k g\xF6nderir. \xD6n kay\u0131t \u015Fart\u0131 aranmaz; \xE7evrimd\u0131\u015F\u0131yken de teslim edilir.` })] })] }), (0, Z.jsxs)(`p`, { children: [(0, Z.jsx)(`strong`, { children: d2?.players.find((e3) => e3.id === R2)?.name ?? `\xD6nce oyuncu se\xE7` }), ` \xB7 50 M\xFCcevher, 10 K\u0131rm\u0131z\u0131 \u0130ksir, +10 sald\u0131r\u0131 ve +350 can veren 3 g\xFCnl\xFCk Ba\u015Flang\u0131\xE7 Tilkisi.`] }), (0, Z.jsxs)(`button`, { className: `admin-primary`, disabled: T2 || !R2, onClick: async () => {
    ke2.current?.playerId !== R2 && (ke2.current = { playerId: R2, requestId: crypto.randomUUID() }), await q2({ action: `grant_starter_chest`, playerId: R2, requestId: ke2.current.requestId }) && (ke2.current = null, C2(`Ba\u015Flang\u0131\xE7 Sand\u0131\u011F\u0131 oyuncunun normal \xE7antas\u0131na g\xF6nderildi.`));
  }, children: [(0, Z.jsx)(y, {}), `Ba\u015Flang\u0131\xE7 Sand\u0131\u011F\u0131 G\xF6nder`] })] }), (0, Z.jsxs)(`section`, { className: `admin-card player-evolution-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(de, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Silah Evrim Puan\u0131` }), (0, Z.jsx)(`p`, { children: `Anl\u0131k Oyuncu Kontrol\xFC\u2019nden se\xE7ti\u011Fin oyuncunun ku\u015Fan\u0131lm\u0131\u015F silah\u0131ndaki canavar say\u0131s\u0131n\u0131 d\xFCzenle.` })] })] }), (() => {
    let e3 = d2?.players.find((e4) => e4.id === R2), t3 = e3?.evolution_weapon;
    return (0, Z.jsxs)(Z.Fragment, { children: [(0, Z.jsxs)(`p`, { children: [(0, Z.jsx)(`strong`, { children: e3?.name }), ` \xB7 `, t3?.name ?? `Ku\u015Fan\u0131lm\u0131\u015F silah yok`] }), t3 && (0, Z.jsxs)(`p`, { children: [`Mevcut puan: `, Oe(t3.enchantments).kills, ` \xB7 Evrim `, Oe(t3.enchantments).level, `/3`] }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `Yeni toplam evrim puan\u0131` }), (0, Z.jsx)(`input`, { type: `number`, min: `0`, max: `1000000000`, step: `1`, value: N2, onChange: (e4) => te2(Number(e4.target.value)) })] }), (0, Z.jsx)(`p`, { children: `Yaln\u0131z puan de\u011Fi\u015Fir; evrim seviyesi, efsunlar ve tak\u0131l\u0131 ta\u015Flar korunur.` }), (0, Z.jsxs)(`button`, { className: `admin-primary`, disabled: T2 || !t3 || !Number.isSafeInteger(N2) || N2 < 0 || N2 > 1e9, onClick: () => void q2({ action: `set_weapon_evolution_points`, playerId: R2, itemId: t3?.id, amount: N2 }), children: [(0, Z.jsx)(Q, {}), `Puan\u0131 Uygula`] })] });
  })()] }), (0, Z.jsxs)(`section`, { className: `admin-card player-grant-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(Pe, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Oyuncuya M\xFCcevher Ver` }), (0, Z.jsx)(`p`, { children: `Se\xE7ti\u011Fin oyuncunun bakiyesine an\u0131nda eklenir.` })] })] }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `Oyuncu` }), (0, Z.jsx)(`select`, { value: D2, onChange: (e3) => O2(e3.target.value), children: d2?.players.map((e3) => (0, Z.jsxs)(`option`, { value: e3.id, children: [e3.name, ` \xB7 Sv. `, e3.level, ` \xB7 `, e3.gems, ` \u{1F48E}`] }, e3.id)) })] }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `Miktar` }), (0, Z.jsx)(`input`, { type: `number`, min: `1`, max: `1000000`, step: `1`, value: k2, onChange: (e3) => j2(Number(e3.target.value)) })] }), (0, Z.jsxs)(`button`, { className: `admin-primary`, disabled: T2 || !D2 || k2 < 1, onClick: () => void q2({ action: `grant_gems`, playerId: D2, amount: k2 }), children: [(0, Z.jsx)(p, {}), ` M\xFCcevher Ekle`] })] }), d2?.ranks && (0, Z.jsx)(Dt, { player: d2.players.find((e3) => e3.id === R2), settings: d2.ranks, busy: T2, act: q2 }), X.createElement(colAzrailGrantR31, { player: d2.players.find((e3) => e3.id === R2), busy: T2, act: q2 }), X.createElement(colMountGrantR49, { player: d2.players.find((e3) => e3.id === R2), busy: T2, act: q2 }), X.createElement(colMaterialGrantR55, {player:d2.players.find(e3=>e3.id===R2),busy:T2,act:q2}),X.createElement(colAccessoryGrantR58,{player:d2.players.find(e3=>e3.id===R2),busy:T2,act:q2}), X.createElement(colSpecializationReset463Admin, { player: d2.players.find((e3) => e3.id === R2), busy: T2, act: q2 }), X.createElement(colBrokenCore464Admin.Player, { player: d2.players.find((e3) => e3.id === R2), busy: T2, act: q2 }), (0, Z.jsx)(Et, { players: d2?.players ?? [], selectedPlayerId: R2, busy: T2, act: q2 }), (0, Z.jsxs)(`section`, { className: `admin-card item-grant-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(y, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Oyuncuya E\u015Fya Ver` }), (0, Z.jsx)(`p`, { children: `E\u015Fsiz ve Sonsuz dahil ekipman\u0131 veya Ta\u015F Sanat\u0131 Kitab\u0131n\u0131 se\xE7ili oyuncuya g\xF6nder. G\xFC\xE7 alan\u0131ndaki de\u011Fer aynen verilir.` })] })] }), (0, Z.jsxs)(`div`, { className: `item-grant-grid`, children: [(0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `E\u015Fya ad\u0131` }), (0, Z.jsx)(`input`, { value: H2.itemName, maxLength: 64, onChange: (e3) => U2((t3) => ({ ...t3, itemName: e3.target.value })) })] }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `T\xFCr` }), (0, Z.jsxs)(`select`, { value: H2.kind, onChange: (e3) => U2((t3) => emeraldGrantFields444(t3, { ...t3, kind: e3.target.value, enchantments: t3.enchantments.map((e4) => ({ ...e4, kind: `` })) }, d2?.settings ?? {})), children: [(0, Z.jsx)(`option`, { value: `weapon`, children: `Silah` }), (0, Z.jsx)(`option`, { value: `armor`, children: `Z\u0131rh` }), (0, Z.jsx)(`option`, { value: `helmet`, children: `Kask` }), (0, Z.jsx)(`option`, { value: `shoes`, children: `Ayakkab\u0131` }), (0, Z.jsx)(`option`, { value: `necklace`, children: `Kolye` })] })] }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `Nadirlik` }), (0, Z.jsxs)(`select`, { value: H2.rarity, onChange: (e3) => U2((t3) => emeraldGrantFields444(t3, { ...t3, rarity: e3.target.value }, d2?.settings ?? {})), children: [(0, Z.jsx)(`option`, { value: `white`, children: `Beyaz` }), (0, Z.jsx)(`option`, { value: `blue`, children: `Mavi` }), (0, Z.jsx)(`option`, { value: `orange`, children: `Turuncu` }), (0, Z.jsx)(`option`, { value: `red`, children: `K\u0131rm\u0131z\u0131` }), (0, Z.jsx)(`option`, { value: `purple`, children: `Mor K\xF6k` }), (0, Z.jsx)(`option`, { value: `unique`, children: `E\u015Fsiz` }), (0, Z.jsx)(`option`, { value: `infinite`, children: `Sonsuz` }), 0, Z.jsx("option", { value: "emerald", children: "Kadim Z\xFCmr\xFCt (65)" })] })] }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `S\u0131n\u0131f` }), (0, Z.jsxs)(`select`, { value: H2.role, onChange: (e3) => U2((t3) => emeraldGrantFields444(t3, { ...t3, role: e3.target.value }, d2?.settings ?? {})), children: [(0, Z.jsx)(`option`, { value: `muhafiz`, children: `Muhaf\u0131z` }), (0, Z.jsx)(`option`, { value: `avci`, children: `Avc\u0131` }), (0, Z.jsx)(`option`, { value: `arkanist`, children: `Arkanist` })] })] }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `G\xFC\xE7` }), (0, Z.jsx)(`input`, { type: `number`, min: `0`, max: `100000`, value: H2.power, onChange: (e3) => U2((t3) => ({ ...t3, power: Number(e3.target.value) })) })] })] }), (0, Z.jsx)(`div`, { className: `item-enchant-grid`, children: H2.enchantments.map((e3, t3) => (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`select`, { "aria-label": `${t3 + 1}. efsun`, value: e3.kind, onChange: (e4) => U2((n3) => ({ ...n3, enchantments: n3.enchantments.map((n4, r2) => r2 === t3 ? { ...n4, kind: e4.target.value, value: e4.target.value ? Ve(d2?.settings, e4.target.value)[0] : 0 } : n4) })), children: Ut.filter(([e4]) => Gt(e4, H2.kind)).map(([e4, n3]) => (0, Z.jsxs)(`option`, { value: e4, children: [t3 + 1, `. `, n3] }, e4 || `none`)) }), (0, Z.jsxs)(`select`, { "aria-label": `${t3 + 1}. efsun de\u011Feri`, value: e3.kind && Ve(d2?.settings, e3.kind).includes(e3.value) ? e3.value : ``, disabled: !e3.kind, onChange: (e4) => U2((n3) => ({ ...n3, enchantments: n3.enchantments.map((n4, r2) => r2 === t3 ? { ...n4, value: Number(e4.target.value) } : n4) })), children: [(0, Z.jsx)(`option`, { value: ``, disabled: true, children: `Kademe se\xE7` }), e3.kind && Ve(d2?.settings, e3.kind).map((t4, n3) => (0, Z.jsxs)(`option`, { value: t4, children: [n3 + 1, `. kademe \xB7 `, t4, e3.kind === `hp` ? ` can` : `%`] }, n3))] })] }, t3)) }), (0, Z.jsxs)(`button`, { className: `admin-primary`, disabled: T2 || !R2 || !H2.itemName.trim(), onClick: () => void q2({ action: `grant_item`, playerId: R2, item: { ...H2, enchantments: H2.enchantments.filter((e3) => e3.kind) } }), children: [(0, Z.jsx)(y, {}), ` Ekipman\u0131 \xC7antas\u0131na G\xF6nder`] }), (0, Z.jsxs)(`div`, { className: `stone-book-admin-grant`, children: [(0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `Ta\u015F Sanat\u0131 Kitab\u0131 miktar\u0131` }), (0, Z.jsx)(`input`, { type: `number`, min: `1`, max: `1000000`, step: `1`, value: z2, onChange: (e3) => ue2(Number(e3.target.value)) })] }), (0, Z.jsxs)(`button`, { className: `admin-primary`, disabled: T2 || !R2 || !Number.isSafeInteger(z2) || z2 < 1, onClick: () => void q2({ action: `grant_stone_books`, playerId: R2, amount: z2 }), children: [(0, Z.jsx)(y, {}), ` Ta\u015F Sanat\u0131 Kitab\u0131 Ver`] })] }), (0, Z.jsxs)(`div`, { className: `stone-book-admin-grant`, children: [(0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `Evrim Par\u015F\xF6meni miktar\u0131` }), (0, Z.jsx)(`input`, { type: `number`, min: `1`, max: `1000000`, step: `1`, value: z2, onChange: (e3) => ue2(Number(e3.target.value)) })] }), (0, Z.jsxs)(`button`, { className: `admin-primary`, disabled: T2 || !R2 || !Number.isSafeInteger(z2) || z2 < 1, onClick: () => void q2({ action: `grant_evolution_scrolls`, playerId: R2, amount: z2 }), children: [(0, Z.jsx)(y, {}), ` Evrim Par\u015F\xF6meni Ver`] })] })] }), X.createElement(colGuildResetAdmin470, { busy: T2, act: q2 }), X.createElement(colPlayerResetAdmin495, { busy: T2, act: q2, playerId: R2, playerName: d2?.players.find((p2) => p2.id === R2)?.name ?? "Bu oyuncu" })] }), n2 === `security` && (0, Z.jsxs)(`section`, { className: `admin-card security-accounts-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(rt, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Oyuncuyu Elle Engelle` }), (0, Z.jsx)(`p`, { children: `Oyuncu ad\u0131n\u0131 yaz. Sistem kendi ba\u015F\u0131na kimseyi engellemez; i\u015Flem yaln\u0131z sen d\xFC\u011Fmeye bast\u0131\u011F\u0131nda uygulan\u0131r.` })] })] }), (0, Z.jsxs)(`label`, { className: `admin-select-label`, children: [(0, Z.jsx)(`span`, { children: `Oyuncu ad\u0131` }), (0, Z.jsx)(`input`, { value: c2, maxLength: 32, autoComplete: `off`, onChange: (e3) => l2(e3.target.value), placeholder: `Oyuncunun ad\u0131n\u0131 yaz` })] }), (0, Z.jsxs)(`div`, { className: `admin-actions`, children: [(0, Z.jsx)(`button`, { disabled: T2 || !c2.trim(), onClick: () => void q2({ action: `security_suspend`, playerName: c2.trim(), durationMinutes: 30 }, `${c2.trim()} 30 dakika ask\u0131ya al\u0131ns\u0131n m\u0131?`), children: `30 dk Ask\u0131` }), (0, Z.jsx)(`button`, { disabled: T2 || !c2.trim(), onClick: () => void q2({ action: `security_suspend`, playerName: c2.trim(), durationMinutes: 1440 }, `${c2.trim()} 24 saat ask\u0131ya al\u0131ns\u0131n m\u0131?`), children: `24 sa Ask\u0131` }), (0, Z.jsx)(`button`, { className: `permanent`, disabled: T2 || !c2.trim(), onClick: () => void q2({ action: `security_ban_permanent`, playerName: c2.trim() }, `${c2.trim()} kal\u0131c\u0131 olarak engellensin mi?`), children: `Kal\u0131c\u0131 Ban` }), (0, Z.jsx)(`button`, { disabled: T2 || !c2.trim(), onClick: () => void q2({ action: `security_unban`, playerName: c2.trim() }, `${c2.trim()} hesab\u0131n\u0131n engeli kald\u0131r\u0131ls\u0131n m\u0131?`), children: `Ban\u0131 Kald\u0131r` })] }), (0, Z.jsxs)(`div`, { className: `security-account-list`, children: [(0, Z.jsx)(`h3`, { children: `\u015Eu an engelli oyuncular` }), d2?.security.accounts.map((e3) => (0, Z.jsxs)(`article`, { children: [(0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`strong`, { children: e3.player_name || e3.username }), (0, Z.jsx)(`small`, { children: e3.permanently_banned ? `Kal\u0131c\u0131 engel` : `${new Date(e3.suspended_until_ms).toLocaleString(`tr-TR`)} kadar ask\u0131da` }), e3.ban_reason && (0, Z.jsx)(`em`, { children: e3.ban_reason })] }), (0, Z.jsx)(`div`, { children: (0, Z.jsx)(`button`, { disabled: T2, onClick: () => void q2({ action: `security_unban`, accountId: e3.account_id }, `${e3.player_name || e3.username} hesab\u0131n\u0131n engeli kald\u0131r\u0131ls\u0131n m\u0131?`), children: `Engeli Kald\u0131r` }) })] }, e3.account_id)), !d2?.security.accounts.length && (0, Z.jsx)(`p`, { children: `Engelli oyuncu yok.` })] })] }), n2 === `economy` && (0, Z.jsx)(`section`, { className: `admin-card fishing-admin-note`, children: (0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(A, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Bal\u0131k\xE7\u0131l\u0131k Ekonomisi` }), (0, Z.jsx)(`p`, { children: `Olta, bal\u0131k, inci ve Demirci Haso maliyetleri bu sayfadaki gruplardan y\xF6netilir.` })] })] }) }), n2 === `overview` && (0, Z.jsx)(Z.Fragment, { children: (0, Z.jsx)(qe, { settings: d2?.settings, busy: T2, act: q2 }) }), n2 === `world` && (0, Z.jsxs)(Z.Fragment, { children: [(0, Z.jsxs)(`section`, { className: `admin-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(M, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `D\xFCnya Sa\u011Fl\u0131\u011F\u0131` }), (0, Z.jsx)(`p`, { children: `Bo\u015F ge\xE7en s\xFCre de otomatik hesaba kat\u0131l\u0131r.` })] })] }), (0, Z.jsx)(`input`, { className: `health-range`, type: `range`, min: `0`, max: `100`, step: `.1`, value: _2, onChange: (e3) => v2(Number(e3.target.value)) }), (0, Z.jsxs)(`div`, { className: `health-control`, children: [(0, Z.jsxs)(`strong`, { children: [`%`, _2.toFixed(1)] }), (0, Z.jsx)(`button`, { disabled: T2, onClick: () => void q2({ action: `set_health`, health: _2 }), children: `Uygula` })] })] }), (0, Z.jsxs)(`section`, { className: `admin-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(w, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `D\xFCnya Bossu` }), (0, Z.jsx)(`p`, { children: d2?.boss?.hp ? `${d2.boss.hp}/${d2.boss.max_hp} can` : `\u015Eu an haritada de\u011Fil` })] })] }), (0, Z.jsxs)(`div`, { className: `admin-actions`, children: [(0, Z.jsx)(`button`, { disabled: T2, onClick: () => void q2({ action: `spawn_boss` }), children: `Bossu Getir` }), (0, Z.jsx)(`button`, { disabled: T2, onClick: () => void q2({ action: `remove_boss` }), children: `Bossu Kald\u0131r` })] })] }), (0, Z.jsxs)(`section`, { className: `admin-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(S, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Ayaz Taht\u0131n\u0131n Bek\xE7isi` }), (0, Z.jsx)(`p`, { children: d2?.frozenBoss?.hp ? `${d2.frozenBoss.hp}/${d2.frozenBoss.max_hp} can` : d2?.frozenBoss?.respawn_at && d2.frozenBoss.respawn_at > Y2 ? `${Math.max(0, d2.frozenBoss.respawn_at - Y2)} sn sonra do\u011Facak` : `\u015Eu an haritada de\u011Fil` })] })] }), (0, Z.jsxs)(`div`, { className: `admin-actions`, children: [(0, Z.jsx)(`button`, { disabled: T2 || !d2?.frozenBoss || d2.frozenBoss.hp > 0, onClick: () => void q2({ action: `spawn_frozen_boss` }), children: `Merkez Bossunu Getir` }), (0, Z.jsx)(`button`, { disabled: T2 || !d2?.frozenBoss || d2.frozenBoss.hp <= 0, onClick: () => void q2({ action: `remove_frozen_boss` }, `Ayaz Taht\u0131n\u0131n Bek\xE7isi haritadan kald\u0131r\u0131l\u0131p yeniden do\u011Fma sayac\u0131 ba\u015Flat\u0131ls\u0131n m\u0131?`), children: `Merkez Bossunu Kald\u0131r` })] })] }), (0, Z.jsxs)(`section`, { className: `admin-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(w, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Kadim K\xF6k\xFCn Muhaf\u0131z\u0131` }), (0, Z.jsx)(`p`, { children: d2?.ancientBoss?.hp ? `${d2.ancientBoss.hp}/${d2.ancientBoss.max_hp} can` : d2?.ancientBoss?.respawn_at && d2.ancientBoss.respawn_at > Y2 ? `${Math.max(0, d2.ancientBoss.respawn_at - Y2)} sn sonra do\u011Facak` : `\u015Eu an haritada de\u011Fil` })] })] }), (0, Z.jsx)(`p`, { children: `Donmu\u015F \xC7am Ge\xE7idi Ayaz Taht\u0131 bossunun ganimet profilini kullan\u0131r. E\u015Fya ve malzeme oranlar\u0131n\u0131 Ganimetler sekmesindeki Ayaz Taht\u0131 profilinden d\xFCzenle.` }), (0, Z.jsxs)(`div`, { className: `admin-actions`, children: [(0, Z.jsx)(`button`, { disabled: T2 || !d2?.ancientBoss || d2.ancientBoss.hp > 0, onClick: () => void q2({ action: `spawn_ancient_boss` }), children: `Kadim Bossu Getir` }), (0, Z.jsx)(`button`, { disabled: T2 || !d2?.ancientBoss || d2.ancientBoss.hp <= 0, onClick: () => void q2({ action: `remove_ancient_boss` }, `Kadim K\xF6k\xFCn Muhaf\u0131z\u0131 kald\u0131r\u0131l\u0131p 40 dakikal\u0131k yeniden do\u011Fma sayac\u0131 ba\u015Flat\u0131ls\u0131n m\u0131?`), children: `Kadim Bossu Kald\u0131r` })] })] }), (0, Z.jsxs)(`section`, { className: `admin-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(S, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Buzg\xF6l\xFC Semenderi` }), (0, Z.jsx)(`p`, { children: (d2?.frozenWater?.alive_count ?? 0) > 0 ? `${d2?.frozenWater?.alive_count ?? 0}/${d2?.frozenWater?.total_count ?? 3} kanalda g\xF6lde \xB7 toplam ${d2?.frozenWater?.hp ?? 0}/${d2?.frozenWater?.max_hp ?? 0} can` : d2?.frozenWater?.next_respawn_at && d2.frozenWater.next_respawn_at > Y2 ? `${Math.max(0, d2.frozenWater.next_respawn_at - Y2)} sn sonra ilk kanalda do\u011Facak` : `\u015Eu an hi\xE7bir kanalda g\xF6lde de\u011Fil` })] })] }), (0, Z.jsxs)(`div`, { className: `admin-actions`, children: [(0, Z.jsx)(`button`, { disabled: T2 || !d2?.frozenWater || d2.frozenWater.alive_count >= d2.frozenWater.total_count, onClick: () => void q2({ action: `spawn_frozen_water` }), children: `Eksik Semenderleri Getir` }), (0, Z.jsx)(`button`, { disabled: T2 || !d2?.frozenWater || d2.frozenWater.alive_count < 1, onClick: () => void q2({ action: `remove_frozen_water` }, `Buzg\xF6l\xFC Semenderi b\xFCt\xFCn kanallardaki g\xF6llerden kald\u0131r\u0131l\u0131p yeniden do\u011Fma saya\xE7lar\u0131 ba\u015Flat\u0131ls\u0131n m\u0131?`), children: `Semenderleri Kald\u0131r` })] })] }), (0, Z.jsxs)(`section`, { className: `admin-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(p, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Sinsi Ta\u015F Kontrol\xFC` }), (0, Z.jsxs)(`p`, { children: [`3 kanalda `, d2?.stones.filter((e3) => e3.hp > 0).length ?? 0, `/`, d2?.stones.length ?? 9, ` ta\u015F ayakta`] })] })] }), (0, Z.jsx)(`div`, { className: `stone-admin-list`, children: d2?.channels.map((e3) => {
    let t3 = d2.stones.filter((t4) => t4.channel === e3.id);
    return (0, Z.jsxs)(`div`, { children: [(0, Z.jsxs)(`strong`, { children: [`Kanal `, e3.id] }), (0, Z.jsxs)(`span`, { children: [e3.online, `/`, d2.settings.channel_capacity ?? 15, ` oyuncu \xB7 `, t3.filter((e4) => e4.hp > 0).length, `/`, t3.length, ` ta\u015F`] })] }, e3.id);
  }) }), (0, Z.jsx)(`div`, { className: `admin-actions`, children: (0, Z.jsx)(`button`, { disabled: T2, onClick: () => void q2({ action: `reset_sinsi_stones` }), children: `T\xFCm Ta\u015Flar\u0131 Yenile` }) })] }), (0, Z.jsxs)(`section`, { className: `admin-card danger-card`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(ft, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `D\xFCnya D\xF6ng\xFCs\xFC` }), (0, Z.jsxs)(`p`, { children: [`D\xF6ng\xFC `, d2?.world.cycle ?? `\u2014`] })] })] }), (0, Z.jsx)(`button`, { disabled: T2, onClick: () => void q2({ action: `reset_world` }, `D\xFCnya 8 saniye i\xE7inde patlayacak ve T\xDCM oyuncu ilerlemeleri s\u0131f\u0131rlanacak. Emin misin?`), children: `D\xFCnyay\u0131 S\u0131f\u0131rla` })] })] })] })] })] });
}
var on = { game_bug: `Oyun hatas\u0131`, item_reward: `E\u015Fya / \xF6d\xFCl`, payment: `\xD6deme`, player_report: `Oyuncu \u015Fik\xE2yeti`, other: `Di\u011Fer` };
function sn(e2) {
  return new Date(e2).toLocaleString(`tr-TR`, { dateStyle: `short`, timeStyle: `short` });
}
async function cn(e2) {
  let t2 = await e2.json().catch(() => ({}));
  if (!e2.ok) throw Error(t2.error || `Destek i\u015Flemi tamamlanamad\u0131.`);
  return t2;
}
function ln() {
  let [e2, t2] = (0, X.useState)({ tickets: [], messages: [], selectedTicketId: null }), [n2, r2] = (0, X.useState)(``), [i2, a2] = (0, X.useState)(`open`), [o2, c2] = (0, X.useState)(``), [l2, u2] = (0, X.useState)(``), [d2, f2] = (0, X.useState)(true), [p2, m2] = (0, X.useState)(false), [g2, _2] = (0, X.useState)(``), v2 = (0, X.useRef)(``), y2 = (0, X.useRef)(``), b2 = (0, X.useRef)(null);
  (0, X.useEffect)(() => {
    let e3 = new AbortController(), i3 = false, a3 = true, o3 = async (o4 = false) => {
      if (!(i3 || document.visibilityState === `hidden`)) {
        i3 = true, o4 && f2(true);
        try {
          let i4 = n2 ? `?ticketId=${encodeURIComponent(n2)}` : ``, o5 = await cn(await fetch(`/api/admin/support${i4}`, { cache: `no-store`, signal: e3.signal }));
          if (!a3) return;
          t2(o5), _2(``), !n2 && o5.selectedTicketId && r2(o5.selectedTicketId);
        } catch (t3) {
          if (!a3 || e3.signal.aborted) return;
          _2(t3 instanceof Error ? t3.message : `Destek gelen kutusu y\xFCklenemedi.`);
        } finally {
          i3 = false, a3 && f2(false);
        }
      }
    };
    o3(true);
    let s2 = window.setInterval(() => void o3(false), 5e3);
    return () => {
      a3 = false, e3.abort(), window.clearInterval(s2);
    };
  }, [n2]);
  let x2 = e2.tickets.find((e3) => e3.id === n2) ?? e2.tickets.find((t3) => t3.id === e2.selectedTicketId) ?? null;
  (0, X.useEffect)(() => {
    (e2.messages.at(-1)?.id ?? 0) && b2.current?.scrollIntoView({ block: `end` });
  }, [n2, e2.messages]), (0, X.useEffect)(() => {
    !x2?.admin_unread_count || y2.current === x2.id || (y2.current = x2.id, fetch(`/api/admin/support`, { method: `POST`, headers: { "Content-Type": `application/json` }, body: JSON.stringify({ action: `mark_read`, ticketId: x2.id }) }).then(cn).then((e3) => {
      t2(e3), _2(``);
    }).catch((e3) => {
      _2(e3 instanceof Error ? e3.message : `Okundu bilgisi kaydedilemedi.`);
    }).finally(() => {
      y2.current = ``;
    }));
  }, [x2]);
  let S2 = (0, X.useMemo)(() => {
    let t3 = o2.trim().toLocaleLowerCase(`tr-TR`);
    return e2.tickets.filter((e3) => i2 === `open` && e3.status !== `open` || i2 === `resolved` && e3.status !== `resolved` || i2 === `unread` && e3.admin_unread_count < 1 ? false : t3 ? `${e3.player_name} ${e3.username} ${e3.subject}`.toLocaleLowerCase(`tr-TR`).includes(t3) : true);
  }, [i2, o2, e2.tickets]), C2 = async (e3) => {
    m2(true), _2(``);
    try {
      let n3 = await cn(await fetch(`/api/admin/support`, { method: `POST`, headers: { "Content-Type": `application/json` }, body: JSON.stringify(e3) }));
      return t2(n3), n3.selectedTicketId && r2(n3.selectedTicketId), true;
    } catch (e4) {
      return _2(e4 instanceof Error ? e4.message : `Destek i\u015Flemi tamamlanamad\u0131.`), false;
    } finally {
      m2(false);
    }
  }, w2 = async (e3) => {
    e3.preventDefault();
    let t3 = l2.trim();
    if (!x2 || !t3 || Array.from(t3).length > 1e3) return;
    let n3 = v2.current || crypto.randomUUID();
    v2.current = n3, await C2({ action: `reply`, ticketId: x2.id, message: t3, clientRequestId: n3 }) && (u2(``), v2.current = ``);
  }, T2 = e2.tickets.filter((e3) => e3.status === `open`).length, D2 = e2.tickets.reduce((e3, t3) => e3 + +(t3.admin_unread_count > 0), 0);
  return (0, Z.jsxs)(`section`, { className: `admin-card admin-support-workspace`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title admin-support-title`, children: [(0, Z.jsx)(s, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Oyuncu Destek Merkezi` }), (0, Z.jsx)(`p`, { children: `\u015Eik\xE2yet ve yard\u0131m taleplerini g\xF6r, oyuncuyla \xF6zel olarak konu\u015F ve \xE7\xF6z\xFClen kay\u0131tlar\u0131 kapat.` })] })] }), (0, Z.jsxs)(`div`, { className: `admin-support-summary`, "aria-label": `Destek \xF6zeti`, children: [(0, Z.jsxs)(`span`, { children: [(0, Z.jsx)(ct, {}), (0, Z.jsx)(`small`, { children: `A\xE7\u0131k` }), (0, Z.jsx)(`strong`, { children: T2 })] }), (0, Z.jsxs)(`span`, { children: [(0, Z.jsx)(E, {}), (0, Z.jsx)(`small`, { children: `Okunmam\u0131\u015F` }), (0, Z.jsx)(`strong`, { children: D2 })] }), (0, Z.jsxs)(`span`, { children: [(0, Z.jsx)(Le, {}), (0, Z.jsx)(`small`, { children: `\xC7\xF6z\xFClen` }), (0, Z.jsx)(`strong`, { children: e2.tickets.length - T2 })] })] }), (0, Z.jsxs)(`div`, { className: `admin-support-toolbar`, children: [(0, Z.jsx)(`div`, { role: `group`, "aria-label": `Talep filtresi`, children: [`open`, `unread`, `resolved`, `all`].map((e3) => (0, Z.jsx)(`button`, { className: i2 === e3 ? `active` : ``, onClick: () => a2(e3), children: e3 === `open` ? `A\xE7\u0131k` : e3 === `unread` ? `Okunmam\u0131\u015F` : e3 === `resolved` ? `\xC7\xF6z\xFClen` : `T\xFCm\xFC` }, e3)) }), (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(dt, {}), (0, Z.jsx)(`input`, { value: o2, onChange: (e3) => c2(e3.target.value), placeholder: `Oyuncu veya ba\u015Fl\u0131k ara`, "aria-label": `Destek taleplerinde ara` })] })] }), g2 && (0, Z.jsx)(`div`, { className: `admin-support-error`, role: `alert`, children: g2 }), (0, Z.jsxs)(`div`, { className: `admin-support-layout`, children: [(0, Z.jsxs)(`div`, { className: `admin-support-inbox`, "aria-label": `Destek talepleri`, children: [d2 && e2.tickets.length === 0 && (0, Z.jsx)(`p`, { className: `admin-support-empty`, children: `Talepler y\xFCkleniyor\u2026` }), !d2 && S2.length === 0 && (0, Z.jsx)(`p`, { className: `admin-support-empty`, children: `Bu g\xF6r\xFCn\xFCmde destek talebi yok.` }), S2.map((e3) => (0, Z.jsxs)(`button`, { className: `admin-support-ticket ${x2?.id === e3.id ? `active` : ``}`, onClick: () => r2(e3.id), children: [(0, Z.jsxs)(`span`, { className: `admin-support-ticket-head`, children: [(0, Z.jsx)(`strong`, { children: e3.player_name || e3.username || `Oyuncu` }), e3.admin_unread_count > 0 && (0, Z.jsx)(`b`, { "aria-label": `${e3.admin_unread_count} okunmam\u0131\u015F mesaj`, children: e3.admin_unread_count })] }), (0, Z.jsx)(`span`, { className: `admin-support-ticket-subject`, children: e3.subject }), (0, Z.jsxs)(`small`, { children: [on[e3.category] ?? `Di\u011Fer`, ` \xB7 `, sn(e3.updated_at_ms)] }), (0, Z.jsx)(`em`, { className: e3.status, children: e3.status === `open` ? `A\xE7\u0131k` : `\xC7\xF6z\xFCld\xFC` })] }, e3.id))] }), (0, Z.jsxs)(`section`, { className: `admin-support-thread`, "aria-label": `Destek konu\u015Fmas\u0131`, children: [!x2 && (0, Z.jsxs)(`div`, { className: `admin-support-thread-empty`, children: [(0, Z.jsx)(s, {}), (0, Z.jsx)(`strong`, { children: `Bir destek talebi se\xE7` }), (0, Z.jsx)(`p`, { children: `Oyuncunun mesajlar\u0131 ve yan\u0131t alan\u0131 burada g\xF6r\xFCnecek.` })] }), x2 && (0, Z.jsxs)(Z.Fragment, { children: [(0, Z.jsxs)(`header`, { className: `admin-support-thread-head`, children: [(0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`span`, { children: on[x2.category] ?? `Di\u011Fer` }), (0, Z.jsx)(`h3`, { children: x2.subject }), (0, Z.jsxs)(`p`, { children: [x2.player_name, ` \xB7 `, x2.username || `kullan\u0131c\u0131 ad\u0131 yok`, ` \xB7 Seviye `, x2.level || `\u2014`] })] }), (0, Z.jsx)(`button`, { className: x2.status === `resolved` ? `reopen` : `resolve`, disabled: p2, onClick: () => void C2({ action: `set_status`, ticketId: x2.id, status: x2.status === `resolved` ? `open` : `resolved` }), children: x2.status === `resolved` ? `Yeniden A\xE7` : (0, Z.jsxs)(Z.Fragment, { children: [(0, Z.jsx)(Le, {}), ` \xC7\xF6z\xFCld\xFC`] }) })] }), (0, Z.jsxs)(`div`, { className: `admin-support-messages`, role: `log`, "aria-live": `polite`, children: [e2.messages.map((e3) => (0, Z.jsxs)(`article`, { className: e3.sender_type === `admin` ? `from-admin` : `from-player`, children: [(0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`strong`, { children: e3.sender_type === `admin` ? `Sen` : e3.sender_name }), (0, Z.jsx)(`time`, { dateTime: new Date(e3.created_at_ms).toISOString(), children: sn(e3.created_at_ms) })] }), (0, Z.jsx)(`p`, { children: e3.body })] }, e3.id)), !e2.messages.length && !d2 && (0, Z.jsx)(`p`, { className: `admin-support-empty`, children: `Bu talepte hen\xFCz mesaj yok.` }), (0, Z.jsx)(`div`, { ref: b2 })] }), (0, Z.jsxs)(`form`, { className: `admin-support-compose`, onSubmit: w2, children: [(0, Z.jsx)(`textarea`, { value: l2, maxLength: 1e3, rows: 3, placeholder: `Oyuncuya yan\u0131t\u0131n\u0131 yaz\u2026`, "aria-label": `Destek yan\u0131t\u0131`, onChange: (e3) => {
    u2(e3.target.value), v2.current = ``;
  } }), (0, Z.jsxs)(`div`, { children: [(0, Z.jsxs)(`small`, { children: [Array.from(l2).length, `/1000`] }), (0, Z.jsxs)(`button`, { type: `submit`, disabled: p2 || !l2.trim(), children: [(0, Z.jsx)(h, {}), ` `, p2 ? `G\xF6nderiliyor\u2026` : `Yan\u0131tla`] })] })] })] })] })] })] });
}
var un = (e2, t2) => {
  let n2 = Number(e2);
  return Number.isSafeInteger(n2) && n2 === t2;
};
function dn({ snapshot: e2, busy: t2, act: n2, blackXp: r2 }) {
  let [i2, a2] = (0, X.useState)(`forest`), [o2, s2] = (0, X.useState)({}), [c2, l2] = (0, X.useState)(`normal`), [u2, d2] = (0, X.useState)(``), [f2, p2] = (0, X.useState)(``), [m2, h2] = (0, X.useState)([]), g2 = e2?.profiles.filter((e3) => e3.area === i2) ?? [], _2 = (e3, t3) => o2[e3.key]?.[t3]?.value ?? String(e3[t3]), v2 = (n3, r3, i3) => {
    s2((a3) => {
      let o3 = a3[n3.key] ?? {};
      if (!t2 && un(i3, n3[r3])) {
        if (!o3[r3]) return a3;
        let e3 = { ...a3 }, t3 = { ...o3 };
        return delete t3[r3], Object.keys(t3).length ? e3[n3.key] = t3 : delete e3[n3.key], e3;
      }
      let s3 = o3[r3], c3 = !!(s3 && s3.baseValue === n3[r3]);
      return { ...a3, [n3.key]: { ...o3, [r3]: { value: i3, version: (s3?.version ?? 0) + 1, baseRevision: c3 ? s3.baseRevision : e2?.revision ?? 0, baseValue: c3 ? s3.baseValue : n3[r3] } } };
    }), h2([]);
  };
  (0, X.useEffect)(() => {
    if (!e2 || t2) return;
    let n3 = window.setTimeout(() => s2((t3) => {
      let n4 = false, r3 = { ...t3 };
      for (let t4 of e2.profiles) {
        let e3 = r3[t4.key];
        if (!e3) continue;
        let i3 = { ...e3 };
        i3.maxHp && un(i3.maxHp.value, t4.maxHp) && (delete i3.maxHp, n4 = true), i3.hitDamage && un(i3.hitDamage.value, t4.hitDamage) && (delete i3.hitDamage, n4 = true), Object.keys(i3).length ? r3[t4.key] = i3 : delete r3[t4.key];
      }
      return n4 ? r3 : t3;
    }), 0);
    return () => window.clearTimeout(n3);
  }, [t2, e2]);
  let y2 = g2.map((e3) => ({ profile: e3, maxHpDraft: o2[e3.key]?.maxHp, hitDamageDraft: o2[e3.key]?.hitDamage, maxHp: Number(_2(e3, `maxHp`)), hitDamage: Number(_2(e3, `hitDamage`)) })), b2 = y2.map((e3) => ({ ...e3, maxHpChanged: !!(e3.maxHpDraft && e3.maxHp !== e3.profile.maxHp), hitDamageChanged: !!(e3.hitDamageDraft && e3.hitDamage !== e3.profile.hitDamage) })).filter((e3) => e3.maxHpChanged || e3.hitDamageChanged), x2 = b2.reduce((e3, t3) => e3 + Number(t3.maxHpChanged) + Number(t3.hitDamageChanged), 0), C2 = y2.flatMap((e3) => [...e3.maxHpDraft && e3.maxHp !== e3.profile.maxHp && e3.maxHpDraft.baseValue !== e3.profile.maxHp ? [{ profile: e3.profile, field: `maxHp`, draft: e3.maxHpDraft }] : [], ...e3.hitDamageDraft && e3.hitDamage !== e3.profile.hitDamage && e3.hitDamageDraft.baseValue !== e3.profile.hitDamage ? [{ profile: e3.profile, field: `hitDamage`, draft: e3.hitDamageDraft }] : []]), w2 = y2.flatMap(({ profile: e3, maxHpDraft: t3, hitDamageDraft: n3, maxHp: r3, hitDamage: i3 }) => {
    let a3 = [];
    return t3 && (!Number.isSafeInteger(r3) || r3 < 1 || r3 > 1e7) && a3.push(`${e3.label}: Can 1\u201310.000.000 aras\u0131nda tam say\u0131 olmal\u0131.`), n3 && (!Number.isSafeInteger(i3) || i3 < 1 || i3 > 1e6) && a3.push(`${e3.label}: Hasar 1\u20131.000.000 aras\u0131nda tam say\u0131 olmal\u0131.`), a3;
  }), T2 = () => {
    let n3 = u2.trim() ? Number(u2) : null, r3 = f2.trim() ? Number(f2) : null, a3 = [];
    if (n3 === null && r3 === null && a3.push(`Toplu uygulama i\xE7in can veya hasar de\u011Ferlerinden en az birini yaz.`), n3 !== null && (!Number.isSafeInteger(n3) || n3 < 1 || n3 > 1e7) && a3.push(`Toplu can 1\u201310.000.000 aras\u0131nda tam say\u0131 olmal\u0131.`), r3 !== null && (!Number.isSafeInteger(r3) || r3 < 1 || r3 > 1e6) && a3.push(`Toplu hasar 1\u20131.000.000 aras\u0131nda tam say\u0131 olmal\u0131.`), a3.length) {
      h2(a3);
      return;
    }
    s2((a4) => {
      let o3 = { ...a4 };
      for (let a5 of g2.filter((e3) => i2 === `black` || e3.variant === c2)) {
        let i3 = o3[a5.key] ?? {}, s3 = !!(i3.maxHp && i3.maxHp.baseValue === a5.maxHp), c3 = !!(i3.hitDamage && i3.hitDamage.baseValue === a5.hitDamage), l3 = { ...i3, ...n3 === null ? {} : { maxHp: { value: String(n3), version: (i3.maxHp?.version ?? 0) + 1, baseRevision: s3 ? i3.maxHp.baseRevision : e2?.revision ?? 0, baseValue: s3 ? i3.maxHp.baseValue : a5.maxHp } }, ...r3 === null ? {} : { hitDamage: { value: String(r3), version: (i3.hitDamage?.version ?? 0) + 1, baseRevision: c3 ? i3.hitDamage.baseRevision : e2?.revision ?? 0, baseValue: c3 ? i3.hitDamage.baseValue : a5.hitDamage } } };
        !t2 && n3 !== null && n3 === a5.maxHp && delete l3.maxHp, !t2 && r3 !== null && r3 === a5.hitDamage && delete l3.hitDamage, Object.keys(l3).length ? o3[a5.key] = l3 : delete o3[a5.key];
      }
      return o3;
    }), h2([]);
  }, E2 = () => {
    !e2 || !C2.length || (s2((e3) => {
      let t3 = { ...e3 };
      for (let e4 of C2) {
        let n3 = t3[e4.profile.key];
        if (!n3) continue;
        let r3 = { ...n3 };
        r3[e4.field]?.version === e4.draft.version && delete r3[e4.field], Object.keys(r3).length ? t3[e4.profile.key] = r3 : delete t3[e4.profile.key];
      }
      return t3;
    }), h2([]));
  }, D2 = async () => {
    if (!e2 || w2.length || b2.length < 1) {
      h2(w2);
      return;
    }
    if (C2.length) {
      h2([`Canl\u0131 de\u011Ferlerden biri bu taslak haz\u0131rlan\u0131rken de\u011Fi\u015Fti. Canl\u0131 de\u011Feri y\xFCkle veya alan\u0131 yeniden yazarak bilin\xE7li \u015Fekilde yeni bir taslak olu\u015Ftur.`]);
      return;
    }
    let t3 = b2.map((e3) => ({ key: e3.profile.key, maxHpVersion: e3.maxHpChanged ? e3.maxHpDraft?.version : void 0, hitDamageVersion: e3.hitDamageChanged ? e3.hitDamageDraft?.version : void 0 })), r3 = await n2({ action: `save_monster_balance`, expectedRevision: e2.revision, profiles: b2.map(({ profile: e3, maxHp: t4, hitDamage: n3, maxHpChanged: r4, hitDamageChanged: i3 }) => ({ key: e3.key, ...r4 ? { maxHp: t4 } : {}, ...i3 ? { hitDamage: n3 } : {} })) });
    r3 && (s2((e3) => {
      let n3 = { ...e3 };
      for (let e4 of t3) {
        let t4 = n3[e4.key];
        if (!t4) continue;
        let i3 = { ...t4 }, a3 = r3.monsterBalance.profiles.find((t5) => t5.key === e4.key);
        e4.maxHpVersion !== void 0 && (i3.maxHp?.version === e4.maxHpVersion ? delete i3.maxHp : i3.maxHp && a3 && (i3.maxHp = { ...i3.maxHp, baseRevision: r3.monsterBalance.revision, baseValue: a3.maxHp })), e4.hitDamageVersion !== void 0 && (i3.hitDamage?.version === e4.hitDamageVersion ? delete i3.hitDamage : i3.hitDamage && a3 && (i3.hitDamage = { ...i3.hitDamage, baseRevision: r3.monsterBalance.revision, baseValue: a3.hitDamage })), Object.keys(i3).length ? n3[e4.key] = i3 : delete n3[e4.key];
      }
      return n3;
    }), h2([]));
  };
  return (0, Z.jsxs)(`section`, { className: `admin-card monster-balance-admin`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(de, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Canavar Can\u0131 ve Vuru\u015F Hasar\u0131` }), (0, Z.jsx)(`p`, { children: `\xC7arpan yok: oyunda kullan\u0131lacak kesin can\u0131 ve z\u0131rh \xF6ncesi tek vuru\u015F hasar\u0131n\u0131 do\u011Frudan yaz.` })] })] }), (0, Z.jsxs)(`div`, { className: `monster-balance-tabs`, role: `tablist`, "aria-label": `Canavar b\xF6lgesi`, children: [(0, Z.jsxs)(`button`, { type: `button`, className: i2 === `forest` ? `active` : ``, onClick: () => a2(`forest`), children: [(0, Z.jsx)(ot, {}), ` Kuzey Orman\u0131`] }), (0, Z.jsxs)(`button`, { type: `button`, className: i2 === `frozen` ? `active` : ``, onClick: () => a2(`frozen`), children: [(0, Z.jsx)(S, {}), ` Donmu\u015F \xC7am`] }), (0, Z.jsxs)(`button`, { type: `button`, className: i2 === `black` ? `active` : ``, onClick: () => a2(`black`), children: [(0, Z.jsx)(de, {}), ` Kara B\xF6lge`] }), (0, Z.jsxs)(`button`, { type: `button`, className: i2 === `ancient` ? `active` : ``, onClick: () => {
    a2(`ancient`), l2(`normal`);
  }, children: [(0, Z.jsx)(ot, {}), ` Kadim K\xF6k Vadisi`] }), (0, Z.jsxs)(`button`, { type: `button`, className: i2 === `afk` ? `active` : ``, onClick: () => {
    a2(`afk`), l2(`normal`);
  }, children: [(0, Z.jsx)(ot, {}), ` Otomatik Av Adas\u0131`] }), (0, Z.jsxs)(`span`, { children: [`Revizyon `, e2?.revision ?? 0] })] }), i2 === `black` && (0, Z.jsxs)(`div`, { className: `monster-balance-bulk`, children: [(0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`strong`, { children: `Kara B\xF6lge \xB7 Tecr\xFCbe \xF6d\xFCl\xFC` }), (0, Z.jsx)(`small`, { children: `Bu temel EXP / TP de\u011Feri, b\xFCt\xFCn kanallardaki Kara B\xF6lge canavarlar\u0131na uygulan\u0131r. Grup payla\u015F\u0131m\u0131 ve tecr\xFCbe bonuslar\u0131 ayr\u0131ca hesaplan\u0131r.` })] }), (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: `Canavar ba\u015F\u0131na EXP / TP` }), (0, Z.jsx)(`input`, { type: `number`, min: 0, max: 1e6, step: 1, value: r2.value, onChange: (e3) => r2.change(Number(e3.target.value)) })] }), (0, Z.jsxs)(`button`, { type: `button`, disabled: t2 || !r2.dirty || !Number.isSafeInteger(r2.value) || r2.value < 0 || r2.value > 1e6, onClick: r2.save, children: [(0, Z.jsx)(Q, {}), ` EXP Kaydet`] })] }), (0, Z.jsxs)(`div`, { className: `monster-balance-bulk`, children: [(0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`strong`, { children: i2 === `black` ? `8 canavar\u0131 toplu ayarla` : `Bir kademeyi toplu ayarla` }), (0, Z.jsx)(`small`, { children: i2 === `black` ? `De\u011Ferler t\xFCm kanallardaki ayn\u0131 numaral\u0131 canavarlara uygulan\u0131r.` : `\xD6rnek: Normal se\xE7, hasara 5 yaz; \xFC\xE7 normal yarat\u0131\u011Fa birden uygula.` })] }), (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: `Kademe` }), (0, Z.jsxs)(`select`, { disabled: i2 === `black` || i2 === `ancient` || i2 === `afk`, value: i2 === `black` ? `katil` : i2 === `ancient` ? `normal` : c2, onChange: (e3) => l2(e3.target.value), children: [(0, Z.jsx)(`option`, { value: `normal`, children: `Normal` }), (0, Z.jsx)(`option`, { value: `agresif`, children: `Agresif` }), (0, Z.jsx)(`option`, { value: `katil`, children: `Katil` })] })] }), (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: `Can \xB7 bo\u015F b\u0131rak\u0131labilir` }), (0, Z.jsx)(`input`, { type: `number`, inputMode: `numeric`, min: 1, max: 1e7, step: 1, value: u2, onChange: (e3) => d2(e3.target.value), placeholder: `De\u011Fi\u015Ftirme` })] }), (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: `Hasar \xB7 bo\u015F b\u0131rak\u0131labilir` }), (0, Z.jsx)(`input`, { type: `number`, inputMode: `numeric`, min: 1, max: 1e6, step: 1, value: f2, onChange: (e3) => p2(e3.target.value), placeholder: `\xD6rn. 5` })] }), (0, Z.jsx)(`button`, { type: `button`, onClick: T2, children: `Sat\u0131rlara Uygula` })] }), C2.length > 0 && (0, Z.jsxs)(`div`, { className: `monster-balance-conflict`, children: [(0, Z.jsxs)(`p`, { children: [(0, Z.jsx)(`strong`, { children: `Canl\u0131 de\u011Fer de\u011Fi\u015Fti.` }), ` `, C2.slice(0, 3).map((e3) => `${e3.profile.label} ${e3.field === `maxHp` ? `can` : `hasar`}: canl\u0131 ${e3.profile[e3.field]}, taslak ${e3.draft.value}`).join(` \xB7 `), C2.length > 3 ? ` \xB7 +${C2.length - 3} alan` : ``] }), (0, Z.jsxs)(`button`, { type: `button`, disabled: t2, onClick: E2, children: [(0, Z.jsx)(je, {}), ` \xC7ak\u0131\u015Fan Canl\u0131 De\u011Ferleri Y\xFCkle`] })] }), (0, Z.jsxs)(`div`, { className: `monster-balance-table`, role: `table`, "aria-label": `${i2 === `black` ? `Kara B\xF6lge` : i2 === `forest` ? `Kuzey Orman\u0131` : `Donmu\u015F \xC7am`} canavar dengesi`, children: [(0, Z.jsxs)(`div`, { className: `monster-balance-row header`, role: `row`, children: [(0, Z.jsx)(`span`, { children: `Canavar` }), (0, Z.jsx)(`span`, { children: `Kademe` }), (0, Z.jsx)(`span`, { children: `Kesin can` }), (0, Z.jsx)(`span`, { children: `Z\u0131rh \xF6ncesi hasar` })] }), g2.map((e3) => (0, Z.jsxs)(`div`, { className: `monster-balance-row variant-${e3.variant}`, role: `row`, children: [(0, Z.jsx)(`strong`, { children: e3.label.split(` \xB7 `)[0] }), (0, Z.jsx)(`span`, { className: `monster-tier`, children: e3.variant === `katil` ? `Katil` : e3.variant === `agresif` ? `Agresif` : `Normal` }), (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: `Can` }), (0, Z.jsx)(`input`, { type: `number`, inputMode: `numeric`, min: 1, max: 1e7, step: 1, value: _2(e3, `maxHp`), onChange: (t3) => v2(e3, `maxHp`, t3.target.value) })] }), (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: `Hasar` }), (0, Z.jsx)(`input`, { type: `number`, inputMode: `numeric`, min: 1, max: 1e6, step: 1, value: _2(e3, `hitDamage`), onChange: (t3) => v2(e3, `hitDamage`, t3.target.value) })] })] }, e3.key))] }), (m2.length > 0 || w2.length > 0) && (0, Z.jsx)(`p`, { className: `monster-balance-errors`, children: Array.from(/* @__PURE__ */ new Set([...m2, ...w2])).join(` `) }), (0, Z.jsxs)(`div`, { className: `monster-balance-footer`, children: [(0, Z.jsx)(`p`, { children: `Yaln\u0131z de\u011Fi\u015Ftirdi\u011Fin alanlar kaydedilir; can yazmak hasar\u0131, hasar yazmak can\u0131 de\u011Fi\u015Ftirmez. Ya\u015Fayan canavarlar\u0131n can y\xFCzdesi korunur, \xF6l\xFC canavar dirilmez.` }), (0, Z.jsxs)(`button`, { type: `button`, className: `admin-primary`, disabled: t2 || !e2 || C2.length > 0 || w2.length > 0 || b2.length < 1, onClick: () => void D2(), children: [(0, Z.jsx)(Q, {}), ` `, x2 > 0 ? `${x2} Alan\u0131 Kaydet` : `De\u011Fi\u015Fiklik Yok`] })] })] });
}
function fn({ lootEventPercent: e2, records: t2, templates: n2, busy: r2, act: i2 }) {
  let [a2, o2] = (0, X.useState)(``), [s2, c2] = (0, X.useState)(null), [l2, u2] = (0, X.useState)(null), [d2, f2] = (0, X.useState)([]), [m2, h2] = (0, X.useState)([]), [g2, _2] = (0, X.useState)(``), [v2, b2] = (0, X.useState)(``), [x2, C2] = (0, X.useState)([]), T2 = t2.find((e3) => e3.sourceKey === a2), E2 = n2.find((e3) => e3.id === v2) ?? null, D2 = (0, X.useRef)(null), O2 = (0, X.useRef)(null), k2 = (0, X.useRef)(0), A2 = !!(T2 && l2?.sourceKey === T2.sourceKey && l2.revision !== T2.revision), j2 = s2 ? he(s2) : null, M2 = !!s2?.key.startsWith(`boss.`), N2 = s2 ? re(s2) : 0, ee2 = Math.min(1e6, Math.round(N2 * (1 + e2 / 100))), te2 = Math.min(1e6, Math.round(N2 * 1.5 * (1 + e2 / 100))), P2 = !!(s2 && l2?.sourceKey === a2 && JSON.stringify(s2.groups) !== JSON.stringify(l2.profile.groups)), ne2 = [`forest`, `frozen`, `ancient`, `boss`, `sinsi`, `black`], F2 = Qt(a2 || t2[0]?.sourceKey || `forest`), ie2 = t2.filter((e3) => Qt(e3.sourceKey) === F2), ae2 = (s2?.groups.flatMap((e3) => e3.outcomes.filter((e4) => e4.item.type === `resource`).map((t3) => ({ group: e3, outcome: t3 }))) ?? []).find(({ outcome: e3 }) => e3.item.type === `resource` && e3.item.kind === `essence`), se2 = !!(s2 && be(s2.key)), I2 = (0, X.useCallback)((e3) => {
    k2.current += 1, c2((t3) => {
      let n3 = typeof e3 == `function` ? e3(t3) : e3;
      return D2.current = n3, n3;
    });
  }, []), L2 = (0, X.useCallback)((e3, t3) => {
    h2((n3) => {
      let r3 = n3.includes(e3);
      return t3 ? r3 ? n3.filter((t4) => t4 !== e3) : n3 : r3 ? n3 : [...n3, e3];
    });
  }, []), R2 = (0, X.useCallback)((e3) => {
    let t3 = B(Zt(e3.profile)), n3 = he(t3), r3 = fe(t3, e3.sourceKey.startsWith(`boss.`) ? oe(n3, 1e6) : n3), i3 = Zt(r3), a3 = Zt(r3);
    k2.current += 1;
    let o3 = { sourceKey: e3.sourceKey, revision: e3.revision, profile: i3 };
    O2.current = o3, D2.current = a3, u2(o3), c2(a3), h2([]);
  }, []), z2 = (0, X.useCallback)((e3, t3) => {
    if (t3) {
      let t4 = { sourceKey: e3.sourceKey, revision: e3.revision, profile: Zt(e3.profile) };
      O2.current = t4, u2(t4);
    } else R2(e3);
  }, [R2]);
  (0, X.useEffect)(() => {
    if (t2.length < 1 || a2 && t2.some((e4) => e4.sourceKey === a2)) return;
    let e3 = window.setTimeout(() => {
      o2(t2[0].sourceKey), C2([t2[0].sourceKey]);
    }, 0);
    return () => window.clearTimeout(e3);
  }, [t2, a2]), (0, X.useEffect)(() => {
    if (!T2) return;
    let e3 = window.setTimeout(() => {
      let e4 = O2.current, t3 = D2.current;
      t3 && e4?.sourceKey === T2.sourceKey && JSON.stringify(t3.groups) !== JSON.stringify(e4.profile.groups) || R2(T2);
    }, 0);
    return () => window.clearTimeout(e3);
  }, [R2, T2]), (0, X.useEffect)(() => {
    if (n2.length < 1) {
      if (!v2) return;
      let e4 = window.setTimeout(() => b2(``), 0);
      return () => window.clearTimeout(e4);
    }
    if (n2.some((e4) => e4.id === v2)) return;
    let e3 = window.setTimeout(() => b2(n2[0].id), 0);
    return () => window.clearTimeout(e3);
  }, [n2, v2]);
  let V2 = (e3) => {
    if (r2 || e3 !== a2 && P2 && !window.confirm(`Bu profilde kaydedilmemi\u015F de\u011Fi\u015Fiklikler var. Ba\u015Fka canavara ge\xE7ilsin mi?`)) return;
    let n3 = t2.find((t3) => t3.sourceKey === e3);
    o2(e3), C2([e3]), n3 && R2(n3), f2([]);
  }, de2 = (e3, t3) => {
    if (!s2 || !j2 || !Number.isFinite(t3)) return;
    let n3 = $t(t3), r3 = j2[e3.main], i3 = e3.accessory ? j2[e3.accessory] : 0, a3 = e3.accessory ? Math.round(n3 * (r3 + i3 ? r3 / (r3 + i3) : 0.75)) : n3, o3 = { ...j2, [e3.main]: a3 };
    if (e3.accessory && (o3[e3.accessory] = n3 - a3), M2) {
      let e4 = ce(o3) - o3.white_main - o3.white_accessory;
      if (e4 > 1e6) {
        f2([`Renk oranlar\u0131 %100'\xFC a\u015Famaz. Ba\u015Fka bir rengi azalt.`]);
        return;
      }
      let t4 = 1e6 - e4, n4 = o3.white_main + o3.white_accessory;
      o3.white_main = Math.round(t4 * (n4 ? o3.white_main / n4 : 0.75)), o3.white_accessory = t4 - o3.white_main;
    }
    I2(fe(s2, o3)), f2([]);
  }, H2 = (e3, t3) => {
    if (!s2 || !Number.isFinite(t3)) return;
    let n3 = Math.max(1, Math.min(1e6, Math.round(t3)));
    I2({ ...s2, groups: s2.groups.map((t4) => ({ ...t4, outcomes: t4.outcomes.map((t5) => t5.item.type === `resource` && t5.item.kind === `essence` ? { ...t5, [e3]: n3, ...e3 === `minAmount` && n3 > t5.maxAmount ? { maxAmount: n3 } : {}, ...e3 === `maxAmount` && n3 < t5.minAmount ? { minAmount: n3 } : {} } : t5) })) }), f2([]);
  }, U2 = (() => {
    if (!s2) return [];
    if (m2.length > 0) return [`Oranlar\u0131 0\u2013100 aras\u0131nda, miktarlar\u0131 1\u20131.000.000 aras\u0131nda tam say\u0131 olarak yaz.`];
    if (N2 > 1e6) return [`Kesim ba\u015F\u0131 renk oranlar\u0131n\u0131n toplam\u0131 %100'\xFC a\u015Famaz.`];
    let e3 = _e(s2.key, s2);
    return e3.ok ? [] : e3.errors;
  })(), W2 = (e3, t3) => {
    I2((n3) => n3 && ue(n3, e3, { ...Ce(n3, e3), ...t3 })), f2([]);
  }, me2 = async () => {
    let e3 = O2.current;
    if (!s2 || !T2 || !e3 || e3.sourceKey !== T2.sourceKey) return;
    if (e3.revision !== T2.revision) {
      f2([`Canl\u0131 profil r` + T2.revision + `, bu taslak r` + e3.revision + ` temelinde. \xD6nce canl\u0131 s\xFCr\xFCm\xFC y\xFCkle veya tasla\u011F\u0131 \u015Fablon olarak sakla.`]);
      return;
    }
    if (U2.length) {
      f2(U2);
      return;
    }
    let t3 = k2.current, n3 = e3.sourceKey, r3 = await i2({ action: `save_loot_profile`, sourceKey: n3, expectedRevision: e3.revision, profile: s2 });
    if (r3 && O2.current?.sourceKey === n3) {
      let e4 = r3.lootProfiles.find((e5) => e5.sourceKey === n3);
      e4 && z2(e4, k2.current !== t3), f2([]);
    }
  }, ge2 = async () => {
    let e3 = O2.current;
    if (!T2 || !e3 || e3.sourceKey !== T2.sourceKey) return;
    if (e3.revision !== T2.revision) {
      f2([`Canl\u0131 profil r` + T2.revision + `, bu taslak r` + e3.revision + ` temelinde. S\u0131f\u0131rlamadan \xF6nce canl\u0131 s\xFCr\xFCm\xFC y\xFCkle.`]);
      return;
    }
    let t3 = k2.current, n3 = e3.sourceKey, r3 = await i2({ action: `reset_loot_profile`, sourceKey: n3, expectedRevision: e3.revision }, T2.profile.label + ` i\xE7in \xF6zel d\xFC\u015F\xFC\u015F ayarlar\u0131 silinip g\xFCvenli oyun varsay\u0131lan\u0131na d\xF6n\xFCls\xFCn m\xFC?`);
    if (r3 && O2.current?.sourceKey === n3) {
      let e4 = r3.lootProfiles.find((e5) => e5.sourceKey === n3);
      e4 && z2(e4, k2.current !== t3), f2([]);
    }
  }, ve2 = () => {
    T2 && (P2 && !window.confirm(`Kaydedilmemi\u015F taslak silinip canl\u0131 profil y\xFCklensin mi? Tasla\u011F\u0131 korumak istiyorsan \xF6nce \u015Fablon olarak kaydet.`) || (R2(T2), f2([])));
  }, ye2 = async () => {
    if (!s2) return;
    let e3 = g2.trim();
    if (!e3) {
      f2([`\u015Eablona anla\u015F\u0131l\u0131r bir ad ver.`]);
      return;
    }
    if (U2.length) {
      f2(U2);
      return;
    }
    await i2({ action: `save_loot_template`, templateName: e3, sourceKey: s2.key, groups: s2.groups }) && (_2((t3) => t3.trim() === e3 ? `` : t3), f2([]));
  }, xe2 = () => {
    if (!s2 || !E2 || r2 || P2 && !window.confirm(`Kaydedilmemi\u015F taslak de\u011Fi\u015Fikliklerinin yerine se\xE7ili \u015Fablon y\xFCklensin mi?`)) return;
    if (!rn(E2.groups)) {
      f2([`Bu eski \u015Fablon tek ekipman tablosuna g\xFCvenle d\xF6n\xFC\u015Ft\xFCr\xFClemiyor.`]);
      return;
    }
    let e3 = fe(s2, he(B(le({ ...s2, groups: E2.groups })))), t3 = _e(s2.key, e3);
    if (!t3.ok) {
      f2([`Bu eski \u015Fablon se\xE7ili canavar\u0131n g\xFCvenli tek-ekipman d\xFCzeniyle uyumlu de\u011Fil.`, ...t3.errors]);
      return;
    }
    I2(t3.profile), h2([]), f2([]);
  }, Se2 = async () => {
    if (!E2 || !x2.length) {
      f2([`\u015Eablon ve en az bir hedef canavar se\xE7.`]);
      return;
    }
    if (!rn(E2.groups)) {
      f2([`Bu eski \u015Fablon tek ekipman tablosuna g\xFCvenle d\xF6n\xFC\u015Ft\xFCr\xFClemiyor.`]);
      return;
    }
    let e3 = he({ version: 1, key: t2[0]?.sourceKey ?? `forest.golge.normal`, label: E2.name, groups: E2.groups }), n3 = x2.flatMap((n4) => {
      let r4 = t2.find((e4) => e4.sourceKey === n4);
      if (!r4) return [n4 + `: Canl\u0131 profil bulunamad\u0131.`];
      let i3 = _e(n4, fe(r4.profile, e3));
      return i3.ok ? [] : [r4.profile.label + `: ` + i3.errors[0]];
    });
    if (n3.length) {
      f2([`\u015Eablon se\xE7ili hedeflerin g\xFCvenli ganimet d\xFCzeniyle uyumlu de\u011Fil.`, ...n3]);
      return;
    }
    let r3 = x2.map((e4) => t2.find((t3) => t3.sourceKey === e4)?.profile.label ?? e4), a3 = x2.flatMap((e4) => {
      let n4 = t2.find((t3) => t3.sourceKey === e4);
      return n4 ? [{ sourceKey: e4, expectedRevision: n4.revision }] : [];
    });
    if (a3.length !== x2.length) {
      f2([`Hedeflerden biri art\u0131k bulunam\u0131yor. Canl\u0131 veriyi yenileyip tekrar se\xE7.`]);
      return;
    }
    await i2({ action: `apply_loot_template`, templateId: E2.id, templateRevision: E2.revision, targets: a3 }, `\u201C` + E2.name + `\u201D ekipman oranlar\u0131 ` + r3.length + ` profile uygulanacak. Hedeflerin Ya\u015Fam \xD6z\xFC ve \xF6zel kaynak miktarlar\u0131 de\u011Fi\u015Fmeyecek. Devam edilsin mi?`) && f2([]);
  }, we2 = async () => {
    E2 && await i2({ action: `delete_loot_template`, templateId: E2.id, templateRevision: E2.revision }, `\u201C` + E2.name + `\u201D \u015Fablonu silinsin mi? Canl\u0131ya daha \xF6nce uygulanm\u0131\u015F profiller de\u011Fi\u015Fmez.`) && f2([]);
  };
  return (0, Z.jsxs)(`section`, { className: `admin-card loot-profile-admin`, children: [(0, Z.jsxs)(`div`, { className: `admin-card-title`, children: [(0, Z.jsx)(y, {}), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`h2`, { children: `Canavar ve Boss Ganimetleri` }), (0, Z.jsx)(`p`, { children: `Normal canavarda her rengin kesim ba\u015F\u0131 \u015Fans\u0131n\u0131 do\u011Frudan belirle; toplam\u0131 %100'\xFC a\u015Famaz. Bosslar\u0131n her biri en az 3 ekipman verir, renk oranlar\u0131 her \xF6d\xFCl i\xE7in ge\xE7erlidir. Ya\u015Fam \xD6z\xFC ayr\u0131 ve garantidir.` })] })] }), t2.length < 1 ? (0, Z.jsx)(`div`, { className: `loot-profile-empty`, children: `Ganimet profilleri y\xFCkleniyor\u2026` }) : (0, Z.jsxs)(Z.Fragment, { children: [(0, Z.jsx)(`div`, { className: `loot-area-tabs`, role: `group`, "aria-label": `Ganimet b\xF6lgesi`, children: ne2.map((e3) => {
    let n3 = t2.find((t3) => Qt(t3.sourceKey) === e3);
    return n3 ? (0, Z.jsxs)(`button`, { type: `button`, "aria-pressed": F2 === e3, className: F2 === e3 ? `active` : ``, disabled: r2, onClick: () => V2(n3.sourceKey), children: [e3 === `frozen` && (0, Z.jsx)(S, {}), Xt[e3]] }, e3) : null;
  }) }), (0, Z.jsxs)(`div`, { className: `loot-profile-toolbar simple`, children: [(0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: F2 === `boss` ? `Boss` : `Canavar ve kademe` }), (0, Z.jsx)(`select`, { value: a2, disabled: r2, onChange: (e3) => V2(e3.target.value), children: ie2.map((e3) => (0, Z.jsx)(`option`, { value: e3.sourceKey, children: e3.profile.label }, e3.sourceKey)) })] }), (0, Z.jsxs)(`div`, { className: `loot-profile-state`, children: [(0, Z.jsx)(`span`, { className: T2?.customized ? `custom` : ``, children: T2?.customized ? `\xD6ZEL PROF\u0130L` : `OYUN VARSAYILANI` }), (0, Z.jsxs)(`span`, { children: [`Canl\u0131 r`, T2?.revision ?? 0] }), A2 && (0, Z.jsxs)(`span`, { className: `stale`, children: [`Taslak r`, l2?.revision ?? 0] })] })] }), s2 ? (0, Z.jsxs)(`div`, { className: `loot-profile-editor`, children: [A2 && (0, Z.jsxs)(`div`, { className: `loot-profile-conflict`, children: [(0, Z.jsxs)(`p`, { children: [(0, Z.jsx)(`strong`, { children: `Canl\u0131 profil bu taslaktan sonra de\u011Fi\u015Fti.` }), ` Eski taslak yeni revizyonun \xFCzerine sessizce yaz\u0131lamaz. Tasla\u011F\u0131 korumak istiyorsan \xF6nce \u015Fablon yap; ard\u0131ndan canl\u0131 s\xFCr\xFCm\xFC y\xFCkle.`] }), (0, Z.jsxs)(`button`, { type: `button`, disabled: r2, onClick: ve2, children: [(0, Z.jsx)(je, {}), ` Canl\u0131 S\xFCr\xFCm\xFC Y\xFCkle / Tasla\u011F\u0131 Sil`] })] }), (0, Z.jsxs)(`section`, { className: `loot-direct-overview`, children: [(0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`small`, { children: M2 ? `BOSS \xD6D\xDCL\xDC` : `KES\u0130M BA\u015EINA EK\u0130PMAN` }), (0, Z.jsxs)(`strong`, { children: [`%`, $(M2 ? 1e6 : N2)] }), (0, Z.jsx)(`p`, { children: M2 ? `Her katk\u0131 sa\u011Flayan oyuncuya en az 3 ekipman. A\u015Fa\u011F\u0131daki y\xFCzdeler her bir \xF6d\xFCl\xFCn rengini belirler.` : `A\u015Fa\u011F\u0131daki d\xF6rt rengin toplam\u0131. Kalan olas\u0131l\u0131kta ekipman d\xFC\u015Fmez; Ya\u015Fam \xD6z\xFC yine gelir.` })] }), (0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`small`, { children: M2 ? `ETK\u0130NL\u0130K` : `EK\u0130PMAN D\xDC\u015EMEME` }), (0, Z.jsx)(`strong`, { children: M2 ? `+%${e2}` : `%${$(1e6 - N2)}` }), (0, Z.jsx)(`p`, { children: M2 ? `Etkinlik ek \xF6d\xFCl \xE7ekili\u015Fleri sa\u011Flar.` : `Normal canavar kesim ba\u015F\u0131na en fazla bir ekipman verir. Her kesim ba\u011F\u0131ms\u0131zd\u0131r.` })] })] }), (0, Z.jsxs)(`section`, { className: `loot-direct-rates`, "aria-label": `Ger\xE7ek ekipman d\xFC\u015Fme oranlar\u0131`, children: [(0, Z.jsxs)(`header`, { children: [(0, Z.jsx)(`strong`, { children: M2 ? `Her boss \xF6d\xFCl\xFCn\xFCn rengi` : `Her kesimde renk \u015Fans\u0131` }), (0, Z.jsx)(`p`, { children: M2 ? `K\u0131rm\u0131z\u0131, turuncu ve maviyi ayarla. Beyaz kalan pay\u0131 otomatik tamamlar; toplam %100'd\xFCr.` : `Y\xFCzdeleri do\u011Frudan yaz. \xD6rne\u011Fin turuncu %2 ise ortalama 100 kesimin 2'sinde turuncu ekipman \xE7\u0131kar. Toplam en fazla %100 olabilir.` })] }), (0, Z.jsx)(`div`, { className: `loot-direct-rate-grid`, children: j2 && nn.slice().reverse().map((e3) => {
    let t3 = j2[e3.main] + (e3.accessory ? j2[e3.accessory] : 0);
    return (0, Z.jsxs)(`label`, { className: `loot-direct-rate rarity-${e3.rarity}`, children: [(0, Z.jsxs)(`span`, { children: [(0, Z.jsx)(`strong`, { children: e3.label }), (0, Z.jsx)(`small`, { children: M2 ? `\xD6d\xFCl ba\u015F\u0131na` : `Kesim ba\u015F\u0131na` })] }), (0, Z.jsxs)(`span`, { className: `loot-direct-rate-input`, children: [(0, Z.jsx)(tn, { fieldId: e3.main, value: $(t3), disabled: r2 || M2 && e3.rarity === `white`, invalid: m2.includes(e3.main), onValidityChange: L2, onCommit: (t4) => de2(e3, t4) }), (0, Z.jsx)(`b`, { children: `%` })] })] }, e3.rarity);
  }) }), !M2 && (0, Z.jsxs)(`p`, { className: `loot-direct-feedback`, children: [`Temel toplam `, (0, Z.jsxs)(`b`, { children: [`%`, $(N2)] }), ` \xB7 Etkinlikle `, (0, Z.jsxs)(`b`, { children: [`%`, $(ee2)] }), ` \xB7 T\u0131ls\u0131m ve etkinlikle `, (0, Z.jsxs)(`b`, { children: [`%`, $(te2)] }), `. T\u0131ls\u0131m ve etkinlik renklerin birbirine oran\u0131n\u0131 de\u011Fi\u015Ftirmez. Kuzey Orman\u0131 seviye azalt\u0131m\u0131 ayr\u0131ca uygulan\u0131r.`] }), (M2 || s2.key.startsWith(`ancient.`)) && (0, Z.jsx)(`p`, { className: `loot-direct-feedback`, children: `Mor e\u015Fya \u015Fans\u0131 \u201CMor E\u015Fya \xB7 K\xF6k Vadisi ve Bosslar\u201D kart\u0131ndan ayr\u0131ca ayarlan\u0131r. K\xF6k Vadisi\u2019nin \xFC\xE7 normal canavar\u0131, Kadim K\xF6k\xFCn Muhaf\u0131z\u0131 ve D\xFCnya Bossu i\xE7in ayr\u0131 oranlar vard\u0131r.` }), (0, Z.jsx)(`p`, { className: `loot-direct-feedback`, children: `T\xFCr paylar\u0131 mevcut profilden korunur. Kask yaln\u0131z ilgili \xF6zel ganimetlerde bulunur. Bossun \xFC\xE7 garanti \xF6d\xFCl\xFC, Ya\u015Fam \xD6z\xFC ve ba\u011F\u0131ms\u0131z malzemeler de\u011Fi\u015Fmez. Oyuncu bilgi kart\u0131nda etkin bonuslarla g\xFCncel ger\xE7ek oranlar\u0131 g\xF6r\xFCr.` }), m2.some((e3) => !e3.startsWith(`material-`)) && (0, Z.jsx)(`p`, { className: `loot-budget-error`, role: `alert`, children: `0 ile 100 aras\u0131nda ge\xE7erli bir y\xFCzde yaz; virg\xFCl kullanabilirsin.` }), N2 > 1e6 && (0, Z.jsxs)(`p`, { className: `loot-budget-error`, role: `alert`, children: [`Renklerin toplam\u0131 %`, $(N2), `. Kaydetmeden \xF6nce toplam\u0131 %100'e indir.`] })] }), (0, Z.jsxs)(`section`, { className: `loot-guaranteed-strip loot-essence-editor`, children: [(0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(p, {}), (0, Z.jsxs)(`span`, { children: [(0, Z.jsx)(`small`, { children: `HER KES\u0130MDE` }), (0, Z.jsx)(`strong`, { children: `Ya\u015Fam \xD6z\xFC %100 garanti` }), (0, Z.jsx)(`p`, { children: `Bu canavar veya bosstan d\xFC\u015Fecek miktar\u0131 belirle.` })] })] }), ae2 && (0, Z.jsxs)(`div`, { className: `loot-essence-fields`, children: [(0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: `En az \xD6z` }), (0, Z.jsx)(tn, { amount: true, fieldId: `essence-min`, value: ae2.outcome.minAmount, disabled: r2, invalid: m2.includes(`essence-min`), onValidityChange: L2, onCommit: (e3) => H2(`minAmount`, e3) })] }), (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: `En \xE7ok \xD6z` }), (0, Z.jsx)(tn, { amount: true, fieldId: `essence-max`, value: ae2.outcome.maxAmount, disabled: r2, invalid: m2.includes(`essence-max`), onValidityChange: L2, onCommit: (e3) => H2(`maxAmount`, e3) })] })] })] }), se2 && (0, Z.jsxs)(`section`, { className: `loot-chance-table loot-material-table`, "aria-label": `Boss ve Sinsi Ta\u015F \xF6zel malzemeleri`, children: [(0, Z.jsxs)(`header`, { children: [(0, Z.jsxs)(`div`, { children: [(0, Z.jsx)(`strong`, { children: `\u0130nci ve Sinsi Ta\u015F Tozu` }), (0, Z.jsx)(`small`, { children: `Yaln\u0131z se\xE7ili boss veya Sinsi Ta\u015F i\xE7in ge\xE7erlidir. Etkinlik bonusu bu temel oranlar\u0131 ayr\u0131ca art\u0131r\u0131r.` })] }), (0, Z.jsx)(`span`, { children: `Kesim ba\u015F\u0131` })] }), pe.map((e3) => {
    let t3 = Ce(s2, e3);
    return (0, Z.jsxs)(`div`, { className: `loot-material-row`, children: [(0, Z.jsxs)(`strong`, { children: [e3 === `pearl` ? (0, Z.jsx)(p, {}) : (0, Z.jsx)(y, {}), ` `, e3 === `pearl` ? `\u0130nci` : `Sinsi Ta\u015F Tozu`, (0, Z.jsx)(`small`, { children: t3.chancePpm === 0 ? `Kapal\u0131 \xB7 d\xFC\u015Fmez` : `%${$(t3.chancePpm)} \xB7 ${t3.minAmount}\u2013${t3.maxAmount} adet` })] }), (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: `D\xFC\u015Fme \u015Fans\u0131 (%)` }), (0, Z.jsx)(tn, { fieldId: `material-${e3}-chance`, value: $(t3.chancePpm), disabled: r2, invalid: m2.includes(`material-${e3}-chance`), onValidityChange: L2, onCommit: (t4) => W2(e3, { chancePpm: $t(t4) }) })] }), (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: `En az adet` }), (0, Z.jsx)(tn, { amount: true, fieldId: `material-${e3}-min`, value: t3.minAmount, disabled: r2, invalid: m2.includes(`material-${e3}-min`), onValidityChange: L2, onCommit: (t4) => W2(e3, { minAmount: t4 }) })] }), (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: `En \xE7ok adet` }), (0, Z.jsx)(tn, { amount: true, fieldId: `material-${e3}-max`, value: t3.maxAmount, disabled: r2, invalid: m2.includes(`material-${e3}-max`), onValidityChange: L2, onCommit: (t4) => W2(e3, { maxAmount: t4 }) })] })] }, `${s2.key}-${e3}`);
  }), (0, Z.jsx)(`p`, { className: `loot-chance-note`, children: `%0: hi\xE7 d\xFC\u015Fmez \xB7 %100: garanti. Sabit miktar i\xE7in iki adet alan\u0131na ayn\u0131 say\u0131y\u0131 yaz. \u0130nci ve toz birbirinden ve ekipmandan ba\u011F\u0131ms\u0131zd\u0131r; t\u0131ls\u0131m oranlar\u0131n\u0131 de\u011Fi\u015Ftirmez. Normal canavarlardan d\xFC\u015Fmez. Ekipman \u015Fablonlar\u0131 bu ayarlar\u0131 de\u011Fi\u015Ftirmez.` })] }), F2 === `frozen` && (0, Z.jsxs)(`p`, { className: `loot-zone-note`, children: [(0, Z.jsx)(S, {}), ` Donmu\u015F \xC7am varsay\u0131lanlar\u0131 Kuzey Orman\u0131\u2019ndan %10 daha y\xFCksektir.`] }), F2 === `boss` && (0, Z.jsxs)(`p`, { className: `loot-zone-note`, children: [(0, Z.jsx)(w, {}), ` Her boss ayr\u0131 kaydedilir. Katk\u0131 sa\u011Flayan her oyuncuya \xF6z d\u0131\u015F\u0131nda 3 ekipman verilir. Ekipman oranlar\u0131 her \xE7ekili\u015Fte toplam %100\u2019e \xF6l\xE7eklenir; t\xFCm\xFC s\u0131f\u0131rsa beyaz ekipman d\xFC\u015Fer.`] }), (0, Z.jsxs)(`details`, { className: `loot-tools-details`, children: [(0, Z.jsxs)(`summary`, { children: [(0, Z.jsx)(it, {}), ` Oranlar\u0131 kaydet veya ba\u015Fka canavarlara uygula `, (0, Z.jsx)(`b`, { children: n2.length })] }), (0, Z.jsxs)(`div`, { className: `loot-tools-body`, children: [(0, Z.jsxs)(`div`, { className: `loot-template-create`, children: [(0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: `Yeni oran \u015Fablonunun ad\u0131` }), (0, Z.jsx)(`input`, { disabled: r2, value: g2, maxLength: 80, placeholder: `\xD6rn. Kuzey Orman\u0131 oranlar\u0131`, onChange: (e3) => _2(e3.target.value) })] }), (0, Z.jsxs)(`button`, { type: `button`, disabled: !s2 || !g2.trim() || r2 || U2.length > 0, onClick: () => void ye2(), children: [(0, Z.jsx)(Q, {}), ` Ekipman Oranlar\u0131n\u0131 Kaydet`] })] }), n2.length ? (0, Z.jsxs)(`div`, { className: `loot-template-use`, children: [(0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`span`, { children: `Kay\u0131tl\u0131 oran \u015Fablonu` }), (0, Z.jsx)(`select`, { disabled: r2, value: v2, onChange: (e3) => b2(e3.target.value), children: n2.map((e3) => (0, Z.jsxs)(`option`, { value: e3.id, children: [e3.name, ` \xB7 v`, e3.revision] }, e3.id)) })] }), (0, Z.jsxs)(`div`, { className: `loot-template-draft-actions`, children: [(0, Z.jsxs)(`button`, { type: `button`, disabled: r2 || !E2, onClick: xe2, children: [(0, Z.jsx)(it, {}), ` Se\xE7ili Tasla\u011Fa Y\xFCkle`] }), (0, Z.jsxs)(`button`, { type: `button`, className: `danger`, disabled: r2 || !E2, onClick: () => void we2(), children: [(0, Z.jsx)(pt, {}), ` Sil`] })] }), (0, Z.jsxs)(`details`, { className: `loot-template-targets`, children: [(0, Z.jsxs)(`summary`, { children: [`Canl\u0131 uygulanacak hedefleri se\xE7 `, (0, Z.jsx)(`b`, { children: x2.length })] }), (0, Z.jsxs)(`div`, { className: `loot-target-shortcuts`, children: [(0, Z.jsx)(`button`, { type: `button`, disabled: r2, onClick: () => C2(a2 ? [a2] : []), children: `Yaln\u0131z se\xE7ili` }), ne2.map((e3) => (0, Z.jsx)(`button`, { type: `button`, disabled: r2, onClick: () => C2(t2.filter((t3) => Qt(t3.sourceKey) === e3).map((e4) => e4.sourceKey)), children: Xt[e3] }, e3)), (0, Z.jsx)(`button`, { type: `button`, disabled: r2, onClick: () => C2(t2.map((e3) => e3.sourceKey)), children: `T\xFCm\xFC` }), (0, Z.jsx)(`button`, { type: `button`, disabled: r2, onClick: () => C2([]), children: `Temizle` })] }), (0, Z.jsx)(`div`, { className: `loot-target-grid`, children: t2.map((e3) => (0, Z.jsxs)(`label`, { children: [(0, Z.jsx)(`input`, { disabled: r2, type: `checkbox`, checked: x2.includes(e3.sourceKey), onChange: (t3) => C2((n3) => t3.target.checked ? [.../* @__PURE__ */ new Set([...n3, e3.sourceKey])] : n3.filter((t4) => t4 !== e3.sourceKey)) }), (0, Z.jsx)(`span`, { children: e3.profile.label })] }, e3.sourceKey)) }), (0, Z.jsxs)(`button`, { type: `button`, className: `admin-primary`, disabled: r2 || !E2 || !x2.length, onClick: () => void Se2(), children: [(0, Z.jsx)(Q, {}), ` Se\xE7ili Hedeflere Uygula (`, x2.length, `)`] })] })] }) : (0, Z.jsx)(`p`, { className: `loot-template-empty`, children: `Hen\xFCz kay\u0131tl\u0131 oran \u015Fablonu yok.` })] })] }), (0, Z.jsxs)(`div`, { className: `loot-profile-actions`, children: [(d2.length > 0 || U2.length > 0) && (0, Z.jsx)(`p`, { className: `loot-profile-errors`, role: `alert`, children: Array.from(/* @__PURE__ */ new Set([...d2, ...U2])).join(` `) }), (0, Z.jsxs)(`button`, { type: `button`, className: `admin-primary`, disabled: r2 || A2 || !P2 || U2.length > 0, onClick: () => void me2(), children: [(0, Z.jsx)(Q, {}), ` `, P2 ? `Bu Profili Canl\u0131 Oyuna Kaydet` : `Kaydedilecek De\u011Fi\u015Fiklik Yok`] }), (0, Z.jsxs)(`button`, { type: `button`, className: `loot-profile-reset`, disabled: r2 || A2 || !T2?.customized, onClick: () => void ge2(), children: [(0, Z.jsx)(ut, {}), ` Varsay\u0131lana D\xF6n`] })] })] }) : (0, Z.jsx)(`div`, { className: `loot-profile-empty`, children: `Se\xE7ili profil haz\u0131rlan\u0131yor\u2026` })] })] });
}
function pn({ icon: e2, label: t2, value: n2 }) {
  return (0, Z.jsxs)(`div`, { children: [e2, (0, Z.jsxs)(`span`, { children: [(0, Z.jsx)(`small`, { children: t2 }), (0, Z.jsx)(`strong`, { children: n2 })] })] });
}
function mn({ settings: e2, busy: t2, act: n2 }) {
  return (0, Z.jsx)(colRedPearlEditor460.Editor, { settings: e2, busy: t2, act: n2 });
}
export { an as default };
const colRuneUI = createRuneUI(X, { model: colRuneModel });
const colArenaUI = createArenaUI(X);
const col425UI = createUpdate425UI(X, {});
const colStatusUI429 = createStatusUI429(X, { model: colRuneModel });
const colLoadUI430 = createLoadUI430(X, { model: colRuneModel });
const colBattlePassAdmin434 = createBattlePassAdmin434(X);
const colGuildResetAdmin470 = createGuildResetAdmin470(X);
function createPlayerResetAdmin495(React) {
  const h2 = React.createElement;
  function PlayerResetAdmin495({ busy, act, playerId, playerName }) {
    const [pending, setPending] = React.useState(false), [notice, setNotice] = React.useState(null);
    const requests = React.useRef(/* @__PURE__ */ new Map()), inFlight = React.useRef(false), mounted = React.useRef(true), latest = React.useRef(null);
    latest.current = { busy, act, playerId, playerName };
    React.useEffect(() => {
      mounted.current = true;
      return () => {
        mounted.current = false;
      };
    }, []);
    async function resetPlayer495() {
      const selected = latest.current;
      if (inFlight.current || selected.busy || !selected.playerId) return;
      const warning = selected.playerName + " tamamen s\u0131f\u0131rlanacak. \xC7anta ve depo, t\xFCm malzemeler ve para bakiyeleri, r\xFCtbe \xF6d\xFClleri ve bonuslar\u0131, beceriler ve geli\u015Fimler silinecek. Yaln\u0131z ba\u015Flang\u0131\xE7 silah\u0131 verilecek. Lonca ba\u015Fkan\u0131ysa loncas\u0131, kasas\u0131 ve \u015Fatosu kapan\u0131r; \xFCyeyse yaln\u0131z \xFCyeli\u011Fi silinir. Hesab\u0131 ve giri\u015F bilgileri korunur. Bu i\u015Flem geri al\u0131namaz. Onayl\u0131yor musun?";
      if (!globalThis.confirm(warning)) return;
      inFlight.current = true;
      setPending(true);
      setNotice(null);
      try {
        let token = requests.current.get(selected.playerId);
        if (!token) {
          token = { requestId: globalThis.crypto.randomUUID(), playerId: selected.playerId };
          requests.current.set(selected.playerId, token);
        }
        const response = await selected.act({ action: "reset_player", ...token, confirmation: "OYUNCUYU TAMAMEN SIFIRLA" });
        const receipt = response?.playerReset495;
        if (receipt?.ok === true && receipt.requestId === token.requestId && receipt.playerId === token.playerId) {
          requests.current.delete(selected.playerId);
          if (mounted.current) setNotice({ playerId: token.playerId, error: false, text: receipt.replayed ? "\xD6nceki s\u0131f\u0131rlama i\u015Flemi do\u011Fruland\u0131." : selected.playerName + " tamamen s\u0131f\u0131rland\u0131." });
        } else if (mounted.current) setNotice({ playerId: token.playerId, error: true, text: "Sonu\xE7 do\u011Frulanamad\u0131. Tekrar denedi\u011Finde ayn\u0131 i\u015Flem kontrol edilir. Y\xF6netim bildirimini de kontrol et." });
      } catch (error) {
        if (mounted.current) setNotice({ playerId: selected.playerId, error: true, text: error?.message || "Sonu\xE7 do\u011Frulanamad\u0131; ayn\u0131 i\u015Flemi tekrar deneyebilirsin." });
      } finally {
        inFlight.current = false;
        if (mounted.current) setPending(false);
      }
    }
    return h2(
      "section",
      { className: "admin-card danger-card", "data-player-reset495": "" },
      h2("div", { className: "admin-card-title" }, h2("div", null, h2("h2", null, "Se\xE7ili Oyuncuyu Tamamen S\u0131f\u0131rla"), h2("p", null, "\xC7anta, depo, malzemeler, bakiyeler, r\xFCtbe ve geli\u015Fimler temizlenir. Yaln\u0131z ba\u015Flang\u0131\xE7 silah\u0131 kal\u0131r. Lonca ba\u015Fkan\u0131ysa loncas\u0131 ve \u015Fatosu da kapan\u0131r; \xFCyeyse \xFCyelikten \xE7\u0131kar."))),
      h2("button", { type: "button", disabled: !!busy || pending || !playerId, onClick: resetPlayer495 }, pending ? "S\u0131f\u0131rlan\u0131yor\u2026" : "Oyuncuyu tamamen s\u0131f\u0131rla"),
      notice?.playerId === playerId && h2("p", { role: notice.error ? "alert" : "status" }, notice.text)
    );
  }
  return PlayerResetAdmin495;
}
const colPlayerResetAdmin495 = createPlayerResetAdmin495(X);
function createStoneBossStatus476(React) {
  const h2 = React.createElement;
  return function StoneBossStatus476({ data, busy, act }) {
    const rows = data?.blackStoneBosses ?? [];
    return h2("section", { className: "admin-card" }, h2("h2", null, "Kara Ta\u015F Muhaf\u0131z\u0131 \xB7 Kanal durumu"), h2("p", null, "Kara B\xF6lge\u2019de her kanalda bir boss bulunur. Can, sald\u0131r\u0131 ve \xF6d\xFClleri bu b\xF6l\xFCmden; e\u015Fya ve malzeme d\xFC\u015F\xFC\u015Flerini a\u015Fa\u011F\u0131daki ba\u011F\u0131ms\u0131z ganimet profilinden ayarla."), ...rows.map((row) => h2("div", { className: "settings-group-note", key: row.channel }, h2("strong", null, "Kanal " + row.channel + " \xB7 " + (row.hp > 0 ? row.hp + " / " + row.max_hp + " can" : "Yeniden do\u011Fu\u015F bekleniyor")), h2("div", { className: "admin-actions" }, h2("button", { type: "button", disabled: busy || row.hp > 0 || !data?.settings?.black_stone_boss_enabled, onClick: () => void act({ action: "spawn_black_stone_boss", channel: row.channel }) }, "Bossu getir"), h2("button", { type: "button", disabled: busy || row.hp <= 0, onClick: () => void act({ action: "remove_black_stone_boss", channel: row.channel }, "Kanal " + row.channel + " Kara Ta\u015F Muhaf\u0131z\u0131 kald\u0131r\u0131ls\u0131n m\u0131?") }, "Bossu kald\u0131r")))));
  };
}
const colStoneBossStatus476 = createStoneBossStatus476(X);
const col438LaunchModeUI = createLaunchModeUI438(X);
const colQuests438Admin = createQuestsAdmin438(X);
const colEventAdmin444 = createEventIslandAdmin444(X, { Composer: F, sendGm: Lt });
const colSeasonalEditor453 = colSeasonalEditorModule453.createSeasonalEditor453(X, { seasonalTheme: c, FESTIVAL_MAPS: b, SEASONAL_AREAS: D, areaWorld: ae, SEASONAL_ART: q });
function createSpecialistAdmin459({ useState, useEffect, useRef, jsx, jsxs }) {
  const groups = [{ id: "arkanist", name: "Arkanist", color: "#ba8bdf", skills: [{ id: "arkanist_burst", branch: "\xD6z Y\u0131k\u0131c\u0131s\u0131", name: "\xD6z Patlamas\u0131", effect: "burst", multiplier: 2.1, cooldownMs: 18e3 }, { id: "arkanist_heal", branch: "Ya\u015Fam Dokuyucusu", name: "Ya\u015Fam Dalgas\u0131", effect: "heal", healPercent: 20, cooldownMs: 24e3 }] }, { id: "avci", name: "Avc\u0131", color: "#e3bd72", skills: [{ id: "avci_sharp", branch: "Keskin Ni\u015Fanc\u0131", name: "\u015Eafak Oku", effect: "burst", multiplier: 2.2, cooldownMs: 18e3 }, { id: "avci_trap", branch: "\u0130z S\xFCr\xFCc\xFC", name: "K\xF6k Oku", effect: "root", multiplier: 1.5, rootMs: 1800, cooldownMs: 2e4 }] }, { id: "muhafiz", name: "Muhaf\u0131z", color: "#8bc7df", skills: [{ id: "muhafiz_tank", branch: "\xC7elik Muhaf\u0131z", name: "\xC7elik \u0130rade", effect: "guard", healPercent: 12, guardPercent: 20, guardMs: 6e3, cooldownMs: 24e3 }, { id: "muhafiz_strike", branch: "H\xFCk\xFCm Sava\u015F\xE7\u0131s\u0131", name: "H\xFCk\xFCm Darbesi", effect: "burst", multiplier: 2.2, cooldownMs: 18e3 }] }];
  const all = groups.flatMap((g2) => g2.skills);
  const defaults = () => Object.fromEntries(all.map((s2) => [s2.id, Object.fromEntries(relevant(s2).map((k2) => [k2, s2[k2]]))]));
  const clone = (v2) => structuredClone(v2), equal = (a2, b2) => !!a2 && !!b2 && all.every((s2) => relevant(s2).every((k2) => Number(a2[s2.id]?.[k2]) === Number(b2[s2.id]?.[k2])));
  const fields = { multiplier: ["Sald\u0131r\u0131 \xE7arpan\u0131", 0.1, 10, 0.1, 1], healPercent: ["\u0130yile\u015Ftirme (%)", 0, 30, 1, 1], guardPercent: ["Hasar azaltma (%)", 0, 75, 1, 1], guardMs: ["Koruma s\xFCresi (sn)", 0, 30, 0.1, 1e3], rootMs: ["Hareketsiz b\u0131rakma (sn)", 0, 2, 0.1, 1e3], cooldownMs: ["Bekleme s\xFCresi (sn)", 1, 120, 0.1, 1e3] };
  const relevant = (s2) => s2.effect === "heal" ? ["healPercent", "cooldownMs"] : s2.effect === "guard" ? ["healPercent", "guardPercent", "guardMs", "cooldownMs"] : s2.effect === "root" ? ["multiplier", "rootMs", "cooldownMs"] : ["multiplier", "cooldownMs"];
  const valid = (skills) => all.every((s2) => relevant(s2).every((k2) => {
    const n2 = Number(skills?.[s2.id]?.[k2]), f2 = fields[k2];
    return Number.isFinite(n2) && n2 >= f2[1] * f2[4] && n2 <= f2[2] * f2[4] && (f2[4] === 1 || Number.isInteger(n2));
  }));
  function Admin({ value, expectedEvents = "", busy = false, act }) {
    const [tab, setTab] = useState("arkanist"), [baseline, setBaseline] = useState(() => clone(value)), [draft, setDraft] = useState(() => clone(value)), [saving, setSaving] = useState(false), [message, setMessage] = useState("");
    const latest = useRef({ value, expectedEvents }), baselineRef = useRef(baseline), dirtyRef = useRef(false), savingRef = useRef(false), pendingRef = useRef(null), eventsRef = useRef(expectedEvents);
    latest.current = { value, expectedEvents };
    baselineRef.current = baseline;
    const dirty = !equal(draft?.skills, baseline?.skills);
    dirtyRef.current = dirty;
    const conflict = value?.revision !== baseline?.revision, invalid = !valid(draft?.skills), group = groups.find((g2) => g2.id === tab) ?? groups[0];
    const accept = (incoming, events) => {
      const next = clone(incoming);
      pendingRef.current = null;
      eventsRef.current = events;
      setBaseline(next);
      baselineRef.current = next;
      setDraft(clone(next));
      setMessage("Beceri ayarlar\u0131 kaydedildi.");
    };
    useEffect(() => {
      if (!value) return;
      const pending = pendingRef.current;
      if (pending && value.revision > pending.revision && equal(value.skills, pending.skills)) {
        accept(value, expectedEvents);
        return;
      }
      if (savingRef.current) return;
      if (dirtyRef.current) {
        if (value.revision === baselineRef.current.revision) eventsRef.current = expectedEvents;
        return;
      }
      eventsRef.current = expectedEvents;
      setBaseline(clone(value));
      baselineRef.current = clone(value);
      setDraft(clone(value));
    }, [value?.revision, expectedEvents]);
    const change = (id, key, n2) => {
      setMessage("");
      setDraft((current) => ({ ...current, skills: { ...current.skills, [id]: { ...current.skills[id], [key]: n2 } } }));
    };
    const takeServer = () => {
      const incoming = latest.current;
      pendingRef.current = null;
      eventsRef.current = incoming.expectedEvents;
      setBaseline(clone(incoming.value));
      baselineRef.current = clone(incoming.value);
      setDraft(clone(incoming.value));
      setMessage("G\xFCncel sunucu ayarlar\u0131 al\u0131nd\u0131.");
    };
    async function save() {
      if (busy || savingRef.current || !dirty || conflict || invalid) return;
      const captured = clone(draft), revision = baselineRef.current.revision;
      captured.revision = revision;
      pendingRef.current = { revision, skills: clone(captured.skills) };
      savingRef.current = true;
      setSaving(true);
      setMessage("");
      try {
        const result = await act({ action: "save_specialist_skills459", config: captured, expectedEvents: eventsRef.current });
        const acknowledged = result?.specialistSkills459;
        if (acknowledged?.revision > revision && equal(acknowledged.skills, captured.skills)) accept(acknowledged, String(result.settings?.events_json ?? latest.current.expectedEvents));
        else if (pendingRef.current) {
          pendingRef.current = null;
          setMessage("Kay\u0131t do\u011Frulanamad\u0131. Tasla\u011F\u0131n korundu; canl\u0131 veriyi yenileyip tekrar dene.");
        }
      } catch (error) {
        pendingRef.current = null;
        setMessage(error instanceof Error ? error.message : "Kay\u0131t ba\u015Far\u0131s\u0131z. Tasla\u011F\u0131n korundu.");
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    }
    const locked = busy || saving;
    return jsxs("section", { className: "admin-card specialist-admin459", children: [
      jsxs("header", { className: "spec459-heading", children: [jsx("span", { className: "admin-kicker", children: "30. SEV\u0130YE UZMANLIK" }), jsx("h2", { children: "Uzmanl\u0131k Becerileri" }), jsx("p", { children: "Her s\u0131n\u0131f\u0131n iki uzmanl\u0131k becerisinin g\xFCc\xFCn\xFC ve bekleme s\xFCresini ayarla. De\u011Fi\u015Fiklikler Kaydet ile uygulan\u0131r." })] }),
      jsx("div", { className: "spec459-tabs", role: "tablist", "aria-label": "Karakter s\u0131n\u0131f\u0131", children: groups.map((g2) => jsx("button", { type: "button", role: "tab", id: "spec459-tab-" + g2.id, "aria-selected": tab === g2.id, "aria-controls": "spec459-panel-" + g2.id, className: tab === g2.id ? "selected" : "", onClick: () => setTab(g2.id), children: g2.name }, g2.id)) }),
      jsx("div", { className: "spec459-skill-grid", role: "tabpanel", id: "spec459-panel-" + group.id, "aria-labelledby": "spec459-tab-" + group.id, children: group.skills.map((s2) => jsxs("article", { className: "spec459-skill-card", style: { "--spec459-color": group.color }, children: [jsxs("div", { className: "spec459-skill-title", children: [jsx("small", { children: s2.branch }), jsx("h3", { children: s2.name }), jsx("span", { children: s2.effect === "guard" ? "Koruma ve iyile\u015Ftirme" : s2.effect === "heal" ? "Tak\u0131m iyile\u015Ftirmesi" : s2.effect === "root" ? "Sald\u0131r\u0131 ve kontrol" : "G\xFC\xE7l\xFC sald\u0131r\u0131" })] }), jsx("div", { className: "spec459-fields", children: relevant(s2).map((key) => {
        const f2 = fields[key];
        return jsxs("label", { children: [jsx("span", { children: f2[0] }), jsx("input", { type: "number", inputMode: "decimal", min: f2[1], max: f2[2], step: f2[3], value: Number(draft.skills[s2.id][key]) / f2[4], disabled: locked, "aria-label": s2.name + " \xB7 " + f2[0], onChange: (e2) => change(s2.id, key, f2[4] === 1e3 ? Math.round(Number(e2.target.value) * 1e3) : Number(e2.target.value)) }), jsx("small", { children: key === "multiplier" ? "0,1\u201310 kat" : f2[1] + "\u2013" + f2[2] + (f2[4] === 1e3 ? " saniye" : "%") })] }, key);
      }) })] }, s2.id)) }),
      conflict && jsx("p", { className: "spec459-conflict", role: "alert", children: "Sunucu ayarlar\u0131 ba\u015Fka bir i\u015Flemde de\u011Fi\u015Fti. Tasla\u011F\u0131n korundu. Kaydetmeden \xF6nce g\xFCncel sunucu ayarlar\u0131n\u0131 al." }),
      invalid && jsx("p", { className: "spec459-conflict", role: "alert", children: "De\u011Ferleri g\xF6sterilen aral\u0131klar i\xE7inde gir." }),
      message && jsx("p", { className: "spec459-message", role: "status", children: message }),
      jsxs("footer", { className: "spec459-actions", children: [jsx("button", { type: "button", disabled: locked, onClick: takeServer, children: "Sunucu ayarlar\u0131n\u0131 al" }), jsx("button", { type: "button", disabled: locked, onClick: () => {
        setDraft((current) => ({ ...current, skills: defaults() }));
        setMessage("Varsay\u0131lan de\u011Ferler tasla\u011Fa al\u0131nd\u0131. Uygulamak i\xE7in Kaydet.");
      }, children: "Varsay\u0131lanlar\u0131 tasla\u011Fa al" }), jsx("button", { type: "button", className: "admin-primary", disabled: locked || !dirty || conflict || invalid, onClick: () => void save(), children: saving ? "Kaydediliyor\u2026" : "Beceri ayarlar\u0131n\u0131 kaydet" })] }),
      jsx("p", { className: "spec459-footnote", children: "Bekleme ve etki s\xFCreleri saniyedir. B\xFCy\xFC h\u0131z\u0131 mevcut bekleme s\xFCresi form\xFCl\xFCn\xFC kullan\u0131r." })
    ] });
  }
  return { Admin, defaults, equal, valid, groups };
}
const colSpecialistAdmin459 = createSpecialistAdmin459({ useState: X.useState, useEffect: X.useEffect, useRef: X.useRef, jsx: Z.jsx, jsxs: Z.jsxs });
const colRedPearlEditor460 = (function createFishingEditor482({ useState, useEffect, jsx, jsxs }) {
  function Editor({ settings, busy = false, act }) {
    const raw = String(settings?.events_json ?? ""), [draft, setDraft] = useState(null), [baseline, setBaseline] = useState(raw), [message, setMessage] = useState("");
    useEffect(() => {
      if (draft === null) setBaseline(raw);
    }, [raw, draft]);
    const value = draft ?? readFishingCatch482(raw), keys = ["pearl", "red_pearl", "talisman", "sokan", "levrek", "zargana"], labels = { pearl: "Beyaz \u0130nci", red_pearl: "K\u0131rm\u0131z\u0131 \u0130nci", talisman: "T\u0131ls\u0131m Ta\u015F\u0131", sokan: "Sokan Bal\u0131\u011F\u0131", levrek: "Levrek", zargana: "Zargana" }, total = keys.reduce((sum, key) => sum + Math.round(value[key] * 100), 0) / 100, conflict = draft !== null && baseline !== raw;
    let error = "";
    try {
      validateFishingCatch482(value);
    } catch (e2) {
      error = e2.message;
    }
    const save = async () => {
      if (busy || draft === null || error || conflict) return;
      const result = await act({ action: "save_fishing_chances482", chances: validateFishingCatch482(value), expectedEvents: baseline });
      if (result) {
        setDraft(null);
        setMessage("Yakalama oranlar\u0131 kaydedildi.");
      }
    };
    return jsxs("section", { className: "admin-card settings-card", children: [jsxs("div", { className: "admin-card-title", children: [jsxs("div", { children: [jsx("h2", { children: "Bal\u0131k\xE7\u0131l\u0131k \xB7 Yakalama \u015Eanslar\u0131" }), jsx("p", { children: "Her ba\u015Far\u0131l\u0131 avda bu listeden tek \xF6d\xFCl \xE7\u0131kar. Oranlar\u0131n toplam\u0131 %100 olmal\u0131. Yeni at\u0131lan oltalarda ge\xE7erlidir." })] })] }), jsx("div", { className: "settings-groups", children: jsxs("fieldset", { children: [jsx("legend", { children: "\xD6d\xFCl oranlar\u0131" }), ...keys.map((key) => jsxs("label", { children: [jsx("span", { children: labels[key] + " (%)" }), jsx("input", { type: "number", min: 0, max: 100, step: 0.01, inputMode: "decimal", disabled: busy, value: value[key], onChange: (e2) => {
      if (draft === null) setBaseline(raw);
      setDraft({ ...value, [key]: Number(e2.target.value) });
      setMessage("");
    } })] }, key)), jsx("p", { "aria-live": "polite", children: "Toplam: %" + (Number.isFinite(total) ? total.toFixed(2) : "\u2014") + " \xB7 Toplam %100 olmal\u0131." }), error && jsx("p", { role: "alert", children: error }), conflict && jsxs("div", { children: [jsx("p", { role: "alert", children: "Ayarlar de\u011Fi\u015Fti. G\xFCncel oranlar\u0131 y\xFCkleyip tekrar d\xFCzenle." }), jsx("button", { type: "button", disabled: busy, onClick: () => {
      setDraft(null);
      setBaseline(raw);
      setMessage("");
    }, children: "G\xFCncel Oranlar\u0131 Y\xFCkle" })] }), jsx("button", { type: "button", className: "settings-group-save", disabled: busy || draft === null || !!error || conflict, onClick: () => void save(), children: "Yakalama Oranlar\u0131n\u0131 Kaydet" }), message && jsx("p", { role: "status", children: message })] }) })] });
  }
  return { Editor };
})({ useState: X.useState, useEffect: X.useEffect, jsx: Z.jsx, jsxs: Z.jsxs });
function dungeonLootLabel460(item, option = false) {
  const color = { blue: "Mavi e\u015Fya", red: "K\u0131rm\u0131z\u0131 e\u015Fya", orange: "Sar\u0131 e\u015Fya" }[item?.rarity];
  if (item?.type !== "gear" || !color) return option ? [item?.group, item?.name].filter(Boolean).join(" \xB7 ") : item?.name;
  const role = { muhafiz: "Muhaf\u0131z", avci: "Avc\u0131", arkanist: "Arkanist" }[item.role] ?? "";
  const kind = { weapon: "silah\u0131", armor: "z\u0131rh\u0131", helmet: "kask\u0131", shoes: "\xE7izmesi", necklace: "kolyesi" }[item.kind] ?? item.kind ?? "";
  const context = [role, kind].filter(Boolean).join(" ");
  return color + (context ? " \xB7 " + context : "") + (item.family === "sinsi" ? " \xB7 Sinsi" : "");
}
function dungeonLootSearchText460(item) {
  return String(item?.name ?? "") + " " + String(dungeonLootLabel460(item) ?? "");
}
const colSpecializationReset463Admin = (function resetAdminFactory463(React) {
  const h2 = React.createElement;
  return function Reset({ player, busy, act }) {
    const [working, setWorking] = React.useState(false), [message, setMessage] = React.useState(""), gate = React.useRef(false), pending = React.useRef(null);
    const labels = { arkanist_burst: "\xD6z Y\u0131k\u0131c\u0131s\u0131", arkanist_heal: "Ya\u015Fam Dokuyucusu", avci_sharp: "Keskin Ni\u015Fanc\u0131", avci_trap: "\u0130z S\xFCr\xFCc\xFC", muhafiz_tank: "\xC7elik Muhaf\u0131z", muhafiz_strike: "H\xFCk\xFCm Sava\u015F\xE7\u0131s\u0131" };
    React.useEffect(() => {
      setMessage("");
      pending.current = null;
    }, [player?.id]);
    const reset = async () => {
      if (gate.current || busy || !player?.specialization) return;
      gate.current = true;
      setWorking(true);
      setMessage("");
      if (pending.current?.playerId !== player.id) pending.current = { playerId: player.id, requestId: crypto.randomUUID() };
      try {
        const result = await act({ action: "reset_specialization463", ...pending.current });
        if (result) {
          pending.current = null;
          setMessage(player.name + ": uzmanl\u0131k s\u0131f\u0131rland\u0131. Beceri geli\u015Ftirmeleri korundu.");
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Uzmanl\u0131k s\u0131f\u0131rlanamad\u0131.");
      } finally {
        gate.current = false;
        setWorking(false);
      }
    };
    return h2("section", { className: "admin-card specialization463-admin" }, h2("h2", null, "Oyuncunun Uzmanl\u0131\u011F\u0131n\u0131 S\u0131f\u0131rla"), h2("p", null, "Se\xE7ili oyuncunun uzmanl\u0131\u011F\u0131n\u0131 par\u015F\xF6men t\xFCketmeden s\u0131f\u0131rlar. Beceri seviyesi ve bekleme s\xFCresi korunur; yeni yolunu se\xE7ebilir."), h2("p", null, h2("strong", null, player?.name ?? "\xD6nce oyuncu se\xE7"), player?.specialization ? " \xB7 " + (labels[player.specialization] ?? "Uzmanl\u0131k se\xE7ilmi\u015F") : " \xB7 Uzmanl\u0131k se\xE7ilmemi\u015F"), h2("button", { type: "button", className: "admin-primary", disabled: busy || working || !player?.specialization, onClick: () => void reset() }, working ? "\u0130\u015Fleniyor\u2026" : "Uzmanl\u0131\u011F\u0131 S\u0131f\u0131rla"), message ? h2("p", { role: "status" }, message) : null);
  };
})(X);
const colBrokenCore464Admin = (function createBrokenCore464Admin(React) {
  const h2 = React.createElement, defaults = { enabled: false, minMinutes: 15, maxMinutes: 25, durationSec: 20, xp: 150, essence: 10 };
  const same = (a2, b2) => Object.keys(defaults).every((k2) => a2?.[k2] === b2?.[k2]);
  function Settings({ value, busy, act }) {
    const [form, setForm] = React.useState(() => ({ ...defaults, ...value?.config })), [dirty, setDirty] = React.useState(false), [working, setWorking] = React.useState(false), [message, setMessage] = React.useState("");
    const gate = React.useRef(false), revision = React.useRef(value?.revision ?? 0), pending = React.useRef(null), latest = React.useRef(value);
    latest.current = value;
    React.useEffect(() => {
      if (value && !dirty && !gate.current) {
        setForm({ ...defaults, ...value.config });
        revision.current = value.revision;
      }
    }, [value?.revision, dirty]);
    const edit = (key, v2) => {
      setForm((old) => ({ ...old, [key]: v2 }));
      setDirty(true);
      pending.current = null;
      setMessage("");
    };
    const save = async () => {
      if (gate.current || busy || !value) return;
      gate.current = true;
      setWorking(true);
      setMessage("");
      pending.current ??= { action: "save_broken_core464", expectedRevision: revision.current, config: { ...form }, requestId: crypto.randomUUID() };
      try {
        const result = await act(pending.current), confirmed = result?.brokenCore464;
        if (confirmed && confirmed.revision > revision.current && same(confirmed.config, pending.current.config)) {
          setForm({ ...confirmed.config });
          revision.current = confirmed.revision;
          setDirty(false);
          pending.current = null;
          setMessage("Ayarlar kaydedildi.");
        } else setMessage("Kay\u0131t do\u011Frulanamad\u0131. Tasla\u011F\u0131n korundu; canl\u0131 veriyi yenile.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Kaydedilemedi. Tasla\u011F\u0131n korundu.");
      } finally {
        gate.current = false;
        setWorking(false);
      }
    };
    const field = (label, key, min, max, suffix) => h2("label", { className: "broken-core464-field" }, h2("span", null, label), h2("span", { className: "broken-core464-number" }, h2("input", { type: "number", min, max, step: 1, value: Number.isNaN(form[key]) ? "" : form[key], disabled: working, onChange: (e2) => edit(key, e2.target.value === "" ? NaN : Number(e2.target.value)) }), h2("small", null, suffix)));
    const valid = Number.isInteger(form.minMinutes) && form.minMinutes >= 1 && form.minMinutes <= 180 && Number.isInteger(form.maxMinutes) && form.maxMinutes >= form.minMinutes && form.maxMinutes <= 180 && Number.isInteger(form.durationSec) && form.durationSec >= 10 && form.durationSec <= 60 && Number.isInteger(form.xp) && form.xp >= 0 && form.xp <= 1e6 && Number.isInteger(form.essence) && form.essence >= 0 && form.essence <= 1e5;
    return h2("section", { className: "admin-card broken-core464-admin" }, h2("h2", null, "K\u0131r\u0131k Ya\u015Fam \xC7ekirde\u011Fi"), h2("p", null, "Normal av s\u0131ras\u0131nda beliren tek dokunu\u015Fluk par\xE7a bulmacas\u0131. Do\u011Fru se\xE7imde tecr\xFCbe ve ya\u015Fam \xF6z\xFC verir."), h2("label", { className: "broken-core464-enable" }, h2("input", { type: "checkbox", checked: form.enabled, disabled: working, onChange: (e2) => edit("enabled", e2.target.checked) }), h2("strong", null, form.enabled ? "Oyunculara a\xE7\u0131k" : "Kapal\u0131")), h2("p", { className: "broken-core464-note" }, "Her oyuncuya son 60 dakika i\xE7inde en fazla 3 kez g\xF6sterilir. G\xF6rmezden gelinen bulmacalar da s\u0131n\u0131ra dahildir. Oto Av, g\xFCvenli alanlar, arena ve zindanlarda \xE7\u0131kmaz."), h2("div", { className: "broken-core464-fields" }, field("En erken", "minMinutes", 1, 180, "dakika"), field("En ge\xE7", "maxMinutes", 1, 180, "dakika"), field("Yan\u0131tlama s\xFCresi", "durationSec", 10, 60, "saniye"), field("Tecr\xFCbe \xF6d\xFCl\xFC", "xp", 0, 1e6, "TP"), field("Ya\u015Fam \xF6z\xFC \xF6d\xFCl\xFC", "essence", 0, 1e5, "\xD6z")), h2("p", { className: "broken-core464-note" }, "Aral\u0131k, oyuncunun sunucuda do\u011Frulanan aktif av s\xFCresine g\xF6re rastgele se\xE7ilir. Kapatmak a\xE7\u0131k normal bulmacalar\u0131 da iptal eder. GM denemesi kapal\u0131yken kullan\u0131labilir."), h2("div", { className: "broken-core464-admin-actions" }, h2("button", { type: "button", className: "admin-primary", disabled: busy || working || !value || !valid, onClick: () => void save() }, working ? "Kaydediliyor\u2026" : "Kaydet"), h2("button", { type: "button", disabled: working || !dirty, onClick: () => {
      setForm({ ...defaults, ...latest.current?.config });
      revision.current = latest.current?.revision ?? 0;
      pending.current = null;
      setDirty(false);
      setMessage("");
    } }, "De\u011Fi\u015Fiklikleri b\u0131rak")), message ? h2("p", { role: "status" }, message) : null);
  }
  function Player({ player, busy, act }) {
    const [working, setWorking] = React.useState(false), [message, setMessage] = React.useState("");
    const gate = React.useRef(false), pending = React.useRef(null), latestId = React.useRef(player?.id);
    latestId.current = player?.id;
    let openPuzzle = null;
    try {
      openPuzzle = JSON.parse(player?.broken_core464 ?? "");
    } catch {
    }
    React.useEffect(() => {
      pending.current = null;
      setMessage("");
    }, [player?.id]);
    const run = async (action) => {
      if (gate.current || busy || !player) return;
      const playerId = player.id;
      if (action === "revoke_broken_core464" && !openPuzzle?.id) return;
      gate.current = true;
      setWorking(true);
      setMessage("");
      if (pending.current?.playerId !== playerId || pending.current.action !== action || action === "revoke_broken_core464" && pending.current.puzzleId !== openPuzzle.id) pending.current = { action, playerId, ...action === "revoke_broken_core464" ? { puzzleId: openPuzzle.id } : {}, requestId: crypto.randomUUID() };
      try {
        const result = await act(pending.current);
        if (result && latestId.current === playerId) {
          pending.current = null;
          setMessage(result.message ?? (action === "send_broken_core464" ? "Deneme g\xF6nderildi. Oyuncu bulmacay\u0131 oyunda g\xF6recek." : "A\xE7\u0131k bulmaca geri al\u0131nd\u0131. Kazan\u0131lm\u0131\u015F \xF6d\xFCller korunur."));
        }
      } catch (error) {
        if (latestId.current === playerId) setMessage(error instanceof Error ? error.message : "\u0130\u015Flem tamamlanamad\u0131.");
      } finally {
        gate.current = false;
        setWorking(false);
      }
    };
    return h2("section", { className: "admin-card broken-core464-admin" }, h2("h2", null, "Oyuncuya \xC7ekirdek Bulmacas\u0131 G\xF6nder"), h2("p", null, h2("strong", null, player?.name ?? "\xD6nce oyuncu se\xE7"), " \xB7 Test g\xF6nderimi sistem kapal\u0131yken de \xE7al\u0131\u015F\u0131r ve saatlik hakk\u0131 t\xFCketmez."), h2("p", { className: "broken-core464-note" }, "Do\u011Fru cevap ayarlad\u0131\u011F\u0131n ger\xE7ek TP ve \xF6z\xFC bir kez verir. Geri Al yaln\u0131z a\xE7\u0131k bulmacay\u0131 kapat\u0131r; kazan\u0131lm\u0131\u015F \xF6d\xFCl\xFC geri almaz."), h2("div", { className: "broken-core464-admin-actions" }, h2("button", { type: "button", className: "admin-primary", disabled: busy || working || !player, onClick: () => void run("send_broken_core464") }, working ? "\u0130\u015Fleniyor\u2026" : "Test G\xF6nder"), h2("button", { type: "button", disabled: busy || working || !player || !openPuzzle?.id, onClick: () => void run("revoke_broken_core464") }, "Geri Al")), message ? h2("p", { role: "status" }, message) : null);
  }
  return { Settings, Player };
})(X);
const colLoadLabAdmin477 = createLoadLabAdmin477(X);
function validateWheelChances483(value, rewards) {
  const keys = rewards.map((r2) => r2.id);
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || Object.keys(value).some((k2) => !keys.includes(k2))) throw Error("\xC7arktaki t\xFCm \xF6d\xFCllerin oranlar\u0131n\u0131 gir.");
  const next = {};
  let total = 0;
  for (const key of keys) {
    const n2 = value[key];
    if (typeof n2 !== "number" || !Number.isFinite(n2) || n2 < 0 || n2 > 100 || Math.abs(n2 * 100 - Math.round(n2 * 100)) > 1e-6) throw Error("\xC7ark oranlar\u0131 %0\u2013100 aras\u0131nda, en fazla iki ondal\u0131kl\u0131 olmal\u0131.");
    next[key] = n2;
    total += Math.round(n2 * 100);
  }
  if (total !== 1e4) throw Error("\xC7ark oranlar\u0131n\u0131n toplam\u0131 %100 olmal\u0131.");
  return next;
}
function createAdminContent483(React, { validateWheel }) {
  const h2 = React.createElement;
  function Wheel({ value, busy, act }) {
    const [draft, setDraft] = React.useState(null), [revision, setRevision] = React.useState(value.revision), [message, setMessage] = React.useState(""), [saving, setSaving] = React.useState(false), lock = React.useRef(false);
    React.useEffect(() => {
      if (draft === null) setRevision(value.revision);
    }, [value.revision, draft]);
    const chances = draft ?? value.chances, conflict = draft !== null && revision !== value.revision, total = Object.values(chances).reduce((n2, v2) => n2 + Math.round(v2 * 100), 0) / 100;
    let error = "";
    try {
      validateWheel(chances, value.rewards);
    } catch (e2) {
      error = e2.message;
    }
    const reload = () => {
      setDraft(null);
      setRevision(value.revision);
      setMessage("");
    };
    const save = async () => {
      if (busy || lock.current || draft === null || conflict || error) return;
      lock.current = true;
      setSaving(true);
      setMessage("");
      try {
        const result = await act({ action: "save_wheel_chances483", chances, revision });
        if (result?.wheel483) {
          setDraft(null);
          setRevision(result.wheel483.revision);
          setMessage("\xC7ark oranlar\u0131 kaydedildi.");
        } else setMessage("Kaydedilemedi. Y\xF6netim bildirimini kontrol et.");
      } catch (e2) {
        setMessage(e2.message || "\xC7ark oranlar\u0131 kaydedilemedi.");
      } finally {
        lock.current = false;
        setSaving(false);
      }
    };
    return h2("section", { className: "admin-card settings-card wheel-admin483" }, h2("h2", null, "\xC7ark \xB7 \xD6d\xFCl Oranlar\u0131"), h2("p", null, "Her d\xF6n\xFC\u015Fte tek \xF6d\xFCl verilir. Toplam %100 olmal\u0131; %0 olan \xF6d\xFCl \xE7\u0131kmaz. Kaydetti\u011Fin oranlar sonraki d\xF6n\xFC\u015Flerde ge\xE7erlidir. D\xF6n\xFC\u015F bedeli 15 \xC7P olarak kal\u0131r."), h2("div", { className: "settings-groups" }, h2("fieldset", null, h2("legend", null, "\xC7ekirdek \xC7ark\u0131"), ...value.rewards.map((r2) => h2("label", { key: r2.id }, h2("span", null, r2.name + " (%)"), h2("input", { type: "number", min: 0, max: 100, step: 0.01, inputMode: "decimal", disabled: busy || saving, value: chances[r2.id], onChange: (e2) => {
      if (draft === null) setRevision(value.revision);
      setDraft({ ...chances, [r2.id]: Number(e2.target.value) });
      setMessage("");
    } }))), h2("p", { "aria-live": "polite" }, "Toplam: %" + (Number.isFinite(total) ? total.toFixed(2) : "\u2014")), error && h2("p", { role: "alert" }, error), conflict && h2("p", { role: "alert" }, "Oranlar ba\u015Fka oturumda de\u011Fi\u015Fti. G\xFCncel oranlar\u0131 y\xFCkleyip tekrar d\xFCzenle."), h2("div", { className: "admin-actions" }, h2("button", { type: "button", disabled: busy || saving || draft === null || conflict || !!error, onClick: () => void save() }, saving ? "Kaydediliyor\u2026" : "\xC7ark oranlar\u0131n\u0131 kaydet"), h2("button", { type: "button", disabled: busy || saving || draft === null, onClick: reload }, "G\xFCncel oranlar\u0131 y\xFCkle")), message && h2("p", { role: "status" }, message))));
  }
  function RuneV2({ value, busy, act }) {
    const [draft, setDraft] = React.useState(() => structuredClone(value.config)), [revision, setRevision] = React.useState(value.revision), [tab, setTab] = React.useState("tide"), [message, setMessage] = React.useState(""), [saving, setSaving] = React.useState(false), dirty = React.useRef(false), lock = React.useRef(false);
    React.useEffect(() => {
      if (!dirty.current) {
        setDraft(structuredClone(value.config));
        setRevision(value.revision);
      }
    }, [value.revision]);
    const conflict = revision !== value.revision, disabled = busy || saving, m2 = draft.monsters[tab], bossReward = Object.hasOwn(draft.monsters.boss ?? {}, "topDamageGems") ? draft.monsters.boss.topDamageGems : 250, rewardError = !Number.isSafeInteger(bossReward) || bossReward < 0 || bossReward > 1e6 ? "En \xE7ok hasar \xF6d\xFCl\xFC 0\u20131.000.000 aras\u0131nda tam say\u0131 olmal\u0131." : "";
    const bossSkill484 = draft.monsters.boss ?? {}, waveDamage484 = Object.hasOwn(bossSkill484, "waveDamage") ? bossSkill484.waveDamage : 20, waveCooldown484 = Object.hasOwn(bossSkill484, "waveCooldownSeconds") ? bossSkill484.waveCooldownSeconds : 12, skillError484 = !Number.isSafeInteger(waveDamage484) || waveDamage484 < 0 || waveDamage484 > 1e6 ? "Karanl\u0131k R\xFCn Dalgas\u0131 hasar\u0131 0\u20131.000.000 aras\u0131nda tam say\u0131 olmal\u0131." : !Number.isSafeInteger(waveCooldown484) || waveCooldown484 < 3 || waveCooldown484 > 86400 ? "Karanl\u0131k R\xFCn Dalgas\u0131 bekleme s\xFCresi 3\u201386.400 saniye aras\u0131nda tam say\u0131 olmal\u0131." : "";
    const set = (fn2) => {
      dirty.current = true;
      setDraft((previous) => {
        const next = structuredClone(previous);
        fn2(next);
        return next;
      });
      setMessage("Kaydedilmemi\u015F de\u011Fi\u015Fiklikler");
    };
    const number = (label, n2, change, min, max, step = 1) => h2("label", { className: "rune-field" }, h2("span", null, label), h2("input", { type: "number", min, max, step, value: n2, disabled, onChange: (e2) => change(Number(e2.target.value)) }));
    const save = async () => {
      if (disabled || lock.current || conflict || rewardError || skillError484 || !dirty.current) return;
      lock.current = true;
      setSaving(true);
      try {
        const result = await act({ action: "save_runes_v2", config: draft, revision });
        if (result?.runeV2) {
          dirty.current = false;
          setDraft(structuredClone(result.runeV2.config));
          setRevision(result.runeV2.revision);
          setMessage("Karanl\u0131k R\xFCn Sahili ayarlar\u0131 kaydedildi.");
        } else setMessage("Kaydedilemedi. Y\xF6netim bildirimini kontrol et.");
      } catch (e2) {
        setMessage(e2.message || "Ayarlar kaydedilemedi.");
      } finally {
        lock.current = false;
        setSaving(false);
      }
    };
    const labels = value.lootLabels ?? {};
    return h2("section", { className: "rune-admin" }, h2("header", null, h2("h2", null, "Karanl\u0131k R\xFCn Sahili"), h2("p", null, "Karanl\u0131k sahilin canavarlar\u0131 ve bossu bu b\xF6l\xFCmden ba\u011F\u0131ms\u0131z y\xF6netilir. As\u0131l R\xFCn Sahili ayarlar\u0131 de\u011Fi\u015Fmez. Bu haritada herkese kar\u015F\u0131 PvP ve alan sald\u0131r\u0131lar\u0131 a\xE7\u0131kt\u0131r. Her \xF6l\xFCmde m\xFCcevherlerin %5\u2019i kaybedilir; yeniden do\u011Fu\u015F Pazar K\xF6y\xFC\u2019ndedir.")), h2("div", { className: "rune-admin-general" }, h2("label", null, h2("input", { type: "checkbox", checked: draft.enabled, disabled, onChange: (e2) => set((d2) => {
      d2.enabled = e2.target.checked;
    }) }), " Haritaya giri\u015F a\xE7\u0131k")), h2("nav", { className: "rune-admin-tabs" }, ...Object.entries(draft.monsters).map(([key, monster]) => h2("button", { key, type: "button", "aria-pressed": tab === key, onClick: () => setTab(key) }, (key === "boss" ? "BOSS \xB7 " : "") + monster.name))), h2("label", { className: "rune-field" }, h2("span", null, "Canavar ad\u0131"), h2("input", { value: m2.name, maxLength: 60, disabled, onChange: (e2) => set((d2) => {
      d2.monsters[tab].name = e2.target.value;
    }) })), h2("div", { className: "rune-admin-stats" }, number("Can", m2.hp, (v2) => set((d2) => {
      d2.monsters[tab].hp = v2;
    }), 1, 1e7), number("Hasar", m2.damage, (v2) => set((d2) => {
      d2.monsters[tab].damage = v2;
    }), 0, 1e6), number("Tecr\xFCbe", m2.xp, (v2) => set((d2) => {
      d2.monsters[tab].xp = v2;
    }), 0, 1e6), number("Yeniden do\u011Fma (sn)", m2.respawnSeconds, (v2) => set((d2) => {
      d2.monsters[tab].respawnSeconds = v2;
    }), 1, 86400), tab === "boss" && number("En \xE7ok hasar \xF6d\xFCl\xFC (m\xFCcevher)", bossReward, (v2) => set((d2) => {
      d2.monsters.boss.topDamageGems = v2;
    }), 0, 1e6)), tab === "boss" && h2("p", null, "Boss \xF6ld\xFCr\xFCld\xFC\u011F\xFCnde toplamda en \xE7ok hasar\u0131 veren oyuncuya bu ek \xF6d\xFCl her do\u011Fu\u015Fta yaln\u0131z bir kez verilir. 0, bu ek \xF6d\xFCl\xFC kapat\u0131r."), tab === "boss" && h2("fieldset", { className: "rune-boss-skill484", title: "Bekleme s\xFCresi, becerinin iki kullan\u0131m\u0131 aras\u0131ndaki s\xFCredir. Hasar\u0131 0 yaparsan bu beceri kapan\u0131r." }, h2("legend", null, "Boss Becerisi \xB7 Karanl\u0131k R\xFCn Dalgas\u0131"), h2("p", null, "Bossun \xE7evresinde beliren mor r\xFCn \xE7emberi k\u0131sa bir uyar\u0131dan sonra patlar. \xC7emberden \xE7\u0131karak ka\xE7\u0131nabilirsin."), number("Beceri hasar\u0131", waveDamage484, (v2) => set((d2) => {
      d2.monsters.boss.waveDamage = v2;
    }), 0, 1e6), number("Beceri bekleme s\xFCresi (sn)", waveCooldown484, (v2) => set((d2) => {
      d2.monsters.boss.waveCooldownSeconds = v2;
    }), 3, 86400), h2("p", null, "Bekleme s\xFCresi, becerinin iki kullan\u0131m\u0131 aras\u0131ndaki s\xFCredir. Varsay\u0131lan: 12 saniye ve 20 hasar. Kaydedilen ayarlar sonraki kullan\u0131mlarda ge\xE7erlidir. Hasar\u0131 0 yaparsan bu beceri kapan\u0131r ve haz\u0131rlanmakta olan dalga da durur.")), skillError484 && h2("p", { role: "alert" }, skillError484), rewardError && h2("p", { role: "alert" }, rewardError), h2("p", null, "Can de\u011Fi\u015Fikli\u011Fi sonraki do\u011Fu\u015Fta uygulan\u0131r. Her ganimetin \u015Fans\u0131 ba\u011F\u0131ms\u0131zd\u0131r; toplam\u0131n %100 olmas\u0131 gerekmez. Mor d\u0131\u015F\u0131ndaki ganimetlerde %0 kapal\u0131, %100 kesin d\xFC\u015F\xFC\u015Ft\xFCr. Mor ekipmanda temel oran\u0131n yar\u0131s\u0131 uygulan\u0131r. \xD6z \u015Fans\u0131 ve miktar\u0131 da a\u015Fa\u011F\u0131dan ayarlan\u0131r. Kazan\u0131lm\u0131\u015F \xF6d\xFCller sonraki ayar de\u011Fi\u015Fikli\u011Finden etkilenmez."), h2("div", { className: "rune-loot-editor" }, ...Object.entries(m2.loot).map(([kind, rule]) => h2("fieldset", { key: kind }, h2("legend", null, labels[kind] ?? kind), number(kind === "purple" ? "Temel d\xFC\u015Fme (%)" : "D\xFC\u015Fme (%)", rule.chance, (v2) => set((d2) => {
      d2.monsters[tab].loot[kind].chance = v2;
    }), 0, 100, 0.01), kind === "purple" && h2("small", null, "Yeni kesimlerde mor \u015Fans\u0131: %" + (rule.chance * 0.5).toLocaleString("tr-TR", { maximumFractionDigits: 10 }) + " (temel oran\u0131n yar\u0131s\u0131; seviye dengesi ayr\u0131ca uygulan\u0131r)."), number("En az", rule.min, (v2) => set((d2) => {
      d2.monsters[tab].loot[kind].min = v2;
    }), 1, ["white", "blue", "orange", "red", "purple", "emerald"].includes(kind) ? 3 : 100), number("En \xE7ok", rule.max, (v2) => set((d2) => {
      d2.monsters[tab].loot[kind].max = v2;
    }), 1, ["white", "blue", "orange", "red", "purple", "emerald"].includes(kind) ? 3 : 100)))), conflict && h2("p", { role: "alert" }, "Ayarlar ba\u015Fka oturumda de\u011Fi\u015Fti. G\xFCncel ayarlar\u0131 y\xFCkle."), h2("div", { className: "rune-admin-save" }, h2("span", { role: "status" }, message), h2("button", { type: "button", disabled: disabled || conflict || !!rewardError || !!skillError484 || !dirty.current, onClick: () => void save() }, saving ? "Kaydediliyor\u2026" : "Karanl\u0131k R\xFCn Sahili ayarlar\u0131n\u0131 kaydet"), h2("button", { type: "button", disabled, onClick: () => {
      dirty.current = false;
      setDraft(structuredClone(value.config));
      setRevision(value.revision);
      setMessage("");
    } }, "G\xFCncel ayarlar\u0131 y\xFCkle")));
  }
  return { Wheel, RuneV2 };
}
const colAdminContent483 = createAdminContent483(X, { validateWheel: validateWheelChances483 });
function createBalanceAdmin487(React, maps) {
  const h2 = React.createElement;
  return function BalanceAdmin487({ value, expectedEvents, busy, act }) {
    const [draft, setDraft] = React.useState(value), [expected, setExpected] = React.useState(expectedEvents), [message, setMessage] = React.useState(""), [saving, setSaving] = React.useState(false), dirty = React.useRef(false), lock = React.useRef(false);
    React.useEffect(() => {
      if (!dirty.current) {
        setDraft(value);
        setExpected(expectedEvents);
      }
    }, [value, expectedEvents]);
    if (!draft) return null;
    const conflict = dirty.current && expected !== expectedEvents;
    const valid = Object.values(draft.rules).every((r2) => Number.isInteger(r2.fromLevel) && r2.fromLevel >= 1 && r2.fromLevel <= 65 && ["xpPercent", "itemPercent"].every((k2) => Number.isInteger(r2[k2]) && r2[k2] >= 0 && r2[k2] <= 100));
    const set = (area, key, value2) => {
      dirty.current = true;
      setDraft((old) => ({ ...old, rules: { ...old.rules, [area]: { ...old.rules[area], [key]: value2 } } }));
    };
    const save = async () => {
      if (lock.current || busy || !valid || conflict || !dirty.current) return;
      lock.current = true;
      setSaving(true);
      setMessage("");
      try {
        const result = await act({ action: "save_level_balance487", config: draft, expectedEvents: expected });
        if (result?.highLevelBalance487) {
          dirty.current = false;
          setDraft(result.highLevelBalance487);
          setExpected(result.settings.events_json);
          setMessage("Seviye dengesi kaydedildi.");
        } else setMessage("Kay\u0131t do\u011Frulanamad\u0131. Taslak korundu.");
      } catch (e2) {
        setMessage(e2 instanceof Error ? e2.message : "Ayarlar kaydedilemedi.");
      } finally {
        lock.current = false;
        setSaving(false);
      }
    };
    const number = (area, key, label, min, max) => h2("label", { style: { display: "grid", gap: 5, minWidth: 0 } }, h2("span", null, label), h2("input", { type: "number", min, max, step: 1, value: draft.rules[area][key], disabled: busy || saving, onChange: (e2) => set(area, key, e2.target.value === "" ? "" : Number(e2.target.value)), style: { width: "100%", minWidth: 0 } }));
    return h2(
      "section",
      { className: "admin-card", style: { minWidth: 0 } },
      h2("h2", null, "Haritalar \xB7 Y\xFCksek seviye EXP ve e\u015Fya dengesi"),
      h2("p", null, "Se\xE7ti\u011Fin seviyeye ula\u015Fan oyuncu i\xE7in normal EXP ve rastgele e\u015Fya \u015Fans\u0131n\u0131n ne kadar\u0131 kals\u0131n? %100 de\u011Fi\u015Fmez, %50 yar\u0131s\u0131, %0 kapal\u0131. Grup \xFCyeleri kendi seviyelerine g\xF6re hesaplan\u0131r."),
      h2("label", { style: { display: "flex", gap: 10, alignItems: "center", fontWeight: 700 } }, h2("input", { type: "checkbox", checked: draft.enabled, disabled: busy || saving, onChange: (e2) => {
        dirty.current = true;
        setDraft((old) => ({ ...old, enabled: e2.target.checked }));
      } }), "Yeni seviye dengesi ", draft.enabled ? "A\xC7IK" : "KAPALI"),
      h2("p", null, draft.enabled ? "A\u015Fa\u011F\u0131daki kurallar eski av haritas\u0131 azaltmas\u0131n\u0131n yerine ge\xE7er; \xFCst \xFCste uygulanmaz." : "Yeni kurallar uygulanmaz. \xD6nceki av haritas\u0131 e\u015Fya azaltmas\u0131 a\u015Fa\u011F\u0131daki eski ayarlar\u0131yla \xE7al\u0131\u015Fmaya devam eder."),
      h2("p", { style: { color: "#aee2be" } }, "Art\u0131 basma malzemeleri ve Ya\u015Fam \xD6z\xFC kendi oranlar\u0131nda kal\u0131r. Sabit/garanti boss ve zindan \xF6d\xFClleri, s\u0131ralama m\xFCcevherleri, alt\u0131n, m\xFCcevher, g\xF6rev, market ve Sava\u015F Bileti teslimleri de\u011Fi\u015Fmez. Canavardan kazan\u0131lan EXP, 65. seviyede r\xFCtbe ve bilet ilerlemesini de etkiler."),
      h2("div", { style: { display: "grid", gap: 12 } }, maps.map(([area, label]) => h2("fieldset", { key: area, style: { margin: 0, minWidth: 0, border: "1px solid #3c5149", borderRadius: 8, padding: 12 } }, h2("legend", null, label), h2("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 } }, number(area, "fromLevel", "Bu seviye ve \xFCst\xFC", 1, 65), number(area, "xpPercent", "Kalan EXP (%)", 0, 100), number(area, "itemPercent", "Kalan e\u015Fya \u015Fans\u0131 (%)", 0, 100))))),
      conflict && h2("p", { role: "alert" }, "Ayarlar ba\u015Fka bir oturumda de\u011Fi\u015Fti. G\xFCncel ayarlar\u0131 y\xFCkle."),
      h2("p", { role: "status" }, message),
      h2("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } }, h2("button", { type: "button", className: "admin-primary", disabled: busy || saving || !valid || conflict || !dirty.current, onClick: () => void save() }, saving ? "Kaydediliyor\u2026" : "Seviye dengesini kaydet"), h2("button", { type: "button", disabled: busy || saving, onClick: () => {
        dirty.current = false;
        setDraft(value);
        setExpected(expectedEvents);
        setMessage("");
      } }, "G\xFCncel ayarlar\u0131 y\xFCkle"))
    );
  };
}
const colBalanceAdmin487 = createBalanceAdmin487(X, [["forest", "Kuzey Orman\u0131"], ["frozen", "Donmu\u015F \xC7am Ge\xE7idi"], ["black", "Kara B\xF6lge"], ["ancient", "Kadim K\xF6k Vadisi"], ["sinsi", "Sinsi Ta\u015F Vadisi"], ["sanctum", "D\xFCnya Bossu"], ["dragon", "Ejderha"], ["afk", "Oto Av Adas\u0131"], ["rune", "Kadim R\xFCn Sahili"], ["rune_v2", "Karanl\u0131k R\xFCn Sahili"], ["event", "Etkinlik Adas\u0131"], ["dungeon", "\xC7ekirde\u011Fin Kalbi"], ["solo", "Solo Zindan"]]);
function colBossBounds494(key) {
  return key === "black_stone_boss_damage_scale" ? { min: 0.48, max: 2400, title: "Hasar s\u0131n\u0131r\u0131: 50 kat (2400)" } : ["boss_damage_scale", "frozen_boss_damage_scale", "ancient_boss_damage_scale", "frozen_water_damage_scale"].includes(key) ? { min: key === "boss_damage_scale" ? 0.05 : 0.01, max: 50, title: "Hasar \xE7arpan\u0131: en fazla 50" } : {};
}
const { normalizeEventQueue499: colEventNormalize499, eventOccurrence499: colEventCurrent499, eventDisplay499: colEventDisplay499 } = /* @__PURE__ */ (() => {
  const KINDS = /* @__PURE__ */ new Set(["loot", "xp", "essence", "chest", "moonlight", "fishing", "halloween"]);
  const CHANCE = /* @__PURE__ */ new Set(["chest", "moonlight", "fishing", "halloween"]);
  const EVENT_QUEUE_LIMIT499 = 32;
  function validRow499(kind, row) {
    if (!row || typeof row !== "object" || Array.isArray(row) || typeof row.enabled !== "boolean" || !Number.isSafeInteger(row.start) || !Number.isSafeInteger(row.end) || row.start <= 0 || row.end <= row.start || row.end > 4102444800 || !Number.isFinite(row.percent) || row.percent < 0 || row.percent > (CHANCE.has(kind) ? 100 : 500) || typeof row.runId !== "string" || row.runId.length < 1 || row.runId.length > 80) throw Error("Etkinlik takvimi: oran\u0131 ve ba\u015Flang\u0131\xE7/biti\u015F saatini kontrol et.");
    return { enabled: row.enabled, start: row.start, end: row.end, percent: row.percent, runId: row.runId };
  }
  function normalizeEventQueue499(kind, value, primary) {
    if (!KINDS.has(kind) || value !== void 0 && !Array.isArray(value)) throw Error("Etkinlik takvimi ge\xE7ersiz.");
    if ((value?.length ?? 0) > EVENT_QUEUE_LIMIT499) throw Error("Her etkinlik t\xFCr\xFC i\xE7in en fazla 32 tarih planlanabilir.");
    const queue = (value ?? []).map((row) => validRow499(kind, row)).filter((row) => row.enabled).sort((a2, b2) => a2.start - b2.start || a2.end - b2.end || a2.runId.localeCompare(b2.runId));
    const ids = /* @__PURE__ */ new Set();
    for (const row of queue) {
      if (ids.has(row.runId) || row.runId === primary?.runId) throw Error("Ayn\u0131 etkinlik kayd\u0131 iki kez eklenemez.");
      ids.add(row.runId);
    }
    const enabled = queue.filter((row) => row.enabled);
    if (primary?.enabled) enabled.push(primary);
    enabled.sort((a2, b2) => a2.start - b2.start);
    for (let i2 = 1; i2 < enabled.length; i2++) if (enabled[i2].start < enabled[i2 - 1].end) throw Error("Ayn\u0131 t\xFCr etkinliklerin saatleri \xE7ak\u0131\u015Famaz. Ba\u015Fka bir saat se\xE7.");
    return queue;
  }
  function eventOccurrence499(event, now = Date.now() / 1e3) {
    if (event?.enabled && now >= event.start && now < event.end) return event;
    const queue = event?.schedule499;
    if (!Array.isArray(queue) || queue.length === 0) return null;
    let lo = 0, hi = queue.length - 1, at2 = -1;
    while (lo <= hi) {
      const mid = lo + hi >> 1;
      if (queue[mid].start <= now) {
        at2 = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    const row = queue[at2];
    return row?.enabled && now < row.end ? row : null;
  }
  function eventDisplay499(event, now = Date.now() / 1e3) {
    const current = eventOccurrence499(event, now);
    if (current) return current;
    let next = event?.enabled && event.start > now ? event : null;
    for (const row of event?.schedule499 ?? []) if (row.enabled && row.start > now && (!next || row.start < next.start)) next = row;
    return next ?? event;
  }
  function appendEvent499(config, kind, input, now, runId) {
    if (!KINDS.has(kind) || !config?.events?.[kind]) throw Error("Etkinlik t\xFCr\xFC ge\xE7ersiz.");
    const row = validRow499(kind, { ...input, enabled: true, runId });
    if (row.end <= now) throw Error("Biti\u015F tarihi ge\xE7mi\u015Fte olamaz. Yeni bir biti\u015F se\xE7.");
    const event = config.events[kind], kept = (event.schedule499 ?? []).filter((old) => old.enabled && old.end > now);
    event.schedule499 = normalizeEventQueue499(kind, [...kept, row], event);
    return row;
  }
  function stopEvent499(config, kind, runId, now) {
    const event = config.events[kind];
    if (!event) throw Error("Etkinlik t\xFCr\xFC ge\xE7ersiz.");
    if (runId !== void 0 && typeof runId !== "string") throw Error("Etkinlik kayd\u0131 ge\xE7ersiz.");
    const row = runId === void 0 ? eventOccurrence499(event, now) ?? event : event.runId === runId ? event : (event.schedule499 ?? []).find((item) => item.runId === runId);
    if (!row) throw Error("Etkinlik kayd\u0131 bulunamad\u0131. Paneli yenile.");
    if (row === event) event.enabled = false;
    else event.schedule499 = event.schedule499.filter((item) => item.runId !== row.runId);
  }
  function retainEventQueues499(input, old) {
    return { ...input, events: Object.fromEntries(Object.entries(input?.events ?? {}).map(([kind, event]) => [kind, { ...event, schedule499: old.events[kind]?.schedule499 ?? [] }])) };
  }
  ;
  return { normalizeEventQueue499, eventOccurrence499, eventDisplay499 };
})();
function colEventsMerge499(parsed, raw) {
  let incoming;
  try {
    incoming = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return parsed;
  }
  const events = { ...parsed.events };
  for (const kind of Object.keys(events)) {
    try {
      events[kind] = { ...events[kind], schedule499: colEventNormalize499(kind, incoming?.events?.[kind]?.schedule499, events[kind]) };
    } catch {
      events[kind] = { ...events[kind], schedule499: [] };
    }
  }
  return { ...parsed, events };
}
function colEventRows499(config, now) {
  const rows = [];
  for (const kind of ["loot", "xp", "essence", "chest", "moonlight", "fishing", "halloween"]) {
    const event = config?.events?.[kind];
    if (!event) continue;
    for (const row of [event, ...(event.schedule499 ?? []).slice(0, 32)]) if (row.enabled && row.end > now) rows.push({ kind, event: row, key: kind + ":" + row.runId + ":" + row.start });
  }
  return rows.sort((a2, b2) => a2.event.start - b2.event.start || a2.kind.localeCompare(b2.kind));
}
function colEventDateInput499(seconds) {
  return Number.isSafeInteger(seconds) && seconds > 0 && seconds <= 4102444800 ? new Date(seconds * 1e3 + 108e5).toISOString().slice(0, 16) : "";
}
function colEventDateParse499(value) {
  if (!value) return 0;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return NaN;
  const seconds = Date.parse(value + ":00+03:00") / 1e3;
  return Number.isSafeInteger(seconds) && colEventDateInput499(seconds) === value ? seconds : NaN;
}
const colEventDateFormatter499 = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
function colEventDateLabel499(seconds) {
  return colEventDateFormatter499.format(new Date(seconds * 1e3));
}
function colEventCalendar499(React, config, now, labels, remaining) {
  const h2 = React.createElement;
  return colEventRows499(config, now).map(({ kind, event: e2, key }) => {
    const running = now >= e2.start, label = labels[kind] ?? (kind === "halloween" ? "Cad\u0131lar Bayram\u0131" : kind);
    const description = kind === "fishing" ? `Ba\u015Far\u0131l\u0131 av ba\u015F\u0131na %${e2.percent} \u015Fansla ek \xF6d\xFCl: Efsun De\u011Fi\u015Ftirme, Efsun Art\u0131rma, +2 Saat Oto Av Bileti veya Oto K\u0131rm\u0131z\u0131 \u0130ksir. Normal av \xF6d\xFCl\xFCn korunur.` : kind === "halloween" ? `Canavarlardan %${e2.percent} \u015Fansla Bal Kaba\u011F\u0131.` : kind === "chest" || kind === "moonlight" ? `Canavarlardan %${e2.percent} \u015Fansla sand\u0131k.` : `Canavar \xF6d\xFCllerinde +%${e2.percent} ${kind === "xp" ? "TP" : kind === "essence" ? "\xD6z" : "e\u015Fya d\xFC\u015F\xFCrme"}.`;
    return h2("article", { key, className: "event-calendar499" }, h2("div", null, (kind === "chest" || kind === "moonlight") && h2("img", { src: kind === "moonlight" ? "/game/moonlight-chest-v357.webp" : "/game/crystal-chest.webp", alt: label }), h2("strong", null, label), h2("b", null, running ? "AKT\u0130F" : "YAKINDA")), h2("p", null, description), h2("p", { className: "event-calendar-date499" }, colEventDateLabel499(e2.start) + " \u2013 " + colEventDateLabel499(e2.end) + " \xB7 T\xFCrkiye saati"), h2("time", { dateTime: new Date((running ? e2.end : e2.start) * 1e3).toISOString() }, (running ? "Kalan: " : "Ba\u015Flamas\u0131na: ") + remaining((running ? e2.end : e2.start) - now)));
  });
}
function colEventAdminRows499(React, config, now, labels, busy, act, raw, report) {
  const h2 = React.createElement, rows = colEventRows499(config, now);
  return h2("section", { className: "event-schedule-list499", "aria-label": "Etkinlik takvimi" }, h2("h3", null, "Aktif ve planlanan etkinlikler"), h2("p", null, "Ayn\u0131 anda farkl\u0131 etkinlikler \xE7al\u0131\u015Fabilir. Ayn\u0131 t\xFCr\xFCn saatleri \xE7ak\u0131\u015Famaz. T\xFCm saatler T\xFCrkiye saati (UTC+3)."), rows.length ? h2("div", { className: "event-schedule-scroll499" }, h2("table", null, h2("thead", null, h2("tr", null, ...["Etkinlik", "Ba\u015Flang\u0131\xE7", "Biti\u015F", "Oran", "Durum", "\u0130\u015Flem"].map((label) => h2("th", { key: label, scope: "col" }, label)))), h2("tbody", null, ...rows.map(({ kind, event: e2, key }) => h2("tr", { key }, h2("td", null, labels[kind] ?? kind), h2("td", null, colEventDateLabel499(e2.start)), h2("td", null, colEventDateLabel499(e2.end)), h2("td", null, "%" + e2.percent), h2("td", null, now >= e2.start ? "Aktif" : "Planland\u0131"), h2("td", null, h2("button", { disabled: busy, onClick: async () => {
    try {
      report?.("");
      await act({ action: "event_stop", eventKind: kind, eventRunId499: e2.runId, expectedEvents: raw });
    } catch (error) {
      report?.(error?.message ?? "Etkinlik iptal edilemedi.");
    }
  } }, now >= e2.start ? "Durdur" : "Plan\u0131 iptal et"))))))) : h2("p", null, "Aktif veya planlanan etkinlik yok."));
}
function colSecurityNotice508(body, result, error) {
  if (!["security_ban_permanent", "security_suspend", "security_unban"].includes(body?.action)) return;
  const message = error ? error instanceof Error ? error.message : "Hesap i\u015Flemi tamamlanamad\u0131." : result?.securityResult508?.message || "Hesap i\u015Flemi tamamland\u0131.";
  window.alert(message);
}
const tower511Admin = createTower511(X);
