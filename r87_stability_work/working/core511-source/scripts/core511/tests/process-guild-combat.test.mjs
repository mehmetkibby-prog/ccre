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







test('actual native guild final hit returns both live players to C4, retires queued old-scope inputs and preserves all five processes',{timeout:40000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,supervisor,faults,http,connect}=s;await world.stopJobs();const other=extraPlayer(s,7),ticket=await http('ticket'),live=await connect(ticket);assert.equal((await other.http()).status,200);const joined=await other.http('transfer',{channel:ticket.channel});assert.equal(joined.status,200,JSON.stringify(joined));const victim=await connect(joined),old=[writer.authority.owner(f.id),writer.authority.owner(other.id)],pids=[world.row.child.pid,...[...supervisor.rows.values()].map(r=>r.child.pid)];
 await core.permanentPlayers([f.id,other.id],()=>{const id=seedGuildWar({...f,targetId:other.id,nowMs:f.clock()},{channel:ticket.channel,home:4,a:0,b:0,delta:599000});f.sql.prepare('UPDATE arena_matches SET kill_target=1 WHERE id=?').run(id);for(const player of [f.id,other.id])f.sql.prepare('UPDATE players SET hp=?,respawn_at_ms=0,stun_until_ms=0,root_until_ms=0,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0 WHERE id=?').run(player===f.id?4321:1,player);});
 let release,committed=false,committedAt=0;const blocked=new Promise(resolve=>release=resolve),command=writer.command.bind(writer);writer.command=async(peer,request)=>{const answer=await command(peer,request);if(answer.result.moves?.length){committed=true;committedAt=performance.now();await blocked;}return answer;};
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'pvp_attack',targetPlayerId:other.id,ability:0,intentId:'guild-live-final'}}));await until(()=>committed||faults.length,10000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert(committed);assert(!live.packets.some(p=>p.results?.some(r=>r.sequence===1)),'no result before writer acknowledgement');
 live.ws.send(JSON.stringify({type:'input',sequence:2,payload:{action:'heartbeat'}}));live.ws.send(JSON.stringify({type:'input',sequence:3,payload:{action:'pvp_attack',targetPlayerId:other.id,ability:0,intentId:'old-guild-scope'}}));victim.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'heartbeat'}}));
 const row=supervisor.rows.get(ticket.channel),snapshot=()=>{const request=randomUUID();return new Promise(resolve=>{const listener=m=>{if(m?.type==='test-combat-state'&&m.request===request){row.child.off('message',listener);resolve(m.snapshot);}};row.child.on('message',listener);row.child.send({type:'test-combat-state',request});});};let state;
 try{const end=performance.now()+3000;do{state=await snapshot();if(state.players.find(p=>p.id===f.id)?.accepted===3&&state.players.find(p=>p.id===other.id)?.accepted===1)break;await new Promise(resolve=>setTimeout(resolve,5));}while(performance.now()<end);assert.equal(state.players.find(p=>p.id===f.id)?.accepted,3,JSON.stringify({state,controls:live.packets.filter(p=>['rejected','retry'].includes(p.type))}));assert.equal(state.players.find(p=>p.id===other.id)?.accepted,1);await until(()=>performance.now()>=committedAt+5500||faults.length,6500);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));}finally{release();}

 await until(()=>!world.combat.busy&&live.ws.readyState===3&&victim.ws.readyState===3||faults.length,10000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
 const replies=live.packets.flatMap(p=>p.results??[]);assert.deepEqual(replies.map(r=>[r.sequence,r.status]),[[1,200],[2,409],[3,409]]);assert(replies[0].body.matchFinished);assert(replies.slice(1).every(r=>r.body.code==='owner_epoch_fenced'));assert.equal(victim.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1)?.status,409);
 for(const [index,id]of [f.id,other.id].entries()){const owner=writer.authority.owner(id);assert.equal(owner.channel,4);assert.equal(owner.epoch,old[index].epoch+1);assert.equal(owner.sequence,0);assert.equal(f.sql.prepare('SELECT area FROM players WHERE id=?').get(id).area,'bazaar');}assert.equal(f.sql.prepare("SELECT wars_won FROM guilds WHERE id='war-guild-1'").get().wars_won,1);assert.deepEqual([world.row.child.pid,...[...supervisor.rows.values()].map(r=>r.child.pid)],pids);assert.equal(writer.authority.counts().get(4),2);
 const fresh=await http('ticket');assert.equal(fresh.channel,4);const next=await connect(fresh);next.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>next.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,7000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(next.ws.readyState,1);
});

