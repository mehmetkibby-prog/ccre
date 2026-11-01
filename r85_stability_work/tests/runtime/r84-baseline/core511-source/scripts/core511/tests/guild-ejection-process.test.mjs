import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,extraPlayer,combatState} from './process-fixture.mjs';
import {until,native} from './helpers.mjs';
import {prepareModeCase} from './mode-fixture.mjs';
import {put,json} from './pvp-fixture.mjs';

async function fixture(t){
 const s=await setup(t,{shared:true}),{f,core,world,writer,supervisor,http,connect}=s;await world.stopJobs();const other=extraPlayer(s,23),observer=extraPlayer(s,24),ticket=await http('ticket'),live=await connect(ticket);assert.equal((await other.http()).status,200);const targetTicket=await other.http('transfer',{channel:4}),guest=await connect(targetTicket);assert.equal((await observer.http()).status,200);const observerTicket=await observer.http('transfer',{channel:4}),witness=await connect(observerTicket);assert.notEqual(ticket.channel,4);
 const {hallArea}=await native('lib/guild-village.mjs');let payload;
 await core.serial(()=>core.permanent.durablePlayers([f.id,other.id,observer.id],async()=>{
  payload=await prepareModeCase({...f,targetId:other.id,nowMs:f.clock()},'guild_village','revoke');
  for(const id of [other.id,observer.id])f.sql.prepare('UPDATE players SET area=?,arena_match_id=\'\',x=1000,y=1000,hp=max_hp,combat_lock_until_ms=0,root_until_ms=0,stun_until_ms=0 WHERE id=?').run(hallArea('mode-guild'),id);
  put(f.sql,'guild_members',{player_id:observer.id,guild_id:'mode-guild',joined_at:1});
 }));
 const read=()=>json({guest:f.sql.prepare('SELECT area,position_revision,hp_revision,realtime_scope_version FROM players WHERE id=?').get(other.id),invited:!!f.sql.prepare('SELECT 1 FROM guild_castle_guests WHERE guild_id=? AND player_id=?').get('mode-guild',other.id),nativeReceipts:f.sql.prepare('SELECT COUNT(*) n FROM guild_castle_receipts').get().n,receipts:f.sql.prepare("SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id LIKE 'shared:%'").get().n,notices:f.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n}),send=(client=live,sequence=1)=>client.ws.send(JSON.stringify({type:'input',sequence,payload:{action:'mode',kind:'guild_village',command:payload.input}}));
 return {...s,other,observer,ticket,live,guest,witness,read,send,old:[world.row,...supervisor.rows.values()]};
}

test('native revoke ejects C4 guest before releasing its barrier and sends one old-hall notice only to the remaining resident',{timeout:35000},async t=>{
 const s=await fixture(t),{f,writer,world,supervisor,other,observer,live,witness,faults,read,send,old}=s,command=writer.command.bind(writer);let committed=false,release;const gate=new Promise(resolve=>release=resolve);t.after(()=>release());
 writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.operation==='mode_action'&&!committed){committed=true;await gate;}return ack;};
 try{send();await until(()=>committed||faults.length,8000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const foreign=(await combatState(supervisor.rows.get(4))).players.find(p=>p.id===other.id);assert(foreign.external);assert.equal(foreign.area,'guild_hall_mode-guild');assert.equal(read().guest.area,'guild_village_1');assert.equal(read().invited,false);}finally{release();}
 await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))&&!world.combat.busy||faults.length,8000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const result=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(result.type,'mode');assert.equal(result.status,200);assert.equal(result.body.ok,true);
 const current=(await combatState(supervisor.rows.get(4))).players.find(p=>p.id===other.id);assert.equal(current.area,'guild_village_1');assert.equal(current.external,null);assert.equal(current.guard,true);const notice=writer.notifications.pending(f.sql,observer.id).find(m=>m.payload.event.type==='player_respawn'&&m.payload.event.playerId===other.id);assert(notice);assert.deepEqual(f.sql.prepare('SELECT actor FROM kernel511_notification_audience WHERE event_id=?').all(notice.id).map(r=>r.actor),[observer.id]);await until(()=>witness.packets.some(p=>p.id===notice.id),5000);assert.equal(live.packets.some(p=>p.id===notice.id),false);assert.deepEqual([world.row,...supervisor.rows.values()],old);
 const once=read();send(live,2);await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===2)),7000);assert.equal(read().nativeReceipts,1);assert.equal(read().notices,1);assert.deepEqual(read().guest,once.guest);assert.equal(read().receipts,2);
});

for(const phase of ['before','after'])test('native guild revoke source SIGKILL '+phase+' COMMIT recovers guest scope and one ejection notification',{timeout:45000},async t=>{
 const s=await fixture(t),{writer,world,core,supervisor,http,connect,ticket,other,read,send,old,faults}=s,source=supervisor.rows.get(ticket.channel),operation=writer.authority.operations.mode_action.execute,command=writer.command.bind(writer),before=read();let killed=false,observed;
 writer.authority.operations.mode_action.execute=(...args)=>{const value=operation(...args);if(phase==='before'&&!killed){killed=true;source.child.kill('SIGKILL');throw Object.assign(Error('guild_ejection_before_commit'),{code:'guild_ejection_before_commit'});}return value;};
 writer.command=async(peer,request)=>{try{const ack=await command(peer,request);if(request.operation==='mode_action'&&phase==='after'&&!killed){killed=true;observed=read();source.child.kill('SIGKILL');throw Object.assign(Error('guild_ejection_lost_ack'),{code:'guild_ejection_lost_ack'});}return ack;}catch(error){if(killed&&phase==='before')observed=read();throw error;}};
 send();await until(()=>observed!==undefined,10000);if(phase==='before')assert.deepEqual(observed,before);else{assert.equal(observed.invited,false);assert.equal(observed.guest.area,'guild_village_1');assert.equal(observed.nativeReceipts,1);assert.equal(observed.notices,1);}
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(row=>row.state==='running'&&!old.includes(row)),20000);await world.stopJobs();assert(old.every(row=>row.exited));assert.equal(source.child.signalCode,'SIGKILL');const fresh=await http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));const next=await connect(fresh);send(next);await until(()=>next.packets.some(p=>p.results?.some(r=>r.sequence===1)),8000);assert.equal(next.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1).status,200);
 const state=read();assert.equal(state.invited,false);assert.equal(state.guest.area,'guild_village_1');assert.equal(state.nativeReceipts,1);assert.equal(state.notices,1);assert.equal(state.receipts,phase==='before'?1:2);if(phase==='after')assert.deepEqual(state.guest,observed.guest);const refreshed=await other.http();assert.equal(refreshed.status,200,JSON.stringify(refreshed));assert.equal(refreshed.channel,4);await connect(refreshed);assert.equal((await combatState(supervisor.rows.get(4))).players.find(p=>p.id===other.id).guard,true);assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
});
