// R31: preserve the native day and transaction contract; only the limit is 30.
// The pinned native module and its one-time schema/backfill stay unchanged.
export {groupDay494,ensureGroupLimit494} from '../../../native510-bb3a6cc689c6/lib/group-dungeon-limit494.mjs';
import {groupDay494} from '../../../native510-bb3a6cc689c6/lib/group-dungeon-limit494.mjs';
export const GROUP_DAILY_LIMIT494=30;
const exhausted=()=>new Error('Çekirdeğin Kalbi: bir üye günlük 30 giriş hakkını kullandı. Haklar Türkiye saatiyle 00.00’da yenilenir.');
export function assertGroupLimit494(player,now){
 if(Number(player.group_dungeon_day494)===groupDay494(now)&&Number(player.group_dungeon_entries494)>=GROUP_DAILY_LIMIT494)throw exhausted();
}
export function consumeGroupLimit494(db,ids,now){
 if(!db.isTransaction)throw new Error('group_limit494_start_transaction_required');
 if(ids.length<1||ids.length>5||new Set(ids).size!==ids.length)throw new Error('group_limit494_roster_invalid');
 const day=groupDay494(now);
 const update=db.prepare('UPDATE players SET group_dungeon_entries494=CASE WHEN group_dungeon_day494=? THEN group_dungeon_entries494+1 ELSE 1 END,group_dungeon_day494=? WHERE id=? AND (group_dungeon_day494<>? OR group_dungeon_entries494<?)');
 for(const id of ids)if(update.run(day,day,id,day,GROUP_DAILY_LIMIT494).changes!==1)throw exhausted();
}
