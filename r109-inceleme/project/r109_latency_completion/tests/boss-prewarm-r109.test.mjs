// Real installed-source pool and native factory identity regressions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {installStatementBootPool,bossStatementBootManifestR108} from '../working/core511-source/scripts/core511/statement-boot-pool-r61.mjs';
import {rewardSqlCompilationShapesR108} from '../working/core511-source/scripts/core511/reward-sql-r531.mjs';
import {createAttackWriterRules} from '../working/core511-source/scripts/core511/generated/attack-writer-rules.mjs';
import {rewardWorksetDatabaseR52} from '../working/core511-source/scripts/core511/reward-workset-r52.mjs';
import {nativeHttpHost} from '../working/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';

function scene(t){const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());sql.exec('CREATE TABLE sample(n INTEGER);INSERT INTO sample VALUES(7)');return sql;}

test('compile-only reserved statements survive normal lookup expiry; normal templates do not',t=>{
 const sql=scene(t),query='UPDATE sample SET n=n+1 RETURNING n';
 const pool=installStatementBootPool(sql,['SELECT n FROM sample',{sql:query,copies:1,retain:true}],{enabled:true});
 for(let i=0;i<1100;i++)sql.prepare('SELECT 1').get();
 assert.equal(sql.prepare('SELECT n FROM sample').get().n,7,'compilation never ran UPDATE');
 const before=pool.stats();assert.equal(before.lookupExpired,true);assert.equal(before.invalidated,null);assert.equal(before.remaining,1);assert.equal(before.retainedRemaining,1);
 assert.equal(sql.prepare(query).get().n,8);
 assert.equal(pool.stats().hits,before.hits+1);assert.equal(pool.stats().invalidated,'consumed');
 assert.equal(sql.prepare(query).get().n,9,'fallback remains normal native execution');
});

for(const action of ['main','temp','function'])test('retained statements still invalidate after '+action+' changes',t=>{
 const sql=scene(t),query='SELECT n FROM sample';
 const pool=installStatementBootPool(sql,[{sql:query,copies:1,retain:true}],{enabled:true});
 for(let i=0;i<1025;i++)sql.prepare('SELECT 1').get();
 if(action==='function')sql.function('r108_probe',()=>1);
 else sql.exec('CREATE '+(action==='temp'?'TEMP ':'')+'TABLE probe(id INTEGER)');
 assert.equal(pool.stats().invalidated,action==='function'?'function':'schema_exec');
 assert.equal(sql.prepare(query).get().n,7);
});

test('reserved SQL count stays bounded and unsafe statements retain original handling',t=>{
 const sql=scene(t);
 assert.throws(()=>installStatementBootPool(sql,Array.from({length:9},(_,i)=>({sql:'SELECT '+i,retain:true})),{enabled:true}),/Retained boot SQL limit/);
 const pool=installStatementBootPool(sql,[{sql:'CREATE TABLE should_not_exist(id INTEGER)',retain:true}],{enabled:true});
 assert.equal(pool.stats().unsupported,1);assert.equal(pool.stats().invalidated,'empty');
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM sqlite_schema WHERE name='should_not_exist'").get().n,0);
});

test('a reserved completion handle releases the wrapper and all unused fallback copies',t=>{
 const sql=scene(t),query='SELECT n FROM sample';
 const pool=installStatementBootPool(sql,[{sql:query,copies:1,retain:true,releasePoolOnHit:true},{sql:'SELECT n+1 FROM sample',retain:true}],{enabled:true});
 for(let i=0;i<1025;i++)sql.prepare('SELECT 1').get();
 assert.equal(sql.prepare(query).get().n,7);
 assert.equal(pool.stats().invalidated,'retained_complete');assert.equal(pool.stats().remaining,0);assert.equal(pool.stats().retainedRemaining,0);
 const lookups=pool.stats().lookups;sql.prepare('SELECT 1').get();assert.equal(pool.stats().lookups,lookups,'wrapper was restored');
});

test('external main schema changes after lookup expiry still reject reserved handles',t=>{
 const directory=mkdtempSync(path.join(tmpdir(),'r108-boot-pool-')),file=path.join(directory,'fixture.sqlite');
 const sql=new DatabaseSync(file);t.after(()=>{sql.close();rmSync(directory,{recursive:true,force:true});});
 sql.exec('CREATE TABLE sample(n INTEGER);INSERT INTO sample VALUES(7)');
 const query='SELECT * FROM sample',pool=installStatementBootPool(sql,[{sql:query,copies:1,retain:true}],{enabled:true});
 for(let i=0;i<1025;i++)sql.prepare('SELECT 1').get();
 const other=new DatabaseSync(file);try{other.exec('ALTER TABLE sample ADD COLUMN added INTEGER DEFAULT 9');}finally{other.close();}
 assert.deepEqual({...sql.prepare(query).get()},{n:7,added:9});assert.equal(pool.stats().invalidated,'schema_version');
});

test('reserved boss XP templates equal the actual native factory and its exact existing rewrite shapes',{timeout:30000},async t=>{
 assert.equal(process.env.R108_BOSS_PREWARM_SHAPE_TEST,'1','test-only native factory exposure required');
 const s=await nativeHttpHost(t,{start:false}),queries=[];
 const recorder={prepare(sql){queries.push(sql);return {bind(...params){return {sql,params};}};}};
 const rules=createAttackWriterRules({globals:s.seed.services.globals,fourChannels:true,uuid:()=> 'fixed-compile-test-token'});
 assert.equal(typeof rules.prepareMonsterXpR108Test,'function');
 const settings={...s.host.database.sqlite.prepare('SELECT * FROM game_settings WHERE id=1').get(),...s.host.database.sqlite.prepare('SELECT * FROM combat_settings WHERE id=1').get()};
 rules.prepareMonsterXpR108Test(rewardWorksetDatabaseR52(recorder),settings,1700000000,'dunya-bosu-1',1,1000,null,false,{monster_id:'dunya-bosu-1',monster_area:'sanctum',is_boss:1,is_stone:0});
 const native=queries.filter(q=>q.startsWith('WITH')&&q.includes('reward_input'));
 assert.equal(native.length,2);
 const manifest=bossStatementBootManifestR108(),reserved=new Set(manifest.filter(row=>row.retain).map(row=>row.sql));
 assert(reserved.size>2&&reserved.size<=8);
 for(const query of native){assert(reserved.has(query),'actual boss SQL must match byte-for-byte');for(const shape of rewardSqlCompilationShapesR108(query))assert(reserved.has(shape),'every actual rewrite variant is reserved');}
 assert(!native.some(q=>q.includes('UPDATE players SET quest_kills438=')));
 t.diagnostic(JSON.stringify({nativeShapes:native.length,reservedShapes:reserved.size,sqlBytes:manifest.reduce((n,row)=>n+(row.sql??row).length*2*(row.copies??2),0)}));
});
