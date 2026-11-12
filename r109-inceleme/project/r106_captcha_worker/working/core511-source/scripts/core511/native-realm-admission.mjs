import {demand} from './contract.mjs';
import {materializeNativePresence} from './native-presence-lease.mjs';

// Private execution hook for the original already-validated local realm grant.
// The central exchange remains native. The five original statements, account
// policy, receipt/replay rules, token entropy and30-day lifetime are unchanged.
export class NativeRealmAdmission {
 constructor(core){this.core=core;}
 acceptBatch(statements,accountId,nowMs){
  const c=this.core,db=c.database;
  demand(db.core511RealmAdmission===this&&!c.closed&&typeof accountId==='string'&&accountId.length>0&&accountId.length<=160&&Number.isSafeInteger(nowMs)&&nowMs>=0&&nowMs<=c.clock()+5000&&Array.isArray(statements)&&statements.length===5&&statements.every(s=>s?.database===db),'native_realm_admission_scope');
  return c.serial(async()=>{
   const sql=db.sqlite,admissions=sql.prepare('SELECT a.player_id,a.session_id FROM kernel511_admissions a JOIN players p ON p.id=a.player_id WHERE p.account_id=?').all(accountId);demand(admissions.length<=1,'native_realm_admission_account');let result;
   const execute=inside=>{demand(inside===sql&&inside.isTransaction,'native_realm_admission_atomic');result=statements.map(s=>db.execute(s));};
   if(!admissions.length)await db.atomic(execute);
   else{
    const {player_id:id,session_id:tokenHash}=admissions[0],prior=c.sessions.get(id)?.session;demand(prior?.account.id===accountId&&prior.tokenHash===tokenHash,'native_realm_admission_owner_missing');
    await c.logoutActor(id,tokenHash,{prepare:inside=>{
     materializeNativePresence(c,inside,prior,nowMs);execute(inside);
     return !inside.prepare('SELECT 1 FROM auth_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND a.id=? AND s.security_version=a.security_version').get(tokenHash,accountId);
    }});
   }
   demand(Array.isArray(result),'native_realm_admission_commit_missing');return result;
  });
 }
}
