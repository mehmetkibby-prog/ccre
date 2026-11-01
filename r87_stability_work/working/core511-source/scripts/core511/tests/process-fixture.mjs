import assert from 'node:assert/strict';
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import path from 'node:path';
import {setupEntry} from './entry-fixture.mjs';
import {until} from './helpers.mjs';
import {GameWriter} from '../writer-runtime.mjs';
import {createNativeWriterGuard} from '../native-writer-guard.mjs';
import {CoreCoordinator} from '../coordinator.mjs';
import {ChannelProcessSupervisor} from '../process-supervisor.mjs';
import {WorldProcessSupervisor} from '../world-supervisor.mjs';
import {ProcessStream} from '../process-stream.mjs';
import {ReadWorker} from '../read-worker.mjs';
import {PROTOCOL} from '../contract.mjs';
const webSocketModule='/tmp/core511-build-deps/node_modules/ws/wrapper.mjs', {WebSocket}=await import(webSocketModule);
import {seedGuildWar} from './guild-war-fixture.mjs';
import {seedHeartbeatRewards} from './heartbeat-maintenance-fixture.mjs';
import {put} from './pvp-fixture.mjs';
import {nativeTokenHash} from '../entry-writer.mjs';
import {bootstrapFourthChannel} from '../channel-content.mjs';

// Original process fixtures shared by independent lifecycle and gameplay suites.
export function extraPlayer(s,index,id='shared-player-'+index,{offline=false}={}){
 const {f,core}=s,account={...f.account,id:'shared-account-'+index,username:'SharedPlayer'+index,username_normalized:'sharedplayer'+index,email:'shared'+index+'@fixture.invalid',email_normalized:'shared'+index+'@fixture.invalid'},token='shared-native-session-'+String(index).repeat(40).slice(0,80),csrf='shared-native-csrf-'+String(index).repeat(40).slice(0,80),instance=randomUUID(),now=f.clock();put(f.sql,'accounts',account);
 const player=f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id);put(f.sql,'players',{...player,id,name:'Paylasim'+index,account_id:account.id,channel:1,...(offline?{last_seen:0}:{}),attack_one_at:0,attack_two_at:0,attack_three_at:0,attack_four_at:0});put(f.sql,'auth_sessions',{token_hash:nativeTokenHash(token),csrf_hash:nativeTokenHash(csrf),account_id:account.id,created_at:Math.floor(now/1000),last_seen_at:Math.floor(now/1000),expires_at:Math.floor(now/1000)+3600,security_version:account.security_version});put(f.sql,'game_presence',{account_id:account.id,token_hash:nativeTokenHash(token),instance_id:instance,expires_at_ms:now+40000,chat_after_id:0});f.bot.deadline(account.id);
 return {id,http:async(action='ticket',body={})=>{const r=await core.http(new Request(f.origin+'/api/realtime/core511-'+action,{method:'POST',headers:{Origin:f.origin,Cookie:'__Host-yasam-session='+token+'; __Host-yasam-csrf='+csrf,'X-CSRF-Token':csrf,'X-Game-Instance':instance,'Content-Type':'application/json'},body:JSON.stringify({protocol:PROTOCOL,...body})}));return {status:r.status,...await r.json()};}};
}

