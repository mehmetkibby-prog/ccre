import {extraBuff} from '../../../native510-bb3a6cc689c6/vds-server/src/extra-products.mjs';
import {arenaWingsActive477} from '../../../native510-bb3a6cc689c6/lib/arena-wings477.mjs';
import {EMPTY_GUILD_BUFF} from '../../../native510-bb3a6cc689c6/lib/guild-skill.mjs';

// Re-evaluate the native pure entitlement functions at their actual deadlines.
// Never overwrite inventory/HP or expose a private column in a public row.
export function timedPlayerView(row,live,now){
 let next=row;
 if(Object.hasOwn(row,'premiumBuff')&&Object.hasOwn(live,'ration_until'))next={...next,premiumBuff:extraBuff(live,now)};
 if(row.rank&&Object.hasOwn(live,'arena_wings_equipped'))next={...next,rank:{...row.rank,arenaWings:arenaWingsActive477(live,now)}};
 if(row.guildBuff?.until>0&&row.guildBuff.until<=now)next={...next,guildBuff:EMPTY_GUILD_BUFF};
 return next;
}
export function timedPlayerDeadline(row,live,now){
 return Math.min(Infinity,...[live.ration_until,live.radiant_until,live.essence_until,live.pumpkin_until499,live.arena_wings_expires_at_ms,row.guildBuff?.until].filter(at=>Number.isFinite(at)&&at>now));
}
