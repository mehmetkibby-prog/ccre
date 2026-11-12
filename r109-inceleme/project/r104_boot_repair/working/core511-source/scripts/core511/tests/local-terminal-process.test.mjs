import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,extraPlayer,combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';
import {put,json} from './pvp-fixture.mjs';

async function fixture(t,{hp=1}={}){
 const s=await setup(t,{shared:true,localCombat:{hp}}),{f,core,world,supervisor,http,connect}=s;await world.stopJobs();assert.equal((await http('ticket')).status,200);const ticket=await http('transfer',{channel:4});assert.equal(ticket.status,200);const live=await connect(ticket),members=[];
 for(let i=0;i<2;i++){const a=extraPlayer(s,41+i),first=await a.http();assert.equal(first.status,200);const target=first.channel===1?first:await a.http('transfer',{channel:1});assert.equal(target.status,200);members.push({...a,ticket:target,live:await connect(target)});}
 const ids=[f.id,...members.map(m=>m.id)],monster='golge-local-terminal511';
 await core.permanentPlayers(ids,()=>{
  for(const [i,id]of ids.entries())f.sql.prepare("UPDATE players SET area=?,x=?,y=?,hp=100000,max_hp=100000,xp=0,level=40,arena_match_id='',combat_lock_until_ms=0,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0,stun_until_ms=0,root_until_ms=0,last_seen=? WHERE id=?").run(i===0?'forest':'bazaar',i===0?2700:1000,i===0?2025:1000,Math.floor(f.clock()/1000),id);
  put(f.sql,'parties',{id:'historical-local-party511',leader_id:members[0].id,created_at:1});for(const m of members)put(f.sql,'party_members',{party_id:'historical-local-party511',player_id:m.id,joined_at:1});
  // V510 retains a monster participant after it leaves the monster's channel.
  // The original reward SQL can also credit that source's nearby current party.
  put(f.sql,'monster_participants',{monster_id:monster,spawn_round:17,player_id:members[0].id,created_at:Math.floor(f.clock()/1000)-1});
 });
 const read=()=>json({players:ids.map(id=>f.sql.prepare('SELECT id,xp,level FROM players WHERE id=?').get(id)),hp:f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get(monster).hp,xpClaims:f.sql.prepare('SELECT player_id FROM monster_xp_claims WHERE monster_id=? AND spawn_round=17 ORDER BY player_id').all(monster),lootClaims:f.sql.prepare('SELECT player_id FROM normal_reward_claims WHERE monster_id=? AND spawn_round=17 ORDER BY player_id').all(monster),receipts:f.sql.prepare("SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id LIKE 'shared:%'").get().n});
 const send=(client=live)=>client.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:monster,spawnRound:17,ability:0,intentId:'local-terminal511'}}));return {...s,ids,members,ticket,live,monster,read,send,old:[world.row,...supervisor.rows.values()]};
}

test('local C4 final hit freezes historical C1 participant and its party until their native rewards are durable',{timeout:35000},async t=>{
 const s=await fixture(t),{writer,supervisor,world,faults,read,send,live,members,old}=s,before=read(),command=writer.command.bind(writer);let committed=false,release;const gate=new Promise(resolve=>release=resolve);t.after(()=>release());
 writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.operation==='attack'&&!committed){committed=true;await gate;}return ack;};
 send();await until(()=>committed||faults.length,9000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const durable=read();assert.equal(durable.hp,0);assert.equal(durable.receipts,1);assert.equal(durable.xpClaims.length,3);assert(durable.players.every(p=>p.xp>before.players.find(b=>b.id===p.id).xp));
 const held=await combatState(supervisor.rows.get(1));for(const m of members){const p=held.players.find(p=>p.id===m.id);assert.equal(p.suspended,true);assert(p.external);assert.equal(p.xp,before.players.find(p=>p.id===m.id).xp);}
 release();await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))&&!world.combat.busy||faults.length,9000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const result=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.hits[0].hp,0);
 const current=await combatState(supervisor.rows.get(1));for(const m of members){const p=current.players.find(p=>p.id===m.id);assert.equal(p.external,null);assert.equal(p.suspended,false);assert.equal(p.xp,durable.players.find(p=>p.id===m.id).xp);}assert.deepEqual([world.row,...supervisor.rows.values()],old);assert.deepEqual(read().xpClaims,durable.xpClaims);
});

