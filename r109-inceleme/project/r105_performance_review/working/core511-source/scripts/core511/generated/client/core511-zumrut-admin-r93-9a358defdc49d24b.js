// ../../../tmp/core511-r93-zumrut/working/core511-source/scripts/core511/zumrut-admin-client-r93.mjs
function validateZumrutAdminDraftR93(config, catalog) {
  if (!config || typeof config.enabled !== "boolean") return "Haritan\u0131n a\xE7\u0131k veya kapal\u0131 oldu\u011Funu se\xE7.";
  if (!["admin", "public"].includes(config.access)) return "Haritaya kimlerin girebilece\u011Fini se\xE7.";
  if (!Number.isSafeInteger(config.gatherMs) || config.gatherMs < 1500 || config.gatherMs > 1e4) return "Toplama s\xFCresi 1.500\u201310.000 ms olmal\u0131.";
  if (!Number.isSafeInteger(config.craftMs) || config.craftMs < 2e3 || config.craftMs > 15e3) return "\xDCretim s\xFCresi 2.000\u201315.000 ms olmal\u0131.";
  const byId = new Map(catalog.map((x) => [x.id, x]));
  for (const rows of [config.toolCosts?.axe, config.toolCosts?.pickaxe, config.recipe?.costs]) {
    if (!Array.isArray(rows) || rows.length > 12) return "Her bedelde en fazla 12 e\u015Fya se\xE7ebilirsin.";
    const seen2 = /* @__PURE__ */ new Set(), balances = /* @__PURE__ */ new Set();
    for (const row of rows) {
      const item = byId.get(row.itemId);
      if (!item?.costAllowed) return "Bedel i\xE7in harcanabilir bir \xE7anta e\u015Fyas\u0131 veya kaynak se\xE7.";
      if (seen2.has(item.id)) return "Ayn\u0131 e\u015Fyay\u0131 tek bedelde iki kez se\xE7me.";
      seen2.add(item.id);
      const p = item.payment, key = p && !p.selection ? p.table + ":" + (p.column ?? p.kind) : null;
      if (key && balances.has(key)) return "Ayn\u0131 bakiye farkl\u0131 adlarla iki kez se\xE7ilemez.";
      if (key) balances.add(key);
      if (!Number.isSafeInteger(row.amount) || row.amount < 1 || row.amount > (item.payment?.selection ? 35 : 1e6)) return "Bedel miktar\u0131 ge\xE7ersiz.";
    }
  }
  const rewards = config.recipe?.rewards;
  if (!Array.isArray(rewards) || rewards.length > 32) return "En fazla 32 farkl\u0131 \xFCretim sonucu se\xE7ebilirsin.";
  const seen = /* @__PURE__ */ new Set();
  let chance = 0;
  for (const row of rewards) {
    const item = byId.get(row.itemId);
    if (!item?.rewardAllowed || seen.has(row.itemId)) return "Ge\xE7erli ve farkl\u0131 \xFCretim e\u015Fyalar\u0131 se\xE7.";
    seen.add(row.itemId);
    if (!Number.isSafeInteger(row.amount) || row.amount < 1 || row.amount > item.maxAmount) return item.name + " i\xE7in adet 1\u2013" + item.maxAmount + " olmal\u0131.";
    if (!Number.isFinite(row.chance) || row.chance <= 0 || row.chance > 100 || Math.abs(row.chance * 100 - Math.round(row.chance * 100)) > 1e-7) return "Her \u015Fans %0\u2019dan b\xFCy\xFCk, en fazla iki ondal\u0131k basamakl\u0131 olmal\u0131.";
    chance += Math.round(row.chance * 100);
  }
  if (rewards.length && chance !== 1e4) return "\xDCretim \u015Fanslar\u0131n\u0131n toplam\u0131 tam %100 olmal\u0131.";
  if (rewards.length && !config.recipe.costs.length) return "\xDCretim i\xE7in en az bir malzeme bedeli se\xE7.";
  return "";
}
var css = `
.zumrut93-admin{grid-column:1/-1;min-width:0;color:#e9f1e7}.zumrut93-admin *{box-sizing:border-box}.zumrut93-admin .z93-hero{padding:24px;border:1px solid #528066;border-radius:14px;background:linear-gradient(120deg,#193d30,#10291f 68%,#244439);margin-bottom:18px}.zumrut93-admin .z93-hero small{letter-spacing:.13em;text-transform:uppercase;color:#acd8be}.zumrut93-admin h2{font-size:25px;color:#f2dfad;margin:6px 0}.zumrut93-admin p{line-height:1.6;margin:10px 0;color:#c0d3c5}.zumrut93-admin h3{margin:0 0 13px;color:#f0d8a0}.zumrut93-admin label{display:grid;gap:6px;min-width:0;font-size:13px}.zumrut93-admin input,.zumrut93-admin select{min-height:42px;min-width:0;width:100%;border:1px solid #56705f;border-radius:7px;background:#0e2119;color:#f4f1df;padding:9px;font:inherit;color-scheme:dark}.zumrut93-admin button{min-height:42px;padding:9px 14px;border:1px solid #60866c;border-radius:7px;background:#284c36;color:#f1e5c1;font:inherit;cursor:pointer}.zumrut93-admin button:hover:not(:disabled){background:#365f43;border-color:#ddc891}.zumrut93-admin button:disabled{opacity:.45;cursor:default}.zumrut93-admin :is(button,input,select):focus-visible{outline:2px solid #e8ce8c;outline-offset:3px}.zumrut93-admin .z93-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.zumrut93-admin .z93-card{padding:19px;border:1px solid #3e5b4b;border-radius:11px;background:#13281e;min-width:0}.zumrut93-admin .z93-row{display:grid;grid-template-columns:minmax(140px,1fr) 90px auto;gap:9px;align-items:end;margin:12px 0}.zumrut93-admin .z93-row.z93-reward{grid-template-columns:minmax(160px,1fr) 90px 90px auto}.zumrut93-admin .z93-wide{grid-column:1/-1}.zumrut93-admin .z93-fields{display:flex;align-items:end;gap:18px;flex-wrap:wrap;margin:16px 0}.zumrut93-admin .z93-fields>label{flex:1;min-width:170px}.zumrut93-admin .z93-subtle{font-size:12px;color:#9fbcaa}.zumrut93-admin .z93-total{display:inline-block;padding:8px 12px;border:1px solid #6d9171;border-radius:7px;color:#ceedd0}.zumrut93-admin .z93-total[data-valid=false]{border-color:#b97c57;color:#f4c99d}.zumrut93-admin .z93-status{margin:18px 0;padding:13px 15px;border-left:3px solid #c8b475;background:#273b2a;overflow-wrap:anywhere}.zumrut93-admin footer{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}.zumrut93-admin footer .z93-primary{background:#387249;border-color:#9acb8d;font-weight:700}.zumrut93-admin .z93-empty{padding:12px;border:1px dashed #55735d;border-radius:7px}.zumrut93-admin .z93-search{margin:12px 0 18px}.zumrut93-admin .z93-loading{padding:20px}.zumrut93-admin .z93-inline-error{color:#f2c49f}
@media(max-width:720px){.zumrut93-admin .z93-grid{grid-template-columns:1fr}.zumrut93-admin .z93-hero,.zumrut93-admin .z93-card{padding:15px}.zumrut93-admin .z93-row,.zumrut93-admin .z93-row.z93-reward{grid-template-columns:1fr 1fr}.zumrut93-admin .z93-row>label:first-child{grid-column:1/-1}.zumrut93-admin .z93-row>button{justify-self:end}.zumrut93-admin footer>button{flex:1 1 170px}}
`;
var fold = (text) => String(text ?? "").toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("\u0131", "i");
function createZumrutAdminR93(React) {
  const h = React.createElement;
  return function ZumrutAdmin() {
    const [data, setData] = React.useState(null), [draft, setDraft] = React.useState(null), [busy, setBusy] = React.useState(false), [notice, setNotice] = React.useState(""), [search, setSearch] = React.useState("");
    const alive = React.useRef(true), lock = React.useRef(false), controller = React.useRef(null);
    const act = async (action = "zumrut_admin_get") => {
      if (lock.current) return;
      const error = action === "zumrut_admin_save" ? validateZumrutAdminDraftR93(draft, data?.catalog ?? []) : "";
      if (error) {
        setNotice(error);
        return;
      }
      lock.current = true;
      setBusy(true);
      setNotice("");
      const abort = new AbortController();
      controller.current = abort;
      try {
        const response = await fetch("/api/admin?core511=zumrut-r93", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...action === "zumrut_admin_save" ? { config: draft, revision: data.revision ?? data.config.revision } : {} }), signal: abort.signal });
        const body = await response.json();
        if (!response.ok) throw Error(body.error ?? "Vadi ayarlar\u0131 al\u0131namad\u0131.");
        const next = body.zumrut;
        if (!next?.config || !Array.isArray(next.catalog)) throw Error("Vadi ayarlar\u0131 do\u011Frulanamad\u0131.");
        if (alive.current && controller.current === abort) {
          setData(next);
          setDraft(structuredClone(next.config));
          setNotice(action === "zumrut_admin_save" ? "Z\xFCmr\xFCt Vadisi ayarlar\u0131 kaydedildi." : "");
        }
      } catch (e) {
        if (alive.current && controller.current === abort && e.name !== "AbortError") setNotice(e.message ?? "Ba\u011Flant\u0131 kurulamad\u0131. Tasla\u011F\u0131n korunuyor.");
      } finally {
        if (controller.current === abort) {
          lock.current = false;
          if (alive.current) setBusy(false);
        }
      }
    };
    React.useEffect(() => {
      alive.current = true;
      void act();
      return () => {
        alive.current = false;
        controller.current?.abort();
        controller.current = null;
        lock.current = false;
      };
    }, []);
    const catalog = data?.catalog ?? [], lookup = new Map(catalog.map((x) => [x.id, x])), needle = fold(search.trim());
    const filtered = (reward, current) => catalog.filter((i) => (reward ? i.rewardAllowed : i.costAllowed) && (i.id === current || !needle || fold(i.name + " " + i.group + " " + (i.label ?? "")).includes(needle)));
    const itemLabel = (item) => item.label ?? item.name;
    const selector = (row, reward, change, label) => h("label", null, label, h("select", { "aria-label": label, value: row.itemId, disabled: busy, onChange: (e) => change({ itemId: e.target.value, ...reward ? { amount: Math.min(row.amount, lookup.get(e.target.value)?.maxAmount ?? 1) } : {} }) }, ...filtered(reward, row.itemId).map((i) => h("option", { key: i.id, value: i.id }, itemLabel(i) + " \xB7 " + i.group))));
    const updateCosts = (key, rows) => setDraft((d) => key === "recipe" ? { ...d, recipe: { ...d.recipe, costs: rows } } : { ...d, toolCosts: { ...d.toolCosts, [key]: rows } });
    const costEditor = (key, title) => {
      const rows = key === "recipe" ? draft.recipe.costs : draft.toolCosts[key];
      const change = (index, value) => updateCosts(key, rows.map((r, i) => i === index ? { ...r, ...value } : r));
      const add = () => {
        const item = filtered(false).find((i) => !rows.some((r) => r.itemId === i.id));
        if (item) updateCosts(key, [...rows, { itemId: item.id, amount: 1 }]);
      };
      return h("section", { className: "z93-card", key }, h("h3", null, title), rows.length ? rows.map((row, index) => h("div", { className: "z93-row", key: index }, selector(row, false, (value) => change(index, value), title + " \xB7 e\u015Fya " + (index + 1)), h("label", null, "Adet", h("input", { "aria-label": title + " \xB7 adet " + (index + 1), type: "number", min: 1, max: lookup.get(row.itemId)?.payment?.selection ? 35 : 1e6, step: 1, value: row.amount, disabled: busy, onChange: (e) => change(index, { amount: Number(e.target.value) }) })), h("button", { type: "button", disabled: busy, "aria-label": title + " \xB7 sat\u0131r\u0131 kald\u0131r " + (index + 1), onClick: () => updateCosts(key, rows.filter((_, i) => i !== index)) }, "Kald\u0131r"))) : h("p", { className: "z93-empty" }, key === "recipe" ? "\xDCretim bedelini ekle." : "Bedel yok: bu alet \xFCcretsiz verilir."), h("button", { type: "button", disabled: busy || rows.length >= 12, onClick: add }, "Bedel ekle"));
    };
    const updateReward = (index, value) => setDraft((d) => ({ ...d, recipe: { ...d.recipe, rewards: d.recipe.rewards.map((r, i) => i === index ? { ...r, ...value } : r) } }));
    const total = draft?.recipe.rewards.reduce((sum, r) => sum + Math.round((Number(r.chance) || 0) * 100), 0) ?? 0;
    const validation = draft ? validateZumrutAdminDraftR93(draft, catalog) : "";
    return h(
      "section",
      { className: "admin-card zumrut93-admin", "data-zumrut-admin": "r93" },
      h("style", null, css),
      h("header", { className: "z93-hero" }, h("small", null, "Haritalar ve sava\u015F"), h("h2", null, "Z\xFCmr\xFCt Vadisi"), h("p", null, "Alet sat\u0131c\u0131s\u0131n\u0131n bedellerini ve \xFCretim tezg\xE2h\u0131n\u0131n \xF6d\xFCllerini belirle. Tamamlanan her a\u011Fa\xE7 kesimi 1 odun, her ta\u015F k\u0131rma 1 ta\u015F verir.")),
      draft ? h(
        React.Fragment,
        null,
        h("div", { className: "z93-fields" }, h("label", null, "Harita", h("select", { "aria-label": "Z\xFCmr\xFCt Vadisi a\xE7\u0131k m\u0131", value: String(draft.enabled), disabled: busy, onChange: (e) => setDraft({ ...draft, enabled: e.target.value === "true" }) }, h("option", { value: "true" }, "A\xE7\u0131k"), h("option", { value: "false" }, "Kapal\u0131"))), h("label", null, "Haritaya giri\u015F", h("select", { "aria-label": "Haritaya giri\u015F", value: draft.access, disabled: busy, onChange: (e) => setDraft({ ...draft, access: e.target.value }) }, h("option", { value: "admin" }, "Yaln\u0131z y\xF6netici"), h("option", { value: "public" }, "Herkese a\xE7\u0131k"))), h("label", null, "Toplama s\xFCresi (ms)", h("input", { "aria-label": "Toplama s\xFCresi", type: "number", min: 1500, max: 1e4, step: 100, value: draft.gatherMs, disabled: busy, onChange: (e) => setDraft({ ...draft, gatherMs: Number(e.target.value) }) })), h("label", null, "\xDCretim s\xFCresi (ms)", h("input", { "aria-label": "\xDCretim s\xFCresi", type: "number", min: 2e3, max: 15e3, step: 100, value: draft.craftMs, disabled: busy, onChange: (e) => setDraft({ ...draft, craftMs: Number(e.target.value) }) }))),
        h("label", { className: "z93-search" }, "E\u015Fya katalo\u011Funda ara", h("input", { type: "search", "aria-label": "E\u015Fya katalo\u011Funda ara", placeholder: "Odun, ta\u015F, m\xFCcevher, silah, inci\u2026", value: search, onChange: (e) => setSearch(e.target.value) })),
        h("p", { className: "z93-subtle" }, "Bedel olarak para, malzeme, ta\u015F ve harcanabilir e\u015Fyalar\u0131 se\xE7ebilirsin. Ekipman bedelinde oyuncu \xE7antas\u0131ndan hangi e\u015Fyay\u0131 verece\u011Fini se\xE7er. Ku\u015Fan\u0131lm\u0131\u015F ve kilitli e\u015Fyalar korunur."),
        h(
          "div",
          { className: "z93-grid" },
          costEditor("axe", "Balta bedeli"),
          costEditor("pickaxe", "Kazma bedeli"),
          h("div", { className: "z93-wide" }, costEditor("recipe", "\xDCretim malzemeleri")),
          h(
            "section",
            { className: "z93-card z93-wide" },
            h("h3", null, "\xDCretimde \xE7\u0131kabilecek e\u015Fya"),
            h("p", null, "Her \xFCretimde a\u015Fa\u011F\u0131daki sonu\xE7lardan yaln\u0131zca biri se\xE7ilir. \u015Eanslar\u0131 toplam %100 olacak \u015Fekilde yaz. \xD6d\xFCl eklenene kadar tezg\xE2hta \xFCretim a\xE7\u0131lmaz."),
            ...draft.recipe.rewards.map((row, index) => h("div", { className: "z93-row z93-reward", key: index }, selector(row, true, (value) => updateReward(index, value), "\xDCretim sonucu " + (index + 1)), h("label", null, "Adet", h("input", { "aria-label": "\xD6d\xFCl adedi " + (index + 1), type: "number", min: 1, max: lookup.get(row.itemId)?.maxAmount ?? 1, step: 1, value: row.amount, disabled: busy, onChange: (e) => updateReward(index, { amount: Number(e.target.value) }) })), h("label", null, "\u015Eans %", h("input", { "aria-label": "\xDCretim \u015Fans\u0131 " + (index + 1), type: "number", min: 0.01, max: 100, step: 0.01, value: row.chance, disabled: busy, onChange: (e) => updateReward(index, { chance: Number(e.target.value) }) })), h("button", { type: "button", disabled: busy, "aria-label": "\xDCretim sonucunu kald\u0131r " + (index + 1), onClick: () => setDraft((d) => ({ ...d, recipe: { ...d.recipe, rewards: d.recipe.rewards.filter((_, i) => i !== index) } })) }, "Kald\u0131r"))),
            !draft.recipe.rewards.length && h("p", { className: "z93-empty" }, "Hen\xFCz \xFCretim \xF6d\xFCl\xFC se\xE7ilmedi."),
            h("div", { className: "z93-fields" }, h("button", { type: "button", disabled: busy || draft.recipe.rewards.length >= 32, onClick: () => {
              const item = filtered(true).find((i) => !draft.recipe.rewards.some((r) => r.itemId === i.id));
              if (item) setDraft((d) => ({ ...d, recipe: { ...d.recipe, rewards: [...d.recipe.rewards, { itemId: item.id, amount: 1, chance: d.recipe.rewards.length ? 1 : 100 }] } }));
            } }, "\xDCretim sonucu ekle"), h("strong", { className: "z93-total", "data-valid": !draft.recipe.rewards.length || total === 1e4 }, "Toplam: %" + (total / 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 })))
          )
        ),
        validation && h("p", { className: "z93-inline-error", role: "status" }, validation),
        h("footer", null, h("button", { type: "button", className: "z93-primary", disabled: busy || !!validation, onClick: () => void act("zumrut_admin_save") }, busy ? "\u0130\u015Fleniyor\u2026" : "Vadi ayarlar\u0131n\u0131 kaydet"), h("button", { type: "button", disabled: busy, onClick: () => void act() }, "Kaydedilmi\u015F ayarlar\u0131 y\xFCkle"))
      ) : h("div", { className: "z93-loading" }, h("p", null, busy ? "Vadi ayarlar\u0131 y\xFCkleniyor\u2026" : "Vadi ayarlar\u0131 hen\xFCz y\xFCklenemedi."), !busy && h("button", { type: "button", onClick: () => void act() }, "Yeniden dene")),
      notice && h("p", { className: "z93-status", role: "status" }, notice)
    );
  };
}
export {
  createZumrutAdminR93,
  validateZumrutAdminDraftR93
};
