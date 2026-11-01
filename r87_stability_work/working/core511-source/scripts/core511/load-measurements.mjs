import {randomUUID} from 'node:crypto';
import {demand} from './contract.mjs';
import {LoadWindow} from './load-window.mjs';
import {LOAD_TARGETS} from './load-contract.mjs';
import {measuredResources} from './runtime-acceptance.mjs';

// Main-only measurement coordinator. A timeout or changed incarnation
// invalidates this read-only report; it never recovers or restarts game owners.
export class LoadMeasurements {
 constructor(core){this.core=core;this.main=new LoadWindow({target:'main',incarnation:randomUUID()});this.active=null;}
 select(){
  const c=this.core,reader=c.reader,slot=reader?.slot;demand(slot&&!slot.failed&&!slot.ended&&!reader.closed&&typeof reader.measure==='function','load_reader_unavailable');
  const rows=[{target:'main',identity:this.main.identity,current:()=>true,call:p=>this.main.command(p)}];
  for(const channel of [0,1,2,3,4]){const row=channel===0?c.sharedWorld?.row:c.processes.get(channel),current=()=>channel===0?c.sharedWorld?.row===row&&row?.state==='running'&&!row.exited:c.processes.get(channel)===row&&row?.online===true;demand(current(),'load_process_unavailable');rows.push({target:channel===0?'world':'channel-'+channel,incarnation:row.peer.incarnation,current,call:p=>row.control.request('load_measure',p,{timeoutMs:5000})});}
  rows.push({target:'reader',incarnation:slot.incarnation,current:()=>reader.slot===slot&&!slot.failed&&!slot.ended&&!reader.closed,call:p=>reader.measure(p,{slot})});return rows;
 }
 check(row,value,runId){demand(row.current()&&value?.target===row.target&&value.runId===runId&&value.incarnation===(row.identity?.incarnation??row.incarnation),'load_process_changed');if(row.begin)demand(value.pid===row.begin.pid&&value.threadId===row.begin.threadId,'load_execution_changed');return value;}
 async begin(runId){
  demand(!this.active,'load_measurement_busy');const h={runId,rows:this.select(),phase:'starting'};this.active=h;
  try{const replies=await Promise.allSettled(h.rows.map(async row=>{const value=await row.call({operation:'begin',runId});demand(value?.started,'load_begin_ack');row.begin=this.check(row,value,runId);}));const failed=replies.find(r=>r.status==='rejected');if(failed)throw failed.reason;h.phase='running';return {runId,targets:[...LOAD_TARGETS]};}
  catch(error){await this.cancel(h);throw error;}
 }
 async end(runId){
  const h=this.active;demand(h?.runId===runId&&h.phase==='running','load_measurement_fenced');h.phase='ending';
  try{const replies=await Promise.allSettled(h.rows.map(async row=>{demand(row.current(),'load_process_changed');return this.check(row,await row.call({operation:'end',runId}),runId);}));const failed=replies.find(r=>r.status==='rejected');if(failed){
   // Retain successful original-incarnation rows for diagnosis, never as an
   // accepted complete window or a resource total with missing processes.
   failed.reason.partialMeasurement={runId,complete:false,eventLoops:replies.flatMap(r=>r.status==='fulfilled'?[r.value]:[]),failures:replies.flatMap((r,i)=>r.status==='rejected'?[{target:h.rows[i].target,code:r.reason?.code??r.reason?.message}]:[])};throw failed.reason;
  }const eventLoops=replies.map(r=>r.value);demand(eventLoops.every(r=>r.complete),'load_end_ack');this.active=null;return {measurement:{runId,eventLoops},resources:measuredResources(eventLoops)};}
  catch(error){await this.cancel(h);throw error;}
 }
 async cancel(h=this.active){if(!h)return;await Promise.allSettled(h.rows.filter(row=>row.current()).map(row=>row.call({operation:'cancel',runId:h.runId})));if(this.active===h)this.active=null;}
 close(){this.main.close();this.active=null;}
}
