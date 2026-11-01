// Diagnostic only: unchanged R85 source/harness, opt-in timing, no warmup.
import fs from 'node:fs';
process.env.CORE511_STAGE_TIMING='1';
const base='/workspace/ccre/r85_stability_work/working/core511-source/scripts/core511/';
const {RewardWorkerR533}=await import(base+'reward-worker-r533.mjs');
const {stageSnapshotR51}=await import(base+'stage-timing-r51.mjs');
const spans=[],sync={};
for(const name of ['safeScope','envelope','publishCommitted']){
 const original=RewardWorkerR533.prototype[name];
 RewardWorkerR533.prototype[name]=function(...args){
  const at=performance.now();try{return original.apply(this,args);}finally{
   const ms=performance.now()-at,row=sync[name]??={count:0,totalMs:0,maxMs:0};
   row.count++;row.totalMs+=ms;row.maxMs=Math.max(row.maxMs,ms);
  }
 };
}
const originalSend=RewardWorkerR533.prototype.send;
RewardWorkerR533.prototype.send=async function(envelope){
 const at=performance.now();let result,error;
 try{result=await originalSend.call(this,envelope);return result;}catch(e){error=e;throw e;}finally{
  spans.push({startEpochMs:performance.timeOrigin+at,elapsedMs:performance.now()-at,
   workerMs:result?.workMs??null,operation:envelope.request.operation,
   batch:1+(envelope.request.payload?.batchAttacksR57?.length??0),
   resources:envelope.request.payload?.resources?.length,queue:this.database.writeQueue.length,error:error?.code??null});
 }
};
try{await import('/workspace/ccre/r85_stability_work/tests/runtime/native-mixed-load-realistic.mjs');}
finally{fs.writeFileSync('/workspace/ccre/r86_stability_work/evidence/r85-worker-diagnostic.json',JSON.stringify({diagnosticOnly:true,stageTimingEnabled:true,sourceMutated:false,sync,stages:stageSnapshotR51(),spans},null,2)+'\n');}
