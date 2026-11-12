import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';

async function fixture(t){const s=await nativeHttpHost(t);await s.world.stopJobs();await s.host.database.atomic(()=>globalThis.__colLaunch.grant(s.f.account.id,true));const ticket=await s.http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));return {...s,ticket};}
const orphan=async s=>s.core.permanentPlayers([s.f.id],()=>s.f.sql.prepare("UPDATE players SET area='guild_hall_auth-orphan511',x=790,y=650 WHERE id=?").run(s.f.id));
const notices=f=>f.sql.prepare("SELECT payload FROM kernel511_notifications WHERE json_extract(payload,'$.event.type')='player_respawn'").all().map(r=>JSON.parse(r.payload));

test('native HTTP guild auth repair durably refreshes its existing channel before returning',{timeout:35000},async t=>{
 const s=await fixture(t),{f,core,supervisor,http,faults,ticket}=s;await orphan(s);
 const before=f.sql.prepare('SELECT position_revision,hp_revision FROM players WHERE id=?').get(f.id),session=await f.auth.session(f.request({path:'/api/guild-skill',body:{}}));assert.equal(session.playerAccess.area,'bazaar');
 const row=f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id),view=(await combatState(supervisor.rows.get(ticket.channel))).players.find(p=>p.id===f.id);assert.equal(row.position_revision,before.position_revision+1);assert.equal(row.hp_revision,before.hp_revision+1);assert.equal(view.area,row.area);assert.equal(view.suspended,false);assert.equal(core.permanent.entries.size,0);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
 assert.equal(notices(f).length,1);assert.equal(notices(f)[0].area,'guild_hall_auth-orphan511');assert.equal(notices(f)[0].event.playerId,f.id);assert.equal(notices(f)[0].event.area,'bazaar');assert.equal(notices(f)[0].event.hp,row.hp);
 // The same hook also runs inside an already serialized ticket/refresh path.
 await orphan(s);assert.equal((await http('ticket')).status,200);await core.refresh();assert.equal(notices(f).length,2);assert.equal(core.permanent.entries.size,0);
});

test('guild auth waits for accepted native potion ACK and commits one repair/event before channel resume',{timeout:35000},async t=>{
 const s=await fixture(t),{f,core,writer,supervisor,connect,ticket,faults}=s,live=await connect(ticket);await core.nativeConfiguration.run([],()=>globalThis.__colGuildVillage.save(true,globalThis.__colGuildVillage.settings().revision));const expires=Math.floor(f.clock()/1000)+4;
 await core.permanentPlayers([f.id],()=>{f.sql.prepare('INSERT INTO guilds(id,name,name_key,leader_id,created_at) VALUES(?,?,?,?,1)').run('auth-orphan511','Auth guest','auth guest',f.targetId);f.sql.prepare('INSERT INTO guild_castles(guild_id,district,slot,purchased_by,purchased_at) VALUES(?,1,1,?,1)').run('auth-orphan511',f.targetId);f.sql.prepare('INSERT INTO guild_castle_guests VALUES(?,?,?,?)').run('auth-orphan511',f.id,f.targetId,expires);f.sql.prepare("UPDATE players SET area='guild_hall_auth-orphan511',x=790,y=650,hp=1,potions=2 WHERE id=?").run(f.id);});
 const command=writer.command.bind(writer);let release,committed=false,answered=false;const gate=new Promise(r=>release=r);writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.operation==='native_action'&&!committed){committed=true;await gate;}return ack;};
 try{
  live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>committed||faults.length,8000);assert(committed,faults.map(f=>f.error?.stack).join('\n'));await until(()=>f.clock()>=expires*1000,6000);
  const pending=f.auth.session(f.request({path:'/api/guild-skill',body:{}})).finally(()=>answered=true);void pending.catch(()=>{});await until(()=>core.permanent.entries.get(f.id)?.phase==='freezing',6000);assert.equal(answered,false);assert.equal(f.sql.prepare('SELECT area FROM players WHERE id=?').get(f.id).area,'guild_hall_auth-orphan511');assert.equal(notices(f).length,0);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,1);
  release();assert.equal((await pending).playerAccess.area,'guild_village_1');const row=f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id),view=(await combatState(supervisor.rows.get(ticket.channel))).players.find(p=>p.id===f.id);assert.equal(row.potions,1);assert.equal(view.area,'guild_village_1');assert.equal(view.potions,1);assert.equal(view.suspended,false);assert.equal(notices(f).length,1);assert.equal(notices(f)[0].event.hp,row.hp);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
 }finally{release();}
});

