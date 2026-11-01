// Diagnostic-only coarse timings. All spans are synchronous and nested;
// process.threadCpuUsage excludes the main/channel/generator threads.
let current=null,stack=[];
const cpu=()=>{const value=process.threadCpuUsage();return (value.user+value.system)/1000;};
export function coarseStageR85(name,work){
 if(!current)return work();
 const row=current.stages[name]??={count:0,wallMs:0,cpuMs:0,selfWallMs:0,selfCpuMs:0,maxWallMs:0},frame={childWall:0,childCpu:0},wall=performance.now(),used=cpu();stack.push(frame);
 try{return work();}finally{
  const elapsed=performance.now()-wall,consumed=cpu()-used;stack.pop();row.count++;row.wallMs+=elapsed;row.cpuMs+=consumed;row.selfWallMs+=elapsed-frame.childWall;row.selfCpuMs+=consumed-frame.childCpu;row.maxWallMs=Math.max(row.maxWallMs,elapsed);
  const parent=stack.at(-1);if(parent){parent.childWall+=elapsed;parent.childCpu+=consumed;}
 }
}
export function installCoarseStagesR85(database){
 const wrap=(object,key,label)=>{const fn=object[key];object[key]=function(...args){return coarseStageR85(typeof label==='function'?label():label,()=>Reflect.apply(fn,this,args));};};
 let ordinal=0,serviceDepth=0;
 return {
  bind(writer){
   wrap(writer,'refreshOwners','refreshOwners');wrap(writer.services,'refresh','services.refresh');
   wrap(writer.services.modules.ranks,'createRanks','ranks.factory');
   const serviceRun=writer.services.run;writer.services.run=function(...args){const label=serviceDepth?'services.run.secondary':'services.run.outer';serviceDepth++;try{return coarseStageR85(label,()=>Reflect.apply(serviceRun,this,args));}finally{serviceDepth--;}};
   for(const kind of ['attack','native_action'])wrap(writer.authority.operations[kind],'execute','ownership.execute.'+kind);
   for(const name of ['commandFailures','playerWrites','monsterWrites','sharedRefresh'])wrap(writer[name],'run',name+'.run');
   wrap(writer.notifications,'append','notification.append');wrap(database,'commitWrites','commitWrites');
   const atomic=database.atomic;database.atomic=function(work,options){return atomic.call(this,sql=>coarseStageR85('atomic.callback',()=>work(sql)),options);};
  },
  begin(envelope){
   if(current||stack.length)throw Error('coarse_stage_context');
   current={ordinal:++ordinal,operationId:envelope.request.operationId,operation:envelope.request.operation,actors:1+(envelope.request.payload?.batchAttacksR57?.length??0),stages:{},started:performance.now(),cpuStarted:cpu()};
  },
  end(){
   if(!current)return null;const row=current;row.wallMs=performance.now()-row.started;row.cpuMs=cpu()-row.cpuStarted;delete row.started;delete row.cpuStarted;
   if(stack.length)throw Error('coarse_stage_unclosed');current=null;return row;
  }
 };
}
