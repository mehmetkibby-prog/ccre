import {demand} from './contract.mjs';
import {rewardIdleCostR54} from './r54-options.mjs';

// One FIFO covers BOTH connections. An external job is a queue barrier, never
// a second concurrent writer. No main SQLite transaction survives an await.
const installed=new WeakMap();
export function exclusiveWriterLaneR533(database){
 if(installed.has(database))return installed.get(database);
 const schedule=database.scheduleWriteDrain,drain=database.drainWrites;
 demand(typeof schedule==='function'&&typeof drain==='function','reward_worker_database_contract');
 let busy=null,closed=false,nativeWrites=0,externalQueuedR54=0;
 let startedR80=null,completedR80=0,maxExternalMsR80=0;
 const lane={
  get busy(){return busy;},
  get nativeWrites(){return nativeWrites;},
  snapshot(){
   const now=performance.now(),queue=database.writeQueue;
   const oldest=queue.length&&Number.isFinite(queue[0].queuedAt477)?Math.max(0,now-queue[0].queuedAt477):null;
   // Never traverse a large backlog from the public health endpoint. The
   // total remains exact; the optional external subset is unknown above 256.
   const queuedExternal=queue.length<=256?queue.reduce((n,job)=>n+Number(typeof job.externalR533==='function'),0):null;
   return {protocol:'single-writer-lane-v1',externalBusy:busy!==null,externalAgeMs:startedR80===null?null:Math.max(0,now-startedR80),queuedWrites:queue.length,queuedExternal,oldestQueuedAgeMs:oldest,nativeWrites,completedExternal:completedR80,maxExternalMs:maxExternalMsR80};
  },
  run(work){database.assertAvailable();demand(!closed&&typeof work==='function','reward_worker_lane_closed');return new Promise((resolve,reject)=>{if(rewardIdleCostR54)externalQueuedR54++;database.writeQueue.push({externalR533:work,resolve,reject,queuedAt477:performance.now()});database.scheduleWriteDrain();});},
  async idle(){while(busy)await busy;},
  close(){demand(!busy,'reward_worker_lane_busy');closed=true;}
 };
 database.scheduleWriteDrain=function(){if(!busy)return schedule.call(this);};
 database.drainWrites=function(){
  if(busy)return;
  if(rewardIdleCostR54&&!externalQueuedR54)return drain.call(this);
  const at=this.writeQueue.findIndex(job=>job.externalR533);
  if(at<0)return drain.call(this);
  if(at>0){
   const tail=this.writeQueue.splice(at);
   try{return drain.call(this);}finally{this.writeQueue.push(...tail);this.scheduleWriteDrain();}
  }
  this.writeDrain=null;const job=this.writeQueue.shift();if(rewardIdleCostR54)externalQueuedR54--;
  demand(!this.sqlite.isTransaction,'reward_worker_main_transaction');
  // A non-timer marker also prevents the original scheduler retained inside
  // R53's group wrapper from starting a parallel drain.
  const marker={externalR533:true};this.writeDrain=marker;
  startedR80=performance.now();
  const work=Promise.resolve().then(()=>job.externalR533());
  busy=work.then(job.resolve,job.reject).finally(()=>{maxExternalMsR80=Math.max(maxExternalMsR80,performance.now()-startedR80);completedR80++;startedR80=null;busy=null;if(this.writeDrain===marker)this.writeDrain=null;this.scheduleWriteDrain();});
 };
 // Legacy asynchronous native D1 calls can include autocommitted writes.
 // They wait outside SQLite. The regular atomic queue already waits in FIFO.
 for(const key of ['executeAsync','batch','exec'])if(typeof database[key]==='function'){
  const native=database[key];database[key]=async function(...args){
   const read=s=>typeof s?.sql==='string'&&/^\s*SELECT\b/i.test(s.sql);
   const writes=key==='exec'||key==='executeAsync'&&!read(args[0])||key==='batch'&&!args[0]?.every(read);
   if(writes)nativeWrites++;
   try{if(writes&&busy)await lane.idle();return await native.apply(this,args);}
   finally{if(writes)nativeWrites--;}
  };
 }
 installed.set(database,lane);return lane;
}

// Reading diagnostics must not install a writer lane or change its scheduling.
export function writerLaneSnapshotR80(database){return installed.get(database)?.snapshot()??null;}
