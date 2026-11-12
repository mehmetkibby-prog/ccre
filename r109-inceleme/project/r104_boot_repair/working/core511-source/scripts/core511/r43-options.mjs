// Captured once per owner; installer changes restart the processes.
export function readR43Options(env=process.env){
 return Object.freeze({towerMarket:env.CORE511_TOWER_MARKET!=='0',pvpAutoTarget:env.CORE511_PVP_AUTO_TARGET!=='0',remoteAttackAnimation:env.CORE511_REMOTE_ATTACK_ANIMATION!=='0',remoteMotionLatency:env.CORE511_REMOTE_MOTION_LATENCY!=='0',nativeParameterSlots:env.CORE511_NATIVE_PARAMETER_SLOTS!=='0'});
}
export const r43Options=readR43Options();
export const R43_UI_OPTIONS_BODY=JSON.stringify(r43Options);
