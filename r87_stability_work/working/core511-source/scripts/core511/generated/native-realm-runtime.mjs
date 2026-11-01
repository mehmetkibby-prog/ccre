// Maintenance delivery belongs to the current four channel owners.
async function readInitialMaintenance445(call,{now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout}={}){
 const deadline=now()+5000;let lastError;
 const retryable=error=>{
  if(Number.isInteger(error?.status))return false;
  if(error?.name==='TimeoutError')return true;
  const codes=['ECONNREFUSED','ECONNRESET','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT'];
  for(let cause=error,depth=0;cause&&depth<4;cause=cause.cause,depth++)if(codes.includes(cause.code))return true;
  return false;
 };
 while(now()<deadline){
  const controller=new AbortController();let timer;
  const timeout=new Promise((_,reject)=>{
   timer=setTimer(()=>{
    const error=Object.assign(new Error('Accounts startup request timed out'),{name:'TimeoutError'});
    controller.abort(error);reject(error);
   },Math.max(1,Math.min(2500,deadline-now())));
  });
  try{
   // Invoke the existing signed call again: each attempt gets a fresh nonce.
   const reply=await Promise.race([call('/internal/maintenance/status',{},controller.signal),timeout]);
   if(now()>=deadline)throw Object.assign(new Error('Accounts startup deadline elapsed'),{name:'TimeoutError'});
   return reply;
  }catch(error){
   if(!retryable(error))throw error;
   lastError=error;
  }finally{clearTimer(timer);}
  const remaining=deadline-now();if(remaining<=0)break;
  await new Promise(resolve=>setTimer(resolve,Math.min(200,remaining)));
 }
 throw Object.assign(new Error('Accounts service unavailable during startup (5000 ms)',{cause:lastError}),{code:'accounts_startup_unavailable'});
}
import {createMaintenance438,createMaintenancePublisher438,acceptMaintenance438} from "../../../../native510-bb3a6cc689c6/vds-server/src/maintenance438.mjs";
import {loadtestEntry} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadtest-entry.mjs";
import {RealmControl} from "../../../../native510-bb3a6cc689c6/vds-server/src/realm-control.mjs";
import {realmAdminOperation} from "../../../../native510-bb3a6cc689c6/vds-server/src/realm-admin-service.mjs";
import {readFile} from 'node:fs/promises';
import {validateRealmManifest,publicRealmCatalog} from "./native-realm-manifest.mjs";
import {RealmEntryStore} from "../../../../native510-bb3a6cc689c6/vds-server/src/realm-entry-store.mjs";
import {RealmServiceVerifier,signRealmServiceRequest} from "../../../../native510-bb3a6cc689c6/vds-server/src/realm-service-auth.mjs";
import {RealmSecurityGate} from "../../../../native510-bb3a6cc689c6/vds-server/src/realm-security-gate.mjs";
import {RealmAdmission} from "./native-realm-admission.mjs";
import {assertRealmDatabaseIdentity} from "../../../../native510-bb3a6cc689c6/vds-server/src/realm-database-identity.mjs";

