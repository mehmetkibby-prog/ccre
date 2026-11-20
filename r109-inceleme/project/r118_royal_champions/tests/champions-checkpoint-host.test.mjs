import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const coreRoot=process.env.R118_TEST_CORE_ROOT??fileURLToPath(new URL('../../r109_latency_completion/working/core511-source/scripts/core511/',import.meta.url));
const core=name=>import(pathToFileURL(path.join(coreRoot,name)).href);
const [{nativeHttpHost},{until},{normalizeClaimTargets},{championsMonsterIdR118},{memoryCombatR53,rewardGroupCommitR53},{nonlethalSchemaR56},{createContentLootR102}]=await Promise.all([core('tests/native-http-host-fixture.mjs'),core('tests/helpers.mjs'),core('claim-chunks.mjs'),core('champions-config-r118.mjs'),core('r53-options.mjs'),core('nonlethal-rewards-r56.mjs'),core('content-loot-r102.mjs')]);
const {canonicalFixtureContentTriggerR118}=await import('./production-trigger-fixture-r118.mjs');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('production-flags owner stream persists nonlethal damage, kills, claims and collects a champion monster without disconnecting',{timeout:120000},async t=>{
 assert.equal(memoryCombatR53,true);assert.equal(rewardGroupCommitR53,true);
 const s=await nativeHttpHost(t,{realmSetup:async host=>{canonicalFixtureContentTriggerR118(host.database.sqlite,{createContentLoot:createContentLootR102});}}),{f,core:coordinator}=s;await s.world.stopJobs();
 await s.host.database.atomic(()=>{globalThis.__colLaunch.grant(f.account.id,true);});
 const ticket=await s.http('character',{channel:1});s.live=await s.connect(ticket);assert(nonlethalSchemaR56(f.sql),'production schema must retain its audited fast-path certificate');let sequence=0;
 const faults=()=>s.faults.map(f=>f.error?.stack??JSON.stringify(f)).join('\n');
 const send=async payload=>{const seq=++sequence;s.live.ws.send(JSON.stringify({type:'input',sequence:seq,payload}));await until(()=>s.live.packets.some(p=>p.results?.some(r=>r.sequence===seq))||s.faults.length||s.live.ws.readyState!==1,15000);assert.equal(s.faults.length,0,faults());assert.equal(s.live.ws.readyState,1,JSON.stringify(s.live.packets.slice(-3)));const result=s.live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===seq);assert(result,JSON.stringify(s.live.packets.slice(-3)));return result;};
 const auth={adminId:'checkpoint-admin',reauthorize:async()=> 'checkpoint-admin'},bridge=s.bindings.royalR118,before=await bridge.championsAdmin({action:'champions_admin_read_r118'},auth),config=structuredClone(before.config);
 for(const mob of Object.values(config.monsters))mob.damage=0;
 Object.assign(config.monsters.ivory_guard,{hp:300,xp:37,essence:3});for(const row of Object.values(config.monsters.ivory_guard.loot))row.chance=0;config.monsters.ivory_guard.loot.royal_crown.chance=100;
 await bridge.championsAdmin({action:'champions_admin_save_r118',revision:before.revision,config},auth);
 const monsterId=championsMonsterIdR118('ivory_guard',1,1);assert.match(monsterId,/^[a-z0-9-]{1,64}$/);assert.deepEqual(normalizeClaimTargets([{id:monsterId,spawnRound:17}]),[{id:monsterId,spawnRound:17}]);
 await coordinator.nativeConfiguration.run([],()=>f.sql.prepare('UPDATE monsters SET hp=300,max_hp=300,spawn_round=17,respawn_at=0 WHERE id=?').run(monsterId));
 const mob=f.sql.prepare('SELECT x,y FROM monsters WHERE id=?').get(monsterId);
 await coordinator.permanentPlayers([f.id],()=>f.sql.prepare("UPDATE players SET champion_level_r102=1,level=65,rank_tier=18,role='avci',skill_three=3,area='champions',x=?,y=?,hp=1000,max_hp=1000,combat_lock_until_ms=0,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0,rod_equipped=0 WHERE id=?").run(mob.x+25,mob.y,f.id));
 const attack={action:'attack',targetId:monsterId,spawnRound:17,ability:0};let killed=false,nonlethal=0,remaining=300,specialUsed=false,nextBasicAt=0;const attacks=[];
 for(let n=0;n<25&&!killed;n++){
  if(n)await pause(750);
  // A special may leave a few HP after its random damage roll. Use it once,
  // then finish with basics instead of illegally repeating its 12s cooldown.
  const ability=n===1?2:0;
  if(ability===0)await pause(Math.max(0,nextBasicAt-Date.now()+25));
  const result=await send({...attack,ability,intentId:'champions-checkpoint-'+n});assert.equal(result.status,200,JSON.stringify({result,attacks}));const hit=result.body?.hits?.find(h=>h.id===monsterId);assert(hit,JSON.stringify(result));
  if(ability===2)specialUsed=true;else nextBasicAt=Number(result.body?.nextAttackAtMs)||0;
  attacks.push({ability,damage:hit.damage,hp:hit.hp});killed=hit.killed===true;remaining=hit.hp;if(!killed)nonlethal++;
 }
 assert(nonlethal>0);assert(killed);assert.equal(attacks.filter(a=>a.ability===2).length,1);assert(attacks[0].hp>0);
 // A lethal visual reply precedes the durable receipt. Wait for the actual
 // persisted defeat before judging its committed rewards.
 await until(()=>f.sql.prepare('SELECT rewards_completed_at FROM normal_defeats WHERE monster_id=? AND spawn_round=17').get(monsterId)?.rewards_completed_at>0||s.faults.length,15000);
 assert.equal(s.faults.length,0,faults());
 const defeat=f.sql.prepare('SELECT * FROM normal_defeats WHERE monster_id=? AND spawn_round=17').get(monsterId);assert(defeat?.rewards_completed_at>0);
 const visibleDrops=new Map();
 for(let replay=0;replay<2;replay++){
  const claim=await send({action:'claim_rewards',rewardTargets:[{id:monsterId,spawnRound:17}]});assert.equal(claim.status,200,JSON.stringify(claim));
  for(const row of claim.body?.drops??[])visibleDrops.set(row.id,row);
 }
 const drops=f.sql.prepare('SELECT id,kind,amount,collectible_at FROM world_drops WHERE monster_id=? ORDER BY kind').all(monsterId);assert.deepEqual(drops.map(d=>[d.kind,d.amount]),[['essence',3],['royal_crown',1]]);
 const at=Math.max(...drops.map(d=>d.collectible_at));await pause(Math.max(0,at*1000-Date.now()+30));
 assert.equal(visibleDrops.size,2,'both drops must reach the owner');
 const essenceBefore=f.sql.prepare('SELECT essence FROM players WHERE id=?').get(f.id).essence;
 for(const drop of visibleDrops.values()){
  const result=await send({action:'collect',targetId:drop.id,automatic:true});assert.equal(result.status,200,JSON.stringify(result));
  if(drop.kind==='royal_crown')assert.deepEqual(result.body.materialBalance,{kind:'royal_crown',amount:1});
 }
 assert.equal(f.sql.prepare('SELECT essence FROM players WHERE id=?').get(f.id).essence,essenceBefore+3);
 assert.equal(f.sql.prepare('SELECT amount FROM dungeon_materials WHERE player_id=? AND kind=?').get(f.id,'royal_crown').amount,1);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM world_drops WHERE monster_id=?').get(monsterId).n,0);assert.equal(s.faults.length,0,faults());assert.equal(s.live.ws.readyState,1);
 t.diagnostic(JSON.stringify({coreRoot,realm:process.env.R102_TEST_REALM??'fixture',nonlethal,specialUsed,attacks,claims:2,collected:drops.length,faults:s.faults.length}));
});
