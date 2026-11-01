import {randomBytes,createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('base64url');
const opaque=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value);

// One connection/transaction per realm. Ordinary admission never changes the
// central account's security revision or another realm's sessions.
export class RealmAdmission {
 constructor(database,{realmId,now=Date.now,initialize=true}) {
  this.database=database;this.db=database.sqlite;this.realmId=realmId;this.now=now;
  if(initialize)this.db.exec(`CREATE TABLE IF NOT EXISTS realm_admissions(
   grant_id TEXT PRIMARY KEY,account_id TEXT NOT NULL,session_hash TEXT NOT NULL,
   expires_at_ms INTEGER NOT NULL);
   CREATE INDEX IF NOT EXISTS realm_admissions_expiry ON realm_admissions(expires_at_ms);`);
 }
 async accept(grant,{sessionToken,csrfToken}) {
  if(grant?.realmId!==this.realmId||!(typeof grant?.grantId==='string'&&/^[a-f0-9]{64}$/.test(grant.grantId))||!opaque(sessionToken)||!opaque(csrfToken)||
    !grant.account?.id||!Number.isSafeInteger(grant.account.securityVersion)||grant.expiresAt<=this.now())throw new Error('invalid_realm_grant');
  const a=grant.account,tokenHash=hash(sessionToken),csrfHash=hash(csrfToken),now=this.now(),seconds=Math.floor(now/1000),expiresAt=seconds+30*86400;
  // Run through the existing durable write lane, never acknowledge ahead of fsync.
  const db=this.database;
  await db.batch([
   db.prepare('DELETE FROM realm_admissions WHERE grant_id IN (SELECT grant_id FROM realm_admissions WHERE expires_at_ms<=? LIMIT 64)').bind(now),
   db.prepare(`INSERT INTO accounts(id,username,username_normalized,email,email_normalized,password_hash,password_salt,password_iterations,security_version,suspended_until_ms,permanently_banned,ban_reason,created_at,updated_at)
    VALUES(?,?,?,?,?,'REALM-NO-PASSWORD','REALM-NO-PASSWORD',100000,?,0,0,'',?,?)
    ON CONFLICT(id) DO UPDATE SET username=excluded.username,email=excluded.email,
    username_normalized=excluded.username_normalized,email_normalized=excluded.email_normalized
    WHERE accounts.security_version<=excluded.security_version`)
    .bind(a.id,a.username,a.username.normalize('NFKC').toLocaleLowerCase('tr-TR'),a.email,a.email.toLowerCase(),a.securityVersion,a.createdAt??seconds,seconds),
   db.prepare(`DELETE FROM auth_sessions WHERE account_id=? AND NOT EXISTS(SELECT 1 FROM game_presence WHERE account_id=? AND expires_at_ms>?) AND NOT EXISTS(SELECT 1 FROM realm_admissions WHERE grant_id=?)`).bind(a.id,a.id,now,grant.grantId),
   db.prepare(`INSERT OR IGNORE INTO auth_sessions(token_hash,account_id,csrf_hash,security_version,created_at,last_seen_at,expires_at)
    SELECT ?,id,?,security_version,?,?,? FROM accounts WHERE id=? AND security_version=? AND permanently_banned=0 AND suspended_until_ms<=?
    AND NOT EXISTS(SELECT 1 FROM auth_sessions WHERE account_id=?)
    AND NOT EXISTS(SELECT 1 FROM game_presence WHERE account_id=? AND expires_at_ms>?)
    AND NOT EXISTS(SELECT 1 FROM realm_admissions WHERE grant_id=?)`)
    .bind(tokenHash,csrfHash,seconds,seconds,expiresAt,a.id,a.securityVersion,now,a.id,a.id,now,grant.grantId),
   db.prepare(`INSERT OR IGNORE INTO realm_admissions SELECT ?,account_id,token_hash,? FROM auth_sessions WHERE token_hash=? AND account_id=?`).bind(grant.grantId,grant.expiresAt,tokenHash,a.id),
  ]);
  const receipt=await db.prepare('SELECT session_hash FROM realm_admissions WHERE grant_id=? AND account_id=?').bind(grant.grantId,a.id).first();
  const session=await db.prepare('SELECT expires_at FROM auth_sessions WHERE token_hash=? AND account_id=?').bind(tokenHash,a.id).first();
  if(!receipt||receipt.session_hash!==tokenHash||!session)throw Object.assign(new Error('Bu hesap bu sunucuda zaten açık. Önce açık oturumu kapat.'),{status:409});
  return {sessionToken,csrfToken,expiresAt:session.expires_at};
 }
 async applySecurity(accountId,state) {
  const db=this.database;
  const row=await db.prepare('SELECT security_version,permanently_banned FROM accounts WHERE id=?').bind(accountId).first();
  if(!row)return;
  if(state.securityVersion<row.security_version)throw new Error('security_revision_regressed');
  if(state.securityVersion===row.security_version&&!state.blocked&&!row.permanently_banned)return;
  await db.batch([
   db.prepare('UPDATE accounts SET security_version=?,permanently_banned=? WHERE id=? AND security_version<=?').bind(state.securityVersion,state.blocked?1:0,accountId,state.securityVersion),
   db.prepare('DELETE FROM game_presence WHERE account_id=?').bind(accountId),
   db.prepare('DELETE FROM auth_sessions WHERE account_id=?').bind(accountId),
  ]);
 }
}
export const realmOpaqueToken=()=>randomBytes(32).toString('base64url');
