import {DatabaseSync} from 'node:sqlite';
import {openSync, closeSync, fsyncSync, realpathSync} from 'node:fs';
import path from 'node:path';

// Offline provisioning only. No legacy source, default production path, data
// deletion or automatic adoption of an existing database is supported.
export function createEmptyAccountsDatabase({destination, now=Date.now}) {
  if(typeof destination!=='string'||!path.isAbsolute(destination)||path.normalize(destination)!==destination)
    throw new Error('Explicit canonical accounts destination required');
  const parent=realpathSync(path.dirname(destination));
  if(parent!==path.dirname(destination))throw new Error('Accounts parent cannot be a symlink');
  const fd=openSync(destination,'wx',0o600);closeSync(fd);
  let db;
  try {
    db=new DatabaseSync(destination);
    db.exec(`PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;
      BEGIN IMMEDIATE;
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY NOT NULL, username TEXT NOT NULL,
        username_normalized TEXT NOT NULL, email TEXT NOT NULL, email_normalized TEXT NOT NULL,
        password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
        password_iterations INTEGER NOT NULL DEFAULT 100000,
        security_version INTEGER NOT NULL DEFAULT 1 CHECK(security_version>=1),
        suspended_until_ms INTEGER NOT NULL DEFAULT 0,
        permanently_banned INTEGER NOT NULL DEFAULT 0 CHECK(permanently_banned IN(0,1)),
        ban_reason TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX idx_accounts_username ON accounts(username_normalized);
      CREATE UNIQUE INDEX idx_accounts_email ON accounts(email_normalized);
      CREATE TABLE auth_sessions (
        token_hash TEXT PRIMARY KEY NOT NULL, account_id TEXT NOT NULL REFERENCES accounts(id),
        csrf_hash TEXT NOT NULL, security_version INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
      );
      CREATE INDEX idx_auth_sessions_account ON auth_sessions(account_id);
      CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at);
      CREATE TABLE auth_tokens (
        token_hash TEXT PRIMARY KEY NOT NULL, account_id TEXT NOT NULL REFERENCES accounts(id),
        purpose TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
        used_at INTEGER NOT NULL DEFAULT 0
      );
      CREATE UNIQUE INDEX idx_auth_tokens_account ON auth_tokens(account_id,purpose);
      CREATE INDEX idx_auth_tokens_expires ON auth_tokens(expires_at);
      CREATE TABLE auth_rate_limits (
        key TEXT PRIMARY KEY NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
        window_started_at INTEGER NOT NULL, blocked_until INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE accounts_schema (
        id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL,
        created_at_ms INTEGER NOT NULL, origin TEXT NOT NULL CHECK(origin='empty-416a')
      );`);
    db.prepare("INSERT INTO accounts_schema VALUES(1,1,?,'empty-416a')").run(now());
    if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Accounts integrity failed');
    db.exec('COMMIT');
  } catch(error) {
    try{db?.exec('ROLLBACK');}catch{}
    // Keep incomplete files for diagnosis; a retry never overwrites them.
    throw error;
  } finally {db?.close();}
  const file=openSync(destination,'r');try{fsyncSync(file);}finally{closeSync(file);}
  const directory=openSync(parent,'r');try{fsyncSync(directory);}finally{closeSync(directory);}
  return {schemaVersion:1,accounts:0,sessions:0,origin:'empty-416a'};
}
