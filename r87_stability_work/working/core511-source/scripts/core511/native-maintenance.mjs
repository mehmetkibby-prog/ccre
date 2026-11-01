import {recoveryCause} from './recovery-diagnostics-r532.mjs';
import {attachMaintenanceExpiry438} from '../../../native510-bb3a6cc689c6/vds-server/src/maintenance-expiry438.mjs';
import {demand} from './contract.mjs';

// Original maintenance policy and original expiry SQL. The only expiry port
// change is to drain accepted owner work before executing the native callback.
// Account cookies and durable character/economy state are never deleted here.
export class NativeMaintenance {
 constructor(core,runtime){
  demand(core.realm===runtime&&runtime?.maintenance&&runtime.admission?.database===core.database&&!core.nativeMaintenance&&!runtime.maintenanceFanout438&&!runtime.realtimeMaintenance491,'native_maintenance_binding');
  const ready=core.channelSupervisor?.rows.size===4&&[...core.channelSupervisor.rows.values()].every(r=>r.state==='running');
  Object.assign(this,{core,runtime,closed:false,ready:false,tail:Promise.resolve(),running:new Map()});core.nativeMaintenance=this;
  const self=this,maintenance={get policy(){return self.ready?runtime.maintenance.policy:null;},subscribe(listener){self.expiry=listener;return()=>{self.expiry=null;};}};
  this.stopExpiry=attachMaintenanceExpiry438({maintenance},{atomic:operation=>this.expire(operation)},{now:core.clock,onError:error=>{throw error;}});
  // The caller awaits sync/activate. Do not launch the native constructor's
  // fire-and-forget expiry before its policy fanout has an observed outcome.
  this.ready=Boolean(ready);
  this.fanout=()=>this.sync();runtime.maintenanceFanout438=this.fanout;
  this.stop=runtime.maintenance.subscribe(()=>{void this.sync().catch(error=>{if(!this.closed)core.onFault({error,maintenance:true});});});
 }
 activate(){this.assertBound();this.ready=true;return this.sync();}
 assertBound(){const c=this.core;demand(!this.closed&&!c.closed&&c.nativeMaintenance===this&&c.realm===this.runtime,'native_maintenance_fenced');return c;}
 sync(){
  const c=this.assertBound(),frame=this.runtime.maintenance.policy;if(!frame)return Promise.resolve();
  if(!this.ready)return Promise.resolve({revision:frame.revision,pending:true});
  const key=frame.revision+':'+(frame.phase==='maintenance'&&frame.deadlineMs<=c.clock());if(this.running.has(key))return this.running.get(key);
  const work=this.tail.then(async()=>{
   this.assertBound();const current=this.runtime.maintenance.policy;
   const rows=[...c.processes.values()].filter(r=>r.online);
   await Promise.all(rows.map(async row=>{
    try{const ack=await row.control.request('maintenance',current);c.process(row.peer);demand(ack?.revision>=current.revision,'maintenance_channel_ack');}
    catch(error){
     // A channel that cannot acknowledge an authoritative policy is fenced
     // through the existing actual-exit/recovery path; its cold boot carries
     // the current policy before any session can be admitted again.
     if(row.online&&c.processes.get(row.peer.channel)===row){
      const child=c.channelSupervisor?.rows.get(row.peer.channel);
      if(child?.peer.incarnation===row.peer.incarnation)await c.channelSupervisor.terminate(child,{cause:recoveryCause(c,{error,channel:row.peer.channel,requestMethod:'maintenance'},'native-maintenance')});
      c.onFault({error,channel:row.peer.channel,incarnation:row.peer.incarnation,maintenance:true});
     }throw error;
    }
   }));
   await this.expiry?.(this.runtime.maintenance.policy);return {revision:this.runtime.maintenance.policy.revision};
  });
  this.tail=work.catch(()=>{});this.running.set(key,work);void work.finally(()=>{if(this.running.get(key)===work)this.running.delete(key);}).catch(()=>{});return work;
 }
 expire(operation){
  const c=this.assertBound();demand(typeof operation==='function','native_maintenance_expiry');
  return c.serial(async()=>{
   if(this.closed)return false;
   // The native callback rechecks the exact revision/deadline in its COMMIT.
   // Each logout rechecks permission after drain as well, so reopening during
   // a pending input retains that same owner instead of retiring it needlessly.
   for(const [id,s]of [...c.sessions])if(!this.runtime.maintenance.allows(s.identity.account)){
    await c.logoutActor(id,s.identity.session,{prepare:()=>!this.closed&&!this.runtime.maintenance.allows(s.identity.account)});
   }
   if(this.closed)return false;return c.database.atomic(operation);
  });
 }
 close(){if(this.closed)return;this.closed=true;this.stop();this.stopExpiry();if(this.runtime.maintenanceFanout438===this.fanout)delete this.runtime.maintenanceFanout438;if(this.core.nativeMaintenance===this)delete this.core.nativeMaintenance;}
}
