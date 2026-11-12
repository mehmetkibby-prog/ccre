import {createRealtimeDiagnostics504} from './realtime-diagnostics504.mjs';
import {createRuneV2HealthSave485} from './rune-v2-health485.mjs';
import {ensureRealmLabSchema,seedRegistryFrame,startRealmControl} from './loadlab/realm-control.mjs';
import {installRegistry,loadRuntimeConfig} from './loadlab/registry.mjs';
import {VERSION as LOADLAB_VERSION} from './loadlab/protocol.mjs';
import {createLoadLabRequestMetrics,aggregateLoadLabRequestMetrics,instrumentLoadLabHttp} from './loadlab/request-metrics.mjs';
import {cleanupLoadLabRun} from './loadlab/cleanup.mjs';
import {createDailyMonsterReward477} from './daily-monster-reward477.mjs';
import {attachMaintenanceExpiry438} from './maintenance-expiry438.mjs';
import {ChannelIngress} from './channel-ingress.mjs';
import {DatabaseSync} from 'node:sqlite';
import {ChannelAuthority} from './channel-authority.mjs';
import {ChannelWriter} from './channel-writer.mjs';
import {ChannelNativeOperations} from './channel-native-operations.mjs';
import {ChannelSupervisor} from './channel-supervisor.mjs';
import {initializeRealmRuntime,installRealmRouteGuard} from './realm-runtime.mjs';
import {initializeChannelNativeServices} from './channel-native-services.mjs';
import {observeChannelCommits} from './channel-commit-observer.mjs';
import {cachePreparedStatements} from './prepared-cache.mjs';
import {WalCheckpoint} from './wal-checkpoint.mjs';
import {startRuntimePerformance,measureSync504} from './runtime-performance.mjs';
import {instrumentNativeHttp} from './http-timing.mjs';
import {startGuildVoiceProxy} from './guild-voice-proxy.mjs';

