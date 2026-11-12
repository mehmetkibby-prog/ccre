import {extraPlayer,setup,liveGuildCombat,combatState} from './process-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import path from 'node:path';
import {setupEntry} from './entry-fixture.mjs';
import {until} from './helpers.mjs';
import {GameWriter} from '../writer-runtime.mjs';
import {CoreCoordinator} from '../coordinator.mjs';
import {ChannelProcessSupervisor} from '../process-supervisor.mjs';
import {WorldProcessSupervisor} from '../world-supervisor.mjs';
import {ProcessStream} from '../process-stream.mjs';
import {ReadWorker} from '../read-worker.mjs';
import {PROTOCOL} from '../contract.mjs';
const webSocketModule='/tmp/core511-build-deps/node_modules/ws/wrapper.mjs', {WebSocket}=await import(webSocketModule);
import {seedGuildWar} from './guild-war-fixture.mjs';
import {seedHeartbeatRewards} from './heartbeat-maintenance-fixture.mjs';
import {put} from './pvp-fixture.mjs';
import {nativeTokenHash} from '../entry-writer.mjs';
import {bootstrapFourthChannel} from '../channel-content.mjs';







test('native ranked RuneV2 hit in channel4 uses resident eligibility and one durable contribution checkpoint',{timeout:35000},async t=>{
 const {f,writer,core,supervisor,http,connect,faults}=await setup(t,{rune:true,content:true});assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM monsters WHERE channel=4').get().n,289);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_content_bootstrap').get().n,1);let ticket=await http('ticket');assert.equal(ticket.status,200);ticket=await http('transfer',{channel:4});assert.equal(ticket.status,200,JSON.stringify(ticket));
 await core.permanentPlayers([f.id],()=>f.sql.prepare("UPDATE players SET area='rune_v2',x=2240,y=700,level=65,hp=1000000,max_hp=1000000,attack_one_at=0,stun_until_ms=0,root_until_ms=0 WHERE id=?").run(f.id));
 const live=await connect(ticket),rows=[...supervisor.rows.values()],commands=[],command=writer.command.bind(writer);writer.command=(peer,request)=>{commands.push(request.operation);return command(peer,request);};
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'rune-v2-boss-c4-1',spawnRound:17,ability:0,intentId:'ranked-native-c4'}}));
 await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,10000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const reply=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(reply.status,200,JSON.stringify(reply));assert(reply.body.hits[0].damage>0);assert(reply.body.hits[0].hp>0);assert(!commands.includes('attack'),'nonterminal hit stays in resident memory');
 await core.permanentPlayers([f.id],()=>{});const contribution=f.sql.prepare("SELECT stone_damage476,stone_first_hit_at_ms476 FROM monster_participants WHERE monster_id='rune-v2-boss-c4-1' AND spawn_round=17 AND player_id=?").get(f.id);assert.equal(contribution.stone_damage476,reply.body.hits[0].damage);assert(contribution.stone_first_hit_at_ms476>0);assert.deepEqual([...supervisor.rows.values()],rows);assert.equal(live.ws.readyState,1);
});

test('shared native nonterminal attack uses the fifth owner, all four replicas and one delayed contribution checkpoint',{timeout:35000},async t=>{
 const {f,writer,world,supervisor,faults,http,connect}=await setup(t,{shared:true,sharedCombat:{boss:true}});await world.stopJobs();const ticket=await http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await connect(ticket),writes=[],command=writer.system.command.bind(writer.system);
 writer.system.command=(peer,payload)=>{if(peer.channel===0&&payload.kind==='combat_checkpoint')writes.push(payload);return command(peer,payload);};
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'shared-process511',spawnRound:1,ability:0,intentId:'shared-native-1'}}));
 await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,10000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
 const reply=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(reply.status,200,JSON.stringify(reply));assert(reply.body.hits[0].damage>0);assert.equal(world.combat.busy,false);const hp=world.monsters.get('shared-process511').hp;assert(hp<1000000);assert.equal(writes.length,0,'normal damage makes no synchronous SQL command');
 const snapshots=await Promise.all([...supervisor.rows.values()].map(async row=>{const request=randomUUID(),answer=new Promise(resolve=>{const listener=m=>{if(m?.type==='test-shared-snapshot'&&m.request===request){row.child.off('message',listener);resolve(m.snapshot);}};row.child.on('message',listener);});row.child.send({type:'test-shared-snapshot',request,id:'shared-process511'});return answer;}));assert(snapshots.every(s=>s.monster.hp===hp&&s.projected.hp===hp));
 await until(()=>writes.length>0||faults.length,10000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));await until(()=>f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get('shared-process511').hp===hp,5000);assert.equal(writes.length,1);assert.equal(f.sql.prepare('SELECT hit_count FROM boss_participants WHERE boss_round=1 AND player_id=?').get(f.id).hit_count,1);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM combat_events WHERE target_id=? AND player_id=?').get('shared-process511',f.id).n,1);
});

