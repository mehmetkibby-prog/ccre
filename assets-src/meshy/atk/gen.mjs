// Düz vuruş: Meshy hareket kütüphanesinden modelin KENDİ iskeletine (rig) özgü saldırı klipleri (aktarma yok). Durum state.json
import fs from 'node:fs';
const API = 'https://api.meshy.ai/openapi/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(m, p, body) { for (let i = 0; ; i++) { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); if (r.status === 429 && i < 8) { await sleep(4000 * (i + 1)); continue; } if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t.slice(0, 300)}`); return JSON.parse(t); } }
const builds = JSON.parse(fs.readFileSync('../state.json', 'utf8')).builds;
const WANT = { guardian: [105, 92, 102, 241, 4, 89], arcanist: [130, 132, 133, 134] };
const st = fs.existsSync('state.json') ? JSON.parse(fs.readFileSync('state.json', 'utf8')) : {};
const save = () => fs.writeFileSync('state.json', JSON.stringify(st, null, 1));
console.log('kredi', (await call('GET', '/balance')).balance);
for (const [cls, ids] of Object.entries(WANT)) for (const id of ids) {
  const k = `${cls}_${id}`;
  if (!st[k]) { st[k] = (await call('POST', '/animations', { rig_task_id: builds[cls].rig, action_id: id })).result; save(); console.log('istendi', k); }
}
const find = (o) => { let u = null; const w = (x) => { if (u) return; if (typeof x === 'string' && /^https?:/.test(x) && /\.glb$/i.test(x.split('?')[0])) u = x; else if (x && typeof x === 'object') for (const v of Object.values(x)) w(v); }; w(o); return u; };
for (const [k, id] of Object.entries(st)) {
  if (fs.existsSync(k + '.glb')) continue;
  for (;;) {
    const t = await call('GET', `/animations/${id}`);
    if (t.status === 'SUCCEEDED') { const u = find(t.result ?? t); fs.writeFileSync(k + '.glb', Buffer.from(await (await fetch(u)).arrayBuffer())); console.log('indi', k); break; }
    if (t.status === 'FAILED' || t.status === 'CANCELED') { console.log('HATA', k, JSON.stringify(t.task_error)); break; }
    await sleep(4000);
  }
}
console.log('kredi', (await call('GET', '/balance')).balance);
