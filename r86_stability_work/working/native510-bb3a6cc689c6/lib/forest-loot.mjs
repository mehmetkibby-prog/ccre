export function forestLootMultiplier(sourceKey,level,policy={}){
 const source=String(sourceKey),playerLevel=Number(level);
 const after=Number.isInteger(policy.forest_after_level)?policy.forest_after_level:30;
 const reduction=Number.isFinite(policy.forest_reduction_percent)?Math.max(0,Math.min(100,policy.forest_reduction_percent)):30;
 const reduced=source.startsWith('forest.')?playerLevel>after:source.startsWith('frozen.')?playerLevel>=40:source.startsWith('black.')?playerLevel>=50:false;
 return reduced?1-reduction/100:1;
}
