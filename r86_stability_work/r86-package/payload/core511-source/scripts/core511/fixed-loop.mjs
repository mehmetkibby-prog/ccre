import {mayProcessDeathMovementR86,isDeathMovementReplyR86} from './death-movement-r86.mjs';
import {residentCapacityR59,channelAdmissionR59,castleResumeR59} from './castle-capacity-r59.mjs';
import {tickSlicesR53} from './r53-options.mjs';
import {quarantineDrainR531} from './r531-options.mjs';
import {recordGroupRejectionR531} from './group-rejection-r531.mjs';
import {tickSlicedR53} from './tick-slices-r53.mjs';
import {inputWorkBudgetR51} from './r51-options.mjs';
import {TICK_MS,CAPACITY,demand,kernelError} from './contract.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {r44Options} from './r44-options.mjs';
import {combatInputOrder} from './combat-input-order.mjs';
import {isDeathPreviewR54} from './reward-reply-r54.mjs';
import {queueCombatContinuationR57} from './combat-continuation-r57.mjs';
const quantile=(a,p)=>a.length?[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.ceil(a.length*p)-1)]:0;
export const DEFER_INPUT=Symbol('core511.defer-input-until-next-tick');
const emptyResults=Object.freeze([]);
export class FixedLoop {
 constructor({state,rules,send,clock=()=>performance.now(),wall=Date.now,tickMs=TICK_MS,onFatal=()=>{}}) {
  demand(tickMs===TICK_MS,'tick_must_be_20hz');
  for(const phase of ['movement','combat','ai','respawn','project'])demand(typeof rules?.[phase]==='function','missing_rule_phase_'+phase);
  this.state=state;this.rules=rules;this.send=send;this.clock=clock;this.wall=wall;this.onFatal=onFatal;
  this.players=new Map();this.nextAt=0;this.timer=null;this.running=false;this.stopped=true;this.failure=null;
  this.tickScratch={events:new Map(),deferred:new Set(),processed:new Map()};
  this.metrics={ticks:0,missed:0,inputs:0,messages:0,totalMs:0,maxMs:0,maxInputMs:0,slowest:[],slowInputs:[],samples:[]};
 }
 get activeCount(){let count=0;for(const p of this.players.values())if(!p.passive)count++;return count;}
 admit(id,epoch,{passive=false}={}) {
  demand(!this.players.has(id)&&(passive||this.activeCount<residentCapacityR59(this.state.channel)),'channel_full');
  this.state.assertOwner(id,epoch);this.players.set(id,{epoch,passive,lastAccepted:0,lastApplied:0,queue:[],results:[],settled:[],deferred:[],barrier:null,accepting:!passive,suspended:false,quiescer:null});
 }
 settled(p,result){p.lastApplied=result.sequence;p.settled.push(result);if(p.settled.length>64)p.settled.shift();}
 replayResults(id){return [...(this.players.get(id)?.settled??[])];}
 enqueue(id,{sequence,epoch,kind,payload}) {
  demand(!this.failure&&!this.stopped,'kernel_unavailable');
  const p=this.players.get(id);demand(p&&p.epoch===epoch,'owner_epoch_fenced');
  demand(p.accepting,'actor_draining');
  this.state.assertOwner(id,epoch);
  demand(Number.isSafeInteger(sequence)&&sequence===p.lastAccepted+1,'input_sequence_gap');
  demand(kind==='movement'||kind==='combat','unknown_input_kind');
  demand(p.queue.length<64,'input_backpressure');
  p.lastAccepted=sequence;p.queue.push({sequence,kind,payload,at:this.clock(),receivedAtMs:this.wall(),order:this.metrics.inputs+1});this.metrics.inputs++;
 }
 // Durable work is submitted asynchronously by the rule adapter. The actor is
 // fenced while it is pending. Other actors continue; no speculative reward ACK.
 durable(id,submit) {
  return this.durableGroup([id],submit,{replyTo:id});
 }
 durableGroup(ids,submit,{replyTo=null,ackResult,groupAckResult,emitReceipt=true}={}) {
  demand(Array.isArray(ids)&&ids.length>0&&ids.length<=residentCapacityR59(this.state.channel)&&new Set(ids).size===ids.length,'invalid_commit_group');
  demand(replyTo===null||ids.includes(replyTo),'invalid_commit_recipient');
  const group=ids.map(id=>{const p=this.players.get(id);demand(p&&!p.barrier,'actor_commit_pending');return {id,p,owner:this.state.assertOwner(id,p.epoch)};});
  demand(typeof submit==='function','durable_submit_factory_required');
  for(const {owner}of group)owner.pending++;
  let pending;try{pending=Promise.resolve(submit());}catch(error){for(const {owner}of group)owner.pending--;throw error;}
  for(const {p}of group)p.barrier=pending;
  const fatal=error=>this.fail(error);
  const rejected=error=>{
   const rejection=actorRejection(error);
   if(!rejection||!group.some(g=>g.id===rejection.actor&&g.p.epoch===rejection.epoch)){fatal(error);return;}
   for(const {id,p,owner}of group){
    demand(p.barrier===pending&&this.state.owners.get(id)===owner,'durable_owner_changed');
    for(const prior of p.deferred){const result={type:'action',sequence:prior.sequence,status:409,body:{...(quarantineDrainR531?{not_executed:true}:{}),code:error.code,error:'İşlem kilit nedeniyle uygulanmadı. Tekrar deneyebilirsin.'}};this.settled(p,result);p.results.push(result);}
    p.deferred.length=0;p.barrier=null;owner.pending--;
   }
   recordGroupRejectionR531(pending,error,group);
  };
  pending.then(value=>{
   const accepted=group.map(({id,p,owner})=>{
    demand(p.barrier===pending&&this.state.owners.get(id)===owner,'durable_owner_changed');
    return {id,p,owner,replies:p.deferred.map(result=>{const mapped=groupAckResult?.(value,result,id)??(id===replyTo&&ackResult?ackResult(value,result):null);return mapped?{...mapped,sequence:result.sequence}:result;})};
   });
   for(const {id,p,owner,replies}of accepted){
    for(const result of replies){this.settled(p,result);p.results.push(result);}
    p.deferred.length=0;if(id===replyTo&&emitReceipt)p.results.push({type:'durable',value});p.barrier=null;owner.pending--;
   }
   queueCombatContinuationR57(this);
  },rejected).catch(fatal);
  return pending;
 }
 tick() {
  if(tickSlicesR53)return tickSlicedR53(this);
  if(this.stopped||this.failure)return;
  demand(!this.running&&!this.flushing,'overlapping_tick');this.running=true;
  const started=this.clock(),now=this.wall(),events=this.tickScratch.events,deferredThisTick=this.tickScratch.deferred,processed=this.tickScratch.processed,sends=[];let failure=null;
  try {
   // Repeated movement/combat waves preserve per-actor input order without
   // adding another tick for a movement that follows a combat command.
   let ready=true;
   while(ready) {
    ready=false;
    for(const phase of ['movement','combat'])for(const [id,p]of r44Options.combatFifo&&phase==='combat'?combatInputOrder(this.players):this.players) {
    if(p.barrier&&!mayProcessDeathMovementR86(this,id,p,phase)||p.suspended||p.passive||deferredThisTick.has(id)||inputWorkBudgetR51&&(processed.get(id)??0)>=8)continue;
    let results=null;
    while(p.queue.length&&p.queue[0].kind===phase&&(!p.barrier||mayProcessDeathMovementR86(this,id,p,phase))&&(!inputWorkBudgetR51||(processed.get(id)??0)<8)) {
     const input=p.queue.shift();if(inputWorkBudgetR51)processed.set(id,(processed.get(id)??0)+1);
     // No rule or mutation has run for this input yet. An already retired
     // actor epoch cancels this input only; other actors keep their channel.
     try{this.state.assertOwner(id,p.epoch);}catch(error){if(error.code!=='owner_epoch_fenced')throw error;const reply={type:'action',sequence:input.sequence,status:409,body:{code:error.code,error:'İşlem eski oyuncu oturumuna ait.'}};this.settled(p,reply);(results??=[]).push(reply);ready=true;continue;}
     const result=this.rules[phase]({state:this.state,id,epoch:p.epoch,input:input.payload,receivedAtMs:input.receivedAtMs,inputOrder:input.order,now,tick:this.metrics.ticks,kernel:this});
     demand(!result?.then,'async_hot_rule_forbidden');
     if(result===DEFER_INPUT){p.queue.unshift(input);deferredThisTick.add(id);break;}
     const reply={...result,sequence:input.sequence};
     if(p.barrier&&!isDeathPreviewR54(result)&&!isDeathMovementReplyR86(result))p.deferred.push(reply);else{this.settled(p,reply);(results??=[]).push(reply);}
     ready=true;
     const inputMs=this.clock()-input.at;this.metrics.maxInputMs=Math.max(this.metrics.maxInputMs,inputMs);
     if(inputMs>50){const list=this.metrics.slowInputs;list.push({at:now,ms:inputMs,kind:input.kind,action:input.payload?.action});list.sort((a,b)=>b.ms-a.ms);list.length=Math.min(10,list.length);}
     if(r44Options.combatFifo&&phase==='combat')break;
    }
    if(results?.length){const list=events.get(id);if(list)list.push(...results);else events.set(id,results);}
    }
   }
   for(const phase of ['ai','respawn'])demand(!this.rules[phase]({state:this.state,now,tick:this.metrics.ticks,kernel:this})?.then,'async_hot_rule_forbidden');
   const changes=this.state.changes(),shared=new Map();
   for(const [id,p]of this.players) {
    if(p.suspended)continue;
    if(p.passive){p.results.length=0;continue;}
    let results=events.get(id);if(p.results.length){if(results)results.push(...p.results.splice(0));else results=p.results.splice(0);}results??=emptyResults;
    const packet=this.rules.project({state:this.state,id,now,changes,shared,results,lastApplied:p.lastApplied});
    demand(!packet?.then,'async_hot_rule_forbidden');
    if(packet){const sent=this.send(id,packet);if(sent?.then)sends.push(sent);this.metrics.messages++;}
   }
   this.metrics.ticks++;
  } catch(error) { failure=error;this.fail(error); }
  finally {
   events.clear();deferredThisTick.clear();processed.clear();
   this.running=false;
  }
  const complete=()=>{
   this.flushing=false;if(!this.failure)this.finishQuiescing();
   const elapsed=this.clock()-started,m=this.metrics;m.totalMs+=elapsed;m.maxMs=Math.max(m.maxMs,elapsed);
   if(m.samples.length===16384)m.samples.shift();m.samples.push(elapsed);
   m.slowest.push({tick:m.ticks,at:now,ms:elapsed,players:this.activeCount});m.slowest.sort((a,b)=>b.ms-a.ms);m.slowest.length=Math.min(10,m.slowest.length);
  };
  // Every tick sample includes the ENTIRE outbound queue wait, including yields.
  // A slice cannot masquerade as a separate fast logical tick.
  if(failure){for(const sent of sends)void sent.catch(()=>{});complete();throw failure;}
  if(sends.length){this.flushing=true;this.pendingTick=Promise.all(sends).then(complete,error=>{complete();this.fail(error);throw error;}).finally(()=>{this.pendingTick=null;});return this.pendingTick;}
  complete();
 }
 // Called by the trusted exit/transfer coordinator. Already accepted inputs and
 // result packets drain before simulation ownership is suspended. Final forced
 // checkpoint then runs outside the tick; only its durable ACK permits release.
 quiesce(id,epoch){
  const p=this.players.get(id);demand(p&&p.epoch===epoch&&!this.failure,'owner_epoch_fenced');
  if(p.suspended&&!p.externalHold)return Promise.resolve({id,epoch,lastApplied:p.lastApplied});
  if(p.quiescer)return p.quiescer.promise;
  p.accepting=false;let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});p.quiescer={promise,resolve,reject};
  if(!this.running&&!this.flushing)this.finishQuiescing();return promise;
 }
 quiesceGroup(actors){
  demand(Array.isArray(actors)&&new Set(actors.map(a=>a.id)).size===actors.length&&!this.failure,'quiesce_group');
  const group=actors.map(({id,epoch})=>{const p=this.players.get(id);demand(p&&p.epoch===epoch&&!p.quiescer&&(!p.suspended||p.externalHold),'quiesce_group_owner');return {id,p};});
  const promises=group.map(({p})=>{p.accepting=false;let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});p.quiescer={promise,resolve,reject,group};return promise;});
  if(!this.running&&!this.flushing)this.finishQuiescing();return Promise.all(promises);
 }
 finishQuiescing(){
  if(this.flushing)return;
  const ready=(id,p)=>p.quiescer&&!p.externalHold&&!p.queue.length&&!p.barrier&&!p.results.length&&!p.deferred.length&&!this.state.owners.get(id)?.pending;
  const finish=(id,p)=>{this.state.quiesce(id,p.epoch);p.suspended=true;const waiter=p.quiescer;p.quiescer=null;waiter.resolve({id,epoch:p.epoch,lastApplied:p.lastApplied});};
  const visited=new Set();
  for(const [id,p]of this.players){
   const group=p.quiescer?.group;if(group){if(visited.has(group))continue;visited.add(group);if(group.every(({id,p})=>ready(id,p)))for(const {id,p}of group)finish(id,p);continue;}
   if(ready(id,p))finish(id,p);
  }
 }
 resume(id,epoch){const p=this.players.get(id);demand(p&&p.epoch===epoch&&p.suspended&&!p.quiescer,'actor_not_suspended');this.state.resume(id,epoch);p.suspended=false;p.accepting=!p.passive;}
 // Only a trusted, already durable ownership return may retire queued old-
 // epoch inputs. Every accepted sequence gets an explicit result before the
 // source socket closes; none executes in the destination epoch.
 retireScope(id,epoch,token){
  const p=this.players.get(id),owner=this.state.assertOwner(id,epoch,{allowQuiesced:true});demand(p?.epoch===epoch&&p.suspended&&p.externalHold===token&&!p.barrier&&!p.deferred.length&&owner.pending===0,'retire_scope_not_committed');p.accepting=false;
  for(const input of p.queue.splice(0)){const reply={type:'action',sequence:input.sequence,status:409,body:{code:'owner_epoch_fenced',error:'Oyun kanalı değişti. Yeniden bağlan.'}};this.settled(p,reply);p.results.push(reply);}
  demand(p.lastApplied===p.lastAccepted,'retire_scope_sequence');
  const waiter=p.quiescer;if(waiter){if(waiter.group){const index=waiter.group.findIndex(row=>row.p===p);demand(index>=0,'retire_scope_group');waiter.group.splice(index,1);}p.quiescer=null;waiter.resolve({id,epoch,lastApplied:p.lastApplied,retired:true});}
  if(owner.state==='active')this.state.quiesce(id,epoch);return {results:p.results.splice(0),lastApplied:p.lastApplied};
 }
 detach(id,epoch){const p=this.players.get(id);demand(p&&p.epoch===epoch&&p.suspended&&!p.barrier&&!p.queue.length,'actor_not_drained');this.state.release(id,epoch);this.players.delete(id);}
 fail(error){if(this.failure)return;this.failure=error;for(const p of this.players.values())if(p.quiescer){p.quiescer.reject(error);p.quiescer=null;}this.onFatal(error);}
 start() {
  demand(this.stopped&&!this.failure,'kernel_already_started');this.stopped=false;this.nextAt=this.clock()+TICK_MS;
  const schedule=()=>{
   if(this.stopped||this.failure)return;
   this.nextAt+=TICK_MS;
   const now=this.clock();if(now>this.nextAt){const missed=Math.floor((now-this.nextAt)/TICK_MS)+1;this.metrics.missed+=missed;this.nextAt+=missed*TICK_MS;}
   this.timer=setTimeout(turn,Math.max(0,this.nextAt-this.clock()));
  };
  const turn=()=>{
   if(this.stopped)return;
   try{const done=this.tick();if(done?.then)void done.then(schedule,error=>this.fail(error));else schedule();}catch{return;}
  };
  this.timer=setTimeout(turn,TICK_MS);
 }
 stop(){this.stopped=true;clearTimeout(this.timer);}
 snapshot(){const m=this.metrics;return {...m,samples:undefined,players:this.activeCount,passivePlayers:this.players.size-this.activeCount,tickP95Ms:quantile(m.samples,0.95),tickP99Ms:quantile(m.samples,0.99)};}
}
