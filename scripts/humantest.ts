/**
 * İnsan gibi davranan botlarla performans testi (gerçek protokol, gerçek oyun kuralları).
 * Botlar: köyde dolaşıp sohbet eden, NPC'ye uğrayan, pazarda arama yapan oyuncular; canavar avlayan, beceri
 * kullanan, canı azalınca iksir içen, ganimetini toplayan, daha iyi eşyayı kuşanan, gereksizi satan oyuncular;
 * haritalar arası gezenler. Tepki gecikmeleri, duraklamalar ve rastgelelik insan oyuncuya benzetilir.
 *
 * Ölçülen: bot tarafında anlık görüntü aralıkları (takılma), ping, saldırı/beceri tepki süresi, bant genişliği;
 * sunucu tarafında süreç başına işlem yoğunluğu, döngü gecikmesi, dünya adımı, bellek, CPU.
 *
 * Kullanım (LOADTEST=1 ile çalışan AYRI test sunucusuna karşı; canlı sunucuda çalıştırma):
 *   npx tsx scripts/humantest.ts --url http://127.0.0.1:8099 --plan 30@0,60@300,100@600 --duration 900 --out rapor.json
 */
import WebSocket from 'ws';
import fs from 'node:fs';
import {
  readSnapshot, encodeMove, dirIndexFromVector, Kind, Ev, NO_DIR, classSkill, ITEM_TPL, RARITIES, RARITY, QTE_SWEEP_MS,
  LOOT_PICKUP_RANGE, attackCooldown, type ClassId,
} from '../packages/shared/src/index.ts';

const arg = (k: string, d: string) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg('url', 'http://127.0.0.1:8099');
const DURATION = Number(arg('duration', '900')) * 1000;
// "30@0,60@300,100@600": 0. sn'den 30 bota, 300. sn'den 60'a, 600. sn'den 100'e (her basamak 60 sn'de dolar)
const PLAN = arg('plan', '30@0,60@300,100@600').split(',').map((s) => { const [n, t] = s.split('@').map(Number); return { n, t: t * 1000 }; });
const OUT = arg('out', '');
const ADMIN = arg('admin', 'ayse'), ADMIN_PASS = arg('adminpass', 'parola12345');
const SERVER_PID = Number(arg('pid', '0'));
const RAMP = 60_000;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ───────── ölçüm ─────────
/** 1 ms çözünürlüklü histogram (0..5000 ms): yüzdelikler belleği şişirmeden */
class Hist {
  b = new Uint32Array(5001); n = 0; max = 0; sum = 0;
  add(v: number) { const i = Math.max(0, Math.min(5000, Math.round(v))); this.b[i]++; this.n++; this.sum += v; if (v > this.max) this.max = v; }
  q(p: number) { if (!this.n) return 0; let k = Math.ceil(p * this.n), c = 0; for (let i = 0; i < this.b.length; i++) { c += this.b[i]; if (c >= k) return i; } return 5000; }
  over(ms: number) { let c = 0; for (let i = Math.ceil(ms); i < this.b.length; i++) c += this.b[i]; return c; }
  summary() { return { n: this.n, avg: this.n ? Math.round(this.sum / this.n) : 0, p50: this.q(0.5), p95: this.q(0.95), p99: this.q(0.99), max: Math.round(this.max) }; }
}
interface Bucket {
  gaps: Hist; srvGap: Hist; jitter: Hist; rtt: Hist; atk: Hist; skill: Hist; bytes: number; secs: number; botSecs: number;
  c: Record<string, number>; notices: Map<string, number>;
}
const newBucket = (): Bucket => ({ gaps: new Hist(), srvGap: new Hist(), jitter: new Hist(), rtt: new Hist(), atk: new Hist(), skill: new Hist(), bytes: 0, secs: 0, botSecs: 0, c: {}, notices: new Map() });
const phases: Record<string, Bucket> = {};
let win = newBucket();
let phaseName = '';
const inc = (k: string, n = 1) => { win.c[k] = (win.c[k] ?? 0) + n; const p = phases[phaseName]; if (p) p.c[k] = (p.c[k] ?? 0) + n; };
const rec = (k: 'gaps' | 'srvGap' | 'jitter' | 'rtt' | 'atk' | 'skill', v: number) => { win[k].add(v); phases[phaseName]?.[k].add(v); };
const note = (t: string) => { const k = t.replace(/\d[\d.,]*/g, '#').slice(0, 70); win.notices.set(k, (win.notices.get(k) ?? 0) + 1); const p = phases[phaseName]; if (p) p.notices.set(k, (p.notices.get(k) ?? 0) + 1); };

