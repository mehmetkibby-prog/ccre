import {CONTENT_ACTIONS_R102} from '../content-model-r102.mjs';
import {ZUMRUT_ACTIONS_R93} from '../zumrut-actions-r93.mjs';
import {castleEnabled} from '../castle-model-r59.mjs';
import {ADVENTURE_ACTIONS} from '../adventure-maps.mjs';
import {BELT_ACTIONS_R31} from '../belt-model.mjs';
// Mechanically extracted native action dispatch catalogue.
export const NATIVE_ACTIONS=Object.freeze([...CONTENT_ACTIONS_R102,...ZUMRUT_ACTIONS_R93,'travel_zumrut',...(castleEnabled()?['castle_enter_r59','castle_leave_r59']:[]),...ADVENTURE_ACTIONS,...BELT_ACTIONS_R31,"bulk_exchange_essence","claim_rewards","donate","respawn","collect","use_potion","guardian_dash","start_fishing","fishing_input","finish_fishing","cancel_fishing","sell_fish","arena_join_queue","arena_cancel_queue","arena_ack_result","invite_party","reject_party","accept_party","kick_party","leave_party","travel_event","travel_dragon","travel_rune_v2","travel_rune","travel_ancient","travel_afk","travel_market","travel_forest","travel_frozen","travel_fishing","travel_sanctum","travel_sinsi","travel_war","travel_black"]);
