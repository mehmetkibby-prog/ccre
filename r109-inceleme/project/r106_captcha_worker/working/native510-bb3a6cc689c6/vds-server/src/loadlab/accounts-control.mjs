import {randomBytes} from 'node:crypto';
import {createLocalControl} from './control-rpc.mjs';
import {fail,validId,opaque} from './protocol.mjs';
import {cleanupCentralLoadLabAccounts} from './cleanup.mjs';
const MARKER='COL-LOADLAB-V1-NO-PASSWORD';
export const ACCOUNTS_SCHEMA=`CREATE TABLE IF NOT EXISTS loadlab_accounts_v1(account_id TEXT PRIMARY KEY NOT NULL,run_id TEXT NOT NULL,username TEXT NOT NULL UNIQUE,created_ms INTEGER NOT NULL,expires_ms INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS loadlab_accounts_run_v1 ON loadlab_accounts_v1(run_id);`;
export async function startAccountsControl({database,runtime,config,registry,now=Date.now}){
 if(!config)return {close(){}};
 await database.atomic(db=>db.exec(ACCOUNTS_SCHEMA));
 const marked=(id,run)=>{const a=database.compiled('SELECT a.*,l.run_id,l.username AS lab_username,l.expires_ms FROM accounts a JOIN loadlab_accounts_v1 l ON l.account_id=a.id WHERE a.id=?').get(id);if(!a||a.run_id!==run||a.username!==a.lab_username||a.password_hash!==MARKER||!a.email.endsWith('@loadlab.invalid'))throw fail('account_ownership_mismatch',409);return a;};
 const handlers={
  inventory(){
   const runs=new Map();for(const row of database.compiled('SELECT account_id,run_id FROM loadlab_accounts_v1').all()){
    let run=runs.get(row.run_id);if(!run)runs.set(row.run_id,run={id:row.run_id,status:'revoked',expiresAtMs:0,heartbeatUntilMs:0,bots:[],monsters:[]});
    run.bots.push({id:'unadmitted-'+row.account_id,accountId:row.account_id,team:0});
   }return {version:'col-loadlab-v1',generation:0,enabled:false,windowExpiresAtMs:0,runs:[...runs.values()]};
  },
  status(){return {ok:true,accounts:database.compiled('SELECT run_id,COUNT(*) AS count FROM loadlab_accounts_v1 GROUP BY run_id').all()};},
  applyState(frame){return registry.apply(frame);},
  async provision({runId,bots,expiresAtMs}){
   if(!validId(runId)||!Array.isArray(bots)||bots.length<1||bots.length>75||!Number.isSafeInteger(expiresAtMs)||expiresAtMs<=now()||expiresAtMs>now()+960000)throw fail('invalid_provision');
   if(database.compiled('SELECT 1 FROM loadlab_accounts_v1 LIMIT 1').get())throw fail('previous_run_requires_cleanup',409);
   const ids=new Set(),names=new Set();for(const b of bots){if(!validId(b.accountId)||!b.accountId.startsWith('laba-')||!/^BOT_(?:0[1-9]|[1-6][0-9]|7[0-5])$/.test(b.name)||ids.has(b.accountId)||names.has(b.name))throw fail('invalid_bot_identity');ids.add(b.accountId);names.add(b.name);}
   await database.atomic(db=>{
    const seconds=Math.floor(now()/1000);
    for(const b of bots){
     const normalized=b.name.toLocaleLowerCase('tr-TR');
     if(db.prepare('SELECT 1 FROM accounts WHERE id=? OR username_normalized=?').get(b.accountId,normalized))throw fail('bot_name_collision',409);
     const email=b.accountId+'@loadlab.invalid';
     db.prepare('INSERT INTO accounts(id,username,username_normalized,email,email_normalized,password_hash,password_salt,password_iterations,security_version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,100000,1,?,?)').run(b.accountId,b.name,normalized,email,email,MARKER,randomBytes(32).toString('hex'),seconds,seconds);
     db.prepare('INSERT INTO loadlab_accounts_v1 VALUES(?,?,?,?,?)').run(b.accountId,runId,b.name,now(),expiresAtMs);
     db.prepare('INSERT INTO launch_access(account_id,granted_at) VALUES(?,?)').run(b.accountId,now());
    }
   });
   return {created:bots.length};
  },
  grant({accountId,runId}){
   const a=marked(accountId,runId);if(a.expires_ms<=now())throw fail('test_expired',403);
   // The normal single-use central grant is issued and consumed, with its
   // normal security revision/realm-open checks and FULL durable receipt.
   const requestId=opaque(),state=opaque();
   const ticket=runtime.store.issue({accountId,realmId:'r1',securityVersion:a.security_version,state});
   return runtime.store.redeem({code:ticket.code,realmId:'r1',requestId,state});
  },
  async revoke({runId}){
   if(!validId(runId))throw fail('invalid_run');
   const rows=database.compiled('SELECT account_id FROM loadlab_accounts_v1 WHERE run_id=?').all(runId);
   for(const r of rows)marked(r.account_id,runId);
   await database.atomic(db=>{for(const r of rows){db.prepare('DELETE FROM auth_sessions WHERE account_id=?').run(r.account_id);db.prepare('DELETE FROM realm_entry_codes WHERE account_id=?').run(r.account_id);db.prepare('UPDATE accounts SET permanently_banned=1,security_version=security_version+1 WHERE id=?').run(r.account_id);}});
   return {revoked:rows.length};
  },
  async cleanup({runId}){
   if(!validId(runId))throw fail('invalid_run');
   return cleanupCentralLoadLabAccounts({database,registry,runId});
  }
 };
 return createLocalControl({port:config.accountsPort,key:config.controlKey,handlers});
}
