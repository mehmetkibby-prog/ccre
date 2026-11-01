// Only persistent, individually identified inventory objects are lockable.
// No periodic scans, timers, combat checks or recurring lookups are added.
export function ensureItemLock499(db){
 for(const table of ['player_items','player_storage_items']){
  const columns=new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(r=>r.name));
  if(columns.size&&!columns.has('sale_locked499'))db.exec(`ALTER TABLE ${table} ADD COLUMN sale_locked499 INTEGER NOT NULL DEFAULT 0 CHECK(sale_locked499 IN (0,1))`);
  // V502 coupons are consumable value vouchers, not lockable equipment. Preserve every other field.
  if(columns.has('kind'))db.exec(`UPDATE ${table} SET sale_locked499=0 WHERE sale_locked499<>0 AND kind IN ('cp_coupon_100','cp_coupon_200','cp_coupon_500')`);
 }
}
// Invoked only inside PremiumEngine's existing authenticated FULL writer
// transaction, after actor scope/combat checks and durable replay validation.
export function toggleItemLock499(engine,p,input){
 if(typeof input.enabled!=='boolean'||typeof input.itemId!=='string'||!input.itemId||input.itemId.length>200)throw Error('Geçerli bir eşya ve kilit seçimi gerekli.');
 const item=engine.db.prepare('UPDATE player_items SET sale_locked499=? WHERE id=? AND player_id=? AND (expires_at_ms=0 OR expires_at_ms>?) AND (?=0 OR kind NOT IN (?,?,?)) RETURNING *').get(input.enabled?1:0,input.itemId,p.id,engine.now(),input.enabled?1:0,'cp_coupon_100','cp_coupon_200','cp_coupon_500');
 if(!item)throw Error('Eşya çantanda değil, süresi dolmuş veya kilitlenemez. ÇP kuponları kilitlenmez; satıştaki eşyayı önce pazardan geri al.');
 return item;
}
