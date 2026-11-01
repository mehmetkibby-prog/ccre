import {BELTS_R31,beltStats} from './belt-model.mjs';

const fieldNames=Object.freeze({attack:'attack',hp:'hp',experiencePercent:'experiencePercent',strongPlayers:'strongPlayers'});
export function beltBonusSql(field,playerAlias='players'){
 if(!Object.hasOwn(fieldNames,field)||!/^[A-Za-z_][A-Za-z0-9_]*$/.test(playerAlias))throw Error('belt_sql_contract');
 const cases=Object.values(BELTS_R31).filter(def=>def[field]).map(def=>"WHEN '"+def.name.replaceAll("'","''")+"' THEN "+def[field]).join(' ');
 return `(COALESCE((SELECT CASE i.item_name ${cases} ELSE 0 END FROM player_items i WHERE i.player_id=${playerAlias}.id AND i.kind='belt' AND i.equipped=1 AND i.rarity='crafted' AND i.power=0 AND i.role='all' AND i.enchantments='[]' AND i.expires_at_ms=0 AND i.premium_origin=0 LIMIT 1),0))`;
}
export function beltXpSql(playerAlias='p'){return '(1+'+beltBonusSql('experiencePercent',playerAlias)+'/100.0)';}
export function beltStatsFor(sql,id){
 return beltStats(sql.prepare("SELECT kind,item_name,rarity,power,role,enchantments,equipped,expires_at_ms,premium_origin FROM player_items WHERE player_id=? AND kind='belt' AND equipped=1").all(id));
}
