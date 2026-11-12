import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {randomUUID} from 'node:crypto';
import {LoadWindow} from '../load-window.mjs';
import {StreamControl} from '../reliable-stream.mjs';

test('raw load histogram captures a real final80ms block and cannot be reset by a repeated begin',async t=>{
 const window=new LoadWindow({target:'main',incarnation:randomUUID()}),runId=randomUUID();t.after(()=>window.close());assert.equal(window.active,null);const begun=await window.command({operation:'begin',runId});assert(begun.started);await assert.rejects(window.command({operation:'begin',runId}),{code:'load_window_busy'});
 const until=performance.now()+80;while(performance.now()<until){}const result=await window.command({operation:'end',runId});assert(result.maxPauseMs>=75,JSON.stringify(result));assert(result.durationMs>=80);assert(result.delaySamples>0);assert(result.processCpuMs>0);assert(result.maxRssBytes>0);assert.equal(result.threadId,0);assert.equal(window.active,null);assert.deepEqual(await window.command({operation:'end',runId}),result);
 assert(result.slowGaps.length>0&&result.slowGaps.length<=20);assert(result.slowGaps[0].ms>=75);assert(Math.abs(result.slowGaps[0].ms-result.timerMaxPauseMs)<.001);assert(Math.abs(result.slowGaps[0].endedAtMs-result.slowGaps[0].startedAtMs-result.slowGaps[0].ms)<.001);
 const next=randomUUID();await window.command({operation:'begin',runId:next});await assert.rejects(window.command({operation:'end',runId}),{code:'load_window_fenced'});await window.command({operation:'cancel',runId:next});assert.equal(window.active,null);await assert.rejects(window.command({operation:'end',runId:next}),{code:'load_window_fenced'});
});

test('only read-only measurement control may time out; a late ACK cannot answer a new run',async()=>{
 const control=new StreamControl(),pending=control.request('load_measure',{operation:'begin',runId:randomUUID()},{id:'first',timeoutMs:10});const rejected=assert.rejects(pending,{code:'ipc_control_timeout'});await new Promise(resolve=>setTimeout(resolve,20));await rejected;assert.equal(control.pending.size,0);control.receive({type:'control_result',id:'first',ok:true,value:{started:true}});
 assert.throws(()=>control.request('freeze',{}, {timeoutMs:10}),{code:'ipc_control_timeout_scope'});const next=control.request('load_measure',{operation:'begin',runId:randomUUID()},{id:'second',timeoutMs:100});control.receive({type:'control_result',id:'second',ok:true,value:{started:true}});assert.deepEqual(await next,{started:true});control.close();
});
test('all later smaller violations remain timestamped after the raw maximum was captured',async t=>{
 const window=new LoadWindow({target:'main',incarnation:randomUUID()}),runId=randomUUID();t.after(()=>window.close());await window.command({operation:'begin',runId});
 const block=ms=>{const end=performance.now()+ms;while(performance.now()<end){}};
 // Prime a regular histogram sample inside the measured interval; the
 // separate first/final-edge test covers blocks before that first sample.
 await new Promise(resolve=>setTimeout(resolve,10));block(95);await new Promise(resolve=>setTimeout(resolve,10));block(65);const result=await window.command({operation:'end',runId});
 assert(result.maxPauseMs>=90);assert.equal(result.maxPauseMs,Math.max(result.histogramMaxPauseMs,result.timerMaxPauseMs));assert.equal(result.droppedPauseWitnesses,0);assert(result.pauseWitnesses.some(w=>w.kind==='timer'&&w.ms>=90));assert(result.pauseWitnesses.some(w=>w.kind==='timer'&&w.ms>=60&&w.ms<90));assert(result.pauseWitnesses.some(w=>w.kind==='histogram'&&w.ms>=90));assert(result.pauseWitnesses.some(w=>w.kind==='histogram'&&w.ms>=60&&w.ms<90));assert(result.delaySamples>2);
});
