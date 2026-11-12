// r34-work/working/core511-source/scripts/core511/admin-afk-client.mjs
function createAfkAdmin(React) {
  const h = React.createElement, number = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString("tr-TR") : "\u2014";
  const date = (value) => value ? new Date(Number(value)).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "\u2014";
  const duration = (value) => {
    const n = Math.max(0, Math.floor((Number(value) || 0) / 6e4));
    return n >= 60 ? Math.floor(n / 60) + " sa " + n % 60 + " dk" : n + " dk";
  };
  const seconds = (value) => value == null ? "\u2014" : (Number(value) / 1e3).toFixed(1) + " sn";
  const fixed = (value, digits = 2) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : "\u2014";
  const labels = { locked: "Kilitli", watch: "\u0130zlemede", clean: "Temiz", passed: "Do\u011Fru", pass: "Do\u011Fru", correct: "Do\u011Fru", wrong: "Yanl\u0131\u015F", timeout: "Cevaps\u0131z", unanswered: "Cevaps\u0131z", failed: "Ba\u015Far\u0131s\u0131z", pending: "Bekliyor", cancelled: "\u0130ptal", superseded: "Yenilendi", force: "Do\u011Frulama g\xF6nder", unlock: "Kilidi kald\u0131r", watch_action: "\u0130zlemeye al", settings: "Ayar de\u011Fi\u015Fikli\u011Fi", sword: "K\u0131l\u0131\xE7", shield: "Kalkan", potion: "\u0130ksir", bow: "Yay", ring: "Y\xFCz\xFCk" };
  const label = (value) => labels[value] ?? String(value ?? "\u2014");
  const defaults = { enabled: true, continuousMinutes: 120, scoreThreshold: 70, responseMinutes: 3, wrongLimit: 3, retentionDays: 7, minFarmMinutes: 20, cvThreshold: 0.08, radiusThreshold: 80, killsPerHourThreshold: 120, inputRateThreshold: 60 };
  const dateInput = (ms) => {
    const d = new Date(ms);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };
  const initialFilters = () => ({ search: "", locked: false, unanswered: false, minScore: "", from: dateInput(Date.now() - 7 * 864e5), to: dateInput(Date.now()), offset: 0 });
  const css = `
 .admin-page-afk_suspects{display:block!important}.afk32-admin{color:#e6e9e3;min-width:0;width:100%;font:14px/1.5 system-ui,sans-serif;--afk-border:#334a42;--afk-muted:#a8b8b0;--afk-gold:#e2c384}.afk32-admin *{box-sizing:border-box}.afk32-admin h2,.afk32-admin h3,.afk32-admin p{margin:0}.afk32-admin h2{font-size:26px;letter-spacing:.01em;color:#f7f0da}.afk32-admin h3{font-size:17px;color:#f0e5c9}.afk32-admin button,.afk32-admin input,.afk32-admin select{font:inherit}.afk32-admin button{min-height:42px;padding:8px 14px;border:1px solid #4e675d;border-radius:8px;background:#213c32;color:#edf2e8;cursor:pointer;white-space:normal}.afk32-admin button:hover:not(:disabled){background:#2b5041;border-color:#83a78b}.afk32-admin button:focus-visible,.afk32-admin input:focus-visible,.afk32-admin select:focus-visible{outline:2px solid #e2c384;outline-offset:3px}.afk32-admin button:disabled{opacity:.5;cursor:wait}.afk32-admin input,.afk32-admin select{width:100%;min-width:0;border:1px solid #4b5e54;border-radius:6px;padding:9px 10px;min-height:42px;color:#f2f1e8;background:#111f1b;color-scheme:dark}.afk32-admin input[type=checkbox]{width:18px;min-height:18px;accent-color:#c9ad77}.afk32-admin label{display:grid;gap:5px;color:#c6d1ca;font-size:12px}.afk32-admin .afk32-check{display:flex;gap:8px;align-items:center;font-size:13px;min-height:42px}.afk32-online-form{display:flex;gap:12px;align-items:end;margin-bottom:14px}.afk32-online-form label{flex:1;min-width:0}.afk32-online .afk32-scroll{max-height:260px}.afk32-head{display:flex;gap:18px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-bottom:20px}.afk32-eyebrow{display:block;color:var(--afk-gold);font-size:11px;font-weight:700;letter-spacing:.18em;margin-bottom:5px}.afk32-muted,.afk32-admin small{color:var(--afk-muted)}.afk32-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.afk32-card{border:1px solid var(--afk-border);border-radius:12px;padding:18px;background:linear-gradient(125deg,#182d25,#14211e);margin-bottom:16px;min-width:0}.afk32-card-header{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:14px}.afk32-filters{display:grid;grid-template-columns:minmax(160px,2fr) repeat(3,minmax(100px,1fr));gap:12px}.afk32-filter-foot{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;margin-top:12px}.afk32-table-wrap{overflow:auto;max-width:100%;border:1px solid var(--afk-border);border-radius:8px;overscroll-behavior-x:contain}.afk32-admin table{width:100%;border-collapse:collapse;font-size:12px;text-align:left;white-space:nowrap}.afk32-admin th{color:#b9c9bf;font-size:11px;font-weight:600;letter-spacing:.025em;padding:11px 12px;background:#162a22;border-bottom:1px solid #46584e}.afk32-admin td{padding:12px;border-bottom:1px solid #2d4037;color:#dce4dd;vertical-align:top}.afk32-admin tbody tr:last-child td{border-bottom:0}.afk32-admin tbody tr:hover{background:#25392e}.afk32-admin td small{display:block}.afk32-admin .afk32-player{border:0;padding:0;min-height:0;background:transparent;color:#f2d59a;font-weight:650;text-align:left}.afk32-tag{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border:1px solid #617563;border-radius:20px;background:#203c2b;font-size:11px;white-space:nowrap}.afk32-tag.locked{background:#462c2b;color:#ffc8bc;border-color:#865549}.afk32-tag.watch{background:#403a26;color:#ecd39b;border-color:#796c3e}.afk32-score{font-size:18px;font-weight:700;color:#ead09a;font-variant-numeric:tabular-nums}.afk32-score.high{color:#f5a88e}.afk32-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.afk32-kpi{padding:14px 16px;border:1px solid var(--afk-border);border-radius:10px;background:#182c24;min-width:0}.afk32-kpi strong{display:block;font-size:23px;color:#f1e3bf;overflow-wrap:anywhere}.afk32-kpi span{display:block;font-size:11px;color:#b5c5ba;margin-bottom:4px}.afk32-empty{text-align:center;padding:30px!important;color:var(--afk-muted)!important;white-space:normal!important}.afk32-message{padding:12px 15px;border:1px solid #728263;border-radius:8px;background:#283c28;margin-bottom:16px;overflow-wrap:anywhere}.afk32-message.error{border-color:#986857;background:#412e28;color:#f4cabc}.afk32-settings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0}.afk32-admin details>summary{cursor:pointer;font-size:14px;font-weight:650;color:#e2d3ac;min-height:32px}.afk32-detail-title{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.afk32-reasons{padding-left:20px;margin:10px 0 0;color:#cfd8ce}.afk32-chart{width:100%;height:150px;display:block;overflow:visible}.afk32-chart-labels{display:flex;justify-content:space-between;color:var(--afk-muted);font-size:11px;margin:3px 0 14px}.afk32-split{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.afk32-split>.afk32-card{margin-bottom:0}.afk32-scroll{max-height:380px}.afk32-admin .afk32-primary{color:#15251c;border-color:#d8bc80;background:#d8bc80;font-weight:700}.afk32-admin .afk32-primary:hover:not(:disabled){background:#ead5a4;color:#15251c}.afk32-pager{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:12px;font-size:12px}.afk32-detail-head{overflow-wrap:anywhere}.afk32-admin .afk32-link{color:#ebce8c}.afk32-footnote{font-size:12px;color:var(--afk-muted);margin-top:10px!important}.afk32-admin .afk32-small{font-size:11px}
 @media(max-width:900px){.afk32-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.afk32-split{grid-template-columns:1fr}.afk32-settings{grid-template-columns:repeat(2,minmax(0,1fr))}.afk32-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
 @media(max-width:480px){.afk32-card{padding:13px}.afk32-admin h2{font-size:22px}.afk32-filters,.afk32-settings{grid-template-columns:1fr}.afk32-head{gap:12px}.afk32-kpis{gap:8px}.afk32-kpi{padding:10px}.afk32-kpi strong{font-size:20px}.afk32-actions{width:100%}.afk32-actions button{flex:1 1 135px}.afk32-admin td,.afk32-admin th{padding:10px}.afk32-filter-foot{gap:10px}.afk32-card-header{align-items:flex-start}}
 `;
  function Table({ heads, rows, empty = "Bu aral\u0131kta kay\u0131t yok.", scroll = false }) {
    return h("div", { className: "afk32-table-wrap" + (scroll ? " afk32-scroll" : ""), tabIndex: 0, role: "region", "aria-label": heads.join(", ") }, h("table", null, h("thead", null, h("tr", null, ...heads.map((title) => h("th", { key: title, scope: "col" }, title)))), h("tbody", null, rows.length ? rows.map((cells, i) => h("tr", { key: i }, ...cells.map((cell, j) => h("td", { key: j }, cell)))) : h("tr", null, h("td", { className: "afk32-empty", colSpan: heads.length }, empty)))));
  }
  const badge = (value) => h("span", { className: "afk32-tag " + value }, label(value));
  function Chart({ rows }) {
    if (!rows.length) return h("p", { className: "afk32-muted" }, "Grafik i\xE7in kasma \xF6zeti bekleniyor.");
    const ordered = [...rows].sort((a, b) => a.at - b.at), first = ordered[0].at, last = ordered.at(-1).at, points = ordered.map((row, index) => ((last > first ? (row.at - first) / (last - first) : index / Math.max(1, ordered.length - 1)) * 960 + 20).toFixed(1) + "," + (130 - Math.min(100, Math.max(0, row.score || 0)) * 1.1).toFixed(1)).join(" ");
    return h(React.Fragment, null, h("svg", { className: "afk32-chart", viewBox: "0 0 1000 150", preserveAspectRatio: "none", role: "img", "aria-label": "Son yedi g\xFCndeki \u015F\xFCphe puan\u0131, 0 ile 100 aras\u0131nda" }, ...[20, 75, 130].map((y, i) => h("g", { key: y }, h("line", { x1: 20, x2: 980, y1: y, y2: y, stroke: "#3b5046", strokeDasharray: "4 6" }), h("text", { x: 0, y: y + 4, fill: "#a9bbb0", fontSize: 10 }, 100 - i * 50))), h("polyline", { points, fill: "none", stroke: "#dbc180", strokeWidth: 2, vectorEffect: "non-scaling-stroke" })), h("div", { className: "afk32-chart-labels" }, h("span", null, date(first)), h("span", null, "\u015E\xFCphe puan\u0131 \xB7 0\u2013100"), h("span", null, date(last))));
  }
  return function AfkAdmin() {
    const [filters, setFilters] = React.useState(initialFilters), [applied, setApplied] = React.useState(initialFilters), [data, setData] = React.useState(null), [detail, setDetail] = React.useState(null), [selected, setSelected] = React.useState(""), [settings, setSettings] = React.useState(defaults), [busy, setBusy] = React.useState(false), [loading, setLoading] = React.useState(true), [error, setError] = React.useState(""), [message, setMessage] = React.useState(""), [revision, setRevision] = React.useState(0), [updated, setUpdated] = React.useState(0), [dirty, setDirty] = React.useState(false), [onlineSearch, setOnlineSearch] = React.useState(""), [onlineQuery, setOnlineQuery] = React.useState({ search: "", offset: 0 }), [online, setOnline] = React.useState(null), [onlineLoading, setOnlineLoading] = React.useState(true), [onlineError, setOnlineError] = React.useState("");
    const alive = React.useRef(true), locked = React.useRef(false), dirtyRef = React.useRef(false), requests = React.useRef(/* @__PURE__ */ new Set()), generation = React.useRef(0);
    React.useEffect(() => {
      alive.current = true;
      return () => {
        alive.current = false;
        for (const controller of requests.current) controller.abort();
      };
    }, []);
    const api = async (query, body) => {
      const controller = new AbortController();
      requests.current.add(controller);
      const timer = setTimeout(() => controller.abort(), 15e3);
      try {
        const params = new URLSearchParams({ core511: "afk", ...query });
        const response = await fetch("/api/admin?" + params, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal: controller.signal, ...body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {} });
        let value;
        try {
          value = await response.json();
        } catch {
          throw Error("Sunucudan okunabilir bir yan\u0131t al\u0131namad\u0131.");
        }
        if (!response.ok || value?.ok === false) throw Object.assign(Error(value?.error ?? value?.message ?? "\u0130\u015Flem tamamlanamad\u0131."), { status: response.status });
        return value;
      } finally {
        clearTimeout(timer);
        requests.current.delete(controller);
      }
    };
    React.useEffect(() => {
      let current = true;
      const run = async () => {
        setOnlineLoading(true);
        try {
          const result = await api({ action: "online", search: onlineQuery.search, offset: String(onlineQuery.offset), limit: "100" });
          if (current && alive.current) {
            setOnline(result);
            setOnlineError("");
          }
        } catch (e) {
          if (current && alive.current) setOnlineError(e.name === "AbortError" ? "\xC7evrimi\xE7i oyuncu aramas\u0131 zaman a\u015F\u0131m\u0131na u\u011Frad\u0131." : e.message);
        } finally {
          if (current && alive.current) setOnlineLoading(false);
        }
      };
      void run();
      const timer = setInterval(() => {
        if (!locked.current) void run();
      }, 3e4);
      return () => {
        current = false;
        clearInterval(timer);
      };
    }, [onlineQuery, revision]);
    React.useEffect(() => {
      let current = true;
      const token = ++generation.current;
      const run = async () => {
        setLoading(true);
        try {
          const query = { action: "list", search: applied.search, locked: applied.locked ? "1" : "0", unanswered: applied.unanswered ? "1" : "0", minScore: applied.minScore, limit: "100", offset: String(applied.offset || 0) };
          if (applied.from) query.from = String((/* @__PURE__ */ new Date(applied.from + "T00:00:00")).getTime());
          if (applied.to) query.to = String((/* @__PURE__ */ new Date(applied.to + "T23:59:59.999")).getTime());
          const [list, player2] = await Promise.all([api(query), selected ? api({ action: "detail", playerId: selected }) : null]);
          if (!current || !alive.current || token !== generation.current) return;
          setData(list);
          setDetail(player2);
          if (list.settings && !dirtyRef.current) setSettings({ ...defaults, ...list.settings });
          setError("");
          setUpdated(Date.now());
        } catch (e) {
          if (current && alive.current && token === generation.current) setError(e.name === "AbortError" ? "\u0130stek zaman a\u015F\u0131m\u0131na u\u011Frad\u0131. Yenile d\xFC\u011Fmesiyle tekrar dene." : e.message);
        } finally {
          if (current && alive.current && token === generation.current) setLoading(false);
        }
      };
      void run();
      const interval = setInterval(() => {
        if (!locked.current) void run();
      }, 3e4);
      return () => {
        current = false;
        clearInterval(interval);
      };
    }, [applied, selected, revision]);
    const mutate = async (action, extra = {}) => {
      if (locked.current) return;
      locked.current = true;
      setBusy(true);
      setMessage("");
      setError("");
      try {
        const result = await api({}, { action, ...selected ? { playerId: selected } : {}, ...extra });
        if (!alive.current) return;
        if (action === "settings") {
          dirtyRef.current = false;
          setDirty(false);
          if (result.settings) setSettings({ ...defaults, ...result.settings });
        }
        setMessage(result.message ?? { force: "Do\u011Frulama iste\u011Fi kaydedildi. Uygun alana d\xF6n\xFCnce oyuncuya g\xF6sterilir.", unlock: "Do\u011Frulama kilidi kald\u0131r\u0131ld\u0131.", clean: "Oyuncu temiz olarak i\u015Faretlendi; \u015F\xFCphe puan\u0131 s\u0131f\u0131rland\u0131.", watch: "Oyuncu izleme listesine al\u0131nd\u0131.", settings: "Ayarlar kaydedildi; a\xE7\u0131k kanallara uygulan\u0131yor." }[action]);
        setRevision((n) => n + 1);
      } catch (e) {
        if (alive.current) setError(e.name === "AbortError" ? "Yan\u0131t al\u0131namad\u0131. Kay\u0131tlar\u0131 yenileyerek i\u015Flemin sonucunu kontrol et." : e.message);
      } finally {
        locked.current = false;
        if (alive.current) setBusy(false);
      }
    };
    const editSetting = (key, value) => {
      dirtyRef.current = true;
      setDirty(true);
      setSettings((old) => ({ ...old, [key]: value }));
    };
    const field = (key, title, min, max, step = 1) => h("label", { key }, title, h("input", { type: "number", inputMode: step < 1 ? "decimal" : "numeric", min, max, step, value: settings[key] ?? "", disabled: busy, onChange: (event) => editSetting(key, event.target.value === "" ? "" : Number(event.target.value)) }));
    const player = detail?.player, players = data?.players ?? [], timeline = detail?.timeline ?? [], counts = { locked: players.filter((row) => row.status === "locked").length, watch: players.filter((row) => row.status === "watch").length, unanswered: players.reduce((sum, row) => sum + (Number(row.unanswered) || 0), 0) };
    const kpi = (title, value) => h("div", { className: "afk32-kpi", key: title }, h("span", null, title), h("strong", null, value));
    return h(
      "section",
      { className: "afk32-admin", "aria-label": "\u015E\xFCpheliler y\xF6netimi" },
      h("style", null, css),
      h("header", { className: "afk32-head" }, h("div", null, h("span", { className: "afk32-eyebrow" }, "OYUNCU DO\u011ERULAMA"), h("h2", null, selected ? "Oyuncu incelemesi" : "\u015E\xFCpheliler"), h("p", { className: "afk32-muted" }, selected ? "Kasma davran\u0131\u015F\u0131, do\u011Frulamalar ve y\xF6netici i\u015Flemleri." : "Son 7 g\xFCn \xB7 \u015E\xFCphe puan\u0131na g\xF6re s\u0131ral\u0131 \xB7 Otomatik yenileme 30 sn")), h("div", { className: "afk32-actions" }, selected && h("button", { type: "button", onClick: () => setSelected(""), disabled: busy }, "\u2190 Listeye d\xF6n"), h("button", { type: "button", disabled: loading || busy, onClick: () => setRevision((n) => n + 1) }, loading ? "Y\xFCkleniyor\u2026" : "Yenile"))),
      h("section", { className: "afk32-card afk32-online", "aria-label": "\xC7evrimi\xE7i oyuncu arama" }, h("div", { className: "afk32-card-header" }, h("div", null, h("h3", null, "\xC7evrimi\xE7i oyuncu ara"), h("p", { className: "afk32-muted" }, "\u015E\xFCpheliler listesinde bulunmayan oyuncular da aran\u0131r."))), h("form", { className: "afk32-online-form", onSubmit: (event) => {
        event.preventDefault();
        setOnlineQuery({ search: onlineSearch, offset: 0 });
      } }, h("label", null, "\xC7evrimi\xE7i oyuncu ad\u0131", h("input", { type: "search", value: onlineSearch, maxLength: 100, placeholder: "Oyuncu ad\u0131n\u0131 yaz\u2026", onChange: (event) => setOnlineSearch(event.target.value) })), h("button", { type: "submit", className: "afk32-primary", disabled: onlineLoading }, onlineLoading ? "Aran\u0131yor\u2026" : "Oyuncu ara")), onlineError && h("p", { role: "alert", className: "afk32-message error" }, onlineError), h(Table, { scroll: true, heads: ["\xC7evrimi\xE7i oyuncu / hesap", "Durum", "Kanal / harita", "\u0130\u015Flemler"], empty: onlineLoading ? "\xC7evrimi\xE7i oyuncular y\xFCkleniyor\u2026" : "Aramaya uygun \xE7evrimi\xE7i oyuncu yok.", rows: (online?.players ?? []).map((row) => [h(React.Fragment, null, h("button", { type: "button", className: "afk32-player", onClick: () => {
        setSelected(row.playerId);
        setDetail(null);
      } }, row.playerName), h("small", null, row.accountName ?? row.accountId)), row.exempt ? h("span", { className: "afk32-tag" }, "Do\u011Frulamadan muaf") : badge(row.status ?? (row.locked ? "locked" : row.pending ? "watch" : "clean")), h(React.Fragment, null, "Kanal " + (row.channel ?? "\u2014"), h("small", null, row.map ?? "\u2014")), h("div", { className: "afk32-actions" }, h("button", { type: "button", disabled: busy || !!row.exempt, onClick: () => void mutate("force", { playerId: row.playerId }) }, "\u015Eimdi do\u011Frulama g\xF6nder"), h("button", { type: "button", disabled: busy, onClick: () => void mutate("watch", { playerId: row.playerId }) }, "\u0130zlemeye al"))]) }), (onlineQuery.offset > 0 || online?.players?.length === 100) && h("div", { className: "afk32-pager" }, h("small", null, "\xC7evrimi\xE7i arama sonu\xE7lar\u0131"), h("div", { className: "afk32-actions" }, h("button", { type: "button", disabled: onlineLoading || !onlineQuery.offset, onClick: () => setOnlineQuery((old) => ({ ...old, offset: Math.max(0, old.offset - 100) })) }, "\xD6nceki oyuncular"), h("button", { type: "button", disabled: onlineLoading || online?.hasMore === false || online?.players?.length < 100, onClick: () => setOnlineQuery((old) => ({ ...old, offset: old.offset + 100 })) }, "Sonraki oyuncular")))),
      error && h("p", { role: "alert", className: "afk32-message error" }, error),
      message && h("p", { role: "status", className: "afk32-message" }, message),
      selected ? player ? h(
        React.Fragment,
        null,
        h("div", { className: "afk32-card" }, h("div", { className: "afk32-card-header" }, h("div", { className: "afk32-detail-head" }, h("div", { className: "afk32-detail-title" }, h("h3", null, player.playerName), badge(player.status)), h("p", { className: "afk32-muted" }, "Hesap: " + (player.accountName ?? player.accountId) + " \xB7 Kanal " + (player.channel ?? "\u2014") + " \xB7 " + (player.map ?? "\u2014"))), h("div", { className: "afk32-actions" }, h("button", { type: "button", disabled: busy, onClick: () => void mutate("force") }, "\u015Eimdi do\u011Frulama g\xF6nder"), h("button", { type: "button", disabled: busy || player.status !== "locked", onClick: () => void mutate("unlock") }, "Kilidi kald\u0131r"), h("button", { type: "button", disabled: busy, onClick: () => void mutate("clean") }, "Temiz olarak i\u015Faretle"), h("button", { type: "button", disabled: busy, onClick: () => void mutate("watch") }, "\u0130zlemeye al"))), h("div", { className: "afk32-kpis" }, kpi("\u015E\xFCphe puan\u0131", number(player.score) + " / 100"), kpi("Kesintisiz kasma", duration(player.continuousMs)), kpi("G\xF6nderilen / ge\xE7en", number(player.sent) + " / " + number(player.passed)), kpi("Ortalama cevap", seconds(player.meanAnswerMs))), h("h3", null, "Puan\u0131n nedenleri"), h("ul", { className: "afk32-reasons" }, ...(player.reasons?.length ? player.reasons : ["Hen\xFCz yeterli kasma verisi yok."]).map((reason, i) => h("li", { key: i }, typeof reason === "string" ? reason : reason.message ?? reason.text ?? String(reason.reason ?? ""))))),
        h("section", { className: "afk32-card" }, h("div", { className: "afk32-card-header" }, h("h3", null, "Kasma zaman \xE7izelgesi"), h("small", null, "5 dakikal\u0131k \xF6zetler \xB7 Son 7 g\xFCn")), h(Chart, { rows: timeline }), h(Table, { scroll: true, heads: ["Zaman", "Harita / kanal", "\xD6ld\xFCrme", "Kazan\u0131lan XP", "Girdi", "CV", "Yar\u0131\xE7ap", "Puan"], rows: [...timeline].reverse().map((row) => [date(row.at), h(React.Fragment, null, row.map ?? "\u2014", h("small", null, "Kanal " + (row.channel ?? "\u2014"))), number(row.kills), number(row.xp), number(row.inputs), fixed(row.cv, 3), fixed(row.radius, 0) + " px", number(row.score)]) })),
        h("div", { className: "afk32-split" }, h("section", { className: "afk32-card" }, h("div", { className: "afk32-card-header" }, h("h3", null, "Do\u011Frulama ge\xE7mi\u015Fi")), h(Table, { scroll: true, heads: ["Soru zaman\u0131", "Hedef", "Sonu\xE7", "Cevap s\xFCresi"], rows: (detail.challenges ?? []).map((row) => [date(row.at), label(row.target), label(row.result), seconds(row.answerMs)]) })), h("section", { className: "afk32-card" }, h("div", { className: "afk32-card-header" }, h("h3", null, "Oturum ge\xE7mi\u015Fi")), h(Table, { scroll: true, heads: ["Giri\u015F", "\xC7\u0131k\u0131\u015F", "S\xFCre", "Kanal"], rows: (detail.sessions ?? []).map((row) => [date(row.startedAt), row.endedAt ? date(row.endedAt) : "Devam ediyor", duration(row.durationMs), number(row.channel)]) }))),
        h("section", { className: "afk32-card", style: { marginTop: 16 } }, h("div", { className: "afk32-card-header" }, h("h3", null, "Y\xF6netici i\u015Flem kayd\u0131")), h(Table, { scroll: true, heads: ["Zaman", "Y\xF6netici", "\u0130\u015Flem", "A\xE7\u0131klama"], rows: (detail.adminLog ?? []).map((row) => [date(row.at), row.adminName ?? row.adminId, label(row.action === "watch" ? "watch_action" : row.action), typeof row.detail === "string" ? row.detail : JSON.stringify(row.detail ?? {})]) }))
      ) : h("div", { className: "afk32-card afk32-empty" }, loading ? "Oyuncu kay\u0131tlar\u0131 y\xFCkleniyor\u2026" : "Oyuncu kay\u0131tlar\u0131na ula\u015F\u0131lamad\u0131.") : h(
        React.Fragment,
        null,
        h("div", { className: "afk32-kpis" }, kpi("Bu sayfadaki oyuncu", number(players.length)), kpi("Do\u011Frulama kilidi", number(counts.locked)), kpi("\u0130zlemede", number(counts.watch)), kpi("Cevaps\u0131z sorular", number(counts.unanswered))),
        h("form", { className: "afk32-card", onSubmit: (event) => {
          event.preventDefault();
          setSelected("");
          setApplied({ ...filters, offset: 0 });
        } }, h("div", { className: "afk32-filters" }, h("label", null, "Oyuncu veya hesap ara", h("input", { type: "search", value: filters.search, maxLength: 100, placeholder: "Oyuncu ad\u0131 / hesap", onChange: (event) => setFilters((old) => ({ ...old, search: event.target.value })) })), h("label", null, "\u015E\xFCphe puan\u0131 >", h("input", { type: "number", min: 0, max: 100, step: 1, value: filters.minScore, placeholder: "T\xFCm\xFC", onChange: (event) => setFilters((old) => ({ ...old, minScore: event.target.value })) })), h("label", null, "Ba\u015Flang\u0131\xE7", h("input", { type: "date", value: filters.from, max: filters.to || void 0, onChange: (event) => setFilters((old) => ({ ...old, from: event.target.value })) })), h("label", null, "Biti\u015F", h("input", { type: "date", value: filters.to, min: filters.from || void 0, onChange: (event) => setFilters((old) => ({ ...old, to: event.target.value })) }))), h("div", { className: "afk32-filter-foot" }, h("div", { className: "afk32-actions" }, h("label", { className: "afk32-check" }, h("input", { type: "checkbox", checked: filters.locked, onChange: (event) => setFilters((old) => ({ ...old, locked: event.target.checked })) }), "Sadece kilitliler"), h("label", { className: "afk32-check" }, h("input", { type: "checkbox", checked: filters.unanswered, onChange: (event) => setFilters((old) => ({ ...old, unanswered: event.target.checked })) }), "Sadece cevaps\u0131zlar")), h("button", { type: "submit", className: "afk32-primary", disabled: loading }, "Filtrele"))),
        h("section", { className: "afk32-card" }, h("div", { className: "afk32-card-header" }, h("h3", null, "\u0130ncelenecek oyuncular"), h("small", null, updated ? "Son yenileme: " + date(updated) : "Kay\u0131tlar y\xFCkleniyor")), h(Table, { heads: ["Oyuncu / hesap", "Durum", "Puan", "Kanal / harita", "Kesintisiz", "G\xF6nderilen / do\u011Fru / cevaps\u0131z / yanl\u0131\u015F", "Son soru / sonu\xE7", "Ort. cevap"], empty: loading ? "Kay\u0131tlar y\xFCkleniyor\u2026" : "Bu filtrelerde oyuncu bulunamad\u0131. \xC7evrimi\xE7i bir oyuncuyu incelemek i\xE7in \xFCstteki aramay\u0131 kullan.", rows: players.map((row) => [h(React.Fragment, null, h("button", { type: "button", className: "afk32-player", onClick: () => {
          setSelected(row.playerId);
          setDetail(null);
        } }, row.playerName), h("small", null, row.accountName ?? row.accountId)), badge(row.status), h("strong", { className: "afk32-score" + (row.score >= settings.scoreThreshold ? " high" : "") }, number(row.score)), h(React.Fragment, null, "Kanal " + (row.channel ?? "\u2014"), h("small", null, row.map ?? "\u2014")), duration(row.continuousMs), [row.sent, row.passed, row.unanswered, row.wrong].map(number).join(" / "), h(React.Fragment, null, date(row.lastQuestionAt), h("small", null, label(row.lastResult))), seconds(row.meanAnswerMs)]) }), h("div", { className: "afk32-pager" }, h("span", null, "Puan tek ba\u015F\u0131na karar de\u011Fildir; do\u011Frulama ge\xE7mi\u015Fiyle birlikte de\u011Ferlendir."), h("div", { className: "afk32-actions" }, h("button", { type: "button", disabled: loading || !applied.offset, onClick: () => setApplied((old) => ({ ...old, offset: Math.max(0, (old.offset || 0) - 100) })) }, "\xD6nceki"), h("button", { type: "button", disabled: loading || (data?.hasMore === false || players.length < 100), onClick: () => setApplied((old) => ({ ...old, offset: (old.offset || 0) + 100 })) }, "Sonraki")))),
        h("section", { className: "afk32-card" }, h("details", null, h("summary", null, "Do\u011Frulama ayarlar\u0131"), h("form", { onSubmit: (event) => {
          event.preventDefault();
          void mutate("settings", { settings: Object.fromEntries(Object.keys(defaults).map((key) => [key, settings[key]])) });
        } }, h("label", { className: "afk32-check" }, h("input", { type: "checkbox", checked: !!settings.enabled, disabled: busy, onChange: (event) => editSetting("enabled", event.target.checked) }), "Sistem a\xE7\u0131k"), (data?.envDisabled || data?.disabled) && h("p", { className: "afk32-message" }, "Sunucu ana anahtar\u0131 kapal\u0131. Panel ayar\u0131 kaydedilir; sunucu anahtar\u0131 a\xE7\u0131lana kadar do\u011Frulama \xE7al\u0131\u015Fmaz."), h("div", { className: "afk32-settings" }, field("continuousMinutes", "Kesintisiz s\xFCre e\u015Fi\u011Fi (dk)", 1, 10080), field("scoreThreshold", "\u015E\xFCphe puan\u0131 e\u015Fi\u011Fi", 1, 100), field("responseMinutes", "Cevap s\xFCresi (dk)", 0.05, 30, 0.05), field("wrongLimit", "Yanl\u0131\u015F deneme s\u0131n\u0131r\u0131", 1, 10), field("retentionDays", "Kay\u0131t saklama s\xFCresi (g\xFCn)", 1, 90)), h("details", null, h("summary", null, "Puan \xF6l\xE7\xFCm e\u015Fikleri"), h("div", { className: "afk32-settings" }, field("minFarmMinutes", "Puan kontrol\xFC \xF6ncesi kasma (dk)", 1, 10080), field("cvThreshold", "D\xFCzenli girdi CV e\u015Fi\u011Fi", 1e-3, 1, 1e-3), field("radiusThreshold", "Dar alan yar\u0131\xE7ap\u0131 (px)", 1, 1e4), field("killsPerHourThreshold", "Saatlik \xF6ld\xFCrme e\u015Fi\u011Fi", 1, 1e5), field("inputRateThreshold", "Dakikal\u0131k girdi e\u015Fi\u011Fi", 1, 1e5))), h("div", { className: "afk32-actions" }, h("button", { type: "submit", className: "afk32-primary", disabled: busy || !dirty }, busy ? "Kaydediliyor\u2026" : "Ayarlar\u0131 kaydet"), dirty && h("small", null, "Kaydedilmemi\u015F de\u011Fi\u015Fiklikler var.")), h("p", { className: "afk32-footnote" }, "Ayarlar yeniden ba\u015Flatma gerektirmeden uygulan\u0131r. Kilitler ve y\xF6netici denetim kay\u0131tlar\u0131 saklama temizli\u011Finde silinmez."))))
      )
    );
  };
}
export {
  createAfkAdmin
};
