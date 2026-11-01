// Used only by the SHA-pinned installer, with maintenance and stopped services.
// Keep the CURRENT database. R59's quest counters cannot hold stackable items,
// so retain the excess in a reserve restored by the next R60 bootstrap.
import assert from 'node:assert/strict';
import {MOUNT_MIGRATION_SCOPE_R60,MOUNT_RESERVE_SCOPE_R60,MOUNT_LEGACY_CAPS_R60 as caps,readMountReserveR60} from './mount-material-reserve-r60.mjs';
const kinds="'saddle_leather','saddle_buckle','saddle_rein'";
const filter="kind='dungeon_material' AND item_id IN ("+kinds+")";
export function rollbackMountMaterialsOfflineR60(sql,now=Date.now()){
 assert(!sql.isTransaction,'cold standalone transaction required');
 assert(Number.isSafeInteger(now)&&now>0);
 if(!sql.prepare("SELECT 1 FROM mount_receipts_r49 WHERE scope=? AND request_id='v1'").get(MOUNT_MIGRATION_SCOPE_R60))return {cancelled:0,reserved:0};
 sql.exec('BEGIN IMMEDIATE');
 try{
  assert.equal(sql.prepare('SELECT count(*) n FROM market_settlements WHERE '+filter+' AND applied_at_ms<=0').get().n,0,'unresolved mount material settlement');
  const rows=sql.prepare('SELECT * FROM market_listings WHERE '+filter+' ORDER BY id').all();
  const credit=sql.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=dungeon_materials.amount+excluded.amount');
  for(const row of rows){
   assert(Number.isSafeInteger(row.amount)&&row.amount>0&&row.amount<=9999,'invalid material escrow');
   assert(sql.prepare('SELECT 1 FROM players WHERE id=?').get(row.seller_id),'escrow owner missing');
   const receipt='r60-rollback-material:'+row.id;
   assert.equal(sql.prepare("INSERT INTO market_settlements(id,listing_id,settlement_type,buyer_id,seller_id,kind,item_id,item_name,rarity,power,role,enchantments,amount,price_gems,created_at_ms,applied_at_ms) SELECT ?,id,'cancel','',seller_id,kind,item_id,item_name,rarity,power,role,enchantments,amount,price_gems,?,-1 FROM market_listings WHERE id=?").run(receipt,now,row.id).changes,1);
   credit.run(row.seller_id,row.item_id,row.amount);
   assert.equal(sql.prepare('DELETE FROM market_listings WHERE id=?').run(row.id).changes,1);
   sql.prepare('UPDATE market_shops SET active=0 WHERE id=? AND NOT EXISTS(SELECT 1 FROM market_listings WHERE shop_id=?)').run(row.shop_id,row.shop_id);
   assert.equal(sql.prepare('UPDATE market_settlements SET applied_at_ms=? WHERE id=? AND applied_at_ms=-1').run(now,receipt).changes,1);
  }
  let reserved=0;
  const sums=new Map(),add=(id,kind,amount)=>{let row=sums.get(id);if(!row)sums.set(id,row={});row[kind]=(row[kind]??0)+amount;};
  for(const row of sql.prepare('SELECT * FROM dungeon_materials WHERE kind IN ('+kinds+') UNION ALL SELECT * FROM mount_inventory_r49 WHERE kind IN ('+kinds+')').all())add(row.player_id,row.kind,row.amount);
  for(const row of readMountReserveR60(sql))for(const [kind,amount]of Object.entries(row.balances))add(row.playerId,kind,amount);
  const balances=[...sums].flatMap(([player_id,values])=>Object.entries(values).map(([kind,amount])=>({player_id,kind,amount}))),reserve=new Map();
  for(const row of balances){
   assert(Number.isSafeInteger(row.amount)&&row.amount>=0,'material balance overflow');
   const visible=Math.min(row.amount,caps[row.kind]),excess=row.amount-visible;
   sql.prepare('INSERT INTO mount_inventory_r49(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=excluded.amount').run(row.player_id,row.kind,visible);
   if(excess){let value=reserve.get(row.player_id);if(!value)reserve.set(row.player_id,value={});value[row.kind]=excess;}
   reserved+=excess;
  }
  sql.prepare('DELETE FROM mount_receipts_r49 WHERE scope=?').run(MOUNT_RESERVE_SCOPE_R60);
  const save=sql.prepare('INSERT INTO mount_receipts_r49(scope,request_id,operation,result,created_at_ms) VALUES(?,?,?,?,?)');
  for(const [playerId,values]of reserve)save.run(MOUNT_RESERVE_SCOPE_R60,playerId,'reserve',JSON.stringify({version:1,playerId,balances:values}),now);
  sql.exec('DELETE FROM dungeon_materials WHERE kind IN ('+kinds+')');
  sql.exec('COMMIT');return {cancelled:rows.length,reserved};
 }catch(error){sql.exec('ROLLBACK');throw error;}
}
