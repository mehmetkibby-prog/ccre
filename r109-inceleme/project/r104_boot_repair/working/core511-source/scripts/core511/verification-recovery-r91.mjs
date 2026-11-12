// Legacy six-digit verification recovery. A failed read never grants access.
// Only the current server response / successful answer may release the gate.
export function colUseVerificationState501(React) {
  const [, notify] = React.useState(0);
  const state = React.useRef({ knownScope: "", required: false, epoch: 0, flight: null, active: false, retrying: false, message: "" });
  state.current.notify = notify;
  return state;
}
export function colVerificationBlocked501(state, playerId, enabled, suspended) {
  return state.current.required || Boolean(enabled && playerId && !suspended && state.current.knownScope !== playerId);
}
export function colVerificationAccept501(state, playerId, required, enabled) {
  const current = state.current;
  const knownScope = enabled ? String(playerId ?? "") : current.knownScope;
  const changed = current.required !== Boolean(required) || current.knownScope !== knownScope || current.message !== "";
  current.required = Boolean(required);
  current.knownScope = knownScope;
  current.message = "";
  if (changed) current.notify((value) => value + 1);
}
export function colUseVerificationListener501(React, state, enabled, setRequired, requiredRef, suspended) {
  React.useEffect(() => {
    if (!enabled) return;
    let active = true;
    state.current.active = true;
    const block = () => {
      if (!active || suspended()) return;
      // Repeated 403 / socket notices describe the same requirement. They
      // must not invalidate every answer to the already pending status read.
      if (!state.current.required) state.current.epoch++;
      state.current.required = true;
      requiredRef.current = true;
      setRequired(true);
      state.current.notify((value) => value + 1);
    };
    window.addEventListener("coreoflife:bot-check", block, true);
    return () => {
      active = false;
      state.current.active = false;
      window.removeEventListener("coreoflife:bot-check", block, true);
      state.current.epoch++;
      state.current.flight?.controller.abort();
    };
  }, [enabled]);
}
export function colReadVerification501(fetcher, state, scope) {
  const owner = state.current, playerId = scope();
  if (owner.flight && owner.flight.playerId === playerId) return owner.flight.promise;
  // A different character cannot inherit a hanging request or its result.
  owner.flight?.controller.abort();
  const controller = new AbortController();
  let removeAbort, epoch, timedOut = false;
  const aborted = new Promise((resolve, reject) => {
    const stop = () => reject(new Error(timedOut ? "Doğrulama bağlantısı gecikti. Yeniden deneniyor; istersen şimdi tekrar dene." : "Doğrulama isteği yenilendi."));
    controller.signal.addEventListener("abort", stop, { once: true });
    removeAbort = () => controller.signal.removeEventListener("abort", stop);
  });
  // Bound headers AND response body, even if a fetch adapter ignores abort.
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 12000);
  const request = Promise.resolve().then(async () => {
    if (controller.signal.aborted) throw new Error("Doğrulama isteği yenilendi.");
    epoch = owner.epoch;
    const response = await fetcher("/api/bot-check", { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(response.status === 429 ? "Çok sık denendi. Kısa süre sonra otomatik yeniden denenecek." : response.status === 401 || response.status === 409 ? "Oturum yenilenmeli. Sayfayı yenileyip tekrar giriş yap." : "Doğrulama bilgisi alınamadı. Bağlantı kurulunca yeniden denenecek.");
    const result = await response.json();
    if (typeof result?.required !== "boolean" || result.required && (typeof result.id !== "string" || !result.id || typeof result.image !== "string" || !result.image.startsWith("data:image/png;base64,") || !Number.isFinite(result.expiresAt))) throw new Error("Doğrulama yanıtı eksik geldi. Yeniden deneniyor.");
    return result;
  });
  const flight = { controller, playerId, promise: null };
  flight.promise = Promise.race([request, aborted]).then((result) => {
    if (controller.signal.aborted || state.current !== owner || owner.epoch !== epoch || scope() !== playerId) throw new Error("Doğrulama durumu değişti. Yeniden deneniyor.");
    if (owner.message) { owner.message = ""; owner.notify((value) => value + 1); }
    return result;
  }).catch((error) => {
    if (state.current === owner && owner.active && owner.flight === flight && scope() === playerId && (!controller.signal.aborted || timedOut)) {
      owner.message = error.message;
      owner.notify((value) => value + 1);
    }
    throw error;
  }).finally(() => {
    clearTimeout(timer);
    removeAbort();
    if (owner.flight === flight) owner.flight = null;
  });
  owner.flight = flight;
  return flight.promise;
}
export async function colRetryVerification501(state) {
  const owner = state.current;
  if (!owner.active || owner.retrying) return;
  owner.retrying = true;
  owner.message = "";
  owner.notify((value) => value + 1);
  try {
    const flight = owner.flight;
    if (flight) {
      flight.controller.abort();
      try { await flight.promise; } catch {}
    }
    if (state.current === owner && owner.active) window.dispatchEvent(new Event("coreoflife:bot-check"));
  } finally {
    owner.retrying = false;
    if (state.current === owner && owner.active) owner.notify((value) => value + 1);
  }
}
export function colVerificationWait501({ React, state }) {
  const h2 = React.createElement;
  return h2("div", { className: "col-verification-wait501", role: "status", "aria-live": "polite", style: { position: "fixed", inset: 0, zIndex: 49, display: "grid", placeItems: "center", background: "#07110d", color: "#e8ede6", padding: 24, textAlign: "center" } },
    h2("div", null,
      h2("p", null, "Güvenlik doğrulaması hazırlanıyor…"),
      h2("p", null, state.current.message || "Bağlantı gecikirse yeniden deneyebilirsin."),
      h2("button", { type: "button", disabled: state.current.retrying, onClick: () => void colRetryVerification501(state), style: { marginTop: 12, padding: "10px 18px", minHeight: 44, color: "inherit", background: "#183125", border: "1px solid #657951", borderRadius: 8 } }, state.current.retrying ? "Yenileniyor…" : "Yeniden dene")));
}
