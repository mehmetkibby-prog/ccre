// r31-work/working/core511-source/scripts/core511/belt-model.mjs
var make = (variant, name, attack, hp, experiencePercent, strongPlayers) => Object.freeze({ id: variant, variant, kind: "belt", name, image: "/game/belt-" + variant + "-r31.webp", attack, hp, experiencePercent, strongPlayers });
var BELTS_R31 = Object.freeze({
  wisdom: make("wisdom", "Bilgelik Kemeri", 50, 0, 20, 0),
  sovereign: make("sovereign", "H\xFCk\xFCmdar Kemeri", 0, 1500, 0, 10)
});
var ingredient = (kind, name, amount, image) => Object.freeze({ kind, name, label: name, amount, image });
var BELT_RECIPE_R31 = Object.freeze([
  ingredient("forge_ember491", "Kor M\xFChr\xFC", 100, "/game/forge-ember-v491.webp"),
  ingredient("tower_seal_shard", "Kadim Kat M\xFChr\xFC", 100, null),
  ingredient("tower_chain_ore", "Ruh Zinciri Halkas\u0131", 100, null),
  ingredient("tower_mourning_essence", "Sinsi Ta\u015F \xC7ekirde\u011Fi", 100, null),
  ingredient("tower_azrail_seal", "Matem \u0130pe\u011Fi", 50, null),
  ingredient("tower_azrail_hook", "Azrail Kancas\u0131", 10, null)
]);
var BELT_ACTIONS_R31 = Object.freeze(["craft_belt_r31", "equip_belt_r31", "unequip_belt_r31"]);
function beltDefinition(item) {
  if (!item || item.kind !== "belt") return null;
  return Object.values(BELTS_R31).find((def) => def.name === item.item_name) ?? null;
}
function validBeltItem(item) {
  return !!beltDefinition(item) && item.rarity === "crafted" && item.power === 0 && item.role === "all" && item.enchantments === "[]" && Number(item.expires_at_ms ?? 0) === 0 && Number(item.premium_origin ?? 0) === 0;
}
function beltStats(items) {
  const empty = { attack: 0, hp: 0, experiencePercent: 0, strongPlayers: 0 };
  const worn = (items ?? []).filter((i) => i.equipped === 1 && i.kind === "belt");
  if (worn.length !== 1) return empty;
  const def = validBeltItem(worn[0]) ? beltDefinition(worn[0]) : null;
  return def ? Object.fromEntries(Object.keys(empty).map((k) => [k, def[k]])) : empty;
}
var BELT_PAKIZE_R31 = Object.freeze({ name: "Zanaat Ustas\u0131 Pakize", area: "bazaar", x: 1070, y: 390, reach: 245 });

