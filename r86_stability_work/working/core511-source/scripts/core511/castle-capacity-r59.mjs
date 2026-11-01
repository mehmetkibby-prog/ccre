import {castleEnabled,CASTLE_AREA,CASTLE_CHANNEL,CASTLE_CAPACITY} from './castle-model-r59.mjs';
export const residentCapacityR59=channel=>castleEnabled()&&channel===CASTLE_CHANNEL?CASTLE_CAPACITY:25;
export function castleResumeR59(sql,id,channel){return castleEnabled()&&channel===CASTLE_CHANNEL&&!!sql.prepare("SELECT 1 FROM players p JOIN castle_entries_r59 e ON e.player_id=p.id WHERE p.id=? AND p.channel=? AND p.area IN ('guild_castle','bazaar')").get(id,channel);}
export function channelAdmissionR59(sql,id,channel,{transfer=false,castle=false}={}){
 const count=sql.prepare('SELECT COUNT(*) n FROM kernel511_admissions WHERE channel=?').get(channel).n;
 if(!transfer&&castleEnabled()&&sql.prepare('SELECT COUNT(*) n FROM kernel511_admissions').get().n>=100)return false;
 const special=castleEnabled()&&channel===CASTLE_CHANNEL&&(castle&&transfer||castleResumeR59(sql,id,channel));
 return count<(special?CASTLE_CAPACITY:25);
}
