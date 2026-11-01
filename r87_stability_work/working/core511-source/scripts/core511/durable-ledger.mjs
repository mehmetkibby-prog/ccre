import {createHash} from 'node:crypto';
import {demand} from './contract.mjs';
function canonical(value,depth=0) {
 demand(depth<32,'event_too_deep');
 if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
 if(typeof value==='number'){demand(Number.isFinite(value),'invalid_event_number');return JSON.stringify(value);}
 if(Array.isArray(value))return '['+value.map(v=>canonical(v,depth+1)).join(',')+']';
 demand(value&&Object.getPrototypeOf(value)===Object.prototype,'invalid_event_value');
 return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k],depth+1)).join(',')+'}';
}
export const eventDigest=value=>createHash('sha256').update(canonical(value)).digest('hex');
// This receipt and the existing rule's SQL mutations share the SAME atomic
// callback. LocalDatabase.atomic resolves only after its group COMMIT/fsync.
// Only writer-owned registered rule handlers can apply mutations.
export class DurableLedger {
 constructor(database,{handlers,authorize,maxPending=4096}={}) {
  demand(database&&typeof database.atomic==='function'&&typeof authorize==='function','writer_contract_missing');
  demand(handlers instanceof Map,'writer_handlers_missing');
  this.database=database;this.handlers=handlers;this.authorize=authorize;this.maxPending=maxPending;this.pending=0;
  database.sqlite.exec('CREATE TABLE IF NOT EXISTS kernel511_receipts(realm TEXT NOT NULL,event_key TEXT NOT NULL,actor TEXT NOT NULL,kind TEXT NOT NULL,digest TEXT NOT NULL,response TEXT NOT NULL,committed_ms INTEGER NOT NULL,PRIMARY KEY(realm,event_key)) WITHOUT ROWID');
  this.read=database.sqlite.prepare('SELECT actor,kind,digest,response FROM kernel511_receipts WHERE realm=? AND event_key=?');
  this.insert=database.sqlite.prepare('INSERT INTO kernel511_receipts(realm,event_key,actor,kind,digest,response,committed_ms) VALUES(?,?,?,?,?,?,?)');
 }
 async submit(peer,event) {
  demand(this.pending<this.maxPending,'writer_backpressure');
  demand(event&&typeof event.realm==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(event.realm),'invalid_event_realm');
  demand(typeof event.key==='string'&&/^[A-Za-z0-9:_.-]{1,240}$/.test(event.key),'invalid_event_key');
  demand(typeof event.actor==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(event.actor),'invalid_event_actor');
  demand(typeof event.kind==='string'&&this.handlers.has(event.kind),'unregistered_economy_rule');
  const serialized=canonical(event.payload);demand(Buffer.byteLength(serialized)<=262144,'event_too_large');
  // Transport owner epoch/incarnation is checked independently, not included
  // in the semantic digest: the same event can be queried after writer restart.
  const digest=eventDigest({actor:event.actor,kind:event.kind,payload:event.payload});
  this.pending++;
  try {
   return await this.database.atomic(sqlite=>{
    const auth=this.authorize(sqlite,peer,event);
    demand(auth===true,'economy_owner_or_test_scope_rejected');
    const prior=this.read.get(event.realm,event.key);
    if(prior) {
     demand(prior.actor===event.actor&&prior.kind===event.kind&&prior.digest===digest,'economy_key_reused');
     return {key:event.key,result:JSON.parse(prior.response),replayed:true};
    }
    const result=this.handlers.get(event.kind)(sqlite,event.payload,{actor:event.actor,peer,key:event.key,realm:event.realm});
    demand(!result?.then,'async_economy_handler_forbidden');
    const response=canonical(result);demand(Buffer.byteLength(response)<=262144,'economy_reply_too_large');
    this.insert.run(event.realm,event.key,event.actor,event.kind,digest,response,Date.now());
    return {key:event.key,result,replayed:false};
   });
  } finally { this.pending--; }
 }
}
