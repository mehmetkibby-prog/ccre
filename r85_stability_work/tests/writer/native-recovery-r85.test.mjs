import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,extraPlayer,combatState} from '../../working/core511-source/scripts/core511/tests/process-fixture.mjs';
import {until} from '../../working/core511-source/scripts/core511/tests/helpers.mjs';

const gate=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const attack=live=>live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'shared-process511',spawnRound:1,ability:0,intentId:'r85-native-once'}}));
const faultText=s=>s.faults.map(f=>f.error?.stack??String(f)).join('\n');

test('native shared failed hold recovers actual owners while a sibling ACK remains withheld',{timeout:60000},async t=>{
 const s=await setup(t,{shared:true,sharedCombat:{hp:1}}),{f,core,world,writer,supervisor,http,connect}=s;await world.stopJobs();
 const ticket=await http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await connect(ticket);
 const old=[world.row,...supervisor.rows.values()],oldOwner={...writer.authority.owner(f.id)},delayed=gate(),started=gate();let held=false,calls=0;
 const command=writer.command.bind(writer);writer.command=(peer,request)=>{if(request.payload?.sharedLease)calls++;return command(peer,request);};
 const slow=core.processes.get(4).control,slowRequest=slow.request.bind(slow);
 slow.request=async(method,payload)=>{const answer=await slowRequest(method,payload);if(method==='shared_hold'){held=true;started.resolve();await delayed.promise;}return answer;};
 const bad=core.processes.get(2).control,badRequest=bad.request.bind(bad);
 bad.request=async(method,payload)=>{const answer=await badRequest(method,payload);if(method==='shared_hold'){await started.promise;throw Object.assign(Error('r85_test_lost_hold_ack'),{code:'ipc_control_outcome_unknown'});}return answer;};
 t.after(()=>delayed.resolve());attack(live);
 await until(()=>held&&old.every(r=>r.exited)&&!core.recoveringWorld&&!world.global.recovery&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!old.includes(r)),30000);
 assert.equal(calls,0,'no native mutation was submitted');assert.equal(f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get('shared-process511').hp,1);
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id LIKE 'shared:%'").get().n,0);
 const owner=writer.authority.owner(f.id);assert(owner.epoch>oldOwner.epoch);assert.notEqual(owner.incarnation,oldOwner.incarnation);
 const freshWorld=world.row;delayed.resolve();await new Promise(r=>setTimeout(r,50));assert.equal(world.row,freshWorld);assert.equal(core.recoveringWorld,false);assert.equal(world.combat.terminal,null);
 const fresh=await http('character',{channel:1});assert.equal(fresh.status,200,JSON.stringify(fresh));await connect(fresh);
 assert.equal(calls,0);assert(!s.faults.some(f=>f.globalRecovery),faultText(s));
 t.diagnostic(JSON.stringify({scope:'real native SQLite, four OS channels/world, real holds with injected ACK loss/delay',oldProcessesExited:old.every(r=>r.exited),oldEpoch:oldOwner.epoch,newEpoch:owner.epoch,mutationCalls:calls,receipts:0,lateAckIgnored:true}));
});

