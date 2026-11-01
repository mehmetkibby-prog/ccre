import {PREMIUM_ITEMS} from '../../../native510-bb3a6cc689c6/lib/premium-catalog.mjs';
import {assertTradeGlass499} from '../../../native510-bb3a6cc689c6/lib/trade-glass499.mjs';

// R27 native Trade Glass semantics, with category/shop predicates applied
// before pagination and the viewer's listings visible. Read-only: purchases
// still use the original durable price/ownership-checked transaction.
const PAGE=24,SCAN=192;
const equipment=['weapon','armor','helmet','shoes','necklace','earring','bracelet','belt','rune_attack','rune_defense','rune_hp'];
const rarities=new Set(['all','white','blue','orange','red','purple','unique','infinite','emerald','crafted']);
const fold=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('tr-TR').replaceAll('ı','i').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const fail=(message,code='trade_glass_query499',status=400)=>Object.assign(Error(message),{code,status});
export function tradeGlassQuery(input){
 if(!input||Array.isArray(input)||typeof input!=='object')throw fail('Arama veya filtre geçersiz.');
 const section=String(input.section??'equipment'),rarity=String(input.rarity??'all'),search=String(input.search??'').trim(),requestedKind=input.equipmentKind??'all';
 if(!['all',...equipment].includes(requestedKind)||!['equipment','material','premium'].includes(section)||!rarities.has(rarity)||search.length>64)throw fail('Arama veya filtre geçersiz.');
 const equipmentKind=section==='equipment'?requestedKind:'all';let cursor=null;
 if(input.cursor!=null){
  if(typeof input.cursor!=='string'||input.cursor.length>600)throw fail('Sayfa bilgisi geçersiz.','trade_glass_cursor499');
  try{cursor=JSON.parse(input.cursor);}catch{}
  if(!cursor||cursor.s!==section||cursor.r!==rarity||(cursor.k??'all')!==equipmentKind||cursor.q!==search||!Number.isSafeInteger(cursor.t)||cursor.t<0||typeof cursor.id!=='string'||cursor.id.length>128||(cursor.c!==undefined&&![1,2,3,4].includes(cursor.c)))throw fail('Sayfa bilgisi değişti. Aramayı yenile.','trade_glass_cursor499');
 }
 return {section,rarity,equipmentKind,search,folded:fold(search),cursor};
}
export function readTradeGlass(sql,params){
 const [actor,account,input,now]=params,q=tradeGlassQuery(input);
 if(typeof actor!=='string'||typeof account!=='string'||!Number.isSafeInteger(now))throw fail('Oturum bilgisi geçersiz.');
 sql.exec('BEGIN');
 try{
  const p=sql.prepare('SELECT id,account_id,hp,area,channel,combat_lock_until_ms,arena_match_id,trade_glass_until_ms FROM players WHERE id=?').get(actor);
  // Native auth deliberately returns only id/name/role for the player.
  // Resolve channel and eligibility together from this read-only WAL snapshot;
  // neither an absent session field nor a browser-supplied channel is authority.
  if(!p||p.account_id!==account||![1,2,3,4].includes(p.channel)||(q.cursor?.c!==undefined&&q.cursor.c!==p.channel))throw fail('Karakter veya kanal değişti. İlanları yenile.','trade_glass_scope_changed',409);
  assertTradeGlass499(p,now);
  const premium=q.section==='premium',table=premium?'premium_listings':'market_listings',args=[],where=[];
  if(!premium){
   where.push('s.active=1','s.owner_id=l.seller_id','s.channel=?','s.created_at>?','l.created_at>?');args.push(p.channel,Math.floor(now/1000)-172800,Math.floor(now/1000)-172800);
   if(q.section==='equipment'&&q.equipmentKind!=='all'){where.push('l.kind=?');args.push(q.equipmentKind);}
   else{where.push('l.kind '+(q.section==='equipment'?'IN':'NOT IN')+' ('+equipment.map(()=>'?').join(',')+')');args.push(...equipment);}
   if(q.section==='equipment'&&q.rarity!=='all'){where.push('l.rarity=?');args.push(q.rarity);}
  }
  if(q.cursor){where.push('(l.created_at,l.id)<(?,?)');args.push(q.cursor.t,q.cursor.id);}
  const candidates=sql.prepare(`SELECT l.*,seller.name AS seller_name FROM ${table} l JOIN players seller ON seller.id=l.seller_id ${premium?'':'JOIN market_shops s ON s.id=l.shop_id'} ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY l.created_at DESC,l.id DESC LIMIT ${SCAN+1}`).all(...args);
  const rows=[];let last=null,consumed=0;
  for(const row of candidates.slice(0,SCAN)){
   last=row;consumed++;if(!row.seller_name)continue;
   let value=null,name=row.item_name,kind=row.kind,price=row.price_gems,amount=row.amount,image=null;
   if(premium){
    try{value=JSON.parse(row.payload);}catch{continue;}
    if(!value||Array.isArray(value)||typeof row.product!=='string'||(!row.product.startsWith('cp_coupon_')&&((value.item?.expires_at_ms??Infinity)<=now||(value.expires_at_ms??Infinity)<=now)))continue;
    name=value.item?.item_name??PREMIUM_ITEMS[row.product]?.name??row.product;image=PREMIUM_ITEMS[row.product]?.image??null;kind=row.product;price=row.price;amount=value.amount??1;
   }
   if(!Number.isSafeInteger(price)||price<1||price>1000000000||!Number.isSafeInteger(amount)||amount<1||amount>999999||!fold(name).includes(q.folded))continue;
   rows.push({id:row.id,source:premium?'premium':'market',name,kind,rarity:value?.item?.rarity??row.rarity??'unique',power:value?.item?.power??row.power??0,role:value?.item?.role??row.role??null,enchantments:value?.item?.enchantments??row.enchantments??'[]',amount,price,sellerName:row.seller_name,ownListing:row.seller_id===p.id,image,expiresAtMs:value?.item?.expires_at_ms??value?.expires_at_ms??0,remaining:value?.remaining,total:value?.total});
   if(rows.length===PAGE)break;
  }
  const result={ok:true,rows,nextCursor:candidates.length>consumed&&last?JSON.stringify({s:q.section,r:q.rarity,k:q.equipmentKind,q:q.search,c:p.channel,t:last.created_at,id:last.id}):null,expiresAtMs:p.trade_glass_until_ms,serverNowMs:now,channel:p.channel,scanned:consumed};
  sql.exec('COMMIT');return result;
 }catch(error){sql.exec('ROLLBACK');if(error?.code?.startsWith('trade_glass_'))return {ok:false,error:error.message,code:error.code,status:error.status};throw error;}
}

