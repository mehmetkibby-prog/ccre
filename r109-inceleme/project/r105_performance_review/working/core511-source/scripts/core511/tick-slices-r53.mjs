import {mayProcessDeathMovementR86,isDeathMovementReplyR86} from './death-movement-r86.mjs';
import {earlyCombatReplyR531,tickHoldR531} from './r531-options.mjs';
import {memoryCombatR53,normalPlayerR53,normalMonsterR53} from './r53-options.mjs';
import {ordinaryRuneRewardR87} from './rune-reward-scope-r87.mjs';
import {PROTOCOL} from './contract.mjs';
import {demand} from './contract.mjs';
import {inputWorkBudgetR51} from './r51-options.mjs';
import {r44Options} from './r44-options.mjs';
import {combatInputOrder} from './combat-input-order.mjs';
import {DEFER_INPUT} from './fixed-loop.mjs';
import {isDeathPreviewR54} from './reward-reply-r54.mjs';
const emptyResults=Object.freeze([]);
// Ordinary Rune hits already settle in authoritative channel memory like
// ordinary forest hits. Do not hold their result behind unrelated AI work.
// This changes delivery only: terminal/provisional, mixed PvP and ranked boss
// replies keep their existing projection/durable barrier paths.
function ordinaryEarlyReplyR99(state,id,hits,body){
 const player=state.read('players',id);
 if(normalPlayerR53(player))return hits.every(hit=>hit.killed!==true&&normalMonsterR53(state.read('monsters',hit.id)));
 if(!memoryCombatR53||player?.area!=='rune_v2'||player.channel!==state.channel||player.hp<=0||player.arena_match_id||player.instance_id||player.instanceId||body.combatPending===true||body.combatPhase==='pending'||body.rewardPending===true||body.provisionalHits!==undefined||body.pvpHits!==undefined&&(!Array.isArray(body.pvpHits)||body.pvpHits.length))return false;
 return hits.every(hit=>{const monster=state.read('monsters',hit.id);return hit.killed!==true&&hit.killPending!==true&&Number.isFinite(hit.hp)&&hit.hp>0&&ordinaryRuneRewardR87(monster)&&monster.channel===player.channel&&monster.hp>0&&monster.spawn_round===hit.spawnRound;});
}
// A logical tick keeps its time/order and metrics across bounded I/O slices.
// Inputs arriving during a yield join the next logical tick. Each yield is
// outside one native action or four completed retaliation hits.
export function tickSlicedR53(kernel,{budgetMs=8}={}){
 const iterator=tickBodyR53.call(kernel);let deadline=performance.now()+budgetMs;
 const run=()=>{
  for(;;){const step=iterator.next();if(step.done)return step.value;
   if(performance.now()>=deadline)return new Promise((resolve,reject)=>setImmediate(()=>{deadline=performance.now()+budgetMs;try{resolve(run());}catch(error){reject(error);}}));
  }
 };
 return run();
}
function* tickBodyR53() {
  if(this.stopped||this.failure)return;
  demand(!this.running&&!this.flushing,'overlapping_tick');this.running=true;
  const acceptedAtStart=new Map([...this.players].map(([id,p])=>[id,p.lastAccepted]));this.acceptedAtStartR86=acceptedAtStart;
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
    while(p.queue.length&&p.queue[0].sequence<=(acceptedAtStart.get(id)??0)&&p.queue[0].kind===phase&&(!p.barrier||mayProcessDeathMovementR86(this,id,p,phase))&&(!tickHoldR531||!p.suspended)&&(!inputWorkBudgetR51||(processed.get(id)??0)<8)) {
     const input=p.queue.shift();if(inputWorkBudgetR51)processed.set(id,(processed.get(id)??0)+1);
     // No rule or mutation has run for this input yet. An already retired
     // actor epoch cancels this input only; other actors keep their channel.
     try{this.state.assertOwner(id,p.epoch);}catch(error){if(error.code!=='owner_epoch_fenced')throw error;const reply={type:'action',sequence:input.sequence,status:409,body:{code:error.code,error:'İşlem eski oyuncu oturumuna ait.'}};this.settled(p,reply);(results??=[]).push(reply);ready=true;continue;}
     const result=this.rules[phase]({state:this.state,id,epoch:p.epoch,input:input.payload,receivedAtMs:input.receivedAtMs,inputOrder:input.order,now,tick:this.metrics.ticks,kernel:this});
     demand(!result?.then,'async_hot_rule_forbidden');
     if(result===DEFER_INPUT){p.queue.unshift(input);deferredThisTick.add(id);break;}
     const reply={...result,sequence:input.sequence};
     if(p.barrier&&!isDeathPreviewR54(result)&&!isDeathMovementReplyR86(result))p.deferred.push(reply);else{
      this.settled(p,reply);
      const hits=reply.body?.hits;
      const early=earlyCombatReplyR531&&input.payload?.action==='attack'&&reply.status===200&&Array.isArray(hits)&&hits.length>0&&ordinaryEarlyReplyR99(this.state,id,hits,reply.body)&&!results?.length&&!events.get(id)?.length&&!p.results.length;
      if(early){const sent=this.send(id,{type:'frame',protocol:PROTOCOL,results:[reply],lastApplied:p.lastApplied});if(sent?.then)sends.push(sent);this.metrics.messages++;}
      else (results??=[]).push(reply);
     }
     ready=true;
     const inputMs=this.clock()-input.at;this.metrics.maxInputMs=Math.max(this.metrics.maxInputMs,inputMs);
     if(inputMs>50){const list=this.metrics.slowInputs;list.push({at:now,ms:inputMs,kind:input.kind,action:input.payload?.action});list.sort((a,b)=>b.ms-a.ms);list.length=Math.min(10,list.length);}
     yield;
     if(r44Options.combatFifo&&phase==='combat')break;
    }
    if(results?.length){const list=events.get(id);if(list)list.push(...results);else events.set(id,results);}
    }
   }
   const phaseContext={state:this.state,now,tick:this.metrics.ticks,kernel:this};
   if(this.rules.aiSteps)yield* this.rules.aiSteps(phaseContext);else demand(!this.rules.ai(phaseContext)?.then,'async_hot_rule_forbidden');
   yield;demand(!this.rules.respawn(phaseContext)?.then,'async_hot_rule_forbidden');yield;
   const changes=this.state.changes(),shared=new Map();
   for(const [id,p]of this.players) {
    if(p.suspended){
     // Control can suspend an actor at any yield. Completed local replies
     // belong to that actor until projection resumes, not to tick scratch.
     // They are already settled; never execute or settle them a second time.
     if(tickHoldR531&&events.get(id)?.length)p.results.push(...events.get(id));
     continue;
    }
    if(p.passive){p.results.length=0;continue;}
    let results=events.get(id);if(p.results.length){if(tickHoldR531){const earlier=p.results.splice(0);if(results)earlier.push(...results);results=earlier;}else if(results)results.push(...p.results.splice(0));else results=p.results.splice(0);}results??=emptyResults;
    const packet=this.rules.project({state:this.state,id,now,changes,shared,results,lastApplied:p.lastApplied});
    demand(!packet?.then,'async_hot_rule_forbidden');
    if(packet){const sent=this.send(id,packet);if(sent?.then)sends.push(sent);this.metrics.messages++;}
    yield;
   }
   this.metrics.ticks++;
  } catch(error) { failure=error;this.fail(error); }
  finally {
   events.clear();deferredThisTick.clear();processed.clear();this.acceptedAtStartR86=null;
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
