/**
 * Yük denemesi: gerçek protokolü kullanan karma davranışlı botlar.
 * Kullanım: LOADTEST=1 ile çalışan ayrı test sunucusuna karşı:
 *   npx tsx scripts/loadtest.ts --bots 300 --duration 120 --url http://127.0.0.1:8080 --channels 6 --village 0.25
 * Canlı oyuncuların olduğu sunucuda ÇALIŞTIRMA.
 */
import WebSocket from 'ws';
import fs from 'node:fs';
import { readSnapshot, encodeMove, dirIndexFromVector, Kind, NO_DIR } from '../packages/shared/src/index.ts';

const arg = (k: string, d: string) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BOTS = Number(arg('bots', '50'));
const DURATION = Number(arg('duration', '60')) * 1000;
const URL_ = arg('url', 'http://127.0.0.1:8080');
const CHANNELS = Number(arg('channels', '2'));
const VILLAGE = Number(arg('village', '0.25')); // köyde kalabalık oluşturan oran
const RAMP_MS = Number(arg('ramp', '20')) * 1000;
const OUT = arg('out', '');
const OFFSET = Number(arg('offset', '0'));
const QUIET = process.argv.includes('--quiet');

const stats = { connected: 0, failed: 0, snapshots: 0, bytes: 0, kills: 0, loot: 0, deaths: 0, gaps: [] as number[], rtts: [] as number[], errors: new Map<string, number>(), kicked: 0, closed: 0 };
const err = (k: string) => stats.errors.set(k, (stats.errors.get(k) ?? 0) + 1);

