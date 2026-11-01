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
  const opening478 = Date.parse("2026-10-10T19:00:00+03:00");
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
    const date = React.useMemo(() => new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", weekday: "long" }).format(opening), [opening]);
    const time = React.useMemo(() => new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(opening), [opening]);
    const parts = remaining === null ? null : [Math.floor(remaining / 86400), Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60];
    return /* @__PURE__ */ React.createElement("section", { className: `entry478-launch${open ? " entry478-launch-open" : ""}`, "aria-label": "Core of Life a\xE7\u0131l\u0131\u015F\u0131" }, /* @__PURE__ */ React.createElement("div", { className: "entry478-launch-heading" }, /* @__PURE__ */ React.createElement("span", { className: "entry478-eyebrow" }, /* @__PURE__ */ React.createElement("i", { "aria-hidden": "true" }), open ? "MACERA BA\u015ELADI" : maintenance || ended || paused ? "SUNUCU DURUMU" : "B\xDCY\xDCK A\xC7ILI\u015E"), /* @__PURE__ */ React.createElement("span", { className: "entry478-timezone" }, "T\xFCrkiye saati \xB7 UTC+3")), maintenance || ended || paused ? /* @__PURE__ */ React.createElement("div", { className: "entry478-launch-state", role: "status" }, /* @__PURE__ */ React.createElement("strong", null, maintenance ? "K\u0131sa bir mola." : "Oyun \u015Fu anda kapal\u0131."), /* @__PURE__ */ React.createElement("p", null, maintenance ? status.maintenanceText || "Giri\u015F yeniden a\xE7\u0131ld\u0131\u011F\u0131nda buradan devam edebilirsin." : paused ? "A\xE7\u0131l\u0131\u015F takvimi y\xF6netici taraf\u0131ndan duraklat\u0131ld\u0131." : "Giri\u015F yeniden a\xE7\u0131ld\u0131\u011F\u0131nda buradan devam edebilirsin.")) : open ? /* @__PURE__ */ React.createElement("div", { className: "entry478-launch-state", role: "status" }, /* @__PURE__ */ React.createElement("strong", null, "Core of Life seni bekliyor."), /* @__PURE__ */ React.createElement("p", null, "Hesab\u0131n\u0131 olu\u015Ftur veya giri\u015F yap; kendi efsaneni yaz.")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "entry478-date" }, /* @__PURE__ */ React.createElement("time", { dateTime: new Date(opening).toISOString() }, date), /* @__PURE__ */ React.createElement("strong", null, time)), /* @__PURE__ */ React.createElement("div", { className: "entry478-countdown", role: "timer", "aria-live": "off", "aria-label": "A\xE7\u0131l\u0131\u015Fa kalan s\xFCre" }, ["G\xFCn", "Saat", "Dakika", "Saniye"].map((label, i) => /* @__PURE__ */ React.createElement("div", { key: label }, /* @__PURE__ */ React.createElement("strong", null, parts ? String(parts[i]).padStart(2, "0") : "\u2014"), /* @__PURE__ */ React.createElement("span", null, label)))), /* @__PURE__ */ React.createElement("p", { className: "entry478-countdown-note", role: "status" }, remaining === 0 ? "A\xE7\u0131l\u0131\u015F saati geldi. Sunucunun giri\u015F durumu yenileniyor\u2026" : remaining === null ? "Geri say\u0131m sunucu saatiyle e\u015Fitleniyor\u2026" : "Geri say\u0131m bitti\u011Finde maceraya buradan kat\u0131l.")));
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
    return /* @__PURE__ */ React.createElement("main", { className: "entry439 entry439-home" }, /* @__PURE__ */ React.createElement("div", { className: "entry439-scenery", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("header", { className: "entry439-header" }, /* @__PURE__ */ React.createElement(Brand, null), /* @__PURE__ */ React.createElement("nav", { "aria-label": "Ana gezinme" }, /* @__PURE__ */ React.createElement("a", { href: "/rehber" }, "Oyunu ke\u015Ffet"), /* @__PURE__ */ React.createElement("a", { className: "entry478-social-link", href: discord, target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement(SocialIcon, { platform: "discord" }), /* @__PURE__ */ React.createElement("span", null, "Discord")), /* @__PURE__ */ React.createElement("a", { className: "entry478-social-link", href: instagram, target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement(SocialIcon, { platform: "instagram" }), /* @__PURE__ */ React.createElement("span", null, "Instagram")), !account && open && /* @__PURE__ */ React.createElement("button", { type: "button", className: "entry439-nav-login", onClick: onLogin }, "Oyuna giri\u015F"), account && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onLogout }, "\xC7\u0131k\u0131\u015F yap"))), /* @__PURE__ */ React.createElement("section", { className: "entry439-hero-section" }, /* @__PURE__ */ React.createElement("div", { className: "entry439-intro" }, preview && /* @__PURE__ */ React.createElement("p", { className: "entry439-preview" }, "\xD6n izleme \xB7 Eri\u015Fim izinleri de\u011Fi\u015Fmez"), /* @__PURE__ */ React.createElement(LaunchCountdown478, { status, open, preview }), /* @__PURE__ */ React.createElement("h1", null, "Yeni bir d\xFCnya.", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("em", null, "Senin hik\xE2yen.")), /* @__PURE__ */ React.createElement("p", { className: "entry439-lead" }, "Kahraman\u0131n\u0131 se\xE7, dostlar\u0131nla g\xFC\xE7len, kendi efsaneni yaz. PC, tablet ve telefondan ", /* @__PURE__ */ React.createElement("strong", null, "indirmeden, taray\u0131c\u0131nda oyna.")), /* @__PURE__ */ React.createElement("div", { className: "entry439-actions" }, account ? status.canPlay ? /* @__PURE__ */ React.createElement("button", { type: "button", className: "entry439-primary", onClick: onPlay }, "Oyuna giri\u015F ", /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2192")) : /* @__PURE__ */ React.createElement("div", { className: "entry439-confirmation", role: "status" }, /* @__PURE__ */ React.createElement("strong", null, maintenance ? "Hesab\u0131n haz\u0131r" : "\xD6n kayd\u0131n tamamland\u0131", ", ", account, "."), /* @__PURE__ */ React.createElement("span", null, maintenance ? "Oyun yeniden a\xE7\u0131ld\u0131\u011F\u0131nda bu ekrandan devam edebilirsin." : "A\xE7\u0131l\u0131\u015Fta oyuna giri\u015F d\xFC\u011Fmesi burada g\xF6r\xFCnecek.")) : /* @__PURE__ */ React.createElement(React.Fragment, null, status.registrationOpen && /* @__PURE__ */ React.createElement("button", { type: "button", className: "entry439-primary", onClick: onRegister }, open ? "Kay\u0131t ol" : "\xDCcretsiz \xF6n kay\u0131t ol", " ", /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2192")), open && /* @__PURE__ */ React.createElement("button", { type: "button", className: "entry439-secondary", onClick: onLogin }, "Oyuna giri\u015F"))), /* @__PURE__ */ React.createElement("p", { className: "entry439-platforms" }, /* @__PURE__ */ React.createElement("span", { className: "entry478-platform-mark", "aria-hidden": "true" }, "\u2713"), " \xDCcretsiz oyna ", /* @__PURE__ */ React.createElement("i", null), " PC \xB7 Tablet \xB7 Mobil"), /* @__PURE__ */ React.createElement("div", { className: "entry478-social-cards", "aria-label": "Core of Life toplulu\u011Fu" }, /* @__PURE__ */ React.createElement("a", { className: "entry457-discord", href: discord, target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement(SocialIcon, { platform: "discord" }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, "Discord\u2019a kat\u0131l"), /* @__PURE__ */ React.createElement("small", null, "Yol arkada\u015Flar\u0131n seni bekliyor.")), /* @__PURE__ */ React.createElement("span", { className: "entry478-community-arrow", "aria-hidden": "true" }, "\u2197")), /* @__PURE__ */ React.createElement("a", { className: "entry457-discord entry478-instagram", href: instagram, target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement(SocialIcon, { platform: "instagram" }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, "Instagram\u2019da takip et"), /* @__PURE__ */ React.createElement("small", null, "@webcoreoflife")), /* @__PURE__ */ React.createElement("span", { className: "entry478-community-arrow", "aria-hidden": "true" }, "\u2197"))), account && LaunchEmailPreference && /* @__PURE__ */ React.createElement(LaunchEmailPreference, { preference: status.emailPreference, preview })), /* @__PURE__ */ React.createElement("div", { className: "entry439-hero-art entry457-hero-media" }, /* @__PURE__ */ React.createElement(Preview457, null), /* @__PURE__ */ React.createElement("p", { className: "entry478-video-note" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2726"), " \xDC\xE7 s\u0131n\u0131f. Bir d\xFCnya. Say\u0131s\u0131z macera."))), /* @__PURE__ */ React.createElement("div", { className: "entry439-lower" }, /* @__PURE__ */ React.createElement(Gift, null), /* @__PURE__ */ React.createElement("section", { className: "entry439-community" }, /* @__PURE__ */ React.createElement("span", { className: "entry439-kicker" }, "MACERA B\u0130RL\u0130KTE DAHA G\xDCZEL"), /* @__PURE__ */ React.createElement("h2", null, "Birlikte daha g\xFC\xE7l\xFCs\xFCn."), /* @__PURE__ */ React.createElement("p", null, "Loncan\u0131 kur, zindanlar\u0131 ke\u015Ffet ve bu d\xFCnyan\u0131n hik\xE2yesinde yerini al."), /* @__PURE__ */ React.createElement("a", { className: "entry439-secondary entry478-social-link", href: discord, target: "_blank", rel: "noopener noreferrer" }, /* @__PURE__ */ React.createElement(SocialIcon, { platform: "discord" }), "Discord\u2019a kat\u0131l"), /* @__PURE__ */ React.createElement("a", { className: "entry439-text-link", href: "https://coreoflifetanitim.com/", target: "_blank", rel: "noopener noreferrer" }, "Oyunu ve rehberi ke\u015Ffet"))), children, LaunchInformation && /* @__PURE__ */ React.createElement("details", { className: "entry439-more" }, /* @__PURE__ */ React.createElement("summary", null, "iPhone ile nas\u0131l oynan\u0131r?"), /* @__PURE__ */ React.createElement("div", { className: "entry439-more-content" }, LaunchInformation && /* @__PURE__ */ React.createElement(LaunchInformation, null))), /* @__PURE__ */ React.createElement(Footer, null));
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
        if (register) setCaptchaRetry((v) => v + 1);
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    }
    return /* @__PURE__ */ React.createElement("main", { className: "entry439 entry439-auth" }, /* @__PURE__ */ React.createElement("div", { className: "entry439-scenery", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("header", { className: "entry439-header" }, /* @__PURE__ */ React.createElement(Brand, null), /* @__PURE__ */ React.createElement("a", { className: "entry439-home-link", href: "/" }, "Ana sayfa")), /* @__PURE__ */ React.createElement("div", { className: "entry439-auth-layout" }, /* @__PURE__ */ React.createElement("section", { className: "entry439-auth-story" }, /* @__PURE__ */ React.createElement("p", { className: "entry439-kicker" }, "CORE OF LIFE"), /* @__PURE__ */ React.createElement("h2", null, "Her efsane", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("em", null, "bir ad\u0131mla ba\u015Flar.")), /* @__PURE__ */ React.createElement("p", null, "Kahraman\u0131n\u0131 geli\u015Ftir, yeni b\xF6lgeleri ke\u015Ffet.", /* @__PURE__ */ React.createElement("br", null), "Bu d\xFCnyada senin de bir yerin var."), /* @__PURE__ */ React.createElement(Heroes, null), registrationOnly && register && /* @__PURE__ */ React.createElement("div", { className: "entry439-auth-gift" }, /* @__PURE__ */ React.createElement("img", { src: "/game/starter-pet.webp", width: "88", height: "88", alt: "Ba\u015Flang\u0131\xE7 Tilkisi" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "\xD6n kay\u0131t hediyen haz\u0131r."), /* @__PURE__ */ React.createElement("span", null, "50 M\xFCcevher \xB7 10 K\u0131rm\u0131z\u0131 \u0130ksir", /* @__PURE__ */ React.createElement("br", null), "3 g\xFCnl\xFCk Ba\u015Flang\u0131\xE7 Tilkisi")))), /* @__PURE__ */ React.createElement("section", { className: "entry439-form-card", "aria-labelledby": "entry439-form-title" }, !registrationOnly && !forgot && !reset && /* @__PURE__ */ React.createElement("div", { className: "entry439-tabs", role: "tablist", "aria-label": "Hesap i\u015Flemi" }, /* @__PURE__ */ React.createElement("button", { type: "button", role: "tab", "aria-selected": login, disabled: busy, onClick: () => change("login") }, "Giri\u015F yap"), /* @__PURE__ */ React.createElement("button", { type: "button", role: "tab", "aria-selected": register, disabled: busy, onClick: () => change("register") }, "Kay\u0131t ol")), /* @__PURE__ */ React.createElement("header", { className: "entry439-form-heading" }, /* @__PURE__ */ React.createElement("p", { className: "entry439-kicker" }, register ? registrationOnly ? "\xDCCRETS\u0130Z \xD6N KAYIT" : "YEN\u0130 HESAP" : forgot || reset ? "HESAP KURTARMA" : "TEKRAR HO\u015E GELD\u0130N"), /* @__PURE__ */ React.createElement("h1", { id: "entry439-form-title" }, title), /* @__PURE__ */ React.createElement("p", null, register ? registrationOnly ? "Hesab\u0131n\u0131 \u015Fimdi olu\u015Ftur, tam s\xFCr\xFCm a\xE7\u0131ld\u0131\u011F\u0131nda haz\u0131r ol." : "Hesab\u0131n\u0131 olu\u015Ftur ve d\xFCnyaya ilk ad\u0131m\u0131n\u0131 at." : forgot ? "E-posta adresine tek kullan\u0131ml\u0131k bir ba\u011Flant\u0131 g\xF6ndeririz." : reset ? "Hesab\u0131n i\xE7in en az 9 karakterli yeni bir parola se\xE7." : restrictedAccess && registrationOnly ? "Bu alan yaln\u0131z y\xF6netici taraf\u0131ndan izin verilen hesaplar i\xE7indir." : "Kullan\u0131c\u0131 ad\u0131n veya e-postanla giri\u015F yap.")), /* @__PURE__ */ React.createElement("form", { className: "entry439-form", onSubmit: submit, "aria-busy": busy }, (register || login) && /* @__PURE__ */ React.createElement("label", { htmlFor: "entry439-username" }, login ? "Kullan\u0131c\u0131 ad\u0131 veya e-posta" : "Kullan\u0131c\u0131 ad\u0131", /* @__PURE__ */ React.createElement("input", { id: "entry439-username", name: "username", autoComplete: "username", autoCapitalize: "none", spellCheck: false, value: username, onChange: (e) => setUsername(e.target.value), minLength: register ? 3 : 1, maxLength: register ? 24 : 254, required: true, disabled: busy }), register && /* @__PURE__ */ React.createElement("small", null, "3\u201324 karakter. Oyuna giri\u015Fte kullanaca\u011F\u0131n ad.")), (register || forgot) && /* @__PURE__ */ React.createElement("label", { htmlFor: "entry439-email" }, "E-posta", /* @__PURE__ */ React.createElement("input", { id: "entry439-email", name: "email", type: "email", autoComplete: "email", autoCapitalize: "none", spellCheck: false, value: email, onChange: (e) => setEmail(e.target.value), required: true, disabled: busy })), !forgot && /* @__PURE__ */ React.createElement("label", { htmlFor: "entry439-password" }, reset ? "Yeni parola" : "Parola", /* @__PURE__ */ React.createElement("span", { className: "entry439-password" }, /* @__PURE__ */ React.createElement("input", { id: "entry439-password", name: "password", type: reveal ? "text" : "password", autoComplete: login ? "current-password" : "new-password", value: password, onChange: (e) => setPassword(e.target.value), minLength: login ? 1 : 9, maxLength: 128, required: true, disabled: busy }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setReveal((v) => !v), "aria-pressed": reveal, "aria-label": reveal ? "Parolay\u0131 gizle" : "Parolay\u0131 g\xF6ster" }, reveal ? "Gizle" : "G\xF6ster")), !login && /* @__PURE__ */ React.createElement("small", null, "En az 9 karakter kullan.")), (register || reset) && /* @__PURE__ */ React.createElement("label", { htmlFor: "entry439-confirmation" }, "Parola tekrar", /* @__PURE__ */ React.createElement("input", { id: "entry439-confirmation", name: "passwordConfirmation", type: reveal ? "text" : "password", autoComplete: "new-password", value: confirmation, onChange: (e) => setConfirmation(e.target.value), minLength: 9, maxLength: 128, required: true, disabled: busy }), confirmation && password !== confirmation && /* @__PURE__ */ React.createElement("small", { className: "entry439-field-error" }, "Parolalar hen\xFCz e\u015Fle\u015Fmiyor.")), register && RegistrationChallenge && /* @__PURE__ */ React.createElement(RegistrationChallenge, { retry: captchaRetry, onChange: (id, answer) => setCaptcha({ id, answer }) }), " ", register && launchEmailAvailable && /* @__PURE__ */ React.createElement("label", { className: "entry439-consent" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: consent, onChange: (e) => setConsent(e.target.checked), disabled: busy }), /* @__PURE__ */ React.createElement("span", null, "Oyun a\xE7\u0131l\u0131nca bana e-posta g\xF6nder.")), message && /* @__PURE__ */ React.createElement("p", { className: "entry439-message", role: "status", "aria-live": "polite" }, message), /* @__PURE__ */ React.createElement("button", { className: "entry439-primary entry439-submit", disabled: busy || (register || reset) && password !== confirmation }, busy ? "\u0130\u015Flemin tamamlan\u0131yor\u2026" : register ? registrationOnly ? "\xD6n kayd\u0131m\u0131 tamamla" : "Hesab\u0131m\u0131 olu\u015Ftur" : forgot ? "S\u0131f\u0131rlama ba\u011Flant\u0131s\u0131 g\xF6nder" : reset ? "Parolam\u0131 yenile" : registrationOnly ? "Hesab\u0131m\u0131 do\u011Frula" : "Giri\u015F yap"), login && /* @__PURE__ */ React.createElement("button", { type: "button", className: "entry439-text-link", disabled: busy, onClick: () => change("forgot") }, "Parolam\u0131 unuttum"), forgot && !registrationOnly && /* @__PURE__ */ React.createElement("button", { type: "button", className: "entry439-text-link", onClick: () => change("login") }, "Giri\u015F ekran\u0131na d\xF6n"), (reset || forgot && registrationOnly) && /* @__PURE__ */ React.createElement("a", { className: "entry439-text-link", href: "/" }, "Ana sayfaya d\xF6n")), /* @__PURE__ */ React.createElement("div", { className: "entry439-form-footer" }, /* @__PURE__ */ React.createElement("a", { href: "/rehber" }, "Oyuncu rehberi"), /* @__PURE__ */ React.createElement("a", { href: discord, target: "_blank", rel: "noopener noreferrer" }, "Discord toplulu\u011Fu")), registrationOnly && register && /* @__PURE__ */ React.createElement("p", { className: "entry439-register-note" }, "\xD6n kay\u0131t \xFCcretsizdir. Tam s\xFCr\xFCm hen\xFCz a\xE7\u0131lmad\u0131."))), /* @__PURE__ */ React.createElement(Footer, null));
  }
  return { Landing, AuthPanel };
}


function createDirectRealm426UI({useState,useEffect,useRef,jsx,jsxs,fetcher=fetch}){
 async function destination(csrf,search,signal,entryOrigin){
  const query=new URLSearchParams(search),realmId=query.get('realm'),state=query.get('state');
  if(realmId&&state){
   if(realmId!=='r1')throw Error('Şu anda yalnız Çekirdek sunucusu açık. Yeniden bağlan.');
   const response=await fetcher('/api/realm/issue',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify({realmId,state}),signal});
   const result=await response.json();
   if(!response.ok||!result.destination)throw Error(result.error||'Oyuna bağlantı kurulamadı.');
   return result.destination;
  }
  // The authenticated response already knows the fixed R1 origin. Avoid the
  // catalog's extra HTTP round trip and health probe; admission remains on
  // begin/issue/redeem and every original security check still runs.
  if(typeof entryOrigin==='string'){
   try{const url=new URL(entryOrigin);if(url.protocol==='https:'&&url.origin===entryOrigin)return url.origin+'/api/realm/begin';}catch{}
  }
  const response=await fetcher('/api/realm/catalog',{cache:'no-store',signal});
  if(!response.ok)throw Error('Sunucuya ulaşılamadı. Yeniden dene.');
  const realm=(await response.json()).realms?.find(r=>r.id==='r1');
  if(!realm?.origin)throw Error('Çekirdek sunucusu şu anda kullanılamıyor.');
  return realm.origin.replace(/\/$/,'')+'/api/realm/begin';
 }
 function DirectRealmEntry426({csrf,onLogout,isAdmin,entryOrigin}){
  const [error,setError]=useState(''),[retry,setRetry]=useState(0),request=useRef(null);
  useEffect(()=>{
   let active=true;setError('');
   // Reuse an in-flight one-time ticket request when effects are replayed.
   if(!request.current||request.current.retry!==retry||request.current.csrf!==csrf||request.current.entryOrigin!==entryOrigin){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    request.current={retry,csrf,entryOrigin,promise:destination(csrf,location.search,controller.signal,entryOrigin).finally(()=>clearTimeout(timer))};
   }
   request.current.promise.then(url=>{if(active)location.assign(url);}).catch(e=>{
    if(!active)return;history.replaceState({},'','/');setError(e.name==='AbortError'?'Bağlantı zaman aşımına uğradı. Yeniden dene.':e.message);
   });
   return()=>{active=false;};
  },[csrf,retry,entryOrigin]);
  return jsxs('main',{className:'auth-loading',children:[
   !error&&jsx('span',{className:'auth-core'}),
   jsx('strong',{children:error?'Bağlantı kurulamadı':'CORE OF LIFE'}),
   error&&jsx('p',{role:'alert',children:error}),
   error&&jsx('button',{type:'button',onClick:()=>setRetry(v=>v+1),children:'Yeniden dene'}),
   error&&jsx('button',{type:'button',onClick:onLogout,children:'Hesaptan çık'}),
   error&&isAdmin&&jsx('a',{href:'/realm-admin',children:'Sunucu yönetimi'})
  ]});
 }
 return {DirectRealmEntry426,destination};
}


// Shared image cache is bounded to three map images.
function col422MapSource(source) {
 if(source==='/game/rune-coast-v422.webp' && typeof window!=='undefined' && window.matchMedia('(pointer: coarse), (max-width: 900px)').matches)return '/game/rune-coast-mobile-v422.webp';
 return source;
}
function col422Image(source,priority='auto') {
 if(typeof window==='undefined'||typeof Image==='undefined')return null;
 source=col422MapSource(source);
 if(!/^\/game\/(?:bazaar-village|dark-forest-map-expanded-v3|rune-coast(?:-mobile)?-v422)\.webp$/.test(source))return null;
 const pool=globalThis.__col422MapImages??=(new Map());
 let image=pool.get(source);
 if(image?.complete&&!image.naturalWidth){pool.delete(source);image=null;}
 if(image){pool.delete(source);pool.set(source,image);if(priority==='high')image.fetchPriority='high';return image;}
 image=new Image();image.decoding='async';image.fetchPriority=priority;
 image.addEventListener('error',()=>{if(pool.get(source)===image)pool.delete(source);},{once:true});
 pool.set(source,image);while(pool.size>3)pool.delete(pool.keys().next().value);
 image.src=source;return image;
}
function col422WarmMaps(area='bazaar') {
 if(typeof window==='undefined')return;
 const bazaar='/game/bazaar-village.webp',forest='/game/dark-forest-map-expanded-v3.webp';
 col422Image(area==='forest'?forest:area==='rune'?'/game/rune-coast-v422.webp':bazaar,'high');
 if(!navigator.connection?.saveData){col422Image(bazaar,area==='bazaar'?'high':'auto');col422Image(forest,area==='forest'?'high':'auto');}
}
function col422StoreEntry(instance,entry) {
 if(typeof window==='undefined')return;
 delete globalThis.__col422Entry;
 const area=typeof entry?.area==='string'?entry.area:'bazaar';
 col422WarmMaps(area);
 if(!entry||!Number.isInteger(entry.capacity)||entry.capacity<1||!Array.isArray(entry.channels)||entry.channels.length!==3)return;
 const rows=entry.channels;
 if(rows.some((row,index)=>row?.id!==index+1||!Number.isInteger(row.online)||row.online<0||typeof row.name!=='string'))return;
 globalThis.__col422Entry={instance,area,channels:rows,capacity:entry.capacity,balance504:entry.balance504,expiresAt:Date.now()+15000,consumed:false};
}
function col422Entry(instance,consume=false) {
 if(typeof window==='undefined')return null;
 const entry=globalThis.__col422Entry;
 if(!entry||entry.instance!==instance||entry.expiresAt<Date.now())return null;
 if(consume){if(entry.consumed)return null;entry.consumed=true;}
 return entry;
}
function col422ClearEntry(instance) {
 if(typeof window!=='undefined'&&globalThis.__col422Entry?.instance===instance)delete globalThis.__col422Entry;
}

const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/game-client-core511-8157ed046436808d.js","assets/rolldown-runtime-S-ySWqyJ-ga4172.js","assets/index-D6eonq7K-ga4172-v418ws-3c02836-e510-8225403c2fcc-90f5b4ab25.js","assets/framework-CXnKph_e-ga4172.js","assets/launch-landing-qVKrjo7K-ga4172-prereg-1788-e486-48ff1d5b32ef-74b8821e.js","assets/createLucideIcon-BiVFlVzr-ga4172.js","assets/launch-landing-CAftBWzJ.css","assets/monster-loot-a2QO0cPh-ga4172-92bdd7a4-bab8-e499-fab4fcb1e1b2-f4f682b8.js","assets/monster-loot-CwYNLkQv.css","assets/game-instance-559vKpBT-ga4172-prereg-1788d-e486-48ff1d5b32ef-6a1e68bc.js","assets/circle-check-CykMSVzB-ga4172.js","assets/game-client-BaAq3GeO.css"])))=>i.map(i=>d[i]);
import{r as e}from"./rolldown-runtime-S-ySWqyJ-ga4172.js";import{i as t,r as n}from"./framework-CXnKph_e-ga4172.js";import{c as r,t as i}from"./index-D6eonq7K-ga4172-v418ws-3c02836-e510-8225403c2fcc-90f5b4ab25.js";import{t as a}from"./createLucideIcon-BiVFlVzr-ga4172.js";import{F as o,N as s,P as c,j as l,n as u,t as d}from"./launch-landing-qVKrjo7K-ga4172-prereg-1788-e486-48ff1d5b32ef-74b8821e.js";import{c as f,f as p,h as m,m as h,n as g,o as _,p as v,r as y,s as b,u as x}from"./game-instance-559vKpBT-ga4172-prereg-1788d-e486-48ff1d5b32ef-6a1e68bc.js";var S=a(`at-sign`,[[`circle`,{cx:`12`,cy:`12`,r:`4`,key:`4exip2`}],[`path`,{d:`M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8`,key:`7n84p3`}]]),C=a(`book-open`,[[`path`,{d:`M12 5v16`,key:`1f6ucr`}],[`path`,{d:`M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z`,key:`1fyvmf`}]]),w=a(`external-link`,[[`path`,{d:`M15 3h6v6`,key:`1q9fwt`}],[`path`,{d:`M10 14 21 3`,key:`gplh6r`}],[`path`,{d:`M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6`,key:`a6xqqp`}]]),T=a(`log-in`,[[`path`,{d:`m10 17 5-5-5-5`,key:`1bsop3`}],[`path`,{d:`M15 12H3`,key:`6jk70r`}],[`path`,{d:`M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4`,key:`u53s6r`}]]),E=a(`triangle-alert`,[[`path`,{d:`m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3`,key:`wmoenq`}],[`path`,{d:`M12 9v4`,key:`juzpu7`}],[`path`,{d:`M12 17h.01`,key:`p32p05`}]]),D=e(t(),1),O=n(),k={open:`Açık`,full:`Dolu`,closed:`Kapalı`,maintenance:`Bakımda`,unavailable:`Durum doğrulanamıyor`};function A({accountName:e,realms:t,onSelect:n,onRefresh:r,onLogout:i}){let[a,o]=(0,D.useState)(null),[l,u]=(0,D.useState)(``);async function d(e,t){if(!a){o(e),u(``);try{await t()}catch(e){u(e instanceof Error?e.message:`İşlem tamamlanamadı. Tekrar dene.`)}finally{o(null)}}}return(0,O.jsxs)(`main`,{className:`auth-shell realm-shell`,children:[(0,O.jsx)(`div`,{className:`auth-backdrop`}),(0,O.jsxs)(`section`,{className:`auth-card realm-panel`,"aria-labelledby":`realm-title`,children:[(0,O.jsxs)(`header`,{className:`realm-heading`,children:[(0,O.jsx)(`span`,{className:`auth-world-kicker`,children:`YAŞAM ÇEKİRDEĞİ`}),(0,O.jsx)(`h1`,{id:`realm-title`,children:`Dünyanı seç`}),(0,O.jsxs)(`p`,{children:[`Hoş geldin, `,(0,O.jsx)(`strong`,{children:e}),`. Her sunucuda karakterin, eşyaların ve pazarın ayrıdır.`]})]}),(0,O.jsx)(`div`,{className:`realm-list`,children:t.map(e=>{let t=!e.character&&!e.registrationOpen,r=e.status===`open`;return(0,O.jsxs)(`article`,{className:`realm-choice`,children:[(0,O.jsxs)(`div`,{className:`realm-choice-top`,children:[(0,O.jsx)(`h2`,{children:e.name}),(0,O.jsx)(`span`,{className:`realm-status realm-status-${e.status==='open'&&e.online>=e.capacity*.65?'busy':e.status}`,children:k[e.status]})]}),(0,O.jsx)(`p`,{className:`realm-population`,children:e.online===null?`Doluluk bilgisi bekleniyor`:`${e.online} / ${e.capacity} oyuncu`}),(0,O.jsx)(`div`,{className:`realm-channels`,"aria-label":`${e.name} kanalları`,children:[0,1,2].map(t=>(0,O.jsxs)(`span`,{children:[`CH`,t+1,` `,(0,O.jsxs)(`strong`,{children:[e.channels?.[t]??`—`,`/`,e.channelCapacity]})]},t))}),(0,O.jsx)(`p`,{className:`realm-character`,children:e.character?`${e.character.name} · Seviye ${e.character.level}`:t?`Yeni karakter kaydı kapalı. Mevcut karakterinle devam edebilirsin.`:`Karakterin varsa devam et; yoksa yeni karakter oluştur.`}),(0,O.jsxs)(`button`,{type:`button`,className:`auth-submit realm-enter`,disabled:!r||a!==null,onClick:()=>void d(e.id,()=>n(e.id)),children:[a===e.id?`Bağlanılıyor…`:r?`SUNUCUYA GİR`:t&&e.status===`open`?`YENİ KARAKTERE KAPALI`:k[e.status].toLocaleUpperCase(`tr-TR`),r&&(0,O.jsx)(m,{"aria-hidden":`true`})]})]},e.id)})}),!t.length&&(0,O.jsx)(`p`,{role:`status`,children:`Sunucu listesi şu anda alınamıyor. Yenileyerek tekrar dene.`}),l&&(0,O.jsx)(`p`,{className:`auth-message`,role:`alert`,children:l}),(0,O.jsxs)(`footer`,{className:`realm-footer`,children:[(0,O.jsxs)(`span`,{children:[(0,O.jsx)(s,{"aria-hidden":`true`}),` Hesabın ortak, maceran sunucuya özel.`]}),(0,O.jsxs)(`button`,{type:`button`,className:`auth-link`,disabled:a!==null,onClick:()=>void d(`refresh`,r),children:[(0,O.jsx)(c,{"aria-hidden":`true`}),` Listeyi yenile`]}),(0,O.jsx)(`button`,{type:`button`,className:`auth-link`,disabled:a!==null,onClick:i,children:`Çıkış yap`})]})]})]})}function j({accountName:e,csrf:t,onLogout:n,isAdmin:r}){let[i,a]=(0,D.useState)([]),[o,s]=(0,D.useState)(``),c=async()=>{let e=await fetch(`/api/realm/catalog`,{cache:`no-store`});if(!e.ok)throw Error(`Sunucu listesi alınamadı.`);a((await e.json()).realms)};return(0,D.useEffect)(()=>{let e=!0,n=new URLSearchParams(location.search),r=n.get(`realm`),i=n.get(`state`);async function a(){if(r&&i){let n=await fetch(`/api/realm/issue`,{method:`POST`,headers:{"content-type":`application/json`,"x-csrf-token":t},body:JSON.stringify({realmId:r,state:i})}),a=await n.json();if(!n.ok)throw Error(a.error??`Sunucuya giriş tamamlanamadı.`);e&&location.assign(a.destination);return}await c()}return a().catch(t=>{e&&(history.replaceState({},``,`/`),s(t.message),c().catch(()=>{}))}),()=>{e=!1}},[t]),(0,O.jsxs)(O.Fragment,{children:[r&&(0,O.jsx)(`a`,{className:`auth-link`,href:`/realm-admin`,children:`Sunucu ve hesap yönetimi`}),o&&(0,O.jsx)(`p`,{className:`auth-message`,role:`alert`,children:o}),(0,O.jsx)(A,{accountName:e,realms:i,onRefresh:c,onLogout:n,onSelect:async e=>{let t=i.find(t=>t.id===e);if(!t?.origin)throw Error(`Sunucu bulunamadı.`);location.assign(t.origin+`/api/realm/begin`)}})]})}function M({children:e,accountId:t,onReady:n}){let[r,i]=(0,D.useState)(!1),[a,o]=(0,D.useState)(`CORE OF LIFE`),[s,c]=(0,D.useState)(0),[l,u]=(0,D.useState)(!0),d=(0,D.useRef)(null);return(0,D.useEffect)(()=>{let e=d.current??crypto.randomUUID();d.current=e,_(e);let r=!1,a=!1,s=!1,l=!1,f=Date.now(),p=!1,m=()=>{let e=document.cookie.split(`;`).map(e=>e.trim()).find(e=>e.startsWith(`__Host-yasam-csrf=`)||e.startsWith(`yasam-csrf-local=`));return e?decodeURIComponent(e.slice(e.indexOf(`=`)+1)):``},h=(n,r=!1,i)=>globalThis.fetch(`/api/game-presence`,{method:`POST`,keepalive:r,signal:i,headers:{"content-type":`application/json`,"x-csrf-token":m(),[y]:e},body:JSON.stringify({action:n,accountId:t})}),v=()=>{col422ClearEntry(e);s&&(s=!1,h(`release`,!0).catch(()=>void 0))},x=e=>{a=!0,i(!1),o(e),v()},S=e=>x(e.detail||`Oyun bağlantısı sona erdi. Yeniden bağlan.`),C=()=>{document.hidden?x(`Oyun arka plana alındı. Devam etmek için yeniden bağlan.`):a&&c(e=>e+1)},w=()=>{f=Date.now()},T=()=>x(`Oyun penceresi kapatıldı. Yeniden bağlan.`),E=()=>{a&&!document.hidden&&c(e=>e+1)};i(!1),u(!0),o(`CORE OF LIFE`);let D=new AbortController,O=window.setTimeout(()=>D.abort(),12e3);h(`claim`,!1,D.signal).then(async e=>{let t=await e.json();if(!e.ok)throw Error(t.error||`Oyun oturumu açılamadı.`);if(s=!0,r||a||document.hidden){v();return}if(!(t.player===null||t.player&&typeof t.player.id==`string`&&typeof t.player.name==`string`&&typeof t.player.role==`string`))throw Error(`Karakter bilgisi doğrulanamadı. Sayfayı yenileyip tekrar bağlan.`);p=t.idleExempt===!0,col422StoreEntry(e,t.entry),window.dispatchEvent(new CustomEvent('coreoflife:presence-claimed',{detail:{instance:d.current}})),n(t.player),b(t.chatAfterId),i(!0)}).catch(e=>{v(),r||o(D.signal.aborted?`Bağlantı zaman aşımına uğradı. Yeniden bağlan.`:e instanceof Error?e.message:`Bağlantı kurulamadı.`)}).finally(()=>{window.clearTimeout(O),r||u(!1)});let k=window.setInterval(async()=>{if(!(!s||r||a||l)){l=!0;try{let e=await h(`renew`);if(e.ok){let t=await e.json(),n=p;if(p=t.idleExempt===!0,(p||n)&&(f=Date.now()),Date.now()-f>=9e5){x(`15 dakika işlem yapılmadığı için oyun kapatıldı. Yeniden bağlanabilirsin.`);return}}else{let t=await e.json().catch(()=>({error:`Oturum yenilenemedi.`}));!r&&(e.status===401||e.status===403||e.status===409)&&x(t.error||`Oturum süresi doldu.`)}}catch{}finally{l=!1}}},1e4);for(let e of[`pointerdown`,`pointermove`,`keydown`,`wheel`])window.addEventListener(e,w,{passive:!0});return document.addEventListener(`visibilitychange`,C),window.addEventListener(`pagehide`,T),window.addEventListener(`pageshow`,E),window.addEventListener(g,S),()=>{r=!0,D.abort(),window.clearTimeout(O),window.clearInterval(k),v();for(let e of[`pointerdown`,`pointermove`,`keydown`,`wheel`])window.removeEventListener(e,w);document.removeEventListener(`visibilitychange`,C),window.removeEventListener(`pagehide`,T),window.removeEventListener(`pageshow`,E),window.removeEventListener(g,S)}},[s,t,n]),r?e:(0,O.jsxs)(`main`,{className:`auth-loading`,children:[(0,O.jsx)(`strong`,{children:a}),(0,O.jsx)(`button`,{type:`button`,disabled:l,onClick:()=>c(e=>e+1),children:`Yeniden bağlan`})]})}function N(e){let t=e.userAgent;if(/Edg(?:A|iOS)?\/|OPR\/|OPiOS\/|Opera|Firefox\/|FxiOS\/|SamsungBrowser\/|Vivaldi\/|YaBrowser\/|Whale\/|Brave\/|DuckDuckGo\/|; wv[;) ]/i.test(t))return!1;let n=e.userAgentData?.brands?.map(e=>e.brand.toLowerCase())??[];return n.some(e=>/edge|opera|brave|vivaldi|samsung|duckduckgo/.test(e))?!1:n.includes(`google chrome`)?!0:n.length>0?!1:/(?:Chrome|CriOS)\/\d+/i.test(t)}var P=[{label:`Opera`,href:`https://www.opera.com/download`},{label:`Microsoft Edge`,href:`https://www.microsoft.com/edge/download`},{label:`Firefox`,href:`https://www.mozilla.org/firefox/new/`}];function F({accountId:e,children:t}){let[n,r]=(0,D.useState)(`checking`),i=`coreoflife-chrome-warning:${e}`;return(0,D.useEffect)(()=>{let e=!0;return(async()=>{let t=N(navigator),n=navigator.brave;if(t&&n?.isBrave){let e=0;try{await Promise.race([n.isBrave(),new Promise(t=>{e=window.setTimeout(()=>t(!1),2e3)})])&&(t=!1)}catch{}finally{window.clearTimeout(e)}}if(e){if(!t){r(`ready`);return}try{r(sessionStorage.getItem(i)===`accepted`?`ready`:`warning`)}catch{r(`warning`)}}})(),()=>{e=!1}},[i]),n===`checking`?(0,O.jsxs)(`main`,{className:`auth-loading`,children:[(0,O.jsx)(`span`,{className:`auth-core`}),(0,O.jsx)(`strong`,{children:`CORE OF LIFE`})]}):n===`ready`?(0,O.jsx)(O.Fragment,{children:t}):(0,O.jsxs)(`main`,{className:`auth-shell chrome-entry-shell`,children:[(0,O.jsx)(`div`,{className:`auth-backdrop`}),(0,O.jsxs)(`section`,{className:`chrome-entry-card`,role:`alert`,"aria-labelledby":`chrome-entry-title`,children:[(0,O.jsx)(E,{className:`chrome-entry-icon`,"aria-hidden":`true`}),(0,O.jsx)(`p`,{className:`chrome-entry-eyebrow`,children:`TARAYICI UYARISI`}),(0,O.jsx)(`h1`,{id:`chrome-entry-title`,children:`Google Chrome ile oyun sorun çıkarabilir`}),(0,O.jsx)(`p`,{children:`Chrome kullanan bazı oyuncular yeni haritada takılma ve yüksek gecikme bildirdi. Daha sorunsuz bir oyun için başka bir tarayıcıdan giriş yapmanı öneriyoruz.`}),(0,O.jsx)(`div`,{className:`chrome-entry-links`,"aria-label":`Önerilen tarayıcılar`,children:P.map(e=>(0,O.jsxs)(`a`,{href:e.href,target:`_blank`,rel:`noopener noreferrer`,children:[e.label,(0,O.jsx)(w,{size:16,"aria-hidden":`true`})]},e.label))}),(0,O.jsx)(`button`,{type:`button`,className:`chrome-entry-continue`,onClick:()=>{try{sessionStorage.setItem(i,`accepted`)}catch{}r(`ready`)},children:`Yine de Chrome ile devam et`})]})]})}var I=(0,D.lazy)(colPreloadGame);function L(){let e=document.cookie.split(`;`).map(e=>e.trim()),t=e.find(e=>e.startsWith(`__Host-yasam-csrf=`))??e.find(e=>e.startsWith(`yasam-csrf-local=`));return t?decodeURIComponent(t.slice(t.indexOf(`=`)+1)):``}async function R(e,t,n=!1,r){let i=await fetch(e,{method:t?`POST`:`GET`,cache:`no-store`,signal:r,headers:{...t?{"content-type":`application/json`}:{},...n?{"x-csrf-token":L()}:{}},...t?{body:JSON.stringify(t)}:{}}),a=await i.json();if(!i.ok&&a.code==='account_origin_required'){location.replace('/api/realm/begin');throw Error('Güvenli giriş sayfasına yönlendiriliyorsun.');}if(!i.ok)throw Error(a.error??a.message??`İşlem tamamlanamadı.`);return a}// Shared browser/SSR entry flow. Dependencies are supplied by the existing
// bundle so React, presence, CSRF, realm selection and gameplay keep one owner.
// Shared browser/SSR entry flow. Dependencies are supplied by the existing
// bundle so React, presence, CSRF, realm selection and gameplay keep one owner.
// Shared browser/SSR entry flow. Dependencies are supplied by the existing
// bundle so React, presence, CSRF, realm selection and gameplay keep one owner.
function createEntryPortal({useState,useEffect,useRef,useCallback,jsx,jsxs,Fragment,Suspense,GameClient,preloadGame,authRequest,csrfCookie,LaunchLanding,RealmSelectionGate,ChromeEntryGate,GamePresenceGate,AuthPanel,GAME_SESSION_ENDED_EVENT}) {
const {DirectRealmEntry426}=createDirectRealm426UI({useState,useEffect,useRef,jsx,jsxs});

 return function AuthPortal({resetToken='',earlyAccessCheck=false,realmLogin=false}) {
  const [serverRealm,setServerRealm]=useState(realmLogin),[accountOrigin,setAccountOrigin]=useState('');
  const isRealm=realmLogin||serverRealm;
  const [session,setSession]=useState(null),[checking,setChecking]=useState(true),[restoreError,setRestoreError]=useState(''),[authRetry,setAuthRetry]=useState(0);
  const [launch,setLaunch]=useState(null),[launchError,setLaunchError]=useState(false),[launchRetry,setLaunchRetry]=useState(0);
  const [authOpen,setAuthOpen]=useState(false),[wantPlay,setWantPlay]=useState(false),[away,setAway]=useState(false),[replaced,setReplaced]=useState(false);
  const [mode,setMode]=useState(resetToken?'reset':'login'),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const preloadRef=useRef(false);const warmGame=()=>{if(preloadRef.current)return;preloadRef.current=true;void preloadGame().catch(()=>{preloadRef.current=false;});};
  useEffect(()=>{const maintenance=()=>{setWantPlay(false);setAway(false);setLaunchRetry(v=>v+1);};window.addEventListener('coreoflife:maintenance',maintenance);return()=>window.removeEventListener('coreoflife:maintenance',maintenance);},[]);
const launchRef=useRef(null);launchRef.current=launch;
  useEffect(()=>{
   let active=true;const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),10000);
   setChecking(true);setRestoreError('');
   const restore=async()=>{if(isRealm){warmGame();col422WarmMaps();}
    const query=new URLSearchParams(location.search);
    try{if(isRealm&&query.get('admin')==='1')sessionStorage.setItem('col-admin-return','1');}catch{}
    if(query.get('logout')==='1'){
     await authRequest('/api/auth/logout',{},true,controller.signal);history.replaceState({},'','/');
     try{sessionStorage.removeItem('col-admin-return');}catch{}
    }
    const params=new URLSearchParams(location.hash.slice(1));
    if(params.has('realmCode')){
     const code=params.get('realmCode'),state=params.get('realmState');if(/^[-_A-Za-z0-9]{43}$/.test(code??'')&&/^[-_A-Za-z0-9]{43}$/.test(state??''))warmGame();history.replaceState({},'','/');
     await authRequest('/api/realm/redeem',{code,state},false,controller.signal);
     if(active)setWantPlay(true);
    }else if(query.has('realm')&&query.has('state')){if(active)setWantPlay(true);}
    return authRequest('/api/auth/me',undefined,false,controller.signal);
   };
   restore().then(result=>{
    if(!active)return;
    if(result.launch){setLaunch(result.launch);setLaunchError(false);}
    if(result.authenticated)setWantPlay(true);
    if(typeof result.authOrigin==='string'){const origin=new URL(result.authOrigin);if(origin.protocol==='https:'&&origin.origin===result.authOrigin){setAccountOrigin(origin.origin);setServerRealm(true);if(resetToken){location.replace(origin.origin+'/reset-password?token='+encodeURIComponent(resetToken));return;}if(!result.authenticated&&!result.launch?.showLanding){location.replace('/api/realm/begin');return;}}}
    if(result.authenticated&&result.account)setSession({...result,authenticated:true,player:result.player??null});
    else setSession(null);
   }).catch(error=>{if(active)setRestoreError(error?.message||'Hesap bilgisi alınamadı. Bağlantını kontrol edip yeniden dene.');})
    .finally(()=>{window.clearTimeout(timeout);if(active)setChecking(false);});
   return()=>{active=false;window.clearTimeout(timeout);controller.abort();};
  },[authRetry]);
  useEffect(()=>{
   if(checking||restoreError)return;
   return startLaunchRefresh478({getStatus:()=>launchRef.current,isPlaying:()=>!!session&&!!launchRef.current?.canPlay&&(wantPlay||!launchRef.current?.showLanding)&&!away,initialRefresh:!launchRef.current||launchRetry>0,request:signal=>authRequest('/api/launch',undefined,false,signal),onStatus:data=>{launchRef.current=data;setLaunch(data);setLaunchError(false);},onError:()=>setLaunchError(true)});
  },[checking,restoreError,session?.account.id,launchRetry,wantPlay,away]);
  useEffect(()=>{if(resetToken)history.replaceState({},'','/reset-password');},[resetToken]);
  useEffect(()=>{
   const ended=()=>{setLaunchRetry(v=>v+1);setAway(true);setReplaced(true);setWantPlay(false);setMessage('Oyun oturumu sona erdi. Hesabın kayıtlı; yeniden bağlanabilirsin.');};
   window.addEventListener(GAME_SESSION_ENDED_EVENT,ended);
   return()=>window.removeEventListener(GAME_SESSION_ENDED_EVENT,ended);
  },[]);
  useEffect(()=>{
   if(isRealm&&session?.authenticated){try{if(sessionStorage.getItem('col-admin-return')==='1'){sessionStorage.removeItem('col-admin-return');location.replace('/admin');}}catch{}}
  },[isRealm,session?.authenticated]);
  useEffect(()=>{
   if(session&&!session.realmSelection&&launch?.canPlay&&(wantPlay||!launch.showLanding)&&!away)warmGame();
  },[session?.account.id,session?.realmSelection,launch?.canPlay,launch?.showLanding,wantPlay,away]);
  const logout=useCallback(async()=>{
   try{const result=await authRequest('/api/auth/logout',{},true);setSession(null);setLaunch(null);setMode('login');setWantPlay(false);setAuthOpen(false);setAway(false);setReplaced(false);location.assign(result.redirectUrl||'/');}
   catch(error){setMessage(error?.message||'Hesaptan çıkılamadı. Yeniden dene.');}
  },[]);
  const accountId=session?.account.id;
  const restoreCharacter=useCallback(player=>setSession(current=>current&&current.account.id===accountId?{...current,player}:current),[accountId]);
  const play=()=>{if(replaced&&isRealm){location.assign('/api/realm/begin');return;}setAway(false);setReplaced(false);setWantPlay(true);setMessage('');};
  const loading=text=>jsxs('main',{className:'auth-loading',children:[jsx('span',{className:'auth-core'}),jsx('strong',{children:text})]});
  if(launch?.phase==='maintenance'&&!launch.canPlay)return jsxs('main',{className:'maintenance425',children:[jsxs('section',{className:'maintenance425-card',children:[jsx('img',{src:'/game/maintenance-heroes-v425.webp',width:1536,height:1024,alt:'Savaşçı, okçu ve büyücü çekirdeğin bakımını yapıyor.'}),jsxs('div',{className:'maintenance425-copy',children:[jsx('h1',{children:'Oyun şu an bakımda'}),jsx('p',{children:'Çekirdekte bakım çalışmaları sürüyor. Yeniden açıldığında macerana devam edebilirsin.'}),jsx('p',{className:'maintenance425-message',role:'status','aria-live':'polite',children:launch.maintenanceText||'Bakımla ilgili yeni bilgiler burada paylaşılacak.'}),jsx('p',{children:'Açılış ve bakım duyurularını resmi hesaplarımızdan takip edebilirsin. Macerada görüşmek üzere!'}),jsxs('nav',{className:'maintenance494-social','aria-label':'Resmi sosyal hesaplar',children:[jsx('a',{href:'https://www.instagram.com/webcoreoflife',target:'_blank',rel:'noopener noreferrer',children:'Instagram'}),jsx('a',{href:'https://discord.gg/sCbQh9D8r',target:'_blank',rel:'noopener noreferrer',children:'Discord'})]}),session?.account.realmAdmin&&jsx('a',{className:'auth-link',href:isRealm?'/admin':'/realm-admin',children:'Yönetici paneli'}),session&&jsx('button',{type:'button',onClick:()=>void logout(),children:'Hesaptan çık'})]})]})]});
  if(checking)return loading('CORE OF LIFE');
  if(restoreError)return jsxs('main',{className:'auth-loading',children:[jsx('p',{role:'alert',children:restoreError}),jsx('button',{type:'button',onClick:()=>setAuthRetry(v=>v+1),children:'Yeniden dene'}),isRealm&&jsx('a',{href:'/api/realm/begin',children:'Hesabımla yeniden bağlan'})]});
  if(isRealm&&!session&&!launch?.showLanding)return jsxs('main',{className:'auth-loading',children:[jsx('strong',{children:'Çekirdek sunucusuna giriş'}),jsx('p',{children:message||'Kayıtlı hesabınla güvenli giriş yap.'}),jsx('a',{href:'/api/realm/begin',className:'primary-button',children:'Hesabımla devam et'})]});
  if(launchError&&!launch)return jsxs('main',{className:'auth-loading',children:[jsx('p',{children:'Sunucu bilgisi alınamadı.'}),jsx('button',{type:'button',onClick:()=>setLaunchRetry(v=>v+1),children:'Yeniden dene'})]});
  if(!launch)return loading('CORE OF LIFE');
  if(away)return jsxs('main',{className:'auth-loading',children:[jsx('strong',{children:session?.account.username}),jsx('p',{children:message||'Hesabın kayıtlı. Hazır olduğunda oyuna dönebilirsin.'}),jsx('button',{type:'button',onClick:play,children:'Oyuna dön'}),jsx('button',{type:'button',onClick:()=>void logout(),children:'Hesaptan çık'})]});
  if(!resetToken&&((launch.showLanding&&!(session&&launch.canPlay&&wantPlay)&&(session||!authOpen&&!earlyAccessCheck))||(!session&&!authOpen&&!earlyAccessCheck)))return jsx(LaunchLanding,{status:launch,account:session?.account.username,onRegister:()=>{if(isRealm){location.assign(accountOrigin||'/api/realm/begin');return;}setMode('register');setAuthOpen(true);},onLogin:()=>{if(isRealm){location.assign('/api/realm/begin');return;}setMode('login');setAuthOpen(true);},onPlay:play,onLogout:()=>void logout()});
  if(session?.realmSelection&&launch.canPlay&&!resetToken)return jsx(DirectRealmEntry426,{isAdmin:session.account.realmAdmin,accountName:session.account.username,csrf:session.csrfToken??csrfCookie(),entryOrigin:session.realmEntryOrigin,onLogout:()=>void logout()});
  if(session&&launch.canPlay&&!resetToken)return jsx(ChromeEntryGate,{accountId:session.account.id,children:jsx(GamePresenceGate,{accountId:session.account.id,onReady:restoreCharacter,children:jsx(Suspense,{fallback:loading('CORE OF LIFE'),children:jsx(GameClient,{initialPlayer:session.player,accountName:session.account.username,onLogout:()=>void logout()})})})},session.account.id);
  if(isRealm)return jsxs('main',{className:'auth-loading',children:[jsx('p',{children:'Hesap işlemleri için güvenli giriş sayfasına devam et.'}),jsx('a',{href:resetToken&&accountOrigin?accountOrigin+'/reset-password?token='+encodeURIComponent(resetToken):accountOrigin||'/api/realm/begin',className:'primary-button',children:'Hesabımla devam et'})]});
  return jsxs(Fragment,{children:[null,jsx(AuthPanel,{launchEmailAvailable:launch.emailPreference?.available,registrationOnly:launch.showLanding&&!launch.canPlay,restrictedAccess:earlyAccessCheck,mode,setMode,busy,setBusy,message,setMessage,resetToken,onAuthenticated:next=>{setSession(next);setLaunch(next.launch??null);setWantPlay(true);setAuthOpen(false);}})]});
 };
}



let colGamePromise;function colPreloadGame(){return colGamePromise??=((()=>i(()=>import(`./game-client-core511-8157ed046436808d.js`),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11])))()).catch(error=>{colGamePromise=null;throw error;});}
const z=createEntryPortal({...D,jsx:O.jsx,jsxs:O.jsxs,Fragment:O.Fragment,GameClient:I,preloadGame:colPreloadGame,authRequest:R,csrfCookie:L,LaunchLanding:d,RealmSelectionGate:j,ChromeEntryGate:F,GamePresenceGate:M,AuthPanel:B,GAME_SESSION_ENDED_EVENT:f});function B(props){return D.createElement(col439Site.AuthPanel,props);}export{z as default};
const col439Site=createEntrySite439({React:D,authRequest:R,RegistrationChallenge:p,unlockEntryAudio:x});
