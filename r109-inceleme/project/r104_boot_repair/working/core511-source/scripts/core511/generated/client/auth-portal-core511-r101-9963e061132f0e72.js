import {createRealmEntryR101} from './realm-entry-r101-0bfd586a50c61a35.js';
export function startLaunchRefresh478({ request, getStatus, isPlaying, onStatus, onError, initialRefresh = false }) {
  let active = true, pending = null, timer = null;
  let observed = getStatus(), observedAt = performance.now();
  const clear = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };
  const allowed = () => active && !document.hidden && !isPlaying();
  const remember = (status) => {
    observed = status;
    observedAt = performance.now();
  };
  const schedule = () => {
    clear();
    if (!allowed()) return;
    const status = observed;
    let delay = 5e3;
    if (status?.phase === "waiting" && Number.isFinite(status.serverTime) && Number.isFinite(status.opensAt)) {
      const until = status.opensAt - status.serverTime - Math.max(0, performance.now() - observedAt);
      if (until > 0) delay = Math.min(delay, Math.max(25, Math.ceil(until)));
    }
    timer = window.setTimeout(() => {
      timer = null;
      void refresh();
    }, delay);
  };
  const refresh = async () => {
    if (!allowed() || pending) return;
    clear();
    const controller = new AbortController();
    pending = controller;
    const timeout = window.setTimeout(() => controller.abort(), 1e4);
    try {
      const status = await request(controller.signal);
      if (active) {
        remember(status);
        onStatus(status);
      }
    } catch {
      if (active) onError();
    } finally {
      window.clearTimeout(timeout);
      if (pending === controller) pending = null;
      schedule();
    }
  };
  const visibility = () => {
    clear();
    if (allowed()) void refresh();
  };
  document.addEventListener("visibilitychange", visibility);
  if (initialRefresh && !document.hidden) void refresh();
  else schedule();
  return () => {
    active = false;
    clear();
    document.removeEventListener("visibilitychange", visibility);
    pending?.abort();
  };
}
export function createEntrySite439({ React, authRequest, RegistrationChallenge, unlockEntryAudio = () => {
}, LaunchEmailPreference, LaunchVideo, LaunchInformation }) {
  const { useState, useRef } = React;
  const opening478 = Date.parse("2026-10-23T20:00:00+03:00");
  const discord = "https://discord.gg/sCbQh9D8r";
  const instagram = "https://www.instagram.com/webcoreoflife/";
  function SocialIcon({ platform }) {
    return /* @__PURE__ */ React.createElement("svg", { className: `entry478-social-icon entry478-social-icon-${platform}`, viewBox: "0 0 24 24", width: "24", height: "24", "aria-hidden": "true", focusable: "false" }, platform === "discord" ? /* @__PURE__ */ React.createElement("path", { fill: "currentColor", d: "M20.32 4.37a19.79 19.79 0 0 0-4.89-1.52c-.21.38-.45.89-.62 1.29a18.4 18.4 0 0 0-5.43 0c-.17-.4-.41-.91-.63-1.29a19.74 19.74 0 0 0-4.88 1.52C.79 8.93-.05 13.37.37 17.74a19.97 19.97 0 0 0 6 3.03c.48-.65.91-1.35 1.27-2.09-.7-.26-1.37-.59-2.01-.96l.49-.39a14.23 14.23 0 0 0 11.76 0l.49.39c-.65.38-1.32.7-2.02.96.37.74.79 1.44 1.27 2.09a19.94 19.94 0 0 0 6.01-3.03c.5-5.06-.86-9.46-3.31-13.37ZM8.02 15.08c-1.17 0-2.13-1.07-2.13-2.38s.94-2.38 2.13-2.38c1.2 0 2.15 1.08 2.13 2.38 0 1.31-.94 2.38-2.13 2.38Zm7.96 0c-1.18 0-2.13-1.07-2.13-2.38s.93-2.38 2.13-2.38c1.19 0 2.15 1.08 2.13 2.38 0 1.31-.94 2.38-2.13 2.38Z" }) : /* @__PURE__ */ React.createElement("g", { fill: "none", stroke: "currentColor", strokeWidth: "1.8" }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "3", width: "18", height: "18", rx: "5" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "4.2" }), /* @__PURE__ */ React.createElement("circle", { cx: "17.5", cy: "6.5", r: "1", fill: "currentColor", stroke: "none" })));
  }
  function Brand() {
    return /* @__PURE__ */ React.createElement("a", { className: "entry439-brand", href: "/", "aria-label": "Core of Life ana sayfa" }, /* @__PURE__ */ React.createElement("img", { src: "/favicon.svg", width: "36", height: "42", alt: "" }), /* @__PURE__ */ React.createElement("span", null, "CORE OF LIFE", /* @__PURE__ */ React.createElement("small", null, "YA\u015EAM \xC7EK\u0130RDE\u011E\u0130")));
  }
  function Footer() {
    return /* @__PURE__ */ React.createElement("footer", { className: "entry439-footer" }, /* @__PURE__ */ React.createElement("span", null, "CORE OF LIFE ", /* @__PURE__ */ React.createElement("span", { className: "entry439-footer-note" }, "\xB7 Ya\u015Fam \xC7ekirde\u011Fi")), /* @__PURE__ */ React.createElement("nav", { "aria-label": "Topluluk ba\u011Flant\u0131lar\u0131" }, /* @__PURE__ */ React.createElement("a", { href: "/rehber" }, "Oyuncu rehberi"), /* @__PURE__ */ React.createElement("a", { className: "entry478-social-link", href: discord, target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement(SocialIcon, { platform: "discord" }), /* @__PURE__ */ React.createElement("span", null, "Discord")), /* @__PURE__ */ React.createElement("a", { className: "entry478-social-link", href: instagram, target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement(SocialIcon, { platform: "instagram" }), /* @__PURE__ */ React.createElement("span", null, "Instagram"))));
  }
  function Heroes() {
    return /* @__PURE__ */ React.createElement("div", { className: "entry439-heroes", role: "img", "aria-label": "Core of Life d\xFCnyas\u0131n\u0131n z\u0131rhl\u0131 sava\u015F\xE7\u0131s\u0131, ok\xE7usu ve b\xFCy\xFCc\xFCs\xFC" }, /* @__PURE__ */ React.createElement("span", { className: "entry439-hero entry439-hero-left" }), /* @__PURE__ */ React.createElement("span", { className: "entry439-hero entry439-hero-right" }), /* @__PURE__ */ React.createElement("span", { className: "entry439-hero entry439-hero-center" }));
  }
  function Gift({ compact = false }) {
    return /* @__PURE__ */ React.createElement("section", { className: `entry439-gift ${compact ? "entry439-gift-compact" : ""}`, "aria-label": "\xD6n kay\u0131t hediyesi" }, /* @__PURE__ */ React.createElement("div", { className: "entry439-gift-pet" }, /* @__PURE__ */ React.createElement("img", { src: "/game/starter-pet.webp", width: "384", height: "384", alt: "Ye\u015Fil ve alt\u0131n renkli Ba\u015Flang\u0131\xE7 Tilkisi", decoding: "async" })), /* @__PURE__ */ React.createElement("div", { className: "entry439-gift-copy" }, /* @__PURE__ */ React.createElement("span", { className: "entry439-kicker" }, "\xD6N KAYIT HED\u0130YEN"), /* @__PURE__ */ React.createElement("h2", null, "\u0130lk ad\u0131m\u0131nda", /* @__PURE__ */ React.createElement("br", null), " yaln\u0131z de\u011Filsin."), /* @__PURE__ */ React.createElement("p", null, "Ba\u015Flang\u0131\xE7 Tilkisi, maceran\u0131n ilk 3 g\xFCn\xFCnde yan\u0131nda."), /* @__PURE__ */ React.createElement("ul", null, /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("strong", null, "50"), " M\xFCcevher"), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("strong", null, "10"), " K\u0131rm\u0131z\u0131 \u0130ksir"), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("strong", null, "3 g\xFCn"), " Ba\u015Flang\u0131\xE7 Tilkisi")), /* @__PURE__ */ React.createElement("small", null, "Ba\u015Flang\u0131\xE7 paketin ilk oyun giri\u015Finde seni bekler.")));
  }
  function Preview457() {
    const [playing, setPlaying] = useState(false);
    return /* @__PURE__ */ React.createElement("section", { className: "entry457-preview", "aria-label": "Core of Life oyun videosu" }, /* @__PURE__ */ React.createElement("div", { className: "entry457-preview-frame" }, playing ? /* @__PURE__ */ React.createElement("iframe", { src: "https://www.youtube-nocookie.com/embed/1WJV_x8x48M?autoplay=1&playsinline=1&rel=0", title: "Core of Life \xB7 Oyun tan\u0131t\u0131m\u0131", allow: "autoplay; encrypted-media; picture-in-picture; fullscreen", allowFullScreen: true, referrerPolicy: "strict-origin-when-cross-origin" }) : /* @__PURE__ */ React.createElement("button", { type: "button", className: "entry457-play", onClick: () => setPlaying(true), "aria-label": "Tan\u0131t\u0131m videosunu oynat" }, /* @__PURE__ */ React.createElement(Heroes, null), /* @__PURE__ */ React.createElement("span", { className: "entry457-video-label" }, "CORE OF LIFE ", /* @__PURE__ */ React.createElement("small", null, "OYUNDAN G\xD6R\xDCNT\xDCLER")), /* @__PURE__ */ React.createElement("span", { className: "entry457-play-symbol", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "28", height: "28", focusable: "false" }, /* @__PURE__ */ React.createElement("path", { d: "M8 4.8a1 1 0 0 1 1.5-.86l11 6.7a1.6 1.6 0 0 1 0 2.72l-11 6.7A1 1 0 0 1 8 19.2Z", fill: "currentColor" }))), /* @__PURE__ */ React.createElement("span", { className: "entry457-play-caption" }, "Tan\u0131t\u0131m\u0131 izle"))), /* @__PURE__ */ React.createElement("div", { className: "entry457-preview-footer" }, /* @__PURE__ */ React.createElement("span", null, "Bir bak\u0131\u015Fta Core of Life"), /* @__PURE__ */ React.createElement("a", { href: "https://www.youtube.com/shorts/1WJV_x8x48M", target: "_blank", rel: "noopener noreferrer" }, "YouTube\u2019da izle")));
  }
  function LaunchCountdown478({ status, open, preview }) {
    const opening = Number.isFinite(Number(status.opensAt)) && Number(status.opensAt) > 0 ? Number(status.opensAt) : opening478;
    const serverNow = Number.isFinite(Number(status.serverTime)) && Number(status.serverTime) > 0 ? Number(status.serverTime) : null;
    const maintenance = status.phase === "maintenance", ended = status.phase === "ended", paused = !open && (status.mode === "closed" || status.automaticOpening === false);
    const [remaining, setRemaining] = useState(() => serverNow === null ? null : Math.max(0, Math.ceil((opening - serverNow) / 1e3)));
    React.useEffect(() => {
      if (open || maintenance || ended || paused || serverNow === null) {
        setRemaining(null);
        return;
      }
      let timer;
      const anchor = performance.now();
      const sample = () => {
        const left = Math.max(0, Math.ceil((opening - serverNow - (performance.now() - anchor)) / 1e3));
        setRemaining(left);
        if (left === 0 && timer !== void 0) {
          clearInterval(timer);
          timer = void 0;
        }
        return left;
      };
      const visible = () => {
        if (timer !== void 0) {
          clearInterval(timer);
          timer = void 0;
        }
        if (document.visibilityState === "hidden") return;
        if (sample() > 0 && !preview) timer = setInterval(sample, 1e3);
      };
      visible();
      if (!preview) document.addEventListener("visibilitychange", visible);
      return () => {
        if (timer !== void 0) clearInterval(timer);
        if (!preview) document.removeEventListener("visibilitychange", visible);
      };
    }, [opening, serverNow, open, maintenance, ended, paused, preview]);
    const date = React.useMemo(() => new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", year: "numeric", weekday: "long" }).format(opening), [opening]);
    const time = React.useMemo(() => new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(opening), [opening]);
    const parts = remaining === null ? null : [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60];
    return /* @__PURE__ */ React.createElement("section", { className: `entry478-launch${open ? " entry478-launch-open" : ""}`, "aria-label": "Core of Life tam sürüm açılışı" }, /* @__PURE__ */ React.createElement("div", { className: "entry478-launch-heading" }, /* @__PURE__ */ React.createElement("span", { className: "entry478-eyebrow" }, /* @__PURE__ */ React.createElement("i", { "aria-hidden": "true" }), open ? "TAM SÜRÜM YAYINDA" : maintenance || ended || paused ? "SUNUCU DURUMU" : "TAM AÇILIŞ"), /* @__PURE__ */ React.createElement("span", { className: "entry478-timezone" }, "T\xFCrkiye saati \xB7 UTC+3")), maintenance || ended || paused ? /* @__PURE__ */ React.createElement("div", { className: "entry478-launch-state", role: "status" }, /* @__PURE__ */ React.createElement("strong", null, maintenance ? "K\u0131sa bir mola." : "Oyun \u015Fu anda kapal\u0131."), /* @__PURE__ */ React.createElement("p", null, maintenance ? status.maintenanceText || "Giri\u015F yeniden a\xE7\u0131ld\u0131\u011F\u0131nda buradan devam edebilirsin." : paused ? "A\xE7\u0131l\u0131\u015F takvimi y\xF6netici taraf\u0131ndan duraklat\u0131ld\u0131." : "Giri\u015F yeniden a\xE7\u0131ld\u0131\u011F\u0131nda buradan devam edebilirsin.")) : open ? /* @__PURE__ */ React.createElement("div", { className: "entry478-launch-state", role: "status" }, /* @__PURE__ */ React.createElement("strong", null, "Core of Life seni bekliyor."), /* @__PURE__ */ React.createElement("p", null, "Hesab\u0131n\u0131 olu\u015Ftur veya giri\u015F yap; kendi efsaneni yaz.")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "entry478-date" }, /* @__PURE__ */ React.createElement("time", { dateTime: new Date(opening).toISOString() }, date), /* @__PURE__ */ React.createElement("strong", null, time)), /* @__PURE__ */ React.createElement("div", { className: "entry478-countdown", role: "timer", "aria-live": "off", "aria-label": "A\xE7\u0131l\u0131\u015Fa kalan s\xFCre" }, ["G\xFCn", "Saat", "Dakika", "Saniye"].map((label, i2) => /* @__PURE__ */ React.createElement("div", { key: label }, /* @__PURE__ */ React.createElement("strong", null, parts ? String(parts[i2]).padStart(2, "0") : "\u2014"), /* @__PURE__ */ React.createElement("span", null, label)))), /* @__PURE__ */ React.createElement("p", { className: "entry478-countdown-note", role: "status" }, remaining === 0 ? "A\xE7\u0131l\u0131\u015F saati geldi. Sunucunun giri\u015F durumu yenileniyor\u2026" : remaining === null ? "Geri say\u0131m sunucu saatiyle e\u015Fitleniyor\u2026" : "Geri say\u0131m bitti\u011Finde maceraya buradan kat\u0131l.")));
  }
  function BossEventShowcase29() {
    return React.createElement("section", {className:"entry-r29-boss", "aria-labelledby":"entry-r29-boss-title"},
      React.createElement("style", null, `.entry439 .entry-r29-boss{box-sizing:border-box;width:calc(100% - 32px);max-width:1120px;margin:32px auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;gap:32px;padding:28px;border:1px solid rgba(213,175,96,.38);border-radius:20px;background:rgba(8,25,23,.92);color:#f4ead4}.entry439 .entry-r29-boss figure{margin:0;min-width:0}.entry439 .entry-r29-boss img{display:block;width:100%;height:auto;max-width:480px;margin:auto;border-radius:12px}.entry439 .entry-r29-boss figcaption{margin-top:12px;text-align:center;font-size:13px;line-height:1.5;color:#c7c1ae}.entry439 .entry-r29-boss-copy{min-width:0}.entry439 .entry-r29-boss-copy h2{margin:12px 0 18px;font-size:clamp(24px,3vw,38px);line-height:1.18;overflow-wrap:anywhere}.entry439 .entry-r29-boss-copy p{font-size:17px;line-height:1.65;color:#d4cebc}.entry439 .entry-r29-boss-label{font-size:12px;font-weight:700;letter-spacing:.14em;color:#e5bc6e}.entry439 .entry-r29-boss-platforms{font-size:14px!important;color:#e5bc6e!important}@media(max-width:640px){.entry439 .entry-r29-boss{grid-template-columns:minmax(0,1fr);padding:16px;gap:20px;margin:24px auto}.entry439 .entry-r29-boss-copy{grid-row:1}.entry439 .entry-r29-boss-copy h2{margin-top:8px}.entry439 .entry-r29-boss-copy p{font-size:16px}}`),
      React.createElement("figure", null,
        React.createElement("img", {src:"/assets/boss-event-r29-c146e47142399631.jpg", alt:"Core of Life Boss Saldırısı Etkinliği: oyuncular Pazar Köyü'nde boss'a karşı birlikte savaşıyor.", width:1248, height:1524, loading:"lazy", decoding:"async"}),
        React.createElement("figcaption", null, "Core of Life — oyun içinden bir kare")),
      React.createElement("div", {className:"entry-r29-boss-copy"},
        React.createElement("span", {className:"entry-r29-boss-label"}, "BOSS SALDIRISI ETKİNLİĞİ"),
        React.createElement("h2", {id:"entry-r29-boss-title"}, "Birlikte savaş. Maceraya katıl."),
        React.createElement("p", null, "Dostlarınla aynı dünyada buluş, güçlü boss'lara karşı omuz omuza mücadele et."),
        React.createElement("p", {className:"entry-r29-boss-platforms"}, "Mobil · PC · Tablet — indirmeden, ücretsiz oyna.")));
  }
  function Landing({ status, account, onRegister, onLogin, onPlay, onLogout, preview = false, children }) {
    const open = !status.showLanding && status.canPlay && status.phase !== "maintenance";
    const maintenance = status.phase === "maintenance" || status.phase === "ended" || status.mode === "closed" || status.automaticOpening === false;
    React.useEffect(() => {
      if (preview) return;
      const key = "col-site-entry457", day = new Date(Date.now() + 108e5).toISOString().slice(0, 10);
      try {
        if (sessionStorage.getItem(key) === day) return;
        sessionStorage.setItem(key, day);
      } catch {
      }
      const retry = () => {
        try {
          sessionStorage.removeItem(key);
        } catch {
        }
      };
      void fetch("/api/site-visit", { method: "POST", credentials: "same-origin", cache: "no-store" }).then((response) => {
        if (!response.ok) retry();
      }).catch(retry);
    }, [preview]);
    return /* @__PURE__ */ React.createElement("main", { className: "entry439 entry439-home" }, /* @__PURE__ */ React.createElement("div", { className: "entry439-scenery", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("header", { className: "entry439-header" }, /* @__PURE__ */ React.createElement(Brand, null), /* @__PURE__ */ React.createElement("nav", { "aria-label": "Ana gezinme" }, /* @__PURE__ */ React.createElement("a", { href: "/rehber" }, "Oyunu ke\u015Ffet"), /* @__PURE__ */ React.createElement("a", { className: "entry478-social-link", href: discord, target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement(SocialIcon, { platform: "discord" }), /* @__PURE__ */ React.createElement("span", null, "Discord")), /* @__PURE__ */ React.createElement("a", { className: "entry478-social-link", href: instagram, target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement(SocialIcon, { platform: "instagram" }), /* @__PURE__ */ React.createElement("span", null, "Instagram")), !account && open && /* @__PURE__ */ React.createElement("button", { type: "button", className: "entry439-nav-login", onClick: onLogin }, "Oyuna giri\u015F"), account && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onLogout }, "\xC7\u0131k\u0131\u015F yap"))), /* @__PURE__ */ React.createElement("section", { className: "entry439-hero-section" }, /* @__PURE__ */ React.createElement("div", { className: "entry439-intro" }, preview && /* @__PURE__ */ React.createElement("p", { className: "entry439-preview" }, "\xD6n izleme \xB7 Eri\u015Fim izinleri de\u011Fi\u015Fmez"), /* @__PURE__ */ React.createElement(LaunchCountdown478, { status, open, preview }), /* @__PURE__ */ React.createElement("h1", null, "Yeni bir d\xFCnya.", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("em", null, "Senin hik\xE2yen.")), /* @__PURE__ */ React.createElement("p", { className: "entry439-lead" }, "Kahraman\u0131n\u0131 se\xE7, dostlar\u0131nla g\xFC\xE7len, kendi efsaneni yaz. PC, tablet ve telefondan ", /* @__PURE__ */ React.createElement("strong", null, "indirmeden, taray\u0131c\u0131nda oyna.")), /* @__PURE__ */ React.createElement("div", { className: "entry439-actions" }, account ? status.canPlay ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "entry439-primary", onClick: onPlay }, "Oyuna giri\u015F ", /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2192")) : /* @__PURE__ */ React.createElement("div", { className: "entry439-confirmation", role: "status" }, /* @__PURE__ */ React.createElement("strong", null, maintenance ? "Hesab\u0131n haz\u0131r" : "\xD6n kayd\u0131n tamamland\u0131", ", ", account, "."), /* @__PURE__ */ React.createElement("span", null, maintenance ? "Oyun yeniden a\xE7\u0131ld\u0131\u011F\u0131nda bu ekrandan devam edebilirsin." : "A\xE7\u0131l\u0131\u015Fta oyuna giri\u015F d\xFC\u011Fmesi burada g\xF6r\xFCnecek.")) : /* @__PURE__ */ React.createElement(React.Fragment, null, status.registrationOpen && /* @__PURE__ */ React.createElement("button", { type: "button", className: "entry439-primary", onClick: onRegister }, open ? "Kay\u0131t ol" : "\xDCcretsiz \xF6n kay\u0131t ol", " ", /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2192")), open && /* @__PURE__ */ React.createElement("button", { type: "button", className: "entry439-secondary", onClick: onLogin }, "Oyuna giri\u015F"))), /* @__PURE__ */ React.createElement("p", { className: "entry439-platforms" }, /* @__PURE__ */ React.createElement("span", { className: "entry478-platform-mark", "aria-hidden": "true" }, "\u2713"), " \xDCcretsiz oyna ", /* @__PURE__ */ React.createElement("i", null), " PC \xB7 Tablet \xB7 Mobil"), /* @__PURE__ */ React.createElement("div", { className: "entry478-social-cards", "aria-label": "Core of Life toplulu\u011Fu" }, /* @__PURE__ */ React.createElement("a", { className: "entry457-discord", href: discord, target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement(SocialIcon, { platform: "discord" }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, "Discord\u2019a kat\u0131l"), /* @__PURE__ */ React.createElement("small", null, "Yol arkada\u015Flar\u0131n seni bekliyor.")), /* @__PURE__ */ React.createElement("span", { className: "entry478-community-arrow", "aria-hidden": "true" }, "\u2197")), /* @__PURE__ */ React.createElement("a", { className: "entry457-discord entry478-instagram", href: instagram, target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement(SocialIcon, { platform: "instagram" }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, "Instagram\u2019da takip et"), /* @__PURE__ */ React.createElement("small", null, "@webcoreoflife")), /* @__PURE__ */ React.createElement("span", { className: "entry478-community-arrow", "aria-hidden": "true" }, "\u2197"))), account && LaunchEmailPreference && /* @__PURE__ */ React.createElement(LaunchEmailPreference, { preference: status.emailPreference, preview })), /* @__PURE__ */ React.createElement("div", { className: "entry439-hero-art entry457-hero-media" }, /* @__PURE__ */ React.createElement(Preview457, null), /* @__PURE__ */ React.createElement("p", { className: "entry478-video-note" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2726"), " \xDC\xE7 s\u0131n\u0131f. Bir d\xFCnya. Say\u0131s\u0131z macera."))), React.createElement(BossEventShowcase29, null), /* @__PURE__ */ React.createElement("div", { className: "entry439-lower" }, /* @__PURE__ */ React.createElement(Gift, null), /* @__PURE__ */ React.createElement("section", { className: "entry439-community" }, /* @__PURE__ */ React.createElement("span", { className: "entry439-kicker" }, "MACERA B\u0130RL\u0130KTE DAHA G\xDCZEL"), /* @__PURE__ */ React.createElement("h2", null, "Birlikte daha g\xFC\xE7l\xFCs\xFCn."), /* @__PURE__ */ React.createElement("p", null, "Loncan\u0131 kur, zindanlar\u0131 ke\u015Ffet ve bu d\xFCnyan\u0131n hik\xE2yesinde yerini al."), /* @__PURE__ */ React.createElement("a", { className: "entry439-secondary entry478-social-link", href: discord, target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement(SocialIcon, { platform: "discord" }), "Discord\u2019a kat\u0131l"), /* @__PURE__ */ React.createElement("a", { className: "entry439-text-link", href: "https://coreoflifetanitim.com/", target: "_blank", rel: "noopener noreferrer" }, "Oyunu ve rehberi ke\u015Ffet"))), children, LaunchInformation && /* @__PURE__ */ React.createElement("details", { className: "entry439-more" }, /* @__PURE__ */ React.createElement("summary", null, "iPhone ile nas\u0131l oynan\u0131r?"), /* @__PURE__ */ React.createElement("div", { className: "entry439-more-content" }, LaunchInformation && /* @__PURE__ */ React.createElement(LaunchInformation, null))), /* @__PURE__ */ React.createElement(Footer, null));
  }
  function AuthPanel({ mode, setMode, busy, setBusy, message, setMessage, resetToken = "", onAuthenticated, registrationOnly = false, restrictedAccess = false, launchEmailAvailable = false }) {
    const current = registrationOnly && !restrictedAccess && ["login", "forgot"].includes(mode) ? "register" : mode;
    const [captcha, setCaptcha] = useState({ id: "", answer: "" }), [captchaRetry, setCaptchaRetry] = useState(0), [consent, setConsent] = useState(false);
    const [username, setUsername] = useState(""), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState(""), [reveal, setReveal] = useState(false);
    const inFlight = useRef(false);
    const register = current === "register", login = current === "login", reset = current === "reset", forgot = current === "forgot";
    const change = (next) => {
      if (inFlight.current) return;
      setMode(next);
      setMessage("");
      setPassword("");
      setConfirmation("");
      setReveal(false);
    };
    const title = register ? registrationOnly ? "Macerada yerini al." : "Kahraman\u0131n\u0131 olu\u015Ftur." : forgot ? "Hesab\u0131n\u0131 geri al." : reset ? "Yeni parolan\u0131 belirle." : restrictedAccess && registrationOnly ? "\u0130zinli hesap eri\u015Fimi." : "Macerana devam et.";
    async function submit(event) {
      event.preventDefault();
      if (inFlight.current) return;
      if ((register || reset) && password !== confirmation) {
        setMessage("Parolalar e\u015Fle\u015Fmiyor.");
        return;
      }
      inFlight.current = true;
      setBusy(true);
      setMessage("");
      if (login) unlockEntryAudio();
      try {
        if (forgot) {
          const result = await authRequest("/api/auth/forgot-password", { email });
          setMessage(result.message ?? "Hesap e\u015Fle\u015Firse s\u0131f\u0131rlama ba\u011Flant\u0131s\u0131 e-postana g\xF6nderildi.");
        } else if (reset) {
          const result = await authRequest("/api/auth/reset-password", { token: resetToken, password, passwordConfirmation: confirmation });
          setMessage(result.message ?? "Parolan yenilendi. Ana sayfadan devam edebilirsin.");
          setPassword("");
          setConfirmation("");
        } else {
          const result = await authRequest(register ? "/api/auth/register" : "/api/auth/login", register ? { username, email, password, passwordConfirmation: confirmation, captchaId: captcha.id, captchaAnswer: captcha.answer, launchEmailConsent: launchEmailAvailable && consent } : { login: username, password });
          if (!result.authenticated || !result.account) throw Error("Oturum a\xE7\u0131lamad\u0131.");
          onAuthenticated({ ...result, authenticated: true, player: result.player ?? null });
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "\u0130\u015Flem tamamlanamad\u0131.");
        if (register) setCaptchaRetry((v2) => v2 + 1);
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    }
    return /* @__PURE__ */ React.createElement("main", { className: "entry439 entry439-auth" }, /* @__PURE__ */ React.createElement("div", { className: "entry439-scenery", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("header", { className: "entry439-header" }, /* @__PURE__ */ React.createElement(Brand, null), /* @__PURE__ */ React.createElement("a", { className: "entry439-home-link", href: "/" }, "Ana sayfa")), /* @__PURE__ */ React.createElement("div", { className: "entry439-auth-layout" }, /* @__PURE__ */ React.createElement("section", { className: "entry439-auth-story" }, /* @__PURE__ */ React.createElement("p", { className: "entry439-kicker" }, "CORE OF LIFE"), /* @__PURE__ */ React.createElement("h2", null, "Her efsane", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("em", null, "bir ad\u0131mla ba\u015Flar.")), /* @__PURE__ */ React.createElement("p", null, "Kahraman\u0131n\u0131 geli\u015Ftir, yeni b\xF6lgeleri ke\u015Ffet.", /* @__PURE__ */ React.createElement("br", null), "Bu d\xFCnyada senin de bir yerin var."), /* @__PURE__ */ React.createElement(Heroes, null), registrationOnly && register && /* @__PURE__ */ React.createElement("div", { className: "entry439-auth-gift" }, /* @__PURE__ */ React.createElement("img", { src: "/game/starter-pet.webp", width: "88", height: "88", alt: "Ba\u015Flang\u0131\xE7 Tilkisi" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "\xD6n kay\u0131t hediyen haz\u0131r."), /* @__PURE__ */ React.createElement("span", null, "50 M\xFCcevher \xB7 10 K\u0131rm\u0131z\u0131 \u0130ksir", /* @__PURE__ */ React.createElement("br", null), "3 g\xFCnl\xFCk Ba\u015Flang\u0131\xE7 Tilkisi")))), /* @__PURE__ */ React.createElement("section", { className: "entry439-form-card", "aria-labelledby": "entry439-form-title" }, !registrationOnly && !forgot && !reset && /* @__PURE__ */ React.createElement("div", { className: "entry439-tabs", role: "tablist", "aria-label": "Hesap i\u015Flemi" }, /* @__PURE__ */ React.createElement("button", { type: "button", role: "tab", "aria-selected": login, disabled: busy, onClick: () => change("login") }, "Giri\u015F yap"), /* @__PURE__ */ React.createElement("button", { type: "button", role: "tab", "aria-selected": register, disabled: busy, onClick: () => change("register") }, "Kay\u0131t ol")), /* @__PURE__ */ React.createElement("header", { className: "entry439-form-heading" }, /* @__PURE__ */ React.createElement("p", { className: "entry439-kicker" }, register ? registrationOnly ? "\xDCCRETS\u0130Z \xD6N KAYIT" : "YEN\u0130 HESAP" : forgot || reset ? "HESAP KURTARMA" : "TEKRAR HO\u015E GELD\u0130N"), /* @__PURE__ */ React.createElement("h1", { id: "entry439-form-title" }, title), /* @__PURE__ */ React.createElement("p", null, register ? registrationOnly ? "Hesab\u0131n\u0131 \u015Fimdi olu\u015Ftur, tam s\xFCr\xFCm a\xE7\u0131ld\u0131\u011F\u0131nda haz\u0131r ol." : "Hesab\u0131n\u0131 olu\u015Ftur ve d\xFCnyaya ilk ad\u0131m\u0131n\u0131 at." : forgot ? "E-posta adresine tek kullan\u0131ml\u0131k bir ba\u011Flant\u0131 g\xF6ndeririz." : reset ? "Hesab\u0131n i\xE7in en az 9 karakterli yeni bir parola se\xE7." : restrictedAccess && registrationOnly ? "Bu alan yaln\u0131z y\xF6netici taraf\u0131ndan izin verilen hesaplar i\xE7indir." : "Kullan\u0131c\u0131 ad\u0131n veya e-postanla giri\u015F yap.")), /* @__PURE__ */ React.createElement("form", { className: "entry439-form", onSubmit: submit, "aria-busy": busy }, (register || login) && /* @__PURE__ */ React.createElement("label", { htmlFor: "entry439-username" }, login ? "Kullan\u0131c\u0131 ad\u0131 veya e-posta" : "Kullan\u0131c\u0131 ad\u0131", /* @__PURE__ */ React.createElement("input", { id: "entry439-username", name: "username", autoComplete: "username", autoCapitalize: "none", spellCheck: false, value: username, onChange: (e2) => setUsername(e2.target.value), minLength: register ? 3 : 1, maxLength: register ? 24 : 254, required: true, disabled: busy }), register && /* @__PURE__ */ React.createElement("small", null, "3\u201324 karakter. Oyuna giri\u015Fte kullanaca\u011F\u0131n ad.")), (register || forgot) && /* @__PURE__ */ React.createElement("label", { htmlFor: "entry439-email" }, "E-posta", /* @__PURE__ */ React.createElement("input", { id: "entry439-email", name: "email", type: "email", autoComplete: "email", autoCapitalize: "none", spellCheck: false, value: email, onChange: (e2) => setEmail(e2.target.value), required: true, disabled: busy })), !forgot && /* @__PURE__ */ React.createElement("label", { htmlFor: "entry439-password" }, reset ? "Yeni parola" : "Parola", /* @__PURE__ */ React.createElement("span", { className: "entry439-password" }, /* @__PURE__ */ React.createElement("input", { id: "entry439-password", name: "password", type: reveal ? "text" : "password", autoComplete: login ? "current-password" : "new-password", value: password, onChange: (e2) => setPassword(e2.target.value), minLength: login ? 1 : 9, maxLength: 128, required: true, disabled: busy }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setReveal((v2) => !v2), "aria-pressed": reveal, "aria-label": reveal ? "Parolay\u0131 gizle" : "Parolay\u0131 g\xF6ster" }, reveal ? "Gizle" : "G\xF6ster")), !login && /* @__PURE__ */ React.createElement("small", null, "En az 9 karakter kullan.")), (register || reset) && /* @__PURE__ */ React.createElement("label", { htmlFor: "entry439-confirmation" }, "Parola tekrar", /* @__PURE__ */ React.createElement("input", { id: "entry439-confirmation", name: "passwordConfirmation", type: reveal ? "text" : "password", autoComplete: "new-password", value: confirmation, onChange: (e2) => setConfirmation(e2.target.value), minLength: 9, maxLength: 128, required: true, disabled: busy }), confirmation && password !== confirmation && /* @__PURE__ */ React.createElement("small", { className: "entry439-field-error" }, "Parolalar hen\xFCz e\u015Fle\u015Fmiyor.")), register && RegistrationChallenge && /* @__PURE__ */ React.createElement(RegistrationChallenge, { retry: captchaRetry, onChange: (id, answer) => setCaptcha({ id, answer }) }), " ", register && launchEmailAvailable && /* @__PURE__ */ React.createElement("label", { className: "entry439-consent" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: consent, onChange: (e2) => setConsent(e2.target.checked), disabled: busy }), /* @__PURE__ */ React.createElement("span", null, "Oyun açılmadan 15 dakika önce bana e-posta gönder.")), message && /* @__PURE__ */ React.createElement("p", { className: "entry439-message", role: "status", "aria-live": "polite" }, message), /* @__PURE__ */ React.createElement("button", { className: "entry439-primary entry439-submit", disabled: busy || (register || reset) && password !== confirmation }, busy ? "\u0130\u015Flemin tamamlan\u0131yor\u2026" : register ? registrationOnly ? "\xD6n kayd\u0131m\u0131 tamamla" : "Hesab\u0131m\u0131 olu\u015Ftur" : forgot ? "S\u0131f\u0131rlama ba\u011Flant\u0131s\u0131 g\xF6nder" : reset ? "Parolam\u0131 yenile" : registrationOnly ? "Hesab\u0131m\u0131 do\u011Frula" : "Giri\u015F yap"), login && /* @__PURE__ */ React.createElement("button", { type: "button", className: "entry439-text-link", disabled: busy, onClick: () => change("forgot") }, "Parolam\u0131 unuttum"), forgot && !registrationOnly && /* @__PURE__ */ React.createElement("button", { type: "button", className: "entry439-text-link", onClick: () => change("login") }, "Giri\u015F ekran\u0131na d\xF6n"), (reset || forgot && registrationOnly) && /* @__PURE__ */ React.createElement("a", { className: "entry439-text-link", href: "/" }, "Ana sayfaya d\xF6n")), /* @__PURE__ */ React.createElement("div", { className: "entry439-form-footer" }, /* @__PURE__ */ React.createElement("a", { href: "/rehber" }, "Oyuncu rehberi"), /* @__PURE__ */ React.createElement("a", { href: discord, target: "_blank", rel: "noopener noreferrer" }, "Discord toplulu\u011Fu")), registrationOnly && register && /* @__PURE__ */ React.createElement("p", { className: "entry439-register-note" }, "\xD6n kay\u0131t \xFCcretsizdir. Tam s\xFCr\xFCm hen\xFCz a\xE7\u0131lmad\u0131."))), /* @__PURE__ */ React.createElement(Footer, null));
  }
  return { Landing, AuthPanel };
}
function createDirectRealm426UI({ useState, useEffect, useRef, jsx, jsxs, fetcher = fetch }) {
  async function destination(csrf, search, signal, entryOrigin) {
    const query = new URLSearchParams(search), realmId = query.get("realm"), state = query.get("state");
    if (realmId && state) {
      if (realmId !== "r1") throw Error("\u015Eu anda yaln\u0131z \xC7ekirdek sunucusu a\xE7\u0131k. Yeniden ba\u011Flan.");
      const response2 = await fetcher("/api/realm/issue", { method: "POST", headers: { "content-type": "application/json", "x-csrf-token": csrf }, body: JSON.stringify({ realmId, state }), signal });
      const result = await response2.json();
      if (!response2.ok || !result.destination) throw Error(result.error || "Oyuna ba\u011Flant\u0131 kurulamad\u0131.");
      return result.destination;
    }
    if (typeof entryOrigin === "string") {
      try {
        const url = new URL(entryOrigin);
        if (url.protocol === "https:" && url.origin === entryOrigin) return url.origin + "/api/realm/begin";
      } catch {
      }
    }
    const response = await fetcher("/api/realm/catalog", { cache: "no-store", signal });
    if (!response.ok) throw Error("Sunucuya ula\u015F\u0131lamad\u0131. Yeniden dene.");
    const realm = (await response.json()).realms?.find((r2) => r2.id === "r1");
    if (!realm?.origin) throw Error("\xC7ekirdek sunucusu \u015Fu anda kullan\u0131lam\u0131yor.");
    return realm.origin.replace(/\/$/, "") + "/api/realm/begin";
  }
  function DirectRealmEntry426({ csrf, onLogout, isAdmin, entryOrigin }) {
    const [error, setError] = useState(""), [retry, setRetry] = useState(0), request = useRef(null);
    useEffect(() => {
      let active = true;
      setError("");
      if (!request.current || request.current.retry !== retry || request.current.csrf !== csrf || request.current.entryOrigin !== entryOrigin) {
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 1e4);
        request.current = { retry, csrf, entryOrigin, promise: destination(csrf, location.search, controller.signal, entryOrigin).finally(() => clearTimeout(timer)) };
      }
      request.current.promise.then((url) => {
        if (active) location.assign(url);
      }).catch((e2) => {
        if (!active) return;
        history.replaceState({}, "", "/");
        setError(e2.name === "AbortError" ? "Ba\u011Flant\u0131 zaman a\u015F\u0131m\u0131na u\u011Frad\u0131. Yeniden dene." : e2.message);
      });
      return () => {
        active = false;
      };
    }, [csrf, retry, entryOrigin]);
    return jsxs("main", { className: "auth-loading", children: [
      !error && jsx("span", { className: "auth-core" }),
      jsx("strong", { children: error ? "Ba\u011Flant\u0131 kurulamad\u0131" : "CORE OF LIFE" }),
      error && jsx("p", { role: "alert", children: error }),
      error && jsx("button", { type: "button", onClick: () => setRetry((v2) => v2 + 1), children: "Yeniden dene" }),
      error && jsx("button", { type: "button", onClick: onLogout, children: "Hesaptan \xE7\u0131k" }),
      error && isAdmin && jsx("a", { href: "/realm-admin", children: "Sunucu y\xF6netimi" })
    ] });
  }
  return { DirectRealmEntry426, destination };
}
function col422MapSource(source) {
  if (source === "/game/rune-coast-v422.webp" && typeof window !== "undefined" && window.matchMedia("(pointer: coarse), (max-width: 900px)").matches) return "/game/rune-coast-mobile-v422.webp";
  return source;
}
function col422Image(source, priority = "auto") {
  if (typeof window === "undefined" || typeof Image === "undefined") return null;
  source = col422MapSource(source);
  if (!/^\/game\/(?:bazaar-village|dark-forest-map-expanded-v3|rune-coast(?:-mobile)?-v422)\.webp$/.test(source)) return null;
  const pool = globalThis.__col422MapImages ??= /* @__PURE__ */ new Map();
  let image = pool.get(source);
  if (image?.complete && !image.naturalWidth) {
    pool.delete(source);
    image = null;
  }
  if (image) {
    pool.delete(source);
    pool.set(source, image);
    if (priority === "high") image.fetchPriority = "high";
    return image;
  }
  image = new Image();
  image.decoding = "async";
  image.fetchPriority = priority;
  image.addEventListener("error", () => {
    if (pool.get(source) === image) pool.delete(source);
  }, { once: true });
  pool.set(source, image);
  while (pool.size > 3) pool.delete(pool.keys().next().value);
  image.src = source;
  return image;
}
function col422WarmMaps(area = "bazaar") {
  if (typeof window === "undefined") return;
  const bazaar = "/game/bazaar-village.webp", forest = "/game/dark-forest-map-expanded-v3.webp";
  col422Image(area === "forest" ? forest : area === "rune" ? "/game/rune-coast-v422.webp" : bazaar, "high");
  if (!navigator.connection?.saveData) {
    col422Image(bazaar, area === "bazaar" ? "high" : "auto");
    col422Image(forest, area === "forest" ? "high" : "auto");
  }
}
function col422StoreEntry(instance, entry) {
  if (typeof window === "undefined") return;
  delete globalThis.__col422Entry;
  const area = typeof entry?.area === "string" ? entry.area : "bazaar";
  col422WarmMaps(area);
  if (!entry || !Number.isInteger(entry.capacity) || entry.capacity < 1 || !Array.isArray(entry.channels) || entry.channels.length !== 3) return;
  const rows = entry.channels;
  if (rows.some((row, index) => row?.id !== index + 1 || !Number.isInteger(row.online) || row.online < 0 || typeof row.name !== "string")) return;
  globalThis.__col422Entry = { instance, area, channels: rows, capacity: entry.capacity, balance504: entry.balance504, expiresAt: Date.now() + 15e3, consumed: false };
}
function col422Entry(instance, consume = false) {
  if (typeof window === "undefined") return null;
  const entry = globalThis.__col422Entry;
  if (!entry || entry.instance !== instance || entry.expiresAt < Date.now()) return null;
  if (consume) {
    if (entry.consumed) return null;
    entry.consumed = true;
  }
  return entry;
}
function col422ClearEntry(instance) {
  if (typeof window !== "undefined" && globalThis.__col422Entry?.instance === instance) delete globalThis.__col422Entry;
}
const __vite__mapDeps = (i2, m2 = __vite__mapDeps, d2 = m2.f || (m2.f = ["assets/game-client-core511-r1005-c1b79e848ab12ec5.js", "assets/rolldown-runtime-S-ySWqyJ-ga4172.js", "assets/index-D6eonq7K-ga4172-v418ws-3c02836-e510-8225403c2fcc-90f5b4ab25.js", "assets/framework-CXnKph_e-ga4172.js", "assets/launch-landing-qVKrjo7K-ga4172-prereg-1788-e486-48ff1d5b32ef-74b8821e.js", "assets/createLucideIcon-BiVFlVzr-ga4172.js", "assets/launch-landing-CAftBWzJ.css", "assets/monster-loot-a2QO0cPh-ga4172-92bdd7a4-bab8-e499-fab4fcb1e1b2-f4f682b8.js", "assets/monster-loot-CwYNLkQv.css", "assets/game-instance-559vKpBT-ga4172-prereg-1788d-e486-48ff1d5b32ef-6a1e68bc.js", "assets/circle-check-CykMSVzB-ga4172.js", "assets/game-client-BaAq3GeO.css"])) => i2.map((i3) => d2[i3]);
import { r as e } from "./rolldown-runtime-S-ySWqyJ-ga4172.js";
import { i as t, r as n } from "./framework-CXnKph_e-ga4172.js";
import { c as r, t as i } from "./index-D6eonq7K-ga4172-v418ws-3c02836-e510-8225403c2fcc-90f5b4ab25.js";
import { t as a } from "./createLucideIcon-BiVFlVzr-ga4172.js";
import { F as o, N as s, P as c, j as l, n as u, t as d } from "./launch-landing-qVKrjo7K-ga4172-prereg-1788-e486-48ff1d5b32ef-74b8821e.js";
import { c as f, f as p, h as m, m as h, n as g, o as _, p as v, r as y, s as b, u as x } from "./game-instance-559vKpBT-ga4172-prereg-1788d-e486-48ff1d5b32ef-6a1e68bc.js";
var S = a(`at-sign`, [[`circle`, { cx: `12`, cy: `12`, r: `4`, key: `4exip2` }], [`path`, { d: `M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8`, key: `7n84p3` }]]), C = a(`book-open`, [[`path`, { d: `M12 5v16`, key: `1f6ucr` }], [`path`, { d: `M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z`, key: `1fyvmf` }]]), w = a(`external-link`, [[`path`, { d: `M15 3h6v6`, key: `1q9fwt` }], [`path`, { d: `M10 14 21 3`, key: `gplh6r` }], [`path`, { d: `M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6`, key: `a6xqqp` }]]), T = a(`log-in`, [[`path`, { d: `m10 17 5-5-5-5`, key: `1bsop3` }], [`path`, { d: `M15 12H3`, key: `6jk70r` }], [`path`, { d: `M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4`, key: `u53s6r` }]]), E = a(`triangle-alert`, [[`path`, { d: `m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3`, key: `wmoenq` }], [`path`, { d: `M12 9v4`, key: `juzpu7` }], [`path`, { d: `M12 17h.01`, key: `p32p05` }]]), D = e(t(), 1), O = n(), k = { open: `A\xE7\u0131k`, full: `Dolu`, closed: `Kapal\u0131`, maintenance: `Bak\u0131mda`, unavailable: `Durum do\u011Frulanam\u0131yor` };
function A({ accountName: e2, realms: t2, onSelect: n2, onRefresh: r2, onLogout: i2 }) {
  let [a2, o2] = (0, D.useState)(null), [l2, u2] = (0, D.useState)(``);
  async function d2(e3, t3) {
    if (!a2) {
      o2(e3), u2(``);
      try {
        await t3();
      } catch (e4) {
        u2(e4 instanceof Error ? e4.message : `\u0130\u015Flem tamamlanamad\u0131. Tekrar dene.`);
      } finally {
        o2(null);
      }
    }
  }
  return (0, O.jsxs)(`main`, { className: `auth-shell realm-shell`, children: [(0, O.jsx)(`div`, { className: `auth-backdrop` }), (0, O.jsxs)(`section`, { className: `auth-card realm-panel`, "aria-labelledby": `realm-title`, children: [(0, O.jsxs)(`header`, { className: `realm-heading`, children: [(0, O.jsx)(`span`, { className: `auth-world-kicker`, children: `YA\u015EAM \xC7EK\u0130RDE\u011E\u0130` }), (0, O.jsx)(`h1`, { id: `realm-title`, children: `D\xFCnyan\u0131 se\xE7` }), (0, O.jsxs)(`p`, { children: [`Ho\u015F geldin, `, (0, O.jsx)(`strong`, { children: e2 }), `. Her sunucuda karakterin, e\u015Fyalar\u0131n ve pazar\u0131n ayr\u0131d\u0131r.`] })] }), (0, O.jsx)(`div`, { className: `realm-list`, children: t2.map((e3) => {
    let t3 = !e3.character && !e3.registrationOpen, r3 = e3.status === `open`;
    return (0, O.jsxs)(`article`, { className: `realm-choice`, children: [(0, O.jsxs)(`div`, { className: `realm-choice-top`, children: [(0, O.jsx)(`h2`, { children: e3.name }), (0, O.jsx)(`span`, { className: `realm-status realm-status-${e3.status === "open" && e3.online >= e3.capacity * 0.65 ? "busy" : e3.status}`, children: k[e3.status] })] }), (0, O.jsx)(`p`, { className: `realm-population`, children: e3.online === null ? `Doluluk bilgisi bekleniyor` : `${e3.online} / ${e3.capacity} oyuncu` }), (0, O.jsx)(`div`, { className: `realm-channels`, "aria-label": `${e3.name} kanallar\u0131`, children: [0, 1, 2].map((t4) => (0, O.jsxs)(`span`, { children: [`CH`, t4 + 1, ` `, (0, O.jsxs)(`strong`, { children: [e3.channels?.[t4] ?? `\u2014`, `/`, e3.channelCapacity] })] }, t4)) }), (0, O.jsx)(`p`, { className: `realm-character`, children: e3.character ? `${e3.character.name} \xB7 Seviye ${e3.character.level}` : t3 ? `Yeni karakter kayd\u0131 kapal\u0131. Mevcut karakterinle devam edebilirsin.` : `Karakterin varsa devam et; yoksa yeni karakter olu\u015Ftur.` }), (0, O.jsxs)(`button`, { type: `button`, className: `auth-submit realm-enter`, disabled: !r3 || a2 !== null, onClick: () => void d2(e3.id, () => n2(e3.id)), children: [a2 === e3.id ? `Ba\u011Flan\u0131l\u0131yor\u2026` : r3 ? `SUNUCUYA G\u0130R` : t3 && e3.status === `open` ? `YEN\u0130 KARAKTERE KAPALI` : k[e3.status].toLocaleUpperCase(`tr-TR`), r3 && (0, O.jsx)(m, { "aria-hidden": `true` })] })] }, e3.id);
  }) }), !t2.length && (0, O.jsx)(`p`, { role: `status`, children: `Sunucu listesi \u015Fu anda al\u0131nam\u0131yor. Yenileyerek tekrar dene.` }), l2 && (0, O.jsx)(`p`, { className: `auth-message`, role: `alert`, children: l2 }), (0, O.jsxs)(`footer`, { className: `realm-footer`, children: [(0, O.jsxs)(`span`, { children: [(0, O.jsx)(s, { "aria-hidden": `true` }), ` Hesab\u0131n ortak, maceran sunucuya \xF6zel.`] }), (0, O.jsxs)(`button`, { type: `button`, className: `auth-link`, disabled: a2 !== null, onClick: () => void d2(`refresh`, r2), children: [(0, O.jsx)(c, { "aria-hidden": `true` }), ` Listeyi yenile`] }), (0, O.jsx)(`button`, { type: `button`, className: `auth-link`, disabled: a2 !== null, onClick: i2, children: `\xC7\u0131k\u0131\u015F yap` })] })] })] });
}
function j({ accountName: e2, csrf: t2, onLogout: n2, isAdmin: r2 }) {
  let [i2, a2] = (0, D.useState)([]), [o2, s2] = (0, D.useState)(``), c2 = async () => {
    let e3 = await fetch(`/api/realm/catalog`, { cache: `no-store` });
    if (!e3.ok) throw Error(`Sunucu listesi al\u0131namad\u0131.`);
    a2((await e3.json()).realms);
  };
  return (0, D.useEffect)(() => {
    let e3 = true, n3 = new URLSearchParams(location.search), r3 = n3.get(`realm`), i3 = n3.get(`state`);
    async function a3() {
      if (r3 && i3) {
        let n4 = await fetch(`/api/realm/issue`, { method: `POST`, headers: { "content-type": `application/json`, "x-csrf-token": t2 }, body: JSON.stringify({ realmId: r3, state: i3 }) }), a4 = await n4.json();
        if (!n4.ok) throw Error(a4.error ?? `Sunucuya giri\u015F tamamlanamad\u0131.`);
        e3 && location.assign(a4.destination);
        return;
      }
      await c2();
    }
    return a3().catch((t3) => {
      e3 && (history.replaceState({}, ``, `/`), s2(t3.message), c2().catch(() => {
      }));
    }), () => {
      e3 = false;
    };
  }, [t2]), (0, O.jsxs)(O.Fragment, { children: [r2 && (0, O.jsx)(`a`, { className: `auth-link`, href: `/realm-admin`, children: `Sunucu ve hesap y\xF6netimi` }), o2 && (0, O.jsx)(`p`, { className: `auth-message`, role: `alert`, children: o2 }), (0, O.jsx)(A, { accountName: e2, realms: i2, onRefresh: c2, onLogout: n2, onSelect: async (e3) => {
    let t3 = i2.find((t4) => t4.id === e3);
    if (!t3?.origin) throw Error(`Sunucu bulunamad\u0131.`);
    location.assign(t3.origin + `/api/realm/begin`);
  } })] });
}
function M({ children: e2, accountId: t2, onReady: n2 }) {
  let [r2, i2] = (0, D.useState)(false), [a2, o2] = (0, D.useState)(`CORE OF LIFE`), [s2, c2] = (0, D.useState)(0), [l2, u2] = (0, D.useState)(true), d2 = (0, D.useRef)(null);
  return (0, D.useEffect)(() => {
    let e3 = d2.current ?? crypto.randomUUID();
    d2.current = e3, _(e3);
    let r3 = false, a3 = false, s3 = false, l3 = false, f2 = Date.now(), p2 = false, m2 = () => {
      let e4 = document.cookie.split(`;`).map((e5) => e5.trim()).find((e5) => e5.startsWith(`__Host-yasam-csrf=`) || e5.startsWith(`yasam-csrf-local=`));
      return e4 ? decodeURIComponent(e4.slice(e4.indexOf(`=`) + 1)) : ``;
    }, h2 = (n3, r4 = false, i3) => globalThis.fetch(`/api/game-presence`, { method: `POST`, keepalive: r4, signal: i3, headers: { "content-type": `application/json`, "x-csrf-token": m2(), [y]: e3 }, body: JSON.stringify({ action: n3, accountId: t2 }) }), v2 = () => {
      col422ClearEntry(e3);
      s3 && (s3 = false, h2(`release`, true).catch(() => void 0));
    }, x2 = (e4) => {
      a3 = true, i2(false), o2(e4), v2();
    }, S2 = (e4) => x2(e4.detail || `Oyun ba\u011Flant\u0131s\u0131 sona erdi. Yeniden ba\u011Flan.`), C2 = () => {
      document.hidden ? x2(`Oyun arka plana al\u0131nd\u0131. Devam etmek i\xE7in yeniden ba\u011Flan.`) : a3 && c2((e4) => e4 + 1);
    }, w2 = () => {
      f2 = Date.now();
    }, T2 = () => x2(`Oyun penceresi kapat\u0131ld\u0131. Yeniden ba\u011Flan.`), E2 = () => {
      a3 && !document.hidden && c2((e4) => e4 + 1);
    };
    i2(false), u2(true), o2(`CORE OF LIFE`);
    let D2 = new AbortController(), O2 = window.setTimeout(() => D2.abort(), 12e3);
    h2(`claim`, false, D2.signal).then(async (e4) => {
      let t3 = await e4.json();
      if (!e4.ok) throw Error(t3.error || `Oyun oturumu a\xE7\u0131lamad\u0131.`);
      if (s3 = true, r3 || a3 || document.hidden) {
        v2();
        return;
      }
      if (!(t3.player === null || t3.player && typeof t3.player.id == `string` && typeof t3.player.name == `string` && typeof t3.player.role == `string`)) throw Error(`Karakter bilgisi do\u011Frulanamad\u0131. Sayfay\u0131 yenileyip tekrar ba\u011Flan.`);
      p2 = t3.idleExempt === true, col422StoreEntry(e4, t3.entry), window.dispatchEvent(new CustomEvent("coreoflife:presence-claimed", { detail: { instance: d2.current } })), n2(t3.player), b(t3.chatAfterId), i2(true);
    }).catch((e4) => {
      v2(), r3 || o2(D2.signal.aborted ? `Ba\u011Flant\u0131 zaman a\u015F\u0131m\u0131na u\u011Frad\u0131. Yeniden ba\u011Flan.` : e4 instanceof Error ? e4.message : `Ba\u011Flant\u0131 kurulamad\u0131.`);
    }).finally(() => {
      window.clearTimeout(O2), r3 || u2(false);
    });
    let k2 = window.setInterval(async () => {
      if (!(!s3 || r3 || a3 || l3)) {
        l3 = true;
        try {
          let e4 = await h2(`renew`);
          if (e4.ok) {
            let t3 = await e4.json(), n3 = p2;
            if (p2 = t3.idleExempt === true, (p2 || n3) && (f2 = Date.now()), Date.now() - f2 >= 9e5) {
              x2(`15 dakika i\u015Flem yap\u0131lmad\u0131\u011F\u0131 i\xE7in oyun kapat\u0131ld\u0131. Yeniden ba\u011Flanabilirsin.`);
              return;
            }
          } else {
            let t3 = await e4.json().catch(() => ({ error: `Oturum yenilenemedi.` }));
            !r3 && (e4.status === 401 || e4.status === 403 || e4.status === 409) && x2(t3.error || `Oturum s\xFCresi doldu.`);
          }
        } catch {
        } finally {
          l3 = false;
        }
      }
    }, 1e4);
    for (let e4 of [`pointerdown`, `pointermove`, `keydown`, `wheel`]) window.addEventListener(e4, w2, { passive: true });
    return document.addEventListener(`visibilitychange`, C2), window.addEventListener(`pagehide`, T2), window.addEventListener(`pageshow`, E2), window.addEventListener(g, S2), () => {
      r3 = true, D2.abort(), window.clearTimeout(O2), window.clearInterval(k2), v2();
      for (let e4 of [`pointerdown`, `pointermove`, `keydown`, `wheel`]) window.removeEventListener(e4, w2);
      document.removeEventListener(`visibilitychange`, C2), window.removeEventListener(`pagehide`, T2), window.removeEventListener(`pageshow`, E2), window.removeEventListener(g, S2);
    };
  }, [s2, t2, n2]), r2 ? e2 : (0, O.jsxs)(`main`, { className: `auth-loading`, children: [(0, O.jsx)(`strong`, { children: a2 }), (0, O.jsx)(`button`, { type: `button`, disabled: l2, onClick: () => c2((e3) => e3 + 1), children: `Yeniden ba\u011Flan` })] });
}
function N(e2) {
  let t2 = e2.userAgent;
  if (/Edg(?:A|iOS)?\/|OPR\/|OPiOS\/|Opera|Firefox\/|FxiOS\/|SamsungBrowser\/|Vivaldi\/|YaBrowser\/|Whale\/|Brave\/|DuckDuckGo\/|; wv[;) ]/i.test(t2)) return false;
  let n2 = e2.userAgentData?.brands?.map((e3) => e3.brand.toLowerCase()) ?? [];
  return n2.some((e3) => /edge|opera|brave|vivaldi|samsung|duckduckgo/.test(e3)) ? false : n2.includes(`google chrome`) ? true : n2.length > 0 ? false : /(?:Chrome|CriOS)\/\d+/i.test(t2);
}
var P = [{ label: `Opera`, href: `https://www.opera.com/download` }, { label: `Microsoft Edge`, href: `https://www.microsoft.com/edge/download` }, { label: `Firefox`, href: `https://www.mozilla.org/firefox/new/` }];
function F({ accountId: e2, children: t2 }) {
  let [n2, r2] = (0, D.useState)(`checking`), i2 = `coreoflife-chrome-warning:${e2}`;
  return (0, D.useEffect)(() => {
    let e3 = true;
    return (async () => {
      let t3 = N(navigator), n3 = navigator.brave;
      if (t3 && n3?.isBrave) {
        let e4 = 0;
        try {
          await Promise.race([n3.isBrave(), new Promise((t4) => {
            e4 = window.setTimeout(() => t4(false), 2e3);
          })]) && (t3 = false);
        } catch {
        } finally {
          window.clearTimeout(e4);
        }
      }
      if (e3) {
        if (!t3) {
          r2(`ready`);
          return;
        }
        try {
          r2(sessionStorage.getItem(i2) === `accepted` ? `ready` : `warning`);
        } catch {
          r2(`warning`);
        }
      }
    })(), () => {
      e3 = false;
    };
  }, [i2]), n2 === `checking` ? (0, O.jsxs)(`main`, { className: `auth-loading`, children: [(0, O.jsx)(`span`, { className: `auth-core` }), (0, O.jsx)(`strong`, { children: `CORE OF LIFE` })] }) : n2 === `ready` ? (0, O.jsx)(O.Fragment, { children: t2 }) : (0, O.jsxs)(`main`, { className: `auth-shell chrome-entry-shell`, children: [(0, O.jsx)(`div`, { className: `auth-backdrop` }), (0, O.jsxs)(`section`, { className: `chrome-entry-card`, role: `alert`, "aria-labelledby": `chrome-entry-title`, children: [(0, O.jsx)(E, { className: `chrome-entry-icon`, "aria-hidden": `true` }), (0, O.jsx)(`p`, { className: `chrome-entry-eyebrow`, children: `TARAYICI UYARISI` }), (0, O.jsx)(`h1`, { id: `chrome-entry-title`, children: `Google Chrome ile oyun sorun \xE7\u0131karabilir` }), (0, O.jsx)(`p`, { children: `Chrome kullanan baz\u0131 oyuncular yeni haritada tak\u0131lma ve y\xFCksek gecikme bildirdi. Daha sorunsuz bir oyun i\xE7in ba\u015Fka bir taray\u0131c\u0131dan giri\u015F yapman\u0131 \xF6neriyoruz.` }), (0, O.jsx)(`div`, { className: `chrome-entry-links`, "aria-label": `\xD6nerilen taray\u0131c\u0131lar`, children: P.map((e3) => (0, O.jsxs)(`a`, { href: e3.href, target: `_blank`, rel: `noopener noreferrer`, children: [e3.label, (0, O.jsx)(w, { size: 16, "aria-hidden": `true` })] }, e3.label)) }), (0, O.jsx)(`button`, { type: `button`, className: `chrome-entry-continue`, onClick: () => {
    try {
      sessionStorage.setItem(i2, `accepted`);
    } catch {
    }
    r2(`ready`);
  }, children: `Yine de Chrome ile devam et` })] })] });
}
var I = (0, D.lazy)(colPreloadGame);
function L() {
  let e2 = document.cookie.split(`;`).map((e3) => e3.trim()), t2 = e2.find((e3) => e3.startsWith(`__Host-yasam-csrf=`)) ?? e2.find((e3) => e3.startsWith(`yasam-csrf-local=`));
  return t2 ? decodeURIComponent(t2.slice(t2.indexOf(`=`) + 1)) : ``;
}
async function R(e2, t2, n2 = false, r2) {
  let i2 = await fetch(e2, { method: t2 ? `POST` : `GET`, cache: `no-store`, signal: r2, headers: { ...t2 ? { "content-type": `application/json` } : {}, ...n2 ? { "x-csrf-token": L() } : {} }, ...t2 ? { body: JSON.stringify(t2) } : {} });
  let a2;
  try { a2 = await i2.json(); } catch (error) {
    if (![500, 502, 503, 504].includes(i2.status)) {
      if (error && typeof error === 'object') error.entryStatusR93 = i2.status;
      throw error;
    }
    const unavailable = new Error('Sunucu şu an yanıt veremiyor. Biraz sonra yeniden deneyebilirsin.');
    unavailable.entryStatusR93 = i2.status;
    throw unavailable;
  }
  if (!i2.ok && (a2 === null || typeof a2 !== 'object')) {
    const invalid = Error('İşlem tamamlanamadı. Yeniden deneyebilirsin.');
    invalid.entryStatusR93 = i2.status;
    throw invalid;
  }
  if (!i2.ok && a2.code === "account_origin_required") {
    location.replace("/api/realm/begin");
    throw Error("G\xFCvenli giri\u015F sayfas\u0131na y\xF6nlendiriliyorsun.");
  }
  if (!i2.ok) {
    const error = Error(a2.error ?? a2.message ?? `\u0130\u015Flem tamamlanamad\u0131.`);
    error.entryStatusR93 = i2.status;
    if (typeof a2.code === 'string') error.entryCodeR97 = a2.code;
    throw error;
  }
  return a2;
}
// Bounded entry-only requests. Never retries a POST or a gameplay command.
const ENTRY_REQUEST_MS_R93 = 15000;
const ENTRY_RETRY_MS_R93 = 500;

function entryCancelledR93() {
  const error = new Error('Giriş isteği yenilendi.');
  error.name = 'AbortError';
  return error;
}

function entryTimedOutR93() {
  const error = new Error('Bağlantı gecikti. Yeniden deneyebilirsin.');
  error.name = 'EntryTimeoutR93';
  return error;
}

function entryTransientR93(error) {
  return [502, 503, 504].includes(error?.entryStatusR93) ||
    ['EntryTimeoutR93', 'AbortError', 'TimeoutError', 'TypeError'].includes(error?.name);
}

function entryRestoreMessageR93(error) {
  if ([502, 503, 504].includes(error?.entryStatusR93))
    return 'Sunucu şu an yanıt veremiyor. Biraz sonra yeniden deneyebilirsin.';
  if (['EntryTimeoutR93', 'AbortError', 'TimeoutError'].includes(error?.name))
    return 'Bağlantı gecikti. Yeniden deneyebilirsin.';
  if (error?.name === 'TypeError')
    return 'Sunucuya ulaşılamadı. Bağlantını kontrol edip yeniden dene.';
  return error?.message || 'Hesap bilgisi alınamadı. Bağlantını kontrol edip yeniden dene.';
}

function entryRetryWaitR93(signal) {
  if (signal?.aborted) return Promise.reject(entryCancelledR93());
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(entryCancelledR93()); };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ENTRY_RETRY_MS_R93);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

