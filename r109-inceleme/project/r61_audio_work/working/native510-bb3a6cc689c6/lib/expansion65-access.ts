import {BAZAAR_SPAWN} from './world-layout';
import type {db} from './game-world';
// Revoke a closed preview on resume/rejoin, without touching level or inventory.
export async function repairAncientAccess(database:ReturnType<typeof db>,playerId:string){
 return database.prepare(`UPDATE players SET area='bazaar',arena_match_id='',x=?,y=?,
 movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,
 position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0
 WHERE id=? AND area='ancient' AND (level<50 OR NOT EXISTS(SELECT 1 FROM game_settings s WHERE s.id=1 AND
 (s.expansion65_enabled=1 OR (players.is_gm=1 AND players.id=s.expansion65_preview_player_id)))) RETURNING id`)
 .bind(BAZAAR_SPAWN.x,BAZAAR_SPAWN.y,Date.now(),playerId).first();
}
