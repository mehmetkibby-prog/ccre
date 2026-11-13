import {instanceRewardAreaR71} from './instance-reward-scope-r71.mjs';
export const combatAreaR113=area=>['forest','frozen','ancient','black','rune_v2'].includes(area)||instanceRewardAreaR71(area);
// Established rooms are owned by one channel. Cross-channel entry/return and
// world-ending jobs retain their coordinator transition, never a worker shortcut.
export function dungeonWriteR113(request){
 const p=request?.payload;
 return request?.operation==='dungeon'&&!p?.sharedLease&&p?.run&&['solo','group'].includes(p.run.mode)&&['command','tick','checkpoint'].includes(p.operation?.kind)&&Array.isArray(p.actors)&&p.actors.length>0&&p.actors.length<=25;
}
export function workerOperationR113(request){return request?.operation==='attack'||request?.operation==='native_action'&&request.payload?.input?.action==='claim_rewards'||dungeonWriteR113(request);}
