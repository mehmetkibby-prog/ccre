import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=(process.env.STUTTER_TREE??new URL('../working',import.meta.url).pathname)+'/core511-source/scripts/core511/';
const {setup,combatState}=await import(base+'tests/process-fixture.mjs');
const {until}=await import(base+'tests/helpers.mjs');
const {AdventureService}=await import(base+'adventure-service.mjs');
const {TOWER_DEFAULTS,TOWER_CATALOG,validateTowerConfig}=await import(base+'tower-config.mjs');
const {framed}=await import(base+'reliable-stream.mjs');
const bytes=value=>Buffer.byteLength(JSON.stringify(value));

// This is a valid configurable tower floor, not an inflated text field or an
// inventory-cap bypass. The authoritative reader retains all earlier waves'
// monsters and profiles on the current floor, including defeated enemies.
function seedLargeTower(f){
 const config=structuredClone(TOWER_DEFAULTS),spawn=config.floors[0].spawns[0];
 const drops=TOWER_CATALOG.filter(row=>!['towerChest','towerItem'].includes(row.type)).slice(0,8).map(row=>({itemId:row.id,chance:10,min:1,max:1}));
 config.floors[0].waves=10;
 config.floors[0].spawns=[{...spawn,count:30,damage:0,drops},{...spawn,kind:'claw',count:30,damage:0,drops}];
 validateTowerConfig(config);
 f.sql.prepare('UPDATE kadim_tower_settings SET value=?').run(JSON.stringify(config));
 f.sql.prepare('UPDATE players SET channel=4 WHERE id=?').run(f.id);
 const adventure=new AdventureService(f.sql,{now:f.clock,uuid:randomUUID});
 const run=adventure.insertRun('tower',4,f.sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle,config,{floor:1,wave:1,partyId:null});
 run.deadline_ms=f.clock()+3600000;
 adventure.join(f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id),run);
 for(let wave=1;wave<=10;wave++){
  f.sql.prepare('UPDATE monsters SET hp=0 WHERE area=?').run(run.area);
  run.state.wave=wave;adventure.spawnWave(run);
 }
}

test('valid tower snapshot above 1 MiB admits, restores channel4 after SIGKILL and reconnects without losing state',{timeout:70000},async t=>{
 const s=await setup(t,{shared:true,prepare:seedLargeTower});
 const {f,core,world,writer,supervisor,http,connect,faults}=s;await world.stopJobs();
 const snapshots=[],load=core.load.bind(core);
 core.load=async(...args)=>{const bundle=await load(...args);if(args[0]===f.id)snapshots.push(bundle);return bundle;};
 const ticket=await http('character',{channel:4}),bundle=snapshots[0];
 assert(bundle,'the actual read worker produced the admission snapshot');
 const summary={bytes:bytes(bundle),sections:Object.fromEntries(Object.entries(bundle).map(([key,value])=>[key,bytes(value)])),projection:Object.fromEntries(Object.entries(bundle.projection.data).map(([key,value])=>[key,bytes(value)]))};
 t.diagnostic('native actor bundle '+JSON.stringify(summary));
 assert(summary.bytes>1048576&&summary.bytes<4*1048576,'valid reader result exceeds one frame but stays inside the existing read limit');
 assert.equal(bundle.adventure.monsters.length,600);assert.equal(bundle.adventure.profiles.length,600);
 assert.equal(bundle.projection.data.adventure511.profiles.length,600);
 assert.throws(()=>framed({type:'control',id:'r116-raw-frame',method:'admit',payload:{bundle}}),{code:'ipc_frame_size'},'the original 1 MiB frame limit remains enforced');
 assert.equal(ticket.status,200,JSON.stringify(ticket));assert.equal(ticket.channel,4);
 const live=await connect(ticket),original=supervisor.rows.get(4),healthy=[world.row,...[...supervisor.rows.values()].filter(row=>row!==original)];
 const state=()=>({
  economy:f.sql.prepare('SELECT gems,xp,potions,essence FROM players WHERE id=?').get(f.id),
  items:f.sql.prepare('SELECT * FROM player_items WHERE player_id=? ORDER BY id').all(f.id),
  materials:f.sql.prepare('SELECT * FROM dungeon_materials WHERE player_id=? ORDER BY kind').all(f.id),
  rewardClaims:f.sql.prepare('SELECT * FROM normal_reward_claims WHERE player_id=? ORDER BY monster_id').all(f.id),
  adventureMember:f.sql.prepare('SELECT run_id,departed FROM adventure_members WHERE player_id=?').get(f.id)
 });
 const before=state();assert.equal((await combatState(original)).players.find(row=>row.id===f.id)?.area,bundle.player.area);
 assert.equal(faults.length,0,faults.map(row=>row.error?.stack).join('\n'));
 assert(original.child.kill('SIGKILL'));
 await until(()=>supervisor.rows.get(4)!==original&&supervisor.rows.get(4)?.state==='running',25000);
 const restored=supervisor.rows.get(4),fresh=await http('ticket');
 assert.equal(fresh.status,200,JSON.stringify(fresh));assert.equal(fresh.channel,4);assert(fresh.epoch>ticket.epoch);
 assert.notEqual(restored.peer.incarnation,original.peer.incarnation);assert.equal(restored.recovered.active,1);
 assert(healthy.every(row=>!row.exited),'an oversized actor restore must not replace healthy channels or the world');
 assert.equal(Boolean(core.recoveringWorld),false);assert.equal(writer.authority.owner(f.id).incarnation,restored.peer.incarnation);
 assert(snapshots.length>=2);assert.equal(snapshots.at(-1).adventure.profiles.length,600);
 assert(bytes(snapshots.at(-1))>1048576);
 const resumed=await connect(fresh);await live.closed;
 resumed.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'heartbeat'}}));
 await until(()=>resumed.packets.some(packet=>packet.results?.some(result=>result.sequence===1))||faults.length,10000);
 assert.equal(faults.length,0,faults.map(row=>row.error?.stack).join('\n'));
 const result=resumed.packets.flatMap(packet=>packet.results??[]).find(row=>row.sequence===1);
 assert.equal(result?.status,200,JSON.stringify(result));
 // The original non-maintenance renew statement reaches the same owner guard
 // that reported native_presence_owner_missing during the failed live restore.
 const nowMs=f.clock(),renew=f.f.database.prepare('UPDATE game_presence SET expires_at_ms=? WHERE account_id=? AND token_hash=? AND instance_id=? AND expires_at_ms>? RETURNING chat_after_id').bind(nowMs+45000,f.account.id,f.tokenHash,f.instance,nowMs);
 const renewed=await core.nativePresence.execute(renew,{accountId:f.account.id,tokenHash:f.tokenHash,instance:f.instance,action:'renew',nowMs,first:true});
 assert.equal(renewed.chat_after_id,0);
 assert.equal((await combatState(restored)).players.find(row=>row.id===f.id)?.area,bundle.player.area);
 assert.deepEqual(state(),before,'transport and recovery preserve items, balances, rewards and tower membership');
});
