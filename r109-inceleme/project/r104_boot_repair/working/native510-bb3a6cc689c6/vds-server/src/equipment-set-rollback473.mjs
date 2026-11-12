// Cold V473 -> exact V472 reconciliation. No player snapshot is restored.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {verifyRealmPackage} from './realm-package-integrity.mjs';
import {verifyNativeBuild} from './native-build-integrity.mjs';
export const EQUIPMENT_SET_BASE_SHA473='00f102e343f520e3abf5a8fbbf46a8782e4cdd8a3d78d4e59deccdfe79d10a50';
export const EQUIPMENT_SET_HP_SQL472="MAX(1,CAST(ROUND((MAX(1,\n  COALESCE((SELECT player_max_hp FROM combat_settings WHERE id = 1), 100)\n  + MIN(3000000, MAX(0, COALESCE((\n  SELECT SUM(MIN(1000000, MAX(0, CAST(json_extract(\n    CASE WHEN json_valid(effect.value) THEN effect.value ELSE '{}' END, '$.value'\n  ) AS INTEGER))))\n  FROM player_items hp_item,\n    json_each(CASE WHEN json_valid(hp_item.enchantments) THEN hp_item.enchantments ELSE '[]' END) effect\n  WHERE hp_item.player_id = players.id AND hp_item.equipped = 1\n    AND hp_item.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume')\n    AND json_extract(CASE WHEN json_valid(effect.value) THEN effect.value ELSE '{}' END, '$.kind') = 'hp'\n), 0))) + COALESCE(players.set_hp,0) + ((CASE WHEN players.level>=65 AND players.rank_tier>0 THEN CASE WHEN json_extract(players.rank_cosmetics,'$.weapon')='hunter_weapon' AND EXISTS(SELECT 1 FROM json_each(players.rank_unlocked) WHERE value='hunter_weapon') THEN 100 ELSE 0 END+CASE WHEN json_extract(players.rank_cosmetics,'$.cape')='fedai_cape' AND EXISTS(SELECT 1 FROM json_each(players.rank_unlocked) WHERE value='fedai_cape') THEN 150 ELSE 0 END+CASE WHEN json_extract(players.rank_cosmetics,'$.companion')='guardian_companion' AND EXISTS(SELECT 1 FROM json_each(players.rank_unlocked) WHERE value='guardian_companion') THEN 200 ELSE 0 END+CASE WHEN json_extract(players.rank_cosmetics,'$.weapon')='executioner_weapon' AND EXISTS(SELECT 1 FROM json_each(players.rank_unlocked) WHERE value='executioner_weapon') THEN 250 ELSE 0 END+CASE WHEN json_extract(players.rank_cosmetics,'$.wings')='sovereign_wings' AND EXISTS(SELECT 1 FROM json_each(players.rank_unlocked) WHERE value='sovereign_wings') THEN 300 ELSE 0 END+CASE WHEN json_extract(players.rank_cosmetics,'$.costume')='legend_costume' AND EXISTS(SELECT 1 FROM json_each(players.rank_unlocked) WHERE value='legend_costume') THEN 400 ELSE 0 END ELSE 0 END)+COALESCE((SELECT SUM(CAST(json_extract(value,'$.hp') AS INTEGER)) FROM json_each((SELECT config_json FROM rank_settings WHERE id=1),'$.tiers') WHERE CAST(key AS INTEGER)<players.rank_tier AND players.level>=65),0)) + COALESCE((SELECT CASE s.active_level WHEN 1 THEN 250 WHEN 2 THEN 350 WHEN 3 THEN 500 ELSE 0 END FROM guild_skills s JOIN guild_members m ON m.guild_id=s.guild_id WHERE m.player_id=players.id AND s.active_until>unixepoch()*1000),0) + CASE WHEN players.ration_until>unixepoch()*1000 THEN 200 ELSE 0 END\n  + CASE WHEN EXISTS(SELECT 1 FROM player_pets WHERE player_id=players.id AND kind='starter' AND equipped=1 AND acquired_at+259200>unixepoch()) THEN 350 ELSE 0 END\n))*(1+CASE WHEN players.level>=65 AND players.rank_tier>0 THEN players.rune_hp_level*COALESCE((SELECT json_extract(config_json,'$.bonusPerLevel') FROM rune_settings WHERE id=1),0.2)/100.0 ELSE 0 END + CASE WHEN COALESCE((SELECT json_extract(config_json,'$.enabled') FROM status_settings WHERE id=1),1)=1 THEN players.stat_hp*MIN(1.0,MAX(0,MIN(65,players.level)-1)*3.0/MAX(1,players.stat_attack+players.stat_defense+players.stat_hp))*COALESCE((SELECT json_extract(config_json,'$.hp') FROM status_settings WHERE id=1),12)/6400.0 ELSE 0 END)) AS INTEGER))";
const sets472={"red":{"name":"Kızıl Set","slots":["weapon","armor","shoes","necklace"],"bonuses":{"hp":0,"pve":3,"pvp":3,"resistance":0,"speed":3}},"unique":{"name":"Eşsiz Set","slots":["weapon","armor"],"bonuses":{"hp":0,"pve":0,"pvp":5,"resistance":5,"speed":5}},"purple":{"name":"Mor Kök Seti","slots":["weapon","armor","helmet","shoes","necklace"],"bonuses":{"hp":500,"pve":5,"pvp":5,"resistance":5,"speed":5}},"infinite":{"name":"Sonsuz Set","slots":["weapon","armor","helmet","shoes","necklace"],"bonuses":{"hp":700,"pve":7,"pvp":7,"resistance":7,"speed":10}},"emerald":{"name":"Kadim Zümrüt Seti","slots":["weapon","armor","helmet","shoes","necklace"],"bonuses":{"hp":1000,"pve":10,"pvp":10,"resistance":0,"speed":12,"attack":50}}};
const columns472=["set_hp","set_pve","set_pvp","set_resistance","set_speed","set_attack"];
const assignments472=columns472.map(column=>{
 const key=column.slice(4);
 const terms=Object.entries(sets472).filter(([,set])=>set.bonuses[key]>0).map(([rarity,set])=>`CASE WHEN (SELECT COUNT(DISTINCT kind) FROM player_items WHERE player_id=players.id AND equipped=1 AND rarity='${rarity}' AND kind IN (${set.slots.map(kind=>`'${kind}'`).join(',')}))=${set.slots.length} THEN ${set.bonuses[key]} ELSE 0 END`);
 return `${column}=${terms.join('+')||0}`;
}).join(',');
const oldSetHp472=assignments472.slice('set_hp='.length,assignments472.indexOf(',set_pve='));
export function restoreEquipmentSets472(db){
 db.exec('PRAGMA synchronous=FULL');
 db.exec('BEGIN IMMEDIATE');
 try{
  const table=db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='app_release_migrations'").get();
  const applied=table&&db.prepare("SELECT 1 FROM app_release_migrations WHERE id='v473-staged-equipment-sets'").get();
  if(!applied){db.exec('COMMIT');return {changed:false};}
  // Store only affected IDs. Both old set values and maxHP are calculated from
  // current equipment/current stats while all realm services are stopped.
  db.exec(`CREATE TEMP TABLE equipment_set_restore_ids473 AS SELECT id FROM players WHERE set_hp!=${oldSetHp472}`);
  const update=id=>`UPDATE players SET ${assignments472} WHERE id=${id};`;
  db.exec('DROP TRIGGER IF EXISTS equipment_set_insert; DROP TRIGGER IF EXISTS equipment_set_delete; DROP TRIGGER IF EXISTS equipment_set_update;');
  db.exec(`CREATE TRIGGER IF NOT EXISTS equipment_set_insert AFTER INSERT ON player_items WHEN NEW.equipped=1 BEGIN ${update('NEW.player_id')} END;
   CREATE TRIGGER IF NOT EXISTS equipment_set_delete AFTER DELETE ON player_items WHEN OLD.equipped=1 BEGIN ${update('OLD.player_id')} END;
   CREATE TRIGGER IF NOT EXISTS equipment_set_update AFTER UPDATE OF equipped,rarity,kind,player_id ON player_items WHEN OLD.equipped=1 OR NEW.equipped=1 BEGIN ${update('OLD.player_id')} ${update('NEW.player_id')} END;`);
  db.exec(`UPDATE players SET ${assignments472}`);
  const hpSql=EQUIPMENT_SET_HP_SQL472;
  db.exec(`UPDATE players SET hp_revision=hp_revision+CASE WHEN max_hp!=${hpSql} OR hp>${hpSql} THEN 1 ELSE 0 END,
   hp=MIN(hp,${hpSql}),max_hp=${hpSql} WHERE id IN (SELECT id FROM equipment_set_restore_ids473)`);
  const affected=Number(db.prepare('SELECT COUNT(*) n FROM equipment_set_restore_ids473').get().n);
  db.exec('DROP TABLE equipment_set_restore_ids473');
  db.exec("DELETE FROM app_release_migrations WHERE id='v473-staged-equipment-sets'");
  db.exec('COMMIT');return {changed:true,affected};
 }catch(error){db.exec('ROLLBACK');throw error;}
}
export async function reconcileEquipmentSetsRollback473(release,realms){
 const bytes=await readFile(release+'/realm-package-manifest.json');
 if(createHash('sha256').update(bytes).digest('hex')!==EQUIPMENT_SET_BASE_SHA473)return {matched:false};
 await verifyRealmPackage(release);await verifyNativeBuild(release+'/dist-vds');
 const results=[];
 for(const realm of realms){
  const db=new DatabaseSync(realm.database);
  try{results.push({realm:realm.id,...restoreEquipmentSets472(db)});}finally{db.close();}
 }
 return {matched:true,results};
}
// recoverRealmPackage deliberately attempts all restoration steps. The gate
// prevents DB writes when stop failed and prevents restart when select failed.
export function createEquipmentSetRecoveryGate473({stop,prepare,select,start}){
 let stopped=false,selected=false;
 return {
  async stop(){stopped=false;selected=false;await stop();stopped=true;},
  async select(release){selected=false;if(!stopped)throw Error('Set recovery requires stopped realm services');await prepare(release);await select(release);selected=true;},
  async start(){if(!stopped||!selected)throw Error('Set recovery selection incomplete; services remain stopped');stopped=false;await start();}
 };
}
