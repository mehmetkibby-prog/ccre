// Fixture-only cold-worker attribution. Wrappers preserve native calls/results;
// instrumentation overhead makes this diagnostic, never capacity acceptance.
import {Session} from 'node:inspector';
import {writeFileSync} from 'node:fs';
import {threadId} from 'node:worker_threads';
const path=new URL('../../evidence/worker-final-burst-profile-r85',import.meta.url).pathname;
let observer=null;
export function profileSyncR85(name,work){if(!observer)return work();const start=performance.now();try{return work();}finally{observer(name,performance.now()-start);}}
export function installWorkerFinalProfileR85(database,{stageSnapshotR51}){
 const session=new Session();session.connect();
 const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(error,value)=>error?reject(error):resolve(value)));
 const rows=[],queryRows=new Map(),prepareRows=new Map(),prepared=new WeakSet();let active=null,first=true;
 const record=(name,ms)=>{if(!active)return;const row=active.methods[name]??={count:0,ms:0,maxMs:0};row.count++;row.ms+=ms;row.maxMs=Math.max(row.maxMs,ms);};observer=record;
 const wrap=(object,name,label=name)=>{const old=object?.[name];if(typeof old!=='function')return;object[name]=function(...args){const started=performance.now();try{return Reflect.apply(old,this,args);}finally{record(label,performance.now()-started);}};};
 const query=(sql,method,work)=>{if(!active)return work();const started=performance.now();try{return work();}finally{const ms=performance.now()-started,key=method+':'+sql,row=queryRows.get(key)??{sql,method,count:0,ms:0,maxMs:0};row.count++;row.ms+=ms;row.maxMs=Math.max(row.maxMs,ms);queryRows.set(key,row);active.sqlMs+=ms;active.sqlCount++;}};
 const sql=database.sqlite,prepare=sql.prepare;sql.prepare=function(text,...rest){
  const started=performance.now();let statement;
  try{statement=Reflect.apply(prepare,this,[text,...rest]);}finally{if(active){const ms=performance.now()-started,row=prepareRows.get(text)??{sql:text,count:0,ms:0,maxMs:0,firstJob:rows.length};row.count++;row.ms+=ms;row.maxMs=Math.max(row.maxMs,ms);prepareRows.set(text,row);active.prepareMs+=ms;active.prepareCount++;}}
  if(!prepared.has(statement)){prepared.add(statement);for(const method of ['get','all','run']){const old=statement[method];statement[method]=function(...args){return query(text,method,()=>Reflect.apply(old,this,args));};}}return statement;
 };
 const exec=sql.exec;sql.exec=function(text,...rest){return query(text,'exec',()=>Reflect.apply(exec,this,[text,...rest]));};
 return {
  bind(writer){
   wrap(writer,'refreshOwners');wrap(writer.services,'run','services.run');wrap(writer.services.modules.ranks,'createRanks','ranks.factory');
   const refresh=writer.services.refresh;writer.services.refresh=function(...args){const before=this.globals.__colRanks,started=performance.now();try{return Reflect.apply(refresh,this,args);}finally{record('services.refresh',performance.now()-started);if(active)active.rankServiceReused=before===this.globals.__colRanks;}};
   wrap(writer.authority.operations.attack,'execute','attack.execute');wrap(writer.authority.operations.native_action,'execute','native_action.execute');
   for(const name of ['playerWrites','monsterWrites','sharedRefresh','commandFailures','collectAudit'])wrap(writer[name],'run',name+'.run');
   for(const [name,service] of Object.entries(writer.services.globals))if(service&&typeof service==='object')wrap(service,'refresh',name+'.refresh');
   wrap(database,'commitWrites','commitWrites');
  },
  async begin(envelope){
   if(rows.length>=30)return;
   if(first){first=false;await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:250});await post('Profiler.start');}
   stageSnapshotR51({reset:true});active={operationId:envelope.request.operationId,operation:envelope.request.operation,action:envelope.request.payload?.input?.action,actorLevel:envelope.request.payload?.expected?.player?.level,batchExtras:envelope.request.payload?.batchAttacksR57?.length??0,methods:{},sqlMs:0,sqlCount:0,prepareMs:0,prepareCount:0,started:performance.now()};
  },
  async end(){
   if(!active)return;active.wallMs=performance.now()-active.started;delete active.started;active.stages=stageSnapshotR51();rows.push(active);active=null;
   if(rows.length===30){const {profile}=await post('Profiler.stop');session.disconnect();observer=null;writeFileSync(path+'-'+process.pid+'-'+threadId+'.cpuprofile',JSON.stringify(profile));writeFileSync(path+'-'+process.pid+'-'+threadId+'.json',JSON.stringify({rows,sql:[...queryRows.values()].sort((a,b)=>b.ms-a.ms),prepare:[...prepareRows.values()].sort((a,b)=>b.ms-a.ms),note:'Fixture wrappers and250us CPU sampling add overhead; nested stages overlap; exact source hashes checked by loader.'},null,2));}
  }
 };
}
