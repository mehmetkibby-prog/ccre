import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLocalLoad,validateInstallLoad,validateLocalPerformance,validatePerformancePair,validateLoad} from '../acceptance.mjs';
import {InputResponses} from '../input-response-measurements.mjs';
import {synthetic,sha,syntheticPair,syntheticInputs} from './load-report-fixture.mjs';
import {pauseLimit} from '../performance-policy.mjs';
test('both transports enforce exact new boundaries, no startup or control exclusions',()=>{
 for(const transport of ['message-channel','websocket']){
  const validate=(r,manifestSha256)=>validateLoad(r,{transport,durationMs:180000,manifestSha256,requireCompleteGame:false});
  const base=()=>{const r=synthetic(transport,{completeGame:false});for(const c of r.channels){c.tickP95Ms=30;c.tickP99Ms=60;c.maxPauseMs=150;}for(const row of r.measurement.eventLoops)row.maxPauseMs=row.timerMaxPauseMs=pauseLimit(row.target);r.writer.elu=.5;r.writer.maxPauseMs=200;r.measurement.eventLoops[0].elu=.5;r.inputResponses=syntheticInputs({normalP99:150,normalMax:400,burstMax:1500});return r;};
  assert(validate(base(),sha).passed);
  for(const mutate of [r=>r.channels[2].tickP95Ms=30.0001,r=>r.channels[2].tickP99Ms=60.0001,r=>delete r.channels[2].tickP99Ms,r=>r.inputResponses=syntheticInputs({normalMax:400.0001}),r=>r.inputResponses=syntheticInputs({normalP99:150.0001,normalMax:151}),r=>r.inputResponses=syntheticInputs({burstMax:1500.0001}),r=>r.inputResponses.samples--,r=>r.inputResponses.observations.pop(),r=>r.inputResponses.segments.normal.maxMs=0,r=>r.writer.potions.matched=99,r=>r.measurement.eventLoops[6].timerMaxPauseMs=r.measurement.eventLoops[6].maxPauseMs=150.0001,r=>r.measurement.eventLoops[0].elu=.500001,r=>r.durationMs=179999]){const r=base();mutate(r);assert(!validate(r,sha).passed);}
 }
 const mixed=synthetic();mixed.workload='native-gameplay-mixed';mixed.verifiedMechanics={};assert(validateLocalPerformance(mixed,sha).passed);assert(!validateLocalLoad(mixed,sha).passed);
});
test('input latency includes durable waiting and first10s, bounded samples cannot drop slow results',()=>{
 let time=100;const r=new InputResponses({clock:()=>time,limit:2});r.begin();time=421;r.record({at:100,channel:1,action:'use_potion',sequence:1});time=10201;r.record({at:10100,channel:2,action:'move',sequence:2});const value=r.report();assert.equal(value.samples,2);assert.equal(value.maxMs,321);assert.equal(value.p99Ms,321);assert.equal(value.phases.startup.maxMs,321);assert.equal(value.segments.potionBurst.maxMs,321);assert.equal(value.segments.normal.maxMs,101);assert.throws(()=>r.record({at:10200,channel:1,action:'move',sequence:3}),/input_measurement_scope/);
});

test('pair cannot mix candidates, skip a failed run, reuse a run or substitute30s diagnostics',()=>{assert(validatePerformancePair(syntheticPair(),sha));for(const mutate of [r=>r[1].sourceIdentity.sha256='b'.repeat(64),r=>r[1].attempt++,r=>r[1].measurement.runId=r[0].measurement.runId,r=>r[1].durationMs=30000,r=>r[1].sourceUnchanged=false,r=>r[0].inputResponses=syntheticInputs({normalMax:401})]){const r=syntheticPair();mutate(r);assert(!validatePerformancePair(r,sha));}});
test('normal includes BOTH sides of the actual potion window, including the first ten seconds',()=>{
 const input=new InputResponses();input.begin(0);const add=(at,ms,action='move')=>input.record({at,channel:1,action,sequence:1},at+ms);
 add(0,401);add(500,900,'use_potion');add(600,300);add(1400,402);add(9000,403);add(10000,404);
 const r=input.report();assert.deepEqual(r.burst,{startedMs:500,endedMs:1400,potions:1,sendSpreadMs:0});assert.equal(r.segments.potionBurst.samples,2);assert.equal(r.segments.normal.samples,4);assert.equal(r.segments.normal.maxMs,404);assert.equal(r.segments.normal.samples+r.segments.potionBurst.samples,r.samples);assert.equal(r.observations.length,r.samples);
});