test('ordinary local C4 hit remains memory-only with no shared lease or synchronous attack receipt',{timeout:30000},async t=>{
 const s=await fixture(t,{hp:1000000}),{world,writer,send,live,read,faults}=s,acquire=world.combat.acquire.bind(world.combat),command=writer.command.bind(writer);let leases=0,attacks=0;
 world.combat.acquire=(...args)=>{leases++;return acquire(...args);};writer.command=(peer,request)=>{if(request.operation==='attack')attacks++;return command(peer,request);};
 send();await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,8000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const reply=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(reply.status,200,JSON.stringify(reply));assert(reply.body.hits[0].damage>0);assert(reply.body.hits[0].hp<1000000);assert.equal(leases,0);assert.equal(attacks,0);assert.equal(read().hp,1000000);assert.equal(read().xpClaims.length,0);
});

for(const phase of ['before','after'])test('local final hit source SIGKILL '+phase+' COMMIT keeps every native foreign reward atomic',{timeout:45000},async t=>{
 const s=await fixture(t),{writer,world,core,supervisor,ticket,send,read,old,http,connect,faults}=s,source=supervisor.rows.get(ticket.channel),execute=writer.authority.operations.attack.execute,command=writer.command.bind(writer),before=read();let killed=false,observed;
 writer.authority.operations.attack.execute=(...args)=>{const result=execute(...args);if(phase==='before'&&!killed){killed=true;source.child.kill('SIGKILL');throw Object.assign(Error('local_final_before_commit'),{code:'local_final_before_commit'});}return result;};
 writer.command=async(peer,request)=>{try{const ack=await command(peer,request);if(request.operation==='attack'&&phase==='after'&&!killed){killed=true;observed=read();source.child.kill('SIGKILL');throw Object.assign(Error('local_final_lost_ack'),{code:'local_final_lost_ack'});}return ack;}catch(error){if(killed&&phase==='before')observed=read();throw error;}};
 send();await until(()=>observed!==undefined,10000);if(phase==='before')assert.deepEqual(observed,before);else{assert.equal(observed.receipts,1);assert.equal(observed.xpClaims.length,3);assert(observed.players.every(p=>p.xp>0));}
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(row=>row.state==='running'&&!old.includes(row)),20000);await world.stopJobs();assert(old.every(row=>row.exited));assert.equal(source.child.signalCode,'SIGKILL');
 const fresh=await http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));const live=await connect(fresh);if(phase==='before'){send(live);await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.some(f=>f.globalRecovery),9000);assert.equal(live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1)?.status,200,JSON.stringify(live.packets.filter(p=>p.results?.length||p.type==='retry')));}
 const after=read();assert.equal(after.receipts,1);assert.equal(after.xpClaims.length,3);assert(after.players.every(p=>p.xp>0));if(phase==='after'){assert.deepEqual(after.players,observed.players);assert.deepEqual(after.xpClaims,observed.xpClaims);assert.deepEqual(after.lootClaims,observed.lootClaims);}assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
});

test('non-arena terminal PvP uses the native cold barrier and refreshes both C4 residents',{timeout:35000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,supervisor,http,connect,faults}=s;await world.stopJobs();assert.equal((await http('ticket')).status,200);const ticket=await http('transfer',{channel:4}),live=await connect(ticket),other=extraPlayer(s,46);assert.equal((await other.http()).status,200);const target=await other.http('transfer',{channel:4});assert.equal(target.status,200);await connect(target);
 await core.permanentPlayers([f.id,other.id],()=>{for(const [i,id]of [f.id,other.id].entries())f.sql.prepare("UPDATE players SET area='war',arena_match_id='',x=?,y=1000,hp=?,max_hp=100000,level=40,last_seen=?,combat_lock_until_ms=0,stun_until_ms=0,root_until_ms=0,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0 WHERE id=?").run(i===0?1000:1100,i===0?100000:1,Math.floor(f.clock()/1000),id);});
 const old=[world.row,...supervisor.rows.values()];live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'pvp_attack',targetPlayerId:other.id,ability:0,intentId:'local-war-terminal511'}}));await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))&&!world.combat.busy||faults.length,9000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const reply=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(reply.status,200,JSON.stringify(reply));const victim=f.sql.prepare('SELECT hp,respawn_at_ms FROM players WHERE id=?').get(other.id);assert.equal(victim.hp,0);assert(victim.respawn_at_ms>0);assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id LIKE 'shared:%'").get().n,1);
 const state=await combatState(supervisor.rows.get(4));assert.equal(state.players.find(p=>p.id===other.id).hp,0);assert(state.players.every(p=>!p.suspended&&!p.external));assert.deepEqual([world.row,...supervisor.rows.values()],old);
});
