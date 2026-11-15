// project/r109_latency_completion/working/core511-source/scripts/core511/royal-client-r118.mjs
var ROYAL_EVENT_R118 = "core-royal-r118";
var format = (value) => Math.max(0, Number(value) || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
var kindLabel = { weapon: "Silah", armor: "Zırh", helmet: "Miğfer", shoes: "Çizme", necklace: "Kolye" };
var openRoyalR118 = (page) => window.dispatchEvent(new CustomEvent(ROYAL_EVENT_R118, { detail: page === "salvage" ? "salvage" : "transform" }));
function royaltyNearR118(own, world, position) {
  return !!own && !!position && (world?.area ?? own.area) === position.area && Number.isFinite(own.x) && Number.isFinite(own.y) && Math.hypot(own.x - position.x, own.y - position.y) <= position.radius;
}
async function readRoyalR118({ signal, timeoutMs = 15e3 } = {}) {
  const controller = new AbortController(), cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("/api/royal-r118", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
    let data;
    try {
      data = await response.json();
    } catch (e) {
      if (e.name === "AbortError") throw e;
      throw Error("Dönüşüm bilgileri okunamadı. Yeniden dene.");
    }
    if (!response.ok) throw Object.assign(Error(data?.error ?? "Dönüşüm bilgileri alınamadı."), { status: response.status });
    if (!data || !Number.isSafeInteger(data.revision) || data.revision < 1 || !Array.isArray(data.items) || !data.recipes || !data.location || typeof data.champion !== "boolean") throw Error("Dönüşüm bilgileri eksik. Yeniden dene.");
    return data;
  } catch (e) {
    if (e.name === "AbortError" && !signal?.aborted) throw Error("Dönüşüm bilgileri zamanında alınamadı. Yeniden dene.");
    throw e;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}
function validRoyalPendingR118(value) {
  return !!value && ["royal_transform_r118", "royal_salvage_r118"].includes(value.action) && typeof value.requestId === "string" && /^[a-zA-Z0-9_-]{16,80}$/.test(value.requestId) && typeof value.itemId === "string" && typeof value.itemStamp === "string" && (value.action !== "royal_salvage_r118" || value.confirm === true) && (value.action !== "royal_transform_r118" || Number.isSafeInteger(value.revision));
}
function createRoyalUIR118(React, { Dialog, Content, Header, Title, Description, icon = () => null } = {}) {
  const h = React.createElement;
  const Icon = ({ kind, role, size = 46 }) => {
    const src = icon(kind, role);
    return src ? h("img", { src, width: size, height: size, alt: "", loading: "lazy", decoding: "async", className: "royal118-icon" }) : h("span", { className: "royal118-icon royal118-symbol", "aria-hidden": true, style: { width: size, height: size } }, kind === "royal_crown" ? "♛" : "◆");
  };
  function Entry({ area, onOpen, kind = "transform" }) {
    if (area !== "bazaar") return null;
    return h("button", { type: "button", className: "royal118-entry", "data-royal-entry": kind, onClick: () => {
      onOpen?.();
      setTimeout(() => openRoyalR118(kind), 0);
    } }, h(Icon, { kind: kind === "salvage" ? "emerald_dust" : "royal_crown", size: 32 }), h("span", null, kind === "salvage" ? "Kadim Zümrüt → Zümrüt Tozu" : "Kraliyet Dönüşümü"));
  }
  const RoyalEntry = (props) => h(Entry, { ...props, kind: "transform" }), SalvageEntry = (props) => h(Entry, { ...props, kind: "salvage" });
  function Host({ own, world, joined, post, suspended, onChanged }) {
    const [page, setPage] = React.useState(null), [data, setData] = React.useState(null), [loading, setLoading] = React.useState(false), [busy, setBusy] = React.useState(false), [error, setError] = React.useState(""), [notice, setNotice] = React.useState(""), [selected, setSelected] = React.useState(""), [confirmation, setConfirmation] = React.useState(null), [pending, setPending] = React.useState(null), [fresh, setFresh] = React.useState(false);
    const refs = React.useRef({}), generation = React.useRef(0), controller = React.useRef(null), lock = React.useRef(false), pageRef = React.useRef(null), pendingRef = React.useRef(null), titleId = React.useId ? React.useId() : "royal-dialog-title-r118";
    refs.current = { own, world, joined, post, suspended, onChanged };
    pageRef.current = page;
    pendingRef.current = pending;
    const key = () => `core.royal.pending.r118:${typeof location === "undefined" ? "local" : location.host}:${refs.current.own?.id ?? ""}`;
    const remember = (value) => {
      pendingRef.current = value;
      setPending(value);
      try {
        if (value) sessionStorage.setItem(key(), JSON.stringify(value));
        else sessionStorage.removeItem(key());
      } catch {
      }
    };
    const load = React.useCallback(async () => {
      if (!refs.current.joined || !refs.current.own?.id) return;
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      const g = generation.current;
      setLoading(true);
      setFresh(false);
      setError("");
      try {
        const next = await readRoyalR118({ signal: abort.signal });
        if (g === generation.current && controller.current === abort) {
          setData(next);
          setFresh(true);
          setSelected((id) => next.items.some((row) => row.id === id) ? id : "");
        }
      } catch (e) {
        if (g === generation.current && controller.current === abort && e.name !== "AbortError") setError(e.message ?? "Dönüşüm bilgileri alınamadı.");
      } finally {
        if (g === generation.current && controller.current === abort) {
          controller.current = null;
          setLoading(false);
        }
      }
    }, []);
    React.useEffect(() => {
      generation.current++;
      controller.current?.abort();
      controller.current = null;
      lock.current = false;
      setPage(null);
      setData(null);
      setLoading(false);
      setBusy(false);
      setError("");
      setNotice("");
      setSelected("");
      setConfirmation(null);
      setFresh(false);
      let saved = null;
      try {
        const value = JSON.parse(sessionStorage.getItem(key()) ?? "null");
        if (validRoyalPendingR118(value)) saved = value;
        else sessionStorage.removeItem(key());
      } catch {
      }
      pendingRef.current = saved;
      setPending(saved);
      return () => {
        generation.current++;
        controller.current?.abort();
        controller.current = null;
      };
    }, [joined, own?.id]);
    React.useEffect(() => {
      const open = (event) => {
        if (!refs.current.joined || !refs.current.own || refs.current.suspended) return;
        setPage(event.detail === "salvage" ? "salvage" : "transform");
        setConfirmation(null);
        setNotice("");
        void load();
      };
      window.addEventListener(ROYAL_EVENT_R118, open);
      return () => window.removeEventListener(ROYAL_EVENT_R118, open);
    }, [load]);
    const close = () => {
      if (lock.current) return;
      setPage(null);
      setConfirmation(null);
      controller.current?.abort();
      controller.current = null;
      setLoading(false);
    };
    async function execute(command, retry = false) {
      if (lock.current || refs.current.suspended || !refs.current.joined || !retry && (pendingRef.current || !fresh)) return;
      const payload = retry ? command : { ...command, requestId: crypto.randomUUID() };
      if (!validRoyalPendingR118(payload)) {
        setError("İşlem bilgileri yenilenmeli.");
        return;
      }
      lock.current = true;
      setBusy(true);
      setError("");
      setNotice("");
      remember(payload);
      const g = generation.current;
      try {
        const result = await refs.current.post("/api/action", payload);
        if (g !== generation.current) return;
        remember(null);
        setConfirmation(null);
        setSelected("");
        setNotice(result?.message ?? (payload.action === "royal_salvage_r118" ? "Eşya eritildi. 1 Zümrüt Tozu çantana eklendi." : "Kraliyet dönüşümü tamamlandı. Eşyan çantana eklendi."));
        await load();
        try {
          await refs.current.onChanged?.();
        } catch {
          if (g === generation.current) setError("İşlem kaydedildi. Çanta görünümü yenilenemedi; yeniden bağlandığında güncel eşyan görünecek.");
        }
      } catch (e) {
        if (g !== generation.current) return;
        setError(e.message ?? "İşlemin sonucu henüz doğrulanamadı. Aynı işlemin sonucunu kontrol et.");
        if ([400, 401, 403, 404, 409, 422].includes(e.status)) {
          remember(null);
          setConfirmation(null);
          setFresh(false);
        }
      } finally {
        if (g === generation.current) {
          lock.current = false;
          setBusy(false);
        }
      }
    }
    if (!joined || !own) return null;
    const item = data?.items?.find((row) => row.id === selected), salvage = page === "salvage", title = salvage ? "Zümrüt Tozu · Demirci Haso" : "Hükümdar Kraliyet Seti", target = data?.location?.[salvage ? "salvage" : "transform"], near = royaltyNearR118(own, world, target), costs = item ? data?.recipes?.[item.kind]?.costs ?? [] : [], enough = costs.every((row) => !(row.missing > 0) && row.sufficient !== false), eligible = salvage || data?.champion === true, enabled = salvage || data?.enabled === true, block = busy || loading || suspended || !fresh || !!pending || !near || !eligible || !enabled;
    const costView = (rows) => h("div", { className: "royal118-costs" }, ...rows.map((row) => h("div", { className: "royal118-cost" + (row.missing > 0 ? " short" : ""), key: row.itemId }, h(Icon, { kind: row.itemId.split(":").at(-1), size: 34 }), h("span", null, row.name ?? "Dönüşüm malzemesi", h("small", null, format(row.available ?? row.owned ?? 0) + " / " + format(row.amount))))));
    const content = h(
      "div",
      { className: "royal118-body" },
      error && h("div", { className: "royal118-error", role: "alert" }, error),
      notice && h("div", { className: "royal118-notice", role: "status" }, notice),
      pending && h("section", { className: "royal118-warning" }, h("strong", null, "Bekleyen işlemin sonucu doğrulanmalı."), h("p", null, "Yeni eşya harcamadan önce aynı işlemin sonucunu kontrol et."), h("button", { type: "button", disabled: busy || suspended, onClick: () => void execute(pending, true) }, busy ? "Kontrol ediliyor…" : "Aynı işlemin sonucunu kontrol et")),
      loading && h("p", { role: "status" }, "Güncel eşya ve malzemeler yükleniyor…"),
      !fresh && !loading && h("button", { type: "button", className: "royal118-secondary", disabled: busy, onClick: () => void load() }, "Bilgileri yeniden yükle"),
      data && h(
        React.Fragment,
        null,
        h("div", { className: "royal118-hero" }, h(Icon, { kind: salvage ? "emerald_dust" : "royal_crown", size: 74 }), h("div", null, h("span", { className: "royal118-eyebrow" }, salvage ? "BİRİKEN EŞYALARINA YENİ BİR AMAÇ" : "ŞAMPİYONLARA ÖZEL"), h("h3", null, salvage ? "Zümrüdün yeni gücü." : "Tahtına layık bir güç."), h("p", null, salvage ? "1 Kadim Zümrüt eşya → 1 Zümrüt Tozu" : "Beyaz ve altın Hükümdar Kraliyet Seti · %" + (data.bonusPercent ?? 8) + " temel güç"))),
        h("div", { className: "royal118-balances" }, h("div", null, h(Icon, { kind: "emerald_dust", size: 34 }), h("span", null, "Zümrüt Tozu", h("b", null, format(data.materials?.emerald_dust)))), h("div", null, h(Icon, { kind: "royal_crown", size: 34 }), h("span", null, "Kraliyet Tacı", h("b", null, format(data.materials?.royal_crown))))),
        !near && h("p", { className: "royal118-warning" }, salvage ? "Eritmek için Pazar Köyü’nde Demirci Haso’nun yanına gel." : "Dönüşüm için Pazar Köyü’ndeki Kraliyet Ustası’nın yanına gel."),
        !eligible && h("p", { className: "royal118-warning" }, "Kraliyet dönüşümü ve bu eşyaları kuşanmak için en az Şampiyon Lv 1 olmalısın."),
        !enabled && h("p", { className: "royal118-warning" }, "Kraliyet dönüşümü şu anda kapalı."),
        !confirmation ? h(
          React.Fragment,
          null,
          h("label", { className: "royal118-select" }, salvage ? "Eritilecek Kadim Zümrüt eşya" : "Dönüştürülecek Kadim Zümrüt eşya", h("select", { value: selected, disabled: busy || !!pending, "aria-label": "Kadim Zümrüt eşya seç", onChange: (e) => setSelected(e.target.value) }, h("option", { value: "" }, "Çantandan bir eşya seç…"), ...data.items.map((row) => h("option", { value: row.id, key: row.id }, row.name + " · " + format(row.power) + (row.infinite ? " · Sonsuz" : ""))))),
          !data.items.length && h("p", { className: "royal118-muted" }, "Uygun eşyan bulunmuyor. Kuşanılmış, satışa konmuş veya kilitli eşyalar bu listede görünmez."),
          item && h("section", { className: "royal118-item" }, h(Icon, { kind: item.kind, role: item.role, size: 64 }), h("div", null, h("strong", null, item.name), h("p", null, (kindLabel[item.kind] ?? "Eşya") + " · Güç " + format(item.power)), !salvage && h("p", null, "→ " + item.royalName + " · Güç " + format(item.royalPower)))),
          item && !salvage && h(React.Fragment, null, h("h4", null, "Dönüşüm malzemeleri"), costView(costs), h("p", { className: "royal118-muted" }, "Efsunların, taşların, artı seviyen ve varsa Sonsuz geliştirmen korunur. Aynı parçan Kraliyet eşyasına dönüşür.")),
          salvage && h("p", { className: "royal118-warning" }, "Eritilen eşya, üzerindeki taşlar ve geliştirmeler kalıcı olarak silinir. Karşılığında 1 Zümrüt Tozu alırsın."),
          h("button", { type: "button", className: "royal118-primary", disabled: block || !item || !salvage && !enough, onClick: () => setConfirmation({ item: { ...item }, revision: data.revision, costs: costs.map((row) => ({ ...row })), salvage }) }, salvage ? "Eritmeyi incele" : "Dönüşümü incele")
        ) : h(
          "section",
          { className: "royal118-confirm", "aria-label": "İşlemi onayla" },
          h("h4", null, confirmation.salvage ? "Bu eşya kalıcı olarak silinecek" : "Kraliyet dönüşümünü onayla"),
          h("strong", null, confirmation.item.name),
          h("p", null, "Mevcut güç: " + format(confirmation.item.power) + (confirmation.item.infinite ? " · Sonsuz" : "")),
          confirmation.salvage ? h("p", null, "Eşya, taşları ve geliştirmeleri silinir. Karşılık: 1 Zümrüt Tozu.") : h(React.Fragment, null, h("p", null, confirmation.item.royalName + " · Güç " + format(confirmation.item.royalPower)), costView(confirmation.costs), h("p", null, "Yukarıdaki malzemeler harcanır. Efsunların, taşların ve geliştirmelerin korunur.")),
          h("div", { className: "royal118-actions" }, h("button", { type: "button", disabled: busy || !!pending, onClick: () => setConfirmation(null) }, "Vazgeç"), h("button", { type: "button", className: confirmation.salvage ? "royal118-danger" : "royal118-primary", disabled: block, onClick: () => void execute({ action: confirmation.salvage ? "royal_salvage_r118" : "royal_transform_r118", itemId: confirmation.item.id, itemStamp: confirmation.item.itemStamp, ...confirmation.salvage ? { confirm: true } : { revision: confirmation.revision } }) }, busy ? "İşleniyor…" : confirmation.salvage ? "Eşyayı erit · 1 Toz al" : "Malzemeleri harca ve dönüştür"))
        )
      )
    );
    return h(React.Fragment, null, h("style", null, ROYAL_CSS_R118), Dialog ? h(Dialog, { open: !!page, onOpenChange: (value) => {
      if (!value) close();
    } }, h(Content, { className: "royal118-dialog", onEscapeKeyDown: (event) => {
      if (busy) event.preventDefault();
    }, onPointerDownOutside: (event) => {
      if (busy) event.preventDefault();
    } }, h(Header, null, h(Title, null, title), h(Description, null, "Core of Life · " + own.name)), content)) : page && h("div", { className: "royal118-overlay" }, h("section", { className: "royal118-dialog", role: "dialog", "aria-modal": true, "aria-labelledby": titleId }, h("header", null, h("h2", { id: titleId }, title), h("button", { type: "button", disabled: busy, onClick: close, "aria-label": "Kapat" }, "×")), content)));
  }
  return { Host, RoyalEntry, SalvageEntry, Icon };
}
var ROYAL_CSS_R118 = `
.royal118-entry{display:flex;align-items:center;gap:9px;min-height:44px;border:1px solid #b29a63;border-radius:9px;background:#283c32;color:#f2dfae;padding:9px 12px;font:inherit;cursor:pointer}.royal118-icon{display:inline-block;object-fit:contain;flex-shrink:0}.royal118-symbol{display:inline-grid;place-items:center;font-size:32px;color:#dfc085}.royal118-dialog{box-sizing:border-box;background:radial-gradient(ellipse at top right,#304637,transparent 60%),#10221c!important;color:#eeeade!important;border:1px solid #ac9662!important;border-radius:17px!important;width:calc(100vw - 28px)!important;max-width:650px!important;max-height:calc(100dvh - 24px)!important;overflow-y:auto!important;overscroll-behavior:contain;padding:24px!important;box-shadow:0 24px 90px #000a}.royal118-dialog *{box-sizing:border-box}.royal118-dialog h2,.royal118-dialog h3{font-family:Georgia,serif;color:#f1dfb1}.royal118-dialog h3{font-size:27px;margin:6px 0 9px;line-height:1.2}.royal118-dialog h4{color:#e7d4a3;margin:4px 0;font-size:16px}.royal118-dialog p{font-size:13px;line-height:1.6;color:#b9c7b7;margin:4px 0}.royal118-dialog button,.royal118-dialog select{font:inherit;font-size:14px;min-height:44px;min-width:0;max-width:100%;border:1px solid #59725b;border-radius:8px;background:#213a2c;color:#ece9dc;padding:11px 13px;cursor:pointer}.royal118-dialog button:disabled{opacity:.45;cursor:default}.royal118-dialog :is(button,select):focus-visible,.royal118-entry:focus-visible{outline:2px solid #f4db9f;outline-offset:3px}.royal118-dialog button.royal118-primary{background:linear-gradient(110deg,#f1deb0,#bea16a);border-color:#ead6a4;color:#1e2b20;font-weight:700}.royal118-dialog button.royal118-danger{background:#5c3227;border-color:#bd8c68;color:#ffe4c6;font-weight:700}.royal118-body{display:grid;gap:16px;padding-top:16px}.royal118-hero{display:flex;gap:17px;align-items:center}.royal118-eyebrow{font-size:10px;font-weight:700;letter-spacing:.13em;color:#bba778}.royal118-balances{display:grid;grid-template-columns:1fr 1fr;gap:10px}.royal118-balances>div{display:flex;gap:10px;align-items:center;padding:12px;border:1px solid #526448;border-radius:10px;background:#142a20}.royal118-balances span{font-size:12px;min-width:0}.royal118-balances b{display:block;font-size:19px;color:#ecdbac;margin-top:4px}.royal118-select{display:grid;gap:7px;font-size:13px;color:#d9dfce}.royal118-select select{width:100%}.royal118-item{display:flex;gap:13px;align-items:center;padding:14px;border:1px solid #7a7553;border-radius:11px;background:#28392b}.royal118-item>div{min-width:0}.royal118-item strong{overflow-wrap:anywhere;color:#f3e0b2}.royal118-costs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.royal118-cost{display:flex;align-items:center;gap:9px;border:1px solid #3c5844;border-radius:9px;padding:11px;background:#0a2017;font-size:12px;min-width:0}.royal118-cost span{min-width:0;overflow-wrap:anywhere}.royal118-cost small{display:block;color:#b4c5a8;margin-top:4px}.royal118-cost.short small{color:#edb59b}.royal118-body .royal118-muted{font-size:12px;color:#a0b19d}.royal118-error,.royal118-warning,.royal118-notice{padding:12px 14px;border:1px solid #7c6f45;border-radius:9px;font-size:13px;line-height:1.6;overflow-wrap:anywhere;background:#3e382477}.royal118-body .royal118-warning{color:#e4ce9c}.royal118-error{border-color:#a96f55;color:#ffcfbc;background:#4d302877}.royal118-notice{border-color:#6f8a60;color:#e0eecf;background:#2a422777}.royal118-confirm{border:1px solid #a38d5c;border-radius:12px;background:#2e3825;padding:17px;display:grid;gap:13px}.royal118-actions{display:flex;gap:9px;justify-content:flex-end}.royal118-actions>button{flex:1}.royal118-overlay{position:fixed;inset:0;z-index:230;display:grid;place-items:center;background:#000a}.royal118-dialog>header{display:flex;justify-content:space-between;align-items:center;gap:12px}@media(max-width:600px){.royal118-dialog{padding:17px 14px max(17px,env(safe-area-inset-bottom))!important}.royal118-hero{gap:10px}.royal118-dialog h3{font-size:23px}.royal118-balances>div{padding:10px 8px}.royal118-costs{grid-template-columns:1fr}.royal118-item{padding:11px}.royal118-actions{flex-wrap:wrap}.royal118-actions>button{flex:1 1 180px}}@media(prefers-reduced-motion:reduce){.royal118-dialog *{animation:none!important;transition:none!important}}
`;
export {
  ROYAL_CSS_R118,
  ROYAL_EVENT_R118,
  createRoyalUIR118,
  openRoyalR118,
  readRoyalR118,
  royaltyNearR118,
  validRoyalPendingR118
};
