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

import {extraPlayer,setup,liveGuildCombat,combatState} from './process-fixture.mjs';
import {prepareModeCase} from './mode-fixture.mjs';

test('native rank-mode WS limiter shares its counter across services and permits an original craft after expiry',{timeout:30000},async t=>{
 const {f,core,world,supervisor,http,connect,faults}=await setup(t,{shared:true});await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),key=nativeTokenHash('rank-equip:'+f.account.id),now=Math.floor(f.clock()/1000),old=[world.row,...supervisor.rows.values()];f.sql.prepare('INSERT INTO auth_rate_limits VALUES(?,?,?,?)').run(key,30,now,0);
 const send=async(sequence,kind,command)=>{live.ws.send(JSON.stringify({type:'input',sequence,payload:{action:'mode',kind,command}}));await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===sequence))||faults.length,7000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));return live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===sequence);};
 const first=await send(1,'rune',{action:'rune_claim',requestId:'mode-rate-first'});assert.equal(first.status,429);assert.equal(first.body.code,'rate_limited');assert.equal(first.headers['retry-after'],'5');const rate={...f.sql.prepare('SELECT * FROM auth_rate_limits WHERE key=?').get(key)};assert.equal(rate.attempts,31);
 const second=await send(2,'quest',{action:'quest_claim',requestId:'mode-rate-second'});assert.equal(second.status,429);assert.deepEqual({...f.sql.prepare('SELECT * FROM auth_rate_limits WHERE key=?').get(key)},rate);assert.deepEqual([world.row,...supervisor.rows.values()],old);
 let payload;await core.serial(()=>core.permanent.durablePlayers([f.id],async()=>{payload=await prepareModeCase({...f,nowMs:f.clock()},'rune','rune_craft');f.sql.prepare('UPDATE auth_rate_limits SET attempts=0,blocked_until=0,window_started_at=? WHERE key=?').run(Math.floor(f.clock()/1000),key);}));
 const before=f.sql.prepare("SELECT COUNT(*) n FROM player_items WHERE player_id=? AND kind='rune_attack'").get(f.id).n,result=await send(3,'rune',payload.input);assert.equal(result.status,200,JSON.stringify(result));assert.notEqual(result.body.ok,false);assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM player_items WHERE player_id=? AND kind='rune_attack'").get(f.id).n,before+1);assert.equal(f.sql.prepare('SELECT attempts FROM auth_rate_limits WHERE key=?').get(key).attempts,1);
});

