import {dungeonFreezeActorsR71} from './dungeon-freeze-scope-r71.mjs';
import {castleEnabled,CASTLE_CHANNEL,CASTLE_AREA} from './castle-model-r59.mjs';
import {withEntryWritesR67} from './entry-write-window-r67.mjs';
import {residentCapacityR59,channelAdmissionR59,castleResumeR59} from './castle-capacity-r59.mjs';
import {installRewardWorkerR533} from './reward-worker-r533.mjs';
import {statementBootPoolR61,prepareCombatStatementBootR61} from './statement-boot-pool-r61.mjs';
import {rewardWarmupR56,sectionReadGroupR56} from './r56-options.mjs';
import {ACTOR_GROUP_READ_LIMITS_R56,ACTOR_REFRESH_LIMITS_R52} from './actor-section-reuse-r52.mjs';
import {receiveControlBatchR53} from './control-batch-r53.mjs';
import {deliverSessionR53} from './control-batch-r53.mjs';
import {stageStartR51,stageEndR51,observeStageR51} from './stage-timing-r51.mjs';
import {demandFence} from './fence-diagnostics.mjs';
import {presenceStaleSkip} from './r47-options.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {actorSectionReuseR52} from './r52-options.mjs';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {WorldStateDelivery} from './world-state.mjs';
import {MarketStateCoordinator} from './market-state.mjs';
import {KernelDiagnostics} from './diagnostics.mjs';
import {AdminDiagnostics} from './admin-diagnostics.mjs';
import {demand,kernelError,PROTOCOL,validChannel,CAPACITY} from './contract.mjs';
import {StreamControl,acceptStreamSocket} from './reliable-stream.mjs';
import {ConnectionBudget} from './connection-budget.mjs';
import {PermanentCoordinator} from './permanent-coordinator.mjs';
import {ActorIsolation} from './actor-isolation.mjs';
import {GamePresenceBridge} from './game-presence.mjs';
import {readSessionMirror} from './session-mirror.mjs';
import {nativeTransferWriterGuard} from './transfer-writer.mjs';
import {issueTicket} from './ticket.mjs';
import {retiredFreezeOwner} from './freeze-redirect.mjs';
import {TransferFreezeGroup} from './transfer-freeze-group.mjs';
import {EntrySettlementRead} from './entry-settlement-read.mjs';
import {NativeLogout} from './native-logout.mjs';
import {NativeSession} from './native-session.mjs';
import {NativePresence} from './native-presence.mjs';
import {NativeBootstrap} from './native-bootstrap.mjs';
import {NativeConfiguration} from './native-configuration.mjs';
import {NativeGuildAuth} from './native-guild-auth.mjs';
import {NativeGuildVillage} from './native-guild-village.mjs';

import {NativeRealmAdmission} from './native-realm-admission.mjs';
import {NativeRealmSecurity} from './native-realm-security.mjs';
import {NativeMaintenance} from './native-maintenance.mjs';
import {NativeHttpAction} from './native-http-action.mjs';
import {NativeBotCheck} from './native-bot-check.mjs';
import {NativeGm} from './native-gm.mjs';
import {MotionSettings} from './motion-settings.mjs';
import {AfkCoordinator} from './afk-coordinator.mjs';
import {SignedSecurityRenewal,securityRenewalR50} from './security-renewal-r50.mjs';

// Per-incarnation sequence watermarks make eviction fail closed: an old IPC
// request can never become a fresh budget reservation or notification ACK.
// Durable game commands additionally retain their original SQLite receipts.
export class IpcReplay {
 constructor({limit=512}={}){this.limit=limit;this.prefix=null;this.high=0;this.rows=new Map();}
 run(id,method,payload,work){
  const match=typeof id==='string'&&/^([a-f0-9-]{36}):([1-9][0-9]{0,14})$/.exec(id);demand(match,'ipc_request_identity');
  const serial=Number(match[2]);demand(Number.isSafeInteger(serial)&&(!this.prefix||this.prefix===match[1]),'ipc_request_identity');
  const fingerprint=JSON.stringify([method,payload]),old=this.rows.get(serial);
  if(old){demand(old.fingerprint===fingerprint,'ipc_request_id_reused');return old.promise;}
  demand(serial>this.high&&serial<=this.high+128,'ipc_request_retired');
  this.prefix=match[1];this.high=serial;
  const row={fingerprint,done:false,promise:null};this.rows.set(serial,row);
  row.promise=Promise.resolve().then(work).finally(()=>{row.done=true;for(const [key,value]of this.rows){if(this.rows.size<=this.limit)break;if(value.done)this.rows.delete(key);}});
  return row.promise;
 }
}

// The coordinator owns authentication, four process identities, tickets and
// cold transitions. No gameplay timer or duplicate simulation runs here.
// Channel selection is explicit. A reconnect ticket may only resume durable
// ownership; it must never choose a channel on a player's behalf.
function channelChoiceFailure(code,channel=null){
 const selected=validChannel(channel)?`Kanal ${channel}`:'Seçtiğin kanal';
 const errors={channel_selection_required:'Oyuna girmek için bir kanal seç.',invalid_entry_channel:'Geçerli bir kanal seç (1–4).',channel_full:`${selected} dolu. Başka bir kanal seç.`,channel_process_unavailable:`${selected} şu anda kullanılamıyor. Başka bir kanal seç.`};
 return {status:code==='invalid_entry_channel'?400:code==='channel_process_unavailable'?503:409,body:{code,error:errors[code],...(validChannel(channel)?{channel}:{})}};
}

