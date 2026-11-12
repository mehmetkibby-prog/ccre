import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';

test('native writer binds the private owner stream to the verified main identity, never payload identity',{timeout:30000},async t=>{
 const {f,core,world,writer,supervisor,http}=await setup(t,{shared:true});await world.stopJobs();const ticket=await http('ticket');assert.equal(ticket.status,200);const owner=writer.authority.owner(f.id),peer=supervisor.rows.get(ticket.channel).peer,s=core.sessions.get(f.id),context={realm:core.realmId,actor:f.id,epoch:owner.epoch,peer},guard=writer.ports.guard;
 await f.f.database.atomic(sql=>{
  const call=(payload={},ctx=context,kind='native_action')=>guard(sql,payload,ctx,kind);
  assert.equal(call({actor:'forged-actor',account:'forged-account',session:'forged-session',epoch:0}),true);
  assert.throws(()=>call({}, {...context,realm:'another-realm'}),{code:'native_writer_host_binding'});
  assert.throws(()=>call({},context,'unknown_native_operation'),{code:'native_writer_operation'});
  assert.throws(()=>call({}, {...context,epoch:owner.epoch+1}));
  core.sessions.delete(f.id);try{assert.throws(()=>call(),{code:'native_writer_session_binding'});}finally{core.sessions.set(f.id,s);}
  for(const [field,patch,code]of [
   ['identity',{account:'another-account'},'native_writer_session_binding'],
   ['identity',{session:'another-token'},'native_writer_session_binding'],
   ['identity',{boot:'retired-owner'},'native_writer_session_binding'],
   ['session',{tokenHash:'another-token'},'native_writer_verified_identity'],
   ['session',{securityVersion:s.identity.securityVersion+1},'native_writer_verified_identity'],
   ['security',{account:'another-account'},'native_writer_verified_identity'],
   ['security',{epoch:owner.epoch+1},'native_writer_verified_identity'],
   ['security',{securityVersion:s.identity.securityVersion+1},'native_writer_verified_identity']
  ]){const before=s[field];try{s[field]={...before,...patch};assert.throws(()=>call(),{code});}finally{s[field]=before;}}
  // Accepted commands remain attributable during revocation/drain; this guard
  // does not renew permissions or re-admit new inputs after a later deadline.
  const security=s.security;try{s.security={...security,blocked:true,securityValidUntil:0};assert.equal(call(),true);}finally{s.security=security;}
 });
 assert.throws(()=>guard(f.sql,{},context,'native_action'),{code:'native_writer_host_binding'});
});

test('native potion accepted before security expiry commits once, while the expired socket loses permission',{timeout:35000},async t=>{
 const {f,core,world,writer,supervisor,http,connect,faults}=await setup(t,{shared:true});await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),old=[world.row,...supervisor.rows.values()];
 await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET hp=500,max_hp=1000,potions=2 WHERE id=?').run(f.id));
 const command=writer.command.bind(writer);let release,captured;const gate=new Promise(r=>release=r);
 writer.command=async(peer,request)=>{if(request.operation==='native_action'&&!captured){captured=request;await gate;}return command(peer,request);};
 try{
  live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>captured||faults.length,8000);assert(captured);assert.equal(faults.length,0);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,2);
  // Deliver the already authenticated presence before advancing the trusted
  // snapshot. No heartbeat, SQL auth expiry or native policy is bypassed.
  await until(()=>core.presence.entries.get(f.id)?.lastAt>=captured.payload.nowMs,5000);
  const s=core.sessions.get(f.id);s.security={...s.security,securityValidUntil:0,revision:core.nextRevision(f.id)};await core.processes.get(ticket.channel).control.request('session',s.security);await live.closed;
  assert.throws(()=>core.ticketFor(s),{code:'ticket_session_expired'});assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,2);
  release();await until(()=>f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions===1||faults.length,8000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,1);
  let state;for(let i=0;i<200;i++){state=await combatState(supervisor.rows.get(ticket.channel));if(state.players.find(p=>p.id===f.id)?.applied===1)break;await new Promise(r=>setTimeout(r,10));}assert.equal(state.players.find(p=>p.id===f.id)?.applied,1);assert(!state.players.find(p=>p.id===f.id)?.barrier);
  await core.refresh();const fresh=await http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));assert.equal(fresh.channel,ticket.channel);const next=await connect(fresh),ready=next.packets.find(p=>p.type==='ready');assert.equal(ready.lastApplied,1);assert(ready.results.some(r=>r.sequence===1));
  // The existing protocol replays on ready and rejects a reused input
  // sequence; it does not promise another result frame for that duplicate.
  next.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));assert.equal((await next.closed)[0],1008);
  assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,1);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(captured.operationId).n,1);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.deepEqual([world.row,...supervisor.rows.values()],old);
 }finally{release();}
});
