import {randomUUID} from 'node:crypto';
import {CAULDRON_BY_ID488,validateCauldronReward488,cauldronRewardPreview488} from '../../lib/cauldron-catalog488.mjs';
import {EXTRA_PRODUCTS,COSMETIC_DURATION_MS} from '../../lib/extra-products.mjs';
import {JEWELRY456} from '../../lib/expansion456.mjs';
import {grantArenaWings477,ARENA_WINGS_DURATION_MS477} from '../../lib/arena-wings477.mjs';
import {createDragonBoss} from './dragon-boss.mjs';
import {createQuests438} from './quests438.mjs';
import {isCoupon483,mintCoupon483,verifyCoupon483,couponActor483,couponCapacity483} from './cp-coupons483.mjs';

const STACK_CAP488=1000000000;
const RESOURCE_CAP488=9000000000000;
const MAX_INTEGER488=Number.MAX_SAFE_INTEGER;
const premiumCounters488=Object.freeze({afk_ticket:'afk_tickets',enchant_add:'enchant_add_scrolls',enchant_scroll:'enchant_scrolls',item_link:'item_link_orbs',rename_scroll:'rename_scrolls'});
const roles488=new Set(['muhafiz','avci','arkanist']);
function fail488(message){throw Object.assign(Error(message),{gameCode:'cauldron_reward_invalid488',status:409});}
function safeIncrement488(value,amount,cap,label){if(!Number.isSafeInteger(value)||value<0||!Number.isSafeInteger(amount)||amount<1||value>cap-amount)fail488(label+': çantadaki miktar/süre sınırına ulaştın.');return value+amount;}
function expiry488(value,now,amount,label,cap=MAX_INTEGER488){if(!Number.isSafeInteger(value)||value<0)fail488(label+': mevcut süre geçersiz.');return safeIncrement488(Math.max(value,now),amount,cap,label);}

// No transaction, HTTP request, timer or deferred reward is created here.
// The caller atomically consumes ingredients, runs these existing grants, then
// records its receipt. The existing writer commits + fsyncs before ACK.
export function createCauldronGrants488(db,{now=Date.now,random=Math.random}={}){
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
