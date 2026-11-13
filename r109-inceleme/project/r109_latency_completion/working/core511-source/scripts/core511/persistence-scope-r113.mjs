import {instanceRewardAreaR71} from './instance-reward-scope-r71.mjs';
export const combatAreaR113=area=>['forest','frozen','ancient','black','rune_v2'].includes(area)||instanceRewardAreaR71(area);
// Established rooms are owned by one channel. Cross-channel entry/return and
// world-ending jobs retain their coordinator transition, never a worker shortcut.
export function dungeonWriteR113(request){
 const p=request?.payload;
 return request?.operation==='dungeon'&&!p?.sharedLease&&p?.run&&['solo','group'].includes(p.run.mode)&&['command','tick','checkpoint'].includes(p.operation?.kind)&&Array.isArray(p.actors)&&p.actors.length>0&&p.actors.length<=25;
}
// These actor-owned operations use the same native writer, resource audit,
// receipt and RNG transaction as attacks. No HTTP, trade, guild or ownership
// transition is admitted by this predicate.
export function privateCombatWriteR113(request){
 const p=request?.payload,input=p?.input;
 return request?.operation==='native_action'&&(input?.action==='use_potion'||input?.action==='claim_rewards'&&Array.isArray(input.rewardTargets)&&input.rewardTargets.length<=10);
}
export function workerOperationR113(request){return request?.operation==='attack'||privateCombatWriteR113(request)||dungeonWriteR113(request);}
