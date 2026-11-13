import {instanceRewardAreaR71} from './instance-reward-scope-r71.mjs';
export const combatAreaR113=area=>['forest','frozen','ancient','black','rune_v2'].includes(area)||instanceRewardAreaR71(area);
// Only the native sanctuary boss. Its existing global signed lease and every
// actor hold remain in force; this selects the execution connection, not a new
// authority. Other world-ending/administrative operations keep their old path.
export function canonicalBossWriteR113(request){
 const p=request?.payload,player=p?.expected?.player,input=p?.input;
 if(!p?.sharedLease||player?.area!=='sanctum'||player.arena_match_id||player.instance_id||p.batchPotionsR61!==undefined||p.batchAttacksR57!==undefined)return false;
 if(request.operation==='attack'){
  const m=p.expected.monster;
  return input?.action==='attack'&&input.targetId==='dunya-bosu-1'&&m?.id===input.targetId&&m.channel===0&&m.is_boss===1&&m.area==='sanctum'&&!m.loadlab_run_id;
 }
 return request.operation==='native_action'&&input?.action==='claim_rewards'&&Array.isArray(input.rewardTargets)&&input.rewardTargets.length>0&&input.rewardTargets.length<=10&&input.rewardTargets.every(t=>t?.id==='dunya-bosu-1'&&Number.isSafeInteger(t.spawnRound)&&t.spawnRound>0);
}
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
 // The persistence worker's native-action security port binds one exact
 // actor/payload. Multi-actor potion batches have their own per-entry native
 // guards and journals; keep the complete existing batch in the coordinator's
 // same sole-writer FIFO. Do not delegate it to a single-actor security port,
 // split it into independent writes, or loosen the worker guard on rejection.
 return request?.operation==='native_action'&&p.batchPotionsR61===undefined&&(input?.action==='use_potion'||input?.action==='claim_rewards'&&Array.isArray(input.rewardTargets)&&input.rewardTargets.length<=10);
}
export function workerOperationR113(request){return request?.operation==='attack'||privateCombatWriteR113(request)||dungeonWriteR113(request);}
