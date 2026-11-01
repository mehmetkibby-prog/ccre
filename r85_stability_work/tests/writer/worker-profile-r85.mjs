// Fixture-only first-30 worker profile. SQL and method wrappers preserve return
// values/errors. Timing adds overhead; this run locates cost, not acceptance.
import {Session} from 'node:inspector';
import {writeFileSync} from 'node:fs';
import {threadId} from 'node:worker_threads';
const path=new URL('../../evidence/worker-first-burst-profile-r85',import.meta.url).pathname;
export function installWorkerProfileR85(database,{stageSnapshotR51}){
 const session=new Session();session.connect();
 const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(error,value)=>error?reject(error):resolve(value)));
 const rows=[],queryRows=new Map(),prepared=new WeakSet();let active=null,first=true;
 const record=(name,ms)=>{if(!active)return;const row=active.methods[name]??={count:0,ms:0,maxMs:0};row.count++;row.ms+=ms;row.maxMs=Math.max(row.maxMs,ms);};
 const wrap=(object,name,label=name)=>{const old=object?.[name];if(typeof old!=='function')return;object[name]=function(...args){const started=performance.now();try{return Reflect.apply(old,this,args);}finally{record(label,performance.now()-started);}};};
 const query=(sql,method,work)=>{if(!active)return work();const started=performance.now();try{return work();}finally{const ms=performance.now()-started,key=method+':'+sql,row=queryRows.get(key)??{sql,method,count:0,ms:0,maxMs:0};row.count++;row.ms+=ms;row.maxMs=Math.max(row.maxMs,ms);queryRows.set(key,row);active.sqlMs+=ms;active.sqlCount++;}};
 const sql=database.sqlite,prepare=sql.prepare;sql.prepare=function(text,...rest){const statement=Reflect.apply(prepare,this,[text,...rest]);if(!prepared.has(statement)){prepared.add(statement);for(const method of ['get','all','run']){const old=statement[method];statement[method]=function(...args){return query(text,method,()=>Reflect.apply(old,this,args));};}}return statement;};
 const exec=sql.exec;sql.exec=function(text,...rest){return query(text,'exec',()=>Reflect.apply(exec,this,[text,...rest]));};
 return {
  bind(writer){
   wrap(writer,'refreshOwners');wrap(writer.services,'refresh','services.refresh');wrap(writer.services,'run','services.run');
   wrap(writer.authority.operations.attack,'execute','attack.execute');wrap(writer.authority.operations.native_action,'execute','native_action.execute');
   for(const name of ['playerWrites','monsterWrites','sharedRefresh','commandFailures','collectAudit'])wrap(writer[name],'run',name+'.run');
   for(const [name,service] of Object.entries(writer.services.globals))if(service&&typeof service==='object'){wrap(service,'refresh',name+'.refresh');}
   wrap(database,'commitWrites','commitWrites');
  },
  async begin(envelope){
   if(rows.length>=30)return;
   if(first){first=false;await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:100});await post('Profiler.start');}
   stageSnapshotR51({reset:true});active={operation:envelope.request.operation,action:envelope.request.payload?.input?.action,batchExtras:envelope.request.payload?.batchAttacksR57?.length??0,methods:{},sqlMs:0,sqlCount:0,started:performance.now()};
  },
  async end(){
   if(!active)return;active.wallMs=performance.now()-active.started;delete active.started;active.stages=stageSnapshotR51();rows.push(active);active=null;
   if(rows.length===30){const {profile}=await post('Profiler.stop');session.disconnect();writeFileSync(path+'-'+process.pid+'-'+threadId+'.cpuprofile',JSON.stringify(profile));writeFileSync(path+'-'+process.pid+'-'+threadId+'.json',JSON.stringify({rows,sql:[...queryRows.values()].sort((a,b)=>b.ms-a.ms),note:'Fixture wrappers and100us CPU sampling add overhead; stage timings overlap; exact source hash checked by loader.'},null,2));}
  }
 };
}
