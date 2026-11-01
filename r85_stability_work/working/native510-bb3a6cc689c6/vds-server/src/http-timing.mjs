// Read-only native diagnostics. No bodies, player identifiers or auth decisions.
import {nativePerformance,measuredActions} from './performance-metrics.mjs';
export function observeNativeHttpTiming(req, res) {
  const path = String(req.url || '/').split('?', 1)[0];
  if (path !== '/api/action' && path !== '/api/world') return;
  const started = performance.now();
  const supplied = req.headers['x-col-proxy-start-ms'];
  delete req.headers['x-col-proxy-start-ms'];
  const dispatched = typeof supplied === 'string' && /^\d{10,16}$/.test(supplied) ? Number(supplied) : NaN;
  const gap = Date.now() - dispatched;
  const ingressMs = Number.isFinite(gap) && gap >= 0 && gap <= 30000 ? gap : undefined;
  const original = res.writeHead;
  let recorded=false;
  res.writeHead = function (...args) {
    // Even a diagnostic failure must never change response delivery.
    try {
      if (!this.headersSent) {
        const nativeMs=Math.max(0,performance.now()-started);
        this.setHeader('x-col-native-http-ms',String(Math.round(nativeMs)));
        if (ingressMs !== undefined) this.setHeader('x-col-native-ingress-ms', String(ingressMs));
        if(!recorded){
          recorded=true;
          const params=new URL(req.url,'http://localhost').searchParams;
          const suppliedHeaders=typeof args[1]==='object'?args[1]:args[2];
          const header=name=>this.getHeader(name)??Object.entries(suppliedHeaders||{}).find(([key])=>key.toLowerCase()===name)?.[1];
          const action=header('x-col-action');
          const route=path==='/api/world'?`world_${params.get('combat')==='1'?'combat':params.get('compact')==='1'?'compact':params.get('owner')==='1'?'owner':'full'}`
            :measuredActions.has(action)?action:'other_action';
          const match=String(header('server-timing')||'').slice(0,4096).match(/(?:^|,)\s*total;dur=(\d+(?:\.\d+)?)/);
          nativePerformance().record(route,{nativeMs,ingressMs,handlerMs:match?Number(match[1]):undefined},Number(args[0])||this.statusCode,header('x-col-failure'),header('x-col-action-name'),header('x-col-result'));
        }
      }
    } catch {}
    return original.apply(this, args);
  };
}

export function instrumentNativeHttp(server) {
  server.prependListener('request', observeNativeHttpTiming);
}
