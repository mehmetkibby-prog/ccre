import {channelAdmissionR59} from './castle-capacity-r59.mjs';
import {timedAtomicR51} from './stage-timing-r51.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {ChannelAuthority} from './receipt-authority.mjs';
import {opaqueId,channelNumber,channelError} from './generated/owner-protocol.mjs';
import {CAPACITY,demand,selectChannel} from './contract.mjs';
import {actorRejection,rejectActorJob,rejectSharedActorJob,receiveActorRejection} from './actor-rejection.mjs';
import {assertLocalRewardScope,LOCAL_KILL_REJECTED,LOCAL_CLAIM_REJECTED} from './local-reward-scope.mjs';
import {assertLocalCollectScope,LOCAL_COLLECT_REJECTED} from './local-collect-scope.mjs';
import {isLocalRollback} from './local-write-rejection.mjs';
import {rejectUnsentActorJob} from './transport-not-sent.mjs';
import {assertLocalMixedScope} from './local-mixed-scope.mjs';
import {checkpointConflictProof} from './checkpoint-rejection.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {actorFrameIsolation} from './r48_3-options.mjs';
import {actorFrameConflictProof} from './actor-frame-rejection.mjs';
import {ActorCommandOutcomes} from './actor-command-outcomes.mjs';
import {commandOutputRollbackProof} from './command-output-guard.mjs';
import {authorityReadR57,deathBatchR57} from './r57-options.mjs';
import {readActorFenceR57,readResourceActorFencesR57} from './authority-read-r57.mjs';

