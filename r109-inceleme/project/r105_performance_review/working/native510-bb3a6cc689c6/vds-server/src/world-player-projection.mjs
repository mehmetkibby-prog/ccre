import {arenaWingsOwned477,arenaWingsActive477,grantArenaWings477,resumeArenaWings477,projectArenaWingAppearance477} from '../../lib/arena-wings477.mjs';
import {RANK_AREAS, totalRankBonuses, validateRankConfig} from '../../lib/ranks.mjs';
import {EXTRA_COLUMNS} from '../../lib/extra-products.mjs';
import {EMPTY_GUILD_BUFF, guildSkillLevel} from '../../lib/guild-skill.mjs';
import {extraBuff} from './extra-products.mjs';

// Runs inside the reader's current WAL snapshot. Only validated configuration
// is reused, and only while its exact JSON is unchanged; no player-state cache.
export function createWorldPlayerProjector(read) {
  let configJson, config;
  return (rows, ownerId, snapshotAtMs) => {
    if (!rows.length) return rows;
    const ids=rows.map(p=>p.id), slots=ids.map(()=>'?').join(',');
    const settings=read('SELECT config_json FROM rank_settings WHERE id=1',[])[0];
    if(settings.config_json!==configJson){config=validateRankConfig(JSON.parse(settings.config_json));configJson=settings.config_json;}
    const states=new Map(read(`SELECT id,specialization,skill_four,attack_four_at,special_guard_until_ms,level,rune_attack_level,rune_defense_level,rune_hp_level,rank_tier,rank_xp,rank_forest,rank_frozen,rank_black,rank_ancient,rank_cosmetics,rank_unlocked,${EXTRA_COLUMNS.join(',')} FROM players WHERE id IN (${slots})`,ids).map(p=>[p.id,p]));
    const guilds=new Map(read(`SELECT m.player_id,s.active_level,s.active_until FROM guild_members m JOIN guild_skills s ON s.guild_id=m.guild_id WHERE s.active_until>? AND m.player_id IN (${slots})`,[snapshotAtMs,...ids]).map(s=>[s.player_id,{...guildSkillLevel(s.active_level),until:s.active_until}]));
    const weapons=new Map(read(`SELECT player_id,enchantments FROM player_items WHERE equipped=1 AND kind='weapon' AND player_id IN(${slots})`,ids).map(i=>[i.player_id,JSON.parse(i.enchantments||'[]')]));
    return rows.map(p=>{
      const state=states.get(p.id),owner=p.id===ownerId,tier=state?.level>=65?state.rank_tier:0;
      const rank=state?{tier,bonuses:totalRankBonuses(state,config),cosmetics:tier?JSON.parse(state.rank_cosmetics):{},...(owner?{xp:state.rank_xp,kills:Object.fromEntries(RANK_AREAS.map(([a])=>[a,state[`rank_${a}`]])),unlocked:JSON.parse(state.rank_unlocked)}:{})}:null;
      const privateState=owner&&state?Object.fromEntries([...EXTRA_COLUMNS,'specialization','skill_four','attack_four_at','special_guard_until_ms','rune_attack_level','rune_defense_level','rune_hp_level'].map(key=>[key,state[key]])):{};
      return {...p,...privateState,...(owner?{arena_wings_owned:Number(arenaWingsOwned477(state,snapshotAtMs)),arena_wings_equipped:Number(arenaWingsActive477(state,snapshotAtMs))}:{}),specialization:state?.specialization??'',skill_four:state?.skill_four??1,
        ...(p.equipped_armor_power!==undefined?{equipped_armor_power:p.equipped_armor_power+(rank?.bonuses.defense??0)}:{}),
        ...(p.strong_players!==undefined?{strong_players:p.strong_players+(rank?.bonuses.pvp??0)}:{}),
        rank:rank?{...rank,arenaWings:arenaWingsActive477(state,snapshotAtMs),cosmetics:arenaWingsActive477(state,snapshotAtMs)?{...rank.cosmetics,wings:null}:rank.cosmetics}:rank,guildBuff:guilds.get(p.id)??EMPTY_GUILD_BUFF,premiumBuff:extraBuff(state,snapshotAtMs),
        talismanColor:weapons.get(p.id)?.find(e=>e.kind==='stone_talisman_color')?.value??0};
    });
  };
}
