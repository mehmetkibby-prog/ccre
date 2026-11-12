// Ordinary player-owned actions; no map process, scheduler or polling worker.
export const ZUMRUT_ACTIONS_R93=Object.freeze(['zumrut_view','zumrut_buy','zumrut_begin','zumrut_finish','zumrut_cancel','zumrut_equip']);
const actions=new Set(ZUMRUT_ACTIONS_R93);
export const isZumrutActionR93=action=>actions.has(action);
// These commands never settle combat or touch monsters. Only the acting player
// is held; unrelated combat journals keep their normal checkpoint cadence.
export function zumrutWithoutCombatDrainR93({id,input,footprint,ids,kernel}){
 if(!actions.has(input?.action)||ids.length!==1||ids[0]!==id||footprint.sharedLease||!footprint.resources.every(key=>key==='player:'+id))return false;
 const p=kernel.state.read('players',id);
 return Boolean(p&&p.area==='zumrut'&&p.hp>0&&!p.arena_match_id&&!p.arenaMatchId&&!p.instance_id&&!p.instanceId);
}