test('multi-actor permanent freeze drains a guild final hit while an earlier unrelated actor is frozen',{timeout:35000},async t=>{
 const s=await liveGuildCombat(t,9),{f,core,writer,world,supervisor,faults,live,ticket,attack,inspect,old}=s,bystander=extraPlayer(s,8,'a-bystander');f.sql.prepare("UPDATE players SET area='bazaar',arena_match_id='',respawn_at_ms=0 WHERE id=?").run(bystander.id);const joined=await bystander.http();assert.equal(joined.status,200,JSON.stringify(joined));const socket=await s.connect(joined),source=supervisor.rows.get(ticket.channel),before=new Map([bystander.id,f.id].map(id=>[id,f.sql.prepare('SELECT potions FROM players WHERE id=?').get(id).potions]));
 const acquire=world.combat.acquire.bind(world.combat);let pending,done=false,error,calls=0;
 world.combat.acquire=async(...args)=>{const grant=await acquire(...args);
  pending=core.permanentPlayers([bystander.id,f.id],()=>{calls++;assert.equal(inspect().wins,1);for(const id of before.keys())f.sql.prepare('UPDATE players SET potions=potions+1 WHERE id=?').run(id);}).then(()=>done=true,e=>{error=e;done=true;});
  let state;const end=performance.now()+5000;do{state=await combatState(source);if(state.players.find(p=>p.id===f.id)?.quiescing)break;await new Promise(resolve=>setTimeout(resolve,5));}while(performance.now()<end);assert(state.players.find(p=>p.id===f.id)?.quiescing,JSON.stringify(state));return grant;
 };
 attack(live);
 try{await until(()=>done||faults.length,12000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));await pending;assert.ifError(error);assert.equal(calls,1);assert.equal(inspect().wins,1);assert.equal(inspect().receipts,1);assert.equal(writer.authority.owner(f.id).channel,4);for(const [id,potions]of before)assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(id).potions,potions+1);assert.deepEqual([world.row,...supervisor.rows.values()],old);assert.equal(socket.ws.readyState,1);}
 finally{if(!done){for(const row of [world.row,...supervisor.rows.values()])if(row&&!row.exited)row.child.kill('SIGKILL');}}
});

