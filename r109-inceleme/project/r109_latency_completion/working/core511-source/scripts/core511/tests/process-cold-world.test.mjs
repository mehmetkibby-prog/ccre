import {extraPlayer,setup,liveGuildCombat,combatState} from './process-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import path from 'node:path';
import {setupEntry} from './entry-fixture.mjs';
import {until} from './helpers.mjs';
import {GameWriter} from '../writer-runtime.mjs';
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







test('actual offline guild timeout returns the live actor to channel four under one frozen ownership change',{timeout:40000},async t=>{
 const {f,writer,core,supervisor,world,http,connect,faults}=await setup(t,{shared:true});await world.stopJobs();const ticket=await http('ticket');assert.equal(ticket.status,200);const live=await connect(ticket),stale=core.ticketFor(core.sessions.get(f.id)),old=writer.authority.owner(f.id),securityUntil=core.sessions.get(f.id).security.securityValidUntil,pids=[world.row.child.pid,...[...supervisor.rows.values()].map(r=>r.child.pid)];
 await core.permanentPlayers([f.id,f.targetId],()=>seedGuildWar({...f,nowMs:f.clock()},{channel:ticket.channel,home:4}));await world.startJobs();
 await until(()=>f.sql.prepare("SELECT status FROM guild_wars WHERE id='guild-war511'").get()?.status==='finished'&&!world.global.held||faults.length,12000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
 const owner=writer.authority.owner(f.id),player=f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id);assert.equal(owner.channel,4);assert.equal(owner.epoch,old.epoch+1);assert.equal(player.channel,4);assert.equal(player.area,'bazaar');assert.equal(player.arena_match_id,'');assert.equal(player.x,1200);assert.equal(player.y,920);assert.equal(player.hp,player.max_hp);assert.equal(f.sql.prepare("SELECT wars_won FROM guilds WHERE id='war-guild-1'").get().wars_won,1);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM guild_war_locks').get().n,0);
 await until(()=>live.ws.readyState===3);assert(live.packets.some(p=>p.type==='channel_changed'&&p.channel===4&&p.epoch===owner.epoch));assert(core.sessions.get(f.id).security.securityValidUntil<=securityUntil);assert.deepEqual([world.row.child.pid,...[...supervisor.rows.values()].map(r=>r.child.pid)],pids);
 const rejected=await connect(stale,{accepted:false});await rejected.closed;assert(!rejected.packets.some(p=>p.type==='ready'));
 const fresh=await http('ticket');assert.equal(fresh.channel,4);const next=await connect(fresh);next.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>next.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,7000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
});

test('actual heartbeat socket heals on the resident Map, keeps dead HP zero and uses checkpoints without per-heartbeat writes',{timeout:30000},async t=>{
 const {f,writer,core,world,supervisor,http,connect,faults}=await setup(t,{shared:true});await world.stopJobs();const ticket=await http('ticket');assert.equal(ticket.status,200);const live=await connect(ticket),commands=[],command=writer.command.bind(writer),pids=[world.row.child.pid,...[...supervisor.rows.values()].map(r=>r.child.pid)];writer.command=(peer,request)=>{commands.push(request.operation);return command(peer,request);};
 await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET hp=500,max_hp=1000,last_regen_at=?,last_movement_at_ms=?,last_monster_hit_at=0,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0 WHERE id=?').run(f.clock()-4000,f.clock()-20000,f.id));live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'heartbeat'}}));const reply=n=>live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===n);
 await until(()=>reply(1)||faults.length,7000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert(reply(1).body.hp>500);assert.equal(reply(1).status,200);assert(!commands.includes('heartbeat'));await until(()=>core.heartbeatJobs.pending.has(f.id));await world.startJobs();await until(()=>!core.heartbeatJobs.pending.size&&!core.heartbeatJobs.held,7000);
 await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET hp=0,respawn_at_ms=?,last_regen_at=1 WHERE id=?').run(f.clock()+2600,f.id));live.ws.send(JSON.stringify({type:'input',sequence:2,payload:{action:'heartbeat'}}));await until(()=>reply(2)||faults.length,7000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(reply(2).body.hp,0);await core.permanentPlayers([f.id],()=>{});assert.equal(f.sql.prepare('SELECT hp FROM players WHERE id=?').get(f.id).hp,0);assert(f.sql.prepare('SELECT last_regen_at FROM players WHERE id=?').get(f.id).last_regen_at>1);assert(!commands.includes('heartbeat'));assert.deepEqual([world.row.child.pid,...[...supervisor.rows.values()].map(r=>r.child.pid)],pids);
});

test('actual heartbeat forfeit finishes a guild match before its offline timeout and returns its owner through the frozen channel barrier',{timeout:35000},async t=>{
 const {f,writer,core,world,supervisor,http,connect,faults}=await setup(t,{shared:true});await world.stopJobs();const ticket=await http('ticket');assert.equal(ticket.status,200);const live=await connect(ticket),modes=[],command=writer.system.command.bind(writer.system),pids=[world.row.child.pid,...[...supervisor.rows.values()].map(r=>r.child.pid)];writer.system.command=(peer,request)=>{if(request.kind==='world_transition')modes.push(request.payload.mode);return command(peer,request);};
 await core.permanentPlayers([f.id,f.targetId],()=>{seedGuildWar({...f,nowMs:f.clock()},{channel:ticket.channel,home:4,delta:300000});f.sql.prepare('UPDATE players SET last_seen=1 WHERE id=?').run(f.targetId);});live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'heartbeat'}}));await until(()=>core.heartbeatJobs.pending.has(f.id)||faults.length,7000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));await world.startJobs();
 await until(()=>f.sql.prepare("SELECT status FROM guild_wars WHERE id='guild-war511'").get().status==='finished'&&!world.global.held||faults.length,12000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert(modes.includes('heartbeat'));assert(!modes.includes('guild_timeout'));assert.equal(writer.authority.owner(f.id).channel,4);assert.equal(f.sql.prepare("SELECT wars_won FROM guilds WHERE id='war-guild-1'").get().wars_won,1);assert.deepEqual([world.row.child.pid,...[...supervisor.rows.values()].map(r=>r.child.pid)],pids);const fresh=await http('ticket');assert.equal(fresh.channel,4);const next=await connect(fresh);assert.equal(next.ws.readyState,1);
});

