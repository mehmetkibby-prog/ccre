import {EQUIPMENT_SETS,equipmentSetThreshold473} from '../../lib/equipment-sets.mjs';
export const SET_COLUMNS=["set_hp","set_pve","set_pvp","set_resistance","set_speed","set_attack"];
// Frozen from this runtime's existing equip/unequip formula; native/source keep
// their own historical formulas. Used only when a set HP contribution changes.
export const EQUIPMENT_SET_HP_SQL473="MAX(1,CAST(ROUND((MAX(1,\n  COALESCE((SELECT player_max_hp FROM combat_settings WHERE id = 1), 100)\n  + MIN(3000000, MAX(0, COALESCE((\n  SELECT SUM(MIN(1000000, MAX(0, CAST(json_extract(\n    CASE WHEN json_valid(effect.value) THEN effect.value ELSE '{}' END, '$.value'\n  ) AS INTEGER))))\n  FROM player_items hp_item,\n    json_each(CASE WHEN json_valid(hp_item.enchantments) THEN hp_item.enchantments ELSE '[]' END) effect\n  WHERE hp_item.player_id = players.id AND hp_item.equipped = 1\n    AND hp_item.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume')\n    AND json_extract(CASE WHEN json_valid(effect.value) THEN effect.value ELSE '{}' END, '$.kind') = 'hp'\n), 0))) + COALESCE(players.set_hp,0) + ((CASE WHEN players.level>=65 AND players.rank_tier>0 THEN CASE WHEN json_extract(players.rank_cosmetics,'$.weapon')='hunter_weapon' AND EXISTS(SELECT 1 FROM json_each(players.rank_unlocked) WHERE value='hunter_weapon') THEN 100 ELSE 0 END+CASE WHEN json_extract(players.rank_cosmetics,'$.cape')='fedai_cape' AND EXISTS(SELECT 1 FROM json_each(players.rank_unlocked) WHERE value='fedai_cape') THEN 150 ELSE 0 END+CASE WHEN json_extract(players.rank_cosmetics,'$.companion')='guardian_companion' AND EXISTS(SELECT 1 FROM json_each(players.rank_unlocked) WHERE value='guardian_companion') THEN 200 ELSE 0 END+CASE WHEN json_extract(players.rank_cosmetics,'$.weapon')='executioner_weapon' AND EXISTS(SELECT 1 FROM json_each(players.rank_unlocked) WHERE value='executioner_weapon') THEN 250 ELSE 0 END+CASE WHEN json_extract(players.rank_cosmetics,'$.wings')='sovereign_wings' AND EXISTS(SELECT 1 FROM json_each(players.rank_unlocked) WHERE value='sovereign_wings') THEN 300 ELSE 0 END+CASE WHEN json_extract(players.rank_cosmetics,'$.costume')='legend_costume' AND EXISTS(SELECT 1 FROM json_each(players.rank_unlocked) WHERE value='legend_costume') THEN 400 ELSE 0 END ELSE 0 END)+COALESCE((SELECT SUM(CAST(json_extract(value,'$.hp') AS INTEGER)) FROM json_each((SELECT config_json FROM rank_settings WHERE id=1),'$.tiers') WHERE CAST(key AS INTEGER)<players.rank_tier AND players.level>=65),0)) + COALESCE((SELECT CASE s.active_level WHEN 1 THEN 250 WHEN 2 THEN 350 WHEN 3 THEN 500 ELSE 0 END FROM guild_skills s JOIN guild_members m ON m.guild_id=s.guild_id WHERE m.player_id=players.id AND s.active_until>unixepoch()*1000),0) + CASE WHEN players.ration_until>unixepoch()*1000 THEN 200 ELSE 0 END + CASE WHEN players.pumpkin_enabled499=1 AND players.pumpkin_until499>CAST(ROUND((julianday('now')-2440587.5)*86400000) AS INTEGER) THEN 1000 ELSE 0 END\n  + CASE WHEN EXISTS(SELECT 1 FROM player_pets WHERE player_id=players.id AND kind='starter' AND equipped=1 AND acquired_at+259200>unixepoch()) THEN 350 ELSE 0 END\n))*(1+CASE WHEN players.level>=65 AND players.rank_tier>0 THEN players.rune_hp_level*COALESCE((SELECT json_extract(config_json,'$.bonusPerLevel') FROM rune_settings WHERE id=1),0.2)/100.0 ELSE 0 END + CASE WHEN COALESCE((SELECT json_extract(config_json,'$.enabled') FROM status_settings WHERE id=1),1)=1 THEN players.stat_hp*MIN(1.0,MAX(0,MIN(65,players.level)-1)*3.0/MAX(1,players.stat_attack+players.stat_defense+players.stat_hp))*COALESCE((SELECT json_extract(config_json,'$.hp') FROM status_settings WHERE id=1),12)/6400.0 ELSE 0 END)) AS INTEGER))";
export function ensureEquipmentSetsSchema(db){
 db.exec('PRAGMA synchronous=FULL');
 db.exec('BEGIN IMMEDIATE');
 try{
  const columns=new Set(db.prepare('PRAGMA table_info(players)').all().map(c=>c.name));
  for(const name of SET_COLUMNS)if(!columns.has(name))db.exec(`ALTER TABLE players ADD COLUMN ${name} INTEGER NOT NULL DEFAULT 0`);
  db.exec('CREATE INDEX IF NOT EXISTS player_items_equipped_set ON player_items(player_id,equipped,rarity,kind)');
  const assignments=SET_COLUMNS.map(column=>{
   const key=column.slice(4);
   const terms=Object.entries(EQUIPMENT_SETS).filter(([,set])=>set.bonuses[key]>0).map(([rarity,set])=>`CASE WHEN (SELECT COUNT(DISTINCT kind) FROM player_items WHERE player_id=players.id AND equipped=1 AND rarity='${rarity}' AND kind IN (${set.slots.map(kind=>`'${kind}'`).join(',')}))>=${equipmentSetThreshold473(key,set)} THEN ${set.bonuses[key]} ELSE 0 END`);
   return `${column}=${terms.join('+')||0}`;
  }).join(',');
  const update=id=>`UPDATE players SET ${assignments} WHERE id=${id};`;
  const previous=db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' AND name IN ('equipment_set_insert','equipment_set_delete','equipment_set_update')").all();
  const expected=`UPDATE players SET ${assignments} WHERE id=`;
  const replaced=previous.length!==3||previous.some(trigger=>!(trigger.sql??'').includes(expected));
  db.exec('DROP TRIGGER IF EXISTS equipment_set_insert; DROP TRIGGER IF EXISTS equipment_set_delete; DROP TRIGGER IF EXISTS equipment_set_update;');
  db.exec(`CREATE TRIGGER equipment_set_insert AFTER INSERT ON player_items WHEN NEW.equipped=1 BEGIN ${update('NEW.player_id')} END;
   CREATE TRIGGER equipment_set_delete AFTER DELETE ON player_items WHEN OLD.equipped=1 BEGIN ${update('OLD.player_id')} END;
   CREATE TRIGGER equipment_set_update AFTER UPDATE OF equipped,rarity,kind,player_id ON player_items WHEN OLD.equipped=1 OR NEW.equipped=1 BEGIN ${update('OLD.player_id')} ${update('NEW.player_id')} END;`);
  db.exec('CREATE TABLE IF NOT EXISTS app_release_migrations(id TEXT PRIMARY KEY NOT NULL,applied_at_ms INTEGER NOT NULL)');
  const first=db.prepare("INSERT OR IGNORE INTO app_release_migrations VALUES('v410-equipment-sets',?)").run(Date.now()).changes;
  const emeraldFirst=db.prepare("INSERT OR IGNORE INTO app_release_migrations VALUES('v444-emerald-equipment-set',?)").run(Date.now()).changes;
  const armorFirst445=db.prepare("INSERT OR IGNORE INTO app_release_migrations VALUES('v445-emerald-armor',?)").run(Date.now()).changes;
  const stagedFirst473=db.prepare("INSERT OR IGNORE INTO app_release_migrations VALUES('v473-staged-equipment-sets',?)").run(Date.now()).changes;
  if(first||replaced||stagedFirst473||emeraldFirst||armorFirst445){
   const nextSetHp=assignments.slice('set_hp='.length,assignments.indexOf(',set_pve='));
   db.exec(`CREATE TEMP TABLE equipment_set_hp_ids473 AS SELECT id FROM players WHERE set_hp!=${nextSetHp}`);
   db.exec(`UPDATE players SET ${assignments}`);
   const hpSql=EQUIPMENT_SET_HP_SQL473;
   db.exec(`UPDATE players SET hp_revision=hp_revision+CASE WHEN max_hp!=${hpSql} OR hp>${hpSql} THEN 1 ELSE 0 END,
     hp=MIN(hp,${hpSql}),max_hp=${hpSql}
     WHERE id IN (SELECT id FROM equipment_set_hp_ids473)`);
   db.exec('DROP TABLE equipment_set_hp_ids473');
  }
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}