test('shared native terminal attack freezes foreign actors, commits once and reloads the world before the reply',{timeout:35000},async t=>{
 const {f,world,faults,http,connect}=await setup(t,{shared:true,sharedCombat:{hp:1}});await world.stopJobs();const ticket=await http('ticket');assert.equal(ticket.status,200);const live=await connect(ticket);
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'shared-process511',spawnRound:1,ability:0,intentId:'shared-native-kill'}}));
 await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,12000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n')+(typeof previousChannel==='undefined'?'':previousChannel.nativeFailure));const reply=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(reply.status,200,JSON.stringify(reply));assert.equal(reply.body.hits[0].hp,0);assert.equal(f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get('shared-process511').hp,0);assert.equal(world.monsters.get('shared-process511').hp,0);assert.equal(world.combat.busy,false);assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id LIKE 'shared:%'").get().n,1);
});

test('four native channels queue on one shared death without freezing behind the next borrower',{timeout:45000},async t=>{
 const s=await setup(t,{shared:true,sharedCombat:{hp:1}}),{f,world,writer,faults,http,connect}=s;await world.stopJobs();const people=[{id:f.id,http:()=>http('ticket')},...Array.from({length:3},(_,i)=>extraPlayer(s,i+2))],clients=[];
 for(const person of people){const ticket=await person.http();assert.equal(ticket.status,200,JSON.stringify(ticket));clients.push({...person,ticket,...await connect(ticket)});}assert.deepEqual(clients.map(c=>c.ticket.channel).sort(),[1,2,3,4]);
 const acquire=world.combat.acquire.bind(world.combat);let started=0,ready;const all=new Promise(r=>ready=r);world.combat.acquire=async(...args)=>{if(++started===4)ready();const grant=await acquire(...args);await all;return grant;};
 for(const live of clients)live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'shared-process511',spawnRound:1,ability:0,intentId:'shared-four-'+live.id}}));
 await until(()=>clients.every(c=>c.packets.some(p=>p.results?.some(r=>r.sequence===1)))||faults.length,15000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const replies=clients.map(c=>c.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1));assert.equal(replies.filter(r=>r.body.hits?.some(h=>h.killed)).length,1);assert.equal(f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get('shared-process511').hp,0);assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id LIKE 'shared:%'").get().n,1);assert.equal(world.combat.busy,false);assert.equal(world.combat.terminal,null);assert.equal(writer.authority.counts().size,4);
});

for(const phase of ['before','after'])test('shared native death '+phase+' COMMIT source SIGKILL retires all five owners and retains one durable result',{timeout:45000},async t=>{
 const s=await setup(t,{shared:true,sharedCombat:{hp:1}}),{f,writer,world,core,supervisor,faults,http,connect}=s;await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),old=[world.row,...supervisor.rows.values()],victim=supervisor.rows.get(ticket.channel),operation=writer.authority.operations.attack.execute,command=writer.command.bind(writer);let killed=false,observed=null;
 const read=()=>({hp:f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get('shared-process511').hp,xp:f.sql.prepare('SELECT xp FROM players WHERE id=?').get(f.id).xp,receipts:f.sql.prepare("SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id LIKE 'shared:%'").get().n}),before=read();
 writer.authority.operations.attack.execute=(...args)=>{const result=operation(...args);if(phase==='before'&&!killed){killed=true;victim.child.kill('SIGKILL');throw Object.assign(Error('shared_before_commit'),{code:'shared_before_commit'});}return result;};
 writer.command=async(peer,request)=>{try{const ack=await command(peer,request);if(request.payload.sharedLease&&phase==='after'&&!killed){killed=true;observed=read();victim.child.kill('SIGKILL');throw Object.assign(Error('shared_lost_ack'),{code:'shared_lost_ack'});}return ack;}catch(error){if(request.payload.sharedLease&&phase==='before'&&killed)observed=read();throw error;}};
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'shared-process511',spawnRound:1,ability:0,intentId:'shared-crash'}}));try{await until(()=>observed!==null,12000);}catch(error){throw Error(JSON.stringify({killed,observed,current:read(),replies:live.packets.flatMap(p=>p.results??[]),faults:faults.map(f=>f.error?.message),native:victim.nativeFailure,failure:victim.failure}),{cause:error});}if(phase==='before')assert.deepEqual(observed,before);else{assert.equal(observed.hp,0);assert.equal(observed.receipts,1);assert(observed.xp>=before.xp);}
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!old.includes(r)),20000);assert(old.every(r=>r.exited));assert.equal(victim.child.signalCode,'SIGKILL');assert.equal(world.combat.busy,false);const fresh=await http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));const next=await connect(fresh);
 if(phase==='before'){
  const frame={type:'input',sequence:1,payload:{action:'attack',targetId:'shared-process511',spawnRound:1,ability:0,intentId:'shared-retry'}};let timer;
  // A recovered world's ordinary upkeep may briefly quiesce this actor after
  // the ticket is issued. Native WS retry means NOT accepted: resend the same
  // sequence only on that explicit response, never after an unknown outcome.
  const send=()=>next.ws.send(JSON.stringify(frame)),retry=bytes=>{const packet=JSON.parse(bytes);if(packet.type==='retry'&&packet.sequence===frame.sequence&&['actor_draining','input_backpressure'].includes(packet.code))timer=setTimeout(send,50);};
  next.ws.on('message',retry);send();
  try{await until(()=>next.packets.some(p=>p.results?.some(r=>r.sequence===1))||world.global.recovery,10000);const reply=next.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(reply?.status,200,JSON.stringify(next.packets.filter(p=>p.results?.length||['rejected','retry'].includes(p.type))));}
  finally{clearTimeout(timer);next.ws.off('message',retry);}
 }

 assert.equal(read().receipts,1);assert.equal(read().hp,0);if(phase==='after')assert.equal(read().xp,observed.xp);assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
});

