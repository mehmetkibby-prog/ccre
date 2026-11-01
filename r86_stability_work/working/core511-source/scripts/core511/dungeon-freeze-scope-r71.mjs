import {demand} from './contract.mjs';
import {prepareCached477} from './writer-statements.mjs';
// A room checkpoint needs every live/passive room member. Resolve the CURRENT
// durable membership after the previous shared terminal has finished, before
// quiescing anyone. Party membership or client-supplied IDs cannot broaden it.
export function dungeonFreezeActorsR71(sql, ids) {
 const result = new Set(ids);
 const members = prepareCached477(sql, 'SELECT b.player_id FROM dungeon_members a JOIN dungeon_members b ON b.run_id=a.run_id WHERE a.player_id=?');
 for (const id of ids) for (const row of members.all(id)) result.add(row.player_id);
 demand(result.size <= 100, 'permanent_dungeon_scope_capacity');
 return [...result];
}
