import {ZUMRUT_BY_ID_R93,validateCostRowsR93} from './zumrut-catalog-r93.mjs';

export const ZUMRUT_DEFAULTS_R93=Object.freeze({enabled:true,access:'admin',revision:1,gatherMs:3000,craftMs:5000,
 toolCosts:{axe:[{itemId:'resource:gems',amount:100}],pickaxe:[{itemId:'resource:gems',amount:100}]},
 recipe:{costs:[{itemId:'material:zumrut_wood_r93',amount:1000},{itemId:'material:zumrut_stone_r93',amount:1000}],rewards:[{itemId:'material:mount_talisman_r93',amount:1,chance:100}]}});
const integer=(value,min,max,label)=>{if(!Number.isSafeInteger(value)||value<min||value>max)throw Error(`${label}: ${min}–${max} arasında tam sayı gerekli.`);return value;};
export function validateZumrutConfigR93(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.enabled!=='boolean')throw Error('Zümrüt Vadisi ayarları geçersiz.');
 const access=input.access??'admin';if(!['admin','public'].includes(access))throw Error('Vadi erişimi Yalnız yönetici veya Herkese açık olmalı.');
 if(!input.toolCosts||!input.recipe)throw Error('Alet bedelleri ve üretim tarifi gerekli.');
 const out={enabled:input.enabled,access,revision:integer(input.revision??1,1,Number.MAX_SAFE_INTEGER,'Ayar sürümü'),gatherMs:integer(input.gatherMs??3000,1500,10000,'Toplama süresi'),craftMs:integer(input.craftMs??5000,2000,15000,'Üretim süresi'),toolCosts:{axe:validateCostRowsR93(input.toolCosts.axe),pickaxe:validateCostRowsR93(input.toolCosts.pickaxe)},recipe:{costs:validateCostRowsR93(input.recipe.costs),rewards:[]}};
 if(!Array.isArray(input.recipe.rewards)||input.recipe.rewards.length>32)throw Error('En fazla 32 üretim ödülü eklenebilir.');
 const seen=new Set();let total=0;
 out.recipe.rewards=input.recipe.rewards.map(row=>{
  const item=ZUMRUT_BY_ID_R93.get(row?.itemId);
  if(!item||item.rewardAllowed===false||seen.has(item.id))throw Error('Üretim ödülü geçersiz veya tekrarlanmış.');
  seen.add(item.id);const chance=row.chance;
  if(!Number.isFinite(chance)||chance<=0||chance>100||Math.abs(chance*100-Math.round(chance*100))>1e-7)throw Error('Ödül şansı %0’dan büyük, en fazla %100 ve iki ondalıklı olmalı.');
  total+=Math.round(chance*100);
  return {itemId:item.id,amount:integer(row.amount,1,Math.min(1000000,item.maxAmount??(['gear','equipment','pet','premium','special','rank'].includes(item.type)?1:1000000)),'Ödül adedi'),chance:Math.round(chance*100)/100};
 });
 if(out.recipe.rewards.length&&total!==10000)throw Error('Üretim ödüllerinin şansları toplamı tam %100 olmalı.');
 if(out.recipe.rewards.length&&!out.recipe.costs.length)throw Error('Üretim için en az bir malzeme bedeli gerekli.');
 return out;
}
export function readZumrutConfigR93(value){return validateZumrutConfigR93(value==null?structuredClone(ZUMRUT_DEFAULTS_R93):typeof value==='string'?JSON.parse(value):value);}
export function createZumrutSchemaR93(sql){
 // Additive, idle-free storage. Normal inventory tables hold all five items.
 // A single operation row per actor also serves as the last gathering receipt.
 sql.exec(`CREATE TABLE IF NOT EXISTS zumrut_settings_r93(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS zumrut_tools_r93(player_id TEXT PRIMARY KEY,equipped TEXT NOT NULL DEFAULT '' CHECK(equipped IN ('','axe','pickaxe')));
 CREATE TABLE IF NOT EXISTS zumrut_craft_draws_r93(player_id TEXT PRIMARY KEY,recipe_key TEXT NOT NULL,draw_json TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS zumrut_nodes_r93(channel INTEGER NOT NULL CHECK(channel BETWEEN 1 AND 4),node_id TEXT NOT NULL,available_at_ms INTEGER NOT NULL CHECK(available_at_ms>=0),PRIMARY KEY(channel,node_id));
 CREATE INDEX IF NOT EXISTS zumrut_nodes_available_r93 ON zumrut_nodes_r93(channel,available_at_ms);
 CREATE TABLE IF NOT EXISTS zumrut_operations_r93(player_id TEXT PRIMARY KEY,operation_id TEXT NOT NULL,request_id TEXT NOT NULL,input_json TEXT NOT NULL,kind TEXT NOT NULL,node_id TEXT NOT NULL,status TEXT NOT NULL,started_ms INTEGER NOT NULL,ready_ms INTEGER NOT NULL,expires_ms INTEGER NOT NULL,binding_json TEXT NOT NULL,recipe_json TEXT NOT NULL,result_json TEXT NOT NULL DEFAULT '{}');
 CREATE TABLE IF NOT EXISTS zumrut_receipts_r93(player_id TEXT NOT NULL,request_id TEXT NOT NULL,operation TEXT NOT NULL,result_json TEXT NOT NULL,created_ms INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));`);
 sql.prepare('INSERT OR IGNORE INTO zumrut_settings_r93(id,revision,value) VALUES(1,1,?)').run(JSON.stringify(ZUMRUT_DEFAULTS_R93));
}
