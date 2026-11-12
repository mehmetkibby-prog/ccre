// r70_motion_work/working/core511-source/scripts/core511/quest-objectives-r70.mjs
var type = (id, label, group, max, help) => Object.freeze({ id, label, group, max, help });
var QUEST_EVENTS438 = Object.freeze([
  type("kill", "Normal canavar yen", "Av ve ke\u015Fif", 1e5, "\xD6nceki g\xF6revin \xF6d\xFCl\xFCnden sonra yenilen normal canavarlar say\u0131l\u0131r."),
  type("fish", "Bal\u0131k\xE7\u0131l\u0131kta bir \u015Fey yakala", "Av ve ke\u015Fif", 1e5, "\xD6nceki g\xF6revin \xF6d\xFCl\xFCnden sonraki ba\u015Far\u0131l\u0131 avlar say\u0131l\u0131r."),
  type("market", "Pazar \xF6\u011Fretisini oku", "Tan\u0131\u015Fma", 1, "Oyuncu Pazar Alan\u0131\u2019nda \xF6\u011Fretimi onaylar."),
  type("evolution", "\u0130lk silah evrimini yap", "Geli\u015Fim", 1, "Karakterin tamamlanm\u0131\u015F ilk evrimi say\u0131l\u0131r."),
  type("level", "Karakter seviyesine ula\u015F", "Geli\u015Fim", 65, "Karakterin mevcut seviyesi; daha \xF6nce ula\u015Ft\u0131\u011F\u0131 seviye de ge\xE7erlidir."),
  type("rank", "R\xFCtbe kademesine ula\u015F", "Geli\u015Fim", 18, "Karakterin mevcut r\xFCtbe kademesi."),
  type("skill", "Bir yetene\u011Fi geli\u015Ftir", "Geli\u015Fim", 10, "\xDC\xE7 ana yetene\u011Fin en y\xFCksek mevcut seviyesi."),
  type("gear_upgrade", "Art\u0131 bas\u0131lm\u0131\u015F ekipman edin", "Ekipman", 5, "\xC7antada veya ku\u015Fan\u0131lm\u0131\u015F bir ekipman\u0131n en y\xFCksek + seviyesi."),
  type("gear_evolution", "Evrimle\u015Fmi\u015F silah edin", "Ekipman", 3, "Sahip olunan silahlar\u0131n en y\xFCksek evrim seviyesi."),
  type("equipped", "Ekipman ku\u015Fan", "Ekipman", 7, "Silah, z\u0131rh, ba\u015Fl\u0131k, ayakkab\u0131 ve \xFC\xE7 tak\u0131 yuvas\u0131n\u0131n dolu olanlar\u0131."),
  type("pet", "Aktif bir yolda\u015F edin", "Yolda\u015F ve topluluk", 1, "S\xFCresi dolmam\u0131\u015F bir yolda\u015Fa sahip olmak yeterlidir."),
  type("mount", "Bir binek a\xE7", "Yolda\u015F ve topluluk", 1, "Kal\u0131c\u0131 olarak a\xE7\u0131lm\u0131\u015F en az bir binek gerekir."),
  type("guild", "Bir loncaya kat\u0131l", "Yolda\u015F ve topluluk", 1, "Karakterin mevcut lonca \xFCyeli\u011Fi kontrol edilir."),
  type("party", "Bir gruba kat\u0131l", "Yolda\u015F ve topluluk", 1, "Karakterin en az iki \xFCyeli bir grupta olmas\u0131 gerekir."),
  type("mist_chest", "Sis Sand\u0131\u011F\u0131 a\xE7", "Seferler", 1e5, "Karakterin toplam a\xE7t\u0131\u011F\u0131 normal ve alt\u0131n Sis sand\u0131klar\u0131 say\u0131l\u0131r."),
  type("gold_mist_chest", "Alt\u0131n Sis Sand\u0131\u011F\u0131 a\xE7", "Seferler", 1e5, "Karakterin toplam a\xE7t\u0131\u011F\u0131 Alt\u0131n Sis sand\u0131klar\u0131 say\u0131l\u0131r."),
  type("azrail", "Kadim Kulesi\u2019nde Azrail\u2019i yen", "Seferler", 1e5, "Azrail zafer \xF6d\xFCl\xFCn\xFC kazand\u0131\u011F\u0131n seferlerin toplam\u0131 say\u0131l\u0131r.")
]);
var questMetaR70 = (id) => QUEST_EVENTS438.find((e) => e.id === id);

