import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {nativeHttpHost} from '../working/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';
import {GameWriter} from '../working/core511-source/scripts/core511/writer-runtime.mjs';
import {CoreCoordinator} from '../working/core511-source/scripts/core511/coordinator.mjs';
import {ReadWorker} from '../working/core511-source/scripts/core511/read-worker.mjs';
import {createNativeWriterGuard} from '../working/core511-source/scripts/core511/native-writer-guard.mjs';
import {EntryWriter,createNativeEntryAuth} from '../working/core511-source/scripts/core511/entry-writer.mjs';
import {statementBootPoolR61,prepareCombatStatementBootR61,statementBootPoolStatsR61} from '../working/core511-source/scripts/core511/statement-boot-pool-r61.mjs';
import {rewardWarmupR56} from '../working/core511-source/scripts/core511/r56-options.mjs';

const query='SELECT * FROM combat_settings WHERE id=1';
const schemaVersion=sql=>sql.prepare('PRAGMA main.schema_version').get().schema_version;
const guildTrigger=sql=>sql.prepare("SELECT sql FROM main.sqlite_schema WHERE type='trigger' AND name='guild_war_finish'").get().sql;
const snapshot=sql=>JSON.stringify(Object.fromEntries(['players','player_items','normal_reward_claims','boss_reward_claims'].map(table=>[table,sql.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()])));

// Real file-backed SQLite, native service schema, GameWriter, exclusive writer
// lane and actual reward worker. No game/worker execution is mocked. Channel
// registration is exercised without starting unrelated simulation processes.
async function fixture(t){
 assert.equal(statementBootPoolR61,true,'run with installed release flags');
 assert.equal(rewardWarmupR56,true,'run with installed release flags');
 const s=await nativeHttpHost(t,{start:false}),{host,seed}=s;
 const bindings=await s.bind(),g=bindings.services;
 let core;
 const writer=new GameWriter(host.database,{realmId:host.expected.realmId,ports:{guard:createNativeWriterGuard(()=>core)}});
 await host.prepareWriter(writer);
 const reader=new ReadWorker(host.file,new Map(),{actorBundles:true});
 const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 core=new CoreCoordinator({host,writer,reader,auth:createNativeEntryAuth({database:host.database,globals:globalThis}),entry:new EntryWriter({database:host.database,services:writer.services}),privateKey,origins:new Set([seed.origin]),realmId:host.expected.realmId,bot:g.__colBotCheck,launch:g.__colLaunch,guild:g.__colGuildVillage});
 await core.motionSettings.ready;
 return {...s,core,writer,sql:host.database.sqlite,peer:channel=>({realm:host.expected.realmId,channel,incarnation:randomUUID()})};
}

test('previous boot order loses the pool when the real reward worker reinstalls its guild trigger',{timeout:30000},async t=>{
 const s=await fixture(t),before=snapshot(s.sql),trigger=guildTrigger(s.sql),version=schemaVersion(s.sql);
 prepareCombatStatementBootR61(s.sql);
 assert.equal(statementBootPoolStatsR61(s.sql).invalidated,null);
 await s.writer.rewardWorkerR533.prepare();
 assert.equal(s.writer.rewardWorkerR533.stats.startups,1);
 assert(schemaVersion(s.sql)>version,'worker must reproduce the persistent schema change');
 assert.equal(guildTrigger(s.sql),trigger,'trigger behavior itself is unchanged');
 s.sql.prepare(query).get();
 assert.equal(statementBootPoolStatsR61(s.sql).invalidated,'schema_version');
 assert.equal(snapshot(s.sql),before,'startup does not change player/items/reward rows');
});

test('all four real registrations retain a usable pool; external schema changes still invalidate it',{timeout:30000},async t=>{
 const s=await fixture(t),before=snapshot(s.sql);
 for(let channel=1;channel<=4;channel++){
  const peer=s.peer(channel),registered=await s.core.register(peer);
  assert.deepEqual(registered.peer,peer);
  assert.equal(s.core.process(peer).online,true);
 }
 assert.equal(s.writer.rewardWorkerR533.stats.startups,1,'all channels share the same prepared worker');
 const pooled=statementBootPoolStatsR61(s.sql);
 assert.equal(pooled.compileFailures,0);
 assert(pooled.compiled>0);
 assert.equal(pooled.invalidated,null,JSON.stringify(pooled));
 const expected=s.sql.prepare(query).get(),used=statementBootPoolStatsR61(s.sql);
 assert.equal(used.hits,pooled.hits+1,'first gameplay settings query uses an actual precompiled statement');
 assert.equal(snapshot(s.sql),before,'registration preserves player/items/reward rows');
 const external=new DatabaseSync(s.host.file);
 try{external.exec('CREATE TABLE r108_boot_schema_probe(id INTEGER PRIMARY KEY)');}
 finally{external.close();}
 assert.deepEqual(s.sql.prepare(query).get(),expected,'native query still returns current data after invalidation');
 assert.equal(statementBootPoolStatsR61(s.sql).invalidated,'schema_version');
});

test('a local TEMP schema change still discards the prepared pool',{timeout:30000},async t=>{
 const s=await fixture(t);await s.core.register(s.peer(1));
 const before=statementBootPoolStatsR61(s.sql);assert.equal(before.invalidated,null);
 s.sql.prepare(query).get();assert.equal(statementBootPoolStatsR61(s.sql).hits,before.hits+1);
 s.sql.exec('CREATE TEMP TABLE r108_boot_temp_probe(id INTEGER PRIMARY KEY)');
 assert.equal(statementBootPoolStatsR61(s.sql).invalidated,'schema_exec');
 assert.equal(s.sql.prepare(query).get().id,1,'normal SQLite fallback remains available');
});