test('native private PvP notice follows guild return and actual owner restart with one durable audience and ACK',{timeout:35000},async t=>{
 const s=await liveGuildCombat(t,77),{f,core,writer,world,supervisor,other,connect,live,faults}=s;
 await core.permanentPlayers([other.id],()=>f.sql.prepare('UPDATE players SET gems=103 WHERE id=?').run(other.id));s.attack(live);
 await until(()=>s.inspect().wins===1&&!world.combat.busy||faults.length,10000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(s.inspect().wins,1);
 const pending=writer.notifications.pending(f.sql,other.id),notice=pending.find(m=>m.payload.event.type==='pvp_gem_loss479');assert(notice,JSON.stringify(pending));assert.deepEqual(f.sql.prepare('SELECT actor FROM kernel511_notification_audience WHERE event_id=?').all(notice.id).map(r=>r.actor),[other.id]);
 const ticket=await other.http();assert.equal(ticket.status,200,JSON.stringify(ticket));const moved=await connect(ticket);await until(()=>moved.packets.some(p=>p.type==='event'&&p.id===notice.id),5000);const first=moved.packets.find(p=>p.id===notice.id);assert.equal(first.payload.event.targetId,other.id);assert.equal(first.payload.event.pvpGemsLost479,notice.payload.event.pvpGemsLost479);assert.equal(live.packets.some(p=>p.id===notice.id),false);
 const old=supervisor.rows.get(ticket.channel);old.child.kill('SIGKILL');await until(()=>supervisor.rows.get(ticket.channel)!==old&&supervisor.rows.get(ticket.channel)?.state==='running',15000);
 const fresh=await other.http();assert.equal(fresh.status,200,JSON.stringify(fresh));const resumed=await connect(fresh);await until(()=>resumed.packets.some(p=>p.id===notice.id),5000);assert.deepEqual(resumed.packets.find(p=>p.id===notice.id).payload,first.payload);
 resumed.ws.send(JSON.stringify({type:'event_ack',ids:[notice.id]}));await until(()=>f.sql.prepare('SELECT acknowledged FROM kernel511_notification_audience WHERE actor=? AND event_id=?').get(other.id,notice.id).acknowledged===1,5000);assert.equal(writer.notifications.pending(f.sql,other.id).some(m=>m.id===notice.id),false);assert.equal(s.inspect().wins,1);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
});

test('native persistent fishing limit returns429 without retiring owners and survives transfer and actual channel restart',{timeout:35000},async t=>{
 const {f,core,world,writer,supervisor,http,connect,faults}=await setup(t,{shared:true});await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),key=nativeTokenHash('fishing:'+f.account.id),now=Math.floor(f.clock()/1000);f.sql.prepare('INSERT INTO auth_rate_limits VALUES(?,?,?,?)').run(key,20,now,0);const before=[world.row,...supervisor.rows.values()];
 const send=async(client,sequence)=>{client.ws.send(JSON.stringify({type:'input',sequence,payload:{action:'start_fishing'}}));await until(()=>client.packets.some(p=>p.results?.some(r=>r.sequence===sequence))||faults.length,8000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));return client.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===sequence);};
 const first=await send(live,1);assert.equal(first.status,429);assert.equal(first.body.code,'rate_limited');const rate={...f.sql.prepare('SELECT * FROM auth_rate_limits WHERE key=?').get(key)};assert.equal(rate.attempts,21);assert(rate.blocked_until>=now+30);assert.deepEqual([world.row,...supervisor.rows.values()],before);
 const receipts=()=>f.sql.prepare("SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id LIKE 'action:%'").get().n;assert.equal(receipts(),1);
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'start_fishing'}}));await new Promise(resolve=>setTimeout(resolve,100));assert.deepEqual({...f.sql.prepare('SELECT * FROM auth_rate_limits WHERE key=?').get(key)},rate);assert.equal(receipts(),1);
 const transferred=await http('transfer',{channel:4});assert.equal(transferred.status,200,JSON.stringify(transferred));const second=await connect(transferred);assert.equal((await send(second,1)).status,429);assert.deepEqual({...f.sql.prepare('SELECT * FROM auth_rate_limits WHERE key=?').get(key)},rate);
 const old=supervisor.rows.get(4);old.child.kill('SIGKILL');await until(()=>supervisor.rows.get(4)!==old&&supervisor.rows.get(4)?.state==='running',15000);const fresh=await http('ticket');assert.equal(fresh.channel,4);const third=await connect(fresh);assert.equal((await send(third,1)).status,429);assert.deepEqual({...f.sql.prepare('SELECT * FROM auth_rate_limits WHERE key=?').get(key)},rate);assert(before.filter(row=>row!==old).every(row=>!row.exited));
 await core.permanentPlayers([f.id],()=>{f.sql.prepare('UPDATE auth_rate_limits SET attempts=0,blocked_until=0,window_started_at=? WHERE key=?').run(Math.floor(f.clock()/1000),key);f.sql.prepare("UPDATE players SET area='fishing',x=1960,y=745,has_rod=1,rod_equipped=1,hp=1000,max_hp=1000 WHERE id=?").run(f.id);});
 const allowed=await send(third,2);assert.equal(allowed.status,200,JSON.stringify(allowed));assert.equal(allowed.body.ok,true);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM fishing_sessions WHERE player_id=?').get(f.id).n,1);assert.equal(f.sql.prepare('SELECT attempts FROM auth_rate_limits WHERE key=?').get(key).attempts,1);assert.equal(writer.authority.owner(f.id).channel,4);
});

