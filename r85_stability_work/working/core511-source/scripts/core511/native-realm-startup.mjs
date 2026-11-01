import {DatabaseHost} from './database-host.mjs';
import {initializeRealmRuntime} from './generated/native-realm-runtime.mjs';
import {demand} from './contract.mjs';

// Existing game database and inherited flock only. Native initialization does
// no simulation, and its security mirror writes finish before owners exist.
export class NativeRealmStartup {
 static async prepare(host,config){
  demand(host instanceof DatabaseHost&&host.stopped()&&!host.writer&&!host.nativeHttp&&!host.nativeRealmStartup&&host.nativeWorldStartup?.ready,'native_realm_stopped_host');
  demand(config?.database===host.file&&config.realm?.role==='game'&&config.realm.id===host.expected.realmId,'native_realm_host_identity');
  const db=host.database;demand(!db.core511RealmStartup&&!db.core511RealmSecurity&&(!Object.hasOwn(globalThis,'__colRealm')||globalThis.__colRealm===null),'native_realm_existing_binding');
  const self=new NativeRealmStartup(host);host.nativeRealmStartup=self;db.core511RealmStartup=self;
  const startupSecurity={batch:(statements,accountId,state)=>{
   self.assertStarting();demand(typeof accountId==='string'&&Number.isSafeInteger(state?.securityVersion)&&typeof state.blocked==='boolean'&&Array.isArray(statements)&&statements.length===3&&statements.every(s=>s.database===db),'native_realm_startup_security');return db.batch(statements);
  }};db.core511RealmSecurity=startupSecurity;
  try{
   const runtime=await initializeRealmRuntime(config,db);self.assertStarting();demand(runtime===self.runtime&&runtime.admission.database===db&&runtime.id===host.expected.realmId&&!runtime.realtimeMaintenance491,'native_realm_startup_capture');
   await db.durableAfterCommit();self.assertStarting();self.ready=true;return self;
  }catch(error){await self.stop();self.restore();throw error;}
  finally{if(db.core511RealmStartup===self)delete db.core511RealmStartup;if(db.core511RealmSecurity===startupSecurity)delete db.core511RealmSecurity;}
 }
 constructor(host){this.host=host;this.ready=false;this.closed=false;this.before=Object.getOwnPropertyDescriptor(globalThis,'__colRealm');}
 assertStarting(){demand(!this.closed&&!this.ready&&this.host.stopped()&&!this.host.writer&&this.host.nativeRealmStartup===this&&this.host.database.core511RealmStartup===this,'native_realm_startup_fenced');}
 capture(runtime){this.assertStarting();demand(!this.runtime&&runtime?.role==='game'&&runtime.id===this.host.expected.realmId&&runtime.admission?.database===this.host.database&&runtime.maintenance,'native_realm_capture');this.runtime=runtime;}
 async stop(){this.runtime?.maintenance?.close();if(this.runtime?.security)await Promise.allSettled([...this.runtime.security.pending.values()]);}
 restore(){if(this.runtime&&globalThis.__colRealm===this.runtime){if(this.before)Object.defineProperty(globalThis,'__colRealm',this.before);else delete globalThis.__colRealm;}if(this.host.nativeRealmStartup===this)delete this.host.nativeRealmStartup;this.closed=true;}
 close(){if(this.closed)return;demand(this.host.closed,'native_realm_host_still_open');this.restore();}
}
