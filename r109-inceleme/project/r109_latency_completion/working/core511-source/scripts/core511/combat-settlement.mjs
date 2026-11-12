import {RetaliationMemory} from './retaliation-memory.mjs';
import {createRetaliationRules} from './generated/retaliation-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {demand,kernelError} from './contract.mjs';

// The same native multi-attacker loop is used before an outgoing action and in
// the writer replay. RNG consumption follows native retaliation -> attack order.
export function residentSettlement({globals,frameFor,blocked=()=>false}){
 demand(globals&&typeof frameFor==='function','settlement_frames_unbound');const adapters=new WeakMap();
 return (id,settings,nowMs,view,{random,publish})=>{
  let adapter=adapters.get(view);if(!adapter){adapter=new RetaliationMemory({view,globals});adapters.set(view,adapter);}
  const due=adapter.due(id,nowMs);if(due.some(entry=>blocked(entry.monster_id)))throw kernelError('combat_resource_pending');
  adapter.publish=publish;const value=adapter.settle({playerId:id,settings,nowMs,frameFor,random});return value.durable?value:value.result;
 };
}
export function writerSettlement(sqlite,id,settings,nowMs,{globals,random,publish}){
 demand(sqlite.isTransaction&&globals&&typeof random==='function'&&typeof publish==='function','settlement_atomic_required');
 const rules=createRetaliationRules({globals,random,now:()=>nowMs,fourChannels:true,publish});
 return rules.settleAllWriter(nativeAtomicStatements(sqlite),id,settings,nowMs);
}
