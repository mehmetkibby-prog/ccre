import {PREMIUM_ITEMS} from './premium-catalog.mjs';
export const TRADE_GLASS_DURATION499=3*86400000;
export const TRADE_GLASS_PRODUCT499=Object.freeze({name:'Ticaret Camı',price:100,image:'/game/trade-glass499.webp',shopOnly499:true});
const PAGE=24,SCAN=192;
const equipment=new Set(['weapon','armor','helmet','shoes','necklace','earring','bracelet','rune_attack','rune_defense','rune_hp']);
const equipmentKinds502=new Set(['all',...equipment]);
const rarities=new Set(['all','white','blue','orange','red','purple','unique','infinite','emerald']);
const lastRead=new Map();
const fail=(message,code='trade_glass_unavailable499',status=409)=>Object.assign(Error(message),{code,status});
export function assertTradeGlass499(p,now=Date.now()){
 if(!p||p.hp<=0||p.area!=='bazaar'||Number(p.combat_lock_until_ms)>now||p.arena_match_id)throw fail('Ticaret Camı yalnız Pazar Köyü’nde, savaş dışında kullanılabilir.');
 if(!Number.isSafeInteger(p.trade_glass_until_ms)||p.trade_glass_until_ms<=now)throw fail('Ticaret Camı süren dolmuş veya bu nesneye sahip değilsin.','trade_glass_expired499');
 return p;
}
export function tradeGlassExpectedPrice499(input){
 if(input.tradeGlass499!==true)return null;
 const n=input.expectedPrice;if(!Number.isSafeInteger(n)||n<1||n>1000000000)throw fail('Fiyat bilgisi değişti. İlanları yenile.','trade_glass_price499');return n;
}
export function ensureTradeGlassIndexes499(db){
 // Cold schema only; browse work is bounded to one indexed candidate page.
 for(const table of ['market_listings','premium_listings'])if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table)){db.exec(`CREATE INDEX IF NOT EXISTS ${table}_glass499 ON ${table}(created_at DESC,id DESC)`);if(table==='market_listings'){
  // Cold schema only: selected-kind pages seek directly into an ordered index.
  db.exec("CREATE INDEX IF NOT EXISTS market_listings_kind_glass502 ON market_listings(kind,created_at DESC,id DESC)");
  db.exec("CREATE INDEX IF NOT EXISTS market_listings_kind_rarity_glass502 ON market_listings(kind,rarity,created_at DESC,id DESC)");
 }}
}
const fold=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('tr-TR').replaceAll('ı','i').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function query(input){
 const section=String(input.section??'equipment'),rarity=String(input.rarity??'all'),search=String(input.search??'').trim();
 const requestedKind502=input.equipmentKind??'all';
 if(!equipmentKinds502.has(requestedKind502))throw fail('Ekipman türü geçersiz.','trade_glass_query499',400);
 const equipmentKind=section==='equipment'?requestedKind502:'all';
 if(!['equipment','material','premium'].includes(section)||!rarities.has(rarity)||search.length>64)throw fail('Arama veya filtre geçersiz.','trade_glass_query499',400);
 let cursor=null;
 if(input.cursor!=null){if(typeof input.cursor!=='string'||input.cursor.length>600)throw fail('Sayfa bilgisi geçersiz.','trade_glass_cursor499',400);try{cursor=JSON.parse(input.cursor);}catch{}if(!cursor||cursor.s!==section||cursor.r!==rarity||(cursor.k??'all')!==equipmentKind||cursor.q!==search||!Number.isSafeInteger(cursor.t)||cursor.t<0||typeof cursor.id!=='string'||cursor.id.length>128)throw fail('Sayfa bilgisi değişti. Aramayı yenile.','trade_glass_cursor499',400);}
 return {section,rarity,equipmentKind,search,folded:fold(search),cursor};
}
export async function browseTradeGlass499(database,id,input,{now=Date.now(),rateLimit=true}={}){
 const q=query(input);
 if(rateLimit){const last=lastRead.get(id)??0;if(now-last<650)throw fail('Aramayı yenilemeden önce kısa bir süre bekle.','trade_glass_rate499',429);lastRead.delete(id);lastRead.set(id,now);if(lastRead.size>512)lastRead.delete(lastRead.keys().next().value);}
 const p=assertTradeGlass499(await database.prepare('SELECT id,hp,area,channel,combat_lock_until_ms,arena_match_id,trade_glass_until_ms FROM players WHERE id=?').bind(id).first(),now);
 const premium=q.section==='premium',table=premium?'premium_listings':'market_listings';
 const params=[],predicates=[];
 // Apply type (and selected rarity) BEFORE the bounded candidate LIMIT.
 // Untyped/category/search continuation retains its existing V499 behavior.
 if(q.section==='equipment'&&q.equipmentKind!=='all'){predicates.push('kind=?');params.push(q.equipmentKind);if(q.rarity!=='all'){predicates.push('rarity=?');params.push(q.rarity);}}
 if(q.cursor){predicates.push('(created_at,id)<(?,?)');params.push(q.cursor.t,q.cursor.id);}
 const range=predicates.length?'WHERE '+predicates.join(' AND '):'';
 const extra=premium?'':',s.active AS shop_active,s.channel AS shop_channel,s.created_at AS shop_created_at,s.owner_id AS shop_owner';
 const join=premium?'':' LEFT JOIN market_shops s ON s.id=l.shop_id';
 // LIMIT remains inside the subquery before joins and Unicode name folding.
 // A selected type/rarity uses its ordered index; each request still processes
 // at most SCAN rows and returns the exact consumed-key continuation cursor.
 const candidates=(await database.prepare(`SELECT l.*,seller.name AS seller_name${extra} FROM (SELECT * FROM ${table} ${range} ORDER BY created_at DESC,id DESC LIMIT ${SCAN+1}) l LEFT JOIN players seller ON seller.id=l.seller_id${join} ORDER BY l.created_at DESC,l.id DESC`).bind(...params).all()).results??[];
 const rows=[];let last=null,consumed=0;
 for(const row of candidates.slice(0,SCAN)){
  last=row;consumed++;
  if(row.seller_id===p.id||!row.seller_name)continue;
  let value=null,name=row.item_name,kind=row.kind,price=row.price_gems,amount=row.amount,image=null;
  if(premium){try{value=JSON.parse(row.payload);}catch{continue;}if(!value||Array.isArray(value)||(!row.product.startsWith('cp_coupon_')&&((value.item?.expires_at_ms??Infinity)<=now||(value.expires_at_ms??Infinity)<=now)))continue;name=value.item?.item_name??PREMIUM_ITEMS[row.product]?.name??row.product;image=PREMIUM_ITEMS[row.product]?.image??null;kind=row.product;price=row.price;amount=value.amount??1;}
  else {if(row.shop_active!==1||row.shop_owner!==row.seller_id||row.shop_channel!==p.channel||row.shop_created_at<=Math.floor(now/1000)-172800)continue;if((q.section==='equipment')!==equipment.has(kind))continue;if(q.section==='equipment'&&q.rarity!=='all'&&row.rarity!==q.rarity)continue;}
  if(!Number.isSafeInteger(price)||price<1||price>1000000000||!Number.isSafeInteger(amount)||amount<1||amount>999999||!fold(name).includes(q.folded))continue;
  rows.push({id:row.id,source:premium?'premium':'market',name,kind,rarity:value?.item?.rarity??row.rarity??'unique',power:value?.item?.power??row.power??0,role:value?.item?.role??row.role??null,enchantments:value?.item?.enchantments??row.enchantments??'[]',amount,price,sellerName:row.seller_name,image,expiresAtMs:value?.item?.expires_at_ms??value?.expires_at_ms??0,remaining:value?.remaining,total:value?.total});
  if(rows.length===PAGE)break;
 }
 const more=candidates.length>consumed;
 return {ok:true,rows,nextCursor:more&&last?JSON.stringify({s:q.section,r:q.rarity,k:q.equipmentKind,q:q.search,t:last.created_at,id:last.id}):null,expiresAtMs:p.trade_glass_until_ms,serverNowMs:now,channel:p.channel,scanned:consumed};
}