async function api(path: string, body: unknown, token?: string) {
  const r = await fetch(URL_ + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} ${r.status} ${j.error ?? ''}`);
  return j;
}

// ───────── bot ─────────
type Role = 'village' | 'hunt_bazaar' | 'hunt_forest' | 'roamer';
const CHAT = {
  world: ['selam millet', 'kanal 1 çok kalabalık :D', 'kim kule yapacak?', 'parti arıyorum sv 20+', 'dünya boss ne zaman', 'tilki kral doğdu mu', 'öz satan var mı', 'iyi oyunlar herkese', 'lonca alımı var, mesaj atın'],
  trade: ['mavi kılıç satılık', 'kırmızı iksir alırım', 'turuncu zırh 5k', 'kor mührü arıyorum', 'takas var mı'],
  local: ['merhaba', 'nasılsın', 'şu çeşme ne güzel', 'demirci nerede', 'hadi avlanalım', 'teşekkürler', 'kolay gelsin'],
};
const ROLE_OF = (i: number): Role => { const k = i % 20; return k < 7 ? 'village' : k < 11 ? 'hunt_bazaar' : k < 18 ? 'hunt_forest' : 'roamer'; };

async function bot(i: number, stopAt: { v: number }) {
  const role = ROLE_OF(i);
  const user = `bot${i}`;
  let token: string;
  try { token = (await api('/api/login', { username: user, password: 'botpass123' })).token; }
  catch { token = (await api('/api/register', { username: user, password: 'botpass123', password2: 'botpass123' })).token; }
  const me = await api('/api/me', null, token);
  const ch0 = me.characters[0] ?? { id: (await api('/api/characters', { name: `Bot${i}`, cls: ['guardian', 'hunter', 'arcanist'][i % 3] }, token)).id, cls: ['guardian', 'hunter', 'arcanist'][i % 3] };
  const charId = Number(ch0.id);
  const adm = await api('/api/admission', { characterId: charId, channel: 1, nonce: `${i}-${Date.now()}` }, token);
  const ws = new WebSocket(URL_.replace('http', 'ws') + '/ws?ticket=' + adm.ticket);
  ws.binaryType = 'arraybuffer';
  await new Promise<void>((res, rej) => { ws.once('open', () => res()); ws.once('error', rej); });
  inc('connected');

  // ── durum ──
  const ents = new Map<number, { kind: number; x: number; y: number; hp: number; owner?: number; dead?: boolean }>();
  let myEntity = 0, cls: ClassId = ch0.cls as ClassId, level = 1, map = '', px = 0, py = 0, hp = 1, maxHp = 1, dead = false, seq = 0;
  let bag: any[] = [], equip: Record<string, any> = {}, potions = 0;
  let lastSnap = 0, lastSrvT = 0, lastSnapMoving = false, lastMoveSent = 0, moveSince = 0, target = 0, lastAtkSent = 0, pendingAtk = 0, pendingSkill = 0, nextThinkAt = 0, busyUntil = 0;
  const cds: number[] = [0, 0, 0, 0, 0, 0];
  let wp: { x: number; y: number } | null = null, stuckAt = 0, lastPos = { x: 0, y: 0 }, unstuckUntil = 0, unstuckDir = 0;
  let nextChatAt = Date.now() + rnd(20_000, 120_000), nextTravelAt = Date.now() + rnd(90_000, 220_000), nextNpcAt = Date.now() + rnd(15_000, 60_000);
  let potionThr = rnd(0.35, 0.55), lastPotionAt = 0, equipPlanned = 0;
  const send = (o: unknown) => { if (ws.readyState === WebSocket.OPEN) ws.send(typeof o === 'string' || o instanceof Uint8Array || o instanceof ArrayBuffer ? o as any : JSON.stringify(o)); };
  const req = () => `${i}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  ws.on('message', (data: ArrayBuffer | Buffer, isBin: boolean) => {
    const now = performance.now();
    if (isBin || data instanceof ArrayBuffer) {
      const buf = data instanceof ArrayBuffer ? data : (data as Buffer).buffer.slice((data as Buffer).byteOffset, (data as Buffer).byteOffset + (data as Buffer).byteLength);
      win.bytes += buf.byteLength; if (phases[phaseName]) phases[phaseName].bytes += buf.byteLength;
      const s = readSnapshot(buf as ArrayBuffer);
      // takılma ölçümü yalnız hareket sürerken: o sırada sunucu her adımda görüntü yollar (boşta 10 adımda bir nabız)
      const movingNow = now - lastMoveSent < 120 && now - moveSince > 400;
      // Bot bir engele doğru yürüyorsa sunucu hareketi reddeder; değişen bir şey olmadığı için yalnız 250 ms'lik nabız gelir.
      // Bu bekleme değil (ekranda gösterilecek yeni bir şey yok): konum değişmediyse aralık takılma sayılmaz.
      const stuckHere = Math.round(s.sx) === Math.round(px) && Math.round(s.sy) === Math.round(py);
      if (lastSnap && movingNow && lastSnapMoving && !stuckHere) {
        rec('gaps', now - lastSnap);
        rec('srvGap', s.t - lastSrvT); // sunucu tarafında iki görüntü arası (adım gecikmesi)
        rec('jitter', Math.abs((now - lastSnap) - (s.t - lastSrvT))); // ağ/kuyruk kaynaklı sapma
      }
      lastSnap = now; lastSrvT = s.t; lastSnapMoving = movingNow;
      if (new Uint8Array(buf as ArrayBuffer)[0] === 2) ents.clear();
      px = s.sx; py = s.sy; hp = s.shp; maxHp = Math.max(1, s.smaxHp);
      for (const sp of s.spawns) ents.set(sp.id, { kind: sp.kind, x: sp.x, y: sp.y, hp: 'hp' in sp ? (sp as any).hp : 1, owner: sp.kind === Kind.LOOT ? (sp as any).owner : undefined });
      for (const u of s.updates) { const e = ents.get(u.id); if (!e) continue; if (u.x !== undefined) { e.x = u.x; e.y = u.y!; } if (u.hp !== undefined) e.hp = u.hp; if (u.flags !== undefined) e.dead = !!(u.flags & 1); }
      for (const id of s.removes) ents.delete(id);
      for (const ev of s.events) {
        if (ev.e === Ev.CAST && ev.src === myEntity) {
          if (ev.skill === 0 && pendingAtk) { rec('atk', now - pendingAtk); pendingAtk = 0; }
          else if (ev.skill !== 0 && ev.skill !== 8 && pendingSkill) { rec('skill', now - pendingSkill); pendingSkill = 0; }
        }
        if (ev.e === Ev.DEATH && ev.killer === myEntity) inc('kills');
      }
      return;
    }
    const m = JSON.parse(data.toString());
    switch (m.t) {
      case 'welcome': myEntity = m.entityId; map = m.map; send({ t: 'view', w: pick([2350, 1650, 1900]), h: pick([1700, 1200, 1300]) }); if (Math.random() < 0.3) send({ t: 'autopotion', on: true }); break;
      case 'map': map = m.map; ents.clear(); target = 0; wp = null; inc('travels'); break;
      case 'self':
        if (m.level) level = m.level;
        if (m.bag) bag = m.bag; if (m.equip) equip = m.equip; if (m.materials) potions = m.materials.red_potion ?? 0;
        if (m.bag && !equipPlanned) planEquip();
        break;
      case 'pong': rec('rtt', Date.now() - m.c); break;
      case 'dead': dead = true; target = 0; inc('deaths'); setTimeout(() => send({ t: 'respawn', where: Math.random() < 0.6 ? 'town' : 'here' }), rnd(3500, 9000)); break;
      case 'respawned': dead = false; break;
      case 'state': dead = !!m.dead; break;
      case 'drink': inc('potions'); break;
      case 'loot': inc('lootPicked'); break;
      case 'cd': inc('skillsCast'); cds[m.s] = Date.now() + m.until; break;
      case 'chat': inc('chatRecv'); break;
      case 'notice': note(m.text ?? ''); break;
      case 'kicked': inc('kicked'); break;
      case 'fatal': inc('fatal'); note('FATAL ' + (m.text ?? '')); break;
    }
  });
  ws.on('close', () => { if (Date.now() < stopAt.v) inc('disconnects'); });
  ws.on('error', () => inc('wsErrors'));

  // çantada daha iyi silah/zırh varsa (insan gibi: 1–4 sn sonra çantayı açıp) kuşanır; birikmiş beyazları ara sıra satar
  function planEquip() {
    const best: Record<string, any> = {};
    for (const it of bag) {
      const tpl = ITEM_TPL.get(it.tpl); if (!tpl || (tpl.slot !== 'weapon' && tpl.slot !== 'armor')) continue;
      if (tpl.cls && tpl.cls !== cls) continue;
      if (level < RARITY[it.rarity as keyof typeof RARITY].minLevel) continue;
      const score = RARITIES.indexOf(it.rarity) * 10 + (it.plus ?? 0);
      const cur = equip[tpl.slot], curScore = cur ? RARITIES.indexOf(cur.rarity) * 10 + (cur.plus ?? 0) : -1;
      if (score > curScore && score > (best[tpl.slot]?.score ?? -1)) best[tpl.slot] = { it, score };
    }
    const list = Object.values(best);
    if (!list.length) {
      const junk = bag.filter((it) => it.rarity === 'white' && ITEM_TPL.get(it.tpl)?.slot !== 'weapon' && !it.locked).slice(0, 4);
      if (bag.length > 12 && junk.length && Math.random() < 0.3) { equipPlanned = 1; setTimeout(() => { send({ t: 'sell', items: junk.map((j) => j.id), req: req() }); inc('sells'); equipPlanned = 0; }, rnd(2000, 6000)); }
      return;
    }
    equipPlanned = 1;
    setTimeout(() => { for (const { it } of list as any[]) { send({ t: 'equip', item: it.id }); inc('equips'); } equipPlanned = 0; }, rnd(1000, 4000));
  }

  const MAP_HOME = role === 'hunt_forest' ? 'forest' : 'bazaar';
  const iv = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN || !myEntity) return;
    const t = Date.now();
    if (dead) return;
    // insan ritmi: arada bir 3–15 sn durur (çanta, sohbet okuma, telefona bakma)
    if (t < busyUntil) return;
    if (Math.random() < 0.0015) { busyUntil = t + rnd(3000, 15000); inc('afkPauses'); return; }
    // can azaldı: iksir (insan tepkisi: eşiğin altına inince 200–700 ms sonra)
    if (hp / maxHp < potionThr && potions > 0 && t - lastPotionAt > 900) { lastPotionAt = t + rnd(200, 700); setTimeout(() => send({ t: 'potion' }), rnd(200, 700)); }
    // sohbet
    if (t > nextChatAt) { nextChatAt = t + (role === 'village' ? rnd(25_000, 90_000) : rnd(90_000, 300_000)); const ch = role === 'village' ? pick(['world', 'local', 'local', 'trade'] as const) : pick(['world', 'local'] as const); send({ t: 'chat', ch, text: pick(CHAT[ch]) }); inc('chatSent'); }
    // gezgin: haritalar arası
    if (role === 'roamer' && t > nextTravelAt) { nextTravelAt = t + rnd(120_000, 240_000); send({ t: 'travel', map: map === 'bazaar' ? 'forest' : 'bazaar', req: req(), confirm: true }); return; }
    if (role !== 'roamer' && map && map !== MAP_HOME && t > nextTravelAt) { nextTravelAt = t + 30_000; send({ t: 'travel', map: MAP_HOME, req: req(), confirm: true }); return; }
    // ping (gerçek istemci gibi 2 sn'de bir)
    if (t % 2000 < 50) send({ t: 'ping', c: t });

    let tx = 0, ty = 0, move = false;
    const hunting = role !== 'village' && !(role === 'roamer' && map === 'bazaar' && Math.random() < 0.5);
    if (hunting) {
      // ganimet: kendi ganimeti yakındaysa önce onu topla
      let loot: [number, { x: number; y: number }] | null = null;
      for (const [id, e] of ents) if (e.kind === Kind.LOOT && e.owner === charId && Math.hypot(e.x - px, e.y - py) < 600) { loot = [id, e]; break; }
      if (loot) {
        const d = Math.hypot(loot[1].x - px, loot[1].y - py);
        if (d < LOOT_PICKUP_RANGE - 30) { if (Math.random() < 0.15) send({ t: 'pickup', id: loot[0] }); }
        else { tx = loot[1].x; ty = loot[1].y; move = true; }
      } else {
        let tg = target ? ents.get(target) : undefined;
        if (!tg || tg.dead || tg.hp <= 0 || tg.kind !== Kind.MONSTER) {
          if (target && t < nextThinkAt) return; // öldürdükten sonra kısa tepki boşluğu
          target = 0; let bd = 1e12;
          for (const [id, e] of ents) if (e.kind === Kind.MONSTER && !e.dead && e.hp > 0) { const d = (e.x - px) ** 2 + (e.y - py) ** 2; if (d < bd) { bd = d; target = id; } }
          tg = target ? ents.get(target) : undefined;
          nextThinkAt = t + rnd(200, 700);
        }
        if (tg) {
          const sk0 = classSkill(cls, 0)!;
          const d = Math.hypot(tg.x - px, tg.y - py);
          const reach = sk0.range + 20;
          if (d > reach) { tx = tg.x; ty = tg.y; move = true; }
          else {
            // düz vuruş: tuş basılı tutuluyor gibi bekleme bitince
            const cd = attackCooldown(sk0.cooldownMs, 0) + rnd(10, 90);
            if (t - lastAtkSent > cd) { send({ t: 'attack', id: target }); lastAtkSent = t; if (!pendingAtk) pendingAtk = performance.now(); setTimeout(() => { pendingAtk = 0; }, 1500); inc('attacks'); }
            // beceriler: açık olanlar, bekleme bitince ve insan gibi her fırsatta değil
            for (const s of [5, 1, 4, 2]) {
              const sk = classSkill(cls, s); if (!sk || level < sk.unlock || t < cds[s] || Math.random() > 0.06) continue;
              if (sk.range && d > sk.range) continue;
              if (sk.qte) { send({ t: 'qte', s }); const w = rnd(250, QTE_SWEEP_MS); setTimeout(() => { send({ t: 'skill', s, id: target, x: Math.round(tg!.x), y: Math.round(tg!.y), qte: 1 }); if (!pendingSkill) pendingSkill = performance.now(); setTimeout(() => { pendingSkill = 0; }, 2000); }, w); cds[s] = t + 2000; }
              else { send({ t: 'skill', s, id: target, x: Math.round(tg.x), y: Math.round(tg.y) }); if (!pendingSkill) pendingSkill = performance.now(); setTimeout(() => { pendingSkill = 0; }, 2000); cds[s] = t + 1500; }
              break;
            }
            if (d < reach * 0.4 && Math.random() < 0.05) { tx = px - (tg.x - px); ty = py - (tg.y - py); move = true; } // ara sıra geri adım
          }
        }
      }
    } else {
      // köylü: NPC'ler, çeşme, pazar arası dolaşır; arada durur; NPC'ye uğrar; pazarda arama yapar
      if (!wp || Math.hypot(wp.x - px, wp.y - py) < 40) {
        wp = { x: 1792 + rnd(-700, 700), y: 1550 + rnd(-450, 450) };
        if (Math.random() < 0.3) busyUntil = t + rnd(2000, 9000);
      }
      if (t > nextNpcAt) { nextNpcAt = t + rnd(30_000, 120_000); send(Math.random() < 0.5 ? { t: 'market_search', q: pick(['kılıç', 'zırh', 'iksir', 'mavi', 'yay']) } : { t: 'bosses' }); inc('uiActions'); }
      tx = wp.x; ty = wp.y; move = Math.random() < 0.9;
    }
    // takılma kurtarma: hareket isteniyor ama 2 sn yerinde → 1 sn rastgele yön
    if (move) {
      if (Math.hypot(px - lastPos.x, py - lastPos.y) > 8) { lastPos = { x: px, y: py }; stuckAt = t; }
      else if (t - stuckAt > 2000) { unstuckUntil = t + 1000; unstuckDir = Math.floor(Math.random() * 8); stuckAt = t; wp = null; inc('unstuck'); }
    }
    const dir = t < unstuckUntil ? unstuckDir : move ? dirIndexFromVector(tx - px, ty - py) : NO_DIR;
    if (dir !== NO_DIR) { const pn = performance.now(); if (pn - lastMoveSent > 150) moveSince = pn; lastMoveSent = pn; send(encodeMove(++seq, dir)); }
  }, 50);
  return () => { clearInterval(iv); ws.close(); };
}

