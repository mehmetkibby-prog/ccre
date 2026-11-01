import {AsyncLocalStorage} from 'node:async_hooks';
import {RealmSecurityGate} from '../../../native510-bb3a6cc689c6/vds-server/src/realm-security-gate.mjs';
import {RealmSecurityQueue} from './realm-security-queue.mjs';
import {demand} from './contract.mjs';

export class NativeRealmSecurity {
 #jobs=new AsyncLocalStorage();
 #gates=new Map();
 #retired=new WeakMap();
 constructor(core){this.core=core;this.queue=new RealmSecurityQueue(core);this.closed=false;}
 inCoordinator(operation){return this.queue.inCoordinator(operation);}
 assertBound(){const c=this.core;demand(!this.closed&&!c.closed&&c.database.core511RealmSecurity===this,'native_realm_security_binding');return c;}
 bindGate(gate){
  this.assertBound();if(this.#gates.has(gate))return gate;
  demand(gate instanceof RealmSecurityGate&&gate.pending.size===0,'native_realm_security_gate');
  const before=new Map(['authorize','applySecurity'].map(k=>[k,Object.getOwnPropertyDescriptor(gate,k)])),authorize=gate.authorize.bind(gate),apply=gate.applySecurity.bind(gate);this.#gates.set(gate,before);
  // The original gate still owns network validation, generations, expiry,
  // single-flight promises and early invalidation. Preserve its boolean fast
  // path, and mark only the exact original pending job that calls its mirror.
  gate.authorize=(id,version)=>this.queue.authorize(gate,id,()=>authorize(id,version));
  gate.applySecurity=(accountId,state)=>{this.core.securityRenewal?.invalidate(accountId,state);return this.#jobs.run({gate,accountId,state},()=>apply(accountId,state));};return gate;
 }
 async settleRefresh(accountId){
  const c=this.assertBound(),gate=c.realm?.security;if(!gate)return false;
  const pending=gate.pending?.get(accountId),entry=gate.entries?.get(accountId);
  // The native <10s background threshold has no scheduling headroom when
  // mirrored on a 10s coordinator scan. Obtain a fresh signed result within
  // two scan intervals; never extend a cached expiry or the native 30s lease.
  if(!pending&&entry&&entry.validUntil-c.clock()>20000)return false;
  demand(this.#gates.has(gate),'native_realm_security_gate');
  // Native authorize may return its still-valid cached boolean while starting
  // a signed refresh. Periodic mirror publication must await that exact job.
  // Use the existing waiter promotion so a changed/blocked response can drain
  // and retire this actor without waiting behind its own coordinator task.
  await this.queue.authorize(gate,accountId,()=>pending??gate.refresh(accountId));return true;
 }
 batch(statements,accountId,state){
  const c=this.assertBound(),db=c.database;
  demand(typeof accountId==='string'&&accountId.length>0&&accountId.length<=160&&Number.isSafeInteger(state?.securityVersion)&&typeof state.blocked==='boolean'&&Array.isArray(statements)&&statements.length===3&&statements.every(s=>s?.database===db),'native_realm_security_batch_scope');
  const job=this.#jobs.getStore(),operation=()=>this.execute(statements,accountId);
  if(job){demand(job.accountId===accountId&&job.state===state&&this.#gates.has(job.gate),'native_realm_security_job_scope');return this.queue.run(job.gate,accountId,operation);}
  return c.serial(operation);
 }
 async execute(statements,accountId){
  const c=this.assertBound(),db=c.database,sql=db.sqlite,players=sql.prepare('SELECT id FROM players WHERE account_id=?').all(accountId);demand(players.length<=1,'native_realm_security_account_scope');let result;
  const execute=inside=>{demand(inside===sql&&inside.isTransaction,'native_realm_security_atomic');result=statements.map(s=>db.execute(s));};
  const id=players[0]?.id,admission=id?c.authority.admission(id):null;
  if(!id)await db.atomic(execute);
  else if(!admission)await c.permanent.durablePlayers([id],()=>db.atomic(execute));
  else{
   const cold=c.nativeGuildAuth.coldOwner(id);
   if(cold){
    try{
     const retired=await c.writer.logout(id,cold.row.peer,{epoch:cold.owner.epoch,sessionId:admission.session_id,finalSequence:0,complete:execute});await c.writer.durableExternal();
     const current=c.authority.owner(id);demand(retired.loggedOut&&current?.epoch===retired.epoch&&current.incarnation===cold.owner.incarnation&&!c.authority.admission(id)&&c.channelSupervisor.rows.get(cold.owner.channel)===cold.row&&cold.row.ready&&cold.row.state==='booting'&&!cold.row.exited,'native_realm_security_cold_retirement');
     this.#retired.set(cold.recoveryOwner,{result:retired,incarnation:current.incarnation,epoch:current.epoch});
    }catch(cause){throw Object.assign(new Error('native_realm_security_cold_uncertain',{cause}),{code:'native_realm_security_cold_uncertain'});}
   }else{
    const prior=c.sessions.get(id)?.session;demand(prior?.account.id===accountId&&prior.tokenHash===admission.session_id,'native_realm_security_owner_missing');
    await c.logoutActor(id,admission.session_id,{complete:execute});
   }
  }
  demand(Array.isArray(result),'native_realm_security_commit_missing');return result;
 }
 takeRetirement(owner){
  const proof=this.#retired.get(owner);if(!proof)return null;const c=this.assertBound(),current=c.authority.owner(owner.player_id);
  demand(!c.authority.admission(owner.player_id)&&current?.incarnation===proof.incarnation&&current.epoch===proof.epoch,'native_realm_security_retirement_changed');this.#retired.delete(owner);return proof.result;
 }
 close(){this.closed=true;for(const [gate,before]of this.#gates)for(const [key,descriptor]of before){if(descriptor)Object.defineProperty(gate,key,descriptor);else delete gate[key];}this.#gates.clear();}
}
