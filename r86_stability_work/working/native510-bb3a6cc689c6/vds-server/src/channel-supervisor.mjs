import {perfR11Features} from './perf-r11-features.mjs';
import {fork} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {ChannelRpc} from './channel-rpc.mjs';
import {channelNumber,channelError} from './channel-protocol.mjs';
import {ensureChannelDungeonIndexes} from './channel-dungeon-snapshot.mjs';

// Realm writer control plane. It has no player/monster maps and never forwards
// gameplay requests. A child receives only its boot configuration, leases and
// replies to durable writes. Each child's game HTTP and realtime are direct.
let lifecycleEpoch477=-1,lifecycleCount477=0,lifecycleDropped477=0;
const lifecycle477=event=>{const minute=Math.floor(Date.now()/60000);if(minute!==lifecycleEpoch477){lifecycleEpoch477=minute;lifecycleCount477=0;}if(lifecycleCount477>=60){lifecycleDropped477++;return;}lifecycleCount477++;try{console.info('native_channel_lifecycle',JSON.stringify({...event,droppedEvents:lifecycleDropped477,droppedScope:'process-lifetime'}));}catch{}};
export class ChannelSupervisor {
 constructor({database,authority,writer,entry,boot={},startupMs=10000,restartDelayMs=250,onFailure=()=>{},onDirectory=()=>{},onCommitted=()=>{}}){
  this.database=database;this.authority=authority;this.writer=writer;this.entry=entry;this.boot=boot;
  if(boot.sharedCombat){this.boot={...boot,sharedSecret:randomBytes(32).toString('hex')};writer.sharedSecret=this.boot.sharedSecret;}
  this.startupMs=startupMs;this.restartDelayMs=restartDelayMs;this.onFailure=onFailure;
  this.children=new Map();this.stopping=false;this.onDirectory=onDirectory;this.onCommitted=onCommitted;
 }
 async start(){
  try{await this.database.atomic(ensureChannelDungeonIndexes);for(const channel of [1,2,3])await this.startChannel(channel);return this;}
  catch(error){await this.close();throw error;}
 }
 async startChannel(channel){
  channelNumber(channel);if(this.stopping)throw channelError('supervisor_stopping');
  const prior=this.children.get(channel);
  if(prior?.starting||prior?.child&&prior.child.exitCode===null&&prior.child.signalCode===null)throw channelError('channel_already_running');
  const state={stopReason:null,channel,incarnation:randomUUID(),starting:true,ready:false,restarts:(prior?.restarts??-1)+1,child:null,health:null,perfR11Features:null,perfR13Features:null,perfR15Features:null,committed:new Map(),notifying:false};
  this.children.set(channel,state);
  try{
   await this.authority.registerProcess(channel,state.incarnation);
   const eventRange=await this.writer.reserveEvents(state);
   if(this.stopping)throw channelError('supervisor_stopping');
   const identity=randomUUID();
   const boot={...this.boot,sharedPort:this.children.get(1)?.sharedPort,channel,incarnation:state.incarnation,identity,eventRange};
   const child=fork(this.entry,[],{serialization:perfR11Features.enabled('channelAdvancedIpc')?'advanced':'json',execArgv:[],env:{...process.env,CORE_CHANNEL_BOOT:JSON.stringify(boot)},stdio:['ignore','inherit','inherit','ipc']});
   state.child=child;lifecycle477({event:'spawn',atMs:Date.now(),channel,pid:child.pid??null,previousPid:prior?.child?.pid??null,restarts:state.restarts});
   state.rpc=new ChannelRpc(child,{identity,handlers:{
    claim:({id})=>{
     const row=this.database.compiled('SELECT channel FROM main.players WHERE id=?').get(id);
     if(!row||row.channel!==channel)throw channelError('channel_scope');
     return this.authority.claim(id,channel,state.incarnation);
    },
    write:async request=>{const reply=await this.writer.write(state,request);this.notifyCommitted(state,reply.changed);return reply;},
    worldDurableR13:async()=>{
     const valid=()=>{if(this.stopping||this.children.get(channel)!==state||!state.ready)throw channelError('channel_incarnation_fenced');};
     valid();if(!this.database.worldReadFenceEnabledR13())throw channelError('world_durability_unavailable');
     await this.database.worldReadDurableR13();valid();return {durable:true};
    },
    transfer:request=>this.transfer(state,request),
   }});
   let rejectStartup,timer;
   const startup=new Promise((resolve,reject)=>{
    rejectStartup=reject;
    timer=setTimeout(()=>{state.stopReason??='startup_timeout';reject(channelError('channel_start_timeout'));child.kill('SIGKILL');},this.startupMs);
    child.on('message',message=>{
     if(message?.type!=='resident-channel-ready'||message.channel!==channel||message.incarnation!==state.incarnation||state.ready)return;
     if(!Number.isInteger(message.port)||message.port<1||message.port>65535)return;
     if(this.boot.sharedCombat&&(!Number.isInteger(message.sharedPort)||message.sharedPort<1||message.sharedPort>65535))return;
     state.perfR11Features=message.perfR11Features??null;state.perfR13Features=message.perfR13Features??null;state.perfR18=message.perfR18??null;state.perfR15Features=message.perfR15Features??null;state.dungeonPort=message.dungeonPort;state.sharedPort=message.sharedPort;state.port=message.port;state.ready=true;state.starting=false;clearTimeout(timer);this.publishDirectory();this.scheduleNotifications(state);resolve(state);
    });
   });
   child.once('error',error=>{clearTimeout(timer);state.ready=false;rejectStartup(error);this.onFailure({channel,error});});
   child.once('exit',(code,signal)=>{
    lifecycle477({event:'exit',atMs:Date.now(),channel,pid:child.pid??null,code,signal,stopIntent:state.stopReason??null,supervisorStopping:this.stopping,restartPlanned:!this.stopping&&this.children.get(channel)===state});
    clearTimeout(timer);state.ready=false;state.starting=false;state.rpc.close();this.publishDirectory();
    rejectStartup(channelError('channel_exited_before_ready'));
    this.recoverExited508(state);
    state.lastExit={code,signal};
   });
   const ready=await startup;
   if(this.boot.sharedCombat&&channel===1)for(const peer of this.children.values())if(peer.channel!==1&&peer.ready)await peer.rpc.request('sharedOwnerReady',{port:ready.sharedPort});
   if(this.boot.sharedCombat)await this.updateSharedDirectory();
   return ready;
  }catch(error){state.starting=false;throw error;}
 }
 recoverExited508(state){
  state.disconnected=(async()=>{
   // Durable incarnation fencing is required even when the shared owner is
   // temporarily unavailable. Never restart by ignoring a failed fence.
   await this.authority.disconnectProcess(state.channel,state.incarnation);
   if(this.boot.sharedCombat&&state.channel!==1){
    const owner=this.children.get(1);
    if(owner?.ready){
     if(state.fenceOwner508!==owner.incarnation){state.fenceOwner508=owner.incarnation;state.fenceRequest508=randomUUID();}
     await owner.rpc.request('sharedSourceFenced',{peer:{channel:state.channel,incarnation:state.incarnation}},{id:state.fenceRequest508});
     await this.updateSharedDirectory();
    }
   }
   if(this.stopping||this.children.get(state.channel)!==state)return;
   state.restartTimer=setTimeout(()=>{void this.startChannel(state.channel).catch(error=>this.onFailure({channel:state.channel,error}));},this.restartDelayMs);
   state.restartTimer.unref();
  })().catch(error=>{
   this.onFailure({channel:state.channel,error});
   if(this.stopping||this.children.get(state.channel)!==state)return;
   state.recoveryAttempts508=(state.recoveryAttempts508??0)+1;
   const delayMs=Math.min(30000,1000*2**Math.min(state.recoveryAttempts508-1,5));
   lifecycle477({event:'recovery_retry',atMs:Date.now(),channel:state.channel,attempt:state.recoveryAttempts508,delayMs});
   state.recoveryTimer508=setTimeout(()=>{if(!this.stopping&&this.children.get(state.channel)===state)this.recoverExited508(state);},delayMs);
   state.recoveryTimer508.unref();
  });
  return state.disconnected;
 }
 async updateSharedDirectory(){
  const owner=this.children.get(1);if(!owner?.ready)return;
  const peers=[...this.children.values()].filter(s=>s.ready).map(s=>({channel:s.channel,port:s.sharedPort,incarnation:s.incarnation}));
  await owner.rpc.request('sharedDirectory',{peers});
 }
 async transfer(source,{phase,...request}){
  const target=this.children.get(channelNumber(request.targetChannel));
  const owner=this.authority.owner(request.playerId);
  if(!owner||owner.channel!==source.channel||owner.incarnation!==source.incarnation||owner.epoch!==request.epoch)throw channelError('owner_epoch_fenced');
  if(phase==='cancel')return this.authority.cancelTransfer(request.playerId,source,request);
  if(!target?.ready)throw channelError('target_channel_unavailable');
  if(phase==='begin')return this.authority.beginTransfer(request.playerId,request);
  if(phase!=='accept')throw channelError('invalid_transfer_phase');
  const {guard,statements=[]}=request;
  if(!guard||typeof guard.sql!=='string'||!Array.isArray(guard.params)||!/^\s*UPDATE players SET channel\s*=/i.test(guard.sql)||statements.length>16)throw channelError('invalid_transfer_guard');
  await this.authority.releaseWritten(request.playerId,source,request);
  let result;
  const admitted=await this.authority.acceptTransfer(request.playerId,target,request,()=>{
    result=this.database.execute(this.database.prepare(guard.sql).bind(...guard.params));
    if(result.results.length!==1||result.results[0].channel!==target.channel)return false;
    // Confirm the original statement changed the intended player, not merely
    // an arbitrary matching row returned from a malformed internal frame.
    const row=this.database.compiled('SELECT channel FROM main.players WHERE id=?').get(request.playerId);
    if(row?.channel!==target.channel)throw channelError('transfer_player_scope');
    for(const statement of statements){if(typeof statement.sql!=='string'||!Array.isArray(statement.params)||!/^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(statement.sql))throw channelError('invalid_transfer_statement');this.database.execute(this.database.prepare(statement.sql).bind(...statement.params));}
    return true;
  });
  const changed=[{table:'players',id:request.playerId,keys:[request.playerId],owner:request.playerId,staticChanged:'channel'},{table:'arena_queue',id:request.playerId,keys:[request.playerId],owner:request.playerId,staticChanged:1}];
  this.notifyCommitted(source,changed);
  try{await target.rpc.request('admit',{owner:admitted});}
  catch(error){this.notificationFailed(target,error);throw error;}
  return result.results[0];
 }
 async permanentPlayers(ids,operation){
  if(typeof operation!=='function'||operation.constructor.name==='AsyncFunction')throw channelError('permanent_operation_must_be_synchronous');
  // A sparse economic command may inspect HP/range on the writer. Freeze only
  // its participants and flush their pending checkpoint first. No tick/frames
  // pass through main, and unrelated players keep simulating.
  const prior=this.permanentTail??Promise.resolve();let release;
  this.permanentTail=new Promise(r=>release=r);await prior;
  const held=[];
  try{
   for(const id of [...new Set(ids)].sort()){
    const row=this.database.compiled('SELECT channel FROM players WHERE id=?').get(id);
    if(!row)throw channelError('permanent_player_missing');
    const state=this.children.get(row.channel);if(!state?.ready)throw channelError('channel_unavailable');
    const token=randomUUID();
    try{await state.rpc.request('permanentFreeze',{id,token},{timeoutMs:10000});}
    catch(error){this.notificationFailed(state,error);throw error;}
    held.push({state,id,token});
   }
   const result=operation();if(result&&typeof result.then==='function')throw channelError('permanent_operation_must_be_synchronous');
   return result;
  }finally{
   try{
    const failures=[];for(const {state,id,token}of held){try{await state.rpc.request('permanentResume',{id,token},{timeoutMs:5000});}catch(error){this.notificationFailed(state,error);failures.push(error);}}
    if(failures.length)throw new AggregateError(failures,'permanent_resume_failed');
   }finally{release();}
  }
 }
 notifyCommitted(origin,changes){
  // Called only after writer.write has crossed its durable ACK boundary.
  // Pending notifications coalesce by key, not by full rows or world frames.
  if(!changes?.length)return;
  this.onCommitted(changes);
  for(const target of this.children.values()){
   if(target===origin||!target.child||target.child.exitCode!==null||target.child.signalCode!==null)continue;
   for(const row of changes){const key=row.table+'\u001e'+JSON.stringify(row.keys),old=target.committed.get(key);target.committed.set(key,{...row,staticChanged:row.staticChanged||old?.staticChanged||''});}
   if(target.committed.size>16384){this.notificationFailed(target,channelError('commit_notification_overflow'));continue;}
   this.scheduleNotifications(target);
  }
 }
 scheduleNotifications(state){
  if(!state.ready||state.notifying||!state.committed.size||this.stopping)return;
  state.notifying=true;
  setImmediate(()=>{void(async()=>{
   try{
    while(state.ready&&state.committed.size&&!this.stopping){
     const batch=[];for(const [key,row]of state.committed){batch.push(row);state.committed.delete(key);if(batch.length===128)break;}
     await state.rpc.request('committed',{changes:batch},{timeoutMs:5000});
    }
   }catch(error){this.notificationFailed(state,error);}
   finally{state.notifying=false;}
  })();});
 }
 notificationFailed(state,error){
  // Never keep serving an acknowledged-death/economy view after losing its
  // invalidation stream. Restart only this reader from durable storage.
  state.stopReason??='notification_failed';if(!state.terminationLogged477){state.terminationLogged477=true;lifecycle477({event:'terminate',atMs:Date.now(),channel:state.channel,pid:state.child?.pid??null,stopIntent:state.stopReason});}state.ready=false;this.publishDirectory();this.onFailure({channel:state.channel,error});state.child?.kill('SIGKILL');
 }
 publishDirectory(){this.onDirectory([1,2,3].map(channel=>{const s=this.children.get(channel);return {channel,ready:!!s?.ready,port:s?.port??null,dungeonPort:s?.dungeonPort??null};}));}
 async sample(){
  await Promise.all([...this.children.values()].filter(s=>s.ready).map(async s=>{
   try{s.health=await s.rpc.request('health',{}, {timeoutMs:1500});}
   catch(error){s.health={error:error.code??'health_failed'};}
  }));return this.snapshot();
 }
 snapshot(){return {enabled:true,protocol:'resident-channel-v1',channels:[...this.children.values()].map(s=>({channel:s.channel,pid:s.child?.pid??null,ready:s.ready,port:s.port??null,restarts:s.restarts,perfR11Features:s.health?.perfR11Features??s.perfR11Features??null,perfR13Features:s.health?.perfR13Features??s.perfR13Features??null,perfR18:s.health?.perfR18??s.perfR18??null,perfR15Features:s.health?.perfR15Features??s.perfR15Features??null,health:s.health}))};}
 close(){
  if(!this.closing)this.closing=this.closeChildren();return this.closing;
 }
 async closeChildren(){
  this.stopping=true;
  const stop=async state=>{
   clearTimeout(state.restartTimer);clearTimeout(state.recoveryTimer508);const child=state.child;
   if(!child||child.exitCode!==null||child.signalCode!==null){state.rpc?.close();await state.disconnected;return;}
   const result=await new Promise(resolve=>{
    const timer=setTimeout(()=>{lifecycle477({event:'terminate',atMs:Date.now(),channel:state.channel,pid:child.pid??null,stopIntent:'shutdown_timeout'});child.kill('SIGKILL');},15000);
    child.once('exit',(code,signal)=>{clearTimeout(timer);resolve({code,signal});});state.stopReason??='supervisor_shutdown';child.kill('SIGTERM');
   });
   await state.disconnected;
   if(result.code!==0)throw channelError('channel_shutdown_not_clean');
  };
  let results;
  if(this.boot.sharedCombat){results=[];for(const state of [...this.children.values()].sort((a,b)=>(a.channel===1)-(b.channel===1)))results.push(...await Promise.allSettled([stop(state)]));}
  else results=await Promise.allSettled([...this.children.values()].map(stop));
  const failed=results.find(result=>result.status==='rejected');if(failed)throw failed.reason;
 }
}
