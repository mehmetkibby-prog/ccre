import {randomUUID} from 'node:crypto';
import {CAULDRON_CATALOG488,CAULDRON_BY_ID488} from '../../../native510-bb3a6cc689c6/lib/cauldron-catalog488.mjs';
import {ENHANCEMENT_CATALOG491} from '../../../native510-bb3a6cc689c6/lib/enhancement491.mjs';
import {EXTRA_PRODUCTS} from '../../../native510-bb3a6cc689c6/lib/extra-products.mjs';
import {COUPON_FACE483,isCoupon483,verifyCoupon483,couponActor483} from '../../../native510-bb3a6cc689c6/vds-server/src/cp-coupons483.mjs';
import {TOWER_MATERIALS,TOWER_CHEST,TOWER_HOOK} from './tower-config.mjs';
import {MOUNT_MATERIALS_R60} from './mount-materials-r60.mjs';
import {ADMIN_ACCESSORIES_R58,grantAccessoriesR58} from './admin-accessories-r58.mjs';
import {createRewardServices} from './generated/reward-services.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {r40Options,BAG_EQUIPMENT_LIMIT} from './r40-options.mjs';

// Every item keeps its existing inventory/grant path. Only five new material
// kinds are introduced. No parallel wallet, gear store or periodic scan.
const extras=[
 ...ENHANCEMENT_CATALOG491.map(x=>({...x,type:x.table==='players'?'resource':x.table==='player_stones'?'stone':'material'})),
 ...[...TOWER_MATERIALS,TOWER_CHEST,TOWER_HOOK].map(x=>({...x,type:'material',group:'Kadim Kulesi'})),
 ...Object.entries(MOUNT_MATERIALS_R60).map(([kind,name])=>({id:'material:'+kind,kind,name,type:'material',group:'Binek malzemeleri'})),
 ...ADMIN_ACCESSORIES_R58.filter(x=>x.kind==='belt').map(x=>({...x,type:'accessory',group:'Kemerler'})),
 ...[['wood','Odun'],['stone','Taş'],['axe','Balta'],['pickaxe','Kazma']].map(([kind,name])=>({id:'material:zumrut_'+kind+'_r93',kind:'zumrut_'+kind+'_r93',name,type:'material',group:'Zümrüt Vadisi',iconKind:kind,maxAmount:['axe','pickaxe'].includes(kind)?1:10000})),
 {id:'material:mount_talisman_r93',kind:'mount_talisman_r93',name:'Binek Tılsımı',type:'material',group:'Zümrüt Vadisi',iconKind:'mount_talisman_r93',maxAmount:10000,description:'Üretim tezgâhından kazanılan tılsım.'},
];
const premiumColumns={afk_ticket:'afk_tickets',enchant_add:'enchant_add_scrolls',enchant_scroll:'enchant_scrolls',item_link:'item_link_orbs',rename_scroll:'rename_scrolls'};
function payment(item){
 if(item.type==='resource')return {table:'players',column:item.column};
 if(item.type==='material'||item.type==='stone')return {table:item.type==='stone'?'player_stones':'dungeon_materials',kind:item.kind};
 if(['gear','rune','jewelry','accessory'].includes(item.type))return {table:'player_items',selection:true};
 if(item.type==='premium'){
  if(isCoupon483(item.kind)||item.kind==='costume')return {table:'player_items',selection:true};
  const column=EXTRA_PRODUCTS[item.kind]?.stock??premiumColumns[item.kind];
  if(column)return {table:'players',column};
 }
 if(item.type==='arena'&&item.kind==='exp_ring')return {table:'players',column:'arena_exp_rings'};
 return null;
}
const catalog=new Map();
for(const row of [...CAULDRON_CATALOG488,...extras]){
 if(catalog.has(row.id))continue;
 const pay=payment(row),maxAmount=row.maxAmount??(['resource','material','stone'].includes(row.type)?10000:1);
 catalog.set(row.id,Object.freeze({...row,maxAmount,costAllowed:!!pay,rewardAllowed:true,...(pay?{payment:Object.freeze(pay)}:{costReason:'Etkin süre, açılmış özellik veya ilerleme; harcanabilir çanta eşyası değildir.'})}));
}
export const ZUMRUT_CATALOG_R93=Object.freeze([...catalog.values()]);
export const ZUMRUT_BY_ID_R93=catalog;
const fail=(message,code='zumrut_cost_invalid',status=422)=>{throw Object.assign(Error(message),{status,gameCode:code,zumrutRule:true});};
const q=(sql,text)=>prepareServerStatement(sql,text);
const integer=(n,max=1000000)=>Number.isSafeInteger(n)&&n>=1&&n<=max;
export function validateCostRowsR93(rows){
 if(!Array.isArray(rows)||rows.length>12)fail('En fazla 12 bedel seçebilirsin.');
 const seen=new Set(),balances=new Set();
 return rows.map(row=>{
  const item=catalog.get(row?.itemId),p=item?.payment;
  if(!item?.costAllowed||!integer(row.amount,p?.selection?35:1000000)||seen.has(item.id))fail('Bedel eşyası, miktarı veya tekrarlanan satır geçersiz.');
  seen.add(item.id);
  const key=p.selection?null:p.table+':'+(p.column??p.kind);
  if(key&&balances.has(key))fail('Aynı bakiye farklı adlarla iki kez seçilemez.');
  if(key)balances.add(key);
  return {itemId:item.id,amount:row.amount};
 });
}
const baseName=name=>String(name??'').replace(/^(?:\+[0-5]\s+)+/u,'');
function matches(item,row,now){
 if(!row||row.equipped!==0||row.sale_locked499!==0||row.expires_at_ms!==0&&row.expires_at_ms<=now||row.kind!==item.kind)return false;
 if(item.type==='gear')return row.role===item.role&&row.rarity===item.rarity&&baseName(row.item_name)===baseName(item.name);
 if(item.type==='jewelry')return row.rarity==='crafted'&&baseName(row.item_name)===item.name;
 if(item.type==='accessory')return row.rarity==='crafted'&&baseName(row.item_name)===item.name;
 if(item.type==='premium')return item.kind==='costume'?row.expires_at_ms>now:isCoupon483(item.kind)&&row.rarity==='unique';
 return item.type==='rune'&&row.rarity==='unique';
}
function balance(sql,id,item,now,inventory){
 const p=item.payment;
 if(p.table==='players')return q(sql,`SELECT ${p.column} amount FROM players WHERE id=?`).get(id)?.amount??0;
 if(p.table!=='player_items')return q(sql,`SELECT amount FROM ${p.table} WHERE player_id=? AND kind=?`).get(id,p.kind)?.amount??0;
 return inventory.filter(row=>matches(item,row,now));
}
export function costSummaryR93(sql,playerId,rows,{now=Date.now()}={}){
 rows=validateCostRowsR93(rows);
 const inventory=rows.some(r=>catalog.get(r.itemId).payment.selection)?q(sql,'SELECT id,kind,role,item_name,rarity,power,equipped,sale_locked499,expires_at_ms FROM player_items WHERE player_id=? AND equipped=0 AND sale_locked499=0 ORDER BY created_at,id LIMIT 256').all(playerId):[];
 return rows.map(row=>{
  const item=catalog.get(row.itemId),value=balance(sql,playerId,item,now,inventory),available=Array.isArray(value)?value.length:value;
  if(!Number.isSafeInteger(available)||available<0)fail('Mevcut eşya bakiyesi doğrulanamadı.','zumrut_balance_invalid',409);
  return {...row,name:item.name,available,missing:Math.max(0,row.amount-available),...(Array.isArray(value)?{requiresSelection:true,eligibleItems:value.map(v=>({id:v.id,name:v.item_name,power:v.power,rarity:v.rarity}))}:{})};
 });
}
// Validate every row and all explicit inventory selections before subtracting.
// Caller's owner-fenced transaction includes the durable operation receipt.
export function payCostRowsR93(sql,playerId,rows,{now=Date.now(),selectedItems={}}={}){
 if(!sql.isTransaction)throw Error('zumrut_payment_transaction_required');
 rows=validateCostRowsR93(rows);
 if(!selectedItems||typeof selectedItems!=='object'||Array.isArray(selectedItems)||Object.keys(selectedItems).length>12)fail('Harcanacak eşya seçimi geçersiz.');
 const selections=new Set(),plans=rows.map(row=>{
  const item=catalog.get(row.itemId),p=item.payment;
  if(p.selection){
   const ids=selectedItems[item.id];
   if(!Array.isArray(ids)||ids.length!==row.amount)fail(item.name+': harcanacak eşyaları tek tek seç.');
   for(const id of ids){
    if(typeof id!=='string'||!id||id.length>160||selections.has(id))fail('Aynı eşya iki kez harcanamaz.');
    selections.add(id);
    const owned=q(sql,'SELECT * FROM player_items WHERE id=? AND player_id=?').get(id,playerId);
    if(!matches(item,owned,now))fail(item.name+': seçilen eşya çantanda, kuşanılmamış ve kilitsiz olmalı.','zumrut_cost_changed',409);
    if(isCoupon483(item.kind)){
     try{couponActor483(sql,q(sql,'SELECT * FROM players WHERE id=?').get(playerId));verifyCoupon483(sql,owned);}catch(error){fail(error.message,'zumrut_cost_changed',409);}
    }
   }
   return {...row,item,ids};
  }
  const available=balance(sql,playerId,item,now,[]);
  if(!Number.isSafeInteger(available)||available<row.amount)fail(item.name+' yeterli değil.','zumrut_cost_missing',409);
  return {...row,item};
 });
 for(const key of Object.keys(selectedItems))if(!plans.some(p=>p.item.id===key&&p.ids))fail('Bu bedelde bulunmayan bir eşya seçildi.');
 for(const plan of plans){
  const p=plan.item.payment;
  if(plan.ids){for(const id of plan.ids){
   if(isCoupon483(plan.item.kind))q(sql,'INSERT INTO premium_receipts(id,player_id,action,product,result,created_at_ms) VALUES(?,?,?,?,?,?)').run('cpc-spent-'+id,playerId,'coupon_spent483',plan.item.kind,JSON.stringify({itemId:id,face:COUPON_FACE483[plan.item.kind],reason:'zumrut_cost_r93'}),now);
   if(q(sql,'DELETE FROM player_items WHERE id=? AND player_id=? AND equipped=0 AND sale_locked499=0').run(id,playerId).changes!==1)fail('Eşya değişti.','zumrut_cost_changed',409);
  }}
  else {
   const change=p.table==='players'?q(sql,`UPDATE players SET ${p.column}=${p.column}-? WHERE id=? AND ${p.column}>=?`).run(plan.amount,playerId,plan.amount):q(sql,`UPDATE ${p.table} SET amount=amount-? WHERE player_id=? AND kind=? AND amount>=?`).run(plan.amount,playerId,p.kind,plan.amount);
   if(change.changes!==1)fail('Bedel bakiyesi değişti.','zumrut_cost_changed',409);
   if(p.table==='dungeon_materials'&&['zumrut_axe_r93','zumrut_pickaxe_r93'].includes(p.kind))q(sql,"UPDATE zumrut_tools_r93 SET equipped='' WHERE player_id=? AND equipped=? AND NOT EXISTS(SELECT 1 FROM dungeon_materials WHERE player_id=? AND kind=? AND amount>0)").run(playerId,p.kind==='zumrut_axe_r93'?'axe':'pickaxe',playerId,p.kind);
  }
 }
 return rows;
}
const grants=new WeakMap();
function nativeGrants(sql,options){
 let entry=grants.get(sql);
 if(!entry){
  entry={options};const clock=()=>typeof entry.options.now==='function'?entry.options.now():entry.options.now;
  const random=()=>entry.options.random?.()??Math.random(),uuid=()=>entry.options.uuid?.()??randomUUID();
  entry.grant=createRewardServices({globals:options.globals??{},uuid,random,now:clock,fourChannels:true}).cauldronGrants.createCauldronGrants488(sql,{now:clock,random});grants.set(sql,entry);
 }
 entry.options=options;
 return entry.grant;
}
export function grantCatalogR93(sql,playerId,itemId,amount,{now=Date.now(),...options}={}){
 if(!sql.isTransaction)throw Error('zumrut_reward_transaction_required');
 const item=catalog.get(itemId);
 if(!item||!integer(amount,item.maxAmount))fail('Üretilecek eşya veya adet geçersiz.','zumrut_reward_invalid');
 const stamp=typeof now==='function'?now():now;
 try{
  if(CAULDRON_BY_ID488.has(itemId))return {itemId,amount,name:item.name,...nativeGrants(sql,{...options,now}).grant(playerId,{itemId,amount})};
  if(item.type==='accessory')return {itemId,amount,name:item.name,...grantAccessoriesR58(sql,item,{playerId,amount},stamp)};
 }catch(error){if([409,422].includes(error?.status))error.zumrutRule=true;throw error;}
 const p=item.payment;
 if(!p||p.selection)fail('Bu ödül teslim edilemiyor.','zumrut_reward_invalid');
 const before=balance(sql,playerId,item,stamp,[]),cap=p.table==='players'?9000000000000:1000000000;
 if(!Number.isSafeInteger(before)||before<0||before>cap-amount)fail(item.name+': bakiye sınırına ulaştın.','zumrut_balance_limit',409);
 if(p.table==='players')q(sql,`UPDATE players SET ${p.column}=${p.column}+? WHERE id=?`).run(amount,playerId);
 else q(sql,`INSERT INTO ${p.table}(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount`).run(playerId,p.kind,amount);
 return {itemId,amount,name:item.name,balance:before+amount};
}

