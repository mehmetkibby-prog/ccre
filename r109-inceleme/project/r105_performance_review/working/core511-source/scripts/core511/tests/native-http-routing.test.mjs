import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {realmStartupConfig} from './native-realm-startup-fixture.mjs';
import {stageNativeHttp} from './native-http-bundle-fixture.mjs';
import {httpActionFixture} from './native-http-action-fixture.mjs';
import {PROTOCOL} from '../contract.mjs';
import {until} from './helpers.mjs';

test('actual native default export routes kernel entry and four-channel health under original realm policy',{timeout:40000},async t=>{
 const s=await nativeHttpHost(t,{realmSetup:host=>realmStartupConfig(t,host).prepare()});await s.world.stopJobs();const module=await stageNativeHttp(t).load();
 const call=async(path,{method='GET',body}={})=>{const r=await module.default(s.f.request({path,method,body}));return {status:r.status,body:await r.json()};};
 const health=await call('/api/vds-health');assert.equal(health.status,200,JSON.stringify(health));assert.equal(health.body.ok,true);assert.equal(health.body.protocol,PROTOCOL);assert.equal(health.body.startupId,s.host.boot);assert.deepEqual(health.body.realm.channels,[0,0,0,0]);assert.equal(health.body.realm.channelCapacity,25);
 for(const path of ['/api/auth/login','/api/auth/register','/api/auth/forgot-password','/api/auth/reset-password']){const r=await call(path,{method:'POST',body:{}});assert.equal(r.status,403);assert.equal(r.body.code,'account_origin_required');}
 for(const path of ['/api/realm/internal','/api/realm/issue','/api/realm/catalog','/api/admin/vds-migration'])assert.equal((await call(path)).status,403);
 const wrong=await call('/api/realtime/core511-ticket',{method:'POST',body:{}});assert.equal(wrong.status,428);assert.equal((await call('/api/realtime/core511-ticket')).status,405);
 const entry=await call('/api/realtime/core511-ticket',{method:'POST',body:{protocol:PROTOCOL}});assert.equal(entry.status,200,JSON.stringify(entry));await s.connect(entry.body);const moved=await call('/api/realtime/core511-transfer',{method:'POST',body:{protocol:PROTOCOL,channel:4}});assert.equal(moved.status,200,JSON.stringify(moved));assert.equal(moved.body.channel,4);await s.connect(moved.body);
 const current=await call('/api/vds-health');assert.deepEqual(current.body.realm.channels,[0,0,0,1]);assert.equal(current.body.channelProcesses.channels[3].ready,true);const channels=await call('/api/channels');assert.equal(channels.body.channels[3].online,1);if(channels.body.balance504)assert.equal(channels.body.balance504.autoEligible,false);
 const fourth=s.supervisor.rows.get(4),prior=fourth.state;fourth.state='booting';try{const absent=await call('/api/vds-health');assert.equal(absent.status,503);assert.equal(absent.body.ok,false);assert.equal(absent.body.channelProcesses.channels[3].ready,false);}finally{fourth.state=prior;}
 const reader=s.reader.slot;await reader.worker.terminate();await until(()=>reader.failed,5000);assert.equal((await call('/api/vds-health')).status,503);await s.reader.query('kernel511_market_state',[]);assert.notEqual(s.reader.slot,reader);assert.equal((await call('/api/vds-health')).status,200);
 const logout=await call('/api/realtime/core511-logout',{method:'POST',body:{protocol:PROTOCOL}});assert.equal(logout.status,200,JSON.stringify(logout));assert.deepEqual((await call('/api/vds-health')).body.realm.channels,[0,0,0,0]);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('native HTTP request drain keeps the sole host and owners alive until accepted purchase is durable',{timeout:40000},async t=>{
 const s=await httpActionFixture(t),db=s.host.database,original=db.durableAfterCommit.bind(db);let held=false,release,answered=false,closed=false;const gate=new Promise(r=>release=r);t.after(()=>release());
 db.durableAfterCommit=()=>{const durable=original();if(!held&&db.sqlite.prepare('SELECT potions FROM players WHERE id=?').get(s.f.id).potions===3){held=true;return Promise.resolve(durable).then(()=>gate);}return durable;};
 try{const purchase=s.call({action:'buy_potion'}).finally(()=>answered=true);await until(()=>held,6000);const stopping=s.host.close().finally(()=>closed=true);await until(()=>!s.bindings.accepting,2000);assert.equal(answered,false);assert.equal(closed,false);assert.equal(s.host.closed,false);assert.equal([...s.supervisor.rows.values()].filter(r=>r.state==='running').length,4);const rejected=await s.module.default(s.f.request({path:'/api/auth/me',method:'GET'}));assert.equal(rejected.status,503);assert.equal((await rejected.json()).code,'core511_stopping');release();const response=await purchase;assert.equal(response.status,200,await response.text());await stopping;assert(s.host.closed);assert.equal(s.bindings.pending.size,0);const read=new DatabaseSync(s.host.file,{readOnly:true});try{assert.equal(read.prepare('SELECT potions FROM players WHERE id=?').get(s.f.id).potions,3);}finally{read.close();}}
 finally{release();db.durableAfterCommit=original;}
});
