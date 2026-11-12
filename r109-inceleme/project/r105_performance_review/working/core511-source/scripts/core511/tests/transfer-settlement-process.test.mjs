import test from 'node:test';
import assert from 'node:assert/strict';
import {controlled} from './settlement-process-fixture.mjs';
import {until} from './helpers.mjs';
import {setup,extraPlayer,combatState} from './process-fixture.mjs';
import {put} from './pvp-fixture.mjs';

test('native channel transfer settles the original incoming hit against current shared guardian control',{timeout:30000},async t=>{
 const {f,http,ticket,world,release,checkpointPending,faults,mid,controlled:control}=await controlled(t);let result,error;
 try{
  const pending=http('transfer',{channel:ticket.channel===4?1:4}).then(value=>result=value,e=>error=e);await until(()=>result||error||checkpointPending()||faults.length,8000);release();await pending;assert.ifError(error);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
  assert.equal(result.status,409,JSON.stringify(result));assert.equal(result.error,'Savaş sürerken kanal değiştiremezsin.');assert.equal(f.sql.prepare('SELECT hp FROM players WHERE id=?').get(f.id).hp,500,'native stunned shared monster cannot hit during the rejected channel change');assert.equal(f.sql.prepare('SELECT stun_until_ms FROM monsters WHERE id=?').get(mid).stun_until_ms,control.stun_until_ms);assert(!world.combat.busy);
 }finally{release();}
});

test('queued native party acceptance can finish before a transfer read lease and the changed roster is frozen again',{timeout:35000},async t=>{
 let guest;const s=await controlled(t,{beforeCombat:async s=>{
  const {f,core,ticket,connect}=s,other=extraPlayer(s,61),sender=extraPlayer(s,62,'transfer-sender511');
  for(const actor of [other,sender]){await core.permanentPlayers([actor.id],()=>f.sql.prepare("UPDATE players SET area='bazaar',combat_lock_until_ms=0 WHERE id=?").run(actor.id));const first=await actor.http();assert.equal(first.status,200,JSON.stringify(first));const same=first.channel===ticket.channel?first:await actor.http('transfer',{channel:ticket.channel});assert.equal(same.status,200,JSON.stringify(same));actor.live=await connect(same);}guest={...other,senderId:sender.id};
  await core.permanentPlayers([f.id,guest.id,sender.id],()=>{const now=Math.floor(f.clock()/1000);for(const id of [guest.id,sender.id])f.sql.prepare("UPDATE players SET area='forest',x=1000,y=1000,hp=1000000,max_hp=1000000,combat_lock_until_ms=0 WHERE id=?").run(id);put(f.sql,'parties',{id:'transfer-settlement-party',leader_id:sender.id,created_at:now});for(const id of [f.id,sender.id])put(f.sql,'party_members',{player_id:id,party_id:'transfer-settlement-party',joined_at:now});put(f.sql,'party_invites',{recipient_id:guest.id,sender_id:sender.id,created_at:now});});
 }}),{f,core,http,ticket,world,supervisor,faults,release,checkpointPending}=s;
 const acquire=world.combat.acquire.bind(world.combat),cold=world.combat.acquireCold.bind(world.combat);let releasePrior,priorGranted=false,coldQueued=0,result,error;const gate=new Promise(r=>releasePrior=r);
 world.combat.acquire=async(peer,payload)=>{const grant=await acquire(peer,payload);if(payload.actor===guest.id&&!priorGranted){priorGranted=true;await gate;}return grant;};world.combat.acquireCold=(...args)=>{coldQueued++;return cold(...args);};
 try{
  guest.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'accept_party',targetPlayerId:guest.senderId}}));await until(()=>priorGranted||faults.length,7000);assert(priorGranted);
  const pending=http('transfer',{channel:ticket.channel===4?1:4}).then(v=>result=v,e=>error=e);await until(()=>coldQueued||faults.length,7000);assert.equal([...core.transferGroups][0]?.phase,'freezing');releasePrior();await until(()=>checkpointPending()||faults.length,7000);release();await pending;assert.ifError(error);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
  assert.equal(result.status,409,JSON.stringify(result));await until(()=>guest.live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,7000);const accepted=guest.live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(accepted?.status,200,JSON.stringify(accepted));assert(coldQueued>=2,'a changed native roster must release the read lease before draining the newly joined actor');assert.equal(f.sql.prepare('SELECT hp FROM players WHERE id=?').get(f.id).hp,500);
  const state=await combatState(supervisor.rows.get(ticket.channel));assert.equal(state.parties.length,3);assert(state.players.every(p=>!p.suspended&&!p.external&&!p.barrier));assert.equal(core.transferGroups.size,0);assert(!world.combat.busy);
 }finally{releasePrior();release();}
});

