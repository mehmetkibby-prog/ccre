import {villageFixture} from './native-guild-village-fixture.mjs';
import {native} from './helpers.mjs';
import {RealmAdmission} from '../generated/native-realm-admission.mjs';
import {NativeMaintenance} from '../native-maintenance.mjs';
const {createMaintenance438}=await native('vds-server/src/maintenance438.mjs'),{RealmSecurityGate}=await native('vds-server/src/realm-security-gate.mjs');

// Native maintenance, native account gate and local grants. Signed central
// transport is still a fixture; the five child processes and WS are real.
export async function maintenanceFixture(t){
 const s=await villageFixture(t),{core,f}=s;
 await core.nativeConfiguration.run([],()=>f.sql.prepare('UPDATE players SET is_gm=1 WHERE id=?').run(s.observer.id));
 const maintenance=createMaintenance438({now:f.clock,isGameMaster:id=>f.sql.prepare('SELECT 1 FROM players WHERE account_id=? AND is_gm=1').get(id)!==undefined});
 maintenance.apply({revision:1,phase:'normal',startedAt:0,deadlineMs:0,adminAccountId:'',maintenanceText:''});
 const admission=new RealmAdmission(s.host.database,{realmId:core.realmId}),security=new RealmSecurityGate({now:f.clock,maintenance,readSecurity:async accountId=>({securityVersion:f.sql.prepare('SELECT security_version FROM accounts WHERE id=?').get(accountId).security_version,blocked:false,canPlay:true,maintenanceControl438:maintenance.policy}),applySecurity:(...args)=>admission.applySecurity(...args)});
 const realm={role:'game',id:core.realmId,realm:{status:'open'},policy:{status:'open'},maintenance,security,admission};core.realm=realm;globalThis.__colRealm=realm;core.nativeRealmSecurity.bindGate(security);
 for(const account of [f.account.id,'shared-account-71','shared-account-72'])await security.refresh(account);
 const adapter=new NativeMaintenance(core,realm);t.after(()=>{adapter.close();maintenance.close();});await adapter.sync();await core.refresh();
 const frame=(revision,deadlineMs,phase='maintenance')=>({revision,phase,startedAt:phase==='maintenance'?Math.min(f.clock(),deadlineMs):0,deadlineMs:phase==='maintenance'?deadlineMs:0,adminAccountId:f.account.id,maintenanceText:'Çekirdek bakımı'});
 return {...s,maintenance,realm,adapter,frame};
}
