import {captureStoppedR533,stoppedOwnerMatchesR533} from './shared-stopped-r533.mjs';
import {captureSharedAbortOwners,sharedAbortOwnerMatches} from './shared-abort-proof-r532.mjs';
import {recoveryCause,recoveryDiagnostic} from './recovery-diagnostics-r532.mjs';
import {retiredActorIsolation} from './r48_2-options.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {sharedHoldRollbackIsolation} from './shared-hold-rollback.mjs';
import {requestDigest} from './generated/owner-protocol.mjs';
import {randomUUID} from 'node:crypto';
import {demand} from './contract.mjs';
import {recoveryWatchdog} from './r47-options.mjs';
import {captureReturnSessions,rehomeWorldActors} from './global-return.mjs';
import {coldSettlementResources} from './settlement-resources.mjs';

// Private parent pipe. HP and contribution proposals live only in the world
// owner; this book retains authority until the source confirms local promotion.
// A lost grant/finish/COMMIT acknowledgement retires all five OS owners.
export class SharedCombatBridge {
 constructor(world,{set=setTimeout,clear=clearTimeout,clock=()=>performance.now()}={}){this.world=world;this.core=world.core;this.set=set;this.clear=clear;this.clock=clock;this.requests=new Map();this.terminal=null;this.waiters=new Set();this.idleWaiters=new Set();this.ownershipHolds=new Set();this.actorWaits=0;this.actorRejections=0;this.actorConflicts=[];}
 // A parent-only admission/retirement hold is acquired after accepted work
 // drains, outside the SQLite queue. It never grants a player write lease.
 reserveOwnership(){
  demand(!this.terminal,'shared_ownership_busy');let resolve;const hold={done:new Promise(r=>resolve=r),release:()=>{this.ownershipHolds.delete(hold);resolve();}};this.ownershipHolds.add(hold);return hold;
 }
 async terminalIdle(){if(!this.terminal)return;if(recoveryWatchdog)demand(!this.core.recoveringWorld,'global_world_busy');await new Promise((resolve,reject)=>this.waiters.add({resolve,reject}));}
 async idle(){if(!this.requests.size)return;await new Promise((resolve,reject)=>this.idleWaiters.add({resolve,reject}));}
 wake(){if(!this.terminal){for(const waiter of this.waiters)waiter.resolve();this.waiters.clear();}if(!this.requests.size){for(const waiter of this.idleWaiters)waiter.resolve();this.idleWaiters.clear();}}
 get busy(){return this.requests.size>0;}
 source(peer,payload){const owner=this.core.writer.owners.get(payload?.actor);demand(owner&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&owner.epoch===payload.epoch&&['active','draining'].includes(owner.state),'shared_source_owner_fenced');return {...peer,actor:payload.actor,epoch:payload.epoch};}
 entry(peer,payload){
  const row=this.requests.get(payload.id);demand(row&&!row.coldGroup&&row.source.actor===payload.actor&&row.source.epoch===payload.epoch&&row.source.channel===peer.channel&&row.source.incarnation===peer.incarnation&&row.proof===payload.proof&&this.world.row===row.world&&!row.world.exited,'shared_bridge_lease_fenced');
  const move=row.commandAck?.result.moves?.find(m=>m.id===payload.actor);if(move){const owner=this.core.writer.owners.get(move.id);demand(owner?.epoch===move.target.epoch&&owner.channel===move.target.channel&&owner.incarnation===move.target.incarnation,'shared_return_owner_fenced');}else this.source(peer,payload);return row;
 }
 async acquire(peer,payload){
  // A refreshed channel can resume before another owner's final ACK. Local
  // work is already safe; a new cross-owner hold must wait until all global
  // leases are released so it cannot race another channel's resume operation.
  await this.world.global.newSharedInput();
  return this.reserve(this.source(peer,payload),payload.id);
 }
 async reserve(source,id,coldGroup=null){
  const world=this.world.row;demand(typeof id==='string'&&id.length>=16&&id.length<=160&&!this.requests.has(id)&&world?.state==='running'&&!world.exited,'shared_bridge_request');
  const row={id,source,world,phase:'acquiring',proof:null,coldGroup,local:[]};this.requests.set(row.id,row);
  try{const grant=await world.control.request('shared_acquire',{peer:source,id:row.id});demand(this.world.row===world&&!world.exited,'shared_world_replaced');row.proof=grant.proof;row.phase='leased';return grant;}catch(error){this.fail(error,{error:error,requestMethod:'shared_reserve'});throw error;}
 }
 // Parent-only read lease for native transfer/entry. It never enters the
 // channel command protocol or authorizes a shared monster mutation. Keep
 // the group in its freezing phase while queued earlier casts finish.
 async acquireCold(group){
  const c=this.core;demand(this.registeredCold(group)&&group.phase==='freezing','shared_cold_group');let source;
  if(c.entryReads?.get(group.source)===group){group.assertUnadmitted();source={...c.process(group.peer).peer,actor:group.source,epoch:c.authority.owner(group.source)?.epoch??1};}
  else{const entry=group.entries.get(group.source);source=this.source(c.process(entry.owner).peer,{actor:group.source,epoch:entry.owner.epoch});}
  const id=randomUUID(),grant=await this.reserve(source,id,group),row=this.requests.get(id);demand(row?.proof===grant.proof,'shared_cold_grant');return row;
 }
 registeredCold(group){return this.core.transferGroups.has(group)||this.core.entryReads?.get(group.source)===group;}
 assertCold(row,group){demand(this.registeredCold(group)&&row?.coldGroup===group&&this.requests.get(row.id)===row&&row.phase==='leased'&&this.world.row===row.world&&!row.world.exited,'shared_cold_fenced');this.core.process(row.source);return row;}
 async checkpointCold(row,group){
  this.assertCold(row,group);demand(group.phase==='freezing'&&!row.local.length,'shared_cold_checkpoint_phase');if(this.core.entryReads?.get(group.source)===group)group.assertUnadmitted();else this.source(row.source,{actor:row.source.actor,epoch:row.source.epoch});
  try{
   const c=this.core,cycle=c.database.sqlite.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle;
   for(const {channel,resources}of coldSettlementResources(c.database.sqlite,group.source))if(channel!==0){
    const target=c.process(c.processes.get(channel)?.peer),token=randomUUID(),local={target,token,cycle,resources};row.local.push(local);
    const ack=await target.control.request('settlement_freeze',{token,cycle,resources});this.assertCold(row,group);c.process(target.peer);
    const owner=c.writer.system.owner('channel:'+channel);demand(ack?.token===token&&ack.cycle===cycle&&ack.channel===channel&&ack.incarnation===target.peer.incarnation&&JSON.stringify(ack.resources)===JSON.stringify(resources)&&Number.isSafeInteger(ack.sequence)&&ack.sequence>=0&&owner?.online===1&&owner.incarnation===target.peer.incarnation&&owner.sequence>=ack.sequence,'shared_cold_local_ack');
   }
   const ack=await row.world.control.request('shared_checkpoint',{peer:row.source,proof:row.proof});this.assertCold(row,group);return ack;
  }catch(error){this.fail(error,{error:error,requestMethod:'shared_checkpointCold'});throw error;}
 }
 async finishCold(row,group){
  this.assertCold(row,group);
  try{
   await Promise.all(row.local.map(async({target,token,cycle})=>{this.core.process(target.peer);const ack=await target.control.request('settlement_resume',{token});this.core.process(target.peer);demand(ack?.token===token&&ack.cycle===cycle&&ack.channel===target.peer.channel&&ack.incarnation===target.peer.incarnation&&ack.resumed,'shared_cold_local_resume_ack');}));row.local=[];
   const ack=await row.world.control.request('shared_finish',{peer:row.source,proof:row.proof,changes:{monsters:[],participants:[],bossParticipants:[],combatEvents:[]}});this.assertCold(row,group);row.phase='finished';this.requests.delete(row.id);this.wake();return ack;
  }catch(error){this.fail(error,{error:error,requestMethod:'shared_finishCold'});throw error;}
 }
 async prepare(peer,payload){
  for(;;){const holds=[...this.ownershipHolds,...[...(this.core.transferGroups??[])].filter(g=>g.phase!=='freezing')];if(!holds.length)break;await Promise.all(holds.map(g=>g.done));}
  const row=this.entry(peer,payload);demand(row.phase==='leased'&&!this.terminal&&Array.isArray(payload.players)&&payload.players.includes(row.source.actor)&&new Set(payload.players).size===payload.players.length,'shared_terminal_scope');
  const sourcePlayers=payload.players.map(id=>{const owner=this.core.writer.owners.get(id);demand(owner?.channel===peer.channel&&owner.incarnation===peer.incarnation,'shared_terminal_source_players');return {id,epoch:owner.epoch};});
  const held={row,token:randomUUID(),phase:'freezing',channels:[],sourcePlayers,sessions:captureReturnSessions(this.core)};if(retiredActorIsolation)held.abortOwners=captureSharedAbortOwners(this.core);held.stoppedCandidates=captureStoppedR533(this.core,sourcePlayers);held.stopped=new Map();this.terminal=held;row.terminal=held;
  try{
   const channels=[...this.core.processes.values()].filter(c=>c.online);demand(channels.length===4,'shared_terminal_channels');
   const holds=channels.map(async channel=>{
    const freezes=[...this.core.permanent.entries.values()].filter(e=>e.phase==='freezing'&&e.owner?.channel===channel.peer.channel&&e.owner?.incarnation===channel.peer.incarnation).map(e=>({id:e.id,epoch:e.owner.epoch,token:e.token}));
    for(const e of this.core.transitions.values())if(e.phase==='freezing'&&e.owner.channel===channel.peer.channel&&e.owner.incarnation===channel.peer.incarnation)freezes.push(e.request);
    const answer=await channel.control.request('shared_hold',{token:held.token,except:channel.peer.channel===peer.channel?sourcePlayers:[],freezes,stopped:[...held.stoppedCandidates.values()].filter(p=>p.peer.channel===channel.peer.channel&&p.peer.incarnation===channel.peer.incarnation)});demand(answer.token===held.token&&answer.channel===channel.peer.channel&&answer.incarnation===channel.peer.incarnation&&Array.isArray(answer.actors),'shared_hold_ack');held.channels.push({channel,answer});
   });
   if(actorFaultIsolation){
    // Join every started hold before deciding whether pre-commit preparation
    // can be aborted. A sibling may still be awaiting its checkpoint fsync.
    const results=await Promise.allSettled(holds),failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
    if(held.channels.some(({answer})=>answer.aborted===true)){
     demand(held.phase==='freezing'&&!row.commandAck,'shared_abort_after_commit');
     for(const {channel,answer}of held.channels)if(answer.aborted){
      const rejection=answer.rejected;demand(typeof rejection?.actor==='string'&&Number.isSafeInteger(rejection.epoch)&&(['checkpoint_snapshot_conflict','actor_command_pending'].includes(rejection.code)||retiredActorIsolation&&['actor_quarantined','actor_checkpoint_rejected'].includes(rejection.code)||sharedHoldRollbackIsolation&&rejection.code==='actor_command_rejected'),'shared_abort_rejection');
      if(retiredActorIsolation&&['actor_quarantined','actor_checkpoint_rejected'].includes(rejection.code)||sharedHoldRollbackIsolation&&rejection.code==='actor_command_rejected'){const owner=held.abortOwners.get(rejection.actor);demand(sharedAbortOwnerMatches(owner,rejection,channel.peer),'shared_abort_actor_proof');}
      if(rejection.code==='actor_command_pending')demand([...this.core.actorIsolation.unknownActors.get(rejection.actor)??[]].some(r=>r.owners.some(a=>a.id===rejection.actor&&a.owner?.epoch===rejection.epoch&&a.owner.channel===channel.peer.channel&&a.owner.incarnation===channel.peer.incarnation)),'shared_abort_pending_proof');
     }
     await Promise.all(channels.map(async channel=>{const ack=await channel.control.request('shared_abort',{token:held.token});demand(ack?.aborted===true&&ack.token===held.token&&ack.channel===channel.peer.channel&&ack.incarnation===channel.peer.incarnation,'shared_abort_ack');}));
     await row.world.control.request('shared_finish',{peer:row.source,proof:row.proof,changes:{monsters:[],participants:[],bossParticipants:[],combatEvents:[]}});
     row.phase='finished';row.terminal=null;this.terminal=null;this.wake();return {prepared:false,rejected:true};
    }
   }else await Promise.all(holds);

   for(const {channel,answer}of held.channels)for(const actor of answer.stoppedActors??[]){
    const p=held.stoppedCandidates.get(actor.actor);
    demand(p&&p.peer.channel===channel.peer.channel&&p.peer.incarnation===channel.peer.incarnation&&actor.epoch===p.epoch&&actor.token===p.token&&actor.finalSequence===p.finalSequence&&stoppedOwnerMatchesR533(this.core,p),'shared_stopped_actor_proof');held.stopped.set(p.actor,p);
   }
   await row.world.control.request('shared_checkpoint',{peer:row.source,proof:row.proof});held.phase='frozen';
   return {prepared:true,players:[...held.channels.flatMap(c=>c.answer.actors.map(a=>a.id)),...held.stopped.keys()],...(held.stopped.size?{stoppedPlayers:[...held.stopped.keys()]}:{})};
  }catch(error){this.fail(error,{error:error,requestMethod:'shared_prepare'});throw error;}
 }
 assertWrite(sql,payload,context){
  const held=this.terminal,row=held?.row;demand(held?.phase==='frozen'&&row.source.actor===context.actor&&row.source.epoch===context.epoch&&row.source.incarnation===context.peer.incarnation&&payload.sharedLease===row.proof,'shared_terminal_writer_fenced');
  for(const p of held.stopped?.values()??[])demand(stoppedOwnerMatchesR533(this.core,p,sql),'shared_stopped_actor_changed');
  for(const {channel,answer}of held.channels)for(const actor of answer.actors){const current=this.core.authority.owner(actor.id,sql);demand(current?.channel===channel.peer.channel&&current.incarnation===channel.peer.incarnation&&current.epoch===actor.epoch&&current.sequence===actor.sequence,'shared_terminal_actor_changed');}
  return true;
 }
 allows(id,peer,request){const held=this.terminal;return held?.phase==='frozen'&&request.payload?.sharedLease===held.row.proof&&peer.incarnation===held.row.source.incarnation&&request.playerId===held.row.source.actor&&(held.channels.some(c=>c.answer.actors.some(a=>a.id===id))||this.stoppedAllows(id,peer,request));}
 stoppedAllows(id,peer,request){const h=this.terminal,p=h?.stopped?.get(id);return Boolean(p&&h.phase==='frozen'&&request.payload?.sharedLease===h.row.proof&&peer.incarnation===h.row.source.incarnation&&peer.channel===h.row.source.channel&&request.playerId===h.row.source.actor&&stoppedOwnerMatchesR533(this.core,p));}
 blocking(peer,request){const held=this.terminal;if(!held||held.phase==='freezing'||this.allows(request.playerId,peer,request)||request.payload?.sharedLease===held.row.proof&&peer.incarnation===held.row.source.incarnation)return null;return held.channels.some(c=>c.answer.actors.some(a=>a.id===request.playerId))?held:null;}
 conflict(kind,peer,request,held){
  if(kind==='wait')this.actorWaits++;else this.actorRejections++;
  const row={at:Date.now(),kind,operation:request.operation,action:request.payload?.input?.action??null,actor:request.playerId,epoch:request.epoch,sequence:request.sequence,channel:peer.channel,phase:held.phase,terminalOperation:held.row.id,sourceActor:held.row.source.actor,sourceChannel:held.row.source.channel};
  this.actorConflicts.push(row);if(this.actorConflicts.length>256)this.actorConflicts.shift();return row;
 }
 async writable(peer,request){
  // An individual release may resume CH4 before the final other-channel ACK.
  // Wait OUTSIDE SQLite/the writer queue; the frozen guard below still rejects
  // every unauthorized write. Earlier work must drain while phase=freezing.
  for(let held;(held=this.blocking(peer,request));){this.conflict('wait',peer,request,held);await this.terminalIdle();this.core.process(peer);}
 }
 guard(peer,request){const held=this.blocking(peer,request);if(held){const context=this.conflict('reject',peer,request,held);try{demand(false,'shared_terminal_actor_fenced');}catch(error){error.context=context;throw error;}}return true;}
 ownsStatus(peer,request){
  const h=this.terminal,r=h?.row,q=r?.commandRequest;
  return Boolean(h?.phase==='frozen'&&q&&r.source.channel===peer.channel&&r.source.incarnation===peer.incarnation&&q.operationId===request.operationId&&q.playerId===request.playerId&&q.epoch===request.epoch&&q.sequence===request.sequence&&q.operation===request.operation);
 }
 rejectedStatus(peer,request,digest){
  const row=[...this.requests.values()].find(r=>r.commandRejected&&r.commandRequest?.operationId===request.operationId);if(!row)return null;const q=row.commandRequest;
  demand(row.phase==='finished'&&!row.terminal&&row.source.channel===peer.channel&&row.source.incarnation===peer.incarnation&&q.playerId===request.playerId&&q.epoch===request.epoch&&q.sequence===request.sequence&&q.operation===request.operation&&requestDigest({realmId:this.core.realmId,channel:peer.channel,playerId:q.playerId,epoch:q.epoch,sequence:q.sequence,operation:q.operation,payload:q.payload})===digest,'shared_command_status_fenced');
  return {status:'not_executed',error:{code:row.commandRejected.code,message:row.commandRejected.message},rejection:actorRejection(row.commandRejected)};
 }
 async abortCommand(row,error,peer,request){
  const proof=actorRejection(error),held=this.terminal;
  if(!proof||proof.actor!==request.playerId||proof.epoch!==request.epoch||proof.sequence!==request.sequence||proof.key!==request.operationId||proof.operation!==request.operation||proof.channel!==peer.channel||proof.incarnation!==peer.incarnation||proof.sharedLease!==row.proof)return false;
  demand(held===row.terminal&&held.phase==='frozen'&&!row.commandAck,'shared_abort_after_commit');
  await this.abortTerminal(row);row.commandRejected=error;return true;
 }
 async abortTerminal(row){
  const held=row.terminal;demand(held&&held===this.terminal&&held.phase==='frozen'&&!row.commandAck,'shared_abort_after_commit');
  await Promise.all(held.channels.map(async({channel})=>{const ack=await channel.control.request('shared_abort',{token:held.token});demand(ack?.aborted===true&&ack.token===held.token&&ack.channel===channel.peer.channel&&ack.incarnation===channel.peer.incarnation,'shared_abort_ack');}));
  await row.world.control.request('shared_finish',{peer:row.source,proof:row.proof,changes:{monsters:[],participants:[],bossParticipants:[],combatEvents:[]}});
  this.clearUnknown(row);row.phase='finished';row.terminal=null;this.terminal=null;this.wake();
 }
 async cancel(peer,payload){
  demand(actorFaultIsolation,'shared_cancel_disabled');const row=this.entry(peer,payload);demand(payload.operationId==='shared:'+row.id&&!row.commandRequest&&!row.commandAck,'shared_cancel_submitted');
  if(row.cancelled){demand(row.phase==='finished','shared_cancel_phase');return {cancelled:true};}
  demand(row.phase==='leased','shared_cancel_phase');await this.abortTerminal(row);row.cancelled=true;return {cancelled:true};
 }
 async reconcileStatus(peer,request,ack){
  demand(this.ownsStatus(peer,request),'shared_command_status_fenced');return this.acceptCommand(this.terminal.row,ack);
 }
 async acceptCommand(row,ack){
  demand(ack?.key===row.commandRequest.operationId&&ack.result,'shared_command_receipt');
  if(row.commandAck)demand(row.commandAck.key===ack.key,'shared_command_receipt');else row.commandAck=ack;
  if(ack.result.passiveAdmissions?.length){row.passiveAdmission??=this.admitPassive(row.terminal,ack.result.passiveAdmissions);await row.passiveAdmission;}this.clearUnknown(row);return row.commandAck;
 }
 clearUnknown(row){if(row.commandWatchdog!==undefined&&row.commandWatchdog!==null)this.clear(row.commandWatchdog);row.commandWatchdog=null;row.commandUnknown=null;}
 stopUnknownTimers(){for(const row of this.requests.values())this.clearUnknown(row);}
 watchUnknown(row,error){
  if(row.commandUnknown)return;row.commandUnknown={at:this.clock(),error};
  // One cold failure timer, never a gameplay poll. A coupled world commit
  // cannot keep every owner frozen forever, nor be treated as rollback.
  row.commandWatchdog=this.set(()=>{row.commandWatchdog=null;void this.expireUnknown(row).catch(error=>this.fail(error,{error:error,requestMethod:'shared_watchUnknown'}));},10000);row.commandWatchdog?.unref?.();
 }
 async expireUnknown(row){
  if(this.requests.get(row.id)!==row||this.terminal!==row.terminal||!row.commandUnknown||row.commandAck||this.core.stopping||this.core.recoveringWorld)return;
  const pending=row.commandUnknown,peer={channel:row.source.channel,incarnation:row.source.incarnation,realm:this.core.realmId},status=await this.core.actorIsolation.commandStatus(peer,row.commandRequest);
  if(status.status==='committed')return;
  // Only actual exit of all old owners and durable CURRENT DB recovery may
  // reconcile this genuinely shared unknown. No epoch/lease expires here.
  if(this.requests.get(row.id)!==row||row.commandAck||row.commandUnknown!==pending)return;
  const error=Object.assign(Error('shared_command_outcome_unknown'),{code:'shared_command_outcome_unknown',fenceContext:{actor:row.source.actor,channel:row.source.channel,incarnation:row.source.incarnation,operation:row.commandRequest.operation,phase:'shared_terminal_unknown',requestEpoch:row.source.epoch,sequence:row.commandRequest.sequence,leaseKind:'shared'}});
  this.core.onFault({actor:row.source.actor,channel:row.source.channel,error,authentication:true,sharedUnknownDeadline:true,elapsedMs:this.clock()-pending.at});this.fail(error,{error:error,requestMethod:'shared_expireUnknown'});
 }
 async command(peer,request){
  const held=this.terminal,row=held?.row;demand(row&&request.payload?.sharedLease===row.proof&&request.playerId===row.source.actor&&['attack','pvp_attack','heartbeat','movement','retaliation_death','native_action','mode_action','dungeon_entry'].includes(request.operation)&&!row.commandAck,'shared_terminal_command');
  if(!actorFaultIsolation){try{const ack=await this.core.writer.command(peer,request);row.commandAck=ack;if(ack.result.passiveAdmissions?.length)await this.admitPassive(held,ack.result.passiveAdmissions);return ack;}catch(error){this.fail(error,{error:error,requestMethod:'shared_command'});throw error;}}
  row.commandRequest=request;let ack;
  try{ack=await this.core.writer.command(peer,request);}catch(error){
   let aborted;try{aborted=await this.abortCommand(row,error,peer,request);}catch(abortError){this.fail(abortError,{error:abortError,requestMethod:'shared_command'});throw abortError;}if(aborted)throw error;
   if(/^SQLITE_(CORRUPT|NOTADB|IOERR|FULL)/.test(error?.code??'')){this.fail(error,{error:error,requestMethod:'shared_command'});throw error;}
   // A missing IPC ACK is not a failed shared transaction. The exact receipt
   // is read and synced; the native gameplay callback is never run again.
   try{const status=await this.core.actorIsolation.commandStatus(peer,request);if(status.status==='committed')return status.ack;}catch(statusError){this.fail(statusError,{error:statusError,requestMethod:'shared_command'});throw statusError;}
   this.watchUnknown(row,error);this.core.onFault({actor:request.playerId,channel:peer.channel,error,authentication:true,sharedCommandPending:true});throw error;
  }
  try{return await this.acceptCommand(row,ack);}catch(error){this.fail(error,{error:error,requestMethod:'shared_command'});throw error;}
 }
 async admitPassive(held,admissions){
  const c=this.core;for(const entry of admissions){
   const owner=c.authority.owner(entry.id),simulation=c.authority.simulation(entry.id),channel=held.channels.find(r=>r.channel.peer.channel===entry.channel&&r.channel.peer.incarnation===entry.incarnation);
   demand(channel&&!channel.answer.actors.some(a=>a.id===entry.id)&&owner?.epoch===entry.epoch&&owner.incarnation===entry.incarnation&&owner.channel===entry.channel&&owner.sequence===0&&simulation?.run_id===entry.runId&&simulation.epoch===entry.epoch&&!c.authority.admission(entry.id),'shared_passive_admission_owner');
   const bundle=await c.load(entry.id),identity={actor:entry.id,account:bundle.player.account_id,session:'simulation:'+entry.runId,epoch:entry.epoch,channel:entry.channel,boot:entry.incarnation,realm:c.realmId};
   const ack=await channel.channel.control.request('shared_admit',{bundle,identity,frozen:{token:held.token}});demand(ack?.token===held.token&&ack.id===entry.id&&ack.epoch===entry.epoch&&ack.admitted,'shared_passive_admission_ack');channel.answer.actors.push({id:entry.id,epoch:entry.epoch,sequence:0,rates:null});
  }
 }
 async finish(peer,payload){
  const row=this.entry(peer,payload);demand(row.phase==='leased','shared_finish_phase');row.phase='finishing';
  try{
   if(row.terminal){
    demand(row.commandAck,'shared_terminal_commit_missing');const snapshot=(await this.core.reader.query('kernel511_world_boot',[row.world.peer.incarnation,row.world.owner.epoch])).rows;
    await row.world.control.request('shared_reload',{peer:row.source,proof:row.proof,snapshot});row.terminal.phase='refreshing';
    if(row.commandAck.result.moves?.length){row.phase='returning';return {returning:true,token:row.terminal.token};}
    const invalidation=row.commandAck.result.sharedRefresh;demand(!invalidation||invalidation.version===1&&Array.isArray(invalidation.actors)&&typeof invalidation.all==='boolean','shared_refresh_metadata');
    await Promise.all(row.terminal.channels.map(async entry=>{const {channel,answer}=entry;entry.refreshActors=!invalidation||invalidation.all?answer.actors.map(a=>a.id):answer.actors.filter(a=>invalidation.actors.includes(a.id)).map(a=>a.id);const ack=await channel.control.request('shared_release',{token:row.terminal.token,refreshActors:entry.refreshActors});demand(ack.token===row.terminal.token&&ack.released,'shared_release_ack');(this.refreshTrace??=[]).push({at:Date.now(),operation:row.id,channel:channel.peer.channel,heldActors:answer.actors.length,refreshActors:entry.refreshActors.length,tables:invalidation?.tables??null,...ack.refresh});if(this.refreshTrace.length>2048)this.refreshTrace.shift();}));this.terminal=null;this.wake();
   }
   const ack=await row.world.control.request('shared_finish',{peer:row.source,proof:row.proof,changes:payload.changes});row.phase='finished';return ack;
  }catch(error){this.fail(error,{error:error,requestMethod:'shared_finish'});throw error;}
 }
 async returnReady(peer,payload){
  const row=this.entry(peer,payload),h=row.terminal;demand(row.phase==='returning'&&h===this.terminal&&Array.isArray(payload.actors),'shared_return_not_ready');
  row.phase='rehoming';
  try{
   demand(payload.actors.length===h.sourcePlayers.length&&h.sourcePlayers.every(p=>payload.actors.some(a=>a.id===p.id&&a.epoch===p.epoch)),'shared_return_source_group');
   const source=h.channels.find(c=>c.channel.peer.incarnation===peer.incarnation);demand(source,'shared_return_source_channel');source.answer.actors.push(...payload.actors);
   const held={token:h.token,channels:h.channels.map(({channel,answer})=>({peer:channel.peer,control:channel.control,ack:answer}))};
   await rehomeWorldActors(this.core,held,row.commandAck.result.moves,h.sessions,{exportMethod:'shared_export',admitMethod:'shared_admit'});
   await Promise.all(h.channels.map(async({channel})=>{const answer=await channel.control.request('shared_release',{token:h.token});demand(answer.token===h.token&&answer.released,'shared_release_ack');}));
   const answer=await row.world.control.request('shared_finish',{peer:row.source,proof:row.proof,changes:{monsters:[],participants:[],bossParticipants:[],combatEvents:[]}});row.phase='finished';this.terminal=null;this.wake();return answer;
  }catch(error){this.fail(error,{error:error,requestMethod:'shared_returnReady'});throw error;}
 }
 complete(peer,payload){const row=this.entry(peer,payload);demand(row.phase==='finished','shared_complete_phase');this.requests.delete(row.id);this.wake();return {completed:true};}
 abort(error){this.stopUnknownTimers();for(const set of [this.waiters,this.idleWaiters]){for(const waiter of set)waiter.reject(error);set.clear();}}
 fail(error,context={error}){const cause=recoveryCause(this.core,context,'shared_combat_failure');recoveryDiagnostic(this.core,'shared_combat_failure',cause);this.abort(error);this.core.recoveringWorld=true;this.world.global.recover({error,sharedCombat:true,recoveryCause:cause});}
 recovered(){this.stopUnknownTimers();for(const hold of this.ownershipHolds)hold.release();this.requests.clear();this.terminal=null;this.wake();}
}
