import http from 'node:http';
import { createHash, createPrivateKey, sign as signBytes } from 'node:crypto';

// Native-only delivery to the local dedicated realtime service.
//
// The wire protocol is unchanged: the same COL-REQUEST-V1 string, SHA-256 body
// digest and ECDSA P-256 signature in IEEE-P1363 (r||s) form that WebCrypto
// produces, so the installed realtime service verifies it without any update.
// What changes is the CPU spent on the game's single HTTP thread for every
// movement/combat broadcast:
//   - WebCrypto digest+sign   ~0.21 ms  ->  node:crypto  ~0.05 ms
//   - undici fetch()          ~1.2 ms   ->  keep-alive node:http  ~0.3 ms
// Only the loopback origin is served here; anything else keeps using fetch().
let cachedKey = null, cachedEncoded = null;
function privateKey() {
  const encoded = String(process.env.REALTIME_SIGNING_PRIVATE_KEY || '').replace(/\s+/g, '');
  if (!encoded) throw new Error('REALTIME_SIGNING_PRIVATE_KEY is not configured.');
  if (encoded !== cachedEncoded) {
    if (encoded.length > 8192 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('Realtime signing key is malformed.');
    const key = createPrivateKey({ key: Buffer.from(encoded, 'base64'), format: 'der', type: 'pkcs8' });
    if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') throw new Error('Realtime signing key is not ECDSA P-256.');
    cachedKey = key; cachedEncoded = encoded;
  }
  return cachedKey;
}

export const realtimeCrypto = {
  sign(value) { return signBytes('sha256', Buffer.from(value, 'utf8'), { key: privateKey(), dsaEncoding: 'ieee-p1363' }).toString('base64url'); },
  digest(body) { return createHash('sha256').update(body, 'utf8').digest('base64url'); },
};

// Bounded keep-alive pool: loopback only, never follows redirects.
// Idle sockets close after 4 s, before the service's 5 s keepAliveTimeout, so a
// request is never written onto a socket the service is closing.
const agent = new http.Agent({ keepAlive: true, maxSockets: 16, maxFreeSockets: 16, timeout: 4_000, scheduling: 'lifo' });
const RESPONSE_LIMIT = 65_536;

export function postLoopback(origin, pathname, headers, body, timeoutMs = 1_500) {
  const url = new URL(origin);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.pathname !== '/' || url.search) return null;
  // Network errors and timeouts reject, exactly like fetch(), so the caller's
  // bounded retry for essential events is unchanged.
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = value => { if (!settled) { settled = true; clearTimeout(timer); resolve(value); } };
    const fail = error => { if (!settled) { settled = true; clearTimeout(timer); reject(error); } };
    const payload = Buffer.from(body, 'utf8');
    const request = http.request({ host: '127.0.0.1', port: Number(url.port) || 80, path: pathname, method: 'POST', agent,
      headers: { ...headers, 'content-type': 'application/json', 'content-length': payload.length } }, response => {
      const chunks = []; let length = 0;
      response.on('data', chunk => { length += chunk.length; if (length <= RESPONSE_LIMIT) chunks.push(chunk); });
      response.on('end', () => {
        const status = response.statusCode || 0, text = length <= RESPONSE_LIMIT ? Buffer.concat(chunks).toString('utf8') : '';
        finish({ ok: status >= 200 && status < 300, status, json: async () => JSON.parse(text) });
      });
      response.on('error', fail);
      response.on('aborted', () => fail(new Error('Realtime response aborted')));
    });
    const timer = setTimeout(() => { request.destroy(new Error('Realtime delivery timed out')); }, timeoutMs);
    timer.unref?.();
    request.on('error', fail);
    request.end(payload);
  });
}

// Coalesce broadcasts produced within a couple of milliseconds into one signed
// request (/internal/broadcast-batch). Each event keeps its exact JSON body,
// its own per-item result and the caller's existing retry rules; the realtime
// service verifies ONE signature per batch instead of one per event and charges
// its ingress budget per contained event. If the installed service predates the
// batch endpoint (404), every event transparently uses the single endpoints and
// support is probed again a minute later.
const BATCH_KINDS = { '/internal/broadcast': 'room', '/internal/broadcast-world': 'world', '/internal/broadcast-players': 'players' };
const SINGLE_BODY_LIMIT = 24_000;
export function createRealtimeBatcher({ post = postLoopback, windowMs = 2, maxItems = 32, maxBytes = 196_608, retryProbeMs = 60_000, now = Date.now } = {}) {
  let queue = [], bytes = 0, timer = null, unsupportedUntil = 0;
  const stats = { batches: 0, events: 0, fallbacks: 0, maxBatch: 0 };
  function flush(origin, signHeaders) {
    clearTimeout(timer); timer = null;
    const items = queue; queue = []; bytes = 0;
    if (!items.length) return;
    const body = `{"v":1,"items":[${items.map(item => `{"k":"${item.kind}","p":${item.body}}`).join(',')}]}`;
    stats.batches++; stats.events += items.length; stats.maxBatch = Math.max(stats.maxBatch, items.length);
    (async () => {
      const headers = await signHeaders('/internal/broadcast-batch', body);
      const response = await post(origin, '/internal/broadcast-batch', headers, body, 1_500);
      if (!response) throw new Error('Realtime batch origin is not loopback');
      if (response.status === 404) {
        unsupportedUntil = now() + retryProbeMs; stats.fallbacks += items.length;
        for (const item of items) item.resolve(null);
        return;
      }
      if (response.ok) {
        const parsed = await response.json();
        const results = Array.isArray(parsed?.results) && parsed.results.length === items.length ? parsed.results : null;
        items.forEach((item, index) => {
          const result = results?.[index];
          const ok = Boolean(result && result.ok !== false);
          item.resolve({ ok, status: ok ? 200 : 400, json: async () => result ?? {} });
        });
        return;
      }
      for (const item of items) item.resolve({ ok: false, status: response.status, json: async () => ({}) });
    })().catch(error => { for (const item of items) item.reject(error); });
  }
  return {
    stats,
    // Resolves to a fetch-like per-event response, or null when the caller must
    // use the single endpoint (unknown path, oversized body, old service).
    send(origin, pathname, body, signHeaders) {
      const kind = BATCH_KINDS[pathname];
      if (!kind || typeof body !== 'string' || body.length > SINGLE_BODY_LIMIT || now() < unsupportedUntil) return null;
      const size = Buffer.byteLength(body, 'utf8');
      if (bytes + size + 16 > maxBytes) flush(origin, signHeaders);
      const result = new Promise((resolve, reject) => { queue.push({ kind, body, resolve, reject }); });
      bytes += size + 16;
      if (queue.length >= maxItems) flush(origin, signHeaders);
      else if (!timer) { timer = setTimeout(() => flush(origin, signHeaders), windowMs); timer.unref?.(); }
      return result;
    },
  };
}
export const realtimeBatcher = createRealtimeBatcher();
