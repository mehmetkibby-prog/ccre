import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {seedSharedBoss,reportSharedBoss,verifySharedBoss,SHARED_BOSS_ID,NATIVE_SHARED_BOSS_SEED} from './population-shared-boss.mjs';

function setup(t){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 sql.exec(`CREATE TABLE monsters(id TEXT PRIMARY KEY,channel INTEGER,is_boss INTEGER,is_stone INTEGER,area TEXT,loadlab_run_id TEXT,x REAL,y REAL,hp INTEGER,max_hp INTEGER,spawn_round INTEGER,respawn_at INTEGER,despawn_at INTEGER,last_regen_at_ms INTEGER,name TEXT,variant TEXT);
 CREATE TABLE game_settings(id INTEGER PRIMARY KEY,channel_capacity INTEGER,boss_hp INTEGER,boss_respawn_seconds INTEGER,boss_duration_seconds INTEGER);
 CREATE TABLE players(id TEXT PRIMARY KEY,channel INTEGER,loadlab_run_id TEXT,area TEXT,x REAL,y REAL,gems INTEGER,essence INTEGER,potions INTEGER,stat_hp INTEGER,hp INTEGER,max_hp INTEGER);
 CREATE TABLE boss_defeats(boss_round INTEGER,defeated_at INTEGER);
 CREATE TABLE boss_participants(boss_round INTEGER,player_id TEXT,hit_count INTEGER,total_damage INTEGER);
 CREATE TABLE boss_reward_claims(boss_round INTEGER,player_id TEXT,claim_token TEXT);
 CREATE TABLE monster_xp_claims(monster_id TEXT,spawn_round INTEGER,player_id TEXT);
 CREATE TABLE kernel511_channel_receipts(operation_id TEXT,response TEXT);
 INSERT INTO game_settings VALUES(1,10,18000,600,300);
 INSERT INTO monsters VALUES('dunya-bosu-1',0,1,0,'sanctum','',1200,690,18000,18000,1,0,0,0,'Çürümenin Kadimi','boss');`);
 const actors=[1,2,3,4].map(channel=>({id:'actor-'+channel,channel}));
 for(const a of actors)sql.prepare("INSERT INTO players(id,channel,loadlab_run_id,area) VALUES(?,?,'','bazaar')").run(a.id,a.channel);
 return {sql,actors};
}
function completed(sql,actors,fixture){
 const round=fixture.firstRound;
 sql.prepare('INSERT INTO boss_defeats VALUES(?,?)').run(round,1000);
 for(const a of actors){sql.prepare('INSERT INTO boss_reward_claims VALUES(?,?,?)').run(round,a.id,'claim');sql.prepare('INSERT INTO monster_xp_claims VALUES(?,?,?)').run(SHARED_BOSS_ID,round,a.id);}
 sql.prepare('INSERT INTO kernel511_channel_receipts VALUES(?,?)').run('shared:terminal',JSON.stringify({result:{result:{body:{hits:[{id:SHARED_BOSS_ID,spawnRound:round,killed:true,hp:0}]}}}}));
}

test('shared boss seed uses native singleton, retains capacity and reports synthetic settings',t=>{
 const {sql,actors}=setup(t),fixture=seedSharedBoss(sql,actors,{terminal:true,nowMs:1000000});
 assert.deepEqual(fixture.channels,{1:1,2:1,3:1,4:1});assert.equal(fixture.hp,100000);assert.equal(fixture.respawnSeconds,5);
 assert.equal(sql.prepare('SELECT channel_capacity n FROM game_settings').get().n,10);
 assert.equal(sql.prepare('SELECT channel FROM monsters').get().channel,0);
 for(const a of actors){assert.equal(a.targetId,SHARED_BOSS_ID);assert.equal(a.zone,'shared_boss');assert.equal(sql.prepare('SELECT channel FROM players WHERE id=?').get(a.id).channel,a.channel);}
 assert.match(fixture.scenario,/differ from live/);
});

