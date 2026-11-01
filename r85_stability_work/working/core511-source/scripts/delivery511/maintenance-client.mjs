import fs from 'node:fs';
import http from 'node:http';
import {signRealmServiceRequest} from '../../../native510-bb3a6cc689c6/vds-server/src/realm-service-auth.mjs';
export function maintenanceClient({gameConfig,accountsConfig,manifest}){
 const key=Buffer.from(fs.readFileSync(gameConfig.realm.keyFile,'utf8').trim(),'hex'),realmId=gameConfig.realm.id;
 const actorId=accountsConfig.environment?.ADMIN_USER_ID;if(!actorId)throw Error('configured_owner_required');
 const call=(pathname,data={})=>new Promise((resolve,reject)=>{
  const body=JSON.stringify(data),headers=signRealmServiceRequest({key,realmId,pathname,body});
  const req=http.request({host:'127.0.0.1',port:manifest.authPort,path:'/api/realm/internal',method:'POST',headers:{...headers,'content-type':'application/json','x-col-service-path':pathname}},res=>{let text='';res.on('data',b=>{text+=b;if(text.length>1024*1024)req.destroy(Error('central_reply_size'));});res.on('end',()=>{try{const result=JSON.parse(text);if(res.statusCode!==200)throw Error('signed_central_request:'+res.statusCode+':'+(result.error??''));resolve(result);}catch(e){reject(e);}});});req.setTimeout(5000,()=>req.destroy(Error('central_timeout')));req.on('error',reject);req.end(body);
 });
 const admin=async input=>{const security=await call('/internal/security/check',{accountId:actorId});if(security.blocked||!Number.isSafeInteger(security.securityVersion))throw Error('owner_security_rejected');return call('/internal/admin',{...input,actorId,securityVersion:security.securityVersion});};
 const policy=()=>call('/internal/maintenance/status');
 return {policy,admin,enter:async()=>{
  const p=await policy();if(p.phase!=='maintenance'){const {settings}=await admin({resource:'launch',method:'GET'});await admin({resource:'launch',method:'POST',body:{action:'save',settings:{...settings,mode:'maintenance'}}});}
  const frozen=await policy();if(frozen.phase!=='maintenance')throw Error('maintenance_not_applied');
  while(Date.now()<frozen.deadlineMs)await new Promise(r=>setTimeout(r,Math.min(250,frozen.deadlineMs-Date.now())));
  const latest=await policy();if(latest.revision!==frozen.revision||latest.phase!=='maintenance')throw Error('maintenance_revision_changed');return latest;
 },assert:async revision=>{const p=await policy();if(p.phase!=='maintenance'||p.revision!==revision||p.deadlineMs>Date.now())throw Error('maintenance_revision_changed');return p;},
 open:async revision=>{const p=await policy();if(p.phase!=='maintenance'||p.revision!==revision)throw Error('maintenance_open_cas');const {settings}=await admin({resource:'launch',method:'GET'});if(settings.revision!==revision)throw Error('maintenance_open_cas');await admin({resource:'launch',method:'POST',body:{action:'save',settings:{...settings,mode:'open'}}});const next=await policy();if(!['normal','open'].includes(next.phase)||next.revision!==revision+1)throw Error('opening_not_verified');return next;}};
}
