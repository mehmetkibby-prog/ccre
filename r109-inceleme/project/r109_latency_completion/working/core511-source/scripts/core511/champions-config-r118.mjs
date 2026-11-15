import {RUNE_LOOT_LABELS,defaultRuneConfig} from '../../../native510-bb3a6cc689c6/lib/runes.mjs';

export const CHAMPIONS_AREA_R118='champions';
export const CHAMPIONS_WORLD_R118=Object.freeze({width:3600,height:2400});
// Keep the entry/respawn body above the fixed bottom HUD on the fitted map.
export const CHAMPIONS_ENTRY_R118=Object.freeze({x:1800,y:1950});
export const CHAMPIONS_MOBS_R118=Object.freeze([
 Object.freeze({key:'ivory_guard',name:'Fildişi Muhafız',reference:'tide',count:12}),
 Object.freeze({key:'golden_lion',name:'Altın Yeleli Arslan',reference:'warden',count:12}),
 Object.freeze({key:'crescent_hunter',name:'Hilal Avcısı',reference:'sentinel',count:12}),
 Object.freeze({key:'royal_colossus',name:'Saltanat Devi',reference:'wraith',count:12})
]);
export const CHAMPIONS_LOOT_LABELS_R118=Object.freeze({...Object.fromEntries(Object.entries(RUNE_LOOT_LABELS).filter(([key])=>key!=='essence')),royal_crown:'Kraliyet Tacı'});
export const championsEligibleR118=player=>Number.isSafeInteger(player?.champion_level_r102)&&player.champion_level_r102>=1;
export function championsMonsterIdR118(key,channel,slot){if(!CHAMPIONS_MOBS_R118.some(m=>m.key===key)||!Number.isSafeInteger(channel)||channel<1||channel>4||!Number.isSafeInteger(slot)||slot<1||slot>12)throw Error('champions_monster_identity_r118');return `champions-${key.replaceAll('_','-')}-c${channel}-${String(slot).padStart(2,'0')}`;}
export function championsMonsterKeyR118(monster){if(monster?.area!==CHAMPIONS_AREA_R118)return null;return /^champions-(ivory-guard|golden-lion|crescent-hunter|royal-colossus)-c[1-4]-(0[1-9]|1[0-2])$/.exec(String(monster.id))?.[1]?.replaceAll('-','_')??null;}
// The joined writer may accept only the migrated ordinary catalog, never an
// arbitrary same-area row or a boss/summon masquerading as a normal monster.
export function ordinaryChampionsMonsterR118(monster){return Boolean(championsMonsterKeyR118(monster)&&monster.is_boss===0&&monster.is_stone===0&&monster.summoned===0&&Number.isSafeInteger(monster.channel)&&monster.channel>=1&&monster.channel<=4&&monster.id.includes('-c'+monster.channel+'-'));}
export function championsWalkableR118(x,y,margin=0){return Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(margin)&&margin>=0&&x>=Math.max(80,margin)&&x<=3600-Math.max(80,margin)&&y>=Math.max(100,margin)&&y<=2400-Math.max(80,margin);}
export const championsSegmentR118=(x,y,tx,ty,margin=0)=>championsWalkableR118(x,y,margin)&&championsWalkableR118(tx,ty,margin);
// Fixed irregular points keep movement deterministic without regenerating a layout
// on startup. Four species are mixed throughout the grounds; no rows or columns.
// Every spawn is at least 220px from its neighbours and 300px from arrival.
const CHAMPIONS_SCATTER_R118=Object.freeze([
 Object.freeze([2984,497]),Object.freeze([2055,440]),Object.freeze([869,949]),Object.freeze([1439,1952]),
 Object.freeze([898,1697]),Object.freeze([2217,919]),Object.freeze([842,514]),Object.freeze([328,1256]),
 Object.freeze([505,1543]),Object.freeze([625,1110]),Object.freeze([2600,1444]),Object.freeze([2570,848]),
 Object.freeze([2721,1869]),Object.freeze([1864,1569]),Object.freeze([2962,1597]),Object.freeze([1241,2090]),
 Object.freeze([2486,628]),Object.freeze([1693,441]),Object.freeze([2699,1152]),Object.freeze([3103,953]),
 Object.freeze([1422,1078]),Object.freeze([1890,748]),Object.freeze([1307,574]),Object.freeze([1184,887]),
 Object.freeze([3227,1768]),Object.freeze([3210,1218]),Object.freeze([663,1387]),Object.freeze([1077,1291]),
 Object.freeze([976,2062]),Object.freeze([2347,1795]),Object.freeze([462,876]),Object.freeze([1516,1450]),
 Object.freeze([1519,805]),Object.freeze([2932,811]),Object.freeze([1148,381]),Object.freeze([2032,1731]),
 Object.freeze([3260,1490]),Object.freeze([2300,1181]),Object.freeze([333,2059]),Object.freeze([1792,978]),
 Object.freeze([3251,524]),Object.freeze([542,616]),Object.freeze([2723,1629]),Object.freeze([2988,1912]),
 Object.freeze([546,1801]),Object.freeze([1557,1751]),Object.freeze([877,1198]),Object.freeze([2464,1982]),
]);
export const CHAMPIONS_SPAWNS_R118=Object.freeze(CHAMPIONS_SCATTER_R118.map(([x,y],index)=>Object.freeze({
 key:CHAMPIONS_MOBS_R118[index%4].key,slot:Math.floor(index/4)+1,x,y
})));
const fail=message=>{throw Object.assign(Error(message),{status:422,gameCode:'champions_config_invalid_r118'});};
const integer=(value,min,max,label)=>{if(!Number.isSafeInteger(value)||value<min||value>max)fail(label+' geçersiz.');return value;};
export function defaultChampionsConfigR118(runeV2){
 const fallback=defaultRuneConfig();
 return {enabled:true,monsters:Object.fromEntries(CHAMPIONS_MOBS_R118.map(m=>{
  const ref=runeV2?.monsters?.[m.reference]??fallback.monsters[m.reference],essence=ref.loot?.essence;
  const scale=(n,factor,min,max)=>Math.max(min,Math.min(max,Math.ceil(Number(n)*factor)));
  const baseEssence=essence?((essence.min+essence.max)/2)*essence.chance/100:0;
  return [m.key,{name:m.name,hp:scale(ref.hp,1.12,1,10000000),damage:scale(ref.damage,1.12,0,1000000),xp:scale(ref.xp,1.1,0,1000000),essence:scale(baseEssence,1.1,0,1000000),respawnSeconds:30,loot:Object.fromEntries(Object.keys(CHAMPIONS_LOOT_LABELS_R118).map(kind=>[kind,{chance:kind==='royal_crown'?2:0,min:1,max:1}]))}];
 }))};
}
export function validateChampionsConfigR118(input){
 if(!input||typeof input.enabled!=='boolean'||!input.monsters||Array.isArray(input.monsters)||Object.keys(input).some(k=>!['enabled','monsters'].includes(k)))fail('Şampiyonlar Diyarı ayarları geçersiz.');
 const out={enabled:input.enabled,monsters:{}};
 if(Object.keys(input.monsters).length!==CHAMPIONS_MOBS_R118.length)fail('Dört canavarın ayarları gerekli.');
 for(const mob of CHAMPIONS_MOBS_R118){
  const source=input.monsters[mob.key];
  if(!source||typeof source.name!=='string'||!source.name.trim()||source.name.trim().length>60||/[\u0000-\u001f\u007f]/u.test(source.name)||Object.keys(source).some(k=>!['name','hp','damage','xp','essence','respawnSeconds','loot'].includes(k)))fail(mob.name+': canavar ayarları geçersiz.');
  const row={name:source.name.trim(),hp:integer(source.hp,1,10000000,'Can'),damage:integer(source.damage,0,1000000,'Hasar'),xp:integer(source.xp,0,1000000,'Tecrübe'),essence:integer(source.essence,0,1000000,'Öz'),respawnSeconds:integer(source.respawnSeconds,1,86400,'Yeniden doğma süresi'),loot:{}};
  if(!source.loot||Array.isArray(source.loot)||Object.keys(source.loot).some(k=>!Object.hasOwn(CHAMPIONS_LOOT_LABELS_R118,k)))fail(mob.name+': bilinmeyen ganimet.');
  for(const key of Object.keys(CHAMPIONS_LOOT_LABELS_R118)){
   const r=source.loot[key];if(!r||!Number.isFinite(r.chance)||r.chance<0||r.chance>100||Object.keys(r).some(k=>!['chance','min','max'].includes(k)))fail(mob.name+': ganimet oranı geçersiz.');
   const limit=['white','blue','orange','red','purple','emerald'].includes(key)?3:100;
   row.loot[key]={chance:r.chance,min:integer(r.min,1,limit,'En az miktar'),max:integer(r.max,r.min,limit,'En fazla miktar')};
  }
  out.monsters[mob.key]=row;
 }
 return out;
}
export function championsLootSnapshotR118(settings,monster){
 const key=championsMonsterKeyR118(monster),cfg=key&&settings.config.monsters[key];if(!cfg)return null;
 return {lootSourceKey:'champions.'+key,lootProfileRevision:settings.revision,lootProfileJson:JSON.stringify({version:1,key:'champions.'+key,championsLoot:cfg.loot,championsEssence:cfg.essence})};
}
// Reuses the existing durable normal_reward_claims and world_drops grant path.
// There are no implicit global-event, premium or other-map drops on this map.
export function prepareChampionsDropsR118(profile,participants,monsterId,center,settings,now,helpers){
 if(!profile?.championsLoot||!participants.length)return [];
 const random=helpers.random,uuid=helpers.uuid,owner=participants[Math.min(participants.length-1,Math.floor(random()*participants.length))],rows=[];
 const add=(kind,label,rarity,power,amount,role=null,enchants='[]')=>rows.push([uuid(),owner.player_id,monsterId,kind,label,rarity,power,amount,role,enchants,center.x+(rows.length%5)*10,center.y+Math.floor(rows.length/5)*8,now+30,now+5]);
 if(profile.championsEssence>0)add('essence','Yaşam Özü','white',0,profile.championsEssence);
 for(const [kind,rule]of Object.entries(profile.championsLoot)){
  if(!Object.hasOwn(CHAMPIONS_LOOT_LABELS_R118,kind))throw Error('champions_reward_kind_r118');
  if(!(rule.chance>0)||random()*100>=rule.chance)continue;
  const amount=rule.min+Math.floor(random()*(rule.max-rule.min+1));
  if(['white','blue','orange','red','purple','emerald'].includes(kind)){
   for(let i=0;i<amount;i++){const slot=['weapon','armor','helmet','shoes','necklace'][Math.floor(random()*5)],role=helpers.role(),item={type:'gear',family:'generic',kind:slot,rarity:kind};add(slot,helpers.name(item,role),kind,helpers.power(item,settings),1,role,JSON.stringify(helpers.enchants(settings,slot)));}
  }else add(kind,CHAMPIONS_LOOT_LABELS_R118[kind],kind.startsWith('rune_')?'unique':kind==='royal_crown'?'royal':'white',0,amount);
 }
 return rows;
}
