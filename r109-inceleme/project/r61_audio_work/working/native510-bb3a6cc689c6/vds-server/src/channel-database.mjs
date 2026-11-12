import {perfStage477,recordWriterPerf477} from './request-performance477.mjs';
import {colLabKnownRejection} from './loadlab-ack.mjs';
import {LocalDatabase} from './database.mjs';
import {PositionStore,attachPositionStore} from './position-store.mjs';
import {CombatStore,attachCombatStore} from './combat-store.mjs';
import {ChannelMemoryBuffer} from './channel-memory-buffer.mjs';
import {ChannelWritePipeline477,channelWriterPipelineEnabled477,CHANNEL_WRITE_COHORT477} from './channel-write-pipeline477.mjs';
import {GroupSizeMetrics477} from './writer-group-metrics477.mjs';
import {AsyncLocalStorage} from 'node:async_hooks';
import {reportRuntimeWork} from './runtime-performance.mjs';

const plainRead = sql => /^\s*SELECT\b/i.test(sql);
// Only two explicitly ownerless world tables bypass the conservative fallback.
// Unknown economic/party SQL still carries every admitted lease as before.
const ownerlessWorldStatement451 = s => typeof s?.sql==='string' && !s.sql.replace(/;\s*$/,'').includes(';') && /^\s*(?:UPDATE\s+(?:main\.)?["`]?(?:monsters|world_state)["`]?\s+SET\b|INSERT(?:\s+OR\s+\w+)?\s+INTO\s+(?:main\.)?["`]?(?:monsters|world_state)["`]?(?:\s|\())/i.test(s.sql);
const frame = s => ({sql:s.sql,params:s.params.map(value=>value instanceof Uint8Array?Array.from(value):value),...(s.loadlabReward?{loadlabReward:{...s.loadlabReward}}:{}),...(s.loadlabRateLimit?{loadlabRateLimit:{...s.loadlabRateLimit}}:{})});

// Same game API, resident channel memory, READONLY durable SQLite handle.
// Nonlethal combat and position checkpoint handlers have no writer IPC at all.
// The sole writer receives changed columns at flush/critical-event boundaries.
export class ChannelDatabase extends LocalDatabase {
  constructor(path,{channel,request,claim,eventRange,transfer,writerPipeline}={}) {
    const pipelineEnabled477=channelWriterPipelineEnabled477(writerPipeline);
    super(path,{readOnly:true});
    if (![1,2,3].includes(channel) || typeof request !== 'function' || typeof claim !== 'function') throw Error('Invalid channel database');
    this.channel=channel; this.requestWrite=request; this.claimOwner=claim;
    this.requestTransfer=transfer;
    this.owners=new Map(); this.claims=new Map(); this.sequence=0; this.writeTail=Promise.resolve();
    this.actorContext=new AsyncLocalStorage();this.playerWork=new Map();this.drainingPlayers=new Set();
    this.writeMetrics={queued:0,active:0,maxQueued:0,completed:0};
    this.writerPipeline477=pipelineEnabled477;
    this.writerCohorts477=new GroupSizeMetrics477('dispatched-channel-cohorts',{config:{enabled:pipelineEnabled477,maxJobs:pipelineEnabled477?CHANNEL_WRITE_COHORT477:1,windowMs:0},maxSize:CHANNEL_WRITE_COHORT477});
    if(pipelineEnabled477)this.writePipeline477=new ChannelWritePipeline477(this,jobs=>this.performWriteCohort477(jobs));
    this.positions=new PositionStore(this.sqlite,{enabled:true,doubleBuffer:true,bootstrapChannel:channel});
    this.positions.resident=true;
    attachPositionStore(this.sqlite,this.positions,{readOnly:true});
    this.combat=new CombatStore(this.sqlite,{positions:this.positions,enabled:true});
    this.combat.resident=true;
    if(eventRange&&Number.isSafeInteger(eventRange.top)&&Number.isSafeInteger(eventRange.bottom)&&eventRange.top<=0&&eventRange.bottom<eventRange.top){
      this.combat.nextEventId=eventRange.top;
      this.combat.memory.function('col_memory_event_id',()=>{if(this.combat.nextEventId<=eventRange.bottom)throw Error('event_range_exhausted');return --this.combat.nextEventId;});
    }else throw Error('A durable event ID reservation is required');
    attachCombatStore(this.sqlite,this.combat,{readOnly:true});
    this.buffer=new ChannelMemoryBuffer(this.positions,this.combat);
    this.clearStatements();
  }
  async ensureOwner(id) {
    this.assertAvailable();
    if(this.drainingPlayers.has(id))throw Error('owner_draining');
    if(this.owners.has(id))return this.owners.get(id);
    let work=this.claims.get(id);
    if(!work){work=Promise.resolve().then(()=>{
      const row=this.positions.read.get(id);
      if(!row||row.channel!==this.channel)throw Error('channel_scope');
      return this.claimOwner(id);
    }).then(owner=>{
      if(owner.channel!==this.channel||owner.state!=='active')throw Error('owner_scope');
      // Newly created/transferred players were not in the startup snapshot.
      // Admission reads only this player's key, never the realm roster.
      const row=this.positions.read.get(id);
      if(!row||row.channel!==this.channel)throw Error('channel_scope');
      this.positions.entries.set(id,{base:{...row},current:{...row},generation:0,writtenGeneration:0,scopeChangedAt:Date.now()});
      this.positions.recent.add(id);this.positions.version++;
      this.combat.tables.get('players').records.delete(id);
      this.owners.set(id,owner);return owner;
    }).finally(()=>this.claims.delete(id));this.claims.set(id,work);}
    return work;
  }
  assertResident(id) {
    if(!this.owners.has(id))throw Error('owner_not_admitted');
    if(this.drainingPlayers.has(id)&&this.actorContext.getStore()?.playerId!==id)throw Error('owner_draining');
    const p=this.positions.entries.get(id)?.current;
    if(p&&p.channel!==this.channel)throw Error('channel_scope');
  }
  runPlayer(id,task) {
    const barrier=this.permanentWait?.get(id);if(barrier)return barrier.promise.then(()=>this.runPlayer(id,task));
    if(this.drainingPlayers.has(id))return Promise.reject(Error('owner_draining'));
    let active=this.playerWork.get(id);if(!active)this.playerWork.set(id,active=new Set());
    const context={playerId:id,work:null};
    const work=this.actorContext.run(context,async()=>{await this.ensureOwner(id);return task();});context.work=work;
    active.add(work);
    const finish=()=>{active.delete(work);if(!active.size)this.playerWork.delete(id);};
    work.then(finish,finish);return work;
  }
  async freezePlayer(id,{excludeCurrent=false}={}) {
    this.drainingPlayers.add(id);
    // Do not cancel an accepted sale/kill whose durable result is pending.
    const current=excludeCurrent&&this.actorContext.getStore()?.playerId===id?this.actorContext.getStore().work:null;
    for(;;){const pending=[...(this.playerWork.get(id)??[])].filter(p=>p!==current);if(!pending.length)break;await Promise.allSettled(pending);}
    await this.flushMemory();
    return {playerId:id,epoch:this.owners.get(id)?.epoch,writerSequence:this.sequence};
  }
  forgetPlayer(id,{excludeCurrent=false}={}) {
    const current=excludeCurrent&&this.actorContext.getStore()?.playerId===id?this.actorContext.getStore().work:null;
    if(!this.drainingPlayers.has(id)||[...(this.playerWork.get(id)??[])].some(p=>p!==current)||this.positions.dirty.has(id))throw Error('player_not_drained');
    this.owners.delete(id);this.positions.entries.delete(id);this.positions.recent.delete(id);
    const table=this.combat.tables.get('players');table.records.delete(id);table.remove.run(id);table.recent.add(id);
    this.combat.publish([{name:'players',id}]);this.positions.version++;this.sqlite.positionPresenceRefresh();
    // Leave a local fence until a later explicit admission to this process.
  }
  async admitTransferred(owner){
    if(owner.channel!==this.channel||owner.state!=='active'||this.playerWork.get(owner.player_id)?.size)throw Error('invalid_transfer_admission');
    const prior=this.owners.get(owner.player_id);if(prior&&prior.epoch>=owner.epoch)throw Error('stale_transfer_admission');
    // Only the authenticated supervisor pipe may thaw a former local fence.
    this.owners.delete(owner.player_id);this.drainingPlayers.delete(owner.player_id);
    const admitted=await this.ensureOwner(owner.player_id);
    if(admitted.epoch!==owner.epoch)throw Error('transfer_epoch_changed');
    const changed=[{table:'players',keys:[owner.player_id],id:owner.player_id,owner:owner.player_id,staticChanged:'channel'}];
    this.onCommitted?.(changed);return {ok:true};
  }
  async transferPlayer(id,targetChannel,guard,statements=[]){
    if(this.actorContext.getStore()?.playerId!==id||!this.requestTransfer)throw Error('channel_transfer_unavailable');
    const epoch=this.owners.get(id)?.epoch;
    const transferId=crypto.randomUUID();let begun=false;
    this.drainingPlayers.add(id);
    try{
      await this.requestTransfer('begin',{playerId:id,epoch,targetChannel,transferId});begun=true;
      const drained=await this.freezePlayer(id,{excludeCurrent:true});
      const result=await this.requestTransfer('accept',{playerId:id,epoch,targetChannel,transferId,writerSequence:drained.writerSequence,guard:frame(guard),statements:statements.map(frame)});
      this.forgetPlayer(id,{excludeCurrent:true});
      this.onCommitted?.([{table:'players',id,keys:[id],owner:id,staticChanged:'channel'}]);
      return result;
    }catch(error){
      if(!begun){if(['ipc_outcome_unknown','ipc_disconnected'].includes(error.code)){this.onFatal?.(error);}else this.drainingPlayers.delete(id);throw error;}
      // An unknown handoff outcome cannot resume the old player. Reconnect
      // resolves the durable owner; an explicit guarded rejection is cancelled.
      if(error.code==='transition_rejected'){
        await this.requestTransfer('cancel',{playerId:id,epoch,targetChannel,transferId});
        this.drainingPlayers.delete(id);return null;
      }
      this.onFatal?.(error);throw error;
    }
  }
  async positionCheckpoint(statement) {
    this.assertAvailable();this.assertResident(statement.params[7]);
    const result=this.positions.checkpoint(this.sqlite,statement);
    this.sqlite.positionPresenceRefresh();
    return result;
  }
  async executeAsync(statement) {
    if(!plainRead(statement.sql))return (await this.batch([statement]))[0];
    this.sqlite.positionPresenceRefresh();
    return super.executeAsync(statement);
  }
  async batch(statements,metadataMode) {
    if(statements.length&&statements.every(s=>plainRead(s.sql))){this.sqlite.positionPresenceRefresh();return super.batch(statements,metadataMode);}
    return this.remote(statements);
  }
  async guardedBatch(guard,statements,after) {
    const result=await this.remote(statements,guard);
    if(result.guard.results.length&&after)after(result.results);
    return result;
  }
  async combatHit(guard,plans,options) {
    this.assertResident(guard.params[3]);
    for(const plan of plans){
      const m=this.combat.tables.get('monsters').read.get(plan.target.id);
      if(!m||m.channel!==this.channel&&!(m.channel===0&&(this.sharedCombat?.proof()||!this.sharedCombat&&this.channel===1)))throw Error('monster_channel_scope');
    }
    return super.combatHit(guard,plans,options);
  }
  async combatBatch(statements,playerId) {this.assertResident(playerId);return super.combatBatch(statements,playerId);}
  async nativeOperation(operation){
    const result=await this.remote([],null,null,operation);
    if(!result?.native)throw Error('invalid_native_operation_reply');
    if(!result.native.ok)throw Error(result.native.message);
    return result.native.value;
  }
  async nativeScope(snapshot) {
    // Capture before calculation/queueing. Foreign shared-boss recipients are
    // observations, never local ownership claims or admissions.
    for(const id of snapshot.localPlayerIds)await this.ensureOwner(id);
    const players=snapshot.scopePlayers.map(({playerId,channel})=>{
      const owner=channel===this.channel?this.owners.get(playerId):this.sqlite.prepare('SELECT epoch,channel,incarnation,state FROM channel_owners WHERE player_id=?').get(playerId);
      return {playerId,channel,lease:owner?{epoch:owner.epoch,channel:owner.channel,incarnation:owner.incarnation,state:owner.state}:null};
    });
    return {version:1,players};
  }
  remote(statements,guard=null,nativePlan=null,nativeOperation=null,nativeScope=null) {
    if(!this.writerPipeline477)return this.remoteSerial477(statements,guard,nativePlan,nativeOperation,nativeScope);
    this.assertAvailable();
    const serializeStarted=performance.now();
    const serialized=statements.map(frame),serializedGuard=guard?frame(guard):null;
    reportRuntimeWork('channel_write_serialize',performance.now()-serializeStarted,performance.timeOrigin+serializeStarted);
    const actor=this.actorContext.getStore()?.playerId;
    // Capture every ALS context, including request measurements and the shared
    // combat grant. A drain started by actor A must not run actor B under A.
    const run=AsyncLocalStorage.snapshot();
    const hasPayload=!!(serialized.length||serializedGuard||nativePlan||nativeOperation);
    const job={serialized,serializedGuard,nativePlan,nativeOperation,nativeScope,actor,run,queuedAt:performance.now(),
      // Shared grants and snapshot-based native plans retain a singleton FIFO
      // reconciliation boundary. Empty flushes are explicit FIFO barriers.
      barrier:!hasPayload||!!(this.sharedCombat?.proof()||nativePlan||nativeOperation||nativeScope),
      ownerlessWorld:!actor&&!serializedGuard&&!nativePlan&&!nativeOperation&&serialized.length>0&&serialized.every(ownerlessWorldStatement451)};
    this.writeMetrics.queued++;this.writeMetrics.maxQueued=Math.max(this.writeMetrics.maxQueued,this.writeMetrics.queued);
    return this.writePipeline477.enqueue(job).then(value=>this.unwrapWriterResult477(value));
  }
  unwrapWriterResult477(value){
    if(value?.__loadlabRejected){const error=Object.assign(new Error(value.__loadlabRejected.code),{code:value.__loadlabRejected.code,status:409,loadlabRejected:true,detail:value.__loadlabRejected.detail});throw colLabKnownRejection(error,value.__loadlabAck);}
    return value;
  }
  pipelineRequest477(job,snapshot,sequence){
    const {actor,serialized,serializedGuard,nativePlan,nativeOperation,nativeScope,ownerlessWorld}=job;
    const owners=new Map();
    for(const delta of snapshot.deltas){
      const row=delta.after??delta.before,id=delta.table==='position'||delta.table==='players'?delta.keys[0]:row?.player_id;
      if(id&&!this.sharedCombat?.isShared(delta.table,delta.keys,row)){const o=this.owners.get(id);if(!o)throw Error('dirty_owner_not_admitted');owners.set(id,{playerId:id,epoch:o.epoch});}
    }
    if(actor){const o=this.owners.get(actor);if(!o)throw Error('owner_not_admitted');owners.set(actor,{playerId:actor,epoch:o.epoch});}
    else if((serialized.length||serializedGuard||nativePlan||nativeOperation)&&!nativeScope&&!ownerlessWorld)for(const [id,o]of this.owners)owners.set(id,{playerId:id,epoch:o.epoch});
    if(nativePlan&&!nativeScope)for(const [id,o]of this.owners)owners.set(id,{playerId:id,epoch:o.epoch});
    if(nativeScope)for(const p of nativeScope.players)if(p.channel===this.channel){
      if(!p.lease||p.lease.channel!==this.channel)throw Error('native_owner_not_admitted');
      const prior=owners.get(p.playerId);if(prior&&prior.epoch!==p.lease.epoch)throw Error('native_owner_epoch_changed');
      owners.set(p.playerId,{playerId:p.playerId,epoch:p.lease.epoch});
    }
    const sharedProof=this.sharedCombat?.proof();
    return {...(sharedProof?{sharedProof}:{}),sequence,actor:actor??null,owners:[...owners.values()],deltas:snapshot.deltas,statements:serialized,guard:serializedGuard,
      ...(nativePlan?{nativePlan}:{}),...(nativeOperation?{nativeOperation}:{}),...(nativeScope?{nativeScope}:{}),...(ownerlessWorld?{ownerlessWorld:true}:{})};
  }
  async performWriteCohort477(jobs){
    const metrics=this.writeMetrics,started=performance.now();
    for(const job of jobs)job.run(()=>{
      metrics.queued--;metrics.active++;
      const elapsed=performance.now()-job.queuedAt;
      reportRuntimeWork('channel_write_queue_wall',elapsed,performance.timeOrigin+job.queuedAt);perfStage477('writer_queue_wall',elapsed);
    });
    let snapshot;
    try{
      this.assertAvailable();
      const prepareStarted=performance.now();
      snapshot=jobs[0].run(()=>this.buffer.take((...args)=>this.sharedCombat?.include(...args)??true));
      const empty={positions:[],combat:[],deltas:[],started:snapshot.started};
      if(jobs.length===1&&!snapshot.deltas.length&&!jobs[0].serialized.length&&!jobs[0].serializedGuard&&!jobs[0].nativePlan&&!jobs[0].nativeOperation)return [[]];
      // Prepare all requests synchronously before the first send. No other
      // handler can change resident memory between snapshot and these frames.
      const requests=jobs.map((job,index)=>job.run(()=>this.pipelineRequest477(job,index===0?snapshot:empty,this.sequence+index+1)));
      reportRuntimeWork('channel_write_prepare',performance.now()-prepareStarted,performance.timeOrigin+prepareStarted);
      this.writerCohorts477.record(requests.length);
      const replies=await Promise.all(jobs.map((job,index)=>job.run(async()=>{
        const rpcStarted=performance.now();let reply;
        try{
          // Individual authenticated frames preserve the existing byte limit,
          // receipt identity and writer FIFO. No combined response is created.
          reply=await this.requestWrite(requests[index]);
        }finally{const at=performance.now(),elapsed=at-rpcStarted;job.replyAt477=at;reportRuntimeWork('channel_write_rpc_wall',elapsed,performance.timeOrigin+rpcStarted);perfStage477('writer_rpc_wall',elapsed);}
        recordWriterPerf477(reply?.writerTiming,reply?.writerBatch);
        return reply;
      })));
      const ackStarted=performance.now();
      try{
        const changed=new Map();
        for(const reply of replies)for(const change of reply.changed??[]){
          const key=change.table+'\u001e'+JSON.stringify(change.keys),previous=changed.get(key);
          changed.set(key,{...change,staticChanged:change.staticChanged||previous?.staticChanged||''});
        }
        // A first-job ACK must never read a later committed row and discard a
        // generation still being edited during fsync. Reconcile once against
        // the final durable state, after every member has crossed its ACK gate.
        this.sequence=requests.at(-1).sequence;
        const committedRows = this.buffer.acknowledged(snapshot,[...changed.values()]);
        this.sqlite.positionPresenceRefresh();this.onCommitted?.([...changed.values()],committedRows);
        return replies.map((reply,index)=>reply.labRejected?{__loadlabRejected:reply.labRejected,__loadlabAck:{proof:requests[index].sharedProof,sequence:requests[index].sequence,channel:this.channel}}:reply.result);
      }finally{
        const at=performance.now();
        reportRuntimeWork('channel_write_ack',at-ackStarted,performance.timeOrigin+ackStarted);
        for(const job of jobs)job.run(()=>perfStage477('writer_cohort_ack_wall',at-job.replyAt477));
      }
    }catch(error){
      if(snapshot)this.buffer.failed(snapshot);
      this.positions.accepting=false;this.combat.accepting=false;this.failure=error;this.onFatal?.(error);throw error;
    }finally{
      for(const job of jobs)job.run(()=>{metrics.active--;metrics.completed++;reportRuntimeWork('channel_write_wall',performance.now()-started,performance.timeOrigin+started);});
    }
  }
  remoteSerial477(statements,guard=null,nativePlan=null,nativeOperation=null,nativeScope=null) {
    this.assertAvailable();
    const serializeStarted=performance.now();
    const serialized=statements.map(frame),serializedGuard=guard?frame(guard):null;
    reportRuntimeWork('channel_write_serialize',performance.now()-serializeStarted,performance.timeOrigin+serializeStarted);
    const actor=this.actorContext.getStore()?.playerId;
    const ownerlessWorld=!actor&&!serializedGuard&&!nativePlan&&!nativeOperation&&serialized.length>0&&serialized.every(ownerlessWorldStatement451);
    const perform=async()=>{
      this.assertAvailable();
      const prepareStarted=performance.now();
      const snapshot=this.buffer.take((...args)=>this.sharedCombat?.include(...args)??true);
      if(!snapshot.deltas.length&&!serialized.length&&!serializedGuard&&!nativePlan&&!nativeOperation)return [];
      try{
      const owners=new Map();
      // Leases are acquired on admission, never per hit or per tick.
      for(const delta of snapshot.deltas){
        const row=delta.after??delta.before;
        const id=delta.table==='position'||delta.table==='players'?delta.keys[0]:row?.player_id;
        if(id&&!this.sharedCombat?.isShared(delta.table,delta.keys,row)){const o=this.owners.get(id);if(!o)throw Error('dirty_owner_not_admitted');owners.set(id,{playerId:id,epoch:o.epoch});}
      }
      // Fences durable actions too, including operations with no pending HP.
      if(actor){const o=this.owners.get(actor);if(!o)throw Error('owner_not_admitted');owners.set(actor,{playerId:actor,epoch:o.epoch});}
      else if((serialized.length||serializedGuard||nativePlan||nativeOperation)&&!nativeScope&&!ownerlessWorld)for(const [id,o]of this.owners)owners.set(id,{playerId:id,epoch:o.epoch});
      if(nativePlan&&!nativeScope)for(const [id,o]of this.owners)owners.set(id,{playerId:id,epoch:o.epoch});
      if(nativeScope)for(const p of nativeScope.players)if(p.channel===this.channel){
        if(!p.lease||p.lease.channel!==this.channel)throw Error('native_owner_not_admitted');
        const prior=owners.get(p.playerId);if(prior&&prior.epoch!==p.lease.epoch)throw Error('native_owner_epoch_changed');
        owners.set(p.playerId,{playerId:p.playerId,epoch:p.lease.epoch});
      }
      const request={...(this.sharedCombat?.proof()?{sharedProof:this.sharedCombat.proof()}:{}),sequence:this.sequence+1,actor:actor??null,owners:[...owners.values()],deltas:snapshot.deltas,statements:serialized,guard:serializedGuard,...(nativePlan?{nativePlan}:{}),...(nativeOperation?{nativeOperation}:{}),...(nativeScope?{nativeScope}:{}),...(ownerlessWorld?{ownerlessWorld:true}:{})};
        reportRuntimeWork('channel_write_prepare',performance.now()-prepareStarted,performance.timeOrigin+prepareStarted);
        const rpcStarted=performance.now();let reply;
        this.writerCohorts477.record(1);
        try{reply=await this.requestWrite(request);}finally{const elapsed=performance.now()-rpcStarted;reportRuntimeWork('channel_write_rpc_wall',elapsed,performance.timeOrigin+rpcStarted);perfStage477('writer_rpc_wall',elapsed);}
        recordWriterPerf477(reply?.writerTiming,reply?.writerBatch);
        const ackStarted=performance.now();
        try{
          this.sequence=request.sequence;
          const committedRows = this.buffer.acknowledged(snapshot,reply.changed);
          this.sqlite.positionPresenceRefresh();
          this.onCommitted?.(reply.changed,committedRows);
          return reply.labRejected?{__loadlabRejected:reply.labRejected,__loadlabAck:{proof:request.sharedProof,sequence:request.sequence,channel:this.channel}}:reply.result;
        }finally{reportRuntimeWork('channel_write_ack',performance.now()-ackStarted,performance.timeOrigin+ackStarted);}
      }catch(error){
        this.buffer.failed(snapshot);
        // Never continue after an unknown commit result. The supervisor fences
        // this incarnation and recovers from the durable receipt/database.
        this.positions.accepting=false;this.combat.accepting=false;this.failure=error;
        this.onFatal?.(error);
        throw error;
      }
    };
    const queuedAt=performance.now(),metrics=this.writeMetrics;
    metrics.queued++;metrics.maxQueued=Math.max(metrics.maxQueued,metrics.queued);
    const task=async()=>{
      metrics.queued--;metrics.active++;
      reportRuntimeWork('channel_write_queue_wall',performance.now()-queuedAt,performance.timeOrigin+queuedAt);perfStage477('writer_queue_wall',performance.now()-queuedAt);
      const started=performance.now();
      try{return await perform();}finally{metrics.active--;metrics.completed++;reportRuntimeWork('channel_write_wall',performance.now()-started,performance.timeOrigin+started);}
    };
    const pending=this.writeTail.then(task);
    this.writeTail=pending.catch(error=>{this.failure=error;});
    return pending.then(value=>{if(value?.__loadlabRejected){const error=Object.assign(new Error(value.__loadlabRejected.code),{code:value.__loadlabRejected.code,status:409,loadlabRejected:true,detail:value.__loadlabRejected.detail});throw colLabKnownRejection(error,value.__loadlabAck);}return value;});
  }
  assertAvailable(){super.assertAvailable();if(this.failure)throw this.failure;}
  async applyCommitted(changes){
    await this.writeTail;this.assertAvailable();
    const committedRows = this.buffer.acknowledged({positions:[],combat:[],started:performance.now()},changes);
    this.sqlite.positionPresenceRefresh();this.onCommitted?.(changes,committedRows);
  }
  startFlush(){
    this.flushTimer=setInterval(()=>{void this.flushMemory().catch(error=>{this.onFatal?.(error);});},1000);
    this.flushTimer.unref();
  }
  async drain(){clearInterval(this.flushTimer);this.positions.accepting=false;this.combat.accepting=false;await this.writeTail;await this.flushMemory();}
  exec(){return Promise.reject(Error('Schema/SQL exec is not permitted in channel processes'));}
  atomic(){return Promise.reject(Error('Durable atomic callbacks belong to the realm writer'));}
  close(){clearInterval(this.flushTimer);this.positions.stop();this.combat.stop();this.combat.memory.close();super.close();}
}