for(const phase of ['before','after'])test('guild return '+phase+' COMMIT lost ACK retires every old OS owner before recovering its channel and single score',{timeout:45000},async t=>{
 const {f,writer,core,supervisor,world,http,connect,faults}=await setup(t,{shared:true});await world.stopJobs();const ticket=await http('ticket');assert.equal(ticket.status,200);await connect(ticket);await core.permanentPlayers([f.id,f.targetId],()=>seedGuildWar({...f,nowMs:f.clock()},{channel:ticket.channel,home:4}));const old=[world.row,...supervisor.rows.values()],victim=supervisor.rows.get(ticket.channel),operation=writer.system.operations.get('world_transition'),command=writer.system.command.bind(writer.system);let killed=false,observed=null;
 const inspect=()=>({wins:f.sql.prepare("SELECT wars_won FROM guilds WHERE id='war-guild-1'").get().wars_won,channel:writer.authority.owner(f.id).channel,playerChannel:f.sql.prepare('SELECT channel FROM players WHERE id=?').get(f.id).channel});
 writer.system.operations.set('world_transition',(...args)=>{const result=operation(...args);if(args[1].mode==='guild_timeout'&&phase==='before'&&!killed){killed=true;victim.child.kill('SIGKILL');throw Object.assign(Error('guild_return_before_commit'),{code:'guild_return_before_commit'});}return result;});
 writer.system.command=async(peer,request)=>{try{const ack=await command(peer,request);if(request.payload.mode==='guild_timeout'&&phase==='after'&&!killed){killed=true;observed=inspect();victim.child.kill('SIGKILL');throw Object.assign(Error('guild_return_lost_ack'),{code:'guild_return_lost_ack'});}return ack;}catch(error){if(error.code==='guild_return_before_commit')observed=inspect();throw error;}};
 await world.startJobs();await until(()=>observed!==null,12000);assert.deepEqual(observed,{wins:phase==='before'?0:1,channel:phase==='before'?ticket.channel:4,playerChannel:phase==='before'?ticket.channel:4});
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&!world.global.held&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!old.includes(r))&&inspect().wins===1,20000);assert(old.every(r=>r.exited));assert.equal(victim.child.signalCode,'SIGKILL');assert.equal(inspect().channel,4);assert.equal(inspect().playerChannel,4);const fresh=await http('ticket');assert.equal(fresh.channel,4);const live=await connect(fresh);assert.equal(live.ws.readyState,1);assert(faults.some(f=>f.globalTransition));assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
});

