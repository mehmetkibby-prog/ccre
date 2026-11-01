import {startRuntimePerformance,runtimePerformance,measureSync504,realtimeWorkName504} from '../../vds-server/src/runtime-performance.mjs';
import {v504Features,feature504} from '../../vds-server/src/features504.mjs';
import {createRealtimeMaintenance491} from './maintenance491.mjs';
import {perfR15Features} from '../../vds-server/src/perf-r15-features.mjs';
import {perfR13Features} from '../../vds-server/src/perf-r13-features.mjs';
import {perfR11Features} from '../../vds-server/src/perf-r11-features.mjs';
import {loadRuntimeConfig,installRegistry} from '../../vds-server/src/loadlab/registry.mjs';
import {createLabRealtimeGuard} from './loadlab-rt.mjs';
import {createMovementRelay} from './movement-relay.mjs';
import {createCombatRelay} from './combat-relay.mjs';
import {COMBAT_STREAM_PATH} from './combat-wire.mjs';
import {MOVEMENT_STREAM_PATH} from './movement-wire.mjs';
import { CombatShadow } from "./combat.mjs";
import { MESSAGE_BUDGET_REVISION } from "./message-budget.mjs";
import { INGRESS_SECURITY_REVISION, isLocalBroadcastRequest } from "./broadcast-ingress.mjs";
import { MOTION_PROTOCOL } from "./motion.mjs";
import { BROADCAST_CAPACITY_REVISION, BROADCAST_BATCH_REVISION, MAX_BATCH_EVENTS, MAX_BATCH_BYTES, createBroadcastBudget } from "./broadcast-budget.mjs";
import http from "node:http";
import { pathToFileURL } from "node:url";
import { WebSocketServer } from "ws";
import { realtimeSecurityReady, verifyRealtimeTicket, verifySignedRealtimeRequest } from "./security.mjs";
import {
  authenticateSocket,
  resolveMaintenanceIdentity492,
  broadcastAuthoritativeEvent,
  broadcastWorldEvent,
  broadcastPlayerEvent,
  disconnectSocket,
  handleSocketMessage,
  heartbeatSockets,
  realtimeStats,
  renewSocketLease,
  SESSION_PROTOCOL,
} from "./rooms.mjs";

const PORT = Math.max(1_024, Math.min(65_535, Number(process.env.PORT) || 3_001));
const HOST = process.env.HOST || "127.0.0.1";
const ALLOWED_ORIGINS = new Set(String(process.env.ALLOWED_ORIGINS || "https://coreoflife.net,https://www.coreoflife.net").split(",").map((value) => value.trim()).filter(Boolean));
const MAX_CONNECTIONS = Math.max(50, Math.min(5_000, Number(process.env.MAX_CONNECTIONS) || 1_000));
const MAX_PENDING_AUTH = Math.max(10, Math.min(500, Number(process.env.MAX_PENDING_AUTH) || 128));
const MAX_CONNECTIONS_PER_IP = Math.max(4, Math.min(100, Number(process.env.MAX_CONNECTIONS_PER_IP) || 32));
const MAX_PENDING_AUTH_PER_IP = Math.max(2, Math.min(30, Number(process.env.MAX_PENDING_AUTH_PER_IP) || 8));
const MAX_BROADCAST_VERIFICATIONS = Math.max(4, Math.min(128, Number(process.env.MAX_BROADCAST_VERIFICATIONS) || 128));
const RELEASE_ID = /^[A-Za-z0-9._-]{1,80}$/.test(String(process.env.REALTIME_RELEASE_ID || ""))
  ? String(process.env.REALTIME_RELEASE_ID)
  : "development";
const SUPPORTED_AREAS = Object.freeze(["forest", "frozen", "bazaar", "fishing", "sanctum", "sinsi", "war", "arena", "black", "ancient", "event", "rune", "rune_v2", "afk", "dragon"]);
const startedAt = Date.now();

function json(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
    "x-content-type-options": "nosniff",
  });
  response.end(body);
}

