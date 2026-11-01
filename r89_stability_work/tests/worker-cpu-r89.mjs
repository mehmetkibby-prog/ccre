// Read-only local diagnostic. No production source or gameplay rule changes.
import fs from 'node:fs';
import inspector from 'node:inspector';
import {promisify} from 'node:util';
const base='/workspace/ccre/r89_stability_work/working/core511-source/scripts/core511/';
const {NativeModeServices}=await import(base+'mode-services.mjs');
const {NativeGameServices}=await import(base+'game-services.mjs');
const {GameWriter}=await import(base+'writer-runtime.mjs');
const {WriterPresence}=await import(base+'presence.mjs');
const spans=[],stats={};
const record=(name,at,extra={})=>{
 const ms=performance.now()-at,row=stats[name]??={count:0,totalMs:0,maxMs:0};
 row.count++;row.totalMs+=ms;row.maxMs=Math.max(row.maxMs,ms);
 if(spans.length<10000)spans.push({name,startEpochMs:performance.timeOrigin+at,ms,...extra});
};
for(const [Type,name]of [[NativeModeServices,'refresh'],[NativeGameServices,'refresh'],[GameWriter,'refreshOwners'],[WriterPresence,'materialize']]){
 const original=Type.prototype[name],label=Type.name+'.'+name;
 Type.prototype[name]=function(...args){const at=performance.now(),rows=this.rows?.size;try{return original.apply(this,args);}finally{record(label,at,{rows});}};
}
const originalCommand=GameWriter.prototype.command;
GameWriter.prototype.command=async function(peer,request){
 const at=performance.now();try{return await originalCommand.call(this,peer,request);}finally{
  record('GameWriter.command',at,{operation:request.operation,batch:1+(request.payload?.batchAttacksR57?.length??0)});
 }
};
const profileEpochMs=Date.now();
const session=new inspector.Session();session.connect();
const post=promisify(session.post.bind(session));
await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:1000});await post('Profiler.start');
setTimeout(async()=>{
 try{
  const {profile}=await post('Profiler.stop');
  fs.writeFileSync('/workspace/ccre/r89_stability_work/evidence/worker-inner.cpuprofile.json',JSON.stringify(profile));
  fs.writeFileSync('/workspace/ccre/r89_stability_work/evidence/worker-inner-spans.json',JSON.stringify({diagnosticOnly:true,sourceMutated:false,profileEpochMs,stats,spans},null,2)+'\n');
 }finally{session.disconnect();}
},25000).unref();
const {runRewardWorkerR533}=await import(base+'reward-worker-runtime-r533.mjs');
await runRewardWorkerR533();