test('independent fifth process regenerates shared HP at zero players, replicates all four channels and recovers after actual SIGKILL',{timeout:40000},async t=>{
 const {f,writer,core,supervisor,world,faults}=await setup(t,{shared:true}),id='shared-process511';
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_admissions').get().n,0);
 const initial=world.snapshot(),children=[...supervisor.rows.values()].map(r=>r.child.pid);assert(!children.includes(initial.pid));
 await until(()=>world.monsters.get(id)?.hp>100,5000);assert(world.projection.version>=2);
 const snapshot=async channel=>{const row=supervisor.rows.get(channel),request=randomUUID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{row.child.off('message',listener);reject(Error('replica_timeout '+row.state+' '+row.failure+' '+faults.map(f=>f.error?.stack).join(' | ')+' '+row.stderr));},3000);const listener=m=>{if(m?.type==='test-shared-snapshot'&&m.request===request){clearTimeout(timer);row.child.off('message',listener);resolve(m.snapshot);}};row.child.on('message',listener);row.child.send({type:'test-shared-snapshot',request,id});});};
 for(const channel of [1,2,3,4]){const row=await snapshot(channel);assert.equal(row.epoch,initial.epoch);assert(row.monster.hp>100);assert.deepEqual(row.monster,row.projected);}
 await world.row.control.request('quiesce_process',{});const committed=f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get(id).hp;assert(committed>100);assert(writer.system.owner('world').sequence>=1,'shared checkpoint is durable; other native background jobs may also commit');
 const old=world.row,ended=once(old.child,'exit');old.child.kill('SIGKILL');assert.equal((await ended)[1],'SIGKILL');await until(()=>world.row?.state==='running'&&world.row!==old,10000);
 assert(world.row.owner.epoch>initial.epoch);assert.equal(f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get(id).hp,committed);assert.deepEqual([...supervisor.rows.values()].map(r=>r.child.pid),children);
 for(const channel of [1,2,3,4]){const row=await snapshot(channel);assert.equal(row.epoch,world.row.owner.epoch);assert(row.monster.hp>=committed);}
 await assert.rejects(writer.system.command(old.peer,{epoch:initial.epoch,sequence:2,key:'stale-world',kind:'combat_checkpoint',payload:{monsters:[],participants:[],bossParticipants:[],combatEvents:[]}}),/system_epoch_fenced/);
 assert.equal(core.authority.counts().get(1)??0,0);assert.equal(faults.length,0,faults.map(x=>x.error?.stack).join('\n'));
});

test('zero-player local and shared respawns run in their actual OS owners and retain one spawn across channel restart',{timeout:40000},async t=>{
 const {f,writer,supervisor,world,faults}=await setup(t,{shared:true,respawns:true}),local='golge-process-respawn511',shared='shared-process-respawn511';
 const read=id=>f.sql.prepare('SELECT * FROM monsters WHERE id=?').get(id);await until(()=>read(local).hp>13&&read(shared).hp>13,8000);
 assert.equal(read(local).spawn_round,18);assert.equal(read(shared).spawn_round,18);assert.equal(read(local).respawn_at,0);assert.equal(read(shared).respawn_at,0);
 await until(()=>world.monsters.get(shared)?.spawn_round===18,5000);assert.equal(writer.authority.counts().get(4)??0,0);
 const old=supervisor.rows.get(4);await supervisor.restartChannel(4);assert.notEqual(supervisor.rows.get(4).peer.incarnation,old.peer.incarnation);assert.equal(read(local).spawn_round,18);
 const claims=f.sql.prepare('SELECT service,response FROM kernel511_system_receipts').all().filter(r=>JSON.parse(r.response).result.monsters?.some(m=>m.id===local));assert.equal(claims.length,1);assert.equal(claims[0].service,'channel:4');assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
});

test('shared minion cleanup removes the native row and every real channel replica',{timeout:30000},async t=>{
 const {f,supervisor,world,faults}=await setup(t,{shared:true,repairs:true}),id='shared-repair-child511';await until(()=>!f.sql.prepare('SELECT 1 FROM monsters WHERE id=?').get(id),5000);await until(()=>!world.monsters.has(id),5000);
 for(const [channel,row]of supervisor.rows){const request=randomUUID(),answer=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{row.child.off('message',listener);reject(Error('cleanup_replica_timeout'));},3000),listener=m=>{if(m?.type==='test-shared-snapshot'&&m.request===request){clearTimeout(timer);row.child.off('message',listener);resolve(m.snapshot);}};row.child.on('message',listener);});row.child.send({type:'test-shared-snapshot',request,id});const snapshot=await answer;assert.equal(snapshot.monster.id,undefined,'channel '+channel);assert.equal(snapshot.projected.id,undefined,'rendered channel '+channel);}
 const receipts=f.sql.prepare('SELECT response FROM kernel511_system_receipts').all().filter(r=>JSON.parse(r.response).result.removed?.includes(id));assert.equal(receipts.length,1);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
});