// r70_motion_work/working/core511-source/scripts/core511/quests-admin-r70.mjs
function createQuestsAdminR70(React) {
  const h = React.createElement, copy = (v) => JSON.parse(JSON.stringify(v)), uid = () => "quest_" + crypto.randomUUID().replaceAll("-", "").slice(0, 20), maxAmount = (i) => i?.type === "xp" ? 1e6 : i?.id === "resource:core_coins" ? 1e5 : ["resource", "stone", "material"].includes(i?.type) ? 1e4 : 1;
  const templates = [["Seviye hedefi", "level", 10, "10. Seviyeye Ula\u015F", "Macerana devam et ve 10. seviyeye ula\u015F."], ["Sis ke\u015Ffi", "mist_chest", 1, "Sisin Ard\u0131ndaki \xD6d\xFCl", "Sis Yar\u0131\u011F\u0131 seferini tamamla ve son sand\u0131\u011F\u0131n\u0131 a\xE7."], ["Grup maceras\u0131", "party", 1, "Birlikte Daha G\xFC\xE7l\xFC", "En az iki ki\u015Filik bir gruba kat\u0131l."], ["Binek yolculu\u011Fu", "mount", 1, "\u0130lk Bine\u011Fin", "Seyis ile konu\u015F ve ilk bine\u011Fini a\xE7."]];
  function Admin({ value, busy, act }) {
    const [draft, setDraft] = React.useState(() => copy(value?.config ?? { enabled: true, quests: [] })), [revision, setRevision] = React.useState(value?.revision), [selected, setSelected] = React.useState(""), [search, setSearch] = React.useState(""), [rewardSearch, setRewardSearch] = React.useState(""), [notice, setNotice] = React.useState(""), [saving, setSaving] = React.useState(false), [dirty, setDirty] = React.useState(false);
    const changed = React.useRef(false), lock = React.useRef(false), alive = React.useRef(true), catalog = value?.catalog ?? [], events = value?.eventTypes ?? [], known = new Set((value?.config?.quests ?? []).map((q2) => q2.id));
    React.useEffect(() => {
      alive.current = true;
      return () => {
        alive.current = false;
      };
    }, []);
    React.useEffect(() => {
      if (value?.config && !changed.current) {
        setDraft(copy(value.config));
        setRevision(value.revision);
      }
    }, [value?.revision]);
    React.useEffect(() => {
      if (!dirty) return;
      const guard = (e) => {
        e.preventDefault();
        e.returnValue = "";
      };
      window.addEventListener("beforeunload", guard);
      return () => window.removeEventListener("beforeunload", guard);
    }, [dirty]);
    const edit = (fn) => {
      changed.current = true;
      setDirty(true);
      setDraft((old) => fn(copy(old)));
      setNotice("Kaydedilmemi\u015F de\u011Fi\u015Fiklikler var.");
    };
    const change = (id, patch) => edit((d) => {
      d.quests = d.quests.map((q2) => q2.id === id ? { ...q2, ...patch } : q2);
      return d;
    });
    const q = draft.quests.find((q2) => q2.id === selected) ?? draft.quests[0], index = draft.quests.indexOf(q), locked = !!busy || saving, event = events.find((e) => e.id === q?.event), groups = [...new Set(events.map((e) => e.group ?? "Hedefler"))];
    const add = (template) => {
      const id = uid(), row = template ? { event: template[1], target: template[2], title: template[3], description: template[4] } : { event: "kill", target: 15, title: "Yeni g\xF6rev", description: "" };
      edit((d) => {
        d.quests.push({ id, ...row, rewards: [] });
        return d;
      });
      setSearch("");
      setSelected(id);
    };
    const move = (direction) => edit((d) => {
      const next = index + direction;
      [d.quests[index], d.quests[next]] = [d.quests[next], d.quests[index]];
      return d;
    });
    const duplicate = () => {
      const id = uid();
      edit((d) => {
        d.quests.splice(index + 1, 0, { ...copy(q), id, title: (q.title + " \xB7 Kopya").slice(0, 80) });
        return d;
      });
      setSearch("");
      setSelected(id);
    };
    const rewardChange = (n, patch) => change(q.id, { rewards: q.rewards.map((r, i) => i === n ? { ...r, ...patch } : r) });
    async function save() {
      if (lock.current || busy) return;
      for (const row of draft.quests) {
        const e = events.find((e2) => e2.id === row.event);
        if (!row.title.trim() || !e || !Number.isSafeInteger(row.target) || row.target < 1 || row.target > (e.max ?? 1e5)) {
          setSelected(row.id);
          setNotice("G\xF6rev ad\u0131n\u0131 ve hedef miktar\u0131n\u0131 kontrol et.");
          return;
        }
      }
      lock.current = true;
      setSaving(true);
      setNotice("Kaydediliyor\u2026");
      try {
        const result = await act({ action: "quests_save", config: draft, revision });
        if (!result?.quests438) throw Error("Kaydedilemedi. \xDCstteki y\xF6netim bildirimini kontrol et.");
        if (alive.current) {
          changed.current = false;
          setDirty(false);
          setDraft(copy(result.quests438.config));
          setRevision(result.quests438.revision);
          setNotice("G\xF6revler kaydedildi. Daha \xF6nce al\u0131nm\u0131\u015F \xF6d\xFCller korundu.");
        }
      } catch (e) {
        if (alive.current) setNotice(e.message ?? "Kaydedilemedi; d\xFCzenlemelerin korunuyor.");
      } finally {
        lock.current = false;
        if (alive.current) setSaving(false);
      }
    }
    if (!value?.config) return h("section", { className: "q70-admin" }, h("h2", null, "G\xF6revler"), h("p", { role: "status" }, "G\xF6rev ayarlar\u0131 y\xFCkleniyor\u2026"));
    const list = draft.quests.filter((row) => (row.title + " " + row.description).toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr")));
    const field = (label, control) => h("label", null, h("span", null, label), React.cloneElement(control, { "aria-label": label })), button = (label, onClick, disabled = false, extra = {}) => h("button", { type: "button", onClick, disabled: locked || disabled, ...extra }, label);
    return h(
      "section",
      { className: "q70-admin" },
      h("style", null, QUEST_ADMIN_CSS_R70),
      h("header", { className: "q70-header" }, h("div", null, h("small", null, "OYUNCUNUN YOLCULU\u011EU"), h("h2", null, "G\xF6rev at\xF6lyesi"), h("p", null, `${draft.quests.length} g\xF6rev \xB7 ${events.length} hedef t\xFCr\xFC \xB7 G\xF6revler listedeki s\u0131rayla a\xE7\u0131l\u0131r.`)), field("G\xF6rev sistemi etkin", h("input", { type: "checkbox", checked: draft.enabled, disabled: locked, onChange: (e) => edit((d) => ({ ...d, enabled: e.target.checked })) }))),
      h(
        "div",
        { className: "q70-layout" },
        h("nav", { "aria-label": "G\xF6rev s\u0131ras\u0131" }, field("G\xF6revlerde ara", h("input", { type: "search", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "G\xF6rev ad\u0131\u2026" })), h("div", { className: "q70-list" }, ...list.map((row) => h("button", { type: "button", key: row.id, "aria-current": q?.id === row.id ? "step" : void 0, onClick: () => {
          setSelected(row.id);
          setRewardSearch("");
        } }, h("b", null, String(draft.quests.indexOf(row) + 1).padStart(2, "0")), h("span", null, h("strong", null, row.title || "\u0130simsiz g\xF6rev"), h("small", null, events.find((e) => e.id === row.event)?.label ?? row.event))))), button("+ Yeni g\xF6rev", () => add(), draft.quests.length >= 40), h("details", null, h("summary", null, "Haz\u0131r g\xF6revden ba\u015Fla"), ...templates.map((t) => h("div", { key: t[1] }, button(t[0], () => add(t), draft.quests.length >= 40 || !events.some((e) => e.id === t[1])))))),
        q && h(
          "div",
          { className: "q70-editor" },
          h("div", { className: "q70-toolbar" }, h("b", null, `${index + 1}. g\xF6rev`), button("\u2191 Yukar\u0131", () => move(-1), index === 0), button("\u2193 A\u015Fa\u011F\u0131", () => move(1), index === draft.quests.length - 1), button("Kopyala", duplicate, draft.quests.length >= 40), button("Kald\u0131r", () => {
            if (confirm("Bu g\xF6rev listeden kald\u0131r\u0131ls\u0131n m\u0131? Daha \xF6nce verilmi\u015F \xF6d\xFCller geri al\u0131nmaz.")) edit((d) => {
              d.quests = d.quests.filter((row) => row.id !== q.id);
              return d;
            });
          }, draft.quests.length <= 1)),
          h("fieldset", null, h("legend", null, "1 \xB7 G\xF6rev ve hedef"), field("G\xF6rev ad\u0131", h("input", { value: q.title, maxLength: 80, disabled: locked, onChange: (e) => change(q.id, { title: e.target.value }) })), h("div", { className: "q70-fields" }, field("Hedef t\xFCr\xFC", h("select", { value: q.event, disabled: locked || known.has(q.id), onChange: (e) => {
            const meta = events.find((m) => m.id === e.target.value);
            change(q.id, { event: meta.id, target: Math.min(q.target, meta.max ?? 1e5) });
          } }, ...groups.map((group) => h("optgroup", { key: group, label: group }, ...events.filter((e) => (e.group ?? "Hedefler") === group).map((e) => h("option", { key: e.id, value: e.id }, e.label)))))), field(event?.max === 1 ? "Tek hedef" : "Hedef miktar\u0131 / seviye", h("input", { type: "number", min: 1, max: event?.max ?? 1e5, step: 1, value: q.target, disabled: locked || event?.max === 1, onChange: (e) => change(q.id, { target: Number(e.target.value) }) }))), h("p", { className: "q70-help" }, event?.help), known.has(q.id) && h("small", null, "Kaydedilmi\u015F g\xF6revin t\xFCr\xFC sabittir. T\xFCr\xFC de\u011Fi\u015Ftirmek i\xE7in Kopyala ile yeni g\xF6rev olu\u015Ftur."), field("Oyuncuya a\xE7\u0131klama", h("textarea", { value: q.description, maxLength: 1600, rows: 4, disabled: locked, onChange: (e) => change(q.id, { description: e.target.value }) }))),
          h("fieldset", null, h("legend", null, "2 \xB7 \xD6d\xFCller"), h("p", { className: "q70-help" }, "En fazla 6 \xF6d\xFCl. Bo\u015F b\u0131rak\u0131rsan g\xF6rev yaln\u0131zca ilerleme sa\u011Flar."), q.rewards.length > 0 && field("\xD6d\xFCl katalo\u011Funda ara", h("input", { type: "search", value: rewardSearch, onChange: (e) => setRewardSearch(e.target.value), placeholder: "M\xFCcevher, z\u0131rh, tecr\xFCbe\u2026" })), ...q.rewards.map((r, n) => {
            const meta = catalog.find((i) => i.id === r.itemId), choices = catalog.filter((i) => i.id === r.itemId || i.name.toLocaleLowerCase("tr").includes(rewardSearch.toLocaleLowerCase("tr")));
            return h("div", { className: "q70-reward", key: n }, field("E\u015Fya / kaynak", h("select", { value: r.itemId, disabled: locked, onChange: (e) => {
              const item = catalog.find((i) => i.id === e.target.value);
              rewardChange(n, { itemId: item.id, amount: 1, ...["gear", "rune"].includes(item.type) ? { power: item.type === "rune" ? 1 : 20 } : {} });
            } }, ...[...new Set(choices.map((i) => i.group ?? "Di\u011Fer"))].map((group) => h("optgroup", { key: group, label: group }, ...choices.filter((i) => (i.group ?? "Di\u011Fer") === group).map((i) => h("option", { key: i.id, value: i.id }, i.name)))))), field("Adet", h("input", { type: "number", min: 1, max: maxAmount(meta), step: 1, value: r.amount, disabled: locked || maxAmount(meta) === 1, onChange: (e) => rewardChange(n, { amount: Number(e.target.value) }) })), ["gear", "rune"].includes(meta?.type) && field(meta.type === "rune" ? "R\xFCn seviyesi" : "E\u015Fya g\xFCc\xFC", h("input", { type: "number", min: 1, max: 1e5, step: 1, value: r.power ?? 20, disabled: locked, onChange: (e) => rewardChange(n, { power: Number(e.target.value) }) })), button("\xD7", () => change(q.id, { rewards: q.rewards.filter((_, i) => i !== n) }), false, { "aria-label": `${n + 1}. \xF6d\xFCl\xFC kald\u0131r` }));
          }), button("+ \xD6d\xFCl ekle", () => change(q.id, { rewards: [...q.rewards, { itemId: "resource:gems", amount: 10 }] }), q.rewards.length >= 6)),
          h("fieldset", { className: "q70-preview" }, h("legend", null, "Oyuncunun g\xF6rece\u011Fi i\xE7erik"), h("h3", null, q.title), h("p", null, q.description || "Hen\xFCz a\xE7\u0131klama yaz\u0131lmad\u0131."), h("p", null, (event?.label ?? q.event) + " \xB7 0 / " + q.target), h("div", null, ...q.rewards.map((r, i) => h("span", { key: i }, `${catalog.find((c) => c.id === r.itemId)?.name ?? r.itemId} \xD7${r.amount}`)))),
          h("small", { className: "q70-id" }, "G\xF6rev kimli\u011Fi: " + q.id)
        )
      ),
      h("footer", { className: "q70-save" }, button(saving ? "Kaydediliyor\u2026" : "G\xF6revleri kaydet", save, !dirty, { className: "q70-primary" }), button("D\xFCzenlemeleri geri al", () => {
        if (confirm("Kaydedilmemi\u015F d\xFCzenlemeler geri al\u0131ns\u0131n m\u0131?")) {
          changed.current = false;
          setDirty(false);
          setDraft(copy(value.config));
          setRevision(value.revision);
          setNotice("Canl\u0131 ayarlar y\xFCklendi.");
        }
      }, !dirty), h("p", { role: "status" }, notice))
    );
  }
  return { Admin };
}
var QUEST_ADMIN_CSS_R70 = `.q70-admin{grid-column:1/-1;min-width:0;color:#e7e7d8}.q70-header{display:flex;justify-content:space-between;gap:16px;align-items:center;margin:8px 0 20px}.q70-header small{color:#cdb37b;letter-spacing:2px;font-size:10px}.q70-admin h2{font-size:27px;margin:5px 0}.q70-admin p{line-height:1.6;font-size:13px;margin:6px 0}.q70-admin label{display:grid;gap:6px;font-size:12px;color:#cedbd3;min-width:0}.q70-admin input,.q70-admin select,.q70-admin textarea{min-width:0;width:100%;box-sizing:border-box;background:#0c1c16;border:1px solid #3e6251;border-radius:7px;color:#f1eedc;padding:10px;font:inherit}.q70-admin input[type=checkbox]{width:20px;height:20px}.q70-admin button{font:inherit;border:1px solid #446754;border-radius:7px;background:#182e23;color:#eee8d5;padding:9px 12px;cursor:pointer}.q70-admin button:disabled{opacity:.45;cursor:default}.q70-layout{display:grid;grid-template-columns:245px minmax(0,1fr);gap:20px}.q70-layout nav{align-self:start;display:grid;gap:10px}.q70-list{max-height:66vh;overflow:auto;display:grid;gap:6px}.q70-list button{text-align:left;display:flex;align-items:center;gap:10px}.q70-list button[aria-current]{border-color:#c5a66d;background:#2e3927}.q70-list b{color:#c2a975;font-size:12px}.q70-list strong,.q70-list small{display:block}.q70-list small{font-size:11px;color:#a8b8ac;margin-top:4px}.q70-list strong{font-size:13px}.q70-admin details{padding:10px;border:1px solid #385440;border-radius:7px}.q70-admin summary{font-size:12px;cursor:pointer}.q70-admin details button{width:100%;margin-top:8px}.q70-editor{display:grid;gap:14px;min-width:0}.q70-toolbar{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.q70-toolbar b{margin-right:auto}.q70-toolbar button{font-size:11px}.q70-admin fieldset{border:1px solid #3c5c4a;background:#10231b;border-radius:12px;padding:17px;min-width:0;display:grid;gap:12px}.q70-admin legend{color:#d7be86;font-size:13px;padding:0 8px}.q70-fields{display:grid;grid-template-columns:minmax(0,2fr) minmax(100px,1fr);gap:12px}.q70-help,.q70-id,.q70-admin small{color:#a8bdb0;font-size:12px}.q70-reward{display:flex;align-items:end;gap:8px;flex-wrap:wrap;padding:10px;background:#071710;border-radius:8px}.q70-reward label{flex:1 1 90px}.q70-reward label:first-child{flex:3 1 210px}.q70-preview h3{font-size:20px;margin:0}.q70-preview p{white-space:pre-wrap}.q70-preview span{display:inline-block;border:1px solid #53694b;border-radius:6px;padding:6px 8px;font-size:12px;margin:0 5px 5px 0}.q70-save{position:sticky;bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#10261e;border:1px solid #6b7854;border-radius:10px;padding:12px;margin-top:18px;z-index:3}.q70-save p{flex:1 1 190px;font-size:12px}.q70-save .q70-primary{background:#326348;border-color:#8ab58a}@media(max-width:850px){.q70-layout{grid-template-columns:1fr}.q70-list{max-height:230px}.q70-header{align-items:start}.q70-fields{grid-template-columns:1fr}.q70-save{position:static}.q70-admin fieldset{padding:12px}}`;
export {
  QUEST_ADMIN_CSS_R70,
  createQuestsAdminR70,
  questMetaR70
};
