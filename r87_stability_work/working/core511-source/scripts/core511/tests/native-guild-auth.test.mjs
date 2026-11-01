import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {BASE,hash,native,until} from './helpers.mjs';
import {setupEntry} from './entry-fixture.mjs';
import {nativeAdminSource} from './native-admin-fixture.mjs';
import {NativeGuildAuth,nativeGuildRepairNeeded} from '../native-guild-auth.mjs';
import {patchNativeGuildAuth} from '../patch-native-guild-auth.mjs';
import {patchNativeAdmin} from '../patch-native-admin.mjs';
import {patchNativeAuth} from '../patch-native-auth.mjs';
import {patchNativeLogout} from '../patch-native-logout.mjs';
import {patchNativeSession} from '../patch-native-session.mjs';
import {patchNativePresence} from '../patch-native-presence.mjs';
import {patchNativeBootstrap} from '../patch-native-bootstrap.mjs';
import {patchNativeConfiguration} from '../patch-native-configuration.mjs';
import {patchNativeRuneConfiguration} from '../patch-native-rune-configuration.mjs';
import {patchNativeWorldStartup} from '../patch-native-world-startup.mjs';

test('two guild auth call patches preserve all other native bytes and compose with all nine earlier patches',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/entry-proof.json',import.meta.url))),generated=fs.readFileSync(new URL('../generated/entry-rules.mjs',import.meta.url),'utf8');assert.equal(hash(generated),proof.generatedSha256);
 for(const source of [nativeAdminSource,fs.readFileSync(path.join(BASE,proof.source),'utf8')]){
  const result=patchNativeGuildAuth(source);assert.equal(result.proof.edits.length,2);let restored=result.source;for(const e of result.proof.edits)restored=restored.replace(e.replacement,e.original);assert.equal(restored,source);assert.throws(()=>patchNativeGuildAuth(result.source),/native_guild_auth_function_changed/);assert.throws(()=>patchNativeGuildAuth(source.replace('const repair = guildVillageService()?.repair(session.player.id);','const repair = guildVillageService()?.repair(request.playerId);')),/native_guild_auth_function_changed/);
 }
 const patches=[patchNativeAdmin,patchNativeAuth,patchNativeLogout,patchNativeSession,patchNativePresence,patchNativeBootstrap,patchNativeConfiguration,patchNativeRuneConfiguration,patchNativeWorldStartup,patchNativeGuildAuth],apply=list=>list.reduce((s,patch)=>patch(s).source,nativeAdminSource);assert.equal(apply(patches),apply(patches.toReversed()));
});

test('read-only native probe preserves full rows across disabled, GM, member, guest and exact expiry boundaries',async t=>{
 const f=await setupEntry(t),{createGuildVillage}=await native('vds-server/src/guild-village.mjs'),service=createGuildVillage(f.sql,{now:f.clock}),read=()=>JSON.stringify(f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id)),now=Math.floor(f.clock()/1000);
 f.sql.prepare('INSERT INTO guilds(id,name,name_key,leader_id,created_at) VALUES(?,?,?,?,1)').run('auth-probe511','Auth probe','auth probe',f.targetId);f.sql.prepare('INSERT INTO guild_castles(guild_id,district,slot,purchased_by,purchased_at) VALUES(?,1,1,?,1)').run('auth-probe511',f.targetId);
 let cases=0;
 for(const area of ['bazaar','guild_village_1','guild_hall_auth-probe511'])for(const enabled of [0,1])for(const gm of [0,1])for(const access of ['none','member','guest','expired','boundary']){
  f.sql.prepare('UPDATE players SET area=?,is_gm=? WHERE id=?').run(area,gm,f.id);f.sql.prepare('UPDATE guild_village_settings SET enabled=? WHERE id=1').run(enabled);f.sql.prepare('DELETE FROM guild_members WHERE player_id=?').run(f.id);f.sql.prepare('DELETE FROM guild_castle_guests WHERE player_id=?').run(f.id);
  if(access==='member')f.sql.prepare('INSERT INTO guild_members(player_id,guild_id,joined_at) VALUES(?,?,1)').run(f.id,'auth-probe511');
  if(['guest','expired','boundary'].includes(access))f.sql.prepare('INSERT INTO guild_castle_guests VALUES(?,?,?,?)').run('auth-probe511',f.id,f.targetId,now+(access==='guest'?1:access==='expired'?-1:0));
  const before=read(),changes=f.sql.prepare('SELECT total_changes() n').get().n,needed=nativeGuildRepairNeeded(f.sql,f.id,f.clock);assert.equal(read(),before);assert.equal(f.sql.prepare('SELECT total_changes() n').get().n,changes);
  f.sql.exec('SAVEPOINT native_probe');let repair;try{repair=service.repair(f.id);}finally{f.sql.exec('ROLLBACK TO native_probe;RELEASE native_probe');}assert.equal(needed,Boolean(repair),[area,enabled,gm,access].join(':'));assert.equal(read(),before);cases++;
 }
 assert.equal(cases,60);assert.equal(nativeGuildRepairNeeded(f.sql,'missing-player',f.clock),false);
});

