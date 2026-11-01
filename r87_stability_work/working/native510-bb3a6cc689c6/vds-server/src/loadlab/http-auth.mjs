import {refreshLoadLabTicketR12} from './auth-preparation-r12.mjs';
import {createLabProofVerifier, LAB_PROOF_HEADER} from './loadlab-proof.mjs';
import {loadRuntimeConfig} from './registry.mjs';

const denied = (code = 'loadlab_gateway_required') => Object.assign(new Error(code), {code, status:403});
const hashHex = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
  ? Buffer.from(value, 'base64url').toString('hex') : '';

// Request lifetime only: no session authorization cache and no periodic work.
// Test traffic must pass the normal native session/presence/CSRF checks as well.
export function createLoadLabHttpAuth({getRegistry = () => globalThis.__colLoadLab,
  getConfig = () => loadRuntimeConfig(process.env.CORE_LOADLAB_RUNTIME_FILE), now = Date.now} = {}) {
  const bodies = new WeakMap(), proofs = new WeakMap(), verifiedActions = new WeakMap(), verifying = new WeakMap(), internalWorld = new WeakMap(), rateContexts = new WeakSet();
  let verifier, closed = false;
  function cohort(session) {
    const r = getRegistry(), account = session?.account?.id, player = session?.player?.id;
    if (!r || !account) return null;
    const accountRun = r.accountRun(account), playerRun = player ? r.playerRun(player) : '';
    if (!accountRun && !playerRun) return null;
    if (!player || !accountRun || accountRun !== playerRun || !r.active(accountRun)) throw denied('loadlab_lease_expired');
    // The first native presence claim has no game_presence row yet. Its window
    // identity comes from the private run descriptor, never an incoming header.
    const instanceId = r.playerInstance?.(player);
    if (!/^[a-f0-9-]{36}$/.test(instanceId ?? '') || session.gamePresence && session.gamePresence.instanceId !== instanceId) throw denied('loadlab_instance_mismatch');
    return {runId:accountRun, accountId:account, playerId:player, sessionTokenHash:hashHex(session.tokenHash), instanceId};
  }
  function identityMatches(proof, identity) {
    return !!proof && ['runId','accountId','playerId','sessionTokenHash','instanceId'].every(k => proof[k] === identity[k]);
  }
  function getVerifier() {
    if (closed) throw denied('loadlab_auth_closed');
    if (!verifier) {
      const config = getConfig();
      if (!config) throw denied('loadlab_configuration_missing');
      verifier = createLabProofVerifier({key:config.controlKey, now, isActive(p) {
        const r = getRegistry();
        return !!r && r.active(p.runId) && r.playerRun(p.playerId) === p.runId && r.accountRun(p.accountId) === p.runId;
      }});
    }
    return verifier;
  }
  async function captureBody(request) {
    if (!request.headers.has(LAB_PROOF_HEADER) || internalWorld.has(request)) return null;
    if (bodies.has(request)) return bodies.get(request);
    // The native JSON reader may run before its authorization call. Capture the
    // exact bytes now, not reserialized JSON, and consume each proof only once.
    const pending = (async () => {
      if (request.bodyUsed) throw denied('loadlab_body_already_consumed');
      if (request.method === 'GET' || !request.body) return Buffer.alloc(0);
      const reader = request.clone().body.getReader(), chunks = [];
      let size = 0;
      try {
        for (;;) {
          const {value,done} = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 4096) throw denied('loadlab_body_too_large');
          chunks.push(Buffer.from(value));
        }
        return Buffer.concat(chunks, size);
      } catch (error) {
        // Awaiting cancel on one tee branch can deadlock until the other native
        // branch is consumed. Cancellation is bounded by the parent request.
        void reader.cancel().catch(() => {});
        throw error;
      } finally {reader.releaseLock();}
    })();
    bodies.set(request, pending);
    return pending;
  }
  async function assertHttp(request, session) {
    const identity = cohort(session), hasProof = request.headers.has(LAB_PROOF_HEADER);
    if (!identity) {if (hasProof || internalWorld.has(request) || proofs.has(request)) throw denied('loadlab_unmarked_identity');return session;}
    if (closed || !identity.sessionTokenHash || !identity.instanceId) throw denied('loadlab_invalid_identity');
    if (request.headers.get('x-game-instance') !== identity.instanceId) throw denied('loadlab_instance_mismatch');
    const trusted = internalWorld.get(request);
    if (trusted) {
      const url = new URL(request.url);
      if (request.method !== 'GET' || url.pathname !== '/api/world' || !identityMatches(trusted, identity)) throw denied('loadlab_internal_scope_changed');
      return session;
    }
    let proof = proofs.get(request);
    if (!proof) {
      if (!hasProof) throw denied();
      let pending = verifying.get(request);
      if (!pending) {
        pending = (async () => {
          const url = new URL(request.url), body = await captureBody(request);
          // Fetch Request has no raw peer socket. Only the gateway owns this
          // HMAC key; socket peer/IP and private proxy token are checked there.
          const result = getVerifier().verify({proof:request.headers.get(LAB_PROOF_HEADER), method:request.method,
            path:url.pathname + url.search, body:body ?? '', sessionTokenHash:identity.sessionTokenHash, requireLoopback:false});
          if (!result) throw denied('loadlab_proof_invalid');
          if (request.method === 'POST' && url.pathname === '/api/action' && !url.search) {
            try {verifiedActions.set(request,JSON.parse(body.toString('utf8'))?.action);} catch {throw denied('loadlab_action_invalid');}
          }
          return result;
        })();
        verifying.set(request, pending);
      }
      proof = await pending;
      proofs.set(request, proof);
    }
    if (!identityMatches(proof, identity)) throw denied('loadlab_identity_mismatch');
    if (!session.gamePresence) {
      const url = new URL(request.url);
      let input;
      try {input = JSON.parse((await captureBody(request)).toString('utf8'));} catch {throw denied('loadlab_presence_required');}
      if (request.method !== 'POST' || url.pathname !== '/api/game-presence' || url.search || input?.action !== 'claim') throw denied('loadlab_presence_required');
    }
    // The lease can expire while a body awaits I/O. Recheck without another DB
    // read; native callers still fetch session security/presence every time.
    if (!identityMatches(identity, cohort(session))) throw denied('loadlab_lease_expired');
    return session;
  }
  function assertRealtime(_request, session) {
    // This entry point is called only by the existing signed internal movement
    // and combat bridges. Preserve their normal ticket/grant scope validation.
    const identity = cohort(session);
    if (identity && (closed || !identity.sessionTokenHash || !identity.instanceId || !session.gamePresence)) throw denied('loadlab_invalid_identity');
    return session;
  }
  function beforeSessionTouch(request, session, trustedRealtime = false) {
    const r = getRegistry(), marked = r && (r.accountRun(session?.account?.id) || r.playerRun(session?.player?.id));
    // Ordinary native sessions retain the existing touch path without a new
    // await or key read. HTTP proof headers are never silently ignored.
    if (!marked && !request?.headers?.has(LAB_PROOF_HEADER)) return null;
    if (!request) throw denied('loadlab_request_required');
    if (trustedRealtime) {assertRealtime(request,session);return null;}
    return assertHttp(request,session);
  }
  function trustWorldRequest(parent, derived, session) {
    const identity = cohort(session);
    if (!identity) return;
    const trusted = proofs.get(parent) ?? internalWorld.get(parent), url = new URL(derived.url);
    if (closed || !identityMatches(trusted, identity) || derived.method !== 'GET' || url.pathname !== '/api/world') throw denied('loadlab_internal_source_unverified');
    internalWorld.set(derived, Object.freeze({...identity}));
  }
  function prepareTicketR12(request, session, realm) {
    const identity = cohort(session);
    if (!identity) return null;
    const url = new URL(request.url);
    if (closed || request.method !== 'POST' || url.pathname !== '/api/realtime/ticket' || url.search ||
      !session.gamePresence || !identityMatches(proofs.get(request),identity) ||
      request.headers.get('x-game-instance') !== identity.instanceId) throw denied('loadlab_rate_source_unverified');
    return refreshLoadLabTicketR12({identity,session,realm,now,
      isCurrent:() => !closed && identityMatches(identity,cohort(session)) && identityMatches(proofs.get(request),identity)});
  }
  function ticketClaims(session) {
    const identity = cohort(session);
    if (identity && (closed || !session.gamePresence)) throw denied('loadlab_auth_closed');
    return identity ? {loadlabRunId:identity.runId} : {};
  }
  function rateLimitContext(request, session, scope = 'realtime-ticket') {
    const identity = cohort(session);
    if (!identity) return null;
    const url = new URL(request.url);
    const routeMatches = scope === 'realtime-ticket' && url.pathname === '/api/realtime/ticket' ||
      scope === 'claim-rewards' && url.pathname === '/api/action' && verifiedActions.get(request) === 'claim_rewards';
    if (closed || !session.gamePresence || request.method !== 'POST' || !routeMatches || url.search ||
      !identityMatches(proofs.get(request),identity) || request.headers.get('x-game-instance') !== identity.instanceId) throw denied('loadlab_rate_source_unverified');
    const context = Object.freeze({...identity,scope});rateContexts.add(context);return context;
  }
  function tagRateLimit(context, statement, {scope,identifier,key,limit,windowSeconds,blockSeconds}) {
    const r = getRegistry();
    const limitsMatch = scope === 'realtime-ticket' && limit === 30 && windowSeconds === 60 && blockSeconds === 60 ||
      scope === 'claim-rewards' && limit === 120 && windowSeconds === 60 && blockSeconds === 10;
    if (closed || !rateContexts.has(context) || scope !== context.scope || !limitsMatch || identifier !== context.accountId ||
      !/^[A-Za-z0-9_-]{43}$/.test(key ?? '') ||
      !r?.active(context.runId) || r.accountRun(context.accountId) !== context.runId || r.playerRun(context.playerId) !== context.runId ||
      r.playerInstance(context.playerId) !== context.instanceId || !statement || typeof statement.sql !== 'string' || statement.loadlabRateLimit) throw denied('loadlab_rate_context_invalid');
    rateContexts.delete(context);
    // Metadata is created only by native code after the gateway proof/session
    // gate; the writer independently verifies account/run, SHA key and SQL.
    statement.loadlabRateLimit = Object.freeze({version:1,runId:context.runId,accountId:context.accountId,scope,key});
  }
  return {captureBody, assertHttp, assertRealtime, beforeSessionTouch, trustWorldRequest, ticketClaims, prepareTicketR12, rateLimitContext, tagRateLimit,
    close() {closed = true;verifier?.close();}};
}

export const colLabHttpAuth = createLoadLabHttpAuth();
