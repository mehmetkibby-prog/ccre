// Entry-only recovery. Never replays a redeem POST or accepts an old session.
export const ENTRY_RECOVERY_KEY_R97 = 'coreoflife:entry-recovery-r97';
export const ENTRY_RECOVERY_WINDOW_R97 = 120000;
export const ENTRY_RECOVERY_LIMIT_R97 = 2;
export const ENTRY_RECOVERY_DELAY_R97 = 1500;
export const ENTRY_RECOVERY_NAV_WAIT_R97 = 5000;

export function entryRecoverableR97(error) {
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

export function clearEntryRecoveryR97(host = globalThis.window) {
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

export async function recoverRealmEntryR97(error, {
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
