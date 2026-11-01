import {EMPTY_GUILD_BUFF} from './guild-skill.mjs';
export function guildSkillService(){return globalThis.__colGuildSkill;}
export function guildBuff(id){return guildSkillService()?.bonuses(id)??EMPTY_GUILD_BUFF;}
export function guildHpSql(){return guildSkillService()?`COALESCE((SELECT CASE s.active_level WHEN 1 THEN 250 WHEN 2 THEN 350 WHEN 3 THEN 500 ELSE 0 END FROM guild_skills s JOIN guild_members m ON m.guild_id=s.guild_id WHERE m.player_id=players.id AND s.active_until>unixepoch()*1000),0)`:'0';}
export function guildXpSql(alias='p'){return guildSkillService()?`(1+COALESCE((SELECT CASE s.active_level WHEN 1 THEN .05 WHEN 2 THEN .07 WHEN 3 THEN .15 ELSE 0 END FROM guild_skills s JOIN guild_members m ON m.guild_id=s.guild_id WHERE m.player_id=${alias}.id AND s.active_until>unixepoch()*1000),0))`:'1';}
