import {DEFER_INPUT} from './fixed-loop.mjs';
import {demand} from './contract.mjs';

// The game router calls this adapter only for canonical dungeon commands.
// Open-world commands continue to require their own (not yet completed) rules.
export class DungeonLoop {
 constructor(resident){this.resident=resident;}
 actors(id,input){const run=this.resident.runFor(id);return run?run.members.filter(p=>!p.left).map(p=>p.id):this.resident.actorsFor(id,input);}
 ready(ids,kernel){return ids.every(id=>{const p=kernel.players.get(id);return p&&!p.suspended&&kernel.state.owners.get(id)?.state==='active'&&!p.barrier&&!this.resident.pending.has(id);});}
 handle({id,input,now,kernel}){
  const ids=this.actors(id,input);if(!this.ready(ids,kernel))return DEFER_INPUT;
  const step=this.resident.step(id,{kind:'command',input},{now});
  if(!step.durable)return step.result;
  kernel.durableGroup(step.event.payload.actors,()=>step.completion,{replyTo:id,ackResult:value=>value,emitReceipt:false});
  return {pending:true};
 }
 tick({now,kernel}){
  for(const [runId,entry]of this.resident.runs){
   const active=entry.run.members.filter(p=>!p.left).map(p=>p.id),ids=active.length?active:[entry.run.leaderId];
   if(!this.ready(ids,kernel))continue;
   const elapsed=Math.min(.2,Math.max(0,(now-(entry.lastTick??this.resident.lastTick))/1000));
   const step=this.resident.step(ids[0],{kind:'tick',runId,elapsed},{now});
   if(step.durable)kernel.durableGroup(step.event.payload.actors,()=>step.completion,{emitReceipt:false});
  }
 }
 async checkpoint(id,kernel,{now=Date.now()}={}){
  const run=this.resident.runFor(id);if(!run)return;
  const ids=run.members.filter(p=>!p.left).map(p=>p.id);demand(this.ready(ids,kernel),'dungeon_room_pending');
  const step=this.resident.step(id,{kind:'checkpoint',runId:run.id},{now});
  demand(step.durable,'dungeon_checkpoint_not_durable');
  return kernel.durableGroup(ids,()=>step.completion,{emitReceipt:false});
 }
}