test('shared native incoming lethal hit checkpoints the world before the original player-death transaction',{timeout:35000},async t=>{
 const {f,world,writer,faults,http,connect}=await setup(t,{shared:true,sharedCombat:{playerHp:1,boss:true}});await world.stopJobs();const ticket=await http('ticket');assert.equal(ticket.status,200);const live=await connect(ticket),command=writer.command.bind(writer),operations=[];writer.command=(peer,request)=>{if(request.payload.sharedLease)operations.push(request.operation);return command(peer,request);};
 await until(()=>f.sql.prepare('SELECT hp FROM players WHERE id=?').get(f.id).hp===0||faults.length,12000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));await until(()=>!world.combat.busy,5000);assert.deepEqual(operations,['retaliation_death']);assert.equal(f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get('shared-process511').hp,1000000);assert.equal(live.ws.readyState,1);assert(f.sql.prepare('SELECT respawn_at_ms FROM players WHERE id=?').get(f.id).respawn_at_ms>f.clock());
});

test('shared finish lost with world SIGKILL fences every replica before reloading uncheckpointed damage',{timeout:45000},async t=>{
 const {f,world,core,supervisor,faults,http,connect}=await setup(t,{shared:true,sharedCombat:{boss:true}});await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),old=[world.row,...supervisor.rows.values()],control=world.row.control,request=control.request.bind(control);let killed=false,observed=null;
 control.request=async(method,payload)=>{const ack=await request(method,payload);if(method==='shared_finish'&&!killed){killed=true;observed={live:world.monsters.get('shared-process511').hp,saved:f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get('shared-process511').hp};old[0].child.kill('SIGKILL');throw Object.assign(Error('shared_finish_ack_lost'),{code:'shared_finish_ack_lost'});}return ack;};
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'shared-process511',spawnRound:1,ability:0,intentId:'shared-lost-finish'}}));await until(()=>observed,10000);assert(observed.live<observed.saved);assert.equal(observed.saved,1000000);
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!old.includes(r)),20000);assert(old.every(r=>r.exited));assert.equal(world.monsters.get('shared-process511').hp,1000000);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM boss_participants WHERE player_id=? AND boss_round=1').get(f.id).n,0);assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));assert.equal((await http('ticket')).status,200);
});

test('native guardian freeze drains a queued shared death before choosing its final world checkpoint',{timeout:40000},async t=>{
 const {f,world,core,supervisor,faults,http,connect}=await setup(t,{shared:true,sharedCombat:{hp:1}});await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),pids=[world.row.child.pid,...[...supervisor.rows.values()].map(r=>r.child.pid)],period=Math.floor(f.clock()/1000);
 await core.permanentPlayers([f.id],()=>{f.sql.prepare('UPDATE players SET contribution=500 WHERE id=?').run(f.id);f.sql.prepare('UPDATE world_state SET health=90,updated_at=?,guardian_reward_at=?,reset_at=0 WHERE id=1').run(period,period);});
 const acquire=world.combat.acquire.bind(world.combat);let borrowed=false;world.combat.acquire=async(...args)=>{const grant=await acquire(...args);borrowed=true;await until(()=>world.global.held?.phase==='freezing',8000);return grant;};
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'shared-process511',spawnRound:1,ability:0,intentId:'shared-with-guardian'}}));await until(()=>borrowed,8000);await world.startJobs();await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))&&f.sql.prepare('SELECT COUNT(*) n FROM guardian_reward_claims WHERE period_at=?').get(period).n===1&&!world.global.preparing||faults.length,12000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get('shared-process511').hp,0);assert.deepEqual([world.row.child.pid,...[...supervisor.rows.values()].map(r=>r.child.pid)],pids);assert.equal(world.combat.busy,false);
});

