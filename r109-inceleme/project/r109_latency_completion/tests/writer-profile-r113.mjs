// Test-only inspector attachment to the existing worker. No production IPC or
// gameplay handler is replaced; timed profiles are diagnostic, not acceptance.
import {Session} from 'node:inspector';
import fs from 'node:fs';
export async function profileWriterR113(out){
 const session=new Session();session.connect();let serial=0,target=null,closed=false;
 const pending=new Map(),seen=[];
 const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(error,value)=>error?reject(error):resolve(value)));
 let found;const attached=new Promise(resolve=>found=resolve);
 session.on('NodeWorker.attachedToWorker',({params})=>{seen.push(params.workerInfo);if(params.workerInfo.url.endsWith('/reward-worker-entry-r533.mjs')){target=params.sessionId;found();}});
 session.on('NodeWorker.receivedMessageFromWorker',({params})=>{if(params.sessionId!==target)return;const message=JSON.parse(params.message),row=pending.get(message.id);if(!row)return;pending.delete(message.id);clearTimeout(row.timer);message.error?row.reject(Error(JSON.stringify(message.error))):row.resolve(message.result);});
 const close=()=>{if(closed)return;closed=true;for(const row of pending.values()){clearTimeout(row.timer);row.reject(Error('writer_profile_closed'));}pending.clear();session.disconnect();};
 try{
  await post('NodeWorker.enable',{waitForDebuggerOnStart:false});
  let timer;try{await Promise.race([attached,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('writer_profile_not_found '+JSON.stringify(seen))),3000))]);}finally{clearTimeout(timer);}
  const workerPost=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('writer_profile_timeout '+method));},15000);pending.set(id,{resolve,reject,timer});post('NodeWorker.sendMessageToWorker',{sessionId:target,message:JSON.stringify({id,method,params})}).catch(error=>{clearTimeout(timer);pending.delete(id);reject(error);});});
  await workerPost('HeapProfiler.enable');await workerPost('HeapProfiler.startSampling',{samplingInterval:32768,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true});
  await workerPost('Profiler.enable');await workerPost('Profiler.start');
  return {close,async stop(){try{const allocation=await workerPost('HeapProfiler.stopSampling'),cpu=await workerPost('Profiler.stop');fs.writeFileSync(out.replace('.json','.writer.heapprofile'),JSON.stringify(allocation.profile));fs.writeFileSync(out.replace('.json','.writer.cpuprofile'),JSON.stringify(cpu.profile));return {worker:seen.find(w=>w.url.endsWith('/reward-worker-entry-r533.mjs')),diagnosticOnly:true};}finally{close();}}};
 }catch(error){close();throw error;}
}
