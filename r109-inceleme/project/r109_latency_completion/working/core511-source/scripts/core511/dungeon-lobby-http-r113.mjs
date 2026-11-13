import {PROTOCOL,demand} from './contract.mjs';

const states=new WeakMap();
// This is a query-only presentation request. It never acquires an actor's
// simulation lease or joins the combat input sequence. A slow reader must not
// stall movement/attacks. Native session/realm/presence/CSRF guards still run.
export async function dungeonLobbyHttpR113(core,request){
 const headers={'cache-control':'no-store'};
 if(request.method!=='POST')return Response.json({code:'method_not_allowed'},{status:405,headers:{...headers,allow:'POST'}});
 try{
  const auth=await core.authenticate(request),input=await core.auth.rules.readJsonObject(request,512);
  if(input.protocol!==PROTOCOL||Object.keys(input).some(k=>!['protocol','epoch','channel'].includes(k)))return Response.json({code:'dungeon_lobby_parameters'},{status:400,headers});
  const id=auth?.player?.id,s=core.sessions.get(id),owner=core.authority.owner(id);
  const current=session=>session?.player?.id===id&&session.tokenHash===auth.tokenHash&&core.sessions.get(id)===s&&s?.identity.session===auth.tokenHash&&owner?.state==='active'&&owner.channel===input.channel&&owner.epoch===input.epoch&&s.identity.boot===owner.incarnation&&s.identity.epoch===owner.epoch;
  demand(current(auth),'dungeon_lobby_owner_fenced');
  const row=core.process(owner),peer=row.peer;
  core.authority.assertAdmitted(core.database.sqlite,peer,id,owner.epoch);
  let state=states.get(core);if(!state){state={pending:new Map(),last:new Map()};states.set(core,state);}
  const now=core.clock(),last=state.last.get(id);
  if(state.pending.has(id)||last!==undefined&&now-last<500)return Response.json({code:'dungeon_lobby_busy',retryAfter:1},{status:429,headers:{...headers,'retry-after':'1'}});
  state.last.delete(id);state.last.set(id,now);if(state.last.size>512)state.last.delete(state.last.keys().next().value);
  const task=core.reader.query('kernel511_dungeon_lobby_r113',{actor:id,epoch:owner.epoch,channel:owner.channel,incarnation:owner.incarnation,nowMs:now});
  state.pending.set(id,task);
  try{
   const {rows:answer}=await task;
   const local=await row.control.request('dungeon_lobby_state_r113',{actor:id,epoch:owner.epoch});
   // Logout/transfer/maintenance can complete while the WAL reader is working.
   // Revalidate, without replaying or mutating any game command.
   const after=await core.authenticate(request);
   demand(current(after)&&core.process(peer)===row,'dungeon_lobby_owner_fenced');
   core.authority.assertAdmitted(core.database.sqlite,peer,id,owner.epoch);
   if(local.resident)return Response.json({code:'dungeon_lobby_has_room',resident:true},{status:409,headers});
   demand(answer?.version===1&&answer.actor===id&&answer.epoch===owner.epoch&&answer.channel===owner.channel&&answer.incarnation===owner.incarnation&&answer.body?.run===null,'dungeon_lobby_reply_scope');
   return Response.json({protocol:PROTOCOL,epoch:owner.epoch,channel:owner.channel,body:{...answer.body,notice:local.notice}},{headers});
  }finally{if(state.pending.get(id)===task)state.pending.delete(id);}
 }catch(error){
  if(core.auth.rules.AuthRequestError&&error instanceof core.auth.rules.AuthRequestError)return core.auth.error(error);
  // An already active room must still use its authoritative resident state.
  if(error.code==='dungeon_lobby_has_room')return Response.json({code:error.code,resident:true},{status:409,headers});
  return Response.json({code:error.code??'dungeon_read_unavailable_r113',error:'Zindan bilgisi alınamadı. Tekrar dene.'},{status:503,headers});
 }
}
