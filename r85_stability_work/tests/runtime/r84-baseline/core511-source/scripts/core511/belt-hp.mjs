import {totalRankBonuses,validateRankConfig} from '../../../native510-bb3a6cc689c6/lib/ranks.mjs';
import {statusBonus,validateStatusConfig} from '../../../native510-bb3a6cc689c6/lib/status.mjs';
import {runeEligible,validateRuneConfig} from '../../../native510-bb3a6cc689c6/lib/runes.mjs';
import {guildSkillLevel} from '../../../native510-bb3a6cc689c6/lib/guild-skill.mjs';
import {extraBuff} from '../../../native510-bb3a6cc689c6/vds-server/src/extra-products.mjs';
import {beltBonusSql} from './belt-statistics.mjs';

const installed=new WeakMap();
const name='kernel511_belt_hp_values_r31';
const playerFields=['level','rank_tier','rank_unlocked','rank_cosmetics','stat_attack','stat_defense','stat_hp','rune_hp_level','set_hp','ration_until','pumpkin_enabled499','pumpkin_until499'];
const equippedBelt="EXISTS(SELECT 1 FROM player_items WHERE player_id=NEW.id AND kind='belt' AND equipped=1)";
// TEMP objects and functions belong only to a writable connection. Main schema
// and the R30 jewellery/rank triggers are deliberately left byte-for-byte intact.
// UDF inputs are scalar SQL snapshots; the callback never re-enters SQLite.
export function installBeltHpGuard(sql,{now=Date.now}={}){
 if(installed.has(sql)&&sql.prepare("SELECT 1 FROM sqlite_temp_master WHERE type='trigger' AND name='kernel511_belt_hp_correct_r31'").get())return installed.get(sql);
 const configs=new Map();
 const config=(kind,source,validate)=>{
  const key=kind+':'+source;if(configs.has(key))return configs.get(key);
  const value=validate(JSON.parse(source));if(configs.size>=12)configs.delete(configs.keys().next().value);configs.set(key,value);return value;
 };
 sql.function('kernel511_belt_hp_now_r31',()=>now());
 sql.function('kernel511_belt_hp_calculate_r31',{deterministic:true},(playerJson,gearJson,baseHp,petHp,rankJson,runeJson,statusJson,guildLevel,beltHp,at)=>{
  const player=JSON.parse(playerJson),items=JSON.parse(gearJson);
  const gearHp=items.reduce((sum,item)=>sum+JSON.parse(item.enchantments||'[]').filter(e=>e.kind==='hp').reduce((n,e)=>n+Math.max(0,Math.min(1000000,Number(e.value)||0)),0),0);
  const rank=config('rank',rankJson,validateRankConfig),rune=config('rune',runeJson,validateRuneConfig),status=config('status',statusJson,validateStatusConfig);
  const base=Math.max(1,(Number(baseHp)||100)+Math.min(3000000,gearHp)+(Number(player.set_hp)||0)+petHp+extraBuff(player,at).hp+totalRankBonuses(player,rank).hp+(guildLevel?guildSkillLevel(guildLevel).hp:0)+beltHp);
  const factor=1+(runeEligible(player)?(Number(player.rune_hp_level)||0)*rune.bonusPerLevel/100:0)+statusBonus(player,'hp',status);
  const hp=Math.max(1,Math.round(base*factor));if(!Number.isSafeInteger(hp))throw Error('Can değeri işlenemedi.');return hp;
 });
 sql.exec(`CREATE TEMP VIEW ${name} AS SELECT p.id,kernel511_belt_hp_calculate_r31(
  json_object(${playerFields.map(field=>"'"+field+"',p."+field).join(',')}),
  (SELECT json_group_array(json_object('enchantments',i.enchantments)) FROM main.player_items i WHERE i.player_id=p.id AND i.equipped=1 AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume')),
  (SELECT player_max_hp FROM main.combat_settings WHERE id=1),
  CASE WHEN EXISTS(SELECT 1 FROM main.player_pets WHERE player_id=p.id AND kind='starter' AND equipped=1 AND acquired_at+259200>CAST(kernel511_belt_hp_now_r31()/1000 AS INTEGER)) THEN 350 ELSE 0 END,
  (SELECT config_json FROM main.rank_settings WHERE id=1),
  (SELECT config_json FROM main.rune_settings WHERE id=1),
  (SELECT config_json FROM main.status_settings WHERE id=1),
  COALESCE((SELECT s.active_level FROM main.guild_skills s JOIN main.guild_members m ON m.guild_id=s.guild_id WHERE m.player_id=p.id AND s.active_until>kernel511_belt_hp_now_r31() LIMIT 1),0),
  ${beltBonusSql('hp','p')},kernel511_belt_hp_now_r31()) AS max_hp FROM main.players p;
 CREATE TEMP TRIGGER kernel511_belt_hp_correct_r31 AFTER UPDATE OF max_hp ON main.players
 WHEN ${equippedBelt} AND NEW.max_hp<>(SELECT max_hp FROM ${name} WHERE id=NEW.id)
 BEGIN
  UPDATE players SET (max_hp,hp)=(SELECT max_hp,MIN(CASE WHEN NEW.hp=MIN(OLD.hp,NEW.max_hp) THEN OLD.hp ELSE NEW.hp END,max_hp) FROM ${name} WHERE id=NEW.id),hp_revision=hp_revision+1 WHERE id=NEW.id;
 END;`);
 // An old trigger can clamp HP to its incomplete maximum before our AFTER
 // trigger sees the row. Restore only that exact automatic clamp, bounded by
 // the current canonical maximum and the previous HP. This never heals damage.
 const api=Object.freeze({
  expected:id=>sql.prepare(`SELECT max_hp FROM ${name} WHERE id=?`).get(id)?.max_hp,
  normalize:()=>sql.prepare(`UPDATE players SET (max_hp,hp)=(SELECT max_hp,MIN(players.hp,max_hp) FROM ${name} WHERE id=players.id),hp_revision=hp_revision+1 WHERE id IN (SELECT player_id FROM player_items WHERE kind='belt' AND equipped=1) AND max_hp<>(SELECT max_hp FROM ${name} WHERE id=players.id)`).run().changes,
 });
 installed.set(sql,api);return api;
}
