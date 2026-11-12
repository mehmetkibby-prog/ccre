// Cold downgrade only, after authenticated empty-player/service-stop checks.
// Return new-kind escrow using the existing durable cancel receipt; never load
// an earlier database. Older releases cannot settle red_pearl listings safely.
import assert from 'node:assert/strict';
import {lstat,realpath} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
export function cancelRedPearlEscrow494(db,now=Date.now()){
 assert(!db.isTransaction,'cold standalone transaction required');
 assert(Number.isSafeInteger(now)&&now>0);
 db.exec('BEGIN IMMEDIATE');
 try{
  assert.equal(db.prepare("SELECT COUNT(*) n FROM market_settlements WHERE kind='red_pearl' AND applied_at_ms<=0").get().n,0,'unresolved red pearl settlement');
  const rows=db.prepare("SELECT id,seller_id,shop_id,amount FROM market_listings WHERE kind='red_pearl' ORDER BY id").all();
  for(const row of rows){
   assert(Number.isSafeInteger(row.amount)&&row.amount>0&&row.amount<=9999,'invalid red pearl escrow');
   const receipt='rollback494-'+randomUUID();
   const inserted=db.prepare(`INSERT INTO market_settlements(id,listing_id,settlement_type,buyer_id,seller_id,kind,item_id,item_name,rarity,power,role,enchantments,amount,price_gems,created_at_ms,applied_at_ms) SELECT ?,id,'cancel','',seller_id,kind,item_id,item_name,rarity,power,role,enchantments,amount,price_gems,?,-1 FROM market_listings WHERE id=? AND kind='red_pearl'`).run(receipt,now,row.id);
   assert.equal(inserted.changes,1);
   const credited=db.prepare("UPDATE players SET red_pearls=red_pearls+? WHERE id=? AND red_pearls>=0 AND red_pearls<=?").run(row.amount,row.seller_id,Number.MAX_SAFE_INTEGER-row.amount);
   assert.equal(credited.changes,1,'red pearl escrow owner missing or overflow');
   assert.equal(db.prepare("DELETE FROM market_listings WHERE id=? AND kind='red_pearl'").run(row.id).changes,1);
   db.prepare('UPDATE market_shops SET active=0 WHERE id=? AND NOT EXISTS(SELECT 1 FROM market_listings WHERE shop_id=?)').run(row.shop_id,row.shop_id);
   assert.equal(db.prepare('UPDATE market_settlements SET applied_at_ms=? WHERE id=? AND applied_at_ms=-1').run(now,receipt).changes,1);
  }
  db.exec('COMMIT');return {cancelled:rows.length};
 }catch(error){db.exec('ROLLBACK');throw error;}
}
export async function reconcileRedPearlRollback494(realms){
 assert(Array.isArray(realms)&&realms.length>0,'validated realm list required');
 const opened=[],seen=new Set();
 try{
  for(const realm of realms){
   assert(typeof realm.database==='string'&&!seen.has(realm.database));seen.add(realm.database);
   const st=await lstat(realm.database);assert(st.isFile()&&!st.isSymbolicLink()&&await realpath(realm.database)===realm.database,'canonical existing database required');
   const db=new DatabaseSync(realm.database);opened.push({id:realm.id,db});db.exec('PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000;');
   assert.equal(db.prepare('PRAGMA synchronous').get().synchronous,2);
   db.prepare('SELECT red_pearls FROM players LIMIT 0').all();db.prepare('SELECT kind,applied_at_ms FROM market_settlements LIMIT 0').all();
  }
  return opened.map(({id,db})=>({realm:id,...cancelRedPearlEscrow494(db)}));
 }finally{for(const{db}of opened)db.close();}
}
