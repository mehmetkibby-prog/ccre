import {academyPageR101} from '../../core511/academy-page-r101.mjs';
import {ACCOUNTS_SCHEMA,startAccountsControl} from "./../../../../native510-bb3a6cc689c6/vds-server/src/loadlab/accounts-control.mjs";
import {seedRegistryFrame} from "./../../../../native510-bb3a6cc689c6/vds-server/src/loadlab/realm-control.mjs";
import {installRegistry,loadRuntimeConfig} from "./../../../../native510-bb3a6cc689c6/vds-server/src/loadlab/registry.mjs";
import {VERSION as LOADLAB_VERSION} from "./../../../../native510-bb3a6cc689c6/vds-server/src/loadlab/protocol.mjs";
import path from 'node:path';
import {attachAdminEntry} from '../admin-entry.mjs';
import {guardPanelAdmin} from '../panel-control.mjs';
import {createSiteVisits457,installSiteVisitRoute457} from "./../../../../native510-bb3a6cc689c6/vds-server/src/site-visits457.mjs";
import {readFile} from 'node:fs/promises';
import {LocalDatabase} from "./../../../../native510-bb3a6cc689c6/vds-server/src/database.mjs";
import {initializeRealmRuntime} from "./../../core511/generated/native-realm-runtime.mjs";
import {installRealmRouteGuard} from "../../core511/generated/native-realm-runtime.mjs";
import {createBotCheck} from "./../../../../native510-bb3a6cc689c6/vds-server/src/bot-check.mjs";
import {ensureLaunchSchema,createLaunchService} from "./../../../../native510-bb3a6cc689c6/vds-server/src/launch-service.mjs";
import {ensureLaunchEmailSchema,createLaunchEmailService} from "../../core511/launch-email-r27.mjs";
import {installRealmScopesR101} from '../../core511/realm-scope-r101.mjs';
import {installRealmInternalR101} from '../../core511/realm-internal-r101.mjs';
const config=JSON.parse(await readFile(process.env.CORE_CONFIG_FILE,'utf8'));
if(config.realm?.role!=='accounts')throw new Error('Accounts configuration required');
Object.assign(process.env,config.environment,{NODE_ENV:'production',CORE_DATABASE_PATH:config.database,
 VINEXT_TRUST_PROXY:'1',VINEXT_TRUSTED_HOSTS:config.hosts.join(',')});
const database=new LocalDatabase(config.database,{groupWrites:false,asyncDurable:false});
globalThis[Symbol.for('coreoflife.localDatabase')]=database;
const runtime=await initializeRealmRuntime(config,database);
// Seed marked identities before importing native authentication routes.
await database.atomic(db=>db.exec(ACCOUNTS_SCHEMA));
const loadLabConfig=loadRuntimeConfig();
const loadLabRegistry=installRegistry({config:loadLabConfig,readSeed:()=>seedRegistryFrame(database.sqlite,LOADLAB_VERSION)});
const loadLabControl=await startAccountsControl({database,runtime,config:loadLabConfig,registry:loadLabRegistry.registry});
// One optional analytics writer in accounts; no player/game database writes.
globalThis.__colSiteVisits=createSiteVisits457({file:path.join(path.dirname(config.database),'site-visits457.sqlite'),writable:true});
ensureLaunchSchema(database.sqlite,{accountsOnly:true,resetClosed438:true});ensureLaunchEmailSchema(database.sqlite);
const launch=createLaunchService(database.sqlite,{accountsOnly:true});
globalThis.__colLaunch={...launch,status:accountId=>{
 const status=launch.status(accountId);
 // Owner-only maintenance access does not change the public launch policy.
 if(accountId&&process.env.ADMIN_USER_ID&&accountId===process.env.ADMIN_USER_ID)return {...status,canPlay:true,showLanding:false,earlyAccess:true};
 return status;
}};
const stopMaintenance438=runtime.manifest.phase==='101'?()=>{}:launch.subscribe(()=>runtime.maintenancePublisher438.publish(globalThis.__colLaunch.controlState()));
if(runtime.manifest.phase!=='101')runtime.maintenancePublisher438.publish(globalThis.__colLaunch.controlState());
globalThis.__colBotCheck=createBotCheck(database.sqlite);
globalThis.__colLaunchEmail=createLaunchEmailService(database.sqlite);
const stopLaunchEmail=globalThis.__colLaunchEmail.start();
if(runtime.manifest.phase==='101'){
 const primaryLaunch=globalThis.__colLaunch;
 const keys=new Map(Object.entries(JSON.parse(await readFile(config.realm.keysFile,'utf8'))).map(([id,key])=>[id,Buffer.from(key,'hex')]));
 installRealmScopesR101(runtime,database.sqlite,{launch:primaryLaunch,mail:globalThis.__colLaunchEmail,keys});
 installRealmInternalR101(runtime,database.sqlite);runtime.academyPageR101=academyPageR101;
 // Authentication belongs to both worlds; each realm applies its own play policy.
 globalThis.__colLaunch={...primaryLaunch,status:id=>({...primaryLaunch.status(id),phase:'open',canPlay:true,showLanding:false,registrationOpen:true})};
}else guardPanelAdmin(runtime);
const {startProdServer}=await import('vinext/server/prod-server');
const native=await startProdServer({host:'127.0.0.1',port:runtime.manifest.authPort,outDir:path.resolve(import.meta.dirname,'../../../../accounts-runtime/dist-vds')});
installRealmRouteGuard(native.server,'accounts');
installSiteVisitRoute457(native.server,globalThis.__colSiteVisits,{hosts:config.hosts,writable:true});
attachAdminEntry(native.server,{runtime,launch:globalThis.__colLaunch});
const cleanup=setInterval(()=>{try{runtime.store.cleanup();runtime.control.cleanup();runtime.cleanupScopesR101?.();}catch(error){console.error('account_entry_cleanup',error.message);}},30000);cleanup.unref();
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{
 await loadLabControl.close();loadLabRegistry.close();
 clearInterval(cleanup);stopLaunchEmail();stopMaintenance438();runtime.maintenancePublisher438.close();native.server.close(()=>{globalThis.__colSiteVisits?.close();database.close();process.exit(0);});native.server.closeIdleConnections();
});
