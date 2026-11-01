import {SOLO_DEFAULTS,validateSoloConfig} from '../../lib/solo-dungeon.mjs';
import {UPGRADE_MATERIAL_DEFAULTS,validateMaterialDrops} from '../../lib/progression-materials.mjs';
export function ensureProgressionSchema(db){
 db.exec(`CREATE TABLE IF NOT EXISTS progression_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,solo_json TEXT NOT NULL,materials_json TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS solo_daily_entries(player_id TEXT PRIMARY KEY,day INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0 CHECK(used>=0));
 CREATE TABLE IF NOT EXISTS solo_entry_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,run_id TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));
 CREATE INDEX IF NOT EXISTS solo_entry_receipts_created ON solo_entry_receipts(created_at);
 CREATE TABLE IF NOT EXISTS solo_key_crafts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,result TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));
 CREATE INDEX IF NOT EXISTS solo_key_crafts_created ON solo_key_crafts(created_at);`);
 db.prepare('INSERT OR IGNORE INTO progression_settings(id,solo_json,materials_json) VALUES(1,?,?)').run(JSON.stringify(SOLO_DEFAULTS),JSON.stringify(UPGRADE_MATERIAL_DEFAULTS));
}
export function createProgressionSettings(db){
 let current;
 const refresh=()=>{const r=db.prepare('SELECT * FROM progression_settings WHERE id=1').get();current={revision:r.revision,solo:JSON.parse(r.solo_json),materials:JSON.parse(r.materials_json)};return current;};
 refresh();
 return {snapshot:()=>current,refresh,save(kind,value,revision){
  const next=kind==='solo'?validateSoloConfig(value):kind==='materials'?validateMaterialDrops(value):null;
  if(!next)throw Error('Geçersiz ayar bölümü.');
  const column=kind==='solo'?'solo_json':'materials_json';
  // FULL connection: update is on disk before the live cache and response change.
  if(!db.prepare(`UPDATE progression_settings SET ${column}=?,revision=revision+1 WHERE id=1 AND revision=?`).run(JSON.stringify(next),revision).changes)throw Error('Ayarlar başka bir oturumda değişti. Paneli yenile.');
  return refresh();
 }};
}