test('native dragon spawn and donation publish durable world health into all four real simulation/rendering replicas',{timeout:40000},async t=>{
 const {f,writer,core,supervisor,world,http,connect,faults}=await setup(t,{shared:true,dragon:true}),id='dragon-world-1';
 try{
 await until(()=>world.monsters.get(id)?.spawn_round===18,7000);assert.equal(f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get(id).hp,24680);
 const ticket=await http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await connect(ticket);
 await core.permanentPlayers([f.id],()=>{f.sql.prepare('UPDATE players SET essence=1000 WHERE id=?').run(f.id);f.sql.prepare('UPDATE world_state SET health=50,updated_at=? WHERE id=1').run(Math.floor(f.clock()/1000));});
 // A native maintenance freeze can reject an input before acceptance. Prove
 // this race deterministically, and resend ONLY on its explicit retry packet.
 // Accepted/unknown-outcome donations are never resent by this test client.
 let ready,release,timer,orderedEntered=false;const held=new Promise(r=>ready=r),gate=new Promise(r=>release=r),freeze=core.serial(()=>core.permanent.durablePlayers([f.id],async()=>{ready();await gate;})),ordered=core.serial(()=>{orderedEntered=true;});void ordered.catch(()=>{});
 const frame={type:'input',sequence:1,payload:{action:'donate',amount:100}},send=()=>live.ws.send(JSON.stringify(frame)),retry=bytes=>{const packet=JSON.parse(bytes);if(packet.type==='retry'&&packet.sequence===1&&['actor_draining','input_backpressure'].includes(packet.code))timer=setTimeout(send,50);};
 live.ws.on('message',retry);
 try{await Promise.race([held,freeze.then(()=>{throw Error('fixture_freeze_finished_early');})]);await new Promise(setImmediate);assert.equal(orderedEntered,false,'native global jobs must remain behind the held cold operation');send();await until(()=>live.packets.some(p=>p.type==='retry'&&p.sequence===1&&p.code==='actor_draining'),3000);assert.equal(f.sql.prepare('SELECT essence FROM players WHERE id=?').get(f.id).essence,1000);release();await freeze;await ordered;assert.equal(orderedEntered,true);await until(()=>f.sql.prepare('SELECT essence FROM players WHERE id=?').get(f.id).essence===900||faults.length||live.packets.some(p=>p.results?.some(r=>r.sequence===1)),8000);}
 catch(error){throw Error(JSON.stringify({input:live.packets.filter(p=>p.results?.length||['retry','rejected','ready'].includes(p.type)),essence:f.sql.prepare('SELECT essence FROM players WHERE id=?').get(f.id),faults:faults.map(f=>f.error?.stack),global:world.global.held?.phase,shared:world.combat.busy}),{cause:error});}
 finally{release();clearTimeout(timer);live.ws.off('message',retry);await freeze.catch(()=>{});await ordered.catch(()=>{});}
 assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(f.sql.prepare('SELECT essence FROM players WHERE id=?').get(f.id).essence,900,JSON.stringify(live.packets.slice(-5)));
 await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1)),5000);const point=writer.worldState.current;assert(point.world.health>50);await Promise.all([...core.processes.values()].map(row=>row.worldDelivery.flush()));await world.row.worldDelivery.flush();
 for(const [channel,row]of supervisor.rows){const request=randomUUID(),answer=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{row.child.off('message',listener);reject(Error('world_state_replica_timeout'));},3000),listener=m=>{if(m?.type==='test-shared-snapshot'&&m.request===request){clearTimeout(timer);row.child.off('message',listener);resolve(m.snapshot);}};row.child.on('message',listener);});row.child.send({type:'test-shared-snapshot',request,id});const snapshot=await answer;assert.deepEqual(snapshot.worldPoint,point,'world state '+channel);assert.equal(snapshot.world.health,point.world.health);assert.equal(snapshot.renderedWorld.health,point.world.health);assert.equal(snapshot.monster.hp,24680);assert.deepEqual(snapshot.monster,snapshot.projected);}
 await world.restart();assert.equal(world.monsters.get(id).spawn_round,18);assert.equal(f.sql.prepare('SELECT essence FROM players WHERE id=?').get(f.id).essence,900);const claims=f.sql.prepare("SELECT response FROM kernel511_system_receipts WHERE service='world'").all().filter(r=>JSON.parse(r.response).result.monsters?.some(m=>m.id===id&&m.spawn_round===18));assert.equal(claims.length,1);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
 }catch(error){t.diagnostic(JSON.stringify({faults:faults.map(f=>({channel:f.channel,actor:f.actor,error:f.error?.stack})),controls:[...core.processes].map(([channel,row])=>({channel,closed:row.control.closed,pending:[...row.control.pending.values()].map(r=>r.frame.method)})),processes:[...supervisor.rows].map(([channel,row])=>({channel,state:row.state,failure:row.failure,nativeFailure:row.nativeFailure})),world:world.row?.state,global:world.global.held?.phase}));throw error;}
});

