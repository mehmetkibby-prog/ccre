// Shared royal item contract. Pure data only: safe for clients, the writer and catalogs.
export const ROYAL_KINDS_R118=Object.freeze(['weapon','armor','helmet','shoes','necklace']);
export const ROYAL_ROLES_R118=Object.freeze(['muhafiz','avci','arkanist']);
export const ROYAL_ACTIONS_R118=Object.freeze(['royal_read_r118','royal_transform_r118','royal_salvage_r118']);
export const ROYAL_POWER_BONUS_R118=8;
export const ROYAL_SET_NAME_R118='Hükümdar Kraliyet Seti';
export const ROYAL_LOCATIONS_R118=Object.freeze({
 salvage:Object.freeze({area:'bazaar',x:1200,y:390,radius:245}),
 transform:Object.freeze({area:'bazaar',x:1740,y:390,radius:245})
});
export const ROYAL_MATERIALS_R118=Object.freeze([
 Object.freeze({id:'material:emerald_dust',kind:'emerald_dust',name:'Zümrüt Tozu',type:'material',group:'Kraliyet',maxAmount:1000000,payment:Object.freeze({table:'dungeon_materials',kind:'emerald_dust'}),costAllowed:true,rewardAllowed:true}),
 Object.freeze({id:'material:royal_crown',kind:'royal_crown',name:'Kraliyet Tacı',type:'material',group:'Kraliyet',maxAmount:1000000,payment:Object.freeze({table:'dungeon_materials',kind:'royal_crown'}),costAllowed:true,rewardAllowed:true})
]);
export function royalNameR118(kind,role){
 if(kind==='weapon')return ({muhafiz:'Kraliyet Hükümkılıcı',avci:'Kraliyet Hilal Yayı',arkanist:'Kraliyet Saltanat Asası'})[role]??'Kraliyet Silahı';
 return ({armor:'Kraliyet Hükümdar Zırhı',helmet:'Kraliyet Miğferi',shoes:'Kraliyet Çizmeleri',necklace:'Kraliyet Nişanı'})[kind]??'Kraliyet Eşyası';
}
export function royalErrorR118(message,code='royal_invalid_r118',status=422){return Object.assign(Error(message),{gameCode:code,status,royalRuleR118:true});}
