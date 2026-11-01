import {tickSlicesR53,normalPlayerR53} from './r53-options.mjs';
import {tickHoldR531} from './r531-options.mjs';
import {hitEngagementR53} from './engagement-memory-r53.mjs';
import {OperationRandom} from './operation-random.mjs';
import {demand} from './contract.mjs';
import {r35Options} from './r35-options.mjs';

// Native AI retaliation phase. frameFor/settings are admission/control-change
// caches, not database callbacks. Writer rereads and validates them at a death.
// The full action router must also interlock monster/config/gear mutations;
// this adapter alone is not a complete open-world combat router.
export class RetaliationLoop {
 constructor({memory,checkpoints,submit,frameFor,settings,committed,publish,lanes=null,combatCheckpoints=null}){
  for(const f of [submit,frameFor,settings,committed,publish])demand(typeof f==='function','retaliation_loop_dependencies');
  demand(memory&&checkpoints?.encounters,'retaliation_loop_checkpoints');
  demand(lanes&&combatCheckpoints,'retaliation_resource_journal_pair');Object.assign(this,{memory,checkpoints,submit,frameFor,settings,committed,publish,lanes,combatCheckpoints});this.incarnation=OperationRandom.seed().slice(0,24);this.serial=0;this.aggroScans=new WeakMap();
 }
 scanDue(id,resident,now){
  if(!r35Options.aggroStagger)return true;
  const prior=this.aggroScans.get(resident);if(prior&&now>=prior.at&&now<prior.next)return false;
  let phase=0;for(let i=0;i<id.length;i++)phase=(Math.imul(phase,31)+id.charCodeAt(i))>>>0;
  this.aggroScans.set(resident,{at:now,next:now+200-((now+phase)%200)});return true;
 }
 tick(context){for(const ignored of this.tickSteps(context)){} }
 *tickSteps({now,kernel}){
  const view=this.memory.view;
  for(const [id,p]of kernel.players){
   if(p.barrier||p.suspended||p.passive||kernel.state.owners.get(id)?.state!=='active'||view.player(id)?.hp<=0)continue;
   if(this.lanes?.busy(['player:'+id]))continue;
   if(normalPlayerR53(view.player(id))&&this.checkpoints.overdueR53?.(id))continue;
   this.memory.beginBatch?.(id);try{
   // Explicit attacks still arm their target inside AttackMemory immediately.
   // Only ambient acquisition is staggered; every due hit runs every tick.
   if(this.scanDue(id,p,now))for(const target of view.nearby(id,now,true)??[])if(!this.lanes?.busy(['monster:'+target.monster.id]))this.memory.arm(target.player,target.monster,now);
   const settings=this.settings(id);
   let sliceHits=0;for(const entry of this.memory.due(id,now)){
    if(this.lanes?.busy(['monster:'+entry.monster_id]))continue;
    const row=view.engagements.get(id),engagement=hitEngagementR53(row,entry),frame=this.frameFor(id,entry,this.memory.view),seed=OperationRandom.seed(),rng=new OperationRandom(seed);
    const result=this.memory.step({playerId:id,settings,nowMs:now,engagement,frame,random:()=>rng.roll()});
    if(!result.durable){if(tickSlicesR53&&++sliceHits%4===0){this.memory.endBatch?.();yield;if(tickHoldR531&&(p.barrier||p.suspended||kernel.players.get(id)!==p||kernel.state.owners.get(id)?.state!=='active'))break;this.memory.beginBatch?.(id);}continue;}
    this.memory.endBatch?.();
    if(this.shared?.hasShared(['monster:'+entry.monster_id])){this.shared.retaliation({id,now,kernel},{entry,seed});break;}
    const lease=this.lanes?.acquire(['player:'+id,'monster:'+entry.monster_id],this.incarnation);if(this.lanes&&!lease)continue;
    kernel.durableGroup([id],async()=>{
     try{
     // Finish any older double-buffered save, then save the latest nonterminal
     // HP/position plus encounter clocks before the terminal native SQL job.
     await this.checkpoints.drain(id);
     await this.combatCheckpoints?.drain();if(lease)this.lanes.assert(lease);
     const event={actor:id,key:'retaliation:'+this.incarnation+':'+(++this.serial),kind:'retaliation_death',payload:{nowMs:now,seed,engagement,row,frame,settings,resources:lease.keys}};
     const ack=await this.submit(event);demand(ack.key===event.key&&ack.result?.result?.dead===true,'retaliation_ack_mismatch');
     const value=ack.result;demand(kernel.state.owners.get(id)?.epoch===p.epoch,'retaliation_owner_changed');
     await this.committed(value);this.checkpoints.hydrateCommitted(value.player);this.checkpoints.encounters.hydrateCommitted(id,value.engagement);
     for(const args of value.events)this.publish(...args);
     if(lease)this.lanes.release(lease);
     return value.result;
     }catch(error){if(lease?.state==='held')this.lanes.reject(lease,error);throw error;}
    },{emitReceipt:false});
    break;
   }
   }finally{this.memory.endBatch?.();}
   if(tickSlicesR53)yield;
  }
 }
}