test('native guardian period freezes, refreshes and resumes all five owners while the active socket stays connected',{timeout:40000},async t=>{
 const {f,core,supervisor,world,http,connect,faults}=await setup(t,{shared:true});await world.stopJobs();const ticket=await http('ticket');assert.equal(ticket.status,200);const live=await connect(ticket),pids=[world.row.child.pid,...[...supervisor.rows.values()].map(r=>r.child.pid)],period=Math.floor(f.clock()/1000)-1;
 await core.permanentPlayers([f.id],()=>{f.sql.prepare('UPDATE players SET contribution=0').run();f.sql.prepare('UPDATE players SET gems=100,contribution=500,hp=10,potions=2 WHERE id=?').run(f.id);f.sql.prepare('UPDATE world_state SET health=90,updated_at=?,reset_at=0,guardian_reward_at=? WHERE id=1').run(period,period);});await world.startJobs();
 await until(()=>f.sql.prepare('SELECT COUNT(*) n FROM guardian_reward_claims WHERE period_at=?').get(period).n===1&&!world.global.held||faults.length,10000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
 assert.equal(f.sql.prepare('SELECT gems FROM players WHERE id=?').get(f.id).gems,100+f.settings.guardian_reward_gems);assert.equal(f.sql.prepare('SELECT SUM(contribution) n FROM players').get().n,0);assert.equal(live.ws.readyState,1);assert.deepEqual([world.row.child.pid,...[...supervisor.rows.values()].map(r=>r.child.pid)],pids);
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,7000);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,1);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
});

test('native world reset reloads all five frozen owners into the next cycle and preserves paid balances on the live socket',{timeout:40000},async t=>{
 const {f,core,supervisor,world,http,connect,faults}=await setup(t,{shared:true});await world.stopJobs();const ticket=await http('ticket');assert.equal(ticket.status,200);const live=await connect(ticket),cycle=f.sql.prepare('SELECT cycle FROM world_state').get().cycle,pids=[world.row.child.pid,...[...supervisor.rows.values()].map(r=>r.child.pid)];
 await core.permanentPlayers([f.id],()=>{f.sql.prepare('UPDATE players SET gems=900,wheel_paid_gems=100,essence=800,wheel_paid_essence=200,potions=40,wheel_paid_potions=10 WHERE id=?').run(f.id);f.sql.prepare('UPDATE world_state SET health=0,updated_at=?,reset_at=? WHERE id=1').run(Math.floor(f.clock()/1000)-1,Math.floor(f.clock()/1000)-1);});await world.startJobs();
 await until(()=>f.sql.prepare('SELECT cycle FROM world_state').get().cycle===cycle+1&&!world.global.held||faults.length,12000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const player=f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id);assert.equal(player.gems,100);assert.equal(player.essence,200);assert.equal(player.potions,10);assert.equal(player.area,'bazaar');assert.equal(world.projection.cycle,cycle+1);assert.equal(live.ws.readyState,1);assert.deepEqual([world.row.child.pid,...[...supervisor.rows.values()].map(r=>r.child.pid)],pids);
 await until(()=>live.packets.some(p=>p.world?.type==='world_snapshot'&&p.world.data.world.cycle===cycle+1),7000);
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'donate',amount:1}}));await until(()=>f.sql.prepare('SELECT essence FROM players WHERE id=?').get(f.id).essence===199||faults.length,7000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
});

