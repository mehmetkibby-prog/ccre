// Read-only investigation of actual shipped player respawn rules. This is a
// minimal SQLite schema exercising the real nativeAction body, not a stubbed
// replacement for the unavailable action-writer module or full live pipeline.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createAttackWriterRules} from '../r82-work/core511-source/scripts/core511/generated/attack-writer-rules.mjs';
import {nativeAtomicStatements} from '../r82-work/core511-source/scripts/core511/retaliation-writer.mjs';
import {restRegeneration} from '../r82-work/core511-source/scripts/core511/generated/rest-regeneration-rules.mjs';
function fixture(t,{area='forest',hp=0,respawnAt=2600}={}){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());let now=1000;const events=[];
 sql.exec(`CREATE TABLE players(id TEXT PRIMARY KEY,hp INTEGER,max_hp INTEGER,hp_revision INTEGER,respawn_at_ms INTEGER,area TEXT,arena_match_id TEXT,x REAL,y REAL,last_seen INTEGER,movement_checked_at_ms INTEGER,movement_debt_ms INTEGER,motion_stream_id TEXT,motion_sequence INTEGER,position_revision INTEGER,realtime_scope_version INTEGER,combat_lock_until_ms INTEGER,channel INTEGER);
 CREATE TABLE pve_engagements(player_id TEXT PRIMARY KEY);
 CREATE TABLE arena_matches(id TEXT PRIMARY KEY,mode TEXT,status TEXT,team_size INTEGER);
 CREATE TABLE arena_match_players(match_id TEXT,player_id TEXT,team INTEGER,slot INTEGER);`);
 sql.prepare('INSERT INTO players VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('p',hp,100,7,respawnAt,area,'',9,10,1,1000,0,'old-motion',4,8,2,6000,1);
 sql.prepare('INSERT INTO pve_engagements VALUES(?)').run('p');
 const rules=createAttackWriterRules({globals:{},now:()=>now,fourChannels:true,response:{json:(body,options={})=>({status:options.status??200,body})},ports:{publishRealtimeRoomEvent:(...args)=>events.push(args)}});
 const player=()=>({...sql.prepare('SELECT * FROM players WHERE id=?').get('p'),world_cycle:1});
 const invoke=at=>{now=at;sql.exec('BEGIN IMMEDIATE');try{const result=rules.nativeAction(nativeAtomicStatements(sql),{player:player(),playerId:'p',payload:{action:'respawn'},settings:{},requestReceivedAtMs:at,now:Math.floor(at/1000)});sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}};
 return {sql,player,invoke,events};
}

test('actual native player respawn rejects an early request and accepts a new request when due',t=>{
 const f=fixture(t);assert.equal(f.invoke(2599).status,409);assert.equal(f.player().hp,0);assert.equal(f.events.length,0);
 const result=f.invoke(2600);assert.equal(result.status,200);assert.equal(result.body.ok,true);assert.equal(result.body.hp,100);assert.equal(result.body.hpRevision,8);
 assert.equal(f.player().respawn_at_ms,0);assert.equal(f.player().position_revision,9);assert.equal(f.player().realtime_scope_version,3);assert.equal(f.player().motion_stream_id,'');
 assert.equal(Object.hasOwn(result.body,'respawnAtMs'),false);assert.equal(Object.hasOwn(result.body,'channel'),false);assert.equal(Object.hasOwn(result.body,'cycle'),false);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM pve_engagements').get().n,0);
 assert.equal(f.invoke(3500).status,409);assert.equal(f.player().hp_revision,8);assert.equal(f.events.length,1);
});

test('actual native rune_v2 respawn intentionally changes area before its action response is delivered',t=>{
 const f=fixture(t,{area:'rune_v2'}),result=f.invoke(3000);assert.equal(result.status,200);assert.equal(result.body.area,'bazaar');assert.equal(f.player().area,'bazaar');
 assert.equal(f.events[0][2],'rune_v2');assert.equal(f.events[0][3].type,'player_respawn');assert.equal(f.events[0][3].area,'bazaar');assert.equal(result.body.hpRevision,8);
});

test('actual native respawn does not silently revive a missing death timer or an active arena team round',t=>{
 const f=fixture(t,{respawnAt:0});assert.equal(f.invoke(100000).status,409);assert.equal(f.player().hp,0);
 f.sql.prepare('UPDATE players SET area=?,arena_match_id=?,respawn_at_ms=? WHERE id=?').run('arena','match',2600,'p');
 f.sql.prepare('INSERT INTO arena_matches VALUES(?,?,?,?)').run('match','3v3','active',3);f.sql.prepare('INSERT INTO arena_match_players VALUES(?,?,?,?)').run('match','p',1,0);
 const result=f.invoke(3000);assert.equal(result.status,409);assert.equal(result.body.code,'arena_waiting_for_round498');assert.equal(f.player().hp,0);
});

test('actual dead heartbeat leaves HP revision and death timer unchanged while alive post-respawn damage can supersede the reply',t=>{
 const f=fixture(t),dead={...f.player(),last_movement_at_ms:0,last_monster_hit_at:0,attack_one_at:0,attack_two_at:0,attack_three_at:0,attack_four_at:0,last_regen_at:0};
 const heartbeat=restRegeneration(dead,[10000,'p',10,1,1]);assert.equal(heartbeat.hp,0);assert.equal(heartbeat.hp_revision,7);assert.equal(heartbeat.respawn_at_ms,2600);
 const oldResponse=f.invoke(3000);f.sql.prepare('UPDATE players SET hp=40,hp_revision=hp_revision+1 WHERE id=?').run('p');
 assert.equal(oldResponse.body.hpRevision,8);assert.equal(f.player().hp_revision,9);assert.equal(f.player().hp,40);
});
