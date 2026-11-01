// Compiled from the exact native participant CASE predicates; only C4 IDs extend.
export {runeV2RealPlayerSql483} from "../../../../native510-bb3a6cc689c6/lib/rune-v2-ranking.mjs";
const eq=(a,b)=>a!=null&&b!=null&&a===b,gt=(a,b)=>a!=null&&b!=null&&a>b,cat=(a,b)=>a==null||b==null?null:String(a)+String(b);
export function nativeRankedHit(actor,victim,runeEligible){
 if(/^stone-boss-black-c[1-4]$/.test(victim.id))return true;
 if(victim.id==='dragon-world-1')return (((((((((eq(actor.is_gm,0)&&eq(actor.loadlab_run_id,""))&&eq(actor.area,victim.area))&&(eq(victim.channel,0)||eq(actor.channel,victim.channel)))&&eq(actor.arena_match_id,""))&&gt(actor.hp,0))&&eq(victim.area,"dragon"))&&eq(victim.channel,0))&&eq(victim.loadlab_run_id,""))&&eq(victim.id,"dragon-world-1"));
 if(/^rune-v2-boss-c[1-4]-1$/.test(victim.id))return ((((((((runeEligible===true)&&eq(actor.area,victim.area))&&eq(actor.channel,victim.channel))&&eq(actor.arena_match_id,""))&&gt(actor.hp,0))&&eq(victim.area,"rune_v2"))&&eq(victim.loadlab_run_id,""))&&eq(victim.id,cat(cat("rune-v2-boss-c",victim.channel),"-1")));
 return false;
}
