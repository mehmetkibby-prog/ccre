import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,extraPlayer,combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';
import {put,json} from './pvp-fixture.mjs';

async function fixture(t){
 const s=await setup(t,{shared:true}),{f,core,world,supervisor,connect,faults}=s;await world.stopJobs();const actors=[];
 for(let i=0;i<4;i++){const actor=extraPlayer(s,31+i),first=await actor.http();assert.equal(first.status,200);const ticket=first.channel===4?first:await actor.http('transfer',{channel:4});assert.equal(ticket.status,200);actors.push({...actor,ticket,live:await connect(ticket),sequence:0});}
 await core.permanentPlayers(actors.map(a=>a.id),()=>{
  for(const a of actors)f.sql.prepare("UPDATE players SET area='bazaar',arena_match_id='',level=40,hp=max_hp,x=1000,y=1000,combat_lock_until_ms=0,last_seen=? WHERE id=?").run(Math.floor(f.clock()/1000),a.id);
  for(let team=0;team<2;team++){const id='arena-native-team511-'+team;put(f.sql,'parties',{id,leader_id:actors[team*2].id,created_at:1});for(let i=0;i<2;i++)put(f.sql,'party_members',{party_id:id,player_id:actors[team*2+i].id,joined_at:i+1});}
 });
 const send=(actor,payload)=>{const sequence=++actor.sequence;actor.live.ws.send(JSON.stringify({type:'input',sequence,payload}));return sequence;},reply=async(actor,sequence)=>{await until(()=>actor.live.packets.some(p=>p.results?.some(r=>r.sequence===sequence))||faults.length,9000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));return actor.live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===sequence);};
 const first=await reply(actors[0],send(actors[0],{action:'arena_join_queue',arenaMode:'2v2',teamName:'Team Alpha'}));assert.equal(first.status,200,JSON.stringify(first));assert.equal(first.body.queuedCount,2);
 const room=f.sql.prepare('SELECT room_id FROM arena_queue WHERE player_id=?').get(actors[0].id).room_id,input={action:'arena_join_queue',arenaMode:'2v2',teamName:'Team Beta',roomId:room};
 const read=()=>json({players:actors.map(a=>f.sql.prepare('SELECT id,area,arena_match_id,hp,hp_revision,position_revision,realtime_scope_version FROM players WHERE id=?').get(a.id)),queue:f.sql.prepare('SELECT player_id,room_id FROM arena_queue ORDER BY player_id').all(),matches:f.sql.prepare('SELECT * FROM arena_matches ORDER BY id').all(),roster:f.sql.prepare('SELECT * FROM arena_match_players ORDER BY player_id').all(),receipts:f.sql.prepare("SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id LIKE 'shared:%'").get().n});
 return {...s,actors,input,send,reply,read,old:[world.row,...supervisor.rows.values()]};
}

test('native C4 grouped arena match keeps every selected resident frozen through durable ACK and refreshes all teams',{timeout:40000},async t=>{
 const s=await fixture(t),{f,actors,input,send,reply,writer,supervisor,world,faults,read,old}=s,command=writer.command.bind(writer);let committed=false,release;const gate=new Promise(resolve=>release=resolve);t.after(()=>release());
 writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.operation==='native_action'&&request.payload.input.roomId===input.roomId&&!committed){committed=true;await gate;}return ack;};
 const sequence=send(actors[2],input);await until(()=>committed||faults.length,8000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const persisted=read();assert.equal(persisted.matches.length,1);assert.equal(persisted.roster.length,4);assert.equal(persisted.receipts,2);assert.equal(persisted.queue.length,0);
 const held=await combatState(supervisor.rows.get(4));for(const a of actors){const p=held.players.find(p=>p.id===a.id);assert.equal(p.area,'bazaar');if(a!==actors[2]){assert(p.external);assert.equal(p.suspended,true);}else assert.equal(p.barrier,true);}
 release();const result=await reply(actors[2],sequence);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.matched,true);await until(()=>!world.combat.busy,8000);
 const current=await combatState(supervisor.rows.get(4));for(const a of actors){const p=current.players.find(p=>p.id===a.id);assert.equal(p.area,'arena');assert.equal(p.match,persisted.matches[0].id);assert.equal(p.external,null);assert.equal(p.suspended,false);}assert.equal(current.arenas.length,1);assert.equal(current.teams.length,4);for(const p of persisted.roster)assert.equal(new Map(current.teams).get(p.match_id+':'+p.player_id),p.team);assert.deepEqual([world.row,...supervisor.rows.values()],old);
 assert.equal((await reply(actors[2],send(actors[2],input))).status,409);assert.equal(read().matches.length,1);assert.equal(read().roster.length,4);
});

for(const phase of ['before','after'])test('native grouped arena source SIGKILL '+phase+' COMMIT retains one complete match and retires all five owners',{timeout:45000},async t=>{
 const s=await fixture(t),{f,core,world,supervisor,writer,actors,input,send,read,old,faults,connect}=s,source=supervisor.rows.get(4),execute=writer.authority.operations.native_action.execute,command=writer.command.bind(writer),before=read();let killed=false,observed;
 writer.authority.operations.native_action.execute=(...args)=>{const result=execute(...args);if(phase==='before'&&!killed){killed=true;source.child.kill('SIGKILL');throw Object.assign(Error('arena_before_commit'),{code:'arena_before_commit'});}return result;};
 writer.command=async(peer,request)=>{try{const ack=await command(peer,request);if(request.operation==='native_action'&&phase==='after'&&!killed){killed=true;observed=read();source.child.kill('SIGKILL');throw Object.assign(Error('arena_lost_ack'),{code:'arena_lost_ack'});}return ack;}catch(error){if(killed&&phase==='before')observed=read();throw error;}};
 send(actors[2],input);await until(()=>observed!==undefined,10000);if(phase==='before')assert.deepEqual(observed,before);else{assert.equal(observed.matches.length,1);assert.equal(observed.roster.length,4);assert.equal(observed.queue.length,0);assert.equal(observed.receipts,before.receipts+1);}
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(row=>row.state==='running'&&!old.includes(row)),20000);await world.stopJobs();assert(old.every(row=>row.exited));assert.equal(source.child.signalCode,'SIGKILL');
 const ticket=await actors[2].http();assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await connect(ticket);live.ws.send(JSON.stringify({type:'input',sequence:1,payload:input}));await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.some(f=>f.globalRecovery),9000);const result=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(result?.status,phase==='before'?200:409,JSON.stringify(live.packets.filter(p=>p.results?.length||p.type==='retry')));
 const after=read();assert.equal(after.matches.length,1);assert.equal(after.roster.length,4);assert.equal(after.queue.length,0);assert(after.players.every(p=>p.area==='arena'&&p.arena_match_id===after.matches[0].id));assert.equal(after.receipts,before.receipts+(phase==='before'?1:2));if(phase==='after'){assert.deepEqual(after.matches,observed.matches);assert.deepEqual(after.roster,observed.roster);assert.deepEqual(after.players,observed.players);}assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
});
