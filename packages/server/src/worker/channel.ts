import { parentPort, workerData } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';
import { TICK_MS, TUNING, MAPS, applyTuning } from '@col/shared';
import { World } from './world.ts';
import type { ToWorker, FromWorker } from '../types.ts';
import { LoadMon, cpuProfile } from '../loadmon.ts';

const { channel, aoiMaxPlayers, saveIntervalMs } = workerData as { channel: number; aoiMaxPlayers: number; saveIntervalMs: number };
const port = parentPort!;
const post = (m: FromWorker, transfer?: ArrayBuffer[]) => port.postMessage(m, transfer ?? []);
const world = new World({ channel, aoiMaxPlayers, saveIntervalMs, post });
const lm = new LoadMon();
/** komut adı (yavaş iş kaydı için): {"t":"garden",...} */
const cmdName = (raw: string) => /"t"\s*:\s*"([\w-]{1,24})"/.exec(raw)?.[1] ?? '?';

port.on('message', (m: ToWorker) => {
  switch (m.type) {
    case 'move': world.onMove(m.sid, m.data); break;
    case 'cmd': { const t0 = performance.now(); world.onCmd(m.sid, m.data); const ms = performance.now() - t0; if (ms >= 15) lm.job(`Komut: ${cmdName(m.data)}`, ms, `oyuncu #${m.sid}`); break; }
    case 'join': { const t0 = performance.now(); world.join(m.sid, m.char); const ms = performance.now() - t0; if (ms >= 30) lm.job('Oyuncu girişi', ms, m.char.map); break; }
    case 'profile':
      cpuProfile(m.ms).then((data) => post({ type: 'profile', id: m.id, data }), (e) => post({ type: 'profile', id: m.id, err: String(e?.message ?? e) }));
      break;
    case 'leave': world.leave(m.sid); break;
    case 'world': world.setWorld(m.health, m.online); break;
    case 'market_load': world.loadMarket(m.state); break;
    case 'arena': world.setArena(m.active, m.endsAt); break;
    case 'arena_join_ok': world.arenaJoinResult(m.sid, m.err); break;
    case 'tuning': {
      const key = (map: string) => JSON.stringify([TUNING.density[map] ?? 1, Object.entries(TUNING.spawns).filter(([k]) => k.startsWith(map + ':')).sort(), map === 'tower' ? TUNING.tower.floors.map((f) => [f.monster, f.count, f.level, f.puzzle]) : 0, Object.entries(TUNING.monsters).map(([k, v]) => [k, v.level]).sort()]); // canavar seviyesi değişince yuvalar yeniden kurulur
      const before = new Map(Object.keys(MAPS).map((id) => [id, key(id)] as const));
      const ratios = world.xpRatios();
      applyTuning(m.data);
      world.applyXpRatios(ratios);
      for (const id of Object.keys(MAPS)) if (before.get(id) !== key(id)) world.reseedMonsters(id);
      world.restatMonsters();
      world.retimeWorldBoss();
      break;
    }
    case 'admin':
      if (m.op === 'set') world.adminSetPlayer(m.charId, m.patch ?? {});
      else if (m.op === 'addcp') world.adminAddCp(m.charId, m.amount ?? 0);
      else if (m.op === 'give' && m.give) world.adminGive(m.charId, m.give);
      else if (m.op === 'rename') world.adminRename(m.charId, m.name ?? '');
      else if (m.op === 'role') world.adminSetRole(m.charId, m.role ?? 'player');
      else world.adminResetPlayer(m.charId);
      break;
    case 'guild_set': world.guildSet(m.charId, m.g); break;
    case 'guild_charge': world.guildCharge(m.sid, m.req, m.gems, m.minLevel); break;
    case 'gwar': world.setGuildWars(m.wars); break;
    case 'gwar_join': world.guildWarJoin(m.sid, m.side); break;
    case 'shutdown':
      world.flushGuildTax();
      for (const sid of [...world.bySid.keys()]) world.leave(sid);
      post({ type: 'stats', data: world.stats() });
      setTimeout(() => process.exit(0), 50);
      break;
  }
});

// Sabit adımlı döngü: sapmayı düzelten zamanlayıcı. Geride kalırsa en fazla 3 tick yetişir, sonra atlar.
let next = performance.now();
let elu = performance.eventLoopUtilization();
let lastBytes = 0, lastMsgs = 0, lastStatAt = performance.now();
function loop() {
  const now = performance.now();
  let n = 0;
  while (now >= next && n < 3) {
    const t0 = performance.now(); try { world.tick(); } catch (e) { console.error('[kanal] tick hatası', (e as Error).stack); } const ms = performance.now() - t0;
    if (ms >= TICK_MS * 0.8) lm.job('Dünya adımı (tick)', ms, `${world.bySid.size} oyuncu`);
    next += TICK_MS; n++;
  }
  if (now - next > TICK_MS * 5) next = now + TICK_MS; // uzun duraklama: biriktirme
  setTimeout(loop, Math.max(0, next - performance.now()));
}
setTimeout(loop, 0);

setInterval(() => {
  const s = world.stats();
  const e2 = performance.eventLoopUtilization(elu);
  elu = performance.eventLoopUtilization();
  const t = performance.now();
  const sec = (t - lastStatAt) / 1000;
  s.elu = Math.round(e2.utilization * 1000) / 10;
  s.bytesOutPerSec = Math.round((world.bytesOut - lastBytes) / sec);
  s.msgsOutPerSec = Math.round((world.msgsOut - lastMsgs) / sec);
  s.heapMB = Math.round(process.memoryUsage().heapUsed / 1048576);
  s.load = lm.snapshot();
  lastBytes = world.bytesOut; lastMsgs = world.msgsOut; lastStatAt = t;
  post({ type: 'stats', data: s });
}, 2000);
