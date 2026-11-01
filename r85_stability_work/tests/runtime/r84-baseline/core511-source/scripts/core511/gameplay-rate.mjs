import {createHash} from 'node:crypto';
import {createEntryWriterRules} from './generated/entry-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {demand} from './contract.mjs';

const rejections=new WeakMap();
export function gameplayRateResponse(error){const result=rejections.get(error);if(result)rejections.delete(error);return result;}

// The exact native SQL limiter and AuthRequestError response run inside the
// already owned action transaction. A rejected attempt still commits its rate
// window and ordered receipt; it cannot reset its block by rolling them back.
export function createNativeGameplayRates(sql,{globals,clock=Date.now,onApplied=null}={}){
 const response={json:(body,{status=200,headers}={})=>({body,status,...(headers?{headers:Object.fromEntries(headers)}:{})})};
 const rules=createEntryWriterRules({environment:{DB:nativeAtomicStatements(sql),CORE_RUNTIME:'vds',CORE_SHA256:value=>createHash('sha256').update(value).digest('base64url')},globals,clock,response});
 return {enforce(database,...args){
  demand(database===sql&&sql.isTransaction,'gameplay_rate_requires_atomic');
  let rejection=null;
  try{rules.enforceRateLimit(...args);}catch(error){
   if(error instanceof rules.AuthRequestError&&error.status===429&&error.code==='rate_limited'){rejections.set(error,rules.authErrorResponse(error));rejection=error;}
   else{if(!onApplied)throw error;throw Object.assign(new Error('gameplay_rate_database_failure',{cause:error}),{code:'gameplay_rate_database_failure'});}
  }
  if(onApplied)try{
   // An otherwise rolled-back command still counts as an attempted action.
   // Preserve the exact post-limiter row, never rerun admission or charge twice.
   const key=createHash('sha256').update(args[0]+':'+args[1]).digest('base64url'),row=sql.prepare('SELECT key,attempts,window_started_at,blocked_until FROM auth_rate_limits WHERE key=?').get(key);demand(row,'gameplay_rate_row_missing');
   onApplied(()=>sql.prepare('INSERT INTO auth_rate_limits(key,attempts,window_started_at,blocked_until) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET attempts=excluded.attempts,window_started_at=excluded.window_started_at,blocked_until=excluded.blocked_until').run(row.key,row.attempts,row.window_started_at,row.blocked_until));
  }catch(error){throw Object.assign(new Error('gameplay_rate_recovery_unavailable',{cause:error}),{code:'gameplay_rate_recovery_unavailable'});}
  if(rejection)throw rejection;
 }};
}
