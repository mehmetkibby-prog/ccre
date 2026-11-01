import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {MessageChannel} from 'node:worker_threads';
import {once} from 'node:events';
import {setupEntry} from './entry-fixture.mjs';
import {until} from './helpers.mjs';
import {CoreCoordinator,IpcReplay} from '../coordinator.mjs';
import {ChannelRuntime} from '../channel-runtime.mjs';
import {GameWriter} from '../writer-runtime.mjs';
import {ReadWorker} from '../read-worker.mjs';
import {ReliableStream} from '../reliable-stream.mjs';
import {MessagePortStream} from '../message-port-stream.mjs';
import {PROTOCOL} from '../contract.mjs';
const {WebSocket,WebSocketServer}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');

test('IPC replay shares result, rejects changed content and retains retired sequence fencing after cache eviction',async()=>{
 const replay=new IpcReplay({limit:2}),prefix=randomUUID();let calls=0,release;const hold=new Promise(r=>release=r),work=()=>{calls++;return hold;};
 const first=replay.run(prefix+':1','reserve',{ip:'a'},work);assert.equal(replay.run(prefix+':1','reserve',{ip:'a'},work),first);assert.throws(()=>replay.run(prefix+':1','reserve',{ip:'b'},work),/ipc_request_id_reused/);
 release('original');assert.equal(await first,'original');assert.equal(calls,1);
 await replay.run(prefix+':2','read',{},()=>2);await replay.run(prefix+':3','read',{},()=>3);assert.throws(()=>replay.run(prefix+':1','reserve',{ip:'a'},work),/ipc_request_retired/);assert.equal(calls,1);
});

