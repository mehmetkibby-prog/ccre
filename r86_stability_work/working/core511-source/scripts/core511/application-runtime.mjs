import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateKeyPairSync} from 'node:crypto';
import {once} from 'node:events';
import {DatabaseHost} from './database-host.mjs';
import {NativeWorldStartup} from './native-world-startup.mjs';
import {NativeRealmStartup} from './native-realm-startup.mjs';
import {NativeHttpBindings} from './native-http-bindings.mjs';
import {NativeHttpServer} from './native-http-server.mjs';
import {GameWriter} from './writer-runtime.mjs';
import {createNativeWriterGuard} from './native-writer-guard.mjs';
import {createNativeEntryAuth,EntryWriter} from './entry-writer.mjs';
import {ReadWorker} from './read-worker.mjs';
import {CoreCoordinator} from './coordinator.mjs';
import {WorldProcessSupervisor} from './world-supervisor.mjs';
import {ChannelProcessSupervisor} from './process-supervisor.mjs';
import {startGuildVoiceProxy} from '../../../native510-bb3a6cc689c6/vds-server/src/guild-voice-proxy.mjs';
import {demand} from './contract.mjs';

export async function openApplicationRuntime({config,realm,onFault}){
 const host=await DatabaseHost.open({file:config.database,realmId:realm.id,dbIdentity:realm.dbIdentity});let reader,core,voice;
 const close=async()=>{voice?.close();await host.close();if(!host.core)await reader?.close();};
 try{
  await host.bootstrap();await NativeWorldStartup.prepare(host);await NativeRealmStartup.prepare(host,config);const bindings=await NativeHttpBindings.open(host);
  const writer=new GameWriter(host.database,{realmId:realm.id,ports:{guard:createNativeWriterGuard(()=>core)}});await host.prepareWriter(writer);
  const auth=createNativeEntryAuth({database:host.database,globals:globalThis}),entry=new EntryWriter({database:host.database,services:writer.services});reader=new ReadWorker(host.file,new Map(),{actorBundles:true});
  const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});core=new CoreCoordinator({host,writer,reader,auth,entry,privateKey,origins:new Set([realm.origin]),realmId:realm.id,bot:bindings.services.__colBotCheck,launch:bindings.services.__colLaunch,guild:bindings.services.__colGuildVillage,onFault});
  const listeners=Object.fromEntries(realm.ports.channels.map((port,i)=>[i+1,{host:'127.0.0.1',port}])),webSocketModule=fileURLToPath(new URL('../../../native510-bb3a6cc689c6/node_modules/ws/wrapper.mjs',import.meta.url));
  const channels=new ChannelProcessSupervisor(core,{webSocketModule,listeners,onFault}),world=new WorldProcessSupervisor(core,{onFault});await world.start();await channels.start();core.start();
  voice=startGuildVoiceProxy(bindings.services.__colGuildVoice,{port:realm.ports.voice,upstreamPort:Number(config.environment?.CORE_VOICE_UPSTREAM_PORT??7880)});if(!voice.server.listening)await once(voice.server,'listening');
  const server=await NativeHttpServer.start(host,{outDir:path.resolve(config.kernel511.outDir),port:realm.ports.app,hosts:config.hosts});demand(bindings.health().status===200,'application_not_ready');
  return {host,core,writer,reader,world,channels,server,close};
 }catch(error){try{await close();}catch(cleanup){throw new AggregateError([error,cleanup],'application_startup_cleanup_failed');}throw error;}
}
