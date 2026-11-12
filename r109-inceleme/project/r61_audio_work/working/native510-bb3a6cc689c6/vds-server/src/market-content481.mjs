/** One-time default upgrade. No players, grants, inventories or receipts change.
 * Numeric 99 is the historical guide default. Other saved prices and discounts
 * survive; subsequent admin changes (including 99) survive every restart. */
export function ensureMarketContent481(db) {
 const columns=new Set(db.prepare('PRAGMA table_info(premium_shop_settings)').all().map(row=>row.name));
 if(!columns.has('fishing_guide_price_v481'))db.exec('ALTER TABLE premium_shop_settings ADD COLUMN fishing_guide_price_v481 INTEGER NOT NULL DEFAULT 0');
 const row=db.prepare('SELECT prices_json,fishing_guide_price_v481 FROM premium_shop_settings WHERE id=1').get();
 if(!row||row.fishing_guide_price_v481)return {changed:false,reason:'already-upgraded'};
 let prices;
 try{prices=JSON.parse(row.prices_json);}catch{return {changed:false,reason:'invalid-json-preserved'};}
 if(!prices||typeof prices!=='object'||Array.isArray(prices))return {changed:false,reason:'invalid-prices-preserved'};
 const migrated=prices.fishing_guide?.base===99;
 const next=migrated?JSON.stringify({...prices,fishing_guide:{...prices.fishing_guide,base:372}}):row.prices_json;
 const result=db.prepare('UPDATE premium_shop_settings SET prices_json=?,fishing_guide_price_v481=1 WHERE id=1 AND fishing_guide_price_v481=0 AND prices_json=?').run(next,row.prices_json);
 return {changed:!!result.changes,migrated:migrated&&!!result.changes};
}
