// r102_admin_hotfix/working/core511-source/scripts/core511/content-admin-r102.jsx
function createContentAdminR102(R) {
  const React = R;
  async function request(body, { signal } = {}) {
    const csrf = document.cookie.split(";").map((s) => s.trim()).find((s) => s.startsWith("__Host-yasam-csrf=") || s.startsWith("yasam-csrf-local="));
    const controller = new AbortController(), cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) controller.abort();
    const timer = setTimeout(() => controller.abort(), 15e3);
    try {
      const r = await fetch("/api/admin?core511=content-r102", { method: "POST", credentials: "same-origin", signal: controller.signal, headers: { "content-type": "application/json", "x-csrf-token": csrf ? decodeURIComponent(csrf.slice(csrf.indexOf("=") + 1)) : "" }, body: JSON.stringify(body) });
      let data;
      try {
        data = await r.json();
      } catch {
        throw Error("Y\xF6netim servisine ula\u015F\u0131lamad\u0131. Yeniden y\xFCkle.");
      }
      if (!r.ok) throw Error(data.error ?? "\u0130\u015Flem tamamlanamad\u0131.");
      const value = data?.content;
      if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Ayar yan\u0131t\u0131 do\u011Frulanamad\u0131. Yeniden y\xFCkle.");
      if (body.action === "content_read_r102" || body.action === "content_save_r102") {
        if (!Number.isSafeInteger(value.revision) || !value.config?.champion || !value.config?.newyear || !value.config?.battlefield || body.action === "content_read_r102" && !Array.isArray(value.catalog)) throw Error("Ayar yan\u0131t\u0131 eksik. Yeniden y\xFCkle.");
      } else if (body.action === "champion_grant_r102" && !Number.isSafeInteger(value.level)) throw Error("Seviye sonucu do\u011Frulanamad\u0131. Oyuncuyu yenileyip kontrol et.");
      return value;
    } catch (e) {
      if (e.name === "AbortError" && !signal?.aborted) throw Error("Y\xF6netim iste\u011Fi zaman a\u015F\u0131m\u0131na u\u011Frad\u0131. Kaydettiysen yeniden y\xFCkleyip sonucu kontrol et.");
      throw e;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
    }
  }
  function NumberField({ label, value, onChange, min = 0, max = 1e9, step = 1 }) {
    return /* @__PURE__ */ React.createElement("label", null, label, /* @__PURE__ */ React.createElement("input", { type: "number", min, max, step, value, onChange: (e) => onChange(Number(e.target.value)) }));
  }
  function ItemRows({ rows, onChange, catalog, weighted = false, cost = false }) {
    const [query, setQuery] = R.useState("");
    const options = catalog.filter((v) => (cost ? v.costAllowed : v.rewardAllowed) && v.name.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR")));
    const patch = (i, k, v) => onChange(rows.map((r, j) => j === i ? { ...r, [k]: v } : r));
    return /* @__PURE__ */ React.createElement("div", { className: "c102a-items" }, /* @__PURE__ */ React.createElement("input", { type: "search", "aria-label": "E\u015Fya ara", placeholder: "B\xFCt\xFCn e\u015Fyalarda ara\u2026", value: query, onChange: (e) => setQuery(e.target.value) }), rows.map((r, i) => /* @__PURE__ */ React.createElement("div", { className: "c102a-row", key: i }, /* @__PURE__ */ React.createElement("label", null, "E\u015Fya", /* @__PURE__ */ React.createElement("select", { value: r.itemId, onChange: (e) => patch(i, "itemId", e.target.value) }, catalog.filter((v) => v.id === r.itemId || options.some((x) => x.id === v.id)).map((v) => /* @__PURE__ */ React.createElement("option", { key: v.id, value: v.id }, v.name)))), /* @__PURE__ */ React.createElement(NumberField, { label: "Adet", min: 1, value: r.amount, onChange: (v) => patch(i, "amount", v) }), weighted && /* @__PURE__ */ React.createElement(NumberField, { label: "A\u011F\u0131rl\u0131k", min: 1, value: r.weight, onChange: (v) => patch(i, "weight", v) }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => onChange(rows.filter((_, j) => j !== i)), "aria-label": "\xD6d\xFCl\xFC kald\u0131r" }, "Kald\u0131r"))), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: rows.length >= 32, onClick: () => {
      const v = options.find((v2) => !rows.some((r) => r.itemId === v2.id));
      if (v) onChange([...rows, { itemId: v.id, amount: 1, ...weighted ? { weight: 1 } : {} }]);
    } }, "+ E\u015Fya ekle"), weighted && /* @__PURE__ */ React.createElement("p", null, "Sand\u0131k bir \xF6d\xFCl verir. Se\xE7ilme ihtimali, \xF6d\xFCl a\u011F\u0131rl\u0131\u011F\u0131n\u0131n toplam a\u011F\u0131rl\u0131\u011Fa oran\u0131d\u0131r."));
  }
  function Grant({ player }) {
    const playerId = player?.id ?? "";
    const [target, setTarget] = R.useState(playerId), [level, setLevel] = R.useState(1), [busy, setBusy] = R.useState(false), [message, setMessage] = R.useState("");
    R.useEffect(() => setTarget(playerId), [playerId]);
    return /* @__PURE__ */ React.createElement("section", { className: "c102a admin-card" }, /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("h3", null, "Oyuncuya \u015Eampiyon seviyesi ver"), /* @__PURE__ */ React.createElement("p", null, "Oyuncu en az \xC7ekirdek Efsanesi 3 olmal\u0131. Mevcut seviyesinden a\u015Fa\u011F\u0131ya indirilemez."), /* @__PURE__ */ React.createElement("p", null, player ? player.name + " \xB7 Se\xE7ili oyuncu" : "Oyuncular listesinden bir karakter se\xE7."), /* @__PURE__ */ React.createElement(NumberField, { label: "Yeni \u015Eampiyon seviyesi", min: 1, max: 1e6, value: level, onChange: setLevel }), /* @__PURE__ */ React.createElement("button", { disabled: busy || !target, onClick: async () => {
      setBusy(true);
      setMessage("");
      try {
        const r = await request({ action: "champion_grant_r102", playerId: target, level });
        setMessage("\u015Eampiyon Lv " + r.level + " kaydedildi.");
      } catch (e) {
        setMessage(e.message);
      } finally {
        setBusy(false);
      }
    } }, "Seviyeyi y\xFCkselt"), /* @__PURE__ */ React.createElement("p", { role: "status" }, message));
  }
  function Panel({ section = "champion" }) {
    const [state, set] = R.useState(null), [draft, setDraft] = R.useState(null), [busy, setBusy] = R.useState(false), [message, setMessage] = R.useState("");
    const [attempt, reload] = R.useState(0);
    R.useEffect(() => {
      let live = true;
      const controller = new AbortController();
      setMessage("");
      request({ action: "content_read_r102" }, { signal: controller.signal }).then((v) => {
        if (live) {
          set(v);
          setDraft(v.config);
        }
      }).catch((e) => {
        if (live && e.name !== "AbortError") setMessage(e.message);
      });
      return () => {
        live = false;
        controller.abort();
      };
    }, [attempt]);
    const patch = (k, v) => setDraft((d) => ({ ...d, [section]: { ...d[section], [k]: v } }));
    if (!draft) return /* @__PURE__ */ React.createElement("section", { className: "admin-card c102a" }, /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("p", { role: "status" }, message || "Ayarlar y\xFCkleniyor\u2026"), message && /* @__PURE__ */ React.createElement("button", { onClick: () => reload((v) => v + 1) }, "Yeniden y\xFCkle"));
    const cfg = draft[section];
    return /* @__PURE__ */ React.createElement("section", { className: "admin-card c102a" }, /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("h2", null, { champion: "\u015Eampiyon Lv", newyear: "Y\u0131lba\u015F\u0131 \xC7orab\u0131", battlefield: "Sava\u015F Meydan\u0131" }[section]), /* @__PURE__ */ React.createElement("p", null, "Bu ayarlar yaln\u0131z se\xE7ili sunucuya uygulan\u0131r."), section === "champion" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "c102a-grid" }, /* @__PURE__ */ React.createElement(NumberField, { label: "1 \u2192 2 i\xE7in tecr\xFCbe", min: 1, value: cfg.baseXp, onChange: (v) => patch("baseXp", v) }), /* @__PURE__ */ React.createElement(NumberField, { label: "Her seviyede gereken ek tecr\xFCbe", value: cfg.stepXp, onChange: (v) => patch("stepXp", v) })), /* @__PURE__ */ React.createElement("p", null, "Her seviyede do\u011Frudan +0,20 can, sald\u0131r\u0131 ve savunma. Tecr\xFCbe ihtiyac\u0131: ilk bedel + (mevcut seviye \u2212 1) \xD7 art\u0131\u015F."), /* @__PURE__ */ React.createElement("h3", null, "\u015Eampiyonlu\u011Fa giri\u015F bedeli"), /* @__PURE__ */ React.createElement(ItemRows, { rows: cfg.costs, onChange: (v) => patch("costs", v), catalog: state.catalog, cost: true }), /* @__PURE__ */ React.createElement("h3", null, "Her 10 seviyede verilen \xF6d\xFCller"), /* @__PURE__ */ React.createElement(ItemRows, { rows: cfg.rewards, onChange: (v) => patch("rewards", v), catalog: state.catalog })) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { className: "c102a-check" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: cfg.enabled, onChange: (e) => patch("enabled", e.target.checked) }), section === "newyear" ? "Canavarlardan \xE7orap d\xFC\u015Fs\xFCn" : "Sava\u015F saatlerini etkinle\u015Ftir"), section === "newyear" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(NumberField, { label: "\xC7orap d\xFC\u015Fme oran\u0131 (%)", max: 100, step: 1e-6, value: cfg.dropPercent, onChange: (v) => patch("dropPercent", v) }), /* @__PURE__ */ React.createElement("p", null, "50 \xE7orap, oyuncu panelinden 1 Y\u0131lba\u015F\u0131 Sand\u0131\u011F\u0131na d\xF6n\xFC\u015F\xFCr.")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", null, "A\xE7\u0131l\u0131\u015F saatleri \xB7 T\xFCrkiye saati"), cfg.slots.map((s, i) => /* @__PURE__ */ React.createElement("div", { className: "c102a-slot", key: i }, /* @__PURE__ */ React.createElement("div", { className: "c102a-days" }, ["Pazar", "Pazartesi", "Sal\u0131", "\xC7ar\u015Famba", "Per\u015Fembe", "Cuma", "Cumartesi"].map((day, j) => /* @__PURE__ */ React.createElement("label", { key: day }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: s.days.includes(j), onChange: (e) => patch("slots", cfg.slots.map((r, k) => k === i ? { ...r, days: e.target.checked ? [...r.days, j] : r.days.filter((d) => d !== j) } : r)) }), day))), /* @__PURE__ */ React.createElement("div", { className: "c102a-grid" }, ["start", "end"].map((key) => /* @__PURE__ */ React.createElement("label", { key }, key === "start" ? "Ba\u015Flang\u0131\xE7" : "Biti\u015F", /* @__PURE__ */ React.createElement("input", { type: "time", value: String(Math.floor(s[key] / 60)).padStart(2, "0") + ":" + String(s[key] % 60).padStart(2, "0"), onChange: (e) => {
      const [h, m] = e.target.value.split(":").map(Number);
      patch("slots", cfg.slots.map((r, k) => k === i ? { ...r, [key]: h * 60 + m } : r));
    } })))), /* @__PURE__ */ React.createElement("button", { onClick: () => patch("slots", cfg.slots.filter((_, k) => k !== i)) }, "Saati kald\u0131r"))), /* @__PURE__ */ React.createElement("button", { disabled: cfg.slots.length >= 14, onClick: () => patch("slots", [...cfg.slots, { days: [0, 1, 2, 3, 4, 5, 6], start: 1200, end: 1260 }]) }, "+ Sava\u015F saati"), /* @__PURE__ */ React.createElement("div", { className: "c102a-grid" }, /* @__PURE__ */ React.createElement(NumberField, { label: "1 Zafer Sand\u0131\u011F\u0131 i\xE7in \xF6ld\xFCrme", min: 1, max: 1e3, value: cfg.killsPerChest, onChange: (v) => patch("killsPerChest", v) }), /* @__PURE__ */ React.createElement(NumberField, { label: "Ayn\u0131 rakipten tekrar \xF6d\xFCl beklemesi (sn)", min: 60, max: 86400, value: cfg.victimCooldownSeconds, onChange: (v) => patch("victimCooldownSeconds", v) }), /* @__PURE__ */ React.createElement(NumberField, { label: "G\xFCnl\xFCk en fazla sand\u0131k", min: 1, max: 1e3, value: cfg.maxChestsPerDay, onChange: (v) => patch("maxChestsPerDay", v) }))), /* @__PURE__ */ React.createElement("h3", null, section === "newyear" ? "Y\u0131lba\u015F\u0131" : "Zafer", " Sand\u0131\u011F\u0131 i\xE7eri\u011Fi"), /* @__PURE__ */ React.createElement(ItemRows, { rows: cfg.rewards, onChange: (v) => patch("rewards", v), catalog: state.catalog, weighted: true })), /* @__PURE__ */ React.createElement("button", { className: "c102a-save", disabled: busy, onClick: async () => {
      setBusy(true);
      setMessage("");
      try {
        const v = await request({ action: "content_save_r102", revision: state.revision, config: draft });
        set((s) => ({ ...s, ...v }));
        setDraft(v.config);
        setMessage("Ayarlar bu sunucuya kaydedildi.");
      } catch (e) {
        setMessage(e.message);
      } finally {
        setBusy(false);
      }
    } }, busy ? "Kaydediliyor\u2026" : "Ayarlar\u0131 kaydet"), /* @__PURE__ */ React.createElement("p", { role: "status" }, message));
  }
  return { Panel, Grant };
}
var CSS = `.c102a{min-width:0}.c102a label{display:grid;gap:6px;font-size:13px}.c102a input,.c102a select,.c102a button{min-height:44px;max-width:100%;border:1px solid #45604f;border-radius:8px;background:#172b23;color:#e4e9dd;padding:10px}.c102a input[type=checkbox]{min-height:0;width:18px;height:18px}.c102a label.c102a-check{display:flex;align-items:center}.c102a h3{margin:24px 0 12px}.c102a p{font-size:13px;color:#b5c9bc;line-height:1.6}.c102a-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0}.c102a-row{display:grid;grid-template-columns:minmax(140px,3fr) minmax(70px,1fr) minmax(70px,1fr) auto;gap:8px;align-items:end;margin:10px 0}.c102a-slot{border:1px solid #395544;border-radius:12px;padding:14px;margin:12px 0}.c102a-days{display:flex;flex-wrap:wrap;gap:10px}.c102a-days label{display:flex;align-items:center}.c102a-save{margin-top:24px;background:#d3b379!important;color:#122119!important;font-weight:700}.c102a button:disabled{opacity:.5}@media(max-width:680px){.c102a-grid,.c102a-row{grid-template-columns:1fr 1fr}.c102a-row>label:first-child{grid-column:1/-1}}`;
export {
  createContentAdminR102
};
