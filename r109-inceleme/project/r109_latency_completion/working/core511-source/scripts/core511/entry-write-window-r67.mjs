import {AsyncLocalStorage} from 'node:async_hooks';

// Entry requests already run one at a time in the coordinator. Waiting to
// collect the next entry's writes cannot batch them: that entry is still in
// the coordinator queue. Only skip this collection delay, never the FIFO,
// transaction, external-writer barrier or durable acknowledgement.
const scope=new AsyncLocalStorage();
export function entryWriteReadyR67(database){
 const current=scope.getStore();return current?.active===true&&current.database===database;
}
export function withEntryWritesR67(database,work){
 const current={database,active:true};
 return scope.run(current,async()=>{
  try{return await work();}
  finally{current.active=false;}
 });
}
