import {readFileSync, lstatSync, realpathSync} from 'node:fs';
import {LAB_PROOF_HEADER, LAB_SOURCE_IP, createLabProofVerifier, normalizeSocketIp} from './loadlab-proof.mjs';

function runtimeKey(file) {
  if (typeof file !== 'string' || !file.startsWith('/') || file.includes('\0') || realpathSync(file) !== file) throw Error('Canonical load-lab runtime file required');
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.uid !== 0 || (stat.mode & 0o022) || stat.size > 16384) throw Error('Private root-owned load-lab runtime required');
  const config = JSON.parse(readFileSync(file, 'utf8'));
  if (config.schemaVersion !== 1 || config.allowedSourceIp !== LAB_SOURCE_IP || !/^[a-f0-9]{64}$/.test(config.controlKey ?? '')) throw Error('Invalid load-lab runtime configuration');
  return config.controlKey;
}

// Dedicated authenticated cohort quota; normal constants remain untouched.
// Global registry must already be installed by the shared root bootstrap.
export function createLabRealtimeGuard({key, runtimeFile = process.env.CORE_LOADLAB_RUNTIME_FILE,
  getRegistry = () => globalThis.__colLoadLab, now = Date.now, setTimer = setInterval, clearTimer = clearInterval} = {}) {
  const secret = key ?? runtimeKey(runtimeFile);
  const registry = () => {
    const r = getRegistry();
    if (!r || !['playerRun','accountRun','active'].every(name => typeof r[name] === 'function')) throw Error('loadlab_registry_unavailable');
    return r;
  };
  registry();
  const active = p => {
    const r = registry();
    return r.active(p.runId) && r.playerRun(p.playerId) === p.runId && r.accountRun(p.accountId) === p.runId;
  };
  const verifier = createLabProofVerifier({key: secret, now, isActive: active});
  const sockets = new Set();
  let closed = false;
  const clock = setTimer(() => {
    for (const socket of sockets) {
      try {if (!active(socket.colLabProof)) socket.terminate();}
      catch {socket.terminate();}
    }
  }, 1000); clock?.unref?.();
  return {
    admit(request, path) {
      const proof = request.headers[LAB_PROOF_HEADER];
      if (proof === undefined) return null;
      if (closed || path !== '/ws' || request.url !== '/ws' || request.method !== 'GET' ||
        !['127.0.0.1','::1'].includes(normalizeSocketIp(request.socket.remoteAddress))) throw Error('loadlab_gateway_only');
      const result = verifier.verify({proof, method:'GET', path:'/ws', body:'', peerIp:request.socket.remoteAddress});
      if (!result) throw Error('loadlab_proof_invalid');
      return result;
    },
    attach(socket, proof) {
      if (!proof) return;
      if (closed || sockets.size >= 75 || !active(proof)) throw Error('loadlab_connection_capacity');
      socket.colLabProof = proof; sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
    },
    assertTicket(socket, player) {
      const r = registry(), run = r.playerRun(player.playerId), proof = socket.colLabProof;
      // The native ECDSA-signed marker survives RT restarts with a missing
      // registry file. A marked ticket can never fall back to normal admission.
      if (!proof) {if (run || player.loadlabRunId !== undefined) throw Error('loadlab_gateway_required'); return;}
      if (closed || !run || run !== proof.runId || player.loadlabRunId !== run || player.playerId !== proof.playerId ||
        (proof.instanceId && player.instanceId !== proof.instanceId) || !active(proof)) throw Error('loadlab_ticket_mismatch');
    },
    assertActive(socket) {
      if (socket.colLabProof && (closed || !active(socket.colLabProof))) throw Error('loadlab_lease_expired');
    },
    close() {if (closed) return;closed=true;clearTimer(clock);for (const socket of sockets) socket.terminate();sockets.clear();verifier.close();},
  };
}
