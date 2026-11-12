import http from "node:http";
import { spawn } from "node:child_process";
import { timingSafeEqual, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile, copyFile, chmod } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { verifySignedRealtimeRequest, realtimeSecurityReady } from "../../realtime-server/src/security.mjs";
import { importDatabase } from "./import-database.mjs";
import { proxyGameRequest } from "./game-proxy.mjs";
import { createGameProxyPool } from "./game-proxy-pool.mjs";
import { waitForApplicationReady, stopApplicationChild, isApplicationHealthReady } from "./app-readiness.mjs";
import {ChannelIngress} from './channel-ingress.mjs';
import {channelProcessesEnabled} from './channel-protocol.mjs';

const root = process.env.CORE_DATA_ROOT || "/var/lib/coreoflife-game";
await mkdir(root, { recursive: true, mode: 0o700 });
const statePath = path.join(root, "state.json");
let state = await readFile(statePath, "utf8").then(JSON.parse).catch(error => { if (error.code !== "ENOENT") throw error; return { status: "installed" }; });
let config = null;
let child = null;
let appStartupId = null;
let gameProxyPool = null;
let channelIngress = null;
let channelStreamIngress=null;
let server = null;
let shuttingDown = false;
// Install before awaiting app startup, so an installer rollback also stops a
// child that is still backing up or upgrading its database.
for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => {
  shuttingDown = true;
  gameProxyPool?.stop();
  channelStreamIngress?.close();
  channelIngress?.close();channelIngress=null;
  server?.close();
  const stopping = child ? stopApplicationChild(child,{graceMs:channelProcessesEnabled()?55000:2000}) : Promise.resolve();
  void stopping.finally(() => process.exit(0));
});
let lastSlowProxyLogAt = -Infinity;
const reply = (res, status, body) => { res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(body)); };
async function save(next) {
  await writeFile(`${statePath}.tmp`, JSON.stringify(next), { mode: 0o600 });
  await rename(`${statePath}.tmp`, statePath); state = next;
}
async function appReady(signal = AbortSignal.timeout(2000)) {
  try { const res = await fetch(`http://127.0.0.1:${process.env.CORE_APP_PORT||3003}/api/vds-health`, { signal }); const value = await res.json(); return res.ok && isApplicationHealthReady(value, appStartupId); } catch { return false; }
}
async function startApp(job) {
  const configFile = path.join(root, "jobs", job, "config.json");
  config = JSON.parse(await readFile(configFile, "utf8"));
  if (shuttingDown) throw new Error("Application is stopping");
  if (child) throw new Error("Application already running");
  appStartupId = randomUUID();
  const startupId=appStartupId;
  const application = spawn(process.execPath, ["vds-server/src/app.mjs"], { env: { ...process.env, CORE_CONFIG_FILE: configFile, CORE_APP_STARTUP_ID: startupId }, stdio: ['inherit','inherit','inherit','ipc'] });
  child = application;
  let applicationIngress=null;
  application.on('message',message=>{
    if(message?.type!=='resident-channel-directory'||child!==application||message.startupId!==startupId)return;
    try{
      applicationIngress??=new ChannelIngress(config.database);
      applicationIngress.update(message,startupId);channelIngress=applicationIngress;
    }catch(error){console.error('channel_directory_invalid',error.message);application.kill('SIGTERM');}
  });
  let ready = false;
  let applicationPool = null;
  application.once("exit", () => {
    if(channelIngress===applicationIngress)channelIngress=null;
    applicationIngress?.close();applicationIngress=null;
    applicationPool?.stop();
    if (gameProxyPool === applicationPool) gameProxyPool = null;
    if (child === application) { child = null; appStartupId = null; }
    if (ready && state.status === "active" && !shuttingDown) process.exit(1);
  });
  try {
    await waitForApplicationReady(application, appReady);
    if(channelProcessesEnabled()&&config.realm?.role!=='accounts'&&!applicationIngress)throw new Error('Resident channel routing was not advertised; refusing mirror/legacy fallback');
    if(applicationIngress&&!channelStreamIngress){const {createChannelStreamIngress}=await import('./channel-stream-ingress.mjs');channelStreamIngress=createChannelStreamIngress({port:Number(process.env.CORE_DUNGEON_PORT)||3004,directory:()=>channelIngress});}
    applicationPool = createGameProxyPool({
      port:Number(process.env.CORE_APP_PORT)||3003,
      startupId: appStartupId,
      onError: error => console.warn("game_proxy_pool", String(error.message).slice(0, 180)),
    });
    await applicationPool.prime();
    if (shuttingDown || child !== application || application.exitCode !== null || application.signalCode !== null) {
      throw new Error("Application stopped during connection preparation");
    }
    gameProxyPool = applicationPool;
    applicationPool.start();
    ready = true;
  } catch (error) {
    applicationPool?.stop();
    if (gameProxyPool === applicationPool) gameProxyPool = null;
    await stopApplicationChild(application);
    if (child === application) { child = null; appStartupId = null; }
    if (shuttingDown) process.exit(0);
    throw error;
  }
}
async function importJob(input) {
  const directory = path.join(root, "jobs", input.job);
  try {
    const request = async body => {
      const response = await fetch(`${input.sourceOrigin}/api/admin/vds-migration`, { method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${input.transferToken}` },
        body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Transfer source returned ${response.status}`);
      return response.json();
    };
    const imported = await importDatabase(directory, input.job, request);
    await mkdir(path.join(root,"backups"), {recursive:true,mode:0o700});
    const originalBackup = path.join(root,"backups",`original-${input.job}.sqlite`);
    await copyFile(imported.file,originalBackup,constants.COPYFILE_EXCL);
    await chmod(originalBackup,0o600);
    await writeFile(path.join(directory, "config.json"), JSON.stringify({ database: imported.file, environment: input.environment,
      proxyToken: input.proxyToken, hosts: input.hosts }), { mode: 0o600 });
    await startApp(input.job);
    await request({ action: "copied", job: input.job });
    await save({ job: input.job, status: "prepared", tables: imported.tables, rows: imported.rows, manifestHash: imported.manifestHash, readyAt: Date.now() });
  } catch (error) {
    if (child) { const exited = new Promise(resolve => child.once("exit", resolve)); child.kill("SIGTERM"); await exited; }
    config = null;
    await save({ job: input.job, status: "failed", error: String(error.message).slice(0, 180) });
  }
}
if(process.env.CORE_REALM_ID&&['active','prepared'].includes(state.status)){
 const realmConfig=JSON.parse(await readFile(path.join(root,'jobs',state.job,'config.json'),'utf8'));
 if(realmConfig.realm?.id!==process.env.CORE_REALM_ID)throw new Error('Realm supervisor identity mismatch');
 process.env.REALTIME_PUBLIC_KEY_SPKI=realmConfig.environment.REALTIME_PUBLIC_KEY_SPKI;
}
await realtimeSecurityReady();
if (["active", "prepared"].includes(state.status)) await startApp(state.job);
else if (state.status === "importing") await save({ ...state, status: "failed", error: "Import interrupted; source remains frozen. Start a new verified transfer." });

server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (req.method === "GET" && url.pathname === "/full-readyz") {
    reply(res, 200, { ok: true, protocol: "col-fullsite-v1", releaseId: process.env.CORE_RELEASE_ID || "development", ...state, appReady: child && gameProxyPool?.ready ? await appReady() : false }); return;
  }
  if(process.env.CORE_REALM_ID&&url.pathname.startsWith('/internal/fullsite/')){reply(res,403,{error:'Realm setup uses the offline installer'});return;}
  if (req.method === "POST" && ["/internal/fullsite/import", "/internal/fullsite/activate", "/internal/fullsite/abort"].includes(url.pathname)) {
    try {
      const chunks = []; let bytes = 0;
      for await (const chunk of req) { bytes += chunk.length; if (bytes > 32768) { reply(res, 413, { error: "Payload too large" }); return; } chunks.push(chunk); }
      const body = Buffer.concat(chunks).toString("utf8");
      if (!await verifySignedRealtimeRequest(req.headers, url.pathname, body)) { reply(res, 401, { error: "Unauthorized" }); return; }
      const input = JSON.parse(body);
      if (!/^[a-f0-9-]{36}$/.test(input.job)) throw new Error("Invalid job");
      if (url.pathname.endsWith("/abort")) {
        if (state.status === "active" || (state.job && state.job !== input.job) || state.status === "importing") throw new Error("Cannot abort an active or running transfer");
        if (child) { const exited = new Promise(resolve => child.once("exit", resolve)); child.kill("SIGTERM"); await exited; }
        config = null;
        await save({ status: "installed" });
        reply(res, 200, { ok: true }); return;
      }
      if (url.pathname.endsWith("/activate")) {
        if (input.job !== state.job || !["prepared", "active"].includes(state.status) || !gameProxyPool?.ready || !await appReady()) throw new Error("Verified application required");
        await save({ ...state, status: "active" });
        reply(res, 200, { ok: true, status: "active", job: state.job }); return;
      }
      if (["active", "importing", "prepared"].includes(state.status)) { reply(res, 409, { error: "Existing transfer must be resolved first", status: state.status }); return; }
      if (!/^https:\/\/[a-z0-9.-]+$/.test(input.sourceOrigin) || !/^[a-f0-9]{64}$/.test(input.transferToken) || !/^[a-f0-9]{64}$/.test(input.proxyToken)
        || !Array.isArray(input.hosts) || !input.hosts.length || input.hosts.some(host => !/^[a-z0-9.-]+$/.test(host)) || !input.environment || typeof input.environment !== "object") throw new Error("Invalid transfer configuration");
      const allowed = new Set(["ADMIN_EMAIL", "ADMIN_USER_ID", "RESEND_API_KEY", "AUTH_EMAIL_FROM", "AUTH_PUBLIC_ORIGIN", "PAYMENT_TERMS_URL", "PAYTR_MERCHANT_ID", "PAYTR_MERCHANT_KEY", "PAYTR_MERCHANT_SALT", "PAYTR_TEST_MODE", "SHOPIER_PAT", "SHOPIER_WEBHOOK_TOKEN", "REALTIME_SIGNING_PRIVATE_KEY", "REALTIME_SOCKET_URL"]);
      if (Object.entries(input.environment).some(([key,value]) => !allowed.has(key) || typeof value !== "string")) throw new Error("Unsupported runtime setting");
      await save({ job: input.job, status: "importing" });
      reply(res, 202, { ok: true, job: input.job });
      void importJob(input); return;
    } catch { reply(res, 400, { error: "Invalid signed operation" }); return; }
  }
  if (url.pathname.startsWith("/_game/")) {
    const supplied = Buffer.from(String(req.headers["x-col-proxy-token"] || ""));
    const expected = Buffer.from(config?.proxyToken || "");
    if (state.status !== "active" || !gameProxyPool?.ready || !expected.length || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { reply(res, 503, { error: "Game server is not active" }); return; }
    const host = String(req.headers["x-col-public-host"] || "").toLowerCase();
    if (!config.hosts.includes(host)) { reply(res, 400, { error: "Invalid host" }); return; }
    const headers = { ...req.headers, host, "x-forwarded-host": host, "x-forwarded-proto": "https" };
    const clientIp = String(req.headers["x-col-client-ip"] || "unknown");
    headers["cf-connecting-ip"] = /^[a-fA-F0-9:.]{2,64}$/.test(clientIp) ? clientIp : "unknown";
    delete headers["x-forwarded-for"]; delete headers["x-real-ip"]; delete headers["x-col-client-ip"];
    delete headers["x-col-proxy-token"]; delete headers["x-col-public-host"];
    // Fixed route names only: no player IDs, query strings, headers or payloads.
    const timingPath = url.pathname === "/_game/api/action" ? "/api/action"
      : url.pathname === "/_game/api/world" ? "/api/world" : null;
    const method = req.method === "POST" ? "POST" : req.method === "GET" ? "GET" : "OTHER";
    const onTiming = timingPath ? timing => {
      const now = performance.now();
      if (timing.totalMs < 250 || now - lastSlowProxyLogAt < 5000) return;
      lastSlowProxyLogAt = now;
      console.info("proxy_timing", JSON.stringify({method, path: timingPath, ...timing}));
    } : undefined;
    const gamePath = req.url.slice("/_game".length);
    let channelTarget;
    try{channelTarget=channelIngress?.target(gamePath.split('?',1)[0],headers);}
    catch(error){reply(res,error.status??503,{code:error.message,error:'Kanal bağlantısını yenile.'});return;}
    proxyGameRequest(req, res, { hostname: "127.0.0.1", port: channelTarget?.port??(Number(process.env.CORE_APP_PORT)||3003), path: gamePath, method: req.method, headers,
      agent: channelTarget?.agent??gameProxyPool.agentFor(gamePath) }, {onTiming});
    return;
  }
  reply(res, 404, { error: "Not found" });
});
server.requestTimeout = 35000; server.headersTimeout = 10000;
// Caddy keeps idle upstream connections for 2 minutes. With Node's default 5 s
// keep-alive, a POST (attack/move) could be written onto a connection this
// server is closing and fail with a 502. Let the client side close first.
server.keepAliveTimeout = 130_000;
server.listen(Number(process.env.CORE_PROXY_PORT)||3002, "127.0.0.1");
