import {demand} from './contract.mjs';

export function captureReturnSessions(core){
 return new Map([...core.sessions].map(([id,s])=>[id,{...s,session:core.presence.augment(s.session),presence:{...core.presence.entries.get(id)}}]));
}

export async function rehomeWorldActors(core,held,moves,saved,{exportMethod='global_export',admitMethod='global_admit'}={}){
 demand(Array.isArray(moves)&&moves.length<=512,'global_return_plan');
 if(!moves.length)return;
 const rates=new Map();
 core.writer.refreshOwners();
 // Export the entire group first: a full-channel swap must not transiently
 // need a 26th resident slot, even though both durable counts are already 25.
 await Promise.all(moves.map(async move=>{
  const source=held.channels.find(r=>r.peer.channel===move.source.channel&&r.peer.incarnation===move.source.incarnation),frozen=source?.ack.actors.find(a=>a.id===move.id&&a.epoch===move.source.epoch);
  demand(frozen,'global_return_source_fenced');rates.set(move.id,frozen.rates);
  const ack=await source.control.request(exportMethod,{token:held.token,...move});demand(ack?.token===held.token&&ack.id===move.id&&ack.exported,'global_export_ack');
 }));
 for(const move of moves){
  const owner=core.authority.owner(move.id),prior=saved.get(move.id);demand(owner?.channel===move.target.channel&&owner.incarnation===move.target.incarnation&&owner.epoch===move.target.epoch,'global_return_target_fenced');
  core.writer.presence.forget(move.id);core.presence.revoke({actor:move.id});core.sessions.delete(move.id);
  if(move.retired)continue;
  if(move.passive){
   const bundle=await core.load(move.id),identity={actor:move.id,account:bundle.player.account_id,session:'simulation:'+core.authority.simulation(move.id).run_id,epoch:owner.epoch,channel:owner.channel,boot:owner.incarnation,realm:core.realmId};
   const ack=await core.process(owner).control.request(admitMethod,{bundle,identity,frozen:{token:held.token}});demand(ack?.token===held.token&&ack.epoch===owner.epoch&&ack.admitted,'global_admit_ack');
  }else{
   demand(prior?.identity.epoch===move.source.epoch&&prior.identity.boot===move.source.incarnation,'global_return_session_fenced');
   const next=await core.install(prior.session,owner,prior.request,{method:admitMethod,frozen:{token:held.token},rates:rates.get(move.id),securityUntil:prior.security.securityValidUntil});
   next.disconnectedAt=prior.disconnectedAt??core.clock();
   if(prior.presence.lastAt&&core.clock()-prior.presence.lastAt<40000&&core.securityCurrent(move.id,owner.epoch))core.presence.seen(core.process(owner).peer,next.identity,prior.presence.lastAt);
   core.presence.disconnect(core.process(owner).peer,next.identity);
  }
 }
}
