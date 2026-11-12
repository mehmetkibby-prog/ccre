import {createHash} from 'node:crypto';

// Closed diagnostic vocabulary. Never copy arbitrary exception text, IDs,
// credentials, submitted payloads or central-service response bodies.
export const LOADLAB_AUTH_CODES_R12=Object.freeze([
 'loadlab_gateway_required','loadlab_lease_expired','loadlab_instance_mismatch','loadlab_auth_closed',
 'loadlab_configuration_missing','loadlab_body_already_consumed','loadlab_body_too_large',
 'loadlab_unmarked_identity','loadlab_invalid_identity','loadlab_internal_scope_changed',
 'loadlab_proof_invalid','loadlab_action_invalid','loadlab_identity_mismatch','loadlab_presence_required',
 'loadlab_request_required','loadlab_internal_source_unverified','loadlab_rate_source_unverified',
 'loadlab_rate_context_invalid','loadlab_security_refresh_failed','loadlab_security_denied',
 'loadlab_security_stale','loadlab_preparation_scope_invalid','loadlab_preparation_count_mismatch',
 'loadlab_preparation_identity_mismatch','loadlab_preparation_session_invalid',
 'loadlab_preparation_session_too_short','loadlab_preparation_bot_deadline_too_short',
 'loadlab_preparation_challenge_present','loadlab_authorization_failed',
]);
const codes=new Set(LOADLAB_AUTH_CODES_R12);
export const safeLoadLabAuthCodeR12=error=>codes.has(error?.code)?error.code:'loadlab_authorization_failed';
const deny=code=>Object.assign(Error(code),{code,status:403});
const digest=value=>createHash('sha256').update(value).digest('base64url');

function preparingScope(registry,runId,expiresAtMs,at){
 const frame=registry?.snapshot?.(),run=frame?.runs?.find(row=>row.id===runId),faults=registry?.faults?.();
 if(frame?.enabled!==true||!Number.isSafeInteger(expiresAtMs)||expiresAtMs<=at||expiresAtMs>at+960000||
   frame.windowExpiresAtMs<expiresAtMs||run?.status!=='preparing'||run.expiresAtMs!==expiresAtMs||
   !Array.isArray(faults)||faults.some(fault=>fault.runId===runId))
  throw deny('loadlab_preparation_scope_invalid');
 return run;
}

// Mirrors ordinary realm entry: obtain the current signed central decision
// before creating the marked test session. No permission or CAPTCHA exemption.
export async function prepareLoadLabAdmissionR12({registry,realm,grant,runId,expiresAtMs,now=Date.now}){
 const check=()=>{
  preparingScope(registry,runId,expiresAtMs,now());
  if(!grant?.account?.id||registry.accountRun(grant.account.id)!==runId||
    !Number.isSafeInteger(grant.account.securityVersion)||grant.account.securityVersion<1)
   throw deny('loadlab_preparation_identity_mismatch');
 };
 check();let security;
 try{security=await realm.security.refresh(grant.account.id);}catch{throw deny('loadlab_security_refresh_failed');}
 check();
 if(security?.blocked!==false||security.canPlay!==true||security.version!==grant.account.securityVersion||
   realm.policy?.status!=='open'||!realm.security.allows(grant.account.id,grant.account.securityVersion))
  throw deny('loadlab_security_denied');
}

// Called only after native HTTP proof/session/CSRF checks, for a marked test
// ticket request. Keep the normal 30 s security lifetime and all ban/version
// gates. A near-expiry record is refreshed; its lifetime is never extended here.
export async function refreshLoadLabTicketR12({identity,session,realm,isCurrent,now=Date.now}){
 if(!isCurrent())throw deny('loadlab_lease_expired');
 const security=realm?.security;
 if(!security||realm.policy?.status!=='open')throw deny('loadlab_security_denied');
 const entry=security.entries.get(identity.accountId);
 if(!entry||entry.validUntil-now()<10000){
  try{await security.refresh(identity.accountId);}catch{throw deny('loadlab_security_refresh_failed');}
 }
 if(!isCurrent())throw deny('loadlab_lease_expired');
 const current=security.entries.get(identity.accountId);
 if(!security.allows(identity.accountId,session.securityVersion))throw deny('loadlab_security_denied');
 if(!current||current.validUntil<=now())throw deny('loadlab_security_stale');
}

