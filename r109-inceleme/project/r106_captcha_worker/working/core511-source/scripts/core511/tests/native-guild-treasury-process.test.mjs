import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {villageFixture} from './native-guild-village-fixture.mjs';
import {membershipHandler,membershipRequest} from './native-guild-membership-fixture.mjs';
import {combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';

async function fixture(t){const s=await villageFixture(t);await s.core.nativeConfiguration.run([],()=>s.f.sql.prepare("UPDATE guilds SET treasury=100 WHERE id='http-revoke511'").run());const body={action:'withdraw',amount:10,requestId:randomUUID()},handler=membershipHandler(s);return {...s,body,request:input=>membershipRequest(s,input??body),handler};}
const read=s=>JSON.parse(JSON.stringify({essence:s.f.sql.prepare('SELECT essence FROM players WHERE id=?').get(s.f.id).essence,treasury:s.f.sql.prepare("SELECT treasury FROM guilds WHERE id='http-revoke511'").get().treasury,ledger:s.f.sql.prepare("SELECT * FROM guild_ledger WHERE guild_id='http-revoke511' ORDER BY id").all(),notices:s.f.sql.prepare("SELECT COUNT(*) n FROM kernel511_notifications WHERE json_extract(payload,'$.event.type')='guild_changed'").get().n}));

test('native treasury withdrawal refreshes current player before reply and native replay never credits twice',{timeout:40000},async t=>{
 const s=await fixture(t),initial=read(s),reply=await s.handler(s.request());assert.equal(reply.status,200,await reply.text());const after=read(s),view=(await combatState(s.supervisor.rows.get(s.ticket.channel))).players.find(p=>p.id===s.f.id);assert.equal(after.essence,initial.essence+10);assert.equal(view.essence,after.essence);assert.equal(after.treasury,90);assert.equal(after.ledger.length,1);assert.equal(after.notices,1);
 const notice=s.writer.notifications.pending(s.f.sql,s.observer.id).find(n=>n.payload.event.type==='guild_changed');assert(notice);await until(()=>s.observer.live.packets.some(p=>p.id===notice.id),5000);assert(!s.guest.live.packets.some(p=>p.id===notice.id));
 for(const amount of [10,20]){const retry=await s.handler(s.request({...s.body,amount}));assert.equal(retry.status,200);assert.match((await retry.json()).message,/tekrar ödeme yapılmadı/);const replayed=read(s);assert.equal(replayed.essence,after.essence);assert.equal(replayed.treasury,90);assert.deepEqual(replayed.ledger,after.ledger);}
 assert.equal(read(s).notices,3);const before=read(s),denied=await s.handler(s.request({...s.body,requestId:randomUUID(),amount:101}));assert.equal(denied.status,409,await denied.text());assert.deepEqual(read(s),before);assert.deepEqual([s.world.row,...s.supervisor.rows.values()],s.old);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('native treasury waits for accepted potion ACK and preserves the prior spend and new credit',{timeout:40000},async t=>{
 const s=await fixture(t),{f,core,writer}=s;await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET hp=1,potions=2 WHERE id=?').run(f.id));
 const command=writer.command.bind(writer);let committed=false,release,answered=false;const gate=new Promise(r=>release=r);writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.playerId===f.id&&request.operation==='native_action'&&!committed){committed=true;await gate;}return ack;};
 try{s.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>committed||s.faults.length,7000);assert(committed,s.faults.map(f=>f.error?.stack).join('\n'));const before=read(s),pending=s.handler(s.request()).finally(()=>answered=true);await until(()=>core.globalWorld.held?.phase==='freezing',6000);assert.equal(answered,false);assert.deepEqual(read(s),before);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,1);
  release();const response=await pending;assert.equal(response.status,200,await response.text());const view=(await combatState(s.supervisor.rows.get(s.ticket.channel))).players.find(p=>p.id===f.id);assert.equal(view.potions,1);assert.equal(view.essence,before.essence+10);assert.equal(read(s).ledger.length,1);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
 }finally{release();}
});

for(const phase of ['before','after'])test('native treasury source SIGKILL '+phase+' COMMIT retains one native transfer and receipt',{timeout:45000},async t=>{
 const s=await fixture(t),{core,world,writer,supervisor,ticket}=s,rules=core.nativeGuildVillage.membershipRules,act=rules.guildAction,append=writer.notifications.append.bind(writer.notifications),durable=writer.durableExternal.bind(writer),source=supervisor.rows.get(ticket.channel),before=read(s);let calls=0,killed=false;
 rules.guildAction=(...args)=>{calls++;return act(...args);};writer.notifications.append=(...args)=>{const result=append(...args);if(phase==='before'&&!killed){killed=true;source.child.kill('SIGKILL');throw Error('guild_withdraw_before_commit');}return result;};writer.durableExternal=async()=>{await durable();if(phase==='after'&&!killed){killed=true;source.child.kill('SIGKILL');throw Error('guild_withdraw_commit_ack_lost');}};
 try{const response=await s.handler(s.request());assert.equal(response.status,409,await response.text());}finally{rules.guildAction=act;writer.notifications.append=append;writer.durableExternal=durable;}
 assert(killed);assert.equal(calls,1);const immediate=read(s);if(phase==='before')assert.deepEqual(immediate,before);else{assert.equal(immediate.essence,before.essence+10);assert.equal(immediate.treasury,90);assert.equal(immediate.ledger.length,1);assert.equal(immediate.notices,1);}
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&!world.global.held&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!s.old.includes(r)),20000);await world.stopJobs();assert(s.old.every(r=>r.exited));assert.equal(source.child.signalCode,'SIGKILL');
 const fresh=await s.http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));await s.connect(fresh);const retry=await s.handler(s.request());assert.equal(retry.status,200);assert.match((await retry.json()).message,phase==='before'?/güvenle karakterine/:/tekrar ödeme yapılmadı/);const after=read(s);assert.equal(after.essence,before.essence+10);assert.equal(after.treasury,90);assert.equal(after.ledger.length,1);assert.equal(after.notices,phase==='before'?1:2);assert.equal((await combatState(supervisor.rows.get(fresh.channel))).players.find(p=>p.id===s.f.id).essence,after.essence);assert(!s.faults.some(f=>f.globalRecovery),s.faults.map(f=>f.error?.stack).join('\n'));
});
