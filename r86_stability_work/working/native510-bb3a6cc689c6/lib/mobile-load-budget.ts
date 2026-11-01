// Reliable event delivery owns fast combat. HTTP remains a repair path, with the
// original fast fallback when the socket is absent; forced inventory reads bypass it.
// Desktop with a healthy realtime socket: combat/movement arrive over the
// socket, so HTTP is only a repair path. Each world read costs the single
// game server CPU for every player at once; these values keep repair within
// 1.5 s while cutting ~35% of all HTTP world reads (and ~45% of their
// bytes). Respawn/kill/reward refreshes still force an immediate read.
export const DESKTOP_REALTIME_READ_CADENCE={combat:1500,roster:3500,full:12000};
export function worldReadCadence(connected:boolean,mobile:boolean){
 if(connected)return mobile?{combat:1500,roster:4000,full:20000}:{...DESKTOP_REALTIME_READ_CADENCE};
 return {combat:0,roster:650,full:2000};
}

// A wider snapshot already contains combat and roster data. Choose only one
// new request per sync pass; an older in-flight request never blocks repair.
export function worldReadPlan(fullDue:boolean, rosterDue:boolean, combatDue:boolean, busy:{full:boolean;roster:boolean;combat:boolean},ownerDue=false) {
 if(fullDue&&!busy.full)return {full:true,roster:false,combat:false};
 if(rosterDue&&!busy.roster)return {full:false,roster:true,combat:false};
 if(ownerDue&&!busy.full)return {full:true,roster:false,combat:false};
 return {full:false,roster:false,combat:combatDue&&!busy.combat};
}
