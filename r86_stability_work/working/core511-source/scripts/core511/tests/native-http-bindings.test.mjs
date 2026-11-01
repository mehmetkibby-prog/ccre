import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {BASE,SHA,hash,native} from './helpers.mjs';
import {NativeHttpBindings} from '../native-http-bindings.mjs';
import {NATIVE_HTTP_GLOBALS} from '../generated/native-http-services.mjs';
import {nativeHttpHost} from './native-http-host-fixture.mjs';

test('restored exact native realm dependency and unchanged HTTP initializer are fully pinned',async()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/native-http-services-proof.json',import.meta.url))),source=fs.readFileSync(path.join(BASE,proof.source),'utf8'),generated=fs.readFileSync(new URL('../generated/native-http-services.mjs',import.meta.url),'utf8');
 assert.equal(proof.baselineManifestSha256,SHA);assert.equal(hash(source),proof.sourceSha256);assert.equal(hash(generated),proof.generatedSha256);const body=source.slice(proof.declaration.start,proof.declaration.end);assert.equal(hash(body),proof.declaration.sha256);assert(generated.includes(body));assert.equal(proof.globals.length,32);assert.equal(Object.keys(proof.factoryBindings).length,16);
 assert.equal(hash(fs.readFileSync(path.join(BASE,proof.inventory.source))),proof.inventory.sourceSha256);
 const bytes=fs.readFileSync(path.join(BASE,'vds-server/src/loadtest-entry.mjs'));assert.equal(bytes.length,3596);assert.equal(hash(bytes),'c613073fc9e8d6598237653e72e52189578b7d0d1bd7e3544422a9ae630e7cfa');const realm=await native('vds-server/src/realm-runtime.mjs');assert.equal(typeof realm.initializeRealmRuntime,'function');assert.equal(typeof realm.installRealmRouteGuard,'function');
});

test('native HTTP binds the exclusive raw writer before env.DB and never constructs a dungeon clock',async t=>{
 const {host,bind}=await nativeHttpHost(t,{start:false}),sql=host.database.sqlite,before=sql.prepare('SELECT id,hp,max_hp,spawn_round FROM monsters ORDER BY id').all(),binding=await bind();
 const {env}=await native('vds-server/src/environment.mjs');assert.equal(env.DB,host.database);assert.equal(globalThis[Symbol.for('coreoflife.localDatabase')],host.database);assert.equal(host.database.coordinatorOnly,true);assert.equal(globalThis.__colItemLinks.db,sql);assert.equal(globalThis.__colPlayerTrade.db,sql);assert.equal(globalThis.__colDungeon.db,sql);assert.deepEqual(Object.keys(globalThis.__colDungeon).sort(),['admin','db','locked','material','materials','membership','now','settings']);assert.equal(Object.keys(binding.services).length,32);assert.equal(host.children.size,0);assert.equal(host.core,null);assert.deepEqual(sql.prepare('SELECT id,hp,max_hp,spawn_round FROM monsters ORDER BY id').all(),before);
 const permanent=globalThis.__colChannelPermanent,presence=globalThis.__colCore511Presence;assert.throws(()=>permanent([],()=>{}),{code:'native_http_core_binding'});assert.throws(()=>presence.augment({}),{code:'native_http_core_binding'});assert.throws(()=>binding.close(),{code:'native_http_host_still_open'});await assert.rejects(NativeHttpBindings.open(host),{code:'native_http_stopped_host'});
 await host.close();binding.close();for(const key of NATIVE_HTTP_GLOBALS)assert.equal(Object.hasOwn(globalThis,key),false,key);assert.equal(Object.hasOwn(globalThis,Symbol.for('coreoflife.localDatabase')),false);assert.equal(Object.hasOwn(host.database,'coordinatorOnly'),false);assert.throws(()=>permanent([],()=>{}),{code:'host_database_fenced'});
});

test('failed native service initialization rolls back startup SQL and restores all global bindings',async t=>{
 const {host,bind}=await nativeHttpHost(t,{start:false}),sql=host.database.sqlite,exec=sql.exec.bind(sql),schema=sql.prepare('SELECT name,sql FROM sqlite_schema ORDER BY name').all();let injected=false;
 sql.exec=text=>{if(text.includes('CREATE TABLE IF NOT EXISTS prereg_rewards')){exec('CREATE TABLE failed_http_binding_fixture(id TEXT)');injected=true;throw Error('native_http_startup_fixture_failure');}return exec(text);};
 try{await assert.rejects(bind(),/native_http_startup_fixture_failure/);}finally{sql.exec=exec;}
 assert(injected);assert.equal(sql.isTransaction,false);assert.deepEqual(sql.prepare('SELECT name,sql FROM sqlite_schema ORDER BY name').all(),schema);assert.equal(host.nativeHttp,undefined);for(const key of NATIVE_HTTP_GLOBALS)assert.equal(Object.hasOwn(globalThis,key),false,key);assert.equal(Object.hasOwn(globalThis,Symbol.for('coreoflife.localDatabase')),false);await bind();
});
