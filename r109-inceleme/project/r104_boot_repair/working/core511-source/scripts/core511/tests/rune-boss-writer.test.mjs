import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {native,temporary} from './helpers.mjs';
import {json} from './pvp-fixture.mjs';
import {setupRuneWriter} from './rune-boss-fixture.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {SystemWriter} from '../system-writer.mjs';
import {NativeGameServices} from '../game-services.mjs';
import {createRuneBossHandler} from '../rune-boss-writer.mjs';
test('owned rune writer rejects stale actor, monster, gear and cast snapshots before the atomic death',async t=>{
 const f=await setupRuneWriter(t),before=json(f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id)),count=()=>f.sql.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n;
 for(const change of [p=>p.actors[0].epoch++,p=>p.actors[0].sequence++,p=>p.monster.spawn_round++,p=>p.frames[0].armor_json484='[{}]',p=>p.cache[0][1].seq++,p=>p.state.base.seq++]){const request=structuredClone(f.request);change(request.payload);await assert.rejects(f.writer.command(f.peer,request));assert.equal(count(),0);assert.deepEqual(json(f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id)),before);}
 const ack=await f.writer.command(f.peer,f.request);assert.equal(ack.result.events.length,1);assert.equal(ack.result.events[0].dead,true);assert.equal(ack.result.players[0].gems,98);assert.deepEqual(json(await f.writer.command(f.peer,f.request)),json(ack));assert.equal(count(),1);
});
test('actual rune death SIGKILL on both COMMIT sides preserves one HP, gem loss, respawn and boss sequence',{timeout:20000},async t=>{
 const f=await setupRuneWriter(t),before=json(f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id)),dir=temporary(t),input=path.join(dir,'input.json');fs.writeFileSync(input,JSON.stringify({peer:f.peer,request:f.request}));f.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(f.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'rune-boss-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_rune_death':'durable_rune_death_before_ack');const database=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{
  const sql=database.sqlite,row=json(sql.prepare('SELECT * FROM players WHERE id=?').get(f.id)),state=sql.prepare('SELECT * FROM rune_v2_boss_state484 WHERE id=?').get(f.bossId);assert.equal(sql.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,phase==='before'?0:1);assert.equal(state.seq,f.state.seq+(phase==='before'?0:1));if(phase==='before')assert.deepEqual(row,before);else{assert.equal(row.hp,0);assert.equal(row.gems,98);assert.equal(row.hp_revision,before.hp_revision+1);assert(row.respawn_at_ms>f.nowMs);}
  const authority=new ChannelOwnership(database,{realmId:f.peer.realm}),writer=new SystemWriter(database,{realmId:f.peer.realm,authority}),services=new NativeGameServices(sql,{clock:()=>f.nowMs});writer.add('rune_boss_step',createRuneBossHandler({services,authority,clock:()=>f.nowMs}));const ack=await writer.command(f.peer,f.request),after=json(sql.prepare('SELECT * FROM players WHERE id=?').get(f.id));assert.equal(after.hp,0);assert.equal(after.gems,98);assert.equal(after.hp_revision,before.hp_revision+1);assert.deepEqual(json(await writer.command(f.peer,f.request)),json(ack));assert.deepEqual(json(sql.prepare('SELECT * FROM players WHERE id=?').get(f.id)),after);
 }finally{database.close();}}
});
