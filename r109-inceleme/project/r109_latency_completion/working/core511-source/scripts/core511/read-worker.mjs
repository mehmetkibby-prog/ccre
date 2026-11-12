import {realmLoadLabConfigR101} from './realm-loadlab-r101.mjs';
import {readCastleBoot,readCastleGuild} from './castle-service-r59.mjs';
import {mountEnabled} from './mounts-model.mjs';
import {readMountBundle} from './mounts-service.mjs';
import {readActorDropsR52} from './actor-drop-read-r52.mjs';
import {readAdventureBundle,readAdventureBoot} from './adventure-service.mjs';
import {isMainThread,parentPort,workerData,Worker} from 'node:worker_threads';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {LoadWindow} from './load-window.mjs';
import {BoundedReadQueue} from './bounded-read-queue.mjs';
import {demand,kernelError} from './contract.mjs';
import {readCombatBundle} from './combat-frames.mjs';
import {readDungeonAdmission} from './dungeon-runtime.mjs';
import {ColdWorldReader} from './cold-world.mjs';
import {encodeSlimBundle} from './slim-reload.mjs';
import {r35Options} from './r35-options.mjs';
import {r44Options} from './r44-options.mjs';
import {SnapshotReadQueue} from './snapshot-read-queue.mjs';
import {readConfiguration} from './read-configuration.mjs';
import {readWorldPoint} from './world-state.mjs';
import {readCleanupBatch} from './world-cleanup.mjs';
import {readMarketState,readMarketRevision} from './market-state.mjs';
import {readTradeGlass} from './trade-glass-read.mjs';
import {readPlayerJobs} from './player-jobs.mjs';
import {GuildSyncReader} from './guild-sync-reader.mjs';
import {guildWarDue} from './guild-war.mjs';
import {dungeonLifecycleDue} from './dungeon-lifecycle.mjs';
import {HeartbeatMaintenanceReader} from './heartbeat-maintenance-reader.mjs';
import {installRegistry,seedRegistryFrame,LOADLAB_VERSION} from './generated/cold-world-rules.mjs';
// Query names and SQL are supplied by the trusted main process at creation.
// The browser and channel wire can supply parameters, never arbitrary SQL.
if(!isMainThread&&workerData?.kernel511ReadWorker===true) {
 const sqlite=new DatabaseSync(workerData.file,{readOnly:true});
 sqlite.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=1000');
 const loadlab=installRegistry({config:realmLoadLabConfigR101(sqlite),readSeed:()=>seedRegistryFrame(sqlite,LOADLAB_VERSION)});
 const queries=new Map();
 for(const [name,sql]of workerData.queries){
  demand(typeof name==='string'&&typeof sql==='string'&&/^\s*(SELECT|WITH)\b/i.test(sql),'invalid_read_worker_query');
  queries.set(name,sqlite.prepare(sql));
 }
 const coldWorld=new ColdWorldReader(sqlite),guildSync=new GuildSyncReader(sqlite),heartbeat=new HeartbeatMaintenanceReader(sqlite),loadWindow=new LoadWindow({target:'reader',incarnation:workerData.incarnation});let queue=Promise.resolve(),readWork=null;
 const readMessage=async(message,{insideTransaction=false,post=reply=>parentPort.postMessage(reply)}={})=>{
  try {
   // A burst must not monopolize one promise/microtask drain. Yield between
   // complete reads, never within or between the ownership and data checks of
   // a read transaction. FIFO, the hard queue limit and SQL are unchanged.
   await new Promise(resolve=>setImmediate(resolve));
   if(message.type==='close'){loadWindow.close();loadlab.close();sqlite.close();parentPort.postMessage({closed:true});return;}
   if(message.type==='load_measure'){const rows=await loadWindow.command(message.payload);if(message.payload.operation==='begin')readWork={queries:{},slowest:[]};if(message.payload.operation==='end'){rows.readWork=readWork;readWork=null;}if(message.payload.operation==='cancel')readWork=null;parentPort.postMessage({id:message.id,ok:true,rows,workMs:0});return;}
   const started=performance.now();let rows;
   if(workerData.actorBundles===true&&message.name==='kernel511_actor_bundle')rows=readActorBundle(sqlite,message.params);
   else if(workerData.actorBundles===true&&message.name==='kernel511_actor_world')rows=await readActorWorldBundle(sqlite,message.params,coldWorld,{insideTransaction});
   else if(workerData.actorBundles===true&&message.name==='kernel511_actor_drops_r52')rows=readActorDropsR52(sqlite,message.params,{insideTransaction});
   else if(workerData.actorBundles===true&&message.name==='kernel511_channel_boot')rows=readChannelBoot(sqlite,message.params);
   else if(workerData.actorBundles===true&&message.name==='kernel511_world_boot')rows=readWorldBoot(sqlite,message.params);
   else if(workerData.actorBundles===true&&message.name==='kernel511_cleanup_batch')rows=readCleanupBatch(sqlite,message.params);
   else if(workerData.actorBundles===true&&message.name==='kernel511_market_state')rows=readMarketState(sqlite);
   else if(workerData.actorBundles===true&&message.name==='kernel511_trade_glass')rows=readTradeGlass(sqlite,message.params);
   else if(workerData.actorBundles===true&&message.name==='kernel511_player_jobs')rows=readPlayerJobs(sqlite,message.params);
   else if(workerData.actorBundles===true&&message.name==='kernel511_guild_step')rows=guildSync.step(message.params);
   else if(workerData.actorBundles===true&&message.name==='kernel511_guild_war_due')rows=guildWarDue(sqlite,message.params[0]);
   else if(workerData.actorBundles===true&&message.name==='kernel511_dungeon_lifecycle_due')rows=dungeonLifecycleDue(sqlite,message.params[0]);
   else if(workerData.actorBundles===true&&message.name==='kernel511_normal_recovery_r62')rows=heartbeat.recoveryDueR62(message.params);
   else if(workerData.actorBundles===true&&message.name==='kernel511_heartbeat_due')rows=heartbeat.due(message.params.entries,message.params);
   else{const query=queries.get(message.name);demand(query&&Array.isArray(message.params),'unknown_read_worker_query');rows=query.all(...message.params);}
   const bytes=JSON.stringify(rows),resultBytes=Buffer.byteLength(bytes);
   // A private, complete boot snapshot grows with the persistent world. It is
   // not a browser response. Keep ordinary reads at 4 MiB; allow bounded 32 MiB
   // only for the two ownership-fenced startup snapshots. No row is discarded.
   const boot=workerData.actorBundles===true&&['kernel511_channel_boot','kernel511_world_boot'].includes(message.name);
   const limitBytes=(boot?32:4)*1024*1024;
   if(resultBytes>limitBytes)throw Object.assign(kernelError('read_worker_result_too_large'),{readInfo:{query:message.name,resultBytes,limitBytes}});
   if(boot&&resultBytes>4*1024*1024)console.warn(JSON.stringify({event:'core511_boot_read',query:message.name,resultBytes,limitBytes,repair:'R104_BOOT1'}));
   const workMs=performance.now()-started;
   if(readWork){const row=readWork.queries[message.name]??={count:0,totalMs:0,maxMs:0};row.count++;row.totalMs+=workMs;row.maxMs=Math.max(row.maxMs,workMs);readWork.slowest.push({name:message.name,workMs,at:Date.now()});readWork.slowest.sort((a,b)=>b.workMs-a.workMs);readWork.slowest.length=Math.min(10,readWork.slowest.length);}
   // The snapshot and result-size guard have completed. Copying a large cold
   // world result is a second synchronous phase; give timers a turn before it.
   // FIFO and the entire consistent ownership/data transaction remain intact.
   await new Promise(resolve=>setImmediate(resolve));
   post({id:message.id,ok:true,rows,workMs});
  }catch(error){post({id:message.id,ok:false,code:error.code??'read_worker_failed',...(error.readInfo?{readInfo:error.readInfo}:{})});}
 };
 const snapshotQueue=r44Options.readSnapshotBatch?new SnapshotReadQueue({begin:()=>sqlite.exec('BEGIN'),commit:()=>sqlite.exec('COMMIT'),rollback:()=>sqlite.exec('ROLLBACK'),read:readMessage,post:reply=>parentPort.postMessage(reply)}):null;
 parentPort.on('message',message=>{if(snapshotQueue)void snapshotQueue.push(message);else queue=queue.then(()=>readMessage(message));});
}
export class ReadWorker {
 constructor(file,queries,{maxPending=16,timeoutMs=10000,actorBundles=false}={}) {
  this.pending=new Map();this.sequence=0;this.maxPending=maxPending;this.timeoutMs=timeoutMs;this.closed=false;this.starts=0;this.recovery=null;
  this.readQueue=actorBundles?new BoundedReadQueue({concurrency:Math.min(8,maxPending),maxQueued:128,waitMs:5000}):null;
  this.workerData={kernel511ReadWorker:true,file,queries:[...queries],actorBundles};this.start();
 }
 start(){
  demand(!this.closed&&(!this.slot||this.slot.ended),'read_worker_still_running');
  const incarnation=randomUUID(),worker=new Worker(new URL(import.meta.url),{workerData:{...this.workerData,incarnation},resourceLimits:{maxOldGenerationSizeMb:192}});
  let ended;const slot={worker,incarnation,failed:false,ended:false,exit:new Promise(resolve=>ended=resolve)};this.worker=worker;this.slot=slot;this.starts++;
  worker.on('message',m=>{
   const task=this.pending.get(m.id);if(this.closed||slot.failed||this.slot!==slot||task?.slot!==slot)return;
   this.pending.delete(m.id);clearTimeout(task.timer);m.ok?task.resolve({rows:m.rows,workMs:m.workMs}):task.reject(Object.assign(kernelError(m.code),m.readInfo?{readInfo:m.readInfo}:{}));
  });
  worker.on('error',()=>this.fail('read_worker_failed',slot));
  worker.on('exit',()=>{slot.ended=true;this.fail('read_worker_closed',slot);ended();});return slot;
 }
 reject(id,code){const task=this.pending.get(id);if(!task)return;this.pending.delete(id);clearTimeout(task.timer);task.reject(kernelError(code));}
 fail(code,slot=this.slot){
  if(!slot||slot.failed)return;slot.failed=true;slot.code=code;
  for(const [id,task]of this.pending)if(task.slot===slot)this.reject(id,code);
 }
 async available(){
  if(this.closed)throw kernelError('read_worker_closed');if(!this.slot.failed)return this.slot;
  // Never replay interrupted reads: guild iteration has a process-local
  // cursor. Its existing owner recovery restarts that scan from native state.
  // A future query gets a fresh read-only thread only after the old one exits.
  if(!this.recovery){const old=this.slot;this.recovery=(async()=>{await old.exit;if(this.closed)throw kernelError('read_worker_closed');if(this.slot===old)this.start();return this.slot;})().finally(()=>{this.recovery=null;});}
  return this.recovery;
 }
 query(name,params=[]) {
  if(!this.readQueue)return this.send({name,params});
  const slot=this.slot,wasHealthy=!slot.failed&&!slot.ended;
  return this.readQueue.run(()=>{
   // A queued request belongs to the incarnation on which it was accepted.
   // Do not silently replay guild cursors or old actor reads on a replacement.
   if(wasHealthy&&(this.slot!==slot||slot.failed||slot.ended))throw kernelError('read_worker_process_changed');
   return this.send({name,params});
  });
 }
 measure(payload,{slot=this.slot}={}){if(slot!==this.slot||slot.failed||slot.ended)return Promise.reject(kernelError('read_measurement_process_changed'));return this.send({type:'load_measure',payload},{expectedSlot:slot,timeoutMs:5000,terminateOnTimeout:false}).then(result=>result.rows);}
 send(message,{expectedSlot=null,timeoutMs=this.timeoutMs,terminateOnTimeout=true}={}) {
  if(this.closed)return Promise.reject(kernelError('read_worker_closed'));
  if(this.pending.size>=this.maxPending)return Promise.reject(kernelError('read_worker_backpressure'));
  return new Promise((resolve,reject)=>{
   const id=++this.sequence,task={resolve,reject,slot:null,timer:null};
   task.timer=setTimeout(()=>{this.reject(id,terminateOnTimeout?'read_worker_timeout':'read_measurement_timeout');if(terminateOnTimeout&&task.slot&&!task.slot.failed){this.fail('read_worker_timeout',task.slot);void task.slot.worker.terminate().catch(()=>{});}},timeoutMs);
   this.pending.set(id,task);
   void (expectedSlot?Promise.resolve(expectedSlot):this.available()).then(slot=>{
    if(expectedSlot&&(this.slot!==slot||slot.failed||slot.ended)){this.reject(id,'read_measurement_process_changed');return;}
    if(!this.pending.has(id))return;if(slot.failed){this.reject(id,slot.code);return;}
    task.slot=slot;try{slot.worker.postMessage({id,...message});}catch(error){this.reject(id,error.code??'read_worker_failed');}
   },error=>this.reject(id,error.code??'read_worker_failed'));
  });
 }
 async close(){this.closed=true;this.readQueue?.close();for(const id of this.pending.keys())this.reject(id,'read_worker_closed');await this.worker.terminate();}
}