test('guild terminal prepare cannot borrow a cold lease while its permanent commit awaits durability',{timeout:35000},async t=>{
 const s=await liveGuildCombat(t,9),{f,core,writer,world,supervisor,faults,live,attack,inspect,old}=s,bystander=extraPlayer(s,8,'durable-bystander');f.sql.prepare("UPDATE players SET area='bazaar',arena_match_id='',respawn_at_ms=0 WHERE id=?").run(bystander.id);const joined=await bystander.http();assert.equal(joined.status,200,JSON.stringify(joined));await s.connect(joined);
 const durable=core.permanent.durable,checkpoint=new Promise(resolve=>{s.releaseCold=resolve;});let atDurability=false;
 core.permanent.durable=async()=>{await durable();atDurability=true;await checkpoint;};
 const cold=core.permanentPlayers([bystander.id],()=>f.sql.prepare('UPDATE players SET potions=potions+1 WHERE id=?').run(bystander.id));
 try{
  await until(()=>atDurability);assert.equal(core.permanent.entries.get(bystander.id).phase,'frozen');attack(live);await until(()=>world.combat.terminal||faults.length,7000);
  assert.equal(faults.length,0);const row=supervisor.rows.get(joined.channel),state=await combatState(row);assert.equal(state.players.find(p=>p.id===bystander.id)?.suspended,true);
  assert.equal(world.combat.terminal.phase,'freezing');assert.equal(inspect().wins,0);assert.equal(inspect().receipts,0);
  s.releaseCold();await cold;await until(()=>inspect().wins===1&&world.combat.terminal===null||faults.length,10000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(inspect().receipts,1);assert.deepEqual([world.row,...supervisor.rows.values()],old);assert.equal(writer.authority.owner(f.id).channel,4);
 }finally{s.releaseCold();core.permanent.durable=durable;}
});

for(const operation of ['permanent','transfer'])test(operation+' freeze before terminal prepare follows the durable guild return without retiring any process',{timeout:35000},async t=>{
 const s=await liveGuildCombat(t,9),{f,core,writer,world,supervisor,faults,live,ticket,http,connect,attack,inspect,old}=s,source=supervisor.rows.get(ticket.channel),initial=writer.authority.owner(f.id),potions=f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions;
 const acquire=world.combat.acquire.bind(world.combat);let pending,answer,error,done=false,started=false,calls=0;
 world.combat.acquire=async(...args)=>{
  const grant=await acquire(...args);assert.equal(started,false);started=true;
  pending=(operation==='permanent'?core.permanentPlayers([f.id],()=>{
   calls++;assert.equal(inspect().wins,1);assert.equal(writer.authority.owner(f.id).channel,4);assert.equal(f.sql.prepare('SELECT area FROM players WHERE id=?').get(f.id).area,'bazaar');f.sql.prepare('UPDATE players SET potions=potions+1 WHERE id=?').run(f.id);return {ok:true};
  }):http('transfer',{channel:3})).then(value=>{answer=value;done=true;},e=>{error=e;done=true;});
  let state;const end=performance.now()+5000;
  do{state=await combatState(source);if(state.players.find(p=>p.id===f.id)?.quiescing)break;await new Promise(resolve=>setTimeout(resolve,5));}while(performance.now()<end);
  assert(state.players.find(p=>p.id===f.id)?.quiescing,JSON.stringify(state));assert.equal(world.combat.terminal,null);assert.equal(done,false);return grant;
 };
 attack(live);await until(()=>done||faults.length,12000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));await pending;assert.ifError(error);
 assert.equal(inspect().wins,1);assert.equal(inspect().receipts,1);assert.equal(core.permanent.entries.size,0);assert.equal(core.transitions.size,0);assert.deepEqual([world.row,...supervisor.rows.values()],old);
 const final=writer.authority.owner(f.id);assert.equal(final.channel,operation==='permanent'?4:3);assert.equal(final.epoch,initial.epoch+(operation==='permanent'?1:2));
 assert.equal(calls,operation==='permanent'?1:0);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,potions+calls);
 const replies=live.packets.flatMap(p=>p.results??[]);assert.equal(replies.find(r=>r.sequence===1)?.status,200);
 if(operation==='transfer')assert.equal(answer.status,200,JSON.stringify(answer));
 const fresh=await http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));const next=await connect(fresh);next.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'heartbeat'}}));await until(()=>next.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,7000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(next.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1).status,200);
});

for(const phase of ['before','after'])test('actual guild final hit '+phase+' COMMIT source SIGKILL recovers both actors in one durable channel outcome',{timeout:45000},async t=>{
 const s=await liveGuildCombat(t,8),{writer,world,core,supervisor,faults,http,connect,live,ticket,attack,inspect,old}=s,source=supervisor.rows.get(ticket.channel),execute=writer.authority.operations.pvp_attack.execute,command=writer.command.bind(writer),before=inspect();let killed=false,observed=null;
 writer.authority.operations.pvp_attack.execute=(...args)=>{const result=execute(...args);if(phase==='before'&&!killed){killed=true;source.child.kill('SIGKILL');throw Object.assign(Error('guild_before_commit'),{code:'guild_before_commit'});}return result;};
 writer.command=async(peer,request)=>{try{const result=await command(peer,request);if(phase==='after'&&result.result.moves?.length&&!killed){killed=true;observed=inspect();source.child.kill('SIGKILL');throw Object.assign(Error('guild_return_ack_lost'),{code:'guild_return_ack_lost'});}return result;}catch(error){if(phase==='before'&&killed&&request.operation==='pvp_attack')observed=inspect();throw error;}};
 attack(live);await until(()=>observed,10000);if(phase==='before')assert.deepEqual(observed,before);else{assert.equal(observed.wins,1);assert.equal(observed.receipts,1);assert(observed.owners.every(p=>p.channel===4&&p.playerChannel===4&&p.sequence===0));}
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(row=>row.state==='running'&&!old.includes(row)),20000);assert(old.every(row=>row.exited));assert.equal(source.child.signalCode,'SIGKILL');await world.stopJobs();const ticket2=await http('ticket');assert.equal(ticket2.status,200,JSON.stringify(ticket2));const next=await connect(ticket2);
 if(phase==='before'){attack(next);await until(()=>!world.combat.busy&&inspect().wins===1||faults.some(f=>f.globalRecovery),10000);}
 assert.equal(inspect().wins,1);assert.equal(inspect().receipts,1);assert(inspect().owners.every(p=>p.channel===4&&p.playerChannel===4));assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
});

