import {feature510} from "./features510.mjs";
import {DungeonSnapshot510} from "./dungeon-snapshot510.mjs";
import {refreshDungeonMember} from './dungeon-maintenance.mjs';
import {DungeonEngine} from './dungeon-engine.mjs';
import {ChannelDungeonSnapshot} from './channel-dungeon-snapshot.mjs';
import {ChannelDungeonTransaction} from './channel-dungeon-transaction.mjs';
import {createDungeonContext} from './channel-dungeon-context.mjs';
import {measureRuntimeWork} from './runtime-performance.mjs';
import {setImmediate as yieldIO} from 'node:timers/promises';
import {cachePreparedStatements} from './prepared-cache.mjs';
import {compactNativePlan} from './channel-native-plan.mjs';

// A dungeon is owned by the channel in which its original same-channel party
// entered. Simulation and stream frames remain here. Only SQL at persistence
// boundaries is sent to the main writer; it never receives a dungeon tick.
export function createChannelDungeon(database,{engineOptions={},onFatal=()=>{}}={}){
 const engine=new DungeonEngine(database.sqlite,{settingsSnapshot:table=>database.worldLoop?.config.get(table),...engineOptions,channel:database.channel});
 engine.publishedRoomVersions510=true;
 const snapshot=new ChannelDungeonSnapshot(database.sqlite,{channel:database.channel});
 cachePreparedStatements(snapshot.workspace.sqlite);
 let invalid=true,scope={},scopeKey='',stopping=false,scheduled=null,nativeScope=null;
 const pendingRunIds=new Set();
 const incremental510=new DungeonSnapshot510(snapshot);snapshot.incremental510=incremental510;
 globalThis[Symbol.for('coreoflife.dungeonCache510')]=incremental510.stats;
 const prior=database.onCommitted;
 database.onCommitted=(changes,committedRows)=>{
  prior?.(changes,committedRows);
  for(const change of changes??[]){
   if(!snapshot.tables.includes(change.table)||snapshot.ignoresChange(change))continue;
   // Checkpoints already ran in this private workspace. Only a verified
   // identical durable row may avoid a reload; unknown notifications retain
   // the conservative complete refresh (gear/party/reward changes included).
   const id=change.keys?.[0]??change.id;
   if(change.table==='dungeon_runs'&&typeof id==='string'){
    if(snapshot.loadedRunIds?.has(id))pendingRunIds.add(id);
    else if(engine.runs.has(id))invalid=true;
   }
   else if(!feature510("dungeonSnapshot")||!incremental510.queue(change))invalid=true;
  }
 };
 const withContext=createDungeonContext(snapshot.workspace);
 const boundary=new ChannelDungeonTransaction({engine,workspace:snapshot.workspace,onFatal,withContext,
  load:async(_workspace,options)=>{
   measureRuntimeWork('dungeon_snapshot',()=>{
    if(!invalid&&pendingRunIds.size&&!snapshot.reconcileRunRows(pendingRunIds))invalid=true;
    if(!invalid&&feature510("dungeonSnapshot")&&!incremental510.apply())invalid=true;
    if(invalid){snapshot.load(engine,scope);invalid=false;incremental510.stats.fullBuilds++;incremental510.clear();}
    pendingRunIds.clear();
   });
   // Admission is only per member, never per tick once owned. Foreign party
   // rows remain readable for the unchanged same-channel rejection rule.
   nativeScope=await database.nativeScope(snapshot.scopeFor(engine,options?.runIds));
  },
  commit:trace=>database.remote([],null,measureRuntimeWork('dungeon_plan',()=>compactNativePlan(trace)),null,nativeScope),
 });
 let tail=Promise.resolve();
 const run=(operation,nextScope={},options)=>{
  if(stopping)return Promise.reject(Error('dungeon_stopping'));
  const task=tail.then(async()=>{
   // Resolve a movement command's membership after earlier queued creates,
   // leaves and transitions have committed. Never capture a room at enqueue.
   const resolved=typeof options==='function'?options():{scope:nextScope,options};
   const currentScope=resolved.scope,currentOptions=resolved.options;
   const nextKey=JSON.stringify(currentScope);if(nextKey!==scopeKey||currentOptions?.refresh){scopeKey=nextKey;invalid=true;}scope=currentScope;
   try{return await boundary.run(operation,currentOptions);}
   catch(error){invalid=true;throw error;}
  });tail=task.catch(()=>{});return task;
 };
 // Keep all original read methods and properties (stats/makeGear/publicRun)
 // visible to the canonical API and stream. Only mutation entry points change.
 const service=new Proxy(engine,{get(target,key){
  if(key==='command')return(id,input)=>{
   if(!['sync','move','attack'].includes(input.action))return run(e=>e.command(id,input),{playerId:id,requestId:input.requestId},{refresh:true});
   return run(e=>e.command(id,input),{},()=>{
    const idOfRun=engine.membership(id),room=engine.runs.get(idOfRun);
    // Fast commands can mutate only the caller's authoritative room. Reuse
    // the existing all-active-room workspace so switching players does not
    // recopy inventories; committed changes still invalidate it immediately.
    return {scope:room?{}:{playerId:id,requestId:input.requestId},options:{runIds:room?[idOfRun]:[]}};
   });
  };
  if(key==='tickScheduled')return()=>{
   if(scheduled)return scheduled;
   if(!engine.runs.size||stopping)return Promise.resolve();
   scheduled=(async()=>{
    const now=engine.now(),dt=Math.min(.2,Math.max(0,(now-engine.lastTick)/1000));
    for(const id of [...engine.runs.keys()]){
     await yieldIO();
     if(stopping)break;
     await run(e=>{const room=e.runs.get(id);if(room)e.withStepSettings(()=>e.tickStep([room],now,dt));},{},{runIds:[id]});
    }
   })().finally(()=>{scheduled=null;});return scheduled;
  };
  const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
 },set(target,key,value){return Reflect.set(target,key,value);}});
 return {service,engine,snapshot,boundary,run,
  async refreshMembers(){
   // One fresh shared snapshot per sweep, not one full channel copy per room.
   // Real writes/scope changes between yielded rooms still force a reload.
   let refresh=true;
   for(const id of [...engine.runs.keys()]){
    await yieldIO();if(stopping)return;
    await run(e=>{const room=e.runs.get(id);if(!room)return;
     for(const member of room.members)refreshDungeonMember({engine:e,database:e.db,premium:globalThis.__colPremium,guildSkill:globalThis.__colGuildSkill,ranks:globalThis.__colRanks},room,member);
    },{},{runIds:[id],refresh});
    refresh=false;
   }
  },
  async close(){stopping=true;await scheduled;await tail;await boundary.drain();
   // Exit checkpoints use the same writer ACK, not a separate SQLite writer.
   for(const room of engine.runs.values()){
    invalid=true;scope={};await boundary.run(e=>e.save(e.runs.get(room.id)),{runIds:[room.id]});
   }
   snapshot.close();
  },
 };
}
