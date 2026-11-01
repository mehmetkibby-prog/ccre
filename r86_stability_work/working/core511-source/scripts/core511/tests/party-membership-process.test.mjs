import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,extraPlayer,combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';
import {put} from './pvp-fixture.mjs';

test('original party actions refresh same-channel and C4 rosters and preserve native transfer invitation cleanup',{timeout:45000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,supervisor,http,connect,faults}=s;await world.stopJobs();const host=extraPlayer(s,24,'party-leader511'),member=extraPlayer(s,23),ticket=await host.http('ticket'),leader=await connect(ticket);assert.equal((await member.http()).status,200);const same=await member.http('transfer',{channel:ticket.channel});assert.equal(same.status,200);let guest=await connect(same);
 await core.permanentPlayers([host.id,member.id],()=>{for(const id of [host.id,member.id])f.sql.prepare("UPDATE players SET area='bazaar',arena_match_id='',hp=max_hp,level=40,combat_lock_until_ms=0,x=1000,y=1000,last_seen=? WHERE id=?").run(Math.floor(f.clock()/1000),id);});
 const old=[world.row,...supervisor.rows.values()],seq=new WeakMap(),send=async(client,payload)=>{const sequence=(seq.get(client)??0)+1;seq.set(client,sequence);client.ws.send(JSON.stringify({type:'input',sequence,payload}));await until(()=>client.packets.some(p=>p.results?.some(r=>r.sequence===sequence))||faults.length,8000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const result=client.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===sequence);if(result?.status>=400)t.diagnostic(JSON.stringify({payload,result,actor:host.id}));return result;};
 const invite=()=>send(leader,{action:'invite_party',targetPlayerId:member.id}),rows=()=>f.sql.prepare('SELECT player_id,party_id FROM party_members ORDER BY player_id').all().map(r=>[r.player_id,r.party_id]);
 assert.equal((await invite()).status,200);const stamp=f.sql.prepare('SELECT created_at FROM party_invites WHERE recipient_id=?').get(member.id).created_at;
 assert.equal((await send(guest,{action:'reject_party',targetPlayerId:host.id,createdAt:stamp-1})).status,200);assert(f.sql.prepare('SELECT 1 FROM party_invites WHERE recipient_id=?').get(member.id));
 assert.equal((await send(guest,{action:'reject_party',targetPlayerId:host.id,createdAt:stamp})).status,200);assert.equal(f.sql.prepare('SELECT 1 FROM party_invites WHERE recipient_id=?').get(member.id),undefined);
 assert.equal((await invite()).status,200);assert.equal((await send(guest,{action:'accept_party',targetPlayerId:host.id})).status,200);const accepted=rows();assert.equal(accepted.length,2);assert.deepEqual((await combatState(supervisor.rows.get(ticket.channel))).parties.sort(),accepted);
 assert.equal((await send(guest,{action:'kick_party',targetPlayerId:host.id})).status,403);assert.deepEqual(rows(),accepted);
 assert.equal((await send(leader,{action:'kick_party',targetPlayerId:member.id})).status,200);assert.deepEqual((await combatState(supervisor.rows.get(ticket.channel))).parties,rows());
 assert.equal((await invite()).status,200);const moved=await member.http('transfer',{channel:4});assert.equal(moved.status,200,JSON.stringify(moved));guest=await connect(moved);assert.equal((await send(guest,{action:'accept_party',targetPlayerId:host.id})).status,404,'native transfer deletes invitations');assert.equal((await invite()).status,404,'native invitation still requires same area/channel');
 // Exercise native commands against a valid CURRENT DB cross-channel roster.
 // Channel transfer itself removes membership; it must not be used to invent
 // a surviving invitation or bypass the original acceptance rule.
 const party=f.sql.prepare('SELECT party_id FROM party_members WHERE player_id=?').get(host.id).party_id;
 const seedMember=()=>core.permanentPlayers([host.id,member.id],()=>put(f.sql,'party_members',{party_id:party,player_id:member.id,joined_at:Math.floor(f.clock()/1000)}));
 await seedMember();for(const ch of [ticket.channel,4])assert.deepEqual((await combatState(supervisor.rows.get(ch))).parties.sort(),rows());
 assert.equal((await send(leader,{action:'kick_party',targetPlayerId:member.id})).status,200);assert.equal((await combatState(supervisor.rows.get(4))).parties.length,0);assert.deepEqual((await combatState(supervisor.rows.get(ticket.channel))).parties,rows());await seedMember();
 assert.equal((await send(leader,{action:'leave_party'})).status,200);assert.equal(f.sql.prepare('SELECT leader_id FROM parties').get().leader_id,member.id);
 assert.equal((await send(guest,{action:'leave_party'})).status,200);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM parties').get().n,0);assert.equal((await combatState(supervisor.rows.get(ticket.channel))).parties.length,0);assert.deepEqual([world.row,...supervisor.rows.values()],old);
});
