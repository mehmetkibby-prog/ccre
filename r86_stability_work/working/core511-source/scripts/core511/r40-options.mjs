// Options are captured once per process; installer flag changes restart owners.
export const BAG_EQUIPMENT_LIMIT=35;
export function readR40Options(env=process.env){
 const enabled=name=>env[name]!=='0';
 return Object.freeze({
  mobileMenu:enabled('CORE511_MOBILE_MENU'),
  inventoryWrap:enabled('CORE511_INVENTORY_WRAP'),
  mistAutoTarget:enabled('CORE511_MIST_AUTO_TARGET'),
  enchantmentDisplay:enabled('CORE511_ENCHANT_DISPLAY'),
  towerMaterialIcons:enabled('CORE511_TOWER_MATERIAL_ICONS'),
  bagLimit:enabled('CORE511_BAG_LIMIT'),
  bagClientGuard:enabled('CORE511_BAG_CLIENT_GUARD'),
  towerFirstHit:enabled('CORE511_TOWER_FIRST_HIT'),
  monsterRespawnVisibility:enabled('CORE511_MONSTER_RESPAWN_VISIBILITY'),
  reconnectRecovery:enabled('CORE511_RECONNECT_RECOVERY')
 });
}
export const r40Options=readR40Options();
export function clientR40Options(options=r40Options){
 return Object.freeze({mobileMenu:options.mobileMenu,inventoryWrap:options.inventoryWrap,
  mistAutoTarget:options.mistAutoTarget,enchantmentDisplay:options.enchantmentDisplay,towerMaterialIcons:options.towerMaterialIcons,reconnectRecovery:options.reconnectRecovery,
  bagLimit:options.bagLimit?BAG_EQUIPMENT_LIMIT:null,...(options.bagLimit&&options.bagClientGuard===true?{bagClientGuard:true}:{})});
}
export const R40_UI_OPTIONS_BODY=JSON.stringify(clientR40Options());
