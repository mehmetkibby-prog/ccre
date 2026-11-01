import {recoveryCauseR532} from './r532-options.mjs';
import {recoveryCause,recoveryDiagnostic,signalOwner} from './recovery-diagnostics-r532.mjs';
import {fork} from 'node:child_process';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ProcessStream} from './process-stream.mjs';
import {ipcSafeStream,ipcDiagnostic} from './ipc-safe-stream.mjs';
import {acceptStreamSocket,StreamControl} from './reliable-stream.mjs';
import {IpcReplay} from './coordinator.mjs';
import {demand} from './contract.mjs';
import {WorldStateDelivery} from './world-state.mjs';
import {GlobalWorldCoordinator} from './global-world-coordinator.mjs';
import {WorldCleanupCoordinator} from './world-cleanup-coordinator.mjs';
import {WorldPlayerJobs} from './world-player-jobs.mjs';
import {HeartbeatJobs} from './heartbeat-jobs.mjs';
import {SharedCombatBridge} from './shared-combat-bridge.mjs';
import {recoveryWatchdog} from './r47-options.mjs';
import {RecoveryRetry} from './recovery-retry.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {createFaultReporter} from './fence-diagnostics.mjs';
const reportEngagementFault=createFaultReporter(text=>process.stderr.write(text));
const bounded=(work,ms,code)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Object.assign(Error(code),{code})),ms);Promise.resolve(work).then(resolve,reject).finally(()=>clearTimeout(timer));});

