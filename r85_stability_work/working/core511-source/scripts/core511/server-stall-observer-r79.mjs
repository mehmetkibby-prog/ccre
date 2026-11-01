// Observation only. The native COMMIT and its error/result are never replaced.
// No SQL, account identifiers, paths or credentials are included in records.
const installed=new WeakMap();
const finite=value=>Number.isFinite(value)&&value>=0?Math.round(value*100)/100:null;
export function observeWriterStallsR79(database,{clock=Date.now,log=record=>console.warn(JSON.stringify(record))}={}){
 if(installed.has(database))return installed.get(database);
 const original=database.commitWrites;
 if(typeof original!=='function')throw Error('writer_stall_observer_binding');
 const stats={slowCommits:0,lastCommitMs:0,maxCommitMs:0,lastSlowAtMs:null};let lastLogged=-Infinity,closed=false;
 const snapshot=()=>{
  let checkpoint=null;try{const s=database.core511CheckpointR79?.snapshot();if(s)checkpoint={ready:s.ready===true,fallback:typeof s.fallback==='string'&&/^[a-z0-9-]{1,64}$/.test(s.fallback)?s.fallback:null,pendingPages:finite(s.pendingPages)};}catch{}
  return {...stats,checkpoint,queuedWrites:Number.isSafeInteger(database.writeQueue?.length)?database.writeQueue.length:null};
 };
 function wrapped(...args){
  try{return Reflect.apply(original,this,args);}
  finally{
   try{
    const ms=finite(this.lastCommitMs477);if(ms!==null){stats.lastCommitMs=ms;stats.maxCommitMs=Math.max(stats.maxCommitMs,ms);}
    if(!closed&&ms!==null&&ms>=50){const now=clock();stats.slowCommits++;stats.lastSlowAtMs=now;if(now-lastLogged>=5000){lastLogged=now;log({event:'core511_slow_commit_r79',atMs:now,durationMs:ms,...snapshot(),scope:'main-thread SQLite COMMIT wall time; not network ping'});}}
   }catch{/* Observation must never alter native completion or error semantics. */}
  }
 }
 const observer={snapshot,close(){closed=true;if(database.commitWrites===wrapped)database.commitWrites=original;installed.delete(database);}};
 database.commitWrites=wrapped;installed.set(database,observer);return observer;
}
