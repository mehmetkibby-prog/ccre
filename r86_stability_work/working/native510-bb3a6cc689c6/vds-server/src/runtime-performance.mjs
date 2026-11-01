import {feature504} from './features504.mjs';
import {createSlowWork504} from './slow-work504.mjs';
const slowWorkEnabled504=feature504('slowWork');
import { monitorEventLoopDelay, performance, PerformanceObserver, constants } from 'node:perf_hooks';
import { createHostResourceSampler } from './host-resources.mjs';

const key=Symbol.for('coreoflife.runtimePerformance');
const sampleMs=2000,windowMs=300000,resolutionMs=20;
const round=value=>Math.round(value*10)/10;
const workNames=new Set(['combat_memory_hit','combat_projection','position_flush','main_commit','main_write_group','dungeon_tick','dungeon_save','dungeon_serialize','dungeon_commit','dungeon_reward','dungeon_finish','dungeon_checkpoint','dungeon_member_refresh','world_cleanup','bot_deadline','gc_minor','gc_major','gc_incremental','gc_weakcb','gc_other']);
for(const name of ['shared_snapshot_slice','main_http','main_health_sample','main_premium_expiry','main_guild_sync','main_guild_step','main_voice_sweep','main_receipt_prune','channel_session','channel_action','channel_world','channel_ticket','channel_dungeon','rpc_receive','rpc_reply','rpc_serialize','rpc_other','rpc_write','rpc_claim','rpc_transfer','rpc_committed','rpc_admit','rpc_health','rpc_worldDurableR13','realtime_message','realtime_move','realtime_motion','realtime_ping','realtime_combat_attack','realtime_movement_checkpoint','realtime_other','realtime_heartbeat','realtime_auth_apply','realtime_renew_apply','realtime_disconnect','realtime_broadcast','realtime_auth_timeout'])workNames.add(name);
const sqlTables=new Set(['players','monsters','accounts','auth_sessions','game_presence','player_items','world_state','world_drops','messages','monster_participants','normal_defeats','normal_reward_claims','sinsi_defeats','sinsi_reward_claims','boss_participants','boss_defeats','boss_reward_claims','combat_events','party_invites','fishing_sessions','arena_queue','arena_announcements','arena_kill_claims','war_kill_claims','arena_reward_claims','guardian_reward_claims','pve_engagements','other']);
for(const name of ['world_loop_tick','world_cleanup','world_upkeep','world_regen','world_flush','world_premium','world_guild_buff','world_voice','world_guild_clock','world_launch_email'])workNames.add(name);
// Explicit phase names are fixed and bounded. No dynamic player/job identifiers.
for(const name of ['world_push_tick','world_push_seed','world_push_slice','channel_projection_expiry','dungeon_snapshot','dungeon_step','dungeon_plan','dungeon_candidate','channel_write_serialize','channel_write_prepare','channel_write_ack','channel_write_queue_wall','channel_write_rpc_wall','channel_write_wall'])workNames.add(name);
// Async task completion is elapsed wall time, including scheduling and I/O.
// Keep it separate from the initial synchronous invocation and explicit slices.
for(const name of [...workNames])if(!name.endsWith('_wall'))workNames.add(name+'_wall');
for(const verb of ['select','update','insert','delete','replace','with','other'])for(const table of sqlTables)workNames.add(`sql_${verb}_${table}`);
// Only fixed verb/table categories are retained. Never retain raw SQL, bind
// values, dynamic identifiers, accounts, request bodies or stack traces.
for(const name507 of ["reward_xp_claim","reward_xp_update","reward_batch_claim","forge_material","cauldron_material","world_drop","equipment_upgrade","friend_accept"])workNames.add('sql_'+name507+'507');
for(const name510 of ["writer_receipt","guild_contributions","reward_eligibility","xp_rebase"])workNames.add("sql_"+name510+"510");
export function sqlWorkName(sql){
 const family510=/^\s*WITH\s+(writer_key|totals|wanted|old)\b/i.exec(sql)?.[1]?.toLowerCase();
 if(family510)return "sql_"+({writer_key:"writer_receipt",totals:"guild_contributions",wanted:"reward_eligibility",old:"xp_rebase"}[family510])+"510";
 const family507=/^\s*WITH\s+(RECURSIVE\s+)?([a-z_0-9]+)/i.exec(sql);
 if(family507){const names507={reward_input:family507[1]?'reward_xp_update':'reward_xp_claim',reward_batch:'reward_batch_claim',forge_earned491:'forge_material',earned:'cauldron_material',drops:'world_drop',upgrade:'equipment_upgrade',eligible:'friend_accept'};const named507=names507[family507[2].toLowerCase()];if(named507)return 'sql_'+named507+'507';}

 const verb=/^\s*(SELECT|UPDATE|INSERT|DELETE|REPLACE|WITH)\b/i.exec(sql)?.[1]?.toLowerCase()||'other';
 const table=/\b(?:FROM|INTO|UPDATE)\s+["`\[]?([a-z_]+)\b/i.exec(sql)?.[1]?.toLowerCase();
 return `sql_${verb}_${sqlTables.has(table)?table:'other'}`;
}

// Fixed-size, in-memory process measurements. No request or player data.
// Event-loop excess subtracts the monitor's normal sampling interval; these
// values are process stalls, never network RTT or player ping.
export function createRuntimePerformance({now=Date.now}={}){
 const samples=[],workBuckets=new Map(),slowWork=[];
 const slow504=createSlowWork504({enabled:slowWorkEnabled504,now,allowedNames:workNames});
 const hostResources=createHostResourceSampler({now});
 let prunedEpoch=-Infinity;
 const pruneWork=at=>{
  const epoch=Math.floor(at/10000);
  if(epoch!==prunedEpoch){
   for(const key of workBuckets.keys())if(key<=epoch-30)workBuckets.delete(key);
   for(let i=slowWork.length-1;i>=0;i--)if(slowWork[i].endedAtMs<=at-windowMs)slowWork.splice(i,1);
   prunedEpoch=epoch;
  }
 };
 return {
  slow504,
  sampleHostResources(){return hostResources.sample();},
  work(name,durationMs,startedAtMs,bytes,blocking504=true){
   if(!workNames.has(name)||!Number.isFinite(durationMs)||durationMs<0)return;
   const at=now();pruneWork(at);
   const start=Number.isFinite(startedAtMs)?startedAtMs:at-durationMs;
   if(blocking504)slow504.report(name,durationMs,start);
   if(start+durationMs<=at-windowMs)return;
   const epoch=Math.floor(at/10000);
   let bucket=workBuckets.get(epoch);if(!bucket)workBuckets.set(epoch,bucket=new Map());
   let row=bucket.get(name);if(!row)bucket.set(name,row={count:0,totalMs:0,maxMs:0,over20:0});
   if(name==='dungeon_save'&&Number.isSafeInteger(bytes)&&bytes>=0){row.byteCount=(row.byteCount||0)+1;row.totalBytes=(row.totalBytes||0)+bytes;row.maxBytes=Math.max(row.maxBytes||0,bytes);}
   row.count++;row.totalMs+=durationMs;row.maxMs=Math.max(row.maxMs,durationMs);row.over20+=Number(durationMs>20);
   if(durationMs>=20){slowWork.push({name,startedAtMs:Math.round(start),endedAtMs:Math.round(start+durationMs),durationMs:round(durationMs),...(name==='dungeon_save'&&Number.isSafeInteger(bytes)&&bytes>=0?{bytes}:{})});if(slowWork.length>64)slowWork.shift();}
  },
  record(sample){
   const at=now();slow504.closeWindow({at,loopUtilization:sample.loopUtilization});
   samples.push({at,loopExcessMs:Math.max(0,sample.loopExcessMs||0),cpuCores:Math.max(0,sample.cpuCores||0),loopUtilization:Math.max(0,Math.min(1,sample.loopUtilization||0))});
   while(samples.length>150||samples[0]?.at<=at-windowMs)samples.shift();
  },
  snapshot(){
   const at=now();while(samples[0]?.at<=at-windowMs)samples.shift();pruneWork(at);
   const memory=process.memoryUsage();
   const work={};
   for(const bucket of workBuckets.values())for(const [name,row] of bucket){const target=work[name]??={count:0,totalMs:0,maxMs:0,over20:0};target.count+=row.count;target.totalMs+=row.totalMs;target.maxMs=Math.max(target.maxMs,row.maxMs);target.over20+=row.over20;if(row.byteCount){target.byteCount=(target.byteCount||0)+row.byteCount;target.totalBytes=(target.totalBytes||0)+row.totalBytes;target.maxBytes=Math.max(target.maxBytes||0,row.maxBytes);}}
   return {dungeonCache510:globalThis[Symbol.for('coreoflife.dungeonCache510')]?{...globalThis[Symbol.for('coreoflife.dungeonCache510')]}:null,features510:globalThis[Symbol.for('coreoflife.features.v510')]??null,capacities510:globalThis[Symbol.for('coreoflife.capacity.v510')]??null,slowWork504:slow504.snapshot(),protocol:'native-runtime-timing-v1',scope:'process-only-not-player-rtt',workTiming:{wallSuffix:'elapsed-through-async-settlement-including-queue-and-io-not-cpu',asyncBase:'initial-synchronous-invocation-only; resumed-work-is-in-explicit-phase-samples',durations:'elapsed-duration-not-attributed-process-cpu'},sqliteVersion:process.versions.sqlite,measuredAtMs:at,windowSeconds:300,sampleSeconds:2,samples:samples.length,
    current:samples.length?{sampledAtMs:samples.at(-1).at,loopUtilization:samples.at(-1).loopUtilization,loopExcessMs:round(samples.at(-1).loopExcessMs)}:null,
    eventLoopExcessMaxMs:round(Math.max(0,...samples.map(s=>s.loopExcessMs))),
    cpuCoresMean:round(samples.reduce((n,s)=>n+s.cpuCores,0)/Math.max(1,samples.length)),
    cpuCoresMax:round(Math.max(0,...samples.map(s=>s.cpuCores))),
    eventLoopUtilizationMax:Math.round(Math.max(0,...samples.map(s=>s.loopUtilization))*1000)/1000,
    recentStalls:samples.filter(s=>s.loopExcessMs>=50).slice(-12).map(s=>({sampleEndedAtMs:s.at,sampleSeconds:2,eventLoopExcessMs:round(s.loopExcessMs),cpuCores:round(s.cpuCores),loopUtilization:Math.round(s.loopUtilization*1000)/1000})),
    work:Object.fromEntries(Object.entries(work).map(([name,row])=>[name,{count:row.count,meanMs:round(row.totalMs/row.count),maxMs:round(row.maxMs),over20:row.over20,...(row.byteCount?{meanBytes:Math.round(row.totalBytes/row.byteCount),maxBytes:row.maxBytes,totalBytes:row.totalBytes}:{})}])),
    recentSlowWork:slowWork.map(row=>({...row})),
    memoryMb:{rss:round(memory.rss/1048576),heapUsed:round(memory.heapUsed/1048576),heapTotal:round(memory.heapTotal/1048576),external:round(memory.external/1048576)},
    hostResources:hostResources.snapshot()};
  },
 };
}

export const runtimePerformance=()=>globalThis[key]??=createRuntimePerformance();
export const reportRuntimeWork=(name,durationMs,startedAtMs,bytes,blocking504=true)=>{try{runtimePerformance().work(name,durationMs,startedAtMs,bytes,blocking504);}catch{/* Diagnostics never alter game state or acknowledgements. */}};
export function measureRuntimeWork(name,task){
 const started=performance.now();let result;const recorder504=runtimePerformance().slow504;try{recorder504.enter();}catch{}
 try{result=task();}finally{const ms=performance.now()-started;reportRuntimeWork(name,ms,performance.timeOrigin+started);try{recorder504.leave(name,ms,performance.timeOrigin+started);}catch{}}
 if(result instanceof Promise){
  // Native jobs return real Promises: keep their identity and original value/
  // failure. Both observer branches fulfil, so no detached rejected promise.
  // Do not assimilate arbitrary thenables or attribute queue/I/O time to CPU.
  const settled=()=>reportRuntimeWork(name+'_wall',performance.now()-started,performance.timeOrigin+started);
  try{Promise.prototype.then.call(result,settled,settled);}catch{/* Diagnostic observer only. */}
 }
 return result;
}
export function startRuntimePerformance(){
 const delay=monitorEventLoopDelay({resolution:resolutionMs});delay.enable();
 const gc=new PerformanceObserver(list=>{
  for(const entry of list.getEntries()){
   const kind=entry.detail?.kind;
   const name=kind===constants.NODE_PERFORMANCE_GC_MAJOR?'gc_major':kind===constants.NODE_PERFORMANCE_GC_MINOR?'gc_minor':kind===constants.NODE_PERFORMANCE_GC_INCREMENTAL?'gc_incremental':kind===constants.NODE_PERFORMANCE_GC_WEAKCB?'gc_weakcb':'gc_other';
   reportRuntimeWork(name,entry.duration,performance.timeOrigin+entry.startTime);
  }
 });
 gc.observe({entryTypes:['gc']});
 let lastHostSample=-Infinity;
 let cpu=process.cpuUsage(),elapsed=performance.now(),utilization=performance.eventLoopUtilization();
 const timer=setInterval(()=>{
  const at=performance.now(),nextCpu=process.cpuUsage(),nextUtilization=performance.eventLoopUtilization();
  const used=(nextCpu.user-cpu.user)+(nextCpu.system-cpu.system);
  runtimePerformance().record({loopExcessMs:Math.max(0,delay.max/1e6-resolutionMs),cpuCores:used/Math.max(1,(at-elapsed)*1000),loopUtilization:performance.eventLoopUtilization(nextUtilization,utilization).utilization});
  delay.reset();cpu=nextCpu;elapsed=at;utilization=nextUtilization;
  // Kernel reads stay asynchronous and single-flight on this existing sampler.
  // Health requests only copy the latest bounded numeric snapshot.
  if(at-lastHostSample>=5000){lastHostSample=at;void runtimePerformance().sampleHostResources();}
 },sampleMs);
 timer.unref();
 return ()=>{clearInterval(timer);delay.disable();gc.disconnect();};
}

// These wrappers measure only the current synchronous invocation. They keep
// promise identity and never count await/network/queue time as blocking work.
export function measureSync504(name,task){
 if(!slowWorkEnabled504)return task();
 const recorder=runtimePerformance().slow504,started=performance.now();try{recorder.enter();}catch{}
 try{return task();}finally{const ms=performance.now()-started;try{recorder.report(name,ms,performance.timeOrigin+started);}catch{}try{recorder.leave(name,ms,performance.timeOrigin+started);}catch{}}
}
const rpcNames504=new Set(['write','claim','transfer','committed','admit','health','worldDurableR13']);
export const rpcWorkName504=name=>rpcNames504.has(name)?'rpc_'+name:'rpc_other';
const realtimeNames504=new Set(['move','motion','ping','combat_attack','movement_checkpoint']);
export const realtimeWorkName504=name=>realtimeNames504.has(name)?'realtime_'+name:'realtime_other';