// Preparation-only reads. New identities must have matching durable ownership,
// ordinary sessions and CAPTCHA deadlines covering the whole authorized run.
// Failed preparation stops before ramp; nothing here changes any stored deadline.
export function auditLoadLabPreparationR12({database,registry,runId,bots,expiresAtMs,now=Date.now}){
 const at=now(),run=preparingScope(registry,runId,expiresAtMs,at),sql=database.sqlite;
 if(!Array.isArray(bots)||bots.length<1||bots.length>75||run.bots.length!==bots.length||
   sql.prepare("SELECT COUNT(*) AS n FROM loadlab_entities_v1 WHERE run_id=? AND kind='player'").get(runId).n!==bots.length||
   sql.prepare('SELECT COUNT(*) AS n FROM loadlab_sessions_v1 WHERE run_id=?').get(runId).n!==bots.length)
  throw deny('loadlab_preparation_count_mismatch');
 const read=sql.prepare(`SELECT p.id,p.account_id,p.loadlab_run_id,p.channel,p.area,p.loadlab_team,
  a.username,a.password_hash,a.security_version,a.permanently_banned,a.suspended_until_ms,
  e.run_id AS entity_run,e.account_id AS entity_account,
  l.run_id AS session_run,l.account_id AS session_account,l.player_id AS session_player,l.csrf_hash AS lab_csrf,l.expires_ms,
  s.account_id AS auth_account,s.csrf_hash AS auth_csrf,s.security_version AS session_security,s.expires_at,
  d.due_ms
  FROM players p JOIN accounts a ON a.id=p.account_id
  JOIN loadlab_entities_v1 e ON e.id=p.id AND e.kind='player'
  JOIN loadlab_sessions_v1 l ON l.player_id=p.id AND l.token_hash=?
  JOIN auth_sessions s ON s.token_hash=l.token_hash
  LEFT JOIN bot_due d ON d.account_id=p.account_id WHERE p.id=?`);
 const challenge=sql.prepare("SELECT 1 FROM bot_challenges WHERE owner=? AND purpose='game' AND expires_ms>? LIMIT 1");
 const seen=new Set();
 for(const bot of bots){
  if(!bot||seen.has(bot.id)||typeof bot.token!=='string'||typeof bot.csrf!=='string')throw deny('loadlab_preparation_identity_mismatch');
  seen.add(bot.id);const row=read.get(digest(bot.token),bot.id),csrf=digest(bot.csrf);
  if(!row||registry.playerRun(bot.id)!==runId||registry.accountRun(bot.accountId)!==runId||
    row.account_id!==bot.accountId||row.entity_account!==bot.accountId||row.entity_run!==runId||row.loadlab_run_id!==runId||
    row.username!==bot.name||row.password_hash!=='REALM-NO-PASSWORD'||row.channel!==bot.channel||row.area!==bot.area||row.loadlab_team!==bot.team)
   throw deny('loadlab_preparation_identity_mismatch');
  if(row.session_run!==runId||row.session_account!==bot.accountId||row.session_player!==bot.id||row.auth_account!==bot.accountId||
    row.lab_csrf!==csrf||row.auth_csrf!==csrf||row.session_security!==row.security_version||row.permanently_banned||row.suspended_until_ms>at)
   throw deny('loadlab_preparation_session_invalid');
  if(row.expires_ms!==expiresAtMs||row.expires_at!==Math.floor(expiresAtMs/1000))throw deny('loadlab_preparation_session_too_short');
  if(!Number.isSafeInteger(row.due_ms)||row.due_ms<expiresAtMs)throw deny('loadlab_preparation_bot_deadline_too_short');
  if(challenge.get(bot.accountId,at))throw deny('loadlab_preparation_challenge_present');
 }
 preparingScope(registry,runId,expiresAtMs,now());
 return Object.freeze({schema:'col-loadlab-preparation-r12',requestedAccounts:bots.length,preparedAccounts:bots.length,
  sessionsCoverAuthorization:bots.length,botDeadlinesCoverAuthorization:bots.length,activeChallenges:0,
  checkedAtMs:at,authorizationExpiresAtMs:expiresAtMs,captchaExemption:false});
}
