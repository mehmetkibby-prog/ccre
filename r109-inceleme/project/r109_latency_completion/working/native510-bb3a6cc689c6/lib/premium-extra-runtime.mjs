import {pumpkinSql499} from './pumpkin499.mjs';
export function extraService(){return globalThis.__colPremium;}
export function premiumBuff(id){return extraService()?.buff(id)??{attack:0,hp:0,radiant:false,essence:0};}
export function premiumHpSql(alias='players'){return extraService()?`((CASE WHEN ${alias}.ration_until>unixepoch()*1000 THEN 200 ELSE 0 END)+(CASE WHEN ${pumpkinSql499(alias)} THEN 1000 ELSE 0 END))`:'0';}
export function premiumXpSql(alias='p'){return extraService()?`(CASE WHEN ${pumpkinSql499(alias)} THEN 1.25 WHEN ${alias}.radiant_enabled=1 AND ${alias}.radiant_until>unixepoch()*1000 THEN 1.2 WHEN EXISTS(SELECT 1 FROM player_items WHERE player_id=${alias}.id AND kind='costume' AND equipped=1) THEN 1.2 ELSE 1 END)`:`(CASE WHEN EXISTS(SELECT 1 FROM player_items WHERE player_id=${alias}.id AND kind='costume' AND equipped=1) THEN 1.2 ELSE 1 END)`;}
export function wisdomSql(){return extraService()?'(CASE WHEN players.wisdom_until>unixepoch()*1000 THEN 1.25 ELSE 1 END)':'1';}
