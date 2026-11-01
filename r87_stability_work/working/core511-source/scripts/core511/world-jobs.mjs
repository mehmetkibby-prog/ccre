import {createWorldJobRules} from './generated/world-job-rules.mjs';
import {createRespawnRules} from './generated/respawn-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {demand} from './contract.mjs';
import {readWorldPoint} from './world-state.mjs';
import {finishGuildWars} from './guild-war.mjs';
import {runHeartbeatMaintenance} from './heartbeat-maintenance.mjs';
import {createDungeonLifecycle} from './dungeon-lifecycle.mjs';

function dependencies({services,clock=Date.now}){
 const rules=createWorldJobRules({globals:services.globals,now:()=>services.active?.nowMs??clock(),uuid:()=>{demand(services.active,'world_job_random_context');return services.active.uuid();}}),defaults=createRespawnRules({globals:services.globals}).defaults;
 const settings=sql=>({...defaults,...sql.prepare('SELECT * FROM game_settings WHERE id=1').get(),...sql.prepare('SELECT * FROM economy_settings WHERE id=1').get(),...sql.prepare('SELECT * FROM combat_settings WHERE id=1').get()});
 const validate=(sql,payload,context)=>{demand(sql.isTransaction&&context.peer.channel===0&&context.peer.role==='world','world_job_owner');demand(Number.isSafeInteger(payload?.nowMs)&&payload.nowMs>=0&&payload.nowMs<=clock()+5000&&Number.isSafeInteger(payload.cycle),'world_job_payload');const state=sql.prepare('SELECT * FROM world_state WHERE id=1').get();demand(state?.cycle===payload.cycle,'world_job_cycle_fenced');return state;};
 return {rules,settings,validate};
}
export function createWorldUpkeepHandler(options){
 const {rules,settings,validate}=dependencies(options);
 return (sql,payload,context)=>{validate(sql,payload,context);const result=rules.upkeep(nativeAtomicStatements(sql),settings(sql),Math.floor(payload.nowMs/1000));return {world:sql.prepare('SELECT * FROM world_state WHERE id=1').get(),worldPoint:readWorldPoint(sql),marketChanged:Number(result[1]?.meta?.changes??0)>0};};
}
export function createWorldTransitionHandler({services,clock=Date.now,assertFrozen,authority,assertHeartbeat,appendEvents=(_sql,_ctx,result)=>result}){
 demand(typeof assertFrozen==='function','world_transition_fence_required');const {rules,settings,validate}=dependencies({services,clock}),dungeonLifecycle=createDungeonLifecycle({services,authority});
 return (sql,payload,context)=>{
  const state=validate(sql,payload,context),now=Math.floor(payload.nowMs/1000);demand(['guardian','reset','guild_timeout','heartbeat','dungeon_cleanup'].includes(payload.mode),'world_transition_mode');demand(assertFrozen(sql,payload,context)===true,'world_transition_not_frozen');
  // Native gates re-read the durable cycle/period after every participant has
  // drained. A replay uses the outer process receipt and cannot re-award.
  return services.run(payload.mode==='heartbeat'?{...payload,nowMs:payload.heartbeatJob?.nowMs}:payload,()=>{let guild,heartbeat,dungeon;if(payload.mode==='dungeon_cleanup')dungeon=dungeonLifecycle(sql,payload,context);else if(payload.mode==='guild_timeout')guild=finishGuildWars(sql,payload.nowMs,{authority});else if(payload.mode==='heartbeat'){demand(typeof assertHeartbeat==='function','heartbeat_job_fence_required');if(assertHeartbeat(sql,payload.heartbeatJob,context))heartbeat=runHeartbeatMaintenance(sql,payload.heartbeatJob,{services,settings:settings(sql),authority});else heartbeat={events:[],moves:[],stale:true};}else rules[payload.mode](nativeAtomicStatements(sql),settings(sql),state,now);
  // A completed world reset makes the existing level-30 choice available again.
  // Execute inside the same frozen, durable world transaction, before refresh.
  // Stale/replayed reset requests must not clear an already-made new choice.
  if(payload.mode==='reset'&&sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle===state.cycle+1)
   sql.prepare("UPDATE players SET specialization='',special_guard_until_ms=0 WHERE specialization<>'' OR special_guard_until_ms<>0").run();
  const result={world:sql.prepare('SELECT * FROM world_state WHERE id=1').get(),worldPoint:readWorldPoint(sql),...(guild?{guild}:{}),...(dungeon?{dungeon,moves:dungeon.moves}:{}),...(heartbeat?{heartbeat:{result:heartbeat.result,stale:heartbeat.stale},moves:heartbeat.moves,events:heartbeat.events}:{})};return heartbeat?appendEvents(sql,context,result):result;});
 };
}
