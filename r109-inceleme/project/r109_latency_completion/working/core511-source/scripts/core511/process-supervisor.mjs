import {recoveryCause,recoveryDiagnostic,signalOwner} from './recovery-diagnostics-r532.mjs';
import {fork} from 'node:child_process';
import {presenceStaleSkip,recoveryWatchdog} from './r47-options.mjs';
import {RecoveryRetry} from './recovery-retry.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {createChannelFaultForwarder} from './channel-fault-log.mjs';
import {createPublicKey,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {CoordinatorRecovery} from './coordinator-recovery.mjs';
import {ProcessStream} from './process-stream.mjs';
import {markIpcRequestError,ipcRequestContext} from './ipc-request-context.mjs';
import {ipcSafeStream,ipcDiagnostic} from './ipc-safe-stream.mjs';
import {demand,validChannel} from './contract.mjs';
import {drainProcesses} from './process-drain.mjs';

const timeout=(work,ms,code)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Object.assign(Error(code),{code})),ms);Promise.resolve(work).then(resolve,reject).finally(()=>clearTimeout(timer));});

// One OS child per channel. A closed private parent pipe terminates its exact
// child; only actual child exit authorizes the existing fenced recovery path.
export class ChannelProcessSupervisor {
 constructor(core,{mechanicsModule=fileURLToPath(new URL('./native-channel-mechanics.mjs',import.meta.url)),webSocketModule=null,listeners=null,entry=fileURLToPath(new URL('./channel-process.mjs',import.meta.url)),execPath=process.execPath,bootTimeoutMs=20000,onFault=()=>{}}){
  demand(core&&path.isAbsolute(mechanicsModule)&&path.isAbsolute(entry),'supervisor_configuration');
  Object.assign(this,{core,mechanicsModule,webSocketModule,listeners,entry,execPath,bootTimeoutMs,onFault});this.recovery=new CoordinatorRecovery(core);this.rows=new Map();this.queue=Promise.resolve();this.closing=false;this.faultScheduled=false;
  if(recoveryWatchdog){this.retryChannels=new Set();this.retry=new RecoveryRetry(()=>this.retryRecovery(),{scope:'channels',onError:error=>this.deferRecovery([...this.retryChannels],error)});}
  demand(!core.channelSupervisor,'channel_supervisor_exists');core.channelSupervisor=this;const prior=core.onFault;this.priorFault=prior;this.faultHandler=issue=>{prior(issue);if(!issue.authentication)this.requestRecovery(issue);};core.onFault=this.faultHandler;
 }
 serial(work){const next=this.queue.then(work);this.queue=next.catch(()=>{});return next;}
 // R110: give an ingress-validated WebSocket upgrade to its channel process.
 // Returns false (caller keeps the original TCP proxy) unless the channel is
 // running and connected and this process holds no unread client bytes (a
 // compliant client sends nothing before the 101 response).
 // The handle must stop reading HERE before the transfer: a paused net.Socket
 // still reads into its buffer, and once sent Node discards this side's reads
 // (handle.onread=nop) until the child's ACK closes it. Unread bytes stay in
 // the kernel for the channel process. socket.server is cleared so the
 // ingress server does not track a socket owned by another process;
 // destroying the handle-less parent object only updates its connection count.
 handoffWebSocket(channel,socket,{url,headers,head}={}){
  const row=this.rows.get(channel),handle=socket?._handle,stats=this.handoffStatsR110??={sent:0,declined:0,failed:0};
  if(this.closing||!row||!row.ready||row.exited||row.expected||row.state!=='running'||!row.child.connected||!handle||socket.destroyed||socket.readableLength||typeof handle.readStop!=='function'){stats.declined++;return false;}
  socket.pause();
  handle.reading=false;if(handle.readStop()!==0){stats.failed++;socket.destroy();return true;}
  socket.server=null;
  try{row.child.send({type:'kernel511-ws-handoff',url,headers,head:head?.length?head:null},socket,{keepOpen:false},error=>{if(error)stats.failed++;socket.destroy();});stats.sent++;}
  catch{stats.failed++;socket.destroy();}
  return true;
 }
 start(){return this.serial(async()=>{demand(!this.closing&&this.rows.size===0,'supervisor_already_started');try{for(const channel of [1,2,3,4])await this.boot(channel);await this.core.nativeMaintenance?.activate();if(this.core.sharedWorld)await this.core.sharedWorld.startJobs();return this.snapshot();}catch(error){await Promise.all([...this.rows.values()].map(row=>this.terminate(row,{cause:recoveryCause(this.core,{error},'channel_start')})));this.rows.clear();throw error;}});}
 async boot(channel){
  demand(validChannel(channel)&&!this.closing&&!this.rows.has(channel),'supervisor_channel_exists');
  this.core.host?.assertOpen();
  const peer={realm:this.core.realmId,channel,incarnation:randomUUID()},credential=await this.core.register(peer);let row;
  try{
   // The native 25-player workload creates short-lived combat/projection
   // objects. Fanout/owner-view allocation is now reduced: use 16MiB
   // semi-spaces to shorten each minor collection and save VDS memory.
   // Retain the 384MiB old-space cap and the aggregate 4GiB gate.
   // Four channels share four vCPUs with the writer/world/reader. Bound each
   // channel's background pool and avoid parallel minor-GC rendezvous bursts.
   const initial=await this.core.boot(peer),child=fork(this.entry,[],{execPath:this.execPath,execArgv:[...(process.env.CORE511_R61_EAGER_CHANNELS==='1'?['--no-lazy']:[]),'--max-old-space-size=384','--max-semi-space-size=32','--v8-pool-size=1','--no-parallel-scavenge'],serialization:'advanced',stdio:this.core.host?.childStdio()??['ignore','ignore','pipe','ipc']});this.core.host?.track(child);
   row={peer,child,state:'booting',expected:false,exited:false,ready:false,fence:null,stderr:''};this.rows.set(channel,row);
   // Bounded diagnostics contain no bootstrap configuration or credentials.
   const forwardFault=actorFaultIsolation?createChannelFaultForwarder(text=>process.stderr.write(text),{channel}):null;
   child.stderr.on('data',bytes=>{row.stderr=(row.stderr+bytes.toString()).slice(-8192);forwardFault?.(bytes);});
   let exited,ready,rejected;row.exit=new Promise(resolve=>exited=resolve);
   const readiness=new Promise((resolve,reject)=>{ready=resolve;rejected=reject;});readiness.catch(()=>{});
   child.on('message',message=>{
    if(message?.type==='kernel511-ready'){if(message.peer?.channel!==channel||message.peer.incarnation!==peer.incarnation){rejected(Error('channel_ready_identity'));return;}row.ready=true;ready();}
    if(message?.type==='kernel511-failed'){row.failure=message.code;const error=markIpcRequestError(Object.assign(Error(message.code),{code:message.code}),message.requestMethod,{operation:message.requestOperation});row.failureMethod=ipcRequestContext(error)?.requestMethod;rejected(error);if(row.state==='running')this.onFault({channel,incarnation:peer.incarnation,error});}
   });
   const ended=(code,signal)=>{
    if(row.exited)return;const wasRunning=row.state==='running';row.exited=true;row.state='exited';row.fence=this.recovery.exited(peer,{terminated:true});row.fence.catch(error=>this.onFault({peer,error}));
    rejected(Object.assign(Error('channel_exited'),{code:'channel_exited'}));exited({code,signal});
    if(wasRunning&&!row.expected&&!this.closing)this.requestRecovery({channel,incarnation:peer.incarnation,error:Object.assign(Error(row.failure??'channel_exited'),{code:row.failure??'channel_exited'}),requestMethod:row.failureMethod});
   };
   child.once('exit',ended);child.once('error',error=>{row.failure=error.code;if(!child.pid)ended(null,null);else rejected(error);});
   const server=new ProcessStream(child,{connect:false});row.server=server;
   if(ipcSafeStream)server.once('close',()=>{
    if(row.exited||row.expected||this.closing||this.rows.get(channel)!==row)return;
    if(presenceStaleSkip)row.failure??='channel_ipc_closed';else row.failure='channel_ipc_closed';ipcDiagnostic(row.failure,{method:row.failureMethod});rejected(Object.assign(Error(row.failure),{code:row.failure}));
    // Do not wait on core.tail: its unanswered controls need the real exit to
    // retire their waiter/fence first. Existing ended() owns all recovery.
    signalOwner(this.core,row,'SIGKILL',recoveryCause(this.core,{code:row.failure,channel,requestMethod:row.failureMethod},'channel_ipc_close'));
   });
   this.core.accept(server);
   const config={peer,proof:credential.proof,initial,origins:[...this.core.origins],publicKey:createPublicKey(this.core.privateKey).export({type:'spki',format:'pem'}),mechanicsModule:this.mechanicsModule,webSocketModule:this.webSocketModule,listen:this.listeners?.[channel]??null,hostLock:this.core.host?.childDescriptor()??null};
   await new Promise((resolve,reject)=>child.send({type:'kernel511-init',config},error=>error?reject(error):resolve()));
   await timeout(readiness,this.bootTimeoutMs,'channel_boot_timeout');
   row.recovered=await timeout(this.recovery.restore(peer),this.bootTimeoutMs,'channel_restore_timeout');
   await timeout(this.core.attachWorldState(peer),this.bootTimeoutMs,'channel_world_state_timeout');
   if(this.core.sharedWorld)await timeout(this.core.sharedWorld.attachChannel(peer),this.bootTimeoutMs,'channel_world_sync_timeout');
   await timeout(this.core.process(peer).control.request('activate',{}),this.bootTimeoutMs,'channel_activate_timeout');row.state='running';return row;
  }catch(error){
   if(row){row.expected=true;await this.terminate(row,{graceful:false,cause:recoveryCause(this.core,{error,channel},'channel_boot')});this.rows.delete(channel);}
   else await this.recovery.exited(peer,{terminated:true});
   throw error;
  }
 }
 requestRecovery(issue){
  const cause=recoveryCause(this.core,issue,'channel_recovery_request');recoveryDiagnostic(this.core,'channel_recovery_request',cause);
  if(this.closing||recoveryWatchdog&&this.closingWork)return;
  if(this.core.sharedWorld?.combat.busy){this.core.sharedWorld.combat.fail(issue.error??Object.assign(Error('shared_channel_exited'),{code:'shared_channel_exited'}),cause);return;}
  if(this.core.globalWorld?.held||this.core.recoveringWorld){this.core.globalWorld.recover({...issue,recoveryCause:cause});return;}
  this.recoveryIssues??=[];this.recoveryIssues.push({...issue,recoveryCause:cause});if(this.faultScheduled)return;this.faultScheduled=true;
  queueMicrotask(()=>{let selected=[];void this.serial(async()=>{
   // Exit closes control waiters immediately. Let the interrupted cold
   // transaction classify its outcome before selecting every affected owner.
   // A transfer may have committed to a still-live target just before exit.
   await this.core.tail;
   this.faultScheduled=false;const issues=this.recoveryIssues.splice(0),channels=new Set();
   for(const issue of issues){
    if(validChannel(issue.channel)){const current=this.rows.get(issue.channel);if(!issue.incarnation||current?.peer.incarnation===issue.incarnation||recoveryWatchdog&&!current)channels.add(issue.channel);}
    if(issue.actor&&(this.core.transitions.get(issue.actor)?.phase==='unknown'||this.core.permanent.entries.get(issue.actor)?.phase==='unknown')){const current=this.core.authority.owner(issue.actor);if(current)channels.add(current.channel);}
    for(const [channel,row]of this.rows)if(issue.incarnation===row.peer.incarnation)channels.add(channel);
   }
   for(const entry of this.core.permanent.entries.values())if(entry.phase==='unknown'&&entry.owner)channels.add(entry.owner.channel);
   for(const [id,entry]of this.core.transitions)if(entry.phase==='unknown'){channels.add(entry.owner.channel);const target=this.core.authority.owner(id);if(target)channels.add(target.channel);}
   selected=[...channels];if(channels.size)await this.restart(selected,issues[0]?.recoveryCause);
  }).catch(error=>{if(recoveryWatchdog)this.deferRecovery(error.recoveryChannels??selected,error);else this.onFault({error,supervisor:true});});});
 }
 deferRecovery(channels,error){
  this.onFault({error,supervisor:true,retryChannels:channels});if(this.closing||this.closingWork)return;
  for(const channel of channels)if(validChannel(channel))this.retryChannels.add(channel);
  if(this.retryChannels.size)this.retry.schedule();
 }
 retryRecovery(){
  if(this.closing||this.closingWork)return;
  if(this.core.globalWorld?.held||this.core.recoveringWorld){this.core.globalWorld?.recover({error:Object.assign(Error('channel_recovery_pending'),{code:'channel_recovery_pending'})});this.retry.schedule();return;}
  return this.serial(async()=>{
   await this.core.tail;const channels=[...this.retryChannels];
   if(channels.length)try{await this.restart(channels);}catch(error){this.deferRecovery(error.recoveryChannels??channels,error);}
  });
 }
 async terminate(row,{graceful=false,cause=recoveryCause(this.core,{code:graceful?'orderly_shutdown':'channel_terminate_requested',channel:row.peer.channel},'channel_terminate')}={}){
  row.expected=true;
  demand(!graceful||row.exited||row.drained,'channel_stop_without_group_drain');
  if(!row.exited){signalOwner(this.core,row,graceful?'SIGTERM':'SIGKILL',cause);try{await timeout(row.exit,5000,'channel_exit_timeout');}catch(error){recoveryDiagnostic(this.core,'channel_exit_timeout',recoveryCause(this.core,{error,channel:row.peer.channel},'channel_terminate'));signalOwner(this.core,row,'SIGKILL',cause);await timeout(row.exit,5000,'channel_kill_timeout');}}
  await row.fence;row.server?.destroy();
 }
 async restart(channels,cause=recoveryCause(this.core,{code:'channel_restart_requested'},'channel_restart')){
  demand(!this.closing,'supervisor_closing');const selected=[...new Set(channels)].sort();
  // Stop ALL participants of an unknown cross-channel transition before any
  // replacement may thaw a durable image or reconcile a rare-operation fence.
  await Promise.all(selected.map(async channel=>{const row=this.rows.get(channel);if(row)await this.terminate(row,{cause});this.rows.delete(channel);}));
  if(recoveryWatchdog){
   // One bad replacement must not prevent the remaining selected channels
   // from starting. Retry only failures; healthy replacements keep their PID.
   const failed=[];let cause;
   for(const channel of selected)try{await this.boot(channel);this.retryChannels.delete(channel);}catch(error){failed.push(channel);cause??=error;}
   if(failed.length){cause.recoveryChannels=failed;throw cause;}
   if(!this.retryChannels.size)this.retry.reset();return this.snapshot();
  }
  for(const channel of selected)await this.boot(channel);return this.snapshot();
 }
 restartChannel(channel){return this.serial(()=>this.restart([channel]));}
 snapshot(){return [...this.rows.values()].map(r=>({channel:r.peer.channel,incarnation:r.peer.incarnation,pid:r.child.pid,state:r.state,recovered:r.recovered}));}
 abortStop(error){
  this.stopError??=error;if(this.abortingStop)return this.abortingStop;this.core.recoveringWorld=true;this.core.sharedWorld?.combat.abort(error);
  const cause=recoveryCause(this.core,{error},'shutdown_abort');recoveryDiagnostic(this.core,'shutdown_abort',cause);const rows=[...this.rows.values()],world=this.core.sharedWorld;for(const row of rows)row.expected=true;if(world?.row)world.row.expected=true;
  this.abortingStop=Promise.all(rows.map(row=>this.terminate(row,{cause})).concat(world?.row?[world.terminate(world.row,{cause})]:[]));return this.abortingStop;
 }
 close(){
  if(this.closingWork)return this.closingWork;
  if(recoveryWatchdog){this.retry.stop();this.core.sharedWorld?.retry?.stop();this.core.globalWorld?.stopRecoveryTimers();}
  this.core.sharedWorld?.combat?.stopUnknownTimers?.();
  this.core.nativeMaintenance?.close();
  this.closingWork=(async()=>{
   if(this.core.globalWorld?.recovery)await this.core.globalWorld.recovery.catch(()=>{});if(this.core.sharedWorld)await this.core.sharedWorld.stopJobs();
   this.core.stopping=true;clearInterval(this.core.timer);await this.core.afkCheck?.stop();
   return this.serial(async()=>{this.closing=true;const work=async()=>{
    try{await this.core.tail;this.drain=await timeout(drainProcesses(this),5000,'channel_group_drain_timeout');await Promise.all([...this.rows.values()].map(row=>this.terminate(row,{graceful:true})));this.rows.clear();return this.drain;}
    catch(error){await this.abortStop(error);this.onFault({error,shutdown:true});throw error;}
    finally{if(this.core.onFault===this.faultHandler)this.core.onFault=this.priorFault;}
   };return this.core.sharedWorld?this.core.sharedWorld.serial(work):work();});
  })().catch(async error=>{if(!this.closing){this.closing=true;this.core.stopping=true;clearInterval(this.core.timer);await this.abortStop(error);this.onFault({error,shutdown:true});if(this.core.onFault===this.faultHandler)this.core.onFault=this.priorFault;}throw error;});return this.closingWork;
 }
}
