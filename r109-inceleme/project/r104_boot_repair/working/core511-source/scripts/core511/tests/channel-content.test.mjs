import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {BASE,SHA,hash,native,temporary,until} from './helpers.mjs';
import {setupPvp,put} from './pvp-fixture.mjs';
import {nativeAtomicStatements} from '../retaliation-writer.mjs';
import {buildFourthChannelPlan,bootstrapFourthChannel} from '../channel-content.mjs';

const quote=s=>'"'+s.replaceAll('"','""')+'"';
function snapshot(sql){return sql.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name})=>[name,sql.prepare('SELECT * FROM '+quote(name)).all().map(r=>JSON.stringify(r)).sort()]);}
async function originalSeed(t){
 const file='dist-vds/server/channel-runtime/index.mjs',bytes=fs.readFileSync(path.join(BASE,file)),manifest=JSON.parse(fs.readFileSync(path.join(BASE,'realm-package-manifest.json')));assert.equal(hash(bytes),manifest.files.find(r=>r.path===file).sha256);
 let source=bytes.toString();const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
 for(const node of ast.body.filter(n=>n.type==='ImportDeclaration').reverse()){
  if(node.source.value.startsWith('.'))source=source.slice(0,node.source.start)+JSON.stringify(pathToFileURL(path.resolve(BASE,path.dirname(file),node.source.value)).href)+source.slice(node.source.end);
  // HTTP execution context is outside this cold world oracle. If native seed
  // ever starts depending on it, fail rather than supplying a fake context.
  else if(node.source.value==='vinext/shims/request-context')source=source.slice(0,node.start)+"function getRequestExecutionContext(){throw Error('Unexpected HTTP context in native content oracle');}"+source.slice(node.end);
  else if(['next/headers.js','next/navigation.js'].includes(node.source.value)){assert.equal(node.specifiers.length,0);source=source.slice(0,node.start)+source.slice(node.end);}
 }
 const target=path.join(temporary(t),'native-world-oracle.mjs');fs.writeFileSync(target,source+'\nexport {seedWorld};');
 const key=Symbol.for('coreoflife.localDatabase'),previous=globalThis[key];globalThis[key]={worldLoop:{enabled:false},prepare:()=>{throw Error('Unexpected SQL during native oracle import');}};
 try{return (await import(pathToFileURL(target).href)).seedWorld;}finally{globalThis[key]=previous;}
}
async function oracle(sql,seed){
 const db=new DatabaseSync(':memory:'),key=Symbol.for('coreoflife.localDatabase'),previous=globalThis[key];
 try{
  db.exec('PRAGMA foreign_keys=OFF');
  for(const {sql:schema}of sql.prepare("SELECT sql FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL ORDER BY name").all())db.exec(schema);
  for(const table of ['game_settings','combat_settings','monster_combat_profiles','rune_settings','rune_v2_settings'])for(const row of sql.prepare('SELECT * FROM '+table).all())put(db,table,row);
  globalThis[key]=nativeAtomicStatements(db);await seed();
  for(const [file,name]of [['expansion65-schema.mjs','ensureExpansion65'],['afk-island-schema.mjs','ensureAfkIsland'],['runes.mjs','ensureRuneSchema'],['rune-v2.mjs','ensureRuneV2Schema'],['stone-boss476.mjs','ensureStoneBoss476']])(await native('vds-server/src/'+file))[name](db);
  return db.prepare('SELECT * FROM monsters WHERE channel=3 ORDER BY id').all().map(row=>({...row,id:row.id.replace(/-c3(?=-|$)/,'-c4'),channel:4}));
 }finally{globalThis[key]=previous;db.close();}
}

test('fourth-channel content extraction pins every native seed declaration and additional INSERT slice',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/channel-content-proof.json',import.meta.url)));assert.equal(proof.baselineManifestSha256,SHA);assert.equal(hash(fs.readFileSync(new URL('../generated/channel-content-rules.mjs',import.meta.url))),proof.generatedSha256);
 for(const row of proof.sources)assert.equal(hash(fs.readFileSync(path.join(BASE,row.file))),row.sha256);
});

test('complete C4 ambient content matches original native world initialization with current configuration and no live-row templates',async t=>{
 const f=await setupPvp(t),seed=await originalSeed(t);
 for(const scenario of ['current','custom','disabled']){
  if(scenario==='custom'){f.sql.prepare('UPDATE game_settings SET shadow_wolf_hp=1234,sinsi_stone_hp=2345 WHERE id=1').run();f.sql.prepare('UPDATE combat_settings SET frozen_water_hp=3456,black_stone_boss_hp=4567 WHERE id=1').run();const cfg=JSON.parse(f.sql.prepare('SELECT config_json FROM rune_v2_settings WHERE id=1').get().config_json);cfg.monsters.boss.hp=34567;f.sql.prepare('UPDATE rune_v2_settings SET config_json=? WHERE id=1').run(JSON.stringify(cfg));}
  if(scenario==='disabled')f.sql.prepare('UPDATE combat_settings SET frozen_water_enabled=0,black_stone_boss_enabled=0 WHERE id=1').run();
  f.sql.prepare('UPDATE monsters SET hp=0,x=-123,y=-456,spawn_round=97 WHERE channel=3').run();const before=snapshot(f.sql),plan=await buildFourthChannelPlan(f.sql);assert.deepEqual(snapshot(f.sql),before,'planning never mutates current DB');assert.deepEqual(plan.rows,await oracle(f.sql,seed),scenario);
  assert.deepEqual(Object.fromEntries([...new Set(plan.rows.map(r=>r.area))].sort().map(area=>[area,plan.rows.filter(r=>r.area===area).length])),{afk:30,ancient:27,black:65,forest:72,frozen:46,rune:20,rune_v2:21,sinsi:8});assert(plan.rows.every(r=>r.channel===4&&r.is_boss===0));assert.equal(plan.rows.find(r=>r.id==='rune-v2-boss-c4-1').x,2240);
 }
});

