import {randomUUID,createHash} from 'node:crypto';
export const COUPON_FACE483=Object.freeze({cp_coupon_100:100,cp_coupon_200:200,cp_coupon_500:500});
export const isCoupon483=kind=>Object.hasOwn(COUPON_FACE483,kind);
const fail=message=>{throw Error(message);};
// Coupons use the same synchronous FULL transaction and durable receipts as
// every premium purchase. Internal receipt IDs are indexed identities, not scans.
export function couponActor483(db,p){
 if(!p||p.loadlab_run_id)fail('Test hesapları ÇP kuponu kullanamaz.');
 if(db.prepare("SELECT 1 FROM loadlab_entities_v1 WHERE id=? OR account_id=? LIMIT 1").get(p.id,p.account_id)||db.prepare('SELECT 1 FROM loadlab_admissions_v1 WHERE account_id=? LIMIT 1').get(p.account_id))fail('Test hesapları ÇP kuponu kullanamaz.');
}
export function couponCapacity483(db,id,incoming=1,outgoing=0){
 if(db.prepare('SELECT COUNT(*) n FROM player_items WHERE player_id=?').get(id).n-outgoing+incoming>500)fail('Çantanda kupon için yer yok. Önce bir eşyanı depoya bırak.');
}
function receiptKey(kind,id){if(typeof id!=='string'||!/^cpc483-[a-f0-9-]{36}$/.test(id))fail('ÇP kuponu bulunamadı.');return 'cpc-'+kind+'-'+id;}
export function verifyCoupon483(db,item,heldReceipt=null){
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
export function mintCoupon483(engine,p,kind){
 const db=engine.db;couponActor483(db,p);couponCapacity483(db,p.id);
 const face=COUPON_FACE483[kind];if(!face)fail('ÇP kuponu geçersiz.');
 const id='cpc483-'+randomUUID(),at=engine.now();
 db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at,expires_at_ms,premium_origin) VALUES(?,?,?,?,'unique',0,?,'[]',0,?,0,1)").run(id,p.id,kind,face+' ÇP Kuponu',p.role,Math.floor(at/1000));
 db.prepare('INSERT INTO premium_receipts VALUES(?,?,?,?,?,?)').run(receiptKey('issue',id),p.id,'coupon_issue483',kind,JSON.stringify({itemId:id,face}),at);
 return db.prepare('SELECT * FROM player_items WHERE id=?').get(id);
}
export function redeemCoupon483(engine,p,input){
 const db=engine.db;couponActor483(db,p);const id=String(input.itemId??'');receiptKey('spent',id);
 const item=db.prepare('SELECT * FROM player_items WHERE id=? AND player_id=?').get(id,p.id),face=verifyCoupon483(db,item);
 if(!Number.isSafeInteger(p.core_coins)||p.core_coins<0||p.core_coins>Number.MAX_SAFE_INTEGER-face)fail('Çekirdek Parası bakiye sınırına ulaştın.');
 db.prepare('INSERT INTO premium_receipts VALUES(?,?,?,?,?,?)').run(receiptKey('spent',id),p.id,'coupon_spent483',item.kind,JSON.stringify({itemId:id,face,requestId:input.requestId}),engine.now());
 if(db.prepare('DELETE FROM player_items WHERE id=? AND player_id=? AND equipped=0').run(id,p.id).changes!==1)fail('ÇP kuponu değişti.');
 if(db.prepare('UPDATE players SET core_coins=core_coins+? WHERE id=? AND core_coins=?').run(face,p.id,p.core_coins).changes!==1)fail('Çekirdek Parası bakiyesi değişti.');
 return face+' ÇP bakiyene eklendi.';
}
export function escrowCoupon483(engine,p,input){
 couponActor483(engine.db,p);const item=engine.db.prepare('SELECT * FROM player_items WHERE id=? AND player_id=?').get(String(input.itemId),p.id);verifyCoupon483(engine.db,item);if(item.sale_locked499)fail('Kilitli eşya satılamaz. Önce eşyanın kilidini kaldır.');
 if(item.kind!==input.product||Number(input.amount??1)!==1)fail('Her ilanda bir ÇP kuponu satılabilir.');
 if(engine.db.prepare('DELETE FROM player_items WHERE id=? AND player_id=? AND equipped=0').run(item.id,p.id).changes!==1)fail('ÇP kuponu değişti.');
 return {amount:1,item};
}
export function receiveCoupon483(engine,p,value,kind,sellerId,price,action){
 const db=engine.db;couponActor483(db,p);const seller=db.prepare('SELECT * FROM players WHERE id=?').get(sellerId);couponActor483(db,seller);
 if(action==='market_buy'&&(!Number.isSafeInteger(price)||price<1||price>1000000000||!Number.isSafeInteger(p.gems)||p.gems<price||!Number.isSafeInteger(seller.gems)||seller.gems<0||!Number.isSafeInteger(seller.gems+price)||seller.gems+price>9e12))fail('Mücevher bakiye sınırı.');
 const item=value?.item;verifyCoupon483(db,item);if(item.kind!==kind||value.amount!==1)fail('ÇP kuponu ilanı geçersiz.');couponCapacity483(db,p.id);
 db.prepare('INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at,expires_at_ms,premium_origin) VALUES(?,?,?,?,?,?,?,?,0,?,0,1)').run(item.id,p.id,item.kind,item.item_name,item.rarity,0,item.role,'[]',item.created_at);
}
// Cold rollback archives coupons in the durable receipt table. The exact old
// R15 general market cannot carry coupon provenance, so no physical coupon is
// exposed to it. No trigger is added: old reward fast-path recognition remains.
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
export function assertCouponRollback483(db){
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
export function reconcileCouponRollback483(db,{callerTransaction=false}={}){
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
export function restoreCouponHolds483(db,{callerTransaction=false}={}){
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