async function entryAttemptR93(request, path, body, csrf, ownerSignal) {
  if (ownerSignal?.aborted) throw entryCancelledR93();
  const controller = new AbortController();
  let timer, abortOwner;
  const interrupted = new Promise((resolve, reject) => {
    abortOwner = () => {
      reject(entryCancelledR93());
      controller.abort();
    };
    ownerSignal?.addEventListener('abort', abortOwner, { once: true });
    timer = setTimeout(() => {
      // Settle the deadline independently of fetch: even an adapter ignoring
      // AbortSignal cannot keep the entry screen waiting forever.
      reject(entryTimedOutR93());
      controller.abort();
    }, ENTRY_REQUEST_MS_R93);
  });
  const pending = Promise.resolve().then(() => {
    if (ownerSignal?.aborted || controller.signal.aborted) throw entryCancelledR93();
    return request(path, body, csrf, controller.signal);
  });
  try {
    const result = await Promise.race([pending, interrupted]);
    if (ownerSignal?.aborted) throw entryCancelledR93();
    return result;
  } finally {
    clearTimeout(timer);
    ownerSignal?.removeEventListener('abort', abortOwner);
  }
}

async function entryRequestR93(request, path, body, csrf, ownerSignal) {
  // /redeem consumes a one-use code; /logout changes account state. Their
  // uncertain outcomes MUST NOT be blindly replayed. Only the session read
  // gets one new attempt, with a fresh controller and its own full deadline.
  const attempts = path === '/api/auth/me' && body === undefined ? 2 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await entryAttemptR93(request, path, body, csrf, ownerSignal);
    } catch (error) {
      if (ownerSignal?.aborted || !entryTransientR93(error) || attempt + 1 === attempts) throw error;
      await entryRetryWaitR93(ownerSignal);
    }
  }
}

