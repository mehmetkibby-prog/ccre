// Run with the repository's pinned native Node launcher. This proves fixture
// construction and real generated selection; population-load proves transport,
// four-channel ownership, native damage, checkpoint and terminal rewards.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {seedSharedBoss,SHARED_BOSS_ID,NATIVE_SHARED_BOSS_SEED as spec} from './population-shared-boss.mjs';
const tree=process.env.STUTTER_TREE,core=tree+'/core511-source/scripts/core511';
const {nativeHttpHost}=await import(core+'/tests/native-http-host-fixture.mjs');
const {put}=await import(core+'/tests/pvp-fixture.mjs');
const {sharedNeeds}=await import(core+'/generated/shared-lease-selection.mjs');
const source=fs.readFileSync(core+'/generated/native-world-startup.mjs','utf8');
const spawn=/var BOSS_SPAWN = \{\s*x: (\d+),\s*y: (\d+)\s*\}/;
for(const name of ['native-world-startup','respawn-rules','world-job-rules']){
 const match=fs.readFileSync(core+'/generated/'+name+'.mjs','utf8').match(spawn);
 assert(match,'actual native boss spawn declaration: '+name);assert.deepEqual(match.slice(1).map(Number),[spec.x,spec.y]);
}
assert(source.includes("VALUES ('dunya-bosu-1', 'Çürümenin Kadimi', ?, ?, 0, 18000, ?, 'boss', 1, 0, 0)"));
assert(source.includes('bind(BOSS_SPAWN.x, BOSS_SPAWN.y, now + 600)'));
assert(source.includes("UPDATE monsters SET area = CASE WHEN is_boss = 1 THEN 'sanctum' ELSE 'forest' END, channel = 0"));
const clean=[],s=await nativeHttpHost({after:fn=>clean.push(fn)},{start:false});
try{
 const q=s.host.database.sqlite;
 assert.equal(q.prepare('SELECT layout_version n FROM world_state WHERE id=1').get().n,24);
 assert.equal(q.prepare('SELECT id FROM monsters WHERE id=?').get(SHARED_BOSS_ID),undefined,'small historical fixture omits canonical boss');
 const original=q.prepare('SELECT * FROM players WHERE id=?').get(s.seed.id),actors=[];
 for(const channel of [1,2,3,4]){
  const id=randomUUID();put(q,'players',{...original,id,account_id:null,name:'BossFixture'+channel,channel});actors.push({id,channel});
 }
 const settings=q.prepare('SELECT * FROM game_settings WHERE id=1').get();
 const fixture=seedSharedBoss(q,actors,{terminal:true});
 assert.equal(fixture.createdFromNativeSeed,true);
 const boss=q.prepare('SELECT * FROM monsters WHERE id=?').get(SHARED_BOSS_ID);
 assert.deepEqual([boss.name,boss.variant,boss.x,boss.y,boss.area,boss.channel,boss.is_boss,boss.is_stone,boss.loadlab_run_id],[spec.name,spec.variant,spec.x,spec.y,'sanctum',0,1,0,'']);
 const view={monsters:new Map([[boss.id,boss]]),localMonster:()=>null};
 for(const actor of actors){assert.equal(sharedNeeds.call(view,{action:'attack',targetId:SHARED_BOSS_ID,ability:0},{role:'avci',area:'sanctum',channel:actor.channel}),true);}
 assert.equal(q.prepare('SELECT channel_capacity n FROM game_settings WHERE id=1').get().n,settings.channel_capacity);
 assert.equal(q.prepare('SELECT layout_version n FROM world_state WHERE id=1').get().n,24);
 assert.equal(q.prepare('PRAGMA quick_check').get().quick_check,'ok');
 console.log(JSON.stringify({passed:true,pinnedNode:process.version,fixture,proof:'Actual native schema and generated seed/respawn/selection verified; no load or terminal reward claim made by this test.'}));
}finally{for(const fn of clean.reverse())await fn();}
