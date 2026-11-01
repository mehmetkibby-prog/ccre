import {pveEntries489} from './pve-multi489.mjs';
import {DatabaseSync} from 'node:sqlite';
import {performance} from 'node:perf_hooks';
import {ChannelRpc} from './channel-rpc.mjs';
import {WorldLoop} from './world-loop.mjs';
import {WorldPush} from './world-push.mjs';
import {PositionStore,attachPositionStore,positionReplica} from './position-store.mjs';
import {CombatStore,attachCombatStore,combatReplica} from './combat-store.mjs';
import {importCombatFrame} from './channel-memory-frame.mjs';

if(!process.send)throw Error('Channel requires private parent IPC');
const [databasePath,channelText,identity,eventTop,eventBottom]=process.argv.slice(2),channel=Number(channelText);
if(![1,2,3].includes(channel))throw Error('Invalid channel');
// The child NEVER opens a writable connection to the persistent game file.
const sqlite=new DatabaseSync(databasePath,{readOnly:true});
const positions=new PositionStore(sqlite,{enabled:true,doubleBuffer:true});
attachPositionStore(sqlite,positions,{readOnly:true});
const combat=new CombatStore(sqlite,{positions,enabled:true});
attachCombatStore(sqlite,combat,{readOnly:true});
// A durable main-process allocator reserves disjoint ranges before fork.
combat.nextEventId=Number(eventTop);let eventFloor=Number(eventBottom);
combat.memory.function('col_memory_event_id',()=>{if(combat.nextEventId<=eventFloor)throw Error('event_range_exhausted');return --combat.nextEventId;});
let lastElu=performance.eventLoopUtilization(),eluMax=0,commands=0;
const timer=setInterval(()=>{const next=performance.eventLoopUtilization();eluMax=Math.max(eluMax,performance.eventLoopUtilization(next,lastElu).utilization);lastElu=next;},1000);
const importPosition=frame=>{positions.entries.set(frame.id,frame.entry);positions.recent.add(frame.id);positions.version++;sqlite.positionPresenceRefresh();};
const assertOwner=payload=>{if(payload.owner?.channel!==channel||payload.owner?.state!=='active')throw Error('owner_scope');};
const regenClocks=new Map(),worldMonsters=new Map(),worldPlayers=new Map(),worldEngagements=new Map();
const worldIndex489={monsters:worldMonsters,monstersByScope:new Map(),regenClocks};
let push=null,pushSqlite=null,pushPositions=null,pushCombat=null,pushLoop=null;
const rpc=new ChannelRpc(process,{identity,handlers:{
 pushInit:({origin,privateKey})=>{
  if(push)return {ok:true};
  process.env.REALTIME_HTTP_ORIGIN=origin;process.env.REALTIME_SIGNING_PRIVATE_KEY=privateKey;
  pushSqlite=new DatabaseSync(databasePath,{readOnly:true});pushPositions=positionReplica();pushCombat=combatReplica(pushPositions);
  pushLoop={enabled:true,activePlayers:new Set(),engagements:new Map(),engagedByMonster:new Map()};
  push=new WorldPush({sqlite:pushSqlite},{positions:pushPositions,combat:pushCombat,worldLoop:pushLoop,watchWrites:false});return {ok:true};
 },
 pushSubscribe:({id,auth,requestUrl,data,seed})=>{
  if(data.channel!==channel||auth.player.id!==id)throw Error('push_scope');
  for(const row of seed.players)push.players.set(row.id,row);for(const row of seed.monsters)push.monsters.set(row.id,row);push.world=seed.world;
  const read=kind=>rpc.request('pushRead',{id,kind});
  return push.subscribe({auth,request:new Request(requestUrl),data,read:()=>read('full'),readOwner:()=>read('owner'),readShared:(topic,scope)=>rpc.request('pushRead',{id,kind:'shared',topic,scope}),readBossLeaders:()=>read('boss')});
 },
 pushTick:async payload=>{
  if(!push)throw Error('push_not_ready');
  pushPositions.set(payload.positions);pushCombat.set(payload.combat);push.memoryChanged(pushCombat.changedRecords);
  push.pending=new Map(payload.pending.map(k=>[k,1]));pushLoop.activePlayers=new Set(payload.activePlayers);pushLoop.engagements=new Map(payload.engagements);pushLoop.engagedByMonster.clear();
  for(const [id,e]of pushLoop.engagements)for(const entry of pveEntries489(e)){let ids=pushLoop.engagedByMonster.get(entry.monster_id);if(!ids)pushLoop.engagedByMonster.set(entry.monster_id,ids=new Set());ids.add(id);}
  for(const c of payload.changes)if(c.kind==='commit')push.committed(c.change);else push.invalidate(c.owner,c.mode);
  await push.tick();return push.snapshot();
 },
 eventRange:({top,bottom})=>{if(!Number.isSafeInteger(top)||!Number.isSafeInteger(bottom)||top>=eventFloor||bottom>=top)throw Error('invalid_event_range');combat.nextEventId=top;eventFloor=bottom;return {ok:true};},
 loot:async({args})=>{const {prepareProfileDrops}=await import('../../dist-vds/server/channel-logic/index.mjs');return prepareProfileDrops(...args);},
 world:payload=>{
  for(const [name,map]of [['monsters',worldMonsters],['players',worldPlayers],['engagements',worldEngagements]]){for(const id of payload[name].removed){if(name==='monsters')WorldLoop.prototype.changed.call(worldIndex489,'monsters',id,null);else map.delete(id);}for(const [id,row]of payload[name].changed){if(name==='monsters')WorldLoop.prototype.changed.call(worldIndex489,'monsters',id,row);else map.set(id,row);}}
  const loop=Object.assign(Object.create(WorldLoop.prototype),{enabled:true,now:Date.now,monsters:worldMonsters,monstersByScope:worldIndex489.monstersByScope,players:worldPlayers,engagements:worldEngagements,activePlayers:new Set(worldPlayers.keys()),engagedByMonster:new Map(),regenClocks});
  for(const [id,e]of loop.engagements)for(const entry of pveEntries489(e)){let ids=loop.engagedByMonster.get(entry.monster_id);if(!ids)loop.engagedByMonster.set(entry.monster_id,ids=new Set());ids.add(id);}
  if(payload.kind==='nearby')return loop.nearby(payload.playerId,payload.nowMs,payload.multiple489===true);
  if(payload.kind==='query'){
   if(!['due','needsRepair','needsDespawn','dragonDue'].includes(payload.method))throw Error('world_method');
   if(channel!==1)loop.monsters=new Map([...worldMonsters].filter(([,m])=>m.channel===channel));
   loop.config=new Map(payload.config);return loop[payload.method](payload.arg);
  }
  importCombatFrame(combat,payload.rows);loop.combat=combat;
  if(channel!==1)loop.monsters=new Map([...worldMonsters].filter(([,m])=>m.channel===channel));
  const touched=new Map(),publish=combat.publish;combat.publish=changes=>{for(const c of changes)touched.set(c.name+'\u001e'+c.id,c);};
  try{loop.regenerate(payload.settings,payload.nowMs);}finally{combat.publish=publish;}
  return [...touched.values()].map(({name,id})=>{const e=combat.entry(name,id);return {name,id,keys:e.keys,current:e.current,base:e.base};});
 },
 ready:()=>({pid:process.pid,channel,readOnly:true,protocol:'channel-compute-v1'}),
 position:payload=>{assertOwner(payload);commands++;importPosition(payload.position);
  if(payload.position.entry.current.channel!==channel)throw Error('position_channel');
  const result=positions.checkpoint(sqlite,payload.statement);
  return {result,current:result?positions.entries.get(payload.position.id).current:null};},
 combat:payload=>{assertOwner(payload);commands++;importPosition(payload.position);importCombatFrame(combat,payload.rows);
  if(payload.position.entry.current.channel!==channel)throw Error('combat_channel');
  const touched=new Map(),publish=combat.publish;combat.publish=changes=>{for(const {name,id}of changes)touched.set(name+'\u001e'+id,{name,id});};
  let result;
  try{result=combat.tryBatch(payload.statements,{guard:payload.guard,hitPlans:payload.plans});}finally{combat.publish=publish;}
  const changes=result?[...touched.values()].map(({name,id})=>{const e=combat.entry(name,id);return {name,id,keys:e.keys,current:e.current,base:e.base};}):[];
  return {result,changes,eventsRemaining:combat.nextEventId-eventFloor};},
 health:()=>({pid:process.pid,channel,readOnly:true,commands,eventLoopUtilizationMax:eluMax,memoryMb:Math.round(process.memoryUsage().rss/1048576)}),
 }});
const stop=()=>{clearInterval(timer);push?.stop();pushSqlite?.close();rpc.close();combat.memory.close();sqlite.close();process.exit(0);};
process.once('disconnect',stop);process.once('SIGTERM',stop);process.once('SIGINT',stop);
