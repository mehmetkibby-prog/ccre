import {ensureGemBank485,gemBankSnapshot485,gemBankAct485} from './gem-bank485.mjs';
import {isCoupon483,verifyCoupon483,couponActor483,couponCapacity483} from './cp-coupons483.mjs';
import {PROGRESSION_MATERIALS} from '../../lib/progression-materials.mjs';
import {randomUUID} from 'node:crypto';
import {TRADE_COUNTERS,TRADE_STONES} from './player-trade.mjs';
import {PREMIUM_ITEMS} from '../../lib/premium-catalog.mjs';
const stones={...TRADE_STONES};
for(const [kind,values] of Object.entries({attack:[20,25,30],defense:[30,40,50],critical:[7,8,9,10],block:[6,7,8]}))for(const value of values)stones[`${kind}:${value}`]=`${TRADE_STONES[kind]} ${['critical','block'].includes(kind)?'%':'+'}${value}`;
const counters={...TRADE_COUNTERS,essence:'Yaşam Özü',item_link_orbs:'Eşya Yansıtma',enchant_scrolls:'Efsun Değiştirme Parşömeni',enchant_add_scrolls:'Efsun Artırma Nesnesi',fifth_enchant_scrolls:'5. Efsun Nesnesi',rename_scrolls:'İsim Değiştirme'};
const premiumCounters=new Set(['item_link_orbs','enchant_scrolls','enchant_add_scrolls','rename_scrolls']);
const flags={has_rod:{label:'Balıkçı Oltası',active:'rod_equipped'},has_wings:{label:'Kızıl Çekirdek Kanatları',active:'wings_equipped',expiry:'wings_expires_at_ms',premium:1},weapon_skin_owned:{label:PREMIUM_ITEMS.weapon_skin.name,active:'weapon_skin_enabled',expiry:'weapon_skin_expires_at_ms',premium:1},teleport_skin_owned:{label:PREMIUM_ITEMS.teleport_skin.name,active:'teleport_skin_enabled',expiry:'teleport_skin_expires_at_ms',premium:1},stall_skin_owned:{label:PREMIUM_ITEMS.stall_skin.name,active:'stall_skin_enabled',premium:1},auto_potion_owned:{label:PREMIUM_ITEMS.auto_potion.name,active:'auto_potion_enabled',extra:['auto_potion_remaining','auto_potion_total'],premium:1}};
const buffs={xp_ring_until:'Tecrübe Yüzüğü',drop_charm_until:'Ganimet Tılsımı'};
const pets={starter:'Başlangıç Tilkisi',bird:'Kuş Peti',monkey:'Maymun Peti',dog:'Köpek Peti',dragon:'Ejderha Peti'};
const materials={"halloween_pumpkin":"Bal Kabağı","witch_wand":"Cadının Sihirli Değneği","halloween_candy":"Cadı Şekeri",wing:'Kanat Parçası',infinite:'Sonsuz Taşı Parçası',pet:'Ejderha Parçası',...Object.fromEntries(Object.entries(PROGRESSION_MATERIALS).map(([k,v])=>[k,v.label]))};
const gearFields=['sale_locked499','kind','item_name','rarity','power','role','enchantments','created_at','premium_origin','expires_at_ms'];
const quantity=n=>{if(!Number.isSafeInteger(n)||n<1||n>1000000000)throw new Error('Geçerli bir adet seç.');return n;};
// Merge only fungible resources. Gear, pets, timed products and reward ledgers keep identity.
function stackKey(item){
 const catalog=item.storage_type==='counter'?counters:item.storage_type==='stone'?stones:item.storage_type==='material'?materials:null;
 if(!catalog||!Object.hasOwn(catalog,item.kind)||!Number.isSafeInteger(item.amount)||item.amount<1||item.amount>1000000000||item.expires_at_ms)return null;
 let payload;try{payload=JSON.parse(item.payload??'{}');}catch{return null;}
 if(!payload||Array.isArray(payload)||typeof payload!=='object')return null;
 const tracked=Object.hasOwn(payload,'paid');
 if(tracked&&(!['pearls','potions','essence','gems'].includes(item.kind)||!Number.isSafeInteger(payload.paid)||payload.paid<0||payload.paid>item.amount))return null;
 const extra=Object.keys(payload).filter(k=>k!=='paid').sort().map(k=>[k,payload[k]]);
 return JSON.stringify([item.storage_type,item.kind,item.rarity,item.power,item.role,item.enchantments,extra,tracked?'paid-counter':item.premium_origin]);
}
function mergeStack(db,target,source){
 const payload=JSON.parse(target.payload),other=JSON.parse(source.payload);
 if(Object.hasOwn(payload,'paid'))payload.paid+=other.paid;
 const amount=target.amount+source.amount,premium=Object.hasOwn(payload,'paid')?(payload.paid>0?1:0):target.premium_origin;
 db.prepare('UPDATE player_storage_items SET amount=?,payload=?,premium_origin=? WHERE id=? AND player_id=?').run(amount,JSON.stringify(payload),premium,target.id,target.player_id);
 Object.assign(target,{amount,payload:JSON.stringify(payload),premium_origin:premium});
}
function compactStacks(db,rows){
 const groups=new Map();
 for(const item of rows){
  const key=stackKey(item);if(key===null)continue;
  const candidates=groups.get(key)??[],target=candidates.find(r=>r.amount+item.amount<=1000000000);
  if(target){mergeStack(db,target,item);db.prepare('DELETE FROM player_storage_items WHERE id=? AND player_id=?').run(item.id,item.player_id);}
  else{candidates.push(item);groups.set(key,candidates);}
 }
}
export function ensureStorageSchema(db){
 ensureGemBank485(db);
 const cols=new Set(db.prepare('PRAGMA table_info(player_storage_items)').all().map(r=>r.name));
 for(const [name,definition] of Object.entries({storage_type:"TEXT NOT NULL DEFAULT 'gear'",amount:'INTEGER NOT NULL DEFAULT 1',payload:"TEXT NOT NULL DEFAULT '{}'"}))if(!cols.has(name))db.exec(`ALTER TABLE player_storage_items ADD COLUMN ${name} ${definition}`);
 db.exec('CREATE TABLE IF NOT EXISTS storage_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,result TEXT NOT NULL,created_at_ms INTEGER NOT NULL,PRIMARY KEY(player_id,request_id)); CREATE INDEX IF NOT EXISTS storage_receipt_time ON storage_receipts(created_at_ms)');
}
export function createStorage(db,{now=Date.now}={}){
 const player=id=>{const p=db.prepare('SELECT * FROM players WHERE id=?').get(id);if(!p)throw new Error('Karakter bulunamadı.');return p;};
 const nearby=p=>{if(p.area!=='bazaar'||Math.hypot(p.x-1790,p.y-1110)>280)throw new Error('Depocu Rauf’un yanına yaklaşmalısın.');if(p.hp<=0||p.combat_lock_until_ms>now()||p.arena_match_id)throw new Error('Depoyu savaş dışında kullanabilirsin.');};
 const unexpired=expiry=>!expiry||expiry>now();
 function inventory(p,key){
  const selected=key!==undefined,wants=(type,kind)=>!selected||key===type+':'+kind;
  // A selected deposit only looks up its namespace. Keep the indexed legacy
  // bare gear-ID lookup first, including IDs that happen to contain a colon.
  const gear=selected?db.prepare('SELECT * FROM player_items WHERE player_id=? AND equipped=0 AND id IN (?,?) ORDER BY created_at DESC').all(p.id,key,key.startsWith('gear:')?key.slice(5):key):db.prepare('SELECT * FROM player_items WHERE player_id=? AND equipped=0 ORDER BY created_at DESC').all(p.id);
  const out=gear.filter(i=>unexpired(i.expires_at_ms)).map(i=>({...i,key:'gear:'+i.id,storage_type:'gear',amount:1}));
  if(selected&&out.length)return out;
  const rows=(sql,type,column='kind')=>!selected?db.prepare(sql).all(p.id):key.startsWith(type+':')?db.prepare(sql+' AND '+column+'=?').all(p.id,key.slice(type.length+1)):[];
  const add=(type,kind,label,amount=1,extra={})=>{if(wants(type,kind)&&amount>0)out.push({key:type+':'+kind,storage_type:type,kind,item_name:label,amount,rarity:'blue',...extra});};
  for(const [kind,label] of Object.entries(counters))add('counter',kind,label,Number(p[kind]??0));
  for(const [table,type,catalog] of [['player_stones','stone',stones],['dungeon_materials','material',materials]])for(const row of rows(`SELECT kind,amount FROM ${table} WHERE player_id=?`,type))if(Object.hasOwn(catalog,row.kind))add(type,row.kind,catalog[row.kind],row.amount);
  for(const [kind,def] of Object.entries(flags))if(p[kind]&&unexpired(p[def.expiry]))add('flag',kind,def.label,1,{expires_at_ms:p[def.expiry]??0,blocked:p[def.active]?'Önce çıkar / devre dışı bırak.':undefined});
  for(const [kind,label] of Object.entries(buffs))if(p[kind]*1000>now())add('buff',kind,label,1,{expires_at_ms:p[kind]*1000});
  for(const pet of rows('SELECT * FROM player_pets WHERE player_id=?','pet')){const expiry=(pet.acquired_at+(pet.kind==='starter'?259200:604800))*1000;if(Object.hasOwn(pets,pet.kind)&&unexpired(expiry))add('pet',pet.kind,pet.name||pets[pet.kind],1,{expires_at_ms:expiry,blocked:pet.equipped?'Önce petini gönder.':undefined});}
  if(wants('wings','core')){const wings=db.prepare('SELECT equipped FROM dungeon_wings WHERE player_id=?').get(p.id);if(wings)add('wings','core','Kalbin Işığı Kanatları',1,{blocked:wings.equipped?'Önce kanadını çıkar.':undefined});}
  if(wants('starter','prereg')){const chest=db.prepare('SELECT account_id FROM prereg_rewards WHERE player_id=? AND opened_at_ms=0').get(p.id);if(chest)add('starter','prereg','Başlangıç Sandığı');}
  for(const row of rows('SELECT request_id FROM starter_admin_grants WHERE player_id=? AND opened_at_ms=0','starter','request_id'))add('starter',row.request_id,'Başlangıç Sandığı');
  return out;
 }
 function snapshot(id){const p=player(id);nearby(p);
  // At most this player's depot is inspected; no world-wide migration or recurring scan.
  const rows=db.prepare('SELECT * FROM player_storage_items WHERE player_id=? ORDER BY slot').all(id),seen=new Set();
  const duplicate=rows.some(item=>{const key=stackKey(item);if(key===null)return false;if(seen.has(key))return true;seen.add(key);return false;});
  if(duplicate){db.exec('BEGIN IMMEDIATE');try{compactStacks(db,db.prepare('SELECT * FROM player_storage_items WHERE player_id=? ORDER BY slot').all(id));db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}}
  return {gemBank:gemBankSnapshot485(db,p),capacity:48+24*Math.max(0,Math.min(4,p.storage_pages??0)),items:(duplicate?db.prepare('SELECT * FROM player_storage_items WHERE player_id=? ORDER BY slot').all(id):rows).map(({payload,...i})=>({...i,expired:!unexpired(i.expires_at_ms)})),inventory:inventory(p)};}
 function act(id,input,accountId){
  if(input?.action==='gem_bank_deposit'||input?.action==='gem_bank_withdraw')return gemBankAct485(db,id,input,accountId,{now,nearby});
  const action=input.action,key=String(input.itemId??''),requestId=String(input.requestId??''),amount=quantity(input.amount??1);
  if(!['storage_deposit','storage_withdraw'].includes(action)||!key||key.length>200||!/^[-a-zA-Z0-9]{16,80}$/.test(requestId))throw new Error('Depo işlemi geçersiz.');
  const fingerprint=JSON.stringify([action,key,amount]);db.exec('BEGIN IMMEDIATE');
  try{
   const p=player(id);nearby(p);
   const old=db.prepare('SELECT * FROM storage_receipts WHERE player_id=? AND request_id=?').get(id,requestId);
   if(old){if(old.fingerprint!==fingerprint)throw new Error('İşlem kimliği zaten kullanıldı.');db.exec('COMMIT');return JSON.parse(old.result);}
   let message,storedSlot;
   if(action==='storage_deposit'){
    const item=inventory(p,key).find(i=>i.key===key||i.storage_type==='gear'&&i.id===key);if(!item)throw new Error('Eşya çantanda değil veya kuşanılmış.');if(item.blocked)throw new Error(item.blocked);if(amount>item.amount)throw new Error('Yeterli eşyan yok.');
    compactStacks(db,db.prepare('SELECT * FROM player_storage_items WHERE player_id=? ORDER BY slot').all(id));
    const type=item.storage_type,k=item.kind;let payload={},premium=0,expiry=item.expires_at_ms??0,storageId=randomUUID();
    if(type==='gear'){if(isCoupon483(k)){couponActor483(db,p);verifyCoupon483(db,item);}storageId=item.id;premium=item.premium_origin??0;db.prepare('DELETE FROM player_items WHERE id=? AND player_id=? AND equipped=0').run(item.id,id);}
    else if(type==='counter'){
     const paidKey='wheel_paid_'+k,paidBalance=Number(p[paidKey]??0);const paid=Math.max(0,amount-Math.max(0,p[k]-paidBalance));
     if(Object.hasOwn(p,paidKey))payload.paid=paid;
     premium=premiumCounters.has(k)||paid>0?1:0;
     db.prepare(`UPDATE players SET ${k}=${k}-? WHERE id=?`).run(amount,id);
    }else if(type==='stone'||type==='material'){const table=type==='stone'?'player_stones':'dungeon_materials';db.prepare(`UPDATE ${table} SET amount=amount-? WHERE player_id=? AND kind=?`).run(amount,id,k);}
    else if(type==='flag'){const def=flags[k];premium=def.premium??0;if(k==='has_wings')premium=db.prepare("SELECT 1 FROM premium_receipts WHERE player_id=? AND ((action='buy' AND product='wings:1') OR (action='wheel_spin' AND json_extract(result,'$.wheel.rewardId')='wings_3d')) UNION ALL SELECT 1 FROM support_pack_grants WHERE player_id=? UNION ALL SELECT 1 FROM epin_codes WHERE redeemed_by_player_id=? AND status='redeemed' AND product_code NOT LIKE 'core-coins-%' LIMIT 1").get(id,id,id)?1:0;for(const field of def.extra??[])payload[field]=p[field];db.prepare(`UPDATE players SET ${k}=0,${def.active}=0${def.expiry?`,${def.expiry}=0`:''}${k==='auto_potion_owned'?',auto_potion_remaining=0':''} WHERE id=?`).run(id);}
    else if(type==='buff'){premium=1;db.prepare(`UPDATE players SET ${k}=0 WHERE id=?`).run(id);}
    else if(type==='pet'){payload=db.prepare('SELECT * FROM player_pets WHERE player_id=? AND kind=?').get(id,k);premium=['bird','monkey','dog'].includes(k)?1:0;db.prepare('DELETE FROM player_pets WHERE player_id=? AND kind=?').run(id,k);}
    else if(type==='wings')db.prepare('DELETE FROM dungeon_wings WHERE player_id=?').run(id);
    else if(type==='starter'){premium=1;const ref=item.key.slice(8);payload={ref};if(ref==='prereg')db.prepare('UPDATE prereg_rewards SET opened_at_ms=-1 WHERE player_id=? AND opened_at_ms=0').run(id);else db.prepare('UPDATE starter_admin_grants SET opened_at_ms=-1 WHERE player_id=? AND request_id=? AND opened_at_ms=0').run(id,ref);}
    const incoming={storage_type:type,kind:k,rarity:item.rarity??'blue',power:item.power??0,role:item.role??p.role,enchantments:item.enchantments??'[]',premium_origin:premium,expires_at_ms:expiry,amount,payload:JSON.stringify(payload)};
    const rows=db.prepare('SELECT * FROM player_storage_items WHERE player_id=? ORDER BY slot').all(id),signature=stackKey(incoming);
    const target=signature===null?null:rows.find(row=>stackKey(row)===signature&&row.amount+amount<=1000000000);
    let slot=target?.slot;
    if(target)mergeStack(db,target,incoming);
    else{
     const occupied=new Set(rows.map(r=>r.slot));slot=1;while(occupied.has(slot))slot++;
     if(slot>48+24*Math.max(0,Math.min(4,p.storage_pages??0)))throw new Error('Depo dolu.');
     db.prepare('INSERT INTO player_storage_items(id,player_id,slot,kind,item_name,rarity,power,role,enchantments,created_at,premium_origin,expires_at_ms,storage_type,amount,payload,sale_locked499) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(storageId,id,slot,k,item.item_name,item.rarity??'blue',item.power??0,item.role??p.role,item.enchantments??'[]',item.created_at??Math.floor(now()/1000),premium,expiry,type,amount,JSON.stringify(payload),type==='gear'&&item.sale_locked499===1?1:0);
    }
    storedSlot=slot;
    message='Eşya depoya bırakıldı.';
   }else{
    const item=db.prepare('SELECT * FROM player_storage_items WHERE id=? AND player_id=?').get(key,id);if(!item)throw new Error('Eşya depoda bulunamadı.');const k=item.kind,type=item.storage_type,payload=JSON.parse(item.payload);
    if(!unexpired(item.expires_at_ms)){db.prepare('DELETE FROM player_storage_items WHERE id=? AND player_id=?').run(key,id);message='Süresi dolmuş eşya depodan temizlendi.';}
    else{
     if(amount>item.amount)throw new Error('Depoda bu kadar eşya yok.');
     if(type==='gear'&&isCoupon483(k)){couponActor483(db,p);verifyCoupon483(db,{...item,equipped:0});couponCapacity483(db,p.id);}
     if(type==='gear')db.prepare('INSERT INTO player_items(id,player_id,'+gearFields.join(',')+',equipped) VALUES('+Array(gearFields.length+2).fill('?').join(',')+',0)').run(item.id,id,...gearFields.map(f=>item[f]));
     else if(type==='counter'){
      if(!Object.hasOwn(counters,k))throw new Error('Eşya türü desteklenmiyor.');if(!Number.isSafeInteger(p[k]+amount)||p[k]+amount>1000000000)throw new Error('Çantadaki adet sınırına ulaştın.');
      const paid=Math.min(payload.paid??0,amount);db.prepare(`UPDATE players SET ${k}=${k}+?${Object.hasOwn(payload,'paid')?`,wheel_paid_${k}=wheel_paid_${k}+?`:''} WHERE id=?`).run(...(Object.hasOwn(payload,'paid')?[amount,paid,id]:[amount,id]));if(Object.hasOwn(payload,'paid'))payload.paid-=paid;
     }else if(type==='stone'||type==='material'){const table=type==='stone'?'player_stones':'dungeon_materials',catalog=type==='stone'?stones:materials;if(!Object.hasOwn(catalog,k))throw new Error('Eşya türü desteklenmiyor.');const count=db.prepare(`SELECT amount FROM ${table} WHERE player_id=? AND kind=?`).get(id,k)?.amount??0;if(count+amount>1000000000)throw new Error('Çantadaki adet sınırına ulaştın.');db.prepare(`INSERT INTO ${table}(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount`).run(id,k,amount);}
     else if(type==='flag'){const def=flags[k];if(!def)throw new Error('Eşya türü desteklenmiyor.');if(p[k]&&unexpired(p[def.expiry]))throw new Error('Bu eşyadan çantanda zaten var. Önce mevcut olanı kullan veya depoya bırak.');db.prepare(`UPDATE players SET ${k}=1,${def.active}=0${def.expiry?`,${def.expiry}=?`:''}${(def.extra??[]).map(f=>`,${f}=?`).join('')} WHERE id=?`).run(...(def.expiry?[item.expires_at_ms]:[]),...(def.extra??[]).map(f=>payload[f]),id);}
     else if(type==='buff'){if(!buffs[k])throw new Error('Eşya türü desteklenmiyor.');if(p[k]*1000>now())throw new Error('Bu etkinin yenisi zaten aktif. Önce onu depoya bırak veya süresinin dolmasını bekle.');db.prepare(`UPDATE players SET ${k}=? WHERE id=?`).run(item.expires_at_ms/1000,id);}
     else if(type==='pet'){db.prepare("DELETE FROM player_pets WHERE player_id=? AND kind=? AND (acquired_at+CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)*1000<=?").run(id,k,now());if(db.prepare('SELECT 1 FROM player_pets WHERE player_id=? AND kind=?').get(id,k))throw new Error('Bu pet çantanda zaten var. Önce mevcut peti depoya bırak.');db.prepare('INSERT INTO player_pets(player_id,kind,equipped,acquired_at,name) VALUES(?,?,0,?,?)').run(id,k,payload.acquired_at,payload.name??'');}
     else if(type==='wings'){if(db.prepare('SELECT 1 FROM dungeon_wings WHERE player_id=?').get(id))throw new Error('Kalbin Işığı çantanda zaten var.');db.prepare('INSERT INTO dungeon_wings(player_id,equipped) VALUES(?,0)').run(id);}
     else if(type==='starter'){const result=payload.ref==='prereg'?db.prepare('UPDATE prereg_rewards SET opened_at_ms=0 WHERE player_id=? AND opened_at_ms=-1').run(id):db.prepare('UPDATE starter_admin_grants SET opened_at_ms=0 WHERE player_id=? AND request_id=? AND opened_at_ms=-1').run(id,payload.ref);if(result.changes!==1)throw new Error('Başlangıç Sandığı kaydı doğrulanamadı.');}
     else throw new Error('Bu eşya türü için sunucu güncellemesi gerekli.');
     if(amount===item.amount)db.prepare('DELETE FROM player_storage_items WHERE id=? AND player_id=?').run(key,id);else db.prepare('UPDATE player_storage_items SET amount=amount-?,payload=?,premium_origin=? WHERE id=? AND player_id=?').run(amount,JSON.stringify(payload),Object.hasOwn(payload,'paid')?(payload.paid>0?1:0):item.premium_origin,key,id);
     message='Eşya çantana alındı.';
    }
   }
   const result={ok:true,message,...(storedSlot?{slot:storedSlot}:{})};db.prepare('INSERT INTO storage_receipts VALUES(?,?,?,?,?)').run(id,requestId,fingerprint,JSON.stringify(result),now());db.prepare('DELETE FROM storage_receipts WHERE created_at_ms<?').run(now()-86400000);db.exec('COMMIT');return result;
  }catch(error){db.exec('ROLLBACK');throw error;}
 }
 return {snapshot,act};
}
