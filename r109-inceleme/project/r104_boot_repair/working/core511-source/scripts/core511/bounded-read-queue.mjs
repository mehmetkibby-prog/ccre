import {demand,kernelError} from './contract.mjs';

// Trusted cold reads only. Keep a small number of messages in the SQLite
// worker and a finite FIFO outside it; never expand the worker's hard limit.
export class BoundedReadQueue {
 constructor({concurrency=8,maxQueued=128,waitMs=5000}={}){
  demand(Number.isSafeInteger(concurrency)&&concurrency>0&&Number.isSafeInteger(maxQueued)&&maxQueued>=0&&Number.isFinite(waitMs)&&waitMs>0,'read_queue_configuration');
  Object.assign(this,{concurrency,maxQueued,waitMs});this.active=0;this.waiting=[];this.closed=false;
 }
 run(operation){
  if(this.closed)return Promise.reject(kernelError('read_worker_closed'));
  if(this.active>=this.concurrency&&this.waiting.length>=this.maxQueued)return Promise.reject(kernelError('read_worker_backpressure'));
  return new Promise((resolve,reject)=>{
   const task={operation,resolve,reject,timer:null};
   if(this.active<this.concurrency)this.start(task);
   else{task.timer=setTimeout(()=>{const index=this.waiting.indexOf(task);if(index<0)return;this.waiting.splice(index,1);reject(kernelError('read_worker_queue_timeout'));},this.waitMs);this.waiting.push(task);}
  });
 }
 start(task){
  clearTimeout(task.timer);this.active++;
  Promise.resolve().then(task.operation).then(task.resolve,task.reject).finally(()=>{this.active--;const next=this.waiting.shift();if(next)this.start(next);});
 }
 close(){this.closed=true;for(const task of this.waiting.splice(0)){clearTimeout(task.timer);task.reject(kernelError('read_worker_closed'));}}
}