test('per-channel fake boss and missing real channel coverage are rejected',t=>{
 const {sql,actors}=setup(t);sql.exec('UPDATE monsters SET channel=1');
 assert.throws(()=>seedSharedBoss(sql,actors),/native shared/);
 sql.exec('UPDATE monsters SET channel=0');actors[3].channel=3;
 assert.throws(()=>seedSharedBoss(sql,actors),/four real channels/);
});

test('missing historical native boss is explicitly seeded without replacing a different monster',t=>{
 const {sql,actors}=setup(t);sql.exec('DELETE FROM monsters');
 const fixture=seedSharedBoss(sql,actors,{terminal:false,nowMs:1000000});
 const boss=sql.prepare('SELECT * FROM monsters').get();
 assert.equal(fixture.createdFromNativeSeed,true);assert.equal(boss.name,NATIVE_SHARED_BOSS_SEED.name);
 assert.equal(boss.variant,'boss');assert.equal(boss.x,1200);assert.equal(boss.y,690);assert.equal(boss.area,'sanctum');assert.equal(boss.channel,0);assert.equal(boss.loadlab_run_id,'');
 assert.equal(seedSharedBoss(sql,actors,{terminal:false,nowMs:1000001}).createdFromNativeSeed,false);
});

test('sustained scenario requires native durable damage from every actor',t=>{
 const {sql,actors}=setup(t),fixture=seedSharedBoss(sql,actors,{terminal:false});
 assert.equal(reportSharedBoss(sql,actors,fixture).passed,false);
 sql.prepare('UPDATE monsters SET hp=hp-100').run();
 for(const a of actors)sql.prepare('INSERT INTO boss_participants VALUES(?,?,1,25)').run(fixture.firstRound,a.id);
 assert(verifySharedBoss(sql,actors,fixture,{acquiresByChannel:{1:1,2:1,3:1,4:1}}).passed);
 const result=reportSharedBoss(sql,actors,fixture,{acquiresByChannel:{1:1,2:1,3:1,4:0}});
 assert.equal(result.passed,false);assert(result.checks.some(c=>c.name==='shared_bridge_used_on_all_four_channels'&&!c.passed));
});

test('terminal report requires exactly one terminal receipt and durable claims for every actor',t=>{
 const {sql,actors}=setup(t),fixture=seedSharedBoss(sql,actors,{terminal:true});
 assert.equal(reportSharedBoss(sql,actors,fixture).passed,false);completed(sql,actors,fixture);
 assert(verifySharedBoss(sql,actors,fixture).passed);
 sql.exec("INSERT INTO kernel511_channel_receipts SELECT 'shared:duplicate',response FROM kernel511_channel_receipts");
 const result=reportSharedBoss(sql,actors,fixture);assert.equal(result.passed,false);
 assert(result.checks.some(c=>c.name==='one_terminal_receipt_per_defeat'&&!c.passed));
});

test('missing XP, duplicate claims and unclaimed defeated contributions fail visibly',t=>{
 const {sql,actors}=setup(t),fixture=seedSharedBoss(sql,actors,{terminal:true});completed(sql,actors,fixture);
 sql.exec("DELETE FROM monster_xp_claims WHERE player_id='actor-2'; INSERT INTO boss_reward_claims SELECT * FROM boss_reward_claims WHERE player_id='actor-1'");
 sql.prepare('INSERT INTO boss_participants VALUES(?,?,1,5)').run(fixture.firstRound,'actor-3');
 const result=reportSharedBoss(sql,actors,fixture);assert.equal(result.passed,false);
 const failed=new Set(result.checks.filter(c=>!c.passed).map(c=>c.name));
 for(const name of ['claim_per_actor_round_unique','no_unclaimed_defeated_contributions','boss_claims_have_durable_xp_claims'])assert(failed.has(name));
});
