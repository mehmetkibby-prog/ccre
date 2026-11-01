import {demand} from './contract.mjs';

// Called only by the original, already authorized native logout function.
// Statements are the original LocalDatabase objects, never browser SQL. The
// logout epoch/admission and original session batch share one durable COMMIT.
export class NativeLogout {
 constructor(core){this.core=core;}
 batch(statements,tokenHash){
  const c=this.core,db=c.database;
  demand(db.core511Logout===this&&!c.closed&&typeof tokenHash==='string'&&tokenHash.length===43&&Array.isArray(statements)&&statements.length>0&&statements.length<=3&&statements.every(s=>s?.database===db),'native_logout_batch_scope');
  return c.serial(async()=>{
   const sql=db.sqlite,admissions=sql.prepare('SELECT player_id FROM kernel511_admissions WHERE session_id=?').all(tokenHash);demand(admissions.length<=1,'native_logout_session_scope');
   const account=sql.prepare('SELECT a.id,a.security_version,p.id AS player_id FROM auth_sessions s JOIN accounts a ON a.id=s.account_id LEFT JOIN players p ON p.account_id=a.id WHERE s.token_hash=?').get(tokenHash);
   let result;const complete=inside=>{demand(inside===sql&&inside.isTransaction,'native_logout_atomic');result=statements.map(s=>db.execute(s));};
   if(admissions.length){
    demand(!account||account.player_id===admissions[0].player_id,'native_logout_account_scope');
    await c.logoutActor(admissions[0].player_id,tokenHash,{complete});
   }else if(account?.player_id&&c.authority.admission(account.player_id)){
    // Logging out an older session must not detach a different current one.
    // The original standalone policy may increment the account version. If
    // so, revoke that now-invalid mirror while it remains frozen; game-realm
    // logout leaves the other session and its mirror intact, exactly as V510.
    await c.permanent.durablePlayers([account.player_id],async()=>{
     await db.atomic(complete);const current=sql.prepare('SELECT security_version FROM accounts WHERE id=?').get(account.id);
     if(current?.security_version!==account.security_version)await c.revoke({account:account.id});
    });
   }else await db.atomic(complete);
   demand(Array.isArray(result),'native_logout_commit_missing');return result;
  });
 }
}
