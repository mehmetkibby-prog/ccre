import {mountRewardResult} from './mounts-rewards.mjs';
import {nativeHeartbeatMaintenance} from './generated/heartbeat-rules.mjs';
import {createAttackWriterRules} from './generated/attack-writer-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {captureReturnOwners,reconcileReturnOwners} from './guild-war.mjs';
import {demand} from './contract.mjs';

export function runHeartbeatMaintenance(sql,entry,{services,settings,authority}){
 demand(sql.isTransaction&&services.active&&entry,'heartbeat_maintenance_atomic');
 const before=captureReturnOwners(sql),events=[],record=(...args)=>events.push(args),sync=value=>{demand(!value?.then,'heartbeat_maintenance_async');return value;},rng=services.active;
 const rules=createAttackWriterRules({...rng,globals:services.globals,now:()=>entry.nowMs,fourChannels:true,ports:{publishRealtimeRoomEvent:record,publishRealtimeRoomEventToChannels:record,publishRealtimePlayerEvent:record,publishRealtimeWorldEvent:record,deliverRealtime:sync,runRewardDelivery:(_db,key,fn)=>mountRewardResult(services.globals,key,sync(fn()))}});
 // World upkeep and bounded cleanup are already owned by the surrounding
 // shared-world scheduler. Only that owner invokes their native transactions.
 const result=nativeHeartbeatMaintenance(nativeAtomicStatements(sql),{heartbeat:entry.heartbeat,playerId:entry.actor,heartbeatNowMs:entry.nowMs,now:Math.floor(entry.nowMs/1000),cycle:entry.cycle,settings},{rules,publishRealtimeRoomEvent:record,deliverRealtime:sync,tickWorld:()=>{},cleanupWorld:()=>{},runRewardMaintenance:(_db,fn)=>sync(fn())});
 return {result,events,moves:reconcileReturnOwners(sql,before,entry.nowMs,{authority})};
}