test('native shared COMMIT ACK loss resolves from its exact durable receipt without rerunning gameplay',{timeout:45000},async t=>{
 const s=await setup(t,{shared:true,sharedCombat:{hp:1}}),{f,core,world,writer,supervisor,http,connect}=s;await world.stopJobs();
 const ticket=await http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await connect(ticket),old=[world.row,...supervisor.rows.values()],before={...writer.authority.owner(f.id)};
 const command=writer.command.bind(writer);let lost=false,calls=0,captured;
 writer.command=async(peer,request)=>{if(request.payload?.sharedLease){calls++;captured=request;}const ack=await command(peer,request);if(request.payload?.sharedLease&&!lost){lost=true;throw Object.assign(Error('r85_committed_ack_lost'),{code:'ipc_request_timeout'});}return ack;};
 attack(live);await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||s.faults.length,12000);
 assert.equal(s.faults.length,0,faultText(s));assert(lost);const result=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.hits[0].hp,0);
 assert.equal(calls,1);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(captured.operationId).n,1);
 assert.equal(writer.authority.owner(f.id).epoch,before.epoch);assert.deepEqual([world.row,...supervisor.rows.values()],old);assert.equal(core.actorIsolation.unknown.size,0);assert.equal(world.combat.terminal,null);
 const xp=f.sql.prepare('SELECT xp FROM players WHERE id=?').get(f.id).xp;live.ws.terminate();await live.closed;const fresh=await http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));const next=await connect(fresh);assert(next.packets.find(p=>p.type==='ready').results.some(r=>r.sequence===1));
 assert.equal(f.sql.prepare('SELECT xp FROM players WHERE id=?').get(f.id).xp,xp);assert.equal(calls,1);
 t.diagnostic(JSON.stringify({scope:'native writer COMMIT, current WAL durability and exact receipt recovery',calls,receipts:1,sameEpoch:true,sameProcesses:true,reconnectResultReplayed:true}));
});

test('native command becoming pending during a cold freeze releases its healthy peer and later commits the original once',{timeout:55000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,supervisor,http,connect}=s;await world.stopJobs();
 const ticket=await http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await connect(ticket),other=extraPlayer(s,85),otherTicket=await other.http('character',{channel:1});assert.equal(otherTicket.status,200,JSON.stringify(otherTicket));await connect(otherTicket);
 await core.permanentPlayers([f.id,other.id],()=>f.sql.prepare('UPDATE players SET hp=500,max_hp=1000,potions=2 WHERE id=?').run(f.id));
 const old=[world.row,...supervisor.rows.values()],before={...writer.authority.owner(f.id)},command=writer.command.bind(writer),rejectReply=gate(),complete=gate();let captured,original,calls=0;
 writer.command=async(peer,request)=>{
  if(request.operation!=='native_action'||captured)return command(peer,request);
  captured={peer,request};original=complete.promise.then(()=>{calls++;return command(peer,request);});void original.catch(()=>{});
  await rejectReply.promise;throw Object.assign(Error('r85_original_still_pending'),{code:'ipc_request_timeout'});
 };
 t.after(()=>{rejectReply.resolve();complete.resolve();});
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>captured,7000);
 let coldCalls=0,coldError;const cold=core.permanentPlayers([f.id,other.id],()=>coldCalls++).catch(e=>{coldError=e;});
 await until(()=>core.permanent.entries.has(f.id),4000);
 // Confirm the real child's quiescer exists before the uncertain reply arrives.
 let state;for(let i=0;i<100;i++){state=await combatState(supervisor.rows.get(1));if(state.players.find(p=>p.id===f.id)?.quiescing)break;await new Promise(r=>setTimeout(r,5));}
 assert.equal(state.players.find(p=>p.id===f.id)?.quiescing,true);rejectReply.resolve();await cold;
 assert.equal(coldError?.code,'actor_command_pending');assert.equal(coldCalls,0);assert.equal(core.permanent.entries.size,1);assert(core.permanent.entries.has(f.id));assert(core.actorIsolation.unknownActors.has(f.id));
 state=await combatState(supervisor.rows.get(1));assert.equal(state.players.find(p=>p.id===other.id)?.suspended,false);assert.equal(state.players.find(p=>p.id===f.id)?.barrier,true,JSON.stringify(state));assert.throws(()=>core.actorIsolation.assertAvailable([f.id]),{code:'actor_command_pending'});
 assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,2);assert.equal(calls,0);assert.equal(writer.authority.owner(f.id).epoch,before.epoch);
 complete.resolve();await original;await until(()=>!core.actorIsolation.unknownActors.has(f.id)&&!core.permanent.entries.has(f.id),10000);
 assert.equal(calls,1);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,1);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(captured.request.operationId).n,1);
 assert.deepEqual([world.row,...supervisor.rows.values()],old);const fresh=await http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));const resumed=await connect(fresh);assert.equal(writer.authority.owner(f.id).epoch,before.epoch);
 resumed.ws.send(JSON.stringify({type:'input',sequence:2,payload:{action:'use_potion'}}));await until(()=>resumed.packets.some(p=>p.results?.some(r=>r.sequence===2)||p.type==='retry'&&p.sequence===2),5000);
 assert.equal(resumed.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===2)?.status,200,JSON.stringify(resumed.packets.filter(p=>p.results?.length||p.type==='retry')));
 assert(!s.faults.some(f=>f.globalRecovery||f.actorIsolation),faultText(s));
 t.diagnostic(JSON.stringify({scope:'real native pending command and child quiescer, current DB receipt and owner',coldCalls,originalCalls:calls,receiptCount:1,healthyPeerResumed:true,epochUnchanged:true}));
});