for(const phase of ['before','after'])test('actual channel SIGKILL '+phase+' global guardian COMMIT replaces all five owners before replaying the durable period',{timeout:45000},async t=>{
 const {f,writer,core,supervisor,world,http,connect,faults}=await setup(t,{shared:true});await world.stopJobs();const ticket=await http('ticket');assert.equal(ticket.status,200);await connect(ticket);const old=[world.row,...supervisor.rows.values()],victim=supervisor.rows.get(ticket.channel),period=Math.floor(f.clock()/1000)-1,owner=writer.authority.owner(f.id);let killed=false,observed=null;
 await core.permanentPlayers([f.id],()=>{f.sql.prepare('UPDATE players SET contribution=0').run();f.sql.prepare('UPDATE players SET gems=100,contribution=500 WHERE id=?').run(f.id);f.sql.prepare('UPDATE world_state SET health=90,updated_at=?,reset_at=0,guardian_reward_at=? WHERE id=1').run(period,period);});
 const operation=writer.system.operations.get('world_transition'),command=writer.system.command.bind(writer.system),inspect=()=>({claims:f.sql.prepare('SELECT COUNT(*) n FROM guardian_reward_claims WHERE period_at=?').get(period).n,gems:f.sql.prepare('SELECT gems FROM players WHERE id=?').get(f.id).gems});
 writer.system.operations.set('world_transition',(...args)=>{const value=operation(...args);if(phase==='before'&&!killed){killed=true;victim.child.kill('SIGKILL');throw Object.assign(Error('injected_global_before_commit'),{code:'injected_global_before_commit'});}return value;});
 writer.system.command=async(peer,request)=>{try{const ack=await command(peer,request);if(request.kind==='world_transition'&&phase==='after'&&!killed){killed=true;observed=inspect();victim.child.kill('SIGKILL');throw Object.assign(Error('injected_global_after_commit'),{code:'injected_global_after_commit'});}return ack;}catch(error){if(error.code==='injected_global_before_commit')observed=inspect();throw error;}};
 await world.startJobs();await until(()=>observed!==null,10000);assert.deepEqual(observed,{claims:phase==='before'?0:1,gems:phase==='before'?100:100+f.settings.guardian_reward_gems});
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&!world.global.held&&world.row?.state==='running'&&[...supervisor.rows.values()].length===4&&[...supervisor.rows.values()].every(row=>row.state==='running'&&!old.some(o=>o.peer.incarnation===row.peer.incarnation))&&inspect().claims===1,20000);
 assert(old.every(row=>row.exited),'every previous OS owner actually exited');assert.equal(victim.child.signalCode,'SIGKILL');assert(!old.some(row=>row.peer.incarnation===world.row.peer.incarnation));assert.equal(inspect().gems,100+f.settings.guardian_reward_gems);assert(writer.authority.owner(f.id).epoch>owner.epoch);assert.equal((await http('ticket')).status,200);assert(faults.some(f=>f.globalTransition));assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
});

test('four real child processes: native character HTTP, duplicate creation and actual SIGKILL recovery retire old tickets',{timeout:45000},async t=>{
 const s=await setup(t,{fresh:true}),{f,writer,core,supervisor,http,connect,faults}=s;
 f.sql.prepare('UPDATE launch_settings SET registration_at=0,opens_at=? WHERE id=1').run(f.clock()+86400000);
 const missing=await http('ticket');assert.equal(missing.code,'entry_character_required');
 const rejected=await http('character',{name:'A'});assert.equal(rejected.status,400);
 let ticket=await http('character',{name:'YeniKahraman',role:'avci'});assert.equal(ticket.status,200,JSON.stringify(ticket));assert.equal(ticket.channel,2);const id=ticket.playerId;
 const count=table=>f.sql.prepare('SELECT COUNT(*) n FROM '+table+' WHERE '+(table==='prereg_rewards'?'account_id':'player_id')+'=?').get(table==='prereg_rewards'?f.account.id:id).n;
 assert.equal(count('prereg_rewards'),1);assert.equal(count('player_items'),1);
 const duplicate=await http('character',{name:'BaskaKahraman',role:'arkanist'});assert.equal(duplicate.status,200);assert.equal(duplicate.epoch,ticket.epoch);assert.equal(count('prereg_rewards'),1);assert.equal(count('player_items'),1);
 let live=await connect(ticket);await until(()=>live.packets.some(p=>p.world?.type==='world_snapshot'));
 await core.permanentPlayers([id],()=>f.sql.prepare('UPDATE players SET potions=2,hp=10 WHERE id=?').run(id));
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>f.sql.prepare('SELECT potions FROM players WHERE id=?').get(id).potions===1,7000);
 await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,7000);assert.equal(faults.length,0,faults.map(x=>x.error?.stack).join('\n'));
 const before=writer.authority.owner(id),row=supervisor.rows.get(2),exited=once(row.child,'exit');row.child.kill('SIGKILL');assert.equal((await exited)[1],'SIGKILL');
 await until(()=>supervisor.rows.get(2)?.state==='running'&&supervisor.rows.get(2).peer.incarnation!==row.peer.incarnation,15000);
 const after=writer.authority.owner(id);assert(after.epoch>before.epoch);assert.notEqual(after.incarnation,before.incarnation);assert.equal(writer.authority.admission(id).epoch,after.epoch);assert.equal(supervisor.rows.get(2).recovered.active,1);
 assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(id).potions,1);assert.equal(count('prereg_rewards'),1);assert.equal(count('player_items'),1);
 const stale=await connect(ticket,{accepted:false});assert.equal((await stale.closed)[0],1008);assert(!stale.packets.some(p=>p.type==='ready'));
 await assert.rejects(core.route(row.peer,'command',{playerId:id,epoch:before.epoch,sequence:before.sequence+1,operationId:'stale',operation:'actor_checkpoint',payload:{}}),/channel_process_fenced/);
 ticket=await http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));assert.equal(ticket.epoch,after.epoch);live=await connect(ticket);
 const counts=writer.authority.counts();assert.equal(counts.get(2),1);assert.equal(faults.length,0,faults.map(x=>x.error?.stack).join('\n'));
});

