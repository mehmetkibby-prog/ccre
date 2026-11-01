import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,extraPlayer,combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';

async function fixture(t){
 const s=await setup(t,{shared:true}),{f,core,world,supervisor,connect,faults}=s;await world.stopJobs();const leader=extraPlayer(s,51,'transfer-party-leader511'),member=extraPlayer(s,52,'transfer-party-member511'),leaderTicket=await leader.http();assert.equal(leaderTicket.status,200);const first=await member.http();assert.equal(first.status,200);const memberTicket=first.channel===leaderTicket.channel?first:await member.http('transfer',{channel:leaderTicket.channel});assert.equal(memberTicket.status,200);
 leader.live=await connect(leaderTicket);member.live=await connect(memberTicket);leader.sequence=0;member.sequence=0;
 await core.permanentPlayers([leader.id,member.id],()=>{for(const id of [leader.id,member.id])f.sql.prepare("UPDATE players SET area='bazaar',arena_match_id='',x=1000,y=1000,hp=max_hp,combat_lock_until_ms=0,last_seen=? WHERE id=?").run(Math.floor(f.clock()/1000),id);});
 const action=async(actor,payload)=>{const sequence=++actor.sequence;actor.live.ws.send(JSON.stringify({type:'input',sequence,payload}));await until(()=>actor.live.packets.some(p=>p.results?.some(r=>r.sequence===sequence))||faults.length,8000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));return actor.live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===sequence);};
 assert.equal((await action(leader,{action:'invite_party',targetPlayerId:member.id})).status,200);assert.equal((await action(member,{action:'accept_party',targetPlayerId:leader.id})).status,200);
 const party=f.sql.prepare('SELECT party_id FROM party_members WHERE player_id=?').get(leader.id).party_id;assert.equal((await combatState(supervisor.rows.get(leaderTicket.channel))).parties.length,2);
 return {...s,leader,member,leaderTicket,memberTicket,party,action,old:[world.row,...supervisor.rows.values()]};
}

test('native leader channel transfer refreshes the remaining party owner before reopening gameplay',{timeout:30000},async t=>{
 const s=await fixture(t),{f,leader,member,supervisor,world,leaderTicket,party,old,faults}=s,ticket=await leader.http('transfer',{channel:4});assert.equal(ticket.status,200,JSON.stringify(ticket));assert.equal(ticket.channel,4);
 assert.equal(f.sql.prepare('SELECT leader_id FROM parties WHERE id=?').get(party).leader_id,member.id);assert.equal(f.sql.prepare('SELECT 1 FROM party_members WHERE player_id=?').get(leader.id),undefined);
 const remaining=await combatState(supervisor.rows.get(leaderTicket.channel));assert.deepEqual(remaining.parties,[[member.id,party]]);assert.equal((await combatState(supervisor.rows.get(4))).parties.length,0);assert.deepEqual([world.row,...supervisor.rows.values()],old);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
});

