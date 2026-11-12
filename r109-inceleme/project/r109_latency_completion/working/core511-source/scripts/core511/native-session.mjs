import {demand} from './contract.mjs';
import {materializeNativePresence} from './native-presence-lease.mjs';

// Rare original native createSession only, after its account/password guards.
// A live memory lease is materialized only at this cold login boundary. No
// ping/tick writes game_presence. Native SQL makes the final allow/deny choice.
export class NativeSession {
 constructor(core){this.core=core;}
 batch(statements,accountId,nowMs){
  const c=this.core,db=c.database;
  demand(db.core511Session===this&&!c.closed&&typeof accountId==='string'&&accountId.length>0&&accountId.length<=160&&Number.isSafeInteger(nowMs)&&nowMs>=0&&nowMs<=c.clock()+5000&&Array.isArray(statements)&&statements.length===4&&statements.every(s=>s?.database===db),'native_session_batch_scope');
  return c.serial(async()=>{
   const sql=db.sqlite,admissions=sql.prepare('SELECT a.player_id,a.session_id FROM kernel511_admissions a JOIN players p ON p.id=a.player_id WHERE p.account_id=?').all(accountId);demand(admissions.length<=1,'native_session_account_scope');
   let result;const execute=inside=>{demand(inside===sql&&inside.isTransaction,'native_session_atomic');result=statements.map(s=>db.execute(s));};
   if(!admissions.length)await db.atomic(execute);
   else{
    const {player_id:id,session_id:tokenHash}=admissions[0],prior=c.sessions.get(id)?.session;demand(prior?.account.id===accountId&&prior.tokenHash===tokenHash,'native_session_owner_missing');
    await c.logoutActor(id,tokenHash,{prepare:inside=>{
     // freeze ACK first flushes the latest authenticated channel presence.
     // Recheck the exact DB token/instance/account version inside this same
     // transaction. A replaced/deleted/banned/expired session cannot revive.
     materializeNativePresence(c,inside,prior,nowMs);
     execute(inside);
     // A blocked login leaves the exact old session valid and simply thaws.
     // Rotation/deletion and ownership retirement commit atomically, including
     // the native case where account policy makes the final INSERT fail.
     return !inside.prepare('SELECT 1 FROM auth_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND a.id=? AND s.security_version=a.security_version').get(tokenHash,accountId);
    }});
   }
   demand(Array.isArray(result),'native_session_commit_missing');return result;
  });
 }
}
