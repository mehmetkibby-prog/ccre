import http from 'node:http';
import { config } from './config.ts';
import { pool } from './db/pool.ts';
import { migrate } from './db/migrate.ts';
import { ChannelManager } from './channels.ts';
import { CharacterStore } from './store.ts';
import { Gateway } from './gateway.ts';
import { WorldState } from './worldstate.ts';
import { OpeningState } from './opening.ts';
import { TuningState } from './tuning.ts';
import { buildApi, handleApi } from './api.ts';
import { parseCookies, readBody, serveStatic, json, type Req } from './http.ts';

async function main() {
  const applied = await migrate();
  if (applied.length) console.log('[db] migrations applied:', applied.join(', '));
  const store = new CharacterStore();
  store.start();
  const world = new WorldState();
  await world.load();
  const opening = new OpeningState();
  await opening.load();
  const tuning = new TuningState();
  await tuning.load();
  let gateway!: Gateway;
  const channels = new ChannelManager({
    onMessage: (ch, m) => gateway.onWorker(ch, m),
    onCrash: (ch) => gateway.onCrash(ch),
    onSpawn: (ch) => { channels.send(ch, { type: 'tuning', data: tuning.current() }); store.loadMarket(ch).then((state) => channels.send(ch, { type: 'market_load', state })).catch((e) => console.error(`[ch${ch}] pazar yüklenemedi`, e)); },
  });
  gateway = new Gateway(channels, store, world);
  channels.start();
  const router = buildApi({ gateway, channels, opening, store, world, tuning });

  const server = http.createServer(async (raw, res) => {
    const url = new URL(raw.url ?? '/', 'http://x');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('referrer-policy', 'same-origin');
    if (url.pathname.startsWith('/api/')) {
      let body: unknown = {};
      if (raw.method === 'POST') {
        try { body = await readBody(raw); } catch (e: any) { return json(res, e.status ?? 400, { error: e.message }); }
      }
      const req: Req = {
        method: raw.method ?? 'GET', path: url.pathname, query: url.searchParams, headers: raw.headers,
        ip: (config.devMode ? '' : String(raw.headers['x-real-ip'] ?? '')) || raw.socket.remoteAddress || '?', body, cookies: parseCookies(raw.headers.cookie), raw,
      };
      return handleApi(router, req, res);
    }
    if (!serveStatic(config.staticDir, url.pathname, res, raw.headers, raw.method)) { res.writeHead(404); res.end('Not found (istemci derlenmemiş olabilir: npm run build)'); }
  });
  server.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/ws')) { socket.destroy(); return; }
    gateway.handleUpgrade(req, socket, head);
  });
  server.keepAliveTimeout = 65_000;
  server.listen(config.port, config.host, () => console.log(`[core-of-life] http://${config.host}:${config.port}  kanallar=${config.channels} kapasite=${config.channelCapacity}/kanal`));

  // Düzgün kapanış: herkesin son durumu kaydedilir (kapanış oyuncu ilerlemesini geri almaz).
  let stopping = false;
  const shutdown = async (sig: string) => {
    if (stopping) return; stopping = true;
    console.log(`[core-of-life] ${sig}: kapanıyor, oyuncular kaydediliyor...`);
    server.close();
    for (const s of gateway.sessions.values()) gateway.sendJson(s, { t: 'fatal', text: 'Sunucu bakım için yeniden başlatılıyor.' });
    await channels.stop();
    await new Promise((r) => setTimeout(r, 200));
    for (let i = 0; i < 20 && store.queueLength; i++) await store.flush();
    await world.persist();
    await pool.end();
    console.log('[core-of-life] kapandı.');
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((e) => { console.error(e); process.exit(1); });
