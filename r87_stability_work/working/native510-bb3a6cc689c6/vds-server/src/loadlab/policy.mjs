// V475 R3 explicit row ownership policy. An unlisted table is NEVER deleted.
const words=s=>s.split(/\s+/).filter(Boolean);
export const PLAYER_ONLY=new Set(words(`player_items player_storage_items player_pets player_stones player_onboarding player_evolution_quest afk_hunt_state broken_core_state464 dungeon_materials dungeon_wings dungeon_rewards dungeon_crafts dungeon_event_claims solo_daily_entries solo_entry_receipts solo_key_crafts premium_receipts arena_market_receipts battle_pass_claims battle_pass_purchases battle_pass_receipts expansion456_receipts rune_receipts rune_starter_claims quest_claims438 quest_receipts438 storage_receipts fishing_sessions pvp_reward_cooldowns character_names channel_receipts channel_owners blacksmith_upgrades crystal_chest_openings`));
export const ACCOUNT_ONLY=new Set(words(`auth_sessions auth_tokens game_presence realm_admissions realm_entry_codes launch_access launch_email_outbox launch_email_preferences bot_due`));
export const MONSTER_ONLY=new Set(words(`normal_defeats sinsi_defeats event_island_defeats444`));
export const PLAYER_MONSTER=new Set(words(`monster_participants monster_xp_claims normal_reward_claims sinsi_reward_claims pve_engagements`));
export const PLAYER_ACCOUNT=new Set(words(`account_security_state anti_cheat_event_buckets prereg_rewards`));
export const BOSS_PLAYER=new Set(words(`boss_participants boss_reward_claims`));
// These intentionally survive: a channel write can contain real and test rows,
// and its stream sequence/receipt prevents replay of that already-ACKed frame.
export const RETAIN_OPERATIONAL=new Set(words(`channel_write_receipts channel_write_streams channel_event_ranges`));
export const REFERENCE_KIND={
 player_id:'player',account_id:'account',monster_id:'monster',target_id:'target',
 killer_id:'player',victim_id:'player',owner_id:'player',seller_id:'player',buyer_id:'player',sender_id:'player',recipient_id:'player',peer_id:'player',leader_id:'player',winner_id:'player',purchased_by:'player',invited_by:'player',claimed_by:'player',
 admin_account_id:'account',target_account_id:'account',sender_account_id:'account',redeemed_account_id:'account',redeemed_player_id:'player',admin_id:'player',boss_round:'round',drop_id:'drop',
};
export function references(table,columns){
 if(RETAIN_OPERATIONAL.has(table)||table.startsWith('loadlab_'))return [];
 const out=[];for(const name of columns){let kind=REFERENCE_KIND[name];if(table==='bot_challenges'&&name==='owner')kind='account';if(table==='player_trades'&&['a','b'].includes(name))kind='player';if(table==='security_sanctions'&&['created_by','revoked_by'].includes(name))kind='account';if(kind)out.push({column:name,kind});}
 return out;
}
const present=v=>v!==null&&v!==undefined&&v!=='';
export function rowPolicy(table,row,owned){
 const has=(kind,value)=>present(value)&&owned[kind].has(value);
 const optional=(kind,value)=>!present(value)||has(kind,value);
 if(PLAYER_ONLY.has(table))return has('player',row.player_id);
 if(ACCOUNT_ONLY.has(table))return has('account',row.account_id);
 if(MONSTER_ONLY.has(table))return has('monster',row.monster_id);
 if(PLAYER_MONSTER.has(table))return has('player',row.player_id)&&has('monster',row.monster_id);
 if(PLAYER_ACCOUNT.has(table))return has('account',row.account_id)&&optional('player',row.player_id);
 if(BOSS_PLAYER.has(table))return has('round',row.boss_round)&&has('player',row.player_id);
 if(table==='boss_defeats')return has('round',row.boss_round);
 if(table==='combat_events')return has('player',row.player_id)&&has('target',row.target_id);
 if(table==='war_kill_claims')return has('player',row.killer_id)&&has('player',row.victim_id);
 if(table==='world_drops')return has('player',row.owner_id)&&has('monster',row.monster_id);
 if(table==='dragon_drop_payloads')return has('drop',row.drop_id);
 if(table==='bot_challenges')return has('account',row.owner);
 return false;
}
