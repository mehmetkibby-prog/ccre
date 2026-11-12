import {recoveryCause} from './recovery-diagnostics-r532.mjs';
import {demand} from './contract.mjs';

// CAPTCHA metadata belongs to the native account service. It does not write
// gameplay state or freeze an actor. Its native synchronous SQL runs on the
// sole durable writer, then any changed deadline reaches the current owner.
export class NativeBotCheck {
 constructor(core){this.core=core;}
 assertBound(service){const c=this.core;demand(!c.closed&&c.database.core511BotCheck===this&&service===c.bot,'native_bot_binding');return c;}
 async statusR106(session,reauthorize,service){
  this.assertBound(service);let prepared;
  // Both inspections run through the original authorization, durable writer and
  // channel ACK path. The worker wait holds neither the writer nor c.serial.
  for(let attempt=0;attempt<3;attempt++){
   const result=await this.call(session,reauthorize,service,()=>{
    const id=session.account.id,required=service.required(id),dueAt=service.deadline(id);
    if(!required)return {required:false,dueAt};
    const current=service.existingChallengeR106(id,'game');
    if(current)return {required:true,dueAt,...current};
    if(prepared)return {required:true,dueAt,...service.challenge(id,'game',{prepared})};
    return null;
   });
   if(result)return result;
   prepared=await service.prepareChallengeR106(session.account.id,'game');
  }
  throw Error('captcha_prepare_unavailable');
 }
 call(session,reauthorize,service,operation){
  const c=this.assertBound(service);demand(session?.account?.id&&typeof reauthorize==='function'&&typeof operation==='function'&&operation.constructor?.name!=='AsyncFunction','native_bot_scope');
  return c.serial(async()=>{
   this.assertBound(service);const current=await reauthorize();
   demand(current?.account?.id===session.account.id&&current.player?.id===session.player?.id&&current.tokenHash===session.tokenHash,'native_bot_session_changed');
   // A wrong answer returns false inside the transaction: the original
   // attempt increment must commit even though the HTTP route returns 400.
   const value=await c.database.atomic(operation);
   await this.refresh(current.account.id);return value;
  });
 }
 async deliver(row,method,payload){
  const c=this.core;
  try{const ack=await row.control.request(method,payload);c.process(row.peer);demand(method==='session'?ack?.revision===payload.revision:ack?.revoked===true,'native_bot_session_ack');}
  catch(error){
   // An unknown reply cannot leave an older authorization mirror running.
   // Recovery is allowed only after this exact process has actually exited.
   if(row.online&&c.processes.get(row.peer.channel)===row){
    const child=c.channelSupervisor?.rows.get(row.peer.channel);
    if(child?.peer.incarnation===row.peer.incarnation)await c.channelSupervisor.terminate(child,{cause:recoveryCause(c,{error,channel:row.peer.channel,requestMethod:method,actor:payload.actor},'native-bot-check')});
    c.onFault({error,channel:row.peer.channel,incarnation:row.peer.incarnation,bot:true});
   }throw error;
  }
 }
 async refresh(account){
  const c=this.core,players=c.database.sqlite.prepare('SELECT id FROM players WHERE account_id=?').all(account);demand(players.length<=1,'native_bot_account_player');
  const id=players[0]?.id,s=id&&c.sessions.get(id),owner=id&&c.authority.owner(id),admission=id&&c.authority.admission(id);
  if(!s||!owner||!admission)return;
  demand(s.identity.account===account&&s.identity.epoch===owner.epoch&&s.identity.session===admission.session_id&&!c.transitions.has(id),'native_bot_owner_fenced');
  const due=c.database.sqlite.prepare('SELECT due_ms FROM bot_due WHERE account_id=?').get(account)?.due_ms;
  if(due===s.security.botDueMs)return;
  const stillCurrent=()=>c.sessions.get(id)===s&&c.authority.owner(id)?.epoch===owner.epoch&&c.authority.admission(id)?.session_id===s.identity.session;
  let session;
  try{session=await c.authenticate(s.request,{csrf:false,tokenHash:s.identity.session,residentChallenge:true});}
  catch(error){
   // Verification is account-scoped, but another login must not lend its
   // authorization to the admitted session. Revalidate that exact login.
   if(stillCurrent()){c.presence.revoke({actor:id});s.security={...s.security,blocked:true};await this.deliver(c.process(owner),'revoke',{actor:id,revision:c.nextRevision(id)});c.onFault({actor:id,error,authentication:true});}
   return;
  }
  // Native account security may retire an owner while reauthorization waits.
  if(!stillCurrent())return;
  demand(session.account.id===account&&session.player?.id===id&&session.tokenHash===admission.session_id,'native_bot_admission_session');
  const security=c.snapshot(session,owner);await this.deliver(c.process(owner),'session',security);
  demand(stillCurrent(),'native_bot_owner_changed');s.session=session;s.security=security;
 }
}
