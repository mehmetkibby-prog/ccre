import test from 'node:test';
import assert from 'node:assert/strict';
import {LOCAL_PAUSE_POLICY,localPauseAttribution} from '../local-pause-attribution.mjs';
import {validateLocalLoad,validateInstallLoad} from '../acceptance.mjs';
import {synthetic,sha} from './load-report-fixture.mjs';
function example(offset=0){
 const report=synthetic(),row=report.measurement.eventLoops.find(r=>r.target==='channel-3'),gap={startedAtMs:1000,endedAtMs:1090,ms:90};
 Object.assign(row,{maxPauseMs:90,histogramMaxPauseMs:90,timerMaxPauseMs:90,pauseWitnessVersion:1,droppedPauseWitnesses:0,pauseWitnesses:['timer','histogram'].map(kind=>({...gap,kind}))});report.channels[2].maxPauseMs=90;report.localPausePolicy=LOCAL_PAUSE_POLICY;
 report.controlProbe={protocol:'core511-independent-control-v1',runId:report.measurement.runId,pid:9999,incarnation:'independent-control',complete:true,durationMs:180000,startedAtMs:0,endedAtMs:180000,histogramMaxPauseMs:90,timerMaxPauseMs:90,maxPauseMs:90,droppedGaps:0,over50Count:1,gapsOver50:[{...gap,startedAtMs:gap.startedAtMs+offset,endedAtMs:gap.endedAtMs+offset}]};return report;
}
test('historical correlation remains diagnostic; latest raw50 rejects even exact control matches',()=>{
 for(const offset of [-20,0,20]){const report=example(offset),before=structuredClone(report),result=localPauseAttribution(report);assert(!validateLocalLoad(report,sha).passed);assert.equal(result.excludedCount,1);assert.equal(result.excluded[0].ms,90);assert.equal(result.excluded[0].observers.length,2);assert.deepEqual(report,before);}
 for(const offset of [-20.001,20.001])assert(!validateLocalLoad(example(offset),sha).passed);
});
test('unmatched, incomplete, forged, longer and later smaller pauses cannot be hidden',()=>{
 for(const change of [r=>r.controlProbe.pid=100,r=>r.controlProbe.runId='wrong',r=>r.controlProbe.complete=false,r=>r.controlProbe.droppedGaps=1,r=>r.controlProbe.timerMaxPauseMs=20,r=>r.measurement.eventLoops[4].droppedPauseWitnesses=1,r=>r.measurement.eventLoops[4].pauseWitnesses.pop(),r=>r.channels[2].maxPauseMs=95]){const r=example();change(r);assert(!validateLocalLoad(r,sha).passed);}
 const later=example(),row=later.measurement.eventLoops[4];row.pauseWitnesses.push({kind:'timer',startedAtMs:2000,endedAtMs:2060,ms:60});assert(!validateLocalLoad(later,sha).passed);assert.equal(localPauseAttribution(later).retained[0].ms,60);
 const longer=example();longer.controlProbe.gapsOver50=[{startedAtMs:1030,endedAtMs:1090,ms:60}];longer.controlProbe.maxPauseMs=longer.controlProbe.timerMaxPauseMs=longer.controlProbe.histogramMaxPauseMs=60;assert(!validateLocalLoad(longer,sha).passed);
});
test('VDS and non-pause gates never inherit the local exception',()=>{
 const vds=example();vds.transport='websocket';assert(!validateInstallLoad(vds,sha).passed);assert.equal(localPauseAttribution(vds).excludedCount,0);
 for(const change of [r=>r.channels[2].tickP95Ms=10.001,r=>r.channels[2].maxInputMs=50.001,r=>r.writer.ackP95Ms=50.001,r=>r.measurement.eventLoops[4].elu=.35001,r=>r.verifiedMechanics.pve=false]){const r=example();change(r);assert(!validateLocalLoad(r,sha).passed);}
});
