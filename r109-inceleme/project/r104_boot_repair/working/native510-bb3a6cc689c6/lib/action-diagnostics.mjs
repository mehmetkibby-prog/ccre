// Closed diagnostic vocabulary: never retain caller-controlled labels or payloads.
const names=new Set(`open_crystal_chest open_moonlight_chest join move heartbeat claim_rewards attack collect donate hurt respawn equip unequip exchange_essence buy_potion use_potion sell_item sell_rarity upgrade_skill upgrade_unique craft_stone socket_stone evolve_weapon buy_wings equip_wings unequip_wings buy_pet toggle_pet rename_pet travel_dragon travel_ancient travel_afk travel_market travel_forest travel_frozen travel_sanctum create_shop create_listing cancel_listing buy_listing storage_deposit storage_withdraw travel_fishing buy_rod equip_rod start_fishing fishing_input finish_fishing cancel_fishing sell_fish invite_party accept_party reject_party leave_party kick_party friend_add friend_remove friend_accept friend_reject friend_cancel select_channel travel_sinsi travel_war travel_black pvp_attack arena_join_queue arena_cancel_queue arena_ack_result guardian_dash`.split(' '));
export const diagnosticAction=value=>typeof value==='string'&&names.has(value)?value:'unknown';
const gameplayRejections=new Set(`open_crystal_chest open_moonlight_chest unequip exchange_essence buy_potion sell_item sell_rarity upgrade_skill upgrade_unique craft_stone socket_stone evolve_weapon buy_wings equip_wings unequip_wings buy_pet toggle_pet rename_pet travel_dragon travel_ancient travel_afk travel_market travel_forest travel_frozen travel_sanctum create_shop create_listing cancel_listing buy_listing storage_deposit storage_withdraw travel_fishing buy_rod equip_rod start_fishing fishing_input finish_fishing cancel_fishing sell_fish invite_party accept_party reject_party leave_party kick_party friend_add friend_remove friend_accept friend_reject friend_cancel select_channel travel_sinsi travel_war travel_black arena_join_queue arena_cancel_queue arena_ack_result`.split(' '));
export function expectedActionRejection(action,status,failure){
 // Caught exceptions (including auth/CSRF/session/rate limits) and 5xx always
 // remain errors. Only explicit business validation responses are exclusions.
 if(failure)return failure==='channel_full'&&status===409;
 if(![400,403,404,409,422].includes(status))return false;
 if(gameplayRejections.has(action))return true;
 // These handlers also use 409 for unexpected state/health failures; retain it.
 return (action==='equip'||action==='join'||action==='donate')&&[400,404].includes(status);
}
