import {PROTOCOL} from './contract.mjs';

// Publish already committed public action results independently of the 20 Hz
// simulation/projection clock. This never advances AI, movement, damage or RNG.
// Private durable receipts and pending/rejected-unknown outcomes stay on their
// original paths. Settled results remain available for exact reconnect replay.
export function queueCommittedRepliesR113(kernel){
 if(!kernel.commitRepliesR113||kernel.stopped||kernel.failure||kernel.commitReplyScheduledR113)return;
 kernel.commitReplyScheduledR113=true;
 setImmediate(()=>{
  kernel.commitReplyScheduledR113=false;
  if(kernel.stopped||kernel.failure)return;
  if(kernel.running||kernel.flushing){kernel.commitReplyDeferredR113=true;return;}
  kernel.commitReplyDeferredR113=false;
  for(const [id,p]of kernel.players){
   if(p.passive||p.suspended||p.quiescer||!p.accepting||!p.results.length)continue;
   const results=p.results.filter(r=>r.type==='action');if(!results.length)continue;
   p.results=p.results.filter(r=>r.type!=='action');
   // Keep ownership transfer waiting until its actual socket enqueue completes.
   p.replyPendingR113=(p.replyPendingR113??0)+1;
   try{
    const sent=kernel.send(id,{type:'frame',protocol:PROTOCOL,results,lastApplied:p.lastApplied});
    kernel.metrics.messages++;kernel.metrics.committedReplyFramesR113=(kernel.metrics.committedReplyFramesR113??0)+1;
    Promise.resolve(sent).then(()=>{p.replyPendingR113--;if(!kernel.running&&!kernel.flushing&&!kernel.failure)kernel.finishQuiescing();},e=>kernel.fail(e));
   }catch(error){kernel.fail(error);return;}
  }
 });
}
