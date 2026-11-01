import {CastleHttpR59} from './castle-http-r59.mjs';
import {publicCheckpointR80,runtimeHealthR80} from './runtime-health-r80.mjs';
import {castleEnabled} from './castle-model-r59.mjs';
import {createCastleSchema} from './castle-schema-r59.mjs';
import {levelExemptEnabledR58} from './level-rewards-r58.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {installBeltHpGuard} from './belt-hp.mjs';
import {GuildSnapshotReader} from './guild-snapshot-reader.mjs';
import {AdminAzrailGrant} from './admin-azrail-grant.mjs';
import {NativeMistAdmin} from './native-mist-admin.mjs';
import {createAdventureSchema} from './adventure-schema.mjs';
import {DatabaseHost} from './database-host.mjs';
import {createNativeHttpServices,createNativeHttpOperations,NATIVE_HTTP_GLOBALS} from './generated/native-http-services.mjs';
import {CHANNELS,CAPACITY,PROTOCOL,demand} from './contract.mjs';
import {realmRouteAllowed} from './generated/native-realm-runtime.mjs';
import {createTowerSchema,readTowerConfig} from './tower-config.mjs';
import {NativeTowerAdmin} from './native-tower-admin.mjs';
import {tradeGlassHttp} from './trade-glass-read.mjs';
import {R40_UI_OPTIONS_BODY} from './r40-options.mjs';
import {R44_UI_OPTIONS_BODY} from './r44-options.mjs';
import {R45_UI_OPTIONS_BODY} from './r45-options.mjs';
import {R46_UI_OPTIONS_BODY} from './r46-options.mjs';
import {R50_CLAIM_UI_OPTIONS_BODY} from './r50-claim-options.mjs';
import {R43_UI_OPTIONS_BODY} from './r43-options.mjs';
import {normalizeBagResponse} from './bag-limit.mjs';
import {createMountSchema} from './mounts-schema.mjs';
import {MountService} from './mounts-service.mjs';
import {gameplayR60} from './r60-options.mjs';
import {mountEnabled} from './mounts-model.mjs';
import {AdminMountGrantR49} from './admin-mount-grant-r49.mjs';
import {MountHttpR49} from './mount-http-r49.mjs';
import {wrapEnhancementDurabilityR55} from './enhancement-durability-r55.mjs';
import {AdminMaterialsR55,createAdminMaterialSchemaR55} from './admin-materials-r55.mjs';
import {AdminMountDropsR55} from './mount-drops-r55.mjs';
import {gameplayR55} from './r55-gameplay-options.mjs';
import {gameplayR58} from './r58-gameplay-options.mjs';
import {mistPreviewR58} from './mist-preview-r58.mjs';

const databaseKey=Symbol.for('coreoflife.localDatabase'),bindingKey=Symbol.for('coreoflife.core511.httpBindings');
const hooks=['__colChannelPermanent','__colCore511Presence'];
function restore(target,key,descriptor){if(descriptor)Object.defineProperty(target,key,descriptor);else delete target[key];}