test('native profiler and process metrics cover main, four OS channels and world while replacement fences the old capture',{timeout:35000},async t=>{
 const {core,world,supervisor,http,connect,faults}=await setup(t,{shared:true});await world.stopJobs();core.start();let ticket=await http('ticket');assert.equal(ticket.status,200);ticket=await http('transfer',{channel:4});assert.equal(ticket.status,200);const live=await connect(ticket),old=supervisor.rows.get(4),healthy=[world.row,...[...supervisor.rows.values()].filter(row=>row!==old)];
 // Native start and end fields call Date.now separately. Validate their
 // real RPC clock bounds; the exact scheduled60s delay is tested directly.
 const captureBefore=Date.now(),capture=await core.diagnostics.profile({operation:'start',target:'channel-4'}),captureAfter=Date.now();assert.equal(capture.state,'recording');assert(capture.startedAtMs>=captureBefore&&capture.startedAtMs<=captureAfter);assert(capture.endsAtMs>=capture.startedAtMs+60000&&capture.endsAtMs<=captureAfter+60000);assert.equal(capture.target,'channel-4');await assert.rejects(core.diagnostics.profile({operation:'start',target:'main'}),{code:'profile_busy'});
 const worldBefore=Date.now(),worldCapture=await world.row.control.request('profile',{operation:'start',id:randomUUID()},{timeoutMs:5000}),worldAfter=Date.now();assert.equal(worldCapture.state,'recording');assert(worldCapture.startedAtMs>=worldBefore&&worldCapture.startedAtMs<=worldAfter);assert(worldCapture.endsAtMs>=worldCapture.startedAtMs+60000&&worldCapture.endsAtMs<=worldAfter+60000);
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'heartbeat'}}));await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,8000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1)?.status,200);
 // A real native sampler interval, no fake ELU/CPU or network RTT values.
 await new Promise(resolve=>setTimeout(resolve,2100));const measured=await core.diagnostics.sample();assert.equal(measured.main.protocol,'native-runtime-timing-v1');assert(measured.main.samples>=1);assert.equal(measured.targets.length,5);assert(measured.targets.every(row=>row.available&&row.metrics.process.samples>=1&&row.metrics.process.current.loopUtilization>=0));assert(measured.targets.filter(row=>row.target.startsWith('channel-')).every(row=>row.metrics.ticks>0&&Array.isArray(row.metrics.slowest)&&row.metrics.slowest.length<=10&&Number.isFinite(row.metrics.writerAckP95Ms)));
 old.child.kill('SIGKILL');await until(()=>supervisor.rows.get(4)!==old&&supervisor.rows.get(4)?.state==='running',15000);assert(old.exited);assert.equal((await core.diagnostics.profile({operation:'status'})).state,'failed');assert(healthy.every(row=>!row.exited));const next=await http('ticket');assert.equal(next.channel,4);await connect(next);assert(!faults.some(f=>f.supervisor),faults.map(f=>f.error?.stack).join('\n'));
});

test('graceful shutdown drains an accepted native guild terminal return before any owner exits',{timeout:35000},async t=>{
 const {f,core,world,supervisor,faults,live,ticket,attack,inspect,old}=await liveGuildCombat(t,19),source=supervisor.rows.get(ticket.channel),acquire=world.combat.acquire.bind(world.combat);let granted=false,release,closed=false,closeError;const gate=new Promise(resolve=>release=resolve);t.after(()=>release());
 world.combat.acquire=async(...args)=>{const grant=await acquire(...args);granted=true;await gate;return grant;};attack(live);await until(()=>granted||faults.length,8000);assert(granted);assert.equal(inspect().wins,0);
 const closing=supervisor.close().then(()=>closed=true,error=>{closeError=error;closed=true;});let state;
 try{const end=performance.now()+4000;do{if(source.exited)break;state=await combatState(source);if(state.players.some(p=>p.quiescing))break;await new Promise(resolve=>setTimeout(resolve,5));}while(performance.now()<end);
  assert(state?.players.some(p=>p.quiescing),'shutdown must close input acceptance while the accepted hit waits');assert(old.every(row=>!row.exited),'no owner exits before all accepted work drains');
 }finally{release();}
 await until(()=>closed,18000);await closing;assert.ifError(closeError);assert.equal(inspect().wins,1);assert.equal(inspect().receipts,1);assert(inspect().owners.every(o=>o.channel===4&&o.playerChannel===4));assert(!faults.length,faults.map(f=>f.error?.stack).join('\n'));assert(old.slice(1).every(row=>row.exited&&row.child.exitCode===0&&row.child.signalCode===null));assert(!old[0].exited);assert.equal((await sTicket()).code,'coordinator_stopping');await world.close();assert(old[0].exited);assert.equal(core.recoveringWorld,undefined);
 async function sTicket(){const response=await core.http(f.request({path:'/api/realtime/core511-ticket',body:{protocol:PROTOCOL}}));assert.equal(response.status,503);return response.json();}
});

