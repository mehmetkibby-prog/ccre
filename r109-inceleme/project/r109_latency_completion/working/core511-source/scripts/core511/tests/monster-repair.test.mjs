import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {BASE,native,temporary} from './helpers.mjs';
import {setupPvp,put,update,json} from './pvp-fixture.mjs';
import {NativeGameServices} from '../game-services.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {SystemWriter} from '../system-writer.mjs';
import {createRepairHandler,repairBase} from '../monster-lifecycle.mjs';
import {createRespawnRules} from '../generated/respawn-rules.mjs';
import {nativeAtomicStatements} from '../retaliation-writer.mjs';
import {CombatCheckpoints} from '../combat-checkpoint.mjs';
const proof=JSON.parse(fs.readFileSync(new URL('../generated/respawn-proof.json',import.meta.url))),source=fs.readFileSync(path.join(BASE,proof.source),'utf8');
const declarations=proof.dependencies.map(row=>{const code=source.slice(row.start,row.end);return /^function\b|^class\b/.test(code)?code:'var '+code+';';}).join('\n');
const originalRepair=Function('database','now',declarations+'\nreturn '+source.slice(proof.repair.start,proof.repair.end));
const originalDespawn=Function('database','settings','now','return '+source.slice(proof.despawn.start,proof.despawn.end));
async function fixture(t){
 const f=await setupPvp(t),authority=new ChannelOwnership(f.f.database,{realmId:'repair-native'});await authority.initialize();const writer=new SystemWriter(f.f.database,{realmId:'repair-native',authority});await writer.initialize();const services=new NativeGameServices(f.sql,{clock:()=>f.nowMs});writer.add('monster_repair',createRepairHandler({services,clock:()=>f.nowMs}));
 const peer={realm:'repair-native',channel:2,incarnation:'repair2'};await authority.registerProcess(2,peer.incarnation);await writer.register(peer);
 const now=Math.floor(f.nowMs/1000),rows=[
  {id:'repair-normal511',area:'forest',hp:0},
  {id:'repair-stone511',area:'sinsi',hp:0,is_stone:1},
  {id:'repair-parent511',area:'sinsi',spawn_round:20,is_stone:1},
  {id:'repair-minion511',area:'sinsi',hp:0,summoned:1,parent_stone_id:'repair-parent511'},
  {id:'stone-boss-black-c2',area:'black',hp:700},
  {id:'frozen-water-c2-1',area:'frozen',hp:900},
  {id:'repair-expired511',area:'sanctum',hp:800,is_boss:1,despawn_at:now-1},
  {id:'repair-foreign511',area:'forest',hp:0,channel:3}
 ].map(row=>({name:row.id,channel:2,x:1000,y:1000,hp:50,max_hp:1000,spawn_round:17,respawn_at:0,despawn_at:0,is_boss:0,is_stone:0,summoned:0,parent_stone_id:'',variant:'normal',...row}));
 for(const row of rows)if(f.sql.prepare('SELECT 1 FROM monsters WHERE id=?').get(row.id)){const {id,...values}=row;update(f.sql,'monsters',id,values);}else put(f.sql,'monsters',row);
 f.sql.prepare('UPDATE combat_settings SET black_stone_boss_enabled=0,frozen_water_enabled=0 WHERE id=1').run();
 const initial=rows.map(row=>({...f.sql.prepare('SELECT * FROM monsters WHERE id=?').get(row.id)})),read=()=>initial.map(row=>f.sql.prepare('SELECT * FROM monsters WHERE id=?').get(row.id)??null);
 return {...f,authority,writer,services,peer,initial,read,now};
}
test('native repair SQL preserves disabled bosses, missing respawn clocks and stale summoned removal within its leased channel',async t=>{
 const f=await fixture(t),db=nativeAtomicStatements(f.sql),selected=f.initial.filter(row=>row.channel===2),ids=selected.map(r=>r.id),rules=createRespawnRules({globals:f.services.globals});
 const original=originalRepair(db,f.now).filter(s=>/^(UPDATE|DELETE FROM) monsters/i.test(s.sql.trim())).map(s=>db.prepare(s.sql+' AND channel=2').bind(...s.params));await f.f.database.atomic(()=>db.batch(original));const expected=json(f.read());
 for(const row of f.initial)if(f.sql.prepare('SELECT 1 FROM monsters WHERE id=?').get(row.id)){const {id,...values}=row;update(f.sql,'monsters',id,values);}else put(f.sql,'monsters',row);
 const owner=f.writer.owner('channel:2'),ack=await f.writer.command(f.peer,{epoch:owner.epoch,sequence:1,key:'repair-once',kind:'monster_repair',payload:{mode:'repair',nowMs:f.nowMs,monsters:selected.map(repairBase)}});
 assert.deepEqual(json(f.read()),expected);assert.deepEqual(ack.result.removed,['repair-minion511']);assert(f.sql.prepare("SELECT respawn_at FROM monsters WHERE id='repair-normal511'").get().respawn_at>f.now);assert.equal(f.sql.prepare("SELECT hp FROM monsters WHERE id='stone-boss-black-c2'").get().hp,0);assert.equal(f.sql.prepare("SELECT respawn_at FROM monsters WHERE id='repair-foreign511'").get().respawn_at,0);
 assert(rules.repairPlan.toString().includes(source.slice(proof.repair.start,proof.repair.end)));assert.deepEqual(ack.result.monsters.map(m=>m.id).sort(),ids.filter(id=>id!=='repair-minion511').sort());
 const journal=new CombatCheckpoints({submit:()=>assert.fail('no speculative removal write')});journal.hydrate('monsters',selected);journal.committed(ack.result);assert(![...journal.current.get('monsters').values()].some(m=>m.id==='repair-minion511'));assert.equal(journal.snapshot().monsters.length,0);
});
test('native timed despawn and fourth-channel disabled black-stone repair keep HP/spawn/reward boundaries',async t=>{
 const f=await fixture(t),db=nativeAtomicStatements(f.sql),target=f.initial.find(m=>m.id==='repair-expired511'),settings={...createRespawnRules({globals:{}}).defaults,...f.settings};await f.f.database.atomic(()=>db.batch(originalDespawn(db,settings,f.now)));const expected={...f.sql.prepare('SELECT * FROM monsters WHERE id=?').get(target.id)};const {id,...values}=target;update(f.sql,'monsters',id,values);
 const owner=f.writer.owner('channel:2');await f.writer.command(f.peer,{epoch:owner.epoch,sequence:1,key:'despawn-once',kind:'monster_repair',payload:{mode:'despawn',nowMs:f.nowMs,monsters:[repairBase(target)]}});assert.deepEqual({...f.sql.prepare('SELECT * FROM monsters WHERE id=?').get(target.id)},expected);assert.equal(expected.hp,0);assert.equal(expected.spawn_round,17);assert.equal(expected.despawn_at,0);
 const peer={realm:f.peer.realm,channel:4,incarnation:'repair4'};await f.authority.registerProcess(4,peer.incarnation);await f.writer.register(peer);const row={...f.initial.find(m=>m.id==='stone-boss-black-c2'),id:'stone-boss-black-c4',channel:4};put(f.sql,'monsters',row);await f.writer.command(peer,{epoch:1,sequence:1,key:'repair-fourth',kind:'monster_repair',payload:{mode:'repair',nowMs:f.nowMs,monsters:[repairBase(row)]}});const after=f.sql.prepare('SELECT * FROM monsters WHERE id=?').get(row.id);assert.equal(after.hp,0);assert.equal(after.respawn_at,0);assert.equal(after.spawn_round,row.spawn_round);
});
test('real COMMIT-boundary crashes preserve repair deletion and despawn receipt exactly once',async t=>{
 const f=await fixture(t),dir=temporary(t),{LocalDatabase}=await native('vds-server/src/database.mjs');f.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');
 for(const mode of ['repair','despawn'])for(const phase of ['before','after']){
  const file=path.join(dir,mode+'-'+phase+'.sqlite'),input=path.join(dir,mode+'-'+phase+'.json'),marker=path.join(dir,mode+'-'+phase+'.marker');fs.copyFileSync(f.f.file,file);const rows=f.initial.filter(m=>m.channel===2&&(mode==='repair'||m.id==='repair-expired511')),request={epoch:1,sequence:1,key:'repair-crash-'+mode,kind:'monster_repair',payload:{mode,nowMs:f.nowMs,monsters:rows.map(repairBase)}};fs.writeFileSync(input,JSON.stringify({peer:f.peer,request}));
  const child=spawn(process.execPath,[path.join(import.meta.dirname,'repair-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(code,null,stderr);assert.equal(signal,'SIGKILL',stderr);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_repair':'durable_repair_before_ack');
  const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{
   const capture=()=>json(rows.map(r=>db.sqlite.prepare('SELECT * FROM monsters WHERE id=?').get(r.id)??null)),before=capture();assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,phase==='before'?0:1);if(phase==='before')assert.deepEqual(before,rows);else assert.notDeepEqual(before,rows);
   const authority=new ChannelOwnership(db,{realmId:f.peer.realm}),writer=new SystemWriter(db,{realmId:f.peer.realm,authority}),services=new NativeGameServices(db.sqlite,{clock:()=>f.nowMs});writer.add('monster_repair',createRepairHandler({services,clock:()=>f.nowMs}));const first=await writer.command(f.peer,request),onceState=capture();assert.deepEqual(json(await writer.command(f.peer,request)),json(first));assert.deepEqual(capture(),onceState);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,1);
  }finally{db.close();}
 }
});