function readBody(request, limit = 24_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("payload_too_large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function clientIp(request) {
  // Caddy overwrites X-Real-IP from a verified Cloudflare hop or the actual
  // direct socket peer. Browser-supplied forwarding headers never set quotas.
  const trusted = String(request.headers["x-real-ip"] || "").trim();
  return (trusted || request.socket.remoteAddress || "unknown").slice(0, 80);
}

function signedRequestHeadersLookValid(headers) {
  return headers["x-col-key-id"] === "coreoflife-p256-2026-09"
    && /^\d{10}$/.test(String(headers["x-col-timestamp"] || ""))
    && /^[A-Za-z0-9-]{16,80}$/.test(String(headers["x-col-nonce"] || ""))
    && /^[A-Za-z0-9_-]{80,128}$/.test(String(headers["x-col-signature"] || ""));
}

export function createRealtimeServer() {
  const labRuntimeConfig = loadRuntimeConfig(process.env.CORE_LOADLAB_RUNTIME_FILE);
  if (!labRuntimeConfig) throw Error("loadlab_runtime_configuration_required");
  const labRegistryHandle = installRegistry({config:labRuntimeConfig});
  const labGuard = createLabRealtimeGuard({key:labRuntimeConfig.controlKey});
  const webSockets = new WebSocketServer({ noServer: true, maxPayload: 8_192, perMessageDeflate: false });
  const maintenance491=createRealtimeMaintenance491({clients:()=>webSockets.clients});
  let maintenanceVerifications491=0,diagnosticVerifications504=0;
  const stopDiagnostics504=feature504('slowWork')?startRuntimePerformance():()=>{};
  const movementRelay = createMovementRelay({verify:verifySignedRealtimeRequest,clients:()=>webSockets.clients});
  const combatRelay = createCombatRelay({verify:verifySignedRealtimeRequest,clients:()=>webSockets.clients});
  const combatShadow = new CombatShadow();
  const diagnostics = { opened: 0, closed: 0, renewed: 0, rejectedAuth: 0, broadcastAccepted: 0, broadcastBatches: 0, broadcastRateLimited: 0, broadcastBusy: 0, broadcastRejectedAuth: 0, closeCodes: {} };
  diagnostics.admission = { rawFlood: 0, movementBudget: 0, combatBudget: 0, attackPreviewBudget: 0, renewalBudget: 0 };
  const connectionsByIp = new Map();
  const pendingByIp = new Map();
  const allowBroadcastRequest = createBroadcastBudget();
  let pendingAuth = 0;
  let broadcastVerifications = 0;
  function deliverBroadcast(kind, parsed) { return measureSync504('realtime_broadcast',()=>{
    if (parsed?.v !== 1 || !parsed.event || typeof parsed.event !== "object") throw new Error("invalid_payload");
    const delivered = kind === "players" ? broadcastPlayerEvent(parsed.cycle, parsed.audiencePlayerIds, parsed.event) : kind === "world"
      ? (() => {
          if (!Number.isSafeInteger(parsed.cycle) || parsed.room !== undefined) throw new Error("invalid_payload");
          return broadcastWorldEvent(parsed.cycle, parsed.event);
        })()
      : (() => {
          if (!parsed.room || parsed.cycle !== undefined) throw new Error("invalid_payload");
          return broadcastAuthoritativeEvent(parsed.room, parsed.event);
        })();
    if(parsed.event.type==='gm_visibility')maintenance491.revalidate(true);
    // The signed envelope is server-to-server only. Never put this audit
    // input into the event passed to room clients. Old packages ignore it.
    if (kind === "room" && parsed.combatAudit) {
      const identity = parsed.room;
      const scope = `${identity.cycle}:${identity.channel}:${identity.area}:${identity.arenaMatchId || ""}`;
      combatShadow.observe(scope, parsed.combatAudit, parsed.event);
    }
    return { ok: true, delivered, ...(['world_delta','world_reset'].includes(parsed.event.type)?{worldPushProtocol:'world-delta-v1'}:{}), ...(parsed.event.type === "gm_visibility" ? { visibilityProtocol: "gm-visibility-v1" } : {}) };
  });}
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (request.method === "GET" && url.pathname === "/healthz") {
      json(response, 200, { ok: true, loadlabProtocol: 1, v504Features:v504Features.snapshot, perfR11Features:perfR11Features.snapshot,perfR13Features:perfR13Features.snapshot,perfR15Features:perfR15Features.snapshot, version: "dedicated-v1", protocol: "col-realtime-1", motionProtocol: MOTION_PROTOCOL, sessionProtocol: SESSION_PROTOCOL, visibilityProtocol: "gm-visibility-v1", messageBudgetRevision: MESSAGE_BUDGET_REVISION, guildEventsRevision:298, armorMitigationRevision:298, broadcastCapacityRevision: BROADCAST_CAPACITY_REVISION, broadcastBatchRevision: BROADCAST_BATCH_REVISION, roomFanoutRevision:407, worldPushProtocol:"world-delta-v1", movement:movementRelay.snapshot(),combatTransport:combatRelay.snapshot(), ingressSecurityRevision: INGRESS_SECURITY_REVISION, releaseId: RELEASE_ID, supportedAreas: SUPPORTED_AREAS, forestWorld: { width: 5400, height: 3375 }, blackWorld: { width: 5400, height: 3375 }, frozenWorld: {width:4800,height:3000}, worldLayout:24, expansion65Revision:335, ancientWorld:{width:3600,height:3600}, forestCoreCollisionRevision:297, motionSpeedRevision:280, motionTimelineRevision:311, warWorld: {width:3600,height:2250}, botCheckProtocol: "deadline-v1", privateEventsProtocol: "audience-v1", uptime: Math.floor((Date.now() - startedAt) / 1_000), cpuUsage:process.cpuUsage(),uptimeMs:Date.now()-startedAt, ...realtimeStats(), combat: combatShadow.status(),eventRevision:444,eventBounds:{minX:650,maxX:2950,minY:480,maxY:1700},skillRevision:456,maxAbility:3,mixedAreaRevision:473,runeRevision:423,runeWorld:{width:4320,height:2880}, guildVillageRevision:368, guildPrivateHallProtocol:"scoped-lease-v1",guildWorldChatRevision:451,publicChatRevision:479, maintenance491:maintenance491.snapshot(),diagnostics: { ...diagnostics, pendingAuth, memoryBytes: process.memoryUsage().rss } });
      return;
    }
    if (request.method === "GET" && url.pathname === "/readyz") {
      try {
        await realtimeSecurityReady();
        json(response, 200, { ok: true, loadlabProtocol: 1, v504Features:v504Features.snapshot, perfR11Features:perfR11Features.snapshot,perfR13Features:perfR13Features.snapshot,perfR15Features:perfR15Features.snapshot, version: "dedicated-v1", protocol: "col-realtime-1", motionProtocol: MOTION_PROTOCOL, sessionProtocol: SESSION_PROTOCOL, visibilityProtocol: "gm-visibility-v1", messageBudgetRevision: MESSAGE_BUDGET_REVISION, guildEventsRevision:298, armorMitigationRevision:298, broadcastCapacityRevision: BROADCAST_CAPACITY_REVISION, broadcastBatchRevision: BROADCAST_BATCH_REVISION, roomFanoutRevision:407, worldPushProtocol:"world-delta-v1", movement:movementRelay.snapshot(),combatTransport:combatRelay.snapshot(), ingressSecurityRevision: INGRESS_SECURITY_REVISION, releaseId: RELEASE_ID, supportedAreas: SUPPORTED_AREAS, forestWorld: { width: 5400, height: 3375 }, blackWorld: { width: 5400, height: 3375 }, frozenWorld: {width:4800,height:3000}, worldLayout:24, expansion65Revision:335, ancientWorld:{width:3600,height:3600}, forestCoreCollisionRevision:297, motionSpeedRevision:280, motionTimelineRevision:311, warWorld: {width:3600,height:2250}, botCheckProtocol: "deadline-v1", privateEventsProtocol: "audience-v1", ...realtimeStats(), combat: combatShadow.status(),eventRevision:444,eventBounds:{minX:650,maxX:2950,minY:480,maxY:1700},skillRevision:456,maxAbility:3,mixedAreaRevision:473,runeRevision:423,runeWorld:{width:4320,height:2880}, guildVillageRevision:368, guildPrivateHallProtocol:"scoped-lease-v1",guildWorldChatRevision:451,publicChatRevision:479 });
      } catch {
        json(response, 503, { ok: false, error: "not_ready" });
      }
      return;
    }
    if(request.method==='POST'&&url.pathname==='/internal/diagnostics504'){
      if(!isLocalBroadcastRequest(request)){json(response,403,{ok:false,error:'internal_only'});return;}
      const length=Number(request.headers['content-length']||0);
      if(!String(request.headers['content-type']||'').toLowerCase().startsWith('application/json')||!signedRequestHeadersLookValid(request.headers)||!Number.isFinite(length)||length<0||length>128){json(response,400,{ok:false,error:'invalid_request'});return;}
      if(diagnosticVerifications504>=2){json(response,503,{ok:false,error:'server_busy'});return;}diagnosticVerifications504++;
      try{const body=await readBody(request,128);if(!await verifySignedRealtimeRequest(request.headers,url.pathname,body)){json(response,401,{ok:false,error:'unauthorized'});return;}if(body!=='{}'){json(response,400,{ok:false,error:'invalid_request'});return;}json(response,200,{ok:true,process:runtimePerformance().snapshot()});}
      catch{if(!response.headersSent)json(response,400,{ok:false,error:'invalid_request'});}finally{diagnosticVerifications504--;}
      return;
    }
    if(request.method==='POST'&&url.pathname==='/internal/maintenance491'){
      if(!isLocalBroadcastRequest(request)){json(response,403,{ok:false,error:'internal_only'});return;}
      const length491=Number(request.headers['content-length']||0);if(!String(request.headers['content-type']||'').toLowerCase().startsWith('application/json')||!signedRequestHeadersLookValid(request.headers)||!Number.isFinite(length491)||length491<0||length491>8192){json(response,400,{ok:false,error:'invalid_request'});return;}
      if(maintenanceVerifications491>=2){json(response,503,{ok:false,error:'server_busy'});return;}maintenanceVerifications491++;
      try{const body=await readBody(request,8192);if(!await verifySignedRealtimeRequest(request.headers,url.pathname,body)){json(response,401,{ok:false,error:'unauthorized'});return;}maintenance491.apply(JSON.parse(body));json(response,200,{ok:true,revision:maintenance491.snapshot().revision});}
      catch{if(!response.headersSent)json(response,400,{ok:false,error:'invalid_request'});}finally{maintenanceVerifications491--;}
      return;
    }
    const broadcastKind = url.pathname === "/internal/broadcast"
      ? "room"
      : url.pathname === "/internal/broadcast-world" ? "world" : url.pathname === "/internal/broadcast-players" ? "players"
      : url.pathname === "/internal/broadcast-batch" ? "batch" : "";
    if (request.method === "POST" && broadcastKind) {
      if (!isLocalBroadcastRequest(request)) {
        diagnostics.broadcastRejectedAuth += 1;
        json(response, 403, { ok: false, error: "internal_only" });
        return;
      }
      const contentType = String(request.headers["content-type"] || "").toLowerCase();
      const contentLength = Number(request.headers["content-length"] || 0);
      const bodyLimit = broadcastKind === "batch" ? MAX_BATCH_BYTES : 24_000;
      if (!contentType.startsWith("application/json") || !Number.isFinite(contentLength) || contentLength < 0 || contentLength > bodyLimit
        || !signedRequestHeadersLookValid(request.headers)) {
        json(response, 400, { ok: false, error: "invalid_request" });
        return;
      }
      // A batch is charged per contained event after its single verification.
      if (broadcastKind !== "batch" && !allowBroadcastRequest(Date.now())) {
        diagnostics.broadcastRateLimited += 1;
        json(response, 429, { ok: false, error: "rate_limited" });
        return;
      }
      if (broadcastVerifications >= MAX_BROADCAST_VERIFICATIONS) {
        diagnostics.broadcastBusy += 1;
        json(response, 503, { ok: false, error: "server_busy" });
        return;
      }
      broadcastVerifications += 1;
      try {
        const body = await readBody(request, bodyLimit);
        const verified = await verifySignedRealtimeRequest(request.headers, url.pathname, body);
        if (!verified) {
          diagnostics.broadcastRejectedAuth += 1;
          json(response, 401, { ok: false, error: "unauthorized" });
          return;
        }
        const parsed = JSON.parse(body);
        if (broadcastKind === "batch") {
          // One signed envelope, the same per-event validation and delivery as
          // the single endpoints, in arrival order. A bad item fails alone.
          if (parsed?.v !== 1 || !Array.isArray(parsed.items) || !parsed.items.length || parsed.items.length > MAX_BATCH_EVENTS) throw new Error("invalid_payload");
          if (!allowBroadcastRequest(Date.now(), parsed.items.length)) {
            diagnostics.broadcastRateLimited += parsed.items.length;
            json(response, 429, { ok: false, error: "rate_limited" });
            return;
          }
          const results = parsed.items.map(item => {
            try {
              if (!item || !["room", "world", "players"].includes(item.k)) throw new Error("invalid_payload");
              const result = deliverBroadcast(item.k, item.p);
              diagnostics.broadcastAccepted += 1;
              return result;
            } catch { return { ok: false, error: "invalid_request" }; }
          });
          diagnostics.broadcastBatches += 1;
          json(response, 200, { ok: true, results });
          return;
        }
        json(response, 200, deliverBroadcast(broadcastKind, parsed));
        diagnostics.broadcastAccepted += 1;
      } catch (error) {
        if (!response.headersSent) json(response, error?.message === "payload_too_large" ? 413 : 400, { ok: false, error: "invalid_request" });
      } finally {
        broadcastVerifications = Math.max(0, broadcastVerifications - 1);
      }
      return;
    }
    json(response, 404, { ok: false, error: "not_found" });
  });
  server.on("close",()=>{stopDiagnostics504();maintenance491.close();labGuard.close();labRegistryHandle.close();movementRelay.close();combatRelay.close();});
  server.requestTimeout = 5_000;
  server.headersTimeout = 6_000;
  server.keepAliveTimeout = 5_000;

  server.on("upgrade", (request, socket, head) => {
    let pathname = "";
    try { pathname = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname; }
    catch { socket.destroy(); return; }
    if (pathname === COMBAT_STREAM_PATH || pathname.startsWith(COMBAT_STREAM_PATH + "/channel/")) { void combatRelay.upgrade(request, socket, head); return; }
    if (pathname === MOVEMENT_STREAM_PATH || pathname.startsWith(MOVEMENT_STREAM_PATH + "/channel/")) { void movementRelay.upgrade(request, socket, head); return; }
    try {request.colLabProof = labGuard.admit(request, pathname);} catch {socket.destroy();return;}
    const origin = String(request.headers.origin || "");
    if (pathname !== "/ws" || !ALLOWED_ORIGINS.has(origin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    webSockets.handleUpgrade(request, socket, head, (webSocket) => webSockets.emit("connection", webSocket, request));
  });

  webSockets.on("connection", (socket, request) => {
    socket.movementRelay = movementRelay;socket.combatRelay = combatRelay;
    // Authentication remains bounded by the existing IP/connection budgets and 4s timeout.
    socket.recordAdmission = reason => {
      if (Object.hasOwn(diagnostics.admission, reason)) diagnostics.admission[reason]++;
    };
    diagnostics.opened += 1;
    socket.once("close", (code) => {
      diagnostics.closed += 1;
      // Bounded numeric buckets; never retain names, tickets, IPs or user text.
      const key = [1000, 1001, 1006, 1007, 1008, 1009, 1013, 4000, 4001, 4002, 4003, 4009].includes(code) ? code : "other";
      diagnostics.closeCodes[key] = (diagnostics.closeCodes[key] || 0) + 1;
    });
    try {labGuard.attach(socket, request.colLabProof);} catch {socket.close(1013, "Test capacity unavailable");return;}
    const labProof = socket.colLabProof;
    const ip = labProof ? "loadlab:" + labProof.sourceIp : clientIp(request);
    const connectionsForIp = connectionsByIp.get(ip) || 0;
    const pendingForIp = pendingByIp.get(ip) || 0;
    if (webSockets.clients.size >= MAX_CONNECTIONS || pendingAuth >= MAX_PENDING_AUTH
      || connectionsForIp >= (labProof ? 75 : MAX_CONNECTIONS_PER_IP) || pendingForIp >= (labProof ? 75 : MAX_PENDING_AUTH_PER_IP)) {
      socket.close(1013, "Server busy");
      return;
    }
    connectionsByIp.set(ip, connectionsForIp + 1);
    pendingByIp.set(ip, pendingForIp + 1);
    pendingAuth += 1;
    socket.pendingAuthCounted = true;
    socket.isAlive = true;
    const finishPendingAuth = () => {
      if (!socket.pendingAuthCounted) return;
      socket.pendingAuthCounted = false;
      pendingAuth = Math.max(0, pendingAuth - 1);
      const remaining = Math.max(0, (pendingByIp.get(ip) || 1) - 1);
      if (remaining) pendingByIp.set(ip, remaining);
      else pendingByIp.delete(ip);
    };
    const authTimeout = setTimeout(() => {
      socket.authCancelled = true;
      finishPendingAuth();
      socket.close(4001, "Authentication timeout");
    }, 4_000);
    socket.on("pong", () => { socket.isAlive = true; });
    socket.on("message", async (data, isBinary) => {
      if(socket.player&&!maintenance491.admit(socket))return;
      if (isBinary || data.length > 8_192) return socket.close(1009, "Invalid payload");
      let payload;
      try { payload = JSON.parse(data.toString("utf8")); }
      catch { return socket.close(1007, "Invalid JSON"); }
      if (!socket.player) {
        if (payload?.type !== "auth") return socket.close(4001, "Authentication required");
        if (socket.authPending) {
          socket.authCancelled = true;
          return socket.close(4001, "Authentication already in progress");
        }
        socket.authPending = true;
        try {
          const player = await verifyRealtimeTicket(payload.ticket);
          labGuard.assertTicket(socket, player);
          if (socket.authCancelled || socket.readyState !== 1) return;
          clearTimeout(authTimeout);
          finishPendingAuth();
          resolveMaintenanceIdentity492(player);
          if(!maintenance491.admit(socket,player))return;
          measureSync504('realtime_auth_apply',()=>{authenticateSocket(socket, player);if(socket.player)maintenance491.connected(socket);});
        } catch {
          diagnostics.rejectedAuth += 1;
          finishPendingAuth();
          socket.close(4003, "Invalid ticket");
        } finally {
          socket.authPending = false;
        }
        return;
      }
      if (payload?.type === "renew_auth") {
        const now = Date.now();
        if (socket.authPending || now - (socket.lastRenewalAt || 0) < 2_000) {
          socket.recordAdmission("renewalBudget");
          return socket.close(1008, "Renewal rate exceeded");
        }
        socket.lastRenewalAt = now;
        socket.authPending = true;
        try {
          const renewed = await verifyRealtimeTicket(payload.ticket);
          labGuard.assertTicket(socket, renewed);
          resolveMaintenanceIdentity492(renewed);
          if(!maintenance491.admit(socket,renewed))return;
          if (!socket.authCancelled && socket.readyState === 1 && measureSync504('realtime_renew_apply',()=>renewSocketLease(socket, renewed))) diagnostics.renewed += 1;
        } catch { diagnostics.rejectedAuth += 1; socket.close(4003, "Invalid renewal ticket"); }
        finally { socket.authPending = false; }
        return;
      }
      try {labGuard.assertActive(socket);} catch {socket.close(4003, "Test lease expired");return;}
      measureSync504(realtimeWorkName504(payload?.type),()=>handleSocketMessage(socket, payload));
    });
    socket.on("close", () => {
      clearTimeout(authTimeout);
      socket.authCancelled = true;
      finishPendingAuth();
      const remaining = Math.max(0, (connectionsByIp.get(ip) || 1) - 1);
      if (remaining) connectionsByIp.set(ip, remaining);
      else connectionsByIp.delete(ip);
      measureSync504('realtime_disconnect',()=>disconnectSocket(socket));
    });
    socket.on("error", () => undefined);
  });

  const heartbeat = setInterval(()=>measureSync504('realtime_heartbeat',()=>{heartbeatSockets();maintenance491.revalidate();}), 20_000);
  heartbeat.unref();
  return { server, webSockets, heartbeat, movementRelay, combatRelay };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await realtimeSecurityReady();
  const runtime = createRealtimeServer();
  runtime.server.listen(PORT, HOST, () => console.log(`coreoflife-realtime listening on ${HOST}:${PORT}`));
  const shutdown = (signal) => {
    console.log(`${signal} received; shutting down.`);
    clearInterval(runtime.heartbeat);
    runtime.movementRelay.close();runtime.combatRelay.close();
    for (const socket of runtime.webSockets.clients) socket.close(1001, "Server restarting");
    runtime.server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5_000).unref();
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}
