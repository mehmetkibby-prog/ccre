import {controlCoalesceR53} from './r53-options.mjs';
import {demand} from './contract.mjs';
const sessions=new WeakMap();

// One I/O turn, at most25 descriptors/frame. This carries no gameplay commit
// and never alters a security deadline. Each original caller gets its own ACK.
export function createControlBatchR53(request,method){
 let pending=[],scheduled=false;
 const flush=()=>{
  scheduled=false;const jobs=pending.splice(0,25);if(!jobs.length)return;
  if(pending.length){scheduled=true;setImmediate(flush);}
  Promise.resolve().then(()=>request(method,jobs.map(j=>j.value))).then(rows=>{
   demand(Array.isArray(rows)&&rows.length===jobs.length,'control_batch_ack');
   for(let i=0;i<jobs.length;i++){const row=rows[i];if(row?.error)jobs[i].reject(Object.assign(Error(row.error),{code:row.error}));else jobs[i].resolve(row?.value);}
  }).catch(error=>{for(const j of jobs)j.reject(error);});
 };
 return value=>new Promise((resolve,reject)=>{
  if(pending.length>=100){reject(Object.assign(Error('ipc_backpressure'),{code:'ipc_backpressure'}));return;}
  pending.push({value,resolve,reject});if(!scheduled){scheduled=true;setImmediate(flush);}
 });
}
export function deliverSessionR53(control,snapshot){
 if(!controlCoalesceR53)return control.request('session',snapshot);
 let send=sessions.get(control);if(!send){send=createControlBatchR53((...a)=>control.request(...a),'sessions_r53');sessions.set(control,send);}return send(snapshot);
}
export function receiveControlBatchR53(rows,run){
 demand(controlCoalesceR53&&Array.isArray(rows)&&rows.length>0&&rows.length<=25,'control_batch_size');
 return rows.map(row=>{try{return {value:run(row)};}catch(error){return {error:error?.code??'control_batch_rejected'};}});
}