export class CoreCoordinator {
 constructor({writer,reader,auth,entry,privateKey,origins,realmId,realm,bot,launch,guild,host=null,clock=Date.now,onFault=()=>{}}){
  demand(writer&&reader&&auth&&entry&&privateKey&&origins instanceof Set&&origins.size&&typeof realmId==='string'&&bot&&launch&&guild,'coordinator_dependencies');
  realm??=host?.nativeRealmStartup?.runtime;
  Object.assign(this,{writer,reader,auth,entry,privateKey,origins,realmId,realm,bot,launch,guild,clock,onFault});this.database=writer.database;this.authority=writer.authority;
  this.processes=new Map();this.sessions=new Map();this.revisions=new Map();this.transitions=new Map();this.transferGroups=new Set();this.entryReads=new Map();this.tail=Promise.resolve();this.closed=false;
  this.budget=new ConnectionBudget({now:clock});
  this.actorIsolation=new ActorIsolation(this);
  this.permanent=new PermanentCoordinator({relatedActors:ids=>dungeonFreezeActorsR71(this.database.sqlite,ids),authority:this.authority,endpointFor:(ch,inc)=>this.endpoint(ch,inc),durable:()=>this.writer.durableExternal?this.writer.durableExternal():this.writer.worldState?this.writer.worldState.syncExternal():this.database.durableAfterCommit(),onFault:(row,error)=>this.onFault({actor:row.id,error}),recoverRejectedFreeze:(held,error)=>this.actorIsolation.rejectFreeze(held,error),availabilityCheck:ids=>this.actorIsolation.assertAvailable(ids)});
  this.authority.commandGuard=(sql,peer,request)=>{this.globalWorld?.guardActor();this.sharedWorld?.combat.guard(peer,request);this.permanent.guard(sql,peer,request);const ids=[request.playerId,...(request.payload?.resources??[]).filter(k=>k.startsWith('player:')).map(k=>k.slice(7))];for(const id of ids){const held=this.transitions.get(id);if(held&&!this.sharedWorld?.combat.allows(id,peer,request))demandFence((held.phase==='freezing'||held.phase==='releasing')&&held.owner.channel===peer.channel&&held.owner.incarnation===peer.incarnation&&(id!==request.playerId||held.owner.epoch===request.epoch),'transition_actor_fenced',()=>({operation:request.operation,phase:held.phase,actor:id,session:this.sessions.get(id)?.identity.session,connection:this.sessions.get(id)?.session.gamePresence?.instanceId,channel:peer.channel,incarnation:peer.incarnation,requestEpoch:request.epoch,ownerEpoch:held.owner.epoch,sequence:request.sequence,leaseKind:'transition'}));}return true;};
  const commandGuard=this.authority.commandGuard;this.authority.commandGuard=(sql,peer,request)=>{this.actorIsolation.guard(peer,request);return commandGuard(sql,peer,request);};
  this.authority.admissionGuard=ids=>{this.actorIsolation.assertAvailable(ids);return this.permanent.assertAvailable(ids);};
  this.presence=new GamePresenceBridge({owner:id=>writer.owners.get(id),security:e=>this.securityCurrent(e.actor,e.epoch),clock});
  this.worldStateUnsubscribe=writer.worldState?.subscribe(()=>{if(this.globalWorld?.held)return;for(const row of this.processes.values())if(row.online&&row.worldDelivery)void row.worldDelivery.flush().catch(error=>{
   // This read-only delivery belongs to an exact process incarnation. Exit
   // already fences it; replacement boot sends the full CURRENT DB point.
   // Do not classify its lost reply as a new fault in the replacement. Owned
   // game commands and their unknown durable outcomes retain their own guards.
   if(row.online&&this.processes.get(row.peer.channel)===row)this.onFault({channel:row.peer.channel,incarnation:row.peer.incarnation,error});
  });});
  this.marketState=writer.marketState?new MarketStateCoordinator(this):null;
  this.diagnostics=new KernelDiagnostics(this,{clock});
  demand(!this.database.core511Admin,'admin_diagnostics_already_bound');this.adminDiagnostics=new AdminDiagnostics(this.diagnostics,{clock});this.database.core511Admin=this.adminDiagnostics;
  demand(!this.database.core511Logout,'native_logout_already_bound');this.nativeLogout=new NativeLogout(this);this.database.core511Logout=this.nativeLogout;
  demand(!this.database.core511Session,'native_session_already_bound');this.nativeSession=new NativeSession(this);this.database.core511Session=this.nativeSession;
  demand(!this.database.core511Presence,'native_presence_already_bound');this.nativePresence=new NativePresence(this);this.database.core511Presence=this.nativePresence;
  demand(!this.database.core511Bootstrap,'native_bootstrap_already_bound');this.nativeBootstrap=new NativeBootstrap(this);this.database.core511Bootstrap=this.nativeBootstrap;
  demand(!this.database.core511Configuration,'native_configuration_already_bound');this.nativeConfiguration=new NativeConfiguration(this);this.database.core511Configuration=this.nativeConfiguration;
  demand(!this.database.core511GuildAuth,'native_guild_auth_already_bound');this.nativeGuildAuth=new NativeGuildAuth(this);this.database.core511GuildAuth=this.nativeGuildAuth;
  demand(!this.database.core511GuildVillage,'native_guild_village_already_bound');this.nativeGuildVillage=new NativeGuildVillage(this);this.database.core511GuildVillage=this.nativeGuildVillage;
  demand(!this.database.core511HttpAction,'native_http_action_already_bound');this.nativeHttpAction=new NativeHttpAction(this);this.database.core511HttpAction=this.nativeHttpAction;
  demand(!this.database.core511BotCheck,'native_bot_already_bound');this.nativeBotCheck=new NativeBotCheck(this);this.database.core511BotCheck=this.nativeBotCheck;
  demand(!this.database.core511Gm,'native_gm_already_bound');this.nativeGm=new NativeGm(this);this.database.core511Gm=this.nativeGm;

  demand(!this.database.core511RealmAdmission,'native_realm_admission_already_bound');this.nativeRealmAdmission=new NativeRealmAdmission(this);this.database.core511RealmAdmission=this.nativeRealmAdmission;
  demand(!this.database.core511RealmSecurity,'native_realm_security_already_bound');this.nativeRealmSecurity=new NativeRealmSecurity(this);this.database.core511RealmSecurity=this.nativeRealmSecurity;
  if(realm?.role==='game'&&realm.security)this.nativeRealmSecurity.bindGate(realm.security);
  if(realm?.maintenance)new NativeMaintenance(this,realm);
  if(host)host.attach(this);
  // R32 tamamen kapatıldığında ölçüm, tablo sorgusu ve kilit yolu kurulmaz.
  this.motionSettings=new MotionSettings(this);this.database.core511MotionAdmin=this.motionSettings.admin;
  this.afkCheck=process.env.CORE511_AFK_CHECK==='0'?null:new AfkCoordinator(this);
  if(this.afkCheck)this.database.core511AfkAdmin=this.afkCheck.admin;
  if(securityRenewalR50)this.securityRenewal=new SignedSecurityRenewal(this);
  this.writer.rewardWorkerR533=installRewardWorkerR533(this);
 }
 serial(work,{duringGlobal=false}={}){if(this.stopping)return Promise.reject(kernelError('coordinator_stopping'));const queued=stageStartR51();const next=this.tail.then(async()=>{stageEndR51('coordinator.queue',queued);const terminal=stageStartR51();await this.sharedWorld?.combat.terminalIdle();stageEndR51('coordinator.terminalWait',terminal);demand(!this.closed,'coordinator_closed');demand(duringGlobal||!this.globalWorld?.held&&!this.recoveringWorld,'global_world_busy');return this.nativeRealmSecurity.inCoordinator(()=>this.nativeGuildAuth.inCoordinator(work));});this.tail=next.catch(()=>{});return observeStageR51('coordinator.total',queued,next);}
 async ownership(work){
  const combat=this.sharedWorld?.combat;while(combat?.terminal)await combat.terminalIdle();
  const hold=combat?.reserveOwnership();try{return await work();}finally{hold?.release();}
 }
 nextRevision(id){const revision=(this.revisions.get(id)??0)+1;this.revisions.set(id,revision);return revision;}
 process(peer){const row=this.processes.get(peer.channel);demand(row&&row.peer.incarnation===peer.incarnation&&(peer.realm??this.realmId)===row.peer.realm&&row.online,'channel_process_fenced');return row;}
 endpoint(channel,incarnation){const row=this.processes.get(channel);if(!row?.online||row.peer.incarnation!==incarnation)return null;return {freeze:p=>row.control.request('freeze',p),freezeGroup:requests=>row.control.request('freeze_group',{requests}),freezeIdleGroup:requests=>row.control.request('freeze_idle_group',{requests}),refresh:p=>row.control.request('refresh_frozen',p),resume:p=>row.control.request('resume',p)};}
 async register(peer,{proof=randomBytes(32).toString('base64url')}={}){
  demand(validChannel(peer.channel)&&peer.realm===this.realmId&&typeof peer.incarnation==='string'&&proof.length>=32,'coordinator_process_identity');
  const old=this.processes.get(peer.channel);demand(!old?.online,'channel_process_already_live');
  if(statementBootPoolR61){await this.motionSettings.ready;prepareCombatStatementBootR61(this.database.sqlite);}
  if(rewardWarmupR56)await this.writer.rewardWorkerR533?.prepare();
  await this.writer.register(peer);const row={peer:Object.freeze({...peer}),proof,online:true,control:new StreamControl({maxPending:128*residentCapacityR59(peer.channel)/25}),replay:new IpcReplay()};this.processes.set(peer.channel,row);return {peer:row.peer,proof};
 }
 async boot(peer,{revision=null}={}){const row=this.process(peer);revision??=(row.configRevision??-1)+1;demand(Number.isSafeInteger(revision)&&revision>(row.configRevision??-1),'coordinator_config_revision');row.configRevision=revision;const initial=(await this.reader.query('kernel511_channel_boot',[peer.channel,peer.incarnation,revision,this.clock()])).rows;initial.sharedWorld=this.sharedWorld?.bootDescriptor()??null;initial.maintenance=this.realm?.maintenance?.policy??null;if(this.afkCheck)initial.afkCheck=await this.afkCheck.boot();initial.motionStream=await this.motionSettings.boot();return initial;}
 async attachWorldState(peer){const row=this.process(peer);if(!this.writer.worldState)return;row.worldDelivery=new WorldStateDelivery({current:()=>this.writer.worldState.current,request:point=>{this.process(peer);return row.control.request('world_state',point);}});await row.worldDelivery.flush();await this.marketState?.attach(row);}
 accept(socket){acceptStreamSocket(socket,{authenticate:hello=>{
  const row=this.processes.get(hello.channel);if(!row?.online||hello.realm!==this.realmId||hello.incarnation!==row.peer.incarnation||typeof hello.proof!=='string')return null;
  const a=Buffer.from(row.proof),b=Buffer.from(hello.proof);return a.length===b.length&&timingSafeEqual(a,b)?row.peer:null;
 },maxInflightFor:peer=>128*residentCapacityR59(peer.channel)/25,controlFor:peer=>this.process(peer).control,dispatch:(...args)=>this.dispatch(...args)});}
 dispatch(peer,method,payload,id){const row=this.process(peer);return row.replay.run(id,method,payload,()=>this.route(peer,method,payload));}
 async route(peer,method,payload){
  this.process(peer);
  if(method==='actor_isolate')return this.actorIsolation.request(peer,payload);
  if(method==='command_status')return this.actorIsolation.commandStatus(peer,payload);
  if(method==='afk_check')return this.afkCheck?this.afkCheck.request(peer,payload):{status:200,body:{ok:true,afkCheck:{enabled:false,locked:false,challenge:null}}};
  if(method==='connection_reserve')return this.budget.reserve(payload.ip,peer.incarnation);
  if(method==='connection_activate')return this.budget.activate(payload.lease,peer.incarnation);
  if(method==='connection_release'){this.budget.release(payload.lease,peer.incarnation);return {released:true};}
  if(method==='command'){await this.sharedWorld?.combat.writable(peer,payload);this.process(peer);const ack=await(payload.payload?.sharedLease?this.sharedWorld.combat.command(peer,payload):this.writer.command(peer,payload));this.notify(ack.result?.notificationActors??[],peer);return ack;}
  if(['shared_acquire','shared_prepare','shared_finish','shared_complete',...(actorFaultIsolation?['shared_cancel']:[])].includes(method)){demand(this.sharedWorld,'world_not_configured');return this.sharedWorld.combat[method.slice(7)](peer,payload);}
  if(method==='shared_return'){demand(this.sharedWorld,'world_not_configured');return this.sharedWorld.combat.returnReady(peer,payload);}
  if(method==='system_command')return this.writer.system.command(peer,payload);
  if(method==='heartbeat_schedules_r53'){demand(this.heartbeatJobs,'heartbeat_world_required');return receiveControlBatchR53(payload,row=>this.heartbeatJobs.schedule(peer,row));}
  if(method==='heartbeat_schedule'){demand(this.heartbeatJobs,'heartbeat_world_required');return this.heartbeatJobs.schedule(peer,payload);}
  if(method==='read_channel_refresh'){demand(this.globalWorld,'global_world_unavailable');return this.globalWorld.readChannel(peer,payload);}
  if(method==='world_engagements'){demand(this.sharedWorld,'world_not_configured');return this.sharedWorld.engagements(peer,payload);}
  if(method==='read_actor'){this.authority.assertSimulated(this.database.sqlite,peer,payload.actor,payload.epoch);return this.load(payload.actor,payload.revision,payload.slim);}
  if(actorSectionReuseR52&&method==='read_actor_drops_r52'){
   demand(payload&&typeof payload.includeDrops==='boolean'&&Number.isSafeInteger(payload.cycle)&&payload.cycle>=0&&Array.isArray(payload.actors)&&payload.actors.length>=1&&payload.actors.length<=(sectionReadGroupR56?ACTOR_GROUP_READ_LIMITS_R56.actors:ACTOR_REFRESH_LIMITS_R52.readBatch),'actor_drop_read_parameters');
   const seen=new Set();for(const row of payload.actors){
    demand(row&&typeof row.actor==='string'&&row.actor.length>0&&row.actor.length<=256&&!seen.has(row.actor)&&Number.isSafeInteger(row.epoch)&&row.epoch>0&&typeof row.area==='string'&&row.area.length<=64,'actor_drop_read_parameters');seen.add(row.actor);
    this.authority.assertSimulated(this.database.sqlite,peer,row.actor,row.epoch);
   }
   const result=await this.reader.query('kernel511_actor_drops_r52',[peer.channel,peer.incarnation,payload.cycle,this.clock(),payload.actors,payload.includeDrops]);
   this.process(peer);return result.rows;
  }
  if(method==='presence'){
   if(presenceStaleSkip){
    demand(Array.isArray(payload)&&payload.length<=residentCapacityR59(peer.channel),'presence_batch_size');
    // Optional liveness is accepted only for this exact current session and
    // active owner. A queued stamp cannot revive/revoke a replacement login.
    // Validate shape before filtering; malformed IPC keeps its original guard.
    payload=payload.filter(row=>{
     demand(row&&typeof row.actor==='string'&&Number.isSafeInteger(row.epoch)&&Number.isSafeInteger(row.at)&&row.at>=0&&row.at<=this.clock()+5000,'presence_stamp');
     const s=this.sessions.get(row.actor),id=s?.identity;
     return Boolean(id&&id.actor===row.actor&&id.epoch===row.epoch&&typeof row.session==='string'&&id.session===row.session&&id.channel===peer.channel&&id.boot===peer.incarnation&&id.realm===this.realmId&&this.presence.matches(peer,id));
    });
   }
   this.writer.presence.receive(peer,payload);
   for(const row of payload){const s=this.sessions.get(row.actor);demand(s&&s.identity.epoch===row.epoch,'presence_session_fenced');
    // The final buffered stamp may arrive after its socket's disconnect. It
    // must not turn that closed socket back into an indefinitely held slot.
    // A real reconnect obtains a fresh ticket or supplies a newer trusted
    // socket stamp; the existing 40-second reconnect grace is unchanged.
    if(s.disconnectedAt!==null&&row.at<=s.disconnectedAt)continue;
    // R22: an actor whose security snapshot lapsed (refresh delayed) is
    // revoked alone; throwing here failed the whole channel and the world.
    if(!this.securityCurrent(row.actor,row.epoch)){void this.revoke({actor:row.actor}).catch(error=>this.onFault({actor:row.actor,error,authentication:true}));continue;}
    this.presence.seen(peer,s.identity,row.at);s.disconnectedAt=null;
   }
   return {ok:true};
  }
  if(method==='notification_pending')return this.writer.notificationPending(peer,payload);
  if(method==='notification_ack')return this.writer.notificationAck(peer,payload);
  if(method==='notification_ack_batch')return this.writer.notificationAckBatch(peer,payload);
  if(method==='disconnected'){
   const s=this.sessions.get(payload.actor);
   // A close emitted by trusted detach/rebind is expected after the durable
   // epoch change. It cannot replace the new owner's rate/presence snapshot.
   if(!s||s.identity.epoch!==payload.epoch||s.identity.session!==payload.session||s.identity.boot!==peer.incarnation)return {ignored:true};
   this.presence.disconnect(peer,s.identity);s.disconnectedAt=this.clock();s.rates=payload.rates;if(this.afkCheck)await this.afkCheck.detach(s);return {ok:true};
  }
  if(method==='event_relay'){
   demand(payload&&typeof payload==='object','event_relay_scope');const channels=[...this.processes.values()].filter(r=>r.online&&r.peer.channel!==peer.channel),deliveries=channels.map(r=>actorFaultIsolation?Promise.resolve().then(()=>r.control.request('event',payload)):r.control.request('event',payload));
   if(actorFaultIsolation){const results=await Promise.allSettled(deliveries);for(let i=0;i<results.length;i++)if(results[i].status==='rejected')this.onFault({authentication:true,channel:channels[i].peer.channel,error:results[i].reason,eventRelay:true});}
   else await Promise.all(deliveries);return {queued:true};
  }
  demand(false,'unknown_coordinator_method');
 }
 securityCurrent(id,epoch){const s=this.sessions.get(id),v=s?.security,now=this.clock();return !!(v&&v.epoch===epoch&&!v.blocked&&v.securityVersion===v.accountVersion&&v.sessionExpiresMs>now&&v.securityValidUntil>now&&v.canPlay&&v.maintenanceAllowed&&v.realmOpen);}
 async authenticate(request,{csrf=true,tokenHash=null,residentChallenge=false}={}){
  const rules=this.auth.rules;let session=tokenHash?await rules.getGameSessionByHash(tokenHash,request,true):await rules.getGameSession(request);
  if(session)session=this.presence.augment(session);
  // Only an already admitted session refresh may use the native CAPTCHA
  // endpoint exemption. Its account, instance, realm and guild guards remain
  // native; admission/tickets and gameplay keep the ordinary bot deadline.
  let validation=request;
  if(residentChallenge){demand(csrf===false&&typeof tokenHash==='string'&&session?.player?.id&&this.sessions.get(session.player.id)?.identity.session===tokenHash,'resident_bot_refresh_scope');const url=new URL(request.url);url.pathname='/api/bot-check';url.search='';validation=new Request(url,{method:request.method,headers:request.headers});}
  session=await rules.validateGameSession(validation,session);if(csrf)await rules.assertCsrf(request,session);return session;
 }
 snapshot(session,owner){return readSessionMirror({sql:this.database.sqlite,session,owner,revision:this.nextRevision(session.player.id),realm:this.realm,bot:this.bot,launch:this.launch,guild:this.guild,clock:this.clock});}
 identity(session,owner,origin){return {realm:this.realmId,channel:owner.channel,boot:owner.incarnation,actor:session.player.id,account:session.account.id,session:session.tokenHash,epoch:owner.epoch,securityVersion:session.securityVersion,origin};}
 async load(id,revision=0,slim=null){
  const owner=this.authority.owner(id);demand(owner?.state==='active','actor_read_owner_fenced');const args=[id,owner.channel,owner.incarnation,owner.epoch,revision,this.clock()];
  if(!this.authority.admission(id))return (await this.reader.query('kernel511_actor_bundle',args)).rows;
  const s=this.sessions.get(id);demand(s&&s.identity.epoch===owner.epoch&&s.identity.boot===owner.incarnation,'actor_read_session_fenced');
  const access={account:s.session.account.id,chatAfterId:s.session.gamePresence.chatAfterId??0,starterReward:this.entry.starter.inspect(s.session.account.id,id),maintenance:this.realm?.maintenance?{revision:this.realm.maintenance.policy?.revision??0,view:this.realm.maintenance.view(s.session.account.id)}:null};
  if(slim)access.slim=slim;
  const bundle=(await this.reader.query('kernel511_actor_world',[...args,access])).rows;return this.afkCheck?this.afkCheck.bundle(bundle):bundle;
 }
 async install(session,owner,request,{method='admit',frozen=null,rates=null,passive=false,securityUntil=null}={}){
  const id=session.player.id,origin=new URL(request.url).origin;demand(this.origins.has(origin),'origin_rejected');
  const identity=this.identity(session,owner,origin),security=this.snapshot(session,owner),s={session,request,identity,security,rates,disconnectedAt:this.clock()};
  if(securityUntil!==null){demand(Number.isSafeInteger(securityUntil)&&securityUntil>=0,'session_security_ceiling');security.securityValidUntil=Math.min(security.securityValidUntil,securityUntil);}
  this.sessions.set(id,s);if(this.afkCheck&&!passive)await this.afkCheck.attach(s);const bundle=await this.load(id),ack=await this.process(owner).control.request(method,{bundle,identity,security,rates,...(frozen?{frozen}:{})});
  if(method==='global_admit')demand(ack?.token===frozen?.token&&ack.id===id&&ack.epoch===owner.epoch&&ack.admitted,'global_admit_ack');
  if(method==='admit_held'){demand(ack?.admitted&&ack.frozen?.id===id&&ack.frozen.token===frozen?.token&&ack.frozen.epoch===owner.epoch&&!ack.frozen.retired,'held_admit_ack');s.freezeAck=ack.frozen;}
  if(passive){this.sessions.delete(id);this.presence.revoke({actor:id});}else this.presence.admit(session,owner);
  return s;
 }
 ticketFor(s){demand(this.securityCurrent(s.identity.actor,s.identity.epoch),'ticket_session_expired');return {ok:true,protocol:PROTOCOL,playerId:s.identity.actor,channel:s.identity.channel,epoch:s.identity.epoch,url:'/game/channel/'+s.identity.channel,ticket:issueTicket(this.privateKey,s.identity,{now:this.clock()})};}
 ticket(request){return this.serial(()=>withEntryWritesR67(this.database,()=>this.ticketUnlocked(request)));}
 async ticketUnlocked(request,{requestedChannel=null,attempt=0}={}){
  const session=await this.authenticate(request);demand(session.player,'entry_character_required');await this.auth.rate(request,session);const id=session.player.id;
  await this.settleShared();this.permanent.assertAvailable([id]);demand(!this.transitions.has(id),'transition_actor_fenced');
  const admission=this.authority.admission(id),prior=this.sessions.get(id);
  if(admission){
   const owner=this.authority.owner(id);demand(admission.session_id===session.tokenHash&&prior?.session.gamePresence.instanceId===session.gamePresence.instanceId,'session_already_admitted');
   return this.ownership(async()=>{await this.writer.owned(()=>this.writer.resume(id,this.process(owner).peer,{epoch:owner.epoch,sessionId:session.tokenHash}));
   prior.session=session;prior.request=request;prior.security=this.snapshot(session,owner);await this.process(owner).control.request('session',prior.security);
   // A bot revoke removes its bridge. Only a freshly authenticated ticket
   // resume may restore it; a queued presence row must never do so.
   if(presenceStaleSkip&&!this.presence.matches(this.process(owner).peer,prior.identity))this.presence.admit(session,owner);
   if(this.afkCheck)await this.afkCheck.attach(prior);return this.ticketFor(prior);});
  }
  if(requestedChannel==null)return channelChoiceFailure('channel_selection_required');
  if(!validChannel(requestedChannel))return channelChoiceFailure('invalid_entry_channel');
  const simulation=this.authority.simulation(id),old=this.authority.owner(id);
  if(simulation&&simulation.channel!==requestedChannel)return {status:409,body:{code:'entry_simulation_channel_locked',channel:requestedChannel,currentChannel:simulation.channel,error:`Zindan koşun Kanal ${simulation.channel} üzerinde sürüyor. O kanalı seçip koşudan ayrıldıktan sonra kanal değiştirebilirsin.`}};
  let channel=requestedChannel;if(castleEnabled()&&this.database.sqlite.prepare('SELECT area FROM players WHERE id=?').get(id)?.area===CASTLE_AREA)channel=CASTLE_CHANNEL;const target=this.processes.get(channel);if(!target?.online)return channelChoiceFailure('channel_process_unavailable',channel);
  if(!channelAdmissionR59(this.database.sqlite,id,channel))return channelChoiceFailure('channel_full',channel);let peer=target.peer;
  let held=null,prepared=null,settlement=null;
  try{
   if(simulation){held=await this.freeze(id,old);channel=held.owner.channel;peer=this.process(held.owner).peer;}
   else if(EntrySettlementRead.needed(this,session,channel)){settlement=new EntrySettlementRead(this,session,peer);await settlement.freeze();}
   return await this.ownership(async()=>{const admit=()=>this.writer.admit(id,peer,{sessionId:session.tokenHash,simulationFinalSequence:held?.ack.finalSequence,guard:sql=>{this.entry.assertSession(sql,session);return true;},prepare:sql=>{
    prepared=this.entry.prepare(sql,{session,channel});prepared=this.writer.notifications.append(sql,{realm:this.realmId,key:randomUUID()},prepared);return prepared;
   }}),owner=await (held||settlement?admit():this.writer.owned(admit));
   this.notify(prepared?.notificationActors??[]);
   if(owner.accepted===false){if(held)await this.thaw(held);await settlement?.release();return owner.result;}
   const s=await this.install(session,owner,request,{method:held?'rebind':'admit',frozen:held?.request});await settlement?.release();this.transitions.delete(id);held?.ownershipHold?.release();return this.ticketFor(s);});
  }catch(error){
   // R22: a shared terminal that began after the freeze fenced the admission
   // atomic (rolled back). Thaw, wait for it, retry instead of world recovery.
   if(held&&!settlement&&error?.sharedTerminal&&attempt<3&&held.phase==='frozen'){await this.thaw(held);await this.settleShared();return this.ticketUnlocked(request,{requestedChannel,attempt:attempt+1});}
   if(held)this.unknown(held,error);settlement?.fail(error);throw error;}
 }
 createCharacter(request,payload){return this.serial(()=>withEntryWritesR67(this.database,async()=>{
  const session=await this.authenticate(request),requestedChannel=payload?.channel;
  // A stale native auto flag is not permission to discard an explicit choice.
  if(requestedChannel==null)return channelChoiceFailure('channel_selection_required');
  if(!validChannel(requestedChannel))return channelChoiceFailure('invalid_entry_channel');
  if(session.player){
   // Choose once before a fresh admission. An existing admission/simulation
   // still takes the original guarded transfer path, regardless of client flags.
   const ticket=await this.ticketUnlocked(request,{requestedChannel});
   if(ticket.status&&ticket.status!==200)return ticket;
   return ticket.channel!==requestedChannel?this.transferUnlocked(request,requestedChannel):ticket;
  }
  await this.auth.rate(request,session);
  const channel=requestedChannel,target=this.processes.get(channel);if(!target?.online)return channelChoiceFailure('channel_process_unavailable',channel);if(!channelAdmissionR59(this.database.sqlite,null,channel))return channelChoiceFailure('channel_full',channel);const peer=target.peer;
  return this.ownership(async()=>{const outcome=await this.database.atomic(sql=>{
   const created=this.entry.create(sql,{session,channel,payload});if(!created.accepted)return created;
   const owner=this.authority.admitIn(sql,created.session.player.id,peer,{sessionId:session.tokenHash,guard:()=>true});return {...created,owner};
  });this.writer.refreshOwners();if(!outcome.accepted)return outcome.result;
  // The original post-creation bot preparation runs before any gameplay ticket.
  const current=await this.authenticate(request),s=await this.install(current,outcome.owner,request);
  return {...outcome.result.body,...this.ticketFor(s)};});
 }));}
 // The serial entry waited for shared idle, but authentication awaited since.
 // Bounded: user operations must not hold the serial lane (session refresh
 // shares it) through a storm of party kills; afterwards they fail fast as before.
 async settleShared(maxMs=3000){const combat=this.sharedWorld?.combat,until=this.clock()+maxMs;while(combat?.terminal&&this.clock()<until)await Promise.race([combat.terminalIdle(),new Promise(resolve=>setTimeout(resolve,250))]);}
 async freeze(id,owner){
  await this.settleShared();demand(!this.transitions.has(id),'transition_actor_fenced');this.permanent.assertAvailable([id]);const held={owner:{...owner},request:{id,epoch:owner.epoch,token:randomUUID()},phase:'freezing'};this.transitions.set(id,held);
  try{for(;;){
   const source=held.owner,request=held.request,admission=this.authority.admission(id),simulation=this.authority.simulation(id);
   held.ack=await this.process(source).control.request('freeze',request);
   if(held.ack.retired){
    held.owner=retiredFreezeOwner(this.authority,id,source,held.ack,request.token);
    const nextAdmission=this.authority.admission(id),nextSimulation=this.authority.simulation(id);
    demand(admission?nextAdmission?.session_id===admission.session_id:!nextAdmission&&nextSimulation?.run_id===simulation?.run_id,'transition_retirement_session');
    while(this.sharedWorld?.combat.terminal)await this.sharedWorld.combat.terminalIdle();
    held.request={id,epoch:held.owner.epoch,token:randomUUID()};continue;
   }
   while(this.sharedWorld?.combat.terminal)await this.sharedWorld.combat.terminalIdle();
   const current=this.authority.owner(id);
   if(current?.epoch!==source.epoch||current?.incarnation!==source.incarnation){
    const retired=await this.process(source).control.request('freeze',request);held.owner=retiredFreezeOwner(this.authority,id,source,retired,request.token);
    const nextAdmission=this.authority.admission(id),nextSimulation=this.authority.simulation(id);
    demand(admission?nextAdmission?.session_id===admission.session_id:!nextAdmission&&nextSimulation?.run_id===simulation?.run_id,'transition_retirement_session');
    held.request={id,epoch:held.owner.epoch,token:randomUUID()};continue;
   }
   demand(held.ack.token===request.token&&held.ack.epoch===source.epoch&&held.ack.channel===source.channel&&held.ack.incarnation===source.incarnation&&current?.epoch===source.epoch&&current.incarnation===source.incarnation&&current.sequence===held.ack.finalSequence,'transition_freeze_mismatch');held.ownershipHold=this.sharedWorld?.combat.reserveOwnership();held.phase='frozen';return held;
  }}catch(error){if(await this.actorIsolation.rejectTransitions([held],error))throw error;this.unknown(held,error);throw error;}
 }
 async thaw(held){
  held.phase='refreshing';const refreshed=await this.process(held.owner).control.request('refresh_frozen',held.request);demand(refreshed?.id===held.request.id&&refreshed.token===held.request.token&&refreshed.epoch===held.owner.epoch&&refreshed.refreshed===true,'transition_refresh_mismatch');
  held.phase='releasing';const ack=await this.process(held.owner).control.request('resume',held.request);demand(ack.resumed===true&&ack.token===held.request.token&&ack.epoch===held.owner.epoch,'transition_resume_mismatch');this.transitions.delete(held.request.id);held.ownershipHold?.release();
 }
 unknown(held,error){error.fenceContext??={operation:'ownership',phase:held.phase,actor:held.request.id,session:this.sessions.get(held.request.id)?.identity.session,connection:this.sessions.get(held.request.id)?.session.gamePresence?.instanceId,channel:held.owner.channel,incarnation:held.owner.incarnation,ownerEpoch:held.owner.epoch,leaseKind:'transition'};held.phase='unknown';try{this.onFault({actor:held.request.id,incarnation:held.owner.incarnation,error});}finally{held.ownershipHold?.release();}}
 async transfer(request,channel){return this.serial(()=>this.transferUnlocked(request,channel));}
 async transferUnlocked(request,channel,{castleR59=false}={}){
  demand(validChannel(channel),'invalid_transfer_channel');const session=await this.authenticate(request),id=session.player?.id,admission=this.authority.admission(id);let owner=this.authority.owner(id);
  demand(admission?.session_id===session.tokenHash&&owner?.state==='active','session_epoch_fenced');if(owner.channel===channel)return this.ticketFor(this.sessions.get(id));const target=this.processes.get(channel);if(!target?.online)return channelChoiceFailure('channel_process_unavailable',channel);if(castleR59){demand(castleEnabled()&&channel===CASTLE_CHANNEL,'castle_transfer_scope');this.host.nativeHttp.castle.service.checkEnter(id);}if(!channelAdmissionR59(this.database.sqlite,id,channel,{transfer:true,castle:castleR59}))return channelChoiceFailure('channel_full',channel);
  const group=new TransferFreezeGroup(this,id);let held;
  try{
   held=await group.freeze();owner=held.owner;
   if(owner.channel===channel){await group.release();return this.ticketFor(this.sessions.get(id));}
   const preflight=await this.database.atomic(sql=>this.writer.notifications.append(sql,{realm:this.realmId,key:randomUUID()},this.entry.transferPreflight(sql,{session,channel})));await group.finishSettlement();this.notify(preflight.notificationActors);
   if(!preflight.accepted){await group.release();return preflight.result;}
   const move={epoch:owner.epoch,targetChannel:channel,transferId:randomUUID(),...(castleR59?{castleR59:true}:{})};await this.writer.beginTransfer(id,this.process(owner).peer,move);await this.writer.release(id,this.process(owner).peer,{...move,finalSequence:held.ack.finalSequence});
   const nativeGuard=nativeTransferWriterGuard(preflight,{castleR59}),transition=castleR59?(sql,prior)=>{if(!nativeGuard(sql,prior))return false;this.host.nativeHttp.castle.service.enter(id,{fromChannel:owner.channel});return true;}:nativeGuard;
   const next=await this.writer.acceptTransfer(id,target.peer,move,transition);
   await this.process(owner).control.request('detach',{actor:id,epoch:owner.epoch,frozen:held.request});
   const imported={id,epoch:next.epoch,token:randomUUID()},s=await this.install(session,next,request,{method:'admit_held',frozen:imported,rates:held.ack.rates});group.relocated(id,next,imported,s.freezeAck);await group.release();return this.ticketFor(s);
  }catch(error){if(!await group.rejectFreeze(error))group.fail(error);throw error;}
 }
 async logout(request){return this.serial(async()=>{const session=await this.authenticate(request);return this.logoutActor(session.player?.id,session.tokenHash);});}
 async logoutActor(id,tokenHash,{complete=null,prepare=null,attempt=0}={}){
  const admission=this.authority.admission(id);if(!admission)return {ok:true,loggedOut:true};demand(admission.session_id===tokenHash,'session_epoch_fenced');const held=await this.freeze(id,this.authority.owner(id)),owner=held.owner,s=this.sessions.get(id);
  try{
   const result=await this.writer.logout(id,this.process(owner).peer,{epoch:owner.epoch,sessionId:tokenHash,finalSequence:held.ack.finalSequence,complete,prepare});
   if(!result.loggedOut){await this.thaw(held);return {ok:true,...result};}this.presence.revoke({actor:id});if(this.afkCheck)await this.afkCheck.detach(s);
   if(result.simulation)await this.install(s.session,this.authority.owner(id),s.request,{method:'rebind',frozen:held.request,passive:true});
   else{await this.process(owner).control.request('detach',{actor:id,epoch:owner.epoch,frozen:held.request});this.sessions.delete(id);}
   this.transitions.delete(id);held.ownershipHold?.release();return {ok:true,...result};
  }catch(error){
   // R22: same as admission: the logout atomic rolled back; thaw and retry.
   if(error?.sharedTerminal&&attempt<3&&held.phase==='frozen'){await this.thaw(held);await this.settleShared();return this.logoutActor(id,tokenHash,{complete,prepare,attempt:attempt+1});}
   this.unknown(held,error);throw error;}
 }
 permanentPlayers(ids,operation){return this.serial(()=>{demand(ids.every(id=>!this.transitions.has(id)),'transition_actor_fenced');return this.permanent.permanentPlayers(ids,operation);});}
 notify(ids=[],alreadyAcknowledgedPeer=null){for(const row of this.processes.values()){if(alreadyAcknowledgedPeer?.channel===row.peer.channel&&alreadyAcknowledgedPeer?.incarnation===row.peer.incarnation)continue;const actors=ids.filter(id=>this.writer.owners.get(id)?.channel===row.peer.channel);if(row.online&&actors.length)void row.control.request('notifications',{actors}).catch(error=>this.onFault({error}));}}
 refresh(){this.securityRenewal?.refresh();this.actorIsolation.retry();this.marketState?.retry();return this.serial(()=>this.refreshSessions());}
 async refreshSessions(){
  // Authentication stays serial; only the channel 'session' delivery is
  // overlapped (bounded per channel). A serial IPC round trip per player made a
  // 100-player pass outlive the 30 s security window under load.
  const deliveries=new Map();
  for(const [id,s]of [...this.sessions]){
   if(this.transitions.has(id)||this.permanent.entries.has(id)||this.actorIsolation.hasPending(id))continue;
   try{
    if(s.disconnectedAt!==null&&this.clock()-s.disconnectedAt>=40000){await this.logoutActor(id,s.session.tokenHash);continue;}
    let session=await this.authenticate(s.request,{csrf:false,tokenHash:s.session.tokenHash,residentChallenge:true});
    if(await this.nativeRealmSecurity.settleRefresh(session.account.id))session=await this.authenticate(s.request,{csrf:false,tokenHash:s.session.tokenHash,residentChallenge:true});
    const owner=this.authority.owner(id);demand(owner?.epoch===s.identity.epoch,'session_epoch_fenced');
    const security=securityRenewalR50?null:this.snapshot(session,owner),row=this.process(owner);let list=deliveries.get(row);if(!list)deliveries.set(row,list=[]);list.push({id,s,session,security});
   }catch(error){await this.revoke({actor:id});this.onFault({actor:id,error,authentication:true});}
  }
  const failed=[];
  await Promise.all([...deliveries].map(async([row,list])=>{
   for(let i=0;i<list.length;i+=8)await Promise.all(list.slice(i,i+8).map(async({id,s,session,security})=>{
    try{
     if(securityRenewalR50){
      const owner=this.authority.owner(id);
      if(this.sessions.get(id)!==s||s.security.blocked||owner?.epoch!==s.identity.epoch||owner.channel!==row.peer.channel||owner.incarnation!==row.peer.incarnation)return;
      security=this.snapshot(session,owner);s.session=session;s.security=security;
      await deliverSessionR53(row.control,security);
     }else{await deliverSessionR53(row.control,security);if(this.sessions.get(id)===s){s.session=session;s.security=security;}}
    }catch(error){failed.push({id,s,security,error});}
   }));
  }));
  for(const {id,s,security,error}of failed){if(securityRenewalR50&&(this.sessions.get(id)!==s||s.security!==security))continue;await this.revoke({actor:id});this.onFault({actor:id,error,authentication:true});}
 }