// Main-writer only. Persistent admissions change on login/exit/transfer, never
// on WS ping. A disconnected socket retains its admission during reconnect
// grace; the session controller must quiesce and checkpoint before logout.
// Original V510 tables remain untouched, including their three-channel CHECKs.
export class ChannelOwnership extends ChannelAuthority {
 async initialize(){
  await super.initialize();
  await this.database.atomic(db=>db.exec(`
   CREATE TABLE IF NOT EXISTS kernel511_admissions(
    player_id TEXT PRIMARY KEY,channel INTEGER NOT NULL CHECK(channel BETWEEN 1 AND 4),
    epoch INTEGER NOT NULL,session_id TEXT NOT NULL,created_ms INTEGER NOT NULL);
   CREATE INDEX IF NOT EXISTS kernel511_admission_channel ON kernel511_admissions(channel);
   CREATE TABLE IF NOT EXISTS kernel511_simulations(
    player_id TEXT PRIMARY KEY,channel INTEGER NOT NULL CHECK(channel BETWEEN 1 AND 4),
    epoch INTEGER NOT NULL,run_id TEXT NOT NULL,created_ms INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS kernel511_transfers(
    transfer_id TEXT PRIMARY KEY,player_id TEXT NOT NULL,source_channel INTEGER NOT NULL,
    source_epoch INTEGER NOT NULL,target_channel INTEGER NOT NULL,target_epoch INTEGER NOT NULL,
    target_incarnation TEXT NOT NULL,session_id TEXT NOT NULL,created_ms INTEGER NOT NULL);
  `));
 }
 owner(id,db=this.database.sqlite){return prepareServerStatement(db,'SELECT * FROM kernel511_channel_owners WHERE player_id=?',{legacyCached:true}).get(opaqueId(id))??null;}
 admission(id,db=this.database.sqlite){return prepareServerStatement(db,'SELECT * FROM kernel511_admissions WHERE player_id=?',{legacyCached:true}).get(opaqueId(id))??null;}
 simulation(id,db=this.database.sqlite){return prepareCached477(db,'SELECT * FROM kernel511_simulations WHERE player_id=?').get(opaqueId(id))??null;}
 resourceFencesR57(db,ids){return readResourceActorFencesR57(db,ids);}
 counts(db=this.database.sqlite){
  const rows=prepareCached477(db,'SELECT channel,COUNT(*) AS n FROM kernel511_admissions GROUP BY channel').all();
  const counts=new Map(rows.map(r=>[r.channel,r.n]));
  const online=new Set(prepareCached477(db,'SELECT channel FROM kernel511_channel_processes WHERE online=1').all().map(r=>r.channel));
  for(const channel of [1,2,3,4])if(!online.has(channel))counts.set(channel,CAPACITY);
  return counts;
 }
 emptiest(){return selectChannel(this.counts());}
 assertAdmitted(db,peer,id,epoch,{allowDraining=false}={}){
  this.assertProcess(peer.channel,peer.incarnation,db);
  const {owner,admission}=authorityReadR57?readActorFenceR57(db,id):{owner:this.owner(id,db),admission:this.admission(id,db)};
  demand(owner&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&owner.epoch===epoch&&
   (owner.state==='active'||allowDraining&&owner.state==='draining')&&admission&&admission.epoch===epoch&&admission.channel===peer.channel,'owner_epoch_fenced');
  return owner;
 }
 assertSimulated(db,peer,id,epoch,{allowDraining=false}={}){
  if(authorityReadR57){
   const {owner,admission,simulation}=readActorFenceR57(db,id);this.assertProcess(peer.channel,peer.incarnation,db);
   const permit=admission??simulation;
   demand(owner&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&owner.epoch===epoch&&(owner.state==='active'||allowDraining&&owner.state==='draining')&&permit&&permit.channel===peer.channel&&permit.epoch===epoch,admission?'owner_epoch_fenced':'simulation_epoch_fenced');return owner;
  }
  if(this.admission(id,db))return this.assertAdmitted(db,peer,id,epoch,{allowDraining});
  this.assertProcess(peer.channel,peer.incarnation,db);const owner=this.owner(id,db),simulation=this.simulation(id,db);
  demand(owner&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&owner.epoch===epoch&&(owner.state==='active'||allowDraining&&owner.state==='draining')&&simulation&&simulation.channel===peer.channel&&simulation.epoch===epoch,'simulation_epoch_fenced');return owner;
 }
 async registerProcess(channel,incarnation){
  // Parent transaction restores OLD ownership on incomplete handoff and raises
  // epoch. Admissions follow that new epoch; stale tickets cannot resume.
  const original=this.database;
  const database={...original,sqlite:original.sqlite,atomic:work=>original.atomic(db=>{
   const result=work(db);
   prepareCached477(db,`UPDATE kernel511_admissions SET epoch=(SELECT epoch FROM kernel511_channel_owners o WHERE o.player_id=kernel511_admissions.player_id)
    WHERE channel=?`).run(channel);
   prepareCached477(db,`UPDATE kernel511_simulations SET epoch=(SELECT epoch FROM kernel511_channel_owners o WHERE o.player_id=kernel511_simulations.player_id)
    WHERE channel=?`).run(channel);
   return result;
  })};
  // Use a per-call native instance, never temporarily mutate a shared database
  // facade while other asynchronous registration/command calls are outstanding.
  const native=new ChannelAuthority(database,{realmId:this.realmId,operations:this.operations,now:this.now});
  native.stats=this.stats;
  return native.registerProcess(channel,incarnation);
 }
 async admit(id,peer,{sessionId,guard,prepare=null,simulationFinalSequence}){
  const pending=this.database.atomic(db=>this.admitIn(db,id,peer,{sessionId,guard,prepare,simulationFinalSequence}));
  return this.commandOutcomes?pending.then(value=>{this.commandOutcomes.pruneActor(id);return value;}):pending;
 }
 admitIn(db,id,peer,{sessionId,guard,prepare=null,simulationFinalSequence}){
  demand(db===this.database.sqlite&&db.isTransaction,'admission_requires_atomic');
  opaqueId(id);opaqueId(sessionId);channelNumber(peer.channel);
  demand(typeof guard==='function'&&guard.constructor.name!=='AsyncFunction','admission_guard_required');
  demand(prepare===null||typeof prepare==='function'&&prepare.constructor.name!=='AsyncFunction','admission_prepare_required');
   this.admissionGuard?.([id]);
   this.assertProcess(peer.channel,peer.incarnation,db);let owner=this.owner(id,db);const prior=this.admission(id,db),simulation=this.simulation(id,db);
   if(prior){demand(owner?.state==='active'&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&prior.channel===owner.channel&&prior.epoch===owner.epoch&&prior.session_id===sessionId,'session_already_admitted');return owner;}
   demand(!owner||owner.state==='active','owner_epoch_fenced');
   // An offline dungeon room keeps simulation authority but consumes no live
   // admission. Relogin must join that room's channel until native membership
   // ends. The supervisor drains/rebinds the passive actor before admission.
   if(simulation){demand(owner?.channel===peer.channel&&owner.incarnation===peer.incarnation&&simulation.epoch===owner.epoch,'simulation_channel_locked');demand(Number.isSafeInteger(simulationFinalSequence)&&simulationFinalSequence===owner.sequence,'simulation_not_drained');}
   demand(channelAdmissionR59(db,id,peer.channel),'channel_full');
   // Native join may settle lethal incoming damage and then reject admission.
   // Commit that effect without minting ownership or the starter reward. A
   // thrown error still rolls back the entire native transaction as before.
   if(prepare){const result=prepare(db,owner);demand(!result?.then&&typeof result?.accepted==='boolean','admission_prepare_result');if(!result.accepted)return result;}
   if(owner){
    // Fresh login after a completed logout can select the emptiest channel.
    // Never delete the old epoch watermark or rehome an admitted character.
    prepareCached477(db,`UPDATE kernel511_channel_owners SET channel=?,epoch=epoch+1,incarnation=?,sequence=0,updated_ms=? WHERE player_id=?`)
     .run(peer.channel,peer.incarnation,this.now(),id);
   }else prepareCached477(db,"INSERT INTO kernel511_channel_owners(player_id,channel,epoch,incarnation,state,updated_ms) VALUES(?,?,1,?,'active',?)").run(id,peer.channel,peer.incarnation,this.now());
   owner=this.owner(id,db);
   demand(guard(db,owner)===true,'admission_rejected');
   prepareCached477(db,'DELETE FROM kernel511_simulations WHERE player_id=?').run(id);
   prepareCached477(db,'INSERT INTO kernel511_admissions VALUES(?,?,?,?,?)').run(id,owner.channel,owner.epoch,sessionId,this.now());
   return owner;
 }
 resume(id,peer,{epoch,sessionId}){
  return this.database.atomic(db=>{const owner=this.assertAdmitted(db,peer,id,epoch);
   demand(this.admission(id,db).session_id===sessionId,'session_epoch_fenced');return owner;});
 }
 command(peer,request,{before=null,after=null,dispatch=null}={}){
  const original=this.database,definition=this.operations[request.operation];let checkpointRejected=null,sharedGuardRejected=null,frameRejected=null,outputRejected=null;
  const outcomes=actorFrameIsolation?(this.commandOutcomes??=new ActorCommandOutcomes(this)):null;let flight;
  try{flight=outcomes?.begin(peer,request);}catch(error){return Promise.reject(error);}
  const atomic=work=>dispatch?dispatch.atomic(work):timedAtomicR51(original,work,request.operation);
  const database={sqlite:original.sqlite,atomic:work=>atomic(db=>{
   this.assertProcess(peer.channel,peer.incarnation,db);
   try{(definition?.allowSimulation?this.assertSimulated:this.assertAdmitted).call(this,db,peer,request.playerId,request.epoch,{allowDraining:definition?.duringDrain===true});this.commandGuard?.(db,peer,request);
    // R22 local kill/claim: re-check CURRENT DB scope before any native work.
    const local=request.payload?.localScope;if(local){const code=local.kind==='collect'?LOCAL_COLLECT_REJECTED:local.kind==='claim'?LOCAL_CLAIM_REJECTED:LOCAL_KILL_REJECTED,offline=['collect','mixed'].includes(local.kind)?(local.kind==='mixed'?assertLocalMixedScope:assertLocalCollectScope)(db,{local,input:request.payload.input,resources:request.payload.resources,peer,actor:request.playerId,nowMs:request.payload.nowMs,batchSinglesR57:deathBatchR57&&request.operation==='attack'&&Array.isArray(request.payload.batchAttacksR57)&&request.payload.batchAttacksR57.length>0&&request.payload.batchAttacksR57.length<=4}):assertLocalRewardScope(db,{code,targets:local.targets,input:request.payload.input,nativeLimit:local.nativeLimit,completedR56:local.completedR56,resources:request.payload.resources,peer,actor:request.playerId});
     // Offline party members may be written; run the post-work owner guard on
     // them now, so a member mid-logout/transfer falls back instead of failing.
     if(offline.length)try{this.commandGuard?.(db,peer,{...request,payload:{...request.payload,resources:[...request.payload.resources,...offline.map(id=>'player:'+id)]}});}catch{throw Object.assign(new Error(code),{code});}}}
   catch(error){
    // Never turn a replay/retired sequence into a negative acknowledgement:
    // its first execution may already have committed before an ACK was lost.
    const owner=this.owner(request.playerId,db),receipt=prepareCached477(db,'SELECT 1 FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId);
    if(!receipt&&owner?.epoch===request.epoch&&request.sequence>owner.sequence){
     if(actorFaultIsolation&&request.payload?.sharedLease)sharedGuardRejected=error;
     else rejectActorJob(error,peer,request);
    }
    throw error;
   }
   if(before)demand(before(db)!==false,'command_preparation_rejected');let result;
   try{result=work(db);}catch(error){
    if(commandOutputRollbackProof(error,peer,request)){
     const owner=this.owner(request.playerId,db),receipt=prepareCached477(db,'SELECT 1 FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId);
     if(!receipt&&owner?.epoch===request.epoch&&request.sequence===owner.sequence+1)outputRejected=error;
    }
    if(checkpointConflictProof(error,peer,request)||actorFrameConflictProof(error,peer,request)){
     const owner=this.owner(request.playerId,db),receipt=prepareCached477(db,'SELECT 1 FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId);
     if(!receipt&&owner?.epoch===request.epoch&&request.sequence===owner.sequence+1){if(actorFrameConflictProof(error,peer,request))frameRejected=error;else checkpointRejected=error;}
    }
    if(isLocalRollback(error)){
     const owner=this.owner(request.playerId,db),receipt=prepareCached477(db,'SELECT 1 FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId);
     if(!receipt&&owner?.epoch===request.epoch&&request.sequence>owner.sequence)rejectActorJob(error,peer,request);
    }
    throw error;
   }
   if(after){demand(typeof after==='function'&&after.constructor.name!=='AsyncFunction','command_completion_synchronous');demand(!after(db,result)?.then,'command_completion_synchronous');}return result;
  })};
  const operations=dispatch?{...this.operations,[request.operation]:{...definition,execute:(db,context)=>dispatch.execute(db,context)}}:this.operations;
  const native=new ChannelAuthority(database,{realmId:this.realmId,operations,now:this.now});native.stats=this.stats;
  let pending;try{pending=native.command(peer,request);}catch(error){if(flight)outcomes.finish(flight);throw error;}
  const caught=pending.catch(error=>{
   // LocalDatabase rejects this SAME exception only after ROLLBACK TO the
   // request savepoint and successful group durability. A rollback/COMMIT/fsync
   // failure substitutes its own exception and cannot mint not_executed.
   if(outcomes&&(error===checkpointRejected||error===sharedGuardRejected||error===frameRejected||error===outputRejected||actorRejection(error))){
    // Another identical request may have committed in the same SQLite group
    // before this rejected job's fsync finished. Its receipt takes precedence.
    const owner=this.owner(request.playerId),receipt=prepareCached477(original.sqlite,'SELECT 1 FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId);
    if(receipt||!owner||owner.epoch!==request.epoch||owner.channel!==peer.channel||owner.incarnation!==peer.incarnation||owner.sequence>=request.sequence)throw Object.assign(Error(error.code),{code:error.code});
   }
   if(error===checkpointRejected)rejectActorJob(error,peer,request);
   if(error===sharedGuardRejected)rejectSharedActorJob(error,peer,request);
   if(error===frameRejected){if(request.payload?.sharedLease)rejectSharedActorJob(error,peer,request);else rejectActorJob(error,peer,request);}
   if(error===outputRejected){if(request.payload?.sharedLease)rejectSharedActorJob(error,peer,request);else rejectActorJob(error,peer,request);}
   outcomes?.remember(peer,request,error);
   // Retain the completed rollback proof, but do not publish it while another
   // identical request can still commit. command_status waits for that work.
   if(outcomes?.otherInFlight(flight)&&actorRejection(error))throw Object.assign(Error(error.code),{code:error.code});
   throw error;
  });
  if(!outcomes)return caught;
  return caught.then(value=>{outcomes.pruneActor(request.playerId);return value;}).finally(()=>outcomes.finish(flight));
 }
 async beginOwnedTransfer(id,peer,request){
  this.admissionGuard?.([id]);
  this.assertAdmitted(this.database.sqlite,peer,id,request.epoch);
  return super.beginTransfer(id,request);
 }
 async acceptOwnedTransfer(id,peer,request,transition){
  this.admissionGuard?.([id]);
  opaqueId(request.transferId);demand(typeof transition==='function'&&transition.constructor.name!=='AsyncFunction','transition_guard_required');
  const replay=db=>{
   const receipt=prepareCached477(db,'SELECT * FROM kernel511_transfers WHERE transfer_id=?').get(request.transferId);
   if(!receipt)return null;
   demand(receipt.player_id===id&&receipt.source_epoch===request.epoch&&receipt.target_channel===peer.channel&&receipt.target_incarnation===peer.incarnation,'transfer_id_reused');
   const owner=this.assertAdmitted(db,peer,id,receipt.target_epoch);
   demand(this.admission(id,db).session_id===receipt.session_id,'session_epoch_fenced');return owner;
  };
  const previous=await this.database.atomic(replay);if(previous)return previous;
  try{return await super.acceptTransfer(id,peer,request,(db,owner)=>{
   const admission=this.admission(id,db);
   demand(admission&&admission.channel===owner.channel&&admission.epoch===owner.epoch,'owner_epoch_fenced');
   demand(channelAdmissionR59(db,id,peer.channel,{transfer:true,castle:request.castleR59===true}),'channel_full');
   // Native game transition must apply combat/death/instance/access checks,
   // UPDATE players and party/arena/market cleanup in this SAME transaction.
   demand(transition(db,owner)===true,'transition_rejected');
   prepareCached477(db,'UPDATE kernel511_admissions SET channel=?,epoch=? WHERE player_id=?').run(peer.channel,owner.epoch+1,id);
   prepareCached477(db,'INSERT INTO kernel511_transfers VALUES(?,?,?,?,?,?,?,?,?)').run(request.transferId,id,owner.channel,owner.epoch,peer.channel,owner.epoch+1,peer.incarnation,admission.session_id,this.now());
   return true;
  });}catch(error){
   // Two identical accepts may have been queued before the first COMMIT.
   // Only a durable matching receipt and the still-current owner can replay.
   if(error.code==='channel_not_released'){const value=await this.database.atomic(replay);if(value)return value;}
   throw error;
  }
 }
 async logout(id,peer,{epoch,sessionId,finalSequence,complete=null,prepare=null}){
  demand(complete===null||typeof complete==='function'&&complete.constructor.name!=='AsyncFunction','logout_completion_synchronous');
  demand(prepare===null||typeof prepare==='function'&&prepare.constructor.name!=='AsyncFunction','logout_preparation_synchronous');
  const pending=this.database.atomic(db=>{
   this.admissionGuard?.([id]);
   this.assertProcess(peer.channel,peer.incarnation,db);
   const owner=this.owner(id,db),admission=this.admission(id,db);
   demand(owner&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&owner.epoch===epoch&&owner.state==='active','owner_epoch_fenced');
   demand(Number.isSafeInteger(finalSequence)&&finalSequence===owner.sequence,'channel_not_drained');
   if(!admission){if(complete)demand(!complete(db)?.then,'logout_completion_synchronous');return {loggedOut:true,epoch:owner.epoch};}
   demand(admission.session_id===sessionId&&admission.epoch===epoch,'session_epoch_fenced');
   if(prepare){const retire=prepare(db);demand(typeof retire==='boolean','logout_preparation_result');if(!retire)return {loggedOut:false,epoch:owner.epoch};}
   prepareCached477(db,'DELETE FROM kernel511_admissions WHERE player_id=?').run(id);
   // Epoch is retired even on the same process. A later fresh login cannot
   // reuse a previously issued ticket or in-flight operation sequence.
   prepareCached477(db,'UPDATE kernel511_channel_owners SET epoch=epoch+1,sequence=0,updated_ms=? WHERE player_id=?').run(this.now(),id);
   const member=prepareCached477(db,'SELECT run_id FROM dungeon_members WHERE player_id=?').get(id);
   if(member)prepareCached477(db,'INSERT INTO kernel511_simulations(player_id,channel,epoch,run_id,created_ms) VALUES(?,?,?,?,?)').run(id,peer.channel,epoch+1,member.run_id,this.now());
   if(complete)demand(!complete(db)?.then,'logout_completion_synchronous');
   return {loggedOut:true,epoch:epoch+1,...(member?{simulation:member.run_id}:{})};
  });
  return this.commandOutcomes?pending.then(value=>{this.commandOutcomes.pruneActor(id);return value;}):pending;
 }
 async retireSimulation(id,peer,{epoch,finalSequence}){
  const pending=this.database.atomic(db=>{
   this.admissionGuard?.([id]);demand(!this.admission(id,db),'simulation_still_admitted');const owner=this.assertSimulated(db,peer,id,epoch);
   demand(Number.isSafeInteger(finalSequence)&&owner.sequence===finalSequence&&!prepareCached477(db,'SELECT 1 FROM dungeon_members WHERE player_id=?').get(id),'simulation_not_drained');
   prepareCached477(db,'DELETE FROM kernel511_simulations WHERE player_id=?').run(id);prepareCached477(db,'UPDATE kernel511_channel_owners SET epoch=epoch+1,sequence=0,updated_ms=? WHERE player_id=?').run(this.now(),id);return {retired:true,epoch:epoch+1};
  });
  return this.commandOutcomes?pending.then(value=>{this.commandOutcomes.pruneActor(id);return value;}):pending;
 }
 claimDungeonSimulationIn(db,id,peer,runId){
  demand(db.isTransaction&&!this.admission(id,db)&&!this.simulation(id,db),'dungeon_passive_claim_live');this.assertProcess(peer.channel,peer.incarnation,db);
  const owner=this.owner(id,db),player=prepareCached477(db,'SELECT channel FROM players WHERE id=?').get(id),member=prepareCached477(db,'SELECT run_id FROM dungeon_members WHERE player_id=?').get(id);
  demand(player?.channel===peer.channel&&member?.run_id===runId&&(!owner||owner.state==='active'),'dungeon_passive_claim_scope');const epoch=(owner?.epoch??0)+1;
  prepareCached477(db,`INSERT INTO kernel511_channel_owners(player_id,channel,epoch,incarnation,state,sequence,updated_ms) VALUES(?,?,?,?,'active',0,?)
   ON CONFLICT(player_id) DO UPDATE SET channel=excluded.channel,epoch=excluded.epoch,incarnation=excluded.incarnation,state='active',sequence=0,transfer_id=NULL,target_channel=NULL,release_sequence=NULL,updated_ms=excluded.updated_ms`).run(id,peer.channel,epoch,peer.incarnation,this.now());
  prepareCached477(db,'INSERT INTO kernel511_simulations(player_id,channel,epoch,run_id,created_ms) VALUES(?,?,?,?,?)').run(id,peer.channel,epoch,runId,this.now());return {id,channel:peer.channel,incarnation:peer.incarnation,epoch,runId};
 }
 // The old batch stream table is not part of this writer. Release uses the
 // player's durable operation sequence, never an unrelated legacy stream ACK.
 releaseWritten(){return Promise.reject(channelError('kernel_use_ordered_release'));}
}

// Bridge registered native rule handlers to the original ordered transaction
// and receipt implementation, including its UNIQUE(player,epoch,sequence).
export function registerOwnedRule(authority,kind,handler,{duringDrain=false,allowSimulation=false}={}){
 demand(typeof handler==='function'&&handler.constructor.name!=='AsyncFunction'&&!Object.hasOwn(authority.operations,kind),'invalid_owned_rule');
 demand(!allowSimulation||['dungeon','actor_checkpoint','combat_checkpoint'].includes(kind),'simulation_operation_forbidden');
 authority.operations[kind]={duringDrain,allowSimulation,execute(db,{playerId,epoch,payload,owner,operationId}){
  const peer={channel:owner.channel,incarnation:owner.incarnation,realm:authority.realmId};
  (allowSimulation?authority.assertSimulated:authority.assertAdmitted).call(authority,db,peer,playerId,epoch,{allowDraining:duringDrain});
  return {key:operationId,result:handler(db,payload,{actor:playerId,epoch,peer,key:operationId,realm:authority.realmId})};
 }};
}

export class OrderedWriterClient {
 constructor({peer,request,owner,onUnknown=()=>{},canDispatch=()=>true,recover=null}){this.peer=peer;this.request=request;this.owner=owner;this.onUnknown=onUnknown;this.canDispatch=canDispatch;this.recover=recover;this.pending=new Map();this.sequence=new Map();this.failed=new Map();this.queued=new Map();this.current=new Map();}
 seed(id,epoch,sequence){demand(!this.pending.has(id)&&Number.isSafeInteger(sequence)&&sequence>=0,'writer_seed_rejected');this.sequence.set(id,{epoch,sequence});this.failed.delete(id);this.current.delete(id);}
 unresolved(id){return this.current.get(id)??null;}
 submit(event){
  const {actor:id,key,kind,payload}=event,owner=this.owner(id);
  demand(owner&&owner.channel===this.peer.channel&&owner.incarnation===this.peer.incarnation,'owner_epoch_fenced');
  demand(!this.failed.has(id),'writer_outcome_unknown');demand((this.queued.get(id)??0)<64,'writer_actor_backpressure');
  const prior=this.sequence.get(id);demand(prior&&prior.epoch===owner.epoch,'writer_not_seeded');
  const earlier=this.pending.get(id);this.queued.set(id,(this.queued.get(id)??0)+1);
  let dispatched=null;
  const work=(earlier?earlier.catch(error=>{if(!actorRejection(error))throw error;}):Promise.resolve()).then(()=>{
   demand(!this.failed.has(id)&&this.owner(id)?.epoch===owner.epoch,'durable_owner_changed');
   const request={playerId:id,epoch:owner.epoch,sequence:prior.sequence+1,operationId:key,operation:kind,payload};
   if(actorFaultIsolation){
    if(!this.canDispatch(id))throw rejectActorJob(Object.assign(Error('permanent_actor_fenced'),{code:'permanent_actor_fenced'}),this.peer,request);
    dispatched=request;this.current.set(id,request);
   }
   const complete=value=>{demand(this.owner(id)?.epoch===owner.epoch,'durable_owner_changed');prior.sequence=request.sequence;if(this.current.get(id)===request)this.current.delete(id);return value;};
   return Promise.resolve(this.request(this.peer,request)).then(complete,error=>{
    const rejected=rejectUnsentActorJob(error,this.peer,request);if(actorRejection(rejected)||!actorFaultIsolation||!this.recover)throw rejected;
    // Receipt reconciliation is read-only and never replays the operation.
    // An absent/unreadable receipt does not authorize a negative outcome.
    return Promise.resolve().then(()=>this.recover(this.peer,request,error)).then(status=>{
     if(status?.status==='not_executed'){
      // Only a retained, authenticated rollback proof may recover a lost
      // negative shared-terminal ACK. An absent receipt cannot create it.
      demand(typeof status.error?.code==='string'&&/^[a-z0-9_]{1,80}$/.test(status.error.code)&&status.rejection,'writer_recovery_rejection_mismatch');
      const rejected=receiveActorRejection(Object.assign(Error(status.error.code),{code:status.error.code}),status.rejection,'command',request);demand(actorRejection(rejected),'writer_recovery_rejection_mismatch');throw rejected;
     }
     if(status?.status!=='committed')throw error;demand(status.ack?.key===request.operationId,'writer_recovery_receipt_mismatch');return complete(status.ack);
    });
   });
  });
  const result=work.then(value=>{
   this.queued.set(id,this.queued.get(id)-1);if(this.pending.get(id)===result){this.pending.delete(id);this.queued.delete(id);}return value;
  }).catch(error=>{const rejected=actorRejection(error);if(rejected&&rejected.actor===id&&rejected.epoch===owner.epoch&&rejected.key===key&&rejected.channel===this.peer.channel&&rejected.incarnation===this.peer.incarnation){if(this.current.get(id)===dispatched)this.current.delete(id);this.queued.set(id,this.queued.get(id)-1);if(this.pending.get(id)===result){this.pending.delete(id);this.queued.delete(id);}throw error;}if(!this.failed.has(id)){this.failed.set(id,error);this.onUnknown(id,error);}throw error;});
  this.pending.set(id,result);
  return result;
 }
 finalSequence(id){demand(!this.pending.has(id)&&!this.failed.has(id),'channel_not_drained');return this.sequence.get(id)?.sequence??0;}
}
