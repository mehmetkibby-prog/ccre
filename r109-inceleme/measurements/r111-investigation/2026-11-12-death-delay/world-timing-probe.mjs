import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
const core = process.env.STUTTER_TREE + '/core511-source/scripts/core511';
const {httpActionFixture} = await import(core + '/tests/native-http-action-fixture.mjs');
const {until} = await import(core + '/tests/helpers.mjs');

test('identify full world_timing without assuming it measures a death command', {timeout:45000}, async t => {
  const s = await httpActionFixture(t);
  const ordinary = await s.module.default(s.f.request({path:'/api/world',method:'GET'}));
  assert.equal(ordinary.status, 428);
  const baselineAt = performance.now();
  const baseline = await s.module.default(s.f.request({path:'/api/world?marketShop506=own',method:'GET'}));
  const baselineMs = performance.now() - baselineAt;
  assert.equal(baseline.status, 200);
  assert.equal((await baseline.json()).marketShop506, true);

  let release, entered = false, finished = false;
  const gate = new Promise(resolve => {release = resolve;});
  const blocker = s.core.serial(async () => {entered = true; await gate;});
  await until(() => entered, 2000);
  const started = performance.now();
  const pending = s.module.default(s.f.request({path:'/api/world?marketShop506=own',method:'GET'}));
  pending.then(() => {finished = true;}, () => {finished = true;});
  const timer = setTimeout(release, 1600);
  let heartbeatMs = null;
  try {
    const at = performance.now();
    s.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'heartbeat'}}));
    await until(() => s.live.packets.some(p => p.type==='frame' && p.results?.some(r => r.sequence===1)), 5000);
    heartbeatMs = performance.now() - at;
    const response = await pending;
    const elapsed = performance.now() - started;
    assert.equal(response.status, 200);
    assert.equal((await response.json()).marketShop506, true);
    assert(elapsed >= 1500);
    assert.equal(s.faults.length, 0, s.faults.map(f=>f.error?.stack).join('\n'));
    const report = {
      kind:'controlled-local-reproduction-not-live-cause',
      ordinaryWorldStatus:ordinary.status,
      baselineMarketMs:baselineMs,
      injectedCoordinatorHoldMs:1600,
      marketElapsedMs:elapsed,
      marketServerTiming:response.headers.get('server-timing'),
      heartbeatElapsedMs:heartbeatMs,
      faults:s.faults.length,
      conclusion:'full world_timing with status 200 can be a market-only read delayed by the coordinator; it does not time monster death',
    };
    fs.writeFileSync('/tmp/r111-world-timing-repro.json', JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
  } finally {
    clearTimeout(timer); release(); await blocker; await pending;
  }
});