test('only the active serialized auth scope can reuse its gate; external work and expired descendants queue',async()=>{
 let serialCalls=0,descendant,releaseDescendant;const descendantGate=new Promise(r=>releaseDescendant=r),rows={prepare:()=>({get:()=>undefined})},service={},c={database:{sqlite:rows},guild:service,clock:()=>1,transitions:new Map(),closed:false,serial:fn=>{serialCalls++;return fn();}};service.repair=()=>{throw Error('read-only path must not mutate');};const auth=new NativeGuildAuth(c);c.database.core511GuildAuth=auth;
 let release,entered=false;const gate=new Promise(r=>release=r),inside=auth.inCoordinator(async()=>{await auth.repair(service,'actor');assert.equal(serialCalls,0);descendant=descendantGate.then(()=>auth.repair(service,'actor'));entered=true;await gate;});await until(()=>entered);
 await auth.repair(service,'actor');assert.equal(serialCalls,1);release();await inside;releaseDescendant();await descendant;assert.equal(serialCalls,2);assert.equal(await auth.repair(null,'actor'),undefined);assert.throws(()=>auth.repair({repair(){}},'actor'),{code:'native_guild_auth_scope'});assert.throws(()=>auth.publish([{}]),{code:'native_guild_auth_publish'});delete c.database.core511GuildAuth;assert.throws(()=>auth.repair(service,'actor'),{code:'native_guild_auth_binding'});
});

test('native maintenance, realm, launch, presence and bot denials retain their order before guild repair',async()=>{
 const ast=parse(nativeAdminSource,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='validateGameSession'),original=nativeAdminSource.slice(fn.start,fn.end),candidate=patchNativeGuildAuth(original).source;
 const base={account:{id:'account'},securityVersion:1,tokenHash:'session',gamePresence:{instanceId:'instance',tokenHash:'session',expiresAtMs:2000},player:{id:'actor'},playerAccess:{area:'guild_hall_test'}},request=new Request('https://game.invalid/api/guild-skill',{method:'POST'});
 const cases=[['authentication_required',{session:null}],['game_maintenance',{realm:{maintenance:{allows:()=>false}}}],['realm_required',{realm:{role:'accounts'}}],['realm_closed',{realm:{role:'game',realm:{status:'closed'}}}],['security_verification_required',{realm:{role:'game',realm:{status:'open'},policy:{status:'open'},security:{authorize:()=>false}}}],['launch_locked',{launch:{status:()=>({canPlay:false})}}],['game_instance_expired',{instance:'other'}],['bot_check_required',{bot:{requiredPrepared:()=>true}}]];
 for(const [expected,options]of cases){
  const results=[];for(const code of [original,candidate]){let calls=0;const ctx={URL,Date:class extends Date{static now(){return 1000;}},AuthRequestError:class extends Error{constructor(status,code,message){super(message);Object.assign(this,{status,code});}},realmRuntime:()=>options.realm??null,isGameApi:()=>true,readGameInstance:()=>options.instance??'instance',__colLaunch:options.launch??null,__colBotCheck:options.bot??null,guild_village_runtime_exports:{guildVillageService:()=>({repair(){calls++;throw Error('denied auth reached repair');}})},authDatabase:()=>({core511GuildAuth:{repair(){calls++;throw Error('denied auth reached adapter');}}})};
   const run=vm.runInNewContext(code+'\nvalidateGameSession',ctx);await assert.rejects(run(request,options.session===null?null:structuredClone(base)),error=>{results.push({code:error.code,status:error.status,message:error.message});return error.code===expected;});assert.equal(calls,0);
  }assert.deepEqual(results[0],results[1]);
 }
});
