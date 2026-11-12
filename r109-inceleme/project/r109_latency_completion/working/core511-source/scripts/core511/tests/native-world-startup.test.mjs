import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {setupEntry} from './entry-fixture.mjs';
import {BASE,SHA,hash,native,temporary,until} from './helpers.mjs';
import {DatabaseHost} from '../database-host.mjs';
import {NativeWorldStartup} from '../native-world-startup.mjs';
import {patchNativeWorldStartup} from '../patch-native-world-startup.mjs';
import {nativeAdminSource} from './native-admin-fixture.mjs';
import {patchNativeAdmin} from '../patch-native-admin.mjs';
import {patchNativeAuth} from '../patch-native-auth.mjs';
import {patchNativeLogout} from '../patch-native-logout.mjs';
import {patchNativeSession} from '../patch-native-session.mjs';
import {patchNativePresence} from '../patch-native-presence.mjs';
import {patchNativeBootstrap} from '../patch-native-bootstrap.mjs';
import {patchNativeConfiguration} from '../patch-native-configuration.mjs';
import {patchNativeRuneConfiguration} from '../patch-native-rune-configuration.mjs';

async function fixture(t){
 const cleanups=[],scope={after:fn=>cleanups.push(fn)},f=await setupEntry(scope),expected={file:path.join(temporary(scope),'current.sqlite'),realmId:'native-startup511',dbIdentity:randomUUID()};
 f.sql.exec('PRAGMA synchronous=FULL');(await native('vds-server/src/realm-database-identity.mjs')).bindRealmDatabaseIdentity(f.sql,expected);f.sql.prepare('UPDATE world_state SET layout_version=24 WHERE id=1').run();f.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');fs.copyFileSync(f.f.file,expected.file);
 const host=await DatabaseHost.open(expected);t.after(async()=>{await host.close();for(const fn of cleanups)await fn();});return {host,sql:host.database.sqlite,clock:f.clock};
}
const rows=(sql,table)=>sql.prepare('SELECT * FROM '+table).all().map(r=>JSON.stringify(r)).sort();
const preserved=sql=>Object.fromEntries(['players','monsters','player_items','auth_sessions','game_presence','normal_defeats','normal_reward_claims'].map(table=>[table,rows(sql,table)]));

test('native startup extraction retains its complete original dependency closure and two exact patch bodies',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/native-world-startup-proof.json',import.meta.url))),source=fs.readFileSync(path.join(BASE,proof.sources[0].file),'utf8'),generated=fs.readFileSync(new URL('../generated/native-world-startup.mjs',import.meta.url),'utf8');assert.equal(proof.baselineManifestSha256,SHA);assert.equal(hash(generated),proof.generatedSha256);
 for(const row of proof.sources)assert.equal(hash(fs.readFileSync(path.join(BASE,row.file))),row.sha256);
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});for(const row of proof.dependencies){const node=ast.body.find(n=>n.start===row.start||n.type==='VariableDeclaration'&&n.declarations.some(d=>d.start===row.start)),text=node.type==='VariableDeclaration'?node.kind+' '+source.slice(row.start,row.end)+';':source.slice(row.start,row.end);assert.equal(hash(text),row.sha256,row.name);assert(generated.includes(text),row.name);}
 const result=patchNativeWorldStartup(nativeAdminSource);assert.equal(result.proof.edits.length,2);let restored=result.source;for(const edit of result.proof.edits.toSorted((a,b)=>a.start-b.start))restored=restored.replace(edit.replacement,edit.original);assert.equal(restored,nativeAdminSource);assert.throws(()=>patchNativeWorldStartup(result.source),/native_startup_function_changed/);
 const patches=[patchNativeAdmin,patchNativeAuth,patchNativeLogout,patchNativeSession,patchNativePresence,patchNativeBootstrap,patchNativeConfiguration,patchNativeRuneConfiguration,patchNativeWorldStartup],apply=list=>list.reduce((s,patch)=>patch(s).source,nativeAdminSource);assert.equal(apply(patches),apply(patches.toReversed()));
});

test('current native warmup preserves all live rows and original guardian timing; subsequent HTTP checks issue no SQL',async t=>{
 const {host,sql,clock}=await fixture(t);sql.prepare('UPDATE world_state SET guardian_reward_at=0 WHERE id=1').run();const before=preserved(sql),world=sql.prepare('SELECT * FROM world_state WHERE id=1').get(),seconds=sql.prepare('SELECT guardian_reward_seconds FROM game_settings WHERE id=1').get().guardian_reward_seconds;
 const startup=await NativeWorldStartup.prepare(host,{clock});assert(startup.ready);assert.deepEqual(preserved(sql),before);assert.deepEqual({...sql.prepare('SELECT * FROM world_state WHERE id=1').get(),guardian_reward_at:0},{...world});assert.equal(sql.prepare('SELECT guardian_reward_at FROM world_state WHERE id=1').get().guardian_reward_at,Math.floor(clock()/1000)+seconds);
 const prepare=sql.prepare.bind(sql),batch=host.database.batch.bind(host.database);sql.prepare=()=>{throw Error('HTTP warmup attempted SQL');};host.database.batch=()=>{throw Error('HTTP warmup attempted batch');};try{for(let i=0;i<20;i++)await startup.ensure();}finally{sql.prepare=prepare;host.database.batch=batch;}
 await assert.rejects(NativeWorldStartup.prepare(host),{code:'native_startup_stopped_host'});await host.close();assert.equal(host.database.core511WorldSeed,undefined);await assert.rejects(startup.ensure(),{code:'host_database_fenced'});
});

test('legacy or empty world is rejected before original native migrations can rewrite current player or monster rows',async t=>{
 const {host,sql}=await fixture(t);sql.prepare('UPDATE world_state SET layout_version=23 WHERE id=1').run();let before=preserved(sql),changes=sql.prepare('SELECT total_changes() n').get().n;await assert.rejects(NativeWorldStartup.prepare(host),{code:'native_startup_current_world'});assert.equal(sql.prepare('SELECT total_changes() n').get().n,changes);assert.deepEqual(preserved(sql),before);assert.equal(host.database.core511WorldSeed,undefined);
 sql.prepare('UPDATE world_state SET layout_version=24 WHERE id=1').run();sql.prepare('DELETE FROM monsters').run();before=preserved(sql);changes=sql.prepare('SELECT total_changes() n').get().n;await assert.rejects(NativeWorldStartup.prepare(host),{code:'native_startup_current_world'});assert.equal(sql.prepare('SELECT total_changes() n').get().n,changes);assert.deepEqual(preserved(sql),before);
});

test('native startup readiness waits for durable WAL and remains unavailable after an uncertain durability failure',async t=>{
 const {host}=await fixture(t),db=host.database,durable=db.durableAfterCommit.bind(db);let release,called=false;const gate=new Promise(r=>release=r);db.durableAfterCommit=async()=>{await durable();called=true;await gate;throw Error('native_startup_unknown_fsync');};
 const task=NativeWorldStartup.prepare(host);void task.catch(()=>{});
 try{await until(()=>called,5000);assert.equal(host.nativeWorldStartup.ready,false);await assert.rejects(host.prepareWriter({database:db,authority:{realmId:host.expected.realmId},initialize:()=>{throw Error('writer must not initialize');}}),{code:'host_writer_binding'});await assert.rejects(host.database.core511WorldSeed.ensure(),{code:'native_startup_not_ready'});release();await assert.rejects(task,/native_startup_unknown_fsync/);assert.equal(db.core511WorldSeed,undefined);assert.equal(host.nativeWorldStartup,undefined);}finally{release();db.durableAfterCommit=durable;}
});
