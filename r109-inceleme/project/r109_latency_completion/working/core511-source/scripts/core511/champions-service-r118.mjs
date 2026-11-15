import {createHash} from 'node:crypto';
import {prepareServerStatement} from './server-statements.mjs';
import {CHAMPIONS_MOBS_R118,CHAMPIONS_SPAWNS_R118,CHAMPIONS_LOOT_LABELS_R118,championsMonsterKeyR118,championsLootSnapshotR118,defaultChampionsConfigR118,validateChampionsConfigR118} from './champions-config-r118.mjs';

const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const q=(sql,text)=>prepareServerStatement(sql,text);
const initialized=new WeakSet();
export const CHAMPIONS_STOCKING_LEGACY_SHA_R118='321f937745ff65052cebbe6e7c54be0d855eb983d04313d71320ff2bf10897f5';
export const CHAMPIONS_STOCKING_SHA_R118='19bf22bfe2489a37eeb5c699efeffb1e6030f6d62b104d8bfdd7569a9778b775';
export function migrateChampionsStockingTriggerR118(sql){
 if(!sql.isTransaction)throw Error('champions_trigger_migration_transaction_r118');
 const row=q(sql,"SELECT sql FROM main.sqlite_schema WHERE type='trigger' AND name='content_stocking_drop_r102'").get();
 if(!row)return; // A minimal fixture may not have the optional New Year event.
 const hash=value=>createHash('sha256').update(value).digest('hex'),current=hash(row.sql);
 if(current===CHAMPIONS_STOCKING_SHA_R118)return;
 if(current!==CHAMPIONS_STOCKING_LEGACY_SHA_R118)throw Error('champions_stocking_trigger_changed_r118');
 const next=row.sql.replace('WHEN NEW.is_gm=0 AND',"WHEN NEW.is_gm=0 AND NEW.area<>'champions' AND");
 if(hash(next)!==CHAMPIONS_STOCKING_SHA_R118)throw Error('champions_stocking_trigger_contract_r118');
 sql.exec('DROP TRIGGER content_stocking_drop_r102');sql.exec(next);
}

export function ensureChampionsSchemaR118(sql){
 if(initialized.has(sql))return;
 const own=!sql.isTransaction;if(own)sql.exec('BEGIN IMMEDIATE');
 try{
  migrateChampionsStockingTriggerR118(sql);
  sql.exec('CREATE TABLE IF NOT EXISTS champions_settings_r118(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL)');
  if(!q(sql,'SELECT 1 FROM champions_settings_r118 WHERE id=1').get()){
   const source=q(sql,'SELECT config_json FROM rune_v2_settings WHERE id=1').get();
   if(!source)throw Error('champions_rune_reference_missing_r118');
   const config=validateChampionsConfigR118(defaultChampionsConfigR118(JSON.parse(source.config_json)));
   q(sql,'INSERT INTO champions_settings_r118(id,config_json) VALUES(1,?)').run(JSON.stringify(config));
  }
  const settings=q(sql,'SELECT revision,config_json FROM champions_settings_r118 WHERE id=1').get(),config=validateChampionsConfigR118(JSON.parse(settings.config_json));
  const insert=q(sql,"INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,variant,area,channel,is_boss,is_stone,summoned,respawn_at,spawn_round) VALUES(?,?,?,?,?,?,'normal','champions',?,0,0,0,0,1)");
  for(let channel=1;channel<=4;channel++)for(const spawn of CHAMPIONS_SPAWNS_R118){const mob=config.monsters[spawn.key];insert.run(`champions-${spawn.key}-c${channel}-${String(spawn.slot).padStart(2,'0')}`,mob.name,spawn.x,spawn.y,mob.hp,mob.hp,channel);}
  if(own){sql.exec('COMMIT');initialized.add(sql);}
 }catch(error){if(own&&sql.isTransaction)sql.exec('ROLLBACK');throw error;}
}
export function createChampionsSnapshotR118(settings){
 const current=freeze({revision:settings.revision,config:validateChampionsConfigR118(settings.config)});
 if(!Number.isSafeInteger(current.revision)||current.revision<1)throw Error('champions_revision_r118');
 const snapshots=Object.fromEntries(CHAMPIONS_MOBS_R118.map(m=>[m.key,championsLootSnapshotR118(current,{id:`champions-${m.key}-c1-01`,area:'champions'})]));
 return Object.freeze({settings:()=>({...current,lootLabels:CHAMPIONS_LOOT_LABELS_R118,species:CHAMPIONS_MOBS_R118}),monster:m=>current.config.monsters[championsMonsterKeyR118(m)]??null,lootSnapshot:m=>snapshots[championsMonsterKeyR118(m)]??null});
}
export function createChampionsR118(sql){
 let facade;
 const refresh=()=>{const row=q(sql,'SELECT revision,config_json FROM champions_settings_r118 WHERE id=1').get();if(!row)throw Error('champions_settings_missing_r118');facade=createChampionsSnapshotR118({revision:row.revision,config:JSON.parse(row.config_json)});return facade.settings();};
 refresh();
 return {refresh,settings:()=>facade.settings(),monster:m=>facade.monster(m),lootSnapshot:m=>facade.lootSnapshot(m),save(input,revision){
  const config=validateChampionsConfigR118(input);if(!Number.isSafeInteger(revision)||revision<1||revision>=Number.MAX_SAFE_INTEGER)throw Error('champions_revision_r118');
  const own=!sql.isTransaction,previous=facade;if(own)sql.exec('BEGIN IMMEDIATE');
  try{
   if(q(sql,'UPDATE champions_settings_r118 SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(config),revision).changes!==1)throw Object.assign(Error('Ayarlar değişti. Yenileyip tekrar kaydet.'),{status:409,gameCode:'champions_revision_conflict_r118'});
   const rename=q(sql,"UPDATE monsters SET name=? WHERE id=? AND area='champions'");
   for(let channel=1;channel<=4;channel++)for(const spawn of CHAMPIONS_SPAWNS_R118)rename.run(config.monsters[spawn.key].name,`champions-${spawn.key}-c${channel}-${String(spawn.slot).padStart(2,'0')}`);
   refresh();if(own)sql.exec('COMMIT');return facade.settings();
  }catch(error){if(own&&sql.isTransaction)sql.exec('ROLLBACK');facade=previous;throw error;}
 }};
}
