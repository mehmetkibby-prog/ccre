import {AsyncLocalStorage} from 'node:async_hooks';
import {demand} from './contract.mjs';

// Only an exact native single-flight refresh awaited by the currently running
// coordinator auth can borrow that cold queue. Background work never inherits
// permission merely because an AsyncLocalStorage parent is still active.
// A previously queued batch can be promoted once; its old queue slot later
// observes the same completed promise and cannot run the mutation again.
export class RealmSecurityQueue {
 #context=new AsyncLocalStorage();
 #active=null;
 #jobs=new WeakMap();
 constructor(core){this.core=core;}
 inCoordinator(operation){
  demand(!this.#active,'realm_security_serial_overlap');const scope={active:true,waiter:null};this.#active=scope;
  return this.#context.run(scope,async()=>{try{return await operation();}finally{scope.active=false;if(scope.waiter)scope.waiter.active=false;if(this.#active===scope)this.#active=null;}});
 }
 authorize(gate,accountId,operation){
  const scope=this.#context.getStore();if(!scope?.active||scope!==this.#active)return operation();
  demand(!scope.waiter,'realm_security_auth_overlap');const waiter={gate,accountId,active:true,token:null,resume:AsyncLocalStorage.snapshot()};scope.waiter=waiter;
  const clear=()=>{waiter.active=false;if(scope.waiter===waiter)scope.waiter=null;};
  try{
   const result=operation();if(!result?.then){clear();return result;}
   waiter.token=gate.pending.get(accountId);demand(waiter.token?.then,'realm_security_pending_missing');const row=this.#jobs.get(waiter.token);if(row)this.promote(row);
   return Promise.resolve(result).finally(clear);
  }catch(error){clear();throw error;}
 }
 promote(row){
  const waiter=this.#active?.waiter;
  if(!waiter?.active||waiter.gate!==row.gate||waiter.accountId!==row.accountId||waiter.token!==row.token)return false;
  waiter.resume(()=>row.start());return true;
 }
 run(gate,accountId,operation){
  const token=gate.pending.get(accountId);demand(token?.then&&!this.#jobs.has(token),'realm_security_job_scope');let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;}),row={gate,accountId,token,promise,started:false,start:()=>{if(!row.started){row.started=true;void Promise.resolve().then(operation).then(resolve,reject);}return promise;}};
  this.#jobs.set(token,row);
  if(!this.promote(row))void this.core.serial(()=>row.start()).catch(error=>{if(!row.started)reject(error);});
  return promise.finally(()=>{if(this.#jobs.get(token)===row)this.#jobs.delete(token);});
 }
}