async function api(path: string, body: unknown, token?: string) {
  const r = await fetch(URL_ + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} ${r.status} ${j.error ?? ''}`);
  return j;
}

async function bot(i: number) {
  i += OFFSET;
  const user = `bot${i}`;
  let token: string;
  try { token = (await api('/api/login', { username: user, password: 'botpass123' })).token; }
  catch { token = (await api('/api/register', { username: user, password: 'botpass123', password2: 'botpass123' })).token; }
  const me = await api('/api/me', null, token);
  let charId = me.characters[0]?.id;
  if (!charId) charId = (await api('/api/characters', { name: `Bot${i}`, cls: ['guardian', 'hunter', 'arcanist'][i % 3] }, token)).id;
  const ch = 1 + (i % CHANNELS);
  const adm = await api('/api/admission', { characterId: charId, channel: ch, nonce: String(i) }, token);
  const ws = new WebSocket(URL_.replace('http', 'ws') + '/ws?ticket=' + adm.ticket);
  ws.binaryType = 'arraybuffer';
  const ents = new Map<number, { kind: number; x: number; y: number; hp: number; owner?: number; dead?: boolean }>();
  let me_x = 0, me_y = 0, myEntity = 0, myCharId = 0, dead = false, seq = 0, lastSnapAt = 0;
  let target = 0;
  const stayVillage = Math.random() < VILLAGE;
  let wanderX = 0, wanderY = 0;
  await new Promise<void>((res, rej) => { ws.once('open', () => res()); ws.once('error', rej); });
  stats.connected++;
  ws.on('message', (data: ArrayBuffer | Buffer, isBin: boolean) => {
    if (isBin || data instanceof ArrayBuffer) {
      const buf = data instanceof ArrayBuffer ? data : (data as Buffer).buffer.slice((data as Buffer).byteOffset, (data as Buffer).byteOffset + (data as Buffer).byteLength);
      stats.snapshots++; stats.bytes += buf.byteLength;
      const now = performance.now();
      if (lastSnapAt) stats.gaps.push(now - lastSnapAt);
      lastSnapAt = now;
      const s = readSnapshot(buf as ArrayBuffer);
      if (new Uint8Array(buf as ArrayBuffer)[0] === 2) ents.clear();
      me_x = s.sx; me_y = s.sy;
      for (const sp of s.spawns) ents.set(sp.id, { kind: sp.kind, x: sp.x, y: sp.y, hp: 'hp' in sp ? sp.hp : 1, owner: sp.kind === Kind.LOOT ? sp.owner : undefined });
      for (const u of s.updates) { const e = ents.get(u.id); if (!e) continue; if (u.x !== undefined) { e.x = u.x; e.y = u.y!; } if (u.hp !== undefined) e.hp = u.hp; if (u.flags !== undefined) e.dead = !!(u.flags & 1); }
      for (const id of s.removes) ents.delete(id);
      for (const ev of s.events) { if (ev.e === 3 && ev.id === target) { stats.kills++; target = 0; } }
      return;
    }
    const m = JSON.parse(data.toString());
    if (m.t === 'welcome') { myEntity = m.entityId; if (!stayVillage) ws.send(JSON.stringify({ t: 'travel', map: 'forest', req: `tr${i}${Date.now()}` })); }
    else if (m.t === 'char') myCharId = m.id;
    else if (m.t === 'dead') { dead = true; stats.deaths++; setTimeout(() => ws.send(JSON.stringify({ t: 'respawn', where: 'here' })), 5500); }
    else if (m.t === 'respawned') dead = false;
    else if (m.t === 'loot') stats.loot++;
    else if (m.t === 'pong') stats.rtts.push(Date.now() - m.c);
    else if (m.t === 'kicked') stats.kicked++;
    else if (m.t === 'fatal') err('fatal:' + m.text);
  });
  ws.on('close', () => { stats.closed++; });
  const iv = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (dead) return;
    let tx = 0, ty = 0, want = false;
    if (!stayVillage) {
      // en yakın canlı canavar
      let t = target ? ents.get(target) : undefined;
      if (!t || t.dead || t.hp <= 0) {
        target = 0; let bd = 1e9;
        for (const [id, e] of ents) if (e.kind === Kind.MONSTER && !e.dead && e.hp > 0) { const d = (e.x - me_x) ** 2 + (e.y - me_y) ** 2; if (d < bd) { bd = d; target = id; } }
        t = target ? ents.get(target) : undefined;
      }
      // kendi ganimeti
      for (const [id, e] of ents) if (e.kind === Kind.LOOT && e.owner === myCharId && Math.hypot(e.x - me_x, e.y - me_y) < 250 && Math.random() < 0.2) ws.send(JSON.stringify({ t: 'pickup', id }));
      if (t) {
        const d = Math.hypot(t.x - me_x, t.y - me_y);
        if (d > 150) { tx = t.x; ty = t.y; want = true; }
        else if (Math.random() < 0.5) ws.send(JSON.stringify({ t: 'attack', id: target }));
        if (Math.random() < 0.01) ws.send(JSON.stringify({ t: 'skill', s: 1, id: target }));
      }
    } else {
      if (!wanderX || Math.hypot(wanderX - me_x, wanderY - me_y) < 30 || Math.random() < 0.01) { wanderX = 1792 + (Math.random() - 0.5) * 900; wanderY = 1500 + (Math.random() - 0.5) * 600; }
      tx = wanderX; ty = wanderY; want = Math.random() < 0.8;
    }
    const dir = want ? dirIndexFromVector(tx - me_x, ty - me_y) : NO_DIR;
    if (want) ws.send(encodeMove(++seq, dir));
    if (Math.random() < 0.002) ws.send(JSON.stringify({ t: 'chat', ch: Math.random() < 0.5 ? 'local' : 'world', text: 'merhaba ' + i }));
    if (Math.random() < 0.01) ws.send(JSON.stringify({ t: 'ping', c: Date.now() }));
  }, 50);
  return () => { clearInterval(iv); ws.close(); };
}

async function main() {
  console.log(`bots=${BOTS} duration=${DURATION / 1000}s channels=${CHANNELS} village=${VILLAGE}`);
  const stops: (() => void)[] = [];
  const t0 = Date.now();
  for (let i = 0; i < BOTS; i++) {
    bot(i).then((s) => stops.push(s)).catch((e) => { stats.failed++; err(String(e.message).slice(0, 80)); });
    await new Promise((r) => setTimeout(r, RAMP_MS / BOTS));
  }
  const report: any[] = [];
  const iv = setInterval(async () => {
    const m = await fetch(URL_ + '/api/admin/metrics', { headers: { authorization: 'Bearer ' + adminToken } }).then((r) => r.json()).catch(() => null);
    const gaps = stats.gaps.splice(0).sort((a, b) => a - b);
    const q = (p: number) => gaps.length ? Math.round(gaps[Math.min(gaps.length - 1, Math.floor(p * gaps.length))]) : 0;
    const rtts = stats.rtts.splice(0).sort((a, b) => a - b);
    const rq = (p: number) => rtts.length ? rtts[Math.min(rtts.length - 1, Math.floor(p * rtts.length))] : 0;
    const row = {
      t: Math.round((Date.now() - t0) / 1000), connected: stats.connected, failed: stats.failed, online: m?.online,
      snapGapMs: { p50: q(0.5), p95: q(0.95), p99: q(0.99) }, rttMs: { p50: rq(0.5), p95: rq(0.95), p99: rq(0.99) },
      kbInPerSec: Math.round(stats.bytes / 1024 / 5), kills: stats.kills, loot: stats.loot, deaths: stats.deaths,
      channels: m?.channels?.map((c: any) => ({ ch: c.channel, players: c.players, tick: c.tick, elu: c.elu, kbOut: Math.round(c.bytesOutPerSec / 1024) })),
      main: m?.mainThread, persistence: m?.persistence, host: m?.host?.loadavg,
    };
    stats.bytes = 0;
    report.push(row);
    if (!QUIET) console.log(JSON.stringify(row));
  }, 5000);
  await new Promise((r) => setTimeout(r, DURATION));
  clearInterval(iv);
  stops.forEach((s) => s());
  console.log('errors', Object.fromEntries(stats.errors));
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ bots: BOTS, duration: DURATION, channels: CHANNELS, village: VILLAGE, report, errors: Object.fromEntries(stats.errors) }, null, 1));
  setTimeout(() => process.exit(0), 500);
}
let adminToken = '';
(async () => {
  try { adminToken = (await api('/api/login', { username: arg('admin', 'caglar'), password: arg('adminpass', 'test12345') })).token; } catch { console.log('admin login yok; metrik okunamayacak'); }
  await main();
})();