test('four native channel runtimes: HTTP auth, movement, rare-operation fence, channel4 transfer, reconnect, logout and ban',{timeout:30000},async t=>{
 const f=await setupEntry(t),{sql,id,clock}=f,realmId='coordinator511',faults=[],streams=[],runtimes=[],servers=[],clients=[];let writer;
 // Deliberately a selected integration fixture. Production world/mode ports
 // are not represented by these callbacks and no load acceptance is claimed.
 writer=new GameWriter(f.f.database,{realmId,clock,ports:{guard:()=>true,assertResources:(db,p,c)=>Boolean(writer.authority.assertAdmitted(db,c.peer,c.actor,c.epoch)),affectedActors:()=>[],enforceRateLimit:()=>null,recordSecurityEvent:()=>assert.fail('unexpected security'),mixedPorts:()=>({selectMixedMonsters473:()=>[]}),resolveRecipients:()=>[id]}});
 await writer.initialize();const reader=new ReadWorker(f.f.file,new Map(),{actorBundles:true});
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),origins=new Set([f.origin]);
 const coordinator=new CoreCoordinator({writer,reader,entry:f.entry,auth:f.auth,privateKey,origins,realmId,bot:f.bot,launch:f.globals.__colLaunch,guild:{deadline:()=>Infinity},clock,onFault:e=>faults.push(e)});
 t.after(async()=>{for(const ws of clients)ws.terminate();for(const runtime of runtimes)runtime.close();for(const stream of streams)stream.close();coordinator.close();for(const server of servers)server.destroy();await reader.close();});
 for(const channel of [1,2,3,4]){
  const peer={realm:realmId,channel,incarnation:'coordinator-boot-'+channel},credential=await coordinator.register(peer),initial=await coordinator.boot(peer);let runtime;
  const stream=new ReliableStream({retryMs:2,handshake:()=>({...peer,proof:credential.proof}),open:()=>{const {port1,port2}=new MessageChannel(),server=new MessagePortStream(port2);servers.push(server);coordinator.accept(server);return new MessagePortStream(port1);},control:(...args)=>runtime.control(...args)});
  runtime=new ChannelRuntime({peer,initial,publicKey,origins,request:(...args)=>stream.request(...args),clock,onFatal:error=>faults.push({error}),mechanics:{footprint:()=>({players:[],resources:[]}),affectedAttack:()=>[],affectedPvp:()=>[],rankingEligible:()=>false,monsterOwned:m=>m.channel===channel,changedArenaLife:()=>false,modeRate:()=>assert.fail('unexercised mode'),modeTick:()=>{},respawn:()=>{},recordSecurityEvent:()=>assert.fail('unexpected security event'),mixedPlayers:()=>[],mixedMonsters:()=>[],mixedAttack:()=>assert.fail('unexercised mixed'),mixedPvp:{selectMixedMonsters473:()=>[]},waveView:()=>null,profile:()=>assert.fail('unexercised profile')}});
  stream.start();streams.push(stream);runtimes.push(runtime);runtime.start();runtime.endpoint(WebSocketServer);
 }
 const http=async(path,body={})=>{const response=await coordinator.http(f.request({path:'/api/realtime/core511-'+path,body:{protocol:PROTOCOL,...body}}));return {status:response.status,...await response.json()};};
 const fail=()=>assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
 const obsolete=await coordinator.http(f.request({body:{protocol:'old'}}));assert.equal(obsolete.status,428);
 let ticket=await http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));assert.equal(ticket.channel,2);assert.equal(writer.authority.counts().get(2),1);
 async function connect(ticket){const runtime=runtimes[ticket.channel-1],{port1,port2}=new MessageChannel(),client=new MessagePortStream(port1),server=new MessagePortStream(port2);servers.push(client,server);Object.defineProperty(server,'remoteAddress',{value:'127.0.0.1'});runtime.webSocketEndpoint.server.emit('connection',server);const ws=new WebSocket('ws://127.0.0.1'+ticket.url,{createConnection:()=>client,origin:f.origin}),packets=[];clients.push(ws);ws.on('error',()=>{});ws.on('message',bytes=>packets.push(JSON.parse(bytes)));await once(ws,'open');ws.send(JSON.stringify({type:'auth',ticket:ticket.ticket}));await until(()=>packets.some(p=>p.type==='ready')||faults.length);fail();return {ws,packets,runtime};}
 let live=await connect(ticket);await until(()=>live.packets.some(p=>p.world?.type==='world_snapshot')||faults.length);fail();
 const p=live.runtime.channel.view.player(id);f.setTime(clock()+200);live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'move',x:p.x+5,y:p.y,area:p.area,basePositionRevision:p.position_revision}}));await until(()=>live.runtime.channel.kernel.players.get(id).lastApplied===1||faults.length);fail();
 await coordinator.permanentPlayers([id],()=>{assert.equal(live.runtime.channel.kernel.players.get(id).suspended,true);sql.prepare('UPDATE players SET potions=potions+1 WHERE id=?').run(id);});assert.equal(live.runtime.channel.kernel.players.get(id).suspended,false);assert.equal(live.runtime.channel.control.entries.size,0);
 const oldPeer=live.runtime.peer,oldEpoch=ticket.epoch;await live.runtime.flushPresence();
 ticket=await http('transfer',{channel:4});assert.equal(ticket.status,200,JSON.stringify(ticket));assert.equal(ticket.channel,4);assert.equal(sql.prepare('SELECT channel FROM players WHERE id=?').get(id).channel,4);assert.equal(runtimes[1].channel.owners.has(id),false);assert.equal(runtimes[1].channel.control.entries.size,0);fail();
 await assert.rejects(coordinator.route(oldPeer,'presence',[{actor:id,epoch:oldEpoch,at:clock(),version:99}]),/presence_owner_fenced/);
 await assert.rejects(coordinator.route(oldPeer,'command',{playerId:id,epoch:oldEpoch,sequence:1,operationId:'stale-old',operation:'actor_checkpoint',payload:{}}),/owner_epoch_fenced/);
 live=await connect(ticket);await live.runtime.flushPresence();const epoch=ticket.epoch;live.ws.terminate();await until(()=>coordinator.sessions.get(id).disconnectedAt!==null||faults.length);fail();
 ticket=await http('ticket');assert.equal(ticket.channel,4);assert.equal(ticket.epoch,epoch);live=await connect(ticket);
 const logout=await http('logout');assert.equal(logout.status,200,JSON.stringify(logout));assert.equal(writer.authority.admission(id),null);assert.equal(runtimes[3].channel.control.entries.size,0);assert.equal(runtimes[3].channel.owners.has(id),false);fail();
 ticket=await http('ticket');assert.equal(ticket.channel,2);assert(ticket.epoch>epoch);live=await connect(ticket);
 sql.prepare('UPDATE accounts SET permanently_banned=1,security_version=security_version+1 WHERE id=?').run(f.account.id);const closed=once(live.ws,'close');await coordinator.refresh();assert.equal((await closed)[0],4003);const denied=await http('ticket');assert.equal(denied.status,401);assert(faults.every(row=>row.authentication===true));
});