async function recovered(s){const {core,world,supervisor,old,faults}=s;await until(()=>!core.recoveringWorld&&!world.global.recovery&&!world.global.held&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!old.includes(r)),20000);assert(old.every(r=>r.exited));assert.equal(core.transferGroups.size,0);assert.equal(core.transitions.size,0);assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));}

for(const phase of ['before','after'])test('actual source SIGKILL '+phase+' native transfer preflight COMMIT retires the shared read and every old owner',{timeout:40000},async t=>{
 const s=await controlled(t),{f,core,http,ticket,world,supervisor,release,checkpointPending}=s,source=supervisor.rows.get(ticket.channel),preflight=core.entry.transferPreflight.bind(core.entry),atomic=core.database.atomic.bind(core.database);let killed=false,result,error;
 core.entry.transferPreflight=(...args)=>{const value=preflight(...args);if(phase==='before'&&!killed){killed=true;source.child.kill('SIGKILL');throw Object.assign(Error('transfer_settlement_before_commit'),{code:'transfer_settlement_before_commit'});}return value;};
 core.database.atomic=async(...args)=>{const value=await atomic(...args);if(phase==='after'&&!killed&&value?.result?.body?.error==='Savaş sürerken kanal değiştiremezsin.'){killed=true;source.child.kill('SIGKILL');throw Object.assign(Error('transfer_settlement_commit_ack_lost'),{code:'transfer_settlement_commit_ack_lost'});}return value;};
 try{const pending=http('transfer',{channel:ticket.channel===4?1:4}).then(v=>result=v,e=>error=e);await until(()=>checkpointPending()||result||error,7000);release();await pending;assert.ifError(error);assert(killed);assert.notEqual(result.status,200);await recovered(s);assert.equal(source.child.signalCode,'SIGKILL');assert.equal(f.sql.prepare('SELECT hp FROM players WHERE id=?').get(f.id).hp,500);assert(!world.combat.busy);}finally{release();}
});

for(const method of ['shared_checkpoint','shared_finish'])test('lost cold '+method+' reply with actual world SIGKILL fences all five owners',{timeout:40000},async t=>{
 const s=await controlled(t),{f,core,http,ticket,world,release,checkpointPending}=s,oldWorld=world.row,request=oldWorld.control.request.bind(oldWorld.control);let killed=false,result,error;
 oldWorld.control.request=async(kind,payload,...options)=>{const ack=await request(kind,payload,...options);if(kind===method&&!killed){killed=true;oldWorld.child.kill('SIGKILL');throw Object.assign(Error('transfer_shared_read_ack_lost'),{code:'transfer_shared_read_ack_lost'});}return ack;};
 try{const pending=http('transfer',{channel:ticket.channel===4?1:4}).then(v=>result=v,e=>error=e);await until(()=>checkpointPending()||result||error,7000);release();await pending;assert.ifError(error);assert(killed);assert.notEqual(result.status,200);await recovered(s);assert.equal(oldWorld.child.signalCode,'SIGKILL');assert.equal(f.sql.prepare('SELECT hp FROM players WHERE id=?').get(f.id).hp,500);assert(!world.combat.busy);}finally{release();}
});

test('ordinary native transfer without a shared encounter takes no world combat lease',{timeout:25000},async t=>{
 const {http,world,supervisor,faults}=await setup(t,{shared:true});await world.stopJobs();const initial=await http('ticket');assert.equal(initial.status,200);let leases=0;const acquire=world.combat.acquire.bind(world.combat);world.combat.acquire=(...args)=>{leases++;return acquire(...args);};const old=[world.row,...supervisor.rows.values()],next=await http('transfer',{channel:initial.channel===4?1:4});assert.equal(next.status,200,JSON.stringify(next));assert.equal(leases,0);assert.deepEqual([world.row,...supervisor.rows.values()],old);assert.equal(faults.length,0);
});
