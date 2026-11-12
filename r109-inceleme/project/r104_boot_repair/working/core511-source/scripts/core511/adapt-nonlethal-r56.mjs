// Reversible insertion into the R55 generated writer only. No native formulas.
export const oldNonlethalAnchorR56='if(includeRewards465){';
export const newNonlethalAnchorR56='if(includeRewards465 && ports.skipNonlethalRewardsR56?.(target,rolled)!==true){';
export function adaptNonlethalR56(source){
 if(source.split(oldNonlethalAnchorR56).length!==3)throw Error('r56_nonlethal_anchor_count');
 return source.replaceAll(oldNonlethalAnchorR56,newNonlethalAnchorR56)
  .replace('player.role !== "muhafiz" ? 4 : 1;', 'player.role !== "muhafiz" ? (ports.hitGroupSizeR56??4) : 1;')
  .replace('Promise.allSettled(hitPlans.map((plan) => database.batch(plan.hitStatements)))', '(ports.batchHitsR56?ports.batchHitsR56(database,hitPlans).map(value=>({status:"fulfilled",value})):Promise.allSettled(hitPlans.map((plan) => database.batch(plan.hitStatements))))');
}

export function inverseNonlethalR56(source){return source.replaceAll(newNonlethalAnchorR56,oldNonlethalAnchorR56).replace('player.role !== "muhafiz" ? (ports.hitGroupSizeR56??4) : 1;','player.role !== "muhafiz" ? 4 : 1;').replace('(ports.batchHitsR56?ports.batchHitsR56(database,hitPlans).map(value=>({status:"fulfilled",value})):Promise.allSettled(hitPlans.map((plan) => database.batch(plan.hitStatements))))','Promise.allSettled(hitPlans.map((plan) => database.batch(plan.hitStatements)))');}
