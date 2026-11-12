// Bounded entry-only requests. Never retries a POST or a gameplay command.
export const ENTRY_REQUEST_MS_R93 = 15000;
export const ENTRY_RETRY_MS_R93 = 500;

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

export function entryRestoreMessageR93(error) {
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

export async function entryRequestR93(request, path, body, csrf, ownerSignal) {
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
