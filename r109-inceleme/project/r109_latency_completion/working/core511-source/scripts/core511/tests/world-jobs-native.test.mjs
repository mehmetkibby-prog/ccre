import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {BASE,hash,native,temporary} from './helpers.mjs';
import {json,put,update} from './pvp-fixture.mjs';
import {setupWorldJobs,prepareJob,jobCommand,bindJobs} from './world-jobs-fixture.mjs';
import {actionRandom} from '../action-writer.mjs';
import {nativeAtomicStatements} from '../retaliation-writer.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {SystemWriter} from '../system-writer.mjs';
import {NativeGameServices} from '../game-services.mjs';
const proof=JSON.parse(fs.readFileSync(new URL('../generated/world-job-proof.json',import.meta.url))),source=fs.readFileSync(path.join(BASE,proof.source),'utf8');
const capture=sql=>Object.fromEntries(sql.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'kernel511_%' ORDER BY name").all().map(({name})=>[name,json(sql.prepare('SELECT * FROM '+JSON.stringify(name)).all())]));
function original(f,mode){const d=proof.dependencies.map(p=>'var '+source.slice(p.start,p.end)+';').join('\n'),body=mode==='upkeep'?'return database.batch(['+proof.upkeep.map(p=>'...'+source.slice(p.start,p.end)).join(',')+']);':source.slice(proof[mode].start,proof[mode].end);return Function('Date','crypto',d+'\nreturn async function(database,settings,state,now){'+body+'}')(Object.assign(Object.create(Date),{now:()=>f.nowMs}),{randomUUID:actionRandom('a'.repeat(64)).uuid});}
// Both native oracle and candidate use the same JS and SQLite trigger clock.
// Original movement triggers call strftime('%s','now') independently of Date.
async function compare(f,mode){f.sql.function('strftime',{varargs:true},(format,clock)=>{assert.equal(format,'%s');assert.equal(clock,'now');return String(Math.floor(f.nowMs/1000));});const state={...f.sql.prepare('SELECT * FROM world_state WHERE id=1').get()};f.sql.exec('SAVEPOINT native_world_oracle');try{await original(f,mode)(f.db,f.settings,state,Math.floor(f.nowMs/1000));const expected=capture(f.sql);f.sql.exec('ROLLBACK TO native_world_oracle;RELEASE native_world_oracle');const request=jobCommand(f,mode),ack=await f.writer.command(f.peer,request);assert.deepEqual(capture(f.sql),expected,mode);assert.deepEqual(json(await f.writer.command(f.peer,request)),json(ack));return ack;}catch(error){if(f.sql.isTransaction)f.sql.exec('ROLLBACK TO native_world_oracle;RELEASE native_world_oracle');throw error;}}
test('world jobs preserve exact pinned source slices and generated dependency proof',()=>{assert.equal(hash(source),proof.sourceSha256);assert.equal(hash(fs.readFileSync(new URL('../generated/world-job-rules.mjs',import.meta.url))),proof.generatedSha256);for(const row of [...proof.upkeep,proof.guardian,proof.reset])assert.equal(hash(source.slice(row.start,row.end)),row.sha256);});
test('native upkeep health decay, reset countdown and market ages match every original row',async t=>{
 const f=await setupWorldJobs(t),now=Math.floor(f.nowMs/1000);for(const health of [0,0.00001,50,100])for(const age of [-10,0,12,1000000])for(const reset of [0,now+8]){f.sql.prepare('UPDATE world_state SET health=?,updated_at=?,reset_at=? WHERE id=1').run(health,now-age,reset);await compare(f,'upkeep');}
 for(const [n,age]of [0,119,121,172799,172801].entries())put(f.sql,'market_shops',{id:'market-age-'+n,owner_id:[f.id,f.targetId,'rival-extra','bot-1','bot-2'][n],name:'Age fixture',owner_name:'Owner fixture',x:1000,y:1000,created_at:now-age,active:1});const ack=await compare(f,'upkeep');assert.equal(ack.result.marketChanged,true);assert.equal(f.sql.prepare("SELECT active FROM market_shops WHERE id='market-age-1'").get().active,1);assert.equal(f.sql.prepare("SELECT active FROM market_shops WHERE id='market-age-2'").get().active,0);
});
test('native guardian periods keep no-winner, tie order, lab exclusion and reset guards',async t=>{
 const f=await setupWorldJobs(t),now=Math.floor(f.nowMs/1000);for(const scenario of ['initialize','future','none','tie','lab','reset']){
  f.sql.exec('DELETE FROM guardian_reward_claims;UPDATE players SET contribution=0;');f.sql.prepare('UPDATE world_state SET guardian_reward_at=?,reset_at=? WHERE id=1').run(scenario==='initialize'?0:scenario==='future'?now+10:now-1,scenario==='reset'?now+8:0);
  if(['tie','lab','reset'].includes(scenario)){update(f.sql,'players',f.id,{name:'Bravo',contribution:100});update(f.sql,'players',f.targetId,{name:'Alpha',contribution:100});}
  if(scenario==='lab')update(f.sql,'players','bot-1',{contribution:100000});await compare(f,'guardian');const claims=f.sql.prepare('SELECT * FROM guardian_reward_claims').all();assert.equal(claims.length,['tie','lab'].includes(scenario)?1:0);if(claims.length)assert.equal(claims[0].winner_id,f.targetId,scenario);
 }
 const invalid=jobCommand(f,'guardian');invalid.payload.fence='not-frozen';await assert.rejects(f.writer.command(f.peer,invalid),/world_transition_not_frozen/);
});
test('native in-game world reset keeps paid balances and premium items while applying the complete original SQL plan',async t=>{
 const f=await setupWorldJobs(t);prepareJob(f,'reset');await compare(f,'reset');const p=f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id),world=f.sql.prepare('SELECT * FROM world_state').get();assert.equal(world.cycle,10);assert.equal(world.health,50);assert.equal(world.reset_at,0);assert.equal(p.gems,100);assert.equal(p.essence,200);assert.equal(p.potions,10);assert.equal(p.level,1);assert.equal(p.area,'bazaar');assert.equal(f.sql.prepare("SELECT premium_origin FROM player_items WHERE id='paid-reset511'").get().premium_origin,1);assert.equal(f.sql.prepare("SELECT * FROM player_items WHERE id='earned-reset511'").get(),undefined);
 await compare(f,'reset');assert.equal(f.sql.prepare('SELECT cycle FROM world_state').get().cycle,10,'no second reset when the native gate is closed');
 const stale=jobCommand(f,'reset');stale.payload.cycle=9;await assert.rejects(f.writer.command(f.peer,stale),/world_job_cycle_fenced/);
});
test('fourth-channel black stone participates in the same native in-game reset',async t=>{
 const f=await setupWorldJobs(t);prepareJob(f,'reset');const source=f.sql.prepare("SELECT * FROM monsters WHERE id='stone-boss-black-c3'").get();put(f.sql,'monsters',{...source,id:'stone-boss-black-c4',channel:4});await f.writer.command(f.peer,jobCommand(f,'reset'));const third={...f.sql.prepare("SELECT * FROM monsters WHERE id='stone-boss-black-c3'").get()},fourth={...f.sql.prepare("SELECT * FROM monsters WHERE id='stone-boss-black-c4'").get()};assert.deepEqual({...fourth,id:third.id,channel:third.channel},third);
});
for(const mode of ['upkeep','guardian','reset'])test('actual '+mode+' SIGKILL on both sides of global COMMIT preserves one native transaction',{timeout:20000},async t=>{
 const f=await setupWorldJobs(t);prepareJob(f,mode);const before=capture(f.sql),dir=temporary(t),request=jobCommand(f,mode),input=path.join(dir,'input.json');fs.writeFileSync(input,JSON.stringify({peer:f.peer,request}));f.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(f.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'world-jobs-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null,stderr);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_world_job':'durable_world_job_before_ack');const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{const rows=capture(db.sqlite);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,phase==='before'?0:1);if(phase==='before')assert.deepEqual(rows,before);else assert.notDeepEqual(rows,before);if(mode==='guardian')assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM guardian_reward_claims').get().n,phase==='before'?0:1);if(mode==='reset')assert.equal(db.sqlite.prepare('SELECT cycle FROM world_state').get().cycle,phase==='before'?9:10);
   const authority=new ChannelOwnership(db,{realmId:f.peer.realm}),writer=new SystemWriter(db,{realmId:f.peer.realm,authority}),services=new NativeGameServices(db.sqlite,{clock:()=>f.nowMs});bindJobs(writer,services,()=>f.nowMs);const ack=await writer.command(f.peer,request),after=capture(db.sqlite);assert.deepEqual(json(await writer.command(f.peer,request)),json(ack));assert.deepEqual(capture(db.sqlite),after);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,1);
  }finally{db.close();}
 }
});
