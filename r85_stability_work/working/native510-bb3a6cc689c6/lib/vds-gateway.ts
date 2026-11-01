import {deliveryAction,deliveryTiming} from './delivery-timing.ts';
let nextDeliveryLogAt=0;
let nextCombatLogAt=0;
let nextSlowLogAt=0;
let nextWorldLogAt=0;
let nextWorldSlowLogAt=0;
type GatewayEnvironment = { VDS_GAME_ENABLED?: string; VDS_PROXY_TOKEN?: string; VDS_MAINTENANCE?: string };
export async function vdsGateway(request: Request, env: GatewayEnvironment): Promise<Response | null> {
  const url = new URL(request.url);
  // The source controller remains reachable during cutover and afterwards.
  if (url.pathname === "/api/admin/vds-migration") return null;
  // Recovery installers remain available even while the game service is down.
  if (["/full-install.sh", "/realtime-install.sh", "/direct-vds.py"].includes(url.pathname) || url.pathname.startsWith("/releases/") || url.pathname.startsWith("/game/") || url.pathname.startsWith("/dungeon/")) return null;
  if (env.VDS_GAME_ENABLED === "1") {
    if (!/^[a-f0-9]{64}$/.test(env.VDS_PROXY_TOKEN || "")) return new Response("Game server configuration unavailable", { status: 503 });
    const headers = new Headers(request.headers);
    headers.set("x-col-proxy-token", env.VDS_PROXY_TOKEN!);
    headers.set("x-col-public-host", url.hostname);
    headers.set("x-col-client-ip", request.headers.get("cf-connecting-ip") || "unknown");
    headers.delete("host");
    if (url.pathname === "/" || request.headers.get("accept")?.includes("text/html") || request.headers.get("rsc") === "1") {
      headers.delete("if-none-match");
      headers.delete("if-modified-since");
    }
    // Never retry a mutation or fall through to the now-stale D1 database.
    try {
      const upstreamStarted = performance.now();
      const response = await fetch(`https://realtime.coreoflife.net/_game${url.pathname}${url.search}`, {
        method: request.method, headers, body: ["GET","HEAD"].includes(request.method) ? undefined : request.body,
        // An abandoned poll must not keep its upstream connection alive for
        // another 30 seconds. The incoming signal is enabled in vite.config.ts.
        redirect: "manual", signal: AbortSignal.any([request.signal, AbortSignal.timeout(30000)]),
      });
      const result = new Response(response.body, response);
      // Keep app/proxy timings so a slow network hop can be distinguished from
      // a slow combat calculation, without logging any player data.
      const edgeMs=performance.now()-upstreamStarted;
      result.headers.append("Server-Timing", `vds_edge;dur=${Math.round(edgeMs)}`);
      if(url.pathname==='/api/world'){
        const now=Date.now(),slow=edgeMs>=100&&now>=nextWorldSlowLogAt;
        if(slow||now>=nextWorldLogAt){
          nextWorldLogAt=now+10000;
          if(slow)nextWorldSlowLogAt=now+1000;
          const mode=url.searchParams.get('combat')==='1'?'combat':url.searchParams.get('compact')==='1'?'compact':'full';
          console.info('game_world_delivery_timing',JSON.stringify({mode,status:result.status,...deliveryTiming(response.headers.get('server-timing'),edgeMs)}));
        }
      }
      if(url.pathname==='/api/action'){
        const timing=deliveryTiming(response.headers.get('server-timing'),edgeMs),now=Date.now();
        const actionHeader=response.headers.get('x-col-action');
        const action=deliveryAction(actionHeader);
        // A legacy native release only provides total timing for combat.
        const combat=action==='attack'||action==='pvp_attack'||(actionHeader===null&&timing.appMs!==undefined);
        const slow=edgeMs>=100&&now>=nextSlowLogAt;
        if(slow)nextSlowLogAt=now+1000;
        // Heartbeats repeat every five seconds; one shared sample clock could
        // always select them and hide the combat path we need to diagnose.
        if(combat&&(slow||now>=nextCombatLogAt)){
          nextCombatLogAt=now+(edgeMs>=150?1000:5000);
          console.info('game_combat_delivery_timing',JSON.stringify({action,status:result.status,...timing}));
        }else if(!combat&&(slow||now>=nextDeliveryLogAt)){
          nextDeliveryLogAt=now+15000;
          console.info('game_delivery_timing',JSON.stringify({action,status:result.status,...timing}));
        }
      }
      // A fresh navigation must load the active client manifest. Hashed JS and
      // artwork retain their cache policy; entry HTML/RSC cannot pin an old UI.
      const contentType = result.headers.get("content-type") ?? "";
      if (contentType.includes("text/html") || contentType.includes("text/x-component")) {
        result.headers.set("Cache-Control", "no-store");
        result.headers.set("CDN-Cache-Control", "no-store");
        result.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
        result.headers.delete("ETag");
        result.headers.delete("Last-Modified");
      }
      result.headers.set("x-col-runtime", "vds");
      result.headers.set("X-Content-Type-Options", "nosniff");
      result.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      result.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=(), payment=(self)");
      result.headers.set("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
      result.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      return result;
    } catch { return new Response("Oyun sunucusuna ulaşılamıyor. Lütfen tekrar bağlan.", { status: 503, headers: { "cache-control": "no-store" } }); }
  }
  if (env.VDS_MAINTENANCE === "1") return new Response("Sunucu taşınıyor. Hesabın ve eşyaların korunuyor; lütfen biraz sonra tekrar gir.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "retry-after": "60" } });
  return null;
}
