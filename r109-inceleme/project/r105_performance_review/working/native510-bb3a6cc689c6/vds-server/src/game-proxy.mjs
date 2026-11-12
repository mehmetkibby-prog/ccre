import http from 'node:http';

function upstreamOptions(options, startedAtMs) {
  const pathname = String(options.path || '/').split('?', 1)[0];
  if (pathname !== '/api/action' && pathname !== '/api/world') return options;
  // These frequent JSON responses must not wait behind password hashing in
  // Node's shared compression threadpool. The outer Caddy still compresses.
  const headers = {...options.headers};
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'accept-encoding') delete headers[key];
  }
  headers['accept-encoding'] = 'identity';
  // Always overwrite an incoming value. Used for timing only, never authority.
  for (const key of Object.keys(headers)) if (key.toLowerCase() === 'x-col-proxy-start-ms') delete headers[key];
  headers['x-col-proxy-start-ms'] = String(startedAtMs);
  return {...options, headers};
}

// Authorization and trusted headers are resolved by the control server first.
// Each incoming request creates exactly one upstream request, with no retries.
export function proxyGameRequest(req, res, options, {timeoutMs = 30000, onTiming} = {}) {
  const started = performance.now();
  const elapsedMs = () => Math.max(0, Math.min(2147483647, Math.round(performance.now() - started)));
  let responseStream;
  let stopped = false;
  let reported = false;
  let headersMs = null;
  let upstreamStatus = null;
  let appTotalMs;
  let socketMs, sentMs;
  const pathname = String(options.path || '/').split('?', 1)[0];
  // Socket timeouts begin only after assignment. Bound the complete queued
  // gameplay request as well, without changing long-lived non-game streams.
  const deadline = pathname === '/api/action' || pathname === '/api/world'
    ? setTimeout(() => fail('timeout'), timeoutMs) : undefined;
  deadline?.unref?.();
  const upstream = http.request(upstreamOptions(options, Date.now()), response => {
    responseStream = response;
    response.once('aborted', unavailable);
    response.once('error', unavailable);
    if (stopped || res.destroyed || res.writableEnded) {
      response.destroy();
      cancel();
      return;
    }
    headersMs = elapsedMs();
    upstreamStatus = response.statusCode || 502;
    if (typeof onTiming === 'function') {
      const match = String(response.headers['server-timing'] || '').slice(0, 4096)
        .match(/(?:^|,)\s*total\s*;\s*dur=(\d+(?:\.\d+)?)(?=\s*(?:[,;]|$))/i);
      if (match && Number(match[1]) <= 2147483647) appTotalMs = Number(match[1]);
    }
    const nativeDuration = name => {
      const value = response.headers[name];
      return typeof value === 'string' && /^\d{1,8}$/.test(value) && Number(value) <= 30000 ? Number(value) : undefined;
    };
    const httpMs = nativeDuration('x-col-native-http-ms'), ingressMs = nativeDuration('x-col-native-ingress-ms');
    const timing = [`vds_proxy;dur=${headersMs}`,
      ...(socketMs === undefined ? [] : [`vds_queue;dur=${socketMs}`]),
      ...(sentMs === undefined ? [] : [`vds_send;dur=${sentMs}`]),
      ...(ingressMs === undefined ? [] : [`vds_ingress;dur=${ingressMs}`]),
      ...(httpMs === undefined ? [] : [`vds_http;dur=${httpMs}`])].join(', ');
    const headers = {...response.headers, 'server-timing': response.headers['server-timing']
      ? `${response.headers['server-timing']}, ${timing}` : timing};
    delete headers['x-col-native-http-ms'];
    delete headers['x-col-native-ingress-ms'];
    res.writeHead(upstreamStatus, headers);
    response.pipe(res);
  });
  upstream.once('socket', () => {socketMs = elapsedMs();});
  upstream.once('finish', () => {sentMs = elapsedMs();});
  function report(outcome) {
    if (reported) return;
    reported = true;
    clearTimeout(deadline);
    if (typeof onTiming !== 'function') return;
    try {
      const result = onTiming({totalMs: elapsedMs(), headersMs, upstreamStatus, outcome,
        ...(appTotalMs === undefined ? {} : {appTotalMs})});
      // Diagnostics must not affect delivery, including an accidental async observer.
      if (typeof result?.catch === 'function') result.catch(() => {});
    } catch {}
  }
  function stop() {
    if (stopped) return;
    stopped = true;
    clearTimeout(deadline);
    req.unpipe(upstream);
    responseStream?.unpipe(res);
    responseStream?.destroy();
    upstream.destroy();
  }
  function cancel() { report('cancelled'); stop(); }
  function fail(outcome) {
    if (stopped) return;
    report(outcome);
    stop();
    if (res.destroyed || res.writableEnded) return;
    if (res.headersSent) res.destroy();
    else {
      res.writeHead(503, {'content-type': 'application/json', 'cache-control': 'no-store'});
      res.end(JSON.stringify({error: 'Game server unavailable'}));
    }
  }
  function unavailable() { fail('failed'); }
  upstream.setTimeout(timeoutMs, () => fail('timeout'));
  upstream.once('error', unavailable);
  req.once('aborted', cancel);
  req.once('error', cancel);
  res.once('error', cancel);
  res.once('finish', () => report('completed'));
  // req.aborted stays false after a complete GET/POST body. The response is
  // therefore the lifetime signal while the client waits for headers or data.
  res.once('close', () => { if (!res.writableFinished) cancel(); });
  req.pipe(upstream);
  return upstream;
}