// A single read transaction provides all admitted/refresh inputs at one WAL
// snapshot. Ownership is checked inside it. The thread has query_only and an
// OS read-only SQLite handle; no migration or account creation can occur here.
export function readActorBundle(sql,params,{insideTransaction=false,cache=null}={}){
 demand(Array.isArray(params)&&params.length===6,'actor_bundle_parameters');
 const [actor,channel,incarnation,epoch,revision,nowMs]=params;
 demand(typeof actor==='string'&&[1,2,3,4].includes(channel)&&typeof incarnation==='string'&&Number.isSafeInteger(epoch)&&epoch>0&&Number.isSafeInteger(revision)&&revision>=0&&Number.isSafeInteger(nowMs)&&nowMs>=0,'actor_bundle_parameters');
 if(insideTransaction)demand(sql.isTransaction,'actor_bundle_transaction');else sql.exec('BEGIN');
 try{
  const owner=sql.prepare(`SELECT o.*,a.session_id,CASE WHEN a.player_id IS NULL THEN 1 ELSE 0 END AS passive
   FROM kernel511_channel_owners o LEFT JOIN kernel511_admissions a ON a.player_id=o.player_id AND a.epoch=o.epoch AND a.channel=o.channel
   LEFT JOIN kernel511_simulations s ON s.player_id=o.player_id AND s.epoch=o.epoch AND s.channel=o.channel
   WHERE o.player_id=? AND (a.player_id IS NOT NULL OR s.player_id IS NOT NULL)`).get(actor);
  demand(owner&&owner.channel===channel&&owner.incarnation===incarnation&&owner.epoch===epoch&&owner.state==='active','actor_bundle_owner_fenced');
  const player=sql.prepare('SELECT * FROM players WHERE id=?').get(actor);demand(player&&player.channel===channel,'actor_bundle_scope_changed');
  const readAll=query=>cache?cache.read(query,[],()=>sql.prepare(query).all()):sql.prepare(query).all();
  const combat=readCombatBundle(sql,actor,{revision,nowMs}),world=sql.prepare('SELECT * FROM world_state WHERE id=1').get(),settings={...readAll('SELECT * FROM game_settings WHERE id=1')[0],...readAll('SELECT * FROM combat_settings WHERE id=1')[0]};
  const party=sql.prepare('SELECT p.* FROM parties p JOIN party_members m ON m.party_id=p.id WHERE m.player_id=?').get(actor)??null;
  const arena=player.arena_match_id?sql.prepare('SELECT * FROM arena_matches WHERE id=?').get(player.arena_match_id)??null:null;
  const result={actor,revision,owner,player,castleGuild:readCastleGuild(sql,actor),adventure:readAdventureBundle(sql,player),combat,world,settings,engagement:sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(actor)??null,
   fishing:sql.prepare('SELECT * FROM fishing_sessions WHERE player_id=?').get(actor)??null,
   party,partyMembers:party?sql.prepare('SELECT m.*,COALESCE((SELECT a.channel FROM kernel511_admissions a WHERE a.player_id=m.player_id),(SELECT s.channel FROM kernel511_simulations s WHERE s.player_id=m.player_id),0) AS live_channel511 FROM party_members m WHERE m.party_id=?').all(party.id):[],
   guildSkill:sql.prepare('SELECT s.* FROM guild_skills s JOIN guild_members m ON m.guild_id=s.guild_id WHERE m.player_id=?').get(actor)??null,
   arena,arenaPlayers:arena?sql.prepare('SELECT * FROM arena_match_players WHERE match_id=?').all(arena.id):[],
   profiles:readAll('SELECT * FROM all_monster_combat_profiles'),dungeon:readDungeonAdmission(sql,[actor])};
  if(mountEnabled()&&sql.prepare("SELECT 1 FROM sqlite_schema WHERE name='mount_profiles_r49'").get())result.mounts=readMountBundle(sql,actor,{now:nowMs});
  if(!insideTransaction)sql.exec('COMMIT');return result;
 }catch(error){if(!insideTransaction)sql.exec('ROLLBACK');throw error;}
}

