import {castleEnabled} from './castle-model-r59.mjs';
export const nativeGuildCapacitySqlR59="CREATE TRIGGER guild_member_capacity BEFORE INSERT ON guild_members BEGIN\n SELECT CASE WHEN (SELECT COUNT(*) FROM guild_members WHERE guild_id=NEW.guild_id)>=40 THEN RAISE(ABORT,'Lonca dolu: en fazla 40 \u00fcye.') END;\n SELECT CASE WHEN EXISTS(SELECT 1 FROM guild_war_locks WHERE guild_id=NEW.guild_id) THEN RAISE(ABORT,'Sava\u015f s\u0131ras\u0131nda \u00fcyelik de\u011fi\u015ftirilemez.') END;\nEND";
export const guildCapacitySqlR59="CREATE TRIGGER guild_member_capacity BEFORE INSERT ON guild_members BEGIN\n SELECT CASE WHEN EXISTS(SELECT 1 FROM guild_war_locks WHERE guild_id=NEW.guild_id) THEN RAISE(ABORT,'Sava\u015f s\u0131ras\u0131nda \u00fcyelik de\u011fi\u015ftirilemez.') END;\nEND";
export const guildCapacityHashR59="1854a960a8f2804bd53d5d726ff055e095b1c05ced4939e0bba251b76ecf62fa";
// Remove only membership count; keep native war locks and invitation authority.
export function installGuildCapacityR59(sql,{enabled=castleEnabled()}={}){
 const current=sql.prepare("SELECT sql FROM sqlite_schema WHERE type='trigger' AND name='guild_member_capacity'").get()?.sql;
 if(current!==nativeGuildCapacitySqlR59&&current!==guildCapacitySqlR59)throw Error('guild_capacity_definition_changed');
 const next=enabled?guildCapacitySqlR59:nativeGuildCapacitySqlR59;if(current===next)return;
 if(!sql.isTransaction)throw Error('guild_capacity_atomic_required');sql.exec('DROP TRIGGER guild_member_capacity');sql.exec(next);
}
