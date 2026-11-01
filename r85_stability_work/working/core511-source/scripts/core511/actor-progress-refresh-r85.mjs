import {RANK_AREAS} from '../../../native510-bb3a6cc689c6/lib/ranks.mjs';

const rankFields=Object.freeze(['rank_xp',...RANK_AREAS.map(([area])=>'rank_'+area)]);
export const ACTOR_PROGRESS_FIELDS_R85=Object.freeze([...rankFields,'battle_pass_xp']);
const rankShapeFields=Object.freeze(['level','rank_tier','rank_unlocked','rank_cosmetics']);
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const counter=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max;
const has=(row,key)=>Object.hasOwn(row,key);

// Post-COMMIT projection only. Native reward SQL and its rank triggers remain
// authoritative. totalRankBonuses depends on level/tier/unlocks/cosmetics, not
// on XP or quest counters; every change to those inputs still requires a full
// refresh. Never infer a tier, reward, stat, season or missing projection here.
// Return a prepared patch so a whole recipient group can validate atomically.
export function actorProgressPatchR85(previous,row,ownerRow){
 if(!object(previous)||!object(row)||!object(ownerRow))return false;
 const changed=ACTOR_PROGRESS_FIELDS_R85.filter(key=>!Object.is(previous[key],row[key]));
 if(!changed.length)return {};
 if(typeof row.id!=='string'||!row.id||previous.id!==row.id||ownerRow.id!==row.id)return false;
 if(changed.some(key=>!has(previous,key)||!has(row,key)||(has(ownerRow,key)&&!Object.is(ownerRow[key],previous[key]))))return false;
 if(changed.includes('battle_pass_xp')){
  // The cold world has no battle-pass section; its panel reads the DB directly.
  // Retain full reload for a season rollover, reset or incomplete old image.
  if(!counter(previous.battle_pass_xp,9e12)||!counter(row.battle_pass_xp,9e12)||row.battle_pass_xp<previous.battle_pass_xp||
    !has(previous,'battle_pass_season')||!has(row,'battle_pass_season')||typeof previous.battle_pass_season!=='string'||
    !previous.battle_pass_season.length||previous.battle_pass_season.length>80||row.battle_pass_season!==previous.battle_pass_season||
    has(ownerRow,'battle_pass_season')&&ownerRow.battle_pass_season!==previous.battle_pass_season)return false;
 }
 if(!changed.some(key=>rankFields.includes(key)))return {};
 if(rankShapeFields.some(key=>!has(previous,key)||!has(row,key)||!Object.is(previous[key],row[key]))||
   !Number.isSafeInteger(row.level)||row.level<1||!counter(row.rank_tier,18)||typeof row.rank_unlocked!=='string'||typeof row.rank_cosmetics!=='string')return false;
 if(rankFields.some(key=>!has(previous,key)||!has(row,key)||!counter(previous[key],key==='rank_xp'?9e12:100000)||
   !counter(row[key],key==='rank_xp'?9e12:100000)||row[key]<previous[key]))return false;
 const rank=ownerRow.rank;
 if(!object(rank)||!object(rank.kills)||!object(rank.bonuses)||!object(rank.cosmetics)||!Array.isArray(rank.unlocked)||typeof rank.arenaWings!=='boolean'||
   rank.tier!==(previous.level>=65?previous.rank_tier:0)||
   rank.xp!==previous.rank_xp||RANK_AREAS.some(([area])=>!has(rank.kills,area)||rank.kills[area]!==previous['rank_'+area]))return false;
 return {rank:{...rank,xp:row.rank_xp,kills:Object.fromEntries(RANK_AREAS.map(([area])=>[area,row['rank_'+area]]))}};
}
