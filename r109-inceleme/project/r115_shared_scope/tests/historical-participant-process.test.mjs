import test from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.STUTTER_TREE+'/core511-source/scripts/core511/';
const {setup,extraPlayer}=await import(base+'tests/process-fixture.mjs');
const {until}=await import(base+'tests/helpers.mjs');

// A previous contributor is no longer a resident of the attacker's map. A
// shared attack still audits local monster contributions (including AoE).
// Exercise real channel/world processes, native SQL, receipts and ownership.
test('a departed local contributor cannot turn a shared kill into realm recovery',{timeout:70000},async t=>{
 const s=await setup(t,{shared:true,sharedCombat:{hp:1000},localCombat:{hp:1000},prepare:f=>{
  f.sql.prepare('INSERT INTO monsters(id,name,area,channel,x,y,hp,max_hp,spawn_round,last_damaged_at_ms,last_regen_at_ms) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('golge-r115-shared','R115 shared ordinary monster','forest',0,1000,1000,1,1,19,f.clock(),f.clock());
 }});
 const {f,writer,world,core,http,connect,faults,supervisor}=s;
 await world.stopJobs();const other=extraPlayer(s,15);
 await core.permanentPlayers([f.id,other.id],()=>{
  const q=f.sql.prepare('UPDATE players SET area=?,x=1000,y=1000,hp=100000,max_hp=100000,level=40,xp=0,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0,combat_lock_until_ms=0,last_seen=? WHERE id=?');
  q.run('forest',Math.floor(f.clock()/1000),f.id);q.run('frozen',Math.floor(f.clock()/1000),other.id);
  f.sql.prepare('INSERT INTO monster_participants(monster_id,spawn_round,player_id,created_at) VALUES(?,?,?,?)').run('golge-local-terminal511',17,other.id,Math.floor(f.clock()/1000));
 });
 const ticket=await http('character',{channel:4});assert.equal(ticket.status,200);
 const otherTicket=await other.http('character',{channel:3});assert.equal(otherTicket.status,200);
 const live=await connect(ticket);await connect(otherTicket);
 const incarnations=[world.row.peer.incarnation,...[...supervisor.rows.values()].map(r=>r.peer.incarnation)];
 const command=writer.command.bind(writer),done=[];
 writer.command=async(peer,q)=>{const ack=await command(peer,q);if(q.operation==='attack')done.push({peer,q,ack});return ack;};
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'golge-r115-shared',spawnRound:19,ability:0,intentId:'r115-history-shared-kill'}}));
 await until(()=>done.length||faults.length||core.recoveringWorld,12000);
 assert.equal(faults.length,0,faults.map(r=>r.error?.stack).join('\n'));
 assert.equal(Boolean(core.recoveringWorld),false,'a historical participant must not restart the realm');
 await until(()=>!core.sharedWorld.combat.busy,10000);
 assert.equal(done.length,1);assert.equal(Boolean(core.recoveringWorld),false);
 assert.equal(f.sql.prepare("SELECT hp FROM monsters WHERE id='golge-r115-shared'").get().hp,0);
 assert.deepEqual([world.row.peer.incarnation,...[...supervisor.rows.values()].map(r=>r.peer.incarnation)],incarnations);
 const values=()=>f.sql.prepare('SELECT id,xp,gems FROM players WHERE id IN (?,?) ORDER BY id').all(f.id,other.id);
 const saved=values();assert(saved.find(p=>p.id===f.id).xp>0);
 const {peer,q}=done[0];await command(peer,q);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(q.operationId).n,1);
 assert.deepEqual(values(),saved,'a retried receipt cannot give another reward');
 assert.equal(core.sharedWorld.combat.gate.active.size,0);
 assert.equal(core.sharedWorld.combat.actors.active.size,0);
});
