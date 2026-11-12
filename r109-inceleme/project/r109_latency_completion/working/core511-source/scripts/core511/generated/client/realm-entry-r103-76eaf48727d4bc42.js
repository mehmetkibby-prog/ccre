// r103_release/working/core511-source/scripts/core511/realm-request-r103.mjs
async function requestRealmR103(fetcher, url, { signal, body, csrf, timeoutMs = 1e4 } = {}) {
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason);
  let timer;
  try {
    if (signal?.aborted) cancel();
    else signal?.addEventListener("abort", cancel, { once: true });
    if (controller.signal.aborted) throw Object.assign(new Error("Cancelled"), { name: "AbortError" });
    timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetcher(url, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
      ...body ? { method: "POST", headers: { "content-type": "application/json", "x-csrf-token": csrf }, body: JSON.stringify(body) } : {}
    });
    const data = await response.json();
    if (!response.ok) throw Object.assign(Error(data?.error || "Ba\u011Flant\u0131 kurulamad\u0131. Yeniden dene."), { status: response.status });
    return data;
  } catch (error) {
    if (controller.signal.aborted || error?.name === "AbortError" || error?.name === "TimeoutError") {
      throw Error("Ba\u011Flant\u0131 zaman a\u015F\u0131m\u0131na u\u011Frad\u0131. Yeniden dene.");
    }
    if (error?.name === "SyntaxError") throw Error("Sunucu yan\u0131t\u0131 okunamad\u0131. Yeniden dene.");
    if (error instanceof TypeError) throw Error("Ba\u011Flant\u0131 kurulamad\u0131. Yeniden dene.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

// r103_release/working/core511-source/scripts/core511/realm-entry-ui-r101.jsx
var ROLE = { muhafiz: "Muhaf\u0131z", avci: "Avc\u0131", arkanist: "Arkanist" };
var css = `
.col101{--gold:#dfc587;--muted:#aaa997;--line:#d7b97536;--green:#93d5b5;box-sizing:border-box;min-height:100svh;color:#f4efdf;background:#080e0c;font:15px/1.5 system-ui,sans-serif;isolation:isolate;position:fixed;inset:0;height:100vh;height:100dvh;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;z-index:50}
.col101 *{box-sizing:border-box;touch-action:pan-y}.col101 button{min-height:44px}.col101-body{padding-bottom:max(30px,env(safe-area-inset-bottom))!important}.col101 button,.col101 a{-webkit-tap-highlight-color:transparent}.col101 button{font:inherit;cursor:pointer}.col101 button:disabled{cursor:wait;opacity:.6}.col101 a{color:inherit}.col101 :focus-visible{outline:2px solid var(--gold);outline-offset:5px}
.col101-bg{position:absolute;inset:0;z-index:-2;background:linear-gradient(90deg,#060c0bf2 0%,#060c0bba 42%,#060c0b55),linear-gradient(0deg,#080e0c 0%,transparent 90%),var(--scene) center/cover no-repeat;opacity:.85;pointer-events:none}
.col101-top{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:27px clamp(20px,5vw,80px);border-bottom:1px solid #e2d29d1d;background:#050b0955}.col101-logo{font:bold 23px Georgia,serif;letter-spacing:2.4px;color:var(--gold);text-decoration:none;white-space:nowrap}.col101-top small{color:var(--muted);display:block;font:10px/1.8 system-ui;letter-spacing:3px;text-transform:uppercase}.col101-user{display:flex;align-items:center;gap:22px}.col101-user span{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.col101-quiet{background:transparent;border:0;color:#c7cbbb;padding:9px 0;text-decoration:none;font-size:13px}.col101-quiet:hover{color:var(--gold)}
.col101-body{max-width:1210px;padding:45px 38px 30px;margin:auto}.col101-steps{display:flex;gap:26px;align-items:center;color:#7f9187;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;margin:0 0 36px;padding:0;list-style:none}.col101-steps li{display:flex;align-items:center;gap:9px}.col101-steps b{display:grid;place-items:center;width:23px;height:23px;border:1px solid #61716570;border-radius:50%;font-size:11px;font-weight:500}.col101-steps .active{color:var(--gold)}.col101-steps .active b{border-color:var(--gold);background:#d8be7e10}
.col101-eyebrow{color:var(--gold);font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 11px}.col101 h1{font:normal clamp(34px,4.1vw,56px)/1.12 Georgia,serif;letter-spacing:-1px;margin:0 0 15px}.col101-intro{color:#b6bdb1;margin:0 0 29px;max-width:620px;font-size:14px}.col101-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}.col101-card{appearance:none;text-align:left;display:flex;flex-direction:column;position:relative;min-height:315px;overflow:hidden;border:1px solid #72877855;border-radius:12px;background:#13231ae6;color:#fff;padding:25px;transition:border-color .18s,transform .18s,box-shadow .18s}.col101-card:before{content:'';position:absolute;inset:0;background:linear-gradient(0deg,#08140dfc 1%,#08140d78 70%,#08140d52),var(--art) center/cover;z-index:0;transition:transform .5s}.col101-card>*{position:relative;z-index:1}.col101-card:hover{border-color:#c9ba85;transform:translateY(-3px)}.col101-card:hover:before{transform:scale(1.025)}.col101-card[aria-pressed=true]{border-color:var(--gold);box-shadow:0 0 0 1px #dfc58755,inset 0 0 70px #dfc5870c}.col101-card-top{display:flex;justify-content:space-between;align-items:center}.col101-mark{color:#ead8a4;font:26px Georgia,serif;line-height:1}.col101-load{display:inline-flex;align-items:center;gap:7px;font-size:12px;letter-spacing:.3px;background:#08130dde;border:1px solid #90caab55;border-radius:30px;padding:5px 12px;color:#b9e6cf}.col101-load:before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}.col101-load.busy{color:#ead295;border-color:#e8c98166}.col101-load.closed{color:#bdbdb9;border-color:#8a999466}.col101-card-content{margin-top:auto;padding-top:70px}.col101-card h2{font:normal 31px Georgia,serif;margin:6px 0 10px}.col101-card p{color:#c4cbbd;font-size:13px;max-width:330px;margin:0}.col101-card-tag{text-transform:uppercase;letter-spacing:2.2px;font-size:10px;color:#d8c591}.col101-check{position:absolute;bottom:26px;right:24px;border-radius:50%;border:1px solid #d7c18b88;width:24px;height:24px;display:grid;place-items:center;color:var(--gold);font-size:12px}
.col101-actions{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:25px;padding:19px 0;border-bottom:1px solid var(--line)}.col101-actions p{color:#b3bdaf;font-size:13px;margin:0}.col101-actions p strong{color:#e5d7b4;font-weight:500;display:block;font-size:14px}.col101-primary{border:1px solid #d6b368;background:linear-gradient(120deg,#eddbac,#bd9953);color:#18241b;border-radius:7px;min-height:48px;padding:12px 28px;min-width:210px;font-weight:700!important;box-shadow:0 4px 30px #d8bf7130;transition:filter .2s}.col101-primary:hover{filter:brightness(1.12)}.col101-footer{display:flex;align-items:center;justify-content:space-between;gap:20px;color:#758a7c;padding:19px 0;font-size:11px;letter-spacing:.3px}.col101-error{background:#321f1d;color:#f3cbc0;border:1px solid #7e4b40;padding:12px 15px;border-radius:8px;margin:16px 0;font-size:13px}.col101-error button{background:transparent;border:0;text-decoration:underline;color:inherit;margin-left:15px}.col101-loading{padding:50px 0;color:#d6c494}.col101-character-layout{display:grid;grid-template-columns:390px 1fr;gap:50px;align-items:center;min-height:380px}.col101-roster{display:grid;gap:10px}.col101-person{display:flex;align-items:center;gap:17px;padding:15px 18px;border:1px solid #80917a55;background:#14251bd9;border-radius:8px;color:#dfe7da;text-align:left}.col101-person[aria-pressed=true]{border-color:var(--gold);background:linear-gradient(90deg,#a48a4333,#14251bf0)}.col101-person img{width:45px;height:61px;object-fit:cover;object-position:top}.col101-person strong{display:block;font:20px Georgia,serif;margin-bottom:3px}.col101-person small{color:#aabca8}.col101-person i{margin-left:auto;color:var(--gold);font-style:normal}.col101-portrait{height:380px;position:relative;display:grid;place-items:center}.col101-portrait:before{content:'';position:absolute;bottom:15px;width:80%;height:60px;border:1px solid #b9984b66;border-radius:50%;box-shadow:0 0 60px #79c5a636,inset 0 0 30px #7bd3a91c;transform:perspective(200px) rotateX(30deg)}.col101-portrait img{height:100%;width:100%;min-height:0;min-width:0;max-height:100%;max-width:100%;pointer-events:none;object-fit:contain;position:relative;filter:drop-shadow(0 0 27px #90d2ae22);animation:col101-arrive .45s ease-out}.col101-empty{padding:27px;border:1px solid var(--line);border-radius:12px;background:#101f18de}.col101-empty h2{font:26px Georgia,serif}.col101-empty p{color:#aebcaa;font-size:14px}.col101-empty .col101-mark{font-size:40px}.col101-portal-in{animation:col101-arrive .35s ease-out}@keyframes col101-arrive{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media(max-width:760px){.col101-top{padding:17px 20px}.col101-logo{font-size:18px;letter-spacing:1.3px}.col101-user{gap:15px;font-size:12px}.col101-user span{max-width:95px}.col101-body{padding:28px 20px 15px}.col101-steps{gap:16px;margin-bottom:28px;font-size:9px;letter-spacing:.8px}.col101-grid{gap:13px}.col101-card{min-height:260px;padding:18px}.col101-card h2{font-size:24px}.col101-card p{font-size:12px;max-width:90%}.col101-card-content{padding-top:35px}.col101-load{font-size:10px;padding:4px 8px}.col101-check{right:13px;bottom:16px}.col101-character-layout{grid-template-columns:1fr 1fr;gap:15px;min-height:260px}.col101-portrait{height:285px}.col101-person{padding:12px;gap:10px}.col101-person strong{font-size:17px}.col101-person small{font-size:11px}.col101-person img{width:34px;height:51px}}
@media(max-width:500px){.col101-user span{display:none}.col101-grid{grid-template-columns:1fr}.col101-card{min-height:202px}.col101-card-content{padding-top:23px}.col101-card h2{font-size:27px;margin:3px 0 6px}.col101-actions{align-items:stretch;flex-direction:column;gap:13px}.col101-primary{width:100%}.col101-footer{font-size:10px;gap:10px}.col101-character-layout{grid-template-columns:1fr;gap:15px}.col101-portrait{height:clamp(150px,28svh,230px);grid-row:1}.col101-roster{max-height:none;overflow:visible}.col101 h1{font-size:35px}.col101-steps{margin-bottom:24px}}
@media(max-height:550px) and (min-width:600px){.col101-top{padding:12px 25px}.col101-body{padding-top:18px}.col101-steps{margin-bottom:16px}.col101 h1{font-size:34px}.col101-intro{margin-bottom:18px}.col101-card{min-height:200px}.col101-card-content{padding-top:20px}.col101-portrait{height:230px}.col101-character-layout{min-height:230px}.col101-actions{margin-top:12px;padding:12px 0}}
@media(max-width:760px){.col101-top{padding-top:max(16px,env(safe-area-inset-top))}.col101-actions{position:sticky;bottom:0;background:linear-gradient(0deg,#080e0c 85%,#080e0ce8);z-index:4;padding:14px 0 max(14px,env(safe-area-inset-bottom));box-shadow:0 -15px 25px #080e0ca0}.col101-person{min-height:76px}.col101-steps{flex-wrap:wrap;row-gap:8px}}
@media(prefers-reduced-motion:reduce){.col101 *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;
function createRealmEntryR101({ useState, useEffect, useRef, jsx, jsxs, assets, fetcher = fetch, navigate = (url) => location.assign(url) }) {
  const h = jsx, hs = jsxs, asset = (name) => assets[name];
  const request = (url, options) => requestRealmR103(fetcher, url, options);
  function Shell({ step, accountName, onLogout, children }) {
    return hs("main", { className: "col101", style: { "--scene": `url("${asset("hero")}")` }, children: [h("style", { children: css }), h("div", { className: "col101-bg", "aria-hidden": true }), hs("header", { className: "col101-top", children: [hs("div", { children: [h("span", { className: "col101-logo", children: "CORE OF LIFE" }), h("small", { children: "Ya\u015Fam\u0131n \xE7ekirde\u011Fine d\xF6n" })] }), hs("div", { className: "col101-user", children: [h("span", { children: accountName }), h("button", { className: "col101-quiet", onClick: onLogout, children: "\xC7\u0131k\u0131\u015F yap" })] })] }), hs("div", { className: "col101-body col101-portal-in", children: [h("ol", { className: "col101-steps", "aria-label": "Oyuna giri\u015F", children: ["Sunucunu se\xE7", "Karakterini se\xE7", "Maceraya kat\u0131l"].map((text, i) => hs("li", { className: step === i ? "active" : "", "aria-current": step === i ? "step" : void 0, children: [h("b", { children: step > i ? "\u2713" : String(i + 1) }), text] }, text)) }), children, hs("footer", { className: "col101-footer", children: [h("span", { children: "CORE OF LIFE \xB7 B\u0130RL\u0130KTE DAHA G\xDC\xC7L\xDC" }), h("span", { children: "Her macera bir se\xE7imle ba\u015Flar." })] })] })] });
  }
  function ErrorBox({ error, retry }) {
    return error ? hs("div", { className: "col101-error", role: "alert", children: [error, retry && h("button", { onClick: retry, children: "Yeniden dene" })] }) : null;
  }
  function ServerGate({ csrf, accountName, onLogout }) {
    const [rows, setRows] = useState(null), [selected, setSelected] = useState("r1"), [error, setError] = useState(""), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0), lock = useRef(false), callback = useRef(null);
    const query = new URLSearchParams(location.search), realmId = query.get("realm"), state = query.get("state"), returning = !!(realmId && state);
    useEffect(() => {
      let active = true;
      const controller = new AbortController();
      if (returning) {
        setBusy(true);
        setError("");
        if (!callback.current || callback.current.key !== csrf + realmId + state) {
          callback.current = { key: csrf + realmId + state, promise: (async () => {
            if (!["r1", "r2"].includes(realmId) || !/^[-_A-Za-z0-9]{43}$/.test(state)) throw Error("Giri\u015F ba\u011Flant\u0131s\u0131 ge\xE7ersiz. Sunucunu yeniden se\xE7.");
            const [data, catalog] = await Promise.all([request("/api/realm/issue", { csrf, body: { realmId, state } }), request("/api/realm/catalog")]);
            const realm = catalog.realms?.find((r) => r.id === realmId);
            const url = new URL(data.destination);
            if (!realm || url.origin !== realm.origin || url.pathname !== "/" || !url.hash.startsWith("#realmCode=")) throw Error("Oyun adresi do\u011Frulanamad\u0131.");
            return url.href;
          })() };
        }
        callback.current.promise.then((url) => {
          if (active) navigate(url);
        }).catch((e) => {
          if (active) {
            setError(e.message);
            setBusy(false);
          }
        });
      } else {
        let pending = null;
        const refresh = () => {
          if (!active || document.visibilityState === "hidden") return;
          if (pending) return pending;
          pending = request("/api/realm/catalog", { signal: controller.signal }).then((data) => {
            if (!Array.isArray(data?.realms)) throw Error("Sunucu listesi al\u0131namad\u0131. Yeniden dene.");
            if (active) {
              setRows(data.realms);
              setError("");
            }
          }).catch((e) => {
            if (active) setError(e.message);
          }).finally(() => {
            pending = null;
          });
          return pending;
        };
        setRows(null);
        setError("");
        refresh();
        const visible = () => {
          if (document.visibilityState === "visible") void refresh();
        };
        const timer = setInterval(refresh, 15e3);
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", visible);
        return () => {
          active = false;
          controller.abort();
          clearInterval(timer);
          window.removeEventListener("focus", refresh);
          document.removeEventListener("visibilitychange", visible);
        };
      }
      return () => {
        active = false;
        controller.abort();
      };
    }, [csrf, realmId, state, retry]);
    const choice = rows?.find((r) => r.id === selected), available = (r) => r.canEnter === true || r.canEnter === void 0 && r.status === "open";
    function enter() {
      if (lock.current || error || !choice || !available(choice)) return;
      lock.current = true;
      setBusy(true);
      try {
        const url = new URL(choice.origin);
        if (url.protocol !== "https:" || url.origin !== choice.origin) throw Error("Sunucu adresi do\u011Frulanamad\u0131.");
        navigate(url.origin + "/api/realm/begin");
      } catch (e) {
        setError(e.message);
        setBusy(false);
        lock.current = false;
      }
    }
    return h(Shell, { step: 0, accountName, onLogout, children: hs("section", { "aria-label": "Sunucu se\xE7imi", children: [h("p", { className: "col101-eyebrow", children: "Senin d\xFCnyan. Senin hik\xE2yen." }), h("h1", { children: "Maceran nerede ba\u015Flas\u0131n?" }), h("p", { className: "col101-intro", children: "D\xFCnyan\u0131 se\xE7, karakterinle yoluna devam et." }), rows?.some((r) => r.id === "r2") && h("a", { className: "col101-quiet", href: "/akademi-kayit", children: "Core Akademi kay\u0131t ba\u015Fvurusu \u2192" }), h(ErrorBox, { error, retry: returning ? () => navigate("/?servers=1") : () => setRetry((v) => v + 1) }), returning ? h("p", { className: "col101-loading", role: "status", children: busy ? "Sunucuna g\xFCvenle ba\u011Flan\u0131l\u0131yor\u2026" : "Sunucunu yeniden se\xE7erek devam edebilirsin." }) : !rows ? error ? null : h("p", { className: "col101-loading", role: "status", children: "D\xFCnyalar haz\u0131rlan\u0131yor\u2026" }) : hs("div", { children: [h("div", { className: "col101-grid", children: rows.map((r) => hs("button", { type: "button", className: "col101-card", "aria-pressed": selected === r.id, "aria-label": r.name + " \xB7 " + (r.load ?? (r.status === "maintenance" ? "Bak\u0131mda" : "Kapal\u0131")), style: { "--art": `url("${asset(r.id === "r2" ? "forest" : "hero")}")` }, onClick: () => setSelected(r.id), disabled: busy, children: [hs("div", { className: "col101-card-top", children: [h("span", { className: "col101-mark", "aria-hidden": true, children: r.id === "r2" ? "\u2727" : "\u265C" }), h("span", { className: "col101-load " + (r.load === "Yo\u011Fun" || r.load === "Dolu" ? "busy" : !available(r) ? "closed" : ""), children: r.status === "maintenance" ? "Bak\u0131mda" : r.status === "closed" ? "Kapal\u0131" : r.status === "unavailable" ? "Ba\u011Flant\u0131 bekleniyor" : r.load ?? "Bo\u015F" })] }), hs("div", { className: "col101-card-content", children: [h("span", { className: "col101-card-tag", children: r.id === "r2" ? "Yeni bir ba\u015Flang\u0131\xE7" : "Efsanenin do\u011Fdu\u011Fu d\xFCnya" }), h("h2", { children: r.name }), h("p", { children: r.id === "r2" ? r.approvalRequired ? "Yeni bir ba\u015Flang\u0131\xE7. Giri\u015F izninle maceraya kat\u0131l." : "Yeni bir d\xFCnya. Kendi hik\xE2yeni en ba\u015Ftan yaz." : "Kahramanlar\u0131n bulu\u015Ftu\u011Fu ana d\xFCnya. Hik\xE2yeni kald\u0131\u011F\u0131n yerden s\xFCrd\xFCr." })] }), h("span", { className: "col101-check", "aria-hidden": true, children: selected === r.id ? "\u2713" : "" })] }, r.id)) }), hs("div", { className: "col101-actions", children: [hs("p", { children: [h("strong", { children: choice?.name ?? "Bir sunucu se\xE7" }), available(choice ?? {}) ? choice.approvalRequired ? "Giri\u015F iznin onayland\u0131. Karakterini se\xE7erek devam et." : "Karakterlerin bir sonraki ad\u0131mda seni bekliyor." : choice?.approvalRequired ? "Yaln\u0131zca kay\u0131t listesinde izin verilen oyuncular girebilir." : "Bu sunucu \u015Fu anda giri\u015Fe a\xE7\u0131k de\u011Fil."] }), h("button", { type: "button", className: "col101-primary", disabled: busy || !!error || !choice || !available(choice), onClick: enter, children: busy ? "Ba\u011Flan\u0131l\u0131yor\u2026" : "Sunucuya devam et  \u2192" })] })] })] }) });
  }
  function CharacterGate({ csrf, accountName, onLogout, onSelected, children }) {
    const [data, setData] = useState(null), [selected, setSelected] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [entered, setEntered] = useState(false), [retry, setRetry] = useState(0), [loading, setLoading] = useState(true), lock = useRef(false), alive = useRef(true), selection = useRef(null);
    useEffect(() => {
      alive.current = true;
      let active = true;
      const controller = new AbortController();
      setLoading(true);
      setError("");
      request("/api/realm/characters", { signal: controller.signal }).then((result) => {
        if (!Array.isArray(result?.characters) || typeof result.canCreate !== "boolean" || !["r1", "r2"].includes(result.realm?.id) || result.characters.some((p) => !p || typeof p.id !== "string" || typeof p.name !== "string")) throw Error("Karakter listesi al\u0131namad\u0131. Yeniden dene.");
        if (!active) return;
        setData(result);
        setSelected(result.characters.some((p) => p.id === result.selectedId) ? result.selectedId : result.characters[0]?.id ?? null);
      }).catch((e) => {
        if (active) setError(e.message);
      }).finally(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
        alive.current = false;
        controller.abort();
        selection.current?.abort();
      };
    }, [retry]);
    const character = data?.characters?.find((p) => p.id === selected), role = character?.role ?? "muhafiz";
    async function enter() {
      if (lock.current || loading) return;
      lock.current = true;
      setBusy(true);
      setError("");
      const controller = new AbortController();
      selection.current = controller;
      try {
        if (character) {
          const result = await request("/api/realm/character-select", { csrf, body: { playerId: character.id }, signal: controller.signal });
          if (!alive.current || controller.signal.aborted) return;
          if (result?.player?.id !== character.id) throw Error("Karakter se\xE7imi do\u011Frulanamad\u0131. Yeniden dene.");
          onSelected(result.player);
        } else if (!data?.canCreate) throw Error("Bir karakter se\xE7melisin.");
        if (alive.current && !controller.signal.aborted) setEntered(true);
      } catch (e) {
        if (alive.current && !controller.signal.aborted) setError(e.message);
      } finally {
        lock.current = false;
        if (selection.current === controller) selection.current = null;
        if (alive.current) setBusy(false);
      }
    }
    function back() {
      const u = new URL(data.authOrigin);
      if (u.protocol === "https:" && u.origin === data.authOrigin) navigate(u.origin + "/?servers=1");
    }
    if (entered) return children;
    return h(Shell, { step: 1, accountName, onLogout, children: hs("section", { "aria-label": "Karakter se\xE7imi", children: [h("p", { className: "col101-eyebrow", children: data?.realm?.name ?? "Karakterlerin" }), h("h1", { children: data?.canCreate ? "Yeni bir efsane yaz." : "Hik\xE2yene devam et." }), h("p", { className: "col101-intro", children: data?.canCreate ? "Bu d\xFCnyadaki ilk karakterin seni bekliyor." : "Maceraya kat\u0131lacak kahraman\u0131n\u0131 se\xE7." }), h(ErrorBox, { error, retry: () => setRetry((v) => v + 1) }), error && h("a", { className: "col101-quiet", href: "/api/realm/begin", children: "Hesab\u0131mla yeniden ba\u011Flan" }), !data ? loading ? h("p", { className: "col101-loading", role: "status", children: "Karakterlerin y\xFCkleniyor\u2026" }) : null : hs("div", { children: [hs("div", { className: "col101-character-layout", children: [data.canCreate ? hs("div", { className: "col101-empty", children: [h("span", { className: "col101-mark", "aria-hidden": true, children: "\u2727" }), h("h2", { children: "Yolculuk burada ba\u015Fl\u0131yor" }), h("p", { children: "Muhaf\u0131z, Avc\u0131 veya Arkanist\u2026 S\u0131n\u0131f\u0131n\u0131 ve ad\u0131n\u0131 se\xE7, bu d\xFCnyada kendi hik\xE2yeni olu\u015Ftur." })] }) : h("div", { className: "col101-roster", children: data.characters.map((p) => hs("button", { type: "button", className: "col101-person", "aria-pressed": selected === p.id, disabled: busy, onClick: () => setSelected(p.id), children: [h("img", { src: asset(ROLE[p.role] ? p.role : "muhafiz"), alt: "", width: 45, height: 61 }), hs("span", { children: [h("strong", { children: p.name }), h("small", { children: (ROLE[p.role] ?? p.role) + " \xB7 Seviye " + p.level + (p.originRealm && p.originRealm !== data.realm.id ? " \xB7 " + p.originName : "") })] }), h("i", { "aria-hidden": true, children: selected === p.id ? "\u2713" : "\u203A" })] }, p.id)) }), h("div", { className: "col101-portrait", "aria-hidden": true, children: h("img", { src: asset(ROLE[role] ? role : "muhafiz"), alt: "" }, role) })] }), hs("div", { className: "col101-actions", children: [h("button", { type: "button", className: "col101-quiet", onClick: back, disabled: busy, children: "\u2190 Sunuculara d\xF6n" }), h("button", { type: "button", className: "col101-primary", disabled: busy || loading || !character && !data.canCreate, onClick: enter, children: busy ? "Haz\u0131rlan\u0131yor\u2026" : data.canCreate ? "Karakterini olu\u015Ftur  \u2192" : "Maceraya kat\u0131l  \u2192" })] })] })] }) });
  }
  return { ServerGate, CharacterGate };
}
function installAdminRealmContextR101() {
  const api = (path, body, csrf) => requestRealmR103(fetch, path, { body, csrf, timeoutMs: 8e3 });
  const install = async () => {
    try {
      let show = function(data) {
        const value = data.testAccessR101;
        if (typeof value?.testOnly !== "boolean" || !Number.isSafeInteger(value.revision)) throw Error("Test eri\u015Fimi do\u011Frulanamad\u0131.");
        current = value;
        status.textContent = value.testOnly ? "Test modu a\xE7\u0131k \xB7 Akademi yaln\u0131z izin verilen hesaplara g\xF6r\xFCn\xFCr." : "Test modu kapal\u0131 \xB7 Akademi herkese g\xF6r\xFCn\xFCr. Giri\u015F, Oyun Durumu ayar\u0131na ba\u011Fl\u0131d\u0131r.";
        toggle.textContent = value.testOnly ? "Test modunu kapat" : "Test modunu a\xE7";
        toggle.disabled = false;
      };
      const context = await api("/api/realm/context");
      if (!["r1", "r2"].includes(context.realm?.id) || document.getElementById("col101-admin-context")) return;
      const bar = document.createElement("div");
      bar.id = "col101-admin-context";
      bar.style.cssText = "padding:12px 24px;background:#18291f;border-bottom:1px solid #a58a4e;color:#ead5a2;font:14px/1.5 system-ui;position:relative;z-index:20";
      const title = document.createElement("p");
      title.style.margin = "0";
      title.textContent = context.realm.name + " \xB7 Bu paneldeki oyun ayarlar\u0131 yaln\u0131z bu sunucuya aittir. \xC7P kodlar\u0131 iki sunucuda ortakt\u0131r.";
      bar.append(title);
      document.body.prepend(bar);
      document.title = context.realm.name + " \xB7 Y\xF6netim";
      if (context.realm.id !== "r2") return;
      const controls = document.createElement("div");
      controls.style.cssText = "display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px";
      const status = document.createElement("span");
      status.id = "col101-test-state";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.textContent = "Test eri\u015Fimi kontrol ediliyor\u2026";
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.id = "col101-test-toggle";
      toggle.textContent = "Test eri\u015Fimi";
      toggle.disabled = true;
      const refresh = document.createElement("button");
      refresh.type = "button";
      refresh.textContent = "Test ayar\u0131n\u0131 yenile";
      for (const button of [toggle, refresh]) button.style.cssText = "padding:8px 14px;color:#ead5a2;background:#0d1b13;border:1px solid #a58a4e;border-radius:6px;cursor:pointer;font:inherit";
      controls.append(status, toggle, refresh);
      bar.append(controls);
      let current = null, busy = false;
      async function load() {
        if (busy) return;
        busy = true;
        toggle.disabled = true;
        refresh.disabled = true;
        try {
          show(await api("/api/admin/launch"));
        } catch (e) {
          current = null;
          status.textContent = e.message;
        } finally {
          busy = false;
          refresh.disabled = false;
        }
      }
      toggle.addEventListener("click", async () => {
        if (busy || !current) return;
        busy = true;
        toggle.disabled = true;
        refresh.disabled = true;
        try {
          const session = await api("/api/auth/me");
          if (!session.authenticated || typeof session.csrfToken !== "string") throw Error("Y\xF6netici oturumunu yenile.");
          show(await api("/api/admin/launch", { action: "test_access", enabled: !current.testOnly, revision: current.revision }, session.csrfToken));
        } catch (e) {
          status.textContent = e.message;
          current = null;
        } finally {
          busy = false;
          refresh.disabled = false;
        }
      });
      refresh.addEventListener("click", load);
      await load();
    } catch {
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else void install();
}
export {
  createRealmEntryR101,
  installAdminRealmContextR101
};
