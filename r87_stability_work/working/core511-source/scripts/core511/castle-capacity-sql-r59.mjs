import {createHash} from 'node:crypto';
import {castleEnabled} from './castle-model-r59.mjs';
// Exact reversible extension of the native heartbeat/reentry capacity guard.
// Only authenticated, fenced castle entries receive the shared 100-player
// ceiling. Ordinary channel admissions retain their original SQL and limit.
export const nativeCapacitySqlR59="CREATE TRIGGER channel_capacity_reentry\n BEFORE UPDATE OF channel,last_seen ON players\n WHEN NEW.last_seen >= unixepoch()-30\n AND (OLD.channel != NEW.channel OR OLD.last_seen < unixepoch()-30)\n AND (SELECT COUNT(*) FROM players WHERE channel=NEW.channel AND id!=OLD.id AND last_seen>=unixepoch()-30) >= COALESCE((SELECT MAX(1,MIN(30,CAST(channel_capacity AS INTEGER))) FROM game_settings WHERE id=1),15)\n BEGIN SELECT RAISE(ABORT, 'channel_full'); END";
export const castleCapacitySqlR59="CREATE TRIGGER channel_capacity_reentry\n BEFORE UPDATE OF channel,last_seen ON players\n WHEN NEW.last_seen >= unixepoch()-30\n AND (OLD.channel != NEW.channel OR OLD.last_seen < unixepoch()-30)\n AND CASE WHEN NEW.channel=4 AND NEW.area IN ('guild_castle','bazaar') AND EXISTS(SELECT 1 FROM castle_entries_r59 WHERE player_id=NEW.id) THEN (SELECT COUNT(*) FROM kernel511_admissions WHERE channel=4 AND player_id!=NEW.id)>=100 ELSE (SELECT COUNT(*) FROM players WHERE channel=NEW.channel AND id!=OLD.id AND last_seen>=unixepoch()-30) >= COALESCE((SELECT MAX(1,MIN(30,CAST(channel_capacity AS INTEGER))) FROM game_settings WHERE id=1),15) END\n BEGIN SELECT RAISE(ABORT, 'channel_full'); END";
export const castleCapacityHashR59="0e63b739034defc88ba94a7be738838b683a6b22794233fe00e1a1ebde95a877";
const hash=s=>createHash('sha256').update(s).digest('hex');
export function installCastleCapacityR59(sql,{enabled=castleEnabled()}={}){
 const current=sql.prepare("SELECT sql FROM sqlite_schema WHERE type='trigger' AND name='channel_capacity_reentry'").get()?.sql;
 if(current!==nativeCapacitySqlR59&&current!==castleCapacitySqlR59)throw Error('castle_capacity_definition_changed');
 const next=enabled?castleCapacitySqlR59:nativeCapacitySqlR59;
 if(current===next)return;
 if(!sql.isTransaction)throw Error('castle_capacity_atomic_required');
 sql.exec('DROP TRIGGER channel_capacity_reentry');sql.exec(next);
 if(hash(sql.prepare("SELECT sql FROM sqlite_schema WHERE name='channel_capacity_reentry'").get().sql)!==hash(next))throw Error('castle_capacity_install_mismatch');
}
