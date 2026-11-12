import {ensureLaunchSchema,createLaunchService} from '../../../native510-bb3a6cc689c6/vds-server/src/launch-service.mjs';
import {createMaintenancePublisher438} from '../../../native510-bb3a6cc689c6/vds-server/src/maintenance438.mjs';
import {realmAdminOperation} from '../../../native510-bb3a6cc689c6/vds-server/src/realm-admin-service.mjs';
import {ensureLaunchEmailSchema,createLaunchEmailService} from './launch-email-r27.mjs';
import {guardPanelAdmin} from '../delivery511/panel-control.mjs';
import {createRealmRegistrationsR101} from './academy-access-r101.mjs';

// Reuse the existing launch/email behavior, with a finite set of table/index
// names. Accounts/passwords stay shared; launch permissions and mail consent do
// not. There is no dynamic SQL identifier supplied by a player or an admin.
export function scopedLaunchDatabaseR101(db,realmId) {
 if(realmId!=='r2')throw Error('r101_invalid_launch_scope');
 const names=['launch_settings','launch_access','launch_schema_updates','launch_email_settings','launch_email_preferences','launch_email_outbox','idx_launch_email_queue'];
 const pattern=new RegExp('\\b('+names.join('|')+')\\b','g');
 const sql=text=>text.replace(pattern,name=>'r101_'+realmId+'_'+name);
 return {exec:text=>db.exec(sql(text)),prepare:text=>db.prepare(sql(text))};
}
const fail=message=>{throw Object.assign(Error(message),{status:400});};
export class RealmSanctionsR101 {
 constructor(db,{now=Date.now}={}) {
  this.db=db;this.now=now;
  db.exec(`CREATE TABLE IF NOT EXISTS realm_sanctions_r101(realm_id TEXT NOT NULL,account_id TEXT NOT NULL REFERENCES accounts(id),banned INTEGER NOT NULL DEFAULT 0,until_ms INTEGER NOT NULL DEFAULT 0,reason TEXT NOT NULL DEFAULT '',PRIMARY KEY(realm_id,account_id));
   CREATE TABLE IF NOT EXISTS realm_sanction_receipts_r101(request_id TEXT PRIMARY KEY,actor TEXT NOT NULL,input TEXT NOT NULL,result TEXT NOT NULL,created_at_ms INTEGER NOT NULL);CREATE INDEX IF NOT EXISTS realm_sanction_receipts_date_r101 ON realm_sanction_receipts_r101(created_at_ms);`);
 }
 cleanup(){return this.db.prepare('DELETE FROM realm_sanction_receipts_r101 WHERE request_id IN (SELECT request_id FROM realm_sanction_receipts_r101 WHERE created_at_ms<? ORDER BY created_at_ms LIMIT 64)').run(this.now()-30*86400000).changes;}
 security(realmId,accountId,state) {
  if(!state)return state;
  const row=this.db.prepare('SELECT * FROM realm_sanctions_r101 WHERE realm_id=? AND account_id=?').get(realmId,accountId);
  return {...state,blocked:!!state.blocked||!!row?.banned||(row?.until_ms??0)>this.now()};
 }
 sanction(realmId,actor,input) {
  if(!['r1','r2'].includes(realmId)||!/^[a-f0-9-]{36}$/.test(input.requestId??'')||!['ban','unban','suspend'].includes(input.action)||typeof input.accountId!=='string'||input.accountId.length>100)fail('Geçersiz oyuncu işlemi.');
  if(input.accountId===actor)fail('Kendi yönetici hesabını engelleyemezsin.');
  const data={realmId,accountId:input.accountId,action:input.action,untilMs:input.action==='suspend'?Number(input.untilMs):0,reason:String(input.reason??'').slice(0,240)};
  if(data.action==='suspend'&&(!Number.isSafeInteger(data.untilMs)||data.untilMs<=this.now()||data.untilMs>this.now()+365*86400000))fail('Geçersiz engel süresi.');
  const fingerprint=JSON.stringify(data),db=this.db;db.exec('BEGIN IMMEDIATE');
  try {
   const prior=db.prepare('SELECT * FROM realm_sanction_receipts_r101 WHERE request_id=?').get(input.requestId);
   if(prior){if(prior.actor!==actor||prior.input!==fingerprint)fail('İstek daha önce kullanılmış.');db.exec('COMMIT');return JSON.parse(prior.result);}
   if(!db.prepare('SELECT 1 FROM accounts WHERE id=?').get(data.accountId))fail('Hesap bulunamadı.');
   db.prepare(`INSERT INTO realm_sanctions_r101 VALUES(?,?,?,?,?) ON CONFLICT(realm_id,account_id) DO UPDATE SET banned=excluded.banned,until_ms=excluded.until_ms,reason=excluded.reason`).run(realmId,data.accountId,data.action==='ban'?1:0,data.untilMs,data.reason);
   const result={ok:true,realmId};
   db.prepare('INSERT INTO realm_sanction_receipts_r101 VALUES(?,?,?,?,?)').run(input.requestId,actor,fingerprint,JSON.stringify(result),this.now());
   db.exec('COMMIT');return result;
  }catch(error){db.exec('ROLLBACK');throw error;}
 }
}
export function installRealmScopesR101(runtime,db,{launch,mail,keys,publisherFactory=createMaintenancePublisher438,panelGuard=guardPanelAdmin}={}) {
 if(runtime.manifest.phase!=='101')return null;
 const sanctions=new RealmSanctionsR101(db),scopes=new Map(),stops=[];
 const registrations=createRealmRegistrationsR101(db);runtime.registrationsR101=registrations;
 // Close the original all-realm publisher before installing independent ones.
 runtime.maintenancePublisher438?.close();
 for(const realm of runtime.manifest.realms) {
  let policy=launch,email=mail;
  if(realm.id!==runtime.manifest.primaryRealmId) {
   const scoped=scopedLaunchDatabaseR101(db,realm.id);
   ensureLaunchSchema(scoped,{accountsOnly:true});ensureLaunchEmailSchema(scoped);
   // A brand new Akademi starts closed. Never inherit old beta dates/opening.
   db.exec('CREATE TABLE IF NOT EXISTS realm_launch_init_r101(realm_id TEXT PRIMARY KEY)');
   db.exec('BEGIN IMMEDIATE');
   try {
    if(db.prepare('INSERT OR IGNORE INTO realm_launch_init_r101 VALUES(?)').run(realm.id).changes){
     scoped.prepare("UPDATE launch_settings SET mode='closed',enabled=1,public_opens_at=0,revision=revision+1 WHERE id=1").run();
     runtime.control.saveRealm({realmId:realm.id,status:'open',registrationOpen:true});
    }
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error;}
   const original=createLaunchService(scoped,{accountsOnly:true});
   policy={...original,status:id=>{const status=original.status(id);return id&&id===process.env.ADMIN_USER_ID?{...status,canPlay:true,showLanding:false,earlyAccess:true}:status;}};
   email=createLaunchEmailService(scoped);
   // Empty consent/outbox: no accounts receive unsolicited Akademi messages.
  }
  policy=registrations.wrap(realm.id,policy);
  const manifest={...runtime.manifest,primaryRealmId:realm.id,get realms(){return runtime.control.realms().filter(r=>r.id===realm.id);}};
  const control={realms:()=>manifest.realms,saveRealm:input=>{
   if(input.realmId!==realm.id)fail('Bu panel yalnız '+realm.name+' sunucusunu yönetir.');runtime.control.saveRealm(input);
  },sanction:(actor,input)=>sanctions.sanction(realm.id,actor,input)};
  const scopedRuntime={...runtime,manifest,control,launch:policy,catalog:async options=>(await runtime.catalog(options)).filter(r=>r.id===realm.id)};
  scopedRuntime.maintenancePublisher438=publisherFactory(scopedRuntime,new Map([[realm.id,keys.get(realm.id)]]));
  scopedRuntime.admin=async(actor,input)=>{
   if(input?.resource==='launch'&&input.method==='POST'&&input.body?.action==='test_access'){
    if(realm.id!=='r2')fail('Test erişimi yalnız Akademi panelinden yönetilir.');
    policy.saveTestAccess(input.body);input={...input,method:'GET',body:undefined};
   }
   const result=await realmAdminOperation(scopedRuntime,actor,input,{launch:policy,mail:email});
   if(input.resource==='launch'&&realm.id==='r2')return {...result,earlyAccessUrl:runtime.authOrigin+'/akademi-kayit',approvalRequired:policy.testAccess().testOnly,testAccessR101:policy.testAccess()};
   return result;
  };
  panelGuard(scopedRuntime);
  scopes.set(realm.id,{runtime:scopedRuntime,launch:policy,mail:email});
  stops.push(policy.subscribe(()=>scopedRuntime.maintenancePublisher438.publish(policy.controlState())));
  scopedRuntime.maintenancePublisher438.publish(policy.controlState());
 }
 runtime.launchFor=id=>{const scope=scopes.get(id);if(!scope)fail('Sunucu bulunamadı.');return scope.launch;};
 runtime.scopedSecurity=(realmId,id)=>sanctions.security(realmId,id,runtime.store.security(id));
 runtime.admin=(actor,input,verifiedRealmId=runtime.manifest.primaryRealmId)=>{
  const scope=scopes.get(verifiedRealmId);if(!scope)fail('Sunucu doğrulanamadı.');
  return scope.runtime.admin(actor,input);
 };
 runtime.maintenancePublisher438={publish(frame,realmId=runtime.manifest.primaryRealmId){scopes.get(realmId)?.runtime.maintenancePublisher438.publish(frame);},close(){for(const stop of stops)stop();for(const scope of scopes.values())scope.runtime.maintenancePublisher438.close();}};
 runtime.scopesR101=scopes;runtime.cleanupScopesR101=()=>sanctions.cleanup();
 return {scopes,sanctions};
}