// Entry-only recovery. Never replays a redeem POST or accepts an old session.
const ENTRY_RECOVERY_KEY_R97 = 'coreoflife:entry-recovery-r97';
const ENTRY_RECOVERY_WINDOW_R97 = 120000;
const ENTRY_RECOVERY_LIMIT_R97 = 2;
const ENTRY_RECOVERY_DELAY_R97 = 1500;
const ENTRY_RECOVERY_NAV_WAIT_R97 = 5000;

function entryRecoverableR97(error) {
  const status = Number(error?.entryStatusR93);
  if ([400, 401, 403, 404, 409, 422, 429].includes(status)) return false;
  if (['invalid_entry_state', 'invalid_state', 'security_changed', 'authentication_required',
       'account_suspended', 'account_missing', 'realm_closed', 'game_maintenance',
       'channel_full', 'rate_limited', 'entry_already_used'].includes(error?.entryCodeR97)) return false;
  if ([500, 502, 503, 504].includes(status)) return true;
  return ['EntryTimeoutR93', 'TimeoutError', 'AbortError', 'TypeError'].includes(error?.name);
}

function entryBudgetR97(storage, now) {
  const encoded = storage.getItem(ENTRY_RECOVERY_KEY_R97);
  if (encoded === null) return { version: 1, startedAt: now, count: 0 };
  let value;
  try { value = JSON.parse(encoded); } catch { return null; }
  if (!value || value.version !== 1 || !Number.isSafeInteger(value.count) || value.count < 0 ||
      value.count >= ENTRY_RECOVERY_LIMIT_R97 || !Number.isSafeInteger(value.startedAt) ||
      value.startedAt < 0 || now < value.startedAt || now - value.startedAt > ENTRY_RECOVERY_WINDOW_R97) return null;
  // Expiry does NOT reset the count: slow redirect chains cannot loop forever.
  return { version: 1, startedAt: value.startedAt, count: value.count };
}

