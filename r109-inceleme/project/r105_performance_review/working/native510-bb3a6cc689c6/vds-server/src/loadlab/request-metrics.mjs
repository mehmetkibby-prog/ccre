import { randomUUID } from 'node:crypto';

// Monotonic counters, not latency samples. Four scalars per process; no SQL,
// timer, request body, player identity, URL key, or growing history is retained.
export function createLoadLabRequestMetrics({ now = Date.now } = {}) {
  let generation = randomUUID(), requests = 0, errors = 0;
  function record(status, count = 1) {
    if (!Number.isSafeInteger(count) || count < 1 || count > 256) return;
    if (requests > Number.MAX_SAFE_INTEGER - count) { generation = randomUUID(); requests = 0; errors = 0; }
    requests += count;
    // Ordinary authorization/gameplay rejections (4xx) are denominator traffic,
    // not server failures. Unknown result status is an infrastructure failure.
    if (!Number.isInteger(status) || status < 100 || status > 599 || status >= 500) errors += count;
  }
  return {
    record,
    snapshot: () => ({ generation, requests, errors, sampledAtMs: now(), scope: 'completed-live-game-http-and-ws' }),
  };
}

export function instrumentLoadLabHttp(server, metrics) {
  const observe = (request, response) => {
    const pathname = String(request.url || '').split('?', 1)[0];
    if (!pathname.startsWith('/api/') || pathname === '/api/vds-health' || pathname === '/api/site-visit') return;
    let recorded = false;
    const complete = () => {
      if (recorded) return;
      recorded = true;
      response.off('finish', complete); response.off('close', complete);
      // A caller closing before headers is not, by itself, a server exception.
      metrics.record(response.headersSent ? response.statusCode : 499);
    };
    response.once('finish', complete); response.once('close', complete);
  };
  server.prependListener('request', observe);
  return () => server.off('request', observe);
}

export function aggregateLoadLabRequestMetrics(own, supervisor) {
  const unavailable = () => ({ generation: null, requests: null, errors: null, sampledAtMs: null, available: false });
  return {
    snapshot() {
      const main = own.snapshot(), rows = [main];
      for (const channel of [1, 2, 3]) {
        const state = supervisor.children.get(channel), row = state?.health?.labSafetyCounters;
        if (!state?.ready || !row || typeof row.generation !== 'string' || !Number.isSafeInteger(row.requests) || row.requests < 0 ||
          !Number.isSafeInteger(row.errors) || row.errors < 0 || row.errors > row.requests || !Number.isSafeInteger(row.sampledAtMs)) return unavailable();
        rows.push(row);
      }
      const requests = rows.reduce((n, row) => n + row.requests, 0), errors = rows.reduce((n, row) => n + row.errors, 0);
      if (!Number.isSafeInteger(requests) || !Number.isSafeInteger(errors)) return unavailable();
      return { generation: rows.map(row => row.generation).join(':'), requests, errors,
        sampledAtMs: Math.min(...rows.map(row => row.sampledAtMs)), available: true, scope: 'all-live-game-http-and-ws' };
    },
  };
}
