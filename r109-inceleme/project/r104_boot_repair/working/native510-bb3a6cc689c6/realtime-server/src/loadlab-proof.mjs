import {createHash, createHmac, randomBytes, timingSafeEqual} from 'node:crypto';

export const LAB_PROOF_HEADER = 'x-col-lab-proof';
export const LAB_SOURCE_IP = '45.84.191.73';
const ID = /^[A-Za-z0-9_-]{1,80}$/;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const keyBytes = key => {
  const result = Buffer.isBuffer(key) ? key : typeof key === 'string' && /^[a-f0-9]{64}$/.test(key) ? Buffer.from(key, 'hex') : null;
  if (!result || result.length !== 32) throw Error('Dedicated 32-byte lab key required');
  return result;
};
export const normalizeSocketIp = value => typeof value === 'string' && value.startsWith('::ffff:') ? value.slice(7) : value;
export const labTokenHash = value => sha256(value);
export function safeLabProofPayload(value) {
  return value?.v === 1 && ['GET', 'POST'].includes(value.method) && typeof value.path === 'string' &&
    value.path.length <= 256 && /^\/(?:api\/[A-Za-z0-9_/?=&.-]+|ws)$/.test(value.path) &&
    [value.runId, value.playerId, value.accountId].every(id => typeof id === 'string' && ID.test(id)) &&
    /^[a-f0-9]{64}$/.test(value.sessionTokenHash ?? '') && /^[a-f0-9]{64}$/.test(value.bodySha256 ?? '') &&
    value.sourceIp === LAB_SOURCE_IP && (value.instanceId === undefined || /^[a-f0-9-]{36}$/.test(value.instanceId)) && Number.isSafeInteger(value.atMs) && value.atMs > 0 &&
    /^[A-Za-z0-9_-]{22}$/.test(value.nonce ?? '');
}
export function signLabProof({key, method, path, body = '', runId, playerId, accountId,
  sessionTokenHash, instanceId, sourceIp = LAB_SOURCE_IP, nowMs = Date.now()}) {
  const payload = {v: 1, method, path, bodySha256: sha256(body), runId, playerId, accountId,
    sessionTokenHash, ...(instanceId ? {instanceId} : {}), sourceIp, atMs: nowMs, nonce: randomBytes(16).toString('base64url')};
  if (!safeLabProofPayload(payload)) throw Error('Invalid lab proof input');
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${createHmac('sha256', keyBytes(key)).update('COL-LOADLAB-V1.' + encoded).digest('base64url')}`;
}
export function createLabProofVerifier({key, now = Date.now, maxAgeMs = 5000, futureToleranceMs = 1000,
  maxNonces = 32768, isActive = () => false} = {}) {
  const secret = Buffer.from(keyBytes(key)), seen = new Map();
  let closed = false;
  if (!Number.isInteger(maxNonces) || maxNonces < 75 || maxNonces > 65536) throw Error('Invalid nonce bound');
  if (!Number.isInteger(maxAgeMs) || maxAgeMs < 1 || maxAgeMs > 10000 || !Number.isInteger(futureToleranceMs) || futureToleranceMs < 0 || futureToleranceMs > 2000) throw Error('Invalid proof freshness bound');
  function verify({proof, method, path, body = '', sessionTokenHash, peerIp, requireLoopback = true}) {
    if (closed) return null;
    const peer = normalizeSocketIp(peerIp);
    if (requireLoopback && peer !== '127.0.0.1' && peer !== '::1') return null;
    if (typeof proof !== 'string' || proof.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(proof)) return null;
    const [encoded, signature] = proof.split('.');
    const expected = createHmac('sha256', secret).update('COL-LOADLAB-V1.' + encoded).digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    let payload;
    try {payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));} catch {return null;}
    const at = now();
    if (!safeLabProofPayload(payload) || payload.method !== method || payload.path !== path ||
      payload.bodySha256 !== sha256(body) || (sessionTokenHash !== undefined && payload.sessionTokenHash !== sessionTokenHash) ||
      at - payload.atMs > maxAgeMs || payload.atMs - at > futureToleranceMs || !isActive(payload)) return null;
    // Insertion-ordered fixed TTL allows bounded prefix cleanup, no identities.
    let n = 0;
    for (const [nonce, expires] of seen) {if (expires >= at || n++ >= 256) break; seen.delete(nonce);}
    if (seen.has(payload.nonce) || seen.size >= maxNonces) return null;
    seen.set(payload.nonce, at + maxAgeMs + futureToleranceMs);
    return Object.freeze(payload);
  }
  return {verify, close: () => {closed = true;seen.clear();secret.fill(0);}, size: () => seen.size};
}
