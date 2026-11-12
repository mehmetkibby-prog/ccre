import {TRADE_GLASS_DURATION499} from '../../lib/trade-glass499.mjs';
import {toggleItemLock499} from './item-lock499.mjs';
import {PUMPKIN_DURATION499,pumpkinActive499} from '../../lib/pumpkin499.mjs';
import {readWheelSettings483,saveWheelSettings483,wheelRewardAt483} from '../../lib/wheel-config483.mjs';
import {isCoupon483,mintCoupon483,redeemCoupon483} from './cp-coupons483.mjs';
import {deferDatabaseBackgroundTask} from './database.mjs';
import {rollEnchantmentValue} from '../../lib/enchantment-tiers.mjs';
import {COSMETIC_DURATION_MS,EXTRA_PRODUCTS,EXTRA_COLUMNS,TALISMAN_COLORS} from '../../lib/extra-products.mjs';
import {extraBuff,useExtra} from './extra-products.mjs';
import {tradePremium,premiumListings} from './premium-trading.mjs';
import {hasForbiddenCharacterName} from '../../lib/profanity.mjs';
import {parseMarketPrices,marketPrice,validateMarketPrices} from '../../lib/market-prices.mjs';
import {randomUUID,randomInt} from 'node:crypto';
import {COSTUMES,PREMIUM_ITEMS,SUPPORT_DURATION_DAYS,WHEEL_PRICE,WHEEL_VERSION,WHEEL_REWARDS,wheelRewardAt} from '../../lib/premium-catalog.mjs';
import {afkDay} from '../../lib/afk-island.mjs';
import {SPECIALIZATION_RESET463} from '../../lib/expansion456.mjs';
const GEAR=['weapon','armor','helmet','shoes','necklace','earring','bracelet'];
export function rerollEnchants(raw,kind,cfg,random=Math.random,mode="reroll"){
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
export function addEnchantment(raw,kind,cfg,fifth=false,random=Math.random){return rerollEnchants(raw,kind,cfg,random,fifth?'fifth':'add');}
export class PremiumEngine{
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
  const maxBase=Math.max(1,base+Math.min(3000000,bonus)+setHp+petHp+this.buff(id).hp+(globalThis.__colRanks?.bonuses(id)?.hp??0)+(globalThis.__colGuildSkill?.bonuses(id)?.hp??0));
  const max=Math.max(1,Math.round(maxBase*(globalThis.__colRunes?.factor(runeOwner,'hp')??1)));if(!Number.isSafeInteger(max))throw Error('Can değeri işlenemedi.');
  this.db.prepare('UPDATE players SET max_hp=?,hp=MIN(hp,?),hp_revision=hp_revision+1 WHERE id=?').run(max,max,id);
 }
}