export class WorldProcessSupervisor {
 constructor(core,{execPath=process.execPath,bootTimeoutMs=20000,onFault=()=>{}}={}){
  demand(core?.writer?.system&&!core.sharedWorld,'world_supervisor_dependencies');Object.assign(this,{core,execPath,bootTimeoutMs,onFault});core.sharedWorld=this;this.row=null;this.queue=Promise.resolve();this.closing=false;this.monsters=new Map();this.projection=null;this.deliveries=new Map();
  this.global=new GlobalWorldCoordinator(core,core.channelSupervisor,this);
  if(recoveryWatchdog)this.retry=new RecoveryRetry(()=>this.retryRecovery(),{scope:'world',onError:error=>this.deferRecovery(error)});
  this.combat=new SharedCombatBridge(this);core.writer.sharedCombat=this.combat;core.permanent.sharedCombat=this.combat;
  this.cleanup=new WorldCleanupCoordinator(this);
  this.playerJobs=new WorldPlayerJobs(this);
  this.heartbeatJobs=new HeartbeatJobs(this);
  this.worldStateUnsubscribe=core.writer.worldState?.subscribe(()=>{if(this.global.held)return;const row=this.row;if(row?.worldDelivery&&!row.exited)void row.worldDelivery.flush().catch(error=>{
   // Preserve the lost old reply; only the same live incarnation may report
   // this read-only delivery failure. Fresh boot hydrates CURRENT DB.
   if(this.row===row&&!row.exited)this.onFault({error,world:true,incarnation:row.peer.incarnation});
  });});
 }
 serial(work){const next=this.queue.then(work);this.queue=next.catch(()=>{});return next;}
 start(){return this.serial(()=>this.boot());}
 async boot(){
  this.core.host?.assertOpen();
  demand(!this.closing&&!this.row,'world_process_exists');const peer={realm:this.core.realmId,channel:0,role:'world',incarnation:randomUUID()},owner=await this.core.writer.system.register(peer);this.playerJobs.nextDaily=0;this.heartbeatJobs.reset();let row;
  try{
   const initial=(await this.core.reader.query('kernel511_world_boot',[peer.incarnation,owner.epoch])).rows,proof=randomBytes(32).toString('base64url');
   initial.globalJobs=true;
   const child=fork(fileURLToPath(new URL('./world-process.mjs',import.meta.url)),[],{execPath:this.execPath,execArgv:['--max-old-space-size=192'],serialization:'advanced',stdio:this.core.host?.childStdio()??['ignore','ignore','pipe','ipc']});this.core.host?.track(child);
   row={peer,owner,child,control:new StreamControl(),replay:new IpcReplay(),state:'booting',expected:false,exited:false,stderr:''};this.row=row;this.projection=null;this.monsters.clear();
   child.stderr.on('data',bytes=>{row.stderr=(row.stderr+bytes.toString()).slice(-8192);});let exited,ready,rejected;row.exit=new Promise(resolve=>exited=resolve);const readiness=new Promise((resolve,reject)=>{ready=resolve;rejected=reject;});readiness.catch(()=>{});
   child.on('message',m=>{if(m?.type==='kernel511-world-ready'){if(m.peer?.incarnation===peer.incarnation&&m.peer?.channel===0)ready();else rejected(Error('world_ready_identity'));}if(m?.type==='kernel511-world-failed'){row.failure=m.code;const error=Object.assign(Error(m.code),{code:m.code});rejected(error);if(row.state==='running')this.onFault({world:true,incarnation:peer.incarnation,error});}});
   const ended=(code,signal)=>{
    if(row.exited)return;const running=row.state==='running';row.exited=true;row.state='exited';row.control.close();row.fence=this.core.writer.system.disconnect(peer);row.fence.catch(error=>this.onFault({error}));rejected(Error('world_exited'));exited({code,signal});
    if(running&&!row.expected&&!this.closing){if(this.combat.busy)this.combat.fail(Object.assign(Error(row.failure??'shared_world_exited'),{code:row.failure??'shared_world_exited'}),recoveryCause(this.core,{code:row.failure??'shared_world_exited',channel:0},'world_exit'));else if(this.global.held||this.core.recoveringWorld)this.global.recover({world:true,code:row.failure??'world_exited',channel:0});else void this.serial(async()=>{await this.terminate(row);if(this.row===row){this.row=null;await this.boot();await this.startJobs();}}).catch(error=>{if(recoveryWatchdog)this.deferRecovery(error);else this.onFault({error,world:true});});}
   };
   child.once('exit',ended);child.once('error',error=>{if(!child.pid)ended(null,null);else rejected(error);});
   row.server=new ProcessStream(child,{connect:false});
   if(ipcSafeStream)row.server.once('close',()=>{
    if(row.exited||row.expected||this.closing||this.row!==row)return;
    if(recoveryCauseR532)row.failure??='world_ipc_closed';else row.failure='world_ipc_closed';ipcDiagnostic(row.failure);rejected(Object.assign(Error(row.failure),{code:row.failure}));signalOwner(this.core,row,'SIGKILL',recoveryCause(this.core,{code:row.failure??'world_exit_timeout',channel:0},'world_ipc_close'));
   });
   acceptStreamSocket(row.server,{authenticate:hello=>{
    if(this.row!==row||row.exited||hello.role!=='world'||hello.channel!==0||hello.realm!==peer.realm||hello.incarnation!==peer.incarnation||typeof hello.proof!=='string')return null;
    const a=Buffer.from(proof),b=Buffer.from(hello.proof);return a.length===b.length&&timingSafeEqual(a,b)?peer:null;
   },controlFor:()=>row.control,dispatch:(_peer,method,payload,id)=>row.replay.run(id,method,payload,()=>{
    demand(this.row===row&&!row.exited,'world_process_fenced');
    if(method==='system_command')return payload.kind==='world_transition'?this.global.run(peer,payload):this.core.writer.system.command(peer,payload);
    if(method==='world_transition_prepare')return this.global.prepare(peer,payload);
    if(method==='world_projection')return this.publish(row,payload);
    if(method==='world_cleanup')return this.cleanup.run(peer,payload);
    if(method==='world_player_jobs')return this.playerJobs.run(peer,payload);
    if(method==='heartbeat_due')return this.heartbeatJobs.due(peer,payload);
    if(method==='guild_war_due'){demand(Number.isSafeInteger(payload?.nowMs)&&payload.nowMs>=0&&payload.nowMs<=this.core.clock()+5000,'guild_clock_time');return this.core.reader.query('kernel511_guild_war_due',[payload.nowMs]).then(r=>({due:r.rows}));}
    if(method==='dungeon_lifecycle_due'){demand(Number.isSafeInteger(payload?.nowMs)&&payload.nowMs>=0&&payload.nowMs<=this.core.clock()+5000,'dungeon_clock_time');return this.core.reader.query('kernel511_dungeon_lifecycle_due',[payload.nowMs]).then(r=>({due:r.rows}));}
    demand(false,'unknown_world_method');
   })});
   await new Promise((resolve,reject)=>child.send({type:'kernel511-world-init',config:{peer,proof,initial,hostLock:this.core.host?.childDescriptor()??null}},error=>error?reject(error):resolve()));
   await bounded(readiness,this.bootTimeoutMs,'world_boot_timeout');
   if(this.core.writer.worldState){row.worldDelivery=new WorldStateDelivery({current:()=>this.core.writer.worldState.current,request:point=>{demand(this.row===row&&!row.exited,'world_process_fenced');return row.control.request('world_state',point);}});await bounded(row.worldDelivery.flush(),this.bootTimeoutMs,'world_state_boot_timeout');}
   await bounded(row.control.request('activate',{}),this.bootTimeoutMs,'world_activate_timeout');row.state='running';return this.snapshot();
  }catch(error){if(row){row.expected=true;await this.terminate(row,{cause:recoveryCause(this.core,{error,channel:0},'world_boot')});if(this.row===row)this.row=null;}else await this.core.writer.system.disconnect(peer);throw error;}
 }
 async publish(row,payload){
  demand(this.row===row&&!row.exited&&payload?.epoch===row.owner.epoch&&payload.incarnation===row.peer.incarnation&&Number.isSafeInteger(payload.version)&&payload.version>0&&Number.isSafeInteger(payload.cycle)&&Array.isArray(payload.monsters)&&payload.monsters.length<=4096&&payload.monsters.every(m=>m?.channel===0&&typeof m.id==='string'),'world_projection_fenced');
  demand(!this.projection?payload.full&&payload.version===1:payload.version===this.projection.version+1&&payload.cycle===this.projection.cycle,'world_projection_sequence');
  if(payload.full)this.monsters.clear();for(const monster of payload.monsters)this.monsters.set(monster.id,Object.freeze({...monster}));this.projection={...payload,monsters:undefined};
  await Promise.all([...this.core.processes.values()].filter(r=>r.online).map(async channel=>{try{await this.deliver(channel,payload);}catch(error){if(channel.online)this.core.onFault({channel:channel.peer.channel,incarnation:channel.peer.incarnation,error});}}));return {version:payload.version};
 }
 deliver(channel,payload,{full=false}={}){
  const peer=channel.peer;let lane=this.deliveries.get(peer.channel);
  if(!lane||lane.incarnation!==peer.incarnation){lane={incarnation:peer.incarnation,epoch:0,version:0,tail:Promise.resolve()};this.deliveries.set(peer.channel,lane);}
  const work=lane.tail.then(async()=>{
   this.core.process(peer);if(!this.projection||!full&&(payload.epoch<lane.epoch||payload.epoch===lane.epoch&&payload.version<=lane.version))return {ignored:true};
   const snapshot=full||payload.epoch!==lane.epoch||payload.version!==lane.version+1;
   const next=snapshot?{...this.projection,full:true,monsters:[...this.monsters.values()]}:payload;
   const ack=await bounded(channel.control.request('shared_world',next),5000,'world_projection_channel_timeout');lane.epoch=next.epoch;lane.version=next.version;return ack;
  });lane.tail=work.catch(()=>{});return work;
 }
 bootDescriptor(){return this.projection?{epoch:this.projection.epoch,incarnation:this.projection.incarnation}:null;}
 async attachChannel(peer){const row=this.core.process(peer);if(!this.projection)return;await this.deliver(row,this.projection,{full:true});}
 async engagements(peer,rows){
  const channel=this.core.process(peer),world=this.row;demand(channel.online&&world?.state==='running'&&!world.exited&&Array.isArray(rows)&&rows.length<=512,'world_engagements_unavailable');
  if(actorFaultIsolation){
   // Validate every trusted IPC row before skipping a retired owner. A queued
   // old epoch is not authority to overwrite the replacement's engagement,
   // nor should it prevent other current owners in the same batch updating.
   for(const row of rows)demand(row&&typeof row.actor==='string'&&row.actor.length>0&&row.actor.length<=80&&Number.isSafeInteger(row.epoch)&&row.epoch>0&&(row.engagement===null||typeof row.engagement==='object'&&!Array.isArray(row.engagement)&&row.engagement?.player_id===row.actor),'world_engagement_actor');
   const current=rows.filter(row=>{const owner=this.core.writer.owners.get(row.actor),matches=owner&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&owner.epoch===row.epoch&&['active','draining'].includes(owner.state);if(!matches)reportEngagementFault({actor:row.actor,channel:peer.channel,error:{code:'world_engagement_stale_skip'}});return matches;});
   return current.length?world.control.request('engagements',current.map(row=>({...row,channel:peer.channel,incarnation:peer.incarnation}))):{received:true};
  }
  for(const row of rows){const owner=this.core.writer.owners.get(row.actor);demand(owner&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&owner.epoch===row.epoch&&['active','draining'].includes(owner.state),'world_engagement_owner_fenced');demand(row.engagement===null||row.engagement?.player_id===row.actor,'world_engagement_actor');}
  return world.control.request('engagements',rows.map(row=>({...row,channel:peer.channel,incarnation:peer.incarnation})));
 }
 async terminate(row,{graceful=false,cause=recoveryCause(this.core,{code:graceful?'orderly_shutdown':'world_terminate_requested',channel:0},'world_terminate')}={}){
  row.expected=true;
  if(!row.exited&&graceful&&row.state==='running')try{await bounded(row.control.request('quiesce_process',{}),5000,'world_drain_timeout');}catch(error){this.onFault({error,shutdown:true});}
  if(!row.exited){signalOwner(this.core,row,graceful?'SIGTERM':'SIGKILL',cause);try{await bounded(row.exit,5000,'world_exit_timeout');}catch(error){recoveryDiagnostic(this.core,'world_exit_timeout',recoveryCause(this.core,{error,channel:0},'world_terminate'));signalOwner(this.core,row,'SIGKILL',cause);await bounded(row.exit,5000,'world_kill_timeout');}}
  await row.fence;row.server?.destroy();
 }
 startJobs(){demand(this.row?.state==='running','world_jobs_unavailable');return this.row.control.request('enable_jobs',{});}
 deferRecovery(error){this.onFault({error,world:true,retry:true});if(!this.closing&&!this.core.channelSupervisor.closingWork)this.retry.schedule();}
 async retryRecovery(){
  if(this.closing||this.core.channelSupervisor.closingWork)return;
  if(this.global.held||this.core.recoveringWorld){this.global.recover({error:Object.assign(Error('world_recovery_pending'),{code:'world_recovery_pending'})});this.retry.schedule();return;}
  await this.restart();this.retry.reset();
 }
 async stopJobs(){if(this.row?.state==='running'&&!this.row.exited)return this.row.control.request('disable_jobs',{});}
 restart(){return this.serial(async()=>{if(this.row)await this.terminate(this.row);this.row=null;const result=await this.boot();await this.startJobs();return result;});}
 snapshot(){const row=this.row;return row?{pid:row.child.pid,incarnation:row.peer.incarnation,epoch:row.owner.epoch,state:row.state,monsters:this.monsters.size}:null;}
 close(){this.closing=true;this.retry?.stop();this.combat?.stopUnknownTimers?.();this.worldStateUnsubscribe?.();return this.serial(async()=>{if(this.row)await this.terminate(this.row,{graceful:true});this.row=null;if(this.core.sharedWorld===this)this.core.sharedWorld=null;});}
}
