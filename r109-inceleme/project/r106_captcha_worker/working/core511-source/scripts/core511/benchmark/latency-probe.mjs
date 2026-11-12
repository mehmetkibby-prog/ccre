// Diagnostic hooks only. Original promises, payloads, FIFO order and ACK barriers
// are unchanged. Wall durations include scheduling; fsync is await-wall time.
import {AsyncLocalStorage} from 'node:async_hooks';
import {observeFraming} from '../reliable-stream.mjs';
const epoch=()=>performance.timeOrigin+performance.now();
export function framingLatencyProbe(){
 const groups={},slowest=[],slow=[];let startedAtMs=0,active=false,dropped=0;
 const dispose=observeFraming(row=>{if(!active)return;const segment=row.startedAtMs-startedAtMs<10000?'startup':'normal',key=segment+':'+row.type+':'+(row.method??''),g=groups[key]??={count:0,totalMs:0,jsonMs:0,bufferMs:0,bytes:0,maxMs:0};g.count++;for(const k of ['jsonMs','bufferMs','bytes'])g[k]+=row[k];g.totalMs+=row.ms;g.maxMs=Math.max(g.maxMs,row.ms);if(slowest.length<20||row.ms>slowest.at(-1).ms){slowest.push({...row,segment});slowest.sort((a,b)=>b.ms-a.ms);if(slowest.length>20)slowest.pop();}if(row.ms>50){if(slow.length<20000)slow.push({...row,segment});else dropped++;}});
 return {begin(){startedAtMs=epoch();active=true;},end(){active=false;dispose();return {startedAtMs,endedAtMs:epoch(),groups,slowest,over50Ms:slow,dropped,scope:'Main IPC frame JSON and UTF8/buffer wall; timer/GC/preemption remains included. Compare absolute times to the raw load window.'};}};
}
export function writerLatencyProbe(writer,{sqlTiming=true,reader=null}={}){
 const local=new AsyncLocalStorage(),rows=[],reads=[],flushes=[],commits=[],jobs=new WeakMap(),limit=20000;let active=false,dropped=0,startedAtMs=0,nextId=0;
 const startup=()=>active&&epoch()-startedAtMs<10000,keep=(list,row)=>{if(list.length<limit)list.push(row);else dropped++;};
 for(const [owner,name] of [[writer,'command'],[writer.system,'command']]){
  const original=owner[name];owner[name]=function(peer,request,...rest){
   if(!active||!sqlTiming&&!startup()&&request.payload?.input?.action!=='use_potion')return original.call(this,peer,request,...rest);
   const scope={channel:peer.channel,actor:request.playerId??null,key:request.operationId??request.key,kind:request.operation??request.kind,action:request.payload?.input?.action??null,receivedAtMs:epoch()};
   return local.run(scope,()=>original.call(this,peer,request,...rest));
  };
 }
 for(const [owner,name,describe] of [
  [writer,'notificationAck',(peer,p)=>({kind:'notification_ack',channel:peer.channel,actor:p.actor})],
  ...['admit','resume','logout','beginTransfer','acceptTransfer','release','retireSimulation'].map(name=>[writer,name,(id,peer)=>({kind:name,actor:id,channel:peer.channel})]),
  [writer.notifications,'prune',()=>({kind:'notification_prune'})]
 ]){if(typeof owner?.[name]!=='function')continue;const original=owner[name];owner[name]=function(...args){return startup()?local.run({...describe(...args),receivedAtMs:epoch()},()=>original.apply(this,args)):original.apply(this,args);};}
 const db=writer.database,atomic=db.atomic;
 db.atomic=function(work,options={}){
  if(!active||!sqlTiming&&!startup()&&!local.getStore())return atomic.call(this,work,options);
  const timing=options.timing??{},scope=local.getStore()??{kind:'atomic_unclassified'},row={...scope,id:++nextId,enqueuedAtMs:epoch(),timing};
  const ahead=this.writeQueue??[];row.queueDepth=ahead.length;
  if(scope.action==='use_potion')row.ahead=ahead.map(job=>jobs.get(job)??null);
  const result=atomic.call(this,work,sqlTiming?{...options,timing}:options),job=this.writeQueue?.at(-1);
  // Capture the native queued callback AFTER feed wrappers compose it, without
  // changing FIFO, SQL timing mode, transaction boundaries or durability.
  if(job?.atomic&&this.writeQueue.length===row.queueDepth+1){
   jobs.set(job,row.id);row.enqueuedAtMs=performance.timeOrigin+job.queuedAt477;
   const perform=job.atomic;job.atomic=function(...args){row.startedAtMs=epoch();if(!sqlTiming)timing.queueMs=row.startedAtMs-row.enqueuedAtMs;try{return perform.apply(this,args);}finally{row.callbackEndedAtMs=epoch();timing.callbackMs=row.callbackEndedAtMs-row.startedAtMs;}};
  }else row.nativeQueueCapture=false;
  return result.then(value=>{row.ackAtMs=epoch();keep(rows,row);return value;},error=>{row.error=error.code??error.message;row.ackAtMs=epoch();keep(rows,row);throw error;});
 };
 const timed=(owner,name,list,describe)=>{if(typeof owner?.[name]!=='function')return;const original=owner[name];owner[name]=function(...args){if(!startup())return original.apply(this,args);const row={...describe(...args),startedAtMs:epoch()},finish=()=>{row.endedAtMs=epoch();row.ms=row.endedAtMs-row.startedAtMs;keep(list,row);};try{const value=original.apply(this,args);if(value?.then)return value.finally(finish);finish();return value;}catch(error){row.error=error.code??error.message;finish();throw error;}};};
 timed(writer,'notificationPending',reads,(peer,p)=>({kind:'notification_pending',channel:peer.channel,actor:p.actor,synchronous:false}));
 timed(writer.notifications,'pending',reads,(_sql,actor)=>({kind:'notification_pending_sql',actor,synchronous:true}));
 timed(reader,'query',reads,kind=>({kind,synchronous:false}));
 timed(db,'commitWrites',commits,()=>({kind:'sqlite_commit',synchronous:true}));
 timed(db.walSync,'flush',flushes,()=>({kind:'wal_fsync',synchronous:false}));
 return {begin(){for(const list of [rows,reads,flushes,commits])list.length=0;dropped=0;startedAtMs=epoch();active=true;},end(){active=false;return {sqlTiming,startedAtMs,startupDurationMs:10000,rows,reads,flushes,commits,dropped,scope:'All atomic jobs plus read/COMMIT/fsync wall intervals in first10s; potion jobs afterward. FIFO ahead IDs captured at enqueue. Reads and async fsync are separate, not queued atomic work; intervals can overlap. SQL statement instrumentation only when sqlTiming=true. Raw acceptance metrics unchanged.'};}};
}
export function potionLatencyProbe(channel){
 const local=new AsyncLocalStorage(),rows=[],actors=new Map(),players=new WeakMap();let active=false;const actions=channel.actions,act=actions.act;
 actions.act=function(context){
  if(!active||context.input.action!=='use_potion')return act.call(this,context);
  const row={actor:context.id,startedAtMs:epoch(),stages:{}};const result=local.run(row,()=>act.call(this,context));
  if(result?.type==='action'){rows.push(row);actors.set(context.id,row);const p=context.kernel.players.get(context.id);if(p)players.set(p,row);}return result;
 };
 const settled=channel.kernel.settled;channel.kernel.settled=function(p,result){const row=active&&players.get(p);if(row&&row.settledAtMs===undefined){row.settledAtMs=epoch();row.sequence=result.sequence;}return settled.call(this,p,result);};
 for(const [owner,name,label] of [[channel.checkpoints,'drain','actorCheckpoint'],[channel.combatCheckpoints,'drain','combatCheckpoint'],[actions,'submit','writerRoundTrip'],[actions,'committed','refresh']]){
  const original=owner[name];owner[name]=function(...args){
   const row=local.getStore();if(!row)return original.apply(this,args);
   const start=epoch();if(name==='submit')row.key=args[0].key;
   const finish=()=>{const end=epoch();(row.stages[label]??=[]).push({startedAtMs:start,endedAtMs:end,ms:end-start});};
   try{const value=original.apply(this,args);if(value?.then)return value.finally(finish);finish();return value;}catch(error){finish();throw error;}
  };
 }
 return {begin(){rows.length=0;actors.clear();active=true;},sent(actor,packet){const row=active&&actors.get(actor);if(row&&row.sendQueuedAtMs===undefined&&packet.type==='frame'&&packet.results?.some(r=>r.sequence===row.sequence)){row.sendQueuedAtMs=epoch();}},end(){active=false;return {rows,scope:'Potion checkpoint and writer/refresh await wall; nested/shared waits overlap. settledAtMs marks actual kernel result after durable/refresh, sendQueuedAtMs marks its encoded outbound send call.'};}};
}
