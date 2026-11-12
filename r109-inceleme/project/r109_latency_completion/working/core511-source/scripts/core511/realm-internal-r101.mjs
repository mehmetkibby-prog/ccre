import {AutoIpAuthorityR102,AUTO_IP_PATH_R102} from './auto-ip-r102.mjs';
import {SharedEpinAuthorityR101} from './shared-epin-r101.mjs';
export function installRealmInternalR101(runtime,db) {
 if(runtime.manifest.phase!=='101')return;
 const epins=new SharedEpinAuthorityR101(db);runtime.epinsR101=epins;const autoIp=new AutoIpAuthorityR102();runtime.autoIpR102=autoIp;
 runtime.internalR101=(pathname,realmId,data)=>{
  if(pathname===AUTO_IP_PATH_R102){
   const security=runtime.scopedSecurity(realmId,data.accountId);
   if(!security||security.blocked||(data.action!=='release'&&security.securityVersion!==data.securityVersion))return {ok:false,status:403,code:'auto_ip_session_r102',error:'Oturumunu yeniden doğrula.'};
   return autoIp.handle(realmId,data);
  }
  if(!pathname.startsWith('/internal/epin/'))return null;
  if(process.env.CORE101_CP_READY==='0'&&pathname!=='/internal/epin/summary')throw Object.assign(Error('ÇP aktarımı hazırlanıyor. Biraz sonra yeniden dene.'),{status:503});
  if(!runtime.manifest.realms.some(r=>r.id===realmId))throw Error('Sunucu doğrulanamadı.');
  const accountId=pathname==='/internal/epin/claim'?data.accountId:data.actorId;
  const security=runtime.scopedSecurity(realmId,accountId);
  if(!security||security.blocked||security.securityVersion!==data.securityVersion)throw Error('Oturumunu yeniden doğrula.');
  if(pathname==='/internal/epin/claim'){if(realmId==='r2'&&!runtime.launchFor('r2').status(accountId).canPlay)throw Error('Akademi giriş izni gerekli.');return epins.claim(realmId,data);}
  if(!process.env.ADMIN_USER_ID||accountId!==process.env.ADMIN_USER_ID)throw Error('Yönetici yetkisi gerekiyor.');
  if(pathname==='/internal/epin/create')return epins.create(realmId,data);
  if(pathname==='/internal/epin/revoke')return epins.revoke(data.batchId);
  if(pathname==='/internal/epin/summary')return epins.summary();
  throw Error('Geçersiz ÇP işlemi.');
 };
}
