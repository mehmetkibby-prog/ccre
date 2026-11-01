import {assertTradeGlass499,tradeGlassExpectedPrice499} from '../../lib/trade-glass499.mjs';
import {isCoupon483,escrowCoupon483,receiveCoupon483} from './cp-coupons483.mjs';
import {randomUUID} from 'node:crypto';
import {PREMIUM_ITEMS} from '../../lib/premium-catalog.mjs';
const counters={item_link:'item_link_orbs',enchant_scroll:'enchant_scrolls',enchant_add:'enchant_add_scrolls',rename_scroll:'rename_scrolls'};
const flags=['weapon_skin','stall_skin','teleport_skin'];
export function tradePremium(engine,p,input){
 const db=engine.db,now=engine.now(),action=input.action;
 if(p.area!=='bazaar'||p.hp<=0||p.combat_lock_until_ms>now||p.arena_match_id)throw new Error('Nesne Market ürünleri Pazar Köyü’nde, savaş dışında satılır.');
 if(action==='market_list'){
  const product=String(input.product),price=Number(input.price),amount=Number(input.amount??1);let value={amount:1};
  if(!Number.isSafeInteger(price)||price<1||price>1000000000||!Number.isSafeInteger(amount)||amount<1||amount>999)throw new Error('Fiyat ve adet geçersiz.');
  if(db.prepare('SELECT COUNT(*) n FROM premium_listings WHERE seller_id=?').get(p.id).n>=24)throw new Error('En fazla 24 Nesne Market ilanı açılabilir.');
  if(isCoupon483(product)){
   // Ordinary item listings require a current, active stall in this channel.
   // Preserve that same flow: only create_shop may place/reopen a stall.
   if(!db.prepare("SELECT 1 FROM market_shops WHERE owner_id=? AND channel=? AND active=1 AND created_at>CAST(strftime('%s','now') AS INTEGER)-172800").get(p.id,p.channel))throw new Error('Önce Pazarım bölümünden bu kanalda tezgâhını kur; ardından ÇP kuponunu satışa koy.');
   value=escrowCoupon483(engine,p,input);
  }
  else if(counters[product]){const col=counters[product];if(p[col]<amount)throw new Error('Yeterli nesnen yok.');db.prepare(`UPDATE players SET ${col}=${col}-? WHERE id=?`).run(amount,p.id);value={amount};}
  else if(flags.includes(product)){if(['weapon_skin','teleport_skin'].includes(product))value.expires_at_ms=p[product+'_expires_at_ms'];if(!p[product+'_owned'])throw new Error('Bu ürün sende yok.');db.prepare(`UPDATE players SET ${product}_owned=0,${product}_enabled=0 WHERE id=?`).run(p.id);}
  else if(product==='auto_potion'){if(!p.auto_potion_owned||p.auto_potion_remaining<=0)throw new Error('İksirin boş.');value={amount:1,remaining:p.auto_potion_remaining,total:p.auto_potion_total};db.prepare('UPDATE players SET auto_potion_owned=0,auto_potion_enabled=0,auto_potion_remaining=0 WHERE id=?').run(p.id);}
  else if(product==='costume'){const item=db.prepare("SELECT * FROM player_items WHERE id=? AND player_id=? AND kind='costume'").get(String(input.itemId),p.id);if(!item||item.expires_at_ms<=now)throw new Error('Giysi yok veya süresi dolmuş.');if(item.sale_locked499)throw new Error('Kilitli eşya satılamaz. Önce eşyanın kilidini kaldır.');if(item.equipped)throw new Error('Önce giysiyi çıkar.');value={amount:1,item};db.prepare('DELETE FROM player_items WHERE id=?').run(item.id);}
  else throw new Error('Bu ürün satışa uygun değil.');
  db.prepare('INSERT INTO premium_listings(id,seller_id,product,payload,price,created_at) VALUES(?,?,?,?,?,?)').run(randomUUID(),p.id,product,JSON.stringify(value),price,now);
  return 'Nesne Market ürünü satışa konuldu.';
 }
 const listing=db.prepare('SELECT * FROM premium_listings WHERE id=?').get(String(input.listingId));if(!listing)throw new Error('İlan artık satışta değil.');
 const value=JSON.parse(listing.payload),product=listing.product;
 if(!isCoupon483(product)&&(value.item?.expires_at_ms<=now||value.expires_at_ms<=now))throw new Error('Bu ürünün süresi doldu.');
 if(action==='market_cancel'&&listing.seller_id!==p.id)throw new Error('Bu ilan sana ait değil.');
 if(action==='market_buy'&&input.tradeGlass499===true){assertTradeGlass499(p,now);if(tradeGlassExpectedPrice499(input)!==listing.price)throw Error('Fiyat değişti. İlanları yenile.');}
 if(action==='market_buy'){
  if(listing.seller_id===p.id)throw new Error('Kendi ürününü satın alamazsın.');
  if(p.gems<listing.price)throw new Error('Mücevherin yetersiz.');
 }
 if(isCoupon483(product))receiveCoupon483(engine,p,value,product,listing.seller_id,listing.price,action);
 else if(counters[product])db.prepare(`UPDATE players SET ${counters[product]}=${counters[product]}+? WHERE id=?`).run(value.amount,p.id);
 else if(flags.includes(product)){if(p[product+'_owned'])throw new Error('Bu görünüme zaten sahipsin.');db.prepare(`UPDATE players SET ${product}_owned=1,${product}_enabled=0 WHERE id=?`).run(p.id);if(['weapon_skin','teleport_skin'].includes(product))db.prepare(`UPDATE players SET ${product}_expires_at_ms=? WHERE id=?`).run(value.expires_at_ms,p.id);}
 else if(product==='auto_potion'){if(p.auto_potion_owned&&p.auto_potion_remaining>0)throw new Error('Önce mevcut oto iksirini bitir veya satışa koy.');db.prepare('UPDATE players SET auto_potion_owned=1,auto_potion_enabled=0,auto_potion_remaining=?,auto_potion_total=? WHERE id=?').run(value.remaining,value.total,p.id);}
 else if(product==='costume'){
  const i=value.item;if(i.role!==p.role)throw new Error('Giysi sınıfına uygun değil.');
  if(db.prepare("SELECT 1 FROM player_items WHERE player_id=? AND kind='costume' AND role=?").get(p.id,p.role))throw new Error('Bu sınıf giysisine zaten sahipsin.');
  db.prepare('INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at,expires_at_ms,premium_origin) VALUES(?,?,?,?,?,?,?,?,0,?,?,1)').run(i.id,p.id,i.kind,i.item_name,i.rarity,i.power,i.role,i.enchantments,i.created_at,i.expires_at_ms);
 }
 if(action==='market_buy'){
  db.prepare('UPDATE players SET gems=gems-? WHERE id=?').run(listing.price,p.id);
  if(db.prepare("UPDATE players SET gems=gems+? WHERE id=? AND typeof(gems)='integer' AND gems>=0 AND gems<=9000000000000-?").run(listing.price,listing.seller_id,listing.price).changes!==1)throw new Error('Satıcı bakiyesi doğrulanamadı; satış yapılmadı.');
 }
 db.prepare('DELETE FROM premium_listings WHERE id=?').run(listing.id);
 return action==='market_buy'?'Nesne Market ürünü alındı.':'Ürün çantana geri alındı.';
}
export function premiumListings(engine,sellerId499){
 if(sellerId499!==undefined&&(typeof sellerId499!=='string'||sellerId499.length<1||sellerId499.length>128))throw Error('Pazar sahibi geçersiz.');
 const scoped499=sellerId499!==undefined;return engine.db.prepare(`SELECT l.*,p.name AS seller_name FROM premium_listings l JOIN players p ON p.id=l.seller_id
 WHERE ${scoped499?'l.seller_id=? AND ':''}(l.product NOT IN ('weapon_skin','teleport_skin') OR json_extract(l.payload,'$.expires_at_ms')>?)
 AND (l.product!='costume' OR json_extract(l.payload,'$.item.expires_at_ms')>?)
 ORDER BY created_at DESC LIMIT 200`).all(...(scoped499?[sellerId499,engine.now(),engine.now()]:[engine.now(),engine.now()])).map(r=>({...r,payload:JSON.parse(r.payload),name:PREMIUM_ITEMS[r.product]?.name??r.product}));}