function clearEntryRecoveryR97(host = globalThis.window) {
  try { host.sessionStorage.removeItem(ENTRY_RECOVERY_KEY_R97); } catch {}
}

function entryWaitR97(ms, { signal, host, document, navigator, setTimer, clearTimer }) {
  return new Promise(resolve => {
    let done = false, timer;
    const finish = value => {
      if (done) return;
      done = true;
      clearTimer(timer);
      signal?.removeEventListener('abort', cancel);
      document.removeEventListener('visibilitychange', visibility);
      host.removeEventListener('offline', cancel);
      resolve(value);
    };
    const cancel = () => finish(false);
    const visibility = () => { if (document.hidden) finish(false); };
    timer = setTimer(() => finish(!signal?.aborted && !document.hidden && navigator.onLine !== false), ms);
    signal?.addEventListener('abort', cancel, { once: true });
    document.addEventListener('visibilitychange', visibility);
    host.addEventListener('offline', cancel, { once: true });
    if (signal?.aborted || document.hidden || navigator.onLine === false) finish(false);
  });
}

async function recoverRealmEntryR97(error, {
  signal, code, state, onRecover = () => {}, host = globalThis.window,
  document = globalThis.document, navigator = globalThis.navigator,
  now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout,
  navigate = path => host.location.replace(path),
} = {}) {
  if (!entryRecoverableR97(error) || !/^[-_A-Za-z0-9]{43}$/.test(code ?? '') ||
      !/^[-_A-Za-z0-9]{43}$/.test(state ?? '') || signal?.aborted ||
      document.hidden || navigator.onLine === false) return false;
  let storage;
  try {
    storage = host.sessionStorage;
    if (!entryBudgetR97(storage, now())) return false;
  } catch { return false; }
  onRecover();
  const environment = { signal, host, document, navigator, setTimer, clearTimer };
  if (!await entryWaitR97(ENTRY_RECOVERY_DELAY_R97, environment)) return false;
  // Reserve synchronously immediately before navigation; no credentials are
  // persisted. Readback prevents unavailable storage from making a loop.
  try {
    const next = entryBudgetR97(storage, now());
    if (!next || signal?.aborted || document.hidden || navigator.onLine === false) return false;
    next.count++;
    const encoded = JSON.stringify(next);
    storage.setItem(ENTRY_RECOVERY_KEY_R97, encoded);
    if (storage.getItem(ENTRY_RECOVERY_KEY_R97) !== encoded) return false;
    if (signal?.aborted || document.hidden || navigator.onLine === false) return false;
    navigate('/api/realm/begin');
  } catch { return false; }
  // Real navigation unloads the old portal. If navigation is blocked, retain
  // the manual controls after a bounded wait instead of an endless spinner.
  await entryWaitR97(ENTRY_RECOVERY_NAV_WAIT_R97, environment);
  return false;
}

