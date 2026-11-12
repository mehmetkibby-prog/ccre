import {getGameSession} from './game-auth';

export async function realmAdminIdentity(requestHeaders: Headers) {
  const realm=(globalThis as any).__colRealm;
  if(realm?.role!=='game')return null;
  const request=new Request(new URL('/admin',realm.realm.origin),{headers:requestHeaders});
  const session=await getGameSession(request);
  if(!session)return null;
  // Admin reads and writes require a fresh signed central security check.
  await realm.security.refresh(session.account.id);
  if(!realm.security.allows(session.account.id,session.securityVersion))return null;
  return {id:session.account.id,email:session.account.email,displayName:session.account.username,fullName:null};
}
