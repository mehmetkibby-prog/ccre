import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {realmStartupConfig} from './native-realm-startup-fixture.mjs';
import {NativeRealmStartup} from '../native-realm-startup.mjs';
import {hash,until,native} from './helpers.mjs';
import {RealmSecurityGate} from '../../../../native510-bb3a6cc689c6/vds-server/src/realm-security-gate.mjs';

test('native realm runtime keeps native identity and routing, with the bounded launch-save wait',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/native-realm-runtime-proof.json',import.meta.url))),generated=fs.readFileSync(new URL('../generated/native-realm-runtime.mjs',import.meta.url),'utf8');assert.equal(hash(generated),proof.generatedSha256);let restored=generated;for(const edit of proof.edits.toReversed())restored=restored.replace(edit.replacement,edit.original);assert.equal(hash(restored),proof.sourceSha256);assert.equal(proof.edits.filter(e=>e.phase!=='r101'&&!e.original.startsWith("'./")&&!e.original.startsWith('import ')).length,4);assert.equal(proof.edits.filter(e=>e.original.startsWith('void ')).length,2);assert.equal(proof.edits.filter(e=>e.original==='body,signal:startupSignal445??AbortSignal.timeout(2500)}').length,1);
});

test('locked native realm startup verifies signed surviving sessions and binds the same runtime to all five owners',{timeout:45000},async t=>{
 let startup,transport;const s=await nativeHttpHost(t,{realmSetup:async host=>{transport=realmStartupConfig(t,host);startup=await transport.prepare();}}),{core,host,f}=s;
 assert(startup.ready);assert.equal(core.realm,startup.runtime);assert.equal(globalThis.__colRealm,core.realm);assert.equal(host.nativeHttp.services.__colLaunch,globalThis.__colLaunch);assert(core.realm.security instanceof RealmSecurityGate);assert.equal(core.realm.admission.database,host.database);assert.equal(core.realm.realtimeMaintenance491,undefined);assert.equal(host.database.core511RealmStartup,undefined);assert.equal(host.database.core511RealmSecurity,core.nativeRealmSecurity);assert.equal(core.nativeMaintenance.ready,true);assert.equal(s.supervisor.rows.size,4);assert(transport.calls.some(r=>r.pathname==='/internal/maintenance/status'));assert(transport.calls.some(r=>r.account===f.account.id));
 const ticket=await s.http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await s.connect(ticket);await until(()=>live.packets.some(p=>p.world?.data?.maintenanceRevision491===1),5000);
 const now=f.clock(),frame={revision:2,phase:'maintenance',startedAt:now,deadlineMs:now,adminAccountId:'',maintenanceText:'Başlangıç bakımı'};transport.setPolicy(frame);core.realm.maintenance.apply(frame);await core.realm.maintenanceFanout438(frame);assert.equal(core.authority.admission(f.id),null);assert.equal(f.sql.prepare('SELECT expires_at_ms FROM game_presence WHERE account_id=?').get(f.account.id).expires_at_ms,0);assert(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(f.tokenHash));assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('startup changed security is durably mirrored before any child or HTTP binding can start',async t=>{
 const {host,seed}=await nativeHttpHost(t,{start:false}),transport=realmStartupConfig(t,host,{state:(_id,local)=>({securityVersion:local.security_version+1,blocked:true,canPlay:false})}),before=host.database.sqlite.prepare('SELECT potions,gems,essence FROM players WHERE id=?').get(seed.id),startup=await transport.prepare();
 assert(startup.ready);assert.equal(host.children.size,0);assert.equal(host.writer,undefined);assert.equal(host.nativeHttp,undefined);const sql=host.database.sqlite;assert.equal(sql.prepare('SELECT security_version FROM accounts WHERE id=?').get(seed.account.id).security_version,seed.account.security_version+1);assert.equal(sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(seed.tokenHash),undefined);assert.equal(sql.prepare('SELECT 1 FROM game_presence WHERE account_id=?').get(seed.account.id),undefined);assert.deepEqual(sql.prepare('SELECT potions,gems,essence FROM players WHERE id=?').get(seed.id),before);assert.equal(host.database.core511RealmSecurity,undefined);await assert.rejects(NativeRealmStartup.prepare(host,transport.config),{code:'native_realm_stopped_host'});
});

test('wrong startup identity and invalid central response never make the native realm ready',async t=>{
 const {host}=await nativeHttpHost(t,{start:false}),transport=realmStartupConfig(t,host,{state:()=>({securityVersion:0,blocked:false,canPlay:true})});await assert.rejects(NativeRealmStartup.prepare(host,{...transport.config,realm:{...transport.config.realm,id:'wrong-realm'}}),{code:'native_realm_host_identity'});assert.equal(transport.calls.length,0);await assert.rejects(transport.prepare(),/Invalid central security response/);assert.equal(host.nativeRealmStartup,undefined);assert.equal(host.database.core511RealmStartup,undefined);assert.equal(host.database.core511RealmSecurity,undefined);assert.equal(host.children.size,0);
});

test('unknown startup durability retains committed security changes but removes readiness and temporary hooks',async t=>{
 const {host,seed}=await nativeHttpHost(t,{start:false}),transport=realmStartupConfig(t,host,{state:(_id,local)=>({securityVersion:local.security_version+1,blocked:true,canPlay:false})}),durable=host.database.durableAfterCommit.bind(host.database);host.database.durableAfterCommit=async()=>{await durable();throw Error('realm_startup_durability_unknown');};
 try{await assert.rejects(transport.prepare(),/realm_startup_durability_unknown/);}finally{host.database.durableAfterCommit=durable;}
 assert.equal(host.nativeRealmStartup,undefined);assert.equal(host.database.core511RealmSecurity,undefined);assert.equal(host.database.sqlite.prepare('SELECT permanently_banned FROM accounts WHERE id=?').get(seed.account.id).permanently_banned,1);assert.equal(host.children.size,0);
});

test('pending signed startup security prevents both writer preparation and HTTP service binding',async t=>{
 const {host,bind}=await nativeHttpHost(t,{start:false});let release,entered=false;const gate=new Promise(r=>release=r),transport=realmStartupConfig(t,host,{state:async(_id,local)=>{entered=true;await gate;return {securityVersion:local.security_version,blocked:false,canPlay:true};}}),pending=transport.prepare();
 try{await until(()=>entered,5000);assert.equal(host.nativeRealmStartup.ready,false);await assert.rejects(host.prepareWriter({database:host.database,authority:{realmId:host.expected.realmId},initialize:()=>{throw Error('writer_started_too_early');}}),{code:'host_writer_binding'});await assert.rejects(bind(),{code:'native_http_realm_startup'});assert.equal(host.children.size,0);}
 finally{release();await pending;}
 assert.equal(host.nativeRealmStartup.ready,true);
});

for(const gm of [false,true])test('startup with an already elapsed native maintenance deadline '+(gm?'preserves the server-verified GM':'rejects the normal player before admission'),{timeout:40000},async t=>{
 const s=await nativeHttpHost(t,{realmSetup:async(host,seed)=>{
  if(gm)await host.database.atomic(sql=>sql.prepare('UPDATE players SET is_gm=1 WHERE id=?').run(seed.id));
  const now=Date.now(),transport=realmStartupConfig(t,host,{policy:{revision:2,phase:'maintenance',startedAt:now-1000,deadlineMs:now-1,adminAccountId:seed.account.id,maintenanceText:'Bakım sürüyor'}});await transport.prepare();
 }}),{core,f}=s;
 assert.equal(core.nativeMaintenance.ready,true);assert.equal(core.realm.realtimeMaintenance491,undefined);const presence=f.sql.prepare('SELECT expires_at_ms FROM game_presence WHERE account_id=?').get(f.account.id).expires_at_ms;
 if(gm){assert(presence>f.clock());const ticket=await s.http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await s.connect(ticket);await until(()=>live.packets.some(p=>p.world?.data?.maintenanceRevision491===2),5000);assert(live.packets.every(p=>p.world?.data?.maintenance438==null));}
 else{assert.equal(presence,0);const ticket=await s.http('character',{channel:1});assert.notEqual(ticket.status,200);assert.equal(core.authority.admission(f.id),null);}
 assert(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(f.tokenHash));assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});
