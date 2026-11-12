import {demand} from './contract.mjs';
import {actorRejection} from './actor-rejection.mjs';

// Trusted simulation/storage ownership, distinct from a client's input sequence.
// A lease never expires while a COMMIT outcome is unknown. Reconciliation must
// explicitly retire the old incarnation before another owner can mutate it.
export class ResourceLanes {
 constructor(){this.held=new Map();this.readers=new Map();this.tokens=new Set();this.serial=0;this.waiters=new Set();}
 acquire(keys,owner,{readMonsters=false,worldTransition=false}={}){
  demand(Array.isArray(keys)&&keys.length>0&&(keys.length<=2048||(worldTransition===true&&keys[0]==='global:world'&&keys.length<=32768))&&typeof owner==='string'&&owner.length>0,'invalid_resource_lease');
  const ordered=[...new Set(keys)].sort();demand(ordered.every(k=>typeof k==='string'&&k.length>0&&k.length<=240),'invalid_resource_key');
  const readKeys=new Set(readMonsters?ordered.filter(k=>k.startsWith('monster:')):[]);
  if(ordered.some(k=>this.held.has(k)||this.readers.has(k)&&(!readKeys.has(k)||[...this.readers.get(k)].some(l=>l.state!=='held'))))return null;
  const lease={id:++this.serial,owner,keys:Object.freeze(ordered),readKeys:Object.freeze([...readKeys]),state:'held'};
  this.tokens.add(lease);for(const key of ordered)if(readKeys.has(key)){let readers=this.readers.get(key);if(!readers)this.readers.set(key,readers=new Set());readers.add(lease);}else this.held.set(key,lease);return lease;
 }
 owns(lease,key){return lease.readKeys.includes(key)?this.readers.get(key)?.has(lease):this.held.get(key)===lease;}
 remove(lease){for(const key of lease.keys)if(lease.readKeys.includes(key)){const readers=this.readers.get(key);readers.delete(lease);if(!readers.size)this.readers.delete(key);}else this.held.delete(key);}
 assert(lease,keys=lease?.keys){demand(this.tokens.has(lease)&&lease.state==='held'&&keys.every(k=>this.owns(lease,k)),'resource_lease_fenced');return true;}
 release(lease){this.assert(lease);this.remove(lease);lease.state='released';this.tokens.delete(lease);this.wake();}
 fence(lease){this.assert(lease);lease.state='unknown';}
 reject(lease,error){const rejected=actorRejection(error);if(rejected&&lease.keys.includes('player:'+rejected.actor))this.release(lease);else this.fence(lease);}
 reconcile(lease,{owner,committed}){
  demand(this.tokens.has(lease)&&lease.state==='unknown'&&lease.owner===owner&&typeof committed==='boolean','resource_reconciliation_required');
  for(const key of lease.keys)demand(this.owns(lease,key),'resource_lease_changed');this.remove(lease);lease.state=committed?'committed':'aborted';this.tokens.delete(lease);this.wake();
 }
 busy(keys){return keys.some(k=>this.held.has(k)||this.readers.has(k));}
 available(keys){demand(Array.isArray(keys)&&keys.length<=2048,'resource_wait_keys');if(!this.busy(keys))return Promise.resolve();return new Promise(resolve=>this.waiters.add({keys:[...keys],resolve}));}
 wake(){for(const waiter of this.waiters)if(!this.busy(waiter.keys)){this.waiters.delete(waiter);waiter.resolve();}}
}
