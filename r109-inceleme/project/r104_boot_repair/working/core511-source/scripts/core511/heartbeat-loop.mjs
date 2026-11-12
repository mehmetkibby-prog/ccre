import {randomUUID} from 'node:crypto';
import {HeartbeatMemory} from './heartbeat-memory.mjs';
import {heartbeatRestFrame} from './heartbeat-writer.mjs';
import {OperationRandom} from './operation-random.mjs';
import {DEFER_INPUT} from './fixed-loop.mjs';
import {demand} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {createFaultReporter} from './fence-diagnostics.mjs';
const reportScheduleFault=createFaultReporter(text=>process.stderr.write(text));
const deferredScheduleErrors=new Set(['heartbeat_schedule_fenced','heartbeat_schedule_capacity','heartbeat_world_required','ipc_backpressure']);
const heartbeatRow=p=>Object.fromEntries(['hp','max_hp','hp_revision','respawn_at_ms','area','channel','arena_match_id'].map(k=>[k,p[k]]));

export class HeartbeatLoop {
 constructor(channel,{schedule,onFatal}){
  demand(typeof schedule==='function'&&typeof onFatal==='function','heartbeat_scheduler_required');Object.assign(this,{channel,schedule,onFatal});this.incarnation=randomUUID();this.serial=0;this.pending=new Set();
  const c=channel;this.memory=new HeartbeatMemory({view:c.view,globals:c.globals,frameFor:(...args)=>c.frames.retaliation(...args),settings:()=>c.settings,gearDue:id=>c.frames.entry(id).heartbeatState.gearDue,queue:id=>c.frames.entry(id).heartbeatState.queue,blocked:key=>!(key.startsWith('player:')?c.sharedCombat?.ownsPlayer(key.slice(7)):c.sharedCombat?.ownsMonster(key.slice(8)))&&c.lanes.busy([key]),cycle:()=>c.world.cycle});
 }
 maintenance(id,nowMs,counter){
  const c=this.channel,owner=c.owners.get(id),request={actor:id,epoch:owner.epoch,cycle:c.world.cycle,nowMs,counter,heartbeat:heartbeatRow(c.view.player(id))};
  // This RPC only queues a background descriptor; it neither commits gameplay
  // nor acknowledges an economic operation. A stale/full queue is retried by
  // the next heartbeat and must not poison an already committed action.
  const task=Promise.resolve().then(()=>this.schedule(request)).catch(error=>{if(actorFaultIsolation&&deferredScheduleErrors.has(error?.code)){reportScheduleFault({actor:id,error});return {queued:false,code:error.code};}this.onFatal(error);throw error;}).finally(()=>this.pending.delete(task));this.pending.add(task);void task.catch(()=>{});return task;
 }
 act({id,now,kernel}){
  const c=this.channel,nearby=c.view.nearby(id,now,true)??[],keys=['player:'+id,...nearby.map(e=>'monster:'+e.monster.id),...c.retaliationMemory.due(id,now).map(e=>'monster:'+e.monster_id)];if(c.lanes.busy(keys))return DEFER_INPUT;
  // Original discoverNearby=true acquires engagements before settling hits.
  // Acquisition is nonterminal; save it before replaying any terminal batch.
  for(const entry of nearby)c.retaliationMemory.arm(entry.player,entry.monster,now);
  const seed=OperationRandom.seed(),rng=new OperationRandom(seed),plan=this.memory.plan(id,now,{random:()=>rng.roll()});if(plan.deferred)return DEFER_INPUT;const counter=++this.serial;
  if(!plan.durable){this.memory.commit(plan);for(const event of plan.events)c.ports.publish(...event);void this.maintenance(id,now,counter);return {type:'action',...plan.result};}
  if(c.sharedCombat?.hasShared(keys))return c.sharedCombat.heartbeat({id,now,kernel},{keys,seed,counter,loop:this});
  const lease=c.lanes.acquire(keys,this.incarnation);demand(lease,'heartbeat_resources');const key='heartbeat:'+this.incarnation+':'+counter;
  kernel.durableGroup([id],async()=>{
   try{
    await c.checkpoints.drain(id);await c.combatCheckpoints.drain();c.lanes.assert(lease);
    const expected={player:c.frames.frame(id),rest:heartbeatRestFrame(c.view.player(id)),settings:c.settings,state:c.frames.entry(id).heartbeatState},ack=await c.writer.submit({actor:id,key,kind:'heartbeat',payload:{nowMs:now,seed,expected,resources:lease.keys}});demand(ack.key===key&&ack.result,'heartbeat_ack');
    c.lanes.assert(lease);await c.applyCommit(ack.result);c.checkpoints.hydrateCommitted(ack.result.player);c.encounters.hydrateCommitted(id,ack.result.engagement);for(const event of ack.result.events)c.ports.publish(...event);c.lanes.release(lease);void this.maintenance(id,now,counter);return ack;
   }catch(error){if(lease.state==='held')c.lanes.reject(lease,error);throw error;}
  },{replyTo:id,emitReceipt:false,ackResult:ack=>({type:'action',...ack.result.result})});return {type:'action'};
 }
 async drain(){await Promise.all([...this.pending]);}
}
