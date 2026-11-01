import test from 'node:test';
import assert from 'node:assert/strict';
import {villageFixture,villageHandler} from './native-guild-village-fixture.mjs';
import {combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';
import {put} from './pvp-fixture.mjs';

test('native HTTP guild revoke refreshes its foreign guest before replying',{timeout:40000},async t=>{
 const s=await villageFixture(t),handler=villageHandler(s),reply=await handler(s.request());assert.equal(reply.status,200,await reply.text());
 const state=s.read(),view=(await combatState(s.supervisor.rows.get(4))).players.find(p=>p.id===s.guest.id);
 assert.equal(state.guest.area,'guild_village_1');assert.equal(view.area,state.guest.area);assert.equal(view.suspended,false);assert.equal(state.invited,false);assert.equal(state.receipts,1);
 assert.equal(state.notices,1);const notice=s.writer.notifications.pending(s.f.sql,s.observer.id).find(n=>n.payload.event.playerId===s.guest.id);assert(notice);assert.equal(notice.payload.area,'guild_hall_http-revoke511');assert.equal(notice.payload.event.area,'guild_village_1');
 assert.deepEqual(s.f.sql.prepare('SELECT actor FROM kernel511_notification_audience WHERE event_id=?').all(notice.id).map(r=>r.actor),[s.observer.id]);await until(()=>s.observer.live.packets.some(p=>p.id===notice.id),5000);assert(!s.live.packets.some(p=>p.id===notice.id));
 const replay=await handler(s.request());assert.equal(replay.status,200,await replay.text());assert.deepEqual(s.read(),state);assert.deepEqual([s.world.row,...s.supervisor.rows.values()],s.old);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('HTTP revoke drains an accepted foreign potion before changing access and preserves its one spend',{timeout:40000},async t=>{
 const s=await villageFixture(t),{f,core,writer,guest}=s,handler=villageHandler(s);await core.permanentPlayers([guest.id],()=>f.sql.prepare('UPDATE players SET hp=1,potions=2 WHERE id=?').run(guest.id));
 const command=writer.command.bind(writer);let committed=false,release,answered=false;const gate=new Promise(r=>release=r);writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.playerId===guest.id&&request.operation==='native_action'&&!committed){committed=true;await gate;}return ack;};
 try{
  guest.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>committed||s.faults.length,7000);assert(committed,s.faults.map(f=>f.error?.stack).join('\n'));
  const pending=handler(s.request()).finally(()=>answered=true);await until(()=>core.globalWorld.held?.phase==='freezing',6000);assert.equal(answered,false);assert.equal(s.read().invited,true);assert.equal(s.read().notices,0);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(guest.id).potions,1);
  release();const response=await pending;assert.equal(response.status,200,await response.text());const view=(await combatState(s.supervisor.rows.get(4))).players.find(p=>p.id===guest.id);assert.equal(view.potions,1);assert.equal(view.area,'guild_village_1');assert.equal(s.read().notices,1);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
 }finally{release();}
});

for(const phase of ['before','after'])test('HTTP revoke source SIGKILL '+phase+' COMMIT keeps receipt, guest and notice atomic',{timeout:45000},async t=>{
 const s=await villageFixture(t),{f,core,world,writer,supervisor,ticket}=s,handler=villageHandler(s),adapter=core.nativeGuildVillage,act=adapter.service.act,append=writer.notifications.append.bind(writer.notifications),durable=writer.durableExternal.bind(writer),source=supervisor.rows.get(ticket.channel),before=s.read();let calls=0,killed=false;
 adapter.service.act=(...args)=>{calls++;return act(...args);};
 writer.notifications.append=(...args)=>{const result=append(...args);if(phase==='before'&&!killed){killed=true;source.child.kill('SIGKILL');throw Error('http_revoke_before_commit');}return result;};
 writer.durableExternal=async()=>{await durable();if(phase==='after'&&!killed){killed=true;source.child.kill('SIGKILL');throw Error('http_revoke_commit_ack_lost');}};
 try{const response=await handler(s.request());assert.equal(response.status,409,await response.text());}finally{adapter.service.act=act;writer.notifications.append=append;writer.durableExternal=durable;}
 assert(killed);assert.equal(calls,1);const immediate=s.read();if(phase==='before')assert.deepEqual(immediate,before);else{assert.equal(immediate.invited,false);assert.equal(immediate.guest.area,'guild_village_1');assert.equal(immediate.receipts,1);assert.equal(immediate.notices,1);}
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&!world.global.held&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!s.old.includes(r)),20000);await world.stopJobs();assert(s.old.every(r=>r.exited));assert.equal(source.child.signalCode,'SIGKILL');
 const fresh=await s.http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));await s.connect(fresh);const retry=await handler(s.request());assert.equal(retry.status,200,await retry.text());const after=s.read();assert.equal(after.invited,false);assert.equal(after.guest.area,'guild_village_1');assert.equal(after.receipts,1);assert.equal(after.notices,1);assert.equal(after.guest.position_revision,before.guest.position_revision+1);assert(!s.faults.some(f=>f.globalRecovery),s.faults.map(f=>f.error?.stack).join('\n'));
});

test('HTTP revoke preserves native repairAll for more offline guests than one outbox batch',{timeout:40000},async t=>{
 const s=await villageFixture(t),{f,core}=s;await core.nativeConfiguration.run([],()=>{
  const template=f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.targetId);
  for(let n=0;n<513;n++)put(f.sql,'players',{...template,id:'http-revoke-offline-'+n,name:'OfflineRepair'+n,account_id:null,last_seen:0,is_gm:0,area:'guild_hall_missing-offline511'});
 });
 const response=await villageHandler(s)(s.request());assert.equal(response.status,200,await response.text());assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM players WHERE id LIKE 'http-revoke-offline-%' AND area='guild_village_1'").get().n,513);assert.equal(s.read().notices,514);assert.equal(s.read().receipts,1);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});
