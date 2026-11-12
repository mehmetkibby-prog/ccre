import {recoveryCause,recoveryDiagnostic} from './recovery-diagnostics-r532.mjs';
import {demand} from './contract.mjs';
import {captureReturnSessions,rehomeWorldActors} from './global-return.mjs';
import {canonicalAttack} from './attack-writer.mjs';
import {r35Options} from './r35-options.mjs';
import {recoveryWatchdog} from './r47-options.mjs';
import {RecoveryRetry} from './recovery-retry.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {globalFreezeAbort} from './global-freeze-abort-proof.mjs';
const gate=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});void promise.catch(()=>{});return {promise,resolve,reject};};

// Parent-only lifecycle barrier. All accepted channel work and shared damage
// drain before the single native world transaction. A partial freeze/refresh
// never thaws: actual exit of all five owners precedes recovery from CURRENT DB.
export class GlobalWorldCoordinator {
 constructor(core,channels,world){demand(core&&channels&&world&&!core.globalWorld,'global_world_dependencies');Object.assign(this,{core,channels,world});this.held=null;this.recovery=null;core.globalWorld=this;core.writer.globalWorld=this;core.writer.system.commandGuard=(sql,peer,request)=>this.guardSystem(sql,peer,request);if(recoveryWatchdog)this.retry=new RecoveryRetry(()=>this.recover({error:this.lastRecoveryError}),{scope:'global',onError:()=>{}});}
 stopRecoveryTimers(){this.retry?.stop();clearTimeout(this.preparing?.watchdog);}
 watch(slot){
  slot.watchdog=setTimeout(()=>{
   if(this.preparing!==slot||slot.cancelled||this.channels.closing||this.channels.closingWork)return;
   const error=Object.assign(Error('global_hold_deadline'),{code:'global_hold_deadline'});slot.cancelled=true;
   console.warn('core511_recovery',JSON.stringify({code:error.code,phase:this.held?.phase??'preparing',elapsedMs:Math.round(performance.now()-slot.queuedAt),channels:[...this.channels.rows.values()].map(r=>({channel:r.peer.channel,state:r.state}))}));
   this.channels.onFault({error,globalWatchdog:true,phase:this.held?.phase??'preparing',elapsedMs:performance.now()-slot.queuedAt,channels:[...this.channels.rows.values()].map(r=>({channel:r.peer.channel,incarnation:r.peer.incarnation,state:r.state}))});
   this.core.recoveringWorld=true;this.recover({error});
  },10000);slot.watchdog.unref?.();
 }
 assertCurrent(held){if(recoveryWatchdog)demand(this.held===held&&held.phase!=='unknown'&&!this.core.recoveringWorld,'global_recovery_superseded');}
 guardActor(){demand(!this.held||['freezing','resuming'].includes(this.held.phase),'global_actor_fenced');return true;}
 guardSystem(_sql,peer,request){const h=this.held;if(!h||['freezing','resuming'].includes(h.phase))return true;
  if(h.phase==='draining_world'&&peer.channel===0&&peer.incarnation===h.peer.incarnation&&request.kind==='combat_checkpoint')return true;
  demand(h.phase==='frozen'&&request.kind==='world_transition'&&request.payload?.token===h.token&&peer.incarnation===h.peer.incarnation,'global_system_fenced');return true;}
 assertFrozen(sql,payload,context){
  const h=this.held;demand(h?.phase==='frozen'&&h.token===payload.token&&h.peer.incarnation===context.peer.incarnation&&h.cycle===payload.cycle,'global_writer_fenced');
  for(const row of h.channels){const ack=row.ack,process=sql.prepare('SELECT * FROM kernel511_channel_processes WHERE channel=?').get(row.peer.channel);demand(process?.online===1&&process.incarnation===row.peer.incarnation&&ack.token===h.token&&ack.cycle===h.cycle&&ack.channel===row.peer.channel&&ack.incarnation===row.peer.incarnation,'global_channel_fenced');
   const expected=sql.prepare(`SELECT o.player_id AS id,o.epoch,o.sequence FROM kernel511_channel_owners o WHERE o.channel=? AND o.incarnation=? AND o.state='active' AND (EXISTS(SELECT 1 FROM kernel511_admissions a WHERE a.player_id=o.player_id AND a.epoch=o.epoch) OR EXISTS(SELECT 1 FROM kernel511_simulations s WHERE s.player_id=o.player_id AND s.epoch=o.epoch)) ORDER BY o.player_id`).all(row.peer.channel,row.peer.incarnation),actual=[...ack.actors].sort((a,b)=>a.id===b.id?0:a.id<b.id?-1:1);
   demand(expected.length===actual.length&&expected.every((p,i)=>p.id===actual[i].id&&p.epoch===actual[i].epoch&&p.sequence===actual[i].sequence),'global_actor_drain_mismatch');demand(this.core.writer.system.owner('channel:'+row.peer.channel,sql)?.sequence===ack.systemSequence,'global_system_drain_mismatch');
  }return true;
 }
 beginResume(held){demand(this.held===held&&held.phase==='refreshing','global_resume_phase');held.resumeReady=gate();held.phase='resuming';}
 finishResume(held){demand(this.held===held&&held.phase==='resuming'&&held.resumeReady,'global_resume_phase');this.held=null;held.resumeReady.resolve();}
 async newSharedInput(){for(;;){const h=this.held;if(h?.phase==='resuming'){await h.resumeReady.promise;continue;}demand(!h||h.phase==='freezing','global_shared_input_fenced');return;}}
 async freezeChannels(held){
  const start=row=>row.control.request('global_freeze',{token:held.token,cycle:held.cycle}).then(ack=>{row.ack=ack;return ack;});
  if(!actorFaultIsolation)return Promise.all(held.channels.map(start));
  // Join every started freeze before deciding whether a pre-command abort is
  // complete. A missing/unknown channel ACK still takes the recovery path.
  const results=await Promise.allSettled(held.channels.map(start)),failures=results.map((row,index)=>({row,index})).filter(({row})=>row.status==='rejected');
  if(!failures.length)return results.map(row=>row.value);
  const certified=failures.map(({row,index})=>({error:row.reason,channel:held.channels[index],proof:globalFreezeAbort(row.reason)}));
  if(this.held===held&&held.phase==='freezing'&&certified.every(({channel,proof})=>proof?.aborted===true&&proof.token===held.token&&proof.cycle===held.cycle&&proof.channel===channel.peer.channel&&proof.incarnation===channel.peer.incarnation)){
   for(const {channel,proof,error}of certified)for(const actor of proof.actors){const admission=this.core.authority.admission(actor.actor),simulation=this.core.authority.simulation(actor.actor);this.core.actorIsolation.request(channel.peer,{...actor,session:admission?.session_id??'simulation:'+simulation?.run_id,reason:actor.reason??error.code});}
   await Promise.all(results.map(async(row,index)=>{if(row.status==='rejected')return;const ack=await held.channels[index].control.request('global_abort_freeze',{token:held.token,cycle:held.cycle});demand(ack?.token===held.token&&ack.cycle===held.cycle&&ack.aborted===true,'global_freeze_abort_ack');}));
   demand(this.held===held&&held.phase==='freezing','global_freeze_abort_changed');held.phase='aborted';this.held=null;
   this.core.onFault({error:certified[0].error,authentication:true,globalFreezeAborted:true});
  }
  throw failures[0].row.reason;
 }
 prepare(peer,scope){
  const {token,cycle,mode}=scope??{};demand(typeof token==='string'&&token.length>=16&&token.length<=160&&Number.isSafeInteger(cycle)&&['guardian','reset','guild_timeout','heartbeat','dungeon_cleanup'].includes(mode),'global_world_request');
  demand(this.world.row?.state==='running'&&!this.world.row.exited&&this.world.row.peer.incarnation===peer.incarnation,'global_prepare_owner_fenced');
  if(!r35Options.globalFair&&this.world.combat?.terminal)return this.world.combat.terminalIdle().then(()=>this.prepare(peer,scope));
  if(this.preparing){demand(this.preparing.peer.incarnation===peer.incarnation&&canonicalAttack(this.preparing.scope)===canonicalAttack(scope),'global_prepare_busy');return this.preparing.ready.promise;}
  const slot={peer,scope:{token,cycle,mode},ready:gate(),command:gate(),request:null,done:null,queuedAt:performance.now()};this.preparing=slot;
  if(recoveryWatchdog)this.watch(slot);
  slot.done=(async()=>{
   if(r35Options.globalFair){
    // Close NEW shared producers before any global freeze; already accepted
    // borrowers can finish normally, so the backlog is finite. This wait is
    // outside all supervisor/ownership serial queues and holds no actor lane.
    slot.paused=[...this.core.processes.values()].filter(row=>row.online);
    await Promise.all(slot.paused.map(row=>row.control.request('global_pending',{token,pending:true})));
    await this.world.combat?.idle();
   }
   return this.channels.serial(()=>this.world.serial(()=>this.core.serial(()=>this.execute(peer,slot))));
  })().catch(error=>{slot.ready.reject(error);slot.command.reject(error);throw error;}).finally(async()=>{
   if(recoveryWatchdog){
    try{if(slot.paused&&!this.core.recoveringWorld&&!slot.cancelled)await Promise.all(slot.paused.map(row=>row.control.request('global_pending',{token,pending:false})));}
    catch(error){slot.cancelled=true;this.core.recoveringWorld=true;this.recover({error});throw error;}
    finally{clearTimeout(slot.watchdog);if(this.preparing===slot)this.preparing=null;}
   }else{
    if(slot.paused&&!this.core.recoveringWorld)await Promise.all(slot.paused.map(row=>row.control.request('global_pending',{token,pending:false})));
    if(this.preparing===slot)this.preparing=null;
   }
  });void slot.done.catch(()=>{});return slot.ready.promise;
 }
 async run(peer,request){
  if(this.core.database.sqlite.prepare('SELECT 1 FROM kernel511_system_receipts WHERE operation_id=?').get(request.key))return this.core.writer.system.command(peer,request);
  const {token,cycle,mode}=request.payload??{};await this.prepare(peer,{token,cycle,mode});const slot=this.preparing;demand(slot&&slot.peer.incarnation===peer.incarnation,'global_prepared_owner');
  if(slot.request)demand(canonicalAttack(slot.request)===canonicalAttack(request),'global_prepared_command_reused');else{slot.request=request;slot.command.resolve(request);}return slot.done;
 }
 async execute(peer,slot){
  if(recoveryWatchdog)demand(!slot.cancelled&&!this.core.recoveringWorld,'global_recovery_superseded');
  const c=this.core;demand(!this.held&&!this.channels.closing&&!this.world.closing&&this.world.row?.state==='running'&&!this.world.row.exited&&this.world.row.peer.incarnation===peer.incarnation,'global_world_unavailable');
  const {token,cycle,mode}=slot.scope;
  if(mode==='heartbeat'&&r35Options.globalFair){
   // This queue is entered only after global_pending has closed new shared
   // producers and accepted shared work has drained. Skip an obsolete read
   // before acquiring any channel freeze or issuing a mutation/receipt.
   const obsolete=await c.heartbeatJobs.obsolete(peer,cycle);
   demand(this.preparing===slot&&!slot.cancelled&&!c.recoveringWorld&&!this.held&&this.world.row?.peer.incarnation===peer.incarnation&&!this.world.row.exited,'global_recovery_superseded');
   if(obsolete){demand(c.heartbeatJobs.held===obsolete,'heartbeat_recheck_fenced');c.heartbeatJobs.complete(obsolete.entry);const skipped={token,cycle,prepared:false,skipped:true};slot.ready.resolve(skipped);return skipped;}
  }
  const channels=[1,2,3,4].map(channel=>{const row=c.processes.get(channel);demand(row?.online&&this.channels.rows.get(channel)?.state==='running','global_channel_unavailable');return {peer:row.peer,control:row.control};});
  const held={token,cycle,peer,mode,phase:'freezing',channels,startedAt:performance.now()};this.held=held;
  try{
   await this.freezeChannels(held);
   await this.world.combat?.terminalIdle();
   // Accepted guild final hits can rehome an actor while another channel is
   // still draining. Collect the completed membership only after all four
   // freezes, including any returned actors, have finished.
   await Promise.all(channels.map(async row=>{row.ack=await row.control.request('global_snapshot',{token});}));this.assertCurrent(held);held.phase='draining_world';
   // Accepted attacks may still publish shared damage while channels drain.
   // Only AFTER their freeze ACKs may the world choose its final checkpoint
   // and subsequent SystemWriter sequence. No transition receipt is in flight
   // while that checkpoint waits for the same ordered writer.
   slot.ready.resolve({token,cycle,prepared:true});const request=await slot.command.promise;this.assertCurrent(held);held.phase='frozen';
   const returnSessions=captureReturnSessions(c);
   const ack=await c.writer.system.command(peer,request),worldPoint=ack.result.worldPoint,reset=worldPoint.world.cycle!==cycle;this.assertCurrent(held);demand(!reset||mode==='reset'&&worldPoint.world.cycle===cycle+1,'global_committed_cycle');held.phase='refreshing';
   await rehomeWorldActors(c,held,ack.result.moves??ack.result.guild?.moves??[],returnSessions);
   if(reset){this.world.projection=null;this.world.monsters.clear();this.world.deliveries.clear();}
   const invalidation=mode==='heartbeat'&&r35Options.globalRefresh?ack.result.sharedRefresh:null;
   demand(!invalidation||invalidation.version===1&&Array.isArray(invalidation.actors)&&Array.isArray(invalidation.tables)&&typeof invalidation.all==='boolean','global_refresh_metadata');
   const contributionRefresh=mode==='heartbeat'&&(!invalidation||invalidation.tables.some(name=>['monster_participants','boss_participants'].includes(name)));
   await Promise.all(channels.map(async row=>{const refreshActors=invalidation&&!invalidation.all?row.ack.actors.filter(a=>invalidation.actors.includes(a.id)).map(a=>a.id):null;const answer=await row.control.request('global_refresh',{token,worldPoint,reset,contributions:contributionRefresh,refreshActors,dungeonCleanup:ack.result.dungeon??null});demand(answer?.token===token&&answer.refreshed&&answer.cycle===worldPoint.world.cycle,'global_refresh_ack');}));
   const worldSnapshot=reset||contributionRefresh?(await c.reader.query('kernel511_world_boot',[peer.incarnation,request.epoch])).rows:null,initial=reset?worldSnapshot:null;if(initial)initial.globalJobs=true;
   const contributions=contributionRefresh?{participants:worldSnapshot.participants,bossParticipants:worldSnapshot.bossParticipants}:null;
   const shared=await this.world.row.control.request('global_world_refresh',{token,worldPoint,initial,contributions});demand(shared?.token===token&&shared.refreshed&&shared.cycle===worldPoint.world.cycle,'global_shared_refresh_ack');
   if(reset){const shared=await this.world.row.control.request('global_world_publish',{token});demand(shared?.token===token&&shared.published,'global_shared_publish_ack');}
   this.beginResume(held);await Promise.all(channels.map(async row=>{const answer=await row.control.request('global_resume',{token});demand(answer?.token===token&&answer.resumed&&answer.cycle===worldPoint.world.cycle,'global_resume_ack');}));
   if(mode==='heartbeat')c.heartbeatJobs.complete(request.payload.heartbeatJob);this.finishResume(held);
   const trace={mode,reason:request.payload.heartbeatJob?.maintenanceReason??null,queueMs:held.startedAt-slot.queuedAt,holdMs:performance.now()-held.startedAt,refreshActors:invalidation&&!invalidation.all?invalidation.actors.length:channels.reduce((n,r)=>n+r.ack.actors.length,0),tables:invalidation?.tables??null};
   (this.trace??=[]).push(trace);if(this.trace.length>128)this.trace.shift();
   c.notify(ack.result.notificationActors??[]);await Promise.all(channels.map(row=>c.process(row.peer).worldDelivery.flush()));await this.world.row.worldDelivery.flush();return ack;
  }catch(error){
   if(actorFaultIsolation&&held.phase==='aborted'&&this.held!==held&&!slot.request){const result={token,cycle,prepared:false,aborted:true};slot.ready.resolve(result);return result;}
   held.phase='unknown';this.lastFailure=error;this.channels.onFault({error,globalTransition:true});this.recover({error});throw error;
  }
 }
 readChannel(peer,{token,revision}){const h=this.held;demand(h?.phase==='refreshing'&&h.token===token&&h.channels.some(row=>row.peer.channel===peer.channel&&row.peer.incarnation===peer.incarnation),'global_read_fenced');return this.core.boot(peer,{revision});}
 recover(issue){
  const cause=issue?.recoveryCause??recoveryCause(this.core,issue,'global_recovery');recoveryDiagnostic(this.core,'global_recovery_request',cause);
  if(this.channels.closing||recoveryWatchdog&&this.channels.closingWork){const error=issue?.error??Error('shutdown_owner_lost');this.held?.resumeReady?.reject(error);return this.channels.abortStop(error);}
  if(this.recovery){if(this.recoveryCompletion?.ready)this.recoveryCompletion.nextIssue??=issue;return this.recovery;}if(!this.held&&!this.core.recoveringWorld)return;this.held&&(this.held.phase='unknown');const reason=issue?.error??Error('global_prepared_owner_lost');this.held?.resumeReady?.reject(reason);this.preparing?.ready.reject(reason);this.preparing?.command.reject(reason);
  this.core.recoveringWorld=true;
  if(recoveryWatchdog){clearTimeout(this.preparing?.watchdog);if(this.preparing)this.preparing.cancelled=true;}
  this.world.combat?.abort(reason);recoveryDiagnostic(this.core,'global_recovery_start',cause);
  // Also cover a lost startup/control ACK during recovery itself. Closing its
  // actual process rejects IPC waiters; an in-flight DB durability barrier is
  // deliberately NOT raced or bypassed by this deadline.
  let expired=false;const deadline=recoveryWatchdog?setTimeout(()=>{
   expired=true;const error=Object.assign(Error('global_recovery_deadline'),{code:'global_recovery_deadline'});this.core.recoveringWorld=true;this.world.combat?.abort(error);
   console.warn('core511_recovery',JSON.stringify({code:error.code,phase:this.held?.phase??'restarting',channels:[...this.channels.rows.values()].map(r=>({channel:r.peer.channel,state:r.state}))}));
   const tasks=[...this.channels.rows.values()].map(row=>this.channels.terminate(row,{cause}));if(this.world.row)tasks.push(this.world.terminate(this.world.row,{cause}));
   void Promise.all(tasks).catch(error=>this.channels.onFault({error,globalRecovery:true}));
  },10000):null;deadline?.unref?.();
  const completion={ready:false,succeeded:false,nextIssue:null};this.recoveryCompletion=completion;
  this.recovery=Promise.resolve().then(async()=>{
   // Terminate every old owner, including an apparently healthy target, before
   // awaiting a cold queue that may itself be waiting for an unknown borrower.
   const tasks=[...this.channels.rows.values()].map(row=>this.channels.terminate(row,{cause}));if(this.world.row)tasks.push(this.world.terminate(this.world.row,{cause}));await Promise.all(tasks);
   await this.core.tail;await this.channels.serial(()=>this.world.serial(async()=>{
   // An ordinary restart may already have entered its supervisor queue when
   // the first lost ACK classified this as an all-owner failure. Fence that
   // replacement too, under both queues, before registering any fresh owner.
   await Promise.all([...this.channels.rows.values()].map(row=>this.channels.terminate(row,{cause})).concat(this.world.row?[this.world.terminate(this.world.row,{cause})]:[]));
   const c=this.core;this.channels.rows.clear();this.world.row=null;this.held=null;this.world.combat?.recovered();
   if(recoveryWatchdog)await c.writer.durableExternal();
   for(const [id,entry]of c.permanent.entries)if(entry.phase==='unknown'&&entry.owner===null)c.permanent.reconciledOffline(id);
   await this.world.boot();const world=this.world.row,worldIncarnation=world?.peer.incarnation,channels=[];
   for(const channel of [1,2,3,4]){const row=await this.channels.boot(channel);channels.push({channel,row,incarnation:row?.peer.incarnation});}
   // An earlier replacement may exit while a later boot or enable_jobs ACK
   // is pending. Its fault coalesces with this pass, so validate this exact
   // generation before enabling jobs and before publishing successful recovery.
   const assertOwners=()=>{
    demand(world&&this.world.row===world&&world.peer.channel===0&&world.peer.incarnation===worldIncarnation&&world.state==='running'&&!world.exited,'global_recovery_world_changed');
    for(const {channel,row,incarnation}of channels){const current=c.processes.get(channel);demand(row&&this.channels.rows.get(channel)===row&&row.peer.channel===channel&&row.peer.incarnation===incarnation&&row.ready===true&&row.state==='running'&&!row.exited&&current?.online&&current.peer.channel===channel&&current.peer.incarnation===incarnation,'global_recovery_channel_changed');}
   };
   assertOwners();await this.world.startJobs();
   if(recoveryWatchdog)demand(!expired,'global_recovery_deadline');
   assertOwners();completion.ready=true;
  }));if(recoveryWatchdog){this.retry.reset();this.world.retry?.reset();this.channels.retryChannels.clear();this.channels.retry.reset();}completion.succeeded=true;return {recovered:true};}).catch(error=>{this.core.recoveringWorld=true;this.channels.onFault({error,globalRecovery:true,cause:issue?.error?.code});if(recoveryWatchdog&&!this.channels.closing&&!this.channels.closingWork){this.lastRecoveryError=error;this.retry.schedule();}throw error;}).finally(()=>{
   clearTimeout(deadline);this.recovery=null;
   if(this.recoveryCompletion===completion)this.recoveryCompletion=null;
   // Publish completion atomically: no ready flag with an old promise still
   // installed. A fault received after the pass was ready needs its own pass.
   if(completion.succeeded){
    if(this.channels.closing||this.channels.closingWork)this.core.recoveringWorld=true;
    else if(completion.nextIssue){this.core.recoveringWorld=true;this.recover(completion.nextIssue);}
    else this.core.recoveringWorld=false;
   }
  });void this.recovery.catch(()=>{});return this.recovery;
 }
}
