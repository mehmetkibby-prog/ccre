import {Worker} from 'node:worker_threads';
import {guardDeathBatchActorsR57} from './death-batch-writer-r57.mjs';
import {statSync,realpathSync} from 'node:fs';
import {rewardWorkerR533} from './r533-options.mjs';
import {exclusiveWriterLaneR533} from './writer-lane-r533.mjs';
import {demand,kernelError} from './contract.mjs';
import {assertNativeWriteResources} from './native-write-resources.mjs';
import {assertSettlementResources} from './settlement-resources.mjs';
import {actorRejection,receiveActorRejection,rejectActorJob,rejectSharedActorJob} from './actor-rejection.mjs';
import {readReceipt} from './compact-receipt.mjs';
import {requestDigest} from './generated/owner-protocol.mjs';
import {stageRecordR51} from './stage-timing-r51.mjs';
import {readWorldPoint} from './world-state.mjs';
import {readMarketRevision} from './market-state.mjs';
import {readGuildRevision} from './guild-state.mjs';
import {withPreparedStatements477} from '../../../native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';

const areas=new Set(['forest','frozen','ancient']);
const scopeCodes=new Set(['owner_epoch_fenced','simulation_epoch_fenced','shared_terminal_actor_fenced','transition_actor_fenced','permanent_actor_fenced','actor_command_pending','global_world_busy']);
const failShape=error=>({code:error?.code??'reward_worker_failed',message:error?.message??'reward_worker_failed'});
export class RewardWorkerR533 {
 constructor(core,{entry=new URL('./reward-worker-entry-r533.mjs',import.meta.url),workerOptions={}}={}){
  this.core=core;this.writer=core.writer;this.database=core.database;this.entry=entry;this.workerOptions=workerOptions;this.slot=null;this.serial=0;this.closed=false;
  const file=this.database.sqlite.prepare('PRAGMA database_list').all().find(r=>r.name==='main')?.file;
  if(!file)return;this.file=realpathSync(file);const stat=statSync(this.file);demand(stat.nlink===1,'reward_worker_file_identity');this.identity={dev:String(stat.dev),ino:String(stat.ino)};
  this.lane=exclusiveWriterLaneR533(this.database);this.stats={jobs:0,fallbacks:0,replays:0,rollbacks:0,restarts:0,maxWorkerMs:0,maxPreflightMs:0,startups:0,maxStartupMs:0,maxReadyWaitMs:0};
  if(core.permanent)core.permanent.beforeNativeOperationR533=()=>this.lane.idle();
  this.checkpoint=this.database.core511CheckpointR79;this.unsubscribeCheckpoint=this.checkpoint?.subscribe(()=>{const slot=this.slot;if(slot&&!slot.ended)try{slot.worker.postMessage({type:'checkpoint_mode_r79'});}catch{/* The worker checks the shared state before COMMIT. */}});
  const close=this.database.close;this.database.close=(...args)=>{demand(!this.lane.busy,'reward_worker_close_pending');void this.close();return close.apply(this.database,args);};
 }
 candidate(request){
  if(!rewardWorkerR533||!this.file||this.closed)return false;
  const p=request.payload,player=p?.expected?.player;
  if(!player||!areas.has(player.area)||player.arena_match_id||player.instance_id)return false;
  return request.operation==='attack'&&p.input?.action==='attack'&&!p.expected?.monster?.is_boss&&!p.expected?.monster?.is_stone||request.operation==='native_action'&&p.input?.action==='claim_rewards'&&Array.isArray(p.input.rewardTargets)&&p.input.rewardTargets.length<=10;
 }
 safeScope(sql,request){
  // Native HTTP services may own synchronous SQLite transactions outside
  // atomic(). Once their freeze starts, keep all new jobs on the main lane;
  // the cold callback awaits any worker already in flight before entering SQL.
  if(this.core.permanent.entries.size||this.lane.nativeWrites)return false;
  const p=request.payload,keys=p.resources;if(!Array.isArray(keys)||keys.length>2048)return false;
  const ids=keys.filter(k=>k.startsWith('monster:')).map(k=>k.slice(8));
  // Native special maps, shared monsters, bosses and stones keep their existing
  // writer path. This also fences a mixed AoE whose primary target is ordinary.
  if(sql.prepare("SELECT 1 FROM json_each(?) j JOIN monsters m ON m.id=j.value WHERE m.hp>0 AND (m.is_boss<>0 OR m.is_stone<>0 OR m.channel=0 OR m.area NOT IN ('forest','frozen','ancient')) LIMIT 1").get(JSON.stringify(ids)))return false;
  return true;
 }
 envelope(peer,request,context,stamps){
  const c=this.core,sql=this.database.sqlite,shared=c.sharedWorld?.combat,h=shared?.terminal,blocked=[];
  const ids=new Set([...c.actorIsolation.entries.keys(),...c.actorIsolation.unknownActors.keys(),...c.permanent.entries.keys(),...c.transitions.keys()]);
  for(const id of ids){const key='player:'+id,probe=request.payload.resources.includes(key)?request:{...request,payload:{...request.payload,resources:[...request.payload.resources,key]}};try{c.authority.commandGuard(sql,peer,probe);}catch(error){demand(scopeCodes.has(error.code),'reward_worker_guard_snapshot');blocked.push([id,error.code]);}}
  let snapshot=null;
  if(request.payload.sharedLease){shared.assertWrite(sql,request.payload,context);const actors=[...new Set([...h.channels.flatMap(ch=>ch.answer.actors.map(p=>p.id)),...(h.stopped?.keys()??[])])];snapshot={proof:h.row.proof,actors,owners:actors.map(id=>({id,...Object.fromEntries(['channel','incarnation','epoch','sequence','state'].map(k=>[k,c.authority.owner(id,sql)[k]]))}))};}
  const registry=globalThis.__colLoadLab;demand(registry?.snapshot&&registry.faults,'reward_worker_registry');
  return {peer,request,clockNow:c.clock(),presence:stamps,blocked,shared:snapshot,registry:registry.snapshot(),registryFaults:registry.faults()};
 }
 dispatch(peer,request){
  const marker={},w=this.writer,sql=this.database.sqlite;let envelope=null,stamps=[],written=[];
  const descriptor={get written(){return written;},execute:(db,source)=>{
   const context={actor:source.playerId,epoch:source.epoch,peer:{...peer,realm:w.authority.realmId},key:source.operationId,realm:w.authority.realmId};
   if(!this.safeScope(db,request)){
    this.stats.fallbacks++;stamps=w.presence.materialize(db);written=stamps;return w.authority.operations[request.operation].execute(db,source);
   }
   demand(w.ports.guard(db,request.payload,context,request.operation)===true,'game_writer_security');
   guardDeathBatchActorsR57(db,request.payload,context,w.ports.guard);
   assertNativeWriteResources(db,request.payload,context,{authority:w.authority,shared:w.sharedCombat});assertSettlementResources(db,request.payload,context);
   stamps=[...w.presence.rows.values()];envelope=this.envelope(peer,request,context,stamps);throw marker;
  },atomic:work=>this.lane.run(async()=>{
   const started=performance.now();let value,delegated=false;
   this.database.assertAvailable();demand(!sql.isTransaction,'reward_worker_main_transaction');sql.exec('BEGIN IMMEDIATE');
   // This exclusive-lane transaction bypasses LocalDatabase.drainWrites.
   // Give its synchronous preflight/fallback the same bounded statement
   // cache and schema validation as the normal writer lane. End the scope
   // before COMMIT or delegation; no bindings/authority survive an await.
   try{value=withPreparedStatements477(sql,()=>work(sql));this.database.commitWrites();}
   catch(error){if(sql.isTransaction)sql.exec('ROLLBACK');if(error!==marker){await this.database.durableAfterCommit();throw error;}delegated=true;}
   finally{const ms=performance.now()-started;this.stats.maxPreflightMs=Math.max(this.stats.maxPreflightMs,ms);stageRecordR51('rewardWorker.preflight',ms);}
   if(!delegated){await this.database.durableAfterCommit();return value;}
   const stat=statSync(this.file);demand(String(stat.dev)===this.identity.dev&&String(stat.ino)===this.identity.ino,'reward_worker_file_identity');
   let result;
   try{result=await this.send(envelope);}
   catch(error){return this.reconcileExit(peer,request,error);}
   this.stats.jobs++;this.stats.maxWorkerMs=Math.max(this.stats.maxWorkerMs,result.workMs??0);stageRecordR51('rewardWorker.job',result.workMs??0);
   if(!result.ok){const e=Object.assign(Error(result.error.message),result.error);if(result.error.rejection)receiveActorRejection(e,result.error.rejection,'command',request);throw e;}
   const receipt=sql.prepare('SELECT player_id,epoch,sequence FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId);
   demand(result.ack?.key===request.operationId&&receipt?.player_id===request.playerId&&receipt.epoch===request.epoch&&receipt.sequence===request.sequence,'reward_worker_ack_fenced');
   written=stamps.filter(p=>result.written.some(([id,version])=>id===p.actor&&version===p.version));w.authority.stats.commands++;
   for(const actor of result.ack.result?.notificationActors??[])w.notifications.invalidatePending(actor);
   return result.ack;
  }).then(value=>{this.publishCommitted();return value;})};return descriptor;
 }
 publishCommitted(){
  // External COMMIT bypasses the main connection's atomic feed wrappers.
  // Publish current durable metadata (never the historical receipt's image).
  const sql=this.database.sqlite,w=this.writer;demand(!sql.isTransaction,'reward_worker_feed_uncommitted');
  w.worldState.publish(readWorldPoint(sql));w.marketState.publish(readMarketRevision(sql));w.guildState.publish(readGuildRevision(sql));
 }
 start(){
  demand(!this.closed&&this.lane.busy,'reward_worker_start_outside_lane');
  const started=performance.now();this.stats.startups++;
  const worker=new Worker(this.entry,{...this.workerOptions,workerData:{...this.workerOptions.workerData,role:'core511-reward-r533',file:this.file,realmId:this.core.realmId,...this.identity,checkpointR79:this.checkpoint?.buffer}}),slot={worker,ended:false,pending:null};this.slot=slot;
  slot.exit=new Promise(resolve=>slot.exited=resolve);slot.ready=new Promise((resolve,reject)=>{slot.resolveReady=resolve;slot.rejectReady=reject;});
  const fail=error=>{slot.error=error;void worker.terminate().catch(()=>{});};
  worker.on('message',message=>{
   if(message.type==='ready'){slot.checkpointR79=message.checkpointR79??null;const ms=performance.now()-started;this.stats.maxStartupMs=Math.max(this.stats.maxStartupMs,ms);stageRecordR51('rewardWorker.startup',ms);slot.resolveReady();return;}
   if(message.type==='checkpoint_mode_r79'){slot.checkpointR79=message.checkpointR79;return;}
   if(message.type==='closed')return;
   if(message.type==='fatal'){fail(kernelError(message.code));return;}
   if(message.testHook){this.onTestHook?.(message,slot);return;}
   const pending=slot.pending;if(!pending||message.id!==pending.id){fail(kernelError('reward_worker_reply_fenced'));return;}
   slot.pending=null;clearTimeout(pending.timer);pending.resolve(message);
  });
  worker.on('error',error=>{slot.error=error;});
  worker.once('exit',code=>{slot.ended=true;slot.exited(code);const error=slot.error??kernelError('reward_worker_exit');slot.rejectReady(error);if(slot.pending){clearTimeout(slot.pending.timer);slot.pending.reject(error);slot.pending=null;}});
  return slot;
 }
 async ready(){
  let slot=this.slot;if(!slot||slot.ended){if(slot)this.stats.restarts++;slot=this.start();}
  const started=performance.now();
  const readyTimeout=setTimeout(()=>{slot.error=kernelError('reward_worker_start_timeout');void slot.worker.terminate();},10000);
  try{await slot.ready;}finally{clearTimeout(readyTimeout);const ms=performance.now()-started;this.stats.maxReadyWaitMs=Math.max(this.stats.maxReadyWaitMs,ms);stageRecordR51('rewardWorker.readyWait',ms);}
  return slot;
 }
 prepare(){
  // Initialization creates native schema/trigger state. Keep it in the SAME
  // sole-writer FIFO, but complete it before channel admission, not first kill.
  // Concurrent channel boots share one reservation. Recovery still uses send's
  // fenced lazy restart if a previously ready worker exits during gameplay.
  if(!this.preparing)this.preparing=this.lane.run(()=>this.ready()).finally(()=>{this.preparing=null;});
  return this.preparing;
 }
 async send(envelope){
  const slot=await this.ready();
  demand(!slot.ended&&!slot.pending,'reward_worker_not_idle');
  const id=++this.serial;return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{slot.error=kernelError('reward_worker_timeout');void slot.worker.terminate();},15000);
   slot.pending={id,resolve,reject,timer};try{slot.worker.postMessage({type:'run',id,envelope});}catch(error){slot.error=error;void slot.worker.terminate();}
  });
 }
 async reconcileExit(peer,request,error){
  const slot=this.slot;demand(slot,'reward_worker_missing_slot');await slot.exit;
  // Actual worker exit closes/rolls back its SQLite connection. A receipt is
  // authoritative only after an explicit durability barrier on the same WAL.
  await this.database.durableAfterCommit();const sql=this.database.sqlite;
  const receipt=sql.prepare('SELECT * FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId),owner=this.core.authority.owner(request.playerId);
  if(receipt){const digest=requestDigest({realmId:this.core.realmId,channel:peer.channel,playerId:request.playerId,epoch:request.epoch,sequence:request.sequence,operation:request.operation,payload:request.payload});demand(receipt.digest===digest&&receipt.player_id===request.playerId&&receipt.epoch===request.epoch&&receipt.sequence===request.sequence&&owner?.epoch===request.epoch&&owner.sequence===request.sequence,'reward_worker_receipt_fenced');this.stats.replays++;const ack=readReceipt(sql,receipt.response);for(const actor of ack.result?.notificationActors??[])this.writer.notifications.invalidatePending(actor);return ack;}
  demand(owner?.epoch===request.epoch&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&owner.sequence===request.sequence-1&&!sql.isTransaction,'reward_worker_rollback_unproven');
  const check=sql.prepare('PRAGMA quick_check').get();demand(Object.values(check)[0]==='ok','reward_worker_database_integrity');
  this.stats.rollbacks++;const rejection=kernelError('reward_worker_rolled_back');this.core.onFault({actor:request.playerId,channel:peer.channel,error:rejection,authentication:true,rewardWorker:true,cause:failShape(error)});
  throw (request.payload.sharedLease?rejectSharedActorJob:rejectActorJob)(rejection,peer,request);
 }
 async close(){if(this.closed)return;this.closed=true;this.unsubscribeCheckpoint?.();await this.lane?.idle();const slot=this.slot;if(slot&&!slot.ended)await slot.worker.terminate();this.lane?.close();}
}
export function installRewardWorkerR533(core){if(!rewardWorkerR533)return null;const instance=new RewardWorkerR533(core);return instance.file?instance:null;}