test('real child recovery rejects revoked native auth and releases admission capacity',{timeout:35000},async t=>{
 const {f,writer,supervisor,http,faults}=await setup(t);const ticket=await http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));
 f.sql.prepare('UPDATE accounts SET security_version=security_version+1,permanently_banned=1 WHERE id=?').run(f.account.id);
 const row=supervisor.rows.get(ticket.channel);await supervisor.restartChannel(ticket.channel);const next=supervisor.rows.get(ticket.channel);
 assert.notEqual(next.peer.incarnation,row.peer.incarnation);assert.equal(next.recovered.active,0);assert.equal(next.recovered.retired,1);assert.equal(writer.authority.admission(f.id),null);assert.equal(writer.authority.counts().get(ticket.channel)??0,0);assert.equal((await http('ticket')).status,401);assert.equal(faults.length,0);
});

for(const phase of ['before','after'])test('actual source SIGKILL '+phase+' target COMMIT reconciles channel transfer from durable ownership',{timeout:35000},async t=>{
 const {f,writer,core,supervisor,http,connect}=await setup(t);let ticket=await http('ticket');assert.equal(ticket.status,200);
 const before=writer.authority.owner(f.id),source=supervisor.rows.get(ticket.channel),target=supervisor.rows.get(4),accept=writer.acceptTransfer.bind(writer);let killed=false;
 writer.acceptTransfer=async(...args)=>{
  const result=phase==='after'?await accept(...args):null;killed=true;const exited=once(source.child,'exit');source.child.kill('SIGKILL');assert.equal((await exited)[1],'SIGKILL');
  assert.equal(writer.authority.owner(f.id).channel,phase==='after'?4:before.channel,'inspect committed ownership BEFORE recovery');
  throw Object.assign(Error('injected_lost_transfer_ack'),{code:'injected_lost_transfer_ack'});
 };
 const interrupted=await http('transfer',{channel:4});writer.acceptTransfer=accept;assert(killed);assert.equal(interrupted.status,503);
 await until(()=>!core.transitions.has(f.id)&&[before.channel,4].every(ch=>supervisor.rows.get(ch)?.state==='running'),15000);
 await supervisor.queue;const owner=writer.authority.owner(f.id);assert.equal(owner.channel,phase==='after'?4:before.channel);assert.equal(owner.state,'active');assert(owner.epoch>before.epoch);
 assert.equal(f.sql.prepare('SELECT channel FROM players WHERE id=?').get(f.id).channel,owner.channel);assert.equal(writer.authority.admission(f.id).epoch,owner.epoch);
 if(phase==='after')assert.notEqual(supervisor.rows.get(4).peer.incarnation,target.peer.incarnation,'unknown committed target also terminates before rehydration');
 ticket=await http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));assert.equal(ticket.channel,owner.channel);await connect(ticket);
 const totals=[...writer.authority.counts().values()].reduce((a,b)=>a+b,0);assert.equal(totals,1);assert.equal(core.permanent.entries.size,0);
});

