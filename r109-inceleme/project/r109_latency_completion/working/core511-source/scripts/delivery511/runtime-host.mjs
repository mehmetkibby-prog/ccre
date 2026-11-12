import {realmLoadLabConfigR101} from '../core511/realm-loadlab-r101.mjs';
import {createFaultReporter} from '../core511/fence-diagnostics.mjs';
import path from 'node:path';
import {once} from 'node:events';
import {startGuildVoiceProxy} from '../../../native510-bb3a6cc689c6/vds-server/src/guild-voice-proxy.mjs';
import {attachAdminEntry} from './admin-entry.mjs';
import {attachPanelRuntime} from './panel-control.mjs';
import {installRegistry} from '../../../native510-bb3a6cc689c6/vds-server/src/loadlab/registry.mjs';
import {seedRegistryFrame} from '../../../native510-bb3a6cc689c6/vds-server/src/loadlab/realm-control.mjs';
import {VERSION as LOADLAB_VERSION} from '../../../native510-bb3a6cc689c6/vds-server/src/loadlab/protocol.mjs';
import {installedSigningKey} from './installed-key.mjs';
import {DatabaseHost} from '../core511/database-host.mjs';
import {NativeWorldStartup} from '../core511/native-world-startup.mjs';
import {NativeRealmStartup} from '../core511/native-realm-startup.mjs';
import {NativeHttpBindings} from '../core511/native-http-bindings.mjs';
import {NativeHttpServer} from '../core511/native-http-server.mjs';
import {GameWriter} from '../core511/writer-runtime.mjs';
import {createNativeWriterGuard} from '../core511/native-writer-guard.mjs';
import {EntryWriter,createNativeEntryAuth} from '../core511/entry-writer.mjs';
import {CoreCoordinator} from '../core511/coordinator.mjs';
import {ReadWorker} from '../core511/read-worker.mjs';
import {ChannelProcessSupervisor} from '../core511/process-supervisor.mjs';
import {WorldProcessSupervisor} from '../core511/world-supervisor.mjs';
import {startIngress} from './runtime-ingress.mjs';
import {demand} from '../core511/contract.mjs';

export async function startRuntime(config){
 const d=config.delivery511,host=await DatabaseHost.open({file:config.database,realmId:config.realm.id,dbIdentity:config.realm.dbIdentity});let core,ingress,panel,loadlab,academyVoice;
 try{
  await host.bootstrap();await NativeWorldStartup.prepare(host);await NativeRealmStartup.prepare(host,config);
  loadlab=installRegistry({config:realmLoadLabConfigR101(host.database.sqlite,host.expected),readSeed:()=>seedRegistryFrame(host.database.sqlite,LOADLAB_VERSION)});
  const bindings=await NativeHttpBindings.open(host),g=bindings.services;
  const writer=new GameWriter(host.database,{realmId:config.realm.id,ports:{guard:createNativeWriterGuard(()=>core)}});await host.prepareWriter(writer);
  const privateKey=installedSigningKey(config);
  const reader=new ReadWorker(host.file,new Map(),{actorBundles:true});
  const fault=createFaultReporter(text=>process.stderr.write(text));
  core=new CoreCoordinator({host,writer,reader,auth:createNativeEntryAuth({database:host.database,globals:globalThis}),entry:new EntryWriter({database:host.database,services:writer.services}),privateKey,origins:new Set(config.hosts.map(h=>'https://'+h)),realmId:config.realm.id,bot:g.__colBotCheck,launch:g.__colLaunch,guild:g.__colGuildVillage,onFault:fault});
  demand(d.channelPorts?.length===4&&new Set(d.channelPorts).size===4,'delivery_channel_ports');
  const listeners=Object.fromEntries(d.channelPorts.map((port,i)=>[i+1,{host:'127.0.0.1',port}]));
  const supervisor=new ChannelProcessSupervisor(core,{listeners,webSocketModule:path.join(d.releaseRoot,'native510-bb3a6cc689c6/node_modules/ws/wrapper.mjs'),onFault:fault}),world=new WorldProcessSupervisor(core,{onFault:fault});
  panel=attachPanelRuntime({host,core,world});
  await world.start();await supervisor.start();core.start();
  await NativeHttpServer.start(host,{outDir:path.join(d.releaseRoot,'http-runtime/dist-vds'),port:d.appPort,hosts:config.hosts});
  if(config.realm.id==='r2'&&config.environment?.CORE101_REALM_ID==='r2'){academyVoice=startGuildVoiceProxy(g.__colGuildVoice,{port:globalThis.__colRealm.realm.ports.voice,upstreamPort:Number(config.environment?.CORE_VOICE_UPSTREAM_PORT??7880)});if(!academyVoice.server.listening)await once(academyVoice.server,'listening');}
  panel.attachHttp(host.nativeHttpServer.server);
  attachAdminEntry(host.nativeHttpServer.server,{runtime:globalThis.__colRealm,launch:globalThis.__colLaunch});
  ingress=await startIngress({config,health:()=>host.nativeHttp.health(),acceptsPlay:()=>panel.acceptsPlay(),gateStatus:()=>panel.playGateStatus()});
  return {host,core,ingress,close:async()=>{academyVoice?.close();try{await ingress.close();await panel.close();}finally{try{await host.close();}finally{loadlab?.close();}}}};
 }catch(e){academyVoice?.close();await ingress?.close().catch(()=>{});await panel?.close().catch(()=>{});await host.close().catch(()=>{});loadlab?.close();throw e;}
}
