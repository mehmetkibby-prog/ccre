import {castleEnabled,CASTLE_AREA,CASTLE_CHANNEL} from './castle-model-r59.mjs';
import {combatContinuationR57} from './r57-options.mjs';
import {normalPlayerR53} from './r53-options.mjs';
import {combatInputOrder} from './combat-input-order.mjs';
import {DEFER_INPUT} from './fixed-loop.mjs';
import {isDeathPreviewR54} from './reward-reply-r54.mjs';
import {demand} from './contract.mjs';
const continuationR61=process.env.CORE511_R61_COMBAT_CONTINUATION==='1';
const continuedActionsR61=new Set(['use_potion','claim_rewards','collect']);
const scheduled=new WeakSet(),windows=new WeakMap();
// Admission budget: at most16 attempts and no new attempt after2ms
// cumulative work in one50ms ordinary-channel window. A synchronous rule is
// never preempted: its final attempt can overshoot, then later calls stay out.
// Castle and R61flag0 retain their existing count/per-call budget policy.
// A disk ACK can release a queued death just after the 20 Hz input phase.
// Continue bounded accepted combat work then, without another whole frame of
// idle time. Movement, AI, regen and world projection still run only on the
// original fixed tick. All replies use its existing ordered result queues.
export function queueCombatContinuationR57(kernel){
 if(!combatContinuationR57||kernel.stopped||kernel.failure||scheduled.has(kernel))return;
 scheduled.add(kernel);setImmediate(()=>{scheduled.delete(kernel);continueCombatR57(kernel);});
}
export function continueCombatR57(kernel){
 if(!combatContinuationR57||kernel.stopped||kernel.failure||kernel.running||kernel.flushing)return;
 const started=kernel.clock(),now=kernel.wall();let window=windows.get(kernel);
 if(!window||started>=window.until){window={until:started+50,count:0,spentR61:0};windows.set(kernel,window);}
 const castleChannel=castleEnabled()&&kernel.state.channel===CASTLE_CHANNEL,budgetR61=continuationR61&&!castleChannel,limit=castleChannel||budgetR61?16:4;
 if(window.count>=limit||budgetR61&&window.spentR61>=2)return;
 const ready=[...combatInputOrder(kernel.players)];if(!ready.length){if(budgetR61)window.spentR61+=kernel.clock()-started;return;}
 kernel.running=true;let count=0;
 try{
  // This snapshot contains at most the resident capacity in existing heads. New arrivals and
  // subsequent commands stay for the next normal tick. An older non-attack
  // head retains its turn; no potion/claim gets jumped by this continuation.
  for(const [id,p]of ready){
   if(p.barrier||p.suspended||p.passive)continue;
   const input=p.queue[0];const area=kernel.state.read('players',id)?.area,castle=castleChannel&&(area===CASTLE_AREA&&['pvp_attack','respawn','castle_leave_r59'].includes(input?.payload?.action)||area==='bazaar'&&input?.payload?.action==='castle_enter_r59');if(!input||input.kind!=='combat'||!castle&&((input.payload?.action!=='attack'&&!(continuationR61&&continuedActionsR61.has(input.payload?.action)))||!normalPlayerR53(kernel.state.read('players',id))))break;
   if(window.count>=limit||count&&kernel.clock()-started>=2||budgetR61&&window.spentR61+kernel.clock()-started>=2)break;
   p.queue.shift();window.count++;count++;
   try{kernel.state.assertOwner(id,p.epoch);}catch(error){
    if(error.code!=='owner_epoch_fenced')throw error;
    const reply={type:'action',sequence:input.sequence,status:409,body:{code:error.code,error:'İşlem eski oyuncu oturumuna ait.'}};kernel.settled(p,reply);p.results.push(reply);continue;
   }
   const result=kernel.rules.combat({state:kernel.state,id,epoch:p.epoch,input:input.payload,receivedAtMs:input.receivedAtMs,inputOrder:input.order,now,tick:kernel.metrics.ticks,kernel});
   demand(!result?.then,'async_hot_rule_forbidden');
   if(result===DEFER_INPUT){p.queue.unshift(input);continue;}
   const reply={...result,sequence:input.sequence};
   if(p.barrier&&!isDeathPreviewR54(result))p.deferred.push(reply);else{kernel.settled(p,reply);p.results.push(reply);}
   if(p.barrier)break;
  }
 }catch(error){kernel.fail(error);}
 finally{
  kernel.running=false;const metrics=kernel.metrics,elapsed=kernel.clock()-started;
  if(budgetR61)window.spentR61+=elapsed;
  metrics.combatContinuationsR57=(metrics.combatContinuationsR57??0)+(count?1:0);
  metrics.combatContinuationInputsR57=(metrics.combatContinuationInputsR57??0)+count;
  metrics.combatContinuationMsR57=(metrics.combatContinuationMsR57??0)+elapsed;
  if(!kernel.failure)kernel.finishQuiescing();
 }
}
