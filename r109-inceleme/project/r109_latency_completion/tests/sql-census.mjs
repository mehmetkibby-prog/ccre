// Test-only diagnostic: counts native SQLite prepare/exec/statement calls on one
// connection. Installed underneath every runtime wrapper, so it sees each real
// native prepare (a cache miss anywhere above shows up here). Never used by the
// game package; enable with SQL_CENSUS=1 in population-load.mjs only.
const short=sql=>String(sql).replace(/\s+/g,' ').trim().slice(0,160);
const frameOf=stack=>String(stack).split('\n').slice(2).map(l=>l.trim()).filter(l=>!l.includes('sql-census.mjs')&&!l.includes('node:internal')).slice(0,6).map(l=>l.replace(/^at /,'').replace(/\(?file:\/\/[^)]*\/(core511|vds-server\/src|tests)\//,'($1/'));
export function installSqlCensus(sqlite,{active=()=>true}={}){
 const prepares=new Map(),execs=new Map(),calls=new Map();let totalCallMs=0,totalCalls=0,totalPrepares=0,totalExecs=0,prepareMs=0,execMs=0;
 const originalPrepare=sqlite.prepare,originalExec=sqlite.exec;
 sqlite.prepare=function(sql,...args){
  const on=active(),started=on?performance.now():0;const statement=Reflect.apply(originalPrepare,this,[sql,...args]);
  if(on){const ms=performance.now()-started;prepareMs+=ms;totalPrepares++;const key=short(sql);let row=prepares.get(key);if(!row)prepares.set(key,row={count:0,ms:0,stacks:new Map()});row.count++;row.ms+=ms;
   if(row.stacks.size<4){const stack=frameOf(new Error().stack).join(' <- ');row.stacks.set(stack,(row.stacks.get(stack)??0)+1);}else{const stack=frameOf(new Error().stack).join(' <- ');if(row.stacks.has(stack))row.stacks.set(stack,row.stacks.get(stack)+1);}}
  const key=short(sql);
  for(const name of ['get','all','run','iterate']){const invoke=statement[name];if(typeof invoke!=='function')continue;statement[name]=function(...bindings){if(!active())return Reflect.apply(invoke,this,bindings);const at=performance.now();try{return Reflect.apply(invoke,this,bindings);}finally{const ms=performance.now()-at;totalCalls++;totalCallMs+=ms;let row=calls.get(key);if(!row)calls.set(key,row={count:0,ms:0,maxMs:0});row.count++;row.ms+=ms;if(ms>row.maxMs)row.maxMs=ms;}};}
  return statement;
 };
 sqlite.exec=function(sql,...args){
  if(!active())return Reflect.apply(originalExec,this,[sql,...args]);
  const at=performance.now();try{return Reflect.apply(originalExec,this,[sql,...args]);}finally{const ms=performance.now()-at;totalExecs++;execMs+=ms;const key=short(sql);let row=execs.get(key);if(!row)execs.set(key,row={count:0,ms:0,maxMs:0});row.count++;row.ms+=ms;if(ms>row.maxMs)row.maxMs=ms;}
 };
 const top=(map,n,by='count')=>[...map].sort((a,b)=>b[1][by]-a[1][by]).slice(0,n).map(([sql,row])=>({sql,...row,ms:Math.round(row.ms*100)/100,...(row.maxMs!==undefined?{maxMs:Math.round(row.maxMs*100)/100}:{}),...(row.stacks?{stacks:[...row.stacks].map(([s,c])=>({count:c,stack:s}))}:{})}));
 return {report:()=>({totals:{prepares:totalPrepares,prepareMs:Math.round(prepareMs),distinctPrepared:prepares.size,statementCalls:totalCalls,statementMs:Math.round(totalCallMs),distinctStatements:calls.size,execs:totalExecs,execMs:Math.round(execMs)},topPreparesByCount:top(prepares,40),topPreparesByMs:top(prepares,15,'ms'),topCallsByCount:top(calls,40),topCallsByMs:top(calls,25,'ms'),topExecs:top(execs,20)})};
}