test('additive C4 bootstrap preserves all current rows, survives repeated starts and never resurrects after its marker',async t=>{
 const f=await setupPvp(t);f.sql.prepare('UPDATE world_state SET layout_version=24 WHERE id=1').run();const plan=await buildFourthChannelPlan(f.sql),existing={...plan.rows.find(r=>r.id==='rune-v2-boss-c4-1'),hp:17,spawn_round:91,x:2281,last_damaged_at_ms:123456};put(f.sql,'monsters',existing);const before=snapshot(f.sql);
 const receipt=await bootstrapFourthChannel(f.f.database,{assertStopped:()=>true});assert.equal(receipt.inserted,plan.rows.length-1);assert.equal(receipt.applied,true);assert.deepEqual({...f.sql.prepare('SELECT * FROM monsters WHERE id=?').get(existing.id)},existing);
 const after=snapshot(f.sql).filter(([name])=>name!=='kernel511_content_bootstrap').map(([name,rows])=>[name,name==='monsters'?rows.filter(json=>{const r=JSON.parse(json);return r.channel!==4||r.id===existing.id;}):rows]);assert.deepEqual(after,before,'every pre-existing row is retained');
 f.sql.prepare("UPDATE monsters SET hp=0,spawn_round=92 WHERE id='rune-v2-boss-c4-1'").run();f.sql.prepare('DELETE FROM monsters WHERE id=?').run(plan.rows[0].id);const committed=snapshot(f.sql);assert.equal((await bootstrapFourthChannel(f.f.database,{assertStopped:()=>true})).applied,false);assert.deepEqual(snapshot(f.sql),committed);
});

test('C4 bootstrap rejects live host, stale configuration, identity collision and orphan reward history atomically',async t=>{
 const f=await setupPvp(t);f.sql.prepare('UPDATE world_state SET layout_version=24 WHERE id=1').run();const base=snapshot(f.sql);await assert.rejects(bootstrapFourthChannel(f.f.database,{assertStopped:()=>false}),{code:'channel_content_requires_stopped_host'});assert.deepEqual(snapshot(f.sql),base);
 const task=bootstrapFourthChannel(f.f.database,{assertStopped:()=>true});await f.f.database.atomic(sql=>sql.prepare('UPDATE combat_settings SET frozen_water_hp=frozen_water_hp+1 WHERE id=1').run());await assert.rejects(task,{code:'channel_content_configuration_changed'});assert.equal(f.sql.prepare("SELECT 1 FROM sqlite_schema WHERE name='kernel511_content_bootstrap'").get(),undefined);
 const plan=await buildFourthChannelPlan(f.sql),last=plan.rows.at(-1);put(f.sql,'monsters',{...last,channel:2});const conflict=snapshot(f.sql);await assert.rejects(bootstrapFourthChannel(f.f.database,{assertStopped:()=>true}),{code:'channel_content_identity_conflict'});assert.deepEqual(snapshot(f.sql),conflict);f.sql.prepare('DELETE FROM monsters WHERE id=?').run(last.id);
 f.sql.prepare('INSERT INTO monster_participants(monster_id,spawn_round,player_id,created_at) VALUES(?,?,?,?)').run(last.id,17,f.id,1);const orphan=snapshot(f.sql);await assert.rejects(bootstrapFourthChannel(f.f.database,{assertStopped:()=>true}),{code:'channel_content_orphaned_ledger'});assert.deepEqual(snapshot(f.sql),orphan);
});

test('C4 startup completion waits for actual WAL durability before allowing host startup',async t=>{
 const f=await setupPvp(t);f.sql.prepare('UPDATE world_state SET layout_version=24 WHERE id=1').run();const db=f.f.database,durable=db.durableAfterCommit.bind(db);let release,finished=false;const gate=new Promise(r=>release=r);db.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>gate);
 const task=bootstrapFourthChannel(db,{assertStopped:()=>true}).then(value=>{finished=true;return value;});
 try{await until(()=>!!f.sql.prepare("SELECT 1 FROM sqlite_schema WHERE name='kernel511_content_bootstrap'").get(),5000);assert.equal(finished,false);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM monsters WHERE channel=4').get().n,289);release();assert.equal((await task).inserted,289);assert.equal(finished,true);}
 finally{release();db.durableAfterCommit=durable;await task;}
});

test('actual SIGKILL before and after C4 content COMMIT retains CURRENT DB and one complete atomic bootstrap',async t=>{
 const f=await setupPvp(t);f.sql.prepare('UPDATE world_state SET layout_version=24 WHERE id=1').run();const dir=temporary(t),before=snapshot(f.sql);f.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){
  const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(f.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'channel-content-crash-fixture.mjs'),file,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null,stderr);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_content':'durable_content_before_ack');
  const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{
   // Inspect durable state BEFORE any recovery or replay.
   assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM monsters WHERE channel=4').get().n,phase==='before'?0:289);
   const retained=snapshot(db.sqlite).filter(([name])=>name!=='kernel511_content_bootstrap').map(([name,rows])=>[name,name==='monsters'?rows.filter(json=>JSON.parse(json).channel!==4):rows]);assert.deepEqual(retained,before);
   const result=await bootstrapFourthChannel(db,{assertStopped:()=>true});assert.equal(result.applied,phase==='before');assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_content_bootstrap').get().n,1);const onceState=snapshot(db.sqlite);await bootstrapFourthChannel(db,{assertStopped:()=>true});assert.deepEqual(snapshot(db.sqlite),onceState);
  }finally{db.close();}
 }
});
