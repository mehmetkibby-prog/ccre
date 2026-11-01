import {completeLocalRewardsR57} from './r57-options.mjs';
// A bounded ordinary 33..64-death group already holds every reward recipient.
// Finishing its original native awards now avoids additional party barriers
// and client claim round trips. Larger/special/shared fights keep R56 slices.
export function localRewardBudgetR57(payload,area,killed,legacy){
 if(!completeLocalRewardsR57||payload.sharedLease||!['forest','frozen','ancient'].includes(area)||killed.length<=32||killed.length>64||!['kill','mixed'].includes(payload.localScope?.kind))return legacy;
 const targets=payload.localScope.targets,resources=payload.resources;
 if(!Array.isArray(targets)||targets.length>64||!Array.isArray(resources)||new Set(resources.filter(k=>k.startsWith('player:'))).size>25)return legacy;
 const held=new Set(targets.map(t=>t.id));if(!killed.every(id=>held.has(id)&&resources.includes('monster:'+id)))return legacy;
 return Math.max(legacy,64);
}
