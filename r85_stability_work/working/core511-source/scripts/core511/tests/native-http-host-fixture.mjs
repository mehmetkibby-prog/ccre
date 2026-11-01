import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,generateKeyPairSync} from 'node:crypto';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {setupEntry} from './entry-fixture.mjs';
import {temporary,native,until} from './helpers.mjs';
import {DatabaseHost} from '../database-host.mjs';
import {NativeHttpBindings} from '../native-http-bindings.mjs';
import {NativeWorldStartup} from '../native-world-startup.mjs';
import {GameWriter} from '../writer-runtime.mjs';
import {createNativeWriterGuard} from '../native-writer-guard.mjs';
import {EntryWriter,createNativeEntryAuth} from '../entry-writer.mjs';
import {CoreCoordinator} from '../coordinator.mjs';
import {ReadWorker} from '../read-worker.mjs';
import {ChannelProcessSupervisor} from '../process-supervisor.mjs';
import {WorldProcessSupervisor} from '../world-supervisor.mjs';
import {PROTOCOL} from '../contract.mjs';
import {ProcessStream} from '../process-stream.mjs';
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');

// Isolated copy of the native fixture database. Production host, raw services,
// writer guard and channel mechanics; only listeners/identity transport remain
// fixture controlled. No production application or live database is started.
export async function nativeHttpHost(t,{start=true,realmSetup=null,listeners=null,channelEntry=path.join(import.meta.dirname,'process-channel-fixture.mjs')}={}){
 const cleanups=[],scope={after:fn=>cleanups.push(fn)},seed=await setupEntry(scope,{realTime:true}),expected={file:path.join(temporary(scope),'current.sqlite'),realmId:'native-http511',dbIdentity:randomUUID()};
 seed.sql.exec('PRAGMA synchronous=FULL');(await native('vds-server/src/realm-database-identity.mjs')).bindRealmDatabaseIdentity(seed.sql,expected);seed.sql.prepare('UPDATE world_state SET layout_version=24 WHERE id=1').run();seed.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');fs.copyFileSync(seed.f.file,expected.file);
 const host=await DatabaseHost.open(expected),clients=[],sockets=[];let bindings,core,reader;
 t.after(async()=>{try{for(const ws of clients)ws.terminate();for(const socket of sockets)socket.destroy();await host.close();}finally{if(host.closed){bindings?.close();for(const fn of cleanups)await fn();}}});
 await host.bootstrap();
 await NativeWorldStartup.prepare(host);
 if(!start)return {host,seed,bind:async()=>bindings=await NativeHttpBindings.open(host)};
 if(realmSetup)await realmSetup(host,seed);
 bindings=await NativeHttpBindings.open(host);const g=bindings.services,writer=new GameWriter(host.database,{realmId:expected.realmId,ports:{guard:createNativeWriterGuard(()=>core)}});await host.prepareWriter(writer);
 const auth=createNativeEntryAuth({database:host.database,globals:globalThis}),entry=new EntryWriter({database:host.database,services:writer.services});reader=new ReadWorker(host.file,new Map(),{actorBundles:true});
 const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),faults=[];
 core=new CoreCoordinator({host,writer,reader,auth,entry,privateKey,origins:new Set([seed.origin]),realmId:expected.realmId,bot:g.__colBotCheck,launch:g.__colLaunch,guild:g.__colGuildVillage,onFault:issue=>faults.push(issue)});
 const supervisor=new ChannelProcessSupervisor(core,{webSocketModule:'/tmp/core511-build-deps/node_modules/ws/wrapper.mjs',entry:channelEntry,listeners,onFault:issue=>faults.push(issue)}),world=new WorldProcessSupervisor(core,{onFault:issue=>faults.push(issue)});
 await world.start();await supervisor.start();
 const f={...seed,sql:host.database.sqlite,db:host.database,f:{...seed.f,file:host.file,database:host.database},auth,entry,services:writer.services,globals:globalThis,bot:g.__colBotCheck};
 const http=async(action,body={})=>{const response=await core.http(f.request({path:'/api/realtime/core511-'+action,body:{protocol:PROTOCOL,...body}}));return {status:response.status,...await response.json()};};
 async function connect(ticket){
  const row=supervisor.rows.get(ticket.channel),name='test-browser:'+randomUUID(),socket=new ProcessStream(row.child,{stream:name});sockets.push(socket);await new Promise((resolve,reject)=>row.child.send({type:'test-browser-connection',stream:name},e=>e?reject(e):resolve()));
  const ws=new WebSocket('ws://127.0.0.1'+ticket.url,{origin:f.origin,createConnection:()=>socket}),packets=[],errors=[];clients.push(ws);ws.on('error',error=>errors.push(error.message));ws.on('message',bytes=>packets.push(JSON.parse(bytes)));await once(ws,'open');const closed=once(ws,'close');ws.send(JSON.stringify({type:'auth',ticket:ticket.ticket}));await until(()=>packets.some(p=>p.type==='ready')||ws.readyState===3,7000);assert(packets.some(p=>p.type==='ready'),JSON.stringify(packets));return {ws,packets,errors,closed};
 }
 return {f,host,bindings,core,reader,writer,world,supervisor,faults,http,connect};
}
