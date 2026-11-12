import {demand} from './contract.mjs';
import {egressPacingR531} from './r531-options.mjs';
import {r35Options} from './r35-options.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {createFaultReporter} from './fence-diagnostics.mjs';
import {consumeTransportNotSent} from './transport-not-sent.mjs';
const reportMailboxFault=createFaultReporter(text=>process.stderr.write(text));
const deferredReadErrors=new Set(['ipc_backpressure','ipc_frame_size','ipc_outcome_unknown','read_worker_timeout','read_worker_failed','read_worker_closed']);
const ackTransportFailures=new WeakSet();
export const mailboxAckTransportFailure=error=>actorFaultIsolation&&ackTransportFailures.has(error);

// Database-backed notification delivery over the already authenticated IPC
// and game sockets. A lost socket/send/ACK never deletes a pending row. A new
// connection drains the same mailbox; the browser deduplicates stable IDs.
const staleOwner=error=>error?.code==='owner_epoch_fenced'||error?.code==='simulation_epoch_fenced';
export class ChannelMailbox {
 constructor({request,send,identity,canSend=()=>true,onFault=()=>{}}){for(const f of [request,send,identity])demand(typeof f==='function','mailbox_dependencies');Object.assign(this,{request,send,identity,canSend,onFault});this.pending=new Map();this.delivered=new Map();this.again=new Set();this.holds=new Map();this.acknowledging=new Map();this.deferredAcks=new Map();this.dirty=new Set();this.more=new Set();this.timer=null;}
 held(actor){for(const ids of this.holds.values())if(ids.has(actor))return true;return false;}
 async hold(token,actors){
  demand(typeof token==='string'&&Array.isArray(actors),'mailbox_hold_scope');const ids=this.holds.get(token)??new Set();for(const actor of actors)ids.add(actor);this.holds.set(token,ids);
  await Promise.all([...ids].flatMap(id=>[this.pending.get(id),...(this.acknowledging.get(id)??[])]).filter(Boolean));return {held:true};
 }
 resume(token){
  const actors=this.holds.get(token);demand(actors,'mailbox_hold_missing');this.holds.delete(token);
  for(const actor of actors){if(this.held(actor))continue;const queued=this.deferredAcks.get(actor);this.deferredAcks.delete(actor);const ids=queued?.identity===this.identity(actor)?[...queued.ids].filter(id=>this.delivered.get(actor)?.has(id)):[];
   void(async()=>{if(ids.length)await this.acknowledge(queued.identity,ids);await this.flush(actor);})().catch(error=>{if(mailboxAckTransportFailure(error)){reportMailboxFault({actor,error});return;}this.onFault(error);});
  }
 }
 retire(token){
  const actors=this.holds.get(token);demand(actors,'mailbox_hold_missing');this.holds.delete(token);
  // The socket may not have emitted close yet. Never flush its old epoch
  // while detach/rebind is retiring it; unacknowledged IDs stay in SQLite.
  for(const actor of actors)this.disconnected(actor);
 }
 connected(identity){this.delivered.delete(identity.actor);this.cursors?.delete(identity.actor);return this.flush(identity.actor);}
 async flush(actor){
  if(this.held(actor))return;
  if(this.pending.has(actor)){this.again.add(actor);return this.pending.get(actor);}
  const identity=this.identity(actor);if(!identity)return;if(!this.canSend(actor)){this.changed([actor]);return;}
  const task=(async()=>{
   // R22: a logout/transfer can commit before this channel's detach arrives;
   // the old epoch is then fenced. Its unacknowledged rows stay in SQLite for
   // the next session, so this is not a channel failure.
   let messages,cursor,more;try{const value=await this.request('notification_pending',{actor,epoch:identity.epoch,...(r35Options.outboxV2?{cursor:this.cursors?.get(actor)??null}:{})});if(Array.isArray(value))messages=value;else({messages,cursor,more}=value);}catch(error){if(staleOwner(error))return;if(actorFaultIsolation&&deferredReadErrors.has(error?.code)){reportMailboxFault({actor,error});return;}throw error;}
   if(this.identity(actor)!==identity)return;
   if(more??messages.length===32)this.more.add(actor);else this.more.delete(actor);
   let sent=this.delivered.get(actor);if(!sent){sent=new Set();this.delivered.set(actor,sent);}
   for(const message of messages){if(sent.has(message.id))continue;if(!this.send(actor,{type:'event',...message})){if(egressPacingR531){this.changed([actor]);return;}break;}sent.add(message.id);}
   if(cursor!==undefined){this.cursors??=new Map();this.cursors.set(actor,cursor);}
  })();this.pending.set(actor,task);
  try{await task;}finally{if(this.pending.get(actor)===task)this.pending.delete(actor);if(this.again.delete(actor))this.changed([actor]);}
 }
 async acknowledge(identity,ids){
  demand(this.identity(identity.actor)===identity,'mailbox_session_changed');
  const sent=this.delivered.get(identity.actor);demand(ids.every(id=>sent?.has(id)),'mailbox_unsent_ack');
  if(this.held(identity.actor)){let row=this.deferredAcks.get(identity.actor);if(row?.identity!==identity){row={identity,ids:new Set()};this.deferredAcks.set(identity.actor,row);}for(const id of ids)row.ids.add(id);return;}
  const task=Promise.resolve().then(()=>r35Options.outboxV2?this.queueAck(identity,ids):this.requestAck('notification_ack',{actor:identity.actor,epoch:identity.epoch,ids})).catch(error=>{if(!staleOwner(error))throw error;}),pending=this.acknowledging.get(identity.actor)??new Set();pending.add(task);this.acknowledging.set(identity.actor,pending);
  try{await task;}finally{pending.delete(task);if(!pending.size)this.acknowledging.delete(identity.actor);}
  if(this.identity(identity.actor)!==identity)return;
  for(const id of ids)sent.delete(id);if(this.more.has(identity.actor))await this.flush(identity.actor);
 }
 async requestAck(method,payload){
  try{return await this.request(method,payload);}catch(error){
   // A failed notification ACK never confirms delivery and never clears the
   // local delivered set/cursor. An uncertain ACK may already have committed;
   // reconnect reads SQLite again, without replaying any gameplay command.
   if(actorFaultIsolation&&(error?.code==='ipc_backpressure'&&consumeTransportNotSent(error,method,payload)||['ipc_outcome_unknown','ipc_closed'].includes(error?.code)))ackTransportFailures.add(error);
   throw error;
  }
 }
 queueAck(identity,ids){
  this.ackQueue??=[];
  return new Promise((resolve,reject)=>{
   this.ackQueue.push({identity,ids,resolve,reject});
   if(this.ackScheduled)return;this.ackScheduled=true;
   setImmediate(()=>{this.ackScheduled=false;const rows=this.ackQueue.splice(0);void(async()=>{
    for(let at=0;at<rows.length;at+=25){const batch=rows.slice(at,at+25);try{await this.requestAck('notification_ack_batch',batch.map(({identity,ids})=>({actor:identity.actor,epoch:identity.epoch,ids})));for(const row of batch)row.resolve();}catch(error){for(const row of batch)row.reject(error);}}
   })();});
  });
 }
 // Coalesce only presentation wake-ups on the native50ms cadence. Every event
 // and recipient remains in the same atomic durable outbox; native result ACK
 // never waits for these repeated read-only mailbox scans.
 changed(actors){for(const id of actors)this.dirty.add(id);if(this.timer||!this.dirty.size)return;this.timer=setTimeout(()=>{this.timer=null;const ids=[...this.dirty];this.dirty.clear();for(const id of ids)void this.flush(id).catch(this.onFault);},50);this.timer.unref?.();}
 disconnected(actor){this.delivered.delete(actor);this.cursors?.delete(actor);this.deferredAcks.delete(actor);this.dirty.delete(actor);this.more.delete(actor);}
 close(){clearTimeout(this.timer);this.timer=null;this.dirty.clear();}
}
