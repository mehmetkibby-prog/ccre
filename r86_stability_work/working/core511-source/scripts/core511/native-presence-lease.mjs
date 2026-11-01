import {demand} from './contract.mjs';

// Materialize only an authenticated, current-ownership WS lease inside an
// existing native presence transaction. Login/tab replacement freezes first;
// an identical live instance may renew just its lease without freezing gameplay.
// A ping or simulation tick never calls this SQL materializer directly.
export function materializeNativePresence(core,sql,prior,nowMs){
 demand(sql===core.database.sqlite&&sql.isTransaction,'native_presence_atomic');
 const augmented=core.presence.augment(prior),presence=augmented.gamePresence;
 if(presence&&presence.expiresAtMs>nowMs&&augmented!==prior)sql.prepare(`UPDATE game_presence SET expires_at_ms=MAX(expires_at_ms,?)
      WHERE account_id=? AND token_hash=? AND instance_id=? AND EXISTS(
       SELECT 1 FROM auth_sessions s JOIN accounts a ON a.id=s.account_id
       WHERE s.token_hash=? AND a.id=game_presence.account_id AND s.security_version=?
        AND a.security_version=s.security_version AND s.expires_at>? AND a.permanently_banned=0 AND a.suspended_until_ms<=?)`).run(presence.expiresAtMs,prior.account.id,prior.tokenHash,presence.instanceId,prior.tokenHash,prior.securityVersion,Math.floor(core.clock()/1000),core.clock());
}
