import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeAdminSource,adminHandlers,adminRequest} from './native-admin-fixture.mjs';
import {patchNativeConfiguration} from '../patch-native-configuration.mjs';
import {patchNativeAdmin} from '../patch-native-admin.mjs';
import {patchNativeAuth} from '../patch-native-auth.mjs';
import {patchNativeLogout} from '../patch-native-logout.mjs';
import {patchNativeSession} from '../patch-native-session.mjs';
import {patchNativePresence} from '../patch-native-presence.mjs';
import {patchNativeBootstrap} from '../patch-native-bootstrap.mjs';
import {patchNativeRuneConfiguration} from '../patch-native-rune-configuration.mjs';
import {SharedWorldRuntime} from '../shared-world.mjs';
import {native} from './helpers.mjs';

test('native global configuration patch preserves every original argument, callback, guard and other bundle byte',()=>{
 const result=patchNativeConfiguration(nativeAdminSource);assert.equal(result.proof.edits.length,9);assert.equal(result.source.replaceAll('database.core511Configuration.run','channelPermanent'),nativeAdminSource);
 assert.throws(()=>patchNativeConfiguration(result.source),/native_configuration_calls_changed/);assert.throws(()=>patchNativeConfiguration(nativeAdminSource.replace('assertSameOrigin(request);\n\t\tconst payload = await readJsonObject(request);','const payload = await readJsonObject(request);')),/native_configuration_guard_changed/);
 const patches=[patchNativeAdmin,patchNativeAuth,patchNativeLogout,patchNativeSession,patchNativePresence,patchNativeBootstrap,patchNativeConfiguration,patchNativeRuneConfiguration],apply=list=>list.reduce((s,p)=>p(s).source,nativeAdminSource);assert.equal(apply(patches),apply(patches.toReversed()));
});

test('native admin configuration denies identity, Origin, media and actual body limits before any database access',async()=>{
 const source=patchNativeConfiguration(nativeAdminSource).source;
 for(const change of [{user:null},{user:{id:'other',email:'other@fixture.invalid'}},{origin:'https://evil.invalid'},{headers:{'Content-Type':'text/plain'}},{body:'{'},{body:{action:'save_status',pad:'a'.repeat(16384)}}]){
  let calls=0;const options={source,...(Object.hasOwn(change,'user')?{user:change.user}:{}),database:{core511Configuration:{run:()=>{calls++;throw Error('must not execute');}}}},r=adminHandlers(options),old=adminHandlers({...options,source:nativeAdminSource}),make=()=>adminRequest({method:'POST',body:{action:'save_status'},...change}),expected=await old.post(make()),actual=await r.post(make());assert.equal(actual.status,expected.status);assert(actual.status>=400);assert.deepEqual(await actual.json(),await expected.json());assert.equal(calls,0);assert.equal(r.reads,0);
 }
});

test('same-cycle shared configuration keeps native regeneration clocks and respawn scheduling alive',async()=>{
 const {installRegistry}=await native('vds-server/src/loadlab/registry.mjs');installRegistry({now:()=>100000});const monster={id:'shared-config',area:'forest',channel:0,spawn_round:1,is_boss:0,is_stone:0,max_hp:100,hp:10,last_damaged_at_ms:0,last_regen_at_ms:0,root_until_ms:0,stun_until_ms:0,control_x:0,control_y:0,wave_stage:0},sent=[],r=new SharedWorldRuntime({peer:{realm:'config-unit',channel:0,role:'world',incarnation:'world-config'},initial:{system:{incarnation:'world-config',epoch:1,sequence:0,online:1},globalJobs:true,world:{cycle:1},settings:{monster_rest_regen_percent:10,monster_rest_regen_combat_delay_seconds:0},monsters:[monster],engagements:[],config:{}},clock:()=>100000,request:async(method,payload)=>{if(method==='world_projection'){sent.push(payload);return {version:payload.version};}assert.equal(method,'system_command');return {key:payload.key,sequence:payload.sequence,result:{saved:payload.payload}};}});
 r.rules.regenerate(r.initial.settings,100000);const clocks=[...r.rules.regenClocks],nextRegen=r.nextRegen,token='configuration-native-clock';assert.equal(clocks.length,1);await r.configuration.freeze({token,cycle:1});assert.equal(r.lifecycle.stopping,false);assert(r.jobs.blocked);const snapshot={...r.initial,system:{...r.initial.system,sequence:r.writer.sequence},monsters:[{...r.view.monster(monster.id),hp:55}],participants:[],bossParticipants:[]};
 await r.configuration.refresh({token,snapshot});assert.deepEqual([...r.rules.regenClocks],clocks);assert.equal(r.nextRegen,nextRegen);assert.equal(r.view.monster(monster.id).hp,55);assert.equal(sent.at(-1).full,true);r.configuration.resume({token});assert.equal(r.jobs.blocked,false);assert.equal(r.lifecycle.stopping,false);assert.equal(r.initial.world.cycle,1);assert.equal(r.lanes.held.size,0);
 assert.throws(()=>r.configuration.resume({token}),/configuration_world_fenced/);r.stop();
});
