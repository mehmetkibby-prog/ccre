// project/r109_latency_completion/working/core511-source/scripts/core511/royal-admin-client-r118.mjs
var ROYAL_UI_KINDS_R118 = Object.freeze({ weapon: "Silah", armor: "Zırh", helmet: "Miğfer", shoes: "Çizme", necklace: "Kolye" });
function csrfR118() {
  const cookie = typeof document === "undefined" ? "" : document.cookie;
  const row = cookie.split(";").map((s) => s.trim()).find((s) => s.startsWith("__Host-yasam-csrf=") || s.startsWith("yasam-csrf-local="));
  try {
    return row ? decodeURIComponent(row.slice(row.indexOf("=") + 1)) : "";
  } catch {
    return "";
  }
}
async function adminRequestR118(domain, body, { signal, timeoutMs = 15e3 } = {}) {
  const controller = new AbortController(), cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("/api/admin?core511=" + domain + "-r118", { method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal, headers: { "content-type": "application/json", "x-csrf-token": csrfR118() }, body: JSON.stringify(body) });
    let data;
    try {
      data = await response.json();
    } catch (error) {
      if (error.name === "AbortError") throw error;
      throw Error("Yönetim yanıtı okunamadı. Yeniden yükle.");
    }
    if (!response.ok) throw Object.assign(Error(data?.error ?? "Ayar işlemi tamamlanamadı."), { status: response.status });
    const value = data?.[domain];
    if (!value || !Number.isSafeInteger(value.revision) || value.revision < 1 || !value.config || typeof value.config !== "object") throw Error("Ayar yanıtı eksik. Yeniden yükle.");
    return value;
  } catch (error) {
    if (error.name === "AbortError" && !signal?.aborted) throw Error("İstek zaman aşımına uğradı. Kaydettiysen sonucu görmek için kayıtlı ayarları yükle.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}
var ADMIN_CSS_R118 = `
.r118-admin{grid-column:1/-1;min-width:0;color:#eee9df}.r118-admin *{box-sizing:border-box}.r118-admin header{padding:23px;border:1px solid #827348;border-radius:13px;background:linear-gradient(125deg,#213b32,#12251e);margin-bottom:18px}.r118-admin header small{color:#d5bb7f;letter-spacing:.14em;font-size:10px;font-weight:700}.r118-admin h2{font:700 26px Georgia,serif;color:#f2e4be;margin:7px 0}.r118-admin h3{margin:0 0 14px;color:#ead9ac;font-size:17px}.r118-admin p{font-size:13px;color:#bdc9bd;line-height:1.65}.r118-admin .r118-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.r118-admin label{display:grid;gap:6px;min-width:0;font-size:13px}.r118-admin input,.r118-admin select,.r118-admin button{font:inherit;min-height:44px;border:1px solid #536650;border-radius:8px;background:#122a20;color:#f0eee1;padding:10px;min-width:0;max-width:100%;color-scheme:dark}.r118-admin input,.r118-admin select{width:100%}.r118-admin button{cursor:pointer}.r118-admin button:disabled{opacity:.45;cursor:default}.r118-admin :is(input,select,button):focus-visible{outline:2px solid #edd39a;outline-offset:3px}.r118-admin .r118-card{border:1px solid #435a46;border-radius:11px;padding:18px;margin-top:15px;background:#14271e}.r118-admin .r118-row{display:grid;grid-template-columns:minmax(145px,1fr) 105px auto;gap:9px;align-items:end;margin:10px 0}.r118-admin .r118-row.r118-loot{grid-template-columns:minmax(145px,1fr) repeat(3,85px) auto}.r118-admin .r118-error{color:#ffcfbd;border-left:3px solid #ca886b;padding:10px 13px;background:#432c2580;overflow-wrap:anywhere}.r118-admin .r118-notice{color:#dcebd3;border-left:3px solid #c7ad73;padding:12px 14px;background:#2b3e2d;overflow-wrap:anywhere}.r118-admin .r118-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.r118-admin .r118-primary{background:#d9be80;color:#18251d;border-color:#ecd69e;font-weight:700}.r118-admin .r118-empty{border:1px dashed #52654d;border-radius:8px;padding:12px}.r118-admin .r118-select{max-width:330px;margin:14px 0}.r118-admin .r118-subtle{font-size:12px;color:#a7b5a5}.r118-admin .r118-species{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.r118-admin .r118-species [aria-pressed=true]{background:#40543b;border-color:#d8bc7d;color:#ffe9b6}.r118-admin input[type=checkbox]{width:18px;min-height:18px}.r118-admin .r118-checkbox{display:flex;align-items:center;gap:8px}.r118-admin .r118-search{margin:16px 0}.r118-admin .r118-total{padding:8px 12px;border:1px solid #52664b;border-radius:8px;font-size:12px;color:#c8d4bf}@media(max-width:760px){.r118-admin .r118-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.r118-admin .r118-row,.r118-admin .r118-row.r118-loot{grid-template-columns:repeat(2,minmax(0,1fr))}.r118-admin .r118-row>label:first-child{grid-column:1/-1}.r118-admin .r118-row>button{align-self:end}.r118-admin header,.r118-admin .r118-card{padding:15px}.r118-admin .r118-actions>button{flex:1 1 170px}}@media(max-width:400px){.r118-admin .r118-fields{grid-template-columns:1fr}}
`;

// project/r109_latency_completion/working/core511-source/scripts/core511/champions-admin-client-r118.mjs
var clone = (value) => JSON.parse(JSON.stringify(value));
var lootLimit = (id) => ["white", "blue", "orange", "red", "purple", "emerald"].includes(id) ? 3 : 100;
function validateChampionsAdminR118(config, species, lootLabels) {
  if (!config || typeof config.enabled !== "boolean" || !config.monsters) return "Haritanın açık veya kapalı olduğunu seç.";
  for (const { key } of species ?? []) {
    const row = config.monsters[key];
    if (!row || typeof row.name !== "string" || !row.name.trim() || row.name.length > 60) return "Her canavarın 1–60 karakterlik bir adı olmalı.";
    for (const [field, min, max, label] of [["hp", 1, 1e7, "Can"], ["damage", 0, 1e6, "Hasar"], ["xp", 0, 1e6, "Tecrübe"], ["essence", 0, 1e6, "Öz"], ["respawnSeconds", 1, 86400, "Yeniden doğma süresi"]]) if (!Number.isSafeInteger(row[field]) || row[field] < min || row[field] > max) return row.name + " · " + label + " alanına " + min + "–" + max + " arası tam sayı yaz.";
    for (const [id, loot] of Object.entries(row.loot ?? {})) {
      if (!Object.hasOwn(lootLabels ?? {}, id)) return "Bilinmeyen ganimet seçildi.";
      if (!Number.isFinite(loot.chance) || loot.chance < 0 || loot.chance > 100) return "Ganimet oranları %0–%100 arasında olmalı.";
      if (!Number.isSafeInteger(loot.min) || !Number.isSafeInteger(loot.max) || loot.min < 1 || loot.max < loot.min || loot.max > lootLimit(id)) return "Ganimet adedi 1–" + lootLimit(id) + " arasında; en yüksek adet en düşük adetten az olmamalı.";
    }
  }
  return "";
}
function createChampionsAdminR118(React) {
  const h = React.createElement;
  return function ChampionsAdmin() {
    const [data, setData] = React.useState(null), [draft, setDraft] = React.useState(null), [busy, setBusy] = React.useState(false), [error, setError] = React.useState(""), [notice, setNotice] = React.useState(""), [active, setActive] = React.useState(""), [shown, setShown] = React.useState({}), [mustReload, setMustReload] = React.useState(false);
    const alive = React.useRef(true), lock = React.useRef(false), controller = React.useRef(null);
    const act = async (save = false) => {
      if (lock.current) return;
      const invalid = save ? validateChampionsAdminR118(draft, data?.species, data?.lootLabels) : "";
      if (invalid) {
        setError(invalid);
        return;
      }
      lock.current = true;
      setBusy(true);
      setError("");
      setNotice("");
      const abort = new AbortController();
      controller.current = abort;
      try {
        const next = await adminRequestR118("champions", { action: save ? "champions_admin_save_r118" : "champions_admin_read_r118", ...save ? { revision: data.revision, config: draft } : {} }, { signal: abort.signal });
        const merged = { ...data, ...next };
        if (!Array.isArray(merged.species) || merged.species.length !== 4 || !merged.lootLabels || merged.species.some((row2) => !next.config.monsters?.[row2.key])) throw Error("Canavar ayarları eksik. Yeniden yükle.");
        if (alive.current && controller.current === abort) {
          setData(merged);
          setDraft(clone(next.config));
          setActive((old) => merged.species.some((row2) => row2.key === old) ? old : merged.species[0].key);
          setShown(Object.fromEntries(merged.species.map(({ key }) => [key, Object.keys(next.config.monsters[key].loot).filter((id) => id === "royal_crown" || next.config.monsters[key].loot[id].chance > 0)])));
          setMustReload(false);
          setNotice(save ? "Şampiyonlar Diyarı ayarları bu sunucuya kaydedildi." : "");
        }
      } catch (e) {
        if (alive.current && controller.current === abort && e.name !== "AbortError") {
          setError(e.message ?? "İşlem tamamlanamadı.");
          if (save) setMustReload(true);
        }
      } finally {
        if (controller.current === abort) {
          lock.current = false;
          controller.current = null;
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
    const species = data?.species ?? [], labels = data?.lootLabels ?? {}, row = draft?.monsters?.[active], visible = shown[active] ?? [], validation = draft ? validateChampionsAdminR118(draft, species, labels) : "";
    const change = (patch) => setDraft((old) => ({ ...old, monsters: { ...old.monsters, [active]: { ...old.monsters[active], ...patch } } }));
    const lootChange = (id, patch) => change({ loot: { ...row.loot, [id]: { ...row.loot[id], ...patch } } });
    const remove = (id) => {
      lootChange(id, { chance: 0 });
      setShown((old) => ({ ...old, [active]: old[active].filter((key) => key !== id) }));
    };
    const number = (key, label, min, max) => h("label", { key }, label, h("input", { type: "number", step: 1, min, max, value: row[key], disabled: busy, "aria-label": label, onChange: (e) => change({ [key]: Number(e.target.value) }) }));
    return h(
      "section",
      { className: "admin-card r118-admin", "data-champions-admin": "r118" },
      h("style", null, ADMIN_CSS_R118),
      h("header", null, h("small", null, "HARİTALAR VE SAVAŞ"), h("h2", null, "Şampiyonlar Diyarı"), h("p", null, "Yalnız Şampiyonların girebildiği açık PvP haritası. Her türün canını, hasarını ve av ödüllerini ayrı düzenle.")),
      draft && row ? h(
        React.Fragment,
        null,
        h("label", { className: "r118-select" }, "Harita", h("select", { value: String(draft.enabled), disabled: busy, onChange: (e) => setDraft({ ...draft, enabled: e.target.value === "true" }) }, h("option", { value: "true" }, "Açık"), h("option", { value: "false" }, "Kapalı"))),
        h("p", { className: "r118-subtle" }, "Giriş koşulu: en az Şampiyon Lv 1. PvP açıktır. Her kanalda dört türden toplam " + species.reduce((sum, v) => sum + (v.count ?? 12), 0) + " canavar bulunur."),
        h("nav", { className: "r118-species", "aria-label": "Şampiyonlar Diyarı canavarları" }, ...species.map((v) => h("button", { key: v.key, type: "button", "aria-pressed": active === v.key, onClick: () => setActive(v.key) }, draft.monsters[v.key]?.name ?? v.name))),
        h("section", { className: "r118-card" }, h("h3", null, "Canavar özellikleri"), h("div", { className: "r118-fields" }, h("label", null, "Canavar adı", h("input", { type: "text", maxLength: 60, value: row.name, disabled: busy, onChange: (e) => change({ name: e.target.value }) })), number("hp", "Can", 1, 1e7), number("damage", "Hasar", 0, 1e6), number("xp", "Tecrübe", 0, 1e6), number("essence", "Öz", 0, 1e6), number("respawnSeconds", "Yeniden doğma (saniye)", 1, 86400)), h("p", { className: "r118-subtle" }, "Can değişikliği canavar yeniden doğduğunda uygulanır. Öz ve tecrübe av başına belirlenir. Aşağıdaki eşya oranları birbirinden bağımsızdır; toplamın %100 olması gerekmez.")),
        h(
          "section",
          { className: "r118-card" },
          h("h3", null, "Bu canavardan düşebilecek eşyalar"),
          ...visible.map((id, index) => {
            const value = row.loot[id] ?? { chance: 0, min: 1, max: 1 };
            return h("div", { className: "r118-row r118-loot", key: id }, h("label", null, "Eşya " + (index + 1), h("select", { value: id, disabled: busy, "aria-label": "Ganimet " + (index + 1), onChange: (e) => {
              const next = e.target.value;
              change({ loot: { ...row.loot, [id]: { ...value, chance: 0 }, [next]: { ...value, min: Math.min(value.min, lootLimit(next)), max: Math.min(value.max, lootLimit(next)) } } });
              setShown((old) => ({ ...old, [active]: old[active].map((key) => key === id ? next : key) }));
            } }, ...Object.entries(labels).filter(([key]) => key === id || !visible.includes(key)).map(([key, label]) => h("option", { key, value: key }, label)))), h("label", null, "Oran %", h("input", { type: "number", min: 0, max: 100, step: 0.01, value: value.chance, disabled: busy, "aria-label": "Ganimet oranı " + (index + 1), onChange: (e) => lootChange(id, { chance: Number(e.target.value) }) })), h("label", null, "En az", h("input", { type: "number", min: 1, max: lootLimit(id), step: 1, value: value.min, disabled: busy, "aria-label": "Ganimet en az " + (index + 1), onChange: (e) => lootChange(id, { min: Number(e.target.value) }) })), h("label", null, "En çok", h("input", { type: "number", min: 1, max: lootLimit(id), step: 1, value: value.max, disabled: busy, "aria-label": "Ganimet en çok " + (index + 1), onChange: (e) => lootChange(id, { max: Number(e.target.value) }) })), h("button", { type: "button", disabled: busy, "aria-label": "Ganimeti kaldır " + (index + 1), onClick: () => remove(id) }, "Kaldır"));
          }),
          !visible.length && h("p", { className: "r118-empty" }, "Bu canavarda eşya düşürme kapalı. Ganimet ekleyerek bir oran belirleyebilirsin."),
          h("button", { type: "button", disabled: busy || visible.length >= Object.keys(labels).length, onClick: () => {
            const id = Object.keys(labels).find((key) => !visible.includes(key));
            if (id) {
              lootChange(id, { chance: 0, min: 1, max: 1 });
              setShown((old) => ({ ...old, [active]: [...old[active] ?? [], id] }));
            }
          } }, "+ Ganimet ekle"),
          h("p", { className: "r118-subtle" }, "Oranı %0 olan eşya düşmez. Kraliyet Tacı dönüşüm malzemesidir; buradan çıkma oranını belirleyebilirsin.")
        ),
        validation && h("p", { className: "r118-error", role: "status" }, validation),
        mustReload && h("p", { className: "r118-error" }, "Kaydın sonucunu doğrulamak için kayıtlı ayarları yükle."),
        h("div", { className: "r118-actions" }, h("button", { type: "button", className: "r118-primary", disabled: busy || mustReload || !!validation, onClick: () => void act(true) }, busy ? "İşleniyor…" : "Harita ayarlarını kaydet"), h("button", { type: "button", disabled: busy, onClick: () => void act() }, "Kayıtlı ayarları yükle"))
      ) : h("section", { className: "r118-card" }, h("p", { role: "status" }, busy ? "Şampiyonlar Diyarı ayarları yükleniyor…" : "Harita ayarları yüklenemedi."), !busy && h("button", { type: "button", onClick: () => void act() }, "Yeniden dene")),
      error && h("p", { className: "r118-error", role: "alert" }, error),
      notice && h("p", { className: "r118-notice", role: "status" }, notice)
    );
  };
}
export {
  createChampionsAdminR118,
  validateChampionsAdminR118
};
