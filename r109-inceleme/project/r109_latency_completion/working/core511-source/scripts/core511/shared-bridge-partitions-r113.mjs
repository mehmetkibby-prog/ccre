import {SharedCombatBridge} from './shared-combat-bridge.mjs';
import {PartitionGateR113} from './partition-gate-r113.mjs';
import {foregroundAttackScopeR112,attackActorsR115} from './reward-actor-scope-r85.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {demand} from './contract.mjs';

export class SharedBridgePartitionsR113{
 constructor(world,options={}){this.world=world;this.core=world.core;this.options=options;this.bridges=new Map();this.gate=new PartitionGateR113();this.actors=new PartitionGateR113();this.ownershipHolds=new Set();this.global=this.bridge(null);}
 bridge(area){
  let b=this.bridges.get(area);if(b)return b;
  if(this.bridges.size>=64)for(const [key,value]of this.bridges)if(key!==null&&!value.busy){this.bridges.delete(key);break;}
  demand(this.bridges.size<64,'shared_partition_limit');b=new SharedCombatBridge(this.world,this.options);this.bridges.set(area,b);b.partitionAreaR113=area;b.ownershipHolds=this.ownershipHolds;
  b.acquirePartitionR113=row=>this.gate.acquire(area===null?[]:['area:'+area],{global:area===null}).then(lease=>{row.partitionGateR113=lease;});
  b.beforeGrantR113=async(row,grant)=>{
   if(area===null)return;
   const sql=this.core.database.sqlite;
   // Read-only relation closure plus the authoritative, unflushed shared
   // contributions. No per-hit checkpoint/receipt/SQL write is introduced.
   const extra=[...grant.snapshot.participants.map(p=>p.player_id),...grant.snapshot.bossParticipants.map(p=>p.player_id)];
   const ids=attackActorsR115(sql,row.source.actor,area,row.source.channel,extra);demand(ids,'shared_partition_actor_bound');
   row.partitionActorsR113=ids;row.partitionActorGateR113=await this.actors.acquire(ids.map(id=>'player:'+id));
  };
  b.releasePartitionR113=row=>{if(row.partitionActorGateR113){this.actors.release(row.partitionActorGateR113);row.partitionActorGateR113=null;}if(row.partitionGateR113){this.gate.release(row.partitionGateR113);row.partitionGateR113=null;}};
  return b;
 }
 values(){return [...this.bridges.values()];}
 get requests(){return new Map(this.values().flatMap(b=>[...b.requests]));}
 get terminal(){return this.values().find(b=>b.terminal)?.terminal??null;}
 get busy(){return this.values().some(b=>b.busy);}
 get refreshTrace(){return this.values().flatMap(b=>b.refreshTrace??[]).sort((a,b)=>a.at-b.at).slice(-2048);}
 get actorWaits(){return this.values().reduce((n,b)=>n+b.actorWaits,0);}
 get actorRejections(){return this.values().reduce((n,b)=>n+b.actorRejections,0);}
 get actorConflicts(){return this.values().flatMap(b=>b.actorConflicts).slice(-256);}
 byId(id){const b=this.values().find(b=>b.requests.has(id));demand(b,'shared_partition_request');return b;}
 byProof(proof){const b=this.values().find(b=>[...b.requests.values()].some(r=>r.proof===proof));demand(b,'shared_partition_proof');return b;}
 heldFor(proof){return this.byProof(proof).terminal;}
 async acquire(peer,payload){
  // A browser cannot select an owner: this input comes through the channel,
  // and the parent derives its map/target from current authoritative SQL.
  let area=null;const input=payload.partitionAttackR113;
  if(input?.action==='attack'){
   const source=this.global.source(peer,payload),scope=foregroundAttackScopeR112(this.core.database.sqlite,input,source.actor,peer.channel);
   if(scope&&!prepareCached477(this.core.database.sqlite,'SELECT 1 FROM monsters WHERE area=? AND channel=0 AND is_boss=1 LIMIT 1').get(scope.area))area=scope.area;
  }
  return this.bridge(area).acquire(peer,payload);
 }
 acquireCold(group){return this.global.acquireCold(group);}
 checkpointCold(row,group){return this.byId(row.id).checkpointCold(row,group);}
 finishCold(row,group){return this.byId(row.id).finishCold(row,group);}
 reserveOwnership(){demand(!this.terminal,'shared_ownership_busy');return this.global.reserveOwnership();}
 async terminalIdle(){while(this.terminal)await Promise.all(this.values().map(b=>b.terminalIdle()));}
 async idle(){while(this.busy)await Promise.all(this.values().map(b=>b.idle()));}
 async writable(peer,request){for(;;){const blocked=this.values().filter(b=>b.blocking(peer,request));if(!blocked.length)return;await Promise.all(blocked.map(b=>b.writable(peer,request)));}}
 guard(peer,request){for(const b of this.values())b.guard(peer,request);return true;}
 allows(...args){return this.values().some(b=>b.allows(...args));}
 stoppedAllows(...args){return this.values().some(b=>b.stoppedAllows(...args));}
 assertWrite(sql,payload,context){return this.byProof(payload.sharedLease).assertWrite(sql,payload,context);}
 assertRefresh(payload,result,context){return this.byProof(payload.sharedLease).assertRefresh(payload,result,context);}
 command(peer,request){return this.byProof(request.payload.sharedLease).command(peer,request);}
 ownsStatus(peer,request){return this.values().some(b=>b.ownsStatus(peer,request));}
 reconcileStatus(peer,request,ack){const b=this.values().find(b=>b.ownsStatus(peer,request));demand(b,'shared_command_status_fenced');return b.reconcileStatus(peer,request,ack);}
 rejectedStatus(...args){for(const b of this.values()){const result=b.rejectedStatus(...args);if(result)return result;}return null;}
 entry(peer,payload){return this.byId(payload.id).entry(peer,payload);}
 prepare(peer,payload){return this.byId(payload.id).prepare(peer,payload);}
 finish(peer,payload){return this.byId(payload.id).finish(peer,payload);}
 complete(peer,payload){return this.byId(payload.id).complete(peer,payload);}
 cancel(peer,payload){return this.byId(payload.id).cancel(peer,payload);}
 returnReady(peer,payload){return this.byId(payload.id).returnReady(peer,payload);}
 stopUnknownTimers(){for(const b of this.values())b.stopUnknownTimers();}
 abort(error){for(const b of this.values())b.abort(error);}
 fail(error,...args){this.abort(error);return this.global.fail(error,...args);}
 recovered(){for(const b of this.values())b.recovered();this.gate.recover(Error('shared_owner_recovered'));this.actors.recover(Error('shared_owner_recovered'));}
}
