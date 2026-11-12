import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {native,temporary} from './helpers.mjs';
import {setupPvp,update,json} from './pvp-fixture.mjs';
import {prepareModeCase,captureModes,withNativeModeOracle} from './mode-fixture.mjs';
import {nativeAdminSource} from './native-admin-fixture.mjs';
import {standaloneRevoke} from './native-guild-village-unit-fixture.mjs';
import {nativeGuildEjections} from '../generated/guild-ejection-rules.mjs';
import {nativeNotification} from '../notification-outbox.mjs';
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

async function fixture(t){const s=await setupPvp(t);s.reset({area:'forest'});const payload=await prepareModeCase(s,'guild_village','revoke');update(s.sql,'players',s.targetId,{area:'guild_hall_mode-guild'});return {...s,body:payload.input,...await standaloneRevoke(s.f.database,s.nowMs)};}

test('HTTP revoke patch preserves all native route guards and other actions and composes with ten earlier patches',()=>{
 const result=patchNativeGuildVillage(nativeAdminSource);assert.equal(result.proof.edits.length,2);let restored=result.source;for(const e of result.proof.edits)restored=restored.replace(e.replacement,e.original);assert.equal(restored,nativeAdminSource);assert.throws(()=>patchNativeGuildVillage(result.source),/native_guild_village_route_changed/);
 const patches=[patchNativeAdmin,patchNativeAuth,patchNativeLogout,patchNativeSession,patchNativePresence,patchNativeBootstrap,patchNativeConfiguration,patchNativeRuneConfiguration,patchNativeWorldStartup,patchNativeGuildAuth,patchNativeGuildVillage],apply=list=>list.reduce((s,p)=>p(s).source,nativeAdminSource);assert.equal(apply(patches),apply(patches.toReversed()));
});

test('HTTP revoke preserves original native full-row result, repair and publisher semantics and native receipt replay',async t=>{
 const s=await fixture(t),{createGuildVillage}=await native('vds-server/src/guild-village.mjs');
 // The unchanged native movement trigger reads SQLite seconds, independently of the JS service clock.
 s.sql.function('strftime',{varargs:true},pattern=>{assert.equal(pattern,'%s');return String(Math.floor(s.nowMs/1000));});
 s.sql.exec('SAVEPOINT http_revoke_oracle');let expected,rows;const events=[];
 try{expected=withNativeModeOracle(s,db=>{const service=createGuildVillage(db,{now:()=>s.nowMs});return {result:service.act(s.id,s.body),repairs:service.repairAll()};});nativeGuildEjections(expected.repairs,{db:()=>s.db,publishRealtimeRoomEvent:(...args)=>events.push(args),now:()=>s.nowMs});rows=captureModes(s.sql);}finally{s.sql.exec('ROLLBACK TO http_revoke_oracle;RELEASE http_revoke_oracle');}
 const result=await s.adapter.revoke(s.core.guild,s.id,s.body);assert.deepEqual(result,expected.result);assert.deepEqual(captureModes(s.sql),rows);assert.deepEqual(s.sql.prepare('SELECT payload FROM kernel511_notifications ORDER BY ordinal').all().map(r=>JSON.parse(r.payload)),events.map(nativeNotification));
 assert.deepEqual(await s.adapter.revoke(s.core.guild,s.id,s.body),result);assert.deepEqual(captureModes(s.sql),rows);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,1);
 await assert.rejects(s.adapter.revoke({},s.id,s.body),{code:'native_guild_village_binding'});await assert.rejects(s.adapter.revoke(s.core.guild,s.id,{...s.body,action:'buy'}),{code:'native_guild_revoke_scope'});
});

test('native rejected HTTP revoke rolls back its whole native transaction without moving guests or publishing',async t=>{
 const s=await fixture(t);update(s.sql,'guilds','mode-guild',{leader_id:s.targetId});const before=captureModes(s.sql);await assert.rejects(s.adapter.revoke(s.core.guild,s.id,s.body),/yalnız lonca lideri/);assert.deepEqual(captureModes(s.sql),before);assert.equal(s.sql.isTransaction,false);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n,0);
});

test('actual sole writer SIGKILL at both HTTP revoke COMMIT boundaries preserves current DB and exactly one repair',{timeout:20000},async t=>{
 const s=await fixture(t),dir=temporary(t),input=path.join(dir,'input.json');fs.writeFileSync(input,JSON.stringify({id:s.id,body:s.body,nowMs:s.nowMs}));s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){
  const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(s.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'native-guild-village-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_http_guild_revoke':'durable_http_guild_revoke_before_reply');
  const database=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{
   const {core,adapter}=await standaloneRevoke(database,s.nowMs),sql=database.sqlite,read=()=>json({invited:!!sql.prepare('SELECT 1 FROM guild_castle_guests WHERE player_id=?').get(s.targetId),guest:sql.prepare('SELECT area,position_revision,hp_revision FROM players WHERE id=?').get(s.targetId),receipts:sql.prepare('SELECT COUNT(*) n FROM guild_castle_receipts').get().n,notices:sql.prepare('SELECT COUNT(*) n FROM kernel511_notifications').get().n});let state=read();assert.equal(state.invited,phase==='before');assert.equal(state.guest.area.startsWith('guild_hall_'),phase==='before');assert.equal(state.receipts,phase==='after'?1:0);assert.equal(state.notices,phase==='after'?1:0);
   await adapter.revoke(core.guild,s.id,s.body);state=read();assert.equal(state.invited,false);assert.equal(state.guest.area,'guild_village_1');assert.equal(state.receipts,1);assert.equal(state.notices,1);await adapter.revoke(core.guild,s.id,s.body);assert.deepEqual(read(),state);
  }finally{database.close();await database.walSync?.closing;}
 }
});
