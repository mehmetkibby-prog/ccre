// Real recovered native writer, world/channel child processes and WS framing.
// The generated current transport is unmodified. No browser rendering is claimed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {setup,combatState,extraPlayer} from '../../working/core511-source/scripts/core511/tests/process-fixture.mjs';
import {until} from '../../working/core511-source/scripts/core511/tests/helpers.mjs';
import {ProcessStream} from '../../working/core511-source/scripts/core511/process-stream.mjs';
import {createRetaliationRules} from '../../working/core511-source/scripts/core511/generated/retaliation-rules.mjs';
import {Core511Transport} from '../../working/core511-source/scripts/core511/generated/client/core511-transport-r79-715e78ecd9021ea8.js';
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');
const evidence={scope:'Isolated native GameWriter, actual four channel and world child processes, real WebSocket framing over private process streams, exact generated transport. No live VDS or React/browser rendering.',checks:[]};
const sha=file=>createHash('sha256').update(fs.readFileSync(new URL(file,import.meta.url))).digest('hex');
evidence.sources={transport:sha('../../working/core511-source/scripts/core511/generated/client/core511-transport-r79-715e78ecd9021ea8.js'),actionWriter:sha('../../working/core511-source/scripts/core511/action-writer.mjs'),writerRuntime:sha('../../working/core511-source/scripts/core511/writer-runtime.mjs'),respawnNotification:sha('../../working/core511-source/scripts/core511/respawn-notification-r85.mjs'),notificationAudience:sha('../../working/core511-source/scripts/core511/notification-audience.mjs')};

