import {randomUUID} from 'node:crypto';
import {OperationRandom} from './operation-random.mjs';
import {DEFER_INPUT} from './fixed-loop.mjs';
import {demand} from './contract.mjs';

export class MovementLoop {
 constructor({memory,lanes,checkpoints,combatCheckpoints,submit,contextFor,frameFor,committed,publish}){
  for(const fn of [submit,contextFor,frameFor,committed,publish])demand(typeof fn==='function','movement_loop_dependencies');Object.assign(this,{memory,lanes,checkpoints,combatCheckpoints,submit,contextFor,frameFor,committed,publish});this.incarnation=randomUUID();this.serial=0;
 }
 move({id,input,now,receivedAtMs=now,kernel}){
  if(this.lanes.busy(['player:'+id]))return DEFER_INPUT;
  const context=this.contextFor(id,input,now),seed=OperationRandom.seed(),rng=new OperationRandom(seed);
  demand(context.auth.player.id===id,'movement_context_actor');
  const result=this.memory.step({...context,payload:input,nowMs:receivedAtMs,random:()=>rng.roll()});if(result.deferred)return DEFER_INPUT;
  if(!result.durable){for(const event of result.events)this.publish(...event);return {type:'action',...result.result};}
  if(this.shared?.hasShared(['monster:'+result.monsterId]))return this.shared.movement({id,input,now,receivedAtMs,kernel},{keys:['player:'+id,'monster:'+result.monsterId],seed,scope:context.scope,auth:context.auth});
  const lease=this.lanes.acquire(['player:'+id,'monster:'+result.monsterId],this.incarnation);if(!lease)return DEFER_INPUT;
  const key='movement:'+this.incarnation+':'+(++this.serial);
  try{kernel.durableGroup([id],async()=>{
   try{
    await this.checkpoints.drain(id);await this.combatCheckpoints.drain();this.lanes.assert(lease);
    const ack=await this.submit({actor:id,key,kind:'movement',payload:{nowMs:receivedAtMs,input,scope:context.scope,seed,expected:this.frameFor(id,receivedAtMs),resources:lease.keys}});
    demand(ack.key===key&&ack.result,'movement_ack_mismatch');this.lanes.assert(lease);await this.committed(ack.result);
    this.checkpoints.hydrateCommitted(ack.result.player);this.checkpoints.encounters?.hydrateCommitted(id,ack.result.engagement);
    for(const event of ack.result.events)this.publish(...event);this.lanes.release(lease);return ack;
   }catch(error){if(lease.state==='held')this.lanes.reject(lease,error);throw error;}
  },{replyTo:id,emitReceipt:false,ackResult:ack=>({type:'action',...ack.result.result})});}catch(error){if(lease.state==='held')this.lanes.reject(lease,error);throw error;}
  return {type:'action'};
 }
}
