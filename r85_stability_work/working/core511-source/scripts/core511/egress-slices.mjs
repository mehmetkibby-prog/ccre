import {egressPacingR531} from './r531-options.mjs';
import {demand} from './contract.mjs';
// Simulation and serialization are finished before enqueue. Only immutable
// wire strings cross a yield: no HP/RNG/owner state can change mid-logical-tick.
// FIFO for every frame/event; reconnects never inherit another socket's queue.
export class EgressSlices {
 constructor({clock=()=>performance.now(),schedule=setImmediate,budgetMs=3,pacing=egressPacingR531}={}){Object.assign(this,{clock,schedule,budgetMs,pacing});this.queue=[];this.bytes=new Map();this.counts=new Map();this.scheduled=false;this.closed=false;this.waiters=[];}
 push(socket,text,perform=()=>socket.send(text)){
  demand(typeof text==='string','egress_requires_serialized_frame');
  const bytes=Buffer.byteLength(text),queued=this.bytes.get(socket)??0;
  if(this.closed||socket.readyState!==1)return null;
  if(this.pacing?(socket.bufferedAmount+queued+bytes>2*1048576||(this.counts.get(socket)??0)>=128):(socket.bufferedAmount+queued>1048576||this.queue.length>=1024)){socket.close(1013,'Slow connection');return null;}
  let resolve,reject;const done=new Promise((yes,no)=>{resolve=yes;reject=no;});this.queue.push({socket,bytes,text,perform,resolve,reject});this.bytes.set(socket,queued+bytes);this.counts.set(socket,(this.counts.get(socket)??0)+1);this.scheduleTurn();return done;
 }
 scheduleTurn(){if(this.scheduled)return;this.scheduled=true;this.schedule(()=>this.turn());}
 turn(){
  this.scheduled=false;const started=this.clock();let count=0;
  while(this.queue.length){const job=this.queue.shift(),left=this.bytes.get(job.socket)-job.bytes;if(left)this.bytes.set(job.socket,left);else this.bytes.delete(job.socket);const countLeft=this.counts.get(job.socket)-1;if(countLeft)this.counts.set(job.socket,countLeft);else this.counts.delete(job.socket);
   try{if(job.socket.readyState!==1)job.resolve(false);else if(job.socket.bufferedAmount>(this.pacing?2*1048576:1048576)){job.socket.close(1013,'Slow connection');job.resolve(false);}else{job.perform();job.resolve(true);}}catch(error){job.reject(error);}
   // A count bound also guarantees a yield on a coarse clock or very fast sends.
   if(++count>=8||this.clock()-started>=this.budgetMs)break;
  }
  if(this.queue.length)this.scheduleTurn();else for(const resolve of this.waiters.splice(0))resolve();
 }
 idle(){return this.queue.length?new Promise(resolve=>this.waiters.push(resolve)):Promise.resolve();}
 close(){this.closed=true;for(const job of this.queue.splice(0))job.resolve(false);this.bytes.clear();this.counts.clear();for(const resolve of this.waiters.splice(0))resolve();}
}
