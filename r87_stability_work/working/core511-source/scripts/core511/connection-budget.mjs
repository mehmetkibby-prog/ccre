import {randomUUID} from 'node:crypto';
import {demand} from './contract.mjs';
// The same expressions as V510 realtime-server/src/server.mjs. This budget
// belongs to the coordinator and is shared across ALL four channel processes.
export function connectionLimits(env=process.env){return Object.freeze({
 total:Math.max(50,Math.min(5000,Number(env.MAX_CONNECTIONS)||1000)),
 pending:Math.max(10,Math.min(500,Number(env.MAX_PENDING_AUTH)||128)),
 perIp:Math.max(4,Math.min(100,Number(env.MAX_CONNECTIONS_PER_IP)||32)),
 pendingPerIp:Math.max(2,Math.min(30,Number(env.MAX_PENDING_AUTH_PER_IP)||8))
});}
export class ConnectionBudget {
 constructor({limits=connectionLimits(),now=Date.now}={}){this.limits=limits;this.now=now;this.leases=new Map();this.ips=new Map();this.pending=0;}
 reserve(ip,boot){
  demand(typeof ip==='string'&&ip.length>0&&ip.length<=64&&typeof boot==='string'&&boot.length<=80,'invalid_connection_identity');
  this.expirePending();const counts=this.ips.get(ip)??{total:0,pending:0},limit=this.limits;
  demand(this.leases.size<limit.total&&this.pending<limit.pending&&counts.total<limit.perIp&&counts.pending<limit.pendingPerIp,'connection_budget_exceeded');
  const id=randomUUID();this.leases.set(id,{ip,boot,active:false,expires:this.now()+4000});counts.total++;counts.pending++;this.ips.set(ip,counts);this.pending++;return id;
 }
 activate(id,boot){const lease=this.leases.get(id);demand(lease&&lease.boot===boot&&lease.expires>this.now(),'connection_lease_expired');if(!lease.active){lease.active=true;this.pending--;this.ips.get(lease.ip).pending--;}return true;}
 release(id,boot){const lease=this.leases.get(id);if(!lease)return;demand(lease.boot===boot,'connection_lease_owner');this.leases.delete(id);const counts=this.ips.get(lease.ip);counts.total--;if(!lease.active){counts.pending--;this.pending--;}if(!counts.total)this.ips.delete(lease.ip);}
 releaseProcess(boot){for(const [id,lease]of this.leases)if(lease.boot===boot)this.release(id,boot);}
 expirePending(){const now=this.now();for(const [id,lease]of this.leases)if(!lease.active&&lease.expires<=now)this.release(id,lease.boot);}
}