// Main is a writer/control plane. It constructs no position/combat/world maps,
// movement bridge, world push or dungeon clock. Simulation entry is separate.
export async function startChannelMain(config,database){
 database.coordinatorOnly=true;
 const native=new DatabaseSync(config.database);native.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000; PRAGMA synchronous=FULL');
 ensureRealmLabSchema(native);
 const loadLabConfig=loadRuntimeConfig();
 const loadLabRegistry=installRegistry({config:loadLabConfig,readSeed:()=>seedRegistryFrame(database.sqlite,LOADLAB_VERSION)});
 const loadLabMetrics=createLoadLabRequestMetrics();globalThis.__colLoadLabMetrics=loadLabMetrics;
 globalThis.__colLoadLabCleanup=cleanupLoadLabRun;
 const realm=await initializeRealmRuntime(config,database);
 const api=await import('../../dist-vds/server/channel-runtime/index.mjs');
 // Initialize helper schemas before the writer enumerates notification tables.
 initializeChannelNativeServices(native,{realmRuntime:realm,database,coordinatorOnly:true});
 const authority=new ChannelAuthority(database,{realmId:config.realm?.id??'local'});await authority.initialize();
 const writer=await new ChannelWriter(database,authority,{nativeOperations:new ChannelNativeOperations(database)}).initialize();
 const supervisor=new ChannelSupervisor({database,authority,writer,onCommitted:changes=>globalThis.__colGuildSkill.committed(changes),entry:new URL('./channel-worker.mjs',import.meta.url),boot:{config,database:config.database,sharedCombat:true},onFailure:({channel,error})=>console.error('channel_failure',channel,error.code??error.message),onDirectory:channels=>process.send?.({type:'resident-channel-directory',startupId:process.env.CORE_APP_STARTUP_ID,channels})});
 observeChannelCommits(database.sqlite,writer.notifications,{afterCommit:database,ignore:()=>writer.changed!==null,onChanges:changes=>supervisor.notifyCommitted(null,changes)});
 observeChannelCommits(native,writer.notifications,{onChanges:changes=>supervisor.notifyCommitted(null,changes)});
 cachePreparedStatements(native);
 initializeChannelNativeServices(native,{realmRuntime:realm,database,coordinatorOnly:true});
 // Every supported writer now reports committed guild membership/skill rows.
 // Enable the fast idle path only on this observed coordinator connection.
 globalThis.__colGuildSkill.observeCommits();
 await api.ensureWorldSeed();
 const checkpoint=process.env.CORE_WAL_CHECKPOINT_WORKER==='0'?null:new WalCheckpoint(config.database);
 if(checkpoint){checkpoint.register(database.sqlite,{externallyDurable:Boolean(database.walSync)});checkpoint.register(native);database.walCheckpoint=checkpoint;await checkpoint.ready;}
 let maintenanceFrame438=realm?.maintenance?.policy,maintenanceSync438=null,maintenanceReady438=false;
 const syncMaintenance438=frame=>{maintenanceFrame438=frame;if(!maintenanceReady438)return Promise.resolve();if(maintenanceSync438?.revision===frame.revision)return maintenanceSync438.promise;const job={revision:frame.revision,promise:null};maintenanceSync438=job;job.promise=Promise.allSettled([...supervisor.children.values()].filter(s=>s.ready).map(s=>s.rpc.request('maintenance438',frame,{timeoutMs:1500}))).then(results=>{if(results.some(r=>r.status==='rejected'))throw Error('maintenance_channel_retry');}).finally(()=>{if(maintenanceSync438===job)maintenanceSync438=null;});return job.promise;};
 if(realm)realm.maintenanceFanout438=syncMaintenance438;
 const stopMaintenance438=realm?.maintenance?.subscribe(frame=>syncMaintenance438(frame));
 await supervisor.start();database.channelCompute=supervisor;
 const loadLabCombinedMetrics=aggregateLoadLabRequestMetrics(loadLabMetrics,supervisor);
 globalThis.__colLoadLabCombinedMetrics=loadLabCombinedMetrics;
 const loadLabControl=await startRealmControl({database,native,realm,supervisor,applicationConfig:config,config:loadLabConfig,registry:loadLabRegistry.registry,metrics:loadLabCombinedMetrics});
 const stopMaintenanceExpiry438=attachMaintenanceExpiry438(realm,database);maintenanceReady438=true;if(maintenanceFrame438)await syncMaintenance438(maintenanceFrame438);
 globalThis.__colChannelPermanent=(ids,operation)=>supervisor.permanentPlayers(ids,operation);
 globalThis.__colRuneV2HealthSave485=createRuneV2HealthSave485(supervisor,(config,revision)=>globalThis.__colRuneV2.save(config,revision));
 const dailyMonsterReward477=createDailyMonsterReward477(native,{permanent:(ids,operation)=>supervisor.permanentPlayers(ids,operation)});
 const {startProdServer}=await import('vinext/server/prod-server');
 const http=await startProdServer({host:'127.0.0.1',port:Number(process.env.CORE_APP_PORT)||3003,outDir:'dist-vds'});
 if(realm)installRealmRouteGuard(http.server,realm.role);
 // No authenticated world/action request may accidentally execute simulation
 // on the coordinator (including direct loopback access).
 const routeGuard=new ChannelIngress(config.database);
 const listeners=http.server.listeners('request');http.server.removeAllListeners('request');
 http.server.on('request',(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/api/action'){try{routeGuard.target(pathname,req.headers);}catch{res.writeHead(409,{'content-type':'application/json'});res.end(JSON.stringify({code:'channel_route_required'}));return;}}
  if(['/api/world','/api/realtime/ticket','/api/dungeon'].includes(pathname)){res.writeHead(409,{'content-type':'application/json'});res.end(JSON.stringify({code:'channel_route_required'}));return;}
  for(const fn of listeners)measureSync504('main_http',()=>fn.call(http.server,req,res));
 });
 http.server.keepAliveTimeout=65000;instrumentNativeHttp(http.server);instrumentLoadLabHttp(http.server,loadLabMetrics);startRuntimePerformance();
 // Account/email/purchased-item expiry are permanent-data housekeeping,
 // unrelated to player/monster simulation. Preserve original FULL writes.
 startGuildVoiceProxy(globalThis.__colGuildVoice,{port:Number(process.env.CORE_VOICE_PORT)||3005});
 database.diagnosticsRealtime504=createRealtimeDiagnostics504();
 const stopEmail=globalThis.__colLaunchEmail.start();
 const clocks=[];let stopping=false;
 const every=(name,ms,fn)=>{let running=false;const timer=setInterval(()=>{if(running||stopping)return;running=true;void Promise.resolve().then(()=>measureSync504(name,fn)).catch(e=>console.error('channel_main_maintenance',e.message)).finally(()=>running=false);},ms);timer.unref();clocks.push(timer);};
 every('main_health_sample',1000,()=>{void database.diagnosticsRealtime504.sample();return supervisor.sample();});
 every('main_premium_expiry',1000,()=>Promise.all([globalThis.__colPremium.expireInBackground(()=>!stopping,id=>supervisor.permanentPlayers([id],()=>globalThis.__colPremium.expireOwner(id))),dailyMonsterReward477.tick(()=>!stopping&&!database.maintenance&&!database.closed)]));
 every('main_guild_sync',1000,()=>globalThis.__colGuildSkill.syncInBackground(()=>!stopping));
 every('main_voice_sweep',5000,()=>globalThis.__colGuildVoice.sweep());
 every('main_receipt_prune',60000,async()=>{await writer.pruneReceipts(Date.now()-86400000,128,{maxBatches:128});const time=Date.now();if(database.compiled('SELECT 1 FROM expansion456_receipts WHERE created_at_ms<? LIMIT 1').get(time-86400000))await database.atomic(()=>writer.nativeOperations.expansion456.prune(time,128));});
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{
  if(stopping)return;stopping=true;await loadLabControl.close();loadLabRegistry.close();stopMaintenance438?.();realm?.maintenance?.close();for(const c of clocks)clearInterval(c);stopEmail();
  try{const drain=new Promise(r=>http.server.close(r));http.server.closeIdleConnections();await drain;await dailyMonsterReward477.drain();await supervisor.close();while(database.writeQueue.length)database.drainWrites();await database.walSync?.durable();routeGuard.close();native.close();database.close();process.exit(0);}catch(error){console.error('resident_shutdown_failed',error);process.exit(1);}
 });
 return supervisor;
}