function createEntryPortal({ useState, useEffect, useRef, useCallback, jsx, jsxs, Fragment, Suspense, GameClient, preloadGame, authRequest, csrfCookie, LaunchLanding, RealmSelectionGate, ChromeEntryGate, GamePresenceGate, AuthPanel, GAME_SESSION_ENDED_EVENT }) {
  const {ServerGate:DirectRealmEntry426,CharacterGate:CharacterGateR101}=createRealmEntryR101({useState,useEffect,useRef,jsx,jsxs,assets:{"hero":"/assets/entry-r101-hero-811184a70c46c463.webp","forest":"/assets/entry-r101-forest-f7f2499b8023e59d.webp","muhafiz":"/assets/entry-r101-muhafiz-271bc99205a8d378.webp","avci":"/assets/entry-r101-avci-1da2d89b2f4c0927.webp","arkanist":"/assets/entry-r101-arkanist-a38c736b24529fb4.webp"}});
  return function AuthPortal({ resetToken = "", earlyAccessCheck = false, realmLogin = false }) {
    const [serverRealm, setServerRealm] = useState(realmLogin), [accountOrigin, setAccountOrigin] = useState("");
    const isRealm = realmLogin || serverRealm;
    const [session, setSession] = useState(null), [checking, setChecking] = useState(true), [restoreError, setRestoreError] = useState(""), [authRetry, setAuthRetry] = useState(0);
    const [entryNoticeR97, setEntryNoticeR97] = useState("");
    const [launch, setLaunch] = useState(null), [launchError, setLaunchError] = useState(false), [launchRetry, setLaunchRetry] = useState(0);
    const [authOpen, setAuthOpen] = useState(false), [wantPlay, setWantPlay] = useState(false), [away, setAway] = useState(false), [replaced, setReplaced] = useState(false);
    const [mode, setMode] = useState(resetToken ? "reset" : "login"), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
    const preloadRef = useRef(false);
    const warmGame = () => {
      if (preloadRef.current) return;
      preloadRef.current = true;
      void preloadGame().catch(() => {
        preloadRef.current = false;
      });
    };
    useEffect(() => {
      const maintenance = () => {
        setWantPlay(false);
        setAway(false);
        setLaunchRetry((v2) => v2 + 1);
      };
      window.addEventListener("coreoflife:maintenance", maintenance);
      return () => window.removeEventListener("coreoflife:maintenance", maintenance);
    }, []);
    const launchRef = useRef(null);
    launchRef.current = launch;
    useEffect(() => {
      let active = true;
      const controller = new AbortController();
      setChecking(true);
      setRestoreError("");
      setEntryNoticeR97("");
      const restore = async () => {
        const query = new URLSearchParams(location.search);
        try {
          if (isRealm && query.get("admin") === "1") sessionStorage.setItem("col-admin-return", "1");
        } catch {
        }
        if (query.get("logout") === "1") {
          await entryRequestR93(authRequest, "/api/auth/logout", {}, true, controller.signal);
          history.replaceState({}, "", "/");
          try {
            sessionStorage.removeItem("col-admin-return");
          } catch {
          }
        }
        const params = new URLSearchParams(location.hash.slice(1));
        if (params.has("realmCode")) {
          const code = params.get("realmCode"), state = params.get("realmState");
          history.replaceState({}, "", "/");
          try {
            await entryRequestR93(authRequest, "/api/realm/redeem", { code, state }, false, controller.signal);
          } catch (error) {
            await recoverRealmEntryR97(error, {
              signal: controller.signal, code, state,
              onRecover: () => { if (active) setEntryNoticeR97("Bağlantı yenileniyor..."); }
            });
            // Never fall back to an old account cookie after an uncertain
            // redeem. A new authorized handshake is the only automatic path.
            throw error;
          }
          if (active) setWantPlay(true);
        } else if (query.has("realm") && query.has("state")) {
          if (active) setWantPlay(true);
        }
        return entryRequestR93(authRequest, "/api/auth/me", void 0, false, controller.signal);
      };
      restore().then((result) => {
        if (!active) return;
        if (result.launch) {
          setLaunch(result.launch);
          setLaunchError(false);
        }
        if (result.authenticated) {
          if (result.account) clearEntryRecoveryR97();
          setWantPlay(true);
          if (result.account && isRealm && result.launch?.canPlay) {
            warmGame();
            col422WarmMaps();
          }
        }
        if (typeof result.authOrigin === "string") {
          const origin = new URL(result.authOrigin);
          if (origin.protocol === "https:" && origin.origin === result.authOrigin) {
            setAccountOrigin(origin.origin);
            setServerRealm(true);
            if (resetToken) {
              location.replace(origin.origin + "/reset-password?token=" + encodeURIComponent(resetToken));
              return;
            }
            if (!result.authenticated && !result.launch?.showLanding) {
              location.replace("/api/realm/begin");
              return;
            }
          }
        }
        if (result.authenticated && result.account) setSession({ ...result, authenticated: true, player: result.player ?? null });
        else setSession(null);
      }).catch((error) => {
        if (active) setRestoreError(entryRestoreMessageR93(error));
      }).finally(() => {
        if (active) setChecking(false);
      });
      return () => {
        active = false;
        controller.abort();
      };
    }, [authRetry]);
    useEffect(() => {
      if (checking || restoreError) return;
      return startLaunchRefresh478({ getStatus: () => launchRef.current, isPlaying: () => !!session && !!launchRef.current?.canPlay && (wantPlay || !launchRef.current?.showLanding) && !away, initialRefresh: !launchRef.current || launchRetry > 0, request: (signal) => authRequest("/api/launch", void 0, false, signal), onStatus: (data) => {
        launchRef.current = data;
        setLaunch(data);
        setLaunchError(false);
      }, onError: () => setLaunchError(true) });
    }, [checking, restoreError, session?.account.id, launchRetry, wantPlay, away]);
    useEffect(() => {
      if (resetToken) history.replaceState({}, "", "/reset-password");
    }, [resetToken]);
    useEffect(() => {
      const ended = () => {
        setLaunchRetry((v2) => v2 + 1);
        setAway(true);
        setReplaced(true);
        setWantPlay(false);
        setMessage("Oyun oturumu sona erdi. Hesab\u0131n kay\u0131tl\u0131; yeniden ba\u011Flanabilirsin.");
      };
      window.addEventListener(GAME_SESSION_ENDED_EVENT, ended);
      return () => window.removeEventListener(GAME_SESSION_ENDED_EVENT, ended);
    }, []);
    useEffect(() => {
      if (isRealm && session?.authenticated) {
        try {
          if (sessionStorage.getItem("col-admin-return") === "1") {
            sessionStorage.removeItem("col-admin-return");
            location.replace("/admin");
          }
        } catch {
        }
      }
    }, [isRealm, session?.authenticated]);
    useEffect(() => {
      if (session && !session.realmSelection && launch?.canPlay && (wantPlay || !launch.showLanding) && !away) warmGame();
    }, [session?.account.id, session?.realmSelection, launch?.canPlay, launch?.showLanding, wantPlay, away]);
    const logout = useCallback(async () => {
      try {
        const result = await authRequest("/api/auth/logout", {}, true);
        setSession(null);
        setLaunch(null);
        setMode("login");
        setWantPlay(false);
        setAuthOpen(false);
        setAway(false);
        setReplaced(false);
        location.assign(result.redirectUrl || "/");
      } catch (error) {
        setMessage(error?.message || "Hesaptan \xE7\u0131k\u0131lamad\u0131. Yeniden dene.");
      }
    }, []);
    const accountId = session?.account.id;
    const restoreCharacter = useCallback((player) => setSession((current) => current && current.account.id === accountId ? { ...current, player } : current), [accountId]);
    const play = () => {
      if (replaced && isRealm) {
        location.assign("/api/realm/begin");
        return;
      }
      setAway(false);
      setReplaced(false);
      setWantPlay(true);
      setMessage("");
    };
    const loading = (text) => jsxs("main", { className: "auth-loading", children: [jsx("span", { className: "auth-core" }), jsx("strong", { children: text })] });
    if (launch?.phase === "maintenance" && !launch.canPlay) return jsxs("main", { className: "maintenance425", children: [jsxs("section", { className: "maintenance425-card", children: [jsx("img", { src: "/game/maintenance-heroes-v425.webp", width: 1536, height: 1024, alt: "Sava\u015F\xE7\u0131, ok\xE7u ve b\xFCy\xFCc\xFC \xE7ekirde\u011Fin bak\u0131m\u0131n\u0131 yap\u0131yor." }), jsxs("div", { className: "maintenance425-copy", children: [jsx("h1", { children: "Oyun \u015Fu an bak\u0131mda" }), jsx("p", { children: "\xC7ekirdekte bak\u0131m \xE7al\u0131\u015Fmalar\u0131 s\xFCr\xFCyor. Yeniden a\xE7\u0131ld\u0131\u011F\u0131nda macerana devam edebilirsin." }), jsx("p", { className: "maintenance425-message", role: "status", "aria-live": "polite", children: launch.maintenanceText || "Bak\u0131mla ilgili yeni bilgiler burada payla\u015F\u0131lacak." }), jsx("p", { children: "A\xE7\u0131l\u0131\u015F ve bak\u0131m duyurular\u0131n\u0131 resmi hesaplar\u0131m\u0131zdan takip edebilirsin. Macerada g\xF6r\xFC\u015Fmek \xFCzere!" }), jsxs("nav", { className: "maintenance494-social", "aria-label": "Resmi sosyal hesaplar", children: [jsx("a", { href: "https://www.instagram.com/webcoreoflife", target: "_blank", rel: "noopener noreferrer", children: "Instagram" }), jsx("a", { href: "https://discord.gg/sCbQh9D8r", target: "_blank", rel: "noopener noreferrer", children: "Discord" })] }), session?.account.realmAdmin && jsx("a", { className: "auth-link", href: isRealm ? "/admin" : "/realm-admin", children: "Y\xF6netici paneli" }), session && jsx("button", { type: "button", onClick: () => void logout(), children: "Hesaptan \xE7\u0131k" })] })] })] });
    if (checking) return loading(entryNoticeR97 || "CORE OF LIFE");
    if (restoreError) return jsxs("main", { className: "auth-loading", children: [jsx("p", { role: "alert", children: restoreError }), jsx("button", { type: "button", onClick: () => setAuthRetry((v2) => v2 + 1), children: "Yeniden dene" }), isRealm && jsx("a", { href: "/api/realm/begin", children: "Hesab\u0131mla yeniden ba\u011Flan" })] });
    if (isRealm && !session && !launch?.showLanding) return jsxs("main", { className: "auth-loading", children: [jsx("strong", { children: "\xC7ekirdek sunucusuna giri\u015F" }), jsx("p", { children: message || "Kay\u0131tl\u0131 hesab\u0131nla g\xFCvenli giri\u015F yap." }), jsx("a", { href: "/api/realm/begin", className: "primary-button", children: "Hesab\u0131mla devam et" })] });
    if (launchError && !launch) return jsxs("main", { className: "auth-loading", children: [jsx("p", { children: "Sunucu bilgisi al\u0131namad\u0131." }), jsx("button", { type: "button", onClick: () => setLaunchRetry((v2) => v2 + 1), children: "Yeniden dene" })] });
    if (!launch) return loading("CORE OF LIFE");
    if (away) return jsxs("main", { className: "auth-loading", children: [jsx("strong", { children: session?.account.username }), jsx("p", { children: message || "Hesab\u0131n kay\u0131tl\u0131. Haz\u0131r oldu\u011Funda oyuna d\xF6nebilirsin." }), jsx("button", { type: "button", onClick: play, children: "Oyuna d\xF6n" }), jsx("button", { type: "button", onClick: () => void logout(), children: "Hesaptan \xE7\u0131k" })] });
    if (!resetToken && (launch.showLanding && !(session && launch.canPlay && wantPlay) && (session || !authOpen && !earlyAccessCheck) || !session && !authOpen && !earlyAccessCheck)) return jsx(LaunchLanding, { status: launch, account: session?.account.username, onRegister: () => {
      if (isRealm) {
        location.assign(accountOrigin || "/api/realm/begin");
        return;
      }
      setMode("register");
      setAuthOpen(true);
    }, onLogin: () => {
      if (isRealm) {
        location.assign("/api/realm/begin");
        return;
      }
      setMode("login");
      setAuthOpen(true);
    }, onPlay: play, onLogout: () => void logout() });
    if (session?.realmSelection && launch.canPlay && !resetToken) return jsx(DirectRealmEntry426, { isAdmin: session.account.realmAdmin, accountName: session.account.username, csrf: session.csrfToken ?? csrfCookie(), entryOrigin: session.realmEntryOrigin, onLogout: () => void logout() });
    if (session && launch.canPlay && !resetToken) return jsx(ChromeEntryGate, { accountId: session.account.id, children: jsx(CharacterGateR101,{accountName:session.account.username,csrf:session.csrfToken??csrfCookie(),onLogout:()=>void logout(),onSelected:restoreCharacter,children:jsx(GamePresenceGate, { accountId: session.account.id, onReady: restoreCharacter, children: jsx(Suspense, { fallback: loading("CORE OF LIFE"), children: jsx(GameClient, { initialPlayer: session.player, accountName: session.account.username, onLogout: () => void logout() }) }) })}) }, session.account.id);
    if (isRealm) return jsxs("main", { className: "auth-loading", children: [jsx("p", { children: "Hesap i\u015Flemleri i\xE7in g\xFCvenli giri\u015F sayfas\u0131na devam et." }), jsx("a", { href: resetToken && accountOrigin ? accountOrigin + "/reset-password?token=" + encodeURIComponent(resetToken) : accountOrigin || "/api/realm/begin", className: "primary-button", children: "Hesab\u0131mla devam et" })] });
    return jsxs(Fragment, { children: [null, jsx(AuthPanel, { launchEmailAvailable: launch.emailPreference?.available, registrationOnly: launch.showLanding && !launch.canPlay, restrictedAccess: earlyAccessCheck, mode, setMode, busy, setBusy, message, setMessage, resetToken, onAuthenticated: (next) => {
      setSession(next);
      setLaunch(next.launch ?? null);
      setWantPlay(true);
      setAuthOpen(false);
    } })] });
  };
}
let colGamePromise;
function colPreloadGame() {
  return colGamePromise ??= (() => i(() => import("./game-client-core511-r1005-c1b79e848ab12ec5.js"), __vite__mapDeps([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])))().catch((error) => {
    colGamePromise = null;
    throw error;
  });
}
const z = createEntryPortal({ ...D, jsx: O.jsx, jsxs: O.jsxs, Fragment: O.Fragment, GameClient: I, preloadGame: colPreloadGame, authRequest: R, csrfCookie: L, LaunchLanding: d, RealmSelectionGate: j, ChromeEntryGate: F, GamePresenceGate: M, AuthPanel: B, GAME_SESSION_ENDED_EVENT: f });
function B(props) {
  return D.createElement(col439Site.AuthPanel, props);
}
export { z as default };
const col439Site = createEntrySite439({ React: D, authRequest: R, RegistrationChallenge: p, unlockEntryAudio: x });
