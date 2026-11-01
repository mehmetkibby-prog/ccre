import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {BASE,hash,native,temporary,until} from './helpers.mjs';
import {json} from './pvp-fixture.mjs';
import {setupPlayerJobs,seedPremium,seedDaily,seedGuild,playerJobCommand,isolatedPlayerJobs} from './player-jobs-fixture.mjs';
import {readPlayerJobs,createPlayerJobHandler} from '../player-jobs.mjs';
import {ReadWorker} from '../read-worker.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {SystemWriter} from '../system-writer.mjs';
import {NativeGameServices} from '../game-services.mjs';
const {PremiumEngine}=await native('vds-server/src/premium-engine.mjs'),{createDailyMonsterReward477}=await native('vds-server/src/daily-monster-reward477.mjs');
const capture=sql=>Object.fromEntries(sql.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'kernel511_%' ORDER BY name").all().map(({name})=>[name,json(sql.prepare('SELECT * FROM '+JSON.stringify(name)).all())]));
async function globals(f,work){const old=new Map(Object.keys(f.services.globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));Object.assign(globalThis,f.services.globals);try{return await work();}finally{for(const [k,value]of old)if(value)Object.defineProperty(globalThis,k,value);else delete globalThis[k];}}
test('player jobs preserve pinned native premium scans, daily credit/receipt statements and day boundary',()=>{const proof=JSON.parse(fs.readFileSync(new URL('../generated/player-job-proof.json',import.meta.url)));assert.equal(hash(fs.readFileSync(new URL('../generated/player-job-rules.mjs',import.meta.url))),proof.generatedSha256);for(const p of proof.slices){const source=fs.readFileSync(path.join(BASE,p.source),'utf8');assert.equal(hash(source),p.sourceSha256);assert.equal(hash(source.slice(p.start,p.end)),p.sha256);}});
test('native premium expiry preserves the complete original item, pet, listing, HP and wallet result',async t=>{
 const f=await setupPlayerJobs(t);
 // Native refreshHp can restore has_wings after expiry and invoke the native
 // grant_market_wings_duration trigger. Compare both paths at the same SQLite
 // second as well as the same injected JS time; do not change production SQL.
 f.sql.function('unixepoch',{varargs:true},(...args)=>args.includes('subsec')?f.nowMs/1000:Math.floor(f.nowMs/1000));
 seedPremium(f);const engine=new PremiumEngine(f.sql,{now:()=>f.nowMs}),worker=new ReadWorker(f.f.file,new Map(),{actorBundles:true});t.after(()=>worker.close());const originalIds=[];await engine.expireInBackground(()=>true,id=>originalIds.push(id));const due=(await worker.query('kernel511_player_jobs',{kind:'premium',nowMs:f.nowMs})).rows;assert.deepEqual(due.actors,originalIds);
 const expected=await globals(f,async()=>{f.sql.exec('SAVEPOINT original_premium');const expired=engine.expireOwner(f.id),rows=capture(f.sql);f.sql.exec('ROLLBACK TO original_premium;RELEASE original_premium');return {expired,rows};});const request=playerJobCommand(f,'premium',{actor:f.id}),ack=await f.writer.command(f.peer,request);assert.deepEqual(capture(f.sql),expected.rows);assert.deepEqual(ack.result.expired,expected.expired);assert.deepEqual(json(await f.writer.command(f.peer,request)),json(ack));assert(f.sql.prepare("SELECT 1 FROM player_items WHERE id='premium-future-costume511'").get());assert.equal(readPlayerJobs(f.sql,{kind:'premium',nowMs:f.nowMs}).actors.includes(f.id),false);
});
test('native daily rollover and one payout keep original winner, banned/lab/empty exclusions and +50 receipt consumption',async t=>{
 const f=await setupPlayerJobs(t);
 // Freeze SQLite's native clock for the two compared paths only. This makes
 // trigger capture timestamps deterministic; production SQL is unchanged.
 f.sql.function('unixepoch',{varargs:true},(...args)=>args.includes('subsec')?f.nowMs/1000:Math.floor(f.nowMs/1000));
 for(const options of [{},{winner:false},{banned:true},{lab:true}]){
  const day=seedDaily(f,options);f.sql.exec('PRAGMA synchronous=FULL');const engine=createDailyMonsterReward477(f.services.database,{now:()=>f.nowMs,permanent:(_ids,op)=>op(),defer:fn=>fn()});f.sql.exec('SAVEPOINT original_daily');await engine.tick();const expected=capture(f.sql);f.sql.exec('ROLLBACK TO original_daily;RELEASE original_daily');f.sql.exec('PRAGMA synchronous=NORMAL');
  await f.writer.command(f.peer,playerJobCommand(f,'daily_advance'));const plan=readPlayerJobs(f.sql,{kind:'daily',nowMs:f.nowMs});if(plan.pending){const request=playerJobCommand(f,plan.present?'daily_pay':'daily_missing',{actor:plan.present?plan.pending.player_id:null,entry:plan.pending}),ack=await f.writer.command(f.peer,request);assert.deepEqual(json(await f.writer.command(f.peer,request)),json(ack));}
  assert.deepEqual(capture(f.sql),expected,JSON.stringify(options));const row=f.sql.prepare('SELECT * FROM daily_monster_rewards477 WHERE day=?').get(day);assert.equal(row.status,Object.keys(options).length?'empty':'paid');assert.equal(f.sql.prepare('SELECT core_coins FROM players WHERE id=?').get(f.id).core_coins,Object.keys(options).length?70:120);
 }
});
test('daily jobs require a verified durable writer and withhold their receipt until asynchronous WAL fsync completes',async t=>{
 const f=await setupPlayerJobs(t);assert.equal(f.sql.prepare('PRAGMA synchronous').get().synchronous,1);
 assert.throws(()=>createPlayerJobHandler({database:{sqlite:f.sql,atomic:()=>{},durableAfterCommit:()=>Promise.resolve()},services:f.services,assertHeld:isolatedPlayerJobs,clock:()=>f.nowMs}),/player_job_durability_required/);
 seedDaily(f);await f.writer.command(f.peer,playerJobCommand(f,'daily_advance'));const entry=readPlayerJobs(f.sql,{kind:'daily',nowMs:f.nowMs}).pending,request=playerJobCommand(f,'daily_pay',{actor:f.id,entry}),durable=f.f.database.durableAfterCommit.bind(f.f.database);let release,acknowledged=false;const wait=new Promise(r=>release=r);f.f.database.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>wait);
 try{const operation=f.writer.command(f.peer,request).then(ack=>{acknowledged=true;return ack;});await until(()=>f.sql.prepare('SELECT core_coins FROM players WHERE id=?').get(f.id).core_coins===120);assert.equal(acknowledged,false);release();const ack=await operation;assert.equal(ack.result.receipt.status,'paid');assert.equal(ack.result.receipt.balance_after,120);}finally{release();f.f.database.durableAfterCommit=durable;}
});
for(const job of ['premium','daily_pay','guild_sync'])test('actual '+job+' SIGKILL before/after COMMIT preserves one complete native player update',{timeout:20000},async t=>{
 const f=await setupPlayerJobs(t);let entry=null,expectedGuild=null;if(job==='premium')seedPremium(f);else if(job==='guild_sync'){seedGuild(f);f.sql.prepare('UPDATE players SET hp=200000,max_hp=200000 WHERE id=?').run(f.id);expectedGuild=await globals(f,()=>{f.sql.exec('SAVEPOINT original_guild');new PremiumEngine(f.sql,{now:()=>f.nowMs}).refreshHp(f.id);const rows=capture(f.sql);f.sql.exec('ROLLBACK TO original_guild;RELEASE original_guild');return rows;});}else{seedDaily(f);await f.writer.command(f.peer,playerJobCommand(f,'daily_advance'));entry=readPlayerJobs(f.sql,{kind:'daily',nowMs:f.nowMs}).pending;assert(entry);}
 const request=playerJobCommand(f,job,{actor:f.id,entry}),before=capture(f.sql),count=f.sql.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,dir=temporary(t),input=path.join(dir,'input.json');fs.writeFileSync(input,JSON.stringify({peer:f.peer,request}));f.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(f.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'player-jobs-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_player_job':'durable_player_job_before_ack');const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,count+(phase==='before'?0:1));if(phase==='before')assert.deepEqual(capture(db.sqlite),before);else assert.notDeepEqual(capture(db.sqlite),before);if(job==='daily_pay')assert.equal(db.sqlite.prepare('SELECT core_coins FROM players WHERE id=?').get(f.id).core_coins,phase==='before'?70:120);
  if(expectedGuild&&phase==='after')assert.deepEqual(capture(db.sqlite),expectedGuild,'durable native HP and revision inspected before replay');const authority=new ChannelOwnership(db,{realmId:f.peer.realm}),writer=new SystemWriter(db,{realmId:f.peer.realm,authority}),services=new NativeGameServices(db.sqlite,{clock:()=>f.nowMs});writer.add('player_upkeep',createPlayerJobHandler({database:db,services,clock:()=>f.nowMs,assertHeld:isolatedPlayerJobs}));const ack=await writer.command(f.peer,request),after=capture(db.sqlite);assert.deepEqual(json(await writer.command(f.peer,request)),json(ack));assert.deepEqual(capture(db.sqlite),after);if(expectedGuild)assert.deepEqual(after,expectedGuild);if(job==='daily_pay')assert.equal(db.sqlite.prepare('SELECT core_coins FROM players WHERE id=?').get(f.id).core_coins,120);
 }finally{db.close();}}
});
