import {demand} from './contract.mjs';
const states=new WeakMap();
// Restore only JS bookkeeping after a separately confirmed surrounding SQL
// rollback. Never issue SQL, COMMIT, or authorize recovery here.
export function captureServiceTransactions(database){
 const state=states.get(database);demand(state,'service_transaction_database');const before=[...state.stack];
 return ()=>{demand(state.sql.isTransaction,'service_transaction_rollback_context');state.stack.splice(0,state.stack.length,...before);};
}

// Preserve a native service's transaction boundary inside the sole writer's
// outer atomic transaction. Its COMMIT releases a savepoint only; the outer
// economy receipt and WAL fsync remain the only durability boundary.
export function serviceTransactionDatabase(sql,{allowedExec=[]}={}){
 let serial=0;const stack=[];
 const batches=new Set(allowedExec);
 const database=new Proxy(sql,{get(target,key){
  if(key==='exec')return source=>{
   if(source==='BEGIN IMMEDIATE'){demand(target.isTransaction,'service_requires_outer_atomic');const name='core511_service_'+(++serial);target.exec('SAVEPOINT '+name);stack.push(name);return;}
   if(source==='COMMIT'||source==='ROLLBACK'){const name=stack.at(-1);demand(name&&target.isTransaction,'service_transaction_unbalanced');if(source==='ROLLBACK')target.exec('ROLLBACK TO '+name);target.exec('RELEASE '+name);stack.pop();return;}
   if(batches.has(source)){demand(target.isTransaction,'service_requires_outer_atomic');return target.exec(source);}
   // Only exact native factory DML batches admitted by the extractor may run.
   // Schema/setup and arbitrary SQL are not exposed through a game handler.
   throw Error('service_exec_not_a_transaction');
  };
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
 states.set(database,{sql,stack});return database;
}