test('guild return lost after target admission and actual world SIGKILL retains one win and reloads both C4 residents',{timeout:45000},async t=>{
 const s=await liveGuildCombat(t,9),{world,core,supervisor,faults,http,connect,live,attack,inspect,old}=s,control=world.row.control,request=control.request.bind(control);let lost=false,observed;
 control.request=async(method,payload)=>{const result=await request(method,payload);if(method==='shared_finish'&&!lost&&inspect().wins===1){lost=true;observed=inspect();old[0].child.kill('SIGKILL');throw Object.assign(Error('guild_world_finish_lost'),{code:'guild_world_finish_lost'});}return result;};
 attack(live);await until(()=>lost,10000);assert(observed.owners.every(p=>p.channel===4&&p.playerChannel===4));await until(()=>!core.recoveringWorld&&!world.global.recovery&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(row=>row.state==='running'&&!old.includes(row)),20000);assert(old.every(row=>row.exited));assert.equal(old[0].child.signalCode,'SIGKILL');assert.equal(inspect().wins,1);assert.equal(inspect().receipts,1);assert(inspect().owners.every(p=>p.channel===4&&p.playerChannel===4));await world.stopJobs();const fresh=await http('ticket');assert.equal(fresh.channel,4);const next=await connect(fresh);assert.equal(next.ws.readyState,1);assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
});

test('native guardian freeze refreshes membership after a queued guild final hit returns both source actors to C4',{timeout:45000},async t=>{
 const s=await liveGuildCombat(t,6),{f,core,world,supervisor,faults,live,attack,inspect,old}=s,period=Math.floor(f.clock()/1000);await core.permanentPlayers([f.id],()=>{f.sql.prepare('UPDATE players SET contribution=500 WHERE id=?').run(f.id);f.sql.prepare('UPDATE world_state SET health=90,updated_at=?,guardian_reward_at=?,reset_at=0 WHERE id=1').run(period,period);});
 const acquire=world.combat.acquire.bind(world.combat);let borrowed=false;world.combat.acquire=async(...args)=>{const grant=await acquire(...args);borrowed=true;await until(()=>world.global.held?.phase==='freezing',8000);return grant;};attack(live);await until(()=>borrowed,8000);await world.startJobs();
 await until(()=>inspect().wins===1&&!world.combat.busy&&!world.global.preparing&&f.sql.prepare('SELECT COUNT(*) n FROM guardian_reward_claims WHERE period_at=?').get(period).n===1||faults.length,15000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert(inspect().owners.every(p=>p.channel===4&&p.playerChannel===4));assert.equal(inspect().receipts,1);assert.deepEqual([world.row,...supervisor.rows.values()],old);assert.equal(world.global.held,null);
});

test('partial guild return keeps the source socket and runs a waiting native permanent operation on its refreshed owner',{timeout:35000},async t=>{
 const s=await liveGuildCombat(t,5),{f,core,writer,world,supervisor,faults,live,victim,ticket,other,attack,inspect,old}=s;await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE guild_war_returns SET channel=? WHERE player_id=?').run(ticket.channel,f.id));const initial=writer.authority.owner(f.id),potions=f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,prepare=world.combat.prepare.bind(world.combat);let operation,ran=false;
 world.combat.prepare=async(...args)=>{const result=await prepare(...args);operation=core.permanentPlayers([f.id],()=>{assert.equal(f.sql.prepare('SELECT area FROM players WHERE id=?').get(f.id).area,'bazaar');ran=true;f.sql.prepare('UPDATE players SET potions=potions+1 WHERE id=?').run(f.id);});void operation.catch(()=>{});assert.equal(ran,false);return result;};attack(live);
 await until(()=>ran&&live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,12000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));await operation;assert.equal(live.ws.readyState,1);assert.equal(writer.authority.owner(f.id).epoch,initial.epoch);assert.equal(writer.authority.owner(f.id).channel,ticket.channel);assert.equal(writer.authority.owner(other.id).channel,4);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,potions+1);assert.equal(inspect().wins,1);await until(()=>victim.ws.readyState===3);assert.deepEqual([world.row,...supervisor.rows.values()],old);
 live.ws.send(JSON.stringify({type:'input',sequence:2,payload:{action:'heartbeat'}}));await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===2))||faults.length,7000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===2).status,200);
});