// r31-work/working/core511-source/scripts/core511/belt-client.mjs
var BELT_CSS_R31 = `
.belt31-icon{display:block;width:56px;height:56px;max-width:100%;object-fit:contain;flex-shrink:0}
.belt31-empty-icon{display:grid;place-items:center;width:48px;height:48px;color:#b9a87b;border:1px dashed #8c805b;border-radius:10px;font-size:24px}
.belt31-slot{box-sizing:border-box;display:flex!important;align-items:center;gap:10px;width:100%;min-width:0;min-height:76px;padding:10px!important;border:1px solid #a38a50!important;background:linear-gradient(110deg,#172a24,#241e19)!important;color:#eadfbd;text-align:left;border-radius:9px}
.belt31-slot>span:last-child{min-width:0;display:grid;gap:3px}.belt31-slot strong,.belt31-slot small{white-space:normal!important;overflow-wrap:anywhere;line-height:1.3}.belt31-slot strong{font-size:13px}.belt31-slot small{font-size:11px;color:#c3b78f}.belt31-slot .belt31-icon{width:48px;height:48px}.belt31-slot:hover{border-color:#e6c36f!important}
.belt31-bonuses{display:flex;flex-wrap:wrap;gap:7px;min-width:0}.belt31-bonuses b{display:block;white-space:normal;overflow-wrap:anywhere;font-size:13px;line-height:1.4;padding:5px 9px;border:1px solid #837342;border-radius:6px;color:#f3dd99;background:#18291e}
.belt31-details{box-sizing:border-box;display:grid;gap:8px;width:100%;max-width:100%;min-width:0;padding:10px}.belt31-details strong,.belt31-details p,.belt31-details small{white-space:normal;overflow-wrap:anywhere;margin:0}.belt31-details small,.belt31-details p{color:#c3cbbb;font-size:12px;line-height:1.5}
.belt31-dialog{box-sizing:border-box;width:min(760px,calc(100vw - 24px))!important;max-width:calc(100vw - 24px)!important;max-height:calc(100dvh - 24px)!important;overflow:auto!important;padding:22px!important;background:#101d18!important;border:1px solid #9c8147!important;border-radius:18px!important;color:#f2ead5;box-shadow:0 24px 90px #000b}.belt31-dialog *, .belt31-dialog *:before,.belt31-dialog *:after{box-sizing:border-box}.belt31-dialog h2{margin:0;color:#efd796;font:700 25px Georgia,serif}.belt31-dialog p{line-height:1.5}.belt31-dialog button{white-space:normal;overflow-wrap:anywhere;touch-action:manipulation;cursor:pointer}.belt31-dialog button:disabled{cursor:default;opacity:.55}.belt31-intro{font-size:13px;color:#b7c6b7;margin:8px 0 18px}.belt31-choice{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:14px 0}.belt31-choice button{min-width:0;display:flex;gap:10px;align-items:center;padding:12px;border:1px solid #566149;border-radius:11px;background:#15271f;color:#e5dcc0;text-align:left}.belt31-choice button[aria-pressed=true]{border-color:#d7b86a;background:linear-gradient(135deg,#314230,#30271c);box-shadow:inset 0 0 0 1px #d7b86a55}.belt31-choice span{min-width:0}.belt31-choice strong,.belt31-choice small{display:block;white-space:normal;overflow-wrap:anywhere;line-height:1.4}.belt31-choice strong{font-size:14px}.belt31-choice small{font-size:11px;color:#b6c7b2;margin-top:4px}.belt31-product{display:flex;align-items:center;gap:18px;min-width:0;padding:16px;margin:14px 0;background:radial-gradient(ellipse at left,#3b4936,#13221b 75%);border:1px solid #67734d;border-radius:12px}.belt31-product>.belt31-icon{width:112px;height:112px}.belt31-product>div{min-width:0;flex:1}.belt31-product h3{font:700 22px Georgia,serif;color:#efcf85;margin:0 0 10px;overflow-wrap:anywhere}.belt31-product p{font-size:12px;color:#b9c5b4;margin:10px 0 0}.belt31-material-title{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:20px 0 10px}.belt31-material-title h3{font-size:15px;margin:0}.belt31-material-title small{color:#aebcaa;font-size:12px}.belt31-materials{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.belt31-material{min-width:0;display:grid;grid-template-columns:42px minmax(0,1fr);align-items:center;gap:8px;padding:10px;border:1px solid #475944;background:#13231b;border-radius:9px}.belt31-material.ready{border-color:#548859}.belt31-material.missing{border-color:#815746}.belt31-material strong,.belt31-material small{display:block;overflow-wrap:anywhere;white-space:normal;line-height:1.35}.belt31-material strong{font-size:12px;color:#e2e6d8}.belt31-material small{font-size:11px;margin-top:4px;color:#c3bdad}.belt31-material b{color:#cbe3a8}.belt31-material.missing b{color:#e8a78b}.belt31-material .tower18-icon{display:inline-block;background-image:url(/assets/tower-r18/items.webp);background-repeat:no-repeat}.belt31-material img,.belt31-material .tower18-icon{width:42px;height:42px;object-fit:contain;flex-shrink:0}.belt31-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:18px;padding-top:16px;border-top:1px solid #4d5b3d}.belt31-footer p{margin:0;font-size:12px;color:#b7c6ae;flex:1;min-width:120px}.belt31-craft,.belt31-open{border:1px solid #dfc078;border-radius:8px;background:linear-gradient(#d5b365,#aa8748);color:#1c2317;min-height:44px;padding:10px 16px;font-weight:750;font-size:14px}.belt31-open{width:100%;margin:12px 0;background:#213b2b;color:#eddbb2;border-color:#9d8249}.belt31-message{margin:12px 0 0;padding:10px 12px;border-left:3px solid #c2a668;background:#233528;font-size:13px;overflow-wrap:anywhere;white-space:pre-wrap}.belt31-back{margin-top:14px;background:transparent;border:1px solid #607453;border-radius:7px;color:#d1d9bf;padding:8px 12px;min-height:40px}.rarity-crafted.bag-gear-card,.rarity-crafted.gear-slot{border-color:#a1864d}.belt31-stat-label{color:#d8c48c}
@media(max-width:520px){.belt31-dialog{padding:16px!important}.belt31-dialog h2{font-size:22px}.belt31-choice{gap:7px}.belt31-choice button{padding:9px;flex-direction:column;align-items:flex-start;gap:6px}.belt31-choice .belt31-icon{width:58px;height:58px}.belt31-product{padding:12px;gap:11px}.belt31-product>.belt31-icon{width:78px;height:78px}.belt31-product h3{font-size:19px}.belt31-bonuses{gap:5px}.belt31-bonuses b{font-size:12px;padding:4px 6px}.belt31-materials{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.belt31-material{padding:8px;grid-template-columns:34px minmax(0,1fr);gap:6px}.belt31-material img,.belt31-material .tower18-icon{width:34px;height:34px}.belt31-material strong{font-size:11px}.belt31-material small{font-size:10px}.belt31-craft{width:100%}}
`;
var materialNames = Object.freeze({ forge_ember491: "Kor M\xFChr\xFC", tower_seal_shard: "Kadim Kat M\xFChr\xFC", tower_chain_ore: "Ruh Zinciri Halkas\u0131", tower_mourning_essence: "Sinsi Ta\u015F \xC7ekirde\u011Fi", tower_azrail_seal: "Matem \u0130pe\u011Fi", tower_azrail_hook: "Azrail Kancas\u0131" });
var numbers = (value) => Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("tr-TR");
function beltRecipeRows(world) {
  const counts = new Map((world?.dungeonMaterials ?? []).map((row) => [row.kind, row.amount]));
  const recipe = Array.isArray(BELT_RECIPE_R31) ? BELT_RECIPE_R31 : Object.entries(BELT_RECIPE_R31.materials ?? BELT_RECIPE_R31).map(([kind, amount]) => ({ kind, amount }));
  return recipe.map((row) => ({ ...row, name: row.name ?? row.label ?? materialNames[row.kind], owned: Math.max(0, Number(counts.get(row.kind) ?? world?.adventure511?.towerInfo?.inventory?.[row.kind]) || 0) }));
}
function beltNearPakize(own, world, now = Date.now()) {
  return !!own && world?.area === "bazaar" && own.hp > 0 && !own.arena_match_id && !(own.combat_lock_until_ms > now) && !world?.run && !world?.adventure511?.run && Math.hypot(Number(own.x) - 1070, Number(own.y) - 390) <= 245;
}
function beltBonusLabels(item) {
  const def = beltDefinition(item);
  if (!def) return [];
  return [...def.experiencePercent ? [`%${def.experiencePercent} EXP`] : [], ...def.attack ? [`+${numbers(def.attack)} Sald\u0131r\u0131`] : [], ...def.hp ? [`+${numbers(def.hp)} Can`] : [], ...def.strongPlayers ? [`Oyunculara kar\u015F\u0131 %${def.strongPlayers} g\xFC\xE7`] : []];
}
function createBeltCommands({ randomUUID = () => crypto.randomUUID(), now = Date.now } = {}) {
  const pending = /* @__PURE__ */ new Map();
  function command(post, action, extra, actorId) {
    if (!actorId) return Promise.reject(Error("\xD6nce oyuna giri\u015F yap."));
    if (!["craft_belt_r31", "equip_belt_r31", "unequip_belt_r31"].includes(action)) return Promise.reject(Error("Kemer i\u015Flemi ge\xE7ersiz."));
    const key = JSON.stringify([action, extra]), old = pending.get(actorId);
    if (old && old.key !== key) return Promise.reject(Error("\xD6nce bekleyen kemer i\u015Flemini ayn\u0131 d\xFC\u011Fmeyle yeniden sorgula."));
    if (old?.flight) return old.flight;
    const attempt = old ?? { key, requestId: randomUUID(), requestAt: now() };
    pending.set(actorId, attempt);
    attempt.flight = Promise.resolve().then(() => post("/api/action", { action, ...extra, requestId: attempt.requestId, requestAt: attempt.requestAt })).then((result) => {
      if (!result?.ok) throw Object.assign(Error(result?.error ?? "Kemer i\u015Flemi do\u011Frulanamad\u0131."), { status: result?.status, payload: result });
      if (pending.get(actorId) === attempt) pending.delete(actorId);
      return result;
    }).catch((error) => {
      if (error?.status >= 400 && error.status < 500 && error?.payload?.code !== "command_outcome_unknown" && pending.get(actorId) === attempt) pending.delete(actorId);
      throw error;
    }).finally(() => {
      attempt.flight = null;
    });
    return attempt.flight;
  }
  return { command, pending: (actorId) => pending.get(actorId) ?? null };
}
function createBeltUI(React, { Dialog, Content, Header, Title, Description, MaterialIcon, art = {} } = {}) {
  const h = React.createElement, commands = createBeltCommands();
  const definition = (item, variant) => variant && Object.hasOwn(BELTS_R31, variant) ? BELTS_R31[variant] : beltDefinition(item && { ...item, item_name: item.item_name ?? item.name });
  const variantOf = (def) => Object.keys(BELTS_R31).find((key) => BELTS_R31[key] === def || BELTS_R31[key].name === def?.name);
  function Icon({ item, variant, item_name, name, className = "" }) {
    const def = definition(item ?? { kind: "belt", item_name: item_name ?? name }, variant), src = def && art[variantOf(def)];
    return src ? h("img", { src, alt: def.name, width: 56, height: 56, decoding: "async", draggable: false, className: "belt31-icon " + className }) : h("span", { className: "belt31-empty-icon " + className, "aria-label": "Kemer yuvas\u0131", role: "img" }, "\u25C7");
  }
  function Bonuses({ item, variant }) {
    const def = definition(item, variant), labels = beltBonusLabels({ kind: "belt", item_name: def?.name });
    return h("div", { className: "belt31-bonuses" }, ...labels.map((label) => h("b", { key: label }, label)));
  }
  function Details({ item }) {
    const def = definition(item);
    return h("div", { className: "gear-quick-details rarity-crafted belt31-details" }, h("strong", null, def?.name ?? item?.item_name ?? "Kemer"), h("small", null, "T\xFCm s\u0131n\u0131flar \xB7 Kemer \xB7 Seviye s\u0131n\u0131r\u0131 yok"), h(Bonuses, { item }), h("p", null, "Ayn\u0131 anda yaln\u0131zca bir kemer tak\u0131l\u0131r. \xC7\u0131kar\u0131ld\u0131\u011F\u0131nda pazarda sat\u0131labilir."), h("small", null, "Sabit \xF6zellikler \xB7 Efsun ve art\u0131 basma uygulanmaz."));
  }
  function Slot({ inventory, onInspect }) {
    const item = inventory?.find((value) => value.kind === "belt" && value.equipped === 1);
    return h(item ? "button" : "div", { ...item ? { type: "button", onClick: () => onInspect?.(item), "aria-label": (item.item_name ?? "Kemer") + " \xF6zelliklerini a\xE7", "data-stone-item": item.id } : {}, className: "gear-slot belt31-slot rarity-crafted" }, h(Icon, { item }), h("span", null, h("small", null, "Kemer \xB7 Tek yuva"), h("strong", null, item?.item_name ?? "Bo\u015F kemer yuvas\u0131"), h("small", null, item ? beltBonusLabels(item).join(" \xB7 ") : "Bilgelik veya H\xFCk\xFCmdar Kemeri")));
  }
  function DetailPanel({ item, own, post, onChanged }) {
    const [busy, setBusy] = React.useState(false), [message, setMessage] = React.useState(""), alive = React.useRef(true);
    React.useEffect(() => {
      alive.current = true;
      return () => {
        alive.current = false;
      };
    }, []);
    async function act() {
      if (busy) return;
      setBusy(true);
      setMessage("");
      try {
        const result = await commands.command(post, item.equipped === 1 ? "unequip_belt_r31" : "equip_belt_r31", { itemId: item.id }, own?.id);
        if (alive.current) {
          setMessage(result.message ?? "Kemer g\xFCncellendi.");
          await onChanged?.();
        }
      } catch (error) {
        if (alive.current) setMessage(error?.message ?? "\u0130\u015Flem do\u011Frulanamad\u0131.");
      } finally {
        if (alive.current) setBusy(false);
      }
    }
    return h("div", { className: "belt31-details" }, h(Icon, { item }), h(Details, { item }), post && h("button", { type: "button", className: "belt31-craft", disabled: busy, onClick: act }, busy ? "\u0130\u015Fleniyor\u2026" : item.equipped === 1 ? "\xDCzerinden \xE7\u0131kar" : "Kemeri tak"), message && h("p", { role: "status" }, message));
  }
  function Stats({ inventory }) {
    const bonus = beltStats(inventory ?? []);
    return h(React.Fragment, null, ...[["Kemer EXP bonusu", `%${bonus.experiencePercent}`], ["Kemer sald\u0131r\u0131 / can", `+${numbers(bonus.attack)} / +${numbers(bonus.hp)}`], ["Kemer oyunculara kar\u015F\u0131 g\xFC\xE7", `%${bonus.strongPlayers}`]].map(([label, value]) => h("div", { key: label }, h("span", { className: "belt31-stat-label" }, label), h("b", null, value))));
  }
  function Host({ own, world, joined, post, onChanged }) {
    const [open, setOpen] = React.useState(false), [variant, setVariant] = React.useState("wisdom"), [busy, setBusy] = React.useState(false), [message, setMessage] = React.useState("");
    const latest = React.useRef(null), alive = React.useRef(true);
    latest.current = { own, world, joined, post, onChanged };
    React.useEffect(() => {
      alive.current = true;
      const show = () => {
        if (latest.current.joined && latest.current.own) {
          setOpen(true);
          setMessage("");
        }
      }, hide = () => setOpen(false);
      window.addEventListener("belt31-open", show);
      for (const name of ["coreoflife:maintenance", "coreoflife:game-session-ended", "pagehide"]) window.addEventListener(name, hide);
      return () => {
        alive.current = false;
        window.removeEventListener("belt31-open", show);
        for (const name of ["coreoflife:maintenance", "coreoflife:game-session-ended", "pagehide"]) window.removeEventListener(name, hide);
      };
    }, []);
    React.useEffect(() => {
      setOpen(false);
      setMessage("");
    }, [own?.id, joined]);
    const def = BELTS_R31[variant], rows = beltRecipeRows(world), enough = rows.length === 6 && rows.every((row) => row.owned >= row.amount), near = beltNearPakize(own, world), waiting = commands.pending(own?.id);
    async function craft() {
      if (busy || !own) return;
      setBusy(true);
      setMessage("");
      const actorId = own.id;
      try {
        const result = await commands.command(post, "craft_belt_r31", { variant }, actorId);
        if (alive.current && latest.current.own?.id === actorId) {
          setMessage(result.message ?? def.name + " \xE7antana eklendi.");
          await latest.current.onChanged?.();
        }
      } catch (error) {
        if (alive.current && latest.current.own?.id === actorId) setMessage(error?.message ?? "\u0130\u015Flem do\u011Frulanamad\u0131; ayn\u0131 d\xFC\u011Fmeyle yeniden sorgula.");
      } finally {
        if (alive.current) setBusy(false);
      }
    }
    const body = h(React.Fragment, null, h(Header ?? "header", null, h(Title ?? "h2", null, "Pakize \xB7 Kemer D\xF6n\xFC\u015F\xFCm\xFC"), h(Description ?? "p", { className: "belt31-intro" }, "\u0130ki farkl\u0131 g\xFC\xE7, tek kemer yuvas\u0131. Malzemelerini se\xE7ti\u011Fin kemere d\xF6n\xFC\u015Ft\xFCr.")), h("nav", { className: "belt31-choice", "aria-label": "Kemer se\xE7imi" }, ...Object.entries(BELTS_R31).map(([key, value]) => h("button", { key, type: "button", "aria-pressed": variant === key, disabled: busy || !!waiting, onClick: () => {
      setVariant(key);
      setMessage("");
    } }, h(Icon, { variant: key }), h("span", null, h("strong", null, value.name), h("small", null, key === "wisdom" ? "Geli\u015Fim ve sald\u0131r\u0131" : "Can ve PvP g\xFCc\xFC"))))), h("section", { className: "belt31-product" }, h(Icon, { variant }), h("div", null, h("h3", null, def.name), h(Bonuses, { variant }), h("p", null, "T\xFCm s\u0131n\u0131flar \xB7 Seviye s\u0131n\u0131r\u0131 yok \xB7 Pazarda sat\u0131labilir"))), h("div", { className: "belt31-material-title" }, h("h3", null, "D\xF6n\xFC\u015F\xFCm malzemeleri"), h("small", null, "\xC7antandaki / Gereken")), h("div", { className: "belt31-materials" }, ...rows.map((row) => h("article", { key: row.kind, className: "belt31-material " + (row.owned >= row.amount ? "ready" : "missing"), "data-material": row.kind }, row.kind === "forge_ember491" ? h("img", { src: "/game/forge-ember-v491.webp", alt: "", width: 42, height: 42, decoding: "async" }) : MaterialIcon ? h(MaterialIcon, { kind: row.kind }) : null, h("div", null, h("strong", null, row.name), h("small", null, h("b", null, numbers(row.owned)), " / ", numbers(row.amount)))))), h("footer", { className: "belt31-footer" }, h("p", null, "Her d\xF6n\xFC\u015F\xFCm 1 kemer \xFCretir. M\xFCcevher veya alt\u0131n gerekmez."), h("button", { type: "button", className: "belt31-craft", disabled: busy || !joined || !waiting && (!near || !enough), onClick: craft }, busy ? "D\xF6n\xFC\u015Ft\xFCr\xFCl\xFCyor\u2026" : waiting ? "Sonucu yeniden sorgula" : !near ? "Pakize\u2019ye yakla\u015F" : !enough ? "Malzemeler eksik" : "Kemere d\xF6n\xFC\u015Ft\xFCr")), message && h("p", { className: "belt31-message", role: "status" }, message), h("button", { type: "button", className: "belt31-back", disabled: busy, onClick: () => {
      setOpen(false);
      window.dispatchEvent(new CustomEvent("expansion456-npc", { detail: { mode: "pakize" } }));
    } }, "K\xFCpe ve bilezik at\xF6lyesine d\xF6n"));
    return h(React.Fragment, null, h("style", null, BELT_CSS_R31), Dialog ? h(Dialog, { open, onOpenChange: (value) => {
      if (!busy) setOpen(value);
    } }, h(Content, { className: "belt31-dialog" }, body)) : open ? h("section", { className: "belt31-dialog", role: "dialog", "aria-modal": true, "aria-label": "Pakize \xB7 Kemer D\xF6n\xFC\u015F\xFCm\xFC" }, body) : null);
  }
  return { Icon, Bonuses, Details, DetailPanel, Slot, Stats, Host, command: commands.command };
}
export {
  BELT_CSS_R31,
  beltBonusLabels,
  beltNearPakize,
  beltRecipeRows,
  beltStats,
  createBeltCommands,
  createBeltUI
};
