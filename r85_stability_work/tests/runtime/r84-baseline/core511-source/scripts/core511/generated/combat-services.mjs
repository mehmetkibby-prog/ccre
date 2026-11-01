import {totalRankBonuses,validateRankConfig,RANK_AREAS} from "../../../../native510-bb3a6cc689c6/lib/ranks.mjs";
import {arenaWingsActive477} from "../../../../native510-bb3a6cc689c6/lib/arena-wings477.mjs";
import {runeEligible,validateRuneConfig} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {validateRuneV2Config,RUNE_V2_AREA} from "../../../../native510-bb3a6cc689c6/lib/rune-v2.mjs";
import {statusBonus,validateStatusConfig} from "../../../../native510-bb3a6cc689c6/lib/status.mjs";
export {extraBuff} from "../../../../native510-bb3a6cc689c6/vds-server/src/extra-products.mjs";
export {guildSkillLevel,EMPTY_GUILD_BUFF} from "../../../../native510-bb3a6cc689c6/lib/guild-skill.mjs";
export {infiniteEquipmentPower} from "../../../../native510-bb3a6cc689c6/lib/infinite-power.mjs";
function runeMonsterKey(monster){return monster?.area==='rune'?String(monster.id).match(/^rune-(tide|warden|sentinel|wraith)-c[1-4]-\d+$/)?.[1]??null:null;}
const isRuneV2Boss=id=>typeof id==='string'&&/^rune-v2-boss-c[1-4]-1$/.test(id);
function runeV2MonsterKey(monster){if(monster?.area!==RUNE_V2_AREA)return null;return isRuneV2Boss(monster.id)?'boss':String(monster.id).match(/^rune-v2-(tide|warden|sentinel|wraith)-c[1-4]-[1-5]$/)?.[1]??null;}
export function createCombatServices({player,rank,rune,runeV2,status,profiles}){
 const rankConfig=validateRankConfig(rank),current={config:validateRuneConfig(rune)},runeV2Config=validateRuneV2Config(runeV2),statusConfig=validateStatusConfig(status);
 const globalThis={__colStatus:{bonus:(p,stat)=>statusBonus(p,stat,statusConfig)}};
 const settings=()=>({config:rankConfig});const info=(p,privateState=true)=>{const tier=p.level>=65?p.rank_tier:0;return {tier,arenaWings:arenaWingsActive477(p),bonuses:totalRankBonuses(p,settings().config),cosmetics:tier?JSON.parse(p.rank_cosmetics):{},...(privateState?{xp:p.rank_xp,kills:Object.fromEntries(RANK_AREAS.map(([a])=>[a,p[`rank_${a}`]])),unlocked:JSON.parse(p.rank_unlocked)}:{})};};const nativeRank={bonuses(id){const p=player(id);return totalRankBonuses(p,settings().config);},project(rows,ownerId){if(!rows.length)return rows;const states=new Map(rows.map(p=>player(p.id)).filter(Boolean).map(p=>[p.id,p]));return rows.map(p=>{const rank=states.has(p.id)?info(states.get(p.id),p.id===ownerId):null;return {...p,...(p.id===ownerId&&states.has(p.id)?Object.fromEntries(['rune_attack_level','rune_defense_level','rune_hp_level'].map(k=>[k,states.get(p.id)[k]])):{}),...(p.equipped_armor_power!==undefined?{equipped_armor_power:p.equipped_armor_power+(rank?.bonuses.defense??0)}:{}),...(p.strong_players!==undefined?{strong_players:p.strong_players+(rank?.bonuses.pvp??0)}:{}),rank};});}},ranks=new Map();
 const cachedRank=id=>{const p=player(id);if(!p){ranks.delete(id);return Object.freeze(nativeRank.bonuses(id));}const old=ranks.get(id);if(old&&old.level===p.level&&old.tier===p.rank_tier&&old.unlocked===p.rank_unlocked&&old.cosmetics===p.rank_cosmetics)return old.result;
  const result=Object.freeze(nativeRank.bonuses(id));ranks.set(id,{level:p?.level,tier:p?.rank_tier,unlocked:p?.rank_unlocked,cosmetics:p?.rank_cosmetics,result});return result;};
 return Object.freeze({__colStatus:globalThis.__colStatus,__colRanks:Object.freeze({bonuses:cachedRank,settings,project:nativeRank.project,forget:id=>ranks.delete(id)}),__colRunes:Object.freeze({factor(p,stat){return 1+(runeEligible(p)?(Number(p['rune_'+stat+'_level'])||0)*current.config.bonusPerLevel/100:0)+(globalThis.__colStatus?.bonus(p,stat)??0);},settings:()=>current,monster(m){const key=runeMonsterKey(m);return key?current.config.monsters[key]:null;}}),
 __colRuneV2:Object.freeze({settings:()=>({config:runeV2Config}),monster:m=>{const key=runeV2MonsterKey(m);return key?runeV2Config.monsters[key]:null;}}),
 __colEventIsland444:Object.freeze({profile:m=>profiles.get(typeof m==='string'?m:m.id)})});
}
