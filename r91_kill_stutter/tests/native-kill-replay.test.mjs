import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../working/core511-source/scripts/core511/tests/process-fixture.mjs';
import {until} from '../working/core511-source/scripts/core511/tests/helpers.mjs';

for(const area of ['forest','rune_v2'])test(`${area}: native kill, historical owners, committed receipt replay and claim replay preserve one reward`,{timeout:50000},async t=>{
 const target=area==='forest'?'golge-local-terminal511':'rune-v2-tide-c4-1';
 const s=await setup(t,{shared:true,localCombat:{id:target,hp:1,area}});await s.world.stopJobs();
 const live=await s.connect(await s.http('character',{channel:4}));
 await s.core.permanentPlayers([s.f.id],()=>{
  s.f.sql.prepare('UPDATE players SET area=?,level=65,x=2700,y=2025,hp=100000,max_hp=100000,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0,respawn_at_ms=0,stun_until_ms=0,root_until_ms=0 WHERE id=?').run(area,s.f.id);
  s.f.sql.exec("WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<1000) INSERT INTO kernel511_channel_owners(player_id,channel,epoch,incarnation,state,updated_ms) SELECT 'offline-history-'||i,1,2,'retired','active',0 FROM n");
 });
 await until(()=>live.packets.some(p=>JSON.stringify(p).includes(area)),5000);
 const command=s.writer.command.bind(s.writer);let captured;
 s.writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.operation==='attack')captured={peer,request,ack};return ack;};
 const send=(sequence,payload)=>live.ws.send(JSON.stringify({type:'input',sequence,payload}));
 const result=sequence=>live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===sequence);
 const fail=()=>assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
 send(1,{action:'attack',ability:0,targetId:target,spawnRound:17,intentId:'r91-owner-kill'});
 await until(()=>captured||s.faults.length,12000);fail();assert(captured);
 await until(()=>result(1)||s.faults.length,5000);fail();assert([200,202].includes(result(1).status));
 const read=()=>({
  monster:{...s.f.sql.prepare('SELECT hp,spawn_round FROM monsters WHERE id=?').get(target)},
  player:{...s.f.sql.prepare('SELECT xp,rank_xp,gems,essence FROM players WHERE id=?').get(s.f.id)},
  defeat:{...s.f.sql.prepare('SELECT rewards_completed_at FROM normal_defeats WHERE monster_id=? AND spawn_round=17').get(target)},
  claims:s.f.sql.prepare('SELECT COUNT(*) n FROM normal_reward_claims WHERE monster_id=? AND spawn_round=17').get(target).n,
  xpClaims:s.f.sql.prepare('SELECT COUNT(*) n FROM monster_xp_claims WHERE monster_id=? AND spawn_round=17').get(target).n,
  drops:s.f.sql.prepare('SELECT COUNT(*) n FROM world_drops WHERE owner_id=? AND monster_id=?').get(s.f.id,target).n
 });
 const paid=read();assert.equal(paid.monster.hp,0);assert(paid.defeat.rewards_completed_at>0);assert.equal(paid.claims,1);assert.equal(paid.xpClaims,1);
 if(area==='forest')assert(s.writer.rewardWorkerR533.stats.jobs>0,'forest kill must exercise the modified worker');
 await command(captured.peer,captured.request);assert.deepEqual(read(),paid,'same receipt cannot mint a second reward');
 for(const sequence of [2,3]){
  send(sequence,{action:'claim_rewards',rewardTargets:[{id:target,spawnRound:17}]});
  await until(()=>result(sequence)||s.faults.length,8000);fail();assert.equal(result(sequence).status,200);assert.deepEqual(read(),paid,'claim replay cannot change economy');
 }
 send(4,{action:'move',x:2703,y:2025});await until(()=>result(4)||s.faults.length,8000);fail();assert.equal(result(4).status,200);
});
