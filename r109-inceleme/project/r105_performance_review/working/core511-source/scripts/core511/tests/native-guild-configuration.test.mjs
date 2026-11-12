import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {native,temporary} from './helpers.mjs';
import {setupPvp,update,json} from './pvp-fixture.mjs';
import {prepareModeCase,captureModes,withNativeModeOracle} from './mode-fixture.mjs';
import {nativeAdminSource,adminHandlers,adminRequest} from './native-admin-fixture.mjs';
import {standaloneRevoke} from './native-guild-village-unit-fixture.mjs';
import {nativeGuildEjections} from '../generated/guild-ejection-rules.mjs';
import {nativeNotification} from '../notification-outbox.mjs';
import {patchNativeGuildConfiguration} from '../patch-native-guild-configuration.mjs';
import {patchNativeGuildVillage} from '../patch-native-guild-village.mjs';
import {patchNativeAdmin} from '../patch-native-admin.mjs';
import {patchNativeAuth} from '../patch-native-auth.mjs';
import {patchNativeLogout} from '../patch-native-logout.mjs';
import {patchNativeSession} from '../patch-native-session.mjs';
import {patchNativePresence} from '../patch-native-presence.mjs';
import {patchNativeBootstrap} from '../patch-native-bootstrap.mjs';
import {patchNativeConfiguration} from '../patch-native-configuration.mjs';
import {patchNativeRuneConfiguration} from '../patch-native-rune-configuration.mjs';
import {patchNativeWorldStartup} from '../patch-native-world-startup.mjs';
import {patchNativeGuildAuth} from '../patch-native-guild-auth.mjs';

async function fixture(t){const s=await setupPvp(t);s.reset({area:'forest'});await prepareModeCase(s,'guild_village','revoke');update(s.sql,'players',s.targetId,{area:'guild_hall_mode-guild'});return {...s,...await standaloneRevoke(s.f.database,s.nowMs)};}

test('admin guild configuration patch reverses exactly and composes with eleven earlier native bundle patches',()=>{
 const result=patchNativeGuildConfiguration(nativeAdminSource);assert.equal(result.proof.edits.length,2);let restored=result.source;for(const e of result.proof.edits)restored=restored.replace(e.replacement,e.original);assert.equal(restored,nativeAdminSource);assert.throws(()=>patchNativeGuildConfiguration(result.source),/native_guild_configuration_branch_changed/);
 assert.throws(()=>patchNativeGuildConfiguration(nativeAdminSource.replace('assertSameOrigin(request);\n\t\tconst payload = await readJsonObject(request);','const payload = await readJsonObject(request);')),/native_guild_configuration_guard_changed/);
 const patches=[patchNativeAdmin,patchNativeAuth,patchNativeLogout,patchNativeSession,patchNativePresence,patchNativeBootstrap,patchNativeConfiguration,patchNativeRuneConfiguration,patchNativeWorldStartup,patchNativeGuildAuth,patchNativeGuildVillage,patchNativeGuildConfiguration],apply=list=>list.reduce((s,p)=>p(s).source,nativeAdminSource);assert.equal(apply(patches),apply(patches.toReversed()));
});

test('admin village route preserves original identity, Origin, media and body rejection before DB access',async()=>{
 const source=patchNativeGuildConfiguration(nativeAdminSource).source;
 for(const change of [{user:null},{user:{id:'other',email:'other@fixture.invalid'}},{origin:'https://evil.invalid'},{headers:{'Content-Type':'text/plain'}},{body:'{'},{body:{action:'save_guild_village',pad:'a'.repeat(16384)}}]){
  let calls=0;const options={source,...(Object.hasOwn(change,'user')?{user:change.user}:{}),database:{core511GuildVillage:{configure:()=>{calls++;throw Error('must not execute');}}}},r=adminHandlers(options),old=adminHandlers({...options,source:nativeAdminSource}),make=()=>adminRequest({method:'POST',body:{action:'save_guild_village'},...change}),expected=await old.post(make()),actual=await r.post(make());assert.equal(actual.status,expected.status);assert(actual.status>=400);assert.deepEqual(await actual.json(),await expected.json());assert.equal(calls,0);assert.equal(r.reads,0);
 }
});

