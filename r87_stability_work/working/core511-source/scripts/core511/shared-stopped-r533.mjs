import {sharedStoppedR533} from './r533-options.mjs';

// A stopped resident grants no permission to resume or write its old memory.
// Only its parent's authenticated, drained isolation proof can replace a hold.
// The native writer still reads CURRENT DB; all claim/receipt guards remain.
export function stoppedOwnerMatchesR533(core,p,sql=core.database?.sqlite){
 if(!sharedStoppedR533||!p||typeof p.token!=='string'||typeof p.session!=='string'||typeof p.reason!=='string'||!Number.isSafeInteger(p.finalSequence)||p.stopped!==true||!['queued','retiring'].includes(p.phase)||core.actorIsolation.unknownActors.has(p.actor)||core.permanent.entries.has(p.actor)||core.transitions.has(p.actor))return false;
 const owner=core.authority.owner(p.actor,sql),admission=core.authority.admission(p.actor,sql),simulation=core.authority.simulation?.(p.actor,sql);
 if(owner?.state!=='active'||owner.channel!==p.peer.channel||owner.incarnation!==p.peer.incarnation)return false;
 if(owner.epoch===p.epoch)return owner.sequence===p.finalSequence&&(admission?admission.epoch===p.epoch&&admission.session_id===p.session:simulation?.epoch===p.epoch&&p.session==='simulation:'+simulation.run_id);
 return owner.epoch===p.epoch+1&&owner.sequence===0&&!admission&&(!simulation||simulation.epoch===owner.epoch);
}
export function captureStoppedR533(core,sourcePlayers){
 const rows=new Map();if(!sharedStoppedR533)return rows;
 for(const [id,p]of core.actorIsolation?.entries??[])if(!sourcePlayers.some(a=>a.id===id)&&stoppedOwnerMatchesR533(core,p))rows.set(id,{actor:p.actor,epoch:p.epoch,token:p.token,session:p.session,stopped:true,finalSequence:p.finalSequence,reason:p.reason,phase:p.phase,peer:{...p.peer}});
 return rows;
}
export function stoppedChannelProofR533(channel,expected){
 if(!sharedStoppedR533)return false;
 const q=channel.quarantines?.entries.get(expected.actor),p=channel.kernel.players.get(expected.actor),owner=channel.owners.get(expected.actor),proof=q?.proof;
 return Boolean(proof&&proof.actor===expected.actor&&proof.epoch===expected.epoch&&proof.token===expected.token&&proof.session===expected.session&&proof.finalSequence===expected.finalSequence&&q.epoch===expected.epoch&&owner?.epoch===expected.epoch&&p?.epoch===expected.epoch&&!p.accepting&&p.suspended&&!p.barrier&&!p.externalHold&&!p.queue.length&&!channel.writer.pending.has(expected.actor)&&!channel.lanes.busy(['player:'+expected.actor])&&channel.writer.finalSequence(expected.actor)===expected.finalSequence);
}
