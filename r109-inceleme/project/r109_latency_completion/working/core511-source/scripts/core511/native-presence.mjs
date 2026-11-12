import {demand} from './contract.mjs';
import {materializeNativePresence} from './native-presence-lease.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {settleAutoR102} from './content-model-r102.mjs';

// The three original authorized HTTP statements retain their SQL and exact
// run()/first() result shape. No caller chooses ownership, epoch or other SQL.
export class NativePresence {
 constructor(core){this.core=core;}
 idleExempt(auth,nowMs=this.core.clock()){
  // Keep the existing island rule. Elsewhere, only the current character's
  // committed, unexpired official auto-attack grant suppresses idle logout.
  // Never trust a browser flag or extend/consume time from this read path.
  if(auth.playerAccess?.area==='afk')return true;
  if(!auth.player?.id||!auth.account?.id)return false;
  const row=prepareServerStatement(this.core.database.sqlite,`SELECT a.*
   FROM players p JOIN content_auto_r102 a ON a.account_id=p.account_id AND a.active_player=p.id
   WHERE p.id=? AND p.account_id=? AND p.hp>0 AND p.auto_attack_until_r102>?
    AND a.lease_until_ms>?`).get(auth.player.id,auth.account.id,nowMs,nowMs);
  return Boolean(row&&settleAutoR102(row,nowMs).active);
 }
 execute(statement,{accountId,tokenHash,instance,action,nowMs,first}){
  const c=this.core,db=c.database;
  demand(db.core511Presence===this&&!c.closed&&statement?.database===db&&typeof accountId==='string'&&accountId.length>0&&accountId.length<=160&&typeof tokenHash==='string'&&tokenHash.length===43&&typeof instance==='string'&&/^[a-f0-9-]{36}$/.test(instance)&&['claim','renew','release'].includes(action)&&typeof first==='boolean'&&first===(action!=='release')&&Number.isSafeInteger(nowMs)&&nowMs>=0&&nowMs<=c.clock()+5000,'native_presence_statement_scope');
  return c.serial(async()=>{
   const sql=db.sqlite,admissions=sql.prepare('SELECT a.player_id,a.session_id FROM kernel511_admissions a JOIN players p ON p.id=a.player_id WHERE p.account_id=?').all(accountId);demand(admissions.length<=1,'native_presence_account_scope');let result;
   const execute=inside=>{demand(inside===sql&&inside.isTransaction,'native_presence_atomic');result=db.execute(statement);};
   if(!admissions.length)await db.atomic(execute);
   else{
    const {player_id:id,session_id:ownedToken}=admissions[0],prior=c.sessions.get(id)?.session;demand(prior?.account.id===accountId&&prior.tokenHash===ownedToken&&prior.gamePresence,'native_presence_owner_missing');
    // The auth portal renews this lease every 10 seconds. An identical live
    // instance changes only lease expiry, so quiescing its movement is neither
    // required nor useful. Check the persisted identity and active admission
    // again inside the original atomic writer before executing its native SQL.
    // Claims, releases and uncertain ownership retain the full freeze below.
    let renewed=false;
    if(action==='renew'&&tokenHash===ownedToken&&instance===prior.gamePresence.instanceId)await db.atomic(inside=>{
     const current=c.sessions.get(id)?.session,owner=c.authority.owner(id,inside),admission=c.authority.admission(id,inside),presence=inside.prepare('SELECT token_hash,instance_id,expires_at_ms FROM game_presence WHERE account_id=?').get(accountId);
     if(current!==prior||c.transitions.has(id)||owner?.state!=='active'||admission?.session_id!==ownedToken||admission.epoch!==owner.epoch||admission.channel!==owner.channel||presence?.token_hash!==ownedToken||presence.instance_id!==instance)return;
     // A previously persisted expiry can be renewed only while the ordinary
     // authenticated WS lease bridge still proves liveness; never recreate a
     // missing/replaced row or revive a retired/expired different instance.
     const augmented=c.presence.augment(prior);
     if(presence.expires_at_ms<=nowMs&&(augmented===prior||augmented.gamePresence?.expiresAtMs<=nowMs))return;
     materializeNativePresence(c,inside,prior,nowMs);execute(inside);renewed=true;
    });
    if(!renewed)await c.logoutActor(id,ownedToken,{prepare:inside=>{
     materializeNativePresence(c,inside,prior,nowMs);execute(inside);
     const presence=inside.prepare('SELECT token_hash,instance_id FROM game_presence WHERE account_id=?').get(accountId);
     // Rejected claims, other-instance releases and same-instance renewal do
     // not detach a current owner. Native accepted replacement/release and
     // ownership retirement share the original statement's durable COMMIT.
     return !presence||presence.token_hash!==ownedToken||presence.instance_id!==prior.gamePresence.instanceId;
    }});
   }
   demand(result&&Array.isArray(result.results),'native_presence_commit_missing');return first?result.results[0]??null:result;
  });
 }
}
