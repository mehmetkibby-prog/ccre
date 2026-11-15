import {ZUMRUT_CATALOG_R93} from './zumrut-catalog-r93.mjs';
import {ROYAL_KINDS_R118,ROYAL_MATERIALS_R118,royalErrorR118} from './royal-model-r118.mjs';
export {ROYAL_ACTIONS_R118,ROYAL_MATERIALS_R118} from './royal-model-r118.mjs';
const resourceColumns=new Set(['gems','essence','pearls','red_pearls','stone_dust','potions','arena_coins','enchant_scrolls','enchant_add_scrolls','fifth_enchant_scrolls']);
const catalog=new Map([...ZUMRUT_CATALOG_R93.filter(r=>r.costAllowed&&!r.payment?.selection&&(['material','stone'].includes(r.type)||r.type==='resource'&&resourceColumns.has(r.payment?.column))),...ROYAL_MATERIALS_R118].map(r=>[r.id,r]));
export const ROYAL_COST_CATALOG_R118=Object.freeze([...catalog.values()]);
export const ROYAL_COST_BY_ID_R118=catalog;
export const ROYAL_DEFAULTS_R118=Object.freeze({enabled:true,recipes:Object.freeze(Object.fromEntries(ROYAL_KINDS_R118.map(kind=>[kind,Object.freeze({costs:Object.freeze([
 Object.freeze({itemId:'material:emerald_dust',amount:8}),Object.freeze({itemId:'material:royal_crown',amount:1}),Object.freeze({itemId:'resource:gems',amount:5000})
])})]))) });
const fail=message=>{throw royalErrorR118(message);};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
export function validateRoyalConfigR118(input){
 if(!object(input)||Object.keys(input).some(k=>!['enabled','recipes'].includes(k))||typeof input.enabled!=='boolean'||!object(input.recipes)||Object.keys(input.recipes).length!==ROYAL_KINDS_R118.length||Object.keys(input.recipes).some(k=>!ROYAL_KINDS_R118.includes(k)))fail('Kraliyet ayarları geçersiz.');
 const recipes=Object.fromEntries(ROYAL_KINDS_R118.map(kind=>{
  const row=input.recipes[kind];if(!object(row)||Object.keys(row).some(k=>k!=='costs')||!Array.isArray(row.costs)||row.costs.length<1||row.costs.length>12)fail('Her Kraliyet eşyası için 1–12 malzeme seç.');
  const seen=new Set(),balances=new Set();const costs=row.costs.map(r=>{
   const item=catalog.get(r?.itemId);if(!object(r)||Object.keys(r).some(k=>!['itemId','amount'].includes(k))||!item||seen.has(item.id)||!Number.isSafeInteger(r.amount)||r.amount<1||r.amount>1000000)fail('Kraliyet malzemesi veya miktarı geçersiz.');
   const balance=item.payment.table+':'+(item.payment.column??item.payment.kind);if(balances.has(balance))fail('Aynı malzeme iki kez istenemez.');
   seen.add(item.id);balances.add(balance);return {itemId:item.id,amount:r.amount};
  });
  if(!seen.has('material:emerald_dust'))fail('Kraliyet dönüşümünde en az 1 Zümrüt Tozu bulunmalı.');
  return [kind,{costs}];
 }));return {enabled:input.enabled,recipes};
}
// Called explicitly by the journaled installer (and synthetic fixtures), never
// by a service constructor or an incoming request. Existing rows are not changed.
export function createRoyalSchemaR118(sql){
 sql.exec(`CREATE TABLE IF NOT EXISTS royal_settings_r118(id INTEGER PRIMARY KEY CHECK(id=1),config TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>=1));
 CREATE TABLE IF NOT EXISTS royal_receipts_r118(player_id TEXT NOT NULL,request_id TEXT NOT NULL,action TEXT NOT NULL,digest TEXT NOT NULL,result TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));
 CREATE TABLE IF NOT EXISTS royal_transforms_r118(item_id TEXT PRIMARY KEY,player_id TEXT NOT NULL,before_json TEXT NOT NULL,after_json TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS royal_salvage_r118(item_id TEXT PRIMARY KEY,player_id TEXT NOT NULL,before_json TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS royal_admin_audit_r118(id INTEGER PRIMARY KEY,admin_id TEXT NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TRIGGER IF NOT EXISTS royal_champion_insert_r118 BEFORE INSERT ON player_items
 WHEN NEW.equipped=1 AND NEW.rarity='royal' AND NOT EXISTS(SELECT 1 FROM players WHERE id=NEW.player_id AND champion_level_r102>=1)
 BEGIN SELECT RAISE(ABORT,'royal_champion_required_r118'); END;
 CREATE TRIGGER IF NOT EXISTS royal_champion_update_r118 BEFORE UPDATE OF equipped,rarity,player_id ON player_items
 WHEN NEW.equipped=1 AND NEW.rarity='royal' AND NOT EXISTS(SELECT 1 FROM players WHERE id=NEW.player_id AND champion_level_r102>=1)
 BEGIN SELECT RAISE(ABORT,'royal_champion_required_r118'); END;
 CREATE TRIGGER IF NOT EXISTS royal_champion_loss_r118 AFTER UPDATE OF champion_level_r102 ON players
 WHEN OLD.champion_level_r102>=1 AND NEW.champion_level_r102<1
 BEGIN UPDATE player_items SET equipped=0 WHERE player_id=NEW.id AND equipped=1 AND rarity='royal'; END;`);
 sql.prepare('INSERT OR IGNORE INTO royal_settings_r118(id,config) VALUES(1,?)').run(JSON.stringify(validateRoyalConfigR118(ROYAL_DEFAULTS_R118)));
}
