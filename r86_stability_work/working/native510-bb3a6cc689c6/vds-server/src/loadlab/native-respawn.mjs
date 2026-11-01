import {signLabProof,LAB_PROOF_HEADER} from './loadlab-proof.mjs';
import {digest,sessionDigest,equalSecret,fail} from './protocol.mjs';

// This is an authenticated call to the existing native action route, not a
// replacement respawn implementation. Only local control may supply tokens.
export function normalRespawn({database,registry,config,applicationConfig,realm,runId,playerId,credentials,now=Date.now}){
 return async({signal})=>{
  if(!registry.active(runId)||registry.playerRun(playerId)!==runId)throw fail('inactive_owned_bot',403);
  const {token,csrf,instance}=credentials??{};
  if(!/^[A-Za-z0-9_-]{43}$/.test(token??'')||!/^[A-Za-z0-9_-]{43}$/.test(csrf??'')||!/^[a-f0-9-]{36}$/.test(instance??''))throw fail('invalid_recovery_credentials',403);
  const session=database.compiled('SELECT * FROM loadlab_sessions_v1 WHERE token_hash=? AND player_id=? AND run_id=?').get(sessionDigest(token),playerId,runId);
  const ledger=database.compiled("SELECT descriptor_json FROM loadlab_entities_v1 WHERE id=? AND kind='player' AND run_id=?").get(playerId,runId);
  if(!session||session.expires_ms<=now()||!equalSecret(session.csrf_hash,sessionDigest(csrf))||!ledger||JSON.parse(ledger.descriptor_json).instance!==instance)throw fail('recovery_session_mismatch',403);
  const host=new URL(realm.realm.origin).hostname,port=realm.realm.ports.proxy;
  if(!/^[a-f0-9]{64}$/.test(applicationConfig.proxyToken??'')||!Number.isInteger(port)||port<1024||port>65535)throw fail('native_backend_unavailable',503);
  const body=JSON.stringify({action:'respawn'}),proof=signLabProof({key:config.controlKey,method:'POST',path:'/api/action',body,runId,playerId,accountId:session.account_id,sessionTokenHash:digest(token),instanceId:instance,nowMs:now()});
  const response=await fetch('http://127.0.0.1:'+port+'/_game/api/action',{method:'POST',redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(5000)]):AbortSignal.timeout(5000),
   headers:{host,'x-col-public-host':host,'x-col-proxy-token':applicationConfig.proxyToken,'x-col-client-ip':'45.84.191.73',origin:'https://'+host,
    cookie:'__Host-yasam-session='+token+'; __Host-yasam-csrf='+csrf,'x-csrf-token':csrf,'x-game-instance':instance,'content-type':'application/json',[LAB_PROOF_HEADER]:proof},body});
  const text=await response.text();if(text.length>262144)throw fail('native_response_too_large',503);
  let data;try{data=JSON.parse(text);}catch{throw fail('invalid_native_response',503);}return {status:response.status,data};
 };
}
