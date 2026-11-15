import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE,SHA,native} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/helpers.mjs';
import {createAttackWriterRules} from '../../r109_latency_completion/working/core511-source/scripts/core511/generated/attack-writer-rules.mjs';
import {createRules} from '../../r109_latency_completion/working/core511-source/scripts/core511/generated/rules.mjs';
import {createRespawnRules} from '../../r109_latency_completion/working/core511-source/scripts/core511/generated/respawn-rules.mjs';
import {createContentLootR102} from '../../r109_latency_completion/working/core511-source/scripts/core511/content-loot-r102.mjs';
import {nativeAtomicStatements} from '../../r109_latency_completion/working/core511-source/scripts/core511/retaliation-writer.mjs';
import {ensureChampionsSchemaR118,createChampionsR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/champions-service-r118.mjs';
process.env.COL_NATIVE_TEST_ROOT=BASE;process.env.COL_NATIVE_TEST_MANIFEST_SHA256=SHA;
const {fixture}=await import('../../r109_latency_completion/working/core511-source/scripts/perf-r11/tests/reward/fixture.mjs');
const {installRegistry}=await native('vds-server/src/loadlab/registry.mjs');
test('champions native SQLite travel, combat, loot, collection and respawn',async()=>{
const f=await fixture();installRegistry({now:()=>100000});try{
const sql=f.database.sqlite;ensureChampionsSchemaR118(sql);const globals={__colChampionsR118:createChampionsR118(sql)},db=nativeAtomicStatements(sql),now=100000;
const response={json:(body,{status=200}={})=>({body,status})};
const rules=createAttackWriterRules({globals,now:()=>now,response,ports:{settlePveEngagement:()=>null,publishRealtimeRoomEvent:()=>{},publishRealtimeRoomEventToChannels:()=>{},deliverRealtime:x=>x,runRewardDelivery:(_db,_key,fn)=>fn()}});
const settings={...sql.prepare('SELECT * FROM game_settings').get(),...sql.prepare('SELECT * FROM combat_settings').get()};
const act=(payload)=>{const player=sql.prepare("SELECT * FROM players WHERE id='real-1'").get();return rules.nativeAction(db,{player,playerId:player.id,payload,settings,requestReceivedAtMs:now,now:100,auth:{account:{id:player.account_id}}});};
sql.prepare("UPDATE players SET hp=100,max_hp=100,area='forest',champion_level_r102=0,combat_lock_until_ms=0 WHERE id='real-1'").run();
let v=act({action:'travel_champions',confirmPvp:true});assert.equal(v.status,403,JSON.stringify(v));
sql.prepare("UPDATE players SET champion_level_r102=1 WHERE id='real-1'").run();v=act({action:'travel_champions'});assert.equal(v.status,403,JSON.stringify(v));
v=act({action:'travel_champions',confirmPvp:true});assert.equal(v.status,200,JSON.stringify(v));assert.equal(sql.prepare("SELECT area FROM players WHERE id='real-1'").get().area,'champions');
const common=createRules({globals,now:()=>now});assert(common.validArea('champions'));assert(common.isAreaWalkableSegment('champions',1800,1950,400,400));assert(!common.isAreaWalkableSegment('champions',1800,1950,10,10));
const mob=sql.prepare("SELECT * FROM monsters WHERE id='champions-ivory_guard-c1-01'").get();assert.equal(common.monsterXpReward(mob,settings),globals.__colChampionsR118.monster(mob).xp);
const actor=sql.prepare("SELECT * FROM players WHERE id='real-1'").get();const damage=common.pveDamage(mob,0,actor,settings);assert.equal(damage.raw,globals.__colChampionsR118.monster(mob).damage);
sql.prepare("INSERT INTO world_drops(id,owner_id,monster_id,kind,item_name,rarity,power,amount,role,enchantments,x,y,expires_at,collectible_at) VALUES('r118-crown','real-1',?,'royal_crown','Kraliyet Tacı','royal',0,1,NULL,'[]',1800,1950,120,100)").run(mob.id);
v=act({action:'collect',targetId:'r118-crown'});assert.equal(v.status,200,JSON.stringify(v));assert.equal(sql.prepare("SELECT amount FROM dungeon_materials WHERE player_id='real-1' AND kind='royal_crown'").get().amount,1);

sql.prepare("UPDATE players SET x=?,y=?,rod_equipped=0,attack_one_at=0,level=65,rank_tier=18,champion_level_r102=1 WHERE id='real-1'").run(mob.x,mob.y);
sql.prepare("UPDATE monsters SET hp=1 WHERE id=?").run(mob.id);
const config=structuredClone(globals.__colChampionsR118.settings().config);config.monsters.ivory_guard.loot.royal_crown.chance=100;globals.__colChampionsR118.save(config,1);
const frame=rules.hydrateAttack(db,'real-1',mob.id);frame.player.pet_kind=null;
const context={player:frame.player,playerId:'real-1',payload:{action:'attack',targetId:mob.id,spawnRound:1,ability:0,intentId:'r118-kill'},settings,attackTargetId:mob.id,preloadedAttackMonster:frame.monster,requestReceivedAtMs:now,now:100,auth:{account:{id:frame.player.account_id}}};
sql.exec('BEGIN IMMEDIATE');try{const result=rules.nativeAttack(db,context);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.hits[0].killed,true,JSON.stringify(result));sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}
assert.equal(sql.prepare('SELECT hp FROM monsters WHERE id=?').get(mob.id).hp,0);
sql.exec('BEGIN IMMEDIATE');try{const reward=rules.awardPendingNormalRewards(db,settings,100,{id:mob.id,spawn_round:1});assert.equal(reward.awarded,true,JSON.stringify(reward));sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}
const drops=sql.prepare('SELECT kind,amount FROM world_drops WHERE monster_id=? ORDER BY kind').all(mob.id);assert.deepEqual(drops.map(r=>[r.kind,r.amount]),[['essence',9],['royal_crown',1]]);
const beforeCount=sql.prepare('SELECT COUNT(*) n FROM world_drops').get().n;
sql.exec('BEGIN IMMEDIATE');try{rules.awardPendingNormalRewards(db,settings,100,{id:mob.id,spawn_round:1});sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}
assert.equal(sql.prepare('SELECT COUNT(*) n FROM world_drops').get().n,beforeCount);

// Explicit zero-loot suppresses generic/event delivery, including direct-material triggers.
createContentLootR102(sql);sql.prepare("UPDATE content_settings_r102 SET config=json_set(config,'$.newyear.enabled',1,'$.newyear.dropPercent',100) WHERE id=1").run();
const zero=structuredClone(globals.__colChampionsR118.settings().config);zero.monsters.ivory_guard.essence=0;zero.monsters.ivory_guard.xp=0;zero.monsters.ivory_guard.hp=2468;zero.monsters.ivory_guard.respawnSeconds=37;for(const row of Object.values(zero.monsters.ivory_guard.loot))row.chance=0;
globals.__colChampionsR118.save(zero,2);
const due=sql.prepare('SELECT * FROM monsters WHERE id=?').get(mob.id);assert.equal(due.respawn_at,130);const respawner=createRespawnRules({globals});db.batch(respawner.plan(db,settings,[due],130));let alive=sql.prepare('SELECT * FROM monsters WHERE id=?').get(mob.id);assert.equal(alive.hp,2468);assert.equal(alive.max_hp,2468);assert.equal(alive.spawn_round,2);assert.equal(alive.respawn_at,0);
db.batch(respawner.plan(db,settings,[due],130));assert.equal(sql.prepare('SELECT spawn_round FROM monsters WHERE id=?').get(mob.id).spawn_round,2);
sql.prepare('DELETE FROM world_drops WHERE monster_id=?').run(mob.id);sql.prepare('UPDATE monsters SET hp=1 WHERE id=?').run(mob.id);sql.prepare("UPDATE players SET attack_one_at=0 WHERE id='real-1'").run();
const beforeMaterials=sql.prepare("SELECT * FROM dungeon_materials WHERE player_id='real-1' ORDER BY kind").all(),beforeItems=sql.prepare("SELECT * FROM player_items WHERE player_id='real-1' ORDER BY id").all();
const next=rules.hydrateAttack(db,'real-1',mob.id);next.player.pet_kind=null;const second={...context,player:next.player,preloadedAttackMonster:next.monster,payload:{...context.payload,spawnRound:2,intentId:'r118-zero-kill'}};
sql.exec('BEGIN IMMEDIATE');try{const result=rules.nativeAttack(db,second);assert.equal(result.status,200,JSON.stringify(result));assert(result.body.hits[0].killed);rules.awardPendingNormalRewards(db,settings,100,{id:mob.id,spawn_round:2});sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}
assert.equal(sql.prepare('SELECT COUNT(*) n FROM world_drops WHERE monster_id=?').get(mob.id).n,0);assert.deepEqual(sql.prepare("SELECT * FROM dungeon_materials WHERE player_id='real-1' ORDER BY kind").all(),beforeMaterials);assert.deepEqual(sql.prepare("SELECT * FROM player_items WHERE player_id='real-1' ORDER BY id").all(),beforeItems);assert.equal(sql.prepare('SELECT respawn_at FROM monsters WHERE id=?').get(mob.id).respawn_at,137);


}finally{await f.close();}
});
