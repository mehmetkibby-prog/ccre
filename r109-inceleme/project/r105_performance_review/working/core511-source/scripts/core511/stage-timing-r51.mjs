import {stageOnlyTimingR78} from './timing-mode-r78.mjs';
import {performance} from 'node:perf_hooks';
import {stageTimingR51} from './r51-options.mjs';

// No identifiers, timers, SQL writes or per-request logs. Fixed stage/sample
// limits bound memory independently of actor count and process lifetime.
const rows=new Map(),MAX_STAGES=64,SAMPLES=512;
export const stageStartR51=()=>stageTimingR51?performance.now():null;
export function stageRecordR51(name,ms){
 if(!stageTimingR51||!Number.isFinite(ms)||ms<0)return;
 let row=rows.get(name);if(!row){if(rows.size>=MAX_STAGES)return;rows.set(name,row={count:0,totalMs:0,maxMs:0,samples:new Float64Array(SAMPLES)});}
 row.samples[row.count%SAMPLES]=ms;row.count++;row.totalMs+=ms;row.maxMs=Math.max(row.maxMs,ms);
}
export function stageEndR51(name,start){if(start!==null)stageRecordR51(name,performance.now()-start);}
export function observeStageR51(name,start,pending){
 if(start!==null)pending.then(()=>stageEndR51(name,start),()=>stageEndR51(name,start));
 return pending;
}
export function stageSnapshotR51({reset=false}={}){
 const result={enabled:stageTimingR51,scope:'process-local elapsed wall; nested stages overlap; samples are last 512, not full-run percentiles',stages:{}};
 for(const [name,row]of rows){const values=Array.from(row.samples.subarray(0,Math.min(row.count,SAMPLES))).sort((a,b)=>a-b),p=q=>values[Math.max(0,Math.ceil(values.length*q)-1)]??0;result.stages[name]={count:row.count,totalMs:row.totalMs,maxMs:row.maxMs,sampleCount:values.length,p50:p(.5),p95:p(.95),p99:p(.99)};}
 if(reset)rows.clear();return result;
}
export function timedAtomicR51(database,work,operation){
 if(!stageTimingR51)return database.atomic(work);
 const timing=stageOnlyTimingR78(),name=['attack','native_action','movement','actor_checkpoint','combat_checkpoint'].includes(operation)?operation:'other';
 const pending=database.atomic(work,{timing});
 const record=()=>{for(const key of ['queueMs','jobMs','commitMs','durableMs','fsyncWaitMs'])if(Number.isFinite(timing[key]))stageRecordR51('writer.'+name+'.'+key,timing[key]);};
 pending.then(record,record);return pending;
}