test('unresponsive stopped OS channel makes shutdown fail closed at its bounded deadline',{timeout:20000},async t=>{
 const {f,core,world,supervisor,http,connect}=await setup(t,{shared:true});await world.stopJobs();const ticket=await http('ticket');await connect(ticket);const old=[world.row,...supervisor.rows.values()],source=supervisor.rows.get(ticket.channel),before=f.sql.prepare('SELECT gems,potions,hp FROM players WHERE id=?').get(f.id);assert(source.child.kill('SIGSTOP'));
 await assert.rejects(supervisor.close(),{code:'channel_group_drain_timeout'});assert(old.every(row=>row.exited));assert.equal(source.child.signalCode,'SIGKILL');assert.equal(core.stopping,true);assert.equal(core.recoveringWorld,true);assert.deepEqual(f.sql.prepare('SELECT gems,potions,hp FROM players WHERE id=?').get(f.id),before);assert.deepEqual([...supervisor.rows.values()],old.slice(1));assert.equal(world.row,old[0]);
});

for(const phase of ['before','after'])test('shutdown source SIGKILL '+phase+' native COMMIT exits all owners without restarting and retains CURRENT DB',{timeout:35000},async t=>{
 const {core,world,writer,supervisor,live,ticket,attack,inspect,old}=await liveGuildCombat(t,20),source=supervisor.rows.get(ticket.channel),acquire=world.combat.acquire.bind(world.combat);let granted=false,release,killed=false;const gate=new Promise(resolve=>release=resolve);t.after(()=>release());
 world.combat.acquire=async(...args)=>{const grant=await acquire(...args);granted=true;await gate;return grant;};
 if(phase==='after'){const command=writer.command.bind(writer);writer.command=async(...args)=>{const ack=await command(...args);if(ack.result.moves?.length&&!killed){killed=true;source.child.kill('SIGKILL');throw Object.assign(Error('shutdown_lost_commit_ack'),{code:'shutdown_lost_commit_ack'});}return ack;};}
 attack(live);await until(()=>granted,8000);const closing=supervisor.close();void closing.catch(()=>{});let state;
 try{const end=performance.now()+4000;do{state=await combatState(source);if(state.players.some(p=>p.quiescing))break;await new Promise(resolve=>setTimeout(resolve,5));}while(performance.now()<end);assert(state.players.some(p=>p.quiescing));if(phase==='before'){killed=true;source.child.kill('SIGKILL');}}finally{release();}
 await assert.rejects(closing);assert(killed);assert(old.every(row=>row.exited));assert.equal(source.child.signalCode,'SIGKILL');assert.equal(core.stopping,true);assert.equal(core.recoveringWorld,true);assert.equal(inspect().wins,phase==='after'?1:0);assert.equal(inspect().receipts,phase==='after'?1:0);assert(inspect().owners.every(o=>o.channel===(phase==='after'?4:ticket.channel)&&o.playerChannel===o.channel));assert.deepEqual([...supervisor.rows.values()],old.slice(1));assert.equal(world.row,old[0]);assert(supervisor.stopError);await assert.rejects(core.serial(()=>assert.fail('closed coordinator must not admit work')),{code:'coordinator_stopping'});
});
