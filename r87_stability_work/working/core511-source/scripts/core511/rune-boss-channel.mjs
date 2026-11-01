import {randomUUID} from 'node:crypto';
import {RuneBossMemory} from './rune-boss-memory.mjs';
import {OperationRandom} from './operation-random.mjs';
import {demand} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {actorRejection} from './actor-rejection.mjs';
export class RuneBossChannel {
 constructor(channel,{initial=[],clock=Date.now}){
  this.channel=channel;this.clock=clock;this.id='rune-v2-boss-c'+channel.peer.channel+'-1';this.pending=null;this.next=0;this.base=null;
  const c=channel;this.memory=new RuneBossMemory({view:c.view,channel:c.peer.channel,owners:c.owners,globals:c.globals,settings:()=>c.settings,clock,session:c.peer.incarnation,associated:id=>c.frames.entry(id).labAssociated,frameFor:id=>({...c.view.player(id),world_cycle:c.world.cycle,core_wings:c.frames.entry(id).retaliationPlayer.core_wings,armor_json484:c.frames.entry(id).runeArmorJson??'[]'})});this.reset(initial);
 }
 reset(rows){demand(!this.pending,'rune_reset_pending');this.base=rows.find(row=>row.id===this.id)??null;this.memory.states=new Map(this.base?[[this.id,this.base]]:[]);this.memory.context.states.clear();this.memory.rules.views.clear();this.next=0;}
 candidates(){const c=this.channel,b=c.view.monster(this.id);if(!b)return [];return [...c.view.activePlayers].filter(id=>{const p=c.view.player(id);return c.owners.has(id)&&p.hp>0&&p.area==='rune_v2'&&p.channel===c.peer.channel&&!p.arena_match_id&&p.last_seen>=Math.floor(this.clock()/1000)-30&&(p.x-b.x)**2+(p.y-b.y)**2<=370**2;});}
 tick(now){
  const c=this.channel;if(c.backgroundPaused||this.pending||now<this.next)return;this.next=now+200;
  const ids=this.candidates();demand(ids.length<=25,'rune_channel_capacity');if(ids.some(id=>{const p=c.kernel.players.get(id);return !p||p.barrier||p.suspended||p.quiescer;}))return;
  const lease=c.lanes.acquire(['monster:'+this.id,...ids.map(id=>'player:'+id)],'rune:'+randomUUID());if(!lease)return;
  let submitted=false;
  const actorRejected=error=>{const rejected=actorFaultIsolation&&!submitted?actorRejection(error):null;return rejected&&ids.includes(rejected.actor)&&c.owners.get(rejected.actor)?.epoch===rejected.epoch;};
  try{
   const plan=this.memory.plan(now);if(!plan.durable){this.memory.commit(plan);for(const row of plan.players.values())c.view.setPlayer(row);for(const e of plan.events)c.ports.publish(e.cycle,e.channel,e.area,e);c.lanes.release(lease);return;}
   const work=async()=>{try{
    await Promise.all(ids.map(id=>c.checkpoints.drain(id)));await c.combatCheckpoints.drain();c.lanes.assert(lease);
    submitted=true;let result=await this.write(ids,plan.seed,now,'step');this.accept(result,false);
    // Original async native code checks this after its durable batch returns.
    // Check it again after our outer WAL fsync ACK, before exposing any wave.
    if(result.state?.phase==='telegraph'&&this.clock()>result.state.impact_at_ms-500){result=await this.write([],OperationRandom.seed(),this.clock(),'late_cancel');this.accept(result,false);}
    if(result.events.length){await c.applyCommit(result);for(const row of result.players)if(c.owners.has(row.id))c.checkpoints.hydrateCommitted(row);}
    this.accept(result);for(const e of result.events)c.ports.publish(e.cycle,e.channel,e.area,e);c.lanes.release(lease);return result;
   }catch(error){if(actorFaultIsolation&&submitted&&actorRejection(error))error=Object.assign(Error('rune_step_outcome_unknown'),{code:'rune_step_outcome_unknown',cause:error});if(lease.state==='held'){if(actorRejected(error))c.lanes.reject(lease,error);else c.lanes.fence(lease);}throw error;}};
   const task=ids.length?c.kernel.durableGroup(ids,work,{emitReceipt:false}):work();this.pending=task;task.catch(error=>{if(!actorRejected(error))c.fail(error);}).finally(()=>{if(this.pending===task)this.pending=null;});
  }catch(error){if(lease.state==='held')c.lanes.fence(lease);c.fail(error);}
 }
 write(ids,seed,nowMs,mode){
  const c=this.channel,actors=ids.map(id=>({id,epoch:c.owners.get(id).epoch,sequence:c.writer.finalSequence(id)})),frames=ids.filter(id=>{const p=c.view.player(id);return p.loadlab_run_id===''&&p.is_gm===0&&p.arena_match_id===''&&!c.frames.entry(id).labAssociated;}).map(id=>this.memory.frameFor(id));
  const payload={mode,session:c.peer.incarnation,nowMs,seed,cycle:c.world.cycle,monster:{...c.view.monster(this.id)},settings:c.settings,actors,frames,state:{base:this.base,current:this.memory.states.get(this.id)??null},cache:[...this.memory.context.states]};
  const key='rune-boss:'+randomUUID();return c.systemWriter.submit({key,kind:'rune_boss_step',payload}).then(ack=>{demand(ack.key===key&&ack.result,'rune_ack_mismatch');return ack.result;});
 }
 accept(result,expose=true){this.base=result.state;this.memory.states=new Map(result.state?[[this.id,result.state]]:[]);this.memory.context.states=new Map(result.cache);if(expose){this.memory.rules.views.clear();for(const [key,view]of result.views)this.memory.rules.views.set(key,view);}}
 async drain(){if(this.pending)await this.pending;}
 wave(...args){return this.memory.wave(...args);}
}
