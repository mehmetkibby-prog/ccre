import {randomUUID} from 'node:crypto';
import {retiredActorIsolation} from './r48_2-options.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {groupRejectionCoversR531} from './group-rejection-r531.mjs';
import {demand} from './contract.mjs';
import {createFaultReporter} from './fence-diagnostics.mjs';
const report=createFaultReporter(text=>process.stderr.write(text));

// A known rollback stops one resident immediately. A parent retirement is
// requested only after every already-started actor writer/group has settled.
// This never flushes the conflicting base back to storage or retries an action.
export class ActorQuarantine {
 constructor(channel,{stop=()=>{},idle=async()=>{},isolate}){Object.assign(this,{channel,stop,idle,isolate});this.entries=new Map();this.completed=new Map();}
 reject(id,error){
  const c=this.channel,rejection=actorRejection(error),owner=c.owners.get(id),p=c.kernel.players.get(id),existing=this.entries.get(id);
  demand(rejection?.actor===id&&rejection.epoch===owner?.epoch&&p?.epoch===owner.epoch,'actor_quarantine_proof');
  if(existing){demand(existing.epoch===owner.epoch,'actor_quarantine_epoch');return existing.ready;}
  const entry={id,epoch:owner.epoch,token:randomUUID(),error,ready:null,proof:null};this.entries.set(id,entry);
  p.accepting=false;p.suspended=true;this.stop(id,error);
  // These inputs have not run; the closed socket receives no success ACK.
  p.queue.length=0;p.results.length=0;
  if(p.quiescer){
   const waiter=p.quiescer;
   // A group readiness check must stop waiting for the rejected actor. Keep
   // the other members' own promises intact so they can finish their freeze.
   if(waiter.group){const index=waiter.group.findIndex(row=>row.p===p);demand(index>=0,'actor_quarantine_group');waiter.group.splice(index,1);}
   p.quiescer=null;waiter.reject(error);
  }
  report({actor:id,channel:c.peer.channel,incarnation:c.peer.incarnation,error});
  entry.ready=Promise.resolve().then(async()=>{
   const tasks=[p.barrier,c.writer.pending.get(id),c.checkpoints.entries.get(id)?.pending].filter(Boolean);
   for(const task of tasks)try{await task;}catch(e){const r=actorRejection(e);if((!r||r.actor!==id||r.epoch!==entry.epoch)&&!groupRejectionCoversR531(task,e,id,entry.epoch))throw e;}
   await this.idle(id,error);
   // A cold freeze owns its lane while drain() rejects. Its rejection handler
   // releases that proven-aborted lease; wait for that handler, never steal it.
   await c.lanes.available(['player:'+id]);
   // Accepted damage/participation belongs to the channel journal, not this
   // actor's writer queue. Persist it while the old admission still exists;
   // retirement first would make its later system checkpoint fail ownership.
   // A failed/unknown durable acknowledgement never grants a stopped proof.
   if(retiredActorIsolation)await c.combatCheckpoints.drain();
   const local=c.state.owners.get(id);
   demand(c.kernel.players.get(id)===p&&c.owners.get(id)===owner&&local?.epoch===entry.epoch&&!p.barrier&&!p.externalHold&&local.pending===0&&!c.lanes.busy(['player:'+id]),'actor_quarantine_not_drained');
   p.results.length=0;p.deferred.length=0;c.state.freeze(id,entry.epoch);
   const identity=c.identities.get(id),proof={actor:id,epoch:entry.epoch,token:entry.token,session:identity?.session??null,stopped:true,finalSequence:c.writer.finalSequence(id),reason:error.code};
   entry.proof=proof;await this.isolate(proof);return proof;
  });
  // Retain the bounded actor fence if proof cannot be obtained. An unknown
  // write is never converted to no-execute and no new owner is authorized.
  void entry.ready.catch(e=>report({actor:id,channel:c.peer.channel,error:e}));return entry.ready;
 }
 detach({actor,epoch,token}){
  const done=this.completed.get(token);if(done){demand(done.actor===actor&&done.epoch===epoch,'actor_quarantine_token_reused');return done;}
  const entry=this.entries.get(actor),c=this.channel,p=c.kernel.players.get(actor);
  demand(entry?.epoch===epoch&&entry.token===token&&entry.proof&&p?.epoch===epoch&&p.suspended&&!p.barrier&&!p.queue.length&&!p.externalHold&&!c.writer.pending.has(actor)&&!c.lanes.busy(['player:'+actor]),'actor_quarantine_detach_fenced');
  c.detach(actor);this.entries.delete(actor);const ack={actor,epoch,token,detached:true};this.completed.set(token,ack);if(this.completed.size>256)this.completed.delete(this.completed.keys().next().value);return ack;
 }
}
