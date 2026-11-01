import {createHash,randomBytes} from 'node:crypto';

const digest=value=>createHash('sha256').update(value).digest('hex');
const opaque=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value);
const accountProjection=row=>({id:row.id,username:row.username,email:row.email,securityVersion:row.security_version,createdAt:row.created_at});
const error=code=>Object.assign(new Error(code),{code});

// Owned by the accounts process only. Realm processes never open this DB.
// Callers authenticate SSO/CSRF or the realm-specific internal service before
// invoking these methods. This store is not an HTTP authorization layer.
export class RealmEntryStore {
  constructor(db,{manifest,now=Date.now}={}) {
    if(!manifest?.realms)throw new Error('Validated manifest required');
    this.db=db;this.manifest=manifest;this.now=now;
    if(db.prepare('PRAGMA synchronous').get().synchronous<2)throw new Error('Accounts store requires FULL durability');
    db.exec(`CREATE TABLE IF NOT EXISTS realm_entry_codes (
      token_hash TEXT PRIMARY KEY NOT NULL, account_id TEXT NOT NULL,
      realm_id TEXT NOT NULL, security_version INTEGER NOT NULL,
      created_at_ms INTEGER NOT NULL, expires_at_ms INTEGER NOT NULL,
      request_hash TEXT, redeemed_at_ms INTEGER, state_hash TEXT,
      CHECK ((request_hash IS NULL) = (redeemed_at_ms IS NULL))
    );
    CREATE INDEX IF NOT EXISTS realm_entry_expiry ON realm_entry_codes(expires_at_ms);`);
    this.account=db.prepare('SELECT id,username,email,created_at,security_version,permanently_banned,suspended_until_ms FROM accounts WHERE id=?');
    this.insert=db.prepare('INSERT INTO realm_entry_codes(token_hash,account_id,realm_id,security_version,created_at_ms,expires_at_ms,state_hash) VALUES(?,?,?,?,?,?,?)');
    this.read=db.prepare('SELECT * FROM realm_entry_codes WHERE token_hash=?');
    this.consume=db.prepare('UPDATE realm_entry_codes SET request_hash=?,redeemed_at_ms=? WHERE token_hash=? AND request_hash IS NULL');
    this.prune=db.prepare('DELETE FROM realm_entry_codes WHERE token_hash IN (SELECT token_hash FROM realm_entry_codes WHERE expires_at_ms<=? LIMIT 64)');
  }
  realm(realmId) {
    const realm=this.manifest.realms.find(row=>row.id===realmId);
    if(!realm||realm.status!=='open')throw error('realm_closed');
    return realm;
  }
  currentAccount(accountId) {
    const row=this.account.get(accountId);
    if(!row)throw error('account_missing');
    if(row.permanently_banned||row.suspended_until_ms>this.now())throw error('account_suspended');
    return row;
  }
  issue({accountId,realmId,securityVersion,state}) {
    this.realm(realmId);
    const row=this.currentAccount(accountId);
    if(row.security_version!==securityVersion)throw error('security_version_changed');
    const code=randomBytes(32).toString('base64url'),createdAt=this.now(),expiresAt=createdAt+30000;
    // SQLite FULL autocommit completes before the one-use code is returned.
    this.insert.run(digest(code),accountId,realmId,securityVersion,createdAt,expiresAt,state?digest(state):null);
    return {code,realmId,expiresAt};
  }
  redeem({code,realmId,requestId,state}) {
    this.realm(realmId);
    if(!opaque(code)||!opaque(requestId))throw error('invalid_entry');
    const tokenHash=digest(code),requestHash=digest(requestId);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const grant=this.read.get(tokenHash);
      if(!grant||grant.realm_id!==realmId||grant.expires_at_ms<=this.now())throw error('invalid_entry');
      if(grant.state_hash&&(!opaque(state)||digest(state)!==grant.state_hash))throw error('invalid_entry_state');
      const account=this.currentAccount(grant.account_id);
      if(account.security_version!==grant.security_version)throw error('security_version_changed');
      if(grant.request_hash&&grant.request_hash!==requestHash)throw error('entry_already_used');
      if(!grant.request_hash){
        const result=this.consume.run(requestHash,this.now(),tokenHash);
        if(result.changes!==1)throw error('entry_already_used');
      }
      // The realm saves this stable grant ID with its local admission receipt.
      // A network retry uses the same requestId; it cannot create a second
      // character/session. Local receipt enforcement is an integration gate.
      const result={grantId:tokenHash,realmId,account:accountProjection(account),expiresAt:grant.expires_at_ms};
      this.db.exec('COMMIT');return result;
    }catch(cause){this.db.exec('ROLLBACK');throw cause;}
  }
  security(accountId) {
    const row=this.account.get(accountId);
    return row?{securityVersion:row.security_version,blocked:!!row.permanently_banned||row.suspended_until_ms>this.now()}:null;
  }
  cleanup() { return this.prune.run(this.now()).changes; }
}
