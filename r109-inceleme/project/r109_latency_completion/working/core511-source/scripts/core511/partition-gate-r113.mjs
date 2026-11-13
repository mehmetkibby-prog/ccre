import {demand} from './contract.mjs';

// Atomic multi-key reservation. Disjoint work can pass a blocked request, but
// never an earlier conflicting request or a pending global transition. A lease
// has no timer: an unknown durable outcome retains ownership until recovery.
export class PartitionGateR113{
 constructor({capacity=16,limit=128,clock=()=>performance.now()}={}){Object.assign(this,{capacity,limit,clock});this.active=new Set();this.queue=[];this.waits=0;this.maxWaitMs=0;}
 conflicts(a,b){return a.global||b.global||a.keys.some(key=>b.keys.includes(key));}
 acquire(keys=[],{global=false}={}){
  demand(Array.isArray(keys)&&keys.every(k=>typeof k==='string')&&this.queue.length+this.active.size<this.limit,'partition_backpressure');
  return new Promise((resolve,reject)=>{const token={keys:[...new Set(keys)].sort(),global,resolve,reject,at:this.clock(),state:'queued'};this.queue.push(token);this.advance();});
 }
 advance(){
  for(let i=0;i<this.queue.length&&this.active.size<this.capacity;){
   const token=this.queue[i];if([...this.active,...this.queue.slice(0,i)].some(t=>this.conflicts(token,t))){i++;continue;}
   this.queue.splice(i,1);this.active.add(token);token.state='held';const wait=this.clock()-token.at;this.waits++;this.maxWaitMs=Math.max(this.maxWaitMs,wait);token.resolve(token);
  }
 }
 release(token){demand(this.active.has(token)&&token.state==='held','partition_lease_fenced');this.active.delete(token);token.state='released';this.advance();}
 recover(error){for(const t of this.queue)t.reject(error);this.queue=[];for(const t of this.active)t.state='fenced';this.active.clear();}
}
