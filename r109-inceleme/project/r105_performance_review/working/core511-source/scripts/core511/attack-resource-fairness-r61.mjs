import {groupFairnessR57} from './r57-options.mjs';
import {normalPlayerR53,normalMonsterR53} from './r53-options.mjs';
import {rememberDeferredGroupR57,runeFairnessPlayerR99} from './group-fairness-r57.mjs';
import {ordinaryRuneRewardR87} from './rune-reward-scope-r87.mjs';
const fairnessPlayer=row=>normalPlayerR53(row)||runeFairnessPlayerR99(row);
const fairnessMonster=row=>normalMonsterR53(row)||ordinaryRuneRewardR87(row);

export const resourceFairnessR61=groupFairnessR57&&process.env.CORE511_R61_RESOURCE_FAIRNESS==='1';
const proofs=new WeakMap(),scope=(p,view)=>[p.area,p.channel,view.cycle,p.realtime_scope_version];
const sameScope=(p,view,s)=>scope(p,view).every((value,i)=>Object.is(value,s[i]));

// Called only at a native monster busy check, after its action guard. Keep the
// actual native plan union, not client hints or a party-wide actor footprint.
// This proof is private memory bookkeeping and never enters an IPC payload.
export function captureResourceWaitR61(context,plans,view){
 if(!resourceFairnessR61||context?.payload?.action!=='attack'||!fairnessPlayer(context.player)||context.player.hp<=0||context.playerId!==context.player.id||!Array.isArray(plans)||!plans.length||plans.length>512)return null;
 const player=context.player,monsters=[];
 if(player.world_cycle!==view.cycle)return null;
 for(const plan of plans){
  const target=plan.target,current=view.monster(target?.id);
  if(!fairnessMonster(current)||current.hp<=0||current.spawn_round!==target.spawn_round||current.area!==player.area||current.channel!==player.channel)return null;
  monsters.push(current);
 }
 return {id:player.id,input:context.payload,scope:scope(player,view),monsters:[...new Set(monsters)]};
}
export function sealResourceWaitR61(result,proof){if(resourceFairnessR61&&proof)proofs.set(result,proof);return result;}

// Only the source actor waits. Other actors' nonterminal hits and unrelated
// potions retain their existing routes; no resource lease is acquired here.
export function rememberResourceWaitR61(result,{id,epoch,input,inputOrder,kernel},view){
 if(!resourceFairnessR61)return false;
 const proof=proofs.get(result);if(!proof)return false;proofs.delete(result);
 const player=view.player(id),actor=kernel.players.get(id),owner=kernel.state.owners.get(id);
 if(proof.id!==id||proof.input!==input||!Number.isSafeInteger(inputOrder)||!fairnessPlayer(player)||player.hp<=0||!sameScope(player,view,proof.scope)||player.channel!==kernel.state.channel||!actor||actor.epoch!==epoch||owner?.epoch!==epoch||owner.state!=='active'||actor.barrier||actor.suspended||actor.passive||actor.externalHold)return false;
 if(proof.monsters.some(row=>view.monster(row.id)!==row||!fairnessMonster(row)||row.hp<=0||row.area!==player.area||row.channel!==player.channel))return false;
 rememberDeferredGroupR57({kernel,id,input,inputOrder,ids:[id],resources:proof.monsters.map(row=>'monster:'+row.id)});
 return true;
}