test('native solo room survives logout and child restart as simulation-only ownership without a live admission',{timeout:35000},async t=>{
 const {f,writer,core,supervisor,http,connect,faults}=await setup(t),id=f.id;
 f.sql.prepare('UPDATE players SET level=65,x=1910,y=660 WHERE id=?').run(id);f.sql.prepare("INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,'solo_key',1)").run(id);
 let ticket=await http('ticket');assert.equal(ticket.status,200);const live=await connect(ticket);
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'dungeon',command:{action:'create_solo',requestId:'process-solo-once'}}}));
 await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,7000);assert.equal(faults.length,0,faults.map(x=>x.error?.stack).join('\n'));
 const membership=f.sql.prepare('SELECT run_id FROM dungeon_members WHERE player_id=?').get(id);assert(membership,JSON.stringify(live.packets));
 assert.equal(f.sql.prepare('SELECT used FROM solo_daily_entries WHERE player_id=?').get(id).used,1);
 const loggedOut=await http('logout');assert.equal(loggedOut.status,200,JSON.stringify(loggedOut));assert.equal(loggedOut.simulation,membership.run_id);assert.equal(writer.authority.admission(id),null);const passive=writer.authority.owner(id);
 await supervisor.restartChannel(ticket.channel);const row=supervisor.rows.get(ticket.channel),owner=writer.authority.owner(id);assert(owner.epoch>passive.epoch);assert.equal(row.recovered.active,0);assert.equal(row.recovered.passive,1);assert.equal(writer.authority.counts().get(ticket.channel)??0,0);assert.equal(core.sessions.has(id),false);
 const stale=await connect(ticket,{accepted:false});assert.equal((await stale.closed)[0],1008);assert(!stale.packets.some(p=>p.type==='ready'));
 ticket=await http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));assert.equal(ticket.channel,owner.channel);assert.equal(writer.authority.simulation(id),null);assert.equal(f.sql.prepare('SELECT used FROM solo_daily_entries WHERE player_id=?').get(id).used,1);assert.equal(f.sql.prepare("SELECT amount FROM dungeon_materials WHERE player_id=? AND kind='solo_key'").get(id).amount,0);await connect(ticket);
 assert.equal(faults.length,0,faults.map(x=>x.error?.stack).join('\n'));
});

for(const phase of ['idle','refresh'])test('actual read-worker exit '+phase+' preserves a native permanent commit and recovers current actor state',{timeout:35000},async t=>{
 const {f,reader,core,supervisor,world,http,connect,faults}=await setup(t,{shared:true});await world.stopJobs();let ticket=await http('ticket');assert.equal(ticket.status,200);let live=await connect(ticket);
 const old=reader.worker,rows=[world.row,...supervisor.rows.values()],source=supervisor.rows.get(ticket.channel),before=f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,query=reader.query.bind(reader);let calls=0,killed=false;
 if(phase==='idle')await old.terminate();
 else reader.query=(name,...args)=>{const result=query(name,...args);if(calls&&!killed&&name==='kernel511_actor_world'){killed=true;void old.terminate();}return result;};
 const work=core.permanentPlayers([f.id],()=>{calls++;return f.sql.prepare('UPDATE players SET potions=potions+1 WHERE id=?').run(f.id);});
 if(phase==='idle'){await work;assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.deepEqual([world.row,...supervisor.rows.values()],rows);}
 else{
  await assert.rejects(work,/read_worker_closed|ipc_control_outcome_unknown/);assert(killed);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,before+1,'inspect durable mutation before recovery');
  await until(()=>supervisor.rows.get(ticket.channel)?.state==='running'&&supervisor.rows.get(ticket.channel)!==source&&!core.permanent.entries.has(f.id),15000);await supervisor.queue;assert(source.exited);assert.equal(world.row,rows[0]);reader.query=query;
  ticket=await http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));live=await connect(ticket);
 }
 assert.equal(reader.starts,2);assert.equal(calls,1);const state=await combatState(supervisor.rows.get(ticket.channel));assert.equal(state.players.find(p=>p.id===f.id).potions,before+1);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,before+1);
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'heartbeat'}}));await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1)),7000);assert.equal(live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1).status,200);
 assert(!faults.some(f=>f.supervisor||f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
});

test('rare-operation COMMIT followed by actual child exit leaves its fence until rehydration',{timeout:35000},async t=>{
 const {f,writer,core,supervisor,http,connect}=await setup(t);let ticket=await http('ticket');assert.equal(ticket.status,200);
 const row=supervisor.rows.get(ticket.channel),before=f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,original=core.permanent.endpointFor;let committed=false;
 core.permanent.endpointFor=(...args)=>{
  const endpoint=original(...args);
  return {...endpoint,resume:async()=>{
   assert(committed);const exited=once(row.child,'exit');row.child.kill('SIGKILL');assert.equal((await exited)[1],'SIGKILL');
   throw Object.assign(Error('injected_lost_refresh_ack'),{code:'injected_lost_refresh_ack'});
  }};
 };
 await assert.rejects(core.permanentPlayers([f.id],()=>{f.sql.prepare('UPDATE players SET potions=potions+1 WHERE id=?').run(f.id);committed=true;}),/injected_lost_refresh_ack/);core.permanent.endpointFor=original;
 assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,before+1,'inspect committed row before recovery');
 await until(()=>supervisor.rows.get(ticket.channel)?.state==='running'&&supervisor.rows.get(ticket.channel).peer.incarnation!==row.peer.incarnation&&!core.permanent.entries.has(f.id),15000);await supervisor.queue;
 ticket=await http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));await connect(ticket);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,before+1);assert.equal(writer.authority.counts().get(ticket.channel),1);
});
