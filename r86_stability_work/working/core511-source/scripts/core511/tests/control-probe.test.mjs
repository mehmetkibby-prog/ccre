import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createControlProbe,controlComparison} from '../benchmark/control-probe.mjs';
test('independent idle process reports an OS suspension without discounting its raw gap',async t=>{
 const probe=await createControlProbe();t.after(()=>probe.close());const runId=randomUUID(),start=await probe.request('begin',runId);assert.equal(start.pid,probe.pid);assert.notEqual(start.pid,process.pid);
 process.kill(probe.pid,'SIGSTOP');try{await new Promise(resolve=>setTimeout(resolve,90));}finally{process.kill(probe.pid,'SIGCONT');}
 const result=await probe.request('end',runId);assert(result.complete);assert.equal(result.runId,runId);assert.equal(result.incarnation,start.incarnation);assert(result.durationMs>=85);assert(result.maxPauseMs>=85);assert.equal(result.maxPauseMs,Math.max(result.histogramMaxPauseMs,result.timerMaxPauseMs));assert(result.gapsOver50.some(g=>g.ms>=85));assert.equal(result.droppedGaps,0);assert(result.maxRssBytes>0);
 const channel={target:'channel-4',maxPauseMs:result.maxPauseMs,slowGaps:[...result.gapsOver50].sort((a,b)=>b.ms-a.ms)},comparison=controlComparison([channel],result);assert(comparison.channels[0].controlOverlapsWorst.length);assert.equal(channel.maxPauseMs,result.maxPauseMs);
});