export async function readActorWorldBundle(sql,params,reader=new ColdWorldReader(sql),{insideTransaction=false}={}){
 demand(Array.isArray(params)&&params.length===7,'actor_world_parameters');
 const access=params[6];demand(access&&typeof access.account==='string'&&Number.isSafeInteger(access.chatAfterId)&&access.chatAfterId>=0&&Object.hasOwn(access,'starterReward'),'actor_world_access');
 if(insideTransaction)demand(sql.isTransaction,'actor_world_transaction');else sql.exec('BEGIN');try{
  const slim=r35Options.slimReload!=='0';if(slim)reader.cache.begin();
  const bundle=readActorBundle(sql,params.slice(0,6),{insideTransaction:true,cache:slim?reader.cache:null});
  demand(bundle.owner.passive===0&&bundle.player.account_id===access.account,'actor_world_owner_fenced');
  bundle.projection=await reader.read({auth:{account:{id:access.account},player:{id:bundle.actor},gamePresence:{chatAfterId:access.chatAfterId}},nowMs:params[5],starterReward:access.starterReward,maintenance:access.maintenance??null,actorBundle:bundle});
  if(sql.prepare("SELECT 1 FROM sqlite_schema WHERE name='kernel511_market_version'").get())bundle.projection.marketRevision=readMarketRevision(sql);
  let result=encodeSlimBundle(bundle,access.slim);
  if(r35Options.slimReload==='shadow'){
   const full=readActorBundle(sql,params.slice(0,6),{insideTransaction:true});
   full.projection=await reader.read({auth:{account:{id:access.account},player:{id:bundle.actor},gamePresence:{chatAfterId:access.chatAfterId}},nowMs:params[5],starterReward:access.starterReward,maintenance:access.maintenance??null,fresh:true});
   if(Object.hasOwn(bundle.projection,'marketRevision'))full.projection.marketRevision=readMarketRevision(sql);
   result={...encodeSlimBundle(full,null),slimShadow:result.slimShadow??result};
  }
  if(!insideTransaction)sql.exec('COMMIT');return result;
 }catch(error){if(!insideTransaction)sql.exec('ROLLBACK');throw error;}
}

