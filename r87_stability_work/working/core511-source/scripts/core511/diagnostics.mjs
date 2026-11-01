import {stageSnapshotR51} from './stage-timing-r51.mjs';
import {createCpuProfiler507,createProfileCoordinator507,runtimePerformance,startRuntimePerformance} from './generated/profiler-rules.mjs';
import {demand} from './contract.mjs';
import {LoadMeasurements} from './load-measurements.mjs';
import {observeWriterStallsR79} from './server-stall-observer-r79.mjs';

// Trusted main/admin composition only. No socket input can choose a process,
// inspector command, filename or connection. Existing native profile limits
// and process-change fencing remain in the native coordinator itself.
export class KernelDiagnostics {
 constructor(core,{clock=Date.now}={}){
  demand(core?.processes instanceof Map,'diagnostics_core_required');this.core=core;this.clock=clock;this.facades=new WeakMap();this.profiler=createCpuProfiler507();this.coordinate=createProfileCoordinator507({local:request=>this.profiler.command(request),now:clock});this.closed=false;this.stop=null;this.pending=null;this.cached=null;this.lastSample=-Infinity;this.load=new LoadMeasurements(core);this.writerStallsR79=core.database?observeWriterStallsR79(core.database,{clock}):null;
 }
 rows(){return new Map([[0,this.core.sharedWorld?.row],...[...this.core.processes].filter(([channel])=>channel>=1&&channel<=4)]);}
 ready(channel,row){return channel===0?row?.state==='running'&&!row.exited:row?.online===true;}
 facade(channel,row){
  let value=this.facades.get(row);if(value)return value;
  value={get ready(){return channel===0?row.state==='running'&&!row.exited:row.online===true;},rpc:{request:(method,payload,options)=>{demand(method==='cpuProfile507'&&this.rows().get(channel)===row&&this.ready(channel,row),'profile_process_changed');return row.control.request('profile',payload,options);}}};this.facades.set(row,value);return value;
 }
 profile(input){demand(!this.closed,'diagnostics_closed');const children=new Map();for(const [channel,row]of this.rows())if(row)children.set(channel,this.facade(channel,row));return this.coordinate({channelCompute:{children}},input);}
 beginLoad(runId){demand(!this.closed,'diagnostics_closed');return this.load.begin(runId);}
 endLoad(runId){demand(!this.closed,'diagnostics_closed');return this.load.end(runId);}
 start(){demand(!this.closed&&!this.stop,'diagnostics_already_started');this.stop=startRuntimePerformance();}
 sample(){
  demand(!this.closed,'diagnostics_closed');if(this.pending)return this.pending;
  const selected=[...this.rows()].filter(([,row])=>row),same=this.cachedPeers?.length===selected.length&&selected.every(([channel,row],i)=>this.cachedPeers[i].channel===channel&&this.cachedPeers[i].row===row&&this.cachedPeers[i].ready===this.ready(channel,row)),age=this.clock()-this.lastSample;
  if(this.cached&&same&&age>=0&&age<1000)return Promise.resolve(structuredClone(this.cached));
  this.lastSample=this.clock();const peers=selected.map(([channel,row])=>({channel,row,ready:this.ready(channel,row)})),task=(async()=>{
   const replies=await Promise.allSettled(selected.map(async([channel,row])=>{demand(this.ready(channel,row),'diagnostics_process_unavailable');const metrics=await row.control.request('metrics',{}, {timeoutMs:5000});demand(this.rows().get(channel)===row&&this.ready(channel,row),'diagnostics_process_changed');return {target:channel===0?'world':'channel-'+channel,available:true,metrics};}));
   const targets=replies.map((result,index)=>{const [channel,row]=selected[index];return result.status==='fulfilled'&&this.rows().get(channel)===row&&this.ready(channel,row)?result.value:{target:channel===0?'world':'channel-'+channel,available:false};});
   const value={measuredAtMs:this.clock(),scope:'server-processes-not-network-rtt',main:runtimePerformance().snapshot(),stagesR51:stageSnapshotR51(),writerStallsR79:this.writerStallsR79?.snapshot()??null,targets};this.cached=value;this.cachedPeers=peers;return structuredClone(value);
  })();this.pending=task;return task.finally(()=>{if(this.pending===task)this.pending=null;});
 }
 close(){if(this.closed)return;this.closed=true;this.profiler.close();this.stop?.();this.stop=null;this.load.close();this.writerStallsR79?.close();}
}
