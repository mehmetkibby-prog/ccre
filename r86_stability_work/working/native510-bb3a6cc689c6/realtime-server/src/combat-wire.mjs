export const COMBAT_PROTOCOL='authoritative-combat-v1';
export const COMBAT_STREAM_PATH='/internal/combat-stream';
export const COMBAT_BATCH_LIMIT=16;
export const COMBAT_FRAME_LIMIT=196608;
const id=value=>typeof value==='string'&&/^[A-Za-z0-9:_-]{1,120}$/.test(value);
export function combatPayload(value){
 if(value?.area!==undefined&&(typeof value.area!=='string'||value.area.length>96))return null;
 const scope=value?.area===undefined?{}:{area:value.area};
 if(value?.action==='pvp_attack'){
  if(!id(value.intentId)||!id(value.targetPlayerId)||!Number.isInteger(value.ability)||value.ability<0||value.ability>3||!Number.isFinite(value.x)||!Number.isFinite(value.y))return null;
  const result={...scope,action:'pvp_attack',intentId:value.intentId,targetPlayerId:value.targetPlayerId,ability:value.ability,x:value.x,y:value.y};
  if(value.areaTargets!==undefined){if(!Array.isArray(value.areaTargets)||value.areaTargets.length>32||value.areaTargets.some(p=>!p||!id(p.id)||!Number.isSafeInteger(p.spawnRound)||p.spawnRound<0||!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;result.areaTargets=value.areaTargets.map(p=>({id:p.id,spawnRound:p.spawnRound,x:p.x,y:p.y}));}
  return result;
 }
 if(value?.action==='guardian_dash'){
  if(!id(value.intentId)||!Number.isFinite(value.directionX)||!Number.isFinite(value.directionY)||Math.abs(value.directionX)>1||Math.abs(value.directionY)>1)return null;
  return {...scope,action:'guardian_dash',intentId:value.intentId,directionX:value.directionX,directionY:value.directionY};
 }
 if(value?.action!==undefined&&value.action!=='attack')return null;
 if(!value||typeof value!=='object'||!id(value.targetId)||!id(value.intentId)||!Number.isSafeInteger(value.spawnRound)||value.spawnRound<0||!Number.isInteger(value.ability)||value.ability<0||value.ability>3||typeof value.area!=='string'||value.area.length>96)return null;
 const result={action:'attack',targetId:value.targetId,intentId:value.intentId,spawnRound:value.spawnRound,ability:value.ability,area:value.area};
 if(value.areaTargets!==undefined){if(!Array.isArray(value.areaTargets)||value.areaTargets.length>32||value.areaTargets.some(p=>!p||!id(p.id)||!Number.isSafeInteger(p.spawnRound)||p.spawnRound<0||!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;result.areaTargets=value.areaTargets.map(p=>({id:p.id,spawnRound:p.spawnRound,x:p.x,y:p.y}));}
 for(const field of ['x','y','targetX','targetY'])if(value[field]!==undefined){if(!Number.isFinite(value[field]))return null;result[field]=value[field];}
 return result;
}