export function readChannelBoot(sql,params){
 demand(Array.isArray(params)&&params.length===4,'channel_boot_parameters');const [channel,incarnation,revision,nowMs]=params;
 demand([1,2,3,4].includes(channel)&&typeof incarnation==='string'&&Number.isSafeInteger(revision)&&revision>=0&&Number.isSafeInteger(nowMs),'channel_boot_parameters');
 sql.exec('BEGIN');try{
  const process=sql.prepare('SELECT * FROM kernel511_channel_processes WHERE channel=?').get(channel);demand(process?.incarnation===incarnation&&process.online===1,'channel_boot_fenced');
  const actors=sql.prepare("SELECT player_id FROM kernel511_channel_owners WHERE channel=? AND incarnation=? AND state='active' AND (EXISTS(SELECT 1 FROM kernel511_admissions a WHERE a.player_id=kernel511_channel_owners.player_id AND a.epoch=kernel511_channel_owners.epoch) OR EXISTS(SELECT 1 FROM kernel511_simulations s WHERE s.player_id=kernel511_channel_owners.player_id AND s.epoch=kernel511_channel_owners.epoch))").all(channel,incarnation).map(r=>r.player_id);
  const dungeon=readDungeonAdmission(sql,actors.slice(0,25));
  for(let offset=25;offset<actors.length;offset+=25){const part=readDungeonAdmission(sql,actors.slice(offset,offset+25));for(const key of ['players','memberships','materials','runs'])dungeon[key].push(...part[key]);}
  dungeon.runs=[...new Map(dungeon.runs.map(r=>[r.run.id,r])).values()];
  const result={world:sql.prepare('SELECT * FROM world_state WHERE id=1').get(),settings:{...sql.prepare('SELECT * FROM game_settings WHERE id=1').get(),...sql.prepare('SELECT * FROM combat_settings WHERE id=1').get()},
   profiles:sql.prepare('SELECT * FROM all_monster_combat_profiles').all(),monsters:sql.prepare("SELECT m.* FROM monsters m LEFT JOIN adventure_monsters a ON a.id=m.id LEFT JOIN adventure_runs r ON r.id=a.run_id WHERE (m.channel=0 OR m.channel=?) AND (a.id IS NULL OR (r.status='active' AND m.area=r.area))").all(channel),
   participants:sql.prepare('SELECT p.* FROM monster_participants p JOIN monsters m ON m.id=p.monster_id WHERE m.channel=? AND m.spawn_round=p.spawn_round').all(channel),
   bossParticipants:sql.prepare('SELECT p.* FROM boss_participants p JOIN players a ON a.id=p.player_id WHERE a.channel=? AND NOT EXISTS(SELECT 1 FROM monsters m WHERE m.channel=0 AND m.is_boss=1 AND m.spawn_round=p.boss_round)').all(channel),
   config:readConfiguration(sql,{revision,nowMs}),loadlab:globalThis.__colLoadLab.snapshot(),dungeon,castle:readCastleBoot(sql),adventure:readAdventureBoot(sql,channel,nowMs),runeBossStates:sql.prepare('SELECT * FROM rune_v2_boss_state484 WHERE channel=?').all(channel)};
  if(sql.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='kernel511_system_owners'").get())result.system=sql.prepare('SELECT * FROM kernel511_system_owners WHERE service=?').get('channel:'+channel)??null;
  if(sql.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='kernel511_world_version'").get())result.worldPoint=readWorldPoint(sql);
  sql.exec('COMMIT');return result;
 }catch(error){sql.exec('ROLLBACK');throw error;}
}

export function readWorldBoot(sql,params){
 demand(Array.isArray(params)&&params.length===2&&typeof params[0]==='string'&&Number.isSafeInteger(params[1]),'world_boot_parameters');
 sql.exec('BEGIN');try{
  const system=sql.prepare("SELECT * FROM kernel511_system_owners WHERE service='world'").get();demand(system?.online===1&&system.incarnation===params[0]&&system.epoch===params[1],'world_boot_fenced');
  const rows=sql.prepare(`SELECT e.*,o.channel AS owner_channel,o.incarnation AS owner_incarnation,o.epoch AS owner_epoch FROM pve_engagements e JOIN kernel511_channel_owners o ON o.player_id=e.player_id`).all();
  const result={system,world:sql.prepare('SELECT * FROM world_state WHERE id=1').get(),settings:{...sql.prepare('SELECT * FROM game_settings WHERE id=1').get(),...sql.prepare('SELECT * FROM economy_settings WHERE id=1').get(),...sql.prepare('SELECT * FROM combat_settings WHERE id=1').get()},monsters:sql.prepare('SELECT * FROM monsters WHERE channel=0').all(),config:{dragon_settings:sql.prepare('SELECT * FROM dragon_settings WHERE id=1').get()},loadlab:globalThis.__colLoadLab.snapshot(),engagements:rows.map(({owner_channel,owner_incarnation,owner_epoch,...engagement})=>({actor:engagement.player_id,epoch:owner_epoch,channel:owner_channel,incarnation:owner_incarnation,engagement}))};
  result.participants=sql.prepare('SELECT p.* FROM monster_participants p JOIN monsters m ON m.id=p.monster_id WHERE m.channel=0 AND m.spawn_round=p.spawn_round').all();
  result.bossParticipants=sql.prepare('SELECT p.* FROM boss_participants p WHERE EXISTS(SELECT 1 FROM monsters m WHERE m.channel=0 AND m.is_boss=1 AND m.spawn_round=p.boss_round)').all();
  if(sql.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='kernel511_world_version'").get())result.worldPoint=readWorldPoint(sql);
  sql.exec('COMMIT');return result;
 }catch(error){sql.exec('ROLLBACK');throw error;}
}
