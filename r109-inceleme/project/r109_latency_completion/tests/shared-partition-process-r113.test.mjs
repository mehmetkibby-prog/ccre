import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,extraPlayer} from '../working/core511-source/scripts/core511/tests/process-fixture.mjs';
import {createAdventureSchema} from '../working/core511-source/scripts/core511/adventure-schema.mjs';
import {until} from '../working/core511-source/scripts/core511/tests/helpers.mjs';

test('actual map owners: a held forest operation cannot stop a frozen-map death on another channel',{timeout:70000},async t=>{
 const s=await setup(t,{shared:true,sharedCombat:{hp:1},prepare:f=>{
  createAdventureSchema(f.sql);
  for(const area of ['forest','frozen'])f.sql.prepare('INSERT INTO monsters(id,name,area,channel,x,y,hp,max_hp,spawn_round,last_damaged_at_ms,last_regen_at_ms) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('golge-r113-'+area,'Independent '+area+' mob',area,0,2700,2025,1,1,19,f.clock(),f.clock());
 }}),{f,writer,world,core,http,connect,faults}=s;
 await world.stopJobs();const other=extraPlayer(s,2);
 // Set both fixture locations before admission: an already simulated forest
 // actor may have a valid encounter that a raw SQL teleport cannot carry over.
 await core.permanentPlayers([f.id,other.id],()=>{
  const q=f.sql.prepare('UPDATE players SET area=?,x=?,y=?,hp=100000,max_hp=100000,level=40,xp=0,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0,combat_lock_until_ms=0,last_seen=? WHERE id=?');
  q.run('forest',2700,2025,Math.floor(f.clock()/1000),f.id);q.run('frozen',2700,2025,Math.floor(f.clock()/1000),other.id);
 });
 const firstTicket=await http('character',{channel:4}),secondTicket=await other.http('character',{channel:3});
 assert.equal(firstTicket.status,200);assert.equal(secondTicket.status,200);
 const a=await connect(firstTicket),b=await connect(secondTicket);

 const bridge=core.sharedWorld.combat.bridge('forest'),originalGrant=bridge.beforeGrantR113;let release,held=false;
 const pause=new Promise(resolve=>release=resolve);t.after(()=>release());
 bridge.beforeGrantR113=async(...args)=>{await originalGrant(...args);held=true;await pause;};
 const command=writer.command.bind(writer),done=[];
 writer.command=async(peer,q)=>{const ack=await command(peer,q);if(q.operation==='attack')done.push({peer,q,ack});return ack;};
 a.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'golge-r113-forest',spawnRound:19,ability:0,intentId:'r113-map-forest'}}));
 try{await until(()=>held||faults.length,10000);}catch(e){throw Error(JSON.stringify({cause:e.message,bridges:[...core.sharedWorld.combat.bridges.keys()],bosses:f.sql.prepare('SELECT id,area,hp FROM monsters WHERE channel=0 AND is_boss=1').all(),player:f.sql.prepare('SELECT area,channel FROM players WHERE id=?').get(f.id),last:a.packets.slice(-2)}));}assert(held,'forest received its own owner');
 b.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'golge-r113-frozen',spawnRound:19,ability:0,intentId:'r113-map-frozen'}}));
 try{await until(()=>done.some(r=>r.q.playerId===other.id)||faults.length,10000);}catch(e){throw Error(JSON.stringify({cause:e.message,bridges:[...core.sharedWorld.combat.bridges].map(([area,b])=>({area,requests:[...b.requests.values()].map(r=>({phase:r.phase,actor:r.source.actor,proof:!!r.proof}))})),gates:[...core.sharedWorld.combat.gate.active].map(r=>({keys:r.keys,global:r.global})),target:f.sql.prepare('SELECT id,hp,area,channel,spawn_round FROM monsters WHERE id=?').get('golge-r113-frozen'),player:f.sql.prepare('SELECT id,area,channel,x,y FROM players WHERE id=?').get(other.id),responses:b.packets.flatMap(p=>p.results??[]).slice(-4)}));}
 assert.equal(faults.length,0,faults.map(r=>r.error?.stack).join('\n'));
 assert(done.some(r=>r.q.playerId===other.id),'independent map must commit while forest remains held');
 assert(!done.some(r=>r.q.playerId===f.id));assert.equal(f.sql.prepare("SELECT hp FROM monsters WHERE id='golge-r113-frozen'").get().hp,0);
 release();await until(()=>done.some(r=>r.q.playerId===f.id)||faults.length,10000);
 assert.equal(faults.length,0,faults.map(r=>r.error?.stack).join('\n'));
 assert.equal(f.sql.prepare("SELECT hp FROM monsters WHERE id='golge-r113-forest'").get().hp,0);
 const values=f.sql.prepare('SELECT id,xp,gems FROM players WHERE id IN (?,?) ORDER BY id').all(f.id,other.id);
 assert(values.every(p=>p.xp>0));
 for(const {peer,q} of done){await command(peer,q);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(q.operationId).n,1);}
 assert.deepEqual(f.sql.prepare('SELECT id,xp,gems FROM players WHERE id IN (?,?) ORDER BY id').all(f.id,other.id),values);
});
