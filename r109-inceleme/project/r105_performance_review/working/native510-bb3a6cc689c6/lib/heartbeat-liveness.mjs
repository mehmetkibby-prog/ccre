// A delayed heartbeat is not evidence of a lost connection while authenticated
// world replies or realtime traffic still succeed. No requests/timers are added.
export const HEARTBEAT_LIVENESS_GRACE_MS=15000;
export function heartbeatFailureIsOffline({realtimeConnected,lastConfirmedAt,now}){
 if(realtimeConnected)return false;
 return !Number.isFinite(lastConfirmedAt)||now<lastConfirmedAt||now-lastConfirmedAt>=HEARTBEAT_LIVENESS_GRACE_MS;
}
