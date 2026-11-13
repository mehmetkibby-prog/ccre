import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
const base=process.env.STUTTER_TREE+'/core511-source/scripts/core511/';
const {SharedBridgePartitionsR113}=await import(base+'shared-bridge-partitions-r113.mjs');
const {attackActorsR115,foregroundAttackScopeR112}=await import(base+'reward-actor-scope-r85.mjs');
const turn=()=>new Promise(r=>setImmediate(r));
function fixture(t){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 sql.exec(`CREATE TABLE players(id TEXT PRIMARY KEY,area TEXT,channel INTEGER,arena_match_id TEXT);
 CREATE TABLE world_state(id INTEGER,cycle INTEGER);INSERT INTO world_state VALUES(1,5);
 CREATE TABLE monsters(id TEXT PRIMARY KEY,area TEXT,channel INTEGER,spawn_round INTEGER,is_boss INTEGER);
 CREATE TABLE monster_participants(monster_id TEXT,spawn_round INTEGER,player_id TEXT);
 CREATE TABLE party_members(party_id TEXT,player_id TEXT);CREATE TABLE guild_members(guild_id TEXT,player_id TEXT);
 CREATE TABLE dungeon_members(run_id TEXT,player_id TEXT);CREATE TABLE adventure_members(run_id TEXT,player_id TEXT,departed INTEGER);
 INSERT INTO players VALUES('source','forest',1,NULL),('departed','black',2,NULL),('mate','frozen',3,NULL),('guild','frozen',4,NULL),('unflushed','black',3,NULL),('unrelated','frozen',2,NULL);
 INSERT INTO monsters VALUES('local-1','forest',1,8,0),('shared-1','forest',0,8,0);
 INSERT INTO monster_participants VALUES('local-1',8,'departed');
 INSERT INTO party_members VALUES('p','departed'),('p','mate');
 INSERT INTO guild_members VALUES('g','mate'),('g','guild');`);
 const world={core:{database:{sqlite:sql}}},partitions=new SharedBridgePartitionsR113(world);
 return {sql,partitions,grant:{snapshot:{participants:[],bossParticipants:[]}},row:{source:{actor:'source',channel:1}}};
}
test('grant covers current-round departed contributors and their party/guild closure plus unflushed shared hits',async t=>{
 const {sql,partitions,grant,row}=fixture(t),bridge=partitions.bridge('forest');
 grant.snapshot.participants.push({player_id:'unflushed'});await bridge.beforeGrantR113(row,grant);
 assert.deepEqual(row.partitionActorsR113,['departed','guild','mate','source','unflushed']);
 sql.exec("INSERT INTO monster_participants VALUES('shared-1',8,'unflushed')");
 assert.deepEqual(foregroundAttackScopeR112(sql,{action:'attack',targetId:'shared-1'},'source',1).actors,row.partitionActorsR113);
 bridge.releasePartitionR113(row);assert.equal(partitions.actors.active.size,0);
});
test('another map sharing a historical recipient waits; unrelated combat still runs',async t=>{
 const {partitions,grant,row}=fixture(t),forest=partitions.bridge('forest'),black=partitions.bridge('black'),frozen=partitions.bridge('frozen');
 await forest.beforeGrantR113(row,grant);let granted=false;
 const other={source:{actor:'departed',channel:2}},waiting=black.beforeGrantR113(other,grant).then(()=>granted=true);
 const independent={source:{actor:'unrelated',channel:2}};await frozen.beforeGrantR113(independent,grant);
 await turn();assert.equal(granted,false);frozen.releasePartitionR113(independent);forest.releasePartitionR113(row);
 await waiting;black.releasePartitionR113(other);assert.equal(partitions.actors.active.size,0);
});
test('stale rounds, other maps and other local channels do not expand authority; bound stays enforced',t=>{
 const {sql}=fixture(t);sql.exec("DELETE FROM monster_participants;INSERT INTO monsters VALUES('other-map','frozen',1,8,0),('other-channel','forest',2,8,0);INSERT INTO monster_participants VALUES('local-1',7,'departed'),('other-map',8,'mate'),('other-channel',8,'guild')");
 assert.deepEqual(attackActorsR115(sql,'source','forest',1),['source']);
 const put=sql.prepare('INSERT INTO players VALUES(?,?,1,NULL)');for(let i=0;i<101;i++)put.run('bound-'+i,'forest');
 assert.equal(attackActorsR115(sql,'source','forest',1),null);
 assert.equal(foregroundAttackScopeR112(sql,{action:'attack',targetId:'local-1'},'source',1),null,'oversized scope retains conservative broad path');
});
