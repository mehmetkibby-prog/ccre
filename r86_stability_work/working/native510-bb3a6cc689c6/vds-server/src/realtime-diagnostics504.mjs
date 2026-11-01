import {randomUUID} from 'node:crypto';
import {realtimeCrypto,postLoopback} from './realtime-transport.mjs';
import {feature504} from './features504.mjs';
export const REALTIME_DIAGNOSTICS_PATH504='/internal/diagnostics504';
const n=(v,max=1e15)=>Number.isFinite(v)&&v>=0&&v<=max?v:null;
const name=v=>typeof v==='string'&&/^[a-z][a-zA-Z0-9_:. -]{0,95}$/.test(v)?v:null;
const event=r=>r&&name(r.name)&&n(r.startedAtMs)!==null&&n(r.durationMs)!==null?{name:r.name,kind:r.kind==='gc'?'gc':'job',startedAtMs:r.startedAtMs,durationMs:r.durationMs}:null;
const total=r=>r&&name(r.name)&&n(r.count)!==null&&n(r.totalMs)!==null&&n(r.maxMs)!==null?{name:r.name,count:r.count,totalMs:r.totalMs,maxMs:r.maxMs}:null;
export function publicSlowWork504(value){
 if(!value||value.enabled!==true||n(value.measuredAtMs)===null)return null;
 return {enabled:true,measuredAtMs:value.measuredAtMs,windowSeconds:900,thresholdMs:50,
  top:(Array.isArray(value.top)?value.top:[]).slice(0,10).map(event).filter(Boolean),
  busyWindows:(Array.isArray(value.busyWindows)?value.busyWindows:[]).slice(-8).filter(r=>r&&n(r.startedAtMs)!==null&&n(r.endedAtMs)!==null&&n(r.loopUtilization,1)!==null).map(r=>({startedAtMs:r.startedAtMs,endedAtMs:r.endedAtMs,loopUtilization:r.loopUtilization,top:(Array.isArray(r.top)?r.top:[]).slice(0,5).map(total).filter(Boolean),gc:{count:n(r.gc?.count)??0,totalMs:n(r.gc?.totalMs)??0,maxMs:n(r.gc?.maxMs)??0}})),
  gc:{count:n(value.gc?.count)??0,totalMs:n(value.gc?.totalMs)??0,maxMs:n(value.gc?.maxMs)??0,recent:(Array.isArray(value.gc?.recent)?value.gc.recent:[]).slice(-10).map(event).filter(Boolean)},
  retainedEvents:n(value.retainedEvents)??0,droppedEvents:n(value.droppedEvents)??0,droppedGc:n(value.droppedGc)??0};
}
export function publicProcess504(value){
 if(!value||n(value.measuredAtMs)===null||n(value.current?.sampledAtMs)===null||n(value.current.loopUtilization,1)===null||n(value.current.loopExcessMs)===null)return null;
 return {measuredAtMs:value.measuredAtMs,current:{sampledAtMs:value.current.sampledAtMs,loopUtilization:n(value.current.loopUtilization,1),loopExcessMs:n(value.current.loopExcessMs)},memoryMb:{rss:n(value.memoryMb?.rss)},slowWork504:publicSlowWork504(value.slowWork504)};
}
export function createRealtimeDiagnostics504({post=postLoopback,crypto=realtimeCrypto,now=Date.now,origin=()=>process.env.REALTIME_HTTP_ORIGIN||'http://127.0.0.1:3001',enabled=()=>feature504('slowWork')}={}){
 let inflight=null,lastAttempt=-Infinity,cached=null;
 return {snapshot:()=>cached,sample(){
  const at=now();if(!enabled()||inflight||at-lastAttempt<2000)return inflight;lastAttempt=at;
  inflight=Promise.resolve().then(async()=>{try{
   const body='{}',timestamp=String(Math.floor(at/1000)),nonce=randomUUID(),key='coreoflife-p256-2026-09';
   const headers={'x-col-key-id':key,'x-col-timestamp':timestamp,'x-col-nonce':nonce,'x-col-signature':crypto.sign(`COL-REQUEST-V1\n${key}\n${timestamp}\n${nonce}\nPOST\n${REALTIME_DIAGNOSTICS_PATH504}\n${crypto.digest(body)}`)};
   const response=await post(origin(),REALTIME_DIAGNOSTICS_PATH504,headers,body,1500);if(!response?.ok)return;
   const result=await response.json();if(result?.ok!==true)return;const value=publicProcess504(result.process);if(value)cached=value;
  }catch{/* Telemetry failure never affects gameplay, admission or service health. */}
  }).finally(()=>{inflight=null;});return inflight;
 }};
}