// Inspect the whole disclosed pool, never probe or roll individual grants.
// Used only for a requested craft. A persisted hidden draw additionally keeps
// native delivery failures/cancellation from changing the selected outcome.
export function assertZumrutRewardPoolR93(sql,playerId,rewards,{now=Date.now()}={}){
 const at=typeof now==='function'?now():now;
 if(!Array.isArray(rewards)||rewards.length<1||rewards.length>32)fail('Üretim ödülleri henüz hazırlanmadı.','zumrut_reward_invalid');
 const pool=rewards.map(row=>{const item=catalog.get(row?.itemId);if(!item||!integer(row.amount,item.maxAmount))fail('Üretim ödülü geçersiz.','zumrut_reward_invalid');return {item,amount:row.amount};});
 const problem=(item,message)=>fail(item.name+': '+message+' Üretim malzemelerin harcanmadı.','zumrut_reward_unavailable',409);
 for(const table of ['dungeon_materials','player_stones']){
  const entries=pool.filter(r=>r.item.payment?.table===table);
  if(!entries.length)continue;
  const kinds=[...new Set(entries.map(r=>r.item.kind))],current=new Map(q(sql,`SELECT kind,amount FROM ${table} WHERE player_id=? AND kind IN (${kinds.map(()=>'?').join(',')})`).all(playerId,...kinds).map(r=>[r.kind,r.amount]));
  for(const {item,amount}of entries){const before=current.get(item.kind)??0;if(!Number.isSafeInteger(before)||before<0||before>1000000000-amount)problem(item,'çantandaki adet sınırına ulaştın.');}
 }
 const others=pool.filter(r=>!['dungeon_materials','player_stones'].includes(r.item.payment?.table));
 if(!others.length)return true;
 const p=q(sql,'SELECT * FROM players WHERE id=?').get(playerId);if(!p)fail('Karakter bulunamadı.','zumrut_player_missing',404);
 const increment=(item,column,amount,cap)=>{const value=p[column];if(!Number.isSafeInteger(value)||value<0||value>cap-amount)problem(item,'bakiye veya süre sınırına ulaştın.');};
 let slots=0,equipment=0;
 for(const {item,amount}of others){
  if(item.payment?.table==='players')increment(item,item.payment.column,amount,item.type==='resource'?(item.column==='core_coins'?Number.MAX_SAFE_INTEGER:9000000000000):1000000000);
  if(['gear','class','rune','jewelry','accessory'].includes(item.type)||item.type==='premium'&&isCoupon483(item.kind)){slots=Math.max(slots,amount);if(item.type!=='rune'&&!(item.type==='premium'))equipment=Math.max(equipment,amount);}
  if(item.type==='special'&&item.kind==='rod'&&p.has_rod!==0)problem(item,'zaten sahipsin.');
  if(item.type==='special'&&item.kind==='core_wings'&&q(sql,'SELECT 1 FROM dungeon_wings WHERE player_id=?').get(playerId))problem(item,'zaten sahipsin.');
  if(item.type==='rank'){
   let owned;try{owned=JSON.parse(p.rank_unlocked);}catch{problem(item,'rütbe görünümün doğrulanamadı.');}
   if(!Array.isArray(owned)||owned.includes(item.kind))problem(item,'bu görünüm zaten açık veya kayıt doğrulanamadı.');
  }
  if(item.type==='premium'){
   if(item.kind==='stall_skin'&&p.stall_skin_owned!==0)problem(item,'zaten sahipsin.');
   if(item.kind==='storage_page')increment(item,'storage_pages',amount,4);
   if(item.kind==='auto_potion')increment(item,'auto_potion_remaining',amount*1000000,9000000000000);
   if(item.kind==='costume'&&!q(sql,"SELECT 1 FROM player_items WHERE player_id=? AND kind='costume' AND role=? LIMIT 1").get(playerId,p.role))slots=Math.max(slots,1);
   const duration=item.kind==='xp_ring'||item.kind==='drop_charm'?{column:item.kind+'_until',now:Math.floor(at/1000),amount:5*86400*amount,cap:Math.floor(Number.MAX_SAFE_INTEGER/1000)}:item.kind==='wings'?{column:'wings_expires_at_ms',now:at,amount:7*86400000*amount,cap:Number.MAX_SAFE_INTEGER}:['weapon_skin','teleport_skin'].includes(item.kind)?{column:item.kind+'_expires_at_ms',now:at,amount:7*86400000*amount,cap:Number.MAX_SAFE_INTEGER}:null;
   if(duration){const value=p[duration.column];if(!Number.isSafeInteger(value)||value<0||Math.max(value,duration.now)>duration.cap-duration.amount)problem(item,'süre sınırına ulaştın.');}
  }
 }
 if(slots){
  const counts=q(sql,"SELECT COUNT(*) total,COALESCE(SUM(CASE WHEN equipped=0 AND kind IN ('weapon','armor','helmet','shoes','necklace','earring','bracelet','belt') THEN 1 ELSE 0 END),0) equipment FROM player_items WHERE player_id=?").get(playerId);
  if(counts.total+slots>500||equipment>0&&r40Options.bagLimit&&counts.equipment+equipment>BAG_EQUIPMENT_LIMIT)fail('Üretimde çıkabilecek bütün eşyalar için çantanda yer aç. Malzemelerin harcanmadı.','zumrut_reward_unavailable',409);
 }
 return true;
}
