const EMERALD_SET444=Object.freeze({name:'Kadim Zümrüt Seti',slots:['weapon','armor','helmet','shoes','necklace'],bonuses:{hp:1000,pve:10,pvp:10,resistance:0,speed:12,attack:50}});
function emeraldName444(kind,role){return kind==='weapon'?({muhafiz:'Kadim Zümrüt Hükümkılıcı',avci:'Kadim Zümrüt Ufuk Yayı',arkanist:'Kadim Zümrüt Öz Asası'}[role]??'Kadim Zümrüt Hükümkılıcı'):({armor:'Kadim Zümrüt Zırhı',helmet:'Kadim Zümrüt Tacı',necklace:'Kadim Zümrüt Kalbi',shoes:'Kadim Zümrüt Çizmeleri'}[kind]??'Kadim Zümrüt');}
function emeraldPower444(kind,settings={}){if(kind==='weapon')return 350;if(kind==='armor')return 300;const unique=Math.max(1,Number(settings[kind==='weapon'?'unique_weapon_power':'unique_armor_power'])||(kind==='weapon'?180:150));const percent=Number.isFinite(Number(settings.infinite_power_percent))?Math.max(0,Number(settings.infinite_power_percent)):30;const weaponBase=Math.max(1,Number(settings.infinite_weapon_power)||230);const infinite=globalThis.__colDragonBoss?.infinitePower?.({kind,power:unique})??(kind==='weapon'&&unique<=180?Math.max(unique,weaponBase):kind==='weapon'?Math.max(unique,Math.round(unique*(1+percent/100)),weaponBase):Math.round(unique*(1+percent/100)));return Math.min(100000,Math.ceil(infinite*1.15));}
const EMERALD_CATALOG444=['muhafiz','avci','arkanist'].flatMap(role=>['weapon','armor','helmet','necklace','shoes'].map(kind=>({id:`gear:${role}:${kind}:emerald`,name:emeraldName444(kind,role),type:'gear',kind,role,rarity:'emerald',group:'Kadim Zümrüt'})));
function emeraldIconStyle444(kind,role){if(kind==='armor')return {display:'inline-block',flexShrink:0,backgroundImage:'url(/game/emerald-armor-v445.webp)',backgroundSize:'contain',backgroundPosition:'center',backgroundRepeat:'no-repeat'};const col=kind==='weapon'?Math.max(0,['muhafiz','avci','arkanist'].indexOf(role)):Math.max(0,['helmet','necklace','shoes'].indexOf(kind));return {display:'inline-block',flexShrink:0,backgroundImage:'url(/game/emerald-set-v444.webp)',backgroundSize:'300% 200%',backgroundPosition:`${col*50}% ${kind==='weapon'?0:100}%`,backgroundRepeat:'no-repeat'};}
function emeraldGroundArt444(drop){if(drop.kind==='armor')return {src:'/game/emerald-armor-v445.webp',columns:1,rows:1,col:0,row:0,glyph:'◆',label:drop.item_name??emeraldName444('armor',drop.role),color:'#39c889',rarity:'emerald'};return {src:'/game/emerald-set-v444.webp',columns:3,rows:2,col:drop.kind==='weapon'?Math.max(0,['muhafiz','avci','arkanist'].indexOf(drop.role)):Math.max(0,['helmet','necklace','shoes'].indexOf(drop.kind)),row:drop.kind==='weapon'?0:1,glyph:'◆',label:drop.item_name??emeraldName444(drop.kind,drop.role),color:'#39c889',rarity:'emerald'};}
function emeraldGrantFields444(current,change){const next={...current,...change};if(next.rarity!=='emerald')return next;return {...next,itemName:emeraldName444(next.kind,next.role),power:emeraldPower444(next.kind)};}

// One definition drives the UI, combat calculation and the VDS materialized bonuses.
// V473: two pieces unlock PvE, three unlock PvP, full sets unlock the remaining bonuses.
export const EQUIPMENT_SETS=Object.freeze({
 red:{name:'Kızıl Set',slots:['weapon','armor','shoes','necklace'],bonuses:{hp:0,pve:3,pvp:3,resistance:0,speed:3}},
 unique:{"name":"Eşsiz Set","slots":["weapon","armor","helmet","shoes","necklace"],"bonuses":{"hp":600,"pve":6,"pvp":6,"resistance":6,"speed":9}},
 purple:{name:'Mor Kök Seti',slots:['weapon','armor','helmet','shoes','necklace'],bonuses:{hp:500,pve:5,pvp:5,resistance:5,speed:5}},
 infinite:{name:'Sonsuz Set',slots:['weapon','armor','helmet','shoes','necklace'],bonuses:{hp:700,pve:7,pvp:7,resistance:7,speed:10}},
emerald:EMERALD_SET444});
export const SET_BONUS_LABELS=Object.freeze({hp:'Can',pve:'Canavarlara karşı güç',pvp:'Oyunculara karşı güç',resistance:'Oyunculara karşı savunma',speed:'Saldırı hızı',attack:"Saldırı"});
export const EQUIPMENT_SLOT_LABELS=Object.freeze({weapon:'Silah',armor:'Zırh',helmet:'Kask',shoes:'Çizme',necklace:'Kolye'});
export function equipmentSetState(rarity,items){
 const definition=EQUIPMENT_SETS[rarity];if(!definition)return null;
 const worn=new Set(items.filter(item=>item.equipped===1&&item.rarity===rarity).map(item=>item.kind));
 const count=definition.slots.filter(slot=>worn.has(slot)).length;
 const thresholds=Object.fromEntries(Object.keys(definition.bonuses).map(key=>[key,colEquipmentSetThreshold473(key,definition)]));
 const activeBonuses=Object.fromEntries(Object.entries(definition.bonuses).map(([key,value])=>[key,count>=thresholds[key]?value:0]));
 return {...definition,rarity,count,complete:count===definition.slots.length,missing:definition.slots.filter(slot=>!worn.has(slot)),thresholds,activeBonuses};
}
function colEquipmentSetThreshold473(key,definition){
 // V476: each lower tier remains active when a higher-tier piece is removed.
 // Red has no HP bonus and keeps its original three positive bonuses at 2/3/4.
 if(definition.bonuses.hp>0)return key==='hp'?2:key==='pve'?3:key==='pvp'?4:definition.slots.length;
 return key==='pve'?2:key==='pvp'?3:definition.slots.length;
}

export function equipmentSetBonuses(items){
 const total={hp:0,pve:0,pvp:0,resistance:0,speed:0,attack:0};
 for(const rarity of Object.keys(EQUIPMENT_SETS)){
  const state=equipmentSetState(rarity,items);
  for(const key of Object.keys(total))total[key]+=(state.activeBonuses[key]??0);
 }return total;
}


export {colEquipmentSetThreshold473 as equipmentSetThreshold473};
