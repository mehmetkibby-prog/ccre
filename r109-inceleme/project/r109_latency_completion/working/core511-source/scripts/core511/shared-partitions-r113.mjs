import {SharedCombatOwner} from './shared-combat-owner.mjs';
import {PartitionGateR113} from './partition-gate-r113.mjs';
import {demand} from './contract.mjs';

// Bounded logical map owners inside the existing world process. The original
// signed native authority remains the FIFO for each scope. Global lifecycle
// operations exclusively join all map owners; no extra OS process per map.
export class SharedPartitionsR113{
 constructor(runtime){this.runtime=runtime;this.gate=new PartitionGateR113();this.owners=new Map();this.proofs=new Map();this.requests=new Map();this.closed=false;this.global=this.owner(null);}
 owner(area){let owner=this.owners.get(area);if(owner)return owner;
  if(this.owners.size>=64)for(const [key,value]of this.owners)if(key!==null&&!value.busy&&!value.authority.requests.size){value.close();this.owners.delete(key);break;}
  demand(this.owners.size<64,'shared_partition_limit');owner=new SharedCombatOwner(this.runtime,{area});this.owners.set(area,owner);return owner;
 }
 get busy(){return this.gate.active.size>0||this.gate.queue.length>0;}
 get globalBusy(){return [...this.gate.active].some(t=>t.global);}
 snapshot(){return this.global.snapshot();}
 acquire(peer,id,area=null){
  demand(!this.closed&&(area===null||typeof area==='string'&&area.length<=128),'shared_partition_scope');const key=peer.channel+':'+peer.incarnation+':'+id;
  if(this.requests.has(key))return this.requests.get(key);
  const work=(async()=>{
   const lease=await this.gate.acquire(area===null?[]:['area:'+area],{global:area===null}),owner=this.owner(area);
   try{const grant=await owner.acquire(peer,id);this.proofs.set(grant.proof,{owner,lease,key});return grant;}
   catch(error){if(!owner.lease)this.gate.release(lease);else this.runtime.fail(error);this.requests.delete(key);throw error;}
  })();this.requests.set(key,work);return work;
 }
 entry(proof){const row=this.proofs.get(proof);demand(row,'shared_partition_proof');return row;}
 async finish(peer,payload){const r=this.entry(payload.proof),ack=await r.owner.finish(peer,payload);this.proofs.delete(payload.proof);this.requests.delete(r.key);this.gate.release(r.lease);return ack;}
 checkpoint(peer,payload){return this.entry(payload.proof).owner.checkpoint(peer,payload);}
 reload(peer,payload){return this.entry(payload.proof).owner.reload(peer,payload);}
 async idle(){while(this.busy)await Promise.all([...this.owners.values()].filter(o=>o.busy).map(o=>o.idle()).concat(new Promise(r=>setImmediate(r))));}
 close(){this.closed=true;for(const o of this.owners.values())o.close();this.gate.recover(Error('shared_partitions_closed'));}
}
