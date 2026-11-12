import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLocalLoad,validateInstallLoad} from '../acceptance.mjs';
import {synthetic,sha} from './load-report-fixture.mjs';
import {pauseLimit} from '../performance-policy.mjs';

test('acceptance rejects an over200ms world pause or over150ms reader pause',()=>{
 for(const transport of ['message-channel','websocket'])for(const target of ['world','reader']){
  const report=synthetic(transport),row=report.measurement.eventLoops.find(row=>row.target===target);row.maxPauseMs=row.timerMaxPauseMs=pauseLimit(target)+1;
  assert.equal((transport==='websocket'?validateInstallLoad:validateLocalLoad)(report,sha).passed,false,target+' pause must be part of acceptance');
 }
});

test('raw role-specific boundary covers every loop and CPU/RSS totals cover each OS process exactly once',()=>{
 for(const target of ['main','world','channel-1','channel-2','channel-3','channel-4','reader']){
  const report=synthetic(),row=report.measurement.eventLoops.find(r=>r.target===target);row.maxPauseMs=row.timerMaxPauseMs=pauseLimit(target);assert(validateLocalLoad(report,sha).passed,target);row.maxPauseMs=row.timerMaxPauseMs=pauseLimit(target)+.001;assert(!validateLocalLoad(report,sha).passed,target);
 }
 for(const change of [r=>r.measurement.eventLoops[0].elu=.50001,r=>r.measurement.eventLoops[1].maxPauseMs=NaN,r=>r.measurement.eventLoops[6].processCpuMs=1,r=>r.measurement.eventLoops[0].processCpuMs=r.durationMs*3,r=>r.resources.maxRssBytes=1]){const report=synthetic();change(report);assert(!validateLocalLoad(report,sha).passed);}
 const local=synthetic();for(const [i,row]of local.measurement.eventLoops.entries()){row.pid=100;row.threadId=i;row.processCpuMs=i===0?local.durationMs*.6:null;row.maxRssBytes=i===0?6*1024**2:null;}assert(validateLocalLoad(local,sha).passed,'authorized MessageChannel worker topology');local.transport='websocket';assert(!validateInstallLoad(local,sha).passed,'real network gate requires independent OS owners');
});

test('acceptance requires a complete stable process/thread inventory for the whole load interval',()=>{
 for(const change of [r=>delete r.measurement,r=>r.measurement.eventLoops.pop(),r=>r.measurement.eventLoops[1]={...r.measurement.eventLoops[0]},r=>r.measurement.eventLoops[6].threadId=0,r=>r.measurement.eventLoops[1].durationMs=179999,r=>r.measurement.eventLoops[1].complete=false,r=>r.measurement.eventLoops[1].runId='different-run',r=>r.measurement.eventLoops[1].delaySamples=0]){
  const report=synthetic();change(report);assert.equal(validateLocalLoad(report,sha).passed,false,'incomplete runtime measurement cannot authorize release');
 }
});
