import test from 'node:test';
import assert from 'node:assert/strict';
import {villageFixture} from './native-guild-village-fixture.mjs';
import {membershipHandler,membershipRequest} from './native-guild-membership-fixture.mjs';
import {combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';

const read=s=>JSON.parse(JSON.stringify({...s.read(),member:s.f.sql.prepare('SELECT area,position_revision,hp_revision,realtime_scope_version FROM players WHERE id=?').get(s.observer.id),membership:s.f.sql.prepare('SELECT * FROM guild_members WHERE player_id=?').get(s.observer.id)??null,guild:s.f.sql.prepare('SELECT * FROM guilds WHERE id=?').get('http-revoke511')??null,guildNotices:s.f.sql.prepare("SELECT COUNT(*) n FROM kernel511_notifications WHERE json_extract(payload,'$.event.type')='guild_changed'").get().n}));
const bodyFor=(s,action)=>action==='disband'?{action,id:'http-revoke511',name:'HTTP revoke'}:action==='kick'?{action,target:s.observer.id}:{action};

for(const action of ['leave','kick','disband'])test('native HTTP guild '+action+' refreshes foreign membership and delivers the original private guild audience',{timeout:40000},async t=>{
 const s=await villageFixture(t),handler=membershipHandler(s),body=bodyFor(s,action),request=()=>membershipRequest(s,body,action==='leave'?'member':'leader'),before=read(s),reply=await handler(request());assert.equal(reply.status,200,await reply.text());
 const after=read(s),view=await combatState(s.supervisor.rows.get(4));assert.equal(after.membership,null);assert.equal(after.member.area,'guild_village_1');assert.equal(view.players.find(p=>p.id===s.observer.id).area,after.member.area);assert.equal(after.member.position_revision,before.member.position_revision+1);
 assert.equal(after.guild===null,action==='disband');assert.equal(after.guest.area,action==='disband'?'guild_village_1':'guild_hall_http-revoke511');assert.equal(view.players.find(p=>p.id===s.guest.id).area,after.guest.area);assert.equal(after.notices,action==='disband'?2:1);assert.equal(after.guildNotices,1);
 const notice=s.writer.notifications.pending(s.f.sql,s.observer.id).find(n=>n.payload.event.type==='guild_changed');assert(notice);const audience=s.f.sql.prepare('SELECT actor FROM kernel511_notification_audience WHERE event_id=? ORDER BY actor').all(notice.id).map(r=>r.actor),expected=action==='leave'?[s.observer.id]:[s.f.id,s.observer.id].sort();assert.deepEqual(audience,expected);await until(()=>s.observer.live.packets.some(p=>p.id===notice.id),5000);assert(!s.guest.live.packets.some(p=>p.id===notice.id));if(action!=='leave')await until(()=>s.live.packets.some(p=>p.id===notice.id),5000);
 const replay=await handler(request());assert.equal(replay.status,409,await replay.text());assert.deepEqual(read(s),after);assert.deepEqual([s.world.row,...s.supervisor.rows.values()],s.old);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('guild membership rejection and original independent guest access preserve healthy owners',{timeout:40000},async t=>{
 const s=await villageFixture(t),handler=membershipHandler(s),before=read(s),denied=await handler(membershipRequest(s,{action:'kick',target:s.f.id},'member'));assert.equal(denied.status,409,await denied.text());assert.deepEqual(read(s),before);
 await s.core.nativeConfiguration.run([],()=>s.f.sql.prepare('INSERT INTO guild_castle_guests VALUES(?,?,?,?)').run('http-revoke511',s.observer.id,s.f.id,Math.floor(s.f.clock()/1000)+1800));
 const reply=await handler(membershipRequest(s,bodyFor(s,'kick')));assert.equal(reply.status,200,await reply.text());const after=read(s);assert.equal(after.membership,null);assert.equal(after.member.area,'guild_hall_http-revoke511');assert.equal(after.notices,0);assert.equal(after.guildNotices,1);assert.equal((await combatState(s.supervisor.rows.get(4))).players.find(p=>p.id===s.observer.id).area,after.member.area);assert.deepEqual([s.world.row,...s.supervisor.rows.values()],s.old);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('native guild kick drains an accepted foreign member potion before membership and area change',{timeout:40000},async t=>{
 const s=await villageFixture(t),{f,core,writer,observer}=s,handler=membershipHandler(s);await core.permanentPlayers([observer.id],()=>f.sql.prepare('UPDATE players SET hp=1,potions=2 WHERE id=?').run(observer.id));
 const command=writer.command.bind(writer);let committed=false,release,answered=false;const gate=new Promise(r=>release=r);writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.playerId===observer.id&&request.operation==='native_action'&&!committed){committed=true;await gate;}return ack;};
 try{
  observer.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>committed||s.faults.length,7000);assert(committed,s.faults.map(f=>f.error?.stack).join('\n'));
  const pending=handler(membershipRequest(s,bodyFor(s,'kick'))).finally(()=>answered=true);await until(()=>core.globalWorld.held?.phase==='freezing',6000);assert.equal(answered,false);assert(read(s).membership);assert.equal(read(s).notices,0);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(observer.id).potions,1);
  release();const response=await pending;assert.equal(response.status,200,await response.text());const view=(await combatState(s.supervisor.rows.get(4))).players.find(p=>p.id===observer.id);assert.equal(view.potions,1);assert.equal(view.area,'guild_village_1');assert.equal(read(s).notices,1);assert.equal(read(s).guildNotices,1);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
 }finally{release();}
});

for(const phase of ['before','after'])test('native guild disband source SIGKILL '+phase+' COMMIT keeps cascades, repairs and guild event atomic',{timeout:45000},async t=>{
 const s=await villageFixture(t),{core,world,writer,supervisor,ticket}=s,handler=membershipHandler(s),rules=core.nativeGuildVillage.membershipRules,act=rules.guildAction,append=writer.notifications.append.bind(writer.notifications),durable=writer.durableExternal.bind(writer),source=supervisor.rows.get(ticket.channel),before=read(s);let calls=0,killed=false;
 rules.guildAction=(...args)=>{calls++;return act(...args);};
 writer.notifications.append=(...args)=>{const result=append(...args);if(phase==='before'&&!killed){killed=true;source.child.kill('SIGKILL');throw Error('guild_disband_before_commit');}return result;};
 writer.durableExternal=async()=>{await durable();if(phase==='after'&&!killed){killed=true;source.child.kill('SIGKILL');throw Error('guild_disband_commit_ack_lost');}};
 try{const response=await handler(membershipRequest(s,bodyFor(s,'disband')));assert.equal(response.status,409,await response.text());}finally{rules.guildAction=act;writer.notifications.append=append;writer.durableExternal=durable;}
 assert(killed);assert.equal(calls,1);const immediate=read(s);if(phase==='before')assert.deepEqual(immediate,before);else{assert.equal(immediate.guild,null);assert.equal(immediate.membership,null);assert.equal(immediate.guest.area,'guild_village_1');assert.equal(immediate.member.area,'guild_village_1');assert.equal(immediate.notices,2);assert.equal(immediate.guildNotices,1);}
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&!world.global.held&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!s.old.includes(r)),20000);await world.stopJobs();assert(s.old.every(r=>r.exited));assert.equal(source.child.signalCode,'SIGKILL');
 const fresh=await s.http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));await s.connect(fresh);const retry=await handler(membershipRequest(s,bodyFor(s,'disband')));assert.equal(retry.status,phase==='before'?200:409,await retry.text());const after=read(s);assert.equal(after.guild,null);assert.equal(after.membership,null);assert.equal(after.guest.area,'guild_village_1');assert.equal(after.member.area,'guild_village_1');assert.equal(after.notices,2);assert.equal(after.guildNotices,1);assert.equal(after.member.position_revision,before.member.position_revision+1);assert(!s.faults.some(f=>f.globalRecovery),s.faults.map(f=>f.error?.stack).join('\n'));
});