for(const area of ['forest','rune_v2'])test('native '+area+' lethal hit and due respawn reach current generated transport exactly once after writer ACK',{timeout:45000},async t=>{
 const mid=area==='rune_v2'?'rune-v2-tide-c4-1':'golge-native-respawn-c4',destination=area==='rune_v2'?'bazaar':'forest';
 const s=await setup(t,{shared:true,localCombat:{id:mid,hp:1000000,area}}),{f,core,writer,world,supervisor,http}=s;
 await world.stopJobs();const ticket=await http('character',{channel:4});assert.equal(ticket.status,200,JSON.stringify(ticket));
 const wires=[],packets=[],events=[],streams=[];
 class NativeSocket extends WebSocket{
  constructor(url){
   const channel=Number(new URL(url).pathname.split('/').at(-1)),child=supervisor.rows.get(channel).child,stream='test-browser:'+randomUUID(),socket=new ProcessStream(child,{stream});
   streams.push(socket);child.send({type:'test-browser-connection',stream});
   super('ws://127.0.0.1/game/channel/'+channel,{origin:f.origin,createConnection:()=>socket});
   this.on('message',bytes=>packets.push(JSON.parse(bytes)));
  }
  send(raw,...args){const value=JSON.parse(String(raw));if(value.type==='input')wires.push(value);return super.send(raw,...args);}
 }
 const client=new Core511Transport({WebSocket:NativeSocket,origin:f.origin,headers:()=>Object.fromEntries(f.request().headers),fetch:async(url,init)=>{
  const action=new URL(url).pathname.split('core511-').at(-1),value=await http(action,JSON.parse(init.body));return Response.json(value,{status:value.status});
 }});
 const off=client.subscribe((kind,value)=>{if(kind==='event')events.push(value);});
 t.after(()=>{off();client.dispose();for(const stream of streams)stream.destroy();});
 await client.image();assert.equal(client.playerId,f.id);assert.equal(client.world.channel,4);
 const observer=extraPlayer(s,885,'respawn-observer'),destinationObserver=extraPlayer(s,886,'respawn-destination-observer');
 for(const other of [observer,destinationObserver]){const selected=await other.http('character',{channel:4});assert.equal(selected.status,200,JSON.stringify(selected));other.live=await s.connect(selected);}
 await core.permanentPlayers([f.id,observer.id,destinationObserver.id],()=>{
  f.sql.prepare('UPDATE players SET area=?,x=2800,y=2100 WHERE id=?').run(area,observer.id);
  f.sql.prepare('UPDATE players SET area=?,x=1300,y=1000 WHERE id=?').run(destination,destinationObserver.id);
  f.sql.prepare("UPDATE players SET role='avci',area=?,x=2700,y=2025,hp=1,max_hp=1000,gems=103,loadlab_run_id='',respawn_at_ms=0,stun_until_ms=0,root_until_ms=0 WHERE id=?").run(area,f.id);
  f.sql.prepare('DELETE FROM player_items WHERE player_id=?').run(f.id);
  const rules=createRetaliationRules({globals:writer.services.globals,now:f.clock});f.db.batch(rules.preparePveEngagement(f.db,f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id),f.sql.prepare('SELECT * FROM monsters WHERE id=?').get(mid),f.clock()-5000));
 });
 const row=()=>({...f.sql.prepare('SELECT hp,max_hp,hp_revision,respawn_at_ms,area,gems,position_revision,realtime_scope_version FROM players WHERE id=?').get(f.id)});
 await until(()=>row().hp===0||s.faults.length,8000);assert.equal(s.faults.length,0,s.faults.map(x=>x.error?.stack).join('\n'));
 await until(()=>events.some(e=>e.type==='player_hit'&&e.targetId===f.id&&e.hp===0),5000);
 const death=row(),hit=events.find(e=>e.type==='player_hit'&&e.targetId===f.id&&e.hp===0);
 assert.equal(death.gems,area==='rune_v2'?98:103);assert.equal(hit.hpRevision,death.hp_revision);assert.equal(hit.respawnAtMs,death.respawn_at_ms);assert(death.respawn_at_ms>Date.now());
 await until(()=>client.world?.players.find(p=>p.id===f.id)?.hp===0,5000);
 const early=await client.command({action:'respawn'});assert.equal(early.status,409);assert.equal(row().hp,0);
 const old=[world.row,...supervisor.rows.values()],command=writer.command.bind(writer);let release,committed=false,answered=false,respawnRequest;const gate=new Promise(resolve=>release=resolve);
 let nativeEvents=[],nativeNotifications=[];writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.operation==='native_action'&&request.payload?.input?.action==='respawn'&&ack.result?.result?.status===200){respawnRequest=request;nativeEvents=ack.result.events;nativeNotifications=(ack.result.notifications??[]).map(id=>({id,route:JSON.parse(f.sql.prepare('SELECT payload FROM kernel511_notifications WHERE event_id=?').get(id).payload),audience:f.sql.prepare('SELECT actor FROM kernel511_notification_audience WHERE event_id=?').all(id).map(r=>r.actor)}));
  committed=true;await gate;}return ack;};
 try{
  await until(()=>Date.now()>=death.respawn_at_ms+20,5000);
  const due=client.command({action:'respawn'}).finally(()=>answered=true);await until(()=>committed||s.faults.length,7000);assert(committed,JSON.stringify(s.faults));
  const alive=row();assert.equal(alive.hp,alive.max_hp);assert.equal(alive.hp_revision,death.hp_revision+1);assert.equal(alive.respawn_at_ms,0);assert.equal(alive.area,destination);assert.equal(alive.gems,death.gems);
  assert.equal(answered,false);assert.equal(client.active.payload.action,'respawn');assert.equal(events.filter(e=>e.type==='player_respawn').length,0);
  assert.equal(wires.filter(e=>e.payload.action==='respawn').length,2);assert.equal(client.queue.length,0);
  const holdStart=Date.now();await new Promise(resolve=>setTimeout(resolve,8200));assert.equal(answered,false);assert.equal(client.active.payload.action,'respawn');assert.equal(client.queue.length,0);assert.equal(wires.filter(e=>e.payload.action==='respawn').length,2);
  release();const result=await due;assert.equal(result.status,200);assert.equal(result.body.hp,alive.hp);assert.equal(result.body.hpRevision,alive.hp_revision);assert.equal(result.body.area,destination);
  await until(()=>client.world?.area===destination&&client.world.players.find(p=>p.id===f.id)?.hp===alive.hp,5000);
  assert.equal(nativeNotifications.length,area==='forest'?1:2);assert.equal(nativeNotifications[0].route.area,area);
  assert.deepEqual(nativeNotifications[0].audience.sort(),(area==='forest'?[f.id,observer.id,destinationObserver.id]:[observer.id]).sort());
  if(area!=='forest'){assert.deepEqual(nativeNotifications[1].route.actors,[f.id]);assert.deepEqual(nativeNotifications[1].audience,[f.id]);assert.equal(nativeNotifications[1].route.area,destination);}
  const observerRespawns=other=>other.live.packets.flatMap(p=>[...(p.events??[]),p.payload?.event].filter(e=>e?.type==='player_respawn'));
  await until(()=>events.some(e=>e.type==='player_respawn')&&observerRespawns(observer).length,5000);
  const respawn=events.find(e=>e.type==='player_respawn');assert(respawn);assert.equal(respawn.hpRevision,alive.hp_revision);assert.equal(respawn.hp,alive.hp);assert.equal(respawn.area,destination);
  assert.equal(observerRespawns(observer).length,1,'old-room spectator keeps native respawn event');assert.equal(observerRespawns(destinationObserver).length,area==='forest'?1:0,'private actor copy does not broadcast to destination spectators');
  assert.equal(client.world.players.find(p=>p.id===f.id).respawn_at_ms,0);assert.equal(client.world.players.find(p=>p.id===f.id).hp_revision,alive.hp_revision);
  const receiptCount=f.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(respawnRequest.operationId).n;assert.equal(receiptCount,1);
  const terminalFrames=packets.filter(p=>p.type==='frame'&&p.results?.some(r=>r.sequence===2)),respawnPackets=packets.filter(p=>p.events?.some(e=>e.type==='player_respawn')||p.payload?.event?.type==='player_respawn');
  assert.equal(terminalFrames.length,1);assert.equal(events.filter(e=>e.type==='player_respawn').length,1);assert.equal(client.active,null);
  const state=await combatState(supervisor.rows.get(4));assert.equal(state.players.find(p=>p.id===f.id).hp,alive.hp);assert.deepEqual([world.row,...supervisor.rows.values()],old);assert.equal(s.faults.length,0);
  const oldEpoch=client.epoch,oldPeer=supervisor.rows.get(4).peer,finalWorld=client.world;let newEpoch=null;client.dispose();
  if(area==='rune_v2'){const moved=await http('transfer',{channel:3});assert.equal(moved.status,200,JSON.stringify(moved));assert(moved.epoch>oldEpoch);newEpoch=moved.epoch;
   await assert.rejects(()=>writer.notificationPending(oldPeer,{actor:f.id,epoch:oldEpoch}),error=>['owner_epoch_fenced','simulation_epoch_fenced'].includes(error.code),'old owner cannot read actor-private notification after native transfer');}
  evidence.checks.push({name:area+' lethal native hit → early reject → due respawn after delayed writer ACK',status:'passed',death,alive,hit,respawn:respawn??null,nativeEvents,nativeNotifications,direct:result.body,receiptCount,heldAckMs:Date.now()-holdStart,respawnWireInputs:wires.filter(e=>e.payload.action==='respawn').length,events:events.map(e=>e.type),packets:packets.length,respawnPackets:respawnPackets.map(p=>p.type),terminalFrameIncludesResult:terminalFrames[0]?.results?.some(r=>r.body?.hpRevision===alive.hp_revision)??false,oldRoomObserverEvents:observerRespawns(observer).length,destinationObserverEvents:observerRespawns(destinationObserver).length,staleOwnerReadRejected:area==='rune_v2',oldEpoch,newEpoch});
  fs.writeFileSync(new URL('native-respawn-wire-'+area+'.json',import.meta.url),JSON.stringify({death,alive,result,events,nativeEvents,nativeNotifications,terminal:packets.filter(p=>p.type==='frame'&&p.results?.some(r=>r.sequence===2)),world:finalWorld},null,2)+'\n');
 }finally{release();writer.command=command;}
 fs.writeFileSync(new URL('native-respawn-process-evidence.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
});
