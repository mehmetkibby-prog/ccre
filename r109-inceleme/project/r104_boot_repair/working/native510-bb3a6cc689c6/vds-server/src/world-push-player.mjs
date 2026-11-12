// Explicit public contract of ACTIVE_PLAYERS_SQL + createWorldPlayerProjector.
// Never copy a subscriber's arbitrary fields into a shared room. New fields
// require review here, including fields nested inside the public stat objects.
const SCALARS=`id name role is_gm gm_invisible gm_visibility_revision x y position_revision motion_stream_id motion_sequence hp max_hp hp_revision respawn_at_ms essence contribution xp level gems core_coins item_link_orbs afk_tickets enchant_scrolls enchant_add_scrolls fifth_enchant_scrolls auto_potion_owned auto_potion_enabled auto_potion_remaining auto_potion_total stall_skin_owned stall_skin_enabled teleport_skin_owned teleport_skin_enabled teleport_skin_expires_at_ms weapon_skin_owned weapon_skin_enabled weapon_skin_expires_at_ms storage_pages rename_scrolls potions guild_name skill_one skill_two skill_three specialization skill_four has_rod rod_equipped fish_sokan fish_levrek fish_zargana pearls stone_dust xp_ring_until drop_charm_until costume_role has_wings wings_equipped wings_expires_at_ms area channel arena_match_id last_seen core_wings pet_name pet_kind arena_team armor_rarity helmet_rarity weapon_rarity weapon_evolution equipped_weapon_power equipped_armor_power forest_power frozen_power fire_damage ice_damage cast_speed strong_players sword_defense arrow_defense magic_defense resistant_players talismanColor`.split(' ');
const scalars=(source,fields)=>{
 const row={};
 for(const key of fields){
  if(!Object.hasOwn(source,key))continue;
  const value=source[key],type=typeof value;
  if(value===null||type==='string'||type==='number'||type==='boolean')row[key]=value;
 }
 return row;
};
const object=(source,fields)=>source===null?null:scalars(source??{},fields);
export function publicWorldPlayer(player){
 const row=scalars(player,SCALARS);
 if(Object.hasOwn(player,'rank')){
  row.rank=player.rank===null?null:scalars(player.rank??{},['tier','arenaWings']);
  if(player.rank&&Object.hasOwn(player.rank,'bonuses'))row.rank.bonuses=object(player.rank.bonuses,['hp','defense','pve','pvp']);
  if(player.rank&&Object.hasOwn(player.rank,'cosmetics'))row.rank.cosmetics=object(player.rank.cosmetics,['weapon','cape','companion','wings','costume']);
 }
 if(Object.hasOwn(player,'guildBuff'))row.guildBuff=object(player.guildBuff,['attack','hp','xp','until','level','cost']);
 if(Object.hasOwn(player,'premiumBuff'))row.premiumBuff=object(player.premiumBuff,['attack','hp','rationUntil','radiant','essence','pumpkin','pumpkinUntil','monsters']);
 return row;
}
