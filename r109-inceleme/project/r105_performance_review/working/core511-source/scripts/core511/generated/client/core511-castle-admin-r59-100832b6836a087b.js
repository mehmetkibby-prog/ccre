// working/core511-source/scripts/core511/castle-admin-client-r59.mjs
function createCastleAdminR59(React) {
  const h = React.createElement;
  return function CastleAdmin() {
    const [data, setData] = React.useState(null), [draft, setDraft] = React.useState(null), [busy, setBusy] = React.useState(false), [notice, setNotice] = React.useState(""), [search, setSearch] = React.useState(""), [testMinutes, setTestMinutes] = React.useState(5), lock = React.useRef(false);
    const act = async (action = "castle_read_r59") => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      try {
        const input = { action, ...action === "castle_save_r59" ? { config: draft, revision: data.config.revision } : action.startsWith("castle_test_") ? { minutes: testMinutes, revision: data.config.revision } : {} }, response = await fetch("/api/admin?core511=castle-r59", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }), body = await response.json();
        if (!response.ok) throw Error(body.error ?? "Kale ayarlar\u0131 al\u0131namad\u0131.");
        setData(body.castle);
        if (!action.startsWith("castle_test_")) setDraft(structuredClone(body.castle.config));
        setNotice(body.castle.notice ?? (action === "castle_save_r59" ? "Kale ve sand\u0131k ayarlar\u0131 kaydedildi. Ba\u015Flam\u0131\u015F sava\u015F\u0131n \xF6d\xFCl tablosu korunur." : ""));
      } catch (e) {
        setNotice(e.message);
      } finally {
        lock.current = false;
        setBusy(false);
      }
    };
    React.useEffect(() => {
      void act();
    }, []);
    const update = (index, key, value) => setDraft((d) => ({ ...d, drops: d.drops.map((r, i) => i === index ? { ...r, [key]: value } : r) })), items = (data?.catalog ?? []).filter((i) => i.name.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr")));
    return h("section", { className: "admin-card castle59-admin" }, h("style", null, ".castle59-admin{grid-column:1/-1}.castle59-admin .castle59-rewards{display:grid;gap:8px}.castle59-admin .castle59-reward{display:grid;grid-template-columns:minmax(150px,2fr) repeat(3,minmax(65px,1fr)) auto;gap:8px;align-items:end}.castle59-admin label{display:grid;gap:4px}.castle59-admin input,.castle59-admin select{width:100%;min-width:0;padding:8px}.castle59-admin button{padding:8px 12px;cursor:pointer}.castle59-admin footer{display:flex;gap:12px;margin-top:16px;flex-wrap:wrap}.castle59-admin p{line-height:1.6}.castle59-test{margin:16px 0;padding:16px;border:1px solid #b7996055;border-radius:10px;background:#91713d12}.castle59-test input{max-width:140px}@media(max-width:600px){.castle59-admin .castle59-reward{grid-template-columns:1fr 1fr}.castle59-admin .castle59-reward label:first-child{grid-column:1/-1}}"), h("h2", null, "\u265C Lonca Kalesi \xB7 Sand\u0131k \xF6d\xFClleri"), h("p", null, "Her g\xFCn 19:30 haz\u0131rl\u0131k \xB7 20:00 PvP ve sahipsiz kale \xB7 20:30 sonu\xE7 (T\xFCrkiye). Sava\u015F kat\u0131l\u0131m\u0131nda lonca kotas\u0131 yok. Kazanan loncan\u0131n sava\u015F ba\u015Flang\u0131c\u0131ndaki t\xFCm \xFCyelerine tek sand\u0131k hakk\u0131 verilir."), draft ? h(React.Fragment, null, h("div", { className: "castle59-test" }, h("h3", null, "Y\xF6netici test sava\u015F\u0131"), h("p", null, "20:00\u2019yi beklemeden ele ge\xE7irme, lonca PvP\u2019si ve pazarda yeniden do\u011Fmay\u0131 dene. Test \xF6d\xFCl veya sand\u0131k hakk\u0131 \xFCretmez; g\xFCnl\xFCk sava\u015F\u0131n sahibi ve puan\u0131 korunur. Yeniden ba\u015Flatmada test ele ge\xE7irme ilerlemesi s\u0131f\u0131rlan\u0131r."), h("label", null, "Test s\xFCresi (dakika)", h("input", { "aria-label": "Test s\xFCresi (dakika)", type: "number", min: 1, max: 30, value: testMinutes, disabled: busy, onChange: (e) => setTestMinutes(Number(e.target.value)) })), data.config.test && h("p", null, "Test biti\u015Fi: " + new Date(data.config.test.endsAt).toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul" }) + " (T\xFCrkiye). S\xFCresi dolunca PvP normal takvime d\xF6ner."), h("footer", null, h("button", { type: "button", disabled: busy, onClick: () => void act("castle_test_start_r59") }, "Test sava\u015F\u0131n\u0131 ba\u015Flat"), h("button", { type: "button", disabled: busy || !data.config.test, onClick: () => void act("castle_test_stop_r59") }, "Testi bitir"))), h("label", null, h("span", null, "Kale sava\u015Flar\u0131"), h("select", { "aria-label": "Kale sava\u015Flar\u0131", value: String(draft.enabled), disabled: busy, onChange: (e) => setDraft({ ...draft, enabled: e.target.value === "true" }) }, h("option", { value: "false" }, "Kapal\u0131"), h("option", { value: "true" }, "A\xE7\u0131k"))), h("p", null, "Haz\u0131r \xF6d\xFCl eklenmez. A\u015Fa\u011F\u0131daki e\u015Fya, ba\u011F\u0131ms\u0131z d\xFC\u015Fme y\xFCzdesi ve adet aral\u0131\u011F\u0131n\u0131 sen belirle. Ba\u015Flam\u0131\u015F sava\u015F\u0131n \xF6d\xFClleri sonradan de\u011Fi\u015Ftirilmez."), h("label", null, "E\u015Fya ara", h("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "E\u015Fya veya malzeme ad\u0131" })), h("div", { className: "castle59-rewards" }, ...draft.drops.map((row, index) => h("div", { className: "castle59-reward", key: index }, h("label", null, "\xD6d\xFCl", h("select", { "aria-label": "\xD6d\xFCl", value: row.itemId, disabled: busy, onChange: (e) => update(index, "itemId", e.target.value) }, ...[...new Map([...(data.catalog ?? []).filter((i) => i.id === row.itemId), ...items].map((i) => [i.id, i])).values()].map((i) => h("option", { key: i.id, value: i.id }, i.name)))), ...["chance", "min", "max"].map((key, i) => h("label", { key }, ["\u015Eans %", "En az", "En \xE7ok"][i], h("input", { "aria-label": ["\u015Eans %", "En az", "En \xE7ok"][i], type: "number", min: key === "chance" ? 0 : 1, max: key === "chance" ? 100 : 1e3, step: key === "chance" ? 0.1 : 1, value: row[key], disabled: busy, onChange: (e) => update(index, key, Number(e.target.value)) }))), h("button", { type: "button", disabled: busy, onClick: () => setDraft((d) => ({ ...d, drops: d.drops.filter((_, i) => i !== index) })) }, "Sil")))), h("footer", null, h("button", { type: "button", disabled: busy || draft.drops.length >= 16, onClick: () => {
      const item = data.catalog.find((i) => !draft.drops.some((r) => r.itemId === i.id));
      if (item) setDraft((d) => ({ ...d, drops: [...d.drops, { itemId: item.id, chance: 100, min: 1, max: 1 }] }));
    } }, "\xD6d\xFCl ekle"), h("button", { type: "button", disabled: busy, onClick: () => void act("castle_save_r59") }, busy ? "Kaydediliyor\u2026" : "Kale ayarlar\u0131n\u0131 kaydet"), h("button", { type: "button", disabled: busy, onClick: () => void act("castle_read_r59") }, "Yeniden y\xFCkle"))) : h("p", null, "Kale ayarlar\u0131 y\xFCkleniyor\u2026"), notice && h("p", { role: "status" }, notice));
  };
}
export {
  createCastleAdminR59
};