export async function initializeRealmRuntime(config,database) {
 if(!config.realm)return null;
 const manifest=validateRealmManifest(JSON.parse(await readFile(config.realm.manifestFile,'utf8')));
 const role=config.realm.role;
 if(!['accounts','game'].includes(role))throw new Error('Invalid realm role');
 const runtime={role,manifest,authOrigin:manifest.authOrigin};
 if(role==='accounts') {
  if(config.database!==manifest.accountsDatabase||database.sqlite.prepare('SELECT origin FROM accounts_schema WHERE id=1').get()?.origin!=='empty-416a')throw new Error('Wrong accounts database');
  const keys=new Map(Object.entries(JSON.parse(await readFile(config.realm.keysFile,'utf8'))).map(([id,key])=>[id,Buffer.from(key,'hex')]));
  const control=new RealmControl(database.sqlite,manifest);
  const currentManifest={...manifest,get realms(){return control.realms();}};
  runtime.manifest=currentManifest;runtime.control=control;
  const verifier=new RealmServiceVerifier(keys),store=new RealmEntryStore(database.sqlite,{manifest:currentManifest});
  runtime.store=store;runtime.verifier=verifier;runtime.maintenancePublisher438=createMaintenancePublisher438(runtime,keys);
  runtime.admin=(actorId,input)=>realmAdminOperation(runtime,actorId,input,{launch:globalThis.__colLaunch,mail:globalThis.__colLaunchEmail});
  runtime.catalog=async({includeHidden=false}={})=>{
   const visible=currentManifest.realms.filter(realm=>includeHidden||realm.id===currentManifest.primaryRealmId);
   const rows=await Promise.all(visible.map(async realm=>{
    try{const response=await fetch(`http://127.0.0.1:${realm.ports.app}/api/vds-health`,{signal:AbortSignal.timeout(1500)});
     if(!response.ok)return [realm.id,null];const health=await response.json();return [realm.id,health.realm];
    }catch{return[realm.id,null];}
   }));return publicRealmCatalog({...currentManifest,realms:visible},new Map(rows));
  };
 } else {
  const realm=manifest.realms.find(row=>row.id===config.realm.id);
  if(!realm||config.database!==realm.database)throw new Error('Wrong realm configuration');
  assertRealmDatabaseIdentity(database.sqlite,{realmId:realm.id,dbIdentity:realm.dbIdentity});
  const key=Buffer.from((await readFile(config.realm.keyFile,'utf8')).trim(),'hex');
  const admission=new RealmAdmission(database,{realmId:realm.id,initialize:!database.readOnly});
  const call=async(pathname,data,startupSignal445)=>{
   const body=JSON.stringify(data),headers=signRealmServiceRequest({key,realmId:realm.id,pathname,body});
   const response=await fetch(`http://127.0.0.1:${manifest.authPort}/api/realm/internal`,{
    method:'POST',headers:{...headers,'content-type':'application/json','x-col-service-path':pathname},body,signal:startupSignal445??AbortSignal.timeout(2500)});
   if(!response.ok){let message='Hesap doğrulaması tamamlanamadı.';if(pathname==='/internal/admin'){try{message=(await response.json()).error??message;}catch{}}throw Object.assign(new Error(message),{status:response.status});}
   return response.json();
  };
  runtime.realm=realm;runtime.id=realm.id;runtime.admission=admission;runtime.call=call;
  const maintenanceGmQuery492=database.sqlite.prepare('SELECT 1 AS allowed FROM players WHERE account_id=? AND is_gm=1 LIMIT 1');
  runtime.maintenance=createMaintenance438({isGameMaster:id=>maintenanceGmQuery492.get(id)?.allowed===1});runtime.maintenanceVerifier438=new RealmServiceVerifier(new Map([[realm.id,key]]));
  runtime.maintenance.apply(await readInitialMaintenance445(call));
  database.core511RealmStartup.capture(runtime);
  runtime.security=new RealmSecurityGate({maintenance:runtime.maintenance,readSecurity:async accountId=>{const state=await call('/internal/security/check',{accountId});if(state.maintenanceControl438)runtime.maintenance.apply(state.maintenanceControl438);runtime.policy={status:state.realmStatus,registrationOpen:state.registrationOpen,launch:state.launch};return state;},applySecurity:(...args)=>admission.applySecurity(...args)});
  let maintenancePhase438=runtime.maintenance.policy?.phase;runtime.maintenance.subscribe(frame=>{const reopened=maintenancePhase438==='maintenance'&&frame.phase!=='maintenance';maintenancePhase438=frame.phase;if(reopened)for(const entry of runtime.security.entries.values())entry.validUntil=0;});
 }
 if(role==='game'){
  const active=database.sqlite.prepare('SELECT DISTINCT s.account_id FROM auth_sessions s JOIN game_presence p ON p.account_id=s.account_id AND p.token_hash=s.token_hash WHERE s.expires_at>? AND p.expires_at_ms>? LIMIT 1000').all(Math.floor(Date.now()/1000),Date.now());
  // Revalidate surviving local sessions once during startup, before readiness.
  for(let i=0;i<active.length;i+=8)await Promise.all(active.slice(i,i+8).map(row=>runtime.security.refresh(row.account_id)));
 }
 globalThis.__colRealm=runtime;
 return runtime;
}

// Accounts hosts never serve game/admin/economy APIs. Realm hosts have no
// password authority. The same guard is installed before forwarding to vinext.
export function realmRouteAllowed(role,pathname) {
 if(!pathname.startsWith('/api/'))return true;
 if(role==='accounts')return /^\/api\/(auth\/(login|register|logout|me|forgot-password|reset-password|challenge)|realm\/(catalog|issue|internal|admin)|launch|launch-email|registration-challenge|vds-health)$/.test(pathname);
 return !/^\/api\/auth\/(login|register|forgot-password|reset-password)$/.test(pathname)&&!pathname.startsWith('/api/admin/vds-migration')&&!['/api/realm/internal','/api/realm/issue','/api/realm/catalog'].includes(pathname);
}
export function installRealmRouteGuard(server,role) {
 const handlers=server.listeners('request');server.removeAllListeners('request');
 server.on('request',(req,res)=>{
  let pathname;try{pathname=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400);res.end();return;}
  if(pathname==='/api/realm/maintenance'&&role==='game'){void globalThis[Symbol.for('coreoflife.core511.httpBindings')].privateRequest(req,res,()=>acceptMaintenance438(req,res,globalThis.__colRealm));return;}
  if(pathname==='/api/loadtest/session'){void globalThis[Symbol.for('coreoflife.core511.httpBindings')].privateRequest(req,res,()=>loadtestEntry(req,res,globalThis.__colRealm).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end();}));return;}
  if(!realmRouteAllowed(role,pathname)){res.writeHead(403,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(role==='game'&&/^\/api\/auth\/(login|register|forgot-password|reset-password)$/.test(pathname)?{error:'Hesap işlemi için güvenli giriş sayfasına devam et.',code:'account_origin_required',redirectUrl:'/api/realm/begin'}:{error:'Bu işlem bu sunucuda kullanılamaz.'}));return;}
  for(const handler of handlers)handler.call(server,req,res);
 });
}