test('admin guild settings preserve all original rows and room events across open, close and GM cases',async t=>{
 const s=await fixture(t),{createGuildVillage}=await native('vds-server/src/guild-village.mjs');
 s.sql.function('strftime',{varargs:true},pattern=>{assert.equal(pattern,'%s');return String(Math.floor(s.nowMs/1000));});
 for(const [enabled,gm] of [[false,0],[true,0],[false,1],[true,1]]){
  update(s.sql,'players',s.targetId,{area:'guild_hall_mode-guild',is_gm:gm});const revision=s.core.guild.settings().revision;let expected,rows;const events=[],previous=s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n;s.sql.exec('SAVEPOINT guild_configuration_oracle');
  try{expected=withNativeModeOracle(s,db=>{const service=createGuildVillage(db,{now:()=>s.nowMs});return {result:service.save(enabled,revision),repairs:service.repairAll()};});nativeGuildEjections(expected.repairs,{db:()=>s.db,publishRealtimeRoomEvent:(...args)=>events.push(args),now:()=>s.nowMs});rows=captureModes(s.sql);}finally{s.sql.exec('ROLLBACK TO guild_configuration_oracle;RELEASE guild_configuration_oracle');}
  const result=await s.adapter.configure(s.core.guild,enabled,revision);assert.deepEqual(result,expected.result);assert.deepEqual(captureModes(s.sql),rows);assert.deepEqual(s.sql.prepare('SELECT payload FROM kernel511_notifications ORDER BY rowid LIMIT -1 OFFSET ?').all(previous).map(r=>JSON.parse(r.payload)),events.map(nativeNotification));
  const committed=captureModes(s.sql),notices=s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n;await assert.rejects(s.adapter.configure(s.core.guild,enabled,revision),/Ayar değişti/);assert.deepEqual(captureModes(s.sql),committed);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,notices);assert.equal(s.sql.isTransaction,false);
 }
 await assert.rejects(s.adapter.configure({},true,1),{code:'native_guild_village_binding'});
});

test('sole writer SIGKILL at both admin closure COMMIT sides preserves settings, native rows and notices',{timeout:20000},async t=>{
 const s=await fixture(t),dir=temporary(t),input=path.join(dir,'input.json'),revision=s.core.guild.settings().revision;fs.writeFileSync(input,JSON.stringify({kind:'configure',enabled:false,revision,nowMs:s.nowMs}));s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){
  const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(s.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'native-guild-village-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_admin_guild_configuration':'durable_admin_guild_configuration_before_reply');
  const database=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{
   const {core,adapter}=await standaloneRevoke(database,s.nowMs),sql=database.sqlite,read=()=>json({settings:core.guild.settings(),guest:sql.prepare('SELECT area,position_revision,hp_revision FROM players WHERE id=?').get(s.targetId),leader:sql.prepare('SELECT area,position_revision,hp_revision FROM players WHERE id=?').get(s.id),notices:sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n});const before=read();assert.equal(before.settings.enabled,phase==='before'?1:0);assert.equal(before.settings.revision,revision+(phase==='before'?0:1));assert.equal(before.guest.area,phase==='before'?'guild_hall_mode-guild':'bazaar');assert.equal(before.leader.area,phase==='before'?'guild_village_1':'bazaar');assert.equal(before.notices,phase==='before'?0:2);
   if(phase==='before')await adapter.configure(core.guild,false,revision);else{await assert.rejects(adapter.configure(core.guild,false,revision),/Ayar değişti/);assert.deepEqual(read(),before);}
   const after=read();assert.equal(after.settings.enabled,0);assert.equal(after.settings.revision,revision+1);assert.equal(after.guest.area,'bazaar');assert.equal(after.leader.area,'bazaar');assert.equal(after.notices,2);
  }finally{database.close();await database.walSync?.closing;}
 }
});
