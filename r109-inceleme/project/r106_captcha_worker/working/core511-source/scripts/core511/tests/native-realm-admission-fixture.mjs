import {randomBytes} from 'node:crypto';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {RealmAdmission} from '../generated/native-realm-admission.mjs';

// Starts after the native signed grant exchange. The central account reply is
// fixture data; its original local grant/session/ban SQL runs unchanged.
export function realmGrant(f,realmId,{grantId='d'.repeat(64),account={},expiresAt=f.clock()+30000}={}){
 return {realmId,grantId,expiresAt,account:{id:f.account.id,username:f.account.username,email:f.account.email,securityVersion:f.account.security_version,createdAt:f.account.created_at,...account}};
}
export const realmTokens=()=>({sessionToken:randomBytes(32).toString('base64url'),csrfToken:randomBytes(32).toString('base64url')});
export async function realmAdmissionFixture(t){
 const s=await nativeHttpHost(t);await s.world.stopJobs();let admission;await s.host.database.atomic(()=>{globalThis.__colLaunch.grant(s.f.account.id,true);admission=new RealmAdmission(s.host.database,{realmId:s.core.realmId,now:s.f.clock});});
 return {...s,admission,grant:realmGrant(s.f,s.core.realmId)};
}
