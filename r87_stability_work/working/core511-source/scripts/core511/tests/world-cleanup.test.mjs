import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {BASE,hash,native,temporary,until} from './helpers.mjs';
import {setupWorldJobs} from './world-jobs-fixture.mjs';
import {put,json} from './pvp-fixture.mjs';
import {createCleanupHandler,readCleanupBatch,CLEANUP_ORDER} from '../world-cleanup.mjs';
import {ensureWorldCleanupIndexes} from '../generated/world-cleanup-rules.mjs';
import {ResourceLanes} from '../resource-lanes.mjs';
import {CombatCheckpoints} from '../combat-checkpoint.mjs';
import {ResidentCleanup} from '../resident-cleanup.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {SystemWriter} from '../system-writer.mjs';
import {ReadWorker} from '../read-worker.mjs';
const {cleanupWorldHistory}=await native('vds-server/src/world-cleanup.mjs');
const isolated=sql=>sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_processes WHERE online=1').get().n===0;
const capture=sql=>Object.fromEntries(sql.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'kernel511_%' ORDER BY name").all().map(({name})=>[name,json(sql.prepare('SELECT * FROM '+JSON.stringify(name)).all())]));
function bind(f){f.writer.add('world_cleanup_batch',createCleanupHandler({clock:()=>f.nowMs,assertHeld:isolated}));ensureWorldCleanupIndexes(f.sql);}
function command(f,plan){const owner=f.writer.owner('world');return {key:'cleanup-test:'+owner.sequence,epoch:owner.epoch,sequence:owner.sequence+1,kind:'world_cleanup_batch',payload:{token:'isolated-no-channels',plan}};}
function seed(f){
 const now=Math.floor(f.nowMs/1000);for(let i=0;i<70;i++)put(f.sql,'world_drops',{id:'cleanup-drop-'+i,owner_id:f.id,monster_id:'cleanup-monster',kind:'essence',x:1,y:1,expires_at:i===69?now:now-1,enchantments:i<34?'__pending__':i===34?'__profile_pending__':''});
 for(const [name,age]of [['old',90000],['fresh',0]]){
  put(f.sql,'monster_participants',{monster_id:'cleanup-monster-'+name,spawn_round:1,player_id:f.id,created_at:now-age});
  put(f.sql,'normal_reward_claims',{monster_id:'cleanup-monster-'+name,spawn_round:1,player_id:f.id,claim_token:'cleanup-token-'+name,awarded_at:now-90000});
  put(f.sql,'boss_participants',{boss_round:8000+age,player_id:f.id,created_at:now-age});
  put(f.sql,'boss_reward_claims',{boss_round:8000+age,player_id:f.id,claim_token:'cleanup-boss-'+name,awarded_at:now-90000});
 }
 put(f.sql,'fishing_sessions',{player_id:f.id,nonce:'cleanup-fishing',fish_kind:'carp',started_at_ms:f.nowMs-10000,earliest_finish_at_ms:f.nowMs-9000,expires_at_ms:f.nowMs-1});
 put(f.sql,'arena_queue',{player_id:f.id,mode:'1v1',team_name:'Cleanup',channel:1,queued_at_ms:f.nowMs-90000,last_seen_ms:f.nowMs-45001});
 for(let i=0;i<23;i++)put(f.sql,'messages',{player_id:f.id,player_name:'Cleanup',body:'world '+i,created_at:now-90000,scope:'world'});
 put(f.sql,'dragon_drop_payloads',{drop_id:'cleanup-drop-0',payload_json:'{}'});put(f.sql,'dragon_drop_payloads',{drop_id:'cleanup-orphan',payload_json:'{}'});
}
test('cleanup preserves pinned native table order, SQL guards and bounded candidate scan',()=>{const proof=JSON.parse(fs.readFileSync(new URL('../generated/world-cleanup-proof.json',import.meta.url))),source=fs.readFileSync(path.join(BASE,proof.source),'utf8');assert.equal(hash(source),proof.sourceSha256);assert.equal(hash(source.slice(proof.start,proof.end)),proof.sliceSha256);assert.equal(hash(fs.readFileSync(new URL('../generated/world-cleanup-rules.mjs',import.meta.url))),proof.generatedSha256);assert(CLEANUP_ORDER.indexOf('normal_defeats')<CLEANUP_ORDER.indexOf('monster_participants'));assert(CLEANUP_ORDER.indexOf('monster_participants')<CLEANUP_ORDER.indexOf('normal_reward_claims'));});
test('complete cleanup rows match the original V510 scheduler, including protected drops, claims and last twenty world messages',async t=>{
 const f=await setupWorldJobs(t);bind(f);seed(f);f.sql.exec('SAVEPOINT original_cleanup');await cleanupWorldHistory(f.db,f.nowMs,{defer:fn=>fn()});const expected=capture(f.sql);f.sql.exec('ROLLBACK TO original_cleanup;RELEASE original_cleanup');
 const reader=new ReadWorker(f.f.file,new Map(),{actorBundles:true});t.after(()=>reader.close());
 for(const table of CLEANUP_ORDER){let cursor=null;for(let n=0;n<128;n++){const {rows:plan}=await reader.query('kernel511_cleanup_batch',{table,nowMs:f.nowMs,cursor});if(plan.rows.length){const request=command(f,plan),ack=await f.writer.command(f.peer,request);assert.deepEqual(json(await f.writer.command(f.peer,request)),json(ack));}cursor=plan.cursor;if(plan.count<32)break;}}
 assert.deepEqual(capture(f.sql),expected);assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM world_drops WHERE id LIKE 'cleanup-drop-%'").get().n,36);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM messages WHERE scope=\'world\'').get().n,20);assert(f.sql.prepare("SELECT 1 FROM normal_reward_claims WHERE monster_id='cleanup-monster-fresh'").get());assert(!f.sql.prepare("SELECT 1 FROM normal_reward_claims WHERE monster_id='cleanup-monster-old'").get());
});
test('protected candidates advance the native cursor and concurrent renewal is never removed from an old plan',async t=>{
 const f=await setupWorldJobs(t);bind(f);seed(f);const first=readCleanupBatch(f.sql,{table:'world_drops',nowMs:f.nowMs});assert.equal(first.count,32);assert.equal(first.rows.length,0);assert(first.cursor);const second=readCleanupBatch(f.sql,{table:'world_drops',nowMs:f.nowMs,cursor:first.cursor});assert.equal(second.count,32);assert(second.rows.length>0);
 const plan=readCleanupBatch(f.sql,{table:'fishing_sessions',nowMs:f.nowMs});assert.deepEqual(plan.resources,['player:'+f.id]);f.sql.prepare('UPDATE fishing_sessions SET expires_at_ms=? WHERE player_id=?').run(f.nowMs+10000,f.id);const result=await f.writer.command(f.peer,command(f,plan));assert.equal(result.result.rows.length,0);assert(f.sql.prepare('SELECT 1 FROM fishing_sessions WHERE player_id=?').get(f.id));
});

test('fourth-channel black-stone and rune boss expiry retains live damage and undelivered rewards until the original completion gate',async t=>{
 const f=await setupWorldJobs(t);bind(f);const now=Math.floor(f.nowMs/1000),ids=['stone-boss-black-c4','rune-v2-boss-c4-1'];
 for(const id of ids){const original=id.replace('c4','c3'),source={...f.sql.prepare('SELECT * FROM monsters WHERE id=?').get(original)};assert(source.id);put(f.sql,'monsters',{...source,id,channel:4,hp:100,max_hp:100,spawn_round:901});put(f.sql,'monster_participants',{monster_id:id,spawn_round:901,player_id:f.id,created_at:now-90000,stone_damage476:99,stone_first_hit_at_ms476:1});}
 let plan=readCleanupBatch(f.sql,{table:'monster_participants',nowMs:f.nowMs});assert(!plan.rows.some(r=>ids.includes(r.monster_id)),'live C4 contributions are protected');
 for(const id of ids){f.sql.prepare('UPDATE monsters SET hp=0 WHERE id=?').run(id);put(f.sql,'normal_defeats',{monster_id:id,spawn_round:901,defeated_at:now-90000,x:1,y:1,xp_reward:1,essence_min:1,essence_span:1,rewards_completed_at:0});}
 const deaths=readCleanupBatch(f.sql,{table:'normal_defeats',nowMs:f.nowMs});assert.equal(deaths.rows.length,0,'undelivered C4 defeats remain discoverable');plan=readCleanupBatch(f.sql,{table:'monster_participants',nowMs:f.nowMs});assert(!plan.rows.some(r=>ids.includes(r.monster_id)));
 for(const id of ids){f.sql.prepare('UPDATE normal_defeats SET rewards_completed_at=? WHERE monster_id=?').run(now-90000,id);put(f.sql,'normal_reward_claims',{monster_id:id,spawn_round:901,player_id:f.id,claim_token:'C4-cleanup-'+id,awarded_at:now-90000});}
 for(const table of ['normal_defeats','monster_participants','normal_reward_claims']){const current=readCleanupBatch(f.sql,{table,nowMs:f.nowMs});if(current.rows.length)await f.writer.command(f.peer,command(f,current));}
 for(const id of ids)for(const table of ['normal_defeats','monster_participants','normal_reward_claims'])assert(!f.sql.prepare('SELECT 1 FROM '+table+' WHERE monster_id=?').get(id),table+' '+id);
});
test('resident cleanup leases survive journal durability and remove matching contribution caches only after COMMIT',async()=>{
 const lanes=new ResourceLanes(),row={monster_id:'monster',spawn_round:1,player_id:'actor',created_at:1,stone_damage476:0,stone_first_hit_at_ms476:0},key=JSON.stringify(['monster',1,'actor']),memory={participants:new Map([[key,row]])};let release;const hold=new Promise(r=>release=r),journal=new CombatCheckpoints({submit:async e=>{await hold;return {key:e.key,result:{saved:e.payload}};}});journal.hydrate('participants',[row]);journal.changed({participants:[{...row,stone_damage476:3}]});
 const c=new ResidentCleanup({peer:{channel:1,incarnation:'resident'},cycle:()=>1,lanes,journal,writer:{sequence:1},attackMemory:memory,onFatal:()=>assert.fail('unexpected cleanup failure')}),request={token:'cleanup-token-123456',cycle:1,resources:['player:actor','monster:monster']};const pending=c.freeze(request);await until(()=>journal.pending);assert(lanes.busy(request.resources));assert(!lanes.busy(['player:other']));assert(memory.participants.has(key));release();await pending;assert(memory.participants.has(key));await c.commit({token:request.token,table:'monster_participants',rows:[row]});assert(!memory.participants.has(key));assert.equal(journal.base.get('participants').size,0);assert(lanes.busy(request.resources));c.resume({token:request.token});assert(!lanes.busy(request.resources));
 const conflict=lanes.acquire(['monster:monster'],'other');assert.equal((await c.freeze(request)).busy,true);lanes.release(conflict);
});
test('actual cleanup SIGKILL before and after COMMIT retains pending loot and one durable cleanup receipt',{timeout:20000},async t=>{
 const f=await setupWorldJobs(t);bind(f);seed(f);const plan=readCleanupBatch(f.sql,{table:'world_drops',nowMs:f.nowMs,cursor:[Math.floor(f.nowMs/1000)-1,34]}),request=command(f,plan),before=capture(f.sql),dir=temporary(t),input=path.join(dir,'input.json');assert(plan.rows.length>0);fs.writeFileSync(input,JSON.stringify({peer:f.peer,request}));f.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(f.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'world-cleanup-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_cleanup':'durable_cleanup_before_ack');const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,phase==='before'?0:1);if(phase==='before')assert.deepEqual(capture(db.sqlite),before);else assert.notDeepEqual(capture(db.sqlite),before);assert.equal(db.sqlite.prepare("SELECT COUNT(*) n FROM world_drops WHERE enchantments IN ('__pending__','__profile_pending__')").get().n,35);const authority=new ChannelOwnership(db,{realmId:f.peer.realm}),writer=new SystemWriter(db,{realmId:f.peer.realm,authority});writer.add('world_cleanup_batch',createCleanupHandler({clock:()=>f.nowMs,assertHeld:isolated}));const ack=await writer.command(f.peer,request),after=capture(db.sqlite);assert.deepEqual(json(await writer.command(f.peer,request)),json(ack));assert.deepEqual(capture(db.sqlite),after);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,1);}finally{db.close();}}
});
