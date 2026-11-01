import {claimScopedDrainR56} from './r56-options.mjs';
import {normalPlayerR53,normalMonsterR53} from './r53-options.mjs';

// Native local claim writes the explicitly leased ordinary target histories.
// Actor HP/encounters are drained separately by ActionLoop. Keep the existing
// journal ACK, guard, snapshot, deadline and rollback machinery; only omit
// unrelated monsters from the forced flush. Their normal deadline still runs.
export function claimDrainTargetsR56({input,footprint,ids,kernel}){
 return claimScopedDrainR56?ordinaryClaimDrainTargetsR56({input,footprint,ids,kernel}):null;
}
export function ordinaryClaimDrainTargetsR56({input,footprint,ids,kernel}){
 if(input.action!=='claim_rewards'||footprint.localScope?.kind!=='claim'||!Array.isArray(footprint.localScope.targets)||!footprint.localScope.targets.length||footprint.localScope.targets.length>10)return null;
 if(ids.some(id=>!normalPlayerR53(kernel.state.read('players',id))))return null;
 const monsters=[];
 for(const key of footprint.resources){
  if(key.startsWith('player:')){if(!ids.includes(key.slice(7)))return null;continue;}
  if(!key.startsWith('monster:'))return null;
  const id=key.slice(8),row=kernel.state.read('monsters',id);
  if(!normalMonsterR53(row)||row.channel!==kernel.state.channel)return null;
  monsters.push(id);
 }
 if(!monsters.length||monsters.length>1024||new Set(monsters).size!==monsters.length||footprint.localScope.targets.some(t=>!monsters.includes(t.id)))return null;
 return monsters;
}