const rates=new WeakMap();
export async function tradeGlassHttp(core,request){
 const headers={'cache-control':'no-store'};
 if(request.method!=='POST')return Response.json({error:'Yalnız POST kullanılabilir.'},{status:405,headers:{...headers,allow:'POST'}});
 try{
  // This realtime URL is covered by native presence, maintenance, bot and CSRF
  // validation. No browser-supplied actor/account/channel is ever trusted.
  const auth=await core.authenticate(request);
  if(!auth?.player||!auth?.account)return Response.json({error:'Önce karakterine gir.'},{status:409,headers});
  const input=await core.auth.rules.readJsonObject(request,4096);
  if(input.action!=='trade_glass_browse')throw fail('İşlem geçersiz.');tradeGlassQuery(input);
  const now=core.clock();let reads=rates.get(core);if(!reads){reads=new Map();rates.set(core,reads);}
  const key=auth.account.id,last=reads.get(key);
  if(last!==undefined&&now-last<650)throw fail('Aramayı yenilemeden önce kısa bir süre bekle.','trade_glass_rate499',429);
  reads.delete(key);reads.set(key,now);if(reads.size>512)reads.delete(reads.keys().next().value);
  const {rows:result}=await core.reader.query('kernel511_trade_glass',[auth.player.id,auth.account.id,input,now]);
  return Response.json(result,{status:result.ok?200:result.status??409,headers});
 }catch(error){
  if(core.auth.rules.AuthRequestError&&error instanceof core.auth.rules.AuthRequestError)return core.auth.error(error);
  if(error?.code?.startsWith('trade_glass_'))return Response.json({error:error.message,code:error.code},{status:error.status??409,headers});
  return Response.json({error:'İlanlar şu anda okunamadı. Yeniden dene.',code:'trade_glass_read_unavailable'},{status:503,headers});
 }
}
