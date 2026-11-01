// One item kind is intentional: the existing equipped-slot UNIQUE index is
// the database authority for both variants sharing a single equipment slot.
const make=(variant,name,attack,hp,experiencePercent,strongPlayers)=>Object.freeze({id:variant,variant,kind:'belt',name,image:'/game/belt-'+variant+'-r31.webp',attack,hp,experiencePercent,strongPlayers});
export const BELTS_R31=Object.freeze({
 wisdom:make('wisdom','Bilgelik Kemeri',50,0,20,0),
 sovereign:make('sovereign','Hükümdar Kemeri',0,1500,0,10),
});
const ingredient=(kind,name,amount,image)=>Object.freeze({kind,name,label:name,amount,image});
export const BELT_RECIPE_R31=Object.freeze([
 ingredient('forge_ember491','Kor Mührü',100,'/game/forge-ember-v491.webp'),
 ingredient('tower_seal_shard','Kadim Kat Mührü',100,null),
 ingredient('tower_chain_ore','Ruh Zinciri Halkası',100,null),
 ingredient('tower_mourning_essence','Sinsi Taş Çekirdeği',100,null),
 ingredient('tower_azrail_seal','Matem İpeği',50,null),
 ingredient('tower_azrail_hook','Azrail Kancası',10,null),
]);
export const BELT_ACTIONS_R31=Object.freeze(['craft_belt_r31','equip_belt_r31','unequip_belt_r31']);
export function beltDefinition(item){
 if(!item||item.kind!=='belt')return null;
 return Object.values(BELTS_R31).find(def=>def.name===item.item_name)??null;
}
export function validBeltItem(item){
 return !!beltDefinition(item)&&item.rarity==='crafted'&&item.power===0&&item.role==='all'&&item.enchantments==='[]'&&Number(item.expires_at_ms??0)===0&&Number(item.premium_origin??0)===0;
}
export function beltStats(items){
 const empty={attack:0,hp:0,experiencePercent:0,strongPlayers:0};
 const worn=(items??[]).filter(i=>i.equipped===1&&i.kind==='belt');
 // A corrupt or unrecognised row never creates bonuses. The durable slot
// index prevents two rows; this guard also protects transient projections.
 if(worn.length!==1)return empty;
 const def=validBeltItem(worn[0])?beltDefinition(worn[0]):null;
 return def?Object.fromEntries(Object.keys(empty).map(k=>[k,def[k]])):empty;
}
export const BELT_PAKIZE_R31=Object.freeze({name:'Zanaat Ustası Pakize',area:'bazaar',x:1070,y:390,reach:245});
