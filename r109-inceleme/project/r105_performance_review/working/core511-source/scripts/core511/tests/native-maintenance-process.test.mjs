import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceFixture} from './native-maintenance-fixture.mjs';
import {until} from './helpers.mjs';
import {combatState} from './process-fixture.mjs';

test('native maintenance deadline reaches all four channels, excludes GM and expires only drained non-GM presence',{timeout:45000},async t=>{
 const s=await maintenanceFixture(t),{f,core,maintenance,adapter}=s,deadline=f.clock()+1500,rows=f.sql.prepare('SELECT token_hash FROM auth_sessions ORDER BY token_hash').all();maintenance.apply(s.frame(2,deadline));await adapter.sync();
 const value=p=>p.world?.type==='world_snapshot'?p.world.data.maintenance438:p.world?.fields?.maintenance438;
 await until(()=>s.live.packets.some(p=>value(p)?.revision===2)&&s.guest.live.packets.some(p=>value(p)?.revision===2),5000);assert(!s.observer.live.packets.some(p=>value(p)?.revision===2));
 await until(()=>!core.authority.admission(f.id)&&!core.authority.admission(s.guest.id),7000);await adapter.sync();assert(core.authority.admission(s.observer.id));assert.equal(s.observer.live.ws.readyState,1);
 for(const account of [f.account.id,'shared-account-71'])assert.equal(f.sql.prepare('SELECT expires_at_ms FROM game_presence WHERE account_id=?').get(account).expires_at_ms,0);assert(f.sql.prepare("SELECT expires_at_ms FROM game_presence WHERE account_id='shared-account-72'").get().expires_at_ms>f.clock());assert.deepEqual(f.sql.prepare('SELECT token_hash FROM auth_sessions ORDER BY token_hash').all(),rows);
 assert.equal(core.sessions.has(f.id),false);assert.equal((await combatState(s.supervisor.rows.get(4))).players.filter(p=>[s.guest.id,s.observer.id].includes(p.id)).length,1);assert.deepEqual([s.world.row,...s.supervisor.rows.values()],s.old);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

for(const reopen of [false,true])test('native maintenance waits for accepted potion ACK'+(reopen?' and reopening preserves the same owner':''),{timeout:45000},async t=>{
 const s=await maintenanceFixture(t),{f,core,writer,maintenance,adapter}=s;await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET hp=1,potions=2 WHERE id=?').run(f.id));
 const command=writer.command.bind(writer),owner=core.authority.owner(f.id);let committed=false,release,answered=false;const gate=new Promise(r=>release=r);writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.playerId===f.id&&request.operation==='native_action'&&!committed){committed=true;await gate;}return ack;};
 try{s.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>committed||s.faults.length,7000);assert(committed,s.faults.map(f=>f.error?.stack).join('\n'));maintenance.apply(s.frame(2,f.clock()));const pending=adapter.sync().finally(()=>answered=true);await until(()=>core.transitions.has(f.id),5000);assert.equal(answered,false);assert(f.sql.prepare('SELECT expires_at_ms FROM game_presence WHERE account_id=?').get(f.account.id).expires_at_ms>f.clock());assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,1);assert.equal(core.authority.owner(f.id).epoch,owner.epoch);
  if(reopen)maintenance.apply(s.frame(3,0,'open'));release();await pending;await adapter.sync();assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,1);
  if(reopen){assert.equal(core.authority.owner(f.id).epoch,owner.epoch);assert(core.authority.admission(f.id));assert(f.sql.prepare('SELECT expires_at_ms FROM game_presence WHERE account_id=?').get(f.account.id).expires_at_ms>f.clock());assert.equal((await combatState(s.supervisor.rows.get(owner.channel))).players.find(p=>p.id===f.id).potions,1);}else{assert.equal(core.authority.admission(f.id),null);assert.equal(f.sql.prepare('SELECT expires_at_ms FROM game_presence WHERE account_id=?').get(f.account.id).expires_at_ms,0);}
  assert.equal(core.transitions.size,0);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
 }finally{release();}
});

test('unacknowledged native maintenance policy terminates only that channel before reply and cold boot restores the current policy',{timeout:45000},async t=>{
 const s=await maintenanceFixture(t),{core,maintenance,adapter,supervisor,f}=s,source=supervisor.rows.get(4),row=core.processes.get(4),request=row.control.request.bind(row.control),others=s.old.filter(r=>r!==source);let lost=false;
 row.control.request=(method,payload)=>{if(method==='maintenance'&&payload.revision===2&&!lost){lost=true;return Promise.reject(Error('maintenance_delivery_lost'));}return request(method,payload);};
 maintenance.apply(s.frame(2,f.clock()+20000));await assert.rejects(adapter.sync(),/maintenance_delivery_lost/);assert(lost);assert(source.exited);assert.equal(source.child.signalCode,'SIGKILL');
 await until(()=>supervisor.rows.get(4)!==source&&supervisor.rows.get(4)?.state==='running',20000);await adapter.sync();assert(others.every(r=>!r.exited));const ticket=await s.observer.http();assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await s.connect(ticket);await until(()=>live.packets.some(p=>p.world?.data?.maintenanceRevision491===2),5000);assert(live.packets.every(p=>p.world?.data?.maintenance438==null));assert(!s.faults.some(f=>f.supervisor),s.faults.map(f=>f.error?.stack).join('\n'));
});

for(const phase of ['before','after'])test('maintenance source SIGKILL '+phase+' owner retirement keeps the accepted potion and expires presence after recovery',{timeout:55000},async t=>{
 const s=await maintenanceFixture(t),{core,writer,maintenance,adapter,f,supervisor}=s,source=supervisor.rows.get(s.ticket.channel),others=s.old.filter(r=>r!==source),logout=writer.logout.bind(writer);await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET hp=1,potions=2 WHERE id=?').run(f.id));s.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>s.live.packets.some(p=>p.lastApplied>=1),5000);let killed=false;
 writer.logout=async(...args)=>{if(args[0]===f.id&&!killed){if(phase==='after')await logout(...args);killed=true;source.child.kill('SIGKILL');throw Error('maintenance_retirement_'+phase);}return logout(...args);};
 try{maintenance.apply(s.frame(2,f.clock()));await assert.rejects(adapter.sync(),/maintenance_retirement_/);}finally{writer.logout=logout;}
 assert(killed);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,1);assert(f.sql.prepare('SELECT expires_at_ms FROM game_presence WHERE account_id=?').get(f.account.id).expires_at_ms>f.clock());
 await until(()=>source.exited&&supervisor.rows.get(s.ticket.channel)!==source&&supervisor.rows.get(s.ticket.channel)?.state==='running'&&!core.transitions.has(f.id),20000);await adapter.sync();assert.equal(core.authority.admission(f.id),null);assert.equal(core.authority.admission(s.guest.id),null);assert(core.authority.admission(s.observer.id));assert.equal(f.sql.prepare('SELECT expires_at_ms FROM game_presence WHERE account_id=?').get(f.account.id).expires_at_ms,0);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,1);assert(others.every(r=>!r.exited));assert(!s.faults.some(f=>f.supervisor),s.faults.map(f=>f.error?.stack).join('\n'));
});
