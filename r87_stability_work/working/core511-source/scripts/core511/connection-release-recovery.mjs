import {demand,kernelError} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {consumeTransportNotSent} from './transport-not-sent.mjs';
import {createFaultReporter} from './fence-diagnostics.mjs';
const report=createFaultReporter(text=>process.stderr.write(text));
const delays=[2000,5000,10000,30000];

// Active quota leases have no expiry. Keep a failed pre-send release until
// its exact lease/incarnation is acknowledged, instead of leaking quota or
// making one socket's close fatal. Unknown sent outcomes remain strict.
// Poll from the existing runtime timer; no independent retry timer is added.
export class ConnectionReleaseRecovery {
 constructor({request,incarnation,clock=Date.now,limit=8192}={}){demand(typeof request==='function'&&typeof incarnation==='string'&&incarnation.length>0&&Number.isSafeInteger(limit)&&limit>=1024,'connection_release_recovery_scope');Object.assign(this,{request,incarnation,clock,limit});this.entries=new Map();this.closed=false;}
 canReserve(){return !actorFaultIsolation||!this.closed&&this.entries.size<this.limit-512;}
 release(lease,boot){
  demand(boot===this.incarnation,'budget_process_fenced');
  if(!actorFaultIsolation)return this.request('connection_release',{lease});
  if(this.closed)return Promise.reject(kernelError('channel_stopping'));
  demand(typeof lease==='string'&&lease.length>0&&lease.length<=160,'invalid_connection_lease');
  const queued=this.entries.get(lease);if(queued)return queued.promise;
  const payload={lease};let result;try{result=this.request('connection_release',payload);}catch(error){return this.defer(lease,payload,error);}
  return Promise.resolve(result).catch(error=>this.defer(lease,payload,error));
 }
 defer(lease,payload,error){
  if(error?.code!=='ipc_backpressure'||!consumeTransportNotSent(error,'connection_release',payload)||this.closed)return Promise.reject(error);
  const prior=this.entries.get(lease);if(prior)return prior.promise;
  // The parent admits <=5000 leases and the reserve gate leaves room for
  // every already-in-flight authentication (<=500). Reaching this bound is
  // an internal accounting violation, not a reason to forget a lease.
  demand(this.entries.size<this.limit,'connection_release_capacity');
  let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const row={lease,payload,promise,resolve,reject,pending:false,attempt:0,next:this.clock()+delays[0]};this.entries.set(lease,row);report({error});return promise;
 }
 poll(){
  if(this.closed||!this.entries.size)return;let budget=8;const now=this.clock();
  for(const row of this.entries.values()){
   if(!budget||row.pending||now<row.next)continue;budget--;row.pending=true;
   void Promise.resolve().then(()=>this.request('connection_release',row.payload)).then(value=>{
    if(this.entries.get(row.lease)!==row)return;this.entries.delete(row.lease);row.resolve(value);
   },error=>{
    if(this.entries.get(row.lease)!==row)return;
    if(error?.code==='ipc_backpressure'&&consumeTransportNotSent(error,'connection_release',row.payload))return;
    this.entries.delete(row.lease);row.reject(error);
   }).finally(()=>{row.pending=false;row.attempt++;row.next=this.clock()+delays[Math.min(row.attempt,delays.length-1)];});
  }
 }
 close(){this.closed=true;for(const row of this.entries.values())row.reject(kernelError('channel_stopping'));this.entries.clear();}
}