test('native transfer holds both old party and imported target until COMMIT acknowledgement and every cold refresh',{timeout:35000},async t=>{
 const s=await fixture(t),{f,core,writer,leader,member,supervisor,leaderTicket,party,faults}=s,accept=writer.acceptTransfer.bind(writer),sourceControl=core.processes.get(leaderTicket.channel).control,sourceRequest=sourceControl.request.bind(sourceControl),targetControl=core.processes.get(4).control,targetRequest=targetControl.request.bind(targetControl);
 let releaseCommit,releaseRefresh,committed=false,waitingRefresh=false,targetRefreshed=false,finished=false;const commitWait=new Promise(r=>releaseCommit=r),refreshWait=new Promise(r=>releaseRefresh=r);
 writer.acceptTransfer=async(...args)=>{const next=await accept(...args);committed=true;await commitWait;return next;};
 sourceControl.request=async(method,payload)=>{if(method==='refresh_frozen'&&payload.id===member.id){waitingRefresh=true;await refreshWait;}return sourceRequest(method,payload);};
 targetControl.request=async(method,payload)=>{const ack=await targetRequest(method,payload);if(method==='refresh_frozen'&&payload.id===leader.id)targetRefreshed=true;return ack;};
 const pending=leader.http('transfer',{channel:4}).then(v=>{finished=true;return v;});
 try{
  await until(()=>committed||faults.length,9000);assert.equal(faults.length,0);assert.equal(f.sql.prepare('SELECT leader_id FROM parties WHERE id=?').get(party).leader_id,member.id);
  const old=await combatState(supervisor.rows.get(leaderTicket.channel));assert.equal(old.parties.length,2);for(const id of [leader.id,member.id])assert.equal(old.players.find(p=>p.id===id).suspended,true);assert.equal(finished,false);
  releaseCommit();await until(()=>waitingRefresh&&targetRefreshed||faults.length,9000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal((await combatState(supervisor.rows.get(4))).players.find(p=>p.id===leader.id).suspended,true);assert.equal((await combatState(supervisor.rows.get(leaderTicket.channel))).parties.length,2);assert.equal(finished,false);
  releaseRefresh();assert.equal((await pending).status,200);const current=await combatState(supervisor.rows.get(leaderTicket.channel));assert.deepEqual(current.parties,[[member.id,party]]);assert.equal(current.players.find(p=>p.id===member.id).suspended,false);assert.equal(core.transferGroups.size,0);assert.equal(core.transitions.size,0);
 }finally{releaseCommit();releaseRefresh();await pending;}
});

for(const phase of ['before','after'])test('transfer party cleanup '+phase+' target COMMIT with actual source SIGKILL keeps one complete CURRENT DB outcome',{timeout:40000},async t=>{
 const s=await fixture(t),{f,core,writer,leader,member,supervisor,world,leaderTicket,party,connect,faults}=s,source=supervisor.rows.get(leaderTicket.channel),target=supervisor.rows.get(4),accept=writer.acceptTransfer.bind(writer);let killed=false;
 writer.acceptTransfer=async(id,peer,options,transition)=>{
  const next=await accept(id,peer,options,phase==='before'?(sql,owner)=>{const result=transition(sql,owner);if(!killed){killed=true;source.child.kill('SIGKILL');throw Object.assign(Error('transfer_before_commit'),{code:'transfer_before_commit'});}return result;}:transition);
  if(phase==='after'&&!killed){killed=true;source.child.kill('SIGKILL');throw Object.assign(Error('transfer_commit_ack_lost'),{code:'transfer_commit_ack_lost'});}return next;
 };
 const response=await leader.http('transfer',{channel:4});assert.notEqual(response.status,200);assert(killed);
 await until(()=>supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running')&&supervisor.rows.get(leaderTicket.channel)!==source&&core.transitions.size===0,18000);assert(source.exited);assert.equal(source.child.signalCode,'SIGKILL');if(phase==='after')assert(target.exited);
 const expected=phase==='after'?4:leaderTicket.channel;assert.equal(writer.authority.owner(leader.id).channel,expected);assert.equal(f.sql.prepare('SELECT channel FROM players WHERE id=?').get(leader.id).channel,expected);assert.equal(f.sql.prepare('SELECT leader_id FROM parties WHERE id=?').get(party).leader_id,phase==='after'?member.id:leader.id);assert.equal(Boolean(f.sql.prepare('SELECT 1 FROM party_members WHERE player_id=?').get(leader.id)),phase==='before');
 const ticket=await leader.http();assert.equal(ticket.status,200);assert.equal(ticket.channel,expected);const live=await connect(ticket);assert.equal(live.ws.readyState,1);assert.equal(core.transferGroups.size,0);assert(!faults.some(f=>f.supervisor||f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));assert.equal(world.row.state,'running');
});

for(const method of ['admit_held','refresh_frozen','resume'])test('lost '+method+' ACK with actual target SIGKILL retires every affected transfer owner',{timeout:40000},async t=>{
 const s=await fixture(t),{f,core,writer,leader,member,supervisor,leaderTicket,party,connect,faults}=s,source=supervisor.rows.get(leaderTicket.channel),target=supervisor.rows.get(4),control=core.processes.get(4).control,request=control.request.bind(control);let lost=false;
 control.request=async(kind,payload)=>{const ack=await request(kind,payload);if(kind===method&&!lost){lost=true;target.child.kill('SIGKILL');throw Object.assign(Error('transfer_target_ack_lost'),{code:'transfer_target_ack_lost'});}return ack;};
 const response=await leader.http('transfer',{channel:4});assert(lost);assert.notEqual(response.status,200);await until(()=>supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running')&&core.transitions.size===0&&source.exited&&target.exited,18000);
 assert.equal(target.child.signalCode,'SIGKILL');assert.equal(writer.authority.owner(leader.id).channel,4);assert.equal(f.sql.prepare('SELECT leader_id FROM parties WHERE id=?').get(party).leader_id,member.id);assert.equal(f.sql.prepare('SELECT 1 FROM party_members WHERE player_id=?').get(leader.id),undefined);assert.deepEqual((await combatState(supervisor.rows.get(leaderTicket.channel))).parties,[[member.id,party]]);
 const ticket=await leader.http();assert.equal(ticket.status,200);assert.equal(ticket.channel,4);assert.equal((await connect(ticket)).ws.readyState,1);assert.equal(core.transferGroups.size,0);assert(!faults.some(f=>f.supervisor||f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
});