// Install before importing the native HTTP bundle. Its env.DB getter must see
// the existing host connection, never create another SQLite writer. The native
// HTTP services keep their own transactions; writer RNG facades are not reused.
export class NativeHttpBindings {
 static async open(host,{realmRuntime=host.nativeRealmStartup?.runtime??null}={}){
  demand(host instanceof DatabaseHost&&host.stopped()&&!host.nativeHttp,'native_http_stopped_host');
  demand(host.nativeWorldStartup?.ready&&!host.writer,'native_http_warmup_required');
  demand(!host.nativeRealmStartup||host.nativeRealmStartup.ready&&realmRuntime===host.nativeRealmStartup.runtime,'native_http_realm_startup');
  demand(!realmRuntime||realmRuntime.role==='game'&&realmRuntime.id===host.expected.realmId&&realmRuntime.admission?.database===host.database,'native_http_realm_binding');
  demand(!globalThis[bindingKey]&&!globalThis[databaseKey],'native_http_existing_database');
  demand(!('nativeOperation' in host.database),'native_http_existing_operation');
  for(const key of [...NATIVE_HTTP_GLOBALS,...hooks])demand(!Object.hasOwn(globalThis,key),'native_http_existing_service');
  demand(!Object.hasOwn(globalThis,'__colRealm')||globalThis.__colRealm===realmRuntime,'native_http_existing_realm');
  const self=new NativeHttpBindings(host),keys=[databaseKey,bindingKey,'__colRealm',...hooks,...NATIVE_HTTP_GLOBALS];
  self.before=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));self.coordinatorDescriptor=Object.getOwnPropertyDescriptor(host.database,'coordinatorOnly');
  try{
   host.nativeHttp=self;globalThis[bindingKey]=self;globalThis[databaseKey]=host.database;globalThis.__colRealm=realmRuntime;host.database.coordinatorOnly=true;
   globalThis.__colChannelPermanent=(ids,operation)=>self.core().permanentPlayers(ids,operation);
   globalThis.__colCore511Presence=Object.freeze({augment:session=>self.core().presence.augment(session)});
   // Existing native service construction may add its idempotent helper schema.
   // It happens before any owner starts and must be durable before readiness.
   await host.database.atomic(sql=>{const beltHp=installBeltHpGuard(sql);createTowerSchema(sql);createAdventureSchema(sql);createMountSchema(sql);createCastleSchema(sql);readTowerConfig(sql.prepare('SELECT value FROM kadim_tower_settings WHERE id=1').get().value);self.services=createNativeHttpServices(sql,{database:host.database,realmRuntime});self.operations=createNativeHttpOperations(host.database);beltHp.normalize();});
   globalThis.__colEnhancement491=wrapEnhancementDurabilityR55(globalThis.__colEnhancement491,host.database.sqlite);
   await host.database.atomic(sql=>createAdminMaterialSchemaR55(sql));
   self.materialGrant=new AdminMaterialsR55(host.database,()=>self.core());host.database.core511MaterialGrantR55=self.materialGrant;
   self.mountDrops=new AdminMountDropsR55(host.database,()=>self.core());host.database.core511MountDropsR55=self.mountDrops;
   demand(!host.database.core511TowerAdmin,'native_tower_admin_already_bound');self.towerAdmin=new NativeTowerAdmin(host.database);host.database.core511TowerAdmin=self.towerAdmin;self.towerReady=true;self.mistAdmin=new NativeMistAdmin(host.database);host.database.core511MistAdmin=self.mistAdmin;
   host.database.nativeOperation=request=>self.core().nativeHttpAction.nativeOperation(request,self.operations);
   self.guildReader=new GuildSnapshotReader(host.file);host.database.core511GuildReader=self.guildReader;
   self.azrailGrant=new AdminAzrailGrant(host.database,()=>self.core());host.database.core511AzrailGrant=self.azrailGrant;
   self.mountService=new MountService(host.database.sqlite,{locked:id=>Boolean(globalThis.__colDungeon?.locked(id)||globalThis.__colAdventure?.membership(id))});
   self.mountGrant=new AdminMountGrantR49(host.database,()=>self.core(),{service:self.mountService});host.database.core511MountGrantR49=self.mountGrant;
   self.mountHttp=new MountHttpR49(host.database,()=>self.core(),{service:self.mountService});host.database.core511MountR49=self.mountHttp;
   self.castle=new CastleHttpR59(host.database,()=>self.core());host.database.core511CastleR59=self.castle;
   host.assertOpen();self.initialized=true;return self;
  }catch(error){self.restore();throw error;}
 }
 constructor(host){this.host=host;this.initialized=false;this.closed=false;this.accepting=true;this.pending=new Set();}
 database(){return this.core().database;}
 levelExemptPreviewR58(id,url){if(!gameplayR58.mistLevelRewards)return false;const row=prepareServerStatement(this.host.database.sqlite,'SELECT m.area FROM monsters m JOIN players p ON p.id=? AND p.area=m.area AND p.channel=m.channel WHERE m.id=?').get(id,url.searchParams.get('monster'));return levelExemptEnabledR58(row?.area);}
 mistPreviewR58(id,url){return mistPreviewR58(this.host.database.sqlite,globalThis.__colAdventure,id,url);}
 privateRequest(req,res,operation){
  if(!this.accepting){res.writeHead(503,{'content-type':'application/json','cache-control':'no-store',connection:'close'});res.end(JSON.stringify({code:'core511_stopping'}));return Promise.resolve();}
  const task=Promise.resolve().then(()=>{this.core();return operation();}).catch(()=>{if(!res.destroyed){if(!res.headersSent)res.writeHead(500);res.end();}}).finally(()=>this.pending.delete(task));this.pending.add(task);return task;
 }
 route(request,native){
  if(!this.accepting)return Promise.resolve(Response.json({code:'core511_stopping'},{status:503,headers:{'cache-control':'no-store'}}));
  const task=Promise.resolve().then(async()=>{
   const c=this.core(),pathname=new URL(request.url).pathname,role=c.realm?.role;
   if(role&&!realmRouteAllowed(role,pathname))return Response.json(role==='game'&&/^\/api\/auth\/(login|register|forgot-password|reset-password)$/.test(pathname)?{error:'Hesap işlemi için güvenli giriş sayfasına devam et.',code:'account_origin_required',redirectUrl:'/api/realm/begin'}:{error:'Bu işlem bu sunucuda kullanılamaz.'},{status:403,headers:{'cache-control':'no-store'}});
   if(pathname.startsWith('/afk/'))return c.afkCheck?c.afkCheck.image(request):new Response(null,{status:404,headers:{'cache-control':'no-store'}});
   if(pathname==='/api/vds-health'&&request.method==='GET')return this.health();
   // One small static read at game startup; no database or writer admission.
   if(pathname==='/api/core511-ui-options')return request.method==='GET'?new Response(R40_UI_OPTIONS_BODY,{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}}):new Response(null,{status:405,headers:{allow:'GET','cache-control':'no-store'}});
   if(pathname==='/api/core511-r43-options')return request.method==='GET'?new Response(R43_UI_OPTIONS_BODY,{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}}):new Response(null,{status:405,headers:{allow:'GET','cache-control':'no-store'}});
   if(pathname==='/api/core511-r44-options')return request.method==='GET'?new Response(R44_UI_OPTIONS_BODY,{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}}):new Response(null,{status:405,headers:{allow:'GET','cache-control':'no-store'}});
   if(pathname==='/api/core511-r45-options')return request.method==='GET'?new Response(R45_UI_OPTIONS_BODY,{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}}):new Response(null,{status:405,headers:{allow:'GET','cache-control':'no-store'}});
   if(pathname==='/api/core511-r46-options')return request.method==='GET'?new Response(R46_UI_OPTIONS_BODY,{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}}):new Response(null,{status:405,headers:{allow:'GET','cache-control':'no-store'}});
   if(pathname==='/api/core511-r50-claim-options')return request.method==='GET'?new Response(R50_CLAIM_UI_OPTIONS_BODY,{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}}):new Response(null,{status:405,headers:{allow:'GET','cache-control':'no-store'}});
   if(pathname==='/api/core511-r49-options')return request.method==='GET'?Response.json({polishR62:{azrail:process.env.CORE511_R62_AZRAIL==='1',chestMarket:process.env.CORE511_R62_CHEST_MARKET==='1',inventory:process.env.CORE511_R62_INVENTORY==='1',verification:process.env.CORE511_R62_VERIFICATION==='1'},mounts:mountEnabled(),gameplayR55,gameplayR58,gameplayR60,castleR59:castleEnabled(),remoteAudioR61:process.env.CORE511_R61_REMOTE_AUDIO==='1',castleTravelR61:process.env.CORE511_R61_CASTLE_TRAVEL==='1'},{headers:{'cache-control':'no-store'}}):new Response(null,{status:405,headers:{allow:'GET','cache-control':'no-store'}});
   if(pathname==='/api/realtime/core511-market')return tradeGlassHttp(c,request);
   const castle=await this.castle.route(request);if(castle)return castle;
   const response=await c.http(request);return normalizeBagResponse(response??await native());
  }).finally(()=>this.pending.delete(task));this.pending.add(task);return task;
 }
 health(){
  const c=this.core(),host=this.host,counts=c.nativeBootstrap.counts(),rows=CHANNELS.map(channel=>{const r=c.channelSupervisor?.rows.get(channel),p=c.processes.get(channel);return {channel,ready:Boolean(r?.state==='running'&&!r.exited&&r.ready&&p?.online&&r.peer.incarnation===p.peer.incarnation),online:counts.get(channel)??0,capacity:CAPACITY};});
  const world=c.sharedWorld?.row,worldReady=Boolean(world?.state==='running'&&!world.exited),readerReady=Boolean(!c.reader.closed&&c.reader.slot&&!c.reader.slot.failed&&!c.reader.slot.ended),realmReady=Boolean(host.nativeRealmStartup?.ready&&host.nativeRealmStartup.runtime===c.realm),ready=this.accepting&&!c.stopping&&!c.recoveringWorld&&!c.globalWorld?.recovery&&worldReady&&readerReady&&realmReady&&rows.every(r=>r.ready);
  const checkpoint=host.database.core511CheckpointR79?.snapshot(),checkpointR79={...publicCheckpointR80(checkpoint),sqliteVersion:process.versions.sqlite,nodeVersion:process.version};
  return Response.json({ok:ready,runtime:'vds-node-sqlite',loadlabProtocol:1,releaseVersion:'511',updateVersion:'R87_GAMEPLAY',durable:true,protocol:PROTOCOL,startupId:host.boot,checkpointR79,runtimeDiagnosticsR80:runtimeHealthR80(c),realm:{realmId:host.expected.realmId,dbIdentity:host.expected.dbIdentity,protocol:PROTOCOL,ready,sampledAtMs:c.clock(),channelCapacity:CAPACITY,channels:rows.map(r=>r.online)},channelProcesses:{enabled:true,channels:rows},kernel511:{worldReady,readerReady,realmReady,ready,towerReady:this.towerReady===true,adventureReady:!!this.mistAdmin,guildReaderReady:this.guildReader?.ready===true&&!this.guildReader.closed}},{status:ready?200:503,headers:{'cache-control':'no-store'}});
 }
 async stop(){this.accepting=false;await Promise.allSettled([...this.pending]);await this.guildReader?.close();}
 core(){
  const host=this.host,c=host.core;host.assertOpen();
  demand(this.initialized&&!this.closed&&globalThis[bindingKey]===this&&globalThis[databaseKey]===host.database&&host.nativeHttp===this&&c&&!c.closed&&c.host===host&&c.database===host.database,'native_http_core_binding');
  return c;
 }
 restore(){if(this.host.database.core511CastleR59===this.castle)delete this.host.database.core511CastleR59;if(this.host.database.core511MaterialGrantR55===this.materialGrant)delete this.host.database.core511MaterialGrantR55;if(this.host.database.core511MountDropsR55===this.mountDrops)delete this.host.database.core511MountDropsR55;if(this.host.database.core511MountR49===this.mountHttp)delete this.host.database.core511MountR49;if(this.host.database.core511MountGrantR49===this.mountGrant)delete this.host.database.core511MountGrantR49;if(this.host.database.core511AzrailGrant===this.azrailGrant)delete this.host.database.core511AzrailGrant;if(this.host.database.core511GuildReader===this.guildReader)delete this.host.database.core511GuildReader;void this.guildReader?.close();for(const [key,descriptor]of this.before)restore(globalThis,key,descriptor);restore(this.host.database,'coordinatorOnly',this.coordinatorDescriptor);delete this.host.database.nativeOperation;if(this.host.database.core511MistAdmin===this.mistAdmin)delete this.host.database.core511MistAdmin;if(this.host.database.core511TowerAdmin===this.towerAdmin)delete this.host.database.core511TowerAdmin;if(this.host.nativeHttp===this)delete this.host.nativeHttp;this.closed=true;}
 close(){if(this.closed)return;demand(this.host.closed,'native_http_host_still_open');demand(globalThis[bindingKey]===this,'native_http_binding_replaced');this.restore();}
}
