import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export async function createControlProbe(){
 const child=fork(fileURLToPath(new URL('./control-probe-entry.mjs',import.meta.url)),[],{execArgv:['--max-old-space-size=32','--max-semi-space-size=1','--v8-pool-size=1','--no-parallel-scavenge'],stdio:['ignore','ignore','ignore','ipc']});
 let sequence=0,ended=false,readyResolve,readyReject;const pending=new Map(),ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;}),exit=new Promise(resolve=>child.once('exit',resolve));
 const fail=error=>{readyReject(error);for(const row of pending.values()){clearTimeout(row.timer);row.reject(error);}pending.clear();};
 child.once('error',fail);child.once('exit',()=>{ended=true;fail(Error('control_probe_exited'));});
 child.on('message',message=>{if(message?.type==='control-probe-ready'){readyResolve(message);return;}if(message?.type!=='control-probe-reply')return;const row=pending.get(message.id);if(!row)return;pending.delete(message.id);clearTimeout(row.timer);message.ok?row.resolve(message.value):row.reject(Error(message.error));});
 const timeout=setTimeout(()=>{fail(Error('control_probe_start_timeout'));child.kill('SIGKILL');},10000);let identity;try{identity=await ready;}finally{clearTimeout(timeout);}
 return {pid:child.pid,identity,
  request(operation,runId){return new Promise((resolve,reject)=>{if(ended||!child.connected){reject(Error('control_probe_exited'));return;}const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('control_probe_timeout'));},10000);pending.set(id,{resolve,reject,timer});child.send({type:'control-probe',id,operation,runId},error=>{if(error){const row=pending.get(id);if(row){pending.delete(id);clearTimeout(row.timer);row.reject(error);}}});});},
  async close(){if(ended)return;if(child.connected)child.disconnect();const timer=setTimeout(()=>child.kill('SIGKILL'),2000);try{await exit;}finally{clearTimeout(timer);}}
 };
}
export function controlComparison(eventLoops,control){
 const overlaps=(a,b)=>Math.max(a.startedAtMs,b.startedAtMs)<Math.min(a.endedAtMs,b.endedAtMs);
 return {scope:'same inherited CPU affinity; overlapping raw timer gaps only; no pause excluded',causality:'Coincidence is evidence of a shared scheduling effect, not proof that game CPU/GC contention is absent.',channels:eventLoops.filter(r=>r.target.startsWith('channel-')).map(row=>{const gaps=(row.slowGaps??[]).filter(g=>g.ms>50),worst=gaps[0];return {target:row.target,maxPauseMs:row.maxPauseMs,retainedOver50Gaps:gaps.length,coincidentRetainedGaps:gaps.filter(g=>control.gapsOver50.some(p=>overlaps(g,p))).length,worstTimerGap:worst??null,controlOverlapsWorst:worst?control.gapsOver50.filter(p=>overlaps(worst,p)):[]};})};
}
