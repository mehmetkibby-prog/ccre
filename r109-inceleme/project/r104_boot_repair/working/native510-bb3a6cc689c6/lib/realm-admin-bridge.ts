import {env} from 'cloudflare:workers';
import {getGameSession,AuthRequestError,assertSameOrigin} from './game-auth';

export async function callRealmAdmin(request:Request,input:Record<string,unknown>){
 const realm=(globalThis as any).__colRealm;
 if(realm?.role!=='game')throw new AuthRequestError(404,'unavailable','Sunucu yönetimi kullanılamıyor.');
 if(request.method!=='GET')assertSameOrigin(request);
 const session=await getGameSession(request);
 if(!session||!env.ADMIN_USER_ID||session.account.id!==env.ADMIN_USER_ID)throw new AuthRequestError(403,'admin_required','Yönetici yetkisi gerekiyor.');
 await realm.security.refresh(session.account.id);
 if(!realm.security.allows(session.account.id,session.securityVersion))throw new AuthRequestError(403,'admin_required','Yönetici oturumu geçersiz.');
 try{return await realm.call('/internal/admin',{...input,actorId:session.account.id,securityVersion:session.securityVersion});}
 catch(error){const e=error as any;throw new AuthRequestError(Number.isInteger(e.status)?e.status:503,'central_admin_failed',e.message??'Hesap yönetimine ulaşılamadı.');}
}
