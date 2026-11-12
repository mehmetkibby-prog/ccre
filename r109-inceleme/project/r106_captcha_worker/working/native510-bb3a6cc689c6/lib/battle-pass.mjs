import {ARENA_CATALOG} from './arena-market.mjs';

export const BATTLE_PASS_DAY_MS=86400000;
export const BATTLE_PASS_MAX_TIERS=100;
export const BATTLE_PASS_CATALOG=[
 {id:'resource:core_coins',type:'resource',column:'core_coins',name:'Çekirdek Parası',group:'Para'},
 ...ARENA_CATALOG,
];
export const BATTLE_PASS_BY_ID=new Map(BATTLE_PASS_CATALOG.map(item=>[item.id,item]));
export function defaultBattlePassConfig(){
 const free=['resource:essence','resource:gems','resource:stone_dust'];
 const paid=['resource:essence','resource:gems','premium:enchant_scroll','resource:stone_dust','premium:auto_potion','material:wing','stone:book','premium:xp_ring','material:rune_attack'];
 return {enabled:false,title:'Kadim Miras',durationDays:20,price:1000,tiers:Array.from({length:30},(_,index)=>{
  const id=index+1,itemId=paid[index%paid.length];
  return {id,xp:Math.round(200000*id/30),free:{itemId:free[index%free.length],amount:index%3===2?5:20},premium:id%10===0?{itemId:'resource:core_coins',amount:100}:{itemId,amount:itemId.startsWith('resource:')?50:itemId.startsWith('material:')?2:1}};
 })};
}
export function validateBattlePassReward(value){
 if(value==null)return null;
 const item=BATTLE_PASS_BY_ID.get(value.itemId),amount=value.amount;
 if(!item)throw Error('Savaş bileti ödülü bulunamadı.');
 const max=item.id==='resource:core_coins'?100000:['resource','stone','material'].includes(item.type)?10000:1;
 if(!Number.isSafeInteger(amount)||amount<1||amount>max)throw Error('Savaş bileti ödül adedi geçersiz.');
 let power;
 if(item.type==='gear'||item.type==='rune'){
  power=value.power??(item.type==='rune'?1:({white:10,blue:20,orange:35,red:50,purple:70,unique:90,infinite:100,emerald:265}[item.rarity]));
  if(!Number.isSafeInteger(power)||power<(item.type==='rune'?1:0)||power>100000)throw Error('Savaş bileti eşya gücü geçersiz.');
 }
 return {itemId:item.id,amount,...(power===undefined?{}:{power})};
}
export function validateBattlePassConfig(value){
 if(!value||typeof value.enabled!=='boolean'||typeof value.title!=='string'||!value.title.trim()||value.title.trim().length>64||!Number.isSafeInteger(value.durationDays)||value.durationDays<1||value.durationDays>365||!Number.isSafeInteger(value.price)||value.price<1||value.price>1000000||!Array.isArray(value.tiers)||value.tiers.length<1||value.tiers.length>BATTLE_PASS_MAX_TIERS)throw Error('Savaş bileti sezon ayarları geçersiz.');
 let previous=0;
 const tiers=value.tiers.map((tier,index)=>{
  if(tier.id!==index+1||!Number.isSafeInteger(tier.xp)||tier.xp<=previous||tier.xp>9000000000000)throw Error('Kademeler sıralı olmalı; gerekli toplam tecrübe her kademede artmalı.');
  const free=validateBattlePassReward(tier.free),premium=validateBattlePassReward(tier.premium);
  if(!free&&!premium)throw Error('Her kademede en az bir ödül olmalı.');
  previous=tier.xp;return {id:index+1,xp:tier.xp,free,premium};
 });
 return {enabled:value.enabled,title:value.title.trim(),durationDays:value.durationDays,price:value.price,tiers};
}
export function battlePassPremiumReturn(config){return config.tiers.reduce((total,tier)=>total+(tier.premium?.itemId==='resource:core_coins'?tier.premium.amount:0),0);}

// Only embed this trusted fragment in an existing authoritative XP UPDATE.
// The normalized singleton avoids JSON work, extra requests and write commits.
// Pass the authoritative award timestamp when recovering delayed rewards so
// a pre-season kill cannot retroactively qualify for a newly started season.
export function battlePassXpSql(amountExpression,alias='players',nowExpression='unixepoch()*1000'){
 if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias))throw Error('Invalid battle pass SQL alias');
 const season='(SELECT season_id FROM battle_pass_settings WHERE id=1)',cap='(SELECT xp_cap FROM battle_pass_settings WHERE id=1)';
 const active=`${alias}.area<>'afk' AND (${amountExpression})>0 AND EXISTS(SELECT 1 FROM battle_pass_settings WHERE id=1 AND enabled=1 AND season_id<>'' AND starts_at<=(${nowExpression}) AND ends_at>(${nowExpression}))`;
 return `battle_pass_xp=CASE WHEN ${active} THEN MIN(${cap},(CASE WHEN ${alias}.battle_pass_season=${season} THEN ${alias}.battle_pass_xp ELSE 0 END)+CAST((${amountExpression}) AS INTEGER)) ELSE ${alias}.battle_pass_xp END,battle_pass_season=CASE WHEN ${active} THEN ${season} ELSE ${alias}.battle_pass_season END`;
}
