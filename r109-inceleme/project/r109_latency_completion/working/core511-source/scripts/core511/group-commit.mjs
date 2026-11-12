// Coalesce independent, already committed transactions behind one WAL fsync.
// Native FIFO jobs/savepoints/COMMIT and failed-WAL recovery stay unchanged.
// Only the START of a flush moves behind the next bounded writer/I/O turn.
// A waiter arriving after a flush started remains in the NEXT native batch.
const installed=new WeakMap();
export function installGroupCommit(database){
 const wal=database.walSync;if(!wal)return null;
 if(installed.has(wal))return installed.get(wal);
 const nativePump=wal.pump,nativeDurable=database.durableAfterCommit,stats={protocol:'core511-two-turn-wal-group-v2',launches:0,maxTransactionsPerFlush:0};let scheduled=false,lastDurable=null;
 database.durableAfterCommit=function(...args){const result=nativeDurable.apply(this,args);lastDurable=result;return result;};
 // Read SQL first, then capture this promise in the same synchronous turn.
 // It covers every COMMIT visible to that read, without requesting another
 // fsync. A later COMMIT cannot be exposed through the earlier read snapshot.
 Object.defineProperty(stats,'afterRead',{value:()=>lastDurable,enumerable:false});
 wal.pump=function(){
  if(this.closed||this.failed||this.running||!this.waiting.length||scheduled)return;
  scheduled=true;
  // drainWrites schedules its next FIFO group before this microtask schedules
  // the flush. Thus at most one extra bounded group precedes fsync, with an I/O
  // turn in between; no SQLite transaction is left open across the yield.
  queueMicrotask(()=>setImmediate(()=>{
   scheduled=false;
   if(!this.closed&&!this.failed&&!this.running&&this.waiting.length){stats.launches++;stats.maxTransactionsPerFlush=Math.max(stats.maxTransactionsPerFlush,this.waiting.length);}
   nativePump.call(this);
  }));
 };
 installed.set(wal,stats);return stats;
}
