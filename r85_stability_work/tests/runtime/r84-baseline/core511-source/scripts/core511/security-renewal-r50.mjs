import {deliverSessionR53} from './control-batch-r53.mjs';
import {CAPACITY,CHANNELS} from './contract.mjs';

export const securityRenewalR50=process.env.CORE511_SECURITY_RENEWAL!=='0';

// Signed unchanged security renewals cannot wait behind a durable gameplay
// freeze. This lane never writes SQL, changes ownership or extends native TTLs.
// Full authentication, repair and retirement retain their original cold gate.
export class SignedSecurityRenewal {
 constructor(core){this.core=core;this.pending=new Map();}
 current(id,s,base){
  const c=this.core,now=c.clock(),owner=c.authority.owner(id),admission=c.authority.admission(id),row=c.processes.get(s.identity.channel);
  if(s.identity.realm!==c.realmId||s.session.player?.id!==id||s.session.account?.id!==s.identity.account||s.session.tokenHash!==s.identity.session||s.session.securityVersion!==s.identity.securityVersion)return null;
  if(base.actor!==id||base.account!==s.identity.account||base.session!==s.identity.session||base.channel!==s.identity.channel||base.incarnation!==s.identity.boot||base.securityVersion!==s.identity.securityVersion)return null;
  if(c.closed||c.stopping||c.sessions.get(id)!==s||s.security!==base||s.disconnectedAt!==null||c.transitions.has(id)||!c.securityCurrent(id,s.identity.epoch)||!owner||owner.state!=='active'||owner.epoch!==s.identity.epoch||owner.channel!==s.identity.channel||owner.incarnation!==s.identity.boot||admission?.session_id!==s.identity.session||admission.epoch!==owner.epoch||admission.channel!==owner.channel||!row?.online||row.peer.incarnation!==owner.incarnation)return null;
  if(c.realm?.role!=='game'||c.realm.realm?.status!=='open'||c.realm.policy?.status!=='open')return null;
  const persisted=(this.read??=c.database.sqlite.prepare(`SELECT s.account_id,s.security_version,s.expires_at,
   a.security_version AS account_version,a.permanently_banned,a.suspended_until_ms,
   p.id AS player_id,p.channel,p.area,g.instance_id,g.token_hash AS presence_token,g.expires_at_ms,
   b.due_ms FROM auth_sessions s JOIN accounts a ON a.id=s.account_id
   JOIN players p ON p.account_id=a.id JOIN game_presence g ON g.account_id=a.id
   JOIN bot_due b ON b.account_id=a.id WHERE s.token_hash=?`)).get(s.identity.session);
  if(!persisted||persisted.account_id!==s.identity.account||persisted.player_id!==id||persisted.channel!==owner.channel||persisted.security_version!==s.identity.securityVersion||persisted.account_version!==s.identity.securityVersion||persisted.permanently_banned||persisted.suspended_until_ms>now||persisted.expires_at*1000!==base.sessionExpiresMs||persisted.expires_at*1000<=now||persisted.instance_id!==s.session.gamePresence?.instanceId||persisted.presence_token!==s.identity.session||persisted.due_ms!==base.botDueMs)return null;
  // CAPTCHA keeps gameplay denied by the unchanged botDueMs mirror. It must
  // not prevent renewal of an otherwise valid account transport security TTL.
  const session={...s.session,gamePresence:{...s.session.gamePresence,expiresAtMs:persisted.expires_at_ms}},presence=c.presence.augment(session).gamePresence;
  if(!presence||presence.expiresAtMs<=now)return null;
  return row;
 }
 refresh(){
  const c=this.core,gate=c.realm?.security;
  if(c.closed||c.stopping||c.realm?.role!=='game'||!gate)return;
  // Hard bound: four channels x25 admitted actors, one native single-flight job
  // each. A denied actor awaiting durable retirement cannot block other actors.
  let count=0;
  for(const [id,s]of c.sessions){
   if(count++>=CAPACITY*CHANNELS.length)break;
   const base=s.security;
   if(this.pending.has(id)||base.securityValidUntil-c.clock()>20000||!this.current(id,s,base))continue;
   const job=this.renew(id,s,base,gate);this.pending.set(id,job);
   void job.catch(error=>{if(!c.closed&&!c.stopping)c.onFault({actor:id,error,authentication:true,securityRenewal:true});}).finally(()=>{if(this.pending.get(id)===job)this.pending.delete(id);});
  }
 }
 async renew(id,s,base,gate){
  const c=this.core;
  await gate.refresh(s.identity.account);
  if(c.closed||c.stopping||c.realm?.security!==gate||c.sessions.get(id)!==s)return;
  if(!gate.allows(s.identity.account,s.identity.securityVersion)){await c.revoke({actor:id});return;}
  const row=this.current(id,s,base);if(!row)return;
  const entry=gate.entries.get(s.identity.account);
  if(!entry||entry.validUntil<=base.securityValidUntil)return;
  // No await between final proof, revision allocation and control enqueue.
  // Native gate owns absolute expiry: request start +at most30s, never ACK time.
  const security={...base,revision:c.nextRevision(id),securityValidUntil:entry.validUntil};
  s.security=security;
  try{await deliverSessionR53(row.control,security);}
  catch(error){if(c.sessions.get(id)===s&&s.security===security)await c.revoke({actor:id});throw error;}
 }
 invalidate(accountId,state){
  const c=this.core;
  // Only the native gate's validated response hook calls this. Its original
  // durable version/ban transaction still runs; revoke ACK never delays it.
  for(const [id,s]of c.sessions)if(s.identity.account===accountId&&(state.blocked||state.securityVersion!==s.identity.securityVersion)){
   void c.revoke({actor:id}).catch(error=>c.onFault({actor:id,error,authentication:true,securityRenewal:true}));
  }
 }
}
