// A potion still executes the complete native SQL/rate/retaliation transaction.
// Only its post-COMMIT refresh may reuse unchanged equipment/service snapshots.
// Any death, reward, scope, gear or unexpected column change takes the full path.
export const POTION_REFRESH_FIELDS=Object.freeze(['hp','hp_revision','respawn_at_ms','potions','auto_potion_remaining','auto_potion_owned','auto_potion_enabled','auto_potion_at_ms','last_seen','last_monster_hit_at','combat_lock_until_ms']);
const fields=new Set(POTION_REFRESH_FIELDS),areas=new Set(['forest','frozen','black','ancient','sanctum']);
export function canRefreshPotion(previous,result,context){
 const row=result?.players?.[0];
 if(context?.input?.action!=='use_potion'||result.players.length!==1||!previous||row?.id!==context.id||previous.id!==row.id||previous.hp<=0||row.hp<=0||!areas.has(row.area)||row.arena_match_id||!Array.isArray(result.encounters)||result.encounters.length!==1||result.encounters[0][0]!==row.id)return false;
 if(result.monsters?.length||result.drop||result.fishing)return false;
 return Object.keys(row).every(key=>fields.has(key)||Object.hasOwn(previous,key)&&Object.is(previous[key],row[key]));
}
