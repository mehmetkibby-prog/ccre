// R102: native snapshot projection with champion columns in the existing batch read.
import {arenaWingsOwned477,arenaWingsActive477,grantArenaWings477,resumeArenaWings477,projectArenaWingAppearance477} from '../../../native510-bb3a6cc689c6/lib/arena-wings477.mjs';
import {RANK_AREAS, totalRankBonuses, validateRankConfig} from '../../../native510-bb3a6cc689c6/lib/ranks.mjs';
import {EXTRA_COLUMNS} from '../../../native510-bb3a6cc689c6/lib/extra-products.mjs';
import {EMPTY_GUILD_BUFF, guildSkillLevel} from '../../../native510-bb3a6cc689c6/lib/guild-skill.mjs';
import {extraBuff} from '../../../native510-bb3a6cc689c6/vds-server/src/extra-products.mjs';

// Runs inside the reader's current WAL snapshot. Only validated configuration
// is reused, and only while its exact JSON is unchanged; no player-state cache.
export function createWorldPlayerProjector(read) {
  let configJson, config;
  return (rows, ownerId, snapshotAtMs) => {
    if (!rows.length) return rows;
    const ids=rows.map(p=>p.id), slots=ids.map(()=>'?').join(',');
    const settings=read('SELECT config_json FROM rank_settings WHERE id=1',[])[0];
    if(settings.config_json!==configJson){config=validateRankConfig(JSON.parse(settings.config_json));configJson=settings.config_json;}
    const states=new Map(read(`SELECT id,champion_level_r102,champion_xp_r102,specialization,skill_four,attack_four_at,special_guard_until_ms,level,rune_attack_level,rune_defense_level,rune_hp_level,rank_tier,rank_xp,rank_forest,rank_frozen,rank_black,rank_ancient,rank_cosmetics,rank_unlocked,${EXTRA_COLUMNS.join(',')} FROM players WHERE id IN (${slots})`,ids).map(p=>[p.id,p]));
    const guilds=new Map(read(`SELECT m.player_id,s.active_level,s.active_until FROM guild_members m JOIN guild_skills s ON s.guild_id=m.guild_id WHERE s.active_until>? AND m.player_id IN (${slots})`,[snapshotAtMs,...ids]).map(s=>[s.player_id,{...guildSkillLevel(s.active_level),until:s.active_until}]));
    const equipment=read(`SELECT i.player_id,i.kind,i.enchantments,(i.rarity='emerald' AND EXISTS(SELECT 1 FROM content_forge_r102 f WHERE f.item_id=i.id)) AS infinite_emerald FROM player_items i WHERE i.equipped=1 AND i.kind IN ('weapon','armor') AND (i.expires_at_ms=0 OR i.expires_at_ms>?) AND i.player_id IN(${slots})`,[snapshotAtMs,...ids]);
    const weapons=new Map(equipment.filter(i=>i.kind==='weapon').map(i=>[i.player_id,JSON.parse(i.enchantments||'[]')]));
    const infiniteArmor=new Set(equipment.filter(i=>i.kind==='armor'&&i.infinite_emerald).map(i=>i.player_id));
    const infiniteWeapon=new Set(equipment.filter(i=>i.kind==='weapon'&&i.infinite_emerald).map(i=>i.player_id));
    return rows.map(p=>{
      const state=states.get(p.id),owner=p.id===ownerId,tier=state?.level>=65?state.rank_tier:0;
      const rank=state?{tier,championLevel:state.champion_level_r102,championXp:owner?state.champion_xp_r102:undefined,bonuses:{...totalRankBonuses(state,config),champion:state.champion_level_r102/5},cosmetics:tier?JSON.parse(state.rank_cosmetics):{},...(owner?{xp:state.rank_xp,kills:Object.fromEntries(RANK_AREAS.map(([a])=>[a,state[`rank_${a}`]])),unlocked:JSON.parse(state.rank_unlocked)}:{})}:null;
      const privateState=owner&&state?Object.fromEntries([...EXTRA_COLUMNS,'specialization','skill_four','attack_four_at','special_guard_until_ms','rune_attack_level','rune_defense_level','rune_hp_level'].map(key=>[key,state[key]])):{};
      return {...p,...privateState,...(owner?{arena_wings_owned:Number(arenaWingsOwned477(state,snapshotAtMs)),arena_wings_equipped:Number(arenaWingsActive477(state,snapshotAtMs))}:{}),specialization:state?.specialization??'',skill_four:state?.skill_four??1,
        ...(p.equipped_armor_power!==undefined?{equipped_armor_power:p.equipped_armor_power+(rank?.bonuses.defense??0)}:{}),
        ...(p.strong_players!==undefined?{strong_players:p.strong_players+(rank?.bonuses.pvp??0)}:{}),
        rank:rank?{...rank,emeraldInfiniteArmor:infiniteArmor.has(p.id),emeraldInfiniteWeapon:infiniteWeapon.has(p.id),arenaWings:arenaWingsActive477(state,snapshotAtMs),cosmetics:arenaWingsActive477(state,snapshotAtMs)?{...rank.cosmetics,wings:null}:rank.cosmetics}:rank,guildBuff:guilds.get(p.id)??EMPTY_GUILD_BUFF,premiumBuff:extraBuff(state,snapshotAtMs),
        talismanColor:weapons.get(p.id)?.find(e=>e.kind==='stone_talisman_color')?.value??0};
    });
  };
}