test('an ordinary permanent operation arriving during shared death waits for that durable result and then refreshes normally',{timeout:35000},async t=>{
 const {f,world,core,faults,http,connect}=await setup(t,{shared:true,sharedCombat:{hp:1}});await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),prepare=world.combat.prepare.bind(world.combat);let rare,ran=false;
 world.combat.prepare=async(...args)=>{const answer=await prepare(...args);rare=core.permanentPlayers([f.id],()=>{ran=true;assert.equal(f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get('shared-process511').hp,0);f.sql.prepare('UPDATE players SET potions=potions+1 WHERE id=?').run(f.id);});void rare.catch(()=>{});await Promise.resolve();assert.equal(ran,false);return answer;};
 const before=f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions;live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'shared-process511',spawnRound:1,ability:0,intentId:'shared-with-rare'}}));await until(()=>ran||faults.length,10000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));await rare;assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,before+1);assert.equal(world.combat.busy,false);assert.equal(live.ws.readyState,1);
});

for(const primary of ['player','monster'])for(const terminal of [false,true])test('shared mixed '+primary+' primary '+(terminal?'terminal':'nonterminal')+' preserves both damage populations',{timeout:40000},async t=>{
 const s=await setup(t,{shared:true,sharedCombat:{area:'black',hp:terminal?1:1000000}}),{f,world,core,supervisor,faults,http,connect}=s;await world.stopJobs();const other=extraPlayer(s,2),ticket=await http('ticket'),live=await connect(ticket);assert.equal((await other.http()).status,200);const joined=await other.http('transfer',{channel:ticket.channel});assert.equal(joined.status,200,JSON.stringify(joined));const victim=await connect(joined);
 await core.permanentPlayers([f.id,other.id],()=>{f.sql.prepare("UPDATE players SET area='black',x=1000,y=1000,hp=?,max_hp=?,last_monster_hit_at=0,combat_lock_until_ms=0 WHERE id=?").run(terminal?1:1000000,terminal?1:1000000,other.id);f.sql.prepare("UPDATE players SET area='black',x=1000,y=1000,role='avci',skill_three=5,attack_three_at=0 WHERE id=?").run(f.id);});
 const previousChannel=supervisor.rows.get(ticket.channel);if(live.ws.readyState!==1)throw Error('mixed source socket closed before input: '+JSON.stringify((await live.closed).map(String)));
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:primary==='player'?'pvp_attack':'attack',...(primary==='player'?{targetPlayerId:other.id}:{targetId:'shared-process511',spawnRound:1}),ability:2,intentId:'shared-mixed-'+primary}}));
 try{await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,12000);}catch(error){const child=supervisor.rows.get(ticket.channel).child,request=randomUUID(),snapshot=await new Promise(resolve=>{const listener=m=>{if(m.type==='test-combat-state'&&m.request===request){child.off('message',listener);resolve(m.snapshot);}};child.on('message',listener);child.send({type:'test-combat-state',request});});throw Error(JSON.stringify({snapshot,previous:{exited:previousChannel.exited,failure:previousChannel.failure,stderr:previousChannel.stderr,pid:previousChannel.child.pid,current:supervisor.rows.get(ticket.channel).child.pid},wire:live.packets.filter(p=>!['frame','world'].includes(p.type)).slice(-5),socket:live.ws.readyState,errors:live.errors,closed:live.ws.readyState===3?(await live.closed).map(String):null}),{cause:error});}assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n')+(typeof previousChannel==='undefined'?'':previousChannel.nativeFailure));const reply=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(reply.status,200,JSON.stringify(reply));assert.equal(reply.body.ok,true,JSON.stringify(reply));assert(world.monsters.get('shared-process511').hp<(terminal?1:1000000));assert.equal(world.combat.busy,false);assert.equal(victim.ws.readyState,1);
 await core.permanentPlayers([f.id,other.id],()=>{});const hp=f.sql.prepare('SELECT hp FROM players WHERE id=?').get(other.id).hp;assert(terminal?hp===0:hp<1000000,JSON.stringify(reply));if(terminal)assert.equal(f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get('shared-process511').hp,0);
});
