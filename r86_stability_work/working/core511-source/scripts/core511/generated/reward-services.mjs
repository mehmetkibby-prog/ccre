import {GROUND_LOOT_SECONDS,groundLootExpired} from '../ground-loot-expiry.mjs';
// R31 fixed belt catalogue; generated extraction remains otherwise intact.
import {beltStatsFor} from '../belt-statistics.mjs';
import {randomInt as nativeServiceInt} from 'node:crypto';
import * as module0 from "node:crypto";
import * as module1 from "../../../../native510-bb3a6cc689c6/lib/material-level498.mjs";
import * as module2 from "../../../../native510-bb3a6cc689c6/lib/dragon-ranking498.mjs";
import * as module3 from "../../../../native510-bb3a6cc689c6/lib/level-balance487.mjs";
import * as module4 from "../../../../native510-bb3a6cc689c6/lib/extra-products.mjs";
import * as module5 from "node:crypto";
import * as module6 from "../../../../native510-bb3a6cc689c6/lib/dragon-boss.mjs";
import * as module7 from "../../../../native510-bb3a6cc689c6/lib/infinite-power.mjs";
import * as module8 from "../../../../native510-bb3a6cc689c6/lib/premium-catalog.mjs";
import * as module9 from "../../../../native510-bb3a6cc689c6/lib/arena-wings477.mjs";
import * as module10 from "node:crypto";
import * as module11 from "../quest-config-r70.mjs";
import * as module12 from "../../../../native510-bb3a6cc689c6/lib/battle-pass.mjs";
import * as module13 from "../../../../native510-bb3a6cc689c6/lib/level-progression.mjs";
import * as module14 from "../../../../native510-bb3a6cc689c6/lib/expansion65.mjs";
import * as module15 from "node:crypto";
import * as module16 from "../../../../native510-bb3a6cc689c6/lib/cauldron-catalog488.mjs";
import * as module17 from "../../../../native510-bb3a6cc689c6/lib/extra-products.mjs";
import * as module18 from "../../../../native510-bb3a6cc689c6/lib/expansion456.mjs";
import * as module19 from "../../../../native510-bb3a6cc689c6/lib/arena-wings477.mjs";
import * as module20 from "../../../../native510-bb3a6cc689c6/lib/cauldron488.mjs";
import * as module21 from "../../../../native510-bb3a6cc689c6/lib/cauldron-catalog488.mjs";
import * as module22 from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import * as module23 from "../../../../native510-bb3a6cc689c6/lib/arena-wings477.mjs";
import * as module24 from "node:crypto";
import * as module25 from "../../../../native510-bb3a6cc689c6/lib/arena-market.mjs";
import * as module26 from "../../../../native510-bb3a6cc689c6/lib/arena-wings477.mjs";
import * as module27 from "node:crypto";
import * as module28 from "../../../../native510-bb3a6cc689c6/lib/battle-pass.mjs";
import * as module29 from "../../../../native510-bb3a6cc689c6/lib/material-level498.mjs";
import * as module30 from "../../../../native510-bb3a6cc689c6/lib/level-balance487.mjs";
import * as module31 from "node:crypto";
import * as module32 from "../../../../native510-bb3a6cc689c6/lib/dragon-boss.mjs";
import * as module33 from "../../../../native510-bb3a6cc689c6/lib/solo-dungeon.mjs";
import * as module34 from "../../../../native510-bb3a6cc689c6/vds-server/src/rune-v2-combat484.mjs";
import * as module35 from "../../../../native510-bb3a6cc689c6/vds-server/src/rune-v2-location484.mjs";
import * as module36 from "../../../../native510-bb3a6cc689c6/lib/rune-v2-ranking.mjs";
import * as module37 from "../../../../native510-bb3a6cc689c6/vds-server/src/rune-v2-rollback.mjs";
import * as module38 from "../../../../native510-bb3a6cc689c6/lib/battle-pass.mjs";
import * as module39 from "../../../../native510-bb3a6cc689c6/lib/expansion65.mjs";
import * as module40 from "../../../../native510-bb3a6cc689c6/lib/level-progression.mjs";
import * as module41 from "node:crypto";
import * as module42 from "../../../../native510-bb3a6cc689c6/lib/community-event.mjs";
import * as module43 from "../../../../native510-bb3a6cc689c6/lib/guild-village.mjs";
import * as module44 from "../../../../native510-bb3a6cc689c6/lib/status.mjs";
import * as module45 from "../../../../native510-bb3a6cc689c6/lib/pumpkin499.mjs";
import * as module46 from "../../../../native510-bb3a6cc689c6/lib/arena-wings477.mjs";
import * as module47 from "../../../../native510-bb3a6cc689c6/lib/ranks.mjs";
import * as module48 from "../../../../native510-bb3a6cc689c6/lib/solo-dungeon.mjs";
import * as module49 from "../../../../native510-bb3a6cc689c6/lib/progression-materials.mjs";
import * as module50 from "../../../../native510-bb3a6cc689c6/lib/trade-glass499.mjs";
import * as module51 from "../../../../native510-bb3a6cc689c6/vds-server/src/item-lock499.mjs";
import * as module52 from "../../../../native510-bb3a6cc689c6/lib/pumpkin499.mjs";
import * as module53 from "../../../../native510-bb3a6cc689c6/lib/wheel-config483.mjs";
import * as module54 from "../../../../native510-bb3a6cc689c6/vds-server/src/database.mjs";
import * as module55 from "../../../../native510-bb3a6cc689c6/lib/enchantment-tiers.mjs";
import * as module56 from "../../../../native510-bb3a6cc689c6/lib/extra-products.mjs";
import * as module57 from "../../../../native510-bb3a6cc689c6/vds-server/src/extra-products.mjs";
import * as module58 from "../../../../native510-bb3a6cc689c6/vds-server/src/premium-trading.mjs";
import * as module59 from "../../../../native510-bb3a6cc689c6/lib/profanity.mjs";
import * as module60 from "../../../../native510-bb3a6cc689c6/lib/market-prices.mjs";
import * as module61 from "node:crypto";
import * as module62 from "../../../../native510-bb3a6cc689c6/lib/premium-catalog.mjs";
import * as module63 from "../../../../native510-bb3a6cc689c6/lib/afk-island.mjs";
import * as module64 from "../../../../native510-bb3a6cc689c6/lib/expansion456.mjs";
import * as module65 from "../../../../native510-bb3a6cc689c6/vds-server/src/features504.mjs";
import * as module66 from "../../../../native510-bb3a6cc689c6/vds-server/src/runtime-performance.mjs";
import * as module67 from "../../../../native510-bb3a6cc689c6/vds-server/src/database.mjs";
import * as module68 from "../../../../native510-bb3a6cc689c6/lib/guild-skill.mjs";
const ambient=globalThis;
export const NATIVE_MODE_SQL_BATCHES=Object.freeze(["DELETE FROM event_island_defeats444 WHERE monster_id IN(SELECT m.id FROM monsters m WHERE m.area='event' AND m.hp<=0 AND NOT EXISTS(SELECT 1 FROM normal_defeats d WHERE d.monster_id=m.id AND d.rewards_completed_at=0)); DELETE FROM event_island_defeats444 WHERE NOT EXISTS(SELECT 1 FROM monsters m WHERE m.id=event_island_defeats444.monster_id); DELETE FROM event_island_monsters444 WHERE NOT EXISTS(SELECT 1 FROM monsters m WHERE m.id=event_island_monsters444.id); DELETE FROM event_island_monsters444 WHERE id IN(SELECT m.id FROM monsters m WHERE m.area='event' AND m.hp<=0 AND NOT EXISTS(SELECT 1 FROM normal_defeats d WHERE d.monster_id=m.id AND d.rewards_completed_at=0)); DELETE FROM monsters WHERE area='event' AND hp<=0 AND NOT EXISTS(SELECT 1 FROM event_island_monsters444 e WHERE e.id=monsters.id)","SAVEPOINT premium_owner_expiry","RELEASE premium_owner_expiry","ROLLBACK TO premium_owner_expiry; RELEASE premium_owner_expiry"]);
function couponsModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const randomUUID=uuid;
const createHash=module0.createHash;
const COUPON_FACE483=Object.freeze({cp_coupon_100:100,cp_coupon_200:200,cp_coupon_500:500});
const isCoupon483=kind=>Object.hasOwn(COUPON_FACE483,kind);
const fail=message=>{throw Error(message);};
function couponActor483(db,p){
 if(!p||p.loadlab_run_id)fail('Test hesapları ÇP kuponu kullanamaz.');
 if(db.prepare("SELECT 1 FROM loadlab_entities_v1 WHERE id=? OR account_id=? LIMIT 1").get(p.id,p.account_id)||db.prepare('SELECT 1 FROM loadlab_admissions_v1 WHERE account_id=? LIMIT 1').get(p.account_id))fail('Test hesapları ÇP kuponu kullanamaz.');
}
function couponCapacity483(db,id,incoming=1,outgoing=0){
 if(db.prepare('SELECT COUNT(*) n FROM player_items WHERE player_id=?').get(id).n-outgoing+incoming>500)fail('Çantanda kupon için yer yok. Önce bir eşyanı depoya bırak.');
}
function receiptKey(kind,id){if(typeof id!=='string'||!/^cpc483-[a-f0-9-]{36}$/.test(id))fail('ÇP kuponu bulunamadı.');return 'cpc-'+kind+'-'+id;}
function verifyCoupon483(db,item,heldReceipt=null){
 if(!item||!isCoupon483(item.kind)||item.premium_origin!==1||item.equipped!==0||item.rarity!=='unique'||item.power!==0||item.expires_at_ms!==0)fail('ÇP kuponu doğrulanamadı.');
 const issue=db.prepare('SELECT action,product,result FROM premium_receipts WHERE id=?').get(receiptKey('issue',item.id));
 if(!issue||issue.action!=='coupon_issue483'||issue.product!==item.kind)fail('ÇP kuponu kaydı bulunamadı.');
 let proof;try{proof=JSON.parse(issue.result);}catch{fail('ÇP kuponu kaydı geçersiz.');}
 if(proof.itemId!==item.id||proof.face!==COUPON_FACE483[item.kind])fail('ÇP kuponu değeri geçersiz.');
 const spent=db.prepare('SELECT * FROM premium_receipts WHERE id=?').get(receiptKey('spent',item.id));
 if(spent){let guard;try{guard=JSON.parse(spent.result);}catch{}const held=heldReceipt&&spent.action==='coupon_hold_guard483'&&spent.player_id===heldReceipt.player_id&&spent.product===heldReceipt.product&&guard?.holdId===heldReceipt.id&&guard?.holdSha256===createHash('sha256').update(heldReceipt.result).digest('hex');if(!held)fail('Bu ÇP kuponu daha önce kullanılmış.');}
 else if(heldReceipt)fail('Kupon arşiv koruma kaydı bulunamadı.');
 return COUPON_FACE483[item.kind];
}
function mintCoupon483(engine,p,kind){
 const db=engine.db;couponActor483(db,p);couponCapacity483(db,p.id);
 const face=COUPON_FACE483[kind];if(!face)fail('ÇP kuponu geçersiz.');
 const id='cpc483-'+randomUUID(),at=engine.now();
 db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at,expires_at_ms,premium_origin) VALUES(?,?,?,?,'unique',0,?,'[]',0,?,0,1)").run(id,p.id,kind,face+' ÇP Kuponu',p.role,Math.floor(at/1000));
 db.prepare('INSERT INTO premium_receipts VALUES(?,?,?,?,?,?)').run(receiptKey('issue',id),p.id,'coupon_issue483',kind,JSON.stringify({itemId:id,face}),at);
 return db.prepare('SELECT * FROM player_items WHERE id=?').get(id);
}
function redeemCoupon483(engine,p,input){
 const db=engine.db;couponActor483(db,p);const id=String(input.itemId??'');receiptKey('spent',id);
 const item=db.prepare('SELECT * FROM player_items WHERE id=? AND player_id=?').get(id,p.id),face=verifyCoupon483(db,item);
 if(!Number.isSafeInteger(p.core_coins)||p.core_coins<0||p.core_coins>Number.MAX_SAFE_INTEGER-face)fail('Çekirdek Parası bakiye sınırına ulaştın.');
 db.prepare('INSERT INTO premium_receipts VALUES(?,?,?,?,?,?)').run(receiptKey('spent',id),p.id,'coupon_spent483',item.kind,JSON.stringify({itemId:id,face,requestId:input.requestId}),engine.now());
 if(db.prepare('DELETE FROM player_items WHERE id=? AND player_id=? AND equipped=0').run(id,p.id).changes!==1)fail('ÇP kuponu değişti.');
 if(db.prepare('UPDATE players SET core_coins=core_coins+? WHERE id=? AND core_coins=?').run(face,p.id,p.core_coins).changes!==1)fail('Çekirdek Parası bakiyesi değişti.');
 return face+' ÇP bakiyene eklendi.';
}
function escrowCoupon483(engine,p,input){
 couponActor483(engine.db,p);const item=engine.db.prepare('SELECT * FROM player_items WHERE id=? AND player_id=?').get(String(input.itemId),p.id);verifyCoupon483(engine.db,item);if(item.sale_locked499)fail('Kilitli eşya satılamaz. Önce eşyanın kilidini kaldır.');
 if(item.kind!==input.product||Number(input.amount??1)!==1)fail('Her ilanda bir ÇP kuponu satılabilir.');
 if(engine.db.prepare('DELETE FROM player_items WHERE id=? AND player_id=? AND equipped=0').run(item.id,p.id).changes!==1)fail('ÇP kuponu değişti.');
 return {amount:1,item};
}
function receiveCoupon483(engine,p,value,kind,sellerId,price,action){
 const db=engine.db;couponActor483(db,p);const seller=db.prepare('SELECT * FROM players WHERE id=?').get(sellerId);couponActor483(db,seller);
 if(action==='market_buy'&&(!Number.isSafeInteger(price)||price<1||price>1000000000||!Number.isSafeInteger(p.gems)||p.gems<price||!Number.isSafeInteger(seller.gems)||seller.gems<0||!Number.isSafeInteger(seller.gems+price)||seller.gems+price>9e12))fail('Mücevher bakiye sınırı.');
 const item=value?.item;verifyCoupon483(db,item);if(item.kind!==kind||value.amount!==1)fail('ÇP kuponu ilanı geçersiz.');couponCapacity483(db,p.id);
 db.prepare('INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at,expires_at_ms,premium_origin) VALUES(?,?,?,?,?,?,?,?,0,?,0,1)').run(item.id,p.id,item.kind,item.item_name,item.rarity,0,item.role,'[]',item.created_at);
}
const holdKey=id=>receiptKey('hold',id);
const holdRows=db=>db.prepare("SELECT * FROM premium_receipts WHERE id>=? AND id<? ORDER BY id").all('cpc-hold-','cpc-hold.');
const itemTable=location=>location==='bag'?'player_items':location==='storage'?'player_storage_items':fail('Kupon arşiv konumu geçersiz.');
function parseHold483(db,receipt){
 let data;try{data=JSON.parse(receipt.result);}catch{fail('Kupon arşivi okunamadı.');}
 if(receipt.action!=='coupon_hold483'||data?.schema!==1||!data.row||Array.isArray(data.row)||receipt.id!==holdKey(data.row.id)||receipt.player_id!==data.row.player_id||receipt.product!==data.row.kind)fail('Kupon arşiv kaydı doğrulanamadı.');
 itemTable(data.location);verifyCoupon483(db,data.location==='storage'?{...data.row,equipped:0}:data.row,receipt);
 if(data.location==='storage'&&(data.row.storage_type!=='gear'||data.row.amount!==1||!Number.isSafeInteger(data.row.slot)||data.row.slot<1))fail('Depodaki kupon arşivi doğrulanamadı.');
 couponActor483(db,db.prepare('SELECT * FROM players WHERE id=?').get(receipt.player_id));return data;
}
function insertExact483(db,location,row){
 const table=itemTable(location),columns=new Set(db.prepare('PRAGMA table_info('+table+')').all().map(r=>r.name)),keys=Object.keys(row);
 if(keys.some(k=>!columns.has(k))||!keys.includes('id')||!keys.includes('player_id'))fail('Kupon arşiv sütunları doğrulanamadı.');
 db.prepare('INSERT INTO '+table+'('+keys.map(k=>'"'+k.replaceAll('"','""')+'"').join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').run(...keys.map(k=>row[k]));
}
function assertCouponRollback483(db){
 const kinds=Object.keys(COUPON_FACE483),marks=kinds.map(()=>'?').join(','),returns=[],trades=[],archive=[];const known=new Set();
 for(const receipt of holdRows(db)){const data=parseHold483(db,receipt),id=data.row.id;if(db.prepare('SELECT 1 FROM player_items WHERE id=? UNION ALL SELECT 1 FROM player_storage_items WHERE id=? LIMIT 1').get(id,id)||db.prepare("SELECT 1 FROM premium_listings WHERE json_extract(payload,'$.item.id')=? LIMIT 1").get(id))fail('Arşivdeki kupon kimliği başka bir yerde kullanılıyor.');known.add(id);}
 for(const location of ['bag','storage'])for(const row of db.prepare('SELECT * FROM '+itemTable(location)+' WHERE kind IN ('+marks+') ORDER BY id').all(...kinds)){
  verifyCoupon483(db,location==='storage'?{...row,equipped:0}:row);couponActor483(db,db.prepare('SELECT * FROM players WHERE id=?').get(row.player_id));
  if(location==='storage'&&(row.storage_type!=='gear'||row.amount!==1))fail('Depodaki kupon doğrulanamadı.');
  if(known.has(row.id)||db.prepare('SELECT 1 FROM '+itemTable(location==='bag'?'storage':'bag')+' WHERE id=?').get(row.id))fail('Kupon kimliği birden fazla yerde; geri dönüş durduruldu.');known.add(row.id);archive.push({location,row});
 }
 for(const row of db.prepare('SELECT * FROM premium_listings WHERE product IN ('+marks+') ORDER BY id').all(...kinds)){
  let value;try{value=JSON.parse(row.payload);}catch{fail('Kupon ilanı geri dönüş için okunamadı.');}
  const item=value?.item;verifyCoupon483(db,item);if(item.kind!==row.product||value.amount!==1)fail('Kupon ilanı geri dönüş için doğrulanamadı.');
  const p=db.prepare('SELECT * FROM players WHERE id=?').get(row.seller_id);couponActor483(db,p);
  if(known.has(item.id)||db.prepare('SELECT 1 FROM player_items WHERE id=? UNION ALL SELECT 1 FROM player_storage_items WHERE id=? LIMIT 1').get(item.id,item.id))fail('Kupon kimliği birden fazla yerde; geri dönüş durduruldu.');
  known.add(item.id);returns.push({row,item,p});
 }
 for(const trade of db.prepare("SELECT * FROM player_trades WHERE status IN ('invited','open')").all()){
  let offers;try{offers=[JSON.parse(trade.a_offer),JSON.parse(trade.b_offer)];}catch{fail('Ticaret kaydı geri dönüş için okunamadı.');}
  if(offers.some(offer=>Array.isArray(offer.items)&&offer.items.some(item=>isCoupon483(item.kind))))trades.push(trade);
 }
 return {returns,trades,archive};
}
function reconcileCouponRollback483(db,{callerTransaction=false}={}){
 if(callerTransaction&&!db.isTransaction)fail('Kupon geri dönüşü kilitli transaction gerektirir.');
 if(!callerTransaction)db.exec('BEGIN IMMEDIATE');try{
  const {returns,trades,archive}=assertCouponRollback483(db);
  for(const {row,item,p}of returns){
   const returned={...item,player_id:p.id};insertExact483(db,'bag',returned);archive.push({location:'bag',row:returned});db.prepare('DELETE FROM premium_listings WHERE id=?').run(row.id);
  }
  for(const trade of trades){
   db.prepare("UPDATE player_trades SET status='cancelled',revision=revision+1,a_ready=0,b_ready=0,a_confirm=0,b_confirm=0 WHERE id=?").run(trade.id);db.prepare('DELETE FROM player_trade_locks WHERE trade_id=?').run(trade.id);
  }
  for(const {location,row}of archive){
   const serialized=JSON.stringify({schema:1,location,row}),at=Date.now();
   db.prepare('INSERT INTO premium_receipts VALUES(?,?,?,?,?,?)').run(holdKey(row.id),row.player_id,'coupon_hold483',row.kind,serialized,at);
   db.prepare('INSERT INTO premium_receipts VALUES(?,?,?,?,?,?)').run(receiptKey('spent',row.id),row.player_id,'coupon_hold_guard483',row.kind,JSON.stringify({holdId:holdKey(row.id),holdSha256:createHash('sha256').update(serialized).digest('hex')}),at);
   if(db.prepare('DELETE FROM '+itemTable(location)+' WHERE id=? AND player_id=?').run(row.id,row.player_id).changes!==1)fail('Kupon arşivlenirken konumu değişti.');
  }
  if(!callerTransaction)db.exec('COMMIT');return {returned:returns.length,cancelled:trades.length,archived:archive.length};
 }catch(error){if(!callerTransaction)db.exec('ROLLBACK');throw error;}
}
function restoreCouponHolds483(db,{callerTransaction=false}={}){
 const pending=holdRows(db);if(!pending.length)return {restored:0,relocatedStorage:0,relocatedToBag:0};
 if(callerTransaction&&!db.isTransaction)fail('Kupon geri yükleme kilitli transaction gerektirir.');
 if(!callerTransaction)db.exec('BEGIN IMMEDIATE');try{
  const rows=holdRows(db),parsed=rows.map(receipt=>({receipt,...parseHold483(db,receipt)}));let relocatedStorage=0,relocatedToBag=0;
  for(const {row}of parsed){if(db.prepare('SELECT 1 FROM player_items WHERE id=? UNION ALL SELECT 1 FROM player_storage_items WHERE id=? LIMIT 1').get(row.id,row.id)||db.prepare("SELECT 1 FROM premium_listings WHERE json_extract(payload,'$.item.id')=? LIMIT 1").get(row.id))fail('Arşivdeki kupon kimliği başka bir yerde kullanılıyor.');}
  for(const {receipt,location,row}of parsed){
   let target=location,restoredRow=row;
   if(location==='storage'){
    const p=db.prepare('SELECT storage_pages FROM players WHERE id=?').get(row.player_id),capacity=48+24*Math.max(0,Math.min(4,p.storage_pages??0));
    const slots=new Set(db.prepare('SELECT slot FROM player_storage_items WHERE player_id=?').all(row.player_id).map(r=>r.slot));
    if(row.slot>capacity||slots.has(row.slot)){
     let slot=1;while(slot<=capacity&&slots.has(slot))slot++;
     if(slot<=capacity){row.slot=slot;relocatedStorage++;}
     else{
      // Old R15 can fill the depot while coupons are held. Never restore paid
      // value beyond the UI's visible capacity; forced return may exceed bag cap.
      const {slot,storage_type,amount,payload,...bagRow}=row;target='bag';restoredRow={...bagRow,equipped:0};relocatedToBag++;
     }
    }
   }
   insertExact483(db,target,restoredRow);if(db.prepare("DELETE FROM premium_receipts WHERE id=? AND action='coupon_hold_guard483'").run(receiptKey('spent',row.id)).changes!==1)fail('Kupon arşiv koruma kaydı değişti.');if(db.prepare("DELETE FROM premium_receipts WHERE id=? AND action='coupon_hold483'").run(receipt.id).changes!==1)fail('Kupon arşiv makbuzu değişti.');
  }
  if(!callerTransaction)db.exec('COMMIT');return {restored:parsed.length,relocatedStorage,relocatedToBag};
 }catch(error){if(!callerTransaction)db.exec('ROLLBACK');throw error;}
}
return {COUPON_FACE483,isCoupon483,couponActor483,couponCapacity483,verifyCoupon483,mintCoupon483,redeemCoupon483,escrowCoupon483,receiveCoupon483,assertCouponRollback483,reconcileCouponRollback483,restoreCouponHolds483};}
function dragonModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const materialLevelPolicy498=module1.materialLevelPolicy498;
const DRAGON_AWARD_PARTICIPANTS_SQL498=module2.DRAGON_AWARD_PARTICIPANTS_SQL498;
const dragonWinner498=module2.dragonWinner498;
const balanceFromSnapshot487=module3.balanceFromSnapshot487;
const balanceFactor487=module3.balanceFactor487;
const COSMETIC_DURATION_MS=module4.COSMETIC_DURATION_MS;
const EXTRA_PRODUCTS=module4.EXTRA_PRODUCTS;
const randomUUID=uuid;
const DRAGON_ID=module6.DRAGON_ID;
const DRAGON_NAME=module6.DRAGON_NAME;
const DRAGON_SPAWN=module6.DRAGON_SPAWN;
const DRAGON_CATALOG=module6.DRAGON_CATALOG;
const DRAGON_CATALOG_BY_ID=module6.DRAGON_CATALOG_BY_ID;
const defaultDragonConfig=module6.defaultDragonConfig;
const validateDragonConfig=module6.validateDragonConfig;
const requireDragonLoot=module6.requireDragonLoot;
const rollDragonLoot=module6.rollDragonLoot;
const dragonDropPosition=module6.dragonDropPosition;
const infiniteEquipmentPower=module7.infiniteEquipmentPower;
const COSTUMES=module8.COSTUMES;
function ensureDragonSchema(db){
 db.exec(`CREATE TABLE IF NOT EXISTS dragon_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS dragon_drop_payloads(drop_id TEXT PRIMARY KEY,payload_json TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS dragon_defeat_receipts(spawn_round INTEGER PRIMARY KEY,created_at INTEGER NOT NULL);`);
 const cfg=defaultDragonConfig(db.prepare('SELECT boss_hp FROM game_settings WHERE id=1').get()?.boss_hp??18000);
 db.prepare('INSERT OR IGNORE INTO dragon_settings(id,config_json) VALUES(1,?)').run(JSON.stringify(cfg));
 db.prepare(`INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,variant,area,channel,is_boss,is_stone,summoned,respawn_at,spawn_round,despawn_at)
 VALUES(?,?,?,?,0,?,'dragon','dragon',0,0,0,0,unixepoch()+10800,0,0)`).run(DRAGON_ID,DRAGON_NAME,DRAGON_SPAWN.x,DRAGON_SPAWN.y,cfg.hp);
 // Retire the old five-minute expiry without healing or killing an active life.
 db.prepare('UPDATE monsters SET despawn_at=0 WHERE id=? AND despawn_at!=0').run(DRAGON_ID);
}
function createDragonBoss(db,{now=Date.now,random=Math.random}={}){
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 const settings=()=>{const r=db.prepare('SELECT * FROM dragon_settings WHERE id=1').get();return {revision:r.revision,config:JSON.parse(r.config_json)};};
 const spawn=()=>{const cfg=requireDragonLoot(settings().config);return db.prepare(`UPDATE monsters SET hp=?,max_hp=?,x=?,y=?,respawn_at=0,despawn_at=0,spawn_round=spawn_round+1 WHERE id=? AND hp<=0`).run(cfg.hp,cfg.hp,DRAGON_SPAWN.x,DRAGON_SPAWN.y,DRAGON_ID);};
 function grant(p,item,amount,drop){
  const id=p.id,t=Math.floor(now()/1000);
  if(item.type==='gear'){
   for(let i=0;i<amount;i++)db.prepare('INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at) VALUES(?,?,?,?,?,?,?,?,0,?)').run(randomUUID(),id,item.kind,drop.item_name,item.rarity,drop.power,item.role,drop.enchantments,t);
  }else if(item.type==='resource')db.prepare(`UPDATE players SET ${item.column}=${item.column}+? WHERE id=?`).run(amount,id);
  else if(item.type==='stone'||item.type==='material'){const table=item.type==='stone'?'player_stones':'dungeon_materials';db.prepare(`INSERT INTO ${table}(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount`).run(id,item.kind,amount);}
  else if(item.type==='pet'){const duration=item.kind==='starter'?259200:604800;db.prepare(`INSERT INTO player_pets(player_id,kind,equipped,acquired_at) VALUES(?,?,0,?) ON CONFLICT(player_id,kind) DO UPDATE SET acquired_at=MAX(excluded.acquired_at,player_pets.acquired_at+?)`).run(id,item.kind,t+duration*(amount-1),duration*amount);}
  else if(item.type==='rank')db.prepare(`UPDATE players SET rank_unlocked=json_insert(rank_unlocked,'$[#]',?) WHERE id=? AND NOT EXISTS(SELECT 1 FROM json_each(rank_unlocked) WHERE value=?)`).run(item.kind,id,item.kind);
  else if(item.type==='special'){if(item.kind==='starter_chest'){for(let i=0;i<amount;i++)db.prepare('INSERT INTO starter_admin_grants(request_id,account_id,player_id,admin_id,granted_at_ms) VALUES(?,?,?,?,?)').run(randomUUID(),p.account_id??'',id,'dragon-loot',now());}else if(item.kind==='rod')db.prepare('UPDATE players SET has_rod=1 WHERE id=?').run(id);else db.prepare('INSERT OR IGNORE INTO dungeon_wings(player_id,equipped) VALUES(?,0)').run(id);}
  else if(item.type==='premium'){
   const k=item.kind,cols={afk_ticket:'afk_tickets',enchant_add:'enchant_add_scrolls',enchant_scroll:'enchant_scrolls',item_link:'item_link_orbs',rename_scroll:'rename_scrolls'};
   if(EXTRA_PRODUCTS[k])db.prepare(`UPDATE players SET ${EXTRA_PRODUCTS[k].stock}=${EXTRA_PRODUCTS[k].stock}+? WHERE id=?`).run(amount,id);
   else if(cols[k])db.prepare(`UPDATE players SET ${cols[k]}=${cols[k]}+? WHERE id=?`).run(amount,id);
   else if(k==='xp_ring'||k==='drop_charm')db.prepare(`UPDATE players SET ${k}_until=MAX(${k}_until,?)+? WHERE id=?`).run(t,5*86400*amount,id);
   else if(k==='wings')db.prepare('UPDATE players SET has_wings=1,wings_expires_at_ms=MAX(wings_expires_at_ms,?)+? WHERE id=?').run(now(),7*86400000*amount,id);
   else if(k==='auto_potion')db.prepare('UPDATE players SET auto_potion_owned=1,auto_potion_remaining=MAX(0,auto_potion_remaining)+?,auto_potion_total=MAX(0,auto_potion_remaining)+? WHERE id=?').run(1000000*amount,1000000*amount,id);
   else if(k==='storage_page')db.prepare('UPDATE players SET storage_pages=MIN(4,storage_pages+?) WHERE id=?').run(amount,id);
   else if(k==='costume'){
    const existing=db.prepare("SELECT id FROM player_items WHERE player_id=? AND kind='costume' AND role=? LIMIT 1").get(id,p.role);
    if(existing)db.prepare('UPDATE player_items SET expires_at_ms=MAX(expires_at_ms,?)+?,premium_origin=1 WHERE id=?').run(now(),COSMETIC_DURATION_MS*amount,existing.id);
    else db.prepare(`INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at,expires_at_ms,premium_origin) VALUES(?,?,'costume',?,'unique',50,?,'[{"kind":"hp","value":500}]',0,?,?,1)`).run(randomUUID(),id,COSTUMES[p.role].name,p.role,t,now()+COSMETIC_DURATION_MS*amount);
   }
   else if(['stall_skin','teleport_skin','weapon_skin'].includes(k)){db.prepare(`UPDATE players SET ${k}_owned=1 WHERE id=?`).run(id);if(k!=='stall_skin')db.prepare(`UPDATE players SET ${k}_expires_at_ms=MAX(${k}_expires_at_ms,?)+? WHERE id=?`).run(now(),COSMETIC_DURATION_MS*amount,id);}
   else throw new Error('Ürün teslim edilemedi.');
  }else throw new Error('Eşya türü geçersiz.');
 }
 return {
 settings, catalog:()=>DRAGON_CATALOG,
 grantCatalog(playerId,item,amount,drop){if(!db.isTransaction)throw Error("Catalog rewards require an atomic transaction");const p=db.prepare("SELECT * FROM players WHERE id=?").get(playerId);if(!p)throw Error("Oyuncu bulunamadı.");grant(p,item,amount,drop);},
 describeDrops(rows){return rows.map(drop=>{
  if(drop.monster_id!==DRAGON_ID)return drop;
  const payload=db.prepare('SELECT payload_json FROM dragon_drop_payloads WHERE drop_id=?').get(drop.id);
  const itemId=payload?JSON.parse(payload.payload_json).itemId:null;
  return itemId?{...drop,catalog_id:itemId}:drop;
 });},
 infinitePower:(item)=>infiniteEquipmentPower(item,{infinite_power_percent:30,infinite_weapon_power:230,...JSON.parse(db.prepare('SELECT value FROM dungeon_settings WHERE id=1').get()?.value??'{}')}),
 save(value,revision){const cfg=requireDragonLoot(validateDragonConfig(value));return transaction(()=>{if(!db.prepare('UPDATE dragon_settings SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(cfg),revision).changes)throw new Error('Ayarlar değişti; paneli yenile.');if(!cfg.enabled)db.prepare('UPDATE monsters SET hp=0,respawn_at=0,despawn_at=0 WHERE id=?').run(DRAGON_ID);else db.prepare('UPDATE monsters SET respawn_at=? WHERE id=? AND hp<=0 AND respawn_at=0').run(Math.floor(now()/1000)+cfg.interval,DRAGON_ID);return settings();});},
 command(action){return transaction(()=>{if(action==='spawn'){if(!settings().config.enabled)throw new Error('Önce ejderhayı etkinleştir.');spawn();}else if(action==='remove')db.prepare('UPDATE monsters SET hp=0,despawn_at=0,respawn_at=? WHERE id=?').run(Math.floor(now()/1000)+settings().config.interval,DRAGON_ID);else throw new Error('Geçersiz boss işlemi.');});},
 tick({cleanup=true}={}){
 const cfg=settings().config,t=Math.floor(now()/1000),m=db.prepare('SELECT hp,despawn_at,respawn_at FROM monsters WHERE id=?').get(DRAGON_ID);
 if(!cfg.enabled||!m)return;
 // Most heartbeats have nothing to change. Re-read under the transaction when
 // work is due so a concurrent admin edit cannot spawn or reset a stale life.
 const due=m.hp>0&&m.despawn_at!==0||m.hp<=0&&(m.respawn_at<=0||m.respawn_at<=t&&cfg.loot.some(rule=>rule.chance>0));
 if(!due&&(!cleanup||!db.prepare('SELECT 1 FROM dragon_drop_payloads WHERE NOT EXISTS(SELECT 1 FROM world_drops d WHERE d.id=dragon_drop_payloads.drop_id) LIMIT 1').get()))return;
 return transaction(()=>{const cfg=settings().config,t=Math.floor(now()/1000),m=db.prepare('SELECT * FROM monsters WHERE id=?').get(DRAGON_ID);if(!cfg.enabled||!m)return;
 if(m.hp>0&&m.despawn_at!==0)db.prepare('UPDATE monsters SET despawn_at=0 WHERE id=?').run(DRAGON_ID);
 // A legacy empty table must not throw from the global world tick. Admin can
 // repair it; new saves/spawns reject it before creating an unrewarded life.
 else if(m.hp<=0&&m.respawn_at>0&&m.respawn_at<=t&&cfg.loot.some(rule=>rule.chance>0))spawn();else if(m.hp<=0&&m.respawn_at<=0)db.prepare('UPDATE monsters SET respawn_at=? WHERE id=?').run(t+cfg.interval,DRAGON_ID);
 if(cleanup)db.prepare('DELETE FROM dragon_drop_payloads WHERE NOT EXISTS(SELECT 1 FROM world_drops d WHERE d.id=dragon_drop_payloads.drop_id)').run();});},
 award(pending,makeGear){return transaction(()=>{
  const t=Math.floor(now()/1000),receipt=db.prepare('INSERT OR IGNORE INTO dragon_defeat_receipts(spawn_round,created_at) VALUES(?,?)').run(pending.spawn_round,t);
  if(!receipt.changes)return {awarded:false,groundDrops:0};
  const participants=db.prepare(DRAGON_AWARD_PARTICIPANTS_SQL498).all(DRAGON_ID,pending.spawn_round);
  const winner498=dragonWinner498(participants),winnerBonus498=winner498?Math.max(0,Math.min(150,9000000000000-winner498.gems)):0;if(winnerBonus498>0)db.prepare('UPDATE players SET gems=gems+? WHERE id=?').run(winnerBonus498,winner498.id);
  const config=validateDragonConfig(JSON.parse(pending.loot_profile_json)),halloweenRate456=Math.max(0,Math.min(100,Number(JSON.parse(pending.events_snapshot||'{}').halloween)||0));let count=0;
  const materialLevel498=materialLevelPolicy498(JSON.parse(pending.events_snapshot||'{}'));
  for(const owner of participants){const balance487=balanceFactor487(balanceFromSnapshot487(JSON.parse(pending.events_snapshot||'{}')),"dragon",owner.level);const rewards=rollDragonLoot(config,random,balance487,materialLevel498);if(halloweenRate456>0&&random()*100<halloweenRate456*balance487)rewards.push({itemId:'material:halloween_pumpkin',amount:1});for(const [index,rule] of rewards.entries()){if(pending.pearls_retired===1&&rule.itemId==='resource:pearls')continue;const position=dragonDropPosition(pending.x,pending.y,index,rewards.length);const item=DRAGON_CATALOG_BY_ID.get(rule.itemId),amount=rule.amount,id=randomUUID();const gear=item.type==='gear'?makeGear(item):{power:0,enchantments:'[]'};
   db.prepare(`INSERT INTO world_drops(id,owner_id,monster_id,kind,item_name,rarity,power,amount,role,enchantments,x,y,expires_at,collectible_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,owner.id,DRAGON_ID,item.type==='gear'?item.kind:'dragon_reward',gear.name??item.name,item.rarity??'orange',gear.power,amount,item.role??owner.role,gear.enchantments,position.x,position.y,t+GROUND_LOOT_SECONDS,t+5);
   db.prepare('INSERT INTO dragon_drop_payloads(drop_id,payload_json) VALUES(?,?)').run(id,JSON.stringify({itemId:item.id}));count++;
  }}
  db.prepare(`INSERT OR IGNORE INTO normal_reward_claims(monster_id,spawn_round,player_id,claim_token,awarded_at) SELECT monster_id,spawn_round,player_id,?,? FROM monster_participants WHERE monster_id=? AND spawn_round=?`).run(randomUUID(),t,DRAGON_ID,pending.spawn_round);
  db.prepare('UPDATE normal_defeats SET rewards_completed_at=? WHERE monster_id=? AND spawn_round=?').run(Math.max(1,t),DRAGON_ID,pending.spawn_round);
  return {awarded:true,groundDrops:count,winnerId:winner498?.id??null,winnerBonusGems:winnerBonus498};
 });},
 collect(playerId,dropId){return transaction(()=>{const p=db.prepare('SELECT * FROM players WHERE id=?').get(playerId),drop=db.prepare('SELECT d.*,v.payload_json FROM world_drops d JOIN dragon_drop_payloads v ON v.drop_id=d.id WHERE d.id=? AND d.owner_id=? AND d.monster_id=?').get(dropId,playerId,DRAGON_ID),t=Math.floor(now()/1000);if(!p||p.hp<=0||p.area!=='dragon'||!drop||groundLootExpired(drop.expires_at,t)||drop.collectible_at>t&&Math.hypot(p.x-drop.x,p.y-drop.y)>280)throw new Error('Ganimet alınamıyor.');const item=DRAGON_CATALOG_BY_ID.get(JSON.parse(drop.payload_json).itemId);if(!item)throw new Error('Eşya bulunamadı.');grant(p,item,drop.amount,drop);db.prepare('DELETE FROM world_drops WHERE id=?').run(dropId);db.prepare('DELETE FROM dragon_drop_payloads WHERE drop_id=?').run(dropId);return {ok:true,message:`${drop.item_name} çantana eklendi.`};});}
 };
}
return {ensureDragonSchema,createDragonBoss};}
function questsModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const arenaWingsOwned477=module9.arenaWingsOwned477;
const arenaWingsActive477=module9.arenaWingsActive477;
const grantArenaWings477=module9.grantArenaWings477;
const resumeArenaWings477=module9.resumeArenaWings477;
const projectArenaWingAppearance477=module9.projectArenaWingAppearance477;
const randomUUID=uuid;
const defaultQuests438=module11.defaultQuests438;
const validateQuests438=module11.validateQuests438;
const QUEST_CATALOG438=module11.QUEST_CATALOG438;
const QUEST_BY_ID438=module11.QUEST_BY_ID438;
const QUEST_EVENTS438=module11.QUEST_EVENTS438;
const questClassItem438=module11.questClassItem438;
const questEnchantments438=module11.questEnchantments438;
const battlePassXpSql=module12.battlePassXpSql;
const levelCosts=module13.levelCosts;
const playerLevelCap=module14.playerLevelCap;
const createDragonBoss=dependencies[1].createDragonBoss;
const isCoupon483=dependencies[0].isCoupon483;
const mintCoupon483=dependencies[0].mintCoupon483;
function ensureQuests438Schema(db){
 db.exec('BEGIN IMMEDIATE');try{
  const columns=new Set(db.prepare('PRAGMA table_info(players)').all().map(c=>c.name));
  for(const column of ['quest_kills438','quest_fish438'])if(!columns.has(column))db.exec(`ALTER TABLE players ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0`);
  db.exec(`CREATE TABLE IF NOT EXISTS quest_settings438(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,enabled INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS quest_claims438(player_id TEXT NOT NULL,quest_id TEXT NOT NULL,kills INTEGER NOT NULL,fish INTEGER NOT NULL,reward_json TEXT NOT NULL,claimed_at INTEGER NOT NULL,PRIMARY KEY(player_id,quest_id));
   CREATE TABLE IF NOT EXISTS quest_receipts438(player_id TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,result_json TEXT NOT NULL,PRIMARY KEY(player_id,request_id));
   CREATE TABLE IF NOT EXISTS quest_ids438(id TEXT PRIMARY KEY,event TEXT NOT NULL);`);
  db.prepare('INSERT OR IGNORE INTO quest_settings438(id,config_json) VALUES(1,?)').run(JSON.stringify(defaultQuests438()));
  const config=validateQuests438(JSON.parse(db.prepare('SELECT config_json FROM quest_settings438 WHERE id=1').get().config_json));
  for(const q of config.quests)db.prepare('INSERT OR IGNORE INTO quest_ids438 VALUES(?,?)').run(q.id,q.event);
  // Preserve every earlier first-evolution payment; never pay a second starter reward.
  db.exec(`INSERT OR IGNORE INTO quest_claims438(player_id,quest_id,kills,fish,reward_json,claimed_at)
   SELECT player_id,'first_evolution',0,0,'[]',claimed_at*1000 FROM player_evolution_quest WHERE claimed_at IS NOT NULL;`);
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}
function createQuests438(db,{now=Date.now,random=Math.random}={}){
 const dragon=createDragonBoss(db,{now,random});
 const player=db.prepare('SELECT * FROM players WHERE id=?');
 const setting=db.prepare('SELECT * FROM quest_settings438 WHERE id=1');
 const claimRows=db.prepare('SELECT * FROM quest_claims438 WHERE player_id=?');
 const progressR70=module11.createQuestProgressR70(db,{now});
 const evolution=db.prepare('SELECT completed_at,claimed_at FROM player_evolution_quest WHERE player_id=?');
 const receipt=db.prepare('SELECT fingerprint,result_json FROM quest_receipts438 WHERE player_id=? AND request_id=?');
 let current;
 const refresh=()=>{const row=setting.get();current={revision:row.revision,config:validateQuests438(JSON.parse(row.config_json))};return settings();};
 const settings=()=>({...current,catalog:QUEST_CATALOG438,eventTypes:QUEST_EVENTS438});
 const get=id=>{const p=player.get(id);if(!p)throw Error('Karakter bulunamadı.');return p;};
 const read=id=>{
  const p=get(id),earned=new Map(claimRows.all(id).map(c=>[c.quest_id,c])),evo=evolution.get(id);
  let blocked=false,baselineKills=0,baselineFish=0;
  const quests=current.config.quests.map(q=>{
   const claim=earned.get(q.id),claimed=!!claim,available=!blocked&&!claimed&&current.config.enabled;
   const progress=claimed?q.target:!available?0:q.event==='kill'?Math.min(q.target,Math.max(0,p.quest_kills438-baselineKills)):q.event==='fish'?Math.min(q.target,Math.max(0,p.quest_fish438-baselineFish)):q.event==='evolution'?Number(!!evo):Math.min(q.target,Math.max(0,progressR70(q.event,p)));
   if(claim){baselineKills=Math.max(baselineKills,claim.kills);baselineFish=Math.max(baselineFish,claim.fish);}else blocked=true;
   return {...q,rewards:claim?JSON.parse(claim.reward_json):q.rewards,progress,claimed,available,complete:claimed||available&&progress>=q.target};
  });
  return {enabled:current.config.enabled,revision:current.revision,role:p.role,level:p.level,gems:p.gems,quests,
   guidance:{firstKill:p.quest_kills438>0,status:p.level>=2&&(p.stat_attack??0)+(p.stat_defense??0)+(p.stat_hp??0)===0,skill:p.gems>=35&&Math.max(p.skill_one??1,p.skill_two??1,p.skill_three??1)<=1},
   catalog:QUEST_CATALOG438.filter(i=>quests.some(q=>q.rewards.some(r=>r.itemId===i.id))).map(i=>questClassItem438(i,p.role))};
 };
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
 const grantXp=(id,amount)=>{
  const p=get(id),s=db.prepare('SELECT * FROM game_settings WHERE id=1').get()??{},costs=levelCosts(s),cap=playerLevelCap(s,p);
  const xp=p.level>=cap?p.xp:Math.min(p.xp+amount,costs.slice(0,cap-1).reduce((a,b)=>a+b,0));
  let threshold=0,level=1;for(const cost of costs.slice(0,cap-1)){threshold+=cost;if(xp<threshold)break;level++;}
  db.prepare(`UPDATE players SET ${battlePassXpSql(String(amount))},${globalThis.__colRanks?'rank_xp=CASE WHEN level>=65 AND rank_tier>0 THEN MIN(9000000000000,rank_xp+?) ELSE rank_xp END,':''}xp=?,level=? WHERE id=?`).run(...(globalThis.__colRanks?[amount]:[]),xp,Math.max(p.level,level),id);
 };
 const grant=(id,reward)=>{
  const item=QUEST_BY_ID438.get(reward.itemId),p=get(id);
  if(item.type==='premium'&&isCoupon483(item.kind))return mintCoupon483({db,now},p,item.kind);
  if(item.type==='xp')return grantXp(id,reward.amount);
  if(item.type==='class'){
   const s={...(db.prepare('SELECT * FROM game_settings WHERE id=1').get()??{}),...(db.prepare('SELECT * FROM combat_settings WHERE id=1').get()??{})},gear=questClassItem438(item,p.role);
   const lo=Math.max(0,Math.floor(Number(s['blue_'+item.kind+'_power_min'])||15)),hi=Math.max(lo,Math.floor(Number(s['blue_'+item.kind+'_power_max'])||25)),power=lo+Math.floor(Math.max(0,Math.min(.999999999,random()))*(hi-lo+1));
   return db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,equipped,enchantments,created_at) VALUES(?,?,?,?,'blue',?,?,0,?,?)").run(randomUUID(),id,item.kind,gear.name,power,p.role,JSON.stringify(questEnchantments438(item.kind,s,random)),Math.floor(now()/1000));
  }
  if(item.id==='resource:core_coins')return db.prepare('UPDATE players SET core_coins=core_coins+? WHERE id=?').run(reward.amount,id);
  if(item.id==='arena:wings')return grantArenaWings477(db,id,now());
  if(item.id==='arena:exp_ring')return db.prepare('UPDATE players SET arena_exp_rings=arena_exp_rings+? WHERE id=?').run(reward.amount,id);
  if(item.type==='rune')return db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,equipped,enchantments,created_at) VALUES(?,?,?,?,'unique',?,?,0,'[]',?)").run(randomUUID(),id,item.kind,item.name,reward.power,p.role,Math.floor(now()/1000));
  return dragon.grantCatalog(id,item,reward.amount,{item_name:item.name,power:reward.power??0,enchantments:item.type==='gear'?JSON.stringify(questEnchantments438(item.kind,{...(db.prepare('SELECT * FROM game_settings WHERE id=1').get()??{}),...(db.prepare('SELECT * FROM combat_settings WHERE id=1').get()??{})},random)):'[]'});
 };
 refresh();
 return {grantCauldronReward488(id,reward){
   if(!db.isTransaction)throw Error('Kazan tecrübe ödülü atomik işlem gerektirir.');
   const item=QUEST_BY_ID438.get(reward?.itemId);if(!item||!['xp','class'].includes(item.type)||!Number.isSafeInteger(reward.amount)||reward.amount<1||reward.amount>(item.type==='xp'?1000000:1))throw Error('Kazan görev ödülü geçersiz.');
   return grant(id,reward);
  },read,settings,refresh,get enabled(){return current.config.enabled;},
  save(input,revision){const config=validateQuests438(input);transaction(()=>{
   if(setting.get().revision!==revision)throw Error('Görev ayarları değişti. Paneli yenile.');
   const known=new Map(db.prepare('SELECT * FROM quest_ids438').all().map(q=>[q.id,q.event]));
   for(const q of config.quests){if(known.has(q.id)&&known.get(q.id)!==q.event)throw Error('Bir görev kimliğinin türü değiştirilemez; yeni kimlik kullan.');known.set(q.id,q.event);}
   if(known.size>200)throw Error('En fazla 200 kalıcı görev kimliği kullanılabilir. Mevcut görevleri düzenle.');
   for(const q of config.quests)db.prepare('INSERT OR IGNORE INTO quest_ids438 VALUES(?,?)').run(q.id,q.event);
   db.prepare('UPDATE quest_settings438 SET config_json=?,enabled=?,revision=revision+1 WHERE id=1').run(JSON.stringify(config),Number(config.enabled));
  });return refresh();},
  command(id,input){return transaction(()=>{
   refresh();
   if(typeof input?.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId))throw Error('İşlem kimliği geçersiz.');
   if(!['quest_claim','quest_tutorial'].includes(input.action))throw Error('Geçersiz görev işlemi.');
   const fingerprint=JSON.stringify([input.action,input.questId]),prior=receipt.get(id,input.requestId);
   if(prior){if(prior.fingerprint!==fingerprint)throw Error('İşlem kimliği başka bir işlemde kullanılmış.');return {...JSON.parse(prior.result_json),state:read(id),replayed:true};}
   const state=read(id),quest=state.quests.find(q=>q.id===input.questId);
   if(!quest)throw Error('Görev bulunamadı.');
   if(quest.claimed)return {ok:true,replayed:true,message:'Bu görevin ödülü zaten teslim edildi.',state};
   if(input.revision!==current.revision)throw Error('Görev bilgileri değişti. Paneli yenile.');
   if(!quest.available)throw Error('Önce sıradaki görevi tamamla.');
   const p=get(id);
   if(input.action==='quest_tutorial'){
    if(quest.event!=='market'||p.area!=='bazaar')throw Error('Pazar öğretisini Pazar Alanı’nda tamamlayabilirsin.');
   }else if(quest.event==='market'||!quest.complete)throw Error('Görev hedefi henüz tamamlanmadı.');
   // Claim identity, all rewards, legacy handoff and reply are one durable write.
   db.prepare('INSERT INTO quest_claims438 VALUES(?,?,?,?,?,?)').run(id,quest.id,p.quest_kills438,p.quest_fish438,JSON.stringify(quest.rewards),now());
   for(const reward of quest.rewards)grant(id,reward);
   if(quest.id==='first_evolution')db.prepare('UPDATE player_evolution_quest SET claimed_at=COALESCE(claimed_at,?) WHERE player_id=?').run(Math.floor(now()/1000),id);
   const result={ok:true,message:quest.rewards.length?'Görev tamamlandı; ödüllerin çantana eklendi.':'Görev tamamlandı.'};
   db.prepare('INSERT INTO quest_receipts438 VALUES(?,?,?,?)').run(id,input.requestId,fingerprint,JSON.stringify(result));
   return {...result,state:read(id)};
  });}
 };
}
return {ensureQuests438Schema,createQuests438};}
function runeLibraryModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const RUNE_TYPES=Object.freeze({
 rune_defense:{label:'Safir Siper Rünü',short:'Savunma',stat:'defense',color:'#55aeff',image:'rune-defense-v422',shard:'Safir Siper Parçası'},
 rune_attack:{label:'Kızıl Kudret Rünü',short:'Saldırı',stat:'attack',color:'#ff6478',image:'rune-attack-v422',shard:'Kızıl Kudret Parçası'},
 rune_hp:{label:'Zümrüt Yaşam Rünü',short:'Can',stat:'hp',color:'#4fde9b',image:'rune-hp-v422',shard:'Zümrüt Yaşam Parçası'}
});
const RUNE_MOBS=Object.freeze([
 {key:'tide',name:'Gelgit Pençesi',count:5,hp:4800,damage:62,xp:180},
 {key:'warden',name:'Mercan Muhafızı',count:5,hp:6200,damage:75,xp:220},
 {key:'sentinel',name:'Şato Nöbetçisi',count:5,hp:7400,damage:88,xp:260},
 {key:'wraith',name:'Derinlik Ruhu',count:5,hp:5500,damage:96,xp:240}
]);
const RUNE_WORLD={width:4320,height:2880};
const RUNE_SPAWN={x:2121,y:2579};
const RUNE_GATE_MESSAGE='Giriş için 65. seviye ve Öz Avcısı rütbesi gerekiyor.';
const runeEligible=p=>!!p&&Number(p.level)>=65&&Number(p.rank_tier??p.rank?.tier)>=1;
const isRuneKind=k=>typeof k==='string'&&Object.hasOwn(RUNE_TYPES,k);
function runeUpgradeCost(level){if(!Number.isSafeInteger(level)||level<1||!Number.isSafeInteger(level+2))throw Error('Rün seviyesi geçersiz.');return level+2;}
const runeBonusPercent=(level,step=.2)=>Math.round(level*step*1000000)/1000000;
function runeMonsterKey(monster){return monster?.area==='rune'?String(monster.id).match((fourChannels?/^rune-(tide|warden|sentinel|wraith)-c[1-4]-\d+$/:/^rune-(tide|warden|sentinel|wraith)-c[1-3]-\d+$/))?.[1]??null:null;}
const RUNE_WALKABLE_POLYGON=[[1195,967],[2162,844],[2232,615],[3164,615],[3234,809],[4096,686],[4219,914],[4078,1125],[4781,1195],[4816,1494],[4500,1916],[4430,2514],[3938,2812],[3076,3076],[2900,3463],[2426,3463],[2250,3094],[1652,2760],[1301,2461],[1195,2004],[1125,1600],[1055,1248]].map(([x,y])=>[Math.round(x*.8),Math.round(y*.8)]);
const RUNE_OBSTACLES=[[[2039,1121],[2278,1058],[2584,1146],[2739,1287],[2591,1498],[2275,1568],[2039,1434]],[[3347,1870],[3561,1870],[3730,1986],[3544,2148],[3305,2116],[3206,2000]]].map(poly=>poly.map(([x,y])=>[Math.round(x*.8),Math.round(y*.8)]));
const inside=(x,y,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const edgeDistance=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);};
const runeEdges=[RUNE_WALKABLE_POLYGON,...RUNE_OBSTACLES].flatMap(poly=>poly.map((p,i)=>[p,poly[(i+1)%poly.length]]));
function runeWalkable(x,y,margin=0){if(!Number.isFinite(x)||!Number.isFinite(y)||!inside(x,y,RUNE_WALKABLE_POLYGON)||RUNE_OBSTACLES.some(p=>inside(x,y,p)))return false;return !(margin>0)||runeEdges.every(([a,b])=>edgeDistance(x,y,a,b)>=margin);}
function runeWalkableSegment(x1,y1,x2,y2,margin=0){if(!runeWalkable(x1,y1,margin)||!runeWalkable(x2,y2,margin))return false;const cross=(ax,ay,bx,by,cx,cy)=>(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);for(const[a,b]of runeEdges){const c1=cross(x1,y1,x2,y2,...a),c2=cross(x1,y1,x2,y2,...b),c3=cross(...a,...b,x1,y1),c4=cross(...a,...b,x2,y2);if(c1*c2<=0&&c3*c4<=0&&Math.max(x1,x2)>=Math.min(a[0],b[0])&&Math.min(x1,x2)<=Math.max(a[0],b[0])&&Math.max(y1,y2)>=Math.min(a[1],b[1])&&Math.min(y1,y2)<=Math.max(a[1],b[1]))return false;if(margin>0&&(edgeDistance(...a,[x1,y1],[x2,y2])<margin||edgeDistance(...b,[x1,y1],[x2,y2])<margin))return false;}return true;}
const runePoints={"tide":[[3750,1140],[1230,1980],[3190,720],[2770,1840],[2350,1140]],"warden":[[950,1000],[3330,1980],[1510,860],[3330,1420],[2350,1560]],"sentinel":[[2350,2120],[1930,1420],[1790,2260],[1650,1840],[2770,720]],"wraith":[[2350,580],[2770,1280],[1370,1420],[1930,720],[2770,2260]]};
const RUNE_SPAWNS=Object.freeze(Object.entries(runePoints).flatMap(([key,points])=>points.map(([x,y],i)=>({key,slot:i+1,x,y}))));
function defaultRuneConfig(){return {enabled:true,bonusPerLevel:.2,monsters:Object.fromEntries(RUNE_MOBS.map(m=>[m.key,{name:m.name,hp:m.hp,damage:m.damage,xp:m.xp,respawnSeconds:30,loot:{...Object.fromEntries(Object.keys(RUNE_TYPES).map(k=>[k,{chance:3,min:1,max:1}])),essence:{chance:100,min:5,max:10},gems:{chance:10,min:1,max:3},potions:{chance:5,min:1,max:1},red:{chance:1,min:1,max:1},orange:{chance:2,min:1,max:1},blue:{chance:3,min:1,max:1},white:{chance:0,min:1,max:1},purple:{chance:0,min:1,max:1},stone_dust:{chance:2,min:1,max:2},stone_book:{chance:1,min:1,max:1},evolution_scroll:{chance:.2,min:1,max:1},pearl:{chance:0,min:1,max:1},weathered_iron:{chance:0,min:1,max:1},wing:{chance:0,min:1,max:1},infinite:{chance:0,min:1,max:1},pet:{chance:0,min:1,max:1},emerald:{chance:0.05,min:1,max:1}}}]))};}
const RUNE_LOOT_LABELS={...Object.fromEntries(Object.entries(RUNE_TYPES).map(([k,v])=>[k,v.shard])),essence:'Yaşam Özü',gems:'Mücevher',potions:'Kırmızı İksir',red:'Kırmızı ekipman',orange:'Turuncu ekipman',blue:'Mavi ekipman',white:'Beyaz ekipman',purple:'Mor ekipman',stone_dust:'Taş Tozu',stone_book:'Taş Sanatı Kitabı',evolution_scroll:'Evrim Parşömeni',pearl:'İnci',weathered_iron:'Eskitilmiş Demir Parçası',wing:'Kanat Parçası',infinite:'Sonsuz Taşı Parçası',pet:'Ejderha Parçası',emerald:"Kadim Zümrüt ekipman (5 parça)"};
function validateRuneConfig(input){
 const def=defaultRuneConfig(),out={enabled:input?.enabled===true,bonusPerLevel:Number(input?.bonusPerLevel),monsters:{}};
 if(typeof input?.enabled!=='boolean'||!Number.isFinite(out.bonusPerLevel)||out.bonusPerLevel<0||out.bonusPerLevel>100)throw Error('Rün seviye bonusu %0–100 arasında olmalı.');
 for(const m of RUNE_MOBS){const v=input?.monsters?.[m.key];if(!v)throw Error('Dört canavarın ayarları gerekli.');
  const row={name:m.name,hp:Number(v.hp),damage:Number(v.damage),xp:Number(v.xp),respawnSeconds:Number(v.respawnSeconds),loot:{}};
  for(const [k,min,max]of [['hp',1,10000000],['damage',0,1000000],['xp',0,1000000],['respawnSeconds',1,86400]])if(!Number.isSafeInteger(row[k])||row[k]<min||row[k]>max)throw Error(m.name+': '+k+' ayarı geçersiz.');
  for(const k of Object.keys(def.monsters[m.key].loot)){const r=v.loot?.[k]??(k==='emerald'?def.monsters[m.key].loot.emerald:null);if(!r||!Number.isFinite(r.chance)||r.chance<0||r.chance>100||!Number.isSafeInteger(r.min)||!Number.isSafeInteger(r.max)||r.min<1||r.max<r.min||r.max>(['white','blue','orange','red','purple','emerald'].includes(k)?3:100))throw Error(m.name+': '+RUNE_LOOT_LABELS[k]+' oranı veya miktarı geçersiz.');row.loot[k]={chance:r.chance,min:r.min,max:r.max};}
  out.monsters[m.key]=row;
 }return out;
}
return {RUNE_TYPES,RUNE_MOBS,RUNE_WORLD,RUNE_SPAWN,RUNE_GATE_MESSAGE,runeEligible,isRuneKind,runeUpgradeCost,runeBonusPercent,runeMonsterKey,RUNE_WALKABLE_POLYGON,RUNE_OBSTACLES,runeWalkable,runeWalkableSegment,RUNE_SPAWNS,defaultRuneConfig,RUNE_LOOT_LABELS,validateRuneConfig};}
function runeV2LibraryModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const RUNE_MOBS=dependencies[3].RUNE_MOBS;
const RUNE_SPAWNS=dependencies[3].RUNE_SPAWNS;
const RUNE_LOOT_LABELS=dependencies[3].RUNE_LOOT_LABELS;
const defaultRuneConfig=dependencies[3].defaultRuneConfig;
const runeWalkable=dependencies[3].runeWalkable;
const RUNE_V2_AREA='rune_v2';
const RUNE_V2_MOBS=Object.freeze([...RUNE_MOBS.map(m=>Object.freeze({...m})),Object.freeze({key:'boss',name:'Karanlık Rün Yırtıcısı',count:1,hp:26000,damage:20,xp:500})]);
const RUNE_V2_LOOT_LABELS=Object.freeze({...RUNE_LOOT_LABELS});
const RUNE_V2_BOSS_SPAWN=Object.freeze({x:2240,y:680});
const RUNE_V2_SPAWNS=Object.freeze([...RUNE_SPAWNS.map(s=>Object.freeze({...s})),Object.freeze({key:'boss',slot:1,...RUNE_V2_BOSS_SPAWN})]);
if(!RUNE_V2_SPAWNS.every(s=>runeWalkable(s.x,s.y)))throw Error('Karanlık Rün Sahili doğma noktası geçersiz.');
const isRuneV2Boss=id=>typeof id==='string'&&(fourChannels?/^rune-v2-boss-c[1-4]-1$/:/^rune-v2-boss-c[1-3]-1$/).test(id);
function runeV2MonsterKey(monster){if(monster?.area!==RUNE_V2_AREA)return null;return isRuneV2Boss(monster.id)?'boss':String(monster.id).match((fourChannels?/^rune-v2-(tide|warden|sentinel|wraith)-c[1-4]-[1-5]$/:/^rune-v2-(tide|warden|sentinel|wraith)-c[1-3]-[1-5]$/))?.[1]??null;}
function defaultRuneV2Config(){const original=defaultRuneConfig();return {enabled:true,monsters:Object.fromEntries(RUNE_V2_MOBS.map(m=>[m.key,{...(original.monsters[m.key]??original.monsters.warden),name:m.name,hp:m.hp,damage:m.damage,xp:m.xp,respawnSeconds:m.key==='boss'?600:30,...(m.key==='boss'?{topDamageGems:250,waveDamage:20,waveCooldownSeconds:12}:{}),loot:structuredClone(original.monsters[m.key]?.loot??original.monsters.warden.loot)}]))};}
function validateRuneV2Config(input){
 if(!input||typeof input.enabled!=='boolean'||!input.monsters||Array.isArray(input.monsters))throw Error('Karanlık Rün Sahili ayarları geçersiz.');
 const out={enabled:input.enabled,monsters:{}};
 for(const m of RUNE_V2_MOBS){const v=input.monsters[m.key];if(!v||typeof v.name!=='string'||!v.name.trim()||v.name.trim().length>60||/[\u0000-\u001f\u007f]/u.test(v.name))throw Error(m.name+': canavar adı geçersiz.');
  const row={name:v.name.trim(),hp:v.hp,damage:v.damage,xp:v.xp,respawnSeconds:v.respawnSeconds,loot:{}};
  if(m.key==='boss'){row.topDamageGems=Object.hasOwn(v,'topDamageGems')?v.topDamageGems:250;if(!Number.isSafeInteger(row.topDamageGems)||row.topDamageGems<0||row.topDamageGems>1000000)throw Error('Boss en çok hasar ödülü geçersiz.');row.waveDamage=Object.hasOwn(v,'waveDamage')?v.waveDamage:20;row.waveCooldownSeconds=Object.hasOwn(v,'waveCooldownSeconds')?v.waveCooldownSeconds:12;if(!Number.isSafeInteger(row.waveDamage)||row.waveDamage<0||row.waveDamage>1000000)throw Error('Karanlık Rün Dalgası hasarı 0–1.000.000 arasında tam sayı olmalı.');if(!Number.isSafeInteger(row.waveCooldownSeconds)||row.waveCooldownSeconds<3||row.waveCooldownSeconds>86400)throw Error('Karanlık Rün Dalgası bekleme süresi 3–86.400 saniye arasında tam sayı olmalı.');}
  for(const[k,min,max]of [['hp',1,10000000],['damage',0,1000000],['xp',0,1000000],['respawnSeconds',1,86400]])if(!Number.isSafeInteger(row[k])||row[k]<min||row[k]>max)throw Error(m.name+': '+k+' ayarı geçersiz.');
  for(const k of Object.keys(RUNE_V2_LOOT_LABELS)){const r=v.loot?.[k];if(!r||!Number.isFinite(r.chance)||r.chance<0||r.chance>100||!Number.isSafeInteger(r.min)||!Number.isSafeInteger(r.max)||r.min<1||r.max<r.min||r.max>(['white','blue','orange','red','purple','emerald'].includes(k)?3:100))throw Error(m.name+': '+RUNE_V2_LOOT_LABELS[k]+' oranı veya miktarı geçersiz.');row.loot[k]={chance:r.chance,min:r.min,max:r.max};}
  if(Object.keys(v.loot??{}).some(k=>!Object.hasOwn(RUNE_V2_LOOT_LABELS,k)))throw Error('Bilinmeyen Karanlık Rün Sahili ganimeti.');out.monsters[m.key]=row;
 }if(Object.keys(input.monsters).some(k=>!RUNE_V2_MOBS.some(m=>m.key===k)))throw Error('Bilinmeyen Karanlık Rün Sahili canavarı.');return out;
}
return {RUNE_V2_AREA,RUNE_V2_MOBS,RUNE_V2_LOOT_LABELS,RUNE_V2_BOSS_SPAWN,RUNE_V2_SPAWNS,isRuneV2Boss,runeV2MonsterKey,defaultRuneV2Config,validateRuneV2Config};}
function eventLibraryModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const EVENT_WORLD444=Object.freeze({width:3600,height:2400});
const EVENT_SPAWN444=Object.freeze({x:1800,y:1600});
const EVENT_BOSSES444=Object.freeze([
 {kind:'world',name:'Çürümenin Kadimi',variant:'event_world',source:'boss.world'},
 {kind:'frozen',name:'Ayaz Tahtının Bekçisi',variant:'event_frozen',source:'boss.frozen_throne'},
 {kind:'water',name:'Buzgölü Semenderi',variant:'event_water',source:'boss.frozen_water'},
 {kind:'ancient',name:'Kadim Kökün Muhafızı',variant:'event_ancient',source:'boss.frozen_throne'},
 {kind:'dragon',name:'Külkanat · Kadim Ejderha',variant:'event_dragon'},
 {kind:'dungeon',name:'Bozulmuş Muhafız',variant:'event_dungeon'},
 {kind:'solo',name:'Demir Hükümdar',variant:'event_solo'}]);
const kinds=new Set(EVENT_BOSSES444.map(b=>b.kind));
function eventKind444(value){const id=typeof value==='string'?value:value?.id??'';if(!id.startsWith('event-'))return null;return (fourChannels?/^event-(world|frozen|water|ancient|dragon|dungeon|solo)-c[1-4]-[a-f0-9-]{36}$/:/^event-(world|frozen|water|ancient|dragon|dungeon|solo)-c[1-3]-[a-f0-9-]{36}$/).exec(id)?.[1]??null;}
function eventWalkable444(x,y){return Number.isFinite(x)&&Number.isFinite(y)&&x>=650&&x<=2950&&y>=480&&y<=1700;}
function eventSegment444(ax,ay,bx,by){return eventWalkable444(ax,ay)&&eventWalkable444(bx,by);}
function validateEventPlan444(value){if(!Array.isArray(value)||value.length>7*channelCount)throw Error('En fazla '+(7*channelCount)+' boss planı satırı olabilir.');const totals=Array(channelCount+1).fill(0);return value.map(r=>{if(!r||!kinds.has(r.kind)||!Number.isInteger(r.channel)||r.channel<1||r.channel>channelCount||!Number.isInteger(r.count)||r.count<1||r.count>8)throw Error('Boss türü, kanal ve adet geçersiz.');totals[r.channel]+=r.count;if(totals[r.channel]>8)throw Error('Bir plan kanal başına en fazla 8 boss içerir.');return {kind:r.kind,channel:r.channel,count:r.count};});}
function validateEventConfig444(v){if(!v||typeof v.enabled!=='boolean')throw Error('Ada açık/kapalı ayarı geçersiz.');if(!Number.isInteger(v.maxBossesPerChannel)||v.maxBossesPerChannel<1||v.maxBossesPerChannel>8)throw Error('Kanal başına boss sınırı 1–8 olmalı.');return {enabled:v.enabled,maxBossesPerChannel:v.maxBossesPerChannel,plan:validateEventPlan444(v.plan??[]),hpOverrides:validateEventHpOverrides448(v.hpOverrides??{})};}
const defaultEventConfig444=()=>({enabled:false,maxBossesPerChannel:8,plan:[],hpOverrides:{}});
function validateEventHpOverrides448(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>7)throw Error('Boss can ayarları geçersiz.');
 const result={};for(const [kind,hp]of Object.entries(value)){
  if(!kinds.has(kind)||!Number.isSafeInteger(hp)||hp<1||hp>100000000)throw Error('Boss canı 1–100.000.000 arasında tam sayı olmalı.');
  result[kind]=hp;
 }return result;
}
return {EVENT_WORLD444,EVENT_SPAWN444,EVENT_BOSSES444,eventKind444,eventWalkable444,eventSegment444,validateEventPlan444,validateEventConfig444,defaultEventConfig444};}
function cauldronGrantsModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const randomUUID=uuid;
const CAULDRON_BY_ID488=module16.CAULDRON_BY_ID488;
const validateCauldronReward488=module16.validateCauldronReward488;
const cauldronRewardPreview488=module16.cauldronRewardPreview488;
const EXTRA_PRODUCTS=module17.EXTRA_PRODUCTS;
const COSMETIC_DURATION_MS=module17.COSMETIC_DURATION_MS;
const JEWELRY456=module18.JEWELRY456;
const grantArenaWings477=module19.grantArenaWings477;
const ARENA_WINGS_DURATION_MS477=module19.ARENA_WINGS_DURATION_MS477;
const createDragonBoss=dependencies[1].createDragonBoss;
const createQuests438=dependencies[2].createQuests438;
const isCoupon483=dependencies[0].isCoupon483;
const mintCoupon483=dependencies[0].mintCoupon483;
const verifyCoupon483=dependencies[0].verifyCoupon483;
const couponActor483=dependencies[0].couponActor483;
const couponCapacity483=dependencies[0].couponCapacity483;
const STACK_CAP488=1000000000;
const RESOURCE_CAP488=9000000000000;
const MAX_INTEGER488=Number.MAX_SAFE_INTEGER;
const premiumCounters488=Object.freeze({afk_ticket:'afk_tickets',enchant_add:'enchant_add_scrolls',enchant_scroll:'enchant_scrolls',item_link:'item_link_orbs',rename_scroll:'rename_scrolls'});
const roles488=new Set(['muhafiz','avci','arkanist']);
function fail488(message){throw Object.assign(Error(message),{gameCode:'cauldron_reward_invalid488',status:409});}
function safeIncrement488(value,amount,cap,label){if(!Number.isSafeInteger(value)||value<0||!Number.isSafeInteger(amount)||amount<1||value>cap-amount)fail488(label+': çantadaki miktar/süre sınırına ulaştın.');return value+amount;}
function expiry488(value,now,amount,label,cap=MAX_INTEGER488){if(!Number.isSafeInteger(value)||value<0)fail488(label+': mevcut süre geçersiz.');return safeIncrement488(Math.max(value,now),amount,cap,label);}
function createCauldronGrants488(db,{now=Date.now,random=Math.random}={}){
 const dragon=createDragonBoss(db,{now,random}),quest=createQuests438(db,{now,random});
 const playerQuery=db.prepare('SELECT * FROM players WHERE id=?');
 const itemRows=db.prepare('SELECT id FROM player_items WHERE player_id=?');
 const itemQuery=db.prepare('SELECT * FROM player_items WHERE id=? AND player_id=?');
 const get=id=>{const p=playerQuery.get(id);if(!p)fail488('Karakter bulunamadı.');return p;};
 const assertSame=(actual,expected,label)=>{if(actual!==expected)fail488(label+': ödül kaydı doğrulanamadı.');};
 const bagBefore=(id,incoming=1)=>{try{couponCapacity483(db,id,incoming);}catch(error){if(String(error.message).includes('yer yok'))fail488('Çantanda ödül için yer yok. Malzemelerin korunur.');throw error;}return new Set(itemRows.all(id).map(row=>row.id));};
 const addedItems=(id,before,count)=>{const rows=itemRows.all(id),added=rows.filter(row=>!before.has(row.id));if(rows.length!==before.size+count||added.length!==count)fail488('Ödül eşyası çantaya eklenemedi.');return added.map(row=>itemQuery.get(row.id,id));};
 const assertCounter=(id,column,expected)=>assertSame(get(id)[column],expected,'Ödül miktarı');
 return {grant(playerId,input){
  if(!db.isTransaction)fail488('Kazan ödülü kalıcı atomik işlem gerektirir.');
  const reward=validateCauldronReward488(input),item=CAULDRON_BY_ID488.get(reward.itemId),p=get(playerId),at=now(),id=p.id,amount=reward.amount;
  if(!Number.isSafeInteger(at)||at<0||at>MAX_INTEGER488-365*86400000)fail488('Ödül saati geçersiz.');
  if(!roles488.has(p.role))fail488('Karakter sınıfı geçersiz.');
  couponActor483(db,p); // All event prizes exclude marked test accounts.
  const result={...cauldronRewardPreview488(reward)};
  const seconds=Math.floor(at/1000);
  const legacyGrant=()=>dragon.grantCatalog(id,item,amount,{item_name:item.name,power:reward.power??0,enchantments:'[]'});
  if(item.type==='xp'){
   const keys=['xp','level','rank_xp','rank_tier','battle_pass_xp'];
   for(const key of keys)if(!Number.isSafeInteger(p[key])||p[key]<0)fail488('Mevcut tecrübe kaydı geçersiz.');
   if(p.xp>RESOURCE_CAP488-amount||p.rank_xp>RESOURCE_CAP488-amount)fail488('Tecrübe sınırına ulaştın.');
   quest.grantCauldronReward488(id,reward);
   const after=get(id);
   for(const key of keys)if(!Number.isSafeInteger(after[key])||after[key]<0)fail488('Tecrübe ödülü kaydedilemedi.');
   const xpGranted=after.xp-p.xp,rankXpGranted=after.rank_xp-p.rank_xp,battlePassXpGranted=after.battle_pass_season===p.battle_pass_season?after.battle_pass_xp-p.battle_pass_xp:after.battle_pass_xp;
   if(xpGranted<0||rankXpGranted<0||battlePassXpGranted<0||after.level<p.level||after.rank_tier<p.rank_tier||xpGranted>amount||rankXpGranted>amount||battlePassXpGranted>amount)fail488('Tecrübe ödülü mevcut kurallarla uyuşmuyor.');
   if(xpGranted===0&&rankXpGranted===0&&battlePassXpGranted===0)fail488('Tecrübe ilerlemen sınırda. Bu tarif için malzeme harcanmadı.');
   return {...result,xpGranted,rankXpGranted,battlePassXpGranted,level:after.level,rankTier:after.rank_tier};
  }
  if(item.type==='class'){
   const before=bagBefore(id,1);quest.grantCauldronReward488(id,reward);const rows=addedItems(id,before,1),row=rows[0];
   if(row.kind!==item.kind||row.role!==p.role||row.rarity!=='blue'||row.equipped!==0||!Number.isSafeInteger(row.power)||row.power<0)fail488('Sınıf eşyası doğrulanamadı.');
   return {...result,itemIds:rows.map(row=>row.id),power:row.power};
  }
  if(item.type==='gear'){
   const before=bagBefore(id,amount);legacyGrant();const rows=addedItems(id,before,amount);
   for(const row of rows)if(row.kind!==item.kind||row.role!==item.role||row.rarity!==item.rarity||row.power!==reward.power||row.equipped!==0||row.enchantments!=='[]')fail488('Ekipman ödülü doğrulanamadı.');
   return {...result,itemIds:rows.map(row=>row.id)};
  }
  if(item.type==='rune'||item.type==='jewelry'){
   const before=bagBefore(id,1),newId=randomUUID(),power=item.type==='rune'?reward.power:20,rarity=item.type==='rune'?'unique':'crafted';
   if(item.type==='jewelry'&&!Object.hasOwn(JEWELRY456,item.kind))fail488('Üretim takısı bulunamadı.');
   if(db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,equipped,enchantments,created_at) VALUES(?,?,?,?,?,?,?,0,'[]',?)").run(newId,id,item.kind,item.name,rarity,power,p.role,seconds).changes!==1)fail488('Ödül eşyası eklenemedi.');
   const rows=addedItems(id,before,1);if(rows[0].id!==newId||rows[0].power!==power||rows[0].rarity!==rarity)fail488('Ödül eşyası doğrulanamadı.');
   return {...result,itemIds:[newId],power};
  }
  if(item.type==='resource'){
   const expected=safeIncrement488(p[item.column],amount,item.column==='core_coins'?MAX_INTEGER488:RESOURCE_CAP488,item.name);
   // column comes only from the closed imported catalogue, never user input.
   legacyGrant();assertCounter(id,item.column,expected);return {...result,balance:expected};
  }
  if(item.type==='stone'||item.type==='material'){
   const table=item.type==='stone'?'player_stones':'dungeon_materials';
   const query=db.prepare(`SELECT amount FROM ${table} WHERE player_id=? AND kind=?`),before=query.get(id,item.kind)?.amount??0,expected=safeIncrement488(before,amount,STACK_CAP488,item.name);
   legacyGrant();assertSame(query.get(id,item.kind)?.amount,expected,item.name);return {...result,balance:expected};
  }
  if(item.type==='pet'){
   const query=db.prepare('SELECT * FROM player_pets WHERE player_id=? AND kind=?'),old=query.get(id,item.kind),duration=item.kind==='starter'?259200:604800;
   const expected=old?Math.max(seconds,safeIncrement488(old.acquired_at,duration,Math.floor(MAX_INTEGER488/1000)-duration,item.name)):seconds;
   legacyGrant();const after=query.get(id,item.kind);assertSame(after?.acquired_at,expected,item.name);if(old)assertSame(after.equipped,old.equipped,item.name);else assertSame(after.equipped,0,item.name);
   return {...result,expiresAt:(expected+duration)*1000};
  }
  if(item.type==='rank'){
   const owned=JSON.parse(p.rank_unlocked);if(!Array.isArray(owned)||owned.some(x=>typeof x!=='string'))fail488('Rütbe görünüm kaydı geçersiz.');
   if(owned.includes(item.kind))fail488('Bu rütbe görünümüne zaten sahipsin. Malzeme harcanmadı.');
   legacyGrant();const next=JSON.parse(get(id).rank_unlocked);assertSame(JSON.stringify(next),JSON.stringify([...owned,item.kind]),item.name);return {...result,unlocked:item.kind};
  }
  if(item.type==='special'){
   if(item.kind==='rod'){
    if(p.has_rod!==0)fail488('Oltaya zaten sahipsin. Malzeme harcanmadı.');legacyGrant();assertCounter(id,'has_rod',1);return result;
   }
   if(item.kind==='core_wings'){
    const query=db.prepare('SELECT equipped FROM dungeon_wings WHERE player_id=?');if(query.get(id))fail488('Çekirdek Kanatlarına zaten sahipsin. Malzeme harcanmadı.');legacyGrant();assertSame(query.get(id)?.equipped,0,item.name);return result;
   }
   if(item.kind==='starter_chest'){
    const query=db.prepare('SELECT COUNT(*) AS n FROM starter_admin_grants WHERE account_id=? AND player_id=? AND opened_at_ms=0'),before=query.get(p.account_id,id).n;legacyGrant();assertSame(query.get(p.account_id,id).n,before+amount,item.name);return result;
   }
   fail488('Özel eşya yolu bulunamadı.');
  }
  if(item.type==='arena'){
   if(item.kind==='wings'){
    const expected=expiry488(p.arena_wings_expires_at_ms,at,ARENA_WINGS_DURATION_MS477,item.name);grantArenaWings477(db,id,at);const after=get(id);assertSame(after.arena_wings_owned,1,item.name);assertSame(after.arena_wings_expires_at_ms,expected,item.name);return {...result,expiresAt:expected};
   }
   if(item.kind==='exp_ring'){
    const expected=safeIncrement488(p.arena_exp_rings,amount,STACK_CAP488,item.name);if(db.prepare('UPDATE players SET arena_exp_rings=arena_exp_rings+? WHERE id=?').run(amount,id).changes!==1)fail488('Arena yüzüğü verilemedi.');assertCounter(id,'arena_exp_rings',expected);return {...result,balance:expected};
   }
   fail488('Arena ödül yolu bulunamadı.');
  }
  if(item.type==='premium'){
   const kind=item.kind;
   if(isCoupon483(kind)){
    const before=bagBefore(id,1),row=mintCoupon483({db,now},p,kind),added=addedItems(id,before,1);if(added[0].id!==row.id)fail488('ÇP kuponu teslim edilemedi.');const face=verifyCoupon483(db,row);return {...result,itemIds:[row.id],faceValue:face};
   }
   const column=EXTRA_PRODUCTS[kind]?.stock??premiumCounters488[kind];
   if(column){const expected=safeIncrement488(p[column],amount,STACK_CAP488,item.name);legacyGrant();assertCounter(id,column,expected);return {...result,balance:expected};}
   if(kind==='xp_ring'||kind==='drop_charm'){
    const column=kind+'_until',expected=expiry488(p[column],seconds,5*86400*amount,item.name,Math.floor(MAX_INTEGER488/1000));legacyGrant();assertCounter(id,column,expected);return {...result,expiresAt:expected*1000};
   }
   if(kind==='wings'){
    const expected=expiry488(p.wings_expires_at_ms,at,7*86400000*amount,item.name);legacyGrant();assertCounter(id,'has_wings',1);assertCounter(id,'wings_expires_at_ms',expected);return {...result,expiresAt:expected};
   }
   if(kind==='auto_potion'){
    const expected=safeIncrement488(p.auto_potion_remaining,1000000*amount,RESOURCE_CAP488,item.name);legacyGrant();assertCounter(id,'auto_potion_owned',1);assertCounter(id,'auto_potion_remaining',expected);assertCounter(id,'auto_potion_total',expected);return {...result,remaining:expected};
   }
   if(kind==='storage_page'){
    const expected=safeIncrement488(p.storage_pages,amount,4,item.name);legacyGrant();assertCounter(id,'storage_pages',expected);return {...result,pages:expected};
   }
   if(kind==='costume'){
    const old=db.prepare("SELECT * FROM player_items WHERE player_id=? AND kind='costume' AND role=? LIMIT 1").get(id,p.role),before=old?null:bagBefore(id,1),expected=expiry488(old?.expires_at_ms??0,at,COSMETIC_DURATION_MS*amount,item.name);legacyGrant();
    const row=old?itemQuery.get(old.id,id):addedItems(id,before,1)[0];if(row?.kind!=='costume'||row.role!==p.role||row.expires_at_ms!==expected||row.premium_origin!==1)fail488('Giysi ödülü doğrulanamadı.');return {...result,itemIds:[row.id],expiresAt:expected};
   }
   if(kind==='stall_skin'){
    if(p.stall_skin_owned!==0)fail488('Bu tezgâh görünümüne zaten sahipsin. Malzeme harcanmadı.');legacyGrant();assertCounter(id,'stall_skin_owned',1);return result;
   }
   if(kind==='teleport_skin'||kind==='weapon_skin'){
    const column=kind+'_expires_at_ms',expected=expiry488(p[column],at,COSMETIC_DURATION_MS*amount,item.name);legacyGrant();assertCounter(id,kind+'_owned',1);assertCounter(id,column,expected);return {...result,expiresAt:expected};
   }
   fail488('Nesne market ödül yolu bulunamadı.');
  }
  fail488('Ödül türü desteklenmiyor.');
 }};
}
return {createCauldronGrants488};}
function cauldronModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const CAULDRON_INGREDIENTS488=module20.CAULDRON_INGREDIENTS488;
const CAULDRON_AREAS488=module20.CAULDRON_AREAS488;
const cauldronSettings488=module20.cauldronSettings488;
const cauldronDay488=module20.cauldronDay488;
const validateCauldron488=module20.validateCauldron488;
const CAULDRON_CATALOG488=module21.CAULDRON_CATALOG488;
const createCauldronGrants488=dependencies[6].createCauldronGrants488;
const colLabIsPlayer=module22.colLabIsPlayer;
const reject488=(code,message)=>{throw Object.assign(Error(message),{gameCode:'cauldron_'+code+'488'});};
function ensureCauldronSchema488(db){
 db.exec(`CREATE TABLE IF NOT EXISTS player_cauldron488 (
  player_id TEXT PRIMARY KEY NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  bat_wing INTEGER NOT NULL DEFAULT 0 CHECK(bat_wing BETWEEN 0 AND 1000000),
  ghost_dust INTEGER NOT NULL DEFAULT 0 CHECK(ghost_dust BETWEEN 0 AND 1000000),
  pumpkin_seed INTEGER NOT NULL DEFAULT 0 CHECK(pumpkin_seed BETWEEN 0 AND 1000000),updated_at INTEGER NOT NULL DEFAULT 0
 );
 CREATE TABLE IF NOT EXISTS cauldron_receipts488 (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,request_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,recipe_id TEXT NOT NULL,day_key INTEGER NOT NULL,result_json TEXT NOT NULL,created_at INTEGER NOT NULL,
  PRIMARY KEY(player_id,request_id)
 );
 CREATE INDEX IF NOT EXISTS cauldron_receipts488_daily ON cauldron_receipts488(player_id,day_key,recipe_id);
 CREATE INDEX IF NOT EXISTS loadlab_entities_account488 ON loadlab_entities_v1(account_id);`);
}
function createCauldron488(db,{now=Date.now,grants,isTestPlayer=colLabIsPlayer}={}){
 const grant=grants??createCauldronGrants488(db,{now});
 const setting=db.prepare('SELECT events_json FROM game_settings WHERE id=1');
 const owned=db.prepare('SELECT id,account_id FROM players WHERE id=?');
 const balance=db.prepare('SELECT bat_wing,ghost_dust,pumpkin_seed FROM player_cauldron488 WHERE player_id=?');
 const receipt=db.prepare('SELECT fingerprint,result_json FROM cauldron_receipts488 WHERE player_id=? AND request_id=?');
 const daily=db.prepare('SELECT recipe_id,COUNT(*) AS used FROM cauldron_receipts488 WHERE player_id=? AND day_key=? GROUP BY recipe_id');
 const ingredients=id=>{const row=balance.get(id);return Object.fromEntries(CAULDRON_INGREDIENTS488.map(k=>[k,Number(row?.[k]??0)]));};
 const state=()=>cauldronSettings488(setting.get()?.events_json??'');
 const compact=(id,settings)=>{const {config,revision}=settings===undefined?state():cauldronSettings488(settings);return {enabled:config.enabled,revision,dayKey:cauldronDay488(now()),ingredients:config.enabled&&!isTestPlayer(id)?ingredients(id):{bat_wing:0,ghost_dust:0,pumpkin_seed:0}};};
 const read=id=>{if(isTestPlayer(id))throw Error('Test hesapları kazan etkinliğine katılamaz.');if(!owned.get(id))throw Error('Karakter bulunamadı.');const s=state(),ids=new Set(s.config.recipes.flatMap(r=>r.rewards.map(x=>x.itemId))),dayKey=cauldronDay488(now());return {...compact(id),recipes:s.config.recipes,rewardCatalog:CAULDRON_CATALOG488.filter(i=>ids.has(i.id)),dailyCrafts:Object.fromEntries(daily.all(id,dayKey).map(r=>[r.recipe_id,Number(r.used)])),serverTime:now()};};
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}};
 return {compact,read,settings(){return {...state(),catalog:CAULDRON_CATALOG488,areas:CAULDRON_AREAS488};},
  save(input,expectedRevision,expectedEvents){
   const config=validateCauldron488(input);
   transaction(()=>{const previous=setting.get()?.events_json??'',current=cauldronSettings488(previous);
    if(!Number.isSafeInteger(expectedRevision)||expectedRevision!==current.revision||typeof expectedEvents!=='string'||expectedEvents!==previous)throw Error('Etkinlik ayarları değişti. Güncel ayarları yükle.');
    const root=JSON.parse(previous||'{}'),next=JSON.stringify({...root,cauldron488:{...config,revision:current.revision+1}});
    if(!db.prepare('UPDATE game_settings SET events_json=? WHERE id=1 AND events_json=?').run(next,previous).changes)throw Error('Etkinlik ayarları başka bir oturumda değişti.');
   });return this.settings();
  },
  command(accountId,playerId,input){
   if(typeof input?.requestId!=='string'||!/^[A-Za-z0-9_-]{16,80}$/.test(input.requestId)||typeof input.recipeId!=='string'||!/^[A-Za-z0-9_-]{1,48}$/.test(input.recipeId)||!Number.isSafeInteger(input.configRevision)||input.configRevision<1)reject488('request_invalid','Kazan isteği geçersiz.');
   const fingerprint=JSON.stringify([input.recipeId,input.configRevision]);
   const outcome=transaction(()=>{
    const player=owned.get(playerId);if(!player||player.account_id!==accountId||isTestPlayer(playerId))reject488('actor_invalid','Bu karakter kazan etkinliğine katılamaz.');
    const prior=receipt.get(playerId,input.requestId);
    if(prior){if(prior.fingerprint!==fingerprint)reject488('request_conflict','İşlem kimliği başka bir tarifte kullanılmış.');return {receipt:JSON.parse(prior.result_json),replayed:true};}
    const {config,revision}=state();if(!config.enabled)reject488('disabled','Cadının Kazanı şu anda kapalı.');if(revision!==input.configRevision)reject488('config_changed','Kazan tarifleri değişti. Paneli yeniden aç.');
    const recipe=config.recipes.find(r=>r.id===input.recipeId);if(!recipe)reject488('recipe_invalid','Tarif bulunamadı.');
    const t=now(),dayKey=cauldronDay488(t),used=Number(db.prepare('SELECT COUNT(*) AS n FROM cauldron_receipts488 WHERE player_id=? AND day_key=? AND recipe_id=?').get(playerId,dayKey,recipe.id).n);
    if(used>=recipe.dailyLimit)reject488('daily_limit','Bu tarifin günlük hakkı doldu. Haklar Türkiye saatiyle 00.00’da yenilenir.');
    const c=recipe.cost;
    if(!db.prepare('UPDATE player_cauldron488 SET bat_wing=bat_wing-?,ghost_dust=ghost_dust-?,pumpkin_seed=pumpkin_seed-?,updated_at=? WHERE player_id=? AND bat_wing>=? AND ghost_dust>=? AND pumpkin_seed>=?').run(c.bat_wing,c.ghost_dust,c.pumpkin_seed,Math.floor(t/1000),playerId,c.bat_wing,c.ghost_dust,c.pumpkin_seed).changes)reject488('ingredients_missing','Tarif için yeterli malzemen yok.');
    const rewards=recipe.rewards.map(reward=>grant.grant(playerId,reward));
    const result={requestId:input.requestId,recipeId:recipe.id,recipeName:recipe.name,rewards,createdAt:t};
    db.prepare('INSERT INTO cauldron_receipts488(player_id,request_id,fingerprint,recipe_id,day_key,result_json,created_at) VALUES(?,?,?,?,?,?,?)').run(playerId,input.requestId,fingerprint,recipe.id,dayKey,JSON.stringify(result),t);
    return {receipt:result,replayed:false};
   });return {ok:true,...outcome,cauldron488:read(playerId)};
  }
 };
}
return {ensureCauldronSchema488,createCauldron488};}
function arenaModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const arenaWingsOwned477=module23.arenaWingsOwned477;
const arenaWingsActive477=module23.arenaWingsActive477;
const grantArenaWings477=module23.grantArenaWings477;
const resumeArenaWings477=module23.resumeArenaWings477;
const migrateArenaWings479=module23.migrateArenaWings479;
const projectArenaWingAppearance477=module23.projectArenaWingAppearance477;
const randomUUID=uuid;
const ARENA_LIMITS=module25.ARENA_LIMITS;
const ARENA_REWARDS=module25.ARENA_REWARDS;
const ARENA_CATALOG=module25.ARENA_CATALOG;
const ARENA_BY_ID=module25.ARENA_BY_ID;
const DEFAULT_ARENA_SHOP=module25.DEFAULT_ARENA_SHOP;
const validateArenaShop=module25.validateArenaShop;
const arenaDayStart=module25.arenaDayStart;
const createDragonBoss=dependencies[1].createDragonBoss;
function ensureArenaMarketSchema(db){
 db.exec('BEGIN IMMEDIATE');try{
 const cols=new Set(db.prepare('PRAGMA table_info(players)').all().map(c=>c.name));
 for(const c of ['arena_coins','arena_wings_owned','arena_wings_equipped','arena_wings_expires_at_ms','arena_exp_rings','arena_exp_until'])if(!cols.has(c))db.exec(`ALTER TABLE players ADD COLUMN ${c} INTEGER NOT NULL DEFAULT 0`);
 if(!db.prepare('PRAGMA table_info(arena_reward_claims)').all().some(c=>c.name==='arena_coins'))db.exec('ALTER TABLE arena_reward_claims ADD COLUMN arena_coins INTEGER NOT NULL DEFAULT 0');
 db.exec(`CREATE TABLE IF NOT EXISTS arena_market_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS arena_market_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,result_json TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));
 CREATE INDEX IF NOT EXISTS arena_market_receipts_age ON arena_market_receipts(created_at);
 CREATE INDEX IF NOT EXISTS arena_wing_expiry477 ON players(arena_wings_expires_at_ms,id) WHERE arena_wings_owned=1 AND arena_wings_expires_at_ms>0;
 CREATE INDEX IF NOT EXISTS arena_daily_player_time ON arena_match_players(player_id,joined_at_ms,match_id);`);
 db.prepare('INSERT OR IGNORE INTO arena_market_settings(id,config_json) VALUES(1,?)').run(JSON.stringify(DEFAULT_ARENA_SHOP));
 const reward="CASE m.mode WHEN '1v1' THEN 5 WHEN '2v2' THEN 6 WHEN '3v3' THEN 7 WHEN '5v5' THEN 10 ELSE 0 END";
 db.exec(`CREATE TRIGGER IF NOT EXISTS arena_coin_reward_424 AFTER INSERT ON arena_reward_claims BEGIN
 UPDATE arena_reward_claims SET arena_coins=COALESCE((SELECT ${reward} FROM arena_matches m JOIN arena_match_players mp ON mp.match_id=m.id AND mp.player_id=NEW.player_id AND mp.team=m.winner_team WHERE m.id=NEW.match_id AND m.id NOT LIKE 'guild-%' AND m.status='finished' AND m.settlement_token=NEW.settlement_token),0) WHERE id=NEW.id;
 UPDATE players SET arena_coins=arena_coins+(SELECT arena_coins FROM arena_reward_claims WHERE id=NEW.id) WHERE id=NEW.player_id;
 END;
 CREATE TRIGGER IF NOT EXISTS arena_daily_limit_424 BEFORE INSERT ON arena_match_players
 WHEN NEW.match_id NOT LIKE 'guild-%' AND NOT EXISTS(SELECT 1 FROM arena_match_players WHERE match_id=NEW.match_id AND player_id=NEW.player_id)
 BEGIN SELECT CASE WHEN (SELECT COUNT(*) FROM arena_match_players old JOIN arena_matches m ON m.id=old.match_id WHERE old.player_id=NEW.player_id AND old.joined_at_ms>=CAST((NEW.joined_at_ms+10800000)/86400000 AS INTEGER)*86400000-10800000 AND old.joined_at_ms<CAST((NEW.joined_at_ms+10800000)/86400000 AS INTEGER)*86400000+75600000 AND m.mode=(SELECT mode FROM arena_matches WHERE id=NEW.match_id) AND m.id NOT LIKE 'guild-%') >= (SELECT CASE mode WHEN '1v1' THEN 5 WHEN '2v2' THEN 3 WHEN '3v3' THEN 2 WHEN '5v5' THEN 1 ELSE 999999 END FROM arena_matches WHERE id=NEW.match_id) THEN RAISE(ABORT,'Günlük Arena giriş hakkın doldu.') END; END;
 CREATE TRIGGER IF NOT EXISTS arena_wing_exclusive_424 AFTER UPDATE OF arena_wings_equipped ON players WHEN NEW.arena_wings_equipped=1 BEGIN UPDATE players SET wings_equipped=0 WHERE id=NEW.id;UPDATE dungeon_wings SET equipped=0 WHERE player_id=NEW.id; END;
 CREATE TRIGGER IF NOT EXISTS arena_wing_old_424 AFTER UPDATE OF wings_equipped ON players WHEN NEW.wings_equipped=1 BEGIN UPDATE players SET arena_wings_equipped=0 WHERE id=NEW.id;END;
 CREATE TRIGGER IF NOT EXISTS arena_wing_core_424 AFTER UPDATE OF equipped ON dungeon_wings WHEN NEW.equipped=1 BEGIN UPDATE players SET arena_wings_equipped=0 WHERE id=NEW.player_id;END;`);
 resumeArenaWings477(db,Date.now());
 migrateArenaWings479(db,Date.now());
 db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
}
function createArenaMarket(db,{now=Date.now}={}){
 const dragon=createDragonBoss(db,{now});let current;
 const refresh=()=>{const r=db.prepare('SELECT * FROM arena_market_settings WHERE id=1').get();return current={revision:r.revision,config:validateArenaShop(JSON.parse(r.config_json))};};refresh();
 const limits=id=>{const start=arenaDayStart(now()),rows=db.prepare("SELECT m.mode,COUNT(*) AS used FROM arena_match_players p JOIN arena_matches m ON m.id=p.match_id WHERE p.player_id=? AND p.joined_at_ms>=? AND p.joined_at_ms<? AND m.id NOT LIKE 'guild-%' GROUP BY m.mode").all(id,start,start+86400000);return Object.fromEntries(Object.entries(ARENA_LIMITS).map(([m,n])=>[m,{limit:n,used:rows.find(r=>r.mode===m)?.used??0}]));};
 const get=id=>{const p=db.prepare('SELECT * FROM players WHERE id=?').get(id);if(!p)throw Error('Karakter bulunamadı.');return p;};
 const read=id=>{const p=get(id),at=now();return {...current,coins:p.arena_coins,wingsOwned:Number(arenaWingsOwned477(p,at)),wingsEquipped:Number(arenaWingsActive477(p,at)),wingsExpiresAt:p.arena_wings_expires_at_ms,wingsPermanent:p.arena_wings_owned===1&&p.arena_wings_expires_at_ms===0,rings:p.arena_exp_rings,expUntil:p.arena_exp_until,limits:limits(id),resetAt:arenaDayStart(now())+86400000,serverTime:now(),items:current.config.map(r=>({...ARENA_BY_ID.get(r.itemId),...r})),rewards:ARENA_REWARDS};};
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}};
 return {refresh,read,limits,settings:()=>({...current,catalog:ARENA_CATALOG}),
 save(config,revision){const next=validateArenaShop(config);transaction(()=>{if(!db.prepare('UPDATE arena_market_settings SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(next),revision).changes)throw Error('Ayarlar değişti. Paneli yenile.');});return refresh();},
 command(id,input){return transaction(()=>{
 const requestId=input.requestId;if(typeof requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId))throw Error('İşlem kimliği geçersiz.');
 const fingerprint=JSON.stringify([input.action,input.itemId??null,input.revision??null,input.enabled??null]);
 const prior=db.prepare('SELECT fingerprint,result_json FROM arena_market_receipts WHERE player_id=? AND request_id=?').get(id,requestId);
 if(prior){if(prior.fingerprint!==fingerprint)throw Error('İşlem kimliği kullanılmış.');return {...JSON.parse(prior.result_json),state:read(id),replayed:true};}
 const p=get(id);let message;
 if(input.action==='arena_market_buy'){
 const row=current.config.find(r=>r.itemId===input.itemId),item=ARENA_BY_ID.get(input.itemId);if(!row||input.revision!==current.revision)throw Error('Market değişti. Yenileyip tekrar dene.');
 if(item.id==='premium:storage_page'&&p.storage_pages>=4)throw Error('Depo sayfaların zaten tam.');
 if(!db.prepare('UPDATE players SET arena_coins=arena_coins-? WHERE id=? AND arena_coins>=?').run(row.price,id,row.price).changes)throw Error('Yeterli Arena Coin yok.');
 if(item.id==='arena:wings'){if(grantArenaWings477(db,id,now()).changes!==1)throw Error('Arena kanat süresi güncellenemedi.');}
 else if(item.id==='arena:exp_ring')db.prepare('UPDATE players SET arena_exp_rings=arena_exp_rings+1 WHERE id=?').run(id);
 else if(item.type==='rune')db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,equipped,enchantments,created_at) VALUES(?,?,?,?,'unique',?,?,0,'[]',?)").run(randomUUID(),id,item.kind,item.name,row.power,p.role,Math.floor(now()/1000));
 else dragon.grantCatalog(id,item,row.amount,{item_name:item.name,power:row.power??0,enchantments:'[]'});
 message=item.name+' alındı.';
 }else if(input.action==='arena_market_wings'){
 if(!arenaWingsOwned477(p,now()))throw Error('Arena Kanatlarının süresi dolmuş veya henüz alınmamış.');
 if(p.hp<=0||p.arena_match_id||p.combat_lock_until_ms>now()||db.prepare('SELECT 1 FROM dungeon_members WHERE player_id=? LIMIT 1').get(id))throw Error('Kanat değiştirmek için savaştan çık.');
 if(typeof input.enabled!=='boolean')throw Error('Geçersiz seçim.');db.prepare('UPDATE players SET arena_wings_equipped=? WHERE id=?').run(input.enabled?1:0,id);message=input.enabled?'Arena Kanatları kuşanıldı.':'Arena Kanatları çıkarıldı.';
 }else if(input.action==='arena_market_exp'){
 if(!db.prepare('UPDATE players SET arena_exp_rings=arena_exp_rings-1,arena_exp_until=MAX(arena_exp_until,?)+3600000 WHERE id=? AND arena_exp_rings>0').run(now(),id).changes)throw Error('Tecrübe yüzüğün yok.');message='1 saat +%20 tecrübe etkin.';
 }else throw Error('Geçersiz market işlemi.');
 const result={ok:true,message};db.prepare('INSERT INTO arena_market_receipts VALUES(?,?,?,?,?)').run(id,requestId,fingerprint,JSON.stringify(result),Math.floor(now()/1000));
 db.prepare('DELETE FROM arena_market_receipts WHERE rowid IN(SELECT rowid FROM arena_market_receipts WHERE created_at<? ORDER BY created_at LIMIT 32)').run(Math.floor(now()/1000)-604800);
 return {...result,state:read(id)};
 });}
 };
}
return {ensureArenaMarketSchema,createArenaMarket};}
function battlePassModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const arenaWingsOwned477=module26.arenaWingsOwned477;
const arenaWingsActive477=module26.arenaWingsActive477;
const grantArenaWings477=module26.grantArenaWings477;
const resumeArenaWings477=module26.resumeArenaWings477;
const projectArenaWingAppearance477=module26.projectArenaWingAppearance477;
const randomUUID=uuid;
const BATTLE_PASS_CATALOG=module28.BATTLE_PASS_CATALOG;
const BATTLE_PASS_BY_ID=module28.BATTLE_PASS_BY_ID;
const BATTLE_PASS_DAY_MS=module28.BATTLE_PASS_DAY_MS;
const defaultBattlePassConfig=module28.defaultBattlePassConfig;
const validateBattlePassConfig=module28.validateBattlePassConfig;
const createDragonBoss=dependencies[1].createDragonBoss;
function ensureBattlePassSchema(db){
 db.exec('BEGIN IMMEDIATE');try{
  const columns=new Set(db.prepare('PRAGMA table_info(players)').all().map(row=>row.name));
  if(!columns.has('battle_pass_season'))db.exec("ALTER TABLE players ADD COLUMN battle_pass_season TEXT NOT NULL DEFAULT ''");
  if(!columns.has('battle_pass_xp'))db.exec('ALTER TABLE players ADD COLUMN battle_pass_xp INTEGER NOT NULL DEFAULT 0 CHECK(battle_pass_xp>=0)');
  db.exec(`CREATE TABLE IF NOT EXISTS battle_pass_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL,active_json TEXT NOT NULL DEFAULT '',enabled INTEGER NOT NULL DEFAULT 0,season_id TEXT NOT NULL DEFAULT '',starts_at INTEGER NOT NULL DEFAULT 0,ends_at INTEGER NOT NULL DEFAULT 0,xp_cap INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS battle_pass_purchases(season_id TEXT NOT NULL,player_id TEXT NOT NULL,price_paid INTEGER NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(season_id,player_id));
  CREATE TABLE IF NOT EXISTS battle_pass_claims(season_id TEXT NOT NULL,player_id TEXT NOT NULL,track TEXT NOT NULL CHECK(track IN ('free','premium')),tier INTEGER NOT NULL,reward_json TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(season_id,player_id,track,tier));
  CREATE TABLE IF NOT EXISTS battle_pass_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,result_json TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));
  CREATE INDEX IF NOT EXISTS battle_pass_receipts_age ON battle_pass_receipts(created_at);
  CREATE INDEX IF NOT EXISTS battle_pass_claims_age ON battle_pass_claims(created_at);
  CREATE INDEX IF NOT EXISTS battle_pass_purchases_age ON battle_pass_purchases(created_at);`);
  db.prepare('INSERT OR IGNORE INTO battle_pass_settings(id,config_json) VALUES(1,?)').run(JSON.stringify(defaultBattlePassConfig()));
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}
function createBattlePass(db,{now=Date.now}={}){
 const dragon=createDragonBoss(db,{now});
 const player=db.prepare('SELECT * FROM players WHERE id=?');
 const setting=db.prepare('SELECT * FROM battle_pass_settings WHERE id=1');
 const purchase=db.prepare('SELECT price_paid FROM battle_pass_purchases WHERE season_id=? AND player_id=?');
 const claims=db.prepare('SELECT track,tier FROM battle_pass_claims WHERE season_id=? AND player_id=?');
 const receipt=db.prepare('SELECT fingerprint,result_json FROM battle_pass_receipts WHERE player_id=? AND request_id=?');
 let current;
 const refresh=()=>{const row=setting.get();if(!row)throw Error('Savaş bileti ayarları bulunamadı.');current={row,draft:validateBattlePassConfig(JSON.parse(row.config_json)),active:row.active_json?validateBattlePassConfig(JSON.parse(row.active_json)):null};return settings();};
 const season=()=>({id:current.row.season_id,startsAt:current.row.starts_at,endsAt:current.row.ends_at,status:!current.row.season_id?'draft':current.row.ends_at<=now()?'ended':'active',config:current.active});
 const settings=()=>({revision:current.row.revision,config:current.draft,season:season(),catalog:BATTLE_PASS_CATALOG});
 const get=id=>{const p=player.get(id);if(!p)throw Error('Karakter bulunamadı.');return p;};
 const read=id=>{
  const p=get(id),s=season(),config=current.active??current.draft,claimed={free:[],premium:[]};
  for(const row of claims.all(s.id,id))claimed[row.track].push(row.tier);
  const itemIds=new Set(config.tiers.flatMap(t=>[t.free?.itemId,t.premium?.itemId]).filter(Boolean));
  return {revision:current.row.revision,config,season:s,xp:p.battle_pass_season===s.id?p.battle_pass_xp:0,premium:!!purchase.get(s.id,id),claimed,coreCoins:p.core_coins,level:p.level,serverTime:now(),rewardCatalog:BATTLE_PASS_CATALOG.filter(item=>itemIds.has(item.id))};
 };
 const transaction=fn=>{
  db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}
 };
 const grant=(id,reward)=>{
  const item=BATTLE_PASS_BY_ID.get(reward.itemId);
  if(item.id==='resource:core_coins'){
   if(!db.prepare('UPDATE players SET core_coins=core_coins+? WHERE id=? AND core_coins>=0 AND core_coins<=?').run(reward.amount,id,Number.MAX_SAFE_INTEGER-reward.amount).changes)throw Error('ÇP bakiyesi güncellenemedi.');
  }else if(item.id==='arena:wings')grantArenaWings477(db,id,now());
  else if(item.id==='arena:exp_ring')db.prepare('UPDATE players SET arena_exp_rings=arena_exp_rings+? WHERE id=?').run(reward.amount,id);
  else if(item.type==='rune')db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,equipped,enchantments,created_at) VALUES(?,?,?,?,'unique',?,?,0,'[]',?)").run(randomUUID(),id,item.kind,item.name,reward.power,get(id).role,Math.floor(now()/1000));
  else dragon.grantCatalog(id,item,reward.amount,{item_name:item.name,power:reward.power??0,enchantments:'[]'});
 };
 refresh();
 return {refresh,read,settings,
  save(input,revision){const config=validateBattlePassConfig(input);transaction(()=>{
   if(!db.prepare('UPDATE battle_pass_settings SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(config),revision).changes)throw Error('Savaş bileti ayarları değişti. Paneli yenile.');
  });return refresh();},
  endSeason(input,adminId){
   if(typeof input?.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId)||typeof input.seasonId!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(input.seasonId)||!Number.isSafeInteger(input.revision)||input.revision<1||typeof adminId!=='string'||!adminId||adminId.length>160)throw Error('Sezon bitirme isteği geçersiz. Paneli yenile.');
   const fingerprint=JSON.stringify([input.seasonId,input.revision]),auditId='battle-pass-end469:'+input.requestId;
   const endResult=transaction(()=>{
    const previous=db.prepare('SELECT admin_account_id,action,detail_json FROM admin_audit_events WHERE id=?').get(auditId);
    if(previous){
     const detail=JSON.parse(previous.detail_json);
     if(previous.admin_account_id!==adminId||previous.action!=='battle_pass_end'||detail.fingerprint!==fingerprint)throw Error('İşlem kimliği başka bir işlemde kullanılmış.');
     return {...detail.result,replayed:true};
    }
    const row=setting.get(),time=now();
    if(!row.season_id||row.season_id!==input.seasonId||row.revision!==input.revision)throw Error('Sezon veya ayarları değişti. Paneli yenile.');
    if(!Number.isSafeInteger(time)||time<0)throw Error('Sezon saati geçersiz.');
    const changed=row.ends_at>time;
    if(changed&&row.revision>=Number.MAX_SAFE_INTEGER)throw Error('Sezon ayar sürümü sınırına ulaşıldı.');
    // Same as natural expiry: earned claims and authoritative pre-end reward
    // timestamps remain valid until another season starts. No history is erased.
    if(changed&&!db.prepare('UPDATE battle_pass_settings SET ends_at=?,revision=revision+1 WHERE id=1 AND season_id=? AND revision=? AND ends_at=?').run(time,row.season_id,row.revision,row.ends_at).changes)throw Error('Sezon veya ayarları değişti. Paneli yenile.');
    const result={seasonId:row.season_id,previousEndsAt:row.ends_at,endedAt:changed?time:row.ends_at,changed};
    db.prepare("INSERT INTO admin_audit_events(id,admin_account_id,action,target_account_id,detail_json,created_at_ms) VALUES(?,?,?,'',?,?)").run(auditId,adminId,'battle_pass_end',JSON.stringify({fingerprint,result}),time);
    return result;
   });
   return {...refresh(),endResult};
  },
  startSeason(revision){transaction(()=>{
   const row=setting.get(),time=now();if(row.revision!==revision)throw Error('Savaş bileti ayarları değişti. Paneli yenile.');
   if(row.season_id&&row.ends_at>time)throw Error('Mevcut sezon bitmeden yeni sezon başlatılamaz.');
   const config={...validateBattlePassConfig(JSON.parse(row.config_json)),enabled:true};
   db.prepare('UPDATE battle_pass_settings SET active_json=?,enabled=1,season_id=?,starts_at=?,ends_at=?,xp_cap=?,revision=revision+1 WHERE id=1').run(JSON.stringify(config),randomUUID(),time,time+config.durationDays*BATTLE_PASS_DAY_MS,config.tiers.at(-1).xp);
   // Bounded history cleanup runs only when an administrator starts a season.
   // Old IDs are rejected before claims; active receipts are never pruned here.
   for(const table of ['battle_pass_receipts','battle_pass_claims','battle_pass_purchases'])db.prepare(`DELETE FROM ${table} WHERE rowid IN(SELECT rowid FROM ${table} WHERE created_at<? ORDER BY created_at LIMIT 500)`).run(time-90*BATTLE_PASS_DAY_MS);
  });return refresh();},
  command(id,input){return transaction(()=>{
   // Recheck settings within the writer transaction; a channel's cached panel
   // state must not authorize spending against a replaced season.
   refresh();
   if(typeof input?.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId))throw Error('İşlem kimliği geçersiz.');
   const fingerprint=JSON.stringify([input.action,input.seasonId,input.tier??null,input.track??null]);
   const prior=receipt.get(id,input.requestId);
   if(prior){if(prior.fingerprint!==fingerprint)throw Error('İşlem kimliği başka bir işlemde kullanılmış.');return {...JSON.parse(prior.result_json),state:read(id),replayed:true};}
   const p=get(id),s=season(),config=current.active;
   if(!config||input.seasonId!==s.id)throw Error('Sezon değişti. Savaş bileti panelini yenile.');
   let message,replayed=false;
   if(input.action==='battle_pass_buy'){
    if(purchase.get(s.id,id)){message='Premium Savaş Biletin zaten etkin.';replayed=true;}
    else{
     if(s.status!=='active'||!current.row.enabled||now()<s.startsAt)throw Error('Bu sezon için bilet satışı kapalı.');
     if(input.revision!==current.row.revision)throw Error('Savaş bileti bilgileri değişti. Paneli yenile.');
     if(!db.prepare('UPDATE players SET core_coins=core_coins-? WHERE id=? AND core_coins>=?').run(config.price,id,config.price).changes)throw Error('Yeterli Çekirdek Paran yok.');
     db.prepare('INSERT INTO battle_pass_purchases VALUES(?,?,?,?)').run(s.id,id,config.price,now());
     message='Premium Savaş Bileti açıldı. Ulaştığın kademelerin premium ödüllerini alabilirsin.';
    }
   }else if(input.action==='battle_pass_claim'){
    if(!['free','premium'].includes(input.track)||!Number.isSafeInteger(input.tier))throw Error('Ödül seçimi geçersiz.');
    const tier=config.tiers.find(row=>row.id===input.tier),reward=tier?.[input.track];
    if(!reward)throw Error('Bu kademede seçili ödül bulunamadı.');
    if(input.track==='premium'&&!purchase.get(s.id,id))throw Error('Bu ödül için Premium Savaş Bileti gerekli.');
    if(p.battle_pass_season!==s.id||p.battle_pass_xp<tier.xp)throw Error('Bu ödül için gerekli tecrübeye henüz ulaşmadın.');
    const claim=db.prepare('INSERT OR IGNORE INTO battle_pass_claims VALUES(?,?,?,?,?,?)').run(s.id,id,input.track,tier.id,JSON.stringify(reward),now());
    if(claim.changes){grant(id,reward);message=BATTLE_PASS_BY_ID.get(reward.itemId).name+' ödülün teslim edildi.';}
    else{message='Bu ödül zaten teslim edildi.';replayed=true;}
   }else throw Error('Geçersiz savaş bileti işlemi.');
   const result={ok:true,message,...(replayed?{replayed:true}:{})};
   if(!replayed)db.prepare('INSERT INTO battle_pass_receipts VALUES(?,?,?,?,?)').run(id,input.requestId,fingerprint,JSON.stringify(result),now());
   return {...result,state:read(id)};
  });}
 };
}
return {ensureBattlePassSchema,createBattlePass};}
function eventsModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const materialLevelPolicy498=module29.materialLevelPolicy498;
const balanceFromSnapshot487=module30.balanceFromSnapshot487;
const balanceFactor487=module30.balanceFactor487;
const randomUUID=uuid;
const EVENT_BOSSES444=dependencies[5].EVENT_BOSSES444;
const eventKind444=dependencies[5].eventKind444;
const defaultEventConfig444=dependencies[5].defaultEventConfig444;
const validateEventConfig444=dependencies[5].validateEventConfig444;
const validateEventPlan444=dependencies[5].validateEventPlan444;
const DRAGON_CATALOG_BY_ID=module32.DRAGON_CATALOG_BY_ID;
const rollDragonLoot=module32.rollDragonLoot;
const SOLO_CATALOG_BY_ID=module33.SOLO_CATALOG_BY_ID;
const rollSoloLoot=module33.rollSoloLoot;
const catalogItem444=id=>SOLO_CATALOG_BY_ID.get(id)??DRAGON_CATALOG_BY_ID.get(id)??(()=>{const m=/^gear:savasci:(weapon|armor|helmet|shoes|necklace):red$/.exec(id);if(!m)return null;const item=DRAGON_CATALOG_BY_ID.get('gear:muhafiz:'+m[1]+':red');return item?{...item,id,role:'savasci',name:'Çekirdeğin Kızıl '+({weapon:'Kılıcı',armor:'Zırhı',helmet:'Miğferi',shoes:'Çizmeleri',necklace:'Kolyesi'}[m[1]])}:null;})();
function ensureEventIsland444(db){db.exec(`CREATE TABLE IF NOT EXISTS event_island_settings444(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS event_island_monsters444(id TEXT PRIMARY KEY,profile_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS event_island_receipts444(request_id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,result_json TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS event_island_defeats444(monster_id TEXT NOT NULL,spawn_round INTEGER NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(monster_id,spawn_round));
CREATE INDEX IF NOT EXISTS event_island_receipt_time444 ON event_island_receipts444(created_at);
CREATE INDEX IF NOT EXISTS event_island_live444 ON monsters(channel,hp) WHERE area='event';`);db.prepare('INSERT OR IGNORE INTO event_island_settings444(id,config_json) VALUES(1,?)').run(JSON.stringify(defaultEventConfig444()));}
function createEventIsland444(db,{now=Date.now,random=Math.random,cacheProfiles=true}={}){
 let current,profiles=new Map();const publicStates=Array(channelCount+1);const refreshPublic=()=>{const kinds=Array.from({length:channelCount+1},()=>new Set());if(current.config.enabled)for(const id of profiles.keys()){const kind=eventKind444(id),channel=Number((fourChannels?/-c([1-4])-/:/-c([1-3])-/).exec(id)?.[1]);if(kind&&channel){kinds[0].add(kind);kinds[channel].add(kind);}}let changed=false;for(let channel=0;channel<=channelCount;channel++){const activeKinds=[...kinds[channel]].sort(),prior=publicStates[channel];if(prior&&prior.enabled===current.config.enabled&&prior.activeKinds.length===activeKinds.length&&prior.activeKinds.every((kind,i)=>kind===activeKinds[i]))continue;publicStates[channel]=Object.freeze({enabled:current.config.enabled,activeKinds:Object.freeze(activeKinds)});changed=true;}return changed;};
 const refresh=()=>{const r=db.prepare('SELECT * FROM event_island_settings444 WHERE id=1').get();current={revision:r.revision,config:validateEventConfig444(JSON.parse(r.config_json))};profiles=cacheProfiles?new Map(db.prepare("SELECT e.id,e.profile_json FROM event_island_monsters444 e JOIN monsters m ON m.id=e.id WHERE m.hp>0 AND m.area='event'").all().map(r=>[r.id,JSON.parse(r.profile_json)])):new Map();refreshPublic();return current;};refresh();
 const tx=(fn,reload=false)=>{db.exec('BEGIN IMMEDIATE');try{const out=fn();db.exec('COMMIT');if(reload)refresh();return out;}catch(e){try{db.exec('ROLLBACK');}catch{}if(reload)refresh();throw e;}};const mutate=fn=>tx(fn,true);
 const active=()=>db.prepare("SELECT id,name,hp,max_hp,channel,variant FROM monsters WHERE area='event' AND hp>0 ORDER BY channel,id").all().map(r=>({...r,kind:eventKind444(r),baseHp:profile(r)?.baseHp??profile(r)?.hp??r.max_hp}));
 const snapshot=(buildProfile)=>({...current,channels:Array.from({length:channelCount},(_,i)=>i+1),catalog:EVENT_BOSSES444.map(b=>{const baseHp=buildProfile?.(b.kind)?.hp??null;return {...b,baseHp,effectiveHp:current.config.hpOverrides[b.kind]??baseHp};}),active:active()});
 const profile=m=>profiles.get(typeof m==='string'?m:m.id);
 const audit=(actor,action,detail)=>db.prepare("INSERT INTO admin_audit_events(id,admin_account_id,action,target_account_id,detail_json,created_at_ms) VALUES(?,?,?,'',?,?)").run(randomUUID(),actor??'',action,JSON.stringify(detail),now());
 const clear=channel=>{db.prepare("DELETE FROM pve_engagements WHERE monster_id IN (SELECT id FROM monsters WHERE area='event' AND (?=0 OR channel=?))").run(channel,channel);db.prepare("UPDATE monsters SET hp=0,respawn_at=0,despawn_at=0 WHERE area='event' AND (?=0 OR channel=?) AND hp>0").run(channel,channel);};
 const replay=(id,fingerprint,fn)=>{const parsed=typeof id==='string'?/^(\d{1,15})-([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/.exec(id):null,issued=parsed?Number(parsed[1]):NaN;if(!Number.isSafeInteger(issued)||issued>now()+60000||issued<now()-86400000)throw Error('İşlem kimliği veya süresi geçersiz; paneli yenile.');const prior=db.prepare('SELECT fingerprint,result_json FROM event_island_receipts444 WHERE request_id=?').get(id);if(prior){if(prior.fingerprint!==fingerprint)throw Error('İşlem kimliği farklı bir işlemde kullanılmış.');return {...JSON.parse(prior.result_json),replayed:true};}db.prepare('DELETE FROM event_island_receipts444 WHERE request_id IN (SELECT request_id FROM event_island_receipts444 WHERE created_at<? ORDER BY created_at LIMIT 64)').run(Math.floor(now()/1000)-172800);if(db.prepare('SELECT count(*) n FROM event_island_receipts444').get().n>=4096)throw Error('Etkinlik işlem arşivi sınırına ulaştı. Eski kayıtların süresi bitince tekrar dene.');const result=fn();db.prepare('INSERT INTO event_island_receipts444 VALUES(?,?,?,?)').run(id,fingerprint,JSON.stringify(result),Math.floor(now()/1000));return result;};
 return {refresh,profile,monsterChanged(id,row){if(row?.hp>0||!profiles.delete(id))return false;return refreshPublic();},
 describe(id){const p=profile(id),kind=eventKind444(id),boss=EVENT_BOSSES444.find(b=>b.kind===kind);if(!p?.loot||!boss)return null;const saved=JSON.parse(p.loot.lootProfileJson);const rules=kind==='dungeon'?eventDungeonDescription446(saved.config??{}):(saved.config?.loot??[]);return {sourceKey:'event.catalog',label:boss.name,revision:current.revision,eventLoot:rules.map(r=>({name:r.name??catalogItem444(r.itemId)?.name??r.itemId,chance:r.chance,min:r.min,max:r.max})),groups:[],rewardSnapshot:true,hasCharm:false,purpleChancePpm:0,forestReductionPercent:0};},
 settings:()=>current,public:(channel=0)=>publicStates[channel]??publicStates[0],snapshot,
 save(config,revision,actor){let next=validateEventConfig444(config);return mutate(()=>{const stored=validateEventConfig444(JSON.parse(db.prepare('SELECT config_json FROM event_island_settings444 WHERE id=1').get().config_json));next={...next,hpOverrides:stored.hpOverrides};if(!db.prepare('UPDATE event_island_settings444 SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(next),revision).changes)throw Error('Ada ayarları değişti. Paneli yenile.');if(!next.enabled){clear(0);db.prepare("UPDATE players SET area='bazaar',arena_match_id='',x=1200,y=920,movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0 WHERE area='event'").run(now());}audit(actor,'event_island_save',next);return {ok:true};});},
 setHp(kind,hp,revision,requestId,actor){
  if(!EVENT_BOSSES444.some(b=>b.kind===kind)||hp!==null&&(!Number.isSafeInteger(hp)||hp<1||hp>100000000))throw Error('Boss türü veya canı geçersiz. Can 1–100.000.000 arasında tam sayı olmalı.');
  if(!Number.isSafeInteger(revision)||revision<1)throw Error('Ada ayarları değişti. Paneli yenile.');
  return mutate(()=>replay(requestId,JSON.stringify(['hp',kind,hp,revision]),()=>{
   const saved=db.prepare('SELECT revision,config_json FROM event_island_settings444 WHERE id=1').get(),cfg=validateEventConfig444(JSON.parse(saved.config_json));
   if(saved.revision!==revision)throw Error('Ada ayarları değişti. Paneli yenile.');
   const overrides={...cfg.hpOverrides};if(hp===null)delete overrides[kind];else overrides[kind]=hp;
   const next={...cfg,hpOverrides:overrides};
   if(!db.prepare('UPDATE event_island_settings444 SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(next),revision).changes)throw Error('Ada ayarları değişti. Paneli yenile.');
   // Overrides affect only future spawns. Existing HP, combat overlays,
   // deaths and pending rewards are intentionally untouched.
   audit(actor,'event_island_hp',{kind,hp,revision,requestId});return {ok:true,revision:revision+1};
  }));
 },
 clear(channel,requestId,actor){if(!Number.isInteger(channel)||channel<0||channel>channelCount)throw Error('Kanal geçersiz.');return mutate(()=>replay(requestId,JSON.stringify(['clear',channel]),()=>{clear(channel);audit(actor,'event_island_clear',{channel,requestId});return {ok:true};}));},
 spawn(plan,requestId,actor,buildProfile){const rows=validateEventPlan444(plan);if(!rows.length)throw Error('En az bir boss planı ekle.');return mutate(()=>replay(requestId,JSON.stringify(['spawn',rows]),()=>{
  const cfg=validateEventConfig444(JSON.parse(db.prepare('SELECT config_json FROM event_island_settings444 WHERE id=1').get().config_json));if(!cfg.enabled)throw Error('Önce Etkinlik Adası’nı aç.');
  const totals=Array(channelCount+1).fill(0);for(const r of rows)totals[r.channel]+=r.count;
  for(let ch=1;ch<=channelCount;ch++)if(totals[ch]&&db.prepare("SELECT count(*) n FROM monsters WHERE area='event' AND channel=? AND hp>0").get(ch).n+totals[ch]>cfg.maxBossesPerChannel)throw Error('Kanal '+ch+' boss sınırına ulaştı. Önce mevcut bossları temizle.');
  // Retire only settled dead anchors. Defeats, claims and loose player loot remain.
  db.exec("DELETE FROM event_island_defeats444 WHERE monster_id IN(SELECT m.id FROM monsters m WHERE m.area='event' AND m.hp<=0 AND NOT EXISTS(SELECT 1 FROM normal_defeats d WHERE d.monster_id=m.id AND d.rewards_completed_at=0)); DELETE FROM event_island_defeats444 WHERE NOT EXISTS(SELECT 1 FROM monsters m WHERE m.id=event_island_defeats444.monster_id); DELETE FROM event_island_monsters444 WHERE NOT EXISTS(SELECT 1 FROM monsters m WHERE m.id=event_island_monsters444.id); DELETE FROM event_island_monsters444 WHERE id IN(SELECT m.id FROM monsters m WHERE m.area='event' AND m.hp<=0 AND NOT EXISTS(SELECT 1 FROM normal_defeats d WHERE d.monster_id=m.id AND d.rewards_completed_at=0)); DELETE FROM monsters WHERE area='event' AND hp<=0 AND NOT EXISTS(SELECT 1 FROM event_island_monsters444 e WHERE e.id=monsters.id)");
  if(db.prepare("SELECT count(*) n FROM monsters WHERE area='event'").get().n+rows.reduce((n,r)=>n+r.count,0)>64)throw Error('Bekleyen boss ödülleri tamamlanıyor. Biraz sonra tekrar dene.');
  const positions=[[950,850],[1500,750],[2100,750],[2650,850],[950,1350],[1500,1300],[2100,1300],[2650,1350]],ids=[];
  for(const row of rows){const occupied=new Set(db.prepare("SELECT x,y FROM monsters WHERE area='event' AND channel=? AND hp>0").all(row.channel).map(p=>p.x+','+p.y));for(let i=0;i<row.count;i++){
   const point=positions.find(p=>!occupied.has(p.join(',')));if(!point)throw Error('Doğma noktaları dolu.');occupied.add(point.join(','));const info=buildProfile(row.kind),id=`event-${row.kind}-c${row.channel}-${randomUUID()}`,boss=EVENT_BOSSES444.find(b=>b.kind===row.kind);
   if(!info||!Number.isSafeInteger(info.hp)||info.hp<1||info.hp>100000000||!Number.isSafeInteger(info.damage)||info.damage<1||info.damage>1000000)throw Error('Boss ayarları geçersiz.');
   const baseHp=info.hp,hp=cfg.hpOverrides[row.kind]??baseHp;
   db.prepare("INSERT INTO monsters(id,name,x,y,hp,max_hp,variant,area,channel,is_boss,is_stone,summoned,respawn_at,spawn_round,despawn_at) VALUES(?,?,?,?,?,?,?,'event',?,0,0,0,0,1,0)").run(id,boss.name,...point,hp,hp,boss.variant,row.channel);db.prepare('INSERT INTO event_island_monsters444 VALUES(?,?)').run(id,JSON.stringify({...info,hp,baseHp,cadence:2100+[...id].reduce((n,c)=>(n*33+c.charCodeAt(0))>>>0,0)%221}));ids.push(id);
  }}audit(actor,'event_island_spawn',{requestId,plan:rows,ids});return {ok:true,ids};
 }));},
 award(pending,makeGear){return tx(()=>{const id=pending.monster_id,kind=eventKind444(id);if(!kind)throw Error('Etkinlik ödülü kimliği geçersiz.');const defeat=db.prepare('SELECT rewards_completed_at FROM normal_defeats WHERE monster_id=? AND spawn_round=?').get(id,pending.spawn_round);if(!defeat||defeat.rewards_completed_at>0)return {awarded:false,groundDrops:0};if(!db.prepare('INSERT OR IGNORE INTO event_island_defeats444 VALUES(?,?,?)').run(id,pending.spawn_round,Math.floor(now()/1000)).changes)return {awarded:false,groundDrops:0};
 const saved=JSON.parse(pending.loot_profile_json);if(saved.version!==1||saved.kind!==kind)throw Error('Etkinlik ödül kaydı geçersiz.');const t=Math.floor(now()/1000),participants=db.prepare('SELECT p.id,p.role,p.level FROM monster_participants mp JOIN players p ON p.id=mp.player_id WHERE mp.monster_id=? AND mp.spawn_round=? ORDER BY mp.created_at,p.id').all(id,pending.spawn_round),halloweenRate456=Math.max(0,Math.min(100,Number(JSON.parse(pending.events_snapshot||'{}').halloween)||0));let count=0;
 const materialLevel498=materialLevelPolicy498(JSON.parse(pending.events_snapshot||'{}'));
  for(const owner of participants){const balance487=balanceFactor487(balanceFromSnapshot487(JSON.parse(pending.events_snapshot||'{}')),"event",owner.level);let rolled=kind==='dragon'?rollDragonLoot(saved.config,random,balance487,materialLevel498):kind==='solo'?rollSoloLoot(saved.config,random):rollEventDungeon444(saved.config,owner.role,owner.id===participants[0]?.id,random,balance487,materialLevel498);if(halloweenRate456>0&&random()*100<halloweenRate456*balance487)rolled.push({itemId:'material:halloween_pumpkin',amount:1});
 for(const [i,r]of rolled.entries()){const item=catalogItem444(r.itemId);if(!item||item.rarity==='emerald'||String(item.id).includes('emerald')||pending.pearls_retired===1&&r.itemId==='resource:pearls')continue;const dropId=randomUUID(),gear=item.type==='gear'?makeGear(item):{power:0,enchantments:'[]'},angle=i*2.4,x=Math.max(690,Math.min(2910,pending.x+Math.cos(angle)*(30+i*4))),y=Math.max(520,Math.min(1660,pending.y+Math.sin(angle)*(30+i*4)));
 db.prepare('INSERT INTO world_drops(id,owner_id,monster_id,kind,item_name,rarity,power,amount,role,enchantments,x,y,expires_at,collectible_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(dropId,owner.id,id,item.type==='gear'?item.kind:'event_reward',gear.name??item.name,item.rarity??'orange',gear.power,r.amount,item.role??owner.role,gear.enchantments,x,y,t+GROUND_LOOT_SECONDS,t+5);db.prepare('INSERT INTO dragon_drop_payloads VALUES(?,?)').run(dropId,JSON.stringify({itemId:item.id}));count++;
 }}db.prepare('INSERT OR IGNORE INTO normal_reward_claims(monster_id,spawn_round,player_id,claim_token,awarded_at) SELECT monster_id,spawn_round,player_id,?,? FROM monster_participants WHERE monster_id=? AND spawn_round=?').run(randomUUID(),t,id,pending.spawn_round);db.prepare('UPDATE normal_defeats SET rewards_completed_at=? WHERE monster_id=? AND spawn_round=?').run(Math.max(1,t),id,pending.spawn_round);return {awarded:true,groundDrops:count};});},
 collect(playerId,dropId){return tx(()=>{const p=db.prepare('SELECT id,area,hp,x,y FROM players WHERE id=?').get(playerId),d=db.prepare('SELECT d.*,v.payload_json FROM world_drops d JOIN dragon_drop_payloads v ON v.drop_id=d.id WHERE d.id=? AND d.owner_id=?').get(dropId,playerId),t=Math.floor(now()/1000);if(!p||p.hp<=0||!d||!eventKind444(d.monster_id)||!(p.area==='event'||p.area==='bazaar'&&!current.config.enabled)||groundLootExpired(d.expires_at,t)||d.collectible_at>t&&Math.hypot(p.x-d.x,p.y-d.y)>280)throw Error('Etkinlik ganimeti alınamıyor.');const item=catalogItem444(JSON.parse(d.payload_json).itemId);if(!item)throw Error('Ödül tanınmıyor.');globalThis.__colDragonBoss.grantCatalog(playerId,item,d.amount,d);db.prepare('DELETE FROM world_drops WHERE id=?').run(dropId);db.prepare('DELETE FROM dragon_drop_payloads WHERE drop_id=?').run(dropId);return {ok:true,message:d.item_name+' çantana eklendi.'};});}
 };
}
function rollEventDungeon444(cfg,role,winner,random=Math.random,balance487=1,materialLevel498=false){
 const unit=()=>Math.max(0,Math.min(1-Number.EPSILON,Number(random())||0)),drops=[];
 for(const kind of ['wing','infinite','pet'])drops.push({itemId:'material:'+kind,amount:1+(unit()*100<Number(cfg[kind+'_bonus_chance']??10)*(materialLevel498?1:balance487)?1:0)});
 const gear=helmet=>({itemId:'gear:'+role+':'+(helmet?'helmet':['weapon','armor','shoes','necklace'][Math.floor(unit()*4)])+':red',amount:1});
 if(unit()*100<Number(cfg.red_chance??18)*balance487)drops.push(gear(false));if(unit()*100<Number(cfg.helmet_chance??5)*balance487)drops.push(gear(true));
 if(winner){if(cfg.winner_gems>0)drops.push({itemId:'resource:gems',amount:cfg.winner_gems});if(unit()*100<Number(cfg.winner_red_chance??100))drops.push(gear(false));}
 if(unit()<.25*(materialLevel498?1:balance487))drops.push({itemId:'stone:evolution_scroll',amount:1});if(unit()<.25*(materialLevel498?1:balance487))drops.push({itemId:'stone:book',amount:1});return drops;
}
function eventDungeonDescription446(cfg){
 const chance=(key,fallback)=>Math.max(0,Math.min(100,Number(cfg[key]??fallback)||0)),row=(name,pct,min=1,max=min)=>({name,chance:pct,min,max});
 const result=['wing','infinite','pet'].map(k=>{const bonus=chance(k+'_bonus_chance',10),name=({wing:'Kanat Parçası',infinite:'Sonsuz Taşı Parçası',pet:'Ejderha Parçası'})[k];return row(name+' · Ek parça şansı %'+bonus,100,1,bonus>0?2:1);});
 result.push(row('Sınıfa uygun kırmızı ekipman',chance('red_chance',18)),row('Sınıfa uygun kırmızı kask',chance('helmet_chance',5)),row('Evrim Parşömeni',25),row('Taş Sanatı Kitabı',25));
 if(Number(cfg.winner_gems)>0)result.push(row('Tek katılımcı ek ödülü: Mücevher',100,Number(cfg.winner_gems)));
 result.push(row('Tek katılımcı ek ödülü: Kırmızı ekipman',chance('winner_red_chance',100)));
 return result;
}
return {ensureEventIsland444,createEventIsland444,rollEventDungeon444};}
function runesModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const RUNE_TYPES=dependencies[3].RUNE_TYPES;
const RUNE_MOBS=dependencies[3].RUNE_MOBS;
const RUNE_SPAWNS=dependencies[3].RUNE_SPAWNS;
const RUNE_SPAWN=dependencies[3].RUNE_SPAWN;
const runeWalkable=dependencies[3].runeWalkable;
const RUNE_GATE_MESSAGE=dependencies[3].RUNE_GATE_MESSAGE;
const runeEligible=dependencies[3].runeEligible;
const isRuneKind=dependencies[3].isRuneKind;
const runeUpgradeCost=dependencies[3].runeUpgradeCost;
const runeBonusPercent=dependencies[3].runeBonusPercent;
const defaultRuneConfig=dependencies[3].defaultRuneConfig;
const validateRuneConfig=dependencies[3].validateRuneConfig;
const runeMonsterKey=dependencies[3].runeMonsterKey;
function ensureRuneSchema(db){
 db.exec('BEGIN IMMEDIATE');try{
  db.exec(`CREATE TABLE IF NOT EXISTS rune_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS rune_starter_claims(player_id TEXT PRIMARY KEY,created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS rune_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,action TEXT NOT NULL,fingerprint TEXT NOT NULL,result_json TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));
  CREATE INDEX IF NOT EXISTS idx_rune_receipts_created ON rune_receipts(created_at);
  CREATE INDEX IF NOT EXISTS idx_rune_max_level ON player_items(power DESC) WHERE kind IN ('rune_attack','rune_defense','rune_hp');
  CREATE UNIQUE INDEX IF NOT EXISTS idx_rune_equipped_slot ON player_items(player_id,kind) WHERE equipped=1 AND kind IN ('rune_attack','rune_defense','rune_hp');`);
  db.prepare('INSERT OR IGNORE INTO rune_settings(id,config_json) VALUES(1,?)').run(JSON.stringify(defaultRuneConfig()));
  const cols=new Set(db.prepare('PRAGMA table_info(players)').all().map(c=>c.name));
  for(const k of ['rune_attack_level','rune_defense_level','rune_hp_level'])if(!cols.has(k))db.exec(`ALTER TABLE players ADD COLUMN ${k} INTEGER NOT NULL DEFAULT 0`);
  const update=ref=>`UPDATE players SET ${Object.keys(RUNE_TYPES).map(k=>`${k}_level=COALESCE((SELECT power FROM player_items WHERE player_id=players.id AND kind='${k}' AND equipped=1 LIMIT 1),0)`).join(',')} WHERE id=${ref}.player_id;`;
  for(const [event,ref]of [['INSERT','NEW'],['DELETE','OLD']])db.exec(`CREATE TRIGGER IF NOT EXISTS rune_item_${event.toLowerCase()} AFTER ${event} ON player_items WHEN ${ref}.kind IN ('rune_attack','rune_defense','rune_hp') BEGIN ${update(ref)} END;`);
  db.exec(`CREATE TRIGGER IF NOT EXISTS rune_item_update AFTER UPDATE OF power,equipped,player_id,kind ON player_items WHEN OLD.kind IN ('rune_attack','rune_defense','rune_hp') OR NEW.kind IN ('rune_attack','rune_defense','rune_hp') BEGIN ${update('OLD')} ${update('NEW')} END;`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_players_rune_hp ON players(id) WHERE rune_hp_level>0');
  const cfg=validateRuneConfig(JSON.parse(db.prepare('SELECT config_json FROM rune_settings WHERE id=1').get().config_json));
  const insert=db.prepare(`INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,variant,area,channel,is_boss,is_stone,summoned,respawn_at,spawn_round) VALUES(?,?,?,?,?,?,'normal','rune',?,0,0,0,0,1)`);
  for(let ch=1;ch<=channelCount;ch++)for(const s of RUNE_SPAWNS){const m=cfg.monsters[s.key];insert.run(`rune-${s.key}-c${ch}-${s.slot}`,m.name,s.x,s.y,m.hp,m.hp,ch);}
  db.exec('CREATE TABLE IF NOT EXISTS rune_map_layout(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL)');
  if(!db.prepare('SELECT 1 FROM rune_map_layout WHERE id=1 AND version=423').get()){
   // Startup-only layout migration. Keep HP, spawn rounds, timers and earned
   // rewards. Reduce only the canonical ambient population, never loot receipts.
   const wanted=new Map();for(let ch=1;ch<=channelCount;ch++)for(const point of RUNE_SPAWNS)wanted.set(`rune-${point.key}-c${ch}-${point.slot}`,point);
   const move=db.prepare('UPDATE monsters SET x=?,y=? WHERE id=?');
   const remove=db.prepare("DELETE FROM monsters WHERE id=? AND area='rune'");
   for(const monster of db.prepare("SELECT id FROM monsters WHERE area='rune'").all()){
    const point=wanted.get(monster.id);if(point)move.run(point.x,point.y,monster.id);
    else if((fourChannels?/^rune-(tide|warden|sentinel|wraith)-c[1-4]-[6-8]$/:/^rune-(tide|warden|sentinel|wraith)-c[1-3]-[6-8]$/).test(monster.id))remove.run(monster.id);
   }
   const movePlayer=db.prepare('UPDATE players SET x=?,y=? WHERE id=?');
   for(const player of db.prepare("SELECT id,x,y FROM players WHERE area='rune'").all()){
    const x=Math.round(player.x*.8),y=Math.round(player.y*.8);movePlayer.run(runeWalkable(x,y)?x:RUNE_SPAWN.x,runeWalkable(x,y)?y:RUNE_SPAWN.y,player.id);
   }
   db.prepare('INSERT INTO rune_map_layout(id,version) VALUES(1,423) ON CONFLICT(id) DO UPDATE SET version=423').run();
  }
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
}
function createRunes(db,{refreshHp=id=>globalThis.__colPremium?.refreshHp(id)}={}){
 let current,snapshots;
 const refresh=()=>{const r=db.prepare('SELECT * FROM rune_settings WHERE id=1').get();current={revision:r.revision,config:validateRuneConfig(JSON.parse(r.config_json))};snapshots=Object.fromEntries(RUNE_MOBS.map(m=>[m.key,{lootSourceKey:'rune.'+m.key,lootProfileRevision:r.revision,lootProfileJson:JSON.stringify({version:1,key:'rune.'+m.key,runeLoot:current.config.monsters[m.key].loot})}]));return current;};refresh();
 const get=id=>{const p=db.prepare('SELECT id,role,level,rank_tier,hp,area,arena_match_id,combat_lock_until_ms FROM players WHERE id=?').get(id);if(!p)throw Error('Karakter bulunamadı.');return p;};
 const eligible=id=>{const p=get(id);if(!runeEligible(p))throw Error(RUNE_GATE_MESSAGE);return p;};
 const read=id=>{const p=get(id);return {...current,eligible:runeEligible(p),claimed:!!db.prepare('SELECT 1 FROM rune_starter_claims WHERE player_id=?').get(id),items:db.prepare("SELECT id,kind,item_name,power,equipped,sale_locked499 FROM player_items WHERE player_id=? AND kind IN ('rune_attack','rune_defense','rune_hp') ORDER BY kind,power DESC,id").all(id),materials:Object.fromEntries(db.prepare("SELECT kind,amount FROM dungeon_materials WHERE player_id=? AND kind IN ('rune_attack','rune_defense','rune_hp')").all(id).map(r=>[r.kind,r.amount]))};};
 const transact=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}};
 const assertNumeric=(level,step=current.config.bonusPerLevel)=>{if(!Number.isSafeInteger(Math.round(10000000*(1+level*step/100))))throw Error("Rün gücü sayısal işlem sınırına ulaştı.");};
 const insert=(id,kind,level=1)=>{const itemId=crypto.randomUUID();db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,equipped,enchantments,created_at) VALUES(?,?,?,?,'unique',?,?,0,'[]',unixepoch())").run(itemId,id,kind,RUNE_TYPES[kind].label,level,get(id).role);return itemId;};
 return {refresh,settings:()=>current,read,
  factor(p,stat){return 1+(runeEligible(p)?(Number(p['rune_'+stat+'_level'])||0)*current.config.bonusPerLevel/100:0)+(globalThis.__colStatus?.bonus(p,stat)??0);},
  monster(m){const key=runeMonsterKey(m);return key?current.config.monsters[key]:null;},
  lootSnapshot(m){return snapshots[runeMonsterKey(m)]??null;},
  command(id,input){return transact(()=>{
   const p=eligible(id);const action=input?.action,requestId=input?.requestId;
   if(typeof requestId!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId))throw Error('İşlem kimliği gerekli.');
   const fingerprint=JSON.stringify([action,input.itemId??null,input.kind??null,input.expectedLevel??null]);
   const prev=db.prepare('SELECT action,fingerprint,result_json FROM rune_receipts WHERE player_id=? AND request_id=?').get(id,requestId);
   if(prev){if(prev.action!==action||prev.fingerprint!==fingerprint)throw Error('İşlem kimliği daha önce kullanıldı.');return {...JSON.parse(prev.result_json),state:read(id),replayed:true};}
   let itemId=input.itemId,kind=input.kind;
   if(action==='rune_claim'){
    if(db.prepare('INSERT OR IGNORE INTO rune_starter_claims(player_id,created_at) VALUES(?,unixepoch())').run(id).changes)for(const k of Object.keys(RUNE_TYPES))insert(id,k);
   }else if(action==='rune_craft'){
    if(!isRuneKind(kind))throw Error('Geçersiz rün.');
    if(!db.prepare('UPDATE dungeon_materials SET amount=amount-5 WHERE player_id=? AND kind=? AND amount>=5').run(id,kind).changes)throw Error('Yeni bir rün için aynı türden 5 parça gerekli.');
    itemId=insert(id,kind);
   }else{
    const item=db.prepare("SELECT id,kind,power,equipped FROM player_items WHERE id=? AND player_id=? AND kind IN ('rune_attack','rune_defense','rune_hp')").get(itemId,id);
    if(!item)throw Error('Rün envanterinde bulunamadı.');kind=item.kind;
    if(input.expectedLevel!==item.power)throw Error('Rünün seviyesi değişti. Paneli yenile.');
    if(!['rune_upgrade','rune_equip','rune_unequip'].includes(action))throw Error('Geçersiz rün işlemi.');
    if((action!=='rune_upgrade'||item.equipped)&& (p.hp<=0||p.arena_match_id||db.prepare('SELECT 1 FROM dungeon_members WHERE player_id=? LIMIT 1').get(id)||p.combat_lock_until_ms>Date.now()))throw Error('Rününü değiştirmek için savaştan çıkmalısın.');
    if(action==='rune_upgrade'){
     assertNumeric(item.power+1);const cost=runeUpgradeCost(item.power);if(!Number.isSafeInteger(item.power+1))throw Error('Rün seviyesi işlenemedi.');
     if(!db.prepare('UPDATE dungeon_materials SET amount=amount-? WHERE player_id=? AND kind=? AND amount>=?').run(cost,id,kind,cost).changes)throw Error(`Bu seviye için ${cost} ${RUNE_TYPES[kind].shard} gerekli.`);
     db.prepare('UPDATE player_items SET power=power+1 WHERE id=? AND player_id=? AND power=?').run(itemId,id,item.power);
    }else if(action==='rune_equip'){
     assertNumeric(item.power);
     db.prepare('UPDATE player_items SET equipped=0 WHERE player_id=? AND kind=? AND equipped=1').run(id,kind);
     db.prepare('UPDATE player_items SET equipped=1 WHERE id=? AND player_id=?').run(itemId,id);
    }else db.prepare('UPDATE player_items SET equipped=0 WHERE id=? AND player_id=?').run(itemId,id);
    if(kind==='rune_hp')refreshHp(id);
   }
   const result={ok:true,itemId,message:action==='rune_upgrade'?'Rünün seviyesi yükseldi.':action==='rune_claim'?'Üç başlangıç rünün envanterine eklendi.':'Rün işlemi tamamlandı.'};
   db.prepare('INSERT INTO rune_receipts(player_id,request_id,action,fingerprint,result_json,created_at) VALUES(?,?,?,?,?,unixepoch())').run(id,requestId,action,fingerprint,JSON.stringify(result));
   // Bounded cleanup only on rare inventory mutations, indexed by timestamp.
   db.prepare('DELETE FROM rune_receipts WHERE rowid IN (SELECT rowid FROM rune_receipts WHERE created_at<unixepoch()-604800 ORDER BY created_at LIMIT 32)').run();
   return {...result,state:read(id)};
  });},
  save(input,revision){const next=validateRuneConfig(input),prior=current,priorSnapshots=snapshots;try{return transact(()=>{
   if(next.bonusPerLevel!==prior.config.bonusPerLevel){const maxLevel=db.prepare("SELECT MAX(power) AS level FROM player_items WHERE kind IN ('rune_attack','rune_defense','rune_hp')").get().level??0;assertNumeric(maxLevel,next.bonusPerLevel);}
   if(!db.prepare('UPDATE rune_settings SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(next),revision).changes)throw Error('Rün ayarları değişti. Paneli yenile.');
   refresh();if(next.bonusPerLevel!==prior.config.bonusPerLevel)for(const p of db.prepare('SELECT id FROM players WHERE rune_hp_level>0').all())refreshHp(p.id);return current;
  });}catch(e){current=prior;snapshots=priorSnapshots;throw e;}}
 };
}
return {ensureRuneSchema,createRunes};}
function runeV2Module({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const RUNE_V2_BOSS_AI_SCHEMA484=module34.RUNE_V2_BOSS_AI_SCHEMA484;
const migrateRuneV2BossLocation484=module35.migrateRuneV2BossLocation484;
const RUNE_V2_RANKING_SCHEMA483=module36.RUNE_V2_RANKING_SCHEMA483;
const restoreRuneV2Rollback483=module37.restoreRuneV2Rollback483;
const RUNE_V2_MOBS=dependencies[4].RUNE_V2_MOBS;
const RUNE_V2_SPAWNS=dependencies[4].RUNE_V2_SPAWNS;
const RUNE_V2_LOOT_LABELS=dependencies[4].RUNE_V2_LOOT_LABELS;
const defaultRuneV2Config=dependencies[4].defaultRuneV2Config;
const validateRuneV2Config=dependencies[4].validateRuneV2Config;
const runeV2MonsterKey=dependencies[4].runeV2MonsterKey;
function ensureRuneV2Schema(db){db.exec('BEGIN IMMEDIATE');try{
 db.exec(RUNE_V2_RANKING_SCHEMA483);
 db.exec(RUNE_V2_BOSS_AI_SCHEMA484);
 db.exec('CREATE TABLE IF NOT EXISTS rune_v2_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL)');
 db.prepare('INSERT OR IGNORE INTO rune_v2_settings(id,config_json) VALUES(1,?)').run(JSON.stringify(defaultRuneV2Config()));
 restoreRuneV2Rollback483(db);
 const config=validateRuneV2Config(JSON.parse(db.prepare('SELECT config_json FROM rune_v2_settings WHERE id=1').get().config_json));
 const insert=db.prepare("INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,variant,area,channel,is_boss,is_stone,summoned,respawn_at,spawn_round) VALUES(?,?,?,?,?,?,?,'rune_v2',?,0,0,0,0,1)");
 // Named boss follows frozen/ancient boss per-monster reward ledger. is_boss=1
 // is reserved for the global world's shared boss_round ledger.
 for(let ch=1;ch<=channelCount;ch++)for(const s of RUNE_V2_SPAWNS){const m=config.monsters[s.key];insert.run(`rune-v2-${s.key}-c${ch}-${s.slot}`,m.name,s.x,s.y,m.hp,m.hp,s.key==='boss'?'rune_v2_boss':'normal',ch);}
 migrateRuneV2BossLocation484(db);
 db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}}
function createRuneV2(db){let current,snapshots;const refresh=()=>{
 const row=db.prepare('SELECT revision,config_json FROM rune_v2_settings WHERE id=1').get();if(!row||!Number.isSafeInteger(row.revision)||row.revision<1||row.revision>=Number.MAX_SAFE_INTEGER)throw Error('Karanlık Rün Sahili ayarları bulunamadı veya sürümü geçersiz.');
 const next={revision:row.revision,config:validateRuneV2Config(JSON.parse(row.config_json))};
 const nextSnapshots=Object.fromEntries(RUNE_V2_MOBS.map(m=>[m.key,{lootSourceKey:'rune_v2.'+m.key,lootProfileRevision:row.revision,lootProfileJson:JSON.stringify({version:1,key:'rune_v2.'+m.key,runeLoot:next.config.monsters[m.key].loot,...(m.key==='boss'?{runeBossPersonal502:true,runeV2Boss:{topDamageGems:next.config.monsters.boss.topDamageGems,revision:row.revision}}:{})})}]));
 current=next;snapshots=nextSnapshots;return current;
 };refresh();return {refresh,settings:()=>({...current,lootLabels:RUNE_V2_LOOT_LABELS}),monster:m=>current.config.monsters[runeV2MonsterKey(m)]??null,lootSnapshot:m=>snapshots[runeV2MonsterKey(m)]??null,
 save(input,revision){const next=validateRuneV2Config(input);if(!Number.isSafeInteger(revision)||revision<1||revision>=Number.MAX_SAFE_INTEGER)throw Error('Karanlık Rün Sahili ayar sürümü geçersiz.');const previous=current,previousSnapshots=snapshots;db.exec('BEGIN IMMEDIATE');try{
  if(!db.prepare('UPDATE rune_v2_settings SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(next),revision).changes)throw Error('Karanlık Rün Sahili ayarları değişti. Paneli yenile.');
  // Ordinary monster HP remains next-respawn. Live canonical boss HP keeps
  // its current fraction when the configured maximum changes.
  const rename=db.prepare("UPDATE monsters SET name=? WHERE area='rune_v2' AND id=?");for(let ch=1;ch<=channelCount;ch++)for(const point of RUNE_V2_SPAWNS)rename.run(next.monsters[point.key].name,`rune-v2-${point.key}-c${ch}-${point.slot}`);
  const hp=next.monsters.boss.hp;
  db.prepare((fourChannels?"UPDATE monsters SET hp=MIN(?,MAX(1,CAST((hp*?+MAX(1,max_hp)-1)/MAX(1,max_hp) AS INTEGER))),max_hp=? WHERE id IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1','rune-v2-boss-c4-1') AND id='rune-v2-boss-c'||channel||'-1' AND area='rune_v2' AND variant='rune_v2_boss' AND is_boss=0 AND is_stone=0 AND summoned=0 AND loadlab_run_id='' AND hp>0 AND max_hp<>?":"UPDATE monsters SET hp=MIN(?,MAX(1,CAST((hp*?+MAX(1,max_hp)-1)/MAX(1,max_hp) AS INTEGER))),max_hp=? WHERE id IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1') AND id='rune-v2-boss-c'||channel||'-1' AND area='rune_v2' AND variant='rune_v2_boss' AND is_boss=0 AND is_stone=0 AND summoned=0 AND loadlab_run_id='' AND hp>0 AND max_hp<>?")).run(hp,hp,hp,hp);
  refresh();db.exec('COMMIT');return current;
 }catch(error){if(db.isTransaction)db.exec('ROLLBACK');current=previous;snapshots=previousSnapshots;throw error;}}
 };}
return {ensureRuneV2Schema,createRuneV2};}
function evolutionModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const battlePassXpSql=module38.battlePassXpSql;
const playerLevelCap=module39.playerLevelCap;
const levelCosts=module40.levelCosts;
function ensureEvolutionQuestSchema(db){
 db.exec(`CREATE TABLE IF NOT EXISTS player_evolution_quest(player_id TEXT PRIMARY KEY,completed_at INTEGER NOT NULL,claimed_at INTEGER);
 CREATE TRIGGER IF NOT EXISTS first_weapon_evolution_quest AFTER UPDATE OF enchantments ON player_items
 WHEN NEW.kind='weapon' AND OLD.player_id=NEW.player_id AND json_valid(NEW.enchantments) AND json_valid(OLD.enchantments)
 AND COALESCE((SELECT json_extract(value,'$.value') FROM json_each(OLD.enchantments) WHERE json_extract(value,'$.kind')='evolution_level'),0)<1
 AND COALESCE((SELECT json_extract(value,'$.value') FROM json_each(NEW.enchantments) WHERE json_extract(value,'$.kind')='evolution_level'),0)=1
 BEGIN INSERT OR IGNORE INTO player_evolution_quest(player_id,completed_at) VALUES(NEW.player_id,unixepoch()); END;`);
 // Only recorded personal evolutions qualify retroactively, never traded gear.
 db.exec(`INSERT OR IGNORE INTO player_evolution_quest(player_id,completed_at)
 SELECT player_id,MIN(created_at) FROM messages WHERE player_name='EVRİM' AND announcement_request_id LIKE 'evolution-%-1' AND player_id IS NOT NULL GROUP BY player_id;`);
}
function createEvolutionQuest(db){
 const player=id=>{const p=db.prepare('SELECT * FROM players WHERE id=?').get(id);if(!p)throw new Error('Karakter gerekli.');return p;};
 const read=id=>{player(id);const row=db.prepare('SELECT completed_at,claimed_at FROM player_evolution_quest WHERE player_id=?').get(id);const economy=db.prepare('SELECT evolution_1_kills,evolution_1_gems FROM economy_settings WHERE id=1').get();return{completed:!!row,claimed:row?.claimed_at!=null,requirements:{kills:Math.max(0,Math.floor(economy?.evolution_1_kills??100)),gems:Math.max(0,Math.floor(economy?.evolution_1_gems??100)),pearls:5},reward:{essence:100,xp:300}};};
 return {read,claim(id){if(globalThis.__colQuests438)throw new Error('İlk evrim ödülünü yeni Görevler menüsünden alabilirsin. Oyunu yenile.');db.exec('BEGIN IMMEDIATE');try{const p=player(id),state=read(id);if(!state.completed)throw new Error('Önce bir silahını ilk kez evrimleştir.');if(!state.claimed){const settings=db.prepare('SELECT * FROM game_settings WHERE id=1').get()??{};const costs=levelCosts(settings),cap=playerLevelCap(settings,p);const xp=p.level>=cap?p.xp:Math.min(p.xp+300,costs.slice(0,cap-1).reduce((a,b)=>a+b,0));let threshold=0,level=1;for(const cost of costs.slice(0,cap-1)){threshold+=cost;if(xp<threshold)break;level++;}db.prepare(`UPDATE players SET ${battlePassXpSql('300')},${globalThis.__colRanks?'rank_xp=CASE WHEN level>=65 AND rank_tier>0 THEN MIN(9000000000000,rank_xp+300) ELSE rank_xp END,':''}essence=essence+100,xp=?,level=? WHERE id=?`).run(xp,Math.max(p.level,level),id);db.prepare('UPDATE player_evolution_quest SET claimed_at=unixepoch() WHERE player_id=? AND claimed_at IS NULL').run(id);}const result=read(id);db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}};
}
return {ensureEvolutionQuestSchema,createEvolutionQuest};}
function communityModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const randomUUID=uuid;
const defaultCommunityConfig=module42.defaultCommunityConfig;
const validateCommunityConfig=module42.validateCommunityConfig;
const CLAIM_GRACE_SECONDS=module42.CLAIM_GRACE_SECONDS;
function ensureCommunitySchema(sql){sql.exec(`
 CREATE TABLE IF NOT EXISTS community_runs(id TEXT PRIMARY KEY,config_json TEXT NOT NULL,start_at INTEGER NOT NULL,end_at INTEGER NOT NULL,published INTEGER NOT NULL DEFAULT 0,total INTEGER NOT NULL DEFAULT 0,completed_at INTEGER NOT NULL DEFAULT 0,revision INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_community_runs_time ON community_runs(published,end_at,start_at);
 CREATE TABLE IF NOT EXISTS community_kills(event_id TEXT NOT NULL,cycle INTEGER NOT NULL,monster_id TEXT NOT NULL,spawn_round INTEGER NOT NULL,defeated_at INTEGER NOT NULL,PRIMARY KEY(event_id,cycle,monster_id,spawn_round));
 CREATE TABLE IF NOT EXISTS community_contributions(event_id TEXT NOT NULL,account_id TEXT NOT NULL,cycle INTEGER NOT NULL,monster_id TEXT NOT NULL,spawn_round INTEGER NOT NULL,PRIMARY KEY(event_id,account_id,cycle,monster_id,spawn_round));
 CREATE TABLE IF NOT EXISTS community_progress(event_id TEXT NOT NULL,account_id TEXT NOT NULL,kills INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(event_id,account_id));
 CREATE TABLE IF NOT EXISTS community_claims(event_id TEXT NOT NULL,account_id TEXT NOT NULL,stage INTEGER NOT NULL,player_id TEXT NOT NULL,rewards_json TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(event_id,account_id,stage));
 CREATE TABLE IF NOT EXISTS community_audit(id TEXT PRIMARY KEY,event_id TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,detail_json TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TRIGGER IF NOT EXISTS community_normal_death AFTER INSERT ON normal_defeats BEGIN
  INSERT OR IGNORE INTO community_kills(event_id,cycle,monster_id,spawn_round,defeated_at)
  SELECT r.id,w.cycle,NEW.monster_id,NEW.spawn_round,NEW.defeated_at FROM community_runs r
  JOIN monsters m ON m.id=NEW.monster_id AND m.spawn_round=NEW.spawn_round JOIN world_state w ON w.id=1
  WHERE r.published=1 AND NEW.defeated_at>=r.start_at AND NEW.defeated_at<r.end_at
   AND m.area='forest' AND m.is_boss=0 AND m.is_stone=0 AND m.summoned=0;
 END;
 CREATE TRIGGER IF NOT EXISTS community_count_death AFTER INSERT ON community_kills BEGIN
  UPDATE community_runs SET total=total+1,completed_at=CASE WHEN completed_at=0 AND total+1>=json_extract(config_json,'$.stages[2].target') THEN NEW.defeated_at ELSE completed_at END WHERE id=NEW.event_id;
 END;
 CREATE TRIGGER IF NOT EXISTS community_capture_participants AFTER INSERT ON community_kills BEGIN
  INSERT OR IGNORE INTO community_contributions(event_id,account_id,cycle,monster_id,spawn_round)
  SELECT NEW.event_id,p.account_id,NEW.cycle,NEW.monster_id,NEW.spawn_round
  FROM monster_participants mp JOIN players p ON p.id=mp.player_id JOIN community_runs r ON r.id=NEW.event_id
  WHERE mp.monster_id=NEW.monster_id AND mp.spawn_round=NEW.spawn_round AND p.account_id IS NOT NULL AND p.account_id!=''
   AND mp.created_at>=r.start_at AND mp.created_at<=NEW.defeated_at;
 END;
 CREATE TRIGGER IF NOT EXISTS community_count_participant AFTER INSERT ON community_contributions BEGIN
  INSERT INTO community_progress(event_id,account_id,kills) VALUES(NEW.event_id,NEW.account_id,1)
  ON CONFLICT(event_id,account_id) DO UPDATE SET kills=kills+1;
 END;
 `);}
const COLUMNS={gems:'gems',potions:'potions',essence:'essence',pearl:'pearls',stone_dust:'stone_dust',enchant_scroll:'enchant_scrolls'};
function createCommunityEvent(sql,{now=()=>Math.floor(Date.now()/1000)}={}){
 const transaction=fn=>{sql.exec('BEGIN IMMEDIATE');try{const result=fn();sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}};
 const rows=()=>sql.prepare('SELECT * FROM community_runs ORDER BY created_at DESC,rowid DESC LIMIT 20').all();
 const view=(r,accountId='')=>{const config=JSON.parse(r.config_json);const personal=accountId?Number(sql.prepare('SELECT kills FROM community_progress WHERE event_id=? AND account_id=?').get(r.id,accountId)?.kills??0):0;const claimed=accountId?sql.prepare('SELECT stage FROM community_claims WHERE event_id=? AND account_id=?').all(r.id,accountId).map(x=>x.stage):[];return {id:r.id,...config,start:r.start_at,end:r.end_at,published:Boolean(r.published),total:r.total,completedAt:r.completed_at,revision:r.revision,personal,claimed,claimUntil:r.end_at+CLAIM_GRACE_SECONDS};};
 const read=accountId=>({runs:sql.prepare('SELECT * FROM community_runs WHERE published=1 AND end_at+?>? ORDER BY start_at DESC LIMIT 20').all(CLAIM_GRACE_SECONDS,now()).map(r=>view(r,accountId)),serverTime:now(),sampledAtMs:Date.now()});
 const progress=accountId=>{
  const time=now(),r=sql.prepare('SELECT id,total,completed_at,revision FROM community_runs WHERE published=1 AND start_at<=? AND end_at>? ORDER BY start_at DESC LIMIT 1').get(time,time-5);
  if(!r)return null;
  const result={id:r.id,total:r.total,completedAt:r.completed_at,revision:r.revision};
  if(accountId)result.personal=Number(sql.prepare('SELECT kills FROM community_progress WHERE event_id=? AND account_id=?').get(r.id,accountId)?.kills??0);
  return result;
 };
 const occupiedRooms=()=>({cycle:Number(sql.prepare('SELECT cycle FROM world_state WHERE id=1').get()?.cycle??1),rooms:sql.prepare('SELECT DISTINCT channel,area,arena_match_id FROM players WHERE last_seen>=?').all(now()-45).map(r=>({channel:r.channel,area:r.area,arenaMatchId:r.arena_match_id??''}))});
 const adminRead=()=>({runs:rows().map(r=>view(r)),defaults:defaultCommunityConfig(),serverTime:now()});
 function manage(actor,body){return transaction(()=>{
  const time=now();let r=body.id?sql.prepare('SELECT * FROM community_runs WHERE id=?').get(String(body.id)):null;
  if(body.id&&!r)throw new Error('Etkinlik bulunamadı.');
  if(r&&body.revision!==r.revision)throw new Error('Etkinlik başka bir pencerede değişti. Yenileyip tekrar dene.');
  let id=r?.id??randomUUID();
  if(body.action==='save'||body.action==='publish'){
   if(r?.published&&time>=r.start_at)throw new Error('Başlamış etkinliğin hedef ve ödülleri değiştirilemez.');
   const config=validateCommunityConfig(body.config),start=body.start==='now'?time:body.start,end=start+body.duration;
   if(!Number.isInteger(start)||start<time||start>time+366*86400||!Number.isInteger(body.duration)||body.duration<60||body.duration>30*86400)throw new Error('Başlangıç gelecekte; süre 1 dakika–30 gün arasında olmalı.');
   const published=body.action==='publish'?1:0;
   if(published&&sql.prepare('SELECT id FROM community_runs WHERE id!=? AND published=1 AND start_at<? AND end_at>? LIMIT 1').get(id,end,start))throw new Error('Bu saatlerde başka bir ortak etkinlik var.');
   if(r)sql.prepare('UPDATE community_runs SET config_json=?,start_at=?,end_at=?,published=?,revision=revision+1 WHERE id=?').run(JSON.stringify(config),start,end,published,id);
   else sql.prepare('INSERT INTO community_runs(id,config_json,start_at,end_at,published,created_at) VALUES(?,?,?,?,?,?)').run(id,JSON.stringify(config),start,end,published,time);
  }else if(body.action==='extend'){
   if(!r?.published||time>=r.end_at||!Number.isInteger(body.seconds)||body.seconds<60||body.seconds>7*86400||r.end_at+body.seconds>r.start_at+30*86400)throw new Error('Süren etkinlik en fazla 30 güne uzatılabilir.');
   const end=r.end_at+body.seconds;if(sql.prepare('SELECT id FROM community_runs WHERE id!=? AND published=1 AND start_at<? AND end_at>? LIMIT 1').get(id,end,r.start_at))throw new Error('Uzatma başka etkinlikle çakışıyor.');
   sql.prepare('UPDATE community_runs SET end_at=?,revision=revision+1 WHERE id=?').run(end,id);
  }else if(body.action==='stop'){
   if(!r?.published||time>=r.end_at)throw new Error('Etkinlik zaten kapalı.');
   if(time<r.start_at)sql.prepare('UPDATE community_runs SET published=0,revision=revision+1 WHERE id=?').run(id);
   else sql.prepare('UPDATE community_runs SET end_at=?,revision=revision+1 WHERE id=?').run(time,id);
  }else throw new Error('Geçersiz yönetim işlemi.');
  sql.prepare('INSERT INTO community_audit VALUES(?,?,?,?,?,?)').run(randomUUID(),id,actor,body.action,JSON.stringify(body),time);
  return adminRead();
 });}
 function claim(accountId,playerId,eventId,stage){return transaction(()=>{
  if(typeof eventId!=='string'||!Number.isInteger(stage)||stage<0||stage>2)throw new Error('Ödül seçimi geçersiz.');
  const player=sql.prepare('SELECT * FROM players WHERE id=? AND account_id=?').get(playerId,accountId);if(!player)throw new Error('Karakter sahipliği doğrulanamadı.');
  const old=sql.prepare('SELECT rewards_json FROM community_claims WHERE event_id=? AND account_id=? AND stage=?').get(eventId,accountId,stage);
  if(old)return {ok:true,alreadyClaimed:true,rewards:JSON.parse(old.rewards_json),community:read(accountId)};
  const r=sql.prepare('SELECT * FROM community_runs WHERE id=?').get(eventId),time=now();
  if(!r?.published||time<r.start_at||time>=r.end_at+CLAIM_GRACE_SECONDS)throw new Error('Ödül alma süresi açık değil.');
  const config=validateCommunityConfig(JSON.parse(r.config_json)),reward=config.stages[stage];
  const personal=sql.prepare('SELECT kills FROM community_progress WHERE event_id=? AND account_id=?').get(eventId,accountId)?.kills??0;
  if(personal<config.minimum)throw new Error('Kişisel katkı hedefin henüz tamamlanmadı.');
  if(r.total<reward.target)throw new Error('Ortak hedef henüz tamamlanmadı.');
  for(const item of reward.rewards){const previous=item.kind==='stone_art_book'?(sql.prepare("SELECT amount FROM player_stones WHERE player_id=? AND kind='book'").get(playerId)?.amount??0):player[COLUMNS[item.kind]];if(!Number.isSafeInteger(previous)||previous<0||previous+item.amount>2147483647)throw new Error('Ödül için kaynak üst sınırı aşılıyor.');}
  sql.prepare('INSERT INTO community_claims VALUES(?,?,?,?,?,?)').run(eventId,accountId,stage,playerId,JSON.stringify(reward.rewards),time);
  for(const item of reward.rewards){if(item.kind==='stone_art_book')sql.prepare("INSERT INTO player_stones(player_id,kind,amount) VALUES(?,'book',?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount").run(playerId,item.amount);else sql.prepare(`UPDATE players SET ${COLUMNS[item.kind]}=${COLUMNS[item.kind]}+? WHERE id=? AND account_id=?`).run(item.amount,playerId,accountId);}
  return {ok:true,alreadyClaimed:false,rewards:reward.rewards,community:read(accountId)};
 });}
 return {read,progress,occupiedRooms,adminRead,manage,claim};
}
return {ensureCommunitySchema,createCommunityEvent};}
function guildVillageModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const GUILD_CASTLE_COST=module43.GUILD_CASTLE_COST;
const GUILD_DECOR=module43.GUILD_DECOR;
const GUILD_PLOTS=module43.GUILD_PLOTS;
const GUILD_VILLAGE_ENTRY=module43.GUILD_VILLAGE_ENTRY;
const GUILD_HALL_ENTRY=module43.GUILD_HALL_ENTRY;
const guildArea=module43.guildArea;
const villageArea=module43.villageArea;
const hallArea=module43.hallArea;
function ensureGuildVillageSchema(db){db.exec(`
 CREATE TABLE IF NOT EXISTS guild_village_settings(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN(0,1)),revision INTEGER NOT NULL DEFAULT 1);
 INSERT OR IGNORE INTO guild_village_settings(id) VALUES(1);
 CREATE TABLE IF NOT EXISTS guild_castles(guild_id TEXT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,district INTEGER NOT NULL CHECK(district BETWEEN 1 AND 9999),slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 8),purchased_by TEXT NOT NULL,purchased_at INTEGER NOT NULL,decor_level INTEGER NOT NULL DEFAULT 0 CHECK(decor_level BETWEEN 0 AND 3),decor_essence INTEGER NOT NULL DEFAULT 0 CHECK(decor_essence>=0),UNIQUE(district,slot));
 CREATE TABLE IF NOT EXISTS guild_castle_contributions(guild_id TEXT NOT NULL REFERENCES guild_castles(guild_id) ON DELETE CASCADE,player_id TEXT NOT NULL,essence INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(guild_id,player_id));
 CREATE TABLE IF NOT EXISTS guild_castle_guests(guild_id TEXT NOT NULL REFERENCES guild_castles(guild_id) ON DELETE CASCADE,player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,invited_by TEXT NOT NULL,expires_at INTEGER NOT NULL,PRIMARY KEY(guild_id,player_id));
 CREATE INDEX IF NOT EXISTS guild_castle_guest_player ON guild_castle_guests(player_id,expires_at);
 CREATE TABLE IF NOT EXISTS guild_castle_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,action TEXT NOT NULL,payload TEXT NOT NULL,result TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));
 `);}
function createGuildVillage(db,{now=Date.now,dungeonLocked=()=>false}={}){
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(e){db.exec('ROLLBACK');throw e;}};
 const settings=()=>db.prepare('SELECT * FROM guild_village_settings WHERE id=1').get();
 const player=id=>db.prepare('SELECT * FROM players WHERE id=?').get(id);
 const guild=id=>db.prepare('SELECT g.* FROM guild_members m JOIN guilds g ON g.id=m.guild_id WHERE m.player_id=?').get(id);
 const castle=id=>db.prepare('SELECT c.*,g.name,g.leader_id,g.wars_won,g.monster_kills,g.created_at FROM guild_castles c JOIN guilds g ON g.id=c.guild_id WHERE c.guild_id=?').get(id);
 const allowed=(id,gid)=>!!db.prepare(`SELECT 1 FROM guild_castles c WHERE c.guild_id=? AND (EXISTS(SELECT 1 FROM guild_members m WHERE m.guild_id=c.guild_id AND m.player_id=?) OR EXISTS(SELECT 1 FROM guild_castle_guests v WHERE v.guild_id=c.guild_id AND v.player_id=? AND v.expires_at>?))`).get(gid,id,id,Math.floor(now()/1000));
 const available=p=>!!p&&(!!settings().enabled||p.is_gm===1);
 const ready=p=>{if(!p||p.hp<=0||p.arena_match_id||p.combat_lock_until_ms>now()||p.root_until_ms>now()||p.stun_until_ms>now()||dungeonLocked(p.id)||db.prepare('SELECT 1 FROM pve_engagements WHERE player_id=? AND expires_at_ms>?').get(p.id,now())||db.prepare('SELECT 1 FROM arena_queue WHERE player_id=?').get(p.id))throw Error('Önce savaştan, arena sırasından veya zindandan ayrıl.');};
 function travel(p,area,point){ready(p);db.prepare(`UPDATE players SET area=?,x=?,y=?,last_seen=?,movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0 WHERE id=?`).run(area,point.x,point.y,Math.floor(now()/1000),now(),p.id);return {ok:true,area,...point,message:guildArea(area)?.kind==='hall'?'Lonca salonuna hoş geldin.':'Lonca Köyü’ne hoş geldin.'};}
 function repair(id){const p=player(id),a=guildArea(p?.area);if(!a)return null;
  if(available(p)&&(a.kind!=='hall'||allowed(id,a.guildId)))return null;
  const destination=available(p)?villageArea(1):'bazaar',point=destination==='bazaar'?{x:1200,y:920}:GUILD_VILLAGE_ENTRY;
  db.prepare(`UPDATE players SET area=?,x=?,y=?,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,motion_stream_id='',motion_sequence=0,movement_debt_ms=0,movement_checked_at_ms=?,hp_revision=hp_revision+1 WHERE id=?`).run(destination,point.x,point.y,now(),id);
  return {oldArea:p.area,channel:p.channel,playerId:id,area:destination,...point,hp:p.hp,maxHp:p.max_hp,hpRevision:p.hp_revision+1};
 }
 return {
 settings,repair,allowed,
 repairAll(){return db.prepare("SELECT id FROM players WHERE area GLOB 'guild_*'").all().map(p=>repair(p.id)).filter(Boolean);},
 deadline(id,area){const a=guildArea(area);if(a?.kind!=='hall')return Infinity;if(!allowed(id,a.guildId))return 0;return db.prepare('SELECT 1 FROM guild_members WHERE player_id=? AND guild_id=?').get(id,a.guildId)?Infinity:(db.prepare('SELECT expires_at FROM guild_castle_guests WHERE player_id=? AND guild_id=?').get(id,a.guildId)?.expires_at??0)*1000;},
 save(enabled,revision){if(typeof enabled!=='boolean')throw Error('Açılış ayarı geçersiz.');return tx(()=>{if(!db.prepare('UPDATE guild_village_settings SET enabled=?,revision=revision+1 WHERE id=1 AND revision=?').run(Number(enabled),revision).changes)throw Error('Ayar değişti. Paneli yenile.');return settings();});},
 snapshot(id,district){const p=player(id),g=guild(id),room=guildArea(p?.area),own=g?castle(g.id):null;
  district=district===undefined&&room?.kind==='village'?room.district:Math.max(1,Math.min(9999,Math.floor(Number(district)||own?.district||1)));
  const current=room?.kind==='hall'?castle(room.guildId):null,home=current??own;
  const maxDistrict=Math.min(9999,(db.prepare('SELECT COALESCE(MAX(district),0) n FROM guild_castles').get().n||1)+1);
  return {enabled:!!settings().enabled,available:available(p),serverTime:Math.floor(now()/1000),district,maxDistrict,cost:GUILD_CASTLE_COST,decor:GUILD_DECOR,
   guild:g?{id:g.id,name:g.name,leader:g.leader_id===id}:null,ownCastle:own??null,currentHall:current??null,
   wallet:p?{pearls:p.pearls,gems:p.gems,essence:p.essence}:null,
   plots:available(p)?GUILD_PLOTS.map(plot=>({...plot,castle:db.prepare('SELECT c.guild_id,c.decor_level,g.name FROM guild_castles c JOIN guilds g ON g.id=c.guild_id WHERE district=? AND slot=?').get(district,plot.slot)??null})):[],
   invitations:db.prepare('SELECT v.guild_id,v.expires_at,g.name FROM guild_castle_guests v JOIN guilds g ON g.id=v.guild_id WHERE v.player_id=? AND v.expires_at>?').all(id,Math.floor(now()/1000)),
   guests:own&&g?.leader_id===id?db.prepare('SELECT v.player_id,v.expires_at,p.name FROM guild_castle_guests v JOIN players p ON p.id=v.player_id WHERE v.guild_id=? AND v.expires_at>?').all(g.id,Math.floor(now()/1000)):[],
   contributions:home&&allowed(id,home.guild_id)?db.prepare('SELECT c.player_id,c.essence,p.name FROM guild_castle_contributions c LEFT JOIN players p ON p.id=c.player_id WHERE c.guild_id=? ORDER BY c.essence DESC LIMIT 40').all(home.guild_id):[],
  };
 },
 act(id,body){return tx(()=>{
  const p=player(id),g=guild(id),action=body.action;if(!available(p))throw Error('Lonca Köyü şu anda yönetici ön izlemesinde.');
  if(action==='village'){const district=Number(body.district??1),max=Math.min(9999,(db.prepare('SELECT COALESCE(MAX(district),0) n FROM guild_castles').get().n||1)+1);if(!Number.isInteger(district)||district<1||district>max)throw Error('Ada bölgesi geçersiz.');return travel(p,villageArea(district),GUILD_VILLAGE_ENTRY);}
  if(action==='hall'){const gid=String(body.guildId??g?.id??'');if(!allowed(id,gid))throw Error('Bu salon için lonca üyeliği veya geçerli misafir daveti gerekiyor.');return travel(p,hallArea(gid),GUILD_HALL_ENTRY);}
  if(!g)throw Error('Önce bir loncaya katıl.');
  const own=castle(g.id),leader=g.leader_id===id;
  if(['buy','invite','revoke','upgrade'].includes(action)&&!leader)throw Error('Bu işlemi yalnız lonca lideri yapabilir.');
  if(!['buy','donate','upgrade','invite','revoke'].includes(action))throw Error('İşlem geçersiz.');
  if(typeof body.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(body.requestId))throw Error('İşlem kimliği geçersiz.');
  const payload=JSON.stringify({guild:g.id,action,slot:body.slot,district:body.district,amount:body.amount,target:body.target,level:body.level});
  const receipt=db.prepare('SELECT * FROM guild_castle_receipts WHERE player_id=? AND request_id=?').get(id,body.requestId);
  if(receipt){if(receipt.payload!==payload)throw Error('İşlem kimliği başka istekte kullanıldı.');return JSON.parse(receipt.result);}
  let message='';
  if(action==='buy'){
   if(own)throw Error('Loncanın zaten bir şatosu var.');ready(p);const room=guildArea(p.area),slot=Number(body.slot),district=Number(body.district);
   if(room?.kind!=='village'||district!==room.district||!GUILD_PLOTS.some(p=>p.slot===slot))throw Error('Satın almak için seçtiğin ada bölgesine git.');
   if(db.prepare('SELECT 1 FROM guild_castles WHERE district=? AND slot=?').get(district,slot))throw Error('Bu şato başka bir lonca tarafından alınmış.');
   const {pearls,gems,essence}=GUILD_CASTLE_COST;
   if(!db.prepare('UPDATE players SET pearls=pearls-?,gems=gems-?,essence=essence-? WHERE id=? AND pearls>=? AND gems>=? AND essence>=?').run(pearls,gems,essence,id,pearls,gems,essence).changes)throw Error('50 inci, 50.000 mücevher ve 2.000 öz gerekiyor.');
   db.prepare('INSERT INTO guild_castles(guild_id,district,slot,purchased_by,purchased_at) VALUES(?,?,?,?,?)').run(g.id,district,slot,id,Math.floor(now()/1000));message='Şato loncanın oldu. Üyeler Lonca → Şatom bölümünden salona girebilir.';
  }else{
   if(!own)throw Error('Önce loncanız bir şato almalı.');
   if(action==='donate'){
    const amount=Number(body.amount),remaining=GUILD_DECOR.reduce((n,d)=>n+d.essence,0)-GUILD_DECOR.filter(d=>d.level<=own.decor_level).reduce((n,d)=>n+d.essence,0)-own.decor_essence;
    if(!Number.isSafeInteger(amount)||amount<1||amount>remaining)throw Error(`En fazla ${Math.max(0,remaining)} öz katkısı yapabilirsin.`);
    if(!db.prepare('UPDATE players SET essence=essence-? WHERE id=? AND essence>=?').run(amount,id,amount).changes)throw Error('Yeterli özün yok.');
    db.prepare('UPDATE guild_castles SET decor_essence=decor_essence+? WHERE guild_id=?').run(amount,g.id);
    db.prepare('INSERT INTO guild_castle_contributions(guild_id,player_id,essence) VALUES(?,?,?) ON CONFLICT(guild_id,player_id) DO UPDATE SET essence=essence+excluded.essence').run(g.id,id,amount);message='Katkın şatonun görsel gelişim kasasına eklendi.';
   }else if(action==='upgrade'){
    const next=GUILD_DECOR.find(d=>d.level===own.decor_level+1);if(!next||body.level!==next.level)throw Error('Geliştirme seviyesi değişti.');
    if(own.decor_essence<next.essence)throw Error('Görsel gelişim kasasında yeterli öz yok.');
    db.prepare('UPDATE guild_castles SET decor_level=decor_level+1,decor_essence=decor_essence-? WHERE guild_id=?').run(next.essence,g.id);message=next.name+' açıldı. Savaş gücü değişmez.';
   }else if(action==='invite'){
    const target=db.prepare('SELECT id FROM players WHERE name=? COLLATE NOCASE').get(String(body.target??'').trim());if(!target||target.id===id)throw Error('Davet edilecek oyuncuyu bulamadım.');
    if(db.prepare('SELECT 1 FROM guild_members WHERE player_id=? AND guild_id=?').get(target.id,g.id))throw Error('Bu oyuncu zaten loncanın üyesi; davetsiz girebilir.');
    if(db.prepare('SELECT COUNT(*) n FROM guild_castle_guests WHERE guild_id=? AND expires_at>?').get(g.id,Math.floor(now()/1000)).n>=10&&!db.prepare('SELECT 1 FROM guild_castle_guests WHERE guild_id=? AND player_id=? AND expires_at>?').get(g.id,target.id,Math.floor(now()/1000)))throw Error('Aynı anda en fazla 10 misafir daveti açık olabilir.');
    db.prepare('INSERT INTO guild_castle_guests(guild_id,player_id,invited_by,expires_at) VALUES(?,?,?,?) ON CONFLICT(guild_id,player_id) DO UPDATE SET invited_by=excluded.invited_by,expires_at=excluded.expires_at').run(g.id,target.id,id,Math.floor(now()/1000)+1800);message='30 dakikalık misafir daveti hazır. Oyuncu Lonca → Şatom bölümünden katılabilir.';
   }else{db.prepare('DELETE FROM guild_castle_guests WHERE guild_id=? AND player_id=?').run(g.id,String(body.target??''));message='Misafir daveti kaldırıldı.';}
  }
  const result={ok:true,message};db.prepare('INSERT INTO guild_castle_receipts VALUES(?,?,?,?,?,?)').run(id,body.requestId,action,payload,JSON.stringify(result),Math.floor(now()/1000));return result;
 });}
 };
}
return {ensureGuildVillageSchema,createGuildVillage};}
function statusModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const STATUS_FIELDS=module44.STATUS_FIELDS;
const defaultStatusConfig=module44.defaultStatusConfig;
const validateStatusConfig=module44.validateStatusConfig;
const statusBudget=module44.statusBudget;
const statusBonus=module44.statusBonus;
const validateStatusPoints=module44.validateStatusPoints;
function ensureStatusSchema(db){
 db.exec('BEGIN IMMEDIATE');try{
  const columns=new Set(db.prepare('PRAGMA table_info(players)').all().map(c=>c.name));
  for(const key of STATUS_FIELDS)if(!columns.has('stat_'+key))db.exec(`ALTER TABLE players ADD COLUMN stat_${key} INTEGER NOT NULL DEFAULT 0 CHECK(stat_${key} BETWEEN 0 AND 64)`);
  if(!columns.has('stat_revision'))db.exec('ALTER TABLE players ADD COLUMN stat_revision INTEGER NOT NULL DEFAULT 0');
  db.exec('CREATE TABLE IF NOT EXISTS status_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL)');
  db.prepare('INSERT OR IGNORE INTO status_settings(id,config_json) VALUES(1,?)').run(JSON.stringify(defaultStatusConfig()));
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
}
function createStatus(db,{refreshHp=id=>globalThis.__colPremium?.refreshHp(id),now=Date.now}={}){
 const player=db.prepare('SELECT * FROM players WHERE id=?'),setting=db.prepare('SELECT revision,config_json FROM status_settings WHERE id=1');
 const dungeon=db.prepare('SELECT 1 FROM dungeon_members WHERE player_id=? LIMIT 1');
 const update=db.prepare('UPDATE players SET stat_attack=?,stat_defense=?,stat_hp=?,stat_revision=stat_revision+1 WHERE id=? AND stat_revision=?');
 let current;const refresh=()=>{const s=setting.get();current={revision:s.revision,config:validateStatusConfig(JSON.parse(s.config_json))};return current;};refresh();
 const get=id=>{const p=player.get(id);if(!p)throw Error('Karakter bulunamadı.');return p;};
 const read=id=>{const p=get(id),points=Object.fromEntries(STATUS_FIELDS.map(k=>[k,p['stat_'+k]])),total=statusBudget(p.level);return {level:p.level,total,available:Math.max(0,total-points.attack-points.defense-points.hp),points,revision:p.stat_revision,settings:current};};
 const transact=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 return {read,refresh,settings:()=>current,bonus:(p,stat)=>statusBonus(p,stat,current.config),
  command(id,input){return transact(()=>{
   const p=get(id);if(!current.config.enabled)throw Error('Statü sistemi şu anda kapalı.');
   if(input?.action!=='status_allocate')throw Error('Geçersiz statü işlemi.');
   const points=validateStatusPoints(input.points,p.level);
   if(!Number.isSafeInteger(input.revision)||input.revision<0||input.settingsRevision!==current.revision)throw Error('Statü ayarları değişti. Paneli yeniden aç.');
   if(STATUS_FIELDS.every(k=>points[k]===p['stat_'+k]))return {ok:true,replayed:true,state:read(id)};
   if(input.revision!==p.stat_revision)throw Error('Puanların değişti. Paneli yeniden aç.');
   if(p.hp<=0||p.arena_match_id||p.combat_lock_until_ms>now()||dungeon.get(id))throw Error('Puan dağıtmak veya sıfırlamak için savaştan çıkmalısın.');
   if(!update.run(points.attack,points.defense,points.hp,id,p.stat_revision).changes)throw Error('Statü puanları değişti. Paneli yeniden aç.');
   refreshHp(id);return {ok:true,state:read(id)};
  });},
  save(input,revision){const config=validateStatusConfig(input),previous=current;try{return transact(()=>{
   if(!db.prepare('UPDATE status_settings SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(config),revision).changes)throw Error('Statü ayarları değişti. Paneli yenile.');
   refresh();if(config.enabled!==previous.config.enabled||config.hp!==previous.config.hp)for(const p of db.prepare('SELECT id FROM players WHERE stat_hp>0').all())refreshHp(p.id);
   return current;
  });}catch(e){current=previous;throw e;}}
 };
}
return {ensureStatusSchema,createStatus};}
function ranksModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const pumpkinSql499=module45.pumpkinSql499;
const arenaWingsOwned477=module46.arenaWingsOwned477;
const arenaWingsActive477=module46.arenaWingsActive477;
const grantArenaWings477=module46.grantArenaWings477;
const resumeArenaWings477=module46.resumeArenaWings477;
const projectArenaWingAppearance477=module46.projectArenaWingAppearance477;
const defaultRankConfig=module47.defaultRankConfig;
const validateRankConfig=module47.validateRankConfig;
const totalRankBonuses=module47.totalRankBonuses;
const rankRewardHpSql=module47.rankRewardHpSql;
const rankProgress=module47.rankProgress;
const rankThreshold=module47.rankThreshold;
const RANK_AREAS=module47.RANK_AREAS;
const RANK_REWARDS=module47.RANK_REWARDS;
const configSql="(SELECT config_json FROM rank_settings WHERE id=1)";
const rankBaseHpSql=`MAX(1,COALESCE((SELECT player_max_hp FROM combat_settings WHERE id=1),100)
 + COALESCE((SELECT SUM(CAST(json_extract(value,'$.hp') AS INTEGER)) FROM json_each(${configSql},'$.tiers') WHERE CAST(key AS INTEGER)<players.rank_tier AND players.level>=65),0)
 + ${rankRewardHpSql()}
 + MIN(3000000,MAX(0,COALESCE((SELECT SUM(MIN(1000000,MAX(0,CAST(json_extract(e.value,'$.value') AS INTEGER)))) FROM player_items i,json_each(CASE WHEN json_valid(i.enchantments) THEN i.enchantments ELSE '[]' END) e WHERE i.player_id=players.id AND i.equipped=1 AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') AND json_extract(e.value,'$.kind')='hp'),0)))
 + CASE WHEN EXISTS(SELECT 1 FROM player_pets WHERE player_id=players.id AND kind='starter' AND equipped=1 AND acquired_at+259200>unixepoch()) THEN 350 ELSE 0 END)`;
const eligibleSql=RANK_AREAS.map(([area])=>`rank_${area}>=CAST(json_extract(${configSql},'$.requirements.${area}') AS INTEGER)`).join(' AND ');
const unlockSql=`UPDATE players SET rank_unlocked=COALESCE((SELECT json_group_array(reward) FROM (SELECT value AS reward FROM json_each(players.rank_unlocked) UNION SELECT json_extract(value,'$.reward') AS reward FROM json_each(${configSql},'$.tiers') WHERE CAST(key AS INTEGER)<players.rank_tier AND json_extract(value,'$.reward')!='')),'[]') WHERE id=NEW.id;`;
function rankMaxHpSql(db){return db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='guild_skills'").get()?`(${rankBaseHpSql}+COALESCE((SELECT CASE s.active_level WHEN 1 THEN 250 WHEN 2 THEN 350 WHEN 3 THEN 500 ELSE 0 END FROM guild_skills s JOIN guild_members m ON m.guild_id=s.guild_id WHERE m.player_id=players.id AND s.active_until>unixepoch()*1000),0))`:rankBaseHpSql;}
function ensureRankSchema(db){
 const hpBase='('+rankMaxHpSql(db)+(db.prepare('PRAGMA table_info(players)').all().some(c=>c.name==='ration_until')?'+CASE WHEN players.ration_until>unixepoch()*1000 THEN 200 ELSE 0 END':'')+(db.prepare('PRAGMA table_info(players)').all().some(c=>c.name==='set_hp')?'+players.set_hp':'')+(db.prepare('PRAGMA table_info(players)').all().some(c=>c.name==='pumpkin_enabled499')?'+CASE WHEN '+pumpkinSql499()+' THEN 1000 ELSE 0 END':'')+')';const hpSql='MAX(1,CAST(ROUND('+hpBase+'*'+"(1+CASE WHEN players.level>=65 AND players.rank_tier>0 THEN players.rune_hp_level*COALESCE((SELECT json_extract(config_json,'$.bonusPerLevel') FROM rune_settings WHERE id=1),0.2)/100.0 ELSE 0 END)"+') AS INTEGER))';
 db.exec('BEGIN IMMEDIATE');try{
  db.exec(`CREATE TABLE IF NOT EXISTS rank_settings(id INTEGER PRIMARY KEY CHECK(id=1),config_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1)`);
  db.prepare('INSERT OR IGNORE INTO rank_settings(id,config_json) VALUES(1,?)').run(JSON.stringify(defaultRankConfig()));
  const cols=new Set(db.prepare('PRAGMA table_info(players)').all().map(r=>r.name));
  for(const key of ['rank_tier','rank_xp','rank_started_at',...RANK_AREAS.map(([a])=>`rank_${a}`)])if(!cols.has(key))db.exec(`ALTER TABLE players ADD COLUMN ${key} INTEGER NOT NULL DEFAULT 0`);
  for(const [key,def] of [['rank_cosmetics','{}'],['rank_unlocked','[]']])if(!cols.has(key))db.exec(`ALTER TABLE players ADD COLUMN ${key} TEXT NOT NULL DEFAULT '${def}'`);
  db.exec(`UPDATE players SET rank_started_at=unixepoch() WHERE level>=65 AND rank_started_at=0;
   CREATE INDEX IF NOT EXISTS idx_players_rank ON players(rank_tier DESC,rank_xp DESC,id) WHERE rank_tier>0;
   CREATE TRIGGER IF NOT EXISTS rank_level_entry AFTER UPDATE OF level ON players WHEN NEW.level>=65 AND NEW.rank_started_at=0 BEGIN UPDATE players SET rank_started_at=unixepoch() WHERE id=NEW.id; END;
   CREATE TRIGGER IF NOT EXISTS rank_level_reset AFTER UPDATE OF level ON players WHEN NEW.level<65 AND OLD.level>=65 BEGIN UPDATE players SET rank_tier=0,rank_xp=0,rank_started_at=0,rank_forest=0,rank_frozen=0,rank_black=0,rank_ancient=0,rank_cosmetics='{}' WHERE id=NEW.id; END;
   CREATE TRIGGER IF NOT EXISTS rank_normal_kill AFTER INSERT ON normal_reward_claims
   WHEN EXISTS(SELECT 1 FROM players p JOIN monsters m ON m.id=NEW.monster_id JOIN normal_defeats d ON d.monster_id=NEW.monster_id AND d.spawn_round=NEW.spawn_round WHERE p.id=NEW.player_id AND p.level>=65 AND p.rank_tier=0 AND d.defeated_at>=p.rank_started_at AND m.is_boss=0 AND m.is_stone=0 AND m.summoned=0 AND m.variant NOT IN ('frost_boss','frost_water','ancient_boss') AND m.area IN ('forest','frozen','black','ancient'))
   BEGIN UPDATE players SET ${RANK_AREAS.map(([a])=>`rank_${a}=MIN(100000,rank_${a}+CASE WHEN (SELECT area FROM monsters WHERE id=NEW.monster_id)='${a}' THEN 1 ELSE 0 END)`).join(',')} WHERE id=NEW.player_id; END;
   CREATE TRIGGER IF NOT EXISTS rank_quest_complete AFTER UPDATE OF rank_forest,rank_frozen,rank_black,rank_ancient ON players WHEN NEW.level>=65 AND NEW.rank_tier=0 AND ${eligibleSql.replace(/\brank_(forest|frozen|black|ancient)\b/g,'NEW.rank_$1')}
   BEGIN UPDATE players SET rank_tier=1,rank_xp=0 WHERE id=NEW.id; END;
   DROP TRIGGER IF EXISTS rank_xp_advance;
   CREATE TRIGGER rank_xp_advance AFTER UPDATE OF rank_xp ON players WHEN NEW.level>=65 AND NEW.rank_tier>0 AND NEW.rank_xp>OLD.rank_xp
   BEGIN UPDATE players SET rank_tier=MAX(rank_tier,COALESCE((SELECT MAX(tier) FROM (SELECT CAST(key AS INTEGER)+1 AS tier,SUM(CAST(json_extract(value,'$.xp') AS INTEGER)) OVER(ORDER BY CAST(key AS INTEGER)) AS threshold FROM json_each(${configSql},'$.tiers')) WHERE threshold<=NEW.rank_xp),1)) WHERE id=NEW.id; END;
   DROP TRIGGER IF EXISTS rank_tier_changed;
   CREATE TRIGGER rank_tier_changed AFTER UPDATE OF rank_tier ON players WHEN NEW.rank_tier!=OLD.rank_tier
   BEGIN ${unlockSql} UPDATE players SET max_hp=${hpSql},hp=MIN(hp,${hpSql}),hp_revision=hp_revision+1 WHERE id=NEW.id; END;`);
  db.exec(`DROP TRIGGER IF EXISTS rank_reward_equipment_changed;
   CREATE TRIGGER rank_reward_equipment_changed AFTER UPDATE OF rank_cosmetics,rank_unlocked ON players
   WHEN NEW.rank_cosmetics!=OLD.rank_cosmetics OR NEW.rank_unlocked!=OLD.rank_unlocked
   BEGIN UPDATE players SET max_hp=${hpSql},hp=MIN(hp,${hpSql}),hp_revision=hp_revision+1 WHERE id=NEW.id; END;
   UPDATE players SET max_hp=${hpSql},hp=MIN(hp,${hpSql}),hp_revision=hp_revision+1
   WHERE rank_tier>0 AND max_hp!=${hpSql};`);
  db.exec(`WITH thresholds505 AS MATERIALIZED (
    SELECT CAST(key AS INTEGER)+1 AS tier,
      SUM(CAST(json_extract(value,'$.xp') AS INTEGER)) OVER(ORDER BY CAST(key AS INTEGER)) AS threshold
    FROM json_each(${configSql},'$.tiers'))
   UPDATE players SET rank_tier=(SELECT MAX(tier) FROM thresholds505 WHERE threshold<=players.rank_xp)
   WHERE level>=65 AND rank_tier BETWEEN 1 AND 17
     AND EXISTS(SELECT 1 FROM thresholds505 WHERE tier>players.rank_tier AND threshold<=players.rank_xp);`);
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}
function createRanks(db){
 const hpBase='('+rankMaxHpSql(db)+(db.prepare('PRAGMA table_info(players)').all().some(c=>c.name==='ration_until')?'+CASE WHEN players.ration_until>unixepoch()*1000 THEN 200 ELSE 0 END':'')+(db.prepare('PRAGMA table_info(players)').all().some(c=>c.name==='set_hp')?'+players.set_hp':'')+(db.prepare('PRAGMA table_info(players)').all().some(c=>c.name==='pumpkin_enabled499')?'+CASE WHEN '+pumpkinSql499()+' THEN 1000 ELSE 0 END':'')+')';const hpSql='MAX(1,CAST(ROUND('+hpBase+'*'+"(1+CASE WHEN players.level>=65 AND players.rank_tier>0 THEN players.rune_hp_level*COALESCE((SELECT json_extract(config_json,'$.bonusPerLevel') FROM rune_settings WHERE id=1),0.2)/100.0 ELSE 0 END)"+') AS INTEGER))';
 let cached;
 const settings=()=>{if(!cached){const row=db.prepare('SELECT * FROM rank_settings WHERE id=1').get();cached={config:validateRankConfig(JSON.parse(row.config_json)),revision:row.revision};}return cached;};
 const fields='id,loadlab_run_id,level,arena_wings_equipped,arena_wings_expires_at_ms,rune_attack_level,rune_defense_level,rune_hp_level,rank_tier,rank_xp,rank_forest,rank_frozen,rank_black,rank_ancient,rank_cosmetics,rank_unlocked';
 const get=id=>{const p=db.prepare(`SELECT ${fields} FROM players WHERE id=?`).get(id);if(!p)throw new Error('Karakter bulunamadı.');return p;};
 const info=(p,privateState=true)=>{const tier=p.level>=65?p.rank_tier:0;return {tier,arenaWings:arenaWingsActive477(p),bonuses:totalRankBonuses(p,settings().config),cosmetics:tier?JSON.parse(p.rank_cosmetics):{},...(privateState?{xp:p.rank_xp,kills:Object.fromEntries(RANK_AREAS.map(([a])=>[a,p[`rank_${a}`]])),unlocked:JSON.parse(p.rank_unlocked)}:{})};};
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 return {
  settings,
  read(id){return {...info(get(id)),...settings()};},
  appearance(id){return info(get(id),false);},
  grant(id,tier,expectedTier,actor){return transaction(()=>{
   if(!Number.isSafeInteger(tier)||tier<1||tier>18)throw new Error('1–18 arasında bir rütbe kademesi seç.');
   if(typeof actor!=='string'||!actor.trim())throw new Error('Yönetici kimliği gerekli.');
   const p=get(id);
   if(p.level<65)throw new Error('Rütbe vermek için oyuncu 65. seviyede olmalı.');
   if(!Number.isSafeInteger(expectedTier)||expectedTier!==p.rank_tier)throw new Error('Oyuncunun rütbesi değişti. Paneli yenileyip tekrar dene.');
   if(tier===p.rank_tier)return info(p);
   const xp=rankThreshold(tier,settings().config);
   db.prepare('UPDATE players SET rank_tier=?,rank_xp=? WHERE id=?').run(tier,xp,id);
   db.prepare("INSERT INTO admin_audit_events(id,admin_account_id,action,target_account_id,detail_json,created_at_ms) SELECT ?,?,'grant_rank',COALESCE(account_id,''),?,? FROM players WHERE id=?").run(crypto.randomUUID(),actor.slice(0,160),JSON.stringify({playerId:id,previousTier:p.rank_tier,tier,previousXp:p.rank_xp,xp}),Date.now(),id);
   return info(get(id));
  });},
  bonuses(id){const p=db.prepare('SELECT level,rank_tier,rank_unlocked,rank_cosmetics FROM players WHERE id=?').get(id);return totalRankBonuses(p,settings().config);},
  project(rows,ownerId){if(!rows.length)return rows;const states=new Map(db.prepare(`SELECT ${fields} FROM players WHERE id IN (${rows.map(()=>'?').join(',')})`).all(...rows.map(p=>p.id)).map(p=>[p.id,p]));return rows.map(p=>{const rank=states.has(p.id)?info(states.get(p.id),p.id===ownerId):null;return {...p,...(p.id===ownerId&&states.has(p.id)?Object.fromEntries(['rune_attack_level','rune_defense_level','rune_hp_level'].map(k=>[k,states.get(p.id)[k]])):{}),...(p.equipped_armor_power!==undefined?{equipped_armor_power:p.equipped_armor_power+(rank?.bonuses.defense??0)}:{}),...(p.strong_players!==undefined?{strong_players:p.strong_players+(rank?.bonuses.pvp??0)}:{}),rank};});},
  equip(id,slot,reward){return transaction(()=>{const p=get(id),unlocked=JSON.parse(p.rank_unlocked);if(p.level<65||p.rank_tier<1)throw new Error('Önce Savaşçının Yolu görevini tamamla.');if(!['weapon','cape','companion','wings','costume'].includes(slot)||typeof reward!=='string'||reward&&(!unlocked.includes(reward)||!RANK_REWARDS.some(r=>r.id===reward&&r.slot===slot)))throw new Error('Bu görünüm henüz açılmadı.');const selected={...JSON.parse(p.rank_cosmetics),[slot]:reward};db.prepare('UPDATE players SET rank_cosmetics=? WHERE id=?').run(JSON.stringify(selected),id);return info(get(id));});},
  ranking(id){const rows=db.prepare('SELECT id,name,rank_tier AS tier,rank_xp AS xp FROM players WHERE rank_tier>0 AND level>=65 AND is_gm=0 AND loadlab_run_id=\'\' ORDER BY rank_tier DESC,rank_xp DESC,id LIMIT 20').all();const p=get(id);const position=p.loadlab_run_id===''&&p.rank_tier>0?db.prepare('SELECT COUNT(*)+1 AS position FROM players WHERE rank_tier>0 AND level>=65 AND is_gm=0 AND loadlab_run_id=\'\' AND (rank_tier>? OR(rank_tier=? AND (rank_xp>? OR(rank_xp=? AND id<?))))').get(p.rank_tier,p.rank_tier,p.rank_xp,p.rank_xp,id).position:null;return {rows,position};},
  save(input,revision){const next=validateRankConfig(input),old=settings();if(revision!==old.revision)throw new Error('Ayarlar başka bir oturumda değişti. Güncel tabloyu yükle.');try{return transaction(()=>{
   const changed=db.prepare('UPDATE rank_settings SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(next),revision);if(!changed.changes)throw new Error('Ayarlar değişti; yeniden yükle.');
   for(const p of db.prepare('SELECT id,rank_tier,rank_xp FROM players WHERE rank_tier>0').all()){
    const progress=rankProgress(p.rank_tier,p.rank_xp,old.config),cost=next.tiers[p.rank_tier]?.xp??0;
    const xp=rankThreshold(p.rank_tier,next)+(p.rank_tier>=18?Math.max(0,p.rank_xp-rankThreshold(18,old.config)):Math.min(cost-1,Math.floor(progress.earned/Math.max(1,progress.cost)*cost)));
    db.prepare('UPDATE players SET rank_xp=? WHERE id=?').run(xp,p.id);
   }
   db.exec(`UPDATE players SET rank_forest=rank_forest WHERE level>=65 AND rank_tier=0;
    UPDATE players SET max_hp=${hpSql},hp=MIN(hp,${hpSql}),hp_revision=hp_revision+1 WHERE rank_tier>0;
    UPDATE players SET rank_unlocked=COALESCE((SELECT json_group_array(reward) FROM (SELECT value AS reward FROM json_each(players.rank_unlocked) UNION SELECT json_extract(value,'$.reward') FROM json_each(${configSql},'$.tiers') WHERE CAST(key AS INTEGER)<players.rank_tier AND json_extract(value,'$.reward')!='')),'[]') WHERE rank_tier>0;`);
   cached={config:next,revision:revision+1};return cached;
  });}catch(e){cached=undefined;throw e;}}
 };
}
return {ensureRankSchema,createRanks};}
function progressionModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const SOLO_DEFAULTS=module48.SOLO_DEFAULTS;
const validateSoloConfig=module48.validateSoloConfig;
const UPGRADE_MATERIAL_DEFAULTS=module49.UPGRADE_MATERIAL_DEFAULTS;
const validateMaterialDrops=module49.validateMaterialDrops;
function ensureProgressionSchema(db){
 db.exec(`CREATE TABLE IF NOT EXISTS progression_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,solo_json TEXT NOT NULL,materials_json TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS solo_daily_entries(player_id TEXT PRIMARY KEY,day INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0 CHECK(used>=0));
 CREATE TABLE IF NOT EXISTS solo_entry_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,run_id TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));
 CREATE INDEX IF NOT EXISTS solo_entry_receipts_created ON solo_entry_receipts(created_at);
 CREATE TABLE IF NOT EXISTS solo_key_crafts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,result TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));
 CREATE INDEX IF NOT EXISTS solo_key_crafts_created ON solo_key_crafts(created_at);`);
 db.prepare('INSERT OR IGNORE INTO progression_settings(id,solo_json,materials_json) VALUES(1,?,?)').run(JSON.stringify(SOLO_DEFAULTS),JSON.stringify(UPGRADE_MATERIAL_DEFAULTS));
}
function createProgressionSettings(db){
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
return {ensureProgressionSchema,createProgressionSettings};}
function premiumModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const TRADE_GLASS_DURATION499=module50.TRADE_GLASS_DURATION499;
const toggleItemLock499=module51.toggleItemLock499;
const PUMPKIN_DURATION499=module52.PUMPKIN_DURATION499;
const pumpkinActive499=module52.pumpkinActive499;
const readWheelSettings483=module53.readWheelSettings483;
const saveWheelSettings483=module53.saveWheelSettings483;
const wheelRewardAt483=module53.wheelRewardAt483;
const isCoupon483=dependencies[0].isCoupon483;
const mintCoupon483=dependencies[0].mintCoupon483;
const redeemCoupon483=dependencies[0].redeemCoupon483;
const deferDatabaseBackgroundTask=module54.deferDatabaseBackgroundTask;
const rollEnchantmentValue=module55.rollEnchantmentValue;
const COSMETIC_DURATION_MS=module56.COSMETIC_DURATION_MS;
const EXTRA_PRODUCTS=module56.EXTRA_PRODUCTS;
const EXTRA_COLUMNS=module56.EXTRA_COLUMNS;
const TALISMAN_COLORS=module56.TALISMAN_COLORS;
const extraBuff=module57.extraBuff;
const useExtra=module57.useExtra;
const tradePremium=module58.tradePremium;
const premiumListings=module58.premiumListings;
const hasForbiddenCharacterName=module59.hasForbiddenCharacterName;
const parseMarketPrices=module60.parseMarketPrices;
const marketPrice=module60.marketPrice;
const validateMarketPrices=module60.validateMarketPrices;
const randomUUID=uuid;
const randomInt=integer;
const COSTUMES=module62.COSTUMES;
const PREMIUM_ITEMS=module62.PREMIUM_ITEMS;
const SUPPORT_DURATION_DAYS=module62.SUPPORT_DURATION_DAYS;
const WHEEL_PRICE=module62.WHEEL_PRICE;
const WHEEL_VERSION=module62.WHEEL_VERSION;
const WHEEL_REWARDS=module62.WHEEL_REWARDS;
const wheelRewardAt=module62.wheelRewardAt;
const afkDay=module63.afkDay;
const SPECIALIZATION_RESET463=module64.SPECIALIZATION_RESET463;
const GEAR=['weapon','armor','helmet','shoes','necklace','earring','bracelet'];
function rerollEnchants(raw,kind,cfg,random=Math.random,mode="reroll"){
 const old=JSON.parse(raw||'[]');if(!Array.isArray(old))throw new Error('Efsun verisi geçersiz.');
 const kept=old.filter(e=>String(e.kind).startsWith('stone_')||String(e.kind).startsWith('evolution_'));
 const count=old.filter(e=>!String(e.kind).startsWith('stone_')&&!String(e.kind).startsWith('evolution_')).length;
 if(mode==='reroll'&&!count)throw new Error('Bu eşyada değiştirilecek efsun yok.');
 if(mode==='add'&&count>=4)throw new Error('Normal artırma en fazla 4 efsuna kadar kullanılabilir.');
 if(mode==='fifth'&&count!==4)throw new Error('Beşinci Efsun Nesnesi yalnız 4 efsunlu ekipmanda kullanılabilir.');
 if(count>5)throw new Error('Efsun sayısı geçersiz.');
 const allowed=kind==='weapon'?['forest_power','frozen_power','fire','ice','strong_players','critical','attack_speed','cast_speed','life_steal']:['sword_defense','arrow_defense','magic_defense','strong_players','resistant_players','critical','hp',...(['armor','necklace'].includes(kind)?['forest_power','frozen_power','cast_speed']:[]),...(['armor','helmet'].includes(kind)?['attack_block','life_steal']:[])];
 const adding=mode!=='reroll';
 const pool=allowed.filter(k=>!(kind==='armor'&&k==='critical')&&Number(cfg['enchant_'+k+'_weight']??1)>0&&(!adding||!old.some(e=>e.kind===k)));if(pool.length<(adding?1:count))throw new Error('Yönetici efsun oranlarında yeterli seçenek açık değil.');
 const resultCount=adding?1:count;
 const next=[];
 for(let i=0;i<resultCount;i++){
  const sum=pool.reduce((n,k)=>n+Number(cfg['enchant_'+k+'_weight']??1),0);let roll=random()*sum,index=pool.length-1;
  for(let j=0;j<pool.length;j++){roll-=Number(cfg['enchant_'+pool[j]+'_weight']??1);if(roll<0){index=j;break;}}
  const k=pool.splice(index,1)[0];let value;
  value=rollEnchantmentValue(cfg,k,random);
  next.push({kind:k,value});
 }
 return JSON.stringify(adding?[...old,...next]:[...next,...kept]);
}
function addEnchantment(raw,kind,cfg,fifth=false,random=Math.random){return rerollEnchants(raw,kind,cfg,random,fifth?'fifth':'add');}
class PremiumEngine{
 constructor(db,{now=Date.now,wheelRandom=randomInt}={}){this.db=db;this.now=now;this.wheelRandom=wheelRandom;this.hasPets=!!db.prepare("SELECT 1 FROM sqlite_master WHERE name='player_pets'").get();this.hasStorage=!!db.prepare("SELECT 1 FROM sqlite_master WHERE name='player_storage_items'").get();}
 buff(id){
  // Reuse the query plan, never player state: every hit reads current timers and
  // applies the current clock, including expiry without a cleanup sweep.
  this.buffStatement??=this.db.prepare('SELECT pumpkin_until499,pumpkin_enabled499,arena_wings_equipped,arena_wings_expires_at_ms,ration_until,radiant_enabled,radiant_until,essence_until FROM players WHERE id=?');
  return extraBuff(this.buffStatement.get(id),this.now());
 }
 project(rows,ownerId){if(!rows.length)return rows;const ids=rows.map(p=>p.id);const data=new Map(this.db.prepare(`SELECT id,${EXTRA_COLUMNS.join(',')} FROM players WHERE id IN(${ids.map(()=>'?').join(',')})`).all(...ids).map(p=>[p.id,p]));const weapons=new Map(this.db.prepare(`SELECT player_id,enchantments FROM player_items WHERE equipped=1 AND kind='weapon' AND player_id IN(${ids.map(()=>'?').join(',')})`).all(...ids).map(i=>[i.player_id,JSON.parse(i.enchantments||'[]')]));return rows.map(p=>({...p,...(p.id===ownerId?data.get(p.id):{}),premiumBuff:extraBuff(data.get(p.id),this.now()),talismanColor:weapons.get(p.id)?.find(e=>e.kind==='stone_talisman_color')?.value??0}));}
 wheelSettings483(){return readWheelSettings483(this.db);}
 setWheelChances483(chances,revision){return saveWheelSettings483(this.db,chances,revision);}
 wheelStatus(id){const row=this.db.prepare("SELECT result FROM premium_receipts WHERE player_id=? AND action='wheel_spin' ORDER BY created_at_ms DESC,rowid DESC LIMIT 1").get(id);return row?JSON.parse(row.result).wheel:null;}
 forestPolicy(){return this.db.prepare('SELECT forest_after_level,forest_reduction_percent FROM premium_shop_settings WHERE id=1').get();}
 setForestPolicy(value,expected){if(!value||!Number.isInteger(value.forest_after_level)||value.forest_after_level<0||value.forest_after_level>50||!Number.isInteger(value.forest_reduction_percent)||value.forest_reduction_percent<0||value.forest_reduction_percent>100)throw new Error('Seviye 0–50, azaltma %0–100 arasında tam sayı olmalı.');const old=this.forestPolicy();if(expected&&(expected.forest_after_level!==old.forest_after_level||expected.forest_reduction_percent!==old.forest_reduction_percent))throw new Error('Ayarlar değişti. Paneli yenileyip tekrar dene.');this.db.prepare('UPDATE premium_shop_settings SET forest_after_level=?,forest_reduction_percent=? WHERE id=1').run(value.forest_after_level,value.forest_reduction_percent);}
 prices(){return parseMarketPrices(this.db.prepare('SELECT prices_json FROM premium_shop_settings WHERE id=1').get()?.prices_json);}
 setPrices(value,expected){const next=JSON.stringify(validateMarketPrices(value));if(expected!==undefined&&JSON.stringify(this.prices())!==JSON.stringify(parseMarketPrices(expected)))throw new Error('Fiyatlar başka oturumda değişti. Sayfayı yenile.');this.db.prepare('UPDATE premium_shop_settings SET prices_json=? WHERE id=1').run(next);return this.prices();}
 expire(id){
  if(id!==undefined)return this.expireOwner(id);
  const now=this.now(),expired=[];
  for(const row of this.db.prepare('UPDATE players SET pumpkin_enabled499=0 WHERE pumpkin_enabled499=1 AND pumpkin_until499<=? RETURNING id AS player_id').all(now)){this.refreshHp(row.player_id);expired.push(row);}
  for(const p of this.db.prepare('UPDATE players SET ration_until=0 WHERE ration_until>0 AND ration_until<=? RETURNING id').all(now))this.refreshHp(p.id);
  const expiredPets=this.hasPets?this.db.prepare("UPDATE player_pets SET equipped=0 WHERE kind='starter' AND equipped=1 AND acquired_at+259200<=? RETURNING player_id").all(Math.floor(now/1000)):[];
  for(const pet of expiredPets)this.refreshHp(pet.player_id);
  this.db.prepare('UPDATE players SET has_wings=0,wings_equipped=0 WHERE has_wings=1 AND wings_expires_at_ms>0 AND wings_expires_at_ms<=?').run(now);
  for(const row of this.db.prepare('UPDATE players SET arena_wings_owned=0,arena_wings_equipped=0 WHERE arena_wings_owned=1 AND arena_wings_expires_at_ms>0 AND arena_wings_expires_at_ms<=? RETURNING id AS player_id').all(now))expired.push(row);
  if(this.hasStorage)this.db.prepare("DELETE FROM player_storage_items WHERE kind='costume' AND expires_at_ms>0 AND expires_at_ms<=?").run(now);
  for(const product of ['weapon_skin','teleport_skin']){
   expired.push(...this.db.prepare(`SELECT id AS player_id FROM players WHERE ${product}_owned=1 AND ${product}_expires_at_ms>0 AND ${product}_expires_at_ms<=?`).all(now));
   this.db.prepare(`UPDATE players SET ${product}_owned=0,${product}_enabled=0 WHERE ${product}_owned=1 AND ${product}_expires_at_ms>0 AND ${product}_expires_at_ms<=?`).run(now);
   this.db.prepare("DELETE FROM premium_listings WHERE product=? AND json_extract(payload,'$.expires_at_ms')<=?").run(product,now);
  }
  const rows=this.db.prepare("SELECT DISTINCT player_id FROM player_items WHERE kind='costume' AND expires_at_ms>0 AND expires_at_ms<=?").all(now);
  this.db.prepare("DELETE FROM player_items WHERE kind='costume' AND expires_at_ms>0 AND expires_at_ms<=?").run(now);
  this.db.prepare("DELETE FROM premium_listings WHERE product='costume' AND json_extract(payload,'$.item.expires_at_ms')<=?").run(now);
  for(const r of rows)this.refreshHp(r.player_id);
  return [...new Set([...rows,...expired].map(r=>r.player_id))];
 }
 expireOwner(id){
  const now=this.now(),affected=new Set(),expired=new Set();
  // Cache query plans only. A fresh owner-scoped read must prove expiry is due
  // before taking the write lock; the guarded mutations below remain atomic.
  this.ownerExpiryChecks??=[
   ["SELECT 1 FROM players WHERE id=? AND ((pumpkin_enabled499=1 AND pumpkin_until499<=?) OR (ration_until>0 AND ration_until<=?) OR (has_wings=1 AND wings_expires_at_ms>0 AND wings_expires_at_ms<=?) OR (arena_wings_owned=1 AND arena_wings_expires_at_ms>0 AND arena_wings_expires_at_ms<=?) OR (weapon_skin_owned=1 AND weapon_skin_expires_at_ms>0 AND weapon_skin_expires_at_ms<=?) OR (teleport_skin_owned=1 AND teleport_skin_expires_at_ms>0 AND teleport_skin_expires_at_ms<=?))",6],
   ["SELECT 1 FROM player_items WHERE player_id=? AND kind='costume' AND expires_at_ms>0 AND expires_at_ms<=? LIMIT 1",1],
   ["SELECT 1 FROM premium_listings WHERE seller_id=? AND ((product IN ('weapon_skin','teleport_skin') AND json_extract(payload,'$.expires_at_ms')<=?) OR (product='costume' AND json_extract(payload,'$.item.expires_at_ms')<=?)) LIMIT 1",2],
   ...(this.hasStorage?[["SELECT 1 FROM player_storage_items WHERE player_id=? AND kind='costume' AND expires_at_ms>0 AND expires_at_ms<=? LIMIT 1",1]]:[]),
   ...(this.hasPets?[["SELECT 1 FROM player_pets WHERE player_id=? AND kind='starter' AND equipped=1 AND acquired_at+259200<=? LIMIT 1",1,true]]:[]),
  ].map(([sql,timers,seconds])=>({statement:this.db.prepare(sql),timers,seconds}));
  if(!this.ownerExpiryChecks.some(({statement,timers,seconds})=>statement.get(id,...Array(timers).fill(seconds?Math.floor(now/1000):now))))return [];
  this.db.exec('SAVEPOINT premium_owner_expiry');
  try{
   if(this.db.prepare('UPDATE players SET pumpkin_enabled499=0 WHERE id=? AND pumpkin_enabled499=1 AND pumpkin_until499<=?').run(id,now).changes){affected.add(id);expired.add(id);}
   if(this.db.prepare('UPDATE players SET ration_until=0 WHERE id=? AND ration_until>0 AND ration_until<=?').run(id,now).changes)affected.add(id);
   if(this.hasPets&&this.db.prepare("UPDATE player_pets SET equipped=0 WHERE player_id=? AND kind='starter' AND equipped=1 AND acquired_at+259200<=?").run(id,Math.floor(now/1000)).changes)affected.add(id);
   this.db.prepare('UPDATE players SET has_wings=0,wings_equipped=0 WHERE id=? AND has_wings=1 AND wings_expires_at_ms>0 AND wings_expires_at_ms<=?').run(id,now);
   if(this.db.prepare('UPDATE players SET arena_wings_owned=0,arena_wings_equipped=0 WHERE id=? AND arena_wings_owned=1 AND arena_wings_expires_at_ms>0 AND arena_wings_expires_at_ms<=?').run(id,now).changes)expired.add(id);
   if(this.hasStorage)this.db.prepare("DELETE FROM player_storage_items WHERE player_id=? AND kind='costume' AND expires_at_ms>0 AND expires_at_ms<=?").run(id,now);
   for(const product of ['weapon_skin','teleport_skin']){
    if(this.db.prepare(`UPDATE players SET ${product}_owned=0,${product}_enabled=0 WHERE id=? AND ${product}_owned=1 AND ${product}_expires_at_ms>0 AND ${product}_expires_at_ms<=?`).run(id,now).changes)expired.add(id);
    this.db.prepare("DELETE FROM premium_listings WHERE seller_id=? AND product=? AND json_extract(payload,'$.expires_at_ms')<=?").run(id,product,now);
   }
   if(this.db.prepare("DELETE FROM player_items WHERE player_id=? AND kind='costume' AND expires_at_ms>0 AND expires_at_ms<=?").run(id,now).changes){affected.add(id);expired.add(id);}
   this.db.prepare("DELETE FROM premium_listings WHERE seller_id=? AND product='costume' AND json_extract(payload,'$.item.expires_at_ms')<=?").run(id,now);
   for(const owner of affected)this.refreshHp(owner);
   this.db.exec('RELEASE premium_owner_expiry');
   return [...expired];
  }catch(error){this.db.exec('ROLLBACK TO premium_owner_expiry; RELEASE premium_owner_expiry');throw error;}
 }
 expireInBackground(available=()=>true,expireOwner=id=>this.expireOwner(id)){
  if(this.expirationJob)return this.expirationJob;
  this.expirationJob=deferDatabaseBackgroundTask(async()=>{
   if(!available())return;
   const now=this.now();
   // Indexed due-owner scans; bound both the backlog and work per I/O turn.
   const seen=new Set();
   const queries=[
    ['SELECT id FROM players WHERE pumpkin_enabled499=1 AND pumpkin_until499<=?',now],
    ['SELECT id FROM players WHERE ration_until>0 AND ration_until<=?',now],
    ['SELECT id FROM players WHERE has_wings=1 AND wings_expires_at_ms>0 AND wings_expires_at_ms<=?',now],
    ['SELECT id FROM players WHERE arena_wings_owned=1 AND arena_wings_expires_at_ms>0 AND arena_wings_expires_at_ms<=?',now],
    ...['weapon_skin','teleport_skin'].map(p=>[`SELECT id FROM players WHERE ${p}_owned=1 AND ${p}_expires_at_ms>0 AND ${p}_expires_at_ms<=?`,now]),
    ["SELECT player_id AS id FROM player_items WHERE kind='costume' AND expires_at_ms>0 AND expires_at_ms<=?",now],
    ["SELECT seller_id AS id FROM premium_listings WHERE product IN ('weapon_skin','teleport_skin') AND json_extract(payload,'$.expires_at_ms')<=?",now],
    ["SELECT seller_id AS id FROM premium_listings WHERE product='costume' AND json_extract(payload,'$.item.expires_at_ms')<=?",now],
    ...(this.hasStorage?[["SELECT player_id AS id FROM player_storage_items WHERE kind='costume' AND expires_at_ms>0 AND expires_at_ms<=?",now]]:[]),
    ...(this.hasPets?[["SELECT player_id AS id FROM player_pets WHERE kind='starter' AND equipped=1 AND acquired_at+259200<=?",Math.floor(now/1000)]]:[]),
   ];
   for(const [sql,at] of queries){
    const owners=await deferDatabaseBackgroundTask(()=>available()?this.db.prepare(sql+' LIMIT 32').all(at):[]);
    for(const {id} of owners){if(seen.has(id))continue;seen.add(id);await deferDatabaseBackgroundTask(()=>{if(available())return expireOwner(id);});}
   }
  }).finally(()=>{this.expirationJob=null;});
  return this.expirationJob;
 }
 snapshot(id,sellerId499){this.expire(id);const p=this.db.prepare('SELECT role,item_link_orbs,core_coins,enchant_scrolls,enchant_add_scrolls,fifth_enchant_scrolls,afk_tickets,auto_potion_owned,auto_potion_enabled,auto_potion_remaining,auto_potion_total,stall_skin_owned,stall_skin_enabled,teleport_skin_owned,teleport_skin_enabled,teleport_skin_expires_at_ms,weapon_skin_owned,weapon_skin_enabled,weapon_skin_expires_at_ms,storage_pages,rename_scrolls,name FROM players WHERE id=?').get(id);if(!p)throw new Error('Karakter bulunamadı.');return {...p,...this.db.prepare(`SELECT ${EXTRA_COLUMNS.join(',')} FROM players WHERE id=?`).get(id),listings:premiumListings(this,sellerId499),prices:this.prices(),costume:this.db.prepare("SELECT * FROM player_items WHERE player_id=? AND kind='costume' AND role=? LIMIT 1").get(id,p.role)??null};}
 command(id,input){
  this.expire(id);this.db.exec('BEGIN IMMEDIATE');try{const result=this.execute(id,input);this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 execute(id,input){
  const p=this.db.prepare('SELECT * FROM players WHERE id=?').get(id);if(!p)throw new Error('Karakter gerekli.');
  const action=String(input.action??'');
  if(action==='guild_banner_set'||input.product==='guild_banner')throw new Error('Lonca Sancağı Paketi kaldırıldı.');
  if(!['item_lock499','pumpkin_toggle499','coupon_redeem','extra_use','radiant_toggle','talisman_craft','talisman_apply','guild_banner_set','wheel_spin','buy','afk_ticket_use','reroll','enchant_add','enchant_fifth','costume','auto_toggle','style_toggle','rename','market_list','market_buy','market_cancel'].includes(action))throw new Error('Geçersiz işlem.');
  const requestId=String(input.requestId??'');if(!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw new Error('İşlem kimliği gerekli.');
  if(/^cpc-(?:issue|spent|hold)-/.test(requestId))throw Error('İşlem kimliği ayrılmış bir alana ait.');
  const quantity=action==='buy'&&['enchant_scroll','enchant_add','item_link'].includes(input.product)?Number(input.quantity??1):1;
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>99)throw new Error('Adet 1–99 arasında tam sayı olmalı.');
  if(input.product==='item_link'&&action==='buy'&&![1,5,10].includes(quantity))throw new Error('1, 5 veya 10 adet seç.');
  const product=action==='item_lock499'?JSON.stringify([input.itemId,input.enabled]):action==='coupon_redeem'?String(input.itemId??''):['extra_use','radiant_toggle','talisman_craft','talisman_apply'].includes(action)?JSON.stringify([input.product,input.itemId,input.color,input.enabled]):action==='guild_banner_set'?JSON.stringify([input.guildId,input.color,input.emblem,input.pattern,input.enabled,input.revision]):action==='buy'&&input.product==='guild_banner'?JSON.stringify(['guild_banner',input.guildId]):action.startsWith('market_')?JSON.stringify([input.product,input.itemId,input.listingId,input.amount,input.price]):action==='buy'?String(input.product)+':'+quantity:['reroll','enchant_add','enchant_fifth'].includes(action)?String(input.itemId):action==='rename'?String(input.name):action==='style_toggle'?String(input.product)+':'+String(input.enabled):String(input.enabled);
  const old=this.db.prepare('SELECT * FROM premium_receipts WHERE id=?').get(requestId);if(old){if(old.player_id!==id||old.action!==action||old.product!==product)throw new Error('İşlem kimliği başka işlemde kullanılmış.');return JSON.parse(old.result);}
  if(p.hp<=0)throw new Error('Bu işlem için hayatta olmalısın.');
  if(this.db.prepare('SELECT 1 FROM dungeon_members WHERE player_id=?').get(id)&&action!=='auto_toggle')throw new Error('Alışveriş veya ekipman değişikliği için önce zindandan ayrıl.');
  let message='',wheel,changedItem;
  if(['item_lock499','pumpkin_toggle499','coupon_redeem','extra_use','radiant_toggle','talisman_craft','talisman_apply','guild_banner_set','costume','style_toggle','rename','reroll','enchant_add','enchant_fifth'].includes(action)&&(Number(p.combat_lock_until_ms)>this.now()||p.arena_match_id||['arena','war','black'].includes(p.area)))throw new Error('Bu işlem savaş dışında yapılabilir.');
  if(action==='item_lock499'){changedItem=toggleItemLock499(this,p,input);message=changedItem.sale_locked499?'Eşya kilitlendi; satılamaz veya ticaretle verilemez.':'Eşyanın satış kilidi kaldırıldı.';}
  else if(action==='pumpkin_toggle499'){
   if(input.enabled!==true&&input.enabled!==false)throw Error('Geçerli bir kuşanma seçimi gerekli.');
   if(!(p.pumpkin_until499>this.now()))throw Error('Bal Kabağı Şövalyesi setinin süresi dolmuş.');
   this.db.prepare('UPDATE players SET pumpkin_enabled499=?,radiant_enabled=CASE WHEN ?=1 THEN 0 ELSE radiant_enabled END,weapon_skin_enabled=CASE WHEN ?=1 THEN 0 ELSE weapon_skin_enabled END WHERE id=?').run(input.enabled?1:0,input.enabled?1:0,input.enabled?1:0,id);
   if(input.enabled)this.db.prepare("UPDATE player_items SET equipped=0 WHERE player_id=? AND kind='costume'").run(id);
   this.refreshHp(id);message=input.enabled?'Bal Kabağı Şövalyesi seti kuşanıldı.':'Bal Kabağı Şövalyesi seti çıkarıldı.';
  }
  else if(action==='coupon_redeem'){message=redeemCoupon483(this,p,input);}
  else if(['extra_use','radiant_toggle','talisman_craft','talisman_apply'].includes(action)){message=useExtra(this,p,input);}
  else if(action==='wheel_spin'){
   if(input.version!==WHEEL_VERSION||input.expectedPrice!==WHEEL_PRICE)throw new Error('Çark bilgisi değişti. Sayfayı yenile.');
   if(p.core_coins<WHEEL_PRICE)throw new Error('Çark için 15 ÇP gerekiyor.');
   const wheelConfig483=this.wheelSettings483();const reward=wheelRewardAt483(this.wheelRandom(10000),wheelConfig483.chances);
   this.db.prepare('UPDATE players SET core_coins=core_coins-? WHERE id=?').run(WHEEL_PRICE,id);
   const columns={pearl:'pearls',potion_1:'potions',potion_2:'potions',potion_3:'potions',essence_20:'essence',essence_50:'essence',gems_50:'gems',enchant_scroll:'enchant_scrolls'};
   const column=columns[reward.id];
   if(column){const protectedStock=['pearls','potions','essence','gems'].includes(column)?`,wheel_paid_${column}=wheel_paid_${column}+?`:'';this.db.prepare(`UPDATE players SET ${column}=${column}+?${protectedStock} WHERE id=?`).run(...(protectedStock?[reward.amount,reward.amount,id]:[reward.amount,id]));}
   else if(reward.id==='afk_ticket')this.db.prepare('UPDATE players SET afk_tickets=afk_tickets+1 WHERE id=?').run(id);
   else if(reward.id==='auto_potion')this.db.prepare('UPDATE players SET auto_potion_owned=1,auto_potion_remaining=MAX(0,auto_potion_remaining)+1000000,auto_potion_total=MAX(0,auto_potion_remaining)+1000000 WHERE id=?').run(id);
   else if(reward.id==='wings_3d')this.db.prepare('UPDATE players SET has_wings=1,wings_expires_at_ms=MAX(?,wings_expires_at_ms)+? WHERE id=?').run(this.now(),7*86400000,id);
   else if(reward.id==='bird'){
    const now=Math.floor(this.now()/1000);
    this.db.prepare("INSERT INTO player_pets(player_id,kind,equipped,acquired_at) VALUES(?,'bird',0,?) ON CONFLICT(player_id,kind) DO UPDATE SET acquired_at=MAX(?,player_pets.acquired_at+(CASE WHEN kind=char(115,116,97,114,116,101,114) THEN 259200 ELSE 604800 END))").run(id,now,now);
   }
   wheel={configRevision:wheelConfig483.revision,requestId,rewardId:reward.id,name:reward.name,amount:reward.amount,price:WHEEL_PRICE,version:WHEEL_VERSION,awardedAtMs:this.now()};
   message=reward.name+' kazandın! Ödül hesabına eklendi.';
  }
  else if(action.startsWith('market_')){message=tradePremium(this,p,input);}
  else if(action==='afk_ticket_use'){
   if(p.afk_tickets<1)throw new Error('Çantanda Oto Av Bileti yok.');
   const day=afkDay(this.now());
   this.db.prepare(`INSERT INTO afk_hunt_state(player_id,day,next_essence_at) VALUES(?,?,4+ABS(RANDOM()%3))
     ON CONFLICT(player_id) DO UPDATE SET day=excluded.day,used_ms=0,bonus_ms=0,active=0,tick_at_ms=0,
       kills_since_essence=0,next_essence_at=excluded.next_essence_at,last_reward_token=''
     WHERE afk_hunt_state.day<>excluded.day`).run(id,day);
   const applied=this.db.prepare('UPDATE afk_hunt_state SET bonus_ms=7200000 WHERE player_id=? AND day=? AND bonus_ms=0').run(id,day);
   if(applied.changes!==1)throw new Error('Bugün zaten bir Oto Av Bileti kullandın. Yarın tekrar kullanabilirsin.');
   this.db.prepare('UPDATE players SET afk_tickets=afk_tickets-1 WHERE id=? AND afk_tickets>0').run(id);
   message='Oto Av Bileti kullanıldı. Bugünkü toplam sınır 4 saat.';
  }
  else if(action==='buy'){
   const productKey=String(input.product);if(productKey==='trade_glass499'){if(input.quantity!==undefined&&input.quantity!==1)throw Error('Her satın almada bir Ticaret Camı alınabilir.');if(p.trade_glass_until_ms>this.now())throw Error('Ticaret Camı süren devam ediyor.');}if(productKey==='pumpkin_knight499'){if(input.quantity!==undefined&&input.quantity!==1)throw Error('Bir defada bir set alınabilir.');if(p.pumpkin_until499>this.now())throw Error('Bu setin süresi henüz dolmadı.');if(!['muhafiz','avci','arkanist'].includes(p.role))throw Error('Sınıf geçersiz.');}const item=productKey===SPECIALIZATION_RESET463.kind?SPECIALIZATION_RESET463:PREMIUM_ITEMS[productKey];if(!item)throw new Error('Ürün bulunamadı.');
   if(['stall_skin','teleport_skin','weapon_skin'].includes(productKey)&&p[productKey+'_owned'])throw new Error('Bu görünüme zaten sahipsin.');
   if(productKey==='wings'&&p.has_wings)throw new Error('Bu kanatlara zaten sahipsin.');
   if(productKey==='storage_page'&&p.storage_pages>=4)throw new Error('En fazla 4 ek depo sayfası açılabilir.');
   const charge=productKey===SPECIALIZATION_RESET463.kind?SPECIALIZATION_RESET463.coreCoins:marketPrice(this.prices(),productKey).amount;if(input.expectedPrice!==undefined&&input.expectedPrice!==charge)throw new Error('Fiyat değişti. Marketi yenileyip tekrar dene.');
   if(p.core_coins<charge*quantity)throw new Error('Yetersiz Çekirdek Parası.');
   if(productKey==='auto_potion'&&p.auto_potion_owned&&p.auto_potion_remaining>0)throw new Error('Oto iksire zaten sahipsin.');
   if(productKey==='costume'&&this.db.prepare("SELECT 1 FROM player_items WHERE player_id=? AND kind='costume' AND role=?").get(id,p.role))throw new Error('Bu giysiye zaten sahipsin.');
   if(productKey==='costume'&&!COSTUMES[p.role])throw new Error('Sınıf geçersiz.');
   this.db.prepare('UPDATE players SET core_coins=core_coins-? WHERE id=?').run(charge*quantity,id);
   if(productKey==='pumpkin_knight499')this.db.prepare('UPDATE players SET pumpkin_until499=?,pumpkin_enabled499=0 WHERE id=?').run(this.now()+PUMPKIN_DURATION499,id);
   if(productKey==='trade_glass499')this.db.prepare('UPDATE players SET trade_glass_until_ms=? WHERE id=?').run(this.now()+TRADE_GLASS_DURATION499,id);
   if(isCoupon483(productKey)){changedItem=mintCoupon483(this,p,productKey);}
   if(EXTRA_PRODUCTS[productKey])this.db.prepare(`UPDATE players SET ${EXTRA_PRODUCTS[productKey].stock}=${EXTRA_PRODUCTS[productKey].stock}+1 WHERE id=?`).run(id);
   if(productKey==='wings')this.db.prepare('UPDATE players SET has_wings=1,wings_expires_at_ms=? WHERE id=?').run(this.now()+7*86400000,id);
   if(['xp_ring','drop_charm'].includes(productKey)){
    const column=productKey+'_until',now=Math.floor(this.now()/1000);
    this.db.prepare(`UPDATE players SET ${column}=MAX(${column},?)+? WHERE id=?`).run(now,SUPPORT_DURATION_DAYS*86400,id);
   }
   if(productKey===SPECIALIZATION_RESET463.kind)this.db.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,1) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+1').run(id,SPECIALIZATION_RESET463.kind);
   if(productKey==='item_link')this.db.prepare('UPDATE players SET item_link_orbs=item_link_orbs+? WHERE id=?').run(quantity,id);
   if(productKey==='enchant_add')this.db.prepare('UPDATE players SET enchant_add_scrolls=enchant_add_scrolls+? WHERE id=?').run(quantity,id);
   if(productKey==='enchant_scroll')this.db.prepare('UPDATE players SET enchant_scrolls=enchant_scrolls+? WHERE id=?').run(quantity,id);
   if(['stall_skin','teleport_skin','weapon_skin'].includes(productKey))this.db.prepare(`UPDATE players SET ${productKey}_owned=1 WHERE id=?`).run(id);
   if(productKey==='teleport_skin')this.db.prepare('UPDATE players SET teleport_skin_expires_at_ms=?,teleport_skin_enabled=1 WHERE id=?').run(this.now()+COSMETIC_DURATION_MS,id);
   if(productKey==='weapon_skin')this.db.prepare('UPDATE players SET weapon_skin_expires_at_ms=? WHERE id=?').run(this.now()+COSMETIC_DURATION_MS,id);
   if(productKey==='storage_page')this.db.prepare('UPDATE players SET storage_pages=storage_pages+1 WHERE id=?').run(id);
   if(productKey==='rename_scroll')this.db.prepare('UPDATE players SET rename_scrolls=rename_scrolls+1 WHERE id=?').run(id);
   if(productKey==='auto_potion')this.db.prepare('UPDATE players SET auto_potion_owned=1,auto_potion_enabled=1,auto_potion_remaining=1000000,auto_potion_total=1000000 WHERE id=?').run(id);
   if(productKey==='afk_ticket')this.db.prepare('UPDATE players SET afk_tickets=afk_tickets+1 WHERE id=?').run(id);
   if(productKey==='costume')this.db.prepare(`INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at,expires_at_ms,premium_origin) VALUES(?,?,'costume',?,'unique',50,?,'[{"kind":"hp","value":500}]',0,?,?,1)`).run(randomUUID(),id,COSTUMES[p.role].name,p.role,Math.floor(this.now()/1000),this.now()+COSMETIC_DURATION_MS);
   message=item.name+' alındı.';
  }else if(action==='style_toggle'){
   const key=String(input.product);if(!['stall_skin','teleport_skin','weapon_skin'].includes(key)||!p[key+'_owned'])throw new Error('Bu görünüme sahip değilsin.');
   this.db.prepare(`UPDATE players SET ${key}_enabled=?${key==='weapon_skin'&&input.enabled===true?',pumpkin_enabled499=0':''} WHERE id=?`).run(input.enabled===true?1:0,id);if(key==='weapon_skin'&&input.enabled===true)this.refreshHp(id);message='Görünüm güncellendi.';
  }else if(action==='rename'){
   if(p.area!=='bazaar')throw new Error('İsim değiştirmek için Pazar Köyü’ne git.');
   if(p.rename_scrolls<1)throw new Error('İsim Değiştirme nesnen yok.');
   const name=String(input.name??'').normalize('NFKC').trim();
   if(name.length<2||name.length>18||!/^[\p{L}\p{N} _-]+$/u.test(name)||/^(gm|admin|moderator|yönetici)(?:$|[ _-])/iu.test(name))throw new Error('İsim 2–18 karakter olmalı; harf, sayı, boşluk, _ ve - kullanılabilir.');
   if(hasForbiddenCharacterName(name,this.db.prepare('SELECT word FROM blocked_words ORDER BY word LIMIT 500').all().map(r=>r.word)))throw new Error('Karakter adı küfür veya uygunsuz sözcük içeremez.');
   const nameKey=n=>n.normalize('NFKC').toLocaleLowerCase('tr-TR').replace(/ı/g,'i').replace(/\s+/gu,'');const key=nameKey(name);
   if(key===nameKey(p.name))throw new Error('Farklı bir isim seç.');
   const reserved=this.db.prepare('SELECT player_id FROM character_names WHERE normalized_name=?').get(key);
   if((reserved&&reserved.player_id!==id)||this.db.prepare('SELECT id,name FROM players WHERE id!=?').all(id).some(x=>nameKey(x.name)===key))throw new Error('Bu isim kullanılıyor.');
   this.db.prepare('INSERT OR IGNORE INTO character_names(normalized_name,player_id) VALUES(?,?)').run(key,id);
   this.db.prepare('UPDATE players SET name=?,rename_scrolls=rename_scrolls-1 WHERE id=?').run(name,id);
   this.db.prepare('UPDATE market_shops SET owner_name=? WHERE owner_id=?').run(name,id);
   message='Karakter ismi değiştirildi.';
  }else if(action==='auto_toggle'){
   if(!p.auto_potion_owned||p.auto_potion_remaining<=0)throw new Error('Önce Oto Kırmızı İksir satın almalısın.');
   this.db.prepare('UPDATE players SET auto_potion_enabled=? WHERE id=?').run(input.enabled===true?1:0,id);message=input.enabled?'Oto iksir açıldı.':'Oto iksir kapatıldı.';
  }else if(action==='costume'){
   if(input.enabled===true)this.db.prepare('UPDATE players SET radiant_enabled=0,pumpkin_enabled499=0 WHERE id=?').run(id);
   const item=this.db.prepare("SELECT * FROM player_items WHERE player_id=? AND kind='costume' AND role=? LIMIT 1").get(id,p.role);if(!item)throw new Error('Giysin yok.');
   this.db.prepare("UPDATE player_items SET equipped=CASE WHEN id=? THEN ? ELSE 0 END WHERE player_id=? AND kind='costume'").run(item.id,input.enabled===true?1:0,id);
   this.refreshHp(id);message=input.enabled?'Giysi kuşanıldı.':'Giysi çıkarıldı.';
  }else{
   const counter=action==='enchant_add'?'enchant_add_scrolls':action==='enchant_fifth'?'fifth_enchant_scrolls':'enchant_scrolls';
   if(!(p[counter]>0))throw new Error('Gerekli efsun nesnen yok.');
   const item=this.db.prepare('SELECT * FROM player_items WHERE id=? AND player_id=?').get(product,id);if(!item||!GEAR.includes(item.kind))throw new Error('Çantandaki bir ekipmanı seç.');
   const cfg={...this.db.prepare('SELECT * FROM combat_settings WHERE id=1').get()};
   const next=action==='reroll'?rerollEnchants(item.enchantments,item.kind,cfg):addEnchantment(item.enchantments,item.kind,cfg,action==='enchant_fifth');
   this.db.prepare('UPDATE player_items SET enchantments=? WHERE id=? AND player_id=?').run(next,item.id,id);
   this.db.prepare(`UPDATE players SET ${counter}=${counter}-1 WHERE id=?`).run(id);
   changedItem=this.db.prepare('SELECT * FROM player_items WHERE id=? AND player_id=?').get(item.id,id);
   this.refreshHp(id);message=action==='reroll'?'Efsunlar değiştirildi. Taşlar ve evrim korundu.':'Bir yeni efsun eklendi. Mevcut efsunlar, taşlar ve evrim korundu.';
  }
  // Spin receipts stay small: never copy the entire player market into each draw.
  const result=action==='item_lock499'?{ok:true,message,item:changedItem}:wheel?{ok:true,message,wheel,core_coins:p.core_coins-WHEEL_PRICE}:{ok:true,message,...this.snapshot(id),...(changedItem?{item:changedItem}:{})};
  this.db.prepare('INSERT INTO premium_receipts VALUES(?,?,?,?,?,?)').run(requestId,id,action,product,JSON.stringify(result),this.now());return result;
 }
 refreshHp(id){
  const base=Number(this.db.prepare('SELECT player_max_hp FROM combat_settings WHERE id=1').get()?.player_max_hp)||100;
  const items=this.db.prepare("SELECT kind,enchantments FROM player_items WHERE player_id=? AND equipped=1 AND kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume')").all(id);
  const bonus=items.reduce((n,i)=>n+JSON.parse(i.enchantments||'[]').filter(e=>e.kind==='hp').reduce((a,e)=>a+Math.max(0,Math.min(1000000,Number(e.value)||0)),0),0);
  const petHp=this.hasPets&&this.db.prepare("SELECT 1 FROM player_pets WHERE player_id=? AND kind='starter' AND equipped=1 AND acquired_at+259200>?").get(id,Math.floor(this.now()/1000))?350:0;
  const setHp=globalThis.__colEquipmentSets?Number(this.db.prepare("SELECT set_hp FROM players WHERE id=?").get(id)?.set_hp)||0:0;
  const runeOwner=globalThis.__colRunes?this.db.prepare("SELECT stat_attack,stat_defense,stat_hp,level,rank_tier,rune_hp_level FROM players WHERE id=?").get(id):null;
  const maxBase=Math.max(1,base+beltStatsFor(this.db,id).hp+Math.min(3000000,bonus)+setHp+petHp+this.buff(id).hp+(globalThis.__colRanks?.bonuses(id)?.hp??0)+(globalThis.__colGuildSkill?.bonuses(id)?.hp??0));
  const max=Math.max(1,Math.round(maxBase*(globalThis.__colRunes?.factor(runeOwner,'hp')??1)));if(!Number.isSafeInteger(max))throw Error('Can değeri işlenemedi.');
  this.db.prepare('UPDATE players SET max_hp=?,hp=MIN(hp,?),hp_revision=hp_revision+1 WHERE id=?').run(max,max,id);
 }
}
return {rerollEnchants,addEnchantment,PremiumEngine};}
function guildSkillModule({globals,uuid,random,integer,now,dependencies,fourChannels=false}){const channelCount=fourChannels?4:3,globalThis=globals,crypto=Object.freeze({randomUUID:uuid}),Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date{static now(){return now();}};
const feature504=module65.feature504;
const measureSync504=module66.measureSync504;
const deferDatabaseBackgroundTask=module67.deferDatabaseBackgroundTask;
const GUILD_SKILL_LEVELS=module68.GUILD_SKILL_LEVELS;
const GUILD_SKILL_DURATION=module68.GUILD_SKILL_DURATION;
const GUILD_SKILL_COOLDOWN=module68.GUILD_SKILL_COOLDOWN;
const GUILD_ORB=module68.GUILD_ORB;
const EMPTY_GUILD_BUFF=module68.EMPTY_GUILD_BUFF;
const guildSkillLevel=module68.guildSkillLevel;
function ensureGuildSkillSchema(db){db.exec(`
 CREATE TABLE IF NOT EXISTS guild_skills(guild_id TEXT PRIMARY KEY REFERENCES guild_castles(guild_id) ON DELETE CASCADE,level INTEGER NOT NULL DEFAULT 0 CHECK(level BETWEEN 0 AND 3),essence INTEGER NOT NULL DEFAULT 0 CHECK(essence>=0),active_level INTEGER NOT NULL DEFAULT 0,active_until INTEGER NOT NULL DEFAULT 0,ready_at INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS guild_skill_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,payload TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(player_id,request_id));
 CREATE TABLE IF NOT EXISTS guild_skill_donations(guild_id TEXT NOT NULL REFERENCES guild_castles(guild_id) ON DELETE CASCADE,player_id TEXT NOT NULL,amount INTEGER NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS guild_chat(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,player_id TEXT NOT NULL,player_name TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS guild_chat_room ON guild_chat(guild_id,id);
 `);}
function createGuildSkill(db,{now=Date.now,refreshHp=()=>{}}={}){
 const member=id=>db.prepare('SELECT g.id,g.leader_id,p.area,p.x,p.y,p.hp FROM guild_members m JOIN guilds g ON g.id=m.guild_id JOIN players p ON p.id=m.player_id WHERE m.player_id=?').get(id);
 const state=gid=>db.prepare('SELECT * FROM guild_skills WHERE guild_id=?').get(gid);
 const buffs=new Map();let syncJob=null;
 // Enabled only by the coordinator after both durable commit observers are
 // installed. Legacy/unobserved users retain the original full reconciliation.
 let observing=false,revision=0,syncedRevision=-1,nextExpiry=Infinity,scanStartedAt=-Infinity;
 const bonuses=id=>{const s=db.prepare('SELECT s.* FROM guild_skills s JOIN guild_members m ON m.guild_id=s.guild_id WHERE m.player_id=? AND s.active_until>?').get(id,now());return s?{...guildSkillLevel(s.active_level),until:s.active_until}:EMPTY_GUILD_BUFF;};
 function* syncSteps(){
  const startedAt=now(),startedRevision=revision;
  // No TTL: unchanged membership/skill rows can change HP only at their actual
 // expiry. A backwards clock forces a fresh reconciliation as well.
  if(observing&&syncedRevision===startedRevision&&startedAt>=scanStartedAt&&startedAt<nextExpiry)return;
  let expiry=Infinity;
  const cooperative504=feature504('cooperativeJobs');let unchanged504=0;
  let current;
  if(!cooperative504){
   current=new Map(db.prepare('SELECT m.player_id,s.active_level,s.active_until FROM guild_members m JOIN guild_skills s ON s.guild_id=m.guild_id').all().map(s=>{
   if(s.active_until>startedAt)expiry=Math.min(expiry,s.active_until);
   return [s.player_id,s.active_until>now()?guildSkillLevel(s.active_level).hp:0];
  }));
  }else{
   current=new Map();let prepared504=0;
   const rows504=db.prepare('SELECT m.player_id,s.active_level,s.active_until FROM guild_members m JOIN guild_skills s ON s.guild_id=m.guild_id').all();
   for(const s of rows504){
    if(s.active_until>startedAt)expiry=Math.min(expiry,s.active_until);
    current.set(s.player_id,s.active_until>now()?guildSkillLevel(s.active_level).hp:0);
    // Pure bounded map preparation. Never suspend an owner HP transaction.
    if(++prepared504%512===0)yield;
   }
  }
  for(const id of new Set([...buffs.keys(),...current.keys()])){
   if(buffs.get(id)===(current.get(id)??0)){if(!current.has(id))buffs.delete(id);if(cooperative504&&++unchanged504%512===0)yield;continue;}
   // Only changed owners need a second query. Re-read immediately before HP
   // correction; an activation between I/O turns must not apply stale stats.
   const hp=bonuses(id).hp??0;
   if(buffs.get(id)!==hp)yield refreshHp(id);
   if(current.has(id))buffs.set(id,hp);else buffs.delete(id);
   yield;
  }
  // Publish only the revision captured BEFORE the scan, and only after every
  // awaited HP repair succeeded. Mid-scan commits, cancellation and failures
  // must not mark newer state as reconciled.
  syncedRevision=startedRevision;nextExpiry=expiry;scanStartedAt=startedAt;
 }

 return {bonuses,
 observeCommits(){observing=true;revision++;},
 committed(changes){if(observing&&changes?.some(row=>row.table==='guild_members'||row.table==='guild_skills'))revision++;},
 read(id){const m=member(id);if(!m||!db.prepare('SELECT 1 FROM guild_castles WHERE guild_id=?').get(m.id))return null;return {...(state(m.id)??{level:0,essence:0,active_level:0,active_until:0,ready_at:0}),leader:m.leader_id===id,serverTime:now(),levels:GUILD_SKILL_LEVELS};},
 project(rows){if(!rows.length)return rows;const active=new Map(db.prepare(`SELECT m.player_id,s.active_level,s.active_until FROM guild_members m JOIN guild_skills s ON s.guild_id=m.guild_id WHERE s.active_until>? AND m.player_id IN (${rows.map(()=>'?').join(',')})`).all(now(),...rows.map(p=>p.id)).map(s=>[s.player_id,{...guildSkillLevel(s.active_level),until:s.active_until}]));return rows.map(p=>({...p,guildBuff:active.get(p.id)??EMPTY_GUILD_BUFF}));},
 sync(){for(const _ of syncSteps()){}},
 syncInBackground(available=()=>true){
  if(syncJob)return syncJob;
  syncJob=deferDatabaseBackgroundTask(async()=>{
   const steps=syncSteps();
   while(available()){
    const step=await deferDatabaseBackgroundTask(()=>available()?measureSync504('main_guild_step',()=>steps.next()):{done:true});
    if(step.done)break;
    await step.value;
   }
  }).finally(()=>{syncJob=null;});return syncJob;
 },
 act(id,body){db.exec('BEGIN IMMEDIATE');try{
  const m=member(id);if(!m||!db.prepare('SELECT 1 FROM guild_castles WHERE guild_id=?').get(m.id))throw Error('Loncanızın bir şatosu olmalı.');
  if(!['activate','donate'].includes(body.action)||typeof body.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(body.requestId))throw Error('İşlem kimliği geçersiz.');
  const payload=JSON.stringify({guild:m.id,action:body.action,amount:body.amount});
  const receipt=db.prepare('SELECT * FROM guild_skill_receipts WHERE player_id=? AND request_id=?').get(id,body.requestId);
  if(receipt){if(receipt.payload!==payload)throw Error('İşlem kimliği farklı bir istekte kullanılmış.');db.exec('COMMIT');return JSON.parse(receipt.result);}
  db.prepare('INSERT OR IGNORE INTO guild_skills(guild_id) VALUES(?)').run(m.id);const s=state(m.id);let message;
  if(body.action==='activate'){
   if(m.leader_id!==id)throw Error('Beceriyi yalnız lonca başkanı kullanabilir.');
   if(!s.level)throw Error('Önce salondaki Yeşil Küreyi geliştir.');
   if(s.ready_at>now())throw Error('Lonca becerisi henüz hazır değil.');
   db.prepare('UPDATE guild_skills SET active_level=level,active_until=?,ready_at=? WHERE guild_id=?').run(now()+GUILD_SKILL_DURATION,now()+GUILD_SKILL_COOLDOWN,m.id);message='Çekirdeğin Birliği 30 dakika etkin.';
  }else{
   if(m.area!=='guild_hall_'+m.id||Math.hypot(m.x-GUILD_ORB.x,m.y-GUILD_ORB.y)>220||m.hp<=0)throw Error('Bağış için kendi lonca salonundaki Yeşil Küreye yaklaş.');
   const next=guildSkillLevel(s.level+1),amount=Number(body.amount);
   if(!next)throw Error('Lonca becerisi en yüksek seviyede.');
   if(!Number.isSafeInteger(amount)||amount<1||amount>next.cost-s.essence)throw Error(`Bu kademe için en fazla ${next.cost-s.essence} öz bağışlanabilir.`);
   if(!db.prepare('UPDATE players SET essence=essence-? WHERE id=? AND essence>=?').run(amount,id,amount).changes)throw Error('Yeterli özün yok.');
   const completed=s.essence+amount===next.cost;
   db.prepare('UPDATE guild_skills SET essence=?,level=? WHERE guild_id=?').run(completed?0:s.essence+amount,completed?next.level:s.level,m.id);
   db.prepare('INSERT INTO guild_skill_donations VALUES(?,?,?,?)').run(m.id,id,amount,now());message=completed?`Çekirdeğin Birliği ${next.level}. seviye açıldı.`:'Öz bağışın Yeşil Küreye eklendi.';
  }
  const result={ok:true,message};db.prepare('INSERT INTO guild_skill_receipts VALUES(?,?,?,?)').run(id,body.requestId,payload,JSON.stringify(result));db.exec('COMMIT');return result;
 }catch(e){db.exec('ROLLBACK');throw e;}},
 chat(id){const m=member(id);return m?{guildId:m.id,messages:db.prepare('SELECT id,player_id,player_name,body,created_at FROM guild_chat WHERE guild_id=? ORDER BY id DESC LIMIT 40').all(m.id).reverse()}: {guildId:null,messages:[]};},
 send(id,body){const m=member(id);if(!m)throw Error('Lonca sohbeti için bir loncaya katıl.');const name=db.prepare('SELECT name FROM players WHERE id=?').get(id).name;db.prepare('INSERT INTO guild_chat(guild_id,player_id,player_name,body,created_at) VALUES(?,?,?,?,?)').run(m.id,id,name,body,Math.floor(now()/1000));db.prepare('DELETE FROM guild_chat WHERE guild_id=? AND id NOT IN(SELECT id FROM guild_chat WHERE guild_id=? ORDER BY id DESC LIMIT 100)').run(m.id,m.id);return {ok:true};}
 };
}
return {ensureGuildSkillSchema,createGuildSkill};}
export function createRewardServices({globals,uuid=()=>ambient.crypto.randomUUID(),random=Math.random,integer=nativeServiceInt,now=Date.now,fourChannels=false}){if(!globals)throw Error("reward_globals_required");const options={globals,uuid,random,integer,now,fourChannels,dependencies:[]};for(const factory of [couponsModule,dragonModule,questsModule,runeLibraryModule,runeV2LibraryModule,eventLibraryModule,cauldronGrantsModule,cauldronModule,arenaModule,battlePassModule,eventsModule,runesModule,runeV2Module,evolutionModule,communityModule,guildVillageModule,statusModule,ranksModule,progressionModule,premiumModule,guildSkillModule])options.dependencies.push(factory(options));return {coupons:options.dependencies[0],dragon:options.dependencies[1],quests:options.dependencies[2],runeLibrary:options.dependencies[3],runeV2Library:options.dependencies[4],eventLibrary:options.dependencies[5],cauldronGrants:options.dependencies[6],cauldron:options.dependencies[7],arena:options.dependencies[8],battlePass:options.dependencies[9],events:options.dependencies[10],runes:options.dependencies[11],runeV2:options.dependencies[12],evolution:options.dependencies[13],community:options.dependencies[14],guildVillage:options.dependencies[15],status:options.dependencies[16],ranks:options.dependencies[17],progression:options.dependencies[18],premium:options.dependencies[19],guildSkill:options.dependencies[20]};}
