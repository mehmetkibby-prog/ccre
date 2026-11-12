// R110 WebSocket socket handoff through the EXACT installed runtime entry,
// ingress and channel processes (stage-candidate.py). Real Caddy-style proxy
// headers, real ingress authorization and gate, real channel upgrade checks.
// The kernel's /proc tables show which process owns each accepted client
// socket, so the test can tell a handed-over socket from the TCP proxy.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID,randomBytes,generateKeyPairSync} from 'node:crypto';
import {WebSocket} from '/tmp/core511-build-deps/node_modules/ws/wrapper.mjs';
const root=path.resolve(import.meta.dirname,'..'),stage=JSON.parse(fs.readFileSync(process.env.HANDOFF_STAGE_FILE||root+'/evidence/runtime-stage-candidate.json')),release=stage.release,core=release+'/core511-source/scripts/core511',native=release+'/native510-bb3a6cc689c6/vds-server/src';
const {RealmServiceVerifier}=await import(core+'/realm-service-auth-r101.mjs');
const {createEmptyRealmWorld}=await import(native+'/realm-world-bootstrap.mjs');
const {LocalDatabase}=await import(native+'/database.mjs');
const {prepareNewRealmSchemaR101}=await import(core+'/generated/new-realm-schema-r101.mjs');
const {createNativeWorldStartup}=await import(core+'/generated/native-world-startup.mjs');
const {DatabaseHost}=await import(core+'/database-host.mjs');
const {NativeWorldStartup}=await import(core+'/native-world-startup.mjs');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const s=http.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function stop(c){if(c.exitCode!==null)return {code:c.exitCode,ms:0};const started=Date.now(),done=once(c,'exit');c.kill('SIGTERM');await Promise.race([done,pause(10000)]);if(c.exitCode===null){process.kill(-c.pid,'SIGKILL');await done;}return {code:c.exitCode,ms:Date.now()-started};}
async function seed(realm){
 fs.mkdirSync(realm.dataRoot);createEmptyRealmWorld({destination:realm.database,realmId:realm.id,dbIdentity:realm.dbIdentity});
 const database=new LocalDatabase(realm.database,{groupWrites:false,asyncDurable:false});
 try{await prepareNewRealmSchemaR101(database.sqlite,{database:realm.database});await createNativeWorldStartup(database).ensureWorldSeed();database.sqlite.prepare('UPDATE game_settings SET channel_capacity=? WHERE id=1').run(realm.initialChannelCapacity);await database.durableAfterCommit();}finally{database.close();}
 const host=await DatabaseHost.open({file:realm.database,realmId:realm.id,dbIdentity:realm.dbIdentity});try{await host.bootstrap();await NativeWorldStartup.prepare(host);}finally{await host.close();}
}
// Which process holds the server side of 127.0.0.1:<localPort> <-> <remotePort>?
function owners(localPort,remotePort){
 const hex=n=>n.toString(16).toUpperCase().padStart(4,'0'),inodes=new Set();
 for(const file of ['/proc/net/tcp','/proc/net/tcp6'].filter(f=>fs.existsSync(f)))for(const line of fs.readFileSync(file,'utf8').trim().split('\n').slice(1)){
  const f=line.trim().split(/\s+/);if(f[1].endsWith(':'+hex(localPort))&&f[2].endsWith(':'+hex(remotePort))&&f[3]==='01')inodes.add('socket:['+f[9]+']');
 }
 const found=new Set();
 for(const pid of fs.readdirSync('/proc').filter(n=>/^\d+$/.test(n))){let fds=[];try{fds=fs.readdirSync('/proc/'+pid+'/fd');}catch{continue;}for(const fd of fds){try{if(inodes.has(fs.readlinkSync('/proc/'+pid+'/fd/'+fd)))found.add(Number(pid));}catch{}}}
 return [...found];
}
const parentOf=pid=>Number(fs.readFileSync('/proc/'+pid+'/stat','utf8').split(') ')[1].split(' ')[1]);
function connect(realm,config,{channel=1,ip='203.0.113.7',sendOnOpen=true}={}){
 const ws=new WebSocket('ws://127.0.0.1:'+realm.ports.proxy+'/_game/game/channel/'+channel,{origin:'https://'+config.hosts[0],headers:{'x-col-proxy-token':config.proxyToken,'x-col-public-host':config.hosts[0],'x-col-client-ip':ip}});
 const result={ws,opened:null,closed:null,code:null,status:null,localPort:null};const started=Date.now();
 result.auth=()=>ws.send(JSON.stringify({type:'auth',ticket:'invalid-'+randomUUID(),capabilities:[]}));
 ws.on('open',()=>{result.opened=Date.now()-started;result.localPort=ws._socket.localPort;
  // The first frame leaves immediately: exactly the bytes a lost-read race
  // would swallow. An invalid ticket is refused by the channel with 1008;
  // a lost frame would instead hit the 4001 authentication timeout (4 s).
  if(sendOnOpen)result.auth();});
 result.done=new Promise(resolve=>{ws.on('close',code=>{result.closed=Date.now()-started;result.code=code;resolve(result);});ws.on('error',error=>{const m=/Unexpected server response: (\d+)/.exec(error.message);if(m)result.status=Number(m[1]);});});
 result.open=new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('close',()=>reject(Error('closed before open: '+result.status)));});result.open.catch(()=>{});
 return result;
}
async function startRealm(realm,config,env){
 const configFile=realm.dataRoot+'/config.json';fs.writeFileSync(configFile,JSON.stringify({...config,environment:{...config.environment,...env}}));
 const childEnv={...process.env,CORE_CONFIG_FILE:configFile};delete childEnv.COL_CORE511_BASE;
 const child=spawn(process.execPath,[release+'/core511-source/scripts/delivery511/runtime-entry.mjs'],{detached:true,env:childEnv,stdio:['ignore','pipe','pipe']});child.output='';child.stdout.on('data',b=>child.output+=b);child.stderr.on('data',b=>child.output+=b);
 const end=Date.now()+40000;let health;
 while(Date.now()<end){assert.equal(child.exitCode,null,child.output);try{const response=await fetch('http://127.0.0.1:'+realm.ports.app+'/api/vds-health',{signal:AbortSignal.timeout(1000)});health=await response.json();if(response.ok&&health.ok)break;}catch{}await pause(100);}
 assert(health?.ok,child.output);assert.equal(health.realm.realmId,realm.id);assert.equal(health.channelProcesses.channels.length,4);assert(health.channelProcesses.channels.every(c=>c.ready&&c.capacity===realm.initialChannelCapacity));
 return child;
}
test('installed runtime hands player WebSockets to channel processes for both realms; R109 proxy remains the =0 fallback',{timeout:240000},async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r110-handoff-data-')),keys=new Map([['r1',randomBytes(32)],['r2',randomBytes(32)]]),verifier=new RealmServiceVerifier(keys),children=new Set();
 const accounts=http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks).toString(),pathname=req.headers['x-col-service-path'];assert(verifier.verify({method:'POST',pathname,headers:req.headers,body}));assert.equal(pathname,'/internal/maintenance/status');res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({revision:1,phase:'maintenance',startedAt:0,deadlineMs:0,adminAccountId:'',maintenanceText:''}));}catch(e){res.writeHead(500);res.end(JSON.stringify({error:e.message}));}});accounts.listen(0,'127.0.0.1');await once(accounts,'listening');
 t.after(async()=>{for(const c of children)await stop(c);accounts.closeAllConnections();await new Promise(r=>accounts.close(r));fs.rmSync(dir,{recursive:true,force:true});});
 const ports=await Promise.all(Array.from({length:18},port));assert.equal(new Set(ports).size,18);
 const realms=['r1','r2'].map((id,i)=>({id,name:i?'Core Akademi':'Core Efsane',status:'maintenance',registrationOpen:true,channels:4,initialChannelCapacity:i?10:25,coreProtocol:'coreoflife-kernel-v1',origin:`https://${id}.fixture.invalid`,realtimeOrigin:`https://rt-${id}.fixture.invalid`,dataRoot:path.join(dir,id),database:path.join(dir,id,'game.sqlite'),dbIdentity:randomUUID(),ports:{proxy:ports[i*9],app:ports[i*9+1],realtime:ports[i*9+2],dungeon:ports[i*9+3],voice:ports[i*9+4],channels:ports.slice(i*9+5,i*9+9)}}));
 fs.writeFileSync(dir+'/manifest.json',JSON.stringify({version:1,phase:'101',primaryRealmId:'r1',accountsDatabase:dir+'/accounts.sqlite',authOrigin:'https://accounts.fixture.invalid',authPort:accounts.address().port,realms}));
 const evidence=[];
 for(const [realm,mode] of [[realms[0],'1'],[realms[0],'0'],[realms[1],'1']]){
  if(!fs.existsSync(realm.dataRoot)){await seed(realm);fs.writeFileSync(realm.dataRoot+'/service.key',keys.get(realm.id).toString('hex'));}
  const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const config={database:realm.database,hosts:[realm.id+'.fixture.invalid'],proxyToken:randomBytes(32).toString('hex'),environment:{CORE101_REALM_ID:realm.id,CORE_REALM_ID:realm.id,CORE_DATA_ROOT:realm.dataRoot,CORE511_RETENTION:'1',CORE511_OUTBOX_V2:'1',REALTIME_SIGNING_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'der'}).toString('base64')},realm:{role:'game',id:realm.id,dbIdentity:realm.dbIdentity,manifestFile:dir+'/manifest.json',keyFile:realm.dataRoot+'/service.key'},delivery511:{releaseRoot:release,appPort:realm.ports.app,proxyPort:realm.ports.proxy,channelPorts:realm.ports.channels}};
  const child=await startRealm(realm,config,{CORE511_R110_WS_HANDOFF:mode});children.add(child);
  const row={realm:realm.id,handoff:mode==='1',connections:[]};
  // Ingress authorization is unchanged: a wrong proxy token never reaches a channel.
  const forged=connect(realm,{...config,proxyToken:'0'.repeat(64)},{sendOnOpen:false});await forged.done;assert.equal(forged.status,403);assert.equal(forged.opened,null);
  // One socket per channel: owner process, first frame, reply time.
  for(const channel of [1,2,3,4]){
   // (a) First frame sent the instant the 101 arrives.
   const fast=connect(realm,config,{channel,ip:'203.0.113.'+channel});await fast.open.catch(error=>assert.fail(error.message+' '+child.output.slice(-2000)));await fast.done;
   assert.equal(fast.code,1008,'channel answered the first frame');assert(fast.closed<3500,'no authentication timeout: '+fast.closed);
   // (b) Owner of an open socket that has not sent anything yet.
   const c=connect(realm,config,{channel,ip:'203.0.113.'+(10+channel),sendOnOpen:false});await c.open;
   let held=owners(realm.ports.proxy,c.localPort);const until=Date.now()+3000;
   // Until the realm sees the child's ACK both processes hold the descriptor.
   while(mode==='1'&&held.includes(child.pid)&&Date.now()<until){await pause(20);held=owners(realm.ports.proxy,c.localPort);}
   c.auth();await c.done;assert.equal(c.code,1008);
   if(mode==='1'){assert.equal(held.length,1,JSON.stringify(held));assert.notEqual(held[0],child.pid);assert.equal(parentOf(held[0]),child.pid,'a channel child of this realm owns the client socket');}
   else assert.deepEqual(held,[child.pid],'R109 TCP proxy keeps the socket in the realm process');
   row.connections.push({channel,openMs:fast.opened,firstReplyMs:fast.closed,code:fast.code,ownerIsChannel:held[0]!==child.pid});
  }
  // A reconnect burst (same source IP pool, 24 sockets at once) on one channel:
  // every first frame is answered; none times out; the realm still serves HTTP.
  const burst=Array.from({length:24},(_,n)=>connect(realm,config,{channel:1,ip:'198.51.100.'+(10+n%12)}));
  const settled=await Promise.all(burst.map(c=>c.done));
  const opened=settled.filter(c=>c.opened!==null);
  assert(opened.length>=1,'burst connections opened');
  for(const c of opened){assert.equal(c.code,1008);assert(c.closed<3500,'burst first frame answered: '+c.closed);}
  for(const c of settled.filter(c=>c.opened===null))assert([429,503].includes(c.status),'only admission limits refuse a burst socket: '+c.status);
  const ready=await(await fetch('http://127.0.0.1:'+realm.ports.proxy+'/full-readyz')).json();assert.equal(ready.ok,true);
  row.burst={sockets:burst.length,opened:opened.length,refused:settled.filter(c=>c.opened===null).map(c=>c.status),maxFirstReplyMs:Math.max(...opened.map(c=>c.closed))};
  // Clean shutdown while a handed-over socket is still open.
  const open=connect(realm,config,{channel:2,ip:'203.0.113.99',sendOnOpen:false});await open.open;
  const stopped=await stop(child);children.delete(child);await open.done;
  assert.equal(stopped.code,0,child.output);assert(stopped.ms<8000,'shutdown '+stopped.ms);
  row.shutdown=stopped;evidence.push(row);
 }
 fs.writeFileSync(process.env.HANDOFF_EVIDENCE_FILE||root+'/evidence/ws-handoff-runtime.json',JSON.stringify({release,overlay:stage.overlay.map(r=>r.path),realRuntimeEntry:true,results:evidence},null,2)+'\n');
});