for(const phase of ['before','after'])test('native guild auth source SIGKILL '+phase+' COMMIT preserves current player and one atomic event',{timeout:45000},async t=>{
 const s=await fixture(t),{f,core,writer,world,supervisor,http,connect,ticket,faults}=s;await connect(ticket);await orphan(s);const service=globalThis.__colGuildVillage,repair=service.repair,durable=writer.durableExternal.bind(writer),source=supervisor.rows.get(ticket.channel),old=[world.row,...supervisor.rows.values()],before=f.sql.prepare('SELECT position_revision,hp_revision FROM players WHERE id=?').get(f.id);let calls=0,killed=false;
 service.repair=id=>{calls++;const value=repair(id);if(phase==='before'&&!killed){killed=true;source.child.kill('SIGKILL');throw Error('guild_auth_before_commit');}return value;};
 if(phase==='after')writer.durableExternal=async()=>{await durable();if(!killed){killed=true;source.child.kill('SIGKILL');throw Error('guild_auth_ack_lost');}};
 try{await assert.rejects(f.auth.session(f.request({path:'/api/guild-skill',body:{}})),new RegExp(phase==='before'?'guild_auth_before_commit':'guild_auth_ack_lost'));}finally{service.repair=repair;writer.durableExternal=durable;}
 assert(killed);assert.equal(calls,1);let row=f.sql.prepare('SELECT area,position_revision,hp_revision FROM players WHERE id=?').get(f.id);assert.equal(row.area,phase==='after'?'bazaar':'guild_hall_auth-orphan511');assert.equal(row.position_revision,before.position_revision+(phase==='after'?1:0));assert.equal(row.hp_revision,before.hp_revision+(phase==='after'?1:0));assert.equal(notices(f).length,phase==='after'?1:0);
 try{await until(()=>!core.recoveringWorld&&!world.global.recovery&&!world.global.held&&supervisor.rows.get(ticket.channel)?.state==='running'&&supervisor.rows.get(ticket.channel)!==source,20000);}catch(error){throw new Error(JSON.stringify({rows:supervisor.snapshot(),held:[...core.permanent.entries].map(([id,e])=>({id,phase:e.phase,owner:e.owner})),faults:faults.slice(-8).map(f=>({error:f.error?.stack,supervisor:f.supervisor,authentication:f.authentication}))}),{cause:error});}assert(source.exited);assert.deepEqual([world.row,...[...supervisor.rows.values()].filter(r=>r.peer.channel!==ticket.channel)],old.filter(r=>r!==source));assert(old.filter(r=>r!==source).every(r=>!r.exited));assert.equal(source.child.signalCode,'SIGKILL');assert.equal(calls,1);
 // Fresh native validation in the new, unactivated owner repairs a rollback
 // before admission. A committed repair is already valid and is not repeated.
 assert.equal(notices(f).length,1);assert.equal(supervisor.rows.get(ticket.channel).recovered.active,1);
 const fresh=await http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));assert.equal(fresh.channel,ticket.channel);await connect(fresh);assert.equal(notices(f).length,1);assert.equal(f.sql.prepare('SELECT position_revision FROM players WHERE id=?').get(f.id).position_revision,before.position_revision+1);assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
});

test('unknown cold auth durability retires the unactivated replacement and preserves one repair for a fresh boot',{timeout:35000},async t=>{
 const s=await fixture(t),{f,core,writer,world,supervisor,http,ticket,faults}=s;await orphan(s);const source=supervisor.rows.get(ticket.channel),others=[world.row,...[...supervisor.rows.values()].filter(r=>r!==source)],durable=writer.durableExternal.bind(writer),before=f.sql.prepare('SELECT position_revision FROM players WHERE id=?').get(f.id).position_revision;let injected=false,replacement;
 writer.durableExternal=async()=>{await durable();const row=supervisor.rows.get(ticket.channel);if(!injected&&row&&row!==source&&row.state==='booting'&&notices(f).length){injected=true;replacement=row;throw Error('cold_auth_fsync_unknown');}};
 source.child.kill('SIGKILL');await until(()=>injected&&replacement.exited&&!supervisor.rows.has(ticket.channel)&&faults.some(f=>f.supervisor),12000);writer.durableExternal=durable;
 assert.equal(replacement.recovered,undefined);assert.equal(core.sessions.has(f.id),false);assert.equal(f.sql.prepare('SELECT position_revision FROM players WHERE id=?').get(f.id).position_revision,before+1);assert.equal(notices(f).length,1);assert(others.every(r=>!r.exited));assert(faults.some(f=>f.error?.code==='native_guild_auth_cold_uncertain'));assert.equal(core.permanent.entries.size,0);
 await supervisor.restartChannel(ticket.channel);assert.equal(supervisor.rows.get(ticket.channel).state,'running');assert.equal(supervisor.rows.get(ticket.channel).recovered.active,1);assert.equal((await http('ticket')).channel,ticket.channel);assert.equal(notices(f).length,1);assert.equal(f.sql.prepare('SELECT position_revision FROM players WHERE id=?').get(f.id).position_revision,before+1);assert(others.every(r=>!r.exited));
});
