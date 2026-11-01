import {deathBatchR57} from './r57-options.mjs';
import {OperationRandom} from './operation-random.mjs';
// A candidate may be rejected BECAUSE of its damage roll. Re-rolling that
// accepted input later would bias critical hits. Keep only speculative seeds,
// keyed by the server's input object and its accepted owner/epoch/order.
// Weak keys retire with the queue; client fields never select a seed.
const pending=new WeakMap();
const valid=c=>deathBatchR57&&c?.input?.action==='attack'&&typeof c.id==='string'&&Number.isSafeInteger(c.epoch)&&c.epoch>0&&Number.isSafeInteger(c.inputOrder)&&c.inputOrder>0;
const matching=c=>{const row=pending.get(c.input);return row&&row.id===c.id&&row.epoch===c.epoch&&row.order===c.inputOrder?row:null;};
export function attackSeedR57(context){return valid(context)&&matching(context)?.seed||OperationRandom.seed();}
export function reserveAttackSeedR57(context){
 if(!valid(context))return OperationRandom.seed();
 const prior=matching(context);if(prior)return prior.seed;
 const seed=OperationRandom.seed();pending.set(context.input,{id:context.id,epoch:context.epoch,order:context.inputOrder,seed});return seed;
}