export async function setup(t,{fresh=false,shared=false,nativeMechanics=shared,nativeWriter=shared,respawns=false,repairs=false,dragon=false,cleanup=false,rune=false,heartbeatRewards=false,sharedCombat=null,content=false,localCombat=null,stoneWave=null,readerQueries=new Map()}={}){
 const cleanups=[],f=await setupEntry({after:fn=>cleanups.push(fn)},{fresh,realTime:true}),faults=[];let writer,core;
 if(content){f.sql.prepare('UPDATE world_state SET layout_version=24 WHERE id=1').run();await bootstrapFourthChannel(f.f.database,{assertStopped:()=>writer===undefined});}
 // Full shared topology uses the production identity/resource policy. Smaller
 // non-world fixtures keep their explicitly scoped writer callbacks.
 writer=new GameWriter(f.f.database,{realmId:'process-test511',clock:f.clock,ports:nativeWriter?{guard:createNativeWriterGuard(()=>core)}:{guard:()=>true,assertResources:(db,p,c)=>Boolean(writer.authority.assertSimulated(db,c.peer,c.actor,c.epoch))}});
 await writer.initialize();const reader=new ReadWorker(f.f.file,readerQueries,{actorBundles:true}),{privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 core=new CoreCoordinator({writer,reader,entry:f.entry,auth:f.auth,privateKey,origins:new Set([f.origin]),realmId:'process-test511',bot:f.bot,launch:f.globals.__colLaunch,guild:{deadline:()=>Infinity},clock:f.clock,onFault:issue=>faults.push(issue)});
 const supervisor=new ChannelProcessSupervisor(core,{...(nativeMechanics?{}:{mechanicsModule:path.join(import.meta.dirname,'process-mechanics-fixture.mjs')}),webSocketModule,entry:path.join(import.meta.dirname,'process-channel-fixture.mjs'),onFault:issue=>faults.push(issue)}),clients=[],sockets=[];
 const world=shared?new WorldProcessSupervisor(core,{onFault:issue=>faults.push(issue)}):null;
 t.after(async()=>{const errors=[],alreadyClosing=Boolean(supervisor.closingWork);try{for(const ws of clients)ws.terminate();for(const socket of sockets)socket.destroy();try{await supervisor.close();}catch(error){if(!alreadyClosing)errors.push(error);}try{if(world)await world.close();}catch(error){errors.push(error);}core.close();await reader.close();}finally{for(const fn of cleanups)await fn();}if(errors.length)throw new AggregateError(errors,'process fixture cleanup failed');});
 if(respawns){for(const [id,channel,is_boss]of [['golge-process-respawn511',4,0],['shared-process-respawn511',0,1]])f.sql.prepare('INSERT INTO monsters(id,name,area,channel,x,y,hp,max_hp,spawn_round,respawn_at,is_boss) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,'Respawn process fixture','forest',channel,1000,1000,0,13,17,Math.floor(f.clock()/1000)-1,is_boss);}
 if(repairs){f.sql.prepare('INSERT INTO monsters(id,name,area,channel,x,y,hp,max_hp,spawn_round,is_stone) VALUES(?,?,?,?,?,?,?,?,?,?)').run('shared-repair-parent511','Shared parent fixture','sinsi',0,1000,1000,1000,1000,20,1);f.sql.prepare('INSERT INTO monsters(id,name,area,channel,x,y,hp,max_hp,spawn_round,summoned,parent_stone_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('shared-repair-child511','Shared child fixture','sinsi',0,1000,1000,0,1000,17,1,'shared-repair-parent511');}
 if(dragon){const row=f.sql.prepare('SELECT config_json FROM dragon_settings WHERE id=1').get(),cfg={...JSON.parse(row.config_json),enabled:true,hp:24680,loot:[{itemId:'resource:gems',chance:100,min:1,max:1}]};f.sql.prepare('UPDATE dragon_settings SET config_json=? WHERE id=1').run(JSON.stringify(cfg));f.sql.prepare("UPDATE monsters SET hp=0,respawn_at=?,spawn_round=17 WHERE id='dragon-world-1'").run(Math.floor(f.clock()/1000)-1);}
 if(rune){const fourth=f.sql.prepare("SELECT 1 FROM monsters WHERE id='rune-v2-boss-c4-1'").get();if(!fourth){const template=f.sql.prepare("SELECT * FROM monsters WHERE id='rune-v2-boss-c3-1'").get();assert(template);put(f.sql,'monsters',{...template,id:'rune-v2-boss-c4-1',channel:4});}const cfg=JSON.parse(f.sql.prepare('SELECT config_json FROM rune_v2_settings WHERE id=1').get().config_json);cfg.enabled=true;cfg.monsters.boss.damage=100;cfg.monsters.boss.waveDamage=120;cfg.monsters.boss.waveCooldownSeconds=3;f.sql.prepare('UPDATE rune_v2_settings SET config_json=?,revision=revision+1 WHERE id=1').run(JSON.stringify(cfg));writer.services.globals.__colRuneV2.refresh();f.sql.prepare("UPDATE monsters SET hp=26000,max_hp=26000,x=2240,y=680,spawn_round=17,stun_until_ms=0,root_until_ms=0 WHERE id IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1','rune-v2-boss-c4-1')").run();f.sql.prepare("UPDATE players SET area='rune_v2',channel=1,x=2240,y=700,hp=1000,max_hp=1000,gems=103 WHERE id=?").run(f.id);}
 if(heartbeatRewards)seedHeartbeatRewards({...f,nowMs:f.clock()},{bosses:1,stones:1,normals:1});
 if(localCombat)put(f.sql,'monsters',{id:localCombat.id??'golge-local-terminal511',name:'Local terminal fixture',area:localCombat.area??'forest',channel:4,x:2700,y:2025,hp:localCombat.hp??1,max_hp:1000000,spawn_round:17,last_damaged_at_ms:f.clock(),last_regen_at_ms:f.clock()});
 if(stoneWave)put(f.sql,'monsters',{id:'sinsi-process-wave511',name:'Native stone wave fixture',area:'sinsi',channel:stoneWave.channel,x:1000,y:1000,hp:750001,max_hp:1000000,spawn_round:17,is_stone:1,wave_stage:0,last_damaged_at_ms:f.clock(),last_regen_at_ms:f.clock()});
 if(world){f.sql.prepare('INSERT INTO monsters(id,name,area,channel,x,y,hp,max_hp,spawn_round) VALUES(?,?,?,?,?,?,?,?,?)').run('shared-process511','Shared process fixture','forest',0,1000,1000,100,1000000,1);
  if(sharedCombat){f.sql.prepare("UPDATE players SET area='forest',x=1000,y=1000,hp=?,max_hp=?,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0 WHERE id=?").run(sharedCombat.playerHp??100000,sharedCombat.playerHp??100000,f.id);f.sql.prepare("UPDATE monsters SET hp=?,max_hp=?,is_boss=?,last_regen_at_ms=? WHERE id='shared-process511'").run(sharedCombat.hp??1000000,sharedCombat.hp??1000000,Number(sharedCombat.boss??false),f.clock());}
  if(sharedCombat?.area){f.sql.prepare("UPDATE monsters SET respawn_at=? WHERE area='black' AND hp=0").run(Math.floor(f.clock()/1000)+3600);f.sql.prepare("UPDATE monsters SET area=? WHERE id='shared-process511'").run(sharedCombat.area);f.sql.prepare("UPDATE players SET area='bazaar' WHERE id=?").run(f.id);}
  await world.start();}
 if(cleanup){f.sql.prepare('INSERT INTO monsters(id,name,area,channel,x,y,hp,max_hp,spawn_round) VALUES(?,?,?,?,?,?,?,?,?)').run('cleanup-process511','Cleanup fixture','forest',1,1000,1000,100,100,777);f.sql.prepare('INSERT INTO monster_participants(monster_id,spawn_round,player_id,created_at) VALUES(?,?,?,?)').run('cleanup-process511',777,f.id,Math.floor(f.clock()/1000)-86401);}
 // Cleanup tests explicitly drive the native job below. Defer its first
 // automatic enable so the seeded expiry cannot run before the first probe.
 if(cleanup){const startJobs=world.startJobs.bind(world);world.startJobs=async()=>{world.startJobs=startJobs;return {fixtureDeferred:true};};}
 await supervisor.start();for(const row of supervisor.rows.values())row.child.on('message',message=>{if(message?.type==='test-native-failure')row.nativeFailure=message.stack;});
 const http=async(action,body={})=>{const response=await core.http(f.request({path:'/api/realtime/core511-'+action,body:{protocol:PROTOCOL,...body}}));return {status:response.status,...await response.json()};};
 async function connect(ticket,{accepted=true}={}){
  const row=supervisor.rows.get(ticket.channel),name='test-browser:'+randomUUID(),socket=new ProcessStream(row.child,{stream:name});sockets.push(socket);
  await new Promise((resolve,reject)=>row.child.send({type:'test-browser-connection',stream:name},e=>e?reject(e):resolve()));
  const ws=new WebSocket('ws://127.0.0.1'+ticket.url,{origin:f.origin,createConnection:()=>socket}),packets=[],errors=[];clients.push(ws);ws.on('error',error=>errors.push(error.message));ws.on('message',bytes=>packets.push(JSON.parse(bytes)));await once(ws,'open');const closed=once(ws,'close');ws.send(JSON.stringify({type:'auth',ticket:ticket.ticket}));
  if(!accepted)return {ws,packets,closed,errors};
  await until(()=>packets.some(p=>p.type==='ready')||ws.readyState===3,7000);assert(packets.some(p=>p.type==='ready'),JSON.stringify(packets));return {ws,packets,closed,errors};
 }
 return {f,writer,reader,core,supervisor,world,faults,http,connect};
}

export async function liveGuildCombat(t,index){
 const s=await setup(t,{shared:true}),{f,core,world,writer,supervisor,http,connect}=s;await world.stopJobs();const other=extraPlayer(s,index),ticket=await http('ticket'),live=await connect(ticket);assert.equal((await other.http()).status,200);const joined=await other.http('transfer',{channel:ticket.channel});assert.equal(joined.status,200,JSON.stringify(joined));const victim=await connect(joined);
 await core.permanentPlayers([f.id,other.id],()=>{const id=seedGuildWar({...f,targetId:other.id,nowMs:f.clock()},{channel:ticket.channel,home:4,a:0,b:0,delta:599000});f.sql.prepare('UPDATE arena_matches SET kill_target=1 WHERE id=?').run(id);for(const player of [f.id,other.id])f.sql.prepare('UPDATE players SET hp=?,respawn_at_ms=0,stun_until_ms=0,root_until_ms=0,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0 WHERE id=?').run(player===f.id?4321:1,player);});
 const attack=client=>client.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'pvp_attack',targetPlayerId:other.id,ability:0,intentId:'guild-native-terminal'}})),inspect=()=>({wins:f.sql.prepare("SELECT wars_won FROM guilds WHERE id='war-guild-1'").get().wars_won,receipts:f.sql.prepare("SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id LIKE 'shared:%'").get().n,owners:[f.id,other.id].map(id=>({id,channel:writer.authority.owner(id).channel,epoch:writer.authority.owner(id).epoch,sequence:writer.authority.owner(id).sequence,playerChannel:f.sql.prepare('SELECT channel FROM players WHERE id=?').get(id).channel}))});
 return {...s,other,ticket,live,victim,attack,inspect,old:[world.row,...supervisor.rows.values()]};
}

export async function combatState(row){
 const request=randomUUID();return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{row.child.off('message',listener);reject(Error('combat_state_timeout'));},4000);
  const listener=m=>{if(m?.type==='test-combat-state'&&m.request===request){clearTimeout(timer);row.child.off('message',listener);resolve(m.snapshot);}};
  row.child.on('message',listener);row.child.send({type:'test-combat-state',request});
 });
}
