import {gameplayR55} from './r55-gameplay-options.mjs';
import {demand} from './contract.mjs';

// The native forge deliberately insists on FULL. The host uses NORMAL plus a
// WAL synchronizer for queued gameplay. A cold, synchronous forge operation
// temporarily uses FULL on that same connection, after the existing permanent
// owner gate has drained it. No other callback can interleave here, and the
// outer permanent gate still waits for durability and actor refresh.
export function fullEnhancementCommitR55(sql,work){
 demand(typeof work==='function'&&!sql.isTransaction,'enhancement_r55_transaction_open');
 const prior=Number(sql.prepare('PRAGMA synchronous').get()?.synchronous);
 demand(prior===1||prior===2||prior===3,'enhancement_r55_unsafe_durability');
 if(prior!==2)sql.exec('PRAGMA synchronous=FULL');
 try{
  const value=work();demand(!value?.then,'enhancement_r55_async_operation');return value;
 }finally{
  // Never change a connection's mode while an uncertain transaction is open.
  if(!sql.isTransaction&&prior!==2)sql.exec('PRAGMA synchronous='+prior);
 }
}
export function wrapEnhancementDurabilityR55(service,sql,{enabled=gameplayR55.enhancementDurability}={}){
 if(!enabled)return service;
 return {...service,command:(...args)=>fullEnhancementCommitR55(sql,()=>service.command(...args)),save:(...args)=>fullEnhancementCommitR55(sql,()=>service.save(...args))};
}