test('native pending originals retain exact digest checks and cannot write another pending actor',{timeout:50000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,http,connect}=s;await world.stopJobs();
 const first=await http('character',{channel:1});assert.equal(first.status,200,JSON.stringify(first));const a=await connect(first),other=extraPlayer(s,86),second=await other.http('character',{channel:2});assert.equal(second.status,200,JSON.stringify(second));const b=await connect(second);
 await core.permanentPlayers([f.id,other.id],()=>{for(const id of [f.id,other.id])f.sql.prepare('UPDATE players SET hp=500,max_hp=1000,potions=2 WHERE id=?').run(id);});
 const captured=new Map(),command=writer.command.bind(writer),release=gate();let calls=0;
 writer.command=async(peer,request)=>{if(request.operation!=='native_action'||captured.has(request.playerId))return command(peer,request);const original=release.promise.then(()=>{calls++;return command(peer,request);});void original.catch(()=>{});captured.set(request.playerId,{peer,request,original});throw Object.assign(Error('r85_pending_exact_identity'),{code:'ipc_request_timeout'});};
 t.after(()=>release.resolve());for(const live of [a,b])live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));
 await until(()=>captured.size===2&&[f.id,other.id].every(id=>core.actorIsolation.unknownActors.has(id)),8000);
 const {peer,request}=captured.get(f.id),resources=request.payload.resources??[];
 assert.doesNotThrow(()=>core.authority.commandGuard(f.sql,peer,request,resources));
 for(const changed of [
  {...request,sequence:request.sequence+1},
  {...request,operationId:request.operationId+'-different'},
  {...request,epoch:request.epoch+1},
  {...request,payload:{...request.payload,input:{...request.payload.input,action:'respawn'}}},
  {...request,payload:{...request.payload,resources:[...resources,'player:'+other.id]}}
 ])assert.throws(()=>core.authority.commandGuard(f.sql,peer,changed,changed.payload.resources??[]),{code:'permanent_actor_fenced'});
 assert.throws(()=>core.authority.commandGuard(f.sql,{...peer,incarnation:'stale-r85-native-owner'},request,resources),{code:'permanent_actor_fenced'});
 assert.throws(()=>core.authority.commandGuard(f.sql,peer,request,[...resources,'player:'+other.id]),{code:'permanent_actor_fenced'});
 assert.equal(calls,0);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,2);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(other.id).potions,2);
 release.resolve();await Promise.all([...captured.values()].map(x=>x.original));await until(()=>!core.actorIsolation.unknown.size,10000);
 assert.equal(calls,2);for(const [id,{request}]of captured){assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(id).potions,1);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId).n,1);}
 assert.equal(s.faults.length,0,faultText(s));
 t.diagnostic(JSON.stringify({scope:'two real native pending commands and current SQLite owners',changedSequenceRejected:true,changedOperationIdRejected:true,changedEpochRejected:true,changedPayloadRejected:true,changedResourcesRejected:true,changedOwnerRejected:true,additionalPendingActorRejected:true,originalCalls:calls,receipts:2}));
});
