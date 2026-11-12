import {guildSkillService} from './guild-skill-runtime.mjs';
import {EMPTY_RANK_BONUSES,rankRewardHpSql} from './ranks.mjs';
export function rankService(){return (globalThis as any).__colRanks;}
export function serverRankBonuses(id:string){return rankService()?.bonuses(id)??EMPTY_RANK_BONUSES;}
export function withRankPlayers(rows:any[],ownerId:string){const ranked=rankService()?.project(rows,ownerId)??rows;const guilded=guildSkillService()?.project(ranked)??ranked;return (globalThis as any).__colPremium?.project(guilded,ownerId)??guilded;}
export function rankHpSql(){return rankService()?`(${rankRewardHpSql()}+COALESCE((SELECT SUM(CAST(json_extract(value,'$.hp') AS INTEGER)) FROM json_each((SELECT config_json FROM rank_settings WHERE id=1),'$.tiers') WHERE CAST(key AS INTEGER)<players.rank_tier AND players.level>=65),0))`:'0';}
