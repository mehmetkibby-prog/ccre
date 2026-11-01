import test from 'node:test';
import assert from 'node:assert/strict';
import {villageFixture} from './native-guild-village-fixture.mjs';
import {guildConfiguration} from './native-guild-configuration-fixture.mjs';
import {combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';

for(const gm of [false,true])test('native admin village closure refreshes foreign owners and preserves GM preview '+gm,{timeout:40000},async t=>{
 const s=await villageFixture(t);if(gm)await s.core.nativeConfiguration.run([],()=>s.f.sql.prepare('UPDATE players SET is_gm=1 WHERE id=?').run(s.observer.id));
 const c=guildConfiguration(s),before=c.read(),response=await c.routes.post(c.request());assert.equal(response.status,200,await response.text());
 const after=c.read(),view=await combatState(s.supervisor.rows.get(4));assert.equal(after.settings.enabled,0);assert.equal(after.settings.revision,before.settings.revision+1);assert.equal(after.guest.area,'bazaar');assert.equal(after.observer.area,gm?'guild_hall_http-revoke511':'bazaar');
 for(const id of [s.guest.id,s.observer.id]){const row=s.f.sql.prepare('SELECT area,position_revision,hp_revision FROM players WHERE id=?').get(id),resident=view.players.find(p=>p.id===id);assert.equal(resident.area,row.area);assert.equal(resident.suspended,false);}
 assert.equal(after.notices,gm?1:2);assert.equal(after.invited,true);assert.equal(after.receipts,0);assert.deepEqual([s.world.row,...s.supervisor.rows.values()],s.old);
 if(gm){const notice=s.writer.notifications.pending(s.f.sql,s.observer.id).find(n=>n.payload.event.playerId===s.guest.id);assert(notice);await until(()=>s.observer.live.packets.some(p=>p.id===notice.id),5000);assert.equal(notice.payload.area,'guild_hall_http-revoke511');assert.equal(notice.payload.event.area,'bazaar');}
 const retry=await c.routes.post(c.request());assert.equal(retry.status,500);assert.match((await retry.json()).error,/Ayar değişti/);assert.deepEqual(c.read(),after);
 const reopen=await c.routes.post(c.request({...c.body,guildVillageEnabled:true,guildVillageRevision:after.settings.revision}));assert.equal(reopen.status,200,await reopen.text());assert.equal(s.core.guild.settings().enabled,1);assert.equal(c.read().guest.area,'bazaar');assert.equal(c.read().notices,after.notices);
 assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('admin village closure preserves native validation and conflict with unchanged healthy owners',{timeout:40000},async t=>{
 const s=await villageFixture(t),c=guildConfiguration(s),before=c.read();
 for(const change of [{guildVillageEnabled:'false'},{guildVillageRevision:c.body.guildVillageRevision-1}]){const reply=await c.routes.post(c.request({...c.body,...change}));assert.equal(reply.status,500);assert.match((await reply.json()).error,/Açılış ayarı geçersiz|Ayar değişti/);assert.deepEqual(c.read(),before);}
 assert.deepEqual([s.world.row,...s.supervisor.rows.values()],s.old);const view=await combatState(s.supervisor.rows.get(4));assert(view.players.filter(p=>[s.guest.id,s.observer.id].includes(p.id)).every(p=>!p.suspended&&p.area==='guild_hall_http-revoke511'));assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('admin village closure drains an accepted foreign potion before changing native settings',{timeout:40000},async t=>{
 const s=await villageFixture(t),c=guildConfiguration(s),{f,core,writer,guest}=s;await core.permanentPlayers([guest.id],()=>f.sql.prepare('UPDATE players SET hp=1,potions=2 WHERE id=?').run(guest.id));
 const command=writer.command.bind(writer);let committed=false,release,answered=false;const gate=new Promise(r=>release=r);writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.playerId===guest.id&&request.operation==='native_action'&&!committed){committed=true;await gate;}return ack;};
 try{
  guest.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>committed||s.faults.length,7000);assert(committed,s.faults.map(f=>f.error?.stack).join('\n'));
  const pending=c.routes.post(c.request()).finally(()=>answered=true);await until(()=>core.globalWorld.held?.phase==='freezing',6000);assert.equal(answered,false);assert.equal(c.read().settings.enabled,1);assert.equal(c.read().notices,0);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(guest.id).potions,1);
  release();const response=await pending;assert.equal(response.status,200,await response.text());const view=(await combatState(s.supervisor.rows.get(4))).players.find(p=>p.id===guest.id);assert.equal(view.potions,1);assert.equal(view.area,'bazaar');assert.equal(c.read().notices,2);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
 }finally{release();}
});

for(const phase of ['before','after'])test('admin village closure source SIGKILL '+phase+' COMMIT keeps settings, players and events atomic',{timeout:45000},async t=>{
 const s=await villageFixture(t),c=guildConfiguration(s),{core,world,writer,supervisor,ticket}=s,adapter=core.nativeGuildVillage,save=adapter.service.save,append=writer.notifications.append.bind(writer.notifications),durable=writer.durableExternal.bind(writer),source=supervisor.rows.get(ticket.channel),before=c.read();let calls=0,killed=false;
 adapter.service.save=(...args)=>{calls++;return save(...args);};
 writer.notifications.append=(...args)=>{const result=append(...args);if(phase==='before'&&!killed){killed=true;source.child.kill('SIGKILL');throw Error('admin_guild_before_commit');}return result;};
 writer.durableExternal=async()=>{await durable();if(phase==='after'&&!killed){killed=true;source.child.kill('SIGKILL');throw Error('admin_guild_commit_ack_lost');}};
 try{const response=await c.routes.post(c.request());assert.equal(response.status,500,await response.text());}finally{adapter.service.save=save;writer.notifications.append=append;writer.durableExternal=durable;}
 assert(killed);assert.equal(calls,1);const immediate=c.read();if(phase==='before')assert.deepEqual(immediate,before);else{assert.equal(immediate.settings.enabled,0);assert.equal(immediate.settings.revision,before.settings.revision+1);assert.equal(immediate.guest.area,'bazaar');assert.equal(immediate.observer.area,'bazaar');assert.equal(immediate.notices,2);}
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&!world.global.held&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!s.old.includes(r)),20000);await world.stopJobs();assert(s.old.every(r=>r.exited));assert.equal(source.child.signalCode,'SIGKILL');
 const response=await c.routes.post(c.request());assert.equal(response.status,phase==='before'?200:500,await response.text());const after=c.read();assert.equal(after.settings.enabled,0);assert.equal(after.settings.revision,before.settings.revision+1);assert.equal(after.guest.area,'bazaar');assert.equal(after.observer.area,'bazaar');assert.equal(after.notices,2);assert.equal(after.guest.position_revision,before.guest.position_revision+1);assert.equal(after.observer.position_revision,before.observer.position_revision+1);assert(!s.faults.some(f=>f.globalRecovery),s.faults.map(f=>f.error?.stack).join('\n'));
});