 async revoke(scope){for(const [id,s]of this.sessions){if(scope.actor!==id&&scope.account!==s.identity.account&&scope.session!==s.identity.session)continue;this.presence.revoke({actor:id});s.security={...s.security,blocked:true};await this.processes.get(s.identity.channel).control.request('revoke',{actor:id,revision:this.nextRevision(id)});}}
 async http(request){
  const path=new URL(request.url).pathname,paths=['/api/realtime/core511-ticket','/api/realtime/core511-logout','/api/realtime/core511-transfer','/api/realtime/core511-character'];if(!paths.includes(path))return null;
  const headers=this.auth.rules.noStoreHeaders();if(request.method!=='POST')return Response.json({code:'method_not_allowed'},{status:405,headers});
  try{const payload=await this.auth.rules.readJsonObject(request);if(payload.protocol!==PROTOCOL)return Response.json({code:'core511_protocol_required',relogin:true},{status:428,headers});
   const value=path.endsWith('-ticket')?await this.ticket(request):path.endsWith('-logout')?await this.logout(request):path.endsWith('-character')?await this.createCharacter(request,payload):await this.transfer(request,payload.channel);
   return Response.json(value.body??value,{status:value.status??200,headers});
  }catch(error){if(error instanceof this.auth.rules.AuthRequestError)return this.auth.error(error);if(['channel_full','channel_process_unavailable','channel_selection_required','invalid_entry_channel'].includes(error.code)){const failed=channelChoiceFailure(error.code);return Response.json(failed.body,{status:failed.status,headers});}return Response.json({code:error.code??'core511_unavailable'},{status:error.code==='entry_character_required'?409:503,headers});}
 }
 start(){demand(!this.timer&&!this.closed&&!this.stopping,'coordinator_already_started');this.writer.maintenance?.start();this.diagnostics.start();let busy=false;this.timer=setInterval(()=>{this.securityRenewal?.refresh();if(busy)return;busy=true;void this.refresh().catch(error=>this.onFault({error})).finally(()=>busy=false);},10000);this.timer.unref();}
 close(){this.writer.maintenance?.close();this.motionSettings?.close();if(this.database.core511MotionAdmin===this.motionSettings?.admin)delete this.database.core511MotionAdmin;this.afkCheck?.close();if(this.database.core511AfkAdmin===this.afkCheck?.admin)delete this.database.core511AfkAdmin;if(this.database.core511Gm===this.nativeGm)delete this.database.core511Gm;if(this.database.core511BotCheck===this.nativeBotCheck)delete this.database.core511BotCheck;if(this.database.core511HttpAction===this.nativeHttpAction)delete this.database.core511HttpAction;this.nativeMaintenance?.close();this.nativeRealmSecurity.close();this.closed=true;if(this.database.core511RealmSecurity===this.nativeRealmSecurity)delete this.database.core511RealmSecurity;if(this.database.core511RealmAdmission===this.nativeRealmAdmission)delete this.database.core511RealmAdmission;if(this.database.core511GuildVillage===this.nativeGuildVillage)delete this.database.core511GuildVillage;if(this.database.core511GuildAuth===this.nativeGuildAuth)delete this.database.core511GuildAuth;if(this.database.core511Configuration===this.nativeConfiguration)delete this.database.core511Configuration;this.diagnostics.close();if(this.database.core511Admin===this.adminDiagnostics)delete this.database.core511Admin;if(this.database.core511Logout===this.nativeLogout)delete this.database.core511Logout;if(this.database.core511Session===this.nativeSession)delete this.database.core511Session;if(this.database.core511Presence===this.nativePresence)delete this.database.core511Presence;if(this.database.core511Bootstrap===this.nativeBootstrap)delete this.database.core511Bootstrap;this.worldStateUnsubscribe?.();this.marketState?.close();clearInterval(this.timer);this.permanent.close();for(const row of this.processes.values()){row.online=false;row.control.close();this.budget.releaseProcess(row.peer.incarnation);}}
}
