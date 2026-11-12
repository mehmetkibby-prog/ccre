import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {MessageChannel} from 'node:worker_threads';
import {once} from 'node:events';
import {setupPvp,put} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';
import {ChannelRuntime} from '../channel-runtime.mjs';
import {GameWriter} from '../writer-runtime.mjs';
import {ReadWorker} from '../read-worker.mjs';
import {ConnectionBudget} from '../connection-budget.mjs';
import {ReliableStream,StreamControl,acceptStreamSocket} from '../reliable-stream.mjs';
import {MessagePortStream} from '../message-port-stream.mjs';
import {issueTicket} from '../ticket.mjs';
const {WebSocket,WebSocketServer}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');

test('channel assembly: native movement, attack, durable potion, cold refresh, WS reconnect, HTTP freeze/resume and ban over one duplex link',{timeout:15000},async t=>{
 const f=await setupPvp(t),{sql,id}=f;f.reset({area:'forest',actor:{x:2700,y:2025,hp:700,max_hp:1000,potions:2,movement_checked_at_ms:f.nowMs-200,position_revision:1}});
 const monster={id:'golge-assembly511',name:'assembly target',area:'forest',channel:1,x:2750,y:2025,hp:100000,max_hp:100000,spawn_round:1,variant:'normal'};put(sql,'monsters',monster);
 let time=f.nowMs,writer,runtime,actorReads=0;const faults=[],disconnects=[],sockets=[],realm='core511-assembly',peer={realm,channel:1,incarnation:'assembly-incarnation'},origin='https://game.invalid',budget=new ConnectionBudget({now:()=>time}),controls=new StreamControl();
 // This selects the real composition path. Other world/mixed/mode schedules
 // are deliberately not part of this integration test or its acceptance claim.
 writer=new GameWriter(f.f.database,{realmId:realm,clock:()=>time,ports:{
  guard:()=>true,assertResources:(db,p,c)=>Boolean(writer.authority.assertAdmitted(db,c.peer,c.actor,c.epoch)),affectedActors:()=>[],enforceRateLimit:()=>null,recordSecurityEvent:()=>assert.fail('unexpected security event'),mixedPorts:()=>({selectMixedMonsters473:()=>[]}),resolveRecipients:()=>[id]
 }});await writer.initialize();await writer.register(peer);const owner=await writer.admit(id,peer,{sessionId:'assembly-session',guard:()=>true});
 const reader=new ReadWorker(f.f.file,new Map(),{actorBundles:true});t.after(()=>reader.close());
 const account=sql.prepare('SELECT account_id FROM players WHERE id=?').get(id).account_id,version=sql.prepare('SELECT security_version FROM accounts WHERE id=?').get(account).security_version;
 const access={account,chatAfterId:0,starterReward:null},load=async revision=>(await reader.query('kernel511_actor_world',[id,1,peer.incarnation,owner.epoch,revision,time,access])).rows;
 const initial=(await reader.query('kernel511_channel_boot',[1,peer.incarnation,0,time])).rows;
 const stream=new ReliableStream({retryMs:2,open:()=>{
  const {port1,port2}=new MessageChannel(),server=new MessagePortStream(port2);sockets.push(server);
  acceptStreamSocket(server,{authenticate:h=>h.proof==='assembly-proof'?peer:null,controlFor:()=>controls,dispatch:async(p,method,payload)=>{
   if(method==='command')return writer.command(p,payload);
   if(method==='system_command')return writer.system.command(p,payload);
   if(method==='read_actor'){actorReads++;return load(payload.revision);}
   if(method==='presence'){writer.presence.receive(p,payload);return {ok:true};}
   if(method==='connection_reserve')return budget.reserve(payload.ip,p.incarnation);
   if(method==='connection_activate')return budget.activate(payload.lease,p.incarnation);
   if(method==='connection_release')return budget.release(payload.lease,p.incarnation);
   if(method==='notification_pending')return writer.notificationPending(p,payload);
   if(method==='notification_ack')return writer.notificationAck(p,payload);
   if(method==='disconnected'){disconnects.push(payload);return {ok:true};}
   assert.fail('unexpected IPC method '+method);
  }});return new MessagePortStream(port1);
 },handshake:()=>({proof:'assembly-proof'}),control:(...args)=>runtime.control(...args)});stream.start();t.after(()=>{stream.close();controls.close();for(const socket of sockets)socket.destroy();});
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 runtime=new ChannelRuntime({peer,initial,publicKey,origins:new Set([origin]),request:(...args)=>stream.request(...args),clock:()=>time,onFatal:e=>faults.push(e),mechanics:{
  footprint:()=>({players:[],resources:[]}),affectedAttack:()=>[],affectedPvp:()=>[],rankingEligible:()=>false,monsterOwned:m=>m.channel===1,changedArenaLife:()=>false,
  modeRate:()=>assert.fail('unexercised mode'),modeTick:()=>{},respawn:()=>{},recordSecurityEvent:()=>assert.fail('unexpected security event'),mixedPlayers:()=>[],mixedMonsters:()=>[],mixedAttack:()=>assert.fail('unexercised mixed AoE'),mixedPvp:{selectMixedMonsters473:()=>[]},waveView:()=>null,profile:()=>assert.fail('unexercised profiler')
 }});t.after(()=>runtime.close());
 const identity={realm,channel:1,boot:peer.incarnation,actor:id,account,session:'assembly-session',epoch:owner.epoch,securityVersion:version,origin};
 const security={...identity,incarnation:peer.incarnation,revision:1,accountVersion:version,sessionExpiresMs:time+3600000,securityValidUntil:time+30000,botDueMs:time+30000,blocked:false,canPlay:true,maintenanceAllowed:true,realmOpen:true,guildDeadlineMs:null};
 await controls.request('admit',{bundle:await load(0),identity,security});runtime.start();const endpoint=runtime.endpoint(WebSocketServer);
 async function connect(){const {port1,port2}=new MessageChannel(),client=new MessagePortStream(port1),server=new MessagePortStream(port2);Object.defineProperty(server,'remoteAddress',{value:'127.0.0.1'});endpoint.server.emit('connection',server);
  const ws=new WebSocket('ws://127.0.0.1/game/channel/1',{createConnection:()=>client,origin});ws.on('error',()=>{});const packets=[];ws.on('message',bytes=>packets.push(JSON.parse(bytes)));t.after(()=>{ws.terminate();client.destroy();server.destroy();});await once(ws,'open');ws.send(JSON.stringify({type:'auth',ticket:issueTicket(privateKey,identity,{now:time})}));await until(()=>packets.some(p=>p.type==='ready'));return {ws,packets};
 }
 let live=await connect();await until(()=>live.packets.some(p=>p.world?.type==='world_snapshot'));const send=(sequence,payload)=>live.ws.send(JSON.stringify({type:'input',sequence,payload}));
 send(1,{action:'move',x:2715,y:2025,area:'forest',basePositionRevision:1});await until(()=>runtime.channel.kernel.players.get(id).lastApplied===1||faults.length);assert.equal(faults.length,0,faults[0]?.stack);assert.equal(runtime.channel.state.read('players',id).x,2715);assert.equal(sql.prepare('SELECT x FROM players WHERE id=?').get(id).x,2700);
 time+=200;send(2,{action:'attack',targetId:monster.id,spawnRound:1,ability:0,intentId:'assembly-attack'});await until(()=>runtime.channel.kernel.players.get(id).lastApplied===2||faults.length);assert.equal(faults.length,0,faults[0]?.stack);assert(runtime.channel.view.monster(monster.id).hp<monster.hp);
 const readsBeforePotion=actorReads;time+=200;send(3,{action:'use_potion'});await until(()=>runtime.channel.kernel.players.get(id).lastApplied===3||faults.length);assert.equal(faults.length,0,faults[0]?.stack);assert.equal(sql.prepare('SELECT potions FROM players WHERE id=?').get(id).potions,1);assert.equal(runtime.channel.state.read('players',id).hp,900);assert.equal(actorReads,readsBeforePotion,'nonterminal potion must not reload the full cold bundle');assert.equal(runtime.world.subscribers.get(id).ownerRow.potions,1,'private owner inventory count refreshed');const freshPotion=await load(99);for(const key of ['actorFrame','targetFrame','retaliationPlayer']){const cached=runtime.channel.frames.frame(id,key),fresh=freshPotion.combat[key];for(const name of Object.keys(fresh))if(name!=='last_seen')assert.deepEqual(cached[name],fresh[name],'potion frame '+key+'.'+name);}
 await until(()=>live.packets.some(p=>p.type==='event'));const delivered=live.packets.filter(p=>p.type==='event');assert(delivered.every(p=>p.payload===null||p.payload.event));
 // Drop without event ACK. Reconnect gets the same stable IDs and completed
 // input results, without spending a second potion or needing a SQL heartbeat.
 live.ws.terminate();await until(()=>disconnects.length===1);live=await connect();await until(()=>live.packets.some(p=>p.type==='event'));const replay=live.packets.find(p=>p.type==='ready');assert.equal(replay.lastApplied,3);assert(replay.results.some(r=>r.sequence===3&&r.body.ok));assert(live.packets.some(p=>p.type==='event'&&p.id===delivered[0].id));assert.equal(sql.prepare('SELECT potions FROM players WHERE id=?').get(id).potions,1);
 const ids=live.packets.filter(p=>p.type==='event').map(p=>p.id);live.ws.send(JSON.stringify({type:'event_ack',ids}));await until(()=>writer.notifications.pending(sql,id).length===0);
 const token='legacy-route-lease',frozen=await controls.request('freeze',{id,epoch:owner.epoch,token});assert.equal(frozen.finalSequence,writer.authority.owner(id).sequence);assert(writer.system.owner('channel:1').sequence>=1);
 send(4,{action:'move',x:2716,y:2025,area:'forest',basePositionRevision:2});await until(()=>live.packets.some(p=>p.type==='retry'));assert.equal(live.ws.readyState,1);assert.equal(runtime.channel.kernel.players.get(id).lastAccepted,3);
 await controls.request('resume',{id,epoch:owner.epoch,token});time+=200;send(4,{action:'move',x:2716,y:2025,area:'forest',basePositionRevision:2});await until(()=>runtime.channel.kernel.players.get(id).lastApplied===4||faults.length);assert.equal(faults.length,0,faults[0]?.stack);
 await runtime.flushPresence();assert.equal(writer.presence.rows.get(id).epoch,owner.epoch);
 const closed=once(live.ws,'close');await controls.request('revoke',{actor:id,revision:2});assert.equal((await closed)[0],4003);
 const health=await controls.request('metrics',{});assert(health.ticks>0&&health.messages>0&&health.writerAckP95Ms>0);assert.equal(health.players,1);assert.equal(faults.length,0);
});
