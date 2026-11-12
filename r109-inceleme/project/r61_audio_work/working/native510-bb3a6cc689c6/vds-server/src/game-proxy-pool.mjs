import http from 'node:http';
import { setImmediate as yieldImmediate } from 'node:timers/promises';
import { isApplicationHealthReady } from './app-readiness.mjs';

const HEALTH_PATH = '/api/vds-health';
const HEALTH_BODY_LIMIT = 262_144;

function countEntries(collection) {
  return Object.values(collection).reduce((sum, values) => sum + values.length, 0);
}

async function settlePass(tasks) {
  const results = await Promise.allSettled(tasks);
  const failures = results.filter((result) => result.status === 'rejected');
  const failure = failures.find((result) => result.reason?.code === 'ERR_GAME_PROXY_HEALTH_IDENTITY') ?? failures[0];
  if (failure) throw failure.reason;
}

function closedError() {
  return Object.assign(new Error('Game proxy connection pool is closed'), {
    code: 'ERR_GAME_PROXY_POOL_CLOSED',
  });
}

/** Private loopback connections. Health probes never carry player credentials. */
export function createGameProxyPool({
  hostname = '127.0.0.1',
  port = 3003,
  startupId,
  actionCapacity = 16,
  worldCapacity = 16,
  probeTimeoutMs = 2_000,
  maintenanceIntervalMs = 20_000,
  maintenanceProbeTimeoutMs = 250,
  onError = () => {},
} = {}) {
  if (typeof startupId !== 'string' || !startupId.trim()) {
    throw new TypeError('A nonempty startupId is required');
  }
  for (const value of [actionCapacity, worldCapacity]) {
    if (!Number.isInteger(value) || value < 2 || value > 64) throw new TypeError('Game lane capacity must be an integer from 2 to 64');
  }
  for (const [name, value] of Object.entries({ probeTimeoutMs, maintenanceIntervalMs, maintenanceProbeTimeoutMs })) {
    if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${name} must be positive`);
  }

  let closed = false;
  let ready = false;
  let primePromise;
  let maintenanceTimer;
  let maintaining = false;
  const probes = new Set();
  const lanes = [{path:'/api/action',capacity:actionCapacity},{path:'/api/world',capacity:worldCapacity}].map(({ path, capacity }) => {
    const agent = new http.Agent({
      keepAlive: true,
      maxSockets: capacity,
      maxFreeSockets: capacity,
      scheduling: 'lifo',
      timeout: 60_000,
    });
    const addRequest = agent.addRequest;
    // Node Agents can be reused after destroy(); references held by a request must
    // not reopen this pool after the application has stopped or changed identity.
    agent.addRequest = function guardedAddRequest(request, ...args) {
      if (closed) {
        const error = closedError();
        request.destroy(error);
        request.onSocket(null, error);
        return;
      }
      return addRequest.call(this, request, ...args);
    };
    return { path, capacity, agent };
  });

  function report(error) {
    try { onError(error); } catch { /* Logging cannot escape the maintenance task. */ }
  }

  function probe(agent, timeoutMs, fifo = false) {
    if (closed) return Promise.reject(closedError());
    return new Promise((resolve, reject) => {
      let request;
      let timer;
      let settled = false;
      function finish(error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (request) probes.delete(request);
        if (error) {
          request?.destroy(error);
          reject(error);
        } else {
          resolve();
        }
      }
      const originalScheduling = agent.scheduling;
      try {
        if (fifo) agent.scheduling = 'fifo';
        request = http.get({
          hostname,
          port,
          path: HEALTH_PATH,
          agent,
          headers: { accept: 'application/json', 'accept-encoding': 'identity' },
        }, (response) => {
          if (response.statusCode !== 200) {
            response.resume();
            finish(new Error(`Native application health returned ${response.statusCode}`));
            return;
          }
          const chunks = [];
          let length = 0;
          response.on('data', (chunk) => {
            length += chunk.length;
            if (length > HEALTH_BODY_LIMIT) {
              finish(new Error('Native application health response is too large'));
              return;
            }
            chunks.push(chunk);
          });
          response.once('error', finish);
          response.once('aborted', () => finish(new Error('Native application health response was aborted')));
          response.once('end', () => {
            if (settled) return;
            let value;
            try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
            catch (error) { finish(error); return; }
            if (!isApplicationHealthReady(value, startupId)) {
              finish(Object.assign(new Error('Native application readiness or startup identity changed'), {
                code: 'ERR_GAME_PROXY_HEALTH_IDENTITY',
              }));
              return;
            }
            finish();
          });
        });
      } catch (error) {
        finish(error);
        return;
      } finally {
        agent.scheduling = originalScheduling;
      }
      probes.add(request);
      request.once('error', finish);
      timer = setTimeout(() => finish(Object.assign(new Error('Native application health probe timed out'), {
        code: 'ERR_GAME_PROXY_HEALTH_TIMEOUT',
      })), timeoutMs);
      timer.unref?.();
    });
  }

  function stop() {
    if (closed) return;
    closed = true;
    ready = false;
    clearInterval(maintenanceTimer);
    maintenanceTimer = undefined;
    // Remove queued application requests before destroying sockets. Otherwise
    // socket removal can cause Node's Agent to assign a new socket to the queue.
    for (const { agent } of lanes) {
      for (const [key, requests] of Object.entries(agent.requests)) {
        delete agent.requests[key];
        for (const request of requests) {
          const error = closedError();
          request.destroy(error);
          // Complete Node's pending socket assignment with an error; destroy()
          // alone cannot emit error/close before a queued request has a socket.
          request.onSocket(null, error);
        }
      }
    }
    for (const request of probes) request.destroy(closedError());
    probes.clear();
    for (const { agent } of lanes) agent.destroy();
  }

  function prime() {
    if (closed) return Promise.reject(closedError());
    if (ready) return Promise.resolve();
    if (primePromise) return primePromise;
    primePromise = (async () => {
      try {
        // Concurrent probes force creation of every bounded connection before
        // admitting gameplay; only the read-only health route is called.
        await Promise.all(lanes.flatMap(({ agent, capacity }) =>
          Array.from({ length: capacity }, () => probe(agent, probeTimeoutMs))));
        if (closed) throw closedError();
        ready = true;
      } catch (error) {
        stop();
        throw error;
      }
    })();
    return primePromise;
  }

  async function maintainLane({ agent, capacity }) {
    const active = () => countEntries(agent.sockets);
    const queued = () => countEntries(agent.requests);
    const free = () => countEntries(agent.freeSockets);
    if (closed || queued()) return;
    const idleConnections = free();
    if (active() === 0 && idleConnections < capacity - 1) {
      // A timeout or native idle-close may remove some or all connections.
      // Sequential probes would reuse one survivor forever. When entirely idle,
      // restore all but one slot concurrently. A player arriving during this
      // pass can create the final connection without waiting for health probes.
      await settlePass(Array.from({ length: capacity - 1 }, () =>
        probe(agent, maintenanceProbeTimeoutMs, true)));
      return;
    }
    for (let index = 0; index < idleConnections; index += 1) {
      if (closed || queued() || free() <= 1 || active() >= capacity - 1) return;
      // Rotate the oldest spare connection, leaving at least one idle socket
      // for a player. Yield between probes so gameplay always gets priority.
      await probe(agent, maintenanceProbeTimeoutMs, true);
      await yieldImmediate();
    }
  }

  async function maintain() {
    if (closed || !ready || maintaining) return;
    maintaining = true;
    try {
      await settlePass(lanes.map(maintainLane));
    } catch (error) {
      if (error?.code === 'ERR_GAME_PROXY_HEALTH_IDENTITY') stop();
      if (!closed || error?.code === 'ERR_GAME_PROXY_HEALTH_IDENTITY') report(error);
    } finally {
      maintaining = false;
    }
  }

  function start() {
    if (closed || !ready || maintenanceTimer) return;
    maintenanceTimer = setInterval(() => { void maintain(); }, maintenanceIntervalMs);
    maintenanceTimer.unref?.();
  }

  return {
    prime,
    start,
    stop,
    agentFor(path) {
      const pathname = typeof path === 'string' ? path.split('?', 1)[0] : '';
      return lanes.find((lane) => lane.path === pathname)?.agent;
    },
    get ready() { return ready; },
    get closed() { return closed; },
  };
}
