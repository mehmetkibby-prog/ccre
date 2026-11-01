import test from 'node:test';
import assert from 'node:assert/strict';
import {guildWarEntryFixture,prepareKickoff} from './native-guild-war-entry-fixture.mjs';
import {combatState,extraPlayer} from './process-fixture.mjs';
import {until} from './helpers.mjs';

test('native six-player guild kickoff transfers SQL owners, sessions and real residents together before reply',{timeout:60000},async t=>{
 const s=await guildWarEntryFixture(t),{actor,body,war}=await prepareKickoff(s),before=new Map(s.players.map(p=>[p.id,s.core.authority.owner(p.id)]));
 const result=await s.call(actor,body);assert.equal(result.started,true);
 const views=await Promise.all([...s.supervisor.rows.values()].map(async row=>({channel:row.peer.channel,...await combatState(row)})));
 for(const p of s.players){
  const sql=s.f.sql.prepare('SELECT channel,area,arena_match_id FROM players WHERE id=?').get(p.id),owner=s.core.authority.owner(p.id),prior=before.get(p.id),session=s.core.sessions.get(p.id);
  assert.equal(sql.channel,3);assert.equal(sql.area,'arena');assert.equal(sql.arena_match_id,war.id);assert.equal(owner.channel,3);assert.equal(owner.epoch,prior.epoch+(prior.channel===3?0:1));assert.equal(session.identity.channel,3);assert.equal(session.identity.epoch,owner.epoch);
  const residents=views.flatMap(v=>v.players.map(p=>({channel:v.channel,...p}))).filter(v=>v.id===p.id);assert.equal(residents.length,1);assert.equal(residents[0].channel,3);assert.equal(residents[0].area,'arena');assert.equal(residents[0].match,war.id);
 }
 assert.equal(s.f.sql.prepare('SELECT COUNT(*) n FROM guild_war_returns WHERE war_id=?').get(war.id).n,6);
 assert.deepEqual([s.world.row,...s.supervisor.rows.values()],s.old);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
 // Reconnecting through the original ticket route must find the new epoch.
 const ticket=await s.http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));assert.equal(ticket.channel,3);const live=await s.connect(ticket);assert(live.ws);
 const replay=await s.call(s.players[0],body);assert.equal(replay.started,false);assert.match(replay.message,/Zaten/);assert.equal(s.core.authority.owner(s.f.id).epoch,before.get(s.f.id).epoch+1);
});

test('native active guild war join rehomes one foreign session and preserves the existing six owners',{timeout:60000},async t=>{
 const s=await guildWarEntryFixture(t),late={...extraPlayer(s,84),index:84};await s.host.database.atomic(()=>globalThis.__colLaunch.grant('shared-account-84',true));assert.equal((await late.http()).status,200);late.ticket=await late.http('transfer',{channel:4});assert.equal(late.ticket.status,200);late.live=await s.connect(late.ticket);
 await s.core.nativeConfiguration.run([],()=>{s.f.sql.prepare('INSERT INTO guild_members(player_id,guild_id,joined_at) VALUES(?,?,1)').run(late.id,'http-war-b511');s.f.sql.prepare("UPDATE players SET area='bazaar',hp=max_hp,combat_lock_until_ms=0,last_seen=? WHERE id=?").run(Math.floor(s.f.clock()/1000),late.id);});
 const {actor,body}=await prepareKickoff(s);await s.call(actor,body);const owners=s.players.map(p=>s.core.authority.owner(p.id)),prior=s.core.authority.owner(late.id),securityUntil=s.core.sessions.get(late.id).security.securityValidUntil;
 const result=await s.call(late,body);assert.equal(result.started,false);assert.match(result.message,/katıldın/);const owner=s.core.authority.owner(late.id);assert.equal(owner.channel,3);assert.equal(owner.epoch,prior.epoch+1);assert.deepEqual(s.players.map(p=>s.core.authority.owner(p.id)),owners);assert(s.core.sessions.get(late.id).security.securityValidUntil<=securityUntil);
 await until(()=>late.live.ws.readyState===3,5000);assert(late.live.packets.some(p=>p.type==='channel_changed'&&p.channel===3&&p.epoch===owner.epoch));assert(!(await combatState(s.supervisor.rows.get(4))).players.some(p=>p.id===late.id));assert.equal((await combatState(s.supervisor.rows.get(3))).players.find(p=>p.id===late.id).match,body.id);
 const ticket=await late.http();assert.equal(ticket.status,200,JSON.stringify(ticket));assert.equal(ticket.channel,3);await s.connect(ticket);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('native guild kickoff waits for accepted potion ACK before moving the six owners',{timeout:60000},async t=>{
 const s=await guildWarEntryFixture(t),{actor,body}=await prepareKickoff(s),{f,core,writer}=s;await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET hp=1,potions=2 WHERE id=?').run(f.id));
 const command=writer.command.bind(writer);let committed=false,release,answered=false;const gate=new Promise(r=>release=r);writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.playerId===f.id&&request.operation==='native_action'&&!committed){committed=true;await gate;}return ack;};
 try{s.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>committed||s.faults.length,7000);assert(committed,s.faults.map(f=>f.error?.stack).join('\n'));const before=s.players.map(p=>core.authority.owner(p.id)),pending=s.respond(actor,body).finally(()=>answered=true);await until(()=>core.globalWorld.held?.phase==='freezing',6000);assert.equal(answered,false);assert.deepEqual(s.players.map(p=>core.authority.owner(p.id)),before);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,1);
  release();const response=await pending;assert.equal(response.status,200,await response.text());assert(s.players.every(p=>core.authority.owner(p.id).channel===3));assert.equal((await combatState(s.supervisor.rows.get(3))).players.find(p=>p.id===f.id).potions,1);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
 }finally{release();}
});

