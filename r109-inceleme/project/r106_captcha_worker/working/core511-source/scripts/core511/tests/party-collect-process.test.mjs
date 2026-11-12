import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,extraPlayer,combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';
import {put,json} from './pvp-fixture.mjs';

async function fixture(t){
 const s=await setup(t,{shared:true}),{f,core,world,writer,supervisor,http,connect}=s;await world.stopJobs();const other=extraPlayer(s,22),ticket=await http('ticket'),live=await connect(ticket);assert.equal((await other.http()).status,200);const otherTicket=await other.http('transfer',{channel:4}),recipient=await connect(otherTicket);assert.notEqual(ticket.channel,4);
 await core.permanentPlayers([f.id,other.id],()=>{
  for(const [id,area,essence]of [[f.id,'forest',13],[other.id,'bazaar',17]])f.sql.prepare('UPDATE players SET area=?,arena_match_id=\'\',x=1000,y=1000,hp=max_hp,essence=?,essence_until=?,essence_bonus_remainder=4,last_seen=? WHERE id=?').run(area,essence,f.clock()+3600000,Math.floor(f.clock()/1000),id);
  put(f.sql,'parties',{id:'process-loot-party',leader_id:f.id,created_at:1});for(const [i,id]of [f.id,other.id].entries())put(f.sql,'party_members',{party_id:'process-loot-party',player_id:id,joined_at:i+1});
  put(f.sql,'world_drops',{id:'process-party-drop',owner_id:f.id,monster_id:'golge-process-party',kind:'essence',item_name:'Native party essence',rarity:'white',power:0,amount:11,role:'avci',enchantments:'[]',x:1000,y:1000,expires_at:Math.floor(f.clock()/1000)+600,collectible_at:Math.floor(f.clock()/1000)});
 });
 const read=()=>json({players:[f.id,other.id].map(id=>f.sql.prepare('SELECT id,essence,essence_bonus_remainder FROM players WHERE id=?').get(id)),drop:!!f.sql.prepare('SELECT 1 FROM world_drops WHERE id=?').get('process-party-drop'),rewards:f.sql.prepare('SELECT player_id,amount FROM guild_essence_rewards WHERE id LIKE ? ORDER BY player_id').all('process-party-drop:%'),receipts:f.sql.prepare("SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id LIKE 'shared:%'").get().n}),send=(client=live,sequence=1)=>client.ws.send(JSON.stringify({type:'input',sequence,payload:{action:'collect',targetId:'process-party-drop'}}));
 return {...s,other,ticket,otherTicket,live,recipient,read,send,old:[world.row,...supervisor.rows.values()]};
}

test('native party essence freezes a foreign channel through durable ACK, refreshes both owners, and rejects duplicate loot',{timeout:35000},async t=>{
 const s=await fixture(t),{f,writer,world,supervisor,other,live,faults,read,send,old}=s,command=writer.command.bind(writer);let committed=false,release;const gate=new Promise(resolve=>release=resolve);t.after(()=>release());
 writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.operation==='native_action'&&request.payload.input.action==='collect'&&!committed){committed=true;await gate;}return ack;};
 send();await until(()=>committed||faults.length,8000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const held=await combatState(supervisor.rows.get(4));assert(held.players.find(p=>p.id===other.id).external);assert.equal(held.players.find(p=>p.id===other.id).suspended,true);assert.equal(read().drop,false);assert.equal(read().rewards.length,2);assert.equal(read().receipts,1);
 release();await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))&&!world.combat.busy||faults.length,8000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const result=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.shared,2);
 const state=await combatState(supervisor.rows.get(4)),foreign=state.players.find(p=>p.id===other.id);assert.equal(foreign.external,null);assert.equal(foreign.suspended,false);assert.equal(foreign.essence,read().players[1].essence);assert.equal(foreign.essenceRemainder,read().players[1].essence_bonus_remainder);assert.deepEqual([world.row,...supervisor.rows.values()],old);
 const accepted=read();send(live,2);try{await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===2))||faults.length,7000);}catch(error){throw Error(JSON.stringify({packets:live.packets.filter(p=>p.results?.length||['retry','rejected','error'].includes(p.type)),read:read(),faults:faults.map(f=>f.error?.stack),state:await combatState(supervisor.rows.get(s.ticket.channel))}),{cause:error});}assert.equal(live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===2).status,404);assert.deepEqual(read().players,accepted.players);assert.deepEqual(read().rewards,accepted.rewards);assert.equal(read().receipts,2);
});

for(const phase of ['before','after'])test('party collect source SIGKILL '+phase+' COMMIT retires all five owners and preserves one native split',{timeout:45000},async t=>{
 const s=await fixture(t),{f,writer,world,core,supervisor,http,connect,live,ticket,other,read,send,old,faults}=s,source=supervisor.rows.get(ticket.channel),operation=writer.authority.operations.native_action.execute,command=writer.command.bind(writer),before=read();let killed=false,observed;
 writer.authority.operations.native_action.execute=(...args)=>{const result=operation(...args);if(phase==='before'&&!killed){killed=true;source.child.kill('SIGKILL');throw Object.assign(Error('collect_before_commit'),{code:'collect_before_commit'});}return result;};
 writer.command=async(peer,request)=>{try{const ack=await command(peer,request);if(request.operation==='native_action'&&phase==='after'&&!killed){killed=true;observed=read();source.child.kill('SIGKILL');throw Object.assign(Error('collect_lost_ack'),{code:'collect_lost_ack'});}return ack;}catch(error){if(killed&&phase==='before')observed=read();throw error;}};
 send();await until(()=>observed!==undefined,10000);if(phase==='before')assert.deepEqual(observed,before);else{assert.equal(observed.drop,false);assert.equal(observed.rewards.length,2);assert.equal(observed.receipts,1);}
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(row=>row.state==='running'&&!old.includes(row)),20000);await world.stopJobs();assert(old.every(row=>row.exited));assert.equal(source.child.signalCode,'SIGKILL');
 const fresh=await http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));const next=await connect(fresh);send(next);await until(()=>next.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.some(f=>f.globalRecovery),8000);const reply=next.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(reply?.status,phase==='before'?200:404,JSON.stringify(next.packets.filter(p=>p.results?.length||p.type==='retry')));
 assert.equal(read().drop,false);assert.equal(read().rewards.length,2);assert.equal(read().receipts,phase==='before'?1:2);if(phase==='after')assert.deepEqual(read().players,observed.players);for(const reward of read().rewards){const original=before.players.find(p=>p.id===reward.player_id),current=read().players.find(p=>p.id===reward.player_id);assert.equal(current.essence,original.essence+reward.amount);}
 assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
});
