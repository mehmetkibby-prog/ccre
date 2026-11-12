import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setupGuildCombat,bindGuildCombat,captureGuildDatabase,json} from './guild-combat-fixture.mjs';
import {GUILD_WAR_NATIVE_FINISH_SQL} from '../generated/guild-war-rules.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {native,temporary} from './helpers.mjs';

for(const [role,home]of [['avci',4],['arkanist',2],['muhafiz',1]])test('native final guild '+role+' hit preserves every game row/event and begins returned C'+home+' ownership at sequence zero',async t=>{
 const f=await setupGuildCombat(t,{role,home});f.sql.exec('SAVEPOINT guild_combat_oracle');f.sql.exec(GUILD_WAR_NATIVE_FINISH_SQL);const expected=await f.oracle(),database=captureGuildDatabase(f.sql);f.sql.exec('ROLLBACK TO guild_combat_oracle;RELEASE guild_combat_oracle');
 const result=await f.command(f.peers[0],f.request);assert.deepEqual(json(result.result.result),json(expected));assert.deepEqual(json(result.result.events),json(f.events));assert.deepEqual(captureGuildDatabase(f.sql),database);assert.equal(result.result.result.body.matchFinished,true);
 for(const id of [f.id,f.targetId]){const owner=f.authority.owner(id),admission=f.authority.admission(id);assert.equal(owner.channel,home);assert.equal(owner.epoch,home===1?1:2);assert.equal(owner.sequence,home===1&&id===f.id?8:0);assert.equal(admission.epoch,owner.epoch);assert.equal(admission.channel,home);}
 const receipt=f.sql.prepare('SELECT epoch,sequence,response FROM kernel511_channel_receipts WHERE operation_id=?').get(f.request.operationId);assert.equal(receipt.epoch,1);assert.equal(receipt.sequence,8);assert.deepEqual(JSON.parse(receipt.response),json(result));assert.equal(result.result.moves.length,home===1?0:2);
 if(home!==1)await assert.rejects(f.command(f.peers[0],f.request),/owner_epoch_fenced/);else assert.deepEqual(json(await f.command(f.peers[0],f.request)),json(result));assert.deepEqual(captureGuildDatabase(f.sql),database);
});

test('failure after native final hit and sequence correction rolls back guild reward, ownership and receipt together',async t=>{
 const f=await setupGuildCombat(t),before=captureGuildDatabase(f.sql),owners=json(f.sql.prepare('SELECT * FROM kernel511_channel_owners').all());await assert.rejects(f.command(f.peers[0],f.request,()=>{throw Error('return_completion_failed');}),/return_completion_failed/);assert.deepEqual(captureGuildDatabase(f.sql),before);assert.deepEqual(json(f.sql.prepare('SELECT * FROM kernel511_channel_owners').all()),owners);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,0);
});

test('actual writer SIGKILL on either guild final-hit COMMIT boundary preserves the game result and returned epoch together',{timeout:30000},async t=>{
 const f=await setupGuildCombat(t),dir=temporary(t),input=path.join(dir,'guild-combat.json'),before=captureGuildDatabase(f.sql);fs.writeFileSync(input,JSON.stringify({peer:f.peers[0],request:f.request,settings:f.settings}));f.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){
  const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(f.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'guild-combat-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_guild_hit_return':'durable_guild_hit_return_before_ack');
  const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{
   const authority=new ChannelOwnership(db,{realmId:'guild-combat-test'}),command=bindGuildCombat(authority,{settings:f.settings,clock:()=>f.nowMs}),owner=authority.owner(f.id),admission=authority.admission(f.id);assert.equal(owner.epoch,phase==='after'?2:1);assert.equal(owner.channel,phase==='after'?4:1);assert.equal(owner.sequence,phase==='after'?0:7);assert.equal(admission.epoch,owner.epoch);assert.equal(admission.channel,owner.channel);assert.equal(db.sqlite.prepare('SELECT channel FROM players WHERE id=?').get(f.id).channel,owner.channel);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,phase==='after'?1:0);assert.equal(db.sqlite.prepare("SELECT wars_won FROM guilds WHERE id='war-guild-1'").get().wars_won,phase==='after'?1:0);
   if(phase==='before'){assert.deepEqual(captureGuildDatabase(db.sqlite),before);await command(f.peers[0],f.request);}else await assert.rejects(command(f.peers[0],f.request),/owner_epoch_fenced/);
   assert.equal(authority.owner(f.id).sequence,0);assert.equal(db.sqlite.prepare("SELECT wars_won FROM guilds WHERE id='war-guild-1'").get().wars_won,1);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,1);
  }finally{db.close();}
 }
});