for(const phase of ['before','after','snapshot'])test('native guild kickoff '+phase+' COMMIT or new snapshot failure recovers all five processes from the committed owner set',{timeout:60000},async t=>{
 const s=await guildWarEntryFixture(t),{actor,body}=await prepareKickoff(s),{core,writer,world,supervisor}=s,rules=core.nativeGuildVillage.membershipRules,act=rules.guildAction,append=writer.notifications.append.bind(writer.notifications),durable=writer.durableExternal.bind(writer),source=supervisor.rows.get(s.ticket.channel),control=core.processes.get(3).control,request=control.request.bind(control),before=s.players.map(p=>core.authority.owner(p.id));let calls=0,killed=false;
 rules.guildAction=(...args)=>{calls++;return act(...args);};
 writer.notifications.append=(...args)=>{const result=append(...args);if(phase==='before'&&!killed){killed=true;source.child.kill('SIGKILL');throw Error('guild_kickoff_before_commit');}return result;};
 writer.durableExternal=async()=>{await durable();if(phase==='after'&&!killed){killed=true;source.child.kill('SIGKILL');throw Error('guild_kickoff_commit_ack_lost');}};
 control.request=async(method,payload)=>{const ack=await request(method,payload);if(phase==='snapshot'&&method==='global_snapshot'&&calls&&!killed){killed=true;source.child.kill('SIGKILL');throw Error('guild_kickoff_new_snapshot_ack_lost');}return ack;};
 try{const response=await s.respond(actor,body);assert.equal(response.status,409,await response.text());}finally{rules.guildAction=act;writer.notifications.append=append;writer.durableExternal=durable;control.request=request;}
 assert(killed);assert.equal(calls,1);assert.equal(s.f.sql.prepare('SELECT COUNT(*) n FROM guild_war_returns WHERE war_id=?').get(body.id).n,phase==='before'?0:6);for(const [i,p]of s.players.entries())assert.equal(s.f.sql.prepare('SELECT channel FROM players WHERE id=?').get(p.id).channel,phase==='before'?before[i].channel:3);
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&!world.global.held&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!s.old.includes(r)),25000);await world.stopJobs();assert(s.old.every(r=>r.exited));assert.equal(source.child.signalCode,'SIGKILL');
 const ticket=await actor.http();assert.equal(ticket.status,200,JSON.stringify(ticket));await s.connect(ticket);const retry=await s.call(actor,body);assert.equal(retry.started,phase==='before');assert.equal(s.f.sql.prepare('SELECT COUNT(*) n FROM guild_war_returns WHERE war_id=?').get(body.id).n,6);assert(s.players.every(p=>core.authority.owner(p.id).channel===3));assert(!s.faults.some(f=>f.globalRecovery),s.faults.map(f=>f.error?.stack).join('\n'));
});

test('guild owner transfer binding rejects foreign adapters and a native rejected action retains all owners',{timeout:45000},async t=>{
 const s=await guildWarEntryFixture(t);assert.throws(()=>s.core.nativeConfiguration.runGuild({},[],()=>({moves:[]})),{code:'configuration_guild_binding'});assert.throws(()=>s.core.nativeConfiguration.runGuild(undefined,[],()=>({moves:[]})),{code:'configuration_guild_binding'});
 const before=s.players.map(p=>s.core.authority.owner(p.id)),response=await s.respond(s.players[1],{action:'war_accept',id:'not-a-war'});assert.equal(response.status,409);assert.deepEqual(s.players.map(p=>s.core.authority.owner(p.id)),before);assert.deepEqual([s.world.row,...s.supervisor.rows.values()],s.old);assert.equal(s.faults.length,0);
});