// ───────── sunucu ölçümü ─────────
let adminToken = '';
const cpuPrev = { t: 0, ticks: 0 };
function procCpu(): { cpu: number; rssMB: number } | null {
  if (!SERVER_PID) return null;
  try {
    const st = fs.readFileSync(`/proc/${SERVER_PID}/stat`, 'utf8').split(') ')[1].split(' ');
    const ticks = Number(st[11]) + Number(st[12]); const rss = Number(st[21]) * 4096 / 1048576; const now = Date.now();
    const cpu = cpuPrev.t ? ((ticks - cpuPrev.ticks) / 100) / ((now - cpuPrev.t) / 1000) * 100 : 0;
    cpuPrev.t = now; cpuPrev.ticks = ticks;
    return { cpu: Math.round(cpu), rssMB: Math.round(rss) };
  } catch { return null; }
}
const serverRows: any[] = [];

async function main() {
  try { adminToken = (await api('/api/login', { username: ADMIN, password: ADMIN_PASS })).token; } catch (e) { console.log('yönetici girişi yok:', (e as Error).message); }
  const stopAt = { v: Date.now() + DURATION };
  const stops: (() => void)[] = [];
  const t0 = Date.now();
  let started = 0;
  const target = (el: number) => { let n = 0; for (const p of PLAN) if (el >= p.t) { const prev = n; n = prev + Math.min(1, (el - p.t) / RAMP) * (p.n - prev); } return Math.floor(n); };
  const phaseOf = (el: number) => { let name = ''; for (const p of PLAN) if (el >= p.t) name = `${p.n} oyuncu`; return name; };
  const ramp = setInterval(() => {
    const el = Date.now() - t0;
    const want = target(el);
    while (started < want) { const i = (started++ * 37) % 100; bot(i, stopAt).then((s) => stops.push(s)).catch((e) => { inc('loginFail'); note('GİRİŞ ' + String(e.message).slice(0, 60)); }); }
  }, 200);
  const report: any[] = [];
  const tick = setInterval(async () => {
    const el = Date.now() - t0;
    const pn = phaseOf(el); if (pn !== phaseName) { phaseName = pn; phases[pn] ??= newBucket(); }
    const w = win; win = newBucket();
    const ld = adminToken ? await api('/api/admin/load', null, adminToken).catch(() => null) : null;
    const pc = procCpu();
    const g = w.gaps.summary(), r = w.rtt.summary(), a = w.atk.summary(), s = w.skill.summary();
    const row = {
      t: Math.round(el / 1000), bots: started, phase: phaseName,
      snapGap: { ...g, over200: w.gaps.over(200), over500: w.gaps.over(500) }, srvGap: w.srvGap.summary(), jitter: w.jitter.summary(), rtt: r, atk: a, skill: s,
      kbPerBotPerSec: started ? Math.round(w.bytes / 1024 / 5 / Math.max(1, started) * 10) / 10 : 0,
      counts: w.c,
      server: { cpu: pc?.cpu, rssMB: pc?.rssMB, procs: ld?.procs?.map((p: any) => ({ id: p.id, elu: p.elu, delay: p.delayMs, mem: p.memMB, tick95: p.tickP95, players: p.players, jobs: p.jobs?.length ?? 0 })) },
    };
    report.push(row); serverRows.push({ phase: phaseName, ...row.server, ld });
    console.log(`[${row.t}s] bot=${started} ${phaseName} | hareketteyken aralık p50/p95/p99/max=${g.p50}/${g.p95}/${g.p99}/${g.max} >200ms:${row.snapGap.over200} sunucu p99=${row.srvGap.p99} | ping p95=${r.p95} | vuruş p95=${a.p95} | KB/s/bot=${row.kbPerBotPerSec} | CPU=${pc?.cpu}% RSS=${pc?.rssMB}MB | ` + (ld?.procs ?? []).map((p: any) => `${p.id}: %${p.elu} gec=${p.delayMs} adım95=${p.tickP95 ?? '-'} oyuncu=${p.players}`).join(' · '));
  }, 5000);
  await sleep(DURATION);
  clearInterval(ramp); clearInterval(tick);
  stopAt.v = 0;
  stops.forEach((s) => s());
  const out: any = { url: URL_, plan: PLAN, duration: DURATION, phases: {}, report };
  for (const [k, b] of Object.entries(phases)) {
    const rows = serverRows.filter((r) => r.phase === k);
    const procIds = [...new Set(rows.flatMap((r) => (r.ld?.procs ?? []).map((p: any) => p.id)))];
    const procStats = Object.fromEntries(procIds.map((id) => {
      const ps = rows.map((r) => r.ld?.procs?.find((p: any) => p.id === id)).filter(Boolean);
      const mx = (f: string) => Math.max(...ps.map((p: any) => p[f] ?? 0)), av = (f: string) => Math.round(ps.reduce((a: number, p: any) => a + (p[f] ?? 0), 0) / Math.max(1, ps.length) * 10) / 10;
      const jobs = new Map<string, number>(); for (const p of ps) for (const j of p.jobs ?? []) jobs.set(`${j.name} ${j.detail ?? ''}`.slice(0, 80), Math.max(jobs.get(`${j.name} ${j.detail ?? ''}`.slice(0, 80)) ?? 0, j.ms));
      return [id, { eluAvg: av('elu'), eluMax: mx('elu'), delayAvg: av('delayMs'), delayMax: mx('delayMs'), tickP95Max: mx('tickP95'), memMaxMB: mx('memMB'), players: mx('players'), slowJobs: [...jobs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8) }];
    }));
    out.phases[k] = {
      snapGap: { ...b.gaps.summary(), over100: b.gaps.over(100), over200: b.gaps.over(200), over500: b.gaps.over(500), over1000: b.gaps.over(1000) }, srvGap: { ...b.srvGap.summary(), over100: b.srvGap.over(100) }, jitter: b.jitter.summary(),
      rtt: b.rtt.summary(), atk: b.atk.summary(), skill: b.skill.summary(),
      mbIn: Math.round(b.bytes / 1048576 * 10) / 10, counts: b.c, notices: [...b.notices.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
      cpuAvg: Math.round(rows.reduce((a, r) => a + (r.cpu ?? 0), 0) / Math.max(1, rows.length)), cpuMax: Math.max(...rows.map((r) => r.cpu ?? 0)), rssMaxMB: Math.max(...rows.map((r) => r.rssMB ?? 0)),
      procs: procStats,
    };
  }
  console.log(JSON.stringify(out.phases, null, 1));
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  setTimeout(() => process.exit(0), 800);
}
main();
